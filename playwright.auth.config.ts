import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testIgnore: [],
  outputDir: "test-results-auth",
  testMatch: "**/auth.spec.ts",
  use: { ...base.use, baseURL: "http://localhost:3102" },
  webServer: {
    command: "node scripts/browser-test-server.mjs --auth",
    url: "http://localhost:3102/sign-in",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
