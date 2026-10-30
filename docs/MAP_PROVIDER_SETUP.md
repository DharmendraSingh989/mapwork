# MapForge — Map Tile Provider & Geocoding Setup

## 1. MapLibre GL JS & Free Tile Providers

MapForge uses **MapLibre GL JS**, a free and open-source JavaScript library for interactive vector and raster web maps.

To ensure low recurring costs and no mandatory credit-card dependencies, MapForge is pre-configured with reliable free-tier and open-data basemap styles.

---

## 2. Configured Tile Providers

| Identifier | Provider | Style URL | Type | Usage Policy & Limits |
|---|---|---|---|---|
| `carto-positron` | CARTO | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` | Vector (GL Style) | Free tier available. Requires CARTO attribution. Ideal for data overlays. |
| `carto-dark` | CARTO | `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` | Vector (GL Style) | Free tier. Ideal for night mode and glowing markers. |
| `carto-voyager` | CARTO | `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` | Vector (GL Style) | Detailed streets and land-use polygons. |
| `osm-standard` | OpenStreetMap | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Raster (PNG) | Free open data. Adheres to OSM Tile Usage Policy (fair usage, no bulk scraping). |

---

## 3. Attribution Requirements

All maps rendered in MapForge display correct attribution:
- OpenStreetMap: `© OpenStreetMap contributors`
- CARTO: `© OpenStreetMap contributors, © CARTO`

MapLibre's built-in `AttributionControl` is permanently enabled in the bottom-right corner of the canvas.

---

## 4. Geocoding Provider (OpenStreetMap Nominatim)

MapForge integrates with OpenStreetMap Nominatim for location and address search:
- **Search Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Fair Use Policy**:
  - Requires a descriptive `User-Agent` HTTP header. MapForge sends `MapForge-Geospatial-Application/1.0 (academic-demonstration)`.
  - Client queries are debounced by `400ms` with a minimum query length of 3 characters to minimize load.
  - Maximum 5 results returned per search.

### Optional Custom Geocoding Configuration
In `.env`:
```ini
GEOCODING_PROVIDER=nominatim
GEOCODING_API_KEY=
```
If you wish to switch to a custom geocoding service (e.g. Mapbox Geocoding or OpenCage), you can supply your API key in `GEOCODING_API_KEY`.

---

## 5. Switching Tile Providers in MapForge

To change the default map style for all new maps:
1. Open `.env` (or copy from `.env.example`).
2. Update `MAP_STYLE_URL`:
   ```ini
   MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json
   ```
3. Restart the server. Users can also dynamically switch styles in real-time from the map editor's **Layers** button.
