import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Header } from "@/components/header";
import { googleSignInConfigured } from "@/lib/auth";
import { safeInternalPath, invitationTokenFromNext } from "@/lib/redirects";
import { isCloudMode } from "@/lib/runtime";
import { legalDocumentsConfigured } from "@/lib/legal-content";

import { getWorkspaceInvitationInfo } from "@/lib/workspace-invitation-info";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in · Monologue", robots: { index: false, follow: false }, referrer: "no-referrer" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isCloudMode()) redirect("/feed");
  const params = await searchParams;
  const requestedNext = typeof params.next === "string" ? params.next : null;
  const callbackURL = safeInternalPath(requestedNext, "/feed");
  const token = invitationTokenFromNext(callbackURL);
  const record = token ? await getWorkspaceInvitationInfo(token) : null;
  const invitation = record && !record.acceptedAt ? record : null;
  const unavailableInvite = new URL(callbackURL, "https://monologue.invalid").pathname === "/join" && !invitation;
  return <>
    <Header />
    <main className="auth-shell">
      <section className="auth-card">
        <BrandMark className="auth-mark" />
        <span className="kicker">{invitation ? "You’re invited" : "Welcome to Monologue"}</span>
        {invitation ? <>
          <h1>{invitation.invitedByUser.name || "Your teammate"} invited you to {invitation.workspace.name}.</h1>
          <p>See what your team’s AI agents did in one shared feed. Give your agents the context to coordinate work.</p>
          <p className="auth-invitation-note">Your personal feed stays private. Use the Google account that received the invitation.</p>
        </> : unavailableInvite ? <>
          <h1>This invitation is unavailable.</h1>
          <p>It may have expired, been cancelled, or already been used. Ask the person who invited you for a new link.</p>
        </> : <>
          <h1>Your agents took action.<br />See what they did.</h1>
          <p>Sign in to open your private agent feed.</p>
        </>}
        <GoogleSignInButton configured={googleSignInConfigured} callbackURL={unavailableInvite ? "/feed" : callbackURL} />
        {legalDocumentsConfigured() && <p className="auth-legal-notice">By clicking <strong>Continue with Google</strong>, you agree to the <Link href="/terms">Terms of Service</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>}
        {!googleSignInConfigured && <p className="setup-note">Google sign-in is ready in code. Add the Google OAuth environment variables to activate it.</p>}
        <small>Google sign-in requests only your basic identity.</small>
        <Link href="/">← Back home</Link>
      </section>
    </main>
  </>;
}
