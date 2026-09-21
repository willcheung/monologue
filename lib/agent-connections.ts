import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { prepareWorkspaceApiKey } from "./api-keys";

const CONNECTION_LIFETIME_MS = 10 * 60 * 1000;
export const CONNECTION_POLL_INTERVAL_SECONDS = 2;

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function safeSecretMatch(secret: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(secret));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createAgentConnection(agentName: string) {
  const deviceCode = randomBytes(32).toString("base64url");
  const approvalCode = randomBytes(24).toString("base64url");
  const connection = await db.agentConnection.create({
    data: {
      agentName: agentName.trim(),
      deviceCodeHash: hashSecret(deviceCode),
      approvalCodeHash: hashSecret(approvalCode),
      expiresAt: new Date(Date.now() + CONNECTION_LIFETIME_MS),
    },
  });
  return { connection, deviceCode, approvalCode };
}

export async function getAgentConnectionForApproval(id: string, approvalCode: string) {
  const connection = await db.agentConnection.findUnique({ where: { id } });
  if (!connection || !safeSecretMatch(approvalCode, connection.approvalCodeHash)) return null;
  return connection;
}

export async function approveAgentConnection(id: string, approvalCode: string, workspaceId: string) {
  const connection = await getAgentConnectionForApproval(id, approvalCode);
  if (!connection) return { status: "invalid" as const };
  if (connection.expiresAt <= new Date()) return { status: "expired" as const };
  if (connection.status === "claimed") return { status: "claimed" as const };
  if (connection.status === "approved") {
    return connection.workspaceId === workspaceId
      ? { status: "approved" as const }
      : { status: "invalid" as const };
  }

  const result = await db.agentConnection.updateMany({
    where: { id, status: "pending", workspaceId: null },
    data: { status: "approved", workspaceId, approvedAt: new Date() },
  });
  return result.count ? { status: "approved" as const } : { status: "invalid" as const };
}

export async function claimAgentConnection(id: string, deviceCode: string) {
  return db.$transaction(async (transaction) => {
    const connection = await transaction.agentConnection.findUnique({ where: { id } });
    if (!connection || !safeSecretMatch(deviceCode, connection.deviceCodeHash)) {
      return { status: "invalid" as const };
    }
    if (connection.expiresAt <= new Date()) return { status: "expired" as const };
    if (connection.status === "pending") return { status: "pending" as const };
    if (connection.status !== "approved" || !connection.workspaceId) {
      return { status: "claimed" as const };
    }

    const claimed = await transaction.agentConnection.updateMany({
      where: { id, status: "approved", workspaceId: connection.workspaceId },
      data: { status: "claimed", claimedAt: new Date() },
    });
    if (!claimed.count) return { status: "claimed" as const };

    const prepared = prepareWorkspaceApiKey(connection.workspaceId, connection.agentName);
    const key = await transaction.apiKey.create({ data: prepared.data });
    return {
      status: "connected" as const,
      key: prepared.key,
      keyId: key.id,
      agentName: connection.agentName,
    };
  });
}
