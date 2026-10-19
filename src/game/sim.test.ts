import assert from "node:assert/strict";
import test from "node:test";
import { HALF_H, collectPickups, createCar, kmh, stepCar, stepTraffic } from "./sim.ts";
import { cityAround, createWorld, placeTraffic, ROAD_EVERY, BLOCK, TRAFFIC_TOTAL } from "./world.ts";
import { matchLang } from "./i18n.ts";
import type { DriveInput } from "./types.ts";

const idle: DriveInput = { throttle: 0, steer: 0, fly: false, drift: false, rollLeft: false, rollRight: false };

function run(car: ReturnType<typeof createCar>, input: DriveInput, seconds: number, world = createWorld()) {
  let c = car;
  const steps = Math.round(seconds / (1 / 60));
  let impact = 0;
  for (let i = 0; i < steps; i++) {
    const step = stepCar(c, input, 1 / 60, world.buildings, world.pads, world.bounds);
    c = step.car;
    impact = Math.max(impact, step.impact);
  }
  return { car: c, impact };
}

test("A increases yaw while moving forward, D decreases it", () => {
  const world = createWorld();
  const sped = run(createCar(world.spawn), { ...idle, throttle: 1 }, 0.7, world);
  assert.ok(sped.car.speed > 8, `speed ${sped.car.speed}`);
  const left = run(sped.car, { ...idle, throttle: 1, steer: 1 }, 0.4, world);
  const dYaw = left.car.yaw - sped.car.yaw;
  assert.ok(dYaw > 0.2, `A yaw delta ${dYaw}`);
  const right = run(left.car, { ...idle, throttle: 1, steer: -1 }, 0.45, world);
  assert.ok(right.car.yaw < left.car.yaw - 0.15, `D yaw ${right.car.yaw} vs ${left.car.yaw}`);
});

test("thrust climbs and spends flight energy; ground refills it", () => {
  const world = createWorld();
  const up = run(createCar(world.spawn), { ...idle, throttle: 1, fly: true }, 1.1, world);
  assert.ok(up.car.y > HALF_H + 2.5, `y ${up.car.y}`);
  assert.ok(up.car.flight < 0.7, `flight ${up.car.flight}`);
  const landed = {
    ...createCar(world.spawn),
    flight: up.car.flight,
  };
  const regen = run(landed, idle, 2, world);
  assert.ok(regen.car.grounded);
  assert.ok(regen.car.flight > up.car.flight + 0.3, `regen ${regen.car.flight} from ${up.car.flight}`);
});

test("car rests on a low roof and is shoved off a tower", () => {
  const world = createWorld();
  const roof = world.buildings.find((b) => b.landable && b.h < 9);
  const tower = world.buildings.find((b) => !b.landable && b.h > 16);
  assert.ok(roof && tower);
  let above = createCar(world.spawn);
  above = {
    ...above,
    x: roof.x,
    z: roof.z,
    y: roof.h + HALF_H + 4,
    vy: -7,
    flight: 0.2,
    grounded: false,
  };
  const landed = run(above, idle, 3, world);
  assert.ok(landed.car.grounded, "should stick the roof");
  assert.ok(Math.abs(landed.car.y - (roof.h + HALF_H)) < 0.2, `y ${landed.car.y} roof ${roof.h}`);
  assert.ok(landed.car.roofLandings >= 1);

  let high = createCar(world.spawn);
  high = {
    ...high,
    x: tower.x,
    z: tower.z,
    y: tower.h + HALF_H + 3,
    vy: -8,
    flight: 0,
    grounded: false,
  };
  const fell = run(high, idle, 4, world);
  const parked = fell.car.grounded && Math.abs(fell.car.y - (tower.h + HALF_H)) < 0.3;
  assert.equal(parked, false, `parked on tower y=${fell.car.y} h=${tower.h}`);
});

test("stars score once and the avenue spawn stays clear", () => {
  const world = createWorld();
  assert.ok(world.pickups.filter((p) => p.kind === "star").length >= 12);
  const car = createCar({ x: 4, z: 4, yaw: 0 });
  const star = world.pickups.find((p) => p.kind === "star")!;
  star.x = car.x;
  star.y = car.y;
  star.z = car.z;
  star.taken = false;
  const got = collectPickups(car, world.pickups);
  assert.equal(got.stars, 1);
  assert.equal(got.gained, 100);
  assert.equal(collectPickups(car, world.pickups).gained, 0);
  for (const z of [0, -8, -16]) {
    const blocked = world.buildings.some(
      (b) => Math.abs(0 - b.x) <= b.hw + 1 && Math.abs(z - b.z) <= b.hd + 1,
    );
    assert.equal(blocked, false, `spawn road blocked at z=${z}`);
  }
  const roadHalf = world.road * 0.5 - 0.4;
  for (const b of world.buildings) {
    const onX = world.linesX.some((line) => Math.abs(b.x - line) < b.hw + roadHalf);
    const onZ = world.linesZ.some((line) => Math.abs(b.z - line) < b.hd + roadHalf);
    assert.equal(onX || onZ, false, `building in the road at ${b.x.toFixed(1)},${b.z.toFixed(1)}`);
  }
  for (const p of world.pads) {
    const onX = world.linesX.some((line) => Math.abs(p.x - line) < p.hw + roadHalf);
    const onZ = world.linesZ.some((line) => Math.abs(p.z - line) < p.hd + roadHalf);
    assert.equal(onX || onZ, false, `pad in the road at ${p.x},${p.z}`);
  }
  assert.ok(kmh(36) === 180);
});

test("traffic leaves the spawn clear for the opening seconds", () => {
  const cars = Array.from({ length: TRAFFIC_TOTAL }, (_, i) => placeTraffic(i, 0, 0));
  for (const c of cars) {
    assert.ok(Math.hypot(c.x, c.z) > 30, `started at ${c.x.toFixed(1)},${c.z.toFixed(1)}`);
  }
  const still = { x: 0, z: 0 };
  for (let s = 0; s < 150; s++) stepTraffic(cars, 1 / 60, still);
  for (const c of cars) {
    assert.ok(Math.hypot(c.x, c.z) > 20, `closed to ${c.x.toFixed(1)},${c.z.toFixed(1)}`);
  }
});

test("each street is one-way and the city keeps going", () => {
  assert.equal(TRAFFIC_TOTAL, 50);
  const cars = Array.from({ length: TRAFFIC_TOTAL }, (_, i) => placeTraffic(i, 40, -20));
  for (let s = 0; s < 240; s++) stepTraffic(cars, 1 / 60, { x: 40 + s * 0.4, z: -20 });
  const groups = new Map<string, Set<number>>();
  for (const c of cars) {
    const key = `${c.axis}:${c.line}`;
    const dirs = groups.get(key) ?? new Set<number>();
    dirs.add(c.dir);
    groups.set(key, dirs);
    const laneKey = `${c.axis}:${c.line}:${c.lane}`;
    const lane = groups.get(laneKey) ?? new Set<number>();
    lane.add(c.dir);
    groups.set(laneKey, lane);
  }
  for (const [key, dirs] of groups) assert.equal(dirs.size, 1, key);

  const big = createWorld();
  assert.ok(big.bounds >= 1400, `bounds ${big.bounds}`);
  assert.ok(big.linesX.length >= 20, `lines ${big.linesX.length}`);
  assert.equal(big.linesX[1]! - big.linesX[0]!, BLOCK * ROAD_EVERY);
  assert.ok(big.buildings.some((b) => Math.hypot(b.x, b.z) > 200));
  const far = cityAround(480, -320);
  assert.ok(far.buildings.length > 40, `buildings ${far.buildings.length}`);
  assert.ok(far.buildings.some((b) => Math.hypot(b.x - 480, b.z + 320) < 55));
  assert.ok(far.linesX.some((n) => Math.abs(n - 480) <= BLOCK * ROAD_EVERY));
  assert.ok(far.linesZ.some((n) => Math.abs(n + 320) <= BLOCK * ROAD_EVERY));
  assert.ok(far.linesX.every((n, i, arr) => i === 0 || n > arr[i - 1]!));
});

function wrapPi(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

test("left jet rolls positive, right jet rolls negative, both level the car", () => {
  const world = createWorld();
  const airborne = {
    ...createCar(world.spawn),
    y: 8,
    vy: 0,
    grounded: false,
    flight: 1,
  };
  const left = run(airborne, { ...idle, rollLeft: true }, 0.95, world);
  assert.ok(left.car.roll > 0.45, `left roll ${left.car.roll}`);
  assert.ok(left.car.roll < 1.5, `left roll too wild ${left.car.roll}`);
  assert.ok(left.car.jetL);
  assert.ok(left.car.y > 7, `side jet dropped the car y=${left.car.y}`);
  assert.ok(left.car.flight < 0.95, `fuel ${left.car.flight}`);
  const right = run(airborne, { ...idle, rollRight: true }, 0.95, world);
  assert.ok(right.car.roll < -0.45, `right roll ${right.car.roll}`);
  const spun = run(airborne, { ...idle, rollLeft: true }, 0.85, world);
  const level = run(spun.car, { ...idle, rollLeft: true, rollRight: true }, 1.4, world);
  assert.ok(Math.abs(wrapPi(level.car.roll)) < 0.35, `level ${wrapPi(level.car.roll)}`);
  assert.ok(Math.abs(level.car.rollRate) < 0.8, `rate ${level.car.rollRate}`);
});

test("the street pulls a parked car upright", () => {
  const world = createWorld();
  const tilted = { ...createCar(world.spawn), roll: 1.15, rollRate: 0.4 };
  const back = run(tilted, idle, 1.3, world);
  assert.ok(back.car.grounded);
  assert.ok(Math.abs(wrapPi(back.car.roll)) < 0.2, `upright ${wrapPi(back.car.roll)}`);
});

test("language follows the browser until the player picks one", () => {
  assert.equal(matchLang(["zh-CN", "en-US"], null), "zh");
  assert.equal(matchLang(["en-GB"], null), "en");
  assert.equal(matchLang(["ja-JP"], null), "en");
  assert.equal(matchLang(["zh-TW"], "en"), "en");
  assert.equal(matchLang(["en-US"], "zh"), "zh");
  assert.equal(matchLang([], null), "en");
});
