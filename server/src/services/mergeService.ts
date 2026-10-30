import mongoose from "mongoose";
import { MapModel } from "../models/Map.js";
import { MapAnnotationModel } from "../models/MapAnnotation.js";
import { ActivityLogModel } from "../models/ActivityLog.js";
import { toMapItem } from "./mapService.js";
import { MergeMapsResult } from "@mapforge/shared";

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
  } else if (type === "Polygon" && Array.isArray(coords)) {
    for (const ring of coords) {
      if (Array.isArray(ring)) {
        for (const pt of ring) {
          if (Array.isArray(pt)) expand(pt[0], pt[1]);
        }
      }
    }
  }

  return b || { minLng: 77.4126, minLat: 23.2599, maxLng: 77.4126, maxLat: 23.2599 };
}

function calculateViewportFromBounds(bounds: Bounds | null, fallbackCamera: any) {
  if (!bounds) return fallbackCamera;

  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  const deltaLng = Math.abs(bounds.maxLng - bounds.minLng);
  const deltaLat = Math.abs(bounds.maxLat - bounds.minLat);
  const maxDelta = Math.max(deltaLng, deltaLat);

  let zoom = 12;
  if (maxDelta > 60) zoom = 3;
  else if (maxDelta > 30) zoom = 4;
  else if (maxDelta > 15) zoom = 5;
  else if (maxDelta > 8) zoom = 7;
  else if (maxDelta > 4) zoom = 8;
  else if (maxDelta > 2) zoom = 9;
  else if (maxDelta > 1) zoom = 10;
  else if (maxDelta > 0.5) zoom = 11;
  else if (maxDelta > 0.1) zoom = 13;
  else if (maxDelta > 0.05) zoom = 14;
  else zoom = 15;

  return {
    center: { lat: centerLat, lng: centerLng },
    zoom,
    pitch: 0,
    bearing: 0
  };
}

export async function mergeMaps(
  userId: string,
  userName: string,
  sourceMapIds: string[],
  destinationName: string,
  destinationDescription?: string,
  tags?: string[]
): Promise<MergeMapsResult> {
  // 1. Validation: At least two maps
  const uniqueIds = Array.from(new Set(sourceMapIds));
  if (uniqueIds.length < 2) {
    throw new Error("Must select at least two unique maps to merge");
  }

  // 2. Fetch all source maps
  const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
  const sourceMaps = await MapModel.find({
    _id: { $in: objectIds },
    isDeleted: false
  }).lean();

  if (sourceMaps.length !== uniqueIds.length) {
    throw new Error("One or more selected source maps could not be found");
  }

  // 3. Fetch all annotations across all source maps
  const sourceAnnotations = await MapAnnotationModel.find({
    mapId: { $in: objectIds }
  }).lean();

  // 4. Calculate bounding box of all annotations to compute optimal destination viewport
  let overallBounds: Bounds | null = null;
  for (const ann of sourceAnnotations) {
    if (ann.geometry && ann.geometry.coordinates) {
      overallBounds = updateBoundsWithCoords(overallBounds, ann.geometry.coordinates, ann.geometry.type);
    }
  }

  const destinationCamera = calculateViewportFromBounds(
    overallBounds,
    sourceMaps[0].camera || { center: { lat: 23.2599, lng: 77.4126 }, zoom: 12 }
  );

  // Combine tags
  const mergedTags = Array.from(
    new Set([...(tags || []), ...sourceMaps.flatMap((m) => m.tags || [])])
  );

  // 5. Create destination map
  const destinationMap = await MapModel.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    name: destinationName,
    description: destinationDescription || `Merged from: ${sourceMaps.map((m) => m.name).join(", ")}`,
    tags: mergedTags,
    styleUrl: sourceMaps[0].styleUrl,
    camera: destinationCamera,
    sourceMapIds: objectIds
  });

  // 6. Deep copy all annotations with new UUIDs, preserving exact coordinates and properties
  let importedCount = 0;
  if (sourceAnnotations.length > 0) {
    const newAnnotations = sourceAnnotations.map((ann, idx) => ({
      mapId: destinationMap._id,
      annotationId: crypto.randomUUID
        ? crypto.randomUUID()
        : `merged_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
      type: ann.type,
      geometry: JSON.parse(JSON.stringify(ann.geometry)), // 100% exact geographic coordinate preservation
      properties: {
        ...JSON.parse(JSON.stringify(ann.properties || {})),
        mergedFromMapId: ann.mapId.toString()
      },
      createdBy: new mongoose.Types.ObjectId(userId),
      version: 1
    }));

    const inserted = await MapAnnotationModel.insertMany(newAnnotations);
    importedCount = inserted.length;
  }

  // 7. Record activity log
  await ActivityLogModel.create({
    actorId: new mongoose.Types.ObjectId(userId),
    actorName: userName,
    targetType: "map",
    targetId: destinationMap._id.toString(),
    action: "MERGE_MAPS",
    details: {
      sourceMapIds: uniqueIds,
      importedAnnotationCount: importedCount
    }
  });

  return {
    destinationMap: toMapItem(destinationMap, importedCount),
    importedAnnotationCount: importedCount,
    sourceMapIds: uniqueIds,
    bounds: overallBounds
  };
}
