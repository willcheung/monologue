"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return <button className="sign-out-button" type="button" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}>Sign out</button>;
}
