import { describe, expect, it } from "vitest";
import { actionInputSchema, attributeSelfReportedAction } from "@/lib/action-schema";
import { buildActionWhere } from "@/lib/actions";
import { CATEGORIES, CATEGORY_PRESENTATION } from "@/lib/constants";

const valid = { agentName:"Codex", verb:"pushed", summary:"Pushed a commit.", category:"code", status:"completed", system:"GitHub" };

describe("action validation", () => {
  it("accepts a valid minimal action and defaults the source", () => {
    const result = actionInputSchema.parse(valid);
    expect(result.source).toBe("self_reported");
  });

  it("rejects missing fields and non-action categories", () => {
    expect(actionInputSchema.safeParse({ ...valid, summary:undefined }).success).toBe(false);
    expect(actionInputSchema.safeParse({ ...valid, category:"research" }).success).toBe(false);
  });

  it("rejects unknown properties", () => {
    expect(actionInputSchema.safeParse({ ...valid, internalThought:"secret" }).success).toBe(false);
  });

  it("keeps provenance and agent identity server-owned", () => {
    const input = actionInputSchema.parse({ ...valid, source:"verified", agentId:"untrusted-agent" });
    const attributed = attributeSelfReportedAction(input, { id:"trusted-agent", name:"Muse" });
    expect(attributed.source).toBe("self_reported");
    expect(attributed.agentId).toBe("trusted-agent");
    expect(attributed.agentName).toBe("Muse");
  });
});

describe("filters", () => {
  it("builds exact filters and a five-field text search", () => {
    const where = buildActionWhere({ agent:"Codex", category:"code", search:"GitHub" }, "workspace-1");
    expect(where.workspaceId).toBe("workspace-1");
    expect(where.agentName).toBe("Codex");
    expect(where.category).toBe("code");
    expect(where.OR).toHaveLength(5);
  });

  it("ignores invalid enum filters", () => {
    const where = buildActionWhere({ category:"research", status:"unknown" });
    expect(where.category).toBeUndefined();
    expect(where.status).toBeUndefined();
  });

  it("supports stable internal agent identity filters", () => {
    const where = buildActionWhere({ agentId:"agent-123" }, "workspace-1");
    expect(where.agentId).toBe("agent-123");
  });
});

describe("category presentation", () => {
  it("gives every supported category one stable emoji and label", () => {
    expect(Object.keys(CATEGORY_PRESENTATION)).toEqual([...CATEGORIES]);
    for (const category of CATEGORIES) {
      expect(CATEGORY_PRESENTATION[category].emoji).not.toBe("");
      expect(CATEGORY_PRESENTATION[category].label).not.toBe("");
    }
  });
});
