import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Share2,
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
  Search,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEditorStore } from "../../stores/editorStore.js";
import { useRoomStore } from "../../stores/roomStore.js";
import { GeocodingSearch } from "./GeocodingSearch.js";
import { LayerControl } from "./LayerControl.js";
import { apiRequest } from "../../lib/api.js";

interface EditorToolbarProps {
  onOpenShare: () => void;
  onOpenRoom: () => void;
  onOpenMerge: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
  currentStyleUrl: string;
  onStyleChange: (styleUrl: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onOpenShare,
  onOpenRoom,
  onOpenMerge,
  onSelectLocation,
  currentStyleUrl,
  onStyleChange
}) => {
  const {
    currentMap,
    setCurrentMap,
    saveStatus,
    undo,
    redo,
    historyIndex,
    history
  } = useEditorStore();

  const { activeRoom, isConnected } = useRoomStore();

  const [mapName, setMapName] = useState(currentMap?.name || "Untitled Map");
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleRename = async () => {
    setIsEditingName(false);
    if (!currentMap || !mapName.trim() || mapName === currentMap.name) return;

    try {
      const updated = await apiRequest(`/maps/${currentMap.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: mapName.trim() })
      });
      setCurrentMap(updated);
    } catch (err) {
      console.error("Failed to rename map:", err);
      setMapName(currentMap.name);
    }
  };

  return (
    <>
      <div className="h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur px-2.5 sm:px-4 flex items-center justify-between z-20 shadow-sm gap-1 sm:gap-2">
        {/* Left: Back to Dashboard & Map Title */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
          <Link
            to="/"
            title="Back to Dashboard"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center space-x-1.5 min-w-0">
            {isEditingName ? (
              <input
                type="text"
                value={mapName}
                autoFocus
                onChange={(e) => setMapName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setIsEditingName(false);
                    setMapName(currentMap?.name || "Untitled");
                  }
                }}
                className="text-sm sm:text-base font-bold text-slate-800 border-b border-blue-500 focus:outline-none bg-transparent px-1 max-w-[120px] sm:max-w-xs"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                title="Click to rename"
                className="text-sm sm:text-base font-bold text-slate-800 hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition flex items-center space-x-1 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs"
              >
                <span className="truncate">{currentMap?.name || "Untitled Map"}</span>
              </h1>
            )}

            {/* Real-time Room Active Badge */}
            {activeRoom && (
              <div className="hidden xs:flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Room:</span>
                <span>{activeRoom.code}</span>
              </div>
            )}

            {/* Auto-save Status Indicator */}
            <div className="hidden md:flex items-center space-x-1 px-1.5 py-0.5 text-xs text-slate-500 shrink-0">
              {saveStatus === "saved" && (
                <span className="flex items-center space-x-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Saved</span>
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="flex items-center space-x-1 text-blue-600 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden lg:inline">Saving...</span>
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center space-x-1 text-amber-600 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Unsaved</span>
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center space-x-1 text-red-600 font-medium" title="Retry auto-save">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Error</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Desktop Geocoding Search */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-xs lg:max-w-sm px-2">
          <GeocodingSearch onSelectLocation={onSelectLocation} />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            title="Search places"
            className="md:hidden p-2 rounded-lg text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition"
          >
            {showMobileSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1 sm:p-1.5 rounded text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1 sm:p-1.5 rounded text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            >
              <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Map Base Layers */}
          <LayerControl currentStyleUrl={currentStyleUrl} onStyleChange={onStyleChange} />

          {/* Merge Maps */}
          <button
            onClick={onOpenMerge}
            title="Merge Maps"
            className="flex items-center space-x-1 p-2 sm:px-3 sm:py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Merge</span>
          </button>

          {/* Real-time Collaboration Room */}
          <button
            onClick={onOpenRoom}
            title="Collaborative Room"
            className={`flex items-center space-x-1 p-2 sm:px-3 sm:py-1.5 border rounded-lg text-xs font-semibold shadow-sm transition ${
              activeRoom
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{activeRoom ? "Room" : "Collab"}</span>
          </button>

          {/* Share */}
          <button
            onClick={onOpenShare}
            title="Share map link or copy"
            className="flex items-center space-x-1 p-2 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/20 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Dropdown Bar */}
      {showMobileSearch && (
        <div className="md:hidden bg-white/98 backdrop-blur border-b border-slate-200 p-2.5 z-20 shadow-md animate-fade-in flex items-center justify-center">
          <div className="w-full">
            <GeocodingSearch
              onSelectLocation={(lat, lng) => {
                onSelectLocation(lat, lng);
                setShowMobileSearch(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
