import { copyFile, mkdir, mkdtemp, readFile, rename, rm, lstat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Explicit inputs: never archive a repository, secret store, or customer data.
export const packageFiles = {
  "plugin.json": "packaging/openai/plugin.json",
  "mcp.json": "packaging/openai/mcp.json",
  "LICENSE": "LICENSE",
  "skills/monologue/SKILL.md": "skills/monologue/SKILL.md",
  "skills/monologue/agents/openai.yaml": "skills/monologue/agents/openai.yaml",
  "skills/monologue/scripts/report-action.py": "skills/monologue/scripts/report-action.py",
  "assets/monologue-mark-256.png": "public/brand/monologue-mark-256.png",
  "assets/monologue-mark-512.png": "public/brand/monologue-mark-512.png",
};

export function validatePackage(manifest, mcp) {
  const openai = manifest.extensions?.["com.openai"];
  // Existing OpenAI listing identity, distinct from the display and skill names.
  if (manifest.name !== "app-6ab9600c375481919d9b0e301e480292" || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Invalid package identity/version");
  if (manifest.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") throw new Error("Wrong manifest schema");
  if (mcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") throw new Error("Wrong MCP schema");
  if (Object.keys(mcp.mcpServers).join() !== "monologue" || mcp.mcpServers.monologue.type !== "streamable-http" || mcp.mcpServers.monologue.url !== "https://www.monologue.events/mcp" || mcp.mcpServers.monologue.headers) throw new Error("Use only the public OAuth MCP endpoint, without embedded credentials");
  if (openai?.apps || openai?.hooks || manifest.apps || manifest.hooks) throw new Error("Private app references and lifecycle hooks cannot be submitted");
  const ui = openai?.interface;
  for (const [field, max] of Object.entries({ displayName: 30, shortDescription: 30, longDescription: 4000, developerName: 80 })) {
    if (typeof ui?.[field] !== "string" || !ui[field].trim() || ui[field].length > max) throw new Error(`Invalid ${field}`);
  }
  for (const field of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    const url = new URL(ui[field]);
    if (url.protocol !== "https:" || url.username || url.password || ui[field].length > 1024) throw new Error(`Invalid ${field}`);
  }
  if (!Array.isArray(ui.defaultPrompt) || ui.defaultPrompt.length > 3 || ui.defaultPrompt.some(p => typeof p !== "string" || !p.trim() || p.length > 128)) throw new Error("Invalid starter prompts");
  for (const path of [openai.onboardingSkill, ui.logo, ui.logoDark, ui.composerIcon, ui.composerIconDark]) {
    if (typeof path !== "string" || !path.startsWith("./") || !Object.hasOwn(packageFiles, path.slice(2))) throw new Error(`Unbundled reference: ${path}`);
  }
  const cases = openai.review?.test_cases;
  if (cases?.positive?.length !== 5 || cases?.negative?.length !== 3) throw new Error("Review requires five positive and three negative cases");
  for (const c of [...cases.positive, ...cases.negative]) {
    if (!c.description || !c.prompt || !c.expected_behavior) throw new Error("Incomplete review case");
  }
  for (const c of cases.positive) {
    if (!c.tools_triggered?.split(/,\s*/).every(t => ["report_action", "read_timeline"].includes(t))) throw new Error("Unknown review tool");
  }
  if (openai.review.test_credentials || openai.review.reviewer_instructions) throw new Error("Enter reviewer access only in the secure dashboard");
}

export async function buildPackage(outputDir = join(repoRoot, "dist/openai-plugin")) {
  const manifest = JSON.parse(await readFile(join(repoRoot, packageFiles["plugin.json"]), "utf8"));
  const mcp = JSON.parse(await readFile(join(repoRoot, packageFiles["mcp.json"]), "utf8"));
  validatePackage(manifest, mcp);
  await mkdir(outputDir, { recursive: true });
  const staging = await mkdtemp(join(outputDir, ".build-"));
  const bundle = join(staging, "bundle");
  try {
    for (const [target, source] of Object.entries(packageFiles)) {
      const input = join(repoRoot, source);
      if (!(await lstat(input)).isFile()) throw new Error(`Package input must be a regular file: ${source}`);
      await mkdir(dirname(join(bundle, target)), { recursive: true });
      await copyFile(input, join(bundle, target));
    }
    // The ZIP has plugin.json at its root, not a repo or enclosing directory.
    const temporaryArchive = join(staging, "plugin.zip");
    execFileSync("zip", ["-X", "-q", temporaryArchive, ...Object.keys(packageFiles)], { cwd: bundle });
    const archive = join(outputDir, `monologue-${manifest.version}.zip`);
    await rename(temporaryArchive, archive);
    const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n").sort();
    if (JSON.stringify(entries) !== JSON.stringify(Object.keys(packageFiles).sort())) throw new Error("Archive did not match allowlist");
    return { archive, version: manifest.version, files: entries };
  } finally {
    // Delete only this run's freshly created temporary build directory.
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildPackage();
  console.log(JSON.stringify(result, null, 2));
  console.log("Package built. Reviewer account, demo recording, legal review and installed-plugin evaluation remain manual. Nothing was submitted.");
}
