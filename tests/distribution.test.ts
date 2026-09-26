import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_STARTERS, getIntegration, INTEGRATIONS, PUBLIC_SITE_URL } from "@/lib/distribution-content";
import { SETUP_PROMPT } from "@/lib/setup-prompt";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { generateMetadata, generateStaticParams } from "@/app/(marketing)/integrations/[slug]/page";

describe("distribution pages", () => {
  it("generates one canonical setup page for each known agent", async () => {
    expect(new Set(INTEGRATIONS.map(({ slug }) => slug)).size).toBe(INTEGRATIONS.length);
    expect(generateStaticParams()).toEqual(INTEGRATIONS.map(({ slug }) => ({ slug })));
    expect(getIntegration("not-a-real-platform")).toBeUndefined();
    for (const integration of INTEGRATIONS) {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: integration.slug }) });
      expect(metadata.alternates?.canonical).toBe(`/integrations/${integration.slug}`);
      expect(metadata.description).toBe(integration.description);
    }
  });

  it("indexes only public pages, not private feed or account URLs", () => {
    const urls = sitemap().map(({ url }) => url);
    expect(urls).toContain(`${PUBLIC_SITE_URL}/templates`);
    for (const { slug } of INTEGRATIONS) expect(urls).toContain(`${PUBLIC_SITE_URL}/integrations/${slug}`);
    for (const route of ["/agents", "/recap", "/feed", "/connect", "/settings/keys", "/keys"]) expect(urls).not.toContain(`${PUBLIC_SITE_URL}${route}`);
    expect(robots().sitemap).toBe(`${PUBLIC_SITE_URL}/sitemap.xml`);
  });

  it("keeps starter prompts tied to the canonical setup and approval boundary", () => {
    for (const starter of AGENT_STARTERS) {
      expect(starter.prompt).toContain(SETUP_PROMPT);
      expect(starter.prompt).toContain("Keep your existing permissions and approval rules");
      expect(starter.prompt).toContain("Never invent an action");
      expect(starter.prompt).not.toMatch(/mlg_live_|Bearer\s+\S+/);
    }
  });

  it("resolves the Claude package to the one canonical portable skill", async () => {
    const marketplace = JSON.parse(await readFile(path.join(process.cwd(), ".claude-plugin/marketplace.json"), "utf8"));
    expect(marketplace.name).toBe("monologue");
    expect(marketplace.plugins).toHaveLength(1);
    const plugin = marketplace.plugins[0];
    expect(plugin.name).toBe("monologue");
    const root = path.resolve(process.cwd(), plugin.source);
    const skillPath = path.join(root, plugin.skills[0], "SKILL.md");
    expect(skillPath).toBe(path.join(process.cwd(), "skills/monologue/SKILL.md"));
    expect(await readFile(skillPath, "utf8")).toContain("Mandatory completion check");
  });
});
