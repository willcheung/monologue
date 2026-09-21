import { redirect } from "next/navigation";
import { ActionCard } from "@/components/action-card";
import { ActionDetail } from "@/components/action-detail";
import { Filters } from "@/components/filters";
import { Header } from "@/components/header";
import { listActions } from "@/lib/actions";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { Inbox } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function dayGroup(date: Date) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday); startYesterday.setDate(startYesterday.getDate() - 1);
  if (date >= startToday) return "Today";
  if (date >= startYesterday) return "Yesterday";
  return "Earlier";
}

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
  const groups = actions.reduce<Record<string, typeof actions>>((all, action) => { (all[dayGroup(action.occurredAt)] ??= []).push(action); return all; }, {});
  const detail = params.action ? await db.action.findFirst({ where: { id: params.action, workspaceId } }) : null;
  const cleanParams = new URLSearchParams();
  ["agent", "category", "status", "system", "from", "to", "search"].forEach((key) => { if (params[key]) cleanParams.set(key, params[key]); });
  const queryString = cleanParams.toString();

  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="page-shell">
      <section className="intro"><span className="kicker">What changed?</span><h1>The things your agents<br /><em>actually did.</em></h1><p>One calm timeline of real-world actions—without the noise.</p></section>
      <Filters params={params} options={{ agents: agents.map((x) => x.agentName), systems: systems.map((x) => x.system) }} />
      <div className="feed-summary"><span>{actions.length} {actions.length === 1 ? "action" : "actions"}</span><span className="live-dot">Live feed</span></div>
      <section className="feed" aria-label="Agent actions">
        {actions.length === 0 && <div className="empty"><Inbox size={30} /><h2>No actions yet</h2><p>Connect an agent and its real-world changes will show up here.</p><Link href="/welcome">Connect an agent</Link></div>}
        {["Today", "Yesterday", "Earlier"].map((label) => groups[label]?.length ? <div className="day-group" key={label}><div className="day-label"><h2>{label}</h2><span>{groups[label].length}</span></div><div className="cards">{groups[label].map((action) => <ActionCard key={action.id} action={action} queryString={queryString} />)}</div></div> : null)}
      </section>
    </main>
    <footer><span>Monologue</span><p>Only the changes that matter.</p></footer>
    {detail && <ActionDetail action={detail} closeHref={queryString ? `/feed?${queryString}` : "/feed"} />}
  </>;
}
