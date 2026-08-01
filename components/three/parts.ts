import * as THREE from 'three';

export const MATS = {
  frame: new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.42, metalness: 0.45 }),
  frameDark: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5, metalness: 0.36 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x16191d, roughness: 0.55, metalness: 0.04 }),
  padSeam: new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.7, metalness: 0.02 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xccd3da, roughness: 0.17, metalness: 0.92 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38, metalness: 0.24 }),
  plate: new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.52, metalness: 0.45 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.94, metalness: 0.0 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.97, metalness: 0.0 }),
  cable: new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.7, metalness: 0.22 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.95, metalness: 0.0 }),
};

// These live for the whole app, so scene teardown must not dispose them —
// otherwise the second exercise you open renders with dead materials.
Object.values(MATS).forEach((m) => {
  m.userData.shared = true;
});

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Box geometry with rounded edges, built by projecting the vertices of a
 * subdivided box onto a rounded shell. Gym frames and upholstery both read as
 * moulded rather than CAD-sharp, and a rounded edge is what catches the light.
 */
export function roundedBoxGeometry(w: number, h: number, d: number, radius = 0.02, seg = 3) {
  const r = Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ix = w / 2 - r;
  const iy = h / 2 - r;
  const iz = d / 2 - r;
  const v = new THREE.Vector3();
  const inner = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    inner.set(
      Math.max(-ix, Math.min(ix, v.x)),
      Math.max(-iy, Math.min(iy, v.y)),
      Math.max(-iz, Math.min(iz, v.z))
    );
    v.sub(inner);
    const len = v.length();
    if (len > 1e-6) v.multiplyScalar(r / len);
    v.add(inner);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

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

/** Static structural tube from a→b, capped at both ends so it reads as solid. */
export function tube(
  parent: THREE.Object3D,
  a: [number, number, number],
  b: [number, number, number],
  radius = 0.035,
  material: THREE.Material = MATS.frame
) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length() || 0.0001;
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().divideScalar(len));

  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 12, 1, false),
    material
  );
  g.add(shaft);
  [len / 2, -len / 2].forEach((y) => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.99, 10, 6), material);
    cap.position.y = y;
    g.add(cap);
  });
  g.position.copy(va).lerp(vb, 0.5);
  g.quaternion.copy(q);
  parent.add(g);
  return g;
}

export function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  material: THREE.Material = MATS.frame,
  rot?: [number, number, number]
) {
  const mesh = new THREE.Mesh(
    roundedBoxGeometry(size[0], size[1], size[2], Math.min(0.018, Math.min(...size) / 2.6)),
    material
  );
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

/** Sharp-edged panel, for things that really are flat sheet steel. */
export function panel(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  material: THREE.Material = MATS.frameDark,
  rot?: [number, number, number]
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

/**
 * Upholstered pad: a cushion with a rolled edge, a stitched centre seam and the
 * steel backing plate it is bolted to.
 */
export function pad(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  rot?: [number, number, number]
) {
  const [w, h, d] = size;
  const holder = new THREE.Group();

  const cushion = new THREE.Mesh(
    roundedBoxGeometry(w, h, d, Math.min(h * 0.48, d * 0.3, 0.05), 4),
    MATS.pad
  );
  cushion.position.y = h * 0.06;
  holder.add(cushion);

  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.9, h * 0.16, d * 0.035),
    MATS.padSeam
  );
  seam.position.set(0, h * 0.5, 0);
  holder.add(seam);

  const backing = new THREE.Mesh(
    roundedBoxGeometry(w * 0.86, h * 0.18, d * 0.82, 0.008),
    MATS.frameDark
  );
  backing.position.y = -h * 0.52;
  holder.add(backing);

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
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), material);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

/** Knurled handle bar lying along the X axis, with rubber sleeves and end caps. */
export function handleBar(parent: THREE.Object3D, length: number, radius = 0.019) {
  const g = new THREE.Group();
  cylinder(g, radius, length, [0, 0, 0], MATS.chrome, [0, 0, Math.PI / 2]);

  [1, -1].forEach((s) => {
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.55, radius * 1.55, length * 0.26, 16),
      MATS.grip
    );
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = s * length * 0.3;
    g.add(sleeve);

    [-0.5, 0.5].forEach((e) => {
      const ridge = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.58, radius * 0.2, 6, 14),
        MATS.grip
      );
      ridge.rotation.y = Math.PI / 2;
      ridge.position.x = s * length * 0.3 + e * length * 0.26;
      g.add(ridge);
    });

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.25, 10, 8),
      MATS.accent
    );
    cap.position.x = s * length * 0.5;
    cap.scale.x = 0.7;
    g.add(cap);
  });

  parent.add(g);
  return g;
}

/** D-handle / stirrup on a cable. */
export function dHandle(parent: THREE.Object3D) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 22), MATS.chrome);
  ring.rotation.y = Math.PI / 2;
  g.add(ring);

  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.11, 12),
    MATS.grip
  );
  sleeve.rotation.set(0, 0, Math.PI / 2);
  sleeve.position.set(0, -0.062, 0);
  g.add(sleeve);

  const shackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.022, 0.006, 6, 14, Math.PI),
    MATS.chrome
  );
  shackle.position.y = 0.086;
  shackle.rotation.y = Math.PI / 2;
  g.add(shackle);

  parent.add(g);
  return g;
}

/** Rubber levelling foot under a frame leg. */
export function rubberFoot(parent: THREE.Object3D, pos: [number, number, number], r = 0.045) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, 0.03, 12), MATS.rubber);
  mesh.position.set(pos[0], 0.015, pos[2]);
  parent.add(mesh);
  return mesh;
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
  const plateW = 0.34;
  const plateD = 0.24;
  const plates: THREE.Object3D[] = [];
  const rodX = 0.115;

  const plateGeo = roundedBoxGeometry(plateW, plateH, plateD, 0.012, 2);
  const holeGeo = new THREE.CylinderGeometry(0.017, 0.017, plateH * 1.06, 10);
  const numberGeo = new THREE.BoxGeometry(0.05, plateH * 0.42, 0.006);

  for (let i = 0; i < count; i++) {
    const slab = new THREE.Group();
    slab.position.y = i * (plateH + gap) + plateH / 2;

    const body = new THREE.Mesh(plateGeo, MATS.plate);
    slab.add(body);

    [rodX, -rodX].forEach((x) => {
      const hole = new THREE.Mesh(holeGeo, MATS.frameDark);
      hole.position.x = x;
      slab.add(hole);
    });

    const label = new THREE.Mesh(numberGeo, i < lifted ? MATS.accent : MATS.frameDark);
    label.position.set(0, 0, plateD / 2 - 0.001);
    slab.add(label);

    g.add(slab);
    plates.push(slab);
  }

  const columnH = count * (plateH + gap);

  cylinder(g, 0.012, columnH + 0.62, [rodX, columnH / 2 + 0.3, 0]);
  cylinder(g, 0.012, columnH + 0.62, [-rodX, columnH / 2 + 0.3, 0]);

  const pin = cylinder(
    g,
    0.013,
    0.11,
    [0, (lifted - 0.5) * (plateH + gap), plateD / 2 + 0.02],
    MATS.accent,
    [Math.PI / 2, 0, 0]
  );
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), MATS.accent);
  pinHead.position.set(0, pin.position.y, plateD / 2 + 0.07);
  g.add(pinHead);

  const carriage = box(g, [0.3, 0.045, 0.2], [0, columnH + 0.06, 0], MATS.frameDark);
  const selectorRod = cylinder(g, 0.014, columnH + 0.1, [0, columnH / 2 + 0.02, 0], MATS.chrome);

  panel(g, [0.02, columnH + 0.5, plateD + 0.06], [plateW / 2 + 0.03, (columnH + 0.5) / 2, 0]);
  panel(g, [0.02, columnH + 0.5, plateD + 0.06], [-plateW / 2 - 0.03, (columnH + 0.5) / 2, 0]);
  panel(g, [plateW + 0.1, columnH + 0.5, 0.018], [0, (columnH + 0.5) / 2, -plateD / 2 - 0.04]);
  panel(g, [plateW + 0.12, 0.05, plateD + 0.12], [0, 0.025, 0], MATS.rubber);

  parent.add(g);

  const liftedPlates = plates.slice(0, lifted);
  const topY = liftedPlates.map((p) => p.position.y);
  const carriageY = carriage.position.y;
  const rodY = selectorRod.position.y;
  const pinY = pin.position.y;

  return {
    group: g,
    /** `t` 0 = racked, 1 = fully raised. */
    setLift(t: number, travel = 0.34) {
      liftedPlates.forEach((p, i) => (p.position.y = topY[i] + t * travel));
      carriage.position.y = carriageY + t * travel;
      selectorRod.position.y = rodY + t * travel;
      pin.position.y = pinY + t * travel;
      pinHead.position.y = pinY + t * travel;
    },
    /** Where the cable leaves the stack. */
    anchor: new THREE.Vector3(pos[0], pos[1] + columnH + 0.1, pos[2]),
    carriage,
  };
}

export function pulley(parent: THREE.Object3D, pos: [number, number, number], radius = 0.055) {
  const g = new THREE.Group();
  g.position.set(...pos);

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.016, 8, 20), MATS.chrome);
  wheel.rotation.y = Math.PI / 2;
  g.add(wheel);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.022, 12),
    MATS.frameDark
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);

  const bracket = new THREE.Mesh(
    new THREE.TorusGeometry(radius + 0.014, 0.008, 6, 16, Math.PI * 1.1),
    MATS.frameDark
  );
  bracket.rotation.y = Math.PI / 2;
  bracket.rotation.z = -Math.PI / 2;
  g.add(bracket);

  parent.add(g);
  return new THREE.Vector3(...pos);
}

/** A soft dark ellipse under the figure that reads as a contact shadow. */
export function contactShadow(parent: THREE.Object3D, radius = 0.75) {
  const geo = new THREE.CircleGeometry(radius, 28);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
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
  cylinder(g, 0.015, 0.32, [0, 0, 0], MATS.chrome, [0, 0, Math.PI / 2]);
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.12, 14),
    MATS.grip
  );
  grip.rotation.z = Math.PI / 2;
  g.add(grip);

  // The heads sit clear of the fist: a closed hand is ~16 cm across the thumb.
  const headR = 0.062 * size;
  [1, -1].forEach((s) => {
    const head = new THREE.Mesh(
      roundedBoxGeometry(0.075, headR * 2, headR * 2, headR * 0.55, 3),
      MATS.frameDark
    );
    head.position.x = s * 0.145;
    g.add(head);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.018, 12),
      MATS.chrome
    );
    collar.rotation.z = Math.PI / 2;
    collar.position.x = s * 0.1;
    g.add(collar);
  });

  parent.add(g);
  return g;
}
