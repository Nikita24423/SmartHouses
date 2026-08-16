import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBlobConfigured,
  GENERATION_UNAVAILABLE_MESSAGE,
} from "../src/lib/openrouter-image.js";

const blobEnvironmentKeys = [
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "VERCEL_OIDC_TOKEN",
];

function withBlobEnvironment(values, callback) {
  const before = Object.fromEntries(
    blobEnvironmentKeys.map((key) => [key, process.env[key]])
  );

  try {
    for (const key of blobEnvironmentKeys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    callback();
  } finally {
    for (const key of blobEnvironmentKeys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
}

test("Vercel Blob store does not require a manually exposed OIDC token", () => {
  withBlobEnvironment({ BLOB_STORE_ID: "store_test" }, () => {
    assert.doesNotThrow(() => assertBlobConfigured());
  });
});

test("missing Blob configuration stays an internal error", () => {
  withBlobEnvironment({}, () => {
    assert.throws(
      () => assertBlobConfigured(),
      (error) =>
        error.code === "RESULT_STORAGE_UNAVAILABLE" &&
        !error.message.includes("Хранилище")
    );
  });

  assert.equal(
    GENERATION_UNAVAILABLE_MESSAGE,
    "Не удалось создать интерьер. Попробуйте ещё раз."
  );
});
