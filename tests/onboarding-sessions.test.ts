import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { loopbackServer } from "./helpers/loopback-server";
import { prepareSessionProfile, runSession, type SessionClient } from "./helpers/agent-session";

const fixture = vi.hoisted(() => ({ db: undefined as unknown as PrismaClient }));
vi.mock("@/lib/db", () => ({ get db() { return fixture.db; } }));
import { handleMcpRequest } from "@/lib/mcp-server";
import { approveOAuthConnection, exchangeOAuthToken, registerOAuthClient } from "@/lib/mcp-oauth";

const enabled = process.env.MONOLOGUE_SESSION_TESTS === "1";
const clients: SessionClient[] = ["claude-code", "codex"];
const selected = (process.env.MONOLOGUE_TEST_CLIENTS ?? clients.join(",")).split(",");
if (enabled && selected.some(id => !clients.includes(id as SessionClient))) throw new Error("Choose claude-code or codex for MONOLOGUE_TEST_CLIENTS");
type Receipt = { id: string; title: string; system: string; status: string; url: string };
const receipts: Receipt[] = [];
const calls: { name: string; stage: string }[] = [];
const evidence: Record<string, unknown>[] = [];
let directory: string, stage = "setup";
let server: Awaited<ReturnType<typeof loopbackServer>>;

describe.skipIf(!enabled)("fresh native sessions with the canonical skill", () => {
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "monologue-live-onboarding-"));
    fixture.db = new PrismaClient({ datasourceUrl: `file:${join(directory, "test.db")}` });
    for (const migration of (await readdir("prisma/migrations")).sort()) {
      if (migration === "migration_lock.toml") continue;
      const sql = await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8");
      for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await fixture.db.$executeRawUnsafe(statement);
    }
    for (const id of clients) {
      await fixture.db.user.create({ data: { id, name: `Fixture ${id}`, email: `${id}@example.test` } });
      await fixture.db.workspace.create({ data: { id, name: `Fixture ${id}`, ownerId: id } });
    }
    server = await loopbackServer(async request => {
      const path = new URL(request.url).pathname;
      if (path === "/mcp") {
        if (request.method === "POST") {
          const rpc = await request.clone().json();
          if (rpc.method === "tools/call") calls.push({ name: rpc.params.name, stage });
        }
        return handleMcpRequest(request);
      }
      if (path === "/fixture/mcp") {
        if (request.method !== "POST") return new Response(null, { status: 405 });
        const service = new McpServer({ name: "fixture-tasks", version: "1.0.0" });
        service.registerTool("create_task", {
          description: "Creates a task in Fixture Tasks. Returns the stored task ID, title, status and permanent task URL. The system name is Fixture Tasks.",
          inputSchema: z.object({ title: z.string().min(1).max(200) }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
        }, async ({ title }) => {
          const id = randomUUID();
          const receipt = { id, title, system: "Fixture Tasks", status: "completed", url: `${server.origin}/tasks/${id}` };
          receipts.push(receipt);
          calls.push({ name: "fixture.create_task", stage });
          return { content: [{ type: "text", text: JSON.stringify(receipt) }], structuredContent: receipt };
        });
        const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        try {
          await service.connect(transport);
          const response = await transport.handleRequest(request);
          const body = await response.arrayBuffer();
          return new Response(body.byteLength ? body : null, { status: response.status, headers: response.headers });
        } finally { await service.close(); }
      }
      const receipt = receipts.find(item => path === `/tasks/${item.id}`);
      return receipt ? Response.json(receipt) : new Response(null, { status: 404 });
    });
    vi.stubEnv("BETTER_AUTH_URL", server.origin);
    vi.stubEnv("MONOLOGUE_MODE", "cloud");
    vi.stubEnv("MONOLOGUE_MCP_ENABLED", "1");
  });
  afterAll(async () => {
    try {
      const reportPath = process.env.MONOLOGUE_EVAL_REPORT;
      if (reportPath) {
        const destination = resolve(reportPath);
        if (!destination.startsWith(resolve("private") + "/")) throw new Error("Session evidence must stay under ignored private/");
        await writeFile(destination, JSON.stringify({ generatedAt: new Date().toISOString(), results: evidence }, null, 2), { mode: 0o600 });
      }
    } finally {
      await server?.close();
      await fixture.db?.$disconnect();
      if (directory) await rm(directory, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });

  for (const client of clients) it.skipIf(!selected.includes(client))(`${client}: loads skill in a new process and reports the actual task receipt`, async () => {
    stage = `${client}:prepare`;
    const result: Record<string, unknown> = { client, status: "failed" };
    evidence.push(result);
    try {
      const oauth = await registerOAuthClient({ client_name: `Session fixture ${client}`, redirect_uris: ["http://127.0.0.1:9000/callback"], token_endpoint_auth_method: "none" });
      const verifier = "fresh-session-verifier-that-is-at-least-forty-three-characters-long";
      const callback = new URL(await approveOAuthConnection({ response_type: "code", client_id: oauth.client_id, redirect_uri: oauth.redirect_uris[0], resource: `${server.origin}/mcp`, scope: "actions:read actions:write", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }, client, client));
      const token = await exchangeOAuthToken(new URLSearchParams({ grant_type: "authorization_code", client_id: oauth.client_id, redirect_uri: oauth.redirect_uris[0], resource: `${server.origin}/mcp`, code_verifier: verifier, code: callback.searchParams.get("code")! }));
      const profile = await prepareSessionProfile(client, join(directory, client), server.origin, token.access_token);
      result.clientVersion = profile.version;
      const canonical = await readFile("skills/monologue/SKILL.md", "utf8");
      result.skillSha256 = createHash("sha256").update(canonical).digest("hex");
      const count = await fixture.db.action.count();
      const initialReceipts = receipts.length;
      stage = `${client}:discovery`;
      process.stdout.write(`[onboarding session] ${client} ${profile.version}: checking installed skill\n`);
      const initial = await runSession(client, profile, "Read the installed monologue skill and briefly explain when it applies. Do not create a task or report any action.");
      expect(initial.skillLoaded, "Skill must actually load, not merely be named in the final answer").toBe(true);
      expect(await fixture.db.action.count()).toBe(count);
      expect(receipts).toHaveLength(initialReceipts);
      result.discovery = initial;

      stage = `${client}:after-restart`;
      process.stdout.write(`[onboarding session] ${client}: starting a new conversation for the task\n`);
      const title = `Prepare release checklist ${randomUUID()}`;
      // No skill name, reporting instruction, previous conversation or setup prompt.
      const restarted = await runSession(client, profile, `Create one task titled "${title}" in Fixture Tasks using its create_task tool. Return the task URL when you are done.`);
      result.afterRestart = restarted;
      result.serverCalls = calls.filter(call => call.stage === stage).map(call => call.name);
      result.fixtureTaskCount = receipts.length - initialReceipts;
      result.reportCount = await fixture.db.action.count({ where: { workspaceId: client } });
      expect(restarted.sessionId).not.toBe("");
      expect(restarted.sessionId).not.toBe(initial.sessionId);
      expect(restarted.skillLoaded || restarted.skillDiscovered, "Fresh conversation must discover the installed skill without a reminder").toBe(true);
      expect(restarted.toolFailures, "Native tools must succeed").toEqual([]);
      expect(receipts).toHaveLength(initialReceipts + 1);
      const receipt = receipts[initialReceipts];
      expect(receipt.title).toBe(title);
      expect(await (await fetch(receipt.url)).json()).toEqual(receipt);
      const reports = await fixture.db.action.findMany({ where: { workspaceId: client } });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ externalId: receipt.id, url: receipt.url, system: receipt.system, status: "completed", category: "task", reportedByUserId: client, source: "self_reported" });
      expect(calls.filter(call => call.stage === stage).map(call => call.name)).toEqual(expect.arrayContaining(["fixture.create_task", "report_action"]));
      expect(await fixture.db.action.count()).toBe(count + 1);
      expect(await readFile(join(profile.skillDirectory, "SKILL.md"), "utf8")).toBe(canonical);
      expect(server.failures).toEqual([]);
      Object.assign(result, { status: "passed", eventId: reports[0].id, fixtureReceiptId: receipt.id, checks: ["skill_loaded", "new_session", "skill_discovered_after_restart", "task_created", "receipt_matches_report", "one_event", "correct_workspace"] });
      process.stdout.write(`[onboarding session] ${client}: PASS; verified event ${reports[0].id}\n`);
    } catch (error) {
      result.stage = stage;
      result.status = error instanceof Error && error.message.startsWith("BLOCKED") ? "blocked" : "failed";
      throw error;
    }
  }, 270_000);
});
