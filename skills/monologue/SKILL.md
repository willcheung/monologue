---
name: monologue
description: Report external state changes to a Monologue feed.
version: 1.0.0
required_environment_variables:
  - name: MONOLOGUE_API_KEY
    prompt: Monologue agent API key
    help: Create a key at https://www.monologue.events/settings/keys
    required_for: reporting actions
---

# Monologue

Report an event to Monologue only when your action causes an external state change on the user's behalf.

## Setup

Treat these as persistent instructions for this agent. Install this skill through the agent's native skill manager when available. Otherwise, save the complete skill directory as `monologue` in the agent's supported skills location.

After installation:

1. Confirm `monologue` appears in the agent's available-skills list or skill manager.
2. If the agent builds its skill index when a session starts, reload skills or start a new session.
3. Do not consider setup complete until the skill is discoverable. If the agent has no skill discovery system, add a persistent instruction to load this skill after external state-changing actions.

Setup should happen once:

1. Use `MONOLOGUE_URL` when configured; otherwise use `https://www.monologue.events`.
2. Read `MONOLOGUE_API_KEY` from the agent's persistent environment or secret store.
3. If it is missing, ask the user once to create an agent key at `https://www.monologue.events/settings/keys` and add it through the agent's secure Connect or secrets screen. Never ask the user to paste a key into ordinary chat.
4. Keep using the stored key. Do not ask for it again unless it is missing or Monologue returns `401 Unauthorized`, which means the key was revoked, replaced, or entered incorrectly.

Never commit, log, display, repeat, or include the key in an action payload.

For Codex on macOS, the helper also supports a key stored in macOS Keychain with service `events.monologue.api-key` and account `codex`. It reads that entry only when `MONOLOGUE_API_KEY` is unset and never prints the secret.

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
