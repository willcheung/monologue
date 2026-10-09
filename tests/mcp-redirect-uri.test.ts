import { describe, expect, it } from "vitest";
import { registeredRedirectMatches } from "@/lib/mcp-redirect-uri";

describe("native OAuth callback ports", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("allows ephemeral ports only on the registered HTTP loopback host %s", host => {
    expect(registeredRedirectMatches(`http://${host}:50644/callback`, `http://${host}/callback`, true)).toBe(true);
    expect(registeredRedirectMatches(`http://${host}:50644/callback?state=one`, `http://${host}:9000/callback?state=one`, true)).toBe(true);
    expect(registeredRedirectMatches(`http://${host}:50644/callback`, `http://${host}/callback`, false)).toBe(false);
  });
  it.each([
    ["http://localhost:50644/other", "http://localhost/callback"],
    ["http://localhost:50644/callback?next=one", "http://localhost/callback"],
    ["http://127.0.0.1:50644/callback", "http://localhost/callback"],
    ["http://localhost.evil.example:50644/callback", "http://localhost/callback"],
    ["http://localhost@evil.example:50644/callback", "http://localhost/callback"],
    ["http://127.1:50644/callback", "http://127.0.0.1/callback"],
    ["http://localhost.:50644/callback", "http://localhost/callback"],
    ["http://LOCALHOST:50644/callback", "http://localhost/callback"],
    ["http://localhost:50644/callback#fragment", "http://localhost/callback"],
    ["http://localhost:50644/one/../callback", "http://localhost/callback"],
    ["http://localhost:50644/%63allback", "http://localhost/callback"],
    ["http://localhost:65536/callback", "http://localhost/callback"],
    ["http://localhost:0/callback", "http://localhost/callback"],
    ["https://localhost:50644/callback", "https://localhost/callback"],
    ["https://client.example:50644/callback", "https://client.example/callback"],
    ["http://10.0.0.1:50644/callback", "http://10.0.0.1/callback"],
  ])("keeps every non-port callback component strict (%s)", (requested, registered) => {
    expect(registeredRedirectMatches(requested, registered, true)).toBe(false);
  });
  it("keeps exact registered callbacks working for confidential clients", () => {
    expect(registeredRedirectMatches("https://example.test/callback", "https://example.test/callback", false)).toBe(true);
  });
});
