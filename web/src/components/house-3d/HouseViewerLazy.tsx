"use client";

import dynamic from "next/dynamic";
import type { HouseModel } from "@/lib/house3d/types";

const HouseViewerInner = dynamic(
  () => import("./HouseViewer").then((m) => m.HouseViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-border bg-surface text-sm text-muted">
        Загрузка 3D…
      </div>
    ),
  }
);

export function HouseViewerLazy(props: {
  model: HouseModel;
  className?: string;
  fullscreenLabel: string;
  exitFullscreenLabel: string;
  tourLabel: string;
  dollhouseLabel: string;
  floorPlanLabel: string;
  youAreHereLabel: string;
  enterRoomHint: string;
}) {
  return <HouseViewerInner {...props} />;
}


