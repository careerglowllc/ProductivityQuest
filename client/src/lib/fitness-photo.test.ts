import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PHOTOS, MAX_PHOTO_CHARS, MAX_PHOTO_EDGE, PHOTO_ONLY_TEXT, PHOTO_QUALITY,
  fitDimensions, isImageFile, photoErrorMessage, photoFromFile, photoNote, roomForPhotos,
} from "./fitness-photo";

test("a picked file is a picture when its type says so, or failing that its name", () => {
  for (const file of [{ type: "image/jpeg" }, { type: "image/heic", name: "IMG_0001.HEIC" }, { type: "", name: "lunch.jpg" }, { type: "", name: "label.PNG" }, { type: "", name: "shot.webp" }]) {
    assert.equal(isImageFile(file), true, JSON.stringify(file));
  }
  for (const file of [{ type: "application/pdf", name: "menu.pdf" }, { type: "", name: "notes.txt" }, { type: "video/mp4", name: "clip.mp4" }, {}]) {
    assert.equal(isImageFile(file), false, JSON.stringify(file));
  }
});

test("a big photo is shrunk to the longest side, keeping its shape, and a small one is left alone", () => {
  assert.deepEqual(fitDimensions(4032, 3024), { width: 1024, height: 768 });
  assert.deepEqual(fitDimensions(3024, 4032), { width: 768, height: 1024 });
  assert.deepEqual(fitDimensions(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitDimensions(1024, 1024), { width: 1024, height: 1024 });
  assert.deepEqual(fitDimensions(5000, 10), { width: 1024, height: 2 }, "a very wide picture keeps at least one pixel");
  assert.deepEqual(fitDimensions(0, 0), { width: 1, height: 1 }, "a broken size never divides by zero");
  assert.equal(MAX_PHOTO_EDGE, 1024);
  assert.ok(PHOTO_QUALITY > 0 && PHOTO_QUALITY < 1);
});

test("up to four photos go on one message, and the room left is counted", () => {
  assert.equal(MAX_PHOTOS, 4);
  assert.equal(roomForPhotos(0), 4);
  assert.equal(roomForPhotos(3), 1);
  assert.equal(roomForPhotos(4), 0);
  assert.equal(roomForPhotos(9), 0, "never below none");
});

test("what goes wrong is said in plain words", () => {
  assert.equal(photoErrorMessage("type"), "That file is not a picture.");
  assert.match(photoErrorMessage("read"), /could not be read/);
  assert.match(photoErrorMessage("size"), /too large even after shrinking/);
  assert.equal(photoErrorMessage("full"), "You can attach up to 4 photos to one message.");
  assert.equal(photoNote(1), "1 photo");
  assert.equal(photoNote(3), "3 photos");
  assert.equal(PHOTO_ONLY_TEXT.meal, "Log the food in this photo.");
  assert.equal(PHOTO_ONLY_TEXT.workout, "Log the workout in this photo.");
});

// The drawing is the browser's; these check what is done around it.
const fakeCanvas = (url: string) => {
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toDataURL: () => url } as unknown as HTMLCanvasElement;
  (globalThis as { document?: unknown }).document = { createElement: () => canvas };
  return canvas;
};
const jpeg = (chars: number) => `data:image/jpeg;base64,${"A".repeat(chars)}`;
const file = (over: Partial<File> = {}) => ({ type: "image/jpeg", name: "IMG_0001.JPG", ...over }) as File;
const loader = (width: number, height: number) => async () => ({ width, height, draw: () => {} });

test("a photo is drawn at the shrunk size and comes back as a small JPEG with an id", async () => {
  const canvas = fakeCanvas(jpeg(400));
  const photo = await photoFromFile(file(), loader(4032, 3024));
  assert.equal(canvas.width, 1024);
  assert.equal(canvas.height, 768);
  assert.equal(photo.url, jpeg(400));
  assert.match(photo.id, /^photo-\d+-[a-z0-9]+$/);
  const second = await photoFromFile(file(), loader(100, 100));
  assert.notEqual(second.id, photo.id, "two photos never share an id");
});

test("a file that is not a picture, one that cannot be read, and one that is still too big are each refused", async () => {
  fakeCanvas(jpeg(400));
  await assert.rejects(photoFromFile(file({ type: "application/pdf", name: "menu.pdf" }), loader(10, 10)), /type/);
  await assert.rejects(photoFromFile(file(), async () => { throw new Error("broken"); }), /read/);
  fakeCanvas("data:,");
  await assert.rejects(photoFromFile(file(), loader(100, 100)), /read/);
  fakeCanvas(jpeg(MAX_PHOTO_CHARS));
  await assert.rejects(photoFromFile(file(), loader(100, 100)), /size/);
});
