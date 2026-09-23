import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Bot, Boxes, CalendarDays } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { Header } from "@/components/header";
import { StaticShareCard, type ShareCardData } from "@/components/static-share-card";
import { categoryPresentation } from "@/lib/constants";
import { getWeeklyLedger } from "@/lib/weekly-ledger";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";
const AGENT_COLORS = ["#ff6b45", "#6f8f78", "#7588b1", "#b57a5b", "#8b74a8", "#c3994d", "#6d9ba0"];

export default async function RecapPage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Frecap");
  const ledger = await getWeeklyLedger(context.workspace.id);
  const maxDay = Math.max(1, ...ledger.days.map((day) => day.count));
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
        <div><span className="kicker">{ledger.periodLabel}</span><h1>Your weekly ledger.</h1><p>A simple record of what your agents changed over the last seven days.</p></div>
        <StaticShareCard data={shareData} label="Share recap" />
      </section>

      <section className="ledger-card">
        <div className="ledger-total"><strong>{ledger.totalChanges}</strong><div><h2>actions completed</h2><p>Confirmed external changes only.</p></div></div>
        <div className="ledger-chart-wrap">
          <div className="ledger-chart" aria-label={`Completed actions by agent and day from ${ledger.periodLabel}`}>
            {ledger.days.map((day) => <div className="ledger-day" key={day.key}>
              <span>{day.count}</span>
              <div>{day.count === 0 ? <i className="empty-segment" /> : day.agents.map((agent) => { const agentIndex = ledger.agents.findIndex((item) => item.name === agent.name); return <i key={agent.name} title={`${agent.name}: ${agent.count}`} style={{ height:`${agent.count / maxDay * 100}%`, background:AGENT_COLORS[agentIndex % AGENT_COLORS.length] }} />; })}</div>
              <b>{day.weekday}</b><small>{day.dateLabel}</small>
            </div>)}
          </div>
          <div className="ledger-chart-legend">{ledger.agents.map((agent, index) => <span key={agent.name}><i style={{ background:AGENT_COLORS[index % AGENT_COLORS.length] }} />{agent.name}</span>)}</div>
        </div>
      </section>

      <section className="ledger-highlights" aria-label="Weekly highlights">
        <div><Bot size={18} /><span>Most active agent</span><strong>{ledger.topAgent?.name ?? "—"}</strong><small>{ledger.topAgent ? `${ledger.topAgent.count} changes` : "No completed changes"}</small></div>
        <div><Boxes size={18} /><span>Most-used system</span><strong>{ledger.topSystem?.name ?? "—"}</strong><small>{ledger.topSystem ? `${ledger.topSystem.count} changes` : "No completed changes"}</small></div>
        <div><CalendarDays size={18} /><span>Busiest day</span><strong>{ledger.busiestDay?.name ?? "—"}</strong><small>{ledger.busiestDay ? `${ledger.busiestDay.count} completed actions` : "No completed actions"}</small></div>
      </section>

      <section className="ledger-agents">
        <div><span className="kicker">Your crew this week</span><h2>Agents in the ledger</h2><p>Only agents with completed changes during this period appear here.</p></div>
        <div>{ledger.agents.map((agent) => {
          const content = <><AgentAvatar name={agent.name} /><span><strong>{agent.name}</strong><small>{agent.count} {agent.count === 1 ? "action" : "actions"}</small></span></>;
          return agent.id ? <Link key={agent.id} href={`/agents/${agent.id}`}>{content}</Link> : <div key={agent.name}>{content}</div>;
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
