import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_VIDEO_BYTES, MEDIA_ACCEPT,
  dataUrlToBlob, fileToAttachment, filesToAttachments, getMediaType, pdfDataUrl, validateMediaFile,
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

test("the attachment area shows a PDF tile, opens it in a viewer, and says PDFs are welcome", () => {
  const area = read("../components/attachment-area.tsx");
  assert.ok(area.includes('att.type === "pdf"') && area.includes('lightbox.type === "pdf"'));
  assert.ok(area.includes("<iframe") && area.includes("URL.revokeObjectURL"), "viewer frees its URL");
  assert.ok(area.includes('aria-label="Attach image, video or PDF"'));
  assert.ok(area.includes("Drop image, video or PDF to embed"));
  assert.ok(area.includes("PDFs ≤ {formatBytes(MAX_PDF_BYTES)}"));
});

test("the stored shape allows PDFs", () => {
  assert.ok(read("../../../shared/schema.ts").includes('type: "image" | "video" | "pdf"'));
});
