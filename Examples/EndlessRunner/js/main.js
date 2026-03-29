// main.js — Game boot, state machine, game loop
import * as THREE         from 'three';
import { buildScene }     from './scene.js';
import { Character }      from './character.js';
import { Track }          from './track.js';
import { ObstacleManager }    from './obstacles.js';
import { CollectibleManager } from './collectibles.js';
import { ParticleSystem } from './effects.js';
import { InputManager }   from './input.js';
import { UI }             from './ui.js';

// ─── Game States ─────────────────────────────────────────────────────────────
const STATE = { LOADING: 0, MENU: 1, RUNNING: 2, PAUSED: 3, DEAD: 4 };

// ─── Speed settings ──────────────────────────────────────────────────────────
const SPEED_INIT = 12;   // units/sec
const SPEED_MAX  = 38;
const SPEED_RAMP = 0.8;  // units/sec per second of play

// ─── Main ────────────────────────────────────────────────────────────────────
class Game {
  constructor() {
    this.state   = STATE.LOADING;
    this.ui      = new UI();
    this.input   = new InputManager();
    this.clock   = new THREE.Clock(false);

    // Game stats
    this.score    = 0;
    this.coins    = 0;
    this.dist     = 0;
    this.speed    = SPEED_INIT;
    this._died    = false;
    this._deathTimer = 0;

    // Build Three.js world
    const container = document.getElementById('canvas-container');
    const { scene, camera, renderer, composer } = buildScene(container);
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;
    this.composer = composer;

    // Camera spring target
    this._camTarget = new THREE.Vector3(0, 5.5, 14);
    this._camLook   = new THREE.Vector3(0, 2, 0);

    // Systems (created before character so track is ready)
    this.track       = new Track(scene);
    this.obstacles   = new ObstacleManager(scene);
    this.collectibles= new CollectibleManager(scene);
    this.particles   = new ParticleSystem(scene);

    // UI events
    this._bindUI();

    // Load character then show menu
    this.ui.showLoading();
    this.ui.setLoadProgress(10, 'Loading character…');

    this.character = new Character(scene, () => {
      this.ui.setLoadProgress(100, 'Ready!');
      setTimeout(() => {
        this.ui.showMenu();
        this.state = STATE.MENU;
        // Play idle walk in menu background
        this.character.startRunning();
        this.clock.start();
        this._loop();
      }, 600);
    });

    // Fake loading bar progress while FBX loads
    let p = 10;
    const fakeProgress = setInterval(() => {
      if (this.state !== STATE.LOADING) { clearInterval(fakeProgress); return; }
      p = Math.min(90, p + 4 + Math.random() * 6);
      this.ui.setLoadProgress(Math.floor(p), p < 50 ? 'Loading assets…' : 'Building world…');
    }, 200);
  }

  // ─── UI Bindings ───────────────────────────────────────────────────────────
  _bindUI() {
    document.getElementById('btn-play')?.addEventListener('click', () => this._startGame());
    document.getElementById('btn-resume')?.addEventListener('click', () => this._resume());
    document.getElementById('btn-quit')?.addEventListener('click', () => this._toMenu());
    document.getElementById('btn-restart')?.addEventListener('click', () => this._startGame());
    document.getElementById('btn-menu')?.addEventListener('click', () => this._toMenu());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === STATE.RUNNING) this._pause();
        else if (this.state === STATE.PAUSED) this._resume();
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (this.state === STATE.MENU) this._startGame();
        else if (this.state === STATE.RUNNING) this.character.jump();
      }
      if (e.code === 'ArrowLeft') {
        if (this.state === STATE.RUNNING) {
          this.character.moveLeft();
          this.ui.updateLane(this.character.currentLane);
        }
      }
      if (e.code === 'ArrowRight') {
        if (this.state === STATE.RUNNING) {
          this.character.moveRight();
          this.ui.updateLane(this.character.currentLane);
        }
      }
    });

    // Swipe
    this.input.onSwipe((dir) => {
      if (this.state === STATE.RUNNING) {
        if (dir === 'left')  { this.character.moveLeft();  this.ui.updateLane(this.character.currentLane); }
        if (dir === 'right') { this.character.moveRight(); this.ui.updateLane(this.character.currentLane); }
        if (dir === 'up')    this.character.jump();
      } else if (this.state === STATE.MENU) {
        this._startGame();
      }
    });

    // Show touch zones on mobile
    if ('ontouchstart' in window) {
      document.getElementById('touch-zones')?.classList.add('active');
    }
  }

  // ─── State Transitions ─────────────────────────────────────────────────────
  _startGame() {
    if (this.state === STATE.LOADING) return;
    // Reset
    this.score  = 0;
    this.coins  = 0;
    this.dist   = 0;
    this.speed  = SPEED_INIT;
    this._died  = false;
    this._deathTimer = 0;

    this.obstacles.reset();
    this.collectibles.reset();

    // Reset character to mid lane
    this.character.currentLane = 1;
    this.character.targetLaneX = 0;
    if (this.character.model) this.character.model.position.x = 0;
    this.character.currentState = 'idle';
    this.character._isJumping   = false;

    // Start running animation
    this.character.startRunning();

    this.ui.showHUD();
    this.ui.updateScore(0);
    this.ui.updateCoins(0);
    this.ui.updateLane(1);

    this.state = STATE.RUNNING;
    this.clock.start();
  }

  _pause() {
    if (this.state !== STATE.RUNNING) return;
    this.state = STATE.PAUSED;
    this.clock.stop();
    this.ui.showPause();
  }

  _resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.RUNNING;
    this.clock.start();
    this.ui.hidePause();
  }

  _toMenu() {
    this.state = STATE.MENU;
    this.obstacles.reset();
    this.collectibles.reset();
    this.ui.showMenu();
    this.character.currentState = 'idle';
    this.character._isJumping   = false;
    this.character.startRunning();
    this.clock.start();
  }

  _triggerDeath() {
    if (this._died) return;
    this._died = true;
    this._deathTimer = 0;

    this.character.die();

    // Death particle burst
    if (this.character.model) {
      const pos = this.character.model.position.clone();
      pos.y += 1;
      this.particles.emitDeath(pos);
    }

    // Camera shake
    this._shakeTimer = 0.5;

    this.state = STATE.DEAD;
  }

  // ─── Camera ────────────────────────────────────────────────────────────────
  _updateCamera(dt) {
    if (!this.character.model) return;

    const charX = this.character.model.position.x;
    const charY = this.character.model.position.y;

    // Chase camera: follow character X, slight Y follow on jump
    this._camTarget.x = THREE.MathUtils.lerp(this._camTarget.x, charX * 0.35, 5 * dt);
    this._camTarget.y = THREE.MathUtils.lerp(this._camTarget.y, 5.5 + (charY - (this.character._baseY || 0)) * 0.4, 4 * dt);
    this._camTarget.z = 14;

    // Camera shake on death
    let shakeX = 0, shakeY = 0;
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const s = this._shakeTimer * 0.25;
      shakeX = (Math.random() - 0.5) * s;
      shakeY = (Math.random() - 0.5) * s;
    }

    this.camera.position.copy(this._camTarget);
    this.camera.position.x += shakeX;
    this.camera.position.y += shakeY;

    this._camLook.x = THREE.MathUtils.lerp(this._camLook.x, charX * 0.15, 5 * dt);
    this._camLook.y = 2;
    this.camera.lookAt(this._camLook);
  }

  // ─── Main Loop ─────────────────────────────────────────────────────────────
  _loop() {
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);  // cap delta

    // ── Menu — just animate character standing on track ──────────────────────
    if (this.state === STATE.MENU) {
      this.character.update(dt);
      this._updateCamera(dt);
      this.composer.render();
      return;
    }

    if (this.state === STATE.PAUSED) {
      this.composer.render();
      return;
    }

    // ── RUNNING ──────────────────────────────────────────────────────────────
    if (this.state === STATE.RUNNING) {
      // Ramp speed
      this.speed = Math.min(SPEED_MAX, this.speed + SPEED_RAMP * dt);
      this.dist  += this.speed * dt;

      // Score = distance + coin bonus (coins are cumulative, distance-based)
      this.score = Math.floor(this.dist) + this.coins * 10;

      this.ui.updateScore(this.score);
      this.ui.updateSpeed((this.speed - SPEED_INIT) / (SPEED_MAX - SPEED_INIT));

      // Track
      this.track.update(this.speed, dt);

      // Character
      this.character.update(dt);

      // Obstacles
      this.obstacles.update(this.speed, dt, () => {
        this._triggerDeath();
      }, this.character.box);

      // Collectibles
      this.collectibles.update(this.speed, dt, (coinBox, coinWorldPos) => {
        if (this.character.box.intersectsBox(coinBox)) {
          this.coins++;
          this.ui.updateCoins(this.coins);
          this.particles.emitCoinPickup(coinWorldPos);

          // Project coin world position to screen for popup
          const ndc = coinWorldPos.clone().project(this.camera);
          const sx  = (ndc.x + 1) / 2 * window.innerWidth;
          const sy  = (1 - ndc.y) / 2 * window.innerHeight;
          this.ui.spawnScorePopup('+10', sx, sy);
          return true;
        }
        return false;
      });
    }

    // ── DEAD ─────────────────────────────────────────────────────────────────
    if (this.state === STATE.DEAD) {
      this._deathTimer += dt;
      this.character.update(dt);

      // Let death animation play, then show game over
      if (this._deathTimer > 2.8) {
        this.state = STATE.MENU; // prevent retriggering
        this.ui.showGameOver(this.score, this.coins, this.dist);
      }
    }

    // ── Always ───────────────────────────────────────────────────────────────
    this.particles.update(dt);
    this._updateCamera(dt);
    this.composer.render();
  }
}

// Boot
const game = new Game();
