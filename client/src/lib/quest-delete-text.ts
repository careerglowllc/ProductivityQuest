import type { ChildrenAtStake } from "@shared/questline-delete";

const MAX_NAMES = 5;
const quote = (name: string) => `"${name}"`;

// "C", "D" and 3 more
export function nameList(names: string[]): string {
  const shown = names.slice(0, MAX_NAMES).map(quote);
  const more = names.length - shown.length;
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/** The words for the "what about the quests after it?" dialog. */
export function describeStake(stake: ChildrenAtStake) {
  const many = stake.children.length > 1;
  const them = many ? "them" : "it";
  const subject = stake.deleting.length === 1 ? quote(stake.deleting[0]) : `These ${stake.deleting.length} quests`;
  const verb = stake.deleting.length === 1 ? "has" : "have";

  let keepHint: string;
  if (stake.connectsTo.length === 1 && !stake.toTop) {
    keepHint = `${many ? "They" : quote(stake.children[0])} will connect to ${quote(stake.connectsTo[0])} instead.`;
  } else if (stake.connectsTo.length === 0 && stake.toTop) {
    keepHint = `${many ? "They become first quests" : "It becomes a first quest"} of the questline.`;
  } else {
    keepHint = `${many ? "They move" : "It moves"} up to the next quest above ${them}.`;
  }

  return {
    title: stake.deleting.length === 1 ? `Delete ${quote(stake.deleting[0])}?` : `Delete ${stake.deleting.length} quests?`,
    intro: `${subject} ${verb} ${stake.children.length} quest${many ? "s" : ""} after ${stake.deleting.length === 1 ? "it" : "them"} in the questline: ${nameList(stake.children)}. What should happen to ${them}?`,
    keepLabel: "Keep and move up",
    keepHint,
    deleteLabel: `Delete ${them} too`,
    deleteHint: "Moved to the recycling bin with the rest.",
  };
}
