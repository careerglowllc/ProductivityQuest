import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_VIDEO_BYTES, MEDIA_ACCEPT, type QuestAttachment,
  UNDO_REMOVE_MS, removeWithUndo, attachmentFileName, dataUrlToBlob, findAttachment, restoreAttachment, withoutAttachment, dataUrlToBytes, downloadAttachment, fileToAttachment, filesToAttachments, getMediaType, pdfDataUrl, validateMediaFile,
} from "./attachments";

const file = (name: string, type: string, bytes = 4) => new File([new Uint8Array(bytes)], name, { type });

// Node has no FileReader; this one reads a File the way the browser's does.
class FakeReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(f: File) {
    f.arrayBuffer().then((buffer) => {
      this.result = `data:${f.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onload?.();
    });
  }
}
(globalThis as any).FileReader = FakeReader;

test("images, videos and PDFs are recognised, whatever the browser reports for a PDF", () => {
  assert.equal(getMediaType(file("a.png", "image/png")), "image");
  assert.equal(getMediaType(file("a.mp4", "video/mp4")), "video");
  assert.equal(getMediaType(file("a.pdf", "application/pdf")), "pdf");
  assert.equal(getMediaType(file("a.pdf", "application/x-pdf")), "pdf");
  assert.equal(getMediaType(file("Summary.PDF", "")), "pdf", "no type reported");
  assert.equal(getMediaType(file("a.pdf", "application/octet-stream")), "pdf", "generic type reported");
});

test("other documents are still turned away, including a PDF-named file that says it is something else", () => {
  for (const [name, type] of [["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["a.txt", "text/plain"], ["a.zip", "application/zip"], ["notes", ""], ["a.pdf", "text/plain"]]) {
    assert.equal(getMediaType(file(name, type)), null, `${name} (${type})`);
  }
  assert.equal(validateMediaFile(file("a.txt", "text/plain")), '"a.txt" isn\'t a supported image, video or PDF.');
});

test("each kind has its own size limit and message", () => {
  assert.equal(MAX_PDF_BYTES, 10 * 1024 * 1024);
  assert.equal(validateMediaFile(file("a.pdf", "application/pdf", MAX_PDF_BYTES)), null, "exactly the limit is fine");
  assert.match(validateMediaFile(file("big.pdf", "application/pdf", MAX_PDF_BYTES + 1))!, /PDFs must be under 10 MB/);
  assert.equal(validateMediaFile(file("a.png", "image/png", MAX_IMAGE_BYTES)), null);
  assert.match(validateMediaFile(file("big.png", "image/png", MAX_IMAGE_BYTES + 1))!, /images must be under 8\.0 MB/);
  assert.equal(validateMediaFile(file("a.mp4", "video/mp4", MAX_VIDEO_BYTES)), null);
  assert.match(validateMediaFile(file("big.mp4", "video/mp4", MAX_VIDEO_BYTES + 1))!, /videos must be under 25 MB/);
  assert.ok(MEDIA_ACCEPT.includes("application/pdf") && MEDIA_ACCEPT.includes(".pdf") && MEDIA_ACCEPT.includes("image/*") && MEDIA_ACCEPT.includes("video/*"));
});

test("a PDF becomes an attachment that keeps its name and size and opens as a PDF", async () => {
  const attachment = await fileToAttachment(file("OSA_Jaw_Surgery_Summary_Next_Steps.pdf", "application/pdf", 1234));
  assert.equal(attachment.type, "pdf");
  assert.equal(attachment.name, "OSA_Jaw_Surgery_Summary_Next_Steps.pdf");
  assert.equal(attachment.size, 1234);
  assert.ok(attachment.dataUrl.startsWith("data:application/pdf;base64,"));
  const untyped = await fileToAttachment(file("scan.pdf", ""));
  assert.ok(untyped.dataUrl.startsWith("data:application/pdf;base64,"), "a generic data URL is corrected");
});

test("a mix of files adds the good ones and reports the rest", async () => {
  const { attachments, errors } = await filesToAttachments([file("a.pdf", "application/pdf"), file("b.png", "image/png"), file("c.txt", "text/plain"), file("d.pdf", "application/pdf", MAX_PDF_BYTES + 1)]);
  assert.deepEqual(attachments.map((a) => a.type).sort(), ["image", "pdf"]);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((message) => message.includes("c.txt")) && errors.some((message) => message.includes("d.pdf")));
});

test("a stored PDF can be turned back into the exact file for the viewer", async () => {
  const original = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 52, 0, 255, 128, 10]); // "%PDF-1.4" and some binary
  const attachment = await fileToAttachment(new File([original], "x.pdf", { type: "application/pdf" }));
  const blob = dataUrlToBlob(attachment.dataUrl);
  assert.equal(blob.type, "application/pdf");
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), original);
  assert.equal(pdfDataUrl("data:application/octet-stream;base64,AAAA"), "data:application/pdf;base64,AAAA");
  assert.equal(pdfDataUrl("data:application/pdf;base64,AAAA"), "data:application/pdf;base64,AAAA");
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const stored = (name: string, type: QuestAttachment["type"], dataUrl: string): QuestAttachment => ({ id: "a1", name, type, dataUrl, size: 3 });
const PDF_URL = "data:application/pdf;base64,JVBERg=="; // "%PDF"

test("a downloaded file keeps its own name, and gets an extension when it had none", () => {
  assert.equal(attachmentFileName(stored("OSA_Summary.pdf", "pdf", PDF_URL)), "OSA_Summary.pdf");
  assert.equal(attachmentFileName(stored("scan", "pdf", PDF_URL)), "scan.pdf");
  assert.equal(attachmentFileName(stored("", "pdf", PDF_URL)), "document.pdf");
  assert.equal(attachmentFileName(stored("IMG_1", "image", "data:image/jpeg;base64,AAAA")), "IMG_1.jpg");
  assert.equal(attachmentFileName(stored("clip", "video", "data:video/quicktime;base64,AAAA")), "clip.mov");
  assert.equal(attachmentFileName(stored("clip.mp4", "video", "data:video/mp4;base64,AAAA")), "clip.mp4");
  assert.equal(attachmentFileName(stored("a/b:c?.pdf", "pdf", PDF_URL)), "a_b_c_.pdf", "characters a file name cannot hold are replaced");
});

test("the bytes of a stored file come back exactly", () => {
  assert.deepEqual(Array.from(dataUrlToBytes(PDF_URL)), [37, 80, 68, 70]);
});

test("downloading saves the file under its name through a short-lived link, for any kind of attachment", async () => {
  const clicked: Array<{ href: string; download: string; rel: string }> = [];
  let appended = 0, removed = 0;
  const link = { href: "", download: "", rel: "", click() { clicked.push({ href: this.href, download: this.download, rel: this.rel }); }, remove() { removed++; } };
  (globalThis as any).document = { createElement: () => link, body: { appendChild: () => { appended++; } } };
  const timers: Array<() => void> = [];
  const realSetTimeout = globalThis.setTimeout;
  (globalThis as any).setTimeout = (fn: () => void) => { timers.push(fn); return 0; };
  const revoked: string[] = [];
  const realRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = (url: string) => { revoked.push(url); };
  try {
    for (const attachment of [stored("Report.pdf", "pdf", PDF_URL), stored("Photo.png", "image", "data:image/png;base64,AAAA"), stored("Clip.mp4", "video", "data:video/mp4;base64,AAAA")]) {
      downloadAttachment(attachment);
    }
    assert.deepEqual(clicked.map((c) => c.download), ["Report.pdf", "Photo.png", "Clip.mp4"]);
    assert.ok(clicked.every((c) => c.href.startsWith("blob:") && c.rel === "noopener"));
    assert.equal(appended, 3);
    assert.equal(removed, 3);
    assert.deepEqual(revoked, [], "the file is not released before the browser has started saving it");
    timers.forEach((run) => run());
    assert.equal(revoked.length, 3);
  } finally {
    (globalThis as any).setTimeout = realSetTimeout;
    URL.revokeObjectURL = realRevoke;
    delete (globalThis as any).document;
  }
});

test("the attachment area shows a PDF preview tile, opens it in the PDF.js viewer, and says PDFs are welcome", () => {
  const area = read("../components/attachment-area.tsx");
  assert.ok(area.includes('att.type === "pdf"') && area.includes('lightbox.type === "pdf"'));
  assert.ok(area.includes("<PdfThumb attachment={att} />") && area.includes("pdfPreview(attachment.id, attachment.dataUrl)"));
  assert.ok(area.includes("<PdfViewer attachment={lightbox} />") && area.includes("renderPdfPage(doc, number, width, canvas)"));
  assert.ok(!area.includes("<iframe"), "the browser's own PDF viewer is not used, so Chrome's download-only setting cannot break it");
  assert.ok(area.includes("Showing the first {MAX_VIEWER_PAGES} of {state.total} pages"));
  assert.ok(area.includes("This PDF can't be previewed. Use Download to open it."));
  assert.ok(area.includes('aria-label="Attach image, video or PDF"'));
  assert.ok(area.includes("Drop image, video or PDF to embed"));
  assert.ok(area.includes("PDFs ≤ {formatBytes(MAX_PDF_BYTES)}"));
});

test("every attachment has a Download button, also when the area is read-only, and the viewer has a labelled one", () => {
  const area = read("../components/attachment-area.tsx");
  const tile = area.slice(area.indexOf("Inline media previews"), area.indexOf("Full-screen lightbox"));
  assert.ok(tile.includes("downloadAttachment(att)") && tile.includes("aria-label={`Download ${att.name}`}"));
  assert.ok(tile.indexOf("downloadAttachment(att)") < tile.indexOf("{!disabled && ("), "download is not inside the editable-only part");
  const viewer = area.slice(area.indexOf("Full-screen lightbox"));
  assert.ok(viewer.includes("downloadAttachment(lightbox)") && viewer.includes("<span>Download</span>"));
});

test("the full-screen viewer is clickable inside a modal Dialog, which turns pointer events off on <body>", () => {
  const area = read("../components/attachment-area.tsx");
  const overlay = area.slice(area.indexOf("createPortal(\n"), area.indexOf("Top bar: filename"));
  assert.ok(overlay.includes('className="pointer-events-auto fixed inset-0'), "the portal to <body> opts back in to pointer events");
});

test("the stored shape allows PDFs", () => {
  assert.ok(read("../../../shared/schema.ts").includes('type: "image" | "video" | "pdf"'));
});

// ── Removing an attachment, and taking it back ──────────────────────────────
const att = (id: string, name = `${id}.png`): QuestAttachment => ({ id, type: "image", dataUrl: "data:image/png;base64,AA==", name, size: 4 });
const ids = (list: readonly QuestAttachment[]) => list.map((a) => a.id);

test("the Undo toast stays up for 8 seconds", () => {
  assert.equal(UNDO_REMOVE_MS, 8000);
});

test("an attachment is found with its place in the list, and a missing one is not", () => {
  const list = [att("a"), att("b"), att("c")];
  assert.deepEqual(findAttachment(list, "b"), { attachment: list[1], index: 1 });
  assert.equal(findAttachment(list, "x"), null);
  assert.equal(findAttachment([], "a"), null);
});

test("removing one attachment leaves the others in order and does not change the list it was given", () => {
  const list = [att("a"), att("b"), att("c")];
  assert.deepEqual(ids(withoutAttachment(list, "b")), ["a", "c"]);
  assert.deepEqual(ids(list), ["a", "b", "c"]);
  assert.deepEqual(ids(withoutAttachment(list, "x")), ["a", "b", "c"], "an unknown id changes nothing");
});

test("Undo puts the file back where it was, whichever place that was", () => {
  const list = [att("a"), att("b"), att("c")];
  for (const [id, index] of [["a", 0], ["b", 1], ["c", 2]] as const) {
    const removed = list[index];
    assert.deepEqual(ids(restoreAttachment(withoutAttachment(list, id), removed, index)), ["a", "b", "c"], `${id} back at ${index}`);
  }
});

test("Undo restores the whole file, not just its name", () => {
  const removed = { ...att("b"), dataUrl: "data:image/png;base64,QUJDREVGRw==", size: 7 };
  const back = restoreAttachment([att("a"), att("c")], removed, 1);
  assert.deepEqual(back[1], removed);
});

test("Undo builds on what is there now: other attachments added or removed meanwhile are kept", () => {
  const removed = att("b");
  assert.deepEqual(ids(restoreAttachment([att("a"), att("c"), att("d")], removed, 1)), ["a", "b", "c", "d"], "one added since");
  assert.deepEqual(ids(restoreAttachment([att("c")], removed, 1)), ["c", "b"], "the list got shorter: at the end");
  assert.deepEqual(ids(restoreAttachment([att("a")], removed, 5)), ["a", "b"], "an index past the end goes last");
  assert.deepEqual(ids(restoreAttachment([att("a")], removed, -3)), ["b", "a"], "a negative index goes first");
  assert.deepEqual(ids(restoreAttachment([], removed, 0)), ["b"], "the last attachment can come back too");
});

test("Undo never adds the same attachment twice", () => {
  const removed = att("b");
  const once = restoreAttachment([att("a")], removed, 1);
  assert.deepEqual(ids(restoreAttachment(once, removed, 1)), ["a", "b"], "pressing Undo again");
  assert.deepEqual(ids(restoreAttachment([att("a"), att("b")], removed, 0)), ["a", "b"]);
});

test("the quest detail view asks before removing an attachment and offers Undo; other places are unchanged", () => {
  const area = readFileSync(new URL("../components/attachment-area.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../components/task-detail-modal.tsx", import.meta.url), "utf8");
  assert.ok(detail.includes("showHint={isEditingDetails}\n              confirmRemove\n"), "the quest detail view turns it on");
  assert.ok(/confirmRemove = false/.test(area), "off by default, so the journal and the create form behave as before");
  assert.ok(area.includes("if (confirmRemove) setPendingRemove(att);") && area.includes("else removeAttachment(att.id);"), "the X asks first only when it is on");
  assert.ok(area.includes('<AlertDialogTitle className="font-serif text-yellow-100">Remove this attachment?</AlertDialogTitle>'));
  assert.ok(area.includes("<AlertDialogCancel") && area.includes('data-testid="confirm-remove-attachment"'), "Cancel and Remove");
  assert.ok(area.includes("onClick={() => { if (pendingRemove) confirmRemoval(pendingRemove.id); setPendingRemove(null); }}"), "nothing is removed until Remove is pressed");
  assert.ok(area.includes("duration: UNDO_REMOVE_MS"), "the toast lasts 8 seconds");
  assert.ok(area.includes("<ToastAction") && area.includes("removeWithUndo(id, {"), "removal goes through the remove-and-undo flow");
  assert.ok(area.includes("getAttachments: () => latest.current.attachments"), "and builds on the latest list");
});

// A stand-in for the quest: holds the list, records every save, and keeps the Undo that the toast would carry.
function fakeQuest(initial: QuestAttachment[]) {
  const quest = {
    list: initial, saves: [] as string[][], toasts: [] as { name: string; undo: () => void }[],
    io: {
      getAttachments: () => quest.list,
      onChange: (next: QuestAttachment[]) => { quest.list = next; quest.saves.push(ids(next)); },
      offerUndo: (removed: QuestAttachment, undo: () => void) => { quest.toasts.push({ name: removed.name, undo }); },
    },
  };
  return quest;
}

test("removing saves the shorter list and shows one Undo; pressing Undo saves the file back in its place", () => {
  const quest = fakeQuest([att("a", "plan.pdf"), att("b", "photo.png"), att("c", "clip.mp4")]);
  assert.equal(removeWithUndo("b", quest.io), true);
  assert.deepEqual(quest.saves, [["a", "c"]], "saved without it");
  assert.deepEqual(quest.toasts.map((t) => t.name), ["photo.png"], "one toast, naming the file");
  quest.toasts[0].undo();
  assert.deepEqual(quest.saves, [["a", "c"], ["a", "b", "c"]], "saved again with it back");
  assert.deepEqual(ids(quest.list), ["a", "b", "c"]);
});

test("Undo keeps what changed while the toast was up", () => {
  const quest = fakeQuest([att("a"), att("b"), att("c")]);
  removeWithUndo("b", quest.io);
  quest.io.onChange([...quest.list, att("d")]); // another file attached meanwhile
  quest.toasts[0].undo();
  assert.deepEqual(ids(quest.list), ["a", "b", "c", "d"]);
});

test("removing the same attachment twice changes nothing the second time and offers no second Undo", () => {
  const quest = fakeQuest([att("a"), att("b")]);
  assert.equal(removeWithUndo("b", quest.io), true);
  assert.equal(removeWithUndo("b", quest.io), false);
  assert.equal(quest.saves.length, 1);
  assert.equal(quest.toasts.length, 1);
});

test("an attachment that is not in the list is never removed and nothing is offered", () => {
  const quest = fakeQuest([att("a")]);
  assert.equal(removeWithUndo("zzz", quest.io), false);
  assert.deepEqual(quest.saves, []);
  assert.deepEqual(quest.toasts, []);
});

test("the only attachment can be removed and undone", () => {
  const quest = fakeQuest([att("a", "only.png")]);
  removeWithUndo("a", quest.io);
  assert.deepEqual(ids(quest.list), []);
  quest.toasts[0].undo();
  assert.deepEqual(ids(quest.list), ["a"]);
});

test("tapping Undo on the toast does not close the quest detail view behind it", () => {
  const detail = readFileSync(new URL("../components/task-detail-modal.tsx", import.meta.url), "utf8");
  assert.ok(detail.includes('closest?.("[data-radix-toast-viewport]")) event.preventDefault()'), "a tap inside the toast area is not an outside tap");
  const toasts = readFileSync(new URL("../components/ui/toast.tsx", import.meta.url), "utf8");
  assert.ok(toasts.includes("pointer-events-auto"), "and the toast itself can be tapped while a dialog is open");
});

