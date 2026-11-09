import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const finances = readFileSync(new URL("../pages/finances.tsx", import.meta.url), "utf8");

test("the cancelled WorkBetterClub Meta Verified badge is no longer added, and a copy left on an account is removed", () => {
  const name = "Meta Verified Instagram Badge (WorkBetterClub)";
  assert.equal(finances.includes(`item: "${name}"`), false, "not created any more");
  assert.ok(finances.includes(`const workBetterClubBadge = financialItems.find(i => i.item === "${name}");`), "matched by its exact name only");
  assert.ok(finances.includes("if (workBetterClubBadge) tasks.push(remove(workBetterClubBadge.id));"));
  assert.ok(finances.includes('item: "Instagram Verified Checkmark (MailWisp)"'), "the MailWisp badge stays");
});
