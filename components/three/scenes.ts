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
  panel,
  pulley,
  rope,
  rubberFoot,
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
      // tagged so `scripts/verify-poses.ts` can catch a cable routed through
      // the lifter instead of past them
      l.mesh.userData.role = 'cable';
      // Hidden until the run is first routed: an unset Link is a metre-long
      // rod standing at the origin, which on a scene that never calls `set`
      // draws a bar straight through the lifter.
      l.mesh.visible = false;
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
const _w = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();

/**
 * Writes a world-space point onto an object whatever transform its parent
 * carries.
 *
 * Props are parented to the machine group, and a machine that is offset from
 * the origin — the bench shoved out of the way on the hammer curl — used to
 * drag its props off with it, leaving the dumbbells hanging a metre behind the
 * lifter while the fists closed on nothing.
 */
function placeWorld(obj: THREE.Object3D, world: THREE.Vector3) {
  const parent = obj.parent;
  if (!parent) {
    obj.position.copy(world);
    return;
  }
  parent.updateWorldMatrix(true, false);
  obj.position.copy(parent.worldToLocal(_w.copy(world)));
}

function orientWorld(obj: THREE.Object3D, world: THREE.Quaternion) {
  const parent = obj.parent;
  if (parent) {
    parent.updateWorldMatrix(true, false);
    parent.getWorldQuaternion(_pq);
    world.premultiply(_pq.invert());
  }
  obj.quaternion.copy(world);
}

/**
 * Snaps a bar/handle to sit in both fists, tilting with them.
 *
 * `gripOf` is the centre of the closed hand, which is where a bar actually
 * rests; the old "wrist, then drop a fixed distance in world Y" only landed
 * there while the forearm happened to point straight down, and put the bar
 * through the forearm on anything curled or pressed overhead.
 */
function toHands(bar: THREE.Object3D, rig: Humanoid) {
  _l.copy(rig.gripOf('L'));
  _r.copy(rig.gripOf('R'));
  placeWorld(bar, _w.copy(_l).add(_r).multiplyScalar(0.5));
  _d.subVectors(_l, _r);
  if (_d.lengthSq() > 1e-6) {
    orientWorld(bar, _q.setFromUnitVectors(X_AXIS, _d.normalize()));
  }
  bar.userData.heldBy = 'LR';
}

/** Snaps a machine handle into one fist, leaving its own orientation alone. */
function toHand(obj: THREE.Object3D, rig: Humanoid, side: 'L' | 'R') {
  placeWorld(obj, rig.gripOf(side));
  obj.userData.heldBy = side;
}

/** Puts a free weight in one fist and turns it the way the hand is turned. */
function toFist(obj: THREE.Object3D, rig: Humanoid, side: 'L' | 'R') {
  placeWorld(obj, rig.gripOf(side));
  rig.joints[side === 'L' ? 'wristL' : 'wristR'].getWorldQuaternion(_q);
  orientWorld(obj, _q);
  obj.userData.heldBy = side;
}

function seatUnit(parent: THREE.Object3D, z = 0, backAngle = -0.12, withBack = true) {
  const g = new THREE.Group();
  g.position.z = z;
  // seat pan, dropped so the cushion's top face lands on SEAT_TOP
  pad(g, [0.42, 0.09, 0.4], [0, SEAT_TOP - 0.051, 0]);
  // pedestal
  cylinder(g, 0.05, SEAT_TOP - 0.05, [0, (SEAT_TOP - 0.05) / 2, 0], MATS.frame);
  baseFrame(g, 0.44, 0.5, 0);
  if (withBack) {
    pad(g, [0.4, 0.11, 0.52], [0, SEAT_TOP + 0.3, -0.22], [backAngle, 0, 0]);
    tube(g, [0, SEAT_TOP - 0.051, -0.2], [0, SEAT_TOP + 0.58, -0.28], 0.03);
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
  /** Foot angle in world space: positive drives the toes down and the heel up. */
  pitch?: number;
}) {
  const { rootY, rootZ = 0, rootRot = 0, footZ, footY = SOLE, pitch = 0 } = opts;
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

  return { hip: thigh - rootRot, knee: shin - thigh, ankle: pitch - shin };
}

/** Horizontal distance from the ankle joint forward to the ball of the foot. */
const BALL = 0.105;

/**
 * Where the ankle ends up when the ball of the foot is pinned to a platform and
 * the foot rotates through `pitch`. Calf work pivots on the ball, so solving for
 * the ankle this way is what keeps the shoe on top of the block instead of
 * sinking through it.
 */
function ankleOverBall(ballZ: number, ballY: number, pitch: number) {
  return {
    footZ: ballZ + SOLE * Math.sin(pitch) - BALL * Math.cos(pitch),
    footY: ballY + SOLE * Math.cos(pitch) + BALL * Math.sin(pitch),
    pitch,
  };
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

/**
 * The floor frame of a machine, built the way real ones are: two side rails and
 * a rear crossmember on rubber feet. A solid slab would look the part but the
 * lifter's shoes plant right where it sits, so the middle has to stay open.
 */
function baseFrame(parent: THREE.Object3D, width: number, depth: number, z = 0) {
  const g = new THREE.Group();
  g.position.z = z;

  const h = 0.075;
  const railX = Math.max(0.24, width / 2 - 0.05);
  const halfD = depth / 2;

  [railX, -railX].forEach((x) => {
    panel(g, [0.09, h, depth], [x, h / 2, 0], MATS.frameDark);
    rubberFoot(g, [x, 0, halfD - 0.07]);
    rubberFoot(g, [x, 0, -halfD + 0.07]);
  });

  panel(g, [railX * 2 + 0.09, h, 0.11], [0, h / 2, -halfD + 0.055], MATS.frameDark);
  if (depth > 0.8) {
    panel(g, [railX * 2 + 0.09, h * 0.8, 0.09], [0, h * 0.4, -halfD + 0.3], MATS.frameDark);
    panel(g, [0.16, 0.012, 0.06], [0, h + 0.006, halfD - 0.05], MATS.accent);
  }

  parent.add(g);
  return g;
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
  baseFrame(machine, 1.0, 1.1, -0.55);

  const top = pulley(machine, [0, 2.06, 0.1]);
  const stackTop = pulley(machine, [0, 2.06, -0.86], 0.05);
  const stack = weightStack(machine, [0, 0.06, -0.86], 12, 5);

  seatUnit(machine, 0, -0.1, true);
  // thigh restraint pad
  pad(machine, [0.44, 0.1, 0.17], [0, 0.688, 0.34]);
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
      toHands(bar, r);
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

  // The lifter faces +Z and rows toward themselves, so the whole machine — rail,
  // foot plate, pulley and stack — lives in front of them. Built behind, the
  // cable ran from the handle in their hands straight back through their chest.
  const PLATE_Y = 0.1;

  box(m, [0.4, 0.1, 1.7], [0, 0.06, 0.62], MATS.frameDark);
  tube(m, [0, 0.4, 0.86], [0, 1.05, 0.94], 0.05);
  panel(m, [0.62, PLATE_Y, 0.4], [0, PLATE_Y / 2, 0.74], MATS.frameDark); // foot plate
  panel(m, [0.64, 0.02, 0.42], [0, PLATE_Y, 0.74], MATS.rubber);
  seatUnit(m, -0.05, -0.06, false);

  const front = pulley(m, [0, 0.62, 0.9], 0.05);
  const stack = weightStack(m, [0, 0.06, 1.3], 11, 4);
  const stackTop = pulley(m, [0, 1.08, 1.3], 0.05);
  tube(m, [0, 1.05, 0.94], [0, 1.05, 1.3], 0.04);

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
  const legOpts = { rootY: HIP_SEATED + 0.02, rootZ: -0.05, footZ: 0.68, footY: PLATE_Y + SOLE };
  const legsStart = seatedLegs({ ...legOpts, lean: 0.26 });
  const legsEnd = seatedLegs({ ...legOpts, lean: -0.06 });

  const start: Pose = {
    root: { pos: [0, HIP_SEATED + 0.02, -0.05], rot: [0.26, 0, 0] },
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
    root: { pos: [0, HIP_SEATED + 0.02, -0.05], rot: [-0.06, 0, 0] },
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
    camera: { pos: [3.3, 1.5, 0.9], target: [0, 0.9, 0.3] },
    start,
    end,
    update(t, r) {
      toHands(handle, r);
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

  const LEAN = 0.3;

  baseFrame(m, 0.9, 1.4, 0.32);
  // Seat under the hips, chest pad in front of the torso and stood up on end so
  // its face meets the lean. It used to be a near-horizontal slab behind the
  // lifter's back, so the figure rowed into thin air with nothing touching it.
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP - 0.051, 0]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, 0], MATS.frame);
  pad(m, [0.34, 0.12, 0.58], [0, 0.83, 0.27], [-(Math.PI / 2 - LEAN), 0, 0]);
  tube(m, [0, 0.1, 0.66], [0, 0.62, 0.32], 0.05);

  // handles, snapped into the fists each frame
  const arms: THREE.Group[] = [];
  [1, -1].forEach(() => {
    const a = new THREE.Group();
    cylinder(a, 0.022, 0.3, [0, 0, 0], MATS.chrome, [Math.PI / 2, 0, 0]);
    cylinder(a, 0.026, 0.16, [0, 0, 0.12], MATS.grip);
    m.add(a);
    arms.push(a);
  });

  // …and the swing arms they hang off, so the handles are attached to something
  const pivots = [new THREE.Vector3(0.48, 0.5, 0.84), new THREE.Vector3(-0.48, 0.5, 0.84)];
  pivots.forEach((p) => {
    tube(m, [p.x, 0.12, 1.02], [p.x, p.y + 0.02, p.z], 0.045);
    cylinder(m, 0.045, 0.09, [p.x, p.y, p.z], MATS.frameDark, [0, 0, Math.PI / 2]);
  });
  const swing = [new Link(0.028, MATS.frame, 8), new Link(0.028, MATS.frame, 8)];
  swing.forEach((l) => m.add(l.mesh));

  const stack = weightStack(m, [0, 0.06, 1.06], 10, 4);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const legs = seatedLegs({ lean: LEAN, rootZ: 0, footZ: 0.42 });

  const start: Pose = {
    root: { pos: [0, HIP_SEATED, 0], rot: [LEAN, 0, 0] },
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
    root: { pos: [0, HIP_SEATED, 0], rot: [LEAN, 0, 0] },
    joints: {
      ...legs,
      neck: [-0.16, 0, 0],
      // elbows drive back wide, outside the chest pad rather than through it
      shoulderL: [0.42, 0, 0.24],
      shoulderR: [0.42, 0, -0.24],
      elbowL: [-2.34, 0, 0],
      elbowR: [-2.34, 0, 0],
    },
  };

  return {
    group: g,
    camera: { pos: [3.2, 1.45, 0.8], target: [0, 0.85, 0.25] },
    start,
    end,
    update(t, r) {
      toHand(arms[0], r, 'L');
      toHand(arms[1], r, 'R');
      swing[0].set(pivots[0], arms[0].position);
      swing[1].set(pivots[1], arms[1].position);
      stack.setLift(t, 0.26);
    },
  };
}

function assistedPullup(rig: Humanoid, variant?: string): SceneBuild {
  const isDip = variant === 'dip';
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 1.3, 1.1, -0.2);
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

  // Dip handles. These follow the fists like every other machine grip — left
  // bolted in place they sat at chest height and ran through the lifter's ribs.
  const dipPivots = [new THREE.Vector3(0.5, 1.34, -0.42), new THREE.Vector3(-0.5, 1.34, -0.42)];
  const dipBars: THREE.Group[] = [];
  const dipArms = [new Link(0.03, MATS.frame, 8), new Link(0.03, MATS.frame, 8)];
  if (isDip) {
    dipPivots.forEach((p) => {
      const h = new THREE.Group();
      cylinder(h, 0.023, 0.32, [0, 0, 0], MATS.grip, [Math.PI / 2, 0, 0]);
      cylinder(h, 0.018, 0.1, [0, 0.05, -0.15], MATS.chrome, [0, 0, Math.PI / 2]);
      m.add(h);
      dipBars.push(h);
      cylinder(m, 0.04, 0.08, [p.x, p.y, p.z], MATS.frameDark, [0, 0, Math.PI / 2]);
    });
    dipArms.forEach((l) => m.add(l.mesh));
    tube(m, [0.5, 0.4, -0.46], [0.5, 1.36, -0.42], 0.04);
    tube(m, [-0.5, 0.4, -0.46], [-0.5, 1.36, -0.42], 0.04);
  }

  // counterweight knee/foot platform
  const platform = box(m, [0.5, 0.1, 0.26], [0, 0.622, 0.11], MATS.pad);
  platform.visible = !isDip;
  const seat = pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP - 0.051, 0.1]);
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
      update(t, r) {
        toHand(dipBars[0], r, 'L');
        toHand(dipBars[1], r, 'R');
        dipArms[0].set(dipPivots[0], dipBars[0].position);
        dipArms[1].set(dipPivots[1], dipBars[1].position);
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

  baseFrame(m, 0.95, 1.25, -0.25);
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
      toHand(arms[0], r, 'L');
      toHand(arms[1], r, 'R');
      linkage[0].set(new THREE.Vector3(0.46, 1.4, -0.34), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.46, 1.4, -0.34), arms[1].position);
      stack.setLift(t, 0.3);
    },
  };
}

function pecDeck(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.9, 1.2, -0.2);
  seatUnit(m, 0.05, -0.1, true);
  tube(m, [0, 0.6, -0.42], [0, 1.72, -0.42], 0.055);
  tube(m, [-0.34, 1.68, -0.42], [0.34, 1.68, -0.42], 0.042);

  // swing arms with vertical forearm pads
  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    pad(a, [0.13, 0.1, 0.3], [-s * 0.088, 0.05, 0], [0, 0, Math.PI / 2]);
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
      toHand(arms[0], r, 'L');
      toHand(arms[1], r, 'R');
      linkage[0].set(new THREE.Vector3(0.2, 1.66, -0.42), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.2, 1.66, -0.42), arms[1].position);
      stack.setLift(t, 0.28);
    },
  };
}

function rearDeltFly(rig: Humanoid, variant?: string): SceneBuild {
  const single = variant === 'single';
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 1.0, 1.0, 0.62);

  tube(m, [0.3, 0.08, 0.58], [0.3, 1.88, 0.58], 0.052);
  tube(m, [-0.3, 0.08, 0.58], [-0.3, 1.88, 0.58], 0.052);
  tube(m, [-0.3, 1.86, 0.58], [0.3, 1.86, 0.58], 0.044);
  tube(m, [0, 1.86, 0.58], [0, 1.86, 1.06], 0.044);
  tube(m, [0.3, 0.12, 0.58], [0.3, 0.12, 1.06], 0.04, MATS.frameDark);
  tube(m, [-0.3, 0.12, 0.58], [-0.3, 0.12, 1.06], 0.04, MATS.frameDark);

  seatUnit(m, -0.08, 0, false);

  pad(m, [0.28, 0.1, 0.54], [0, 1.05, 0.2], [Math.PI / 2, 0, 0]);
  [0.1, -0.1].forEach((x) => tube(m, [x, 1.05, 0.26], [x, 1.05, 0.6], 0.026, MATS.frame));

  const stack = weightStack(m, [0, 0.06, 1.06], 10, 4);

  const pivots = [new THREE.Vector3(0.3, 1.78, 0.58), new THREE.Vector3(-0.3, 1.78, 0.58)];
  pivots.forEach((p) => cylinder(m, 0.05, 0.1, [p.x, p.y, p.z], MATS.frameDark));

  const handles: THREE.Group[] = [];
  [1, -1].forEach(() => {
    const h = new THREE.Group();
    cylinder(h, 0.021, 0.2, [0, 0, 0], MATS.grip);
    cylinder(h, 0.015, 0.11, [0, 0.15, 0], MATS.chrome);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), MATS.chrome);
    cap.position.y = -0.112;
    h.add(cap);
    m.add(h);
    handles.push(h);
  });

  const swing = [new Link(0.028, MATS.frame, 8), new Link(0.028, MATS.frame, 8)];
  swing.forEach((l) => m.add(l.mesh));

  g.add(m);
  contactShadow(g, 0.78);
  g.add(rig.root);

  const legs = seatedLegs({ lean: -0.1, rootZ: -0.02, footZ: 0.46, splay: 0.1 });

  const idleArm = single
    ? { shoulderR: [-0.3, 0, -0.1] as Vec3, elbowR: [-1.16, 0, 0] as Vec3 }
    : null;

  const start: Pose = {
    root: { pos: [0, HIP_SEATED, -0.02], rot: [-0.1, single ? -0.05 : 0, 0] },
    joints: {
      ...legs,
      spine: [0.03, 0, 0],
      chest: [0.06, 0, 0],
      neck: [0.06, 0, 0],
      shoulderL: [-1.46, -0.14, 0.16],
      elbowL: [-0.36, 0, 0],
      wristL: [0, 0, 0.2],
      ...(idleArm ?? {
        shoulderR: [-1.46, 0.14, -0.16],
        elbowR: [-0.36, 0, 0],
        wristR: [0, 0, -0.2],
      }),
    },
  };

  const end: Pose = {
    root: { pos: [0, HIP_SEATED, -0.02], rot: [-0.1, single ? 0.11 : 0, 0] },
    joints: {
      ...legs,
      spine: [-0.03, 0, 0],
      chest: [-0.06, 0, 0],
      neck: [-0.04, 0, 0],
      shoulderL: [0.02, 0.3, 1.53],
      elbowL: [-0.32, 0, 0],
      wristL: [0, 0, 0.1],
      ...(idleArm ?? {
        shoulderR: [0.02, -0.3, -1.53],
        elbowR: [-0.32, 0, 0],
        wristR: [0, 0, -0.1],
      }),
    },
  };

  const parked = new THREE.Vector3(-0.2, 1.0, 0.5);

  return {
    group: g,
    camera: single
      ? { pos: [2.5, 1.68, -1.75], target: [0.1, 1.06, 0.1] }
      : { pos: [2.2, 1.74, -2.0], target: [0, 1.06, 0.12] },
    start,
    end,
    update(t, r) {
      toHand(handles[0], r, 'L');
      if (single) handles[1].position.copy(parked);
      else toHand(handles[1], r, 'R');
      swing[0].set(pivots[0], handles[0].position);
      swing[1].set(pivots[1], handles[1].position);
      stack.setLift(single ? t * 0.6 : t, 0.3);
    },
  };
}

function shoulderPress(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.9, 1.15, -0.2);
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
      toHand(arms[0], r, 'L');
      toHand(arms[1], r, 'R');
      linkage[0].set(new THREE.Vector3(0.42, 1.84, -0.32), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.42, 1.84, -0.32), arms[1].position);
      stack.setLift(t, 0.3);
    },
  };
}

function lateralRaise(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.9, 1.05, -0.15);
  seatUnit(m, 0.02, -0.05, true);
  tube(m, [0, 0.55, -0.36], [0, 1.34, -0.36], 0.05);

  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    pad(a, [0.26, 0.1, 0.12], [s * 0.088, 0, 0], [0, 0, Math.PI / 2]);
    cylinder(a, 0.02, 0.2, [s * 0.088, 0.11, -0.06], MATS.chrome);
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
      const padL = arms[0].position.clone().setX(arms[0].position.x + 0.088);
      const padR = arms[1].position.clone().setX(arms[1].position.x - 0.088);
      linkage[0].set(new THREE.Vector3(0.14, 1.3, -0.36), padL);
      linkage[1].set(new THREE.Vector3(-0.14, 1.3, -0.36), padR);
      stack.setLift(t, 0.24);
    },
  };
}

function preacherCurl(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.85, 1.0, -0.1);
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP - 0.051, -0.16]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, -0.16], MATS.frame);
  // the angled preacher pad
  pad(m, [0.52, 0.13, 0.46], [0, 0.7, 0.1], [0.927, 0, 0]);
  pad(m, [0.5, 0.1, 0.14], [0, 0.86, 0.28], [0.2, 0, 0]);
  tube(m, [0, 0.24, 0.24], [0, 0.66, 0.16], 0.05);

  const arms: THREE.Group[] = [];
  [1, -1].forEach((s) => {
    const a = new THREE.Group();
    cylinder(a, 0.023, 0.16, [0, 0, 0], MATS.grip, [Math.PI / 2, 0, 0]);
    m.add(a);
    arms.push(a);
  });
  const linkage = [new Link(0.026, MATS.chrome, 8), new Link(0.026, MATS.chrome, 8)];
  linkage.forEach((l) => m.add(l.mesh));
  // stack behind the seat: parked in front it stood between the camera and the
  // lifter, hiding the arms this exercise exists to show
  const stack = weightStack(m, [0, 0.06, -0.66], 9, 3);

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
      toHand(arms[0], r, 'L');
      toHand(arms[1], r, 'R');
      // the lever pivots level with the elbows on the far side of the pad, so it
      // reads as a short arm rather than two rods crossing the lifter's face
      linkage[0].set(new THREE.Vector3(0.3, 0.8, 0.12), arms[0].position);
      linkage[1].set(new THREE.Vector3(-0.3, 0.8, 0.12), arms[1].position);
      stack.setLift(t, 0.22);
    },
  };
}

function legPress(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  // The rails run along the line the soles actually travel: the lifter reclines
  // low and the sled climbs away from them at roughly 30 degrees.
  const RAIL_A: Vec3 = [0.44, 0.92, 0.42];
  const RAIL_B: Vec3 = [0.44, 0.16, 1.78];
  tube(m, RAIL_A, RAIL_B, 0.05);
  tube(m, [-RAIL_A[0], RAIL_A[1], RAIL_A[2]], [-RAIL_B[0], RAIL_B[1], RAIL_B[2]], 0.05);
  tube(m, RAIL_B, [-RAIL_B[0], RAIL_B[1], RAIL_B[2]], 0.045);
  tube(m, [0.44, 0.16, 1.78], [0.44, 0.05, 1.78], 0.05);
  tube(m, [-0.44, 0.16, 1.78], [-0.44, 0.05, 1.78], 0.05);
  baseFrame(m, 1.05, 1.2, 1.2);
  baseFrame(m, 0.9, 0.85, 0.42);

  // reclined seat: pan under the hips, back pad behind the torso
  const RECLINE = 0.4457;
  pad(m, [0.46, 0.12, 0.92], [0, 0.44, 0.45], [RECLINE, 0, 0]);
  pad(m, [0.34, 0.1, 0.22], [0, 0.63, 0.02], [RECLINE, 0, 0]);
  tube(m, [0, 0.1, 0.62], [0, 0.4, 0.56], 0.055);
  tube(m, [0, 0.1, 0.2], [0, 0.58, 0.14], 0.055);
  tube(m, [0.24, 0.56, 0.66], [0.24, 0.8, 0.58], 0.03, MATS.chrome);
  tube(m, [-0.24, 0.56, 0.66], [-0.24, 0.8, 0.58], 0.03, MATS.chrome);

  // moving sled with the foot platform
  const sled = new THREE.Group();
  panel(sled, [0.62, 0.62, 0.07], [0, 0, 0], MATS.frameDark);
  panel(sled, [0.66, 0.66, 0.022], [0, 0, 0.041], MATS.rubber);
  for (let i = 0; i < 7; i++) {
    panel(sled, [0.6, 0.012, 0.008], [0, -0.27 + i * 0.09, 0.054], MATS.frameDark);
  }
  [1, -1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20), MATS.plate);
    p.rotation.x = Math.PI / 2;
    p.position.set(0.46 * s, 0.0, -0.09);
    sled.add(p);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12),
      MATS.chrome
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0.46 * s, 0, -0.09);
    sled.add(collar);
  });
  sled.rotation.x = 0.512;
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
      ankleL: [-0.5, 0, 0],
      ankleR: [-0.5, 0, 0],
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
      ankleL: [0.14, 0, 0],
      ankleR: [0.14, 0, 0],
      neck: [0.45, 0, 0],
      shoulderL: [0.5, 0, 0.42],
      shoulderR: [0.5, 0, -0.42],
      elbowL: [-1.5, 0, 0],
      elbowR: [-1.5, 0, 0],
    },
  };

  return {
    group: g,
    camera: { pos: [3.1, 1.65, 2.5], target: [0, 0.62, 0.85] },
    start,
    end,
    update(_t, r) {
      // the plate rides on the soles, so it has to track the foot's orientation
      const sole = r.joints.ankleL.localToWorld(new THREE.Vector3(0, -SOLE, 0.06));
      sled.position.set(0, sole.y - 0.031, sole.z + 0.055);
    },
  };
}

function legExtension(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.85, 1.1, -0.15);
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

  baseFrame(m, 0.85, 1.15, -0.15);
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

  const ROOT_Y = HIP_SEATED;
  const ROOT_Z = -0.16;
  const LEAN = -0.06;
  const BLOCK_TOP = 0.155;
  const BALL_Z = 0.42;

  baseFrame(m, 0.72, 1.3, 0.02);
  seatUnit(m, ROOT_Z, -0.14, true);

  // Toe rail. The balls of the feet ride the top, the heels drop behind it and
  // the toes point down past the front, so nothing ever meets solid steel.
  panel(m, [0.56, BLOCK_TOP - 0.03, 0.1], [0, (BLOCK_TOP - 0.03) / 2, BALL_Z], MATS.frameDark);
  panel(m, [0.58, 0.03, 0.12], [0, BLOCK_TOP - 0.015, BALL_Z], MATS.rubber);
  for (let i = 0; i < 4; i++) {
    panel(
      m,
      [0.52, 0.006, 0.012],
      [0, BLOCK_TOP + 0.004, BALL_Z - 0.036 + i * 0.024],
      MATS.frameDark
    );
  }
  panel(m, [0.58, 0.075, 0.3], [0, 0.0375, BALL_Z + 0.2], MATS.frameDark);

  // knee pads on the lever the calves drive upward
  const lever = new THREE.Group();
  pad(lever, [0.46, 0.13, 0.2], [0, 0, 0]);
  panel(lever, [0.06, 0.05, 0.22], [0.19, -0.08, 0], MATS.frame);
  panel(lever, [0.06, 0.05, 0.22], [-0.19, -0.08, 0], MATS.frame);
  m.add(lever);

  const postL = new Link(0.026, MATS.chrome, 10);
  const postR = new Link(0.026, MATS.chrome, 10);
  m.add(postL.mesh);
  m.add(postR.mesh);
  tube(m, [0.3, 0.07, 0.16], [0.3, 0.34, 0.16], 0.042);
  tube(m, [-0.3, 0.07, 0.16], [-0.3, 0.34, 0.16], 0.042);

  const stack = weightStack(m, [0, 0.06, -0.72], 8, 4);
  tube(m, [0, 0.06, -0.5], [0, 0.72, -0.5], 0.03, MATS.chrome);

  g.add(m);
  contactShadow(g, 0.75);
  g.add(rig.root);

  const upper = {
    spine: [0.04, 0, 0],
    chest: [0.04, 0, 0],
    shoulderL: [0.34, 0, 0.26],
    shoulderR: [0.34, 0, -0.26],
    elbowL: [-1.24, 0, 0],
    elbowR: [-1.24, 0, 0],
  } as Partial<Pose['joints']>;

  const stretched = legIK({
    rootY: ROOT_Y,
    rootZ: ROOT_Z,
    rootRot: LEAN,
    ...ankleOverBall(BALL_Z, BLOCK_TOP, -0.4),
  });
  const raised = legIK({
    rootY: ROOT_Y,
    rootZ: ROOT_Z,
    rootRot: LEAN,
    ...ankleOverBall(BALL_Z, BLOCK_TOP, 0.62),
  });

  const anchorL = new THREE.Vector3(0.3, 0.34, 0.16);
  const anchorR = new THREE.Vector3(-0.3, 0.34, 0.16);

  return {
    group: g,
    camera: { pos: [2.25, 1.25, 2.35], target: [0, 0.62, 0.2] },
    start: {
      root: { pos: [0, ROOT_Y, ROOT_Z], rot: [LEAN, 0, 0] },
      joints: { ...upper, ...legPose(stretched, 0.06) },
      grip: 0.72,
    },
    end: {
      root: { pos: [0, ROOT_Y, ROOT_Z], rot: [LEAN, 0, 0] },
      joints: { ...upper, ...legPose(raised, 0.06) },
      grip: 0.86,
    },
    update(t, r) {
      const knee = r.worldOf('kneeL').add(r.worldOf('kneeR')).multiplyScalar(0.5);
      lever.position.set(0, knee.y + 0.142, knee.z - 0.07);
      postL.set(anchorL, new THREE.Vector3(0.19, lever.position.y - 0.08, lever.position.z));
      postR.set(anchorR, new THREE.Vector3(-0.19, lever.position.y - 0.08, lever.position.z));
      stack.setLift(t, 0.16);
    },
  };
}

function abCrunch(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.85, 1.05, -0.15);
  pad(m, [0.4, 0.09, 0.36], [0, SEAT_TOP - 0.051, 0]);
  cylinder(m, 0.05, SEAT_TOP, [0, SEAT_TOP / 2, 0], MATS.frame);
  pad(m, [0.4, 0.1, 0.44], [0, SEAT_TOP + 0.28, -0.22], [-0.1, 0, 0]);
  tube(m, [0, 0.4, -0.34], [0, 1.5, -0.4], 0.05);
  // footplate, with the restraint roller resting across the top of the ankles
  panel(m, [0.5, 0.09, 0.3], [0, 0.125, 0.36], MATS.frameDark);
  panel(m, [0.52, 0.02, 0.32], [0, 0.18, 0.36], MATS.rubber);
  cylinder(m, 0.055, 0.44, [0, 0.4, 0.34], MATS.pad, [0, 0, Math.PI / 2]);
  tube(m, [0.2, 0.56, 0.12], [0.2, 0.4, 0.34], 0.026, MATS.chrome);
  tube(m, [-0.2, 0.56, 0.12], [-0.2, 0.4, 0.34], 0.026, MATS.chrome);
  tube(m, [0.2, 0.56, 0.12], [-0.2, 0.56, 0.12], 0.03, MATS.chrome);

  // the chest pad + handles swing forward with the torso
  const yoke = new THREE.Group();
  pad(yoke, [0.44, 0.12, 0.16], [0, 0, 0]);
  cylinder(yoke, 0.022, 0.24, [0.24, 0.16, 0.05], MATS.grip, [Math.PI / 2, 0, 0]);
  cylinder(yoke, 0.022, 0.24, [-0.24, 0.16, 0.05], MATS.grip, [Math.PI / 2, 0, 0]);
  m.add(yoke);
  const armLinks = [new Link(0.03, MATS.chrome, 8), new Link(0.03, MATS.chrome, 8)];
  armLinks.forEach((l) => m.add(l.mesh));
  const stack = weightStack(m, [0, 0.06, -0.68], 9, 3);

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const legsStart = seatedLegs({ lean: -0.1, footZ: 0.34, footY: 0.27 });
  const legsEnd = seatedLegs({ lean: 0.42, footZ: 0.34, footY: 0.27 });

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
      armLinks[0].set(
        new THREE.Vector3(0.24, 1.46, -0.4),
        new THREE.Vector3(0.24, yoke.position.y, yoke.position.z)
      );
      armLinks[1].set(
        new THREE.Vector3(-0.24, 1.46, -0.4),
        new THREE.Vector3(-0.24, yoke.position.y, yoke.position.z)
      );
      stack.setLift(t, 0.24);
    },
  };
}

function hipAbduction(rig: Humanoid): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  baseFrame(m, 0.95, 1.05, -0.15);
  pad(m, [0.4, 0.09, 0.4], [0, SEAT_TOP - 0.051, 0]);
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

  /**
   * Which side of the lifter the column stands on. The figure faces +Z, and on
   * every one of these you face the machine you are pulling against — bar the
   * overhead extension, where you step away from the column on purpose. Build
   * the column on the wrong side and the cable is drawn as a straight line from
   * the hands to a pulley behind the lifter, straight through their chest.
   */
  const F = variant === 'overhead-extension' ? -1 : 1;
  const at = (x: number, y: number, z: number): [number, number, number] => [x * F, y, z * F];

  baseFrame(m, 0.5, 0.7, 0.95 * F);
  tube(m, at(0.16, 0, 0.95), at(0.16, 2.2, 0.95), 0.05);
  tube(m, at(-0.16, 0, 0.95), at(-0.16, 2.2, 0.95), 0.05);
  tube(m, at(-0.16, 2.2, 0.95), at(0.16, 2.2, 0.95), 0.045);
  const stack = weightStack(m, at(0, 0.06, 1.02), 12, 5);
  const topP = pulley(m, at(0, 2.12, 0.9), 0.05);
  const workP = pulley(m, at(0, pulleyY, 0.86), 0.05);

  // attachment. `m` sits at the origin, so its space and world space agree and
  // the grips can be fed straight to the rope.
  const isBar =
    variant === 'wrist-curl' || variant === 'reverse-curl' || variant === 'bicep-curl';
  const attach = isBar || variant === 'woodchop' ? new THREE.Group() : null;
  if (attach) {
    if (isBar) handleBar(attach, 0.6);
    else dHandle(attach);
    m.add(attach);
  }
  const ropeRig = attach ? null : rope(m);

  const cable = new CableRun(m, 3);

  // a bench for the wrist curl variant, sat on at its front edge
  if (variant === 'wrist-curl') {
    pad(m, [0.36, 0.1, 0.9], [0, SEAT_TOP - 0.051, -0.45]);
    box(m, [0.1, SEAT_TOP - 0.05, 0.1], [0, (SEAT_TOP - 0.05) / 2, -0.08], MATS.frame);
    box(m, [0.1, SEAT_TOP - 0.05, 0.1], [0, (SEAT_TOP - 0.05) / 2, -0.82], MATS.frame);
  }

  g.add(m);
  contactShadow(g, 0.7);
  g.add(rig.root);

  const poses = cablePoses(variant);
  const clip = new THREE.Vector3();

  return {
    group: g,
    camera: poses.camera,
    start: poses.start,
    end: poses.end,
    update(t, r) {
      if (ropeRig) {
        ropeRig.setEnds(r.gripOf('L'), r.gripOf('R'), workP);
        clip.copy(ropeRig.hub);
      } else if (variant === 'woodchop') {
        toHand(attach!, r, 'L');
        clip.copy(attach!.position).setY(attach!.position.y + 0.09);
      } else {
        toHands(attach!, r);
        clip.copy(attach!.position);
      }
      stack.setLift(t, 0.3);
      cable.set([
        clip.clone(),
        workP,
        topP,
        stack.carriage.getWorldPosition(new THREE.Vector3()),
      ]);
    },
  };
}

function cablePoses(variant?: string): { start: Pose; end: Pose; camera: SceneBuild['camera'] } {
  // Stood back from the column far enough that the cable runs clear of the
  // chest on the way to the pulley instead of grazing it at lockout.
  const stand = standingLegs({ lean: 0.05, rootZ: 0.26, footZ: 0.26 });
  const rootStand = { pos: [0, HIP_HEIGHT, 0.26] as Vec3, rot: [0.05, 0, 0] as Vec3 };

  /**
   * The lifter faces the column, so the camera cannot sit in front of them
   * without the machine standing in the shot. It goes off to the side instead
   * and swings a little way round toward the front — which is the angle a
   * pushdown or a curl is filmed from anyway, because it is the one that shows
   * the elbow.
   */
  const sideOn: SceneBuild['camera'] = { pos: [3.0, 1.6, 1.35], target: [0, 1.0, 0.36] };

  switch (variant) {
    case 'tricep-pushdown':
      return {
        camera: sideOn,
        start: {
          root: { ...rootStand },
          joints: {
            ...stand,
            shoulderL: [-0.24, 0, 0.12],
            shoulderR: [-0.24, 0, -0.12],
            elbowL: [-1.78, 0, 0],
            elbowR: [-1.78, 0, 0],
          },
        },
        end: {
          root: { ...rootStand },
          joints: {
            ...stand,
            // locked out with the hands just clear of the thighs, not pinned
            // against them — the rope has to hang somewhere
            shoulderL: [-0.16, 0, 0.1],
            shoulderR: [-0.16, 0, -0.1],
            elbowL: [-0.06, 0, 0],
            elbowR: [-0.06, 0, 0],
          },
        },
      };

    case 'straight-arm-pulldown':
      return {
        camera: { pos: [3.1, 1.65, 1.4], target: [0, 1.05, 0.36] },
        start: {
          root: { pos: [0, HIP_HEIGHT - 0.03, 0.25], rot: [0.2, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0.2, rootY: HIP_HEIGHT - 0.03, rootZ: 0.25, footZ: 0.28 }),
            shoulderL: [-2.0, 0, 0.14],
            shoulderR: [-2.0, 0, -0.14],
            elbowL: [-0.12, 0, 0],
            elbowR: [-0.12, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT - 0.03, 0.25], rot: [0.28, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0.28, rootY: HIP_HEIGHT - 0.03, rootZ: 0.25, footZ: 0.28 }),
            shoulderL: [-0.16, 0, 0.14],
            shoulderR: [-0.16, 0, -0.14],
            elbowL: [-0.1, 0, 0],
            elbowR: [-0.1, 0, 0],
          },
        },
      };

    case 'face-pull':
      return {
        camera: { pos: [3.0, 1.78, 1.45], target: [0, 1.25, 0.34] },
        start: {
          root: { pos: [0, HIP_HEIGHT, 0.26], rot: [0.04, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-1.5, 0, 0.26],
            shoulderR: [-1.5, 0, -0.26],
            elbowL: [-0.12, 0, 0],
            elbowR: [-0.12, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT, 0.26], rot: [-0.04, 0, 0] },
          joints: {
            ...stand,
            shoulderL: [-1.4, 0, 1.24],
            shoulderR: [-1.4, 0, -1.24],
            elbowL: [-2.25, 0, 0],
            elbowR: [-2.25, 0, 0],
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

    case 'wrist-curl': {
      // Sat on the front edge of the bench, leaning right over so the forearms
      // lie along the thighs with the wrists hanging past the knees — at the
      // old 20° lean the elbows could not reach the legs at all and the arms
      // just floated out in front of the chest.
      const LEAN = 0.62;
      const held = {
        ...seatedLegs({ lean: LEAN, rootZ: -0.05, footZ: 0.36 }),
        neck: [-0.22, 0, 0],
        shoulderL: [-0.6, 0, 0.16],
        shoulderR: [-0.6, 0, -0.16],
        elbowL: [-1.34, 0, 0],
        elbowR: [-1.34, 0, 0],
      } as Partial<Pose['joints']>;

      return {
        camera: { pos: [2.3, 1.1, 1.4], target: [0, 0.66, 0.16] },
        start: {
          root: { pos: [0, HIP_SEATED, -0.05], rot: [LEAN, 0, 0] },
          joints: { ...held, wristL: [0.7, 0, 0], wristR: [0.7, 0, 0] },
        },
        end: {
          root: { pos: [0, HIP_SEATED, -0.05], rot: [LEAN, 0, 0] },
          joints: { ...held, wristL: [-0.55, 0, 0], wristR: [-0.55, 0, 0] },
        },
      };
    }

    case 'woodchop':
      // stood side-on to the column, turning away from it as the handle comes
      // down across the body
      return {
        camera: { pos: [3.0, 1.7, 1.5], target: [0, 1.05, 0.25] },
        start: {
          root: { pos: [0, HIP_HEIGHT - 0.04, 0.12], rot: [0, 0.55, 0.08] },
          joints: {
            ...standingLegs({ lean: 0, rootY: HIP_HEIGHT - 0.04, rootZ: 0.12, footZ: 0.12 }),
            spine: [0, 0.24, 0],
            chest: [0, 0.2, 0],
            shoulderL: [-2.5, 0, 0.3],
            shoulderR: [-2.5, 0, -0.3],
            elbowL: [-0.3, 0, 0],
            elbowR: [-0.3, 0, 0],
          },
        },
        end: {
          root: { pos: [0, HIP_HEIGHT - 0.12, 0.12], rot: [0.12, -0.5, -0.08] },
          joints: {
            ...standingLegs({ lean: 0.12, rootY: HIP_HEIGHT - 0.12, rootZ: 0.12, footZ: 0.12 }),
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
    default: {
      // reverse curl is the same movement held palms-down
      const wrist: Vec3 = variant === 'reverse-curl' ? [0.35, 0, 0] : [-0.2, 0, 0];
      return {
        camera: { pos: [2.85, 1.5, 1.6], target: [0, 1.0, 0.3] },
        start: {
          root: { ...rootStand, rot: [0, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0, rootZ: 0.26, footZ: 0.26 }),
            shoulderL: [-0.08, 0, 0.12],
            shoulderR: [-0.08, 0, -0.12],
            elbowL: [-0.1, 0, 0],
            elbowR: [-0.1, 0, 0],
            wristL: wrist,
            wristR: wrist,
          },
        },
        end: {
          root: { ...rootStand, rot: [0, 0, 0] },
          joints: {
            ...standingLegs({ lean: 0, rootZ: 0.26, footZ: 0.26 }),
            shoulderL: [-0.24, 0, 0.1],
            shoulderR: [-0.24, 0, -0.1],
            elbowL: [-2.42, 0, 0],
            elbowR: [-2.42, 0, 0],
            wristL: wrist,
            wristR: wrist,
          },
        },
      };
    }
  }
}

function flatBench(rig: Humanoid, variant?: string): SceneBuild {
  const g = baseScene();
  const m = new THREE.Group();

  const showBench = variant === 'bench-press' || variant === 'hammer-curl';
  if (showBench) {
    // on the curl the lifter stands, so the bench moves out of their footprint
    m.position.z = variant === 'hammer-curl' ? -1.05 : 0;
    pad(m, [0.34, 0.11, 0.95], [0, SEAT_TOP - 0.071, -0.2]);
    [0.21, -0.21].forEach((x) => {
      box(m, [0.08, SEAT_TOP - 0.08, 0.1], [x, (SEAT_TOP - 0.08) / 2, 0.2], MATS.frame);
      box(m, [0.08, SEAT_TOP - 0.08, 0.1], [x, (SEAT_TOP - 0.08) / 2, -0.62], MATS.frame);
    });
    tube(m, [0.21, SEAT_TOP - 0.1, 0.2], [-0.21, SEAT_TOP - 0.1, 0.2], 0.028);
    baseFrame(m, 0.5, 0.16, 0.2);
    baseFrame(m, 0.5, 0.16, -0.62);
  }

  // The dumbbells hang off the scene root, not the bench: the bench carries an
  // offset on the curl and anything parented to it inherits that offset.
  const dbL = new THREE.Group();
  const dbR = new THREE.Group();
  dumbbell(dbL, variant === 'bench-press' ? 1.15 : 1);
  dumbbell(dbR, variant === 'bench-press' ? 1.15 : 1);
  g.add(dbL, dbR);

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
        toFist(dbL, r, 'L');
        toFist(dbR, r, 'R');
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
        toFist(dbL, r, 'L');
        toFist(dbR, r, 'R');
      },
    };
  }

  // Hammer curl: standing, both arms, neutral grip. The "hammer" is the wrist
  // rotation — a quarter turn of the forearm, thumbs up — so it is posed on the
  // wrist joint and the dumbbells simply follow the hands.
  const stand = standingLegs({ lean: 0 });
  const neutral = { wristL: [0, -Math.PI / 2, 0], wristR: [0, Math.PI / 2, 0] } as Partial<
    Pose['joints']
  >;
  return {
    group: g,
    camera: { pos: [2.0, 1.5, 2.4], target: [0, 1.05, 0] },
    start: {
      root: { pos: [0, HIP_HEIGHT, 0], rot: [0, 0, 0] },
      joints: {
        ...stand,
        ...neutral,
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
        ...neutral,
        shoulderL: [-0.2, 0, 0.08],
        shoulderR: [-0.2, 0, -0.08],
        elbowL: [-2.5, 0, 0],
        elbowR: [-2.5, 0, 0],
      },
    },
    update(_t, r) {
      toFist(dbL, r, 'L');
      toFist(dbR, r, 'R');
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
  baseFrame(m, 1.9, 0.5, -0.5);

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
        toHands(bar, r);
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
    case 'rear-delt-fly':
      return rearDeltFly(rig, ref.variant);
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
