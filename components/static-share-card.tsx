"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import rough from "roughjs";
import { agentColor } from "@/lib/agent-colors";
import { BrandMark } from "./brand-mark";

type Count = { name: string; count: number; emoji?: string };
const MONOLOGUE_URL = "https://www.monologue.events";

export type ShareCardData =
  | {
      kind: "recap";
      periodLabel: string;
      snapshotLabel: string;
      totalChanges: number;
      activeAgents: number;
      topAgent: string;
      topSystem: string;
      agents: Count[];
      days: Array<{ weekday: string; count: number; agents: Count[] }>;
    }
  | {
      kind: "profile";
      snapshotLabel: string;
      agentName: string;
      platform: string;
      totalActions: number;
      activeSince: string;
      systems: string[];
      commonActions: Count[];
    };

function initials(name: string) {
  return name.split(/\s+|·/).map((part) => part.trim()).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function hatchedBackground(color: string) {
  return `repeating-linear-gradient(-12deg, ${color} 0 1.5px, transparent 1.5px 4px), color-mix(in srgb, ${color} 12%, white)`;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawLogoMark(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.save();
  context.translate(x, y);
  context.scale(size / 1024, size / 1024);
  context.fillStyle = "#20201d";
  roundRect(context, 78, 84, 896, 896, 238);
  context.fill();
  context.fillStyle = "#ff6b45";
  roundRect(context, 54, 46, 896, 896, 238);
  context.fill();

  context.strokeStyle = "#fffaf3";
  context.lineWidth = 68;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(550, 297);
  context.bezierCurveTo(695, 297, 644, 494, 772, 494);
  context.moveTo(622, 494);
  context.lineTo(772, 494);
  context.moveTo(550, 691);
  context.bezierCurveTo(695, 691, 644, 494, 772, 494);
  context.stroke();

  const rows = [
    { y:210, width:440, lineWidth:182 },
    { y:407, width:512, lineWidth:254 },
    { y:604, width:440, lineWidth:182 },
  ];
  rows.forEach((row) => {
    context.fillStyle = "#fffaf3";
    roundRect(context, 146, row.y, row.width, 174, 87);
    context.fill();
    context.fillStyle = "#20201d";
    context.beginPath();
    context.arc(236, row.y + 87, 43, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ff6b45";
    roundRect(context, 316, row.y + 61, row.lineWidth, 52, 26);
    context.fill();
  });
  context.fillStyle = "#fffaf3";
  context.beginPath();
  context.arc(790, 494, 91, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#20201d";
  context.beginPath();
  context.arc(790, 494, 46, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBrand(context: CanvasRenderingContext2D) {
  drawLogoMark(context, 47, 42, 60);
  context.fillStyle = "#20201d";
  context.font = "700 27px Gaegu, Marker Felt, cursive";
  context.fillText("Monologue", 120, 69);
  context.fillStyle = "#75736c";
  context.font = "15px Avenir Next, Arial";
  context.fillText("Your agent feed.", 120, 91);
}

function drawFooter(context: CanvasRenderingContext2D, snapshotLabel: string) {
  context.fillStyle = "#75736c";
  context.textAlign = "right";
  context.font = "700 16px Avenir Next, Arial";
  context.fillText(`monologue.events · Static snapshot · ${snapshotLabel}`, 1142, 588);
  context.textAlign = "left";
}

function renderPng(data: ShareCardData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image generation is unavailable in this browser.");

  context.fillStyle = "#fbfaf6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (data.kind === "recap") {
    context.strokeStyle = "#eeeae0";
    context.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke(); }
    context.strokeStyle = "#f3ead0";
    for (let x = 0; x < canvas.width; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke(); }
  }
  context.fillStyle = "#fff1e7";
  context.beginPath();
  context.arc(1110, 20, 245, 0, Math.PI * 2);
  context.fill();
  drawBrand(context);

  if (data.kind === "recap") {
    const sketch = rough.canvas(canvas);
    const noteFont = 'Gaegu, "Marker Felt", "Comic Sans MS", cursive';
    context.fillStyle = "#ff6b45";
    context.font = `700 18px ${noteFont}`;
    context.fillText(data.periodLabel.toUpperCase(), 58, 162);
    context.fillStyle = "#20201d";
    context.font = `700 56px ${noteFont}`;
    context.fillText("My AI crew this week", 58, 222);
    context.font = `700 112px ${noteFont}`;
    context.fillText(String(data.totalChanges), 58, 352);
    context.font = `700 30px ${noteFont}`;
    context.fillText("actions completed", 58, 390);
    context.fillStyle = "#75736c";
    context.font = `20px ${noteFont}`;
    context.fillText(`${data.activeAgents} active agents · Most active: ${data.topAgent}`, 58, 442);
    context.fillText(`Worked most in ${data.topSystem}`, 58, 474);
    const max = Math.max(1, ...data.days.map((day) => day.count));
    const chartX = 705;
    const chartY = 182;
    const chartHeight = 270;
    const barWidth = 48;
    const gap = 18;
    data.days.forEach((day, index) => {
      const x = chartX + index * (barWidth + gap);
      let bottom = chartY + chartHeight;
      if (day.count === 0) {
        sketch.rectangle(x, bottom - 8, barWidth, 8, { fill:"#d8d4ca", fillStyle:"solid", stroke:"#aaa69d", strokeWidth:1.2, roughness:1.3, seed:700 + index });
      } else {
        day.agents.forEach((agent, segmentIndex) => {
          const height = agent.count / max * chartHeight;
          const agentIndex = data.agents.findIndex((item) => item.name === agent.name);
          const color = agentColor(agentIndex);
          sketch.rectangle(x, bottom - height, barWidth, height + 1, { fill:color, fillStyle:"hachure", fillWeight:1.2, hachureAngle:-12, hachureGap:4, stroke:color, strokeWidth:1.7, roughness:1.15, seed:(index + 1) * 100 + segmentIndex });
          bottom -= height;
        });
      }
      context.fillStyle = "#20201d";
      context.font = `700 17px ${noteFont}`;
      context.textAlign = "center";
      context.fillText(String(day.count), x + barWidth / 2, Math.max(chartY + 12, bottom - 12));
      context.fillStyle = "#75736c";
      context.font = `16px ${noteFont}`;
      context.fillText(day.weekday, x + barWidth / 2, chartY + chartHeight + 30);
    });
    context.textAlign = "left";
    data.agents.forEach((agent, index) => {
      const legendX = chartX + index % 4 * 110;
      const legendY = 526 + Math.floor(index / 4) * 20;
      context.fillStyle = agentColor(index);
      context.beginPath();
      context.arc(legendX + 5, legendY, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#20201d";
      context.font = `700 14px ${noteFont}`;
      context.fillText(agent.name, legendX + 15, legendY + 4, 90);
    });
  } else {
    context.fillStyle = "#ff6b45";
    context.font = "800 15px Avenir Next, Arial";
    context.fillText(data.platform.toUpperCase(), 58, 162);
    context.fillStyle = "#20201d";
    context.font = "600 64px Georgia";
    context.fillText(data.agentName, 58, 232);
    context.fillStyle = "#e9eef9";
    roundRect(context, 870, 146, 240, 240, 58);
    context.fill();
    context.fillStyle = "#39455d";
    context.font = "700 86px Georgia";
    context.textAlign = "center";
    context.fillText(initials(data.agentName), 990, 294);
    context.textAlign = "left";
    context.fillStyle = "#20201d";
    context.font = "600 100px Georgia";
    context.fillText(String(data.totalActions), 58, 367);
    context.font = "600 28px Georgia";
    context.fillText("recorded actions", 58, 405);
    context.fillStyle = "#75736c";
    context.font = "18px Avenir Next, Arial";
    context.fillText(`Active since ${data.activeSince}`, 58, 454);
    const systems = data.systems.length ? data.systems.join(" · ") : "Building a track record";
    context.fillText(`Has worked with: ${systems}`, 58, 488);
    if (data.commonActions.length) context.fillText(`Often: ${data.commonActions.map((action) => action.name).join(" · ")}`, 58, 522);
  }

  drawFooter(context, data.snapshotLabel);
  const encoded = canvas.toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type:"image/png" });
}

function shareText(data: ShareCardData) {
  if (data.kind === "recap") return `My AI crew completed ${data.totalChanges} actions from ${data.periodLabel}. ${data.activeAgents} agents were active, led by ${data.topAgent}. Made with Monologue. ${MONOLOGUE_URL}`;
  return `${data.agentName} has completed ${data.totalActions} recorded actions since ${data.activeSince}. Made with Monologue. ${MONOLOGUE_URL}`;
}

export function StaticShareCard({ data, label = "Share" }: { data: ShareCardData; label?: string }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const fileName = data.kind === "recap" ? "monologue-7-day-recap.png" : `monologue-${data.agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;

  function saveBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function download() {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    saveBlob(renderPng(data));
    setNotice("Image saved");
    window.setTimeout(() => { actionLock.current = false; setBusy(false); }, 500);
  }

  async function share() {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const blob = renderPng(data);
      const file = new File([blob], fileName, { type:"image/png" });
      if (navigator.share && navigator.canShare?.({ files:[file] })) {
        await navigator.share({ files:[file], title:"Monologue", text:shareText(data) });
        setNotice("Shared");
      } else {
        saveBlob(blob);
        setNotice("Sharing files is unavailable here, so the image was saved instead");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setNotice("Could not share this image");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function copy() {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(shareText(data));
      setNotice("Text copied");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  return <>
    <button className="share-trigger" type="button" onClick={() => { setOpen(true); setNotice(""); }}><Share2 size={16} />{label}</button>
    {open && <div className="share-layer" role="dialog" aria-modal="true" aria-label="Share a static Monologue card">
      <button className="share-scrim" type="button" aria-label="Close share preview" onClick={() => setOpen(false)} />
      <section className="share-dialog">
        <div className="share-dialog-heading"><div><span className="kicker">Static snapshot</span><h2>Share without sharing access.</h2><p>This card is an image. It cannot update or reveal future activity.</p></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <div className={`share-preview share-preview-${data.kind}`}>
          <div className="share-preview-brand"><BrandMark className="share-card-mark" /><b>Monologue</b></div>
          {data.kind === "recap" ? <>
            <small>{data.periodLabel}</small><h3>My AI crew this week</h3><strong>{data.totalChanges}</strong><p>actions completed</p>
            <div className="share-mini-bars">{data.days.map((day) => { const max = Math.max(1, ...data.days.map((item) => item.count)); return <span key={day.weekday}><i className="share-stacked-bar">{day.count === 0 ? <u className="empty-segment" /> : day.agents.map((agent) => { const agentIndex = data.agents.findIndex((item) => item.name === agent.name); const color = agentColor(agentIndex); return <u key={agent.name} style={{ height:`${agent.count / max * 100}%`, background:hatchedBackground(color), borderColor:color }} />; })}</i><b>{day.weekday}</b></span>; })}</div>
            <div className="share-preview-detail">{data.activeAgents} active agents · Most active: {data.topAgent}</div>
            <div className="share-chart-legend">{data.agents.map((agent, index) => <span key={agent.name}><i style={{ background:agentColor(index) }} />{agent.name}</span>)}</div>
          </> : <>
            <small>{data.platform}</small><h3>{data.agentName}</h3><strong>{data.totalActions}</strong><p>recorded actions</p><div className="share-profile-systems">{data.systems.slice(0, 3).map((system) => <span key={system}>{system}</span>)}</div><div className="share-preview-detail">Active since {data.activeSince}{data.commonActions.length ? ` · Often ${data.commonActions.map((action) => action.name).join(", ")}` : ""}</div>
          </>}
          <div className="share-preview-footer"><a href={MONOLOGUE_URL} target="_blank" rel="noreferrer">monologue.events</a><span> · Snapshot {data.snapshotLabel}</span></div>
        </div>
        <div className="share-actions"><button type="button" disabled={busy} onClick={share}><Share2 size={16} />Share image</button><button type="button" disabled={busy} onClick={download}><Download size={16} />Save image</button><button type="button" disabled={busy} onClick={copy}><Copy size={16} />Copy text</button></div>
        {notice && <div className="share-notice"><Check size={14} />{notice}</div>}
      </section>
    </div>}
  </>;
}
