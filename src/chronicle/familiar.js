// ============================================
// chronicle/familiar.js — 황혼 연대기 사역마 (1.212.0)
// ============================================
// PM 결정 (1.212.0):
//   얻기 = 📜 계약서 조각 드랍 → 조각 10개로 소환 (가챠, 등급 랜덤 · 좋은 등급은 매우 낮게)
//   천장 = 10연마다 청령 이상 1마리 확정 + 누적 150회 소환 시 자령 확정
//   중복 = 🔮 사역혼 → 강화 +1~+10 → +10에서 다음 등급 진화 도전 (실패 시 강화 -3단계)
//   소환 풀 = 진행한 지역의 적만 · 조각 속도 = 약 25전에 소환 1회
//   편성 = 동행 1 (전투 참여) + 보조 2 (패시브)
// 데이터 + 순수 함수만 — engine.js가 이 파일을 쓴다 (반대 방향 import 금지).
// 밸런스는 이 파일 한 곳 (FAM_GRADES · FAM_TUNING · FAM_ROLES).
// ============================================
import { CENEMIES as ENEMIES } from './enemies.js';
import { CHRONICLE_FIELDS, CHRONICLE_DUNGEONS } from './data.js';

export const FAM_GRADES = [
  { id: 'red', label: '적령', color: '#c9705e', rate: 0.62, mult: 1.0, dupSoul: 1, cost: 1, evolve: 0.6 },
  { id: 'green', label: '녹령', color: '#7fbf6a', rate: 0.27, mult: 1.3, dupSoul: 3, cost: 2, evolve: 0.4 },
  { id: 'blue', label: '청령', color: '#6aa6e0', rate: 0.085, mult: 1.7, dupSoul: 10, cost: 4, evolve: 0.2 },
  { id: 'indigo', label: '남령', color: '#7a6ae8', rate: 0.022, mult: 2.2, dupSoul: 30, cost: 8, evolve: 0.07 },
  { id: 'violet', label: '자령', color: '#d07ae8', rate: 0.003, mult: 2.9, dupSoul: 100, cost: 12, evolve: 0 },
];
export const famGradeIdx = (id) => Math.max(0, FAM_GRADES.findIndex(g => g.id === id));
export const famGrade = (id) => FAM_GRADES[famGradeIdx(id)];

export const FAM_TUNING = {
  shardsPerSummon: 10,
  tenPullGuarantee: 'blue',     // 10연마다 이 등급 이상 1마리 확정
  violetPity: 150,              // 누적 소환 수 — 자령이 안 나오면 확정 (자령 소환 가능해진 뒤부터)
  maxPlus: 10,
  plusStatPct: 0.05,            // 강화 1단계당 능력치 +5%
  enhanceCost: (plus, g) => (plus + 1) * famGrade(g).cost,   // +n → +n+1 사역혼
  evolveCost: (g) => 10 * famGrade(g).cost,
  evolveFailDrop: 1,            // 진화 실패 시 강화 단계 하락 (1.242.0 PM: 3 → 1)
  evolveFailDropBy: { indigo: 3 }, // 남령 → 자령은 실패 시 -3 (최상위 진화는 무겁게)
  // 진화 천장 (1.242.0) — 실패할 때마다 다음 진화 성공률 +이만큼 (성공하면 초기화 · f.evoFails에 저장)
  evolvePityAdd: { red: 0.2, green: 0.2, blue: 0.15, indigo: 0.03 },
  // 🔮 사역혼 전투 드랍 (1.242.0 PM: 중복 소환만으로는 너무 느림) — 일반 몹 확률 · 강적 확률×개수 · 보스 확정
  soulNormal: 0.05, soulElite: 0.4, soulEliteN: [1, 3], soulBoss: 8, soulDungeonBoss: [15, 22, 32], soulTowerBoss: 12,
  // 계약서 조각 드랍 (사냥터 일반 몹 1마리당 · 강적 1마리당 · 보스 확정)
  dropNormal: 0.15, dropElite: 0.6, dropEliteN: [1, 2], dropBoss: 3, dropDungeonBoss: [5, 8, 12],
  slotLv: { main: 5, sub1: 20, sub2: 40 }, // 주인공 레벨 개방
};

// 사역마 행동 조건 (1.227.1 — engine chooseSkill이 u.fam일 때만 사용, 주인공 사제 규칙은 그대로)
export const FAM_AI = { healBelow: 0.75, shieldBelow: 0.1 };

// ===== 사역마 레벨 (1.225.0 — PM: 처음 얻으면 Lv.1, 동행할 때만 경험치) =====
// 실효 레벨 = min(사역마 레벨, 주인공 레벨) · 능력치는 실효 레벨의 기준 곡선(FAM_STAT_CURVE, 1.226.0)
// 보조 패시브도 레벨 비례 — subMin + (1-subMin) × (실효/주인공)
export const FAM_LEVEL = {
  expNeed: (lv) => Math.round(60 * Math.pow(lv, 1.6)), // 주인공 1회차와 같은 곡선
  catchUp: 1,       // 1.225.1 PM: 따라잡기 보정 폐지 — 주인공과 같은 경험치 (동행해서 직접 키워야 함)
  subMin: 0.3,      // Lv.1 보조 사역마도 패시브의 30%는 준다
};
// ===== 사역마 독립 능력치 (1.226.0 — PM: 주인공 직업·장비와 무관) =====
// 기준 곡선 = 5직업 봇이 그 레벨에서 가진 평균 능력치 (장비 포함, 사역마 없이 측정 — scratch curve.mjs)
// [레벨, 최대 HP, 공격력, 방어, 속도] — 사이 레벨은 선형 보간
export const FAM_STAT_CURVE = [
  [1, 151, 33, 8, 11.6], [5, 255, 61, 16, 12.9], [10, 441, 112, 33, 15.4], [15, 654, 171, 53, 17.5], [20, 862, 231, 71, 19.3],
  [25, 1126, 297, 92, 21], [30, 1400, 350, 115, 23.1], [40, 1984, 473, 156, 27.3], [50, 2353, 590, 196, 31.8], [60, 2833, 706, 237, 35.2],
  [70, 3380, 800, 287, 39.1], [80, 3890, 960, 335, 42.8], [90, 4676, 1071, 397, 46.6], [100, 4950, 1120, 420, 49],
];
export const FAM_OVER_SLOPE = 0.03; // Lv.100 초과 1레벨당 HP·공격·방어 +3% (주인공 성장 폭에 맞춤 — sim-chronicle-part3로 확인)
export function famBaseStats(lv) {
  const c = FAM_STAT_CURVE;
  // 1.278.0 — 전승자 Lv.101~120: 표의 마지막 값에서 FAM_OVER_SLOPE(레벨당 비율)로 연장
  const top = c[c.length - 1][0];
  const L = Math.max(1, Math.min(top, lv));
  let i = 0;
  while (i < c.length - 2 && c[i + 1][0] < L) i++;
  const [l0, ...a] = c[i]; const [l1, ...b] = c[i + 1];
  const t = Math.max(0, Math.min(1, (L - l0) / (l1 - l0)));
  if (lv > top) { const m = 1 + FAM_OVER_SLOPE * (lv - top); const z = c[c.length - 1]; return { hp: z[1] * m, atk: z[2] * m, def: z[3] * m, spd: z[4] }; }
  const v = a.map((x, k) => x + (b[k] - x) * t);
  return { hp: v[0], atk: v[1], def: v[2], spd: v[3] };
}
export const famLv = (f) => Math.max(1, f?.lv || 1);
export const famEffLv = (f, heroLv) => Math.min(famLv(f), Math.max(1, heroLv || 1));
const subLvMult = (f, heroLv) => (heroLv ? FAM_LEVEL.subMin + (1 - FAM_LEVEL.subMin) * (famEffLv(f, heroLv) / heroLv) : 1);
export const famSubPctOf = (f, heroLv) => Math.round(subLvMult(f, heroLv) * 100);
// 승리 경험치 → 사역마 (주인공 레벨이 상한) → { f, ups }
export function gainFamExp(f0, n, heroLv) {
  const f = { ...f0, lv: famLv(f0), exp: f0.exp || 0 };
  if (f.lv >= heroLv) return { f: { ...f, exp: 0 }, ups: 0, gained: 0 };
  const gained = Math.round(n * FAM_LEVEL.catchUp);
  f.exp += gained;
  let ups = 0;
  while (f.lv < heroLv && f.exp >= FAM_LEVEL.expNeed(f.lv)) { f.exp -= FAM_LEVEL.expNeed(f.lv); f.lv += 1; ups++; }
  if (f.lv >= heroLv) f.exp = 0;
  return { f, ups, gained };
}

// ===== 보조 재화 특성 (1.225.0) — 보조 칸에서만. 사역마마다 하나 (키로 고정 — 저장 안 함) =====
export const FAM_ECON = {
  expPct: { label: '경험치', icon: '📘', v: [0.04, 0.06, 0.09, 0.13, 0.18] },
  goldPct: { label: '골드', icon: '🪙', v: [0.05, 0.08, 0.12, 0.17, 0.25] },
  dropPct: { label: '아이템 획득', icon: '🎁', v: [0.03, 0.05, 0.08, 0.12, 0.16] },
};
export function famEconId(key) {
  let h = 7;
  for (const ch of String(key)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const ids = Object.keys(FAM_ECON);
  return ids[h % ids.length];
}

// 역할 3종 (1.216.0 재정립) — 원본 적 이름으로 자동 결정
//   tank   수호: 동행 = 도발로 공격을 대신 받는 방패 · 보조 = 받는 피해 감소 (+청령↑ 시작 보호막)
//   dps    맹공: 동행 = 함께 때리는 두 번째 딜러   · 보조 = 공격력 (+청령↑ 치명타 피해)
//   healer 치유: 동행 = 주인공을 회복·보호막       · 보조 = 매 턴 재생 · 회복량 (+청령↑ 위기 회복)
// atk/hp/def = 주인공 능력치 대비 비율 (× 등급 배율 × 강화)
export const FAM_ROLES = {
  tank: {
    label: '수호', icon: '🛡', color: '#9cc4e4', atk: 0.1, hp: 0.7, def: 1.3, tauntReduce: 0.2,
    // 수호 태세 — 살아 있는 동안 적의 단일 공격이 이 확률로 사역마에게 향한다 (등급별)
    guard: [0.3, 0.35, 0.4, 0.45, 0.5], // 1.235.1: 0.35~0.75 → 0.3~0.5 (상시 도발과 겹쳐 피해의 74~90%를 대신 맞던 문제)
    desc: '도발로 적의 공격을 대신 받는다 — 딜은 강하지만 몸이 약한 직업에게',
    // 보조 패시브 — 등급별 값 (적·녹·청·남·자)
    sub: { dmgReduce: [0.02, 0.03, 0.045, 0.06, 0.08], shieldPct: [0, 0, 0.05, 0.08, 0.12] },
  },
  dps: {
    label: '맹공', icon: '🗡', color: '#e8826a', atk: 0.5, hp: 0.36, def: 0.5,
    desc: '함께 공격해 빠르게 정리한다 — 극딜 조합',
    sub: { atkPct: [0.03, 0.045, 0.07, 0.1, 0.13], critDmg: [0, 0, 0.15, 0.25, 0.4] },
  },
  healer: {
    label: '치유', icon: '✚', color: '#8fe08a', atk: 0.1, hp: 0.45, def: 0.6, heal: 0.4, // 1.235.1: 회복력 0.2 → 0.4 · HP 0.35 → 0.45
    desc: '주인공을 회복하고 보호막을 씌운다 — 단단하지만 전투가 길어지는 직업에게',
    sub: { regenPct: [0.002, 0.0025, 0.003, 0.004, 0.005], healPct: [0.04, 0.06, 0.09, 0.12, 0.16], emergencyHeal: [0, 0, 0.08, 0.12, 0.18] },
  },
};
const ROLE_WORDS = [
  ['tank', /거인|골렘|수호|갑주|감시자|기사|성전사|저거너트|광전사|트리언트|파수|문지기|폭군|약탈자|얼어붙은 망자|균열의 전사/],
  ['healer', /정령|드라이어드|사제|천사|어머니|선견자|예언자|신탁|요정|성녀|사도|무당|술사|영혼/],
];
// 보스 출신(남령·자령)은 이름 대신 직접 지정 — 상위 등급에도 세 역할이 고르게 있도록
const ROLE_OVERRIDE = {
  '한기의 마녀': 'healer', '망각의 봉인자': 'tank', '타락한 황혼의 자녀': 'dps', '마왕의 그림자': 'dps',
  '절대영도의 여제 세릴': 'tank', '동굴의 빙왕 이스몬드': 'tank', '절대봉인의 군주 아르케온': 'tank',
  '심처의 봉인자 카탈': 'healer', '광기의 마녀 벨라도나': 'healer', '여명의 신 솔라리온': 'healer', '정원의 마녀 루미엘': 'healer',
  '종말의 마에스트로 오르페인': 'dps', '심장의 마왕': 'dps', '협곡의 한기룡 스칼드라': 'dps', '마왕의 화신': 'dps',
};
export function famRole(key) {
  const name = ENEMIES[key]?.name || '';
  if (ROLE_OVERRIDE[name]) return ROLE_OVERRIDE[name];
  for (const [r, re] of ROLE_WORDS) if (name && re.test(name)) return r;
  if (name) return 'dps';
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['tank', 'dps', 'healer'][h % 3];
}

// 직업별 추천 동행 (1.216.0 시뮬 — 2부 던전 영웅/전설, 청령+5 기준)
export const FAM_CLASS_TIP = {
  wanderer: { best: 'healer', why: '단단하지만 딜이 느려 전투가 길다 — 길게 버티게 해 주는 치유' },
  sage: { best: 'tank', why: '딜은 최고지만 몸이 약하다 — 공격을 대신 맞아 주는 수호 (영웅 0% → 100%)' },
  demonblood: { best: 'tank', why: '흡혈이 상한(7%)에 묶여 혼자 버티기 어렵다 — 수호로 안정, 치유도 무난' },
  elf: { best: 'tank', why: '회피가 높아도 연속 피격에 약하다 — 수호가 가장 안정적' },
  priest: { best: 'dps', why: '스스로 회복하지만 딜이 부족해 시간 초과 — 맹공으로 극딜' },
};

// 역할별 동행 스킬 (Lv = 등급 순서 1~5)
const FS = (id, name, kind, cd, base, perLv, extra = {}) => ({ id, cls: 'fam', name, kind, reqLv: 1, cd, base, perLv, ...extra });
// ===== 자령 초월 (1.290.0) — PM 지시: 자령 +10 뒤의 성장. 실패 패널티 없음 · 사역혼 많이 · 성공률 낮게 · +5에서 초월 스킬 =====
// ⚠ 밸런스 조정은 FAM_TRANS 한 곳. 초월 1단계 = 능력치·보조 효과·보유 효과 +statPct (강화 배율과 곱)
export const FAM_TRANS = {
  max: 5,
  cost: [200, 350, 550, 800, 1200],      // 🔮 사역혼 (n → n+1)
  rate: [0.5, 0.4, 0.3, 0.2, 0.12],
  pityAdd: 0.02,                         // 실패할 때마다 다음 성공률 +2%p (성공하면 초기화)
  statPct: 0.08,
  skillAt: 5,
};
export const famTrans = (f) => Math.max(0, Math.min(FAM_TRANS.max, f?.trans || 0));
export const famCanTranscend = (f) => !!f && f.grade === 'violet' && (f.plus || 0) >= FAM_TUNING.maxPlus && famTrans(f) < FAM_TRANS.max;
export const famTransCost = (f) => FAM_TRANS.cost[famTrans(f)] ?? null;
export const famTransRate = (f) => Math.min(1, (FAM_TRANS.rate[famTrans(f)] || 0) + (f?.transFails || 0) * FAM_TRANS.pityAdd);
// 초월 → { fams, souls, result: 'success'|'fail'|null } — 실패해도 잃는 것은 사역혼뿐
export function transcendFamiliar(fams, souls, key, rng = Math.random) {
  const f = fams[key];
  if (!famCanTranscend(f)) return { fams, souls, result: null };
  const c = famTransCost(f);
  if (souls < c) return { fams, souls, result: null };
  if (rng() < famTransRate(f)) return { fams: { ...fams, [key]: { ...f, trans: famTrans(f) + 1, transFails: 0 } }, souls: souls - c, result: 'success' };
  return { fams: { ...fams, [key]: { ...f, transFails: (f.transFails || 0) + 1 } }, souls: souls - c, result: 'fail' };
}
export const famPlusText = (f) => `${f?.plus ? ` +${f.plus}` : ''}${famTrans(f) ? ` ◈${famTrans(f)}` : ''}`;
// 사역마 지급 (순위 보상 등) — 소환과 같은 규칙: 없으면 새로, 더 높은 등급이면 승급, 같거나 낮으면 사역혼
export function grantFamiliar(fams0, key, gid) {
  const fams = { ...fams0 };
  const have = fams[key];
  const r = { key, grade: gid, isNew: !have, upgraded: false, soul: 0 };
  if (!have) fams[key] = { grade: gid, base: gid, plus: 0, lv: 1, exp: 0 };
  else if (famGradeIdx(gid) > famGradeIdx(have.grade)) { fams[key] = { ...have, grade: gid, base: gid }; r.upgraded = true; }
  else if (famGradeIdx(gid) > famGradeIdx(famBaseGrade(key, have))) fams[key] = { ...have, base: gid };
  else r.soul = famGrade(gid).dupSoul;
  return { fams, ...r };
}

export const FAM_SKILLS = {
  tank: [FS('f_guard', '수호의 포효', 'taunt', 3, 0.3, 0.1, { turns: 1 }), FS('f_bash', '몸통 박치기', 'strike', 2, 1.0, 0.12)],
  dps: [FS('f_bite', '물어뜯기', 'strike', 2, 1.6, 0.18), FS('f_frenzy', '난도질', 'multi', 3, 0.6, 0.08, { hits: 3 }), FS('f_blast', '마력 폭발', 'aoe', 4, 0.9, 0.12)],
  healer: [FS('f_mend', '치유의 숨결', 'heal', 3, 1.0, 0.12), FS('f_ward', '보호의 빛', 'shield', 4, 0.8, 0.12)],
};


// ===== 자령 전용 키트 (1.292.0) — PM 「자령마다 스킬 1가지 빼곤 다 똑같다 → 갈래마다 최고 효율 자령 · 기본 스킬도 전부 다르게」 =====
// PM 결정: 자령 17종 전부 · 짝 갈래일 때만 「공명」 추가 효과 · 고유 스킬 = 기본의 약 1.5배 + 부가 효과 · 능력치도 조금씩 다르게
// 키 = 적 키. 자령으로 「소환된」 사역마(베이스 자령)만 쓴다 — 진화로 자령이 된 사역마는 역할 공통 스킬 그대로 (1.243.0 규칙)
//   stat   역할 비율에 곱하는 값 (hp·atk·def·heal, 없으면 1)
//   basics 기본 스킬 2종 · sig 고유 스킬 (수치는 자령 기준 고정값 — perLv 0)
//   스킬 부가 효과: foeFx{k: vuln|weak|armorBreak, v, t, all} · teamBuff{v,t} · selfBuff{v,t} · selfHealPct
//   passive.fx 사역마 유닛에 더하는 전투 값 (critAdd는 기본 치명 8%에 더함)
//   reso   짝 갈래(branch)가 「동행」으로 데려갈 때만 — hero = 주인공 능력치 키 · fam = 사역마 배율(atk·hp·def) + guard(수호 태세 가산)
// ⚠ 수치 조정은 이 표 한 곳. 바꾸면 scripts/sim-chronicle-kit.mjs 로 갈래 × 자령 승률을 다시 볼 것
const KS = (id, name, kind, cd, base, extra = {}) => ({ id, cls: 'fam', name, kind, reqLv: 1, cd, base, perLv: 0, ...extra });
const SG = (id, name, type, kind, cd, base, extra = {}) => ({ id, sigId: id, sig: true, kit: true, cls: 'fam', name, type, kind, reqLv: 1, cd, base, perLv: 0, ...extra });
export const FAM_KITS = {
  // ── 수호 ──
  champ_frost_boss4: { // 절대영도의 여제 세릴 — 폭풍궁수
    tag: '빙결 수호', stat: { def: 1.15 },
    basics: [KS('k_seril_1', '서리 장막', 'taunt', 3, 0.6, { turns: 1 }), KS('k_seril_2', '빙결의 족쇄', 'weakStrike', 3, 1.2, { dv: 0.15, turns: 2 })],
    sig: SG('k_seril_s', '절대영도 결계', '방어 강화 + 적 약화', 'fortify', 4, 0.85, { red: 0.15, turns: 4, foeFx: { k: 'weak', v: 0.15, t: 3, all: true } }),
    passive: { name: '절대영도의 가호', desc: '전투당 1회 주인공이 쓰러질 피해를 막아 HP 25%로 버틴다 · 사역마를 때린 적에게 피해의 20% 반사', fx: { vGuard: 0.25, thornsPct: 0.2 } },
    reso: { branch: 'e_storm', name: '눈보라의 궁수', desc: '추가 타격 확률 +45% · 공격력 +45% · 치명타 피해 +30% · 받는 피해 -12% · 세릴 공격력 2.6배', hero: { chain: 0.45, dmgReduce: 0.12, atkPct: 0.45, critDmg: 0.3 }, fam: { atk: 2.6 } },
  },
  champ_frost_boss2: { // 동굴의 빙왕 이스몬드 — 대마도사
    tag: '광역 도발', stat: { hp: 1.15, def: 0.95 },
    basics: [KS('k_ismond_1', '빙왕의 위압', 'taunt', 3, 0.5, { turns: 1 }), KS('k_ismond_2', '얼음 갑옷', 'shield', 4, 2.4)],
    sig: SG('k_ismond_s', '빙왕의 포효', '광역 도발 + 취약', 'warcry', 4, 0.8, { turns: 3, foeFx: { k: 'vuln', v: 0.18, t: 3, all: true } }),
    passive: { name: '빙왕의 수호', desc: '전투당 1회 주인공이 쓰러질 피해를 막아 HP 20%로 버틴다 · 수호 태세 +15%p', fx: { vGuard: 0.2, guardianAdd: 0.15 } },
    reso: { branch: 's_arch', name: '얼음 성채의 마도사', desc: '스킬 피해 +50% · 공격력 +25% · 받는 피해 -25% · 매 턴 HP 4% 재생 · 이스몬드 공격력 2.5배', hero: { skillDmg: 0.5, atkPct: 0.25, dmgReduce: 0.25, regenPct: 0.04 }, fam: { atk: 2.5 } },
  },
  champ_sanctum_boss4: { // 절대봉인의 군주 아르케온 — 심판관
    tag: '피해 분담', stat: { hp: 1.05, def: 1.1 },
    basics: [KS('k_arkeon_1', '봉인의 사슬', 'taunt', 3, 0.6, { turns: 1 }), KS('k_arkeon_2', '단죄의 낙인', 'markStrike', 3, 1.2, { dv: 0.15, turns: 2 })],
    sig: SG('k_arkeon_s', '봉인의 맹세', '보호 + 아군 강화', 'cover', 4, 0.75, { turns: 4, teamBuff: { v: 0.12, t: 4 } }),
    passive: { name: '봉인의 성채', desc: '전투당 1회 주인공이 쓰러질 피해를 막아 HP 20%로 버틴다 · 사역마가 받는 피해 -15%', fx: { vGuard: 0.2, dmgReduce: 0.15 } },
    reso: { branch: 'p_inq', name: '심판의 집행자', desc: '공격력 +40% · 스킬 피해 +20% · 회복량 +15%', hero: { atkPct: 0.4, skillDmg: 0.2, healPct: 0.15 } },
  },
  p3_v_boss: { // 공허의 문지기 네하르 — 범용
    tag: '반격 수호', stat: { hp: 1.2, def: 0.9, atk: 2.2 },
    basics: [KS('k_nehar_1', '공허의 문', 'taunt', 3, 0.5, { turns: 1 }), KS('k_nehar_2', '공허 흡수', 'lifesteal', 2, 2.0, { steal: 0.8 })],
    sig: SG('k_nehar_s', '문 앞의 결투', '단일 도발 + 방어 파괴', 'duel', 4, 0.9, { turns: 4, foeFx: { k: 'armorBreak', v: 0.25, t: 4, forced: true } }),
    passive: { name: '공허의 반향', desc: '맞으면 35% 확률로 반격 · 사역마를 때린 적에게 피해의 25% 반사', fx: { counterPct: 0.35, thornsPct: 0.25 } },
  },
  // ── 치유 ──
  champ_forest_witch: { // 광기의 마녀 벨라도나 — 검귀
    tag: '지속 회복', stat: { hp: 1.1 },
    basics: [KS('k_bella_1', '광기의 연고', 'heal', 2, 1.1), KS('k_bella_2', '가시 덩굴', 'dot', 3, 1.2, { turns: 3 })],
    sig: SG('k_bella_s', '광기의 영약', '지속 회복 + 공격 강화', 'hot', 5, 0.45, { turns: 5, teamBuff: { v: 0.15, t: 4 } }),
    passive: { name: '광기의 순환', desc: '사역마 턴마다 아군 전원을 회복력 12%만큼 회복 · 주인공 HP 85% 미만부터 치유', fx: { vRegenAll: 0.12, healBelowAdd: 0.1 } },
    reso: { branch: 'w_warlord', name: '광기에 물든 검', desc: '반격 피해 +80% · 반격 확률 +10% · 공격력 +22%', hero: { counterDmg: 0.8, counterPct: 0.1, atkPct: 0.22 } },
  },
  champ_sanctum_boss3: { // 심처의 봉인자 카탈 — 범용
    tag: '보호막 특화', stat: { hp: 1.15, heal: 0.95 },
    basics: [KS('k_katal_1', '봉인 결계', 'shield', 3, 1.5), KS('k_katal_2', '심연의 손길', 'heal', 3, 1.4)],
    sig: SG('k_katal_s', '봉인 장막', '회복 + 큰 보호막', 'healShield', 5, 1.6, { shieldV: 1.8 }),
    passive: { name: '심연의 맥동', desc: '사역마 턴마다 아군 전원을 회복력 10%만큼 회복 · 치유량의 30%만큼 보호막', fx: { vRegenAll: 0.1, healShield: 0.3 } },
  },
  champ_dawn_boss3: { // 정원의 마녀 루미엘 — 범용
    tag: '즉시 대회복', stat: { hp: 0.9, heal: 1.15 },
    basics: [KS('k_lumiel_1', '은총의 빛', 'heal', 2, 1.3), KS('k_lumiel_2', '정화의 노래', 'healAll', 4, 0.9)],
    sig: SG('k_lumiel_s', '대천사의 손길', '즉시 대회복', 'bigHeal', 5, 2.6),
    passive: { name: '대천사의 은총', desc: '사역마 턴마다 아군 전원을 회복력 15%만큼 회복', fx: { vRegenAll: 0.15 } },
  },
  champ_dawn_boss4: { // 여명의 신 솔라리온 — 범용
    tag: '공격 강화', stat: { heal: 0.9, atk: 2.5 },
    basics: [KS('k_solar_1', '여명의 빛', 'heal', 3, 1.3), KS('k_solar_2', '태양 창', 'strike', 2, 2.4)],
    sig: SG('k_solar_s', '여명의 축복', '회복 + 큰 공격 강화', 'healBuff', 5, 1.2, { buff: 0.25, turns: 4 }),
    passive: { name: '여명의 순환', desc: '사역마 턴마다 아군 전원을 회복력 10%만큼 회복 · 치명타 확률 +10%', fx: { vRegenAll: 0.1, critAdd: 0.1 } },
  },
  // ── 맹공 ──
  champ_forest_boss4: { // 종말의 마에스트로 오르페인 — 저주술사
    tag: '지속 피해', stat: { atk: 0.88 },
    basics: [KS('k_orph_1', '불협화음', 'dot', 2, 0.7, { turns: 3 }), KS('k_orph_2', '광기의 선율', 'aoe', 3, 0.95)],
    sig: SG('k_orph_s', '종말의 교향곡', '광역 지속 피해 + 취약', 'dot', 4, 0.7, { all: true, turns: 4, foeFx: { k: 'vuln', v: 0.08, t: 3, all: true } }),
    passive: { name: '종말의 악보', desc: '사역마의 지속 피해 +20% · 방어 10% 무시', fx: { dotDmg: 0.2, armorPen: 0.1 } },
    reso: { branch: 's_hex', name: '저주의 지휘자', desc: '지속 피해 +45% · 스킬 피해 +15% · 받는 피해 -25% · 매 턴 HP 4% 재생 · 오르페인이 적 공격의 60%를 대신 받는다 (체력 +80% · 방어 +50%)', hero: { dotDmg: 0.45, skillDmg: 0.15, dmgReduce: 0.25, regenPct: 0.04 }, fam: { guard: 0.6, hp: 1.8, def: 1.5, atk: 1.15 } },
  },
  champ_rift_boss3: { // 심장의 마왕 — 성기사
    tag: '처형', stat: { atk: 1.1, hp: 0.9 },
    basics: [KS('k_heart_1', '마왕의 손톱', 'strike', 2, 2.4), KS('k_heart_2', '심장 꿰뚫기', 'breakStrike', 3, 1.8, { dv: 0.2, turns: 2 })],
    sig: SG('k_heart_s', '마왕의 처형', '처형', 'executeStrike', 4, 3.5),
    passive: { name: '마왕의 안목', desc: '적 방어 30% 무시 · 치명타 확률 +15% · HP 30% 미만 적에게 피해 +30%', fx: { armorPen: 0.3, critAdd: 0.15, execute: 0.3 } },
    reso: { branch: 'w_paladin', name: '성기사의 검', desc: '공격력 +30% · 사역마 공격력 +60%', hero: { atkPct: 0.3 }, fam: { atk: 1.6 } },
  },
  champ_frost_boss3: { // 협곡의 한기룡 스칼드라 — 혈귀
    tag: '방어 파괴', stat: { hp: 1.1, atk: 0.95 },
    basics: [KS('k_skal_1', '한기 발톱', 'multi', 2, 0.9, { hits: 3 }), KS('k_skal_2', '꼬리 휩쓸기', 'aoe', 3, 1.4)],
    sig: SG('k_skal_s', '한기룡의 브레스', '광역 + 방어 파괴', 'aoe', 4, 2.1, { foeFx: { k: 'armorBreak', v: 0.4, t: 4, all: true } }),
    passive: { name: '한기룡의 눈', desc: '치명타 확률 +20% · 치명타 피해 +50%', fx: { critAdd: 0.2, critMultAdd: 0.5 } },
    reso: { branch: 'd_reaper', name: '피에 굶주린 용', desc: '치명타 피해 +80% · 방어 무시 +20%', hero: { critDmg: 0.8, armorPen: 0.2 } },
  },
  champ_rift_boss4: { // 마왕의 화신 — 역병기사
    tag: '약화', stat: { hp: 1.15, atk: 0.9 },
    basics: [KS('k_avatar_1', '공포의 시선', 'weakStrike', 3, 1.6, { dv: 0.2, turns: 2 }), KS('k_avatar_2', '암흑 파동', 'aoe', 3, 1.3)],
    sig: SG('k_avatar_s', '화신의 공포', '광역 + 공격 약화', 'aoe', 4, 2.2, { foeFx: { k: 'weak', v: 0.35, t: 4, all: true } }),
    passive: { name: '화신의 안목', desc: '적 방어 20% 무시 · 준 피해의 15%만큼 회복', fx: { armorPen: 0.2, lifesteal: 0.15 } },
    reso: { branch: 'd_plague', name: '역병의 군주', desc: '지속 피해 +40% · 공격력 +10% · 받는 피해 -8%', hero: { dotDmg: 0.4, atkPct: 0.1, dmgReduce: 0.08 } },
  },
  p3_m_boss: { // 기억의 군주 므네메 — 저격수
    tag: '취약 표식', stat: { atk: 1.05, hp: 0.95 },
    basics: [KS('k_mneme_1', '기억의 화살', 'strike', 2, 2.3), KS('k_mneme_2', '망각의 가시', 'dot', 3, 0.7, { turns: 3 })],
    sig: SG('k_mneme_s', '군주의 표식', '강타 + 취약 표식', 'markStrike', 3, 2.9, { dv: 0.4, turns: 4 }),
    passive: { name: '기억의 각인', desc: '치명타 확률 +15% · HP 30% 미만 적에게 피해 +25%', fx: { critAdd: 0.15, execute: 0.25 } },
    reso: { branch: 'e_sniper', name: '표식의 사수', desc: '치명타 피해 +60% · HP 30% 미만 적에게 피해 +30%', hero: { critDmg: 0.6, execute: 0.3 } },
  },
  p3_o_first: { // 최초의 황혼 오르페 — 대주교
    tag: '폭딜', stat: { atk: 1.1, hp: 0.85 },
    basics: [KS('k_orphe_1', '황혼 베기', 'strike', 2, 2.5), KS('k_orphe_2', '황혼의 춤', 'multi', 3, 1.0, { hits: 3 })],
    sig: SG('k_orphe_s', '최초의 황혼', '일격 + 자기 강화', 'strike', 4, 3.7, { selfBuff: { v: 0.25, t: 3 } }),
    passive: { name: '황혼의 계승', desc: '치명타 확률 +10% · 치명타 피해 +40% · 단일 공격 뒤 25% 확률로 추가 타격', fx: { critAdd: 0.1, critMultAdd: 0.4, chain: 0.25 } },
    reso: { branch: 'p_arch', name: '축복받은 황혼', desc: '사역마 공격력 +90% · 회복량 +15%', hero: { healPct: 0.15 }, fam: { atk: 1.9 } },
  },
  p3_m_keeper: { // 기록 관리자 아르케 — 범용
    tag: '광역 마법', stat: { hp: 0.95 },
    basics: [KS('k_arche_1', '금서의 불길', 'aoe', 2, 1.2), KS('k_arche_2', '저주받은 문장', 'dot', 3, 0.6, { all: true, turns: 3 })],
    sig: SG('k_arche_s', '기록 말소', '광역 대폭발', 'aoe', 4, 2.6),
    passive: { name: '관리자의 권한', desc: '사역마 스킬 피해 +25%', fx: { skillDmg: 0.25 } },
  },
  p3_v_heart: { // 공허의 심장 에레보스 — 범용
    tag: '흡혈', stat: { hp: 1.3, atk: 0.9 },
    basics: [KS('k_ereb_1', '공허 포식', 'lifesteal', 2, 2.0, { steal: 0.6 }), KS('k_ereb_2', '심장 박동', 'aoe', 3, 1.2)],
    sig: SG('k_ereb_s', '공허의 심장', '흡혈 일격 + 자기 강화', 'lifesteal', 4, 3.2, { steal: 1.0, selfBuff: { v: 0.2, t: 3 } }),
    passive: { name: '공허의 맥동', desc: '준 피해의 20%만큼 회복 · 매 턴 HP 3% 재생', fx: { lifesteal: 0.2, regenPct: 0.03 } },
  },
  p3_o_boss: { // 황혼의 근원 아이온 — 범용
    tag: '연타', stat: { atk: 1.05 },
    basics: [KS('k_aion_1', '황혼 연격', 'multi', 2, 0.8, { hits: 4 }), KS('k_aion_2', '근원의 창', 'strike', 3, 2.6)],
    sig: SG('k_aion_s', '근원의 붕괴', '6연타', 'multi', 4, 0.9, { hits: 6 }),
    passive: { name: '근원의 맥', desc: '단일 공격 뒤 35% 확률로 추가 타격 · 치명타 확률 +10%', fx: { chain: 0.35, critAdd: 0.1 } },
  },
};
// 키트는 「자령으로 소환된」 사역마만 (베이스 자령)
export const famKit = (key, f) => (FAM_KITS[key] && famHasPassive(key, f) ? FAM_KITS[key] : null);
// ── 직업 공명 (1.293.0) — 청령·남령 출신 사역마는 「전승 전 직업」 하나에 특화. 그 직업(전승 갈래 포함)이 동행으로 데려갈 때만.
// PM 결정: 등급별 차등은 확실하게 — 청령 ×1 · 남령 ×2.5 · (진화로) 자령 ×3.5. 자령 출신은 위의 갈래 공명(FAM_KITS).
export const CLASS_RESO_TIER = { blue: 1, indigo: 2.5, violet: 3.5 };
export const CLASS_RESO_ORDER = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
// 청령 기준 값 (hero = 주인공 합산 키 · famAtk = 사역마 공격력 가산 비율)
export const CLASS_RESO = {
  wanderer: { name: '검객의 벗', tank: { atkPct: 0.05, counterPct: 0.04 }, healer: { counterDmg: 0.12, atkPct: 0.04 }, dps: { atkPct: 0.05, counterDmg: 0.1 } },
  sage: { name: '마도의 벗', tank: { skillDmg: 0.05, dmgReduce: 0.06 }, healer: { skillDmg: 0.05, regenPct: 0.01 }, dps: { skillDmg: 0.05, dotDmg: 0.08 } },
  demonblood: { name: '피의 맹우', tank: { atkPct: 0.05, dmgReduce: 0.03 }, healer: { atkPct: 0.04, regenPct: 0.01 }, dps: { atkPct: 0.05, critDmg: 0.1 } },
  elf: { name: '숲의 벗', tank: { atkPct: 0.05, dmgReduce: 0.04 }, healer: { atkPct: 0.05, regenPct: 0.01 }, dps: { chain: 0.05, critDmg: 0.1 } },
  priest: { name: '여명의 벗', tank: { atkPct: 0.06, dmgReduce: 0.03 }, healer: { healPct: 0.08, atkPct: 0.04 }, dps: { atkPct: 0.06, famAtk: 0.1 } },
};
const CLASS_RESO_LABEL = { atkPct: ['공격력', '+'], skillDmg: ['스킬 피해', '+'], dotDmg: ['지속 피해', '+'], critDmg: ['치명타 피해', '+'], chain: ['추가 타격 확률', '+'], counterPct: ['반격 확률', '+'], counterDmg: ['반격 피해', '+'], healPct: ['회복량', '+'], dmgReduce: ['받는 피해', '-'], regenPct: ['매 턴 HP 재생', '+'], famAtk: ['사역마 공격력', '+'] };
const CLASS_KO = { wanderer: '방랑검사', sage: '술법사', demonblood: '혼혈 마족', elf: '숲의 정령사', priest: '여명의 사제' };
// 사역마 → 특화 직업 (저장 안 함). 출신 등급·역할 묶음 안에서 이름순으로 5직업에 고르게 나눈다.
let _resoCls = null;
export function famResoClass(key) {
  if (!_resoCls) {
    _resoCls = {};
    const keys = new Set();
    for (const f of CHRONICLE_FIELDS) { for (const k of f.elites || []) keys.add(k); keys.add(f.boss); }
    const groups = {};
    for (const k of [...keys].sort()) {
      const g = famNaturalGrade(k);
      if (!ENEMIES[k] || FAM_KITS[k] || (g !== 'blue' && g !== 'indigo')) continue;
      (groups[`${g}|${famRole(k)}`] ||= []).push(k);
    }
    let off = 0;
    for (const gk of Object.keys(groups).sort()) { groups[gk].forEach((k, i) => { _resoCls[k] = CLASS_RESO_ORDER[(i + off) % 5]; }); off += groups[gk].length; }
  }
  return _resoCls[key] || null;
}
function classReso(key, f, cls) {
  const rc = famResoClass(key); const tier = CLASS_RESO_TIER[f?.grade];
  if (!rc || !tier) return null;
  const base = CLASS_RESO[rc][famRole(key)] || {};
  const hero = {}; const fam = {}; const parts = [];
  for (const [k, v0] of Object.entries(base)) {
    const v = Math.round(v0 * tier * 1000) / 1000;
    if (k === 'famAtk') fam.atk = 1 + v; else hero[k] = v;
    const [l, sg] = CLASS_RESO_LABEL[k] || [k, '+'];
    parts.push(`${l} ${sg}${Math.round(v * 1000) / 10}%`);
  }
  return { cls: rc, clsName: CLASS_KO[rc], name: CLASS_RESO[rc].name, desc: parts.join(' · '), hero, fam, tier, on: !!cls && cls === rc };
}
// 공명 → { name, desc, branch | cls, hero, fam, on }
//   자령 출신 = 짝 갈래(branch) · 청령·남령 출신 = 전승 전 직업(cls — 그 직업의 전승 갈래도 포함)
export function famReso(key, f, branch, cls = null) {
  const k = famKit(key, f);
  if (k?.reso) return { ...k.reso, on: !!branch && branch === k.reso.branch };
  if (k) return null;
  return classReso(key, f, cls);
}
// 주인공 쪽 공명 값 (engine deriveUnit) — 동행 칸의 사역마만
export function famResoHeroFx(fams, mainKey, branch, cls = null) {
  const r = mainKey && fams?.[mainKey] ? famReso(mainKey, fams[mainKey], branch, cls) : null;
  return r?.on ? r.hero || {} : {};
}
// 갈래 → 짝 자령 키
export const famResoPartner = (branch) => Object.keys(FAM_KITS).find(k => FAM_KITS[k].reso?.branch === branch) || null;

// 초월 스킬 — 초월 +5에서 열리는 세 번째 스킬 (역할별 · 기존 고유 스킬과 같은 발동 규칙)
export const FAM_TRANS_SKILLS = {
  tank: { id: 'trans_tank', trans: true, sig: true, cls: 'fam', reqLv: 1, kind: 'fortify', name: '불멸의 맹세', type: '초월 · 방어 강화', cd: 5, base: 0.5, perLv: 0, red: 0.2, turns: 4 },
  healer: { id: 'trans_healer', trans: true, sig: true, cls: 'fam', reqLv: 1, kind: 'healShield', name: '윤회의 빛', type: '초월 · 회복 + 보호막', cd: 5, base: 0.9, perLv: 0, shieldV: 0.9 },
  dps: { id: 'trans_dps', trans: true, sig: true, cls: 'fam', reqLv: 1, kind: 'executeStrike', name: '종언의 일격', type: '초월 · 처형', cd: 4, base: 2.8, perLv: 0 },
};
export const famHasTransSkill = (f) => f?.grade === 'violet' && famTrans(f) >= FAM_TRANS.skillAt;
export const famTransSkill = (key) => FAM_TRANS_SKILLS[famRole(key)];

// 동행 스킬 상세 (1.217.0) — 효과 · 재사용 · 발동 조건 (engine chooseSkill 순서와 같은 말로)
const FAM_SKILL_WHEN = {
  duel: '도발당하지 않은 적이 있을 때 (최우선)',
  warcry: '적이 2명 이상이거나 도발된 적이 없을 때 (최우선)',
  cover: '주인공 HP가 85% 미만이고 보호 중이 아닐 때 (최우선)',
  fortify: '주인공에게 방어 강화가 없을 때 (최우선)',
  bigHeal: 'HP가 75% 미만인 아군이 있을 때 (최우선)',
  hot: 'HP 80% 미만이면서 지속 회복이 없는 아군이 있을 때 (최우선)',
  healShield: 'HP 65% 미만인 아군이 있을 때 (최우선)',
  healBuff: 'HP 75% 미만인 아군이 있거나 공격 강화가 꺼져 있을 때 (최우선)',
  breakStrike: '준비되면 바로 (최우선)', weakStrike: '준비되면 바로 (최우선)', markStrike: '준비되면 바로 (최우선)', executeStrike: '준비되면 바로 (최우선)',
  sigDot: '준비되면 바로 (최우선)',
  taunt: '준비되면 바로 사용 (최우선 · 전투 시작부터 2턴 도발 상태)',
  heal: 'HP가 75% 미만인 아군(주인공·자신)이 있을 때 — 비율이 가장 낮은 쪽을 회복',
  shield: '주인공 보호막이 최대 HP의 10% 미만일 때 (다시 씌워 갱신)',
  aoe: '살아 있는 적이 2명 이상일 때',
  strike: '다른 조건이 맞지 않을 때 — 준비된 단일 공격 중 위력이 가장 높은 것',
  multi: '다른 조건이 맞지 않을 때 — 준비된 단일 공격 중 위력이 가장 높은 것',
};
export function famSkillInfo(key, f) {
  const roleId = famRole(key);
  const role = FAM_ROLES[roleId];
  const lv = famGradeIdx(f.grade) + 1;
  const pct = (x) => `${Math.round(x * 100)}%`;
  const sig = famSignature(key, f.grade);
  const sigLocked = !famHasSignature(key, f);
  // 1.225.1 — 남령 미만은 고유 스킬을 목록에서 뺀다 (전투에서도 쓰지 않음 · 화면엔 안내 한 줄만)
  const kit = famKit(key, f);
  return [...(famHasTransSkill(f) ? [famTransSkill(key)] : []), ...(sigLocked ? [] : [sig]), ...(kit ? kit.basics : FAM_SKILLS[roleId])].map(s => {
    const sv = Math.max(lv, FAM_SIG_MIN_GRADE + 1);
    const v = s.base + s.perLv * ((s.sig ? sv : lv) - 1);
    let effect = '';
    switch (s.kind) {
      case 'lifesteal': effect = `적 1명에게 공격력 ${pct(v)} 피해 — 준 피해의 ${pct(s.steal)}만큼 사역마 회복`; break;
      case 'healAll': effect = `아군 전원 회복 — 사역마 회복력 ${pct(v)}`; break;
      case 'duel': effect = `가장 강한 적 1명을 ${s.turns}턴 동안 도발 — 그 적은 사역마만 공격. 그동안 사역마 방어 +${pct(v)}`; break;
      case 'warcry': effect = `적 전원을 ${s.turns}턴 동안 도발 — 모든 적이 사역마만 공격. 방어 +${pct(v)}`; break;
      case 'cover': effect = `${s.turns}턴 동안 주인공이 받는 피해의 ${pct(v)}를 사역마가 대신 받음`; break;
      case 'fortify': effect = `${s.turns}턴 동안 주인공 방어 +${pct(v)} · 받는 피해 -${pct(s.red)}`; break;
      case 'bigHeal': effect = `HP 비율이 가장 낮은 아군을 회복력 ${pct(v)}만큼 즉시 회복`; break;
      case 'hot': effect = `아군 1명에게 ${s.turns}턴 동안 매 턴 회복력 ${pct(v)} 회복`; break;
      case 'healShield': effect = `아군 1명 회복력 ${pct(v)} 회복 + 회복력 ${pct(s.shieldV)} 보호막`; break;
      case 'healBuff': effect = `아군 1명 회복력 ${pct(v)} 회복 + 아군 전원 공격력 +${pct(s.buff)} (${s.turns}턴)`; break;
      case 'breakStrike': effect = `적 1명에게 공격력 ${pct(v)} 피해 + 방어 -${pct(s.dv)} (${s.turns}턴)`; break;
      case 'weakStrike': effect = `적 1명에게 공격력 ${pct(v)} 피해 + 그 적의 공격력 -${pct(s.dv)} (${s.turns}턴)`; break;
      case 'markStrike': effect = `적 1명에게 공격력 ${pct(v)} 피해 + 받는 피해 +${pct(s.dv)} (${s.turns}턴, 주인공 공격 포함)`; break;
      case 'executeStrike': effect = `적 1명에게 공격력 ${pct(v)} 피해 — 대상 HP 35% 미만이면 2배`; break;
      case 'dot': if (s.all) { effect = `적 전체에 ${s.turns}턴 동안 매 턴 공격력 ${pct(v)} 지속 피해`; break; }
      // falls through
      case 'strike': effect = s.kind === 'dot' ? `적 1명에게 ${s.turns}턴 동안 매 턴 공격력 ${pct(v)} 지속 피해` : `적 1명(HP가 가장 낮은 적)에게 사역마 공격력 ${pct(v)} 피해`; break;
      case 'multi': effect = `적에게 ${s.hits}회 연속 공격, 1회당 공격력 ${pct(v)}`; break;
      case 'aoe': effect = `적 전체에게 공격력 ${pct(v)} 피해`; break;
      case 'taunt': effect = `${s.turns}턴 도발 — 적의 공격이 85% 확률로 사역마에게. 그동안 방어 +${pct(v)} · 받는 피해 -${pct(Math.min(0.5, (role.tauntReduce || 0) + 0.05 * (lv - 1)))}`; break;
      case 'heal': effect = `아군 1명 회복 — 사역마 회복력 ${pct(v)}`; break;
      case 'shield': effect = `아군 전원에게 보호막 — 사역마 회복력 ${pct(v)}`; break;
      default: effect = s.kind;
    }
    // 키트 부가 효과 (1.292.0)
    const FXN = { vuln: '받는 피해 +', weak: '공격력 -', armorBreak: '방어 -' };
    if (s.foeFx) effect += ` + ${s.foeFx.all ? '적 전원' : s.foeFx.forced ? '도발한 적' : '맞은 적'} ${FXN[s.foeFx.k]}${pct(s.foeFx.v)} (${s.foeFx.t}턴)`;
    if (s.teamBuff) effect += ` + 아군 전원 공격력 +${pct(s.teamBuff.v)} (${s.teamBuff.t}턴)`;
    if (s.selfBuff) effect += ` + 사역마 공격력 +${pct(s.selfBuff.v)} (${s.selfBuff.t}턴)`;
    return { id: s.id, name: s.name, kind: s.kind, cd: s.cd, effect, when: FAM_SKILL_WHEN[s.sig && s.kind === 'dot' ? 'sigDot' : s.kind] || '', sig: !!s.sig, trans: !!s.trans, sigType: s.trans || s.kit ? s.type : s.sig ? FAM_SIGS[s.sigId].type : null, locked: !!s.sig && !s.trans && sigLocked };
  });
}
// 동행 능력치 (주인공 대비 비율 — 등급·강화 반영)
export const famGuard = (key, f) => { const role = FAM_ROLES[famRole(key)]; return role.guard ? role.guard[famGradeIdx(f.grade)] + (famKit(key, f)?.passive?.fx?.guardianAdd || 0) : 0; };

// ===== 고유 스킬 (1.218.0 — 남령부터) =====
// 같은 역할이라도 사역마마다 다른 고유 스킬. 자령은 지속 턴 +1
// kind는 engine.js act()에서 처리 (duel/warcry/cover/fortify/bigHeal/hot/healShield/healBuff/breakStrike/weakStrike/markStrike/executeStrike/dot)
export const FAM_SIGS = {
  T1: { type: '단일 도발', kind: 'duel', name: '결투 신청', cd: 4, base: 0.2, perLv: 0.05, turns: 4 },
  T2: { type: '광역 도발', kind: 'warcry', name: '전장의 함성', cd: 4, base: 0.2, perLv: 0.05, turns: 2 },
  T3: { type: '보호', kind: 'cover', name: '수호 맹세', cd: 4, base: 0.45, perLv: 0.05, turns: 3 },
  T4: { type: '방어 강화', kind: 'fortify', name: '철벽 진형', cd: 4, base: 0.3, perLv: 0.06, red: 0.1, turns: 3 },
  H1: { type: '즉시 회복', kind: 'bigHeal', name: '생명의 분수', cd: 5, base: 1.0, perLv: 0.15 },
  H2: { type: '지속 회복', kind: 'hot', name: '재생의 씨앗', cd: 5, base: 0.18, perLv: 0.03, turns: 4 },
  H3: { type: '회복 + 보호막', kind: 'healShield', name: '축복의 장막', cd: 5, base: 0.4, perLv: 0.07, shieldV: 0.4 },
  H4: { type: '회복 + 공격 강화', kind: 'healBuff', name: '고양의 노래', cd: 5, base: 0.35, perLv: 0.06, buff: 0.12, turns: 3 },
  D1: { type: '방어 파괴', kind: 'breakStrike', name: '갑옷 부수기', cd: 3, base: 1.5, perLv: 0.15, dv: 0.35, turns: 3 },
  D2: { type: '공격 약화', kind: 'weakStrike', name: '기력 흡수', cd: 3, base: 1.2, perLv: 0.12, dv: 0.3, turns: 3 },
  D3: { type: '취약 표식', kind: 'markStrike', name: '사냥꾼의 표식', cd: 3, base: 1.0, perLv: 0.1, dv: 0.3, turns: 3 },
  D4: { type: '처형', kind: 'executeStrike', name: '처형', cd: 3, base: 1.8, perLv: 0.2 },
  D5: { type: '광역 지속 피해', kind: 'dot', all: true, name: '역병', cd: 4, base: 0.6, perLv: 0.08, turns: 4 },
};
const SIG_BY_ROLE = { tank: ['T1', 'T2', 'T3', 'T4'], healer: ['H1', 'H2', 'H3', 'H4'], dps: ['D1', 'D2', 'D3', 'D4', 'D5'] };
// 보스 출신 — 전용 이름
const BOSS_SIGS = {
  '망각의 봉인자': ['T1', '망각의 사슬'], '동굴의 빙왕 이스몬드': ['T2', '빙왕의 포효'], '절대봉인의 군주 아르케온': ['T3', '봉인의 맹세'], '절대영도의 여제 세릴': ['T4', '절대영도 결계'],
  '정원의 마녀 루미엘': ['H1', '대천사의 손길'], '광기의 마녀 벨라도나': ['H2', '광기의 영약'], '심처의 봉인자 카탈': ['H3', '봉인 장막'], '한기의 마녀': ['H4', '서리꽃 찬가'], '여명의 신 솔라리온': ['H4', '여명의 축복'],
  '협곡의 한기룡 스칼드라': ['D1', '한기룡의 브레스'], '마왕의 화신': ['D2', '화신의 공포'], '타락한 황혼의 자녀': ['D3', '황혼의 저주'], '심장의 마왕': ['D4', '마왕의 처형'],
  '종말의 마에스트로 오르페인': ['D5', '종말의 교향곡'], '마왕의 그림자': ['D2', '그림자 잠식'],
};
export const FAM_SIG_MIN_GRADE = 3; // 남령
export const FAM_PASSIVE_MIN_GRADE = 4; // 자령

// ===== 베이스 등급 (1.243.0 — PM 결정) =====
// 진화는 「같은 사역마의 등급」만 올린다 — 능력치·스킬 배율은 새 등급을 따르지만
// 고유 스킬(남령)·고유 패시브(자령)는 처음 얻은 등급(베이스)이 그 등급 이상일 때만 열린다.
// 베이스 = 소환된 등급 (같은 사역마를 더 높은 등급으로 다시 뽑으면 갱신). 구 저장은 출신 한계와 현재 등급 중 낮은 쪽.
let _natural = null;
export function famNaturalGrade(key) {
  if (!_natural) {
    _natural = {};
    const put = (k, g) => { if (k && famGradeIdx(g) > famGradeIdx(_natural[k] || 'red')) _natural[k] = g; };
    for (const f of CHRONICLE_FIELDS) {
      for (const k of f.normals || []) put(k, 'green');
      for (const k of f.elites || []) put(k, f.part >= 3 ? 'indigo' : 'blue'); // 1.290.1 — 3부 강적은 남령
      put(f.boss, f.part >= 2 ? 'violet' : 'indigo');
    }
    for (const d of CHRONICLE_DUNGEONS) put(d.floors[d.floors.length - 1].enemies[0], 'violet');
  }
  return _natural[key] || 'violet';
}
export function famBaseGrade(key, f) {
  if (!f) return 'red';
  if (f.base) return f.base;
  const n = famNaturalGrade(key);
  return famGradeIdx(n) < famGradeIdx(f.grade) ? n : f.grade;
}
export const famHasSignature = (key, f) => famGradeIdx(f?.grade) >= FAM_SIG_MIN_GRADE && famGradeIdx(famBaseGrade(key, f)) >= FAM_SIG_MIN_GRADE;
export const famHasPassive = (key, f) => famGradeIdx(f?.grade) >= FAM_PASSIVE_MIN_GRADE && famGradeIdx(famBaseGrade(key, f)) >= FAM_PASSIVE_MIN_GRADE;

// ===== 자령 고유 패시브 (1.243.0) — 역할별 3종, 보스 출신은 전용 이름 =====
export const FAM_PASSIVES = {
  tank: { name: '수호신의 가호', vGuard: 0.2, desc: '전투당 1회 — 주인공이 쓰러질 피해를 받으면 대신 막아 HP 20%로 버틴다 (사역마가 살아 있을 때)' },
  healer: { name: '생명의 순환', vRegenAll: 0.15, desc: '사역마 턴마다 아군 전원을 회복력 15%만큼 회복' },
  dps: { name: '약점 간파', armorPen: 0.3, crit: 0.15, desc: '사역마 공격이 적 방어 30% 무시 · 치명타 확률 +15%' },
};
const BOSS_PASSIVE_NAMES = {
  '절대영도의 여제 세릴': '절대영도의 가호', '동굴의 빙왕 이스몬드': '빙왕의 수호', '절대봉인의 군주 아르케온': '봉인의 성채',
  '정원의 마녀 루미엘': '대천사의 은총', '광기의 마녀 벨라도나': '광기의 순환', '심처의 봉인자 카탈': '심연의 맥동', '여명의 신 솔라리온': '여명의 순환',
  '종말의 마에스트로 오르페인': '종말의 악보', '심장의 마왕': '마왕의 안목', '협곡의 한기룡 스칼드라': '한기룡의 눈', '마왕의 화신': '화신의 안목',
};
export function famPassive(key, f) {
  if (!famHasPassive(key, f)) return null;
  const kit = FAM_KITS[key];
  if (kit) return { name: kit.passive.name, desc: kit.passive.desc, kit: true, ...kit.passive.fx };
  const p = FAM_PASSIVES[famRole(key)];
  return { ...p, name: BOSS_PASSIVE_NAMES[ENEMIES[key]?.name] || p.name };
}
export function famSignatureId(key) {
  const b = BOSS_SIGS[ENEMIES[key]?.name];
  if (b) return b[0];
  const list = SIG_BY_ROLE[famRole(key)];
  let h = 7; for (const ch of key) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
// 실제 전투용 고유 스킬 객체 (자령은 지속 턴 +1)
export function famSignature(key, grade) {
  if (famGradeIdx(grade) >= FAM_PASSIVE_MIN_GRADE && FAM_KITS[key]) return FAM_KITS[key].sig;
  const id = famSignatureId(key);
  const d = FAM_SIGS[id];
  const b = BOSS_SIGS[ENEMIES[key]?.name];
  const violet = famGradeIdx(grade) >= 4;
  return { ...d, id: `sig_${id}`, sigId: id, sig: true, cls: 'fam', reqLv: 1, name: b ? b[1] : d.name, turns: d.turns ? d.turns + (violet ? 1 : 0) : undefined };
}

export const famName = (key) => ENEMIES[key]?.name || '사역마';
const plusMult = (f) => (1 + FAM_TUNING.plusStatPct * (f.plus || 0)) * (1 + FAM_TRANS.statPct * famTrans(f));
const powerMult = (f) => famGrade(f.grade).mult * plusMult(f);

// 동행 사역마의 실제 능력치 (1.226.0) — 사역마 실효 레벨의 기준 곡선 × 역할 × 등급·강화 × 사역마 장비 옵션(famPct)
// 주인공 직업·장비·특성은 반영하지 않는다 (같은 사역마는 누가 데려가도 같은 성능). 회복량은 고정 수치(PM 결정)
export function famStats(key, f, heroLv, famPct = 0) {
  const role = FAM_ROLES[famRole(key)];
  const eff = famEffLv(f, heroLv);
  const b = famBaseStats(eff);
  const m = powerMult(f) * (1 + famPct);
  const ks = famKit(key, f)?.stat || {}; // 자령 키트 — 같은 역할 안에서도 능력치가 조금씩 다르다 (1.292.0)
  return {
    lv: eff,
    maxHp: Math.round(b.hp * role.hp * (ks.hp || 1) * m),
    atk: Math.round(b.atk * role.atk * (ks.atk || 1) * m),
    healPower: Math.round(b.atk * (role.heal || 0.15) * (ks.heal || 1) * m),
    def: Math.round(b.def * role.def * (ks.def || 1) * Math.sqrt(m)),
    spd: +Math.max(5, b.spd - 2).toFixed(1),
  };
}
function passiveFields(key, f) {
  const p = famPassive(key, f);
  if (!p) return {};
  if (p.kit) { const { name, desc, kit, critAdd, critMultAdd, guardianAdd, ...fx } = p; return { vName: name, ...fx, ...(critAdd ? { crit: 0.08 + critAdd } : {}), ...(critMultAdd ? { critMult: 1.5 + critMultAdd } : {}), ...(guardianAdd ? { guardianAdd } : {}) }; }
  return { vName: p.name, ...(p.vGuard ? { vGuard: p.vGuard } : {}), ...(p.vRegenAll ? { vRegenAll: p.vRegenAll } : {}), ...(p.armorPen ? { armorPen: p.armorPen } : {}), ...(p.crit ? { crit: 0.08 + p.crit } : {}) };
}
export function famCombatant(key, f, hero, famPct = 0, branch = null) {
  const roleId = famRole(key);
  const role = FAM_ROLES[roleId];
  const st = famStats(key, f, hero.lv, famPct);
  const lv = famGradeIdx(f.grade) + 1;
  const kit = famKit(key, f);
  const reso = famReso(key, f, branch, hero.classId);
  const rf = reso?.on ? reso.fam || {} : {};
  const pf = passiveFields(key, f);
  if (rf.atk) st.atk = Math.round(st.atk * rf.atk);
  if (rf.hp) st.maxHp = Math.round(st.maxHp * rf.hp);
  if (rf.def) st.def = Math.round(st.def * rf.def);
  return {
    id: 'fam', fam: true, famKey: key, famRole: roleId, classId: hero.classId, name: famName(key), side: 'party', lv: st.lv, magic: true,
    maxHp: st.maxHp, hp: st.maxHp, atk: st.atk, healPower: st.healPower,
    def: st.def, spd: st.spd, crit: 0.08, critMult: 1.5, dodge: 0.05,
    tauntReduce: role.tauntReduce ? Math.min(0.5, role.tauntReduce + 0.05 * (lv - 1)) : 0,
    guardian: (role.guard ? role.guard[lv - 1] + (pf.guardianAdd || 0) : 0) + (rf.guard || 0), startTaunt: role.guard ? 2 : 0,
    skills: [...(famHasTransSkill(f) ? [{ s: famTransSkill(key), lv }] : []), ...(famHasSignature(key, f) ? [{ s: famSignature(key, f.grade), lv }] : []), ...(kit ? kit.basics : FAM_SKILLS[roleId]).map(s => ({ s, lv }))],
    ...pf,
    ...(reso?.on ? { resoName: reso.name, resoDesc: reso.desc } : {}),
  };
}
// 보조 사역마 → 주인공 패시브 합산 (등급별 값 × 강화 × 레벨 비례) + 재화 특성 1개 (1.225.0)
export function famSubValues(key, f, heroLv = 0) {
  const role = FAM_ROLES[famRole(key)];
  const gi = famGradeIdx(f.grade);
  const lm = subLvMult(f, heroLv);
  const out = {};
  for (const [k, arr] of Object.entries(role.sub)) { const v = arr[gi] * plusMult(f) * lm; if (v > 0) out[k] = v; }
  const ek = famEconId(key);
  out[ek] = (out[ek] || 0) + FAM_ECON[ek].v[gi] * plusMult(f) * lm;
  return out;
}
export function famSubFx(fams, keys, heroLv = 0) {
  const fx = {};
  for (const key of keys || []) {
    const f = key && fams?.[key];
    if (!f) continue;
    for (const [k, v] of Object.entries(famSubValues(key, f, heroLv))) fx[k] = (fx[k] || 0) + v;
  }
  return fx;
}
const SUB_LABEL = { expPct: '경험치 +', goldPct: '골드 +', dropPct: '아이템 획득 +', dmgReduce: '받는 피해 -', shieldPct: '전투 시작 보호막 (최대 HP) ', atkPct: '공격력 +', critDmg: '치명타 피해 +', healPct: '회복량 +', regenPct: '매 턴 HP 재생 ', emergencyHeal: 'HP 30% 미만 시 1회 회복 ' };
export function famSubText(key, f, heroLv = 0) {
  return Object.entries(famSubValues(key, f, heroLv)).map(([k, v]) => `${SUB_LABEL[k] || k}${Math.round(v * 1000) / 10}%`).join(' · ');
}
// 보조 효과 항목 목록 (1.244.0 — 칩·표 표시용) [{k, label, sign, v, text, econ}]
const subSign = (k) => { const t = (SUB_LABEL[k] || k).trim(); const c = t[t.length - 1]; return c === '+' || c === '-' ? c : ''; };
const pct1 = (v) => `${Math.round(v * 1000) / 10}%`;
export function famSubItems(key, f, heroLv = 0) {
  const ek = famEconId(key);
  return Object.entries(famSubValues(key, f, heroLv)).map(([k, v]) => ({
    k, v, label: famSubLabel(k), sign: subSign(k), text: `${subSign(k)}${pct1(v)}`, econ: k === ek, icon: k === ek ? FAM_ECON[ek].icon : '',
  }));
}
// 후보 vs 지금 칸 비교 (값은 클수록 좋다 — 받는 피해 감소도 감소량이 값)
export function famSubDelta(k, cand, cur) {
  const a = cand[k] || 0, b = cur?.[k] || 0;
  if (!cur) return null;
  if (a && !b) return { kind: 'new', text: '신규' };
  if (!a && b) return { kind: 'gone', text: `▼${Math.round(b * 1000) / 10} 사라짐` };
  const d = Math.round((a - b) * 1000) / 10;
  if (Math.abs(d) < 0.05) return null;
  return d > 0 ? { kind: 'up', text: `▲${d}` } : { kind: 'down', text: `▼${-d}` };
}
// 다음 등급에서 새로 생기는 보조 효과 (청령부터) — UI 안내용
export function famSubPreview(key) {
  const role = FAM_ROLES[famRole(key)];
  const ek = famEconId(key);
  const subs = { ...role.sub, [ek]: FAM_ECON[ek].v };
  return FAM_GRADES.map((g, gi) => ({ grade: g, vals: Object.fromEntries(Object.entries(subs).map(([k, arr]) => [k, arr[gi]]).filter(([, v]) => v > 0)) }));
}
export const famSubKeys = (key) => [...Object.keys(FAM_ROLES[famRole(key)].sub), famEconId(key)];
export const famSubLabel = (k) => (SUB_LABEL[k] || k).replace(/[ +-]+$/, '');

// ===== 소환 풀 — 진행한 지역 적만 =====
export function famPool(progress) {
  const cleared = progress?.bossCleared || {};
  const open = CHRONICLE_FIELDS.filter(f => f.id === 1 || cleared[f.id - 1]);
  const uniq = (a) => [...new Set(a)].filter(k => ENEMIES[k]);
  const dungeonBosses = CHRONICLE_DUNGEONS.filter(d => progress?.dungeonTier?.[d.id] != null).map(d => d.floors[d.floors.length - 1].enemies[0]);
  const p2Bosses = CHRONICLE_FIELDS.filter(f => f.part >= 2 && cleared[f.id]).map(f => f.boss);
  return {
    red: uniq(open.flatMap(f => f.normals)),
    green: uniq(open.flatMap(f => f.normals)),
    blue: uniq(open.filter(f => !(f.part >= 3)).flatMap(f => f.elites)),
    // 1.290.1 PM 결정 — 남령 = 처치한 1부 보스 + 열린 3부 지역의 강적 (4종 → 최대 13종)
    indigo: uniq([...CHRONICLE_FIELDS.filter(f => !f.part && cleared[f.id]).map(f => f.boss), ...open.filter(f => f.part >= 3).flatMap(f => f.elites)]),
    violet: uniq([...dungeonBosses, ...p2Bosses]),
  };
}
const pickR = (rng, a) => a[Math.floor(rng() * a.length)];
function rollGradeId(rng, minIdx = 0) {
  const gs = FAM_GRADES.slice(minIdx);
  const tot = gs.reduce((s, g) => s + g.rate, 0);
  let r = rng() * tot;
  for (const g of gs) { r -= g.rate; if (r <= 0) return g.id; }
  return gs[gs.length - 1].id;
}
// 풀이 빈 등급은 한 단계씩 내려간다 (예: 아직 보스를 못 잡았으면 남령 → 청령)
function availableGrade(pool, gid) {
  for (let i = famGradeIdx(gid); i >= 0; i--) if (pool[FAM_GRADES[i].id].length) return FAM_GRADES[i].id;
  return 'red';
}

// 소환 n회 → { fams, pity, results[{key, grade, isNew, upgraded, soul}], souls }
// fams: { [enemyKey]: { grade, plus } } · pity: { total, sinceViolet }
export function summonFamiliars(fams0, pity0, progress, n, rng = Math.random) {
  const fams = { ...fams0 };
  const pity = { total: 0, sinceViolet: 0, ...pity0 };
  const pool = famPool(progress);
  const results = [];
  let souls = 0;
  const violetOpen = pool.violet.length > 0;
  for (let i = 0; i < n; i++) {
    let gid = rollGradeId(rng);
    pity.total += 1;
    if (violetOpen) pity.sinceViolet += 1;
    if (violetOpen && pity.sinceViolet >= FAM_TUNING.violetPity) gid = 'violet';
    // 10연 마지막 칸: 청령 이상이 하나도 없으면 확정
    if (n >= 10 && i === n - 1 && !results.some(r => famGradeIdx(r.grade) >= famGradeIdx(FAM_TUNING.tenPullGuarantee)) && famGradeIdx(gid) < famGradeIdx(FAM_TUNING.tenPullGuarantee)) {
      gid = rollGradeId(rng, famGradeIdx(FAM_TUNING.tenPullGuarantee));
    }
    gid = availableGrade(pool, gid);
    if (gid === 'violet') pity.sinceViolet = 0;
    const key = pickR(rng, pool[gid]);
    const have = fams[key];
    const r = { key, grade: gid, isNew: !have, upgraded: false, soul: 0 };
    if (!have) fams[key] = { grade: gid, base: gid, plus: 0, lv: 1, exp: 0 };
    else if (famGradeIdx(gid) > famGradeIdx(have.grade)) { fams[key] = { ...have, grade: gid, base: gid }; r.upgraded = true; }
    else if (famGradeIdx(gid) > famGradeIdx(famBaseGrade(key, have))) fams[key] = { ...have, base: gid }; // 진화로 넘은 등급을 소환으로 다시 뽑으면 베이스 회복
    else { r.soul = famGrade(gid).dupSoul; souls += r.soul; }
    results.push(r);
  }
  return { fams, pity, results, souls };
}

// 강화 → { fams, souls, ok }
export function enhanceFamiliar(fams, souls, key) {
  const f = fams[key];
  if (!f || f.plus >= FAM_TUNING.maxPlus) return { fams, souls, ok: false };
  const c = FAM_TUNING.enhanceCost(f.plus, f.grade);
  if (souls < c) return { fams, souls, ok: false };
  return { fams: { ...fams, [key]: { ...f, plus: f.plus + 1 } }, souls: souls - c, ok: true };
}
// 진화 → { fams, souls, result: 'success'|'fail'|null }
export function evolveFamiliar(fams, souls, key, rng = Math.random) {
  const f = fams[key];
  const gi = f ? famGradeIdx(f.grade) : -1;
  if (!f || f.plus < FAM_TUNING.maxPlus || gi >= FAM_GRADES.length - 1) return { fams, souls, result: null };
  const c = FAM_TUNING.evolveCost(f.grade);
  if (souls < c) return { fams, souls, result: null };
  if (rng() < famEvolveRate(f)) return { fams: { ...fams, [key]: { ...f, grade: FAM_GRADES[gi + 1].id, plus: 0, evoFails: 0 } }, souls: souls - c, result: 'success' };
  return { fams: { ...fams, [key]: { ...f, plus: Math.max(0, f.plus - famEvolveFailDrop(f.grade)), evoFails: (f.evoFails || 0) + 1 } }, souls: souls - c, result: 'fail' };
}
export const famEvolveFailDrop = (g) => FAM_TUNING.evolveFailDropBy?.[g] ?? FAM_TUNING.evolveFailDrop;
// 지금 진화 성공률 = 등급 기본 + 실패 횟수 × 천장 보정 (최대 100%)
export function famEvolveRate(f) {
  const g = famGrade(f?.grade);
  return Math.min(1, (g.evolve || 0) + (f?.evoFails || 0) * (FAM_TUNING.evolvePityAdd[g.id] || 0));
}
// 이 등급에서 진화가 확정되는 최대 시도 횟수
export function famEvolveMaxTries(gradeId) {
  const g = famGrade(gradeId); const add = FAM_TUNING.evolvePityAdd[g.id] || 0;
  return add > 0 ? Math.ceil((1 - g.evolve) / add) + 1 : null;
}
// 🔮 사역혼 전투 드랍 (1.242.0)
export function rollFamSouls(enemies, type, rng, dungeonTier = 0) {
  const T = FAM_TUNING;
  if (type === 'boss') return T.soulBoss;
  if (type === 'towerBoss') return T.soulTowerBoss;
  if (type === 'dungeonBoss') return T.soulDungeonBoss[dungeonTier] || T.soulDungeonBoss[0];
  let n = 0;
  for (const e of enemies) {
    if (e.tier === 'elite') { if (rng() < T.soulElite) n += T.soulEliteN[0] + Math.floor(rng() * (T.soulEliteN[1] - T.soulEliteN[0] + 1)); }
    else if (rng() < T.soulNormal * (e.goldMult || 1)) n += 1;
  }
  return n;
}

// 전투 승리 시 계약서 조각
export function rollFamShards(enemies, type, rng, dungeonTier = 0) {
  if (type === 'boss') return FAM_TUNING.dropBoss;
  if (type === 'towerBoss') return FAM_TUNING.dropDungeonBoss[0];
  if (type === 'dungeonBoss') return FAM_TUNING.dropDungeonBoss[dungeonTier] || FAM_TUNING.dropDungeonBoss[0];
  let n = 0;
  for (const e of enemies) {
    if (e.tier === 'elite') { if (rng() < FAM_TUNING.dropElite) n += FAM_TUNING.dropEliteN[0] + Math.floor(rng() * (FAM_TUNING.dropEliteN[1] - FAM_TUNING.dropEliteN[0] + 1)); }
    else if (rng() < FAM_TUNING.dropNormal * (e.goldMult || 1)) n += 1; // 1.236.0 3마리 무리는 마리당 ×0.6
  }
  return n;
}

// ============================================
// 보유 효과 · 인연 (1.228.0 — PM: 남령부터 보유 효과 · 특정 사역마를 모으면 인연 보너스)
// 둘 다 「가지고만 있으면」 적용 (편성 무관) → engine deriveUnit이 장비 합산 키와 같은 곳에 더한다
// ============================================
export const FAM_OWN_MIN_GRADE = 3; // 남령부터
// 역할별 보유 효과 — [남령, 자령] × 강화(+5%/단계)
export const FAM_OWN = {
  tank: { hpPct: [0.015, 0.025], defPct: [0.015, 0.025] },
  dps: { atkPct: [0.015, 0.025], critDmg: [0.03, 0.05] },
  healer: { regenPct: [0.0008, 0.0013], dmgReduce: [0.006, 0.01] },
};
export function famOwnValues(key, f) {
  const gi = famGradeIdx(f?.grade);
  if (!f || gi < FAM_OWN_MIN_GRADE) return {};
  const out = {};
  for (const [k, arr] of Object.entries(FAM_OWN[famRole(key)])) out[k] = arr[gi - FAM_OWN_MIN_GRADE] * plusMult(f);
  return out;
}
// 보유 효과 합계 상한 — 극한 수집(전부 자령+10)이면 공격 +200%가 되므로 막는다. 후반 예상치(보스 자령+5)는 +25% 안팎
export const FAM_OWN_CAP = { atkPct: 0.3, hpPct: 0.3, defPct: 0.3, critDmg: 0.6, dmgReduce: 0.08, regenPct: 0.01 };
export function famOwnFx(fams) {
  const fx = {};
  for (const [key, f] of Object.entries(fams || {})) for (const [k, v] of Object.entries(famOwnValues(key, f))) fx[k] = (fx[k] || 0) + v;
  for (const k of Object.keys(fx)) if (FAM_OWN_CAP[k] != null) fx[k] = Math.min(FAM_OWN_CAP[k], fx[k]);
  return fx;
}

// 인연 — members 전원 보유 = 1단계 / 전원 tier2Grade 이상 + 강화 +5 이상 = 2단계 (효과 ×2)
const keyByName = (name) => Object.keys(ENEMIES).find(k => ENEMIES[k].name === name);
export const BOND_TIER2_PLUS = 5;
const REGION_BOND_FX = {
  1: { hpPct: 0.02 }, 2: { critDmg: 0.04 }, 3: { defPct: 0.03 }, 4: { atkPct: 0.02 }, 5: { dmgReduce: 0.01 }, 6: { crit: 0.01 },
  7: { regenPct: 0.001 }, 8: { atkPct: 0.02 }, 9: { hpPct: 0.02 }, 10: { expPct: 0.05 }, 11: { dodge: 0.01 }, 12: { famPct: 0.03 },
};
const PACK_BOND_FX = { 1: { goldPct: 0.03 }, 2: { expPct: 0.03 }, 3: { dropPct: 0.02 }, 4: { goldPct: 0.03 } };
const SPECIAL_BONDS = [
  { id: 'b_witches', name: '세 마녀', desc: '서리·광기·기억 — 세 시대의 마녀', names: ['한기의 마녀', '광기의 마녀 벨라도나', '회상의 마녀'], fx: { skillDmg: 0.03 } },
  { id: 'b_icethrone', name: '얼음 왕좌', desc: '동토를 다스린 세 군주', names: ['절대영도의 여제 세릴', '동굴의 빙왕 이스몬드', '협곡의 한기룡 스칼드라'], fx: { hpPct: 0.03 } },
  { id: 'b_demonline', name: '마왕의 계보', desc: '그림자에서 심장까지, 마왕의 핏줄', names: ['마왕의 그림자', '마왕의 화신', '심장의 마왕'], fx: { atkPct: 0.03 } },
  { id: 'b_heaven', name: '천상의 빛', desc: '여명을 지키던 천상의 존재들', names: ['여명의 신 솔라리온', '정원의 마녀 루미엘', '광휘의 대마법사'], fx: { dmgReduce: 0.015 } },
  { id: 'b_seal', name: '봉인의 맥', desc: '봉인을 지키고, 봉인에 갇힌 자들', names: ['망각의 봉인자', '절대봉인의 군주 아르케온', '심처의 봉인자 카탈'], fx: { defPct: 0.04 } },
];
const uniqKeys = (a) => [...new Set(a)].filter(k => k && ENEMIES[k]);
export const FAM_BONDS = [
  ...CHRONICLE_FIELDS.filter(f => !f.depth).map(f => ({ id: `b_field${f.id}`, kind: 'region', name: `${f.name}의 주인들`, desc: `${f.name}의 보스와 강적`, members: uniqKeys([f.boss, ...f.elites]), fx: REGION_BOND_FX[f.id] || { hpPct: 0.02 }, tier2Grade: 'indigo' })),
  ...CHRONICLE_FIELDS.filter(f => !f.depth && PACK_BOND_FX[f.id]).map(f => ({ id: `b_pack${f.id}`, kind: 'pack', name: `${f.name} 사냥 무리`, desc: `${f.name}의 일반 몹`, members: uniqKeys(f.normals), fx: PACK_BOND_FX[f.id], tier2Grade: 'blue' })),
  ...SPECIAL_BONDS.map(b => ({ ...b, kind: 'special', members: uniqKeys(b.names.map(keyByName)), tier2Grade: 'violet' })),
].filter(b => b.members.length >= 2);
export const FAM_BOND_KIND = { region: '지역 인연', pack: '사냥 무리', special: '특별 인연' };
export function bondTier(fams, bond) {
  const fs = bond.members.map(k => fams?.[k]);
  if (fs.some(f => !f)) return 0;
  const g2 = famGradeIdx(bond.tier2Grade);
  return fs.every(f => famGradeIdx(f.grade) >= g2 && (f.plus || 0) >= BOND_TIER2_PLUS) ? 2 : 1;
}
export function famBondFx(fams) {
  const fx = {};
  for (const b of FAM_BONDS) { const t = bondTier(fams, b); if (!t) continue; for (const [k, v] of Object.entries(b.fx)) fx[k] = (fx[k] || 0) + v * t; }
  return fx;
}
// 효과 문구 (보유 효과·인연 공용)
const FX_LABEL = {
  hpPct: ['최대 HP', '%'], defPct: ['방어', '%'], atkPct: ['공격력', '%'], critDmg: ['치명타 피해', '%'], crit: ['치명타 확률', '%'], dodge: ['회피', '%'],
  regenPct: ['매 턴 HP 재생', '%'], dmgReduce: ['받는 피해 감소', '%'], skillDmg: ['스킬 피해', '%'], expPct: ['경험치', '%'], goldPct: ['골드', '%'],
  dropPct: ['아이템 획득', '%'], famPct: ['사역마 능력치', '%'],
};
export function famFxText(fx) {
  return Object.entries(fx).filter(([, v]) => v).map(([k, v]) => `${(FX_LABEL[k] || [k])[0]} +${Math.round(v * 1000) / 10}%`).join(' · ');
}
