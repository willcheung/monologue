"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Settings = { emailEnabled: boolean; slackEnabled: boolean; slackChannel: string | null; hour: number; timeZone: string };
export function WorkspaceReportSettings({ initial, workspaceId, owner, paid }: { initial: Settings; workspaceId: string; owner: boolean; paid: boolean }) {
  const [settings, setSettings] = useState(initial); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const router = useRouter();
  return <form className="workspace-report-settings" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const response = await fetch("/api/workspaces/reports", { method: "POST", headers: { "Content-Type": "application/json", "x-monologue-workspace": workspaceId }, body: JSON.stringify(settings) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setMessage("Saved for preview. Delivery is not connected yet."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings."); } finally { setBusy(false); }
  }}>
    <div className="workspace-section-heading"><div><span className="kicker">Workspace Plus</span><h2>Bring the report to your team.</h2><p>Scheduled email and Slack reports are a paid workspace feature.</p></div></div>
    {!paid && <p className="workspace-feature-note">This workspace is Free. You can preview a report below; delivery settings unlock with Plus.</p>}
    <fieldset disabled={!owner || !paid || busy}>
      <label className="workspace-report-toggle"><input type="checkbox" checked={settings.emailEnabled} onChange={event => setSettings({ ...settings, emailEnabled: event.target.checked })} /><span><strong>Email report</strong><small>For workspace members who choose to receive it.</small></span></label>
      <label className="workspace-report-toggle"><input type="checkbox" checked={settings.slackEnabled} onChange={event => setSettings({ ...settings, slackEnabled: event.target.checked })} /><span><strong>Slack report</strong><small>One daily report in your team&apos;s chosen channel.</small></span></label>
      {settings.slackEnabled && <label className="workspace-field">Slack channel (preview)<input placeholder="#agent-updates" value={settings.slackChannel ?? ""} onChange={event => setSettings({ ...settings, slackChannel: event.target.value })} /><small>A channel name does not connect Slack. Live connection comes in the next iteration.</small></label>}
      <div className="workspace-inline-form"><label className="workspace-field">Daily at<select value={settings.hour} onChange={event => setSettings({ ...settings, hour: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2000,0,1,hour)))}</option>)}</select></label><label className="workspace-field">Timezone<select value={settings.timeZone} onChange={event => setSettings({ ...settings, timeZone: event.target.value })}>{Array.from(new Set([settings.timeZone, "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney", "UTC"])).map(zone => <option key={zone}>{zone}</option>)}</select></label></div>
      <p className="workspace-feature-note">Preview only: no email or Slack messages are sent, and no daily job is running. Live reports will skip days with no activity.</p>
      {owner && <button className="primary-button" type="submit">{busy ? "Saving…" : "Save report settings"}</button>}
    </fieldset>{!owner && <p>Ask your workspace owner to manage delivery settings.</p>}{message && <p role="status">{message}</p>}
  </form>;
}
