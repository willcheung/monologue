import { expect, test } from "@playwright/test";

test("recap pairs the hand-drawn charts on desktop and stacks them on mobile with one stats row", async ({ page, isMobile }, testInfo) => {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-timezone": "UTC" });
  await page.goto("/recap?workspaceId=browser-activity");
  const activity = page.getByRole("region", { name: "Your agents’ activity", exact: true });
  const month = activity.getByRole("region", { name: "Last 28 days", exact: true });
  const week = activity.getByRole("region", { name: "Last 7 days", exact: true });
  await expect(activity.getByRole("definition")).toHaveCount(3);
  await expect(activity.getByRole("definition").last()).toHaveText("6 days");
  await expect(activity.getByText("active days", { exact: true })).toHaveCount(0);
  await expect(activity.locator(".activity-total dd")).toHaveText("188");
  await expect(page.getByText("actions completed this week", { exact: true })).toHaveCount(0);
  await expect(month.getByRole("button", { name: "Share activity", exact: true })).toHaveCount(1);
  await expect(week.getByRole("button", { name: "Share weekly recap", exact: true })).toHaveCount(1);
  await expect(month.locator(".activity-sketch path").first()).toBeVisible();
  await expect(week.getByRole("img")).toBeVisible();
  await expect(week.locator(".sketch-count")).toHaveCount(7);
  await page.evaluate(() => document.fonts.ready);

  for (const width of isMobile ? [390, 320] : [1280, 1024, 851, 850, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const monthly = (await month.boundingBox())!;
    const weekly = (await week.boundingBox())!;
    if (width > 850) {
      expect(Math.abs(monthly.y - weekly.y)).toBeLessThan(1);
      expect(weekly.x).toBeGreaterThanOrEqual(monthly.x + monthly.width);
      expect(weekly.width).toBeGreaterThan(monthly.width);
    } else {
      expect(weekly.y).toBeGreaterThanOrEqual(monthly.y + monthly.height);
      expect(Math.abs(monthly.x - weekly.x)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const legend = month.locator(".activity-legend-bands");
    expect(await legend.evaluate(element => [...element.querySelectorAll("span")].every(label => label.scrollHeight <= element.clientHeight && label.scrollWidth <= label.clientWidth))).toBe(true);
    const activeDays = activity.getByRole("definition").last();
    expect(await activeDays.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    // Scaling the weekly SVG must not make adjacent date labels run together.
    const dates = await week.locator(".sketch-date").evaluateAll(labels => labels.map(label => {
      const { x, right } = label.getBoundingClientRect();
      return { x, right };
    }));
    dates.slice(1).forEach((date, index) => expect(date.x).toBeGreaterThan(dates[index].right));
    await activity.screenshot({ path: testInfo.outputPath(`recap-${width}.png`), style: ".site-header { visibility: hidden; }" });
  }
});
