const PANEL_KEY = "dash-questlines-open";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const store = (): Storage | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

// Open unless the user collapsed it on this device.
export function readPanelOpen(storage: Storage | null = store()): boolean {
  try { return storage?.getItem(PANEL_KEY) !== "0"; } catch { return true; }
}

export function writePanelOpen(open: boolean, storage: Storage | null = store()) {
  try { storage?.setItem(PANEL_KEY, open ? "1" : "0"); } catch { /* private mode: keep it in memory only */ }
}

export const allExpanded = (ids: Array<string | number>, expanded: Record<string, boolean>) =>
  ids.length > 0 && ids.every(id => expanded[String(id)]);

export const setAllExpanded = (ids: Array<string | number>, open: boolean) =>
  Object.fromEntries(ids.map(id => [String(id), open]));

// "Collapse all" folds everything, panel included, into one small row; "Expand all" opens every questline.
export const toggleAll = (ids: Array<string | number>, everyOpen: boolean) => ({
  panelOpen: !everyOpen,
  expanded: setAllExpanded(ids, !everyOpen),
});
