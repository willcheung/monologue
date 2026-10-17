"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Download, Share2, X } from "lucide-react";
import rough from "roughjs";
import { agentColor } from "@/lib/agent-colors";
import { SHARE_SITE_LABEL, SHARE_SETUP_URL, shareCardSnapshot, shareSummary, type ShareCardData } from "@/lib/share-card";
import { drawActivityImage } from "@/lib/activity-share-image";
import { fitShareText, recapShareSeries } from "@/lib/share-layout";
export type { ShareCardData } from "@/lib/share-card";

function initials(name: string) {
  return name.split(/\s+|·/).map((part) => part.trim()).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
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
  context.font = `700 27px ${getComputedStyle(document.body).getPropertyValue("--font-display").trim()}`;
  context.fillText("Monologue", 120, 69);
  context.fillStyle = "#75736c";
  context.font = "15px Avenir Next, Arial";
  context.fillText("Your agent feed.", 120, 91);
}

function drawFooter(context: CanvasRenderingContext2D, snapshotLabel: string) {
  context.fillStyle = "#75736c";
  context.textAlign = "right";
  context.font = "700 16px Avenir Next, Arial";
  context.fillText(`${SHARE_SITE_LABEL} · Static snapshot · ${snapshotLabel}`, 1142, 588, 1084);
  context.textAlign = "left";
}

function renderPng(data: ShareCardData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image generation is unavailable in this browser.");
  const display = getComputedStyle(document.body).getPropertyValue("--font-display").trim();
  const clippedText = (text: string, x: number, y: number, width: number) => context.fillText(fitShareText(text, width, value => context.measureText(value).width), x, y);

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

  if (data.kind === "activity") {
    drawActivityImage(context, data);
  } else if (data.kind === "recap") {
    const sketch = rough.canvas(canvas);
    const series = recapShareSeries(data);
    const noteFont = display;
    context.fillStyle = "#ff6b45";
    context.font = `700 18px ${noteFont}`;
    context.fillText(data.periodLabel.toUpperCase(), 58, 162);
    context.fillStyle = "#20201d";
    context.font = `700 56px ${noteFont}`;
    context.fillText("My AI crew this week", 58, 222);
    context.font = `700 112px ${noteFont}`;
    context.fillText(String(data.totalChanges), 58, 352, 585);
    context.font = `700 30px ${noteFont}`;
    context.fillText("actions completed", 58, 390);
    context.fillStyle = "#75736c";
    context.font = `20px ${noteFont}`;
    clippedText(`${data.activeAgents} active agents${data.activeAgents ? ` · Most active: ${data.topAgent}` : ""}`, 58, 442, 585);
    if (data.topSystem) clippedText(`Worked most in ${data.topSystem}`, 58, 474, 585);
    const max = Math.max(1, ...data.days.map((day) => day.count));
    const chartX = 705;
    const chartY = 182;
    const chartHeight = 270;
    const barWidth = 48;
    const gap = 18;
    series.days.forEach((day, index) => {
      const x = chartX + index * (barWidth + gap);
      let bottom = chartY + chartHeight;
      if (day.count === 0) {
        sketch.rectangle(x, bottom - 8, barWidth, 8, { fill:"#d8d4ca", fillStyle:"solid", stroke:"#aaa69d", strokeWidth:1.2, roughness:1.3, seed:700 + index });
      } else {
        day.agents.forEach((agent, segmentIndex) => {
          const height = agent.count / max * chartHeight;
          const agentIndex = series.agents.findIndex((item) => (item.key ?? item.name) === (agent.key ?? agent.name));
          const color = agentColor(agentIndex);
          sketch.rectangle(x, bottom - height, barWidth, height + 1, { fill:color, fillStyle:"hachure", fillWeight:1.2, hachureAngle:-12, hachureGap:4, stroke:color, strokeWidth:1.7, roughness:1.15, seed:(index + 1) * 100 + segmentIndex });
          bottom -= height;
        });
      }
      context.fillStyle = "#20201d";
      context.font = `700 17px ${noteFont}`;
      context.textAlign = "center";
      context.fillText(String(day.count), x + barWidth / 2, Math.max(chartY - 12, bottom - 12));
      context.fillStyle = "#75736c";
      context.font = `16px ${noteFont}`;
      context.fillText(day.weekday, x + barWidth / 2, chartY + chartHeight + 30);
    });
    context.textAlign = "left";
    series.agents.forEach((agent, index) => {
      const legendX = chartX + index % 4 * 110;
      const legendY = 526 + Math.floor(index / 4) * 20;
      context.fillStyle = agentColor(index);
      context.beginPath();
      context.arc(legendX + 5, legendY, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#20201d";
      context.font = `700 14px ${noteFont}`;
      clippedText(agent.name, legendX + 15, legendY + 4, 90);
    });
  } else {
    context.fillStyle = "#ff6b45";
    context.font = "800 15px Avenir Next, Arial";
    clippedText(data.platform.toUpperCase(), 58, 162, 760);
    context.fillStyle = "#20201d";
    context.font = `700 64px ${display}`;
    clippedText(data.agentName, 58, 232, 760);
    context.fillStyle = "#e9eef9";
    roundRect(context, 870, 146, 240, 240, 58);
    context.fill();
    context.fillStyle = "#39455d";
    context.font = `700 86px ${display}`;
    context.textAlign = "center";
    context.fillText(initials(data.agentName), 990, 294);
    context.textAlign = "left";
    context.fillStyle = "#20201d";
    context.font = `700 100px ${display}`;
    context.fillText(String(data.totalActions), 58, 367, 760);
    context.font = `700 28px ${display}`;
    context.fillText("recorded actions", 58, 405);
    context.fillStyle = "#75736c";
    context.font = "18px Avenir Next, Arial";
    context.fillText(`Active since ${data.activeSince}`, 58, 454);
    if (data.systems.length) clippedText(`Has worked with: ${data.systems.join(" · ")}`, 58, 488, 1084);
    if (data.commonActions.length) clippedText(`Often: ${data.commonActions.map((action) => action.name).join(" · ")}`, 58, 522, 1084);
  }

  if (data.kind !== "activity") drawFooter(context, data.snapshotLabel);
  const encoded = canvas.toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type:"image/png" });
}

export function StaticShareCard({ data: originalData, label = "Share" }: { data: ShareCardData; label?: string }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeNames, setIncludeNames] = useState(false);
  const [includeApps, setIncludeApps] = useState(false);
  const data = useMemo(() => shareCardSnapshot(originalData, { includeNames, includeApps }), [originalData, includeNames, includeApps]);
  const [preview, setPreview] = useState<{ data: ShareCardData; blob: Blob; url: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const heading = data.kind === "activity" ? "Share your activity" : data.kind === "recap" ? "Share your week" : "Share agent profile";
  const actionLock = useRef(false);
  const fileName = data.kind === "activity" ? "monologue-28-day-activity.png" : data.kind === "recap" ? "monologue-7-day-recap.png" : `monologue-${data.agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  const imageReady = preview?.data === data;

  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const opener = trigger.current;
    element.showModal();
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | undefined;
    async function prepare() {
      try {
        // Loading the whole stack also loads Next's optional local Arial face,
        // which rejects on systems without Arial even when Gaegu is available.
        const font = getComputedStyle(document.body).getPropertyValue("--font-display").trim().split(",")[0];
        const sans = getComputedStyle(document.body).getPropertyValue("--font-sans").trim().split(",")[0];
        await Promise.all([document.fonts.load(`700 56px ${font}`), document.fonts.load(`400 24px ${font}`), document.fonts.load(`400 20px ${sans}`), document.fonts.load(`700 20px ${sans}`)]);
        if (cancelled) return;
        const blob = renderPng(data);
        url = URL.createObjectURL(blob);
        setPreview({ data, blob, url });
        setPreviewError("");
      } catch {
        if (!cancelled) { setPreview(null); setPreviewError("Could not create the image. Close and try again."); }
      }
    }
    void prepare();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [open, data]);

  function imageBlob() {
    if (preview?.data !== data) throw new Error("Image is not ready.");
    return preview.blob;
  }

  function saveBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    try { anchor.click(); } finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  function download() {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setNotice("");
    try {
      saveBlob(imageBlob());
      setNotice("Image download started");
    } catch { setNotice("Could not create or download this image. Please try again."); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function share() {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const blob = imageBlob();
      const file = new File([blob], fileName, { type:"image/png" });
      if (navigator.share && navigator.canShare?.({ files:[file] })) {
        await navigator.share({ files:[file], title:"Monologue", text:shareSummary(data) });
        setNotice("Shared");
      } else {
        saveBlob(blob);
        setNotice("File sharing is unavailable here. Your image download has started.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setNotice("Could not share this image. Try Save image.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  return <>
    <button ref={trigger} className="share-trigger" type="button" onClick={() => { setOpen(true); setNotice(""); setPreview(null); setPreviewError(""); setIncludeNames(false); setIncludeApps(false); }}><Share2 size={16} />{label}</button>
    {open && <dialog ref={dialog} className="share-layer" aria-modal="true" aria-labelledby={headingId} onCancel={event => { event.preventDefault(); setOpen(false); }} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const items = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled), a[href]');
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <button className="share-scrim" type="button" tabIndex={-1} aria-label="Close share preview" onClick={() => setOpen(false)} />
      <section className="share-dialog">
        <div className="share-dialog-content">
        <div className="share-dialog-heading"><div><h2 id={headingId}>{heading}</h2><p>Your feed stays private.</p></div><button ref={closeButton} type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button></div>
        {data.kind !== "activity" && <div className="share-privacy-options"><label><input type="checkbox" disabled={busy} checked={includeNames} onChange={(event) => { setIncludeNames(event.target.checked); setNotice(""); }} />Include agent names</label><label><input type="checkbox" disabled={busy} checked={includeApps} onChange={(event) => { setIncludeApps(event.target.checked); setNotice(""); }} />Include apps and action types</label></div>}
        <div className="activity-image-preview">
          {preview?.data === data ? <Image unoptimized src={preview.url} width={1200} height={630} alt={shareSummary(data)} /> : <p role="status">{previewError || "Preparing your image…"}</p>}
        </div>
        <a className="share-brand-link" href={SHARE_SETUP_URL} target="_blank" rel="noreferrer">{SHARE_SITE_LABEL}</a>
        </div>
        <div className="share-dialog-footer">
        <div className="share-actions"><button type="button" disabled={busy || !imageReady} onClick={share}><Share2 size={16} />Share image</button><button type="button" disabled={busy || !imageReady} onClick={download}><Download size={16} />Save image</button></div>
        <div className="share-notice" role="status">{notice}</div>
        </div>
      </section>
    </dialog>}
  </>;
}
