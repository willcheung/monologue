import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { WorkspaceManager } from "@/components/workspace-manager";

describe("workspace membership UI", () => {
  it("shows the three-person cap and disables invitations when all places are reserved, including legacy plans", () => {
    const html = renderToStaticMarkup(<WorkspaceManager workspace={{ id: "fixture", name: "Test team", kind: "shared", plan: "plus" }} members={[{ userId: "owner", role: "owner", name: "Owner", email: "owner@example.test" }]} invitations={[{ id: "a", email: "first@example.test" }, { id: "b", email: "second@example.test" }]} owner reservedSeats={3} />);
    expect(html).toContain("3 / 3 seats · Free");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Invite teammate<\/button>/);
    expect(html).toContain("All three places are reserved");
    expect(html).toContain("including the owner");
    expect(html).toContain("Pending invitations reserve a place");
  });
});
