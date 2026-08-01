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
  /** Worst gap between a prop that should be in a fist and that fist. */
  gripGap: number;
  /** Closest a cable comes to the middle of the lifter's torso. */
  cableGap: number;
};

/**
 * How far a held prop may sit from the fist holding it. A bar sits in the
 * fingers rather than at the joint, so this is not zero — but it is centimetres,
 * not the metre a prop parented to an offset machine group ends up away.
 */
const GRIP_TOLERANCE = 0.14;

/**
 * How close a cable may pass to the torso's centre line before it is inside the
 * lifter rather than past them — which is what happens when a machine is built
 * on the side the lifter has their back to. The ribcage runs to about 0.11 m
 * either side of the axis in Z, so this is the skin, not a comfort margin: at
 * lockout a rope really does hang against the thighs.
 */
const TORSO_RADIUS = 0.12;

function segDistance(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) {
  // Closest approach between segments ab and cd, sampled — exact enough at this
  // scale and immune to the degenerate cases the analytic form trips over.
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  let best = Infinity;
  for (let i = 0; i <= 24; i++) {
    p.lerpVectors(a, b, i / 24);
    for (let j = 0; j <= 24; j++) {
      q.lerpVectors(c, d, j / 24);
      best = Math.min(best, p.distanceTo(q));
    }
  }
  return best;
}

/** The ends of a `Link` cylinder in world space: it is a unit tube scaled in Y. */
function linkEnds(mesh: THREE.Object3D): [THREE.Vector3, THREE.Vector3] {
  mesh.updateWorldMatrix(true, false);
  const half = mesh.scale.y / 2;
  return [
    mesh.localToWorld(new THREE.Vector3(0, half, 0)),
    mesh.localToWorld(new THREE.Vector3(0, -half, 0)),
  ];
}

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

    // Every prop the scene snapped into a hand should be in that hand.
    const grips = { L: human.gripOf('L'), R: human.gripOf('R') };
    let gripGap = 0;
    let gripWorst = '';
    scene.group.traverse((o) => {
      const held = o.userData.heldBy as 'L' | 'R' | 'LR' | undefined;
      if (!held) return;
      const at = o.getWorldPosition(new THREE.Vector3());
      const gap =
        held === 'LR'
          ? at.distanceTo(grips.L.clone().add(grips.R).multiplyScalar(0.5))
          : at.distanceTo(grips[held]);
      if (gap > gripGap) {
        gripGap = gap;
        gripWorst = o.name || held;
      }
    });

    // …and no cable should be routed through the lifter to reach its pulley.
    const spine: [THREE.Vector3, THREE.Vector3] = [
      human.worldOf('hips'),
      human.worldOf('neck'),
    ];
    let cableGap = Infinity;
    scene.group.traverse((o) => {
      if (o.userData.role !== 'cable' || !o.visible) return;
      const [a, b] = linkEnds(o);
      cableGap = Math.min(cableGap, segDistance(a, b, spine[0], spine[1]));
    });

    const r: Report = {
      id: ex.id,
      lowest: lowestPoint(human.root),
      headY: human.worldOf('head').y,
      handY: [human.worldOf('wristL').y, human.worldOf('wristR').y],
      footY: [human.worldOf('ankleL').y, human.worldOf('ankleR').y],
      nan: hasNaN(scene.group),
      gripGap,
      cableGap,
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
    if (gripGap > GRIP_TOLERANCE) {
      console.error(
        `✗ ${ex.id} @${phase}: "${gripWorst}" is ${gripGap.toFixed(2)}m from the hand holding it`
      );
      failures++;
    }
    if (Number.isFinite(cableGap) && cableGap < TORSO_RADIUS) {
      console.error(
        `✗ ${ex.id} @${phase}: cable passes ${cableGap.toFixed(2)}m from the spine — through the lifter`
      );
      failures++;
    }
  }
}

console.log(
  '\nid                        phase  lowestY  headY  handY(L/R)   footY(L/R)   grip  cable'
);
console.log('─'.repeat(88));
for (const { phase, r } of rows) {
  const cable = Number.isFinite(r.cableGap) ? r.cableGap.toFixed(2).padStart(5) : '    —';
  console.log(
    `${r.id.padEnd(25)} ${phase.padEnd(6)} ${r.lowest.toFixed(3).padStart(7)} ` +
      `${r.headY.toFixed(2).padStart(6)}  ${r.handY[0].toFixed(2)}/${r.handY[1].toFixed(2)}` +
      `   ${r.footY[0].toFixed(2)}/${r.footY[1].toFixed(2)}` +
      `  ${r.gripGap.toFixed(2).padStart(5)} ${cable}`
  );
}

console.log(
  failures === 0
    ? `\n✓ ${EXERCISES.length} exercises × 3 phases — no structural failures`
    : `\n✗ ${failures} failures`
);
process.exit(failures === 0 ? 0 : 1);
