"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const SETUP_PROMPT = "Read and execute https://www.monologue.events/agent-setup/SKILL.md";

export function CopySetupButton() {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
    } catch {
      const field = document.createElement("textarea");
      field.value = SETUP_PROMPT;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="setup-copy-button" type="button" onClick={copyPrompt}>
      {copied ? <Check size={19} /> : <Copy size={19} />}
      <span>{copied ? "Copied setup prompt" : "Copy setup prompt"}</span>
      <span className="agent-dots" aria-hidden="true">
        <i>C</i><i>Cl</i><i>H</i>
      </span>
    </button>
  );
}
