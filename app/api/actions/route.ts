import { NextRequest, NextResponse } from "next/server";
import { actionInputSchema } from "@/lib/action-schema";
import { createAction, listActions } from "@/lib/actions";
import { authenticateApiRequest } from "@/lib/api-keys";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const credential = await authenticateApiRequest(request);
  if (!credential) return unauthorized();
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

  const { action, duplicate } = await createAction(parsed.data, credential.workspaceId);
  return NextResponse.json({ success: true, id: action.id, ...(duplicate && { duplicate: true }) }, { status: duplicate ? 200 : 201 });
}

export async function GET(request: NextRequest) {
  const credential = await authenticateApiRequest(request);
  if (!credential) return unauthorized();
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
