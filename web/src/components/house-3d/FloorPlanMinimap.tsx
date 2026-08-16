"use client";

import { useMemo } from "react";
import type { HouseModel } from "@/lib/house3d/types";

export function FloorPlanMinimap({
  model,
  currentRoomId,
  onSelectRoom,
  title,
  youAreHereLabel,
}: {
  model: HouseModel;
  currentRoomId: string;
  onSelectRoom: (id: string) => void;
  title: string;
  youAreHereLabel: string;
}) {
  const layout = useMemo(() => {
    if (model.rooms.length === 0) {
      return { minX: 0, minZ: 0, spanX: 1, spanZ: 1, pad: 0.4 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const r of model.rooms) {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.width);
      minZ = Math.min(minZ, r.z);
      maxZ = Math.max(maxZ, r.z + r.depth);
    }
    const spanX = Math.max(maxX - minX, 0.5);
    const spanZ = Math.max(maxZ - minZ, 0.5);
    const pad = Math.max(spanX, spanZ) * 0.08;
    return { minX, minZ, spanX, spanZ, pad };
  }, [model.rooms]);

  const vbW = layout.spanX + layout.pad * 2;
  const vbH = layout.spanZ + layout.pad * 2;
  const current = model.rooms.find((r) => r.id === currentRoomId);

  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-black/55 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <p className="text-[10px] font-medium tracking-wide text-white/80 uppercase">
          {title}
        </p>
        {current && (
          <p className="truncate text-[10px] text-sky-300">{youAreHereLabel}</p>
        )}
      </div>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="h-[7.5rem] w-full sm:h-[9rem]"
        role="img"
        aria-label={title}
      >
        <rect x={0} y={0} width={vbW} height={vbH} fill="#0f1115" />
        {model.rooms.map((room) => {
          const active = room.id === currentRoomId;
          const x = room.x - layout.minX + layout.pad;
          // Flip Z so north/top matches typical floor-plan reading
          const y =
            layout.spanZ -
            (room.z - layout.minZ + room.depth) +
            layout.pad;
          return (
            <g key={room.id}>
              <rect
                x={x}
                y={y}
                width={room.width}
                height={room.depth}
                rx={0.06}
                fill={active ? "#2563eb" : room.color}
                fillOpacity={active ? 0.9 : 0.55}
                stroke={active ? "#93c5fd" : "#ffffff55"}
                strokeWidth={active ? 0.08 : 0.04}
                className="cursor-pointer transition-opacity hover:opacity-100"
                opacity={active ? 1 : 0.85}
                onClick={() => onSelectRoom(room.id)}
              >
                <title>{room.label}</title>
              </rect>
              <text
                x={x + room.width / 2}
                y={
                  active
                    ? y + room.depth / 2 + Math.min(room.width, room.depth) * 0.18
                    : y + room.depth / 2
                }
                textAnchor="middle"
                dominantBaseline="middle"
                fill={active ? "#fff" : "#f8fafc"}
                fontSize={Math.max(
                  0.22,
                  Math.min(room.width, room.depth) * 0.2
                )}
                fontWeight={600}
                className="pointer-events-none select-none"
              >
                {room.label.length > 14
                  ? `${room.label.slice(0, 12)}…`
                  : room.label}
              </text>
              {active && (
                <circle
                  cx={x + room.width / 2}
                  cy={
                    y + room.depth / 2 - Math.min(room.width, room.depth) * 0.12
                  }
                  r={Math.min(room.width, room.depth) * 0.09}
                  fill="#fff"
                  stroke="#1d4ed8"
                  strokeWidth={0.045}
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}


