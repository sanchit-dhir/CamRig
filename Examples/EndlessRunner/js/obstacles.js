// obstacles.js — Obstacle pool, spawning and collision
import * as THREE from 'three';

const LANE_X    = [-2.5, 0, 2.5];
const OBSTACLE_TYPES = [
  // { w, h, d, emissive, label }
  { w: 1.6, h: 1.8, d: 0.9,  color: 0x110022, emissive: 0xff00c8, emissiveIntensity: 1.5, label: 'barrier'   },
  { w: 3.5, h: 0.5, d: 0.7,  color: 0x001122, emissive: 0x00f5ff, emissiveIntensity: 1.2, label: 'beam_low'  },
  { w: 1.2, h: 2.8, d: 1.2,  color: 0x200010, emissive: 0xff4400, emissiveIntensity: 1.8, label: 'pillar'    },
];

function makeObstacleMesh(def) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color:            def.color,
    emissive:         new THREE.Color(def.emissive),
    emissiveIntensity:def.emissiveIntensity,
    roughness: 0.4,
    metalness: 0.8,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), mat);
  mesh.position.y = def.h / 2;
  mesh.castShadow = true;
  group.add(mesh);

  // Glow ring on top
  const ringGeo = new THREE.TorusGeometry(def.w * 0.55, 0.06, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color:   def.emissive,
    emissive:new THREE.Color(def.emissive),
    emissiveIntensity: 3,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y   = def.h + 0.05;
  ring.rotation.x   = Math.PI / 2;
  group.add(ring);

  group._def  = def;
  group._ring = ring;
  return group;
}

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.pool  = [];   // inactive obstacles
    this.active = [];  // active obstacles { mesh, box }

    this._spawnTimer = 0;
    this._minInterval = 1.5;
    this._maxInterval = 3.0;
    this._nextSpawn   = 2.5;

    // Pre-create pool
    for (let i = 0; i < 12; i++) {
      const def  = OBSTACLE_TYPES[i % OBSTACLE_TYPES.length];
      const mesh = makeObstacleMesh(def);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  _getFromPool(def) {
    // Try to find an inactive mesh of the same type
    let mesh = this.pool.find(m => !m.visible && m._def.label === def.label);
    if (!mesh) mesh = this.pool.find(m => !m.visible);
    if (!mesh) {
      mesh = makeObstacleMesh(def);
      this.scene.add(mesh);
    }
    return mesh;
  }

  _spawnObstacle(speed) {
    // Randomly choose lane pattern
    const patterns = [
      [0], [1], [2],           // single lane
      [0, 1], [1, 2],          // double lane (must jump or dodge)
      [0, 2],                  // both sides (must be middle)
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const defIdx  = Math.floor(Math.random() * OBSTACLE_TYPES.length);
    const def     = OBSTACLE_TYPES[defIdx];
    const spawnZ  = -50;       // far in front of camera

    for (const lane of pattern) {
      const mesh = this._getFromPool(def);
      mesh._def       = def;
      mesh.position.set(LANE_X[lane], 0, spawnZ);
      mesh.visible = true;

      const box = new THREE.Box3().setFromObject(mesh);
      this.active.push({ mesh, box });
    }
  }

  update(speed, dt, onCollide, characterBox) {
    const dz = speed * dt;

    // Spawn timer
    this._spawnTimer += dt;
    if (this._spawnTimer >= this._nextSpawn) {
      this._spawnTimer = 0;
      // Ramp up spawn frequency with speed
      const factor = Math.min(1, (speed - 12) / 20);
      const lo = Math.max(1.1, this._minInterval - factor * 0.5);
      const hi = Math.max(1.8, this._maxInterval - factor * 1.0);
      this._nextSpawn = lo + Math.random() * (hi - lo);
      this._spawnObstacle(speed);
    }

    // Move & cull
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ob = this.active[i];
      ob.mesh.position.z += dz;

      // Ring spin animation
      if (ob.mesh._ring) ob.mesh._ring.rotation.z += dt * 2.5;

      // Recycle past camera
      if (ob.mesh.position.z > 8) {
        ob.mesh.visible = false;
        this.active.splice(i, 1);
        continue;
      }

      // Collision — only check near-z range
      if (ob.mesh.position.z > -3 && ob.mesh.position.z < 4) {
        ob.box.setFromObject(ob.mesh);
        // Shrink collision box
        ob.box.min.x += 0.1;
        ob.box.max.x -= 0.1;
        ob.box.min.z += 0.1;
        ob.box.max.z -= 0.1;

        if (characterBox && characterBox.intersectsBox(ob.box)) {
          onCollide && onCollide();
        }
      }
    }
  }

  reset() {
    for (const ob of this.active) { ob.mesh.visible = false; }
    this.active = [];
    this._spawnTimer = 0;
    this._nextSpawn  = 2.5;
  }

  dispose() {
    [...this.pool, ...this.active.map(o => o.mesh)].forEach(m => {
      this.scene.remove(m);
      m.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    });
  }
}
