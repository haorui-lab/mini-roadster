import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RefObject } from "react";
import type { Session } from "./session.ts";
import type { World } from "./types.ts";
import { roadDir } from "./world.ts";

const PALETTE = ["#1b1f27", "#c5c8ce", "#8e1e2c", "#d9d3c7", "#1d3d5c", "#3c3f46"];

function box(sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  geo.translate(x, y, z);
  return geo;
}

function mergeGeos(geos: THREE.BufferGeometry[]) {
  let verts = 0;
  let indices = 0;
  for (const g of geos) {
    verts += g.attributes.position!.count;
    indices += g.index?.count ?? 0;
  }
  const pos = new Float32Array(verts * 3);
  const idx = new Uint32Array(indices);
  let v = 0;
  let i = 0;
  for (const g of geos) {
    pos.set(g.attributes.position!.array as Float32Array, v * 3);
    const index = g.index!;
    for (let k = 0; k < index.count; k++) idx[i++] = index.getX(k) + v;
    v += g.attributes.position!.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}

function sedanGeometry() {
  return mergeGeos([
    box(1.62, 0.36, 3.15, 0, 0.4, 0.05),
    box(1.42, 0.28, 1.25, 0, 0.68, -0.15),
    box(1.5, 0.1, 0.55, 0, 0.28, 1.45),
    box(1.48, 0.16, 0.4, 0, 0.32, -1.45),
    box(0.28, 0.46, 0.46, 0.72, 0.24, 1.02),
    box(0.28, 0.46, 0.46, -0.72, 0.24, 1.02),
    box(0.28, 0.46, 0.46, 0.72, 0.24, -1.05),
    box(0.28, 0.46, 0.46, -0.72, 0.24, -1.05),
  ]);
}

type Parked = { x: number; z: number; yaw: number; color: number };

function parkedAlong(world: World): Parked[] {
  const out: Parked[] = [];
  let n = 0;
  const fx = world.focus.x;
  const fz = world.focus.z;
  const span = world.bounds;
  const push = (x: number, z: number, yaw: number) => {
    if (out.length > 160) return;
    if (Math.hypot(x - fx, z - fz) < 16) return;
    if (world.linesX.some((line) => Math.abs(x - line) < 2.2) && world.linesZ.some((line) => Math.abs(z - line) < 2.2)) return;
    out.push({ x, z, yaw, color: n % PALETTE.length });
    n += 1;
  };
  for (const x of world.linesX) {
    if (Math.abs(x - fx) > span) continue;
    const dir = roadDir(x);
    const yaw = dir > 0 ? Math.PI : 0;
    for (let z = fz - span; z < fz + span; z += 64) {
      if (((Math.round(x / 32) + Math.round(z / 64)) & 1) !== 0) continue;
      if (world.linesZ.some((line) => Math.abs(z - line) < world.road * 0.65)) continue;
      push(x + world.road * 0.5 + 2.35, z, yaw);
      if ((Math.round(z) + Math.round(x)) % 44 !== 0) push(x - world.road * 0.5 - 2.35, z + 9, yaw);
    }
  }
  for (const z of world.linesZ) {
    if (Math.abs(z - fz) > span) continue;
    const dir = roadDir(z);
    const yaw = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    for (let x = fx - span; x < fx + span; x += 64) {
      if (((Math.round(z / 32) + Math.round(x / 64)) & 1) !== 0) continue;
      if (world.linesX.some((line) => Math.abs(x - line) < world.road * 0.65)) continue;
      push(x, z + world.road * 0.5 + 2.35, yaw);
    }
  }
  return out;
}

const LIGHTS = [
  { x: 0.48, y: 0.38, z: 1.52, color: "#fff1d2", sx: 0.18, sy: 0.08, sz: 0.06 },
  { x: -0.48, y: 0.38, z: 1.52, color: "#fff1d2", sx: 0.18, sy: 0.08, sz: 0.06 },
  { x: 0, y: 0.5, z: -1.58, color: "#ff2238", sx: 1.2, sy: 0.07, sz: 0.05 },
];

export function TrafficFleet({ api, world }: { api: RefObject<Session>; world: World }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => sedanGeometry(), []);
  const parked = useMemo(() => parkedAlong(world), [world]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const colors = useMemo(() => PALETTE.map((hex) => new THREE.Color(hex)), []);
  const lightColors = useMemo(() => LIGHTS.map((l) => new THREE.Color(l.color)), []);
  const total = world.traffic.length + parked.length;

  useLayoutEffect(() => {
    const mesh = bodyRef.current;
    const lights = lightRef.current;
    if (!mesh || !lights) return;
    const paint = (index: number, x: number, y: number, z: number, yaw: number, color: number) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw + Math.PI, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, colors[color % colors.length]!);
      for (let k = 0; k < LIGHTS.length; k++) {
        const spec = LIGHTS[k]!;
        tmp.set(spec.x, spec.y, spec.z).applyQuaternion(dummy.quaternion);
        dummy.position.set(x + tmp.x, y + tmp.y, z + tmp.z);
        dummy.scale.set(spec.sx, spec.sy, spec.sz);
        dummy.updateMatrix();
        lights.setMatrixAt(index * LIGHTS.length + k, dummy.matrix);
        lights.setColorAt(index * LIGHTS.length + k, lightColors[k]!);
      }
    };
    const live = api.current.traffic;
    const moving = live.length === world.traffic.length ? live : world.traffic;
    for (let i = 0; i < moving.length; i++) {
      const t = moving[i]!;
      paint(i, t.x, 0, t.z, t.yaw, t.color);
    }
    parked.forEach((p, i) => paint(world.traffic.length + i, p.x, 0.14, p.z, p.yaw, p.color));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    lights.instanceMatrix.needsUpdate = true;
    if (lights.instanceColor) lights.instanceColor.needsUpdate = true;
    const lightMat = lights.material;
    if (!Array.isArray(lightMat) && lightMat instanceof THREE.MeshBasicMaterial) {
      lightMat.color.setRGB(3.4, 3.4, 3.4);
      lightMat.toneMapped = false;
    }
  }, [api, colors, dummy, lightColors, parked, tmp, world.traffic.length]);

  useFrame(() => {
    const mesh = bodyRef.current;
    const lights = lightRef.current;
    if (!mesh || !lights) return;
    const cars = api.current.traffic;
    for (let i = 0; i < cars.length; i++) {
      const t = cars[i]!;
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.yaw + Math.PI, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < LIGHTS.length; k++) {
        const spec = LIGHTS[k]!;
        tmp.set(spec.x, spec.y, spec.z).applyQuaternion(dummy.quaternion);
        dummy.position.set(t.x + tmp.x, tmp.y, t.z + tmp.z);
        dummy.scale.set(spec.sx, spec.sy, spec.sz);
        dummy.updateMatrix();
        lights.setMatrixAt(i * LIGHTS.length + k, dummy.matrix);
        dummy.position.set(t.x, 0, t.z);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    lights.instanceMatrix.needsUpdate = true;
  });

  if (total === 0) return null;
  return (
    <>
      <instancedMesh ref={bodyRef} args={[geo, undefined, total]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.42} metalness={0.55} envMapIntensity={0.8} />
      </instancedMesh>
      <instancedMesh ref={lightRef} args={[undefined, undefined, total * LIGHTS.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}
