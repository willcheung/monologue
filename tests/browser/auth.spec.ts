import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3102";
const email = "password@example.test";
const password = "Disposable-browser-password-only!";
test.beforeAll(async ({ request }) => {
  // Compile the protected destination before browser navigation: development
  // compilation can replace client chunks, whereas production builds are ready.
  const response = await request.get("/feed");
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname).toBe("/sign-in");
});
test.beforeEach(async ({ page }, testInfo) => {
  const testIndex = testInfo.title.startsWith("password") ? 1 : testInfo.title.startsWith("denying") ? 2 : 3;
  const projectIndex = testInfo.project.name === "mobile" ? 10 : 0;
  // Distinct local clients keep the intentional five-attempt throttle from
  // coupling independent browser scenarios. Vercel IP trust is tested separately.
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${testIndex + projectIndex}` });
});
async function signIn(page: Page) {
  await page.waitForLoadState("networkidle");
  if (!await page.getByLabel("Email", { exact: true }).isVisible()) await page.getByRole("button", { name: "Sign in with email", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Password", { exact: true }).press("Enter");
}
async function authorization(request: APIRequestContext) {
  const callback = "https://client.example.test/callback";
  const registered = await request.post("/oauth/register", { data: { client_name: "Local test agent", redirect_uris: [callback], token_endpoint_auth_method: "none" } });
  expect(registered.status()).toBe(201);
  const { client_id: clientId } = await registered.json();
  const verifier = randomBytes(32).toString("base64url");
  const state = "keep-this-local-state+and?query";
  const params = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: callback,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256",
    resource: `${origin}/mcp`, scope: "actions:read actions:write", state });
  return { path: `/oauth/authorize?${params}`, verifier, state, clientId, callback };
}
const rpc = (request: APIRequestContext, token: string, method: string, params: object = {}) => request.post("/mcp", {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-11-25" },
  data: { jsonrpc: "2.0", id: 1, method, params },
});

test("password sign-in preserves OAuth, explicit consent connects scoped MCP, and logout revokes the browser session", async ({ page, context }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  // No development identity cookie can authenticate the actual cloud fixture.
  await context.addCookies([{ name: "monologue-dev-user", value: "dev-owner", url: origin }]);
  const flow = await authorization(context.request);
  await page.route("https://client.example.test/callback**", route => route.fulfill({ contentType: "text/html", body: "<h1>Local client callback</h1>" }));
  await page.goto(flow.path);
  await expect(page.getByRole("form", { name: "Sign in with email" })).toBeHidden();
  const next = new URL(page.url()).searchParams.get("next")!;
  expect(new URL(next, origin).searchParams.get("state")).toBe(flow.state);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Connect Local test agent?" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("state")).toBe(flow.state);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Connect agent", exact: true }).click();
  await page.waitForURL("https://client.example.test/callback**");
  expect(await page.evaluate(() => document.referrer)).toBe("");
  const callback = new URL(page.url());
  expect(callback.searchParams.get("state")).toBe(flow.state);
  expect(callback.searchParams.get("iss")).toBe(origin);
  const form = { grant_type: "authorization_code", client_id: flow.clientId, redirect_uri: flow.callback,
    code: callback.searchParams.get("code")!, code_verifier: flow.verifier, resource: `${origin}/mcp` };
  // Bad PKCE must not consume the approval; the valid client can still exchange.
  expect((await context.request.post("/oauth/token", { form: { ...form, code_verifier: "x".repeat(43) } })).status()).toBe(400);
  const exchange = await context.request.post("/oauth/token", { form });
  expect(exchange.status()).toBe(200);
  const tokens = await exchange.json();
  const tools = await (await rpc(context.request, tokens.access_token, "tools/list")).json();
  expect(tools.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual(["read_timeline", "report_action"]);
  const read = await (await rpc(context.request, tokens.access_token, "tools/call", { name: "read_timeline", arguments: { limit: 20 } })).json();
  expect(JSON.stringify(read.result)).toContain("Updated a sample document.");
  expect(JSON.stringify(read.result)).not.toContain("Booked a table");
  expect(JSON.stringify(read.result)).not.toContain("Sent the approved proposal");
  // The grant binds to the consenting workspace, ignoring a malicious tool argument.
  const input = { verb: "Updated", summary: "Updated local synthetic test data.", category: "other", status: "completed", system: "Local fixture" };
  const forged = await (await rpc(context.request, tokens.access_token, "tools/call", { name: "report_action", arguments: { ...input, workspaceId: "dev-studio" } })).json();
  expect(forged.result.isError).toBe(true);
  const write = await (await rpc(context.request, tokens.access_token, "tools/call", { name: "report_action", arguments: input })).json();
  expect(write.result.structuredContent.success).toBe(true);
  const after = await (await rpc(context.request, tokens.access_token, "tools/call", { name: "read_timeline", arguments: { limit: 20 } })).json();
  expect(JSON.stringify(after.result)).toContain("Updated local synthetic test data.");
  expect((await context.request.post("/api/actions", { data: { summary: "cookie-is-not-an-agent-key" } })).status()).toBe(401);
  expect((await context.request.post("/api/workspaces/select", { data: { workspaceId: "dev-studio" } })).status()).toBe(403);
  await page.goto("/feed");
  await expect(page.getByText("Updated a sample document.", { exact: true })).toBeVisible();
  // An existing session must bypass both public entry pages, without another login.
  await page.goto("/");
  await expect(page).toHaveURL(`${origin}/feed`);
  await expect(page.getByText("Updated a sample document.", { exact: true })).toBeVisible();
  await page.goto("/sign-in");
  await expect(page).toHaveURL(`${origin}/feed`);
  await page.goto(`/sign-in?next=${encodeURIComponent("/recap?briefing=weekly")}`);
  await expect(page).toHaveURL(`${origin}/recap?briefing=weekly`);
  const consentReturn = await authorization(context.request);
  await page.goto(`/sign-in?next=${encodeURIComponent(consentReturn.path)}`);
  await expect(page.getByRole("heading", { name: "Connect Local test agent?" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("state")).toBe(consentReturn.state);
  // Reject external destinations and avoid redirecting /sign-in back to itself.
  for (const next of ["https://attacker.example", "//attacker.example", "/sign-in?next=%2Ffeed", "/sign-in/"]) {
    const response = await context.request.get(`/sign-in?next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/feed");
  }
  await page.goto("/feed");
  const productNav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(productNav.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
  await expect(productNav.getByRole("link", { name: "Try free", exact: true })).toHaveCount(0);
  await expect(productNav.getByRole("link", { name: "Agent feed", exact: true })).toBeVisible();
  await expect(page.getByText("Booked a table for Saturday dinner.", { exact: true })).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Workspaces" }).click();
  await expect(page.getByRole("button", { name: "Workspaces" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Switch workspace").getByRole("listitem")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("password-login-feed.png") });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/sign-in/);
  expect(await (await context.request.get("/api/auth/get-session")).json()).toBeNull();
  // Agent grants are separate; revoke explicitly rather than assuming logout does it.
  expect((await context.request.post("/oauth/revoke", { form: { client_id: flow.clientId, token: tokens.refresh_token } })).status()).toBe(200);
  expect((await rpc(context.request, tokens.access_token, "tools/list")).status()).toBe(401);
  expect((await context.request.post("/oauth/token", { form })).status()).toBe(400);
});

test("denying consent creates no connection and returns the original state", async ({ page, context }) => {
  const flow = await authorization(context.request);
  await page.route("https://client.example.test/callback**", route => route.fulfill({ contentType: "text/html", body: "<h1>Local denied callback</h1>" }));
  await page.goto(flow.path);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Connect Local test agent?" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("https://client.example.test/callback**");
  expect(await page.evaluate(() => document.referrer)).toBe("");
  const callback = new URL(page.url());
  expect(callback.searchParams.get("error")).toBe("access_denied");
  expect(callback.searchParams.get("state")).toBe(flow.state);
  expect(callback.searchParams.has("code")).toBe(false);
});

test("failed login is accessible, recoverable, and an unsafe return falls back to the feed", async ({ page }, testInfo) => {
  await page.goto("/sign-in?next=https%3A%2F%2Fattacker.example%2F");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Sign in with email", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("form", { name: "Sign in with email" }).getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("form", { name: "Sign in with email" }).getByRole("alert")).toHaveText("Unable to sign in. Check your email and password.");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("password-login-error.png") });
  await signIn(page);
  await expect(page).toHaveURL(`${origin}/feed`);
});

// Each cold development route compiles independently; keep one check per page.
for (const path of ["/", "/developers", "/templates", "/integrations", "/integrations/claude-code", "/sign-in"]) {
  test(`logged-out navigation exposes sign in on ${path}`, async ({ page }) => {
    await page.goto(path);
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    await expect(navigation.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/sign-in");
    await expect(navigation.getByRole("link", { name: "Try free", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("email disclosure supports keyboard and clears hidden credentials", async ({ page }, testInfo) => {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  const disclosure = page.getByRole("button", { name: "Sign in with email", exact: true });
  const form = page.getByRole("form", { name: "Sign in with email" });
  const emailField = page.getByLabel("Email", { exact: true });
  const passwordField = page.getByLabel("Password", { exact: true });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(form).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("email-login-collapsed.png"), fullPage: true });
  await disclosure.focus();
  await disclosure.press("Enter");
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(emailField).toBeFocused();
  await expect(form).toContainText("Existing email accounts only. Email sign-up is not available.");
  await emailField.press("Tab");
  await expect(passwordField).toBeFocused();
  await emailField.fill(email);
  await passwordField.fill("Disposable-not-submitted-password!");
  await disclosure.focus();
  await disclosure.press("Space");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(disclosure).toBeFocused();
  await expect(form).toBeHidden();
  await disclosure.press("Space");
  await expect(emailField).toBeFocused();
  await expect(emailField).toHaveValue("");
  await expect(passwordField).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("email-login-expanded.png"), fullPage: true });
});
