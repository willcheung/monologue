"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton({ configured }: { configured: boolean }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/feed",
      newUserCallbackURL: "/welcome",
      errorCallbackURL: "/sign-in?error=google",
    });
    if (result?.error) setLoading(false);
  }

  return <button className="google-button" type="button" onClick={signIn} disabled={!configured || loading}>
    <span aria-hidden="true">G</span>{loading ? "Opening Google…" : "Continue with Google"}
  </button>;
}
