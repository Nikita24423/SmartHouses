import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, getGenerationLimitForUser, getRemainingGenerations } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const user = await getUserByEmail(session.user.email);
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({
    email: user.email,
    name: user.name,
    generationsUsed: user.generations_used,
    generationsLimit: getGenerationLimitForUser(user),
    generationsRemaining: await getRemainingGenerations(user.email),
  });
}


