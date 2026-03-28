"use client";

import { useEffect, useRef } from "react";
import type { StudioThemeId } from "./StudioThemeContext";

export type ViewportPointerState = {
  x: number;
  y: number;
  inside: boolean;
};

type Props = {
  theme: StudioThemeId;
  className?: string;
  /** Updated by parent on pointer move over the viewport area (no React re-renders). */
  pointerRef: React.MutableRefObject<ViewportPointerState>;
};

const FLAKE_COUNT = 360;

export default function StudioViewportBackground({
  theme,
  className = "",
  pointerRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    type Flake = {
      x: number;
      y: number;
      baseR: number;
      vy: number;
      vx: number;
      phase: number;
      wobble: number;
    };

    const flakes: Flake[] = [];

    const initFlakes = () => {
      flakes.length = 0;
      for (let i = 0; i < FLAKE_COUNT; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          baseR: 0.95 + Math.random() * 2.85,
          vy: 0.45 + Math.random() * 1.35,
          vx: (Math.random() - 0.5) * 0.42,
          phase: Math.random() * Math.PI * 2,
          wobble: 0.8 + Math.random() * 1.4,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dp = dpr();
      canvas.width = Math.floor(w * dp);
      canvas.height = Math.floor(h * dp);
      ctx.setTransform(dp, 0, 0, dp, 0, 0);
      if (flakes.length === 0) initFlakes();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const bgForTheme = () => {
      switch (theme) {
        case "minimal":
          return {
            top: "#f8fafc",
            mid: "#e2e8f0",
            bottom: "#cbd5e1",
            flake: "rgba(71,85,105,0.72)",
            halo: "rgba(100,116,139,0.22)",
          };
        case "creative":
          return {
            top: "#0e0c14",
            mid: "#12101c",
            bottom: "#080712",
            flake: "rgba(250,252,255,0.97)",
            halo: "rgba(186,230,253,0.35)",
          };
        default:
          return {
            top: "#111827",
            mid: "#0f172a",
            bottom: "#0a0f1a",
            flake: "rgba(255,255,255,0.96)",
            halo: "rgba(226,232,240,0.28)",
          };
      }
    };

    let raf = 0;
    let t0 = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const { top, mid, bottom, flake, halo } = bgForTheme();

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top);
      g.addColorStop(0.5, mid);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const ptr = pointerRef.current;
      const px = ptr.inside ? ptr.x * w : -1e6;
      const py = ptr.inside ? ptr.y * h : -1e6;
      const influenceR = Math.min(w, h) * 0.22;
      const windStrength = ptr.inside ? 2.8 : 0;

      for (const f of flakes) {
        const dx = f.x - px;
        const dy = f.y - py;
        const dist = Math.hypot(dx, dy) + 1e-4;
        if (ptr.inside && dist < influenceR * 2.2) {
          const push = (1 - dist / (influenceR * 2.2)) * windStrength;
          const nx = dx / dist;
          const ny = dy / dist;
          f.vx += nx * push * 0.14;
          f.vy += ny * push * 0.06;
        }

        f.vx *= 0.96;
        f.vy = Math.min(f.vy, 3.2);
        f.vy *= 0.998;

        f.x += f.vx + Math.sin(t * f.wobble + f.phase) * 0.35;
        f.y += f.vy;

        if (f.y > h + 4) {
          f.y = -4;
          f.x = Math.random() * w;
          f.vy = 0.45 + Math.random() * 1.35;
          f.vx = (Math.random() - 0.5) * 0.42;
        }
        if (f.x < -8) f.x = w + 4;
        if (f.x > w + 8) f.x = -4;

        const r = f.baseR * (0.85 + 0.15 * Math.sin(t * 3 + f.phase));
        const core = r * 0.52;
        ctx.fillStyle = halo;
        ctx.globalAlpha = theme === "minimal" ? 0.38 : 0.5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, core * 1.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flake;
        ctx.globalAlpha = theme === "minimal" ? 0.42 + 0.38 * (f.baseR / 3.5) : 0.68 + 0.28 * (f.baseR / 3.5);
        ctx.beginPath();
        ctx.arc(f.x, f.y, core, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, "transparent");
      v.addColorStop(1, theme === "minimal" ? "rgba(15,23,42,0.04)" : "rgba(0,0,0,0.2)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme, pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}