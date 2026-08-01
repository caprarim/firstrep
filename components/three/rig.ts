import * as THREE from 'three';

/**
 * A hand-built humanoid.
 *
 * Conventions that the whole animation system depends on:
 *  - the figure faces +Z, +X is the figure's LEFT, +Y is up
 *  - every limb joint's segment extends along its local -Y
 *  - therefore a NEGATIVE rotation.x swings a limb FORWARD (+Z),
 *    a POSITIVE rotation.x swings it BACKWARD, and rotation.z abducts
 *    it sideways (outward for the left arm, inward for the right)
 *  - spine joints are the exception: they extend along local +Y
 *  - a hand's palm faces its local -Z, so a positive finger rotation.x
 *    closes the fist
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
  /** 0 = open hand, 1 = closed fist. */
  grip?: number;
};

export type Humanoid = {
  root: THREE.Group;
  joints: Record<JointName, THREE.Object3D>;
  /** World-space position of a joint, for attaching hands to handles. */
  worldOf: (name: JointName) => THREE.Vector3;
  /** World-space centre of the closed fist, where a bar actually sits. */
  gripOf: (side: 'L' | 'R') => THREE.Vector3;
  setGrip: (t: number) => void;
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
/** Distance from the wrist joint to the middle of a closed fist. */
export const GRIP_DROP = 0.062;

const PALETTE = {
  skin: 0xd9a179,
  skinShade: 0xc38d68,
  shirt: 0x25334a,
  shirtTrim: 0x30425e,
  shorts: 0x161d29,
  shortsTrim: 0x222c3c,
  shoe: 0xf1f3f6,
  shoeAccent: 0xf97316,
  shoeSole: 0x1b1e23,
  hair: 0x241d16,
  eye: 0x15181d,
};

function mat(color: number, roughness = 0.72, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

type Prof = [number, number][];

function capTop(y: number, r: number, steps = 3): Prof {
  const out: Prof = [];
  for (let i = 0; i < steps; i++) {
    const a = (Math.PI / 2) * (i / steps);
    out.push([y + r * 0.62 * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

function capBottom(y: number, r: number, steps = 3): Prof {
  const out: Prof = [];
  for (let i = 1; i <= steps; i++) {
    const a = (Math.PI / 2) * (i / steps);
    out.push([y - r * 0.62 * Math.sin(a), r * Math.cos(a)]);
  }
  return out;
}

function latheMesh(profile: Prof, material: THREE.Material, radial = 14) {
  const pts = profile.map(([y, r]) => new THREE.Vector2(Math.max(0.0008, r), y));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, radial), material);
}

/**
 * A tapered limb segment spanning local y=0 down to y=-length. `shape` samples
 * the radius along the bone as [fraction of length, radius], so a muscle belly
 * is just a wider sample partway down.
 */
function limb(
  length: number,
  shape: Prof,
  material: THREE.Material,
  radial = 14,
  squash = 1
) {
  const body: Prof = shape.map(([t, r]) => [-t * length, r]);
  const profile = [
    ...capTop(0, body[0][1]),
    ...body,
    ...capBottom(-length, body[body.length - 1][1]),
  ];
  const mesh = latheMesh(profile, material, radial);
  if (squash !== 1) mesh.scale.z = squash;
  return mesh;
}

function ball(r: number, material: THREE.Material, scale: Vec3 = [1, 1, 1], pos: Vec3 = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 11), material);
  mesh.scale.set(...scale);
  mesh.position.set(...pos);
  return mesh;
}

function node(parent: THREE.Object3D, x: number, y: number, z: number) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

type Hand = {
  group: THREE.Group;
  setGrip: (t: number) => void;
};

function buildHand(skin: THREE.Material, side: 1 | -1): Hand {
  const g = new THREE.Group();
  const thumbSide = -side;

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.082, 0.028), skin);
  palm.position.set(0, -0.046, 0);
  g.add(palm);
  g.add(ball(0.026, skin, [1, 1.25, 0.85], [thumbSide * 0.026, -0.036, -0.004]));
  g.add(ball(0.031, skin, [1.05, 1, 0.8], [0, -0.084, 0]));

  const knuckleY = -0.086;
  const proximals: THREE.Object3D[] = [];
  const distals: THREE.Object3D[] = [];
  const lengths: [number, number][] = [
    [0.041, 0.032],
    [0.045, 0.035],
    [0.042, 0.033],
    [0.034, 0.026],
  ];
  const radii = [0.0116, 0.0120, 0.0113, 0.0100];

  for (let i = 0; i < 4; i++) {
    const x = thumbSide * (0.0295 - i * 0.0197);
    const base = node(g, x, knuckleY, 0.001);
    base.rotation.z = thumbSide * (0.04 - i * 0.03);
    const [pl, dl] = lengths[i];
    const r = radii[i];
    base.add(limb(pl, [[0, r], [0.55, r * 0.96], [1, r * 0.88]], skin, 7));
    const mid = node(base, 0, -pl, 0);
    mid.add(limb(dl, [[0, r * 0.86], [0.6, r * 0.8], [1, r * 0.66]], skin, 7));
    proximals.push(base);
    distals.push(mid);
  }

  const thumbBase = node(g, thumbSide * 0.036, -0.03, 0.002);
  thumbBase.rotation.set(0.25, 0, thumbSide * 0.95);
  thumbBase.add(limb(0.036, [[0, 0.0142], [1, 0.0126]], skin, 8));
  const thumbTip = node(thumbBase, 0, -0.036, 0);
  thumbTip.add(limb(0.031, [[0, 0.0122], [1, 0.0098]], skin, 8));

  return {
    group: g,
    setGrip(t) {
      const k = Math.max(0, Math.min(1, t));
      for (let i = 0; i < 4; i++) {
        proximals[i].rotation.x = k * (1.28 + i * 0.05);
        distals[i].rotation.x = k * 1.34;
      }
      thumbBase.rotation.x = 0.25 + k * 0.34;
      thumbBase.rotation.z = thumbSide * (0.95 - k * 0.34);
      thumbTip.rotation.x = k * 0.72;
      thumbTip.rotation.z = thumbSide * k * 0.55;
    },
  };
}

function buildShoe(parent: THREE.Object3D, skin: THREE.Material) {
  const shoe = mat(PALETTE.shoe, 0.68);
  const accent = mat(PALETTE.shoeAccent, 0.55);
  const sole = mat(PALETTE.shoeSole, 0.85);

  const g = new THREE.Group();
  const len = SEG.foot;
  const midZ = len / 2 - 0.078;

  const outsole = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.024, len), sole);
  outsole.position.set(0, -0.058, midZ);
  g.add(outsole);

  const midsole = new THREE.Mesh(new THREE.BoxGeometry(0.099, 0.019, len - 0.012), shoe);
  midsole.position.set(0, -0.038, midZ);
  g.add(midsole);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.15), shoe);
  upper.position.set(0, -0.008, midZ - 0.03);
  g.add(upper);

  const heel = ball(0.048, shoe, [0.95, 0.95, 0.9], [0, -0.014, midZ - len / 2 + 0.05]);
  g.add(heel);

  const toe = ball(0.049, shoe, [1.0, 0.62, 1.5], [0, -0.026, midZ + len / 2 - 0.075]);
  g.add(toe);

  const swoosh = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.012, 0.09), accent);
  swoosh.position.set(0, -0.026, midZ + 0.01);
  swoosh.rotation.x = 0.12;
  g.add(swoosh);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 6, 12), shoe);
  collar.rotation.x = Math.PI / 2 - 0.3;
  collar.position.set(0, 0.014, midZ - 0.082);
  g.add(collar);

  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.036, 0.05, 10), skin);
  shank.position.set(0, 0.03, midZ - 0.086);
  g.add(shank);

  parent.add(g);
  return g;
}

function buildHead(parent: THREE.Object3D, skin: THREE.Material) {
  const hair = mat(PALETTE.hair, 0.92);
  const eye = mat(PALETTE.eye, 0.35);

  const skull = ball(0.098, skin, [0.94, 1.1, 1.0], [0, 0.058, 0]);
  parent.add(skull);

  const jaw = ball(0.072, skin, [0.94, 0.86, 1.02], [0, 0.008, 0.012]);
  parent.add(jaw);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.014, 0.03), skin);
  brow.position.set(0, 0.082, 0.078);
  brow.rotation.x = -0.12;
  parent.add(brow);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.042, 8), skin);
  nose.rotation.x = Math.PI / 2 + 0.5;
  nose.position.set(0, 0.046, 0.094);
  parent.add(nose);

  [1, -1].forEach((s) => {
    parent.add(ball(0.011, eye, [1, 0.78, 0.6], [s * 0.034, 0.064, 0.084]));
    const ear = ball(0.024, skin, [0.42, 1.05, 0.78], [s * 0.094, 0.05, -0.004]);
    parent.add(ear);
  });

  const cap = ball(0.101, hair, [0.98, 1.06, 1.02], [0, 0.068, -0.008]);
  parent.add(cap);
  const backHair = ball(0.086, hair, [1.0, 0.9, 0.86], [0, 0.038, -0.036]);
  parent.add(backHair);
}

export function buildHumanoid(): Humanoid {
  const skin = mat(PALETTE.skin, 0.66);
  const skinShade = mat(PALETTE.skinShade, 0.7);
  const shirt = mat(PALETTE.shirt, 0.86);
  const shirtTrim = mat(PALETTE.shirtTrim, 0.86);
  const shorts = mat(PALETTE.shorts, 0.88);
  const shortsTrim = mat(PALETTE.shortsTrim, 0.84);

  const root = new THREE.Group();

  const hips = node(root, 0, 0, 0);
  const pelvis = latheMesh(
    [
      ...capTop(0.075, 0.118),
      [0.075, 0.118],
      [0.02, 0.128],
      [-0.04, 0.122],
      [-0.085, 0.105],
      ...capBottom(-0.085, 0.105),
    ],
    shorts,
    16
  );
  pelvis.scale.set(1.06, 1, 0.8);
  hips.add(pelvis);
  const waistband = new THREE.Mesh(new THREE.TorusGeometry(0.124, 0.011, 6, 20), shortsTrim);
  waistband.rotation.x = Math.PI / 2;
  waistband.position.y = 0.072;
  waistband.scale.set(1.06, 1, 0.8);
  hips.add(waistband);

  const spine = node(hips, 0, SEG.pelvisToSpine, 0);
  const abdomen = latheMesh(
    [
      ...capTop(0.1, 0.112),
      [0.1, 0.112],
      [0.05, 0.108],
      [-0.01, 0.112],
      [-0.06, 0.122],
      ...capBottom(-0.06, 0.122),
    ],
    shirt,
    16
  );
  abdomen.scale.set(1.14, 1, 0.78);
  spine.add(abdomen);

  const chest = node(spine, 0, SEG.spineToChest, 0);
  const ribcage = latheMesh(
    [
      ...capTop(0.17, 0.138),
      [0.17, 0.138],
      [0.115, 0.152],
      [0.05, 0.152],
      [-0.02, 0.14],
      [-0.075, 0.12],
      ...capBottom(-0.075, 0.12),
    ],
    shirt,
    18
  );
  ribcage.scale.set(1.24, 1, 0.74);
  chest.add(ribcage);

  [1, -1].forEach((s) => {
    const pec = ball(0.062, shirt, [1.15, 0.85, 0.62], [s * 0.058, 0.088, 0.098]);
    chest.add(pec);
    const trap = ball(0.058, skin, [1.5, 0.62, 0.9], [s * 0.085, SEG.shoulderY + 0.012, -0.012]);
    chest.add(trap);
  });

  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.018), shirtTrim);
  strapL.position.set(0.088, SEG.shoulderY - 0.05, 0.072);
  strapL.rotation.set(0.16, 0, 0.1);
  chest.add(strapL);
  const strapR = strapL.clone();
  strapR.position.x = -0.088;
  strapR.rotation.z = -0.1;
  chest.add(strapR);

  const neck = node(chest, 0, SEG.chestToNeck, 0);
  const neckMesh = limb(0.09, [[0, 0.052], [1, 0.058]], skin, 12);
  neckMesh.position.y = 0.055;
  neck.add(neckMesh);

  const head = node(neck, 0, SEG.neckToHead, 0);
  buildHead(head, skin);

  function arm(side: 1 | -1) {
    const shoulder = node(chest, SEG.shoulderX * side, SEG.shoulderY, 0);
    const deltoid = ball(0.072, skin, [1.0, 1.02, 0.94], [side * 0.006, -0.012, 0]);
    shoulder.add(deltoid);
    shoulder.add(
      limb(
        SEG.upperArm,
        [
          [0, 0.062],
          [0.28, 0.066],
          [0.62, 0.055],
          [1, 0.045],
        ],
        skin,
        14,
        0.95
      )
    );

    const elbow = node(shoulder, 0, -SEG.upperArm, 0);
    elbow.add(ball(0.046, skinShade, [1, 0.9, 1], [0, 0.004, 0]));
    elbow.add(
      limb(
        SEG.forearm,
        [
          [0, 0.048],
          [0.22, 0.054],
          [0.68, 0.037],
          [1, 0.029],
        ],
        skin,
        14,
        0.94
      )
    );

    const wrist = node(elbow, 0, -SEG.forearm, 0);
    const hand = buildHand(skin, side);
    wrist.add(hand.group);

    return { shoulder, elbow, wrist, hand };
  }

  const left = arm(1);
  const right = arm(-1);

  function leg(side: 1 | -1) {
    const hip = node(hips, SEG.hipX * side, -HIP_DROP, 0);
    hip.add(
      limb(
        SEG.thigh,
        [
          [0, 0.104],
          [0.26, 0.108],
          [0.66, 0.086],
          [1, 0.07],
        ],
        skin,
        16,
        0.94
      )
    );
    const cuff = latheMesh(
      [
        ...capTop(0.02, 0.112),
        [0.02, 0.112],
        [-0.14, 0.108],
        [-0.17, 0.104],
        ...capBottom(-0.17, 0.104),
      ],
      shorts,
      16
    );
    cuff.scale.set(1, 1, 0.94);
    hip.add(cuff);

    const knee = node(hip, 0, -SEG.thigh, 0);
    knee.add(ball(0.064, skinShade, [1, 0.94, 1.02], [0, 0.006, 0.008]));
    knee.add(
      limb(
        SEG.shin,
        [
          [0, 0.068],
          [0.18, 0.076],
          [0.5, 0.056],
          [1, 0.036],
        ],
        skin,
        14,
        0.92
      )
    );

    const ankle = node(knee, 0, -SEG.shin, 0);
    buildShoe(ankle, skin);

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

  left.hand.setGrip(0.85);
  right.hand.setGrip(0.85);

  const gripL = node(left.wrist, 0, -GRIP_DROP, 0);
  const gripR = node(right.wrist, 0, -GRIP_DROP, 0);

  return {
    root,
    joints,
    worldOf: (name) => joints[name].getWorldPosition(new THREE.Vector3()),
    gripOf: (side) => (side === 'L' ? gripL : gripR).getWorldPosition(new THREE.Vector3()),
    setGrip: (t) => {
      left.hand.setGrip(t);
      right.hand.setGrip(t);
    },
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
  rig.setGrip(pose.grip ?? 0.85);
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

  const ga = a.grip ?? 0.85;
  const gb = b.grip ?? 0.85;
  rig.setGrip(ga + (gb - ga) * t);
}
