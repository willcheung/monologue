# OpenAI plugin packaging

The public repository contains a reusable example manifest, the public OAuth MCP connection, the canonical skill, logos, and protocol tests. Real submission metadata, reviewer credentials, demo URLs, private QA notes and generated ZIPs are local release material, not open-source inputs.

## Build

Run `npm run plugin:package`. Without a local override, it uses `packaging/openai/plugin.example.json`. A release owner can copy that example to `packaging/openai/plugin.json` and set their listing's internal name, review video URL and other submission details. The override is ignored by Git and excluded from Vercel uploads.

Keep reviewer credentials in the submission dashboard's secure fields, never in a manifest. Generated ZIPs go to ignored `dist/openai-plugin/` and contain only the allowlisted skill, helper, license, logos and manifests. Keep account-specific drafts and test evidence under ignored `private/`. Upload the generated ZIP manually; packaging does not submit or publish a listing.

## Test

- `npm run test:plugin`: package and OAuth MCP regression checks.
- `MCP_TEST_LIBSQL=1 npm run test:plugin`: the same checks with a temporary local libSQL database.
- `npm run test:privacy`: prevent private operational files and obvious credential patterns from entering tracked source.

Tests work from a public checkout without private submission files. The five positive cases and three negative cases in the example are reusable evaluation prompts, not proof that an installed model chose the right tools.

Before submission, run those exact cases with the installed plugin and a dedicated review account. Positive cases cover reporting, retry deduplication, cross-agent reads, filtering and empty results. Negative cases exclude unsent chat drafts, local development and unauthorized private feeds. Record actual tool calls, arguments, IDs, errors and confirmations privately. First delivery adds one event; retries, reads and negative prompts must not add events. Backend tests cannot establish model-level instruction following.

Prepare reviewer access, a demo video, domain verification, publisher identity, policy compliance and selected countries before review. Keep public support, privacy and terms accurate. Marketplace submission is separate from application deployment.

## Privacy boundary

Never force-add ignored release files. The privacy regression check rejects tracked overrides, submission drafts, private notes, env files other than `.env.example`, databases, key files and non-brand ZIP archives. Vercel exclusions are a second boundary, not a replacement for Git hygiene.

Removing a file from the current branch does not erase older commits or cached copies. If real secrets are exposed, revoke/rotate them and separately arrange history cleanup; do not silently rewrite a shared repository's history.

Official references: [package format](https://developers.openai.com/plugins/build/plugins), [submission](https://developers.openai.com/plugins/deploy/submission), [guidelines](https://developers.openai.com/plugins/plugin-guidelines).
