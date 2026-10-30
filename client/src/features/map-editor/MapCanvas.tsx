import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibreGl from "maplibre-gl";
import { useEditorStore } from "../../stores/editorStore.js";
import { useRoomStore } from "../../stores/roomStore.js";
import { simplifyCoordinates } from "../../lib/geo.js";
import { MapAnnotation, LngLat, GeoGeometry } from "@mapforge/shared";

interface MapCanvasProps {
  styleUrl?: string;
  targetCoordinates?: { lat: number; lng: number } | null;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ styleUrl, targetCoordinates }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibreGl.Map | null>(null);
  const markerInstancesRef = useRef<Map<string, maplibreGl.Marker>>(new Map());
  const cursorMarkersRef = useRef<Map<string, maplibreGl.Marker>>(new Map());

  const {
    currentMap,
    annotations,
    selectedId,
    activeTool,
    activeColor,
    activeFillColor,
    activeStrokeWidth,
    activeOpacity,
    activeEmoji,
    activeCategory,
    fontSize,
    addAnnotation,
    selectAnnotation,
    deleteAnnotation,
    updateAnnotationGeometry
  } = useEditorStore();

  const { cursors, sendCursorMove, isConnected, submitOperation } = useRoomStore();

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  // In-progress drawing state
  const isDrawingRef = useRef(false);
  const activeStrokeCoordsRef = useRef<LngLat[]>([]);
  const polygonPointsRef = useRef<LngLat[]>([]);
  const [, setForceUpdate] = useState(0);

  const updateGeoJsonSources = useCallback((map: maplibreGl.Map, currentAnnotations: MapAnnotation[]) => {
    if (!map.isStyleLoaded()) return;

    const linesSource = map.getSource("mapforge-lines") as maplibreGl.GeoJSONSource;
    const polygonsSource = map.getSource("mapforge-polygons") as maplibreGl.GeoJSONSource;

    if (linesSource) {
      const lineFeatures = currentAnnotations
        .filter((ann) => ann.geometry.type === "LineString")
        .map((ann) => ({
          type: "Feature" as const,
          properties: {
            id: ann.id,
            color: ann.properties.color || "#3B82F6",
            strokeWidth: ann.properties.strokeWidth || 3,
            opacity: ann.properties.opacity ?? 1
          },
          geometry: ann.geometry as any
        }));

      linesSource.setData({
        type: "FeatureCollection",
        features: lineFeatures
      });
    }

    if (polygonsSource) {
      const polygonFeatures = currentAnnotations
        .filter((ann) => ann.geometry.type === "Polygon")
        .map((ann) => ({
          type: "Feature" as const,
          properties: {
            id: ann.id,
            color: ann.properties.color || "#3B82F6",
            fillColor: ann.properties.fillColor || "#3B82F633",
            strokeWidth: ann.properties.strokeWidth || 2,
            opacity: ann.properties.opacity ?? 0.8
          },
          geometry: ann.geometry as any
        }));

      polygonsSource.setData({
        type: "FeatureCollection",
        features: polygonFeatures
      });
    }
  }, []);

  const setupLayers = useCallback((map: maplibreGl.Map) => {
    if (!map.getSource("mapforge-lines")) {
      map.addSource("mapforge-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
    }

    if (!map.getSource("mapforge-polygons")) {
      map.addSource("mapforge-polygons", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
    }

    if (!map.getSource("mapforge-drawing-preview")) {
      map.addSource("mapforge-drawing-preview", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
    }

    if (!map.getLayer("mapforge-lines-layer")) {
      map.addLayer({
        id: "mapforge-lines-layer",
        type: "line",
        source: "mapforge-lines",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "strokeWidth"],
          "line-opacity": ["get", "opacity"]
        }
      });

      map.on("click", "mapforge-lines-layer", (e) => {
        const feat = e.features?.[0];
        if (!feat || !feat.properties) return;
        const id = feat.properties.id;
        if (!id) return;

        if (activeToolRef.current === "eraser") {
          deleteAnnotation(id);
          if (isConnectedRef.current) submitOperation("delete", id);
        } else if (activeToolRef.current === "select") {
          selectAnnotation(id);
        }
      });

      map.on("mouseenter", "mapforge-lines-layer", () => {
        if (activeToolRef.current === "select" || activeToolRef.current === "eraser") {
          map.getCanvas().style.cursor = "pointer";
        }
      });
      map.on("mouseleave", "mapforge-lines-layer", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    if (!map.getLayer("mapforge-polygons-fill")) {
      map.addLayer({
        id: "mapforge-polygons-fill",
        type: "fill",
        source: "mapforge-polygons",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": ["get", "opacity"]
        }
      });

      map.on("click", "mapforge-polygons-fill", (e) => {
        const feat = e.features?.[0];
        if (!feat || !feat.properties) return;
        const id = feat.properties.id;
        if (!id) return;

        if (activeToolRef.current === "eraser") {
          deleteAnnotation(id);
          if (isConnectedRef.current) submitOperation("delete", id);
        } else if (activeToolRef.current === "select") {
          selectAnnotation(id);
        }
      });

      map.on("mouseenter", "mapforge-polygons-fill", () => {
        if (activeToolRef.current === "select" || activeToolRef.current === "eraser") {
          map.getCanvas().style.cursor = "pointer";
        }
      });
      map.on("mouseleave", "mapforge-polygons-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    if (!map.getLayer("mapforge-polygons-stroke")) {
      map.addLayer({
        id: "mapforge-polygons-stroke",
        type: "line",
        source: "mapforge-polygons",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "strokeWidth"],
          "line-opacity": ["get", "opacity"]
        }
      });
    }

    if (!map.getLayer("mapforge-drawing-preview-layer")) {
      map.addLayer({
        id: "mapforge-drawing-preview-layer",
        type: "line",
        source: "mapforge-drawing-preview",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#3B82F6",
          "line-width": 4,
          "line-opacity": 0.9
        }
      });
    }
  }, [deleteAnnotation, selectAnnotation, submitOperation]);

  // 1. Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = currentMap?.camera?.center
      ? [currentMap.camera.center.lng, currentMap.camera.center.lat]
      : [77.4126, 23.2599]; // Bhopal default
    const initialZoom = currentMap?.camera?.zoom ?? 12;

    const defaultStyle = styleUrl || currentMap?.styleUrl || "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    const map = new maplibreGl.Map({
      container: mapContainerRef.current,
      style: defaultStyle.startsWith("http")
        ? defaultStyle
        : {
            version: 8,
            sources: {
              "osm-tiles": {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors"
              }
            },
            layers: [
              {
                id: "osm-tiles-layer",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19
              }
            ]
          },
      center: initialCenter as [number, number],
      zoom: initialZoom,
      attributionControl: { compact: false }
    });

    map.addControl(new maplibreGl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibreGl.FullscreenControl(), "bottom-right");

    map.on("load", () => {
      setupLayers(map);
      updateGeoJsonSources(map, annotationsRef.current);
      mapInstanceRef.current = map;
      setForceUpdate((n) => n + 1);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [setupLayers, updateGeoJsonSources]);

  // 2. Handle styleUrl changes dynamically while preserving all sources & layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !styleUrl) return;

    const onStyleLoad = () => {
      setupLayers(map);
      updateGeoJsonSources(map, annotationsRef.current);
    };

    map.once("style.load", onStyleLoad);

    if (styleUrl.startsWith("http")) {
      map.setStyle(styleUrl);
    } else {
      map.setStyle({
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [
          {
            id: "osm-tiles-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19
          }
        ]
      });
    }
  }, [styleUrl, setupLayers, updateGeoJsonSources]);

  // Fly to target coordinates when searched in GeocodingSearch
  useEffect(() => {
    if (targetCoordinates && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [targetCoordinates.lng, targetCoordinates.lat],
        zoom: 14,
        essential: true
      });
    }
  }, [targetCoordinates]);

  // 3. Render HTML markers for points (emojis, icons, dots, text)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    const pointAnnotations = annotations.filter((ann) => ann.geometry.type === "Point");

    pointAnnotations.forEach((ann) => {
      currentMarkerIds.add(ann.id);
      const isSelected = ann.id === selectedId;
      const coords = ann.geometry.coordinates as [number, number];

      let marker = markerInstancesRef.current.get(ann.id);

      if (!marker) {
        // Create marker element
        const el = document.createElement("div");
        el.className = "mapforge-marker-node cursor-pointer transition-transform duration-150 select-none";

        marker = new maplibreGl.Marker({
          element: el,
          draggable: activeTool === "select"
        })
          .setLngLat(coords)
          .addTo(map);

        marker.on("dragend", () => {
          const newLngLat = marker!.getLngLat();
          updateAnnotationGeometry(ann.id, {
            type: "Point",
            coordinates: [newLngLat.lng, newLngLat.lat]
          });
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (activeTool === "eraser") {
            deleteAnnotation(ann.id);
          } else {
            selectAnnotation(ann.id);
          }
        });

        markerInstancesRef.current.set(ann.id, marker);
      } else {
        // Update position if changed
        const currentPos = marker.getLngLat();
        if (currentPos.lng !== coords[0] || currentPos.lat !== coords[1]) {
          marker.setLngLat(coords);
        }
        marker.setDraggable(activeTool === "select");
      }

      // Update marker DOM content & styles
      const el = marker.getElement();
      el.innerHTML = "";

      if (ann.type === "marker") {
        const emoji = ann.properties.emoji || "📍";
        el.innerHTML = `
          <div class="relative group flex items-center justify-center ${isSelected ? "scale-125 z-30" : "hover:scale-110 z-10"}">
            <div class="w-10 h-10 rounded-full shadow-lg border-2 flex items-center justify-center text-xl transition bg-white"
                 style="border-color: ${ann.properties.color || "#3B82F6"};">
              <span>${emoji}</span>
            </div>
            ${
              ann.properties.label
                ? `<div class="absolute -bottom-5 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-900/80 text-white whitespace-nowrap shadow-sm pointer-events-none">
                     ${ann.properties.label}
                   </div>`
                : ""
            }
          </div>
        `;
      } else if (ann.type === "dot") {
        el.innerHTML = `
          <div class="rounded-full shadow-md ${isSelected ? "ring-4 ring-blue-400" : ""}"
               style="width: 14px; height: 14px; background-color: ${ann.properties.color || "#EF4444"}; border: 2px solid white;"></div>
        `;
      } else if (ann.type === "text") {
        el.innerHTML = `
          <div class="px-2 py-1 rounded shadow-md border font-semibold select-none ${isSelected ? "ring-2 ring-blue-500" : ""}"
               style="background-color: white; color: ${ann.properties.color || "#1E293B"}; font-size: ${ann.properties.fontSize || 14}px; border-color: ${ann.properties.color || "#CBD5E1"};">
            ${ann.properties.label || "Text"}
          </div>
        `;
      }
    });

    // Remove obsolete markers
    markerInstancesRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markerInstancesRef.current.delete(id);
      }
    });
  }, [annotations, selectedId, activeTool]);

  // 4. Render GeoJSON Lines and Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    updateGeoJsonSources(map, annotations);
  }, [annotations, updateGeoJsonSources]);

  // 5. Render peer cursors in collaborative room
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentCursorUserIds = new Set<string>();

    cursors.forEach((data, userId) => {
      currentCursorUserIds.add(userId);
      let marker = cursorMarkersRef.current.get(userId);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "flex items-center space-x-1 pointer-events-none z-50";
        el.innerHTML = `
          <svg class="w-5 h-5 text-indigo-600 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3l7 18 3-7 7-3L3 3z"/>
          </svg>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white shadow">${data.name}</span>
        `;

        marker = new maplibreGl.Marker({ element: el }).setLngLat(data.coords).addTo(map);
        cursorMarkersRef.current.set(userId, marker);
      } else {
        marker.setLngLat(data.coords);
      }
    });

    cursorMarkersRef.current.forEach((marker, userId) => {
      if (!currentCursorUserIds.has(userId)) {
        marker.remove();
        cursorMarkersRef.current.delete(userId);
      }
    });
  }, [cursors]);

  // 6. Map Pointer & Interaction Handlers (Drawing & Placing)
  const handlePointerDown = useCallback(
    (e: maplibreGl.MapMouseEvent) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const { lng, lat } = e.lngLat;

      // Freehand drawing mode
      if (activeTool === "freehand") {
        isDrawingRef.current = true;
        map.dragPan.disable();
        activeStrokeCoordsRef.current = [[lng, lat]];

        const previewSource = map.getSource("mapforge-drawing-preview") as maplibreGl.GeoJSONSource;
        if (previewSource) {
          previewSource.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: activeStrokeCoordsRef.current
                }
              }
            ]
          });
        }
      }
    },
    [activeTool]
  );

  const handlePointerMove = useCallback(
    (e: maplibreGl.MapMouseEvent) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const { lng, lat } = e.lngLat;

      // Broadcast cursor in collab room
      if (isConnected) {
        sendCursorMove(lng, lat);
      }

      // Freehand stroke accumulation
      if (isDrawingRef.current && activeTool === "freehand") {
        activeStrokeCoordsRef.current.push([lng, lat]);

        const previewSource = map.getSource("mapforge-drawing-preview") as maplibreGl.GeoJSONSource;
        if (previewSource) {
          previewSource.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: activeStrokeCoordsRef.current
                }
              }
            ]
          });
        }
      }
    },
    [activeTool, isConnected, sendCursorMove]
  );

  const handlePointerUp = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isDrawingRef.current && activeTool === "freehand") {
      isDrawingRef.current = false;
      map.dragPan.enable();

      const rawCoords = activeStrokeCoordsRef.current;
      if (rawCoords.length >= 2) {
        // Simplify stroke points with RDP while strictly preserving geographic fidelity
        const simplified = simplifyCoordinates(rawCoords, 0.00003);

        const newId = crypto.randomUUID
          ? crypto.randomUUID()
          : `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const newStroke: MapAnnotation = {
          id: newId,
          mapId: currentMap?.id || "",
          type: "freehand",
          geometry: {
            type: "LineString",
            coordinates: simplified
          },
          properties: {
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            opacity: activeOpacity,
            category: activeCategory
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };

        addAnnotation(newStroke);

        if (isConnected) {
          submitOperation("create", newId, newStroke);
        }
      }

      // Clear preview
      activeStrokeCoordsRef.current = [];
      const previewSource = map.getSource("mapforge-drawing-preview") as maplibreGl.GeoJSONSource;
      if (previewSource) {
        previewSource.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [
    activeTool,
    activeColor,
    activeStrokeWidth,
    activeOpacity,
    activeCategory,
    currentMap,
    addAnnotation,
    isConnected,
    submitOperation
  ]);

  const handleClick = useCallback(
    (e: maplibreGl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      // 1. Point markers (emoji, dot, text)
      if (activeTool === "marker" || activeTool === "dot" || activeTool === "text") {
        const newId = crypto.randomUUID
          ? crypto.randomUUID()
          : `pt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const newAnnotation: MapAnnotation = {
          id: newId,
          mapId: currentMap?.id || "",
          type: activeTool,
          geometry: {
            type: "Point",
            coordinates: [lng, lat] // exact stable geographic coordinate!
          },
          properties: {
            emoji: activeEmoji,
            color: activeColor,
            category: activeCategory,
            label: activeTool === "text" ? "Label text" : "",
            fontSize: fontSize
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };

        addAnnotation(newAnnotation);

        if (isConnected) {
          submitOperation("create", newId, newAnnotation);
        }
      }

      // 2. Polygon multi-point click
      if (activeTool === "polygon") {
        const points = polygonPointsRef.current;
        points.push([lng, lat]);

        if (points.length >= 3) {
          // Closed ring: duplicate first point to close Polygon
          const closedRing = [...points, points[0]];

          const newId = crypto.randomUUID
            ? crypto.randomUUID()
            : `poly_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          const newPolygon: MapAnnotation = {
            id: newId,
            mapId: currentMap?.id || "",
            type: "polygon",
            geometry: {
              type: "Polygon",
              coordinates: [closedRing]
            },
            properties: {
              color: activeColor,
              fillColor: activeFillColor,
              strokeWidth: activeStrokeWidth,
              opacity: activeOpacity,
              category: activeCategory
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          };

          addAnnotation(newPolygon);
          polygonPointsRef.current = [];

          if (isConnected) {
            submitOperation("create", newId, newPolygon);
          }
        }
      }

      // 3. Line click (2 points)
      if (activeTool === "line") {
        const points = polygonPointsRef.current;
        points.push([lng, lat]);

        if (points.length === 2) {
          const newId = crypto.randomUUID
            ? crypto.randomUUID()
            : `line_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          const newLine: MapAnnotation = {
            id: newId,
            mapId: currentMap?.id || "",
            type: "line",
            geometry: {
              type: "LineString",
              coordinates: points
            },
            properties: {
              color: activeColor,
              strokeWidth: activeStrokeWidth,
              opacity: activeOpacity,
              category: activeCategory
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          };

          addAnnotation(newLine);
          polygonPointsRef.current = [];

          if (isConnected) {
            submitOperation("create", newId, newLine);
          }
        }
      }
    },
    [
      activeTool,
      activeEmoji,
      activeColor,
      activeCategory,
      fontSize,
      activeFillColor,
      activeStrokeWidth,
      activeOpacity,
      currentMap,
      addAnnotation,
      isConnected,
      submitOperation
    ]
  );

  // Attach event listeners
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.on("mousedown", handlePointerDown);
    map.on("mousemove", handlePointerMove);
    map.on("mouseup", handlePointerUp);
    map.on("touchstart", handlePointerDown);
    map.on("touchmove", handlePointerMove);
    map.on("touchend", handlePointerUp);
    map.on("click", handleClick);

    return () => {
      map.off("mousedown", handlePointerDown);
      map.off("mousemove", handlePointerMove);
      map.off("mouseup", handlePointerUp);
      map.off("touchstart", handlePointerDown);
      map.off("touchmove", handlePointerMove);
      map.off("touchend", handlePointerUp);
      map.off("click", handleClick);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleClick]);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
      <div
        ref={mapContainerRef}
        className="w-full h-full touch-manipulation"
        style={{ touchAction: activeTool === "freehand" ? "none" : "auto" }}
      />
    </div>
  );
};
