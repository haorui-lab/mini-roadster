import type { Building, Car, DriveInput, Pad, Pickup, StepResult, TrafficCar } from "./types.ts";
import { placeTraffic, TRAFFIC_LATERAL } from "./world.ts";

export const HALF_H = 0.55;
export const CAR_R = 1.05;
const GRAVITY = 20;
const LIFT = 29;
const MAX_VY = 6.5;
const FLIGHT_DRAIN = 0.5;
const FLIGHT_REGEN = 0.24;
const ACCEL = 34;
const BRAKE = 42;
const DRAG = 0.9;
const AIR_DRAG = 0.28;
const MAX_SPEED = 42;
const REVERSE_MAX = 12;
const TURN = 2.25;
const ROLL_TORQUE = 3.1;
const SIDE_DRAIN = 0.16;
const MAX_ROLL_RATE = 1.35;

function wrapPi(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function stepRoll(c: Car, input: DriveInput, dt: number) {
  const left = Boolean(input.rollLeft) && c.flight > 0.02;
  const right = Boolean(input.rollRight) && c.flight > 0.02;
  c.jetL = left;
  c.jetR = right;
  const wrapped = wrapPi(c.roll);
  if (left && right) {
    c.rollRate += (-16 * wrapped - 7 * c.rollRate) * dt;
    c.flight = Math.max(0, c.flight - 0.22 * dt);
  } else if (left || right) {
    const torque = c.grounded ? ROLL_TORQUE * 0.45 : ROLL_TORQUE;
    c.rollRate += (left ? torque : -torque) * dt;
    c.rollRate *= Math.exp(-2.15 * dt);
    c.rollRate = Math.max(-MAX_ROLL_RATE, Math.min(MAX_ROLL_RATE, c.rollRate));
    c.flight = Math.max(0, c.flight - SIDE_DRAIN * dt);
  } else if (c.grounded) {
    c.rollRate += (-22 * wrapped - 8 * c.rollRate) * dt;
  } else {
    c.rollRate *= Math.exp(-0.22 * dt);
  }
  c.roll += c.rollRate * dt;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function createCar(spawn: { x: number; z: number; yaw: number }): Car {
  return {
    x: spawn.x,
    z: spawn.z,
    y: HALF_H,
    yaw: spawn.yaw,
    speed: 0,
    vy: 0,
    slide: 0,
    flight: 1,
    grounded: true,
    thrusting: false,
    jetL: false,
    jetR: false,
    drifting: false,
    driftCharge: 0,
    boost: 0,
    airtime: 0,
    roofLandings: 0,
    maxSpeed: 0,
    padCooldown: 0,
    supportY: 0,
    roll: 0,
    rollRate: 0,
  };
}

function surfaceBelow(x: number, z: number, buildings: Building[]) {
  let s = 0;
  for (const b of buildings) {
    if (Math.abs(x - b.x) <= b.hw && Math.abs(z - b.z) <= b.hd) s = Math.max(s, b.h);
  }
  return s;
}

function pushOut(c: Car, buildings: Building[]) {
  const bottom = c.y - HALF_H;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of buildings) {
      const dx = c.x - b.x;
      const dz = c.z - b.z;
      const ox = b.hw + CAR_R - Math.abs(dx);
      const oz = b.hd + CAR_R - Math.abs(dz);
      if (ox <= 0 || oz <= 0) continue;
      if (bottom >= b.h - 0.08) continue;
      if (b.landable && bottom >= b.h - 1.35 && c.vy <= 2) continue;
      if (ox < oz) c.x += Math.sign(dx || 1) * (ox + 0.01);
      else c.z += Math.sign(dz || 1) * (oz + 0.01);
      c.speed *= 0.94;
    }
  }
}

function resolveVertical(c: Car, buildings: Building[]) {
  let impact = 0;
  const bottom = c.y - HALF_H;

  for (const b of buildings) {
    if (b.landable) continue;
    const inside = Math.abs(c.x - b.x) <= b.hw - 0.05 && Math.abs(c.z - b.z) <= b.hd - 0.05;
    if (!inside || c.vy > 0.4) continue;
    if (bottom < b.h + 0.25 && bottom > b.h - 2.4) {
      const dx = c.x - b.x;
      const dz = c.z - b.z;
      const px = b.hw - Math.abs(dx);
      const pz = b.hd - Math.abs(dz);
      if (px < pz) c.x += Math.sign(dx || 1) * (px + CAR_R + 0.15);
      else c.z += Math.sign(dz || 1) * (pz + CAR_R + 0.15);
      c.vy = Math.min(c.vy, -2);
      c.grounded = false;
      impact = Math.max(impact, 5);
    }
  }

  let support = 0;
  let roof = false;
  const bottom2 = c.y - HALF_H;
  for (const b of buildings) {
    if (!b.landable || b.h > 9.2) continue;
    const inside = Math.abs(c.x - b.x) <= b.hw - 0.15 && Math.abs(c.z - b.z) <= b.hd - 0.15;
    if (!inside) continue;
    if (bottom2 <= b.h + 0.55 && bottom2 >= b.h - 2.4 && c.vy <= 2.2 && b.h >= support) {
      support = b.h;
      roof = true;
    }
  }

  const bottom3 = c.y - HALF_H;
  if (!c.thrusting && bottom3 <= support + 0.18 && c.vy <= 2.2) {
    const wasAir = !c.grounded;
    impact = Math.max(impact, wasAir ? Math.max(0, -c.vy) : 0);
    const fromRoof = wasAir && roof && support > 1;
    c.y = support + HALF_H;
    c.vy = 0;
    c.grounded = true;
    if (fromRoof) c.roofLandings += 1;
  } else if (c.thrusting) {
    c.grounded = false;
  } else {
    c.grounded = false;
  }
  return impact;
}

function launchPads(c: Car, pads: Pad[]) {
  if (c.padCooldown > 0 || !c.grounded || Math.abs(c.speed) < 14) return false;
  for (const p of pads) {
    if (Math.abs(c.x - p.x) <= p.hw && Math.abs(c.z - p.z) <= p.hd) {
      c.vy = clamp(Math.abs(c.speed) * 0.42, 8, 13);
      c.y += 0.25;
      c.grounded = false;
      c.padCooldown = 0.85;
      return true;
    }
  }
  return false;
}

export function stepCar(
  prev: Car,
  input: DriveInput,
  dt: number,
  buildings: Building[],
  pads: Pad[],
  bounds: number,
): StepResult {
  const c: Car = { ...prev };
  const steer = clamp(input.steer, -1, 1);
  const throttle = clamp(input.throttle, -1, 1);
  const sp = Math.abs(c.speed);
  if (sp > 1.05) {
    const speedFactor = clamp(sp / 8, 0.4, 1);
    const reverse = c.speed >= 0 ? 1 : -1;
    c.yaw += steer * TURN * speedFactor * reverse * dt;
  }

  const drive = throttle > 0 ? throttle * ACCEL : throttle * BRAKE;
  const drag = c.grounded ? DRAG : AIR_DRAG;
  let extra = 0;
  if (c.boost > 0) {
    extra = 18;
    c.boost -= dt;
  }
  c.speed += (drive + extra - c.speed * drag) * dt;
  c.speed = clamp(c.speed, -REVERSE_MAX, MAX_SPEED);

  c.drifting = Boolean(input.drift && c.grounded && sp > 8 && Math.abs(steer) > 0.2);
  const targetSlide = -steer * c.speed * (c.drifting ? 0.62 : 0.14);
  const grip = c.drifting ? 2.1 : c.grounded ? 7.5 : 1.3;
  c.slide += (targetSlide - c.slide) * (1 - Math.exp(-grip * dt));
  if (c.drifting) c.driftCharge += dt;
  else if (c.driftCharge > 0.38) {
    c.boost = Math.min(1.5, 0.35 + c.driftCharge * 0.7);
    c.speed += 6;
    c.driftCharge = 0;
  } else c.driftCharge = 0;

  stepRoll(c, input, dt);
  c.thrusting = Boolean(input.fly && c.flight > 0.03);
  if (c.thrusting) {
    c.vy += LIFT * dt;
    c.flight = Math.max(0, c.flight - FLIGHT_DRAIN * dt);
    c.grounded = false;
    c.speed += 8 * dt;
  }
  if (!c.grounded) {
    const sideHold = (c.jetL || c.jetR) && !c.thrusting;
    if (sideHold) {
      c.vy += (0.35 - c.vy) * Math.min(1, dt * 4);
    } else {
      const hang = c.thrusting ? 1 : c.vy > 0 ? 0.72 : 1;
      c.vy -= GRAVITY * hang * dt;
    }
    c.airtime += dt;
  } else {
    c.flight = Math.min(1, c.flight + FLIGHT_REGEN * dt);
    c.vy = 0;
  }
  c.vy = clamp(c.vy, -28, MAX_VY);
  if (c.padCooldown > 0) c.padCooldown -= dt;

  const fx = -Math.sin(c.yaw);
  const fz = -Math.cos(c.yaw);
  const rx = Math.cos(c.yaw);
  const rz = -Math.sin(c.yaw);
  c.x += (fx * c.speed + rx * c.slide) * dt;
  c.z += (fz * c.speed + rz * c.slide) * dt;
  if (bounds > 0) {
    const edge = bounds - 6;
    c.x = clamp(c.x, -edge, edge);
    c.z = clamp(c.z, -edge, edge);
  }
  c.y += c.vy * dt;

  pushOut(c, buildings);
  const launched = launchPads(c, pads);
  const impact = resolveVertical(c, buildings);
  c.supportY = surfaceBelow(c.x, c.z, buildings);
  c.maxSpeed = Math.max(c.maxSpeed, Math.abs(c.speed));
  return { car: c, impact, launched };
}

export function collectPickups(car: Car, pickups: Pickup[]) {
  let gained = 0;
  let stars = 0;
  let rings = 0;
  for (const p of pickups) {
    if (p.taken) continue;
    const dx = car.x - p.x;
    const dy = car.y - p.y;
    const dz = car.z - p.z;
    const reach = p.kind === "ring" ? 2.55 : 1.65;
    if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
    p.taken = true;
    if (p.kind === "ring") {
      rings += 1;
      gained += 250;
      car.flight = Math.min(1, car.flight + 0.2);
    } else {
      stars += 1;
      gained += 100;
    }
  }
  return { gained, stars, rings };
}

export function stepTraffic(cars: TrafficCar[], dt: number, anchor?: { x: number; z: number }) {
  const ax = anchor?.x ?? 0;
  const az = anchor?.z ?? 0;
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i]!;
    const alongX = c.axis === "x";
    let cap = c.cruise;
    let push = 0;
    for (let j = 0; j < cars.length; j++) {
      if (i === j) continue;
      const o = cars[j]!;
      if (o.axis !== c.axis || o.line !== c.line || o.dir !== c.dir || o.lane !== c.lane) continue;
      const gap = alongX ? (o.x - c.x) * c.dir : (o.z - c.z) * c.dir;
      if (gap > 0.2 && gap < 13) cap = Math.min(cap, Math.max(6.5, o.speed * 0.92));
      if (gap > 0 && gap < 5.6) push = Math.max(push, 5.6 - gap);
    }
    c.speed += (cap - c.speed) * Math.min(1, dt * 3);
    const fx = alongX ? c.dir : 0;
    const fz = alongX ? 0 : c.dir;
    c.x += fx * (c.speed * dt - push * 0.45);
    c.z += fz * (c.speed * dt - push * 0.45);
    if (alongX) c.z = c.line + c.lane;
    else c.x = c.line + c.lane;
    c.yaw = Math.atan2(-fx, -fz);
    if (!anchor) continue;
    const ahead = (c.x - ax) * fx + (c.z - az) * fz;
    const lateral = alongX ? Math.abs(c.line - az) : Math.abs(c.line - ax);
    if (ahead < -46 || ahead > 118 || lateral > TRAFFIC_LATERAL) {
      const next = placeTraffic(i, ax, az);
      c.x = next.x;
      c.z = next.z;
      c.yaw = next.yaw;
      c.axis = next.axis;
      c.dir = next.dir;
      c.lane = next.lane;
      c.line = next.line;
      c.speed = next.speed;
      c.cruise = next.cruise;
      c.color = next.color;
    }
  }
}

export function bumpTraffic(car: Car, cars: TrafficCar[]) {
  let impact = 0;
  for (const n of cars) {
    const dx = car.x - n.x;
    const dz = car.z - n.z;
    const d2 = dx * dx + dz * dz;
    const min = 2.15;
    if (d2 >= min * min || d2 < 1e-6) continue;
    const d = Math.sqrt(d2);
    const push = min - d;
    car.x += (dx / d) * push;
    car.z += (dz / d) * push;
    car.speed *= 0.72;
    impact = Math.max(impact, 7);
  }
  return impact;
}

export function kmh(speed: number) {
  return Math.abs(speed) * 5;
}
