import { signIn } from "../../auth";
import Link from "next/link";

export default function LoginPage() {
  async function loginWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function loginWithYandex() {
    "use server";
    await signIn("yandex", { redirectTo: "/" });
  }

  const hasYandex = Boolean(process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET);
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">DESIGNVISION</p>
        <h1>Войдите, чтобы сохранить историю интерьера</h1>
        <p>История и изображения принадлежат только вашему аккаунту. Благодаря этому правки всегда применяются к нужному помещению.</p>
        <form action={loginWithGoogle}><button type="submit">Продолжить с Google</button></form>
        {hasYandex && <form action={loginWithYandex}><button className="secondary" type="submit">Продолжить с Яндекс</button></form>}
        <Link href="/">Вернуться к проекту</Link>
      </section>
    </main>
  );
}
