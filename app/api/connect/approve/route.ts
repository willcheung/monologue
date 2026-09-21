import { NextResponse } from "next/server";
import { z } from "zod";
import { approveAgentConnection } from "@/lib/agent-connections";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const runtime = "nodejs";

const approvalSchema = z.object({
  requestId: z.string().min(1),
  approvalCode: z.string().min(16).max(128),
}).strict();
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  if (!isCloudMode()) {
    return json({ success: false, error: "Automatic agent connection is available in cloud mode" }, 404);
  }

  const context = await getWorkspaceContext();
  if (!context) return json({ success: false, error: "Unauthorized" }, 401);

  const parsed = approvalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ success: false, error: "Invalid connection request" }, 400);

  const result = await approveAgentConnection(
    parsed.data.requestId,
    parsed.data.approvalCode,
    context.workspace.id,
  );
  if (result.status === "expired") return json({ success: false, error: "This connection link expired" }, 410);
  if (result.status === "claimed") return json({ success: false, error: "This agent is already connected" }, 409);
  if (result.status === "invalid") return json({ success: false, error: "Invalid connection request" }, 404);
  return json({ success: true, status: "approved" });
}
