import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export async function loadAvatar(url: string, animurl: string) {
  const fbxLoader = new FBXLoader();

  // LOAD FBX WITH SKIN
  const fbx = await fbxLoader.loadAsync(url);
  // LOAD ANIMATION (No Skin)
  let anim;
  try {
    anim = await fbxLoader.loadAsync(animurl);
  } catch (e) {
    console.warn("Animation load failed, defaulting to empty animations", e);
    anim = { animations: [] };
  }


  console.log("FBX loaded", fbx);

  // NORMALIZE SCALE
  const box = new THREE.Box3().setFromObject(fbx);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim > 0) {
    fbx.scale.setScalar(1.8 / maxDim);
  }

  // CENTER MODEL
  const newBox = new THREE.Box3().setFromObject(fbx);
  const center = newBox.getCenter(new THREE.Vector3());

  fbx.position.x -= center.x;
  fbx.position.z -= center.z;
  fbx.position.y -= newBox.min.y;

  // SHADOWS
  fbx.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // MIXER

  const mixer = new THREE.AnimationMixer(fbx);
  let action: THREE.AnimationAction | null = null;

  if (anim.animations && anim.animations.length > 0) {
    const clip = anim.animations[0];
    action = mixer.clipAction(clip);
    action.play();
  }

  return {
    model: fbx,
    mixer,
    animations: anim.animations,
    action
  };
}
