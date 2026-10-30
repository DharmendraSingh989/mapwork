import mongoose, { Document, Schema } from "mongoose";

export interface IRoomMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface IRoom extends Document {
  code: string;
  name: string;
  ownerId: mongoose.Types.ObjectId;
  activeMapId: mongoose.Types.ObjectId;
  members: IRoomMember[];
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomMemberSchema = new Schema<IRoomMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoom>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activeMapId: { type: Schema.Types.ObjectId, ref: "Map", required: true },
    members: [RoomMemberSchema],
    isClosed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const RoomModel = mongoose.model<IRoom>("Room", RoomSchema);
