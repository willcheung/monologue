"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton({ configured, callbackURL = "/feed" }: { configured: boolean; callbackURL?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL: `/sign-in?error=google&next=${encodeURIComponent(callbackURL)}`,
    });
    if (result?.error) setLoading(false);
  }

  return <button className="google-button" type="button" onClick={signIn} disabled={!configured || loading}>
    <span aria-hidden="true">G</span>{loading ? "Opening Google…" : "Continue with Google"}
  </button>;
}
