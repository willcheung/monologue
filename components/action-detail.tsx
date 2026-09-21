import type { Action } from "@prisma/client";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { ActionIcon } from "./action-icon";

function dateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export function ActionDetail({ action, closeHref }: { action: Action; closeHref: string }) {
  const rows = [
    ["Agent", action.agentName], ["Verb", action.verb], ["System", action.system],
    ["Status", action.status], ["Time", dateTime(action.occurredAt)],
    ["Object", [action.objectType, action.objectName].filter(Boolean).join(" · ") || null],
    ["Amount", action.value != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: action.currency ?? "USD" }).format(action.value) : null],
    ["Source", action.source.replace("_", " ")],
  ].filter(([, value]) => value);

  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Action details">
      <Link className="drawer-scrim" href={closeHref} scroll={false} aria-label="Close details" />
      <aside className="drawer">
        <div className="drawer-header"><span>Action details</span><Link href={closeHref} scroll={false} aria-label="Close"><X /></Link></div>
        <div className="drawer-title"><ActionIcon category={action.category} /><div><span className="eyebrow">{action.category}</span><h2>{action.summary}</h2></div></div>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === "Status" ? `detail-status ${action.status}` : ""}>{value}</dd></div>)}</dl>
        {action.url && <a className="external-link" href={action.url} target="_blank" rel="noreferrer">Open in {action.system}<ExternalLink size={16} /></a>}
        {action.metadata && <div className="metadata"><span>Extra details</span><pre>{JSON.stringify(action.metadata, null, 2)}</pre></div>}
      </aside>
    </div>
  );
}
