import { rowsToCSV } from "./csv-export";

interface ExploreEntry {
  name: string;
  city: string;
  address?: string;
  overallRating: number;
  thoughts: string;
  tags: string[];
  visitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type RegionLabel<T> = (entry: T) => string;

const byCityThenName = (a: ExploreEntry, b: ExploreEntry) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name);

// CSV for the Explore "Activities in Cities" log. With no entries it is just the header row.
export function activitiesCSV<T extends ExploreEntry & { stars: { fun: number; atmosphere: number; value: number } }>(entries: T[], regionOf: RegionLabel<T>): string {
  const headers = ["Name", "City", "Region", "Address", "Overall Rating", "Fun", "Atmosphere", "Value", "Tags", "Thoughts", "Visited At", "Created At", "Updated At"];
  const rows = [...entries].sort(byCityThenName).map((e) => [
    e.name, e.city, regionOf(e), e.address ?? "", e.overallRating, e.stars.fun, e.stars.atmosphere, e.stars.value,
    e.tags.join("; "), e.thoughts, e.visitedAt ?? "", e.createdAt, e.updatedAt,
  ]);
  return rowsToCSV(headers, rows);
}

// CSV for the Explore "Food in Cities" log. With no entries it is just the header row.
export function foodCSV<T extends ExploreEntry & { stars: { food: number; ambience: number; price: number } }>(entries: T[], regionOf: RegionLabel<T>): string {
  const headers = ["Name", "City", "Region", "Address", "Overall Rating", "Food", "Ambience", "Price", "Tags", "Thoughts", "Visited At", "Created At", "Updated At"];
  const rows = [...entries].sort(byCityThenName).map((e) => [
    e.name, e.city, regionOf(e), e.address ?? "", e.overallRating, e.stars.food, e.stars.ambience, e.stars.price,
    e.tags.join("; "), e.thoughts, e.visitedAt ?? "", e.createdAt, e.updatedAt,
  ]);
  return rowsToCSV(headers, rows);
}
