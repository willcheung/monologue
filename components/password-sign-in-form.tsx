"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { safeInternalPath } from "@/lib/redirects";

export function PasswordSignInForm({ callbackURL }: { callbackURL: string }) {
  const [expanded, setExpanded] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (expanded) emailInput.current?.focus(); }, [expanded]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signIn.email({
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        callbackURL: safeInternalPath(callbackURL, "/feed"),
        rememberMe: false,
      });
      if (result.error) {
        setError(result.error.status === 429
          ? "Too many attempts. Wait a minute, then try again."
          : "Unable to sign in. Check your email and password.");
        form.querySelector<HTMLInputElement>("[name=password]")!.value = "";
        setLoading(false);
      }
    } catch {
      setError("Sign-in is unavailable. Please try again.");
      setLoading(false);
    }
  }

  return <div className="email-sign-in">
    <button className="email-sign-in-toggle" type="button" aria-expanded={expanded} aria-controls="password-sign-in-form" disabled={loading} onClick={() => { setExpanded(!expanded); setError(""); }}>Sign in with email</button>
    <div id="password-sign-in-form" hidden={!expanded}>
    {expanded && <form className="password-sign-in" onSubmit={signIn} aria-label="Sign in with email">
    <p className="password-sign-in-note">Existing email accounts only. Email sign-up is not available.</p>
    <label htmlFor="sign-in-email">Email</label>
    <input ref={emailInput} id="sign-in-email" name="email" type="email" autoComplete="username" required disabled={loading} />
    <label htmlFor="sign-in-password">Password</label>
    <input id="sign-in-password" name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={loading} />
    {error && <p role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    <small>Use the credentials provided to you. For password help, contact the person who set up your account.</small>
    </form>}
    </div>
  </div>;
}
