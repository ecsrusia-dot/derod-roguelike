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
import { getEnemyImageSrc } from '../utils/helpers.js';

export const CHRONICLE_TITLE = '황혼 연대기';
export const CHRONICLE_SUB = 'Twilight Chronicle';
export const CHRONICLE_SAVE_KEY_V1 = 'dnt_chronicle_v1'; // 1.x 저장 (읽기 전용 — 시작 보상 판정)
export const CHRONICLE_SAVE_KEY = 'dnt_chronicle_v2';    // 2.0 계정 저장

export const CHRONICLE_TUNING = {
  pointsPerLevel: 4,          // 레벨업당 능력치 포인트
  spPerLevel: 1,              // 레벨업당 스킬 포인트
  maxLevel: 100,              // 1.211.0 2부 — 지역 9곳, 마지막 보스 Lv.100
  expNeed: (lv) => Math.round(30 * Math.pow(lv, 1.6)),
  enemyHpBase: 30, enemyHpPerLv: 14,     // 일반 적 HP = (30 + 14×Lv) × 개성 × 등급 × 지역
  enemyAtkBase: 9, enemyAtkPerLv: 3.6,   // 일반 적 공격 = (9 + 3.6×Lv) × …
  enemyTier: { normal: { hp: 1, atk: 1 }, elite: { hp: 3.2, atk: 1.4 }, boss: { hp: 3.8, atk: 1.35 } },
  // 2.0 솔로 보정 — 적 전체 배율 · 경험치 배율 (난이도 체감 조정은 여기)
  soloHp: 0.9, soloAtk: 1.3, soloGrowth: 0.055, expMult: 3,
  // 던전 솔로 보정 (1.214.0) — 층 사이 회복이 없으므로 던전 적만 따로 낮춘다 · 층당 적 수
  dungeonSolo: { hp: 0.6, atk: 0.75 }, dungeonFloorEnemies: [1, 2], dungeonFloorHeal: 0.25, // 던전 층 사이 최대 HP의 25% 회복 (자체 회복 없는 직업 보정)
  defK: 60,                   // 받는 피해 = raw × K/(K+방어)
  critMult: 1.6,
  maxRounds: 50,
  eliteChance: 0.12,
  fieldDefeatGoldLoss: 0.1,
  inventoryMax: 40,           // 캐릭터 개인 가방
  stashMax: 100,              // 계정 공용 창고
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
  wanderer:   { role: '탱커', main: 'str', base: { str: 14, int: 2, agi: 5, vit: 10 }, auto: { str: 2, vit: 2 }, magic: false },
  sage:       { role: '광역 마법', main: 'int', base: { str: 2, int: 10, agi: 4, vit: 6 }, auto: { int: 2, vit: 2 }, magic: true },
  demonblood: { role: '흡혈 전사', main: 'str', base: { str: 10, int: 2, agi: 4, vit: 5 }, auto: { str: 3, vit: 1 }, magic: false },
  elf:        { role: '연사 딜러', main: 'agi', base: { str: 3, int: 4, agi: 10, vit: 5 }, auto: { agi: 3, vit: 1 }, magic: false },
  priest:     { role: '치유사', main: 'int', base: { str: 3, int: 10, agi: 4, vit: 8 }, auto: { int: 2, vit: 2 }, magic: true },
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
  d_blood: S('d_blood', 'demonblood', '피의 일격', 'lifesteal', 1, 2, 1.7, 0.15, { steal: 0.2 }),
  d_rage: S('d_rage', 'demonblood', '광폭화', 'rage', 3, 5, 0.3, 0.06, { turns: 3 }),
  d_bloodlust: S('d_bloodlust', 'demonblood', '혈광', 'passive', 5, 0, 0, 0, { fx: (lv) => ({ lowHpDmg: 0.15 * lv, hpPct: 0.04 * lv }) }),
  d_slaughter: S('d_slaughter', 'demonblood', '학살', 'aoe', 8, 4, 1.1, 0.12),
  // 숲의 정령사
  e_volley: S('e_volley', 'elf', '연속 화살', 'multi', 1, 2, 0.6, 0.06, { hits: 3 }),
  e_venom: S('e_venom', 'elf', '독화살', 'dot', 3, 3, 0.7, 0.08, { turns: 3 }),
  e_wind: S('e_wind', 'elf', '바람의 가호', 'passive', 5, 0, 0, 0, { fx: (lv) => ({ critAdd: 0.03 * lv, dodgeAdd: 0.02 * lv }) }),
  e_rain: S('e_rain', 'elf', '화살비', 'aoe', 8, 4, 1.0, 0.12),
  // 여명의 사제
  p_heal: S('p_heal', 'priest', '치유의 빛', 'heal', 1, 2, 1.5, 0.15),
  p_bless: S('p_bless', 'priest', '축복', 'buffAtk', 3, 5, 0.15, 0.04, { turns: 3 }),
  p_shield: S('p_shield', 'priest', '가호', 'shield', 5, 5, 1.2, 0.2),
  p_light: S('p_light', 'priest', '신성 광선', 'strike', 8, 3, 1.9, 0.18),
  // ── 1.207.0 후반 스킬 (Lv.15 · Lv.25) — 남는 스킬 포인트 해소
  w_flash: S('w_flash', 'wanderer', '일섬', 'strike', 15, 3, 2.6, 0.25),
  w_unyield: S('w_unyield', 'wanderer', '불굴', 'passive', 25, 0, 0, 0, { fx: (lv) => ({ hpPct: 0.05 * lv, defPct: 0.04 * lv }) }),
  s_surge: S('s_surge', 'sage', '마력 폭주', 'rage', 15, 5, 0.35, 0.07, { turns: 3 }),
  s_starfall: S('s_starfall', 'sage', '운석 낙하', 'aoe', 25, 6, 2.4, 0.25),
  d_moon: S('d_moon', 'demonblood', '혈월참', 'lifesteal', 15, 4, 2.4, 0.22, { steal: 0.3 }),
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
// 🗝 던전 열쇠 (1.209.0) — 입장 시 소모(난이도별 keyCost), 후퇴·전멸해도 돌려받지 못함
export const DUNGEON_KEYS = {
  dailyRefill: 3,        // 매일 한국 시간 0시, 보유량이 3개 미만이면 3개까지 채움
  max: 10,               // 최대 보유
  eliteDrop: 0.1,        // 사냥터 강적 1마리 처치당 10%
  shopPrice: 400,        // 상점 구매 가격 (골드)
  shopDailyLimit: 2,     // 하루 구매 한도
};
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
// 2부 지역은 챔피언십 컨셉 적 16종(일반 8 · 강적 4)을 그대로 쓴다
const champMob = (concept, tier) => Object.entries(ENEMIES).filter(([, e]) => typeof e.chapter === 'string' && e.chapter.startsWith(`${concept}_`) && e.tier === tier).map(([k]) => k);
const champField = (id, name, concept, lv, bossLv, bossKills, color, boss) => ({
  id, part: 2, concept, name, lv, bossLv, bossKills, area: { hpMult: 1, atkMult: 1 }, color,
  normals: champMob(concept, 'normal'), elites: champMob(concept, 'elite'), boss,
});
// ===== 스테이지 (1.213.0 — PM 결정: 지역당 6스테이지 · 처치 목표 + 관문 강적) =====
// 스테이지마다 몹 레벨 고정 → 같은 지역 안에서도 뒤 스테이지일수록 강해진다.
// 처치 목표를 채우면 「관문 강적」 개방 → 이기면 다음 스테이지 · 6스테이지 관문 뒤에 지역 보스.
export const FIELD_STAGES = 6;
export const STAGE_TUNING = { gateLvAdd: 1, gateEliteMult: 1.0 };
export function fieldStages(field) {
  const [a, b] = field.lv;
  const need = Math.ceil(field.bossKills / FIELD_STAGES);
  return Array.from({ length: FIELD_STAGES }, (_, i) => ({ idx: i, lv: a + Math.round(i * (b - a) / (FIELD_STAGES - 1)), kills: need }));
}

// ===== ×4 배속 이용권 (1.213.0 — PM 결정: 골드로 시간 구매) =====
export const BOOST = { minutes: 30, cost: (lv) => 300 + 15 * lv, maxStackMin: 180 };

export const CHRONICLE_PARTS = [
  { id: 1, name: '1부 · 끝나지 않는 황혼', fields: [1, 2, 3, 4] },
  { id: 2, name: '2부 · 여명의 배신', fields: [5, 6, 7, 8, 9] },
];
export const CHRONICLE_FIELDS = [
  { id: 1, name: '북부 극지대', lv: [1, 12], bossLv: 14, bossKills: 30, area: { hpMult: 1, atkMult: 1 }, color: '#7ba3c4', normals: mob(1, 'normal'), elites: mob(1, 'elite'), boss: 'iceMage' },
  { id: 2, name: '죽은 자의 숲', lv: [12, 24], bossLv: 26, bossKills: 50, area: { hpMult: 1, atkMult: 1 }, color: '#7a9a5e', normals: mob(2, 'normal'), elites: mob(2, 'elite'), boss: 'twilightChild' },
  { id: 3, name: '봉인된 신전', lv: [24, 36], bossLv: 38, bossKills: 70, area: { hpMult: 1, atkMult: 1 }, color: '#d4a574', normals: mob(3, 'normal'), elites: mob(3, 'elite'), boss: 'oblivionSealer' },
  { id: 4, name: '마계의 균열', lv: [36, 48], bossLv: 50, bossKills: 90, area: { hpMult: 1, atkMult: 1 }, color: '#c4453d', normals: mob(4, 'normal'), elites: mob(4, 'elite'), boss: 'nakzelionShadow' },
  // ── 2부 「여명의 배신」 (1.211.0) — 4지역 보스 처치 후 순서대로 개방
  champField(5, '되살아난 동토', 'frost', [48, 58], 60, 100, '#9cc4e4', 'champ_frost_boss3'),
  champField(6, '광란의 숲', 'forest', [58, 68], 70, 110, '#9fd18a', 'champ_forest_witch'),
  champField(7, '봉인 성역', 'sanctum', [68, 78], 80, 120, '#e3c27a', 'champ_sanctum_boss4'),
  champField(8, '핏빛 균열', 'rift', [78, 88], 90, 130, '#e0574c', 'champ_rift_boss4'),
  champField(9, '여명의 첨탑', 'dawn', [88, 98], 100, 150, '#fff1c4', 'champ_dawn_boss4'),
];
// 던전 (1.208.0 — 2곳 × 난이도 3단계). set = 에픽 장비 이름 세트
export const CHRONICLE_DUNGEONS = [
  {
    id: 'frostTomb', name: '서리 왕의 무덤', unlockField: 2, recLv: 30, color: '#9cc4e4', area: { hpMult: 1, atkMult: 1 }, set: 'frost',
    desc: '층마다 HP가 이어진다. 끝까지 내려가면 절대영도의 군주가 에픽 장비를 지키고 있다.',
    art: 'champ_frost_boss4',
    floors: [
      { lv: 28, enemies: ['champ_frost_imp', 'champ_frost_wolf', 'champ_frost_shaman'] },
      { lv: 29, enemies: ['champ_frost_lurker', 'champ_frost_revenant', 'champ_frost_brute'] },
      { lv: 30, enemies: ['champ_frost_juggernaut', 'champ_frost_seer'] },
      { lv: 31, enemies: ['champ_frost_avatar', 'champ_frost_elite4'] },
      { lv: 33, enemies: ['champ_frost_boss4'], boss: true },
    ],
  },
  {
    id: 'forestHeart', name: '광기의 숲 심장부', unlockField: 3, recLv: 45, color: '#9fd18a', area: { hpMult: 1, atkMult: 1 }, set: 'forest',
    desc: '광기에 물든 숲의 가장 깊은 곳. 종말의 마에스트로가 마지막 악장을 연주한다.',
    art: 'champ_forest_boss4',
    floors: [
      { lv: 43, enemies: ['champ_forest_husk', 'champ_forest_leopard', 'champ_forest_dryad'] },
      { lv: 44, enemies: ['champ_forest_revenant', 'champ_forest_treant', 'champ_forest_tiger'] },
      { lv: 45, enemies: ['champ_forest_chimera', 'champ_forest_thornling', 'champ_forest_elite2'] },
      { lv: 46, enemies: ['champ_forest_avatar', 'champ_forest_elite4'] },
      { lv: 48, enemies: ['champ_forest_boss4'], boss: true },
    ],
  },
  // ── 2부 던전 (1.214.0) — 2부 지역 보스를 쓰러뜨리면 개방. 보스는 지역 보스와 다른 챔피언십 보스
  {
    id: 'frostAbyss', name: '빙왕의 심연', part: 2, unlockField: 6, recLv: 68, color: '#7fb2e6', area: { hpMult: 1, atkMult: 1 }, set: 'abyss',
    desc: '되살아난 동토 아래, 빛이 닿지 않는 얼음 동굴. 동굴의 빙왕이 다시 왕좌에 앉았다.',
    art: 'champ_frost_boss2',
    floors: [
      { lv: 64, enemies: ['champ_frost_lurker', 'champ_frost_revenant', 'champ_frost_wolf'] },
      { lv: 65, enemies: ['champ_frost_juggernaut', 'champ_frost_shaman', 'champ_frost_brute'] },
      { lv: 66, enemies: ['champ_frost_seer', 'champ_frost_elite2', 'champ_frost_avatar'] },
      { lv: 67, enemies: ['champ_frost_elite3', 'champ_frost_elite4'] },
      { lv: 70, enemies: ['champ_frost_boss2'], boss: true },
    ],
  },
  {
    id: 'sanctumVault', name: '봉인 성역의 금고', part: 2, unlockField: 7, recLv: 78, color: '#e3c27a', area: { hpMult: 1, atkMult: 1 }, set: 'sanctum',
    desc: '여명이 봉인한 것들을 모아 둔 금고. 가장 깊은 곳의 봉인자가 열쇠를 쥐고 있다.',
    art: 'champ_sanctum_boss3',
    floors: [
      { lv: 74, enemies: ['champ_sanctum_acolyte', 'champ_sanctum_guardian', 'champ_sanctum_seer'] },
      { lv: 75, enemies: ['champ_sanctum_priest', 'champ_sanctum_warden', 'champ_sanctum_brute1'] },
      { lv: 76, enemies: ['champ_sanctum_archpriest', 'champ_sanctum_oracle', 'champ_sanctum_elite2'] },
      { lv: 77, enemies: ['champ_sanctum_avatar', 'champ_sanctum_elite3', 'champ_sanctum_elite4'] },
      { lv: 80, enemies: ['champ_sanctum_boss3'], boss: true },
    ],
  },
  {
    id: 'riftHeart', name: '마왕의 심장', part: 2, unlockField: 8, recLv: 88, color: '#e0574c', area: { hpMult: 1, atkMult: 1 }, set: 'rift',
    desc: '핏빛 균열 가장 깊은 곳, 아직 뛰고 있는 마왕의 심장. 그 심장을 지키는 또 하나의 마왕.',
    art: 'champ_rift_boss3',
    floors: [
      { lv: 84, enemies: ['champ_rift_imp', 'champ_rift_warrior', 'champ_rift_caster'] },
      { lv: 85, enemies: ['champ_rift_assassin', 'champ_rift_devourer', 'champ_rift_brute1'] },
      { lv: 86, enemies: ['champ_rift_demonlord', 'champ_rift_archmage', 'champ_rift_elite2'] },
      { lv: 87, enemies: ['champ_rift_avatar', 'champ_rift_elite3', 'champ_rift_elite4'] },
      { lv: 90, enemies: ['champ_rift_boss3'], boss: true },
    ],
  },
  {
    id: 'dawnGarden', name: '여명의 정원', part: 2, unlockField: 9, recLv: 98, color: '#fff1c4', area: { hpMult: 1, atkMult: 1 }, set: 'dawn',
    desc: '신이 쓰러진 뒤에도 꺼지지 않는 정원. 정원의 대천사가 마지막 빛을 지킨다.',
    art: 'champ_dawn_boss3',
    floors: [
      { lv: 94, enemies: ['champ_dawn_acolyte', 'champ_dawn_warrior', 'champ_dawn_seraph'] },
      { lv: 95, enemies: ['champ_dawn_priest', 'champ_dawn_paladin', 'champ_dawn_brute1'] },
      { lv: 96, enemies: ['champ_dawn_high_seraph', 'champ_dawn_oracle', 'champ_dawn_elite2'] },
      { lv: 97, enemies: ['champ_dawn_avatar', 'champ_dawn_elite3', 'champ_dawn_elite4'] },
      { lv: 100, enemies: ['champ_dawn_boss3'], boss: true },
    ],
  },
];
export const CHRONICLE_DUNGEON = CHRONICLE_DUNGEONS[0]; // 1.205~1.207 호환 (이야기·의뢰가 참조)
export const dungeonDef = (id) => CHRONICLE_DUNGEONS.find(d => d.id === id) || CHRONICLE_DUNGEONS[0];

// 난이도 — 이전 단계 보스를 쓰러뜨리면 다음 단계 개방
export const DUNGEON_TIERS = [
  { id: 'normal', label: '일반', color: '#a89a88', lv: 0, hp: 1, atk: 1, epicMult: 1, shardMult: 1, keyCost: 1 },
  { id: 'heroic', label: '영웅', color: '#6aa6e0', lv: 3, hp: 1.5, atk: 1.25, epicMult: 1.6, shardMult: 2, keyCost: 2 },
  { id: 'legend', label: '전설', color: '#e8b04a', lv: 6, hp: 2.0, atk: 1.5, epicMult: 2.4, shardMult: 3, keyCost: 3 },
];

// 적 일러 경로 (본편 헬퍼와 같은 규칙, ./ 상대 경로)
export function chronicleEnemyArt(key, kind = 'combat') {
  const e = ENEMIES[key];
  return e ? getEnemyImageSrc(key, e, kind) : null; // forest는 chapterN 하위 폴더 — 본편 헬퍼에 위임
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
  const grow = 1 + (T.soloGrowth || 0) * (lv - 1); // 2.0: 플레이어 성장(스탯·장비 배율)이 레벨보다 빠르므로 적도 가속
  const hp = Math.round((T.enemyHpBase + lv * T.enemyHpPerLv) * hpR * tier.hp * area.hpMult * (T.soloHp || 1) * grow);
  const atk = Math.round((T.enemyAtkBase + lv * T.enemyAtkPerLv) * atkR * tier.atk * area.atkMult * (T.soloAtk || 1) * grow);
  return {
    id: uid, key, name: e.name, tier: e.tier, lv, side: 'enemy', rewardMult: area.hpMult,
    hp, maxHp: hp, atk, def: Math.round(lv * 1.2),
    spd: 8 + lv * 0.25, crit: 0.05, dodge: 0.03, magic: false,
  };
}

// ===== 장비 (2.0 — 직업 전용 4칸) =====
export const GRADES = [
  { id: 'common', label: '일반', color: '#a89a88', mult: 1.0, opts: 0, optMult: 1, dismantle: 1 },
  { id: 'uncommon', label: '고급', color: '#7fbf6a', mult: 1.2, opts: 1, optMult: 1, dismantle: 3 },
  { id: 'rare', label: '희귀', color: '#6aa6e0', mult: 1.45, opts: 2, optMult: 1.15, dismantle: 8 },
  { id: 'epic', label: '에픽', color: '#c08ae8', mult: 1.8, opts: 3, optMult: 1.3, dismantle: 20, shard: 2 },
  { id: 'unique', label: '유니크', color: '#f0883e', mult: 2.0, opts: 2, optMult: 1.45, dismantle: 40, shard: 5 },
];
export const gradeIdx = (id) => GRADES.findIndex(g => g.id === id);
export const SLOTS = [
  { id: 'weapon', label: '무기', icon: '⚔' },
  { id: 'offhand', label: '보조', icon: '◈' },
  { id: 'armor', label: '갑옷', icon: '🛡' },
  { id: 'accessory', label: '장신구', icon: '💍' },
];
export const CLASS_SLOTS = ['weapon', 'offhand', 'armor']; // 직업 전용 칸 (장신구는 공용)
// 장비 이름 — 아이템 레벨 15 단위 4단계
export const CLASS_GEAR_NAMES = {
  wanderer: { weapon: ['녹슨 장검', '강철 장검', '룬 장검', '균열의 장검'], offhand: ['나무 방패', '강철 방패', '룬 방패', '균열의 방패'], armor: ['가죽 흉갑', '사슬 판금', '룬 판금', '균열의 판금'] },
  sage: { weapon: ['참나무 지팡이', '수정 지팡이', '룬 지팡이', '균열의 지팡이'], offhand: ['낡은 마도서', '봉인 마도서', '룬 마도서', '균열의 마도서'], armor: ['수습생 로브', '비단 로브', '룬 로브', '균열의 로브'] },
  demonblood: { weapon: ['녹슨 대검', '강철 대검', '피의 대검', '균열의 대검'], offhand: ['탁한 혈석', '붉은 혈석', '마혈석', '균열의 혈석'], armor: ['가죽 흉갑', '가시 흉갑', '피의 흉갑', '균열의 흉갑'] },
  elf: { weapon: ['사냥꾼 활', '물푸레 활', '정령 활', '균열의 활'], offhand: ['가죽 화살통', '깃털 화살통', '정령 화살통', '균열의 화살통'], armor: ['누빈 가죽 갑옷', '잎새 가죽 갑옷', '정령 가죽 갑옷', '균열의 가죽 갑옷'] },
  priest: { weapon: ['나무 홀', '은 홀', '여명의 홀', '균열의 홀'], offhand: ['순례 성물', '은 성물', '빛의 성물', '균열의 성물'], armor: ['수련 법의', '은사 법의', '빛의 법의', '균열의 법의'] },
  common: { accessory: ['낡은 반지', '은 목걸이', '룬 부적', '심연의 인장'] },
};
export const EPIC_PREFIX = { frost: '서리 왕의', forest: '광란의', field: '빛나는', abyss: '심연 빙왕의', sanctum: '봉인된', rift: '마왕의', dawn: '여명 정원의' };

// 옵션 정의 — pct: % 표시 / v: 고급 기준 값 범위 [최소, 최대] (등급 optMult 곱)
export const OPTION_DEFS = {
  atkPct: { label: '공격력', pct: true, v: [0.03, 0.06] },
  hpPct: { label: '최대 HP', pct: true, v: [0.04, 0.08] },
  defPct: { label: '방어', pct: true, v: [0.05, 0.10] },
  spd: { label: '속도', pct: false, v: [1, 3] },
  crit: { label: '치명', pct: true, v: [0.02, 0.05] },
  critDmg: { label: '치명 피해', pct: true, v: [0.10, 0.20] },
  dodge: { label: '회피', pct: true, v: [0.02, 0.04] },
  counterPct: { label: '반격 확률', pct: true, v: [0.03, 0.06] },
  counterDmg: { label: '반격 피해', pct: true, v: [0.10, 0.20] },
  dmgReduce: { label: '받는 피해 감소', pct: true, v: [0.02, 0.05] },
  skillDmg: { label: '스킬 피해', pct: true, v: [0.05, 0.10] },
  cdr: { label: '재사용 단축', pct: false, v: [1, 1], unit: '턴', rare: true },
  dotDmg: { label: '지속 피해', pct: true, v: [0.10, 0.20] },
  shieldPct: { label: '시작 보호막', pct: true, v: [0.04, 0.08] },
  lifesteal: { label: '흡혈', pct: true, v: [0.02, 0.05] },
  lowHpDmg: { label: '저체력 피해', pct: true, v: [0.05, 0.12] },
  thornsPct: { label: '피해 반사', pct: true, v: [0.05, 0.10] },
  chain: { label: '추가 타격 확률', pct: true, v: [0.05, 0.10] },
  healPct: { label: '치유량', pct: true, v: [0.06, 0.12] },
  holyDmg: { label: '치유→신성 피해', pct: true, v: [0.10, 0.20] },
  expPct: { label: '경험치', pct: true, v: [0.05, 0.10] },
  goldPct: { label: '골드', pct: true, v: [0.05, 0.10] },
};
// 직업별 옵션 풀 (가중치) — 그 직업 장비에서만 뽑힌다
export const OPTION_POOLS = {
  wanderer: { defPct: 4, counterPct: 4, counterDmg: 3, dmgReduce: 3, hpPct: 2, atkPct: 2 },
  sage: { skillDmg: 4, cdr: 1, dotDmg: 3, shieldPct: 3, critDmg: 2, atkPct: 2 },
  demonblood: { lifesteal: 4, hpPct: 3, lowHpDmg: 3, atkPct: 3, thornsPct: 2 },
  elf: { crit: 4, dodge: 3, spd: 3, chain: 3, critDmg: 2 },
  priest: { healPct: 4, shieldPct: 3, dmgReduce: 3, hpPct: 2, holyDmg: 3 },
  common: { hpPct: 3, atkPct: 3, spd: 2, critDmg: 2, expPct: 1, goldPct: 1 },
};
// 직업 보조 칸 기본 능력치 (등급 배율만 적용, 레벨 무관 % + 레벨 비례 수치)
export const OFFHAND_BASE = {
  wanderer: { flat: { def: [1, 0.6] }, pct: { counterPct: 0.04 } },
  sage: { flat: { atk: [1, 0.5] }, pct: { skillDmg: 0.06 } },
  demonblood: { flat: { hp: [5, 3] }, pct: { lifesteal: 0.03 } },
  elf: { flat: { spd: [0.5, 0.05] }, pct: { crit: 0.04 } },
  priest: { flat: {}, pct: { healPct: 0.08, shieldPct: 0.05 } },
};
// 드랍 직업 분배 (PM 확정 70 / 25 / 5)
export const CLASS_DROP = { own: 0.70, other: 0.25, common: 0.05 };

// 에픽 장신구 전용 옵션 (1.208.0 고유 옵션 12종 → 2.0에서 에픽 장신구 전용)
export const EPIC_OPTIONS = {
  w_exec: { name: '처형자', desc: 'HP 30% 이하인 적에게 피해 +50%', fx: { execute: 0.5 } },
  w_vamp: { name: '흡혈', desc: '준 피해의 8%만큼 회복', fx: { lifesteal: 0.08 } },
  w_chain: { name: '연격', desc: '단일 공격 후 25% 확률로 50% 추가 타격', fx: { chain: 0.25 } },
  w_pierce: { name: '관통', desc: '적 방어 40% 무시', fx: { armorPen: 0.4 } },
  a_thorn: { name: '가시', desc: '받은 피해의 25%를 되돌려 줌', fx: { thornsPct: 0.25 } },
  a_regen: { name: '재생', desc: '내 차례마다 최대 HP 4% 회복', fx: { regenPct: 0.04 } },
  a_bulwark: { name: '성채', desc: '전투 시작 시 최대 HP 15% 보호막', fx: { shieldPct: 0.15 } },
  a_guts: { name: '불굴', desc: '전투당 1회, 쓰러질 피해를 HP 1로 버팀', fx: { guts: 1 } },
  c_haste: { name: '신속', desc: '속도 +25%', fx: { spdPct: 0.25 } },
  c_focus: { name: '집중', desc: '치명 +10% · 치명 피해 +30%', fx: { crit: 0.1, critDmg: 0.3 } },
  c_time: { name: '시간의 모래', desc: '스킬 재사용 대기 -1턴', fx: { cdr: 1 } },
  c_fury: { name: '분노', desc: '공격력 +12%', fx: { atkPct: 0.12 } },
};

// 유니크 장비 24종 — 고정 옵션 2 + 고유 효과 (설계서 5절)
const U = (id, cls, slot, name, opts, fx, desc, extra = {}) => ({ id, cls, slot, name, opts, fx, desc, ...extra });
export const UNIQUE_ITEMS = {
  u_w_blade: U('u_w_blade', 'wanderer', 'weapon', '눈먼 자의 칼', { counterDmg: 0.3, atkPct: 0.08 }, { counterDouble: 0.5 }, '반격이 50% 확률로 2회 연속'),
  u_w_oath: U('u_w_oath', 'wanderer', 'offhand', '부동의 맹세', { defPct: 0.15, counterPct: 0.08 }, { tauntReduce: 0.3 }, '도발 중 받는 피해 -30%'),
  u_w_cloak: U('u_w_cloak', 'wanderer', 'armor', '먼지 낀 망토', { dmgReduce: 0.06, hpPct: 0.10 }, { critAfterCounter: 1 }, '반격·회피 직후 다음 공격 치명 확정'),
  u_w_beads: U('u_w_beads', 'wanderer', 'accessory', '스승의 염주', { hpPct: 0.10, defPct: 0.10 }, { emergencyHeal: 0.5 }, '전투당 1회, HP 30% 이하가 되면 HP 50% 회복'),
  u_s_staff: U('u_s_staff', 'sage', 'weapon', '영겁의 지팡이', { skillDmg: 0.12, dotDmg: 0.2 }, { dotTurnsMult: 2 }, '지속 피해가 2배 길게 지속'),
  u_s_pact: U('u_s_pact', 'sage', 'offhand', '이프리트의 계약서', { skillDmg: 0.10, atkPct: 0.08 }, { openInferno: 0.6 }, '전투 시작 시 적 전체에 「겁화」(3턴 지속 피해)'),
  u_s_robe: U('u_s_robe', 'sage', 'armor', '재의 로브', { shieldPct: 0.08, hpPct: 0.08 }, { skillShield: 0.2 }, '스킬 사용 시 공격력 20%만큼 보호막'),
  u_s_glass: U('u_s_glass', 'sage', 'accessory', '시간의 모래시계', { atkPct: 0.08, critDmg: 0.2 }, { resetEvery: 3 }, '3턴마다 무작위 스킬 재사용 대기 초기화'),
  u_d_thirst: U('u_d_thirst', 'demonblood', 'weapon', '피의 갈망', { atkPct: 0.10, hpPct: 0.08 }, { lifesteal: 0.15, overhealShield: 1 }, '흡혈 15%, 최대 HP를 넘는 회복은 보호막으로'),
  u_d_heart: U('u_d_heart', 'demonblood', 'offhand', '마왕의 심장 조각', { hpPct: 0.12, lowHpDmg: 0.1 }, { missingHpAtk: 0.06 }, '잃은 HP 10%마다 공격력 +6%'),
  u_d_scar: U('u_d_scar', 'demonblood', 'armor', '흉터 갑주', { hpPct: 0.12, dmgReduce: 0.04 }, { thornsPct: 0.15 }, '받은 피해 15% 반사'),
  u_d_brand: U('u_d_brand', 'demonblood', 'accessory', '광기의 낙인', { atkPct: 0.10, lifesteal: 0.04 }, { rageDouble: 1 }, '광폭화 중 모든 공격 2회'),
  u_e_string: U('u_e_string', 'elf', 'weapon', '바람의 현', { crit: 0.06, chain: 0.08 }, { multiHitsAdd: 2 }, '「연속 화살」 타수 +2'),
  u_e_quiver: U('u_e_quiver', 'elf', 'offhand', '정령 화살통', { crit: 0.05, spd: 3 }, { spiritArrow: 0.2 }, '공격 시 20% 확률로 정령 화살(공격력 80%)'),
  u_e_leaf: U('u_e_leaf', 'elf', 'armor', '잎새 갑옷', { dodge: 0.05, hpPct: 0.08 }, { dodgeHeal: 0.05 }, '회피할 때마다 HP 5% 회복'),
  u_e_hawk: U('u_e_hawk', 'elf', 'accessory', '매의 눈', { crit: 0.06, spd: 2 }, { critDmg: 0.6, firstCrit: 1 }, '치명 피해 +60%, 전투 첫 공격 치명 확정'),
  u_p_scepter: U('u_p_scepter', 'priest', 'weapon', '여명의 홀', { healPct: 0.12, atkPct: 0.06 }, { holyDmg: 0.3 }, '회복량의 30%만큼 적에게 신성 피해'),
  u_p_grail: U('u_p_grail', 'priest', 'offhand', '순례자의 성배', { healPct: 0.10, hpPct: 0.08 }, { revive: 0.4 }, '전투당 1회, 쓰러지면 HP 40%로 부활'),
  u_p_vest: U('u_p_vest', 'priest', 'armor', '빛의 법의', { shieldPct: 0.08, dmgReduce: 0.05 }, { shieldReduce: 0.2 }, '보호막이 남아 있는 동안 받는 피해 -20%'),
  u_p_rosary: U('u_p_rosary', 'priest', 'accessory', '축복의 묵주', { healPct: 0.10, hpPct: 0.08 }, { blessMult: 2, blessTurns: 2 }, '「축복」 효과 2배, 지속 +2턴'),
  u_c_ring: U('u_c_ring', 'common', 'accessory', '황혼의 반지', { hpPct: 0.06, atkPct: 0.06 }, { atkPct: 0.08, hpPct: 0.08, defPct: 0.08 }, '공격력·최대 HP·방어 +8%'),
  u_c_collar: U('u_c_collar', 'common', 'accessory', '사역마의 목걸이', { hpPct: 0.06, spd: 2 }, { famPct: 0.3 }, '동행 사역마의 공격력·HP +30%'),
  u_c_charm: U('u_c_charm', 'common', 'accessory', '여행자의 부적', { hpPct: 0.06, atkPct: 0.05 }, { expPct: 0.2 }, '경험치 +20%'),
  u_c_coin: U('u_c_coin', 'common', 'accessory', '탐욕의 금화', { atkPct: 0.06, crit: 0.03 }, { goldPct: 0.4, dmgTakenUp: 0.1 }, '골드 +40%, 받는 피해 +10%'),
};
// 유니크 확률 — 장비 1개당 (설계서 5절)
export const UNIQUE_CHANCE = { boss: 0.005, dungeonBoss: [0.02, 0.05, 0.10] };

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
  // 유니크는 승급 불가 (드랍 전용) — 강화는 가능
};

export const DROP_TABLE = {
  normal: { itemChance: 0.18, grades: { common: 70, uncommon: 25, rare: 5 }, essence: [1, 2] },
  elite: { itemChance: 1, grades: { common: 25, uncommon: 50, rare: 25 }, essence: [3, 5] },
  gate: { itemChance: 1, grades: { uncommon: 55, rare: 45 }, essence: [4, 6] }, // 1.213.0 관문 강적
  boss: { itemChance: 1, grades: { uncommon: 30, rare: 70 }, essence: [8, 12] },
  dungeonFloor: { itemChance: 0.5, grades: { uncommon: 40, rare: 55, epic: 5 }, essence: [3, 5], shard: [1, 2] },
  dungeonBoss: { itemChance: 1, items: 2, grades: { rare: 55, epic: 45 }, essence: [10, 15], shard: [3, 5] },
};
