import React, { useState, useRef, useEffect } from "react";
import { Layers } from "lucide-react";
import { MAP_STYLES } from "@mapforge/shared";

interface LayerControlProps {
  currentStyleUrl: string;
  onStyleChange: (styleUrl: string) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({ currentStyleUrl, onStyleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Map Base Styles"
        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm text-slate-700 transition flex items-center justify-center"
      >
        <Layers className="w-4 h-4 text-blue-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Map Tile Layers
          </div>
          <div className="space-y-1 mt-1">
            {MAP_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  onStyleChange(style.url);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                  currentStyleUrl === style.url
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{style.name}</span>
                {currentStyleUrl === style.url && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
