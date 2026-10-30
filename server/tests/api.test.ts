import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";

let app: any;
let authToken: string;
let userId: string;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await disconnectDB();
});

describe("MapForge Backend API End-to-End Suite", () => {
  // 1. Health & Readiness
  describe("Health & Readiness Checks", () => {
    it("GET /api/v1/health returns ok", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("mapforge-api");
    });

    it("GET /api/v1/ready verifies database connectivity", async () => {
      const res = await request(app).get("/api/v1/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.database).toBe("connected");
    });
  });

  // 2. Authentication
  describe("Authentication Flow", () => {
    const testUser = {
      name: "Test Cartographer",
      email: `carto_${Date.now()}@mapforge.dev`,
      password: "SuperSecretPassword123!"
    };

    it("POST /api/v1/auth/register creates user and returns JWT token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.accessToken).toBeDefined();

      authToken = res.body.accessToken;
      userId = res.body.user.id;
    });

    it("POST /api/v1/auth/login logs in with valid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it("GET /api/v1/auth/me returns current user profile", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
    });

    it("rejects unauthorized access without token", async () => {
      const res = await request(app).get("/api/v1/maps");
      expect(res.status).toBe(401);
    });
  });

  // 3. Map CRUD & Geographic Annotations
  describe("Maps & Annotation CRUD", () => {
    let mapAId: string;
    let mapBId: string;
    let annotationId: string;

    it("creates Map A (Bhopal Petrol Pumps)", async () => {
      const res = await request(app)
        .post("/api/v1/maps")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Bhopal Petrol Pumps",
          description: "Fuel stations survey map",
          tags: ["fuel", "bhopal"]
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Bhopal Petrol Pumps");
      mapAId = res.body.id;
    });

    it("creates Map B (Clothing Stores)", async () => {
      const res = await request(app)
        .post("/api/v1/maps")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Clothing Stores",
          description: "Textile market survey",
          tags: ["clothing", "bhopal"]
        });

      expect(res.status).toBe(201);
      mapBId = res.body.id;
    });

    it("adds an Emoji Marker to Map A with exact geographic coordinates", async () => {
      annotationId = "petrol_marker_1";
      const res = await request(app)
        .post(`/api/v1/maps/${mapAId}/annotations`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          id: annotationId,
          type: "marker",
          geometry: {
            type: "Point",
            coordinates: [77.4126, 23.2599] // [lng, lat]
          },
          properties: {
            emoji: "⛽",
            label: "Bharat Petroleum",
            category: "fuel",
            color: "#EF4444"
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(annotationId);
      expect(res.body.geometry.coordinates).toEqual([77.4126, 23.2599]);
      expect(res.body.properties.emoji).toBe("⛽");
    });

    it("adds a clothing store marker to Map B", async () => {
      const res = await request(app)
        .post(`/api/v1/maps/${mapBId}/annotations`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          id: "cloth_marker_1",
          type: "marker",
          geometry: {
            type: "Point",
            coordinates: [77.4190, 23.2540]
          },
          properties: {
            emoji: "👗",
            label: "Fashion House",
            category: "clothing",
            color: "#3B82F6"
          }
        });

      expect(res.status).toBe(201);
    });

    it("updates annotation properties", async () => {
      const res = await request(app)
        .patch(`/api/v1/maps/${mapAId}/annotations/${annotationId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          properties: {
            label: "Bharat Petroleum (24x7)"
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.properties.label).toBe("Bharat Petroleum (24x7)");
    });

    // 4. Map Merging
    describe("Map Merge Core Workflow", () => {
      let mergedMapId: string;

      it("merges Map A and Map B into a new independent map", async () => {
        const res = await request(app)
          .post("/api/v1/maps/merge")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            sourceMapIds: [mapAId, mapBId],
            destinationName: "Bhopal Combined Fuel & Fashion Map",
            destinationDescription: "Combined survey map"
          });

        expect(res.status).toBe(201);
        expect(res.body.importedAnnotationCount).toBe(2);
        expect(res.body.destinationMap.name).toBe("Bhopal Combined Fuel & Fashion Map");
        expect(res.body.bounds).toBeDefined();

        mergedMapId = res.body.destinationMap.id;
      });

      it("verifies merged map contains both annotations with 100% exact geographic coordinates", async () => {
        const res = await request(app)
          .get(`/api/v1/maps/${mergedMapId}/annotations`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);

        // Find the fuel marker and clothing marker
        const fuelAnn = res.body.find((a: any) => a.properties.category === "fuel");
        const clothAnn = res.body.find((a: any) => a.properties.category === "clothing");

        expect(fuelAnn).toBeDefined();
        expect(clothAnn).toBeDefined();

        // Exact geographic coordinate preservation!
        expect(fuelAnn.geometry.coordinates).toEqual([77.4126, 23.2599]);
        expect(clothAnn.geometry.coordinates).toEqual([77.4190, 23.2540]);

        // Verifies new unique IDs were generated
        expect(fuelAnn.id).not.toBe(annotationId);
      });

      it("verifies source maps remained unchanged after merge", async () => {
        const resA = await request(app)
          .get(`/api/v1/maps/${mapAId}/annotations`)
          .set("Authorization", `Bearer ${authToken}`);
        expect(resA.body.length).toBe(1);

        const resB = await request(app)
          .get(`/api/v1/maps/${mapBId}/annotations`)
          .set("Authorization", `Bearer ${authToken}`);
        expect(resB.body.length).toBe(1);
      });
    });

    // 5. Sharing & Independent Copies
    describe("Sharing & Independent Copies", () => {
      let shareToken: string;

      it("generates a shareable link token", async () => {
        const res = await request(app)
          .post(`/api/v1/maps/${mapAId}/shares`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            permission: "view",
            allowCopy: true
          });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        shareToken = res.body.token;
      });

      it("fetches shared map publicly via token", async () => {
        const res = await request(app).get(`/api/v1/shares/${shareToken}`);
        expect(res.status).toBe(200);
        expect(res.body.map.name).toBe("Bhopal Petrol Pumps");
      });

      it("imports independent copy of shared map into recipient account", async () => {
        const res = await request(app)
          .post(`/api/v1/shares/${shareToken}/import`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({ newMapName: "My Independent Copy" });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("My Independent Copy");

        // Verify independent copy has the annotations
        const annRes = await request(app)
          .get(`/api/v1/maps/${res.body.id}/annotations`)
          .set("Authorization", `Bearer ${authToken}`);
        expect(annRes.body.length).toBe(1);
        expect(annRes.body[0].geometry.coordinates).toEqual([77.4126, 23.2599]);
      });
    });

    // 6. Collaborative Rooms
    describe("Collaborative Rooms", () => {
      let roomCode: string;
      let roomId: string;

      it("creates a collaborative room with unique 6-character code", async () => {
        const res = await request(app)
          .post("/api/v1/rooms")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: "Live Bhopal Planning Session",
            activeMapId: mapAId
          });

        expect(res.status).toBe(201);
        expect(res.body.code).toBeDefined();
        expect(res.body.code.length).toBe(6);
        roomCode = res.body.code;
        roomId = res.body.id;
      });

      it("joins collaborative room using code", async () => {
        const res = await request(app)
          .post("/api/v1/rooms/join")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ code: roomCode });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(roomId);
      });

      it("retrieves room snapshot with map and annotations", async () => {
        const res = await request(app)
          .get(`/api/v1/rooms/${roomId}/snapshot`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.room).toBeDefined();
        expect(res.body.map).toBeDefined();
        expect(res.body.annotations).toBeDefined();
      });
    });
  });
});
