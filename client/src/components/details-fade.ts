// The fade over the bottom of a truncated details box. Dark mode fades to slate; light mode fades to white,
// because the light-theme overrides remap slate gradient stops unevenly and leave a dark band.
export const detailsFadeClass = (isDark: boolean): string =>
  isDark ? "from-slate-800/95 via-slate-800/80 to-transparent" : "from-white via-white/85 to-transparent";
