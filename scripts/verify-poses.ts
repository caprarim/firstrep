/**
 * Headless sanity check for the 3D rig.
 *
 * Renders nothing — it builds every exercise scene, drives the rep from the
 * start pose to the contracted pose, and reports joint positions so obvious
 * breakage (feet through the floor, NaN transforms, hands nowhere near the
 * machine) shows up without needing a device.
 *
 *   npx esbuild scripts/verify-poses.ts --bundle --platform=node --format=cjs \
 *     --outfile=.verify.cjs --external:three && node .verify.cjs
 */
import * as THREE from 'three';
import { buildHumanoid, blendPose } from '../components/three/rig';
import { buildScene } from '../components/three/scenes';
import { EXERCISES } from '../lib/data/exercises';

type Report = {
  id: string;
  lowest: number;
  headY: number;
  handY: [number, number];
  footY: [number, number];
  nan: boolean;
};

function lowestPoint(root: THREE.Object3D) {
  const box = new THREE.Box3();
  let min = Infinity;
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    box.setFromObject(mesh);
    if (Number.isFinite(box.min.y)) min = Math.min(min, box.min.y);
  });
  return min;
}

function hasNaN(root: THREE.Object3D) {
  let bad = false;
  root.traverse((o) => {
    const p = o.getWorldPosition(new THREE.Vector3());
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) bad = true;
  });
  return bad;
}

const rows: { phase: string; r: Report }[] = [];
let failures = 0;

for (const ex of EXERCISES) {
  const human = buildHumanoid();
  const scene = buildScene(ex.rig, human);

  for (const [phase, t] of [
    ['start', 0],
    ['mid', 0.5],
    ['end', 1],
  ] as const) {
    blendPose(human, scene.start, scene.end, t);
    scene.group.updateWorldMatrix(true, true);
    scene.update?.(t, human);
    scene.group.updateWorldMatrix(true, true);

    const r: Report = {
      id: ex.id,
      lowest: lowestPoint(human.root),
      headY: human.worldOf('head').y,
      handY: [human.worldOf('wristL').y, human.worldOf('wristR').y],
      footY: [human.worldOf('ankleL').y, human.worldOf('ankleR').y],
      nan: hasNaN(scene.group),
    };
    rows.push({ phase, r });

    if (r.nan) {
      console.error(`✗ ${ex.id} @${phase}: NaN in transform tree`);
      failures++;
    }
    if (r.lowest < -0.12) {
      console.error(`✗ ${ex.id} @${phase}: body dips ${r.lowest.toFixed(3)}m below the floor`);
      failures++;
    }
    if (r.headY < 0.3) {
      console.error(`✗ ${ex.id} @${phase}: head at ${r.headY.toFixed(2)}m — figure collapsed`);
      failures++;
    }
  }
}

console.log('\nid                        phase  lowestY  headY  handY(L/R)     footY(L/R)');
console.log('─'.repeat(78));
for (const { phase, r } of rows) {
  console.log(
    `${r.id.padEnd(25)} ${phase.padEnd(6)} ${r.lowest.toFixed(3).padStart(7)} ` +
      `${r.headY.toFixed(2).padStart(6)}  ${r.handY[0].toFixed(2)}/${r.handY[1].toFixed(2)}` +
      `      ${r.footY[0].toFixed(2)}/${r.footY[1].toFixed(2)}`
  );
}

console.log(
  failures === 0
    ? `\n✓ ${EXERCISES.length} exercises × 3 phases — no structural failures`
    : `\n✗ ${failures} failures`
);
process.exit(failures === 0 ? 0 : 1);
