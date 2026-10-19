import type { Car, Pickup, TrafficCar } from "./types.ts";

export type Phase = "menu" | "play" | "pause";
export type ToastCode = "" | "star" | "ring" | "roof" | "speed" | "air" | "stars";

export type Goals = {
  stars: boolean;
  roof: boolean;
  speed: boolean;
  air: boolean;
};

export type Session = {
  phase: Phase;
  car: Car;
  pickups: Pickup[];
  traffic: TrafficCar[];
  score: number;
  combo: number;
  comboLeft: number;
  stars: number;
  best: number;
  landPulse: number;
  trauma: number;
  toast: ToastCode;
  toastT: number;
  goals: Goals;
};

export type Snap = {
  kmh: number;
  flight: number;
  alt: number;
  score: number;
  combo: number;
  stars: number;
  grounded: boolean;
  thrusting: boolean;
  airtime: number;
  roofs: number;
  goals: Goals;
  toast: ToastCode;
  maxKmh: number;
  phase: Phase;
};
