import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { AgentSetupPanel } from "@/components/agent-setup-panel";
import { getSetupContext } from "@/lib/setup-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect your AI agents — Monologue",
  description: "Connect Claude Code, Codex, Cursor, Hermes, OpenClaw or Muse to one private agent feed.",
  alternates: { canonical: "/integrations" },
  openGraph: { title: "Connect your AI agents — Monologue", description: "Keep using your agents where you already do. Check what they reported in one private feed.", url: "/integrations" },
};

export default async function IntegrationsPage() {
  const setup = await getSetupContext();
  return <><Header /><main className="distribution-shell">
    <section className="distribution-intro"><span className="kicker">Works where your agents do</span><h1>Connect your agent.</h1><p>Keep using your agent where you already do. Bring what it reports into one private feed.</p></section>
    <section id="setup" className="distribution-setup"><AgentSetupPanel setup={setup} /></section>
    <section className="distribution-note"><h2>After you connect</h2><p>Try a <Link href="/templates">personal assistant, shopping helper, or coding starter prompt</Link>. These guide an agent you already have; they do not create an agent or connect new apps.</p><p>After your agent’s next real action, check your feed. Only actions it reports will appear. You can revoke access anytime.</p></section>
  </main></>;
}
