import { auth } from "../../../../auth";
import { getGeneration, getUserByEmail } from "../../../../lib/generation-store";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Требуется авторизация" }, { status: 401 });

  const user = await getUserByEmail(email);
  if (!user) return Response.json({ error: "Пользователь не найден" }, { status: 404 });

  const { id } = await params;
  const generation = await getGeneration(user.id, id);
  if (!generation) return Response.json({ error: "Генерация не найдена" }, { status: 404 });

  return Response.json({
    generationId: generation.id,
    status: generation.status,
    styleId: generation.style_id,
    model: generation.model_id,
    image: generation.image_url,
  });
}
