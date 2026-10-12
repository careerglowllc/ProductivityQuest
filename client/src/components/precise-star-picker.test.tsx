import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PreciseStarPicker } from "./precise-star-picker";

const render = (value: number) => renderToStaticMarkup(<PreciseStarPicker label="Food Taste" value={value} onChange={() => {}} />);

test("star picker: exposes a slider with the exact value and a readout to the tenth", () => {
  const html = render(3.2);
  assert.match(html, /role="slider"/);
  assert.match(html, /aria-valuenow="3.2"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="5"/);
  assert.match(html, /aria-valuetext="3.2 out of 5"/);
  assert.match(html, /data-testid="star-value"[^>]*value="3.2"|value="3.2"[^>]*data-testid="star-value"/);
});

test("star picker: shows whole numbers with a trailing .0", () => {
  assert.match(render(4), /value="4.0"/);
  assert.match(render(0), /value="0.0"/);
});

test("star picker: the filled portion of the stars matches the rating exactly", () => {
  const width = (value: number) => render(value).match(/data-testid="star-fill"[^>]*style="width:([\d.]+)%/)?.[1];
  assert.equal(width(0), "0");
  assert.equal(width(2.5), "50");
  assert.equal(width(3.2), "64");
  assert.equal(width(5), "100");
});

test("star picker: a value outside 0 to 5 or a long decimal is shown as a clean tenth within range", () => {
  assert.match(render(7), /aria-valuenow="5"/);
  assert.match(render(-1), /aria-valuenow="0"/);
  assert.match(render(3.14159), /value="3.1"/);
});

test("star picker: five stars, and the row is labelled for screen readers", () => {
  const html = render(1);
  assert.equal((html.match(/★★★★★/g) ?? []).length, 2, "an empty row and a filled row on top");
  assert.match(html, /aria-label="Food Taste"/);
  assert.match(html, /aria-label="Food Taste rating"/);
});
