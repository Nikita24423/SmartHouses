import assert from "node:assert/strict";
import test from "node:test";
import { buildGenerationContext } from "../src/lib/generation-context.js";

test("Авто формирует обязательный стиль и полный набор мебели", () => {
  const context = buildGenerationContext({
    styleId: "auto",
    roomType: "kitchen",
    description: "Светлая кухня для семьи",
  });

  assert.equal(context.style.id, "auto");
  assert.match(context.prompt, /Select one coherent contemporary interior style/);
  assert.match(context.prompt, /refrigerator, cooktop, oven, extractor hood/);
});

test("повторный запрос использует сохранённое изображение первым reference", () => {
  const context = buildGenerationContext({
    previousGenerationId: "gen_previous",
    previous: {
      imageUrl: "https://blob.example/generations/previous.jpg",
      imageHash: "a".repeat(64),
    },
    sourceImages: ["https://blob.example/plans/plan.jpg"],
    roomType: "living",
    styleId: "scandinavian",
    description: "добавь книжный шкаф",
  });

  assert.deepEqual(context.references, [
    "https://blob.example/generations/previous.jpg",
    "https://blob.example/plans/plan.jpg",
  ]);
  assert.match(context.prompt, /REVISION MODE/);
  assert.match(context.prompt, /do not invent a different room/);
});

test("без сохранённого контекста повторная генерация отклоняется", () => {
  assert.throws(
    () =>
      buildGenerationContext({
        previousGenerationId: "gen_missing",
        roomType: "living",
        description: "добавь мебель",
      }),
    /Не найдено сохранённое изображение/
  );
});

test("одинаковый нормализованный контекст получает один request hash", () => {
  const common = {
    styleId: "auto",
    roomType: "bedroom",
    description: "  Добавь   шкаф ",
  };
  assert.equal(
    buildGenerationContext(common).requestHash,
    buildGenerationContext({ ...common, description: "Добавь шкаф" }).requestHash
  );
});
