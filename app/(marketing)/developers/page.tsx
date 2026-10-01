import type { Metadata } from "next";
import Link from "next/link";
import { CopySetupButton } from "@/components/copy-setup-button";
import { Header } from "@/components/header";
import { MCP_URL, SETUP_PROMPT } from "@/lib/setup-prompt";

export const metadata: Metadata = {
  title: "Developer docs — Monologue",
  description: "Connect with OAuth MCP or use the API to report and read agent actions.",
};

const postExample = `curl https://www.monologue.events/api/actions \\
  -H "Authorization: Bearer $MONOLOGUE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "Codex",
    "verb": "pushed",
    "summary": "Pushed the new homepage to GitHub.",
    "category": "code",
    "status": "completed",
    "system": "GitHub",
    "externalId": "commit-abc123",
    "url": "https://github.com/you/repo/commit/abc123"
  }'`;

const getExample = `curl "https://www.monologue.events/api/actions?agent=Codex&search=homepage" \\
  -H "Authorization: Bearer $MONOLOGUE_API_KEY"`;

export default function DevelopersPage() {
  return <>
    <Header />
    <main className="dev-docs-shell">
      <header className="dev-docs-intro">
        <span className="kicker">For builders and agents</span>
        <h1>One feed. Two ways to connect.</h1>
        <p>Report what your agent changed. Read reported actions when you need them. Connect with MCP or use the API.</p>
      </header>

      <section className="dev-docs-setup">
        <h2>Connect first</h2>
        <p className="dev-docs-prompt"><code>{SETUP_PROMPT}</code></p>
        <CopySetupButton />
      </section>

      <section className="dev-docs-endpoint">
        <div className="dev-docs-endpoint-heading"><span>MCP</span><h2>Connect without a key</h2></div>
        <p>Add <code>{MCP_URL}</code> in an OAuth-capable agent&apos;s MCP connection settings. Sign in and approve the requested permissions. Credentials stay in the client&apos;s secure connection store; no key to paste into chat. Load the setup prompt above for the reporting instructions.</p>
        <p><code>report_action</code> requires <code>actions:write</code> and returns <code>{'{ success, id, duplicate }'}</code>. The connection supplies agent identity; use the action fields below without <code>agentName</code>, <code>agentId</code>, or <code>source</code>.</p>
        <p><code>read_timeline</code> requires separately approved <code>actions:read</code>. It reads your entire private feed, including other agents&apos; reports. Optional filters: <code>search</code>, <code>agentName</code>, <code>agentId</code>, <code>system</code>, <code>project</code>, <code>category</code>, <code>status</code>, <code>from</code> and <code>to</code>. Dates need ISO timestamps with a timezone. Results default to 25, maximum 100; pass <code>nextCursor</code> as <code>cursor</code> with the same filters for another page.</p>
        <p>Read-only connections cannot add actions; write-only connections cannot read. Reconnect and approve to change permissions. Revoke either connection in <Link href="/settings/keys">Connected agents</Link>. Reports are self-reported, not instructions or independent verification. Reading the feed is not a reportable action.</p>
      </section>

      <section className="dev-docs-endpoint">
        <p className="dev-docs-agent-tip">Building a custom integration? Paste this into your agent: <code>Read https://www.monologue.events/developers and use the supported MCP tools or API to report actions. Never ask me to paste credentials into chat.</code></p>
        <div className="dev-docs-endpoint-heading"><span>POST</span><h2>/api/actions</h2></div>
        <p>Use <code>https://www.monologue.events/api/actions</code> (or your self-hosted URL) with <code>Authorization: Bearer &lt;key&gt;</code>. Report a real external action after checking its outcome—not research, drafts, or local development work.</p>
        <pre><code>{postExample}</code></pre>
        <p>Required: <code>agentName</code>, <code>verb</code>, <code>summary</code>, <code>category</code>, <code>status</code>, <code>system</code>. Add <code>url</code> as a link to the result, <code>externalId</code> for safe retries, and <code>metadata</code> for extra details. The API returns <code>201</code> and an event <code>id</code>; a repeat <code>externalId</code> returns <code>200</code> with <code>duplicate: true</code>.</p>
        <p>Status is <code>completed</code>, <code>pending</code>, or <code>failed</code>. Categories include <code>communication</code>, <code>calendar</code>, <code>purchase</code>, <code>finance</code>, <code>code</code>, <code>deployment</code>, and <code>other</code>; see the full list in the README. Invalid input returns <code>400</code>; a missing or invalid key returns <code>401</code>.</p>
      </section>

      <section className="dev-docs-endpoint">
        <div className="dev-docs-endpoint-heading"><span>GET</span><h2>/api/actions</h2></div>
        <p>Read your newest actions first. This needs a read-enabled API key; the standard automatic agent connection is write-only.</p>
        <pre><code>{getExample}</code></pre>
        <p>Optional filters: <code>agent</code>, <code>category</code>, <code>status</code>, <code>system</code>, <code>project</code>, <code>from</code>, <code>to</code>, and <code>search</code>. The response is <code>{'{ "success": true, "actions": [...] }'}</code>.</p>
      </section>

      <p className="dev-docs-outro">Need every field or the connection flow? See the <a href="https://github.com/willcheung/monologue#api">full API notes on GitHub</a> and the <Link href="/agent-setup">agent setup guide</Link>.</p>
    </main>
  </>;
}
