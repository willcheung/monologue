export const LOCAL_WORKSPACE_ID = "local";

export function isCloudMode() {
  return process.env.MONOLOGUE_MODE === "cloud";
}

export function requireCloudEnvironment() {
  if (!isCloudMode()) return;

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
