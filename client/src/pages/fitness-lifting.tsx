import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Dumbbell, ArrowLeft, TrendingUp, TrendingDown, Minus, CalendarDays, ListChecks, Flame } from "lucide-react";
import { Link } from "wouter";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// PPL (Push / Pull / Legs) Weightlifting Log
// Persisted under the synced "workout-" localStorage prefix so it follows the
// user's account across devices (see client/src/lib/synced-storage.ts +
// server/routes.ts SYNCED_KEY_PREFIXES).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "workout-ppl-log-v1";

type WorkoutType = "Push" | "Pull" | "Legs";
type MetricKind = "weight" | "reps" | "time";

interface LogEntry {
  date: string; // YYYY-MM-DD
  workoutType: WorkoutType;
  exercise: string;
  setsRaw: string; // exact "working sets" text, kept for the detailed table
  warmup?: string;
  notes?: string;
  metric: {
    kind: MetricKind;
    value: number; // lb for "weight", reps for "reps", seconds for "time"
    approx?: boolean;
  } | null;
}

const SEED_ENTRIES: LogEntry[] = [
  { date: "2026-06-11", workoutType: "Pull", exercise: "Machine Biceps Curl", setsRaw: "60 lb: 8 / 8 / 8", notes: "Older partial record", metric: { kind: "weight", value: 60 } },
  { date: "2026-06-11", workoutType: "Pull", exercise: "Pull-Ups", setsRaw: "BW: 5 / 5 / 5", notes: "Older partial record", metric: { kind: "reps", value: 5 } },
  { date: "2026-06-16", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", setsRaw: "45 lb DBs: 9 / 6 / 5", notes: "Older partial record", metric: { kind: "weight", value: 45 } },
  { date: "2026-06-16", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", setsRaw: "7.5 lb: 7 / 7 / 7 each side", notes: "Older partial record", metric: { kind: "weight", value: 7.5 } },
  { date: "2026-06-16", workoutType: "Push", exercise: "Triceps Pushdown", setsRaw: "42.5 lb: 10 / 10 / 10", notes: "Older partial record", metric: { kind: "weight", value: 42.5 } },
  { date: "2026-06-18", workoutType: "Legs", exercise: "Seated Leg Curl", setsRaw: "150 lb: 5 / 12 / 12", notes: "Older partial record", metric: { kind: "weight", value: 150 } },
  { date: "2026-06-23", workoutType: "Push", exercise: "Incline Dumbbell Press", setsRaw: "65 lb DBs: 6 / 5 / 5", notes: "Older partial record", metric: { kind: "weight", value: 65 } },
  { date: "2026-06-23", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", setsRaw: "45 lb DBs: 10 / 8 / 6", notes: "Older partial record", metric: { kind: "weight", value: 45 } },
  { date: "2026-06-23", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", setsRaw: "7.5 lb: 12 / 12 each side", notes: "Older partial record", metric: { kind: "weight", value: 7.5 } },
  { date: "2026-06-23", workoutType: "Push", exercise: "Triceps Pushdown", setsRaw: "42.5 lb: 9 / 8", notes: "Shorter rests; older partial record", metric: { kind: "weight", value: 42.5 } },
  { date: "2026-06-25", workoutType: "Legs", exercise: "Back Squat", setsRaw: "225 lb: 5 / 5 / 5", notes: "Older partial record", metric: { kind: "weight", value: 225 } },
  { date: "2026-06-25", workoutType: "Legs", exercise: "Seated Leg Curl", setsRaw: "160 lb: 12 / 10 / 10", notes: "Older partial record", metric: { kind: "weight", value: 160 } },
  { date: "2026-06-27", workoutType: "Pull", exercise: "Face Pull", setsRaw: "42.5 lb: 15 / 15 / 15", metric: { kind: "weight", value: 42.5 } },
  { date: "2026-06-27", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x8; 25 lb x8; 50 lb x8; 75 lb x8", setsRaw: "100 lb plates + bar: 12 / 12 / 8", metric: { kind: "weight", value: 100 } },
  { date: "2026-06-30", workoutType: "Legs", exercise: "Back Squat", warmup: "Bar x12; 25 lb/side x8; 45 lb/side x8; 1.5 plates/side x5", setsRaw: "225 lb: 5 / 5 / 5", metric: { kind: "weight", value: 225 } },
  { date: "2026-06-30", workoutType: "Legs", exercise: "Neck Raises", warmup: "Usual warm-up", setsRaw: "Working sets logged incompletely", notes: "Exact complete details unavailable", metric: null },
  { date: "2026-07-01", workoutType: "Pull", exercise: "Face Pull", setsRaw: "42.5 lb: 13 / 10 / 10", notes: "Full ROM noted", metric: { kind: "weight", value: 42.5 } },
  { date: "2026-07-01", workoutType: "Pull", exercise: "Pull-Ups", warmup: "BW x3 controlled; BW x3 normal", setsRaw: "BW: 8 / 6 / 3", metric: { kind: "reps", value: 8 } },
  { date: "2026-07-01", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x8; 25 lb x8; 50 lb x8; 75 lb x8", setsRaw: "100 lb plates + bar: 8 / 8 / 7", metric: { kind: "weight", value: 100 } },
  { date: "2026-07-01", workoutType: "Push", exercise: "Incline Dumbbell Press", warmup: "15 lb x8; 30 lb x8; 45 lb x8", setsRaw: "65 lb DBs: 7 / 7 / 7", metric: { kind: "weight", value: 65 } },
  { date: "2026-07-01", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", setsRaw: "45 lb DBs: 10 / 8 / 7", metric: { kind: "weight", value: 45 } },
  { date: "2026-07-01", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", setsRaw: "10 lb: ~6 each side x3", notes: "Approximate reps", metric: { kind: "weight", value: 10, approx: true } },
  { date: "2026-07-01", workoutType: "Push", exercise: "Treadmill", setsRaw: "Incline 2; 7 mph; 5:30", metric: { kind: "time", value: 330 } },
  { date: "2026-07-01", workoutType: "Push", exercise: "Triceps Pushdown", setsRaw: "42.5 lb: 12 / 12 / 12", metric: { kind: "weight", value: 42.5 } },
  { date: "2026-07-09", workoutType: "Pull", exercise: "Pull-Ups", warmup: "Usual warm-up", setsRaw: "BW: 8 / 6 / 5", metric: { kind: "reps", value: 8 } },
  { date: "2026-07-09", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x8; 25 lb x8; 50 lb x8; 75 lb x5", setsRaw: "100 lb plates + bar: 10 / 7 / ?", notes: "Third working set not recorded", metric: { kind: "weight", value: 100, approx: true } },
  { date: "2026-07-13", workoutType: "Push", exercise: "Dead Hang", setsRaw: "BW: 45 sec", metric: { kind: "time", value: 45 } },
  { date: "2026-07-13", workoutType: "Push", exercise: "Incline Dumbbell Press", warmup: "15 lb x8; 30 lb x8; 45 lb x8", setsRaw: "65 lb DBs: 8 / 7 / 7", metric: { kind: "weight", value: 65 } },
  { date: "2026-07-13", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", setsRaw: "45 lb DBs: 11 / 8 / 7", metric: { kind: "weight", value: 45 } },
  { date: "2026-07-13", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", setsRaw: "7.5 lb: 15 / 12 / 12 each side", metric: { kind: "weight", value: 7.5 } },
  { date: "2026-07-13", workoutType: "Push", exercise: "Treadmill", setsRaw: "Incline 2; 7 mph; 7:00", metric: { kind: "time", value: 420 } },
  { date: "2026-07-13", workoutType: "Push", exercise: "Triceps Rope Pushdown", setsRaw: "52.5 lb: 6 / 5 / 3", metric: { kind: "weight", value: 52.5 } },
  { date: "2026-07-14", workoutType: "Legs", exercise: "Back Squat", warmup: "Bar x12; 25 lb/side x8; 45 lb/side x8; 1.5 plates/side x5", setsRaw: "225 lb: 6 / 5 / 5", metric: { kind: "weight", value: 225 } },
  { date: "2026-07-14", workoutType: "Legs", exercise: "Seated Leg Curl", warmup: "70 lb x10; 120 lb x5", setsRaw: "160 lb x4 recorded", notes: "Different/more reclined machine", metric: { kind: "weight", value: 160, approx: true } },
  { date: "2026-07-16", workoutType: "Pull", exercise: "Cable Curl - Rigid/Straight Attachment", setsRaw: "37.5 lb: ~8-12 x3", notes: "Not rope; approximate reps", metric: { kind: "weight", value: 37.5, approx: true } },
  { date: "2026-07-16", workoutType: "Pull", exercise: "Dead Hang", setsRaw: "BW: 45 sec", metric: { kind: "time", value: 45 } },
  { date: "2026-07-16", workoutType: "Pull", exercise: "Face Pull", setsRaw: "32.5 lb: 15 / 15 / 15", metric: { kind: "weight", value: 32.5 } },
  { date: "2026-07-16", workoutType: "Pull", exercise: "Pull-Ups", warmup: "BW x3 slow; BW x3 normal", setsRaw: "BW: 8 / 5 / 4 / 3", notes: "Four working sets", metric: { kind: "reps", value: 8 } },
  { date: "2026-07-16", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x8; 25 lb x8; 50 lb x8; 75 lb x5", setsRaw: "100 lb plates + bar: 10 / 10 / 8", metric: { kind: "weight", value: 100 } },
  { date: "2026-07-17", workoutType: "Push", exercise: "Dead Hang", setsRaw: "BW: 45 sec", metric: { kind: "time", value: 45 } },
  { date: "2026-07-17", workoutType: "Push", exercise: "Incline Dumbbell Press", warmup: "15 lb x8; 30 lb x8; 45 lb x8", setsRaw: "70 lb DBs: 5 / 5 / ?", notes: "Third set not recorded", metric: { kind: "weight", value: 70, approx: true } },
  { date: "2026-07-17", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", warmup: "15 lb x8; 30 lb x8; 45 lb x8", setsRaw: "45 lb DBs: 12 / 8 / 5", metric: { kind: "weight", value: 45 } },
  { date: "2026-07-17", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", warmup: "7.5 lb x12 each side", setsRaw: "12.5 lb R/L: 7/7; 7/5; 6/4", metric: { kind: "weight", value: 12.5 } },
  { date: "2026-07-17", workoutType: "Push", exercise: "Treadmill", setsRaw: "Incline 2; 7 mph; 7:30", metric: { kind: "time", value: 450 } },
  { date: "2026-07-17", workoutType: "Push", exercise: "Triceps Rope Pushdown", setsRaw: "42.5 lb: ~12 / ~12 / ~12", notes: "Approximate reps", metric: { kind: "weight", value: 42.5, approx: true } },
  { date: "2026-07-28", workoutType: "Legs", exercise: "Back Squat", warmup: "Usual squat warm-up", setsRaw: "225 lb: 6 / 6 / 6", metric: { kind: "weight", value: 225 } },
  { date: "2026-07-28", workoutType: "Legs", exercise: "Dead Hang", setsRaw: "BW: 45 sec", metric: { kind: "time", value: 45 } },
  { date: "2026-07-28", workoutType: "Legs", exercise: "Glute Bridge", setsRaw: "BW: 12 / 12", notes: "Added as standard leg-day exercise", metric: { kind: "reps", value: 12 } },
  { date: "2026-07-28", workoutType: "Legs", exercise: "Neck Raises", warmup: "BW + 10 lb warm-up", setsRaw: "25 lb plate: 1 working set", notes: "Stopped due to abnormal neck discomfort", metric: { kind: "weight", value: 25, approx: true } },
  { date: "2026-07-28", workoutType: "Legs", exercise: "Seated Leg Curl", setsRaw: "120 lb: 12 / ~8-12 / ~8-12", notes: "Approximate final two sets", metric: { kind: "weight", value: 120, approx: true } },
  { date: "2026-07-29", workoutType: "Push", exercise: "Flat Machine Bench", setsRaw: "85 lb: 12 / 12 / 12", metric: { kind: "weight", value: 85 } },
  { date: "2026-07-29", workoutType: "Push", exercise: "Shoulder Press Machine", setsRaw: "85 lb: 6 / 10", notes: "Only two sets recorded", metric: { kind: "weight", value: 85 } },
  { date: "2026-07-29", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", setsRaw: "10 lb: ~10 each side x3", notes: "Superset; approximate", metric: { kind: "weight", value: 10, approx: true } },
  { date: "2026-07-29", workoutType: "Push", exercise: "Treadmill", setsRaw: "Incline 2; 7 mph; 5:00", metric: { kind: "time", value: 300 } },
  { date: "2026-07-29", workoutType: "Push", exercise: "Triceps Pushdown", setsRaw: "42.5 lb: ~10 x3", notes: "Superset; approximate", metric: { kind: "weight", value: 42.5, approx: true } },
  { date: "2026-07-30", workoutType: "Pull", exercise: "Face Pull", setsRaw: "22.5 lb: 20 / 20 / 20", notes: "Went light due to neck", metric: { kind: "weight", value: 22.5 } },
  { date: "2026-07-30", workoutType: "Pull", exercise: "Machine Biceps Curl", warmup: "40 lb x10", setsRaw: "60 lb: 4 / ? / 5", notes: "Middle set not recorded", metric: { kind: "weight", value: 60, approx: true } },
  { date: "2026-07-30", workoutType: "Pull", exercise: "Pull-Ups", warmup: "BW x3 slow; BW x3 normal", setsRaw: "BW: 5 / 5 / 4 / 3", metric: { kind: "reps", value: 5 } },
  { date: "2026-07-30", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x8; 25 lb x10; 50 lb x8; 75 lb x8", setsRaw: "100 lb plates + bar: 8 / 8 / 8", metric: { kind: "weight", value: 100 } },
  { date: "2026-07-30", workoutType: "Pull", exercise: "Weighted Plank", setsRaw: "25 lb plate: 45 sec / 45 sec", metric: { kind: "time", value: 45 } },
  { date: "2026-07-31", workoutType: "Push", exercise: "Incline Dumbbell Press", setsRaw: "70 lb DBs: 5 / 5 / 4", metric: { kind: "weight", value: 70 } },
  { date: "2026-07-31", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", setsRaw: "45 lb DBs: 8 / 5 / 5", metric: { kind: "weight", value: 45 } },
  { date: "2026-07-31", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", setsRaw: "12.5 lb: 5 each side / ~3-5 each side / ~3-5 each side", notes: "Approximate final sets", metric: { kind: "weight", value: 12.5, approx: true } },
  { date: "2026-07-31", workoutType: "Push", exercise: "Treadmill", setsRaw: "Incline 2; 7 mph; 8:47", metric: { kind: "time", value: 527 } },
  { date: "2026-07-31", workoutType: "Push", exercise: "Triceps Rope Pushdown", setsRaw: "42.5 lb: 12 / ~9-12 / ~9-12", notes: "Approximate final sets", metric: { kind: "weight", value: 42.5, approx: true } },
  { date: "2026-08-03", workoutType: "Legs", exercise: "Back Squat", warmup: "Bar x12; 25 lb/side x8; 45 lb/side x8; 1.5 plates/side x5", setsRaw: "225 lb: 6 / 6 / 6", metric: { kind: "weight", value: 225 } },
  { date: "2026-08-03", workoutType: "Legs", exercise: "Barbell Glute Bridge", setsRaw: "45 lb: 20 / 20 / 20", notes: "Upper back supported on bench", metric: { kind: "weight", value: 45 } },
  { date: "2026-08-03", workoutType: "Legs", exercise: "Dead Hang", setsRaw: "BW: 50 sec", metric: { kind: "time", value: 50 } },
  { date: "2026-08-03", workoutType: "Legs", exercise: "Seated Leg Curl", setsRaw: "120 lb: 12 / ~8-12 / ~8-12", notes: "Approximate final two sets", metric: { kind: "weight", value: 120, approx: true } },
  { date: "2026-08-04", workoutType: "Pull", exercise: "Face Pull", setsRaw: "22.5 lb: 20 / 20 / 20", metric: { kind: "weight", value: 22.5 } },
  { date: "2026-08-04", workoutType: "Pull", exercise: "Life Fitness Biceps Curl", warmup: "30 lb x15", setsRaw: "60 lb: 6 / 6 / 4", metric: { kind: "weight", value: 60 } },
  { date: "2026-08-04", workoutType: "Pull", exercise: "Pull-Ups", warmup: "BW x3 slow; BW x3 normal", setsRaw: "BW: 6 / 4 / 5", metric: { kind: "reps", value: 6 } },
  { date: "2026-08-04", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x12; 25 lb x10; 50 lb x8; 75 lb x8", setsRaw: "100 lb plates + bar: 12 / 10 / 8", metric: { kind: "weight", value: 100 } },
  { date: "2026-08-04", workoutType: "Pull", exercise: "Weighted Plank", setsRaw: "25 lb plate: 45 sec / 45 sec", metric: { kind: "time", value: 45 } },
  { date: "2026-08-05", workoutType: "Push", exercise: "Incline Dumbbell Press", setsRaw: "65 lb DBs: 6 / 5 / ?", notes: "Third set not recorded", metric: { kind: "weight", value: 65, approx: true } },
  { date: "2026-08-05", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", warmup: "7 lb x15; 20 lb x10; 30 lb x8; 40 lb x5", setsRaw: "50 lb DBs: 5 / 3 / 3", notes: "First recorded 50 lb session", metric: { kind: "weight", value: 50 } },
  { date: "2026-08-10", workoutType: "Legs", exercise: "Back Squat", warmup: "Bar x12; 25 lb/side x8; 45 lb/side x8; 1.5 plates/side x5", setsRaw: "225 lb: 6 / 6 / 6", metric: { kind: "weight", value: 225 } },
  { date: "2026-08-10", workoutType: "Legs", exercise: "Barbell Glute Bridge", setsRaw: "45 lb: 20 / 20 / 20", metric: { kind: "weight", value: 45 } },
  { date: "2026-08-10", workoutType: "Legs", exercise: "Seated Leg Curl", warmup: "90 lb x12", setsRaw: "140 lb: ~6 / 12 / 6", notes: "First set approximate", metric: { kind: "weight", value: 140, approx: true } },
  { date: "2026-08-11", workoutType: "Pull", exercise: "Face Pull", setsRaw: "22.5 lb: 20 / 20 / 20", metric: { kind: "weight", value: 22.5 } },
  { date: "2026-08-11", workoutType: "Pull", exercise: "Pull-Ups", warmup: "BW x3 slow; BW x3 normal", setsRaw: "BW: 5 / 5 / 5", metric: { kind: "reps", value: 5 } },
  { date: "2026-08-11", workoutType: "Pull", exercise: "T-Bar Row", warmup: "Bar x12; 25 lb x10; 50 lb x8; 75 lb x8", setsRaw: "100 lb plates + bar: 9 / 6 / 6", notes: "Generally shorter rests today", metric: { kind: "weight", value: 100 } },
  { date: "2026-08-11", workoutType: "Pull", exercise: "Weighted Plank", setsRaw: "25 lb plate: 50 sec / 50 sec / 50 sec", metric: { kind: "time", value: 50 } },
  { date: "2026-08-12", workoutType: "Push", exercise: "Dead Hang", setsRaw: "BW: 50 sec", metric: { kind: "time", value: 50 } },
  { date: "2026-08-12", workoutType: "Push", exercise: "Incline Dumbbell Press", setsRaw: "70 lb DBs x5; 70 lb DBs x4; 65 lb DBs x6", notes: "Weight drop on final set", metric: { kind: "weight", value: 70 } },
  { date: "2026-08-12", workoutType: "Push", exercise: "Seated Dumbbell Shoulder Press", setsRaw: "45 lb DBs: 7 / 6 / 6", metric: { kind: "weight", value: 45 } },
  { date: "2026-08-12", workoutType: "Push", exercise: "Single-Arm Cable Lateral Raise", warmup: "7.5 lb each side warm-up", setsRaw: "12.5 lb: 6 / 6 / 6 each side", metric: { kind: "weight", value: 12.5 } },
  { date: "2026-08-12", workoutType: "Push", exercise: "Treadmill", setsRaw: "Incline 2; 7 mph; 6:00", metric: { kind: "time", value: 360 } },
  { date: "2026-08-12", workoutType: "Push", exercise: "Triceps Rope Pushdown", setsRaw: "42.5 lb: ~15 / ~12 / ~12 / ~9", notes: "Four working sets; approximate reps", metric: { kind: "weight", value: 42.5, approx: true } },
];

function loadEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return SEED_ENTRIES;
}

const WORKOUT_TABS: Array<{ key: WorkoutType | "All"; label: string; color: string }> = [
  { key: "All", label: "All", color: "#94A3B8" },
  { key: "Push", label: "Push", color: "#F472B6" },
  { key: "Pull", label: "Pull", color: "#60A5FA" },
  { key: "Legs", label: "Legs", color: "#34D399" },
];

// Headline lift to default to when switching tabs
const DEFAULT_EXERCISE: Record<WorkoutType, string> = {
  Push: "Incline Dumbbell Press",
  Pull: "T-Bar Row",
  Legs: "Back Squat",
};

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatMetricValue(metric: LogEntry["metric"]): string {
  if (!metric) return "—";
  const approx = metric.approx ? "~" : "";
  if (metric.kind === "weight") return `${approx}${metric.value} lb`;
  if (metric.kind === "reps") return `${approx}${metric.value} reps`;
  // time
  const mins = Math.floor(metric.value / 60);
  const secs = Math.round(metric.value % 60);
  return mins > 0 ? `${approx}${mins}m ${secs}s` : `${approx}${secs}s`;
}

function metricAxisLabel(kind: MetricKind): string {
  if (kind === "weight") return "Weight (lb)";
  if (kind === "reps") return "Reps";
  return "Duration (sec)";
}

export default function FitnessLiftingPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const [entries] = useState<LogEntry[]>(() => loadEntries());
  const [activeType, setActiveType] = useState<WorkoutType | "All">("All");
  const [selectedExercise, setSelectedExercise] = useState<string>(DEFAULT_EXERCISE.Push);

  // Seed localStorage once so this log is part of the synced "workout-" store.
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENTRIES));
      }
    } catch { /* ignore */ }
  }, []);

  const entriesForType = useMemo(
    () => (activeType === "All" ? entries : entries.filter((e) => e.workoutType === activeType)),
    [entries, activeType]
  );

  const exerciseList = useMemo(() => {
    const names = Array.from(new Set(entriesForType.map((e) => e.exercise)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [entriesForType]);

  // Keep selectedExercise valid whenever the tab changes
  useEffect(() => {
    if (activeType !== "All" && DEFAULT_EXERCISE[activeType] && exerciseList.includes(DEFAULT_EXERCISE[activeType])) {
      setSelectedExercise(DEFAULT_EXERCISE[activeType]);
    } else if (!exerciseList.includes(selectedExercise) && exerciseList.length > 0) {
      setSelectedExercise(exerciseList[0]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [activeType, exerciseList]);

  const chartEntries = useMemo(() => {
    return entries
      .filter((e) => e.exercise === selectedExercise && e.metric !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        label: formatDateShort(e.date),
        value: e.metric!.value,
        display: formatMetricValue(e.metric),
        setsRaw: e.setsRaw,
      }));
  }, [entries, selectedExercise]);

  const selectedExerciseMetricKind: MetricKind = useMemo(() => {
    const match = entries.find((e) => e.exercise === selectedExercise && e.metric);
    return match?.metric?.kind ?? "weight";
  }, [entries, selectedExercise]);

  // Per-exercise "current best" (max value ever) + "latest" (most recent session)
  type Best = { exercise: string; workoutType: WorkoutType; best: LogEntry | null; latest: LogEntry };
  const bestsByType = useMemo(() => {
    const byExercise = new Map<string, LogEntry[]>();
    for (const e of entries) {
      const list = byExercise.get(e.exercise) ?? [];
      list.push(e);
      byExercise.set(e.exercise, list);
    }
    const result: Record<WorkoutType, Best[]> = { Push: [], Pull: [], Legs: [] };
    byExercise.forEach((list, exercise) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const withMetric = sorted.filter((e) => e.metric !== null);
      const best = withMetric.length > 0
        ? withMetric.reduce((max, e) => (e.metric!.value > max.metric!.value ? e : max))
        : null;
      result[latest.workoutType].push({ exercise, workoutType: latest.workoutType, best, latest });
    });
    (Object.keys(result) as WorkoutType[]).forEach((t) => {
      result[t].sort((a, b) => a.exercise.localeCompare(b.exercise));
    });
    return result;
  }, [entries]);

  const fullLogSorted = useMemo(
    () => [...entriesForType].sort((a, b) => b.date.localeCompare(a.date)),
    [entriesForType]
  );

  const summary = useMemo(() => {
    const dates = Array.from(new Set(entries.map((e) => e.date))).sort();
    const uniqueExercises = new Set(entries.map((e) => e.exercise));
    return {
      sessions: dates.length,
      exercises: uniqueExercises.size,
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
    };
  }, [entries]);

  const TrendIcon = ({ best, latest }: { best: LogEntry | null; latest: LogEntry }) => {
    if (!best || !latest.metric || !best.metric) return <Minus className="h-3.5 w-3.5 text-slate-500" />;
    if (latest.date === best.date || latest.metric.value >= best.metric.value) {
      return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    }
    return <TrendingDown className="h-3.5 w-3.5 text-amber-400" />;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-rose-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-teal-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-5xl mx-auto px-4 pt-4" : "max-w-5xl mx-auto px-6 pt-10"}`}>
        <Link href="/fitness">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Fitness
          </a>
        </Link>

        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              PPL Lifting Log
            </h1>
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-slate-400 italic text-sm">Push / Pull / Legs — strength progression, one session at a time</p>
        </div>

        {/* Summary stat cards */}
        <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 mb-8`}>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-300">{summary.sessions}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Sessions Logged</p>
          </div>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-cyan-300">{summary.exercises}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Exercises Tracked</p>
          </div>
          <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-4 text-center col-span-1">
            <p className="text-sm font-bold text-pink-300">{summary.firstDate && formatDateShort(summary.firstDate)}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">First Logged</p>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center col-span-1">
            <p className="text-sm font-bold text-violet-300">{summary.lastDate && formatDateShort(summary.lastDate)}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Most Recent</p>
          </div>
        </div>

        {/* Workout type tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {WORKOUT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
              style={
                activeType === tab.key
                  ? { backgroundColor: `${tab.color}22`, borderColor: `${tab.color}88`, color: tab.color }
                  : { backgroundColor: "transparent", borderColor: "#334155", color: "#94A3B8" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Progression chart */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 sm:p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-white font-bold">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Progression
            </div>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-slate-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {exerciseList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {chartEntries.length > 0 ? (
            <div style={{ width: "100%", height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartEntries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    label={{ value: metricAxisLabel(selectedExerciseMetricKind), angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 11 }}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#E2E8F0" }}
                    formatter={(_value: number, _name: string, ctx: any) => [ctx.payload.display, "Top set"]}
                    labelFormatter={(_label, payload) => (payload && payload[0] ? formatDateFull(payload[0].payload.date) : "")}
                  />
                  <Line type="monotone" dataKey="value" stroke="#34D399" strokeWidth={2.5} dot={{ r: 3, fill: "#34D399" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">No numeric data logged for this exercise yet.</p>
          )}
        </div>

        {/* Current Bests table */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-white font-bold mb-3">
            <Flame className="h-4 w-4 text-rose-400" />
            Current Bests
          </div>
          {(Object.keys(bestsByType) as WorkoutType[])
            .filter((t) => activeType === "All" || activeType === t)
            .map((t) => (
              <div key={t} className="mb-5">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{t}</p>
                <div className="rounded-xl border border-slate-700/60 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Exercise</th>
                        <th className="text-left px-3 py-2 font-medium">Best</th>
                        <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Best Date</th>
                        <th className="text-left px-3 py-2 font-medium">Latest</th>
                        <th className="text-left px-3 py-2 font-medium w-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestsByType[t].map((row) => (
                        <tr key={row.exercise} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                          <td className="px-3 py-2 text-slate-200">{row.exercise}</td>
                          <td className="px-3 py-2 text-emerald-300 font-semibold">
                            {row.best ? formatMetricValue(row.best.metric) : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">
                            {row.best ? formatDateShort(row.best.date) : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {formatMetricValue(row.latest.metric)}
                            <span className="text-slate-500 ml-1 text-xs">({formatDateShort(row.latest.date)})</span>
                          </td>
                          <td className="px-3 py-2">
                            <TrendIcon best={row.best} latest={row.latest} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>

        {/* Full log table */}
        <div>
          <div className="flex items-center gap-2 text-white font-bold mb-3">
            <ListChecks className="h-4 w-4 text-cyan-400" />
            Full Workout Log
          </div>
          <div className="rounded-xl border border-slate-700/60 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date</span>
                  </th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium">Exercise</th>
                  <th className="text-left px-3 py-2 font-medium">Working Sets</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {fullLogSorted.map((e, i) => (
                  <tr key={`${e.date}-${e.exercise}-${i}`} className="border-t border-slate-800/80 hover:bg-slate-800/30 align-top">
                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{formatDateShort(e.date)}</td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border"
                        style={
                          e.workoutType === "Push"
                            ? { color: "#F472B6", borderColor: "#F472B655" }
                            : e.workoutType === "Pull"
                            ? { color: "#60A5FA", borderColor: "#60A5FA55" }
                            : { color: "#34D399", borderColor: "#34D39955" }
                        }
                      >
                        {e.workoutType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-200">{e.exercise}</td>
                    <td className="px-3 py-2 text-slate-300">{e.setsRaw}</td>
                    <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{e.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-10">
          Data imported from PPL workout log (Jun–Aug 2026). Values marked with "~" are approximate reps/sets from the original notes.
        </p>
      </div>
    </div>
  );
}
