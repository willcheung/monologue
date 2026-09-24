import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function GET() {
  const skill = await readFile(path.join(process.cwd(), "skills", "monologue", "SKILL.md"), "utf8");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Monologue agent setup</title>
  <meta name="description" content="Instructions for connecting your agent to Monologue.">
</head>
<body>
  <main>
    <h1>Monologue agent setup</h1>
    <p>Read and follow the complete instructions below. The <a href="/agent-setup/SKILL.md">raw SKILL.md</a> is also available.</p>
    <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(skill)}</pre>
  </main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
