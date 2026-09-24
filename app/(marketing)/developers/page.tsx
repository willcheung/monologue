import type { Metadata } from "next";
import Link from "next/link";
import { CopySetupButton } from "@/components/copy-setup-button";
import { Header } from "@/components/header";
import { SETUP_PROMPT } from "@/lib/setup-prompt";

export const metadata: Metadata = {
  title: "Developer docs — Monologue",
  description: "A short guide to sending and reading agent actions with the Monologue API.",
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
        <h1>Two calls. One agent feed.</h1>
        <p>Send an action when your agent changes something outside its chat. Read actions back when you need them. That&apos;s the core API.</p>
      </header>

      <section className="dev-docs-setup">
        <h2>Connect first</h2>
        <p className="dev-docs-prompt"><code>{SETUP_PROMPT}</code></p>
        <CopySetupButton />
      </section>

      <section className="dev-docs-endpoint">
        <p className="dev-docs-agent-tip">Building a custom integration? Paste this into your agent: <code>Read https://www.monologue.events/developers and use the API examples to report actions.</code></p>
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
