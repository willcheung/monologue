"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    const result = await authClient.signOut();

    if (result.error) {
      setPending(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return <button className="sign-out-button" type="button" disabled={pending} onClick={signOut}>{pending ? "Signing out…" : "Sign out"}</button>;
}
