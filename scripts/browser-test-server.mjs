import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const authTest = process.argv.includes("--auth");
const port = authTest ? "3102" : "3101";

// Own a fresh database on every run; never reuse a developer or hosted database.
const directory = realpathSync(mkdtempSync(join(tmpdir(), "monologue-browser-")));
mkdirSync(join(directory, "prisma"));
const databaseUrl = `file:${join(directory, "prisma/workspace-dev.db")}`;
writeFileSync(join(directory, "prisma/workspace-dev.db"), "");
const env = { ...process.env, NODE_ENV: "development", MONOLOGUE_MODE: "cloud", MONOLOGUE_WORKSPACE_DEV: "1", MONOLOGUE_DEMO_MODE: "0", DATABASE_URL: databaseUrl,
  BETTER_AUTH_URL: `http://localhost:${port}`, BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"), MONOLOGUE_MCP_ENABLED: "1", NEXT_TELEMETRY_DISABLED: "1" };
for (const key of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "MONOLOGUE_API_KEY", "RESEND_API_KEY", "MONOLOGUE_EMAIL_FROM", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"]) env[key] = "";
function run(args, cwd = process.cwd()) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { env, cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolveRun() : reject(new Error(`Browser fixture setup exited ${code}`)));
  });
}
let server;
try {
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", resolve("prisma/schema.prisma")]);
  // The shared seed's path guard resolves against the owned fixture directory.
  await run(["--import", resolve("node_modules/tsx/dist/loader.mjs"), resolve("scripts/seed-workspace-dev.ts")], directory);
  const db = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    await db.agent.create({ data: { id: "browser-quiet-agent", workspaceId: "dev-studio", name: "Quiet fixture", connectedByUserId: "dev-owner" } });
    await db.workspace.create({ data: { id: "browser-legacy", name: "Legacy currency fixture", kind: "shared", ownerId: "dev-owner", members: { create: { userId: "dev-owner", role: "owner" } } } });
    await db.action.create({ data: { id: "browser-legacy-currency", workspaceId: "browser-legacy", agentName: "Fixture", verb: "Bought", summary: "Legacy currency receipt", category: "purchase", status: "completed", system: "Fixture", value: 1, currency: "123" } });
    await db.workspace.create({ data: { id: "browser-activity", name: "Private activity fixture", kind: "shared", ownerId: "dev-owner", members: { create: { userId: "dev-owner", role: "owner" } } } });
    for (const id of ["browser-agent-a", "browser-agent-b"]) await db.agent.create({ data: { id, workspaceId: "browser-activity", name: "Fixture agent" } });
    const captured = new Date();
    const dates = Array.from({ length: 28 }, (_, i) => { const date = new Date(captured); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - 27 + i); return date; });
    for (const [index, date] of dates.entries()) {
      await db.action.createMany({ data: Array.from({ length: [0, 2, 4, 8, 12, 20, 1][index % 7] }, (_, item) => ({
        workspaceId: "browser-activity", agentId: item % 2 ? "browser-agent-a" : "browser-agent-b", agentName: "Fixture agent",
        occurredAt: date, category: "code", system: "Fixture app", status: "completed", verb: "Updated",
        summary: "Never share this customer detail", url: "https://example.test/private", metadata: { private: "Never share this metadata" },
      })) });
    }
  } finally { await db.$disconnect(); }
  if (authTest) {
    const fixtureDb = new PrismaClient({ datasourceUrl: databaseUrl });
    try {
      const id = "browser-password-user";
      await fixtureDb.user.create({ data: { id, name: "Local sample account", email: "password@example.test", emailVerified: true,
        accounts: { create: { id: "browser-password-account", accountId: id, providerId: "credential", password: await hashPassword("Disposable-browser-password-only!") } } } });
      await fixtureDb.workspace.create({ data: { id: "browser-password-workspace", name: "Personal", ownerId: id, personalOwnerId: id,
        members: { create: { userId: id, role: "owner" } }, actions: { create: { id: "browser-password-sample", agentName: "Sample agent", verb: "Updated", summary: "Updated a sample document.", category: "other", status: "completed", system: "Local fixture" } } } });
    } finally { await fixtureDb.$disconnect(); }
    // Exercise real cloud auth against a disposable local libSQL database. The
    // development identity cookie must not authenticate this fixture.
    env.MONOLOGUE_WORKSPACE_DEV = "0";
    env.MONOLOGUE_PASSWORD_SIGN_IN = "1";
    env.TURSO_DATABASE_URL = databaseUrl;
    env.TURSO_AUTH_TOKEN = "disposable-local-file-only";
    env.GOOGLE_CLIENT_ID = "dummy-browser-google-client";
    env.GOOGLE_CLIENT_SECRET = "dummy-browser-google-secret";
  } else {
    env.MONOLOGUE_PASSWORD_SIGN_IN = "0";
  }
  // Build the same source in our fixture directory: a test must not share a
  // Next.js cache, lock or environment files with an existing development server.
  for (const entry of ["app", "components", "lib", "public", "skills", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "instrumentation.ts", "instrumentation-client.ts", "sentry.server.config.ts", "sentry.edge.config.ts"]) {
    cpSync(resolve(entry), join(directory, entry), { recursive: true });
  }
  symlinkSync(resolve("node_modules"), join(directory, "node_modules"), "dir");
  const next = resolve("node_modules/next/dist/bin/next");
  if (authTest) {
    // Auth requests must not race the development server's manifest rewrites.
    // Build before listening, using only this fixture's source and local database.
    env.NODE_ENV = "production";
    await run([next, "build", "--webpack"], directory);
  }
  server = spawn(process.execPath, [next, authTest ? "start" : "dev", ...(!authTest ? ["--webpack"] : []), "--hostname", "127.0.0.1", "--port", port], { cwd: directory, env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
  server.on("exit", code => {
    rmSync(directory, { recursive: true, force: true });
    process.exit(code ?? 0);
  });
} catch (error) {
  rmSync(directory, { recursive: true, force: true });
  throw error;
}
