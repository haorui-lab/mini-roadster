import type { DriveInput } from "./types.ts";

const BLOCK = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const keys = new Set<string>();
let injected: Set<string> | null = null;
let steerLock: number | null = null;

export const touchState = {
  throttle: 0,
  steer: 0,
  fly: false,
  drift: false,
  rollLeft: false,
  rollRight: false,
};

export function bindInput() {
  const down = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (BLOCK.has(e.code)) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const blur = () => keys.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  document.addEventListener("visibilitychange", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", blur);
    keys.clear();
  };
}

export function setInjectedKeys(codes: string[]) {
  injected = new Set(codes);
}

export function clearInjectedKeys() {
  injected = null;
}

export function setSteerLock(v: number | null) {
  steerLock = v;
}

function held() {
  return injected ?? keys;
}

export function readInput(): DriveInput {
  const h = held();
  let steer = 0;
  let throttle = 0;
  if (h.has("KeyA") || h.has("ArrowLeft")) steer += 1;
  if (h.has("KeyD") || h.has("ArrowRight")) steer -= 1;
  if (h.has("KeyW") || h.has("ArrowUp")) throttle += 1;
  if (h.has("KeyS") || h.has("ArrowDown")) throttle -= 1;
  if (injected == null) {
    steer += touchState.steer;
    throttle += touchState.throttle;
  }
  if (steerLock != null) steer = steerLock;
  const fly = h.has("Space") || (injected == null && touchState.fly);
  const drift =
    h.has("ShiftLeft") || h.has("ShiftRight") || (injected == null && touchState.drift);
  const rollLeft = h.has("KeyQ") || (injected == null && touchState.rollLeft);
  const rollRight = h.has("KeyE") || (injected == null && touchState.rollRight);
  return {
    steer: Math.max(-1, Math.min(1, steer)),
    throttle: Math.max(-1, Math.min(1, throttle)),
    fly,
    drift,
    rollLeft,
    rollRight,
  };
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getY: () => number;
  getFlight: () => number;
  getRoll: () => number;
  setKeys: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
