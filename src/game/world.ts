import type {
  Building,
  Pad,
  Pickup,
  TrafficCar,
  Tree,
  WindowLite,
  World,
} from "./types.ts";

export const BLOCK = 32;
export const ROAD = 12;
export const LANE = 1.9;
/** Roads only on every Nth block, so avenues run long between crossings. */
export const ROAD_EVERY = 4;
export const TRAFFIC_LATERAL = BLOCK * ROAD_EVERY * 2 + 24;
/** Blocks of city kept around the car when a slice is requested. The playable map is CITY_R. */
export const STREAM_R = 4;
/** Fixed city half-size in blocks. About five times the previous city across. */
export const CITY_R = 45;
export const FACADES = ["#f3d2c4", "#f6f1e7", "#c9d6ea", "#f7b7c4", "#d7ecee"] as const;

const ROAD_K = [-2, -1, 0, 1, 2] as const;
/** Half the old pack: 3 cars on one lane, 2 on the other, about 44 m apart. */
const SPARSE: Array<{ alongIndex: number; laneSide: 1 | -1 }> = [
  { alongIndex: 0, laneSide: -1 },
  { alongIndex: 2, laneSide: -1 },
  { alongIndex: 4, laneSide: -1 },
  { alongIndex: 1, laneSide: 1 },
  { alongIndex: 3, laneSide: 1 },
];
export const TRAFFIC_TOTAL = SPARSE.length * ROAD_K.length * 2;

let worldSeed = 20261016;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellSeed(i: number, j: number) {
  let h = worldSeed ^ Math.imul(i | 0, 0x9e3779b1) ^ Math.imul(j | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

function nearestOn(v: number, lines: number[]) {
  let d = Infinity;
  for (const line of lines) d = Math.min(d, Math.abs(v - line));
  return d;
}

function pickupId(i: number, j: number, slot: number) {
  const ii = i + 500_000;
  const jj = j + 500_000;
  return ii * 40_000_000 + jj * 32 + slot;
}

function pushWindows(
  b: Building,
  out: WindowLite[],
  rand: () => number,
  linesX: number[],
  linesZ: number[],
  maxAdd: number,
) {
  if (maxAdd <= 0 || out.length > 3200) return;
  let added = 0;
  const faces = [
    { x: b.x, z: b.z + b.hd + 0.06, axis: "x" as const, span: b.hw, d: nearestOn(b.z + b.hd, linesZ) },
    { x: b.x, z: b.z - b.hd - 0.06, axis: "x" as const, span: b.hw, d: nearestOn(b.z - b.hd, linesZ) },
    { x: b.x + b.hw + 0.06, z: b.z, axis: "z" as const, span: b.hd, d: nearestOn(b.x + b.hw, linesX) },
    { x: b.x - b.hw - 0.06, z: b.z, axis: "z" as const, span: b.hd, d: nearestOn(b.x - b.hw, linesX) },
  ].sort((a, c) => a.d - c.d);
  const rows = Math.max(2, Math.min(b.h > 16 ? 8 : 5, Math.round(b.h / 3.4)));
  for (const face of faces.slice(0, 2)) {
    const cols = face.span > 4.2 ? 4 : 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.22) continue;
        const y = 1.5 + r * 2.15;
        if (y > b.h - 0.7) continue;
        const offset = (c - (cols - 1) / 2) * face.span * 0.5;
        out.push({
          x: face.axis === "x" ? b.x + offset : face.x,
          y,
          z: face.axis === "z" ? b.z + offset : face.z,
          axis: face.axis,
          warm: rand() > 0.42,
        });
        added += 1;
        if (added >= maxAdd) return;
      }
    }
  }
}

/** Even avenues run + , odd avenues run −. Both lanes of a street share that direction. */
export function roadDir(line: number): 1 | -1 {
  const idx = Math.round(line / (BLOCK * ROAD_EVERY));
  return ((idx % 2) + 2) % 2 === 0 ? 1 : -1;
}

function decodeSlot(i: number) {
  const n = Math.abs(i) % TRAFFIC_TOTAL;
  const sparse = SPARSE[n % SPARSE.length]!;
  const roadSlot = ROAD_K[Math.floor(n / SPARSE.length) % ROAD_K.length]!;
  const axis: "x" | "z" = Math.floor(n / (SPARSE.length * ROAD_K.length)) % 2 === 0 ? "z" : "x";
  return { alongIndex: sparse.alongIndex, laneSide: sparse.laneSide, roadSlot, axis };
}

export function placeTraffic(i: number, ax: number, az: number): TrafficCar {
  const spec = decodeSlot(i);
  const gap = BLOCK * ROAD_EVERY;
  const origin = spec.axis === "z" ? Math.round(ax / gap) * gap : Math.round(az / gap) * gap;
  const line = origin + spec.roadSlot * gap;
  const dir = roadDir(line);
  const lane = spec.laneSide * LANE;
  // Stay ahead of the anchor and already moving away, so spawn isn't rammed.
  const along = 46 + spec.alongIndex * 14;
  const movingX = spec.axis === "x";
  const fx = movingX ? dir : 0;
  const fz = movingX ? 0 : dir;
  const cruise = 9.2 + (spec.alongIndex % 3) * 1.45 + (spec.laneSide > 0 ? 0.35 : 0);
  return {
    x: movingX ? ax + dir * along : line + lane,
    z: movingX ? line + lane : az + dir * along,
    yaw: Math.atan2(-fx, -fz),
    edge: 0,
    u: 0,
    speed: cruise,
    cruise,
    color: Math.abs(i) % 6,
    axis: spec.axis,
    dir,
    lane,
    line,
  };
}

function fillBlock(
  i: number,
  j: number,
  linesX: number[],
  linesZ: number[],
  buildings: Building[],
  trees: Tree[],
  pickups: Pickup[],
  windows: WindowLite[],
  maxWindows: number,
) {
  const rand = mulberry32(cellSeed(i, j));
  const gutter = (onRoad: boolean) => (onRoad ? ROAD / 2 + 0.7 : 0.45);
  const x0 = i * BLOCK + gutter(linesX.includes(i * BLOCK));
  const x1 = (i + 1) * BLOCK - gutter(linesX.includes((i + 1) * BLOCK));
  const z0 = j * BLOCK + gutter(linesZ.includes(j * BLOCK));
  const z1 = (j + 1) * BLOCK - gutter(linesZ.includes((j + 1) * BLOCK));
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const nearOrigin = Math.abs(i) + Math.abs(j) <= 2;
  const park = (i + j * 3) % 7 === 0 && !(i === 0 && j === 0) && !(i === -1 && j === 0);
  if (park) {
    for (let t = 0; t < 3; t++) {
      trees.push({
        x: x0 + 1.2 + rand() * (x1 - x0 - 2.4),
        z: z0 + 1.2 + rand() * (z1 - z0 - 2.4),
        s: 0.75 + rand() * 0.7,
      });
    }
    pickups.push({
      id: pickupId(i, j, 0),
      x: cx,
      y: 1.15,
      z: cz,
      kind: "star",
      taken: false,
    });
    return;
  }

  const spanX = x1 - x0;
  const spanZ = z1 - z0;
  const forcedLow = (i === 0 && j === -1) || (i === -1 && j === -1) || (i === 1 && j === 0);
  const slots = [
    { ox: 0.24, oz: 0.26, fx: 0.42, fz: 0.48 },
    { ox: 0.76, oz: 0.74, fx: 0.4, fz: 0.46 },
    { ox: 0.5, oz: 0.5, fx: 0.28, fz: 0.28 },
  ];
  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s]!;
    if (!forcedLow && s === 2 && rand() < 0.4) continue;
    const hw = spanX * slot.fx * 0.5;
    const hd = spanZ * slot.fz * 0.5;
    const x = x0 + spanX * slot.ox;
    const z = z0 + spanZ * slot.oz;
    const street = s < 2;
    const landable = forcedLow || (street && rand() < 0.4);
    let h: number;
    if (forcedLow) h = 4.6 + s * 1.05;
    else if (landable) h = 3.6 + rand() * 4.2;
    else if (s === 2) h = 22 + rand() * 20;
    else h = 11 + rand() * 12;
    const b: Building = {
      id: pickupId(i, j, s + 1),
      x,
      z,
      hw,
      hd,
      h: landable ? Math.min(h, 8.2) : h,
      landable,
      facade: Math.floor(rand() * FACADES.length),
    };
    buildings.push(b);
    if (maxWindows > 0) pushWindows(b, windows, rand, linesX, linesZ, maxWindows);
    if (b.landable && rand() > 0.38) {
      pickups.push({
        id: pickupId(i, j, 10 + s),
        x: b.x,
        y: b.h + 1.35,
        z: b.z,
        kind: "star",
        taken: false,
      });
    }
  }

  if (((i * 5 + j * 3) ^ worldSeed) % 11 === 0 || nearOrigin) {
    pickups.push({
      id: pickupId(i, j, 2),
      x: i * BLOCK + 10,
      y: 1.15,
      z: j * BLOCK + 14,
      kind: "star",
      taken: false,
    });
  }
}

export function createWorld(seed = 20261016): World {
  worldSeed = seed;
  return cityAround(0, 0, CITY_R);
}

function roadLines(fromBlock: number, toBlock: number) {
  const lines: number[] = [];
  const start = Math.ceil(fromBlock / ROAD_EVERY) * ROAD_EVERY;
  const end = Math.floor(toBlock / ROAD_EVERY) * ROAD_EVERY;
  for (let n = start; n <= end; n += ROAD_EVERY) lines.push(n * BLOCK);
  return lines;
}

export function cityAround(x: number, z: number, radius = STREAM_R): World {
  const ix = Math.round(x / BLOCK);
  const iz = Math.round(z / BLOCK);
  const linesX = roadLines(ix - radius, ix + radius);
  const linesZ = roadLines(iz - radius, iz + radius);

  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const windows: WindowLite[] = [];
  const pickups: Pickup[] = [];
  const cells: { i: number; j: number; d: number }[] = [];
  for (let i = ix - radius; i < ix + radius; i++) {
    for (let j = iz - radius; j < iz + radius; j++) {
      const cx = (i + 0.5) * BLOCK;
      const cz = (j + 0.5) * BLOCK;
      cells.push({ i, j, d: Math.hypot(cx - x, cz - z) });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  for (const cell of cells) {
    const near = cell.d < 150;
    const lit = near || ((cell.i + cell.j) & 1) === 0;
    fillBlock(cell.i, cell.j, linesX, linesZ, buildings, trees, pickups, windows, lit ? (near ? 16 : 6) : 0);
  }

  for (let i = ix - radius; i <= ix + radius; i++) {
    for (let j = iz - radius; j <= iz + radius; j++) {
      const forced = (i === 0 && (j === -1 || j === -2)) || (j === 0 && (i === 1 || i === 2));
      const roll = Math.abs((i * 13 + j * 7) % 29) === 0;
      if (!forced && !roll) continue;
      if (Math.hypot(i * BLOCK - x, j * BLOCK - z) > radius * BLOCK) continue;
      pickups.push({
        id: pickupId(i, j, 3),
        x: i * BLOCK + 9,
        y: 6.4 + (Math.abs(i + j) % 3) * 0.85,
        z: j * BLOCK + 16,
        kind: "ring",
        taken: false,
      });
    }
  }

  const pads: Pad[] = [];
  for (let i = ix - radius; i <= ix + radius; i++) {
    for (let j = iz - radius; j <= iz + radius; j++) {
      const landmark = (i === 0 && j === -1) || (i === 2 && j === 0);
      if (!landmark && Math.abs((i * 3 + j * 5) % 17) !== 0) continue;
      pads.push({
        x: i * BLOCK + 16,
        z: j * BLOCK + 16,
        hw: 2.4,
        hd: 2.4,
      });
    }
  }

  const traffic: TrafficCar[] = [];
  for (let i = 0; i < TRAFFIC_TOTAL; i++) traffic.push(placeTraffic(i, x, z));

  return {
    buildings,
    pickups,
    trees,
    lamps: [],
    pads,
    windows,
    traffic,
    spawn: { x: 0, z: 0, yaw: 0 },
    bounds: radius * BLOCK,
    block: BLOCK,
    road: ROAD,
    linesX,
    linesZ,
    focus: { x, z },
  };
}

export function clonePickups(list: Pickup[]): Pickup[] {
  return list.map((p) => ({ ...p, taken: false }));
}

export function cloneTraffic(list: TrafficCar[]): TrafficCar[] {
  return list.map((t) => ({ ...t }));
}
