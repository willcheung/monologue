import { db } from "./db";
import { requireWorkspaceAccess } from "./workspace-access";
import { mcpResource } from "./mcp-oauth";

export async function listBriefingConnections(workspaceId: string, userId: string, now = new Date()) {
  await requireWorkspaceAccess(db, workspaceId, userId);
  const keys = await db.apiKey.findMany({
    where: { workspaceId, createdByUserId: userId, prefix: "OAuth connection", revokedAt: null,
      oauthTokens: { some: { resource: mcpResource(), rotatedAt: null, refreshExpiresAt: { gt: now } } } },
    select: { name: true, scopes: true },
  });
  return [...new Set(keys.filter(key => key.scopes.split(/\s+/).includes("actions:read")).map(key => key.name))];
}
