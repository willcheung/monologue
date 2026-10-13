"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { OAuthCompletion } from "./oauth-completion";
import { openOAuthCallbackWindow, type OAuthConsentResult } from "@/lib/oauth-completion";

export function OAuthConsent({ action, nativeCallback, workspaceId, workspaces, children }: {
  action: (previous: OAuthConsentResult, form: FormData) => Promise<OAuthConsentResult>;
  children: ReactNode; nativeCallback: boolean; workspaceId: string; workspaces: { id: string; name: string; kind: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const callbackWindow = useRef<Window | null>(null);
  const delivered = useRef<string | null>(null);
  useEffect(() => {
    if (result && "error" in result) callbackWindow.current?.close();
    if (!result || !("connectionId" in result) || delivered.current === result.connectionId) return;
    delivered.current = result.connectionId;
    if (callbackWindow.current && !callbackWindow.current.closed) {
      try { callbackWindow.current.location.replace(result.redirectUrl); }
      catch {
        callbackWindow.current.close();
        callbackWindow.current = null;
      }
    }
  }, [result]);

  if (result && "connectionId" in result) return <OAuthCompletion connectionId={result.connectionId}
    callbackUrl={result.redirectUrl} callbackWindow={callbackWindow} />;

  return <>{children}<form action={formAction} className="oauth-consent" onSubmit={event => {
    if (!nativeCallback || pending || (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") !== "approve") return;
    // Open synchronously with the click, so normal popup policy can allow it.
    // Remove the opener before navigating to the client-owned callback.
    callbackWindow.current = openOAuthCallbackWindow();
  }}>
    <label>Workspace<select name="workspaceId" defaultValue={workspaceId} disabled={pending}>
      {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.kind === "personal" ? "Personal" : workspace.name}</option>)}
    </select></label>
    {result && "error" in result && <p className="form-error" role="alert">{result.error}</p>}
    <div className="secret-actions"><button className="primary-button" name="decision" value="approve" disabled={pending}>{pending ? "Connecting…" : "Connect agent"}</button>
      <button className="quiet-button" name="decision" value="deny" disabled={pending}>Cancel</button></div>
  </form></>;
}
