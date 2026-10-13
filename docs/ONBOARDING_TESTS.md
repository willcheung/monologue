# Onboarding verification

Onboarding has three separate outcomes: valid instructions, a working connection,
and an agent that discovers and follows the reporting skill in a later session.
Passing one does not establish the others. Keep these checks in the existing
Vitest suite; there is no second service or production test endpoint.

## Available commands

| Command | What it proves |
| --- | --- |
| `npm run test:onboarding` | Instruction and setup-context contracts for every chooser option; canonical skill delivery; existing API approval/auth regressions; real HTTP OAuth/MCP lifecycle below. No installed agents or model credentials required. |
| `npm run test:onboarding:clients` | Installed Claude Code and Codex accept the exact generated add commands, retain an unrelated connection, read the saved configuration in a new process, and expose the documented login command. |
| `MONOLOGUE_TEST_CLIENTS=codex npm run test:onboarding:clients` | Run only the requested installed client; use `claude-code` for Claude Code. |
| `npm run test:onboarding:sessions` | Opt-in model sessions for Claude Code and Codex: explicit skill load, process exit, then an unprompted task/report in a new conversation using the same installed skill. Requires model authentication. |
| `npm run test:onboarding:install` | Interactive, opt-in real-client installation from the website clipboard, native browser OAuth approval, and a task/report after restart in another project. Requires model authentication and an operator. |
| `npm run test:onboarding:app-server` | Opt-in installed Codex app-server OAuth, tool/skill discovery across process restart, and real MCP read/report calls. No model account or desktop UI automation. |
| `npm test` | All routine regression checks, including the HTTP lifecycle. Native compatibility and model sessions are explicitly skipped unless enabled. |

The native lane is opt-in so ordinary contributors and CI do not need proprietary
clients. An explicitly selected but missing/broken client **fails**. Output records
the installed version; it never describes an unrun client as verified. Commands
have deadlines, use temporary child-process profiles and an allowlisted environment,
and clean up profiles and sockets. No model requests or account login occur.
By default the lane uses the terminal's client, excluding npm's injected ancestor
`node_modules/.bin` paths. For a pinned installation, set `MONOLOGUE_CLAUDE_BIN`
or `MONOLOGUE_CODEX_BIN` to its absolute executable path. An older version without
the documented login command fails rather than being silently accepted.
This is configuration compatibility, not a claim that a client completed OAuth.

## Independent protocol checks

`tests/onboarding-protocol.test.ts` starts an ephemeral loopback HTTP socket, uses
the existing production route handlers, applies the committed migrations to a new
SQLite file, and runs the MCP SDK client with its normal network transport. It does
not replace `fetch` or mock successful tool results. Only the database binding and
the human consent decision are fixtures. There is no production database access.

The checks follow one connection through discovery, DCR, PKCE/token exchange,
tool discovery, reporting, a fresh SDK client with saved credentials, automatic
refresh, retry deduplication, timeline reads and revocation. Assertions query the
database independently: the returned event ID must exist in the selected workspace,
the retry must return the same ID, the fresh client must not create another grant,
and a foreign workspace's marker must never appear. Limited grants must remain
limited after reconnect and cannot gain permissions through token refresh.

The fetched skill must equal the canonical file. Connecting and reading must not
create activity. These fixtures intentionally bypass human sign-in/consent UI;
they do not claim browser coverage or prove native-client skill discovery.

## Fresh-session evaluation

`tests/onboarding-sessions.test.ts` implements the first real-model lane. It copies
the complete canonical skill into each client's supported personal skills location
inside a temporary profile. It runs an explicit read-only discovery conversation,
waits for that process to exit, then launches a new conversation with the same
profile. The second prompt only asks to create a task and return its URL; it never
names Monologue, requests a report, or repeats the setup instructions.

The task is created through a separate loopback MCP fixture service. Its stored
receipt is the ground truth. The agent calls the production Monologue MCP handler
with a real OAuth token bound to its synthetic workspace. The grader requires:

- Different native session IDs, a successful initial skill load, and skill discovery
  in the fresh conversation (native catalog or a successful skill-file read).
- One task receipt and exactly one stored Monologue event, with matching object ID,
  URL, system, status, category and workspace/user attribution.
- Successful tool results and actual HTTP calls to the task and reporting services.
- No events during discovery and no changes to the installed canonical skill.

Claude may discover the skill in its startup catalog and report through the MCP
tools without explicitly rereading the skill body. The evidence records discovery
and body loading separately; neither is inferred from the model's final prose.

The harness preconfigures the authenticated fixture connection. This tests native
skill persistence and reporting, **not** the complete copied-prompt installation,
native OAuth login or browser consent experience. Those are separate checks.

Use `MONOLOGUE_TEST_CLIENTS=codex` or `claude-code` to select one client. Authenticate
through `CODEX_API_KEY` / `OPENAI_API_KEY` for Codex, or `ANTHROPIC_API_KEY` /
`CLAUDE_CODE_OAUTH_TOKEN` for Claude. An explicitly provided absolute
`MONOLOGUE_CODEX_AUTH_FILE` can supply a Codex auth cache instead. Only that auth
cache is copied with owner-only permissions; existing settings, tools and history
are never copied. Profiles and databases are removed at the end. Never put a
credential in a prompt, command argument, committed file or test output.

The runner does not search credential stores. A local operator can inject a
supported credential securely before launching it. Missing authentication is a
blocked result and a failing opted-in test, not a pass. Native executable overrides
also work here. Optional `MONOLOGUE_EVAL_CLAUDE_MODEL` and
`MONOLOGUE_EVAL_CODEX_MODEL` select a model; otherwise each CLI's default applies.
Each process has a 120-second deadline and 2 MB trace limit; Claude also has a
$1 per-session ceiling. Use external provider budgets for a monetary Codex cap.
No dangerous permission-bypass flags are used. Claude has only skill reading and
the three named fixture/reporting tools allowed; Codex retains its read-only
filesystem sandbox and explicitly approves only the disposable create_task tool.
This approval is confined to the temporary test profile.

Set `MONOLOGUE_EVAL_REPORT` to a path under ignored `private/` to retain sanitized
observations and fixture IDs. Raw transcripts, model credentials and tokens are
not included. The observer has routine regression tests proving that a final
success claim or failed skill read cannot masquerade as a successful load.

The MCP regressions also cover overlapping authorization writes: a failed metadata
write, rollback after grant/code creation, bounded lock retries, and non-lock
failures. `npm run test:libsql` additionally holds a real write lock from another
connection and requires recovery through the hosted database adapter.

## Copied-prompt installation and native OAuth

`tests/onboarding-install.test.ts` starts the actual Next development app on
`http://127.0.0.1:3112` with a disposable SQLite database and synthetic development
user. It fails if the port is occupied. Production credentials and database
configuration are excluded. Google sign-in is deliberately not configured.

Run `npm run test:onboarding:install` with the same explicit model authentication
and executable overrides as the session lane. The runner prints two URLs:

1. Open the application’s integrations page, select the requested client and click
   **Copy setup instructions**.
2. Paste that clipboard into the printed local test handoff form and submit it.
   The fixture normalizes browser line endings and compares the entire prompt to
   `agentSetup(...)`. It sends the unchanged prompt to the real agent.
3. When native login opens, approve only the disposable **Personal** workspace.
   If the client prints its authorization URL, open that exact URL. Never approve
   a production or personal feed as a substitute.

The profile initially has neither a Monologue skill nor a connection. The agent
must install the canonical skill, configure native MCP, and pause for approval.
The runner then performs the interactive terminal login handoff. It validates
native token exchange and the selected workspace/scopes through the independent
database. A new process in a different project must discover the installed skill,
create one fixture task and report its matching receipt exactly once without a
Monologue reminder. Setup itself must create no reports. The unrelated fixture
connection must still work. A callback success page alone is never a pass.

Both clients retain their normal approval safeguards. The temporary Codex profile
allows writes only within its disposable directories and approves the one fixture
task tool. Claude allows setup tools and the named fixture/Monologue tools, with a
$3 per-session cap. Each model process has a four-minute deadline and 3 MB trace
limit; operator clipboard and login steps have ten- and five-minute limits.
Native login uses a Python pseudo-terminal, so this lane also requires Python 3.

On macOS, changing `HOME` hides the login Keychain from the system `security`
utility. The isolated Claude profile therefore uses a small test-only wrapper:
only the disposable profile’s hashed credential service is permitted, and only
that utility receives the operator’s home location. Agent files and skills remain
in the temporary home. The runner removes the profile-specific Keychain entry
on cleanup. It never seeds a Monologue token or changes the installed CLI.
Codex uses its supported file credential store inside its temporary profile.

Cleanup logs out, stops child processes and removes the database and profiles.
`MONOLOGUE_EVAL_REPORT` retains sanitized evidence only under ignored `private/`.
Optional `MONOLOGUE_INSTALL_DEBUG=1` emits a filtered Claude storage diagnostic;
the raw diagnostic file is deleted. Do not upload full terminal captures because
live native login output contains temporary authorization URLs.

This lane covers the real consent screen and native OAuth exchange against a
synthetic local user. Separately verify Google sign-in on an existing configured
installation with a dedicated QA account and a human approval checkpoint. Record
that deployment separately: it cannot establish that unshipped UI is live.

## Remaining release scenarios

Use the same scenario set and small client adapters as coverage expands. The install lane reuses
`agentSetup(...)` for the full copied-prompt evaluation; the session lane installs
the canonical skill directly so it can isolate persistence.

Codex supports `codex exec --json`; Claude Code supports print mode with structured
output. Grade observed tool calls and database state, not the model's final claim.
Use the installed CLI help to choose supported flags; do not disable safeguards
to make a case pass. Supply model credentials explicitly to a disposable runner
with a time/token or cost cap; copy only an explicitly selected auth cache when needed, never a developer's everyday agent configuration.

| Scenario | Independent pass evidence |
| --- | --- |
| Fresh setup from the copied website prompt | Canonical skill installed once; expected endpoint stored; requested scopes shown at consent; native tool discovery succeeds. Agent pauses for the human approval boundary. |
| Repeat setup | Existing working connection reused; unrelated settings preserved; no duplicate skill, connection or permission expansion. |
| New conversation, same profile (implemented) | Skill appears in the client's discovery trace and a real reporting tool call succeeds without pasting the setup prompt again. |
| Authorized disposable action (implemented) | Use a separate local fixture service to create a message/task. Its receipt is the ground truth. The agent reports that receipt's outcome, URL and ID; Monologue stores one matching event in the intended fixture workspace. |
| Retry / pending / failure | Retry retains the event ID; pending and failed fixture outcomes are not reported as completed. |
| Read-only work (discovery covered) | Research or a draft creates no event. Reading Monologue does not create another report. |
| Wrong workspace or removed membership | Foreign records remain absent; reporting/refresh after revocation is rejected. |
| Older limited grant | Scope stays limited; the agent explains the missing permission and asks for reapproval instead of claiming success. |
| MCP unavailable / API-only instance | The canonical secure API setup remains on the intended instance; no key is printed or requested in chat. |

For automatic consent, use only a synthetic account in a disposable local
application instance. Separately test the real browser consent screen with a
dedicated QA account and a human approval checkpoint. Never auto-approve a personal
feed. The fixture action is test data, never a real email, post or customer event.

The release result should contain one row per client/version and scenario:
`passed`, `failed`, `blocked` (for example, missing login) or `not_run`, plus the
failing stage and sanitized evidence. Record skill version/hash, application
revision and dirty state, elapsed time, tool-call observations and fixture event ID.
Do not preserve raw tokens, credentials, OAuth URLs or complete transcripts in
public CI artifacts. Keep account-specific QA evidence under ignored `private/`.

## Client coverage and browser checks

| Client | Routine coverage now | Native evaluation path |
| --- | --- | --- |
| Claude Code | Prompt contract and installed CLI configuration lane | Fresh-session reporting and interactive copied-prompt/native OAuth lanes implemented; real Google sign-in is separate. |
| Codex | Prompt contract and installed CLI configuration lane | Fresh-session reporting and interactive copied-prompt/native OAuth lanes implemented with trace and database assertions. |
| Cursor | Prompt/config guidance contract | Dedicated editor profile plus UI checks; only add a CLI adapter after confirming equivalent MCP/skill support. |
| Hermes | Prompt/profile guidance contract | Add a native adapter for a supported installed version; test the actual profile/gateway that executes tasks. |
| OpenClaw | Prompt/runtime guidance contract | Add an adapter for the selected agent/runtime; verify skill allowlists and avoid sharing operator credentials. |
| Muse | Prompt and supported-fallback guidance contract | Guided UI check until a suitable supported automation interface is established. |

The protocol lane is shared server coverage, **not six native-client passes**.
Claude and ChatGPT marketplace connectors remain outside the visible chooser.

For a later browser lane, run the actual Next app with a temporary database. Cover
the homepage's two controls, Add agent, welcome, integration hub and client guides,
developers/templates, and empty Feed/My agents. Exercise all choices; observe the
clipboard write against the selected client/workspace; check same-instance skill
links, loaded logos, keyboard dismissal, 390px overflow and homepage button
alignment. These remain browser QA checks until that lane is implemented.

References: [OpenAI skill evaluations](https://developers.openai.com/blog/eval-skills)
and [Claude Code programmatic use](https://code.claude.com/docs/en/headless).

## Native completion and desktop protocol

The consent regressions require explicit approval, preserve remote redirects,
return native receipt IDs, and keep operational failures recoverable. Receipt
checks use actual OAuth code/token records: approval alone is pending; exchange
confirms connection; another user or removed membership cannot read it; revoked
and expired connections never show success. Read-only grants keep truthful copy.

`npm run test:onboarding:app-server` uses the installed Codex executable (or
`MONOLOGUE_CODEX_BIN`) in a disposable HOME/CODEX_HOME. It invokes the documented
stdio app-server protocol used by desktop integrations. It drives real native
DCR/PKCE and the loopback callback against our HTTP fixture, restarts the process,
checks the canonical skill from another project, and calls read/report through
native MCP tooling. A disposable task receipt and database assertions require one
matching report, including retry deduplication. It makes no model calls and never
attaches to the running desktop app. Simulated consent is confined to the fixture;
this lane does not claim desktop UI, Google, or browser-popup coverage.

Separately run the local browser consent with the native client and confirm the
Monologue success screen, callback handoff, correct feed link, 390px layout,
receipt reload, and unavailable/expired/revoked recovery. Check desktop Settings
and a fresh conversation manually when desktop UI automation is unavailable.

Popup recovery checks must cover a blocked window (`window.open` returning null),
a browser policy exception, and closing the callback before token exchange.
The explicit **Finish connecting** link must remain usable even when the receipt
status request fails. Confirm pending stays pending until exchange, then shows
the selected feed without creating another approval. Distinguish simulated
popup-policy results from actual browser permission settings. Temporary fixture
connections should be revoked after authenticated discovery/read checks.
