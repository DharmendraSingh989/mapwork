import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/index.js";
import { verifyAccessToken } from "../utils/token.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }

  try {
    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id as mongoose.Types.ObjectId,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication error" });
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);
  if (payload) {
    try {
      const user = await User.findById(payload.userId).select("-passwordHash");
      if (user) {
        req.user = {
          id: user._id.toString(),
          _id: user._id as mongoose.Types.ObjectId,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    } catch {
      // ignore optional auth errors
    }
  }
  next();
}
