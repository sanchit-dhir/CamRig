// This Compenent is responsible for rendering the 3D viewport using Three.js. It sets up the scene, camera, and renderer, and handles user interactions such as mouse movements and clicks to manipulate the camera and objects in the scene. The component also manages the animation loop and Character rendering and animation to continuously render the scene and update any animations or interactions.
"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three-stdlib";
import { loadAvatar } from "../../lib/avatarLoader";
import type { CapturedMocap, PoseFrame } from "../../lib/mocapEngine";
import type { StudioThemeId } from "./StudioThemeContext";

export interface ViewportHandle {
  exportGLB: (filename: string) => Promise<void>;
}

interface ViewportProps {
  avatarUrl: string;
  animationUrl: string;
  customAnimClip?: CapturedMocap | null;
  onTimeUpdate?: (time: number) => void;
  theme?: StudioThemeId;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

const Viewport = forwardRef<ViewportHandle, ViewportProps>(({
  avatarUrl,
  animationUrl,
  customAnimClip,
  onTimeUpdate,
  theme: _theme = "dark-ai",
}, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  const hipsRestYRef = useRef<number>(1.0);
  const restQuatsRef = useRef<Record<string, THREE.Quaternion>>({});

  const mocapRef = useRef<CapturedMocap | null>(null);
  const mocapIndexRef = useRef(0);
  const mocapTimerRef = useRef(0);
  const isMocapRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [loop, setLoop] = useState(true);
  const [rendererFps, setRendererFps] = useState(0);

  const progressRef = useRef<HTMLInputElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const isPlayingRef = useRef(true);
  const speedRef = useRef<number>(1);
  const loopRef = useRef(true);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  // ── 1. ENGINE ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const d1 = new THREE.DirectionalLight(0x00ffff, 1); d1.position.set(5, 5, 5); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xff00ff, 0.8); d2.position.set(-5, 3, -5); scene.add(d2);
    scene.add(new THREE.GridHelper(20, 20, 0x00ffff, 0x002244));

    const clock = new THREE.Clock();
    let frameId: number;
    let fpsFrames = 0, prevFpsTime = performance.now();
    let fpsUpdateTimer = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const rawDelta = clock.getDelta();
      // Apply playback speed multiplier
      const delta = rawDelta * speedRef.current;

      if (isMocapRef.current && mocapRef.current && modelRef.current) {
        if (isPlayingRef.current) {
          const { fps } = mocapRef.current;
          const frameDur = 1 / fps;
          // Clamp delta to avoid huge jumps after tab-switching or background tabs
          const clampedDelta = Math.min(delta, frameDur * 4);
          mocapTimerRef.current += clampedDelta;
          // Drain accumulated time — advances multiple frames if needed (fixes stutter at high speed)
          while (mocapTimerRef.current >= frameDur) {
            mocapTimerRef.current -= frameDur;
            mocapIndexRef.current++;
            if (mocapIndexRef.current >= mocapRef.current.frames.length) {
              mocapIndexRef.current = loopRef.current ? 0 : mocapRef.current.frames.length - 1;
              if (!loopRef.current) { mocapTimerRef.current = 0; break; }
            }
          }
        }
        const idx = mocapIndexRef.current;
        const frame = mocapRef.current.frames[idx];
        if (frame) applyPoseFrame(frame, modelRef.current);
        const t = idx / (mocapRef.current.fps ?? 30);
        if (progressRef.current) progressRef.current.value = t.toString();
        if (timeDisplayRef.current) timeDisplayRef.current.innerText = t.toFixed(2);
        onTimeUpdate?.(t);
      }

      if (!isMocapRef.current && mixerRef.current) {
        mixerRef.current.update(delta);
        if (actionRef.current && isPlayingRef.current) {
          const t = actionRef.current.time;
          if (progressRef.current) progressRef.current.value = t.toString();
          if (timeDisplayRef.current) timeDisplayRef.current.innerText = t.toFixed(2);
        }
      }

      fpsFrames++;
      const nowPerf = performance.now();
      fpsUpdateTimer += rawDelta;
      if (fpsUpdateTimer >= 1) {
        const fps = Math.round(fpsFrames * 1000 / (nowPerf - prevFpsTime));
        setRendererFps(fps);
        fpsFrames = 0;
        prevFpsTime = nowPerf;
        fpsUpdateTimer = 0;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── 2. APPLY POSE FRAME ──────────────────────────────────────────────────────
  function applyPoseFrame(pose: PoseFrame, model: THREE.Object3D) {
    const LERP = 1.0;
    const lerp = THREE.MathUtils.lerp;

    const applyRot = (
      boneName: string,
      rot: any,
      mx = 1, my = 1, mz = 1,
      minX?: number, maxX?: number,
      minY?: number, maxY?: number,
      minZ?: number, maxZ?: number
    ) => {
      if (!rot) return;
      const bone = model.getObjectByName(boneName) as THREE.Bone | undefined;
      if (!bone) return;

      const rest = restQuatsRef.current[boneName];
      const clampVal = THREE.MathUtils.clamp;

      if (rot.dx !== undefined) {
        const worldTargetDir = new THREE.Vector3(rot.dx, rot.dy, rot.dz).normalize();
        const parentWorldQuat = new THREE.Quaternion();
        bone.parent?.getWorldQuaternion(parentWorldQuat);
        const localTargetDir = worldTargetDir.clone().applyQuaternion(parentWorldQuat.invert());

        let localDir = new THREE.Vector3(0, 1, 0);
        const childBone = bone.children.find(c => c.type === "Bone" || (c as any).isBone);
        if (childBone && childBone.position.lengthSq() > 0.0001) {
          localDir = childBone.position.clone().normalize();
        }

        const currentRest = rest || new THREE.Quaternion();
        const restDir = localDir.clone().applyQuaternion(currentRest);

        const offsetQuat = new THREE.Quaternion().setFromUnitVectors(restDir, localTargetDir);

        let localForward = new THREE.Vector3(0, 0, 1);
        if (Math.abs(localDir.z) > 0.9) localForward = new THREE.Vector3(1, 0, 0);

        const restForward = localForward.clone().applyQuaternion(currentRest);
        const currentForward = restForward.clone().applyQuaternion(offsetQuat);
        const desiredForward = restForward.clone().projectOnPlane(localTargetDir).normalize();

        let twistQuat = new THREE.Quaternion();
        if (desiredForward.lengthSq() > 0.0001 && currentForward.lengthSq() > 0.0001) {
          twistQuat.setFromUnitVectors(currentForward.normalize(), desiredForward);
        }

        const finalOffsetQuat = twistQuat.multiply(offsetQuat);
        const targetQuat = finalOffsetQuat.multiply(currentRest);

        // Apply Euler-based clamping if constraints exist
        if (minX !== undefined || minY !== undefined || minZ !== undefined) {
          const e = new THREE.Euler().setFromQuaternion(targetQuat, "YXZ");
          if (minX !== undefined) e.x = clampVal(e.x, minX, maxX ?? Infinity);
          if (minY !== undefined) e.y = clampVal(e.y, minY, maxY ?? Infinity);
          if (minZ !== undefined) e.z = clampVal(e.z, minZ, maxZ ?? Infinity);
          targetQuat.setFromEuler(e);
        }

        if (!isNaN(targetQuat.x) && !isNaN(targetQuat.y)) {
          bone.quaternion.slerp(targetQuat, LERP);
        }
        return;
      }

      let tx = rot.x * mx;
      let ty = rot.y * my;
      let tz = rot.z * mz;

      // Apply clamps
      if (minX !== undefined) tx = clampVal(tx, minX, maxX ?? Infinity);
      if (minY !== undefined) ty = clampVal(ty, minY, maxY ?? Infinity);
      if (minZ !== undefined) tz = clampVal(tz, minZ, maxZ ?? Infinity);

      const targetEuler = new THREE.Euler(tx, ty, tz, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      if (rest) {
        const finalQuat = targetQuat.clone().multiply(rest);
        bone.quaternion.slerp(finalQuat, LERP);
      } else {
        bone.quaternion.slerp(targetQuat, LERP);
      }
    };

    applyRot("mixamorigHips", pose.Hips, 1, 1, 1);

    if (pose.Hips?.px !== undefined && pose.Hips?.py !== undefined) {
      const hipsBone = model.getObjectByName("mixamorigHips") as THREE.Bone | undefined;
      if (hipsBone) {
        const targetX = (pose.Hips.px - 0.5) * 2.0;
        let targetY = hipsRestYRef.current + (0.5 - pose.Hips.py) * 1.0;
        targetY = Math.max(hipsRestYRef.current * 0.5, Math.min(targetY, hipsRestYRef.current * 1.5));
        hipsBone.position.x = lerp(hipsBone.position.x, targetX, LERP * 0.5);
        hipsBone.position.y = lerp(hipsBone.position.y, targetY, LERP * 0.5);
      }
    }

    // Bones reduced influence for more natural motion

    applyRot("mixamorigSpine", pose.Spine, 0.4, 0.4, 0.4, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5);
    applyRot("mixamorigSpine1", pose.Spine, 0.25, 0.25, 0.25, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5);
    applyRot("mixamorigNeck", pose.Neck, 0.7, 0.7, 0.7);
    applyRot("mixamorigHead", pose.Head, 0.9, 0.9, 0.9);

    // Shoulder X: -1.5 to 1.5
    applyRot("mixamorigLeftArm", pose.LeftUpperArm, 1, 1, 1, -1.5, 1.5);
    // Elbow: -1.5 to 0 (X axis usually for Mixamo forearm hinge)
    applyRot("mixamorigLeftForeArm", pose.LeftLowerArm, 1, 1, 1, -1.5, 0);

    applyRot("mixamorigRightArm", pose.RightUpperArm, 1, 1, 1, -1.5, 1.5);
    applyRot("mixamorigRightForeArm", pose.RightLowerArm, 1, 1, 1, -1.5, 0);

    applyRot("mixamorigLeftUpLeg", pose.LeftUpperLeg, 1, 1, 1);
    // Knee: -1.5 to 0
    applyRot("mixamorigLeftLeg", pose.LeftLowerLeg, 1, 1, 1, -1.5, 0);

    applyRot("mixamorigRightUpLeg", pose.RightUpperLeg, 1, 1, 1);
    applyRot("mixamorigRightLeg", pose.RightLowerLeg, 1, 1, 1, -1.5, 0);

  }

  // ── 3. LOAD AVATAR & ANIMATION ─────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    
    let ignore = false;

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      mixerRef.current?.stopAllAction();
      modelRef.current = null;
      mixerRef.current = null;
      actionRef.current = null;
    }

    loadAvatar(avatarUrl, animationUrl)
      .then(({ model, mixer, action }) => {
        if (ignore) return;

        sceneRef.current?.add(model);
        modelRef.current = model;
        mixerRef.current = mixer;

        mixer.stopAllAction();
        mixer.update(0);

        const hipsBone = model.getObjectByName("mixamorigHips") as THREE.Bone | undefined;
        if (hipsBone) hipsRestYRef.current = hipsBone.position.y;

        const quats: Record<string, THREE.Quaternion> = {};
        model.traverse(obj => {
          if (obj instanceof THREE.Bone) {
            quats[obj.name] = obj.quaternion.clone();
          }
        });
        restQuatsRef.current = quats;

        if (customAnimClip && customAnimClip.frames.length > 0) {
          action?.stop();
          isMocapRef.current = true;
          mocapRef.current = customAnimClip;
          mocapIndexRef.current = 0;
          mocapTimerRef.current = 0;
          setDuration((customAnimClip.frames.length - 1) / customAnimClip.fps);
          setIsPlaying(true);
        } else {
          isMocapRef.current = false;
          if (action) {
            actionRef.current = action;
            action.play();
            setDuration(action.getClip().duration);
            setIsPlaying(true);
          }
        }
      })
      .catch(err => {
        if (!ignore) console.error("Asset load failed:", err);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarUrl, animationUrl, customAnimClip]);

  // ── 4. PLAYBACK CONTROLS ─────────────────────────────────────────────────────
  const togglePlay = () => {
    if (isMocapRef.current) {
      setIsPlaying(p => !p);
    } else if (actionRef.current) {
      actionRef.current.paused = isPlaying;
      setIsPlaying(p => !p);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (isMocapRef.current && mocapRef.current) {
      mocapIndexRef.current = Math.min(
        Math.floor(t * mocapRef.current.fps),
        mocapRef.current.frames.length - 1,
      );
      mocapTimerRef.current = 0;
      if (timeDisplayRef.current) timeDisplayRef.current.innerText = t.toFixed(2);
    } else if (actionRef.current && mixerRef.current) {
      actionRef.current.time = t;
      mixerRef.current.update(0);
      if (timeDisplayRef.current) timeDisplayRef.current.innerText = t.toFixed(2);
    }
  };

  const stepFrame = (dir: 1 | -1) => {
    if (isPlaying) { setIsPlaying(false); isPlayingRef.current = false; }

    if (isMocapRef.current && mocapRef.current) {
      let idx = mocapIndexRef.current + dir;
      if (idx < 0) idx = mocapRef.current.frames.length - 1;
      if (idx >= mocapRef.current.frames.length) idx = 0;
      mocapIndexRef.current = idx;
      if (modelRef.current) applyPoseFrame(mocapRef.current.frames[idx], modelRef.current);
      const t = idx / mocapRef.current.fps;
      if (progressRef.current) progressRef.current.value = t.toString();
      if (timeDisplayRef.current) timeDisplayRef.current.innerText = t.toFixed(2);
    } else if (actionRef.current && mixerRef.current) {
      let newTime = actionRef.current.time + dir / 30;
      if (newTime < 0) newTime = duration;
      if (newTime > duration) newTime = 0;
      actionRef.current.time = newTime;
      mixerRef.current.update(0);
      if (progressRef.current) progressRef.current.value = newTime.toString();
      if (timeDisplayRef.current) timeDisplayRef.current.innerText = newTime.toFixed(2);
    }
  };

  // FPS colour indicator
  const fpsColor =
    rendererFps >= 50
      ? "text-emerald-400"
      : rendererFps >= 30
        ? "text-amber-300"
        : "text-rose-400";
  const mocapFps = mocapRef.current?.fps ?? null;

  // ── 5. EXPORT GLB ──────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    exportGLB: async (filename: string) => {
      if (!modelRef.current) return;

      let exportClip: THREE.AnimationClip | undefined;

      if (isMocapRef.current && mocapRef.current) {
        // We have generated mocap. Let's bake it into an AnimationClip
        const clipData = mocapRef.current;
        const fps = clipData.fps ?? 30;
        const times = clipData.frames.map((_, i) => i / fps);
        const floatTimes = new Float32Array(times);

        // Save current pose
        const savedPoses = new Map<THREE.Bone, { pos: THREE.Vector3, quat: THREE.Quaternion }>();
        modelRef.current.traverse(obj => {
          if (obj instanceof THREE.Bone) {
            savedPoses.set(obj, { pos: obj.position.clone(), quat: obj.quaternion.clone() });
          }
        });

        const boneTracks = new Map<THREE.Bone, { pos: Float32Array, quat: Float32Array }>();
        const bonesToTrack: THREE.Bone[] = [];
        modelRef.current.traverse(obj => {
          if (obj instanceof THREE.Bone) {
             bonesToTrack.push(obj);
             boneTracks.set(obj, { 
               pos: new Float32Array(times.length * 3), 
               quat: new Float32Array(times.length * 4) 
             });
          }
        });

        for (let i = 0; i < clipData.frames.length; i++) {
           applyPoseFrame(clipData.frames[i], modelRef.current);
           for (const bone of bonesToTrack) {
              const tr = boneTracks.get(bone)!;
              tr.pos[i*3 + 0] = bone.position.x;
              tr.pos[i*3 + 1] = bone.position.y;
              tr.pos[i*3 + 2] = bone.position.z;
              tr.quat[i*4 + 0] = bone.quaternion.x;
              tr.quat[i*4 + 1] = bone.quaternion.y;
              tr.quat[i*4 + 2] = bone.quaternion.z;
              tr.quat[i*4 + 3] = bone.quaternion.w;
           }
        }

        // Restore original pose
        for (const [bone, st] of savedPoses) {
          bone.position.copy(st.pos);
          bone.quaternion.copy(st.quat);
        }

        // Build KeyframeTracks
        const tracks: THREE.KeyframeTrack[] = [];
        for (const bone of bonesToTrack) {
           if (!bone.name) continue;
           const tr = boneTracks.get(bone)!;
           tracks.push(new THREE.VectorKeyframeTrack(bone.name + '.position', floatTimes, tr.pos));
           tracks.push(new THREE.QuaternionKeyframeTrack(bone.name + '.quaternion', floatTimes, tr.quat));
        }

        exportClip = new THREE.AnimationClip("CapturedMotion", clipData.frames.length / fps, tracks);
      } else if (actionRef.current) {
        exportClip = actionRef.current.getClip();
      }

      const exporter = new GLTFExporter();
      const options = {
        binary: true,
        animations: exportClip ? [exportClip] : [],
      };

      try {
        const glb = await new Promise<ArrayBuffer | { [key: string]: any }>((resolve, reject) => {
          exporter.parse(modelRef.current!, resolve, reject, options);
        });

        const blobData = glb instanceof ArrayBuffer ? glb : JSON.stringify(glb);
        const blob = new Blob([blobData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("GLB Export failed", err);
      }
    }
  }));

  // ── 6. RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full select-none bg-transparent font-sans text-[var(--studio-text)]">
      <div className="h-full w-full outline-none" ref={mountRef} />

      {/* ── HUD ─────────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-4 top-4 min-w-[168px] rounded-xl border border-[var(--studio-border)] p-3 text-[11px] shadow-[var(--studio-shadow-elev)] studio-glass">
        <div className="mb-2 border-b border-[var(--studio-border)] pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--studio-muted)]">
          Viewport telemetry
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--studio-muted)]">Render</span>
            <span className={`font-bold tabular-nums ${fpsColor}`}>
              {rendererFps > 0 ? rendererFps : "—"} FPS
            </span>
          </div>
          {isMocapRef.current && mocapFps !== null && (
            <div className="flex justify-between gap-4">
              <span className="text-[var(--studio-muted)]">Mocap</span>
              <span className="font-bold tabular-nums text-[var(--studio-highlight)]">{mocapFps} FPS</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-[var(--studio-muted)]">Speed</span>
            <span className="font-bold text-[color-mix(in_oklab,var(--studio-accent)_75%,white)]">{speed}×</span>
          </div>
          <div className="mt-1 flex justify-between gap-4 border-t border-[var(--studio-border)] pt-1">
            <span className="text-[var(--studio-muted)]">Rig</span>
            <span className="max-w-[92px] truncate text-[var(--studio-accent)]">{avatarUrl.split("/").pop()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--studio-muted)]">Mode</span>
            <span className={isMocapRef.current ? "animate-pulse text-[var(--studio-highlight)]" : "text-[var(--studio-muted)]"}>
              {isMocapRef.current ? "Neural" : "Clip"}
            </span>
          </div>
        </div>
      </div>

      {/* ── PLAYER CONTROLS ──────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 flex w-11/12 max-w-3xl -translate-x-1/2 flex-col gap-3 rounded-2xl border border-[var(--studio-border)] p-4 shadow-[var(--studio-shadow-elev)] studio-glass transition-[box-shadow] duration-300 hover:shadow-[var(--studio-glow-soft)]">

        {/* Progress bar row */}
        <div className="flex items-center gap-3">
          <span className="w-10 text-right text-[10px] text-[var(--studio-muted)] tabular-nums">
            <span ref={timeDisplayRef}>0.00</span>s
          </span>
          <input
            ref={progressRef}
            type="range"
            min="0"
            max={duration}
            step="0.01"
            defaultValue="0"
            onChange={handleSeek}
            className="studio-range flex-1"
          />
          <span className="w-10 text-[10px] text-[var(--studio-muted)] tabular-nums">{duration.toFixed(2)}s</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Transport */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="flex items-center rounded-xl border border-[var(--studio-border)] p-2 text-[var(--studio-accent)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-glow-soft)]"
              title="Step back"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-11 items-center justify-center rounded-xl border border-[var(--studio-border-strong)] bg-[color-mix(in_oklab,var(--studio-accent)_18%,transparent)] text-[var(--studio-text)] shadow-[var(--studio-glow-soft)] transition-all duration-300 hover:-translate-y-0.5"
              title="Play / Pause"
            >
              {isPlaying
                ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>

            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="flex items-center rounded-xl border border-[var(--studio-border)] p-2 text-[var(--studio-accent)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-glow-soft)]"
              title="Step forward"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[var(--studio-border)]" />

          {/* Speed selector */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-muted)]">
              Speed
            </span>
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-wider transition-all duration-300 ${
                  speed === s
                    ? "border-[var(--studio-border-strong)] bg-[color-mix(in_oklab,var(--studio-accent)_25%,transparent)] text-[var(--studio-text)] shadow-[var(--studio-glow-soft)]"
                    : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:border-[var(--studio-border-strong)] hover:text-[var(--studio-text)]"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[var(--studio-border)]" />

          {/* Loop toggle */}
          <button
            type="button"
            onClick={() => setLoop(l => !l)}
            title={loop ? "Loop ON" : "Loop OFF"}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ${
              loop
                ? "border-[var(--studio-border-strong)] bg-[color-mix(in_oklab,var(--studio-highlight)_12%,transparent)] text-[var(--studio-text)] shadow-[var(--studio-glow-soft)]"
                : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:border-[var(--studio-border-strong)]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            LOOP
          </button>

          {/* FPS badge (right-aligned) */}
          <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[color-mix(in_oklab,var(--studio-surface)_30%,transparent)] px-2 py-1">
            <div
              className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                rendererFps >= 50
                  ? "bg-emerald-400"
                  : rendererFps >= 30
                    ? "bg-amber-300"
                    : "bg-rose-400"
              }`}
            />
            <span className={`text-[10px] font-bold tabular-nums ${fpsColor}`}>
              {rendererFps > 0 ? rendererFps : "—"} FPS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Viewport;