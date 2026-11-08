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
import { ENEMIES } from '../data/enemies.js';
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

// 역할 — 원본 적 이름으로 자동 결정
export const FAM_ROLES = {
  guard: { label: '수호', icon: '🛡', atk: 0.12, hp: 0.4, def: 0.8, sub: { dmgReduce: 0.02 }, subLabel: '받는 피해 감소' },
  fang: { label: '맹공', icon: '🗡', atk: 0.24, hp: 0.22, def: 0.4, sub: { atkPct: 0.025 }, subLabel: '공격력' },
  hex: { label: '주술', icon: '🔮', atk: 0.2, hp: 0.2, def: 0.3, sub: { skillDmg: 0.035 }, subLabel: '스킬 피해' },
  mend: { label: '치유', icon: '✚', atk: 0.1, hp: 0.25, def: 0.5, sub: { healPct: 0.04, regenPct: 0.003 }, subLabel: '회복량 · 매 턴 재생' },
  shade: { label: '교란', icon: '🌫', atk: 0.18, hp: 0.2, def: 0.4, sub: { dodge: 0.015 }, subLabel: '회피' },
};
const ROLE_WORDS = [
  ['guard', /거인|골렘|수호|갑주|감시자|기사|성전사|저거너트|광전사|트리언트/],
  ['mend', /정령|드라이어드|사제|천사|어머니|선견자|예언자|신탁/],
  ['hex', /마녀|마법사|무당|술사|봉인사|봉인자|마에스트로|군주|왕/],
  ['shade', /망령|망자|영혼|암살자|잠복자|그림자|화신|임프/],
  ['fang', /늑대|표범|호랑이|전사|약탈자|고블린|용|룡|키메라|포식자|살수|악마|마수|거미/],
];
export function famRole(key) {
  const name = ENEMIES[key]?.name || '';
  for (const [r, re] of ROLE_WORDS) if (re.test(name)) return r;
  const roles = Object.keys(FAM_ROLES);
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return roles[h % roles.length];
}

// 역할별 동행 스킬 (Lv = 등급 순서 1~5)
const FS = (id, name, kind, cd, base, perLv, extra = {}) => ({ id, cls: 'fam', name, kind, reqLv: 1, cd, base, perLv, ...extra });
export const FAM_SKILLS = {
  guard: [FS('f_guard', '수호의 포효', 'taunt', 4, 0.3, 0.08, { turns: 2 }), FS('f_bash', '몸통 박치기', 'strike', 2, 1.2, 0.15)],
  fang: [FS('f_bite', '물어뜯기', 'strike', 2, 1.6, 0.18), FS('f_frenzy', '난도질', 'multi', 3, 0.6, 0.08, { hits: 3 })],
  hex: [FS('f_curse', '저주', 'dot', 4, 0.45, 0.07, { turns: 3, all: true }), FS('f_blast', '마력 폭발', 'aoe', 4, 0.9, 0.12)],
  mend: [FS('f_mend', '치유의 숨결', 'heal', 3, 1.0, 0.15), FS('f_ward', '보호의 빛', 'shield', 5, 0.8, 0.12)],
  shade: [FS('f_venom', '그림자 독', 'dot', 3, 0.7, 0.1, { turns: 3 }), FS('f_rend', '찢어발기기', 'multi', 3, 0.5, 0.07, { hits: 2 })],
};

export const famName = (key) => ENEMIES[key]?.name || '사역마';
const powerMult = (f) => famGrade(f.grade).mult * (1 + FAM_TUNING.plusStatPct * (f.plus || 0));

// 동행 사역마 → 전투 유닛 (주인공 능력치에 비례 — 사역마 레벨 없음)
export function famCombatant(key, f, hero, famPct = 0) {
  const role = FAM_ROLES[famRole(key)];
  const m = powerMult(f) * (1 + famPct);
  const maxHp = Math.round(hero.maxHp * role.hp * m);
  const lv = famGradeIdx(f.grade) + 1;
  return {
    id: 'fam', fam: true, famKey: key, classId: hero.classId, name: famName(key), side: 'party', lv: hero.lv, magic: true,
    maxHp, hp: maxHp, atk: Math.round(hero.atk * role.atk * m), healPower: Math.round(hero.atk * 0.25 * m),
    def: Math.round(hero.def * role.def * Math.sqrt(m)), spd: Math.max(5, hero.spd - 2), crit: 0.08, critMult: 1.5, dodge: 0.05,
    skills: FAM_SKILLS[famRole(key)].map(s => ({ s, lv })),
  };
}
// 보조 사역마 → 주인공 패시브 합산
export function famSubFx(fams, keys) {
  const fx = {};
  for (const key of keys || []) {
    const f = key && fams?.[key];
    if (!f) continue;
    const role = FAM_ROLES[famRole(key)];
    for (const [k, v] of Object.entries(role.sub)) fx[k] = (fx[k] || 0) + v * powerMult(f);
  }
  return fx;
}
export function famSubText(key, f) {
  const role = FAM_ROLES[famRole(key)];
  return Object.entries(role.sub).map(([k, v]) => {
    const val = v * powerMult(f);
    const lbl = { dmgReduce: '받는 피해 -', atkPct: '공격력 +', skillDmg: '스킬 피해 +', healPct: '회복량 +', regenPct: '매 턴 HP 재생 ', dodge: '회피 +' }[k] || k;
    return `${lbl}${Math.round(val * 1000) / 10}%`;
  }).join(' · ');
}

// ===== 소환 풀 — 진행한 지역 적만 =====
export function famPool(progress) {
  const cleared = progress?.bossCleared || {};
  const open = CHRONICLE_FIELDS.filter(f => f.id === 1 || cleared[f.id - 1]);
  const uniq = (a) => [...new Set(a)].filter(k => ENEMIES[k]);
  const dungeonBosses = CHRONICLE_DUNGEONS.filter(d => progress?.dungeonTier?.[d.id] != null).map(d => d.floors[d.floors.length - 1].enemies[0]);
  const p2Bosses = CHRONICLE_FIELDS.filter(f => f.part === 2 && cleared[f.id]).map(f => f.boss);
  return {
    red: uniq(open.flatMap(f => f.normals)),
    green: uniq(open.flatMap(f => f.normals)),
    blue: uniq(open.flatMap(f => f.elites)),
    indigo: uniq(CHRONICLE_FIELDS.filter(f => f.part !== 2 && cleared[f.id]).map(f => f.boss)),
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
    if (!have) fams[key] = { grade: gid, plus: 0 };
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
  if (rng() < FAM_GRADES[gi].evolve) return { fams: { ...fams, [key]: { grade: FAM_GRADES[gi + 1].id, plus: 0 } }, souls: souls - c, result: 'success' };
  return { fams: { ...fams, [key]: { ...f, plus: Math.max(0, f.plus - FAM_TUNING.evolveFailDrop) } }, souls: souls - c, result: 'fail' };
}

// 전투 승리 시 계약서 조각
export function rollFamShards(enemies, type, rng, dungeonTier = 0) {
  if (type === 'boss') return FAM_TUNING.dropBoss;
  if (type === 'dungeonBoss') return FAM_TUNING.dropDungeonBoss[dungeonTier] || FAM_TUNING.dropDungeonBoss[0];
  let n = 0;
  for (const e of enemies) {
    if (e.tier === 'elite') { if (rng() < FAM_TUNING.dropElite) n += FAM_TUNING.dropEliteN[0] + Math.floor(rng() * (FAM_TUNING.dropEliteN[1] - FAM_TUNING.dropEliteN[0] + 1)); }
    else if (rng() < FAM_TUNING.dropNormal) n += 1;
  }
  return n;
}
