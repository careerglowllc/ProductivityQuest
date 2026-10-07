import { z } from "zod";

export const commandCategories = ["finance", "mental-health", "fitness", "relationships"] as const;
export const allocationSchema = z.object({
  name: z.string().min(1).max(80),
  value: z.number().min(0).max(100),
});
export const commandEntryInput = z.object({
  category: z.enum(commandCategories),
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
    const d = new Date(`${v}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Choose a valid date"),
  notes: z.string().max(40000),
  allocation: z.array(allocationSchema).max(5).refine(a => !a.length || Math.abs(a.reduce((s, v) => s + v.value, 0) - 100) < 0.01, "Allocation must total 100%"),
});
export type CommandEntryInput = z.infer<typeof commandEntryInput>;
export type BusinessBranch = {
  name: string; role: string; status: string; thesis: string;
  pros: string[]; cons: string[]; actions: string[]; decision: string;
};
export type CommandBriefing = {
  northStar: string;
  objective: string;
  principles: string[];
  metrics: { label: string; value: string; context: string }[];
  businesses: BusinessBranch[];
  creativeSprint: { budget: string; deliverables: string[]; concepts: string[]; avoid: string[] };
  funnel: string[];
  diagnostics: { signal: string; interpretation: string }[];
  delegation: { own: string[]; delegate: string[]; learn: string[]; screening: string[] };
  capitalLadder: string[];
  compoundCycle: string[];
  success: string[];
};
export type CommandEntry = CommandEntryInput & {
  id: string; updatedAt: string; briefing?: CommandBriefing;
};

const shortText = z.string().max(2000);
const textList = z.array(shortText).max(50);
export const commandBriefingSchema: z.ZodType<CommandBriefing> = z.object({
  northStar: shortText, objective: shortText, principles: textList,
  metrics: z.array(z.object({ label: shortText, value: shortText, context: shortText })).max(20),
  businesses: z.array(z.object({
    name: shortText, role: shortText, status: shortText, thesis: shortText,
    pros: textList, cons: textList, actions: textList, decision: shortText,
  })).max(20),
  creativeSprint: z.object({ budget: shortText, deliverables: textList, concepts: textList, avoid: textList }),
  funnel: textList,
  diagnostics: z.array(z.object({ signal: shortText, interpretation: shortText })).max(30),
  delegation: z.object({ own: textList, delegate: textList, learn: textList, screening: textList }),
  capitalLadder: textList, compoundCycle: textList, success: textList,
});
export const commandImportSchema = z.object({
  format: z.literal("command-center/v1"),
  ownerEmail: z.string().email(),
  entry: commandEntryInput.extend({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
    briefing: commandBriefingSchema.optional(),
  }),
});
