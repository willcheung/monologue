import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || "development",
  },
  outputFileTracingIncludes: {
    "/agent-setup/SKILL.md": ["./skills/monologue/SKILL.md"],
    ...(process.env.MONOLOGUE_DEMO_MODE === "1" && {
      "/*": ["./demo/monologue.db"],
      "/agents": ["./demo/monologue.db"],
      "/agents/[agentId]": ["./demo/monologue.db"],
      "/feed": ["./demo/monologue.db"],
      "/recap": ["./demo/monologue.db"],
    }),
  },
};

const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  silent: !process.env.CI,
  sourcemaps: { disable: !uploadSourceMaps },
  release: {
    name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    create: uploadSourceMaps,
    finalize: uploadSourceMaps,
  },
});
