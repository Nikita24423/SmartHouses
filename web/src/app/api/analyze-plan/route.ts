import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeTechPassport } from "@/lib/techpassport/analyze-techpassport";
import { filterUserContent } from "@/lib/techpassport/content-filter";

export const maxDuration = 60;

interface AnalyzePlanBody {
  image?: string;
  notes?: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  let body: AnalyzePlanBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  if (!body.image) {
    return NextResponse.json(
      { error: "Загрузите фото техпаспорта" },
      { status: 400 }
    );
  }

  if (body.notes) {
    const filter = filterUserContent(body.notes);
    if (!filter.allowed) {
      return NextResponse.json({ error: filter.reason }, { status: 400 });
    }
  }

  try {
    const analysis = await analyzeTechPassport(body.image, body.notes);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка анализа плана";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


