import assert from "node:assert/strict";
import test from "node:test";
import { buildGenerationContext } from "../src/lib/generation-context.js";

test("revision uses the stored room profile instead of client-supplied geometry", () => {
  const context = buildGenerationContext({
    previousGenerationId: "gen_previous",
    previous: {
      imageUrl: "https://blob.example/generations/previous.jpg",
      imageHash: "b".repeat(64),
      roomType: "bedroom",
      dimensions: "3.2 x 4.8 m, ceiling 2.7 m",
      layout: "window on the left, door on the right wall",
    },
    roomType: "kitchen",
    dimensions: "10 x 10 m",
    layout: "paint the kitchen teal and add an island island-xyz",
    description: "add a bookcase",
  });

  assert.deepEqual(context.roomProfile, {
    roomType: "bedroom",
    dimensions: "3.2 x 4.8 m, ceiling 2.7 m",
    layout: "window on the left, door on the right wall",
    locked: true,
  });
  assert.match(context.prompt, /ROOM PROFILE LOCKED/);
  assert.match(context.prompt, /ROOM TYPE \(IMMUTABLE FOR THIS ROOM\): bedroom/);
  assert.doesNotMatch(context.prompt, /10 x 10 m/);
  assert.doesNotMatch(context.prompt, /island-xyz/);
});

test("a new room starts with an unlocked profile", () => {
  const context = buildGenerationContext({
    roomType: "kitchen",
    dimensions: "3 x 4 m",
    layout: "sink under the window",
    description: "bright family kitchen",
  });

  assert.deepEqual(context.roomProfile, {
    roomType: "kitchen",
    dimensions: "3 x 4 m",
    layout: "sink under the window",
    locked: false,
  });
});
