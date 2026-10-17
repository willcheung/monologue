"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import rough from "roughjs";
import { ACTIVITY_BANDS, activityWeeks, type ActivitySnapshot } from "@/lib/activity";
import { activitySketchOptions } from "@/lib/activity-sketch";
import { StaticShareCard } from "./static-share-card";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ActivityMatrix({ snapshot, setup, children }: { snapshot: ActivitySnapshot; setup?: ReactNode; children: ReactNode }) {
  const id = useId();
  const sketchRef = useRef<SVGSVGElement>(null);
  const legendRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState(snapshot.days[snapshot.days.length - 1].key);
  const [hovered, setHovered] = useState<string | null>(null);
  const weeks = activityWeeks(snapshot.days);
  // A same-workspace refresh after midnight can retire the selected oldest day.
  const selectedKey = snapshot.days.some(day => day.key === selected) ? selected : snapshot.days[snapshot.days.length - 1].key;
  const detail = snapshot.days.find(day => day.key === hovered) ?? snapshot.days.find(day => day.key === selectedKey)!;

  useEffect(() => {
    const svg = sketchRef.current;
    const legend = legendRef.current;
    if (!svg || !legend) return;
    svg.replaceChildren();
    legend.replaceChildren();
    const chart = rough.svg(svg);
    activityWeeks(snapshot.days).flat().forEach((day, index) => {
      svg.appendChild(chart.rectangle(Math.floor(index / 7) * 44 + 5, index % 7 * 44 + 5, 34, 34, activitySketchOptions(day?.count ?? null, 700 + index)));
    });
    const swatches = rough.svg(legend);
    ACTIVITY_BANDS.forEach((band, index) => legend.appendChild(swatches.rectangle(index * 60 + 23, 3, 14, 14, activitySketchOptions(band.min, 800 + index))));
  }, [snapshot.days]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const offset = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
    if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = event.key === "Home" ? 0 : event.key === "End" ? snapshot.days.length - 1 : snapshot.days.findIndex(day => day.key === key) + offset!;
    const day = snapshot.days[Math.max(0, Math.min(snapshot.days.length - 1, index))];
    setSelected(day.key);
    document.getElementById(`${id}-${day.key}`)?.focus();
  }

  return <section className="activity-section" aria-labelledby={`${id}-heading`}>
    <div className="activity-heading">
      <h2 id={`${id}-heading`}>Your agents’ activity</h2>
    </div>
    <dl className="activity-stats" aria-label="28-day totals and current activity streak">
      <div className="activity-total"><dd>{snapshot.totalActions.toLocaleString("en-US")}</dd><dt>reported completed actions</dt></div>
      <div><dd>{snapshot.activeAgents}</dd><dt>active agents</dt></div>
      <div title={`Consecutive days with reported completed actions in ${snapshot.timeZone}. Today stays open until the day ends. The streak can extend beyond 28 days.`}><dd>{snapshot.currentStreak}<span className="activity-streak-unit"> {snapshot.currentStreak === 1 ? "day" : "days"}</span></dd><dt>current streak</dt></div>
    </dl>
    {snapshot.totalActions === 0 && <div className="activity-empty"><h3>A quiet month so far.</h3><p>Completed actions appear here when your agents report them.</p>{setup}</div>}
    <div className="activity-body">
      <section className="activity-chart" aria-labelledby={`${id}-month`}>
        <div className="activity-chart-heading"><h3 id={`${id}-month`}>Last 28 days</h3><p>{snapshot.periodLabel}</p></div>
        <div className="activity-calendar" style={{ "--weeks": weeks.length } as CSSProperties} role="group" aria-label="Daily reported completed actions" aria-describedby={`${id}-help`}>
          <div className="activity-week-labels" aria-hidden="true">{weeks.map((week, index) => <span key={index}>{week.find(Boolean)?.dateLabel.replace(/, \d{4}$/, "").split(" ").map(part => <span key={part}>{part}</span>)}</span>)}</div>
          <div className="activity-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
          <div className="activity-cells" onPointerLeave={() => setHovered(null)}>
            <svg ref={sketchRef} className="activity-sketch" viewBox={`0 0 ${weeks.length * 44} 308`} aria-hidden="true" />
            {weeks.flat().map((day, index) => day ? <button key={day.key} id={`${id}-${day.key}`} type="button" className="activity-day" data-date={day.key} data-count={day.count}
              aria-label={`${day.dateLabel}: ${day.count} reported completed ${day.count === 1 ? "action" : "actions"}`}
              aria-pressed={selectedKey === day.key} tabIndex={selectedKey === day.key ? 0 : -1}
              onFocus={() => { setSelected(day.key); setHovered(null); }} onClick={() => { setSelected(day.key); setHovered(null); }}
              onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(day.key); }} onKeyDown={event => navigate(event, day.key)}>
            </button> : <span key={`padding-${index}`} className="activity-padding" aria-hidden="true" />)}
          </div>
        </div>
        <p className="activity-day-detail" role="status" aria-live="polite"><strong>{detail.dateLabel}</strong><span>{detail.count} reported completed {detail.count === 1 ? "action" : "actions"}</span></p>
        <div className="activity-legend" aria-label="Completed actions per day"><span>Daily actions</span><div className="activity-legend-bands"><svg ref={legendRef} viewBox="0 0 300 20" aria-hidden="true" />{ACTIVITY_BANDS.map(band => <span key={band.min}>{band.label}</span>)}</div></div>
        <p id={`${id}-help`} className="activity-help">Select a day for details. Use arrow keys to move between days.</p>
        <div className="activity-chart-share"><StaticShareCard data={{ kind: "activity", ...snapshot }} label="Share activity" /></div>
      </section>
      {children}
    </div>
  </section>;
}
