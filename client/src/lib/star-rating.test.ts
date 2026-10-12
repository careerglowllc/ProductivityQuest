import assert from "node:assert/strict";
import { test } from "node:test";
import { nudgeRating, parseRatingInput, ratingFromPosition, snapRating } from "./star-rating";

// A star row 100px wide starting at x = 40, so 20px per star and 2px per tenth.
const at = (x: number) => ratingFromPosition(x, 40, 100);

test("position to rating: the left edge is 0, the right edge is 5, the middle is 2.5", () => {
  assert.equal(at(40), 0);
  assert.equal(at(140), 5);
  assert.equal(at(90), 2.5);
});

test("position to rating: any point maps to the nearest tenth", () => {
  assert.equal(at(40 + 64), 3.2);
  assert.equal(at(40 + 61), 3.1, "3.05 snaps up to 3.1");
  assert.equal(at(40 + 19.9), 1);
  assert.equal(at(40 + 20), 1);
});

test("position to rating: dragging past either end of the stars clamps to 0 and 5", () => {
  assert.equal(at(-500), 0);
  assert.equal(at(9999), 5);
});

test("position to rating: a zero-width row can't produce a rating", () => {
  assert.equal(ratingFromPosition(50, 40, 0), 0);
});

test("a drag across the row passes through every tenth in order", () => {
  const seen = [];
  for (let x = 40; x <= 140; x += 2) seen.push(at(x));
  assert.equal(seen[0], 0);
  assert.equal(seen.at(-1), 5);
  assert.ok(seen.every((value, i) => i === 0 || value >= seen[i - 1]), "never goes backwards");
  assert.ok(seen.every((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9), "always a whole number of tenths");
});

test("snap: rounds to one decimal and keeps within 0 to 5", () => {
  assert.equal(snapRating(3.14159), 3.1);
  assert.equal(snapRating(0.1 + 0.2), 0.3);
  assert.equal(snapRating(-2), 0);
  assert.equal(snapRating(7), 5);
  assert.equal(snapRating(NaN), 0);
  assert.equal(snapRating(Infinity), 0);
});

test("typed input: accepts numbers from 0 to 5 and snaps them to a tenth", () => {
  assert.equal(parseRatingInput("3.7"), 3.7);
  assert.equal(parseRatingInput(" 4 "), 4);
  assert.equal(parseRatingInput(".5"), 0.5);
  assert.equal(parseRatingInput("3."), 3, "half-typed decimals are fine");
  assert.equal(parseRatingInput("4.26"), 4.3);
  assert.equal(parseRatingInput("0"), 0);
  assert.equal(parseRatingInput("5"), 5);
});

test("typed input: ignores empty, out-of-range and non-numeric text", () => {
  for (const bad of ["", " ", "abc", "5.1", "6", "-1", "1e2", "3.5.1", "3,5"]) {
    assert.equal(parseRatingInput(bad), null, JSON.stringify(bad));
  }
});

test("nudge: moves by the step and stops at the ends", () => {
  assert.equal(nudgeRating(3.2, 0.1), 3.3);
  assert.equal(nudgeRating(3.2, -0.5), 2.7);
  assert.equal(nudgeRating(4.9, 0.5), 5);
  assert.equal(nudgeRating(0.1, -0.5), 0);
});
