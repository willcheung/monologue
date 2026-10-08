"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function InvitationAccountSwitch({ token }: { token: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <><button className="primary-button" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not switch accounts. Try again.");
      router.push(`/sign-in?next=${encodeURIComponent(`/join?token=${token}`)}`); router.refresh();
    } catch { setError("Could not switch accounts. Try again."); setBusy(false); }
  }}>{busy ? "Switching…" : "Use the invited Google account"}</button>{error && <p className="form-error" role="alert">{error}</p>}</>;
}
