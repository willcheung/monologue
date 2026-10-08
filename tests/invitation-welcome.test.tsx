import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ info: vi.fn(), context: vi.fn() }));
vi.mock("@/lib/workspace-invitation-info", () => ({ getWorkspaceInvitationInfo: fixtures.info, invitationToken: (v: unknown) => typeof v === "string" ? v : null }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: fixtures.context }));
vi.mock("@/lib/runtime", () => ({ isCloudMode: () => true }));
vi.mock("@/lib/auth", () => ({ googleSignInConfigured: true }));
vi.mock("@/lib/legal-content", () => ({ legalDocumentsConfigured: () => true }));
vi.mock("@/components/header", () => ({ Header: () => null }));
vi.mock("@/components/google-sign-in-button", () => ({ GoogleSignInButton: ({ callbackURL }: { callbackURL: string }) => <button data-callback={callbackURL}>Continue with Google</button> }));
vi.mock("@/components/workspace-invitation", () => ({ WorkspaceInvitation: () => <button>Join workspace</button> }));
vi.mock("@/components/invitation-account-switch", () => ({ InvitationAccountSwitch: () => <button>Use the invited Google account</button> }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
import SignInPage from "@/app/(auth)/sign-in/page";
import JoinPage from "@/app/(product)/join/page";
const token = "a".repeat(43), next = `/join?token=${token}`;
const invitation = { email: "invited@example.test", workspace: { id: "team", name: "Studio" }, invitedByUser: { name: "Taylor" }, acceptedAt: null };
beforeEach(() => { vi.clearAllMocks(); fixtures.info.mockResolvedValue(invitation); fixtures.context.mockResolvedValue({ user: { id: "member", email: "invited@example.test" }, workspaces: [{ id: "team" }] }); });
describe("invitation welcome", () => {
  it("shows trusted inviter/workspace context, preserves the callback and keeps agreement below the button", async () => {
    const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({ next, inviter: "Spoofed name" }) }));
    expect(html).toContain("Taylor"); expect(html).toContain("Studio"); expect(html).not.toContain("Spoofed name");
    expect(html).not.toContain("invited@example.test"); expect(html).toContain(next);
    expect(html.indexOf("<button")).toBeLessThan(html.indexOf("By clicking"));
    expect(html).toContain('href="/terms"'); expect(html).toContain('href="/privacy"');
    expect(html).toContain("personal feed stays private");
  });
  it("does not encourage signup for unavailable or already-used invitations", async () => {
    for (const record of [null, { ...invitation, acceptedAt: new Date() }]) {
      fixtures.info.mockResolvedValue(record);
      const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({ next }) }));
      expect(html).toContain("This invitation is unavailable"); expect(html).not.toContain("Studio"); expect(html).toContain('data-callback="/feed"');
    }
  });
  it("leaves normal sign-in unchanged and performs no invitation lookup", async () => {
    const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Your agents took action"); expect(fixtures.info).not.toHaveBeenCalled();
  });
  it("keeps the token through sign-in and gives wrong-account users an actionable recovery", async () => {
    fixtures.context.mockResolvedValue(null);
    await expect(JoinPage({ searchParams: Promise.resolve({ token }) })).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent(next)}`);
    fixtures.context.mockResolvedValue({ user: { email: "wrong@example.test" }, workspaces: [] });
    const html = renderToStaticMarkup(await JoinPage({ searchParams: Promise.resolve({ token }) }));
    expect(html).toContain("Use the invited Google account"); expect(html).not.toContain("Join workspace</button>");
    expect(html).toContain("wrong@example.test"); expect(html).toContain("invited@example.test");
  });
  it("opens an already-joined workspace only for the matching current member", async () => {
    fixtures.info.mockResolvedValue({ ...invitation, acceptedAt: new Date() });
    await expect(JoinPage({ searchParams: Promise.resolve({ token }) })).rejects.toThrow("redirect:/feed?workspaceId=team");
    fixtures.context.mockResolvedValue({ user: { email: "invited@example.test" }, workspaces: [] });
    expect(renderToStaticMarkup(await JoinPage({ searchParams: Promise.resolve({ token }) }))).toContain("This invitation is unavailable");
  });
});
