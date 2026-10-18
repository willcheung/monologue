import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { auth, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { codexAppServer } from "./helpers/codex-app-server";
import { loopbackServer } from "./helpers/loopback-server";
import { migrateFixture } from "./helpers/migrate-fixture";

const fixture = vi.hoisted(() => ({ db: undefined as unknown as PrismaClient }));
vi.mock("@/lib/db", () => ({ get db() { return fixture.db; } }));
import { handleMcpRequest } from "@/lib/mcp-server";
import { approveOAuthConnection, hashOAuthSecret } from "@/lib/mcp-oauth";
import { GET as resourceMetadata } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as oauthMetadata } from "@/app/.well-known/oauth-authorization-server/route";
import { POST as register } from "@/app/oauth/register/route";
import { POST as token } from "@/app/oauth/token/route";
import { POST as revoke } from "@/app/oauth/revoke/route";
import { GET as skill } from "@/app/agent-setup/SKILL.md/route";

let directory: string;
let server: Awaited<ReturnType<typeof loopbackServer>>;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "monologue-onboarding-"));
  const datasourceUrl = `file:${join(directory, "test.db")}`;
  await migrateFixture(datasourceUrl);
  fixture.db = new PrismaClient({ datasourceUrl });
  for (const id of ["chosen", "foreign"]) {
    await fixture.db.user.create({ data: { id, name: `Fixture ${id}`, email: `${id}@example.test` } });
    await fixture.db.workspace.create({ data: { id, name: `Fixture ${id}`, ownerId: id } });
  }
  await fixture.db.action.create({ data: { workspaceId: "foreign", agentName: "Foreign agent", verb: "Sent", summary: "foreign-private-marker", category: "communication", status: "completed", system: "Fixture" } });
  server = await loopbackServer(request => {
    const path = new URL(request.url).pathname;
    if (path === "/mcp") return handleMcpRequest(request);
    if (request.method === "GET" && path === "/.well-known/oauth-protected-resource") return resourceMetadata();
    if (request.method === "GET" && path === "/.well-known/oauth-authorization-server") return oauthMetadata();
    if (request.method === "GET" && path === "/agent-setup/SKILL.md") return skill();
    if (request.method === "POST" && path === "/oauth/register") return register(request);
    if (request.method === "POST" && path === "/oauth/token") return token(request);
    if (request.method === "POST" && path === "/oauth/revoke") return revoke(request);
    return new Response(null, { status: 404 });
  });
  vi.stubEnv("BETTER_AUTH_URL", server.origin);
  vi.stubEnv("MONOLOGUE_MODE", "cloud");
  vi.stubEnv("MONOLOGUE_MCP_ENABLED", "1");
});
afterAll(async () => {
  try { await server?.close(); }
  finally {
    await fixture.db?.$disconnect();
    if (directory) await rm(directory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  }
});

function profile(scope: string, saved?: { client?: OAuthClientInformationMixed; tokens?: OAuthTokens; verifier?: string }) {
  const state = structuredClone({ client: saved?.client, tokens: saved?.tokens, verifier: saved?.verifier }) as { client?: OAuthClientInformationMixed; tokens?: OAuthTokens; verifier?: string; authorization?: URL };
  const provider: OAuthClientProvider = {
    redirectUrl: "http://127.0.0.1:9000/callback",
    clientMetadata: { client_name: "Onboarding fixture", redirect_uris: ["http://127.0.0.1:9000/callback"], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], scope },
    clientInformation: () => state.client, saveClientInformation: value => { state.client = value; },
    tokens: () => state.tokens, saveTokens: value => { state.tokens = value; },
    codeVerifier: () => state.verifier!, saveCodeVerifier: value => { state.verifier = value; },
    state: () => "onboarding-fixture-state", redirectToAuthorization: value => { state.authorization = value; },
  };
  return { state, provider };
}
async function connect(provider: OAuthClientProvider) {
  const client = new Client({ name: "independent-onboarding-test", version: "1.0.0" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`${server.origin}/mcp`), { authProvider: provider }));
    return client;
  } catch (error) { await client.close(); throw error; }
}
async function authorize(scope: string) {
  const account = profile(scope);
  expect(await auth(account.provider, { serverUrl: `${server.origin}/mcp`, resourceMetadataUrl: new URL(`${server.origin}/.well-known/oauth-protected-resource`), scope })).toBe("REDIRECT");
  expect(account.state.authorization?.origin).toBe(server.origin);
  expect(account.state.authorization?.pathname).toBe("/oauth/authorize");
  // Simulate the human decision only in this disposable DB. This deliberately
  // does not claim to test Google sign-in or the browser consent screen.
  const callback = new URL(await approveOAuthConnection(Object.fromEntries(account.state.authorization!.searchParams), "chosen", "chosen"));
  expect(callback.searchParams.get("state")).toBe("onboarding-fixture-state");
  const transport = new StreamableHTTPClientTransport(new URL(`${server.origin}/mcp`), { authProvider: account.provider });
  await transport.finishAuth(callback.searchParams.get("code")!);
  await transport.close();
  return account;
}

describe("onboarding through a real HTTP client", () => {
  it("serves the canonical skill and requires authorization without creating activity", async () => {
    const count = await fixture.db.action.count();
    const response = await fetch(`${server.origin}/agent-setup/SKILL.md`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(await readFile("skills/monologue/SKILL.md", "utf8"));
    const blocked = await fetch(`${server.origin}/mcp`);
    expect(blocked.status).toBe(401);
    expect(blocked.headers.get("www-authenticate")).toContain(`${server.origin}/.well-known/oauth-protected-resource`);
    expect(await fixture.db.action.count()).toBe(count);
  });

  it("completes PKCE, discovers tools, survives a fresh client, refreshes, deduplicates and revokes", async () => {
    const count = await fixture.db.action.count();
    const account = await authorize("actions:read actions:write");
    expect(await fixture.db.action.count()).toBe(count); // Connecting isn't an external action.
    const client = await connect(account.provider);
    const payload = { verb: "Sent", summary: "Fixture: message sent", category: "communication", status: "completed", system: "Fixture", externalId: "onboarding-message-1", url: "https://example.test/messages/1" };
    let eventId: string;
    try {
      const names = (await client.listTools()).tools.map(tool => tool.name).sort();
      expect(names).toEqual(["read_timeline", "report_action"]);
      const report = await client.callTool({ name: "report_action", arguments: payload });
      expect(report.isError).not.toBe(true);
      expect(report.structuredContent).toMatchObject({ success: true, duplicate: false, id: expect.any(String) });
      eventId = (report.structuredContent as Record<string, unknown>).id as string;
      // Grade against persistence, not a client's "connected" or success prose.
      expect(await fixture.db.action.findUniqueOrThrow({ where: { id: eventId } })).toMatchObject({ ...payload, workspaceId: "chosen", reportedByUserId: "chosen", agentName: "Onboarding fixture" });
    } finally { await client.close(); }

    const grants = await fixture.db.apiKey.count();
    const clients = await fixture.db.mcpOAuthClient.count();
    const resumed = profile("actions:read actions:write", JSON.parse(JSON.stringify({ client: account.state.client, tokens: account.state.tokens, verifier: account.state.verifier })));
    const accessBeforeRefresh = resumed.state.tokens!.access_token;
    await fixture.db.mcpOAuthToken.update({ where: { accessHash: hashOAuthSecret(accessBeforeRefresh) }, data: { expiresAt: new Date(0) } });
    const fresh = await connect(resumed.provider);
    try {
      expect(resumed.state.authorization).toBeUndefined(); // No second user approval.
      expect(resumed.state.tokens!.access_token === accessBeforeRefresh).toBe(false);
      expect(resumed.state.tokens!.scope?.split(" ").sort()).toEqual(["actions:read", "actions:write"]);
      const duplicate = await fresh.callTool({ name: "report_action", arguments: payload });
      expect(duplicate.structuredContent).toMatchObject({ success: true, duplicate: true, id: eventId! });
      const timeline = await fresh.callTool({ name: "read_timeline", arguments: {} });
      expect(timeline.isError).not.toBe(true);
      expect(timeline.structuredContent).toMatchObject({ actions: [expect.objectContaining({ id: eventId!, url: payload.url })], nextCursor: null });
      expect(JSON.stringify(timeline)).not.toContain("foreign-private-marker");
      expect(await fixture.db.action.count()).toBe(count + 1);
      expect(await fixture.db.apiKey.count()).toBe(grants);
      expect(await fixture.db.mcpOAuthClient.count()).toBe(clients);
    } finally { await fresh.close(); }

    const response = await fetch(`${server.origin}/oauth/revoke`, { method: "POST", body: new URLSearchParams({ client_id: resumed.state.client!.client_id, token: resumed.state.tokens!.refresh_token! }) });
    expect(response.status).toBe(200);
    const denied = await fetch(`${server.origin}/mcp`, { headers: { authorization: `Bearer ${resumed.state.tokens!.access_token}` } });
    expect(denied.status).toBe(401);
    const refresh = await fetch(`${server.origin}/oauth/token`, { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", client_id: resumed.state.client!.client_id, refresh_token: resumed.state.tokens!.refresh_token!, resource: `${server.origin}/mcp` }) });
    expect(refresh.status).toBe(400);
    expect(await refresh.json()).toMatchObject({ error: "invalid_grant" });
    expect(server.requests).toEqual(expect.arrayContaining(["POST /oauth/register", "POST /oauth/token", "POST /mcp", "POST /oauth/revoke"]));
    expect(server.failures).toEqual([]);
  });

  it("preserves a limited grant across reconnect and refuses a scope upgrade", async () => {
    const account = await authorize("actions:write");
    const client = await connect(account.provider);
    try {
      const denied = await client.callTool({ name: "read_timeline", arguments: {} });
      expect(denied.isError).toBe(true);
      expect(denied.structuredContent).toBeUndefined();
      expect(denied._meta?.["mcp/www_authenticate"]).toEqual([expect.stringContaining("insufficient_scope")]);
      const broaden = await fetch(`${server.origin}/oauth/token`, { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", client_id: account.state.client!.client_id, refresh_token: account.state.tokens!.refresh_token!, resource: `${server.origin}/mcp`, scope: "actions:read actions:write" }) });
      expect(broaden.status).toBe(400);
      expect(await broaden.json()).toMatchObject({ error: "invalid_scope" });
    } finally { await client.close(); }
    const resumed = profile("actions:write", account.state);
    const fresh = await connect(resumed.provider);
    try {
      expect((await fresh.callTool({ name: "read_timeline", arguments: {} })).isError).toBe(true);
      expect(resumed.state.tokens!.scope).toBe("actions:write");
    } finally { await fresh.close(); }
    expect(server.failures).toEqual([]);
  });
});


describe.skipIf(process.env.MONOLOGUE_APP_SERVER_TESTS !== "1")("Codex desktop protocol (isolated app-server, not desktop UI)", () => {
  it("finishes native OAuth, retains tools and skills after restart, and persists one report", async () => {
    const root = await mkdtemp(join(directory, "app-server-"));
    const config = join(root, ".codex"), project = join(root, "project"), nextProject = join(root, "another-project");
    const skills = join(root, ".agents", "skills", "monologue");
    await Promise.all([config, project, nextProject, skills].map(path => mkdir(path, { recursive: true })));
    await writeFile(join(skills, "SKILL.md"), await readFile("skills/monologue/SKILL.md"));
    await writeFile(join(config, "config.toml"), `mcp_oauth_credentials_store = "file"\n[mcp_servers.monologue]\nurl = "${server.origin}/mcp"\n`, { mode: 0o600 });
    const binary = process.env.MONOLOGUE_CODEX_BIN || "codex";
    if (process.env.MONOLOGUE_CODEX_BIN && !isAbsolute(binary)) throw new Error("Use an absolute Codex binary override");
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test", PATH: process.env.PATH?.split(delimiter).filter(path => !path.endsWith("/node_modules/.bin")).join(delimiter), HOME: root, CODEX_HOME: config, TMPDIR: root };
    const version = (await promisify(execFile)(binary, ["--version"], { env, timeout: 10_000 })).stdout.trim();
    process.stdout.write(`[onboarding app-server] ${version}\n`);
    let native = codexAppServer(binary, project, env);
    try {
      await native.initialize();
      const completed = native.notification<{ success: boolean }>("mcpServer/oauthLogin/completed");
      // DCR keeps this deterministic/offline; browser CIMD is a separate check.
      const login = await native.request<{ authorizationUrl: string }>("mcpServer/oauth/login", { name: "monologue", clientRegistration: "dcr", scopes: ["actions:read", "actions:write"], timeoutSecs: 40 });
      const url = new URL(login.authorizationUrl);
      expect(url.origin).toBe(server.origin);
      // Consent is simulated only for our disposable account; no browser or Google claim.
      const callback = await approveOAuthConnection(Object.fromEntries(url.searchParams), "chosen", "chosen");
      const callbackUrl = new URL(callback);
      expect(callbackUrl.hostname).toBe("127.0.0.1");
      expect((await fetch(callback)).ok).toBe(true);
      expect((await completed).success).toBe(true);
      const inventory = await native.request("mcpServerStatus/list", { detail: "toolsAndAuthOnly" });
      expect(JSON.stringify(inventory)).toContain("report_action");
      const discovered = await native.request("skills/list", { cwds: [project], forceReload: true });
      expect(JSON.stringify(discovered)).toContain(join(skills, "SKILL.md"));
      await native.close(); native = codexAppServer(binary, nextProject, env); await native.initialize();
      const after = await native.request("mcpServerStatus/list", { detail: "toolsAndAuthOnly" });
      expect(JSON.stringify(after)).toContain("read_timeline");
      expect(JSON.stringify(after)).toContain("report_action");
      expect(JSON.stringify(await native.request("skills/list", { cwds: [nextProject], forceReload: true }))).toContain(join(skills, "SKILL.md"));
      const thread = await native.request<{ thread: { id: string } }>("thread/start", { cwd: nextProject, ephemeral: true, sandbox: "read-only", approvalPolicy: "untrusted" });
      const call = (tool: string, args: object) => native.request<{ isError?: boolean }>("mcpServer/tool/call", { threadId: thread.thread.id, server: "monologue", tool, arguments: args });
      const read = await call("read_timeline", { limit: 5 });
      expect(read.isError).not.toBe(true); expect(JSON.stringify(read)).not.toContain("foreign-private-marker");
      const externalId = "app-server-disposable-task", receipt = { externalId, verb: "Created", summary: "Created a disposable QA task", category: "task", status: "completed", system: "Fixture Tasks" };
      await writeFile(join(root, "fixture-task.json"), JSON.stringify(receipt));
      expect((await call("report_action", receipt)).isError).not.toBe(true);
      const reports = await fixture.db.action.findMany({ where: { externalId } });
      expect(reports).toHaveLength(1); expect(reports[0]).toMatchObject({ ...receipt, workspaceId: "chosen", reportedByUserId: "chosen" });
      expect((await call("report_action", receipt)).isError).not.toBe(true);
      expect(await fixture.db.action.count({ where: { externalId } })).toBe(1);
    } finally { await native.close(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); }
  }, 120_000);
});
