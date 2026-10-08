import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgentCard } from "@/components/agent-card";
import { Header } from "@/components/header";
import { listAgentSummaries } from "@/lib/agents";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AgentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Fagents");
  if (typeof params.workspaceId === "string" && params.workspaceId !== context.workspace.id) {
    context = await getWorkspaceContext(params.workspaceId);
    if (!context) notFound();
  }
  const agents = await listAgentSummaries(context.workspace.id);
  const actionCount = agents.reduce((total, agent) => total + agent.actionCount, 0);
  const systems = new Set(agents.flatMap((agent) => agent.systems)).size;
  const addAgentHref = isCloudMode() ? `/settings/keys?workspaceId=${encodeURIComponent(context.workspace.id)}` : "/welcome";

  return <>
    <Header product signedIn={Boolean(context.user)} workspaceContext={context} />
    <main className="crew-shell workspace-agents-shell">
      <section className="crew-intro">
        <span className="kicker">{context.workspace.kind === "personal" ? "Personal" : context.workspace.name}</span>
        <div className="crew-title-row"><div><h1>My agents.</h1><p>{context.workspace.kind === "shared" ? "Your team’s agents and their track records in this workspace." : "Your agents and their track records in this workspace."}</p></div><Link className="secondary-button crew-add" href={addAgentHref}>Add agent</Link></div>
        <div className="crew-totals"><span><strong>{agents.length}</strong> {agents.length === 1 ? "agent" : "agents"}</span><span><strong>{actionCount}</strong> {actionCount === 1 ? "action" : "actions"}</span><span><strong>{systems}</strong> {systems === 1 ? "system" : "systems"}</span></div>
      </section>
      {agents.length > 0
        ? <section aria-label="Workspace agents"><div className="agent-grid">{agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}</div></section>
        : <section className="crew-empty"><h2>Your crew is waiting.</h2><p>No agents in this workspace yet. Connect one to start its track record.</p><Link className="secondary-button" href={addAgentHref}>Add an agent to this workspace</Link></section>}
    </main>
  </>;
}
