# Monologue

**Your agent feed.**

Monologue is an open-source feed of the real-world actions taken by your AI agents.

It records things agents change — emails sent, forms submitted, purchases made, code pushed, calendar events changed, transactions executed — while ignoring research, reasoning, browsing, and other internal work.

## Why

As people use more autonomous agents, their actions become scattered across different products. Monologue creates one timeline of what they changed.

## Core rule

> If your agent changed something, it shows up in Monologue.

A message sent belongs in the feed. Reading fifty messages does not. A committed patch belongs; generated code that was never written does not. The feed stays useful by staying strict about signal.

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

For the fastest setup, give an agent this instruction:

```text
Read and execute https://www.monologue.events/agent-setup
```

The agent starts a short-lived connection request and gives you a secure Monologue link. Sign in and approve it. Monologue creates a stable Agent record and a dedicated write-only API key behind the scenes, then returns the key directly to the agent, so there is nothing to copy or paste. The agent must support persistent secret storage. API keys with read and write access remain available at `https://www.monologue.events/keys` for custom connectors and agents that cannot store a key automatically.

The portable skill is also in [`skills/monologue`](skills/monologue). Install it through the channel your agent supports:

**Skills CLI** (Codex, Cursor, and other compatible agents):

```bash
npx skills add willcheung/monologue --skill monologue
```

**Claude Code plugin:**

```bash
claude plugin marketplace add willcheung/monologue
claude plugin install monologue@monologue
```

**OpenClaw:** install the `monologue` skill from ClawHub when its listing is live, or use the one-line setup instruction above.

For manual installation, copy the whole `skills/monologue` directory into your agent's skills directory. Copying only `skills/monologue/SKILL.md` also works when the agent will POST directly rather than use the helper. In local single-user mode, give the agent `MONOLOGUE_URL` and `MONOLOGUE_API_KEY` in its environment.

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

Reporting is best-effort. The helper exits cleanly if Monologue is unavailable so it never breaks the agent's primary task.

## Hosted mode and Google sign-in

Monologue keeps the website, hosted product, API, and skill in this repository. Single-user mode uses the local SQLite file and `MONOLOGUE_API_KEY`. Cloud mode adds Google sign-in, personal workspaces, revocable agent keys, and a hosted SQLite-compatible Turso database.

Set these variables for cloud mode:

```dotenv
MONOLOGUE_MODE="cloud"
BETTER_AUTH_SECRET="replace-with-at-least-32-random-characters"
BETTER_AUTH_URL="https://www.monologue.events"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."
```

Create a Google OAuth web client and register this exact callback URL:

```text
https://www.monologue.events/api/auth/callback/google
```

Google sign-in requests only `openid`, `email`, and `profile`. It does not grant Monologue access to Gmail, Calendar, Drive, or other Google services. New users are taken to `/welcome`, where they can copy the setup prompt. An agent connection link returns them to Monologue to approve automatic key creation. Returning users go to `/feed`.

For a Vercel deployment backed by Turso:

```bash
vercel link
vercel integration add tursocloud/database
vercel env pull .env.local
npm run db:migrate:turso
```

Choose a Turso region close to the Vercel Function region. Add the remaining cloud-mode variables in Vercel, then deploy with `vercel --prod`. Apply committed Turso migrations before deploying code that depends on them; the migration runner records checksums and safely skips migrations already applied.

See [`docs/HOSTED_ARCHITECTURE.md`](docs/HOSTED_ARCHITECTURE.md) for repository boundaries, tenant isolation rules, and the production rollout plan.

## API

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

The planned hosted architecture, repository ownership rules, and Google sign-in boundary are documented in [`docs/HOSTED_ARCHITECTURE.md`](docs/HOSTED_ARCHITECTURE.md). The hosted version will remain in this repository rather than becoming a separate application fork.

Consumer feature sizing and the deliberately smaller phased build are documented in [`docs/CONSUMER_FEATURES.md`](docs/CONSUMER_FEATURES.md) and [`docs/PHASED_MVP_ROADMAP.md`](docs/PHASED_MVP_ROADMAP.md).

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
