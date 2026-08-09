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

// 등급 6단계 — 던파 사다리(커먼→언커먼→레어→유니크→레전더리→에픽) 구조 참고, 명칭 오리지널
// PM 룰: 높은 등급일수록 드랍율은 반드시 낮게 (던전별 rarityWeights가 전부 단조 감소)
export const RAID_RARITIES = {
  C:  { name: '일반',     color: '#9b8975', mult: 1.0 },
  UC: { name: '고급',     color: '#7a9a5e', mult: 1.35 },
  R:  { name: '희귀',     color: '#7ba3c4', mult: 1.8 },
  U:  { name: '유니크',   color: '#c46ba3', mult: 2.5 },
  L:  { name: '레전더리', color: '#e8873a', mult: 3.5 },
  EP: { name: '에픽',     color: '#e8b04a', mult: 5.0 },
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

// =========== 던전 (던파 루프: 지역 → 던전 → 방 진행) ===========
// 던파 구조 참고 (지역-던전 편성 / 일반몹→네임드→보스 / 상위 던전일수록 상위 등급 드랍 ↑),
// 이름·세계관은 던앤트와일라잇 오리지널 (PM 결정 — IP 리스크 0).
//
// 방 진행형 — rooms 배열을 순서대로 돌파. 파티 HP는 방 사이에 10%만 회복 (소모전).
// room.kind: 'mobs'(쫄) / 'named'(네임드) / 'boss'(보스)
// room.drops: 이 방 클리어 시 즉시 획득 — 중도 전멸·후퇴해도 이미 얻은 전리품은 보존
//
// gearMult: 이 던전에서 드랍되는 장비의 성능 배율 (상위 던전 장비가 더 강함 — 던파 티어 구조)
// gearPrefix: 장비 이름 접두어 (던전 시리즈 장비)
// rarityWeights: 등급별 드랍 가중치 — 반드시 단조 감소 (높은 등급 = 낮은 확률, PM 룰)
export const RAID_REGIONS = [
  { id: 'ash',    name: '잿빛 변경',   desc: '입문 파밍 지역 — 맨몸 파티도 돌파 가능' },
  { id: 'sanct',  name: '침묵의 성역', desc: '중급 지역 — 잿빛 장비 없이는 버티기 어렵다' },
  { id: 'abyss',  name: '심연',        desc: '레이드 — 최상위 장비의 무대' },
];

export const RAID_DUNGEONS = [
  // ===== 지역 1: 잿빛 변경 (입문 파밍) =====
  {
    id: 'raid_corridor', region: 'ash', kind: 'farm',
    name: '무너진 회랑', sub: 'FARM · T1',
    desc: '방 4개를 돌파하는 입문 던전. 네임드와 문지기가 잿빛 장비를 떨군다.',
    rarityWeights: { C: 45, UC: 28, R: 16, U: 8, L: 2.5, EP: 0.5 },
    recommendedPower: 4800, gearMult: 1.0, gearPrefix: '잿빛', weeklyStones: 5,
    color: '#9b8975',
    rooms: [
      { kind: 'mobs',  name: '무너진 경비대',   hp: 900,  atk: 70,  drops: 0 },
      { kind: 'mobs',  name: '회랑의 그림자들', hp: 1100, atk: 85,  drops: 0 },
      { kind: 'named', name: '이름 잃은 기사',  hp: 1800, atk: 110, aoeEvery: 5, drops: 1 },
      { kind: 'boss',  name: '회랑의 문지기',   hp: 3200, atk: 130, aoeEvery: 4, enrageAt: 0.5, drops: 2 },
    ],
  },
  {
    id: 'raid_mine', region: 'ash', kind: 'farm',
    name: '서리 잠식 갱도', sub: 'FARM · T2',
    desc: '한기가 스민 폐광. 갱도 깊은 곳의 파괴자가 서리철 장비를 지킨다.',
    rarityWeights: { C: 38, UC: 28, R: 19, U: 10, L: 4, EP: 1 },
    recommendedPower: 5400, gearMult: 1.15, gearPrefix: '서리철', weeklyStones: 6,
    color: '#9bc4e0',
    rooms: [
      { kind: 'mobs',  name: '갱도 냉기벌레 떼', hp: 1200, atk: 95,  drops: 0 },
      { kind: 'mobs',  name: '얼어붙은 광부들',  hp: 1400, atk: 105, drops: 0 },
      { kind: 'named', name: '서리핏줄 우두머리', hp: 2300, atk: 125, aoeEvery: 5, drops: 1 },
      { kind: 'boss',  name: '갱도의 파괴자',    hp: 4000, atk: 145, aoeEvery: 4, enrageAt: 0.5, drops: 2 },
    ],
  },
  {
    id: 'raid_sewer', region: 'ash', kind: 'farm',
    name: '부패한 지하수로', sub: 'FARM · T3',
    desc: '오물이 흐르는 수로. 침식된 장비는 더럽지만 강하다.',
    rarityWeights: { C: 38, UC: 28, R: 19, U: 10, L: 4, EP: 1 },
    recommendedPower: 6000, gearMult: 1.3, gearPrefix: '침식된', weeklyStones: 8,
    color: '#7a9a5e',
    rooms: [
      { kind: 'mobs',  name: '수로 쥐떼',      hp: 1500, atk: 115, drops: 0 },
      { kind: 'mobs',  name: '부패 점액괴',    hp: 1800, atk: 125, drops: 0 },
      { kind: 'named', name: '수로의 감시자',  hp: 2900, atk: 150, aoeEvery: 5, summonEvery: 4, drops: 1 },
      { kind: 'boss',  name: '오물의 군주',    hp: 5000, atk: 170, aoeEvery: 4, summonEvery: 4, enrageAt: 0.5, drops: 2 },
    ],
  },

  // ===== 지역 2: 침묵의 성역 (중급) =====
  {
    id: 'raid_abbey', region: 'sanct', kind: 'farm',
    name: '봉인된 수도원', sub: 'DUNGEON · T4',
    desc: '기도가 저주로 변한 수도원. 봉인된 장비 시리즈가 잠들어 있다.',
    rarityWeights: { C: 30, UC: 26, R: 21, U: 14, L: 7, EP: 2 },
    recommendedPower: 6800, gearMult: 1.5, gearPrefix: '봉인된', weeklyStones: 10,
    color: '#8a76c9',
    rooms: [
      { kind: 'mobs',  name: '타락 수도승들',  hp: 2000, atk: 140, drops: 0 },
      { kind: 'mobs',  name: '참회의 망령들',  hp: 2400, atk: 150, drops: 0 },
      { kind: 'named', name: '고행자 무언(無言)', hp: 3800, atk: 180, aoeEvery: 4, drops: 1 },
      { kind: 'boss',  name: '수도원장 침묵',  hp: 6500, atk: 205, aoeEvery: 4, healCutEvery: 5, enrageAt: 0.5, drops: 2 },
    ],
  },
  {
    id: 'raid_arena', region: 'sanct', kind: 'farm',
    name: '핏빛 투기장', sub: 'DUNGEON · T5',
    desc: '끝나지 않는 살육제. 혈권을 꺾으면 핏빛 장비가 쏟아진다.',
    rarityWeights: { C: 30, UC: 26, R: 21, U: 14, L: 7, EP: 2 },
    recommendedPower: 7600, gearMult: 1.7, gearPrefix: '핏빛', weeklyStones: 12,
    color: '#c4453d',
    rooms: [
      { kind: 'mobs',  name: '투기장 검투노예', hp: 2600, atk: 165, drops: 0 },
      { kind: 'mobs',  name: '사슬 맹수 우리',  hp: 3000, atk: 180, drops: 0 },
      { kind: 'named', name: '백전의 검투사',   hp: 4800, atk: 215, aoeEvery: 3, drops: 1 },
      { kind: 'boss',  name: '투기장주 혈권(血拳)', hp: 8000, atk: 245, aoeEvery: 4, pierceTankChance: 0.3, enrageAt: 0.5, drops: 3 },
    ],
  },
  {
    id: 'raid_spire', region: 'sanct', kind: 'farm',
    name: '별이 떨어진 첨탑', sub: 'DUNGEON · T6',
    desc: '추락한 별의 힘이 깃든 첨탑. 대현자는 10라운드마다 별을 떨어뜨린다.',
    rarityWeights: { C: 26, UC: 24, R: 21, U: 15, L: 10, EP: 4 },
    recommendedPower: 8400, gearMult: 1.9, gearPrefix: '별빛', weeklyStones: 15,
    color: '#d4a574',
    rooms: [
      { kind: 'mobs',  name: '별파편 정령들',  hp: 3200, atk: 195, drops: 0 },
      { kind: 'mobs',  name: '첨탑 수호석상',  hp: 3600, atk: 210, drops: 0 },
      { kind: 'named', name: '관측자 아득',    hp: 5800, atk: 250, aoeEvery: 3, enrageAt: 0.4, drops: 1 },
      { kind: 'boss',  name: '첨탑의 대현자',  hp: 10000, atk: 285, aoeEvery: 3, wipeEvery: 10, enrageAt: 0.5, drops: 3 },
    ],
  },

  // ===== 지역 3: 심연 (레이드) =====
  {
    id: 'raid_abyss', region: 'abyss', kind: 'raid',
    name: '심연의 제단', sub: 'RAID · 3관문',
    desc: '관문 3개의 최상위 레이드. 군주는 8라운드마다 전멸기 — 사제의 방벽 없이는 파티가 무너진다. 심연의 장비는 에픽 확률이 가장 높다.',
    rarityWeights: { C: 24, UC: 22, R: 20, U: 16, L: 12, EP: 6 },
    recommendedPower: 9500, gearMult: 2.2, gearPrefix: '심연의', weeklyStones: 30,
    color: '#8b1f1f',
    rooms: [
      { kind: 'named', name: '심연의 파수꾼',  hp: 7000,  atk: 240, aoeEvery: 4, summonEvery: 5, drops: 1 },
      { kind: 'named', name: '공허의 쌍둥이',  hp: 10000, atk: 280, aoeEvery: 3, enrageAt: 0.4, drops: 2 },
      { kind: 'boss',  name: '심연의 군주',    hp: 18000, atk: 330, aoeEvery: 3, wipeEvery: 8, enrageAt: 0.5, drops: 3 },
    ],
  },
];

// =========== 2차 시스템 (1.75.0~): 분해·강화 / 세트 / 주간 보상 ===========

// 레이드 전용 재화 — 장비 분해로 획득, 강화에 소모
export const RAID_STONE = { name: '심연석', icon: '💠' };

// 등급별 분해 값 (높은 등급 = 많은 심연석)
export const RAID_DISMANTLE_VALUES = { C: 1, UC: 2, R: 4, U: 8, L: 15, EP: 30 };

// 강화 — 장착 장비 대상, 실패·파괴 없음. 단계당 성능 +8%, 상위 단계일수록 비용 증가
export const RAID_ENHANCE = {
  max: 10,
  bonusPerLv: 0.08,
  costFor: (lv) => 5 * (lv + 1), // +1→5, +2→10 … +10→50 (총 275)
};

// 세트 효과 — 같은 시리즈(던전 접두어) 3부위 장착 시 발동
export const RAID_SET_BONUSES = {
  '잿빛':   { name: '잿빛 3세트',   hpPct: 6,  atkPct: 0 },
  '서리철': { name: '서리철 3세트', hpPct: 0,  atkPct: 5 },
  '침식된': { name: '침식된 3세트', hpPct: 8,  atkPct: 0 },
  '봉인된': { name: '봉인된 3세트', hpPct: 0,  atkPct: 8 },
  '핏빛':   { name: '핏빛 3세트',   hpPct: 0,  atkPct: 10 },
  '별빛':   { name: '별빛 3세트',   hpPct: 8,  atkPct: 8 },
  '심연의': { name: '심연의 3세트', hpPct: 12, atkPct: 12 },
};

// KST 기준 이번 주(월요일 시작) 키 — 주간 첫 클리어 보상 리셋용
export function getKstWeekKey(now = new Date()) {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const day = kst.getUTCDay(); // 0=일
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(kstMs - diffToMonday * 24 * 60 * 60 * 1000);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const d = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// 강화 반영 실효 스탯 — 장비 1개 (atk/hp/power에 강화 배율 적용)
export function getRaidItemEffective(item) {
  if (!item) return null;
  const mult = 1 + (item.enh || 0) * RAID_ENHANCE.bonusPerLv;
  const atk = Math.round((item.atk || 0) * mult);
  const hp = Math.round((item.hp || 0) * mult);
  return { atk, hp, power: atk * 4 + hp };
}

// 장착 3부위가 같은 시리즈면 세트 보너스 반환 (아니면 null)
export function getActiveSetBonus(equipped) {
  const eq = equipped || {};
  const series = RAID_SLOTS.map(slot => eq[slot]?.series).filter(Boolean);
  if (series.length < RAID_SLOTS.length) return null;
  if (!series.every(s => s === series[0])) return null;
  return RAID_SET_BONUSES[series[0]] || null;
}

// =========== 장비 롤 / 스탯 계산 ===========
let _raidItemSeq = 0;

// 등급 가중치 추첨 → 장비 1개 생성 (직업·슬롯 랜덤)
// 등급 배율(RAID_RARITIES.mult) × 던전 티어 배율(gearMult) × 품질 롤(±20%, 던파 품질 시스템 참고)
export function rollRaidDrop(dungeon) {
  const weights = dungeon.rarityWeights || { C: 50, UC: 28, R: 14, U: 6, L: 1.7, EP: 0.3 };
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
  const mult = RAID_RARITIES[rarity].mult * (dungeon.gearMult || 1);
  const roll = 0.8 + Math.random() * 0.4; // 품질 롤 ±20%
  const atk = Math.round(base.atk * mult * roll);
  const hp = Math.round(base.hp * mult * roll);
  _raidItemSeq += 1;
  return {
    id: `rg_${Date.now().toString(36)}_${_raidItemSeq}_${Math.floor(Math.random() * 1e4)}`,
    classId, slot, rarity,
    series: dungeon.gearPrefix || null, // 1.75.0~ 세트 판정 키
    enh: 0,                             // 1.75.0~ 강화 단계
    name: `${dungeon.gearPrefix ? dungeon.gearPrefix + ' ' : ''}${RAID_GEAR_NAMES[classId][slot]}`,
    atk, hp,
    power: atk * 4 + hp,
  };
}

// 유니크 이상 확정 드랍 (심연 레이드 주간 보상 전용)
export function rollRaidDropHighTier(dungeon) {
  for (let i = 0; i < 30; i++) {
    const item = rollRaidDrop(dungeon);
    if (item.rarity === 'U' || item.rarity === 'L' || item.rarity === 'EP') return item;
  }
  const item = rollRaidDrop(dungeon);
  return { ...item, rarity: 'U' };
}

// 파티원 실스탯 = 베이스 + 장착 3부위(강화 반영) + 세트 보너스(3부위 동일 시리즈)
export function getRaidMemberStats(classId, equipped) {
  const base = RAID_CLASSES[classId];
  if (!base) return null;
  let atk = base.atk;
  let hp = base.hp;
  const eq = equipped || {};
  RAID_SLOTS.forEach(slot => {
    const eff = getRaidItemEffective(eq[slot]);
    if (eff) { atk += eff.atk; hp += eff.hp; }
  });
  const setBonus = getActiveSetBonus(eq);
  if (setBonus) {
    atk = Math.round(atk * (1 + (setBonus.atkPct || 0) / 100));
    hp = Math.round(hp * (1 + (setBonus.hpPct || 0) / 100));
  }
  return { ...base, atk, hp, setBonus, power: atk * 4 + hp + (base.heal || 0) * 3 };
}

// 파티 전투력 합계 (레이드 로비·던전 권장 전투력 비교용)
export function getRaidPartyPower(raidMeta) {
  return Object.keys(RAID_CLASSES).reduce((sum, classId) => {
    const stats = getRaidMemberStats(classId, raidMeta?.equipped?.[classId]);
    return sum + (stats?.power || 0);
  }, 0);
}
