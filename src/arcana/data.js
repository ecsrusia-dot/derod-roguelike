// ============================================
// arcana/data.js — 트와일라잇 아르카나 (덱빌딩 로그라이크) 데이터
// ============================================
// D&T 본편과 완전히 분리된 새 게임. 본편에서 가져오는 것은
//   - 직업 5종의 이름·색·일러스트 (src/data/classes.js CLASSES)
//   - 클래식 챕터 1~4 적의 이름·일러스트·공격 패턴 (src/data/enemies.js ENEMIES)
// 뿐이고, 수치는 ARCANA_TUNING으로 이 게임 단위로 환산한다.
//
// 카드 효과는 선언형 fx 배열 — 설명 문구는 describeFx가 자동 생성 (문구·효과 불일치 방지).
// 밸런스 조정은 이 파일 한 곳 (ARCANA_TUNING · 카드 수치 · 유물).
// ============================================
import { CLASSES } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';

export const ARCANA_TITLE = '트와일라잇 아르카나';
export const ARCANA_SUB = 'Twilight Arcana';
export const ARCANA_SAVE_KEY = 'dnt_arcana_v1';

export const ARCANA_TUNING = {
  energyPerTurn: 3,
  handSize: 5,
  // 본편 적 수치 → 아르카나 단위 환산
  enemyHpMult: { normal: 0.5, elite: 0.6, boss: 0.62 },
  enemyDmgMult: 0.42,
  enemyBlockMult: 0.4,
  actHpStep: 0.12,             // 막마다 적 HP +12%
  actDmgStep: 0.1,             // 막마다 적 공격 +10%
  bossRageStr: 3,              // 보스 HP 50% 이하 격노 — 힘 +3 (1회)
  strEvery: { normal: 4, elite: 3, boss: 3 },  // 장기전 억제 — N턴마다 적 힘 +1
  actHeal: 0.5,                // 막 보스 처치 후 잃은 체력의 50% 회복
  restHealPct: 0.3,            // 야영 회복 = 최대 체력의 30%
  gold: { battle: [12, 20], elite: [28, 38], boss: [70, 90] },
  rarityWeights: { common: 60, uncommon: 32, rare: 8 },
  eliteRarityWeights: { common: 40, uncommon: 42, rare: 18 },
  neutralChance: 0.15,         // 카드 보상 중 공용 카드 비율
  shopPrice: { common: 45, uncommon: 70, rare: 130, relic: 140, remove: 70, removeStep: 25 },
  floorsPerAct: 9,             // 0~6 갈림길 · 7 야영 · 8 보스
  nodeWeights: { battle: 46, elite: 14, rest: 14, shop: 13, treasure: 8, event: 5 },
};

// 직업별 아르카나 설정 — 본편 CLASSES의 이름·색·일러를 그대로 쓴다
const CLASS_EXTRA = {
  wanderer:   { hp: 80, level: '보통', tagline: '반격과 연격 — 방어가 곧 칼끝이 된다', sig: 'w_draw' },
  sage:       { hp: 80, level: '어려움', tagline: '고비용 대마법 — 에너지를 모아 한 방에', sig: 's_bolt' },
  demonblood: { hp: 92, level: '어려움', tagline: '피의 대가 — 잃은 체력이 힘이 된다', sig: 'd_blood' },
  elf:        { hp: 70, level: '보통', tagline: '중독과 약화 — 서서히 숨통을 조인다', sig: 'e_venom' },
  priest:     { hp: 70, level: '쉬움', tagline: '가호와 응징 — 쌓은 방어로 내려친다', sig: 'p_light' },
};

export const ARCANA_CLASSES = CLASSES.map(c => ({
  id: c.id, name: c.name, sub: c.sub, color: c.color,
  image: c.image, combatImage: c.combatImage,
  ...CLASS_EXTRA[c.id],
}));
export const arcanaClass = (id) => ARCANA_CLASSES.find(c => c.id === id) || ARCANA_CLASSES[0];

// ===== 카드 =====
// type: attack / skill / power — rarity: starter / common / uncommon / rare
// fx 연산자 (순서대로 실행):
//   dmg n (+hits, +missingPct) / dmgBlock 배수 / dmgPoison 배수
//   block · draw · energy · heal · selfDmg · str · dex · counter(이번 턴 반격)
//   vuln · weak · poison (적) · doublePoison
//   파워 지속 효과: turnBlock · turnPoison · turnStr · turnDraw · turnEnergy · turnDmg · turnSelfDmg · thorns · blockKeep · undying
// up: 강화 시 덮어쓸 필드 (cost / fx / exhaust)
const C = (id, cls, name, type, rarity, cost, fx, extra = {}) => ({ id, cls, name, type, rarity, cost, fx, ...extra });

const CARD_LIST = [
  // ── 기본 (전 직업 공통 시작 덱)
  C('strike', 'neutral', '베기', 'attack', 'starter', 1, [{ dmg: 6 }], { up: { fx: [{ dmg: 9 }] } }),
  C('defend', 'neutral', '방어', 'skill', 'starter', 1, [{ block: 5 }], { up: { fx: [{ block: 8 }] } }),

  // ── 방랑검사: 반격·연격
  C('w_draw', 'wanderer', '발도', 'attack', 'starter', 1, [{ dmg: 8 }, { vuln: 1 }], { up: { fx: [{ dmg: 10 }, { vuln: 2 }] } }),
  C('w_twin', 'wanderer', '연속 베기', 'attack', 'common', 1, [{ dmg: 4, hits: 2 }], { up: { fx: [{ dmg: 6, hits: 2 }] } }),
  C('w_insight', 'wanderer', '심안', 'skill', 'common', 1, [{ block: 6 }, { counter: 4 }], { up: { fx: [{ block: 8 }, { counter: 6 }] } }),
  C('w_riposte', 'wanderer', '받아치기', 'attack', 'common', 1, [{ dmg: 5 }, { counter: 5 }], { up: { fx: [{ dmg: 7 }, { counter: 7 }] } }),
  C('w_flow', 'wanderer', '흘려보내기', 'skill', 'common', 0, [{ block: 3 }, { draw: 1 }], { up: { fx: [{ block: 5 }, { draw: 1 }] } }),
  C('w_aura', 'wanderer', '검기', 'attack', 'uncommon', 2, [{ dmg: 6, hits: 3 }], { up: { fx: [{ dmg: 8, hits: 3 }] } }),
  C('w_storm', 'wanderer', '칼날 폭풍', 'attack', 'uncommon', 1, [{ dmg: 3, hits: 4 }], { up: { fx: [{ dmg: 3, hits: 5 }] } }),
  C('w_stance', 'wanderer', '반격의 자세', 'power', 'uncommon', 1, [{ thorns: 3 }], { up: { fx: [{ thorns: 5 }] } }),
  C('w_focus', 'wanderer', '정신 집중', 'skill', 'uncommon', 1, [{ str: 2 }], { exhaust: true, up: { fx: [{ str: 3 }] } }),
  C('w_shadow', 'wanderer', '무영의 일격', 'attack', 'rare', 2, [{ dmg: 14, hits: 2 }], { exhaust: true, up: { fx: [{ dmg: 18, hits: 2 }] } }),
  C('w_still', 'wanderer', '부동심', 'power', 'rare', 2, [{ blockKeep: 1 }], { up: { cost: 1 } }),
  C('w_mirror', 'wanderer', '명경지수', 'power', 'rare', 2, [{ turnBlock: 5 }], { up: { fx: [{ turnBlock: 7 }] } }),

  // ── 술법사: 대마법·에너지
  C('s_bolt', 'sage', '마법탄', 'attack', 'starter', 1, [{ dmg: 8 }, { draw: 1 }], { up: { fx: [{ dmg: 11 }, { draw: 1 }] } }),
  C('s_fireball', 'sage', '화염구', 'attack', 'common', 2, [{ dmg: 20 }], { up: { fx: [{ dmg: 26 }] } }),
  C('s_cycle', 'sage', '마나 순환', 'skill', 'common', 0, [{ energy: 1 }, { draw: 1 }], { exhaust: true, up: { exhaust: false } }),
  C('s_wave', 'sage', '정념 파동', 'attack', 'common', 1, [{ dmg: 5 }, { weak: 2 }], { up: { fx: [{ dmg: 8 }, { weak: 2 }] } }),
  C('s_veil', 'sage', '화염 장막', 'skill', 'common', 1, [{ block: 7 }, { counter: 3 }], { up: { fx: [{ block: 10 }, { counter: 4 }] } }),
  C('s_burst', 'sage', '정념 폭발', 'attack', 'uncommon', 3, [{ dmg: 34 }], { up: { fx: [{ dmg: 44 }] } }),
  C('s_tome', 'sage', '지혜의 서', 'skill', 'uncommon', 1, [{ draw: 3 }], { up: { fx: [{ draw: 4 }] } }),
  C('s_ifrit', 'sage', '이프리트 소환', 'power', 'uncommon', 2, [{ turnDmg: 7 }], { up: { fx: [{ turnDmg: 10 }] } }),
  C('s_hellfire', 'sage', '겁화', 'attack', 'uncommon', 1, [{ dmg: 6 }, { vuln: 2 }], { up: { fx: [{ dmg: 8 }, { vuln: 3 }] } }),
  C('s_eternal', 'sage', '영겁의 화염', 'attack', 'rare', 3, [{ dmg: 12, hits: 3 }], { exhaust: true, up: { fx: [{ dmg: 16, hits: 3 }] } }),
  C('s_overload', 'sage', '마력 폭주', 'power', 'rare', 2, [{ turnEnergy: 1 }], { up: { cost: 1 } }),
  C('s_warp', 'sage', '시간 왜곡', 'skill', 'rare', 2, [{ draw: 2 }, { energy: 2 }], { exhaust: true, up: { cost: 1 } }),

  // ── 혼혈 마족: 자해·힘·잃은 체력
  C('d_blood', 'demonblood', '피의 일격', 'attack', 'starter', 1, [{ dmg: 10 }, { selfDmg: 1 }], { up: { fx: [{ dmg: 14 }, { selfDmg: 1 }] } }),
  C('d_frenzy', 'demonblood', '광폭 참격', 'attack', 'common', 1, [{ dmg: 5, missingPct: 0.1 }], { up: { fx: [{ dmg: 7, missingPct: 0.15 }] } }),
  C('d_armor', 'demonblood', '혈갑', 'skill', 'common', 1, [{ block: 7 }, { str: 1 }, { selfDmg: 3 }], { up: { fx: [{ block: 10 }, { str: 1 }, { selfDmg: 3 }] } }),
  C('d_rage', 'demonblood', '분노', 'skill', 'common', 0, [{ selfDmg: 3 }, { str: 2 }], { exhaust: true, up: { fx: [{ selfDmg: 3 }, { str: 3 }] } }),
  C('d_drain', 'demonblood', '흡혈', 'attack', 'common', 2, [{ dmg: 12 }, { heal: 4 }], { up: { fx: [{ dmg: 16 }, { heal: 6 }] } }),
  C('d_madness', 'demonblood', '광기', 'power', 'uncommon', 1, [{ turnStr: 1 }, { turnSelfDmg: 2 }], { up: { fx: [{ turnStr: 1 }, { turnSelfDmg: 1 }] } }),
  C('d_price', 'demonblood', '피의 대가', 'skill', 'uncommon', 0, [{ selfDmg: 5 }, { energy: 2 }, { draw: 1 }], { up: { fx: [{ selfDmg: 3 }, { energy: 2 }, { draw: 1 }] } }),
  C('d_execute', 'demonblood', '처형', 'attack', 'uncommon', 2, [{ dmg: 10, missingPct: 0.3 }], { up: { fx: [{ dmg: 14, missingPct: 0.35 }] } }),
  C('d_hide', 'demonblood', '마족의 피부', 'power', 'uncommon', 1, [{ turnBlock: 3 }], { up: { fx: [{ turnBlock: 5 }] } }),
  C('d_fury', 'demonblood', '혈마의 격노', 'attack', 'rare', 2, [{ dmg: 8, missingPct: 0.5 }], { exhaust: true, up: { cost: 1 } }),
  C('d_undying', 'demonblood', '불사의 피', 'power', 'rare', 2, [{ undying: 1 }], { up: { cost: 1 } }),
  C('d_slaughter', 'demonblood', '학살', 'attack', 'rare', 1, [{ dmg: 4, hits: 3 }], { up: { fx: [{ dmg: 6, hits: 3 }] } }),

  // ── 숲의 정령사: 중독·약화·드로우
  C('e_venom', 'elf', '독화살', 'attack', 'starter', 1, [{ dmg: 5 }, { poison: 2 }], { up: { fx: [{ dmg: 7 }, { poison: 3 }] } }),
  C('e_aim', 'elf', '정밀 사격', 'attack', 'common', 1, [{ dmg: 8 }, { draw: 1 }], { up: { fx: [{ dmg: 11 }, { draw: 1 }] } }),
  C('e_volley', 'elf', '연속 화살', 'attack', 'common', 1, [{ dmg: 3, hits: 3 }], { up: { fx: [{ dmg: 4, hits: 3 }] } }),
  C('e_wind', 'elf', '바람 결계', 'skill', 'common', 1, [{ block: 7 }, { weak: 1 }], { up: { fx: [{ block: 9 }, { weak: 2 }] } }),
  C('e_coat', 'elf', '맹독 바르기', 'skill', 'common', 1, [{ poison: 5 }], { up: { fx: [{ poison: 8 }] } }),
  C('e_mist', 'elf', '독 안개', 'skill', 'uncommon', 2, [{ poison: 9 }, { weak: 1 }], { up: { fx: [{ poison: 12 }, { weak: 2 }] } }),
  C('e_catalyst', 'elf', '촉매', 'skill', 'uncommon', 1, [{ doublePoison: 1 }], { exhaust: true, up: { cost: 0 } }),
  C('e_spirit', 'elf', '풍령의 가호', 'power', 'uncommon', 1, [{ turnPoison: 2 }], { up: { fx: [{ turnPoison: 3 }] } }),
  C('e_step', 'elf', '바람의 걸음', 'skill', 'uncommon', 0, [{ block: 2 }, { draw: 2 }], { up: { fx: [{ block: 4 }, { draw: 2 }] } }),
  C('e_rain', 'elf', '천공의 화살비', 'attack', 'rare', 2, [{ dmg: 4, hits: 5 }], { up: { fx: [{ dmg: 5, hits: 6 }] } }),
  C('e_bless', 'elf', '숲의 축복', 'power', 'rare', 1, [{ turnDraw: 1 }], { up: { cost: 0 } }),
  C('e_wrath', 'elf', '정령의 분노', 'attack', 'rare', 1, [{ dmgPoison: 2 }], { up: { fx: [{ dmgPoison: 3 }] } }),

  // ── 여명의 사제: 가호·회복·응징
  C('p_light', 'priest', '성스러운 빛', 'attack', 'starter', 1, [{ dmg: 7 }, { block: 3 }], { up: { fx: [{ dmg: 9 }, { block: 4 }] } }),
  C('p_wall', 'priest', '신성 방벽', 'skill', 'common', 1, [{ block: 7 }], { up: { fx: [{ block: 10 }] } }),
  C('p_smite', 'priest', '응징', 'attack', 'common', 1, [{ dmgBlock: 0.6 }], { up: { fx: [{ dmgBlock: 0.8 }] } }),
  C('p_prayer', 'priest', '기도', 'skill', 'common', 1, [{ block: 5 }, { heal: 3 }], { exhaust: true, up: { fx: [{ block: 7 }, { heal: 5 }] } }),
  C('p_bless', 'priest', '축복', 'skill', 'common', 0, [{ dex: 1 }], { exhaust: true, up: { fx: [{ dex: 2 }] } }),
  C('p_aegis', 'priest', '여명의 갑주', 'power', 'uncommon', 2, [{ turnBlock: 3 }], { up: { fx: [{ turnBlock: 5 }] } }),
  C('p_purge', 'priest', '정화의 불꽃', 'attack', 'uncommon', 2, [{ dmg: 12 }, { weak: 2 }], { up: { fx: [{ dmg: 16 }, { weak: 2 }] } }),
  C('p_grace', 'priest', '신의 은총', 'skill', 'uncommon', 2, [{ block: 12 }], { up: { fx: [{ block: 16 }] } }),
  C('p_penance', 'priest', '참회', 'attack', 'uncommon', 1, [{ dmg: 6 }, { block: 3 }], { up: { fx: [{ dmg: 8 }, { block: 5 }] } }),
  C('p_descent', 'priest', '여명의 강림', 'skill', 'rare', 2, [{ heal: 8 }, { block: 10 }], { exhaust: true, up: { fx: [{ heal: 11 }, { block: 14 }] } }),
  C('p_sanctum', 'priest', '성역', 'power', 'rare', 2, [{ thorns: 2 }, { turnBlock: 2 }], { up: { fx: [{ thorns: 3 }, { turnBlock: 3 }] } }),
  C('p_judgement', 'priest', '신벌', 'attack', 'rare', 2, [{ dmgBlock: 1.2 }], { up: { cost: 1 } }),

  // ── 공용 (보상 일부·상점)
  C('n_aid', 'neutral', '응급 처치', 'skill', 'common', 1, [{ heal: 6 }], { exhaust: true, up: { fx: [{ heal: 9 }] } }),
  C('n_smoke', 'neutral', '연막', 'skill', 'common', 1, [{ block: 5 }, { weak: 1 }], { up: { fx: [{ block: 7 }, { weak: 2 }] } }),
  C('n_breath', 'neutral', '숨 고르기', 'skill', 'common', 1, [{ draw: 2 }], { up: { cost: 0 } }),
  C('n_stab', 'neutral', '급소 찌르기', 'attack', 'common', 0, [{ dmg: 3 }, { vuln: 1 }], { up: { fx: [{ dmg: 5 }, { vuln: 1 }] } }),
  C('n_resolve', 'neutral', '결의', 'skill', 'uncommon', 1, [{ str: 1 }, { dex: 1 }], { exhaust: true, up: { cost: 0 } }),
  C('n_decisive', 'neutral', '회심의 일격', 'attack', 'uncommon', 2, [{ dmg: 20 }], { exhaust: true, up: { fx: [{ dmg: 27 }] } }),
];

export const ARCANA_CARDS = Object.fromEntries(CARD_LIST.map(c => [c.id, c]));

// 강화 반영 실효 카드
export function cardDef(id, up = false) {
  const base = ARCANA_CARDS[id];
  if (!base) return null;
  if (!up || !base.up) return { ...base, upgraded: !!up };
  return { ...base, ...base.up, upgraded: true, name: base.name + '+' };
}

export const RARITY_META = {
  starter: { label: '기본', color: '#9b8975' },
  common: { label: '일반', color: '#9b8975' },
  uncommon: { label: '고급', color: '#7ba3c4' },
  rare: { label: '희귀', color: '#e8b04a' },
};
export const TYPE_META = {
  attack: { label: '공격', color: '#c4453d', icon: '⚔' },
  skill: { label: '기술', color: '#7ba3c4', icon: '🛡' },
  power: { label: '파워', color: '#b48ce0', icon: '✦' },
};

// ===== 설명 문구 자동 생성 =====
const pct = (x) => `${Math.round(x * 100)}%`;
function describeOp(op) {
  if (op.dmg != null) {
    let t = `피해 ${op.dmg}`;
    if (op.missingPct) t += ` + 잃은 체력의 ${pct(op.missingPct)}`;
    if (op.hits > 1) t += ` × ${op.hits}회`;
    return t;
  }
  if (op.dmgBlock != null) return op.dmgBlock < 1 ? `현재 방어도의 ${pct(op.dmgBlock)}만큼 피해` : op.dmgBlock === 1 ? '현재 방어도만큼 피해' : `현재 방어도의 ${op.dmgBlock}배 피해`;
  if (op.dmgPoison != null) return `적 중독 수치의 ${op.dmgPoison}배 피해`;
  if (op.block != null) return `방어 ${op.block}`;
  if (op.draw != null) return `카드 ${op.draw}장 뽑기`;
  if (op.energy != null) return `에너지 +${op.energy}`;
  if (op.heal != null) return `체력 ${op.heal} 회복`;
  if (op.selfDmg != null) return `체력 ${op.selfDmg} 잃음`;
  if (op.str != null) return `힘 +${op.str}`;
  if (op.dex != null) return `민첩 +${op.dex}`;
  if (op.counter != null) return `이번 턴 공격받으면 반격 ${op.counter}`;
  if (op.vuln != null) return `취약 ${op.vuln}`;
  if (op.weak != null) return `약화 ${op.weak}`;
  if (op.poison != null) return `중독 ${op.poison}`;
  if (op.doublePoison) return '적 중독 수치 2배';
  if (op.turnBlock != null) return `매 턴 시작 방어 ${op.turnBlock}`;
  if (op.turnPoison != null) return `매 턴 시작 적에게 중독 ${op.turnPoison}`;
  if (op.turnStr != null) return `매 턴 시작 힘 +${op.turnStr}`;
  if (op.turnDraw != null) return `매 턴 카드 +${op.turnDraw}장`;
  if (op.turnEnergy != null) return `매 턴 에너지 +${op.turnEnergy}`;
  if (op.turnDmg != null) return `매 턴 시작 적에게 피해 ${op.turnDmg}`;
  if (op.turnSelfDmg != null) return `매 턴 체력 ${op.turnSelfDmg} 잃음`;
  if (op.thorns != null) return `공격받을 때마다 반격 ${op.thorns}`;
  if (op.blockKeep) return '방어도가 턴이 끝나도 사라지지 않음';
  if (op.undying) return '전투당 1회, 쓰러질 때 체력 1로 버팀';
  return '';
}
export function describeCard(card) {
  const parts = card.fx.map(describeOp).filter(Boolean);
  if (card.exhaust) parts.push('소멸');
  return parts.join(' · ');
}

export const ARCANA_KEYWORDS = [
  { k: '방어', d: '받는 피해를 먼저 막는다. 내 턴이 시작되면 사라진다.' },
  { k: '취약', d: '받는 공격 피해 +50%. 턴마다 1씩 줄어든다.' },
  { k: '약화', d: '주는 공격 피해 -25%. 턴마다 1씩 줄어든다.' },
  { k: '중독', d: '턴 시작마다 수치만큼 피해(방어 무시) 후 1 감소.' },
  { k: '힘 / 민첩', d: '힘은 공격 피해, 민첩은 방어 카드 수치를 올린다.' },
  { k: '반격', d: '적의 공격 한 번마다 반격 수치만큼 되돌려준다.' },
  { k: '소멸', d: '사용하면 이번 전투 동안 덱에서 빠진다.' },
  { k: '파워', d: '사용하면 전투가 끝날 때까지 효과가 유지된다.' },
];

// ===== 유물 =====
export const ARCANA_RELICS = {
  frost_shard: { name: '서리 결정', icon: '❄', desc: '전투 시작 시 적에게 취약 1', fx: { startVuln: 1 } },
  wolf_fang: { name: '늑대 송곳니', icon: '🦷', desc: '전투 시작 시 힘 +1', fx: { startStr: 1 } },
  wraith_lamp: { name: '망령의 등불', icon: '🏮', desc: '첫 턴 카드 +2장', fx: { firstDraw: 2 } },
  giant_shield: { name: '거인의 방패', icon: '🛡', desc: '전투 시작 시 방어 10', fx: { startBlock: 10 } },
  witch_vial: { name: '마녀의 독병', icon: '🧪', desc: '전투 시작 시 적에게 중독 4', fx: { startPoison: 4 } },
  dawn_grail: { name: '여명의 성배', icon: '🏆', desc: '전투 승리 시 체력 6 회복', fx: { victoryHeal: 6 } },
  blood_oath: { name: '피의 서약', icon: '🩸', desc: '최대 체력 +12', fx: { maxHp: 12 } },
  gold_scale: { name: '황금 저울', icon: '⚖', desc: '골드 획득 +30%', fx: { goldPct: 30 } },
  hourglass: { name: '고대 모래시계', icon: '⏳', desc: '매 턴 시작 방어 2', fx: { turnBlock: 2 } },
  spirit_feather: { name: '정령의 깃털', icon: '🪶', desc: '첫 턴 에너지 +1', fx: { firstEnergy: 1 } },
  seal_ring: { name: '봉인 반지', icon: '💍', desc: '상점 가격 -20%', fx: { shopDiscount: 20 } },
  map: { name: '탐험가의 지도', icon: '🗺', desc: '카드 보상 선택지 +1장', fx: { rewardPlus: 1 } },
  // 보스 유물 (막 보스 처치 시 3택 1)
  twilight_heart: { name: '황혼의 심장', icon: '🜂', desc: '매 턴 에너지 +1 · 야영에서 회복 불가', fx: { turnEnergy: 1, noRestHeal: 1 }, boss: true },
  demon_crown: { name: '마왕의 왕관', icon: '👑', desc: '매 턴 에너지 +1 · 카드 보상 선택지 -1장', fx: { turnEnergy: 1, rewardPlus: -1 }, boss: true },
  time_gear: { name: '시간의 톱니', icon: '⚙', desc: '매 턴 카드 +1장', fx: { turnDraw: 1 }, boss: true },
};

export function relicFx(relicIds = []) {
  const out = {};
  for (const id of relicIds) {
    const r = ARCANA_RELICS[id];
    if (!r) continue;
    for (const [k, v] of Object.entries(r.fx)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

// ===== 막(Act) — 본편 클래식 챕터 1~4의 적 재사용 =====
export const ARCANA_ACTS = [
  { act: 1, name: '북부 극지대', color: '#7ba3c4' },
  { act: 2, name: '죽은 자의 숲', color: '#7a9a5e' },
  { act: 3, name: '봉인된 신전', color: '#d4a574' },
  { act: 4, name: '마계의 균열', color: '#c4453d' },
];

export function actEnemyKeys(act, tier) {
  return Object.entries(ENEMIES)
    .filter(([, e]) => e.chapter === act && e.tier === tier)
    .map(([k]) => k);
}

export function enemyArt(key, kind = 'combat') {
  const e = ENEMIES[key];
  if (!e) return null;
  return `./enemies/classic/chapter_${e.chapter}/${key}_${kind}.jpg`;
}
export const BOSS_INTRO = new Set(['iceMage', 'twilightChild', 'oblivionSealer', 'nakzelionShadow']);

// 본편 적 → 아르카나 적
export function buildArcanaEnemy(key) {
  const e = ENEMIES[key];
  const T = ARCANA_TUNING;
  const step = Math.max(0, (e.chapter || 1) - 1);
  const hpMult = (T.enemyHpMult[e.tier] || 0.5) * (1 + T.actHpStep * step);
  const dmgMult = T.enemyDmgMult * (1 + T.actDmgStep * step);
  const hp = Math.round(e.hp * hpMult);
  const patterns = e.patterns.map(p => (p.type === 'defend'
    ? { name: p.name, type: 'defend', block: Math.max(4, Math.round((p.defense || 10) * T.enemyBlockMult)) }
    : { name: p.name, type: 'attack', heavy: !!p.heavy, dmg: [Math.max(2, Math.round(p.dmg[0] * dmgMult)), Math.max(3, Math.round(p.dmg[1] * dmgMult))] }));
  return { key, name: e.name, desc: e.desc, color: e.color, tier: e.tier, hp, maxHp: hp, patterns };
}

// ===== 사건 (간단 선택지) =====
export const ARCANA_EVENTS = [
  {
    id: 'shrine', title: '버려진 제단', text: '얼어붙은 제단 위에 희미한 빛이 남아 있다. 피를 바치면 무언가를 돌려줄 것 같다.',
    choices: [
      { label: '피를 바친다', desc: '체력 8 잃음 · 희귀 카드 1장', ops: [{ hp: -8 }, { card: 'rare' }] },
      { label: '기도만 올린다', desc: '체력 10 회복', ops: [{ hp: 10 }] },
    ],
  },
  {
    id: 'merchant', title: '떠돌이 상인', text: '수레를 끄는 상인이 낡은 상자를 내민다. "값은 미리, 내용은 나중에."',
    choices: [
      { label: '상자를 산다 (60골드)', desc: '유물 1개', ops: [{ gold: -60 }, { relic: 1 }], needGold: 60 },
      { label: '그냥 지나간다', desc: '아무 일도 없다', ops: [] },
    ],
  },
  {
    id: 'library', title: '봉인된 서고', text: '먼지 쌓인 책장 사이에서 낯익은 문장이 눈에 들어온다. 오래 머물면 위험하다.',
    choices: [
      { label: '오래 읽는다', desc: '체력 6 잃음 · 덱의 카드 1장 강화', ops: [{ hp: -6 }, { upgrade: 1 }] },
      { label: '한 장만 찢어 간다', desc: '덱에서 카드 1장 제거', ops: [{ remove: 1 }] },
    ],
  },
  {
    id: 'spring', title: '황혼의 샘', text: '붉게 물든 샘물이 고요하다. 마시면 몸이 가벼워지지만 대가가 따른다.',
    choices: [
      { label: '샘물을 마신다', desc: '최대 체력 +6 · 골드 30 잃음', ops: [{ maxHp: 6 }, { gold: -30 }], needGold: 30 },
      { label: '병에 담아 간다', desc: '골드 +40', ops: [{ gold: 40 }] },
    ],
  },
];
