"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, Share2, X } from "lucide-react";

type Count = { name: string; count: number; emoji?: string };

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

const AGENT_COLORS = ["#ff6b45", "#6f8f78", "#7588b1", "#b57a5b", "#8b74a8", "#c3994d", "#6d9ba0"];

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawBrand(context: CanvasRenderingContext2D) {
  context.fillStyle = "#ff6b45";
  context.beginPath();
  context.arc(78, 72, 28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fffaf4";
  context.font = "italic 700 32px Georgia";
  context.textAlign = "center";
  context.fillText("m", 78, 83);
  context.textAlign = "left";
  context.fillStyle = "#20201d";
  context.font = "700 22px Georgia";
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
  context.fillStyle = "#fff1e7";
  context.beginPath();
  context.arc(1110, 20, 245, 0, Math.PI * 2);
  context.fill();
  drawBrand(context);

  if (data.kind === "recap") {
    context.fillStyle = "#ff6b45";
    context.font = "800 15px Avenir Next, Arial";
    context.fillText(data.periodLabel.toUpperCase(), 58, 162);
    context.fillStyle = "#20201d";
    context.font = "600 54px Georgia";
    context.fillText("My AI crew this week", 58, 222);
    context.font = "600 112px Georgia";
    context.fillText(String(data.totalChanges), 58, 352);
    context.font = "600 29px Georgia";
    context.fillText("actions completed", 58, 390);
    context.fillStyle = "#75736c";
    context.font = "18px Avenir Next, Arial";
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
        context.fillStyle = "#e7e3db";
        roundRect(context, x, bottom - 8, barWidth, 8, 4);
        context.fill();
      } else {
        const totalHeight = day.count / max * chartHeight;
        context.save();
        roundRect(context, x, bottom - totalHeight, barWidth, totalHeight, 10);
        context.clip();
        for (const agent of day.agents) {
          const height = agent.count / max * chartHeight;
          const agentIndex = data.agents.findIndex((item) => item.name === agent.name);
          context.fillStyle = AGENT_COLORS[agentIndex % AGENT_COLORS.length];
          context.fillRect(x, bottom - height, barWidth, height + 1);
          bottom -= height;
        }
        context.restore();
      }
      context.fillStyle = "#20201d";
      context.font = "700 15px Avenir Next, Arial";
      context.textAlign = "center";
      context.fillText(String(day.count), x + barWidth / 2, Math.max(chartY + 12, bottom - 12));
      context.fillStyle = "#75736c";
      context.font = "14px Avenir Next, Arial";
      context.fillText(day.weekday, x + barWidth / 2, chartY + chartHeight + 30);
    });
    context.textAlign = "left";
    data.agents.forEach((agent, index) => {
      const legendX = chartX + index % 4 * 110;
      const legendY = 526 + Math.floor(index / 4) * 20;
      context.fillStyle = AGENT_COLORS[index % AGENT_COLORS.length];
      context.beginPath();
      context.arc(legendX + 5, legendY, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#20201d";
      context.font = "700 12px Avenir Next, Arial";
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
  if (data.kind === "recap") return `My AI crew completed ${data.totalChanges} actions from ${data.periodLabel}. ${data.activeAgents} agents were active, led by ${data.topAgent}. Made with Monologue.`;
  return `${data.agentName} has completed ${data.totalActions} recorded actions since ${data.activeSince}. Made with Monologue.`;
}

export function StaticShareCard({ data, label = "Share" }: { data: ShareCardData; label?: string }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const fileName = data.kind === "recap" ? "monologue-weekly-ledger.png" : `monologue-${data.agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;

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
        await navigator.share({ files:[file], title:"Monologue" });
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
          <div className="share-preview-brand"><span>m</span><b>Monologue</b></div>
          {data.kind === "recap" ? <>
            <small>{data.periodLabel}</small><h3>My AI crew this week</h3><strong>{data.totalChanges}</strong><p>actions completed</p>
            <div className="share-mini-bars">{data.days.map((day) => { const max = Math.max(1, ...data.days.map((item) => item.count)); return <span key={day.weekday}><i className="share-stacked-bar">{day.count === 0 ? <u className="empty-segment" /> : day.agents.map((agent) => { const agentIndex = data.agents.findIndex((item) => item.name === agent.name); return <u key={agent.name} style={{ height:`${agent.count / max * 100}%`, background:AGENT_COLORS[agentIndex % AGENT_COLORS.length] }} />; })}</i><b>{day.weekday}</b></span>; })}</div>
            <div className="share-preview-detail">{data.activeAgents} active agents · Most active: {data.topAgent}</div>
            <div className="share-chart-legend">{data.agents.map((agent, index) => <span key={agent.name}><i style={{ background:AGENT_COLORS[index % AGENT_COLORS.length] }} />{agent.name}</span>)}</div>
          </> : <>
            <small>{data.platform}</small><h3>{data.agentName}</h3><strong>{data.totalActions}</strong><p>recorded actions</p><div className="share-profile-systems">{data.systems.slice(0, 3).map((system) => <span key={system}>{system}</span>)}</div><div className="share-preview-detail">Active since {data.activeSince}{data.commonActions.length ? ` · Often ${data.commonActions.map((action) => action.name).join(", ")}` : ""}</div>
          </>}
          <em>monologue.events · Snapshot {data.snapshotLabel}</em>
        </div>
        <div className="share-actions"><button type="button" disabled={busy} onClick={share}><Share2 size={16} />Share image</button><button type="button" disabled={busy} onClick={download}><Download size={16} />Save image</button><button type="button" disabled={busy} onClick={copy}><Copy size={16} />Copy text</button></div>
        {notice && <div className="share-notice"><Check size={14} />{notice}</div>}
      </section>
    </div>}
  </>;
}
