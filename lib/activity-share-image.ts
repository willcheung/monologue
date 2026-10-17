import rough from "roughjs";
import { ACTIVITY_BANDS, activityWeeks, type ActivitySnapshot } from "./activity";
import { activitySketchOptions } from "./activity-sketch";
import { SHARE_SITE_LABEL } from "./share-card";

// Drawn into the existing static share canvas after its brand mark. The preview,
// download and native share all use the same PNG bytes.
export function drawActivityImage(context: CanvasRenderingContext2D, data: ActivitySnapshot) {
  const sketch = rough.canvas(context.canvas);
  const styles = getComputedStyle(document.body);
  const display = styles.getPropertyValue("--font-display").trim();
  const sans = styles.getPropertyValue("--font-sans").trim();
  const ink = styles.getPropertyValue("--ink").trim();
  const muted = styles.getPropertyValue("--muted").trim();
  context.fillStyle = ink;
  context.font = `700 56px ${display}`;
  context.fillText("My AI crew this month.", 58, 174);
  context.fillStyle = muted;
  context.font = `20px ${sans}`;
  context.fillText(data.periodLabel, 60, 214);
  context.font = `17px ${sans}`;
  context.fillText(`28 calendar days · ${data.timeZone}`, 60, 243);
  context.fillStyle = ink;
  context.font = `700 100px ${display}`;
  context.fillText(data.totalActions.toLocaleString("en-US"), 58, 342, 610);
  context.font = `700 29px ${display}`;
  context.fillText("reported completed actions", 60, 378);
  context.font = `700 38px ${display}`;
  context.fillText(`${data.activeAgents}`, 60, 432);
  context.fillText(`${data.currentStreak} ${data.currentStreak === 1 ? "day" : "days"}`, 290, 432);
  context.fillStyle = muted;
  context.font = `24px ${display}`;
  context.fillText("active agents", 60, 459);
  context.fillText("current streak", 290, 459);

  const weeks = activityWeeks(data.days);
  const x = 824 - (weeks.length - 4) * 25;
  const y = 167;
  const step = 47;
  context.font = `700 21px ${display}`;
  context.textAlign = "right";
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((weekday, row) => context.fillText(weekday, x - 16, y + row * step + 25));
  context.textAlign = "center";
  weeks.forEach((week, column) => {
    context.fillStyle = muted;
    context.font = `700 16px ${display}`;
    const [month, date] = (week.find(Boolean)?.dateLabel.replace(/, \d{4}$/, "") ?? "").split(" ");
    context.fillText(month, x + column * step + 18, y - 29);
    context.fillText(date ?? "", x + column * step + 18, y - 13);
    week.forEach((day, row) => {
      sketch.rectangle(x + column * step, y + row * step, 36, 36, activitySketchOptions(day?.count ?? null, 700 + column * 7 + row));
    });
  });
  context.textAlign = "left";
  context.fillStyle = muted;
  context.font = `20px ${display}`;
  context.fillText("Reported completed actions per day", 730, 515);
  ACTIVITY_BANDS.forEach((band, index) => {
    const bandX = 730 + index * 83;
    sketch.rectangle(bandX, 532, 16, 16, activitySketchOptions(band.min, 800 + index));
    context.fillStyle = muted;
    context.fillText(band.label, bandX + 22, 545);
  });
  context.strokeStyle = "#e8e5dd";
  context.beginPath(); context.moveTo(58, 565); context.lineTo(1142, 565); context.stroke();
  context.fillStyle = ink;
  context.font = `700 17px ${sans}`;
  context.fillText(`Your agent feed · ${SHARE_SITE_LABEL}`, 60, 594);
}
