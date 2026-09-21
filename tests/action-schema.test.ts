import { describe, expect, it } from "vitest";
import { actionInputSchema } from "@/lib/action-schema";
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
});

describe("filters", () => {
  it("builds exact filters and a five-field text search", () => {
    const where = buildActionWhere({ agent:"Codex", category:"code", search:"GitHub" });
    expect(where.agentName).toBe("Codex");
    expect(where.category).toBe("code");
    expect(where.OR).toHaveLength(5);
  });

  it("ignores invalid enum filters", () => {
    const where = buildActionWhere({ category:"research", status:"unknown" });
    expect(where.category).toBeUndefined();
    expect(where.status).toBeUndefined();
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
