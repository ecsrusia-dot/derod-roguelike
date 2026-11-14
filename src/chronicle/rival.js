// ============================================
// chronicle/rival.js — 황혼 연대기 · 가상 경쟁자 100명 + 성장 순위 (1.289.0)
// ============================================
// PM 결정: 100캐릭터(직업당 20 · 갈래당 10) · 시계 = 내 계정 전체 전투 수 · 순위표 먼저(결투는 시뮬 뒤 결정).
// 설계 원칙 (무덤의 유산 더미 100인과 같음)
//   ① 결정론 — 경쟁자는 전부 시드로 만들고, 상태는 「전투 수」 하나로 계산한다. 저장하는 것은 주간 보상 수령 여부뿐.
//   ② 내가 싸운 만큼만 세계가 흐른다 — 자리를 비워도 뒤처지지 않는다.
//   ③ 경쟁자는 전투를 실제로 돌리지 않는다 — 봇 진행 시뮬에서 잰 「전투 수 → 레벨」 곡선을 따라간다.
// ⚠ 밸런스 조정은 RIVAL_TUNING 한 곳.
import { CHRONICLE_CLASSES, REBIRTH, REBIRTH_BRANCHES, chronicleClass, rebirthLevelCap } from './data.js';
import { kstWeekKey } from './tower.js';
import { famPool, grantFamiliar, famGradeIdx, FAM_GRADES } from './familiar.js';

export const RIVAL_TUNING = {
  count: 100,
  // 개인 속도 — 내 계정 전체 전투 수 × 이 값 = 그 경쟁자가 「한 캐릭터에 쓴」 전투 수.
  // (사람은 캐릭터 여러 개에 전투를 나눠 쓴다 → 1 미만. 중앙값 약 0.39)
  paceMin: 0.10, paceMax: 0.68,
  // 봇 진행 시뮬(scripts/sim-chronicle.mjs) 실측 — [누적 전투 수, 레벨]
  firstCurve: [[0, 1], [103, 13], [272, 24], [549, 36], [907, 48], [1253, 58], [1638, 68], [2116, 79], [2507, 88], [3039, 99], [3150, 100]],
  regrowMult: 0.7,      // 전승 뒤 Lv.1→100은 첫 회차의 70% (레벨 맞춤 착용 + 경험치 1.5배)
  overBattles: 2300,    // Lv.100→120 (sim-chronicle-part3)
  deepBattles: 1500,    // Lv.120 이후 10레벨마다 (1.294.0 — 전승마다 만렙 +10)
  overPow: 0.8,
  towerFrom: 48, towerPerLv: 1, towerPerRebirth: 6, towerSkill: [0.75, 1.2],
  scorePerRebirth: 120, towerDiv: 5,
};

// 순위 점수 = 전승 × 120 + 레벨 + 첨탑 최고층 ÷ 5 (내 캐릭터·경쟁자 공통)
export const rivalScore = (rebirth, lv, tower) => rebirth * RIVAL_TUNING.scorePerRebirth + lv + Math.floor((tower || 0) / RIVAL_TUNING.towerDiv);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 성향 — 한 줄 소개 (1.294.0부터 전승 시점은 규칙으로 정해져 성향과 무관: 첫 전승 Lv.100 · 이후 그때의 만렙)
export const RIVAL_STYLES = [
  { id: 'rush', name: '전승 질주', goal: 100, desc: '만렙을 찍는 대로 곧바로 전승한다' },
  { id: 'steady', name: '꾸준한 등반', goal: 108, desc: '쉬지 않고 꾸준히 레벨을 올린다' },
  { id: 'deep', name: '끝까지 파는 쪽', goal: 120, desc: '한 캐릭터를 끝까지 판다' },
];
export const RIVAL_BUILDS = ['공격 특화', '균형', '생존 특화'];
export const RIVAL_FAMS = [['tank', '수호 동행'], ['healer', '치유 동행'], ['dps', '맹공 동행']];

const NAME_A = ['잿빛', '새벽', '침묵의', '어스름', '핏빛', '떠도는', '녹슨', '창백한', '검은', '여명의', '황혼', '무너진', '얼어붙은', '이름없는', '가면의', '달빛', '서리', '불씨', '안개', '폭풍'];
const NAME_B = ['까마귀', '순례자', '등불', '올빼미', '이리', '문지기', '나방', '수집가', '약장수', '재봉사', '거미', '박쥐', '방랑자', '사냥꾼', '기록관', '종지기', '나그네', '검은손', '파수꾼', '서기'];
const NAME_SOLO = ['하루세판', '주말전사', '새벽반', '끝까지간다', '느긋한등반', '첨탑주민', '전승중독', '한우물', '오늘도사냥', '보스만잡음', '강화실패왕', '사역마덕후', '열쇠부자', '관문앞에서', '황혼산책'];

// 경쟁자 100명 — 고정 시드 (언제나 같은 명단)
export const RIVALS = (() => {
  const rng = seeded(20261114);
  const out = [];
  const names = new Set();
  const classes = CHRONICLE_CLASSES.map(c => c.id);
  const per = RIVAL_TUNING.count / classes.length; // 직업당 20
  for (let i = 0; i < RIVAL_TUNING.count; i++) {
    const cls = classes[Math.floor(i / per)];
    const branches = Object.entries(REBIRTH_BRANCHES).filter(([, b]) => b.cls === cls).map(([id]) => id);
    const branch = branches[i % branches.length]; // 갈래당 10
    let name = '';
    for (let g = 0; g < 50 && (!name || names.has(name)); g++) {
      name = rng() < 0.18 ? NAME_SOLO[Math.floor(rng() * NAME_SOLO.length)] : `${NAME_A[Math.floor(rng() * NAME_A.length)]}${NAME_B[Math.floor(rng() * NAME_B.length)]}`;
    }
    if (names.has(name)) name = `${name}${i}`;
    names.add(name);
    // 속도는 가운데가 두껍게 (두 난수 평균)
    const p = (rng() + rng()) / 2;
    const T = RIVAL_TUNING;
    out.push({
      id: `r${i + 1}`, name, cls, branch,
      pace: T.paceMin + (T.paceMax - T.paceMin) * p,
      style: RIVAL_STYLES[Math.floor(rng() * RIVAL_STYLES.length)].id,
      build: Math.floor(rng() * RIVAL_BUILDS.length),
      fam: Math.floor(rng() * RIVAL_FAMS.length),
      towerSkill: T.towerSkill[0] + (T.towerSkill[1] - T.towerSkill[0]) * rng(),
    });
  }
  return out;
})();

function lerpCurve(curve, x) {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (x <= curve[i][0]) {
      const [x0, y0] = curve[i - 1], [x1, y1] = curve[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return curve[curve.length - 1][1];
}

// 경쟁자 상태 — ticks(내 계정 전체 전투 수)만으로 계산 → { rebirth, lv, peak, tower, score, battles }
export function rivalState(r, ticks) {
  const T = RIVAL_TUNING;
  let left = Math.max(0, ticks) * r.pace;
  const battles = Math.round(left);
  const to100First = T.firstCurve[T.firstCurve.length - 1][0];
  const overNeed = (g) => (g <= 100 ? 0 : g <= 120 ? T.overBattles * Math.pow((g - 100) / 20, 1 / T.overPow) : T.overBattles + (g - 120) / 10 * T.deepBattles);
  let rebirth = 0, lv = 1, peak = 1;
  for (let guard = 0; guard < 12; guard++) {
    const scale = rebirth === 0 ? 1 : T.regrowMult;
    const need100 = to100First * scale;
    const cap = rebirthLevelCap(rebirth); // 첫 회차 100 · 전승 1회 120 · 이후 +10씩
    // 1.294.0 — 첫 전승은 Lv.100(성향에 따라 더 올린 뒤), 두 번째부터는 그때의 만렙을 찍어야 전승
    const target = rebirth === 0 ? 100 : cap;
    if (left < need100) { lv = Math.floor(lerpCurve(T.firstCurve, left / scale)); break; }
    left -= need100;
    const needOver = overNeed(target);
    if (left < needOver || rebirth >= REBIRTH.max) {
      lv = Math.min(target, left < T.overBattles ? Math.floor(100 + 20 * Math.pow(left / T.overBattles, T.overPow)) : 120 + Math.floor((left - T.overBattles) / T.deepBattles * 10));
      peak = Math.max(peak, lv);
      break;
    }
    left -= needOver;
    peak = Math.max(peak, target);
    rebirth += 1; lv = 1;
  }
  lv = Math.max(1, lv);
  peak = Math.max(peak, lv, rebirth > 0 ? 100 : 1);
  const tower = peak >= T.towerFrom ? Math.round(((peak - T.towerFrom) * T.towerPerLv + rebirth * T.towerPerRebirth) * r.towerSkill) : 0;
  return { rebirth, lv, peak, tower, battles, score: rivalScore(rebirth, lv, tower) };
}

// 내 계정 전체 전투 수 (시계)
export const rivalTicks = (acc) => Object.values(acc?.chars || {}).reduce((n, c) => n + (c?.stats?.battles || 0), 0);

// 내 캐릭터 줄
export function myEntries(acc) {
  return Object.entries(acc?.chars || {}).filter(([, c]) => c?.unit).map(([cid, c]) => {
    const rebirth = c.unit.rebirth?.count || 0, lv = c.unit.lv || 1, tower = c.tower?.best || 0;
    return { id: `me_${cid}`, me: true, cls: cid, branch: c.unit.rebirth?.branch || null, name: chronicleClass(cid).name, rebirth, lv, tower, battles: c.stats?.battles || 0, score: rivalScore(rebirth, lv, tower) };
  });
}

// 순위표 — cls를 주면 그 직업만. 동점은 내 캐릭터가 위.
export function rivalBoard(acc, cls = null) {
  const ticks = rivalTicks(acc);
  const rows = [
    ...RIVALS.map(r => ({ ...r, ...rivalState(r, ticks) })),
    ...myEntries(acc),
  ].filter(x => !cls || x.cls === cls);
  rows.sort((a, b) => b.score - a.score || (b.me ? 1 : 0) - (a.me ? 1 : 0) || b.lv - a.lv || (a.id < b.id ? -1 : 1));
  rows.forEach((x, i) => { x.rank = i + 1; });
  return rows;
}

// 내 최고 순위(통합) → { rank, total, row, above(바로 위 줄), gap(점수 차) } · 캐릭터가 없으면 null
export function myBestRank(acc) {
  const rows = rivalBoard(acc);
  const mine = rows.filter(x => x.me);
  if (!mine.length) return null;
  const row = mine[0];
  const above = row.rank > 1 ? rows[row.rank - 2] : null;
  return { rank: row.rank, total: rows.length, row, above, gap: above ? above.score - row.score : 0 };
}

// ===== 순위 보상 (1.290.0 PM 지시 — 상위권은 사역마를 건다) =====
// 주간: 주 1회, 받는 순간의 내 최고 순위 기준. fam = 그 등급 사역마 1마리(무작위 · 안 가진 것 우선)
export const RIVAL_REWARDS = [
  { maxRank: 1, label: '1위', fam: 'violet', reward: { shard: 20, gold: 30000 } },
  { maxRank: 3, label: '2~3위', fam: 'indigo', reward: { shard: 15, gold: 25000 } },
  { maxRank: 10, label: '4~10위', fam: 'blue', reward: { shard: 12, famSoul: 60, gold: 20000 } },
  { maxRank: 30, label: '11~30위', reward: { shard: 10, famShard: 50, famSoul: 30, gold: 18000 } },
  { maxRank: 60, label: '31~60위', reward: { shard: 5, famShard: 30, famSoul: 15, gold: 10000 } },
  { maxRank: Infinity, label: '61위 아래', reward: { shard: 2, famShard: 20, gold: 5000 } },
];
export const rivalRewardFor = (rank) => RIVAL_REWARDS.find(r => rank <= r.maxRank) || RIVAL_REWARDS[RIVAL_REWARDS.length - 1];
export const rivalFamLabel = (gid) => `무작위 ${FAM_GRADES[famGradeIdx(gid)].label} 1마리`;
// 계정의 모든 캐릭터 진행을 합친 사역마 풀 (등급 → 키 목록)
export function accFamPool(acc) {
  const out = { red: [], green: [], blue: [], indigo: [], violet: [] };
  for (const c of Object.values(acc?.chars || {})) {
    const p = famPool(c?.progress);
    for (const g of Object.keys(out)) for (const k of p[g]) if (!out[g].includes(k)) out[g].push(k);
  }
  return out;
}
// 그 등급에서 1마리 — 풀이 비면 한 단계 아래. 안 가진 사역마를 먼저 준다
function pickRewardFam(acc, gid, rng) {
  const pool = accFamPool(acc);
  for (let i = famGradeIdx(gid); i >= 0; i--) {
    const g = FAM_GRADES[i].id;
    if (!pool[g].length) continue;
    const fresh = pool[g].filter(k => !acc.fams?.[k]);
    const list = fresh.length ? fresh : pool[g];
    return { key: list[Math.floor(rng() * list.length)], grade: g };
  }
  return null;
}
const giveMats = (out, reward) => {
  for (const [k, v] of Object.entries(reward || {})) {
    if (k === 'gold') out.gold = (out.gold || 0) + v; else out.mats[k] = (out.mats[k] || 0) + v;
  }
};
const giveFam = (out, key, grade) => {
  const r = grantFamiliar(out.fams || {}, key, grade);
  out.fams = r.fams;
  if (r.soul) out.mats.famSoul = (out.mats.famSoul || 0) + r.soul;
  return r;
};
export const rivalWeekClaimed = (acc, now = Date.now()) => acc?.rivalWeek?.key === kstWeekKey(now) && !!acc.rivalWeek.claimed;
export function claimRivalWeek(acc, now = Date.now(), rng = Math.random) {
  const best = myBestRank(acc);
  if (!best || rivalWeekClaimed(acc, now)) return { acc, n: 0, reward: {} };
  const tier = rivalRewardFor(best.rank);
  const out = { ...acc, mats: { ...acc.mats }, rivalWeek: { key: kstWeekKey(now), claimed: true, rank: best.rank } };
  giveMats(out, tier.reward);
  let fam = null;
  if (tier.fam) { const p = pickRewardFam(acc, tier.fam, rng); if (p) fam = giveFam(out, p.key, p.grade); }
  return { acc: out, n: 1, reward: tier.reward, rank: best.rank, label: tier.label, fam };
}
// 월간: 달마다 1회, 받는 순간 통합 1위면 자령 1마리를 골라 받는다
export const kstMonthKey = (now = Date.now()) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 7);
export const rivalMonthClaimed = (acc, now = Date.now()) => acc?.rivalMonth?.key === kstMonthKey(now) && !!acc.rivalMonth.claimed;
export const rivalMonthReady = (acc, now = Date.now()) => !rivalMonthClaimed(acc, now) && myBestRank(acc)?.rank === 1;
export const rivalMonthChoices = (acc) => accFamPool(acc).violet;
export function claimRivalMonth(acc, key, now = Date.now()) {
  if (!rivalMonthReady(acc, now) || !rivalMonthChoices(acc).includes(key)) return { acc, n: 0 };
  const out = { ...acc, mats: { ...acc.mats }, rivalMonth: { key: kstMonthKey(now), claimed: true, fam: key } };
  const fam = giveFam(out, key, 'violet');
  return { acc: out, n: 1, fam, month: true };
}
