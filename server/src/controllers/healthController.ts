import { Request, Response } from "express";
import { isDbConnected, isInMemoryPersistence } from "../config/db.js";

export function getHealth(req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    service: "mapforge-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

export function getReadiness(req: Request, res: Response): void {
  const dbOk = isDbConnected();

  if (!dbOk) {
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(200).json({
    status: "ready",
    database: "connected",
    persistenceMode: isInMemoryPersistence() ? "in-memory" : "mongodb-atlas",
    timestamp: new Date().toISOString()
  });
}
