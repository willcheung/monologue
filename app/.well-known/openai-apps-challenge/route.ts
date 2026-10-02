export const dynamic = "force-dynamic";

export function GET() {
  // The deployment-specific token belongs in configuration, never source control.
  const token = process.env.MONOLOGUE_OPENAI_DOMAIN_VERIFICATION_TOKEN?.trim();
  const configured = Boolean(token && /^[A-Za-z0-9_-]+$/.test(token));
  return new Response(configured ? token : "Not found", {
    status: configured ? 200 : 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
