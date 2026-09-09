"use client";

import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";

export type ShowcaseRoom = "living" | "kitchen" | "bedroom";
export type ShowcaseStyle = "empty" | "scandi" | "industrial" | "classic";

const ROOMS: ShowcaseRoom[] = ["living", "kitchen", "bedroom"];
const STYLES: Array<Exclude<ShowcaseStyle, "empty">> = ["scandi", "industrial", "classic"];

function FloorPlan({
  active,
  bathLabel,
  labels,
  onRoomSelect,
}: {
  active: ShowcaseRoom;
  bathLabel: string;
  labels: Record<ShowcaseRoom, string>;
  onRoomSelect: (room: ShowcaseRoom) => void;
}) {
  const selectableRooms: Array<{
    id: ShowcaseRoom;
    labelX: number;
    labelY: number;
    rect: { height: number; width: number; x: number; y: number };
  }> = [
    { id: "living", labelX: 108, labelY: 104, rect: { height: 132, width: 154, x: 30, y: 30 } },
    { id: "kitchen", labelX: 234, labelY: 78, rect: { height: 88, width: 76, x: 196, y: 30 } },
    { id: "bedroom", labelX: 108, labelY: 248, rect: { height: 104, width: 154, x: 30, y: 178 } },
  ];

  function handleKeyDown(event: KeyboardEvent, room: ShowcaseRoom) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRoomSelect(room);
    }
  }

  return (
    <svg aria-label={labels.living} className="lp-plan-svg" role="img" viewBox="0 0 300 320">
      <rect className="lp-plan-shell" height="300" rx="16" width="280" x="10" y="10" />
      {selectableRooms.map((item) => {
        const isActive = active === item.id;
        return (
          <g
            aria-current={isActive ? "true" : undefined}
            aria-label={labels[item.id]}
            className={`lp-plan-room-group ${isActive ? "is-active" : ""}`}
            key={item.id}
            onClick={() => onRoomSelect(item.id)}
            onKeyDown={(event) => handleKeyDown(event, item.id)}
            role="button"
            tabIndex={0}
          >
            <rect
              className="lp-plan-room"
              height={item.rect.height}
              rx="10"
              width={item.rect.width}
              x={item.rect.x}
              y={item.rect.y}
            />
            <text className="lp-plan-label" dominantBaseline="middle" textAnchor="middle" x={item.labelX} y={item.labelY}>
              {labels[item.id]}
            </text>
          </g>
        );
      })}
      <g aria-hidden="true" className="lp-plan-room-group is-static">
        <rect className="lp-plan-room lp-plan-bath" height="104" rx="10" width="76" x="196" y="178" />
        <text className="lp-plan-label" dominantBaseline="middle" textAnchor="middle" x="234" y="230">
          {bathLabel}
        </text>
      </g>
      <g aria-hidden="true" className="lp-plan-doors">
        <path className="lp-plan-door" d="M184 74v28" />
        <path className="lp-plan-door" d="M184 214v28" />
        <path className="lp-plan-door" d="M214 118h24" />
      </g>
      <g aria-hidden="true" className="lp-plan-windows">
        <rect className="lp-plan-window" height="5" rx="1.5" width="42" x="86" y="24" />
        <rect className="lp-plan-window" height="5" rx="1.5" width="34" x="216" y="24" />
        <rect className="lp-plan-window" height="5" rx="1.5" width="38" x="86" y="291" />
      </g>
    </svg>
  );
}

function RoomSpace({ room, style }: { room: ShowcaseRoom; style: ShowcaseStyle }) {
  const uid = useId().replace(/:/g, "");
  const furnished = style !== "empty";

  return (
    <div className={`lp-space lp-space-${room} lp-space-${style}`}>
      <div className="lp-space-glow" />
      <div className="lp-space-rays" />
      <div className="lp-motes" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <svg aria-hidden="true" className="lp-space-rig" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 760">
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" x2="0" y1="0" y2="1">
            <stop className="lp-sky-top" offset="0%" />
            <stop className="lp-sky-mid" offset="55%" />
            <stop className="lp-sky-bot" offset="100%" />
          </linearGradient>
          <linearGradient id={`${uid}-wall`} x1="0" x2="0" y1="0" y2="1">
            <stop className="lp-wall-top" offset="0%" />
            <stop className="lp-wall-bot" offset="100%" />
          </linearGradient>
          <linearGradient id={`${uid}-floor`} x1="0" x2=".2" y1="0" y2="1">
            <stop className="lp-floor-top" offset="0%" />
            <stop className="lp-floor-bot" offset="100%" />
          </linearGradient>
          <pattern id={`${uid}-plank`} height="42" patternUnits="userSpaceOnUse" width="1200">
            <rect className="lp-plank" height="42" width="1200" />
            <path className="lp-plank-line" d="M0 41h1200" />
          </pattern>
          <filter id={`${uid}-glow`}>
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id={`${uid}-soft`}>
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <rect fill={`url(#${uid}-wall)`} height="760" width="1200" />
        <polygon className="lp-ceiling" points="0,0 236,86 1200,86 1200,0" />
        <polygon className="lp-side-wall" points="0,0 236,86 236,508 0,760" />
        <polygon fill={`url(#${uid}-floor)`} points="236,430 1200,430 1200,760 0,760 0,508" />
        <polygon fill={`url(#${uid}-plank)`} opacity=".45" points="236,430 1200,430 1200,760 0,760 0,508" />
        <g className="lp-floor-seams" opacity=".18">
          <line x1="80" x2="1180" y1="500" y2="500" />
          <line x1="40" x2="1180" y1="560" y2="560" />
          <line x1="16" x2="1180" y1="630" y2="630" />
          <line x1="8" x2="1180" y1="700" y2="700" />
        </g>
        <rect className="lp-baseboard" height="10" width="964" x="236" y="424" />
        <ellipse className="lp-sun" cx="560" cy="210" filter={`url(#${uid}-glow)`} rx="210" ry="130" />
        <rect className="lp-frame" height="292" rx="2" width="248" x="418" y="102" />
        <rect fill={`url(#${uid}-sky)`} height="258" width="214" x="435" y="118" />
        <rect className="lp-glass" height="258" opacity=".22" width="54" x="449" y="118" />
        <rect className="lp-mullion" height="258" width="14" x="435" y="118" />
        <rect className="lp-mullion" height="258" width="14" x="635" y="118" />
        <rect className="lp-sill" height="14" rx="3" width="268" x="408" y="388" />
        {!furnished && (
          <g className="lp-empty-props">
            <rect className="lp-radiator" height="86" rx="3" width="18" x="118" y="430" />
            <rect className="lp-scuff" height="8" opacity=".2" rx="2" width="90" x="860" y="470" />
            <rect className="lp-outlet" height="16" rx="2" width="22" x="1088" y="392" />
          </g>
        )}
        {furnished && (
          <>
            <rect className="lp-curtain" height="258" opacity=".72" width="22" x="435" y="118" />
            <rect className="lp-curtain" height="258" opacity=".72" width="22" x="627" y="118" />
            <rect className="lp-art" height="96" rx="4" width="72" x="980" y="168" />
            <rect className="lp-art-mat" height="64" rx="2" width="44" x="994" y="184" />
            {room === "living" && (
              <g className="lp-living">
                <ellipse className="lp-shadow" cx="700" cy="628" rx="250" ry="42" />
                <ellipse className="lp-rug" cx="700" cy="610" filter={`url(#${uid}-soft)`} rx="280" ry="86" />
                <rect className="lp-sofa-back" height="86" rx="18" width="400" x="470" y="428" />
                <rect className="lp-sofa-body" height="128" rx="22" width="420" x="460" y="468" />
                <rect className="lp-cushion" height="26" rx="10" width="150" x="488" y="488" />
                <rect className="lp-cushion" height="26" rx="10" width="150" x="702" y="488" />
                <rect className="lp-wood" height="22" rx="10" width="168" x="586" y="578" />
                <rect className="lp-table-top" height="18" rx="8" width="176" x="582" y="548" />
                <rect className="lp-book" height="10" rx="2" width="36" x="612" y="538" />
                <rect className="lp-lamp-stem" height="210" width="8" x="1048" y="308" />
                <circle className="lp-lamp-glow" cx="1052" cy="292" filter={`url(#${uid}-glow)`} r="36" />
                <circle className="lp-lamp-shade" cx="1052" cy="292" r="26" />
                <ellipse className="lp-plant-pot" cx="278" cy="528" rx="28" ry="12" />
                <path className="lp-plant-leaf" d="M278 430c48 28 42 78 8 96-46-18-62-70-8-96z" />
                <path className="lp-plant-leaf is-two" d="M292 448c38 22 18 68-10 82-28-24-22-70 10-82z" />
              </g>
            )}
            {room === "kitchen" && (
              <g className="lp-kitchen">
                <ellipse className="lp-shadow" cx="730" cy="620" rx="210" ry="36" />
                <rect className="lp-backsplash" height="70" width="280" x="250" y="348" />
                <rect className="lp-cabinet" height="210" rx="6" width="280" x="250" y="220" />
                <rect className="lp-counter" height="28" rx="4" width="300" x="240" y="418" />
                <rect className="lp-sink" height="14" rx="4" width="86" x="268" y="424" />
                <rect className="lp-island" height="92" rx="12" width="340" x="560" y="498" />
                <rect className="lp-wood" height="16" rx="8" width="300" x="580" y="512" />
                <ellipse className="lp-stool" cx="620" cy="620" rx="28" ry="14" />
                <ellipse className="lp-stool" cx="710" cy="636" rx="28" ry="14" />
                <ellipse className="lp-stool" cx="800" cy="620" rx="28" ry="14" />
              </g>
            )}
            {room === "bedroom" && (
              <g className="lp-bedroom">
                <ellipse className="lp-shadow" cx="660" cy="630" rx="240" ry="38" />
                <rect className="lp-headboard" height="70" rx="10" width="420" x="450" y="430" />
                <rect className="lp-bed" height="150" rx="18" width="460" x="430" y="468" />
                <rect className="lp-blanket" height="78" rx="12" width="420" x="450" y="522" />
                <rect className="lp-pillow" height="36" rx="12" width="110" x="470" y="486" />
                <rect className="lp-pillow" height="36" rx="12" width="110" x="600" y="486" />
                <rect className="lp-night" height="64" rx="8" width="70" x="360" y="520" />
                <circle className="lp-lamp-glow" cx="394" cy="508" r="10" />
                <rect className="lp-wardrobe" height="240" rx="8" width="110" x="980" y="220" />
                <line className="lp-wardrobe-gap" x1="1035" x2="1035" y1="228" y2="452" />
              </g>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

export function LandingShowcase({
  afterLabel,
  beforeLabel,
  hint,
  planTitle,
  stagingLabel,
  tourLabel,
  bathLabel,
  roomLabels,
  styleLabels,
}: {
  beforeLabel: string;
  afterLabel: string;
  hint: string;
  planTitle: string;
  stagingLabel: string;
  tourLabel: string;
  bathLabel: string;
  roomLabels: Record<ShowcaseRoom, string>;
  styleLabels: Record<Exclude<ShowcaseStyle, "empty">, string>;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<ShowcaseRoom>("living");
  const [style, setStyle] = useState<ShowcaseStyle>("scandi");
  const [split, setSplit] = useState(62);
  const [compare, setCompare] = useState(true);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const labelId = useId();

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setRoom((current) => ROOMS[(ROOMS.indexOf(current) + 1) % ROOMS.length]);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setStyle((current) => {
        const index = STYLES.indexOf(current === "empty" ? "scandi" : current);
        return STYLES[(Math.max(0, index) + 1) % STYLES.length];
      });
    }, 6400);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (paused || !compare) return undefined;
    const timer = window.setInterval(() => {
      setSplit((value) => (value > 70 ? 38 : 72));
    }, 2800);
    return () => window.clearInterval(timer);
  }, [paused, compare]);

  const moveTo = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    setSplit(Math.min(90, Math.max(10, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  function pickRoom(next: ShowcaseRoom) {
    setPaused(true);
    setRoom(next);
  }

  function pickStyle(next: ShowcaseStyle) {
    setPaused(true);
    setStyle(next);
  }

  const compareLabel = `${beforeLabel} / ${afterLabel}`;

  return (
    <div className="lp-showcase">
      <figure className="lp-showcase-stage">
        <div className="lp-showcase-visual">
          <div
            ref={frameRef}
            aria-label={compare ? compareLabel : undefined}
            aria-orientation={compare ? "horizontal" : undefined}
            aria-valuemax={90}
            aria-valuemin={10}
            aria-valuenow={compare ? Math.round(split) : undefined}
            className={`lp-compare-frame lp-showcase-frame ${compare ? "is-compare" : ""} ${dragging ? "is-dragging" : ""}`}
            id="lp-showcase-preview"
            onKeyDown={(event) => {
              if (!compare) return;
              if (event.key === "ArrowLeft") setSplit((value) => Math.max(10, value - 4));
              if (event.key === "ArrowRight") setSplit((value) => Math.min(90, value + 4));
            }}
            onPointerDown={(event) => {
              if (!compare) return;
              setPaused(true);
              setDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              moveTo(event.clientX);
            }}
            onPointerUp={() => setDragging(false)}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
            }}
            role={compare ? "slider" : undefined}
            tabIndex={compare ? 0 : undefined}
          >
          <div className="lp-compare-layer">
            <RoomSpace room={room} style="empty" />
          </div>
          <div
            className="lp-compare-layer is-after"
            style={compare ? { clipPath: `inset(0 ${100 - split}% 0 0)` } : undefined}
          >
            <RoomSpace room={room} style={style === "empty" ? "scandi" : style} />
          </div>
          {compare ? (
            <>
              <span className="lp-compare-chip is-before">{afterLabel}</span>
              <span className="lp-compare-chip is-after-chip">{beforeLabel}</span>
              <div className="lp-compare-divider" style={{ left: `${split}%` }}>
                <span className="lp-compare-handle" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 7 4 12l5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    <path d="m15 7 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </span>
              </div>
            </>
          ) : null}
          </div>
        </div>
        <figcaption className="lp-compare-hint" id={labelId}>
          {hint}
          <span className="lp-compare-tour">{tourLabel}</span>
        </figcaption>
      </figure>

      <aside aria-labelledby="lp-plan-heading" className="lp-showcase-side">
        <div className="lp-side-card">
          <h2 className="lp-kicker" id="lp-plan-heading">
            {planTitle}
          </h2>
          <div className="lp-plan-board">
            <FloorPlan
              active={room}
              bathLabel={bathLabel}
              labels={roomLabels}
              onRoomSelect={pickRoom}
            />
          </div>
          <div className="lp-side-controls">
            <div aria-label={planTitle} className="lp-room-pills" role="tablist">
              {ROOMS.map((item) => (
                <button
                  aria-selected={room === item}
                  className={room === item ? "is-active" : ""}
                  key={item}
                  onClick={() => pickRoom(item)}
                  role="tab"
                  type="button"
                >
                  {roomLabels[item]}
                </button>
              ))}
            </div>
            <p className="lp-side-label">{stagingLabel}</p>
            <div className="lp-style-pills">
              {STYLES.map((item) => (
                <button
                  className={style === item ? "is-active" : ""}
                  key={item}
                  onClick={() => pickStyle(item)}
                  type="button"
                >
                  {styleLabels[item]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
