import assert from "node:assert/strict";
import test from "node:test";
import { decodeImageDataUrl, hashImageDataUrl } from "../src/lib/openrouter-image.js";

const png = "data:image/png;base64,aGVsbG8=";

test("декодирует допустимый data URL и хеширует его байты", () => {
  assert.equal(decodeImageDataUrl(png).mediaType, "image/png");
  assert.equal(decodeImageDataUrl(png).bytes.toString(), "hello");
  assert.equal(hashImageDataUrl(png), hashImageDataUrl(png));
});

test("отклоняет URL без явного формата исходного изображения", () => {
  assert.throws(() => decodeImageDataUrl("https://example.com/image.jpg"), /data URL/);
});
