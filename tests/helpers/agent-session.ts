import { spawn, execFile } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { delimiter, isAbsolute, join } from "node:path";
import { promisify } from "node:util";

export type SessionClient = "claude-code" | "codex";
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value !== null && typeof value === "object" ? value as ObjectValue : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

// Observe harness/tool events. A final answer claiming the skill loaded is never
// evidence. Do not retain raw tool arguments, model credentials or transcripts.
export function observeSession(client: SessionClient, stdout: string) {
  const observation = { sessionId: "", model: "", completed: false, skillLoaded: false, skillDiscovered: false, toolFailures: [] as string[], tools: [] as string[], errors: [] as string[] };
  const skillCalls = new Set<string>();
  for (const line of stdout.split("\n")) {
    let event: ObjectValue;
    try { event = object(JSON.parse(line)); } catch { continue; }
    if (client === "codex") {
      if (event.type === "thread.started" && typeof event.thread_id === "string") observation.sessionId = event.thread_id;
      if (event.type === "turn.completed") observation.completed = true;
      if (event.type === "turn.failed" || event.type === "error") observation.errors.push(String(event.type));
      const item = object(event.item);
      if (event.type === "item.completed" && item.type === "command_execution" && item.exit_code === 0) {
        const command = String(item.command ?? ""), output = String(item.aggregated_output ?? "");
        if (command.includes("monologue/SKILL.md") && output.includes("Mandatory completion check") && output.includes("# Monologue")) observation.skillLoaded = true;
      }
      if (event.type === "item.completed" && item.type === "mcp_tool_call") {
        observation.tools.push(`${item.server}.${item.tool}`);
        const result = object(item.result);
        if (item.error || result.isError === true) {
          const detail = JSON.stringify(item.error || result.content).replace(/[A-Za-z0-9_./=-]{40,}/g, "[redacted]").slice(0, 600);
          observation.toolFailures.push(`${item.server}.${item.tool}: ${detail}`);
        }
      }
    } else {
      if (event.type === "system" && event.subtype === "init") {
        observation.sessionId = String(event.session_id ?? "");
        observation.model = String(event.model ?? "");
        observation.skillDiscovered = array(event.skills).some(skill => skill === "monologue" || object(skill).name === "monologue");
      }
      const blocks = array(object(event.message).content).map(object);
      if (event.type === "assistant") for (const block of blocks) {
        if (block.type !== "tool_use") continue;
        const input = object(block.input);
        observation.tools.push(String(block.name));
        if ((block.name === "Skill" && input.skill === "monologue") || (block.name === "Read" && String(input.file_path).endsWith("monologue/SKILL.md"))) skillCalls.add(String(block.id));
      }
      if (event.type === "user") for (const block of blocks) {
        if (block.type === "tool_result" && block.is_error === true) observation.toolFailures.push("Claude tool result failed");
        if (block.type === "tool_result" && block.is_error !== true && skillCalls.has(String(block.tool_use_id))) {
          const content = JSON.stringify(block.content);
          if (content.includes("Mandatory completion check") || content.includes("Launching skill: monologue")) observation.skillLoaded = true;
        }
      }
      if (event.type === "result") {
        observation.completed = event.is_error === false && event.subtype === "success";
        if (!observation.completed) observation.errors.push(String(event.subtype));
      }
    }
  }
  observation.tools = [...new Set(observation.tools)];
  return observation;
}

export async function prepareSessionProfile(client: SessionClient, directory: string, origin: string, mcpToken: string) {
  const home = join(directory, "home"), profile = join(directory, "profile"), project = join(directory, "project");
  for (const path of [home, profile, project]) await mkdir(path, { recursive: true, mode: 0o700 });
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test", PATH: process.env.PATH?.split(delimiter).filter(path => !path.endsWith("/node_modules/.bin")).join(delimiter),
    HOME: home, USERPROFILE: home, CODEX_HOME: profile, CLAUDE_CONFIG_DIR: profile,
    XDG_CONFIG_HOME: join(directory, "config"), XDG_CACHE_HOME: join(directory, "cache"),
    TMPDIR: directory, TMP: directory, TEMP: directory, NO_COLOR: "1", CI: "1",
    MONOLOGUE_URL: origin, MONOLOGUE_TEST_MCP_TOKEN: mcpToken,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  };
  const skillDirectory = client === "codex" ? join(home, ".agents/skills/monologue") : join(profile, "skills/monologue");
  await cp("skills/monologue", skillDirectory, { recursive: true });
  const override = process.env[client === "codex" ? "MONOLOGUE_CODEX_BIN" : "MONOLOGUE_CLAUDE_BIN"];
  if (override && !isAbsolute(override)) throw new Error("Client binary overrides must be absolute paths");
  const binary = override || (client === "codex" ? "codex" : "claude");
  const model = process.env[client === "codex" ? "MONOLOGUE_EVAL_CODEX_MODEL" : "MONOLOGUE_EVAL_CLAUDE_MODEL"];
  let args: string[];
  if (client === "codex") {
    if (process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) env.CODEX_API_KEY = process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY;
    else {
      const authFile = process.env.MONOLOGUE_CODEX_AUTH_FILE;
      if (!authFile || !isAbsolute(authFile)) throw new Error("BLOCKED: provide CODEX_API_KEY or an explicit MONOLOGUE_CODEX_AUTH_FILE for the isolated profile");
      // Copy only the explicitly selected auth cache, never the user's settings,
      // MCP connections, skills or history. The entire temporary profile is removed.
      await writeFile(join(profile, "auth.json"), await readFile(authFile), { mode: 0o600 });
    }
    await writeFile(join(profile, "config.toml"), [
      'cli_auth_credentials_store = "file"', 'approval_policy = "never"', 'sandbox_mode = "read-only"', 'web_search = "disabled"',
      '[mcp_servers.monologue]', `url = ${JSON.stringify(`${origin}/mcp`)}`, 'bearer_token_env_var = "MONOLOGUE_TEST_MCP_TOKEN"',
      '[mcp_servers.fixture]', `url = ${JSON.stringify(`${origin}/fixture/mcp`)}`, 'enabled_tools = ["create_task"]',
      // The opted-in test authorizes this one disposable mutation. Keep the
      // filesystem sandbox and all unrelated approval requirements intact.
      '[mcp_servers.fixture.tools.create_task]', 'approval_mode = "approve"',
    ].join("\n"), { mode: 0o600 });
    args = ["exec", "--json", "--skip-git-repo-check", "--ephemeral", "--sandbox", "read-only", "-C", project, ...(model ? ["--model", model] : []), "-"];
  } else {
    if (process.env.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    else if (process.env.CLAUDE_CODE_OAUTH_TOKEN) env.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    else throw new Error("BLOCKED: provide ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN for the isolated profile");
    const configPath = join(profile, "mcp.json");
    await writeFile(configPath, JSON.stringify({ mcpServers: {
      monologue: { type: "http", url: `${origin}/mcp`, headers: { Authorization: "Bearer ${MONOLOGUE_TEST_MCP_TOKEN}" } },
      fixture: { type: "http", url: `${origin}/fixture/mcp` },
    } }), { mode: 0o600 });
    await writeFile(join(profile, "settings.json"), JSON.stringify({ claudeAiSkillsSyncEnabled: false }), { mode: 0o600 });
    args = ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--strict-mcp-config", "--mcp-config", configPath,
      "--tools", "Read,Skill", "--allowedTools", "Read,Skill,mcp__fixture__create_task,mcp__monologue__report_action,mcp__monologue__read_timeline",
      "--permission-mode", "dontAsk", "--max-budget-usd", "1", ...(model ? ["--model", model] : [])];
  }
  const version = (await promisify(execFile)(binary, ["--version"], { cwd: project, env, timeout: 10_000 })).stdout.trim();
  return { binary, args, env, project, version, skillDirectory };
}

export async function runSession(client: SessionClient, profile: Awaited<ReturnType<typeof prepareSessionProfile>>, prompt: string) {
  const started = Date.now();
  return new Promise<ReturnType<typeof observeSession> & { elapsedMs: number }>((resolve, reject) => {
    const child = spawn(profile.binary, profile.args, { cwd: profile.project, env: profile.env, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
    let stdout = "", stderr = "", failure = "";
    const stop = () => {
      try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* Already exited. */ }
    };
    process.once("exit", stop);
    const timer = setTimeout(() => { failure = "session exceeded 120 seconds"; stop(); }, 120_000);
    child.stdout.on("data", data => {
      stdout += data;
      if (stdout.length > 2_000_000) { failure = "session trace exceeded 2 MB"; stop(); }
    });
    child.stderr.on("data", data => { if (stderr.length < 64_000) stderr += data; });
    child.on("error", () => { clearTimeout(timer); process.removeListener("exit", stop); reject(new Error(`${client}: could not start the installed client`)); });
    child.on("close", code => {
      clearTimeout(timer);
      process.removeListener("exit", stop);
      const result = observeSession(client, stdout);
      if (failure || code !== 0 || !result.completed) {
        const blocked = /not logged in|login required|authentication|unauthorized|invalid.*token|401|rate.?limit|quota|usage limit/i.test(stdout + stderr);
        // Deliberately don't include raw stdout/stderr: CLI diagnostics can carry
        // credentials. The event summary contains only known observation fields.
        reject(new Error(`${blocked ? "BLOCKED" : "FAILED"}: ${client}: ${failure || `exit ${code}, completed=${result.completed}`}; observations=${JSON.stringify(result)}`));
      } else resolve({ ...result, elapsedMs: Date.now() - started });
    });
    child.stdin.on("error", () => { /* Process may reject flags before stdin. */ });
    child.stdin.end(prompt);
  });
}
