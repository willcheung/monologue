import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { isCloudMode, LOCAL_WORKSPACE_ID } from "./runtime";

export async function getWorkspaceContext() {
  if (!isCloudMode()) {
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: LOCAL_WORKSPACE_ID } });
    return { workspace, user: null };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const workspace = await db.workspace.upsert({
    where: { ownerId: session.user.id },
    update: {},
    create: { ownerId: session.user.id, name: `${session.user.name.trim().split(/\s+/)[0] || "My"}'s feed` },
  });
  return { workspace, user: session.user };
}
