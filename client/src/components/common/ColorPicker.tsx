import React from "react";
import { PRESET_COLORS } from "@mapforge/shared";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  return (
    <div className="flex flex-col space-y-1.5">
      {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={`w-6 h-6 rounded-full border transition transform hover:scale-110 ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-blue-500 ring-offset-2 scale-110 border-white shadow-sm"
                : "border-slate-300"
            }`}
          />
        ))}
        <div className="relative flex items-center">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0"
          />
          <div
            style={{ backgroundColor: value }}
            className="w-6 h-6 rounded-full border border-slate-300 shadow-inner flex items-center justify-center text-[10px] text-white font-bold"
            title="Custom Hex Color"
          >
            +
          </div>
        </div>
      </div>
    </div>
  );
};
