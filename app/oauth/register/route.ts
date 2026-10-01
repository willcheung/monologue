import { registerOAuthClient } from "@/lib/mcp-oauth";
import { mcpGate, oauthFailure, oauthJson, oauthOptions, readOAuthBody } from "@/lib/mcp-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const gate = mcpGate(); if (gate) return gate;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return oauthJson({ error: "invalid_client_metadata" }, 400);
    let input: unknown;
    try { input = JSON.parse(await readOAuthBody(request)); } catch (error) { if (error instanceof SyntaxError) return oauthJson({ error: "invalid_client_metadata" }, 400); throw error; }
    return oauthJson(await registerOAuthClient(input), 201);
  } catch (error) { return oauthFailure(error); }
}
export const OPTIONS = oauthOptions;
