import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemePreference = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's chosen preference: light, dark, or auto (follow system) */
  preference: ThemePreference;
  /** The actual theme being applied right now (auto resolves to light/dark) */
  resolved: ResolvedTheme;
  /** Set a specific preference */
  setPreference: (p: ThemePreference) => void;
  /** Convenience: cycle light → dark → auto → light */
  cycleTheme: () => void;
  isDark: boolean;
}

const STORAGE_KEY = "pq-theme-preference";

const ThemeContext = createContext<ThemeContextValue>({
  preference: "dark",
  resolved: "dark",
  setPreference: () => {},
  cycleTheme: () => {},
  isDark: true,
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "auto" ? getSystemTheme() : pref;
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  // Native form controls (scrollbars, date pickers) follow this
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      if (stored === "light" || stored === "dark" || stored === "auto") return stored;
      // Migrate from old key
      const legacy = localStorage.getItem("pq-theme");
      if (legacy === "light" || legacy === "dark") return legacy as ThemePreference;
    } catch {}
    return "dark";
  });

  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

  // Apply the resolved theme class whenever preference changes
  useEffect(() => {
    const r = resolveTheme(preference);
    setResolved(r);
    applyThemeClass(r);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {}
  }, [preference]);

  // Listen to system theme changes when in auto mode
  useEffect(() => {
    if (preference !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = getSystemTheme();
      setResolved(r);
      applyThemeClass(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => setPreferenceState(p), []);

  const cycleTheme = useCallback(() => {
    setPreferenceState((curr) =>
      curr === "light" ? "dark" : curr === "dark" ? "auto" : "light"
    );
  }, []);

  return (
    <ThemeContext.Provider
      value={{ preference, resolved, setPreference, cycleTheme, isDark: resolved === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
