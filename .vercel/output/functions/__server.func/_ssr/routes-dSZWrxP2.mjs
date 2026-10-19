import { i as __toESM } from "../_runtime.mjs";
import { A as Object3D, B as SphereGeometry, C as Matrix4, D as MeshPhysicalMaterial, F as SRGBColorSpace, I as Scene, N as Quaternion, O as MeshStandardMaterial, P as RepeatWrapping, Q as require_react, R as Shape, S as MathUtils, T as MeshBasicMaterial, V as SpriteMaterial, Z as require_jsx_runtime, a as PMREMGenerator, c as BufferAttribute, d as Color, h as Float32BufferAttribute, i as useThree, l as BufferGeometry, q as Vector3, r as useFrame, s as BoxGeometry, t as Canvas, u as CanvasTexture, w as Mesh, z as ShapeGeometry } from "../_libs/@react-three/fiber+[...].mjs";
import { a as Play, i as RotateCcw, n as Volume2, o as Pause, t as VolumeX } from "../_libs/lucide-react.mjs";
import { a as ToneMappingMode, i as Vignette, n as EffectComposer, r as ToneMapping, t as Bloom } from "../_libs/@react-three/postprocessing+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-dSZWrxP2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ctx = null;
var master = null;
var engine = null;
var engineGain = null;
var noise = null;
var noiseGain = null;
var muted = false;
function graph() {
	if (ctx) return ctx;
	ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
	master = ctx.createGain();
	master.gain.value = .8;
	master.connect(ctx.destination);
	engine = ctx.createOscillator();
	engine.type = "sawtooth";
	engine.frequency.value = 60;
	const filter = ctx.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.value = 420;
	engineGain = ctx.createGain();
	engineGain.gain.value = 0;
	engine.connect(filter);
	filter.connect(engineGain);
	engineGain.connect(master);
	engine.start();
	const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	noise = ctx.createBufferSource();
	noise.buffer = buffer;
	noise.loop = true;
	const nFilter = ctx.createBiquadFilter();
	nFilter.type = "bandpass";
	nFilter.frequency.value = 900;
	noiseGain = ctx.createGain();
	noiseGain.gain.value = 0;
	noise.connect(nFilter);
	nFilter.connect(noiseGain);
	noiseGain.connect(master);
	noise.start();
	return ctx;
}
function unlockAudio() {
	if (typeof window === "undefined") return;
	const audio = graph();
	if (audio.state === "suspended") audio.resume();
}
function resumeAudio() {
	if (ctx && ctx.state === "suspended") ctx.resume();
}
function setMuted(next) {
	muted = next;
	if (!master || !ctx) return;
	master.gain.setTargetAtTime(next ? 0 : .8, ctx.currentTime, .03);
}
function updateEngine(speed, thrusting, drifting) {
	if (!ctx || !engine || !engineGain || !noiseGain) return;
	const rate = 52 + Math.min(160, Math.abs(speed) * 3.2) + (thrusting ? 40 : 0);
	engine.frequency.setTargetAtTime(rate, ctx.currentTime, .05);
	const vol = muted ? 0 : Math.min(.18, .02 + Math.abs(speed) * .004 + (thrusting ? .05 : 0));
	engineGain.gain.setTargetAtTime(vol, ctx.currentTime, .05);
	noiseGain.gain.setTargetAtTime(muted ? 0 : thrusting || drifting ? .045 : 0, ctx.currentTime, .05);
}
function blip(freq, dur, type, gain) {
	if (!ctx || !master || muted) return;
	const osc = ctx.createOscillator();
	const g = ctx.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	g.gain.setValueAtTime(gain, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + dur);
	osc.connect(g);
	g.connect(master);
	osc.start();
	osc.stop(ctx.currentTime + dur + .02);
}
function playCoin(ring) {
	blip(ring ? 880 : 620, .12, "triangle", .16);
	blip(ring ? 1320 : 920, .16, "sine", .08);
}
function playThud() {
	blip(90 + Math.random() * 30, .18, "sine", .2);
}
function playBoost() {
	blip(220, .2, "square", .05);
}
var BLOCK$1 = /* @__PURE__ */ new Set([
	"Space",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight"
]);
var keys = /* @__PURE__ */ new Set();
var injected = null;
var steerLock = null;
var touchState = {
	throttle: 0,
	steer: 0,
	fly: false,
	drift: false,
	rollLeft: false,
	rollRight: false
};
function bindInput() {
	const down = (e) => {
		keys.add(e.code);
		if (BLOCK$1.has(e.code)) e.preventDefault();
	};
	const up = (e) => {
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
function setInjectedKeys(codes) {
	injected = new Set(codes);
}
function clearInjectedKeys() {
	injected = null;
}
function setSteerLock(v) {
	steerLock = v;
}
function held() {
	return injected ?? keys;
}
function readInput() {
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
	const fly = h.has("Space") || injected == null && touchState.fly;
	const drift = h.has("ShiftLeft") || h.has("ShiftRight") || injected == null && touchState.drift;
	const rollLeft = h.has("KeyQ") || injected == null && touchState.rollLeft;
	const rollRight = h.has("KeyE") || injected == null && touchState.rollRight;
	return {
		steer: Math.max(-1, Math.min(1, steer)),
		throttle: Math.max(-1, Math.min(1, throttle)),
		fly,
		drift,
		rollLeft,
		rollRight
	};
}
var copy = {
	zh: {
		kicker: "迷你夜航",
		sub: "开放夜城 · 冷气飞行 · 左右翻滚",
		blurb: "Mini Roadster 是一台迷你白车：楔形车壳、铜膜玻璃、主动尾翼，车尾四支冷气喷口。夜里沿着街道随便开，空格能短暂飞起来，Q 和 E 负责左右翻滚，两个一起按会把车身扳正。低矮楼顶可以降落。",
		go: "出发 Start",
		how: "怎么开",
		drive: "W 加速 · S 刹车 · A / D 转向",
		fly: "空格：主喷气，短暂离地。落地后能量回充。",
		roll: "Q 左喷气 · E 右喷气：空中翻滚。同时按住会回正。",
		oneway: "每条车道都是单行：别的车顺着走，你可以顺开，也可以逆行",
		drift: "按住 Shift 漂移，松手会窜出去",
		reset: "R 拉回路口 · Esc 暂停",
		goals: "今夜目标",
		gStars: "收集星星",
		gRoof: "降落矮楼",
		gSpeed: "时速 180",
		gAir: "滞空 4 秒",
		speed: "时速",
		flight: "飞行能量",
		alt: "高度",
		score: "分数",
		best: "最佳",
		resume: "继续飞",
		again: "重开一局",
		pose: "拉回路口",
		soundOn: "声音开",
		soundOff: "声音关",
		toEn: "EN",
		toZh: "中",
		flyBtn: "主喷",
		rollL: "左喷",
		rollR: "右喷",
		driftBtn: "漂移",
		pause: "暂停",
		combo: "连击",
		roofToast: "停机坪锁定",
		starToast: "星尘",
		ringToast: "光环",
		disclaimer: "粉丝向致敬，并非 Tesla 官方产品。",
		pads: "青色圆垫 = 可降落",
		towers: "高楼顶会把你推下去",
		jump: "路上的青色跳板能把你弹起来",
		langLabel: "语言"
	},
	en: {
		kicker: "Mini night run",
		sub: "Open city · cold-gas hops · barrel rolls",
		blurb: "Mini Roadster is a small ano-white wedge: copper glass, an active wing, four cold-gas nozzles. Cruise the night streets, hop with Space, roll with Q and E, and set it down on a low roof.",
		go: "Start",
		how: "Controls",
		drive: "W throttle · S brake · A / D steer",
		fly: "Space is the main thruster. Charge returns on the ground.",
		roll: "Q left jet · E right jet. Hold both to level out.",
		oneway: "Every lane is one-way. Traffic keeps its direction — you can drive with it or against it.",
		drift: "Hold Shift to drift. Release for a kick.",
		reset: "R recover · Esc pause",
		goals: "Tonight",
		gStars: "Collect stars",
		gRoof: "Land a low roof",
		gSpeed: "Hit 180 km/h",
		gAir: "4s airborne",
		speed: "Speed",
		flight: "Flight",
		alt: "Alt",
		score: "Score",
		best: "Best",
		resume: "Resume",
		again: "Restart",
		pose: "Recover",
		soundOn: "Sound on",
		soundOff: "Sound off",
		toEn: "EN",
		toZh: "中",
		flyBtn: "Main",
		rollL: "Left",
		rollR: "Right",
		driftBtn: "Drift",
		pause: "Pause",
		combo: "Combo",
		roofToast: "Pad locked",
		starToast: "Stardust",
		ringToast: "Ring",
		disclaimer: "A fan tribute. Not a Tesla product.",
		pads: "Cyan pads are landable",
		towers: "Tower crowns push you off",
		jump: "Cyan launch pads pop you skyward",
		langLabel: "Language"
	}
};
var LANG_KEY = "mini-roadster-lang";
var BEST_KEY = "skyline-roadster-best";
function matchLang(tags, saved) {
	if (saved === "zh" || saved === "en") return saved;
	for (const raw of tags) {
		const tag = String(raw || "").toLowerCase();
		if (tag.startsWith("zh")) return "zh";
		if (tag.startsWith("en")) return "en";
	}
	return "en";
}
function loadLang() {
	let saved = null;
	if (typeof localStorage !== "undefined") saved = localStorage.getItem(LANG_KEY);
	return matchLang(typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language || ""], saved);
}
function saveLang(lang) {
	localStorage.setItem(LANG_KEY, lang);
}
function loadBest() {
	if (typeof localStorage === "undefined") return 0;
	const n = Number(localStorage.getItem(BEST_KEY));
	return Number.isFinite(n) ? n : 0;
}
function saveBest(n) {
	localStorage.setItem(BEST_KEY, String(Math.floor(n)));
}
var LANE = 1.9;
var FACADES = [
	"#f3d2c4",
	"#f6f1e7",
	"#c9d6ea",
	"#f7b7c4",
	"#d7ecee"
];
var ROAD_K = [
	-2,
	-1,
	0,
	1,
	2
];
/** Half the old pack: 3 cars on one lane, 2 on the other, about 44 m apart. */
var SPARSE = [
	{
		alongIndex: 0,
		laneSide: -1
	},
	{
		alongIndex: 2,
		laneSide: -1
	},
	{
		alongIndex: 4,
		laneSide: -1
	},
	{
		alongIndex: 1,
		laneSide: 1
	},
	{
		alongIndex: 3,
		laneSide: 1
	}
];
var TRAFFIC_TOTAL = SPARSE.length * ROAD_K.length * 2;
var worldSeed = 20261016;
function mulberry32(seed) {
	let s = seed >>> 0;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function cellSeed(i, j) {
	let h = worldSeed ^ Math.imul(i | 0, 2654435761) ^ Math.imul(j | 0, 2246822507);
	h = Math.imul(h ^ h >>> 16, 2146121005);
	h = Math.imul(h ^ h >>> 15, 2221713035);
	return (h ^ h >>> 16) >>> 0;
}
function nearestOn(v, lines) {
	let d = Infinity;
	for (const line of lines) d = Math.min(d, Math.abs(v - line));
	return d;
}
function pickupId(i, j, slot) {
	const ii = i + 5e5;
	const jj = j + 5e5;
	return ii * 4e7 + jj * 32 + slot;
}
function pushWindows(b, out, rand, linesX, linesZ, maxAdd) {
	if (maxAdd <= 0 || out.length > 3200) return;
	let added = 0;
	const faces = [
		{
			x: b.x,
			z: b.z + b.hd + .06,
			axis: "x",
			span: b.hw,
			d: nearestOn(b.z + b.hd, linesZ)
		},
		{
			x: b.x,
			z: b.z - b.hd - .06,
			axis: "x",
			span: b.hw,
			d: nearestOn(b.z - b.hd, linesZ)
		},
		{
			x: b.x + b.hw + .06,
			z: b.z,
			axis: "z",
			span: b.hd,
			d: nearestOn(b.x + b.hw, linesX)
		},
		{
			x: b.x - b.hw - .06,
			z: b.z,
			axis: "z",
			span: b.hd,
			d: nearestOn(b.x - b.hw, linesX)
		}
	].sort((a, c) => a.d - c.d);
	const rows = Math.max(2, Math.min(b.h > 16 ? 8 : 5, Math.round(b.h / 3.4)));
	for (const face of faces.slice(0, 2)) {
		const cols = face.span > 4.2 ? 4 : 3;
		for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
			if (rand() < .22) continue;
			const y = 1.5 + r * 2.15;
			if (y > b.h - .7) continue;
			const offset = (c - (cols - 1) / 2) * face.span * .5;
			out.push({
				x: face.axis === "x" ? b.x + offset : face.x,
				y,
				z: face.axis === "z" ? b.z + offset : face.z,
				axis: face.axis,
				warm: rand() > .42
			});
			added += 1;
			if (added >= maxAdd) return;
		}
	}
}
/** Even grid lines run + , odd lines run −. Both lanes of a street share that direction. */
function roadDir(line) {
	return (Math.round(line / 32) % 2 + 2) % 2 === 0 ? 1 : -1;
}
function decodeSlot(i) {
	const n = Math.abs(i) % TRAFFIC_TOTAL;
	const sparse = SPARSE[n % SPARSE.length];
	const roadSlot = ROAD_K[Math.floor(n / SPARSE.length) % ROAD_K.length];
	const axis = Math.floor(n / (SPARSE.length * ROAD_K.length)) % 2 === 0 ? "z" : "x";
	return {
		alongIndex: sparse.alongIndex,
		laneSide: sparse.laneSide,
		roadSlot,
		axis
	};
}
function placeTraffic(i, ax, az) {
	const spec = decodeSlot(i);
	const baseX = Math.round(ax / 32) * 32;
	const baseZ = Math.round(az / 32) * 32;
	const line = spec.axis === "z" ? baseX + spec.roadSlot * 32 : baseZ + spec.roadSlot * 32;
	const dir = roadDir(line);
	const lane = spec.laneSide * LANE;
	const along = -24 + spec.alongIndex * 22;
	const movingX = spec.axis === "x";
	const fx = movingX ? dir : 0;
	const fz = movingX ? 0 : dir;
	const cruise = 9.2 + spec.alongIndex % 3 * 1.45 + (spec.laneSide > 0 ? .35 : 0);
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
		line
	};
}
function fillBlock(i, j, linesX, linesZ, buildings, trees, pickups, windows, maxWindows) {
	const rand = mulberry32(cellSeed(i, j));
	const x0 = i * 32 + 6 + .7;
	const x1 = (i + 1) * 32 - 6 - .7;
	const z0 = j * 32 + 6 + .7;
	const z1 = (j + 1) * 32 - 6 - .7;
	const cx = (x0 + x1) / 2;
	const cz = (z0 + z1) / 2;
	const nearOrigin = Math.abs(i) + Math.abs(j) <= 2;
	if ((i + j * 3) % 7 === 0 && !(i === 0 && j === 0) && !(i === -1 && j === 0)) {
		for (let t = 0; t < 3; t++) trees.push({
			x: x0 + 1.2 + rand() * (x1 - x0 - 2.4),
			z: z0 + 1.2 + rand() * (z1 - z0 - 2.4),
			s: .75 + rand() * .7
		});
		pickups.push({
			id: pickupId(i, j, 0),
			x: cx,
			y: 1.15,
			z: cz,
			kind: "star",
			taken: false
		});
		return;
	}
	const spanX = x1 - x0;
	const spanZ = z1 - z0;
	const forcedLow = i === 0 && j === -1 || i === -1 && j === -1 || i === 1 && j === 0;
	const slots = [
		{
			ox: .24,
			oz: .26,
			fx: .42,
			fz: .48
		},
		{
			ox: .76,
			oz: .74,
			fx: .4,
			fz: .46
		},
		{
			ox: .5,
			oz: .5,
			fx: .28,
			fz: .28
		}
	];
	for (let s = 0; s < slots.length; s++) {
		const slot = slots[s];
		if (!forcedLow && s === 2 && rand() < .4) continue;
		const hw = spanX * slot.fx * .5;
		const hd = spanZ * slot.fz * .5;
		const x = x0 + spanX * slot.ox;
		const z = z0 + spanZ * slot.oz;
		const landable = forcedLow || s < 2 && rand() < .4;
		let h;
		if (forcedLow) h = 4.6 + s * 1.05;
		else if (landable) h = 3.6 + rand() * 4.2;
		else if (s === 2) h = 22 + rand() * 20;
		else h = 11 + rand() * 12;
		const b = {
			id: pickupId(i, j, s + 1),
			x,
			z,
			hw,
			hd,
			h: landable ? Math.min(h, 8.2) : h,
			landable,
			facade: Math.floor(rand() * FACADES.length)
		};
		buildings.push(b);
		if (maxWindows > 0) pushWindows(b, windows, rand, linesX, linesZ, maxWindows);
		if (b.landable && rand() > .38) pickups.push({
			id: pickupId(i, j, 10 + s),
			x: b.x,
			y: b.h + 1.35,
			z: b.z,
			kind: "star",
			taken: false
		});
	}
	if ((i * 5 + j * 3 ^ worldSeed) % 5 === 0 || nearOrigin) {
		const onVertical = (i + j) % 2 === 0;
		pickups.push({
			id: pickupId(i, j, 2),
			x: onVertical ? i * 32 + 2.2 : i * 32 + 14,
			y: 1.15,
			z: onVertical ? j * 32 + 14 : j * 32 + 2.2,
			kind: "star",
			taken: false
		});
	}
}
function createWorld(seed = 20261016) {
	worldSeed = seed;
	return cityAround(0, 0, 9);
}
function cityAround(x, z, radius = 4) {
	const ix = Math.round(x / 32);
	const iz = Math.round(z / 32);
	const linesX = [];
	const linesZ = [];
	for (let k = -radius; k <= radius; k++) {
		linesX.push((ix + k) * 32);
		linesZ.push((iz + k) * 32);
	}
	const buildings = [];
	const trees = [];
	const windows = [];
	const pickups = [];
	const cells = [];
	for (let i = ix - radius; i < ix + radius; i++) for (let j = iz - radius; j < iz + radius; j++) {
		const cx = (i + .5) * 32;
		const cz = (j + .5) * 32;
		cells.push({
			i,
			j,
			d: Math.hypot(cx - x, cz - z)
		});
	}
	cells.sort((a, b) => a.d - b.d);
	for (const cell of cells) {
		const near = cell.d < 150;
		const lit = near || (cell.i + cell.j & 1) === 0;
		fillBlock(cell.i, cell.j, linesX, linesZ, buildings, trees, pickups, windows, lit ? near ? 16 : 6 : 0);
	}
	for (let i = ix - radius; i <= ix + radius; i++) for (let j = iz - radius; j <= iz + radius; j++) {
		const forced = i === 0 && (j === -1 || j === -2) || j === 0 && (i === 1 || i === 2);
		const roll = Math.abs((i * 13 + j * 7) % 11) === 0;
		if (!forced && !roll) continue;
		if (Math.hypot(i * 32 - x, j * 32 - z) > radius * 32) continue;
		pickups.push({
			id: pickupId(i, j, 3),
			x: i * 32,
			y: 6.4 + Math.abs(i + j) % 3 * .85,
			z: j * 32 + 14,
			kind: "ring",
			taken: false
		});
	}
	const lamps = [];
	const pushLamp = (lx, lz) => {
		if (lamps.length > (radius > 6 ? 720 : 280)) return;
		if (Math.hypot(lx - x, lz - z) > radius * 32) return;
		lamps.push({
			x: lx,
			z: lz
		});
	};
	for (const line of linesX) for (let zz = linesZ[0] + 10; zz < linesZ[linesZ.length - 1] - 6; zz += radius > 6 ? 36 : 24) {
		if (linesZ.some((l) => Math.abs(zz - l) < 12 * .55)) continue;
		pushLamp(line + 12 * .46, zz);
		pushLamp(line - 12 * .46, zz + 12);
	}
	for (const line of linesZ) for (let xx = linesX[0] + 14; xx < linesX[linesX.length - 1] - 6; xx += radius > 6 ? 36 : 24) {
		if (linesX.some((l) => Math.abs(xx - l) < 12 * .55)) continue;
		pushLamp(xx, line + 12 * .46);
		pushLamp(xx + 12, line - 12 * .46);
	}
	const pads = [];
	for (let i = ix - radius; i <= ix + radius; i++) for (let j = iz - radius; j <= iz + radius; j++) {
		if (!(i === 0 && j === -1 || i === 2 && j === 0) && Math.abs((i * 3 + j * 5) % 17) !== 0) continue;
		const alongZ = i % 2 === 0;
		pads.push({
			x: alongZ ? i * 32 : i * 32 + 12,
			z: alongZ ? j * 32 + 12 : j * 32,
			hw: alongZ ? 2.3 : 3.3,
			hd: alongZ ? 3.3 : 2.3
		});
	}
	const traffic = [];
	for (let i = 0; i < TRAFFIC_TOTAL; i++) traffic.push(placeTraffic(i, x, z));
	return {
		buildings,
		pickups,
		trees,
		lamps,
		pads,
		windows,
		traffic,
		spawn: {
			x: 0,
			z: 0,
			yaw: 0
		},
		bounds: radius * 32,
		block: 32,
		road: 12,
		linesX,
		linesZ,
		focus: {
			x,
			z
		}
	};
}
function clonePickups(list) {
	return list.map((p) => ({
		...p,
		taken: false
	}));
}
function cloneTraffic(list) {
	return list.map((t) => ({ ...t }));
}
var HALF_H = .55;
var CAR_R = 1.05;
var GRAVITY = 20;
var LIFT = 29;
var MAX_VY = 6.5;
var FLIGHT_DRAIN = .5;
var FLIGHT_REGEN = .24;
var ACCEL = 34;
var BRAKE = 42;
var DRAG = .9;
var AIR_DRAG = .28;
var MAX_SPEED = 42;
var TURN = 2.25;
var ROLL_TORQUE = 3.1;
var SIDE_DRAIN = .16;
var MAX_ROLL_RATE = 1.35;
function wrapPi(a) {
	return Math.atan2(Math.sin(a), Math.cos(a));
}
function stepRoll(c, input, dt) {
	const left = Boolean(input.rollLeft) && c.flight > .02;
	const right = Boolean(input.rollRight) && c.flight > .02;
	c.jetL = left;
	c.jetR = right;
	const wrapped = wrapPi(c.roll);
	if (left && right) {
		c.rollRate += (-16 * wrapped - 7 * c.rollRate) * dt;
		c.flight = Math.max(0, c.flight - .22 * dt);
	} else if (left || right) {
		const torque = c.grounded ? ROLL_TORQUE * .45 : ROLL_TORQUE;
		c.rollRate += (left ? torque : -torque) * dt;
		c.rollRate *= Math.exp(-2.15 * dt);
		c.rollRate = Math.max(-1.35, Math.min(MAX_ROLL_RATE, c.rollRate));
		c.flight = Math.max(0, c.flight - SIDE_DRAIN * dt);
	} else if (c.grounded) c.rollRate += (-22 * wrapped - 8 * c.rollRate) * dt;
	else c.rollRate *= Math.exp(-.22 * dt);
	c.roll += c.rollRate * dt;
}
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function createCar(spawn) {
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
		rollRate: 0
	};
}
function surfaceBelow(x, z, buildings) {
	let s = 0;
	for (const b of buildings) if (Math.abs(x - b.x) <= b.hw && Math.abs(z - b.z) <= b.hd) s = Math.max(s, b.h);
	return s;
}
function pushOut(c, buildings) {
	const bottom = c.y - HALF_H;
	for (let pass = 0; pass < 2; pass++) for (const b of buildings) {
		const dx = c.x - b.x;
		const dz = c.z - b.z;
		const ox = b.hw + CAR_R - Math.abs(dx);
		const oz = b.hd + CAR_R - Math.abs(dz);
		if (ox <= 0 || oz <= 0) continue;
		if (bottom >= b.h - .08) continue;
		if (b.landable && bottom >= b.h - 1.35 && c.vy <= 2) continue;
		if (ox < oz) c.x += Math.sign(dx || 1) * (ox + .01);
		else c.z += Math.sign(dz || 1) * (oz + .01);
		c.speed *= .94;
	}
}
function resolveVertical(c, buildings) {
	let impact = 0;
	const bottom = c.y - HALF_H;
	for (const b of buildings) {
		if (b.landable) continue;
		if (!(Math.abs(c.x - b.x) <= b.hw - .05 && Math.abs(c.z - b.z) <= b.hd - .05) || c.vy > .4) continue;
		if (bottom < b.h + .25 && bottom > b.h - 2.4) {
			const dx = c.x - b.x;
			const dz = c.z - b.z;
			const px = b.hw - Math.abs(dx);
			const pz = b.hd - Math.abs(dz);
			if (px < pz) c.x += Math.sign(dx || 1) * (px + CAR_R + .15);
			else c.z += Math.sign(dz || 1) * (pz + CAR_R + .15);
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
		if (!(Math.abs(c.x - b.x) <= b.hw - .15 && Math.abs(c.z - b.z) <= b.hd - .15)) continue;
		if (bottom2 <= b.h + .55 && bottom2 >= b.h - 2.4 && c.vy <= 2.2 && b.h >= support) {
			support = b.h;
			roof = true;
		}
	}
	const bottom3 = c.y - HALF_H;
	if (!c.thrusting && bottom3 <= support + .18 && c.vy <= 2.2) {
		const wasAir = !c.grounded;
		impact = Math.max(impact, wasAir ? Math.max(0, -c.vy) : 0);
		const fromRoof = wasAir && roof && support > 1;
		c.y = support + HALF_H;
		c.vy = 0;
		c.grounded = true;
		if (fromRoof) c.roofLandings += 1;
	} else if (c.thrusting) c.grounded = false;
	else c.grounded = false;
	return impact;
}
function launchPads(c, pads) {
	if (c.padCooldown > 0 || !c.grounded || Math.abs(c.speed) < 14) return false;
	for (const p of pads) if (Math.abs(c.x - p.x) <= p.hw && Math.abs(c.z - p.z) <= p.hd) {
		c.vy = clamp(Math.abs(c.speed) * .42, 8, 13);
		c.y += .25;
		c.grounded = false;
		c.padCooldown = .85;
		return true;
	}
	return false;
}
function stepCar(prev, input, dt, buildings, pads, bounds) {
	const c = { ...prev };
	const steer = clamp(input.steer, -1, 1);
	const throttle = clamp(input.throttle, -1, 1);
	const sp = Math.abs(c.speed);
	if (sp > 1.05) {
		const speedFactor = clamp(sp / 8, .4, 1);
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
	c.speed = clamp(c.speed, -12, MAX_SPEED);
	c.drifting = Boolean(input.drift && c.grounded && sp > 8 && Math.abs(steer) > .2);
	const targetSlide = -steer * c.speed * (c.drifting ? .62 : .14);
	const grip = c.drifting ? 2.1 : c.grounded ? 7.5 : 1.3;
	c.slide += (targetSlide - c.slide) * (1 - Math.exp(-grip * dt));
	if (c.drifting) c.driftCharge += dt;
	else if (c.driftCharge > .38) {
		c.boost = Math.min(1.5, .35 + c.driftCharge * .7);
		c.speed += 6;
		c.driftCharge = 0;
	} else c.driftCharge = 0;
	c.thrusting = Boolean(input.fly && c.flight > .03);
	if (c.thrusting) {
		c.vy += LIFT * dt;
		c.flight = Math.max(0, c.flight - FLIGHT_DRAIN * dt);
		c.grounded = false;
		c.speed += 8 * dt;
	}
	if (!c.grounded) {
		const hang = c.thrusting ? 1 : c.vy > 0 ? .72 : 1;
		c.vy -= GRAVITY * hang * dt;
		c.airtime += dt;
	} else {
		c.flight = Math.min(1, c.flight + FLIGHT_REGEN * dt);
		c.vy = 0;
	}
	c.vy = clamp(c.vy, -28, MAX_VY);
	if (c.padCooldown > 0) c.padCooldown -= dt;
	stepRoll(c, input, dt);
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
	return {
		car: c,
		impact,
		launched
	};
}
function collectPickups(car, pickups) {
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
			car.flight = Math.min(1, car.flight + .2);
		} else {
			stars += 1;
			gained += 100;
		}
	}
	return {
		gained,
		stars,
		rings
	};
}
function stepTraffic(cars, dt, anchor) {
	const ax = anchor?.x ?? 0;
	const az = anchor?.z ?? 0;
	for (let i = 0; i < cars.length; i++) {
		const c = cars[i];
		const alongX = c.axis === "x";
		let cap = c.cruise;
		let push = 0;
		for (let j = 0; j < cars.length; j++) {
			if (i === j) continue;
			const o = cars[j];
			if (o.axis !== c.axis || o.line !== c.line || o.dir !== c.dir || o.lane !== c.lane) continue;
			const gap = alongX ? (o.x - c.x) * c.dir : (o.z - c.z) * c.dir;
			if (gap > .2 && gap < 13) cap = Math.min(cap, Math.max(6.5, o.speed * .92));
			if (gap > 0 && gap < 5.6) push = Math.max(push, 5.6 - gap);
		}
		c.speed += (cap - c.speed) * Math.min(1, dt * 3);
		const fx = alongX ? c.dir : 0;
		const fz = alongX ? 0 : c.dir;
		c.x += fx * (c.speed * dt - push * .45);
		c.z += fz * (c.speed * dt - push * .45);
		if (alongX) c.z = c.line + c.lane;
		else c.x = c.line + c.lane;
		c.yaw = Math.atan2(-fx, -fz);
		if (!anchor) continue;
		const ahead = (c.x - ax) * fx + (c.z - az) * fz;
		const lateral = alongX ? Math.abs(c.line - az) : Math.abs(c.line - ax);
		if (ahead < -46 || ahead > 118 || lateral > 86) {
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
function bumpTraffic(car, cars) {
	let impact = 0;
	for (const n of cars) {
		const dx = car.x - n.x;
		const dz = car.z - n.z;
		const d2 = dx * dx + dz * dz;
		const min = 2.15;
		if (d2 >= min * min || d2 < 1e-6) continue;
		const d = Math.sqrt(d2);
		const push = min - d;
		car.x += dx / d * push;
		car.z += dz / d * push;
		car.speed *= .72;
		impact = Math.max(impact, 7);
	}
	return impact;
}
function kmh(speed) {
	return Math.abs(speed) * 5;
}
var NIGHT = [
	"#2c3548",
	"#1c2636",
	"#3a3348",
	"#243044",
	"#2a242c",
	"#1a2838",
	"#34302a"
];
var NEON = [
	"#ff2d55",
	"#3ee0ff",
	"#ffb020",
	"#c9a0ff"
];
function nearest(v, lines) {
	let d = Infinity;
	for (const line of lines) d = Math.min(d, Math.abs(v - line));
	return d;
}
var skyVert = `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
var skyFrag = `
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
function paint(mesh, items) {
	const matrix = new Matrix4();
	const color = new Color();
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
	const tex = new CanvasTexture(canvas);
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	tex.colorSpace = SRGBColorSpace;
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
	for (let i = 0; i < 4e3; i++) {
		const v = 40 + Math.random() * 90;
		ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
		ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
	}
	const tex = new CanvasTexture(canvas);
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	tex.repeat.set(6, 24);
	tex.colorSpace = SRGBColorSpace;
	return tex;
}
function StudioEnv() {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	(0, import_react.useLayoutEffect)(() => {
		const pmrem = new PMREMGenerator(gl);
		const env = new Scene();
		const room = new Mesh(new SphereGeometry(14, 28, 18), new MeshBasicMaterial({
			color: "#141820",
			side: 1
		}));
		env.add(room);
		const box = (color, x, y, z, sx, sy, sz) => {
			const mesh = new Mesh(new BoxGeometry(sx, sy, sz), new MeshBasicMaterial({ color }));
			mesh.position.set(x, y, z);
			env.add(mesh);
		};
		box("#ffffff", 0, 7, 3.5, 8, .4, 2.4);
		box("#ffe6cf", -4, 4.2, 5, 1.4, 2.6, .35);
		box("#ff2a3c", -5.5, 1.6, -1, .3, 3.2, 5);
		box("#8ec6ff", 5.5, 2.4, 1.5, .3, 2.4, 3.4);
		box("#090b10", 0, -5, 0, 22, .4, 22);
		const tex = pmrem.fromScene(env, .03).texture;
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
function City({ world }) {
	const grain = (0, import_react.useMemo)(() => grainTexture(), []);
	const asphalt = (0, import_react.useMemo)(() => asphaltTexture(), []);
	const buildingRef = (0, import_react.useRef)(null);
	const capRef = (0, import_react.useRef)(null);
	const padRef = (0, import_react.useRef)(null);
	const beaconRef = (0, import_react.useRef)(null);
	const winX = (0, import_react.useRef)(null);
	const winZ = (0, import_react.useRef)(null);
	const treeRef = (0, import_react.useRef)(null);
	const trunkRef = (0, import_react.useRef)(null);
	const lampRef = (0, import_react.useRef)(null);
	const bulbRef = (0, import_react.useRef)(null);
	const dashRef = (0, import_react.useRef)(null);
	const plazaRef = (0, import_react.useRef)(null);
	const curbRef = (0, import_react.useRef)(null);
	const neonRef = (0, import_react.useRef)(null);
	const barRef = (0, import_react.useRef)(null);
	const poolRef = (0, import_react.useRef)(null);
	const podiumRef = (0, import_react.useRef)(null);
	const crownRef = (0, import_react.useRef)(null);
	const arrowRef = (0, import_react.useRef)(null);
	const landable = (0, import_react.useMemo)(() => world.buildings.filter((b) => b.landable), [world]);
	const towers = (0, import_react.useMemo)(() => world.buildings.filter((b) => !b.landable), [world]);
	const winAlongX = (0, import_react.useMemo)(() => world.windows.filter((w) => w.axis === "x"), [world]);
	const winAlongZ = (0, import_react.useMemo)(() => world.windows.filter((w) => w.axis === "z"), [world]);
	const arrowGeo = (0, import_react.useMemo)(() => {
		const shape = new Shape();
		shape.moveTo(.62, 0);
		shape.lineTo(-.38, .3);
		shape.lineTo(-.16, 0);
		shape.lineTo(-.38, -.3);
		shape.closePath();
		const geo = new ShapeGeometry(shape);
		geo.rotateX(-Math.PI / 2);
		return geo;
	}, []);
	const dashes = (0, import_react.useMemo)(() => {
		const out = [];
		const linesX = world.linesX;
		const linesZ = world.linesZ;
		for (const z of linesZ) for (let i = 0; i < linesX.length - 1; i++) {
			const a = linesX[i];
			const b = linesX[i + 1];
			for (const t of [
				.28,
				.5,
				.72
			]) out.push({
				x: a + (b - a) * t,
				z,
				rot: 0,
				sx: 2.15,
				sz: .14
			});
		}
		for (const x of linesX) for (let j = 0; j < linesZ.length - 1; j++) {
			const a = linesZ[j];
			const b = linesZ[j + 1];
			for (const t of [
				.28,
				.5,
				.72
			]) out.push({
				x,
				z: a + (b - a) * t,
				rot: Math.PI / 2,
				sx: 2.15,
				sz: .14
			});
		}
		for (const x of linesX) for (const z of linesZ) {
			const spanW = 8.6;
			for (let k = 0; k < 3; k++) {
				const o = -.7 + k * .7;
				out.push({
					x,
					z: z + 7.4 + o,
					rot: Math.PI / 2,
					sx: .34,
					sz: spanW
				});
				out.push({
					x,
					z: z - 7.4 + o,
					rot: Math.PI / 2,
					sx: .34,
					sz: spanW
				});
				out.push({
					x: x + 7.4 + o,
					z,
					rot: 0,
					sx: .34,
					sz: spanW
				});
				out.push({
					x: x - 7.4 + o,
					z,
					rot: 0,
					sx: .34,
					sz: spanW
				});
			}
		}
		return out;
	}, [world]);
	const arrows = (0, import_react.useMemo)(() => {
		const out = [];
		const linesX = world.linesX;
		const linesZ = world.linesZ;
		for (const z of linesZ) {
			const yaw = roadDir(z) > 0 ? 0 : Math.PI;
			for (let i = 0; i < linesX.length - 1; i++) {
				const mid = (linesX[i] + linesX[i + 1]) / 2;
				out.push({
					x: mid,
					z: z - LANE,
					yaw
				});
				out.push({
					x: mid,
					z: z + LANE,
					yaw
				});
			}
		}
		for (const x of linesX) {
			const yaw = roadDir(x) > 0 ? -Math.PI / 2 : Math.PI / 2;
			for (let j = 0; j < linesZ.length - 1; j++) {
				const mid = (linesZ[j] + linesZ[j + 1]) / 2;
				out.push({
					x: x - LANE,
					z: mid,
					yaw
				});
				out.push({
					x: x + LANE,
					z: mid,
					yaw
				});
			}
		}
		return out;
	}, [world]);
	const plazas = (0, import_react.useMemo)(() => {
		const out = [];
		const linesX = world.linesX;
		const linesZ = world.linesZ;
		for (let i = 0; i < linesX.length - 1; i++) for (let j = 0; j < linesZ.length - 1; j++) {
			const x0 = linesX[i] + world.road / 2;
			const x1 = linesX[i + 1] - world.road / 2;
			const z0 = linesZ[j] + world.road / 2;
			const z1 = linesZ[j + 1] - world.road / 2;
			out.push({
				x: (x0 + x1) / 2,
				z: (z0 + z1) / 2,
				sx: x1 - x0,
				sz: z1 - z0
			});
		}
		return out;
	}, [world]);
	const curbs = (0, import_react.useMemo)(() => {
		const out = [];
		const linesX = world.linesX;
		const linesZ = world.linesZ;
		const road = world.road;
		const push = (x, z, sx, sz) => {
			out.push({
				x,
				y: .08,
				z,
				sx,
				sy: .14,
				sz,
				shade: 0
			});
		};
		for (const z of linesZ) for (let i = 0; i < linesX.length - 1; i++) {
			const a = linesX[i] + road / 2;
			const b = linesX[i + 1] - road / 2;
			const len = b - a;
			if (len < 4) continue;
			const mid = (a + b) / 2;
			for (const side of [-1, 1]) {
				push(mid, z + side * (road / 2 + 1.05), len, 2.15);
				out.push({
					x: mid,
					y: .13,
					z: z + side * (road / 2 - .08),
					sx: len,
					sy: .2,
					sz: .28,
					shade: 1
				});
				out.push({
					x: mid,
					y: .045,
					z: z + side * (road / 2 - .42),
					sx: len,
					sy: .02,
					sz: .14,
					shade: 2
				});
			}
		}
		for (const x of linesX) for (let j = 0; j < linesZ.length - 1; j++) {
			const a = linesZ[j] + road / 2;
			const b = linesZ[j + 1] - road / 2;
			const len = b - a;
			if (len < 4) continue;
			const mid = (a + b) / 2;
			for (const side of [-1, 1]) {
				push(x + side * (road / 2 + 1.05), mid, 2.15, len);
				out.push({
					x: x + side * (road / 2 - .08),
					y: .13,
					z: mid,
					sx: .28,
					sy: .2,
					sz: len,
					shade: 1
				});
				out.push({
					x: x + side * (road / 2 - .42),
					y: .045,
					z: mid,
					sx: .14,
					sy: .02,
					sz: len,
					shade: 2
				});
			}
		}
		return out;
	}, [world]);
	const neons = (0, import_react.useMemo)(() => {
		const out = [];
		const linesX = world.linesX;
		const linesZ = world.linesZ;
		world.buildings.forEach((b, i) => {
			const face = [
				{
					x: b.x,
					z: b.z + b.hd + .16,
					sx: Math.min(b.hw * 1.45, 6.4),
					sz: .08,
					d: nearest(b.z + b.hd, linesZ)
				},
				{
					x: b.x,
					z: b.z - b.hd - .16,
					sx: Math.min(b.hw * 1.45, 6.4),
					sz: .08,
					d: nearest(b.z - b.hd, linesZ)
				},
				{
					x: b.x + b.hw + .16,
					z: b.z,
					sx: .08,
					sz: Math.min(b.hd * 1.45, 6.4),
					d: nearest(b.x + b.hw, linesX)
				},
				{
					x: b.x - b.hw - .16,
					z: b.z,
					sx: .08,
					sz: Math.min(b.hd * 1.45, 6.4),
					d: nearest(b.x - b.hw, linesX)
				}
			].sort((a, c) => a.d - c.d)[0];
			const y = Math.min(7.2, Math.max(2.8, b.h * .38));
			out.push({
				x: face.x,
				y,
				z: face.z,
				sx: face.sx,
				sy: Math.min(1.25, b.h * .18),
				sz: face.sz,
				color: i % NEON.length
			});
			if (i % 2 === 0 && b.h > 4) out.push({
				x: face.x,
				y: 1.7,
				z: face.z,
				sx: face.sx > face.sz ? Math.min(face.sx * 1.05, 7) : .06,
				sy: .62,
				sz: face.sz > face.sx ? Math.min(face.sz * 1.05, 7) : .06,
				color: (i + 1) % NEON.length
			});
		});
		return out;
	}, [world]);
	const lampDress = (0, import_react.useMemo)(() => {
		return world.lamps.map((l) => {
			let bestX = Infinity;
			let lineX = l.x;
			for (const line of world.linesX) {
				const d = Math.abs(l.x - line);
				if (d < bestX) {
					bestX = d;
					lineX = line;
				}
			}
			let bestZ = Infinity;
			let lineZ = l.z;
			for (const line of world.linesZ) {
				const d = Math.abs(l.z - line);
				if (d < bestZ) {
					bestZ = d;
					lineZ = line;
				}
			}
			if (bestX <= bestZ) return {
				x: l.x,
				z: l.z,
				axis: "z",
				toward: l.x >= lineX ? -1 : 1
			};
			return {
				x: l.x,
				z: l.z,
				axis: "x",
				toward: l.z >= lineZ ? -1 : 1
			};
		});
	}, [world]);
	const crowns = (0, import_react.useMemo)(() => world.buildings.filter((b) => b.h > 18), [world]);
	(0, import_react.useLayoutEffect)(() => {
		const q = new Quaternion();
		const padQ = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
		const up = new Vector3(0, 1, 0);
		if (buildingRef.current) paint(buildingRef.current, { apply: (m, c, i) => {
			const b = world.buildings[i];
			m.compose(new Vector3(b.x, b.h / 2, b.z), q, new Vector3(b.hw * 2, b.h, b.hd * 2));
			c.set(NIGHT[b.facade % NIGHT.length] ?? "#232b3a");
		} });
		if (capRef.current) paint(capRef.current, { apply: (m, c, i) => {
			const b = world.buildings[i];
			m.compose(new Vector3(b.x, b.h + .12, b.z), q, new Vector3(b.hw * 2.04, .22, b.hd * 2.04));
			c.set(b.landable ? "#8e97a6" : "#12161e");
		} });
		if (padRef.current) paint(padRef.current, { apply: (m, c, i) => {
			const b = landable[i];
			const r = Math.min(b.hw, b.hd) * .42;
			m.compose(new Vector3(b.x, b.h + .28, b.z), padQ, new Vector3(r, r, r));
			c.set("#9adfff");
		} });
		if (beaconRef.current) paint(beaconRef.current, { apply: (m, c, i) => {
			const b = towers[i];
			m.compose(new Vector3(b.x, b.h + 1.1, b.z), q, new Vector3(.12, 1.6, .12));
			c.set("#ff3355");
		} });
		const placeWin = (mesh, list, thin) => {
			if (!mesh) return;
			paint(mesh, { apply: (m, c, i) => {
				const w = list[i];
				const sx = thin === "x" ? .85 : .06;
				const sz = thin === "z" ? .85 : .06;
				m.compose(new Vector3(w.x, w.y, w.z), q, new Vector3(sx, .7, sz));
				c.set(w.warm ? "#ffb067" : "#9ee7ff");
			} });
		};
		placeWin(winX.current, winAlongX, "x");
		placeWin(winZ.current, winAlongZ, "z");
		if (treeRef.current) paint(treeRef.current, { apply: (m, c, i) => {
			const t = world.trees[i];
			m.compose(new Vector3(t.x, 1.5 * t.s, t.z), q, new Vector3(t.s, t.s, t.s));
			c.set(i % 2 === 0 ? "#1c4a40" : "#234f46");
		} });
		if (trunkRef.current) paint(trunkRef.current, { apply: (m, c, i) => {
			const t = world.trees[i];
			m.compose(new Vector3(t.x, .45 * t.s, t.z), q, new Vector3(.18 * t.s, .9 * t.s, .18 * t.s));
			c.set("#4a3428");
		} });
		if (lampRef.current) paint(lampRef.current, { apply: (m, c, i) => {
			const l = lampDress[i];
			m.compose(new Vector3(l.x, 1.6, l.z), q, new Vector3(.08, 3.2, .08));
			c.set("#c5ceda");
		} });
		if (bulbRef.current) paint(bulbRef.current, { apply: (m, c, i) => {
			const l = lampDress[i];
			const reach = 2.05;
			const bx = l.axis === "z" ? l.x + l.toward * reach : l.x;
			const bz = l.axis === "x" ? l.z + l.toward * reach : l.z;
			m.compose(new Vector3(bx, 3.2, bz), q, new Vector3(1.2, .45, 1.2));
			c.set("#fff1c9");
		} });
		if (barRef.current) paint(barRef.current, { apply: (m, c, i) => {
			const l = lampDress[i];
			const along = 2.2;
			if (l.axis === "z") m.compose(new Vector3(l.x + l.toward * along * .5, 3.22, l.z), q, new Vector3(along, .07, .07));
			else m.compose(new Vector3(l.x, 3.22, l.z + l.toward * along * .5), q, new Vector3(.07, .07, along));
			c.set("#d5dde8");
		} });
		if (poolRef.current) paint(poolRef.current, { apply: (m, c, i) => {
			const l = lampDress[i];
			const reach = 2.05;
			const bx = l.axis === "z" ? l.x + l.toward * reach : l.x;
			const bz = l.axis === "x" ? l.z + l.toward * reach : l.z;
			m.compose(new Vector3(bx, .05, bz), padQ, new Vector3(3.4, 3.4, 1));
			c.set("#ffe0a8");
		} });
		if (dashRef.current) paint(dashRef.current, { apply: (m, c, i) => {
			const d = dashes[i];
			q.setFromAxisAngle(up, d.rot);
			m.compose(new Vector3(d.x, .05, d.z), q, new Vector3(d.sx, 1, d.sz));
			c.set("#f4f1ea");
			q.identity();
		} });
		if (arrowRef.current) paint(arrowRef.current, { apply: (m, c, i) => {
			const a = arrows[i];
			q.setFromAxisAngle(up, a.yaw);
			m.compose(new Vector3(a.x, .07, a.z), q, new Vector3(1.4, 1, 1.4));
			c.set("#f6f1e4");
			q.identity();
		} });
		if (plazaRef.current) paint(plazaRef.current, { apply: (m, c, i) => {
			const p = plazas[i];
			m.compose(new Vector3(p.x, .012, p.z), q, new Vector3(p.sx, 1, p.sz));
			c.set("#10141c");
		} });
		if (curbRef.current) paint(curbRef.current, { apply: (m, c, i) => {
			const curb = curbs[i];
			m.compose(new Vector3(curb.x, curb.y, curb.z), q, new Vector3(curb.sx, curb.sy, curb.sz));
			c.set(curb.shade === 0 ? "#2a3140" : curb.shade === 1 ? "#c5ced8" : "#f4f1ea");
		} });
		if (neonRef.current) {
			paint(neonRef.current, { apply: (m, c, i) => {
				const n = neons[i];
				m.compose(new Vector3(n.x, n.y, n.z), q, new Vector3(n.sx, n.sy, n.sz));
				c.set(NEON[n.color] ?? "#ff2d55");
			} });
			const mat = neonRef.current.material;
			if (!Array.isArray(mat) && mat instanceof MeshBasicMaterial) {
				mat.color.setRGB(2.6, 2.6, 2.6);
				mat.toneMapped = false;
			}
		}
		if (podiumRef.current) paint(podiumRef.current, { apply: (m, c, i) => {
			const b = world.buildings[i];
			const ph = Math.min(2.15, b.h * .32);
			m.compose(new Vector3(b.x, ph / 2, b.z), q, new Vector3(b.hw * 2.16, ph, b.hd * 2.16));
			c.set("#0d1118");
		} });
		if (crownRef.current) paint(crownRef.current, { apply: (m, c, i) => {
			const b = crowns[i];
			m.compose(new Vector3(b.x, b.h + .85, b.z), q, new Vector3(b.hw * 1.05, 1.35, b.hd * 1.05));
			c.set("#8eb6d8");
		} });
		const boostWin = (mesh) => {
			if (!mesh) return;
			const mat = mesh.material;
			if (!Array.isArray(mat) && mat instanceof MeshBasicMaterial) {
				mat.color.setRGB(1.85, 1.85, 1.85);
				mat.toneMapped = false;
			}
		};
		boostWin(winX.current);
		boostWin(winZ.current);
	}, [
		arrows,
		crowns,
		curbs,
		dashes,
		lampDress,
		landable,
		neons,
		plazas,
		towers,
		winAlongX,
		winAlongZ,
		world
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioEnv, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("color", {
			attach: "background",
			args: ["#070910"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("fog", {
			attach: "fog",
			args: [
				"#0b1018",
				78,
				190
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("hemisphereLight", { args: [
			"#c5d2ea",
			"#1a0c10",
			.62
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
			position: [
				18,
				36,
				14
			],
			intensity: .72,
			color: "#d5dbe8"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
			position: [
				-26,
				14,
				-10
			],
			intensity: .55,
			color: "#ff3355"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
			position: [
				5.5,
				9,
				7
			],
			angle: .62,
			penumbra: .72,
			intensity: 70,
			distance: 32,
			color: "#fff8f2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
			position: [
				-7,
				4.2,
				-8
			],
			angle: .7,
			penumbra: .8,
			intensity: 36,
			distance: 26,
			color: "#ff2244"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			scale: [
				720,
				720,
				720
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
				1,
				28,
				18
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("shaderMaterial", {
				side: 1,
				depthWrite: false,
				vertexShader: skyVert,
				fragmentShader: skyFrag
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				0,
				0
			],
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [world.bounds * 2 + 180, world.bounds * 2 + 180] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#0c1016",
				roughness: .95,
				metalness: .04
			})]
		}),
		plazas.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: plazaRef,
			args: [
				void 0,
				void 0,
				plazas.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				.04,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#141820",
				roughness: .88,
				metalness: .08
			})]
		}),
		world.linesZ.map((z) => {
			const x0 = world.linesX[0] - 56;
			const x1 = world.linesX[world.linesX.length - 1] + 56;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					-Math.PI / 2,
					0,
					0
				],
				position: [
					(x0 + x1) / 2,
					.03,
					z
				],
				receiveShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [x1 - x0, world.road] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#10141c",
					map: asphalt ?? void 0,
					roughness: .28,
					metalness: .62,
					envMapIntensity: 1.15
				})]
			}, `rz${z}`);
		}),
		world.linesX.map((x) => {
			const z0 = world.linesZ[0] - 56;
			const z1 = world.linesZ[world.linesZ.length - 1] + 56;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					-Math.PI / 2,
					0,
					Math.PI / 2
				],
				position: [
					x,
					.034,
					(z0 + z1) / 2
				],
				receiveShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [z1 - z0, world.road] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#10141c",
					map: asphalt ?? void 0,
					roughness: .28,
					metalness: .62,
					envMapIntensity: 1.15
				})]
			}, `rx${x}`);
		}),
		dashes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: dashRef,
			args: [
				void 0,
				void 0,
				dashes.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				.03,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#f4f1ea",
				roughness: .4,
				metalness: .08,
				emissive: "#f4f1ea",
				emissiveIntensity: .22
			})]
		}),
		arrows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("instancedMesh", {
			frustumCulled: false,
			ref: arrowRef,
			args: [
				arrowGeo,
				void 0,
				arrows.length
			],
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#f6f1e4",
				roughness: .4,
				metalness: .04,
				emissive: "#f7f3e8",
				emissiveIntensity: .55
			})
		}),
		curbs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: curbRef,
			args: [
				void 0,
				void 0,
				curbs.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				roughness: .82,
				metalness: .08
			})]
		}),
		neons.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: neonRef,
			args: [
				void 0,
				void 0,
				neons.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", { toneMapped: false })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: podiumRef,
			args: [
				void 0,
				void 0,
				world.buildings.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#0d1118",
				roughness: .7,
				metalness: .2
			})]
		}),
		crowns.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: crownRef,
			args: [
				void 0,
				void 0,
				crowns.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#8eb6d8",
				roughness: .12,
				metalness: .82,
				emissive: "#1a3a55",
				emissiveIntensity: .35
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: buildingRef,
			args: [
				void 0,
				void 0,
				world.buildings.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				map: grain ?? void 0,
				roughness: .72,
				metalness: .16,
				envMapIntensity: .45
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: capRef,
			args: [
				void 0,
				void 0,
				world.buildings.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				roughness: .4,
				metalness: .55
			})]
		}),
		landable.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: padRef,
			args: [
				void 0,
				void 0,
				landable.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
				1,
				.08,
				8,
				28
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#9adfff",
				emissive: "#49d6ff",
				emissiveIntensity: 1.4,
				roughness: .25,
				metalness: .4
			})]
		}),
		towers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: beaconRef,
			args: [
				void 0,
				void 0,
				towers.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#ff3355",
				emissive: "#ff2244",
				emissiveIntensity: 4,
				toneMapped: false
			})]
		}),
		winAlongX.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: winX,
			args: [
				void 0,
				void 0,
				winAlongX.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {})]
		}),
		winAlongZ.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: winZ,
			args: [
				void 0,
				void 0,
				winAlongZ.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1,
				1,
				1
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {})]
		}),
		world.trees.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: trunkRef,
			args: [
				void 0,
				void 0,
				world.trees.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				1,
				1,
				1,
				6
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { roughness: .9 })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
			frustumCulled: false,
			ref: treeRef,
			args: [
				void 0,
				void 0,
				world.trees.length
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
				.85,
				10,
				8
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { roughness: .8 })]
		})] }),
		world.lamps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
				frustumCulled: false,
				ref: lampRef,
				args: [
					void 0,
					void 0,
					world.lamps.length
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					1,
					1,
					1,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					metalness: .7,
					roughness: .3
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
				frustumCulled: false,
				ref: bulbRef,
				args: [
					void 0,
					void 0,
					world.lamps.length
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.16,
					10,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#fff1c9",
					emissive: "#fff1c9",
					emissiveIntensity: 4.2,
					toneMapped: false
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
				frustumCulled: false,
				ref: barRef,
				args: [
					void 0,
					void 0,
					world.lamps.length
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1,
					1,
					1
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#d5dde8",
					metalness: .82,
					roughness: .24
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
				frustumCulled: false,
				ref: poolRef,
				args: [
					void 0,
					void 0,
					world.lamps.length
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circleGeometry", { args: [1, 18] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffe0a8",
					transparent: true,
					opacity: .22,
					depthWrite: false,
					blending: 2
				})]
			})
		] }),
		world.pads.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				p.x,
				.08,
				p.z
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				p.hw * 2,
				.08,
				p.hd * 2
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#141820",
				emissive: "#ff3355",
				emissiveIntensity: .55,
				roughness: .35,
				metalness: .4
			})]
		}, i)),
		[
			0,
			1,
			2
		].map((i) => {
			const ox = [
				-18,
				22,
				-8
			][i];
			const oz = [
				-14,
				16,
				28
			][i];
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					world.focus.x + ox,
					22,
					world.focus.z + oz
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					1.4,
					6.5,
					44,
					10,
					1,
					true
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					color: i === 1 ? "#ff2244" : "#d7e7ff",
					transparent: true,
					opacity: .035,
					depthWrite: false,
					side: 2,
					blending: 2
				})]
			}, `beam${i}`);
		}),
		world.linesX.filter((n) => Math.abs(n - world.focus.x) > 10 && Math.abs(n - world.focus.x) < 70).slice(0, 1).map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			position: [
				line,
				0,
				world.focus.z
			],
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						5.15,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						12.8,
						.26,
						.32
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#1a2030",
						metalness: .78,
						roughness: .28
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						5.16,
						.18
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						7.2,
						.08,
						.04
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#ff3355",
						emissive: "#ff2244",
						emissiveIntensity: 5,
						toneMapped: false
					})]
				}),
				[-6.35, 6.35].map((px) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						px,
						2.55,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						.24,
						5.1,
						.24
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#9aa3b2",
						metalness: .8,
						roughness: .28
					})]
				}, px))
			]
		}, `gatex${line}`)),
		world.linesZ.filter((n) => Math.abs(n - world.focus.z) > 10 && Math.abs(n - world.focus.z) < 70).slice(0, 1).map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			position: [
				world.focus.x,
				0,
				line
			],
			rotation: [
				0,
				Math.PI / 2,
				0
			],
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						5.15,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						12.8,
						.26,
						.32
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#1a2030",
						metalness: .78,
						roughness: .28
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						5.16,
						.18
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						7.2,
						.08,
						.04
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#ff3355",
						emissive: "#ff2244",
						emissiveIntensity: 5,
						toneMapped: false
					})]
				}),
				[-6.35, 6.35].map((px) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						px,
						2.55,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						.24,
						5.1,
						.24
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#9aa3b2",
						metalness: .8,
						roughness: .28
					})]
				}, px))
			]
		}, `gatez${line}`))
	] });
}
/** Hard-edged loft. Ring is +X profile from belly center up to roof center. */
function loftGeometry(stations) {
	const count = stations[0].pts.length;
	const rings = stations.map((s) => {
		if (s.pts.length !== count) throw new Error("loft stations must share a point count");
		const ring = [];
		for (const [x, y] of s.pts) ring.push(new Vector3(x, y, s.z));
		for (let i = count - 2; i >= 1; i--) {
			const [x, y] = s.pts[i];
			ring.push(new Vector3(-x, y, s.z));
		}
		return ring;
	});
	const n = rings[0].length;
	const positions = [];
	const indices = [];
	const add = (v) => {
		positions.push(v.x, v.y, v.z);
		return positions.length / 3 - 1;
	};
	for (let s = 0; s < rings.length - 1; s++) {
		const a = rings[s];
		const b = rings[s + 1];
		for (let i = 0; i < n; i++) {
			const i2 = (i + 1) % n;
			const ia = add(a[i]);
			const ib = add(a[i2]);
			const ic = add(b[i2]);
			const id = add(b[i]);
			indices.push(ia, ib, id, ib, ic, id);
		}
	}
	const cap = (ring, flip) => {
		let cy = 0;
		for (const v of ring) cy += v.y;
		cy /= ring.length;
		const center = add(new Vector3(0, cy, ring[0].z));
		for (let i = 0; i < n; i++) {
			const i2 = (i + 1) % n;
			const ia = add(ring[i]);
			const ib = add(ring[i2]);
			if (flip) indices.push(center, ib, ia);
			else indices.push(center, ia, ib);
		}
	};
	cap(rings[0], true);
	cap(rings[rings.length - 1], false);
	const geo = new BufferGeometry();
	geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
	geo.setIndex(indices);
	geo.computeVertexNormals();
	return geo;
}
var bodyGeo = loftGeometry([
	{
		z: 1.74,
		pts: [
			[0, .08],
			[.16, .07],
			[.3, .1],
			[.36, .16],
			[.32, .22],
			[.18, .26],
			[.08, .28],
			[0, .29]
		]
	},
	{
		z: 1.5,
		pts: [
			[0, 0],
			[.34, -.01],
			[.56, .04],
			[.66, .14],
			[.6, .24],
			[.36, .3],
			[.14, .33],
			[0, .34]
		]
	},
	{
		z: 1.24,
		pts: [
			[0, -.02],
			[.4, -.01],
			[.68, .06],
			[.8, .18],
			[.74, .3],
			[.44, .36],
			[.16, .39],
			[0, .4]
		]
	},
	{
		z: 1.02,
		pts: [
			[0, .1],
			[.32, .14],
			[.56, .24],
			[.8, .34],
			[.78, .4],
			[.48, .42],
			[.16, .44],
			[0, .45]
		]
	},
	{
		z: .76,
		pts: [
			[0, 0],
			[.42, .02],
			[.72, .1],
			[.86, .22],
			[.82, .34],
			[.5, .42],
			[.18, .48],
			[0, .5]
		]
	},
	{
		z: .42,
		pts: [
			[0, -.04],
			[.48, -.04],
			[.76, .06],
			[.88, .2],
			[.86, .36],
			[.56, .46],
			[.2, .52],
			[0, .54]
		]
	},
	{
		z: .05,
		pts: [
			[0, -.04],
			[.5, -.05],
			[.78, .06],
			[.9, .24],
			[.88, .4],
			[.58, .5],
			[.22, .56],
			[0, .58]
		]
	},
	{
		z: -.32,
		pts: [
			[0, -.03],
			[.52, -.05],
			[.8, .08],
			[.92, .28],
			[.9, .46],
			[.6, .56],
			[.22, .62],
			[0, .64]
		]
	},
	{
		z: -.66,
		pts: [
			[0, -.02],
			[.5, -.02],
			[.76, .12],
			[.92, .34],
			[.92, .52],
			[.62, .64],
			[.24, .7],
			[0, .72]
		]
	},
	{
		z: -.96,
		pts: [
			[0, .08],
			[.34, .12],
			[.6, .26],
			[.88, .42],
			[.92, .58],
			[.62, .7],
			[.24, .76],
			[0, .78]
		]
	},
	{
		z: -1.24,
		pts: [
			[0, .02],
			[.46, .02],
			[.72, .16],
			[.9, .38],
			[.92, .58],
			[.6, .72],
			[.22, .78],
			[0, .8]
		]
	},
	{
		z: -1.5,
		pts: [
			[0, .06],
			[.42, .06],
			[.68, .2],
			[.84, .4],
			[.84, .58],
			[.52, .7],
			[.18, .76],
			[0, .78]
		]
	},
	{
		z: -1.66,
		pts: [
			[0, .1],
			[.36, .1],
			[.58, .22],
			[.74, .4],
			[.72, .56],
			[.42, .66],
			[.14, .7],
			[0, .72]
		]
	}
]);
var NOZZLE_X = [
	-.46,
	-.17,
	.17,
	.46
];
var WHEEL_X = .8;
var WHEEL_Y = -.21;
var WHEEL_Z_FRONT = 1.02;
var WHEEL_Z_REAR = -1.08;
var WHEEL_SPOTS = [
	[
		WHEEL_X,
		WHEEL_Y,
		WHEEL_Z_FRONT
	],
	[
		-WHEEL_X,
		WHEEL_Y,
		WHEEL_Z_FRONT
	],
	[
		WHEEL_X,
		WHEEL_Y,
		WHEEL_Z_REAR
	],
	[
		-WHEEL_X,
		WHEEL_Y,
		WHEEL_Z_REAR
	]
];
var LIFT_SPOTS = [
	[
		.55,
		-.18,
		.72
	],
	[
		-.55,
		-.18,
		.72
	],
	[
		.62,
		-.16,
		-.55
	],
	[
		-.62,
		-.16,
		-.55
	]
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
	const tex = new CanvasTexture(canvas);
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 4;
	return tex;
}
function Wheel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				0,
				0,
				Math.PI / 2
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.34,
				.34,
				.26,
				28
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#12141a",
				roughness: .86,
				metalness: .05
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				0,
				0,
				Math.PI / 2
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.27,
				.27,
				.28,
				24
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#c5ccd6",
				metalness: .92,
				roughness: .22
			})]
		}),
		Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
			rotation: [
				i * Math.PI * 2 / 5,
				0,
				0
			],
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.03,
					.145,
					0
				],
				rotation: [
					.55,
					.35,
					0
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.045,
					.22,
					.07
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#d5dbe3",
					metalness: .95,
					roughness: .18
				})]
			})
		}, i)),
		[-1, 1].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				s * .13,
				0,
				0
			],
			rotation: [
				0,
				0,
				Math.PI / 2
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.075,
				.075,
				.03,
				14
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#0e1014",
				metalness: .8,
				roughness: .28
			})]
		}, s))
	] });
}
var vaporTex = null;
function vaporTexture() {
	if (vaporTex) return vaporTex;
	const canvas = document.createElement("canvas");
	canvas.width = 64;
	canvas.height = 64;
	const g = canvas.getContext("2d");
	if (!g) return null;
	const grd = g.createRadialGradient(32, 32, 0, 32, 32, 31);
	grd.addColorStop(0, "rgba(255,255,255,0.75)");
	grd.addColorStop(.2, "rgba(206,220,232,0.38)");
	grd.addColorStop(.5, "rgba(160,178,196,0.1)");
	grd.addColorStop(1, "rgba(160,178,196,0)");
	g.fillStyle = grd;
	g.fillRect(0, 0, 64, 64);
	const tex = new CanvasTexture(canvas);
	tex.colorSpace = SRGBColorSpace;
	vaporTex = tex;
	return tex;
}
var PUFFS = 14;
function Jet({ position, axis = "back", setRef }) {
	const tex = (0, import_react.useMemo)(() => vaporTexture(), []);
	const mats = (0, import_react.useMemo)(() => Array.from({ length: PUFFS }, () => new SpriteMaterial({
		map: tex ?? void 0,
		transparent: true,
		opacity: 0,
		depthWrite: false,
		toneMapped: true,
		color: axis === "down" ? "#d5e0ea" : "#eef3f8"
	})), [axis, tex]);
	const group = (0, import_react.useRef)(null);
	const seeds = (0, import_react.useMemo)(() => Array.from({ length: PUFFS }, (_, i) => ({
		phase: (i + .15) / PUFFS,
		spin: i * 1.63,
		lean: (i % 5 - 2) * .42
	})), []);
	useFrame(({ clock }) => {
		const g = group.current;
		if (!g || !g.visible) return;
		const t = clock.elapsedTime;
		const down = axis === "down";
		const side = axis === "left" ? -1 : axis === "right" ? 1 : 0;
		const speed = down ? 3.4 : side ? 4.6 : 5.2;
		const reach = down ? .78 : side ? 1.2 : 1.62;
		for (let i = 0; i < PUFFS; i++) {
			const s = seeds[i];
			const life = (s.phase + t * speed) % 1;
			const fade = Math.sin(life * Math.PI);
			const spread = life * life * (down ? .32 : .4);
			const wobA = Math.sin(t * 13 + s.spin) * spread + s.lean * life * .09;
			const wobB = Math.cos(t * 10.5 + s.spin * 1.4) * spread * .85;
			const along = .04 + life * reach;
			const sprite = g.children[i];
			if (!sprite) continue;
			if (down) sprite.position.set(wobA, -along, wobB);
			else if (side) sprite.position.set(side * along, wobB * .35, wobA * .45);
			else sprite.position.set(wobA, wobB * .55, -along);
			const sc = .06 + life * (down ? .32 : side ? .4 : .5);
			sprite.scale.set(sc * (.62 + life * .7), sc, 1);
			const mat = mats[i];
			mat.opacity = fade * fade * (down ? .42 : side ? .66 : .7);
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
		ref: (node) => {
			group.current = node;
			setRef(node);
		},
		position,
		visible: false,
		children: mats.map((mat, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sprite", {
			material: mat,
			renderOrder: 3
		}, i))
	});
}
function Roadster({ color, hero, wingRef, rearRefs, liftRefs, sideRefs, dustRef, tailRef }) {
	const plate = (0, import_react.useMemo)(() => hero ? plateTexture() : null, [hero]);
	const paint = (0, import_react.useMemo)(() => new MeshPhysicalMaterial({
		color,
		metalness: hero ? .22 : .4,
		roughness: hero ? .1 : .28,
		clearcoat: 1,
		clearcoatRoughness: hero ? .05 : .12,
		envMapIntensity: 1.45
	}), [color, hero]);
	const carbon = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#0c0e12",
		metalness: .72,
		roughness: .34,
		envMapIntensity: .9
	}), []);
	const glass = (0, import_react.useMemo)(() => new MeshPhysicalMaterial({
		color: "#3a2c1c",
		metalness: .88,
		roughness: .06,
		transparent: true,
		opacity: .72,
		side: 2,
		clearcoat: 1,
		clearcoatRoughness: .04,
		envMapIntensity: 1.7
	}), []);
	const gold = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#d4b56a",
		metalness: 1,
		roughness: .2,
		envMapIntensity: 1.3
	}), []);
	const tail = (0, import_react.useMemo)(() => {
		return new MeshStandardMaterial({
			color: "#ff1a2e",
			emissive: "#ff1a2e",
			emissiveIntensity: hero ? 7 : 2.2,
			toneMapped: false
		});
	}, [hero]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			geometry: bodyGeo,
			material: paint,
			castShadow: true
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.32,
				-.05
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.95,
				.32,
				1.15
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#07080c",
				roughness: 1
			})]
		}),
		hero && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				-.22,
				.28,
				-.2
			],
			rotation: [
				-.35,
				.05,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.32,
				.2,
				.32
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#efe8dc",
				roughness: .62
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				.22,
				.28,
				.05
			],
			rotation: [
				-.4,
				-.04,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.3,
				.16,
				.28
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#1a1c22",
				roughness: .5,
				metalness: .2
			})]
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				.48,
				.32
			],
			rotation: [
				-1.02,
				0,
				0
			],
			material: glass,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [.92, .52] })
		}),
		[-1, 1].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				s * .9,
				.5,
				-.15
			],
			material: glass,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.02,
				.18,
				.78
			] })
		}, `sg${s}`)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				.68,
				-.98
			],
			rotation: [
				.72,
				0,
				0
			],
			material: glass,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [.72, .28] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				-.08,
				1.58
			],
			material: carbon,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1.35,
				.06,
				.32
			] })
		}),
		[-1, 1].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				s * .78,
				-.06,
				-.05
			],
			material: carbon,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.16,
				.14,
				1.85
			] })
		}, `sk${s}`)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				-.04,
				-1.62
			],
			material: carbon,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1.55,
				.42,
				.55
			] })
		}),
		[
			-.55,
			-.28,
			0,
			.28,
			.55
		].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				x,
				-.12,
				-1.86
			],
			material: carbon,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.04,
				.22,
				.28
			] })
		}, `fin${x}`)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			ref: wingRef,
			position: [
				0,
				.74,
				-1.32
			],
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
					position: [
						0,
						.03,
						-.28
					],
					material: paint,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						1.82,
						.035,
						.46
					] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
					position: [
						0,
						.012,
						-.28
					],
					material: carbon,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						1.7,
						.018,
						.4
					] })
				}),
				[-.9, .9].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
					position: [
						x,
						.08,
						-.28
					],
					material: carbon,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						.028,
						.14,
						.44
					] })
				}, x)),
				[-.42, .42].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
					position: [
						x,
						-.06,
						-.08
					],
					material: carbon,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						.04,
						.12,
						.08
					] })
				}, `st${x}`))
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				.42,
				-1.66
			],
			material: paint,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1.58,
				.62,
				.08
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				.64,
				-1.71
			],
			material: tail,
			ref: (node) => {
				if (tailRef && node) tailRef.current = node.material;
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1.5,
				.04,
				.025
			] })
		}),
		hero && plate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.42,
				-1.76
			],
			rotation: [
				0,
				Math.PI,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [.36, .16] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				map: plate,
				roughness: .45,
				metalness: .15
			})]
		}),
		NOZZLE_X.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			position: [
				x,
				0,
				-1.82
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				rotation: [
					Math.PI / 2,
					0,
					0
				],
				material: gold,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
					.09,
					.014,
					8,
					18
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					0,
					.05
				],
				rotation: [
					Math.PI / 2,
					0,
					0
				],
				material: carbon,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.055,
					.075,
					.14,
					14
				] })
			})]
		}, `n${x}`)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.14,
				1.735
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				1.05,
				.028,
				.02
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#fff6e4",
				emissive: "#fff6e4",
				emissiveIntensity: hero ? 5 : 1.4,
				toneMapped: false
			})]
		}),
		[-.62, .62].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				x,
				.2,
				1.7
			],
			rotation: [
				0,
				x > 0 ? .5 : -.5,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.16,
				.03,
				.02
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#fff6e4",
				emissive: "#fff1cc",
				emissiveIntensity: hero ? 3.5 : 1,
				toneMapped: false
			})]
		}, `hl${x}`)),
		[-1, 1].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				s * .9,
				.42,
				.32
			],
			material: carbon,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.14,
				.05,
				.1
			] })
		}, `mir${s}`)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			position: [
				0,
				.36,
				.85
			],
			material: carbon,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.04,
				.015,
				.7
			] })
		}),
		hero && NOZZLE_X.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Jet, {
			position: [
				x,
				.02,
				-1.88
			],
			setRef: (node) => {
				if (rearRefs) rearRefs.current[i] = node;
			}
		}, `p${x}`)),
		hero && LIFT_SPOTS.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Jet, {
			position: p,
			axis: "down",
			setRef: (node) => {
				if (liftRefs) liftRefs.current[i] = node;
			}
		}, `l${i}`)),
		hero && [-1, 1].map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Jet, {
			position: [
				s * 1.02,
				.08,
				.15
			],
			axis: s < 0 ? "left" : "right",
			setRef: (node) => {
				if (sideRefs) sideRefs.current[i] = node;
			}
		}, `side${s}`)),
		[-1, 1].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			position: [
				s * .98,
				.08,
				.15
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				material: gold,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
					.07,
					.012,
					8,
					16
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				material: carbon,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.04,
					.055,
					.1,
					12
				] })
			})]
		}, `sj${s}`)),
		hero && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			ref: dustRef,
			position: [
				0,
				-.53,
				0
			],
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			visible: false,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ringGeometry", { args: [
				.45,
				1.45,
				24
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
				color: "#e7eef6",
				transparent: true,
				opacity: .4,
				depthWrite: false,
				side: 2
			})]
		}),
		hero && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Headlights, {})
	] });
}
function Headlights() {
	const left = (0, import_react.useRef)(null);
	const right = (0, import_react.useRef)(null);
	const leftTarget = (0, import_react.useRef)(null);
	const rightTarget = (0, import_react.useRef)(null);
	(0, import_react.useLayoutEffect)(() => {
		if (left.current && leftTarget.current) left.current.target = leftTarget.current;
		if (right.current && rightTarget.current) right.current.target = rightTarget.current;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
			ref: left,
			position: [
				.32,
				.16,
				1.72
			],
			angle: .46,
			penumbra: .62,
			intensity: 40,
			distance: 38,
			color: "#fff4e2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
			ref: right,
			position: [
				-.32,
				.16,
				1.72
			],
			angle: .46,
			penumbra: .62,
			intensity: 40,
			distance: 38,
			color: "#fff4e2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("object3D", {
			ref: leftTarget,
			position: [
				.45,
				-.35,
				16
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("object3D", {
			ref: rightTarget,
			position: [
				-.45,
				-.35,
				16
			]
		})
	] });
}
function PlayerCar({ api }) {
	const group = (0, import_react.useRef)(null);
	const squash = (0, import_react.useRef)(null);
	const wheels = (0, import_react.useRef)([
		null,
		null,
		null,
		null
	]);
	const wing = (0, import_react.useRef)(null);
	const rear = (0, import_react.useRef)([
		null,
		null,
		null,
		null
	]);
	const lift = (0, import_react.useRef)([
		null,
		null,
		null,
		null
	]);
	const side = (0, import_react.useRef)([null, null]);
	const dust = (0, import_react.useRef)(null);
	const tail = (0, import_react.useRef)(null);
	const jetLight = (0, import_react.useRef)(null);
	const spin = (0, import_react.useRef)(0);
	const thrust = (0, import_react.useRef)(0);
	const sideAmt = (0, import_react.useRef)([0, 0]);
	const wingAngle = (0, import_react.useRef)(-.16);
	useFrame((_, dt) => {
		const c = api.current.car;
		const g = group.current;
		if (!g) return;
		g.position.set(c.x, c.y, c.z);
		g.rotation.order = "YXZ";
		g.rotation.y = c.yaw + Math.PI;
		g.rotation.x = Math.max(-.28, Math.min(.22, -c.vy * .035));
		g.rotation.z = c.roll;
		const pulse = api.current.landPulse;
		const sy = 1 - pulse * .08;
		squash.current?.scale.set(1 + pulse * .04, sy, 1 + pulse * .04);
		spin.current += c.speed * dt * 2.6;
		for (const w of wheels.current) if (w) w.rotation.x = spin.current;
		const target = c.thrusting ? 1 : 0;
		thrust.current = MathUtils.damp(thrust.current, target, 12, dt);
		const tAmt = thrust.current;
		const wantWing = c.thrusting || !c.grounded || Math.abs(c.speed) > 18 ? -.62 : -.14;
		wingAngle.current = MathUtils.damp(wingAngle.current, wantWing, 6, dt);
		if (wing.current) wing.current.rotation.x = wingAngle.current;
		const now = performance.now() * .001;
		rear.current.forEach((node) => {
			if (!node) return;
			node.visible = tAmt > .08;
			const flick = .94 + Math.sin(now * 22) * .06;
			const s = (.78 + tAmt * .7) * flick;
			node.scale.setScalar(s);
		});
		const liftAmt = tAmt * (c.grounded ? .45 : 1);
		lift.current.forEach((node, i) => {
			if (!node) return;
			node.visible = liftAmt > .08;
			const flick = .92 + Math.sin(now * 19 + i) * .06;
			const s = (.7 + liftAmt * .55) * flick;
			node.scale.setScalar(s);
		});
		const sideOn = [c.jetL ? 1 : 0, c.jetR ? 1 : 0];
		side.current.forEach((node, i) => {
			if (!node) return;
			const amt = sideAmt.current[i] = MathUtils.damp(sideAmt.current[i] ?? 0, sideOn[i] ?? 0, 14, dt);
			node.visible = amt > .05;
			const flick = .92 + Math.sin(now * 26 + i) * .08;
			node.scale.setScalar((.72 + amt * .7) * flick);
		});
		if (dust.current) {
			const show = tAmt > .2 && c.y < 1.95;
			dust.current.visible = show;
			const s = .7 + tAmt * (.6 + Math.sin(now * 20) * .08);
			dust.current.scale.set(s, s, 1);
			const mat = dust.current.material;
			mat.opacity = show ? .22 + tAmt * .25 : 0;
		}
		if (tail.current) tail.current.emissiveIntensity = c.thrusting ? 11 : 6.5;
		if (jetLight.current) jetLight.current.intensity = tAmt * .55;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		ref: group,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			ref: squash,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Roadster, {
				color: "#f7f6f2",
				hero: true,
				wingRef: wing,
				rearRefs: rear,
				liftRefs: lift,
				sideRefs: side,
				dustRef: dust,
				tailRef: tail
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pointLight", {
				ref: jetLight,
				position: [
					0,
					.12,
					-1.55
				],
				intensity: 0,
				distance: 2.4,
				color: "#c9d6e4"
			})]
		}), WHEEL_SPOTS.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
			position: p,
			ref: (node) => {
				wheels.current[i] = node;
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, {})
		}, i))]
	});
}
var PALETTE = [
	"#1b1f27",
	"#c5c8ce",
	"#8e1e2c",
	"#d9d3c7",
	"#1d3d5c",
	"#3c3f46"
];
function box(sx, sy, sz, x, y, z) {
	const geo = new BoxGeometry(sx, sy, sz);
	geo.translate(x, y, z);
	return geo;
}
function mergeGeos(geos) {
	let verts = 0;
	let indices = 0;
	for (const g of geos) {
		verts += g.attributes.position.count;
		indices += g.index?.count ?? 0;
	}
	const pos = new Float32Array(verts * 3);
	const idx = new Uint32Array(indices);
	let v = 0;
	let i = 0;
	for (const g of geos) {
		pos.set(g.attributes.position.array, v * 3);
		const index = g.index;
		for (let k = 0; k < index.count; k++) idx[i++] = index.getX(k) + v;
		v += g.attributes.position.count;
		g.dispose();
	}
	const geo = new BufferGeometry();
	geo.setAttribute("position", new BufferAttribute(pos, 3));
	geo.setIndex(new BufferAttribute(idx, 1));
	geo.computeVertexNormals();
	return geo;
}
function sedanGeometry() {
	return mergeGeos([
		box(1.62, .36, 3.15, 0, .4, .05),
		box(1.42, .28, 1.25, 0, .68, -.15),
		box(1.5, .1, .55, 0, .28, 1.45),
		box(1.48, .16, .4, 0, .32, -1.45),
		box(.28, .46, .46, .72, .24, 1.02),
		box(.28, .46, .46, -.72, .24, 1.02),
		box(.28, .46, .46, .72, .24, -1.05),
		box(.28, .46, .46, -.72, .24, -1.05)
	]);
}
function parkedAlong(world) {
	const out = [];
	let n = 0;
	const fx = world.focus.x;
	const fz = world.focus.z;
	const span = world.bounds;
	const push = (x, z, yaw) => {
		if (out.length > 160) return;
		if (Math.hypot(x - fx, z - fz) < 16) return;
		if (world.linesX.some((line) => Math.abs(x - line) < 2.2) && world.linesZ.some((line) => Math.abs(z - line) < 2.2)) return;
		out.push({
			x,
			z,
			yaw,
			color: n % PALETTE.length
		});
		n += 1;
	};
	for (const x of world.linesX) {
		if (Math.abs(x - fx) > span) continue;
		const yaw = roadDir(x) > 0 ? Math.PI : 0;
		for (let z = fz - span; z < fz + span; z += 64) {
			if ((Math.round(x / 32) + Math.round(z / 64) & 1) !== 0) continue;
			if (world.linesZ.some((line) => Math.abs(z - line) < world.road * .65)) continue;
			push(x + world.road * .5 + 1.15, z, yaw);
			if ((Math.round(z) + Math.round(x)) % 44 !== 0) push(x - world.road * .5 - 1.15, z + 9, yaw);
		}
	}
	for (const z of world.linesZ) {
		if (Math.abs(z - fz) > span) continue;
		const yaw = roadDir(z) > 0 ? -Math.PI / 2 : Math.PI / 2;
		for (let x = fx - span; x < fx + span; x += 64) {
			if ((Math.round(z / 32) + Math.round(x / 64) & 1) !== 0) continue;
			if (world.linesX.some((line) => Math.abs(x - line) < world.road * .65)) continue;
			push(x, z + world.road * .5 + 1.15, yaw);
		}
	}
	return out;
}
var LIGHTS = [
	{
		x: .48,
		y: .38,
		z: 1.52,
		color: "#fff1d2",
		sx: .18,
		sy: .08,
		sz: .06
	},
	{
		x: -.48,
		y: .38,
		z: 1.52,
		color: "#fff1d2",
		sx: .18,
		sy: .08,
		sz: .06
	},
	{
		x: 0,
		y: .5,
		z: -1.58,
		color: "#ff2238",
		sx: 1.2,
		sy: .07,
		sz: .05
	}
];
function TrafficFleet({ api, world }) {
	const bodyRef = (0, import_react.useRef)(null);
	const lightRef = (0, import_react.useRef)(null);
	const geo = (0, import_react.useMemo)(() => sedanGeometry(), []);
	const parked = (0, import_react.useMemo)(() => parkedAlong(world), [world]);
	const dummy = (0, import_react.useMemo)(() => new Object3D(), []);
	const tmp = (0, import_react.useMemo)(() => new Vector3(), []);
	const colors = (0, import_react.useMemo)(() => PALETTE.map((hex) => new Color(hex)), []);
	const lightColors = (0, import_react.useMemo)(() => LIGHTS.map((l) => new Color(l.color)), []);
	const total = world.traffic.length + parked.length;
	(0, import_react.useLayoutEffect)(() => {
		const mesh = bodyRef.current;
		const lights = lightRef.current;
		if (!mesh || !lights) return;
		const paint = (index, x, y, z, yaw, color) => {
			dummy.position.set(x, y, z);
			dummy.rotation.set(0, yaw + Math.PI, 0);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			mesh.setMatrixAt(index, dummy.matrix);
			mesh.setColorAt(index, colors[color % colors.length]);
			for (let k = 0; k < LIGHTS.length; k++) {
				const spec = LIGHTS[k];
				tmp.set(spec.x, spec.y, spec.z).applyQuaternion(dummy.quaternion);
				dummy.position.set(x + tmp.x, y + tmp.y, z + tmp.z);
				dummy.scale.set(spec.sx, spec.sy, spec.sz);
				dummy.updateMatrix();
				lights.setMatrixAt(index * LIGHTS.length + k, dummy.matrix);
				lights.setColorAt(index * LIGHTS.length + k, lightColors[k]);
			}
		};
		const live = api.current.traffic;
		const moving = live.length === world.traffic.length ? live : world.traffic;
		for (let i = 0; i < moving.length; i++) {
			const t = moving[i];
			paint(i, t.x, 0, t.z, t.yaw, t.color);
		}
		parked.forEach((p, i) => paint(world.traffic.length + i, p.x, .14, p.z, p.yaw, p.color));
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		lights.instanceMatrix.needsUpdate = true;
		if (lights.instanceColor) lights.instanceColor.needsUpdate = true;
		const lightMat = lights.material;
		if (!Array.isArray(lightMat) && lightMat instanceof MeshBasicMaterial) {
			lightMat.color.setRGB(3.4, 3.4, 3.4);
			lightMat.toneMapped = false;
		}
	}, [
		api,
		colors,
		dummy,
		lightColors,
		parked,
		tmp,
		world.traffic.length
	]);
	useFrame(() => {
		const mesh = bodyRef.current;
		const lights = lightRef.current;
		if (!mesh || !lights) return;
		const cars = api.current.traffic;
		for (let i = 0; i < cars.length; i++) {
			const t = cars[i];
			dummy.position.set(t.x, 0, t.z);
			dummy.rotation.set(0, t.yaw + Math.PI, 0);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
			for (let k = 0; k < LIGHTS.length; k++) {
				const spec = LIGHTS[k];
				tmp.set(spec.x, spec.y, spec.z).applyQuaternion(dummy.quaternion);
				dummy.position.set(t.x + tmp.x, tmp.y, t.z + tmp.z);
				dummy.scale.set(spec.sx, spec.sy, spec.sz);
				dummy.updateMatrix();
				lights.setMatrixAt(i * LIGHTS.length + k, dummy.matrix);
				dummy.position.set(t.x, 0, t.z);
			}
		}
		mesh.instanceMatrix.needsUpdate = true;
		lights.instanceMatrix.needsUpdate = true;
	});
	if (total === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("instancedMesh", {
		ref: bodyRef,
		args: [
			geo,
			void 0,
			total
		],
		frustumCulled: false,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
			roughness: .42,
			metalness: .55,
			envMapIntensity: .8
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("instancedMesh", {
		ref: lightRef,
		args: [
			void 0,
			void 0,
			total * LIGHTS.length
		],
		frustumCulled: false,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
			1,
			1,
			1
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", { toneMapped: false })]
	})] });
}
var STAR_GOAL = 10;
var AIR_GOAL = 4;
function WorldSim({ api, world, onFrame }) {
	const camera = useThree((s) => s.camera);
	const acc = (0, import_react.useRef)(0);
	const desired = (0, import_react.useRef)(new Vector3());
	const look = (0, import_react.useRef)(new Vector3());
	const shadow = (0, import_react.useRef)(null);
	const reduce = (0, import_react.useRef)(false);
	const seenBoost = (0, import_react.useRef)(false);
	const thudCd = (0, import_react.useRef)(0);
	const hud = (0, import_react.useRef)(0);
	const rollVis = (0, import_react.useRef)(0);
	const lookDir = (0, import_react.useRef)(new Vector3());
	const camRight = (0, import_react.useRef)(new Vector3());
	const camUp = (0, import_react.useRef)(new Vector3(0, 1, 0));
	const worldUp = (0, import_react.useRef)(new Vector3(0, 1, 0));
	(0, import_react.useEffect)(() => {
		reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.__controlsTest = {
			getYaw: () => api.current.car.yaw,
			getSpeed: () => api.current.car.speed,
			getY: () => api.current.car.y,
			getFlight: () => api.current.car.flight,
			getRoll: () => api.current.car.roll,
			setKeys: (codes) => setInjectedKeys(codes),
			setSteer: (v) => setSteerLock(v)
		};
		return () => {
			delete window.__controlsTest;
		};
	}, [api]);
	useFrame((state, delta) => {
		const dt = Math.min(delta, .1);
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
					thudCd.current = .4;
				}
				if (stepped.launched) {
					session.trauma = Math.min(1, session.trauma + .25);
					playBoost();
				}
				if (session.car.boost > .2 && !seenBoost.current) playBoost();
				seenBoost.current = session.car.boost > .2;
				const got = collectPickups(session.car, session.pickups);
				if (got.gained > 0) {
					if (session.comboLeft > 0) session.combo += 1;
					else session.combo = 1;
					session.comboLeft = 2.4;
					session.score += got.gained * session.combo;
					session.stars += got.stars;
					session.toast = got.rings > 0 ? "ring" : "star";
					session.toastT = 1.2;
					session.trauma = Math.min(1, session.trauma + .12);
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
				if (hud.current > .1) {
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
			const ang = reduce.current ? .9 : state.clock.elapsedTime * .12;
			desired.current.set(c.x + Math.sin(ang) * 8.4, 2.05, c.z + Math.cos(ang) * 8.4);
			camera.position.lerp(desired.current, 1 - Math.exp(-2.2 * dt));
			look.current.set(c.x, .32, c.z);
			camera.lookAt(look.current);
		} else {
			const fx = -Math.sin(c.yaw);
			const fz = -Math.cos(c.yaw);
			const dist = 7.6;
			const height = 2.45 + Math.max(0, c.y - .55) * .15;
			desired.current.set(c.x - fx * dist, c.y + height, c.z - fz * dist);
			const k = 1 - Math.exp(-4.2 * dt);
			camera.position.lerp(desired.current, k);
			look.current.set(c.x + fx * 5.2, c.y + .7, c.z + fz * 5.2);
			camera.lookAt(look.current);
			const sh = reduce.current ? 0 : session.trauma * session.trauma;
			if (sh > 0) {
				const t = state.clock.elapsedTime;
				camera.position.x += Math.sin(t * 47) * .28 * sh;
				camera.position.y += Math.cos(t * 39) * .18 * sh;
			}
			const want = 62 + Math.min(16, Math.abs(c.speed) * .32);
			camera.fov += (want - camera.fov) * (1 - Math.exp(-3 * dt));
			camera.updateProjectionMatrix();
		}
		const wrapped = Math.atan2(Math.sin(c.roll), Math.cos(c.roll));
		const follow = playing ? wrapped * .62 : 0;
		rollVis.current = MathUtils.damp(rollVis.current, follow, 5, dt);
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
			const lift = Math.max(0, c.y - .55 - c.supportY);
			const shade = MathUtils.clamp(1 - lift / 14, .12, 1);
			blob.position.set(c.x, c.supportY + .07, c.z);
			blob.scale.setScalar(.85 + shade);
			blob.material.opacity = .38 * shade;
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(City, { world }, `${world.buildings.length}:${world.windows.length}:${world.lamps.length}:${world.linesX.length}:${world.linesZ[0]}:${world.linesX[0]}`),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoonShadow, { api }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerCar, { api }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrafficFleet, {
			api,
			world
		}, `${world.focus.x.toFixed(0)}:${world.focus.z.toFixed(0)}:${world.buildings.length}`),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			ref: shadow,
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				.07,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circleGeometry", { args: [1.15, 20] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
				color: "#05070d",
				transparent: true,
				opacity: .35,
				depthWrite: false
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pickups, { api }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(EffectComposer, {
			enableNormalPass: false,
			multisampling: 0,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bloom, {
					mipmapBlur: true,
					luminanceThreshold: .82,
					luminanceSmoothing: .24,
					intensity: 1.05
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Vignette, {
					eskil: false,
					offset: .28,
					darkness: .46
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToneMapping, { mode: ToneMappingMode.ACES_FILMIC })
			]
		})
	] });
}
function MoonShadow({ api }) {
	const light = (0, import_react.useRef)(null);
	const target = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
		ref: light,
		intensity: 2.05,
		color: "#f4f0e6"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("object3D", { ref: target })] });
}
function Pickups({ api }) {
	const group = (0, import_react.useRef)(null);
	useFrame((state) => {
		const g = group.current;
		if (!g) return;
		const t = state.clock.elapsedTime;
		const list = api.current.pickups;
		for (let i = 0; i < g.children.length; i++) {
			const p = list[i];
			const mesh = g.children[i];
			if (!p || !mesh) continue;
			mesh.visible = !p.taken;
			mesh.position.y = p.y + Math.sin(t * 2.2 + p.id) * .16;
			mesh.rotation.y = t * (p.kind === "ring" ? .7 : 1.5);
		}
	});
	const seeded = api.current.pickups;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
		ref: group,
		children: seeded.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				p.x,
				p.y,
				p.z
			],
			children: [p.kind === "ring" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
				1.55,
				.09,
				8,
				18
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("octahedronGeometry", { args: [.38, 0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
				color: p.kind === "ring" ? "#3ee0ff" : "#ffd56a",
				toneMapped: false
			})]
		}, p.id))
	});
}
var EMPTY = {
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
	goals: {
		stars: false,
		roof: false,
		speed: false,
		air: false
	},
	toast: "",
	maxKmh: 0,
	phase: "menu"
};
function makeSession(world) {
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
		goals: {
			stars: false,
			roof: false,
			speed: false,
			air: false
		}
	};
}
var Stage = (0, import_react.memo)(function Stage({ api, world, onFrame }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Canvas, {
		className: "h-full w-full",
		dpr: [1, 1.5],
		camera: {
			position: [
				11,
				7,
				13
			],
			fov: 62,
			near: .1,
			far: 980
		},
		gl: {
			antialias: true,
			powerPreference: "high-performance",
			toneMapping: 0
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorldSim, {
			api,
			world,
			onFrame
		})
	});
});
function toastLabel(code, lang) {
	const t = copy[lang];
	if (code === "star") return `+ ${t.starToast}`;
	if (code === "ring") return `+ ${t.ringToast}`;
	if (code === "roof") return t.roofToast;
	if (code === "speed") return t.gSpeed;
	if (code === "air") return t.gAir;
	if (code === "stars") return t.gStars;
	return "";
}
function Game() {
	const [world] = (0, import_react.useState)(() => createWorld());
	const api = (0, import_react.useRef)(makeSession(world));
	const onFrame = (0, import_react.useRef)(() => {});
	const [phase, setPhase] = (0, import_react.useState)("menu");
	const [lang, setLang] = (0, import_react.useState)("en");
	const [snap, setSnap] = (0, import_react.useState)(EMPTY);
	const [best, setBest] = (0, import_react.useState)(0);
	const [tick, setTick] = (0, import_react.useState)(0);
	const [muted, setMute] = (0, import_react.useState)(false);
	const [mounted, setMounted] = (0, import_react.useState)(false);
	const t = copy[lang];
	(0, import_react.useEffect)(() => {
		const taken = /* @__PURE__ */ new Set();
		for (const p of api.current.pickups) if (p.taken) taken.add(p.id);
		for (const p of world.pickups) if (taken.has(p.id)) p.taken = true;
		api.current.pickups = world.pickups;
		if (api.current.traffic.length !== world.traffic.length) api.current.traffic = cloneTraffic(world.traffic);
	}, [world]);
	(0, import_react.useEffect)(() => {
		setMounted(true);
		setLang(loadLang());
		const record = loadBest();
		setBest(record);
		api.current.best = Math.max(api.current.best, record);
		return bindInput();
	}, []);
	(0, import_react.useEffect)(() => {
		document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
	}, [lang]);
	(0, import_react.useEffect)(() => {
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
			alt: Math.max(0, c.y - .55),
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
			phase: s.phase
		});
		setTick((n) => n + 1);
		if (s.best > best) {
			setBest(s.best);
			saveBest(s.best);
		}
	};
	onFrame.current = publish;
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
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
	}, [muted]);
	function setRunPhase(next) {
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
			maxSpeed: keep.maxSpeed
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
		api.current.goals = {
			stars: false,
			roof: false,
			speed: false,
			air: false
		};
		api.current.best = record;
		setRunPhase("play");
		setSnap({
			...EMPTY,
			phase: "play"
		});
	}
	function toggleMute() {
		const next = !muted;
		setMute(next);
		setMuted(next);
	}
	(0, import_react.useEffect)(() => {
		if (phase !== "play") {
			touchState.fly = false;
			touchState.drift = false;
			touchState.rollLeft = false;
			touchState.rollRight = false;
			touchState.steer = 0;
			touchState.throttle = 0;
		}
	}, [phase]);
	const rush = phase === "play" ? Math.min(.55, snap.kmh / 420) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0",
				children: mounted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stage, {
					api,
					world,
					onFrame
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rush pointer-events-none absolute inset-0",
				style: { ["--rush"]: String(rush) }
			}),
			phase === "menu" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-end p-3 md:items-center md:p-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "max-h-[92dvh] w-full max-w-md overflow-auto rounded-2xl border border-line border-l-4 border-l-primary bg-surface p-5 md:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-sm tracking-wide text-accent",
							children: t.kicker
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-2 font-display text-5xl leading-none md:text-6xl",
							children: "Mini"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-4xl leading-none text-primary md:text-5xl",
							children: "Roadster"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: t.sub
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-base leading-relaxed",
							children: t.blurb
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 space-y-1.5 text-sm text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-fg",
									children: t.how
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.drive }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.fly }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.roll }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.oneway }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.drift }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.reset }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.pads }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.jump })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-5 h-14 w-full rounded-2xl bg-primary font-display text-xl text-fg",
							onClick: start,
							children: t.go
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangSwitch, {
							lang,
							setLang
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-xs leading-relaxed text-muted",
							children: t.disclaimer
						})
					]
				})
			}),
			phase !== "menu" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute inset-0 z-20 p-3 md:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex max-w-[70%] flex-wrap gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
									done: snap.goals.stars,
									text: `${t.gStars} ${snap.stars}/10`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
									done: snap.goals.roof,
									text: t.gRoof
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
									done: snap.goals.speed,
									text: `${snap.maxKmh}`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
									done: snap.goals.air,
									text: `${snap.airtime.toFixed(1)}s`
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-auto flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: iconBtn,
								onClick: toggleMute,
								"aria-label": muted ? t.soundOff : t.soundOn,
								children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: iconBtn,
								"aria-label": phase === "pause" ? t.resume : t.pause,
								onClick: () => {
									const next = phase === "play" ? "pause" : "play";
									if (next === "play") unlockAudio();
									setRunPhase(next);
								},
								children: phase === "pause" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" })
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto mt-3 w-full max-w-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-1 flex items-center justify-between text-xs text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.flight }), !snap.grounded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									t.alt,
									" ",
									snap.alt.toFixed(0),
									"m"
								] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-2 overflow-hidden rounded-full bg-line",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: snap.flight < .22 ? "h-full bg-primary" : "h-full bg-accent",
									style: { width: `${Math.round(snap.flight * 100)}%` }
								})
							}),
							snap.toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "pop mt-2 text-center font-display text-lg text-accent",
								children: toastLabel(snap.toast, lang)
							}),
							snap.combo >= 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-center font-display text-sm text-primary",
								children: [
									t.combo,
									" ×",
									snap.combo
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 text-center md:absolute md:right-5 md:bottom-6 md:mt-0 md:text-right",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-5xl leading-none md:text-6xl",
								children: snap.kmh
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: t.speed
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-display text-lg",
								children: [snap.score, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-2 text-xs text-muted",
									children: [
										t.best,
										" ",
										Math.max(best, snap.score)
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniMap, {
						world,
						api,
						tick
					})
				]
			}),
			phase === "pause" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-30 grid place-items-center bg-bg/70 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-full max-w-sm rounded-2xl border border-line bg-surface p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-3xl",
							children: t.pause
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm text-muted",
							children: [
								t.score,
								" ",
								snap.score,
								" · ",
								t.best,
								" ",
								Math.max(best, snap.score)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: t.roll
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 grid gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-12 rounded-2xl bg-primary font-display text-lg text-fg",
									onClick: () => {
										unlockAudio();
										setRunPhase("play");
									},
									children: t.resume
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-12 rounded-2xl border border-line font-display text-lg",
									onClick: restart,
									children: t.again
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-12 rounded-2xl border border-line font-display text-lg",
									onClick: recover,
									children: t.pose
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangSwitch, {
							lang,
							setLang
						})
					]
				})
			}),
			phase === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "touch-layer pointer-events-none absolute inset-x-0 bottom-0 z-30 items-end justify-between p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stick, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto flex flex-col items-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
							label: t.rollL,
							roll: true,
							onDown: () => {
								unlockAudio();
								touchState.rollLeft = true;
							},
							onUp: () => {
								touchState.rollLeft = false;
							}
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
							label: t.rollR,
							roll: true,
							onDown: () => {
								unlockAudio();
								touchState.rollRight = true;
							},
							onUp: () => {
								touchState.rollRight = false;
							}
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
								label: t.driftBtn,
								onDown: () => {
									touchState.drift = true;
								},
								onUp: () => {
									touchState.drift = false;
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
								label: t.flyBtn,
								fly: true,
								onDown: () => {
									unlockAudio();
									touchState.fly = true;
								},
								onUp: () => {
									touchState.fly = false;
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "hold grid place-items-center",
								"aria-label": t.pose,
								onClick: recover,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-5" })
							})
						]
					})]
				})]
			})
		]
	});
}
var iconBtn = "grid size-11 place-items-center rounded-full border border-line bg-surface text-fg";
function Chip({ done, text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: done ? "rounded-full border border-accent px-2 py-1 text-xs text-accent" : "rounded-full border border-line bg-surface px-2 py-1 text-xs text-muted",
		children: text
	});
}
function LangSwitch({ lang, setLang }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-3 flex gap-2",
		role: "group",
		"aria-label": copy[lang].langLabel,
		children: ["zh", "en"].map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-pressed": lang === id,
			className: lang === id ? "h-11 min-w-11 rounded-full bg-fg px-4 font-display text-bg" : "h-11 min-w-11 rounded-full border border-line px-4 font-display text-muted",
			onClick: () => {
				setLang(id);
				saveLang(id);
			},
			children: id === "zh" ? "中文" : "EN"
		}, id))
	});
}
function Stick() {
	const base = (0, import_react.useRef)(null);
	const [nub, setNub] = (0, import_react.useState)({
		x: 0,
		y: 0
	});
	function place(clientX, clientY) {
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
		setNub({
			x: dx * 34,
			y: dy * 34
		});
	}
	function end() {
		touchState.steer = 0;
		touchState.throttle = 0;
		setNub({
			x: 0,
			y: 0
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: base,
		className: "stick-base pointer-events-auto relative",
		onPointerDown: (e) => {
			e.currentTarget.setPointerCapture(e.pointerId);
			place(e.clientX, e.clientY);
		},
		onPointerMove: (e) => {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) place(e.clientX, e.clientY);
		},
		onPointerUp: end,
		onPointerCancel: end,
		onContextMenu: (e) => e.preventDefault(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "stick-nub absolute top-1/2 left-1/2",
			style: { transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))` }
		})
	});
}
function Hold({ label, fly, roll, onDown, onUp }) {
	function down(e) {
		e.currentTarget.setPointerCapture(e.pointerId);
		onDown();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: fly ? "hold hold-fly" : roll ? "hold hold-roll" : "hold",
		onPointerDown: down,
		onPointerUp: onUp,
		onPointerCancel: onUp,
		onContextMenu: (e) => e.preventDefault(),
		children: label
	});
}
function MiniMap({ world, api, tick }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const size = canvas.width;
		const car = api.current.car;
		const span = 96;
		const X = (x) => (x - car.x + span) / 192 * size;
		const Y = (z) => (z - car.z + span) / 192 * size;
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
			ctx.fillStyle = b.landable ? "#1d4a55" : "#2c3348";
			const x = X(b.x - b.hw);
			const y = Y(b.z - b.hd);
			ctx.fillRect(x, y, X(b.x + b.hw) - x, Y(b.z + b.hd) - y);
		}
		for (const p of api.current.pickups) {
			if (p.taken) continue;
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
	}, [
		api,
		tick,
		world
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		width: 180,
		height: 180,
		className: "absolute bottom-4 left-3 hidden size-28 rounded-2xl border border-line md:block"
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Game, {});
}
//#endregion
export { Home as component };
