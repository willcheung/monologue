import type { Action } from "@prisma/client";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Clock3 } from "lucide-react";
import { ActionIcon } from "./action-icon";
import { categoryPresentation } from "@/lib/constants";

function timeLabel(date: Date, localTime: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(!localTime && { timeZone: "UTC" }),
  }).format(new Date(date));
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function knownChange(metadata: Action["metadata"]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const { before, after } = metadata as Record<string, unknown>;
  return typeof before === "string" && typeof after === "string" ? { before, after } : null;
}

function summaryWithVerb(summary: string, verb: string) {
  if (!summary.toLowerCase().startsWith(verb.toLowerCase())) return summary;
  return <><strong>{summary.slice(0, verb.length)}</strong>{summary.slice(verb.length)}</>;
}

export function ActionCard({ action, queryString = "", basePath = "/feed", localTime = false }: { action: Action; queryString?: string; basePath?: string; localTime?: boolean }) {
  const href = `${basePath}?${queryString ? `${queryString}&` : ""}action=${action.id}`;
  const category = categoryPresentation(action.category);
  const change = knownChange(action.metadata);
  const exceptionalStatus = action.status === "failed" || action.status === "pending";
  const surfaceClass = ["timeline-surface", change ? "has-change" : "", action.status === "failed" ? "is-failed" : "", action.status === "pending" ? "is-pending" : ""].filter(Boolean).join(" ");

  return (
    <Link href={href} scroll={false} className="timeline-event">
      <time className="timeline-time">{timeLabel(action.occurredAt, localTime)}</time>
      <span className={`timeline-node timeline-node-${action.status}`}>
        <ActionIcon category={action.category} />
      </span>
      <div className={surfaceClass}>
        <div className="timeline-main">
          <div className="timeline-topline">
            <strong>{action.agentName}</strong>
            <span className="category-label">{category.label}</span>
            {exceptionalStatus && <span className={`status status-${action.status}`}>
              {action.status === "failed" ? <AlertCircle size={12} /> : <Clock3 size={12} />}{action.status}
            </span>}
          </div>
          <p>{summaryWithVerb(action.summary, action.verb)}</p>
          {change && <div className="inline-action-change"><del>{change.before}</del><i>→</i><b>{change.after}</b></div>}
          <div className="timeline-meta">
            <span>{action.system}</span>
            {action.project && <><i>·</i><span>{action.project}</span></>}
            {action.value != null && <><i>·</i><span className="amount">{money(action.value, action.currency ?? "USD")}</span></>}
          </div>
        </div>
        <ArrowUpRight className="timeline-arrow" size={17} />
      </div>
    </Link>
  );
}
