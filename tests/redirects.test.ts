import { describe, expect, it } from "vitest";
import { newUserLandingPath, safeInternalPath } from "@/lib/redirects";

describe("safe internal redirects", () => {
  it("keeps an internal connection callback", () => {
    expect(safeInternalPath("/connect?request=abc&code=def", "/feed"))
      .toBe("/connect?request=abc&code=def");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeInternalPath("https://example.com", "/feed")).toBe("/feed");
    expect(safeInternalPath("//example.com", "/feed")).toBe("/feed");
    expect(safeInternalPath(null, "/feed")).toBe("/feed");
  });

  it("sends new signups to Add agent instead of the feed or another requested page", () => {
    expect(newUserLandingPath("/feed")).toBe("/settings/keys");
    expect(newUserLandingPath("/agents")).toBe("/settings/keys");
  });

  it("preserves a new signup's in-progress agent approval", () => {
    expect(newUserLandingPath("/connect?request=abc&code=def"))
      .toBe("/connect?request=abc&code=def");
    expect(newUserLandingPath("/connect?request=abc"))
      .toBe("/settings/keys");
  });
});
