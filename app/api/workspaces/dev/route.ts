import { db } from "@/lib/db";
import { isWorkspaceDev } from "@/lib/runtime";
import { requireSameOrigin, workspaceFailure, workspaceJson } from "@/lib/workspace-http";
export async function POST(request: Request) {
  if (!isWorkspaceDev()) return workspaceJson({ error: "Not found" }, 404);
  try {
    requireSameOrigin(request);
    const body = await request.json().catch(() => null);
    if (typeof body?.userId === "string") {
      const user = await db.user.findFirst({ where: { id: body.userId, email: { endsWith: "@example.test" } } });
      if (!user) return workspaceJson({ error: "Unknown sample account." }, 400);
      const response = workspaceJson({ success: true });
      response.cookies.set("monologue-dev-user", user.id, { httpOnly: true, sameSite: "lax", path: "/" });
      response.cookies.delete("monologue-workspace");
      return response;
    }
    return workspaceJson({ error: "Choose a sample account." }, 400);
  } catch (error) { return workspaceFailure(error); }
}
