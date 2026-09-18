import assert from "node:assert/strict";
import test from "node:test";
import { placeExternalLabels } from "./circle-map";

test("placeExternalLabels separates labels on each side while retaining desired order", () => {
  const labels = placeExternalLabels([
    { id: "a", side: "left", desiredY: 80 },
    { id: "b", side: "left", desiredY: 82 },
    { id: "c", side: "right", desiredY: 90 },
    { id: "d", side: "right", desiredY: 91 },
  ], 30, 170, 32);
  const left = labels.filter(label => label.side === "left").sort((a, b) => a.y - b.y);
  const right = labels.filter(label => label.side === "right").sort((a, b) => a.y - b.y);
  assert.ok(left[1].y - left[0].y >= 32);
  assert.ok(right[1].y - right[0].y >= 32);
  assert.ok(labels.every(label => label.y >= 30 && label.y <= 170));
});