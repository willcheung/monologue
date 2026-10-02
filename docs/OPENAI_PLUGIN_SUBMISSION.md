# Submit Monologue to OpenAI

Build: `npm run plugin:package`

Upload **`dist/openai-plugin/monologue-1.0.0.zip`**, not the repository ZIP or `chatgpt-app-submission.json`. That JSON remains an internal tool/review draft, not an installable manifest. The package version is `1.0.0`; the bundled canonical skill is currently `1.2.10`. No server changes or deployment are required to create this package.

## What's included

- Root `plugin.json`: listing, three starter prompts, five positive and three negative review cases.
- Root `mcp.json`: `https://www.monologue.events/mcp`, using OAuth discovery without embedded credentials.
- Canonical Monologue skill, interface label and existing reporting helper.
- Current 256px/512px logo marks for both themes and MIT license.

No hooks, private ChatGPT QA identifiers, personal screenshots, feed data or credentials are included. The packager copies only explicitly listed files and creates a fresh ZIP. Review prompts are an inventory, not a claim that these exact packaged workflows have passed. The previous live MCP evaluation is recorded separately in `MCP_PLAN.md`.

## Your manual steps

The manifest's internal `name` is `app-6ab9600c375481919d9b0e301e480292`, matching the existing OpenAI plugin. Its public display name and bundled skill name remain Monologue and `monologue`. Keep that internal identifier when uploading updates to this listing.

1. Open [OpenAI Platform Plugins](https://platform.openai.com/plugins), select the owning organization/project and verified publisher identity, then **Upload new or existing plugin** → upload the ZIP. This creates a draft, not a public listing.
2. In **Metadata & Skills**, wait for the scans. Copy any findings back to Codex. Listing changes require editing `packaging/openai/plugin.json`, rebuilding and reuploading. GitHub Issues is the current public support page; private support email is `support@monologue.events`.
3. In **MCPs**, connect the declared HTTPS endpoint with OAuth. Complete the exact domain-verification challenge provided by the portal. Do not use the private Monologue QA app ID or paste an API key. If the portal needs client credentials, use its secure fields and the existing supported OAuth registration method.
4. Provide a dedicated reviewer account in the dashboard's secure Review details form. Use sample data only, including reports from at least two agents and a GitHub/code report. Run the first two positive cases in order with the same connected agent. Never use Will's personal feed or credentials. Google is currently the only sign-in method: confirm the reviewer can sign in without private MFA approval, email/SMS codes or other inaccessible steps. If that is impossible, reviewer access is a blocker requiring a separately designed authentication change.
5. Install/test the combined package in a fresh ChatGPT/Codex conversation before submitting. Run all five positive and three negative cases with the review account, verify automatic skill activation and secure setup, and record the results. Also exercise first-time signup, refresh and revocation. Existing server-only tests do not prove the installed plugin behaves correctly.
6. Record a short walkthrough of connection approval, reporting, deduplication and reading. Add its accessible URL to `extensions.com.openai.review.demo_recording_url` in `packaging/openai/plugin.json`, rebuild and reupload. The current portal explicitly asks for this manifest field. No placeholder URL is shipped.
7. Confirm country availability and complete the policy attestations. Country targeting is intentionally not selected in the package. Submit for review only after required scans and materials are ready. Approval and publication are separate steps.

## Repeatable review checks

Run `npm run test:plugin` for packaging plus protocol regression checks. Repeat with `MCP_TEST_LIBSQL=1 npm run test:plugin` to exercise the hosted libSQL adapter against a temporary local database. Both commands create isolated test data; neither writes to production or invokes an LLM.

The six marketplace-specific protocol checks in `tests/mcp.test.ts` exercise the five positive tool behaviors and the foreign-account access guard. They validate real OAuth-authenticated MCP requests and persisted results, not whether a model chooses the right tool from a prompt. Draft/local-development exclusions are agent instructions, not server-side classification: valid report payloads are not independently verified by Monologue.

For the installed-plugin evaluation, copy the exact five positive and three negative prompts from `packaging/openai/plugin.json`. Use a fresh conversation with only the review account connected and the bundled skill available. Approve read/write access and prepare sample reports from two agents, including GitHub/code, pending and failed results. Use a new dedicated connection/workspace or a fresh external ID shared by cases 1 and 2 when repeating the first-delivery check; never repeat an underlying external action solely to test delivery.

| Case | Required model-level observation | Exact installed-plugin result |
| --- | --- | --- |
| Positive 1: report | Calls `report_action` with the specified fields; returns the actual saved ID. | Not run |
| Positive 2: retry | Reuses case 1's fields/external ID; same ID, `duplicate=true`, no new event. | Not run |
| Positive 3: cross-agent read | Calls `read_timeline` with limit 5; preserves identities, statuses and available URLs. | Not run |
| Positive 4: filter | Uses system GitHub, category code, limit 5; no unrelated results or fabricated links. | Not run |
| Positive 5: empty search | Uses the exact search and limit 1; reports zero results without broadening the query. | Not run |
| Negative 1: unsent draft | No Monologue tool calls; only an unsent chat draft, no claim that an email was sent. | Not run |
| Negative 2: local development | No Monologue tool calls or deployment claim. | Not run |
| Negative 3: unauthorized feed | No Monologue tool calls; declines the unauthorized request without exposing data. | Not run |

Record the date, package/skill versions, client/model, tool names/arguments, returned IDs/duplicate flags, errors, permission/confirmation behavior and actual response for each run. Verify only positive 1 adds an event; retries, reads and negatives must not. Keep screenshots/traces and credentials private and outside the submission ZIP. Fill the result column only after observing the exact installed-package run. Earlier similar private-MCP tests in `MCP_PLAN.md` do not substitute for this evaluation. Rerun after skill, tool metadata, schema or authentication changes, and on each supported client before submission.

## Policy checks before review

- Current Terms require age 18+, and the Privacy Policy excludes under-18 users. OpenAI's plugin guidelines currently require general-audience suitability including ages 13–17. Resolve that product/legal decision before review; packaging does not silently change eligibility.
- Review data collection against OpenAI's restrictions, including PHI, payment-card information, government identifiers and authentication secrets. Do not put restricted data in summaries, URLs, monetary metadata or demo fixtures. A report must not imply Monologue itself executes trades or payments.
- Keep public privacy/terms/support pages accurate and accessible. Confirm reviewer login works outside your own signed-in browser.

Official references: [package format](https://developers.openai.com/plugins/build/plugins), [upload and review](https://developers.openai.com/plugins/deploy/submission), [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines).
