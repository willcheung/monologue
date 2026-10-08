import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";

export function invitationToken(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}

// A valid invitation permits only this small welcome preview, never feed access.
export async function getWorkspaceInvitationInfo(token: string | null) {
  if (!token) return null;
  const invitation = await db.workspaceInvitation.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    select: { id: true, email: true, expiresAt: true, acceptedAt: true, cancelledAt: true,
      workspace: { select: { id: true, name: true, kind: true } },
      invitedByUser: { select: { name: true } } },
  });
  if (!invitation || invitation.workspace.kind !== "shared" || invitation.cancelledAt || invitation.expiresAt <= new Date()) return null;
  return invitation;
}
