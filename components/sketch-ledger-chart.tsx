"use client";

import { useEffect, useRef } from "react";
import rough from "roughjs";
import { agentColor } from "@/lib/agent-colors";

type AgentCount = { name: string; count: number };
type Day = { key: string; weekday: string; dateLabel: string; count: number; agents: AgentCount[] };

export function SketchLedgerChart({ days, agents, periodLabel }: { days: Day[]; agents: AgentCount[]; periodLabel: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const chart = rough.svg(svg);
    const max = Math.max(1, ...days.map((day) => day.count));
    const baseline = 184;
    const plotHeight = 138;
    const barWidth = 45;
    const step = 91;
    const startX = 28;

    svg.appendChild(chart.line(16, baseline, 674, baseline, { stroke:"#34322d", strokeWidth:1.5, roughness:1.1, seed:91 }));

    days.forEach((day, dayIndex) => {
      const x = startX + dayIndex * step;
      let bottom = baseline;
      if (day.count === 0) {
        svg.appendChild(chart.rectangle(x, baseline - 4, barWidth, 4, { fill:"#d8d4ca", fillStyle:"solid", stroke:"#aaa69d", strokeWidth:1, roughness:1.3, seed:700 + dayIndex }));
      } else {
        day.agents.forEach((agent, segmentIndex) => {
          const height = agent.count / max * plotHeight;
          const colorIndex = agents.findIndex((item) => item.name === agent.name);
          const color = agentColor(colorIndex);
          svg.appendChild(chart.rectangle(x, bottom - height, barWidth, height + .5, {
            fill:color,
            fillStyle:"hachure",
            fillWeight:1.15,
            hachureAngle:-12,
            hachureGap:4,
            stroke:color,
            strokeWidth:1.7,
            roughness:1.15,
            bowing:.9,
            seed:(dayIndex + 1) * 100 + segmentIndex,
          }));
          bottom -= height;
        });
      }

      const count = document.createElementNS("http://www.w3.org/2000/svg", "text");
      count.setAttribute("x", String(x + barWidth / 2));
      count.setAttribute("y", String(Math.max(16, bottom - 9)));
      count.setAttribute("class", "sketch-count");
      count.textContent = String(day.count);
      svg.appendChild(count);

      const weekday = document.createElementNS("http://www.w3.org/2000/svg", "text");
      weekday.setAttribute("x", String(x + barWidth / 2));
      weekday.setAttribute("y", "207");
      weekday.setAttribute("class", "sketch-weekday");
      weekday.textContent = day.weekday;
      svg.appendChild(weekday);

      const date = document.createElementNS("http://www.w3.org/2000/svg", "text");
      date.setAttribute("x", String(x + barWidth / 2));
      date.setAttribute("y", "227");
      date.setAttribute("class", "sketch-date");
      date.textContent = day.dateLabel;
      svg.appendChild(date);
    });
  }, [agents, days]);

  return <div className="sketch-ledger-chart">
    <svg ref={svgRef} viewBox="0 0 700 240" role="img" aria-label={`Hand-drawn completed actions by agent and day from ${periodLabel}`} />
    <div className="sketch-chart-legend">{agents.map((agent, index) => <span key={agent.name}><i style={{ background:agentColor(index) }} />{agent.name}</span>)}</div>
  </div>;
}
