import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MapItem, MapAnnotation } from "@mapforge/shared";
import { apiRequest } from "../../lib/api.js";
import { useEditorStore } from "../../stores/editorStore.js";
import { useRoomStore } from "../../stores/roomStore.js";
import { useNotificationStore } from "../../stores/notificationStore.js";
import { EditorToolbar } from "./EditorToolbar.js";
import { ToolPalette } from "./ToolPalette.js";
import { PropertyPanel } from "./PropertyPanel.js";
import { MapCanvas } from "./MapCanvas.js";
import { ShareDialog } from "../map-sharing/ShareDialog.js";
import { RoomModal } from "../collaborative-rooms/RoomModal.js";
import { MergeDialog } from "../map-merge/MergeDialog.js";

export const MapEditorView: React.FC = () => {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();

  const {
    currentMap,
    setCurrentMap,
    setAnnotations,
    undo,
    redo,
    selectedId,
    deleteAnnotation,
    selectAnnotation
  } = useEditorStore();

  const { isConnected } = useRoomStore();
  const { showToast } = useNotificationStore();

  const [isLoading, setIsLoading] = useState(true);
  const [styleUrl, setStyleUrl] = useState<string>("");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [targetCoordinates, setTargetCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Load map and annotations
  useEffect(() => {
    if (!mapId) return;

    setIsLoading(true);
    Promise.all([
      apiRequest<MapItem>(`/maps/${mapId}`),
      apiRequest<MapAnnotation[]>(`/maps/${mapId}/annotations`)
    ])
      .then(([mapData, annotationsData]) => {
        setCurrentMap(mapData);
        setAnnotations(annotationsData);
        setStyleUrl(mapData.styleUrl);
      })
      .catch((err) => {
        showToast("error", "Failed to load map", err.message);
        navigate("/");
      })
      .finally(() => setIsLoading(false));
  }, [mapId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteAnnotation(selectedId);
        }
      } else if (e.key === "Escape") {
        selectAnnotation(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedId, deleteAnnotation, selectAnnotation]);

  const handleSelectLocation = (lat: number, lng: number) => {
    setTargetCoordinates({ lat, lng });
  };

  if (isLoading || !currentMap) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Initializing MapForge Studio...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Top Editor Toolbar */}
      <EditorToolbar
        onOpenShare={() => setIsShareOpen(true)}
        onOpenRoom={() => setIsRoomOpen(true)}
        onOpenMerge={() => setIsMergeOpen(true)}
        onSelectLocation={handleSelectLocation}
        currentStyleUrl={styleUrl}
        onStyleChange={setStyleUrl}
      />

      {/* Main Map Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <MapCanvas styleUrl={styleUrl} targetCoordinates={targetCoordinates} />

        {/* Floating Tool Palette on Left */}
        <ToolPalette />

        {/* Contextual Properties Inspector on Right */}
        <PropertyPanel />
      </div>

      {/* Modals */}
      {currentMap && (
        <>
          <ShareDialog
            isOpen={isShareOpen}
            mapId={currentMap.id}
            onClose={() => setIsShareOpen(false)}
          />
          <RoomModal
            isOpen={isRoomOpen}
            activeMapId={currentMap.id}
            onClose={() => setIsRoomOpen(false)}
          />
          <MergeDialog isOpen={isMergeOpen} onClose={() => setIsMergeOpen(false)} />
        </>
      )}
    </div>
  );
};
