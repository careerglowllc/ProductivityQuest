import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Dumbbell, ArrowLeft, TrendingUp, TrendingDown, Minus, CalendarDays, ListChecks, Flame, Layers, Trash2, Sparkles, Pencil } from "lucide-react";
import { Link } from "wouter";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { loadCalorieLog, ensureCalorieLogSeeded, type CalorieDayLog } from "@/lib/calorie-log";
import {
  addWorkoutEntries, finishWorkout, recentWorkoutLoggings, removeWorkoutLogging, sessionSummaries, workoutFromEntries, workoutToLogEntries,
  type MetricKind, type WorkoutLogEntry as LogEntry, type WorkoutType,
} from "@shared/fitness-log";
import { adoptNewerDraft, newDraft, type WorkoutDraft } from "@shared/fitness-session";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { FitnessSessionPanel } from "@/components/fitness/session-panel";
import { loadWorkoutDraft, saveWorkoutDraft } from "@/lib/fitness-draft";
import { localToday, type FitnessDraft } from "@/lib/fitness-entry";
import { CollapsibleSection } from "@/components/fitness/collapsible-section";
import { RoutineEditor } from "@/components/fitness/routine-editor";
import { useRoutine } from "@/hooks/use-routine";
import { outsideRoutine, planFromRoutine, planHasExercises, routineEntries } from "@shared/fitness-routine";
import { LiftStats } from "@/components/fitness/stats-card";
import { liftStripText, todayLift, todayLiftRows, workoutLogWithDraft } from "@shared/fitness-today";
import { allTimeLifting, liftWeek } from "@shared/fitness-stats";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// ─────────────────────────────────────────────────────────────────────────────
// PPL (Push / Pull / Legs) Weightlifting Log
// Persisted under the synced "workout-" localStorage prefix so it follows the
// user's account across devices (see client/src/lib/synced-storage.ts +
// server/routes.ts SYNCED_KEY_PREFIXES).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "workout-ppl-log-v1";

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

type TimeWindow = "week" | "month" | "3m" | "6m" | "1y" | "3y" | "all";
const TIME_WINDOWS: Array<{ key: TimeWindow; label: string; days: number | null }> = [
  { key: "week", label: "1W", days: 7 },
  { key: "month", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 91 },
  { key: "6m", label: "6M", days: 182 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "3y", label: "3Y", days: 1095 },
  { key: "all", label: "All", days: null },
];

// The lift the progression chart starts on
const DEFAULT_EXERCISE = "Incline Dumbbell Press";

const countOf = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

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
  const { toast, dismiss } = useToast();
  const [entries, setEntries] = useState<LogEntry[]>(() => loadEntries());
  const [selectedExercise, setSelectedExercise] = useState<string>(DEFAULT_EXERCISE);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");
  const [showCalorieOverlay, setShowCalorieOverlay] = useState(false);
  const [calorieEntries] = useState<CalorieDayLog[]>(() => loadCalorieLog());
  // The day being built up. It is saved after every change and only reaches the charts when it is ended.
  const [draft, setDraft] = useState<WorkoutDraft | null>(() => loadWorkoutDraft());

  // Seed localStorage once so this log is part of the synced "workout-" store.
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENTRIES));
      }
    } catch { /* ignore */ }
    ensureCalorieLogSeeded();
  }, []);

  // Saves the whole log (including the starter entries) and shows it.
  function persistEntries(next: LogEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  }

  // Another device may have added to the open day; take its newer copy so this page never types over it.
  useEffect(() => subscribeUserDataRefresh(() => setDraft((current) => adoptNewerDraft(current, loadWorkoutDraft()))), []);

  function updateDraft(next: WorkoutDraft | null) {
    setDraft(next);
    saveWorkoutDraft(next);
  }

  // Ending the day writes it as that day's rows. A day that was reopened replaces the rows it saved before.
  function endWorkout(done: FitnessDraft) {
    const finished = done as WorkoutDraft;
    const workout = finishWorkout(finished.summary);
    if (workout.exercises.length === 0) return;
    const next = addWorkoutEntries(removeWorkoutLogging(entries, finished.id), workoutToLogEntries(workout, finished.id));
    persistEntries(next);
    updateDraft(null);
    toast({
      title: `${finished.reopened ? "Updated" : "Saved"} ${workout.exercises.length} ${workout.exercises.length === 1 ? "exercise" : "exercises"} for ${formatDateFull(workout.date)}`,
      description: "It now shows in your charts.",
      duration: 8000,
      action: <ToastAction altText="Edit again" onClick={() => { dismiss(); reopen(finished.id, next); }}>Edit again</ToastAction>,
    });
  }

  // Opens a saved day again. The saved version stays in the charts until the changes are saved.
  function reopen(logId: string, rows: LogEntry[] = entries) {
    if (loadWorkoutDraft()) {
      toast({ title: "You have a workout open", description: "End it or discard it first, then open another day to edit." });
      return;
    }
    const workout = workoutFromEntries(rows, logId);
    if (!workout) return;
    updateDraft(newDraft(logId, new Date(), null, workout, true));
    requestAnimationFrame(() => document.querySelector('[data-testid="session-workout"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  // What a Push, Pull and Legs day hold. With one set up, the lift charts only use lifts that are in it, under its names.
  const [routine, saveRoutineState] = useRoutine();
  const plan = useMemo(() => planFromRoutine(routine), [routine]);
  const routineOn = planHasExercises(plan);
  const liftEntries = useMemo(() => routineEntries(entries, plan), [entries, plan]);
  const outsideRoutineCount = useMemo(() => outsideRoutine(entries, plan).length, [entries, plan]);

  const recentLoggings = useMemo(() => recentWorkoutLoggings(entries), [entries]);
  const sessions = useMemo(() => sessionSummaries(liftEntries), [liftEntries]);

  const exerciseList = useMemo(
    () => Array.from(new Set(liftEntries.map((e) => e.exercise))).sort((a, b) => a.localeCompare(b)),
    [liftEntries],
  );

  // Keep selectedExercise valid when the routine or the log changes
  useEffect(() => {
    if (!exerciseList.includes(selectedExercise) && exerciseList.length > 0) setSelectedExercise(exerciseList[0]);
  }, [exerciseList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick lookup: date -> calories logged that day (for the optional overlay)
  const caloriesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of calorieEntries) map.set(c.date, c.calories);
    return map;
  }, [calorieEntries]);

  // The start of the chosen time window, counted back from the most recent logged day.
  const windowCutoff = useMemo(() => {
    const windowDef = TIME_WINDOWS.find((w) => w.key === timeWindow);
    if (!windowDef?.days) return null;
    const latestDate = liftEntries.reduce((max, e) => (e.date > max ? e.date : max), liftEntries[0]?.date ?? "");
    if (!latestDate) return null;
    const [y, m, d] = latestDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - windowDef.days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }, [liftEntries, timeWindow]);

  const chartEntries = useMemo(() => {
    // More than one logging of an exercise on a day is one point: that day's best.
    const bestPerDay = new Map<string, LogEntry>();
    for (const e of liftEntries) {
      if (e.exercise !== selectedExercise || e.metric === null || (windowCutoff && e.date < windowCutoff)) continue;
      const earlier = bestPerDay.get(e.date);
      if (!earlier || e.metric.value > earlier.metric!.value) bestPerDay.set(e.date, e);
    }
    return Array.from(bestPerDay.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        label: formatDateShort(e.date),
        value: e.metric!.value,
        display: formatMetricValue(e.metric),
        setsRaw: e.setsRaw,
        calories: caloriesByDate.get(e.date) ?? null,
      }));
  }, [liftEntries, selectedExercise, windowCutoff, caloriesByDate]);

  const sessionChart = useMemo(
    () => sessions.filter((s) => !windowCutoff || s.date >= windowCutoff).map((s) => ({ ...s, label: formatDateShort(s.date) })),
    [sessions, windowCutoff],
  );

  const selectedExerciseMetricKind: MetricKind = useMemo(() => {
    const match = liftEntries.find((e) => e.exercise === selectedExercise && e.metric);
    return match?.metric?.kind ?? "weight";
  }, [liftEntries, selectedExercise]);

  // Per-exercise "current best" (max value ever) + "latest" (most recent session)
  type Best = { exercise: string; workoutType: WorkoutType; best: LogEntry | null; latest: LogEntry };
  const bestsByType = useMemo(() => {
    const byExercise = new Map<string, LogEntry[]>();
    for (const e of liftEntries) {
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
  }, [liftEntries]);

  const bestCount = useMemo(() => Object.values(bestsByType).reduce((n, list) => n + list.length, 0), [bestsByType]);

  const fullLogSorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  const TrendIcon = ({ best, latest }: { best: LogEntry | null; latest: LogEntry }) => {
    if (!best || !latest.metric || !best.metric) return <Minus className="h-3.5 w-3.5 text-slate-500" />;
    if (latest.date === best.date || latest.metric.value >= best.metric.value) {
      return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    }
    return <TrendingDown className="h-3.5 w-3.5 text-amber-400" />;
  };

  // The top of the page works from the log plus the open day, so it changes with every message.
  const today = localToday();
  const previewEntries = useMemo(() => workoutLogWithDraft(entries, draft), [entries, draft]);
  const todayLog = {
    text: liftStripText(todayLift(previewEntries, today)),
    rows: todayLiftRows(previewEntries, today),
    inProgress: draft !== null && draft.date === today,
  };
  const week = useMemo(() => liftWeek(previewEntries, today), [previewEntries, today]);
  const allTime = useMemo(() => allTimeLifting(entries), [entries]);
  const panel = <FitnessSessionPanel kind="workout" accent="#34D399" compact={isMobile} plan={plan} draft={draft} onDraftChange={(next) => updateDraft(next as WorkoutDraft | null)} onEnd={endWorkout} />;
  const statsWidget = <LiftStats week={week} today={today} accent="#34D399" allTime={allTime} todayLog={todayLog} />;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-rose-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-teal-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-5xl mx-auto px-4 pt-4" : "max-w-5xl mx-auto px-6 pt-10"}`}>
        <Link href="/fitness">
          <a className={`inline-flex items-center gap-2 text-slate-400 hover:text-emerald-300 transition-colors ${isMobile ? "text-xs mb-2" : "text-sm mb-6"}`}>
            <ArrowLeft className="h-4 w-4" /> Back to Fitness
          </a>
        </Link>

        <div className={`text-center ${isMobile ? "mb-3" : "mb-8 space-y-2"}`}>
          <div className="flex items-center justify-center gap-3">
            <Dumbbell className={`${isMobile ? "h-5 w-5" : "h-7 w-7"} text-emerald-400`} />
            <h1 className={`${isMobile ? "text-xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              PPL Lifting Log
            </h1>
            <Dumbbell className={`${isMobile ? "h-5 w-5" : "h-7 w-7"} text-emerald-400`} />
          </div>
          {!isMobile && <p className="text-slate-400 italic text-sm">Push / Pull / Legs — strength progression, one session at a time</p>}
        </div>

        {panel}
        {statsWidget}

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

          {/* Time window filter */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {TIME_WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setTimeWindow(w.key)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={
                  timeWindow === w.key
                    ? { backgroundColor: "#34D39922", borderColor: "#34D39988", color: "#34D399" }
                    : { backgroundColor: "transparent", borderColor: "#334155", color: "#94A3B8" }
                }
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Overlay toggle(s) — extensible for future metrics like body weight */}
          <div className="flex items-center gap-4 mb-4">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
              <span
                className="flex items-center justify-center h-4 w-4 rounded border transition-colors"
                style={
                  showCalorieOverlay
                    ? { backgroundColor: "#F87171", borderColor: "#F87171" }
                    : { backgroundColor: "transparent", borderColor: "#475569" }
                }
                onClick={() => setShowCalorieOverlay((v) => !v)}
              >
                {showCalorieOverlay && <span className="text-[10px] leading-none text-slate-950 font-bold">✓</span>}
              </span>
              <input type="checkbox" className="sr-only" checked={showCalorieOverlay} onChange={() => setShowCalorieOverlay((v) => !v)} />
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
                <Layers className="h-3 w-3 text-rose-400" /> Overlay Calories
              </span>
            </label>
            <span className="text-[11px] text-slate-600 italic">More overlays (e.g. body weight) coming once that logging is added</span>
          </div>

          {!routineOn && <p data-testid="routine-hint" className="mb-3 text-[11px] text-amber-300/80">Set up your routine below so these charts only show your own lifts.</p>}
          {chartEntries.length > 0 ? (
            <div style={{ width: "100%", height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartEntries} margin={{ top: 5, right: showCalorieOverlay ? 10 : 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    label={{ value: metricAxisLabel(selectedExerciseMetricKind), angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 11 }}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  {showCalorieOverlay && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      label={{ value: "Calories (kcal)", angle: 90, position: "insideRight", fill: "#64748B", fontSize: 11 }}
                      domain={["dataMin - 200", "dataMax + 200"]}
                    />
                  )}
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#E2E8F0" }}
                    formatter={(value: number, name: string, ctx: any) =>
                      name === "calories"
                        ? [value != null ? `${value.toLocaleString()} kcal` : "No log", "Calories"]
                        : [ctx.payload.display, "Top set"]
                    }
                    labelFormatter={(_label, payload) => (payload && payload[0] ? formatDateFull(payload[0].payload.date) : "")}
                  />
                  {showCalorieOverlay && <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />}
                  <Line yAxisId="left" type="monotone" dataKey="value" name="Top set" stroke="#34D399" strokeWidth={2.5} dot={{ r: 3, fill: "#34D399" }} activeDot={{ r: 5 }} />
                  {showCalorieOverlay && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="calories"
                      name="calories"
                      stroke="#F87171"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      dot={{ r: 2.5, fill: "#F87171" }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">
              {exerciseList.length === 0 ? "None of the lifts in your routine are logged yet." : "No numeric data logged for this exercise in the selected time window."}
            </p>
          )}
          {outsideRoutineCount > 0 && (
            <p data-testid="outside-routine" className="mt-3 text-[11px] text-slate-500">
              {outsideRoutineCount} logged {outsideRoutineCount === 1 ? "exercise is" : "exercises are"} not in your routine and left out of the charts. Add {outsideRoutineCount === 1 ? "it" : "them"} to a day in Your routine below to include {outsideRoutineCount === 1 ? "it" : "them"}.
            </p>
          )}
        </div>

        {recentLoggings.length > 0 && (
          <div className="mb-8" data-testid="recent-loggings">
            <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500"><Sparkles className="h-3 w-3" /> Logged with AI</p>
            <ul className="space-y-1.5">
              {recentLoggings.map((l) => (
                <li key={l.logId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-300"><span className="text-slate-500">{formatDateShort(l.date)}</span> · {l.exercises.join(", ")}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => reopen(l.logId)}
                      aria-label={`Edit the workout logged for ${formatDateShort(l.date)}`}
                      title="Open this workout to edit it"
                      className="text-slate-500 hover:text-emerald-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => persistEntries(removeWorkoutLogging(entries, l.logId))}
                      aria-label={`Remove the workout logged for ${formatDateShort(l.date)}`}
                      title="Remove this logging"
                      className="text-slate-500 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <RoutineEditor routine={routine} onSave={saveRoutineState} />

        {/* Session volume (collapsed until tapped) */}
        <CollapsibleSection
          testId="session-volume"
          title="Session Volume"
          icon={<Layers className="h-4 w-4 text-cyan-400" />}
          summary={countOf(sessionChart.length, "session")}
        >
          <p className="text-xs text-slate-500 mb-3">Total weight lifted per session (weight x reps over every set), for the time window above.{routineOn ? " Counts only lifts in your routine." : ""}</p>
          {sessionChart.some((s) => s.volume > 0) ? (
            <div style={{ width: "100%", height: isMobile ? 200 : 260 }}>
              <ResponsiveContainer>
                <BarChart data={sessionChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} label={{ value: "Volume (lb)", angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#E2E8F0" }}
                    formatter={(value: number) => [`${value.toLocaleString()} lb`, "Volume"]}
                    labelFormatter={(_label, payload) => {
                      const p = payload?.[0]?.payload;
                      return p ? `${formatDateFull(p.date)} · ${p.exercises} exercises · ${p.sets} sets` : "";
                    }}
                  />
                  <Bar dataKey="volume" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No sessions with weights and reps in this time window.</p>
          )}
        </CollapsibleSection>

        {/* Current Bests table (collapsed until tapped) */}
        <CollapsibleSection
          testId="current-bests"
          title="Current Bests"
          icon={<Flame className="h-4 w-4 text-rose-400" />}
          summary={countOf(bestCount, "lift")}
        >
          {(Object.keys(bestsByType) as WorkoutType[])
            .filter((t) => bestsByType[t].length > 0)
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
        </CollapsibleSection>

        {/* Full log table (collapsed until tapped) */}
        <CollapsibleSection
          testId="full-log"
          title="Full Workout Log"
          icon={<ListChecks className="h-4 w-4 text-cyan-400" />}
          summary={countOf(entries.length, "entry", "entries")}
        >
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
        </CollapsibleSection>

        <p className="text-center text-slate-600 text-xs mt-10">
          Starter data imported from the PPL workout log (Jun–Aug 2026); newer sessions are logged with the box above. Values marked with "~" are approximate reps/sets.
        </p>
      </div>
    </div>
  );
}
