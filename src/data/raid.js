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
// 1.77.0~ 직업당 3종 (기존 1 + 다양화 2) — 전부 자동 발동 (풀오토 유지, 직업 정체성 범위 안)
export const RAID_SKILLS = {
  wanderer: [
    { name: '수호 태세',  desc: '도발 — 보스의 단일 공격을 전부 자신이 받고, 받는 데미지 -30%' },
    { name: '철벽 방세',  desc: '4라운드마다 그 라운드 받는 피해 -60% (도발과 중첩)' },
    { name: '응수',       desc: '도발로 피격 시 35% 확률로 반격 (공격력 80%)' },
  ],
  demonblood: [
    { name: '혈폭(血爆)', desc: '공격 시 잃은 HP의 40%만큼 추가 데미지' },
    { name: '광란',       desc: 'HP 40% 이하일 때 공격 +30%' },
    { name: '흡혈',       desc: '혈폭 발동 중 가한 피해의 20% 자가 회복' },
  ],
  elf: [
    { name: '폭풍 연사',  desc: '치명타 확률 25% (파티 최고) — 치명타 시 데미지 ×1.5' },
    { name: '관통 화살',  desc: '치명타 시 40% 확률로 즉시 추가 사격 (공격력 50%)' },
    { name: '바람의 가호', desc: '광역·전멸기 피해를 20% 확률로 완전 회피' },
  ],
  sage: [
    { name: '메테오',     desc: '3라운드마다 데미지 ×1.5 광역 낙하' },
    { name: '잔염',       desc: '메테오 명중 후 2라운드간 화상 (공격력 30%/라운드)' },
    { name: '과부하',     desc: '격노한 적에게 주는 데미지 +15%' },
  ],
  priest: [
    { name: '집단 치유',  desc: '매 라운드 가장 아픈 아군 회복. 전멸기 예고 라운드엔 파티 방벽(피해 -70%)' },
    { name: '소생',       desc: '던전당 1회 — 전투불능 아군을 HP 40%로 부활 (치유 대신 발동)' },
    { name: '정화',       desc: '침묵의 저주(치유 감소) 지속을 1라운드 단축' },
  ],
};

// 1.79.0~ 전후방 배치 (PM 제안) — 전술 요소
// 전열: 공격 +10%, 단일기·광역·소환수의 주 타겟 / 후열: 광역 피해 -30%, 단일기로부터 보호
// 전멸기는 배치 무관 전체 타격 (사제 방벽이 유일한 해답 — 기존 유지)
export const RAID_FORMATION = {
  frontAtkPct: 10,
  backAoeReducePct: 30,
  default: { wanderer: 'front', demonblood: 'front', elf: 'back', sage: 'back', priest: 'back' },
};

// 1.78.0~ 기연(奇緣) 비전 스킬 재설계 (PM 피드백):
//   - 던전별 고유 비전 1종 — 상위 던전일수록 강력 (낮은 던전 회전으로 상위 비전 불가)
//   - 한 번 만난 기연은 영원히 재발생 안 함 (meta.raid.secretHistory — 던전당 평생 1회)
//   - 활성 비전은 1개만 — 새 기연 조우 시 [기존 유지 / 변경] 선택
//   - fx는 파티 단위: atkPct(공격) / hpPct(최대 HP) / healPct(사제 치유) /
//     critPct(전 파티원 추가 치명 확률) / aoeTakenPct(광역·전멸기 피해 감소)
export const RAID_SECRET_CHANCE = 0.005; // 방 클리어당 0.5%
export const RAID_SECRET_SKILLS = {
  secret_corridor: { dungeonId: 'raid_corridor', tier: 1, name: '잿빛 담금질',     desc: '파티 최대 HP +4%',                    fx: { hpPct: 4 } },
  secret_mine:     { dungeonId: 'raid_mine',     tier: 2, name: '서리의 인내',     desc: '광역·전멸기 피해 -8%',                fx: { aoeTakenPct: 8 } },
  secret_sewer:    { dungeonId: 'raid_sewer',    tier: 3, name: '침식의 맹독',     desc: '파티 공격 +4%',                       fx: { atkPct: 4 } },
  secret_abbey:    { dungeonId: 'raid_abbey',    tier: 4, name: '봉인된 축복',     desc: '사제 치유 +20%',                      fx: { healPct: 20 } },
  secret_arena:    { dungeonId: 'raid_arena',    tier: 5, name: '검투사의 본능',   desc: '전 파티원 추가 치명타 확률 +6%',      fx: { critPct: 6 } },
  secret_spire:    { dungeonId: 'raid_spire',    tier: 6, name: '별의 가호',       desc: '광역·전멸기 피해 -15%',               fx: { aoeTakenPct: 15 } },
  secret_abyss:    { dungeonId: 'raid_abyss',    tier: 7, name: '심연 동화',       desc: '파티 공격 +10%, 최대 HP +6%',         fx: { atkPct: 10, hpPct: 6 } },
  secret_fallen:   { dungeonId: 'raid_fallen',   tier: 8, name: '여명의 잔광',     desc: '파티 공격 +8%, 사제 치유 +15%',       fx: { atkPct: 8, healPct: 15 } },
  secret_throne:   { dungeonId: 'raid_throne',   tier: 9, name: '종막의 각인',     desc: '파티 공격 +14%, 최대 HP +10%',        fx: { atkPct: 14, hpPct: 10 } },
};

// 던전 ID → 그 던전의 기연 비전
export function getDungeonSecret(dungeonId) {
  return Object.entries(RAID_SECRET_SKILLS).find(([, sk]) => sk.dungeonId === dungeonId)?.[0] || null;
}

// 1.77.0~ 에픽 고유 옵션 — 해당 직업의 에픽 장비를 1개 이상 장착하면 발동 (스킬 강화 직결)
export const RAID_EPIC_UNIQUES = {
  wanderer:   { name: '수호자의 맹세',   desc: '응수(반격) 확률 +15% (35% → 50%)' },
  demonblood: { name: '갈증의 낙인',     desc: '흡혈 20% → 35%' },
  elf:        { name: '폭풍의 눈',       desc: '관통 화살 확률 +20% (40% → 60%)' },
  sage:       { name: '꺼지지 않는 불', desc: '잔염 지속 +1라운드 (2 → 3)' },
  priest:     { name: '여명의 인도',     desc: '소생 부활 HP 40% → 70%' },
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
  { id: 'fall',   name: '몰락한 여명', desc: '종막 — 에픽·고강화 세팅만이 닿는 끝' },
];

export const RAID_DUNGEONS = [
  // ===== 지역 1: 잿빛 변경 (입문 파밍) =====
  {
    id: 'raid_corridor', region: 'ash', kind: 'farm',
    name: '무너진 회랑', sub: 'FARM · T1',
    desc: '방 4개를 돌파하는 입문 던전. 네임드와 문지기가 잿빛 장비를 떨군다.',
    rarityWeights: { C: 45, UC: 28, R: 16, U: 8, L: 2.5, EP: 0.5 },
    recommendedPower: 5200, gearMult: 1.0, gearPrefix: '잿빛', weeklyStones: 5,
    color: '#9b8975',
    rooms: [
      { kind: 'mobs',  name: '무너진 경비대',   hp: 900,  atk: 70,  drops: 0 },
      { kind: 'mobs',  name: '회랑의 그림자들', hp: 1100, atk: 85,  drops: 0 },
      { kind: 'named', name: '이름 잃은 기사',  hp: 1800, atk: 110, aoeEvery: 5, drops: 0, stones: 3 },
      { kind: 'boss',  name: '회랑의 문지기',   hp: 3200, atk: 130, aoeEvery: 4, enrageAt: 0.5, drops: 3 },
    ],
  },
  {
    id: 'raid_mine', region: 'ash', kind: 'farm',
    name: '서리 잠식 갱도', sub: 'FARM · T2',
    desc: '한기가 스민 폐광. 갱도 깊은 곳의 파괴자가 서리철 장비를 지킨다.',
    rarityWeights: { C: 38, UC: 28, R: 19, U: 10, L: 4, EP: 1 },
    recommendedPower: 6000, gearMult: 1.15, gearPrefix: '서리철', weeklyStones: 6,
    color: '#9bc4e0',
    rooms: [
      { kind: 'mobs',  name: '갱도 냉기벌레 떼', hp: 1200, atk: 95,  drops: 0 },
      { kind: 'mobs',  name: '얼어붙은 광부들',  hp: 1400, atk: 105, drops: 0 },
      { kind: 'named', name: '서리핏줄 우두머리', hp: 2300, atk: 125, aoeEvery: 5, drops: 0, stones: 4 },
      { kind: 'boss',  name: '갱도의 파괴자',    hp: 4000, atk: 145, aoeEvery: 4, enrageAt: 0.5, drops: 3 },
    ],
  },
  {
    id: 'raid_sewer', region: 'ash', kind: 'farm',
    name: '부패한 지하수로', sub: 'FARM · T3',
    desc: '오물이 흐르는 수로. 침식된 장비는 더럽지만 강하다.',
    rarityWeights: { C: 38, UC: 28, R: 19, U: 10, L: 4, EP: 1 },
    recommendedPower: 6800, gearMult: 1.3, gearPrefix: '침식된', weeklyStones: 8,
    color: '#7a9a5e',
    rooms: [
      { kind: 'mobs',  name: '수로 쥐떼',      hp: 1500, atk: 115, drops: 0 },
      { kind: 'mobs',  name: '부패 점액괴',    hp: 1800, atk: 125, drops: 0 },
      { kind: 'named', name: '수로의 감시자',  hp: 2900, atk: 150, aoeEvery: 5, summonEvery: 4, drops: 0, stones: 5 },
      { kind: 'boss',  name: '오물의 군주',    hp: 5000, atk: 170, aoeEvery: 4, summonEvery: 4, enrageAt: 0.5, drops: 3 },
    ],
  },

  // ===== 지역 2: 침묵의 성역 (중급) =====
  {
    id: 'raid_abbey', region: 'sanct', kind: 'farm',
    name: '봉인된 수도원', sub: 'DUNGEON · T4',
    desc: '기도가 저주로 변한 수도원. 봉인된 장비 시리즈가 잠들어 있다.',
    rarityWeights: { C: 30, UC: 26, R: 21, U: 14, L: 7, EP: 2 },
    recommendedPower: 7800, gearMult: 1.5, gearPrefix: '봉인된', weeklyStones: 10,
    color: '#8a76c9',
    rooms: [
      { kind: 'mobs',  name: '타락 수도승들',  hp: 2000, atk: 140, drops: 0 },
      { kind: 'mobs',  name: '참회의 망령들',  hp: 2400, atk: 150, drops: 0 },
      { kind: 'named', name: '고행자 무언(無言)', hp: 3800, atk: 180, aoeEvery: 4, drops: 0, stones: 6 },
      { kind: 'boss',  name: '수도원장 침묵',  hp: 6500, atk: 205, aoeEvery: 4, healCutEvery: 5, enrageAt: 0.5, drops: 3 },
    ],
  },
  {
    id: 'raid_arena', region: 'sanct', kind: 'farm',
    name: '핏빛 투기장', sub: 'DUNGEON · T5',
    desc: '끝나지 않는 살육제. 혈권을 꺾으면 핏빛 장비가 쏟아진다.',
    rarityWeights: { C: 30, UC: 26, R: 21, U: 14, L: 7, EP: 2 },
    recommendedPower: 8800, gearMult: 1.7, gearPrefix: '핏빛', weeklyStones: 12,
    color: '#c4453d',
    rooms: [
      { kind: 'mobs',  name: '투기장 검투노예', hp: 2600, atk: 165, drops: 0 },
      { kind: 'mobs',  name: '사슬 맹수 우리',  hp: 3000, atk: 180, drops: 0 },
      { kind: 'named', name: '백전의 검투사',   hp: 4800, atk: 215, aoeEvery: 3, drops: 0, stones: 7 },
      { kind: 'boss',  name: '투기장주 혈권(血拳)', hp: 8000, atk: 245, aoeEvery: 4, pierceTankChance: 0.3, enrageAt: 0.5, drops: 4 },
    ],
  },
  {
    id: 'raid_spire', region: 'sanct', kind: 'farm',
    name: '별이 떨어진 첨탑', sub: 'DUNGEON · T6',
    desc: '추락한 별의 힘이 깃든 첨탑. 대현자는 10라운드마다 별을 떨어뜨린다.',
    rarityWeights: { C: 26, UC: 24, R: 21, U: 15, L: 10, EP: 4 },
    recommendedPower: 9800, gearMult: 1.9, gearPrefix: '별빛', weeklyStones: 15, essenceDrop: 1,
    color: '#d4a574',
    rooms: [
      { kind: 'mobs',  name: '별파편 정령들',  hp: 3200, atk: 195, drops: 0 },
      { kind: 'mobs',  name: '첨탑 수호석상',  hp: 3600, atk: 210, drops: 0 },
      { kind: 'named', name: '관측자 아득',    hp: 5800, atk: 250, aoeEvery: 3, enrageAt: 0.4, drops: 0, stones: 8 },
      { kind: 'boss',  name: '첨탑의 대현자',  hp: 10000, atk: 285, aoeEvery: 3, wipeEvery: 10, enrageAt: 0.5, drops: 4 },
    ],
  },

  // ===== 지역 3: 심연 (레이드) =====
  {
    id: 'raid_abyss', region: 'abyss', kind: 'raid',
    name: '심연의 제단', sub: 'RAID · 3관문',
    desc: '관문 3개의 최상위 레이드. 군주는 8라운드마다 전멸기 — 사제의 방벽 없이는 파티가 무너진다. 심연의 장비는 에픽 확률이 가장 높다.',
    rarityWeights: { C: 24, UC: 22, R: 20, U: 16, L: 12, EP: 6 },
    recommendedPower: 11500, gearMult: 2.2, gearPrefix: '심연의', weeklyStones: 30, essenceDrop: 2,
    color: '#8b1f1f',
    rooms: [
      { kind: 'named', name: '심연의 파수꾼',  hp: 7000,  atk: 240, aoeEvery: 4, summonEvery: 5, drops: 0, stones: 10 },
      { kind: 'named', name: '공허의 쌍둥이',  hp: 10000, atk: 280, aoeEvery: 3, enrageAt: 0.4, drops: 0, stones: 10 },
      { kind: 'boss',  name: '심연의 군주',    hp: 18000, atk: 330, aoeEvery: 3, wipeEvery: 8, enrageAt: 0.5, drops: 5 },
    ],
  },

  // ===== 지역 4: 몰락한 여명 (종막 — 1.77.0~) =====
  {
    id: 'raid_fallen', region: 'fall', kind: 'farm',
    name: '몰락한 성소', sub: 'DUNGEON · T7',
    desc: '여명이 저물어버린 성소. 배신자 대주교의 저주와 감시자의 전멸기가 기다린다.',
    rarityWeights: { C: 22, UC: 21, R: 20, U: 18, L: 13, EP: 6 },
    recommendedPower: 13500, gearMult: 2.6, gearPrefix: '여명의', weeklyStones: 20, essenceDrop: 1,
    color: '#d4a574',
    rooms: [
      { kind: 'mobs',  name: '몰락한 위병들',  hp: 5200,  atk: 300, drops: 0 },
      { kind: 'mobs',  name: '여명의 잔영',    hp: 5800,  atk: 320, drops: 0 },
      { kind: 'named', name: '배신자 대주교',  hp: 9000,  atk: 380, aoeEvery: 4, healCutEvery: 4, drops: 0, stones: 12 },
      { kind: 'boss',  name: '몰락의 감시자',  hp: 15000, atk: 430, aoeEvery: 3, wipeEvery: 9, enrageAt: 0.5, drops: 4 },
    ],
  },
  {
    id: 'raid_throne', region: 'fall', kind: 'raid',
    name: '종막의 왕좌', sub: 'RAID · 3관문',
    desc: '최후의 레이드. 종막의 군주는 전멸기·저주·격노를 모두 사용한다 — 에픽 확률 13%, 정수 3개 확정.',
    rarityWeights: { C: 20, UC: 19, R: 18, U: 16, L: 14, EP: 13 },
    recommendedPower: 16000, gearMult: 3.0, gearPrefix: '종막의', weeklyStones: 40, essenceDrop: 3,
    color: '#8a2be2',
    rooms: [
      { kind: 'named', name: '왕좌의 수문장',  hp: 12000, atk: 400, aoeEvery: 4, summonEvery: 5, drops: 0, stones: 15 },
      { kind: 'named', name: '쌍둥이 대검사',  hp: 16000, atk: 450, aoeEvery: 3, pierceTankChance: 0.3, enrageAt: 0.4, drops: 0, stones: 15 },
      { kind: 'boss',  name: '종막의 군주',    hp: 28000, atk: 520, aoeEvery: 3, wipeEvery: 7, healCutEvery: 6, enrageAt: 0.5, drops: 6 },
    ],
  },
];


// =========== 3차 난이도 튜닝 (1.76.0~) ===========
// PM 피드백 "난이도 너무 낮음" — 전 던전 적 스탯 전역 배율.
// AP_TUNING 패턴: 실기기 체감 후 이 두 수치만 조정하면 전역 반영.
export const RAID_TUNING = { enemyHpMult: 1.35, enemyAtkMult: 1.45 };

// =========== 3차 재료·제작·가챠 (1.76.0~) ===========
// 익스플로잇 픽스: 장비는 최종 보스(막보) 전용 — 중간 네임드는 심연석만 드랍.
// 상위 등급 목표 파밍: 막보 희귀 재료 '군주의 정수'로 에픽·레전더리 확정 제작 (부위·직업 랜덤).
export const RAID_ESSENCE = { name: '군주의 정수', icon: '◈' };

export const RAID_CRAFT_RECIPES = [
  {
    id: 'craft_legendary', rarity: 'L', name: '레전더리 제작',
    essence: 1, stones: 40,
    desc: '군주의 정수 1 + 심연석 40 → 레전더리 확정 (부위·직업 랜덤, 심연의 시리즈)',
  },
  {
    id: 'craft_epic', rarity: 'EP', name: '에픽 제작',
    essence: 3, stones: 100,
    desc: '군주의 정수 3 + 심연석 100 → 에픽 확정 (부위·직업 랜덤, 심연의 시리즈)',
  },
];

// 심연석 가챠 — 등급은 높을수록 낮은 확률 (단조 감소, PM 룰)
export const RAID_GACHA = {
  cost: 30,
  weights: { C: 40, UC: 27, R: 17, U: 10, L: 4.5, EP: 1.5 },
};

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
  '여명의': { name: '여명의 3세트', hpPct: 15, atkPct: 15 },
  '종막의': { name: '종막의 3세트', hpPct: 18, atkPct: 18 },
};

// 1.79.1~ 레거시 장비 series 백필 — series 필드는 1.75.0 신설이라
// 그 전에 드랍된 장비는 이름에 접두어가 있어도 세트 판정에서 빠진다.
// 이름을 "접두어 + 직업×슬롯 장비명" 정확 일치로 재구성해 복원 (부분 일치 오판 방지).
const RAID_SERIES_PREFIXES = RAID_DUNGEONS.map(d => d.gearPrefix).filter(Boolean);

export function inferRaidSeries(item) {
  const gearName = RAID_GEAR_NAMES[item?.classId]?.[item?.slot];
  if (!gearName || !item?.name) return null;
  return RAID_SERIES_PREFIXES.find(p => item.name === `${p} ${gearName}`) || null;
}

// 인벤토리 + 장착 전체를 순회하며 누락된 series 복원. 변경 없으면 원본 그대로 반환.
export function backfillRaidSeries(raid) {
  if (!raid) return { raid, changed: false };
  let changed = false;
  const fix = (item) => {
    if (!item || item.series) return item;
    const series = inferRaidSeries(item);
    if (!series) return item;
    changed = true;
    return { ...item, series };
  };
  const inventory = (raid.inventory || []).map(fix);
  const equipped = {};
  Object.entries(raid.equipped || {}).forEach(([classId, slots]) => {
    equipped[classId] = {};
    Object.entries(slots || {}).forEach(([slot, item]) => {
      equipped[classId][slot] = fix(item);
    });
  });
  if (!changed) return { raid, changed: false };
  return { raid: { ...raid, inventory, equipped }, changed: true };
}

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

// 1.76.0~ 제작 결과 롤 — 확정 등급, 부위·직업 랜덤 (PM 제안), 최상위 '심연의' 시리즈 성능
export function rollCraftedRaidItem(rarity) {
  const abyss = RAID_DUNGEONS.find(d => d.id === 'raid_abyss');
  return rollRaidDrop({ ...abyss, rarityWeights: { [rarity]: 1 } });
}

// 1.76.0~ 심연석 가챠 롤 — 등급은 급감 커브, 시리즈는 7던전 중 랜덤 (전 시리즈 수집 경로)
export function rollGachaRaidItem() {
  const dungeon = RAID_DUNGEONS[Math.floor(Math.random() * RAID_DUNGEONS.length)];
  return rollRaidDrop({ ...dungeon, rarityWeights: RAID_GACHA.weights });
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
