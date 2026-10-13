import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { CopySetupButton } from "@/components/copy-setup-button";
import { AgentSetupPanel } from "@/components/agent-setup-panel";
import { getAgentStarters } from "@/lib/distribution-content";
import { getSetupContext } from "@/lib/setup-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent starter prompts — Monologue",
  description: "Start with a personal assistant, shopping helper, or coding agent prompt. Keep the agent you already use and add a private action feed.",
  alternates: { canonical: "/templates" },
  openGraph: { title: "Agent starter prompts — Monologue", description: "Three useful starting points for an agent you already have.", url: "/templates" },
};

export default async function TemplatesPage() {
  const setup = await getSetupContext();
  const starters = getAgentStarters(setup.prompt);
  return <><Header /><main className="distribution-shell">
    <section className="distribution-intro"><span className="kicker">A useful place to start</span><h1>Give your agent a job.</h1><p>Connect your agent below, then choose a task to give it. These prompts do not create agents or grant access to apps.</p></section>
    <section id="setup"><AgentSetupPanel setup={setup} /></section>
    {starters.map((starter) => <section className="distribution-starter" key={starter.slug} id={starter.slug}><h2>{starter.name}</h2><p>{starter.description}</p><pre>{starter.prompt}</pre><CopySetupButton prompt={starter.prompt} label={`Copy ${starter.name.toLowerCase()} prompt`} /></section>)}
    <section className="distribution-note"><h2>You still decide what happens</h2><p>Review what your agent plans to send, buy, book, or deploy. The prompts preserve its existing permissions and approval rules. Monologue records reported outcomes; it does not authorize the work.</p><Link href="/integrations">Find setup instructions for your agent →</Link></section>
  </main></>;
}
