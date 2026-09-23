import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/agent-setup/SKILL.md": ["./skills/monologue/SKILL.md"],
    ...(process.env.MONOLOGUE_DEMO_MODE === "1" && { "/*": ["./demo/monologue.db"] }),
  },
};

export default nextConfig;
