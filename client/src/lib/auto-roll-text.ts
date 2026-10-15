/** The words for the "move overdue quests to today" setting. */
export function autoRollText(timezone: string | undefined, enabled: boolean) {
  const zone = timezone ? `, in your timezone (${timezone.replace(/_/g, " ")})` : "";
  return {
    title: "Move overdue quests to today",
    description: `On a new day, quests whose due date has passed get today's date automatically, just after midnight${zone}. Finished and deleted quests are never changed.`,
    hint: enabled
      ? "On. It starts with the next new day; to move today's overdue quests now, use Move Overdue to Today on the Quests page."
      : "Off. Overdue quests keep their old due date until you change it.",
  };
}

export const autoRollToast = (next: boolean) => next
  ? { title: "Overdue quests will move to today", description: "Starting with the next new day." }
  : { title: "Overdue quests will stay as they are" };
