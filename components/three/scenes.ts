import * as THREE from 'three';
import type { Rig as RigRef } from '~/lib/data/exercises';
import {
  box,
  contactShadow,
  cylinder,
  dHandle,
  dumbbell,
  floor,
  handleBar,
  Link,
  MATS,
  pad,
  pulley,
  tube,
  weightStack,
} from './parts';
import {
  HIP_DROP,
  HIP_HEIGHT,
  HIP_SEATED,
  SHIN,
  SOLE,
  THIGH,
  type Humanoid,
  type Pose,
  type Vec3,
} from './rig';

export type SceneBuild = {
  group: THREE.Group;
  camera: { pos: Vec3; target: Vec3 };
  start: Pose;
  end: Pose;
  /** Runs every frame with the eased rep progress (0 = start, 1 = contracted). */
  update?: (t: number, rig: Humanoid) => void;
};

const X_AXIS = new THREE.Vector3(1, 0, 0);
const SEAT_TOP = 0.44;

// ── shared helpers ──────────────────────────────────────────────────────

/** A run of cable through an ordered list of points, rebuilt each frame. */
class CableRun {
  private links: Link[] = [];

  constructor(parent: THREE.Object3D, segments: number, radius = 0.011) {
    for (let i = 0; i < segments; i++) {
      const l = new Link(radius, MATS.cable, 6);
      parent.add(l.mesh);
      this.links.push(l);
    }
  }

  set(points: THREE.Vector3[]) {
    for (let i = 0; i < this.links.length; i++) {
      if (i < points.length - 1) {
        this.links[i].mesh.visible = true;
        this.links[i].set(points[i], points[i + 1]);
      } else {
        this.links[i].mesh.visible = false;
      }
    }
  }
}

const _l = new THREE.Vector3();
const _r = new THREE.Vector3();
const _d = new THREE.Vector3();

/** Snaps a bar/handle to sit in both hands, tilting with them. */
function toHands(bar: THREE.Object3D, rig: Humanoid, drop = 0.07) {
  _l.copy(rig.worldOf('wristL'));
  _r.copy(rig.worldOf('wristR'));
  bar.position.copy(_l).add(_r).multiplyScalar(0.5);
  bar.position.y -= drop;
  _d.subVectors(_l, _r);
  if (_d.lengthSq() > 1e-6) bar.quaternion.setFromUnitVectors(X_AXIS, _d.normalize());
}

/** Snaps a single handle into one hand. */
function toHand(obj: THREE.Object3D, rig: Humanoid, side: 'L' | 'R', drop = 0.07) {
  obj.position.copy(rig.worldOf(side === 'L' ? 'wristL' : 'wristR'));
  obj.position.y -= drop;
}

function seatUnit(parent: THREE.Object3D, z = 0, backAngle = -0.12, withBack = true) {
  const g = new THREE.Group();
  g.position.z = z;
  // seat pan
  pad(g, [0.42, 0.09, 0.4], [0, SEAT_TOP, 0]);
  // pedestal
  cylinder(g, 0.05, SEAT_TOP - 0.05, [0, (SEAT_TOP - 0.05) / 2, 0], MATS.frame);
  box(g, [0.44, 0.05, 0.5], [0, 0.03, 0], MATS.frameDark);
  if (withBack) {
    pad(g, [0.4, 0.11, 0.52], [0, SEAT_TOP + 0.3, -0.22], [backAngle, 0, 0]);
    tube(g, [0, SEAT_TOP, -0.2], [0, SEAT_TOP + 0.58, -0.28], 0.03);
  }
  parent.add(g);
  return g;
}

/**
 * Two-link IK for a leg.
 *
 * Poses are authored as "the hips are here, the feet are planted there", and
 * this works out the joint angles. Doing it analytically matters because the
 * root group carries the torso lean — without solving for it, any pose with a
 * forward lean or a hip drop rotates the legs too and drives the feet through
 * the floor.
 *
 * `rootY`/`rootZ` locate the root origin; `footZ` is where the foot is planted;
 * `rootRot` is the torso lean that must be cancelled out of the hip angle.
 */
function legIK(opts: {
  rootY: number;
  rootZ?: number;
  rootRot?: number;
  footZ: number;
  footY?: number;
}) {
  const { rootY, rootZ = 0, rootRot = 0, footZ, footY = SOLE } = opts;
  const hipY = rootY - HIP_DROP;

  const dy = footY - hipY; // negative: the foot is below the hip
  const dz = footZ - rootZ;

  const reach = Math.hypot(dy, dz);
  const d = Math.min(THIGH + SHIN - 0.012, Math.max(Math.abs(THIGH - SHIN) + 0.012, reach));

  // Our convention: a limb points along -Y, and a negative X rotation swings
  // it toward +Z, so the straight-line angle to the target is -atan2(dz, -dy).
  const line = -Math.atan2(dz, -dy);
  const alpha = Math.acos(
    Math.min(1, Math.max(-1, (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d)))
  );
  const beta = Math.acos(
    Math.min(1, Math.max(-1, (THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN)))
  );

  const thigh = line - alpha; // world angle of the femur (knee leads forward)
  const shin = thigh + (Math.PI - beta);

  return { hip: thigh - rootRot, knee: shin - thigh, ankle: -shin };
}

/** Expands an IK result into a left/right joint set with a touch of stance splay. */
function legPose(
  ik: ReturnType<typeof legIK>,
  splay = 0.05
): Partial<Pose['joints']> {
  return {
    hipL: [ik.hip, splay, splay * 0.7],
    hipR: [ik.hip, -splay, -splay * 0.7],
    kneeL: [ik.knee, 0, 0],
    kneeR: [ik.knee, 0, 0],
    ankleL: [ik.ankle, 0, 0],
    ankleR: [ik.ankle, 0, 0],
  };
}

type LegOpts = {
  /** Torso lean carried on the root, which the hip angle must cancel. */
  lean?: number;
  rootY?: number;
  rootZ?: number;
  footZ?: number;
  /** Raise this when the feet rest on a platform rather than the floor. */
  footY?: number;
  splay?: number;
};

/** Seated baseline: feet planted in front of the seat. */
function seatedLegs(o: LegOpts = {}) {
  const { lean = 0, rootY = HIP_SEATED, rootZ = 0, footZ = 0.46, footY = SOLE, splay = 0.05 } = o;
  return legPose(legIK({ rootY, rootZ, rootRot: lean, footZ, footY }), splay);
}

/** Standing baseline; `lean` is the torso hinge the legs must cancel. */
function standingLegs(o: LegOpts = {}) {
  const { lean = 0, rootY = HIP_HEIGHT, rootZ = 0, footZ = 0, footY = SOLE, splay = 0.05 } = o;
  return legPose(legIK({ rootY, rootZ, rootRot: lean, footZ, footY }), splay);
}

function baseScene() {
  const group = new THREE.Group();
  floor(group);
  return group;
}

// ── machines ────────────────────────────────────────────────────────────

function latPulldown(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const machine = new THREE.Group();

  // upright tower behind the lifter
  tube(machine, [0.3, 0, -0.9], [0.3, 2.16, -0.9], 0.05);
  tube(machine, [-0.3, 0, -0.9], [-0.3, 2.16, -0.9], 0.05);
  tube(machine, [-0.3, 2.16, -0.9], [0.3, 2.16, -0.9], 0.045);
  // overhead arm reaching out over the seat
  tube(machine, [0, 2.14, -0.9], [0, 2.14, 0.14], 0.045);
  box(machine, [1.0, 0.06, 1.1], [0, 0.03, -0.55], MATS.frameDark);

  const top = pulley(machine, [0, 2.06, 0.1]);
  const stackTop = pulley(machine, [0, 2.06, -0.86], 0.05);
  const stack = weightStack(machine, [0, 0.06, -0.86], 12, 5);

  seatUnit(machine, 0, -0.1, true);
  // thigh restraint pad
  pad(machine, [0.44, 0.1, 0.16], [0, 0.68, 0.26]);
  tube(machine, [0.2, SEAT_TOP + 0.02, 0.2], [0.2, 0.68, 0.26], 0.026, MATS.chrome);
  tube(machine, [-0.2, SEAT_TOP + 0.02, 0.2], [-0.2, 0.68, 0.26], 0.026, MATS.chrome);

  const bar = handleBar(machine, 1.16);
  // angled ends, the classic lat bar silhouette
  cylinder(bar, 0.018, 0.2, [0.6, 0.06, 0], MATS.chrome, [0, 0, -0.5]);
  cylinder(bar, 0.018, 0.2, [-0.6, 0.06, 0], MATS.chrome, [0, 0, 0.5]);

  const cable = new CableRun(machine, 3);
  g.add(machine);
  contactShadow(g, 0.8);
  g.add(rig.root);

  const start: Pose = {
    root: { pos: [0, HIP_SEATED, 0], rot: [-0.08, 0, 0] },
    joints: {
      ...seatedLegs(),
      spine: [-0.04, 0, 0],
      chest: [-0.04, 0, 0],
      neck: [0.12, 0, 0],
      shoulderL: [-2.62, 0, 0.34],
      shoulderR: [-2.62, 0, -0.34],
      elbowL: [-0.16, 0, 0],
      elbowR: [-0.16, 0, 0],
      wristL: [0, 0, 0.2],
      wristR: [0, 0, -0.2],
    },
  };

  const end: Pose = {
    root: { pos: [0, HIP_SEATED, 0], rot: [-0.19, 0, 0] },
    joints: {
      ...seatedLegs(),
      spine: [0.04, 0, 0],
      chest: [0.06, 0, 0],
      neck: [-0.06, 0, 0],
      shoulderL: [-0.42, 0, 0.52],
      shoulderR: [-0.42, 0, -0.52],
      elbowL: [-2.16, 0, 0],
      elbowR: [-2.16, 0, 0],
      wristL: [0, 0, 0.16],
      wristR: [0, 0, -0.16],
    },
  };

  return {
    group: g,
    camera: { pos: [2.5, 1.65, 2.5], target: [0, 1.15, 0] },
    start,
    end,
    update(t, r) {
      toHands(bar, r, 0.06);
      stack.setLift(t, 0.36);
      cable.set([
        bar.position.clone().setY(bar.position.y + 0.02),
        top,
        stackTop,
        stack.carriage.getWorldPosition(new THREE.Vector3()),
      ]);
    },
  };
}

function seatedRow(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  // long rail running away from the lifter
  box(m, [0.4, 0.1, 1.7], [0, 0.06, -0.55], MATS.frameDark);
  tube(m, [0, 0.4, -0.82], [0, 1.05, -0.9], 0.05);
  box(m, [0.62, 0.34, 0.14], [0, 0.17, -0.78], MATS.frame); // foot plate
  seatUnit(m, 0.05, -0.06, false);

  const front = pulley(m, [0, 0.6, -0.84], 0.05);
  const stack = weightStack(m, [0, 0.06, -1.24], 11, 4);
  const stackTop = pulley(m, [0, 1.08, -1.24], 0.05);
  tube(m, [0, 1.05, -0.9], [0, 1.05, -1.24], 0.04);

  const handle = new THREE.Group();
  // V-handle: two grips angled toward each other
  cylinder(handle, 0.019, 0.22, [0.075, 0, 0.02], MATS.grip, [0.3, 0, 0.22]);
  cylinder(handle, 0.019, 0.22, [-0.075, 0, 0.02], MATS.grip, [0.3, 0, -0.22]);
  cylinder(handle, 0.014, 0.14, [0, 0.1, -0.02], MATS.chrome);
  m.add(handle);

  const cable = new CableRun(m, 3);
  g.add(m);
  contactShadow(g, 0.75);
  g.add(rig.root);

  // Feet are up on the machine's platform, not the floor.
  const PLATE_Y = 0.34;
  const legOpts = { rootY: HIP_SEATED + 0.02, rootZ: 0.05, footZ: -0.62, footY: PLATE_Y + SOLE };
  const legsStart = seatedLegs({ ...legOpts, lean: 0.34 });
  const legsEnd = seatedLegs({ ...legOpts, lean: -0.06 });

  const start: Pose = {
    root: { pos: [0, HIP_SEATED + 0.02, 0.05], rot: [0.34, 0, 0] },
    joints: {
      ...legsStart,
      spine: [0.06, 0, 0],
      chest: [0.06, 0, 0],
      neck: [-0.24, 0, 0],
      shoulderL: [-1.42, 0, 0.12],
      shoulderR: [-1.42, 0, -0.12],
      elbowL: [-0.2, 0, 0],
      elbowR: [-0.2, 0, 0],
    },
  };

  const end: Pose = {
    root: { pos: [0, HIP_SEATED + 0.02, 0.05], rot: [-0.06, 0, 0] },
    joints: {
      ...legsEnd,
      spine: [-0.05, 0, 0],
      chest: [-0.06, 0, 0],
      neck: [0.02, 0, 0],
      shoulderL: [0.34, 0, 0.06],
      shoulderR: [0.34, 0, -0.06],
      elbowL: [-2.32, 0, 0],
      elbowR: [-2.32, 0, 0],
    },
  };

  return {
    group: g,
    camera: { pos: [2.7, 1.5, 1.9], target: [0, 0.95, -0.5] },
    start,
    end,
    update(t, r) {
      toHands(handle, r, 0.06);
      stack.setLift(t, 0.3);
      cable.set([
        handle.position.clone(),
        front,
        stackTop,
        stack.carriage.getWorldPosition(new THREE.Vector3()),
      ]);
    },
  };
}

function chestSupportedRow(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.9, 0.08, 1.2], [0, 0.05, -0.15], MATS.frameDark);
  // seat + angled chest pad
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP, 0.16]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, 0.16], MATS.frame);
  pad(m, [0.42, 0.12, 0.62], [0, 0.98, -0.24], [0.28, 0, 0]);
  tube(m, [0, 0.4, -0.34], [0, 1.2, -0.16], 0.05);

  // handle towers on both sides
  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    cylinder(a, 0.022, 0.3, [0, 0, 0], MATS.chrome, [Math.PI / 2, 0, 0]);
    cylinder(a, 0.026, 0.16, [0, 0, 0.12], MATS.grip);
    a.position.set(0.3 * s, 0.96, 0.2);
    m.add(a);
    arms.push(a);
  });
  tube(m, [0.44, 0.2, -0.5], [0.44, 1.05, -0.1], 0.045);
  tube(m, [-0.44, 0.2, -0.5], [-0.44, 1.05, -0.1], 0.045);
  const stack = weightStack(m, [0, 0.06, -0.62], 10, 4);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const legs = seatedLegs({ lean: 0.3, rootZ: 0.16, footZ: 0.6 });

  const start: Pose = {
    root: { pos: [0, HIP_SEATED, 0.16], rot: [0.3, 0, 0] },
    joints: {
      ...legs,
      neck: [-0.2, 0, 0],
      shoulderL: [-1.2, 0, 0.18],
      shoulderR: [-1.2, 0, -0.18],
      elbowL: [-0.24, 0, 0],
      elbowR: [-0.24, 0, 0],
    },
  };

  const end: Pose = {
    root: { pos: [0, HIP_SEATED, 0.16], rot: [0.3, 0, 0] },
    joints: {
      ...legs,
      neck: [-0.16, 0, 0],
      shoulderL: [0.42, 0, 0.06],
      shoulderR: [0.42, 0, -0.06],
      elbowL: [-2.34, 0, 0],
      elbowR: [-2.34, 0, 0],
    },
  };

  return {
    group: g,
    camera: { pos: [2.4, 1.6, 2.2], target: [0, 1.0, 0] },
    start,
    end,
    update(t, r) {
      toHand(arms[0], r, 'L', 0.05);
      toHand(arms[1], r, 'R', 0.05);
      stack.setLift(t, 0.26);
    },
  };
}

function assistedPullup(rig: Humanoid, variant?: string): SceneBuild {
  const isDip = variant === 'dip';
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [1.3, 0.09, 1.1], [0, 0.05, -0.2], MATS.frameDark);
  tube(m, [0.52, 0, -0.5], [0.52, 2.34, -0.5], 0.055);
  tube(m, [-0.52, 0, -0.5], [-0.52, 2.34, -0.5], 0.055);
  tube(m, [-0.52, 2.34, -0.5], [0.52, 2.34, -0.5], 0.05);
  tube(m, [0.5, 2.3, -0.5], [0.5, 2.3, 0.12], 0.042);
  tube(m, [-0.5, 2.3, -0.5], [-0.5, 2.3, 0.12], 0.042);

  // pull-up bar with angled grips
  const bar = new THREE.Group();
  cylinder(bar, 0.021, 1.0, [0, 2.28, 0.08], MATS.chrome, [0, 0, Math.PI / 2]);
  cylinder(bar, 0.024, 0.22, [0.44, 2.22, 0.08], MATS.grip, [0, 0, 0.55]);
  cylinder(bar, 0.024, 0.22, [-0.44, 2.22, 0.08], MATS.grip, [0, 0, -0.55]);
  m.add(bar);

  // dip handles
  const dipBars = new THREE.Group();
  cylinder(dipBars, 0.023, 0.34, [0.32, 1.06, 0.06], MATS.grip, [Math.PI / 2, 0, 0]);
  cylinder(dipBars, 0.023, 0.34, [-0.32, 1.06, 0.06], MATS.grip, [Math.PI / 2, 0, 0]);
  tube(dipBars, [0.32, 1.06, -0.1], [0.5, 1.4, -0.4], 0.03);
  tube(dipBars, [-0.32, 1.06, -0.1], [-0.5, 1.4, -0.4], 0.03);
  dipBars.visible = isDip;
  m.add(dipBars);

  // counterweight knee/foot platform
  const platform = box(m, [0.5, 0.1, 0.34], [0, 0.62, 0.06], MATS.pad);
  platform.visible = !isDip;
  const seat = pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP, 0.1]);
  const seatBack = pad(m, [0.4, 0.1, 0.5], [0, SEAT_TOP + 0.32, -0.14], [-0.12, 0, 0]);
  seat.visible = isDip;
  seatBack.visible = isDip;

  const stack = weightStack(m, [0, 0.06, -0.72], 11, 6);
  const topPulley = pulley(m, [0, 2.2, -0.62], 0.05);
  const cable = new CableRun(m, 2);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  if (isDip) {
    const legs = {
      hipL: [-1.42, 0.06, 0.04],
      hipR: [-1.42, -0.06, -0.04],
      kneeL: [1.4, 0, 0],
      kneeR: [1.4, 0, 0],
    } as Partial<Pose['joints']>;
    return {
      group: g,
      camera: { pos: [2.4, 1.7, 2.4], target: [0, 1.05, 0] },
      start: {
        root: { pos: [0, HIP_SEATED, 0.1], rot: [-0.04, 0, 0] },
        joints: {
          ...legs,
          shoulderL: [0.1, 0, 0.2],
          shoulderR: [0.1, 0, -0.2],
          elbowL: [-1.86, 0, 0],
          elbowR: [-1.86, 0, 0],
        },
      },
      end: {
        root: { pos: [0, HIP_SEATED, 0.1], rot: [-0.04, 0, 0] },
        joints: {
          ...legs,
          shoulderL: [0.34, 0, 0.1],
          shoulderR: [0.34, 0, -0.1],
          elbowL: [-0.06, 0, 0],
          elbowR: [-0.06, 0, 0],
        },
      },
      update(t) {
        stack.setLift(t, 0.28);
      },
    };
  }

  // kneeling on the assist platform, hanging from the bar
  const kneeling = {
    hipL: [-0.6, 0.06, 0.05],
    hipR: [-0.6, -0.06, -0.05],
    kneeL: [2.2, 0, 0],
    kneeR: [2.2, 0, 0],
    ankleL: [-0.5, 0, 0],
    ankleR: [-0.5, 0, 0],
  } as Partial<Pose['joints']>;

  return {
    group: g,
    camera: { pos: [2.6, 1.9, 2.6], target: [0, 1.5, 0] },
    start: {
      root: { pos: [0, 1.12, 0.06], rot: [-0.04, 0, 0] },
      joints: {
        ...kneeling,
        neck: [0.14, 0, 0],
        shoulderL: [-2.98, 0, 0.3],
        shoulderR: [-2.98, 0, -0.3],
        elbowL: [-0.08, 0, 0],
        elbowR: [-0.08, 0, 0],
      },
    },
    end: {
      root: { pos: [0, 1.56, 0.02], rot: [-0.1, 0, 0] },
      joints: {
        ...kneeling,
        neck: [-0.04, 0, 0],
        shoulderL: [-2.5, 0, 0.62],
        shoulderR: [-2.5, 0, -0.62],
        elbowL: [-1.72, 0, 0],
        elbowR: [-1.72, 0, 0],
      },
    },
    update(t, r) {
      // the counterweight platform rides up with the lifter's knees
      platform.position.y = r.worldOf('kneeL').y - 0.08;
      stack.setLift(1 - t, 0.3);
      cable.set([
        new THREE.Vector3(0, platform.position.y + 0.05, -0.1),
        topPulley,
        stack.carriage.getWorldPosition(new THREE.Vector3()),
      ]);
    },
  };
}

function chestPress(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.95, 0.09, 1.25], [0, 0.05, -0.25], MATS.frameDark);
  seatUnit(m, 0.05, -0.16, true);
  tube(m, [0.46, 0.1, -0.5], [0.46, 1.42, -0.34], 0.05);
  tube(m, [-0.46, 0.1, -0.5], [-0.46, 1.42, -0.34], 0.05);
  tube(m, [0.46, 1.42, -0.34], [-0.46, 1.42, -0.34], 0.042);

  // press arms that pivot forward
  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    cylinder(a, 0.024, 0.2, [0, 0, 0], MATS.grip, [Math.PI / 2, 0, 0]);
    cylinder(a, 0.02, 0.18, [0, 0.1, -0.02], MATS.chrome);
    a.position.set(0.34 * s, 1.02, 0.24);
    m.add(a);
    arms.push(a);
  });

  const linkage = [new Link(0.028, MATS.frame, 8), new Link(0.028, MATS.frame, 8)];
  linkage.forEach((l) => m.add(l.mesh));
  const stack = weightStack(m, [0, 0.06, -0.78], 12, 5);

  g.add(m);
  contactShadow(g, 0.75);
  g.add(rig.root);

  const legs = seatedLegs();

  return {
    group: g,
    camera: { pos: [2.6, 1.55, 2.3], target: [0, 1.05, 0] },
    start: {
      root: { pos: [0, HIP_SEATED, 0.05], rot: [-0.12, 0, 0] },
      joints: {
        ...legs,
        chest: [0.03, 0, 0],
        shoulderL: [0.24, 0, 0.66],
        shoulderR: [0.24, 0, -0.66],
        elbowL: [-1.9, 0, 0],
        elbowR: [-1.9, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, 0.05], rot: [-0.12, 0, 0] },
      joints: {
        ...legs,
        chest: [-0.04, 0, 0],
        shoulderL: [-1.36, 0, 0.28],
        shoulderR: [-1.36, 0, -0.28],
        elbowL: [-0.2, 0, 0],
        elbowR: [-0.2, 0, 0],
      },
    },
    update(t, r) {
      toHand(arms[0], r, 'L', 0.04);
      toHand(arms[1], r, 'R', 0.04);
      linkage[0].set(new THREE.Vector3(0.46, 1.4, -0.34), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.46, 1.4, -0.34), arms[1].position);
      stack.setLift(t, 0.3);
    },
  };
}

function pecDeck(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.9, 0.09, 1.2], [0, 0.05, -0.2], MATS.frameDark);
  seatUnit(m, 0.05, -0.1, true);
  tube(m, [0, 0.6, -0.42], [0, 1.72, -0.42], 0.055);
  tube(m, [-0.34, 1.68, -0.42], [0.34, 1.68, -0.42], 0.042);

  // swing arms with vertical forearm pads
  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    pad(a, [0.32, 0.1, 0.13], [0, 0.06, 0], [Math.PI / 2, 0, 0]);
    cylinder(a, 0.022, 0.34, [0, 0, 0], MATS.chrome);
    m.add(a);
    arms.push(a);
  });

  const linkage = [new Link(0.03, MATS.frame, 8), new Link(0.03, MATS.frame, 8)];
  linkage.forEach((l) => m.add(l.mesh));
  const stack = weightStack(m, [0, 0.06, -0.8], 10, 4);

  g.add(m);
  contactShadow(g, 0.72);
  g.add(rig.root);

  const legs = seatedLegs();

  return {
    group: g,
    camera: { pos: [2.5, 1.6, 2.5], target: [0, 1.05, 0] },
    start: {
      root: { pos: [0, HIP_SEATED, 0.05], rot: [-0.08, 0, 0] },
      joints: {
        ...legs,
        chest: [0.05, 0, 0],
        shoulderL: [-1.36, 0, 1.15],
        shoulderR: [-1.36, 0, -1.15],
        elbowL: [-0.62, 0, 0],
        elbowR: [-0.62, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, 0.05], rot: [-0.08, 0, 0] },
      joints: {
        ...legs,
        chest: [-0.03, 0, 0],
        shoulderL: [-1.5, 0, 0.12],
        shoulderR: [-1.5, 0, -0.12],
        elbowL: [-0.62, 0, 0],
        elbowR: [-0.62, 0, 0],
      },
    },
    update(t, r) {
      toHand(arms[0], r, 'L', 0.0);
      toHand(arms[1], r, 'R', 0.0);
      linkage[0].set(new THREE.Vector3(0.2, 1.66, -0.42), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.2, 1.66, -0.42), arms[1].position);
      stack.setLift(t, 0.28);
    },
  };
}

function shoulderPress(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.9, 0.09, 1.15], [0, 0.05, -0.2], MATS.frameDark);
  seatUnit(m, 0.05, -0.06, true);
  tube(m, [0.42, 0.1, -0.42], [0.42, 1.86, -0.32], 0.05);
  tube(m, [-0.42, 0.1, -0.42], [-0.42, 1.86, -0.32], 0.05);

  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    cylinder(a, 0.024, 0.2, [0, 0, 0], MATS.grip, [Math.PI / 2, 0, 0.35 * s]);
    m.add(a);
    arms.push(a);
  });
  const linkage = [new Link(0.026, MATS.chrome, 8), new Link(0.026, MATS.chrome, 8)];
  linkage.forEach((l) => m.add(l.mesh));

  const stack = weightStack(m, [0, 0.06, -0.72], 11, 4);

  g.add(m);
  contactShadow(g, 0.72);
  g.add(rig.root);

  const legs = seatedLegs();

  return {
    group: g,
    camera: { pos: [2.5, 1.8, 2.4], target: [0, 1.25, 0] },
    start: {
      root: { pos: [0, HIP_SEATED, 0.05], rot: [-0.03, 0, 0] },
      joints: {
        ...legs,
        shoulderL: [-0.16, 0, 1.3],
        shoulderR: [-0.16, 0, -1.3],
        elbowL: [-1.72, 0, 0],
        elbowR: [-1.72, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, 0.05], rot: [-0.03, 0, 0] },
      joints: {
        ...legs,
        shoulderL: [-0.1, 0, 2.86],
        shoulderR: [-0.1, 0, -2.86],
        elbowL: [-0.14, 0, 0],
        elbowR: [-0.14, 0, 0],
      },
    },
    update(t, r) {
      toHand(arms[0], r, 'L', 0.04);
      toHand(arms[1], r, 'R', 0.04);
      linkage[0].set(new THREE.Vector3(0.42, 1.84, -0.32), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.42, 1.84, -0.32), arms[1].position);
      stack.setLift(t, 0.3);
    },
  };
}

function lateralRaise(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.9, 0.09, 1.05], [0, 0.05, -0.15], MATS.frameDark);
  seatUnit(m, 0.02, -0.05, true);
  tube(m, [0, 0.55, -0.36], [0, 1.34, -0.36], 0.05);

  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    pad(a, [0.26, 0.1, 0.12], [0, 0, 0], [0, 0, Math.PI / 2]);
    cylinder(a, 0.02, 0.2, [0, 0.1, -0.06], MATS.chrome);
    m.add(a);
    arms.push(a);
  });
  const linkage = [new Link(0.028, MATS.frame, 8), new Link(0.028, MATS.frame, 8)];
  linkage.forEach((l) => m.add(l.mesh));
  const stack = weightStack(m, [0, 0.06, -0.66], 9, 3);

  g.add(m);
  contactShadow(g, 0.72);
  g.add(rig.root);

  const legs = seatedLegs();

  return {
    group: g,
    camera: { pos: [1.4, 1.6, 3.0], target: [0, 1.1, 0] },
    start: {
      root: { pos: [0, HIP_SEATED, 0.02], rot: [-0.02, 0, 0] },
      joints: {
        ...legs,
        shoulderL: [-0.1, 0, 0.16],
        shoulderR: [-0.1, 0, -0.16],
        elbowL: [-1.5, 0, 0],
        elbowR: [-1.5, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, 0.02], rot: [-0.02, 0, 0] },
      joints: {
        ...legs,
        shoulderL: [-0.1, 0, 1.52],
        shoulderR: [-0.1, 0, -1.52],
        elbowL: [-1.5, 0, 0],
        elbowR: [-1.5, 0, 0],
      },
    },
    update(t, r) {
      // pads ride on the outside of the upper arm, at the elbow
      arms[0].position.copy(r.worldOf('elbowL'));
      arms[1].position.copy(r.worldOf('elbowR'));
      linkage[0].set(new THREE.Vector3(0.06, 1.3, -0.36), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.06, 1.3, -0.36), arms[1].position);
      stack.setLift(t, 0.24);
    },
  };
}

function preacherCurl(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.85, 0.09, 1.0], [0, 0.05, -0.1], MATS.frameDark);
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP, -0.16]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, -0.16], MATS.frame);
  // the angled preacher pad
  pad(m, [0.52, 0.13, 0.5], [0, 0.94, 0.2], [0.62, 0, 0]);
  tube(m, [0, 0.3, 0.3], [0, 0.9, 0.24], 0.05);

  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    cylinder(a, 0.023, 0.16, [0, 0, 0], MATS.grip, [Math.PI / 2, 0, 0]);
    m.add(a);
    arms.push(a);
  });
  const linkage = [new Link(0.026, MATS.chrome, 8), new Link(0.026, MATS.chrome, 8)];
  linkage.forEach((l) => m.add(l.mesh));
  const stack = weightStack(m, [0, 0.06, 0.62], 9, 3);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const legs = seatedLegs({ lean: 0.32, rootZ: -0.16, footZ: 0.28 });
  const upperArm = { shoulderL: [-0.96, 0, 0.2], shoulderR: [-0.96, 0, -0.2] } as Partial<
    Pose['joints']
  >;

  return {
    group: g,
    camera: { pos: [2.2, 1.5, 2.4], target: [0, 1.0, 0.15] },
    start: {
      root: { pos: [0, HIP_SEATED, -0.16], rot: [0.32, 0, 0] },
      joints: {
        ...legs,
        ...upperArm,
        neck: [-0.28, 0, 0],
        elbowL: [-0.24, 0, 0],
        elbowR: [-0.24, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, -0.16], rot: [0.32, 0, 0] },
      joints: {
        ...legs,
        ...upperArm,
        neck: [-0.28, 0, 0],
        elbowL: [-2.5, 0, 0],
        elbowR: [-2.5, 0, 0],
      },
    },
    update(t, r) {
      toHand(arms[0], r, 'L', 0.05);
      toHand(arms[1], r, 'R', 0.05);
      linkage[0].set(new THREE.Vector3(0.2, 0.72, 0.42), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.2, 0.72, 0.42), arms[1].position);
      stack.setLift(t, 0.22);
    },
  };
}

function legPress(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  // 45-degree sled rails
  tube(m, [0.42, 0.12, 0.7], [0.42, 1.62, -0.86], 0.055);
  tube(m, [-0.42, 0.12, 0.7], [-0.42, 1.62, -0.86], 0.055);
  tube(m, [0.42, 0.12, 0.7], [-0.42, 0.12, 0.7], 0.05);
  box(m, [1.05, 0.08, 0.7], [0, 0.05, 0.75], MATS.frameDark);

  // reclined seat sits low, at the bottom of the rails
  pad(m, [0.46, 0.1, 0.5], [0, 0.42, 0.62], [0, 0, 0]);
  pad(m, [0.44, 0.12, 0.66], [0, 0.66, 0.92], [-1.16, 0, 0]);
  tube(m, [0, 0.1, 0.6], [0, 0.42, 0.62], 0.05);

  // moving sled with the foot platform
  const sled = new THREE.Group();
  box(sled, [0.62, 0.62, 0.07], [0, 0, 0], MATS.frameDark);
  box(sled, [0.66, 0.66, 0.02], [0, 0, 0.03], MATS.pad);
  [1, -1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 20), MATS.plate);
    p.rotation.x = Math.PI / 2;
    p.position.set(0.34 * s, 0.0, -0.08);
    sled.add(p);
  });
  sled.rotation.x = -0.72;
  m.add(sled);

  g.add(m);
  contactShadow(g, 0.8);
  g.add(rig.root);

  // reclined on the back pad, legs pushing up the 45° rails
  const start: Pose = {
    root: { pos: [0, 0.56, 0.62], rot: [-1.12, 0, 0] },
    joints: {
      hipL: [-1.05, 0.09, 0.06],
      hipR: [-1.05, -0.09, -0.06],
      kneeL: [1.62, 0, 0],
      kneeR: [1.62, 0, 0],
      ankleL: [-0.2, 0, 0],
      ankleR: [-0.2, 0, 0],
      neck: [0.45, 0, 0],
      shoulderL: [0.5, 0, 0.42],
      shoulderR: [0.5, 0, -0.42],
      elbowL: [-1.5, 0, 0],
      elbowR: [-1.5, 0, 0],
    },
  };

  const end: Pose = {
    root: { pos: [0, 0.56, 0.62], rot: [-1.12, 0, 0] },
    joints: {
      hipL: [-0.24, 0.05, 0.03],
      hipR: [-0.24, -0.05, -0.03],
      kneeL: [0.16, 0, 0],
      kneeR: [0.16, 0, 0],
      ankleL: [-0.1, 0, 0],
      ankleR: [-0.1, 0, 0],
      neck: [0.45, 0, 0],
      shoulderL: [0.5, 0, 0.42],
      shoulderR: [0.5, 0, -0.42],
      elbowL: [-1.5, 0, 0],
      elbowR: [-1.5, 0, 0],
    },
  };

  return {
    group: g,
    camera: { pos: [2.9, 1.7, 2.2], target: [0, 0.85, 0.1] },
    start,
    end,
    update(_t, r) {
      // the platform rides on the soles of the feet
      const a = r.worldOf('ankleL').add(r.worldOf('ankleR')).multiplyScalar(0.5);
      sled.position.set(0, a.y + 0.06, a.z - 0.16);
    },
  };
}

function legExtension(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.85, 0.09, 1.1], [0, 0.05, -0.15], MATS.frameDark);
  seatUnit(m, -0.05, -0.2, true);
  tube(m, [0.34, 0.16, 0.16], [0.34, 0.52, 0.16], 0.045);
  tube(m, [-0.34, 0.16, 0.16], [-0.34, 0.52, 0.16], 0.045);

  // swinging ankle lever
  const lever = new THREE.Group();
  pad(lever, [0.36, 0.11, 0.12], [0, 0, 0], [0, 0, Math.PI / 2]);
  m.add(lever);
  const arm = new Link(0.03, MATS.chrome, 8);
  m.add(arm.mesh);
  const stack = weightStack(m, [0, 0.06, -0.72], 10, 4);

  g.add(m);
  contactShadow(g, 0.75);
  g.add(rig.root);

  const upper = {
    hipL: [-1.5, 0.05, 0.04],
    hipR: [-1.5, -0.05, -0.04],
    neck: [0.02, 0, 0],
    shoulderL: [0.28, 0, 0.3],
    shoulderR: [0.28, 0, -0.3],
    elbowL: [-1.1, 0, 0],
    elbowR: [-1.1, 0, 0],
  } as Partial<Pose['joints']>;

  return {
    group: g,
    camera: { pos: [2.5, 1.5, 2.4], target: [0, 0.85, 0.15] },
    start: {
      root: { pos: [0, HIP_SEATED, -0.05], rot: [-0.16, 0, 0] },
      joints: { ...upper, kneeL: [1.55, 0, 0], kneeR: [1.55, 0, 0], ankleL: [0.2, 0, 0], ankleR: [0.2, 0, 0] },
    },
    end: {
      root: { pos: [0, HIP_SEATED, -0.05], rot: [-0.16, 0, 0] },
      joints: { ...upper, kneeL: [0.08, 0, 0], kneeR: [0.08, 0, 0], ankleL: [0.2, 0, 0], ankleR: [0.2, 0, 0] },
    },
    update(t, r) {
      const a = r.worldOf('ankleL').add(r.worldOf('ankleR')).multiplyScalar(0.5);
      lever.position.copy(a).add(new THREE.Vector3(0, 0.02, 0.06));
      arm.set(new THREE.Vector3(0, 0.52, 0.16), lever.position);
      stack.setLift(t, 0.28);
    },
  };
}

function legCurl(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.85, 0.09, 1.15], [0, 0.05, -0.15], MATS.frameDark);
  seatUnit(m, -0.05, -0.24, true);
  // thigh restraint
  pad(m, [0.42, 0.1, 0.16], [0, 0.7, 0.3]);
  tube(m, [0.24, 0.5, 0.34], [0.24, 0.72, 0.3], 0.026, MATS.chrome);
  tube(m, [-0.24, 0.5, 0.34], [-0.24, 0.72, 0.3], 0.026, MATS.chrome);
  tube(m, [0.34, 0.16, 0.2], [0.34, 0.5, 0.2], 0.045);
  tube(m, [-0.34, 0.16, 0.2], [-0.34, 0.5, 0.2], 0.045);

  const lever = new THREE.Group();
  pad(lever, [0.36, 0.11, 0.12], [0, 0, 0], [0, 0, Math.PI / 2]);
  m.add(lever);
  const arm = new Link(0.03, MATS.chrome, 8);
  m.add(arm.mesh);
  const stack = weightStack(m, [0, 0.06, -0.74], 10, 4);

  g.add(m);
  contactShadow(g, 0.75);
  g.add(rig.root);

  const upper = {
    hipL: [-1.48, 0.05, 0.04],
    hipR: [-1.48, -0.05, -0.04],
    shoulderL: [0.3, 0, 0.32],
    shoulderR: [0.3, 0, -0.32],
    elbowL: [-1.05, 0, 0],
    elbowR: [-1.05, 0, 0],
  } as Partial<Pose['joints']>;

  return {
    group: g,
    camera: { pos: [2.6, 1.5, 2.3], target: [0, 0.85, 0.15] },
    start: {
      root: { pos: [0, HIP_SEATED, -0.05], rot: [-0.2, 0, 0] },
      joints: { ...upper, kneeL: [0.16, 0, 0], kneeR: [0.16, 0, 0], ankleL: [0.15, 0, 0], ankleR: [0.15, 0, 0] },
    },
    end: {
      root: { pos: [0, HIP_SEATED, -0.05], rot: [-0.2, 0, 0] },
      joints: { ...upper, kneeL: [2.05, 0, 0], kneeR: [2.05, 0, 0], ankleL: [0.15, 0, 0], ankleR: [0.15, 0, 0] },
    },
    update(t, r) {
      const a = r.worldOf('ankleL').add(r.worldOf('ankleR')).multiplyScalar(0.5);
      lever.position.copy(a).add(new THREE.Vector3(0, 0.0, -0.05));
      arm.set(new THREE.Vector3(0, 0.5, 0.2), lever.position);
      stack.setLift(t, 0.28);
    },
  };
}

function calfRaise(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.8, 0.09, 1.0], [0, 0.05, -0.15], MATS.frameDark);
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP, -0.14]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, -0.14], MATS.frame);
  pad(m, [0.4, 0.1, 0.5], [0, SEAT_TOP + 0.32, -0.36], [-0.1, 0, 0]);
  // foot block
  box(m, [0.5, 0.16, 0.2], [0, 0.09, 0.42], MATS.frameDark);
  box(m, [0.5, 0.02, 0.2], [0, 0.18, 0.42], MATS.pad);

  // knee pads on a lever the calves push up
  const kneePad = pad(m, [0.44, 0.12, 0.18], [0, 0.72, 0.14]);
  tube(m, [0.3, 0.3, -0.02], [0.3, 0.72, 0.12], 0.03, MATS.chrome);
  tube(m, [-0.3, 0.3, -0.02], [-0.3, 0.72, 0.12], 0.03, MATS.chrome);
  const stack = weightStack(m, [0, 0.06, -0.66], 8, 4);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const upper = {
    hipL: [-1.5, 0.05, 0.04],
    hipR: [-1.5, -0.05, -0.04],
    kneeL: [1.42, 0, 0],
    kneeR: [1.42, 0, 0],
    shoulderL: [0.36, 0, 0.28],
    shoulderR: [0.36, 0, -0.28],
    elbowL: [-1.3, 0, 0],
    elbowR: [-1.3, 0, 0],
  } as Partial<Pose['joints']>;

  return {
    group: g,
    camera: { pos: [2.2, 1.3, 2.3], target: [0, 0.7, 0.15] },
    start: {
      root: { pos: [0, HIP_SEATED - 0.03, -0.14], rot: [-0.05, 0, 0] },
      joints: { ...upper, ankleL: [-0.5, 0, 0], ankleR: [-0.5, 0, 0] },
    },
    end: {
      root: { pos: [0, HIP_SEATED + 0.05, -0.14], rot: [-0.05, 0, 0] },
      joints: { ...upper, ankleL: [0.62, 0, 0], ankleR: [0.62, 0, 0] },
    },
    update(t, r) {
      kneePad.position.y = r.worldOf('kneeL').y + 0.1;
      stack.setLift(t, 0.14);
    },
  };
}

function abCrunch(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.85, 0.09, 1.05], [0, 0.05, -0.15], MATS.frameDark);
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP, 0]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, 0], MATS.frame);
  pad(m, [0.4, 0.1, 0.44], [0, SEAT_TOP + 0.28, -0.22], [-0.1, 0, 0]);
  tube(m, [0, 0.4, -0.3], [0, 1.5, -0.36], 0.05);
  // ankle rollers
  cylinder(m, 0.055, 0.42, [0, 0.24, 0.34], MATS.pad, [0, 0, Math.PI / 2]);
  tube(m, [0, 0.44, 0.1], [0, 0.24, 0.34], 0.03, MATS.chrome);

  // the chest pad + handles swing forward with the torso
  const yoke = new THREE.Group();
  pad(yoke, [0.44, 0.12, 0.16], [0, 0, 0]);
  cylinder(yoke, 0.022, 0.24, [0.24, 0.16, 0.05], MATS.grip, [Math.PI / 2, 0, 0]);
  cylinder(yoke, 0.022, 0.24, [-0.24, 0.16, 0.05], MATS.grip, [Math.PI / 2, 0, 0]);
  m.add(yoke);
  const armLink = new Link(0.03, MATS.chrome, 8);
  m.add(armLink.mesh);
  const stack = weightStack(m, [0, 0.06, -0.68], 9, 3);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const legsStart = seatedLegs({ lean: -0.1, footZ: 0.34, footY: 0.24 });
  const legsEnd = seatedLegs({ lean: 0.42, footZ: 0.34, footY: 0.24 });

  return {
    group: g,
    camera: { pos: [2.5, 1.5, 2.3], target: [0, 0.95, 0] },
    start: {
      root: { pos: [0, HIP_SEATED, 0], rot: [-0.1, 0, 0] },
      joints: {
        ...legsStart,
        spine: [-0.05, 0, 0],
        chest: [-0.05, 0, 0],
        shoulderL: [-0.5, 0, 0.5],
        shoulderR: [-0.5, 0, -0.5],
        elbowL: [-2.0, 0, 0],
        elbowR: [-2.0, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, 0], rot: [0.42, 0, 0] },
      joints: {
        ...legsEnd,
        spine: [0.3, 0, 0],
        chest: [0.3, 0, 0],
        neck: [0.24, 0, 0],
        shoulderL: [-0.5, 0, 0.5],
        shoulderR: [-0.5, 0, -0.5],
        elbowL: [-2.0, 0, 0],
        elbowR: [-2.0, 0, 0],
      },
    },
    update(t, r) {
      const c = r.worldOf('chest');
      yoke.position.set(0, c.y + 0.04, c.z + 0.19);
      yoke.rotation.x = -0.1 + t * 0.52;
      armLink.set(new THREE.Vector3(0, 1.46, -0.36), yoke.position);
      stack.setLift(t, 0.24);
    },
  };
}

function hipAbduction(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  box(m, [0.95, 0.09, 1.05], [0, 0.05, -0.15], MATS.frameDark);
  pad(m, [0.4, 0.09, 0.4], [0, SEAT_TOP, 0]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, 0], MATS.frame);
  pad(m, [0.42, 0.11, 0.52], [0, SEAT_TOP + 0.32, -0.22], [-0.14, 0, 0]);
  tube(m, [0, 0.4, -0.3], [0, 1.1, -0.34], 0.05);
  box(m, [0.5, 0.03, 0.24], [0, 0.14, 0.44], MATS.pad); // footplates

  const pads: THREE.Group[] = [];
  [1, -1].forEach(() => {
    const p = pad(m, [0.3, 0.11, 0.15], [0, 0.6, 0.3], [0, 0, Math.PI / 2]);
    pads.push(p);
  });
  const links = [new Link(0.028, MATS.chrome, 8), new Link(0.028, MATS.chrome, 8)];
  links.forEach((l) => m.add(l.mesh));
  const stack = weightStack(m, [0, 0.06, -0.66], 9, 3);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const upper = {
    shoulderL: [0.4, 0, 0.34],
    shoulderR: [0.4, 0, -0.34],
    elbowL: [-1.1, 0, 0],
    elbowR: [-1.1, 0, 0],
  } as Partial<Pose['joints']>;

  /** Seated with the feet on the plates, knees swung out by `spread` radians. */
  const abdKnees = (spread: number): Partial<Pose['joints']> => {
    const base = seatedLegs({ lean: -0.08, footZ: 0.42, footY: 0.16, splay: 0 });
    const hip = (base.hipL as Vec3)[0];
    const knee = (base.kneeL as Vec3)[0];
    const ankle = (base.ankleL as Vec3)[0];
    return {
      hipL: [hip, 0, spread],
      hipR: [hip, 0, -spread],
      kneeL: [knee, 0, 0],
      kneeR: [knee, 0, 0],
      ankleL: [ankle, 0, 0],
      ankleR: [ankle, 0, 0],
    };
  };

  return {
    group: g,
    camera: { pos: [1.1, 1.6, 3.1], target: [0, 0.85, 0.1] },
    start: {
      root: { pos: [0, HIP_SEATED, 0], rot: [-0.08, 0, 0] },
      joints: {
        ...upper,
        ...abdKnees(0.0),
      },
    },
    end: {
      root: { pos: [0, HIP_SEATED, 0], rot: [-0.08, 0, 0] },
      joints: {
        ...upper,
        ...abdKnees(0.62),
      },
    },
    update(t, r) {
      pads[0].position.copy(r.worldOf('kneeL')).add(new THREE.Vector3(0.11, 0.02, 0));
      pads[1].position.copy(r.worldOf('kneeR')).add(new THREE.Vector3(-0.11, 0.02, 0));
      links[0].set(new THREE.Vector3(0.1, 0.98, -0.3), pads[0].position);
      links[1].set(new THREE.Vector3(-0.1, 0.98, -0.3), pads[1].position);
      stack.setLift(t, 0.2);
    },
  };
}

function cableColumn(rig: Humanoid, variant?: string): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  const highSet = new Set([
    'tricep-pushdown',
    'straight-arm-pulldown',
    'face-pull',
    'woodchop',
  ]);
  const isHigh = highSet.has(variant ?? '');
  const pulleyY = variant === 'face-pull' ? 1.5 : isHigh ? 2.05 : 0.28;

  // the column itself, set behind the lifter
  box(m, [0.5, 0.08, 0.7], [0, 0.05, -0.95], MATS.frameDark);
  tube(m, [0.16, 0, -0.95], [0.16, 2.2, -0.95], 0.05);
  tube(m, [-0.16, 0, -0.95], [-0.16, 2.2, -0.95], 0.05);
  tube(m, [-0.16, 2.2, -0.95], [0.16, 2.2, -0.95], 0.045);
  const stack = weightStack(m, [0, 0.06, -1.02], 12, 5);
  const topP = pulley(m, [0, 2.12, -0.9], 0.05);
  const workP = pulley(m, [0, pulleyY, -0.86], 0.05);

  // attachment
  const attach = new THREE.Group();
  if (variant === 'wrist-curl' || variant === 'reverse-curl' || variant === 'bicep-curl') {
    handleBar(attach, 0.6);
  } else if (variant === 'woodchop') {
    dHandle(attach);
  } else {
    // rope with two falling tails
    cylinder(attach, 0.014, 0.16, [0, 0.07, 0], MATS.cable);
    [1, -1].forEach((s) => {
      cylinder(attach, 0.016, 0.22, [0.05 * s, -0.1, 0], MATS.cable, [0, 0, 0.22 * s]);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), MATS.grip);
      knob.position.set(0.1 * s, -0.2, 0);
      attach.add(knob);
    });
  }
  m.add(attach);

  const cable = new CableRun(m, 3);

  // a bench for the wrist curl variant
  if (variant === 'wrist-curl') {
    pad(m, [0.36, 0.1, 0.9], [0, SEAT_TOP, 0.1]);
    box(m, [0.1, SEAT_TOP - 0.05, 0.1], [0, (SEAT_TOP - 0.05) / 2, 0.44], MATS.frame);
    box(m, [0.1, SEAT_TOP - 0.05, 0.1], [0, (SEAT_TOP - 0.05) / 2, -0.24], MATS.frame);
  }

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const poses = cablePoses(variant);

  return {
    group: g,
    camera: poses.camera,
    start: poses.start,
    end: poses.end,
    update(t, r) {
      if (variant === 'woodchop') toHand(attach, r, 'L', 0.05);
      else toHands(attach, r, 0.06);
      stack.setLift(t, 0.3);
      cable.set([
        attach.position.clone(),
        workP,
        topP,
        stack.carriage.getWorldPosition(new THREE.Vector3()),
      ]);
    },
  };
}

function cablePoses(variant?: string): { start: Pose; end: Pose; camera: SceneBuild['camera'] } {
  const stand = standingLegs({ lean: 0.1, rootZ: 0.15, footZ: 0.16 });
  const rootStand = { pos: [0, HIP_HEIGHT, 0.15] as Vec3, rot: [0, 0, 0] as Vec3 };

  switch (variant) {
    case 'tricep-pushdown':
      return {
        camera: { pos: [2.2, 1.6, 2.4], target: [0, 1.15, 0] },
        start: {
          root: { ...rootStand, rot: [0.1, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-0.26, 0, 0.14],
            shoulderR: [-0.26, 0, -0.14],
            elbowL: [-1.72, 0, 0],
            elbowR: [-1.72, 0, 0],
          },
        },
        end: {
          root: { ...rootStand, rot: [0.1, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-0.06, 0, 0.12],
            shoulderR: [-0.06, 0, -0.12],
            elbowL: [-0.05, 0, 0],
            elbowR: [-0.05, 0, 0],
          },
        },
      };

    case 'straight-arm-pulldown':
      return {
        camera: { pos: [2.3, 1.6, 2.5], target: [0, 1.15, 0] },
        start: {
          root: { pos: [0, HIP_HEIGHT - 0.03, 0.3], rot: [0.24, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0.24, rootY: HIP_HEIGHT - 0.03, rootZ: 0.3, footZ: 0.32 }),
            shoulderL: [-2.05, 0, 0.16],
            shoulderR: [-2.05, 0, -0.16],
            elbowL: [-0.12, 0, 0],
            elbowR: [-0.12, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT - 0.03, 0.3], rot: [0.3, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0.3, rootY: HIP_HEIGHT - 0.03, rootZ: 0.3, footZ: 0.32 }),
            shoulderL: [-0.16, 0, 0.14],
            shoulderR: [-0.16, 0, -0.14],
            elbowL: [-0.1, 0, 0],
            elbowR: [-0.1, 0, 0],
          },
        },
      };

    case 'face-pull':
      return {
        camera: { pos: [2.3, 1.7, 2.4], target: [0, 1.3, 0] },
        start: {
          root: { pos: [0, HIP_HEIGHT, 0.45], rot: [0.06, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-1.5, 0, 0.3],
            shoulderR: [-1.5, 0, -0.3],
            elbowL: [-0.12, 0, 0],
            elbowR: [-0.12, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT, 0.45], rot: [-0.04, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-1.42, 0, 1.28],
            shoulderR: [-1.42, 0, -1.28],
            elbowL: [-2.2, 0, 0],
            elbowR: [-2.2, 0, 0],
          },
        },
      };

    case 'overhead-extension':
      return {
        camera: { pos: [2.3, 1.8, 2.4], target: [0, 1.35, 0] },
        start: {
          root: { pos: [0, HIP_HEIGHT, 0.55], rot: [0.04, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0.04, rootZ: 0.55, footZ: 0.56 }),
            shoulderL: [-2.75, 0, 0.24],
            shoulderR: [-2.75, 0, -0.24],
            elbowL: [-2.35, 0, 0],
            elbowR: [-2.35, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT, 0.55], rot: [0.04, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0.04, rootZ: 0.55, footZ: 0.56 }),
            shoulderL: [-2.86, 0, 0.2],
            shoulderR: [-2.86, 0, -0.2],
            elbowL: [-0.12, 0, 0],
            elbowR: [-0.12, 0, 0],
          },
        },
      };

    case 'wrist-curl':
      return {
        camera: { pos: [1.8, 1.1, 2.0], target: [0, 0.7, 0.2] },
        start: {
          root: { pos: [0, HIP_SEATED, 0.1], rot: [0.36, 0, 0] },
          joints: {
            ...seatedLegs({ lean: 0.36, rootZ: 0.1, footZ: 0.52 }),
            neck: [-0.3, 0, 0],
            shoulderL: [-0.72, 0, 0.16],
            shoulderR: [-0.72, 0, -0.16],
            elbowL: [-1.55, 0, 0],
            elbowR: [-1.55, 0, 0],
            wristL: [0.7, 0, 0],
            wristR: [0.7, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_SEATED, 0.1], rot: [0.36, 0, 0] },
          joints: {
            ...seatedLegs({ lean: 0.36, rootZ: 0.1, footZ: 0.52 }),
            neck: [-0.3, 0, 0],
            shoulderL: [-0.72, 0, 0.16],
            shoulderR: [-0.72, 0, -0.16],
            elbowL: [-1.55, 0, 0],
            elbowR: [-1.55, 0, 0],
            wristL: [-0.55, 0, 0],
            wristR: [-0.55, 0, 0],
          },
        },
      };

    case 'woodchop':
      return {
        camera: { pos: [2.6, 1.7, 2.2], target: [0, 1.1, 0] },
        start: {
          root: { pos: [0, HIP_HEIGHT - 0.04, 0.2], rot: [0, 0.5, 0.08] },
          joints: {
            ...standingLegs({ lean: 0, rootY: HIP_HEIGHT - 0.04, rootZ: 0.2, footZ: 0.2 }),
            spine: [0, 0.24, 0],
            chest: [0, 0.2, 0],
            shoulderL: [-2.5, 0, 0.3],
            shoulderR: [-2.5, 0, -0.3],
            elbowL: [-0.3, 0, 0],
            elbowR: [-0.3, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT - 0.12, 0.2], rot: [0.12, -0.5, -0.08] },
          joints: {
            ...standingLegs({ lean: 0.12, rootY: HIP_HEIGHT - 0.12, rootZ: 0.2, footZ: 0.2 }),
            spine: [0.1, -0.26, 0],
            chest: [0.1, -0.22, 0],
            shoulderL: [-0.32, 0, 0.26],
            shoulderR: [-0.32, 0, -0.26],
            elbowL: [-0.32, 0, 0],
            elbowR: [-0.32, 0, 0],
          },
        },
      };

    case 'reverse-curl':
    case 'bicep-curl':
    default:
      return {
        camera: { pos: [2.1, 1.5, 2.4], target: [0, 1.05, 0] },
        start: {
          root: { pos: [0, HIP_HEIGHT, 0.3], rot: [0, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-0.08, 0, 0.12],
            shoulderR: [-0.08, 0, -0.12],
            elbowL: [-0.1, 0, 0],
            elbowR: [-0.1, 0, 0],
            wristL: variant === 'reverse-curl' ? [0.35, 0, 0] : [-0.2, 0, 0],
            wristR: variant === 'reverse-curl' ? [0.35, 0, 0] : [-0.2, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT, 0.3], rot: [0, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-0.24, 0, 0.1],
            shoulderR: [-0.24, 0, -0.1],
            elbowL: [-2.42, 0, 0],
            elbowR: [-2.42, 0, 0],
            wristL: variant === 'reverse-curl' ? [0.35, 0, 0] : [-0.2, 0, 0],
            wristR: variant === 'reverse-curl' ? [0.35, 0, 0] : [-0.2, 0, 0],
          },
        },
      };
  }
}

function flatBench(rig: Humanoid, variant?: string): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  const showBench = variant === 'bench-press' || variant === 'hammer-curl';
  if (showBench) {
    pad(m, [0.34, 0.11, 1.25], [0, SEAT_TOP, 0]);
    box(m, [0.1, SEAT_TOP - 0.06, 0.12], [0, (SEAT_TOP - 0.06) / 2, 0.5], MATS.frame);
    box(m, [0.1, SEAT_TOP - 0.06, 0.12], [0, (SEAT_TOP - 0.06) / 2, -0.5], MATS.frame);
    box(m, [0.42, 0.05, 0.14], [0, 0.03, 0.52], MATS.frameDark);
    box(m, [0.42, 0.05, 0.14], [0, 0.03, -0.52], MATS.frameDark);
  }

  const dbL = new THREE.Group();
  const dbR = new THREE.Group();
  dumbbell(dbL, variant === 'bench-press' ? 1.15 : 1);
  dumbbell(dbR, variant === 'bench-press' ? 1.15 : 1);
  m.add(dbL, dbR);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  if (variant === 'bench-press') {
    const lying = {
      hipL: [-0.05, 0.09, 0.06],
      hipR: [-0.05, -0.09, -0.06],
      kneeL: [1.5, 0, 0],
      kneeR: [1.5, 0, 0],
      ankleL: [-0.1, 0, 0],
      ankleR: [-0.1, 0, 0],
    } as Partial<Pose['joints']>;

    return {
      group: g,
      camera: { pos: [2.3, 1.5, 2.1], target: [0, 0.7, 0] },
      start: {
        root: { pos: [0, 0.58, -0.18], rot: [-1.5, 0, 0] },
        joints: {
          ...lying,
          shoulderL: [-1.35, 0, 1.05],
          shoulderR: [-1.35, 0, -1.05],
          elbowL: [-1.55, 0, 0],
          elbowR: [-1.55, 0, 0],
        },
      },
      end: {
        root: { pos: [0, 0.58, -0.18], rot: [-1.5, 0, 0] },
        joints: {
          ...lying,
          shoulderL: [-1.6, 0, 0.24],
          shoulderR: [-1.6, 0, -0.24],
          elbowL: [-0.12, 0, 0],
          elbowR: [-0.12, 0, 0],
        },
      },
      update(_t, r) {
        toHand(dbL, r, 'L', 0.06);
        toHand(dbR, r, 'R', 0.06);
      },
    };
  }

  if (variant === 'farmers-carry') {
    const walk = standingLegs({ lean: 0.02 });
    return {
      group: g,
      camera: { pos: [2.2, 1.6, 2.6], target: [0, 1.05, 0] },
      start: {
        root: { pos: [0, HIP_HEIGHT, 0], rot: [0.02, 0, 0] },
        joints: {
          ...walk,
          hipL: [-0.45, 0.05, 0.03],
          hipR: [0.32, -0.05, -0.03],
          kneeL: [0.55, 0, 0],
          kneeR: [0.12, 0, 0],
          ankleL: [-0.25, 0, 0],
          ankleR: [0.3, 0, 0],
          spine: [0, 0.07, 0],
          shoulderL: [0.22, 0, 0.12],
          shoulderR: [-0.22, 0, -0.12],
          elbowL: [-0.06, 0, 0],
          elbowR: [-0.06, 0, 0],
        },
      },
      end: {
        root: { pos: [0, HIP_HEIGHT, 0], rot: [0.02, 0, 0] },
        joints: {
          ...walk,
          hipL: [0.32, 0.05, 0.03],
          hipR: [-0.45, -0.05, -0.03],
          kneeL: [0.12, 0, 0],
          kneeR: [0.55, 0, 0],
          ankleL: [0.3, 0, 0],
          ankleR: [-0.25, 0, 0],
          spine: [0, -0.07, 0],
          shoulderL: [-0.22, 0, 0.12],
          shoulderR: [0.22, 0, -0.12],
          elbowL: [-0.06, 0, 0],
          elbowR: [-0.06, 0, 0],
        },
      },
      update(_t, r) {
        toHand(dbL, r, 'L', 0.06);
        toHand(dbR, r, 'R', 0.06);
      },
    };
  }

  // hammer curl, standing, alternating arms
  const stand = standingLegs({ lean: 0 });
  return {
    group: g,
    camera: { pos: [2.0, 1.5, 2.4], target: [0, 1.05, 0] },
    start: {
      root: { pos: [0, HIP_HEIGHT, 0], rot: [0, 0, 0] },
      joints: {
        ...stand,
        shoulderL: [-0.06, 0, 0.1],
        shoulderR: [-0.06, 0, -0.1],
        elbowL: [-0.12, 0, 0],
        elbowR: [-0.12, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_HEIGHT, 0], rot: [0, 0, 0] },
      joints: {
        ...stand,
        shoulderL: [-0.2, 0, 0.08],
        shoulderR: [-0.2, 0, -0.08],
        elbowL: [-2.5, 0, 0],
        elbowR: [-2.5, 0, 0],
      },
    },
    update(_t, r) {
      toHand(dbL, r, 'L', 0.06);
      toHand(dbR, r, 'R', 0.06);
      dbL.rotation.y = Math.PI / 2;
      dbR.rotation.y = Math.PI / 2;
    },
  };
}

function smithMachine(rig: Humanoid, variant?: string): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  // rails on a slight forward slope, as real Smith machines have
  tube(m, [0.78, 0.06, -0.42], [0.78, 2.3, -0.28], 0.04, MATS.chrome);
  tube(m, [-0.78, 0.06, -0.42], [-0.78, 2.3, -0.28], 0.04, MATS.chrome);
  tube(m, [0.86, 0, -0.5], [0.86, 2.34, -0.5], 0.055);
  tube(m, [-0.86, 0, -0.5], [-0.86, 2.34, -0.5], 0.055);
  tube(m, [-0.86, 2.34, -0.5], [0.86, 2.34, -0.5], 0.05);
  box(m, [1.9, 0.07, 0.5], [0, 0.04, -0.5], MATS.frameDark);

  const bar = new THREE.Group();
  cylinder(bar, 0.022, 1.75, [0, 0, 0], MATS.chrome, [0, 0, Math.PI / 2]);
  [1, -1].forEach((s) => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.045, 22), MATS.plate);
    plate.rotation.z = Math.PI / 2;
    plate.position.x = 0.72 * s;
    bar.add(plate);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), MATS.frame);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = 0.78 * s;
    bar.add(collar);
  });
  m.add(bar);

  g.add(m);
  contactShadow(g, 0.85);
  g.add(rig.root);

  if (variant === 'row') {
    const hinged = {
      ...standingLegs({ lean: 0.78, rootY: HIP_HEIGHT - 0.06, rootZ: -0.05, footZ: 0.06 }),
      neck: [-0.5, 0, 0],
    } as Partial<Pose['joints']>;

    return {
      group: g,
      camera: { pos: [2.6, 1.4, 2.5], target: [0, 0.85, -0.05] },
      start: {
        root: { pos: [0, HIP_HEIGHT - 0.06, -0.05], rot: [0.78, 0, 0] },
        joints: {
          ...hinged,
          shoulderL: [-0.72, 0, 0.24],
          shoulderR: [-0.72, 0, -0.24],
          elbowL: [-0.1, 0, 0],
          elbowR: [-0.1, 0, 0],
        },
      },
      end: {
        root: { pos: [0, HIP_HEIGHT - 0.06, -0.05], rot: [0.78, 0, 0] },
        joints: {
          ...hinged,
          shoulderL: [0.5, 0, 0.16],
          shoulderR: [0.5, 0, -0.16],
          elbowL: [-2.2, 0, 0],
          elbowR: [-2.2, 0, 0],
        },
      },
      update(_t, r) {
        toHands(bar, r, 0.07);
        bar.rotation.set(0, 0, 0);
      },
    };
  }

  // squat: the bar sits on the traps and travels with the body
  return {
    group: g,
    camera: { pos: [2.7, 1.7, 2.6], target: [0, 1.1, -0.05] },
    start: {
      root: { pos: [0, HIP_HEIGHT, -0.1], rot: [0.04, 0, 0] },
      joints: {
        ...standingLegs({ lean: 0.04, rootY: HIP_HEIGHT, rootZ: -0.1, footZ: 0, splay: 0.07 }),
        shoulderL: [0.32, 0, 1.45],
        shoulderR: [0.32, 0, -1.45],
        elbowL: [-2.3, 0, 0],
        elbowR: [-2.3, 0, 0],
      },
    },
    end: {
      root: { pos: [0, HIP_HEIGHT - 0.42, -0.34], rot: [0.34, 0, 0] },
      joints: {
        ...standingLegs({
          lean: 0.34,
          rootY: HIP_HEIGHT - 0.42,
          rootZ: -0.34,
          footZ: 0,
          splay: 0.11,
        }),
        shoulderL: [0.32, 0, 1.45],
        shoulderR: [0.32, 0, -1.45],
        elbowL: [-2.3, 0, 0],
        elbowR: [-2.3, 0, 0],
      },
    },
    update(_t, r) {
      // bar rests across the upper back, just behind the neck
      const c = r.worldOf('chest');
      const n = r.worldOf('neck');
      bar.position.set(0, n.y - 0.03, c.z - 0.14);
      bar.rotation.set(0, 0, 0);
    },
  };
}

// ── dispatch ────────────────────────────────────────────────────────────

export function buildScene(ref: RigRef, rig: Humanoid): SceneBuild {
  switch (ref.kind) {
    case 'lat-pulldown':
      return latPulldown(rig);
    case 'seated-row':
      return seatedRow(rig);
    case 'chest-supported-row':
      return chestSupportedRow(rig);
    case 'assisted-pullup':
      return assistedPullup(rig, ref.variant);
    case 'chest-press':
      return chestPress(rig);
    case 'pec-deck':
      return pecDeck(rig);
    case 'shoulder-press':
      return shoulderPress(rig);
    case 'lateral-raise':
      return lateralRaise(rig);
    case 'preacher-curl':
      return preacherCurl(rig);
    case 'cable-column':
      return cableColumn(rig, ref.variant);
    case 'leg-press':
      return legPress(rig);
    case 'leg-extension':
      return legExtension(rig);
    case 'leg-curl':
      return legCurl(rig);
    case 'calf-raise':
      return calfRaise(rig);
    case 'ab-crunch':
      return abCrunch(rig);
    case 'hip-abduction':
      return hipAbduction(rig);
    case 'flat-bench':
      return flatBench(rig, ref.variant);
    case 'smith-machine':
      return smithMachine(rig, ref.variant);
    default:
      return cableColumn(rig, ref.variant);
  }
}
