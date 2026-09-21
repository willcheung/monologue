import { NextResponse } from "next/server";
import { z } from "zod";
import { claimAgentConnection } from "@/lib/agent-connections";
import { isCloudMode } from "@/lib/runtime";

export const runtime = "nodejs";

const pollSchema = z.object({
  requestId: z.string().min(1),
  deviceCode: z.string().min(32).max(128),
}).strict();
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  if (!isCloudMode()) {
    return json({ success: false, error: "Automatic agent connection is available in cloud mode" }, 404);
  }

  const parsed = pollSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ success: false, error: "Invalid connection request" }, 400);

  const result = await claimAgentConnection(parsed.data.requestId, parsed.data.deviceCode);
  if (result.status === "pending") return json({ success: false, status: "authorization_pending" }, 202);
  if (result.status === "expired") return json({ success: false, status: "expired", error: "Connection request expired" }, 410);
  if (result.status === "claimed") return json({ success: false, status: "claimed", error: "Connection request was already used" }, 410);
  if (result.status === "invalid") return json({ success: false, status: "invalid", error: "Invalid connection request" }, 401);

  return json({
    success: true,
    status: "connected",
    apiKey: result.key,
    keyId: result.keyId,
    agentName: result.agentName,
  });
}
