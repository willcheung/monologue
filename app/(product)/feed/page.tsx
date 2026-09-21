import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionDetail } from "@/components/action-detail";
import { FeedTimeline } from "@/components/feed-timeline";
import { Filters } from "@/components/filters";
import { Header } from "@/components/header";
import { listActions } from "@/lib/actions";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  const workspaceId = context.workspace.id;
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, single(value)])) as Record<string, string | undefined>;
  const filters = { agent: params.agent, category: params.category, status: params.status, system: params.system, from: params.from, to: params.to, search: params.search };
  const [actions, agents, systems] = await Promise.all([
    listActions(filters, workspaceId),
    db.action.findMany({ where: { workspaceId }, select: { agentName: true }, distinct: ["agentName"], orderBy: { agentName: "asc" } }),
    db.action.findMany({ where: { workspaceId }, select: { system: true }, distinct: ["system"], orderBy: { system: "asc" } }),
  ]);
  const detail = params.action ? await db.action.findFirst({ where: { id: params.action, workspaceId } }) : null;
  const cleanParams = new URLSearchParams();
  ["agent", "category", "status", "system", "from", "to", "search"].forEach((key) => { if (params[key]) cleanParams.set(key, params[key]); });
  const queryString = cleanParams.toString();

  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="page-shell">
      <section className="intro"><span className="kicker">What changed?</span><h1>The things your agents<br /><em>did.</em></h1><p>One calm timeline of real-world actions—without the noise.</p></section>
      <Filters params={params} options={{ agents: agents.map((x) => x.agentName), systems: systems.map((x) => x.system) }} />
      <div className="feed-summary"><span>{actions.length} {actions.length === 1 ? "action" : "actions"}</span><span className="live-dot">Live feed</span></div>
      <FeedTimeline actions={actions} queryString={queryString} />
    </main>
    <footer><span>Monologue</span><p>Only the changes that matter.</p><nav className="footer-links" aria-label="Footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></footer>
    {detail && <ActionDetail action={detail} closeHref={queryString ? `/feed?${queryString}` : "/feed"} />}
  </>;
}
