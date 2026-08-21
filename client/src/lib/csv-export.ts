// Shared CSV building/downloading helpers used by every page's "Export CSV" button
// and by the Settings page's "Export All as CSV" master export.

export function escapeCSVField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCSVField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCSVField).join(","));
  }
  return lines.join("\n");
}

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// A single named CSV export, used as one entry in the "Export All" zip bundle.
export interface CSVExport {
  folder: string; // subfolder within the zip, e.g. "Travel"
  filename: string; // e.g. "recipes.csv"
  content: string;
}
