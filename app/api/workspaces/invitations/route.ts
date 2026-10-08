import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { acceptWorkspaceInvitation } from "@/lib/workspace-service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { requireSameOrigin, workspaceFailure, workspaceJson } from "@/lib/workspace-http";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext(request.headers.get("x-monologue-workspace") ?? undefined);
    if (!context?.user) return workspaceJson({ error: "Sign in to accept this invitation." }, 401);
    const body = await request.json().catch(() => null);
    if (typeof body?.token !== "string" || body.token.length > 128) return workspaceJson({ error: "Invalid invitation." }, 400);
    const workspace = await acceptWorkspaceInvitation(context.user.id, context.user.email, body.token);
    const response = workspaceJson({ workspaceId: workspace.id });
    response.cookies.set("monologue-workspace", workspace.id, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 31536000 });
    return response;
  } catch (error) { return workspaceFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext(request.headers.get("x-monologue-workspace") ?? undefined);
    if (!context?.user) return workspaceJson({ error: "Sign in to manage invitations." }, 401);
    const body = await request.json().catch(() => null);
    if (typeof body?.id !== "string") return workspaceJson({ error: "Choose an invitation." }, 400);
    await requireWorkspaceAccess(db, context.workspace.id, context.user.id, true);
    const result = await db.workspaceInvitation.updateMany({ where: { id: body.id, workspaceId: context.workspace.id, cancelledAt: null, acceptedAt: null }, data: { cancelledAt: new Date() } });
    return workspaceJson({ success: Boolean(result.count) }, result.count ? 200 : 404);
  } catch (error) { return workspaceFailure(error); }
}
