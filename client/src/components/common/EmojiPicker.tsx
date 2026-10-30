import React, { useState } from "react";
import { PRESET_EMOJIS, CATEGORIES } from "@mapforge/shared";

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string, category?: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ selectedEmoji, onSelect }) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [customEmoji, setCustomEmoji] = useState<string>("");

  const filteredEmojis = activeCategory === "all"
    ? PRESET_EMOJIS
    : PRESET_EMOJIS.filter((e) => e.category === activeCategory);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmoji.trim()) {
      onSelect(customEmoji.trim(), "general");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-3 w-72">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Select Emoji Marker
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`px-2 py-1 rounded-full whitespace-nowrap transition ${
            activeCategory === "all" ? "bg-blue-600 text-white font-medium" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-1 rounded-full whitespace-nowrap capitalize transition ${
              activeCategory === cat ? "bg-blue-600 text-white font-medium" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-5 gap-2 my-2 max-h-40 overflow-y-auto p-1">
        {filteredEmojis.map((item) => (
          <button
            key={item.emoji}
            type="button"
            title={item.name}
            onClick={() => onSelect(item.emoji, item.category)}
            className={`h-10 text-2xl flex items-center justify-center rounded-lg border transition hover:scale-110 ${
              selectedEmoji === item.emoji
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-400"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {/* Custom Emoji Input */}
      <form onSubmit={handleCustomSubmit} className="mt-2 pt-2 border-t border-slate-100 flex items-center space-x-1.5">
        <input
          type="text"
          placeholder="Paste or type any emoji..."
          value={customEmoji}
          onChange={(e) => setCustomEmoji(e.target.value)}
          className="flex-1 text-sm px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition"
        >
          Use
        </button>
      </form>
    </div>
  );
};
