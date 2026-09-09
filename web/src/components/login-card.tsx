"use client";

import Link from "next/link";
import { LogoWithText } from "@/components/logo";
import { useLocale } from "@/components/locale-provider";
import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "@/components/ui-icons";

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

function YandexMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect fill="#FC3F1D" height="24" rx="6" width="24" />
      <path fill="#fff" d="M8.15 6.2h3.55c2.2 0 3.55 1.18 3.55 2.95 0 1.32-.7 2.28-1.88 2.75l2.55 5.9h-2.28l-2.28-5.45H10.3v5.45H8.15V6.2Zm2.15 5.1h1.4c.98 0 1.55-.5 1.55-1.28 0-.78-.57-1.28-1.55-1.28h-1.4v2.56Z" />
    </svg>
  );
}

export function LoginCard({
  googleAction,
  yandexAction,
}: {
  googleAction: () => Promise<void>;
  yandexAction?: () => Promise<void>;
}) {
  const { tr, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="login-shell">
      <div aria-hidden="true" className="login-bg">
        <div className="login-bg-wash" />
        <div className="login-bg-orb login-bg-orb-a" />
        <div className="login-bg-orb login-bg-orb-b" />
        <div className="login-bg-orb login-bg-orb-c" />
        <div className="login-bg-rays" />
        <div className="login-bg-floor" />
        <div className="login-bg-vignette" />
        <div className="login-bg-grain" />
      </div>
      <section className="login-card">
        <div className="login-card-head">
          <LogoWithText size="md" />
          <div className="login-card-tools">
            <button
              aria-label={theme === "dark" ? tr("app.themeLight") : tr("app.themeDark")}
              className="lp-ghost login-tool-icon"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            <button
              className="lp-ghost"
              onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
              type="button"
            >
              {locale === "ru" ? "EN" : "RU"}
            </button>
          </div>
        </div>
        <h1>{tr("login.title")}</h1>
        <p>{tr("login.subtitle")}</p>
        <div className="auth-options">
          <form action={googleAction}>
            <button className="auth-provider" type="submit">
              <GoogleMark />
              {tr("login.google")}
            </button>
          </form>
          {yandexAction ? (
            <form action={yandexAction}>
              <button className="auth-provider" type="submit">
                <YandexMark />
                {tr("login.yandex")}
              </button>
            </form>
          ) : null}
        </div>
        <Link className="login-back" href="/">
          {tr("login.back")}
        </Link>
      </section>
    </main>
  );
}
