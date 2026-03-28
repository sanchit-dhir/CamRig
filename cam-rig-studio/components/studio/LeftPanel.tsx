"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PoseEstimator } from "../../lib/poseDetector";
import { drawCyberPose, clearPoseCanvas } from "../../lib/drawUtils";
import type { Results } from "@mediapipe/pose";
import toast, { Toaster } from "react-hot-toast";
import { compileMocap } from "../../lib/mocapEngine";
import type { CapturedMocap } from "../../lib/mocapEngine";

interface LeftPanelProps {
  onGenerateMocap: (clip: CapturedMocap) => void;
  syncTime?: number;
  mocapReady?: boolean;
  avatarUrl: string;
  onDownloadGLB?: (filename: string) => void;
}

const FPS_OPTIONS = [15, 24, 30, 60] as const;
type FpsOption = (typeof FPS_OPTIONS)[number];

export default function LeftPanel({ onGenerateMocap, syncTime, mocapReady, avatarUrl, onDownloadGLB }: LeftPanelProps) {
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
  const [videoNativeFps, setVideoNativeFps] = useState<number>(30);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estimatorRef = useRef<PoseEstimator | null>(null);
  // processLoop control — we use a boolean ref instead of rAF ID
  // so we can stop the loop safely without needing to cancel anything async.
  const isLoopRunningRef = useRef(false);
  const recordedFramesRef = useRef<{ time: number; results: Results }[]>([]);
  const isCapturingRef = useRef(false);
  const isSyncingRef = useRef(false);
  // ── INIT AI ──────────────────────────────────────────────────────────────────
  // NOTE: empty dep-array [] so the estimator is created exactly ONCE,
  // not recreated every time isAiLoaded flips (which caused a gap with no estimator).
  useEffect(() => {
    toast.loading("INITIALIZING NEURAL NET...", { id: "ai-status" });
    let notifiedReady = false;

    estimatorRef.current = new PoseEstimator((results) => {
      if (!notifiedReady) {
        notifiedReady = true;
        setIsAiLoaded(true);
        toast.success("AI VISION ONLINE", { id: "ai-status" });
      }

      // Draw or clear overlay — drawCyberPose always clears first
      if (canvasRef.current && results) {
        drawCyberPose(canvasRef.current, results);
      }

      if (isCapturingRef.current) {
        if (videoRef.current) {
          recordedFramesRef.current.push({
            time: videoRef.current.currentTime,
            results: results
          });
          if (videoRef.current.duration > 0) {
            const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setCaptureProgress(Math.floor(pct));
          }
        }
      }
    });

    return () => {
      isLoopRunningRef.current = false;
      estimatorRef.current?.dispose();
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      toast.dismiss();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PROCESSING LOOP ───────────────────────────────────────────────────────────
  // Sequential loop: wait for each processFrame to FINISH before scheduling
  // the next one. This prevents the async queue from backing up, which was
  // the root cause of delays and stuck motion overlay lines.
  const startProcessLoop = useCallback(() => {
    if (isLoopRunningRef.current) return; // already running
    isLoopRunningRef.current = true;

    const tick = async () => {
      if (!isLoopRunningRef.current) return;

      const vid = videoRef.current;
      const est = estimatorRef.current;

      if (!vid || !est || vid.paused || vid.ended) {
        isLoopRunningRef.current = false;
        // Clear stale overlay when the video stops
        if (canvasRef.current) clearPoseCanvas(canvasRef.current);
        return;
      }

      await est.processFrame(vid); // isBusy guard inside processFrame handles overlap
      requestAnimationFrame(tick); // schedule AFTER the await, not before
    };

    requestAnimationFrame(tick);
  }, []);

  const stopProcessLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    if (canvasRef.current) clearPoseCanvas(canvasRef.current);
  }, []);

  // ── SYNC: External scrub ─────────────────────────────────────────────────────
  useEffect(() => {
    if (syncTime === undefined || !videoRef.current || !mocapReady || isPlaying) return;

    const delta = Math.abs(videoRef.current.currentTime - syncTime);
    if (delta < 0.03) return;

    isSyncingRef.current = true;
    videoRef.current.currentTime = syncTime;
    setCurrentTime(syncTime);

    const timer = setTimeout(() => { isSyncingRef.current = false; }, 50);
    return () => clearTimeout(timer);
  }, [syncTime, mocapReady, isPlaying]);

  // ── GENERATE: Auto-capture sequence ──────────────────────────────────────────
  const handleGenerate = async () => {
    if (!videoRef.current || !isAiLoaded) return;

    setCaptureState("capturing");
    isCapturingRef.current = true;
    recordedFramesRef.current = [];
    setCaptureProgress(0);
    toast.loading("PROCESSING VIDEO...", { id: "mocap-status" });

    const vid = videoRef.current;
    vid.pause();
    vid.currentTime = 0;
    // Play video at 1x so MediaPipe gets accurate frames; FPS controls how many we sample
    vid.playbackRate = 1.0;

    await new Promise<void>(res => {
      const onSeeked = () => { vid.removeEventListener("seeked", onSeeked); res(); };
      vid.addEventListener("seeked", onSeeked);
    });

    await vid.play();
    setIsPlaying(true);
    startProcessLoop();

    await new Promise<void>(res => {
      const onEnded = () => { vid.removeEventListener("ended", onEnded); res(); };
      vid.addEventListener("ended", onEnded);
    });

    stopProcessLoop();
    isCapturingRef.current = false;
    setIsPlaying(false);
    setCaptureProgress(100);

    toast.loading("COMPILING KINEMATICS...", { id: "mocap-status" });

    try {
      await new Promise(r => setTimeout(r, 100));

      const emaFactor = (smoothing / 100) * 0.92;
      const vidDur = videoRef.current.duration || 1;
      
      const clip = compileMocap(recordedFramesRef.current, vidDur, targetFps, emaFactor);

      toast.success(`MOCAP READY — ${clip.frames.length} FRAMES @ ${targetFps}fps`, { id: "mocap-status" });
      setCaptureState("done");
      setGeneratedClip(clip);
      onGenerateMocap(clip);
    } catch (e) {
      console.error("Compile error:", e);
      toast.error("COMPILE FAILED", { id: "mocap-status" });
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
    toast(`LOADED: ${file.name.slice(0, 20)}`, { icon: "📁" });
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
    const charName = avatarUrl.split("/").pop()?.replace(/\.[^.]+$/, "") || "Character";
    onDownloadGLB(`neural_motion_${charName}_${Date.now()}.glb`);
  };

  const canGenerate = !!videoSrc && isAiLoaded && captureState !== "capturing";

  return (
    <div className="relative flex flex-col h-full bg-[#050505] border-r border-cyan-900/50 p-6 w-[400px] text-cyan-400 font-mono text-sm z-10 shadow-2xl overflow-y-auto">
      <Toaster position="top-left" toastOptions={{
        style: { background: "#0a0a0a", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)", fontFamily: "monospace" }
      }} />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="border border-cyan-500/30 bg-black/80 rounded-lg text-center py-3 font-bold mb-6 tracking-widest text-cyan-300 relative overflow-hidden">
        <span className="relative z-10">MOCAP STUDIO //</span>
        {/* subtle scanline shimmer */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,255,255,0.03)_3px,rgba(0,255,255,0.03)_4px)] pointer-events-none" />
      </div>

      <input type="file" accept="video/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* ── VIDEO VIEWPORT ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between items-center text-xs text-cyan-700 tracking-widest mb-1 px-1">
          <span>SRC.VIDEO</span>
          <span className={captureState === "capturing" ? "text-red-400 animate-pulse" : isAiLoaded ? "text-cyan-400" : "text-yellow-600 animate-pulse"}>
            {captureState === "capturing" ? "[ CAPTURING ]" : isAiLoaded ? "[ READY ]" : "[ BOOTING ]"}
          </span>
        </div>

        <div className={`w-full h-56 bg-[#020202] border rounded-t-lg overflow-hidden relative flex items-center justify-center transition-all duration-300 ${
          captureState === "capturing"
            ? "border-red-500/60 shadow-[0_0_18px_rgba(255,50,50,0.3)]"
            : "border-cyan-900/80"
        }`}>
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
                    // Try to detect native FPS via the video element
                    // (not always reliable, falls back to 30)
                    setVideoNativeFps(30);
                  }
                }}
                className="absolute inset-0 w-full h-full object-contain"
                crossOrigin="anonymous"
                playsInline
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
              {/* capture overlay pulse */}
              {captureState === "capturing" && (
                <div className="absolute inset-0 border-4 border-red-500/50 rounded-t-lg animate-pulse pointer-events-none" />
              )}
            </>
          ) : (
            <div className="text-cyan-900/50 flex flex-col items-center gap-2">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs tracking-widest">AWAITING INPUT</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-[10px] tracking-wider border border-cyan-800/60 px-3 py-1 rounded hover:border-cyan-500 hover:text-cyan-300 transition-all"
              >
                + IMPORT FILE
              </button>
            </div>
          )}
        </div>

        {/* controls bar */}
        <div className="w-full bg-[#080808] border border-t-0 border-cyan-900/80 rounded-b-lg p-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] w-8 text-right text-cyan-600">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={(e) => {
                const t = parseFloat(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = t;
                setCurrentTime(t);
              }}
              disabled={!videoSrc || captureState === "capturing"}
              className="flex-1 h-1.5 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 outline-none"
            />
            <span className="text-[10px] w-8 text-cyan-600">{formatTime(duration)}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <button
              onClick={() => {
                if (!videoRef.current) return;
                if (isPlaying) {
                  videoRef.current.pause();
                  stopProcessLoop();
                } else {
                  videoRef.current.play();
                  startProcessLoop();
                }
                setIsPlaying(!isPlaying);
              }}
              disabled={!videoSrc || captureState === "capturing"}
              className="text-cyan-500 hover:text-cyan-300 disabled:opacity-30 transition-all p-2 bg-cyan-950/30 hover:bg-cyan-900/50 rounded-full hover:shadow-[0_0_10px_rgba(0,255,255,0.4)]"
            >
              {isPlaying
                ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={captureState === "capturing"}
              className="text-xs tracking-wider border border-cyan-800 px-4 py-1.5 rounded bg-black hover:bg-cyan-950 hover:border-cyan-500 transition-all disabled:opacity-30"
            >
              {videoSrc ? "REPLACE FILE" : "IMPORT FILE"}
            </button>
          </div>
        </div>
      </div>

      {/* ── FPS CONTROL ───────────────────────────────────────────────────────── */}
      <div className="mb-4 bg-[#080808] border border-cyan-900/40 p-4 rounded-lg">
        <div className="flex justify-between text-xs mb-3 text-cyan-600 tracking-widest">
          <span>CAPTURE_FPS</span>
          <span className="text-cyan-400 font-bold">{targetFps} FPS</span>
        </div>
        <div className="flex gap-2">
          {FPS_OPTIONS.map(fps => (
            <button
              key={fps}
              onClick={() => setTargetFps(fps)}
              disabled={captureState === "capturing"}
              className={`flex-1 py-1.5 rounded text-xs font-bold tracking-wider border transition-all disabled:opacity-30 ${
                targetFps === fps
                  ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                  : "bg-black border-cyan-900 text-cyan-700 hover:border-cyan-600 hover:text-cyan-400"
              }`}
            >
              {fps}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-cyan-800 mt-2 tracking-wider">
          VIDEO &amp; ANIMATION WILL PLAY IN SYNC AT {targetFps} FPS
        </p>
      </div>

      {/* ── SMOOTHING ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 bg-[#080808] border border-cyan-900/40 p-4 rounded-lg">
        <div className="flex justify-between text-xs mb-3 text-cyan-600 tracking-widest">
          <span>KF_SMOOTHING</span>
          <span className="text-cyan-400">{smoothing}%</span>
        </div>
        <input
          type="range"
          min="0" max="100"
          value={smoothing}
          onChange={e => setSmoothing(parseInt(e.target.value))}
          disabled={captureState === "capturing"}
          className="w-full h-1.5 bg-cyan-950 rounded-lg appearance-none cursor-crosshair accent-cyan-400 outline-none"
        />
        <div className="flex justify-between text-[9px] text-cyan-900 mt-1">
          <span>RESPONSIVE</span>
          <span>SMOOTH</span>
        </div>
      </div>

      {/* ── ACTIONS ───────────────────────────────────────────────────────────── */}
      <div className="mt-auto pt-4 border-t border-cyan-900/30">
        {captureState === "capturing" ? (
          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs text-cyan-400 mb-1 tracking-wider">
              <span className="animate-pulse">AUTO-CAPTURING...</span>
              <span>{captureProgress}%</span>
            </div>
            <div className="w-full h-10 bg-black border border-cyan-800 rounded-lg overflow-hidden relative">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-700 to-cyan-400 border-r-2 border-cyan-300 transition-all duration-150 shadow-[0_0_15px_rgba(0,255,255,0.6)]"
                style={{ width: `${captureProgress}%` }}
              />
              {/* animated scan line */}
              <div
                className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[scan_1.5s_ease-in-out_infinite]"
                style={{ left: `${captureProgress}%`, transform: "translateX(-50%)" }}
              />
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full border-2 rounded-lg py-3.5 font-bold tracking-widest transition-all ${
                !canGenerate
                  ? "border-cyan-950 text-cyan-900 bg-[#050505] cursor-not-allowed"
                  : captureState === "done"
                    ? "border-green-500 text-black bg-green-500 hover:bg-green-400 hover:shadow-[0_0_20px_rgba(74,222,128,0.5)]"
                    : "border-cyan-500 text-black bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]"
              }`}
            >
              {captureState === "done" ? "↺ REGENERATE MOTION" : "⚡ GENERATE MOTION"}
            </button>

            {captureState === "done" && (
              <div className="flex flex-col gap-2 mt-3">
                <button
                  onClick={handleDownloadGLB}
                  className="w-full border-2 border-green-500/80 text-green-400 font-bold tracking-widest rounded-lg py-3 hover:bg-green-900/30 hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  DOWNLOAD GLB (SKIN+ANIM)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}