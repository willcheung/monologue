import { describe, expect, it } from "vitest";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, hasApiScope } from "@/lib/api-keys";

describe("agent key scopes", () => {
  it("keeps automatic write-only keys from reading a shared feed", () => {
    const credential = { scopes: ACTION_WRITE_SCOPE };
    expect(hasApiScope(credential, ACTION_WRITE_SCOPE)).toBe(true);
    expect(hasApiScope(credential, ACTION_READ_SCOPE)).toBe(false);
  });

  it("supports backward-compatible read and write keys", () => {
    const credential = { scopes: `${ACTION_READ_SCOPE} ${ACTION_WRITE_SCOPE}` };
    expect(hasApiScope(credential, ACTION_READ_SCOPE)).toBe(true);
    expect(hasApiScope(credential, ACTION_WRITE_SCOPE)).toBe(true);
  });
});
