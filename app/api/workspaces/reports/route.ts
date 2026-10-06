import { getWorkspaceContext } from "@/lib/workspace";
import { saveReportSettings } from "@/lib/workspace-reports";
import { requireSameOrigin, workspaceFailure, workspaceJson } from "@/lib/workspace-http";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext(request.headers.get("x-monologue-workspace") ?? undefined);
    if (!context?.user) return workspaceJson({ error: "Sign in to manage reports." }, 401);
    const settings = await saveReportSettings(context.workspace.id, context.user.id, await request.json().catch(() => null));
    return workspaceJson({ settings, deliveryLive: false });
  } catch (error) { return workspaceFailure(error); }
}
