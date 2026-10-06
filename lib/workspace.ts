import { cookies, headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { isCloudMode, isWorkspaceDev, LOCAL_WORKSPACE_ID } from "./runtime";
import { ensurePersonalWorkspace, listWorkspaces } from "./workspace-service";
import { workspaceAccess } from "./workspace-access";

export async function getWorkspaceContext(requestedWorkspaceId?: string) {
  if (!isCloudMode()) {
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: LOCAL_WORKSPACE_ID } });
    return { workspace, user: null, role: "owner" as const, workspaces: [workspace] };
  }
  const cookieStore = await cookies();
  const user = isWorkspaceDev()
    ? await db.user.findFirst({ where: { id: cookieStore.get("monologue-dev-user")?.value ?? "dev-owner", email: { endsWith: "@example.test" } } })
    : (await auth.api.getSession({ headers: await headers() }))?.user;
  if (!user) return null;
  const personal = await ensurePersonalWorkspace(user.id);
  const workspaces = await listWorkspaces(user.id);
  const requested = requestedWorkspaceId ?? cookieStore.get("monologue-workspace")?.value;
  const access = requested ? await workspaceAccess(db, requested, user.id) : null;
  if (requestedWorkspaceId && !access) return null;
  return { workspace: access?.workspace ?? personal, user, role: access?.role ?? "owner" as const, workspaces };
}
