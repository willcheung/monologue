import type { Action } from "@prisma/client";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { ActionIcon } from "./action-icon";

function dateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(date);
}

function metadataLabel(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function metadataValue(value: unknown) {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

export function ActionDetail({ action, closeHref }: { action: Action; closeHref: string }) {
  const rows = [
    ["Agent", action.agentName], ["Verb", action.verb], ["System", action.system],
    ["Status", action.status], ["Time", dateTime(action.occurredAt)],
    ["Object", [action.objectType, action.objectName].filter(Boolean).join(" · ") || null],
    ["Amount", action.value != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: action.currency ?? "USD" }).format(action.value) : null],
    ["Source", action.source.replace("_", " ")],
  ].filter(([, value]) => value);
  const metadata = action.metadata && typeof action.metadata === "object" && !Array.isArray(action.metadata)
    ? Object.entries(action.metadata)
    : [];

  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Action details">
      <Link className="drawer-scrim" href={closeHref} scroll={false} aria-label="Close details" />
      <aside className="drawer">
        <div className="drawer-header"><span>Action details</span><Link href={closeHref} scroll={false} aria-label="Close"><X /></Link></div>
        <div className="drawer-title"><ActionIcon category={action.category} /><div><span className="eyebrow">{action.category}</span><h2>{action.summary}</h2></div></div>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === "Status" ? `detail-status ${action.status}` : ""}>{value}</dd></div>)}</dl>
        {action.url && <a className="external-link" href={action.url} target="_blank" rel="noreferrer">Open in {action.system}<ExternalLink size={16} /></a>}
        {metadata.length > 0 && <div className="metadata">
          <span>More details</span>
          <dl className="metadata-list">{metadata.map(([key, value]) => <div key={key}>
            <dt>{metadataLabel(key)}</dt>
            <dd>{isUrl(value)
              ? <a href={value} target="_blank" rel="noreferrer">Open link <ExternalLink size={13} /></a>
              : metadataValue(value)}
            </dd>
          </div>)}</dl>
        </div>}
      </aside>
    </div>
  );
}
