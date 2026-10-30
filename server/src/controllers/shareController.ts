import { Request, Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as shareService from "../services/shareService.js";

export async function createShareLink(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { permission, allowCopy, expiresInDays } = req.body;
    const share = await shareService.createShare(
      req.params.mapId as string,
      userId,
      permission,
      allowCopy,
      expiresInDays
    );
    res.status(201).json(share);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create share link" });
  }
}

export async function getMapShares(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const shares = await shareService.getSharesForMap(req.params.mapId as string, userId);
    res.json(shares);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch share links" });
  }
}

export async function getSharedMap(req: Request, res: Response): Promise<void> {
  try {
    const result = await shareService.getMapByShareToken(req.params.token as string);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message || "Shared map not found" });
  }
}

export async function importSharedMap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { newMapName } = req.body;
    const copiedMap = await shareService.importSharedMapAsCopy(
      req.params.token as string,
      userId,
      newMapName
    );
    res.status(201).json(copiedMap);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to import copy of shared map" });
  }
}

export async function revokeShare(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const success = await shareService.revokeShare(req.params.shareId as string, userId);
    if (!success) {
      res.status(404).json({ error: "Share not found or unauthorized" });
      return;
    }
    res.json({ success: true, message: "Share revoked" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to revoke share" });
  }
}
