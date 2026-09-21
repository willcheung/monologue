import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Header } from "@/components/header";
import { googleSignInConfigured } from "@/lib/auth";
import { safeInternalPath } from "@/lib/redirects";
import { isCloudMode } from "@/lib/runtime";

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
        <GoogleSignInButton configured={googleSignInConfigured} callbackURL={callbackURL} />
        {!googleSignInConfigured && <p className="setup-note">Google sign-in is ready in code. Add the Google OAuth environment variables to activate it.</p>}
        <small>By continuing, you create a private Monologue workspace, agree to our <Link href="/terms">Terms</Link>, and acknowledge our <Link href="/privacy">Privacy Policy</Link>. Google sign-in requests only your basic identity.</small>
        <Link href="/">← Back home</Link>
      </section>
    </main>
  </>;
}
