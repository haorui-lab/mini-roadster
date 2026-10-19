export type Building = {
  id: number;
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
  landable: boolean;
  facade: number;
};

export type Pickup = {
  id: number;
  x: number;
  y: number;
  z: number;
  kind: "star" | "ring";
  taken: boolean;
};

export type Tree = { x: number; z: number; s: number };

export type Lamp = { x: number; z: number };

export type Pad = { x: number; z: number; hw: number; hd: number };

export type WindowLite = {
  x: number;
  y: number;
  z: number;
  axis: "x" | "z";
  warm: boolean;
};

export type TrafficCar = {
  x: number;
  z: number;
  yaw: number;
  edge: number;
  u: number;
  speed: number;
  cruise: number;
  color: number;
  axis: "x" | "z";
  dir: 1 | -1;
  lane: number;
  line: number;
};

export type World = {
  buildings: Building[];
  pickups: Pickup[];
  trees: Tree[];
  lamps: Lamp[];
  pads: Pad[];
  windows: WindowLite[];
  traffic: TrafficCar[];
  spawn: { x: number; z: number; yaw: number };
  bounds: number;
  block: number;
  road: number;
  linesX: number[];
  linesZ: number[];
  focus: { x: number; z: number };
};

export type Car = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  vy: number;
  slide: number;
  flight: number;
  grounded: boolean;
  thrusting: boolean;
  jetL: boolean;
  jetR: boolean;
  drifting: boolean;
  driftCharge: number;
  boost: number;
  airtime: number;
  roofLandings: number;
  maxSpeed: number;
  padCooldown: number;
  supportY: number;
  roll: number;
  rollRate: number;
};

export type DriveInput = {
  throttle: number;
  steer: number;
  fly: boolean;
  drift: boolean;
  rollLeft: boolean;
  rollRight: boolean;
};

export type StepResult = {
  car: Car;
  impact: number;
  launched: boolean;
};
