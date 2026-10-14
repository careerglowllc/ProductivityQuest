type ExpandableTask = {
  description?: string | null; details?: string | null;
  skillTags?: string[] | null; apple?: boolean | null; smartPrep?: boolean | null; delegationTask?: boolean | null;
  velin?: boolean | null; assignedTo?: string | null;
};

export const taskDescription = (task: Pick<ExpandableTask, "description" | "details">): string => (task.description || task.details || "").trim();

// Rough room for the collapsed description: two lines on desktop, one line on a phone (which also keeps line breaks).
const DESKTOP_CHARS = 130;
const MOBILE_CHARS = 48;
export const descriptionMayBeClamped = (description: string, isMobile: boolean): boolean =>
  isMobile ? description.length > MOBILE_CHARS || description.includes("\n") : description.length > DESKTOP_CHARS;

// Whether there are named badges (skills, flags, another assignee) that only show once expanded.
export const hasBadgeRow = (task: ExpandableTask): boolean =>
  (task.skillTags?.length ?? 0) > 0 || !!(task.apple || task.smartPrep || task.delegationTask || task.velin)
  || (!!task.assignedTo && task.assignedTo !== "Alex");

// The expand arrow only appears when expanding would show something more.
export const canExpandTask = (task: ExpandableTask, isMobile: boolean): boolean =>
  descriptionMayBeClamped(taskDescription(task), isMobile) || (!isMobile && hasBadgeRow(task));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "Oct 13", with the year only when it is not this year. Due dates are stored as midnight UTC, so read UTC parts.
export function compactDueDate(due: string | null | undefined, now = new Date()): string {
  if (!due) return "No due date";
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return "No due date";
  const year = date.getUTCFullYear();
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}${year === now.getFullYear() ? "" : `, ${year}`}`;
}
