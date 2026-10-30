import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { createApp } from "../src/app.js";
import { connectDB, disconnectDB, isInMemoryPersistence } from "../src/config/db.js";
import { setupSocketHandlers } from "../src/sockets/socketHandler.js";
import { SOCKET_EVENTS } from "@mapforge/shared";

describe("MapForge Complete Audit & Runtime Verification Suite", () => {
  let app: any;
  let server: http.Server;
  let serverPort: number;

  // Authenticated Users
  let userA: { id: string; name: string; email: string; token: string };
  let userB: { id: string; name: string; email: string; token: string };
  let userC: { id: string; name: string; email: string; token: string };

  // Sockets for Real-time Testing
  let socketA: ClientSocketType;
  let socketB: ClientSocketType;

  beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Start HTTP and Socket.IO server on a random port for end-to-end socket testing
    server = http.createServer(app);
    const io = new SocketIOServer(server, { cors: { origin: "*" } });
    setupSocketHandlers(io);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    // Register User A (Alice - Primary Cartographer)
    const resA = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Alice Cartographer",
        email: `alice_${Date.now()}@mapforge.dev`,
        password: "AliceSecurePassword123!"
      });
    userA = {
      id: resA.body.user.id,
      name: resA.body.user.name,
      email: resA.body.user.email,
      token: resA.body.accessToken
    };

    // Register User B (Bob - Collaborative Editor)
    const resB = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Bob Surveyor",
        email: `bob_${Date.now()}@mapforge.dev`,
        password: "BobSecurePassword123!"
      });
    userB = {
      id: resB.body.user.id,
      name: resB.body.user.name,
      email: resB.body.user.email,
      token: resB.body.accessToken
    };

    // Register User C (Charlie - Unauthorized External User)
    const resC = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Charlie Outsider",
        email: `charlie_${Date.now()}@mapforge.dev`,
        password: "CharliePassword123!"
      });
    userC = {
      id: resC.body.user.id,
      name: resC.body.user.name,
      email: resC.body.user.email,
      token: resC.body.accessToken
    };
  }, 30000);

  afterAll(async () => {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  });

  // =========================================================================
  // 1. Persistence Verification
  // =========================================================================
  describe("1. MongoDB Persistence Distinction", () => {
    it("reports ready state and distinguishes real MongoDB Atlas from in-memory fallback", async () => {
      const res = await request(app).get("/api/v1/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.database).toBe("connected");
      expect(res.body.persistenceMode).toBeDefined();

      if (isInMemoryPersistence()) {
        expect(res.body.persistenceMode).toBe("in-memory");
      } else {
        expect(res.body.persistenceMode).toBe("mongodb-atlas");
      }
    });
  });

  // =========================================================================
  // 2. Marker Creation, Editing, Deletion, Auto-Save & Geocoordinate Preservation
  // =========================================================================
  describe("2. Marker CRUD, Auto-Save Batch Upsert & Coordinate Preservation", () => {
    let mapId: string;
    const initialCoords: [number, number] = [77.412615, 23.259933];
    const movedCoords: [number, number] = [77.415000, 23.262000];
    const markerId = `marker_${Date.now()}`;

    it("creates a map and adds an emoji marker with high-precision coordinates", async () => {
      const mapRes = await request(app)
        .post("/api/v1/maps")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          name: "High Precision Survey Map",
          description: "Testing exact coordinates and auto-save"
        });
      expect(mapRes.status).toBe(201);
      mapId = mapRes.body.id;

      const annRes = await request(app)
        .post(`/api/v1/maps/${mapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          id: markerId,
          type: "marker",
          geometry: {
            type: "Point",
            coordinates: initialCoords
          },
          properties: {
            emoji: "📍",
            label: "Survey Point Alpha",
            category: "general",
            color: "#3B82F6"
          }
        });
      expect(annRes.status).toBe(201);
      expect(annRes.body.geometry.coordinates).toEqual(initialCoords);
    });

    it("edits marker properties and moves geographic coordinates (simulating drag and auto-save)", async () => {
      // Auto-save batch endpoint call with updated coordinates and updated label
      const batchRes = await request(app)
        .post(`/api/v1/maps/${mapId}/annotations/batch`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          create: [
            {
              id: markerId,
              type: "marker",
              geometry: {
                type: "Point",
                coordinates: movedCoords
              },
              properties: {
                emoji: "📍",
                label: "Survey Point Alpha (Relocated)",
                category: "commercial",
                color: "#10B981"
              }
            }
          ]
        });

      expect(batchRes.status).toBe(200);
      expect(batchRes.body.success).toBe(true);

      // Verify that reloading the map from DB retrieves the exact updated coordinates and properties
      const reloadRes = await request(app)
        .get(`/api/v1/maps/${mapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(reloadRes.status).toBe(200);
      expect(reloadRes.body.length).toBe(1);
      expect(reloadRes.body[0].geometry.coordinates).toEqual(movedCoords);
      expect(reloadRes.body[0].properties.label).toBe("Survey Point Alpha (Relocated)");
      expect(reloadRes.body[0].properties.category).toBe("commercial");
      expect(reloadRes.body[0].properties.color).toBe("#10B981");
    });

    it("deletes marker via auto-save deletion queue and verifies removal from database", async () => {
      const deleteBatchRes = await request(app)
        .post(`/api/v1/maps/${mapId}/annotations/batch`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          create: [],
          delete: [markerId]
        });

      expect(deleteBatchRes.status).toBe(200);
      expect(deleteBatchRes.body.deleted).toBe(1);

      // Verify page reload yields 0 annotations
      const reloadRes = await request(app)
        .get(`/api/v1/maps/${mapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(reloadRes.status).toBe(200);
      expect(reloadRes.body.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. Freehand Drawings, Lines, Polygons & Eraser Persistence
  // =========================================================================
  describe("3. Freehand, Lines, Polygons & Geometry Persistence", () => {
    let mapId: string;
    const strokeId = `stroke_${Date.now()}`;
    const lineId = `line_${Date.now()}`;
    const polyId = `poly_${Date.now()}`;

    const strokeCoords: [number, number][] = [
      [77.410, 23.250],
      [77.411, 23.251],
      [77.412, 23.252],
      [77.413, 23.253]
    ];

    const lineCoords: [number, number][] = [
      [77.420, 23.260],
      [77.430, 23.270]
    ];

    const polygonCoords: [number, number][][] = [
      [
        [77.400, 23.240],
        [77.405, 23.240],
        [77.405, 23.245],
        [77.400, 23.245],
        [77.400, 23.240] // Closed ring
      ]
    ];

    it("persists freehand brush strokes, 2-point lines, and closed polygons", async () => {
      const mapRes = await request(app)
        .post("/api/v1/maps")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Vector Geometries Map" });
      mapId = mapRes.body.id;

      const batchRes = await request(app)
        .post(`/api/v1/maps/${mapId}/annotations/batch`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          create: [
            {
              id: strokeId,
              type: "freehand",
              geometry: { type: "LineString", coordinates: strokeCoords },
              properties: { color: "#EF4444", strokeWidth: 4 }
            },
            {
              id: lineId,
              type: "line",
              geometry: { type: "LineString", coordinates: lineCoords },
              properties: { color: "#3B82F6", strokeWidth: 3 }
            },
            {
              id: polyId,
              type: "polygon",
              geometry: { type: "Polygon", coordinates: polygonCoords },
              properties: { color: "#10B981", fillColor: "#10B98133", strokeWidth: 2 }
            }
          ]
        });

      expect(batchRes.status).toBe(200);

      // Verify all 3 vector geometries preserved in database with exact coordinates
      const reloadRes = await request(app)
        .get(`/api/v1/maps/${mapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(reloadRes.status).toBe(200);
      expect(reloadRes.body.length).toBe(3);

      const savedStroke = reloadRes.body.find((a: any) => a.id === strokeId);
      const savedLine = reloadRes.body.find((a: any) => a.id === lineId);
      const savedPoly = reloadRes.body.find((a: any) => a.id === polyId);

      expect(savedStroke.geometry.coordinates).toEqual(strokeCoords);
      expect(savedLine.geometry.coordinates).toEqual(lineCoords);
      expect(savedPoly.geometry.coordinates).toEqual(polygonCoords);
    });

    it("simulates eraser tool deleting the polygon while leaving stroke and line intact", async () => {
      const delRes = await request(app)
        .delete(`/api/v1/maps/${mapId}/annotations/${polyId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(delRes.status).toBe(200);

      const reloadRes = await request(app)
        .get(`/api/v1/maps/${mapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(reloadRes.body.length).toBe(2);
      expect(reloadRes.body.some((a: any) => a.id === polyId)).toBe(false);
      expect(reloadRes.body.some((a: any) => a.id === strokeId)).toBe(true);
      expect(reloadRes.body.some((a: any) => a.id === lineId)).toBe(true);
    });
  });

  // =========================================================================
  // 4. Three Distinct Maps, Distinct Annotations, Merge & Invariant Verification
  // =========================================================================
  describe("4. Three-Map Creation, Merging & Invariance Verification", () => {
    let map1Id: string;
    let map2Id: string;
    let map3Id: string;
    let mergedMapId: string;

    const m1Coords: [number, number] = [77.410, 23.250];
    const m2Coords: [number, number][] = [[77.420, 23.260], [77.425, 23.265]];
    const m3Coords: [number, number][][] = [
      [[77.430, 23.270], [77.435, 23.270], [77.435, 23.275], [77.430, 23.275], [77.430, 23.270]]
    ];

    it("creates 3 distinct maps with distinct geometries (Point, LineString, Polygon)", async () => {
      // Map 1: Fuel Stations (Point marker)
      const r1 = await request(app).post("/api/v1/maps").set("Authorization", `Bearer ${userA.token}`).send({
        name: "Survey Map 1: Fuel Infrastructure",
        tags: ["fuel", "audit"]
      });
      map1Id = r1.body.id;
      await request(app).post(`/api/v1/maps/${map1Id}/annotations`).set("Authorization", `Bearer ${userA.token}`).send({
        id: `ann_fuel_${Date.now()}`,
        type: "marker",
        geometry: { type: "Point", coordinates: m1Coords },
        properties: { emoji: "⛽", label: "HP Petrol Pump", category: "fuel" }
      });

      // Map 2: Textile Route (LineString)
      const r2 = await request(app).post("/api/v1/maps").set("Authorization", `Bearer ${userA.token}`).send({
        name: "Survey Map 2: Textile Corridor",
        tags: ["clothing", "audit"]
      });
      map2Id = r2.body.id;
      await request(app).post(`/api/v1/maps/${map2Id}/annotations`).set("Authorization", `Bearer ${userA.token}`).send({
        id: `ann_line_${Date.now()}`,
        type: "line",
        geometry: { type: "LineString", coordinates: m2Coords },
        properties: { label: "Cloth Market Transit", category: "clothing", strokeWidth: 4 }
      });

      // Map 3: Commercial Zone (Polygon)
      const r3 = await request(app).post("/api/v1/maps").set("Authorization", `Bearer ${userA.token}`).send({
        name: "Survey Map 3: Commercial Zone",
        tags: ["commercial", "audit"]
      });
      map3Id = r3.body.id;
      await request(app).post(`/api/v1/maps/${map3Id}/annotations`).set("Authorization", `Bearer ${userA.token}`).send({
        id: `ann_poly_${Date.now()}`,
        type: "polygon",
        geometry: { type: "Polygon", coordinates: m3Coords },
        properties: { label: "Central Market Boundary", category: "commercial", fillColor: "#3B82F633" }
      });
    });

    it("merges all 3 maps into a destination map and preserves 100% geometries, styles, and coordinates", async () => {
      const mergeRes = await request(app)
        .post("/api/v1/maps/merge")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          sourceMapIds: [map1Id, map2Id, map3Id],
          destinationName: "Unified Master Infrastructure Map",
          destinationDescription: "Combined survey of fuel, textiles, and commercial zones",
          tags: ["master-survey"]
        });

      expect(mergeRes.status).toBe(201);
      expect(mergeRes.body.importedAnnotationCount).toBe(3);
      mergedMapId = mergeRes.body.destinationMap.id;

      // Verify all 3 annotations in the merged map
      const mergedAnnsRes = await request(app)
        .get(`/api/v1/maps/${mergedMapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(mergedAnnsRes.status).toBe(200);
      expect(mergedAnnsRes.body.length).toBe(3);

      const fuelItem = mergedAnnsRes.body.find((a: any) => a.properties.category === "fuel");
      const clothItem = mergedAnnsRes.body.find((a: any) => a.properties.category === "clothing");
      const commItem = mergedAnnsRes.body.find((a: any) => a.properties.category === "commercial");

      expect(fuelItem).toBeDefined();
      expect(clothItem).toBeDefined();
      expect(commItem).toBeDefined();

      // Coordinates preserved identically
      expect(fuelItem.geometry.coordinates).toEqual(m1Coords);
      expect(clothItem.geometry.coordinates).toEqual(m2Coords);
      expect(commItem.geometry.coordinates).toEqual(m3Coords);

      // Styles and properties preserved
      expect(fuelItem.properties.emoji).toBe("⛽");
      expect(clothItem.properties.strokeWidth).toBe(4);
      expect(commItem.properties.fillColor).toBe("#3B82F633");
    });

    it("proves that source maps Map 1, Map 2, and Map 3 remain completely unchanged", async () => {
      const s1 = await request(app).get(`/api/v1/maps/${map1Id}/annotations`).set("Authorization", `Bearer ${userA.token}`);
      const s2 = await request(app).get(`/api/v1/maps/${map2Id}/annotations`).set("Authorization", `Bearer ${userA.token}`);
      const s3 = await request(app).get(`/api/v1/maps/${map3Id}/annotations`).set("Authorization", `Bearer ${userA.token}`);

      expect(s1.body.length).toBe(1);
      expect(s2.body.length).toBe(1);
      expect(s3.body.length).toBe(1);
      expect(s1.body[0].geometry.coordinates).toEqual(m1Coords);
      expect(s2.body[0].geometry.coordinates).toEqual(m2Coords);
      expect(s3.body[0].geometry.coordinates).toEqual(m3Coords);
    });
  });

  // =========================================================================
  // 5. Sharing, Independent Copy, Revocation & Unauthorized Write Rejection
  // =========================================================================
  describe("5. Sharing, Import Copy, Revocation & Unauthorized Write Rejection", () => {
    let sourceMapId: string;
    let shareToken: string;
    let shareId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/v1/maps")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Shareable Map" });
      sourceMapId = res.body.id;

      await request(app)
        .post(`/api/v1/maps/${sourceMapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          id: `ann_share_${Date.now()}`,
          type: "marker",
          geometry: { type: "Point", coordinates: [77.4126, 23.2599] },
          properties: { label: "Shared Landmark", emoji: "🏛️" }
        });
    });

    it("creates a share link allowing copies", async () => {
      const res = await request(app)
        .post(`/api/v1/maps/${sourceMapId}/shares`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ permission: "view", allowCopy: true });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      shareToken = res.body.token;
      shareId = res.body.id;
    });

    it("allows public access via share token including map and annotations without 401 error", async () => {
      const res = await request(app).get(`/api/v1/shares/${shareToken}`);
      expect(res.status).toBe(200);
      expect(res.body.map.name).toBe("Shareable Map");
      expect(res.body.share.permission).toBe("view");
      expect(res.body.annotations).toBeDefined();
      expect(res.body.annotations.length).toBe(1);
      expect(res.body.annotations[0].properties.label).toBe("Shared Landmark");
    });

    it("allows recipient (User B) to import an independent copy", async () => {
      const res = await request(app)
        .post(`/api/v1/shares/${shareToken}/import`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ newMapName: "Bob's Independent Copy" });

      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(userB.id);
      expect(res.body.name).toBe("Bob's Independent Copy");

      // Verify annotations exist in Bob's copy
      const bobAnns = await request(app)
        .get(`/api/v1/maps/${res.body.id}/annotations`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(bobAnns.status).toBe(200);
      expect(bobAnns.body.length).toBe(1);
    });

    it("rejects unauthorized write attempts by User C on User A's map with 403 Forbidden", async () => {
      const unauthorizedWrite = await request(app)
        .post(`/api/v1/maps/${sourceMapId}/annotations`)
        .set("Authorization", `Bearer ${userC.token}`)
        .send({
          id: `hacked_${Date.now()}`,
          type: "marker",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { label: "Malicious Marker" }
        });

      expect(unauthorizedWrite.status).toBe(403);
      expect(unauthorizedWrite.body.error).toMatch(/Unauthorized/i);
    });

    it("revokes share link and rejects further share token access", async () => {
      const revokeRes = await request(app)
        .delete(`/api/v1/shares/${shareId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(revokeRes.status).toBe(200);

      const accessAfterRevoke = await request(app).get(`/api/v1/shares/${shareToken}`);
      expect(accessAfterRevoke.status).toBe(404);
    });
  });

  // =========================================================================
  // 6. Collaborative Rooms: Live Updates, Monotonic Ops, Idempotency & Cursors
  // =========================================================================
  describe("6. Real-Time Collaborative Rooms & Socket.IO Verification", () => {
    let colMapId: string;
    let roomCode: string;
    let roomId: string;

    beforeAll(async () => {
      const mapRes = await request(app)
        .post("/api/v1/maps")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Realtime Collab Room Map" });
      colMapId = mapRes.body.id;

      const roomRes = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Team Strategy Room", activeMapId: colMapId });
      roomCode = roomRes.body.code;
      roomId = roomRes.body.id;

      // User B joins room via API
      await request(app)
        .post("/api/v1/rooms/join")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ code: roomCode });
    });

    it("establishes authenticated socket connections for User A and User B", async () => {
      socketA = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: userA.token },
        transports: ["websocket"]
      });

      socketB = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: userB.token },
        transports: ["websocket"]
      });

      await Promise.all([
        new Promise<void>((resolve) => socketA.on("connect", () => resolve())),
        new Promise<void>((resolve) => socketB.on("connect", () => resolve()))
      ]);

      expect(socketA.connected).toBe(true);
      expect(socketB.connected).toBe(true);
    });

    it("joins collaborative room and retrieves snapshot with initial map state", async () => {
      const joinPromiseA = new Promise<any>((resolve) => {
        socketA.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId }, (res: any) => resolve(res));
      });
      const joinPromiseB = new Promise<any>((resolve) => {
        socketB.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId }, (res: any) => resolve(res));
      });

      const [resA, resB] = await Promise.all([joinPromiseA, joinPromiseB]);
      expect(resA.success).toBe(true);
      expect(resA.room.code).toBe(roomCode);
      expect(resB.success).toBe(true);
    });

    it("broadcasts live cursor movements between room members", async () => {
      const cursorReceivedPromise = new Promise<any>((resolve) => {
        socketB.on(SOCKET_EVENTS.CURSOR_MOVE, (data) => resolve(data));
      });

      socketA.emit(SOCKET_EVENTS.CURSOR_MOVE, { lng: 77.4126, lat: 23.2599 });
      const cursorData = await cursorReceivedPromise;

      expect(cursorData.userId).toBe(userA.id);
      expect(cursorData.name).toBe(userA.name);
      expect(cursorData.coords).toEqual([77.4126, 23.2599]);
    });

    it("submits authoritative annotation operation, persists to MongoDB, and broadcasts to peer", async () => {
      const opId = `op_${Date.now()}`;
      const annId = `collab_ann_${Date.now()}`;

      const peerBroadcastPromise = new Promise<any>((resolve) => {
        socketB.on(SOCKET_EVENTS.OPERATION_BROADCAST, (op) => resolve(op));
      });

      const ackPromise = new Promise<any>((resolve) => {
        socketA.emit(
          SOCKET_EVENTS.OPERATION_SUBMIT,
          {
            id: opId,
            type: "create",
            payload: {
              id: annId,
              type: "marker",
              geometry: { type: "Point", coordinates: [77.420, 23.260] },
              properties: { emoji: "🚀", label: "Collab Milestone" }
            }
          },
          (ack: any) => resolve(ack)
        );
      });

      const [ack, broadcast] = await Promise.all([ackPromise, peerBroadcastPromise]);

      expect(ack.success).toBe(true);
      expect(ack.seq).toBeGreaterThan(0);
      expect(broadcast.id).toBe(opId);
      expect(broadcast.actorId).toBe(userA.id);

      // Verify that database is authoritative source of truth
      const dbCheck = await request(app)
        .get(`/api/v1/maps/${colMapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(dbCheck.status).toBe(200);
      const milestone = dbCheck.body.find((a: any) => a.id === annId);
      expect(milestone).toBeDefined();
      expect(milestone.properties.label).toBe("Collab Milestone");
    });

    it("handles duplicate operation idempotently without failing or duplicating data", async () => {
      const duplicateOpId = `op_idempotent_${Date.now()}`;
      const annId = `ann_idem_${Date.now()}`;

      // First submission
      const firstAck = await new Promise<any>((resolve) => {
        socketA.emit(
          SOCKET_EVENTS.OPERATION_SUBMIT,
          {
            id: duplicateOpId,
            type: "create",
            payload: {
              id: annId,
              type: "dot",
              geometry: { type: "Point", coordinates: [77.45, 23.25] },
              properties: { color: "#EF4444" }
            }
          },
          resolve
        );
      });

      expect(firstAck.success).toBe(true);
      const firstSeq = firstAck.seq;

      // Duplicate submission of exact same operation ID
      const secondAck = await new Promise<any>((resolve) => {
        socketA.emit(
          SOCKET_EVENTS.OPERATION_SUBMIT,
          {
            id: duplicateOpId,
            type: "create",
            payload: {
              id: annId,
              type: "dot",
              geometry: { type: "Point", coordinates: [77.45, 23.25] },
              properties: { color: "#EF4444" }
            }
          },
          resolve
        );
      });

      expect(secondAck.success).toBe(true);
      expect(secondAck.seq).toBe(firstSeq);
      expect(secondAck.duplicate).toBe(true);

      // Check DB does not have duplicates
      const dbCheck = await request(app)
        .get(`/api/v1/maps/${colMapId}/annotations`)
        .set("Authorization", `Bearer ${userA.token}`);

      const matchingAnns = dbCheck.body.filter((a: any) => a.id === annId);
      expect(matchingAnns.length).toBe(1);
    });

    it("supports reconnection synchronization (sync:request) retrieving missed monotonic operations", async () => {
      const syncRes = await new Promise<any>((resolve) => {
        socketB.emit(SOCKET_EVENTS.SYNC_REQUEST, { sinceSeq: 0 }, resolve);
      });

      expect(syncRes.success).toBe(true);
      expect(Array.isArray(syncRes.operations)).toBe(true);
      expect(syncRes.operations.length).toBeGreaterThanOrEqual(2);
      expect(syncRes.operations[0].seq).toBeLessThan(syncRes.operations[1].seq);
    });
  });
});
