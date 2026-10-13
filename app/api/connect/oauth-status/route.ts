import { getWorkspaceContext } from "@/lib/workspace";
import { getOAuthConnectionStatus, mcpEnabled } from "@/lib/mcp-oauth";
import { isCloudMode } from "@/lib/runtime";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" };
  if (!isCloudMode() || !mcpEnabled()) return Response.json({ error: "Unavailable" }, { status: 404, headers });
  const context = await getWorkspaceContext();
  if (!context?.user) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const status = await getOAuthConnectionStatus(new URL(request.url).searchParams.get("connection") ?? "", context.user.id);
  return status ? Response.json(status, { headers }) : Response.json({ error: "Unavailable" }, { status: 404, headers });
}
