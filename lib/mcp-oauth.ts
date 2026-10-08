import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { loadClientMetadata } from "./mcp-client-metadata";
import { credentialMembershipValid, workspaceAccess } from "./workspace-access";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, DEFAULT_AGENT_SCOPES, prepareWorkspaceApiKey } from "./api-keys";

export const MCP_SCOPE = ACTION_WRITE_SCOPE;
export const MCP_DEFAULT_SCOPES = DEFAULT_AGENT_SCOPES;
export const MCP_SCOPES = [ACTION_WRITE_SCOPE, ACTION_READ_SCOPE];
const scopeSchema = z.string().max(100).refine(value => {
  const scopes = value.trim().split(/\s+/);
  return scopes.every(scope => MCP_SCOPES.includes(scope));
}).transform(value => MCP_SCOPES.filter(scope => value.trim().split(/\s+/).includes(scope)).join(" "));
const HOUR = 60 * 60 * 1000;
const MONTH = 30 * 24 * HOUR;
export const hashOAuthSecret = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class OAuthError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export function mcpEnabled() { return process.env.MONOLOGUE_MCP_ENABLED === "1"; }

export function mcpIssuer() {
  const url = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("BETTER_AUTH_URL must be an HTTPS origin (or local loopback origin)");
  }
  return url.origin;
}

export function mcpResource() { return `${mcpIssuer()}/mcp`; }

export function validRedirectUri(value: string) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.hash &&
      (url.protocol === "https:" || (url.protocol === "http:" && ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)));
  } catch { return false; }
}

const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(80).default("AI agent"),
  redirect_uris: z.array(z.string().max(2048).refine(validRedirectUri)).min(1).max(5),
  token_endpoint_auth_method: z.enum(["none", "client_secret_post", "client_secret_basic"]).default("client_secret_basic"),
  grant_types: z.array(z.enum(["authorization_code", "refresh_token"])).min(1).default(["authorization_code", "refresh_token"]),
  response_types: z.array(z.literal("code")).length(1).default(["code"]),
  scope: scopeSchema.optional(),
});

export async function registerOAuthClient(input: unknown) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) throw new OAuthError("invalid_client_metadata", "Use HTTPS or loopback callbacks and supported OAuth options");
  const metadata = parsed.data;
  if (!metadata.grant_types.includes("authorization_code")) throw new OAuthError("invalid_client_metadata", "Authorization code grant is required");
  return db.$transaction(async (tx) => {
    // Bound public registration writes; upstream hosting rate limits still apply.
    const recent = await tx.mcpOAuthClient.count({ where: { createdAt: { gt: new Date(Date.now() - HOUR) } } });
    if (recent >= 100) throw new OAuthError("temporarily_unavailable", "Please try registration later", 429);
    const clientId = `mlg_client_${secret()}`;
    const clientSecret = metadata.token_endpoint_auth_method === "none" ? undefined : secret();
    await tx.mcpOAuthClient.create({ data: { id: clientId, name: metadata.client_name,
      redirectUris: metadata.redirect_uris, authMethod: metadata.token_endpoint_auth_method,
      secretHash: clientSecret ? hashOAuthSecret(clientSecret) : null } });
    return { ...metadata, client_id: clientId, client_id_issued_at: Math.floor(Date.now() / 1000),
      ...(clientSecret && { client_secret: clientSecret, client_secret_expires_at: 0 }) };
  });
}

const authorizationSchema = z.object({
  response_type: z.literal("code"), client_id: z.string().min(1).max(2048),
  redirect_uri: z.string().max(2048),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_challenge_method: z.literal("S256"),
  resource: z.string().max(2048), scope: scopeSchema.default(MCP_DEFAULT_SCOPES),
  state: z.string().max(2048).optional(),
});
export type AuthorizationInput = z.infer<typeof authorizationSchema>;

export async function validateAuthorization(input: unknown) {
  const parsed = authorizationSchema.safeParse(input);
  if (!parsed.success) throw new OAuthError("invalid_request", "A registered client, exact callback, resource, and S256 PKCE challenge are required");
  const params = parsed.data;
  if (params.resource !== mcpResource()) throw new OAuthError("invalid_target", "This connection is only for Monologue MCP");
  if (/^https?:/i.test(params.client_id)) {
    let metadata;
    try { metadata = await loadClientMetadata(params.client_id); }
    catch { throw new OAuthError("invalid_client", "Could not validate this client's metadata"); }
    if (!metadata.redirect_uris.includes(params.redirect_uri))
      throw new OAuthError("invalid_request", "Unregistered client or callback");
    // Fetch afresh at authorization; stored records bind subsequent codes/tokens.
    // Do not let unavailable remote metadata prevent refresh or revocation.
    const data = { name: metadata.client_name, redirectUris: metadata.redirect_uris, authMethod: "none", secretHash: null };
    const client = await db.$transaction(async tx => {
      const existing = await tx.mcpOAuthClient.findUnique({ where: { id: params.client_id } });
      if (!existing) {
        const recent = await tx.mcpOAuthClient.count({ where: { createdAt: { gt: new Date(Date.now() - HOUR) } } });
        if (recent >= 100) throw new OAuthError("temporarily_unavailable", "Please try connecting later", 429);
      }
      return tx.mcpOAuthClient.upsert({ where: { id: params.client_id },
        create: { id: params.client_id, ...data }, update: data });
    });
    return { params, client };
  }
  const client = await db.mcpOAuthClient.findUnique({ where: { id: params.client_id } });
  if (!client || !(client.redirectUris as string[]).includes(params.redirect_uri))
    throw new OAuthError("invalid_request", "Unregistered client or callback");
  return { params, client };
}

export function authorizationRedirect(params: AuthorizationInput, result: { code: string } | { error: string }) {
  const url = new URL(params.redirect_uri);
  url.searchParams.set("iss", mcpIssuer());
  if (params.state !== undefined) url.searchParams.set("state", params.state);
  for (const [key, value] of Object.entries(result)) url.searchParams.set(key, value);
  return url.toString();
}

export async function approveOAuthConnection(input: unknown, workspaceId: string, userId: string) {
  const { params, client } = await validateAuthorization(input);
  const code = secret();
  await db.$transaction(async (tx) => {
    if (!await workspaceAccess(tx, workspaceId, userId)) throw new OAuthError("access_denied", "Sign in to a workspace you belong to", 403);
    const recent = await tx.apiKey.count({ where: { workspaceId, prefix: "OAuth connection", createdAt: { gt: new Date(Date.now() - HOUR) } } });
    if (recent >= 20) throw new OAuthError("temporarily_unavailable", "Please try connecting later", 429);
    // Names are not verified brands. A member owns their agent identity.
    const agent = await tx.agent.findFirst({ where: { workspaceId, name: client.name, connectedByUserId: userId }, orderBy: { createdAt: "asc" } }) ??
      await tx.agent.create({ data: { workspaceId, name: client.name, connectedByUserId: userId } });
    const prepared = prepareWorkspaceApiKey(workspaceId, client.name, { agentId: agent.id, createdByUserId: userId, scopes: params.scope });
    // No REST key leaves the service. This existing row provides shared revocation/attribution.
    const key = await tx.apiKey.create({ data: { ...prepared.data, prefix: "OAuth connection" } });
    await tx.mcpOAuthCode.create({ data: { clientId: client.id, keyId: key.id, codeHash: hashOAuthSecret(code),
      redirectUri: params.redirect_uri, challenge: params.code_challenge, resource: params.resource,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
  });
  return authorizationRedirect(params, { code });
}

async function authenticateClient(form: URLSearchParams, authorization: string | null) {
  let clientId = form.get("client_id"), clientSecret = form.get("client_secret"), method = clientSecret ? "client_secret_post" : "none";
  if (authorization) {
    if (!authorization.startsWith("Basic ") || clientSecret) throw new OAuthError("invalid_client", "Invalid client authentication", 401);
    try {
      const decoded = Buffer.from(authorization.slice(6), "base64").toString();
      const colon = decoded.indexOf(":");
      if (colon < 0) throw new Error();
      const basicId = decodeURIComponent(decoded.slice(0, colon));
      if (clientId && clientId !== basicId) throw new Error();
      clientId = basicId; clientSecret = decodeURIComponent(decoded.slice(colon + 1)); method = "client_secret_basic";
    } catch { throw new OAuthError("invalid_client", "Invalid client authentication", 401); }
  }
  const client = clientId && clientId.length <= 2048 ? await db.mcpOAuthClient.findUnique({ where: { id: clientId } }) : null;
  if (!client || client.authMethod !== method || (client.secretHash && !equal(hashOAuthSecret(clientSecret ?? ""), client.secretHash))) {
    throw new OAuthError("invalid_client", "Invalid client authentication", 401);
  }
  return client;
}

async function issueTokens(tx: Prisma.TransactionClient, clientId: string, keyId: string, resource: string, refreshExpiresAt: Date, scopes: string) {
  const accessToken = `mlg_mcp_${secret()}`, refreshToken = `mlg_refresh_${secret()}`;
  await tx.mcpOAuthToken.create({ data: { accessHash: hashOAuthSecret(accessToken), refreshHash: hashOAuthSecret(refreshToken),
    clientId, keyId, resource, expiresAt: new Date(Date.now() + HOUR), refreshExpiresAt } });
  return { access_token: accessToken, refresh_token: refreshToken, token_type: "Bearer", expires_in: HOUR / 1000, scope: scopes };
}

function checkTokenScope(form: URLSearchParams, grantedScopes: string) {
  if (!form.has("scope")) return;
  const requested = scopeSchema.safeParse(form.get("scope"));
  if (!requested.success || requested.data !== grantedScopes) {
    throw new OAuthError("invalid_scope", "Reconnect and approve to change this connection's permissions");
  }
}

export async function exchangeOAuthToken(form: URLSearchParams, authorization: string | null = null) {
  const client = await authenticateClient(form, authorization);
  if (form.get("resource") !== mcpResource()) throw new OAuthError("invalid_target", "The Monologue MCP resource is required");
  if (form.get("grant_type") === "authorization_code") {
    const code = form.get("code"), verifier = form.get("code_verifier");
    if (!code || code.length > 200 || !verifier || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new OAuthError("invalid_grant", "Invalid authorization code or verifier");
    const result = await db.$transaction(async (tx) => {
      const record = await tx.mcpOAuthCode.findUnique({ where: { codeHash: hashOAuthSecret(code) }, include: { key: true } });
      const challenge = createHash("sha256").update(verifier).digest("base64url");
      if (!record || record.clientId !== client.id || record.redirectUri !== form.get("redirect_uri") || record.resource !== mcpResource() ||
        record.key.revokedAt || !await credentialMembershipValid(tx, record.key) || !equal(challenge, record.challenge)) {
        throw new OAuthError("invalid_grant", "Invalid or expired authorization code");
      }
      if (record.consumedAt) {
        await tx.apiKey.update({ where: { id: record.keyId }, data: { revokedAt: new Date() } });
        return null;
      }
      if (record.expiresAt <= new Date()) throw new OAuthError("invalid_grant", "Invalid or expired authorization code");
      checkTokenScope(form, record.key.scopes);
      const claimed = await tx.mcpOAuthCode.updateMany({ where: { id: record.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (!claimed.count) {
        await tx.apiKey.update({ where: { id: record.keyId }, data: { revokedAt: new Date() } });
        return null;
      }
      return issueTokens(tx, client.id, record.keyId, record.resource, new Date(Date.now() + MONTH), record.key.scopes);
    });
    if (!result) throw new OAuthError("invalid_grant", "Authorization code already used");
    return result;
  }
  if (form.get("grant_type") === "refresh_token") {
    const refresh = form.get("refresh_token");
    if (!refresh || refresh.length > 200) throw new OAuthError("invalid_grant", "Invalid refresh token");
    const result = await db.$transaction(async (tx) => {
      const record = await tx.mcpOAuthToken.findUnique({ where: { refreshHash: hashOAuthSecret(refresh) }, include: { key: true } });
      if (!record || record.clientId !== client.id || record.resource !== mcpResource() || record.key.revokedAt || !await credentialMembershipValid(tx, record.key) || record.refreshExpiresAt <= new Date()) return null;
      checkTokenScope(form, record.key.scopes);
      if (record.rotatedAt) {
        await tx.apiKey.update({ where: { id: record.keyId }, data: { revokedAt: new Date() } });
        return null; // Commit family revocation before raising the error.
      }
      const rotated = await tx.mcpOAuthToken.updateMany({ where: { id: record.id, rotatedAt: null }, data: { rotatedAt: new Date() } });
      if (!rotated.count) {
        await tx.apiKey.update({ where: { id: record.keyId }, data: { revokedAt: new Date() } });
        return null;
      }
      return issueTokens(tx, client.id, record.keyId, record.resource, record.refreshExpiresAt, record.key.scopes);
    });
    if (!result) throw new OAuthError("invalid_grant", "Refresh token expired, revoked, or already used");
    return result;
  }
  throw new OAuthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

export async function authenticateMcpRequest(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !token.startsWith("mlg_mcp_") || token.length > 200) return null;
  const record = await db.mcpOAuthToken.findUnique({ where: { accessHash: hashOAuthSecret(token) }, include: { key: { include: { agent: true } } } });
  if (!record || record.resource !== mcpResource() || record.expiresAt <= new Date() || record.key.revokedAt ||
    record.rotatedAt || !scopeSchema.safeParse(record.key.scopes).success || !record.key.agent || record.key.agent.workspaceId !== record.key.workspaceId || !await credentialMembershipValid(db, record.key)) return null;
  await db.apiKey.update({ where: { id: record.keyId }, data: { lastUsedAt: new Date() } });
  return { workspaceId: record.key.workspaceId, keyId: record.keyId, agent: record.key.agent, scopes: record.key.scopes };
}

export async function revokeOAuthToken(form: URLSearchParams, authorization: string | null) {
  const client = await authenticateClient(form, authorization);
  const token = form.get("token");
  if (!token || token.length > 200) return;
  const hash = hashOAuthSecret(token);
  const record = await db.mcpOAuthToken.findFirst({ where: { clientId: client.id, OR: [{ accessHash: hash }, { refreshHash: hash }] } });
  if (record) await db.apiKey.update({ where: { id: record.keyId }, data: { revokedAt: new Date() } });
}
