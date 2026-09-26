import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { CopySetupButton } from "@/components/copy-setup-button";
import { INTEGRATIONS } from "@/lib/distribution-content";
import { SETUP_PROMPT } from "@/lib/setup-prompt";

export const metadata: Metadata = {
  title: "Connect your AI agents — Monologue",
  description: "Connect Muse, Claude Code, OpenClaw, Codex, or Hermes to one private agent feed. Setup guides and starter prompts.",
  alternates: { canonical: "/integrations" },
  openGraph: { title: "Connect your AI agents — Monologue", description: "Keep using your agents where you already do. Check what they reported in one private feed.", url: "/integrations" },
};

export default function IntegrationsPage() {
  return <><Header /><main className="distribution-shell">
    <section className="distribution-intro"><span className="kicker">Works where your agents do</span><h1>Your agents. One feed.</h1><p>Keep using your agents where you already do. Give them a place to report what they changed for you.</p></section>
    <section id="setup" className="distribution-setup"><h2>Start with one prompt</h2><pre>{SETUP_PROMPT}</pre><CopySetupButton /><p>Your agent should give you a private approval link. Sign in to Monologue and approve it. No API key to copy when your agent supports secure storage.</p></section>
    <section className="distribution-guides"><h2>Choose your agent</h2><div className="distribution-list">{INTEGRATIONS.map((integration) => <Link key={integration.slug} href={`/integrations/${integration.slug}`}><span><strong>{integration.name}</strong><small>{integration.method}</small><p>{integration.description}</p></span><span aria-hidden="true">↗</span></Link>)}</div></section>
    <p>Don’t see your agent? Try the <a href="#setup">setup prompt above</a>. Agents that can read instructions and call an API may be able to connect too.</p>
    <section className="distribution-note"><h2>Not sure where to start?</h2><p>Try a <Link href="/templates">personal assistant, shopping helper, or coding starter prompt</Link>. These guide an agent you already have; they do not create an agent or connect new apps.</p><p>Monologue records agent-reported actions. It does not watch every app or guarantee a complete history. You can revoke a connection anytime.</p></section>
  </main></>;
}
