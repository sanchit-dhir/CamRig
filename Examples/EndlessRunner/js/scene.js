// scene.js — Three.js scene, camera, renderer, post-processing
import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

export function buildScene(container) {
  // ─── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled   = true;
  renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // ─── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020812);
  scene.fog        = new THREE.FogExp2(0x020812, 0.032);

  // ─── Camera ─────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  // Behind-the-shoulder chase camera base position
  camera.position.set(0, 5.5, 14);
  camera.lookAt(0, 2, 0);

  // ─── Lights ─────────────────────────────────────────────────────────────────
  // Bright ambient so character is always readable
  const ambient = new THREE.AmbientLight(0xffffff, 2.8);
  scene.add(ambient);

  // Key light — directly in front-above (same side as camera)
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
  keyLight.position.set(0, 15, 20);   // in front of character toward camera
  keyLight.castShadow           = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near   = 0.1;
  keyLight.shadow.camera.far    = 120;
  keyLight.shadow.camera.left   = -20;
  keyLight.shadow.camera.right  = 20;
  keyLight.shadow.camera.top    = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.bias          = -0.001;
  scene.add(keyLight);

  // Character front fill — warm white from camera direction
  const fillLight = new THREE.DirectionalLight(0xaaccff, 2.5);
  fillLight.position.set(-3, 8, 18);
  scene.add(fillLight);

  // Side key — cyan neon from the right
  const sideLight = new THREE.DirectionalLight(0x00f5ff, 1.8);
  sideLight.position.set(8, 6, 5);
  scene.add(sideLight);

  // Rim / back light — magenta silhouette from behind-left
  const rimLight = new THREE.DirectionalLight(0xff00c8, 1.5);
  rimLight.position.set(-6, 8, -12);
  scene.add(rimLight);

  // Ground bounce
  const bounceLight = new THREE.DirectionalLight(0x4488ff, 0.8);
  bounceLight.position.set(0, -5, 5);
  scene.add(bounceLight);

  // ─── Post-processing ────────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,  // strength — reduced so character doesn't blow out
    0.4,   // radius
    0.85   // threshold — higher so only neon emissives glow
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ─── Resize ─────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  });

  return { scene, camera, renderer, composer };
}
