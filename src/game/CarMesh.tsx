import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RefObject } from "react";
import { HALF_H } from "./sim.ts";
import type { Session } from "./session.ts";
import {
  NOZZLE_X,
  WHEEL_X,
  WHEEL_Y,
  WHEEL_Z_FRONT,
  WHEEL_Z_REAR,
  bodyGeo,
} from "./roadsterGeo.ts";

const WHEEL_SPOTS: [number, number, number][] = [
  [WHEEL_X, WHEEL_Y, WHEEL_Z_FRONT],
  [-WHEEL_X, WHEEL_Y, WHEEL_Z_FRONT],
  [WHEEL_X, WHEEL_Y, WHEEL_Z_REAR],
  [-WHEEL_X, WHEEL_Y, WHEEL_Z_REAR],
];

const LIFT_SPOTS: [number, number, number][] = [
  [0.55, -0.18, 0.72],
  [-0.55, -0.18, 0.72],
  [0.62, -0.16, -0.55],
  [-0.62, -0.16, -0.55],
];

function plateTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#e8e4da";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#b9b3a6";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = "#2c2c2c";
  ctx.font = "700 62px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RDSTR", 128, 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function hotMaterial(r: number, g: number, b: number) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(r, g, b),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function Wheel() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.34, 0.26, 28]} />
        <meshStandardMaterial color="#12141a" roughness={0.86} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.27, 0.27, 0.28, 24]} />
        <meshStandardMaterial color="#c5ccd6" metalness={0.92} roughness={0.22} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[(i * Math.PI * 2) / 5, 0, 0]}>
          <mesh position={[0.03, 0.145, 0]} rotation={[0.55, 0.35, 0]}>
            <boxGeometry args={[0.045, 0.22, 0.07]} />
            <meshStandardMaterial color="#d5dbe3" metalness={0.95} roughness={0.18} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.075, 0.03, 14]} />
          <meshStandardMaterial color="#0e1014" metalness={0.8} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

let vaporTex: THREE.CanvasTexture | null = null;

function vaporTexture() {
  if (vaporTex) return vaporTex;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) return null;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 31);
  grd.addColorStop(0, "rgba(255,255,255,0.75)");
  grd.addColorStop(0.2, "rgba(206,220,232,0.38)");
  grd.addColorStop(0.5, "rgba(160,178,196,0.1)");
  grd.addColorStop(1, "rgba(160,178,196,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  vaporTex = tex;
  return tex;
}

const PUFFS = 14;

function Jet({
  position,
  axis = "back",
  setRef,
}: {
  position: [number, number, number];
  axis?: "back" | "down" | "left" | "right";
  setRef: (node: THREE.Group | null) => void;
}) {
  const tex = useMemo(() => vaporTexture(), []);
  const mats = useMemo(
    () =>
      Array.from({ length: PUFFS }, () =>
        new THREE.SpriteMaterial({
          map: tex ?? undefined,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: true,
          color: axis === "down" ? "#d5e0ea" : "#eef3f8",
        }),
      ),
    [axis, tex],
  );
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: PUFFS }, (_, i) => ({
        phase: (i + 0.15) / PUFFS,
        spin: i * 1.63,
        lean: ((i % 5) - 2) * 0.42,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || !g.visible) return;
    const t = clock.elapsedTime;
    const down = axis === "down";
    const side = axis === "left" ? -1 : axis === "right" ? 1 : 0;
    const speed = down ? 3.4 : side ? 4.6 : 5.2;
    const reach = down ? 0.78 : side ? 1.2 : 1.62;
    for (let i = 0; i < PUFFS; i++) {
      const s = seeds[i]!;
      const life = (s.phase + t * speed) % 1;
      const fade = Math.sin(life * Math.PI);
      const spread = life * life * (down ? 0.32 : 0.4);
      const wobA = Math.sin(t * 13 + s.spin) * spread + s.lean * life * 0.09;
      const wobB = Math.cos(t * 10.5 + s.spin * 1.4) * spread * 0.85;
      const along = 0.04 + life * reach;
      const sprite = g.children[i] as THREE.Sprite;
      if (!sprite) continue;
      if (down) sprite.position.set(wobA, -along, wobB);
      else if (side) sprite.position.set(side * along, wobB * 0.35, wobA * 0.45);
      else sprite.position.set(wobA, wobB * 0.55, -along);
      const sc = 0.06 + life * (down ? 0.32 : side ? 0.4 : 0.5);
      sprite.scale.set(sc * (0.62 + life * 0.7), sc, 1);
      const mat = mats[i]!;
      mat.opacity = fade * fade * (down ? 0.42 : side ? 0.66 : 0.7);
    }
  });

  return (
    <group
      ref={(node) => {
        group.current = node;
        setRef(node);
      }}
      position={position}
      visible={false}
    >
      {mats.map((mat, i) => (
        <sprite key={i} material={mat} renderOrder={3} />
      ))}
    </group>
  );
}

function Roadster({
  color,
  hero,
  wingRef,
  rearRefs,
  liftRefs,
  sideRefs,
  dustRef,
  tailRef,
}: {
  color: string;
  hero: boolean;
  wingRef?: RefObject<THREE.Group | null>;
  rearRefs?: RefObject<Array<THREE.Group | null>>;
  liftRefs?: RefObject<Array<THREE.Group | null>>;
  sideRefs?: RefObject<Array<THREE.Group | null>>;
  dustRef?: RefObject<THREE.Mesh | null>;
  tailRef?: RefObject<THREE.MeshStandardMaterial | null>;
}) {
  const plate = useMemo(() => (hero ? plateTexture() : null), [hero]);
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: hero ? 0.22 : 0.4,
        roughness: hero ? 0.1 : 0.28,
        clearcoat: 1,
        clearcoatRoughness: hero ? 0.05 : 0.12,
        envMapIntensity: 1.45,
      }),
    [color, hero],
  );
  const carbon = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0c0e12",
        metalness: 0.72,
        roughness: 0.34,
        envMapIntensity: 0.9,
      }),
    [],
  );
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#3a2c1c",
        metalness: 0.88,
        roughness: 0.06,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.7,
      }),
    [],
  );
  const gold = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d4b56a", metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }),
    [],
  );
  const tail = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#ff1a2e",
      emissive: "#ff1a2e",
      emissiveIntensity: hero ? 7 : 2.2,
      toneMapped: false,
    });
    return m;
  }, [hero]);

  return (
    <group>
      <mesh geometry={bodyGeo} material={paint} castShadow />
      <mesh position={[0, 0.32, -0.05]}>
        <boxGeometry args={[0.95, 0.32, 1.15]} />
        <meshStandardMaterial color="#07080c" roughness={1} />
      </mesh>
      {hero && (
        <>
          <mesh position={[-0.22, 0.28, -0.2]} rotation={[-0.35, 0.05, 0]}>
            <boxGeometry args={[0.32, 0.2, 0.32]} />
            <meshStandardMaterial color="#efe8dc" roughness={0.62} />
          </mesh>
          <mesh position={[0.22, 0.28, 0.05]} rotation={[-0.4, -0.04, 0]}>
            <boxGeometry args={[0.3, 0.16, 0.28]} />
            <meshStandardMaterial color="#1a1c22" roughness={0.5} metalness={0.2} />
          </mesh>
        </>
      )}
      <mesh position={[0, 0.48, 0.32]} rotation={[-1.02, 0, 0]} material={glass}>
        <planeGeometry args={[0.92, 0.52]} />
      </mesh>
        {[-1, 1].map((s) => (
        <mesh key={`sg${s}`} position={[s * 0.9, 0.5, -0.15]} material={glass}>
          <boxGeometry args={[0.02, 0.18, 0.78]} />
        </mesh>
      ))}
      <mesh position={[0, 0.68, -0.98]} rotation={[0.72, 0, 0]} material={glass}>
        <planeGeometry args={[0.72, 0.28]} />
      </mesh>

      <mesh position={[0, -0.08, 1.58]} material={carbon}>
        <boxGeometry args={[1.35, 0.06, 0.32]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`sk${s}`} position={[s * 0.78, -0.06, -0.05]} material={carbon}>
          <boxGeometry args={[0.16, 0.14, 1.85]} />
        </mesh>
      ))}
      <mesh position={[0, -0.04, -1.62]} material={carbon}>
        <boxGeometry args={[1.55, 0.42, 0.55]} />
      </mesh>
      {[-0.55, -0.28, 0, 0.28, 0.55].map((x) => (
        <mesh key={`fin${x}`} position={[x, -0.12, -1.86]} material={carbon}>
          <boxGeometry args={[0.04, 0.22, 0.28]} />
        </mesh>
      ))}

      <group ref={wingRef} position={[0, 0.74, -1.32]}>
        <mesh position={[0, 0.03, -0.28]} material={paint}>
          <boxGeometry args={[1.82, 0.035, 0.46]} />
        </mesh>
        <mesh position={[0, 0.012, -0.28]} material={carbon}>
          <boxGeometry args={[1.7, 0.018, 0.4]} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 0.08, -0.28]} material={carbon}>
            <boxGeometry args={[0.028, 0.14, 0.44]} />
          </mesh>
        ))}
        {[-0.42, 0.42].map((x) => (
          <mesh key={`st${x}`} position={[x, -0.06, -0.08]} material={carbon}>
            <boxGeometry args={[0.04, 0.12, 0.08]} />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0.42, -1.66]} material={paint}>
        <boxGeometry args={[1.58, 0.62, 0.08]} />
      </mesh>
      <mesh
        position={[0, 0.64, -1.71]}
        material={tail}
        ref={(node) => {
          if (tailRef && node) tailRef.current = node.material as THREE.MeshStandardMaterial;
        }}
      >
        <boxGeometry args={[1.5, 0.04, 0.025]} />
      </mesh>
      {hero && plate && (
        <mesh position={[0, 0.42, -1.76]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.36, 0.16]} />
          <meshStandardMaterial map={plate} roughness={0.45} metalness={0.15} />
        </mesh>
      )}

      {NOZZLE_X.map((x) => (
        <group key={`n${x}`} position={[x, 0.0, -1.82]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
            <torusGeometry args={[0.09, 0.014, 8, 18]} />
          </mesh>
          <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={carbon}>
            <cylinderGeometry args={[0.055, 0.075, 0.14, 14]} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.14, 1.735]}>
        <boxGeometry args={[1.05, 0.028, 0.02]} />
        <meshStandardMaterial color="#fff6e4" emissive="#fff6e4" emissiveIntensity={hero ? 5 : 1.4} toneMapped={false} />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={`hl${x}`} position={[x, 0.2, 1.7]} rotation={[0, x > 0 ? 0.5 : -0.5, 0]}>
          <boxGeometry args={[0.16, 0.03, 0.02]} />
          <meshStandardMaterial color="#fff6e4" emissive="#fff1cc" emissiveIntensity={hero ? 3.5 : 1} toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`mir${s}`} position={[s * 0.9, 0.42, 0.32]} material={carbon}>
          <boxGeometry args={[0.14, 0.05, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 0.36, 0.85]} material={carbon}>
        <boxGeometry args={[0.04, 0.015, 0.7]} />
      </mesh>

      {hero &&
        NOZZLE_X.map((x, i) => (
          <Jet
            key={`p${x}`}
            position={[x, 0.02, -1.88]}
            setRef={(node) => {
              if (rearRefs) rearRefs.current[i] = node;
            }}
          />
        ))}
      {hero &&
        LIFT_SPOTS.map((p, i) => (
          <Jet
            key={`l${i}`}
            position={p}
            axis="down"
            setRef={(node) => {
              if (liftRefs) liftRefs.current[i] = node;
            }}
          />
        ))}
      {hero &&
        ([-1, 1] as const).map((s, i) => (
          <Jet
            key={`side${s}`}
            position={[s * 1.02, 0.08, 0.15]}
            axis={s < 0 ? "left" : "right"}
            setRef={(node) => {
              if (sideRefs) sideRefs.current[i] = node;
            }}
          />
        ))}
      {[-1, 1].map((s) => (
        <group key={`sj${s}`} position={[s * 0.98, 0.08, 0.15]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={gold}>
            <torusGeometry args={[0.07, 0.012, 8, 16]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={carbon}>
            <cylinderGeometry args={[0.04, 0.055, 0.1, 12]} />
          </mesh>
        </group>
      ))}
      {hero && (
        <mesh ref={dustRef} position={[0, -0.53, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.45, 1.45, 24]} />
          <meshBasicMaterial color="#e7eef6" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {hero && <Headlights />}
    </group>
  );
}

function Headlights() {
  const left = useRef<THREE.SpotLight>(null);
  const right = useRef<THREE.SpotLight>(null);
  const leftTarget = useRef<THREE.Object3D>(null);
  const rightTarget = useRef<THREE.Object3D>(null);
  useLayoutEffect(() => {
    if (left.current && leftTarget.current) left.current.target = leftTarget.current;
    if (right.current && rightTarget.current) right.current.target = rightTarget.current;
  }, []);
  return (
    <>
      <spotLight ref={left} position={[0.32, 0.16, 1.72]} angle={0.46} penumbra={0.62} intensity={40} distance={38} color="#fff4e2" />
      <spotLight ref={right} position={[-0.32, 0.16, 1.72]} angle={0.46} penumbra={0.62} intensity={40} distance={38} color="#fff4e2" />
      <object3D ref={leftTarget} position={[0.45, -0.35, 16]} />
      <object3D ref={rightTarget} position={[-0.45, -0.35, 16]} />
    </>
  );
}

export function PlayerCar({ api }: { api: RefObject<Session> }) {
  const group = useRef<THREE.Group>(null);
  const squash = useRef<THREE.Group>(null);
  const wheels = useRef<Array<THREE.Group | null>>([null, null, null, null]);
  const wing = useRef<THREE.Group>(null);
  const rear = useRef<Array<THREE.Group | null>>([null, null, null, null]);
  const lift = useRef<Array<THREE.Group | null>>([null, null, null, null]);
  const side = useRef<Array<THREE.Group | null>>([null, null]);
  const dust = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.MeshStandardMaterial>(null);
  const jetLight = useRef<THREE.PointLight>(null);
  const spin = useRef(0);
  const thrust = useRef(0);
  const sideAmt = useRef([0, 0]);
  const wingAngle = useRef(-0.16);

  useFrame((_, dt) => {
    const c = api.current.car;
    const g = group.current;
    if (!g) return;
    g.position.set(c.x, c.y, c.z);
    g.rotation.order = "YXZ";
    g.rotation.y = c.yaw + Math.PI;
    g.rotation.x = Math.max(-0.28, Math.min(0.22, -c.vy * 0.035));
    g.rotation.z = c.roll;
    const pulse = api.current.landPulse;
    const sy = 1 - pulse * 0.08;
    squash.current?.scale.set(1 + pulse * 0.04, sy, 1 + pulse * 0.04);
    spin.current += c.speed * dt * 2.6;
    for (const w of wheels.current) {
      if (w) w.rotation.x = spin.current;
    }
    const target = c.thrusting ? 1 : 0;
    thrust.current = THREE.MathUtils.damp(thrust.current, target, 12, dt);
    const tAmt = thrust.current;
    const wantWing = c.thrusting || !c.grounded || Math.abs(c.speed) > 18 ? -0.62 : -0.14;
    wingAngle.current = THREE.MathUtils.damp(wingAngle.current, wantWing, 6, dt);
    if (wing.current) wing.current.rotation.x = wingAngle.current;
    const now = performance.now() * 0.001;
    rear.current.forEach((node) => {
      if (!node) return;
      node.visible = tAmt > 0.08;
      const flick = 0.94 + Math.sin(now * 22) * 0.06;
      const s = (0.78 + tAmt * 0.7) * flick;
      node.scale.setScalar(s);
    });
    const liftAmt = tAmt * (c.grounded ? 0.45 : 1);
    lift.current.forEach((node, i) => {
      if (!node) return;
      node.visible = liftAmt > 0.08;
      const flick = 0.92 + Math.sin(now * 19 + i) * 0.06;
      const s = (0.7 + liftAmt * 0.55) * flick;
      node.scale.setScalar(s);
    });
    const sideOn = [c.jetL ? 1 : 0, c.jetR ? 1 : 0];
    side.current.forEach((node, i) => {
      if (!node) return;
      const amt = (sideAmt.current[i] = THREE.MathUtils.damp(sideAmt.current[i] ?? 0, sideOn[i] ?? 0, 14, dt));
      node.visible = amt > 0.05;
      const flick = 0.92 + Math.sin(now * 26 + i) * 0.08;
      node.scale.setScalar((0.72 + amt * 0.7) * flick);
    });
    if (dust.current) {
      const show = tAmt > 0.2 && c.y < HALF_H + 1.4;
      dust.current.visible = show;
      const s = 0.7 + tAmt * (0.6 + Math.sin(now * 20) * 0.08);
      dust.current.scale.set(s, s, 1);
      const mat = dust.current.material as THREE.MeshBasicMaterial;
      mat.opacity = show ? 0.22 + tAmt * 0.25 : 0;
    }
    if (tail.current) tail.current.emissiveIntensity = c.thrusting ? 11 : 6.5;
    if (jetLight.current) jetLight.current.intensity = tAmt * 0.55;
  });

  return (
    <group ref={group}>
      <group ref={squash}>
        <Roadster
          color="#f7f6f2"
          hero
          wingRef={wing}
          rearRefs={rear}
          liftRefs={lift}
          sideRefs={side}
          dustRef={dust}
          tailRef={tail}
        />
        <pointLight ref={jetLight} position={[0, 0.12, -1.55]} intensity={0} distance={2.4} color="#c9d6e4" />
      </group>
      {WHEEL_SPOTS.map((p, i) => (
        <group
          key={i}
          position={p}
          ref={(node) => {
            wheels.current[i] = node;
          }}
        >
          <Wheel />
        </group>
      ))}
    </group>
  );
}

const TRAFFIC = ["#1c212b", "#8d939c", "#6d2430", "#243038"];

export function TrafficCarMesh({ api, index }: { api: RefObject<Session>; index: number }) {
  const group = useRef<THREE.Group>(null);
  const color = TRAFFIC[index % TRAFFIC.length] ?? "#1c212b";
  useFrame(() => {
    const t = api.current.traffic[index];
    const g = group.current;
    if (!t || !g) return;
    g.position.set(t.x, HALF_H, t.z);
    g.rotation.y = t.yaw + Math.PI;
  });
  return (
    <group ref={group}>
      <Roadster color={color} hero={false} />
      {WHEEL_SPOTS.map((p, i) => (
        <group key={i} position={p}>
          <Wheel />
        </group>
      ))}
    </group>
  );
}
