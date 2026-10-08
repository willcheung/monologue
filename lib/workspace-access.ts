import type { Prisma, PrismaClient } from "@prisma/client";
export type WorkspaceDatabase = Prisma.TransactionClient | PrismaClient;

export class WorkspaceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function workspaceAccess(database: WorkspaceDatabase, workspaceId: string, userId: string) {
  const workspace = await database.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return null;
  if (workspace.ownerId === userId) return { workspace, role: "owner" as const };
  if (workspace.kind !== "shared") return null;
  const member = await database.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  return member ? { workspace, role: "member" as const } : null;
}

export async function requireWorkspaceAccess(database: WorkspaceDatabase, workspaceId: string, userId: string, ownerOnly = false) {
  const access = await workspaceAccess(database, workspaceId, userId);
  if (!access || (ownerOnly && access.role !== "owner")) throw new WorkspaceError("You don't have access to this workspace.", 403);
  return access;
}

export async function credentialMembershipValid(database: WorkspaceDatabase, key: { workspaceId: string; createdByUserId: string | null }) {
  if (key.createdByUserId) return Boolean(await workspaceAccess(database, key.workspaceId, key.createdByUserId));
  const workspace = await database.workspace.findUnique({ where: { id: key.workspaceId } });
  // Pre-membership credentials continue working only in their original personal workspace.
  return workspace?.kind === "personal";
}
