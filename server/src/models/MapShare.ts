import mongoose, { Document, Schema } from "mongoose";

export interface IMapShare extends Document {
  mapId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  token: string;
  permission: "view" | "edit";
  allowCopy: boolean;
  expiresAt?: Date | null;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MapShareSchema = new Schema<IMapShare>(
  {
    mapId: { type: Schema.Types.ObjectId, ref: "Map", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true, index: true },
    permission: { type: String, enum: ["view", "edit"], default: "view" },
    allowCopy: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    isRevoked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const MapShareModel = mongoose.model<IMapShare>("MapShare", MapShareSchema);
