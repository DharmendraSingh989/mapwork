import type { Request } from "express";
import mongoose from "mongoose";

export interface AuthenticatedUser {
  id: string;
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}
