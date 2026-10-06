import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { requireSameOrigin, workspaceFailure, workspaceJson } from "@/lib/workspace-http";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext();
    if (!context?.user) return workspaceJson({ error: "Sign in to select a workspace." }, 401);
    const body = await request.json().catch(() => null);
    if (typeof body?.workspaceId !== "string") return workspaceJson({ error: "Choose a workspace." }, 400);
    await requireWorkspaceAccess(db, body.workspaceId, context.user.id);
    const response = workspaceJson({ success: true });
    response.cookies.set("monologue-workspace", body.workspaceId, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 31536000 });
    return response;
  } catch (error) { return workspaceFailure(error); }
}
