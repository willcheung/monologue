import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Header } from "@/components/header";
import { googleSignInConfigured } from "@/lib/auth";
import { safeInternalPath } from "@/lib/redirects";
import { isCloudMode } from "@/lib/runtime";
import { legalDocumentsConfigured } from "@/lib/legal-content";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isCloudMode()) redirect("/feed");
  const params = await searchParams;
  const requestedNext = typeof params.next === "string" ? params.next : null;
  const callbackURL = safeInternalPath(requestedNext, "/feed");
  return <>
    <Header />
    <main className="auth-shell">
      <section className="auth-card">
        <BrandMark className="auth-mark" />
        <span className="kicker">Welcome to Monologue</span>
        <h1>Your agents took action.<br />See what they did.</h1>
        <p>Sign in to open your private agent feed.</p>
        {legalDocumentsConfigured() && <p className="auth-legal-notice">By clicking <strong>Continue with Google</strong>, you agree to the <Link href="/terms">Terms of Service</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>}
        <GoogleSignInButton configured={googleSignInConfigured} callbackURL={callbackURL} />
        {!googleSignInConfigured && <p className="setup-note">Google sign-in is ready in code. Add the Google OAuth environment variables to activate it.</p>}
        <small>Google sign-in requests only your basic identity.</small>
        <Link href="/">← Back home</Link>
      </section>
    </main>
  </>;
}
