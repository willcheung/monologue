import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Inspect the current source tree, including unstaged removals of tracked files.
const tracked = () => execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(file => file && existsSync(file));
const privatePlanningPaths = ["docs/CLAUDE_PLUGIN.md", "docs/OPENAI_PLUGIN_SUBMISSION.md", "docs/DISTRIBUTION_PLAN.md", "docs/DISTRIBUTION_PUBLISHING.md", "docs/CONSUMER_FEATURES.md", "docs/PHASED_MVP_ROADMAP.md"];
const credentialPatterns = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bmlg_live_[A-Za-z0-9_-]{20,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bAIza[A-Za-z0-9_-]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/,
];

describe("Public repository privacy", () => {
  it("does not track private release material, credentials, databases or generated submission archives", () => {
    const forbidden = tracked().filter(file =>
      file.startsWith("private/") || file.startsWith("dist/") || file.startsWith(".vercel/") || privatePlanningPaths.includes(file) ||
      file.startsWith("packaging/") || file.startsWith(".claude-plugin/") || file === ".mcp.json" ||
      /^scripts\/package-.*-plugin\.mjs$/.test(file) || /^tests\/.*plugin.*package.*\.test\.ts$/.test(file) ||
      file === "chatgpt-app-submission.json" ||
      (/(^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example") ||
      /\.(?:db(?:-(?:journal|wal|shm))?|sqlite3?|pem|key|p12)$/.test(file) ||
      (file.endsWith(".zip") && file !== "public/brand/monologue-logo-pack.zip"));
    expect(forbidden, "Private files must be kept local and ignored").toEqual([]);
  });

  it("keeps account-specific IDs, private chat links and obvious secret patterns out of tracked text", () => {
    const findings: string[] = [];
    for (const file of tracked()) {
      if (/\.(?:png|zip|ttf|woff2)$/.test(file)) continue;
      const body = readFileSync(file, "utf8");
      if (credentialPatterns.some(pattern => pattern.test(body)) ||
          /\bapp-[0-9a-f]{32}\b|\bplugin_asdk_app_[0-9a-f]+\b|https:\/\/chatgpt\.com\/c\/[0-9a-f-]{20,}/.test(body)) findings.push(file);
    }
    // Return paths only; never print a potentially sensitive matching value.
    expect(findings, "Inspect findings privately; never add secret values to assertion output").toEqual([]);
  });

  it("ignores local release overrides and excludes them from deployment uploads", () => {
    for (const file of ["private/DISTRIBUTION_PLAN.md", "private/DISTRIBUTION_PUBLISHING.md", "private/CONSUMER_FEATURES.md", "private/PHASED_MVP_ROADMAP.md", "private/openai/review.txt", "dist/openai-plugin/release.zip", "packaging/openai/plugin.json", "packaging/openai/plugin.example.json", ".claude-plugin/plugin.json", ".mcp.json", "scripts/package-claude-plugin.mjs", "tests/plugin-package.test.ts", "docs/CLAUDE_PLUGIN.md", "private/scripts/package-openai-plugin.mjs", ".env.production", "test.db-wal"]) {
      expect(execFileSync("git", ["check-ignore", "--no-index", file], { encoding: "utf8" }).trim()).toBe(file);
    }
    const excludes = readFileSync(".vercelignore", "utf8").split("\n");
    for (const path of ["private/", "dist/", "packaging/", ".claude-plugin/", ".mcp.json", "scripts/package-*-plugin.mjs", "chatgpt-app-submission.json"]) expect(excludes).toContain(path);
  });
});
