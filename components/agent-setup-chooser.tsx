"use client";

import { useState } from "react";
import { Clipboard, Terminal } from "lucide-react";
import { agentSetup, type AgentId, type SetupOptions } from "@/lib/agent-onboarding";
import { CopySetupButton } from "./copy-setup-button";
import { AgentConnectControl } from "./agent-connect-control";

export function AgentSetupChooser({ instanceUrl, mcpUrl, initialAgent = "claude-code", taskPrompt, basePrompt }: SetupOptions & { initialAgent?: AgentId; taskPrompt?: string }) {
  const [selected, setSelected] = useState<AgentId | undefined>(initialAgent);
  const setup = selected ? agentSetup(selected, { instanceUrl, mcpUrl, basePrompt }) : undefined;
  const prompt = setup ? setup.prompt + (taskPrompt ? `\n\nAfter setup is verified, help me with this task:\n${taskPrompt}` : "") : "";
  return <div className="agent-setup-chooser">
    <AgentConnectControl instanceUrl={instanceUrl} mcpUrl={mcpUrl} basePrompt={basePrompt} agent={selected} onAgentChange={setSelected} taskPrompt={taskPrompt} />
    {setup ? <section key={setup.id} className="agent-selected-setup" aria-label={`Connect ${setup.name}`}>
      <ol className="agent-setup-steps">
        <li><b aria-hidden="true">1</b><div><strong>Paste into {setup.name === "Another agent" ? "your agent" : setup.name}</strong><p>Your agent will handle the setup steps it supports.</p></div></li>
        <li><b aria-hidden="true">2</b><div><strong>{mcpUrl ? "Approve the connection" : "Use your secure connection"}</strong><p>{mcpUrl ? "Choose your Monologue feed when sign-in opens. You approve reading and reporting in that feed." : "Your agent should reuse configured credentials or guide you through secure setup. Keep keys out of chat."}</p></div></li>
        <li><b aria-hidden="true">3</b><div><strong>Confirm it’s ready</strong><p>Ask your agent to check its connection and reporting instructions. It may need one restart.</p></div></li>
      </ol>
      <p className="agent-setup-note">{setup.note}</p>
      <div className="agent-setup-help">
        <details className="agent-setup-details"><summary><Clipboard size={15} aria-hidden="true" />Review the instructions</summary><pre>{prompt}</pre></details>
        {setup.commands.length > 0 && <details className="agent-setup-details"><summary><Terminal size={15} aria-hidden="true" />Manual setup</summary><p>Use these only when the connection is missing. Keep existing connections and unrelated settings.</p><pre>{setup.commands.join("\n\n")}</pre><CopySetupButton prompt={setup.commands.join("\n\n")} label="Copy configuration reference" /></details>}
      </div>
    </section> : <p className="agent-choice-empty">Choose an agent to see its setup steps.</p>}
  </div>;
}
