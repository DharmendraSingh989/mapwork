import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as mapService from "../services/mapService.js";

export async function listMaps(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search, tag, sort, order } = req.query;

    const maps = await mapService.getMapsForUser(userId, {
      search: search ? String(search) : undefined,
      tag: tag ? String(tag) : undefined,
      sort: sort === "createdAt" ? "createdAt" : "updatedAt",
      order: order === "asc" ? "asc" : "desc"
    });

    res.json(maps);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to list maps" });
  }
}

export async function createMap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const map = await mapService.createMap(userId, req.body);
    res.status(201).json(map);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create map" });
  }
}

export async function getMap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const map = await mapService.getMapById(req.params.mapId as string, req.user?.id);
    if (!map) {
      res.status(404).json({ error: "Map not found" });
      return;
    }
    res.json(map);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve map" });
  }
}

export async function updateMap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const updated = await mapService.updateMap(req.params.mapId as string, userId, req.body);
    if (!updated) {
      res.status(404).json({ error: "Map not found or unauthorized to update" });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to update map" });
  }
}

export async function deleteMap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const success = await mapService.deleteMap(req.params.mapId as string, userId);
    if (!success) {
      res.status(404).json({ error: "Map not found or unauthorized" });
      return;
    }
    res.json({ success: true, message: "Map deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete map" });
  }
}

export async function duplicateMap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const duplicated = await mapService.duplicateMap(req.params.mapId as string, userId);
    res.status(201).json(duplicated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to duplicate map" });
  }
}
