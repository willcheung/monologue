import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const env = { ...process.env, NODE_ENV: "development", MONOLOGUE_MODE: "cloud", MONOLOGUE_WORKSPACE_DEV: "1", MONOLOGUE_DEMO_MODE: "0", DATABASE_URL: `file:${resolve("prisma/workspace-dev.db")}`, BETTER_AUTH_URL: "http://localhost:3100", BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"), MONOLOGUE_MCP_ENABLED: "1" };
// Never inherit a hosted database, Google provider credentials, or deployment markers.
for (const key of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "MONOLOGUE_API_KEY", "VERCEL", "VERCEL_ENV", "VERCEL_URL"]) env[key] = "";
function run(args) {
  return new Promise((resolveRun, reject) => { const child = spawn(process.execPath, args, { env, stdio: "inherit" }); child.on("error", reject); child.on("exit", code => code === 0 ? resolveRun() : reject(new Error(`Development setup exited ${code}`))); });
}
if (!existsSync(resolve("prisma/workspace-dev.db"))) writeFileSync(resolve("prisma/workspace-dev.db"), "");
await run(["node_modules/prisma/build/index.js", "generate"]);
await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
await run(["--import", "tsx", "scripts/seed-workspace-dev.ts"]);
console.log("Open http://localhost:3100/feed — use the sample-account selector to try the team flow.");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3100"], { env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", code => process.exit(code ?? 0));
