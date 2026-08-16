import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Yandex from "next-auth/providers/yandex";
import { ensureUser } from "./lib/generation-store";
import { getGenerationLimitForUser, getUserByEmail } from "./lib/db";
import { getAllowedModes } from "./lib/payments/packages";

const providers = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
  }),
];

if (process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET) {
  providers.push(
    Yandex({
      clientId: process.env.AUTH_YANDEX_ID,
      clientSecret: process.env.AUTH_YANDEX_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await ensureUser({ email: user.email, name: user.name, image: user.image });
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return new URL(url).origin === baseUrl ? url : baseUrl;
    },
    async session({ session }) {
      if (!session.user?.email) return session;
      const account = await getUserByEmail(session.user.email);
      if (!account) return session;
      session.user.id = account.id;
      session.user.generationsUsed = account.generations_used;
      session.user.generationsRemaining = Math.max(0, account.credits_balance);
      session.user.generationsLimit = getGenerationLimitForUser(account);
      session.user.subscriptionPlan = account.subscription_plan;
      session.user.subscriptionExpiresAt = account.subscription_expires_at;
      session.user.allowedModes = getAllowedModes(
        account.subscription_plan,
        account.subscription_expires_at,
      );
      return session;
    },
  },
});
