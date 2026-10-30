import mongoose, { Document, Schema } from "mongoose";
import { ANNOTATION_TYPES } from "@mapforge/shared";

export interface IMapAnnotation extends Document {
  mapId: mongoose.Types.ObjectId;
  annotationId: string; // unique stable client-side/cross-session identifier
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const MapAnnotationSchema = new Schema<IMapAnnotation>(
  {
    mapId: { type: Schema.Types.ObjectId, ref: "Map", required: true, index: true },
    annotationId: { type: String, required: true },
    type: { type: String, enum: ANNOTATION_TYPES, required: true },
    geometry: {
      type: {
        type: String,
        enum: ["Point", "LineString", "Polygon"],
        required: true
      },
      coordinates: { type: Schema.Types.Mixed, required: true }
    },
    properties: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// Unique compound index on (mapId, annotationId)
MapAnnotationSchema.index({ mapId: 1, annotationId: 1 }, { unique: true });
MapAnnotationSchema.index({ mapId: 1, type: 1 });

export const MapAnnotationModel = mongoose.model<IMapAnnotation>("MapAnnotation", MapAnnotationSchema);
