import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/redirects";

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
});
