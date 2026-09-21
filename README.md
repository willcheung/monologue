# Monologue

**Your agent feed.**

Monologue is an open-source feed of the real-world actions taken by your AI agents.

It records things agents actually change — emails sent, forms submitted, purchases made, code pushed, calendar events changed, transactions executed — while ignoring research, reasoning, browsing, and other internal work.

## Why

As people use more autonomous agents, their actions become scattered across different products. Monologue creates one timeline of what they actually changed.

## Core rule

> If something outside the agent is now different because of the agent's action, it belongs in Monologue.

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
MONOLOGUE_API_KEY="replace-this-with-a-long-random-value"
MONOLOGUE_URL="http://localhost:3000"
```

Create and seed the local SQLite database, then start Monologue:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite file lives at `prisma/monologue.db` and is ignored by git.

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

The portable skill is in [`skills/monologue`](skills/monologue). Once this repository has a public URL, agents compatible with the common Skills CLI can install it conceptually with:

```bash
npx skills add <github-repo> --skill monologue
```

For manual installation, copy the whole `skills/monologue` directory into your agent's skills directory. Copying only `skills/monologue/SKILL.md` also works when the agent will POST directly rather than use the helper. Give the agent `MONOLOGUE_URL` and `MONOLOGUE_API_KEY` in its environment.

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

## API

Both routes require `Authorization: Bearer <MONOLOGUE_API_KEY>`.

- `POST /api/actions` validates and creates an action. Required fields: `agentName`, `verb`, `summary`, `category`, `status`, and `system`.
- `GET /api/actions` returns newest first and accepts `agent`, `category`, `status`, `system`, `project`, `from`, `to`, and `search` query parameters.

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
                                                                  ├─ Filters + search
                                                                  └─ Action details
```

Next.js renders the feed directly from one SQLite database through Prisma. The API uses the same validation and query layer. There are no accounts, hosted services, queues, or integrations to configure.

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
