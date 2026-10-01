import { mcpEnabled, mcpIssuer, OAuthError } from "./mcp-oauth";
export const privateHeaders = { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export function oauthJson(body: unknown, status = 200) { return Response.json(body, { status, headers: { ...privateHeaders, "Access-Control-Allow-Origin": "*" } }); }
export function unavailable() { return oauthJson({ error: "temporarily_unavailable", error_description: "MCP connections are not enabled" }, 503); }
export function oauthFailure(error: unknown) {
  if (error instanceof OAuthError) return oauthJson({ error: error.code, error_description: error.message }, error.status);
  return oauthJson({ error: "server_error", error_description: "Could not complete the connection" }, 500);
}
export async function readOAuthBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 8192) throw new OAuthError("invalid_request", "Request too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new OAuthError("invalid_request", "Request body required");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new OAuthError("invalid_request", "Request too large", 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function readOAuthForm(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw new OAuthError("invalid_request", "Send URL-encoded form data");
  const form = new URLSearchParams(await readOAuthBody(request));
  for (const key of new Set(form.keys())) if (form.getAll(key).length > 1) throw new OAuthError("invalid_request", "Repeated parameters are not supported");
  return form;
}
export function oauthOptions() { return new Response(null, { status: 204, headers: { ...privateHeaders, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" } }); }
export function mcpRequestOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = [mcpIssuer(), "https://chatgpt.com", ...(process.env.MONOLOGUE_MCP_ALLOWED_ORIGINS ?? "").split(",").map(x => x.trim()).filter(Boolean)];
  return !origin || allowed.includes(origin);
}
export function mcpGate() { return mcpEnabled() ? null : unavailable(); }
