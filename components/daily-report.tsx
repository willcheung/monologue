import Link from "next/link";
import type { dailyWorkspaceReport } from "@/lib/workspace-reports";

export function DailyReport({ report, workspaceId, shared }: { report: Awaited<ReturnType<typeof dailyWorkspaceReport>>; workspaceId: string; shared: boolean }) {
  const feed = `/feed?workspaceId=${encodeURIComponent(workspaceId)}`;
  return <section id="daily-report" className="daily-report-preview" aria-label="Daily report">
    <div className="workspace-section-heading"><h2>The last 24 hours.</h2><Link href={feed}>Open full feed →</Link></div>
    <div className="daily-report-totals"><span><strong>{report.completed}</strong> completed</span><span><strong>{report.attention}</strong> need attention</span>{shared && <span><strong>{report.people}</strong> people</span>}</div>
    {report.actions.length ? <ul>{report.actions.map(action => <li key={action.id}>
      <div><strong>{action.agentName}</strong><span>{shared ? `${action.reportedByUser?.name ?? "Member not recorded"} · ` : ""}{action.system}{action.status !== "completed" ? ` · ${action.status}` : ""}</span></div>
      <p>{action.summary}</p><Link href={`${feed}&action=${encodeURIComponent(action.id)}`}>View reported action →</Link>
    </li>)}</ul> : <p>No reported activity in the last 24 hours.</p>}
    <p className="daily-report-footer">Based on activity reported by your agents. Outcomes are not independently verified.</p>
  </section>;
}
