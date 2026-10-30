import { describe, it, expect } from "vitest";
import { simplifyCoordinates, calculateBounds } from "../src/lib/geo.js";
import { LngLat } from "@mapforge/shared";

describe("Geographic Freehand Coordinate Simplification (Ramer-Douglas-Peucker)", () => {
  it("preserves start and end coordinates exactly", () => {
    const stroke: LngLat[] = [
      [77.4126, 23.2599],
      [77.4127, 23.25995],
      [77.4128, 23.2600],
      [77.4130, 23.2602],
      [77.4140, 23.2610]
    ];

    const simplified = simplifyCoordinates(stroke, 0.0001);

    expect(simplified[0]).toEqual(stroke[0]);
    expect(simplified[simplified.length - 1]).toEqual(stroke[stroke.length - 1]);
    expect(simplified.length).toBeLessThanOrEqual(stroke.length);
  });

  it("calculates accurate geographic bounding boxes", () => {
    const points: LngLat[] = [
      [77.40, 23.20],
      [77.50, 23.30],
      [77.45, 23.25]
    ];

    const bounds = calculateBounds(points);
    expect(bounds).toEqual([77.40, 23.20, 77.50, 23.30]);
  });
});
