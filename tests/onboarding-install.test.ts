import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { agentSetup } from "@/lib/agent-onboarding";
import { buildSetupPrompt } from "@/lib/setup-prompt";
import { loopbackServer } from "./helpers/loopback-server";
import { prepareInstallProfile, runInstallSession, installedSkillFiles } from "./helpers/install-session";
import type { SessionClient } from "./helpers/agent-session";
import { migrateFixture } from "./helpers/migrate-fixture";

const enabled = process.env.MONOLOGUE_INSTALL_TESTS === "1";
const clients: SessionClient[] = ["claude-code", "codex"];
const selected = (process.env.MONOLOGUE_TEST_CLIENTS ?? clients.join(",")).split(",");
if (enabled && selected.some(id => !clients.includes(id as SessionClient))) throw new Error("Choose claude-code or codex");
let directory: string, db: PrismaClient, app: ChildProcess;
let fixture: Awaited<ReturnType<typeof loopbackServer>>;
const evidence: Record<string, unknown>[] = [];
const receipts: { id: string; title: string; system: string; status: string; url: string }[] = [];
const profiles: { client: SessionClient; profile: Awaited<ReturnType<typeof prepareInstallProfile>> }[] = [];
const origin = "http://127.0.0.1:3112";
const workspace = { id: "install-qa-personal", name: "Personal" };
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => Promise<boolean>, timeout = 600_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await delay(1000); }
  throw new Error("Timed out waiting for the operator/browser step");
}
function stopApp() { if (app?.pid) { try { process.kill(-app.pid, "SIGTERM"); } catch {} } }

describe.skipIf(!enabled)("copied instructions → native OAuth → fresh-session action", () => {
  beforeAll(async () => {
    // Never reuse a running app or an operator database. An occupied port fails.
    await new Promise<void>((resolve, reject) => {
      const probe = createServer();
      probe.once("error", reject);
      probe.listen(3112, "127.0.0.1", () => probe.close(error => error ? reject(error) : resolve()));
    });
    directory = await mkdtemp(join(tmpdir(), "monologue-install-"));
    const datasourceUrl = `file:${join(directory, "app.db")}`;
    await migrateFixture(datasourceUrl);
    db = new PrismaClient({ datasourceUrl });
    await db.user.create({ data: { id: "dev-owner", name: "Install QA", email: "install-qa@example.test" } });
    await db.workspace.create({ data: { id: workspace.id, name: workspace.name, ownerId: "dev-owner", personalOwnerId: "dev-owner" } });
    await db.workspace.create({ data: { id: "install-qa-other", name: "Other QA workspace", kind: "team", ownerId: "dev-owner" } });
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, HOME: directory, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
      MONOLOGUE_MODE: "cloud", MONOLOGUE_WORKSPACE_DEV: "1", MONOLOGUE_DEMO_MODE: "0", MONOLOGUE_MCP_ENABLED: "1",
      DATABASE_URL: `file:${join(directory, "app.db")}`, BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
      TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", MONOLOGUE_API_KEY: "",
      VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", RESEND_API_KEY: "", MONOLOGUE_EMAIL_FROM: "",
    };
    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3112"], { env, stdio: "ignore", detached: true });
    process.once("exit", stopApp);
    await until(async () => {
      if (app.exitCode !== null) throw new Error("Disposable app failed to start; check port 3112 and Next dev lock");
      return fetch(`${origin}/agent-setup/SKILL.md`).then(r => r.ok).catch(() => false);
    }, 90_000);
    fixture = await loopbackServer(async request => {
      const path = new URL(request.url).pathname;
      if (path === "/install" && request.method === "GET") return new Response('<!doctype html><meta charset="utf-8"><title>Local installation test</title><form method="post" accept-charset="UTF-8"><label for="prompt">Copied setup instructions</label><textarea id="prompt" name="prompt" rows="25" cols="100"></textarea><button>Use copied instructions</button></form>', { headers: { "Content-Type": "text/html; charset=utf-8" } });
      if (path === "/install" && request.method === "POST") {
        const prompt = (await request.formData()).get("prompt");
        const client = typeof prompt === "string" && (prompt.startsWith("Set up Monologue for Claude Code.") ? "claude-code" : prompt.startsWith("Set up Monologue for Codex.") ? "codex" : null);
        if (!client || typeof prompt !== "string" || prompt.length > 20_000) return new Response("Unrecognized setup prompt", { status: 400 });
        await writeFile(join(directory, `${client}-prompt.txt`), prompt.replaceAll("\r\n", "\n"), { mode: 0o600 });
        return new Response("<!doctype html><meta charset=utf-8><title>Clipboard captured</title><p>Copied instructions saved to the isolated test.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (path === "/fixture/mcp" && request.method === "POST") {
        const server = new McpServer({ name: "fixture-tasks", version: "1.0.0" });
        server.registerTool("create_task", {
          description: "Create a task in Fixture Tasks. Returns the saved ID, title, status and permanent URL. System: Fixture Tasks.",
          inputSchema: z.object({ title: z.string().min(1).max(200) }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
        }, async ({ title }) => {
          const id = randomUUID();
          const receipt = { id, title, status: "completed", system: "Fixture Tasks", url: `${fixture.origin}/tasks/${id}` };
          receipts.push(receipt);
          return { content: [{ type: "text", text: JSON.stringify(receipt) }], structuredContent: receipt };
        });
        try {
          const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
          await server.connect(transport);
          const response = await transport.handleRequest(request);
          const body = await response.arrayBuffer();
          return new Response(body.byteLength ? body : null, { status: response.status, headers: response.headers });
        } finally { await server.close(); }
      }
      const receipt = receipts.find(item => path === `/tasks/${item.id}`);
      return receipt ? Response.json(receipt) : new Response(null, { status: 404 });
    });
    process.stdout.write(`[install browser] ${origin}/integrations\n[install paste] ${fixture.origin}/install\n[install directory] ${directory}\n`);
  }, 120_000);

  afterAll(async () => {
    for (const { client, profile } of profiles) {
      await promisify(execFile)(profile.binary, ["mcp", "logout", "monologue"], { cwd: profile.project, env: profile.env, timeout: 15_000 }).catch(() => {});
      if (client === "claude-code" && process.platform === "darwin") {
        const service = `Claude Code-credentials-${createHash("sha256").update(profile.env.CLAUDE_CONFIG_DIR!.normalize("NFC")).digest("hex").slice(0, 8)}`;
        await promisify(execFile)("security", ["delete-generic-password", "-s", service], { env: profile.env, timeout: 10_000 }).catch(() => {});
      }
    }
    try {
      if (process.env.MONOLOGUE_EVAL_REPORT) {
        const destination = resolve(process.env.MONOLOGUE_EVAL_REPORT);
        if (!destination.startsWith(resolve("private") + "/")) throw new Error("Evidence must stay under ignored private/");
        await writeFile(destination, JSON.stringify({ generatedAt: new Date().toISOString(), googleSignIn: "not_run_local_synthetic_user", results: evidence }, null, 2), { mode: 0o600 });
      }
    } finally {
      stopApp(); process.removeListener("exit", stopApp);
      if (app && app.exitCode === null) await Promise.race([new Promise(resolve => app.once("exit", resolve)), delay(5000)]);
      await fixture?.close(); await db?.$disconnect();
      if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
  }, 60_000);

  for (const client of clients) it.skipIf(!selected.includes(client))(`${client}: installs from copied prompt and signs in through native OAuth`, async () => {
    const result: Record<string, unknown> = { client, status: "failed", stage: "copy" };
    evidence.push(result);
    const clientDirectory = join(directory, client);
    const profile = await prepareInstallProfile(client, clientDirectory, origin, fixture.origin);
    profiles.push({ client, profile });
    result.clientVersion = profile.version;
    expect(await installedSkillFiles(clientDirectory)).toEqual([]);
    const initialEvents = await db.action.count(), initialTokens = await db.mcpOAuthToken.count(), initialKeys = await db.apiKey.count({ where: { workspaceId: workspace.id, revokedAt: null } }), initialReceipts = receipts.length;
    const promptPath = join(directory, `${client}-prompt.txt`);
    process.stdout.write(`[install copy] Select ${client} and copy setup instructions from the browser. Save clipboard text to ${promptPath}\n`);
    await until(async () => readFile(promptPath, "utf8").then(Boolean).catch(() => false));
    const prompt = await readFile(promptPath, "utf8");
    const expected = agentSetup(client, { instanceUrl: origin, mcpUrl: `${origin}/mcp`, basePrompt: buildSetupPrompt({ origin, mcpEnabled: true, workspace }) }).prompt;
    expect(prompt.trim(), "Use the unchanged website prompt").toBe(expected);
    result.promptSha256 = createHash("sha256").update(prompt.trim()).digest("hex");
    result.stage = "agent-install";
    result.install = await runInstallSession(client, profile, prompt);
    const skills = await installedSkillFiles(clientDirectory);
    expect(skills, "One canonical skill, allowing symlinks to the same file").toHaveLength(1);
    const skill = await readFile(skills[0], "utf8");
    expect(skill).toBe(await readFile("skills/monologue/SKILL.md", "utf8"));
    result.skillSha256 = createHash("sha256").update(skill).digest("hex");
    const nativeConfig = (await promisify(execFile)(profile.binary, ["mcp", "get", "monologue", ...(client === "codex" ? ["--json"] : [])], { cwd: profile.project, env: profile.env, timeout: 20_000 })).stdout;
    expect(nativeConfig).toContain(`${origin}/mcp`);
    expect(await db.action.count(), "Setup is not a reportable event").toBe(initialEvents);
    expect(receipts).toHaveLength(initialReceipts);
    result.stage = "native-oauth";
    if (await db.mcpOAuthToken.count() === initialTokens) {
      process.stdout.write(`[install login] ${client}: complete the local browser approval for Personal.\n`);
      const args = [...(client === "claude-code" && process.env.MONOLOGUE_INSTALL_DEBUG === "1" ? ["--debug-file", join(clientDirectory, "oauth-debug.log")] : []), "mcp", "login", "monologue", ...(client === "codex" ? ["--scopes", "actions:read,actions:write"] : [])];
      // Claude's login UI needs a TTY. Python creates one without saving output.
      const login = spawn("python3", ["-c", "import os,pty,sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))", profile.binary, ...args], { cwd: profile.project, env: profile.env, stdio: ["pipe", "pipe", "pipe"], detached: true });
      const stopLogin = () => { try { if (login.pid) process.kill(-login.pid, "SIGTERM"); } catch {} };
      process.once("exit", stopLogin);
      login.stdout.on("data", chunk => process.stdout.write(chunk));
      login.stderr.on("data", chunk => process.stdout.write(chunk));
      const timer = setTimeout(stopLogin, 300_000);
      try { await new Promise<void>((resolve, reject) => { login.on("error", reject); login.on("close", code => code === 0 ? resolve() : reject(new Error(`Native login exited ${code}`))); }); }
      finally {
        clearTimeout(timer); stopLogin(); process.removeListener("exit", stopLogin);
        if (process.env.MONOLOGUE_INSTALL_DEBUG === "1") {
          const debug = await readFile(join(clientDirectory, "oauth-debug.log"), "utf8").catch(() => "");
          for (const line of debug.split("\n")) if (/secureStorage|keychain|persist resolved|persist failed/i.test(line)) process.stdout.write(line.replace(/[A-Za-z0-9_./=-]{40,}/g, "[redacted]").slice(0, 400) + "\n");
          await rm(join(clientDirectory, "oauth-debug.log"), { force: true });
        }
      }
    }
    expect(await db.mcpOAuthToken.count()).toBe(initialTokens + 1);
    const keys = await db.apiKey.findMany({ where: { workspaceId: workspace.id, revokedAt: null } });
    expect(keys).toHaveLength(initialKeys + 1);
    expect(keys.at(-1)?.scopes.split(" ").sort()).toEqual(["actions:read", "actions:write"]);
    result.stage = "after-restart";
    const previousProject = profile.project;
    profile.project = join(clientDirectory, "another-project");
    await mkdir(profile.project, { recursive: true });
    profile.args = profile.args.map(arg => arg === previousProject ? profile.project : arg);
    const title = `Install QA task ${randomUUID()}`;
    const afterRestart = await runInstallSession(client, profile, `Create one task titled "${title}" in Fixture Tasks using create_task. Return the task URL when done.`);
    result.afterRestart = afterRestart;
    expect(afterRestart.sessionId).not.toBe((result.install as { sessionId: string }).sessionId);
    expect(afterRestart.skillLoaded || afterRestart.skillDiscovered).toBe(true);
    expect(afterRestart.toolFailures).toEqual([]);
    expect(receipts).toHaveLength(initialReceipts + 1);
    const receipt = receipts[initialReceipts];
    expect(await (await fetch(receipt.url)).json()).toEqual(receipt);
    const reports = await db.action.findMany({ where: { externalId: receipt.id } });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ workspaceId: workspace.id, reportedByUserId: "dev-owner", url: receipt.url, category: "task", status: "completed", system: "Fixture Tasks" });
    expect(await db.action.count()).toBe(initialEvents + 1);
    expect(await installedSkillFiles(clientDirectory)).toEqual(skills);
    Object.assign(result, { stage: "complete", status: "passed", eventId: reports[0].id, requestedAndGrantedScopes: ["actions:read", "actions:write"], checks: ["exact_copied_prompt", "initially_missing_skill_and_connection", "canonical_skill_installed_once", "native_oauth_token", "persisted_endpoint", "no_setup_event", "fresh_session_other_project_skill_discovery", "actual_task_receipt_matches_one_report", "correct_workspace"] });
    process.stdout.write(`[install PASS] ${client}: ${reports[0].id}\n`);
  }, 1_200_000);
});
