type ExpandableTask = {
  description?: string | null; details?: string | null; importance?: string | null; recurType?: string | null;
  skillTags?: string[] | null; apple?: boolean | null; smartPrep?: boolean | null; delegationTask?: boolean | null;
  velin?: boolean | null; assignedTo?: string | null;
};

export const taskDescription = (task: Pick<ExpandableTask, "description" | "details">): string => (task.description || task.details || "").trim();

const repeats = (recurType?: string | null) => !!recurType && recurType.toLowerCase().replace(/[^a-z-]/g, "") !== "one-time";

// Whether the extra row of badges (importance, repeat, skills, flags) has anything to show.
export const hasBadgeRow = (task: ExpandableTask): boolean =>
  !!task.importance || repeats(task.recurType) || (task.skillTags?.length ?? 0) > 0 || !!(task.apple || task.smartPrep || task.delegationTask || task.velin)
  || (!!task.assignedTo && task.assignedTo !== "Alex");

// A quest card only gets an expand arrow when expanding would show something more: on a phone that is the description,
// on desktop it is the description or the badge row.
export const canExpandTask = (task: ExpandableTask, isMobile: boolean): boolean =>
  taskDescription(task) !== "" || (!isMobile && hasBadgeRow(task));
