import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Building, World } from "./types.ts";
import { LANE, roadDir } from "./world.ts";

const NIGHT = ["#2c3548", "#1c2636", "#3a3348", "#243044", "#2a242c", "#1a2838", "#34302a"];
const NEON = ["#ff2d55", "#3ee0ff", "#ffb020", "#c9a0ff"];

function nearest(v: number, lines: number[]) {
  let d = Infinity;
  for (const line of lines) d = Math.min(d, Math.abs(v - line));
  return d;
}

const skyVert = `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = `
  varying vec3 vDir;
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 zenith = vec3(0.012, 0.018, 0.04);
    vec3 mid = vec3(0.05, 0.07, 0.12);
    vec3 horizon = vec3(0.28, 0.08, 0.1);
    vec3 col = mix(horizon, mid, smoothstep(-0.08, 0.22, h));
    col = mix(col, zenith, smoothstep(0.12, 0.75, h));
    vec3 cell = floor(dir * 240.0);
    float n = fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    float star = smoothstep(0.993, 1.0, n) * smoothstep(0.08, 0.35, h);
    col += star * 0.85;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function paint(mesh: THREE.InstancedMesh, items: { apply: (m: THREE.Matrix4, c: THREE.Color, i: number) => void }) {
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let i = 0; i < mesh.count; i++) {
    items.apply(matrix, color, i);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function grainTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#c8c8c8";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const v = 90 + Math.random() * 80;
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  for (let y = 8; y < 128; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function asphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#8d9096";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const v = 40 + Math.random() * 90;
    ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function StudioEnv() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = new THREE.Scene();
    const room = new THREE.Mesh(
      new THREE.SphereGeometry(14, 28, 18),
      new THREE.MeshBasicMaterial({ color: "#141820", side: THREE.BackSide }),
    );
    env.add(room);
    const box = (color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color }));
      mesh.position.set(x, y, z);
      env.add(mesh);
    };
    box("#ffffff", 0, 7, 3.5, 8, 0.4, 2.4);
    box("#ffe6cf", -4, 4.2, 5, 1.4, 2.6, 0.35);
    box("#ff2a3c", -5.5, 1.6, -1, 0.3, 3.2, 5);
    box("#8ec6ff", 5.5, 2.4, 1.5, 0.3, 2.4, 3.4);
    box("#090b10", 0, -5, 0, 22, 0.4, 22);
    const tex = pmrem.fromScene(env, 0.03).texture;
    scene.environment = tex;
    scene.environmentIntensity = 1.15;
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

const CHUNK = 384;

function BuildingChunks({ buildings, grain }: { buildings: Building[]; grain: THREE.Texture | null }) {
  const groups = useMemo(() => {
    const map = new Map<string, Building[]>();
    for (const b of buildings) {
      const key = `${Math.floor(b.x / CHUNK)}:${Math.floor(b.z / CHUNK)}`;
      const list = map.get(key);
      if (list) list.push(b);
      else map.set(key, [b]);
    }
    return [...map.values()];
  }, [buildings]);
  return groups.map((list) => (
    <BuildingChunk key={`${list[0]!.x}:${list[0]!.z}:${list.length}`} list={list} grain={grain} />
  ));
}

function BuildingChunk({ list, grain }: { list: Building[]; grain: THREE.Texture | null }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const cap = useRef<THREE.InstancedMesh>(null);
  const podium = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const q = new THREE.Quaternion();
    const paintList = (
      mesh: THREE.InstancedMesh | null,
      place: (b: Building, m: THREE.Matrix4, c: THREE.Color) => void,
    ) => {
      if (!mesh) return;
      const m = new THREE.Matrix4();
      const c = new THREE.Color();
      for (let i = 0; i < list.length; i++) {
        place(list[i]!, m, c);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    paintList(body.current, (b, m, c) => {
      m.compose(new THREE.Vector3(b.x, b.h / 2, b.z), q, new THREE.Vector3(b.hw * 2, b.h, b.hd * 2));
      c.set(NIGHT[b.facade % NIGHT.length] ?? "#232b3a");
    });
    paintList(cap.current, (b, m, c) => {
      m.compose(new THREE.Vector3(b.x, b.h + 0.12, b.z), q, new THREE.Vector3(b.hw * 2.04, 0.22, b.hd * 2.04));
      c.set(b.landable ? "#8e97a6" : "#12161e");
    });
    paintList(podium.current, (b, m, c) => {
      const ph = Math.min(2.15, b.h * 0.32);
      m.compose(new THREE.Vector3(b.x, ph / 2, b.z), q, new THREE.Vector3(b.hw * 2.16, ph, b.hd * 2.16));
      c.set("#0d1118");
    });
  }, [list]);
  return (
    <>
      <instancedMesh ref={podium} args={[undefined, undefined, list.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0d1118" roughness={0.7} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={body} args={[undefined, undefined, list.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={grain ?? undefined} roughness={0.72} metalness={0.16} envMapIntensity={0.45} />
      </instancedMesh>
      <instancedMesh ref={cap} args={[undefined, undefined, list.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.4} metalness={0.55} />
      </instancedMesh>
    </>
  );
}

export function City({ world }: { world: World }) {
  const grain = useMemo(() => grainTexture(), []);
  const asphalt = useMemo(() => asphaltTexture(), []);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const padRef = useRef<THREE.InstancedMesh>(null);
  const launchRef = useRef<THREE.InstancedMesh>(null);
  const beaconRef = useRef<THREE.InstancedMesh>(null);
  const winX = useRef<THREE.InstancedMesh>(null);
  const winZ = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const dashRef = useRef<THREE.InstancedMesh>(null);
  const plazaRef = useRef<THREE.InstancedMesh>(null);
  const curbRef = useRef<THREE.InstancedMesh>(null);
  const neonRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const arrowRef = useRef<THREE.InstancedMesh>(null);

  const landable = useMemo(() => world.buildings.filter((b, i) => b.landable && i % 2 === 0), [world]);
  const towers = useMemo(() => world.buildings.filter((b, i) => !b.landable && i % 3 === 0), [world]);
  const winAlongX = useMemo(() => world.windows.filter((w) => w.axis === "x"), [world]);
  const winAlongZ = useMemo(() => world.windows.filter((w) => w.axis === "z"), [world]);
  const arrowGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.62, 0);
    shape.lineTo(-0.38, 0.3);
    shape.lineTo(-0.16, 0);
    shape.lineTo(-0.38, -0.3);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);
  const dashes = useMemo(() => {
    const out: { x: number; z: number; rot: number; sx: number; sz: number }[] = [];
    const linesX = world.linesX;
    const linesZ = world.linesZ;
    for (const z of linesZ) {
      for (let i = 0; i < linesX.length - 1; i++) {
        const a = linesX[i]!;
        const b = linesX[i + 1]!;
        for (const t of [0.28, 0.5, 0.72]) {
          out.push({ x: a + (b - a) * t, z, rot: 0, sx: 2.15, sz: 0.14 });
        }
      }
    }
    for (const x of linesX) {
      for (let j = 0; j < linesZ.length - 1; j++) {
        const a = linesZ[j]!;
        const b = linesZ[j + 1]!;
        for (const t of [0.28, 0.5, 0.72]) {
          out.push({ x, z: a + (b - a) * t, rot: Math.PI / 2, sx: 2.15, sz: 0.14 });
        }
      }
    }
    for (const x of linesX) {
      for (const z of linesZ) {
        const spanW = 8.6;
        for (let k = 0; k < 3; k++) {
          const o = -0.7 + k * 0.7;
          out.push({ x, z: z + 7.4 + o, rot: Math.PI / 2, sx: 0.34, sz: spanW });
          out.push({ x, z: z - 7.4 + o, rot: Math.PI / 2, sx: 0.34, sz: spanW });
          out.push({ x: x + 7.4 + o, z, rot: 0, sx: 0.34, sz: spanW });
          out.push({ x: x - 7.4 + o, z, rot: 0, sx: 0.34, sz: spanW });
        }
      }
    }
    return out;
  }, [world]);
  const arrows = useMemo(() => {
    const out: { x: number; z: number; yaw: number }[] = [];
    const linesX = world.linesX;
    const linesZ = world.linesZ;
    for (const z of linesZ) {
      const dir = roadDir(z);
      const yaw = dir > 0 ? 0 : Math.PI;
      for (let i = 0; i < linesX.length - 1; i++) {
        const mid = (linesX[i]! + linesX[i + 1]!) / 2;
        out.push({ x: mid, z: z - LANE, yaw });
        out.push({ x: mid, z: z + LANE, yaw });
      }
    }
    for (const x of linesX) {
      const dir = roadDir(x);
      const yaw = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let j = 0; j < linesZ.length - 1; j++) {
        const mid = (linesZ[j]! + linesZ[j + 1]!) / 2;
        out.push({ x: x - LANE, z: mid, yaw });
        out.push({ x: x + LANE, z: mid, yaw });
      }
    }
    return out;
  }, [world]);
  const plazas = useMemo(() => {
    const out: { x: number; z: number; sx: number; sz: number }[] = [];
    const linesX = world.linesX;
    const linesZ = world.linesZ;
    for (let i = 0; i < linesX.length - 1; i++) {
      for (let j = 0; j < linesZ.length - 1; j++) {
        const x0 = linesX[i]! + world.road / 2;
        const x1 = linesX[i + 1]! - world.road / 2;
        const z0 = linesZ[j]! + world.road / 2;
        const z1 = linesZ[j + 1]! - world.road / 2;
        out.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, sx: x1 - x0, sz: z1 - z0 });
      }
    }
    return out;
  }, [world]);

  const curbs = useMemo(() => {
    const out: { x: number; y: number; z: number; sx: number; sy: number; sz: number; shade: number }[] = [];
    const linesX = world.linesX;
    const linesZ = world.linesZ;
    const road = world.road;
    const push = (x: number, z: number, sx: number, sz: number) => {
      out.push({ x, y: 0.08, z, sx, sy: 0.14, sz, shade: 0 });
    };
    for (const z of linesZ) {
      for (let i = 0; i < linesX.length - 1; i++) {
        const a = linesX[i]! + road / 2;
        const b = linesX[i + 1]! - road / 2;
        const len = b - a;
        if (len < 4) continue;
        const mid = (a + b) / 2;
        for (const side of [-1, 1]) {
          push(mid, z + side * (road / 2 + 1.05), len, 2.15);
          out.push({
            x: mid,
            y: 0.13,
            z: z + side * (road / 2 - 0.08),
            sx: len,
            sy: 0.2,
            sz: 0.28,
            shade: 1,
          });
          out.push({
            x: mid,
            y: 0.045,
            z: z + side * (road / 2 - 0.42),
            sx: len,
            sy: 0.02,
            sz: 0.14,
            shade: 2,
          });
        }
      }
    }
    for (const x of linesX) {
      for (let j = 0; j < linesZ.length - 1; j++) {
        const a = linesZ[j]! + road / 2;
        const b = linesZ[j + 1]! - road / 2;
        const len = b - a;
        if (len < 4) continue;
        const mid = (a + b) / 2;
        for (const side of [-1, 1]) {
          push(x + side * (road / 2 + 1.05), mid, 2.15, len);
          out.push({
            x: x + side * (road / 2 - 0.08),
            y: 0.13,
            z: mid,
            sx: 0.28,
            sy: 0.2,
            sz: len,
            shade: 1,
          });
          out.push({
            x: x + side * (road / 2 - 0.42),
            y: 0.045,
            z: mid,
            sx: 0.14,
            sy: 0.02,
            sz: len,
            shade: 2,
          });
        }
      }
    }
    return out;
  }, [world]);

  const neons = useMemo(() => {
    const out: { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: number }[] = [];
    const linesX = world.linesX;
    const linesZ = world.linesZ;
    world.buildings.forEach((b, i) => {
      if (i % 4 !== 0 || out.length > 2400) return;
      const faces = [
        { x: b.x, z: b.z + b.hd + 0.16, sx: Math.min(b.hw * 1.45, 6.4), sz: 0.08, d: nearest(b.z + b.hd, linesZ) },
        { x: b.x, z: b.z - b.hd - 0.16, sx: Math.min(b.hw * 1.45, 6.4), sz: 0.08, d: nearest(b.z - b.hd, linesZ) },
        { x: b.x + b.hw + 0.16, z: b.z, sx: 0.08, sz: Math.min(b.hd * 1.45, 6.4), d: nearest(b.x + b.hw, linesX) },
        { x: b.x - b.hw - 0.16, z: b.z, sx: 0.08, sz: Math.min(b.hd * 1.45, 6.4), d: nearest(b.x - b.hw, linesX) },
      ].sort((a, c) => a.d - c.d);
      const face = faces[0]!;
      const y = Math.min(7.2, Math.max(2.8, b.h * 0.38));
      out.push({
        x: face.x,
        y,
        z: face.z,
        sx: face.sx,
        sy: Math.min(1.25, b.h * 0.18),
        sz: face.sz,
        color: i % NEON.length,
      });
      if (i % 2 === 0 && b.h > 4) {
        out.push({
          x: face.x,
          y: 1.7,
          z: face.z,
          sx: face.sx > face.sz ? Math.min(face.sx * 1.05, 7) : 0.06,
          sy: 0.62,
          sz: face.sz > face.sx ? Math.min(face.sz * 1.05, 7) : 0.06,
          color: (i + 1) % NEON.length,
        });
      }
    });
    return out;
  }, [world]);

  const crowns = useMemo(() => world.buildings.filter((b) => b.h > 18), [world]);

  useLayoutEffect(() => {
    const q = new THREE.Quaternion();
    const padQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const up = new THREE.Vector3(0, 1, 0);
    if (padRef.current) {
      paint(padRef.current, {
        apply: (m, c, i) => {
          const b: Building = landable[i]!;
          const r = Math.min(b.hw, b.hd) * 0.42;
          m.compose(new THREE.Vector3(b.x, b.h + 0.28, b.z), padQ, new THREE.Vector3(r, r, r));
          c.set("#9adfff");
        },
      });
    }
    if (launchRef.current) {
      paint(launchRef.current, {
        apply: (m, c, i) => {
          const p = world.pads[i]!;
          m.compose(new THREE.Vector3(p.x, 0.08, p.z), q, new THREE.Vector3(p.hw * 2, 0.08, p.hd * 2));
          c.set("#ff3355");
        },
      });
    }
    if (beaconRef.current) {
      paint(beaconRef.current, {
        apply: (m, c, i) => {
          const b = towers[i]!;
          m.compose(new THREE.Vector3(b.x, b.h + 1.1, b.z), q, new THREE.Vector3(0.12, 1.6, 0.12));
          c.set("#ff3355");
        },
      });
    }
    const placeWin = (mesh: THREE.InstancedMesh | null, list: typeof winAlongX, thin: "x" | "z") => {
      if (!mesh) return;
      paint(mesh, {
        apply: (m, c, i) => {
          const w = list[i]!;
          const sx = thin === "x" ? 0.85 : 0.06;
          const sz = thin === "z" ? 0.85 : 0.06;
          m.compose(new THREE.Vector3(w.x, w.y, w.z), q, new THREE.Vector3(sx, 0.7, sz));
          c.set(w.warm ? "#ffb067" : "#9ee7ff");
        },
      });
    };
    placeWin(winX.current, winAlongX, "x");
    placeWin(winZ.current, winAlongZ, "z");
    if (treeRef.current) {
      paint(treeRef.current, {
        apply: (m, c, i) => {
          const t = world.trees[i]!;
          m.compose(new THREE.Vector3(t.x, 1.5 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
          c.set(i % 2 === 0 ? "#1c4a40" : "#234f46");
        },
      });
    }
    if (trunkRef.current) {
      paint(trunkRef.current, {
        apply: (m, c, i) => {
          const t = world.trees[i]!;
          m.compose(new THREE.Vector3(t.x, 0.45 * t.s, t.z), q, new THREE.Vector3(0.18 * t.s, 0.9 * t.s, 0.18 * t.s));
          c.set("#4a3428");
        },
      });
    }
    if (dashRef.current) {
      paint(dashRef.current, {
        apply: (m, c, i) => {
          const d = dashes[i]!;
          q.setFromAxisAngle(up, d.rot);
          m.compose(new THREE.Vector3(d.x, 0.05, d.z), q, new THREE.Vector3(d.sx, 1, d.sz));
          c.set("#f4f1ea");
          q.identity();
        },
      });
    }
    if (arrowRef.current) {
      paint(arrowRef.current, {
        apply: (m, c, i) => {
          const a = arrows[i]!;
          q.setFromAxisAngle(up, a.yaw);
          m.compose(new THREE.Vector3(a.x, 0.07, a.z), q, new THREE.Vector3(1.4, 1, 1.4));
          c.set("#f6f1e4");
          q.identity();
        },
      });
    }
    if (plazaRef.current) {
      paint(plazaRef.current, {
        apply: (m, c, i) => {
          const p = plazas[i]!;
          m.compose(new THREE.Vector3(p.x, 0.012, p.z), q, new THREE.Vector3(p.sx, 1, p.sz));
          c.set("#10141c");
        },
      });
    }
    if (curbRef.current) {
      paint(curbRef.current, {
        apply: (m, c, i) => {
          const curb = curbs[i]!;
          m.compose(
            new THREE.Vector3(curb.x, curb.y, curb.z),
            q,
            new THREE.Vector3(curb.sx, curb.sy, curb.sz),
          );
          c.set(curb.shade === 0 ? "#2a3140" : curb.shade === 1 ? "#c5ced8" : "#f4f1ea");
        },
      });
    }
    if (neonRef.current) {
      paint(neonRef.current, {
        apply: (m, c, i) => {
          const n = neons[i]!;
          m.compose(new THREE.Vector3(n.x, n.y, n.z), q, new THREE.Vector3(n.sx, n.sy, n.sz));
          c.set(NEON[n.color] ?? "#ff2d55");
        },
      });
      const mat = neonRef.current.material;
      if (!Array.isArray(mat) && mat instanceof THREE.MeshBasicMaterial) {
        mat.color.setRGB(2.6, 2.6, 2.6);
        mat.toneMapped = false;
      }
    }
    if (crownRef.current) {
      paint(crownRef.current, {
        apply: (m, c, i) => {
          const b = crowns[i]!;
          m.compose(new THREE.Vector3(b.x, b.h + 0.85, b.z), q, new THREE.Vector3(b.hw * 1.05, 1.35, b.hd * 1.05));
          c.set("#8eb6d8");
        },
      });
    }
    const boostWin = (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      const mat = mesh.material;
      if (!Array.isArray(mat) && mat instanceof THREE.MeshBasicMaterial) {
        mat.color.setRGB(1.85, 1.85, 1.85);
        mat.toneMapped = false;
      }
    };
    boostWin(winX.current);
    boostWin(winZ.current);
  }, [arrows, crowns, curbs, dashes, landable, neons, plazas, towers, winAlongX, winAlongZ, world]);

  return (
    <>
      <StudioEnv />
      <color attach="background" args={["#070910"]} />
      <fog attach="fog" args={["#0b1018", 78, 190]} />
      <hemisphereLight args={["#c5d2ea", "#1a0c10", 0.62]} />
      <directionalLight position={[18, 36, 14]} intensity={0.72} color="#d5dbe8" />
      <directionalLight position={[-26, 14, -10]} intensity={0.55} color="#ff3355" />
      <spotLight position={[5.5, 9, 7]} angle={0.62} penumbra={0.72} intensity={70} distance={32} color="#fff8f2" />
      <spotLight position={[-7, 4.2, -8]} angle={0.7} penumbra={0.8} intensity={36} distance={26} color="#ff2244" />
      <mesh scale={[world.bounds * 2.4, world.bounds * 2.4, world.bounds * 2.4]}>
        <sphereGeometry args={[1, 28, 18]} />
        <shaderMaterial side={THREE.BackSide} depthWrite={false} vertexShader={skyVert} fragmentShader={skyFrag} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[world.bounds * 2 + 180, world.bounds * 2 + 180]} />
        <meshStandardMaterial color="#0c1016" roughness={0.95} metalness={0.04} />
      </mesh>
      {plazas.length > 0 && (
        <instancedMesh frustumCulled={false} ref={plazaRef} args={[undefined, undefined, plazas.length]}>
          <boxGeometry args={[1, 0.04, 1]} />
          <meshStandardMaterial color="#141820" roughness={0.88} metalness={0.08} />
        </instancedMesh>
      )}
      {world.linesZ.map((z) => {
        const x0 = world.linesX[0]! - 56;
        const x1 = world.linesX[world.linesX.length - 1]! + 56;
        return (
          <mesh key={`rz${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.03, z]} receiveShadow>
            <planeGeometry args={[x1 - x0, world.road]} />
            <meshStandardMaterial
              color="#10141c"
              map={asphalt ?? undefined}
              roughness={0.28}
              metalness={0.62}
              envMapIntensity={1.15}
            />
          </mesh>
        );
      })}
      {world.linesX.map((x) => {
        const z0 = world.linesZ[0]! - 56;
        const z1 = world.linesZ[world.linesZ.length - 1]! + 56;
        return (
          <mesh key={`rx${x}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[x, 0.034, (z0 + z1) / 2]} receiveShadow>
            <planeGeometry args={[z1 - z0, world.road]} />
            <meshStandardMaterial
              color="#10141c"
              map={asphalt ?? undefined}
              roughness={0.28}
              metalness={0.62}
              envMapIntensity={1.15}
            />
          </mesh>
        );
      })}
      {dashes.length > 0 && (
        <instancedMesh frustumCulled={false} ref={dashRef} args={[undefined, undefined, dashes.length]}>
          <boxGeometry args={[1, 0.03, 1]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.4} metalness={0.08} emissive="#f4f1ea" emissiveIntensity={0.22} />
        </instancedMesh>
      )}
      {arrows.length > 0 && (
        <instancedMesh frustumCulled={false} ref={arrowRef} args={[arrowGeo, undefined, arrows.length]}>
          <meshStandardMaterial color="#f6f1e4" roughness={0.4} metalness={0.04} emissive="#f7f3e8" emissiveIntensity={0.55} />
        </instancedMesh>
      )}
      {curbs.length > 0 && (
        <instancedMesh frustumCulled={false} ref={curbRef} args={[undefined, undefined, curbs.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.82} metalness={0.08} />
        </instancedMesh>
      )}
      {neons.length > 0 && (
        <instancedMesh frustumCulled={false} ref={neonRef} args={[undefined, undefined, neons.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
      <BuildingChunks buildings={world.buildings} grain={grain} />
      {crowns.length > 0 && (
        <instancedMesh frustumCulled={false} ref={crownRef} args={[undefined, undefined, crowns.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#8eb6d8" roughness={0.12} metalness={0.82} emissive="#1a3a55" emissiveIntensity={0.35} />
        </instancedMesh>
      )}
      {landable.length > 0 && (
        <instancedMesh frustumCulled={false} ref={padRef} args={[undefined, undefined, landable.length]}>
          <torusGeometry args={[1, 0.08, 8, 28]} />
          <meshStandardMaterial color="#9adfff" emissive="#49d6ff" emissiveIntensity={1.4} roughness={0.25} metalness={0.4} />
        </instancedMesh>
      )}
      {towers.length > 0 && (
        <instancedMesh frustumCulled={false} ref={beaconRef} args={[undefined, undefined, towers.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff3355" emissive="#ff2244" emissiveIntensity={4} toneMapped={false} />
        </instancedMesh>
      )}
      {winAlongX.length > 0 && (
        <instancedMesh frustumCulled={false} ref={winX} args={[undefined, undefined, winAlongX.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial />
        </instancedMesh>
      )}
      {winAlongZ.length > 0 && (
        <instancedMesh frustumCulled={false} ref={winZ} args={[undefined, undefined, winAlongZ.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial />
        </instancedMesh>
      )}
      {world.trees.length > 0 && (
        <>
          <instancedMesh frustumCulled={false} ref={trunkRef} args={[undefined, undefined, world.trees.length]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial roughness={0.9} />
          </instancedMesh>
          <instancedMesh frustumCulled={false} ref={treeRef} args={[undefined, undefined, world.trees.length]}>
            <sphereGeometry args={[0.85, 10, 8]} />
            <meshStandardMaterial roughness={0.8} />
          </instancedMesh>
        </>
      )}
      {world.pads.length > 0 && (
        <instancedMesh frustumCulled={false} ref={launchRef} args={[undefined, undefined, world.pads.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#141820" emissive="#ff3355" emissiveIntensity={0.55} roughness={0.35} metalness={0.4} />
        </instancedMesh>
      )}
      {[0, 1, 2].map((i) => {
        const ox = [-18, 22, -8][i]!;
        const oz = [-14, 16, 28][i]!;
        return (
          <mesh key={`beam${i}`} position={[world.focus.x + ox, 22, world.focus.z + oz]}>
            <cylinderGeometry args={[1.4, 6.5, 44, 10, 1, true]} />
            <meshBasicMaterial
              color={i === 1 ? "#ff2244" : "#d7e7ff"}
              transparent
              opacity={0.035}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
      {world.linesX
        .filter((n) => Math.abs(n - world.focus.x) > 10 && Math.abs(n - world.focus.x) < 70)
        .slice(0, 1)
        .map((line) => (
          <group key={`gatex${line}`} position={[line, 0, world.focus.z]}>
            <mesh position={[0, 5.15, 0]}>
              <boxGeometry args={[12.8, 0.26, 0.32]} />
              <meshStandardMaterial color="#1a2030" metalness={0.78} roughness={0.28} />
            </mesh>
            <mesh position={[0, 5.16, 0.18]}>
              <boxGeometry args={[7.2, 0.08, 0.04]} />
              <meshStandardMaterial color="#ff3355" emissive="#ff2244" emissiveIntensity={5} toneMapped={false} />
            </mesh>
            {[-6.35, 6.35].map((px) => (
              <mesh key={px} position={[px, 2.55, 0]}>
                <boxGeometry args={[0.24, 5.1, 0.24]} />
                <meshStandardMaterial color="#9aa3b2" metalness={0.8} roughness={0.28} />
              </mesh>
            ))}
          </group>
        ))}
      {world.linesZ
        .filter((n) => Math.abs(n - world.focus.z) > 10 && Math.abs(n - world.focus.z) < 70)
        .slice(0, 1)
        .map((line) => (
          <group key={`gatez${line}`} position={[world.focus.x, 0, line]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 5.15, 0]}>
              <boxGeometry args={[12.8, 0.26, 0.32]} />
              <meshStandardMaterial color="#1a2030" metalness={0.78} roughness={0.28} />
            </mesh>
            <mesh position={[0, 5.16, 0.18]}>
              <boxGeometry args={[7.2, 0.08, 0.04]} />
              <meshStandardMaterial color="#ff3355" emissive="#ff2244" emissiveIntensity={5} toneMapped={false} />
            </mesh>
            {[-6.35, 6.35].map((px) => (
              <mesh key={px} position={[px, 2.55, 0]}>
                <boxGeometry args={[0.24, 5.1, 0.24]} />
                <meshStandardMaterial color="#9aa3b2" metalness={0.8} roughness={0.28} />
              </mesh>
            ))}
          </group>
        ))}
    </>
  );
}
