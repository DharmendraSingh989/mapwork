import { AnnotationType, CategoryType, RoomRole, SharePermission } from "../constants/index.js";

export type LngLat = [number, number]; // [longitude, latitude]

export interface GeoPoint {
  type: "Point";
  coordinates: LngLat;
}

export interface GeoLineString {
  type: "LineString";
  coordinates: LngLat[];
}

export interface GeoPolygon {
  type: "Polygon";
  coordinates: LngLat[][];
}

export type GeoGeometry = GeoPoint | GeoLineString | GeoPolygon;

export interface AnnotationProperties {
  label?: string;
  description?: string;
  category?: CategoryType | string;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  emoji?: string;
  iconName?: string;
  fontSize?: number;
  fontColor?: string;
  radiusMeters?: number; // for circle representation
  zIndex?: number;
  [key: string]: unknown;
}

export interface MapAnnotation {
  id: string; // stable client/backend UUID
  mapId: string;
  type: AnnotationType;
  geometry: GeoGeometry;
  properties: AnnotationProperties;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MapCamera {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapItem {
  id: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  description?: string;
  tags: string[];
  styleUrl: string;
  camera: MapCamera;
  sourceMapIds?: string[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  annotationCount?: number;
  thumbnailUrl?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
}

export interface MapShare {
  id: string;
  mapId: string;
  ownerId: string;
  token: string;
  permission: SharePermission;
  allowCopy: boolean;
  expiresAt?: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface RoomMember {
  userId: string;
  name: string;
  color: string;
  role: RoomRole;
  joinedAt: string;
  lastActiveAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  activeMapId: string;
  members: RoomMember[];
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OperationType = "create" | "update" | "delete" | "batch";

export interface RoomOperation {
  id: string;
  roomId: string;
  seq: number;
  actorId: string;
  actorName: string;
  type: OperationType;
  targetId?: string;
  payload: unknown;
  timestamp: string;
}

export interface ActivityLogItem {
  id: string;
  actorId: string;
  actorName: string;
  targetType: "map" | "annotation" | "room" | "share";
  targetId: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface MergeMapsRequest {
  sourceMapIds: string[];
  destinationName: string;
  destinationDescription?: string;
  tags?: string[];
}

export interface MergeMapsResult {
  destinationMap: MapItem;
  importedAnnotationCount: number;
  sourceMapIds: string[];
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null;
}
