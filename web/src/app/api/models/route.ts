import { NextResponse } from "next/server";
import { IMAGE_MODELS, getDefaultImageModel } from "@/lib/models";

export async function GET() {
  return NextResponse.json({
    models: IMAGE_MODELS,
    defaultModel: getDefaultImageModel(),
    visionModel:
      process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.5-flash-lite",
  });
}


