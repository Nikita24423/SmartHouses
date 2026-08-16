"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat-storage";
import type { ParsedRoom } from "@/lib/techpassport/types";
import { getRoomTypeLabel } from "@/lib/techpassport/room-types";

export interface GalleryLabels {
  photoOf: string;
  floorPlan: string;
  download: string;
  refine: string;
  regenerate: string;
  changeStyle: string;
  roomNumber: (number: string) => string;
  fullscreen: string;
  exitFullscreen: string;
  prev: string;
  next: string;
  tapMarker: string;
  expandPlan: string;
  collapsePlan: string;
  generatingRoom: (room: string) => string;
  pendingRoom: string;
}

type GalleryRoom = ChatMessage & { image: string; roomNumber: string };

function fallbackMarkerPos(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(Math.max(total, 1)));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col + 0.5) / cols,
    y: (row + 0.5) / rows,
  };
}

function markerPosForRoom(
  roomNumber: string,
  index: number,
  total: number,
  planRooms?: ParsedRoom[]
): { x: number; y: number; facingDeg: number } {
  const meta = planRooms?.find((r) => r.number === roomNumber);
  if (
    meta &&
    typeof meta.markerX === "number" &&
    typeof meta.markerY === "number"
  ) {
    return {
      x: meta.markerX,
      y: meta.markerY,
      facingDeg: meta.facingDeg ?? 0,
    };
  }
  const fb = fallbackMarkerPos(index, total);
  return { ...fb, facingDeg: 0 };
}

function PlanMarkers({
  rooms,
  planRooms,
  activeIndex,
  onSelect,
  compact,
  pendingRooms,
  loadingRoom,
}: {
  rooms: GalleryRoom[];
  planRooms?: ParsedRoom[];
  activeIndex: number;
  onSelect: (index: number) => void;
  compact?: boolean;
  pendingRooms?: string[];
  loadingRoom?: string | null;
}) {
  const totalPins = rooms.length + (pendingRooms?.length ?? 0);

  return (
    <div className="pointer-events-none absolute inset-0">
      {rooms.map((room, i) => {
        const pos = markerPosForRoom(room.roomNumber, i, Math.max(totalPins, 1), planRooms);
        const isActive = i === activeIndex;
        const size = compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]";
        return (
          <button
            key={`pin-${room.id}`}
            type="button"
            onClick={() => onSelect(i)}
            title={labelsSafeRoom(room)}
            aria-current={isActive ? "true" : undefined}
            className="pointer-events-auto absolute z-[1] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
          >
            {isActive && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-10 origin-bottom bg-red-500/35"
                style={{
                  clipPath: "polygon(50% 100%, 5% 0%, 95% 0%)",
                  transform: `translate(-50%, -100%) rotate(${pos.facingDeg}deg)`,
                }}
              />
            )}
            <span
              className={`relative flex items-center justify-center rounded-md border-2 font-bold text-white shadow-md ${size} ${
                isActive
                  ? "border-red-700 bg-red-500 ring-2 ring-red-300/50"
                  : "border-emerald-800 bg-emerald-500 hover:bg-emerald-400"
              }`}
            >
              {room.roomNumber}
            </span>
          </button>
        );
      })}
      {pendingRooms?.map((num, pi) => {
        const i = rooms.length + pi;
        const pos = markerPosForRoom(num, i, Math.max(totalPins, 1), planRooms);
        const isLoading = loadingRoom === num;
        const size = compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]";
        return (
          <span
            key={`pending-pin-${num}`}
            className={`pointer-events-none absolute z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-dashed font-bold text-white shadow-md ${size} ${
              isLoading
                ? "animate-pulse border-amber-600 bg-amber-500/90"
                : "border-zinc-500 bg-zinc-500/70"
            }`}
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            title={num}
          >
            {num}
          </span>
        );
      })}
    </div>
  );
}

function labelsSafeRoom(room: GalleryRoom): string {
  const type = room.roomType ? getRoomTypeLabel(room.roomType) : "";
  return type ? `№${room.roomNumber} — ${type}` : `№${room.roomNumber}`;
}

export function TechPassportMediaGallery({
  items,
  planImage,
  planRooms,
  canEdit,
  labels,
  onRefine,
  onRegenerate,
  onChangeStyle,
  pendingRooms,
  loadingRoom,
}: {
  items: ChatMessage[];
  planImage?: string;
  planRooms?: ParsedRoom[];
  canEdit: boolean;
  labels: GalleryLabels;
  onRefine: (msg: ChatMessage) => void;
  onRegenerate: (msg: ChatMessage) => void;
  onChangeStyle: (msg: ChatMessage) => void;
  /** Room numbers still being generated in the current batch. */
  pendingRooms?: string[];
  loadingRoom?: string | null;
}) {
  const rooms = useMemo(
    () =>
      items.filter(
        (m): m is GalleryRoom => Boolean(m.image && m.roomNumber)
      ),
    [items]
  );

  const pending = useMemo(() => {
    const ready = new Set(rooms.map((r) => r.roomNumber));
    return (pendingRooms ?? []).filter((n) => !ready.has(n));
  }, [pendingRooms, rooms]);

  const [followLatest, setFollowLatest] = useState(true);
  const [pickedIndex, setPickedIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [planZoom, setPlanZoom] = useState(1);
  const mobileStackRef = useRef<HTMLDivElement>(null);
  const desktopMainRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const skipScrollSyncRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const prevActiveIdRef = useRef<string | null>(null);

  const total = rooms.length;
  const activeIndex =
    total === 0
      ? 0
      : followLatest
        ? total - 1
        : Math.min(Math.max(0, pickedIndex), total - 1);
  const active = rooms[activeIndex];
  const fadeKey = active?.id ?? "empty";

  // Scroll filmstrip when active photo changes (DOM only — no setState)
  useEffect(() => {
    const id = active?.id ?? null;
    if (!id || id === prevActiveIdRef.current) return;
    prevActiveIdRef.current = id;
    const thumb = filmstripRef.current?.querySelector<HTMLElement>(
      `[data-thumb-index="${activeIndex}"]`
    );
    thumb?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active?.id, activeIndex]);

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      const next = (activeIndex + delta + total) % total;
      setFollowLatest(next === total - 1);
      setPickedIndex(next);
    },
    [total, activeIndex]
  );

  const selectRoom = useCallback(
    (index: number) => {
      setFollowLatest(index === rooms.length - 1);
      setPickedIndex(index);
      skipScrollSyncRef.current = true;
      const el = mobileStackRef.current?.querySelector(
        `[data-room-index="${index}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      window.setTimeout(() => {
        skipScrollSyncRef.current = false;
      }, 500);
    },
    [rooms.length]
  );

  // Keyboard: arrows when gallery is focused or fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
        return;
      }
      if (e.key === "Escape" && planExpanded) {
        setPlanExpanded(false);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, planExpanded, go]);

  // Mobile: sync active marker while scrolling the stack
  useEffect(() => {
    const root = mobileStackRef.current;
    if (!root || rooms.length === 0) return;
    const cards = root.querySelectorAll<HTMLElement>("[data-room-index]");
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (skipScrollSyncRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          );
        const top = visible[0];
        if (!top) return;
        const idx = Number(
          (top.target as HTMLElement).dataset.roomIndex ?? NaN
        );
        if (!Number.isFinite(idx)) return;
        setFollowLatest((prev) => {
          const next = idx === rooms.length - 1;
          return prev === next ? prev : next;
        });
        setPickedIndex((cur) => (cur === idx ? cur : idx));
      },
      {
        root: null,
        threshold: [0.35, 0.55, 0.75],
        rootMargin: "-15% 0px -35% 0px",
      }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [rooms.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) go(1);
    else go(-1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerStartX.current = e.clientX;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStartX.current;
    pointerStartX.current = null;
    if (start == null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) < 56) return;
    if (dx < 0) go(1);
    else go(-1);
  };

  // Lock page scroll while overlays are open
  useEffect(() => {
    if (!fullscreen && !planExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen, planExpanded]);

  if (rooms.length === 0 && pending.length === 0) return null;

  const actions = (msg: ChatMessage) => (
    <div className="flex flex-wrap gap-3">
      <a
        href={msg.image}
        download={`room-${msg.roomNumber ?? "design"}.jpg`}
        className="text-xs text-accent hover:underline"
      >
        {labels.download}
      </a>
      {canEdit && msg.generationContext && (
        <>
          <button
            type="button"
            onClick={() => onRefine(msg)}
            className="text-xs font-medium text-accent transition hover:underline"
          >
            {labels.refine}
          </button>
          <button
            type="button"
            onClick={() => onRegenerate(msg)}
            className="text-xs text-muted transition hover:text-foreground"
          >
            {labels.regenerate}
          </button>
          <button
            type="button"
            onClick={() => onChangeStyle(msg)}
            className="text-xs text-muted transition hover:text-foreground"
          >
            {labels.changeStyle}
          </button>
        </>
      )}
    </div>
  );

  const markerChip = (index: number, compact = false) => {
    const room = rooms[index];
    const isActive = index === activeIndex;
    return (
      <button
        key={room.id}
        type="button"
        onClick={() => selectRoom(index)}
        title={labels.roomNumber(room.roomNumber)}
        aria-current={isActive ? "true" : undefined}
        className={`relative flex shrink-0 items-center justify-center ${
          compact ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-md border-2 font-semibold text-white shadow-sm ${
            compact ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs"
          } ${
            isActive
              ? "border-red-600 bg-red-500 ring-2 ring-red-400/40"
              : "border-emerald-700/80 bg-emerald-500 hover:bg-emerald-400"
          }`}
        >
          {room.roomNumber}
        </span>
      </button>
    );
  };

  const navArrows = (
    <>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={labels.prev}
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 sm:h-11 sm:w-11"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={labels.next}
        className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 sm:h-11 sm:w-11"
      >
        ›
      </button>
    </>
  );

  const counter = (
    <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
      {labels.photoOf
        .replace("{current}", String(activeIndex + 1))
        .replace("{total}", String(total))}
    </span>
  );

  const planPanel = (
    <div className="flex min-h-0 flex-col border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {labels.floorPlan}
        </p>
        <div className="flex items-center gap-1">
          {planImage && (
            <button
              type="button"
              onClick={() => setPlanExpanded(true)}
              aria-label={labels.expandPlan}
              title={labels.expandPlan}
              className="flex h-7 items-center justify-center rounded-md border border-border px-2 text-[11px] text-muted hover:bg-surface-hover hover:text-foreground"
            >
              ⛶
            </button>
          )}
          <button
            type="button"
            aria-label="−"
            onClick={() =>
              setPlanZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-muted hover:bg-surface-hover"
          >
            −
          </button>
          <button
            type="button"
            aria-label="+"
            onClick={() =>
              setPlanZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-muted hover:bg-surface-hover"
          >
            +
          </button>
        </div>
      </div>

      {planImage ? (
        <div className="relative min-h-[12rem] flex-1 overflow-auto bg-[#f3f1ec] dark:bg-[#1a1c20]">
          <div
            className="relative mx-auto origin-top p-2 transition-transform duration-200"
            style={{ transform: `scale(${planZoom})`, width: "100%" }}
          >
            <div className="relative mx-auto w-fit max-w-full">
              <img
                src={planImage}
                alt={labels.floorPlan}
                className="mx-auto block h-auto max-h-[min(42vh,22rem)] max-w-full lg:max-h-[min(50vh,28rem)]"
              />
              <PlanMarkers
                rooms={rooms}
                planRooms={planRooms}
                activeIndex={activeIndex}
                onSelect={selectRoom}
                pendingRooms={pending}
                loadingRoom={loadingRoom}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <p className="text-center text-xs text-muted">{labels.tapMarker}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {rooms.map((_, i) => markerChip(i))}
          </div>
        </div>
      )}

      <div className="max-h-[40%] space-y-1 overflow-y-auto border-t border-border p-2">
        {rooms.map((room, i) => {
          const isActive = i === activeIndex;
          const typeLabel = room.roomType
            ? getRoomTypeLabel(room.roomType)
            : "";
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => selectRoom(i)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "hover:bg-surface-hover"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white ${
                  isActive ? "bg-red-500" : "bg-emerald-500"
                }`}
              >
                {room.roomNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs">
                {labels.roomNumber(room.roomNumber)}
                {typeLabel ? ` · ${typeLabel}` : ""}
              </span>
            </button>
          );
        })}
        {pending.map((num) => (
          <div
            key={`pending-list-${num}`}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left opacity-80"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white ${
                loadingRoom === num
                  ? "animate-pulse bg-amber-500"
                  : "bg-zinc-500"
              }`}
            >
              {num}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted">
              {labels.roomNumber(num)} ·{" "}
              {loadingRoom === num
                ? labels.generatingRoom(num)
                : labels.pendingRoom}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const pendingSkeletons = pending.map((num) => (
    <article
      key={`skeleton-${num}`}
      className="overflow-hidden rounded-xl border border-dashed border-border"
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold text-white ${
            loadingRoom === num
              ? "animate-pulse bg-amber-500"
              : "bg-zinc-500"
          }`}
        >
          {num}
        </span>
        <p className="text-xs font-medium text-muted">
          {loadingRoom === num
            ? labels.generatingRoom(num)
            : `${labels.roomNumber(num)} · ${labels.pendingRoom}`}
        </p>
      </div>
      <div className="flex h-[min(40vh,16rem)] items-center justify-center bg-black/5">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    </article>
  ));

  return (
    <>
      {/* ——— Mobile: vertical stack ——— */}
      <div className="w-full lg:hidden" ref={mobileStackRef}>
        <div className="sticky top-0 z-20 -mx-1 mb-2 space-y-2 bg-background/95 px-1 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-accent">
              {total > 0
                ? labels.photoOf
                    .replace("{current}", String(activeIndex + 1))
                    .replace("{total}", String(total + pending.length))
                : labels.pendingRoom}
            </p>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {rooms.map((_, i) => markerChip(i, true))}
              {pending.map((num) => (
                <span
                  key={`chip-p-${num}`}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-dashed text-[11px] font-semibold text-white ${
                    loadingRoom === num
                      ? "animate-pulse border-amber-600 bg-amber-500"
                      : "border-zinc-500 bg-zinc-500"
                  }`}
                >
                  {num}
                </span>
              ))}
            </div>
          </div>

          {planImage && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
                  {labels.floorPlan}
                </p>
                <button
                  type="button"
                  onClick={() => setPlanExpanded(true)}
                  className="text-[10px] text-accent"
                >
                  {labels.expandPlan}
                </button>
              </div>
              <div className="relative bg-[#f3f1ec] p-2 dark:bg-[#1a1c20]">
                <div className="relative mx-auto w-fit max-w-full">
                  <img
                    src={planImage}
                    alt={labels.floorPlan}
                    className="mx-auto block h-auto max-h-36 max-w-full"
                  />
                  <PlanMarkers
                    rooms={rooms}
                    planRooms={planRooms}
                    activeIndex={activeIndex}
                    onSelect={selectRoom}
                    compact
                    pendingRooms={pending}
                    loadingRoom={loadingRoom}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {rooms.map((room, i) => (
            <article
              key={room.id}
              data-room-index={i}
              className={`overflow-hidden rounded-xl border transition ${
                i === activeIndex
                  ? "border-accent/50 shadow-sm"
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold text-white ${
                    i === activeIndex ? "bg-red-500" : "bg-emerald-500"
                  }`}
                >
                  {room.roomNumber}
                </span>
                <p className="text-xs font-medium text-foreground">
                  {labels.roomNumber(room.roomNumber)}
                  {room.roomType
                    ? ` · ${getRoomTypeLabel(room.roomType)}`
                    : ""}
                </p>
              </div>
              <img
                src={room.image}
                alt={labels.roomNumber(room.roomNumber)}
                className="max-h-[min(55vh,28rem)] w-full object-contain bg-black/5"
              />
              <div className="space-y-2 px-3 py-2">
                {room.content && (
                  <p className="text-xs leading-relaxed text-muted">
                    {room.content}
                  </p>
                )}
                {actions(room)}
              </div>
            </article>
          ))}
          {pendingSkeletons}
        </div>
      </div>

      {/* ——— Desktop: Zillow-style split ——— */}
      <div
        className="hidden w-full overflow-hidden rounded-2xl border border-border bg-bubble-assistant lg:grid lg:min-h-[28rem] lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.9fr)]"
        tabIndex={0}
      >
        <div
          ref={desktopMainRef}
          className="relative flex min-h-[24rem] flex-col bg-[#0c0d10]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="relative flex min-h-0 flex-1 cursor-grab items-center justify-center active:cursor-grabbing">
            {total > 1 && navArrows}
            {active?.image ? (
              <img
                key={fadeKey}
                src={active.image}
                alt={labels.roomNumber(active.roomNumber)}
                className="max-h-[min(58vh,32rem)] w-full animate-[fadeIn_220ms_ease-out] object-contain select-none"
                draggable={false}
              />
            ) : pending.length > 0 ? (
              <div className="flex flex-col items-center gap-3 text-white/80">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
                <p className="text-sm">
                  {loadingRoom
                    ? labels.generatingRoom(loadingRoom)
                    : labels.pendingRoom}
                </p>
              </div>
            ) : null}
            {total > 0 && (
              <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                {counter}
              </div>
            )}
            {active?.image && (
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                aria-label={labels.fullscreen}
                className="absolute right-3 bottom-3 z-10 rounded-lg bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/65"
              >
                {labels.fullscreen}
              </button>
            )}
          </div>

          {(total > 1 || pending.length > 0) && (
            <div
              ref={filmstripRef}
              className="flex gap-1.5 overflow-x-auto border-t border-white/10 bg-black/50 px-2 py-2"
            >
              {rooms.map((room, i) => (
                <button
                  key={`thumb-${room.id}`}
                  type="button"
                  data-thumb-index={i}
                  onClick={() => selectRoom(i)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${
                    i === activeIndex
                      ? "border-red-500 ring-1 ring-red-400/40"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={room.image}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/65 px-1 text-[9px] font-semibold text-white">
                    {room.roomNumber}
                  </span>
                </button>
              ))}
              {pending.map((num) => (
                <div
                  key={`thumb-p-${num}`}
                  className={`relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed ${
                    loadingRoom === num
                      ? "animate-pulse border-amber-500 bg-amber-500/20"
                      : "border-zinc-500 bg-zinc-700/40"
                  }`}
                >
                  <span className="text-xs font-semibold text-white/90">{num}</span>
                </div>
              ))}
            </div>
          )}

          {active && (
            <div className="border-t border-white/10 bg-black/40 px-4 py-3 text-white backdrop-blur-sm">
              <p className="text-sm font-medium">
                {labels.roomNumber(active.roomNumber)}
                {active.roomType
                  ? ` · ${getRoomTypeLabel(active.roomType)}`
                  : ""}
              </p>
              {active.content && (
                <p className="mt-0.5 text-xs text-white/70">{active.content}</p>
              )}
              <div className="mt-2 [&_a]:text-sky-300 [&_button]:text-white/80 [&_button:hover]:text-white">
                {actions(active)}
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col border-l border-border">
          {planPanel}
        </div>
      </div>

      {fullscreen && active && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <p className="text-sm font-medium">
              {labels.roomNumber(active.roomNumber)}
              {active.roomType
                ? ` · ${getRoomTypeLabel(active.roomType)}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              {counter}
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
              >
                {labels.exitFullscreen}
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
            {total > 1 && navArrows}
            <img
              key={`fs-${fadeKey}`}
              src={active.image}
              alt=""
              className="max-h-full max-w-full animate-[fadeIn_220ms_ease-out] object-contain select-none"
              draggable={false}
            />
          </div>
          {total > 1 && (
            <div className="flex justify-center gap-2 pb-5">
              {rooms.map((_, i) => markerChip(i, true))}
            </div>
          )}
        </div>
      )}

      {planExpanded && planImage && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/80 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-t-xl border border-border bg-surface px-3 py-2">
            <p className="text-sm font-medium">{labels.floorPlan}</p>
            <button
              type="button"
              onClick={() => setPlanExpanded(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
            >
              {labels.collapsePlan}
            </button>
          </div>
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 overflow-auto rounded-b-xl border border-t-0 border-border bg-[#f3f1ec] p-4 dark:bg-[#1a1c20]">
            <div className="relative mx-auto my-auto w-fit max-w-full">
              <img
                src={planImage}
                alt={labels.floorPlan}
                className="mx-auto block h-auto max-h-[min(78vh,52rem)] max-w-full"
              />
              <PlanMarkers
                rooms={rooms}
                planRooms={planRooms}
                activeIndex={activeIndex}
                onSelect={(i) => {
                  selectRoom(i);
                  setPlanExpanded(false);
                }}
                pendingRooms={pending}
                loadingRoom={loadingRoom}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Group consecutive tech-passport result messages into gallery blocks. */
export type MessageRenderItem =
  | { kind: "message"; message: ChatMessage }
  | { kind: "tp-gallery"; messages: ChatMessage[]; key: string };

export function groupMessagesForRender(
  messages: ChatMessage[]
): MessageRenderItem[] {
  const items: MessageRenderItem[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (
      m.role === "assistant" &&
      m.mode === "techpassport" &&
      m.image &&
      m.roomNumber
    ) {
      const group: ChatMessage[] = [];
      while (
        i < messages.length &&
        messages[i].role === "assistant" &&
        messages[i].mode === "techpassport" &&
        messages[i].image &&
        messages[i].roomNumber
      ) {
        group.push(messages[i]);
        i++;
      }
      items.push({ kind: "tp-gallery", messages: group, key: group[0].id });
      continue;
    }
    items.push({ kind: "message", message: m });
    i++;
  }
  return items;
}

export function findPlanImageForGallery(
  galleryMsgs: ChatMessage[],
  allMessages: ChatMessage[]
): string | undefined {
  for (const m of galleryMsgs) {
    if (m.generationContext?.techPassportImage) {
      return m.generationContext.techPassportImage;
    }
  }
  const firstId = galleryMsgs[0]?.id;
  if (!firstId) return undefined;
  const idx = allMessages.findIndex((m) => m.id === firstId);
  for (let i = idx - 1; i >= 0; i--) {
    const m = allMessages[i];
    if (
      m.role === "user" &&
      (m.mode === "techpassport" || !m.mode) &&
      m.attachments?.[0]
    ) {
      return m.attachments[0];
    }
  }
  return undefined;
}

export function findPlanRoomsForGallery(
  galleryMsgs: ChatMessage[],
  fallback?: ParsedRoom[] | null
): ParsedRoom[] | undefined {
  for (const m of galleryMsgs) {
    const rooms = m.generationContext?.planAnalysis?.rooms;
    if (rooms && rooms.length > 0) return rooms;
  }
  return fallback ?? undefined;
}


