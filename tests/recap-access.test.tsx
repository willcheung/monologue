import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActivitySnapshot } from "@/lib/activity";
import { buildWeeklyLedger } from "@/lib/ledger";

const fixtures = vi.hoisted(() => ({ context: vi.fn(), activity: vi.fn(), weekly: vi.fn(), agents: vi.fn(), daily: vi.fn(), zone: "UTC" }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: fixtures.context }));
vi.mock("@/lib/workspace-activity", () => ({ getWorkspaceActivity: fixtures.activity }));
vi.mock("@/lib/weekly-ledger", () => ({ getWeeklyLedger: fixtures.weekly }));
vi.mock("@/lib/agents", () => ({ listAgentSummaries: fixtures.agents }));
vi.mock("@/lib/workspace-reports", () => ({ dailyWorkspaceReport: fixtures.daily }));
vi.mock("@/lib/mcp-oauth", () => ({ mcpEnabled: () => true, mcpIssuer: () => "http://localhost:3101" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-ip-timezone": fixtures.zone }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/components/header", () => ({ Header: () => null }));
vi.mock("@/components/sketch-ledger-chart", () => ({ SketchLedgerChart: () => null }));
vi.mock("@/components/daily-report", () => ({ DailyReport: () => null }));
vi.mock("@/components/agent-briefing", () => ({ AgentBriefing: () => null }));
vi.mock("@/components/static-share-card", () => ({ StaticShareCard: () => null }));
import RecapPage from "@/app/(product)/recap/page";

const context = (id: string) => ({ user: { id: "owner" }, workspace: { id, name: id, kind: "shared" } });
beforeEach(() => {
  vi.clearAllMocks(); fixtures.zone = "UTC";
  fixtures.context.mockImplementation(async id => context(id ?? "personal"));
  fixtures.activity.mockImplementation(async (_id, now, zone) => buildActivitySnapshot([], now, zone));
  fixtures.weekly.mockImplementation(async (_id, now, zone) => buildWeeklyLedger([], now, zone));
  fixtures.agents.mockResolvedValue([]);
});
describe("Recap server authorization", () => {
  it("authorizes an explicit workspace even when another tab has changed the selected workspace", async () => {
    const html = renderToStaticMarkup(await RecapPage({ searchParams: Promise.resolve({ workspaceId: "shared" }) }));
    expect(fixtures.context.mock.calls).toEqual([[], ["shared"]]);
    for (const query of [fixtures.activity, fixtures.weekly, fixtures.agents, fixtures.daily]) expect(query.mock.calls[0][0]).toBe("shared");
    expect(html).toContain("Your agents’ activity");
    expect(html).toContain("Copy setup instructions");
  });
  it.each([false, true])("does not query activity for unauthenticated or inaccessible workspaces (signed in: %s)", async signedIn => {
    fixtures.context.mockImplementation(async id => signedIn && !id ? context("personal") : null);
    await expect(RecapPage({ searchParams: Promise.resolve({ workspaceId: "inaccessible" }) })).rejects.toThrow(signedIn ? "not-found" : "redirect:/sign-in");
    for (const query of [fixtures.activity, fixtures.weekly, fixtures.agents, fixtures.daily]) expect(query).not.toHaveBeenCalled();
  });
  it("passes one capture time and a validated UTC fallback to both aggregates", async () => {
    fixtures.zone = "bad-zone";
    await RecapPage({ searchParams: Promise.resolve({}) });
    expect(fixtures.activity.mock.calls[0][1]).toBe(fixtures.weekly.mock.calls[0][1]);
    expect(fixtures.activity.mock.calls[0][2]).toBe("UTC");
  });
});
