import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { memberLimit, requireWorkspaceAccess, WorkspaceError } from "./workspace-access";

export const hashInvitation = (token: string) => createHash("sha256").update(token).digest("hex");
export async function ensurePersonalWorkspace(userId: string) {
  return db.workspace.upsert({ where: { personalOwnerId: userId }, update: {}, create: {
    name: "Personal", ownerId: userId, personalOwnerId: userId, kind: "personal",
    members: { create: { userId, role: "owner" } },
  } });
}
export async function listWorkspaces(userId: string) {
  return db.workspace.findMany({ where: { OR: [{ ownerId: userId }, { kind: "shared", members: { some: { userId } } }] }, orderBy: [{ kind: "asc" }, { createdAt: "asc" }] });
}
export async function createSharedWorkspace(userId: string, name: string) {
  return db.workspace.create({ data: { name: name.trim(), ownerId: userId, kind: "shared", members: { create: { userId, role: "owner" } } } });
}
export async function inviteWorkspaceMember(workspaceId: string, userId: string, email: string) {
  const token = randomBytes(32).toString("base64url");
  return db.$transaction(async tx => {
    const { workspace } = await requireWorkspaceAccess(tx, workspaceId, userId, true);
    if (workspace.kind !== "shared") throw new WorkspaceError("Create a shared workspace to invite people.");
    // Acquire the write lock before checking/reserving seats, including pending invitations.
    await tx.workspace.update({ where: { id: workspaceId }, data: { membershipVersion: { increment: 1 } } });
    const normalized = email.trim().toLowerCase();
    const existingMember = await tx.workspaceMember.findFirst({ where: { workspaceId, user: { email: normalized } } });
    if (existingMember) throw new WorkspaceError("This person is already a member.");
    const pending = { workspaceId, acceptedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } };
    if (await tx.workspaceInvitation.findFirst({ where: { ...pending, email: normalized } })) throw new WorkspaceError("An invitation is already waiting for this person.");
    const members = await tx.workspaceMember.count({ where: { workspaceId } });
    const invites = await tx.workspaceInvitation.count({ where: pending });
    if (members + invites >= memberLimit(workspace.plan)) throw new WorkspaceError(`This workspace has reserved all ${memberLimit(workspace.plan)} seats. Cancel an invitation or remove a member to invite someone else.`, 409);
    const invitation = await tx.workspaceInvitation.create({ data: { workspaceId, email: normalized, invitedByUserId: userId, tokenHash: hashInvitation(token), expiresAt: new Date(Date.now()+7*86400000) } });
    return { invitation, token };
  });
}
export async function acceptWorkspaceInvitation(userId: string, email: string, token: string) {
  return db.$transaction(async tx => {
    const invitation = await tx.workspaceInvitation.findUnique({ where: { tokenHash: hashInvitation(token) }, include: { workspace: true } });
    if (!invitation || invitation.cancelledAt || invitation.expiresAt <= new Date()) throw new WorkspaceError("This invitation has expired or was cancelled.", 404);
    if (invitation.email !== email.trim().toLowerCase()) throw new WorkspaceError("Sign in with the email address this invitation was sent to.", 403);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.emailVerified) throw new WorkspaceError("Verify your email address before joining this workspace.", 403);
    await tx.workspace.update({ where: { id: invitation.workspaceId }, data: { membershipVersion: { increment: 1 } } });
    const existing = await tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } } });
    if (invitation.acceptedAt) {
      if (!existing) throw new WorkspaceError("This invitation has already been used.", 410);
      return invitation.workspace;
    }
    const count = await tx.workspaceMember.count({ where: { workspaceId: invitation.workspaceId } });
    if (!existing && count >= memberLimit(invitation.workspace.plan)) throw new WorkspaceError("This workspace has reached its member limit.", 409);
    if (!existing) await tx.workspaceMember.create({ data: { workspaceId: invitation.workspaceId, userId } });
    await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return invitation.workspace;
  });
}
export async function removeWorkspaceMember(workspaceId: string, userId: string, memberUserId: string) {
  await db.$transaction(async tx => {
    const { workspace } = await requireWorkspaceAccess(tx, workspaceId, userId, true);
    if (workspace.ownerId === memberUserId) throw new WorkspaceError("The owner cannot be removed.");
    await tx.workspace.update({ where: { id: workspaceId }, data: { membershipVersion: { increment: 1 } } });
    const removed = await tx.workspaceMember.deleteMany({ where: { workspaceId, userId: memberUserId } });
    if (!removed.count) throw new WorkspaceError("Member not found.", 404);
    await tx.apiKey.updateMany({ where: { workspaceId, createdByUserId: memberUserId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.agentConnection.updateMany({ where: { workspaceId, approvedByUserId: memberUserId, status: "approved" }, data: { status: "revoked" } });
  });
}
