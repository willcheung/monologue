import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ActionDetail } from "@/components/action-detail";
import { AgentAvatar } from "@/components/agent-avatar";
import { FeedTimeline } from "@/components/feed-timeline";
import { Header } from "@/components/header";
import { getAgentProfile } from "@/lib/agents";
import { categoryPresentation } from "@/lib/constants";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type Params = Promise<{ agentId: string }>;
type SearchParams = Promise<{ action?: string | string[] }>;

function dateLabel(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month:"short", day:"numeric", year:"numeric" }).format(value);
}

export default async function AgentProfilePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  const { agentId } = await params;
  const profile = await getAgentProfile(context.workspace.id, agentId);
  if (!profile) notFound();
  const rawSearch = await searchParams;
  const actionId = Array.isArray(rawSearch.action) ? rawSearch.action[0] : rawSearch.action;
  const detail = actionId ? await db.action.findFirst({ where: { id:actionId, workspaceId:context.workspace.id, agentId } }) : null;
  const description = profile.description ?? `${profile.platform ?? profile.name} agent with a track record in your Monologue feed.`;
  const basePath = `/agents/${profile.id}`;

  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="agent-profile-shell">
      <Link className="profile-back" href="/agents"><ArrowLeft size={15} />Your AI Crew</Link>
      <section className="agent-profile-hero">
        <AgentAvatar name={profile.name} large />
        <div><span className="kicker">{profile.platform ?? "AI agent"}</span><h1>{profile.name}</h1><p>{description}</p><small><CheckCircle2 size={14} />{profile.connectedToMonologue ? "Connected to Monologue" : "Seen in your action history"}</small></div>
      </section>

      <section className="agent-overview" aria-label="Agent overview">
        <div><strong>{profile.totalActions}</strong><span>Total actions</span></div>
        <div><strong>{profile.actionsLastSevenDays}</strong><span>Last 7 days</span></div>
        <div><strong>{dateLabel(profile.firstSeen)}</strong><span>First seen</span></div>
        <div><strong>{dateLabel(profile.lastActive)}</strong><span>Last active</span></div>
      </section>

      <section className="agent-track-record">
        <div className="track-panel"><span className="kicker">Observed history</span><h2>Has worked with</h2><p>Systems where Monologue has seen this agent take action—not a claim of current access.</p><div className="breakdown-list">{profile.systems.map((system) => <div key={system.name}><strong>{system.name}</strong><span>{system.count} {system.count === 1 ? "action" : "actions"}</span></div>)}</div></div>
        <div className="track-panel"><span className="kicker">Track record</span><h2>Common actions</h2><p>What this agent has historically done in your feed.</p><div className="capability-list">{profile.commonActions.map((action) => <span key={action.name}><b>{action.name}</b><small>{action.count}</small></span>)}</div></div>
      </section>

      <section className="category-breakdown"><div><span className="kicker">Activity mix</span><h2>What it changes</h2></div><div>{profile.categories.map((category) => { const presentation = categoryPresentation(category.name); return <span key={category.name}><b>{presentation.emoji} {presentation.label}</b><small>{category.count}</small></span>; })}</div></section>

      <section className="agent-recent"><span className="kicker">Recent activity</span><h2>Latest changes</h2><FeedTimeline actions={profile.recentActions} queryString="" basePath={basePath} /></section>
    </main>
    {detail && <ActionDetail action={detail} closeHref={basePath} />}
  </>;
}
