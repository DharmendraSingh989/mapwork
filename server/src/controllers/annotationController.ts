import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/index.js";
import * as annotationService from "../services/annotationService.js";
import { MapModel } from "../models/Map.js";
import { RoomModel } from "../models/Room.js";
import { MapShareModel } from "../models/MapShare.js";

async function verifyMapWritePermission(mapId: string, userId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) return false;

  const map = await MapModel.findOne({ _id: mapId, isDeleted: false }).lean();
  if (!map) return false;

  // 1. Owner has full write access
  if (map.ownerId.toString() === userId) return true;

  // 2. Active room editor/owner access
  const room = await RoomModel.findOne({
    activeMapId: map._id,
    isClosed: false,
    members: {
      $elemMatch: {
        userId: new mongoose.Types.ObjectId(userId),
        role: { $in: ["owner", "editor"] }
      }
    }
  }).lean();
  if (room) return true;

  // 3. Edit share access
  const editShare = await MapShareModel.findOne({
    mapId: map._id,
    permission: "edit",
    isRevoked: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  }).lean();
  if (editShare) return true;

  return false;
}

async function verifyMapReadPermission(mapId: string, userId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(mapId)) return false;

  const map = await MapModel.findOne({ _id: mapId, isDeleted: false }).lean();
  if (!map) return false;

  if (map.ownerId.toString() === userId) return true;

  const room = await RoomModel.findOne({
    activeMapId: map._id,
    isClosed: false,
    "members.userId": new mongoose.Types.ObjectId(userId)
  }).lean();
  if (room) return true;

  const share = await MapShareModel.findOne({
    mapId: map._id,
    isRevoked: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  }).lean();
  if (share) return true;

  return false;
}

export async function listAnnotations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const mapId = req.params.mapId as string;
    const userId = req.user!.id;

    const canRead = await verifyMapReadPermission(mapId, userId);
    if (!canRead) {
      res.status(403).json({ error: "Unauthorized to view annotations for this map" });
      return;
    }

    const annotations = await annotationService.getAnnotationsByMapId(mapId);
    res.json(annotations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch annotations" });
  }
}

export async function createAnnotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const mapId = req.params.mapId as string;
    const userId = req.user!.id;

    const canWrite = await verifyMapWritePermission(mapId, userId);
    if (!canWrite) {
      res.status(403).json({ error: "Unauthorized: You do not have permission to modify this map" });
      return;
    }

    const annotation = await annotationService.createAnnotation(
      mapId,
      userId,
      req.body
    );
    res.status(201).json(annotation);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create annotation" });
  }
}

export async function updateAnnotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const mapId = req.params.mapId as string;
    const userId = req.user!.id;

    const canWrite = await verifyMapWritePermission(mapId, userId);
    if (!canWrite) {
      res.status(403).json({ error: "Unauthorized: You do not have permission to modify this map" });
      return;
    }

    const updated = await annotationService.updateAnnotation(
      mapId,
      req.params.annotationId as string,
      userId,
      req.body
    );
    if (!updated) {
      res.status(404).json({ error: "Annotation not found" });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to update annotation" });
  }
}

export async function deleteAnnotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const mapId = req.params.mapId as string;
    const userId = req.user!.id;

    const canWrite = await verifyMapWritePermission(mapId, userId);
    if (!canWrite) {
      res.status(403).json({ error: "Unauthorized: You do not have permission to modify this map" });
      return;
    }

    const success = await annotationService.deleteAnnotation(
      mapId,
      req.params.annotationId as string
    );
    if (!success) {
      res.status(404).json({ error: "Annotation not found" });
      return;
    }
    res.json({ success: true, message: "Annotation deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete annotation" });
  }
}

export async function batchAnnotations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const mapId = req.params.mapId as string;
    const userId = req.user!.id;

    const canWrite = await verifyMapWritePermission(mapId, userId);
    if (!canWrite) {
      res.status(403).json({ error: "Unauthorized: You do not have permission to modify this map" });
      return;
    }

    const result = await annotationService.batchOperations(
      mapId,
      userId,
      req.body
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Batch operation failed" });
  }
}
