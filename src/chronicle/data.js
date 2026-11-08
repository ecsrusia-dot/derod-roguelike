// ============================================
// chronicle/data.js — 황혼 연대기 (전통 RPG) 데이터
// ============================================
// PM 결정 (1.205.0): 세 번째 게임 · 풀오토 관전 전투 · 주인공 1 + 동료 최대 3 · 핵심 루프 MVP
//   마을 ↔ 사냥터 4곳(클래식 챕터 1~4 적) ↔ 던전 1곳(챔피언십 서리 적) 을 오가며 영구 성장.
// 본편에서 가져오는 것: 직업 5종 이름·색·일러 / 적 이름·일러·공격 수치.
// 밸런스는 이 파일 한 곳 (CHRONICLE_TUNING · 스킬 수치 · 지역 레벨).
// ============================================
import { CLASSES } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';

export const CHRONICLE_TITLE = '황혼 연대기';
export const CHRONICLE_SUB = 'Twilight Chronicle';
export const CHRONICLE_SAVE_KEY = 'dnt_chronicle_v1';

export const CHRONICLE_TUNING = {
  pointsPerLevel: 4,          // 레벨업당 능력치 포인트
  spPerLevel: 1,              // 레벨업당 스킬 포인트
  maxLevel: 40,
  expNeed: (lv) => Math.round(30 * Math.pow(lv, 1.6)),
  enemyHpBase: 30, enemyHpPerLv: 14,     // 일반 적 HP = (30 + 14×Lv) × 개성 × 등급 × 지역
  enemyAtkBase: 9, enemyAtkPerLv: 3.6,   // 일반 적 공격 = (9 + 3.6×Lv) × …
  enemyTier: { normal: { hp: 1, atk: 1 }, elite: { hp: 2.6, atk: 1.25 }, boss: { hp: 4.5, atk: 1.4 } },
  defK: 60,                   // 받는 피해 = raw × K/(K+방어)
  critMult: 1.6,
  maxRounds: 40,
  eliteChance: 0.12,
  fieldDefeatGoldLoss: 0.1,
  inventoryMax: 60,
};

// ===== 능력치 =====
export const STAT_META = {
  str: { label: '힘', desc: '물리 공격력 (검사·마족)' },
  int: { label: '지능', desc: '마법 공격력·치유량 (술법사·사제)' },
  agi: { label: '민첩', desc: '속도·치명타·회피 (정령사는 공격력)' },
  vit: { label: '체력', desc: '최대 HP·방어' },
};
export const STAT_KEYS = ['str', 'int', 'agi', 'vit'];

// ===== 직업 =====
const CLASS_EXTRA = {
  wanderer:   { role: '탱커', main: 'str', base: { str: 8, int: 2, agi: 5, vit: 8 }, auto: { str: 2, vit: 2 }, magic: false },
  sage:       { role: '광역 마법', main: 'int', base: { str: 2, int: 10, agi: 4, vit: 5 }, auto: { int: 3, vit: 1 }, magic: true },
  demonblood: { role: '흡혈 전사', main: 'str', base: { str: 10, int: 2, agi: 4, vit: 7 }, auto: { str: 3, vit: 1 }, magic: false },
  elf:        { role: '연사 딜러', main: 'agi', base: { str: 3, int: 4, agi: 10, vit: 5 }, auto: { agi: 3, vit: 1 }, magic: false },
  priest:     { role: '치유사', main: 'int', base: { str: 3, int: 9, agi: 4, vit: 7 }, auto: { int: 2, vit: 2 }, magic: true },
};
export const CHRONICLE_CLASSES = CLASSES.map(c => ({
  id: c.id, name: c.name, color: c.color, image: c.image, combatImage: c.combatImage, quote: c.quote,
  ...CLASS_EXTRA[c.id],
}));
export const chronicleClass = (id) => CHRONICLE_CLASSES.find(c => c.id === id) || CHRONICLE_CLASSES[0];

// ===== 스킬 (직업당 4종, Lv.1~5, 전투는 자동 시전) =====
// kind: strike(단일) / multi(연타) / aoe(전체) / dot(지속 피해) / lifesteal / heal / shield / buffAtk(파티) / rage(자신) / taunt / passive
const S = (id, cls, name, kind, reqLv, cd, base, perLv, extra = {}) => ({ id, cls, name, kind, reqLv, cd, base, perLv, ...extra });
export const CHRONICLE_SKILLS = {
  // 방랑검사
  w_slash: S('w_slash', 'wanderer', '발도', 'strike', 1, 2, 1.6, 0.15),
  w_taunt: S('w_taunt', 'wanderer', '도발', 'taunt', 3, 4, 0.3, 0.06, { turns: 2 }),
  w_counter: S('w_counter', 'wanderer', '반격의 검', 'passive', 5, 0, 0, 0, { fx: (lv) => ({ counterPct: 0.12 + 0.05 * lv, defPct: 0.05 * lv }) }),
  w_storm: S('w_storm', 'wanderer', '검기 폭풍', 'aoe', 8, 4, 1.0, 0.12),
  // 술법사
  s_fireball: S('s_fireball', 'sage', '화염구', 'strike', 1, 2, 1.8, 0.18),
  s_inferno: S('s_inferno', 'sage', '겁화', 'dot', 3, 4, 0.5, 0.06, { turns: 3, all: true }),
  s_amplify: S('s_amplify', 'sage', '마력 증폭', 'passive', 5, 0, 0, 0, { fx: (lv) => ({ atkPct: 0.06 * lv }) }),
  s_meteor: S('s_meteor', 'sage', '화염 폭풍', 'aoe', 8, 5, 1.5, 0.15),
  // 혼혈 마족
  d_blood: S('d_blood', 'demonblood', '피의 일격', 'lifesteal', 1, 2, 1.7, 0.15, { steal: 0.3 }),
  d_rage: S('d_rage', 'demonblood', '광폭화', 'rage', 3, 5, 0.3, 0.06, { turns: 3 }),
  d_bloodlust: S('d_bloodlust', 'demonblood', '혈광', 'passive', 5, 0, 0, 0, { fx: (lv) => ({ lowHpDmg: 0.15 * lv, hpPct: 0.04 * lv }) }),
  d_slaughter: S('d_slaughter', 'demonblood', '학살', 'aoe', 8, 4, 1.1, 0.12),
  // 숲의 정령사
  e_volley: S('e_volley', 'elf', '연속 화살', 'multi', 1, 2, 0.6, 0.06, { hits: 3 }),
  e_venom: S('e_venom', 'elf', '독화살', 'dot', 3, 3, 0.7, 0.08, { turns: 3 }),
  e_wind: S('e_wind', 'elf', '바람의 가호', 'passive', 5, 0, 0, 0, { fx: (lv) => ({ critAdd: 0.03 * lv, dodgeAdd: 0.02 * lv }) }),
  e_rain: S('e_rain', 'elf', '화살비', 'aoe', 8, 4, 1.0, 0.12),
  // 여명의 사제
  p_heal: S('p_heal', 'priest', '치유의 빛', 'heal', 1, 2, 1.6, 0.2),
  p_bless: S('p_bless', 'priest', '축복', 'buffAtk', 3, 5, 0.15, 0.04, { turns: 3 }),
  p_shield: S('p_shield', 'priest', '가호', 'shield', 5, 5, 1.2, 0.2),
  p_light: S('p_light', 'priest', '신성 광선', 'strike', 8, 3, 1.6, 0.15),
  // ── 1.207.0 후반 스킬 (Lv.15 · Lv.25) — 남는 스킬 포인트 해소
  w_flash: S('w_flash', 'wanderer', '일섬', 'strike', 15, 3, 2.6, 0.25),
  w_unyield: S('w_unyield', 'wanderer', '불굴', 'passive', 25, 0, 0, 0, { fx: (lv) => ({ hpPct: 0.05 * lv, defPct: 0.04 * lv }) }),
  s_surge: S('s_surge', 'sage', '마력 폭주', 'rage', 15, 5, 0.35, 0.07, { turns: 3 }),
  s_starfall: S('s_starfall', 'sage', '운석 낙하', 'aoe', 25, 6, 2.4, 0.25),
  d_moon: S('d_moon', 'demonblood', '혈월참', 'lifesteal', 15, 4, 2.4, 0.22, { steal: 0.4 }),
  d_undying: S('d_undying', 'demonblood', '불멸의 피', 'passive', 25, 0, 0, 0, { fx: (lv) => ({ hpPct: 0.06 * lv, lowHpDmg: 0.1 * lv }) }),
  e_spirits: S('e_spirits', 'elf', '정령 소환', 'dot', 15, 4, 0.6, 0.07, { turns: 3, all: true }),
  e_divine: S('e_divine', 'elf', '신궁', 'multi', 25, 4, 0.45, 0.05, { hits: 7 }),
  p_dawn: S('p_dawn', 'priest', '여명의 기도', 'healAll', 15, 4, 0.9, 0.12),
  p_judge: S('p_judge', 'priest', '심판', 'aoe', 25, 4, 1.6, 0.15),
};
export const SKILL_MAX_LV = 5;
// 마스터리 (1.207.0) — 남는 스킬 포인트 1개당 공격·최대 HP +1%, 상한 없음
export const MASTERY_PCT = 0.01;
// 보스 재도전 (1.207.0) — 첫 처치 후 보스마다 하루 3회 (한국 시간 0시 초기화)
export const BOSS_DAILY_LIMIT = 3;
export const classSkills = (classId) => Object.values(CHRONICLE_SKILLS).filter(s => s.cls === classId);

const pct = (x) => `${Math.round(x * 100)}%`;
export function describeSkill(s, lv = 1) {
  const L = Math.max(1, lv);
  const v = s.base + s.perLv * (L - 1);
  switch (s.kind) {
    case 'strike': return `적 1명에게 공격력 ${pct(v)} 피해`;
    case 'multi': return `적 1명에게 공격력 ${pct(v)} × ${s.hits}회`;
    case 'aoe': return `적 전체에게 공격력 ${pct(v)} 피해`;
    case 'dot': return `${s.all ? '적 전체' : '적 1명'}에게 ${s.turns}턴간 매 턴 공격력 ${pct(v)} 피해`;
    case 'lifesteal': return `적 1명에게 공격력 ${pct(v)} 피해, 피해의 ${pct(s.steal)} 회복`;
    case 'heal': return `HP가 가장 낮은 아군을 지능 기반 ${pct(v)} 회복`;
    case 'healAll': return `아군 전체를 지능 기반 ${pct(v)} 회복`;
    case 'shield': return `아군 전체에 지능 기반 ${pct(v)} 보호막`;
    case 'buffAtk': return `${s.turns}턴간 아군 전체 공격력 +${pct(v)}`;
    case 'rage': return `${s.turns}턴간 자신의 공격력 +${pct(v)}`;
    case 'taunt': return `${s.turns}턴간 적의 공격을 끌어당기고 방어 +${pct(v)}`;
    case 'passive': {
      const fx = s.fx(L);
      const parts = [];
      if (fx.counterPct) parts.push(`피격 시 ${pct(fx.counterPct)} 확률 반격`);
      if (fx.defPct) parts.push(`방어 +${pct(fx.defPct)}`);
      if (fx.atkPct) parts.push(`공격력 +${pct(fx.atkPct)}`);
      if (fx.lowHpDmg) parts.push(`HP 50% 이하일 때 피해 +${pct(fx.lowHpDmg)}`);
      if (fx.hpPct) parts.push(`최대 HP +${pct(fx.hpPct)}`);
      if (fx.critAdd) parts.push(`치명타 +${pct(fx.critAdd)}`);
      if (fx.dodgeAdd) parts.push(`회피 +${pct(fx.dodgeAdd)}`);
      return `[지속] ${parts.join(' · ')}`;
    }
    default: return '';
  }
}

// ===== 사냥터 · 던전 =====
const mob = (chapter, tier) => Object.entries(ENEMIES).filter(([, e]) => e.chapter === chapter && e.tier === tier).map(([k]) => k);
export const CHRONICLE_FIELDS = [
  { id: 1, name: '북부 극지대', lv: [1, 6], bossLv: 8, bossKills: 15, area: { hpMult: 1, atkMult: 1 }, color: '#7ba3c4', normals: mob(1, 'normal'), elites: mob(1, 'elite'), boss: 'iceMage' },
  { id: 2, name: '죽은 자의 숲', lv: [7, 13], bossLv: 15, bossKills: 30, area: { hpMult: 2.6, atkMult: 1.6 }, color: '#7a9a5e', normals: mob(2, 'normal'), elites: mob(2, 'elite'), boss: 'twilightChild' },
  { id: 3, name: '봉인된 신전', lv: [15, 21], bossLv: 23, bossKills: 45, area: { hpMult: 5.0, atkMult: 2.6 }, color: '#d4a574', normals: mob(3, 'normal'), elites: mob(3, 'elite'), boss: 'oblivionSealer' },
  { id: 4, name: '마계의 균열', lv: [23, 30], bossLv: 32, bossKills: 60, area: { hpMult: 7.0, atkMult: 3.3 }, color: '#c4453d', normals: mob(4, 'normal'), elites: mob(4, 'elite'), boss: 'nakzelionShadow' },
];
export const CHRONICLE_DUNGEON = {
  id: 'frostTomb', name: '서리 왕의 무덤', unlockField: 2, recLv: 22, color: '#9cc4e4', area: { hpMult: 4.4, atkMult: 2.4 },
  desc: '층마다 HP가 이어진다. 끝까지 내려가면 절대영도의 군주가 에픽 장비를 지키고 있다.',
  floors: [
    { lv: 17, enemies: ['champ_frost_imp', 'champ_frost_wolf', 'champ_frost_shaman'] },
    { lv: 18, enemies: ['champ_frost_lurker', 'champ_frost_revenant', 'champ_frost_brute'] },
    { lv: 19, enemies: ['champ_frost_juggernaut', 'champ_frost_seer'] },
    { lv: 20, enemies: ['champ_frost_avatar', 'champ_frost_elite4'] },
    { lv: 22, enemies: ['champ_frost_boss4'], boss: true },
  ],
};

// 적 일러 경로 (본편 헬퍼와 같은 규칙, ./ 상대 경로)
export function chronicleEnemyArt(key, kind = 'combat') {
  const e = ENEMIES[key];
  if (!e) return null;
  if (typeof e.chapter === 'string') return `./enemies/championship/${e.chapter.split('_')[0]}/${key}_${kind}.jpg`;
  return `./enemies/classic/chapter_${e.chapter}/${key}_${kind}.jpg`;
}

// 본편 적 → 연대기 적 (레벨 적용)
// 수치는 레벨 공식이 기준이고, 본편 데이터는 「같은 챕터 일반 적 평균 대비 비율」로만 개성을 준다.
// area: 사냥터/던전의 { hpMult, atkMult } — 그 시점 예상 파티 인원을 반영
const _avgCache = {};
function chapterAvg(chapter) {
  if (_avgCache[chapter]) return _avgCache[chapter];
  const list = Object.values(ENEMIES).filter(e => e.chapter === chapter && e.tier === 'normal');
  const avgAtk = (e) => { const a = e.patterns.filter(p => p.type === 'attack' && p.dmg); return a.reduce((s, p) => s + (p.dmg[0] + p.dmg[1]) / 2, 0) / Math.max(1, a.length); };
  const hp = list.reduce((s, e) => s + e.hp, 0) / Math.max(1, list.length);
  const atk = list.reduce((s, e) => s + avgAtk(e), 0) / Math.max(1, list.length);
  _avgCache[chapter] = { hp, atk, avgAtk };
  return _avgCache[chapter];
}
const clampR = (x) => Math.max(0.8, Math.min(1.25, x));
export function buildChronicleEnemy(key, lv, uid, area = { hpMult: 1, atkMult: 1 }) {
  const e = ENEMIES[key];
  const T = CHRONICLE_TUNING;
  const avg = chapterAvg(e.chapter);
  const tier = T.enemyTier[e.tier] || T.enemyTier.normal;
  const hpR = e.tier === 'normal' ? clampR(e.hp / avg.hp) : 1;
  const atkR = e.tier === 'normal' ? clampR(avg.avgAtk(e) / avg.atk) : 1;
  const hp = Math.round((T.enemyHpBase + lv * T.enemyHpPerLv) * hpR * tier.hp * area.hpMult);
  const atk = Math.round((T.enemyAtkBase + lv * T.enemyAtkPerLv) * atkR * tier.atk * area.atkMult);
  return {
    id: uid, key, name: e.name, tier: e.tier, lv, side: 'enemy', rewardMult: area.hpMult,
    hp, maxHp: hp, atk, def: Math.round(lv * 1.2),
    spd: 8 + lv * 0.25, crit: 0.05, dodge: 0.03, magic: false,
  };
}

// ===== 장비 =====
export const GRADES = [
  { id: 'common', label: '일반', color: '#a89a88', mult: 1.0, dismantle: 1 },
  { id: 'uncommon', label: '고급', color: '#7fbf6a', mult: 1.2, dismantle: 3 },
  { id: 'rare', label: '희귀', color: '#6aa6e0', mult: 1.45, dismantle: 8 },
  { id: 'epic', label: '에픽', color: '#c08ae8', mult: 1.85, dismantle: 20, shard: 2 },
];
export const gradeIdx = (id) => GRADES.findIndex(g => g.id === id);
export const SLOTS = [
  { id: 'weapon', label: '무기', icon: '⚔' },
  { id: 'armor', label: '갑옷', icon: '🛡' },
  { id: 'accessory', label: '장신구', icon: '💍' },
];
export const SLOT_NAMES = {
  weapon: ['녹슨 칼날', '강철 칼날', '룬 새김 칼날', '균열의 칼날'],
  armor: ['가죽 갑옷', '사슬 갑옷', '룬 판금', '마계 판금'],
  accessory: ['낡은 반지', '은 목걸이', '룬 부적', '심연의 인장'],
};
export const EPIC_NAMES = { weapon: '절대영도의 검', armor: '서리 왕의 갑주', accessory: '영원한 겨울의 심장' };

export const FORGE = {
  maxEnhance: 10,
  enhancePct: 0.08,                                    // +1당 능력치 +8%
  enhanceCost: (n, ilv) => ({ gold: Math.round((20 + ilv * 4) * (n + 1)), essence: n + 1 }),
  // 등급 승급 (다음 등급으로)
  promoteCost: {
    uncommon: { gold: 120, essence: 6, shard: 0 },
    rare: { gold: 400, essence: 15, shard: 0 },
    epic: { gold: 1200, essence: 30, shard: 5 },
  },
};

export const DROP_TABLE = {
  normal: { itemChance: 0.18, grades: { common: 70, uncommon: 25, rare: 5 }, essence: [1, 2] },
  elite: { itemChance: 1, grades: { common: 25, uncommon: 50, rare: 25 }, essence: [3, 5] },
  boss: { itemChance: 1, grades: { uncommon: 30, rare: 70 }, essence: [8, 12] },
  dungeonFloor: { itemChance: 0.5, grades: { uncommon: 40, rare: 55, epic: 5 }, essence: [3, 5], shard: [1, 2] },
  dungeonBoss: { itemChance: 1, items: 2, grades: { rare: 55, epic: 45 }, essence: [10, 15], shard: [3, 5] },
};
