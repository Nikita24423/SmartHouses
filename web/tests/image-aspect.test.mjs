import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImageRequestBody,
  inferAspectRatioFromDataUrl,
  nearestAspectRatio,
  readImageDimensions,
} from "../src/lib/openrouter-image.js";

function pngBuffer(width, height) {
  const buf = Buffer.alloc(24);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function pngDataUrl(width, height) {
  return `data:image/png;base64,${pngBuffer(width, height).toString("base64")}`;
}

function jpegBuffer(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x0b,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

test("читает размеры PNG и ближайшее соотношение сторон", () => {
  assert.deepEqual(readImageDimensions(pngBuffer(400, 300)), { width: 400, height: 300 });
  assert.equal(nearestAspectRatio(400, 300), "4:3");
  assert.equal(nearestAspectRatio(1920, 1080), "16:9");
  assert.equal(nearestAspectRatio(100, 100), "1:1");
  assert.equal(inferAspectRatioFromDataUrl(pngDataUrl(800, 600)), "4:3");
});

test("читает размеры JPEG как у телефона", () => {
  assert.deepEqual(readImageDimensions(jpegBuffer(4032, 3024)), { width: 4032, height: 3024 });
  assert.equal(nearestAspectRatio(4032, 3024), "4:3");
});

test("JPEG с APP0 перед SOF не путает размеры", () => {
  const sof = jpegBuffer(800, 600).subarray(2);
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.alloc(14),
  ]);
  assert.deepEqual(readImageDimensions(Buffer.concat([app0, sof])), { width: 800, height: 600 });
});

test("фото-референс не форсирует 16:9", () => {
  const body = buildImageRequestBody({
    prompt: "edit",
    references: ["https://example.com/room.jpg"],
    model: "google/gemini-3-pro-image",
    aspectRatio: "4:3",
  });
  assert.equal(body.aspect_ratio, "4:3");
});

test("photo edit на Gemini Pro идёт в 4K", () => {
  const body = buildImageRequestBody({
    prompt: "edit",
    references: ["https://example.com/room.jpg"],
    model: "google/gemini-3-pro-image",
    aspectRatio: "4:3",
    photoEdit: true,
  });
  assert.equal(body.resolution, "4K");
  assert.equal(body.quality, "high");
});

test("без фото edit остаётся 2K", () => {
  const body = buildImageRequestBody({
    prompt: "room",
    references: [],
    model: "google/gemini-3-pro-image",
    photoEdit: false,
  });
  assert.equal(body.resolution, "2K");
});

test("без фото остаётся 16:9, с фото без ratio — auto", () => {
  const generated = buildImageRequestBody({
    prompt: "room",
    references: [],
    model: "google/gemini-3-pro-image",
  });
  assert.equal(generated.aspect_ratio, "16:9");

  const edited = buildImageRequestBody({
    prompt: "edit",
    references: ["https://example.com/room.jpg"],
    model: "google/gemini-3-pro-image",
  });
  assert.equal(edited.aspect_ratio, "auto");
});
