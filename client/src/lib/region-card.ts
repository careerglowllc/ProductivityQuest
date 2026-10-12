// Fill and border for the region cards on the Explore pages (Activities / Food in Cities).
export function regionCardStyle(color: string, isDark: boolean): { borderColor: string; background: string } {
  return isDark
    ? { borderColor: `${color}44`, background: "linear-gradient(145deg, rgba(13,20,42,0.97) 0%, rgba(10,15,30,0.97) 100%)" }
    : { borderColor: `${color}66`, background: "linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)" };
}
