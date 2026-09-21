import { ActionCard } from "@/components/action-card";
import { ActionDetail } from "@/components/action-detail";
import { Filters } from "@/components/filters";
import { Header } from "@/components/header";
import { listActions } from "@/lib/actions";
import { db } from "@/lib/db";
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

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, single(value)])) as Record<string, string | undefined>;
  const filters = { agent: params.agent, category: params.category, status: params.status, system: params.system, project: params.project, from: params.from, to: params.to, search: params.search };
  const [actions, agents, systems, projects] = await Promise.all([
    listActions(filters),
    db.action.findMany({ select: { agentName: true }, distinct: ["agentName"], orderBy: { agentName: "asc" } }),
    db.action.findMany({ select: { system: true }, distinct: ["system"], orderBy: { system: "asc" } }),
    db.action.findMany({ where: { project: { not: null } }, select: { project: true }, distinct: ["project"], orderBy: { project: "asc" } }),
  ]);
  const groups = actions.reduce<Record<string, typeof actions>>((all, action) => { (all[dayGroup(action.occurredAt)] ??= []).push(action); return all; }, {});
  const detail = params.action ? await db.action.findUnique({ where: { id: params.action } }) : null;
  const cleanParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value && key !== "action") cleanParams.set(key, value); });
  const queryString = cleanParams.toString();

  return <>
    <Header />
    <main className="page-shell">
      <section className="intro"><span className="kicker">What changed?</span><h1>The things your agents<br /><em>actually did.</em></h1><p>One calm timeline of real-world actions—without the noise.</p></section>
      <Filters params={params} options={{ agents: agents.map((x) => x.agentName), systems: systems.map((x) => x.system), projects: projects.flatMap((x) => x.project ? [x.project] : []) }} />
      <div className="feed-summary"><span>{actions.length} {actions.length === 1 ? "action" : "actions"}</span><span className="live-dot">Live feed</span></div>
      <section className="feed" aria-label="Agent actions">
        {actions.length === 0 && <div className="empty"><Inbox size={30} /><h2>No actions found</h2><p>Try widening your filters or send a new action to the API.</p><Link href="/">Clear filters</Link></div>}
        {["Today", "Yesterday", "Earlier"].map((label) => groups[label]?.length ? <div className="day-group" key={label}><div className="day-label"><h2>{label}</h2><span>{groups[label].length}</span></div><div className="cards">{groups[label].map((action) => <ActionCard key={action.id} action={action} queryString={queryString} />)}</div></div> : null)}
      </section>
    </main>
    <footer><span>Monologue</span><p>Only the changes that matter.</p></footer>
    {detail && <ActionDetail action={detail} closeHref={queryString ? `/?${queryString}` : "/"} />}
  </>;
}
