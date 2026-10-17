import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const fixture = "/recap?workspaceId=browser-activity";
const matrix = (page: Page) => page.getByRole("region", { name: "Your agents’ activity" });
const dialog = (page: Page) => page.getByRole("dialog", { name: /^Share (your activity|your week|agent profile)$/ });
const shareText = (page: Page) => dialog(page).getByRole("textbox", { name: "Sharing text" });

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-timezone": "UTC" });
});

async function openShare(page: Page) {
  await page.goto(fixture);
  await matrix(page).getByRole("button", { name: "Share activity", exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: "Save image" })).toBeEnabled();
}

test("28 dates align to weekday rows and chronological weeks, with pointer, keyboard and touch details", async ({ page, isMobile }, testInfo) => {
  await page.goto(fixture);
  const section = matrix(page);
  await expect(section.locator(".activity-total dd")).toHaveText("188");
  await expect(section.locator(".activity-stats")).toContainText("2active agents");
  const days = section.locator(".activity-day");
  await expect(days).toHaveCount(28);
  await expect(section.locator(".activity-sketch path").first()).toBeVisible();
  const layout = await days.evaluateAll(buttons => buttons.map(button => ({ key: button.getAttribute("data-date")!, x: button.getBoundingClientRect().x, y: button.getBoundingClientRect().y, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  const top = Math.min(...layout.map(day => day.y));
  const left = Math.min(...layout.map(day => day.x));
  const padding = new Date(`${layout[0].key}T12:00:00Z`).getUTCDay();
  layout.forEach((day, index) => {
    expect(day.y - top).toBe(new Date(`${day.key}T12:00:00Z`).getUTCDay() * 44);
    expect(day.x - left).toBe(Math.floor((index + padding) / 7) * 44);
    expect(day.width).toBe(44); expect(day.height).toBe(44);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Legend ranges must fit on one line instead of colliding with the help text.
  const legend = section.locator(".activity-legend-bands");
  expect(await legend.evaluate(element => [...element.querySelectorAll("span")].every(label => label.scrollHeight <= element.clientHeight && label.scrollWidth <= label.clientWidth))).toBe(true);
  await days.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(days.nth(7)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(days.nth(8)).toBeFocused();
  await expect(section.getByRole("status")).toContainText("2 reported completed actions");
  if (isMobile) await days.nth(12).tap(); else await days.nth(12).hover();
  await expect(section.getByRole("status")).toContainText("20 reported completed actions");
  await section.screenshot({ path: testInfo.outputPath("activity-matrix.png"), style: ".site-header { visibility: hidden; }" });
});

test("share images use the bundled font when an optional system fallback is unavailable", async ({ page }) => {
  await page.goto(fixture);
  expect(await page.evaluate(async () => {
    const missing = new FontFace("Unavailable share fallback", 'local("__monologue_missing_system_font__")');
    document.fonts.add(missing);
    const display = getComputedStyle(document.body).getPropertyValue("--font-display").trim();
    document.body.style.setProperty("--font-display", `${display}, "Unavailable share fallback"`);
    try { await missing.load(); return false; } catch { return true; }
  })).toBe(true);
  await matrix(page).getByRole("button", { name: "Share activity", exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: "Save image" })).toBeEnabled();
  expect(await page.evaluate(() => {
    const primary = getComputedStyle(document.body).getPropertyValue("--font-display").trim().split(",")[0];
    return document.fonts.check(`700 56px ${primary}`) && document.fonts.check(`400 24px ${primary}`);
  })).toBe(true);
  const previewBytes = await dialog(page).locator("img").evaluate(async image => Array.from(new Uint8Array(await (await fetch((image as HTMLImageElement).src)).arrayBuffer())));
  const download = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "Save image" }).click();
  expect(await readFile((await (await download).path())!)).toEqual(Buffer.from(previewBytes));
});

test("the share dialog contains focus, closes on Escape and restores the trigger", async ({ page }) => {
  await openShare(page);
  const close = dialog(page).getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog(page).getByRole("button", { name: "Copy text" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  for (let i = 0; i < 9; i++) { await page.keyboard.press("Tab"); await expect(dialog(page).locator(":focus")).toHaveCount(1); }
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(matrix(page).getByRole("button", { name: "Share activity" })).toBeFocused();
});

test("downloads the exact sketch preview PNG without a private breakdown and copies the same snapshot", async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { sessionStorage.setItem("copied-share", text); } } }));
  await openShare(page);
  await expect(shareText(page)).toHaveValue(/188 reported completed actions · 2 active agents · 6-day current streak/);
  await expect(shareText(page)).not.toHaveValue(/Fixture|Private activity|customer|metadata|browser-agent|example.test/);
  await expect(dialog(page).getByRole("checkbox")).toHaveCount(0);
  await expect(shareText(page)).not.toHaveValue(/Agents:|Apps:|Action types:/);
  await expect(dialog(page).getByRole("button", { name: "Save image" })).toBeEnabled();
  const previewBytes = await dialog(page).locator("img").evaluate(async image => Array.from(new Uint8Array(await (await fetch((image as HTMLImageElement).src)).arrayBuffer())));
  const downloadEvent = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "Save image" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("monologue-28-day-activity.png");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(bytes).toEqual(Buffer.from(previewBytes));
  await download.saveAs(testInfo.outputPath("activity-export.png"));
  await dialog(page).getByRole("button", { name: "Copy text" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("copied-share"))).toBe(await shareText(page).inputValue());
  await expect(dialog(page).getByRole("status")).toHaveText("Text copied");
  await page.keyboard.press("Escape");
  await matrix(page).getByRole("button", { name: "Share activity" }).click();
  await expect(dialog(page).getByRole("checkbox")).toHaveCount(0);
  await expect(shareText(page)).not.toHaveValue(/Fixture/);
});

test("native cancellation is neutral and unsupported file sharing downloads instead", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new DOMException("Cancelled", "AbortError"); } });
  });
  await openShare(page);
  let downloads = 0; page.on("download", () => downloads++);
  await dialog(page).getByRole("button", { name: "Share image" }).click();
  await expect(dialog(page).getByRole("button", { name: "Share image" })).toBeEnabled();
  await expect(dialog(page).getByRole("status")).toBeEmpty();
  expect(downloads).toBe(0);
  await page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: async (data: ShareData) => {
    sessionStorage.setItem("native-share", JSON.stringify({ name: data.files?.[0].name, type: data.files?.[0].type, text: data.text }));
  } }));
  await dialog(page).getByRole("button", { name: "Share image" }).click();
  await expect(dialog(page).getByRole("status")).toHaveText("Shared");
  expect(JSON.parse((await page.evaluate(() => sessionStorage.getItem("native-share")))!)).toEqual({ name: "monologue-28-day-activity.png", type: "image/png", text: await shareText(page).inputValue() });
  await page.evaluate(() => Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false }));
  const download = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "Share image" }).click();
  expect((await download).suggestedFilename()).toBe("monologue-28-day-activity.png");
  await expect(dialog(page).getByRole("status")).toContainText("File sharing is unavailable");
});

test("clipboard, sharing and image-generation failures never show success", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Denied"); } } });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new Error("Denied"); } });
  });
  await openShare(page);
  await dialog(page).getByRole("button", { name: "Copy text" }).click();
  await expect(dialog(page).getByRole("status")).toContainText("Could not copy");
  await dialog(page).getByRole("button", { name: "Share image" }).click();
  await expect(dialog(page).getByRole("status")).toHaveText("Could not share this image. Try Save image or Copy text.");
  await page.evaluate(() => { HTMLCanvasElement.prototype.toDataURL = () => { throw new Error("Export unavailable"); }; });
  await page.keyboard.press("Escape");
  await matrix(page).getByRole("button", { name: "Share activity" }).click();
  await expect(dialog(page).getByText("Could not create the image. You can still copy the sharing text.")).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Save image" })).toBeDisabled();
});

test("workspace selection stays explicit after another tab switches and inaccessible workspaces fail closed", async ({ page, context }) => {
  // Regression: a duplicate sibling React key retained the previous matrix on switch.
  const duplicateKeys: string[] = [];
  context.on("console", message => { if (message.text().includes("same key")) duplicateKeys.push(message.text()); });
  await page.goto("/recap?workspaceId=dev-studio");
  await expect(matrix(page).locator(".activity-total dd")).toHaveText("2");
  const other = await context.newPage();
  await other.goto("/recap?workspaceId=dev-studio");
  await other.getByRole("button", { name: "Workspaces", exact: true }).click();
  await other.getByRole("button", { name: "Personal Private", exact: true }).click();
  await expect(other).toHaveURL(/recap\?workspaceId=dev-owner-personal/);
  await expect(matrix(other).locator(".activity-total dd")).toHaveText("1");
  await page.reload();
  await expect(matrix(page).locator(".activity-total dd")).toHaveText("2");
  await matrix(page).getByRole("button", { name: "Share activity" }).click();
  await expect(shareText(page)).toHaveValue(/2 reported completed actions · 2 active agents/);
  await page.keyboard.press("Escape");
  const response = await page.goto("/recap?workspaceId=dev-sam-personal");
  expect(response?.status()).toBe(404);
  await expect(matrix(page)).toHaveCount(0);
  expect(duplicateKeys).toEqual([]);
});

test("empty activity offers setup for the displayed workspace and weekly/profile sharing still downloads", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => sessionStorage.setItem("setup-copy", text) } }));
  await page.goto("/recap");
  await page.getByRole("button", { name: "Workspaces", exact: true }).click();
  await page.getByRole("combobox", { name: "Sample account" }).selectOption("dev-sam");
  await expect(page).toHaveURL("/feed");
  await page.getByRole("link", { name: "Recap", exact: true }).click();
  await expect(matrix(page).locator(".activity-total dd")).toHaveText("0");
  await matrix(page).getByRole("button", { name: "Copy setup instructions" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("setup-copy"))).toContain("dev-sam-personal");
  for (const [url, label] of [["/recap?workspaceId=dev-sam-personal", "Share weekly recap"]]) {
    await page.goto(url); await page.getByRole("button", { name: label, exact: true }).click();
    const download = page.waitForEvent("download"); await dialog(page).getByRole("button", { name: "Save image" }).click();
    expect((await download).suggestedFilename()).toContain("7-day-recap");
    await page.keyboard.press("Escape");
  }
  await page.context().clearCookies();
  await page.goto("/agents/dev-alex-agent");
  await page.getByRole("button", { name: /Share/ }).click();
  const download = page.waitForEvent("download"); await dialog(page).getByRole("button", { name: "Save image" }).click();
  expect((await download).suggestedFilename()).toContain("my-ai-agent");
});

test("every share exports its exact branded preview and keeps mobile actions within reach", async ({ page, isMobile }, testInfo) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("canvas-labels", "[]");
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
      const labels = JSON.parse(sessionStorage.getItem("canvas-labels")!) as string[];
      labels.push(args[0]); sessionStorage.setItem("canvas-labels", JSON.stringify(labels));
      original.apply(this, args);
    };
  });
  if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
  for (const [kind, url, label] of [
    ["activity", fixture, "Share activity"],
    ["weekly", fixture, "Share weekly recap"],
    ["profile", "/agents/dev-alex-agent", "Share profile"],
  ]) {
    await page.goto(url);
    await page.getByRole("button", { name: label, exact: true }).click();
    const modal = dialog(page);
    await expect(modal.getByRole("button", { name: "Save image" })).toBeEnabled();
    await expect(shareText(page)).toHaveValue(/https:\/\/www\.monologue\.events\/integrations/);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("canvas-labels")!).some((label: string) => label.includes("monologue.events")))).toBe(true);
    if (kind === "weekly") {
      // The fixture has two distinct agents with the same private name.
      const labels = await page.evaluate(() => JSON.parse(sessionStorage.getItem("canvas-labels")!) as string[]);
      expect(labels).toContain("Agent 1");
      expect(labels).toContain("Agent 2");
    }
    expect(await shareText(page).evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await modal.locator(".share-dialog-content").evaluate(element => { element.scrollTop = element.scrollHeight; });
    for (const button of await modal.locator(".share-actions button").all()) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      if (isMobile) expect(box.height).toBe(48);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    expect(await modal.locator(".share-dialog").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    const bytes = await modal.locator("img").evaluate(async image => Array.from(new Uint8Array(await (await fetch((image as HTMLImageElement).src)).arrayBuffer())));
    const downloadEvent = page.waitForEvent("download");
    await modal.getByRole("button", { name: "Save image" }).click();
    const download = await downloadEvent;
    expect(await readFile((await download.path())!)).toEqual(Buffer.from(bytes));
    await download.saveAs(testInfo.outputPath(`${kind}-branded.png`));
    await modal.locator(".share-dialog-content").evaluate(element => { element.scrollTop = 0; });
    await modal.screenshot({ path: testInfo.outputPath(`${kind}-share-dialog.png`) });
    await modal.getByRole("button", { name: "Close", exact: true }).click();
  }
});
