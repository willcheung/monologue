---
name: monologue
description: Use after meaningful agent-caused external changes or attempts, including emails sent, purchases made, remote repository changes, social posts, deployments, and trades. Monologue shows what your AI agents did for you in one private feed. Applies to interactive agents, delegated/background agents, and agentic scheduled jobs.
metadata:
  version: "1.2.8"
---

# Monologue

Report meaningful external state changes on the user's behalf, including failed or unresolved attempts. This skill does not authorize the underlying action or bypass permissions.

## Mandatory completion check

Before a final response, delegated handoff, or autonomous run completes:

1. Identify each meaningful external action attempted by you or your delegates, including failures and unknown outcomes. Verify the result from available evidence.
2. Report each meaningful attempt and its outcome. Do not collapse changes in different systems into one event. For example, pushing code to GitHub and deploying it on Vercel are two events.
3. When several low-level operations produce one outcome in the same system, report the outcome once instead of reporting every intermediate step.
4. Do not report the request that sends an event to Monologue; otherwise reporting would create a loop.

Capture Monologue's returned event ID before claiming reporting is complete. A helper's zero exit code is insufficient: it can also mean reporting was skipped. If delivery remains unavailable after a bounded attempt, finish the primary task and explicitly note the reporting gap.

## Setup

Treat these as persistent instructions for this agent. Install this skill through the agent's native skill manager when available. Otherwise, save the complete skill directory as `monologue` in the agent's supported skills location.

After installation:

1. Confirm `monologue` appears in the agent's available-skills list or skill manager.
2. If the agent builds its skill index when a session starts, reload skills or start a new session.
3. Do not consider setup complete until the skill is discoverable in the execution context, including workers and scheduled agent runs. If the agent has no skill discovery system, add a persistent instruction to load this skill after external state-changing actions.

Setup should happen once. Connect automatically when no key is configured:

1. Use `MONOLOGUE_URL` when configured; otherwise use `https://www.monologue.events`.
2. Read `MONOLOGUE_API_KEY` from the agent's persistent environment or secret store. If absent from the current process, check the task's documented configuration, including relevant `.env` / `.env.local` files, before declaring it missing. Load the key securely into the reporting process; the helper does not load env files automatically. Use a safe env-file loader, not shell execution. Preserve the configured key/URL pairing. Do not scan unrelated files or expose secrets.
3. If no usable credential is configured and a user is available to approve, `POST` `{"agentName":"<this agent's name>","platform":"<agent platform when known>","skillVersion":"1.2.8"}` to `$MONOLOGUE_URL/api/connect/request`. Examples of a platform are `Codex`, `Claude Code`, `Muse`, `Hermes`, or `OpenClaw`. Omit `platform` when it is not reliably known.
4. Keep the returned `deviceCode` private. Show the user only the returned `verificationUrl` and ask them to open it and approve the connection. Do not show or repeat any API key.
5. Every `interval` seconds, `POST` the returned `requestId` and `deviceCode` to `$MONOLOGUE_URL/api/connect/poll`. A `202` response means approval is still pending. Stop when the request succeeds, expires, or ten minutes pass.
6. On success, save the returned `apiKey` as `MONOLOGUE_API_KEY` in the agent's persistent secret store. Never print, display, log, or send it in ordinary chat.
7. If the agent cannot securely store the returned key, output this exact URL on its own line without shortening, paraphrasing, or omitting `https://`:

   `https://www.monologue.events/keys`

   Explain that the user can sign in there, create an API key, and enter it through the agent's secure credentials screen. Never refer only to “Settings” or assume the user already knows the Monologue website address.
8. Keep using the stored key. A `401 Unauthorized` means the credential was rejected; check the key/URL pairing before reconnecting. Missing injection or denied access is not proof a key is missing or revoked. Unattended runs must record setup problems rather than start an approval flow or wait for a user.

Never commit, log, display, repeat, or include the key in an action payload.

The connection identifies this agent to Monologue. Continue sending `agentName` for API compatibility, but Monologue may use the authenticated connection's stable agent identity and name instead. Automatic connection keys can add actions but cannot read the shared feed.

For Codex on macOS, the helper also supports a key stored in macOS Keychain with service `events.monologue.api-key` and account `codex`. It reads that entry only when `MONOLOGUE_API_KEY` is unset and never prints the secret.

Use this test:

> If something outside this agent is now different because of what you did, report it. Also report meaningful attempts that failed or have an unknown outcome. Otherwise, do not report it.

## Report

Report actions such as:

- sending an email, message, or DM
- publishing, scheduling, editing, or deleting a social post or comment
- submitting a form
- making a purchase, booking, cancellation, trade, payment, refund, or subscription change
- creating, updating, submitting, publishing, or removing a marketplace listing
- creating or updating an order, shipment, fulfillment, or payout
- creating, updating, or deleting a calendar event
- writing, moving, uploading, or deleting a file
- committing or pushing code
- opening, updating, merging, or closing a pull request or issue
- writing to a database or changing a CRM record
- deploying code or changing an account setting
- creating, updating, completing, or cancelling a task

For software work, do not report local file edits, generated patches, local commits, builds, tests, linting, typechecks, or other intermediate development. Report when code is pushed to a remote repository, a pull request or issue changes, a release is published, or code is deployed to a shared or production environment.

Software example: edit and test code locally → do not report; push to GitHub and deploy to Vercel → report two separate outcomes.

## Never report

Do not report research, summaries, reading, browsing, searches, analysis, planning, recommendations, unsent drafts, code that was generated but not written anywhere, internal thoughts, or read-only tool calls.

Exclude independently running deterministic automation, even if an agent created it. Creating or changing that automation can qualify. An LLM agent directing tools, scripts, or delegates during its run still owns the resulting actions, including in scheduled jobs. A plan that was never attempted is not a failed action.

## Timing and status

Report immediately after the external write or submission returns and before composing the final response to the user. Reporting is part of completing the action, including when the result is unexpected or still awaiting review.

- Use `completed` when it succeeded.
- Use `failed` when it failed.
- Use `pending` when the outcome is unknown or it entered an unresolved external state, such as awaiting marketplace review, payment settlement, or another party's approval. A timeout is not proof of failure.

Describe the state that actually exists. For example, a listing accepted for review is `submitted` with `status = pending`, not `published`. If a later agent action publishes it, report that as a separate completed action.

Trading example: research or a recommendation → do not report; submitting, modifying, or cancelling an order → report the outcome. An accepted order is not a confirmed fill.

Report one event for the resulting external action, not its intermediate steps. Supply a stable `externalId` when possible and reuse it for reporting retries. Dedupe uses agent identity/name, system, and `externalId`; retries do not update existing events. Distinct actions on one object need distinct IDs. Never repeat the external action to retry reporting.

When available, include a direct link to the changed object in `url`, such as a pull request, commit, deployment, order, booking, receipt, sent message, or calendar event. Put useful secondary links in top-level `metadata` fields such as `receiptUrl`. When an update has an obvious known change, `metadata` may also include `changedField`, `before`, and `after`; never infer or reconstruct a previous value. Never invent a URL or include secrets, temporary signed URLs, or credential-bearing links. Omit unavailable fields and continue reporting normally.

## Delegated work

Choose one reporting owner: the acting agent with secure access, otherwise the parent. Do not assume workers inherit skills or credentials, and never pass keys in prompts. The child returns the action's outcome, original time, system and external ID, plus the Monologue event ID or a reason delivery is unconfirmed. The parent checks receipts, reports evidenced missing actions, and does not duplicate confirmed reports. Retry uncertain delivery only with the same identity and external ID; otherwise note the gap.

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

Run the helper relative to this skill directory, or call the endpoint directly when that is simpler. Include `occurredAt` when reporting a past action.

Reporting is best-effort delivery, not an optional step. Use short timeouts and bounded retries; never block indefinitely, undo, or change the primary task because reporting failed. Record any reporting gap in the final response, parent handoff, or job result.
