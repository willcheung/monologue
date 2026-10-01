import { MCP_SCOPES, mcpIssuer, mcpResource } from "@/lib/mcp-oauth";
import { mcpGate, oauthJson, oauthOptions } from "@/lib/mcp-http";
export const dynamic = "force-dynamic";
export function GET() {
  const gate = mcpGate(); if (gate) return gate;
  return oauthJson({ resource: mcpResource(), authorization_servers: [mcpIssuer()], scopes_supported: MCP_SCOPES,
    bearer_methods_supported: ["header"], resource_name: "Monologue", resource_documentation: `${mcpIssuer()}/developers` });
}
export const OPTIONS = oauthOptions;
