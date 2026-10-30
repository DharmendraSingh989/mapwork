import mongoose from "mongoose";
import { MapAnnotationModel, IMapAnnotation } from "../models/MapAnnotation.js";
import { MapAnnotation } from "@mapforge/shared";

export async function getAnnotationsByMapId(mapId: string): Promise<MapAnnotation[]> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) return [];

  const docs = await MapAnnotationModel.find({ mapId }).sort({ createdAt: 1 }).lean();
  return docs.map(toMapAnnotation);
}

export async function createAnnotation(
  mapId: string,
  userId: string,
  data: {
    id: string;
    type: string;
    geometry: any;
    properties?: any;
  }
): Promise<MapAnnotation> {
  const doc = await MapAnnotationModel.findOneAndUpdate(
    { mapId: new mongoose.Types.ObjectId(mapId), annotationId: data.id },
    {
      $set: {
        type: data.type,
        geometry: data.geometry,
        properties: data.properties || {},
        updatedBy: new mongoose.Types.ObjectId(userId)
      },
      $setOnInsert: {
        createdBy: new mongoose.Types.ObjectId(userId),
        version: 1
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return toMapAnnotation(doc);
}

export async function updateAnnotation(
  mapId: string,
  annotationId: string,
  userId: string,
  data: {
    geometry?: any;
    properties?: any;
  }
): Promise<MapAnnotation | null> {
  const update: any = {
    $inc: { version: 1 },
    $set: { updatedBy: new mongoose.Types.ObjectId(userId) }
  };

  if (data.geometry) {
    update.$set.geometry = data.geometry;
  }

  if (data.properties) {
    for (const [key, val] of Object.entries(data.properties)) {
      update.$set[`properties.${key}`] = val;
    }
  }

  const updated = await MapAnnotationModel.findOneAndUpdate(
    { mapId, annotationId },
    update,
    { new: true }
  ).lean();

  if (!updated) return null;
  return toMapAnnotation(updated);
}

export async function deleteAnnotation(mapId: string, annotationId: string): Promise<boolean> {
  const res = await MapAnnotationModel.deleteOne({ mapId, annotationId });
  return res.deletedCount > 0;
}

export async function batchOperations(
  mapId: string,
  userId: string,
  operations: {
    create?: Array<{ id: string; type: string; geometry: any; properties?: any }>;
    update?: Array<{ id: string; data: { geometry?: any; properties?: any } }>;
    delete?: string[];
  }
): Promise<{ created: number; updated: number; deleted: number }> {
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  // 1. Creations & Upserts
  if (operations.create && operations.create.length > 0) {
    const bulkOps = operations.create.map((op) => ({
      updateOne: {
        filter: { mapId: new mongoose.Types.ObjectId(mapId), annotationId: op.id },
        update: {
          $set: {
            type: op.type,
            geometry: op.geometry,
            properties: op.properties || {},
            updatedBy: new mongoose.Types.ObjectId(userId)
          },
          $setOnInsert: {
            createdBy: new mongoose.Types.ObjectId(userId),
            version: 1
          }
        },
        upsert: true
      }
    }));

    try {
      const res = await MapAnnotationModel.bulkWrite(bulkOps);
      createdCount = res.upsertedCount;
      updatedCount += res.modifiedCount;
    } catch (e: any) {
      console.error("Error in batch upsert:", e);
    }
  }

  // 2. Updates
  if (operations.update && operations.update.length > 0) {
    const bulkOps = operations.update.map((op) => {
      const updateSet: any = {
        updatedBy: new mongoose.Types.ObjectId(userId)
      };
      if (op.data.geometry) updateSet.geometry = op.data.geometry;
      if (op.data.properties) {
        for (const [k, v] of Object.entries(op.data.properties)) {
          updateSet[`properties.${k}`] = v;
        }
      }

      return {
        updateOne: {
          filter: { mapId: new mongoose.Types.ObjectId(mapId), annotationId: op.id },
          update: { $set: updateSet, $inc: { version: 1 } }
        }
      };
    });

    const res = await MapAnnotationModel.bulkWrite(bulkOps);
    updatedCount = res.modifiedCount;
  }

  // 3. Deletions
  if (operations.delete && operations.delete.length > 0) {
    const res = await MapAnnotationModel.deleteMany({
      mapId: new mongoose.Types.ObjectId(mapId),
      annotationId: { $in: operations.delete }
    });
    deletedCount = res.deletedCount;
  }

  return { created: createdCount, updated: updatedCount, deleted: deletedCount };
}

export function toMapAnnotation(doc: any): MapAnnotation {
  return {
    id: doc.annotationId,
    mapId: doc.mapId.toString(),
    type: doc.type,
    geometry: doc.geometry,
    properties: doc.properties || {},
    createdBy: doc.createdBy ? doc.createdBy.toString() : undefined,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : undefined,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
    updatedAt: (doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt)).toISOString(),
    version: doc.version || 1
  };
}
