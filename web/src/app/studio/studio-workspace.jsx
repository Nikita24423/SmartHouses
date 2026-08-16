"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoWithText } from "@/components/logo";

const STYLES = [["auto", "Авто"], ["scandinavian", "Скандинавский"], ["minimalism", "Минимализм"], ["classic", "Классический"], ["industrial", "Индустриальный"], ["hi-tech", "Хай‑тек"], ["japanese", "Японский"], ["mediterranean", "Средиземноморский"], ["boho", "Бохо"]];
const ROOMS = [["living", "Гостиная"], ["bedroom", "Спальня"], ["kitchen", "Кухня"], ["bathroom", "Ванная"], ["hallway", "Прихожая"], ["office", "Кабинет"], ["dining", "Столовая"]];

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function friendlyMessage(error) {
  const message = error instanceof Error ? error.message : "Не удалось создать визуализацию";
  if (/BLOB_READ_WRITE_TOKEN|хранилищ/i.test(message)) return "Не удалось завершить визуализацию. Попробуйте немного позже.";
  if (/OPENROUTER|модель/i.test(message)) return "Сервис визуализации временно не ответил. Попробуйте ещё раз.";
  return message;
}

export default function HomePage() {
  const [description, setDescription] = useState("");
  const [styleId, setStyleId] = useState("auto");
  const [roomType, setRoomType] = useState("living");
  const [sourceImage, setSourceImage] = useState(null);
  const [generation, setGeneration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("result");
  const router = useRouter();

  const isRevision = Boolean(generation?.id);
  const isShowingSource = preview === "source" && sourceImage;

  useEffect(() => {
    if (!generation?.id || generation.image || generation.status === "failed") return undefined;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/generations/${generation.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setGeneration((current) => current?.id === data.generationId ? { ...current, ...data, id: data.generationId } : current);
        if (data.status === "completed" || data.status === "failed") setIsLoading(false);
      } catch {
        // The generation id is retained and the next poll retries automatically.
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [generation?.id, generation?.image, generation?.status]);

  async function selectSourceImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return setMessage("Поддерживаются JPEG, PNG и WebP.");
    if (file.size > 10 * 1024 * 1024) return setMessage("Размер изображения не должен превышать 10 МБ.");
    setSourceImage(await readFile(file));
    setPreview("source");
    setMessage("");
  }

  async function submit(event) {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setPreview("result");
    setMessage(isRevision ? "Создаём новый вариант интерьера…" : "Создаём первый вариант интерьера…");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          styleId,
          roomType,
          ...(isRevision ? { previousGenerationId: generation.id } : { referenceImages: sourceImage ? [sourceImage] : [] }),
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push("/login?callbackUrl=%2Fstudio");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Не удалось создать визуализацию");
      setGeneration({ id: data.generationId, image: data.image ?? null, status: data.image ? "completed" : data.status ?? "running", style: data.style });
      setDescription("");
      setMessage(data.reused ? "Этот вариант уже готов — новая генерация не запускалась." : data.image ? "Готово. Теперь можно изменить нужные детали." : "Вариант создаётся. Результат появится здесь автоматически.");
    } catch (error) {
      setMessage(friendlyMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setGeneration(null);
    setSourceImage(null);
    setDescription("");
    setMessage("");
    setPreview("result");
  }

  return (
    <main className="studio-shell">
      <header className="studio-header"><LogoWithText size="sm" /><p>Рабочее пространство</p></header>
      <section className="studio-title" aria-labelledby="studio-heading"><div><p className="eyebrow">Визуализация интерьера</p><h1 id="studio-heading">Создайте интерьер своей комнаты.</h1></div><p className="title-note">Начните с фото комнаты и воплотите свою идею.</p></section>

      <section className="studio" aria-label="Рабочее пространство визуализации">
        <form className="control-panel" onSubmit={submit}>
          <div className="panel-heading"><span className="step-number">{isRevision ? "02" : "01"}</span><div><h2>{isRevision ? "Точная правка" : "Исходная комната"}</h2><p>{isRevision ? "Опишите только то, что нужно поменять." : "Добавьте фото комнаты — оно станет основой результата."}</p></div></div>
          {!isRevision && <label className={`upload-zone${sourceImage ? " is-ready" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectSourceImage} /><span className="upload-icon" aria-hidden="true">↑</span><span>{sourceImage ? "Фото комнаты добавлено" : "Добавить фото комнаты"}</span><small>{sourceImage ? "Можно продолжить к описанию" : "JPEG, PNG или WebP до 10 МБ"}</small></label>}
          <label className="prompt-field"><span>{isRevision ? "Что хотите изменить?" : "Что важно в результате?"}</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder={isRevision ? "Опишите конкретное изменение" : "Опишите желаемый интерьер"} rows={isRevision ? 5 : 6} /></label>
          <div className="fields"><label><span>Стиль</span><select value={styleId} onChange={(event) => setStyleId(event.target.value)}>{STYLES.map(([id, title]) => <option value={id} key={id}>{title}</option>)}</select></label><label><span>Помещение</span><select value={roomType} disabled={isRevision} onChange={(event) => setRoomType(event.target.value)}>{ROOMS.map(([id, title]) => <option value={id} key={id}>{title}</option>)}</select></label></div>
          <button className="primary-action" type="submit" disabled={isLoading}>{isLoading ? "Создаём вариант…" : isRevision ? "Создать новый вариант" : "Создать интерьер"}</button>
        </form>

        <section className="canvas" aria-live="polite">
          <div className="canvas-topbar"><div><p className="canvas-label">{generation?.image ? "Текущий вариант" : "Результат"}</p><h2>{generation?.image ? "Попробуйте следующий вариант" : "Здесь появится ваш интерьер"}</h2></div>{generation?.image && sourceImage && <div className="view-switch" aria-label="Выбор изображения"><button type="button" className={preview === "source" ? "active" : ""} onClick={() => setPreview("source")}>Исходник</button><button type="button" className={preview === "result" ? "active" : ""} onClick={() => setPreview("result")}>Вариант</button></div>}</div>
          <div className={`visual-stage${isShowingSource ? " source-view" : ""}`}>{isShowingSource ? <Image src={sourceImage} alt="Исходное фото комнаты" fill sizes="(max-width: 960px) 100vw, 65vw" unoptimized priority /> : generation?.image ? <Image src={generation.image} alt="Текущая версия интерьера" fill sizes="(max-width: 960px) 100vw, 65vw" unoptimized priority /> : sourceImage ? <Image src={sourceImage} alt="Исходное фото комнаты" fill sizes="(max-width: 960px) 100vw, 65vw" unoptimized priority /> : <div className="empty-canvas"><span aria-hidden="true">+</span><p>Добавьте фото комнаты или опишите будущий интерьер.</p></div>}{isLoading && <div className="generation-state"><span className="loading-dot" />Обновляем эту комнату</div>}</div>
          <div className="version-bar"><div className="version-item"><span className="version-dot" /><div><strong>Исходник</strong><small>{sourceImage ? "Фото комнаты" : "Описание комнаты"}</small></div></div><span className="version-line" /><div className={`version-item${generation?.id ? " current" : ""}`}><span className="version-dot" /><div><strong>{generation?.id ? "Текущая версия" : "Новая версия"}</strong><small>{generation?.id ? "Готова к правке" : "Появится после генерации"}</small></div></div></div>
          {message && <p className="message" role="status">{message}</p>}
          {generation?.image && <button type="button" className="new-room" onClick={reset}>Начать другую комнату</button>}
        </section>
      </section>
    </main>
  );
}
