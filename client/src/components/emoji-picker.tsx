import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Common": [
    "📝", "📋", "📌", "📎", "✏️", "🖊️", "📖", "📚", "💡", "🎯",
    "⭐", "🌟", "💪", "🚀", "🔥", "⚡", "💎", "🏆", "🎉", "✅",
    "❤️", "💛", "💚", "💙", "💜", "🤍", "🖤", "🧡", "💗", "❗",
  ],
  "Work": [
    "💼", "🏢", "💻", "🖥️", "📊", "📈", "📉", "📧", "📞", "🗂️",
    "📁", "📂", "🗃️", "🗄️", "📇", "📅", "📆", "🗓️", "⏰", "⏳",
    "🔔", "📣", "📢", "💰", "💵", "🏦", "🤝", "👔", "🎤", "📱",
  ],
  "Health": [
    "🏃", "🧘", "💊", "🩺", "🏋️", "🚴", "🏊", "🧠", "😴", "🍎",
    "🥗", "💧", "🫁", "❤️‍🩹", "🦷", "👁️", "🩻", "💉", "🧬", "🌿",
  ],
  "Learning": [
    "📖", "📚", "🎓", "🧪", "🔬", "🔭", "🌍", "🗺️", "💻", "🎨",
    "🎵", "🎹", "🎸", "📐", "📏", "🧮", "🔢", "🔤", "✍️", "📝",
  ],
  "Life": [
    "🏠", "🏡", "🛒", "🧹", "🧺", "🍳", "🚗", "✈️", "🌅", "🌄",
    "🎂", "🎁", "👨‍👩‍👧‍👦", "🐶", "🐱", "🌸", "🌻", "🌈", "☀️", "🌙",
  ],
  "Fun": [
    "🎮", "🎲", "🎭", "🎬", "📺", "🎵", "🎶", "🎪", "🎠", "⚽",
    "🏀", "🎾", "🏈", "⛳", "🎳", "🎯", "🃏", "🧩", "📸", "🎨",
  ],
  "Food": [
    "☕", "🍕", "🍔", "🍜", "🍣", "🥑", "🍓", "🍰", "🍪", "🧁",
    "🥤", "🍷", "🍺", "🫖", "🥐", "🌮", "🍱", "🥘", "🍝", "🫕",
  ],
  "Nature": [
    "🌳", "🌲", "🌴", "🌵", "🌊", "🏔️", "⛰️", "🌋", "🏝️", "🌤️",
    "🌧️", "⛈️", "❄️", "🌪️", "🌀", "🦋", "🐝", "🌺", "🍀", "🍂",
  ],
  "Symbols": [
    "⚙️", "🔧", "🔨", "🛠️", "⚒️", "🔩", "🔑", "🗝️", "🔒", "🔓",
    "📍", "🏷️", "🔖", "📌", "💬", "💭", "🗨️", "⚠️", "🚫", "♻️",
  ],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  size?: "sm" | "md" | "lg";
}

export function EmojiPicker({ value, onChange, size = "md" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Common");

  const sizeClasses = {
    sm: "text-lg w-8 h-8",
    md: "text-2xl w-10 h-10",
    lg: "text-3xl w-12 h-12",
  };

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearch("");
  };

  // Flatten all emojis for search
  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const uniqueEmojis = Array.from(new Set(allEmojis));

  const displayedEmojis = search
    ? uniqueEmojis // Show all when searching (emoji search is just browsing)
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`${sizeClasses[size]} flex items-center justify-center rounded-md hover:bg-slate-700/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/40`}
          title="Change emoji"
        >
          {value || "📝"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 bg-slate-900 border-yellow-600/30"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 pb-2">
          <Input
            placeholder="Browse emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-slate-800/50 border-yellow-600/20 text-yellow-100 text-sm placeholder:text-yellow-200/30"
            autoFocus
          />
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="px-3 pb-2">
            <div className="flex gap-1 overflow-x-auto">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-1 text-[10px] rounded-md whitespace-nowrap transition-colors ${
                      activeCategory === cat
                        ? "bg-yellow-600/30 text-yellow-200 font-medium"
                        : "text-yellow-400/60 hover:text-yellow-300 hover:bg-slate-800/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Emoji grid */}
        <div className="h-[200px] overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-8 gap-1">
            {displayedEmojis.map((emoji, idx) => (
              <button
                key={`${emoji}-${idx}`}
                onClick={() => handleSelect(emoji)}
                className={`w-8 h-8 flex items-center justify-center text-lg rounded-md hover:bg-yellow-600/20 transition-colors ${
                  value === emoji ? "bg-yellow-600/30 ring-1 ring-yellow-500/50" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
