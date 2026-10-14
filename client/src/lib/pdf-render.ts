import type { PDFDocumentProxy } from "pdfjs-dist";
import { dataUrlToBytes } from "./attachments";

type PdfJs = typeof import("pdfjs-dist");

let loading: Promise<PdfJs> | null = null;

// PDF.js is large, so it is only fetched the first time a PDF is shown.
function loadPdfJs(): Promise<PdfJs> {
  loading ??= (async () => {
    const [lib, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib as PdfJs;
  })().catch((error) => { loading = null; throw error; });
  return loading;
}

export interface OpenPdf { doc: PDFDocumentProxy; close: () => Promise<void> }

/** Opens a stored PDF. Call `close` when done, to release the document and its worker. */
export async function openPdf(dataUrl: string): Promise<OpenPdf> {
  const lib = await loadPdfJs();
  const task = lib.getDocument({ data: dataUrlToBytes(dataUrl) });
  try {
    return { doc: await task.promise, close: () => task.destroy() };
  } catch (error) {
    await task.destroy();
    throw error;
  }
}

/** How much to scale a page so it is `targetWidth` wide, never more than `max` times its own size. */
export function fitScale(pageWidth: number, targetWidth: number, max = 3): number {
  if (!(pageWidth > 0) || !(targetWidth > 0)) return 1;
  return Math.min(max, targetWidth / pageWidth);
}

/** Draws one page into `canvas`, `cssWidth` wide on screen and sharp on dense screens. */
export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number, cssWidth: number, canvas: HTMLCanvasElement): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const ratio = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const viewport = page.getViewport({ scale: fitScale(page.getViewport({ scale: 1 }).width, cssWidth) * ratio });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
  canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
  await page.render({ canvas, viewport, background: "#ffffff" }).promise;
  page.cleanup();
}

export interface PdfPreview { url: string; pages: number }

// The viewer draws at most this many pages, to keep a very long PDF from using up the browser's memory.
export const MAX_VIEWER_PAGES = 50;

const MAX_PREVIEWS = 60;
const previews = new Map<string, Promise<PdfPreview | null>>();

/** A small picture of a PDF's first page and its page count; null when the file cannot be read. Remembered per attachment. */
export function pdfPreview(key: string, dataUrl: string, width = 320): Promise<PdfPreview | null> {
  const known = previews.get(key);
  if (known) return known;
  const work = (async () => {
    let opened: OpenPdf | null = null;
    try {
      opened = await openPdf(dataUrl);
      const canvas = document.createElement("canvas");
      await renderPdfPage(opened.doc, 1, width, canvas);
      return { url: canvas.toDataURL("image/jpeg", 0.82), pages: opened.doc.numPages };
    } catch {
      return null;
    } finally {
      await opened?.close();
    }
  })();
  if (previews.size >= MAX_PREVIEWS) previews.delete(previews.keys().next().value!);
  previews.set(key, work);
  return work;
}
