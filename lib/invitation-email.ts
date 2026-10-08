import "server-only";
import { isWorkspaceDev } from "./runtime";

export type InvitationEmail = { invitationId: string; to: string; inviterName: string; workspaceName: string; inviteUrl: string };
export type InvitationEmailStatus = "sent" | "not_configured" | "unconfirmed";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const cleanLabel = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160);

export function invitationEmailConfigured(environment: NodeJS.ProcessEnv = process.env) {
  return Boolean(environment.RESEND_API_KEY && environment.MONOLOGUE_EMAIL_FROM) && !isWorkspaceDev();
}

export function buildInvitationEmail(input: InvitationEmail) {
  const inviter = cleanLabel(input.inviterName) || "Your teammate";
  const workspace = cleanLabel(input.workspaceName);
  const url = new URL(input.inviteUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/join" || !url.searchParams.get("token")) throw new Error("Use a secure workspace invitation link");
  const subject = `${inviter} invited you to ${workspace} on Monologue`;
  const text = `${inviter} invited you to join ${workspace}.\n\nSee what your team’s AI assistants changed, in one shared feed.\n\nJoin workspace: ${url.toString()}\n\nYour personal feed stays private. Sign in with the Google account that received this email. This invitation expires in seven days.\n\nNot expecting this invitation? You can ignore this email.`;
  const html = `<div style="background:#fbfaf6;padding:32px 16px;font-family:Arial,sans-serif;color:#20201d"><div style="max-width:520px;margin:auto"><p style="font-size:20px;font-weight:bold">Monologue</p><h1 style="font-size:28px;line-height:1.2">${escapeHtml(inviter)} invited you to ${escapeHtml(workspace)}.</h1><p style="line-height:1.6">See what your team’s AI assistants changed, in one shared feed.</p><p style="margin:28px 0"><a href="${escapeHtml(url.toString())}" style="display:inline-block;background:#20201d;color:#fff;text-decoration:none;padding:15px 22px;border-radius:12px;font-weight:bold">Join workspace</a></p><p style="font-size:14px;line-height:1.6">Your personal feed stays private. Sign in with the Google account that received this email. This invitation expires in seven days.</p><p style="font-size:12px;line-height:1.6;color:#75736c">Not expecting this invitation? You can ignore this email.</p></div></div>`;
  return { subject, text, html };
}

export async function sendInvitationEmail(input: InvitationEmail): Promise<InvitationEmailStatus> {
  if (!invitationEmailConfigured()) return "not_configured";
  try {
    const email = buildInvitationEmail(input);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-invitation/${input.invitationId}` },
      body: JSON.stringify({ from: process.env.MONOLOGUE_EMAIL_FROM, to: [input.to], ...email,
        ...(process.env.MONOLOGUE_EMAIL_REPLY_TO && { reply_to: process.env.MONOLOGUE_EMAIL_REPLY_TO }) }),
      signal: AbortSignal.timeout(8_000),
    });
    const result = await response.json().catch(() => null);
    // Provider acceptance confirms sending, not inbox delivery. Keep the link if unconfirmed.
    return response.ok && typeof result?.id === "string" && result.id.length > 0 ? "sent" : "unconfirmed";
  } catch { return "unconfirmed"; }
}
