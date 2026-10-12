export const STAR_MAX = 5;

// Ratings are kept to one decimal place; rounding through an integer avoids 0.30000000000000004.
export function snapRating(value: number, max = STAR_MAX): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value * 10) / 10));
}

// Rating under the pointer when the star row spans [left, left + width]. Positions past either end clamp to 0 / max.
export function ratingFromPosition(clientX: number, left: number, width: number, max = STAR_MAX): number {
  if (width <= 0) return 0;
  return snapRating(((clientX - left) / width) * max, max);
}

// Typed text to a rating, or null when it isn't a number in range (so half-typed input like "" or "3." is ignored).
export function parseRatingInput(text: string, max = STAR_MAX): number | null {
  const trimmed = text.trim();
  if (!/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 0 && value <= max ? snapRating(value, max) : null;
}

export const nudgeRating = (value: number, delta: number, max = STAR_MAX): number => snapRating(value + delta, max);
