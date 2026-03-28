// lib/drawUtils.ts
import type { Results } from '@mediapipe/pose';

const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

export function drawCyberPose(canvas: HTMLCanvasElement, results: Results) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // ALWAYS clear — even if no landmarks. This prevents lines from getting "stuck"
  // when the AI loses tracking or the video is paused/ended.
  ctx.clearRect(0, 0, width, height);

  if (!results.poseLandmarks) return;

  const landmarks = results.poseLandmarks;

  ctx.save();

  // 1. Skeleton bones (Neon Cyan)
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 6;

  POSE_CONNECTIONS.forEach(([i, j]) => {
    const lm1 = landmarks[i];
    const lm2 = landmarks[j];

    if (
      lm1?.visibility && lm1.visibility > 0.5 &&
      lm2?.visibility && lm2.visibility > 0.5
    ) {
      ctx.beginPath();
      ctx.moveTo(lm1.x * width, lm1.y * height);
      ctx.lineTo(lm2.x * width, lm2.y * height);
      ctx.stroke();
    }
  });

  // 2. Joints (Neon Magenta)
  ctx.fillStyle = '#ff00ff';
  ctx.shadowColor = '#ff00ff';
  ctx.shadowBlur = 8;

  landmarks.forEach((lm) => {
    if (lm?.visibility && lm.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  ctx.restore();
}

/**
 * Wipe the canvas completely. Call this on video pause/end to immediately
 * remove any stale pose overlay.
 */
export function clearPoseCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}