export function safeInternalPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

export function newUserLandingPath(callbackURL: string) {
  const [path, query] = callbackURL.split("?", 2);
  if (path === "/oauth/authorize" && query) return callbackURL;
  if (path === "/join" && query) {
    const token = new URLSearchParams(query).get("token");
    if (token && token.length <= 128) return callbackURL;
  }
  if (path === "/connect" && query) {
    const params = new URLSearchParams(query);
    if (params.get("request") && params.get("code")) return callbackURL;
  }
  return "/settings/keys";
}

// Welcome copy is resolved from a token, never from an inviter name in a URL.
export function invitationTokenFromNext(value: string) {
  const path = safeInternalPath(value, "");
  if (!path) return null;
  const url = new URL(path, "https://monologue.invalid");
  if (url.origin !== "https://monologue.invalid" || url.pathname !== "/join") return null;
  const token = url.searchParams.get("token");
  return token && /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : null;
}
