# MapForge — Testing Strategy & Verification Guide

## 1. Automated Testing Architecture

MapForge uses **Vitest** for blazing-fast, TypeScript-native testing across shared types, server controllers, and client utilities.

---

## 2. Test Suites Summary

| Test Suite File | Layer | Scope & Assertions | Status |
|---|---|---|---|
| `server/tests/geoPreservation.test.ts` | Shared & Server | Validates WGS 84 `[lng, lat]` coordinates, rejects out-of-range bounds, verifies serialization preservation. | ✅ PASS (4/4) |
| `server/tests/mergeLogic.test.ts` | Server | Validates that merging 2+ maps retains 100% exact coordinates, mints fresh independent IDs, never mutates source maps, and computes optimal bounds. | ✅ PASS (4/4) |
| `server/tests/authAndRooms.test.ts` | Server | Tests JWT access and refresh token signing/verification, input validation schemas, and 6-char room code format. | ✅ PASS (4/4) |
| `client/tests/geoSimplification.test.ts` | Client | Tests Ramer-Douglas-Peucker (RDP) algorithm on freehand coordinate sequences; ensures endpoints are preserved. | ✅ PASS (2/2) |

---

## 3. Running Automated Tests

### Run all tests across the monorepo:
```bash
npm test
```

### Run TypeScript type checking:
```bash
npm run typecheck
```

### Run production builds:
```bash
npm run build
```

---

## 4. Manual Demonstration Verification Checklist

For live college minor project demonstration and evaluation:

1. **Geographic Coordinate Preservation Regression**:
   - Place an emoji marker (e.g. ⛽ Petrol Pump) on a landmark (e.g. Bhopal Junction).
   - Pan in all directions (North, South, East, West).
   - Zoom in from zoom level 12 to 18, and zoom out to level 4.
   - Resize browser window from desktop to mobile aspect ratio.
   - Switch map base style from *Light (Positron)* to *Dark Matter* to *OpenStreetMap Raster*.
   - **Assertion**: Marker remains anchored to the exact geographic landmark.

2. **Freehand Drawing Preservation**:
   - Select the Freehand Brush tool and draw a trail along a street.
   - Release the pointer; verify stroke simplifies smoothly and auto-saves.
   - Reload page (`Ctrl+R`); verify stroke re-renders at the exact geographic coordinates.

3. **Multi-Map Merging Demonstration**:
   - Create Map 1: *"Bhopal Petrol Stations"* with 2 fuel markers.
   - Create Map 2: *"Textile & Clothes"* with 2 clothing markers and a survey polygon.
   - Click **Merge Maps** from the navbar or dashboard.
   - Select both maps, enter name *"Combined Survey Map"*, and click **Create Merged Map**.
   - **Assertion**:
     - New map opens immediately with all 4 markers and polygon.
     - Each marker retains its original emoji, label, and exact coordinates.
     - Source maps in dashboard remain unchanged with their original item counts.

4. **Independent Copy Sharing**:
   - Click **Share** on any map and copy the generated link.
   - Open link in an Incognito window or different browser.
   - Click **Copy to My Maps**.
   - Modify the copied map (e.g. add new markers or delete one).
   - Verify the original owner's map is completely unaffected.

5. **Real-Time Collaborative Room**:
   - Open MapForge in two separate browser tabs or windows with different accounts.
   - Tab 1: Click **Collab Rooms** -> **Create Room**. Copy the 6-character room code (e.g. `M7F9K2`).
   - Tab 2: Click **Collab Rooms** -> **Join with Code** -> enter code.
   - Move mouse on Tab 1 -> Tab 2 displays Tab 1's live cursor with name tag.
   - Place a marker on Tab 1 -> marker instantly appears on Tab 2 without page refresh.
