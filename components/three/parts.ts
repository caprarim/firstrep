import * as THREE from 'three';

export const MATS = {
  frame: new THREE.MeshStandardMaterial({ color: 0x363b42, roughness: 0.48, metalness: 0.38 }),
  frameDark: new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.55, metalness: 0.3 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.62, metalness: 0.03 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc3cad1, roughness: 0.21, metalness: 0.86 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42, metalness: 0.22 }),
  plate: new THREE.MeshStandardMaterial({ color: 0x1e2227, roughness: 0.6, metalness: 0.35 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x0e1013, roughness: 0.9, metalness: 0.0 }),
  cable: new THREE.MeshStandardMaterial({ color: 0x101215, roughness: 0.75, metalness: 0.15 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.95, metalness: 0.0 }),
};

// These live for the whole app, so scene teardown must not dispose them —
// otherwise the second exercise you open renders with dead materials.
Object.values(MATS).forEach((m) => {
  m.userData.shared = true;
});

const UP = new THREE.Vector3(0, 1, 0);

/** A cylinder that can be re-aimed between two points every frame. */
export class Link {
  readonly mesh: THREE.Mesh;
  private dir = new THREE.Vector3();

  constructor(radius: number, material: THREE.Material = MATS.cable, segments = 8) {
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, segments), material);
  }

  set(a: THREE.Vector3, b: THREE.Vector3) {
    this.dir.subVectors(b, a);
    const len = this.dir.length() || 0.0001;
    this.mesh.position.copy(a).addScaledVector(this.dir, 0.5);
    this.mesh.scale.set(1, len, 1);
    this.dir.divideScalar(len);
    this.mesh.quaternion.setFromUnitVectors(UP, this.dir);
  }
}

/** Static structural tube from a→b. */
export function tube(
  parent: THREE.Object3D,
  a: [number, number, number],
  b: [number, number, number],
  radius = 0.035,
  material: THREE.Material = MATS.frame
) {
  const link = new Link(radius, material, 10);
  link.set(new THREE.Vector3(...a), new THREE.Vector3(...b));
  parent.add(link.mesh);
  return link.mesh;
}

export function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  material: THREE.Material = MATS.frame,
  rot?: [number, number, number]
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

/** Upholstered pad — a box with a softer, slightly inflated silhouette. */
export function pad(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  rot?: [number, number, number]
) {
  const [w, h, d] = size;
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(h / 2, Math.max(0.001, w - h), 3, 12), MATS.pad);
  mesh.rotation.z = Math.PI / 2;
  mesh.scale.set(1, 1, Math.max(0.15, d / h));
  const holder = new THREE.Group();
  holder.add(mesh);
  holder.position.set(...pos);
  if (rot) holder.rotation.set(...rot);
  parent.add(holder);
  return holder;
}

export function cylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  pos: [number, number, number],
  material: THREE.Material = MATS.chrome,
  rot?: [number, number, number]
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), material);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

/** Knurled handle bar lying along the X axis. */
export function handleBar(parent: THREE.Object3D, length: number, radius = 0.019) {
  const g = new THREE.Group();
  cylinder(g, radius, length, [0, 0, 0], MATS.chrome, [0, 0, Math.PI / 2]);
  cylinder(g, radius * 1.5, length * 0.24, [length * 0.3, 0, 0], MATS.grip, [0, 0, Math.PI / 2]);
  cylinder(g, radius * 1.5, length * 0.24, [-length * 0.3, 0, 0], MATS.grip, [0, 0, Math.PI / 2]);
  parent.add(g);
  return g;
}

/** D-handle / stirrup on a cable. */
export function dHandle(parent: THREE.Object3D) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 20), MATS.grip);
  ring.rotation.y = Math.PI / 2;
  g.add(ring);
  parent.add(g);
  return g;
}

/**
 * Selectorised weight stack. `plates` is the full column; the animation raises
 * the top `lifted` plates so the machine visibly does work.
 */
export function weightStack(
  parent: THREE.Object3D,
  pos: [number, number, number],
  count = 12,
  lifted = 5
) {
  const g = new THREE.Group();
  g.position.set(...pos);

  const plateH = 0.052;
  const gap = 0.008;
  const plates: THREE.Mesh[] = [];

  for (let i = 0; i < count; i++) {
    const m = box(g, [0.34, plateH, 0.24], [0, i * (plateH + gap) + plateH / 2, 0], MATS.plate);
    plates.push(m);
  }

  // guide rods and the pin marking the selected weight
  cylinder(g, 0.011, count * (plateH + gap) + 0.5, [0.12, (count * (plateH + gap)) / 2 + 0.25, 0]);
  cylinder(g, 0.011, count * (plateH + gap) + 0.5, [-0.12, (count * (plateH + gap)) / 2 + 0.25, 0]);
  const pin = cylinder(
    g,
    0.012,
    0.1,
    [0, (lifted - 0.5) * (plateH + gap), 0.15],
    MATS.accent,
    [Math.PI / 2, 0, 0]
  );

  // the carriage the top plates hang from
  const carriage = box(g, [0.3, 0.04, 0.2], [0, count * (plateH + gap) + 0.06, 0], MATS.frameDark);

  parent.add(g);

  const liftedPlates = plates.slice(0, lifted);
  const topY = liftedPlates.map((p) => p.position.y);
  const carriageY = carriage.position.y;
  const pinY = pin.position.y;

  return {
    group: g,
    /** `t` 0 = racked, 1 = fully raised. */
    setLift(t: number, travel = 0.34) {
      liftedPlates.forEach((p, i) => (p.position.y = topY[i] + t * travel));
      carriage.position.y = carriageY + t * travel;
      pin.position.y = pinY + t * travel;
    },
    /** Where the cable leaves the stack. */
    anchor: new THREE.Vector3(pos[0], pos[1] + count * (plateH + gap) + 0.1, pos[2]),
    carriage,
  };
}

export function pulley(
  parent: THREE.Object3D,
  pos: [number, number, number],
  radius = 0.055
) {
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.017, 8, 18), MATS.chrome);
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(...pos);
  parent.add(wheel);
  return new THREE.Vector3(...pos);
}

/** A soft dark ellipse under the figure that reads as a contact shadow. */
export function contactShadow(parent: THREE.Object3D, radius = 0.75) {
  const geo = new THREE.CircleGeometry(radius, 28);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  parent.add(mesh);
  return mesh;
}

export function floor(parent: THREE.Object3D) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), MATS.floor);
  mesh.rotation.x = -Math.PI / 2;
  parent.add(mesh);

  const grid = new THREE.GridHelper(8, 32, 0x2c3138, 0x24282d);
  grid.position.y = 0.002;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.5;
  parent.add(grid);
  return mesh;
}

export function dumbbell(parent: THREE.Object3D, size = 1) {
  const g = new THREE.Group();
  cylinder(g, 0.016, 0.15, [0, 0, 0], MATS.chrome, [0, 0, Math.PI / 2]);
  const headR = 0.062 * size;
  cylinder(g, headR, 0.075, [0.1, 0, 0], MATS.frameDark, [0, 0, Math.PI / 2]);
  cylinder(g, headR, 0.075, [-0.1, 0, 0], MATS.frameDark, [0, 0, Math.PI / 2]);
  parent.add(g);
  return g;
}
