import mongoose, { Document, Schema } from "mongoose";

export interface IRoomOperation extends Document {
  id: string; // client-generated operation id
  roomId: mongoose.Types.ObjectId;
  seq: number;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  type: "create" | "update" | "delete" | "batch";
  targetId?: string;
  payload: any;
  timestamp: Date;
}

const RoomOperationSchema = new Schema<IRoomOperation>(
  {
    id: { type: String, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    seq: { type: Number, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true },
    type: { type: String, enum: ["create", "update", "delete", "batch"], required: true },
    targetId: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

RoomOperationSchema.index({ roomId: 1, seq: 1 });
RoomOperationSchema.index({ roomId: 1, id: 1 }, { unique: true });

export const RoomOperationModel = mongoose.model<IRoomOperation>("RoomOperation", RoomOperationSchema);
