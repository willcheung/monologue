// Native public clients choose an ephemeral HTTP loopback port (RFC 8252/9700).
// Remove only that literal port; preserve the registered host, path and query bytes.
function withoutLoopbackPort(value: string) {
  const match = /^(http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]))(?::([0-9]{1,5}))?(\/[^#]*)$/.exec(value);
  if (!match || (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 65535))) return null;
  return match[1] + match[3];
}

export function registeredRedirectMatches(requested: string, registered: string, publicClient: boolean) {
  if (requested === registered) return true;
  if (!publicClient) return false;
  const actual = withoutLoopbackPort(requested);
  return actual !== null && actual === withoutLoopbackPort(registered);
}
