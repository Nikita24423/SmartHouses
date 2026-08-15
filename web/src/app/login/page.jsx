import { signIn } from "../../auth";
import Link from "next/link";

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
        <h1>Сохраните контекст своей комнаты</h1>
        <p>После входа откроется рабочее пространство: там будут сохранены изображения и последовательность правок.</p>
        <form action={loginWithGoogle}><button type="submit">Продолжить с Google</button></form>
        {hasYandex && <form action={loginWithYandex}><button className="secondary" type="submit">Продолжить с Яндекс</button></form>}
        <Link href="/">Вернуться на главную</Link>
      </section>
    </main>
  );
}
