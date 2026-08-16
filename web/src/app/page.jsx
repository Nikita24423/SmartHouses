import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand">DESIGNVISION</Link>
        <Link href="/login?callbackUrl=%2Fstudio" className="login-link">Войти</Link>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow landing-eyebrow">Визуализация интерьера</p>
          <h1>Увидьте интерьер<br />своей комнаты.</h1>
          <p className="hero-description">Загрузите фото, выберите стиль и получите реалистичный вариант с мебелью, светом и отделкой.</p>
          <div className="hero-actions">
            <Link href="/login?callbackUrl=%2Fstudio" className="hero-cta">Открыть рабочее пространство <span aria-hidden="true">↗</span></Link>
          </div>
        </div>

        <div className="hero-visual" aria-label="Демонстрация последовательных версий комнаты">
          <div className="ambient-orb orb-one" /><div className="ambient-orb orb-two" />
          <div className="showcase-card source-card">
            <div className="room-art room-before"><span className="art-window" /><span className="art-sofa" /><span className="art-table" /></div>
            <div className="card-meta"><span>01</span><p>Исходная комната</p></div>
          </div>
          <div className="showcase-card result-card">
            <div className="room-art room-after"><span className="art-window" /><span className="art-lamp" /><span className="art-sofa" /><span className="art-chair" /><span className="art-table" /><span className="art-plant" /></div>
            <div className="card-meta"><span>02</span><p>Новая версия интерьера</p></div>
          </div>
        </div>
      </section>

      <section className="value-strip" aria-label="Принципы работы DesignVision">
        <article><span>01</span><h2>Одна комната — разные идеи</h2><p>Пробуйте варианты отделки, мебели и освещения для одного пространства.</p></article>
        <article><span>02</span><h2>Только нужные изменения</h2><p>Пользователь сам формулирует правку — интерфейс не навязывает случайные сценарии.</p></article>
        <article><span>03</span><h2>История, к которой можно вернуться</h2><p>Можно открыть любую версию и продолжить работу именно от неё.</p></article>
      </section>
    </main>
  );
}
