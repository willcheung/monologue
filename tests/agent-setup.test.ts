import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET as getHtml } from "@/app/agent-setup/route";
import { GET as getMarkdown } from "@/app/agent-setup/SKILL.md/route";

describe("hosted agent setup", () => {
  it("serves the canonical portable skill as markdown", async () => {
    const canonical = await readFile(path.join(process.cwd(), "skills", "monologue", "SKILL.md"), "utf8");
    const response = await getMarkdown();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown");
    expect(await response.text()).toBe(canonical);
    expect(canonical).toContain("https://www.monologue.events/api/actions");
    expect(canonical).toContain("/api/connect/request");
    expect(canonical).toContain("/api/connect/poll");
    expect(canonical).toContain("Show the user only the returned `verificationUrl`");
    expect(canonical).toContain("skillVersion\":\"1.2.8");
    expect(canonical).toContain("https://www.monologue.events/keys");
    expect(canonical).toContain("Do not collapse changes in different systems into one event");
    expect(canonical).toContain("Do not report the request that sends an event to Monologue");
    expect(canonical).toContain("include a direct link to the changed object in `url`");
    expect(canonical).toContain("`changedField`, `before`, and `after`");
    expect(canonical).toContain("before composing the final response to the user");
    expect(canonical).toContain("awaiting marketplace review, payment settlement");
    expect(canonical).toContain("cannot read the shared feed");
    expect(canonical).not.toContain("required_environment_variables");
  });

  it("serves the complete skill in an HTML page for web readers", async () => {
    const response = await getHtml();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(html).toContain("<title>Monologue agent setup</title>");
    expect(html).toContain('href="/agent-setup/SKILL.md"');
    expect(html).toContain("Mandatory completion check");
    expect(html).toContain("&lt;this agent&#39;s name&gt;");
    expect(html).not.toContain("<this agent's name>");
  });
});
