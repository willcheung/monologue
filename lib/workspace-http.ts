import { NextResponse } from "next/server";
import { WorkspaceError } from "./workspace-access";
export function workspaceJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new WorkspaceError("Request origin is not allowed.", 403);
}
export function workspaceFailure(error: unknown) {
  if (error instanceof WorkspaceError) return workspaceJson({ error: error.message }, error.status);
  console.error("Workspace request failed", error);
  return workspaceJson({ error: "Could not save this change. Please try again." }, 500);
}
