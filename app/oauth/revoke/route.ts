import { revokeOAuthToken } from "@/lib/mcp-oauth";
import { mcpGate, oauthFailure, oauthOptions, readOAuthForm, privateHeaders } from "@/lib/mcp-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const gate = mcpGate(); if (gate) return gate;
  try { await revokeOAuthToken(await readOAuthForm(request), request.headers.get("authorization")); return new Response(null, { status: 200, headers: { ...privateHeaders, "Access-Control-Allow-Origin": "*" } }); }
  catch (error) { return oauthFailure(error); }
}
export const OPTIONS = oauthOptions;
