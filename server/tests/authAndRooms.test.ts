import { describe, it, expect } from "vitest";
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from "../src/utils/token.js";
import { RegisterSchema, LoginSchema, RoomJoinSchema } from "@mapforge/shared";

describe("Authentication & Room Validation Suite", () => {
  it("generates and verifies valid JWT access tokens", () => {
    const payload = { userId: "user_12345", email: "cartographer@mapforge.dev" };
    const token = generateAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
  });

  it("rejects tampered or malformed tokens", () => {
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature";
    const decoded = verifyAccessToken(invalidToken);
    expect(decoded).toBeNull();
  });

  it("validates registration schema requirements", () => {
    const valid = { name: "Deepak Sharma", email: "deepak@example.com", password: "Password123!" };
    expect(RegisterSchema.safeParse(valid).success).toBe(true);

    const shortPassword = { name: "Deepak", email: "deepak@example.com", password: "123" };
    expect(RegisterSchema.safeParse(shortPassword).success).toBe(false);

    const invalidEmail = { name: "Deepak", email: "not-an-email", password: "Password123!" };
    expect(RegisterSchema.safeParse(invalidEmail).success).toBe(false);
  });

  it("validates room join codes: exactly 6 alphanumeric characters", () => {
    expect(RoomJoinSchema.safeParse({ code: "M7F9K2" }).success).toBe(true);
    expect(RoomJoinSchema.safeParse({ code: "m7f9k2" }).success).toBe(true); // transforms to uppercase
    expect(RoomJoinSchema.safeParse({ code: "1234" }).success).toBe(false);
    expect(RoomJoinSchema.safeParse({ code: "TOOLONG123" }).success).toBe(false);
  });
});
