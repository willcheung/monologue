"use client";

import { useState } from "react";

export type KeyRecord = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function ApiKeyManager({ onboarding = false, initialKeys = [] }: { onboarding?: boolean; initialKeys?: KeyRecord[] }) {
  const [keys, setKeys] = useState<KeyRecord[]>(initialKeys);
  const [name, setName] = useState("My first agent");
  const [newKey, setNewKey] = useState<string | null>(null);
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
    setBusy(true); setError(null); setNewKey(null);
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
    {onboarding && <div className="step-number">1</div>}
    <h2>{onboarding ? "Create an agent key" : "Agent keys"}</h2>
    <p>Give each agent its own key. You can revoke a key without affecting the others.</p>
    <form className="key-form" onSubmit={createKey}>
      <label>Agent name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
      <button type="submit" disabled={busy}>{busy ? "Working…" : "Create key"}</button>
    </form>
    {error && <p className="form-error">{error}</p>}
    {newKey && <div className="new-key">
      <strong>Copy this key now</strong>
      <p>For your safety, Monologue will not show it again.</p>
      <code>{newKey}</code>
      <button type="button" onClick={() => navigator.clipboard.writeText(newKey)}>Copy key</button>
      <div className="install-config"><span>Agent environment</span><pre>{`MONOLOGUE_URL=${window.location.origin}\nMONOLOGUE_API_KEY=${newKey}`}</pre></div>
    </div>}
    {keys.length > 0 && <div className="key-list">{keys.map((key) => <div className="key-row" key={key.id}>
      <div><strong>{key.name}</strong><span>{key.prefix}•••• · {key.revokedAt ? "Revoked" : key.lastUsedAt ? "Used recently" : "Never used"}</span></div>
      {!key.revokedAt && <button type="button" disabled={busy} onClick={() => revokeKey(key.id)}>Revoke</button>}
    </div>)}</div>}
  </div>;
}
