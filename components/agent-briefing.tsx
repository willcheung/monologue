"use client";

import { useId, useState } from "react";
import type { Briefing } from "@/lib/feed-briefing";
import { CopySetupButton } from "./copy-setup-button";

export function AgentBriefing({ briefings, scopeLabel, error, defaultOpen = false }: {
  briefings: Briefing[]; scopeLabel: string; error: string | null; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [selected, setSelected] = useState("weekly");
  const panelId = useId();
  const briefing = briefings.find(item => item.id === selected) ?? briefings[0];
  return <section className="agent-briefing" aria-label="Use this recap with your agent">
    <div className="agent-briefing-intro"><p>Use this recap with your agent.</p><button className="quiet-button" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>{open ? "Close briefing" : "Get my weekly briefing"}<span aria-hidden="true">{open ? " −" : " →"}</span></button></div>
    {open && <div className="agent-briefing-panel" id={panelId}>
      <h2>What do you want to catch up on?</h2>
      <div className="briefing-choices" role="group" aria-label="Briefing type">{briefings.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>
      <p className="briefing-scope">{scopeLabel}</p>
      <p className="briefing-request">{briefing.request}</p>
      {error ? <p className="form-error" role="alert">{error}</p> : <>
        <CopySetupButton key={briefing.prompt} prompt={briefing.prompt} label="Copy briefing prompt" />
        <p className="briefing-help">Paste it into your agent. Setup is included; connect once to read and report in this workspace.</p>
      </>}
    </div>}
  </section>;
}
