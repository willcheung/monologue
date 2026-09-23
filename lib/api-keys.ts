import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { isCloudMode, LOCAL_WORKSPACE_ID } from "./runtime";

export const ACTION_READ_SCOPE = "actions:read";
export const ACTION_WRITE_SCOPE = "actions:write";
export const LEGACY_AGENT_SCOPES = `${ACTION_READ_SCOPE} ${ACTION_WRITE_SCOPE}`;

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

type ApiKeyOptions = {
  agentId?: string;
  createdByUserId?: string;
  scopes?: string;
};

export function prepareWorkspaceApiKey(workspaceId: string, name: string, options: ApiKeyOptions = {}) {
  const key = `mlg_live_${randomBytes(24).toString("base64url")}`;
  const normalizedName = name.trim() || "My agent";
  return {
    key,
    data: {
      workspaceId,
      name: normalizedName,
      prefix: key.slice(0, 16),
      keyHash: hashKey(key),
      scopes: options.scopes ?? LEGACY_AGENT_SCOPES,
      agentId: options.agentId,
      createdByUserId: options.createdByUserId,
    },
  };
}

export async function createWorkspaceAgentApiKey(workspaceId: string, name: string, createdByUserId: string) {
  return db.$transaction(async (transaction) => {
    const normalizedName = name.trim() || "My agent";
    const existing = await transaction.agent.findFirst({
      where: { workspaceId, name: normalizedName },
      orderBy: { createdAt: "asc" },
    });
    const agent = existing ?? await transaction.agent.create({
      data: { workspaceId, name: normalizedName, connectedByUserId: createdByUserId },
    });
    const prepared = prepareWorkspaceApiKey(workspaceId, agent.name, {
      agentId: agent.id,
      createdByUserId,
    });
    const record = await transaction.apiKey.create({ data: prepared.data });
    return { id: record.id, key: prepared.key, prefix: record.prefix, name: record.name, createdAt: record.createdAt };
  });
}

export function hasApiScope(credential: { scopes: string }, scope: string) {
  return credential.scopes.split(/\s+/).includes(scope);
}

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return null;

  if (!isCloudMode()) {
    const configured = process.env.MONOLOGUE_API_KEY;
    return configured && safeEqual(token, configured)
      ? { workspaceId: LOCAL_WORKSPACE_ID, keyId: null, agentId: null, agentName: null, scopes: LEGACY_AGENT_SCOPES }
      : null;
  }

  const key = await db.apiKey.findUnique({
    where: { keyHash: hashKey(token) },
    include: { agent: { select: { id: true, name: true } } },
  });
  if (!key || key.revokedAt) return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return {
    workspaceId: key.workspaceId,
    keyId: key.id,
    agentId: key.agent?.id ?? null,
    agentName: key.agent?.name ?? key.name,
    scopes: key.scopes,
  };
}
