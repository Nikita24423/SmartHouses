"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const STYLES = [
  ["auto", "Авто"],
  ["scandinavian", "Скандинавский"],
  ["minimalism", "Минимализм"],
  ["classic", "Классический"],
  ["industrial", "Индустриальный"],
  ["hi-tech", "Хай‑тек"],
  ["japanese", "Японский"],
  ["mediterranean", "Средиземноморский"],
  ["boho", "Бохо"],
];

const ROOMS = [
  ["living", "Гостиная"],
  ["bedroom", "Спальня"],
  ["kitchen", "Кухня"],
  ["bathroom", "Ванная"],
  ["hallway", "Прихожая"],
  ["office", "Кабинет"],
  ["dining", "Столовая"],
];

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const [description, setDescription] = useState("");
  const [styleId, setStyleId] = useState("auto");
  const [roomType, setRoomType] = useState("living");
  const [sourceImage, setSourceImage] = useState(null);
  const [generation, setGeneration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!generation?.id || generation.image || generation.status === "failed") return undefined;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/generations/${generation.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setGeneration((current) => (current?.id === data.generationId ? { ...current, ...data, id: data.generationId } : current));
        if (data.status === "completed" || data.status === "failed") setIsLoading(false);
      } catch {
        // Keep polling: a temporary network failure must not lose the generation id.
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [generation?.id, generation?.image, generation?.status]);

  async function selectSourceImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setMessage("Поддерживаются JPEG, PNG и WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Размер изображения не должен превышать 10 МБ.");
      return;
    }
    setSourceImage(await readFile(file));
    setMessage("");
  }

  async function submit(event, revision = false) {
    event.preventDefault();
    if (isLoading) return;
    if (revision && !generation?.id) return;

    setIsLoading(true);
    setMessage(revision ? "Применяем правку к сохранённому интерьеру…" : "Создаём визуализацию…");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          styleId,
          roomType,
          ...(revision ? { previousGenerationId: generation.id } : { referenceImages: sourceImage ? [sourceImage] : [] }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось создать визуализацию");

      setGeneration({
        id: data.generationId,
        image: data.image ?? null,
        status: data.image ? "completed" : data.status ?? "running",
        style: data.style,
      });
      setMessage(data.reused ? "Найден уже сохранённый результат — повторная генерация не запускалась." : data.image ? "Готово. Теперь можно внести точечную правку." : "Задача уже выполняется — ожидаем результат." );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать визуализацию");
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setGeneration(null);
    setSourceImage(null);
    setDescription("");
    setMessage("");
  }

  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">DESIGNVISION</p>
        <h1>Интерьер, который помнит предыдущий результат</h1>
        <p>«Авто» выбирает цельный стиль, а каждое помещение получает реалистичную мебель, технику и освещение. При правке модель использует сохранённое изображение, а не придумывает новую комнату.</p>
      </section>

      <section className="workspace" aria-label="Создание визуализации">
        <form className="form" onSubmit={(event) => submit(event)}>
          <label>
            Что нужно создать или изменить
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Например: светлая гостиная для семьи, добавить книжный шкаф и мягкое вечернее освещение" rows={6} />
          </label>
          <div className="fields">
            <label>Стиль<select value={styleId} onChange={(event) => setStyleId(event.target.value)}>{STYLES.map(([id, title]) => <option value={id} key={id}>{title}</option>)}</select></label>
            <label>Помещение<select value={roomType} disabled={Boolean(generation?.id)} onChange={(event) => setRoomType(event.target.value)}>{ROOMS.map(([id, title]) => <option value={id} key={id}>{title}</option>)}</select></label>
          </div>
          <label className="upload">
            <span>Фото помещения или план (необязательно)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectSourceImage} />
            {sourceImage && <span className="file-ready">Изображение прикреплено</span>}
          </label>
          <button type="submit" disabled={isLoading}>{isLoading ? "Обрабатываем…" : "Создать визуализацию"}</button>
        </form>

        <div className="result" aria-live="polite">
          {generation?.image ? (
            <div className="image-frame"><Image src={generation.image} alt="Сгенерированный интерьер" fill sizes="(max-width: 900px) 100vw, 52vw" unoptimized priority /></div>
          ) : <div className="placeholder">{isLoading ? "Задача выполняется. Её идентификатор сохранён — результат появится здесь." : "Здесь появится ваша визуализация"}</div>}
          {message && <p className="message">{message}</p>}
          {generation?.image && <div className="actions"><button type="button" onClick={(event) => submit(event, true)} disabled={isLoading}>Внести правку в этот интерьер</button><button type="button" className="secondary" onClick={reset}>Новая комната</button></div>}
          {generation?.id && <p className="profile-lock">Параметры помещения закреплены: при правке сохраняются геометрия, планировка и ракурс. Для другой комнаты выберите «Новая комната».</p>}
        </div>
      </section>
      <p className="auth-note">Для создания визуализации войдите через <Link href="/login">безопасную авторизацию</Link>.</p>
    </main>
  );
}
