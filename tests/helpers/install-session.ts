import { spawn, execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { observeSession, prepareSessionProfile, type SessionClient } from "./agent-session";

export async function prepareInstallProfile(client: SessionClient, directory: string, origin: string, fixtureOrigin: string) {
  // Reuse the environment/auth isolation from the session lane, then remove all
  // Monologue bootstrap state before the first model invocation.
  const p = await prepareSessionProfile(client, directory, origin, "");
  await rm(p.skillDirectory, { recursive: true, force: true });
  delete p.env.MONOLOGUE_TEST_MCP_TOKEN;
  p.env.npm_config_cache = join(directory, "npm-cache");
  p.env.DISABLE_TELEMETRY = "1";
  await mkdir(p.env.npm_config_cache, { recursive: true });
  const profile = p.env.CODEX_HOME!;
  if (client === "codex") {
    await writeFile(join(profile, "config.toml"), [
      'cli_auth_credentials_store = "file"', 'mcp_oauth_credentials_store = "file"',
      'approval_policy = "never"', 'sandbox_mode = "workspace-write"', 'web_search = "disabled"',
      '[sandbox_workspace_write]', 'network_access = true', `writable_roots = [${JSON.stringify(directory)}]`,
      '[mcp_servers.fixture]', `url = ${JSON.stringify(`${fixtureOrigin}/fixture/mcp`)}`,
      '[mcp_servers.fixture.tools.create_task]', 'approval_mode = "approve"',
    ].join("\n"), { mode: 0o600 });
    p.args = ["exec", "--json", "--skip-git-repo-check", "--ephemeral", "--sandbox", "workspace-write", "--add-dir", directory, "-C", p.project, "-"];
  } else {
    if (process.platform === "darwin") {
      // macOS locates the login Keychain using HOME. Keep the client filesystem
      // isolated, but let the real security utility locate that Keychain. This
      // wrapper permits only this disposable Claude profile's hashed service.
      const service = `Claude Code-credentials-${createHash("sha256").update(profile.normalize("NFC")).digest("hex").slice(0, 8)}`;
      const bin = join(directory, "bin");
      await mkdir(bin, { recursive: true });
      await writeFile(join(bin, "security"), `#!/usr/bin/python3
import os, subprocess, sys
service = ${JSON.stringify(service)}
args = sys.argv[1:]
data = sys.stdin.buffer.read() if args == ["-i"] else None
request = data.decode() if data is not None else " ".join(args)
if service not in request:
    sys.exit(44)
env = dict(os.environ, HOME=${JSON.stringify(process.env.HOME)})
result = subprocess.run(["/usr/bin/security", *args], input=data, env=env)
sys.exit(result.returncode)
`, { mode: 0o700 });
      p.env.PATH = `${bin}:${p.env.PATH}`;
    }
    // Native MCP commands must save/load their own user configuration. Supplying
    // --strict-mcp-config would hide the connection installed by the agent.
    await rm(join(profile, "mcp.json"), { force: true });
    await promisify(execFile)(p.binary, ["mcp", "add", "--transport", "http", "--scope", "user", "fixture", `${fixtureOrigin}/fixture/mcp`], { env: p.env, cwd: p.project, timeout: 20_000 });
    p.args = ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--no-chrome",
      "--tools", "Read,Skill,Bash,Glob,Grep,Write,Edit",
      "--allowedTools", "Read,Skill,Glob,Grep,Write,Edit,Bash(curl *),Bash(npx *),Bash(claude mcp *),Bash(ls *),Bash(cat *),Bash(mkdir *),Bash(test *),Bash(find *),Bash(pwd),Bash(which *),Bash(command *),mcp__fixture__create_task,mcp__monologue__report_action,mcp__monologue__read_timeline",
      "--add-dir", directory, "--permission-mode", "acceptEdits", "--max-budget-usd", "3"];
  }
  return p;
}

// The native model transcript remains in memory. Emit just step labels and final
// guidance; reject credential-looking final guidance instead of persisting it.
export function runInstallSession(client: SessionClient, profile: Awaited<ReturnType<typeof prepareInstallProfile>>, prompt: string) {
  const started = Date.now();
  return new Promise<ReturnType<typeof observeSession> & { elapsedMs: number; guidance: string }>((resolve, reject) => {
    const child = spawn(profile.binary, profile.args, { cwd: profile.project, env: profile.env, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
    let output = "", pending = "";
    const stop = () => { try { if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch {} };
    process.once("exit", stop);
    const timer = setTimeout(stop, 240_000);
    child.stdout.on("data", chunk => {
      output += chunk; pending += chunk;
      if (output.length > 3_000_000) stop();
      const lines = pending.split("\n"); pending = lines.pop()!;
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.type === "assistant") for (const item of event.message?.content ?? []) if (item.type === "tool_use") process.stdout.write(`[install] ${client}: ${item.name}\n`);
          if (event.type === "item.started") process.stdout.write(`[install] ${client}: ${event.item?.type}\n`);
        } catch { /* Partial or non-JSON CLI output. */ }
      }
    });
    child.stderr.resume();
    child.on("error", () => { clearTimeout(timer); process.removeListener("exit", stop); reject(new Error(`${client}: failed to start`)); });
    child.on("close", code => {
      clearTimeout(timer); stop(); process.removeListener("exit", stop);
      const observation = observeSession(client, output);
      let guidance = "", failureDetail = "";
      for (const line of output.split("\n")) try {
        const e = JSON.parse(line);
        if (e.type === "error" || e.type === "turn.failed") failureDetail = String(e.message ?? e.error?.message ?? "").replace(/https?:\/\/\S+|[A-Za-z0-9_./=-]{40,}/g, "[redacted]").slice(0, 500);
        if (client === "codex" && e.type === "item.completed" && e.item?.type === "agent_message") guidance = e.item.text ?? "";
        if (client === "claude-code" && e.type === "result") guidance = e.result ?? "";
      } catch {}
      if (/sk-ant-|sk-proj-|access_token["']?\s*[:=]|refresh_token["']?\s*[:=]|Bearer\s+[A-Za-z0-9_-]{20}/i.test(guidance)) guidance = "[Guidance withheld: possible credential]";
      // URLs carrying authorization state are useful only during the live run;
      // never include them in retained evidence.
      process.stdout.write(`[install guidance] ${client}: ${guidance}\n`);
      if (code !== 0 || !observation.completed) reject(new Error(`${client}: session failed (exit ${code}); ${failureDetail}; ${JSON.stringify(observation)}`));
      else resolve({ ...observation, elapsedMs: Date.now() - started, guidance: guidance.replace(/https?:\/\/\S+\?\S+/g, "[temporary URL omitted]") });
    });
    child.stdin.on("error", () => {}); child.stdin.end(prompt);
  });
}

export async function installedSkillFiles(directory: string): Promise<string[]> {
  const { readdir, realpath } = await import("node:fs/promises");
  const found = new Set<string>();
  async function walk(path: string, depth: number) {
    if (depth > 7) return;
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      if (["npm-cache", "node_modules", ".git", "cache", "logs"].includes(entry.name)) continue;
      const full = join(path, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      if (entry.name === "monologue" && entry.isSymbolicLink()) {
        const target = await realpath(full);
        if (!target.startsWith(directory + "/")) throw new Error("Skill symlink escaped temporary profile");
        await walk(target, depth + 1);
      }
      if (entry.name === "SKILL.md" && (await readFile(full, "utf8")).includes("# Monologue")) found.add(await realpath(full));
    }
  }
  await walk(directory, 0);
  return [...found];
}
