import type { MetadataRoute } from "next";
import { PUBLIC_SITE_URL } from "@/lib/distribution-content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/feed", "/agents", "/recap", "/settings/", "/connect", "/sign-in", "/keys", "/welcome"] },
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
