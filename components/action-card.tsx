import type { Action } from "@prisma/client";
import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
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

export function ActionCard({ action, queryString = "", basePath = "/feed", localTime = false }: { action: Action; queryString?: string; basePath?: string; localTime?: boolean }) {
  const href = `${basePath}?${queryString ? `${queryString}&` : ""}action=${action.id}`;
  const category = categoryPresentation(action.category);
  return (
    <Link href={href} scroll={false} className={`action-card ${action.status === "failed" ? "is-failed" : ""}`}>
      <ActionIcon category={action.category} />
      <div className="action-main">
        <div className="card-topline">
          <strong>{action.agentName}</strong>
          <span className="category-label">{category.label}</span>
          <span className={`status status-${action.status}`}>
            {action.status === "failed" && <AlertCircle size={13} />}{action.status}
          </span>
        </div>
        <p>{action.summary}</p>
        <div className="action-meta">
          <span>{action.system}</span><i>·</i>
          <span><span className="time-emoji" role="img" aria-label="Time">🕒</span>{timeLabel(action.occurredAt, localTime)}</span>
          {action.value != null && <><i>·</i><span className="amount">{money(action.value, action.currency ?? "USD")}</span></>}
        </div>
      </div>
      <ArrowUpRight className="card-arrow" size={17} />
    </Link>
  );
}
