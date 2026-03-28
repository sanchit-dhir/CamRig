"use client";

import { useCallback, useRef } from "react";

type Props = {
  side: "left" | "right";
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  className?: string;
};

export default function PanelResizeHandle({
  side,
  value,
  min,
  max,
  onChange,
  className = "",
}: Props) {
  const drag = useRef<{
    active: boolean;
    startX: number;
    startVal: number;
    pointerId: number | null;
  }>({ active: false, startX: 0, startVal: 0, pointerId: null });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const t = e.currentTarget as HTMLElement;
      t.setPointerCapture(e.pointerId);
      drag.current = {
        active: true,
        startX: e.clientX,
        startVal: value,
        pointerId: e.pointerId,
      };
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const next =
        side === "left"
          ? drag.current.startVal + dx
          : drag.current.startVal - dx;
      onChange(Math.min(max, Math.max(min, next)));
    },
    [max, min, onChange, side],
  );

  const end = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const t = e.currentTarget as HTMLElement;
    if (drag.current.pointerId !== null) {
      try {
        t.releasePointerCapture(drag.current.pointerId);
      } catch {
        /* ignore */
      }
    }
    drag.current = { active: false, startX: 0, startVal: 0, pointerId: null };
  }, []);

  return (
    <button
      type="button"
      aria-label={side === "left" ? "Resize left panel" : "Resize right panel"}
      data-studio-tip={side === "left" ? "Drag to resize tools" : "Drag to resize library"}
      className={`group relative z-30 flex w-2 shrink-0 cursor-col-resize items-stretch justify-center border-0 bg-transparent p-0 outline-none transition-[opacity] duration-300 hover:opacity-100 focus-visible:opacity-100 ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span
        className="my-3 w-px rounded-full bg-[var(--studio-border)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-1 group-hover:bg-[var(--studio-highlight)] group-hover:shadow-[0_0_18px_color-mix(in_oklab,var(--studio-highlight)_45%,transparent)] group-active:scale-y-95"
      />
    </button>
  );
}