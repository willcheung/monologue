export const LOCAL_WORKSPACE_ID = "local";

export function isCloudMode() {
  return process.env.MONOLOGUE_MODE === "cloud";
}

export function requireCloudEnvironment() {
  if (!isCloudMode()) return;

  if (isWorkspaceDev()) return;

  const required = [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Cloud mode is missing: ${missing.join(", ")}`);
}

export function isWorkspaceDev() {
  if (process.env.MONOLOGUE_WORKSPACE_DEV !== "1" || process.env.NODE_ENV !== "development" || process.env.VERCEL) return false;
  try {
    const origin = new URL(process.env.BETTER_AUTH_URL ?? "");
    return ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) && origin.protocol === "http:" &&
      process.env.DATABASE_URL?.startsWith("file:") === true && !process.env.TURSO_DATABASE_URL && !process.env.TURSO_AUTH_TOKEN;
  } catch { return false; }
}
