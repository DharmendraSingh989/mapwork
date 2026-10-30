import mongoose from "mongoose";
import crypto from "crypto";
import { MapModel, IMap } from "../models/Map.js";
import { MapAnnotationModel } from "../models/MapAnnotation.js";
import { MapItem } from "@mapforge/shared";

export async function createMap(
  ownerId: string,
  data: {
    name: string;
    description?: string;
    tags?: string[];
    styleUrl?: string;
    camera?: any;
  }
): Promise<MapItem> {
  const mapDoc = await MapModel.create({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    name: data.name,
    description: data.description || "",
    tags: data.tags || [],
    styleUrl: data.styleUrl,
    camera: data.camera
  });

  return toMapItem(mapDoc, 0);
}

export async function getMapsForUser(
  ownerId: string,
  options: { search?: string; tag?: string; sort?: "createdAt" | "updatedAt"; order?: "asc" | "desc" } = {}
): Promise<MapItem[]> {
  const query: any = {
    ownerId: new mongoose.Types.ObjectId(ownerId),
    isDeleted: false
  };

  if (options.search) {
    query.name = { $regex: options.search, $options: "i" };
  }

  if (options.tag) {
    query.tags = options.tag;
  }

  const sortField = options.sort || "updatedAt";
  const sortDirection = options.order === "asc" ? 1 : -1;

  const maps = await MapModel.find(query).sort({ [sortField]: sortDirection }).lean();

  // Get annotation counts for each map
  const mapIds = maps.map((m) => m._id);
  const counts = await MapAnnotationModel.aggregate([
    { $match: { mapId: { $in: mapIds } } },
    { $group: { _id: "$mapId", count: { $sum: 1 } } }
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts) {
    countMap.set(c._id.toString(), c.count);
  }

  return maps.map((m) => toMapItem(m, countMap.get(m._id.toString()) || 0));
}

export async function getMapById(mapId: string, userId?: string): Promise<MapItem | null> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) return null;

  const mapDoc = await MapModel.findOne({ _id: mapId, isDeleted: false }).lean();
  if (!mapDoc) return null;

  const count = await MapAnnotationModel.countDocuments({ mapId: mapDoc._id });
  return toMapItem(mapDoc, count);
}

export async function updateMap(
  mapId: string,
  ownerId: string,
  updateData: {
    name?: string;
    description?: string;
    tags?: string[];
    styleUrl?: string;
    camera?: any;
    thumbnailUrl?: string;
  }
): Promise<MapItem | null> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) return null;

  const updated = await MapModel.findOneAndUpdate(
    { _id: mapId, ownerId: new mongoose.Types.ObjectId(ownerId), isDeleted: false },
    { $set: updateData },
    { new: true }
  ).lean();

  if (!updated) return null;

  const count = await MapAnnotationModel.countDocuments({ mapId: updated._id });
  return toMapItem(updated, count);
}

export async function deleteMap(mapId: string, ownerId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) return false;

  const res = await MapModel.findOneAndUpdate(
    { _id: mapId, ownerId: new mongoose.Types.ObjectId(ownerId) },
    { $set: { isDeleted: true } }
  );

  return !!res;
}

export async function duplicateMap(mapId: string, ownerId: string): Promise<MapItem> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) {
    throw new Error("Invalid map ID");
  }

  const originalMap = await MapModel.findById(mapId).lean();
  if (!originalMap || originalMap.isDeleted) {
    throw new Error("Map not found");
  }

  // Create new duplicated map
  const duplicatedMap = await MapModel.create({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    name: `${originalMap.name} (Copy)`,
    description: originalMap.description,
    tags: originalMap.tags,
    styleUrl: originalMap.styleUrl,
    camera: originalMap.camera,
    sourceMapIds: [originalMap._id]
  });

  // Copy all annotations, assigning new stable IDs while preserving 100% exact geographic coordinates
  const originalAnnotations = await MapAnnotationModel.find({ mapId: originalMap._id }).lean();

  if (originalAnnotations.length > 0) {
    const newAnnotations = originalAnnotations.map((ann) => ({
      mapId: duplicatedMap._id,
      annotationId: crypto.randomUUID ? crypto.randomUUID() : `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: ann.type,
      geometry: JSON.parse(JSON.stringify(ann.geometry)), // clone geometry faithfully
      properties: JSON.parse(JSON.stringify(ann.properties)),
      createdBy: new mongoose.Types.ObjectId(ownerId),
      version: 1
    }));

    await MapAnnotationModel.insertMany(newAnnotations);
  }

  return toMapItem(duplicatedMap, originalAnnotations.length);
}

export function toMapItem(doc: any, annotationCount = 0): MapItem {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId.toString(),
    name: doc.name,
    description: doc.description || "",
    tags: doc.tags || [],
    styleUrl: doc.styleUrl,
    camera: doc.camera || {
      center: { lat: 23.2599, lng: 77.4126 },
      zoom: 12,
      pitch: 0,
      bearing: 0
    },
    sourceMapIds: doc.sourceMapIds ? doc.sourceMapIds.map((id: any) => id.toString()) : [],
    isDeleted: doc.isDeleted || false,
    thumbnailUrl: doc.thumbnailUrl,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
    updatedAt: (doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt)).toISOString(),
    annotationCount
  };
}
