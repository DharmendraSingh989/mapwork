import { describe, it, expect } from "vitest";
import { PointGeometrySchema, LineStringGeometrySchema, PolygonGeometrySchema } from "@mapforge/shared";

describe("Geographic Coordinate Preservation and Validation", () => {
  it("strictly validates Point coordinates in GeoJSON [longitude, latitude] format", () => {
    // Bhopal coordinates: lat 23.2599, lng 77.4126 -> GeoJSON [77.4126, 23.2599]
    const validPoint = {
      type: "Point" as const,
      coordinates: [77.4126, 23.2599] as [number, number]
    };

    const parsed = PointGeometrySchema.safeParse(validPoint);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.coordinates[0]).toBe(77.4126); // Longitude
      expect(parsed.data.coordinates[1]).toBe(23.2599); // Latitude
    }
  });

  it("rejects out-of-range geographic coordinates", () => {
    const invalidLng = {
      type: "Point" as const,
      coordinates: [195.0, 23.2599] // Lng > 180
    };
    expect(PointGeometrySchema.safeParse(invalidLng).success).toBe(false);

    const invalidLat = {
      type: "Point" as const,
      coordinates: [77.4126, 95.0] // Lat > 90
    };
    expect(PointGeometrySchema.safeParse(invalidLat).success).toBe(false);
  });

  it("preserves exact geographic coordinates through JSON serialization and deserialization", () => {
    const originalCoordinates: [number, number] = [77.412601234, 23.259905678];
    const originalStroke: [number, number][] = [
      [77.4126, 23.2599],
      [77.4135, 23.2605],
      [77.4150, 23.2620]
    ];

    const serialized = JSON.stringify({
      markerCoords: originalCoordinates,
      strokeCoords: originalStroke
    });

    const deserialized = JSON.parse(serialized);

    expect(deserialized.markerCoords[0]).toBe(originalCoordinates[0]);
    expect(deserialized.markerCoords[1]).toBe(originalCoordinates[1]);

    expect(deserialized.strokeCoords).toEqual(originalStroke);
  });

  it("validates LineString and Polygon geometries correctly", () => {
    const validLine = {
      type: "LineString" as const,
      coordinates: [
        [77.4126, 23.2599],
        [77.4135, 23.2605]
      ]
    };
    expect(LineStringGeometrySchema.safeParse(validLine).success).toBe(true);

    const validPolygon = {
      type: "Polygon" as const,
      coordinates: [
        [
          [77.4126, 23.2599],
          [77.4135, 23.2605],
          [77.4150, 23.2620],
          [77.4126, 23.2599] // closed ring
        ]
      ]
    };
    expect(PolygonGeometrySchema.safeParse(validPolygon).success).toBe(true);
  });
});
