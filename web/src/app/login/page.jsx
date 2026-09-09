import { signIn } from "../../auth";
import { LoginCard } from "@/components/login-card";

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
    <LoginCard
      googleAction={loginWithGoogle}
      yandexAction={hasYandex ? loginWithYandex : undefined}
    />
  );
}
