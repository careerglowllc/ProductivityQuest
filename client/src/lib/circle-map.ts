export type Point = [number, number];
export type MapValue = { name: string; value: number; color: string; pct: number };
export type ExternalLabel = { id: string; side: "left" | "right"; desiredY: number };
export type PlacedExternalLabel = ExternalLabel & { y: number };

/**
 * Give callouts a stable reading order without letting adjacent labels collide.
 * The labels may deliberately extend the chart's height when there are many
 * categories; hiding a positive category is worse than making the chart scroll.
 */
export function placeExternalLabels(labels: ExternalLabel[], top: number, bottom: number, gap = 34): PlacedExternalLabel[] {
  return (["left", "right"] as const).flatMap(side => {
    const items = labels.filter(label => label.side === side).sort((a, b) => a.desiredY - b.desiredY);
    if (!items.length) return [];
    const requiredBottom = top + gap * (items.length - 1);
    const usableBottom = Math.max(bottom, requiredBottom);
    const placed = items.map((item, index) => ({
      ...item,
      y: Math.max(top + index * gap, Math.min(item.desiredY, usableBottom - gap * (items.length - 1 - index))),
    }));
    // A backwards pass honors the lower boundary while retaining the minimum gap.
    for (let index = placed.length - 2; index >= 0; index--) {
      placed[index].y = Math.min(placed[index].y, placed[index + 1].y - gap);
    }
    return placed;
  });
}

export function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0)) / 2;
}

function clip(points: Point[], nx: number, ny: number, offset: number, below: boolean): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = a[0] * nx + a[1] * ny - offset;
    const db = b[0] * nx + b[1] * ny - offset;
    const insideA = below ? da <= 0 : da >= 0;
    const insideB = below ? db <= 0 : db >= 0;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = da / (da - db);
      result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return result;
}

/** Area-preserving polygon treemap, recursively partitioned within a circle. */
export function circleMap(values: MapValue[]) {
  const cells: { data: MapValue; points: Point[]; center: Point; radius: number }[] = [];
  const boundary: Point[] = Array.from({ length: 180 }, (_, i) => {
    const angle = i * Math.PI * 2 / 180;
    return [300 + 288 * Math.cos(angle), 300 + 288 * Math.sin(angle)];
  });
  function partition(data: MapValue[], points: Point[], depth: number) {
    if (!data.length) return;
    if (data.length === 1) {
      // Polygon centroid and minimum distance to its edges provide a safe label box.
      let crossSum = 0, x = 0, y = 0;
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length], cross = a[0] * b[1] - b[0] * a[1];
        crossSum += cross;
        x += (a[0] + b[0]) * cross; y += (a[1] + b[1]) * cross;
      });
      const center: Point = [x / (3 * crossSum), y / (3 * crossSum)];
      const radius = Math.min(...points.map((a, i) => {
        const b = points[(i + 1) % points.length];
        return Math.abs((b[0] - a[0]) * (a[1] - center[1]) - (a[0] - center[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
      }));
      cells.push({ data: data[0], points, center, radius });
      return;
    }
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let index = 1, subtotal = data[0].value;
    while (index < data.length - 1 && Math.abs(subtotal + data[index].value - total / 2) < Math.abs(subtotal - total / 2)) {
      subtotal += data[index++].value;
    }
    const width = Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]));
    const height = Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]));
    const angle = (width >= height ? 0 : Math.PI / 2) + (depth % 2 ? -.24 : .24);
    const nx = Math.cos(angle), ny = Math.sin(angle);
    const projections = points.map(p => p[0] * nx + p[1] * ny);
    let low = Math.min(...projections), high = Math.max(...projections);
    const target = polygonArea(points) * subtotal / total;
    for (let i = 0; i < 48; i++) {
      const mid = (low + high) / 2;
      if (polygonArea(clip(points, nx, ny, mid, true)) < target) low = mid;
      else high = mid;
    }
    const offset = (low + high) / 2;
    partition(data.slice(0, index), clip(points, nx, ny, offset, true), depth + 1);
    partition(data.slice(index), clip(points, nx, ny, offset, false), depth + 1);
  }
  partition(values.filter(d => Number.isFinite(d.value) && d.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)), boundary, 0);
  return cells;
}