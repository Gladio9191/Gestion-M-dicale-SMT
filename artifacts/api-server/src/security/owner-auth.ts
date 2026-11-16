import { Router, type NextFunction, type Request, type Response } from "express";
import { LoginAttemptLimiter, OwnerSessionStore, safeCsrfMatch, verifyPasswordHash } from "./owner-core";

const sessions = new OwnerSessionStore();
const limiter = new LoginAttemptLimiter();
const COOKIE_NAME = "smt_session";
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigin(origin: string, req: Request): boolean {
  const trusted = (process.env.SMT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (trusted.includes(origin)) return true;
  // Same-origin requests work without an allow-list. Host is not a substitute
  // for session credentials and CSRF verification.
  return origin === `${req.protocol}://${req.get("host")}`;
}

export function corsOriginAllowed(origin: string): boolean {
  const trusted = (process.env.SMT_ALLOWED_ORIGINS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return trusted.includes(origin);
}

function rejectUntrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  const site = req.get("sec-fetch-site");
  if ((origin && !allowedOrigin(origin, req)) || (!origin && site === "cross-site")) {
    res.status(403).json({ error: "Untrusted request origin" });
    return;
  }
  next();
}

function getCookieToken(req: Request): string | null {
  const raw = req.headers.cookie ?? "";
  if (raw.length > 4096) return null;
  const match = raw.split(";").map((part) => part.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
}

function cookieSettings(): { httpOnly: true; secure: boolean; sameSite: "strict" | "none"; path: string; maxAge: number } {
  const sameSite = process.env.SMT_COOKIE_SAME_SITE === "none" ? "none" : "strict";
  const secure = process.env.NODE_ENV === "production" || process.env.SMT_COOKIE_SECURE === "true" || sameSite === "none";
  return { httpOnly: true, secure, sameSite, path: "/api", maxAge: COOKIE_MAX_AGE };
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
}

export const ownerAuthRouter = Router();

ownerAuthRouter.post("/login", rejectUntrustedOrigin, (req: Request, res: Response) => {
  noStore(res);
  if (!process.env.SMT_OWNER_PASSWORD_HASH) {
    res.status(503).json({ error: "Owner authentication not configured" });
    return;
  }
  const ip = req.socket.remoteAddress ?? "unknown";
  if (!limiter.canAttempt(ip)) {
    res.status(429).json({ error: "Too many login attempts; try again later" });
    return;
  }
  const password = req.body?.password;
  if (!verifyPasswordHash(password, process.env.SMT_OWNER_PASSWORD_HASH)) {
    limiter.failed(ip);
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  limiter.success(ip);
  const { token, session } = sessions.create();
  res.cookie(COOKIE_NAME, token, cookieSettings());
  res.json({ authenticated: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
});

ownerAuthRouter.get("/session", (req: Request, res: Response) => {
  noStore(res);
  const session = sessions.get(getCookieToken(req));
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
});

ownerAuthRouter.post("/logout", rejectUntrustedOrigin, requireOwner, requireOwnerCsrf, (req: Request, res: Response) => {
  noStore(res);
  sessions.revoke(getCookieToken(req));
  const { maxAge: _maxAge, ...clearSettings } = cookieSettings();
  res.clearCookie(COOKIE_NAME, clearSettings);
  res.json({ authenticated: false });
});

/** Protect the entire API and Fiche Engine proxy, not just mutation routes. */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  noStore(res);
  if (!sessions.get(getCookieToken(req))) {
    res.status(401).json({ error: "Owner authentication required" });
    return;
  }
  next();
}

export function requireOwnerCsrf(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }
  const origin = req.get("origin");
  if ((origin && !allowedOrigin(origin, req)) || (!origin && req.get("sec-fetch-site") === "cross-site")) {
    res.status(403).json({ error: "Untrusted request origin" });
    return;
  }
  const session = sessions.get(getCookieToken(req));
  if (!session || !safeCsrfMatch(session.csrfToken, req.get("x-smt-csrf"))) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }
  next();
}
