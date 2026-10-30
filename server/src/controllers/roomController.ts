import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as roomService from "../services/roomService.js";

export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const userName = req.user!.name;
    const { name, activeMapId } = req.body;

    const room = await roomService.createRoom(userId, userName, name, activeMapId);
    res.status(201).json(room);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create room" });
  }
}

export async function joinRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const userName = req.user!.name;
    const { code } = req.body;

    const room = await roomService.joinRoomByCode(code, userId, userName);
    res.json(room);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to join room" });
  }
}

export async function getRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const room = await roomService.getRoomById(req.params.roomId as string);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch room" });
  }
}

export async function getRoomSnapshot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const snapshot = await roomService.getRoomSnapshot(req.params.roomId as string);
    res.json(snapshot);
  } catch (error: any) {
    res.status(404).json({ error: error.message || "Failed to fetch room snapshot" });
  }
}

export async function getRoomOperations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sinceSeq = parseInt(req.query.since as string, 10) || 0;
    const operations = await roomService.getRoomOperationsSince(req.params.roomId as string, sinceSeq);
    res.json(operations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch operations" });
  }
}
