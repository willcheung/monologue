# Monologue

**Your agent feed.**

Monologue is an open-source feed of what your AI agents did for you.

It records things agents change — emails sent, forms submitted, purchases made, code pushed, calendar events changed, transactions executed — while ignoring research, reasoning, browsing, and other internal work.

## Why

As people use more autonomous agents, their actions become scattered across different products. Monologue creates one timeline of what they changed.

## Core rule

> If your agent changed something, it shows up in Monologue.

A message sent belongs in the feed. Reading fifty messages does not. Code pushed to a remote repository belongs; local edits, commits and tests do not. The feed stays useful by staying strict about signal.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
git clone <your-monologue-repository-url>
cd monologue
npm install
cp .env.example .env
```

Set a private key in `.env`:

```dotenv
DATABASE_URL="file:./monologue.db"
MONOLOGUE_MODE="single-user"
MONOLOGUE_API_KEY="replace-this-with-a-long-random-value"
MONOLOGUE_URL="http://localhost:3000"
```

Create and seed the local SQLite database, then start Monologue:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the website or [http://localhost:3000/feed](http://localhost:3000/feed) for the feed. The SQLite file lives at `prisma/monologue.db` and is ignored by git.

## Send a test action

With the development server running and `MONOLOGUE_API_KEY` exported in your shell:

```bash
curl -X POST http://localhost:3000/api/actions \
  -H "Authorization: Bearer $MONOLOGUE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Codex",
    "verb": "pushed",
    "summary": "Pushed the first Monologue feed implementation.",
    "category": "code",
    "status": "completed",
    "system": "GitHub",
    "objectType": "commit",
    "objectName": "abc123",
    "project": "Monologue",
    "externalId": "abc123",
    "source": "self_reported"
  }'
```

The response is `{"success":true,"id":"..."}` and the action appears at the top of the feed. Sending it again returns the same ID with `"duplicate":true`.

## Connect an agent

Copy the whole [`skills/monologue`](skills/monologue) directory into your agent's supported skills directory. Configure the agent's persistent environment or secure secret store with your self-hosted instance and its ingestion key:

```dotenv
MONOLOGUE_URL="http://localhost:3000"
MONOLOGUE_API_KEY="the-key-configured-on-your-instance"
```

Keep the URL and key together and use your agent's secure configuration mechanism. For a remote agent, use the reachable HTTPS URL of your own deployment. No Monologue hosted account or marketplace plugin is required for single-user mode.

The same portable skill supports clients with native skill discovery and agents that load instructions directly. Copying only `skills/monologue/SKILL.md` works when the agent will POST directly rather than use the helper.

After any installation method, confirm `monologue` appears in the agent's available-skills list. Reload skills or start a new session when the agent builds that list at session start. Installation is not complete until the skill is discoverable.

The included helper has no dependencies:

```bash
python3 skills/monologue/scripts/report-action.py \
  --agent Codex \
  --verb pushed \
  --summary "Pushed the first Monologue feed implementation." \
  --category code \
  --system GitHub \
  --project Monologue \
  --external-id abc123
```

Reporting is required, with best-effort delivery. Capture the returned event ID; a clean helper exit can also mean delivery was skipped. Note any reporting gap without breaking the primary task.

## Hosted mode and Google sign-in

The standalone application includes both single-user mode and an optional multi-user cloud mode for your own deployment. Single-user mode uses local SQLite and `MONOLOGUE_API_KEY`. Cloud mode adds Google sign-in, personal workspaces, revocable agent keys, and SQLite-compatible Turso persistence. Plugin packaging and marketplace distribution are private and are not included in this public checkout.

Set these variables for cloud mode:

```dotenv
MONOLOGUE_MODE="cloud"
BETTER_AUTH_SECRET="replace-with-at-least-32-random-characters"
BETTER_AUTH_URL="https://monologue.example.com"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."
```

Create a Google OAuth web client and register this exact callback URL:

```text
https://monologue.example.com/api/auth/callback/google
```

Google sign-in requests only `openid`, `email`, and `profile`. It does not grant Monologue access to Gmail, Calendar, Drive, or other Google services. New users are taken to `/settings/keys`, where they can copy the setup prompt to add an agent. Someone signing up through an agent connection link returns to that link to approve automatic key creation. Returning users go to `/feed` or their requested page.

For a Vercel deployment backed by Turso:

```bash
vercel link
vercel integration add tursocloud/database
vercel env pull .env.local
npm run db:migrate:turso
```

Choose a Turso region close to the Vercel Function region. Add the remaining cloud-mode variables in Vercel, then deploy with `vercel --prod`. Apply committed Turso migrations before deploying code that depends on them; the migration runner records checksums and safely skips migrations already applied.

See [`docs/HOSTED_ARCHITECTURE.md`](docs/HOSTED_ARCHITECTURE.md) for application structure, tenant isolation rules, and deployment checks.

## API

The hosted OAuth MCP endpoint is `/mcp`; it does not accept REST API keys. Its two tools use the same action data and workspace permissions. `read_timeline` defaults to 25 results (maximum 100), supports filters and cursor pagination, and excludes raw metadata and credential identifiers. OAuth tokens cannot authenticate to REST. See [MCP setup and rollout](docs/MCP_PLAN.md) for scopes, configuration and migration requirements.

REST reporting works in single-user mode with the configured key. OAuth MCP requires your own cloud-mode deployment with browser sign-in; connect a compatible client to `https://<your-deployment>/mcp` and approve write access. Optional timeline reading needs separate read approval.

Both routes require `Authorization: Bearer <MONOLOGUE_API_KEY>`.

- `POST /api/actions` validates and creates an action. Required fields: `agentName`, `verb`, `summary`, `category`, `status`, and `system`.
- `GET /api/actions` returns newest first and accepts `agent`, `category`, `status`, `system`, `project`, `from`, `to`, and `search` query parameters.

Hosted automatic connection uses three short-lived endpoints:

- `POST /api/connect/request` starts a ten-minute connection request for an agent. It requires `agentName` and optionally accepts `platform` and `skillVersion`.
- `POST /api/connect/approve` requires a signed-in browser session and approves that request for the user's workspace.
- `POST /api/connect/poll` lets the requesting agent claim its generated key exactly once after approval.

Only hashes of the device and approval codes are stored. The long-lived API key is created at claim time, returned once to the agent, and then stored by Monologue only as a hash. Automatic keys are scoped to `actions:write`; existing and manually created keys retain read and write access for compatibility.

Monologue derives stable agent identity from the authenticated connection instead of trusting a submitted `agentId`. Older keys are attached to an Agent automatically on their next write, so installed skills remain compatible. Agent-key ingestion is always stored as `self_reported`; `verified` and `observed` are reserved for future trusted ingestion paths.

`externalId` is optional. When supplied, the tuple `(agentName, system, externalId)` is unique and retry-safe. No fuzzy deduplication is performed.

Use `url` for the action's primary destination—the commit, order, event, payment, or other changed object. Use the free-form `metadata` JSON object for provider-specific details and secondary links:

```json
{
  "url": "https://amazon.com/orders/7741",
  "metadata": {
    "orderNumber": "113-4820917-7741",
    "quantity": 2,
    "receiptUrl": "https://amazon.com/orders/7741/invoice"
  }
}
```

The detail drawer presents the primary URL as an “Open in…” button and formats metadata as readable rows.

Supported categories: `communication`, `calendar`, `purchase`, `reservation`, `finance`, `code`, `file`, `task`, `account`, `crm`, `database`, `deployment`, `form`, `other`.

Supported statuses: `completed`, `failed`, `pending`. Supported sources: `self_reported`, `verified`, `observed`.

## Architecture

```text
AI agent → Monologue skill → POST /api/actions → validation + dedupe → SQLite
                                                                  ├─ Feed
                                                                  ├─ AI Crew profiles
                                                                  ├─ Weekly agent ledger
                                                                  ├─ Filters + search
                                                                  ├─ Action details
                                                                  └─ Browser-generated static share cards
```

Next.js renders the product directly from one SQLite-compatible database through Prisma. Local mode uses one SQLite file; hosted mode uses workspace-scoped libSQL/Turso. The weekly ledger is aggregated live from actions. Share cards are rendered as static PNGs in the browser and are never uploaded or connected to future activity. The API and product pages use the same validation and data-access layer, with no queue, cache, analytics service, or charting framework.

Deployment architecture and the Google sign-in boundary are documented in [`docs/HOSTED_ARCHITECTURE.md`](docs/HOSTED_ARCHITECTURE.md). Both runtime modes share the same application, API, persistence layer, and portable skill.

## Development checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

To recreate the database from scratch and reseed it:

```bash
npm run db:reset
```

## V2 extension points

The Action API and `source` field can later accept webhooks, connectors, MCP, browser agents, or native integrations without changing what the consumer sees. A database migration can move the schema to Postgres when needed. Those transports—and accounts, teams, OAuth, policies, analytics, agent metrics, and automatic grouping—are intentionally outside V1.

## License

MIT


### Shared-workspace development preview

Run `npm run dev:workspace`, then open `http://localhost:3100/feed`. This starts the same application with an isolated SQLite database and synthetic sample accounts. Use the sample-account selector to try personal/shared feeds, invitations, member removal, assistant destinations, and daily report settings. Team settings include a development-only Free/Plus switch.

The launcher suppresses hosted database/provider credentials and binds to loopback. No production data is loaded, no email or Slack messages are sent, and no daily delivery job or checkout is connected. Stop with Ctrl+C. Development account switching is unavailable in production. See [workspace architecture](docs/HOSTED_ARCHITECTURE.md#shared-workspaces) for authorization and migration details.
