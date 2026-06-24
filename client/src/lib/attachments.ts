// Shared helpers for quest description media attachments (inline images/videos).
//
// Media is stored as base64 data URLs inside the task's `attachments` JSONB column.
// This keeps everything in the database so attachments persist across server
// redeploys and work identically on web + iOS (which share the hosted origin).

export type AttachmentType = "image" | "video";

export interface QuestAttachment {
  id: string;
  type: AttachmentType;
  dataUrl: string; // base64 data URL (e.g. "data:image/png;base64,...")
  name: string;
  size: number; // original file size in bytes
}

// Reasonable size limits for drop-in media. Kept conservative so base64 payloads
// stay within the server body limit (40mb) and DB rows stay manageable.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

// Accept attribute for the hidden file input.
export const MEDIA_ACCEPT = "image/*,video/*";

/** Human-friendly byte formatting, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Returns the media type for a File, or null if it isn't a supported image/video. */
export function getMediaType(file: File): AttachmentType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

/**
 * Validates a single file against type + size limits.
 * Returns an error message string if invalid, or null if the file is acceptable.
 */
export function validateMediaFile(file: File): string | null {
  const type = getMediaType(file);
  if (!type) {
    return `"${file.name}" isn't a supported image or video.`;
  }
  const limit = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) {
    return `"${file.name}" is ${formatBytes(file.size)} — ${
      type === "image" ? "images" : "videos"
    } must be under ${formatBytes(limit)}.`;
  }
  return null;
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
      resolve({
        id: makeId(),
        type,
        dataUrl: reader.result as string,
        name: file.name || (type === "image" ? "image" : "video"),
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
