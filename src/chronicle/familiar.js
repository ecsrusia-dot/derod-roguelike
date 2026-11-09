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
  evolveFailDrop: 3,            // 진화 실패 시 강화 단계 하락
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
export function famBaseStats(lv) {
  const c = FAM_STAT_CURVE;
  const L = Math.max(1, Math.min(c[c.length - 1][0], lv));
  let i = 0;
  while (i < c.length - 2 && c[i + 1][0] < L) i++;
  const [l0, ...a] = c[i]; const [l1, ...b] = c[i + 1];
  const t = Math.max(0, Math.min(1, (L - l0) / (l1 - l0)));
  const v = a.map((x, k) => x + (b[k] - x) * t);
  return { hp: v[0], atk: v[1], def: v[2], spd: v[3] };
}
export const famLv = (f) => Math.max(1, f?.lv || 1);
export const famEffLv = (f, heroLv) => Math.min(famLv(f), Math.max(1, heroLv || 1));
const subLvMult = (f, heroLv) => (heroLv ? FAM_LEVEL.subMin + (1 - FAM_LEVEL.subMin) * (famEffLv(f, heroLv) / heroLv) : 1);
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
    label: '수호', icon: '🛡', color: '#9cc4e4', atk: 0.1, hp: 0.85, def: 1.3, tauntReduce: 0.2,
    // 수호 태세 — 살아 있는 동안 적의 단일 공격이 이 확률로 사역마에게 향한다 (등급별)
    guard: [0.35, 0.45, 0.55, 0.65, 0.75],
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
    label: '치유', icon: '✚', color: '#8fe08a', atk: 0.1, hp: 0.35, def: 0.6, heal: 0.2,
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
  '절대영도의 군주': 'tank', '동굴의 빙왕': 'tank', '절대봉인의 군주': 'tank',
  '심처의 봉인자': 'healer', '광기의 마녀': 'healer', '여명의 신': 'healer', '정원의 대천사': 'healer',
  '광기의 종말 마에스트로': 'dps', '심장의 마왕': 'dps', '협곡의 한기룡': 'dps', '마왕의 화신': 'dps',
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
export const FAM_SKILLS = {
  tank: [FS('f_guard', '수호의 포효', 'taunt', 3, 0.3, 0.1, { turns: 3 }), FS('f_bash', '몸통 박치기', 'strike', 2, 1.0, 0.12)],
  dps: [FS('f_bite', '물어뜯기', 'strike', 2, 1.6, 0.18), FS('f_frenzy', '난도질', 'multi', 3, 0.6, 0.08, { hits: 3 }), FS('f_blast', '마력 폭발', 'aoe', 4, 0.9, 0.12)],
  healer: [FS('f_mend', '치유의 숨결', 'heal', 3, 1.0, 0.12), FS('f_ward', '보호의 빛', 'shield', 4, 0.8, 0.12)],
};

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
  const sigLocked = lv - 1 < FAM_SIG_MIN_GRADE;
  // 1.225.1 — 남령 미만은 고유 스킬을 목록에서 뺀다 (전투에서도 쓰지 않음 · 화면엔 안내 한 줄만)
  return [...(sigLocked ? [] : [sig]), ...FAM_SKILLS[roleId]].map(s => {
    const sv = Math.max(lv, FAM_SIG_MIN_GRADE + 1);
    const v = s.base + s.perLv * ((s.sig ? sv : lv) - 1);
    let effect = '';
    switch (s.kind) {
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
      case 'dot': if (s.sig) { effect = `적 전체에 ${s.turns}턴 동안 매 턴 공격력 ${pct(v)} 지속 피해`; break; }
      // falls through
      case 'strike': effect = `적 1명(HP가 가장 낮은 적)에게 사역마 공격력 ${pct(v)} 피해`; break;
      case 'multi': effect = `적에게 ${s.hits}회 연속 공격, 1회당 공격력 ${pct(v)}`; break;
      case 'aoe': effect = `적 전체에게 공격력 ${pct(v)} 피해`; break;
      case 'taunt': effect = `${s.turns}턴 도발 — 적의 공격이 85% 확률로 사역마에게. 그동안 방어 +${pct(v)} · 받는 피해 -${pct(Math.min(0.5, (role.tauntReduce || 0) + 0.05 * (lv - 1)))}`; break;
      case 'heal': effect = `아군 1명 회복 — 사역마 회복력 ${pct(v)}`; break;
      case 'shield': effect = `아군 전원에게 보호막 — 사역마 회복력 ${pct(v)}`; break;
      default: effect = s.kind;
    }
    return { id: s.id, name: s.name, kind: s.kind, cd: s.cd, effect, when: FAM_SKILL_WHEN[s.sig && s.kind === 'dot' ? 'sigDot' : s.kind] || '', sig: !!s.sig, sigType: s.sig ? FAM_SIGS[s.sigId].type : null, locked: !!s.sig && sigLocked };
  });
}
// 동행 능력치 (주인공 대비 비율 — 등급·강화 반영)
export const famGuard = (key, f) => { const role = FAM_ROLES[famRole(key)]; return role.guard ? role.guard[famGradeIdx(f.grade)] : 0; };

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
  '망각의 봉인자': ['T1', '망각의 사슬'], '동굴의 빙왕': ['T2', '빙왕의 포효'], '절대봉인의 군주': ['T3', '봉인의 맹세'], '절대영도의 군주': ['T4', '절대영도 결계'],
  '정원의 대천사': ['H1', '대천사의 손길'], '광기의 마녀': ['H2', '광기의 영약'], '심처의 봉인자': ['H3', '봉인 장막'], '한기의 마녀': ['H4', '서리꽃 찬가'], '여명의 신': ['H4', '여명의 축복'],
  '협곡의 한기룡': ['D1', '한기룡의 브레스'], '마왕의 화신': ['D2', '화신의 공포'], '타락한 황혼의 자녀': ['D3', '황혼의 낙인'], '심장의 마왕': ['D4', '마왕의 처형'],
  '광기의 종말 마에스트로': ['D5', '종말의 교향곡'], '마왕의 그림자': ['D2', '그림자 잠식'],
};
export const FAM_SIG_MIN_GRADE = 3; // 남령
export function famSignatureId(key) {
  const b = BOSS_SIGS[ENEMIES[key]?.name];
  if (b) return b[0];
  const list = SIG_BY_ROLE[famRole(key)];
  let h = 7; for (const ch of key) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
// 실제 전투용 고유 스킬 객체 (자령은 지속 턴 +1)
export function famSignature(key, grade) {
  const id = famSignatureId(key);
  const d = FAM_SIGS[id];
  const b = BOSS_SIGS[ENEMIES[key]?.name];
  const violet = famGradeIdx(grade) >= 4;
  return { ...d, id: `sig_${id}`, sigId: id, sig: true, cls: 'fam', reqLv: 1, name: b ? b[1] : d.name, turns: d.turns ? d.turns + (violet ? 1 : 0) : undefined };
}

export const famName = (key) => ENEMIES[key]?.name || '사역마';
const plusMult = (f) => 1 + FAM_TUNING.plusStatPct * (f.plus || 0);
const powerMult = (f) => famGrade(f.grade).mult * plusMult(f);

// 동행 사역마의 실제 능력치 (1.226.0) — 사역마 실효 레벨의 기준 곡선 × 역할 × 등급·강화 × 사역마 장비 옵션(famPct)
// 주인공 직업·장비·특성은 반영하지 않는다 (같은 사역마는 누가 데려가도 같은 성능). 회복량은 고정 수치(PM 결정)
export function famStats(key, f, heroLv, famPct = 0) {
  const role = FAM_ROLES[famRole(key)];
  const eff = famEffLv(f, heroLv);
  const b = famBaseStats(eff);
  const m = powerMult(f) * (1 + famPct);
  return {
    lv: eff,
    maxHp: Math.round(b.hp * role.hp * m),
    atk: Math.round(b.atk * role.atk * m),
    healPower: Math.round(b.atk * (role.heal || 0.15) * m),
    def: Math.round(b.def * role.def * Math.sqrt(m)),
    spd: +Math.max(5, b.spd - 2).toFixed(1),
  };
}
export function famCombatant(key, f, hero, famPct = 0) {
  const roleId = famRole(key);
  const role = FAM_ROLES[roleId];
  const st = famStats(key, f, hero.lv, famPct);
  const lv = famGradeIdx(f.grade) + 1;
  return {
    id: 'fam', fam: true, famKey: key, famRole: roleId, classId: hero.classId, name: famName(key), side: 'party', lv: st.lv, magic: true,
    maxHp: st.maxHp, hp: st.maxHp, atk: st.atk, healPower: st.healPower,
    def: st.def, spd: st.spd, crit: 0.08, critMult: 1.5, dodge: 0.05,
    tauntReduce: role.tauntReduce ? Math.min(0.5, role.tauntReduce + 0.05 * (lv - 1)) : 0,
    guardian: role.guard ? role.guard[lv - 1] : 0, startTaunt: role.guard ? 2 : 0,
    skills: [...(famGradeIdx(f.grade) >= FAM_SIG_MIN_GRADE ? [{ s: famSignature(key, f.grade), lv }] : []), ...FAM_SKILLS[roleId].map(s => ({ s, lv }))],
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
    blue: uniq(open.flatMap(f => f.elites)),
    indigo: uniq(CHRONICLE_FIELDS.filter(f => !f.part && cleared[f.id]).map(f => f.boss)),
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
    if (!have) fams[key] = { grade: gid, plus: 0, lv: 1, exp: 0 };
    else if (famGradeIdx(gid) > famGradeIdx(have.grade)) { fams[key] = { ...have, grade: gid }; r.upgraded = true; }
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
  if (rng() < FAM_GRADES[gi].evolve) return { fams: { ...fams, [key]: { ...f, grade: FAM_GRADES[gi + 1].id, plus: 0 } }, souls: souls - c, result: 'success' };
  return { fams: { ...fams, [key]: { ...f, plus: Math.max(0, f.plus - FAM_TUNING.evolveFailDrop) } }, souls: souls - c, result: 'fail' };
}

// 전투 승리 시 계약서 조각
export function rollFamShards(enemies, type, rng, dungeonTier = 0) {
  if (type === 'boss') return FAM_TUNING.dropBoss;
  if (type === 'towerBoss') return FAM_TUNING.dropDungeonBoss[0];
  if (type === 'dungeonBoss') return FAM_TUNING.dropDungeonBoss[dungeonTier] || FAM_TUNING.dropDungeonBoss[0];
  let n = 0;
  for (const e of enemies) {
    if (e.tier === 'elite') { if (rng() < FAM_TUNING.dropElite) n += FAM_TUNING.dropEliteN[0] + Math.floor(rng() * (FAM_TUNING.dropEliteN[1] - FAM_TUNING.dropEliteN[0] + 1)); }
    else if (rng() < FAM_TUNING.dropNormal) n += 1;
  }
  return n;
}
