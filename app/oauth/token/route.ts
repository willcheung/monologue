import { exchangeOAuthToken } from "@/lib/mcp-oauth";
import { mcpGate, oauthFailure, oauthJson, oauthOptions, readOAuthForm } from "@/lib/mcp-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const gate = mcpGate(); if (gate) return gate;
  try { return oauthJson(await exchangeOAuthToken(await readOAuthForm(request), request.headers.get("authorization"))); }
  catch (error) { return oauthFailure(error); }
}
export const OPTIONS = oauthOptions;
