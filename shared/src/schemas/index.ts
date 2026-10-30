import { z } from "zod";
import { ANNOTATION_TYPES, SHARE_PERMISSIONS } from "../constants/index.js";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100)
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const CameraSchema = z.object({
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  zoom: z.number().min(0).max(24),
  pitch: z.number().min(0).max(85).optional(),
  bearing: z.number().min(-180).max(180).optional()
});

export const MapCreateSchema = z.object({
  name: z.string().min(1, "Map name is required").max(100),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).optional().default([]),
  styleUrl: z.string().optional(),
  camera: CameraSchema.optional()
});

export const MapUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).optional(),
  styleUrl: z.string().optional(),
  camera: CameraSchema.optional()
});

const LngLatSchema = z.tuple([
  z.number().min(-180).max(180), // longitude
  z.number().min(-90).max(90)   // latitude
]);

export const PointGeometrySchema = z.object({
  type: z.literal("Point"),
  coordinates: LngLatSchema
});

export const LineStringGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(LngLatSchema).min(2, "LineString must have at least 2 points")
});

export const PolygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(LngLatSchema).min(3, "Polygon ring must have at least 3 points"))
});

export const GeometrySchema = z.discriminatedUnion("type", [
  PointGeometrySchema,
  LineStringGeometrySchema,
  PolygonGeometrySchema
]);

export const AnnotationPropertiesSchema = z.object({
  label: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  fillColor: z.string().max(30).optional(),
  strokeWidth: z.number().min(1).max(50).optional(),
  opacity: z.number().min(0).max(1).optional(),
  emoji: z.string().max(10).optional(),
  iconName: z.string().max(50).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  fontColor: z.string().max(30).optional(),
  radiusMeters: z.number().positive().optional(),
  zIndex: z.number().optional()
}).passthrough();

export const AnnotationCreateSchema = z.object({
  id: z.string().uuid().or(z.string().min(5)),
  type: z.enum(ANNOTATION_TYPES),
  geometry: GeometrySchema,
  properties: AnnotationPropertiesSchema.optional().default({})
});

export const AnnotationUpdateSchema = z.object({
  geometry: GeometrySchema.optional(),
  properties: AnnotationPropertiesSchema.optional()
});

export const BatchAnnotationOperationSchema = z.object({
  create: z.array(AnnotationCreateSchema).optional().default([]),
  update: z.array(z.object({
    id: z.string(),
    data: AnnotationUpdateSchema
  })).optional().default([]),
  delete: z.array(z.string()).optional().default([])
});

export const MergeMapsSchema = z.object({
  sourceMapIds: z.array(z.string()).min(2, "Select at least two maps to merge"),
  destinationName: z.string().min(1, "Merged map name is required").max(100),
  destinationDescription: z.string().max(500).optional(),
  tags: z.array(z.string()).optional()
});

export const ShareCreateSchema = z.object({
  permission: z.enum(SHARE_PERMISSIONS).default("view"),
  allowCopy: z.boolean().default(true),
  expiresInDays: z.number().positive().nullable().optional()
});

export const RoomCreateSchema = z.object({
  name: z.string().min(1, "Room name is required").max(100),
  activeMapId: z.string().min(1, "Active map is required")
});

export const RoomJoinSchema = z.object({
  code: z.string().length(6, "Room code must be 6 characters").toUpperCase()
});

export const RoomOperationSchema = z.object({
  id: z.string(),
  type: z.enum(["create", "update", "delete", "batch"]),
  targetId: z.string().optional(),
  payload: z.unknown(),
  timestamp: z.string()
});
