import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { RefObject } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { City } from "./City.tsx";
import { PlayerCar } from "./CarMesh.tsx";
import { TrafficFleet } from "./TrafficFleet.tsx";
import { playBoost, playCoin, playThud, updateEngine } from "./audio.ts";
import { readInput, setInjectedKeys, setSteerLock } from "./input.ts";
import type { Session } from "./session.ts";
import { bumpTraffic, collectPickups, kmh, stepCar, stepTraffic } from "./sim.ts";
import type { World } from "./types.ts";

const STAR_GOAL = 10;
const AIR_GOAL = 4;

export function WorldSim({
  api,
  world,
  onFrame,
}: {
  api: RefObject<Session>;
  world: World;
  onFrame: RefObject<() => void>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const acc = useRef(0);
  const desired = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const shadow = useRef<THREE.Mesh>(null);
  const reduce = useRef(false);
  const seenBoost = useRef(false);
  const thudCd = useRef(0);
  const hud = useRef(0);
  const rollVis = useRef(0);
  const lookDir = useRef(new THREE.Vector3());
  const camRight = useRef(new THREE.Vector3());
  const camUp = useRef(new THREE.Vector3(0, 1, 0));
  const worldUp = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.__controlsTest = {
      getYaw: () => api.current.car.yaw,
      getSpeed: () => api.current.car.speed,
      getY: () => api.current.car.y,
      getFlight: () => api.current.car.flight,
      getRoll: () => api.current.car.roll,
      setKeys: (codes) => setInjectedKeys(codes),
      setSteer: (v) => setSteerLock(v),
    };
    return () => {
      delete window.__controlsTest;
    };
  }, [api]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const session = api.current;
    const playing = session.phase === "play";

    if (playing) {
      acc.current += dt;
      let steps = 0;
      while (acc.current >= 1 / 60 && steps < 5) {
        const fixed = 1 / 60;
        acc.current -= fixed;
        steps += 1;
        const input = readInput();
        const stepped = stepCar(session.car, input, fixed, world.buildings, world.pads, world.bounds);
        session.car = stepped.car;
        stepTraffic(session.traffic, fixed, session.car);
        const bump = bumpTraffic(session.car, session.traffic);
        const impact = Math.max(stepped.impact, bump);
        thudCd.current = Math.max(0, thudCd.current - fixed);
        if (impact > 4 && thudCd.current <= 0) {
          session.landPulse = 1;
          session.trauma = Math.min(1, session.trauma + impact / 24);
          playThud();
          thudCd.current = 0.4;
        }
        if (stepped.launched) {
          session.trauma = Math.min(1, session.trauma + 0.25);
          playBoost();
        }
        if (session.car.boost > 0.2 && !seenBoost.current) playBoost();
        seenBoost.current = session.car.boost > 0.2;

        const got = collectPickups(session.car, session.pickups);
        if (got.gained > 0) {
          if (session.comboLeft > 0) session.combo += 1;
          else session.combo = 1;
          session.comboLeft = 2.4;
          session.score += got.gained * session.combo;
          session.stars += got.stars;
          session.toast = got.rings > 0 ? "ring" : "star";
          session.toastT = 1.2;
          session.trauma = Math.min(1, session.trauma + 0.12);
          playCoin(got.rings > 0);
        }
        session.comboLeft = Math.max(0, session.comboLeft - fixed);
        if (session.comboLeft === 0) session.combo = 0;

        const goals = session.goals;
        if (!goals.stars && session.stars >= STAR_GOAL) {
          goals.stars = true;
          session.toast = "stars";
          session.toastT = 1.6;
        }
        if (!goals.roof && session.car.roofLandings > 0) {
          goals.roof = true;
          session.toast = "roof";
          session.toastT = 1.6;
        }
        if (!goals.speed && kmh(session.car.maxSpeed) >= 180) {
          goals.speed = true;
          session.toast = "speed";
          session.toastT = 1.6;
        }
        if (!goals.air && session.car.airtime >= AIR_GOAL) {
          goals.air = true;
          session.toast = "air";
          session.toastT = 1.6;
        }
        session.toastT = Math.max(0, session.toastT - fixed);
        if (session.toastT === 0) session.toast = "";
        session.landPulse = Math.max(0, session.landPulse - fixed * 2.4);
        session.trauma = Math.max(0, session.trauma - fixed * 1.5);
        if (session.score > session.best) session.best = session.score;
      }
      updateEngine(session.car.speed, session.car.thrusting || session.car.jetL || session.car.jetR, session.car.drifting);
      if (session.phase !== "menu") {
        hud.current += dt;
        if (hud.current > 0.1) {
          hud.current = 0;
          onFrame.current();
        }
      }
    } else {
      acc.current = 0;
      updateEngine(0, false, false);
    }

    const c = session.car;
    if (!playing && session.phase === "menu") {
      const ang = reduce.current ? 0.9 : state.clock.elapsedTime * 0.12;
      desired.current.set(c.x + Math.sin(ang) * 8.4, 2.05, c.z + Math.cos(ang) * 8.4);
      camera.position.lerp(desired.current, 1 - Math.exp(-2.2 * dt));
      look.current.set(c.x, 0.32, c.z);
      camera.lookAt(look.current);
    } else {
      const fx = -Math.sin(c.yaw);
      const fz = -Math.cos(c.yaw);
      const dist = 7.6;
      const height = 2.45 + Math.max(0, c.y - 0.55) * 0.15;
      desired.current.set(c.x - fx * dist, c.y + height, c.z - fz * dist);
      const k = 1 - Math.exp(-4.2 * dt);
      camera.position.lerp(desired.current, k);
      look.current.set(c.x + fx * 5.2, c.y + 0.7, c.z + fz * 5.2);
      camera.lookAt(look.current);
      const sh = reduce.current ? 0 : session.trauma * session.trauma;
      if (sh > 0) {
        const t = state.clock.elapsedTime;
        camera.position.x += Math.sin(t * 47) * 0.28 * sh;
        camera.position.y += Math.cos(t * 39) * 0.18 * sh;
      }
      const want = 62 + Math.min(16, Math.abs(c.speed) * 0.32);
      camera.fov += (want - camera.fov) * (1 - Math.exp(-3 * dt));
      camera.updateProjectionMatrix();
    }

    const wrapped = Math.atan2(Math.sin(c.roll), Math.cos(c.roll));
    const follow = playing ? wrapped * 0.62 : 0;
    rollVis.current = THREE.MathUtils.damp(rollVis.current, follow, 5, dt);
    lookDir.current.copy(look.current).sub(camera.position);
    if (lookDir.current.lengthSq() < 1e-6) lookDir.current.set(0, 0, -1);
    lookDir.current.normalize();
    camRight.current.crossVectors(lookDir.current, worldUp.current);
    if (camRight.current.lengthSq() < 1e-4) camRight.current.set(1, 0, 0);
    camRight.current.normalize();
    const s = Math.sin(rollVis.current);
    const co = Math.cos(rollVis.current);
    camUp.current.copy(worldUp.current).multiplyScalar(co).addScaledVector(camRight.current, -s);
    camera.up.copy(camUp.current);
    camera.lookAt(look.current);

    const blob = shadow.current;
    if (blob) {
      const lift = Math.max(0, c.y - 0.55 - c.supportY);
      const shade = THREE.MathUtils.clamp(1 - lift / 14, 0.12, 1);
      blob.position.set(c.x, c.supportY + 0.07, c.z);
      blob.scale.setScalar(0.85 + shade);
      (blob.material as THREE.MeshBasicMaterial).opacity = 0.38 * shade;
    }
  });

  return (
    <>
      <City
        key={`${world.buildings.length}:${world.windows.length}:${world.lamps.length}:${world.linesX.length}:${world.linesZ[0]}:${world.linesX[0]}`}
        world={world}
      />
      <MoonShadow api={api} />
      <PlayerCar api={api} />
      <TrafficFleet
        key={`${world.focus.x.toFixed(0)}:${world.focus.z.toFixed(0)}:${world.buildings.length}`}
        api={api}
        world={world}
      />
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <circleGeometry args={[1.15, 20]} />
        <meshBasicMaterial color="#05070d" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <Pickups api={api} />
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.24} intensity={1.05} />
        <Vignette eskil={false} offset={0.28} darkness={0.46} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

function MoonShadow({ api }: { api: RefObject<Session> }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, []);
  useFrame(() => {
    const c = api.current.car;
    const l = light.current;
    const tgt = target.current;
    if (!l || !tgt) return;
    l.position.set(c.x + 14, 28, c.z + 9);
    tgt.position.set(c.x, 0, c.z);
  });
  return (
    <>
      <directionalLight
        ref={light}
        intensity={2.05}
        color="#f4f0e6"
      />
      <object3D ref={target} />
    </>
  );
}

function Pickups({ api }: { api: RefObject<Session> }) {
  const starRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const stars = useMemo(() => api.current.pickups.filter((p) => p.kind === "star"), [api]);
  const rings = useMemo(() => api.current.pickups.filter((p) => p.kind === "ring"), [api]);
  const primed = useRef(false);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const car = api.current.car;
    const paint = (mesh: THREE.InstancedMesh | null, list: typeof stars, spin: number) => {
      if (!mesh) return;
      for (let i = 0; i < list.length; i++) {
        const p = list[i]!;
        const near = Math.abs(p.x - car.x) < 160 && Math.abs(p.z - car.z) < 160;
        if (!near && !p.taken && primed.current) continue;
        dummy.position.set(p.x, p.taken ? -20 : p.y + Math.sin(t * 2.2 + p.id) * 0.16, p.z);
        dummy.rotation.set(0, t * spin, 0);
        dummy.scale.setScalar(p.taken ? 0 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    paint(starRef.current, stars, 1.5);
    paint(ringRef.current, rings, 0.7);
    primed.current = true;
  });
  return (
    <>
      {stars.length > 0 && (
        <instancedMesh ref={starRef} args={[undefined, undefined, stars.length]} frustumCulled={false}>
          <octahedronGeometry args={[0.38, 0]} />
          <meshBasicMaterial color="#ffd56a" toneMapped={false} />
        </instancedMesh>
      )}
      {rings.length > 0 && (
        <instancedMesh ref={ringRef} args={[undefined, undefined, rings.length]} frustumCulled={false}>
          <torusGeometry args={[1.55, 0.09, 8, 18]} />
          <meshBasicMaterial color="#3ee0ff" toneMapped={false} />
        </instancedMesh>
      )}
    </>
  );
}
