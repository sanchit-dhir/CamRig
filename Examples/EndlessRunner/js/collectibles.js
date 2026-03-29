// collectibles.js — Coin pool, spawning, pickup effects
import * as THREE from 'three';

const LANE_X = [-2.5, 0, 2.5];
const COIN_RADIUS = 0.4;
const COIN_VALUE  = 10;

export class CollectibleManager {
  constructor(scene) {
    this.scene    = scene;
    this.pool     = [];
    this.active   = [];
    this.coinsCollected = 0;

    this._spawnTimer = 0;
    this._nextSpawn  = 1.5;

    this._buildPool(20);
  }

  _buildPool(n) {
    const coinGeo = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.12, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color:    0xffec00,
      emissive: new THREE.Color(0xffec00),
      emissiveIntensity: 2.5,
      roughness: 0.2,
      metalness: 1.0,
    });

    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.rotation.x = Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  _fromPool() {
    return this.pool.find(m => !m.visible) || (() => {
      const m = this.pool[0].clone();
      m.visible = false;
      this.scene.add(m);
      this.pool.push(m);
      return m;
    })();
  }

  _spawnRow() {
    // Spawn a row of 1–3 coins in one lane, or zigzag
    const lane = Math.floor(Math.random() * 3);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const coin = this._fromPool();
      coin.position.set(
        LANE_X[lane],
        1.0,            // float above ground
        -55 - i * 1.8
      );
      coin.visible = true;
      this.active.push({ mesh: coin, box: new THREE.Box3().setFromObject(coin) });
    }
  }

  update(speed, dt, onCollect) {
    const dz = speed * dt;

    this._spawnTimer += dt;
    if (this._spawnTimer >= this._nextSpawn) {
      this._spawnTimer = 0;
      this._nextSpawn  = 1.0 + Math.random() * 1.5;
      this._spawnRow();
    }

    const time = performance.now() / 1000;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const c = this.active[i];
      c.mesh.position.z   += dz;
      c.mesh.rotation.z   += dt * 3.5;   // spin
      c.mesh.position.y    = 1.0 + Math.sin(time * 3 + i) * 0.2; // bob

      // Recycle
      if (c.mesh.position.z > 8) {
        c.mesh.visible = false;
        this.active.splice(i, 1);
        continue;
      }

      // Collision
      if (c.mesh.position.z > -2 && c.mesh.position.z < 4) {
        c.box.setFromObject(c.mesh);
        c.box.expandByScalar(0.3); // generous pick radius
        if (onCollect && onCollect(c.box, c.mesh.position.clone())) {
          c.mesh.visible = false;
          this.active.splice(i, 1);
          this.coinsCollected++;
        }
      }
    }
  }

  reset() {
    for (const c of this.active) c.mesh.visible = false;
    this.active = [];
    this.coinsCollected = 0;
    this._spawnTimer = 0;
    this._nextSpawn  = 1.5;
  }

  dispose() {
    for (const m of this.pool) {
      this.scene.remove(m);
      m.geometry && m.geometry.dispose();
    }
  }
}
