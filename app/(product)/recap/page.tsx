import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, Bot, Boxes, CalendarDays } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { Header } from "@/components/header";
import { SketchLedgerChart } from "@/components/sketch-ledger-chart";
import { StaticShareCard, type ShareCardData } from "@/components/static-share-card";
import { listAgentSummaries } from "@/lib/agents";
import { categoryPresentation } from "@/lib/constants";
import { getWeeklyLedger } from "@/lib/weekly-ledger";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function RecapPage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Frecap");
  const requestHeaders = await headers();
  const requestedTimeZone = requestHeaders.get("x-vercel-ip-timezone") || "UTC";
  let timeZone = "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone:requestedTimeZone }).format();
    timeZone = requestedTimeZone;
  } catch {}
  const [ledger, agents] = await Promise.all([
    getWeeklyLedger(context.workspace.id, new Date(), timeZone),
    listAgentSummaries(context.workspace.id),
  ]);
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
    <Header product signedIn={Boolean(context.user)} />
    <main className="recap-shell">
      <section className="recap-intro">
        <div><span className="kicker">{ledger.periodLabel}</span><h1>Your 7-day recap.</h1><p>A simple record of what your agents changed over the last seven days.</p></div>
        <StaticShareCard data={shareData} label="Share recap" />
      </section>

      <section className="ledger-card">
        <div className="ledger-total"><strong>{ledger.totalChanges}</strong><div><h2>actions completed</h2><p>Confirmed external changes only.</p></div></div>
        <SketchLedgerChart days={ledger.days} agents={ledger.agents} periodLabel={ledger.periodLabel} />
      </section>

      <section className="ledger-highlights" aria-label="Weekly highlights">
        <div><Bot size={18} /><span>Most active agent</span><strong>{ledger.topAgent?.name ?? "—"}</strong><small>{ledger.topAgent ? `${ledger.topAgent.count} changes` : "No completed changes"}</small></div>
        <div><Boxes size={18} /><span>Most-used system</span><strong>{ledger.topSystem?.name ?? "—"}</strong><small>{ledger.topSystem ? `${ledger.topSystem.count} changes` : "No completed changes"}</small></div>
        <div><CalendarDays size={18} /><span>Busiest day</span><strong>{ledger.busiestDay?.name ?? "—"}</strong><small>{ledger.busiestDay ? `${ledger.busiestDay.count} completed actions` : "No completed actions"}</small></div>
      </section>

      <section className="ledger-agents">
        <div><h2>My agents</h2><p>Every agent in your feed, including agents that were quiet this week.</p></div>
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
