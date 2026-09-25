export function safeInternalPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function newUserLandingPath(callbackURL: string) {
  const [path, query] = callbackURL.split("?", 2);
  if (path === "/connect" && query) {
    const params = new URLSearchParams(query);
    if (params.get("request") && params.get("code")) return callbackURL;
  }
  return "/settings/keys";
}
