import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { playThud, resumeAudio, setMuted, unlockAudio } from "./audio.ts";
import { bindInput, clearInjectedKeys, touchState } from "./input.ts";
import { copy, loadBest, loadLang, saveBest, saveLang, type Lang } from "./i18n.ts";
import type { Session, Snap, ToastCode } from "./session.ts";
import { createCar, kmh } from "./sim.ts";
import { WorldSim } from "./WorldSim.tsx";
import type { World } from "./types.ts";
import { clonePickups, cloneTraffic, createWorld } from "./world.ts";

const EMPTY: Snap = {
  kmh: 0,
  flight: 1,
  alt: 0,
  score: 0,
  combo: 0,
  stars: 0,
  grounded: true,
  thrusting: false,
  airtime: 0,
  roofs: 0,
  goals: { stars: false, roof: false, speed: false, air: false },
  toast: "",
  maxKmh: 0,
  phase: "menu",
};

function makeSession(world: World): Session {
  return {
    phase: "menu",
    car: createCar(world.spawn),
    pickups: clonePickups(world.pickups),
    traffic: cloneTraffic(world.traffic),
    score: 0,
    combo: 0,
    comboLeft: 0,
    stars: 0,
    best: 0,
    landPulse: 0,
    trauma: 0,
    toast: "",
    toastT: 0,
    goals: { stars: false, roof: false, speed: false, air: false },
  };
}

const Stage = memo(function Stage({
  api,
  world,
  onFrame,
}: {
  api: RefObject<Session>;
  world: World;
  onFrame: RefObject<() => void>;
}) {
  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: [11, 7, 13], fov: 62, near: 0.1, far: 4200 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
    >
      <WorldSim api={api} world={world} onFrame={onFrame} />
    </Canvas>
  );
});

function toastLabel(code: ToastCode, lang: Lang) {
  const t = copy[lang];
  if (code === "star") return `+ ${t.starToast}`;
  if (code === "ring") return `+ ${t.ringToast}`;
  if (code === "roof") return t.roofToast;
  if (code === "speed") return t.gSpeed;
  if (code === "air") return t.gAir;
  if (code === "stars") return t.gStars;
  return "";
}

export function Game() {
  const [world] = useState(() => createWorld());
  const api = useRef<Session>(makeSession(world));
  const onFrame = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Session["phase"]>("menu");
  const [lang, setLang] = useState<Lang>("en");
  const [snap, setSnap] = useState<Snap>(EMPTY);
  const [best, setBest] = useState(0);
  const [tick, setTick] = useState(0);
  const [muted, setMute] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    const taken = new Set<number>();
    for (const p of api.current.pickups) if (p.taken) taken.add(p.id);
    for (const p of world.pickups) if (taken.has(p.id)) p.taken = true;
    api.current.pickups = world.pickups;
    if (api.current.traffic.length !== world.traffic.length) {
      api.current.traffic = cloneTraffic(world.traffic);
    }
  }, [world]);

  useEffect(() => {
    setMounted(true);
    setLang(loadLang());
    const record = loadBest();
    setBest(record);
    api.current.best = Math.max(api.current.best, record);
    return bindInput();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const publish = () => {
    const s = api.current;
    const c = s.car;
    setSnap({
      kmh: Math.round(kmh(c.speed)),
      flight: c.flight,
      alt: Math.max(0, c.y - 0.55),
      score: s.score,
      combo: s.combo,
      stars: s.stars,
      grounded: c.grounded,
      thrusting: c.thrusting,
      airtime: c.airtime,
      roofs: c.roofLandings,
      goals: { ...s.goals },
      toast: s.toastT > 0 ? s.toast : "",
      maxKmh: Math.round(kmh(c.maxSpeed)),
      phase: s.phase,
    });
    setTick((n) => n + 1);
    if (s.best > best) {
      setBest(s.best);
      saveBest(s.best);
    }
  };
  onFrame.current = publish;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && api.current.phase !== "menu") {
        const next = api.current.phase === "play" ? "pause" : "play";
        api.current.phase = next;
        setPhase(next);
        publish();
      }
      if (e.code === "KeyR" && api.current.phase === "play") recover();
      if (e.code === "KeyM") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  function setRunPhase(next: Session["phase"]) {
    api.current.phase = next;
    setPhase(next);
  }

  function start() {
    unlockAudio();
    clearInjectedKeys();
    setRunPhase("play");
    publish();
  }

  function recover() {
    const keep = api.current.car;
    api.current.car = {
      ...createCar(world.spawn),
      flight: keep.flight,
      airtime: keep.airtime,
      roofLandings: keep.roofLandings,
      maxSpeed: keep.maxSpeed,
    };
    playThud();
  }

  function restart() {
    unlockAudio();
    const record = api.current.best;
    api.current.car = createCar(world.spawn);
    api.current.pickups = clonePickups(world.pickups);
    api.current.traffic = cloneTraffic(world.traffic);
    api.current.score = 0;
    api.current.combo = 0;
    api.current.comboLeft = 0;
    api.current.stars = 0;
    api.current.toast = "";
    api.current.toastT = 0;
    api.current.goals = { stars: false, roof: false, speed: false, air: false };
    api.current.best = record;
    setRunPhase("play");
    setSnap({ ...EMPTY, phase: "play" });
  }

  function toggleMute() {
    const next = !muted;
    setMute(next);
    setMuted(next);
  }

  useEffect(() => {
    if (phase !== "play") {
      touchState.fly = false;
      touchState.drift = false;
      touchState.rollLeft = false;
      touchState.rollRight = false;
      touchState.steer = 0;
      touchState.throttle = 0;
    }
  }, [phase]);

  const rush = phase === "play" ? Math.min(0.55, snap.kmh / 420) : 0;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg select-none">
      <div className="absolute inset-0">{mounted && <Stage api={api} world={world} onFrame={onFrame} />}</div>
      <div className="rush pointer-events-none absolute inset-0" style={{ ["--rush" as string]: String(rush) }} />

      {phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-end p-3 md:items-center md:p-10">
          <section className="max-h-[92dvh] w-full max-w-md overflow-auto rounded-2xl border border-line border-l-4 border-l-primary bg-surface p-5 md:p-7">
            <p className="font-display text-sm tracking-wide text-accent">{t.kicker}</p>
            <h1 className="mt-2 font-display text-5xl leading-none md:text-6xl">Mini</h1>
            <p className="font-display text-4xl leading-none text-primary md:text-5xl">Roadster</p>
            <p className="mt-3 text-sm text-muted">{t.sub}</p>
            <p className="mt-3 text-base leading-relaxed">{t.blurb}</p>
            <div className="mt-4 space-y-1.5 text-sm text-muted">
              <p className="font-display text-fg">{t.how}</p>
              <p>{t.drive}</p>
              <p>{t.fly}</p>
              <p>{t.roll}</p>
              <p>{t.oneway}</p>
              <p>{t.drift}</p>
              <p>{t.reset}</p>
              <p>{t.pads}</p>
              <p>{t.jump}</p>
            </div>
            <button type="button" className="mt-5 h-14 w-full rounded-2xl bg-primary font-display text-xl text-fg" onClick={start}>
              {t.go}
            </button>
            <LangSwitch lang={lang} setLang={setLang} />
            <p className="mt-4 text-xs leading-relaxed text-muted">{t.disclaimer}</p>
          </section>
        </div>
      )}

      {phase !== "menu" && (
        <div className="pointer-events-none absolute inset-0 z-20 p-3 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex max-w-[70%] flex-wrap gap-1.5">
              <Chip done={snap.goals.stars} text={`${t.gStars} ${snap.stars}/10`} />
              <Chip done={snap.goals.roof} text={t.gRoof} />
              <Chip done={snap.goals.speed} text={`${snap.maxKmh}`} />
              <Chip done={snap.goals.air} text={`${snap.airtime.toFixed(1)}s`} />
            </div>
            <div className="pointer-events-auto flex gap-2">
              <button type="button" className={iconBtn} onClick={toggleMute} aria-label={muted ? t.soundOff : t.soundOn}>
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <button
                type="button"
                className={iconBtn}
                aria-label={phase === "pause" ? t.resume : t.pause}
                onClick={() => {
                  const next = phase === "play" ? "pause" : "play";
                  if (next === "play") unlockAudio();
                  setRunPhase(next);
                }}
              >
                {phase === "pause" ? <Play className="size-5" /> : <Pause className="size-5" />}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-3 w-full max-w-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>{t.flight}</span>
              {!snap.grounded && (
                <span>
                  {t.alt} {snap.alt.toFixed(0)}m
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className={snap.flight < 0.22 ? "h-full bg-primary" : "h-full bg-accent"}
                style={{ width: `${Math.round(snap.flight * 100)}%` }}
              />
            </div>
            {snap.toast && <p className="pop mt-2 text-center font-display text-lg text-accent">{toastLabel(snap.toast, lang)}</p>}
            {snap.combo >= 2 && (
              <p className="text-center font-display text-sm text-primary">
                {t.combo} ×{snap.combo}
              </p>
            )}
          </div>

          <div className="mt-4 text-center md:absolute md:right-5 md:bottom-6 md:mt-0 md:text-right">
            <p className="font-display text-5xl leading-none md:text-6xl">{snap.kmh}</p>
            <p className="text-xs text-muted">{t.speed}</p>
            <p className="mt-1 font-display text-lg">
              {snap.score}
              <span className="ml-2 text-xs text-muted">
                {t.best} {Math.max(best, snap.score)}
              </span>
            </p>
          </div>

          <MiniMap world={world} api={api} tick={tick} />
        </div>
      )}

      {phase === "pause" && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-bg/70 p-4">
          <section className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-3xl">{t.pause}</h2>
            <p className="mt-2 text-sm text-muted">
              {t.score} {snap.score} · {t.best} {Math.max(best, snap.score)}
            </p>
            <p className="mt-2 text-sm text-muted">{t.roll}</p>
            <div className="mt-5 grid gap-2">
              <button type="button" className="h-12 rounded-2xl bg-primary font-display text-lg text-fg" onClick={() => { unlockAudio(); setRunPhase("play"); }}>
                {t.resume}
              </button>
              <button type="button" className="h-12 rounded-2xl border border-line font-display text-lg" onClick={restart}>
                {t.again}
              </button>
              <button type="button" className="h-12 rounded-2xl border border-line font-display text-lg" onClick={recover}>
                {t.pose}
              </button>
            </div>
            <LangSwitch lang={lang} setLang={setLang} />
          </section>
        </div>
      )}

      {phase === "play" && (
        <div className="touch-layer pointer-events-none absolute inset-x-0 bottom-0 z-30 items-end justify-between p-4">
          <Stick />
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Hold
                label={t.rollL}
                roll
                onDown={() => {
                  unlockAudio();
                  touchState.rollLeft = true;
                }}
                onUp={() => {
                  touchState.rollLeft = false;
                }}
              />
              <Hold
                label={t.rollR}
                roll
                onDown={() => {
                  unlockAudio();
                  touchState.rollRight = true;
                }}
                onUp={() => {
                  touchState.rollRight = false;
                }}
              />
            </div>
            <div className="flex gap-2">
            <Hold
              label={t.driftBtn}
              onDown={() => {
                touchState.drift = true;
              }}
              onUp={() => {
                touchState.drift = false;
              }}
            />
            <Hold
              label={t.flyBtn}
              fly
              onDown={() => {
                unlockAudio();
                touchState.fly = true;
              }}
              onUp={() => {
                touchState.fly = false;
              }}
            />
            <button type="button" className="hold grid place-items-center" aria-label={t.pose} onClick={recover}>
              <RotateCcw className="size-5" />
            </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const iconBtn = "grid size-11 place-items-center rounded-full border border-line bg-surface text-fg";

function Chip({ done, text }: { done: boolean; text: string }) {
  return (
    <span className={done ? "rounded-full border border-accent px-2 py-1 text-xs text-accent" : "rounded-full border border-line bg-surface px-2 py-1 text-xs text-muted"}>
      {text}
    </span>
  );
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="mt-3 flex gap-2" role="group" aria-label={copy[lang].langLabel}>
      {(["zh", "en"] as const).map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={lang === id}
          className={
            lang === id
              ? "h-11 min-w-11 rounded-full bg-fg px-4 font-display text-bg"
              : "h-11 min-w-11 rounded-full border border-line px-4 font-display text-muted"
          }
          onClick={() => {
            setLang(id);
            saveLang(id);
          }}
        >
          {id === "zh" ? "中文" : "EN"}
        </button>
      ))}
    </div>
  );
}

function Stick() {
  const base = useRef<HTMLDivElement>(null);
  const [nub, setNub] = useState({ x: 0, y: 0 });

  function place(clientX: number, clientY: number) {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    let dy = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    touchState.steer = Math.max(-1, Math.min(1, -dx));
    touchState.throttle = Math.max(-1, Math.min(1, -dy));
    setNub({ x: dx * 34, y: dy * 34 });
  }

  function end() {
    touchState.steer = 0;
    touchState.throttle = 0;
    setNub({ x: 0, y: 0 });
  }

  return (
    <div
      ref={base}
      className="stick-base pointer-events-auto relative"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        place(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) place(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="stick-nub absolute top-1/2 left-1/2"
        style={{ transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))` }}
      />
    </div>
  );
}

function Hold({
  label,
  fly,
  roll,
  onDown,
  onUp,
}: {
  label: string;
  fly?: boolean;
  roll?: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  function down(e: ReactPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    onDown();
  }
  const tone = fly ? "hold hold-fly" : roll ? "hold hold-roll" : "hold";
  return (
    <button
      type="button"
      className={tone}
      onPointerDown={down}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function MiniMap({ world, api, tick }: { world: World; api: RefObject<Session>; tick: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const car = api.current.car;
    const span = 96;
    const X = (x: number) => ((x - car.x + span) / (span * 2)) * size;
    const Y = (z: number) => ((z - car.z + span) / (span * 2)) * size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#141b2e";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#2a3550";
    ctx.lineWidth = 4;
    for (const line of world.linesX) {
      ctx.beginPath();
      ctx.moveTo(X(line), 0);
      ctx.lineTo(X(line), size);
      ctx.stroke();
    }
    for (const line of world.linesZ) {
      ctx.beginPath();
      ctx.moveTo(0, Y(line));
      ctx.lineTo(size, Y(line));
      ctx.stroke();
    }
    for (const b of world.buildings) {
      if (Math.abs(b.x - car.x) > span + 30 || Math.abs(b.z - car.z) > span + 30) continue;
      ctx.fillStyle = b.landable ? "#1d4a55" : "#2c3348";
      const x = X(b.x - b.hw);
      const y = Y(b.z - b.hd);
      ctx.fillRect(x, y, X(b.x + b.hw) - x, Y(b.z + b.hd) - y);
    }
    for (const p of api.current.pickups) {
      if (p.taken) continue;
      if (Math.abs(p.x - car.x) > span + 20 || Math.abs(p.z - car.z) > span + 20) continue;
      ctx.fillStyle = p.kind === "ring" ? "#3ee0ff" : "#ffd56a";
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.z), p.kind === "ring" ? 3.2 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(X(car.x), Y(car.z));
    const fx = -Math.sin(car.yaw);
    const fz = -Math.cos(car.yaw);
    ctx.rotate(Math.atan2(fx, -fz));
    ctx.fillStyle = "#ff3355";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.fill();
    ctx.restore();
  }, [api, tick, world]);

  return (
    <canvas
      ref={ref}
      width={180}
      height={180}
      className="absolute bottom-4 left-3 hidden size-28 rounded-2xl border border-line md:block"
    />
  );
}
