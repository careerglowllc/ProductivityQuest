// Photos attached to a fitness message: checking what was picked, shrinking it on the device, and the words for the buttons.
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_EDGE = 1024; // the longest side after shrinking, which is plenty for the AI to read a plate or a label
export const PHOTO_QUALITY = 0.7;
export const MAX_PHOTO_CHARS = 1_500_000; // the data URL the server will take

export const isImageFile = (file: { type?: string; name?: string }): boolean =>
  (file.type ?? "").startsWith("image/") || /\.(?:jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name ?? "");

// How many more photos can be attached, so a long pick is cut rather than refused.
export const roomForPhotos = (attached: number): number => Math.max(0, MAX_PHOTOS - attached);

// The size to draw a picture at: the same shape, with its longest side no more than `max`. Small pictures are left alone.
export function fitDimensions(width: number, height: number, max = MAX_PHOTO_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!(longest > 0)) return { width: 1, height: 1 };
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const photoErrorMessage = (reason: "type" | "read" | "size" | "full"): string =>
  reason === "type" ? "That file is not a picture."
    : reason === "size" ? "That picture is too large even after shrinking. Try another one."
      : reason === "full" ? `You can attach up to ${MAX_PHOTOS} photos to one message.`
        : "That picture could not be read. Try another one.";

export const photoNote = (count: number): string => (count === 1 ? "1 photo" : `${count} photos`);

// What is sent when a photo is attached with nothing typed.
export const PHOTO_ONLY_TEXT: Record<"workout" | "meal", string> = {
  meal: "Log the food in this photo.",
  workout: "Log the workout in this photo.",
};

export interface Photo { id: string; url: string } // url is a data URL, small enough to send and to show as a thumbnail

type Loader = (file: Blob) => Promise<{ width: number; height: number; draw: (canvas: HTMLCanvasElement, size: { width: number; height: number }) => void }>;

const loadInBrowser: Loader = async (file) => {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("read"));
      img.src = url;
    });
    return {
      width: image.naturalWidth, height: image.naturalHeight,
      draw: (canvas, size) => { canvas.getContext("2d")?.drawImage(image, 0, 0, size.width, size.height); },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
};

// Shrinks a picked or photographed picture on the device and gives back a JPEG data URL, so what is sent stays small and
// HEIC photos from an iPhone camera become something the AI can read.
export async function photoFromFile(file: File, load: Loader = loadInBrowser): Promise<Photo> {
  if (!isImageFile(file)) throw new Error("type");
  let url: string;
  try {
    const image = await load(file);
    const size = fitDimensions(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    image.draw(canvas, size);
    url = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  } catch {
    throw new Error("read");
  }
  if (!url.startsWith("data:image/jpeg;base64,") || url.length < 100) throw new Error("read");
  if (url.length > MAX_PHOTO_CHARS) throw new Error("size");
  return { id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url };
}
