"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { PoseEstimator } from "../../lib/poseDetector";
import { drawCyberPose, clearPoseCanvas } from "../../lib/drawUtils";
import type { Results } from "@mediapipe/pose";
import toast, { Toaster } from "react-hot-toast";
import { compileMocap } from "../../lib/mocapEngine";
import type { CapturedMocap } from "../../lib/mocapEngine";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Cpu,
  Download,
  Film,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { useStudioTheme } from "./StudioThemeContext";

interface LeftPanelProps {
  onGenerateMocap: (clip: CapturedMocap) => void;
  syncTime?: number;
  mocapReady?: boolean;
  avatarUrl: string;
  animationUrl: string;
  onDownloadGLB?: (filename: string) => void;
  panelWidth: number;
}

const FPS_OPTIONS = [15, 24, 30, 60] as const;
type FpsOption = (typeof FPS_OPTIONS)[number];

function Section({
  id,
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="studio-border-subtle mb-3 overflow-hidden rounded-xl studio-glass transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <button
        type="button"
        id={`${id}-btn`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-[background,transform] duration-300 hover:bg-[color-mix(in_oklab,var(--studio-accent)_8%,transparent)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--studio-accent)_14%,transparent)] text-[var(--studio-accent)]">
          {icon}
        </span>
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text)]">
          {title}
        </span>
        <span
          className={`text-[var(--studio-muted)] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-btn`}
        className={`grid overflow-hidden transition-[grid-template-rows] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="border-t border-[var(--studio-border)] px-3 pb-3 pt-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeftPanel({
  onGenerateMocap,
  syncTime,
  mocapReady,
  avatarUrl,
  animationUrl,
  onDownloadGLB,
  panelWidth,
}: LeftPanelProps) {
  const { theme } = useStudioTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [secVideo, setSecVideo] = useState(true);
  const [secPipeline, setSecPipeline] = useState(true);
  const [secExport, setSecExport] = useState(true);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isAiLoaded, setIsAiLoaded] = useState(false);
  const [smoothing, setSmoothing] = useState(50);
  const [targetFps, setTargetFps] = useState<FpsOption>(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captureState, setCaptureState] = useState<"idle" | "capturing" | "done">("idle");
  const [captureProgress, setCaptureProgress] = useState(0);
  const [generatedClip, setGeneratedClip] = useState<CapturedMocap | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estimatorRef = useRef<PoseEstimator | null>(null);
  const isLoopRunningRef = useRef(false);
  const recordedFramesRef = useRef<{ time: number; results: Results }[]>([]);
  const isCapturingRef = useRef(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    toast.loading("Initializing neural vision…", { id: "ai-status" });
    let notifiedReady = false;

    estimatorRef.current = new PoseEstimator((results) => {
      if (!notifiedReady) {
        notifiedReady = true;
        setIsAiLoaded(true);
        toast.success("Vision model online", { id: "ai-status" });
      }

      if (canvasRef.current && results) {
        drawCyberPose(canvasRef.current, results);
      }

      if (isCapturingRef.current && videoRef.current) {
        recordedFramesRef.current.push({
          time: videoRef.current.currentTime,
          results: results,
        });
        if (videoRef.current.duration > 0) {
          const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
          setCaptureProgress(Math.floor(pct));
        }
      }
    });

    return () => {
      isLoopRunningRef.current = false;
      estimatorRef.current?.dispose();
      toast.dismiss();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startProcessLoop = useCallback(() => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;

    const tick = async () => {
      if (!isLoopRunningRef.current) return;

      const vid = videoRef.current;
      const est = estimatorRef.current;

      if (!vid || !est || vid.paused || vid.ended) {
        isLoopRunningRef.current = false;
        if (canvasRef.current) clearPoseCanvas(canvasRef.current);
        return;
      }

      await est.processFrame(vid);
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []);

  const stopProcessLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    if (canvasRef.current) clearPoseCanvas(canvasRef.current);
  }, []);

  useEffect(() => {
    if (syncTime === undefined || !videoRef.current || !mocapReady || isPlaying) return;

    const delta = Math.abs(videoRef.current.currentTime - syncTime);
    if (delta < 0.03) return;

    isSyncingRef.current = true;
    videoRef.current.currentTime = syncTime;
    setCurrentTime(syncTime);

    const timer = setTimeout(() => {
      isSyncingRef.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [syncTime, mocapReady, isPlaying]);

  const handleGenerate = async () => {
    if (!videoRef.current || !isAiLoaded) return;

    setCaptureState("capturing");
    isCapturingRef.current = true;
    recordedFramesRef.current = [];
    setCaptureProgress(0);
    toast.loading("Processing video…", { id: "mocap-status" });

    const vid = videoRef.current;
    vid.pause();
    vid.currentTime = 0;
    vid.playbackRate = 1.0;

    await new Promise<void>((res) => {
      const onSeeked = () => {
        vid.removeEventListener("seeked", onSeeked);
        res();
      };
      vid.addEventListener("seeked", onSeeked);
    });

    await vid.play();
    setIsPlaying(true);
    startProcessLoop();

    await new Promise<void>((res) => {
      const onEnded = () => {
        vid.removeEventListener("ended", onEnded);
        res();
      };
      vid.addEventListener("ended", onEnded);
    });

    stopProcessLoop();
    isCapturingRef.current = false;
    setIsPlaying(false);
    setCaptureProgress(100);

    toast.loading("Compiling kinematics…", { id: "mocap-status" });

    try {
      await new Promise((r) => setTimeout(r, 100));

      const emaFactor = (smoothing / 100) * 0.92;
      const vidDur = videoRef.current.duration || 1;

      const clip = compileMocap(recordedFramesRef.current, vidDur, targetFps, emaFactor);

      toast.success(`Mocap ready — ${clip.frames.length} frames @ ${targetFps}fps`, {
        id: "mocap-status",
      });
      setCaptureState("done");
      setGeneratedClip(clip);
      onGenerateMocap(clip);
    } catch (e) {
      console.error("Compile error:", e);
      toast.error("Compile failed", { id: "mocap-status" });
      setCaptureState("idle");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);

    setVideoSrc(url);
    setCaptureState("idle");
    setCaptureProgress(0);
    recordedFramesRef.current = [];
    toast(`Loaded ${file.name.slice(0, 24)}`, { icon: "📁" });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSyncingRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownloadGLB = () => {
    if (!generatedClip || !onDownloadGLB) return;
    const charName =
      avatarUrl.split("/").pop()?.replace(/\.[^.]+$/, "") || "Character";
    onDownloadGLB(`neural_motion_${charName}_${Date.now()}.glb`);
  };

  const charFileName = avatarUrl.split("/").pop() || "character.fbx";
  const charDisplayName = charFileName.replace(/\.fbx$/i, "");

  const handleDownloadCharacter = async () => {
    toast.loading("Downloading character…", { id: "dl-char" });
    try {
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = /\.fbx$/i.test(charFileName) ? charFileName : `${charDisplayName}.fbx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Character FBX saved", { id: "dl-char" });
    } catch (e) {
      console.error(e);
      toast.error("Character download failed", { id: "dl-char" });
    }
  };

  const animFileName = animationUrl.split("/").pop() || "animation.fbx";
  const animDisplayName = animFileName.replace(/\.fbx$/i, "");

  const handleDownloadAnimation = async () => {
    toast.loading("Downloading animation…", { id: "dl-anim" });
    try {
      const response = await fetch(animationUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = /\.fbx$/i.test(animFileName) ? animFileName : `${animDisplayName}.fbx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Animation FBX saved", { id: "dl-anim" });
    } catch (e) {
      console.error(e);
      toast.error("Animation download failed", { id: "dl-anim" });
    }
  };

  const canGenerate = !!videoSrc && isAiLoaded && captureState !== "capturing";

  const widthPx = collapsed ? 56 : panelWidth;

  return (
    <aside
      className={`relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--studio-border)] shadow-[var(--studio-shadow-elev)] studio-glass transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        theme === "creative" ? "shadow-[0_0_40px_rgba(139,92,246,0.06)]" : ""
      }`}
      style={{ width: widthPx }}
    >
      <div className="studio-noise-overlay pointer-events-none opacity-80" />
      <Toaster
        position="top-left"
        toastOptions={{
          duration: 3200,
          style: {
            background: "rgba(15, 23, 42, 0.96)",
            color: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            fontSize: "12px",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
          },
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col p-3 pr-2">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label={collapsed ? "Expand tools" : "Collapse tools"}
            data-studio-tip={collapsed ? "Expand" : "Collapse"}
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--studio-border)] bg-[color-mix(in_oklab,var(--studio-surface)_40%,transparent)] text-[var(--studio-accent)] transition-all duration-300 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-glow-soft)]"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1 rounded-xl border border-[var(--studio-border)] px-3 py-2 studio-glass">
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-[var(--studio-highlight)]" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-text)]">
                    CamRig · Motion
                  </div>
                  <div className="truncate text-[10px] text-[var(--studio-muted)]">
                    AI capture lab
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center gap-3 pt-2">
            <button
              type="button"
              data-studio-tip="Vision source"
              onClick={() => setCollapsed(false)}
              className="rounded-xl border border-[var(--studio-border)] p-2 text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
            >
              <Film className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-studio-tip="Pipeline"
              onClick={() => setCollapsed(false)}
              className="rounded-xl border border-[var(--studio-border)] p-2 text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-studio-tip="Generate"
              onClick={() => setCollapsed(false)}
              className="rounded-xl border border-[var(--studio-border)] p-2 text-[var(--studio-accent)] hover:shadow-[var(--studio-glow-soft)]"
            >
              <Zap className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="studio-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <Section
                id="sec-video"
                title="Vision source"
                icon={<Film className="h-3.5 w-3.5" />}
                open={secVideo}
                onToggle={() => setSecVideo((v) => !v)}
              >
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--studio-muted)]">
                  <span>Neural stream</span>
                  <span
                    className={
                      captureState === "capturing"
                        ? "text-red-400"
                        : isAiLoaded
                          ? "text-[var(--studio-highlight)]"
                          : "text-amber-400"
                    }
                  >
                    {captureState === "capturing"
                      ? "Capturing"
                      : isAiLoaded
                        ? "Ready"
                        : "Booting"}
                  </span>
                </div>

                <div
                  className={`relative mb-2 overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-300 ${
                    captureState === "capturing"
                      ? "border-red-400/50 shadow-[0_0_24px_rgba(248,113,113,0.2)]"
                      : "border-[var(--studio-border)]"
                  }`}
                >
                  <div className="relative flex aspect-video w-full items-center justify-center bg-black/40">
                    {videoSrc ? (
                      <>
                        <video
                          ref={videoRef}
                          src={videoSrc}
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={() => {
                            if (videoRef.current && canvasRef.current) {
                              setDuration(videoRef.current.duration);
                              canvasRef.current.width = videoRef.current.videoWidth;
                              canvasRef.current.height = videoRef.current.videoHeight;
                            }
                          }}
                          className="absolute inset-0 h-full w-full object-contain"
                          crossOrigin="anonymous"
                          playsInline
                        />
                        <canvas
                          ref={canvasRef}
                          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                        />
                        {captureState === "capturing" && (
                          <div className="pointer-events-none absolute inset-0 ring-2 ring-red-400/40" />
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4 text-center text-[var(--studio-muted)]">
                        <Cpu className="h-8 w-8 opacity-60" />
                        <span className="text-[10px] uppercase tracking-[0.14em]">
                          Drop or import reference video
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg border border-[var(--studio-border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-text)] transition-all duration-300 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-glow-soft)]"
                        >
                          Import
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="studio-border-subtle rounded-xl px-2 py-2">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="w-8 text-right text-[10px] text-[var(--studio-muted)]">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.01}
                      value={currentTime}
                      onChange={(e) => {
                        const t = parseFloat(e.target.value);
                        if (videoRef.current) videoRef.current.currentTime = t;
                        setCurrentTime(t);
                      }}
                      disabled={!videoSrc || captureState === "capturing"}
                      className="studio-range flex-1"
                    />
                    <span className="w-8 text-[10px] text-[var(--studio-muted)]">
                      {formatTime(duration)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      data-studio-tip="Play / pause"
                      onClick={() => {
                        if (!videoRef.current) return;
                        if (isPlaying) {
                          videoRef.current.pause();
                          stopProcessLoop();
                        } else {
                          void videoRef.current.play();
                          startProcessLoop();
                        }
                        setIsPlaying(!isPlaying);
                      }}
                      disabled={!videoSrc || captureState === "capturing"}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--studio-border)] text-[var(--studio-accent)] transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[var(--studio-glow-soft)] disabled:opacity-40"
                    >
                      {isPlaying ? (
                        <span className="text-lg leading-none">❚❚</span>
                      ) : (
                        <span className="ml-0.5 text-lg leading-none">▶</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={captureState === "capturing"}
                      className="rounded-xl border border-[var(--studio-border)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--studio-text)] transition-all duration-300 hover:border-[var(--studio-border-strong)] disabled:opacity-40"
                    >
                      {videoSrc ? "Replace" : "Import"}
                    </button>
                  </div>
                </div>
              </Section>

              <Section
                id="sec-pipeline"
                title="Capture pipeline"
                icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                open={secPipeline}
                onToggle={() => setSecPipeline((v) => !v)}
              >
                <div className="mb-3">
                  <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--studio-muted)]">
                    <span>Capture FPS</span>
                    <span className="font-semibold text-[var(--studio-highlight)]">{targetFps}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {FPS_OPTIONS.map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        onClick={() => setTargetFps(fps)}
                        disabled={captureState === "capturing"}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-all duration-300 disabled:opacity-40 ${
                          targetFps === fps
                            ? "bg-[color-mix(in_oklab,var(--studio-accent)_85%,white)] text-white shadow-[var(--studio-glow-soft)]"
                            : "border border-[var(--studio-border)] text-[var(--studio-muted)] hover:border-[var(--studio-border-strong)] hover:text-[var(--studio-text)]"
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[9px] text-[color-mix(in_oklab,var(--studio-muted)_75%,transparent)]">
                    Timeline sync follows this sample rate.
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--studio-muted)]">
                    <span>Keyframe smoothing</span>
                    <span className="text-[var(--studio-highlight)]">{smoothing}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={smoothing}
                    onChange={(e) => setSmoothing(parseInt(e.target.value, 10))}
                    disabled={captureState === "capturing"}
                    className="studio-range w-full"
                  />
                  <div className="mt-1 flex justify-between text-[9px] text-[var(--studio-muted)]">
                    <span>Responsive</span>
                    <span>Velvety</span>
                  </div>
                </div>
              </Section>

              <Section
                id="sec-export"
                title="Export"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                open={secExport}
                onToggle={() => setSecExport((v) => !v)}
              >
                {captureState === "capturing" ? (
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] text-[var(--studio-text)]">
                      <span className="animate-pulse">Auto capturing…</span>
                      <span>{captureProgress}%</span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full border border-[var(--studio-border)] bg-black/30">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[var(--studio-accent)] to-[var(--studio-highlight)] transition-[width] duration-150"
                        style={{ width: `${captureProgress}%` }}
                      />
                      <div
                        className="studio-scan-shimmer pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        style={{ left: `${captureProgress}%`, transform: "translateX(-50%)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      data-studio-tip="Bake motion to rig"
                      className={`relative w-full overflow-hidden rounded-xl py-3 text-[11px] font-bold uppercase tracking-[0.18em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        !canGenerate
                          ? "cursor-not-allowed border border-[var(--studio-border)] text-[var(--studio-muted)] opacity-50"
                          : captureState === "done"
                            ? "border border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(52,211,153,0.25)]"
                            : "border border-[var(--studio-border-strong)] bg-[color-mix(in_oklab,var(--studio-accent)_20%,transparent)] text-[var(--studio-text)] hover:-translate-y-0.5 hover:shadow-[var(--studio-glow-soft)]"
                      }`}
                    >
                      <span className="relative z-10">
                        {captureState === "done" ? "Regenerate motion" : "Generate motion"}
                      </span>
                    </button>
                    {captureState === "done" && (
                      <button
                        type="button"
                        onClick={handleDownloadGLB}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200 transition-all duration-300 hover:bg-emerald-500/10 hover:shadow-[0_0_24px_rgba(52,211,153,0.2)]"
                      >
                        Download GLB
                      </button>
                    )}
                  </>
                )}
              </Section>
            </div>

            <div className="studio-border-subtle mt-2 space-y-3 rounded-xl p-3 studio-glass">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5 text-[var(--studio-accent)]" strokeWidth={2} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-muted)]">
                    Character
                  </span>
                </div>
                <p
                  className="mb-2 truncate text-[12px] font-medium text-[var(--studio-text)]"
                  title={charDisplayName}
                >
                  {charDisplayName}
                </p>
                <button
                  type="button"
                  onClick={handleDownloadCharacter}
                  data-studio-tip="FBX rig"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--studio-border-strong)] bg-[color-mix(in_oklab,var(--studio-accent)_14%,transparent)] py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--studio-text)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[var(--studio-glow-soft)]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Download rig FBX
                </button>
              </div>

              <div className="border-t border-[var(--studio-border)] pt-3">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-[var(--studio-highlight)]" strokeWidth={2} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-muted)]">
                    Animation
                  </span>
                </div>
                <p
                  className="mb-2 truncate text-[12px] font-medium text-[var(--studio-text)]"
                  title={animDisplayName}
                >
                  {animDisplayName}
                </p>
                <button
                  type="button"
                  onClick={handleDownloadAnimation}
                  data-studio-tip="FBX clip"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--studio-border)] bg-[color-mix(in_oklab,var(--studio-highlight)_10%,transparent)] py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--studio-text)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-glow-soft)]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Download anim FBX
                </button>
              </div>
            </div>

            <div className="mt-2 flex gap-1 border-t border-[var(--studio-border)] pt-2">
              {[
                { icon: <Film className="h-3.5 w-3.5" />, label: "Source", on: () => setSecVideo(true) },
                { icon: <SlidersHorizontal className="h-3.5 w-3.5" />, label: "Pipeline", on: () => setSecPipeline(true) },
                { icon: <Zap className="h-3.5 w-3.5" />, label: "Export", on: () => setSecExport(true) },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  data-studio-tip={q.label}
                  onClick={q.on}
                  className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--studio-muted)] transition-all duration-300 hover:bg-[color-mix(in_oklab,var(--studio-accent)_10%,transparent)] hover:text-[var(--studio-text)]"
                >
                  {q.icon}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}