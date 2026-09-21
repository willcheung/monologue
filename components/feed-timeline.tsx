"use client";

import type { Action } from "@prisma/client";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { useBrowserTime } from "@/lib/use-browser-time";
import { ActionCard } from "./action-card";

function dayGroup(dateValue: Date, localTime: boolean) {
  const date = new Date(dateValue);
  const now = new Date();
  const startToday = localTime
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startYesterday = new Date(startToday);
  if (localTime) startYesterday.setDate(startYesterday.getDate() - 1);
  else startYesterday.setUTCDate(startYesterday.getUTCDate() - 1);
  if (date >= startToday) return "Today";
  if (date >= startYesterday) return "Yesterday";
  return "Earlier";
}

export function FeedTimeline({ actions, queryString }: { actions: Action[]; queryString: string }) {
  const localTime = useBrowserTime();

  const groups = actions.reduce<Record<string, Action[]>>((all, action) => {
    (all[dayGroup(action.occurredAt, localTime)] ??= []).push(action);
    return all;
  }, {});

  return <section className="feed" aria-label="Agent actions">
    {actions.length === 0 && <div className="empty"><Inbox size={30} /><h2>No actions yet</h2><p>Connect an agent and its real-world changes will show up here.</p><Link href="/welcome">Connect an agent</Link></div>}
    {(["Today", "Yesterday", "Earlier"] as const).map((label) => groups[label]?.length
      ? <div className="day-group" key={label}><div className="day-label"><h2>{label}</h2><span>{groups[label].length}</span></div><div className="cards">{groups[label].map((action) => <ActionCard key={action.id} action={action} queryString={queryString} localTime={localTime} />)}</div></div>
      : null)}
  </section>;
}
