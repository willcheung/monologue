import { notFound, redirect } from "next/navigation";
import { ActionDetail } from "@/components/action-detail";
import { FeedTimeline } from "@/components/feed-timeline";
import { Filters } from "@/components/filters";
import { Header } from "@/components/header";
import { CopySetupButton } from "@/components/copy-setup-button";
import { listActions } from "@/lib/actions";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { mcpEnabled, mcpIssuer } from "@/lib/mcp-oauth";
import { workspaceSetupPrompt } from "@/lib/setup-prompt";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  let context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  const requestedWorkspaceId = single(raw.workspaceId);
  if (requestedWorkspaceId && requestedWorkspaceId !== context.workspace.id) {
    context = await getWorkspaceContext(requestedWorkspaceId);
    if (!context) notFound();
  }
  const workspaceId = context.workspace.id;
  if (single(raw.briefing) === "weekly") redirect(`/recap?workspaceId=${encodeURIComponent(workspaceId)}&briefing=weekly`);
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, single(value)])) as Record<string, string | undefined>;
  const filters = { agentId: params.agentId, agent: params.agent, category: params.category, status: params.status, system: params.system, project: params.project, from: params.from, to: params.to, search: params.search };
  const [actions, agents, systems, projects] = await Promise.all([
    listActions(filters, workspaceId),
    db.action.findMany({ where: { workspaceId }, select: { agentName: true }, distinct: ["agentName"], orderBy: { agentName: "asc" } }),
    db.action.findMany({ where: { workspaceId }, select: { system: true }, distinct: ["system"], orderBy: { system: "asc" } }),
    db.action.findMany({ where: { workspaceId, project: { not: null } }, select: { project: true }, distinct: ["project"], orderBy: { project: "asc" } }),
  ]);
  const detail = params.action ? await db.action.findFirst({ where: { id: params.action, workspaceId } }) : null;
  const cleanParams = new URLSearchParams();
  ["workspaceId", "agentId", "agent", "category", "status", "system", "project", "from", "to", "search"].forEach((key) => { if (params[key]) cleanParams.set(key, params[key]); });
  const queryString = cleanParams.toString();
  const setupPrompt = actions.length === 0 ? workspaceSetupPrompt({
    origin: mcpIssuer(),
    workspace: { id: workspaceId, name: context.workspace.kind === "personal" ? "Personal" : context.workspace.name },
    mcpEnabled: mcpEnabled(),
  }) : undefined;

  return <>
    <Header product signedIn={Boolean(context.user)} workspaceContext={context} />
    <main className="page-shell">
      <section className="intro"><span className="kicker">What changed?</span><h1>The things your <span className="intro-ending">agents <em>did.</em></span></h1><p>A running record of what they changed on your behalf.</p></section>
      <Filters params={params} options={{ agents: agents.map((x) => x.agentName), systems: systems.map((x) => x.system), projects: projects.flatMap(x => x.project ? [x.project] : []) }} />
      <div className="feed-summary"><span>{actions.length} {actions.length === 1 ? "action" : "actions"}</span><span className="live-dot">Live feed</span></div>
      {actions.length > 0 ? <FeedTimeline actions={actions} queryString={queryString} /> : <section className="feed" aria-label="Agent actions"><div className="empty"><h2>Connect an agent</h2><CopySetupButton prompt={setupPrompt} /></div></section>}
    </main>
    {detail && <ActionDetail action={detail} closeHref={queryString ? `/feed?${queryString}` : "/feed"} />}
  </>;
}
