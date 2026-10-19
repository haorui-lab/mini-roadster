export type Lang = "zh" | "en";

export const copy = {
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
    langLabel: "语言",
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
    langLabel: "Language",
  },
} as const;

export type Copy = (typeof copy)["zh"];

const LANG_KEY = "mini-roadster-lang";
const BEST_KEY = "skyline-roadster-best";

export function matchLang(tags: readonly string[], saved: string | null): Lang {
  if (saved === "zh" || saved === "en") return saved;
  for (const raw of tags) {
    const tag = String(raw || "").toLowerCase();
    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export function loadLang(): Lang {
  let saved: string | null = null;
  if (typeof localStorage !== "undefined") saved = localStorage.getItem(LANG_KEY);
  const tags =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language || ""];
  return matchLang(tags, saved);
}

export function saveLang(lang: Lang) {
  localStorage.setItem(LANG_KEY, lang);
}

export function loadBest() {
  if (typeof localStorage === "undefined") return 0;
  const n = Number(localStorage.getItem(BEST_KEY));
  return Number.isFinite(n) ? n : 0;
}

export function saveBest(n: number) {
  localStorage.setItem(BEST_KEY, String(Math.floor(n)));
}
