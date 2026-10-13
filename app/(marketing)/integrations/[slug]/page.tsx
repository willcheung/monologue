import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { AgentSetupPanel } from "@/components/agent-setup-panel";
import { isAgentId } from "@/lib/agent-onboarding";
import { getIntegration, INTEGRATIONS } from "@/lib/distribution-content";
import { getSetupContext } from "@/lib/setup-context";

export function generateStaticParams() {
  return INTEGRATIONS.map(({ slug }) => ({ slug }));
}

export const dynamicParams = false;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const integration = getIntegration((await params).slug);
  if (!integration) notFound();
  const title = `Connect ${integration.name} to Monologue`;
  return { title, description: integration.description, alternates: { canonical: `/integrations/${integration.slug}` }, openGraph: { title, description: integration.description, url: `/integrations/${integration.slug}` } };
}

export default async function IntegrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const integration = getIntegration((await params).slug);
  if (!integration) notFound();
  const setup = await getSetupContext();
  return <><Header /><main className="distribution-shell">
    <section className="distribution-intro"><Link href="/integrations" className="distribution-back">← All agents</Link><span className="kicker">{integration.method}</span><h1>Connect {integration.name}.</h1><p>{integration.description}</p></section>
    <section className="distribution-setup"><AgentSetupPanel setup={setup} initialAgent={isAgentId(integration.slug) ? integration.slug : undefined} /></section>
    <section className="distribution-note"><h2>Keep using your agent</h2><p>Already connected? Reuse that connection and confirm the reporting instructions are available. You approve reading and reporting in the workspace you choose.</p><p>After the next real action, <Link href="/feed">check your feed</Link>. Ask your agent for the returned event ID if a report is missing.</p></section>
    <section className="distribution-example"><span className="kicker">Example</span><p>{integration.example}</p><small>Research, drafts, and local development stay out of the feed. Reports can be incomplete or mistaken; Monologue is a record, not independent verification.</small></section>
    <p className="distribution-next">Need a useful first task? <Link href="/templates">Pick a starter prompt</Link>. Building your own connector? <Link href="/developers">See the API</Link>.</p>
  </main></>;
}
