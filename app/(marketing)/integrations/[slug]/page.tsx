import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { CopySetupButton } from "@/components/copy-setup-button";
import { getIntegration, INTEGRATIONS } from "@/lib/distribution-content";
import { SETUP_PROMPT } from "@/lib/setup-prompt";

export function generateStaticParams() {
  return INTEGRATIONS.map(({ slug }) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const integration = getIntegration((await params).slug);
  if (!integration) notFound();
  const title = `Connect ${integration.name} to Monologue`;
  return { title, description: integration.description, alternates: { canonical: `/integrations/${integration.slug}` }, openGraph: { title, description: integration.description, url: `/integrations/${integration.slug}` } };
}

export default async function IntegrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const integration = getIntegration((await params).slug);
  if (!integration) notFound();
  return <><Header /><main className="distribution-shell">
    <section className="distribution-intro"><Link href="/integrations" className="distribution-back">← All agents</Link><span className="kicker">{integration.method}</span><h1>Connect {integration.name}.</h1><p>{integration.description}</p></section>
    <section className="distribution-setup"><h2>Paste this into {integration.name}</h2><pre>{SETUP_PROMPT}</pre><CopySetupButton /><p>{integration.note}</p>{integration.commands.length > 0 && <details><summary>Prefer installing from your terminal?</summary><pre>{integration.commands.join("\n")}</pre></details>}</section>
    <section className="distribution-note"><h2>Approve, then keep using your agent</h2><p>Open the private approval link your agent gives you. Sign in and approve the named agent. It receives a write-only key and stores it securely; you do not need to paste that key into chat.</p><p>If your agent cannot store a key securely, sign in at <Link href="/keys">monologue.events/keys</Link> and create an API key for its secure credentials screen.</p><p>After the next real action, <Link href="/feed">check your feed</Link>. Look for the outcome and a link to the result when available. Ask your agent for the returned Monologue event ID if a report is missing.</p></section>
    <section className="distribution-example"><span className="kicker">Example</span><p>{integration.example}</p><small>Research, drafts, and local development stay out of the feed. Reports can be incomplete or mistaken; Monologue is a record, not independent verification.</small></section>
    <p className="distribution-next">Need a useful first task? <Link href="/templates">Pick a starter prompt</Link>. Building your own connector? <Link href="/developers">See the API</Link>.</p>
  </main></>;
}
