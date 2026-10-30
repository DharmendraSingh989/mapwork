import React from "react";
import { X, Trash2, Copy, MapPin, Tag } from "lucide-react";
import { useEditorStore } from "../../stores/editorStore.js";
import { ColorPicker } from "../../components/common/ColorPicker.js";
import { CATEGORIES } from "@mapforge/shared";

export const PropertyPanel: React.FC = () => {
  const {
    selectedId,
    annotations,
    selectAnnotation,
    updateAnnotationProps,
    deleteAnnotation,
    duplicateSelected
  } = useEditorStore();

  if (!selectedId) return null;

  const selectedAnnotation = annotations.find((ann) => ann.id === selectedId);
  if (!selectedAnnotation) return null;

  const isPoint = selectedAnnotation.geometry.type === "Point";
  const coords = isPoint
    ? (selectedAnnotation.geometry.coordinates as [number, number])
    : null;

  return (
    <div className="absolute right-4 top-20 z-20 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-5 flex flex-col space-y-4 animate-fade-in max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">
            {selectedAnnotation.properties.emoji || "📍"}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800 capitalize">
              {selectedAnnotation.type} Properties
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              ID: {selectedAnnotation.id.substring(0, 8)}...
            </span>
          </div>
        </div>
        <button
          onClick={() => selectAnnotation(null)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Label / Title */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Label / Name
        </label>
        <input
          type="text"
          value={selectedAnnotation.properties.label || ""}
          onChange={(e) => updateAnnotationProps(selectedAnnotation.id, { label: e.target.value })}
          placeholder="e.g. Bharat Petrol Pump, Cafe..."
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
          <Tag className="w-3 h-3 text-slate-400" />
          <span>Category</span>
        </label>
        <select
          value={selectedAnnotation.properties.category || "general"}
          onChange={(e) => updateAnnotationProps(selectedAnnotation.id, { category: e.target.value })}
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 capitalize"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Notes / Description
        </label>
        <textarea
          rows={2}
          value={selectedAnnotation.properties.description || ""}
          onChange={(e) => updateAnnotationProps(selectedAnnotation.id, { description: e.target.value })}
          placeholder="Additional notes about this location..."
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Color Selection */}
      <ColorPicker
        label="Color"
        value={selectedAnnotation.properties.color || "#3B82F6"}
        onChange={(color) => updateAnnotationProps(selectedAnnotation.id, { color })}
      />

      {/* Stroke Width (for lines, freehand, polygons) */}
      {!isPoint && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Stroke Width</span>
            <span className="text-slate-700">{selectedAnnotation.properties.strokeWidth || 3}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={16}
            value={selectedAnnotation.properties.strokeWidth || 3}
            onChange={(e) =>
              updateAnnotationProps(selectedAnnotation.id, { strokeWidth: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      )}

      {/* Geographic Coordinates Display (Read-Only Verification) */}
      {coords && (
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1">
          <div className="flex items-center space-x-1 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>Geographic Coordinates</span>
          </div>
          <div className="text-xs font-mono text-slate-700">
            Lat: {coords[1].toFixed(6)}, Lng: {coords[0].toFixed(6)}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
        <button
          onClick={duplicateSelected}
          className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center space-x-1.5"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate</span>
        </button>
        <button
          onClick={() => deleteAnnotation(selectedAnnotation.id)}
          className="py-2 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition flex items-center justify-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
