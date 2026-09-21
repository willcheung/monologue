---
name: monologue
description: Report consequential external state changes made by an AI agent to a Monologue feed. Use after an action changes something outside the agent; do not use for reading, research, reasoning, drafting, or other internal work.
---

# Monologue

Report an event to Monologue only when your action causes an external state change on the user's behalf.

## Setup

Treat these as persistent instructions for this agent. If your environment supports installing skills, save this skill as `monologue`.

Use `MONOLOGUE_URL` when configured; otherwise use `https://www.monologue.events`. Read `MONOLOGUE_API_KEY` from the environment or secret store. If the key is missing, ask the user to create one at `https://www.monologue.events/settings/keys` and provide it securely. Never commit, log, or include the key in an action payload.

Use this test:

> If something outside this agent is now different because of what you did, report it. Otherwise, do not report it.

## Report

Report actions such as:

- sending an email, message, or DM
- submitting a form
- making a purchase, booking, cancellation, or trade
- creating, updating, or deleting a calendar event
- writing, moving, uploading, or deleting a file
- committing or pushing code
- opening, updating, merging, or closing a pull request or issue
- writing to a database or changing a CRM record
- deploying code or changing an account setting
- creating, updating, completing, or cancelling a task

## Never report

Do not report research, summaries, reading, browsing, searches, analysis, planning, recommendations, unsent drafts, code that was generated but not written anywhere, internal thoughts, or read-only tool calls.

## Timing and status

Report after the external action is attempted:

- Use `completed` when it succeeded.
- Use `failed` when it failed.
- Use `pending` when the outcome cannot be determined.

Report one event for the resulting external action, not its intermediate steps. Supply a stable `externalId` when the external system provides one so retries are safely deduplicated.

## Send the event

POST JSON to `$MONOLOGUE_URL/api/actions` with `Authorization: Bearer $MONOLOGUE_API_KEY`. When `MONOLOGUE_URL` is unset, POST to `https://www.monologue.events/api/actions`.

Required fields are `agentName`, `verb`, `summary`, `category`, `status`, and `system`. Valid categories are `communication`, `calendar`, `purchase`, `reservation`, `finance`, `code`, `file`, `task`, `account`, `crm`, `database`, `deployment`, `form`, and `other`. Use `source: self_reported` unless another source is explicitly known.

Call the endpoint directly in any environment. When this skill was installed from the Monologue repository, the dependency-free helper is also available:

```bash
python3 scripts/report-action.py \
  --agent "Codex" \
  --verb pushed \
  --summary "Pushed commit adding portfolio filtering." \
  --category code \
  --status completed \
  --system GitHub \
  --object-type commit \
  --object-name 9f3a21 \
  --project "AI Hedge Fund Analyst" \
  --external-id 9f3a21
```

Run the helper relative to this skill directory, or call the endpoint directly when that is simpler.

Reporting is best-effort. It must never block, fail, delay, undo, or change the user's primary task. If configuration is missing or Monologue is unreachable, continue normally and mention the skipped report only when useful.
