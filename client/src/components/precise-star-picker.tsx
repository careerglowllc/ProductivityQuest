import { useRef, useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { STAR_MAX, nudgeRating, parseRatingInput, ratingFromPosition, snapRating } from "@/lib/star-rating";

// Five stars you can click or drag across to set an exact rating (to the tenth), with a number box that
// shows the live value and accepts typing too.
export function PreciseStarPicker({ value, onChange, label, max = STAR_MAX }: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  max?: number;
}) {
  const { isDark } = useTheme();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const rating = snapRating(value, max);
  // Inline colours so the light-theme class overrides can't turn the empty stars dark.
  const emptyColor = isDark ? "#475569" : "#cbd5e1";
  const filledColor = isDark ? "#facc15" : "#f59e0b";

  const setFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) onChange(ratingFromPosition(clientX, rect.left, rect.width, max));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.5 : 0.1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? nudgeRating(rating, step, max)
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? nudgeRating(rating, -step, max)
      : event.key === "Home" ? 0
      : event.key === "End" ? max
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <span className="inline-flex items-center gap-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={rating}
        aria-valuetext={`${rating.toFixed(1)} out of ${max}`}
        data-testid="star-track"
        className="relative inline-block cursor-pointer touch-none select-none whitespace-nowrap rounded text-2xl leading-none tracking-[0.12em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setFromPointer(event.clientX);
        }}
        onPointerMove={(event) => { if (dragging.current) setFromPointer(event.clientX); }}
        onPointerUp={(event) => {
          dragging.current = false;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={onKeyDown}
      >
        <span aria-hidden style={{ color: emptyColor }}>{"★".repeat(max)}</span>
        <span
          aria-hidden
          data-testid="star-fill"
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${(rating / max) * 100}%`, color: filledColor }}
        >
          {"★".repeat(max)}
        </span>
      </div>
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${label} rating`}
        data-testid="star-value"
        value={draft ?? rating.toFixed(1)}
        onChange={(event) => {
          setDraft(event.target.value);
          const typed = parseRatingInput(event.target.value, max);
          if (typed !== null) onChange(typed);
        }}
        onBlur={() => setDraft(null)}
        className="h-8 w-14 rounded-md border border-pink-500/30 bg-slate-800/50 px-1 text-center text-sm tabular-nums text-white"
      />
    </span>
  );
}
