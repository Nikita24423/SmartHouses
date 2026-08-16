import { signIn } from "../../auth";
import Link from "next/link";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.52h3.24c1.9-1.75 2.99-4.33 2.99-7.29Z" />
      <path fill="#34A853" d="M12 21.75c2.64 0 4.86-.88 6.48-2.38L15.24 16.85c-.9.6-2.05.95-3.24.95-2.55 0-4.71-1.72-5.48-4.03H3.17v2.6A9.78 9.78 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.52 13.77A5.9 5.9 0 0 1 6.21 12c0-.62.11-1.22.31-1.77v-2.6H3.17A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06.92 4.37l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 6.2c1.3 0 2.47.45 3.39 1.32l2.95-2.95C16.86 3.19 14.64 2.25 12 2.25a9.78 9.78 0 0 0-8.83 5.38l3.35 2.6C7.29 7.92 9.45 6.2 12 6.2Z" />
    </svg>
  );
}

function resolveCallbackUrl(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/studio";
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const redirectTo = resolveCallbackUrl(params?.callbackUrl);
  async function loginWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  async function loginWithYandex() {
    "use server";
    await signIn("yandex", { redirectTo });
  }

  const hasYandex = Boolean(process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET);
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">DESIGNVISION</p>
        <h1>Создайте интерьер своей комнаты</h1>
        <p>Войдите, чтобы начать визуализацию.</p>
        <div className="auth-options">
          <form action={loginWithGoogle}>
            <button aria-label="Войти с Google" className="auth-provider google" type="submit">
              <span className="provider-mark"><GoogleMark /></span>
              <span className="provider-name">Google</span>
              <span aria-hidden="true" className="provider-arrow">↗</span>
            </button>
          </form>
          {hasYandex && <form action={loginWithYandex}>
            <button aria-label="Войти с Яндекс" className="auth-provider yandex" type="submit">
              <span aria-hidden="true" className="provider-mark">Я</span>
              <span className="provider-name">Яндекс</span>
              <span aria-hidden="true" className="provider-arrow">↗</span>
            </button>
          </form>}
        </div>
        <Link href="/">Вернуться на главную</Link>
      </section>
    </main>
  );
}
