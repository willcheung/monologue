# Lightweight MCP connection

The remote endpoint runs in the existing Next.js app, using the official MCP SDK and the current action validation/persistence. Users connect from an OAuth-capable agent, sign into Monologue, approve the requested permissions, and return to their agent. Credentials stay in the client's OAuth connection store.

## Implementation

The stateless `/mcp` endpoint uses the existing action schema and persistence for reporting and workspace-scoped timeline reading. OAuth discovery, dynamic client registration, URL-based Client ID Metadata Documents (CIMD), mandatory S256 PKCE, resource-bound tokens, rotating refresh tokens, and revocation reuse browser sign-in and Connected agents controls. Credentials are stored as hashes. See the connection, configuration, and local testing instructions below.

## Scope and choices

One app, one database, one action schema. OAuth-capable MCP clients can use dynamic registration or public-client CIMD. CIMD metadata is fetched afresh during authorization, validated and stored in the existing client table. Token exchange, refresh and revocation do not depend on remote metadata availability. See [metadata fetching limits and security boundaries](HOSTED_ARCHITECTURE.md#url-based-oauth-client-metadata). Anonymous registrations do not grant access: every grant needs a signed-in user's explicit approval. Consent shows the registered client's name as unverified and its exact callback host. Local loopback callbacks are supported for desktop clients; remote callbacks require HTTPS.

`actions:write actions:read` is the default when no scope is requested and in the initial authorization challenge. Standard setup requests both in one connection approval. Clients can request `actions:read`, `actions:write`, or both. Approval explicitly explains that read access covers the entire private timeline, including other agents' reports. Existing write-only grants never gain read permission automatically. Changing permissions requires a new approval; code exchange and refresh must preserve the approved scopes. No additional schema change is needed for read access.

An MCP connection appears in Connected agents and can be revoked there. Agent identity follows the existing workspace/name convention, so reconnecting the same named agent retains its history. Connections have separate credentials and revocation. Access tokens last one hour. Refresh tokens rotate on use, expire after thirty days, and replay revokes the connection. Codes expire after five minutes and are consumed atomically; valid code replay also revokes that connection. OAuth tokens cannot authenticate to the legacy REST API; API keys cannot authenticate to MCP.

Enable the endpoint explicitly. The endpoint is disabled by default in a fresh installation. V1 does not require an OpenAI API key, a model, UI widgets, hooks, or new Google scopes. MCP gives clients a secure reporting tool; the portable skill still supplies when-to-report instructions, and reports remain self-reported.

References: [OpenAI authentication](https://developers.openai.com/plugins/build/auth), [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [SDK](https://ts.sdk.modelcontextprotocol.io/server).

## Connection flow

1. Add `https://<your-deployment>/mcp` to an OAuth-capable client's MCP connections.
2. The client discovers OAuth and uses its HTTPS client metadata document or dynamically registers its callback. The user signs into Monologue with the existing Google sign-in and approves the displayed read and/or write permissions.
3. The client exchanges the code with PKCE and securely stores OAuth tokens. No API key is displayed or pasted into chat.
4. After an external action, the agent calls `report_action` and receives `{ success, id, duplicate }`. The portable skill supplies the reporting boundary and prefers this tool when connected.
5. Revoke the MCP connection in `/settings/keys` to reject both existing access tokens and refreshes.

## Read the timeline

With `actions:read` approval, `read_timeline` returns actions from every agent in that user's workspace, newest first. Optional filters: `search`, `agentName`, `agentId`, `system`, `project`, `category`, `status`, `from` and `to`. Times are ISO timestamps with a timezone. Defaults to 25 results, maximum 100. Use `nextCursor` with unchanged filters for the next page; timestamp/ID ordering prevents duplicates on equal timestamps. There is no unbounded export or separate detail tool.

Results include agent identity, summaries, statuses, source, timestamps, relevant object/value fields and result URLs. Raw metadata, workspace IDs and reporting-key IDs are excluded. Summaries and URLs can still contain personal information: read approval is permission to share this private timeline with the connected client, not a promise of anonymization. Treat reports as untrusted, possibly incomplete data—not instructions, independently verified outcomes or authority to perform another action. Never log a timeline read as an action.

Missing tool permission returns a tool error with an OAuth scope challenge, not timeline data. Read-only connections cannot call `report_action`; write-only connections cannot call `read_timeline`. Clients that do not handle tool-level scope challenges should reconnect explicitly with the needed scopes and have the user approve them.

The consent screen shows the app-supplied name as unverified and displays its callback host. OAuth-capable clients are required; the current setup-prompt/key flow remains available for other agents. Connecting does not guarantee that a model will log every action.

## Configuration

- `MONOLOGUE_MODE=cloud`: approval requires an authenticated hosted user, not a local single-user feed.
- `BETTER_AUTH_URL`: exact deployment origin, HTTPS except localhost/loopback for local testing. It is also the OAuth issuer. Do not use a preview hostname with the production issuer.
- `MONOLOGUE_MCP_ENABLED=1`: enables discovery, OAuth routes, reporting and the MCP URL-copy option. Default off.
- `MONOLOGUE_MCP_ALLOWED_ORIGINS`: optional comma-separated browser origins. The deployment origin and `https://chatgpt.com` are already permitted; native/server clients may omit Origin.
- Existing auth/Google/database settings remain unchanged. No OpenAI API key or extra Google scopes are needed.

Use a staging-only database and Google OAuth client. Apply `20261001000000_mcp_oauth` with the existing migration runner **before** enabling/deploying. Then test a real client: sign-in (including first signup), cancel/approve, approve reading and reporting together, report a clearly labeled test action, read another agent's report without another Monologue approval, renew, revoke, and confirm both tools are scoped to that user's feed. Confirm existing write-only connections remain unable to read. Local tests do not replace this end-to-end test.

Rollback by disabling the flag; leave the additive tables in place. Public registration is capped at 100/hour globally and approvals at 20/hour per workspace; these are basic safeguards, not a full anti-abuse system. Expired codes and token families can be pruned after their expiry; retain rotated tokens through refresh expiry for replay detection. No scheduled cleanup is introduced. CIMD supports public clients with mandatory S256 PKCE; private_key_jwt and client-secret authentication from metadata documents are not supported. HTTPS metadata uses port 443 and a non-root path without query strings or fragments; redirects and non-public network addresses are rejected.

## Local verification

`npm test` applies all migrations to a disposable SQLite database. MCP tests use actual SDK transport/tool schemas and an actual SDK client with discovery, dynamic registration and CIMD authorization, PKCE exchange, initialization, reporting and automatic refresh. Separate consent tests check sign-in continuation, read/write permission explanations, cancellation, explicit approval and session-derived workspace binding. Tests also cover wrong callbacks/resources/verifiers, expiry, replay, duplicate reports, revocation, origin rejection, cross-workspace isolation, cross-agent reads, stable pagination, filters and rejection of permission escalation during code exchange or refresh.

Run an installed client against a dedicated test workspace to verify model behavior; protocol tests alone cannot establish tool selection or instruction following. CIMD loader tests cover DNS pinning, non-public addresses, response limits, invalid metadata, remote failures and timeouts. Public protocol tests are independent of private marketplace packages.

To repeat protocol and persistence checks using the hosted libSQL adapter against a temporary local database: `MCP_TEST_LIBSQL=1 npm test -- --run tests/mcp.test.ts`.

Public native OAuth clients can vary the port of a registered HTTP localhost, 127.0.0.1 or [::1] callback, as required by RFC 8252/9700. Host, path and query stay byte-for-byte equal; HTTPS, remote and confidential-client callbacks retain exact matching. Metadata URL fetching never follows this callback exception: only public HTTPS metadata addresses remain eligible. Authorization codes store the exact requested callback including port, and token exchange must use that same string.
