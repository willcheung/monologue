import { NextRequest, NextResponse } from "next/server";
import { actionInputSchema, attributeSelfReportedAction } from "@/lib/action-schema";
import { createAction, listActions } from "@/lib/actions";
import { ensureReportingAgent } from "@/lib/agents";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, authenticateApiRequest, hasApiScope } from "@/lib/api-keys";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ success: false, error: "This agent connection does not have permission" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const credential = await authenticateApiRequest(request);
  if (!credential) return unauthorized();
  if (!hasApiScope(credential, ACTION_WRITE_SCOPE)) return forbidden();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = actionInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid action", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const agent = await ensureReportingAgent({
    workspaceId: credential.workspaceId,
    agentId: credential.agentId,
    agentName: credential.agentName ?? parsed.data.agentName,
    keyId: credential.keyId,
  });
  const attributed = attributeSelfReportedAction(parsed.data, agent);
  const { action, duplicate } = await createAction(attributed, credential.workspaceId, credential.keyId);
  return NextResponse.json({ success: true, id: action.id, ...(duplicate && { duplicate: true }) }, { status: duplicate ? 200 : 201 });
}

export async function GET(request: NextRequest) {
  const credential = await authenticateApiRequest(request);
  if (!credential) return unauthorized();
  if (!hasApiScope(credential, ACTION_READ_SCOPE)) return forbidden();
  const params = request.nextUrl.searchParams;
  const actions = await listActions({
    agent: params.get("agent") || undefined,
    category: params.get("category") || undefined,
    status: params.get("status") || undefined,
    system: params.get("system") || undefined,
    project: params.get("project") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    search: params.get("search") || undefined,
  }, credential.workspaceId);
  return NextResponse.json({ success: true, actions });
}
