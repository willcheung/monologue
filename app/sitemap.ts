import type { MetadataRoute } from "next";
import { INTEGRATIONS, PUBLIC_SITE_URL } from "@/lib/distribution-content";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/integrations", "/templates", "/developers", "/agent-setup", "/privacy", "/terms", ...INTEGRATIONS.map(({ slug }) => `/integrations/${slug}`)]
    .map((path) => ({ url: `${PUBLIC_SITE_URL}${path}` }));
}
