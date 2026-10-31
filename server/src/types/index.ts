import type { Request } from "express";
import mongoose from "mongoose";

export interface AuthenticatedUser {
  id: string;
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthRequest extends Request {
}
