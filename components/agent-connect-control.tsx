"use client";

import Image from "next/image";
import { Bot, Check, ChevronDown, FileText } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AGENT_OPTIONS, agentSetup, setupOrigin, type AgentId, type SetupOptions } from "@/lib/agent-onboarding";
import { CopySetupButton } from "./copy-setup-button";

const logos: Partial<Record<AgentId, string>> = { "claude-code": "/agents/claude-code.webp", codex: "/agents/codex.webp", cursor: "/agents/cursor.webp", hermes: "/agents/hermes.png", openclaw: "/agents/openclaw.svg", muse: "/agents/muse.svg" };
function AgentLogo({ agent }: { agent: AgentId }) {
  const src = logos[agent];
  return <span className="agent-connect-logo" aria-hidden="true">{src ? <Image src={src} width={28} height={28} alt="" unoptimized loading="eager" /> : <Bot size={21} />}</span>;
}

export function AgentConnectControl({ instanceUrl, mcpUrl, basePrompt, initialAgent = "claude-code", agent, onAgentChange, taskPrompt }: SetupOptions & { initialAgent?: AgentId; agent?: AgentId; onAgentChange?: (id: AgentId) => void; taskPrompt?: string }) {
  const [choice, setChoice] = useState<AgentId>(initialAgent);
  const selected = agent ?? choice;
  const setup = agentSetup(selected, { instanceUrl, mcpUrl, basePrompt });
  const prompt = setup.prompt + (taskPrompt ? `\n\nAfter setup is verified, help me with this task:\n${taskPrompt}` : "");
  const menu = useRef<HTMLDetailsElement>(null);
  const hintId = useId();
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false; };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  function choose(id: AgentId) {
    setChoice(id);
    onAgentChange?.(id);
    if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
  }
  return <div className="agent-connect-control">
    <div className="agent-connect-pill">
      <div className="agent-connect-copy"><CopySetupButton key={selected} prompt={prompt} label="Copy setup instructions" /></div>
      <details className="agent-connect-menu" ref={menu} onKeyDown={event => { if (event.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
        <summary aria-label="Choose your agent" aria-describedby={hintId}><span className="agent-connect-stack">{(["claude-code", "codex", "cursor"] as const).map(id => <AgentLogo key={id} agent={id} />)}</span><ChevronDown className="agent-connect-chevron" size={18} aria-hidden="true" /></summary>
        <div className="agent-connect-popover">
          <p className="agent-connect-menu-title">Choose your agent</p>
          <div role="group" aria-label="Agent choice">{AGENT_OPTIONS.map((option, index) => <button type="button" key={option.id} className={index === 3 ? "agent-connect-more" : undefined} aria-pressed={selected === option.id} onClick={() => choose(option.id)}><AgentLogo agent={option.id} /><span>{option.name}</span>{selected === option.id && <Check size={17} aria-hidden="true" />}</button>)}</div>
          <a href={`${setupOrigin(instanceUrl)}/agent-setup/SKILL.md`}><FileText size={20} aria-hidden="true" /><span>View SKILL.md</span></a>
        </div>
      </details>
    </div>
    <p className="agent-connect-hint" id={hintId}>For {setup.name === "Another agent" ? "your agent" : setup.name}. Paste into your agent to begin.</p>
  </div>;
}
