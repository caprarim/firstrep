import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

/**
 * expo-gl hands us a real WebGL2 context but no DOM canvas. three.js only needs
 * a handful of canvas properties, so we stub exactly those instead of pulling in
 * `expo-three` (which is peer-pinned to three 0.166 and would hold the whole app
 * back).
 *
 * The context is handed over through `getContext` rather than the renderer's
 * `context` option on purpose. expo-gl >= 56.0.5 installs `WebGLRenderingContext`
 * as a global and makes WebGL2 contexts inherit from it, and three >= r163 throws
 * "WebGL 1 is not supported" for any `context` that is `instanceof
 * WebGLRenderingContext`. Passing it via the canvas skips that check, which only
 * guards the explicit `context` option.
 */
function canvasShim(gl: ExpoWebGLRenderingContext) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => gl,
  } as unknown as HTMLCanvasElement;
}

export function createRenderer(gl: ExpoWebGLRenderingContext) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasShim(gl),
    antialias: true,
    alpha: false,
  });

  // drawingBuffer dimensions are already in device pixels, so pixelRatio stays 1
  // and we skip the style update (there is no CSS to update).
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  return renderer;
}

/**
 * Recursively frees every geometry under `root`, plus any material that is not
 * flagged `userData.shared` (the machine palette in `parts.ts` is reused across
 * every scene and must outlive an individual teardown).
 */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const kill = (m: THREE.Material) => {
      if (!m.userData?.shared) m.dispose();
    };
    if (Array.isArray(material)) material.forEach(kill);
    else if (material) kill(material);
  });
}
