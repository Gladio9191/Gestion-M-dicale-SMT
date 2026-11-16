import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
const KEY_LENGTH = 32;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK = 8;
const SCRYPT_PARALLEL = 1;
const HASH_PREFIX = `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK}$${SCRYPT_PARALLEL}`;

/** Use a server-side environment variable, never a browser or git secret. */
export function createPasswordHash(password: string, salt = randomBytes(16)): string {
  if (password.length < 12 || password.length > 256) {
    throw new Error("Owner password must contain 12–256 characters");
  }
  const digest = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST, r: SCRYPT_BLOCK, p: SCRYPT_PARALLEL, maxmem: 32 * 1024 * 1024,
  });
  return `${HASH_PREFIX}$${salt.toString("hex")}$${digest.toString("hex")}`;
}

export function verifyPasswordHash(password: unknown, encoded: string): boolean {
  if (typeof password !== "string" || password.length > 256 || password.length === 0) return false;
  const fields = encoded.split("$");
  if (fields.length !== 6 || fields.slice(0, 4).join("$") !== HASH_PREFIX) return false;
  const saltHex = fields[4];
  const hashHex = fields[5];
  if (!/^[0-9a-f]{32}$/.test(saltHex) || !/^[0-9a-f]{64}$/.test(hashHex)) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH, {
    N: SCRYPT_COST, r: SCRYPT_BLOCK, p: SCRYPT_PARALLEL, maxmem: 32 * 1024 * 1024,
  });
  return timingSafeEqual(expected, actual);
}

export type OwnerSession = {
  csrfToken: string;
  expiresAt: number;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Volatile sessions: logout and restart revoke access; suited to one local node. */
export class OwnerSessionStore {
  private readonly sessions = new Map<string, OwnerSession>();

  create(now = Date.now()): { token: string; session: OwnerSession } {
    this.sessions.clear(); // A new login invalidates the previous owner's session.
    const token = randomBytes(32).toString("hex");
    const session = {
      csrfToken: randomBytes(32).toString("hex"),
      expiresAt: now + MAX_SESSION_MS,
    };
    this.sessions.set(hashToken(token), session);
    return { token, session };
  }

  get(token: unknown, now = Date.now()): OwnerSession | null {
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
    const key = hashToken(token);
    const session = this.sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= now) {
      this.sessions.delete(key);
      return null;
    }
    return session;
  }

  revoke(token: unknown): void {
    if (typeof token === "string" && /^[0-9a-f]{64}$/.test(token)) {
      this.sessions.delete(hashToken(token));
    }
  }
}

/** Rate limit based on socket IP, not spoofable X-Forwarded-For headers. */
export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  private readonly maxKeys = 2000;
  private readonly windowMs = 15 * 60 * 1000;

  canAttempt(ip: string, now = Date.now()): boolean {
    const value = this.attempts.get(ip);
    if (!value || value.until <= now) {
      this.attempts.delete(ip);
      return true;
    }
    return value.count < 5;
  }

  failed(ip: string, now = Date.now()): void {
    const current = this.attempts.get(ip);
    if (this.attempts.size >= this.maxKeys && !this.attempts.has(ip)) {
      for (const [key, value] of this.attempts) {
        if (value.until <= now) this.attempts.delete(key);
      }
      if (this.attempts.size >= this.maxKeys) this.attempts.delete(this.attempts.keys().next().value!);
    }
    this.attempts.set(ip, {
      count: current && current.until > now ? current.count + 1 : 1,
      until: current && current.until > now ? current.until : now + this.windowMs,
    });
  }

  success(ip: string): void {
    this.attempts.delete(ip);
  }
}

export function safeCsrfMatch(expected: string, candidate: unknown): boolean {
  if (typeof candidate !== "string" || !/^[0-9a-f]{64}$/.test(candidate)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(candidate, "hex"));
}
