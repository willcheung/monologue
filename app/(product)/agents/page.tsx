import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentCard } from "@/components/agent-card";
import { Header } from "@/components/header";
import { listAgentSummaries } from "@/lib/agents";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Fagents");
  const agents = await listAgentSummaries(context.workspace.id);
  const actionCount = agents.reduce((total, agent) => total + agent.actionCount, 0);
  const systems = new Set(agents.flatMap((agent) => agent.systems)).size;
  const addAgentHref = isCloudMode() ? "/settings/keys" : "/welcome";

  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="crew-shell">
      <section className="crew-intro">
        <span className="kicker">Your agents</span>
        <div className="crew-title-row"><div><h1>Your AI Crew.</h1><p>See the agents working for you, what they&apos;ve worked with, and what they&apos;ve done.</p></div><Link className="crew-add" href={addAgentHref}>Add agent</Link></div>
        <div className="crew-totals"><span><strong>{agents.length}</strong> agents</span><span><strong>{actionCount}</strong> actions</span><span><strong>{systems}</strong> systems</span></div>
      </section>
      {agents.length > 0
        ? <section className="agent-grid" aria-label="Your AI agents">{agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}</section>
        : <section className="crew-empty"><h2>Your crew is waiting.</h2><p>Connect an agent and its real-world actions will build a private track record here.</p><Link href={addAgentHref}>Add your first agent</Link></section>}
    </main>
  </>;
}
