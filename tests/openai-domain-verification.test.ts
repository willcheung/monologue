import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/.well-known/openai-apps-challenge/route";

afterEach(() => vi.unstubAllEnvs());

describe("OpenAI domain verification", () => {
  it("returns only the configured token as uncached plain text without authentication", async () => {
    vi.stubEnv("MONOLOGUE_OPENAI_DOMAIN_VERIFICATION_TOKEN", " test-challenge_123\n");
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("test-challenge_123");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([undefined, "", "  ", "token-one\ntoken-two", "<html>token</html>"])(
    "returns 404 when no single valid token is configured (%s)",
    async (token) => {
      vi.stubEnv("MONOLOGUE_OPENAI_DOMAIN_VERIFICATION_TOKEN", token);
      const response = GET();
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    },
  );
});
