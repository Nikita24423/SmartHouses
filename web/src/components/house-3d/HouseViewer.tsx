"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { houseBounds } from "@/lib/house3d/build-house-geometry";
import type { HouseModel } from "@/lib/house3d/types";
import { FloorPlanMinimap } from "./FloorPlanMinimap";
import { HouseScene } from "./HouseScene";
import {
  roomStandingPos,
  TourLookControls,
} from "./TourControls";

type ViewMode = "tour" | "dollhouse";

export function HouseViewer({
  model,
  className,
  fullscreenLabel,
  exitFullscreenLabel,
  tourLabel,
  dollhouseLabel,
  floorPlanLabel,
  youAreHereLabel,
  enterRoomHint,
}: {
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
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("tour");
  const [roomId, setRoomId] = useState(model.rooms[0]?.id ?? "");
  const [transitioning, setTransitioning] = useState(false);
  const [showPlan, setShowPlan] = useState(true);

  const { center, size } = useMemo(() => houseBounds(model), [model]);
  const camDist = Math.max(8, size * 1.6);
  const effectiveRoomId = model.rooms.some((room) => room.id === roomId)
    ? roomId
    : model.rooms[0]?.id ?? "";
  const currentRoom = model.rooms.find((r) => r.id === effectiveRoomId) ?? model.rooms[0];

  const eyeWorld = useMemo((): [number, number, number] => {
    if (!currentRoom) return [0, 1.55, 0];
    const [lx, ly, lz] = roomStandingPos(currentRoom);
    return [lx - center[0], ly, lz - center[2]];
  }, [currentRoom, center]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const isTour = viewMode === "tour";

  function goToRoom(id: string) {
    setRoomId(id);
    if (!isTour) setViewMode("tour");
  }

  function enterRoomFromDollhouse(id: string) {
    setRoomId(id);
    setViewMode("tour");
  }

  return (
    <div
      className={`relative overflow-hidden ${
        isTour ? "bg-[#1a1a1a]" : "bg-[#eef1f4]"
      } ${
        fullscreen
          ? "fixed inset-0 z-[100] h-[100dvh] w-screen rounded-none border-0"
          : `rounded-xl border border-border ${className ?? ""}`
      }`}
      style={fullscreen ? undefined : { minHeight: 280 }}
    >
      <Canvas
        key={viewMode}
        shadows
        camera={{
          position: isTour
            ? eyeWorld
            : [camDist * 0.85, camDist * 0.55, camDist * 0.85],
          fov: isTour ? 72 : 42,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={[isTour ? "#c8d0d8" : "#eef1f4"]} />
        <ambientLight intensity={isTour ? 0.72 : 0.55} />
        <directionalLight
          castShadow
          position={[8, 14, 6]}
          intensity={isTour ? 0.95 : 1.15}
          shadow-mapSize={[1024, 1024]}
        />
        <hemisphereLight args={["#f0f4f8", "#c8c0b4", isTour ? 0.45 : 0.35]} />
        <Suspense fallback={null}>
          <HouseScene
            model={model}
            tourMode={isTour}
            currentRoomId={effectiveRoomId}
            onTeleport={goToRoom}
            onEnterRoom={enterRoomFromDollhouse}
          />
        </Suspense>
        {!isTour && (
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.35}
            scale={size * 3}
            blur={2.2}
            far={12}
          />
        )}
        {isTour ? (
          <TourLookControls
            eye={eyeWorld}
            enabled
            resetToken={effectiveRoomId}
            onTransitionChange={setTransitioning}
          />
        ) : (
          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            minDistance={2.5}
            maxDistance={camDist * 3}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[0, size * 0.25, 0]}
          />
        )}
      </Canvas>

      {/* Soft fade during room teleport — Zillow-like transition */}
      <div
        className={`pointer-events-none absolute inset-0 z-[5] bg-black transition-opacity duration-300 ${
          transitioning ? "opacity-35" : "opacity-0"
        }`}
      />

      {/* Top bar */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-3 ${
          fullscreen ? "pt-[max(0.5rem,env(safe-area-inset-top))]" : ""
        }`}
      >
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("tour")}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-md sm:text-xs ${
              isTour
                ? "bg-white text-zinc-900"
                : "bg-black/40 text-white hover:bg-black/55"
            }`}
          >
            {tourLabel}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("dollhouse")}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-md sm:text-xs ${
              !isTour
                ? "bg-white text-zinc-900"
                : "bg-black/40 text-white hover:bg-black/55"
            }`}
          >
            {dollhouseLabel}
          </button>
          {isTour && model.rooms.length > 1 && (
            <button
              type="button"
              onClick={() => setShowPlan((v) => !v)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-md sm:text-xs ${
                showPlan
                  ? "bg-sky-500 text-white"
                  : "bg-black/40 text-white hover:bg-black/55"
              }`}
            >
              {floorPlanLabel}
            </button>
          )}
        </div>

        {isTour && currentRoom && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 sm:top-3">
            <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-md sm:text-sm">
              {currentRoom.label}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="pointer-events-auto rounded-lg bg-white/90 px-3 py-2 text-[11px] font-medium text-zinc-800 shadow-sm backdrop-blur-md transition hover:bg-white sm:text-xs"
        >
          {fullscreen ? exitFullscreenLabel : fullscreenLabel}
        </button>
      </div>

      {/* Interactive floor plan — Zillow-style navigator */}
      {isTour && showPlan && model.rooms.length > 0 && (
        <div
          className={`pointer-events-auto absolute z-10 w-[min(14rem,46vw)] sm:w-[15rem] ${
            fullscreen
              ? "right-[max(0.5rem,env(safe-area-inset-right))] bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]"
              : "right-2 bottom-20 sm:bottom-16"
          }`}
        >
          <FloorPlanMinimap
            model={model}
            currentRoomId={effectiveRoomId}
            onSelectRoom={goToRoom}
            title={floorPlanLabel}
            youAreHereLabel={youAreHereLabel}
          />
        </div>
      )}

      {/* Dollhouse hint */}
      {!isTour && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3 ${
            fullscreen
              ? "bottom-[max(1rem,env(safe-area-inset-bottom))]"
              : "bottom-3"
          }`}
        >
          <p className="rounded-full bg-black/50 px-3 py-1.5 text-[11px] text-white/90 shadow backdrop-blur-md sm:text-xs">
            {enterRoomHint}
          </p>
        </div>
      )}

      {/* Room quick-nav chips */}
      {isTour && model.rooms.length > 1 && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center gap-1.5 overflow-x-auto px-2 ${
            fullscreen
              ? "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
              : "bottom-2"
          }`}
        >
          <div className="pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto pb-1">
            {model.rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => goToRoom(r.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm backdrop-blur-md sm:text-[11px] ${
                  r.id === effectiveRoomId
                    ? "bg-white text-zinc-900"
                    : "bg-black/45 text-white hover:bg-black/60"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
