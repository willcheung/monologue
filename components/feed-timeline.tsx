"use client";

import type { Action } from "@prisma/client";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { useBrowserTime } from "@/lib/use-browser-time";
import { ActionCard } from "./action-card";

function dateParts(dateValue: Date, localTime: boolean) {
  const date = new Date(dateValue);
  const year = localTime ? date.getFullYear() : date.getUTCFullYear();
  const monthIndex = localTime ? date.getMonth() : date.getUTCMonth();
  const day = localTime ? date.getDate() : date.getUTCDate();
  return { date, year, monthIndex, day, key: `${year}-${monthIndex}-${day}` };
}

function calendarLabel(dateValue: Date, localTime: boolean) {
  const { date, key, day } = dateParts(dateValue, localTime);
  const now = new Date();
  const today = dateParts(now, localTime);
  const yesterdayDate = localTime
    ? new Date(today.year, today.monthIndex, today.day - 1)
    : new Date(Date.UTC(today.year, today.monthIndex, today.day - 1));
  const yesterday = dateParts(yesterdayDate, localTime);
  const timeZone = localTime ? undefined : "UTC";
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(date).toUpperCase();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date).toUpperCase();
  const relative = key === today.key ? "TODAY" : key === yesterday.key ? "YESTERDAY" : weekday;
  const accessible = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone }).format(date);
  return { month, day, relative, accessible };
}

export function FeedTimeline({ actions, queryString }: { actions: Action[]; queryString: string }) {
  const localTime = useBrowserTime();
  const groups = new Map<string, { date: Date; actions: Action[] }>();

  for (const action of actions) {
    const key = dateParts(action.occurredAt, localTime).key;
    const group = groups.get(key);
    if (group) group.actions.push(action);
    else groups.set(key, { date: action.occurredAt, actions: [action] });
  }

  return <section className="feed" aria-label="Agent actions">
    {actions.length === 0 && <div className="empty"><Inbox size={30} /><h2>No actions yet</h2><p>Connect an agent and its real-world changes will show up here.</p><Link href="/welcome">Connect an agent</Link></div>}
    {Array.from(groups.entries()).map(([key, group]) => {
      const label = calendarLabel(group.date, localTime);
      return <div className="day-group" key={key}>
        <div className="calendar-day" aria-label={label.accessible}><span>{label.month}</span><strong>{label.day}</strong><small>{label.relative}</small></div>
        <div className="action-list">{group.actions.map((action) => <ActionCard key={action.id} action={action} queryString={queryString} localTime={localTime} />)}</div>
      </div>;
    })}
  </section>;
}
