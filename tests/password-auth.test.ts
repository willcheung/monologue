import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";

const fixture = vi.hoisted(() => ({ db: undefined as unknown as PrismaClient }));
vi.mock("@/lib/db", () => ({ get db() { return fixture.db; } }));
let auth: typeof import("@/lib/auth").auth;
let directory: string;
const origin = "http://localhost:3102";
const password = "Disposable-test-password-only!";
type AuthHandler = Pick<typeof auth, "handler">;
const post = (instance: AuthHandler, path: string, body: object, headers: Record<string, string> = {}) => instance.handler(new Request(`${origin}/api/auth/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...headers }, body: JSON.stringify(body),
}));
const login = (instance: AuthHandler = auth, body: object = {}) => post(instance, "sign-in/email", { email: "login@example.test", password, rememberMe: false, ...body });
const cookie = (response: Response) => response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "monologue-password-"));
  const url = `file:${join(directory, "auth.db")}`;
  fixture.db = process.env.MCP_TEST_LIBSQL === "1"
    ? new PrismaClient({ adapter: new PrismaLibSQL({ url }) })
    : new PrismaClient({ datasourceUrl: url });
  for (const name of readdirSync("prisma/migrations").sort()) {
    if (name === "migration_lock.toml") continue;
    for (const sql of readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8").split(";").map(value => value.trim()).filter(Boolean)) await fixture.db.$executeRawUnsafe(sql);
  }
  for (const [key, value] of Object.entries({ MONOLOGUE_MODE: "cloud", MONOLOGUE_PASSWORD_SIGN_IN: "1", BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: "disposable-local-auth-test-secret-at-least-32-chars", GOOGLE_CLIENT_ID: "dummy-local-google-client", GOOGLE_CLIENT_SECRET: "dummy-local-google-secret", TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: "local-file-only", VERCEL: "" })) vi.stubEnv(key, value);
  auth = (await import("@/lib/auth")).auth;
  const hash = await hashPassword(password);
  for (const [id, emailVerified] of [["login", true], ["unverified", false], ["google", true]] as const) {
    await fixture.db.user.create({ data: { id, name: "Local fixture", email: `${id}@example.test`, emailVerified,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: id === "google" ? "google" : "credential", ...(id !== "google" && { password: hash }) } } } });
  }
}, 30_000);
beforeEach(async () => { await fixture.db.rateLimit.deleteMany(); });
afterAll(async () => { await fixture.db?.$disconnect(); if (directory) rmSync(directory, { recursive: true, force: true }); vi.unstubAllEnvs(); });

describe("Provider password sign-in boundary", () => {
  it("issues a real browser session, preserves OAuth return state and invalidates logout", async () => {
    const next = "/oauth/authorize?state=preserve%2Bme&client_id=fixture&scope=actions%3Aread+actions%3Awrite";
    const response = await login(auth, { callbackURL: next });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ url: next, redirect: true, user: { id: "login" } });
    const setCookie = response.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly"); expect(setCookie).toContain("SameSite=Lax");
    const sessionCookie = cookie(response);
    const session = await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { cookie: sessionCookie } }));
    expect(await session.json()).toMatchObject({ user: { id: "login" } });
    expect((await post(auth, "sign-out", {}, { cookie: sessionCookie })).status).toBe(200);
    expect(await (await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { cookie: sessionCookie } }))).json()).toBeNull();
  });

  it("rejects wrong, unknown, Google-only and unverified credentials without creating sessions", async () => {
    const before = await fixture.db.session.count();
    const wrong = await login(auth, { password: "wrong-password" });
    const unknown = await login(auth, { email: "unknown@example.test" });
    const google = await login(auth, { email: "google@example.test" });
    const unverified = await login(auth, { email: "unverified@example.test" });
    expect([wrong.status, unknown.status, google.status, unverified.status]).toEqual([401, 401, 401, 403]);
    expect((await wrong.json()).code).toBe((await unknown.json()).code);
    expect((await google.json()).code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(await fixture.db.session.count()).toBe(before);
  });

  it("closes public signup for both new and existing identities", async () => {
    const before = await fixture.db.user.count();
    for (const email of ["new@example.test", "google@example.test"]) {
      expect((await post(auth, "sign-up/email", { email, name: "Local", password })).status).toBe(400);
    }
    expect(await fixture.db.user.count()).toBe(before);
    expect(await fixture.db.account.count({ where: { userId: "google", providerId: "credential" } })).toBe(0);
  });

  it("rejects cross-origin login and external callbacks before issuing a session", async () => {
    const before = await fixture.db.session.count();
    expect((await post(auth, "sign-in/email", { email: "login@example.test", password }, { Origin: "https://attacker.example" })).status).toBe(403);
    expect((await login(auth, { callbackURL: "https://attacker.example/" })).status).toBe(403);
    expect((await login(auth, { callbackURL: "//attacker.example/" })).status).toBe(403);
    expect(await fixture.db.session.count()).toBe(before);
  });

  it("shares an atomic throttle across auth instances and rejects concurrent overflow", async () => {
    const other = betterAuth(auth.options);
    for (let i = 0; i < 4; i++) expect((await login(i % 2 ? other : auth, { password: "wrong" })).status).toBe(401);
    const responses = await Promise.all([login(auth, { password: "wrong" }), login(other, { password: "wrong" })]);
    expect(responses.map(response => response.status).sort()).toEqual([401, 429]);
    expect((await login(other)).status).toBe(429);
    expect(await fixture.db.rateLimit.count()).toBeGreaterThan(0);
    await fixture.db.rateLimit.updateMany({ data: { lastRequest: Date.now() - 61_000 } });
    expect((await login()).status).toBe(200);
  });

  it("keeps password authentication disabled when its provider option is off", async () => {
    const disabled = betterAuth({ ...auth.options, emailAndPassword: { ...auth.options.emailAndPassword, enabled: false } });
    expect((await login(disabled)).status).toBe(400);
  });

  it("retains Google identity-only initiation and the OAuth return URL", async () => {
    const next = "/oauth/authorize?state=google-return";
    const response = await post(auth, "sign-in/social", { provider: "google", callbackURL: next, newUserCallbackURL: next, disableRedirect: true });
    expect(response.status).toBe(200);
    const url = new URL((await response.json()).url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect([...new Set(url.searchParams.get("scope")!.split(" "))].sort()).toEqual(["email", "openid", "profile"]);
    expect(url.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/google`);
  });

  it("defaults password login off and trusts only the hosted client IP header", async () => {
    vi.stubEnv("MONOLOGUE_PASSWORD_SIGN_IN", "0");
    vi.resetModules();
    const disabled = await import("@/lib/auth");
    expect(disabled.passwordSignInConfigured).toBe(false);
    expect((await login(disabled.auth)).status).toBe(400);
    vi.stubEnv("MONOLOGUE_PASSWORD_SIGN_IN", "1");
    vi.stubEnv("VERCEL", "1");
    try {
      vi.resetModules();
      const hosted = (await import("@/lib/auth")).auth;
      expect(hosted.options.advanced.ipAddress?.ipAddressHeaders).toEqual(["x-vercel-forwarded-for"]);
      for (let i = 1; i <= 5; i++) {
        const response = await post(hosted, "sign-in/email", { email: "login@example.test", password: "wrong" }, {
          "x-vercel-forwarded-for": "198.51.100.25", "x-forwarded-for": `203.0.113.${i}`,
        });
        expect(response.status).toBe(401);
      }
      expect((await post(hosted, "sign-in/email", { email: "login@example.test", password }, {
        "x-vercel-forwarded-for": "198.51.100.25", "x-forwarded-for": "203.0.113.200",
      })).status).toBe(429);
    } finally { vi.stubEnv("VERCEL", ""); }
  });

  it("rejects arbitrary auth paths before any durable throttle writes", async () => {
    for (let index = 0; index < 12; index++) {
      const response = await auth.handler(new Request(`${origin}/api/auth/not-a-route-${index}`));
      expect(response.status).toBe(404);
    }
    expect(await fixture.db.rateLimit.count()).toBe(0);
    expect((await auth.handler(new Request(`${origin}/api/auth/callback/not-configured`))).status).toBe(404);
    expect(await fixture.db.rateLimit.count()).toBe(0);
  });

  it("prunes stale throttle buckets on a new supported request", async () => {
    await fixture.db.rateLimit.create({ data: { id: "stale", key: "old-client-unused-path", count: 1, lastRequest: Date.now() - 25 * 60 * 60 * 1000 } });
    vi.resetModules();
    const fresh = (await import("@/lib/auth")).auth;
    expect((await fresh.handler(new Request(`${origin}/api/auth/ok`))).status).toBe(200);
    expect(await fixture.db.rateLimit.findUnique({ where: { id: "stale" } })).toBeNull();
  });

  it("blocks public credential changes and recovery even for an authenticated account", async () => {
    const response = await login();
    expect(response.status).toBe(200);
    const sessionCookie = cookie(response);
    const credential = await fixture.db.account.findFirstOrThrow({ where: { userId: "login", providerId: "credential" } });
    expect((await post(auth, "change-password", { currentPassword: password, newPassword: "Disposable-replacement-test-only!" }, { cookie: sessionCookie })).status).toBe(404);
    expect((await post(auth, "request-password-reset", { email: "login@example.test" })).status).toBe(404);
    expect((await post(auth, "reset-password", { token: "not-a-reset-token", newPassword: "Disposable-replacement-test-only!" })).status).toBe(404);
    expect((await fixture.db.account.findUniqueOrThrow({ where: { id: credential.id } })).password === credential.password).toBe(true);
  });

  it("sets Secure cookies on an HTTPS origin", async () => {
    const httpsOrigin = "https://auth.example.test";
    const secure = betterAuth({ ...auth.options, baseURL: httpsOrigin, trustedOrigins: [httpsOrigin] });
    const response = await secure.handler(new Request(`${httpsOrigin}/api/auth/sign-in/email`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: httpsOrigin }, body: JSON.stringify({ email: "login@example.test", password, rememberMe: false }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
});
