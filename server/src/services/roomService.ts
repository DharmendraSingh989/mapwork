import crypto from "crypto";
import mongoose from "mongoose";
import { RoomModel, IRoom } from "../models/Room.js";
import { RoomOperationModel } from "../models/RoomOperation.js";
import { MapModel } from "../models/Map.js";
import { MapAnnotationModel } from "../models/MapAnnotation.js";
import { toMapAnnotation } from "./annotationService.js";
import { toMapItem } from "./mapService.js";
import { Room, RoomOperation, RoomRole, PRESET_COLORS } from "@mapforge/shared";

function generateRoomCode(): string {
  // 6 uppercase alphanumeric characters excluding confusing chars (0, O, 1, I)
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

export async function createRoom(
  ownerId: string,
  ownerName: string,
  name: string,
  activeMapId: string
): Promise<Room> {
  if (!mongoose.Types.ObjectId.isValid(activeMapId)) {
    throw new Error("Invalid map ID");
  }

  const map = await MapModel.findById(activeMapId);
  if (!map || map.isDeleted) {
    throw new Error("Target map not found");
  }

  // Ensure unique room code
  let code = generateRoomCode();
  while (await RoomModel.findOne({ code, isClosed: false })) {
    code = generateRoomCode();
  }

  const initialColor = PRESET_COLORS[0];

  const roomDoc = await RoomModel.create({
    code,
    name,
    ownerId: new mongoose.Types.ObjectId(ownerId),
    activeMapId: new mongoose.Types.ObjectId(activeMapId),
    members: [
      {
        userId: new mongoose.Types.ObjectId(ownerId),
        name: ownerName,
        color: initialColor,
        role: "owner",
        joinedAt: new Date(),
        lastActiveAt: new Date()
      }
    ],
    isClosed: false
  });

  return toRoom(roomDoc);
}

export async function joinRoomByCode(code: string, userId: string, userName: string): Promise<Room> {
  const room = await RoomModel.findOne({ code: code.toUpperCase(), isClosed: false });
  if (!room) {
    throw new Error("Room not found or has been closed");
  }

  const existingMemberIndex = room.members.findIndex((m) => m.userId.toString() === userId);
  const userColor = PRESET_COLORS[room.members.length % PRESET_COLORS.length];

  if (existingMemberIndex >= 0) {
    room.members[existingMemberIndex].lastActiveAt = new Date();
  } else {
    room.members.push({
      userId: new mongoose.Types.ObjectId(userId),
      name: userName,
      color: userColor,
      role: "editor",
      joinedAt: new Date(),
      lastActiveAt: new Date()
    });
  }

  await room.save();
  return toRoom(room);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  if (!mongoose.Types.ObjectId.isValid(roomId)) return null;

  const room = await RoomModel.findById(roomId).lean();
  if (!room) return null;

  return toRoom(room);
}

export async function getRoomSnapshot(roomId: string): Promise<{
  room: Room;
  map: any;
  annotations: any[];
  lastSequence: number;
}> {
  const room = await RoomModel.findById(roomId).lean();
  if (!room || room.isClosed) {
    throw new Error("Room not found or closed");
  }

  const mapDoc = await MapModel.findById(room.activeMapId).lean();
  if (!mapDoc) {
    throw new Error("Active map not found");
  }

  const annotations = await MapAnnotationModel.find({ mapId: room.activeMapId }).lean();

  const lastOp = await RoomOperationModel.findOne({ roomId: room._id }).sort({ seq: -1 }).lean();

  return {
    room: toRoom(room),
    map: toMapItem(mapDoc, annotations.length),
    annotations: annotations.map(toMapAnnotation),
    lastSequence: lastOp ? lastOp.seq : 0
  };
}

export async function recordRoomOperation(
  roomId: string,
  actorId: string,
  actorName: string,
  op: {
    id: string;
    type: "create" | "update" | "delete" | "batch";
    targetId?: string;
    payload: any;
  }
): Promise<RoomOperation> {
  // Find highest sequence number atomically
  const lastOp = await RoomOperationModel.findOne({ roomId }).sort({ seq: -1 });
  const nextSeq = lastOp ? lastOp.seq + 1 : 1;

  const doc = await RoomOperationModel.create({
    id: op.id,
    roomId: new mongoose.Types.ObjectId(roomId),
    seq: nextSeq,
    actorId: new mongoose.Types.ObjectId(actorId),
    actorName,
    type: op.type,
    targetId: op.targetId,
    payload: op.payload,
    timestamp: new Date()
  });

  return {
    id: doc.id,
    roomId: doc.roomId.toString(),
    seq: doc.seq,
    actorId: doc.actorId.toString(),
    actorName: doc.actorName,
    type: doc.type,
    targetId: doc.targetId,
    payload: doc.payload,
    timestamp: doc.timestamp.toISOString()
  };
}

export async function getRoomOperationsSince(roomId: string, sinceSeq: number): Promise<RoomOperation[]> {
  const docs = await RoomOperationModel.find({
    roomId: new mongoose.Types.ObjectId(roomId),
    seq: { $gt: sinceSeq }
  })
    .sort({ seq: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc.id,
    roomId: doc.roomId.toString(),
    seq: doc.seq,
    actorId: doc.actorId.toString(),
    actorName: doc.actorName,
    type: doc.type,
    targetId: doc.targetId,
    payload: doc.payload,
    timestamp: doc.timestamp.toISOString()
  }));
}

export function toRoom(doc: any): Room {
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    ownerId: doc.ownerId.toString(),
    activeMapId: doc.activeMapId.toString(),
    members: (doc.members || []).map((m: any) => ({
      userId: m.userId.toString(),
      name: m.name,
      color: m.color,
      role: m.role,
      joinedAt: (m.joinedAt instanceof Date ? m.joinedAt : new Date(m.joinedAt)).toISOString(),
      lastActiveAt: (m.lastActiveAt instanceof Date ? m.lastActiveAt : new Date(m.lastActiveAt)).toISOString()
    })),
    isClosed: doc.isClosed || false,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
    updatedAt: (doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt)).toISOString()
  };
}
