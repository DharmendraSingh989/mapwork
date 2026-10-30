import mongoose, { Document, Schema } from "mongoose";
import { DEFAULT_CAMERA, DEFAULT_MAP_STYLE } from "@mapforge/shared";

export interface IMap extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  tags: string[];
  styleUrl: string;
  camera: {
    center: {
      lat: number;
      lng: number;
    };
    zoom: number;
    pitch: number;
    bearing: number;
  };
  sourceMapIds?: mongoose.Types.ObjectId[];
  isDeleted: boolean;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MapSchema = new Schema<IMap>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    styleUrl: { type: String, default: DEFAULT_MAP_STYLE },
    camera: {
      center: {
        lat: { type: Number, default: DEFAULT_CAMERA.center.lat },
        lng: { type: Number, default: DEFAULT_CAMERA.center.lng }
      },
      zoom: { type: Number, default: DEFAULT_CAMERA.zoom },
      pitch: { type: Number, default: 0 },
      bearing: { type: Number, default: 0 }
    },
    sourceMapIds: [{ type: Schema.Types.ObjectId, ref: "Map" }],
    isDeleted: { type: Boolean, default: false, index: true },
    thumbnailUrl: { type: String }
  },
  { timestamps: true }
);

MapSchema.index({ ownerId: 1, isDeleted: 1, updatedAt: -1 });

export const MapModel = mongoose.model<IMap>("Map", MapSchema);
