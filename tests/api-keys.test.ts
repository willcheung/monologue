import { describe, expect, it } from "vitest";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, DEFAULT_AGENT_SCOPES, hasApiScope } from "@/lib/api-keys";

describe("agent key scopes", () => {
  it("preserves older write-only grants instead of broadening their access", () => {
    const credential = { scopes: ACTION_WRITE_SCOPE };
    expect(hasApiScope(credential, ACTION_WRITE_SCOPE)).toBe(true);
    expect(hasApiScope(credential, ACTION_READ_SCOPE)).toBe(false);
  });

  it("includes reading and reporting in the standard connection", () => {
    const credential = { scopes: DEFAULT_AGENT_SCOPES };
    expect(hasApiScope(credential, ACTION_READ_SCOPE)).toBe(true);
    expect(hasApiScope(credential, ACTION_WRITE_SCOPE)).toBe(true);
  });
});
