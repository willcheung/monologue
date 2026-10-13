export type OAuthConnectionStatus = {
  state: "pending" | "connected" | "expired" | "revoked";
  agentName: string;
  workspaceId: string;
  workspaceName: string;
  canRead: boolean;
  canWrite: boolean;
  verified: boolean;
};
export type OAuthConsentResult = { error: string } | { connectionId: string; redirectUrl: string } | null;

export function isNativeCallback(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

// Browser policies may return null or throw. Neither may prevent consent or
// the explicit continuation link from completing the native connection.
export function openOAuthCallbackWindow(): Window | null {
  let popup: Window | null = null;
  try {
    popup = window.open("about:blank", "_blank", "popup,width=520,height=520");
    if (popup) {
      popup.opener = null;
      popup.document.title = "Connecting your agent";
      popup.document.body.textContent = "Finishing your connection… Return to Monologue for confirmation.";
    }
    return popup;
  } catch {
    try { popup?.close(); } catch { /* Window cleanup is best effort. */ }
    return null;
  }
}
