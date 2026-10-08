import { describe, expect, it, vi } from "vitest";
import { AGENT_STARTERS, getIntegration, INTEGRATIONS, PUBLIC_SITE_URL } from "@/lib/distribution-content";
import { SETUP_PROMPT } from "@/lib/setup-prompt";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
vi.mock("@/lib/setup-context", async () => {
  const { SETUP_PROMPT, MCP_URL, PUBLIC_MONOLOGUE_ORIGIN } = await import("@/lib/setup-prompt");
  return { getSetupContext: async () => ({ prompt: SETUP_PROMPT, mcpUrl: MCP_URL, origin: PUBLIC_MONOLOGUE_ORIGIN }) };
});
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

});
