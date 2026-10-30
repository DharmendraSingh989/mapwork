import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/token.js";
import { User } from "../models/User.js";
import { RoomModel } from "../models/Room.js";
import { RoomOperationModel } from "../models/RoomOperation.js";
import {
  getRoomById,
  recordRoomOperation,
  getRoomSnapshot,
  getRoomOperationsSince
} from "../services/roomService.js";
import {
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  batchOperations
} from "../services/annotationService.js";
import { SOCKET_EVENTS, PRESET_COLORS } from "@mapforge/shared";

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  currentRoomId?: string;
}

export function setupSocketHandlers(io: SocketIOServer): void {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) {
        // Allow guest or check token
        return next(new Error("Authentication token required for collaborative rooms"));
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        return next(new Error("Invalid or expired token"));
      }

      const user = await User.findById(payload.userId).select("name email");
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      };

      next();
    } catch (err) {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`🔌 Socket connected: ${user.name} (${user.id}) [${socket.id}]`);

    // 1. Join room
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async ({ roomId }: { roomId: string }, callback) => {
      try {
        const roomDoc = await RoomModel.findById(roomId);
        if (!roomDoc || roomDoc.isClosed) {
          if (callback) callback({ error: "Room not found or closed" });
          return;
        }

        // Ensure user is in room members
        const memberIdx = roomDoc.members.findIndex((m) => m.userId.toString() === user.id);
        if (memberIdx === -1) {
          // If room owner, assign owner; otherwise editor
          const isOwner = roomDoc.ownerId.toString() === user.id;
          roomDoc.members.push({
            userId: roomDoc.ownerId.constructor(user.id),
            name: user.name,
            color: PRESET_COLORS[roomDoc.members.length % PRESET_COLORS.length],
            role: isOwner ? "owner" : "editor",
            joinedAt: new Date(),
            lastActiveAt: new Date()
          } as any);
          await roomDoc.save();
        } else {
          roomDoc.members[memberIdx].lastActiveAt = new Date();
          await roomDoc.save();
        }

        socket.join(roomId);
        socket.currentRoomId = roomId;

        // Broadcast to existing room members
        socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
          userId: user.id,
          name: user.name,
          timestamp: new Date().toISOString()
        });

        const snapshot = await getRoomSnapshot(roomId);

        if (callback) {
          callback({
            success: true,
            room: snapshot.room,
            map: snapshot.map,
            annotations: snapshot.annotations,
            lastSequence: snapshot.lastSequence
          });
        }
      } catch (err: any) {
        console.error("Error in JOIN_ROOM:", err);
        if (callback) callback({ error: err.message || "Failed to join room" });
      }
    });

    // 2. Cursor movements (transient, authorized & bounds-checked)
    socket.on(SOCKET_EVENTS.CURSOR_MOVE, (data: { lng: number; lat: number }) => {
      if (!socket.currentRoomId) return;
      if (
        typeof data.lng !== "number" ||
        typeof data.lat !== "number" ||
        isNaN(data.lng) ||
        isNaN(data.lat) ||
        data.lng < -180 ||
        data.lng > 180 ||
        data.lat < -90 ||
        data.lat > 90
      ) {
        return;
      }

      socket.to(socket.currentRoomId).emit(SOCKET_EVENTS.CURSOR_MOVE, {
        userId: user.id,
        name: user.name,
        coords: [data.lng, data.lat]
      });
    });

    // 3. Collaborative Room Operation (authoritative server-persisted edits)
    socket.on(
      SOCKET_EVENTS.OPERATION_SUBMIT,
      async (
        opData: {
          id: string;
          type: "create" | "update" | "delete" | "batch";
          targetId?: string;
          payload: any;
        },
        ackCallback
      ) => {
        const roomId = socket.currentRoomId;
        if (!roomId) {
          if (ackCallback) ackCallback({ error: "Not in a room" });
          return;
        }

        try {
          const room = await RoomModel.findById(roomId);
          if (!room || room.isClosed) {
            if (ackCallback) ackCallback({ error: "Room is not active" });
            return;
          }

          // Verify user authorization: must be member with editor or owner role
          const member = room.members.find((m) => m.userId.toString() === user.id);
          if (!member || (member.role !== "owner" && member.role !== "editor")) {
            if (ackCallback) {
              ackCallback({ error: "Unauthorized: Editor or owner role required to modify room annotations" });
            }
            return;
          }

          // Handle duplicate operations idempotently
          const existingOp = await RoomOperationModel.findOne({ roomId: room._id, id: opData.id });
          if (existingOp) {
            if (ackCallback) {
              ackCallback({
                success: true,
                opId: opData.id,
                seq: existingOp.seq,
                timestamp: existingOp.timestamp.toISOString(),
                duplicate: true
              });
            }
            return;
          }

          // A. Persist into the database according to operation type
          const activeMapId = room.activeMapId.toString();

          if (opData.type === "create") {
            await createAnnotation(activeMapId, user.id, opData.payload);
          } else if (opData.type === "update") {
            await updateAnnotation(activeMapId, opData.targetId!, user.id, opData.payload);
          } else if (opData.type === "delete") {
            await deleteAnnotation(activeMapId, opData.targetId!);
          } else if (opData.type === "batch") {
            await batchOperations(activeMapId, user.id, opData.payload);
          }

          // B. Record monotonic operation in room log
          const recordedOp = await recordRoomOperation(roomId, user.id, user.name, opData);

          // C. Broadcast operation to other room members
          socket.to(roomId).emit(SOCKET_EVENTS.OPERATION_BROADCAST, recordedOp);

          // D. Acknowledge to sender with new sequence number
          if (ackCallback) {
            ackCallback({
              success: true,
              opId: opData.id,
              seq: recordedOp.seq,
              timestamp: recordedOp.timestamp
            });
          }
        } catch (err: any) {
          console.error("Error processing operation:", err);
          if (ackCallback) {
            ackCallback({ error: err.message || "Failed to persist operation" });
          }
        }
      }
    );

    // 4. Synchronization on reconnection / catch-up
    socket.on(
      SOCKET_EVENTS.SYNC_REQUEST,
      async ({ sinceSeq }: { sinceSeq: number }, callback) => {
        const roomId = socket.currentRoomId;
        if (!roomId) {
          if (callback) callback({ error: "Not in a room" });
          return;
        }

        try {
          const operations = await getRoomOperationsSince(roomId, sinceSeq);
          if (callback) {
            callback({ success: true, operations });
          }
        } catch (err: any) {
          if (callback) callback({ error: err.message || "Sync failed" });
        }
      }
    );

    // 5. Leave room
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
      const roomId = socket.currentRoomId;
      if (roomId) {
        socket.leave(roomId);
        socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
          userId: user.id,
          name: user.name,
          timestamp: new Date().toISOString()
        });
        socket.currentRoomId = undefined;
      }
    });

    // 6. Disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`🔌 Socket disconnected: ${user.name} [${socket.id}]`);
      const roomId = socket.currentRoomId;
      if (roomId) {
        socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
          userId: user.id,
          name: user.name,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
}
