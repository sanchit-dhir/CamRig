"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CapturedMocap } from "../../lib/mocapEngine";
import Viewport, { ViewportHandle } from "../../components/studio/Viewport";
import RightPanel from "../../components/studio/RightPanel";
import LeftPanel from "../../components/studio/LeftPanel";
import StudioViewportBackground, {
  type ViewportPointerState,
} from "../../components/studio/StudioViewportBackround";
import { StudioThemeProvider, useStudioTheme } from "../../components/studio/StudioThemeContext";
import ThemeSwitcher from "../../components/studio/ThemeSwitcher";
import PanelResizeHandle from "../../components/studio/PanelResizeHandle";
import Link from "next/link";
import { Clapperboard } from "lucide-react";

function StudioWorkspace() {
  const { theme } = useStudioTheme();
  const [avatarUrl, setAvatarUrl] = useState("/assets/char/XBot.fbx");
  const [animationUrl, setAnimationUrl] = useState("/assets/animation/Idle.fbx");
  const [customAnimClip, setCustomAnimClip] = useState<CapturedMocap | null>(null);
  const [syncTime, setSyncTime] = useState<number | undefined>(undefined);
  const syncRafRef = useRef<number | null>(null);
  const viewportRef = useRef<ViewportHandle>(null);

  const [leftW, setLeftW] = useState(400);
  const [rightW, setRightW] = useState(300);

  const viewportPointerRef = useRef<ViewportPointerState>({
    x: 0.5,
    y: 0.5,
    inside: false,
  });

  const onViewportPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    viewportPointerRef.current = {
      x: (e.clientX - r.left) / Math.max(r.width, 1),
      y: (e.clientY - r.top) / Math.max(r.height, 1),
      inside: true,
    };
  }, []);

  const onViewportPointerLeave = useCallback(() => {
    viewportPointerRef.current.inside = false;
  }, []);

  const handleDownloadGLB = (filename: string) => {
    viewportRef.current?.exportGLB(filename);
  };

  const handleGenerateMocap = (clip: CapturedMocap) => {
    setCustomAnimClip(clip);
    setSyncTime(0);
  };

  const handleViewportTimeUpdate = useCallback((t: number) => {
    if (syncRafRef.current !== null) return;
    syncRafRef.current = requestAnimationFrame(() => {
      setSyncTime(t);
      syncRafRef.current = null;
    });
  }, []);

  const resetClipOnAssetChange = useCallback(() => {
    setCustomAnimClip(null);
    setSyncTime(undefined);
  }, []);

  const onViewportDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw =
        e.dataTransfer.getData("application/camrig-asset") ||
        e.dataTransfer.getData("text/plain");
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as { kind?: string; url?: string };
        if (payload.kind === "character" && payload.url) {
          setAvatarUrl(payload.url);
          resetClipOnAssetChange();
        } else if (payload.kind === "animation" && payload.url) {
          setAnimationUrl(payload.url);
          resetClipOnAssetChange();
        }
      } catch {
        /* ignore malformed */
      }
    },
    [resetClipOnAssetChange],
  );

  const onViewportDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className="studio-surface-bg relative flex h-screen w-screen min-w-0 overflow-hidden antialiased transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
      >
        <div className="studio-noise-overlay h-full w-full" />
      </div>

      <LeftPanel
        panelWidth={leftW}
        onGenerateMocap={handleGenerateMocap}
        syncTime={syncTime}
        mocapReady={!!customAnimClip}
        avatarUrl={avatarUrl}
        animationUrl={animationUrl}
        onDownloadGLB={handleDownloadGLB}
      />

      <PanelResizeHandle
        side="left"
        value={leftW}
        min={300}
        max={560}
        onChange={setLeftW}
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--studio-border)] px-4 studio-glass">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--studio-muted)] transition-colors duration-300 hover:text-[var(--studio-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-accent)]"
            >
              <Clapperboard className="h-4 w-4 text-[var(--studio-accent)]" strokeWidth={1.75} />
              <span className="hidden sm:inline">CamRig</span>
            </Link>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--studio-muted)] md:inline">
              Neural studio
            </span>
          </div>
          <ThemeSwitcher />
        </header>

        <div
          className="relative min-h-0 flex-1"
          onPointerMove={onViewportPointerMove}
          onPointerLeave={onViewportPointerLeave}
        >
          <StudioViewportBackground
            theme={theme}
            className="z-0"
            pointerRef={viewportPointerRef}
          />

          <div
            className="pointer-events-none absolute inset-0 z-[5] shadow-[inset_0_0_120px_rgba(0,0,0,0.35)]"
            aria-hidden
          />

          <div
            className="absolute inset-0 z-10 min-h-0"
            onDragOver={onViewportDragOver}
            onDrop={onViewportDrop}
          >
            <Viewport
              ref={viewportRef}
              avatarUrl={avatarUrl}
              animationUrl={animationUrl}
              customAnimClip={customAnimClip}
              onTimeUpdate={handleViewportTimeUpdate}
              theme={theme}
            />
          </div>
        </div>
      </div>

      <PanelResizeHandle
        side="right"
        value={rightW}
        min={220}
        max={480}
        onChange={setRightW}
      />

      <RightPanel
        panelWidth={rightW}
        onSelectCharacter={(url) => {
          setAvatarUrl(url);
          resetClipOnAssetChange();
        }}
        onSelectAnimation={(url) => {
          setAnimationUrl(url);
          resetClipOnAssetChange();
        }}
      />
    </div>
  );
}

export default function EditorLayout() {
  return (
    <StudioThemeProvider>
      <StudioWorkspace />
    </StudioThemeProvider>
  );
}