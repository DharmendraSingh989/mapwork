import bcrypt from "bcryptjs";
import { User, IUser } from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { AuthResponse, UserProfile } from "@mapforge/shared";

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash
  });

  const tokenPayload = { userId: newUser._id.toString(), email: newUser.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user: toUserProfile(newUser),
    accessToken,
    refreshToken
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const tokenPayload = { userId: user._id.toString(), email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user: toUserProfile(user),
    accessToken,
    refreshToken
  };
}

export function toUserProfile(user: IUser): UserProfile {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString()
  };
}
