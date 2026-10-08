import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
const workspaceMigration = "20261004000000_workspaces";
const fixtures: { client: Client; directory: string }[] = [];
afterEach(() => { for (const fixture of fixtures.splice(0)) { fixture.client.close(); rmSync(fixture.directory, { recursive: true, force: true }); } });
async function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "monologue-rollout-"));
  const url = `file:${path.join(directory, "fixture.db")}`;
  const client = createClient({ url }); fixtures.push({ client, directory });
  await client.execute('CREATE TABLE "_monologue_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP)');
  for (const name of readdirSync("prisma/migrations").filter(name => name !== "migration_lock.toml" && name < workspaceMigration).sort()) {
    const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    await client.executeMultiple(sql);
    await client.execute({ sql: 'INSERT INTO "_monologue_migrations" (name,checksum) VALUES (?,?)', args: [name, createHash("sha256").update(sql).digest("hex")] });
  }
  await client.executeMultiple(`
    INSERT INTO user (id,name,email,emailVerified,updatedAt) VALUES ('legacy-owner','Legacy owner','owner@example.test',1,CURRENT_TIMESTAMP);
    INSERT INTO Workspace (id,name,ownerId,updatedAt) VALUES ('legacy-workspace','Existing feed','legacy-owner',CURRENT_TIMESTAMP);
    INSERT INTO Agent (id,workspaceId,name,connectedByUserId,updatedAt) VALUES ('legacy-agent','legacy-workspace','Existing agent','legacy-owner',CURRENT_TIMESTAMP);
    INSERT INTO ApiKey (id,workspaceId,name,prefix,keyHash,agentId,createdByUserId) VALUES ('legacy-key','legacy-workspace','Existing connection','fixture','synthetic-key-hash','legacy-agent','legacy-owner');
    INSERT INTO Action (id,workspaceId,agentName,agentId,verb,summary,category,status,system,reportedByKeyId,externalId) VALUES ('legacy-action','legacy-workspace','Existing agent','legacy-agent','sent','Synthetic fixture receipt','communication','completed','Fixture','legacy-key','fixture-receipt');
    INSERT INTO AgentConnection (id,agentName,deviceCodeHash,approvalCodeHash,status,workspaceId,approvedByUserId,expiresAt,approvedAt) VALUES ('legacy-approved','Existing agent','synthetic-device-hash','synthetic-approval-hash','approved','legacy-workspace','legacy-owner','2050-01-01',CURRENT_TIMESTAMP);
    INSERT INTO McpOAuthClient (id,name,redirectUris,authMethod) VALUES ('legacy-client','Fixture client','["https://example.test/callback"]','none');
    INSERT INTO McpOAuthToken (id,clientId,keyId,accessHash,refreshHash,resource,expiresAt,refreshExpiresAt) VALUES ('legacy-token','legacy-client','legacy-key','synthetic-access-hash','synthetic-refresh-hash','https://example.test/mcp','2050-01-01','2050-02-01');
  `);
  const run = () => execFileSync(process.execPath, ["--import", "tsx", "scripts/migrate-turso.ts"], { encoding: "utf8", env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: "synthetic-local-only" }, stdio: ["ignore", "pipe", "pipe"] });
  return { client, run };
}
describe("workspace migration rollout", () => {
  it("backfills existing ownership and attribution while preserving receipts and credentials, then safely reruns", async () => {
    const { client, run } = await fixture();
    expect(run()).toContain(`Applied ${workspaceMigration}`);
    expect((await client.execute("SELECT id,personalOwnerId FROM Workspace WHERE id='legacy-workspace'")).rows).toMatchObject([{ id: "legacy-workspace", personalOwnerId: "legacy-owner" }]);
    expect((await client.execute("SELECT id,personalOwnerId FROM Workspace WHERE id='local'")).rows).toMatchObject([{ id: "local", personalOwnerId: null }]);
    expect((await client.execute('SELECT userId,role FROM WorkspaceMember')).rows).toMatchObject([{ userId: "legacy-owner", role: "owner" }]);
    expect((await client.execute('SELECT id,workspaceId,reportedByUserId FROM Action')).rows).toMatchObject([{ id: "legacy-action", workspaceId: "legacy-workspace", reportedByUserId: "legacy-owner" }]);
    expect((await client.execute('SELECT keyHash FROM ApiKey')).rows).toMatchObject([{ keyHash: "synthetic-key-hash" }]);
    expect((await client.execute('SELECT accessHash,refreshHash FROM McpOAuthToken')).rows).toMatchObject([{ accessHash: "synthetic-access-hash", refreshHash: "synthetic-refresh-hash" }]);
    expect((await client.execute("SELECT approvedScopes FROM AgentConnection WHERE id='legacy-approved'")).rows).toMatchObject([{ approvedScopes: "actions:write" }]);
    expect(run()).toContain(`Already applied ${workspaceMigration}`);
    expect((await client.execute('SELECT COUNT(*) AS count FROM WorkspaceMember')).rows[0].count).toBe(1);
  });
  it("rolls back a failed migration and its receipt so repair and retry are possible", async () => {
    const { client, run } = await fixture();
    await client.execute('DROP INDEX Workspace_ownerId_key');
    expect(run).toThrow();
    expect((await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='WorkspaceMember'")).rows).toHaveLength(0);
    expect((await client.execute({ sql: 'SELECT name FROM _monologue_migrations WHERE name=?', args: [workspaceMigration] })).rows).toHaveLength(0);
    expect((await client.execute('SELECT id FROM Action')).rows).toMatchObject([{ id: "legacy-action" }]);
    await client.execute('CREATE UNIQUE INDEX Workspace_ownerId_key ON Workspace(ownerId)');
    expect(run()).toContain(`Applied ${workspaceMigration}`);
  });
  it("refuses changed applied migration receipts", async () => {
    const { client, run } = await fixture(); run();
    await client.execute({ sql: 'UPDATE _monologue_migrations SET checksum=? WHERE name=?', args: ["unexpected-checksum", workspaceMigration] });
    expect(run).toThrow();
    expect((await client.execute('SELECT COUNT(*) AS count FROM Action')).rows[0].count).toBe(1);
  });
});
