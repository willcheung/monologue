import { NextResponse } from "next/server";
import { z } from "zod";
import { CONNECTION_POLL_INTERVAL_SECONDS, createAgentConnection } from "@/lib/agent-connections";
import { isCloudMode } from "@/lib/runtime";

export const runtime = "nodejs";

const requestSchema = z.object({
  agentName: z.string().trim().min(1).max(80),
}).strict();
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  if (!isCloudMode()) {
    return json({ success: false, error: "Automatic agent connection is available in cloud mode" }, 404);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ success: false, error: "Enter an agent name" }, 400);

  const { connection, deviceCode, approvalCode } = await createAgentConnection(parsed.data.agentName);
  const baseUrl = process.env.BETTER_AUTH_URL!;
  const verificationUrl = new URL("/connect", baseUrl);
  verificationUrl.searchParams.set("request", connection.id);
  verificationUrl.searchParams.set("code", approvalCode);

  return json({
    success: true,
    requestId: connection.id,
    deviceCode,
    verificationUrl: verificationUrl.toString(),
    expiresIn: 600,
    interval: CONNECTION_POLL_INTERVAL_SECONDS,
  }, 201);
}
