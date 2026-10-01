# Lightweight MCP connection

Build one remote endpoint in the existing Next.js app, using the official MCP SDK and the current action validation/persistence. Users connect from an OAuth-capable agent, sign into Monologue, approve the requested permissions, and return to their agent. Credentials stay in the client's OAuth connection store.

## Build phases

1. Add a stateless `/mcp` endpoint with `report_action` and `read_timeline`. Preserve event IDs, deduplication and provenance; keep timeline reading separately permissioned, bounded and workspace-scoped.
2. Add OAuth discovery, dynamic client registration, authorization-code exchange with mandatory S256 PKCE, resource-bound access tokens, rotating refresh tokens, and revocation. Reuse the existing browser session and Connected agents controls. Store only hashes of credentials.
3. Test discovery, consent validation, wrong redirect/resource/verifier, replay, expiry, refresh, revocation, per-tool permissions, workspace isolation, tool schemas, pagination and reporting using a disposable SQLite database. Run the release checks and refresh the submission draft from actual tools.
4. Release separately after review: apply the additive database migration, enable `MONOLOGUE_MCP_ENABLED=1`, deploy, and complete a real ChatGPT/Codex OAuth connection and reporting test. Marketplace review is a later step.

## Scope and choices

One app, one database, one action schema. Standard OAuth-capable MCP clients use dynamic registration; CIMD is deferred. Anonymous registrations do not grant access: every grant needs a signed-in user's explicit approval. Consent shows the registered client's name as unverified and its exact callback host. Local loopback callbacks are supported for desktop clients; remote callbacks require HTTPS.

`actions:write` remains the default when no scope is requested and in the initial authorization challenge. Clients can request `actions:read`, `actions:write`, or both. Approval explicitly explains that read access covers the entire private timeline, including other agents' reports. Existing write-only grants never gain read permission automatically. Changing permissions requires a new approval; code exchange and refresh must preserve the approved scopes. No additional schema change is needed for read access.

An MCP connection appears in Connected agents and can be revoked there. Agent identity follows the existing workspace/name convention, so reconnecting the same named agent retains its history. Connections have separate credentials and revocation. Access tokens last one hour. Refresh tokens rotate on use, expire after thirty days, and replay revokes the connection. Codes expire after five minutes and are consumed atomically; valid code replay also revokes that connection. OAuth tokens cannot authenticate to the legacy REST API; API keys cannot authenticate to MCP.

Enable the endpoint explicitly. The default remains disabled until deployment and client tests. V1 does not require an OpenAI API key, a model, UI widgets, hooks, or new Google scopes. MCP gives clients a secure reporting tool; the portable skill still supplies when-to-report instructions, and reports remain self-reported.

References: [OpenAI authentication](https://developers.openai.com/plugins/build/auth), [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [SDK](https://ts.sdk.modelcontextprotocol.io/server).

## Connection flow

1. Add `https://<your-deployment>/mcp` to an OAuth-capable client's MCP connections.
2. The client discovers OAuth and registers its callback automatically. The user signs into Monologue with the existing Google sign-in and approves the displayed read and/or write permissions.
3. The client exchanges the code with PKCE and securely stores OAuth tokens. No API key is displayed or pasted into chat.
4. After an external action, the agent calls `report_action` and receives `{ success, id, duplicate }`. The portable skill supplies the reporting boundary and prefers this tool when connected.
5. Revoke the MCP connection in `/settings/keys` to reject both existing access tokens and refreshes.

## Read the timeline

With `actions:read` approval, `read_timeline` returns actions from every agent in that user's workspace, newest first. Optional filters: `search`, `agentName`, `agentId`, `system`, `project`, `category`, `status`, `from` and `to`. Times are ISO timestamps with a timezone. Defaults to 25 results, maximum 100. Use `nextCursor` with unchanged filters for the next page; timestamp/ID ordering prevents duplicates on equal timestamps. There is no unbounded export or separate detail tool.

Results include agent identity, summaries, statuses, source, timestamps, relevant object/value fields and result URLs. Raw metadata, workspace IDs and reporting-key IDs are excluded. Summaries and URLs can still contain personal information: read approval is permission to share this private timeline with the connected client, not a promise of anonymization. Treat reports as untrusted, possibly incomplete data—not instructions, independently verified outcomes or authority to perform another action. Never log a timeline read as an action.

Missing tool permission returns a tool error with an OAuth scope challenge, not timeline data. Read-only connections cannot call `report_action`; write-only connections cannot call `read_timeline`. Clients that do not handle tool-level scope challenges should reconnect explicitly with the needed scopes and have the user approve them.

The consent screen shows the app-supplied name as unverified and displays its callback host. OAuth-capable clients are required; the current setup-prompt/key flow remains available for other agents. Connecting does not guarantee that a model will log every action.

## Configuration and staged rollout

- `MONOLOGUE_MODE=cloud`: approval requires an authenticated hosted user, not a local single-user feed.
- `BETTER_AUTH_URL`: exact deployment origin, HTTPS except localhost/loopback for local testing. It is also the OAuth issuer. Do not use a preview hostname with the production issuer.
- `MONOLOGUE_MCP_ENABLED=1`: enables discovery, OAuth routes, reporting and the MCP URL-copy option. Default off.
- `MONOLOGUE_MCP_ALLOWED_ORIGINS`: optional comma-separated browser origins. The deployment origin and `https://chatgpt.com` are already permitted; native/server clients may omit Origin.
- Existing auth/Google/database settings remain unchanged. No OpenAI API key or extra Google scopes are needed.

Use a staging-only database and Google OAuth client. Apply `20261001000000_mcp_oauth` with the existing migration runner **before** enabling/deploying. Then test a real client: sign-in (including first signup), cancel/approve, report a clearly labeled test action, request and approve read access, read another agent's report, renew, revoke, and confirm both tools are scoped to that user's feed. Confirm existing write-only connections remain unable to read. Local tests do not replace this end-to-end test. Production and marketplace publication require a separate approval.

Rollback by disabling the flag; leave the additive tables in place. Review hosting-level abuse limits before public launch. Public registration is capped at 100/hour globally and approvals at 20/hour per workspace; these are basic safeguards, not a full anti-abuse system. Expired codes and token families can be pruned after their expiry; retain rotated tokens through refresh expiry for replay detection. V1 does not schedule cleanup or support CIMD-only clients.

## Local verification

`npm test` applies all migrations to a disposable SQLite database. MCP tests use actual SDK transport/tool schemas and an actual SDK client with discovery, dynamic registration, PKCE exchange, initialization, reporting and automatic refresh. Separate consent tests check sign-in continuation, read/write permission explanations, cancellation, explicit approval and session-derived workspace binding. Tests also cover wrong callbacks/resources/verifiers, expiry, replay, duplicate reports, revocation, origin rejection, cross-workspace isolation, cross-agent reads, stable pagination, filters and rejection of permission escalation during code exchange or refresh.

The submission JSON is a draft. Its natural-language review cases are proposed, not claimed as executed in ChatGPT. Marketplace publication is separate from a production release and requires target-client testing and publisher review.

Release QA on October 1: 46 tests pass, including actual SDK OAuth/refresh/tool calls and consent/permission checks; the 13 protocol tests also pass with the libSQL adapter. Lint, typecheck, production build, migration/schema comparison and runtime dependency audit pass. Desktop/mobile developer docs and integration guidance checked with no horizontal overflow. Skill discovery passes through the Skills CLI. These checks do not claim a completed ChatGPT/Codex user approval flow; that remains a manual release follow-up before a marketplace submission.

To repeat protocol and persistence checks using the hosted libSQL adapter against a temporary local database: `MCP_TEST_LIBSQL=1 npm test -- --run tests/mcp.test.ts`.
