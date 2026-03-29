// effects.js — Particle systems for coin pickup and death explosion
import * as THREE from 'three';

const POOL_SIZE = 200;

class Particle {
  constructor() {
    this.pos      = new THREE.Vector3();
    this.vel      = new THREE.Vector3();
    this.life     = 0;
    this.maxLife  = 1;
    this.active   = false;
    this.color    = new THREE.Color();
  }
}

export class ParticleSystem {
  constructor(scene) {
    this.scene     = scene;
    this.particles = Array.from({ length: POOL_SIZE }, () => new Particle());

    const geo = new THREE.BufferGeometry();
    this._positions = new Float32Array(POOL_SIZE * 3);
    this._colors    = new Float32Array(POOL_SIZE * 3);
    this._sizes     = new Float32Array(POOL_SIZE);

    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(this._colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(this._sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = 1.0 - d * 2.0;
          gl_FragColor = vec4(vColor, a * a);
        }
      `,
      transparent:   true,
      depthWrite:    false,
      vertexColors:  false,
      blending:      THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
  }

  _emit(pos, color, count, speed, maxLife) {
    let emitted = 0;
    for (const p of this.particles) {
      if (!p.active && emitted < count) {
        p.active  = true;
        p.pos.copy(pos);
        p.vel.set(
          (Math.random() - 0.5) * speed,
          Math.random() * speed * 1.5,
          (Math.random() - 0.5) * speed
        );
        p.life    = 0;
        p.maxLife = maxLife * (0.6 + Math.random() * 0.8);
        p.color.copy(color);
        emitted++;
      }
    }
  }

  emitCoinPickup(pos) {
    this._emit(pos, new THREE.Color(0xffec00), 12, 4, 0.7);
  }

  emitDeath(pos) {
    this._emit(pos, new THREE.Color(0xff00c8), 50, 6, 1.2);
    this._emit(pos, new THREE.Color(0x00f5ff), 30, 4, 1.5);
    this._emit(pos, new THREE.Color(0xff4400), 20, 8, 1.0);
  }

  update(dt) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this._positions[i * 3]     = 0;
        this._positions[i * 3 + 1] = -1000;
        this._positions[i * 3 + 2] = 0;
        this._sizes[i]             = 0;
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const t = p.life / p.maxLife;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 9.8 * dt * 0.4;  // gravity

      this._positions[i * 3]     = p.pos.x;
      this._positions[i * 3 + 1] = p.pos.y;
      this._positions[i * 3 + 2] = p.pos.z;

      this._colors[i * 3]     = p.color.r;
      this._colors[i * 3 + 1] = p.color.g;
      this._colors[i * 3 + 2] = p.color.b;

      this._sizes[i] = (1 - t) * 0.8;
    }

    const geo = this.points.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate    = true;
    geo.attributes.size.needsUpdate     = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
  }
}
