import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSetupPrompt } from "@/lib/setup-prompt";

const fixtures = vi.hoisted(() => ({ context: vi.fn(), cloud: vi.fn(), enabled: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: fixtures.context }));
vi.mock("@/lib/runtime", () => ({ isCloudMode: fixtures.cloud }));
vi.mock("@/lib/mcp-oauth", () => ({ mcpIssuer: () => "https://preview.example.test", mcpEnabled: fixtures.enabled }));
import { getSetupContext } from "@/lib/setup-context";

beforeEach(() => { vi.clearAllMocks(); fixtures.cloud.mockReturnValue(true); fixtures.enabled.mockReturnValue(true); });

describe("shared setup context", () => {
  it("matches the selected workspace prompt used by Feed and Add agent", async () => {
    fixtures.context.mockResolvedValue({ workspace: { id: "selected-team", name: "Studio team", kind: "shared" } });
    const context = await getSetupContext();
    expect(context.prompt).toBe(buildSetupPrompt({ origin: context.origin, workspace: { id: "selected-team", name: "Studio team" }, mcpEnabled: true }));
    expect(context.prompt).not.toContain("monologue.events");
  });
  it("uses a generic approval prompt for a signed-out visitor without workspace identifiers", async () => {
    fixtures.context.mockResolvedValue(null);
    expect((await getSetupContext()).prompt).toBe(buildSetupPrompt({ origin: "https://preview.example.test", mcpEnabled: true }));
  });
  it("does not access hosted sessions or databases in the public self-hosted build", async () => {
    fixtures.cloud.mockReturnValue(false); fixtures.enabled.mockReturnValue(false);
    expect((await getSetupContext()).prompt).toContain("MCP is not enabled here");
    expect(fixtures.context).not.toHaveBeenCalled();
  });
});
