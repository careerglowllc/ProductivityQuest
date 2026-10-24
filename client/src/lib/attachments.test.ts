import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_VIDEO_BYTES, MEDIA_ACCEPT, type QuestAttachment,
  attachmentFileName, dataUrlToBlob, dataUrlToBytes, downloadAttachment, fileToAttachment, filesToAttachments, getMediaType, pdfDataUrl, validateMediaFile,
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
