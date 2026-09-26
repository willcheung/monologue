import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { CopySetupButton } from "@/components/copy-setup-button";
import { AGENT_STARTERS } from "@/lib/distribution-content";

export const metadata: Metadata = {
  title: "Agent starter prompts — Monologue",
  description: "Start with a personal assistant, shopping helper, or coding agent prompt. Keep the agent you already use and add a private action feed.",
  alternates: { canonical: "/templates" },
  openGraph: { title: "Agent starter prompts — Monologue", description: "Three useful starting points for an agent you already have.", url: "/templates" },
};

export default function TemplatesPage() {
  return <><Header /><main className="distribution-shell">
    <section className="distribution-intro"><span className="kicker">A useful place to start</span><h1>Give your agent a job.</h1><p>Paste one of these into an agent you already use. It connects to Monologue first, then asks what you need help with. These prompts do not create agents or grant access to apps.</p></section>
    {AGENT_STARTERS.map((starter) => <section className="distribution-starter" key={starter.slug} id={starter.slug}><h2>{starter.name}</h2><p>{starter.description}</p><details><summary>Read the prompt</summary><pre>{starter.prompt}</pre></details><CopySetupButton prompt={starter.prompt} label={`Copy ${starter.name.toLowerCase()} prompt`} /></section>)}
    <section className="distribution-note"><h2>You still decide what happens</h2><p>Review what your agent plans to send, buy, book, or deploy. The prompts preserve its existing permissions and approval rules. Monologue records reported outcomes; it does not authorize the work.</p><Link href="/integrations">Find setup instructions for your agent →</Link></section>
  </main></>;
}
