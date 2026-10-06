import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { createSharedWorkspace } from "@/lib/workspace-service";
import { requireSameOrigin, workspaceFailure, workspaceJson } from "@/lib/workspace-http";
const schema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext();
    if (!context?.user) return workspaceJson({ error: "Sign in to create a workspace." }, 401);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return workspaceJson({ error: "Enter a workspace name (up to 80 characters)." }, 400);
    const workspace = await createSharedWorkspace(context.user.id, parsed.data.name);
    const response = workspaceJson({ workspace }, 201);
    response.cookies.set("monologue-workspace", workspace.id, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 31536000 });
    return response;
  } catch (error) { return workspaceFailure(error); }
}
