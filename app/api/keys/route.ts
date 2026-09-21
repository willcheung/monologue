import { NextResponse } from "next/server";
import { z } from "zod";
import { createWorkspaceApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const runtime = "nodejs";

const createKeySchema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
const revokeKeySchema = z.object({ id: z.string().min(1) }).strict();

function unavailable() {
  return NextResponse.json({ success: false, error: "Hosted API keys are available in cloud mode" }, { status: 404 });
}

export async function GET() {
  if (!isCloudMode()) return unavailable();
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const keys = await db.apiKey.findMany({
    where: { workspaceId: context.workspace.id },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, keys });
}

export async function POST(request: Request) {
  if (!isCloudMode()) return unavailable();
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const parsed = createKeySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Enter a name for this agent" }, { status: 400 });
  const key = await createWorkspaceApiKey(context.workspace.id, parsed.data.name);
  return NextResponse.json({ success: true, key }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isCloudMode()) return unavailable();
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const parsed = revokeKeySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid key" }, { status: 400 });
  const result = await db.apiKey.updateMany({
    where: { id: parsed.data.id, workspaceId: context.workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ success: false, error: "Key not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
