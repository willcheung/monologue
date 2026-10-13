import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { agentSetup } from "@/lib/agent-onboarding";
import { loopbackServer } from "./helpers/loopback-server";

const execute = promisify(execFile);
const supported = ["claude-code", "codex"] as const;
const enabled = process.env.MONOLOGUE_NATIVE_TESTS === "1";
const selected = (process.env.MONOLOGUE_TEST_CLIENTS ?? supported.join(",")).split(",");
if (enabled && selected.some(id => !supported.includes(id as typeof supported[number]))) throw new Error("Choose claude-code or codex for MONOLOGUE_TEST_CLIENTS");

// Only tokenize the small, generated reference command. Never execute a pasted
// prompt or pass it to a shell. Reject syntax outside these known CLI references.
function argumentsFrom(command: string, binary: string) {
  if (!/^[a-zA-Z0-9_:/.,=' -]+$/.test(command)) throw new Error("Unexpected setup command syntax");
  const words = command.match(/'[^']*'|\S+/g)!.map(word => word.replace(/^'|'$/g, ""));
  if (words.shift() !== binary || words[0] !== "mcp") throw new Error("Unexpected setup executable");
  return words;
}

describe.skipIf(!enabled)("installed client setup compatibility (no model calls or OAuth)", () => {
  for (const id of supported) {
    it.skipIf(!selected.includes(id))(`${id}: accepts the website command and preserves configuration across processes`, async () => {
      const directory = await mkdtemp(join(tmpdir(), `monologue-${id}-`));
      // A closed endpoint deliberately prevents automatic OAuth during `add`.
      // Authentication is tested separately by onboarding-protocol.test.ts.
      const server = await loopbackServer(() => new Response(null, { status: 404 }));
      try {
        const locations = { profile: join(directory, "profile"), project: join(directory, "project"), home: join(directory, "home"), config: join(directory, "config"), cache: join(directory, "cache") };
        await Promise.all(Object.values(locations).map(path => mkdir(path, { recursive: true })));
        // Allowlist child environment. Parent settings, auth files and credentials
        // are neither copied nor read. These variables apply only to the child.
        const env: NodeJS.ProcessEnv = {
          NODE_ENV: "test",
          // npm prepends ancestor node_modules/.bin directories, which can shadow
          // the client a user actually runs in their terminal.
          PATH: process.env.PATH?.split(delimiter).filter(path => !path.endsWith("/node_modules/.bin")).join(delimiter), TMPDIR: directory, TEMP: directory, TMP: directory,
          HOME: locations.home, USERPROFILE: locations.home,
          XDG_CONFIG_HOME: locations.config, XDG_CACHE_HOME: locations.cache,
          CODEX_HOME: locations.profile, CLAUDE_CONFIG_DIR: locations.profile,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1", NO_COLOR: "1", CI: "1",
        };
        const binary = id === "claude-code" ? "claude" : "codex";
        const override = process.env[id === "claude-code" ? "MONOLOGUE_CLAUDE_BIN" : "MONOLOGUE_CODEX_BIN"];
        if (override && !isAbsolute(override)) throw new Error("Client binary overrides must be absolute paths");
        const executable = override || binary;
        async function run(args: string[]) {
          try {
            return (await execute(executable, args, { cwd: locations.project, env, timeout: 20_000, killSignal: "SIGKILL", maxBuffer: 512 * 1024 })).stdout;
          } catch (error) {
            // Fail an explicitly requested lane when missing/unusable; never call
            // a missing executable "passed", and don't dump CLI config or logs.
            const code = (error as NodeJS.ErrnoException).code;
            throw new Error(`${id} compatibility check failed (${code ?? "timeout/process failure"}); install a supported CLI and rerun this lane.`);
          }
        }
        const version = (await run(["--version"])).trim();
        expect(version).toMatch(/\d+\.\d+/);
        process.stdout.write(`[onboarding compatibility] ${id}: ${version}\n`);
        const { commands } = agentSetup(id, { instanceUrl: server.origin, mcpUrl: `${server.origin}/mcp` });
        const add = argumentsFrom(commands[0], binary);
        const sentinel = add.map(word => word === "monologue" ? "unrelated-fixture" : word);
        await run(sentinel);
        await run(add); // The exact add command shown to the user, no test flags.
        const get = (name: string) => run(["mcp", "get", name, ...(id === "codex" ? ["--json"] : [])]);
        for (const name of ["monologue", "unrelated-fixture"]) {
          const config = await get(name); // Separate process reads persisted state.
          if (id === "codex") {
            expect(JSON.parse(config)).toMatchObject({ name, transport: { type: "streamable_http", url: `${server.origin}/mcp` } });
          } else {
            expect(config).toContain(`${server.origin}/mcp`);
            expect(config).toContain("User config");
          }
        }
        const help = await run([...argumentsFrom(commands[1], binary), "--help"]);
        expect(help).toMatch(/authenticate/i);
        if (id === "codex") expect(help).toContain("--scopes");
        expect(server.failures).toEqual([]);
        expect(server.requests.some(path => path.includes("/oauth/"))).toBe(false);
      } finally {
        await server.close();
        await rm(directory, { recursive: true, force: true });
      }
    }, 90_000);
  }
});
