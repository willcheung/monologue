import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Bot, Boxes, CalendarDays } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { Header } from "@/components/header";
import { SketchLedgerChart } from "@/components/sketch-ledger-chart";
import { StaticShareCard, type ShareCardData } from "@/components/static-share-card";
import { listAgentSummaries } from "@/lib/agents";
import { categoryPresentation } from "@/lib/constants";
import { getWeeklyLedger } from "@/lib/weekly-ledger";
import { getWorkspaceContext } from "@/lib/workspace";
import { AgentBriefing } from "@/components/agent-briefing";
import { buildFeedBriefings } from "@/lib/feed-briefing";
import { weeklyLedgerBounds } from "@/lib/ledger";
import { mcpEnabled, mcpIssuer } from "@/lib/mcp-oauth";
import { dailyWorkspaceReport } from "@/lib/workspace-reports";
import { DailyReport } from "@/components/daily-report";

export const dynamic = "force-dynamic";

export default async function RecapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Frecap");
  if (typeof params.workspaceId === "string" && params.workspaceId !== context.workspace.id) {
    context = await getWorkspaceContext(params.workspaceId);
    if (!context) notFound();
  }
  const requestHeaders = await headers();
  const requestedTimeZone = requestHeaders.get("x-vercel-ip-timezone") || "UTC";
  let timeZone = "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone:requestedTimeZone }).format();
    timeZone = requestedTimeZone;
  } catch {}
  const now = new Date();
  const [ledger, agents, dailyReport] = await Promise.all([
    getWeeklyLedger(context.workspace.id, now, timeZone),
    listAgentSummaries(context.workspace.id),
    dailyWorkspaceReport(context.workspace.id, now),
  ]);
  const range = weeklyLedgerBounds(now, timeZone);
  const briefing = buildFeedBriefings({ workspace: { id: context.workspace.id, name: context.workspace.kind === "personal" ? "Personal" : context.workspace.name }, origin: mcpIssuer(), now, timeZone, readingEnabled: Boolean(context.user) && mcpEnabled(), filters: { from: range.from.toISOString(), to: range.to.toISOString() } });
  const weeklyActionsByAgent = new Map(ledger.agents.filter((agent) => agent.id).map((agent) => [agent.id, agent.count]));
  const shareData: ShareCardData = {
    kind:"recap",
    periodLabel:ledger.periodLabel,
    snapshotLabel:ledger.snapshotLabel,
    totalChanges:ledger.totalChanges,
    activeAgents:ledger.activeAgents,
    topAgent:ledger.topAgent?.name ?? "No activity yet",
    topSystem:ledger.topSystem?.name ?? "No activity yet",
    agents:ledger.agents.map(({ name, count }) => ({ name, count })),
    days:ledger.days.map(({ weekday, count, agents }) => ({ weekday, count, agents:agents.map(({ name, count:agentCount }) => ({ name, count:agentCount })) })),
  };

  return <>
    <Header product signedIn={Boolean(context.user)} workspaceContext={context} />
    <main className="recap-shell">
      <section className="recap-intro">
        <div><span className="kicker">{context.workspace.kind === "personal" ? "Personal" : context.workspace.name}</span><h1>Your recap.</h1><p>Your agents&apos; reported activity, from the last day to the last week.</p></div>
        <StaticShareCard data={shareData} label="Share weekly recap" />
      </section>

      <AgentBriefing key={context.workspace.id} {...briefing} defaultOpen={params.briefing === "weekly"} />

      <section className="ledger-card">
        <div className="ledger-total"><strong>{ledger.totalChanges}</strong><div><h2>actions completed this week</h2><p>{ledger.periodLabel} · Completed changes reported by your agents.</p></div></div>
        <SketchLedgerChart days={ledger.days} agents={ledger.agents} periodLabel={ledger.periodLabel} />
      </section>

      <section className="ledger-highlights" aria-label="Weekly highlights">
        <div><Bot size={18} /><span>Most active agent</span><strong>{ledger.topAgent?.name ?? "—"}</strong><small>{ledger.topAgent ? `${ledger.topAgent.count} changes` : "No completed changes"}</small></div>
        <div><Boxes size={18} /><span>Most-used system</span><strong>{ledger.topSystem?.name ?? "—"}</strong><small>{ledger.topSystem ? `${ledger.topSystem.count} changes` : "No completed changes"}</small></div>
        <div><CalendarDays size={18} /><span>Busiest day</span><strong>{ledger.busiestDay?.name ?? "—"}</strong><small>{ledger.busiestDay ? `${ledger.busiestDay.count} completed actions` : "No completed actions"}</small></div>
      </section>

      <DailyReport report={dailyReport} workspaceId={context.workspace.id} shared={context.workspace.kind === "shared"} />

      <section className="ledger-agents">
        <div><h2>My agents</h2><p>Every agent in this workspace, including agents that were quiet this week.</p></div>
        <div>{agents.map((agent) => {
          const weeklyCount = weeklyActionsByAgent.get(agent.id) ?? 0;
          const content = <><AgentAvatar name={agent.name} /><span><strong>{agent.name}</strong><small>{weeklyCount} {weeklyCount === 1 ? "action" : "actions"} this week</small></span></>;
          return <Link key={agent.id} href={`/agents/${agent.id}`}>{content}</Link>;
        })}</div>
      </section>

      <section className="ledger-mix">
        <div><span className="kicker">Activity mix</span><h2>What changed</h2></div>
        <div className="activity-pills">{ledger.categories.map((category) => { const presentation = categoryPresentation(category.name); return <span key={category.name}><i>{presentation.emoji}</i><b>{presentation.label}</b><small>{category.count}</small></span>; })}</div>
      </section>

      {ledger.failedAttempts > 0 && <aside className="ledger-failures"><AlertTriangle size={17} /><div><strong>{ledger.failedAttempts} {ledger.failedAttempts === 1 ? "attempt" : "attempts"} didn&apos;t complete</strong><span>Shown separately because they did not result in a confirmed change.</span></div></aside>}
    </main>
  </>;
}
