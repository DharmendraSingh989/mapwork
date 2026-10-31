import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("Production Health & CORS Suite", () => {
  const app = createApp();

  it("responds with 200 OK on root /health for Render health checks", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("mapforge-api");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("responds with 200 OK on /api/v1/health endpoint", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("responds on /ready with database state", async () => {
    const res = await request(app).get("/ready");
    expect([200, 503]).toContain(res.status);
    expect(res.body.timestamp).toBeDefined();
  });

  it("sets CORS header for Vercel production frontend origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://mapforge.vercel.app");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://mapforge.vercel.app");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("sets CORS header for Vercel preview deployment origins", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://mapforge-git-main-user.vercel.app");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://mapforge-git-main-user.vercel.app");
  });

  it("sets CORS header for local development origins", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
