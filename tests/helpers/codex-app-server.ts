import { spawn } from "node:child_process";

// Documented stdio protocol, in a caller-owned disposable profile. Never attaches
// to the user's running app. No model turns are required for these MCP checks.
export function codexAppServer(binary: string, cwd: string, env: NodeJS.ProcessEnv) {
  const child = spawn(binary, ["app-server", "--stdio"], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
  let sequence = 0, buffer = "";
  const waiting = new Map<number | string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  function wait<T>(key: number | string, timeout = 45_000) {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { waiting.delete(key); reject(new Error(`App-server ${key} timed out`)); }, timeout);
      waiting.set(key, { resolve: value => { clearTimeout(timer); resolve(value as T); }, reject: error => { clearTimeout(timer); reject(error); } });
    });
  }
  const fail = () => { for (const item of waiting.values()) item.reject(new Error("App-server process ended")); waiting.clear(); };
  child.on("error", fail); child.on("exit", fail); child.stderr.resume();
  child.stdout.on("data", chunk => {
    buffer += chunk;
    if (buffer.length > 3_000_000) { child.kill(); return; }
    const lines = buffer.split("\n"); buffer = lines.pop()!;
    for (const line of lines) {
      let message; try { message = JSON.parse(line); } catch { continue; }
      const key = message.id ?? message.method, receiver = waiting.get(key);
      if (!receiver) continue;
      waiting.delete(key);
      if (message.error) receiver.reject(new Error(`App-server request ${key} failed`));
      else receiver.resolve(message.id ? message.result : message.params);
    }
  });
  function request<T>(method: string, params: object) {
    const id = ++sequence, result = wait<T>(id);
    child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    return result;
  }
  return {
    request,
    notification: <T>(method: string) => wait<T>(method),
    async initialize() {
      await request("initialize", { clientInfo: { name: "monologue_onboarding_test", version: "1.0.0" }, capabilities: { experimentalApi: true } });
      child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");
    },
    async close() {
      child.stdin.end();
      let timer: ReturnType<typeof setTimeout>;
      await Promise.race([new Promise(resolve => child.once("exit", resolve)), new Promise(resolve => { timer = setTimeout(resolve, 1000); })]);
      clearTimeout(timer!);
      if (child.exitCode === null) child.kill("SIGTERM");
      fail();
    },
  };
}
