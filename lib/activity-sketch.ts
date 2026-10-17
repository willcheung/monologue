import type { Options } from "roughjs/bin/core";
import { ACTIVITY_BANDS, activityBand } from "./activity";

// Shared Rough.js treatment for the SVG matrix and the PNG: the weekly chart's
// angled hatching, slightly uneven outlines and deterministic seeds.
export function activitySketchOptions(count: number | null, seed: number): Options {
  if (count === null) return { stroke: "#e8e5dd", strokeWidth: .8, strokeLineDash: [3, 3], roughness: 1.1, seed };
  const band = activityBand(count);
  return {
    fill: ACTIVITY_BANDS[band].color,
    fillStyle: count === 0 ? "solid" : "hachure",
    fillWeight: 1.8,
    hachureAngle: -12,
    hachureGap: [0, 6, 4.5, 3.5, 2.5][band],
    stroke: count === 0 ? "#aaa69d" : "#617a67",
    strokeWidth: 1.25,
    roughness: 1.15,
    bowing: .9,
    seed,
  };
}
