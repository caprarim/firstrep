import * as THREE from 'three';

/**
 * A hand-built humanoid skeleton.
 *
 * Conventions that the whole animation system depends on:
 *  - the figure faces +Z, +X is the figure's LEFT, +Y is up
 *  - every limb joint's segment extends along its local -Y
 *  - therefore a NEGATIVE rotation.x swings a limb FORWARD (+Z),
 *    a POSITIVE rotation.x swings it BACKWARD, and rotation.z abducts
 *    it sideways (outward for the left arm, inward for the right)
 *  - spine joints are the exception: they extend along local +Y
 *
 * Everything is in metres; the figure stands about 1.75 m tall.
 */

export type JointName =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'elbowL'
  | 'wristL'
  | 'shoulderR'
  | 'elbowR'
  | 'wristR'
  | 'hipL'
  | 'kneeL'
  | 'ankleL'
  | 'hipR'
  | 'kneeR'
  | 'ankleR';

export type Vec3 = [number, number, number];

export type Pose = {
  joints: Partial<Record<JointName, Vec3>>;
  root?: { pos?: Vec3; rot?: Vec3 };
};

export type Humanoid = {
  root: THREE.Group;
  joints: Record<JointName, THREE.Object3D>;
  /** World-space position of a joint, for attaching hands to handles. */
  worldOf: (name: JointName) => THREE.Vector3;
};

const SEG = {
  pelvisToSpine: 0.13,
  spineToChest: 0.19,
  chestToNeck: 0.2,
  neckToHead: 0.11,
  shoulderX: 0.185,
  shoulderY: 0.145,
  upperArm: 0.29,
  forearm: 0.26,
  hand: 0.1,
  hipX: 0.095,
  thigh: 0.44,
  shin: 0.42,
  foot: 0.26,
};

/** Hip-joint height when standing, chosen so the shoes land exactly on y=0. */
export const HIP_HEIGHT = 0.96;

/** Hip-joint height when seated on a standard 0.44 m gym seat. */
export const HIP_SEATED = 0.575;

/** Segment lengths the IK solver needs. */
export const THIGH = SEG.thigh;
export const SHIN = SEG.shin;
/** The hip joint sits slightly below the root origin. */
export const HIP_DROP = 0.03;
/** Ankle height when the sole is flat on the floor. */
export const SOLE = 0.07;

const PALETTE = {
  skin: 0xe2a77b,
  shirt: 0x27364f,
  shirtTrim: 0x33455f,
  shorts: 0x18202e,
  shoe: 0xf97316,
  hair: 0x2a2118,
};

function mat(color: number, roughness = 0.72, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** Capsule spanning local y=0 down to y=-length. */
function limbMesh(length: number, radius: number, material: THREE.Material) {
  const cyl = Math.max(0.001, length - radius * 2);
  const geo = new THREE.CapsuleGeometry(radius, cyl, 4, 12);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -length / 2;
  return mesh;
}

function node(parent: THREE.Object3D, x: number, y: number, z: number) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

export function buildHumanoid(): Humanoid {
  const skin = mat(PALETTE.skin, 0.68);
  const shirt = mat(PALETTE.shirt, 0.85);
  const shirtTrim = mat(PALETTE.shirtTrim, 0.85);
  const shorts = mat(PALETTE.shorts, 0.88);
  const shoe = mat(PALETTE.shoe, 0.6);
  const hair = mat(PALETTE.hair, 0.9);

  const root = new THREE.Group();

  // ── torso chain ────────────────────────────────────────────────
  const hips = node(root, 0, 0, 0);
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.05, 4, 14), shorts);
  pelvis.scale.set(1.12, 1, 0.78);
  pelvis.position.y = 0.02;
  hips.add(pelvis);

  const spine = node(hips, 0, SEG.pelvisToSpine, 0);
  const waist = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.06, 4, 14), shirt);
  waist.scale.set(1.2, 1, 0.76);
  waist.position.y = 0.02;
  spine.add(waist);

  const chest = node(spine, 0, SEG.spineToChest, 0);
  const ribcage = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.14, 5, 16), shirt);
  ribcage.scale.set(1.28, 1, 0.72);
  ribcage.position.y = 0.05;
  chest.add(ribcage);
  // shoulder yoke, so the chest reads as a tank top rather than a tube
  const yoke = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.3, 4, 12), shirtTrim);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.y = SEG.shoulderY;
  chest.add(yoke);

  const neck = node(chest, 0, SEG.chestToNeck, 0);
  const neckMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.06, 3, 10), skin);
  neckMesh.position.y = 0.03;
  neck.add(neckMesh);

  const head = node(neck, 0, SEG.neckToHead, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), skin);
  skull.scale.set(0.92, 1.08, 0.98);
  skull.position.y = 0.05;
  head.add(skull);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.108, 18, 14), hair);
  crown.scale.set(0.94, 0.92, 1.0);
  crown.position.set(0, 0.075, -0.012);
  head.add(crown);

  // ── arms ───────────────────────────────────────────────────────
  function arm(side: 1 | -1) {
    const shoulder = node(chest, SEG.shoulderX * side, SEG.shoulderY, 0);
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), shirtTrim);
    shoulder.add(deltoid);
    shoulder.add(limbMesh(SEG.upperArm, 0.056, skin));

    const elbow = node(shoulder, 0, -SEG.upperArm, 0);
    elbow.add(limbMesh(SEG.forearm, 0.047, skin));

    const wrist = node(elbow, 0, -SEG.forearm, 0);
    const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.04, 3, 10), skin);
    palm.scale.set(1, 1, 0.62);
    palm.position.y = -SEG.hand / 2;
    wrist.add(palm);

    return { shoulder, elbow, wrist };
  }

  const left = arm(1);
  const right = arm(-1);

  // ── legs ───────────────────────────────────────────────────────
  function leg(side: 1 | -1) {
    const hip = node(hips, SEG.hipX * side, -0.03, 0);
    hip.add(limbMesh(SEG.thigh, 0.085, shorts));

    const knee = node(hip, 0, -SEG.thigh, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), skin);
    knee.add(cap);
    knee.add(limbMesh(SEG.shin, 0.062, skin));

    const ankle = node(knee, 0, -SEG.shin, 0);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.075, SEG.foot), shoe);
    boot.position.set(0, -0.032, SEG.foot / 2 - 0.075);
    ankle.add(boot);

    return { hip, knee, ankle };
  }

  const legL = leg(1);
  const legR = leg(-1);

  const joints: Record<JointName, THREE.Object3D> = {
    hips,
    spine,
    chest,
    neck,
    head,
    shoulderL: left.shoulder,
    elbowL: left.elbow,
    wristL: left.wrist,
    shoulderR: right.shoulder,
    elbowR: right.elbow,
    wristR: right.wrist,
    hipL: legL.hip,
    kneeL: legL.knee,
    ankleL: legL.ankle,
    hipR: legR.hip,
    kneeR: legR.knee,
    ankleR: legR.ankle,
  };

  const scratch = new THREE.Vector3();

  return {
    root,
    joints,
    worldOf: (name) => joints[name].getWorldPosition(scratch.clone()),
  };
}

/** Neutral standing pose — every animation blends out from this. */
export const T_POSE: Pose = {
  root: { pos: [0, HIP_HEIGHT, 0], rot: [0, 0, 0] },
  joints: {
    shoulderL: [0, 0, 0.06],
    shoulderR: [0, 0, -0.06],
    elbowL: [-0.08, 0, 0],
    elbowR: [-0.08, 0, 0],
  },
};

const ZERO: Vec3 = [0, 0, 0];

export function applyPose(rig: Humanoid, pose: Pose) {
  (Object.keys(rig.joints) as JointName[]).forEach((name) => {
    const v = pose.joints[name] ?? ZERO;
    rig.joints[name].rotation.set(v[0], v[1], v[2]);
  });
  const pos = pose.root?.pos ?? [0, HIP_HEIGHT, 0];
  const rot = pose.root?.rot ?? ZERO;
  rig.root.position.set(pos[0], pos[1], pos[2]);
  rig.root.rotation.set(rot[0], rot[1], rot[2]);
}

/** Writes `a` blended toward `b` by `t` straight onto the rig. */
export function blendPose(rig: Humanoid, a: Pose, b: Pose, t: number) {
  (Object.keys(rig.joints) as JointName[]).forEach((name) => {
    const va = a.joints[name] ?? ZERO;
    const vb = b.joints[name] ?? ZERO;
    rig.joints[name].rotation.set(
      va[0] + (vb[0] - va[0]) * t,
      va[1] + (vb[1] - va[1]) * t,
      va[2] + (vb[2] - va[2]) * t
    );
  });

  const pa = a.root?.pos ?? [0, HIP_HEIGHT, 0];
  const pb = b.root?.pos ?? [0, HIP_HEIGHT, 0];
  rig.root.position.set(
    pa[0] + (pb[0] - pa[0]) * t,
    pa[1] + (pb[1] - pa[1]) * t,
    pa[2] + (pb[2] - pa[2]) * t
  );

  const ra = a.root?.rot ?? ZERO;
  const rb = b.root?.rot ?? ZERO;
  rig.root.rotation.set(
    ra[0] + (rb[0] - ra[0]) * t,
    ra[1] + (rb[1] - ra[1]) * t,
    ra[2] + (rb[2] - ra[2]) * t
  );
}
