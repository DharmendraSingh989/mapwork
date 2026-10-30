# MapForge — Collaborative Map Editor, Map Merger & Real-Time Mapping Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-v5-396afc?logo=maplibre)](https://maplibre.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-green?logo=node.js)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black?logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Compatible-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Tests](https://img.shields.io/badge/Tests-14%2F14_Passing-brightgreen)]()

**MapForge** is a full-stack, real-time geospatial application combining personal interactive map editing, geographic freehand drawing, permanent cloud storage, multi-map merging, secure copy sharing, and multi-user collaborative editing rooms.

Built as an engineering college minor project, MapForge prioritizes **reliable functionality, data integrity, free/open-source technologies, and geographic accuracy**.

---

## 1. The Core Engineering Principle

> **Every annotation remains anchored to its intended geographic coordinates ($[\text{longitude}, \text{latitude}]$). A marker or permanent drawing is NEVER stored solely as screen pixels.**

Screen pixels ($x, y$) change with every pan, zoom, device resize, or tile switch. MapForge converts all pointer interactions into the **WGS 84 (EPSG:4326)** coordinate reference system and stores them as standard GeoJSON documents. Dynamic projections are computed in real-time by MapLibre GL.

---

## 2. Key Features

### 🗺️ A. Interactive Map Editor Studio
- **Full Navigation**: Smooth pan, zoom, rotation/pitch controls, and full-screen mode.
- **Emoji Markers**: Categorized Unicode markers (Petrol Pump ⛽, Clothing 👗, Shoes 👟, Hospital 🏥, School 🏫, Residential 🏠, Restaurant 🍽️, Parking 🅿️, and custom emojis).
- **Dots & Icons**: Sized and colored dot markers.
- **Text Labels**: Geographically anchored text annotations with customizable font sizes, colors, and notes.
- **Freehand Pencil/Brush**: Drag on the map to draw roads, boundaries, or trails. Automatically converts screen trajectories to geographic `LineString` coordinates and applies **Ramer-Douglas-Peucker (RDP)** simplification to prune redundant vertices without altering shape.
- **Lines & Polygons**: Draw multi-point lines and closed area polygons with custom stroke and fill colors.
- **Eraser & Selection**: Select individual annotations or delete them with instant feedback.
- **Undo / Redo**: Command-pattern history stack with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`).
- **Auto-Save**: Debounced batch synchronization with visual status indicators (*Saved*, *Saving...*, *Unsaved changes*, *Save error*).

### 🔀 B. Multi-Map Merge System
- Combine annotations from 2 or more saved maps into a brand-new, independent destination map.
- Preserves 100% of geographic coordinates, colors, labels, categories, and stroke properties.
- Generates new unique IDs so the destination map is fully independent of source maps.
- Source maps remain untouched and unmodified.
- Automatically computes optimal camera viewport from the combined geographic bounding box.

### 🔗 C. Sharing & Independent Copies
- Generate cryptographically secure shareable links.
- Configurable permissions: **View-only** or **Can edit**.
- **Copy to My Maps**: Recipients can import an independent copy of the shared map into their account, allowing separate modification without modifying the owner's original.
- Instant link revocation.

### 👥 D. Real-Time Collaborative Rooms
- Create rooms with unique 6-character room codes (e.g. `M7F9K2`).
- Authenticated WebSocket communication via **Socket.IO**.
- Live member presence indicators and assigned avatar colors.
- Real-time peer cursor movement broadcast (`cursor:move`).
- Server-authoritative edit persistence with monotonic sequence numbers.

### 🔍 E. Geocoding & Multiple Basemap Styles
- Search locations and addresses worldwide using OpenStreetMap Nominatim.
- Switch between **Light (CARTO Positron)**, **Dark Matter**, **Voyager**, and **OpenStreetMap Raster** styles in real time.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router, Zustand, Lucide React |
| **Interactive Map** | MapLibre GL JS, GeoJSON (WGS 84), OpenStreetMap Nominatim |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, Mongoose, Zod, bcryptjs, JWT |
| **Database** | MongoDB Atlas (Free M0 Cluster compatible) |
| **Testing** | Vitest, Supertest |

---

## 4. Project Monorepo Structure

```
mapwork/
├── client/                     # Frontend Vite + React + TypeScript Application
│   ├── src/
│   │   ├── app/                # Root App router & layout
│   │   ├── components/common/  # Navbar, Toast, Dialogs, Color/Emoji Pickers
│   │   ├── features/
│   │   │   ├── auth/           # Login & Registration views
│   │   │   ├── dashboard/      # Saved maps library & grid
│   │   │   ├── map-editor/     # MapCanvas, Toolbar, ToolPalette, PropertyPanel
│   │   │   ├── map-merge/      # Multi-map merge modal workflow
│   │   │   ├── map-sharing/    # Share modal & public shared view
│   │   │   └── collaborative-rooms/ # Live room creation & joining
│   │   ├── lib/                # API client & Geo algorithms (RDP simplification)
│   │   ├── stores/             # Zustand stores (editorStore, authStore, roomStore)
│   │   └── styles/             # Tailwind CSS & MapLibre stylesheets
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Backend Express + Socket.IO Server
│   ├── src/
│   │   ├── config/             # Environment & MongoDB connection
│   │   ├── controllers/        # Maps, Annotations, Merge, Share, Room, Health
│   │   ├── middleware/         # JWT authentication, error handling, validation
│   │   ├── models/             # Mongoose schemas (User, Map, Annotation, Share, Room)
│   │   ├── routes/             # REST API routes (/api/v1/...)
│   │   ├── services/           # Merge service, Annotation service, Room service
│   │   ├── sockets/            # Real-time Socket.IO collaboration handler
│   │   └── server.ts           # HTTP server bootstrap
│   ├── tests/                  # Unit and integration test suites
│   └── package.json
├── shared/                     # Shared TypeScript types, schemas (Zod) & constants
│   ├── src/
│   │   ├── constants/          # Bhopal coordinates, categories, map styles
│   │   ├── schemas/            # Zod validation schemas
│   │   └── types/              # GeoJSON, Map, Annotation, User, Room interfaces
│   └── package.json
├── docs/                       # Project Documentation
│   ├── ARCHITECTURE.md         # System architecture & sequence diagrams
│   ├── DATABASE_SCHEMA.md      # Data dictionary, ER diagram & indexes
│   ├── API.md                  # Complete REST API reference
│   ├── MAP_PROVIDER_SETUP.md   # Tile providers & Nominatim setup
│   ├── DEPLOYMENT.md           # Nginx, PM2, and SSL production setup
│   └── TESTING.md              # Automated test suites & verification guide
├── .env.example                # Sample environment configuration
├── package.json                # Root monorepo workspace package.json
└── README.md
```

---

## 5. Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+ LTS installed
- npm installed

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optional)* Add your MongoDB Atlas connection string to `MONGODB_URI` in `.env`.

### 3. Build Shared Packages
```bash
npm run build --workspace=@mapforge/shared
```

### 4. Run Development Servers
To run both backend and frontend concurrently:
```bash
npm run dev
```
Or in separate terminals:
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:server

# Terminal 2: Frontend Studio (port 5173)
npm run dev:client
```

Open `http://localhost:5173` in your browser!

---

## 6. Running Automated Tests

MapForge includes automated test suites covering coordinate preservation, RDP simplification, merge logic, and authentication:

```bash
# Run all tests across workspaces
npm test

# Run TypeScript typecheck across all workspaces
npm run typecheck

# Build all packages for production
npm run build
```

---

## 7. College Defense Q&A Guide

### Q1: How do annotations stay locked to landmarks when zooming and panning?
**A**: When an annotation is created, we use `map.unproject([pixelX, pixelY])` to extract the exact real-world latitude and longitude in WGS 84 (`[lng, lat]`). This geographic coordinate is saved in MongoDB. On every frame render, MapLibre GL projects that geographic point back onto the screen viewport. The map moves, but the landmark and marker stay bound to the exact same Earth coordinates.

### Q2: How does the Map Merging algorithm prevent duplicate IDs and preserve source data?
**A**: When merging Map A and Map B, MapForge queries all annotations belonging to those maps, clones their GeoJSON geometries and style properties without modification, and mints freshly generated UUIDs for each cloned document. The new annotations are linked to a newly created destination Map document. The original source maps are strictly read-only during the merge.

### Q3: How is real-time collaborative conflict handled in rooms?
**A**: Every room mutation is sent to the server with a client-generated `opId` and applied to MongoDB. The server assigns an atomic, monotonically increasing sequence number (`seq`) and broadcasts the operation to other connected members. Sockets that temporarily disconnect can query `/api/v1/rooms/:roomId/operations?since=<seq>` to catch up on missed edits without receiving duplicates.

---

## 8. License

This project is licensed under the MIT License — free for academic, personal, and educational use.
