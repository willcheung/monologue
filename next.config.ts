import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/agent-setup/SKILL.md": ["./skills/monologue/SKILL.md"],
  },
};

export default nextConfig;
