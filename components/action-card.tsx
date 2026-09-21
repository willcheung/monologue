import type { Action } from "@prisma/client";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Clock3 } from "lucide-react";
import { ActionIcon } from "./action-icon";

function timeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function ActionCard({ action, queryString = "" }: { action: Action; queryString?: string }) {
  const href = `/?${queryString ? `${queryString}&` : ""}action=${action.id}`;
  return (
    <Link href={href} scroll={false} className={`action-card ${action.status === "failed" ? "is-failed" : ""}`}>
      <ActionIcon category={action.category} />
      <div className="action-main">
        <div className="card-topline">
          <strong>{action.agentName}</strong>
          <span className={`status status-${action.status}`}>
            {action.status === "failed" && <AlertCircle size={13} />}{action.status}
          </span>
        </div>
        <p>{action.summary}</p>
        <div className="action-meta">
          <span>{action.system}</span><i>·</i>
          <span><Clock3 size={13} />{timeLabel(action.occurredAt)}</span>
          {action.value != null && <><i>·</i><span className="amount">{money(action.value, action.currency ?? "USD")}</span></>}
        </div>
      </div>
      <ArrowUpRight className="card-arrow" size={17} />
    </Link>
  );
}
