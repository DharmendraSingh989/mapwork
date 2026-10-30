# MapForge — REST API Documentation

All API endpoints are prefixed with `/api/v1`.

## Authentication

All protected endpoints require an HTTP Bearer header:
```http
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### Register User
- **Endpoint**: `POST /auth/register`
- **Body**:
  ```json
  {
    "name": "Deepak Sharma",
    "email": "deepak@example.com",
    "password": "Password123!"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "user": {
      "id": "6724a...",
      "name": "Deepak Sharma",
      "email": "deepak@example.com",
      "createdAt": "2026-10-30T06:00:00.000Z"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
  ```

### Login User
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "deepak@example.com",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK`

### Get Current User Profile
- **Endpoint**: `GET /auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`

---

## 2. Maps Endpoints

### List User Maps
- **Endpoint**: `GET /maps`
- **Query Parameters**:
  - `search` (optional string): filter by map title
  - `tag` (optional string): filter by tag
  - `sort` (optional `"updatedAt" | "createdAt"`): sort field
  - `order` (optional `"asc" | "desc"`): sort order
- **Response**: `200 OK` (Array of `MapItem`)

### Create Map
- **Endpoint**: `POST /maps`
- **Body**:
  ```json
  {
    "name": "Bhopal Commercial Survey",
    "description": "Retail stores & petrol pumps",
    "tags": ["bhopal", "survey"],
    "styleUrl": "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  }
  ```
- **Response**: `201 Created`

### Get Map by ID
- **Endpoint**: `GET /maps/:mapId`
- **Response**: `200 OK`

### Update Map
- **Endpoint**: `PATCH /maps/:mapId`
- **Body**: `{ "name": "New Name", "description": "Updated description" }`
- **Response**: `200 OK`

### Delete Map
- **Endpoint**: `DELETE /maps/:mapId`
- **Response**: `200 OK` `{ "success": true }`

### Duplicate Map
- **Endpoint**: `POST /maps/:mapId/duplicate`
- **Description**: Clones the map and all annotations with new IDs, preserving 100% of geographic coordinates.
- **Response**: `201 Created`

---

## 3. Annotations Endpoints

### List Annotations for Map
- **Endpoint**: `GET /maps/:mapId/annotations`
- **Response**: `200 OK` (Array of `MapAnnotation`)

### Create Annotation
- **Endpoint**: `POST /maps/:mapId/annotations`
- **Body (Marker Example)**:
  ```json
  {
    "id": "ann_uuid_12345",
    "type": "marker",
    "geometry": {
      "type": "Point",
      "coordinates": [77.4126, 23.2599]
    },
    "properties": {
      "emoji": "⛽",
      "label": "Indian Oil Fuel Station",
      "category": "fuel",
      "color": "#EF4444"
    }
  }
  ```
- **Body (Freehand Stroke Example)**:
  ```json
  {
    "id": "stroke_uuid_67890",
    "type": "freehand",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [77.4126, 23.2599],
        [77.4130, 23.2605],
        [77.4140, 23.2612]
      ]
    },
    "properties": {
      "color": "#3B82F6",
      "strokeWidth": 4,
      "opacity": 0.9
    }
  }
  ```
- **Response**: `201 Created`

### Batch Annotation Sync (Auto-save)
- **Endpoint**: `POST /maps/:mapId/annotations/batch`
- **Body**:
  ```json
  {
    "create": [ ... ],
    "update": [ { "id": "ann_1", "data": { ... } } ],
    "delete": [ "ann_old_1" ]
  }
  ```
- **Response**: `200 OK` `{ "success": true, "created": 2, "updated": 1, "deleted": 0 }`

---

## 4. Multi-Map Merge Endpoint

### Merge Maps
- **Endpoint**: `POST /maps/merge`
- **Body**:
  ```json
  {
    "sourceMapIds": ["6724a...", "6724b..."],
    "destinationName": "Bhopal Integrated Commercial & Fuel Map",
    "destinationDescription": "Combined survey of markets and fuel points"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "destinationMap": { "id": "6724c...", "name": "Bhopal Integrated..." },
    "importedAnnotationCount": 18,
    "sourceMapIds": ["6724a...", "6724b..."],
    "bounds": {
      "minLng": 77.385,
      "minLat": 23.210,
      "maxLng": 77.442,
      "maxLat": 23.285
    }
  }
  ```

---

## 5. Map Sharing & Independent Copies

### Create Share Link
- **Endpoint**: `POST /maps/:mapId/shares`
- **Body**:
  ```json
  {
    "permission": "view",
    "allowCopy": true,
    "expiresInDays": 30
  }
  ```
- **Response**: `201 Created` `{ "id": "...", "token": "a4f89d...", ... }`

### Publicly Access Shared Map
- **Endpoint**: `GET /shares/:token` (No auth required)
- **Response**: `200 OK` `{ "map": { ... }, "share": { ... } }`

### Import Shared Map as Independent Copy
- **Endpoint**: `POST /shares/:token/import`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "newMapName": "My Independent Copy" }`
- **Response**: `201 Created`

---

## 6. Collaborative Rooms

### Create Collaborative Room
- **Endpoint**: `POST /rooms`
- **Body**: `{ "name": "Review Session", "activeMapId": "6724a..." }`
- **Response**: `201 Created` `{ "id": "...", "code": "M7F9K2", ... }`

### Join Collaborative Room by Code
- **Endpoint**: `POST /rooms/join`
- **Body**: `{ "code": "M7F9K2" }`
- **Response**: `200 OK`

### Get Room Snapshot
- **Endpoint**: `GET /rooms/:roomId/snapshot`
- **Response**: `200 OK` `{ "room": { ... }, "map": { ... }, "annotations": [ ... ], "lastSequence": 42 }`

---

## 7. Geocoding & Health

### Search Locations (OpenStreetMap Nominatim)
- **Endpoint**: `GET /geocoding/search?q=Bhopal+Junction`
- **Response**: `200 OK` (Array of places with lat, lng, displayName)

### Health Check
- **Endpoint**: `GET /health`
- **Response**: `200 OK` `{ "status": "ok", "service": "mapforge-api" }`

### Readiness Check
- **Endpoint**: `GET /ready`
- **Response**: `200 OK` `{ "status": "ready", "database": "connected" }`
