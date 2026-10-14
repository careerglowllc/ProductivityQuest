import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_VIEWER_PAGES, fitScale } from "./pdf-render";

test("a page is scaled to the width it is shown at, and never blown up past three times", () => {
  assert.equal(fitScale(612, 306), 0.5, "a letter page shown at half width");
  assert.equal(fitScale(612, 612), 1);
  assert.equal(fitScale(100, 900), 3, "a tiny page is not stretched beyond the limit");
  assert.equal(fitScale(100, 900, 2), 2);
});

test("a missing or zero width cannot produce an unusable scale", () => {
  for (const [page, target] of [[0, 300], [300, 0], [NaN, 300], [300, NaN], [-5, 300]]) assert.equal(fitScale(page, target), 1, `${page}, ${target}`);
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("./pdf-render.ts");

test("PDF.js is loaded only when a PDF is first shown, using the broadest-compatible build and its own worker", () => {
  assert.ok(source.includes('import("pdfjs-dist/legacy/build/pdf.mjs")'));
  assert.ok(source.includes('import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")'));
  assert.ok(!/^import (?!type\b).*from "pdfjs-dist/m.test(source), "no static import of the library, so it stays out of the main bundle");
  assert.ok(source.includes("loading = null; throw error;"), "a failed load can be tried again");
});

test("previews are drawn on white, remembered per attachment, and fall back to nothing when the file is unreadable", () => {
  assert.ok(source.includes('background: "#ffffff"'), "a transparent page would turn black as a JPEG");
  assert.ok(source.includes("const known = previews.get(key);") && source.includes("previews.set(key, work);"));
  assert.ok(source.includes("return null;"));
  assert.ok(source.includes("await opened?.close();"), "the document is released after the picture is made");
});

test("the viewer draws at most 50 pages, so a huge PDF cannot use up the browser's memory", () => {
  assert.equal(MAX_VIEWER_PAGES, 50);
});
