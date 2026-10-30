export const APP_NAME = "MapForge";

export const DEFAULT_CAMERA = {
  center: {
    lat: 23.2599,
    lng: 77.4126
  },
  zoom: 12,
  pitch: 0,
  bearing: 0
};

export const ANNOTATION_TYPES = [
  "marker",
  "icon",
  "dot",
  "text",
  "freehand",
  "line",
  "polyline",
  "polygon",
  "rectangle",
  "circle"
] as const;

export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

export const CATEGORIES = [
  "general",
  "fuel",
  "food",
  "clothing",
  "footwear",
  "medical",
  "education",
  "residential",
  "commercial",
  "transit",
  "nature"
] as const;

export type CategoryType = (typeof CATEGORIES)[number];

export const MAP_STYLES = [
  {
    id: "carto-positron",
    name: "Light (Positron)",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    attribution: "© OpenStreetMap contributors, © CARTO"
  },
  {
    id: "carto-dark",
    name: "Dark (Dark Matter)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    attribution: "© OpenStreetMap contributors, © CARTO"
  },
  {
    id: "carto-voyager",
    name: "Detailed (Voyager)",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    attribution: "© OpenStreetMap contributors, © CARTO"
  },
  {
    id: "osm-standard",
    name: "OpenStreetMap",
    url: "osm-raster",
    attribution: "© OpenStreetMap contributors"
  }
] as const;

export const DEFAULT_MAP_STYLE = MAP_STYLES[0].url;

export const SHARE_PERMISSIONS = ["view", "edit"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

export const ROOM_ROLES = ["owner", "editor", "viewer"] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];

export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  JOIN_ROOM: "room:join",
  LEAVE_ROOM: "room:leave",
  ROOM_JOINED: "room:joined",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  PRESENCE_UPDATE: "presence:update",
  CURSOR_MOVE: "cursor:move",
  OPERATION_SUBMIT: "operation:submit",
  OPERATION_BROADCAST: "operation:broadcast",
  OPERATION_ACK: "operation:ack",
  SYNC_REQUEST: "sync:request",
  SYNC_RESPONSE: "sync:response",
  ERROR: "error:event"
} as const;

export const PRESET_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#1F2937", // Slate Dark
  "#FFFFFF"  // White
];

export const PRESET_EMOJIS = [
  { emoji: "⛽", name: "Petrol Pump", category: "fuel" },
  { emoji: "👗", name: "Clothing", category: "clothing" },
  { emoji: "👟", name: "Footwear", category: "footwear" },
  { emoji: "🏥", name: "Hospital", category: "medical" },
  { emoji: "🏫", name: "School", category: "education" },
  { emoji: "🏠", name: "House", category: "residential" },
  { emoji: "🍽️", name: "Restaurant", category: "food" },
  { emoji: "🅿️", name: "Parking", category: "transit" },
  { emoji: "🏢", name: "Office", category: "commercial" },
  { emoji: "🛒", name: "Market", category: "commercial" },
  { emoji: "🌳", name: "Park", category: "nature" },
  { emoji: "⭐", name: "Favorite", category: "general" },
  { emoji: "📍", name: "Pin", category: "general" },
  { emoji: "🚩", name: "Flag", category: "general" }
];
