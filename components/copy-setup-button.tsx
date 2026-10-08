"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { SETUP_PROMPT } from "@/lib/setup-prompt";

export function CopySetupButton({ prompt = SETUP_PROMPT, label = "Copy setup prompt" }: { prompt?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copyPrompt() {
    setError(false);
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const field = document.createElement("textarea");
      field.value = prompt;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      let succeeded = false;
      try { succeeded = document.execCommand("copy"); } catch { /* Show selectable text if copying is unavailable. */ }
      field.remove();
      if (!succeeded) { setError(true); return; }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <><button className="setup-copy-button" type="button" onClick={copyPrompt}>
      {copied ? <Check size={19} /> : <Copy size={19} />}
      <span>{copied ? "Copied" : label}</span>
    </button>{error && <div><p role="status">Could not copy automatically. Select and copy the prompt below.</p><textarea aria-label="Prompt to copy manually" readOnly value={prompt} rows={6} style={{ width: "100%" }} /></div>}</>
  );
}
