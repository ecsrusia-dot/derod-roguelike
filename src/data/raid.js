// ============================================
// data/raid.js — 레이드 시스템 (1.74.0~, 던전앤파이터 모티브)
// ============================================
// PM 확정 설계 (1.73.0 세션):
//   - 본편과 "아예 별개의 게임" — 스탯·스킬·장비 모두 본편과 분리
//   - 5직업 전원 출전 파티 (탱 1 / 딜 3 / 힐 1)
//   - 전투는 풀오토 + 관전 — 장비 파밍이 성장의 전부
//   - 장비 직업별 3부위 (무기/방어구/장신구), 등급 C/R/E/L
//   - 던파 루프: 파밍 던전에서 장비 → 상위 레이드 보스 도전
// ============================================

// =========== 레이드 파티 베이스 스탯 (본편과 무관) ===========
export const RAID_CLASSES = {
  wanderer:   { role: 'tank',   roleName: '탱커', hp: 900, atk: 45,  desc: '도발로 보스의 공격을 받아내는 방패. 받는 데미지 -30%.' },
  demonblood: { role: 'dealer', roleName: '딜러', hp: 620, atk: 105, desc: '잃은 HP의 40%만큼 추가 데미지를 얹는 광전사.' },
  elf:        { role: 'dealer', roleName: '딜러', hp: 520, atk: 88,  desc: '치명타 확률 25%의 연사 딜러.' },
  sage:       { role: 'dealer', roleName: '딜러', hp: 500, atk: 98,  desc: '3라운드마다 메테오(150%)를 떨어뜨리는 화력 딜러.' },
  priest:     { role: 'healer', roleName: '힐러', hp: 560, atk: 32,  heal: 90, desc: '가장 아픈 아군을 치유하고, 전멸기를 방벽으로 막는 생명줄.' },
};

// =========== 레이드 전용 스킬 (본편 COMBAT_SKILLS와 분리) ===========
export const RAID_SKILLS = {
  wanderer:   { name: '수호 태세',  desc: '도발 — 보스의 단일 공격을 전부 자신이 받고, 받는 데미지 -30%' },
  demonblood: { name: '혈폭(血爆)', desc: '공격 시 잃은 HP의 40%만큼 추가 데미지' },
  elf:        { name: '폭풍 연사',  desc: '치명타 확률 25% (파티 최고) — 치명타 시 데미지 ×1.5' },
  sage:       { name: '메테오',     desc: '3라운드마다 데미지 ×1.5 광역 낙하' },
  priest:     { name: '집단 치유',  desc: '매 라운드 가장 아픈 아군 회복. 전멸기 예고 라운드엔 파티 방벽(피해 -70%)' },
};

// =========== 장비 시스템 ===========
export const RAID_SLOTS = ['weapon', 'armor', 'accessory'];
export const RAID_SLOT_NAMES = { weapon: '무기', armor: '방어구', accessory: '장신구' };

export const RAID_RARITIES = {
  C: { name: '일반', color: '#9b8975', mult: 1.0 },
  R: { name: '희귀', color: '#7ba3c4', mult: 1.6 },
  E: { name: '영웅', color: '#8a76c9', mult: 2.6 },
  L: { name: '전설', color: '#e8b04a', mult: 4.0 },
};

// 슬롯별 기본 스탯 (등급 배율 곱 + ±20% 랜덤 롤)
const SLOT_BASE = {
  weapon:    { atk: 14, hp: 0 },
  armor:     { atk: 0,  hp: 100 },
  accessory: { atk: 7,  hp: 50 },
};

// 직업 × 슬롯 장비 이름표
export const RAID_GEAR_NAMES = {
  wanderer:   { weapon: '수호자의 대검',   armor: '강철 흉갑',     accessory: '맹세의 견장' },
  demonblood: { weapon: '혈마의 마검',     armor: '핏빛 갑주',     accessory: '광기의 목걸이' },
  elf:        { weapon: '폭풍의 장궁',     armor: '정령의 경갑',   accessory: '바람의 귀걸이' },
  sage:       { weapon: '겁화의 지팡이',   armor: '이프리트 로브', accessory: '화염의 인장' },
  priest:     { weapon: '여명의 성장(聖杖)', armor: '축복의 법의',  accessory: '새벽의 성표' },
};

// =========== 던전 (던파 루프: 파밍 → 레이드) ===========
export const RAID_DUNGEONS = [
  {
    id: 'raid_corridor', kind: 'farm',
    name: '무너진 회랑', sub: 'FARMING DUNGEON',
    desc: '장비 파밍 던전. 문지기를 쓰러뜨리고 장비 2개를 챙긴다.',
    boss: { name: '회랑의 문지기', hp: 3200, atk: 130, aoeEvery: 4, enrageAt: 0.5 },
    drops: 2,
    rarityWeights: { C: 55, R: 32, E: 11, L: 2 },
    recommendedPower: 900,
    color: '#7ba3c4',
  },
  {
    id: 'raid_abyss', kind: 'raid',
    name: '심연의 제단', sub: 'RAID BOSS',
    desc: '레이드 보스. 8라운드마다 전멸기 — 사제의 방벽 없이는 파티가 무너진다. 상위 장비를 갖추고 도전하라.',
    boss: { name: '심연의 군주', hp: 13000, atk: 240, aoeEvery: 3, wipeEvery: 8, enrageAt: 0.5 },
    drops: 3,
    rarityWeights: { C: 15, R: 45, E: 30, L: 10 },
    recommendedPower: 1600,
    color: '#8b1f1f',
  },
];

// =========== 장비 롤 / 스탯 계산 ===========
let _raidItemSeq = 0;

// 등급 가중치 추첨 → 장비 1개 생성 (직업·슬롯 랜덤)
export function rollRaidDrop(dungeon) {
  const weights = dungeon.rarityWeights || { C: 60, R: 30, E: 9, L: 1 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let rarity = 'C';
  for (const [key, w] of Object.entries(weights)) {
    r -= w;
    if (r < 0) { rarity = key; break; }
  }
  const classIds = Object.keys(RAID_CLASSES);
  const classId = classIds[Math.floor(Math.random() * classIds.length)];
  const slot = RAID_SLOTS[Math.floor(Math.random() * RAID_SLOTS.length)];
  const base = SLOT_BASE[slot];
  const mult = RAID_RARITIES[rarity].mult;
  const roll = 0.8 + Math.random() * 0.4; // ±20%
  const atk = Math.round(base.atk * mult * roll);
  const hp = Math.round(base.hp * mult * roll);
  _raidItemSeq += 1;
  return {
    id: `rg_${Date.now().toString(36)}_${_raidItemSeq}_${Math.floor(Math.random() * 1e4)}`,
    classId, slot, rarity,
    name: RAID_GEAR_NAMES[classId][slot],
    atk, hp,
    power: atk * 4 + hp,
  };
}

// 파티원 실스탯 = 베이스 + 장착 장비 3부위 합산
export function getRaidMemberStats(classId, equipped) {
  const base = RAID_CLASSES[classId];
  if (!base) return null;
  let atk = base.atk;
  let hp = base.hp;
  const eq = equipped || {};
  RAID_SLOTS.forEach(slot => {
    const item = eq[slot];
    if (item) { atk += item.atk || 0; hp += item.hp || 0; }
  });
  return { ...base, atk, hp, power: atk * 4 + hp + (base.heal || 0) * 3 };
}

// 파티 전투력 합계 (레이드 로비·던전 권장 전투력 비교용)
export function getRaidPartyPower(raidMeta) {
  return Object.keys(RAID_CLASSES).reduce((sum, classId) => {
    const stats = getRaidMemberStats(classId, raidMeta?.equipped?.[classId]);
    return sum + (stats?.power || 0);
  }, 0);
}
