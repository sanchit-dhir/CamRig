/**
 * mocapEngine.ts
 *
 * Converts MediaPipe landmarks into stable 3D directions + Kalidokit rotations
 * aligned to Three.js coordinate system.
 */

import { Pose as KalidokitPose } from "kalidokit";
import { Results } from "@mediapipe/pose";
import * as THREE from "three";

export interface PoseFrame {
  timestamp: number;
  Hips?: { x: number; y: number; z: number; px?: number; py?: number };
  Spine?: { x: number; y: number; z: number };
  Neck?: { x: number; y: number; z: number };
  Head?: { x: number; y: number; z: number };

  LeftUpperLeg?: { dx: number; dy: number; dz: number };
  LeftLowerLeg?: { dx: number; dy: number; dz: number };
  RightUpperLeg?: { dx: number; dy: number; dz: number };
  RightLowerLeg?: { dx: number; dy: number; dz: number };

  LeftUpperArm?: { dx: number; dy: number; dz: number };
  LeftLowerArm?: { dx: number; dy: number; dz: number };
  RightUpperArm?: { dx: number; dy: number; dz: number };
  RightLowerArm?: { dx: number; dy: number; dz: number };
}

export interface CapturedMocap {
  frames: PoseFrame[];
  fps: number;
}

function clamp(v: number, limit = Math.PI): number {
  return Math.max(-limit, Math.min(limit, isNaN(v) ? 0 : v));
}

function toEuler(v: any): { x: number; y: number; z: number } | undefined {
  if (!v) return undefined;
  if (typeof v.x === "number") return { x: v.x, y: v.y ?? 0, z: v.z ?? 0 };
  return undefined;
}

export function compileMocap(
  rawFrames: { time: number; results: Results }[],
  duration: number,
  fps = 30,
  smoothing = 0.5,
): CapturedMocap {
  const alpha = Math.max(0.01, Math.min(1.0, smoothing));
  const frames: PoseFrame[] = [];

  const ema: Record<string, { x: number; y: number; z: number }> = {};

  const smooth = (key: string, v: { x: number; y: number; z: number }) => {
    if (!ema[key]) {
      ema[key] = { ...v };
      return { ...v };
    }
    ema[key].x += (v.x - ema[key].x) * alpha;
    ema[key].y += (v.y - ema[key].y) * alpha;
    ema[key].z += (v.z - ema[key].z) * alpha;
    return { ...ema[key] };
  };

  // direction function
  const getDir = (p1: any, p2: any) => {
    const dir = new THREE.Vector3(
      p2.x - p1.x,
      -(p2.y - p1.y), // Y flip
      -(p2.z - p1.z), // Z flip
    );

    const len = dir.length();
    if (len < 0.0001) return { dx: 0, dy: -1, dz: 0 };

    dir.normalize();
    return { dx: dir.x, dy: dir.y, dz: dir.z };
  };

  // Pre-solve all unique raw frames to avoid redundant work
  const solvedFrames = rawFrames.map((raw) => {
    const lm = raw.results.poseLandmarks;
    const wlm = raw.results.poseWorldLandmarks;

    if (!lm || !wlm || lm.length < 25) return { time: raw.time, solved: null, wlm: null };

    let s: any = null;
    try {
      s = KalidokitPose.solve(wlm, lm, { runtime: "mediapipe", video: null });
    } catch { }

    return { time: raw.time, solved: s, wlm };
  });

  // Calculate target frame count based strictly on duration and fps
  const totalFrames = Math.floor(duration * fps);

  for (let i = 0; i < totalFrames; i++) {
    const targetTime = i / fps;

    // Find nearest recorded frame
    let nearestDist = Infinity;
    let nearestObj = solvedFrames[0];

    for (const sf of solvedFrames) {
      const dist = Math.abs(sf.time - targetTime);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestObj = sf;
      }
    }

    const frame: PoseFrame = { timestamp: targetTime };

    if (!nearestObj || !nearestObj.solved || !nearestObj.wlm) {
      frames.push(frame);
      continue;
    }

    const s = nearestObj.solved;
    const wlm = nearestObj.wlm;

    // ── HIPS ───────────────────────────────
    const hRot = toEuler(s.Hips?.rotation);
    const hPos = s.Hips?.position;

    if (hRot) {
      const smoothed = smooth("Hips", {
        x: clamp(-hRot.x),
        y: clamp(-hRot.y),
        z: clamp(hRot.z),
      });

      frame.Hips = {
        ...smoothed,
        px: hPos?.x ?? 0,
        py: hPos?.y ?? 0,
      };
    }

    // ── ARMS ───────────────────────────────
    if (wlm[11] && wlm[13]) frame.LeftUpperArm = getDir(wlm[11], wlm[13]);
    if (wlm[13] && wlm[15]) frame.LeftLowerArm = getDir(wlm[13], wlm[15]);
    if (wlm[12] && wlm[14]) frame.RightUpperArm = getDir(wlm[12], wlm[14]);
    if (wlm[14] && wlm[16]) frame.RightLowerArm = getDir(wlm[14], wlm[16]);

    // ── LEGS ───────────────────────────────
    if (wlm[23] && wlm[25]) frame.LeftUpperLeg = getDir(wlm[23], wlm[25]);
    if (wlm[25] && wlm[27]) frame.LeftLowerLeg = getDir(wlm[25], wlm[27]);
    if (wlm[24] && wlm[26]) frame.RightUpperLeg = getDir(wlm[24], wlm[26]);
    if (wlm[26] && wlm[28]) frame.RightLowerLeg = getDir(wlm[26], wlm[28]);

    // ── TORSO ─────────────────────────────
    const sp = toEuler(s.Spine);
    if (sp) frame.Spine = smooth("Spine", sp);

    const nk = toEuler(s.Neck);
    if (nk) frame.Neck = smooth("Neck", nk);

    const hd = toEuler(s.Head);
    if (hd) frame.Head = smooth("Head", hd);

    frames.push(frame);
  }

  return { frames, fps };
}