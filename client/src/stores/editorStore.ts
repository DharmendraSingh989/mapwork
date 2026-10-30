import { create } from "zustand";
import {
  EditorTool,
  SaveStatus,
  MapAnnotation,
  MapItem,
  AnnotationProperties
} from "../types/index.js";
import { PRESET_COLORS, PRESET_EMOJIS, CATEGORIES } from "@mapforge/shared";
import { apiRequest } from "../lib/api.js";

interface HistoryEntry {
  description: string;
  annotations: MapAnnotation[];
}

interface EditorState {
  // Map and Annotations
  currentMap: MapItem | null;
  annotations: MapAnnotation[];
  selectedId: string | null;

  // Active Tool and Settings
  activeTool: EditorTool;
  activeColor: string;
  activeFillColor: string;
  activeStrokeWidth: number;
  activeOpacity: number;
  activeEmoji: string;
  activeCategory: string;
  fontSize: number;

  // Status and History
  saveStatus: SaveStatus;
  saveErrorMessage: string | null;
  history: HistoryEntry[];
  historyIndex: number;

  // Unsaved operations queue
  pendingChanges: boolean;
  deletedAnnotationIds: string[];

  // Actions
  setCurrentMap: (map: MapItem) => void;
  setAnnotations: (annotations: MapAnnotation[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveColor: (color: string) => void;
  setActiveFillColor: (fillColor: string) => void;
  setActiveStrokeWidth: (width: number) => void;
  setActiveOpacity: (opacity: number) => void;
  setActiveEmoji: (emoji: string) => void;
  setActiveCategory: (category: string) => void;
  setFontSize: (size: number) => void;
  selectAnnotation: (id: string | null) => void;

  // Annotation Manipulation
  addAnnotation: (annotation: MapAnnotation) => void;
  updateAnnotationProps: (id: string, props: Partial<AnnotationProperties>) => void;
  updateAnnotationGeometry: (id: string, geometry: any) => void;
  deleteAnnotation: (id: string) => void;
  duplicateSelected: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string, newAnnotations: MapAnnotation[]) => void;

  // Persistence
  savePendingChanges: () => Promise<void>;
  setSaveStatus: (status: SaveStatus, error?: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentMap: null,
  annotations: [],
  selectedId: null,

  activeTool: "select",
  activeColor: PRESET_COLORS[0],
  activeFillColor: "#3B82F633",
  activeStrokeWidth: 3,
  activeOpacity: 1,
  activeEmoji: PRESET_EMOJIS[0].emoji,
  activeCategory: CATEGORIES[0],
  fontSize: 16,

  saveStatus: "saved",
  saveErrorMessage: null,
  history: [],
  historyIndex: -1,
  pendingChanges: false,
  deletedAnnotationIds: [],

  setCurrentMap: (map) => {
    set({
      currentMap: map,
      annotations: [],
      selectedId: null,
      history: [],
      historyIndex: -1,
      saveStatus: "saved",
      pendingChanges: false,
      deletedAnnotationIds: []
    });
  },

  setAnnotations: (annotations) => {
    set({
      annotations,
      history: [{ description: "Initial Load", annotations }],
      historyIndex: 0
    });
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveFillColor: (fillColor) => set({ activeFillColor: fillColor }),
  setActiveStrokeWidth: (width) => set({ activeStrokeWidth: width }),
  setActiveOpacity: (opacity) => set({ activeOpacity: opacity }),
  setActiveEmoji: (emoji) => set({ activeEmoji: emoji }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setFontSize: (size) => set({ fontSize: size }),
  selectAnnotation: (id) => set({ selectedId: id }),

  pushHistory: (description, newAnnotations) => {
    const { history, historyIndex } = get();
    const truncatedHistory = history.slice(0, historyIndex + 1);
    const updatedHistory = [...truncatedHistory, { description, annotations: newAnnotations }].slice(-50); // max 50 states

    set({
      annotations: newAnnotations,
      history: updatedHistory,
      historyIndex: updatedHistory.length - 1,
      pendingChanges: true,
      saveStatus: "unsaved"
    });

    // Auto-save debounced
    get().savePendingChanges();
  },

  addAnnotation: (annotation) => {
    const newAnnotations = [...get().annotations, annotation];
    get().pushHistory(`Add ${annotation.type}`, newAnnotations);
    set({ selectedId: annotation.id });
  },

  updateAnnotationProps: (id, props) => {
    const newAnnotations = get().annotations.map((ann) => {
      if (ann.id === id) {
        return {
          ...ann,
          properties: { ...ann.properties, ...props },
          updatedAt: new Date().toISOString()
        };
      }
      return ann;
    });

    get().pushHistory("Update Properties", newAnnotations);
  },

  updateAnnotationGeometry: (id, geometry) => {
    const newAnnotations = get().annotations.map((ann) => {
      if (ann.id === id) {
        return {
          ...ann,
          geometry,
          updatedAt: new Date().toISOString()
        };
      }
      return ann;
    });

    get().pushHistory("Update Geometry", newAnnotations);
  },

  deleteAnnotation: (id) => {
    const newAnnotations = get().annotations.filter((ann) => ann.id !== id);
    set({ deletedAnnotationIds: [...get().deletedAnnotationIds, id] });
    get().pushHistory("Delete Annotation", newAnnotations);
    if (get().selectedId === id) {
      set({ selectedId: null });
    }
  },

  duplicateSelected: () => {
    const { selectedId, annotations } = get();
    if (!selectedId) return;

    const target = annotations.find((ann) => ann.id === selectedId);
    if (!target) return;

    const clonedGeometry = JSON.parse(JSON.stringify(target.geometry));
    // Offset slightly for visual identification if it's a point
    if (clonedGeometry.type === "Point") {
      clonedGeometry.coordinates[0] += 0.001; // slight longitude shift
      clonedGeometry.coordinates[1] += 0.001; // slight latitude shift
    }

    const newId = crypto.randomUUID
      ? crypto.randomUUID()
      : `ann_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const duplicatedAnnotation: MapAnnotation = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      geometry: clonedGeometry,
      properties: {
        ...target.properties,
        label: target.properties.label ? `${target.properties.label} (Copy)` : "Copy"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    get().addAnnotation(duplicatedAnnotation);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      set({
        annotations: targetState.annotations,
        historyIndex: historyIndex - 1,
        pendingChanges: true,
        saveStatus: "unsaved"
      });
      get().savePendingChanges();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      set({
        annotations: targetState.annotations,
        historyIndex: historyIndex + 1,
        pendingChanges: true,
        saveStatus: "unsaved"
      });
      get().savePendingChanges();
    }
  },

  savePendingChanges: async () => {
    const { currentMap, annotations, deletedAnnotationIds } = get();
    if (!currentMap) return;

    set({ saveStatus: "saving", saveErrorMessage: null });

    try {
      // Use batch endpoint to sync all current annotations and deletions
      await apiRequest(`/maps/${currentMap.id}/annotations/batch`, {
        method: "POST",
        body: JSON.stringify({
          create: annotations.map((ann) => ({
            id: ann.id,
            type: ann.type,
            geometry: ann.geometry,
            properties: ann.properties
          })),
          delete: deletedAnnotationIds
        })
      });

      set({ saveStatus: "saved", pendingChanges: false, deletedAnnotationIds: [] });
    } catch (err: any) {
      console.error("Auto-save error:", err);
      set({ saveStatus: "error", saveErrorMessage: err.message || "Failed to save changes" });
    }
  },

  setSaveStatus: (status, error) => set({ saveStatus: status, saveErrorMessage: error || null })
}));
