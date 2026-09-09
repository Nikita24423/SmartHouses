import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGenerationContext,
  inferRoomType,
  resolveRequestedRoomType,
} from "../src/lib/generation-context.js";

test("Авто формирует обязательный стиль и полный набор мебели", () => {
  const context = buildGenerationContext({
    styleId: "auto",
    roomType: "kitchen",
    description: "Светлая кухня для семьи",
  });

  assert.equal(context.style.id, "auto");
  assert.match(context.prompt, /coherent contemporary apartment renovation style/);
  assert.match(context.prompt, /refrigerator, cooktop, oven, extractor hood/);
});

test("автоопределение распознаёт кухню и не допускает кровать", () => {
  assert.equal(inferRoomType("Нужна светлая кухня для семьи"), "kitchen");
  assert.equal(resolveRequestedRoomType("auto", "Сделай современную кухню"), "kitchen");
  assert.equal(resolveRequestedRoomType("kitchen", "Спальня в скандинавском стиле"), "kitchen");

  const context = buildGenerationContext({
    roomType: "kitchen",
    description: "Светлая кухня",
  });
  assert.match(context.prompt, /This is a kitchen, never a bedroom/);
  assert.match(context.prompt, /Do not add a bed/);
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
  assert.match(context.prompt, /invent a different room/);
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

test("фото комнаты — это edit кадра, а не новая композиция", () => {
  const context = buildGenerationContext({
    styleId: "scandinavian",
    roomType: "living",
    description: "сделай гостиную",
    sourceImages: ["data:image/jpeg;base64,xx"],
    sourceImageHashes: ["ab"],
  });

  assert.match(context.prompt, /EDIT the attached photograph/);
  assert.match(context.prompt, /PHOTO EDIT MODE/);
  assert.match(context.prompt, /PHOTO FIDELITY/);
  assert.match(context.prompt, /PRIORITY HIERARCHY/);
  assert.match(context.prompt, /ZERO new walls/);
  assert.match(context.prompt, /ZERO new windows/);
  assert.match(context.prompt, /WINDOW SIZE LOCK/);
  assert.match(context.prompt, /TV\/media unit is optional/);
  assert.doesNotMatch(context.prompt, /^Generate one photorealistic/);
});

test("техпаспорт с планом — не edit фотографии комнаты", () => {
  const context = buildGenerationContext({
    styleId: "scandinavian",
    roomType: "kitchen",
    description: "кухня по плану",
    layout: "окна: одно на нижней стене; двери: в коридор №6",
    sourceImages: ["data:image/jpeg;base64,plan"],
    sourceImageHashes: ["planhash"],
    photoEdit: false,
  });

  assert.match(context.prompt, /Generate one photorealistic/);
  assert.match(context.prompt, /PLAN \/ REFERENCE MODE/);
  assert.match(context.prompt, /refrigerator, cooktop, oven, extractor hood/);
  assert.doesNotMatch(context.prompt, /EDIT the attached photograph/);
  assert.doesNotMatch(context.prompt, /PHOTO EDIT MODE/);
  assert.doesNotMatch(context.prompt, /TV\/media unit is optional/);
});

test("пустой список проёмов всё равно запрещает закрывать дыры в фото", () => {
  const context = buildGenerationContext({
    styleId: "scandinavian",
    roomType: "living",
    description: "ремонт",
    sourceImages: ["data:image/jpeg;base64,xx"],
    sourceImageHashes: ["cd"],
    photoEdit: true,
    roomGeometry: {
      complexity: "complex",
      constructionShell: true,
      openings: [],
      nestedSpaces: [],
    },
  });

  assert.match(context.prompt, /copy every doorway, passage, and window/i);
});

test("сложная комната вставляет проёмы и вложенный объём в промпт", () => {
  const context = buildGenerationContext({
    styleId: "scandinavian",
    roomType: "living",
    description: "ремонт",
    sourceImages: ["data:image/jpeg;base64,xx"],
    sourceImageHashes: ["cd"],
    roomGeometry: {
      complexity: "complex",
      constructionShell: true,
      camera: "wide-angle from the corner, eye level",
      layout: "non-rectangular, partition and nested hallway",
      openings: [
        {
          type: "doorway",
          wall: "center-left",
          relativeSize: "about one-third of the partition",
          visibleThrough: "hallway of white blocks",
          mustKeepClear: true,
        },
        {
          type: "window",
          wall: "right",
          relativeSize: "large rectangular opening",
          visibleThrough: "red brick building and sky",
          mustKeepClear: true,
        },
      ],
      nestedSpaces: ["hallway through the central doorway"],
      solidWallsForFurniture: "continuous left block wall; not the doorway",
      generationDirectives: ["keep the central passage empty"],
    },
  });

  assert.match(context.prompt, /Complexity: complex/);
  assert.match(context.prompt, /DOORWAY on the center-left wall/);
  assert.match(context.prompt, /hallway of white blocks/);
  assert.match(context.prompt, /NESTED SPACES/);
  assert.match(context.prompt, /Construction shell: yes/);
  assert.match(context.prompt, /skip it if it would cover an opening/);
});

