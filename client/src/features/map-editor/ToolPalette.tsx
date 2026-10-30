import React, { useState } from "react";
import {
  MousePointer,
  Smile,
  Circle,
  Type,
  Pencil,
  Minus,
  Hexagon,
  Eraser,
  Sliders
} from "lucide-react";
import { useEditorStore } from "../../stores/editorStore.js";
import { ColorPicker } from "../../components/common/ColorPicker.js";
import { EmojiPicker } from "../../components/common/EmojiPicker.js";
import { EditorTool } from "../../types/index.js";

export const ToolPalette: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    activeStrokeWidth,
    setActiveStrokeWidth,
    activeOpacity,
    setActiveOpacity,
    activeEmoji,
    setActiveEmoji,
    setActiveCategory
  } = useEditorStore();

  const [showEmojiPopover, setShowEmojiPopover] = useState(false);
  const [showStylePopover, setShowStylePopover] = useState(false);

  const tools: Array<{ id: EditorTool; label: string; icon: React.ReactNode }> = [
    { id: "select", label: "Select & Move", icon: <MousePointer className="w-5 h-5" /> },
    { id: "marker", label: "Emoji Marker", icon: <Smile className="w-5 h-5" /> },
    { id: "dot", label: "Dot Marker", icon: <Circle className="w-5 h-5" /> },
    { id: "text", label: "Text Label", icon: <Type className="w-5 h-5" /> },
    { id: "freehand", label: "Freehand Brush", icon: <Pencil className="w-5 h-5" /> },
    { id: "line", label: "Line", icon: <Minus className="w-5 h-5" /> },
    { id: "polygon", label: "Polygon", icon: <Hexagon className="w-5 h-5" /> },
    { id: "eraser", label: "Eraser", icon: <Eraser className="w-5 h-5" /> }
  ];

  const handleToolSelect = (toolId: EditorTool) => {
    setActiveTool(toolId);
    if (toolId === "marker") {
      setShowEmojiPopover(true);
      setShowStylePopover(false);
    } else {
      setShowEmojiPopover(false);
    }
  };

  return (
    <div className="absolute left-4 top-20 z-20 flex flex-col items-center">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-1.5 flex flex-col space-y-1">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              title={tool.label}
              className={`p-2.5 rounded-xl transition flex items-center justify-center relative group ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tool.icon}

              {/* Tooltip on hover */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-50">
                {tool.label}
              </div>
            </button>
          );
        })}

        <div className="my-1 border-t border-slate-200" />

        {/* Style Options Toggle */}
        <button
          onClick={() => {
            setShowStylePopover(!showStylePopover);
            setShowEmojiPopover(false);
          }}
          title="Color & Stroke Options"
          className={`p-2.5 rounded-xl transition flex items-center justify-center ${
            showStylePopover ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sliders className="w-5 h-5" />
        </button>

        {/* Current Active Color Preview Dot */}
        <div
          style={{ backgroundColor: activeColor }}
          className="w-4 h-4 rounded-full border border-white shadow-sm mt-1 mx-auto"
          title={`Active color: ${activeColor}`}
        />
      </div>

      {/* Popovers */}
      {showEmojiPopover && (
        <div className="absolute left-full ml-4 top-12 z-50 animate-fade-in">
          <EmojiPicker
            selectedEmoji={activeEmoji}
            onSelect={(emoji, category) => {
              setActiveEmoji(emoji);
              if (category) setActiveCategory(category);
              setShowEmojiPopover(false);
            }}
          />
        </div>
      )}

      {showStylePopover && (
        <div className="absolute left-full ml-4 top-36 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 space-y-4 animate-fade-in">
          <ColorPicker
            label="Stroke / Marker Color"
            value={activeColor}
            onChange={(color) => setActiveColor(color)}
          />

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Stroke Width</span>
              <span className="text-slate-700">{activeStrokeWidth}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={16}
              value={activeStrokeWidth}
              onChange={(e) => setActiveStrokeWidth(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Opacity</span>
              <span className="text-slate-700">{Math.round(activeOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={activeOpacity}
              onChange={(e) => setActiveOpacity(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      )}
    </div>
  );
};
