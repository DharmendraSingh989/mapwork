import mongoose, { Document, Schema } from "mongoose";

export interface IActivityLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  targetType: "map" | "annotation" | "room" | "share";
  targetId: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true },
    targetType: { type: String, enum: ["map", "annotation", "room", "share"], required: true },
    targetId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ targetId: 1, createdAt: -1 });

export const ActivityLogModel = mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
