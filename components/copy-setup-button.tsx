"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { SETUP_PROMPT } from "@/lib/setup-prompt";

export function CopySetupButton({ prompt = SETUP_PROMPT, label = "Copy setup prompt" }: { prompt?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const field = document.createElement("textarea");
      field.value = prompt;
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
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
