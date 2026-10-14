// Shared helpers for quest description attachments (inline images, videos and PDFs).
//
// Files are stored as base64 data URLs inside the task's `attachments` JSONB column.
// This keeps everything in the database so attachments persist across server
// redeploys and work identically on web + iOS (which share the hosted origin).

export type AttachmentType = "image" | "video" | "pdf";

export interface QuestAttachment {
  id: string;
  type: AttachmentType;
  dataUrl: string; // base64 data URL (e.g. "data:image/png;base64,...")
  name: string;
  size: number; // original file size in bytes
}

// Reasonable size limits for drop-in files. Kept conservative so base64 payloads
// stay within the server body limit (40mb) and DB rows stay manageable.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

// Accept attribute for the hidden file input.
export const MEDIA_ACCEPT = "image/*,video/*,application/pdf,.pdf";

const LIMITS: Record<AttachmentType, number> = { image: MAX_IMAGE_BYTES, video: MAX_VIDEO_BYTES, pdf: MAX_PDF_BYTES };
const PLURALS: Record<AttachmentType, string> = { image: "images", video: "videos", pdf: "PDFs" };

/** Human-friendly byte formatting, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Returns the attachment type for a File, or null if it isn't a supported image, video or PDF. */
export function getMediaType(file: File): AttachmentType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  // Some browsers and drag sources leave a PDF's type empty or generic, so fall back on the extension.
  const typeUnknown = !file.type || file.type === "application/octet-stream";
  if (/^application\/(x-)?pdf$/i.test(file.type) || (typeUnknown && /\.pdf$/i.test(file.name))) return "pdf";
  return null;
}

/**
 * Validates a single file against type + size limits.
 * Returns an error message string if invalid, or null if the file is acceptable.
 */
export function validateMediaFile(file: File): string | null {
  const type = getMediaType(file);
  if (!type) {
    return `"${file.name}" isn't a supported image, video or PDF.`;
  }
  const limit = LIMITS[type];
  if (file.size > limit) {
    return `"${file.name}" is ${formatBytes(file.size)} — ${PLURALS[type]} must be under ${formatBytes(limit)}.`;
  }
  return null;
}

/** A PDF read from a file with no type comes back as a generic data URL; this makes it a PDF one so it can be shown. */
export const pdfDataUrl = (dataUrl: string): string => dataUrl.replace(/^data:[^;,]*/, "data:application/pdf");

/** The bytes of one of our base64 data URLs. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Turns one of our base64 data URLs back into a Blob, for downloading it or showing it. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const mime = dataUrl.slice(5, dataUrl.indexOf(",")).split(";")[0] || "application/octet-stream";
  return new Blob([dataUrlToBytes(dataUrl)], { type: mime });
}

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/heic": "heic",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

/** The name a downloaded attachment is saved under: its own name, with an extension if it had none. */
export function attachmentFileName(attachment: Pick<QuestAttachment, "name" | "type" | "dataUrl">): string {
  const name = (attachment.name || "").trim().replace(/[\\/:*?"<>|]+/g, "_") || (attachment.type === "pdf" ? "document" : attachment.type);
  if (/\.[A-Za-z0-9]{2,5}$/.test(name)) return name;
  const mime = attachment.dataUrl.slice(5, attachment.dataUrl.indexOf(",")).split(";")[0];
  const extension = EXTENSIONS[mime] ?? (attachment.type === "pdf" ? "pdf" : "");
  return extension ? `${name}.${extension}` : name;
}

/** Saves an attachment to the device. Works for images, videos and PDFs alike. */
export function downloadAttachment(attachment: QuestAttachment): void {
  // A blob URL, because browsers refuse or cut off downloads from very long data URLs.
  const url = URL.createObjectURL(dataUrlToBlob(attachment.dataUrl));
  const link = document.createElement("a");
  link.href = url;
  link.download = attachmentFileName(attachment);
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked later, since some browsers start the download after click returns.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

/**
 * Reads a validated File into a QuestAttachment with a base64 data URL.
 * Throws if the file fails validation or can't be read.
 */
export function fileToAttachment(file: File): Promise<QuestAttachment> {
  const error = validateMediaFile(file);
  if (error) return Promise.reject(new Error(error));

  const type = getMediaType(file)!;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        id: makeId(),
        type,
        dataUrl: type === "pdf" ? pdfDataUrl(result) : result,
        name: file.name || (type === "pdf" ? "document.pdf" : type === "image" ? "image" : "video"),
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/**
 * Processes a list of dropped/selected files. Valid media is converted to
 * attachments; invalid files are collected as error messages.
 */
export async function filesToAttachments(
  files: FileList | File[],
): Promise<{ attachments: QuestAttachment[]; errors: string[] }> {
  const list = Array.from(files);
  const attachments: QuestAttachment[] = [];
  const errors: string[] = [];

  await Promise.all(
    list.map(async (file) => {
      try {
        attachments.push(await fileToAttachment(file));
      } catch (e: any) {
        errors.push(e?.message || `Couldn't add "${file.name}".`);
      }
    }),
  );

  return { attachments, errors };
}
