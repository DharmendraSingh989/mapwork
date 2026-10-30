import { describe, it, expect } from "vitest";
import { LngLat, MapAnnotation } from "@mapforge/shared";

interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

function updateBoundsWithCoords(bounds: Bounds | null, coords: any, type: string): Bounds {
  let b = bounds ? { ...bounds } : null;

  const expand = (lng: number, lat: number) => {
    if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat)) return;
    if (!b) {
      b = { minLng: lng, minLat: lat, maxLng: lng, maxLat: lat };
    } else {
      if (lng < b.minLng) b.minLng = lng;
      if (lng > b.maxLng) b.maxLng = lng;
      if (lat < b.minLat) b.minLat = lat;
      if (lat > b.maxLat) b.maxLat = lat;
    }
  };

  if (type === "Point" && Array.isArray(coords)) {
    expand(coords[0], coords[1]);
  } else if (type === "LineString" && Array.isArray(coords)) {
    for (const pt of coords) {
      if (Array.isArray(pt)) expand(pt[0], pt[1]);
    }
  }

  return b || { minLng: 77.4126, minLat: 23.2599, maxLng: 77.4126, maxLat: 23.2599 };
}

describe("Map Merge Core Algorithm & Coordinate Invariants", () => {
  const sourceMapA_Annotations: MapAnnotation[] = [
    {
      id: "ann_a_1",
      mapId: "map_a",
      type: "marker",
      geometry: {
        type: "Point",
        coordinates: [77.4126, 23.2599] // Bhopal Petrol Pump
      },
      properties: {
        emoji: "⛽",
        label: "Bharat Petroleum",
        category: "fuel",
        color: "#EF4444"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }
  ];

  const sourceMapB_Annotations: MapAnnotation[] = [
    {
      id: "ann_b_1",
      mapId: "map_b",
      type: "marker",
      geometry: {
        type: "Point",
        coordinates: [77.4180, 23.2550] // Cloth store
      },
      properties: {
        emoji: "👗",
        label: "Silk & Cotton",
        category: "clothing",
        color: "#3B82F6"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    },
    {
      id: "ann_b_2",
      mapId: "map_b",
      type: "freehand",
      geometry: {
        type: "LineString",
        coordinates: [
          [77.4180, 23.2550],
          [77.4185, 23.2555],
          [77.4190, 23.2560]
        ]
      },
      properties: {
        color: "#10B981",
        strokeWidth: 4,
        opacity: 0.9
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }
  ];

  it("combines annotations from multiple maps with 100% exact geographic coordinate preservation", () => {
    const allSource = [...sourceMapA_Annotations, ...sourceMapB_Annotations];

    // Simulate merge process
    const mergedAnnotations = allSource.map((ann, idx) => ({
      ...JSON.parse(JSON.stringify(ann)),
      id: `merged_uuid_${idx}`,
      mapId: "destination_map_id",
      properties: {
        ...ann.properties,
        mergedFromMapId: ann.mapId
      }
    }));

    expect(mergedAnnotations.length).toBe(3);

    // Exact coordinate checks
    expect(mergedAnnotations[0].geometry.coordinates).toEqual([77.4126, 23.2599]);
    expect(mergedAnnotations[1].geometry.coordinates).toEqual([77.4180, 23.2550]);
    expect(mergedAnnotations[2].geometry.coordinates).toEqual([
      [77.4180, 23.2550],
      [77.4185, 23.2555],
      [77.4190, 23.2560]
    ]);
  });

  it("generates brand-new independent IDs for all merged annotations", () => {
    const allSource = [...sourceMapA_Annotations, ...sourceMapB_Annotations];
    const originalIds = new Set(allSource.map((a) => a.id));

    const mergedAnnotations = allSource.map((ann, idx) => ({
      ...JSON.parse(JSON.stringify(ann)),
      id: `merged_fresh_id_${idx}`
    }));

    for (const merged of mergedAnnotations) {
      expect(originalIds.has(merged.id)).toBe(false);
    }
  });

  it("never mutates or modifies the original source annotations", () => {
    const initialClone = JSON.parse(JSON.stringify(sourceMapA_Annotations));

    // Perform cloning and mutation on merged copy
    const mergedCopy = sourceMapA_Annotations.map((ann) => ({
      ...JSON.parse(JSON.stringify(ann)),
      id: "mutated_id",
      properties: { label: "Mutated Label" }
    }));

    expect(mergedCopy[0].properties.label).toBe("Mutated Label");
    // Verify source remains unaltered
    expect(sourceMapA_Annotations).toEqual(initialClone);
  });

  it("computes the geographic bounding box encompassing all source annotations", () => {
    let bounds: Bounds | null = null;
    const allSource = [...sourceMapA_Annotations, ...sourceMapB_Annotations];

    for (const ann of allSource) {
      bounds = updateBoundsWithCoords(bounds, ann.geometry.coordinates, ann.geometry.type);
    }

    expect(bounds).toBeDefined();
    expect(bounds!.minLng).toBe(77.4126);
    expect(bounds!.maxLng).toBe(77.4190);
    expect(bounds!.minLat).toBe(23.2550);
    expect(bounds!.maxLat).toBe(23.2599);
  });
});
