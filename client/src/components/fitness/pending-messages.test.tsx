import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PendingMessages } from "./pending-messages";
import type { QueuedMessage } from "@/lib/fitness-queue";

const render = (queue: QueuedMessage[]) => renderToStaticMarkup(createElement(PendingMessages, { queue, onRetry: () => {}, onEdit: () => {}, onRemove: () => {} }));
const rows = (html: string) => html.match(/<li[^>]*data-testid="pending-message".*?<\/li>/g) ?? [];
const row = (html: string, index = 0): string => {
  const found = rows(html)[index];
  assert.ok(found, `row ${index} is there`);
  return found;
};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const sending: QueuedMessage = { id: "1", text: "an everything bagel", status: "sending" };
const waiting: QueuedMessage = { id: "2", text: "and a latte", status: "queued" };
const failed: QueuedMessage = { id: "3", text: "salmon", status: "failed", error: "The AI is temporarily unavailable. Please try again." };

test("nothing is shown when nothing is waiting", () => {
  assert.equal(render([]), "");
});

test("the message being added shows what was sent and that it is going in, with nothing to press", () => {
  const row0 = row(render([sending]));
  assert.match(row0, /data-status="sending"/);
  assert.equal(text(row0), "an everything bagel Adding it now…");
  assert.doesNotMatch(row0, /<button/);
  assert.match(row0, /animate-spin/);
});

test("messages typed since are listed in order, each waiting its turn and removable", () => {
  const html = render([sending, waiting, { id: "4", text: "salmon", status: "queued" }]);
  const list = rows(html);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((r) => /data-status="(\w+)"/.exec(r)![1]), ["sending", "queued", "queued"]);
  assert.match(text(row(html, 1)), /and a latte Waiting its turn/);
  assert.match(row(html, 1), /aria-label="Remove this message"/);
  assert.doesNotMatch(row(html, 1), /Try this message again/);
});

test("a failed message shows why, and can be tried again, put back in the box, or removed", () => {
  const failedRow = row(render([failed]));
  assert.match(failedRow, /data-status="failed"/);
  assert.match(text(failedRow), /salmon The AI is temporarily unavailable\. Please try again\./);
  assert.match(failedRow, /aria-label="Try this message again"/);
  assert.match(failedRow, /aria-label="Put this message back in the box to edit it"/);
  assert.match(failedRow, /aria-label="Remove this message"/);
});

test("messages behind a failed one say they are waiting for it", () => {
  const html = render([failed, waiting]);
  assert.match(text(row(html, 1)), /and a latte Waiting for the message above to be sorted out/);
});

test("a long message is cut short on one line but its full text is on hover", () => {
  const long = "a".repeat(500);
  const longRow = row(render([{ id: "9", text: long, status: "queued" }]));
  assert.match(longRow, /truncate/);
  assert.match(longRow, new RegExp(`title="${long}"`));
});

test("the list is announced politely to screen readers", () => {
  assert.match(render([sending]), /<ul[^>]*aria-label="Messages being added"[^>]*aria-live="polite"/);
});
