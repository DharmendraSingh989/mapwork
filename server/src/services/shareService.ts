import crypto from "crypto";
import mongoose from "mongoose";
import { MapShareModel, IMapShare } from "../models/MapShare.js";
import { MapModel } from "../models/Map.js";
import { MapAnnotationModel } from "../models/MapAnnotation.js";
import { toMapItem } from "./mapService.js";
import { toMapAnnotation } from "./annotationService.js";
import { MapShare, MapItem, SharePermission } from "@mapforge/shared";

export async function createShare(
  mapId: string,
  ownerId: string,
  permission: SharePermission = "view",
  allowCopy = true,
  expiresInDays?: number | null
): Promise<MapShare> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) {
    throw new Error("Invalid map ID");
  }

  const map = await MapModel.findOne({ _id: mapId, ownerId: new mongoose.Types.ObjectId(ownerId), isDeleted: false });
  if (!map) {
    throw new Error("Map not found or unauthorized");
  }

  // Generate cryptographically random unguessable token
  const token = crypto.randomBytes(24).toString("hex");

  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  const shareDoc = await MapShareModel.create({
    mapId: new mongoose.Types.ObjectId(mapId),
    ownerId: new mongoose.Types.ObjectId(ownerId),
    token,
    permission,
    allowCopy,
    expiresAt,
    isRevoked: false
  });

  return toMapShare(shareDoc);
}

export async function getSharesForMap(mapId: string, ownerId: string): Promise<MapShare[]> {
  const shares = await MapShareModel.find({
    mapId: new mongoose.Types.ObjectId(mapId),
    ownerId: new mongoose.Types.ObjectId(ownerId)
  }).sort({ createdAt: -1 }).lean();

  return shares.map(toMapShare);
}

export async function getMapByShareToken(token: string): Promise<{ map: MapItem; share: MapShare; annotations: any[] }> {
  const share = await MapShareModel.findOne({ token, isRevoked: false }).lean();
  if (!share) {
    throw new Error("Share link is invalid or has been revoked");
  }

  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    throw new Error("Share link has expired");
  }

  const map = await MapModel.findOne({ _id: share.mapId, isDeleted: false }).lean();
  if (!map) {
    throw new Error("Shared map is no longer available");
  }

  const annotations = await MapAnnotationModel.find({ mapId: map._id }).sort({ createdAt: 1 }).lean();

  return {
    map: toMapItem(map, annotations.length),
    share: toMapShare(share),
    annotations: annotations.map(toMapAnnotation)
  };
}

export async function revokeShare(shareId: string, ownerId: string): Promise<boolean> {
  const res = await MapShareModel.findOneAndUpdate(
    { _id: shareId, ownerId: new mongoose.Types.ObjectId(ownerId) },
    { $set: { isRevoked: true } }
  );

  return !!res;
}

export async function importSharedMapAsCopy(
  token: string,
  recipientUserId: string,
  newMapName?: string
): Promise<MapItem> {
  const { map: sharedMap, share } = await getMapByShareToken(token);

  if (!share.allowCopy) {
    throw new Error("This shared map does not permit copying");
  }

  // Create an independent copy for the recipient user
  const copiedMap = await MapModel.create({
    ownerId: new mongoose.Types.ObjectId(recipientUserId),
    name: newMapName || `${sharedMap.name} (Shared Copy)`,
    description: sharedMap.description,
    tags: [...sharedMap.tags, "shared-copy"],
    styleUrl: sharedMap.styleUrl,
    camera: sharedMap.camera,
    sourceMapIds: [new mongoose.Types.ObjectId(sharedMap.id)]
  });

  // Copy all annotations with new IDs
  const annotations = await MapAnnotationModel.find({
    mapId: new mongoose.Types.ObjectId(sharedMap.id)
  }).lean();

  if (annotations.length > 0) {
    const newAnnotations = annotations.map((ann, idx) => ({
      mapId: copiedMap._id,
      annotationId: crypto.randomUUID
        ? crypto.randomUUID()
        : `shared_copy_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 8)}`,
      type: ann.type,
      geometry: JSON.parse(JSON.stringify(ann.geometry)), // Exact coordinate preservation
      properties: JSON.parse(JSON.stringify(ann.properties)),
      createdBy: new mongoose.Types.ObjectId(recipientUserId),
      version: 1
    }));

    await MapAnnotationModel.insertMany(newAnnotations);
  }

  return toMapItem(copiedMap, annotations.length);
}

export function toMapShare(doc: any): MapShare {
  return {
    id: doc._id.toString(),
    mapId: doc.mapId.toString(),
    ownerId: doc.ownerId.toString(),
    token: doc.token,
    permission: doc.permission,
    allowCopy: doc.allowCopy,
    expiresAt: doc.expiresAt ? (doc.expiresAt instanceof Date ? doc.expiresAt : new Date(doc.expiresAt)).toISOString() : null,
    isRevoked: doc.isRevoked || false,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString()
  };
}
