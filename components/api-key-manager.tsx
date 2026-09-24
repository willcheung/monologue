"use client";

import { useState } from "react";

export type KeyRecord = {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const AGENT_SETUP_URL = "https://www.monologue.events/agent-setup";
const INSTALL_PROMPT = `Read and execute ${AGENT_SETUP_URL}`;

export function ApiKeyManager({ initialKeys = [] }: { initialKeys?: KeyRecord[] }) {
  const [keys, setKeys] = useState<KeyRecord[]>(initialKeys);
  const [name, setName] = useState("My first agent");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [copied, setCopied] = useState<"key" | "install" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    const response = await fetch("/api/keys");
    if (!response.ok) return;
    const body = await response.json();
    setKeys(body.keys);
  }

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setNewKey(null); setKeyRevealed(false); setCopied(null);
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not create the key");
    else { setNewKey(body.key.key); await loadKeys(); }
    setBusy(false);
  }

  async function copy(value: string, type: "key" | "install") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function revokeKey(id: string) {
    setBusy(true); setError(null);
    const response = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) setError("Could not revoke the key");
    await loadKeys(); setBusy(false);
  }

  return <div className="key-manager">
    <h2>API keys</h2>
    <p>For custom connectors or agents that can&apos;t connect automatically. Each new key is shown once.</p>
    <form className="key-form" onSubmit={createKey}>
      <label>Agent name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
      <button type="submit" disabled={busy}>{busy ? "Working…" : "Create API key"}</button>
    </form>
    {error && <p className="form-error">{error}</p>}
    {newKey && <div className="new-key">
      <strong>Your new key</strong>
      <p>Save this as <code>MONOLOGUE_API_KEY</code> through your agent&apos;s secure Connect or secrets screen. Your agent will keep using it, so you should not need to enter it again. Never paste it into regular chat. Monologue will not show it again.</p>
      <code className="secret-value">{keyRevealed ? newKey : `${newKey.slice(0, 9)}${"•".repeat(24)}`}</code>
      <div className="secret-actions">
        <button type="button" onClick={() => copy(newKey, "key")}>{copied === "key" ? "Copied key" : "Copy key"}</button>
        <button className="quiet-button" type="button" onClick={() => setKeyRevealed((value) => !value)}>{keyRevealed ? "Hide" : "Reveal"}</button>
        <button className="quiet-button" type="button" onClick={() => setNewKey(null)}>I&apos;ve saved it</button>
      </div>
    </div>}
    <div className="install-config">
      <span>Install the skill</span>
      <pre>{INSTALL_PROMPT}</pre>
      <p>This is the easier option. The prompt is public and safe to paste; your agent will give you a private approval link and connect without showing a key.</p>
      <button type="button" onClick={() => copy(INSTALL_PROMPT, "install")}>{copied === "install" ? "Copied install prompt" : "Copy install prompt"}</button>
    </div>
    {keys.length > 0 && <div className="key-list">{keys.map((key) => <div className="key-row" key={key.id}>
      <div><strong>{key.name}</strong><span>{key.prefix}•••• · {key.scopes.includes("actions:read") ? "Read and add actions" : "Add actions only"} · {key.revokedAt ? "Revoked" : key.lastUsedAt ? "Used recently" : "Never used"}</span></div>
      {!key.revokedAt && <button type="button" disabled={busy} onClick={() => revokeKey(key.id)}>Revoke</button>}
    </div>)}</div>}
  </div>;
}
