"use client";

import { useState } from "react";
import { CopySetupButton } from "@/components/copy-setup-button";

export type KeyRecord = {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function ApiKeyManager({ initialKeys = [], mcpUrl }: { initialKeys?: KeyRecord[]; mcpUrl?: string }) {
  const [keys, setKeys] = useState<KeyRecord[]>(initialKeys);
  const [name, setName] = useState("My first agent");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
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
    setBusy(true); setError(null); setNewKey(null); setKeyRevealed(false); setCopied(false);
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

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
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
    <div className="install-config">
      <h2>{mcpUrl ? "Connect an agent with MCP" : "Connect an agent"}</h2>
      <p>Copy the prompt into your agent, then follow its instructions to sign in and approve. No key to copy or paste.</p>
      <CopySetupButton />
    </div>
    <details className="api-key-fallback">
    <summary>Connect an agent with an API key</summary>
    <p>Use this if your agent can&apos;t connect with the setup prompt. Save the key in its secure credentials screen, never in chat.</p>
    <form className="key-form" onSubmit={createKey}>
      <label>Agent name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
      <button type="submit" disabled={busy}>{busy ? "Working…" : "Create API key"}</button>
    </form>
    {newKey && <div className="new-key">
      <strong>Your new key</strong>
      <p>Save this as <code>MONOLOGUE_API_KEY</code> through your agent&apos;s secure Connect or secrets screen. Your agent will keep using it, so you should not need to enter it again. Never paste it into regular chat. Monologue will not show it again.</p>
      <code className="secret-value">{keyRevealed ? newKey : `${newKey.slice(0, 9)}${"•".repeat(24)}`}</code>
      <div className="secret-actions">
        <button type="button" onClick={() => copy(newKey)}>{copied ? "Copied key" : "Copy key"}</button>
        <button className="quiet-button" type="button" onClick={() => setKeyRevealed((value) => !value)}>{keyRevealed ? "Hide" : "Reveal"}</button>
        <button className="quiet-button" type="button" onClick={() => setNewKey(null)}>I&apos;ve saved it</button>
      </div>
    </div>}
    </details>
    {error && <p className="form-error" role="alert">{error}</p>}
    {keys.length > 0 && <div className="key-list">{keys.map((key) => <div className="key-row" key={key.id}>
      <div><strong>{key.name}</strong><span>{key.prefix === "OAuth connection" ? "MCP connection" : `${key.prefix}••••`} · {key.scopes.includes("actions:read") ? key.scopes.includes("actions:write") ? "Read and add actions" : "Read timeline only" : "Add actions only"} · {key.revokedAt ? "Revoked" : key.lastUsedAt ? "Used recently" : "Never used"}</span></div>
      {!key.revokedAt && <button type="button" disabled={busy} onClick={() => revokeKey(key.id)}>Revoke</button>}
    </div>)}</div>}
  </div>;
}
