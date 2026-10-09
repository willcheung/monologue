import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ db: undefined as unknown as PrismaClient, context: vi.fn() }));
vi.mock("@/lib/db", () => ({ get db() { return fixture.db; } }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: fixture.context }));
vi.mock("server-only", () => ({}));

import { GET as getActions, POST as postAction } from "@/app/api/actions/route";
import { POST as requestConnection } from "@/app/api/connect/request/route";
import { POST as approveConnection } from "@/app/api/connect/approve/route";
import { POST as pollConnection } from "@/app/api/connect/poll/route";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, createWorkspaceAgentApiKey, DEFAULT_AGENT_SCOPES } from "@/lib/api-keys";
import { createSharedWorkspace, removeWorkspaceMember } from "@/lib/workspace-service";

const origin = "https://request.example.test";
const report = {
  agentName: "Submitted name", verb: "sent", summary: "Fixture: sent a message",
  category: "communication", status: "completed", system: "Email", externalId: "fixture-message",
};
let directory: string;

beforeAll(async () => {
  directory = mkdtempSync(path.join(tmpdir(), "monologue-routes-test-"));
  const url = `file:${path.join(directory, "test.db")}`;
  // Execute committed SQL intact, including PRAGMAs and the legacy partial index.
  const migrationClient = createClient({ url });
  try {
    for (const name of readdirSync("prisma/migrations").filter(name => name !== "migration_lock.toml").sort()) {
      await migrationClient.executeMultiple(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
    }
  } finally { migrationClient.close(); }
  fixture.db = process.env.MCP_TEST_LIBSQL === "1"
    ? new PrismaClient({ adapter: new PrismaLibSQL({ url }) })
    : new PrismaClient({ datasourceUrl: url });
  for (const id of ["route-owner", "route-outsider", "route-member"]) {
    await fixture.db.user.create({ data: { id, name: id, email: `${id}@example.test`, emailVerified: true } });
  }
  for (const [id, userId] of [["route-workspace", "route-owner"], ["foreign-workspace", "route-outsider"]]) {
    await fixture.db.workspace.create({ data: { id, name: id, ownerId: userId, personalOwnerId: userId } });
  }
});

beforeEach(async () => {
  vi.stubEnv("MONOLOGUE_MODE", "cloud");
  vi.stubEnv("BETTER_AUTH_URL", "https://configured.example.test");
  fixture.context.mockReset();
  fixture.context.mockResolvedValue({ user: { id: "route-owner" }, workspace: { id: "route-workspace" } });
  await fixture.db.action.deleteMany();
  await fixture.db.apiKey.deleteMany();
  await fixture.db.agent.deleteMany();
  await fixture.db.agentConnection.deleteMany();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await fixture.db?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

function actionRequest(method: string, token?: string, body?: unknown, query = "") {
  return new NextRequest(`${origin}/api/actions${query}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
function connectionRequest(endpoint: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/connect/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...headers }, body: JSON.stringify(body),
  });
}
function createKey(workspaceId = "route-workspace", userId = "route-owner") {
  return createWorkspaceAgentApiKey(workspaceId, "Connected agent", userId);
}
async function startConnection() {
  const response = await requestConnection(connectionRequest("request", { agentName: "Route agent", platform: "Fixture", skillVersion: "0.1.1" }));
  expect(response.status).toBe(201);
  expectPrivate(response);
  const body = await response.json();
  return { ...body, approvalCode: new URL(body.verificationUrl).searchParams.get("code") };
}
async function approve(connection: { requestId: string; approvalCode: string }, scopes?: string, workspaceId?: string) {
  return approveConnection(connectionRequest("approve", { requestId: connection.requestId, approvalCode: connection.approvalCode, ...(scopes && { scopes }), ...(workspaceId && { workspaceId }) }));
}
function poll(connection: { requestId: string; deviceCode: string }) {
  return pollConnection(connectionRequest("poll", { requestId: connection.requestId, deviceCode: connection.deviceCode }));
}
function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
}

describe("REST action routes", () => {
  it.each([undefined, "unknown-fixture-key"])("rejects unauthenticated reads and writes (%s)", async token => {
    expect((await postAction(actionRequest("POST", token, report))).status).toBe(401);
    expect((await getActions(actionRequest("GET", token))).status).toBe(401);
    expect(await fixture.db.action.count()).toBe(0);
    expect(await fixture.db.agent.count()).toBe(0);
  });

  it("enforces read and write scopes independently", async () => {
    const reader = await createKey();
    await fixture.db.apiKey.update({ where: { id: reader.id }, data: { scopes: ACTION_READ_SCOPE } });
    expect((await postAction(actionRequest("POST", reader.key, report))).status).toBe(403);
    expect((await getActions(actionRequest("GET", reader.key))).status).toBe(200);
    const writer = await createKey();
    await fixture.db.apiKey.update({ where: { id: writer.id }, data: { scopes: ACTION_WRITE_SCOPE } });
    expect((await getActions(actionRequest("GET", writer.key))).status).toBe(403);
    expect((await postAction(actionRequest("POST", writer.key, report))).status).toBe(201);
  });

  it("rejects revoked keys for both methods", async () => {
    const key = await createKey();
    await fixture.db.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    expect((await postAction(actionRequest("POST", key.key, report))).status).toBe(401);
    expect((await getActions(actionRequest("GET", key.key))).status).toBe(401);
    expect(await fixture.db.action.count()).toBe(0);
  });

  it.each([{ ...report, summary: "" }, { ...report, workspaceId: "foreign-workspace" }])("rejects invalid or forged payloads without storing them", async input => {
    const key = await createKey();
    const response = await postAction(actionRequest("POST", key.key, input));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: "Invalid action" });
    expect(await fixture.db.action.count()).toBe(0);
  });

  it("returns a useful 400 for malformed JSON", async () => {
    const key = await createKey();
    const response = await postAction(new NextRequest(`${origin}/api/actions`, {
      method: "POST", headers: { Authorization: `Bearer ${key.key}`, "Content-Type": "application/json" }, body: "{",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Request body must be valid JSON" });
    expect(await fixture.db.action.count()).toBe(0);
  });

  it("assigns workspace, agent, person, and provenance from the credential", async () => {
    const key = await createKey();
    const foreign = await createKey("foreign-workspace", "route-outsider");
    const foreignAgent = await fixture.db.apiKey.findUniqueOrThrow({ where: { id: foreign.id } });
    const response = await postAction(actionRequest("POST", key.key, {
      ...report, agentId: foreignAgent.agentId, source: "verified",
    }, "?workspaceId=foreign-workspace"));
    expect(response.status).toBe(201);
    const body = await response.json();
    const storedKey = await fixture.db.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(await fixture.db.action.findUniqueOrThrow({ where: { id: body.id } })).toMatchObject({
      workspaceId: "route-workspace", agentId: storedKey.agentId, agentName: "Connected agent",
      reportedByKeyId: key.id, reportedByUserId: "route-owner", source: "self_reported",
    });
  });

  it("returns the original receipt on retry while keeping other workspaces separate", async () => {
    const key = await createKey();
    const first = await postAction(actionRequest("POST", key.key, report));
    const firstBody = await first.json();
    const retry = await postAction(actionRequest("POST", key.key, { ...report, summary: "Changed retry text" }));
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ success: true, id: firstBody.id, duplicate: true });
    expect((await fixture.db.action.findUniqueOrThrow({ where: { id: firstBody.id } })).summary).toBe(report.summary);
    const foreign = await createKey("foreign-workspace", "route-outsider");
    const other = await postAction(actionRequest("POST", foreign.key, report));
    expect(other.status).toBe(201);
    expect((await other.json()).id).not.toBe(firstBody.id);
    expect(await fixture.db.action.count()).toBe(2);
  });

  it("filters and sorts only the authenticated workspace's actions", async () => {
    const key = await createKey();
    for (const [externalId, system, occurredAt] of [
      ["earlier", "Email", "2026-10-01T12:00:00Z"],
      ["later", "Email", "2026-10-02T12:00:00Z"],
      ["other-system", "Calendar", "2026-10-03T12:00:00Z"],
    ]) expect((await postAction(actionRequest("POST", key.key, { ...report, externalId, system, occurredAt }))).status).toBe(201);
    const foreign = await createKey("foreign-workspace", "route-outsider");
    await postAction(actionRequest("POST", foreign.key, { ...report, externalId: "foreign", occurredAt: "2026-10-04T12:00:00Z" }));
    const response = await getActions(actionRequest("GET", key.key, undefined, "?workspaceId=foreign-workspace&system=Email&category=communication&status=completed&search=message"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.actions.map((action: { externalId: string }) => action.externalId)).toEqual(["later", "earlier"]);
    expect(body.actions.every((action: { workspaceId: string }) => action.workspaceId === "route-workspace")).toBe(true);
  });

  it("preserves single-user ingestion and server-owned provenance", async () => {
    vi.stubEnv("MONOLOGUE_MODE", "single-user");
    vi.stubEnv("MONOLOGUE_API_KEY", "synthetic-local-ingestion-key");
    const response = await postAction(actionRequest("POST", "synthetic-local-ingestion-key", { ...report, source: "observed" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(await fixture.db.action.findUniqueOrThrow({ where: { id: body.id } })).toMatchObject({
      workspaceId: "local", agentName: report.agentName, source: "self_reported", reportedByKeyId: null, reportedByUserId: null,
    });
    expect((await getActions(actionRequest("GET", "synthetic-local-ingestion-key"))).status).toBe(200);
  });
});

describe("automatic agent connection routes", () => {
  it("keeps automatic connection unavailable in single-user mode", async () => {
    vi.stubEnv("MONOLOGUE_MODE", "single-user");
    for (const handler of [requestConnection, approveConnection, pollConnection]) {
      const response = await handler(connectionRequest("request", {}));
      expect(response.status).toBe(404);
      expectPrivate(response);
    }
    expect(await fixture.db.agentConnection.count()).toBe(0);
  });

  it("uses the configured verification origin and stores only hashed codes", async () => {
    const connection = await startConnection();
    const verification = new URL(connection.verificationUrl);
    expect(verification.origin).toBe("https://configured.example.test");
    expect(verification.pathname).toBe("/connect");
    expect(verification.searchParams.get("request")).toBe(connection.requestId);
    expect(connection).toMatchObject({ expiresIn: 600, interval: 2 });
    expect(connection.apiKey).toBeUndefined();
    const stored = await fixture.db.agentConnection.findUniqueOrThrow({ where: { id: connection.requestId } });
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    expect(stored).toMatchObject({ deviceCodeHash: hash(connection.deviceCode), approvalCodeHash: hash(connection.approvalCode), status: "pending" });
    expect(await fixture.db.apiKey.count()).toBe(0);
    expectPrivate(await poll(connection));
  });

  it("rejects malformed JSON and untrusted fields before creating a request", async () => {
    for (const input of [{ agentName: "" }, { agentName: "Fixture", workspaceId: "foreign-workspace" }]) {
      expect((await requestConnection(connectionRequest("request", input))).status).toBe(400);
    }
    expect((await requestConnection(new Request(`${origin}/api/connect/request`, { method: "POST", body: "{" }))).status).toBe(400);
    expect(await fixture.db.agentConnection.count()).toBe(0);
  });

  it("returns pending, then a usable key exactly once after explicit approval", async () => {
    const connection = await startConnection();
    const pending = await poll(connection);
    expect(pending.status).toBe(202);
    expect(await pending.json()).toEqual({ success: false, status: "authorization_pending" });
    expect(await fixture.db.apiKey.count()).toBe(0);
    const approval = await approve(connection, DEFAULT_AGENT_SCOPES);
    expect(approval.status).toBe(200);
    expect(await approval.json()).toEqual({ success: true, status: "approved" });
    expectPrivate(approval);
    expect(await fixture.db.apiKey.count()).toBe(0);
    const claimed = await poll(connection);
    expect(claimed.status).toBe(200);
    expectPrivate(claimed);
    const body = await claimed.json();
    expect(body).toMatchObject({ success: true, status: "connected", agentName: "Route agent" });
    expect(await fixture.db.apiKey.findUniqueOrThrow({ where: { id: body.keyId } })).toMatchObject({
      workspaceId: "route-workspace", createdByUserId: "route-owner", scopes: DEFAULT_AGENT_SCOPES,
      keyHash: createHash("sha256").update(body.apiKey).digest("hex"),
    });
    expect((await postAction(actionRequest("POST", body.apiKey, report))).status).toBe(201);
    expect((await getActions(actionRequest("GET", body.apiKey))).status).toBe(200);
    const repeated = await poll(connection);
    expect(repeated.status).toBe(410);
    expect(await repeated.json()).toMatchObject({ status: "claimed" });
    expect((await approve(connection)).status).toBe(409);
    expect(await fixture.db.apiKey.count()).toBe(1);
  });

  it("preserves reporting-only permissions for older approval forms", async () => {
    const connection = await startConnection();
    expect((await approve(connection)).status).toBe(200);
    const { apiKey } = await (await poll(connection)).json();
    expect((await postAction(actionRequest("POST", apiKey, report))).status).toBe(201);
    expect((await getActions(actionRequest("GET", apiKey))).status).toBe(403);
  });

  it("requires a session, same-origin approval, and access to the explicit destination", async () => {
    const connection = await startConnection();
    fixture.context.mockResolvedValueOnce(null);
    expect((await approve(connection)).status).toBe(401);
    expect((await approveConnection(connectionRequest("approve", connection, { Origin: "https://foreign.example.test" }))).status).toBe(403);
    expect((await approve(connection, DEFAULT_AGENT_SCOPES, "foreign-workspace")).status).toBe(403);
    expect((await fixture.db.agentConnection.findUniqueOrThrow({ where: { id: connection.requestId } })).status).toBe("pending");
    expect(await fixture.db.apiKey.count()).toBe(0);
  });

  it("rejects unknown permissions and forged approval codes", async () => {
    const connection = await startConnection();
    expect((await approve(connection, "admin")).status).toBe(400);
    expect((await approve({ ...connection, approvalCode: "incorrect-fixture-code" })).status).toBe(404);
    expect((await fixture.db.agentConnection.findUniqueOrThrow({ where: { id: connection.requestId } })).status).toBe("pending");
  });

  it("distinguishes invalid polling requests, wrong codes, and expired links", async () => {
    const connection = await startConnection();
    expect((await pollConnection(connectionRequest("poll", { requestId: connection.requestId, deviceCode: "short" }))).status).toBe(400);
    const wrong = await poll({ ...connection, deviceCode: "x".repeat(43) });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toMatchObject({ status: "invalid" });
    await fixture.db.agentConnection.update({ where: { id: connection.requestId }, data: { expiresAt: new Date(0) } });
    expect((await approve(connection)).status).toBe(410);
    const expired = await poll(connection);
    expect(expired.status).toBe(410);
    expect(await expired.json()).toMatchObject({ status: "expired" });
    expect(await fixture.db.apiKey.count()).toBe(0);
  });

  it("binds the claimed key to the approved destination regardless of the active browser workspace", async () => {
    const shared = await createSharedWorkspace("route-owner", "Explicit destination");
    const connection = await startConnection();
    expect((await approve(connection, DEFAULT_AGENT_SCOPES, shared.id)).status).toBe(200);
    const body = await (await poll(connection)).json();
    expect((await postAction(actionRequest("POST", body.apiKey, report))).status).toBe(201);
    expect((await fixture.db.action.findFirstOrThrow()).workspaceId).toBe(shared.id);
    expect(fixture.context).toHaveBeenCalledTimes(1);
  });

  it("blocks future REST access and pending claims when a member is removed", async () => {
    const shared = await createSharedWorkspace("route-owner", "Removal fixture");
    await fixture.db.workspaceMember.create({ data: { workspaceId: shared.id, userId: "route-member" } });
    fixture.context.mockResolvedValue({ user: { id: "route-member" }, workspace: { id: shared.id } });
    const connected = await startConnection();
    await approve(connected, DEFAULT_AGENT_SCOPES);
    const { apiKey } = await (await poll(connected)).json();
    expect((await postAction(actionRequest("POST", apiKey, report))).status).toBe(201);
    const unclaimed = await startConnection();
    await approve(unclaimed, DEFAULT_AGENT_SCOPES);
    await removeWorkspaceMember(shared.id, "route-owner", "route-member");
    expect((await getActions(actionRequest("GET", apiKey))).status).toBe(401);
    expect((await postAction(actionRequest("POST", apiKey, { ...report, externalId: "after-removal" }))).status).toBe(401);
    expect((await poll(unclaimed)).status).toBe(410);
    expect(await fixture.db.apiKey.count()).toBe(1);
    expect(await fixture.db.action.count()).toBe(1);
  });
});
