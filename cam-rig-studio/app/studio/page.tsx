// app/studio/page.tsx
"use client";
import { useState, useCallback, useRef } from "react";
import type { CapturedMocap } from "../../lib/mocapEngine";
import Viewport, { ViewportHandle } from "../../components/studio/Viewport";
import RightPanel from "../../components/studio/RightPanel";
import LeftPanel from "../../components/studio/LeftPanel";

export default function EditorLayout() {
  const [avatarUrl, setAvatarUrl]           = useState("/assets/char/XBot.fbx");
  const [animationUrl, setAnimationUrl]     = useState("/assets/animation/Idle.fbx");
  const [customAnimClip, setCustomAnimClip] = useState<CapturedMocap | null>(null);

  // Shared playback time: Viewport → LeftPanel (video sync)
  const [syncTime, setSyncTime] = useState<number | undefined>(undefined);
  const syncRafRef = useRef<number | null>(null);

  const viewportRef = useRef<ViewportHandle>(null);

  const handleDownloadGLB = (filename: string) => {
    viewportRef.current?.exportGLB(filename);
  };

  const handleGenerateMocap = (clip: CapturedMocap) => {
    setCustomAnimClip(clip);
    setSyncTime(0);
  };

  // Throttle sync updates to not fire on every single animation frame
  const handleViewportTimeUpdate = useCallback((t: number) => {
    if (syncRafRef.current !== null) return;
    syncRafRef.current = requestAnimationFrame(() => {
      setSyncTime(t);
      syncRafRef.current = null;
    });
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-black">
      {/* Controls + Video */}
      <LeftPanel
        onGenerateMocap={handleGenerateMocap}
        syncTime={syncTime}
        mocapReady={!!customAnimClip}
        avatarUrl={avatarUrl}
        onDownloadGLB={handleDownloadGLB}
      />

      {/* 3D Viewport */}
      <div className="flex-1 relative z-0">
        <Viewport
          ref={viewportRef}
          avatarUrl={avatarUrl}
          animationUrl={animationUrl}
          customAnimClip={customAnimClip}
          onTimeUpdate={handleViewportTimeUpdate}
        />
      </div>

      {/* Asset Library */}
      <RightPanel
        onSelectCharacter={(url) => { setAvatarUrl(url); setCustomAnimClip(null); setSyncTime(undefined); }}
        onSelectAnimation={(url) => { setAnimationUrl(url); setCustomAnimClip(null); setSyncTime(undefined); }}
      />
    </div>
  );
}