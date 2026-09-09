/** Local preview photos for landing-page style cards (Pexels, free license). */
export const STYLE_PREVIEW_IMAGES: Record<string, string> = {
  scandinavian: "/styles/scandinavian.jpg",
  minimalism: "/styles/minimalism.jpg",
  classic: "/styles/classic.jpg",
  industrial: "/styles/industrial.jpg",
  japanese: "/styles/japanese.jpg",
  "hi-tech": "/styles/hi-tech.jpg",
  boho: "/styles/boho.jpg",
  hygge: "/styles/hygge.jpg",
};

/** Preview photos for landing-page mode cards (Pexels, free license). */
export const MODE_PREVIEW_IMAGES = {
  photo: "/modes/photo.jpg", // furnished apartment room photo
  plan: "/modes/plan.jpg", // architectural floor plan with rooms
  tour: "/modes/tour.jpg", // 3D interior render
} as const;

export function getStylePreviewImage(styleId: string): string | undefined {
  return STYLE_PREVIEW_IMAGES[styleId];
}

export function getModePreviewImage(mode: keyof typeof MODE_PREVIEW_IMAGES): string {
  return MODE_PREVIEW_IMAGES[mode];
}
