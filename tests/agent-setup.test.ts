import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/agent-setup/SKILL.md/route";

describe("hosted agent setup", () => {
  it("serves the canonical portable skill as markdown", async () => {
    const canonical = await readFile(path.join(process.cwd(), "skills", "monologue", "SKILL.md"), "utf8");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(await response.text()).toBe(canonical);
    expect(canonical).toContain("https://www.monologue.events/api/actions");
  });
});
