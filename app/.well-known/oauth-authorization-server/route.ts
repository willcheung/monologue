import { MCP_SCOPES, mcpIssuer } from "@/lib/mcp-oauth";
import { mcpGate, oauthJson, oauthOptions } from "@/lib/mcp-http";
export const dynamic = "force-dynamic";
export function GET() {
  const gate = mcpGate(); if (gate) return gate;
  const issuer = mcpIssuer();
  return oauthJson({ issuer, authorization_endpoint: `${issuer}/oauth/authorize`, token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`, revocation_endpoint: `${issuer}/oauth/revoke`,
    response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"], scopes_supported: MCP_SCOPES, authorization_response_iss_parameter_supported: true });
}
export const OPTIONS = oauthOptions;
