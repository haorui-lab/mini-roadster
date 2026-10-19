import * as THREE from "three";

export type Station = { z: number; pts: readonly (readonly [number, number])[] };

/** Hard-edged loft. Ring is +X profile from belly center up to roof center. */
export function loftGeometry(stations: readonly Station[]): THREE.BufferGeometry {
  const count = stations[0]!.pts.length;
  const rings = stations.map((s) => {
    if (s.pts.length !== count) throw new Error("loft stations must share a point count");
    const ring: THREE.Vector3[] = [];
    for (const [x, y] of s.pts) ring.push(new THREE.Vector3(x, y, s.z));
    for (let i = count - 2; i >= 1; i--) {
      const [x, y] = s.pts[i]!;
      ring.push(new THREE.Vector3(-x, y, s.z));
    }
    return ring;
  });
  const n = rings[0]!.length;
  const positions: number[] = [];
  const indices: number[] = [];
  const add = (v: THREE.Vector3) => {
    positions.push(v.x, v.y, v.z);
    return positions.length / 3 - 1;
  };
  for (let s = 0; s < rings.length - 1; s++) {
    const a = rings[s]!;
    const b = rings[s + 1]!;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const ia = add(a[i]!);
      const ib = add(a[i2]!);
      const ic = add(b[i2]!);
      const id = add(b[i]!);
      indices.push(ia, ib, id, ib, ic, id);
    }
  }
  const cap = (ring: THREE.Vector3[], flip: boolean) => {
    let cy = 0;
    for (const v of ring) cy += v.y;
    cy /= ring.length;
    const center = add(new THREE.Vector3(0, cy, ring[0]!.z));
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const ia = add(ring[i]!);
      const ib = add(ring[i2]!);
      if (flip) indices.push(center, ib, ia);
      else indices.push(center, ia, ib);
    }
  };
  cap(rings[0]!, true);
  cap(rings[rings.length - 1]!, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Angular 2026 Roadster: low nose, kicked tail, flat planes. +Z is the nose.
const BODY: Station[] = [
  { z: 1.74, pts: [[0, 0.08], [0.16, 0.07], [0.3, 0.1], [0.36, 0.16], [0.32, 0.22], [0.18, 0.26], [0.08, 0.28], [0, 0.29]] },
  { z: 1.5, pts: [[0, 0.0], [0.34, -0.01], [0.56, 0.04], [0.66, 0.14], [0.6, 0.24], [0.36, 0.3], [0.14, 0.33], [0, 0.34]] },
  { z: 1.24, pts: [[0, -0.02], [0.4, -0.01], [0.68, 0.06], [0.8, 0.18], [0.74, 0.3], [0.44, 0.36], [0.16, 0.39], [0, 0.4]] },
  { z: 1.02, pts: [[0, 0.1], [0.32, 0.14], [0.56, 0.24], [0.8, 0.34], [0.78, 0.4], [0.48, 0.42], [0.16, 0.44], [0, 0.45]] },
  { z: 0.76, pts: [[0, 0.0], [0.42, 0.02], [0.72, 0.1], [0.86, 0.22], [0.82, 0.34], [0.5, 0.42], [0.18, 0.48], [0, 0.5]] },
  { z: 0.42, pts: [[0, -0.04], [0.48, -0.04], [0.76, 0.06], [0.88, 0.2], [0.86, 0.36], [0.56, 0.46], [0.2, 0.52], [0, 0.54]] },
  { z: 0.05, pts: [[0, -0.04], [0.5, -0.05], [0.78, 0.06], [0.9, 0.24], [0.88, 0.4], [0.58, 0.5], [0.22, 0.56], [0, 0.58]] },
  { z: -0.32, pts: [[0, -0.03], [0.52, -0.05], [0.8, 0.08], [0.92, 0.28], [0.9, 0.46], [0.6, 0.56], [0.22, 0.62], [0, 0.64]] },
  { z: -0.66, pts: [[0, -0.02], [0.5, -0.02], [0.76, 0.12], [0.92, 0.34], [0.92, 0.52], [0.62, 0.64], [0.24, 0.7], [0, 0.72]] },
  { z: -0.96, pts: [[0, 0.08], [0.34, 0.12], [0.6, 0.26], [0.88, 0.42], [0.92, 0.58], [0.62, 0.7], [0.24, 0.76], [0, 0.78]] },
  { z: -1.24, pts: [[0, 0.02], [0.46, 0.02], [0.72, 0.16], [0.9, 0.38], [0.92, 0.58], [0.6, 0.72], [0.22, 0.78], [0, 0.8]] },
  { z: -1.5, pts: [[0, 0.06], [0.42, 0.06], [0.68, 0.2], [0.84, 0.4], [0.84, 0.58], [0.52, 0.7], [0.18, 0.76], [0, 0.78]] },
  { z: -1.66, pts: [[0, 0.1], [0.36, 0.1], [0.58, 0.22], [0.74, 0.4], [0.72, 0.56], [0.42, 0.66], [0.14, 0.7], [0, 0.72]] },
];

export const bodyGeo = loftGeometry(BODY);

export const NOZZLE_X = [-0.46, -0.17, 0.17, 0.46] as const;
export const WHEEL_X = 0.8;
export const WHEEL_Y = -0.21;
export const WHEEL_Z_FRONT = 1.02;
export const WHEEL_Z_REAR = -1.08;
