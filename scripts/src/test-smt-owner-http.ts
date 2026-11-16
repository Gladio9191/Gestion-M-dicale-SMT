import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
// Resolve external workspace source at runtime: scripts/tsconfig restricts rootDir to scripts/src.
// The actual security module is separately checked by api-server TypeScript typecheck.
const coreUrl = new URL("../../artifacts/api-server/src/security/owner-core.ts", import.meta.url);
const authUrl = new URL("../../artifacts/api-server/src/security/owner-auth.ts", import.meta.url);
const core = await import(coreUrl.href) as { createPasswordHash: (password: string) => string };
const security = await import(authUrl.href) as {
  ownerAuthRouter: unknown;
  requireOwner: unknown;
  requireOwnerCsrf: unknown;
};
const createPasswordHash = core.createPasswordHash;
const { ownerAuthRouter, requireOwner, requireOwnerCsrf } = security;

// Resolve Express from its own workspace package; no production DB is imported.
const apiRequire = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const express = apiRequire("express");

const syntheticPassword = "SYNTHETIC-private-SMT-password-for-tests-only-2026";

test("owner login and cookie/CSRF HTTP contract without any database", async () => {
  process.env.NODE_ENV = "test";
  process.env.SMT_OWNER_PASSWORD_HASH = createPasswordHash(syntheticPassword);
  process.env.SMT_ALLOWED_ORIGINS = "";
  process.env.SMT_COOKIE_SAME_SITE = "strict";
  process.env.SMT_COOKIE_SECURE = "false";

  const app = express();
  app.use(express.json());
  app.get("/api/healthz", (_req: unknown, res: { json: (value: unknown) => void }) => res.json({ status: "ok" }));
  app.use("/api/auth", ownerAuthRouter);
  app.use("/api", requireOwner, requireOwnerCsrf);
  app.get("/api/protected", (_req: unknown, res: { json: (value: unknown) => void }) => res.json({ sensitive: "synthetic" }));
  app.post("/api/protected", (_req: unknown, res: { json: (value: unknown) => void }) => res.json({ written: true }));

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to bind");
  const base = `http://127.0.0.1:${address.port}`;
  const request = (path: string, options?: RequestInit) => fetch(base + path, options);
  const post = (password: string, headers: Record<string, string> = {}) => request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ password }),
  });

  try {
    assert.equal((await request("/api/healthz")).status, 200);
    assert.equal((await request("/api/protected")).status, 401);
    assert.equal((await request("/api/protected", { method: "POST" })).status, 401);
    assert.equal((await post(syntheticPassword, { Origin: "https://evil.example" })).status, 403);
    assert.equal((await post("wrong-passphrase")).status, 401);

    const good = await post(syntheticPassword);
    assert.equal(good.status, 200);
    const cookie = good.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie?.startsWith("smt_session="));
    const json = await good.json() as { authenticated: boolean; csrfToken: string };
    assert.equal(json.authenticated, true);
    assert.match(json.csrfToken, /^[a-f0-9]{64}$/);

    const session = await request("/api/auth/session", { headers: { Cookie: cookie } });
    assert.equal(session.status, 200);
    const authorized = await request("/api/protected", { headers: { Cookie: cookie } });
    assert.equal(authorized.status, 200);
    assert.equal((await request("/api/protected", { method: "POST", headers: { Cookie: cookie } })).status, 403);
    assert.equal((await request("/api/protected", { method: "POST", headers: { Cookie: cookie, "X-SMT-CSRF": "0".repeat(64) } })).status, 403);
    assert.equal((await request("/api/protected", { method: "POST", headers: { Cookie: cookie, "X-SMT-CSRF": json.csrfToken } })).status, 200);
    assert.equal((await request("/api/protected", { method: "POST", headers: { Cookie: cookie, "X-SMT-CSRF": json.csrfToken, Origin: "https://evil.example" } })).status, 403);

    const logout = await request("/api/auth/logout", { method: "POST", headers: { Cookie: cookie, "X-SMT-CSRF": json.csrfToken } });
    assert.equal(logout.status, 200);
    assert.equal((await request("/api/protected", { headers: { Cookie: cookie } })).status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
