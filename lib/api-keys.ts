import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { isCloudMode, LOCAL_WORKSPACE_ID } from "./runtime";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createWorkspaceApiKey(workspaceId: string, name: string) {
  const key = `mlg_live_${randomBytes(24).toString("base64url")}`;
  const record = await db.apiKey.create({
    data: { workspaceId, name: name.trim() || "My agent", prefix: key.slice(0, 16), keyHash: hashKey(key) },
  });
  return { id: record.id, key, prefix: record.prefix, name: record.name, createdAt: record.createdAt };
}

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return null;

  if (!isCloudMode()) {
    const configured = process.env.MONOLOGUE_API_KEY;
    return configured && safeEqual(token, configured) ? { workspaceId: LOCAL_WORKSPACE_ID, keyId: null } : null;
  }

  const key = await db.apiKey.findUnique({ where: { keyHash: hashKey(token) } });
  if (!key || key.revokedAt) return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { workspaceId: key.workspaceId, keyId: key.id };
}
