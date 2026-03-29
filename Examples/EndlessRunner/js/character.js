// character.js — FBX loading, skeleton retargeting, animation state machine
import * as THREE from 'three';
import { FBXLoader }         from 'three/addons/loaders/FBXLoader.js';
import { AnimationUtils }    from 'three';

const LANE_X     = [-2.5, 0, 2.5];   // 3 lane x-positions
const JUMP_HEIGHT = 3.5;
const JUMP_DUR    = 0.55;             // seconds

export class Character {
  constructor(scene, onReady) {
    this.scene    = scene;
    this.onReady  = onReady;
    this.mixer    = null;
    this.model    = null;
    this.actions  = {};           // { walk, jump, die }

    // State
    this.currentLane   = 1;      // 0=left 1=mid 2=right
    this.targetLaneX   = 0;
    this.currentState  = 'idle'; // 'idle' | 'run' | 'jump' | 'die'

    // Jump physics
    this._jumpTime  = 0;
    this._isJumping = false;
    this._baseY     = 0;         // set after model loads

    // Bounding box (AABB) for collision
    this.box = new THREE.Box3();

    this._load();
  }

  _load() {
    const loader = new FBXLoader();
    let loadedCount = 0;
    const needed = 4; // character + 3 anims
    const clips = {};

    const tryFinish = () => {
      loadedCount++;
      if (loadedCount === needed) this._setup(clips);
    };

    const onProgress = () => {};

    // ── 1. Character (T-pose) ─────────────────────────────────────────────────
    loader.load('Y Bot.fbx', (fbx) => {
      this.model = fbx;
      fbx.scale.setScalar(0.022);
      fbx.position.set(0, 0, 0);
      // ── Fix rotation: Mixamo FBX faces -Z, flip to face camera (+Z) ──
      fbx.rotation.y = Math.PI;

      fbx.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.castShadow    = true;
          child.receiveShadow = false;
          child.frustumCulled = false;

          // Keep the original FBX texture/material if it exists,
          // otherwise apply a clearly visible neon-blue suit material
          const hasTex = child.material &&
            (Array.isArray(child.material)
              ? child.material.some(m => m.map)
              : child.material.map);

          if (!hasTex) {
            // Visible bright neon-blue metallic material
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];

            child.material = new THREE.MeshStandardMaterial({
              color:             new THREE.Color(0x2288ff),
              emissive:          new THREE.Color(0x0033aa),
              emissiveIntensity: 0.6,
              roughness:         0.35,
              metalness:         0.75,
            });
          } else {
            // Boost existing material brightness
            const applyBoost = (m) => {
              if (!m) return;
              m.emissive          = m.emissive || new THREE.Color(0x000000);
              m.emissiveIntensity = 0.15;
              m.roughness         = Math.min(m.roughness ?? 0.5, 0.6);
              m.needsUpdate       = true;
            };
            if (Array.isArray(child.material)) child.material.forEach(applyBoost);
            else applyBoost(child.material);
          }
        }
      });
      this.scene.add(fbx);
      clips._model = fbx;
      tryFinish();
    }, onProgress, (err) => { console.error('Y Bot load error', err); tryFinish(); });

    // ── 2. Walking ────────────────────────────────────────────────────────────
    loader.load('Walking.fbx', (fbx) => {
      if (fbx.animations && fbx.animations.length > 0) {
        clips.walk = fbx.animations[0];
        clips.walk.name = 'walk';
      }
      tryFinish();
    }, onProgress, (err) => { console.error('Walk load error', err); tryFinish(); });

    // ── 3. Jump ───────────────────────────────────────────────────────────────
    loader.load('Jump.fbx', (fbx) => {
      if (fbx.animations && fbx.animations.length > 0) {
        clips.jump = fbx.animations[0];
        clips.jump.name = 'jump';
      }
      tryFinish();
    }, onProgress, (err) => { console.error('Jump load error', err); tryFinish(); });

    // ── 4. Dying ──────────────────────────────────────────────────────────────
    loader.load('Dying.fbx', (fbx) => {
      if (fbx.animations && fbx.animations.length > 0) {
        clips.die = fbx.animations[0];
        clips.die.name = 'die';
      }
      tryFinish();
    }, onProgress, (err) => { console.error('Die load error', err); tryFinish(); });
  }

  _setup(clips) {
    if (!this.model) { console.error('Character model missing'); return; }

    this.mixer = new THREE.AnimationMixer(this.model);

    const addAction = (clip, name) => {
      if (!clip) return null;
      const action = this.mixer.clipAction(clip);
      action.name = name;
      return action;
    };

    this.actions.walk = addAction(clips.walk, 'walk');
    this.actions.jump = addAction(clips.jump, 'jump');
    this.actions.die  = addAction(clips.die,  'die');

    // Configure actions
    if (this.actions.walk) {
      this.actions.walk.setLoop(THREE.LoopRepeat, Infinity);
    }
    if (this.actions.jump) {
      this.actions.jump.setLoop(THREE.LoopOnce, 1);
      this.actions.jump.clampWhenFinished = true;
    }
    if (this.actions.die) {
      this.actions.die.setLoop(THREE.LoopOnce, 1);
      this.actions.die.clampWhenFinished = true;
    }

    // Get base Y position (top of ground)
    const worldBox = new THREE.Box3().setFromObject(this.model);
    const modelHeight = worldBox.max.y - worldBox.min.y;
    this._baseY = -worldBox.min.y; // lift model so feet are at y=0
    this.model.position.y = this._baseY;

    this.targetLaneX = LANE_X[this.currentLane];
    this.model.position.x = this.targetLaneX;

    this.onReady && this.onReady();
  }

  startRunning() {
    if (this.currentState === 'run') return;
    this.currentState = 'run';
    this._crossFade(this.actions.walk, 0.3);
  }

  jump() {
    if (this._isJumping || this.currentState === 'die') return;
    this._isJumping = true;
    this._jumpTime  = 0;
    this.currentState = 'jump';
    this._crossFade(this.actions.jump, 0.15);
  }

  die() {
    if (this.currentState === 'die') return;
    this.currentState = 'die';
    this._isJumping   = false;
    this._crossFade(this.actions.die, 0.2);
  }

  moveLeft()  { if (this.currentLane > 0) this.currentLane--; this._updateLaneTarget(); }
  moveRight() { if (this.currentLane < 2) this.currentLane++; this._updateLaneTarget(); }

  _updateLaneTarget() {
    this.targetLaneX = LANE_X[this.currentLane];
  }

  _crossFade(toAction, duration = 0.3) {
    if (!toAction || !this.mixer) return;
    const currentAction = this._currentAction;
    this._currentAction = toAction;

    if (currentAction && currentAction !== toAction) {
      toAction.reset().setEffectiveWeight(1).play();
      currentAction.crossFadeTo(toAction, duration, true);
    } else {
      toAction.reset().setEffectiveWeight(1).play();
    }
  }

  update(dt) {
    if (!this.model || !this.mixer) return;

    // Animate mixer
    this.mixer.update(dt);

    // ── Lane lerp (smooth lane-change) ──────────────────────────────────────
    const lerpSpeed = 10;
    this.model.position.x = THREE.MathUtils.lerp(
      this.model.position.x,
      this.targetLaneX,
      Math.min(1, lerpSpeed * dt)
    );

    // ── Jump arc ────────────────────────────────────────────────────────────
    if (this._isJumping) {
      this._jumpTime += dt;
      const t = this._jumpTime / JUMP_DUR;
      // Parabolic arc: h * 4 * t * (1-t)
      const h = JUMP_HEIGHT * 4 * t * (1 - t);
      this.model.position.y = this._baseY + Math.max(0, h);

      if (this._jumpTime >= JUMP_DUR) {
        this._isJumping = false;
        this.model.position.y = this._baseY;
        if (this.currentState === 'jump') {
          this.currentState = 'run';
          this._crossFade(this.actions.walk, 0.2);
        }
      }
    }

    // ── Tilt on lane change ──────────────────────────────────────────────────
    const xDiff = this.targetLaneX - this.model.position.x;
    this.model.rotation.z = THREE.MathUtils.lerp(this.model.rotation.z, -xDiff * 0.08, 8 * dt);

    // ── Update bounding box ──────────────────────────────────────────────────
    this.box.setFromObject(this.model);
    // Tighten box a bit to be fair to player
    this.box.min.x += 0.3;
    this.box.max.x -= 0.3;
    this.box.min.z += 0.2;
    this.box.max.z -= 0.2;
  }

  getLaneX() { return LANE_X[this.currentLane]; }
}
