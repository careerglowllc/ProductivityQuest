import type { CalorieWeek, LiftWeek } from "@shared/fitness-stats";

const parts = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return { date: new Date(y, m - 1, d), day: d }; };

export const weekdayShort = (iso: string): string => parts(iso).date.toLocaleDateString("en-US", { weekday: "short" });
export const dayLetter = (iso: string): string => weekdayShort(iso)[0];
export const dayLabel = (iso: string): string => `${weekdayShort(iso)} ${parts(iso).day}`;

// 1,840 becomes "1.8k" so seven of them fit over a small bar chart.
export const shortNumber = (n: number): string => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const grouped = (n: number) => Math.round(n).toLocaleString("en-US");

export interface BarDay { key: string; letter: string; value: number; short: string; isToday: boolean }
export interface LogRow { key: string; label: string; text: string; empty: boolean; isToday: boolean }

export function calorieBars(week: CalorieWeek, today: string): BarDay[] {
  return week.days.map((d) => ({ key: d.date, letter: dayLetter(d.date), value: d.calories, short: d.logged ? shortNumber(d.calories) : "", isToday: d.date === today }));
}

export function liftBars(week: LiftWeek, today: string): BarDay[] {
  return week.days.map((d) => ({ key: d.date, letter: dayLetter(d.date), value: d.volume, short: d.volume > 0 ? shortNumber(d.volume) : d.trained ? "•" : "", isToday: d.date === today }));
}

// Newest first, so today is at the top of the weekly log.
export function calorieLogRows(week: CalorieWeek, today: string): LogRow[] {
  return [...week.days].reverse().map((d) => ({
    key: d.date, label: dayLabel(d.date), isToday: d.date === today, empty: !d.logged,
    text: d.logged ? `${grouped(d.calories)} kcal · P ${d.protein}g` : "Nothing logged",
  }));
}

export function liftLogRows(week: LiftWeek, today: string): LogRow[] {
  return [...week.days].reverse().map((d) => ({
    key: d.date, label: dayLabel(d.date), isToday: d.date === today, empty: !d.trained,
    text: d.trained
      ? [d.types.join(" + "), plural(d.exercises, "exercise"), plural(d.sets, "set"), d.volume > 0 ? `${shortNumber(d.volume)} lb` : ""].filter(Boolean).join(" · ")
      : "Rest day",
  }));
}

export function calorieHighlights(week: CalorieWeek): string[] {
  const out: string[] = [];
  if (week.streak >= 2) out.push(`🔥 ${week.streak}-day logging streak`);
  if (week.loggedDays > 0) out.push(`📅 ${week.loggedDays} of 7 days logged`);
  if (week.bestProtein) out.push(`💪 Best protein: ${weekdayShort(week.bestProtein.date)} ${week.bestProtein.protein}g`);
  if (week.vsLastWeek !== null) out.push(`${week.vsLastWeek <= 0 ? "📉" : "📈"} ${week.vsLastWeek <= 0 ? "−" : "+"}${grouped(Math.abs(week.vsLastWeek))} kcal/day vs last week`);
  return out.length ? out : ["Log a meal and this week's highlights appear here"];
}

export function liftHighlights(week: LiftWeek): string[] {
  const out: string[] = [];
  if (week.workouts > 0) out.push(`🏋️ ${plural(week.workouts, "workout")} this week`);
  if (week.volumeChangePct !== null) {
    const pct = week.volumeChangePct;
    // A huge jump (a first real week after a quiet one) reads better in words than as thousands of percent.
    out.push(pct > 500 ? "📈 Volume way up vs last week" : `${pct >= 0 ? "📈" : "📉"} Volume ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% vs last week`);
  }
  if (week.heaviest) out.push(`⚡ Heaviest: ${week.heaviest.exercise} ${grouped(week.heaviest.weight)} lb`);
  if (week.workouts > 0) out.push(`Push ${week.split.Push} · Pull ${week.split.Pull} · Legs ${week.split.Legs}`);
  return out.length ? out : ["Log a workout and this week's highlights appear here"];
}

// The one line shown while the widget is collapsed.
export const calorieStatsSubtitle = (week: CalorieWeek): string =>
  week.loggedDays ? `${week.loggedDays}/7 days · avg ${grouped(week.avgCalories)} kcal` : "Nothing logged this week yet";

export const liftStatsSubtitle = (week: LiftWeek): string =>
  week.workouts ? `${plural(week.workouts, "workout")} · ${grouped(week.volume)} lb` : "No workouts this week yet";
