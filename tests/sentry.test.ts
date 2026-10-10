import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { stripSentryContext } from "@/lib/sentry-options";

describe("Sentry error privacy", () => {
  it("removes private request and activity context while preserving useful error evidence", () => {
    const event: ErrorEvent = {
      type: undefined,
      event_id: "synthetic-event",
      request: { url: "https://example.test/join?token=synthetic", headers: { authorization: "synthetic" }, data: { summary: "Private action" } },
      user: { email: "synthetic@example.test" },
      extra: { apiKey: "synthetic", action: "Private action" },
      breadcrumbs: [{ message: "Private action", data: { token: "synthetic" } }],
      contexts: { custom: { apiKey: "synthetic" } },
      exception: { values: [{ type: "Error", value: "Unexpected failure", stacktrace: { frames: [{ filename: "app.js", lineno: 10 }] } }] },
      release: "synthetic-release",
      environment: "staging",
      debug_meta: { images: [] },
    };
    const cleaned = stripSentryContext(event);
    for (const field of ["request", "user", "extra", "breadcrumbs", "contexts"]) expect(cleaned).not.toHaveProperty(field);
    expect(cleaned.exception?.values?.[0].stacktrace?.frames?.[0].lineno).toBe(10);
    expect(cleaned.release).toBe("synthetic-release");
    expect(cleaned.environment).toBe("staging");
    expect(cleaned.debug_meta).toEqual({ images: [] });
  });
});
