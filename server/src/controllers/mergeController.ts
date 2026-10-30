import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { mergeMaps } from "../services/mergeService.js";

export async function handleMergeMaps(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const userName = req.user!.name;
    const { sourceMapIds, destinationName, destinationDescription, tags } = req.body;

    const result = await mergeMaps(
      userId,
      userName,
      sourceMapIds,
      destinationName,
      destinationDescription,
      tags
    );

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to merge maps" });
  }
}
