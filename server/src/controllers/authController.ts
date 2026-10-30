import { Request, Response } from "express";
import { AuthRequest } from "../types/index.js";
import { registerUser, loginUser, toUserProfile } from "../services/authService.js";
import { User } from "../models/User.js";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;
    const authData = await registerUser(name, email, password);
    res.status(201).json(authData);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Registration failed" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const authData = await loginUser(email, password);
    res.status(200).json(authData);
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Login failed" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.status(200).json({ success: true, message: "Logged out successfully" });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(toUserProfile(user));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
}
