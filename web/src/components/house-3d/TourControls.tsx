"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { RoomBox } from "@/lib/house3d/types";

const EYE_HEIGHT = 1.55;

export function roomStandingPos(room: RoomBox): [number, number, number] {
  return [room.x + room.width / 2, EYE_HEIGHT, room.z + room.depth / 2];
}

/** First-person look with smooth teleport between rooms. */
export function TourLookControls({
  eye,
  enabled,
  resetToken,
  onTransitionChange,
}: {
  eye: [number, number, number];
  enabled: boolean;
  resetToken?: string;
  onTransitionChange?: (active: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0.08);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const eyeCurrent = useRef(new THREE.Vector3(eye[0], eye[1], eye[2]));
  const eyeTarget = useRef(new THREE.Vector3(eye[0], eye[1], eye[2]));
  const transitioning = useRef(false);
  const onTransitionChangeRef = useRef(onTransitionChange);

  useEffect(() => {
    onTransitionChangeRef.current = onTransitionChange;
  }, [onTransitionChange]);

  useEffect(() => {
    eyeTarget.current.set(eye[0], eye[1], eye[2]);
    const dist = eyeCurrent.current.distanceTo(eyeTarget.current);
    if (dist > 0.05) {
      transitioning.current = true;
      onTransitionChangeRef.current?.(true);
    }
  }, [eye]);

  useEffect(() => {
    pitch.current = 0.08;
  }, [resetToken]);

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * 0.005;
      pitch.current = Math.max(
        -1.15,
        Math.min(1.15, pitch.current - dy * 0.005)
      );
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl, enabled]);

  useFrame((_, dt) => {
    if (!enabled) return;

    const alpha = 1 - Math.exp(-dt * 5.5);
    eyeCurrent.current.lerp(eyeTarget.current, alpha);

    if (transitioning.current) {
      const rem = eyeCurrent.current.distanceTo(eyeTarget.current);
      if (rem < 0.02) {
        eyeCurrent.current.copy(eyeTarget.current);
        transitioning.current = false;
        onTransitionChangeRef.current?.(false);
      }
    }

    const { x, y, z } = eyeCurrent.current;
    camera.position.set(x, y, z);
    const look = new THREE.Vector3(
      x + Math.sin(yaw.current) * Math.cos(pitch.current),
      y + Math.sin(pitch.current),
      z + Math.cos(yaw.current) * Math.cos(pitch.current)
    );
    camera.lookAt(look);
  });

  return null;
}

export function TeleportNode({
  room,
  active,
  onTeleport,
}: {
  room: RoomBox;
  active: boolean;
  onTeleport: (id: string) => void;
}) {
  const pos: [number, number, number] = [
    room.x + room.width / 2,
    0.06,
    room.z + room.depth / 2,
  ];
  return (
    <group position={pos}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!active) onTeleport(room.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = active ? "default" : "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <circleGeometry args={[active ? 0.28 : 0.38, 32]} />
        <meshStandardMaterial
          color={active ? "#2563eb" : "#ffffff"}
          emissive={active ? "#1d4ed8" : "#f8fafc"}
          emissiveIntensity={active ? 0.45 : 0.25}
          roughness={0.35}
          metalness={0.15}
          transparent
          opacity={active ? 0.98 : 0.94}
        />
      </mesh>
      {!active && (
        <>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.52, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
          </mesh>
          <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
            <div className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-medium whitespace-nowrap text-white shadow-md backdrop-blur-sm">
              {room.label}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

/** Invisible floor hit area — used in dollhouse to enter a room. */
export function RoomPickFloor({
  room,
  onSelect,
}: {
  room: RoomBox;
  onSelect: (id: string) => void;
}) {
  return (
    <mesh
      position={[
        room.x + room.width / 2,
        0.04,
        room.z + room.depth / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(room.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <planeGeometry args={[room.width * 0.92, room.depth * 0.92]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

