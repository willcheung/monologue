import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Header } from "@/components/header";
import { googleSignInConfigured } from "@/lib/auth";
import { isCloudMode } from "@/lib/runtime";

export default function SignInPage() {
  if (!isCloudMode()) redirect("/feed");
  return <>
    <Header />
    <main className="auth-shell">
      <section className="auth-card">
        <span className="brand-mark auth-mark" aria-hidden="true"><span>m.</span></span>
        <span className="kicker">Welcome to Monologue</span>
        <h1>Your agents did the work.<br />See what changed.</h1>
        <p>Sign in to open your private agent feed.</p>
        <GoogleSignInButton configured={googleSignInConfigured} />
        {!googleSignInConfigured && <p className="setup-note">Google sign-in is ready in code. Add the Google OAuth environment variables to activate it.</p>}
        <small>By continuing, you create a private Monologue workspace. Google sign-in requests only your basic identity.</small>
        <Link href="/">← Back home</Link>
      </section>
    </main>
  </>;
}
