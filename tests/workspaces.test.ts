import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const fixture = vi.hoisted(() => ({ db: undefined as unknown as PrismaClient }));
vi.mock("@/lib/db", () => ({ get db() { return fixture.db; } }));
vi.mock("server-only", () => ({}));
import { getAccessibleAgentWorkspaceId, listAgentSummaries, listMyAgentSummaries } from "@/lib/agents";
import { acceptWorkspaceInvitation, createSharedWorkspace, ensurePersonalWorkspace, inviteWorkspaceMember, listWorkspaces, removeWorkspaceMember } from "@/lib/workspace-service";
import { credentialMembershipValid, workspaceAccess } from "@/lib/workspace-access";
import { authenticateApiRequest, createWorkspaceAgentApiKey } from "@/lib/api-keys";
import { approveAgentConnection, claimAgentConnection, createAgentConnection } from "@/lib/agent-connections";
import { createAction } from "@/lib/actions";
import { dailyWorkspaceReport, saveReportSettings } from "@/lib/workspace-reports";
import { isWorkspaceDev } from "@/lib/runtime";
import { requireSameOrigin } from "@/lib/workspace-http";
import { listBriefingConnections } from "@/lib/briefing-connections";
import { mcpResource } from "@/lib/mcp-oauth";

let directory: string;
beforeAll(async () => {
  vi.stubEnv("MONOLOGUE_MODE", "cloud");
  directory = mkdtempSync(path.join(tmpdir(), "monologue-workspace-test-"));
  const url = `file:${path.join(directory, "test.db")}`;
  fixture.db = process.env.MCP_TEST_LIBSQL === "1" ? new PrismaClient({ adapter: new PrismaLibSQL({ url }) }) : new PrismaClient({ datasourceUrl: url });
  const migrations = readdirSync("prisma/migrations").filter(name => name !== "migration_lock.toml").sort();
  for (const name of migrations) {
    if (name === "20261004000000_workspaces") {
      await fixture.db.$executeRawUnsafe('INSERT INTO "user" (id,name,email,emailVerified,updatedAt) VALUES (\'legacy-owner\',\'Legacy\',\'legacy@example.test\',1,CURRENT_TIMESTAMP)');
      await fixture.db.$executeRawUnsafe('INSERT INTO "Workspace" (id,name,ownerId,updatedAt) VALUES (\'legacy-workspace\',\'Existing feed\',\'legacy-owner\',CURRENT_TIMESTAMP)');
    }
    for (const statement of readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8").split(";").map(value => value.trim()).filter(Boolean)) await fixture.db.$executeRawUnsafe(statement);
  }
  for (const id of ["owner", "member", "third", "outsider", "unverified"]) await fixture.db.user.create({ data: { id, name: id, email: `${id}@example.test`, emailVerified: id !== "unverified" } });
});
afterAll(async () => { await fixture.db.$disconnect(); rmSync(directory, { recursive: true, force: true }); vi.unstubAllEnvs(); });
const report = { source: "self_reported" as const, agentName: "Codex", verb: "Sent", summary: "Fixture: sent a customer message", category: "communication" as const, status: "completed" as const, system: "Email", externalId: "same-action-id" };
const bearer = (key: string) => new Request("http://localhost/api/actions", { headers: { Authorization: `Bearer ${key}` } });
const settings = { emailEnabled: true, slackEnabled: true, slackChannel: "#updates", hour: 9, timeZone: "America/Los_Angeles" };

describe("shared workspaces", () => {
  it("backfills existing personal ownership without moving its feed", async () => {
    const workspace = await ensurePersonalWorkspace("legacy-owner");
    expect(workspace).toMatchObject({ id: "legacy-workspace", name: "Existing feed", kind: "personal", personalOwnerId: "legacy-owner" });
    expect(await fixture.db.workspaceMember.findFirst({ where: { workspaceId: workspace.id, userId: "legacy-owner" } })).toMatchObject({ role: "owner" });
  });
  it("allows multiple shared workspaces while preserving one personal workspace", async () => {
    const personal = await ensurePersonalWorkspace("owner");
    expect((await ensurePersonalWorkspace("owner")).id).toBe(personal.id);
    await createSharedWorkspace("owner", "First team"); await createSharedWorkspace("owner", "Second team");
    expect((await listWorkspaces("owner")).filter(workspace => workspace.kind === "shared")).toHaveLength(2);
    expect(await workspaceAccess(fixture.db, personal.id, "member")).toBeNull();
  });
  it("reserves three free seats including the owner and pending invitations", async () => {
    const workspace = await createSharedWorkspace("owner", "Seat test");
    await inviteWorkspaceMember(workspace.id, "owner", "member@example.test");
    await inviteWorkspaceMember(workspace.id, "owner", "third@example.test");
    await expect(inviteWorkspaceMember(workspace.id, "owner", "outsider@example.test")).rejects.toThrow("reserved all 3 seats");
    expect(await fixture.db.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(1);
  });
  it("does not oversubscribe seats during concurrent invitation requests", async () => {
    const workspace = await createSharedWorkspace("owner", "Concurrent seats");
    await inviteWorkspaceMember(workspace.id, "owner", "member@example.test");
    const results = await Promise.allSettled([inviteWorkspaceMember(workspace.id, "owner", "third@example.test"), inviteWorkspaceMember(workspace.id, "owner", "outsider@example.test")]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await fixture.db.workspaceInvitation.count({ where: { workspaceId: workspace.id } })).toBe(2);
  }, 15000);
  it("binds invitations to a verified email and preserves personal privacy", async () => {
    const workspace = await createSharedWorkspace("owner", "Email-bound team");
    const { invitation, token } = await inviteWorkspaceMember(workspace.id, "owner", "MEMBER@example.test");
    expect(invitation.tokenHash).not.toBe(token);
    await expect(acceptWorkspaceInvitation("outsider", "outsider@example.test", token)).rejects.toThrow("Sign in with the email");
    await acceptWorkspaceInvitation("member", "member@example.test", token);
    expect(await workspaceAccess(fixture.db, workspace.id, "member")).toMatchObject({ role: "member" });
    expect((await listWorkspaces("member")).some(item => item.id === workspace.id)).toBe(true);
    const personal = await ensurePersonalWorkspace("owner");
    expect((await listWorkspaces("member")).some(item => item.id === personal.id)).toBe(false);
    expect(await workspaceAccess(fixture.db, workspace.id, "outsider")).toBeNull();
  });
  it("rejects unverified, cancelled, expired and replayed-after-removal invitations", async () => {
    const workspace = await createSharedWorkspace("owner", "Invite validity");
    const { token } = await inviteWorkspaceMember(workspace.id, "owner", "unverified@example.test");
    await expect(acceptWorkspaceInvitation("unverified", "unverified@example.test", token)).rejects.toThrow("Verify your email");
    const invited = await inviteWorkspaceMember(workspace.id, "owner", "member@example.test");
    await acceptWorkspaceInvitation("member", "member@example.test", invited.token);
    await removeWorkspaceMember(workspace.id, "owner", "member");
    await expect(acceptWorkspaceInvitation("member", "member@example.test", invited.token)).rejects.toThrow("already been used");
    await fixture.db.workspaceInvitation.update({ where: { id: invited.invitation.id }, data: { cancelledAt: new Date() } });
    await expect(acceptWorkspaceInvitation("member", "member@example.test", invited.token)).rejects.toThrow("expired or was cancelled");
    await fixture.db.workspaceInvitation.update({ where: { id: invited.invitation.id }, data: { cancelledAt: null, expiresAt: new Date(0) } });
    await expect(acceptWorkspaceInvitation("member", "member@example.test", invited.token)).rejects.toThrow("expired or was cancelled");
  });
  it("does not let members manage membership or remove the owner", async () => {
    const workspace = await createSharedWorkspace("owner", "Owner management");
    await fixture.db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: "member" } });
    await expect(inviteWorkspaceMember(workspace.id, "member", "third@example.test")).rejects.toThrow("don't have access");
    await expect(removeWorkspaceMember(workspace.id, "member", "owner")).rejects.toThrow("don't have access");
    await expect(removeWorkspaceMember(workspace.id, "owner", "owner")).rejects.toThrow("owner cannot be removed");
  });
  it("keeps same-named assistants and retry deduplication separate by person", async () => {
    const workspace = await createSharedWorkspace("owner", "Identity test");
    await fixture.db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: "member" } });
    const ownerKey = await createWorkspaceAgentApiKey(workspace.id, "Codex", "owner");
    const memberKey = await createWorkspaceAgentApiKey(workspace.id, "Codex", "member");
    const a = (await authenticateApiRequest(bearer(ownerKey.key)))!;
    const b = (await authenticateApiRequest(bearer(memberKey.key)))!;
    expect(a.agentId).not.toBe(b.agentId);
    const first = await createAction({ ...report, agentId: a.agentId! }, workspace.id, a.keyId);
    const second = await createAction({ ...report, agentId: b.agentId! }, workspace.id, b.keyId);
    expect(second.action.id).not.toBe(first.action.id);
    expect(first.action.reportedByUserId).toBe("owner"); expect(second.action.reportedByUserId).toBe("member");
    expect((await createAction({ ...report, agentId: a.agentId! }, workspace.id, a.keyId)).duplicate).toBe(true);
    expect((await authenticateApiRequest(bearer(memberKey.key)))!.workspaceId).toBe(workspace.id);
  });
  it("revokes removed members' keys and pending claims without deleting history", async () => {
    const workspace = await createSharedWorkspace("owner", "Removal test");
    await fixture.db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: "member" } });
    const key = await createWorkspaceAgentApiKey(workspace.id, "Codex", "member");
    const credential = (await authenticateApiRequest(bearer(key.key)))!;
    const action = await createAction({ ...report, agentId: credential.agentId! }, workspace.id, credential.keyId);
    const pending = await createAgentConnection({ agentName: "Codex", platform: "Codex", skillVersion: "1.2.12" });
    await approveAgentConnection(pending.connection.id, pending.approvalCode, workspace.id, "member");
    await removeWorkspaceMember(workspace.id, "owner", "member");
    expect(await authenticateApiRequest(bearer(key.key))).toBeNull();
    expect(await credentialMembershipValid(fixture.db, { workspaceId: workspace.id, createdByUserId: "member" })).toBe(false);
    expect((await claimAgentConnection(pending.connection.id, pending.deviceCode)).status).not.toBe("connected");
    expect(await fixture.db.action.findUnique({ where: { id: action.action.id } })).toMatchObject({ reportedByUserId: "member" });
    expect(await workspaceAccess(fixture.db, workspace.id, "member")).toBeNull();
  });
  it("lets members connect their own agents but rejects outsiders", async () => {
    const workspace = await createSharedWorkspace("owner", "Member connection");
    await fixture.db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: "member" } });
    const pending = await createAgentConnection({ agentName: "Codex", platform: "Codex", skillVersion: "1.2.12" });
    await expect(approveAgentConnection(pending.connection.id, pending.approvalCode, workspace.id, "outsider")).rejects.toThrow("don't have access");
    await approveAgentConnection(pending.connection.id, pending.approvalCode, workspace.id, "member");
    expect((await claimAgentConnection(pending.connection.id, pending.deviceCode)).status).toBe("connected");
  });
  it("enforces paid reports and owner-only settings on the server", async () => {
    const workspace = await createSharedWorkspace("owner", "Paid report settings");
    await fixture.db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: "member" } });
    await expect(saveReportSettings(workspace.id, "owner", settings)).rejects.toThrow("Workspace Plus");
    await fixture.db.workspace.update({ where: { id: workspace.id }, data: { plan: "plus" } });
    await expect(saveReportSettings(workspace.id, "member", settings)).rejects.toThrow("don't have access");
    await expect(saveReportSettings(workspace.id, "owner", { ...settings, timeZone: "invalid-timezone" })).rejects.toThrow("valid time");
    expect(await saveReportSettings(workspace.id, "owner", settings)).toMatchObject(settings);
  });
  it("includes only the selected workspace's daily activity and original person", async () => {
    const workspace = await createSharedWorkspace("owner", "Report isolation");
    const key = await createWorkspaceAgentApiKey(workspace.id, "Codex", "owner");
    const credential = (await authenticateApiRequest(bearer(key.key)))!;
    const action = await createAction({ ...report, agentId: credential.agentId! }, workspace.id, key.id);
    const reportResult = await dailyWorkspaceReport(workspace.id, new Date(Date.now()+1000));
    expect(reportResult.actions.map(row => row.id)).toEqual([action.action.id]);
    expect(reportResult.actions[0].reportedByUser?.name).toBe("owner");
    expect(reportResult.people).toBe(1);
  });
  it("lists a person's agents across accessible workspaces without including teammates or other accounts", async () => {
    const personal = await ensurePersonalWorkspace("member");
    const shared = await createSharedWorkspace("owner", "Cross-workspace agents");
    await fixture.db.workspaceMember.create({ data: { workspaceId: shared.id, userId: "member" } });
    const ownPersonalKey = await createWorkspaceAgentApiKey(personal.id, "Personal helper", "member");
    const ownSharedKey = await createWorkspaceAgentApiKey(shared.id, "Team helper", "member");
    const teammateKey = await createWorkspaceAgentApiKey(shared.id, "Teammate helper", "owner");
    const ownPersonal = (await authenticateApiRequest(bearer(ownPersonalKey.key)))!;
    const ownShared = (await authenticateApiRequest(bearer(ownSharedKey.key)))!;
    const teammate = (await authenticateApiRequest(bearer(teammateKey.key)))!;
    await createAction({ ...report, agentId: ownPersonal.agentId!, system: "Calendar" }, personal.id, ownPersonal.keyId);
    await createAction({ ...report, agentId: ownShared.agentId!, system: "Email" }, shared.id, ownShared.keyId);
    await createAction({ ...report, agentId: teammate.agentId!, system: "Teammate-only system" }, shared.id, teammate.keyId);
    const legacy = await fixture.db.agent.create({ data: { workspaceId: personal.id, name: "Legacy personal helper" } });
    const outside = await createSharedWorkspace("outsider", "Inaccessible former team");
    const former = await fixture.db.agent.create({ data: { workspaceId: outside.id, name: "Former helper", connectedByUserId: "member" } });
    const sharedRoster = await listAgentSummaries(shared.id);
    expect(sharedRoster.map(row => row.id).sort()).toEqual([ownShared.agentId!, teammate.agentId!].sort());
    expect(sharedRoster.every(row => row.workspaceId === shared.id)).toBe(true);
    expect(sharedRoster.find(row => row.id === teammate.agentId)?.connectedByName).toBe("owner");
    const personalRoster = await listAgentSummaries(personal.id);
    expect(personalRoster.map(row => row.id).sort()).toEqual([ownPersonal.agentId!, legacy.id].sort());
    const rows = await listMyAgentSummaries("member");
    expect(rows.find(row => row.id === ownPersonal.agentId)).toMatchObject({ workspaceId: personal.id, actionCount: 1, systems: ["Calendar"] });
    expect(rows.find(row => row.id === ownShared.agentId)).toMatchObject({ workspaceId: shared.id, actionCount: 1, systems: ["Email"] });
    expect(rows.some(row => row.id === legacy.id)).toBe(true);
    expect(rows.some(row => row.id === teammate.agentId || row.id === former.id)).toBe(false);
    expect(await getAccessibleAgentWorkspaceId("member", ownPersonal.agentId!)).toBe(personal.id);
    expect(await getAccessibleAgentWorkspaceId("owner", ownPersonal.agentId!)).toBeNull();
    expect(await getAccessibleAgentWorkspaceId("member", former.id)).toBeNull();
  });
  it("removes a former workspace from account-wide agent listings and direct profile resolution", async () => {
    const shared = await createSharedWorkspace("owner", "Account listing removal");
    await fixture.db.workspaceMember.create({ data: { workspaceId: shared.id, userId: "member" } });
    const key = await createWorkspaceAgentApiKey(shared.id, "Removed member helper", "member");
    const credential = (await authenticateApiRequest(bearer(key.key)))!;
    expect((await listMyAgentSummaries("member")).some(row => row.id === credential.agentId)).toBe(true);
    expect(await getAccessibleAgentWorkspaceId("member", credential.agentId!)).toBe(shared.id);
    await removeWorkspaceMember(shared.id, "owner", "member");
    expect((await listMyAgentSummaries("member")).some(row => row.id === credential.agentId)).toBe(false);
    expect(await getAccessibleAgentWorkspaceId("member", credential.agentId!)).toBeNull();
    expect(await fixture.db.agent.findUnique({ where: { id: credential.agentId! } })).not.toBeNull();
  });
  it("shows only the current person's live MCP read connections for this workspace", async () => {
    const workspace = await createSharedWorkspace("owner", "Briefing access");
    const other = await createSharedWorkspace("owner", "Other briefing workspace");
    await fixture.db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: "member" } });
    const now = new Date();
    await fixture.db.mcpOAuthClient.create({ data: { id: "briefing-client", name: "Fixture client", redirectUris: ["http://localhost/callback"], authMethod: "none" } });
    async function connection(name: string, userId = "owner", workspaceId = workspace.id, options: { scopes?: string; expired?: boolean; revoked?: boolean; rotated?: boolean; rest?: boolean; resource?: string } = {}) {
      const key = await createWorkspaceAgentApiKey(workspaceId, name, userId);
      await fixture.db.apiKey.update({ where: { id: key.id }, data: { prefix: options.rest ? "REST connection" : "OAuth connection", scopes: options.scopes ?? "actions:read", revokedAt: options.revoked ? now : null } });
      await fixture.db.mcpOAuthToken.create({ data: { keyId: key.id, clientId: "briefing-client", accessHash: `fixture-access-${name}`, refreshHash: `fixture-refresh-${name}`, resource: options.resource ?? mcpResource(), expiresAt: new Date(now.getTime() + 60000), refreshExpiresAt: new Date(now.getTime() + (options.expired ? -60000 : 60000)), rotatedAt: options.rotated ? now : null } });
    }
    await connection("Own reader");
    await connection("Teammate reader", "member");
    await connection("Other workspace reader", "owner", other.id);
    await connection("Reporting only", "owner", workspace.id, { scopes: "actions:write" });
    await connection("Revoked reader", "owner", workspace.id, { revoked: true });
    await connection("Expired reader", "owner", workspace.id, { expired: true });
    await connection("Rotated reader", "owner", workspace.id, { rotated: true });
    await connection("REST reader", "owner", workspace.id, { rest: true });
    await connection("Different instance", "owner", workspace.id, { resource: "https://other.example.test/mcp" });
    expect(await listBriefingConnections(workspace.id, "owner", now)).toEqual(["Own reader"]);
    expect(await listBriefingConnections(workspace.id, "member", now)).toEqual(["Teammate reader"]);
    await expect(listBriefingConnections(workspace.id, "outsider", now)).rejects.toThrow("don't have access");
  });
});

describe("development and mutation boundaries", () => {
  it("rejects cross-site mutations", () => {
    expect(() => requireSameOrigin(new Request("http://localhost/api/workspaces", { headers: { Origin: "https://attacker.example" } }))).toThrow("origin");
  });
  it("disables sample-account impersonation outside isolated loopback development", () => {
    vi.stubEnv("MONOLOGUE_WORKSPACE_DEV", "1"); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100"); vi.stubEnv("DATABASE_URL", "file:/tmp/dev.db"); vi.stubEnv("TURSO_DATABASE_URL", ""); vi.stubEnv("TURSO_AUTH_TOKEN", ""); vi.stubEnv("VERCEL", "");
    expect(isWorkspaceDev()).toBe(true);
    vi.stubEnv("NODE_ENV", "production"); expect(isWorkspaceDev()).toBe(false);
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("TURSO_DATABASE_URL", "libsql://example.test"); expect(isWorkspaceDev()).toBe(false);
    vi.stubEnv("TURSO_DATABASE_URL", ""); vi.stubEnv("BETTER_AUTH_URL", "https://example.test"); expect(isWorkspaceDev()).toBe(false);
    vi.unstubAllEnvs();
  });
});
