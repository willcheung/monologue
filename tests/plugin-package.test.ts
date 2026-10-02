import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const yaml = createRequire(import.meta.url)("js-yaml") as { load: (text: string) => unknown };

// @ts-expect-error The dependency-free build script is also run directly by Node.
import { buildPackage, validatePackage, packageFiles } from "../scripts/package-openai-plugin.mjs";

async function configs() {
  return {
    manifest: JSON.parse(await readFile("packaging/openai/plugin.json", "utf8")),
    mcp: JSON.parse(await readFile("packaging/openai/mcp.json", "utf8")),
  };
}

describe("OpenAI plugin package", () => {
  it("builds an allowlisted ZIP with the canonical skill and current logo, without secrets or private QA wiring", async () => {
    const output = await mkdtemp(join(tmpdir(), "monologue-package-test-"));
    try {
      const result = await buildPackage(output);
      expect(result.files).toEqual(Object.keys(packageFiles).sort());
      const unpack = (path: string) => execFileSync("unzip", ["-p", result.archive, path]);
      expect(unpack("skills/monologue/SKILL.md")).toEqual(await readFile("skills/monologue/SKILL.md"));
      expect(unpack("assets/monologue-mark-512.png")).toEqual(await readFile("public/brand/monologue-mark-512.png"));
      const manifest = JSON.parse(unpack("plugin.json").toString());
      expect(manifest.name).toBe("app-6ab9600c375481919d9b0e301e480292");
      expect(manifest.extensions["com.openai"].interface.displayName).toBe("Monologue");
      const mcp = JSON.parse(unpack("mcp.json").toString());
      const skillText = unpack("skills/monologue/SKILL.md").toString();
      const skill = yaml.load(skillText.split("---")[1]) as { name: string; description: string; metadata: { version: string } };
      expect(skill.name).toBe("monologue");
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      const metadata = yaml.load(unpack("skills/monologue/agents/openai.yaml").toString()) as { interface: { display_name: string; short_description: string; default_prompt: string } };
      expect(metadata.interface.display_name).toBe("Monologue");
      expect(metadata.interface.short_description.length).toBeGreaterThanOrEqual(25);
      expect(metadata.interface.short_description.length).toBeLessThanOrEqual(64);
      expect(metadata.interface.default_prompt).toContain("$monologue");
      expect(() => validatePackage(manifest, mcp)).not.toThrow();
      expect(JSON.stringify({ manifest, mcp })).not.toMatch(/plugin_asdk_app|Bearer |mlg_live_|test_credentials|reviewer_instructions/);
      expect(result.files.some((p: string) => /(^|\/)(\.env|\.git|\.app\.json|node_modules)|\.db$/.test(p))).toBe(false);
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  it("rejects stale references, private app mappings, credential headers and invalid review inventories", async () => {
    const { manifest, mcp } = await configs();
    const wrongIdentity = structuredClone(manifest);
    wrongIdentity.name = "monologue";
    expect(() => validatePackage(wrongIdentity, mcp)).toThrow(/Invalid package identity/);
    const missingLogo = structuredClone(manifest);
    missingLogo.extensions["com.openai"].interface.logo = "./missing.png";
    expect(() => validatePackage(missingLogo, mcp)).toThrow(/Unbundled reference/);
    const privateApp = structuredClone(manifest);
    privateApp.extensions["com.openai"].apps = "./.app.json";
    expect(() => validatePackage(privateApp, mcp)).toThrow(/Private app references/);
    const credentials = structuredClone(mcp);
    credentials.mcpServers.monologue.headers = { Authorization: "Bearer not-a-real-token" };
    expect(() => validatePackage(manifest, credentials)).toThrow(/without embedded credentials/);
    const wrongCases = structuredClone(manifest);
    wrongCases.extensions["com.openai"].review.test_cases.positive.pop();
    expect(() => validatePackage(wrongCases, mcp)).toThrow(/five positive/);
  });
});
