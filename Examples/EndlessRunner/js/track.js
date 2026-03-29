// track.js — Procedural lane track with infinite tile recycling
import * as THREE from 'three';

const LANE_X       = [-2.5, 0, 2.5];
const TILE_LENGTH  = 20;
const TILE_COUNT   = 14;   // tiles visible at once
const TRACK_WIDTH  = 8;

function makeSkybox(scene) {
  // Deep space gradient using a large sky dome
  const geo  = new THREE.SphereGeometry(400, 32, 16);
  const mat  = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { topColor: { value: new THREE.Color(0x000510) }, bottomColor: { value: new THREE.Color(0x020817) } },
    vertexShader: `
      varying float vY;
      void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
    `,
    fragmentShader: `
      uniform vec3 topColor, bottomColor;
      varying float vY;
      void main() {
        float t = clamp((vY + 100.) / 500., 0., 1.);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.);
      }
    `,
  });
  scene.add(new THREE.Mesh(geo, mat));
}

function makeStars(scene) {
  const positions = [];
  for (let i = 0; i < 2000; i++) {
    positions.push(
      (Math.random() - 0.5) * 800,
      Math.random() * 200 + 20,
      (Math.random() - 0.5) * 800
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true });
  scene.add(new THREE.Points(geo, mat));
}

function makeTileMesh() {
  const group = new THREE.Group();

  // Floor slab
  const floorGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.3, TILE_LENGTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color:     0x050d20,
    roughness: 0.6,
    metalness: 0.7,
    emissive:  new THREE.Color(0x000d20),
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  group.add(floor);

  // Lane dividers — glowing neon lines
  const lineMat = new THREE.MeshStandardMaterial({
    color:   0x00f5ff,
    emissive: new THREE.Color(0x00f5ff),
    emissiveIntensity: 2.0,
    roughness: 1,
    metalness: 0,
  });
  // Two divider lines (between 3 lanes)
  [-TRACK_WIDTH / 6, TRACK_WIDTH / 6].forEach(lx => {
    const lineGeo = new THREE.BoxGeometry(0.06, 0.02, TILE_LENGTH);
    const line    = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(lx, 0.01, 0);
    group.add(line);
  });

  // Center line dashes
  for (let i = -TILE_LENGTH / 2 + 1.5; i < TILE_LENGTH / 2; i += 3) {
    const dashGeo = new THREE.BoxGeometry(0.04, 0.02, 1.2);
    const dash    = new THREE.Mesh(dashGeo, lineMat);
    dash.position.set(0, 0.01, i);
    group.add(dash);
  }

  // Side barriers
  const barrierMat = new THREE.MeshStandardMaterial({
    color:     0x001133,
    emissive:  new THREE.Color(0x00f5ff),
    emissiveIntensity: 0.3,
    roughness: 0.5,
    metalness: 0.9,
  });
  [-TRACK_WIDTH / 2 - 0.1, TRACK_WIDTH / 2 + 0.1].forEach(bx => {
    const bGeo = new THREE.BoxGeometry(0.25, 0.6, TILE_LENGTH);
    const bar  = new THREE.Mesh(bGeo, barrierMat);
    bar.position.set(bx, 0.3, 0);
    group.add(bar);
  });

  // Side wall glow strips
  const glowMat = new THREE.MeshStandardMaterial({
    color:    0xff00c8,
    emissive: new THREE.Color(0xff00c8),
    emissiveIntensity: 1.5,
  });
  [-TRACK_WIDTH / 2 - 0.2, TRACK_WIDTH / 2 + 0.2].forEach(gx => {
    const gGeo = new THREE.BoxGeometry(0.04, 0.04, TILE_LENGTH);
    const glow = new THREE.Mesh(gGeo, glowMat);
    glow.position.set(gx, 0.6, 0);
    group.add(glow);
  });

  return group;
}

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    this._nextZ = 0;  // next tile's back edge Z (tiles go toward -Z)

    makeSkybox(scene);
    makeStars(scene);
    this._buildInitial();
  }

  _buildInitial() {
    // Fill from player backward (+Z = toward camera)
    const startZ = TILE_LENGTH * 2; // a couple behind the camera
    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = makeTileMesh();
      tile.position.z = startZ - i * TILE_LENGTH;
      this.scene.add(tile);
      this.tiles.push(tile);
    }
    this._nextZ = startZ - TILE_COUNT * TILE_LENGTH;
  }

  update(speed, dt) {
    const dz = speed * dt;
    for (const tile of this.tiles) {
      tile.position.z += dz;  // move tiles toward camera (+z)
    }
    this._nextZ += dz;

    // Recycle tiles that have scrolled past the camera
    for (const tile of this.tiles) {
      if (tile.position.z > TILE_LENGTH * 3) {
        tile.position.z = this._nextZ + TILE_LENGTH / 2;
        this._nextZ = tile.position.z - TILE_LENGTH;
      }
    }
  }

  dispose() {
    for (const tile of this.tiles) {
      this.scene.remove(tile);
      tile.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    }
    this.tiles = [];
  }
}
