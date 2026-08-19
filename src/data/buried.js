// ============================================
// data/buried.js — 무덤의 유산 (1.103.0)
// ============================================
// BuriedBornes(Nussy) 모티브의 **별도 모드**. 본편·레이드·명예의 전당과 완전 분리된
// 독립 성장 축이며, 본편에서 가져오는 것은 **5직업의 정체성(이름·컬러·일러)뿐**이다.
// (PM 결정 1.103.0: "캐릭터만 살리고 나머지는 BB식으로 새로 구성")
//
// 원작에서 이식한 6축:
//   1) 장비 = 스킬        — 6슬롯 각각에 스킬 1개가 내장. 장비를 바꿔야 스킬이 바뀐다.
//   2) SP                 — 턴당 회복하는 스킬 자원 (본편 AP·CD와 무관)
//   3) 상태이상 13종      — 스택형. 출혈·중독·화상·기절·침묵·속박·저주·약화·파쇄 + 버프 4종
//   4) 층 진행형 던전     — 층마다 방 2~3개 중 선택. 5층 중간보스 / 10층 보스
//   5) 유산 계승형 사망   — 캐릭터는 소멸하되 장착 장비 일부 + 골드 30%가 다음 캐릭터에게
//   6) 레벨업 스탯 배분   — 레벨당 3포인트 자유 배분 (완력/기교/지혜/체력)
//
// 이름·수치·적 구성은 100% 오리지널 (IP 리스크 0). 적 일러스트만 기존 에셋 재사용.
//
// ⚠️ 이 파일은 순수 데이터 + 순수 함수만 둔다. React 의존 금지.
//    전투 화면(BuriedBattleScreen)은 여기 함수를 호출만 한다 — 밸런스 조정은 이 파일 한 곳.

// =========================================================
// 1. 스탯 — BB식 4스탯
// =========================================================
export const BURIED_STATS = [
  { id: 'str', name: '완력', icon: '💪', color: '#c4453d', desc: '물리 공격력 +1.6 / 포인트' },
  { id: 'dex', name: '기교', icon: '🎯', color: '#7a9a5e', desc: '기교 공격력 +1.6, 치명 +0.6%, 회피 +0.4% / 포인트' },
  { id: 'int', name: '지혜', icon: '📖', color: '#5c4a8c', desc: '마법 공격력 +1.6, 최대 SP +1.3 / 포인트' },
  { id: 'vit', name: '체력', icon: '🛡', color: '#7ba3c4', desc: '최대 HP +11, 방어 +0.9 / 포인트' },
];

// =========================================================
// 2. 장비 슬롯 6종 — 각 슬롯에 스킬 1개가 내장된다 (원작 핵심)
// =========================================================
export const BURIED_SLOTS = [
  { id: 'weapon',  name: '무기',      icon: '⚔', classLine: true  },
  { id: 'offhand', name: '보조',      icon: '🗡', classLine: true  },
  { id: 'armor',   name: '방어구',    icon: '🛡', classLine: false },
  { id: 'helm',    name: '투구',      icon: '⛑', classLine: false },
  { id: 'acc1',    name: '장신구 I',  icon: '💍', classLine: false },
  { id: 'acc2',    name: '장신구 II', icon: '📿', classLine: false },
];
export const BURIED_SLOT_IDS = BURIED_SLOTS.map(s => s.id);
// acc1 / acc2는 같은 'acc' 스킬 풀을 공유
export const slotPool = (slotId) => (slotId === 'acc1' || slotId === 'acc2' ? 'acc' : slotId);

// =========================================================
// 3. 직업 5종 — 본편 CLASSES에서 정체성만 계승
// =========================================================
// lines  : 착용 가능한 무기/보조 계열 (원작의 직업별 장비 제한)
// traits : 영구 특성 3개. 원작 규칙대로 **첫 번째가 그 직업 전용**, 나머지 2개는 공용 풀에서 선택.
// advance: 전직 대상 상위 직업 id (해당 직업으로 미궁을 클리어하면 해금)
export const BURIED_CLASSES = [
  {
    id: 'wanderer', name: '방랑검사', sub: 'Gravewalker Blade', color: '#c4453d',
    image: './classes/wanderer.jpg',
    desc: '어둠 속에서도 검을 뻗는 자. 반격으로 되갚는다.',
    lines: { weapon: 'sword', offhand: 'blade' },
    stats: { str: 12, dex: 9, int: 5, vit: 9 },
    traits: ['riposte', 'swordmastery', 'agility'],
    advance: 'wanderer_adv',
  },
  {
    id: 'sage', name: '술법사', sub: 'Sorcerer of Ash', color: '#5c4a8c',
    image: './classes/sage.jpg',
    desc: '정념을 태우는 자. 불길은 꺼지지 않는다.',
    lines: { weapon: 'staff', offhand: 'tome' },
    stats: { str: 4, dex: 7, int: 14, vit: 8 },
    traits: ['kindle', 'arcana', 'willpower'],
    advance: 'sage_adv',
  },
  {
    id: 'demonblood', name: '혼혈 마족', sub: 'Demon Heritage', color: '#8b1f1f',
    image: './classes/demonblood.jpg',
    desc: '마왕의 피가 흐르는 자. 상처가 곧 힘이 된다.',
    lines: { weapon: 'axe', offhand: 'claw' },
    stats: { str: 13, dex: 6, int: 5, vit: 11 },
    traits: ['bloodrush', 'toughness', 'sanguine'],
    advance: 'demonblood_adv',
  },
  {
    id: 'elf', name: '숲의 정령사', sub: 'Elf of Twilight', color: '#7a9a5e',
    image: './classes/elf.jpg',
    desc: '바람과 교감하는 자. 화살은 빗나가지 않는다.',
    lines: { weapon: 'bow', offhand: 'quiver' },
    stats: { str: 5, dex: 14, int: 8, vit: 7 },
    traits: ['gale', 'precision', 'lightstep'],
    advance: 'elf_adv',
  },
  {
    id: 'priest', name: '여명의 사제', sub: 'Priest of Dawn', color: '#d4a574',
    image: './classes/priest.jpg',
    desc: '여명의 가호를 받은 자. 죽음을 거부한다.',
    lines: { weapon: 'mace', offhand: 'relic' },
    stats: { str: 5, dex: 6, int: 14, vit: 12 },
    traits: ['dawnlight', 'faith', 'wardstone'],
    advance: 'priest_adv',
  },
];
// 기본 5직업 + 상위(전직) 5직업 모두에서 찾는다 (BURIED_ALL_CLASSES는 아래에서 정의)
export const getBuriedClass = (id) => buriedAllClasses().find(c => c.id === id) || null;

// =========================================================
// 3b. 종족 10종 (1.122.0) — BB2 모티브: 종족 × 직업 2축 생성
// =========================================================
// statMods: 기본 스탯 가감 / fx: 특성·계약과 같은 어휘 (buriedDerived + 전투가 소비)
// 1.123.0 — BB2 공식 데이터시트(種族Race) 기준 statMods 정밀 보정 완료 (엘프 실드17→보호막15, 하플링 INT 0, 용인 6/2/-/-, 페어리 STR 0, 뱀파이어 DEX·HP형)
export const BURIED_RACES = [
  { id: 'human',    name: '인간',     icon: '🧑', color: '#c9a86a', statMods: { str: 1, dex: 1, int: 1, vit: 1 }, fx: { expPct: 15 },
    desc: '무난한 전 스탯 +1. 배움이 빠르다 — 경험치 +15%.' },
  { id: 'lycan',    name: '수인',     icon: '🐺', color: '#c4453d', statMods: { str: 5, vit: 2, int: -3 }, fx: { physPct: 8 },
    desc: '짐승의 완력. 물리·기교 공격력 +8%.' },
  { id: 'elfkin',   name: '엘프',     icon: '🍃', color: '#7a9a5e', statMods: { dex: 4, int: 2, str: -1, vit: -2 }, fx: { dodge: 5, barrier: 15 },
    desc: '가벼운 몸놀림. 회피율 +5%, 전투 시작 보호막 +15.' },
  { id: 'halfling', name: '하플링',   icon: '🍀', color: '#d4a574', statMods: { dex: 3, vit: 2, int: -4 }, fx: { dropLuck: 1, goldPct: 12 },
    desc: '행운의 손. 드랍 운 +1, 골드 +12%.' },
  { id: 'lizard',   name: '리자드맨', icon: '🦎', color: '#5e7a3e', statMods: { vit: 5, str: 2, dex: -2 }, fx: { hp: 40, healPct: 10 },
    desc: '재생하는 비늘. 최대 HP +40, 회복량 +10%.' },
  { id: 'drakan',   name: '용인',     icon: '🐉', color: '#8b1f1f', statMods: { str: 5, vit: 2, dex: -4 }, fx: { barrier: 45 },
    desc: '용의 비늘. 전투 시작 보호막 +45.' },
  { id: 'fairykin', name: '페어리',   icon: '🦋', color: '#c48bd4', statMods: { int: 5, str: -3, vit: -4 }, fx: { sp: 15, magPct: 10, hpMult: 0.85 },
    desc: '정신체에 가깝다. 마법 +10%, 최대 SP +15 — 대신 최대 HP -15%.' },
  { id: 'darkelf',  name: '다크엘프', icon: '🌙', color: '#5c4a8c', statMods: { dex: 4, int: 3, vit: -3 }, fx: { crit: 6, statusChance: 12 },
    desc: '그늘의 사냥꾼. 치명 +6%, 상태이상 확률 +12%.' },
  { id: 'vampkin',  name: '뱀파이어', icon: '🩸', color: '#7d2b4a', statMods: { dex: 2, int: 2, vit: 1 }, fx: { drainPct: 5, healPct: -15 },
    desc: '피로 산다. 흡혈 +5% — 대신 일반 회복량 -15%.' },
  { id: 'revenant', name: '굴레망자', icon: '💀', color: '#8b8378', statMods: { vit: 4, str: 2, dex: -3 }, fx: { statusResist: 20, healPct: -25 },
    desc: '이미 죽은 몸. 적의 상태이상 확률 -20% — 대신 회복량 -25%.' },
  // ===== 1.141.0 — 🏛 조직 전속 종족 4종 (union 필드 = 해당 조직 Lv.5 해금, 위저드가 게이트) =====
  { id: 'angelkin', name: '반천사',   icon: '🕊', color: '#e8d8a8', union: 'sealwatch', statMods: { int: 2, vit: 1, str: -2 }, fx: { healPct: 20, statusResist: 10, barrier: 10 },
    desc: '[봉인 감시단 전속] 타락하다 만 피. 회복 +20%, 상태이상 저항 +10%, 시작 보호막 +10.' },
  { id: 'ghoulkin', name: '구울',     icon: '🧟', color: '#5e7a3e', union: 'mourners', statMods: { vit: 3, int: -2 }, fx: { drainPct: 5, hp: 10 },
    desc: '[침묵의 상조회 전속] 굶주림이 무기다. 모든 공격에 흡혈 +5%, 최대 HP +10.' },
  { id: 'dwarfkin', name: '드워프',   icon: '⛏', color: '#c9a86a', union: 'darkmoon', statMods: { str: 2, vit: 2, dex: -2 }, fx: { goldPct: 15, def: 2 },
    desc: '[암월상회 전속] 값을 아는 눈. 골드 +15%, 방어력 +2.' },
  { id: 'onikin',   name: '오니',     icon: '👹', color: '#c4453d', union: 'abyssorder', statMods: { str: 3, dex: -1, int: -1 }, fx: { physPct: 10, crit: 4 },
    desc: '[무저갱 교단 전속] 심연이 기른 귀신. 물리·기교 +10%, 치명 +4%.' },
];
export const getBuriedRace = (id) => BURIED_RACES.find(r => r.id === id) || null;
// 종족+출신 fx 뭉치 (1.131.0~ 출신 통합) — 특성·계약·부품과 같은 소비 어휘.
// 미선택 구 캐릭터는 빈 객체 = 회귀 안전. hpMult는 곱산, 나머지 합산.
export function buriedRaceFx(char) {
  const bags = [getBuriedRace(char?.raceId)?.fx, getBuriedOrigin(char?.originId)?.fx].filter(Boolean);
  if (bags.length === 0) return {};
  if (bags.length === 1) return bags[0];
  const out = {};
  for (const bag of bags) for (const [k, v] of Object.entries(bag)) {
    if (k === 'hpMult') out.hpMult = (out.hpMult || 1) * v;
    else out[k] = (out[k] || 0) + v;
  }
  return out;
}

// =========================================================
// 3b-2. 출신 8종 (1.131.0) — BB2 出自Origin 이식 9탄 (생성 3축 완성: 종족 × 직업 × 출신)
// =========================================================
// 원작: 종족보다 작은 미세 보정 축. PM 결정: 별도 위저드 단계가 아니라 **종족 화면 하단 통합** 선택.
// fx는 종족과 같은 어휘 — buriedRaceFx가 종족+출신을 하나의 rf bag으로 합산해 소비 지점 추가 0.
export const BURIED_ORIGINS = [
  { id: 'commoner', name: '평범', icon: '🌾', statMods: { str: 1, dex: 1, int: 1, vit: 1 }, fx: { hp: 10 },
    desc: '무난하게 자랐다. 전 스탯 +1, HP +10.' },
  { id: 'noble',    name: '고귀', icon: '👑', statMods: { int: 2 }, fx: { barrier: 20 },
    desc: '귀하게 자랐다. 지능 +2, 시작 보호막 +20.' },
  { id: 'exile',    name: '추방', icon: '🥀', statMods: { str: 2, int: 2 }, fx: { hp: -15 },
    desc: '내쫓기며 단련됐다. 힘·지능 +2 — HP -15.' },
  { id: 'pauper',   name: '빈곤', icon: '🕳', statMods: { dex: 1 }, fx: { barrier: 40, hp: -25 },
    desc: '몸보다 요령으로 버텼다. 시작 보호막 +40 — HP -25.' },
  { id: 'drifter',  name: '유랑', icon: '🌬', statMods: { dex: 2 }, fx: {}, startGold: 80,
    desc: '떠돌며 주워 모았다. 민첩 +2, 시작 골드 +80.' },
  { id: 'rebel',    name: '반역', icon: '🔥', statMods: { str: 1, dex: 1, int: 1 }, fx: { def: -2 },
    desc: '맞서며 자랐다. 힘·민·지 +1 — 방어 -2.' },
  { id: 'success',  name: '성공', icon: '🪙', statMods: {}, fx: { goldPct: 8 },
    desc: '벌 줄 안다. 골드 획득 +8%.' },
  { id: 'pacifist', name: '안녕', icon: '🕊', statMods: { vit: 1 }, fx: { healPct: 8 },
    desc: '평온을 안다. 체력 +1, 회복량 +8%.' },
];
export const getBuriedOrigin = (id) => BURIED_ORIGINS.find(o => o.id === id) || null;

// =========================================================
// 3c. ⚓ 쐐기석 12종 (1.128.0) — BB2 데이터시트(楔石Keystone 121행) 이식 6탄
// =========================================================
// 원작 규칙: 스스로 박는 저주의 쐐기 — 영구 디버프를 대가로 보상이 커진다.
// PM 결정 3건: ①정복한 던전에서만 개방 ②재화 +12%/P + 드랍 운 +P÷3 ③최대 3개.
// pts = 쐐기 포인트 (★). fx는 전투·던전이 kf bag으로 소비 — 전부 캐릭터 생성 시 구움.
export const BURIED_KEYSTONES = [
  { id: 'ksFrail', name: '취약의 쐐기',   icon: '🩸', pts: 1, fx: { takenPct: 20 },     src: 'Marbas',
    desc: '받는 피해 +20%.' },
  { id: 'ksSlow',  name: '둔족의 쐐기',   icon: '🦶', pts: 1, fx: { noDodge: true },    src: 'Caim',
    desc: '회피할 수 없다 ([잔영]도 무효).' },
  { id: 'ksBlunt', name: '무딘 날의 쐐기', icon: '🗡', pts: 1, fx: { noCrit: true },     src: 'Furfur',
    desc: '치명타가 터지지 않는다.' },
  { id: 'ksVigil', name: '불면의 쐐기',   icon: '🌙', pts: 1, fx: { noCampHeal: true }, src: 'Malphas',
    desc: '야영과 제단에서 HP를 회복할 수 없다.' },
  { id: 'ksMist',  name: '미혹의 쐐기',   icon: '🌀', pts: 2, fx: { startConfuse: 1 },  src: 'Morax',
    desc: '매 전투를 [혼란] 1로 시작한다.' },
  { id: 'ksStall', name: '정체의 쐐기',   icon: '⏳', pts: 2, fx: { cdAdd: 1 },         src: 'Orias',
    desc: '모든 장비 스킬 쿨다운 +1 (기본 공격 제외).' },
  { id: 'ksBare',  name: '나신의 쐐기',   icon: '🔻', pts: 2, fx: { noBarrier: true },  src: 'Sabnock',
    desc: '보호막을 얻을 수 없다.' },
  { id: 'ksDry',   name: '금주의 쐐기',   icon: '🚱', pts: 2, fx: { noPotion: true },   src: 'Forneus',
    desc: '물약을 마실 수 없다.' },
  { id: 'ksDark',  name: '암흑의 쐐기',   icon: '🌑', pts: 2, fx: { darkAll: true },    src: 'Shax',
    desc: '모든 전투에서 적의 수치가 보이지 않는다.' },
  { id: 'ksRuin',  name: '대취약의 쐐기', icon: '💥', pts: 3, fx: { takenPct: 50 },     src: 'Gusion',
    desc: '받는 피해 +50%.' },
  { id: 'ksFast',  name: '고행의 쐐기',   icon: '⛓', pts: 3, fx: { noHeal: true },     src: 'Andrealphus',
    desc: '전투 중·야영·제단에서 HP를 회복할 수 없다 (레벨업 회복만 예외).' },
  { id: 'ksVoid',  name: '공허의 쐐기',   icon: '⭕', pts: 3, fx: { noAcc: true },      src: 'Vepar',
    desc: '장신구 2슬롯이 완전히 무효가 된다 (스킬·스탯·전설무구 효과 전부).' },
];
export const BURIED_KEYSTONE_MAX = 3;
export const getBuriedKeystone = (id) => BURIED_KEYSTONES.find(k => k.id === id) || null;
// kf bag — 채택한 쐐기 fx 합산 (숫자 합산, 불린 OR). 구 캐릭터는 빈 객체 = 회귀 안전
export function buriedKeystoneFx(char) {
  const out = {};
  for (const id of char?.keystones || []) {
    const k = getBuriedKeystone(id);
    if (!k) continue;
    for (const [key, v] of Object.entries(k.fx)) {
      if (typeof v === 'boolean') out[key] = out[key] || v;
      else out[key] = (out[key] || 0) + v;
    }
  }
  return out;
}
// 보상 — 포인트 합계 P: 골드·경험치·먼지 +12%/P, 드랍 운 +P÷3
export function buriedKeystoneBonus(char) {
  const pts = (char?.keystones || []).reduce((s, id) => s + (getBuriedKeystone(id)?.pts || 0), 0);
  return { pts, rewardPct: pts * 12, luck: Math.floor(pts / 3) };
}

// =========================================================
// 4. 상태이상 13종 — 전부 스택형
// =========================================================
// kind: 'debuff' | 'buff'
// tickDmg / tickHeal : 턴 종료 시 스택당 피해·회복
// decay: 'one'(매 턴 1 감소) | 'half'(절반) | 'none'(유지)
export const BURIED_STATUS = {
  bleed:   { id: 'bleed',   name: '출혈', icon: '🩸', color: '#8b1f1f', kind: 'debuff', max: 20, tickDmg: 4, decay: 'one',  desc: '턴 종료 시 스택×4 피해. 매 턴 1 감소' },
  poison:  { id: 'poison',  name: '중독', icon: '☠',  color: '#7a9a5e', kind: 'debuff', max: 15, tickDmg: 3, decay: 'none', desc: '턴 종료 시 스택×3 피해. 스스로 사라지지 않는다' },
  burn:    { id: 'burn',    name: '화상', icon: '🔥', color: '#ff6b35', kind: 'debuff', max: 20, tickDmg: 6, decay: 'half', desc: '턴 종료 시 스택×6 피해. 매 턴 절반으로 감소' },
  stun:    { id: 'stun',    name: '기절', icon: '💫', color: '#e8b04a', kind: 'debuff', max: 3,  decay: 'one',  desc: '스택이 있으면 행동 불가. 매 턴 1 감소' },
  silence: { id: 'silence', name: '침묵', icon: '🤐', color: '#5c4a8c', kind: 'debuff', max: 5,  decay: 'one',  desc: '스킬 사용 불가 (기본 공격만 가능). 매 턴 1 감소' },
  bind:    { id: 'bind',    name: '속박', icon: '🕸',  color: '#8b6f4d', kind: 'debuff', max: 5,  decay: 'one',  desc: '회피 불가 + 받는 피해 스택당 +20%' },
  curse:   { id: 'curse',   name: '저주', icon: '👁', color: '#3d1f28', kind: 'debuff', max: 5,  decay: 'one',  desc: '회복 완전 무효 + 받는 피해 스택당 +15%' },
  weaken:  { id: 'weaken',  name: '약화', icon: '⬇',  color: '#9b8975', kind: 'debuff', max: 10, decay: 'one',  desc: '주는 데미지 스택당 -6% (최대 -60%)' },
  shatter: { id: 'shatter', name: '파쇄', icon: '⚒',  color: '#c4453d', kind: 'debuff', max: 8,  decay: 'one',  desc: '방어력 스택당 -10% (최대 -80%)' },
  rage:    { id: 'rage',    name: '격노', icon: '🔺', color: '#c4453d', kind: 'buff',   max: 10, decay: 'one',  desc: '주는 데미지 스택당 +10%' },
  guard:   { id: 'guard',   name: '수호', icon: '🛡', color: '#7ba3c4', kind: 'buff',   max: 8,  decay: 'one',  desc: '받는 피해 스택당 -12% (최대 -80%)' },
  regen:   { id: 'regen',   name: '재생', icon: '💚', color: '#7a9a5e', kind: 'buff',   max: 10, tickHeal: 5, decay: 'one', desc: '턴 종료 시 스택×5 회복. 매 턴 1 감소' },
  evade:   { id: 'evade',   name: '잔영', icon: '💨', color: '#d4a574', kind: 'buff',   max: 6,  decay: 'one',  desc: '회피율 스택당 +15%' },
  // 1.106.0 — 원작의 방벽(개수형)·혼란·노화
  wall:    { id: 'wall',    name: '방벽', icon: '🧱', color: '#b8a678', kind: 'buff',   max: 5,  decay: 'none', desc: '적의 공격 행동 1회를 완전히 무효화하고 1개 소모. 스스로 사라지지 않는다' },
  confuse: { id: 'confuse', name: '혼란', icon: '🌀', color: '#c48bd4', kind: 'debuff', max: 3,  decay: 'one',  desc: '행동 시 스택×30% 확률로 허우적거리며 턴을 날린다. 매 턴 1 감소' },
  aging:   { id: 'aging',   name: '노화', icon: '⏳', color: '#8b8378', kind: 'debuff', max: 10, decay: 'none', desc: '주는 데미지 스택당 -4%. 스스로 사라지지 않는다' },
};

// =========================================================
// 5. 스킬 49종 — 전부 장비에 내장된다 (독립 획득 불가)
// =========================================================
// slot : 이 스킬이 붙을 수 있는 슬롯 (weapon/offhand/armor/helm/acc)
// line : 무기·보조 계열 (직업 제한용). 방어구/투구/장신구는 null = 전 직업 공용
// gear : 이 스킬을 담는 장비 이름 ("낡은 장검" 처럼 등급 접두어와 조합)
// sp   : 소모 SP / cd: 쿨다운 턴
// stat : 'str' | 'dex' | 'int' — 어느 공격력을 참조하는가
// power: 공격력 대비 % (없으면 비공격 스킬)
// hits : 다중 타격 / pierce: 방어 무시 / drain: 준 피해의 %만큼 흡혈
// executeBelow: 대상 HP % 이하일 때 데미지 2배
// critBonus: 이 스킬 한정 치명 확률 +%
// heal : 고정 회복 / spGain: SP 회복 / selfDmg: 자해
// apply: 적에게 부여 [{ s: 상태키, n: 스택, p: 확률% }]
// self : 자신에게 부여 [{ s: 상태키, n: 스택 }]
// reflect: 반사 % (피격 시)
const SK = (o) => o;
export const BURIED_SKILLS = {
  // ===== 방랑검사 — 검(sword) =====
  bladeStrike: SK({ id: 'bladeStrike', name: '검격',       slot: 'weapon', line: 'sword', gear: '장검',       sp: 12, cd: 0, stat: 'str', power: 130, desc: '기본에 충실한 베기.' }),
  crossSlash:  SK({ id: 'crossSlash',  name: '십자참',     slot: 'weapon', line: 'sword', gear: '쌍인검',     sp: 22, cd: 1, stat: 'str', power: 82, hits: 2, desc: '2연타 (타격당 82%).' }),
  sunderCut:   SK({ id: 'sunderCut',   name: '파쇄격',     slot: 'weapon', line: 'sword', gear: '중검',       sp: 20, cd: 1, stat: 'str', power: 108, apply: [{ s: 'shatter', n: 2, p: 100 }], desc: '적 방어를 깎는다. [파쇄] 2' }),
  executioner: SK({ id: 'executioner', name: '처형검',     slot: 'weapon', line: 'sword', gear: '처형검',     sp: 30, cd: 2, stat: 'str', power: 155, executeBelow: 35, desc: '적 HP 35% 이하면 데미지 2배.' }),
  // ===== 방랑검사 — 단검(blade) =====
  riposteEdge: SK({ id: 'riposteEdge', name: '역린',       slot: 'offhand', line: 'blade', gear: '수비 단검', sp: 14, cd: 0, stat: 'str', power: 68, self: [{ s: 'guard', n: 2 }], desc: '베며 자세를 굳힌다. [수호] 2' }),
  vitalStab:   SK({ id: 'vitalStab',   name: '급소 찌르기', slot: 'offhand', line: 'blade', gear: '송곳 단검', sp: 18, cd: 1, stat: 'str', power: 98, critBonus: 30, apply: [{ s: 'bleed', n: 2, p: 100 }], desc: '치명 확률 +30%. [출혈] 2' }),
  afterimage:  SK({ id: 'afterimage',  name: '잔영',       slot: 'offhand', line: 'blade', gear: '환영 단검', sp: 16, cd: 2, self: [{ s: 'evade', n: 3 }], spGain: 8, desc: '그림자를 남긴다. [잔영] 3, SP +8' }),

  // ===== 술법사 — 지팡이(staff) =====
  fireball:    SK({ id: 'fireball',    name: '화염구',     slot: 'weapon', line: 'staff', gear: '화염 지팡이', sp: 14, cd: 0, stat: 'int', power: 128, apply: [{ s: 'burn', n: 2, p: 100 }], desc: '[화상] 2' }),
  frostLance:  SK({ id: 'frostLance',  name: '서리창',     slot: 'weapon', line: 'staff', gear: '서리 지팡이', sp: 18, cd: 1, stat: 'int', power: 118, apply: [{ s: 'bind', n: 1, p: 100 }], desc: '[속박] 1' }),
  chainBolt:   SK({ id: 'chainBolt',   name: '연쇄 번개',  slot: 'weapon', line: 'staff', gear: '뇌전 지팡이', sp: 24, cd: 1, stat: 'int', power: 68, hits: 3, desc: '3연타 (타격당 68%).' }),
  infernoSeal: SK({ id: 'infernoSeal', name: '겁화',       slot: 'weapon', line: 'staff', gear: '겁화의 홀',   sp: 32, cd: 2, stat: 'int', power: 145, apply: [{ s: 'burn', n: 4, p: 100 }], desc: '[화상] 4' }),
  // ===== 술법사 — 마도서(tome) =====
  manaDrain:   SK({ id: 'manaDrain',   name: '마력 흡수',  slot: 'offhand', line: 'tome', gear: '흡마 마도서', sp: 6,  cd: 0, stat: 'int', power: 58, spGain: 22, desc: 'SP +22' }),
  curseSigil:  SK({ id: 'curseSigil',  name: '저주 각인',  slot: 'offhand', line: 'tome', gear: '저주 마도서', sp: 20, cd: 2, stat: 'int', power: 42, apply: [{ s: 'curse', n: 2, p: 100 }, { s: 'weaken', n: 2, p: 100 }], desc: '[저주] 2 + [약화] 2' }),
  arcaneWard:  SK({ id: 'arcaneWard',  name: '비전 수호',  slot: 'offhand', line: 'tome', gear: '수호 마도서', sp: 16, cd: 2, self: [{ s: 'guard', n: 3 }], desc: '[수호] 3' }),

  // ===== 혼혈 마족 — 도끼(axe) =====
  savageAxe:   SK({ id: 'savageAxe',   name: '광폭 도끼',  slot: 'weapon', line: 'axe', gear: '전투 도끼',   sp: 12, cd: 0, stat: 'str', power: 126, desc: '거칠게 내리찍는다.' }),
  bloodthirst: SK({ id: 'bloodthirst', name: '피의 갈증',  slot: 'weapon', line: 'axe', gear: '흡혈 도끼',   sp: 20, cd: 1, stat: 'str', power: 112, drain: 45, selfDmg: 8, desc: '준 피해의 45% 흡혈. 자해 8' }),
  decapitate:  SK({ id: 'decapitate',  name: '참수',       slot: 'weapon', line: 'axe', gear: '참수 도끼',   sp: 26, cd: 2, stat: 'str', power: 148, apply: [{ s: 'bleed', n: 3, p: 100 }], desc: '[출혈] 3' }),
  doomStrike:  SK({ id: 'doomStrike',  name: '파멸의 일격', slot: 'weapon', line: 'axe', gear: '파멸의 대부', sp: 34, cd: 3, stat: 'str', power: 95, pierce: true, berserk: true, desc: '방어 무시. 잃은 HP 비율만큼 위력 최대 2배.' }),
  // ===== 혼혈 마족 — 마수의 손톱(claw) =====
  laceration:  SK({ id: 'laceration',  name: '열상',       slot: 'offhand', line: 'claw', gear: '마수의 손톱', sp: 12, cd: 0, stat: 'str', power: 62, hits: 2, apply: [{ s: 'bleed', n: 2, p: 100 }], desc: '2연타. [출혈] 2' }),
  frenzy:      SK({ id: 'frenzy',      name: '광기',       slot: 'offhand', line: 'claw', gear: '광기의 발톱', sp: 18, cd: 2, self: [{ s: 'rage', n: 3 }], selfDmg: 10, desc: '[격노] 3. 자해 10' }),
  demonBlood:  SK({ id: 'demonBlood',  name: '마혈',       slot: 'offhand', line: 'claw', gear: '마혈의 손톱', sp: 16, cd: 2, self: [{ s: 'regen', n: 3 }, { s: 'rage', n: 1 }], desc: '[재생] 3 + [격노] 1' }),

  // ===== 숲의 정령사 — 활(bow) =====
  preciseShot: SK({ id: 'preciseShot', name: '정밀 사격',  slot: 'weapon', line: 'bow', gear: '단궁',       sp: 10, cd: 0, stat: 'dex', power: 118, critBonus: 10, desc: '치명 확률 +10%' }),
  pierceShot:  SK({ id: 'pierceShot',  name: '관통 사격',  slot: 'weapon', line: 'bow', gear: '관통궁',     sp: 20, cd: 1, stat: 'dex', power: 108, pierce: true, desc: '방어 무시.' }),
  stormVolley: SK({ id: 'stormVolley', name: '폭풍 화살',  slot: 'weapon', line: 'bow', gear: '폭풍궁',     sp: 26, cd: 2, stat: 'dex', power: 50, hits: 4, desc: '4연타 (타격당 58%).' }),
  moonSnipe:   SK({ id: 'moonSnipe',   name: '월광 저격',  slot: 'weapon', line: 'bow', gear: '월광궁',     sp: 30, cd: 2, stat: 'dex', power: 170, critBonus: 40, desc: '치명 확률 +40%' }),
  // ===== 숲의 정령사 — 화살통(quiver) =====
  venomArrow:  SK({ id: 'venomArrow',  name: '독화살',     slot: 'offhand', line: 'quiver', gear: '독 화살통',   sp: 12, cd: 0, stat: 'dex', power: 66, apply: [{ s: 'poison', n: 3, p: 100 }], desc: '[중독] 3' }),
  snareArrow:  SK({ id: 'snareArrow',  name: '속박 화살',  slot: 'offhand', line: 'quiver', gear: '속박 화살통', sp: 16, cd: 2, stat: 'dex', power: 58, apply: [{ s: 'bind', n: 2, p: 100 }], desc: '[속박] 2' }),
  windStep:    SK({ id: 'windStep',    name: '바람 걸음',  slot: 'offhand', line: 'quiver', gear: '질풍 화살통', sp: 14, cd: 2, self: [{ s: 'evade', n: 3 }], spGain: 6, desc: '[잔영] 3, SP +6' }),

  // ===== 여명의 사제 — 철퇴(mace) =====
  holySmite:   SK({ id: 'holySmite',   name: '신성 타격',  slot: 'weapon', line: 'mace', gear: '성전 철퇴',   sp: 12, cd: 0, stat: 'int', power: 130, desc: '빛으로 내리친다.' }),
  judgment:    SK({ id: 'judgment',    name: '심판',       slot: 'weapon', line: 'mace', gear: '심판의 철퇴', sp: 24, cd: 2, stat: 'int', power: 152, apply: [{ s: 'silence', n: 1, p: 100 }], desc: '[침묵] 1' }),
  purifyLight: SK({ id: 'purifyLight', name: '정화의 빛',  slot: 'weapon', line: 'mace', gear: '정화의 철퇴', sp: 18, cd: 1, stat: 'int', power: 88, heal: 25, desc: '자신 HP 25 회복.' }),
  dawnCrush:   SK({ id: 'dawnCrush',   name: '여명의 강타', slot: 'weapon', line: 'mace', gear: '여명의 대추', sp: 30, cd: 2, stat: 'int', power: 170, apply: [{ s: 'stun', n: 1, p: 40 }], desc: '40% 확률 [기절] 1' }),
  // ===== 여명의 사제 — 성물(relic) =====
  healPrayer:  SK({ id: 'healPrayer',  name: '치유 기도',  slot: 'offhand', line: 'relic', gear: '치유의 성물', sp: 20, cd: 1, heal: 72, desc: 'HP 72 회복.' }),
  benediction: SK({ id: 'benediction', name: '가호',       slot: 'offhand', line: 'relic', gear: '가호의 성물', sp: 16, cd: 2, self: [{ s: 'guard', n: 3 }, { s: 'regen', n: 2 }], desc: '[수호] 3 + [재생] 2' }),
  blessing:    SK({ id: 'blessing',    name: '축복',       slot: 'offhand', line: 'relic', gear: '축복의 성물', sp: 14, cd: 2, self: [{ s: 'rage', n: 2 }], heal: 15, desc: '[격노] 2, HP 15 회복.' }),

  // ===== 방어구 (전 직업 공용) =====
  ironWall:    SK({ id: 'ironWall',    name: '철벽',       slot: 'armor', line: null, gear: '판금 갑옷',   sp: 14, cd: 1, self: [{ s: 'guard', n: 3 }], desc: '[수호] 3' }),
  thornMail:   SK({ id: 'thornMail',   name: '가시 갑주',  slot: 'armor', line: null, gear: '가시 갑주',   sp: 12, cd: 1, self: [{ s: 'guard', n: 2 }], reflect: 35, desc: '[수호] 2. 2턴간 받은 피해의 35% 반사' }),
  regenScale:  SK({ id: 'regenScale',  name: '재생의 비늘', slot: 'armor', line: null, gear: '용린 갑옷',   sp: 16, cd: 2, self: [{ s: 'regen', n: 4 }], desc: '[재생] 4' }),
  shadowCloak: SK({ id: 'shadowCloak', name: '그림자 망토', slot: 'armor', line: null, gear: '그림자 망토', sp: 14, cd: 2, self: [{ s: 'evade', n: 3 }], desc: '[잔영] 3' }),

  // ===== 투구 (전 직업 공용) =====
  helmBash:    SK({ id: 'helmBash',    name: '투구 강타',  slot: 'helm', line: null, gear: '충각 투구',   sp: 10, cd: 1, stat: 'str', power: 58, apply: [{ s: 'stun', n: 1, p: 35 }], desc: '35% 확률 [기절] 1' }),
  focusMind:   SK({ id: 'focusMind',   name: '집중',       slot: 'helm', line: null, gear: '현자의 관',   sp: 0,  cd: 1, spGain: 32, desc: 'SP +32 (소모 없음)' }),
  intimidate:  SK({ id: 'intimidate',  name: '위압',       slot: 'helm', line: null, gear: '공포의 투구', sp: 12, cd: 2, apply: [{ s: 'weaken', n: 3, p: 100 }], desc: '[약화] 3' }),
  insight:     SK({ id: 'insight',     name: '통찰',       slot: 'helm', line: null, gear: '통찰의 투구', sp: 12, cd: 2, self: [{ s: 'rage', n: 2 }], spGain: 12, desc: '[격노] 2, SP +12' }),

  // ===== 장신구 (전 직업 공용) =====
  bloodSigil:  SK({ id: 'bloodSigil',  name: '흡혈 인장',  slot: 'acc', line: null, gear: '흡혈 인장',   sp: 16, cd: 1, stat: 'str', power: 78, drain: 65, desc: '준 피해의 65% 흡혈.' }),
  venomSigil:  SK({ id: 'venomSigil',  name: '맹독 인장',  slot: 'acc', line: null, gear: '맹독 반지',   sp: 14, cd: 1, stat: 'int', power: 46, apply: [{ s: 'poison', n: 4, p: 100 }], desc: '[중독] 4' }),
  sunderSigil: SK({ id: 'sunderSigil', name: '파쇄 인장',  slot: 'acc', line: null, gear: '파쇄의 인장', sp: 14, cd: 2, apply: [{ s: 'shatter', n: 4, p: 100 }], desc: '[파쇄] 4' }),
  silenceSigil:SK({ id: 'silenceSigil',name: '봉인 인장',  slot: 'acc', line: null, gear: '봉인 목걸이', sp: 18, cd: 3, apply: [{ s: 'silence', n: 2, p: 100 }], desc: '[침묵] 2' }),
  lifeCharm:   SK({ id: 'lifeCharm',   name: '생명의 부적', slot: 'acc', line: null, gear: '생명의 부적', sp: 20, cd: 2, heal: 72, desc: 'HP 72 회복.' }),
  berserkSigil:SK({ id: 'berserkSigil',name: '폭주 인장',  slot: 'acc', line: null, gear: '폭주의 인장', sp: 22, cd: 3, self: [{ s: 'rage', n: 4 }], selfDmg: 12, desc: '[격노] 4. 자해 12' }),

  // ===== 1.126.0 — BB2 공식 데이터시트(スキルSkill 421행) 선별 이식 30종 =====
  // 검(sword)
  twinFang:    SK({ id: 'twinFang',    name: '이연격',     slot: 'weapon', line: 'sword', gear: '쌍아검',     sp: 16, cd: 0, stat: 'str', power: 72, hits: 2, desc: '가볍게 두 번 벤다 (타격당 72%).' }),
  whirlSlash:  SK({ id: 'whirlSlash',  name: '선풍검',     slot: 'weapon', line: 'sword', gear: '선풍검',     sp: 28, cd: 2, stat: 'str', power: 64, hits: 3, desc: '휘몰아치는 3연타 (타격당 64%).' }),
  // 지팡이(staff)
  flameWall:   SK({ id: 'flameWall',   name: '업화 방벽',  slot: 'weapon', line: 'staff', gear: '업화 지팡이', sp: 18, cd: 2, stat: 'int', power: 52, apply: [{ s: 'burn', n: 2, p: 100 }], self: [{ s: 'guard', n: 2 }], desc: '[화상] 2 + 자신 [수호] 2' }),
  thunderBolt: SK({ id: 'thunderBolt', name: '낙뢰',       slot: 'weapon', line: 'staff', gear: '낙뢰의 홀',   sp: 34, cd: 3, stat: 'int', power: 195, desc: '하늘이 내리꽂힌다.' }),
  // 도끼(axe)
  earthSplit:  SK({ id: 'earthSplit',  name: '대지 가르기', slot: 'weapon', line: 'axe', gear: '단층 도끼',   sp: 18, cd: 1, stat: 'str', power: 96, apply: [{ s: 'shatter', n: 3, p: 100 }], desc: '[파쇄] 3' }),
  rampage:     SK({ id: 'rampage',     name: '광란',       slot: 'weapon', line: 'axe', gear: '광란 도끼',   sp: 24, cd: 2, stat: 'str', power: 88, hits: 2, selfDmg: 6, desc: '2연타 (타격당 88%). 자해 6' }),
  // 활(bow)
  rapidShot:   SK({ id: 'rapidShot',   name: '속사',       slot: 'weapon', line: 'bow', gear: '속사궁',     sp: 14, cd: 0, stat: 'dex', power: 62, hits: 2, desc: '연달아 쏜다 (타격당 62%).' }),
  shadowShot:  SK({ id: 'shadowShot',  name: '그림자 사격', slot: 'weapon', line: 'bow', gear: '그림자 궁',   sp: 24, cd: 2, stat: 'dex', power: 165, self: [{ s: 'evade', n: 1 }], desc: '어둠에서 쏜다. 자신 [잔영] 1' }),
  // 철퇴(mace)
  holyBolt:    SK({ id: 'holyBolt',    name: '성뢰',       slot: 'weapon', line: 'mace', gear: '성뢰의 철퇴', sp: 16, cd: 1, stat: 'int', power: 112, critBonus: 15, desc: '빛의 화살. 치명 확률 +15%' }),
  punisher:    SK({ id: 'punisher',    name: '응징',       slot: 'weapon', line: 'mace', gear: '응징의 철퇴', sp: 22, cd: 2, stat: 'int', power: 118, executeBelow: 40, desc: '적 HP 40% 이하면 데미지 2배.' }),
  // 단검(blade)
  legSweep:    SK({ id: 'legSweep',    name: '발목 베기',  slot: 'offhand', line: 'blade', gear: '갈고리 단검', sp: 14, cd: 1, stat: 'str', power: 70, apply: [{ s: 'bind', n: 1, p: 100 }], desc: '[속박] 1' }),
  shuriken:    SK({ id: 'shuriken',    name: '표창 투척',  slot: 'offhand', line: 'blade', gear: '표창 주머니', sp: 18, cd: 1, stat: 'str', power: 38, hits: 3, desc: '3연타 (타격당 38%).' }),
  // 마도서(tome)
  darkBolt:    SK({ id: 'darkBolt',    name: '암흑탄',     slot: 'offhand', line: 'tome', gear: '암흑 마도서', sp: 16, cd: 1, stat: 'int', power: 96, apply: [{ s: 'curse', n: 1, p: 100 }], desc: '[저주] 1' }),
  suddenGust:  SK({ id: 'suddenGust',  name: '돌풍',       slot: 'offhand', line: 'tome', gear: '질풍 마도서', sp: 8, cd: 0, stat: 'int', power: 74, spGain: 6, desc: '빠른 일격. SP +6' }),
  // 마수의 손톱(claw)
  rendFlesh:   SK({ id: 'rendFlesh',   name: '찢어발기기', slot: 'offhand', line: 'claw', gear: '갈퀴 손톱',   sp: 20, cd: 1, stat: 'str', power: 54, hits: 2, apply: [{ s: 'bleed', n: 3, p: 100 }], desc: '2연타. [출혈] 3' }),
  devour:      SK({ id: 'devour',      name: '포식',       slot: 'offhand', line: 'claw', gear: '포식자 발톱', sp: 22, cd: 2, stat: 'str', power: 92, drain: 60, desc: '준 피해의 60% 흡혈.' }),
  // 화살통(quiver)
  fireArrow:   SK({ id: 'fireArrow',   name: '화염 화살',  slot: 'offhand', line: 'quiver', gear: '화염 화살통', sp: 14, cd: 1, stat: 'dex', power: 74, apply: [{ s: 'burn', n: 2, p: 100 }], desc: '[화상] 2' }),
  camouflage:  SK({ id: 'camouflage',  name: '은신',       slot: 'offhand', line: 'quiver', gear: '위장 망토통', sp: 12, cd: 2, self: [{ s: 'evade', n: 2 }, { s: 'guard', n: 2 }], desc: '[잔영] 2 + [수호] 2' }),
  // 성물(relic)
  oracle:      SK({ id: 'oracle',      name: '신탁',       slot: 'offhand', line: 'relic', gear: '신탁의 성물', sp: 18, cd: 2, self: [{ s: 'rage', n: 2 }, { s: 'regen', n: 2 }], desc: '[격노] 2 + [재생] 2' }),
  sanctify:    SK({ id: 'sanctify',    name: '성별',       slot: 'offhand', line: 'relic', gear: '성별의 성물', sp: 22, cd: 2, stat: 'int', power: 66, heal: 40, desc: '빛으로 치고 HP 40 회복.' }),
  // 방어구 (공용)
  shieldBash:  SK({ id: 'shieldBash',  name: '방패 강타',  slot: 'armor', line: null, gear: '타워 방패',   sp: 12, cd: 1, stat: 'str', power: 72, apply: [{ s: 'stun', n: 1, p: 30 }], desc: '30% 확률 [기절] 1' }),
  mirrorPlate: SK({ id: 'mirrorPlate', name: '거울 갑주',  slot: 'armor', line: null, gear: '거울 갑주',   sp: 16, cd: 2, self: [{ s: 'guard', n: 1 }], reflect: 50, desc: '[수호] 1. 2턴간 받은 피해의 50% 반사' }),
  bulwark:     SK({ id: 'bulwark',     name: '대성벽',     slot: 'armor', line: null, gear: '성채 갑옷',   sp: 20, cd: 3, self: [{ s: 'guard', n: 5 }], desc: '[수호] 5' }),
  // 투구 (공용)
  chargeUp:    SK({ id: 'chargeUp',    name: '힘 모으기',  slot: 'helm', line: null, gear: '투사의 투구', sp: 8, cd: 3, self: [{ s: 'rage', n: 3 }], desc: '[격노] 3' }),
  observe:     SK({ id: 'observe',     name: '관찰',       slot: 'helm', line: null, gear: '감시자의 눈', sp: 6, cd: 1, apply: [{ s: 'weaken', n: 2, p: 100 }], spGain: 8, desc: '[약화] 2, SP +8' }),
  warHorn:     SK({ id: 'warHorn',     name: '전쟁 나팔',  slot: 'helm', line: null, gear: '전쟁 나팔 투구', sp: 14, cd: 2, self: [{ s: 'rage', n: 1 }], apply: [{ s: 'weaken', n: 2, p: 100 }], desc: '[격노] 1 + 적 [약화] 2' }),
  // 장신구 (공용)
  boneGraft:   SK({ id: 'boneGraft',   name: '뼈 접합',    slot: 'acc', line: null, gear: '뼈 목걸이',   sp: 18, cd: 2, heal: 55, self: [{ s: 'guard', n: 1 }], desc: 'HP 55 회복 + [수호] 1' }),
  grudge:      SK({ id: 'grudge',      name: '원한',       slot: 'acc', line: null, gear: '원한의 인장', sp: 16, cd: 2, stat: 'int', power: 58, apply: [{ s: 'curse', n: 2, p: 100 }], desc: '[저주] 2' }),
  fairyDust:   SK({ id: 'fairyDust',   name: '요정 가루',  slot: 'acc', line: null, gear: '요정의 병',   sp: 12, cd: 2, apply: [{ s: 'confuse', n: 1, p: 100 }, { s: 'weaken', n: 1, p: 100 }], desc: '[혼란] 1 + [약화] 1' }),
  dragonFang:  SK({ id: 'dragonFang',  name: '용아',       slot: 'acc', line: null, gear: '용아 목걸이', sp: 24, cd: 2, stat: 'str', power: 128, selfDmg: 8, desc: '용의 이빨로 문다. 자해 8' }),

  // ===== 1.138.0 — BB2 스킬 시트 2차 이식 (+40 = 119종) =====
  // 원전 スキルSkill 421행에서 선별. 기존 필드 어휘만 사용 — 신규 메커니즘 0.
  // ⚡신속 정합: 원전 Quick 플래그의 **공격 스킬**은 명시 swift(저위력 속공기) — 자동 파생 규칙과 별개.
  // --- 검(sword) ---
  jabStrike:   SK({ id: 'jabStrike',   name: '잽',         slot: 'weapon', line: 'sword', gear: '경량 세검',   sp: 10, cd: 1, stat: 'str', power: 42, hits: 2, swift: true, desc: '⚡신속 2연타 — 턴을 소모하지 않는 속공.' }),
  overheadCut: SK({ id: 'overheadCut', name: '대상단',     slot: 'weapon', line: 'sword', gear: '대상단 태도', sp: 26, cd: 2, stat: 'str', power: 150, critBonus: 25, apply: [{ s: 'bleed', n: 2, p: 100 }], desc: '치명 확률 +25%. [출혈] 2' }),
  // --- 단검(blade) ---
  shurikenToss:SK({ id: 'shurikenToss',name: '수리검 투척', slot: 'offhand', line: 'blade', gear: '수리검 주머니', sp: 12, cd: 1, stat: 'str', power: 28, hits: 3, swift: true, desc: '⚡신속 3연투 — 턴을 소모하지 않는다.' }),
  hazyTwoStep: SK({ id: 'hazyTwoStep', name: '농무 이단',  slot: 'offhand', line: 'blade', gear: '박무 단검',   sp: 20, cd: 2, stat: 'str', power: 55, hits: 2, critBonus: 40, desc: '안개 속 2연격. 치명 확률 +40%' }),
  // --- 지팡이(staff) ---
  gustBolt:    SK({ id: 'gustBolt',    name: '서든 거스트', slot: 'weapon', line: 'staff', gear: '돌풍 지팡이', sp: 16, cd: 1, stat: 'int', power: 88, swift: true, desc: '⚡신속 마법 일격 — 턴을 소모하지 않는다.' }),
  thunderbolt: SK({ id: 'thunderbolt', name: '선더볼트',   slot: 'weapon', line: 'staff', gear: '낙뢰 지팡이', sp: 24, cd: 2, stat: 'int', power: 132, apply: [{ s: 'stun', n: 1, p: 30 }], desc: '30% 확률 [기절] 1' }),
  // --- 마도서(tome) ---
  plagueWind:  SK({ id: 'plagueWind',  name: '역병 바람',  slot: 'offhand', line: 'tome', gear: '역병 마도서', sp: 18, cd: 1, stat: 'int', power: 62, hits: 2, apply: [{ s: 'poison', n: 2, p: 100 }], desc: '2연타. [중독] 2' }),
  drainLife:   SK({ id: 'drainLife',   name: '생명 흡수',  slot: 'offhand', line: 'tome', gear: '흡정 마도서', sp: 22, cd: 2, stat: 'int', power: 105, drain: 60, desc: '준 피해의 60% 흡혈' }),
  // --- 도끼(axe) ---
  daredevil:   SK({ id: 'daredevil',   name: '막무가내',   slot: 'weapon', line: 'axe', gear: '무모한 도끼',   sp: 22, cd: 1, stat: 'str', power: 55, hits: 3, desc: '앞뒤 없이 3연타.' }),
  breaker:     SK({ id: 'breaker',     name: '브레이커',   slot: 'weapon', line: 'axe', gear: '파괴자의 대부', sp: 24, cd: 2, stat: 'str', power: 128, apply: [{ s: 'bind', n: 1, p: 100 }, { s: 'shatter', n: 1, p: 100 }], desc: '[속박] 1 + [파쇄] 1' }),
  // --- 손톱(claw) ---
  corrosiveTouch: SK({ id: 'corrosiveTouch', name: '부식의 손길', slot: 'offhand', line: 'claw', gear: '부식 발톱', sp: 14, cd: 1, apply: [{ s: 'poison', n: 2, p: 100 }, { s: 'shatter', n: 1, p: 100 }], desc: '[중독] 2 + [파쇄] 1' }),
  tormentHit:  SK({ id: 'tormentHit',  name: '고통의 일격', slot: 'offhand', line: 'claw', gear: '고문 갈고리', sp: 20, cd: 2, stat: 'str', power: 118, apply: [{ s: 'curse', n: 1, p: 100 }], desc: '[저주] 1' }),
  // --- 활(bow) ---
  quickShot:   SK({ id: 'quickShot',   name: '퀵 샷',      slot: 'weapon', line: 'bow', gear: '속사 단궁',     sp: 12, cd: 1, stat: 'dex', power: 66, critBonus: 25, swift: true, desc: '⚡신속 속사 — 턴을 소모하지 않는다. 치명 +25%' }),
  sniperShot:  SK({ id: 'sniperShot',  name: '저격',       slot: 'weapon', line: 'bow', gear: '저격 장궁',     sp: 26, cd: 2, stat: 'dex', power: 135, critBonus: 50, desc: '숨을 고르고 쏜다. 치명 확률 +50%' }),
  // --- 화살통(quiver) ---
  venomShot:   SK({ id: 'venomShot',   name: '베놈 샷',    slot: 'offhand', line: 'quiver', gear: '독액 화살통', sp: 14, cd: 1, stat: 'dex', power: 58, apply: [{ s: 'poison', n: 2, p: 100 }], swift: true, desc: '⚡신속 독화살 — 턴을 소모하지 않는다. [중독] 2' }),
  stoneBullet: SK({ id: 'stoneBullet', name: '스톤 바렛',  slot: 'offhand', line: 'quiver', gear: '석화 화살통', sp: 18, cd: 2, stat: 'dex', power: 92, apply: [{ s: 'stun', n: 1, p: 25 }], desc: '25% 확률 [기절] 1' }),
  // --- 철퇴(mace) ---
  holyDescent: SK({ id: 'holyDescent', name: '홀리 스마이트', slot: 'weapon', line: 'mace', gear: '성징의 철퇴', sp: 28, cd: 2, stat: 'int', power: 165, desc: '성광이 내리꽂힌다.' }),
  shockwave:   SK({ id: 'shockwave',   name: '충격파',     slot: 'weapon', line: 'mace', gear: '충파 망치',     sp: 18, cd: 1, stat: 'int', power: 70, barrierGain: 10, desc: '보호막 +10' }),
  // --- 성물(relic) ---
  firstAid:    SK({ id: 'firstAid',    name: '응급 처치',  slot: 'offhand', line: 'relic', gear: '응급 성물',   sp: 16, cd: 1, heal: 58, desc: 'HP 58 회복.' }),
  // 1.152.0 — relic 공격기 3종 (PM 지시 구조 교정). 진단: relic은 7종 중 공격기 1개뿐이라
  // 사제 계열 4직업(사제·대사제·성기사·역병사제)이 보조 슬롯에서 딜을 전혀 못 냈다.
  // 정체성은 「치면서 지킨다」 — 공격에 회복·보호막·디버프가 붙는다.
  smiteSeal:   SK({ id: 'smiteSeal',   name: '응보의 인장', slot: 'offhand', line: 'relic', gear: '응보의 인장', sp: 16, cd: 1, stat: 'int', power: 104, barrierGain: 18, desc: '빛으로 치고 보호막 +18.' }),
  radiantChain:SK({ id: 'radiantChain',name: '광휘 연쇄',   slot: 'offhand', line: 'relic', gear: '광휘의 성물', sp: 20, cd: 2, stat: 'int', power: 62, hits: 2, apply: [{ s: 'weaken', n: 2, p: 100 }], desc: '빛이 두 번 꿰뚫는다. [약화] 2' }),
  retribution: SK({ id: 'retribution', name: '신벌(神罰)',  slot: 'offhand', line: 'relic', gear: '신벌의 성물', sp: 24, cd: 2, stat: 'int', power: 122, apply: [{ s: 'curse', n: 1, p: 100 }], desc: '신의 벌이 내린다. [저주] 1' }),
  sunlight:    SK({ id: 'sunlight',    name: '선라이트',   slot: 'offhand', line: 'relic', gear: '햇살 성물',   sp: 16, cd: 2, self: [{ s: 'regen', n: 3 }], barrierGain: 15, desc: '[재생] 3 + 보호막 +15' }),
  // --- 방어구 공용 ---
  holyAura:    SK({ id: 'holyAura',    name: '홀리 오라',  slot: 'armor', line: null, gear: '성광 갑주',   sp: 22, cd: 3, barrierGain: 45, desc: '보호막 +45' }),
  passiveStance: SK({ id: 'passiveStance', name: '수세 태세', slot: 'armor', line: null, gear: '수세 갑주', sp: 12, cd: 2, self: [{ s: 'guard', n: 3 }], reflect: 25, desc: '[수호] 3. 2턴간 받은 피해의 25% 반사' }),
  steelBody:   SK({ id: 'steelBody',   name: '강철 육체',  slot: 'armor', line: null, gear: '강체 갑옷',   sp: 16, cd: 2, self: [{ s: 'guard', n: 2 }], barrierGain: 20, desc: '[수호] 2 + 보호막 +20' }),
  shadowForm:  SK({ id: 'shadowForm',  name: '그림자 태세', slot: 'armor', line: null, gear: '야행 갑주',   sp: 14, cd: 2, self: [{ s: 'evade', n: 2 }, { s: 'rage', n: 1 }], desc: '[잔영] 2 + [격노] 1' }),
  selfHarmRite:SK({ id: 'selfHarmRite',name: '자해 의식',  slot: 'armor', line: null, gear: '고행 갑주',   sp: 6, cd: 1, selfDmg: 8, spGain: 20, desc: '자해 8, SP +20' }),
  lastStand:   SK({ id: 'lastStand',   name: '결사 항전',  slot: 'armor', line: null, gear: '결사 갑주',   sp: 18, cd: 3, self: [{ s: 'guard', n: 2 }, { s: 'rage', n: 2 }], desc: '[수호] 2 + [격노] 2' }),
  // --- 투구 공용 ---
  acrobatics:  SK({ id: 'acrobatics',  name: '아크로바틱', slot: 'helm', line: null, gear: '곡예사의 두건', sp: 12, cd: 2, self: [{ s: 'evade', n: 3 }], desc: '[잔영] 3' }),
  overdrive:   SK({ id: 'overdrive',   name: '오버드라이브', slot: 'helm', line: null, gear: '과부하 투구', sp: 20, cd: 3, self: [{ s: 'rage', n: 2 }, { s: 'evade', n: 1 }], selfDmg: 6, desc: '[격노] 2 + [잔영] 1. 자해 6' }),
  fearMask:    SK({ id: 'fearMask',    name: '피어',       slot: 'helm', line: null, gear: '공포 가면',     sp: 16, cd: 2, apply: [{ s: 'confuse', n: 1, p: 100 }, { s: 'curse', n: 1, p: 100 }], desc: '[혼란] 1 + [저주] 1' }),
  steadyEffort:SK({ id: 'steadyEffort',name: '꾸준한 노력', slot: 'helm', line: null, gear: '수행자의 관', sp: 8, cd: 2, spGain: 14, self: [{ s: 'rage', n: 1 }], desc: 'SP +14, [격노] 1' }),
  shieldBreak: SK({ id: 'shieldBreak', name: '실드 브레이크', slot: 'helm', line: null, gear: '파성 투구',  sp: 14, cd: 2, apply: [{ s: 'shatter', n: 3, p: 100 }, { s: 'bind', n: 1, p: 100 }], desc: '[파쇄] 3 + [속박] 1' }),
  planExecution: SK({ id: 'planExecution', name: '계획적 실행', slot: 'helm', line: null, gear: '책략가의 관', sp: 14, cd: 3, self: [{ s: 'rage', n: 2 }], spGain: 10, desc: '[격노] 2, SP +10' }),
  // --- 장신구 공용 ---
  blindSigil:  SK({ id: 'blindSigil',  name: '블라인드',   slot: 'acc', line: null, gear: '실명의 인장',   sp: 16, cd: 3, apply: [{ s: 'confuse', n: 2, p: 100 }], desc: '[혼란] 2' }),
  ninjutsu:    SK({ id: 'ninjutsu',    name: '인술',       slot: 'acc', line: null, gear: '인술 두루마리', sp: 18, cd: 3, self: [{ s: 'evade', n: 2 }], spGain: 12, desc: '[잔영] 2, SP +12' }),
  poisonHazard:SK({ id: 'poisonHazard',name: '포이즌 해저드', slot: 'acc', line: null, gear: '독무 병',    sp: 16, cd: 2, apply: [{ s: 'poison', n: 4, p: 100 }], desc: '[중독] 4' }),
  leechSigil:  SK({ id: 'leechSigil',  name: '흡혈귀의 이빨', slot: 'acc', line: null, gear: '흡혈귀의 인장', sp: 20, cd: 2, stat: 'str', power: 96, drain: 50, desc: '준 피해의 50% 흡혈' }),
  voidForm:    SK({ id: 'voidForm',    name: '보이드 폼',  slot: 'acc', line: null, gear: '공허의 인장',   sp: 14, cd: 2, self: [{ s: 'guard', n: 1 }, { s: 'evade', n: 1 }, { s: 'regen', n: 1 }], desc: '[수호] 1 + [잔영] 1 + [재생] 1' }),
  eldritchTouch: SK({ id: 'eldritchTouch', name: '이형의 촉수', slot: 'acc', line: null, gear: '촉수 부적', sp: 18, cd: 1, stat: 'int', power: 44, hits: 3, apply: [{ s: 'confuse', n: 1, p: 30 }], desc: '3연타. 30% 확률 [혼란] 1' }),
  thunderGlyph:SK({ id: 'thunderGlyph',name: '뇌문 각인',  slot: 'acc', line: null, gear: '뇌문 부적',     sp: 16, cd: 2, stat: 'int', power: 88, apply: [{ s: 'stun', n: 1, p: 20 }], desc: '20% 확률 [기절] 1' }),
  balancedStance: SK({ id: 'balancedStance', name: '정안 자세', slot: 'acc', line: null, gear: '정안의 인장', sp: 10, cd: 2, self: [{ s: 'rage', n: 1 }, { s: 'guard', n: 1 }], desc: '[격노] 1 + [수호] 1' }),
};
// ⚡ 신속 (1.136.0) — 데미지·회복이 없고 SP 순증도 아닌 순수 버프·디버프 스킬은
// 턴을 소모하지 않는다 (전투에서 턴당 1회). 데이터에서 자동 파생 — 신규 스킬도 규칙만 지키면 자동 적용.
// 1.138.0 — 원전 Quick 플래그 정합: 공격 스킬도 명시 `swift: true`로 신속이 될 수 있다 (잽·퀵 샷 등 저위력 속공기).
for (const s of Object.values(BURIED_SKILLS)) {
  if (!s.power && !s.heal && (s.spGain || 0) <= (s.sp || 0)) s.swift = true;
}
export const BURIED_SKILL_LIST = Object.values(BURIED_SKILLS);

// 1.148.0 — 고정 가산·화력 유니크 밸런스 상수 (조정은 여기 한 곳)
// [u107] 거체의 반지: 물리·기교에 최대 HP의 N%를 **고정 가산** (% 보정 밖)
// [lg34] 흑색 화약:   물리·기교 % 보정에 +N (곱연산) — 대신 받는 피해 +M%
export const BURIED_RING_HP_PCT = 8;
export const BURIED_POWDER = { physPct: 28, takenPct: 4 };

// 기본 공격 — 장비가 없어도 항상 사용 가능 (SP 0, 사용 시 SP 회복)
export const BURIED_BASIC = {
  id: 'basic', name: '기본 공격', sp: 0, cd: 0, power: 85, spGain: 14,
  desc: '물리·기교·마법 중 가장 높은 공격력으로 후려친다. SP +14',
};

// =========================================================
// 직업별 기본 공격 (1.147.0) — PM 지시 "각 직업별 기본공격에 특색"
// =========================================================
// 기본기는 SP 엔진이라 턴의 절반 가까이 쓰인다 (1.118.0 시뮬 가동률 ~50%) —
// 효과는 반드시 "작게" 유지할 것. 필드 어휘는 일반 스킬과 100% 동일
// (apply/drain/critBonus/spGain/berserk/power)이라 전투 파이프라인 코드 변경 0줄.
// %형 3종(healPctOfMax/barrierPctOfMax/selfDmgPctOfMax)만 buriedClassBasic이 maxHp로 환산.
// flavor는 UI 표시용 한 줄 (전투 버튼·출정 위저드 공용).
export const BURIED_CLASS_BASICS = {
  // --- 기본 5직업 ---
  // 1.147.1 — 도트형(출혈·화상·중독)은 tickDmg가 고정치라 심층에서 무의미해지는 문제:
  //           perLv(마물 레벨 N당 스택 +1)로 스케일 보정. %형(약화·파쇄·저주·치명·흡혈)은 자연 스케일.
  wanderer:       { name: '응수의 검',       flavor: '40% 확률 [출혈] 1+ (마물 Lv 30당 +1)', apply: [{ s: 'bleed', n: 1, p: 40, perLv: 30 }] },
  sage:           { name: '잿불 손짓',       flavor: '40% 확률 [화상] 1+ (마물 Lv 30당 +1)', apply: [{ s: 'burn', n: 1, p: 40, perLv: 30 }] },
  demonblood:     { name: '피의 미각',       flavor: '피해의 12% 흡혈',                   drain: 12 },
  elf:            { name: '정조준',          flavor: '치명 확률 +12%',                    critBonus: 12 },
  priest:         { name: '여명의 손길',     flavor: '최대 HP 4% 회복 · 넘치면 🔷보호막', healPctOfMax: 4, overhealToBarrier: true },
  // --- 전직 5직업 (기본형의 강화판 — 계열 정체성 유지) ---
  wanderer_adv:   { name: '되돌아오는 칼날', flavor: '60% 확률 [출혈] 1+ (마물 Lv 30당 +1)', apply: [{ s: 'bleed', n: 1, p: 60, perLv: 30 }] },
  sage_adv:       { name: '겁화의 불씨',     flavor: '60% 확률 [화상] 1+ (마물 Lv 30당 +1)', apply: [{ s: 'burn', n: 1, p: 60, perLv: 30 }] },
  demonblood_adv: { name: '군주의 미각',     flavor: '피해의 20% 흡혈',                   drain: 20 },
  elf_adv:        { name: '이중 조준',       flavor: '치명 확률 +18%',                    critBonus: 18 },
  priest_adv:     { name: '여명의 축도',     flavor: '최대 HP 6% 회복 · 넘치면 🔷보호막', healPctOfMax: 6, overhealToBarrier: true },
  // --- 조우 3직업 ---
  magiblade:      { name: '혈인검(血刃劍)',  flavor: '위력 100% · 최대 HP 2% 자해 (혈류 발동)', power: 100, selfDmgPctOfMax: 2 },
  vampire:        { name: '흡혈',            flavor: '피해의 25% 흡혈',                   drain: 25 },
  fairy:          { name: '요정의 가루',     flavor: '20% 확률 [약화] 1',                 apply: [{ s: 'weaken', n: 1, p: 20 }] },
  // --- 심층 4직업 ---
  mazewarden:     { name: '지리 감각',       flavor: 'SP 회수 +4 (총 +18)',               spGain: 18 },
  plaguedoc:      { name: '곪은 손길',       flavor: '40% 확률 [중독] 1+ (마물 Lv 30당 +1)', apply: [{ s: 'poison', n: 1, p: 40, perLv: 30 }] },
  chasmrager:     { name: '나락의 완력',     flavor: '잃은 HP에 비례해 위력 증가',        berserk: true },
  voidwalker:     { name: '공허 찌르기',     flavor: '20% 확률 [파쇄] 1',                 apply: [{ s: 'shatter', n: 1, p: 20 }] },
  // --- 조직 전속 4직업 ---
  paladin:        { name: '수호의 타격',     flavor: '사용 시 🔷보호막 +최대 HP 3%',      barrierPctOfMax: 3 },
  necroseer:      { name: '망자의 속삭임',   flavor: '25% 확률 [저주] 1',                 apply: [{ s: 'curse', n: 1, p: 25 }] },
  ronin:          { name: '발도(拔刀)',      flavor: '치명 확률 +15%',                    critBonus: 15 },
  darkknight:     { name: '어둠 물기',       flavor: '피해의 8% 흡혈 · 20% 확률 [약화] 1', drain: 8, apply: [{ s: 'weaken', n: 1, p: 20 }] },
};

// 직업 기본기 실효 스킬 — maxHp로 %형 필드를, monLevel로 도트 스택(perLv)을 환산. 미정의 직업은 공용 기본기.
export function buriedClassBasic(classId, maxHp = 0, monLevel = 0) {
  const mod = BURIED_CLASS_BASICS[classId];
  if (!mod) return BURIED_BASIC;
  const { healPctOfMax, barrierPctOfMax, selfDmgPctOfMax, ...rest } = mod;
  const out = { ...BURIED_BASIC, ...rest };
  if (healPctOfMax) out.heal = Math.max(1, Math.round(maxHp * healPctOfMax / 100));
  if (barrierPctOfMax) out.barrierGain = Math.max(1, Math.round(maxHp * barrierPctOfMax / 100));
  if (selfDmgPctOfMax) out.selfDmg = Math.max(1, Math.round(maxHp * selfDmgPctOfMax / 100));
  // 1.147.1 — 도트 스케일: perLv 필드가 있으면 마물 레벨 비례로 스택 가산 (심층 보정)
  if (out.apply?.some(a => a.perLv)) {
    out.apply = out.apply.map(({ perLv, ...a }) =>
      perLv ? { ...a, n: a.n + Math.floor(Math.max(0, monLevel) / perLv) } : a);
    if (monLevel > 0) {
      out.flavor = out.apply.map(a => `${a.p}% 확률 [${BURIED_STATUS[a.s]?.name}] ${a.n}`).join(' · ');
    }
  }
  return out;
}

// 직업이 착용 가능한 스킬인지
export function canClassUseSkill(classId, skill) {
  if (!skill) return false;
  if (!skill.line) return true; // 방어구/투구/장신구는 공용
  const cls = getBuriedClass(classId);
  if (!cls) return false;
  return cls.lines.weapon === skill.line || cls.lines.offhand === skill.line;
}

// =========================================================
// 6. 장비 등급 + 랜덤 옵션
// =========================================================
export const BURIED_TIERS = [
  { id: 'worn',  name: '낡은',   color: '#8b8378', mult: 1.00, opts: 0, weight: 42, dust: 1 },
  { id: 'fine',  name: '정련된', color: '#7a9a5e', mult: 1.28, opts: 1, weight: 29, dust: 3 },
  { id: 'rare',  name: '희귀한', color: '#7ba3c4', mult: 1.60, opts: 2, weight: 17, dust: 8 },
  { id: 'epic',  name: '영웅의', color: '#5c4a8c', mult: 2.00, opts: 3, weight: 9,  dust: 20 },
  { id: 'relic', name: '유물급', color: '#e8b04a', mult: 2.55, opts: 4, weight: 3,  dust: 50 },
  // 1.106.0 — 전설의 무구 전용 등급. weight 0이라 일반 드랍 풀에는 절대 나오지 않는다
  { id: 'legend', name: '전설의', color: '#ff7b54', mult: 2.9, opts: 3, weight: 0, dust: 120 },
];
export const getBuriedTier = (id) => BURIED_TIERS.find(t => t.id === id) || BURIED_TIERS[0];

// 슬롯별 기본 스탯 (1층 기준). 층·등급 배율이 곱해진다.
const SLOT_BASE = {
  weapon:  { atk: 14, mag: 14, chase: 3 },
  offhand: { atk: 7,  mag: 7, def: 3, barrier: 8 },
  armor:   { def: 9,  hp: 26, barrier: 16 },
  helm:    { def: 5,  hp: 12, sp: 8, barrier: 6 },
  acc:     { atk: 4,  mag: 4, hp: 10, sp: 5, chase: 2 },
};

// 랜덤 옵션 풀 — 등급 opts 수만큼 붙는다
export const BURIED_OPTIONS = [
  { key: 'atk',    name: '공격력',   min: 3,  max: 9,  affix: '흉포한' },
  { key: 'mag',    name: '마력',     min: 3,  max: 9,  affix: '비전의' },
  { key: 'def',    name: '방어력',   min: 2,  max: 7,  affix: '견고한' },
  { key: 'hp',     name: '최대 HP',  min: 10, max: 30, affix: '강건한' },
  { key: 'sp',     name: '최대 SP',  min: 4,  max: 12, affix: '심원한' },
  { key: 'crit',   name: '치명 확률', min: 2,  max: 6,  affix: '예리한', pct: true },
  { key: 'critDmg',name: '치명 피해', min: 8,  max: 22, affix: '잔혹한', pct: true },
  { key: 'dodge',  name: '회피율',   min: 2,  max: 5,  affix: '민첩한', pct: true },
  { key: 'spRegen',name: 'SP 회복',  min: 2,  max: 5,  affix: '순환의' },
  { key: 'barrier',name: '보호막',   min: 12, max: 34, affix: '수호의' },
  { key: 'chase',  name: '추격 피해', min: 4,  max: 12, affix: '추격의' },
  { key: 'str',    name: '완력',     min: 1,  max: 3,  affix: '역사의' },
  { key: 'dex',    name: '기교',     min: 1,  max: 3,  affix: '숙련된' },
  { key: 'int',    name: '지혜',     min: 1,  max: 3,  affix: '현자의' },
  { key: 'vit',    name: '체력',     min: 1,  max: 3,  affix: '불굴의' },
];

// 1.125.0 — 강화 시스템 폐지 (PM 결정: 풀강 +60% = 무적 루트). 구 장비의 plus 필드는 무시된다.
// 골드 용처는 제단 「봉헌」 + 상점 「리롤」로 대체 — 일회성 소비라 영구 파워 인플레가 없다.
export const BURIED_ALTAR_BOONS = [
  { id: 'guard',   icon: '🔷', name: '수호의 봉헌', costBase: 90,
    desc: '다음 전투를 시작 보호막(최대 HP 35%)과 함께 시작한다' },
  { id: 'bless',   icon: '✨', name: '축복의 봉헌', costBase: 110,
    desc: '다음 전투 시작 시 [재생] 5 + [수호] 3을 얻는다' },
  { id: 'cleanse', icon: '🕯', name: '정화의 봉헌', costBase: 170,
    desc: '짊어진 저주 1개를 무작위로 해제한다' },
  { id: 'resupply', icon: '🔧', name: '보충의 봉헌', costBase: 130,
    desc: '지정한 장비 1개의 스킬 사용 횟수를 만충한다' },
];
export const buriedBoonCost = (boon, monLevel = 1) =>
  Math.round(boon.costBase * (1 + Math.max(0, (monLevel || 1) - 1) * 0.1));
// 상점 리롤 — 진열 전체를 다시 굴린다. 같은 상점에서 반복할수록 2배씩
export const buriedShopRerollCost = (monLevel = 1, count = 0) =>
  Math.round(50 * (1 + Math.max(0, (monLevel || 1) - 1) * 0.08) * Math.pow(2, count || 0));

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weightedPick(list, getW) {
  const total = list.reduce((s, x) => s + getW(x), 0);
  let r = Math.random() * total;
  for (const x of list) { r -= getW(x); if (r <= 0) return x; }
  return list[list.length - 1];
}

let _buriedItemSeq = 0;
const nextItemId = () => `bi_${Date.now().toString(36)}_${(_buriedItemSeq++).toString(36)}_${Math.floor(Math.random() * 1296).toString(36)}`;

// 층이 깊을수록 상위 등급 가중치 상승
function tierWeightAt(tier, floor) {
  if (tier.weight <= 0) return 0; // legend 등급 — 일반 풀 절대 제외 (1.117.0 유출 픽스)
  const depth = Math.max(0, (floor || 1) - 1);
  const rankIdx = BURIED_TIERS.indexOf(tier);
  return Math.max(0.5, tier.weight * (1 + rankIdx * depth * 0.09) - (rankIdx === 0 ? depth * 2.6 : 0));
}

// 장비 1개 생성.
// opts: { slot, classId, floor, tier(강제), luck(등급 가중 보정), powerMult(1.121.0 — 깊이 위력 배율) }
export function rollBuriedItem({ slot, classId, floor = 1, tier = null, luck = 0, powerMult = 1 } = {}) {
  const slotId = slot || pick(BURIED_SLOT_IDS);
  const pool = slotPool(slotId);
  const candidates = BURIED_SKILL_LIST.filter(s => s.slot === pool && canClassUseSkill(classId, s));
  if (candidates.length === 0) return null;
  const skill = pick(candidates);
  const t = tier ? getBuriedTier(tier)
    : weightedPick(BURIED_TIERS, (x) => tierWeightAt(x, (floor || 1) + luck));

  // 1.113.0 — 장비 레벨(floor) 체계.
  //   기본 스탯: 레벨당 +14% × 랜덤 굴림. 일반 장비 굴림 폭 0.75~1.20 (더 좋은 굴림 사냥 동기),
  //   전설(legend)은 **고정 굴림 1.0** — 유니크는 레벨 배율만 다르다 (PM 결정)
  const floorMult = (1 + Math.max(0, (floor || 1) - 1) * 0.14) * Math.max(1, powerMult || 1);
  const roll = t.id === 'legend' ? 1 : (0.75 + Math.random() * 0.45);
  const base = SLOT_BASE[pool] || {};
  const stats = {};
  for (const [k, v] of Object.entries(base)) {
    const val = Math.round(v * t.mult * floorMult * roll);
    if (val > 0) stats[k] = val;
  }
  // 무기·장신구는 스킬이 참조하는 능력치 쪽만 남겨 낭비 방지
  if (skill.stat === 'int' && stats.atk) { stats.mag = Math.max(stats.mag || 0, stats.atk); delete stats.atk; }
  if ((skill.stat === 'str' || skill.stat === 'dex') && stats.mag) { stats.atk = Math.max(stats.atk || 0, stats.mag); delete stats.mag; }

  // 1.113.0 — 랜덤 옵션도 장비 레벨 배율 적용 → 고층 낡은 장비가 저층 유물급을 역전할 수 있다.
  //   확률형(crit·dodge)·치명 피해는 폭주 방지 상한 ×2.2, 나머지는 기본 스탯과 같은 배율.
  //   전설은 옵션 값도 고정 굴림(중앙값)
  // 확률형 옵션(crit·dodge 등)은 powerMult 미적용 — 확률이 위력 배율로 폭주하면 안 된다
  const optPool = [...BURIED_OPTIONS];
  const options = [];
  const pctMult = Math.min(2.2, 1 + Math.max(0, (floor || 1) - 1) * 0.05);
  for (let i = 0; i < t.opts && optPool.length > 0; i++) {
    const o = optPool.splice(Math.floor(Math.random() * optPool.length), 1)[0];
    const baseVal = t.id === 'legend' ? Math.round((o.min + o.max) / 2) : rnd(o.min, o.max);
    const scaled = Math.max(1, Math.round(baseVal * (o.pct ? pctMult : floorMult)));  // floorMult에 powerMult 포함
    options.push({ key: o.key, name: o.name, pct: !!o.pct, affix: o.affix, value: scaled });
  }
  const affix = options.length > 0 ? options[0].affix : null;
  // 1.146.0 — ᚱ 랜덤 소켓 (PM 지시): 등급이 높을수록 소켓이 많다. 소켓 수만큼 룬 각인 가능
  const SOCKET_RANGE = { worn: [0, 1], fine: [0, 1], rare: [1, 2], epic: [1, 2], relic: [1, 3], legend: [2, 3] };
  const [sMin, sMax] = SOCKET_RANGE[t.id] || [0, 1];
  const sockets = rnd(sMin, sMax);
  return {
    id: nextItemId(),
    slot: slotId, pool, tier: t.id, skillId: skill.id,
    name: `${t.name} ${affix ? affix + ' ' : ''}${skill.gear}`,
    stats, options, plus: 0, floor: floor || 1, sockets, runes: [],
  };
}

// 장비의 최종 스탯 (기본 + 옵션 + 강화)
export function buriedItemStats(item) {
  if (!item) return {};
  const out = {};
  for (const [k, v] of Object.entries(item.stats || {})) out[k] = v;
  for (const o of item.options || []) out[o.key] = (out[o.key] || 0) + o.value;
  return out;
}

// 분해 가치 (무덤 먼지) — 1.117.0~ 장비 레벨도 반영 (심층 장비 정산이 의미를 갖도록)
export function buriedDustValue(item) {
  if (!item) return 0;
  const raw = getBuriedTier(item.tier).dust + Math.floor((item.floor || 1) / 3);
  return Math.max(1, Math.round(raw * (BURIED_TUNING.dustEarnMult || 1)));
}

// =========================================================
// 7. 캐릭터 — 생성 / 파생 스탯 / 레벨
// =========================================================
export const buriedExpToNext = (lv) => 32 + lv * 20;

export function createBuriedChar(classId, legacy = { items: [], gold: 0 }, dungeonId = 'labyrinth', contracts = [], partsFx = {}, startFloor = 1, depthTraits = [], raceId = null, keystones = [], originId = null) {
  const cls = getBuriedClass(classId);
  if (!cls) return null;
  const race = getBuriedRace(raceId);
  const origin = getBuriedOrigin(originId); // 1.131.0 — 출신 (3축)
  const equipped = {};
  for (const s of BURIED_SLOT_IDS) equipped[s] = null;
  // 1.114.0 체크포인트 — 100층 단위 재출발. 걸음수는 층 파리티(1방/층).
  // 1.121.0 — 장비 레벨 = 마물 레벨 (레벨 환산 폐지, Lv.1532 사태 픽스),
  // 깊이 압력은 buriedGearPower **위력 배율**로 스탯에만 반영 — 드랍·상점과 같은 저울
  const fromFloor = Math.max(1, startFloor || 1);
  const startSteps = fromFloor - 1;
  const startGearLv = fromFloor > 1 ? buriedMonsterLevel({ dungeonId, steps: startSteps, contracts }) : 1;
  const startPower = fromFloor > 1 ? buriedGearPower(getBuriedDungeon(dungeonId), fromFloor) : 1;

  // 시작 장비 — 1층 시작: 무기+방어구 낡은 2종 (BB: 맨몸 시작 방지) / 체크포인트: 빈 슬롯 전부 낡은 장비
  const startSlots = fromFloor > 1 ? BURIED_SLOT_IDS : ['weapon', 'armor'];
  for (const s of startSlots) {
    if (equipped[s]) continue;
    const it = rollBuriedItem({ slot: s, classId, floor: startGearLv, tier: 'worn', powerMult: startPower });
    if (it) equipped[s] = it;
  }

  const char = {
    classId, lv: 1, exp: 0,
    raceId: race?.id || null, // 1.122.0 — 종족 축 (BB2)
    originId: origin?.id || null, // 1.131.0 — 출신 축 (BB2, 종족 화면 통합)
    stats: Object.fromEntries(Object.entries(cls.stats).map(([k, v]) =>
      [k, Math.max(1, v + (race?.statMods?.[k] || 0) + (origin?.statMods?.[k] || 0))])),
    gold: 80 + (legacy.gold || 0) + (origin?.startGold || 0),
    equipped,
    pendingLoot: [], // 1.113.0 — 획득 즉시 [교체/버리기] 판단 대기열
    runes: [],       // 1.123.0 — ᚱ 룬 주머니 (각인 전 보관)
    keystones: (keystones || []).slice(0, BURIED_KEYSTONE_MAX), // 1.128.0 — ⚓ 쐐기석 (생성 시 구움)
    // 1.104.0 — 던전 선택 / 걸음수 기반 마물 레벨 / 스킬 레벨 / 방·층 효과
    dungeonId,
    contracts: (contracts || []).slice(0, BURIED_CONTRACT_CARRY),
    partsFx: partsFx || {},  // 1.112.0 — 연구실 부품 효과 (생성 시점에 구움, 소급 없음)
    depthTraits: depthTraits || [], // 1.116.0 — 심층 특성 (150층 해금분, 생성 시 구움)
    floor: fromFloor, steps: startSteps, room: null, roomEffect: null, floorEffect: null, offers: null, roomDone: false,
    skillLevels: {},
    potions: 2,
    kills: 0, startedAt: Date.now(),
  };
  // 시작 장비의 스킬 등록 — 같은 스킬이 중복 지급되면 정상 획득 경로처럼 레벨이 오른다 (1.117.0)
  for (const s of BURIED_SLOT_IDS) {
    const it = equipped[s];
    if (it?.skillId) char.skillLevels[it.skillId] = Math.min(BURIED_SKILL_MAX_LV, (char.skillLevels[it.skillId] || 0) + 1);
  }
  // 보급 계약 (1.129.0) — 지참한 supply 계약의 시작 지급을 적용
  let out = char;
  for (const cid of out.contracts) {
    const sup = getBuriedContract(cid)?.supply;
    if (!sup) continue;
    if (sup.potions) out = { ...out, potions: (out.potions || 0) + sup.potions };
    if (sup.gold) out = { ...out, gold: (out.gold || 0) + sup.gold };
    if (sup.rune) {
      const runeId = rollBuriedRuneIn(sup.rune[0], sup.rune[1]);
      if (runeId) out = { ...out, runes: [...(out.runes || []), runeId] };
    }
    if (sup.item) {
      const it = rollBuriedItem({ slot: null, classId, floor: startGearLv, tier: sup.item, powerMult: startPower });
      if (it) out = addBuriedItemToChar(out, it).char;
    }
    if (sup.skillLv) {
      for (let i = 0; i < sup.skillLv; i++) {
        const ids = buriedEquippedSkills(out).map(x => x.skill.id).filter(id => (out.skillLevels?.[id] || 1) < BURIED_SKILL_MAX_LV);
        if (ids.length > 0) out = raiseBuriedSkill(out, pick(ids)).char;
      }
    }
  }
  out.hp = buriedDerived(out).maxHp;
  return out;
}

// 1.114.0 — 체크포인트 층 목록. 1.120.0 — 100층 수문장을 **격파**(F+1층 도달)해야 그 관문이 열리고,
// 재출발은 관문 너머(F+1층)부터 시작한다 (수문장 앞 리스폰 데드락 방지)
export const BURIED_CHECKPOINT_UNIT = 100;
export function buriedCheckpointFloors(deepestFloor) {
  const out = [];
  for (let f = BURIED_CHECKPOINT_UNIT; f + 1 <= (deepestFloor || 0); f += BURIED_CHECKPOINT_UNIT) out.push(f);
  return out;
}

// 파생 스탯 — 장비·레벨·스탯·특성 전부 합산
// 1.104.0~ barrier(보호막)·chase(추격 피해) 추가 — 원작의 핵심 2축
export function buriedDerived(char) {
  if (!char) return { maxHp: 1, maxSp: 1, atk: 1, mag: 1, fin: 1, def: 0, crit: 0, critDmg: 60, dodge: 0, spRegen: 12, barrier: 0, chase: 0, healPct: 0, drainPct: 0, stats: { str: 0, dex: 0, int: 0, vit: 0 } };
  const noAcc = buriedKeystoneFx(char).noAcc; // ⚓ 공허의 쐐기 (1.128.0) — 장신구 2슬롯 무효
  const gear = {};
  for (const s of BURIED_SLOT_IDS) {
    if (noAcc && (s === 'acc1' || s === 'acc2')) continue;
    const st = buriedItemStats(char.equipped?.[s]);
    for (const [k, v] of Object.entries(st)) gear[k] = (gear[k] || 0) + v;
  }
  const st = {
    str: (char.stats?.str || 0) + (gear.str || 0),
    dex: (char.stats?.dex || 0) + (gear.dex || 0),
    int: (char.stats?.int || 0) + (gear.int || 0),
    vit: (char.stats?.vit || 0) + (gear.vit || 0),
  };
  const lv = char.lv || 1;
  // 특성(최대 3개)의 스탯 보정 — 전투 화면은 여기 결과만 읽는다
  const tf = aggregateBuriedTraits(char);
  // 마의 계약 (1.111.0) — 지참 계약 2개의 fx
  const cf = aggregateBuriedContracts(char);
  // 연구실 부품 (1.112.0) — 생성 시점에 구워진 fx
  const pf = char.partsFx || {};
  // 종족 (1.122.0) — 특성과 같은 어휘의 fx
  const rf = buriedRaceFx(char);
  // 전설무구 (1.127.0) — 선언형 유니크 fx (fx 없는 구 유니크는 빈 객체)
  const uf = buriedUniqueFx(char);
  // 1.133.0 — 전설무구 % 개편: barrierHpPct(최대 HP 비례 보호막)가 maxHp를 참조하므로 먼저 계산
  // 1.113.0 — 레벨당 HP+18 폐지 (성장은 100% 장비)
  const maxHp = Math.max(1, Math.round((140 + st.vit * 11 + (gear.hp || 0) + (tf.hp || 0) + (pf.hp || 0) + (rf.hp || 0) + (uf.hp || 0)) * (tf.hpMult || 1) * (rf.hpMult || 1) * (uf.hpMult || 1) * (1 + (cf.hpPct || 0) / 100) * (1 - Math.min(50, char.curseHpLossPct || 0) / 100)));
  // 1.148.0 — 🔷보호막·고정 가산 유니크를 파생 스탯에 편입 (PM 지적: 정보창에 안 보여 장비 비교가 불가능했다).
  // [u107] 물리·기교 += 최대 HP 8% / [u111] 마법 += 보호막 30% — 전에는 전투 화면에서만 더해졌다.
  // ⚠ 이 두 값은 % 보정(physPct/magPct) **밖**의 고정 가산이다 — 곱해지지 않는다.
  const barrierVal = Math.round(((gear.barrier || 0) + (tf.barrier || 0) + (pf.barrier || 0) + (rf.barrier || 0) + (uf.barrier || 0) + maxHp * (uf.barrierHpPct || 0) / 100) * (1 + (cf.barrierPct || 0) / 100));
  const uids = buriedUniqueIds(char);
  const physFlatAdd = uids.includes('u107') ? Math.round(maxHp * BURIED_RING_HP_PCT / 100) : 0;
  const magFlatAdd = uids.includes('u111') ? Math.round(barrierVal * 0.3) : 0;
  return {
    stats: st,
    traitFx: tf,
    maxHp,
    physFlatAdd, magFlatAdd, // 데미지 공식 설명·출처 표시용
    maxSp:   Math.round((38 + st.int * 1.3 + (gear.sp || 0) + (tf.sp || 0) + (rf.sp || 0) + (uf.sp || 0)) * (uf.spMult || 1)),
    atk:     Math.round((10 + st.str * 1.6 + (gear.atk || 0) + (pf.atk || 0)) * (1 + ((tf.physPct || 0) + (cf.physPct || 0) + (rf.physPct || 0) + (uf.physPct || 0)) / 100)) + physFlatAdd,
    fin:     Math.round((10 + st.dex * 1.6 + (gear.atk || 0) + (pf.atk || 0)) * (1 + ((tf.physPct || 0) + (cf.physPct || 0) + (rf.physPct || 0) + (uf.physPct || 0)) / 100)) + physFlatAdd,
    mag:     Math.round((10 + st.int * 1.6 + (gear.mag || 0) + (pf.mag || 0)) * (1 + ((tf.magPct || 0) + (cf.magPct || 0) + (rf.magPct || 0) + (uf.magPct || 0)) / 100)) + magFlatAdd,
    def:     Math.round(4 + st.vit * 0.9 + (gear.def || 0) + (pf.def || 0) + (uf.def || 0) + (rf.def || 0)),
    crit:    Math.round(5 + st.dex * 0.6 + (gear.crit || 0) + (tf.crit || 0) + (cf.crit || 0) + (pf.crit || 0) + (rf.crit || 0) + (uf.crit || 0)),
    critDmg: 60 + (gear.critDmg || 0),
    dodge:   Math.min(45, Math.round(3 + st.dex * 0.4 + (gear.dodge || 0) + (tf.dodge || 0) + (cf.dodge || 0) + (pf.dodge || 0) + (rf.dodge || 0) + (uf.dodge || 0))),
    // 1.118.0 — 패시브 회복 9+int/8 → 3+int/12 (PM: SP가 무의미). 이제 SP의 주 엔진은
    // 기본 공격(+14)·마력 흡수·집중이고, 패시브·장비 spRegen은 보조가 된다
    spRegen: Math.round(3 + st.int / 12 + (gear.spRegen || 0) + (pf.spRegen || 0) + (uf.spRegen || 0)),
    barrier: barrierVal,
    chase:   Math.round((gear.chase || 0) + (tf.chase || 0) + (pf.chase || 0) + (uf.chase || 0)),
    healPct: (tf.healPct || 0) + (cf.healPct || 0) + (pf.healPct || 0) + (rf.healPct || 0) + (uf.healPct || 0),
    drainPct: (tf.drainPct || 0) + (cf.drainPct || 0) + (pf.drainPct || 0) + (rf.drainPct || 0) + (uf.drainPct || 0),
  };
}

// 장착 중인 6슬롯의 스킬 목록 (빈 슬롯은 제외)
export function buriedEquippedSkills(char) {
  if (!char) return [];
  const noAcc = buriedKeystoneFx(char).noAcc; // ⚓ 공허의 쐐기 — 장신구 스킬도 봉인
  return BURIED_SLOT_IDS
    .filter(s => !(noAcc && (s === 'acc1' || s === 'acc2')))
    .map(s => ({ slot: s, item: char.equipped?.[s] || null }))
    .filter(x => x.item && BURIED_SKILLS[x.item.skillId])
    .map(x => ({ slot: x.slot, item: x.item, skill: BURIED_SKILLS[x.item.skillId] }));
}

// 경험치 적용 — 1.113.0 PM 결정: 레벨업 보상은 **HP 전액 회복뿐** (스탯 3p 폐지).
// 성장은 100% 장비 — 레벨은 기록·회복 리듬용 지표로만 남는다.
export function grantBuriedExp(char, amount) {
  let c = { ...char, exp: (char.exp || 0) + amount };
  const gained = [];
  while (c.exp >= buriedExpToNext(c.lv)) {
    c.exp -= buriedExpToNext(c.lv);
    c.lv += 1;
    gained.push(c.lv);
  }
  if (gained.length > 0) c.hp = buriedDerived(c).maxHp;
  return { char: c, levels: gained };
}

// =========================================================
// 8. 적 12종 — 스탯·행동은 전용, 일러스트만 기존 에셋 재사용
// =========================================================
// img: { key, chapter } → getEnemyImageSrc(key, {chapter}, 'combat')
// actions: { name, power(%), kind:'attack'|'defend'|'debuff', apply, self, heavy, weight }
export const BURIED_ENEMIES = {
  graverobber: {
    key: 'graverobber', name: '무덤 도굴꾼', img: { key: 'goblin', chapter: 1 }, color: '#7a9a5e',
    desc: '관을 뒤지다 무덤에 삼켜진 자.', tier: 'normal', minFloor: 1, maxFloor: 3,
    hp: 118, atk: 16, def: 3, exp: 22, gold: [24, 44],
    actions: [
      { name: '녹슨 단검', power: 100, kind: 'attack', weight: 3 },
      { name: '모래 뿌리기', power: 55, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
      { name: '웅크리기', kind: 'defend', self: [{ s: 'guard', n: 2 }], weight: 1 },
    ],
  },
  cryptHound: {
    key: 'cryptHound', name: '납골당 사냥개', img: { key: 'shadowWolf', chapter: 2 }, color: '#5c4a8c',
    desc: '시체 냄새를 쫓는 굶주린 짐승.', tier: 'normal', minFloor: 1, maxFloor: 4,
    hp: 145, atk: 19, def: 3, exp: 28, gold: [28, 50],
    actions: [
      { name: '물어뜯기', power: 105, kind: 'attack', apply: [{ s: 'bleed', n: 2, p: 60 }], weight: 3 },
      { name: '도약 강타', power: 145, kind: 'attack', heavy: true, weight: 2 },
    ],
  },
  rotSpider: {
    key: 'rotSpider', name: '부패 거미', img: { key: 'corruptSpider', chapter: 2 }, color: '#7a9a5e',
    desc: '독낭이 터질 듯 부푼 무덤의 청소부.', tier: 'normal', minFloor: 2, maxFloor: 5,
    hp: 170, atk: 18, def: 5, exp: 34, gold: [30, 56],
    actions: [
      { name: '독니', power: 88, kind: 'attack', apply: [{ s: 'poison', n: 3, p: 100 }], weight: 3 },
      { name: '거미줄', power: 40, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 100 }], weight: 2 },
      { name: '외피 경화', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  tombRaider: {
    key: 'tombRaider', name: '무덤 약탈자', img: { key: 'tundraRaider', chapter: 1 }, color: '#8b6f4d',
    desc: '먼저 들어와 나가지 못한 인간.', tier: 'normal', minFloor: 3, maxFloor: 6,
    hp: 215, atk: 24, def: 7, exp: 46, gold: [40, 72],
    actions: [
      { name: '도끼질', power: 108, kind: 'attack', weight: 3 },
      { name: '광란의 연타', power: 62, kind: 'attack', hits: 2, weight: 2 },
      { name: '투구 깨기', power: 120, kind: 'attack', apply: [{ s: 'shatter', n: 3, p: 100 }], heavy: true, weight: 2 },
    ],
  },
  graveWraith: {
    key: 'graveWraith', name: '묘지 망령', img: { key: 'wraith', chapter: 1 }, color: '#7ba3c4',
    desc: '이름을 잃고 저주만 남은 잔재.', tier: 'normal', minFloor: 4, maxFloor: 7,
    hp: 200, atk: 27, def: 5, exp: 58, gold: [46, 84],
    actions: [
      { name: '저주의 손길', power: 92, kind: 'attack', apply: [{ s: 'curse', n: 2, p: 100 }], weight: 3 },
      { name: '영혼 잠식', power: 78, kind: 'attack', drain: 50, weight: 2 },
      { name: '통곡', power: 30, kind: 'attack', apply: [{ s: 'silence', n: 1, p: 70 }], weight: 1 },
    ],
  },
  fallenRanger: {
    key: 'fallenRanger', name: '타락한 사수', img: { key: 'fallenElf', chapter: 2 }, color: '#7a9a5e',
    desc: '무덤을 지키다 무덤이 된 궁수.', tier: 'normal', minFloor: 4, maxFloor: 8,
    hp: 215, atk: 30, def: 6, exp: 66, gold: [50, 92],
    actions: [
      { name: '연사', power: 58, kind: 'attack', hits: 3, weight: 3 },
      { name: '독화살', power: 82, kind: 'attack', apply: [{ s: 'poison', n: 4, p: 100 }], weight: 2 },
      { name: '조준', kind: 'defend', self: [{ s: 'rage', n: 3 }], weight: 1 },
    ],
  },
  rottedSpirit: {
    key: 'rottedSpirit', name: '썩은 정령', img: { key: 'forestSpirit', chapter: 2 }, color: '#7a9a5e',
    desc: '무덤의 양분을 먹고 뒤틀린 정령.', tier: 'normal', minFloor: 5, maxFloor: 9,
    hp: 250, atk: 33, def: 8, exp: 78, gold: [56, 100],
    actions: [
      { name: '부패의 포자', power: 76, kind: 'attack', apply: [{ s: 'poison', n: 3, p: 100 }, { s: 'weaken', n: 2, p: 100 }], weight: 3 },
      { name: '뿌리 창', power: 128, kind: 'attack', heavy: true, weight: 2 },
      { name: '수액 흡수', kind: 'defend', self: [{ s: 'regen', n: 4 }], weight: 1 },
    ],
  },
  frostHound: {
    key: 'frostHound', name: '서리 사냥개', img: { key: 'iceWolf', chapter: 1 }, color: '#7ba3c4',
    desc: '얼어붙은 관을 지키는 파수꾼.', tier: 'normal', minFloor: 6, maxFloor: 9,
    hp: 275, atk: 37, def: 9, exp: 90, gold: [62, 112],
    actions: [
      { name: '서리 송곳니', power: 112, kind: 'attack', apply: [{ s: 'bind', n: 1, p: 60 }], weight: 3 },
      { name: '한기 폭발', power: 140, kind: 'attack', heavy: true, apply: [{ s: 'weaken', n: 3, p: 100 }], weight: 2 },
    ],
  },
  // ===== 1.130.0 — BB2 몬스터 시트 이식 20종 (일러 재사용 + 내성 프로필) =====
  // 공용 6종
  tombSlime: {
    key: 'tombSlime', name: '무덤 슬라임', img: { key: 'champ_forest_husk', chapter: 'forest_1' }, color: '#7a9a5e',
    desc: '삼킨 것을 천천히 녹인다. 뭉툭한 것은 잘 안 통한다.', tier: 'normal', minFloor: 2, maxFloor: 6,
    hp: 140, atk: 18, def: 3, exp: 34, gold: [26, 52], startBarrier: 60, physTakenPct: -25, magTakenPct: 25,
    actions: [
      { name: '산성 점액', power: 96, kind: 'attack', apply: [{ s: 'shatter', n: 1, p: 70 }], weight: 3 },
      { name: '삼키기', power: 118, kind: 'attack', weight: 2 },
    ],
  },
  ancientSoldier: {
    key: 'ancientSoldier', name: '고대 병사', img: { key: 'tundraRaider', chapter: 1 }, color: '#9b8975',
    desc: '수천 년을 선 채로 죽었다. 첫 합이 가장 단단하다.', tier: 'normal', minFloor: 1, maxFloor: 4,
    hp: 150, atk: 17, def: 5, exp: 28, gold: [22, 44], fullGuardPct: 40,
    actions: [
      { name: '녹슨 창격', power: 108, kind: 'attack', weight: 3 },
      { name: '방진', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  boneWalker: {
    key: 'boneWalker', name: '백골 보행자', img: { key: 'wraith', chapter: 1 }, color: '#c9c4b8',
    desc: '뼈에는 찌르기가 통하지 않는다 — 마법이 답이다.', tier: 'normal', minFloor: 2, maxFloor: 6,
    hp: 165, atk: 20, def: 4, exp: 36, gold: [28, 54], physTakenPct: -30, magTakenPct: 30,
    actions: [
      { name: '뼈칼 베기', power: 105, kind: 'attack', apply: [{ s: 'bleed', n: 1, p: 60 }], weight: 3 },
      { name: '재조립', kind: 'defend', self: [{ s: 'regen', n: 3 }], weight: 1 },
    ],
  },
  gargoyleWatch: {
    key: 'gargoyleWatch', name: '가고일 감시자', img: { key: 'brokenGolem', chapter: 3 }, color: '#8b8378',
    desc: '온전할 때는 석상이다 — 깨져야 피가 돈다.', tier: 'normal', minFloor: 4, maxFloor: 8,
    hp: 210, atk: 25, def: 9, exp: 54, gold: [40, 76], fullGuardPct: 60,
    actions: [
      { name: '석화 발톱', power: 112, kind: 'attack', apply: [{ s: 'bind', n: 1, p: 50 }], weight: 3 },
      { name: '급강하', power: 138, kind: 'attack', heavy: true, weight: 2 },
    ],
  },
  wailingBanshee: {
    key: 'wailingBanshee', name: '통곡하는 원혼', img: { key: 'wraith', chapter: 1 }, color: '#7ba3c4',
    desc: '몸이 없다 — 칼은 헛돌고, 울음은 저주가 된다.', tier: 'normal', minFloor: 3, maxFloor: 8,
    hp: 90, atk: 24, def: 2, exp: 48, gold: [34, 66], startBarrier: 150, physTakenPct: -50, magTakenPct: 35,
    actions: [
      { name: '통곡', power: 66, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }, { s: 'curse', n: 1, p: 50 }], weight: 3 },
      { name: '한기의 손길', power: 118, kind: 'attack', weight: 2 },
    ],
  },
  mandragora: {
    key: 'mandragora', name: '만드라고라', img: { key: 'forestSpirit', chapter: 2 }, color: '#7a9a5e',
    desc: '비명이 정신을 흔든다. 주문은 뿌리에 스며 사라진다.', tier: 'normal', minFloor: 2, maxFloor: 6,
    hp: 155, atk: 18, def: 4, exp: 34, gold: [26, 52], magTakenPct: -30,
    actions: [
      { name: '찢어지는 비명', power: 72, kind: 'attack', apply: [{ s: 'confuse', n: 1, p: 60 }], weight: 3 },
      { name: '뿌리 후려치기', power: 112, kind: 'attack', weight: 2 },
    ],
  },
  graveMimic: {
    key: 'graveMimic', name: '무덤 미믹', img: { key: 'champ_frost_imp', chapter: 'frost_1' }, color: '#e8b04a',
    desc: '보물인 척하는 이빨. 배 속에 삼킨 골드가 가득하다.', tier: 'elite', minFloor: 3, maxFloor: 9,
    hp: 330, atk: 38, def: 10, exp: 150, gold: [320, 520],
    actions: [
      { name: '기습 물기', power: 142, kind: 'attack', heavy: true, weight: 3 },
      { name: '동전 뱉기', power: 92, kind: 'attack', hits: 2, weight: 2 },
    ],
  },
  // 미궁 전용 3종
  runeSentinel: {
    key: 'runeSentinel', name: '룬 파수병', img: { key: 'brokenGolem', chapter: 3 }, color: '#7ba3c4',
    desc: '봉인 룬이 도는 동안은 흠집도 나지 않는다.', tier: 'normal', minFloor: 2, maxFloor: 7, dungeons: ['labyrinth'],
    hp: 180, atk: 21, def: 7, exp: 40, gold: [30, 58], fullGuardPct: 50,
    actions: [
      { name: '룬 절단', power: 110, kind: 'attack', weight: 3 },
      { name: '경계 태세', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  sandWisp: {
    key: 'sandWisp', name: '모래 위습', img: { key: 'oblivionSealer', chapter: 3 }, color: '#d4a574',
    desc: '시간의 모래가 뭉친 불꽃 — 스치면 늙는다.', tier: 'normal', minFloor: 4, maxFloor: 9, dungeons: ['labyrinth'],
    hp: 160, atk: 26, def: 3, exp: 52, gold: [38, 70], physTakenPct: -40, magTakenPct: 40,
    actions: [
      { name: '모래 불꽃', power: 98, kind: 'attack', apply: [{ s: 'aging', n: 2, p: 70 }], weight: 3 },
      { name: '시간 흩뿌리기', power: 126, kind: 'attack', weight: 2 },
    ],
  },
  vaultKeeper: {
    key: 'vaultKeeper', name: '금고지기', img: { key: 'ancientPriest', chapter: 3 }, color: '#e8b04a',
    desc: '신전의 보물을 지키다 보물이 된 자.', tier: 'elite', minFloor: 5, maxFloor: 10, dungeons: ['labyrinth'],
    hp: 350, atk: 39, def: 13, exp: 170, gold: [260, 430], startBarrier: 200, fullGuardPct: 30,
    actions: [
      { name: '봉인구 강타', power: 128, kind: 'attack', apply: [{ s: 'silence', n: 1, p: 50 }], weight: 3 },
      { name: '금고 폐쇄', kind: 'defend', self: [{ s: 'guard', n: 4 }], weight: 1 },
    ],
  },
  // 폐허 전용 3종
  sludgeMass: {
    key: 'sludgeMass', name: '오니 덩어리', img: { key: 'champ_forest_husk', chapter: 'forest_1' }, color: '#5e7a3e',
    desc: '베어도 흘러내려 다시 붙는다.', tier: 'normal', minFloor: 3, maxFloor: 8, dungeons: ['ruins'],
    hp: 200, atk: 22, def: 4, exp: 46, gold: [34, 64], physTakenPct: -35, magTakenPct: 20,
    actions: [
      { name: '부패 점액', power: 92, kind: 'attack', apply: [{ s: 'poison', n: 2, p: 80 }], weight: 3 },
      { name: '재응집', kind: 'defend', self: [{ s: 'regen', n: 4 }], weight: 1 },
    ],
  },
  plagueRats: {
    key: 'plagueRats', name: '역병 쥐떼', img: { key: 'corruptSpider', chapter: 2 }, color: '#8b6f4d',
    desc: '한 마리가 아니다. 물릴수록 병이 깊어진다.', tier: 'normal', minFloor: 2, maxFloor: 6, dungeons: ['ruins'],
    hp: 150, atk: 16, def: 2, exp: 34, gold: [24, 50], dodge: 12,
    actions: [
      { name: '떼 물기', power: 52, kind: 'attack', hits: 3, apply: [{ s: 'poison', n: 1, p: 60 }], weight: 3 },
      { name: '흩어지기', kind: 'defend', self: [{ s: 'evade', n: 3 }], weight: 1 },
    ],
  },
  drownedKnight: {
    key: 'drownedKnight', name: '익사한 기사', img: { key: 'tundraRaider', chapter: 1 }, color: '#5c7a8c',
    desc: '물에 잠긴 갑주는 더 무거워졌을 뿐, 뚫리지 않는다.', tier: 'elite', minFloor: 4, maxFloor: 10, dungeons: ['ruins'],
    hp: 360, atk: 40, def: 14, exp: 165, gold: [120, 200], startBarrier: 150, fullGuardPct: 40,
    actions: [
      { name: '침수된 대검', power: 130, kind: 'attack', weight: 3 },
      { name: '수장의 일격', power: 168, kind: 'attack', heavy: true, apply: [{ s: 'bind', n: 1, p: 40 }], weight: 2 },
    ],
  },
  // 나락 전용 3종
  hellHornet: {
    key: 'hellHornet', name: '지옥 말벌', img: { key: 'riftBreach', chapter: 4 }, color: '#c4453d',
    desc: '침이 스치기만 해도 피가 마른다. 잡으려면 먼저 맞혀야 한다.', tier: 'normal', minFloor: 2, maxFloor: 6, dungeons: ['chasm'],
    hp: 145, atk: 21, def: 2, exp: 40, gold: [28, 56], dodge: 18,
    actions: [
      { name: '2연침', power: 62, kind: 'attack', hits: 2, apply: [{ s: 'bleed', n: 1, p: 70 }], weight: 3 },
      { name: '급습', power: 120, kind: 'attack', weight: 2 },
    ],
  },
  bladetooth: {
    key: 'bladetooth', name: '칼이빨', img: { key: 'wrathDemon', chapter: 4 }, color: '#8b1f1f',
    desc: '이빨 하나하나가 단검이다 — 급소만 노린다.', tier: 'normal', minFloor: 4, maxFloor: 9, dungeons: ['chasm'],
    hp: 200, atk: 27, def: 5, exp: 54, gold: [38, 72], crit: 22,
    actions: [
      { name: '급소 물기', power: 108, kind: 'attack', apply: [{ s: 'bleed', n: 2, p: 80 }], weight: 3 },
      { name: '살점 뜯기', power: 132, kind: 'attack', drain: 30, weight: 2 },
    ],
  },
  voidMaw: {
    key: 'voidMaw', name: '공허의 아가리', img: { key: 'demonApostle', chapter: 4 }, color: '#3d1f28',
    desc: '마법을 먹고 자란 입 — 주문이 절반은 삼켜진다.', tier: 'elite', minFloor: 5, maxFloor: 10, dungeons: ['chasm'],
    hp: 370, atk: 43, def: 11, exp: 178, gold: [130, 210], magTakenPct: -25,
    actions: [
      { name: '집어삼키기', power: 126, kind: 'attack', drain: 40, weight: 3 },
      { name: '허무의 포효', power: 96, kind: 'attack', apply: [{ s: 'silence', n: 1, p: 60 }], weight: 2 },
    ],
  },
  // 심연 전용 3종
  frostbiteShade: {
    key: 'frostbiteShade', name: '동상 그림자', img: { key: 'champ_frost_lurker', chapter: 'frost_2' }, color: '#7ba3c4',
    desc: '닿은 자리부터 얼어붙는다. 그림자엔 칼이 안 박힌다.', tier: 'normal', minFloor: 2, maxFloor: 7, dungeons: ['abyss'],
    hp: 175, atk: 23, def: 4, exp: 44, gold: [32, 60], physTakenPct: -30,
    actions: [
      { name: '얼어붙는 접촉', power: 100, kind: 'attack', apply: [{ s: 'bind', n: 1, p: 60 }], weight: 3 },
      { name: '그림자 스침', power: 122, kind: 'attack', weight: 2 },
    ],
  },
  mirrorPhantom: {
    key: 'mirrorPhantom', name: '거울 환영', img: { key: 'champ_frost_seer', chapter: 'frost_2' }, color: '#c48bd4',
    desc: '어느 쪽이 진짜인지 칼이 먼저 헤맨다.', tier: 'normal', minFloor: 4, maxFloor: 9, dungeons: ['abyss'],
    hp: 185, atk: 27, def: 4, exp: 56, gold: [40, 74], dodge: 22, magTakenPct: -30,
    actions: [
      { name: '환영 찌르기', power: 106, kind: 'attack', weight: 3 },
      { name: '상 흩뜨리기', kind: 'defend', self: [{ s: 'evade', n: 3 }], weight: 1 },
    ],
  },
  abyssalTitan: {
    key: 'abyssalTitan', name: '심연의 거신', img: { key: 'champ_frost_brute', chapter: 'frost_3' }, color: '#2f3a4d',
    desc: '어둠을 눌러 굳힌 몸 — 온전한 동안은 산이다.', tier: 'elite', minFloor: 6, maxFloor: 10, dungeons: ['abyss'],
    hp: 420, atk: 45, def: 15, exp: 195, gold: [140, 230], fullGuardPct: 50,
    actions: [
      { name: '짓뭉개기', power: 134, kind: 'attack', apply: [{ s: 'shatter', n: 2, p: 100 }], weight: 3 },
      { name: '심연 낙하', power: 176, kind: 'attack', heavy: true, apply: [{ s: 'stun', n: 1, p: 35 }], weight: 2 },
    ],
  },

  // ===== 강적 =====
  boneGiant: {
    key: 'boneGiant', name: '무덤지기 거인', img: { key: 'frostGiant', chapter: 1 }, color: '#8b8378',
    desc: '수천 구의 뼈로 짜맞춰진 문지기.', tier: 'elite', minFloor: 3, maxFloor: 9,
    hp: 340, atk: 36, def: 12, exp: 150, gold: [110, 190],
    actions: [
      { name: '분쇄', power: 132, kind: 'attack', apply: [{ s: 'shatter', n: 3, p: 100 }], weight: 3 },
      { name: '대지 강타', power: 175, kind: 'attack', heavy: true, apply: [{ s: 'stun', n: 1, p: 30 }], weight: 2 },
      { name: '뼈 갑주', kind: 'defend', self: [{ s: 'guard', n: 4 }], weight: 1 },
    ],
  },
  twilightHusk: {
    key: 'twilightHusk', name: '황혼의 잔재', img: { key: 'twilightChild', chapter: 2 }, color: '#5c4a8c',
    desc: '무덤 깊은 곳에서 태어난 어린 그림자.', tier: 'elite', minFloor: 5, maxFloor: 9,
    hp: 375, atk: 41, def: 11, exp: 185, gold: [130, 220],
    actions: [
      { name: '황혼의 갈퀴', power: 108, kind: 'attack', hits: 2, weight: 3 },
      { name: '기억 삼키기', power: 70, kind: 'attack', apply: [{ s: 'silence', n: 2, p: 100 }, { s: 'curse', n: 2, p: 100 }], weight: 2 },
      { name: '그림자 잠행', kind: 'defend', self: [{ s: 'evade', n: 4 }, { s: 'regen', n: 3 }], weight: 1 },
    ],
  },
  // ===== 보스 =====
  sealWitch: {
    key: 'sealWitch', name: '봉인의 마녀', img: { key: 'iceMage', chapter: 1 }, color: '#7ba3c4',
    desc: '무덤 5층을 봉인한 자. 열쇠는 그녀의 심장이다.',
    tier: 'boss', minFloor: 5, maxFloor: 5,
    hp: 360, atk: 31, def: 11, exp: 320, gold: [220, 320],
    actions: [
      { name: '빙결의 창', power: 118, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 100 }], weight: 3 },
      { name: '봉인 각인', power: 62, kind: 'attack', apply: [{ s: 'silence', n: 2, p: 100 }, { s: 'confuse', n: 1, p: 60 }], weight: 2 },
      { name: '서리 폭풍', power: 92, kind: 'attack', hits: 3, heavy: true, weight: 2 },
      { name: '얼음 결계', kind: 'defend', self: [{ s: 'guard', n: 5 }, { s: 'regen', n: 4 }], weight: 1 },
    ],
  },
  tombTyrant: {
    key: 'tombTyrant', name: '무덤의 폭군', img: { key: 'forestTyrant', chapter: 2 }, color: '#8b1f1f',
    desc: '이 무덤에 묻힌 모든 것의 주인. 유산은 그의 손에 있다.',
    tier: 'boss', minFloor: 10, maxFloor: 10,
    hp: 620, atk: 44, def: 15, exp: 900, gold: [520, 780],
    actions: [
      { name: '폭군의 낫', power: 128, kind: 'attack', apply: [{ s: 'bleed', n: 4, p: 100 }], weight: 3 },
      { name: '무덤의 손아귀', power: 96, kind: 'attack', drain: 60, apply: [{ s: 'curse', n: 2, p: 100 }, { s: 'aging', n: 1, p: 70 }], weight: 2 },
      { name: '종언의 일격', power: 205, kind: 'attack', heavy: true, apply: [{ s: 'shatter', n: 4, p: 100 }], weight: 2 },
      { name: '망자의 군세', kind: 'defend', self: [{ s: 'guard', n: 4 }, { s: 'rage', n: 4 }], weight: 1 },
    ],
  },

  // =========================================================
  // 1.120.0 — 적 풀 대확장 (PM 지시: 모든 일러 풀 활용). 24종 신규.
  // dungeons 필드가 있으면 그 던전에서만 등장 (없으면 전 던전 공용) — 던전 정체성 강화
  // =========================================================
  // ── 공용 (전 던전) ──
  paleWraith: {
    key: 'paleWraith', name: '창백한 원혼', img: { key: 'wraith', chapter: 1 }, color: '#9db8cc',
    desc: '무덤의 한기에 얼어붙은 원혼.', tier: 'normal', minFloor: 2, maxFloor: 6,
    hp: 150, atk: 18, def: 2, exp: 30, gold: [26, 48],
    actions: [
      { name: '원한의 손길', power: 96, kind: 'attack', apply: [{ s: 'curse', n: 1, p: 70 }], weight: 3 },
      { name: '한기 서린 절규', power: 60, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
    ],
  },
  frostShaman: {
    key: 'frostShaman', name: '언 뼈의 주술사', img: { key: 'iceMage', chapter: 1 }, color: '#7ba3c4',
    desc: '제 뼈를 얼려 지팡이로 쓰는 망자.', tier: 'normal', minFloor: 3, maxFloor: 7,
    hp: 165, atk: 21, def: 3, exp: 38, gold: [30, 56],
    actions: [
      { name: '얼음 파편', power: 88, kind: 'attack', hits: 2, weight: 3 },
      { name: '동결 주문', power: 70, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 80 }], weight: 2 },
      { name: '얼음 장막', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  duskChild: {
    key: 'duskChild', name: '땅거미 아이', img: { key: 'twilightChild', chapter: 2 }, color: '#5c4a8c',
    desc: '해가 지는 쪽만 바라보는 작은 그림자.', tier: 'normal', minFloor: 4, maxFloor: 8,
    hp: 185, atk: 22, def: 4, exp: 44, gold: [34, 62],
    actions: [
      { name: '그림자 할큄', power: 92, kind: 'attack', hits: 2, weight: 3 },
      { name: '어리광', power: 55, kind: 'attack', apply: [{ s: 'confuse', n: 1, p: 70 }], weight: 2 },
    ],
  },
  paleElf: {
    key: 'paleElf', name: '창백한 사수', img: { key: 'fallenElf', chapter: 2 }, color: '#7a9a5e',
    desc: '활시위를 놓지 못한 채 굳어버린 궁수.', tier: 'normal', minFloor: 5, maxFloor: 9,
    hp: 200, atk: 25, def: 5, exp: 52, gold: [40, 70],
    actions: [
      { name: '연속 사격', power: 74, kind: 'attack', hits: 3, weight: 3 },
      { name: '심장 조준', power: 150, kind: 'attack', heavy: true, weight: 2 },
    ],
  },
  // ── 🌀 미궁 전용 (석조·봉인) ──
  stoneServant: {
    key: 'stoneServant', name: '석조 시종', img: { key: 'brokenGolem', chapter: 3 }, color: '#8b8378',
    desc: '부서진 채로도 명령을 기다리는 골렘.', tier: 'normal', minFloor: 1, maxFloor: 5, dungeons: ['labyrinth'],
    hp: 175, atk: 17, def: 7, exp: 32, gold: [26, 48],
    actions: [
      { name: '돌주먹', power: 105, kind: 'attack', weight: 3 },
      { name: '균열 강타', power: 88, kind: 'attack', apply: [{ s: 'shatter', n: 2, p: 100 }], weight: 2 },
      { name: '석화 자세', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  sealPriest: {
    key: 'sealPriest', name: '봉인 사제', img: { key: 'ancientPriest', chapter: 3 }, color: '#c9a86a',
    desc: '미궁의 문을 잠근 기도문을 아직 외운다.', tier: 'normal', minFloor: 3, maxFloor: 8, dungeons: ['labyrinth'],
    hp: 170, atk: 22, def: 4, exp: 42, gold: [34, 60],
    actions: [
      { name: '심판의 빛', power: 98, kind: 'attack', weight: 3 },
      { name: '봉인 기도', power: 58, kind: 'attack', apply: [{ s: 'silence', n: 2, p: 80 }], weight: 2 },
      { name: '축성', kind: 'defend', self: [{ s: 'regen', n: 4 }], weight: 1 },
    ],
  },
  hourglassKeeper: {
    key: 'hourglassKeeper', name: '모래시계지기', img: { key: 'timeKeeper', chapter: 3 }, color: '#b8a3d4',
    desc: '미궁의 시간을 세는 자. 셈이 끝나면 늙는다.', tier: 'normal', minFloor: 5, maxFloor: 10, dungeons: ['labyrinth'],
    hp: 205, atk: 26, def: 5, exp: 56, gold: [42, 74],
    actions: [
      { name: '시간 베기', power: 102, kind: 'attack', apply: [{ s: 'aging', n: 1, p: 80 }], weight: 3 },
      { name: '모래 폭풍', power: 78, kind: 'attack', hits: 2, apply: [{ s: 'weaken', n: 2, p: 60 }], weight: 2 },
    ],
  },
  oblivionWarden: {
    key: 'oblivionWarden', name: '망각의 간수', img: { key: 'oblivionSealer', chapter: 3 }, color: '#5c4a8c',
    desc: '길을 묻는 자의 기억부터 지운다.', tier: 'elite', minFloor: 4, maxFloor: 10, dungeons: ['labyrinth'],
    hp: 360, atk: 38, def: 13, exp: 168, gold: [120, 200],
    actions: [
      { name: '망각의 인장', power: 96, kind: 'attack', apply: [{ s: 'silence', n: 2, p: 100 }, { s: 'curse', n: 2, p: 70 }], weight: 3 },
      { name: '기억 붕괴', power: 168, kind: 'attack', heavy: true, apply: [{ s: 'confuse', n: 2, p: 60 }], weight: 2 },
      { name: '봉인 결계', kind: 'defend', self: [{ s: 'guard', n: 4 }, { s: 'wall', n: 1 }], weight: 1 },
    ],
  },
  // ── 🌊 폐허 전용 (물·부패·숲) ──
  bogHusk: {
    key: 'bogHusk', name: '늪지 껍데기', img: { key: 'champ_forest_husk', chapter: 'forest_1' }, color: '#7a9a5e',
    desc: '물을 머금어 퉁퉁 불은 망자.', tier: 'normal', minFloor: 1, maxFloor: 5, dungeons: ['ruins'],
    hp: 160, atk: 17, def: 4, exp: 30, gold: [24, 46],
    actions: [
      { name: '썩은 주먹', power: 100, kind: 'attack', apply: [{ s: 'poison', n: 2, p: 70 }], weight: 3 },
      { name: '오물 뱉기', power: 62, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
    ],
  },
  thornCreeper: {
    key: 'thornCreeper', name: '가시 넝쿨', img: { key: 'champ_forest_thornling', chapter: 'forest_1' }, color: '#5e7a3e',
    desc: '폐허의 물길을 따라 자란 육식 덩굴.', tier: 'normal', minFloor: 2, maxFloor: 6, dungeons: ['ruins'],
    hp: 180, atk: 19, def: 5, exp: 36, gold: [28, 52],
    actions: [
      { name: '가시 채찍', power: 84, kind: 'attack', hits: 2, apply: [{ s: 'bleed', n: 2, p: 70 }], weight: 3 },
      { name: '휘감기', power: 55, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 90 }], weight: 2 },
    ],
  },
  mireLeopard: {
    key: 'mireLeopard', name: '수렁 표범', img: { key: 'champ_forest_leopard', chapter: 'forest_2' }, color: '#8b6f4d',
    desc: '흙탕물 속에서 숨을 참고 기다린다.', tier: 'normal', minFloor: 4, maxFloor: 8, dungeons: ['ruins'],
    hp: 195, atk: 26, def: 4, exp: 48, gold: [36, 66],
    actions: [
      { name: '기습 도약', power: 118, kind: 'attack', weight: 3 },
      { name: '물어 찢기', power: 82, kind: 'attack', hits: 2, apply: [{ s: 'bleed', n: 3, p: 80 }], weight: 2 },
    ],
  },
  rotDryad: {
    key: 'rotDryad', name: '부패한 드라이어드', img: { key: 'champ_forest_dryad', chapter: 'forest_2' }, color: '#7a9a5e',
    desc: '나무는 죽었지만 정령은 놓아주지 않았다.', tier: 'normal', minFloor: 5, maxFloor: 10, dungeons: ['ruins'],
    hp: 215, atk: 27, def: 6, exp: 58, gold: [42, 76],
    actions: [
      { name: '부패의 포자', power: 88, kind: 'attack', apply: [{ s: 'poison', n: 3, p: 100 }], weight: 3 },
      { name: '수액 흡수', power: 76, kind: 'attack', drain: 55, weight: 2 },
      { name: '재생', kind: 'defend', self: [{ s: 'regen', n: 5 }], weight: 1 },
    ],
  },
  fenTiger: {
    key: 'fenTiger', name: '늪의 맹호', img: { key: 'champ_forest_tiger', chapter: 'forest_3' }, color: '#c47a3d',
    desc: '폐허의 물가를 다스리던 짐승의 왕.', tier: 'elite', minFloor: 3, maxFloor: 9, dungeons: ['ruins'],
    hp: 350, atk: 40, def: 11, exp: 160, gold: [115, 195],
    actions: [
      { name: '연속 발톱', power: 92, kind: 'attack', hits: 3, weight: 3 },
      { name: '포효 도약', power: 185, kind: 'attack', heavy: true, apply: [{ s: 'stun', n: 1, p: 25 }], weight: 2 },
    ],
  },
  plagueWitch: {
    key: 'plagueWitch', name: '역병의 마녀', img: { key: 'champ_forest_witch', chapter: 'forest_3' }, color: '#a8556e',
    desc: '물에 잠긴 도시에 병을 풀어놓은 장본인.', tier: 'elite', minFloor: 5, maxFloor: 10, dungeons: ['ruins'],
    hp: 380, atk: 42, def: 12, exp: 180, gold: [130, 215],
    actions: [
      { name: '역병 살포', power: 84, kind: 'attack', apply: [{ s: 'poison', n: 4, p: 100 }, { s: 'weaken', n: 2, p: 70 }], weight: 3 },
      { name: '곪은 저주', power: 66, kind: 'attack', apply: [{ s: 'curse', n: 3, p: 100 }], weight: 2 },
      { name: '병독 안개', kind: 'defend', self: [{ s: 'evade', n: 3 }, { s: 'regen', n: 4 }], weight: 1 },
    ],
  },
  // ── 🕳 나락 전용 (균열·마족) ──
  riftScout: {
    key: 'riftScout', name: '균열 정찰병', img: { key: 'demonScout', chapter: 4 }, color: '#c4453d',
    desc: '나락의 틈새로 먼저 내려온 마족.', tier: 'normal', minFloor: 1, maxFloor: 5, dungeons: ['chasm'],
    hp: 165, atk: 19, def: 4, exp: 34, gold: [28, 50],
    actions: [
      { name: '균열 단검', power: 102, kind: 'attack', weight: 3 },
      { name: '표식 새기기', power: 58, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
    ],
  },
  crevasseImp: {
    key: 'crevasseImp', name: '틈새 임프', img: { key: 'riftBreach', chapter: 4 }, color: '#8b1f5c',
    desc: '균열 자체가 의지를 갖고 걸어다닌다.', tier: 'normal', minFloor: 3, maxFloor: 7, dungeons: ['chasm'],
    hp: 185, atk: 24, def: 4, exp: 44, gold: [34, 62],
    actions: [
      { name: '공간 절단', power: 96, kind: 'attack', pierce: true, weight: 3 },
      { name: '중력 왜곡', power: 60, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 80 }], weight: 2 },
    ],
  },
  abyssApostle: {
    key: 'abyssApostle', name: '나락의 사도', img: { key: 'demonApostle', chapter: 4 }, color: '#7d2b4a',
    desc: '떨어지는 자들을 축복하는 검은 사제.', tier: 'normal', minFloor: 5, maxFloor: 10, dungeons: ['chasm'],
    hp: 210, atk: 28, def: 6, exp: 58, gold: [44, 78],
    actions: [
      { name: '타락의 설교', power: 90, kind: 'attack', apply: [{ s: 'curse', n: 2, p: 100 }], weight: 3 },
      { name: '피의 성찬', power: 80, kind: 'attack', drain: 60, weight: 2 },
      { name: '검은 축도', kind: 'defend', self: [{ s: 'rage', n: 3 }], weight: 1 },
    ],
  },
  wrathSpawn: {
    key: 'wrathSpawn', name: '분노의 파생체', img: { key: 'wrathDemon', chapter: 4 }, color: '#c4453d',
    desc: '분노만 남아 몸을 얻은 것.', tier: 'elite', minFloor: 3, maxFloor: 10, dungeons: ['chasm'],
    hp: 355, atk: 42, def: 11, exp: 165, gold: [118, 198],
    actions: [
      { name: '광란 난타', power: 78, kind: 'attack', hits: 3, weight: 3 },
      { name: '분노 폭발', power: 195, kind: 'attack', heavy: true, weight: 2 },
      { name: '피의 격노', kind: 'defend', self: [{ s: 'rage', n: 4 }], weight: 1 },
    ],
  },
  // ── 🌑 심연 전용 (어둠·서리) ──
  gloomImp: {
    key: 'gloomImp', name: '어스름 임프', img: { key: 'champ_frost_imp', chapter: 'frost_1' }, color: '#7ba3c4',
    desc: '어둠 속에서 킬킬대는 작은 것.', tier: 'normal', minFloor: 1, maxFloor: 5, dungeons: ['abyss'],
    hp: 170, atk: 20, def: 4, exp: 36, gold: [30, 54],
    actions: [
      { name: '얼음 발톱', power: 98, kind: 'attack', weight: 3 },
      { name: '낄낄대기', power: 52, kind: 'attack', apply: [{ s: 'confuse', n: 1, p: 60 }], weight: 2 },
    ],
  },
  nightLurker: {
    key: 'nightLurker', name: '밤의 잠복자', img: { key: 'champ_frost_lurker', chapter: 'frost_2' }, color: '#5c4a8c',
    desc: '보이지 않는 곳에서만 숨 쉬는 짐승.', tier: 'normal', minFloor: 3, maxFloor: 7, dungeons: ['abyss'],
    hp: 190, atk: 26, def: 5, exp: 48, gold: [36, 66],
    actions: [
      { name: '암습', power: 122, kind: 'attack', weight: 3 },
      { name: '어둠 속으로', kind: 'defend', self: [{ s: 'evade', n: 3 }], weight: 1 },
    ],
  },
  frostSeer: {
    key: 'frostSeer', name: '서리 예언자', img: { key: 'champ_frost_seer', chapter: 'frost_2' }, color: '#9db8cc',
    desc: '모든 죽음을 미리 봤다고 속삭인다.', tier: 'normal', minFloor: 5, maxFloor: 10, dungeons: ['abyss'],
    hp: 215, atk: 29, def: 6, exp: 60, gold: [46, 80],
    actions: [
      { name: '예언 — 동결', power: 92, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 80 }], weight: 3 },
      { name: '예언 — 침묵', power: 66, kind: 'attack', apply: [{ s: 'silence', n: 2, p: 70 }], weight: 2 },
      { name: '운명 왜곡', kind: 'defend', self: [{ s: 'guard', n: 3 }, { s: 'regen', n: 3 }], weight: 1 },
    ],
  },
  voidBrute: {
    key: 'voidBrute', name: '공허의 만행자', img: { key: 'champ_frost_brute', chapter: 'frost_3' }, color: '#4a5a7a',
    desc: '어둠을 삼켜 몸집을 불린 거인.', tier: 'elite', minFloor: 3, maxFloor: 9, dungeons: ['abyss'],
    hp: 370, atk: 41, def: 14, exp: 172, gold: [122, 205],
    actions: [
      { name: '어둠 후려치기', power: 128, kind: 'attack', apply: [{ s: 'shatter', n: 3, p: 100 }], weight: 3 },
      { name: '침묵의 압살', power: 190, kind: 'attack', heavy: true, apply: [{ s: 'silence', n: 1, p: 50 }], weight: 2 },
      { name: '공허 갑주', kind: 'defend', self: [{ s: 'guard', n: 4 }, { s: 'wall', n: 1 }], weight: 1 },
    ],
  },
  frostRevenant: {
    key: 'frostRevenant', name: '서리 귀환자', img: { key: 'champ_frost_revenant', chapter: 'frost_3' }, color: '#7ba3c4',
    desc: '심연에서 얼어 죽고, 얼어붙은 채 되돌아왔다.', tier: 'elite', minFloor: 5, maxFloor: 10, dungeons: ['abyss'],
    hp: 390, atk: 44, def: 12, exp: 188, gold: [135, 225],
    actions: [
      { name: '원귀의 낫', power: 104, kind: 'attack', hits: 2, apply: [{ s: 'bleed', n: 2, p: 70 }], weight: 3 },
      { name: '동토의 절규', power: 88, kind: 'attack', apply: [{ s: 'weaken', n: 3, p: 100 }, { s: 'aging', n: 1, p: 50 }], weight: 2 },
      { name: '망자의 인내', kind: 'defend', self: [{ s: 'regen', n: 5 }, { s: 'guard', n: 3 }], weight: 1 },
    ],
  },

  // =========================================================
  // 1.139.0 — BB2 몬스터 시트 2차 이식 (+23 = 80종). 일러 재사용, 내성 축 적극 활용.
  // 공용 11 + 던전 전용 12 (미궁·폐허·나락·심연 각 3)
  // =========================================================
  slimeMass: {
    key: 'slimeMass', name: '고름 슬라임', img: { key: 'champ_forest_husk', chapter: 'forest_1' }, color: '#7a9a5e',
    desc: '무른 몸이 마법만은 튕겨낸다.', tier: 'normal', minFloor: 1, maxFloor: 4,
    hp: 105, atk: 15, def: 2, exp: 20, gold: [20, 40], startBarrier: 40, magTakenPct: -20, physTakenPct: 15,
    actions: [
      { name: '산성 점액', power: 92, kind: 'attack', apply: [{ s: 'weaken', n: 1, p: 70 }], weight: 3 },
      { name: '재응집', kind: 'defend', self: [{ s: 'regen', n: 3 }], weight: 1 },
    ],
  },
  graveBandit: {
    key: 'graveBandit', name: '무덤가 야도', img: { key: 'tundraRaider', chapter: 1 }, color: '#8b6f4d',
    desc: '산 자도 죽은 자도 가리지 않고 턴다. 주머니가 두둑하다.', tier: 'normal', minFloor: 2, maxFloor: 6,
    hp: 150, atk: 20, def: 4, exp: 30, gold: [60, 110],
    actions: [
      { name: '쌍단검', power: 62, kind: 'attack', hits: 2, weight: 3 },
      { name: '급소 노리기', power: 120, kind: 'attack', apply: [{ s: 'bleed', n: 2, p: 60 }], weight: 2 },
    ],
  },
  wyvernFledgling: {
    key: 'wyvernFledgling', name: '어린 와이번', img: { key: 'champ_frost_lurker', chapter: 'frost_2' }, color: '#7ba3c4',
    desc: '아직 어리다는 게 위안이 되지 않는 덩치.', tier: 'normal', minFloor: 4, maxFloor: 9, dodge: 12,
    hp: 185, atk: 24, def: 4, exp: 46, gold: [34, 62],
    actions: [
      { name: '물어채기', power: 104, kind: 'attack', weight: 3 },
      { name: '급강하', power: 158, kind: 'attack', heavy: true, weight: 2 },
    ],
  },
  livingStatue: {
    key: 'livingStatue', name: '살아있는 석상', img: { key: 'brokenGolem', chapter: 3 }, color: '#9b8975',
    desc: '돌은 칼을 모른다 — 마법만이 틈을 낸다.', tier: 'normal', minFloor: 5, maxFloor: 10,
    hp: 230, atk: 24, def: 10, exp: 52, gold: [36, 68], physTakenPct: -40, magTakenPct: 30, fullGuardPct: 40,
    actions: [
      { name: '석권(石拳)', power: 118, kind: 'attack', weight: 3 },
      { name: '정지', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  shadowLurker: {
    key: 'shadowLurker', name: '그림자 잠복자', img: { key: 'wraith', chapter: 1 }, color: '#5c4a8c',
    desc: '베려는 순간 이미 등 뒤에 있다.', tier: 'normal', minFloor: 6, maxFloor: 12, dodge: 20, crit: 15,
    hp: 175, atk: 27, def: 3, exp: 58, gold: [40, 74],
    actions: [
      { name: '그림자 찌르기', power: 112, kind: 'attack', weight: 3 },
      { name: '암습', power: 150, kind: 'attack', apply: [{ s: 'bleed', n: 2, p: 70 }], heavy: true, weight: 2 },
    ],
  },
  manticore: {
    key: 'manticore', name: '만티코어', img: { key: 'champ_forest_leopard', chapter: 'forest_2' }, color: '#c4453d',
    desc: '사자 몸에 전갈 꼬리 — 독침이 비처럼 쏟아진다.', tier: 'elite', minFloor: 6, maxFloor: 12,
    hp: 380, atk: 38, def: 10, exp: 165, gold: [130, 220],
    actions: [
      { name: '독침 세례', power: 70, kind: 'attack', hits: 2, apply: [{ s: 'poison', n: 2, p: 100 }], weight: 3 },
      { name: '사자 발톱', power: 132, kind: 'attack', weight: 2 },
      { name: '꼬리 강타', power: 165, kind: 'attack', heavy: true, weight: 1 },
    ],
  },
  vampireNoble: {
    key: 'vampireNoble', name: '흡혈 귀족', img: { key: 'twilightChild', chapter: 2 }, color: '#8b1f1f',
    desc: '핏기 없는 미소 — 상처 하나하나가 그의 만찬.', tier: 'elite', minFloor: 7, maxFloor: 14, magTakenPct: -20,
    hp: 360, atk: 40, def: 9, exp: 175, gold: [140, 230],
    actions: [
      { name: '흡혈', power: 110, kind: 'attack', drain: 60, weight: 3 },
      { name: '귀족의 명령', power: 55, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
      { name: '혈무(血霧)', kind: 'defend', self: [{ s: 'evade', n: 2 }], weight: 1 },
    ],
  },
  lichAcolyte: {
    key: 'lichAcolyte', name: '리치의 사도', img: { key: 'iceMage', chapter: 1 }, color: '#3d1f28',
    desc: '뼈만 남은 손이 죽음의 인장을 그린다.', tier: 'normal', minFloor: 8, maxFloor: 15,
    hp: 190, atk: 34, def: 3, exp: 74, gold: [50, 90], physTakenPct: 20, magTakenPct: -35,
    actions: [
      { name: '사령탄', power: 118, kind: 'attack', weight: 3 },
      { name: '죽음의 인장', power: 82, kind: 'attack', apply: [{ s: 'curse', n: 2, p: 80 }], weight: 2 },
    ],
  },
  cyclopsWarden: {
    key: 'cyclopsWarden', name: '외눈 간수', img: { key: 'frostGiant', chapter: 1 }, color: '#b8a678',
    desc: '눈은 하나, 몽둥이는 무덤 기둥.', tier: 'elite', minFloor: 8, maxFloor: 16,
    hp: 460, atk: 44, def: 12, exp: 190, gold: [150, 250],
    actions: [
      { name: '기둥 휘두르기', power: 120, kind: 'attack', weight: 3 },
      { name: '내려찍기', power: 190, kind: 'attack', apply: [{ s: 'stun', n: 1, p: 30 }], heavy: true, weight: 2 },
    ],
  },
  greaterDemon: {
    key: 'greaterDemon', name: '상급 마족', img: { key: 'wrathDemon', chapter: 4 }, color: '#4a1f5c',
    desc: '하급이 백 마리 모여도 이 하나를 못 이긴다.', tier: 'elite', minFloor: 10, maxFloor: 20, startBarrier: 180,
    hp: 420, atk: 45, def: 11, exp: 200, gold: [160, 260],
    actions: [
      { name: '마염 발톱', power: 112, kind: 'attack', apply: [{ s: 'burn', n: 2, p: 60 }], weight: 3 },
      { name: '군림의 포효', power: 60, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
      { name: '마계의 불', power: 172, kind: 'attack', heavy: true, weight: 2 },
    ],
  },
  hecaton: {
    key: 'hecaton', name: '백수(百手) 거인', img: { key: 'champ_frost_brute', chapter: 'frost_3' }, color: '#c9a86a',
    desc: '백 개의 손이 백 방향에서 날아든다.', tier: 'elite', minFloor: 12, maxFloor: 25,
    hp: 500, atk: 36, def: 13, exp: 230, gold: [180, 290],
    actions: [
      { name: '백수 난타', power: 48, kind: 'attack', hits: 3, weight: 3 },
      { name: '움켜쥐기', power: 96, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 80 }], weight: 2 },
    ],
  },
  // 미궁 전용 3종
  janusWarden: {
    key: 'janusWarden', name: '야누스 문지기', img: { key: 'timeKeeper', chapter: 3 }, color: '#e8b04a',
    desc: '앞 얼굴이 웃는 동안 뒷 얼굴이 벼른다.', tier: 'normal', minFloor: 5, maxFloor: 12, dungeons: ['labyrinth'],
    hp: 210, atk: 25, def: 7, exp: 54, gold: [38, 70], fullGuardPct: 40,
    actions: [
      { name: '이면 타격', power: 116, kind: 'attack', weight: 3 },
      { name: '문 닫기', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 2 },
    ],
  },
  ancientBishop: {
    key: 'ancientBishop', name: '고대 주교', img: { key: 'ancientPriest', chapter: 3 }, color: '#d4a574',
    desc: '봉인된 신에게 아직도 기도를 올린다.', tier: 'normal', minFloor: 6, maxFloor: 13, dungeons: ['labyrinth'], magTakenPct: -30,
    hp: 205, atk: 28, def: 5, exp: 60, gold: [42, 78],
    actions: [
      { name: '신성탄', power: 108, kind: 'attack', apply: [{ s: 'silence', n: 1, p: 40 }], weight: 3 },
      { name: '축성', kind: 'defend', self: [{ s: 'regen', n: 3 }, { s: 'guard', n: 2 }], weight: 1 },
    ],
  },
  ancientTorturer: {
    key: 'ancientTorturer', name: '고대 고문관', img: { key: 'oblivionSealer', chapter: 3 }, color: '#8b1f1f',
    desc: '천 년을 갈고닦은 고통의 기술.', tier: 'elite', minFloor: 8, maxFloor: 16, dungeons: ['labyrinth'],
    hp: 400, atk: 41, def: 10, exp: 185, gold: [150, 240],
    actions: [
      { name: '갈고리 채찍', power: 104, kind: 'attack', apply: [{ s: 'bleed', n: 3, p: 100 }], weight: 3 },
      { name: '결박', power: 66, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 100 }], weight: 2 },
      { name: '고문 기구', power: 168, kind: 'attack', heavy: true, weight: 1 },
    ],
  },
  // 폐허 전용 3종
  giantCrab: {
    key: 'giantCrab', name: '거대 게', img: { key: 'corruptSpider', chapter: 2 }, color: '#c4453d',
    desc: '집게가 갑주째 으스러뜨린다 — 껍데기는 칼을 비웃는다.', tier: 'normal', minFloor: 4, maxFloor: 10, dungeons: ['ruins'],
    hp: 240, atk: 22, def: 12, exp: 50, gold: [34, 66], physTakenPct: -45, magTakenPct: 35,
    actions: [
      { name: '집게 절단', power: 122, kind: 'attack', apply: [{ s: 'bleed', n: 2, p: 50 }], weight: 3 },
      { name: '웅크리기', kind: 'defend', self: [{ s: 'guard', n: 3 }], weight: 1 },
    ],
  },
  deepSeaPriest: {
    key: 'deepSeaPriest', name: '심해 사제', img: { key: 'fallenElf', chapter: 2 }, color: '#5c4a8c',
    desc: '가라앉은 신전에서 무언가를 불러 올린다.', tier: 'normal', minFloor: 6, maxFloor: 13, dungeons: ['ruins'], magTakenPct: -25,
    hp: 210, atk: 29, def: 4, exp: 62, gold: [44, 80],
    actions: [
      { name: '심해의 저주', power: 92, kind: 'attack', apply: [{ s: 'curse', n: 1, p: 80 }], weight: 3 },
      { name: '독수(毒水)', power: 76, kind: 'attack', apply: [{ s: 'poison', n: 3, p: 100 }], weight: 2 },
    ],
  },
  scyllaSpawn: {
    key: 'scyllaSpawn', name: '스킬라의 촉수', img: { key: 'forestTyrant', chapter: 2 }, color: '#5e7a3e',
    desc: '본체는 더 깊은 곳에 있다 — 이건 촉수 하나일 뿐.', tier: 'elite', minFloor: 9, maxFloor: 18, dungeons: ['ruins'],
    hp: 430, atk: 39, def: 9, exp: 195, gold: [155, 250],
    actions: [
      { name: '촉수 연타', power: 62, kind: 'attack', hits: 2, weight: 3 },
      { name: '휘감기', power: 88, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 100 }], weight: 2 },
      { name: '심연으로 끌기', power: 170, kind: 'attack', heavy: true, weight: 1 },
    ],
  },
  // 나락 전용 3종
  viperNest: {
    key: 'viperNest', name: '살무사 둥지', img: { key: 'champ_forest_thornling', chapter: 'forest_1' }, color: '#7a9a5e',
    desc: '둥지 전체가 한 마리처럼 문다.', tier: 'normal', minFloor: 5, maxFloor: 12, dungeons: ['chasm'],
    hp: 260, atk: 21, def: 3, exp: 56, gold: [38, 72],
    actions: [
      { name: '독니 세례', power: 58, kind: 'attack', hits: 2, apply: [{ s: 'poison', n: 2, p: 100 }], weight: 3 },
      { name: '똬리 틀기', kind: 'defend', self: [{ s: 'guard', n: 2 }], weight: 1 },
    ],
  },
  masterNinja: {
    key: 'masterNinja', name: '노련한 닌자', img: { key: 'demonScout', chapter: 4 }, color: '#3d1f28',
    desc: '나락에 몸을 숨긴 지 오래 — 칼끝만 빛난다.', tier: 'normal', minFloor: 7, maxFloor: 14, dungeons: ['chasm'], dodge: 25, crit: 20,
    hp: 185, atk: 30, def: 4, exp: 68, gold: [48, 86],
    actions: [
      { name: '수리검', power: 52, kind: 'attack', hits: 3, weight: 3 },
      { name: '일섬', power: 148, kind: 'attack', apply: [{ s: 'bleed', n: 2, p: 70 }], heavy: true, weight: 2 },
    ],
  },
  akaOni: {
    key: 'akaOni', name: '붉은 뿔귀신', img: { key: 'demonApostle', chapter: 4 }, color: '#c4453d',
    desc: '분노가 피부색이 된 귀신 — 맞을수록 세진다.', tier: 'elite', minFloor: 8, maxFloor: 16, dungeons: ['chasm'],
    hp: 440, atk: 42, def: 11, exp: 190, gold: [150, 245],
    actions: [
      { name: '철곤 휘두르기', power: 118, kind: 'attack', weight: 3 },
      { name: '귀신의 분노', kind: 'defend', self: [{ s: 'rage', n: 2 }], weight: 2 },
      { name: '뿔 들이받기', power: 184, kind: 'attack', heavy: true, weight: 1 },
    ],
  },
  // 심연 전용 3종
  succubusQueen: {
    key: 'succubusQueen', name: '몽마 여왕', img: { key: 'champ_forest_witch', chapter: 'forest_3' }, color: '#c48bd4',
    desc: '꿈결 같은 목소리 — 정신이 들면 이미 늦다.', tier: 'elite', minFloor: 10, maxFloor: 20, dungeons: ['abyss'],
    hp: 400, atk: 43, def: 8, exp: 210, gold: [170, 270],
    actions: [
      { name: '달콤한 속삭임', power: 66, kind: 'attack', apply: [{ s: 'confuse', n: 1, p: 60 }], weight: 3 },
      { name: '생기 흡수', power: 108, kind: 'attack', drain: 70, weight: 2 },
      { name: '악몽', power: 84, kind: 'attack', apply: [{ s: 'weaken', n: 2, p: 100 }], weight: 2 },
    ],
  },
  surtr: {
    key: 'surtr', name: '화염 거인 수르트', img: { key: 'riftBreach', chapter: 4 }, color: '#ff6b35',
    desc: '심연 밑바닥에도 꺼지지 않는 불이 있다.', tier: 'elite', minFloor: 12, maxFloor: 24, dungeons: ['abyss'], physTakenPct: -20,
    hp: 480, atk: 46, def: 12, exp: 225, gold: [180, 290],
    actions: [
      { name: '화염검', power: 112, kind: 'attack', apply: [{ s: 'burn', n: 3, p: 100 }], weight: 3 },
      { name: '세계를 태우는 불', power: 186, kind: 'attack', apply: [{ s: 'burn', n: 2, p: 100 }], heavy: true, weight: 2 },
    ],
  },
  catoblepas: {
    key: 'catoblepas', name: '카토블레파스', img: { key: 'champ_frost_seer', chapter: 'frost_2' }, color: '#8b8378',
    desc: '고개를 드는 것만으로 시간이 썩는다 — 눈을 마주치지 마라.', tier: 'normal', minFloor: 8, maxFloor: 16, dungeons: ['abyss'],
    hp: 250, atk: 31, def: 6, exp: 72, gold: [50, 88],
    actions: [
      { name: '썩은 입김', power: 96, kind: 'attack', apply: [{ s: 'aging', n: 2, p: 80 }], weight: 3 },
      { name: '죽음의 시선', power: 78, kind: 'attack', apply: [{ s: 'curse', n: 1, p: 60 }], weight: 2 },
    ],
  },

  // =========================================================
  // 1.120.0 — 🚪 층계 수문장 (PM 지시: 100층 단위 초강력 플로어 보스, 재앙보다 훨씬 강하게)
  // 100·200·300…층을 지키며, 격파해야 그 너머 체크포인트가 열린다. 로테이션 3종.
  // =========================================================
  gateWraithKing: {
    key: 'gateWraithKing', name: '수문장 — 무형의 망령왕', img: { key: 'champ_frost_boss4', chapter: 'frost_4' }, color: '#9db8cc',
    desc: '백 층마다 하나씩, 문이 있다. 이것이 첫 번째 문지기다.',
    tier: 'boss', minFloor: 10, maxFloor: 10, guardian: true,
    hp: 1050, atk: 54, def: 20, exp: 2400, gold: [900, 1400],
    actions: [
      { name: '망령의 해일', power: 88, kind: 'attack', hits: 3, apply: [{ s: 'curse', n: 2, p: 100 }], weight: 3 },
      { name: '혼백 찢기', power: 132, kind: 'attack', pierce: true, apply: [{ s: 'silence', n: 2, p: 70 }], weight: 2 },
      { name: '왕의 종언', power: 235, kind: 'attack', heavy: true, apply: [{ s: 'stun', n: 1, p: 40 }], weight: 2 },
      { name: '무형화', kind: 'defend', self: [{ s: 'evade', n: 4 }, { s: 'wall', n: 1 }, { s: 'regen', n: 5 }], weight: 1 },
    ],
  },
  gateMaestro: {
    key: 'gateMaestro', name: '수문장 — 종막의 마에스트로', img: { key: 'champ_forest_boss4', chapter: 'forest_4' }, color: '#a8556e',
    desc: '두 번째 문지기. 그의 지휘가 끝나면 막이 내린다.',
    tier: 'boss', minFloor: 10, maxFloor: 10, guardian: true,
    hp: 1150, atk: 57, def: 22, exp: 3000, gold: [1000, 1600],
    actions: [
      { name: '광기의 서곡', power: 92, kind: 'attack', hits: 2, apply: [{ s: 'confuse', n: 2, p: 80 }], weight: 3 },
      { name: '부패의 간주곡', power: 84, kind: 'attack', apply: [{ s: 'poison', n: 4, p: 100 }, { s: 'bleed', n: 3, p: 100 }], weight: 2 },
      { name: '종막의 카덴차', power: 250, kind: 'attack', heavy: true, apply: [{ s: 'shatter', n: 5, p: 100 }], weight: 2 },
      { name: '지휘 — 재생', kind: 'defend', self: [{ s: 'regen', n: 6 }, { s: 'rage', n: 3 }, { s: 'wall', n: 1 }], weight: 1 },
    ],
  },
  gateNakzelion: {
    key: 'gateNakzelion', name: '수문장 — 낙젤리온', img: { key: 'nakzelionShadow', chapter: 4 }, color: '#4a1f5c',
    desc: '세 번째 문. 그림자가 아니라, 본체가 기다린다.',
    tier: 'boss', minFloor: 10, maxFloor: 10, guardian: true,
    hp: 1250, atk: 61, def: 24, exp: 4000, gold: [1200, 1900],
    actions: [
      { name: '심연 발톱', power: 96, kind: 'attack', hits: 3, apply: [{ s: 'bleed', n: 3, p: 100 }], weight: 3 },
      { name: '지옥의 응시', power: 90, kind: 'attack', apply: [{ s: 'curse', n: 3, p: 100 }, { s: 'aging', n: 2, p: 70 }], weight: 2 },
      { name: '멸절의 파도', power: 270, kind: 'attack', heavy: true, pierce: true, weight: 2 },
      { name: '어둠의 육신', kind: 'defend', self: [{ s: 'guard', n: 5 }, { s: 'wall', n: 2 }], weight: 1 },
    ],
  },
  // ===== 1.143.0 — 신규 수문장 2종 (400층 / 500층 최종 보스) =====
  gatePrimordial: {
    key: 'gatePrimordial', name: '수문장 — 태초의 포식자', img: { key: 'champ_frost_brute', chapter: 'frost_3' }, color: '#3d1f28',
    desc: '네 번째 문. 빛이 태어나기 전부터 굶주려 있었다.',
    tier: 'boss', minFloor: 10, maxFloor: 10, guardian: true,
    hp: 1420, atk: 67, def: 27, exp: 5200, gold: [1500, 2300], startBarrier: 300,
    actions: [
      { name: '태초의 아귀', power: 104, kind: 'attack', hits: 3, drain: 40, weight: 3 },
      { name: '어둠 삼키기', power: 88, kind: 'attack', apply: [{ s: 'weaken', n: 3, p: 100 }, { s: 'shatter', n: 2, p: 100 }], weight: 2 },
      { name: '포식', power: 290, kind: 'attack', heavy: true, drain: 60, weight: 2 },
      { name: '태고의 껍질', kind: 'defend', self: [{ s: 'guard', n: 5 }, { s: 'regen', n: 5 }], weight: 1 },
    ],
  },
  gateTombLord: {
    key: 'gateTombLord', name: '묘주(墓主) — 무덤 그 자체', img: { key: 'champ_forest_boss4', chapter: 'forest_4' }, color: '#e8b04a',
    desc: '다섯 번째 문이자 마지막 문. 무덤은 파인 것이 아니라, 스스로 자란 것이다.',
    tier: 'boss', minFloor: 10, maxFloor: 10, guardian: true,
    hp: 1680, atk: 74, def: 30, exp: 8000, gold: [2400, 3600], startBarrier: 500, fullGuardPct: 30,
    actions: [
      { name: '묘비 강타', power: 112, kind: 'attack', pierce: true, weight: 3 },
      { name: '망자의 손아귀', power: 84, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 100 }, { s: 'curse', n: 2, p: 100 }], weight: 2 },
      { name: '매장(埋葬)', power: 320, kind: 'attack', heavy: true, pierce: true, weight: 2 },
      { name: '무덤의 포옹', power: 96, kind: 'attack', drain: 80, apply: [{ s: 'aging', n: 3, p: 80 }], weight: 2 },
      { name: '대지가 곧 갑주', kind: 'defend', self: [{ s: 'guard', n: 6 }, { s: 'wall', n: 3 }], weight: 1 },
    ],
  },
};
export const BURIED_ENEMY_LIST = Object.values(BURIED_ENEMIES);
// 수문장 로테이션 — 100층 망령왕 → 200층 마에스트로 → 300층 낙젤리온 → 반복
// 1.143.0 — 수문장 5종 고정 배치 (PM 결정: 500층 엔드콘텐츠).
// 100=망령왕 / 200=마에스트로 / 300=낙젤리온 / 400=태초의 포식자 / 500=묘주(최종 보스).
// 600층 이후(정점 너머)는 묘주가 계속 지킨다 — buriedBossKeyAt이 clamp.
export const BURIED_GUARDIAN_KEYS = ['gateWraithKing', 'gateMaestro', 'gateNakzelion', 'gatePrimordial', 'gateTombLord'];

// 🕳 심층 대역 (1.143.0) — 100층 단위 테마. rewardPct는 그 대역 전투 골드·경험치 보너스.
export const BURIED_ZONES = [
  { id: 'surface',    from: 1,   to: 99,       name: '표층',        icon: '🪦', color: '#9b8975', rewardPct: 0,  desc: '무덤의 살갗 — 아직 빛의 기억이 남아 있다.' },
  { id: 'corridor',   from: 100, to: 199,      name: '망각의 회랑', icon: '🕯', color: '#7ba3c4', rewardPct: 10, desc: '이름을 잃은 자들이 걷는 긴 복도.' },
  { id: 'threshold',  from: 200, to: 299,      name: '명계의 문턱', icon: '⚱', color: '#5c4a8c', rewardPct: 20, desc: '산 자의 법이 여기서 끝난다.' },
  { id: 'primordial', from: 300, to: 399,      name: '태초의 어둠', icon: '🌑', color: '#3d1f28', rewardPct: 30, desc: '빛보다 먼저 있던 것이 아직 살아 있다.' },
  { id: 'root',       from: 400, to: 499,      name: '무덤의 근원', icon: '💀', color: '#c4453d', rewardPct: 40, desc: '모든 무덤이 여기서 자라났다 — 묘주가 기다린다.' },
  { id: 'beyond',     from: 500, to: Infinity, name: '정점 너머',   icon: '👑', color: '#e8b04a', rewardPct: 50, desc: '묘주조차 알지 못하는 깊이.' },
];
export const buriedZoneAt = (floor) => BURIED_ZONES.find(z => (floor || 1) >= z.from && (floor || 1) <= z.to) || BURIED_ZONES[0];

// 🗝 수문장의 인장 (1.143.0) — 관문(100~500층) 첫 격파마다 계정 영구 인장 1개 (PM 결정: 성장 반등축).
// 인장 1개당 전투 위력 +8% · 받는 피해 -4% (최대 5개 = +40% / -20%). 전투는 char.sigils로 읽는다.
export const BURIED_SIGILS = { dmgPct: 8, takenPct: 4, max: 5 };

// =========================================================
// 🕯 괴이(怪異) 사역 (1.144.0) — 괴력난신 원혼 설정 (PM 5차 승인, docs/pet-system-design.md)
// =========================================================
// 원혼형 적 26종을 「제령」해 부하로 사역한다. 조건: 적 HP 25% 이하 + 해당 등급 제령부 1장.
// 성공률 = 등급 기본치 + (25 − HP%) × 0.5%p. 실패: 부적 소진 + 턴 소모 + 적 [격노] 3 + 그 전투 제령 잠금.
// 제령부: 보스 처치 시 10% 고정 드랍(⚠️ 보상 버프 완전 무관) → 등급 배분 60/25/9/5/1.
//   보유 상한 초과분은 먼지로 분해. **런 한정** — 사망 시 전량 소멸.
// 한계돌파: 이번 런의 동행 괴이와 동일 개체를 다시 제령하면 돌파 (등급별 상한 1/2/3/4/5회).
//   규칙(PM): %형 수치는 %증감(돌파당 기본치의 +20%), 스택형(상태이상·방벽)은 스택 +1 — 버프·디버프 스택에 % 적용 금지.
export const BURIED_GHOST_RANKS = {
  red:    { id: 'red',    name: '적령', hanja: '赤靈', color: '#c4453d', dropShare: 60, cap: 10, baseTame: 45, breakMax: 1, cd: 4, dust: 20 },
  green:  { id: 'green',  name: '녹령', hanja: '綠靈', color: '#7a9a5e', dropShare: 25, cap: 5,  baseTame: 25, breakMax: 2, cd: 4, dust: 60 },
  cyan:   { id: 'cyan',   name: '청령', hanja: '靑靈', color: '#7ba3c4', dropShare: 9,  cap: 3,  baseTame: 12, breakMax: 3, cd: 3, dust: 150 },
  indigo: { id: 'indigo', name: '남령', hanja: '藍靈', color: '#5c4a8c', dropShare: 5,  cap: 2,  baseTame: 6,  breakMax: 4, cd: 3, dust: 400 },
  violet: { id: 'violet', name: '자령', hanja: '紫靈', color: '#c48bd4', dropShare: 1,  cap: 1,  baseTame: 2,  breakMax: 5, cd: 3, dust: 1000 },
};
export const BURIED_TALISMAN_DROP_PCT = 10; // 보스 처치 시 제령부 자체 드랍율 (버프 무관 고정)

// 괴이 26종 — enemyKey = 대응하는 기존 적 (일러 재사용). passive는 계약 fx 어휘(소비 지점 공짜).
// active: 내 턴 종료 시 자동 발동(적 행동보다 우선), 쿨은 등급 공통(rank.cd).
//   power {stat, pct}: 내 캐릭터 공격력 참조 타격 / apply·self: 상태이상 / healPct: 최대 HP % 회복 / barrier / drainPct: 타격 피해의 % 회복
const GH = (o) => o;
export const BURIED_GHOSTS = [
  // ── 적령 8 ──
  GH({ id: 'gh_banshee',  enemyKey: 'wailingBanshee', rank: 'red', name: '통곡하는 원혼', passive: { statusChance: 5 },  active: { apply: [{ s: 'weaken', n: 1 }] },  aDesc: '적 [약화] 1' }),
  GH({ id: 'gh_pale',     enemyKey: 'paleWraith',     rank: 'red', name: '창백한 원혼',   passive: { dodge: 3 },          active: { self: [{ s: 'evade', n: 1 }] },    aDesc: '자신 [잔영] 1' }),
  GH({ id: 'gh_wisp',     enemyKey: 'sandWisp',       rank: 'red', name: '모래 위습',     passive: { startSpPct: 10 },    active: { apply: [{ s: 'aging', n: 1 }] },   aDesc: '적 [노화] 1' }),
  GH({ id: 'gh_shade',    enemyKey: 'frostbiteShade', rank: 'red', name: '동상 그림자',   passive: { takenPct: -3 },      active: { self: [{ s: 'guard', n: 1 }] },    aDesc: '자신 [수호] 1' }),
  GH({ id: 'gh_wraith',   enemyKey: 'graveWraith',    rank: 'red', name: '묘지 망령',     passive: { physPct: 4 },        active: { power: { stat: 'str', pct: 15 } }, aDesc: '완력 15% 타격' }),
  GH({ id: 'gh_dusk',     enemyKey: 'duskChild',      rank: 'red', name: '땅거미 아이',   passive: { expPct: 8 },         active: { healPct: 3 },                      aDesc: 'HP 3% 회복' }),
  GH({ id: 'gh_mirror',   enemyKey: 'mirrorPhantom',  rank: 'red', name: '거울 환영',     passive: { crit: 3 },           active: { power: { stat: 'dex', pct: 15 } }, aDesc: '기교 15% 타격' }),
  GH({ id: 'gh_lurker',   enemyKey: 'shadowLurker',   rank: 'red', name: '그림자 잠복자', passive: { dropLuck: 1 },       active: { apply: [{ s: 'shatter', n: 1 }] }, aDesc: '적 [파쇄] 1' }),
  // ── 녹령 8 ──
  GH({ id: 'gh_rotted',   enemyKey: 'rottedSpirit',   rank: 'green', name: '썩은 정령',    passive: { statusChance: 10 }, active: { apply: [{ s: 'poison', n: 2 }] },  aDesc: '적 [중독] 2' }),
  GH({ id: 'gh_lich',     enemyKey: 'lichAcolyte',    rank: 'green', name: '리치의 사도',  passive: { magPct: 8 },        active: { power: { stat: 'int', pct: 25 } }, aDesc: '지혜 25% 타격' }),
  GH({ id: 'gh_night',    enemyKey: 'nightLurker',    rank: 'green', name: '밤의 잠복자',  passive: { crit: 5 },          active: { power: { stat: 'dex', pct: 25 }, apply: [{ s: 'bleed', n: 2 }] }, aDesc: '기교 25% 타격 + [출혈] 2' }),
  GH({ id: 'gh_priest',   enemyKey: 'sealPriest',     rank: 'green', name: '봉인 사제',    passive: { healPct: 12 },      active: { healPct: 5 },                      aDesc: 'HP 5% 회복' }),
  GH({ id: 'gh_husk',     enemyKey: 'twilightHusk',   rank: 'green', name: '황혼의 잔재',  passive: { takenPct: -5 },     active: { self: [{ s: 'guard', n: 2 }] },    aDesc: '자신 [수호] 2' }),
  GH({ id: 'gh_revenant', enemyKey: 'frostRevenant',  rank: 'green', name: '서리 귀환자',  passive: { physPct: 8 },       active: { apply: [{ s: 'bind', n: 1 }] },    aDesc: '적 [속박] 1' }),
  GH({ id: 'gh_drowned',  enemyKey: 'drownedKnight',  rank: 'green', name: '익사한 기사',  passive: { barrierPct: 15 },   active: { barrier: 15 },                     aDesc: '보호막 +15' }),
  GH({ id: 'gh_warden',   enemyKey: 'oblivionWarden', rank: 'green', name: '망각의 간수',  passive: { goldPct: 12 },      active: { apply: [{ s: 'silence', n: 1 }] }, aDesc: '적 [침묵] 1' }),
  // ── 청령 4 ──
  GH({ id: 'gh_succubus', enemyKey: 'succubusQueen',  rank: 'cyan', name: '몽마 여왕',     passive: { drainPct: 4 },      active: { apply: [{ s: 'confuse', n: 1 }] }, aDesc: '적 [혼란] 1' }),
  GH({ id: 'gh_plague',   enemyKey: 'plagueWitch',    rank: 'cyan', name: '역병의 마녀',   passive: { statusChance: 15 }, active: { apply: [{ s: 'poison', n: 3 }, { s: 'weaken', n: 1 }] }, aDesc: '적 [중독] 3 + [약화] 1' }),
  GH({ id: 'gh_sealw',    enemyKey: 'sealWitch',      rank: 'cyan', name: '봉인의 마녀',   passive: { magPct: 12 },       active: { power: { stat: 'int', pct: 40 }, apply: [{ s: 'shatter', n: 1 }] }, aDesc: '지혜 40% 타격 + [파쇄] 1' }),
  GH({ id: 'gh_cato',     enemyKey: 'catoblepas',     rank: 'cyan', name: '카토블레파스',  passive: { takenPct: -8 },     active: { apply: [{ s: 'aging', n: 2 }, { s: 'curse', n: 1 }] }, aDesc: '적 [노화] 2 + [저주] 1' }),
  // ── 남령 3 ──
  GH({ id: 'gh_tyrant',   enemyKey: 'tombTyrant',     rank: 'indigo', name: '무덤의 폭군',      passive: { physPct: 12, hpPct: 8 },  active: { power: { stat: 'str', pct: 40 }, apply: [{ s: 'shatter', n: 2 }] }, aDesc: '완력 40% 타격 + [파쇄] 2' }),
  GH({ id: 'gh_wking',    enemyKey: 'gateWraithKing', rank: 'indigo', name: '무형의 망령왕',    passive: { dodge: 8, crit: 5 },      active: { power: { stat: 'dex', pct: 40 }, self: [{ s: 'evade', n: 2 }] }, aDesc: '기교 40% 타격 + 자신 [잔영] 2' }),
  GH({ id: 'gh_maestro',  enemyKey: 'gateMaestro',    rank: 'indigo', name: '종막의 마에스트로', passive: { magPct: 10, startSpPct: 15 }, active: { power: { stat: 'int', pct: 40 }, self: [{ s: 'rage', n: 1 }] }, aDesc: '지혜 40% 타격 + 자신 [격노] 1' }),
  // ── 자령 3 (전설 포지션) ──
  GH({ id: 'gh_nakzel',   enemyKey: 'gateNakzelion',  rank: 'violet', name: '낙젤리온',        passive: { physPct: 12, magPct: 12, crit: 6 }, active: { power: { stat: 'int', pct: 50 }, apply: [{ s: 'bleed', n: 3 }] }, aDesc: '지혜 50% 타격 + [출혈] 3' }),
  GH({ id: 'gh_devourer', enemyKey: 'gatePrimordial', rank: 'violet', name: '태초의 포식자',    passive: { drainPct: 6, hpPct: 12 }, active: { power: { stat: 'str', pct: 50 }, drainPct: 50 }, aDesc: '완력 50% 타격 + 피해의 50% 회복' }),
  GH({ id: 'gh_tomblord', enemyKey: 'gateTombLord',   rank: 'violet', name: '묘주(墓主)',       passive: { physPct: 15, magPct: 15, takenPct: -8 }, active: { power: { stat: 'int', pct: 60 }, self: [{ s: 'wall', n: 1 }] }, aDesc: '지혜 60% 대타격 + 🧱방벽 1' }),
];
export const getBuriedGhost = (id) => BURIED_GHOSTS.find(g => g.id === id) || null;
export const buriedGhostForEnemy = (enemyKey) => BURIED_GHOSTS.find(g => g.enemyKey === enemyKey) || null;

// 제령 성공률 (PM 공식) — HP 25% 이하에서만 호출된다
export function buriedTameChance(rankId, hpPct) {
  const base = BURIED_GHOST_RANKS[rankId]?.baseTame || 0;
  return Math.max(0, Math.min(100, base + Math.max(0, 25 - hpPct) * 0.5));
}

// 제령부 드랍 (보스 처치 시) — ⚠️ 보상 버프(드랍 운·골드 배율 등) 완전 무관 (PM 지정)
export function rollBuriedTalisman() {
  if (Math.random() * 100 >= BURIED_TALISMAN_DROP_PCT) return null;
  let roll = Math.random() * 100;
  for (const r of Object.values(BURIED_GHOST_RANKS)) {
    roll -= r.dropShare;
    if (roll < 0) return r.id;
  }
  return 'red';
}

// 한계돌파 실효 킷 (PM 규칙): %형 수치 = 기본치 × (1 + 0.2×돌파) / 스택형(상태이상·방벽) = +1스택/돌파
export function buriedGhostKit(ghost, breaks = 0) {
  const rank = BURIED_GHOST_RANKS[ghost.rank];
  const b = Math.max(0, Math.min(rank.breakMax, breaks || 0));
  const pctMult = 1 + 0.2 * b;
  const passive = {};
  for (const [k, v] of Object.entries(ghost.passive || {})) {
    // dropLuck은 %가 아닌 정수형 — 돌파 미적용 (스택도 아님)
    passive[k] = k === 'dropLuck' ? v : Math.round(v * pctMult * 10) / 10;
  }
  const a = ghost.active || {};
  const active = {
    power: a.power ? { stat: a.power.stat, pct: Math.round(a.power.pct * pctMult) } : null,
    apply: (a.apply || []).map(x => ({ s: x.s, n: x.n + b })),
    self: (a.self || []).map(x => ({ s: x.s, n: x.n + b })),
    healPct: a.healPct ? Math.round(a.healPct * pctMult * 10) / 10 : 0,
    barrier: a.barrier ? a.barrier + b * 5 : 0, // 방벽·보호막 수치형은 돌파당 +5
    drainPct: a.drainPct ? Math.round(a.drainPct * pctMult) : 0,
    cd: rank.cd,
  };
  return { passive, active, breaks: b, rank };
}

// =========================================================
// 9. 던전 — 층 진행 + 방 선택
// =========================================================
export const BURIED_ROOMS = {
  battle:   { id: 'battle',   name: '무덤길',     icon: '⚔', color: '#c4453d', desc: '적 하나가 길을 막고 있다.', weight: 42 },
  elite:    { id: 'elite',    name: '봉인된 방',  icon: '☠', color: '#8b1f1f', desc: '강적. 대신 보상이 크다.', weight: 14 },
  treasure: { id: 'treasure', name: '부장품',     icon: '📦', color: '#e8b04a', desc: '장비 1개를 얻는다.', weight: 14 },
  shop:     { id: 'shop',     name: '무덤 상인',  icon: '🪙', color: '#d4a574', desc: '골드로 장비를 산다.', weight: 12 },
  shrine:   { id: 'shrine',   name: '제단',       icon: '⛩', color: '#7ba3c4', desc: '회복하거나 장비를 강화한다.', weight: 12 },
  rest:     { id: 'rest',     name: '야영지',     icon: '🔥', color: '#7a9a5e', desc: 'HP를 회복하고 물약을 챙긴다.', weight: 6 },
  // 1.104.0 신규 — 원작의 협상·서고 방
  negotiate:{ id: 'negotiate',name: '협상',       icon: '🤝', color: '#d4a574', desc: '길을 막은 것과 거래한다. 골드를 내면 그냥 지나간다.', weight: 10 },
  library:  { id: 'library',  name: '망자의 서고', icon: '📜', color: '#5c4a8c', desc: '스킬 하나의 레벨을 올린다 (최대 Lv.8).', weight: 10 },
  boss:     { id: 'boss',     name: '봉인의 문',  icon: '👑', color: '#e8b04a', desc: '보스가 기다린다.', weight: 0 },
};

// 이번 층에서 고를 방 2~3개. 각 방에는 던전 난이도에 따라 **방 효과**가 붙는다.
export function rollBuriedOffers(floor, dungeonId = 'labyrinth', extraOffers = 0) {
  const dg = getBuriedDungeon(dungeonId);
  const bossKey = buriedBossKeyAt(dg, floor);
  if (bossKey) return [{ type: 'boss', enemyKey: bossKey, effect: rollBuriedRoomEffect(dg.roomEffectChance) }];
  // 기믹 「갈림길」(미궁) — 선택지가 항상 3~4개. extraOffers: [dl1] 미궁의 실타래 +1
  const count = (dg.gimmick?.id === 'maze'
    ? (Math.random() < 0.25 ? 4 : 3)
    : (Math.random() < 0.45 ? 2 : 3)) + (extraOffers || 0);
  // 1.107.0 — 이벤트 방 5종(묘비·샘·석상·나그네·관)도 선택지 풀에 합류
  const pool = [
    ...Object.values(BURIED_ROOMS).filter(r => r.weight > 0),
    ...Object.values(BURIED_EVENT_ROOMS),
    BURIED_SKULL_ROOM,
  ];
  const offers = [];
  // 최소 1칸은 전투 — 성장이 멈추지 않도록
  offers.push({ type: 'battle' });
  while (offers.length < count) {
    const r = weightedPick(pool, x => x.weight);
    if (r.id === 'battle' && offers.some(o => o.type === 'battle')) continue;
    if (offers.some(o => o.type === r.id)) continue;
    offers.push({ type: r.id });
  }
  // 표시 순서 셔플
  for (let i = offers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [offers[i], offers[j]] = [offers[j], offers[i]];
  }
  // 기믹 「낙하 구멍」(나락) — 20% 확률로 선택지에 구멍 추가 (전투 최소 1칸 규칙과 별개로 덧붙음)
  if (dg.gimmick?.id === 'chute' && Math.random() < 0.20) offers.push({ type: 'chute' });
  // 방 효과는 전투 계열에만 (비전투 방은 효과 없이 깔끔하게)
  return offers.map(o => (o.type === 'battle' || o.type === 'elite')
    ? { ...o, effect: rollBuriedRoomEffect(dg.roomEffectChance) }
    : o);
}

// 기믹 「낙하 구멍」 — 표시용 방 정의 + 점프 규칙 (1.114.0)
export const BURIED_CHUTE_ROOM = { id: 'chute', name: '낙하 구멍', icon: '🕳', color: '#c4453d', weight: 0, desc: '최대 HP 25%를 바치고 3층 아래로 뛰어내린다. 보스 층은 건너뛸 수 없다.' };
export const BURIED_CHUTE_HP_PCT = 25;
export const BURIED_CHUTE_FLOORS = 3;

// 낙하 — 3층 아래로, 단 보스 층은 건너뛸 수 없다 (도중에 있으면 그 층에 착지).
// 걸음수는 +1만 — 마물이 자라기 전에 깊이 닿는 것이 이 기믹의 전략 가치.
export function buriedChuteJump(char) {
  const dg = getBuriedDungeon(char?.dungeonId);
  // 도중에 보스 층이 있으면 그 직전에 멈춘다 — 25% HP를 내고 보스 앞에 강제 착지당하는 함정 방지 (1.117.0)
  let land = (char.floor || 1) + BURIED_CHUTE_FLOORS;
  for (let f = (char.floor || 1) + 1; f <= land; f++) {
    if (buriedBossKeyAt(dg, f)) { land = Math.max((char.floor || 1) + 1, f - 1); break; }
  }
  return {
    ...char,
    floor: land,
    steps: (char.steps || 0) + 1,
    offers: rollBuriedOffers(land, char.dungeonId, (hasBuriedUnique(char, 'dl1') || hasBuriedTrait(char, 'pathfinder')) ? 1 : 0),
    floorEffect: rollBuriedFloorEffect(dg.floorEffectChance),
    room: null, roomData: null, roomEffect: null,
    // [dc2] 추락자의 갑주 — 낙하 시 다음 전투를 🧱방벽 1로 시작
    pendingStatuses: hasBuriedUnique(char, 'dc2')
      ? [...(char.pendingStatuses || []), { s: 'wall', n: 1 }]
      : char.pendingStatuses,
  };
}

// 상점 진열 (장비 3종)
export function rollBuriedShop(floor, classId, powerMult = 1) {
  const slots = [...BURIED_SLOT_IDS].sort(() => Math.random() - 0.5).slice(0, 3);
  return slots.map(slot => {
    const item = rollBuriedItem({ slot, classId, floor, luck: 2, powerMult });
    if (!item) return null;
    const t = getBuriedTier(item.tier);
    return { item, price: Math.round((45 + floor * 22) * t.mult) };
  }).filter(Boolean);
}

export const BURIED_POTION_HEAL_PCT = 45;
// 🈯 fx 키 → 한글 설명 (1.150.0, PM 지적: 사역각에 physPct+4 같은 영어 키가 그대로 노출됐다)
// 괴이 패시브·액티브, 계약·특성 fx 등 **같은 어휘를 쓰는 모든 표시부가 공유**한다.
// 새 fx 키를 추가하면 여기에도 한 줄 넣을 것 — 없으면 키 이름이 그대로 노출된다.
export const BURIED_FX_LABELS = {
  // 공격·치명
  physPct:      { name: '물리·기교 공격력', unit: '%' },
  magPct:       { name: '마법 공격력',      unit: '%' },
  crit:         { name: '치명 확률',        unit: '%' },
  critDmg:      { name: '치명 피해',        unit: '%' },
  drainPct:     { name: '흡혈',             unit: '%', note: '준 피해의 이 비율만큼 회복' },
  power:        { name: '위력',             unit: '%' },
  // 방어·생존
  hpPct:        { name: '최대 HP',          unit: '%' },
  hp:           { name: '최대 HP',          unit: '' },
  def:          { name: '방어력',           unit: '' },
  takenPct:     { name: '받는 피해',        unit: '%', good: 'down' },
  dodge:        { name: '회피율',           unit: '%' },
  barrier:      { name: '보호막',           unit: '' },
  barrierPct:   { name: '보호막',           unit: '%' },
  healPct:      { name: '회복량',           unit: '%' },
  // 자원·수급
  sp:           { name: '최대 SP',          unit: '' },
  startSpPct:   { name: '전투 시작 SP',     unit: '%p', note: '시작 SP 비율에 가산' },
  spRegen:      { name: '턴당 SP 회복',     unit: '' },
  goldPct:      { name: '골드 획득',        unit: '%' },
  expPct:       { name: '경험치 획득',      unit: '%' },
  dropLuck:     { name: '드랍 운',          unit: '', note: '좋은 등급이 나올 확률이 오른다' },
  dustPct:      { name: '먼지 획득',        unit: '%' },
  // 상태이상
  statusChance: { name: '상태이상 적중',    unit: '%', note: '내가 거는 상태이상 확률' },
  statusResist: { name: '상태이상 저항',    unit: '%' },
  apply:        { name: '적에게 부여',      unit: '' },
  self:         { name: '나에게 부여',      unit: '' },
  // 기타
  stepBonus:    { name: '성장 필요 걸음',   unit: '', note: '마물이 늦게 강해진다' },
  dmgPct:       { name: '주는 피해',        unit: '%' },
};

// fx 뭉치 → 사람이 읽는 한 줄 (예: "물리·기교 공격력 +4% · 받는 피해 -6%")
export function describeBuriedFx(fx, sep = ' · ') {
  if (!fx) return '';
  return Object.entries(fx).map(([k, v]) => {
    const L = BURIED_FX_LABELS[k];
    if (!L) return `${k} ${v}`;
    if (typeof v !== 'number') return L.name;
    return `${L.name} ${v > 0 ? '+' : ''}${v}${L.unit}`;
  }).join(sep);
}

// 1.150.0 — 물약은 **살수록 비싸진다** (PM 지시). 깊이(마물 레벨) × 이번 런 누적 구매 수.
// 누진은 1.12배 복리 — 3개째 ×1.25, 5개째 ×1.57, 8개째 ×2.21. 물약 무한 구매로 층을 버티는 걸 막는다.
export const BURIED_POTION_PRICE = 55;        // 기준가
export const BURIED_POTION_PRICE_STEP = 1.12; // 구매 1회당 가격 배율
export const buriedPotionPrice = (monLevel = 1, bought = 0) =>
  Math.round(BURIED_POTION_PRICE
    * (1 + Math.max(0, (monLevel || 1) - 1) * 0.08)
    * Math.pow(BURIED_POTION_PRICE_STEP, Math.max(0, bought || 0)));

// =========================================================
// 10. 전투 계산 — 순수 함수 (BuriedBattleScreen이 호출만 한다)
// =========================================================
export const BURIED_TUNING = {
  // 1.153.0 — 깊이 압력의 **HP/공격 축 분리** (PM 밸런스 패치).
  // 압력을 두 축에 같은 배율로 곱하면 심층에서 전투가 "길고 아픈" 쪽으로만 자란다
  // (실측 500층: 일반 34타·일격 66%, 강적 101타·87% — 사실상 진입 불가).
  // 지수를 낮춰 전 층에서 리듬을 일정하게 유지한다: 일반 5~8타·20%대, 강적 10~18타·30~50%.
  pressureHpExp: 0.78,         // 일반·강적 HP에 반영되는 압력 지수 (1 = 전량)
  pressureAtkExp: 0.87,        // 일반·강적 공격력에 반영되는 압력 지수
  guardianPressureExp: 0.80,   // 수문장 **공격력** 압력 지수 (0.5는 심층에서 잡몹보다 약해졌다)
  guardianHpExp: 0.62,         // 수문장 **HP** 압력 지수 — 관문전이 40~170타까지 늘어지던 문제 (목표 ~30타)
  guardianHeavyCapPct: 68,     // 대기술 한 방의 상한 = 플레이어 최대 HP의 이 % (관통·방어 자동 반영)
  enemyDmgMult: 1.1,   // 적 화력 체감 조정은 여기 한 곳. 1.113.0 — 레벨 스탯 폐지에도 "너무 쉽다" 응답으로 +10%
  playerDmgMult: 1.0,
  goldEarnMult: 0.7,   // 1.125.0 — 재화 인플레 픽스 (PM: 골드 9만 사례). 적 골드 -30%
  dustEarnMult: 0.65,  // 1.125.0 — 분해·사망 정산 먼지 -35%
  // 1.113.0 무한층 — 정복 층(dg.floors)을 넘어선 깊이는 층당 적 hp·atk에 압력.
  // 드랍 장비 레벨은 마물 레벨을 따라가므로(≈파리티) 이 압력이 없으면 무한 스노볼이 된다 (시뮬 검증).
  // 1.114.0 — 복리(1.03^n) → **선형(1 + n×0.01)**: 적 공격력은 레벨 스케일만으로도 장비 HP 성장과
  // 점근 비율이 정해져 있어(구조적), 압력 2배 = 실질 벽. 100층(PM 체크포인트 단위)이
  // "엘리트 빌드의 이정표"가 되도록 100층 ≈ ×1.9 / 200층 ≈ ×2.9로 조정 (시뮬 검증)
  depthPressurePerFloor: 0.01,
  depthStep50: 1.5,   // 1.120.0 — 50층 통과마다 ×1.5 (PM 지시)
  depthStep100: 2,    // 1.120.0 — 100층 통과마다 ×2 (50층분 대신 — 100층 계단은 1.5가 아니라 2)
  depthEdgePerFloor: 0.008, // 1.121.0 — 적이 장비 대비 앞서가는 격차 (층당 +0.8%). 깊이 난이도의 실체
};

const stacksOf = (u, key) => (u?.statuses?.[key] || 0);

// 주는 데미지 배율 (격노 ↑ / 약화·노화 ↓)
export function buriedOffenseMult(u) {
  return Math.max(0.2, 1 + stacksOf(u, 'rage') * 0.10 - stacksOf(u, 'weaken') * 0.06 - stacksOf(u, 'aging') * 0.04);
}
// 받는 데미지 배율 (속박·저주 ↑ / 수호 ↓)
export function buriedTakenMult(u) {
  return Math.max(0.2, 1 + stacksOf(u, 'bind') * 0.20 + stacksOf(u, 'curse') * 0.15 - stacksOf(u, 'guard') * 0.12);
}
// 실효 방어력 (파쇄 반영)
export function buriedEffDef(u) {
  const raw = u?.def || 0;
  return Math.max(0, Math.round(raw * Math.max(0.2, 1 - stacksOf(u, 'shatter') * 0.10)));
}
// 실효 회피율 (잔영 ↑, 속박이면 0, 방 효과 반영)
export function buriedEffDodge(u) {
  if (u?.noDodge) return 0; // ⚓ 둔족의 쐐기 (1.128.0)
  if (stacksOf(u, 'bind') > 0) return 0;
  return Math.min(70, (u?.dodge || 0) + stacksOf(u, 'evade') * 15 + (u?.envDodgeAdd || 0));
}
// 회복 가능 여부 (저주 = 회복 무효)
export const buriedCanHeal = (u) => stacksOf(u, 'curse') === 0;

// 스킬 1회 판정.
// 방·층 효과는 유닛에 미리 발라둔 env* 값으로 읽는다 (envDmgPct/envTakenPct/envCritAdd/envMagPct/envDodgeAdd).
// traits: 공격자가 가진 특성 id 배열 (트리거형 판정용).
// 반환: { dodged, hits:[{dmg,crit}], total, crits, chase }
//   chase = 추격 피해 (원작의 추격 데미지). 보호막 처리 규칙이 본체와 달라 따로 돌려준다.
// 1.145.0 — 방 위협 미리보기 (PM: 결정 전 필요한 숫자): 이 전투 방에서 나올 수 있는 적의
// 평타 일격이 내 HP의 몇 %인가. buildBuriedRoomEnemy와 같은 풀·레벨·압력 규칙으로 범위 계산.
export function buriedRoomThreat(char, roomType) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const floor = char?.floor || 1;
  const monLevel = buriedMonsterLevel(char);
  const d = buriedDerived(char);
  let keys = [];
  if (roomType === 'boss') { const k = buriedBossKeyAt(dg, floor); if (k) keys = [k]; }
  if (keys.length === 0) {
    const tier = roomType === 'elite' ? 'elite' : 'normal';
    const band = Math.min(10, Math.max(1, Math.round(monLevel * 0.8)));
    const inDungeon = (e) => !e.dungeons || e.dungeons.includes(dg.id);
    const pool = BURIED_ENEMY_LIST.filter(e => e.tier === tier && inDungeon(e) && band >= e.minFloor && band <= e.maxFloor);
    keys = (pool.length > 0 ? pool : BURIED_ENEMY_LIST.filter(e => e.tier === tier && inDungeon(e) && !e.guardian)).map(e => e.key);
  }
  if (keys.length === 0) return null;
  const pressure = Math.max(1, buriedDepthPressure(dg, floor));
  const defMult = Math.max(0.25, 100 / (100 + (d.def || 0)));
  let lo = Infinity, hi = 0;
  for (const k of keys) {
    const e = buriedEnemyAtLevel(k, monLevel);
    if (!e) continue;
    const hit = Math.max(1, Math.round(e.atk * pressure * defMult));
    if (hit < lo) lo = hit;
    if (hit > hi) hi = hit;
  }
  if (!isFinite(lo)) return null;
  const pct = (v) => Math.min(999, Math.round((v / Math.max(1, d.maxHp)) * 100));
  return { lo, hi, loPct: pct(lo), hiPct: pct(hi) };
}

// 1.144.1 — 스킬 예상 데미지 (PM: 위력% 옆에 현 스탯 기준 수치 — 물·기·마 장비 비교용).
// 기준: 현재 파생 공격력 × 위력%. 적 방어·전투 중 버프 적용 전의 기준치.
export function buriedSkillDmgPreview(skill, char) {
  if (!skill?.power || !char) return null;
  const d = buriedDerived(char);
  const statKey = skill.stat || null;
  const base = statKey === 'int' ? d.mag : statKey === 'dex' ? d.fin : statKey === 'str' ? d.atk
    : Math.max(d.atk, d.fin, d.mag);
  const per = Math.max(1, Math.round(base * (skill.power || 0) / 100));
  const hits = Math.max(1, skill.hits || 1);
  return { per, hits, total: per * hits };
}

// ⚔ 데미지 공식 설명 (1.148.0, PM 지시 "데미지 공식의 설명이 명확했으면") —
// resolveBuriedAttack의 계산 순서를 **내 실제 수치로** 풀어 쓴다. 공식이 바뀌면 이 함수도 같이 고칠 것.
// 반환: [{ n, label, value, note }] — UI는 표시만 한다.
export function buriedDamageFormula(char) {
  if (!char) return [];
  const d = buriedDerived(char);
  const st = d.stats;
  const tf = aggregateBuriedTraits(char), cf = aggregateBuriedContracts(char);
  const rf = buriedRaceFx(char), uf = buriedUniqueFx(char);
  const physPct = (tf.physPct || 0) + (cf.physPct || 0) + (rf.physPct || 0) + (uf.physPct || 0);
  const magPct = (tf.magPct || 0) + (cf.magPct || 0) + (rf.magPct || 0) + (uf.magPct || 0);
  // ① 보정 이전 기본치 역산 (표시 전용)
  const physBase = d.atk - (d.physFlatAdd || 0);
  const a0 = Math.round(physBase / (1 + physPct / 100));
  return [
    { n: '①', label: '기본 공격력', value: `물리 ${a0}`,
      note: `10 + 근력 ${st.str}×1.6 + 장비·부품 공격력 (기교는 민첩, 마법은 지능 기준)` },
    { n: '②', label: '% 보정 (곱연산)', value: `물리 +${physPct}% · 마법 +${magPct}%`,
      note: physPct || magPct ? '특성·종족·출신·계약·유니크의 물리%/마법%는 모두 더한 뒤 ①에 한 번 곱한다 (흑색 화약도 여기)' : '보유한 % 보정이 없다' },
    { n: '③', label: '고정 가산 (곱연산 밖)', value: `물리 +${d.physFlatAdd || 0} · 마법 +${d.magFlatAdd || 0}`,
      note: (d.physFlatAdd || d.magFlatAdd) ? '거체의 반지(최대HP 8%)·마력 격막(보호막 30%) — ②의 %와 곱해지지 않는 별도 가산' : '해당 유니크 미보유' },
    { n: '＝', label: '내 공격력', value: `물리 ${d.atk} · 기교 ${d.fin} · 마법 ${d.mag}`,
      note: '스킬의 참조 능력치에 따라 셋 중 하나를 쓴다. 기본기는 셋 중 가장 높은 값' },
    { n: '④', label: '× 스킬 위력%', value: '스킬마다 상이',
      note: '연격(N회 타격)은 위력%를 매 타마다 따로 굴린다 — 상태이상·자가 버프도 ×N' },
    { n: '⑤', label: '× 주는 피해 보정', value: '[격노] +10%/스택 · [약화] -6%/스택',
      note: '방·층 효과, 인장, 수문장의 인장, 동행 괴이도 여기에 곱해진다' },
    { n: '⑥', label: '× 적의 받는 피해 보정', value: '[속박] +20%/스택 · [저주] +15%/스택',
      note: '적의 물리·마법 내성, 전쾌시 방어(풀피일 때 감소)도 여기서 곱해진다' },
    { n: '⑦', label: '× 방어 감쇠', value: '100 ÷ (100 + 적 방어력)',
      note: `하한 25% — 방어가 아무리 높아도 최소 1/4은 통과한다. 관통 공격은 이 단계를 통째로 무시. [파쇄]는 적 방어를 스택당 10% 깎는다` },
    { n: '⑧', label: '× 편차', value: '0.92 ~ 1.08',
      note: '매 타격마다 무작위 — 같은 스킬도 표시 수치의 ±8% 안에서 흔들린다' },
    { n: '⑨', label: '치명타면 × 치명 피해', value: `${d.crit}% 확률 · ×${(1 + d.critDmg / 100).toFixed(2)}`,
      note: '연격은 타격마다 따로 판정한다' },
    { n: '＋', label: '추격 피해 (별도)', value: `${d.chase || 0}`,
      note: '적중 시 본체와 별개로 1회 더 — 방어를 무시하고 그대로 들어간다' },
  ];
}

export function resolveBuriedAttack(att, def, skill, { isPlayer = false, traits = [] } = {}) {
  const dodgeRoll = Math.random() * 100 < buriedEffDodge(def);
  if (dodgeRoll) return { dodged: true, hits: [], total: 0, crits: 0, chase: 0 };

  // stat 미지정(기본 공격)은 최고 공격 스탯을 따른다 — int 빌드도 기본기가 살아 있도록 (1.117.0)
  const statKey = skill.stat || null;
  const baseAtk = statKey === 'int' ? (att.mag || 0)
    : statKey === 'dex' ? (att.fin || 0)
    : statKey === 'str' ? (att.atk || 0)
    : Math.max(att.atk || 0, att.fin || 0, att.mag || 0);
  const hitCount = Math.max(1, skill.hits || 1);
  // ☠ 「강철의」 변형 (1.124.0) — 치명타를 받지 않는다
  const critRate = def.immuneCrit || att.noCrit ? 0 : (att.crit || 0) + (skill.critBonus || 0) + (att.envCritAdd || 0);
  let offense = buriedOffenseMult(att) * (1 + (att.envDmgPct || 0) / 100);
  if (statKey === 'int') offense *= 1 + (att.envMagPct || 0) / 100;
  let taken = buriedTakenMult(def) * (1 + (def.envTakenPct || 0) / 100);
  // 1.130.0 — 몬스터 내성 프로필 (BB2 시트 이식): 물리/마법 내성·전쾌시 방어
  const isMagAtk = statKey === 'int' || (!statKey && (att.mag || 0) >= Math.max(att.atk || 0, att.fin || 0));
  if (def.physTakenPct && !isMagAtk) taken *= 1 + def.physTakenPct / 100;
  if (def.magTakenPct && isMagAtk) taken *= 1 + def.magTakenPct / 100;
  if (def.fullGuardPct && def.maxHp > 0 && def.hp >= def.maxHp) taken *= Math.max(0, 1 - def.fullGuardPct / 100);
  const effDef = skill.pierce ? 0 : buriedEffDef(def);
  // 1.121.0 — 감쇠 하한 25%: 방어가 아무리 높아도 피해의 1/4은 통과 (심층 "안 아픔" 붕괴 픽스)
  const defMult = Math.max(0.25, 100 / (100 + effDef));

  let power = skill.power || 0;
  if (skill.executeBelow && def.maxHp > 0 && (def.hp / def.maxHp) * 100 <= skill.executeBelow) power *= 2;
  if (skill.berserk && att.maxHp > 0) power *= 1 + (1 - att.hp / att.maxHp);
  // 특성 — 혈투 / 혈군 (HP가 낮을수록 강해진다)
  const lowHp = att.maxHp > 0 && att.hp / att.maxHp <= 0.5;
  // 1.152.0 — 「혈군」(마혈군주 전직 전용)은 HP 50% 문턱을 넘어야만 발동해 전직 체감이 0이었다.
  //           잃은 HP에 비례하는 **상시 스케일**로 전환 (최대 +45%, 만피에서도 0에서 시작해 자연히 오른다)
  if (traits.includes('bloodlord') && att.maxHp > 0) {
    power *= 1 + Math.min(45, (1 - att.hp / att.maxHp) * 90) / 100;
  } else if (lowHp && traits.includes('bloodrush')) power *= 1.25;
  // 특성 — 성전 (1.152.0, 성기사 전용): 보호막을 유지하는 동안 화력이 오른다
  if (traits.includes('crusade') && (att.barrier || 0) > 0) power *= 1.25;
  // 특성 — 사령술 (1.152.0, 강령술사 전용): 적이 앓는 디버프 종류만큼 강해진다
  if (traits.includes('necromancy')) {
    const n = Object.keys(def.statuses || {}).filter(k => (def.statuses[k] || 0) > 0 && BURIED_STATUS[k]?.kind === 'debuff').length;
    if (n > 0) power *= 1 + Math.min(32, n * 8) / 100;
  }
  // ☠ 「격노한」 변형 (1.124.0) — HP 50% 이하에서 공격 +40%
  if (att.enrage && lowHp) power *= 1.4;

  const globalMult = isPlayer ? BURIED_TUNING.playerDmgMult : BURIED_TUNING.enemyDmgMult;
  const hits = [];
  let crits = 0;
  for (let i = 0; i < hitCount; i++) {
    const crit = Math.random() * 100 < critRate;
    if (crit) crits++;
    const variance = 0.92 + Math.random() * 0.16;
    let dmg = (baseAtk * power / 100) * offense * taken * defMult * variance * globalMult;
    if (crit) dmg *= 1 + (att.critDmg || 60) / 100;
    hits.push({ dmg: Math.max(1, Math.round(dmg)), crit });
  }

  // ===== 추격 피해 (원작의 chase damage) =====
  // 스킬이 적중하면 본체 데미지와 별개로 한 번 더 들어간다. 방어력 영향을 받지 않는다.
  let chase = 0;
  if (skill.power && (att.chase || 0) > 0) {
    chase = (att.chase || 0) * (1 + (skill.chaseBonusPct || 0) / 100);
    // 특성 — 혈군: 잃은 HP 1%당 추격 +0.6 / 폭풍: 추격 2배
    if (traits.includes('bloodlord') && att.maxHp > 0) chase += (1 - att.hp / att.maxHp) * 100 * 0.6;
    if (traits.includes('tempest')) chase *= 2;
    chase = Math.max(0, Math.round(chase * (1 + (att.envDmgPct || 0) / 100)));
  }
  return { dodged: false, hits, total: hits.reduce((s, h) => s + h.dmg, 0), crits, chase };
}

// 상태이상 부여 — 확률·최대 스택 + 방/층 효과 반영. 새 statuses 객체 반환
//   chancePct: 부여 확률 가감 (방 효과 「고요의 방」 등)
//   extra    : 스택 가산 (층 효과 「정적의 층」)
export function applyBuriedStatuses(statuses, list, { chancePct = 0, extra = 0, uncap = false } = {}) {
  if (!list || list.length === 0) return statuses;
  const next = { ...statuses };
  for (const a of list) {
    const def = BURIED_STATUS[a.s];
    if (!def) continue;
    const chance = a.p != null ? a.p + chancePct : 100 + chancePct;
    if (chance < 100 && Math.random() * 100 >= chance) continue;
    // 1.146.0 — uncap: ⟪만개⟫ 룬워드·「백화의 낙인」 등 상한 해제 (폭주 방지 절대 상한 99)
    next[a.s] = Math.min(uncap ? 99 : def.max, (next[a.s] || 0) + (a.n || 1) + extra);
  }
  return next;
}

// 턴 종료 처리 — 도트 피해·회복 + 스택 감소.
// 반환: { statuses, dmg, heal, log:[{name, dmg, heal}] }
export function tickBuriedStatuses(unit, { canHeal = true } = {}) {
  const src = unit?.statuses || {};
  const next = {};
  let dmg = 0, heal = 0;
  const log = [];
  for (const [key, stack] of Object.entries(src)) {
    if (!stack || stack <= 0) continue;
    const def = BURIED_STATUS[key];
    if (!def) continue;
    if (def.tickDmg) { const d = def.tickDmg * stack; dmg += d; log.push({ key, name: def.name, dmg: d }); }
    if (def.tickHeal && canHeal) { const h = def.tickHeal * stack; heal += h; log.push({ key, name: def.name, heal: h }); }
    let rest = stack;
    if (def.decay === 'one') rest = stack - 1;
    else if (def.decay === 'half') rest = Math.floor(stack / 2);
    if (rest > 0) next[key] = rest;
  }
  return { statuses: next, dmg, heal, log };
}

// 적 행동 선택 — 가중치 + 상황 보정 (HP 낮으면 방어 선호, 30% 이하면 격노)
export function chooseBuriedEnemyAction(enemyUnit, actions) {
  const list = actions || [];
  if (list.length === 0) return { name: '공격', power: 100, kind: 'attack' };
  const hpPct = enemyUnit.maxHp > 0 ? enemyUnit.hp / enemyUnit.maxHp : 1;
  return weightedPick(list, (a) => {
    let w = a.weight || 1;
    if (a.kind === 'defend') w *= hpPct < 0.4 ? 2.2 : 0.8;
    if (a.heavy) w *= hpPct < 0.5 ? 1.4 : 1;
    return Math.max(0.1, w);
  });
}

// =========================================================
// 11. 유산 — 사망 시 계승 규칙
// =========================================================

// 1.117.0 PM 결정 — 장비 계승 폐지: 사망·은퇴 시 장착 장비(+판단 대기 장비)를 전부
// **자동 분해해 먼지로 정산**한다.
// 1.118.0 PM 결정 — **골드도 전액 소멸** (계승 없음. 9만 골드 축적 문제 — 죽음이 골드 싱크가 된다)
export function buriedDeathSettlement(char) {
  if (!char) return { dust: 0, gold: 0, itemCount: 0 };
  const items = [
    ...BURIED_SLOT_IDS.map(s => char.equipped?.[s]).filter(Boolean),
    ...(char.pendingLoot || []),
  ];
  const ksMult = 1 + buriedKeystoneBonus(char).rewardPct / 100; // ⚓ 쐐기 보상 (1.128.0)
  return {
    dust: Math.round(items.reduce((s, it) => s + buriedDustValue(it), 0) * ksMult),
    gold: 0, // 소멸 — 무덤에 흩어진다
    itemCount: items.length,
  };
}



// 다음 층으로. 1.113.0 PM 결정: **층은 무한** — 죽거나 포기할 때까지 내려간다.
// dg.floors는 이제 "정복 층" (그 층의 보스를 잡으면 해금 판정, 런은 계속).
// 층을 오를 때 **층 효과**를 새로 굴리고(이전 층 효과는 소멸), 방 선택지도 새로 만든다.
export function advanceBuriedFloor(char) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const next = (char.floor || 1) + 1;
  let out = {
    ...char,
    floor: next,
    // [dl1] 미궁의 실타래 / 특성 「길잡이」 — 방 선택지 +1
    offers: rollBuriedOffers(next, char.dungeonId, (hasBuriedUnique(char, 'dl1') || hasBuriedTrait(char, 'pathfinder')) ? 1 : 0),
    floorEffect: rollBuriedFloorEffect(dg.floorEffectChance),
    room: null, roomData: null, roomEffect: null,
    // [u23] 변모 — 층을 오를 때마다 무작위 버프 2스택으로 다음 전투 시작
    pendingStatuses: hasBuriedUnique(char, 'u23')
      ? [...(char.pendingStatuses || []), { s: pick(['rage', 'guard', 'regen', 'evade']), n: 2 }]
      : char.pendingStatuses,
  };
  // [dl2] 미로 걸음 — 층 이동 시 30% 확률 최대 HP 12% 회복
  if (hasBuriedUnique(char, 'dl2') && Math.random() < 0.30) {
    const maxHp = buriedDerived(out).maxHp;
    out = { ...out, hp: Math.min(maxHp, (out.hp || 1) + Math.round(maxHp * 0.12)) };
  }
  // 층 효과 「망자의 가호」 — 층에 들어설 때 회복 (1.117.0 배선 — 정의만 있고 미적용이던 효과)
  const enterFx = getBuriedFloorEffect(out.floorEffect)?.fx;
  if (enterFx?.roomHealPct) {
    const maxHp = buriedDerived(out).maxHp;
    out = { ...out, hp: Math.min(maxHp, (out.hp || 1) + Math.round(maxHp * enterFx.roomHealPct / 100)) };
  }
  return {
    char: out,
    cleared: false, // 하위 호환 — 클리어 개념 폐지 (정복 판정은 App의 보스 처치 시점)
  };
}

// 1.113.0 — 무한층 보스 배치. 정복 층까지는 기존 bossFloors, 그 뒤로는 같은 간격으로 보스 로테이션.
// 예) 미궁(5·10) → 15·20·25…층마다 봉인의 마녀 → 무덤의 폭군 → 반복
export function buriedBossKeyAt(dg, floor) {
  // 1.120.0 — 100층 단위 층계 수문장. 1.143.0 — 고정 배치 (100~500 각자의 문, 600+는 묘주가 계속 지킨다)
  if (floor > 0 && floor % 100 === 0) {
    return BURIED_GUARDIAN_KEYS[Math.min(Math.floor(floor / 100), BURIED_GUARDIAN_KEYS.length) - 1];
  }
  if (dg.bossFloors[floor]) return dg.bossFloors[floor];
  if (floor <= dg.floors) return null;
  const bossFloorList = Object.keys(dg.bossFloors).map(Number).sort((a, b) => a - b);
  const interval = bossFloorList[0] || 5;
  const over = floor - dg.floors;
  if (over % interval !== 0) return null;
  const rotation = bossFloorList.map(f => dg.bossFloors[f]);
  return rotation[(over / interval - 1) % rotation.length];
}

// 방을 하나 지날 때마다 걸음수 +1 (원작: 마물 레벨은 층이 아니라 걸음수로 오른다)
// [u75] 한달음 — 걸음이 절반만 쌓인다 (기본 걸음 50% 확률 미계상. extraSteps는 그대로)
export function stepBuriedChar(char, extraSteps = 0) {
  const base = hasBuriedUnique(char, 'u75') && Math.random() < 0.5 ? 0 : 1;
  return { ...char, steps: (char.steps || 0) + base + extraSteps };
}

// =========================================================
// 10b. ☠ 엘리트 변형 (1.124.0) — BB2 데이터시트(エリートElite) 이식 3탄
// =========================================================
// 원작 규칙: 강적은 이름 앞에 변형 접두어가 붙고, 그 접두어가 효과 뭉치를 결정한다.
// 같은 적이라도 만날 때마다 다른 변형 — 강적 방의 리스크·보상이 매번 달라진다.
// 스탯 변형(hpMult/defMult/atkMult/addApply/extraHit)은 applyBuriedEliteMod가 생성 시점에 굽고,
// 판정 변형(immuneCrit/enrage/undying/critAdd/takenPct/barrierPct)은 전투가 enemy.eliteFx로 읽는다.
export const BURIED_ELITE_MODS = {
  huge:     { id: 'huge',     name: '거대한', color: '#c9a86a', desc: '최대 HP ×2, 공격 +10%',                    hpMult: 2.0, atkMult: 1.1 },
  steel:    { id: 'steel',    name: '강철의', color: '#8b9bb4', desc: '방어 +60%, 치명타를 받지 않는다',            defMult: 1.6, immuneCrit: true },
  swift:    { id: 'swift',    name: '신속한', color: '#7ba3c4', desc: '모든 공격이 한 번 더 때린다 (위력 75%)',      extraHit: true },
  tough:    { id: 'tough',    name: '질긴',   color: '#9b8975', desc: '최대 HP +75%, 받는 피해 -10%',              hpMult: 1.75, takenPct: -10 },
  reckless: { id: 'reckless', name: '무모한', color: '#c4453d', desc: '치명 +25% — 대신 최대 HP -15%',             hpMult: 0.85, critAdd: 25 },
  flaming:  { id: 'flaming',  name: '불타는', color: '#ff6b35', desc: '공격 적중 시 [화상] 2 부여',                addApply: { s: 'burn', n: 2, p: 100 } },
  toxic:    { id: 'toxic',    name: '유독한', color: '#7a9a5e', desc: '공격 적중 시 [중독] 2 부여',                addApply: { s: 'poison', n: 2, p: 100 } },
  serrated: { id: 'serrated', name: '톱날의', color: '#8b1f1f', desc: '공격 적중 시 [출혈] 2 부여',                addApply: { s: 'bleed', n: 2, p: 100 } },
  soft:     { id: 'soft',     name: '무른',   color: '#c48bd4', desc: '최대 HP ×2.5 — 대신 받는 피해 +100%',       hpMult: 2.5, takenPct: 100 },
  immortal: { id: 'immortal', name: '불멸의', color: '#e8b04a', desc: '죽음을 1회 버틴다 (HP 1 생존) — 최대 HP -30%', hpMult: 0.7, undying: true },
  crystal:  { id: 'crystal',  name: '수정의', color: '#7ba3c4', desc: '시작 보호막 = 최대 HP의 35%',               barrierPct: 35 },
  wrathful: { id: 'wrathful', name: '격노한', color: '#c4453d', desc: 'HP 50% 이하에서 공격 +40%',                enrage: true },
};
export const getBuriedEliteMod = (id) => BURIED_ELITE_MODS[id] || null;
export const rollBuriedEliteMod = () => pick(Object.keys(BURIED_ELITE_MODS));

// 변형을 적 객체에 굽는다 — 이름 접두 + 스탯 변형 + 보상 ×1.4, 판정 플래그는 eliteFx로 전달
export function applyBuriedEliteMod(enemy, modId) {
  const mod = getBuriedEliteMod(modId);
  if (!enemy || !mod) return enemy;
  const out = { ...enemy, eliteMod: modId, eliteFx: mod, name: `${mod.name} ${enemy.name}` };
  if (mod.hpMult) out.hp = Math.round(out.hp * mod.hpMult);
  if (mod.atkMult) out.atk = Math.round(out.atk * mod.atkMult);
  if (mod.defMult) out.def = Math.round((out.def || 0) * mod.defMult);
  if (mod.extraHit || mod.addApply) {
    out.actions = (out.actions || []).map(a => {
      if (a.kind === 'defend' || !a.power) return a;
      let n = { ...a };
      if (mod.extraHit) n = { ...n, hits: (n.hits || 1) + 1, power: Math.round(n.power * 0.75) };
      if (mod.addApply) n = { ...n, apply: [...(n.apply || []), mod.addApply] };
      return n;
    });
  }
  // 리스크에 걸맞은 보상 — 골드·경험치 ×1.4
  out.exp = Math.round((out.exp || 0) * 1.4);
  out.gold = [Math.round(out.gold[0] * 1.4), Math.round(out.gold[1] * 1.4)];
  return out;
}

// 방 하나에서 만날 적 (전투/강적/보스 공용). 스펙은 **걸음수 기반 마물 레벨**로 정해진다.
export function buildBuriedRoomEnemy(char, roomType, roomEffectId = null) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const floor = char?.floor || 1;
  const envBump = getBuriedRoomEffect(roomEffectId)?.fx?.monsterLevel || 0;
  const monLevel = buriedMonsterLevel(char) + envBump;
  let key;
  if (roomType === 'boss') {
    key = buriedBossKeyAt(dg, floor);
  }
  if (!key) {
    const tier = roomType === 'elite' ? 'elite' : 'normal';
    const band = Math.min(10, Math.max(1, Math.round(monLevel * 0.8)));
    // 1.120.0 — dungeons 필드가 있는 적은 그 던전에서만 (던전 정체성 강화)
    const inDungeon = (e) => !e.dungeons || e.dungeons.includes(dg.id);
    const pool = BURIED_ENEMY_LIST.filter(e => e.tier === tier && inDungeon(e) && band >= e.minFloor && band <= e.maxFloor);
    const fallback = BURIED_ENEMY_LIST.filter(e => e.tier === tier && inDungeon(e) && !e.guardian);
    key = pick(pool.length > 0 ? pool : fallback).key;
  }
  let enemy = buriedEnemyAtLevel(key, monLevel);
  // 깊이의 압력 — 정복 층 이후 층당 선형 증가 (장비는 마물 레벨만 따라가므로 여기서 격차가 벌어진다)
  const pressure = buriedDepthPressure(dg, floor);
  if (pressure > 1) {
    // 1.146.1 — A안: 수문장은 base가 이미 절대치 설계(일반 보스의 2~3배)인데 레벨 스케일 ×압력이
    // 중첩돼 100층에서 관통 원킬이 나오던 문제 → 압력을 √로 완화했다.
    // 1.152.0 — 그런데 √는 깊어질수록 과교정돼(300층 압력 ×105 → ×10.3, 즉 10%만 반영)
    // **수문장이 같은 층 강적보다 약해지는 역전**이 났다. 게다가 관통 대기술 보유 수문장(300·500층)과
    // 비관통(200·400층) 사이 위협이 4~6배 널뛰었다 (실측 16%~98%).
    // → 지수를 GUARDIAN_PRESSURE_EXP로 올리고, 대기술 관통 보유 수문장은 그만큼 되돌려 균형을 맞춘다.
    //   조정은 BURIED_TUNING.guardianPressureExp / guardianPierceOffset 두 상수 한 곳.
    // 1.153.0 — HP/공격 축 분리: 같은 압력이라도 HP는 덜, 공격은 더 덜 받는다 (상수 표 참조)
    const hpExp = enemy.guardian ? (BURIED_TUNING.guardianHpExp ?? 0.62) : (BURIED_TUNING.pressureHpExp ?? 1);
    const atkExp = enemy.guardian ? (BURIED_TUNING.guardianPressureExp ?? 0.5) : (BURIED_TUNING.pressureAtkExp ?? 1);
    enemy = {
      ...enemy,
      hp: Math.round(enemy.hp * Math.pow(pressure, hpExp)),
      atk: Math.round(enemy.atk * Math.pow(pressure, atkExp)),
    };
  }
  // 1.152.0 — 수문장 대기술 피해 상한. 지수만 만지면 관통/비관통·수문장별 기본치 차이 때문에
  // 위협이 16%~175%로 널뛴다(실측). 그래서 **「대기술 한 방이 내 최대 HP의 N%를 넘지 않는다」**를
  // 직접 보장한다 — 관통 여부·방어력·층을 전부 흡수하는 자기교정 상한.
  // ⚠ 내리기만 한다(상한). 장비가 좋은 플레이어는 설계된 수문장을 그대로 만난다 — 물몸 보호용이지 하향이 아니다.
  // HP는 건드리지 않으므로 "길고 무거운 싸움"이라는 관문의 성격은 유지된다.
  if (enemy.guardian) {
    const cap = BURIED_TUNING.guardianHeavyCapPct ?? 62;
    const pd = buriedDerived(char);
    const heavy = (enemy.actions || []).filter(a => a.heavy && a.power);
    if (pd.maxHp > 0 && heavy.length > 0) {
      const worst = heavy.reduce((m, a) => {
        const defMult = a.pierce ? 1 : Math.max(0.25, 100 / (100 + (pd.def || 0)));
        return Math.max(m, (a.power / 100) * (a.hits || 1) * defMult);
      }, 0);
      const maxAtk = (pd.maxHp * cap / 100) / (worst * (BURIED_TUNING.enemyDmgMult || 1));
      // 1.153.0 — atk 자체를 깎으면 일반타까지 5%대로 무력화된다(실측) →
      // **대기술의 power만** 비율 축소해 일반타는 설계대로, 대기술만 상한에 걸리게 한다.
      if (enemy.atk > maxAtk) {
        const scale = maxAtk / enemy.atk;
        enemy = {
          ...enemy,
          actions: (enemy.actions || []).map(a =>
            a.heavy && a.power ? { ...a, power: Math.max(10, Math.round(a.power * scale)) } : a),
        };
      }
    }
  }
  // ☠ 엘리트 변형 (1.124.0) — 강적 방은 항상 랜덤 변형이 붙는다
  if (roomType === 'elite') enemy = applyBuriedEliteMod(enemy, rollBuriedEliteMod());
  return { ...enemy, roomType, isBoss: roomType === 'boss' };
}

// 1.121.0 — 장비 위력 배율: 압력을 "레벨"이 아니라 **스탯 배율**로 환산해 모든 장비 생성처가 공유한다.
// (1532레벨 사태 픽스 — 레벨 인플레·드랍 무쓸모·방어 감쇠 붕괴의 뿌리였음)
// 적은 압력 전액을 받고 장비는 (압력 ÷ 깊이 격차)만 받는다 — 깊을수록 적이 앞서간다.
export function buriedGearPower(dg, floor) {
  const f = floor || 1;
  const edge = 1 + f * (BURIED_TUNING.depthEdgePerFloor || 0);
  return Math.max(1, buriedDepthPressure(dg, f) / edge);
}
export const buriedLootPower = (char) =>
  buriedGearPower(getBuriedDungeon(char?.dungeonId), char?.floor || 1);

// 깊이의 압력 배율 (1.120.0 PM 지시: "난이도가 아직도 너무 낮다")
//   = 선형(정복 층 이후 층당 +1%) × 계단(50층 통과마다 ×1.5, 100층 통과는 ×2)
//   예) 50층 ×1.5 / 100층 ×3×선형 / 150층 ×4.5 / 200층 ×9 — 체크포인트 시작 장비는 자동 보정됨
export function buriedDepthPressure(dg, floor) {
  const f = floor || 1;
  const over = Math.max(0, f - dg.floors);
  const linear = 1 + over * (BURIED_TUNING.depthPressurePerFloor || 0);
  const hundreds = Math.floor(f / 100);
  const fiftiesOnly = Math.floor(f / 50) - hundreds;
  const step = Math.pow(BURIED_TUNING.depthStep50 || 1.5, fiftiesOnly) * Math.pow(BURIED_TUNING.depthStep100 || 2, hundreds);
  return linear * step;
}

// =========================================================
// 12. 특성 (Ability) — 1.104.0
// =========================================================
// 원작 규칙: 직업은 **영구 특성 3개를 결정하며 그중 1개는 그 직업 전용**이다.
// 스탯형 특성은 buriedDerived에서 자동 합산되고, 트리거형(riposte 등)은 전투 화면이 판정한다.
export const BURIED_TRAITS = {
  // --- 직업 전용 (각 직업 1개) ---
  riposte:   { id: 'riposte',   name: '반격',   exclusive: 'wanderer',   trigger: true, desc: '회피에 성공하면 즉시 기본 공격의 60% 위력으로 반격한다.' },
  kindle:    { id: 'kindle',    name: '발화',   exclusive: 'sage',       trigger: true, desc: '마법 스킬이 적중하면 30% 확률로 [화상] 1스택을 추가 부여한다.' },
  bloodrush: { id: 'bloodrush', name: '혈투',   exclusive: 'demonblood', trigger: true, desc: 'HP가 50% 이하일 때 주는 데미지 +25%.' },
  gale:      { id: 'gale',      name: '질풍',   exclusive: 'elf',        trigger: true, desc: '치명타가 터질 때마다 SP +12를 회복한다.' },
  dawnlight: { id: 'dawnlight', name: '여명',   exclusive: 'priest',     trigger: true, desc: '모든 회복량 +30%.' },
  // --- 상위 직업 전용 ---
  soulbind:  { id: 'soulbind',  name: '혼결',   exclusive: 'wanderer_adv',   trigger: true, desc: '반격이 기본 공격의 120% 위력이 되고, 반격 시 [출혈] 2를 부여한다.' },
  conflag:   { id: 'conflag',   name: '겁화',   exclusive: 'sage_adv',       trigger: true, desc: '[화상]을 가진 적을 타격하면 화상 스택당 추가 3 피해. 발화 확률 60%.' },
  bloodlord: { id: 'bloodlord', name: '혈군',   exclusive: 'demonblood_adv', trigger: true, desc: 'HP가 50% 이하일 때 주는 데미지 +45%이며, 잃은 HP 1%당 추격 피해 +0.6.' },
  tempest:   { id: 'tempest',   name: '폭풍',   exclusive: 'elf_adv',        trigger: true, desc: '치명타마다 SP +12, 추가로 추격 피해가 2배로 들어간다.' },
  highdawn:  { id: 'highdawn',  name: '대여명', exclusive: 'priest_adv',     trigger: true, desc: '회복량 +60%. 회복할 때마다 회복량의 50%만큼 보호막을 얻는다.' },
  // --- 공용 (스탯형 — buriedDerived가 자동 반영) ---
  swordmastery: { id: 'swordmastery', name: '검술 숙련', fx: { physPct: 10 }, desc: '물리·기교 공격력 +10%.' },
  arcana:       { id: 'arcana',       name: '비전 지식', fx: { magPct: 10 },  desc: '마법 공격력 +10%.' },
  agility:      { id: 'agility',      name: '기민함',   fx: { dodge: 5 },    desc: '회피율 +5%.' },
  lightstep:    { id: 'lightstep',    name: '경신술',   fx: { dodge: 8 },    desc: '회피율 +8%.' },
  precision:    { id: 'precision',    name: '정밀',     fx: { crit: 6 },     desc: '치명 확률 +6%.' },
  toughness:    { id: 'toughness',    name: '강인함',   fx: { hp: 34 },      desc: '최대 HP +34.' },
  willpower:    { id: 'willpower',    name: '정신력',   fx: { sp: 9 },       desc: '최대 SP +9.' },
  faith:        { id: 'faith',        name: '신앙',     fx: { hp: 32, healPct: 15 }, desc: '최대 HP +32, 회복량 +15%.' },
  wardstone:    { id: 'wardstone',    name: '수호석',   fx: { barrier: 45 }, desc: '전투 시작 시 보호막 +45.' },
  sanguine:     { id: 'sanguine',     name: '흡혈 기질', fx: { drainPct: 6 }, desc: '주는 피해의 6%만큼 HP를 회복한다.' },
  // 1.109.0 — 조우 해금 직업 전용
  // 1.116.0 — 던전 심층 직업 전용
  pathfinder: { id: 'pathfinder', name: '길잡이',     exclusive: 'mazewarden', trigger: true, desc: '전투를 SP +25%로 시작하고, 층을 오를 때 방 선택지가 1개 더 늘어난다.' },
  pestilence: { id: 'pestilence', name: '역병',       exclusive: 'plaguedoc',  trigger: true, desc: '내가 거는 모든 상태이상의 스택이 +1 된다.' },
  freefall:   { id: 'freefall',   name: '자유낙하',   exclusive: 'chasmrager', trigger: true, desc: '잃은 HP 1%당 주는 피해 +0.4% (최대 +32%).' },
  voidsight:  { id: 'voidsight',  name: '공허시',     exclusive: 'voidwalker', trigger: true, desc: '어둠 속에서도 적의 수치가 보이고, 매 전투 첫 공격의 피해 +50%.' },
  // 1.116.0 — 던전 심층 특성 (150층 도달 해금, 모든 캐릭터에 자동 적용)
  echoMaze: { id: 'echoMaze', name: '미궁의 메아리', fx: { sp: 14, crit: 3 },      desc: '[미궁 150층] 최대 SP +14, 치명 확률 +3%.' },
  rotVein:  { id: 'rotVein',  name: '부패 혈맥',     fx: { drainPct: 4, healPct: 10 }, desc: '[폐허 150층] 흡혈 +4%, 회복량 +10%.' },
  ironFall: { id: 'ironFall', name: '낙하 단련',     fx: { hp: 60, physPct: 5 },   desc: '[나락 150층] 최대 HP +60, 물리·기교 공격력 +5%.' },
  nightEye: { id: 'nightEye', name: '밤눈',          fx: { crit: 5, dodge: 4 },    desc: '[심연 150층] 치명 확률 +5%, 회피율 +4%.' },
  bloodflow:  { id: 'bloodflow',  name: '혈류',       exclusive: 'magiblade', trigger: true, desc: '자해가 있는 스킬을 쓸 때마다 이 전투 동안 주는 데미지 +15% (최대 +150%).' },
  // 1.152.0 — 조직 3직업도 전용 특성이 없어 정체성이 비어 있었다 (성기사 포함 4직업 보완)
  necromancy: { id: 'necromancy', name: '사령술(死靈術)', exclusive: 'necroseer', trigger: true, desc: '적에게 걸린 디버프 종류당 주는 피해 +8% (최대 +32%).' },
  iaido:      { id: 'iaido',      name: '거합(居合)',     exclusive: 'ronin',     trigger: true, desc: '매 전투 첫 공격의 위력이 2배가 된다.' },
  blackplate: { id: 'blackplate', name: '흑갑(黑甲)',     exclusive: 'darkknight', fx: { takenPct: -15, physPct: 10 }, desc: '어둠을 갑주처럼 두른다. 받는 피해 -15%, 물리·기교 공격력 +10%.' },
  crusade:    { id: 'crusade',    name: '성전(聖戰)', exclusive: 'paladin',  trigger: true, desc: '🔷보호막이 남아 있는 동안 주는 피해 +25%.' },
  cursedblood:{ id: 'cursedblood',name: '저주받은 혈족', exclusive: 'vampire', trigger: true, fx: { hpMult: 0.6 }, desc: '최대 HP가 40% 줄어드는 대신, 전투 중 매 턴 최대 HP의 10%를 회복한다.' },
  fairywing:  { id: 'fairywing',  name: '요정의 날개', exclusive: 'fairy',   trigger: true, fx: { hpMult: 0.75 }, desc: '최대 HP가 25% 줄어드는 대신, 전투를 🧱방벽 2개로 시작한다.' },
  hunter:       { id: 'hunter',       name: '추격자',   fx: { chase: 9 },    desc: '추격 피해 +9.' },
};
export const getBuriedTrait = (id) => BURIED_TRAITS[id] || null;

// 캐릭터의 특성 목록 (전직했다면 상위 직업 기준)
export function buriedTraitIds(char) {
  const cls = getBuriedClass(char?.classId);
  // 1.116.0 — 심층 특성(150층 해금, 생성 시 구움)은 직업 특성 3개 뒤에 붙는다
  return [...(cls?.traits || []), ...(char?.depthTraits || [])];
}
// 스탯형 특성 합산 — buriedDerived가 호출
export function aggregateBuriedTraits(char) {
  const out = {};
  for (const id of buriedTraitIds(char)) {
    const t = BURIED_TRAITS[id];
    if (!t?.fx) continue;
    for (const [k, v] of Object.entries(t.fx)) {
      if (k === 'hpMult') out.hpMult = (out.hpMult || 1) * v; // 곱산 (감소 배율)
      else out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}
// 트리거형 특성 보유 여부 — 전투 화면이 판정에 사용
export const hasBuriedTrait = (char, id) => buriedTraitIds(char).includes(id);

// =========================================================
// 13. 전직 — 상위 직업 5종 (1.104.0)
// =========================================================
// 원작의 상위 직업 개념. 해당 직업으로 미궁(1번 던전)을 클리어하면 해금되고,
// 이후 새 캐릭터를 만들 때 선택할 수 있다. 능력치·특성이 전면 강화된다.
export const BURIED_ADVANCED_CLASSES = [
  {
    id: 'wanderer_adv', name: '무명검성', sub: 'Nameless Blade', color: '#e05a50', base: 'wanderer',
    image: './classes/wanderer.jpg', advanced: true,
    desc: '이름을 버린 검. 되돌아오는 칼날이 더 깊이 벤다.',
    lines: { weapon: 'sword', offhand: 'blade' },
    stats: { str: 16, dex: 12, int: 6, vit: 12 },
    traits: ['soulbind', 'swordmastery', 'precision'],
  },
  {
    id: 'sage_adv', name: '겁화술사', sub: 'Emberlord', color: '#7a5fb0', base: 'sage',
    image: './classes/sage.jpg', advanced: true,
    desc: '꺼지지 않는 불을 다루는 자. 태운 것은 되살아나지 않는다.',
    lines: { weapon: 'staff', offhand: 'tome' },
    stats: { str: 5, dex: 9, int: 19, vit: 9 },
    traits: ['conflag', 'arcana', 'willpower'],
  },
  {
    id: 'demonblood_adv', name: '마혈군주', sub: 'Blood Sovereign', color: '#b02626', base: 'demonblood',
    image: './classes/demonblood.jpg', advanced: true,
    desc: '피를 지배하는 자. 상처가 깊을수록 왕좌에 가깝다.',
    lines: { weapon: 'axe', offhand: 'claw' },
    stats: { str: 17, dex: 8, int: 6, vit: 15 },
    traits: ['bloodlord', 'toughness', 'sanguine'],
  },
  {
    id: 'elf_adv', name: '바람의 대사수', sub: 'Galewarden', color: '#95bd72', base: 'elf',
    image: './classes/elf.jpg', advanced: true,
    desc: '바람을 다스리는 궁수. 화살은 두 번 꽂힌다.',
    lines: { weapon: 'bow', offhand: 'quiver' },
    stats: { str: 7, dex: 17, int: 10, vit: 11 },
    traits: ['tempest', 'precision', 'hunter'],
  },
  {
    id: 'priest_adv', name: '여명의 대사제', sub: 'Highpriest of Dawn', color: '#e8c090', base: 'priest',
    image: './classes/priest.jpg', advanced: true,
    desc: '여명을 대리하는 자. 그 앞에서는 죽음도 물러선다.',
    lines: { weapon: 'mace', offhand: 'relic' },
    stats: { str: 6, dex: 8, int: 18, vit: 14 },
    traits: ['highdawn', 'faith', 'wardstone'],
  },
];
// 전 직업 목록 — 조우 직업(파일 하단 정의)까지 포함해야 하므로 호출 시점에 평가 (TDZ 회피)
export const buriedAllClasses = () => [...BURIED_CLASSES, ...BURIED_ADVANCED_CLASSES, ...BURIED_ENCOUNTER_CLASSES, ...BURIED_DEPTH_CLASSES, ...BURIED_UNION_CLASSES];

// =========================================================
// 14. 스킬 레벨 1~8 (1.104.0)
// =========================================================
// 원작 규칙: 같은 스킬을 다시 얻으면 레벨이 오르고, **Lv.3과 Lv.8에서 추가 효과**를 받는다 (8이 만렙).
// 여기서는 같은 스킬이 붙은 장비를 획득하면 그 스킬의 레벨이 오른다.
export const BURIED_SKILL_MAX_LV = 8;
export const buriedSkillLv = (char, skillId) =>
  Math.min(BURIED_SKILL_MAX_LV, Math.max(1, char?.skillLevels?.[skillId] || 1));

// 스킬 등급 A~D (A가 가장 희귀) — 드랍 가중치에 반영
export const BURIED_SKILL_RANKS = {
  A: { id: 'A', name: 'A', color: '#e8b04a', weight: 8 },
  B: { id: 'B', name: 'B', color: '#5c4a8c', weight: 17 },
  C: { id: 'C', name: 'C', color: '#7ba3c4', weight: 30 },
  D: { id: 'D', name: 'D', color: '#8b8378', weight: 45 },
};
// 등급은 SP 비용으로 자동 산출 — 비싼 스킬일수록 희귀하다 (데이터 중복 없이 일관)
export function buriedSkillRank(skill) {
  if (!skill) return 'D';
  const cost = (skill.sp || 0) + (skill.cd || 0) * 4;
  if (cost >= 30) return 'A';
  if (cost >= 20) return 'B';
  if (cost >= 13) return 'C';
  return 'D';
}

// 레벨이 반영된 실효 스킬 객체. 전투·표시 모두 이것만 쓴다.
//   - Lv.2~8 : 위력 +7% / 레벨 (누적)
//   - Lv.3   : 부여 상태이상 +1스택 (비공격기는 자기 강화 +1), SP -2
//   - Lv.8   : 위력 +10% 추가, 추격 피해 +20%, 상태이상 +1스택 더
// 스킬 데이터에 lv3 / lv8 오브젝트가 있으면 그쪽이 우선한다 (개별 개성 부여용).
// 1.132.0 — 스킬 종류별 레벨 효과 (PM 지적: 공통 공식은 절반의 스킬에 무의미했음)
//   공격기: 위력 +8%/Lv (상태이상 동반 시 +4%) · Lv.8 위력 +15%·추격 +20%
//   상태이상·버프기: Lv.3·Lv.8 스택 +1씩
//   회복·보호막기: +10%/Lv / SP기: 획득 +8%/Lv
//   전 스킬 공통: Lv.3 SP -2, 최대 사용 횟수 +8%/Lv (buriedSkillMaxUses)
export function buriedSkillAt(skill, lv = 1) {
  if (!skill) return skill;
  const L = Math.min(BURIED_SKILL_MAX_LV, Math.max(1, lv));
  if (L === 1) return skill;
  const out = { ...skill, lv: L };
  const steps = L - 1;
  const hasStatus = !!skill.apply;
  if (out.power) {
    const per = hasStatus ? 0.04 : 0.08;
    out.power = Math.round(skill.power * (1 + steps * per + (L >= 8 && !hasStatus ? 0.15 : 0)));
    if (L >= 8) out.chaseBonusPct = (out.chaseBonusPct || 0) + 20;
  }
  const stack = (L >= 3 ? 1 : 0) + (L >= 8 ? 1 : 0);
  if (stack > 0) {
    if (skill.apply) out.apply = skill.apply.map(a => ({ ...a, n: (a.n || 1) + stack }));
    if (skill.self) out.self = skill.self.map(a => ({ ...a, n: (a.n || 1) + stack }));
  }
  if (out.heal) out.heal = Math.round(skill.heal * (1 + steps * 0.10));
  if (out.barrierGain) out.barrierGain = Math.round(skill.barrierGain * (1 + steps * 0.10));
  if (out.spGain) out.spGain = Math.round(skill.spGain * (1 + steps * 0.08));
  if (L >= 3) out.sp = Math.max(0, out.sp - 2);
  if (skill.lv3 && L >= 3) Object.assign(out, skill.lv3);
  if (skill.lv8 && L >= 8) Object.assign(out, skill.lv8);
  return out;
}
// Lv.3 / Lv.8에서 무엇이 열리는지 안내 문구 (UI 표시용) — 1.132.0 스킬 종류별
export function buriedSkillLvNote(skill, lv) {
  const hasStatus = !!skill?.apply, hasSelf = !!skill?.self;
  const l3 = [hasStatus || hasSelf ? '스택 +1' : null, 'SP -2'].filter(Boolean).join(' · ');
  const l8 = [
    skill?.power ? (hasStatus ? '스택 +1' : '위력 +15% · 추격 +20%') : null,
    !skill?.power && (hasStatus || hasSelf) ? '스택 +1' : null,
  ].filter(Boolean).join(' · ') || '횟수 보너스';
  return [
    `${lv >= 3 ? '✓' : '·'} Lv.3 — ${l3}`,
    `${lv >= 8 ? '✓' : '·'} Lv.8 — ${l8}`,
    `· 레벨당 위력·회복 계열 강화 + 최대 사용 횟수 +8%`,
  ];
}

// =========================================================
// 스킬 사용 횟수 (1.132.0) — BB2 원작의 Remaining Uses
// =========================================================
// PM 결정: 빡빡하게(D30/C22/B15/A10) + 소진 시 스킬만 봉인(장비 스탯 유지).
// 잔여 = 최대(등급·레벨) - item.usesSpent — 레벨이 오르면 최대가 늘어 잔여도 함께 늘어난다.
// 구 세이브 장비는 usesSpent 없음 = 만충 (자연 호환). 기본 공격은 무제한.
export const BURIED_SKILL_USES = { D: 30, C: 22, B: 15, A: 10 };
export function buriedSkillMaxUses(skill, lv = 1) {
  const base = BURIED_SKILL_USES[buriedSkillRank(skill)] || 30;
  return Math.round(base * (1 + (Math.max(1, lv) - 1) * 0.08));
}
export function buriedSkillUsesLeft(char, slot) {
  const item = char?.equipped?.[slot];
  if (!item) return 0;
  const skill = BURIED_SKILLS[item.skillId];
  if (!skill) return 0;
  const max = buriedSkillMaxUses(skill, buriedSkillLv(char, item.skillId));
  return Math.max(0, max - (item.usesSpent || 0));
}
// 충전 (순수 함수) — pct 100 = 만충, 그 외엔 최대치의 pct%만큼 usesSpent 감소
export function rechargeBuriedUses(char, pct = 100) {
  if (!char) return char;
  const equipped = { ...char.equipped };
  for (const s of BURIED_SLOT_IDS) {
    const it = equipped[s];
    if (!it || !(it.usesSpent > 0)) continue;
    if (pct >= 100) { equipped[s] = { ...it, usesSpent: 0 }; continue; }
    const skill = BURIED_SKILLS[it.skillId];
    const max = buriedSkillMaxUses(skill, buriedSkillLv(char, it.skillId));
    equipped[s] = { ...it, usesSpent: Math.max(0, (it.usesSpent || 0) - Math.ceil(max * pct / 100)) };
  }
  return { ...char, equipped };
}
// 1.133.0 — PM 결정: 전 장비 일괄 충전 폐지 → 1장비 단위 충전만
// 지정 1장비 만충 (제단 「보충의 봉헌」용)
export function rechargeBuriedSlot(char, slotId) {
  const it = char?.equipped?.[slotId];
  if (!it || !(it.usesSpent > 0)) return char;
  return { ...char, equipped: { ...char.equipped, [slotId]: { ...it, usesSpent: 0 } } };
}
// 랜덤 1장비 만충 (야영용) — 소진분이 있는 슬롯 중 하나를 무작위로. 랜덤 롤이므로 setMeta updater 밖에서 호출할 것
export function rechargeBuriedRandomSlot(char) {
  const cands = BURIED_SLOT_IDS.filter(s => (char?.equipped?.[s]?.usesSpent || 0) > 0);
  if (cands.length === 0) return { char, item: null };
  const slot = cands[Math.floor(Math.random() * cands.length)];
  return { char: rechargeBuriedSlot(char, slot), item: char.equipped[slot] };
}

// =========================================================
// ⛓ 장비 파손 (1.134.0) — PM 지시: 어떤 효과로도 막을 수 없다
// =========================================================
// 스킬 사용 횟수가 0이 된 장비는 소진된 층(depletedAt)이 찍히고,
// BURIED_BREAK_GRACE(5)층 안에 충전하지 못하면 층 이동 시 부서져 사라진다.
// 층 이동(일반 advance·낙하 구멍 공용) 직후 호출 — 낙하로 건너뛴 층도 그대로 계산된다.
export const BURIED_BREAK_GRACE = 5;
function isBuriedSlotDepleted(char, slot) {
  const it = char?.equipped?.[slot];
  if (!it || !BURIED_SKILLS[it.skillId]) return false;
  return (it.usesSpent || 0) > 0 && buriedSkillUsesLeft(char, slot) <= 0;
}
export function tickBuriedGearBreak(char) {
  if (!char) return { char, broken: [], marked: [] };
  const floor = char.floor || 1;
  const broken = [];  // 이번 이동으로 부서진 장비
  const marked = [];  // 이번 이동에 소진이 처음 확인된 장비 (경고용)
  let changed = false;
  const equipped = { ...char.equipped };
  for (const s of BURIED_SLOT_IDS) {
    const it = equipped[s];
    if (!it) continue;
    if (!isBuriedSlotDepleted(char, s)) {
      // 충전됐으면 파손 카운트 해제
      if (it.depletedAt != null) { equipped[s] = { ...it, depletedAt: null }; changed = true; }
      continue;
    }
    if (it.depletedAt == null) { equipped[s] = { ...it, depletedAt: floor }; marked.push(it); changed = true; continue; }
    if (floor - it.depletedAt >= BURIED_BREAK_GRACE) { broken.push(it); equipped[s] = null; changed = true; }
  }
  return changed ? { char: { ...char, equipped }, broken, marked } : { char, broken, marked };
}
// 파손까지 남은 층 (표시용) — 소진 상태가 아니면 null
export function buriedBreakIn(char, slot) {
  if (!isBuriedSlotDepleted(char, slot)) return null;
  const it = char.equipped[slot];
  const from = it.depletedAt != null ? it.depletedAt : (char.floor || 1);
  return Math.max(0, BURIED_BREAK_GRACE - ((char.floor || 1) - from));
}

// 장비 획득 시 스킬 레벨 상승 (이미 만렙이면 그대로)
export function raiseBuriedSkill(char, skillId) {
  // 저주 「나베리우스」 — 스킬 레벨 상승 불가
  if ((char?.curses || []).includes('naberius')) return { char, raised: false, lv: char?.skillLevels?.[skillId] || 1 };
  const cur = char?.skillLevels?.[skillId] || 1;
  if (cur >= BURIED_SKILL_MAX_LV) return { char, raised: false, lv: cur };
  const lv = cur + 1;
  return { char: { ...char, skillLevels: { ...(char.skillLevels || {}), [skillId]: lv } }, raised: true, lv };
}

// =========================================================
// 15. 방 효과 / 층 효과 (1.104.0)
// =========================================================
// 원작 규칙: 방의 색마다 효과가 다르고, **이름이 붉은 방은 나와 적 모두에게** 적용된다.
// 색 우선순위(원작): 빨강 → 초록 → 파랑 → 보라 → 노랑 → 하늘 → 검정.
// 층 자체에 걸리는 효과도 있으며 다음 층으로 올라가면 사라진다.
export const BURIED_ROOM_COLORS = {
  red:    { id: 'red',    color: '#c4453d', order: 0 },
  green:  { id: 'green',  color: '#7a9a5e', order: 1 },
  blue:   { id: 'blue',   color: '#7ba3c4', order: 2 },
  purple: { id: 'purple', color: '#5c4a8c', order: 3 },
  yellow: { id: 'yellow', color: '#e8b04a', order: 4 },
  sky:    { id: 'sky',    color: '#9fd0e8', order: 5 },
  black:  { id: 'black',  color: '#6b6b6b', order: 6 },
};

// fx 키 — 전투 화면이 그대로 읽는다
//   dmgPct / takenPct / healPct / critAdd / dodgeAdd / spAdd / statusChancePct / spCostPct
//   goldPct / hpDrainPct(턴당 최대HP %) / hpRegenPct / monsterLevel(진입 즉시 +N)
export const BURIED_ROOM_EFFECTS = [
  { id: 'bloodAltar',  name: '피의 제단',   color: 'red',    both: true,  fx: { dmgPct: 25 },            desc: '나와 적 모두 주는 데미지 +25%' },
  { id: 'agonyHall',   name: '고통의 방',   color: 'red',    both: true,  fx: { hpDrainPct: 4 },         desc: '나와 적 모두 매 턴 최대 HP의 4% 감소' },
  { id: 'ruinChamber', name: '붕괴의 방',   color: 'red',    both: true,  fx: { takenPct: 20 },          desc: '나와 적 모두 받는 데미지 +20%' },
  { id: 'mossGarden',  name: '이끼 정원',   color: 'green',  both: false, fx: { hpRegenPct: 5 },         desc: '매 턴 최대 HP의 5% 회복' },
  { id: 'lifeSpring',  name: '생명의 샘',   color: 'green',  both: false, fx: { healPct: 50 },           desc: '회복량 +50%' },
  { id: 'frostHall',   name: '서리 회랑',   color: 'blue',   both: false, fx: { spAdd: 8 },              desc: '매 턴 SP +8 추가 회복' },
  { id: 'stillRoom',   name: '고요의 방',   color: 'blue',   both: true,  fx: { statusChancePct: -40 },  desc: '나와 적 모두 상태이상 부여 확률 -40%' },
  { id: 'cursedCrypt', name: '저주받은 묘실', color: 'purple', both: true, fx: { noHeal: true },          desc: '나와 적 모두 회복 불가' },
  { id: 'manaVortex',  name: '마력 소용돌이', color: 'purple', both: false, fx: { magPct: 35 },           desc: '마법 스킬 데미지 +35%' },
  { id: 'goldTomb',    name: '황금 무덤',   color: 'yellow', both: false, fx: { goldPct: 100 },          desc: '이 방의 골드 획득 2배' },
  { id: 'thunderRoom', name: '뇌명의 방',   color: 'yellow', both: true,  fx: { critAdd: 20 },           desc: '나와 적 모두 치명 확률 +20%' },
  { id: 'sunkenRoom',  name: '수몰된 방',   color: 'sky',    both: false, fx: { monsterLevel: 1, goldPct: 60 }, desc: '진입 즉시 마물 레벨 +1. 대신 골드 +60%' },
  { id: 'windPassage', name: '바람의 통로', color: 'sky',    both: false, fx: { dodgeAdd: 20 },          desc: '회피율 +20%' },
  { id: 'pitchDark',   name: '칠흑',       color: 'black',  both: true,  fx: { dodgeAdd: 15 },          desc: '나와 적 모두 회피율 +15%' },
  { id: 'sealedRoom',  name: '봉인의 방',   color: 'black',  both: false, fx: { spCostPct: 50 },         desc: '스킬 SP 소모 +50%' },
];
export const getBuriedRoomEffect = (id) => BURIED_ROOM_EFFECTS.find(e => e.id === id) || null;

export const BURIED_FLOOR_EFFECTS = [
  { id: 'tombBreath',  name: '무덤의 숨결', fx: { enemyDmgPct: 20 },  desc: '이 층의 모든 적이 주는 데미지 +20%' },
  { id: 'restfulDead', name: '망자의 가호', fx: { roomHealPct: 8 },   desc: '방에 들어설 때마다 HP 8% 회복' },
  { id: 'greedFloor',  name: '탐욕의 층',   fx: { goldPct: 50, takenPct: 15 }, desc: '골드 +50%, 받는 데미지 +15%' },
  { id: 'silentFloor', name: '정적의 층',   fx: { statusExtra: 1 },   desc: '내가 부여하는 상태이상 +1스택' },
  { id: 'ironFloor',   name: '강철의 층',   fx: { barrierAdd: 40 },   desc: '전투 시작 시 보호막 +40' },
];
export const getBuriedFloorEffect = (id) => BURIED_FLOOR_EFFECTS.find(e => e.id === id) || null;

// 방 효과 굴림 — 전투 계열 방에만 붙고, 확률은 던전 난이도를 따른다
export function rollBuriedRoomEffect(chance = 45) {
  if (Math.random() * 100 >= chance) return null;
  return pick(BURIED_ROOM_EFFECTS).id;
}
export function rollBuriedFloorEffect(chance = 22) {
  if (Math.random() * 100 >= chance) return null;
  return pick(BURIED_FLOOR_EFFECTS).id;
}

// 방+층 효과를 전투가 바로 읽을 수 있는 하나의 fx 뭉치로 합친다
// 반환: { self: {...}, foe: {...}, meta: { goldPct, monsterLevel } }
export function resolveBuriedEnvFx(roomEffectId, floorEffectId) {
  const self = {}, foe = {}, meta = { goldPct: 0, monsterLevel: 0 };
  const add = (bag, k, v) => { bag[k] = (bag[k] || 0) + v; };
  const room = getBuriedRoomEffect(roomEffectId);
  if (room) {
    for (const [k, v] of Object.entries(room.fx)) {
      if (k === 'goldPct') { meta.goldPct += v; continue; }
      if (k === 'monsterLevel') { meta.monsterLevel += v; continue; }
      if (k === 'noHeal') { self.noHeal = true; if (room.both) foe.noHeal = true; continue; }
      add(self, k, v);
      if (room.both) add(foe, k, v);
    }
  }
  const floor = getBuriedFloorEffect(floorEffectId);
  if (floor) {
    for (const [k, v] of Object.entries(floor.fx)) {
      if (k === 'goldPct') { meta.goldPct += v; continue; }
      if (k === 'enemyDmgPct') { add(foe, 'dmgPct', v); continue; }
      if (k === 'roomHealPct' || k === 'statusExtra' || k === 'barrierAdd') { add(self, k, v); continue; }
      add(self, k, v);
    }
  }
  return { self, foe, meta };
}

// =========================================================
// 16. 보호막 (Barrier) — 1.104.0
// =========================================================
// 원작의 핵심 내구 자원. HP 위에 덧씌워지며 피격 시 **먼저 소모**된다.
// 관통(pierce) 스킬·관통 옵션 추격은 보호막을 무시하고 HP를 직접 때린다.
// 반환: { barrier, hp, absorbed, toHp }
export function applyBuriedDamage(unit, dmg, { pierceBarrier = false } = {}) {
  const d = Math.max(0, Math.round(dmg));
  if (pierceBarrier || !unit.barrier || unit.barrier <= 0) {
    return { barrier: unit.barrier || 0, hp: unit.hp - d, absorbed: 0, toHp: d };
  }
  const absorbed = Math.min(unit.barrier, d);
  return { barrier: unit.barrier - absorbed, hp: unit.hp - (d - absorbed), absorbed, toHp: d - absorbed };
}

// =========================================================
// 17. 던전 4종 — 난이도 단계 (1.104.0)
// =========================================================
// 원작 규칙: 처음에는 미궁만 열려 있고, 조건을 만족하면 새 던전이 열린다.
// **마물 레벨은 층이 아니라 "지나온 방 수(걸음수)"로 오르며, 난이도가 높을수록 빨리 오른다.**
export const BURIED_DUNGEONS = [
  {
    id: 'labyrinth', name: '잊혀진 미궁', sub: 'The Forgotten Labyrinth', color: '#7ba3c4',
    floors: 10, stepsPerLevel: 4, baseLevel: 0, roomEffectChance: 40, floorEffectChance: 18,
    dropLuck: 1, goldMult: 1.0, expMult: 1.15,
    bossFloors: { 5: 'sealWitch', 10: 'tombTyrant' },
    unlock: null,
    desc: '열 개의 층. 바닥에는 먼저 내려간 자들의 유산이 쌓여 있다.',
    // 1.114.0 — 던전 고유 기믹 (난이도가 아닌 정체성 축)
    gimmick: { id: 'maze', name: '갈림길', icon: '🌀', desc: '길이 여럿으로 갈라진다 — 방 선택지가 항상 3~4개. 고르는 자에게 유리한 던전.' },
  },
  {
    id: 'ruins', name: '침몰한 폐허', sub: 'The Sunken Ruins', color: '#7a9a5e',
    floors: 12, stepsPerLevel: 4, baseLevel: 2, roomEffectChance: 55, floorEffectChance: 26,
    dropLuck: 2, goldMult: 1.4, expMult: 1.25,
    bossFloors: { 6: 'boneGiant', 12: 'tombTyrant' },
    unlock: 'labyrinth',
    desc: '물에 잠긴 층계. 걸음이 빨라질수록 마물도 빨리 자란다.',
    gimmick: { id: 'flood', name: '침수', icon: '🌊', desc: '물에 잠겨 상처가 곪는다 — 모든 지속피해(중독·출혈·화상) +50%, 회복 -25%. 나와 적 모두. 도트 빌드의 던전.' },
  },
  {
    id: 'chasm', name: '나락의 계단', sub: 'The Chasm Stair', color: '#c4453d',
    floors: 14, stepsPerLevel: 3, baseLevel: 4, roomEffectChance: 65, floorEffectChance: 34,
    dropLuck: 3, goldMult: 1.9, expMult: 1.5,
    bossFloors: { 7: 'twilightHusk', 14: 'tombTyrant' },
    unlock: 'ruins',
    desc: '내려갈수록 좁아지는 계단. 한 걸음마다 무언가가 자란다.',
    gimmick: { id: 'chute', name: '낙하 구멍', icon: '🕳', desc: '가끔 바닥이 꺼져 있다 — 최대 HP 25%를 바치고 3층 아래로 뛰어내린다. 마물이 자라기 전에 깊이 닿는 지름길.' },
  },
  {
    id: 'abyss', name: '심연', sub: 'The Abyss', color: '#5c4a8c',
    floors: 20, stepsPerLevel: 2, baseLevel: 6, roomEffectChance: 75, floorEffectChance: 42,
    dropLuck: 5, goldMult: 2.6, expMult: 1.8,
    bossFloors: { 5: 'boneGiant', 10: 'sealWitch', 15: 'twilightHusk', 20: 'tombTyrant' },
    unlock: 'chasm',
    desc: '끝이 있는지 아무도 모른다. 여기서 죽은 자의 장비만이 위로 올라간다.',
    gimmick: { id: 'dark', name: '어둠', icon: '🌑', desc: '아무것도 보이지 않는다 — 적의 체력·방어·회피 수치가 가려진다. 최고의 보상, 최악의 시야.' },
  },
];
export const getBuriedDungeon = (id) => BURIED_DUNGEONS.find(d => d.id === id) || BURIED_DUNGEONS[0];

// 걸음수 → 마물 레벨 (원작 규칙)
export function buriedMonsterLevel(char) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const steps = char?.steps || 0;
  // 「유유자적의 계약」 등 — 성장에 필요한 걸음 +N (fx 집계로 읽어 다른 출처도 자동 합산)
  const stepBonus = aggregateBuriedContracts(char).stepBonus || 0;
  return 1 + dg.baseLevel + Math.floor(steps / (dg.stepsPerLevel + stepBonus));
}

// 마물 레벨 기준 적 생성 (기존 층 기준 buriedEnemyAt을 대체)
export function buriedEnemyAtLevel(key, monLevel) {
  const base = BURIED_ENEMIES[key];
  if (!base) return null;
  const lv = Math.max(1, monLevel || 1);
  const m = 1 + (lv - 1) * 0.13;
  return {
    ...base,
    lv,
    hp: Math.round(base.hp * m),
    atk: Math.round(base.atk * m),
    def: Math.round(base.def * (1 + (lv - 1) * 0.08)),
    ...(base.startBarrier ? { startBarrier: Math.round(base.startBarrier * m) } : {}),
    exp: Math.round(base.exp * (1 + (lv - 1) * 0.1)),
    gold: [Math.round(base.gold[0] * m * (BURIED_TUNING.goldEarnMult || 1)), Math.round(base.gold[1] * m * (BURIED_TUNING.goldEarnMult || 1))], // 1.117.0 레벨 스케일 + 1.125.0 수입 -30%
  };
}

// 장비를 캐릭터에게 넣는 단일 창구 (드랍·부장품·상점 공용).
// 원작 규칙: **같은 스킬을 다시 얻으면 그 스킬의 레벨이 오른다.** 처음 보는 스킬이면 Lv.1로 등록.
// 1.113.0 — 인벤토리 폐지: 빈 슬롯이면 즉시 장착, 아니면 pendingLoot 대기열로 →
// 던전·로비 화면이 [교체 / 버리기] 모달을 띄운다. 스킬 레벨은 **획득 시점에** 오른다 (버려도 유지).
export function addBuriedItemToChar(char, item) {
  if (!char || !item) return { char, raised: false, lv: 1 };
  let c = char;
  const cur = c.skillLevels?.[item.skillId];
  let raised = false, lv = 1;
  if (cur) {
    const r = raiseBuriedSkill(c, item.skillId);
    c = r.char; raised = r.raised; lv = r.lv;
  } else {
    c = { ...c, skillLevels: { ...(c.skillLevels || {}), [item.skillId]: 1 } };
  }
  if (!c.equipped?.[item.slot]) c = { ...c, equipped: { ...c.equipped, [item.slot]: item } };
  else c = { ...c, pendingLoot: [...(c.pendingLoot || []), item] };
  return { char: c, raised, lv, equippedDirect: !char.equipped?.[item.slot], queued: !!char.equipped?.[item.slot] };
}

// 1.113.0 — pendingLoot 첫 항목 판단. replace=true면 기존 장비를 밀어내고 장착.
// 밀려나거나 버려진 장비는 자동 분해 → 먼지 반환. 반환: { char, dustGain, dismantled }
export function resolveBuriedLoot(char, replace) {
  const queue = char?.pendingLoot || [];
  if (queue.length === 0) return { char, dustGain: 0, dismantled: null };
  const item = queue[0];
  const rest = queue.slice(1);
  const ksMult = 1 + buriedKeystoneBonus(char).rewardPct / 100; // ⚓ 쐐기 보상 (1.128.0)
  if (!replace) {
    return { char: { ...char, pendingLoot: rest }, dustGain: Math.round(buriedDustValue(item) * ksMult), dismantled: item };
  }
  const prev = char.equipped?.[item.slot] || null;
  let next = { ...char, pendingLoot: rest, equipped: { ...char.equipped, [item.slot]: item } };
  next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
  return { char: next, dustGain: prev ? Math.round(buriedDustValue(prev) * ksMult) : 0, dismantled: prev };
}

// 협상 방 — 지불액과 보상. 마물 레벨이 높을수록 비싸고 크다.
export function buildBuriedNegotiation(char) {
  const lv = buriedMonsterLevel(char);
  const price = Math.round(45 + lv * 22);
  return {
    price,
    // 지불하면 전투 없이 통과 + 장비 1개. 거절하면 강적과 싸운다.
    reward: rollBuriedItem({ slot: null, classId: char.classId, floor: lv, luck: 4, powerMult: buriedLootPower(char) }),
  };
}

// 망자의 서고 — 올릴 수 있는 스킬 목록 (만렙 제외)
export function buriedLibraryChoices(char) {
  return buriedEquippedSkills(char)
    .map(x => ({ ...x, lv: buriedSkillLv(char, x.skill.id) }))
    .filter(x => x.lv < BURIED_SKILL_MAX_LV);
}

// =========================================================
// 18. 무덤 재련소 + 유산 보관함 확장 (1.105.0) — 무덤 먼지 소비처
// =========================================================
// PM 결정: 분해로 얻는 먼지의 용도 2종.
//   ① 재련소 — 슬롯을 골라 장비 제작. 레벨은 역대 최고 도달 층 기반 (죽어도 남는 진행도).
//   ② 유산 보관함 확장 — 6칸 → 최대 12칸.
export const BURIED_FORGE = {
  randomCost: 60,    // 랜덤 등급 제작 (1.125.0 — 40 → 60)
  epicCost: 400,     // 영웅의 이상 확정 제작 (1.125.0 — 180 → 400, 영웅 92% / 유물급 8%)
};
// 제작 장비 레벨 — 1.117.0: 역대 최고 도달 '층'을 **마물 레벨로 환산** (미궁 기준 4걸음/Lv).
// 층수를 그대로 장비 레벨로 쓰면 드랍(마물 레벨 기준) 대비 3.7배 파워 브레이크가 난다 (감사 픽스)
export const buriedForgeLevel = (deepest) => Math.max(3, 1 + Math.floor(Math.max(0, (deepest || 0) - 1) / 4));

export function craftBuriedItem({ slot, classId, deepest, epic = false, char = null }) {
  // 1.121.0 — 탐험 중이면 현재 깊이 기준으로 벼린다 (심층에서도 재련소가 의미를 갖도록)
  const floor = char ? buriedMonsterLevel(char) : buriedForgeLevel(deepest);
  const powerMult = char ? buriedLootPower(char) : 1;
  if (!epic) return rollBuriedItem({ slot, classId, floor, luck: 3, powerMult });
  const tier = Math.random() < 0.92 ? 'epic' : 'relic'; // 1.125.0 — 유물급 25% → 8% (등급 희소성 복원)
  return rollBuriedItem({ slot, classId, floor, tier, powerMult });
}

// =========================================================
// 19. 스킬 효과 풀이 (1.105.0) — "[파쇄] 2"가 무엇인지 그 자리에서 설명
// =========================================================
// 장비 상세·전투 상세가 공용으로 쓰는 설명 줄 생성기.
// 반환: [{ text, color }] — 상태이상 줄은 해당 상태 색.
export function buriedSkillEffectLines(skill) {
  if (!skill) return [];
  const lines = [];
  const push = (text, color = null) => lines.push({ text, color });
  if (skill.swift) push('⚡ 신속 — 사용해도 턴을 소모하지 않는다 (턴당 1회)', '#e8c8a0');
  if (skill.power) {
    if (skill.hits > 1) push(`${skill.hits}회 연속 타격 — 타격마다 위력 ${skill.power}% 적용`);
    if (skill.pierce) push('방어 무시 — 적 방어력을 계산하지 않는다');
    if (skill.critBonus) push(`이 스킬 한정 치명 확률 +${skill.critBonus}%`);
    if (skill.executeBelow) push(`적 HP ${skill.executeBelow}% 이하면 데미지 2배`);
    if (skill.berserk) push('잃은 HP 비율만큼 위력 증가 (최대 2배)');
    if (skill.drain) push(`준 피해의 ${skill.drain}%만큼 HP 회복`);
  }
  // 1.145.0 — 스택 환산치 (PM: 암산 없이 바로 보이게). 도트는 턴당 피해/회복, %형은 합산 %
  const STACK_PCT = { weaken: [-6, '주는 피해'], shatter: [-10, '적 방어'], bind: [20, '받는 피해'], curse: [15, '받는 피해'], rage: [10, '주는 피해'], guard: [-12, '받는 피해'], evade: [15, '회피'], aging: [-4, '주는 피해'] };
  const conv = (st, n) => st.tickDmg ? ` = 턴당 ${st.tickDmg * n} 피해`
    : st.tickHeal ? ` = 턴당 ${st.tickHeal * n} 회복`
    : STACK_PCT[st.id] ? ` = ${st.id === 'shatter' || st.id === 'guard' || st.id === 'weaken' || st.id === 'aging' ? '' : '+'}${STACK_PCT[st.id][0] * n}% ${STACK_PCT[st.id][1]}` : '';
  for (const a of skill.apply || []) {
    const st = BURIED_STATUS[a.s];
    if (!st) continue;
    push(`적에게 ${st.icon}[${st.name}] ${a.n}${a.p != null && a.p < 100 ? ` (${a.p}% 확률)` : ''}${conv(st, a.n)} — ${st.desc}`, st.color);
  }
  for (const a of skill.self || []) {
    const st = BURIED_STATUS[a.s];
    if (!st) continue;
    push(`자신에게 ${st.icon}[${st.name}] ${a.n}${conv(st, a.n)} — ${st.desc}`, st.color);
  }
  if (skill.heal) push(`자신 HP ${skill.heal} 회복`);
  if (skill.barrierGain) push(`보호막 +${skill.barrierGain} — HP보다 먼저 깎이는 추가 내구`);
  if (skill.spGain) push(`SP +${skill.spGain} 회복`);
  if (skill.selfDmg) push(`자해 ${skill.selfDmg} (보호막 무시)`);
  if (skill.reflect) push(`2턴간 받은 피해의 ${skill.reflect}%를 반사`);
  return lines;
}

// =========================================================
// 20. 전설의 무구 (1.106.0) — 커뮤니티 유니크 효과 30종
// =========================================================
// PM 제공: 베리드본즈 갤러리 「모든 효과 정리」의 유니크 효과 [84]~[113] 30종.
// 원작 그대로 옮길 수 없는 7종([91][103][106][108][109][110][112])은 우리 모드 문맥으로 각색.
// 획득처: **보스 확률 드랍 전용** (PM 결정). 일반 드랍·재련소에서는 절대 나오지 않는다.
//
// 규칙:
//   - slot은 전 직업 공용 4칸(armor/helm/acc1/acc2)만 사용 — 무기 계열 제한 문제 회피
//   - 내장 스킬은 기존 공용 스킬 재사용 (장비=스킬 원칙 유지)
//   - 효과 판정은 hasBuriedUnique(char, id)로 BuriedBattleScreen·DungeonScreen·App이 분기
//   - 보스는 즉사([u84]) 면역
const UQ = (o) => o;
export const BURIED_UNIQUES = [
  // ===== 전투 — 처형·화력 =====
  UQ({ id: 'u84',  name: '사신의 낫끝',     slot: 'acc',   skillId: 'bloodSigil',  src: 84,  desc: '공격 적중 시 HP가 절반 이하인 적을 즉사시킨다. (보스 면역)' }),
  UQ({ id: 'u90',  name: '파성추',          slot: 'acc',   skillId: 'sunderSigil', src: 90,  desc: '보호막과 방벽이 없는 적에게 데미지 3배.' }),
  UQ({ id: 'u93',  name: '거인 살해자',     slot: 'acc',   skillId: 'sunderSigil', src: 93,  desc: '공격 적중 시 적 최대 HP의 3% 추가 피해 (보스 1.5%).' }),
  UQ({ id: 'u94',  name: '쌍둥이 검흔',     slot: 'acc',   skillId: 'berserkSigil',src: 94,  desc: '공격 스킬이 2회 시전되지만 위력은 절반이 된다.' }),
  UQ({ id: 'u87',  name: '도살자의 눈',     slot: 'acc',   skillId: 'bloodSigil',  src: 87,  desc: '치명타를 입힐 때마다 이 전투 동안 치명 확률 +2%.' }),
  UQ({ id: 'u99',  name: '연륜의 증표',     slot: 'acc',   skillId: 'lifeCharm',   src: 99,  desc: '스킬 위력이 캐릭터 레벨당 +2% 증가한다.' }),
  UQ({ id: 'u107', name: '거체의 반지',     slot: 'acc',   skillId: 'bloodSigil',  src: 107, desc: `물리·기교 공격력에 최대 HP의 ${BURIED_RING_HP_PCT}%를 고정 가산한다 (% 보정과 곱해지지 않는 별도 가산).` }),
  UQ({ id: 'u111', name: '마력 격막',       slot: 'acc',   skillId: 'venomSigil',  src: 111, desc: '마법 공격력이 보호막 수치의 30%만큼 증가한다.' }),
  // ===== 전투 — 방벽 =====
  UQ({ id: 'u89',  name: '최후의 성벽',     slot: 'armor', skillId: 'ironWall',    src: 89,  desc: 'HP가 0이 될 피해를 받을 때 방벽이 있으면 전부 소모하고 HP 1로 버틴다.' }),
  UQ({ id: 'u92',  name: '재생하는 성벽',   slot: 'armor', skillId: 'thornMail',   src: 92,  desc: '방벽이 없으면 턴 종료 시 방벽 1개를 얻는다.' }),
  UQ({ id: 'u96',  name: '축복의 벽돌',     slot: 'helm',  skillId: 'insight',     src: 96,  desc: '버프를 얻을 때마다 방벽 1개를 얻는다.' }),
  UQ({ id: 'u97',  name: '광인의 벽',       slot: 'helm',  skillId: 'focusMind',   src: 97,  desc: '[혼란]에 빠져도 행동이 실패하지 않고, 혼란 스택당 매 턴 방벽 1개를 얻는다.' }),
  UQ({ id: 'u105', name: '기절 수집가',     slot: 'acc',   skillId: 'silenceSigil',src: 105, desc: '적에게 [기절]을 부여할 때마다 방벽 1개를 얻는다.' }),
  UQ({ id: 'u104', name: '균열의 종',       slot: 'armor', skillId: 'regenScale',  src: 104, desc: '내 보호막이 깨지는 순간 적에게 [기절] 1을 부여한다.' }),
  // ===== 전투 — 상태이상·버프 =====
  UQ({ id: 'u88',  name: '증폭의 심장',     slot: 'armor', skillId: 'regenScale',  src: 88,  desc: '자신에게 거는 강화(버프) 스택이 2배가 된다.' }),
  UQ({ id: 'u95',  name: '균일한 저주',     slot: 'acc',   skillId: 'venomSigil',  src: 95,  desc: '내가 부여하는 상태이상 스택이 항상 5가 된다.' }),
  UQ({ id: 'u98',  name: '거울 가면',       slot: 'helm',  skillId: 'intimidate',  src: 98,  desc: '내가 디버프에 걸릴 때 같은 디버프를 적에게도 건다.' }),
  UQ({ id: 'u86',  name: '뇌격의 고동',     slot: 'helm',  skillId: 'helmBash',    src: 86,  desc: '적을 기절시킬 때마다 모든 스킬의 쿨다운이 1 줄어든다.' }),
  UQ({ id: 'u113', name: '폭주 기관',       slot: 'acc',   skillId: 'berserkSigil',src: 113, desc: '모든 스킬의 쿨다운이 0이 되지만, 적이 거는 상태이상 스택 +1.' }),
  UQ({ id: 'u101', name: '시간 왜곡구',     slot: 'acc',   skillId: 'lifeCharm',   src: 101, desc: '스킬 쿨다운이 1턴을 초과하지 않는다.' }),
  // ===== 전투 — 특수 트리거 =====
  UQ({ id: 'u91',  name: '망자 사냥꾼',     slot: 'acc',   skillId: 'bloodSigil',  src: 91,  desc: '망령·정령·잔재 계열을 처치하면 최대 HP의 15%를 회복한다.' }),
  UQ({ id: 'u108', name: '역행의 모래시계', slot: 'acc',   skillId: 'lifeCharm',   src: 108, desc: '[노화]에 걸리면 즉시 제거하고 모든 쿨다운을 초기화한다.' }),
  UQ({ id: 'u109', name: '저주 포식자',     slot: 'acc',   skillId: 'silenceSigil',src: 109, desc: '[저주]에 걸릴 때마다 무덤 먼지 10을 얻는다.' }),
  UQ({ id: 'u106', name: '각성의 관',       slot: 'helm',  skillId: 'focusMind',   src: 106, desc: '전투를 SP 100%로 시작한다. (기본 55%)' }),
  // ===== 성장·탐험 =====
  UQ({ id: 'u85',  name: '성장의 씨앗',     slot: 'helm',  skillId: 'insight',     src: 85,  desc: '레벨이 오를 때마다 무작위 능력치 +2를 추가로 얻는다.' }),
  UQ({ id: 'u100', name: '수확자의 서',     slot: 'acc',   skillId: 'venomSigil',  src: 100, desc: '적 처치 시 75% 확률로 장착 스킬 하나의 레벨이 오른다.' }),
  UQ({ id: 'u102', name: '순례자의 성표',   slot: 'acc',   skillId: 'lifeCharm',   src: 102, desc: '층을 오를 때마다 25% 확률로 무작위 스킬 레벨이 오른다.' }),
  UQ({ id: 'u103', name: '상인의 인장',     slot: 'acc',   skillId: 'bloodSigil',  src: 103, desc: '무덤 상인의 판매 가격이 40% 할인된다.' }),
  UQ({ id: 'u110', name: '도굴왕의 곡괭이', slot: 'acc',   skillId: 'sunderSigil', src: 110, desc: '부장품 방에서 장비를 1개 더 얻는다.' }),
  UQ({ id: 'u112', name: '전당의 휘장',     slot: 'acc',   skillId: 'lifeCharm',   src: 112, desc: '전투 승리 골드 +50%.' }),
  // ===== 1.110.0 — 원전 도감 [1]~[83]에서 30종 추가 이식 =====
  UQ({ id: 'u1',   name: '그람',           slot: 'acc',   skillId: 'bloodSigil',  src: 1,   desc: '물리(완력) 스킬이 적중하면 완력 공격력의 30%만큼 추가 타격.' }),
  UQ({ id: 'u2',   name: '바람수리검',     slot: 'acc',   skillId: 'sunderSigil', src: 2,   desc: '기교 스킬이 적중하면 기교 공격력의 30%만큼 추가 타격.' }),
  UQ({ id: 'u3',   name: '오베론',         slot: 'acc',   skillId: 'venomSigil',  src: 3,   desc: '마법(지혜) 스킬이 적중하면 마법 공격력의 30%만큼 추가 타격.' }),
  UQ({ id: 'u8',   name: '미카엘',         slot: 'armor', skillId: 'regenScale',  src: 8,   desc: 'HP를 회복할 때마다 회복량만큼 적에게 피해를 준다.' }),
  UQ({ id: 'u6',   name: '달인',           slot: 'armor', skillId: 'ironWall',    src: 6,   desc: '전투가 끝나도 남은 보호막이 다음 전투로 이어진다.' }),
  UQ({ id: 'u7',   name: '드라큘라',       slot: 'armor', skillId: 'shadowCloak', src: 7,   desc: '적을 처치하면 HP를 전부 회복한다.' }),
  UQ({ id: 'u9',   name: '오니',           slot: 'acc',   skillId: 'bloodSigil',  src: 9,   desc: '물리(완력) 스킬의 쿨다운 -1.' }),
  UQ({ id: 'u10',  name: '고에몬',         slot: 'acc',   skillId: 'sunderSigil', src: 10,  desc: '기교 스킬의 쿨다운 -1.' }),
  UQ({ id: 'u11',  name: '미미르',         slot: 'acc',   skillId: 'venomSigil',  src: 11,  desc: '마법(지혜) 스킬의 쿨다운 -1.' }),
  UQ({ id: 'u17',  name: '아누비스',       slot: 'acc',   skillId: 'venomSigil',  src: 17,  desc: '내가 적에게 건 지속피해(도트)가 2배가 된다.' }),
  UQ({ id: 'u18',  name: '바빌론',         slot: 'helm',  skillId: 'intimidate',  src: 18,  desc: '피격 시 25% 확률로 같은 피해를 적에게 되돌린다.' }),
  UQ({ id: 'u20',  name: '늑대',           slot: 'armor', skillId: 'shadowCloak', src: 20,  desc: '턴 종료 시 무작위 스킬 쿨다운 -1.' }),
  UQ({ id: 'u21',  name: '모리건',         slot: 'helm',  skillId: 'focusMind',   src: 21,  desc: '주는 피해와 받는 피해가 모두 절반이 된다.' }),
  UQ({ id: 'u25',  name: '성스러운 유산',   slot: 'acc',   skillId: 'lifeCharm',   src: 25,  desc: '물리·기교·마법 공격력이 셋 중 가장 높은 값을 따라간다.' }),
  UQ({ id: 'u27',  name: '부(富)',         slot: 'acc',   skillId: 'bloodSigil',  src: 27,  desc: '전투 승리 골드 3배.' }),
  UQ({ id: 'u34',  name: '책사',           slot: 'helm',  skillId: 'insight',     src: 34,  desc: '피격당할 때마다 [격노] 1을 얻는다.' }),
  UQ({ id: 'u36',  name: '비전',           slot: 'acc',   skillId: 'venomSigil',  src: 36,  desc: '적을 처치할 때마다 모든 공격력 +0.5% (이번 런 영구 누적).' }),
  UQ({ id: 'u40',  name: '학식',           slot: 'acc',   skillId: 'lifeCharm',   src: 40,  desc: '경험치 2배.' }),
  UQ({ id: 'u41',  name: '왕관',           slot: 'helm',  skillId: 'focusMind',   src: 41,  desc: '방 효과·층 효과를 전부 무시한다.' }),
  UQ({ id: 'u42',  name: '공물',           slot: 'acc',   skillId: 'sunderSigil', src: 42,  desc: '적이 매 턴 최대 HP의 2%를 잃는다.' }),
  UQ({ id: 'u48',  name: '게헨나',         slot: 'acc',   skillId: 'berserkSigil',src: 48,  desc: '적이 회복할 때마다 회복량의 3배 피해를 준다.' }),
  UQ({ id: 'u52',  name: '다인슬라이프',   slot: 'acc',   skillId: 'berserkSigil',src: 52,  desc: '모든 공격이 치명타가 되지만, 받는 피해 +15%.' }),
  UQ({ id: 'u53',  name: '바쥬라',         slot: 'acc',   skillId: 'silenceSigil',src: 53,  desc: '모든 스킬의 쿨다운 -1.' }),
  UQ({ id: 'u56',  name: '심장',           slot: 'armor', skillId: 'regenScale',  src: 56,  desc: '매 턴 최대 HP의 12%를 회복한다.' }),
  UQ({ id: 'u57',  name: '기린의 뿔',      slot: 'acc',   skillId: 'silenceSigil',src: 57,  desc: '내가 거는 상태이상이 반드시 성공한다.' }),
  UQ({ id: 'u71',  name: '후손',           slot: 'helm',  skillId: 'insight',     src: 71,  desc: '모든 스킬 레벨 +1 (최대 8).' }),
  UQ({ id: 'u73',  name: '버섯',           slot: 'helm',  skillId: 'helmBash',    src: 73,  desc: '적이 거는 모든 상태이상을 무시한다.' }),
  UQ({ id: 'u76',  name: '씨앗',           slot: 'armor', skillId: 'thornMail',   src: 76,  desc: '전투를 🧱방벽 2개로 시작한다.' }),
  UQ({ id: 'u79',  name: '눈보라',         slot: 'acc',   skillId: 'sunderSigil', src: 79,  desc: '치명타마다 30% 확률로 적에게 [기절] 1.' }),
  UQ({ id: 'u83',  name: '수수께끼의 보석', slot: 'acc',   skillId: 'lifeCharm',   src: 83,  desc: '피격당할 때마다 15% 확률로 모든 쿨다운이 초기화된다.' }),

  // ===== 1.137.0 — 원전 도감 [1]~[83] 완성: 잔여 53종 =====
  // 원전 요약(docs/buried-reference.md)에 효과 기록이 있는 항목은 그대로/각색 이식.
  // 효과 기록이 없는 번호(13·14·24·29·30·37·39·45·46·47·50·67·70·72·82)는 이름·효과 모두 오리지널 각색.
  // fx 필드형은 선언형 fx bag(코드 0줄), 나머지는 uq() 분기 — 기존 규칙 동일.
  // --- 판정형 (전투 분기) ---
  UQ({ id: 'u4',   name: '카두세우스',      slot: 'acc',   skillId: 'lifeCharm',   src: 4,   desc: '보조(비공격) 스킬을 사용하면 마법 공격력의 25%만큼 적을 타격한다.' }),
  UQ({ id: 'u5',   name: '틈새경계',        slot: 'armor', skillId: 'mirrorPlate', src: 5,   desc: '쿨다운이 돌고 있는 스킬 1개당 받는 피해 -8% (최대 -32%).' }),
  UQ({ id: 'u12',  name: '세라핌',          slot: 'acc',   skillId: 'silenceSigil',src: 12,  desc: '보조(비공격) 스킬의 쿨다운 -1.' }),
  UQ({ id: 'u15',  name: '폭풍',            slot: 'acc',   skillId: 'sunderSigil', src: 15,  desc: '공격 스킬이 적중할 때마다 적에게 [파쇄] 1.' }),
  UQ({ id: 'u16',  name: '왕녀의 명령',     slot: 'acc',   skillId: 'fairyDust',   src: 16,  desc: '물약을 마시면 적이 현재 HP의 20%를 잃는다 (보스 10%).' }),
  UQ({ id: 'u19',  name: '부정한 피',       slot: 'armor', skillId: 'regenScale',  src: 19,  desc: '내가 받는 지속피해(출혈·중독·화상)가 같은 양의 회복으로 뒤집힌다.' }),
  UQ({ id: 'u22',  name: '심판자',          slot: 'helm',  skillId: 'intimidate',  src: 22,  desc: '전투를 시작할 때 적에게 [기절] 1.' }),
  UQ({ id: 'u23',  name: '변모',            slot: 'helm',  skillId: 'observe',     src: 23,  desc: '층을 오를 때마다 무작위 버프 2스택을 두르고 다음 전투를 시작한다.' }),
  UQ({ id: 'u28',  name: '합리주의',        slot: 'helm',  skillId: 'observe',     src: 28,  desc: '스킬의 부가 효과 1종당 위력 +25%.' }),
  UQ({ id: 'u31',  name: '오의',            slot: 'acc',   skillId: 'bloodSigil',  src: 31,  desc: '치명타를 입히면 10% 확률로 적을 즉사시킨다 (보스 면역).' }),
  UQ({ id: 'u32',  name: '혈기왕성',        slot: 'acc',   skillId: 'berserkSigil',src: 32,  desc: '자해 피해가 같은 양의 회복으로 뒤집힌다.' }),
  UQ({ id: 'u33',  name: '용신',            slot: 'armor', skillId: 'thornMail',   src: 33,  desc: '반사 스킬의 반사율 2배 + 반사 스킬 없이도 받은 피해의 10%를 반사한다.' }),
  UQ({ id: 'u35',  name: '사령술',          slot: 'acc',   skillId: 'grudge',      src: 35,  desc: '추격 피해가 2배가 된다.' }),
  UQ({ id: 'u38',  name: '투명화',          slot: 'armor', skillId: 'shadowCloak', src: 38,  desc: '일반 전투에서 적이 첫 턴에 나를 찾지 못한다 (강적·보스·재앙 제외).' }),
  UQ({ id: 'u49',  name: '변신',            slot: 'armor', skillId: 'bulwark',     src: 49,  desc: '보스·재앙 전투를 [격노] 2 + [수호] 2로 시작한다.' }),
  UQ({ id: 'u51',  name: '탐식자',          slot: 'helm',  skillId: 'warHorn',     src: 51,  desc: '전투를 시작할 때 적에게 [약화] 2.' }),
  UQ({ id: 'u54',  name: '건강한 잠',       slot: 'armor', skillId: 'regenScale',  src: 54,  desc: '야영의 휴식 회복량이 2배가 된다.' }),
  UQ({ id: 'u55',  name: '군림',            slot: 'helm',  skillId: 'chargeUp',    src: 55,  desc: '전투를 시작할 때 적에게 [파쇄] 2.' }),
  UQ({ id: 'u58',  name: '무념무상',        slot: 'helm',  skillId: 'focusMind',   src: 58,  desc: '피격당할 때마다 이 전투 동안 받는 피해 -3% (최대 -30%).' }),
  UQ({ id: 'u59',  name: '간계',            slot: 'acc',   skillId: 'venomSigil',  src: 59,  desc: '내가 부여하는 상태이상 스택이 2배가 된다. (「균일한 저주」 보유 시 그쪽 우선)' }),
  UQ({ id: 'u60',  name: '강령술',          slot: 'acc',   skillId: 'grudge',      src: 60,  desc: '모든 공격에 준 피해의 15%만큼 추격 피해가 붙는다.' }),
  UQ({ id: 'u61',  name: '휘황찬란',        slot: 'helm',  skillId: 'insight',     src: 61,  fx: { dodge: 8 }, desc: '적의 치명타를 무효화하고 회피율 +8%.' }),
  UQ({ id: 'u62',  name: '근심',            slot: 'armor', skillId: 'ironWall',    src: 62,  desc: '🧱방벽이 소모될 때 40% 확률로 소모되지 않는다.' }),
  UQ({ id: 'u63',  name: '스탬피드',        slot: 'acc',   skillId: 'sunderSigil', src: 63,  desc: '공격 스킬이 적중할 때마다 적 최대 HP -2%.' }),
  UQ({ id: 'u64',  name: '일그러진 사랑',   slot: 'acc',   skillId: 'fairyDust',   src: 64,  desc: '적에게 걸린 디버프 종류 1개당 주는 피해 +6%.' }),
  UQ({ id: 'u65',  name: '폭풍우',          slot: 'acc',   skillId: 'dragonFang',  src: 65,  desc: '스킬을 사용해도 30% 확률로 쿨다운이 시작되지 않는다.' }),
  UQ({ id: 'u68',  name: '끝없이 깊은 물',  slot: 'acc',   skillId: 'boneGraft',   src: 68,  desc: '쿨다운 2 이상의 스킬을 사용하면 최대 HP의 12%를 회복한다.' }),
  UQ({ id: 'u74',  name: '금줄',            slot: 'helm',  skillId: 'helmBash',    src: 74,  desc: '쿨다운을 늘리는 모든 효과(쐐기석·저주 등)를 무시한다.' }),
  UQ({ id: 'u75',  name: '한달음',          slot: 'acc',   skillId: 'lifeCharm',   src: 75,  desc: '이동해도 걸음이 절반만 쌓인다 — 마물 레벨이 느리게 오른다.' }),
  UQ({ id: 'u77',  name: '공허',            slot: 'acc',   skillId: 'silenceSigil',src: 77,  desc: '스킬 사용 횟수가 소모되지 않는다.' }),
  UQ({ id: 'u78',  name: '강인',            slot: 'armor', skillId: 'shieldBash',  src: 78,  desc: '받는 피해의 30%를 나중으로 미룬다 — 매 턴 종료 시 절반씩 청구된다 (보호막 무시).' }),
  UQ({ id: 'u80',  name: '빙벽',            slot: 'armor', skillId: 'ironWall',    src: 80,  desc: '전투를 🧱방벽 1개 + 보호막 30을 추가로 얻고 시작한다.' }),
  // --- 선언형 (fx bag — 코드 0줄) ---
  UQ({ id: 'u13',  name: '발키리의 깃털',   slot: 'armor', skillId: 'shadowCloak', src: 13,  fx: { dodge: 10, physPct: 8 },  desc: '전장을 굽어본다. 회피 +10%, 물리·기교 +8%.' }),
  UQ({ id: 'u14',  name: '거인의 힘줄',     slot: 'acc',   skillId: 'bloodSigil',  src: 14,  fx: { physPct: 15, hpMult: 1.08 }, desc: '태고의 근력. 물리·기교 +15%, 최대 HP +8%.' }),
  UQ({ id: 'u24',  name: '세이렌의 노래',   slot: 'helm',  skillId: 'warHorn',     src: 24,  fx: { statusChance: 15, magPct: 10 }, desc: '홀리는 선율. 상태이상 확률 +15%, 마법 +10%.' }),
  UQ({ id: 'u26',  name: '달콤한 향기',     slot: 'acc',   skillId: 'fairyDust',   src: 26,  fx: { healPct: 25, statusResist: 10 }, desc: '상처가 아무는 향. 회복 +25%, 상태이상 저항 +10%.' }),
  UQ({ id: 'u29',  name: '피의 성배',       slot: 'acc',   skillId: 'bloodSigil',  src: 29,  fx: { drainPct: 6 }, desc: '모든 공격에 흡혈 +6%.' }),
  UQ({ id: 'u30',  name: '운명의 실',       slot: 'acc',   skillId: 'lifeCharm',   src: 30,  fx: { expPct: 20, dropLuck: 1 }, desc: '실이 이끄는 길. 경험치 +20%, 드랍 운 +1.' }),
  UQ({ id: 'u37',  name: '신기루 외투',     slot: 'armor', skillId: 'shadowCloak', src: 37,  fx: { dodge: 12 }, desc: '있는 듯 없는 몸. 회피 +12%.' }),
  UQ({ id: 'u39',  name: '이지스의 파편',   slot: 'armor', skillId: 'bulwark',     src: 39,  fx: { takenPct: -12 }, desc: '신방패의 조각. 받는 피해 -12%.' }),
  UQ({ id: 'u43',  name: '보호막 전문가',   slot: 'armor', skillId: 'mirrorPlate', src: 43,  fx: { barrierHpPct: 30 }, desc: '전투 시작 보호막 = 최대 HP의 30%.' }),
  UQ({ id: 'u44',  name: '연구실의 후원',   slot: 'acc',   skillId: 'lifeCharm',   src: 44,  fx: { goldPct: 40, dropLuck: 2 }, desc: '후원이 닿는다. 골드 +40%, 드랍 운 +2.' }),
  UQ({ id: 'u45',  name: '여신의 눈물',     slot: 'acc',   skillId: 'boneGraft',   src: 45,  fx: { healPct: 30 }, desc: '모든 회복 +30%.' }),
  UQ({ id: 'u46',  name: '현자의 두루마리', slot: 'helm',  skillId: 'focusMind',   src: 46,  fx: { magPct: 15, spMult: 1.1 }, desc: '지혜의 기록. 마법 +15%, 최대 SP +10%.' }),
  UQ({ id: 'u47',  name: '불굴의 낙인',     slot: 'acc',   skillId: 'berserkSigil',src: 47,  fx: { physPct: 10, statusResist: 20 }, desc: '꺾이지 않는다. 물리·기교 +10%, 상태이상 저항 +20%.' }),
  UQ({ id: 'u50',  name: '늑대왕의 이빨',   slot: 'acc',   skillId: 'dragonFang',  src: 50,  fx: { crit: 8, physPct: 8 }, desc: '사냥의 본능. 치명 +8%, 물리·기교 +8%.' }),
  UQ({ id: 'u66',  name: '영원한 어둠',     slot: 'acc',   skillId: 'grudge',      src: 66,  fx: { physPct: 10, magPct: 10, healPct: -15 }, desc: '어둠이 힘을 준다. 모든 공격 +10% — 대신 회복 -15%.' }),
  UQ({ id: 'u67',  name: '쓰나미',          slot: 'acc',   skillId: 'venomSigil',  src: 67,  fx: { magPct: 20, spRegen: -1 }, desc: '삼키는 물결. 마법 +20% — 대신 SP 회복 -1.' }),
  UQ({ id: 'u69',  name: '견고',            slot: 'armor', skillId: 'ironWall',    src: 69,  fx: { takenPct: -15, dodge: -5 }, desc: '묵직하게 버틴다. 받는 피해 -15% — 대신 회피 -5%.' }),
  UQ({ id: 'u70',  name: '별의 너머',       slot: 'helm',  skillId: 'insight',     src: 70,  fx: { magPct: 12, crit: 6, expPct: 10 }, desc: '별 너머를 본 자. 마법 +12%, 치명 +6%, 경험치 +10%.' }),
  UQ({ id: 'u72',  name: '세계수의 가지',   slot: 'armor', skillId: 'regenScale',  src: 72,  fx: { hpMult: 1.12, healPct: 15 }, desc: '뿌리내린 생명. 최대 HP +12%, 회복 +15%.' }),
  UQ({ id: 'u81',  name: '고고학',          slot: 'helm',  skillId: 'observe',     src: 81,  fx: { expPct: -100, dropLuck: 6, goldPct: 50 }, desc: '성장을 멈추고 유물을 좇는다. 경험치 0 — 대신 드랍 운 +6, 골드 +50%.' }),
  UQ({ id: 'u82',  name: '육체의 변질',     slot: 'armor', skillId: 'shieldBash',  src: 82,  fx: { hpMult: 1.25, dodge: -8 }, desc: '몸이 부풀어 오른다. 최대 HP +25% — 대신 회피 -8%.' }),

  // ===== 던전 전용 유니크 16종 (1.115.0) — 그 던전의 **심층 보스**(정복 층 이후)만 떨어뜨린다 =====
  // 각 던전의 기믹 정체성을 강화하는 방향으로 설계 (PM 결정: 공략 요소)
  // 🌀 미궁 — 선택·탐험
  UQ({ id: 'dl1', dungeon: 'labyrinth', name: '미궁의 실타래',   slot: 'acc',    skillId: 'lifeCharm',   src: 0, desc: '[미궁 심층] 층을 오를 때 방 선택지가 1개 더 늘어난다.' }),
  UQ({ id: 'dl2', dungeon: 'labyrinth', name: '미로 걸음',       slot: 'helm',   skillId: 'focusMind',   src: 0, desc: '[미궁 심층] 층을 이동할 때마다 30% 확률로 최대 HP의 12%를 회복한다.' }),
  UQ({ id: 'dl3', dungeon: 'labyrinth', name: '선택자의 낫',     slot: 'weapon', skillId: 'decapitate',  src: 0, desc: '[미궁 심층] 방 선택지가 3개 이상이던 층에서는 전투를 [격노] 2로 시작한다.' }),
  UQ({ id: 'dl4', dungeon: 'labyrinth', name: '유산 도굴사',     slot: 'offhand',skillId: 'vitalStab',    src: 0, desc: '[미궁 심층] 전투 승리 시 장비 드랍 확률 +20%p.' }),
  // 🌊 폐허 — 도트·부패
  UQ({ id: 'dr1', dungeon: 'ruins', name: '가라앉은 왕의 창',    slot: 'weapon', skillId: 'fireball',    src: 0, desc: '[폐허 심층] 공격 스킬이 적중하면 [중독] 2를 추가로 부여한다.' }),
  UQ({ id: 'dr2', dungeon: 'ruins', name: '부패의 심장',         slot: 'armor',  skillId: 'regenScale',  src: 0, desc: '[폐허 심층] 적이 지속피해를 받을 때마다 그 50%만큼 내가 회복한다.' }),
  UQ({ id: 'dr3', dungeon: 'ruins', name: '침수된 성배',         slot: 'acc',    skillId: 'lifeCharm',   src: 0, desc: '[폐허 심층] 침수의 회복 페널티를 무시하고, 모든 회복 +25%.' }),
  UQ({ id: 'dr4', dungeon: 'ruins', name: '곪은 낫',             slot: 'offhand',skillId: 'laceration', src: 0, desc: '[폐허 심층] 지속피해를 앓는 적에게 주는 피해 +25%.' }),
  // 🕳 나락 — 낙하·희생
  UQ({ id: 'dc1', dungeon: 'chasm', name: '나락의 갈고리',       slot: 'acc',    skillId: 'bloodSigil',  src: 0, desc: '[나락 심층] 낙하 구멍의 HP 비용이 절반이 된다.' }),
  UQ({ id: 'dc2', dungeon: 'chasm', name: '추락자의 갑주',       slot: 'armor',  skillId: 'thornMail',   src: 0, desc: '[나락 심층] 낙하할 때마다 다음 전투를 🧱방벽 1로 시작한다.' }),
  UQ({ id: 'dc3', dungeon: 'chasm', name: '심락의 대검',         slot: 'weapon', skillId: 'decapitate',  src: 0, desc: '[나락 심층] 잃은 HP 1%당 주는 피해 +0.5% (최대 +40%).' }),
  UQ({ id: 'dc4', dungeon: 'chasm', name: '바닥 없는 주머니',    slot: 'offhand',skillId: 'manaDrain',    src: 0, desc: '[나락 심층] 골드 +50%, 전투 승리 시 최대 HP의 8%를 회복한다.' }),
  // 🌑 심연 — 어둠·일격
  UQ({ id: 'da1', dungeon: 'abyss', name: '심연의 눈',           slot: 'helm',   skillId: 'insight',     src: 0, desc: '[심연 심층] 어둠을 꿰뚫는다 — 적 수치가 다시 보이고, 치명 확률 +8%.' }),
  UQ({ id: 'da2', dungeon: 'abyss', name: '어둠에 벼린 칼',      slot: 'weapon', skillId: 'executioner', src: 0, desc: '[심연 심층] 매 전투 첫 공격의 피해가 2배가 된다.' }),
  UQ({ id: 'da3', dungeon: 'abyss', name: '그림자 장막',         slot: 'armor',  skillId: 'shadowCloak', src: 0, desc: '[심연 심층] 전투를 🧱방벽 1로 시작하고, 회피율 +8%.' }),
  UQ({ id: 'da4', dungeon: 'abyss', name: '종언의 낫',           slot: 'acc',    skillId: 'berserkSigil',src: 0, desc: '[심연 심층] HP 30% 이하의 적을 공격하면 20% 확률로 즉사시킨다 (보스 제외).' }),

  // ===== 1.127.0 — BB2 공식 데이터시트(伝説の武具 215행) 선별 이식 20종 =====
  // 선언형: fx bag(buriedUniqueFx)이 자동 합산 — 개별 분기 코드 0줄. rune/mod는 내장 각인.
  UQ({ id: 'lg1',  name: '미스릴의 문장',   slot: 'acc',   skillId: 'sunderSigil', src: 0, fx: { physPct: 12, crit: 5 }, rune: 'rKeen',
    desc: '장인의 물건. 물리·기교 +12%, 치명 +5% — 「예리한 룬」 내장.' }),
  UQ({ id: 'lg2',  name: '염무의 인장',     slot: 'acc',   skillId: 'dragonFang',  src: 0, fx: { physPct: 8, magPct: 8, statusChance: 10 },
    desc: '춤추는 불꽃. 모든 공격 +8%, 상태이상 확률 +10%.' }),
  UQ({ id: 'lg3',  name: '천뢰의 관',       slot: 'helm',  skillId: 'warHorn',     src: 0, fx: { crit: 8, magPct: 10 }, rune: 'rSpeed',
    desc: '벼락을 이고 있다. 치명 +8%, 마법 +10% — 「신속의 룬」 내장.' }),
  UQ({ id: 'lg4',  name: '독침',            slot: 'acc',   skillId: 'venomSigil',  src: 0, fx: { statusChance: 20 }, rune: 'rVenom',
    desc: '스치기만 해도 스민다. 상태이상 확률 +20% — 「맹독의 룬」 내장.' }),
  UQ({ id: 'lg5',  name: '별을 보는 자',    slot: 'helm',  skillId: 'focusMind',   src: 0, fx: { magPct: 18, spMult: 1.15 },
    desc: '별의 궤적을 읽는다. 마법 +18%, 최대 SP +15%.' }),
  UQ({ id: 'lg6',  name: '무라마사',        slot: 'acc',   skillId: 'bloodSigil',  src: 0, fx: { crit: 10, drainPct: 5, healPct: -20 }, rune: 'rRage',
    desc: '저주받은 요도. 치명 +10%, 흡혈 +5% — 대신 회복 -20%. 「격노의 룬」 내장.' }),
  UQ({ id: 'lg7',  name: '그람의 파편',     slot: 'acc',   skillId: 'dragonFang',  src: 0, fx: { physPct: 15 }, rune: 'rKing',
    desc: '용을 벤 검의 파편. 물리·기교 +15% — 「군주의 룬」 내장.' }),
  UQ({ id: 'lg8',  name: '거인의 망치',     slot: 'acc',   skillId: 'sunderSigil', src: 0, fx: { physPct: 20, dodge: -5 },
    desc: '들 수 있다는 게 기적. 물리·기교 +20% — 대신 회피 -5%.' }),
  UQ({ id: 'lg9',  name: '대지의 쐐기',     slot: 'acc',   skillId: 'fairyDust',   src: 0, fx: { statusChance: 25, magPct: 6 },
    desc: '박히면 굳는다. 상태이상 확률 +25%, 마법 +6%.' }),
  UQ({ id: 'lg10', name: '피뢰강주',        slot: 'helm',  skillId: 'observe',     src: 0, fx: { magPct: 12, statusResist: 15 },
    desc: '하늘의 분노를 흘려보낸다. 마법 +12%, 상태이상 저항 +15%.' }),
  UQ({ id: 'lg11', name: '풀 플레이트',     slot: 'armor', skillId: 'bulwark',     src: 0, fx: { hpMult: 1.15, takenPct: -10 },
    desc: '빈틈없는 강판. 최대 HP +15%, 받는 피해 -10%.' }),
  UQ({ id: 'lg12', name: '사교의 법의',     slot: 'armor', skillId: 'ironWall',    src: 0, fx: { barrierHpPct: 12, magPct: 8 },
    desc: '믿음이 곧 벽. 전투 시작 보호막 = 최대 HP의 12%, 마법 +8%.' }),
  UQ({ id: 'lg13', name: '귀족의 예복',     slot: 'armor', skillId: 'regenScale',  src: 0, fx: { hpMult: 1.08, barrierHpPct: 8, goldPct: 15 },
    desc: '부는 갑옷이 된다. 최대 HP +8%, 보호막 = 최대 HP의 8%, 골드 +15%.' }),
  UQ({ id: 'lg14', name: '만족장의 갑주',   slot: 'armor', skillId: 'shieldBash',  src: 0, fx: { hpMult: 1.12, physPct: 10 },
    desc: '백 번의 전장을 견딘 가죽. 최대 HP +12%, 물리·기교 +10%.' }),
  UQ({ id: 'lg15', name: '그리폰의 깃옷',   slot: 'armor', skillId: 'shadowCloak', src: 0, fx: { hpMult: 1.08, dodge: 8 },
    desc: '바람을 두른다. 최대 HP +8%, 회피 +8%.' }),
  UQ({ id: 'lg16', name: '야수 가죽',       slot: 'armor', skillId: 'thornMail',   src: 0, fx: { hpMult: 1.10, takenPct: -8 },
    desc: '거친 것일수록 질기다. 최대 HP +10%, 받는 피해 -8%.' }),
  UQ({ id: 'lg17', name: '닌자 장속',       slot: 'armor', skillId: 'shadowCloak', src: 0, fx: { dodge: 10, crit: 5 },
    desc: '그림자 분신의 옷. 회피 +10%, 치명 +5%.' }),
  UQ({ id: 'lg18', name: '근위 기사의 휘장', slot: 'acc',  skillId: 'lifeCharm',   src: 0, fx: { hpMult: 1.1, goldPct: 10 },
    desc: '왕가의 문양. 최대 HP +10%, 골드 +10%.' }),
  UQ({ id: 'lg19', name: '프레그런스',      slot: 'acc',   skillId: 'fairyDust',   src: 0, fx: { dropLuck: 2, goldPct: 12, expPct: 10 },
    desc: '행운의 향. 드랍 운 +2, 골드 +12%, 경험치 +10%.' }),
  UQ({ id: 'lg20', name: '탐험가의 나침반', slot: 'acc',   skillId: 'boneGraft',   src: 0, fx: { expPct: 15, dropLuck: 1, spRegen: 2 },
    desc: '길을 아는 자의 바늘. 경험치 +15%, 드랍 운 +1, SP 회복 +2.' }),

  // ===== 1.140.0 — BB2 伝説の武具 시트 2차 선별 이식 20종 (lg21~lg40) =====
  // 원전 무기류는 슬롯 규칙(공용 4칸)에 맞춰 장신구로 배치. 전부 선언형 fx — 분기 코드 0줄.
  UQ({ id: 'lg21', name: '헤르메스',        slot: 'acc',   skillId: 'lifeCharm',    src: 0, fx: { healPct: 25, spRegen: 2 },
    desc: '전령신의 가호. 회복 +25%, SP 회복 +2.' }),
  UQ({ id: 'lg22', name: '아사신',          slot: 'acc',   skillId: 'bloodSigil',   src: 0, fx: { crit: 12, physPct: 10 }, rune: 'rKeen',
    desc: '마무리는 한 번이면 족하다. 치명 +12%, 물리·기교 +10% — 「예리한 룬」 내장.' }),
  UQ({ id: 'lg23', name: '현인의 로브',     slot: 'armor', skillId: 'arcaneWard',   src: 0, fx: { barrierHpPct: 15, takenPct: -8, magPct: 10 },
    desc: '지혜가 몸을 감싼다. 보호막 = 최대 HP 15%, 받는 피해 -8%, 마법 +10%.' }),
  UQ({ id: 'lg24', name: '순결의 예복',     slot: 'armor', skillId: 'benediction',  src: 0, fx: { hpMult: 1.1, healPct: 20, statusResist: 15 },
    desc: '티끌 하나 앉지 않는 천. 최대 HP +10%, 회복 +20%, 상태이상 저항 +15%.' }),
  UQ({ id: 'lg25', name: '장기(瘴氣)의 장막', slot: 'armor', skillId: 'shadowCloak', src: 0, fx: { barrierHpPct: 18, statusChance: 15 },
    desc: '독무가 몸을 지킨다. 보호막 = 최대 HP 18%, 상태이상 확률 +15%.' }),
  UQ({ id: 'lg26', name: '약제사의 가운',   slot: 'armor', skillId: 'regenScale',   src: 0, fx: { hpMult: 1.08, statusResist: 25, healPct: 15 },
    desc: '조제된 면역. 최대 HP +8%, 상태이상 저항 +25%, 회복 +15%.' }),
  UQ({ id: 'lg27', name: '역전의 갑주',     slot: 'armor', skillId: 'ironWall',     src: 0, fx: { hpMult: 1.15, takenPct: -12 },
    desc: '백 번 이긴 자의 흉갑. 최대 HP +15%, 받는 피해 -12%.' }),
  UQ({ id: 'lg28', name: '메이지 플레이트', slot: 'armor', skillId: 'arcaneWard',   src: 0, fx: { takenPct: -10, magPct: 12 },
    desc: '술사를 위한 강판. 받는 피해 -10%, 마법 +12%.' }),
  UQ({ id: 'lg29', name: '혈염(血染)의 갑주', slot: 'armor', skillId: 'frenzy',     src: 0, fx: { hpMult: 1.2, drainPct: 4 },
    desc: '피에 젖을수록 단단해진다. 최대 HP +20%, 흡혈 +4%.' }),
  UQ({ id: 'lg30', name: '엘프의 숲',       slot: 'armor', skillId: 'camouflage',   src: 0, fx: { dodge: 10, crit: 6, hpMult: 1.05 },
    desc: '나뭇잎 사이의 호흡. 회피 +10%, 치명 +6%, 최대 HP +5%.' }),
  UQ({ id: 'lg31', name: '마법학교 제복',   slot: 'armor', skillId: 'mirrorPlate',  src: 0, fx: { barrierHpPct: 12, magPct: 14, spMult: 1.08 },
    desc: '수석 졸업생의 예복. 보호막 = 최대 HP 12%, 마법 +14%, 최대 SP +8%.' }),
  UQ({ id: 'lg32', name: '다크엘프의 화살통', slot: 'acc', skillId: 'venomSigil',   src: 0, fx: { statusChance: 20, physPct: 8 }, rune: 'rVenom',
    desc: '독 바른 화살이 마르지 않는다. 상태이상 확률 +20%, 물리·기교 +8% — 「맹독의 룬」 내장.' }),
  UQ({ id: 'lg33', name: '페스트 의사의 가면', slot: 'helm', skillId: 'observe',    src: 0, fx: { statusResist: 30, statusChance: 12 },
    desc: '역병을 다루는 부리 가면. 상태이상 저항 +30%, 상태이상 확률 +12%.' }),
  UQ({ id: 'lg34', name: '흑색 화약',       slot: 'acc',   skillId: 'berserkSigil', src: 0, fx: { physPct: BURIED_POWDER.physPct, takenPct: BURIED_POWDER.takenPct },
    desc: `터질 듯한 화력. 물리·기교 +${BURIED_POWDER.physPct}% (기본 공격력에 곱연산) — 대신 받는 피해 +${BURIED_POWDER.takenPct}%.` }),
  UQ({ id: 'lg35', name: '암기 은닉',       slot: 'acc',   skillId: 'sunderSigil',  src: 0, fx: { crit: 10, physPct: 8 }, rune: 'rPierce',
    desc: '소매 속의 마지막 수. 치명 +10%, 물리·기교 +8% — 「관통의 룬」 내장.' }),
  UQ({ id: 'lg36', name: '격투가의 붕대',   slot: 'acc',   skillId: 'bloodSigil',   src: 0, fx: { physPct: 14, dodge: 8 },
    desc: '맨손이 곧 무기. 물리·기교 +14%, 회피 +8%.' }),
  UQ({ id: 'lg37', name: '천사의 고리',     slot: 'helm',  skillId: 'insight',      src: 0, fx: { healPct: 30, hpMult: 1.08, magPct: 8 }, rune: 'rDawn',
    desc: '머리 위의 빛. 회복 +30%, 최대 HP +8%, 마법 +8% — 「여명의 룬」 내장.' }),
  UQ({ id: 'lg38', name: '설국(雪國)',      slot: 'acc',   skillId: 'fairyDust',    src: 0, fx: { magPct: 12, barrierHpPct: 10, statusChance: 12 }, rune: 'rBind',
    desc: '숨결마저 얼어붙는 나라. 마법 +12%, 보호막 = 최대 HP 10%, 상태이상 확률 +12% — 「속박의 룬」 내장.' }),
  UQ({ id: 'lg39', name: '시원한 바람',     slot: 'acc',   skillId: 'lifeCharm',    src: 0, fx: { spRegen: 3, dodge: 6 },
    desc: '지친 몸을 스치는 바람. SP 회복 +3, 회피 +6%.' }),
  UQ({ id: 'lg40', name: '이력(理力)의 인장', slot: 'acc',  skillId: 'silenceSigil', src: 0, fx: { spMult: 1.2, spRegen: 2, magPct: 8 },
    desc: '이성이 곧 힘. 최대 SP +20%, SP 회복 +2, 마법 +8%.' }),
  // 1.146.0 — 스택 상한 해제 전설무구 (PM 지시: 특정 조건으로 상한을 풀 수 있게)
  UQ({ id: 'lg41', name: '백화(百花)의 낙인', slot: 'acc', skillId: 'venomSigil', src: 0, fx: { statusChance: 15, statusUncap: 1 },
    desc: '고통이 만개한다 — 내가 거는 상태이상의 **스택 상한이 사라진다**. 상태이상 확률 +15%.' }),

  // ===== 1.143.0 — 👑 정점 유니크 (묘주 첫 격파 확정 지급 전용 — dungeon: 'apex'라 어떤 드랍 풀에도 안 들어간다) =====
  UQ({ id: 'tomb1', dungeon: 'apex', name: '묘주의 관(冠)', slot: 'helm', skillId: 'chargeUp', src: 0,
    fx: { physPct: 15, magPct: 15, hpMult: 1.15, takenPct: -10, dropLuck: 3 },
    desc: '[정점] 묘주를 꺾은 자만이 쓴다. 모든 공격 +15%, 최대 HP +15%, 받는 피해 -10%, 드랍 운 +3.' }),
];
export const getBuriedUnique = (id) => BURIED_UNIQUES.find(u => u.id === id) || null;

// 장착 중인 유니크 효과 보유 여부 — 전투·던전·App이 이것 하나로 분기
export function buriedUniqueIds(char) {
  if (!char) return [];
  const noAcc = buriedKeystoneFx(char).noAcc; // ⚓ 공허의 쐐기 — 장신구 유니크 효과도 봉인
  return BURIED_SLOT_IDS
    .filter(s => !(noAcc && (s === 'acc1' || s === 'acc2')))
    .map(s => char.equipped?.[s]?.unique)
    .filter(Boolean);
}
export const hasBuriedUnique = (char, id) => buriedUniqueIds(char).includes(id);

// ⚔ 선언형 유니크 fx bag (1.127.0) — BB2 전설무구 이식용.
// fx 필드를 가진 유니크만 합산 (구 유니크 76종은 fx 없음 → 기존 분기 그대로, 회귀 0).
// 어휘는 종족·특성·계약과 동일 — buriedDerived와 전투가 uf로 병합한다.
export function buriedUniqueFx(char) {
  const out = {};
  const noAcc = buriedKeystoneFx(char).noAcc;
  for (const s of BURIED_SLOT_IDS) {
    if (noAcc && (s === 'acc1' || s === 'acc2')) continue;
    const uid = char?.equipped?.[s]?.unique;
    const u = uid ? getBuriedUnique(uid) : null;
    if (!u?.fx) continue;
    for (const [k, v] of Object.entries(u.fx)) {
      if (k === 'hpMult' || k === 'spMult') out[k] = (out[k] || 1) * v;
      else out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

// 유니크 장비 생성 — 스탯은 전설 등급 배율, 이름·스킬·효과 고정.
// 1.115.0 — dungeonId·deep: 던전 전용 유니크는 그 던전 심층에서만 풀에 들어오고,
// 미보유 전용이 남아 있으면 50% 확률로 전용 쪽을 우선 뽑는다 (공략 목적지 역할)
export function rollBuriedUniqueItem({ classId, floor = 1, excludeIds = [], dungeonId = null, deep = false, powerMult = 1, forceId = null } = {}) {
  // 1.143.0 — forceId: 특정 유니크 확정 생성 (묘주의 관 등 정점 보상)
  const generic = BURIED_UNIQUES.filter(u => !u.dungeon && !excludeIds.includes(u.id));
  const exclusive = (deep && dungeonId)
    ? BURIED_UNIQUES.filter(u => u.dungeon === dungeonId && !excludeIds.includes(u.id))
    : [];
  const pool = exclusive.length > 0 && Math.random() < 0.5 ? exclusive : [...generic, ...exclusive];
  const forced = forceId ? BURIED_UNIQUES.find(u => u.id === forceId) : null;
  if (!forced && pool.length === 0) return null;
  const def = forced || pick(pool);
  const slotId = def.slot === 'acc' ? (Math.random() < 0.5 ? 'acc1' : 'acc2') : def.slot;
  const base = rollBuriedItem({ slot: slotId, classId, floor, tier: 'legend', powerMult });
  if (!base) return null;
  return {
    ...base,
    skillId: def.skillId,
    unique: def.id,
    name: def.name,
    // 1.127.0 — 전설무구는 접두어·룬을 내장한 채 떨어질 수 있다 (시트의 고정 효과 뭉치)
    // 1.146.0 — 다중 소켓: 내장 룬은 runes 배열 첫 칸, 소켓은 최소 1 보장
    ...(def.mod ? { mod: def.mod } : {}),
    ...(def.rune ? { runes: [def.rune], sockets: Math.max(1, base.sockets || 0) } : {}),
  };
}

// 보스 유니크 드랍 확률 (%) — 던전이 깊을수록 후하다. 최종 보스는 2배
export const BURIED_UNIQUE_DROP = { labyrinth: 8, ruins: 12, chasm: 16, abyss: 22 };
export function rollBuriedUniqueDrop({ dungeonId, isFinalBoss, classId, floor, ownedIds = [], guaranteed = false, deep = null, powerMult = 1 }) {
  const base = BURIED_UNIQUE_DROP[dungeonId] || 8;
  const chance = guaranteed ? 100 : base * (isFinalBoss ? 2 : 1);
  if (Math.random() * 100 >= chance) return null;
  // deep — 정복 층 **이후**만 전용 풀 개방 (1.117.0: 정복 층 당일 포함 off-by-one 픽스).
  // 미지정 시 기존 isFinalBoss 기준 유지 (재앙 등)
  return rollBuriedUniqueItem({ classId, floor, excludeIds: ownedIds, dungeonId, deep: deep === null ? !!isFinalBoss : !!deep, powerMult });
}

// 층 이동 시 유니크 [u102] 판정 — 25% 확률 무작위 스킬 레벨 +1
export function maybeBuriedFloorSkillUp(char) {
  if (!hasBuriedUnique(char, 'u102') || Math.random() >= 0.25) return { char, raised: null };
  const ids = buriedEquippedSkills(char)
    .map(x => x.skill.id)
    .filter(id => (char.skillLevels?.[id] || 1) < BURIED_SKILL_MAX_LV);
  if (ids.length === 0) return { char, raised: null };
  const id = pick(ids);
  const r = raiseBuriedSkill(char, id);
  return { char: r.char, raised: { id, lv: r.lv } };
}

// 유니크 [u91] — 망자 계열 판정
export const BURIED_UNDEAD_KEYS = ['graveWraith', 'rottedSpirit', 'twilightHusk'];

// =========================================================
// 21. 스킬 변화 — 접두어 (1.107.0)
// =========================================================
// 원작의 「변화」 시스템 (접두어 40종 중 13종 선별 이식).
// 장비에 붙어(item.mod) 내장 스킬을 개조한다. 부여처: 수상한 나그네 이벤트.
export const BURIED_MODS = {
  bloody:   { id: 'bloody',   name: '블러디',   desc: '위력 +35%, 사용 시 자해 8',        fx: { powerPct: 35, selfDmg: 8 } },
  reactive: { id: 'reactive', name: '반응형',   desc: '적중 시 다른 스킬 쿨다운 -1',       fx: { cdrOnHit: 1 } },
  vampiric: { id: 'vampiric', name: '흡혈',     desc: '준 피해의 25% 흡혈',               fx: { drain: 25 } },
  piercing: { id: 'piercing', name: '관통',     desc: '방어·보호막 무시',                 fx: { pierce: true } },
  light:    { id: 'light',    name: '경쾌한',   desc: 'SP 소모 -30%, 위력 -15%',          fx: { spPct: -30, powerPct: -15 } },
  double:   { id: 'double',   name: '더블',     desc: '위력 +100%, 쿨다운 2배(최소 2)',    fx: { powerPct: 100, cdMult: 2 } },
  legendary:{ id: 'legendary',name: '전설의',   desc: '위력 +20%, 쿨다운 -1',             fx: { powerPct: 20, cdAdd: -1 } },
  sharp:    { id: 'sharp',    name: '날카로운', desc: '이 스킬 치명 확률 +15%',           fx: { critBonus: 15 } },
  guarding: { id: 'guarding', name: '수호하는', desc: '사용 시 30% 확률 🧱방벽 +1',       fx: { wallChance: 30 } },
  covering: { id: 'covering', name: '덮는',     desc: '사용 시 보호막 +15',               fx: { barrierGain: 15 } },
  healing:  { id: 'healing',  name: '치유의',   desc: '사용 시 HP 12 회복',               fx: { heal: 12 } },
  venomous: { id: 'venomous', name: '유독성',   desc: '적중 시 [중독] 2 부여',            fx: { addApply: { s: 'poison', n: 2, p: 100 } } },
  binding:  { id: 'binding',  name: '묶는',     desc: '적중 시 [속박] 1 부여',            fx: { addApply: { s: 'bind', n: 1, p: 100 } } },
};
export const getBuriedMod = (id) => BURIED_MODS[id] || null;
export const rollBuriedMod = () => pick(Object.keys(BURIED_MODS));

// 접두어를 실효 스킬에 반영 — buriedSkillAt 결과에 이어 적용한다
// 접두어·룬 공용 fx 적용기 — 같은 어휘를 쓴다 (1.123.0에서 분리)
function applyBuriedSkillFx(out, fx) {
  if (fx.powerPct && out.power) out.power = Math.max(1, Math.round(out.power * (1 + fx.powerPct / 100)));
  if (fx.spPct) out.sp = Math.max(0, Math.round(out.sp * (1 + fx.spPct / 100)));
  if (fx.cdMult) out.cd = Math.max(2, (out.cd || 0) * fx.cdMult);
  if (fx.cdAdd) out.cd = Math.max(0, (out.cd || 0) + fx.cdAdd);
  if (fx.pierce) out.pierce = true;
  if (fx.critBonus) out.critBonus = (out.critBonus || 0) + fx.critBonus;
  if (fx.drain) out.drain = (out.drain || 0) + fx.drain;
  if (fx.heal) out.heal = (out.heal || 0) + fx.heal;
  if (fx.barrierGain) out.barrierGain = (out.barrierGain || 0) + fx.barrierGain;
  if (fx.selfDmg) out.selfDmg = (out.selfDmg || 0) + fx.selfDmg;
  if (fx.addApply && out.power) out.apply = [...(out.apply || []), fx.addApply];
  if (fx.wallChance) out.wallChance = Math.max(out.wallChance || 0, fx.wallChance); // 전투 화면이 판정
  if (fx.cdrOnHit) out.cdrOnHit = (out.cdrOnHit || 0) + fx.cdrOnHit;               // 전투 화면이 판정
  // 1.149.0 — 룬·룬워드 신규 어휘. 전부 기존 소비 지점이 이미 읽는 필드만 쓴다 (전투 코드 추가 0줄)
  if (fx.hitsAdd && out.power) out.hits = Math.max(1, (out.hits || 1) + fx.hitsAdd); // resolveBuriedAttack
  if (fx.executeBelow) out.executeBelow = Math.max(out.executeBelow || 0, fx.executeBelow); // resolveBuriedAttack
  if (fx.berserk) out.berserk = true;                                              // resolveBuriedAttack
  if (fx.reflect) out.reflect = (out.reflect || 0) + fx.reflect;                   // 전투 화면이 판정
  if (fx.spGain) out.spGain = (out.spGain || 0) + fx.spGain;                       // 전투 화면이 판정
  if (fx.swift) out.swift = true;                                                  // ⚡ 턴 미소모 (턴당 1회)
  return out;
}

// 1.146.0 — 다중 룬: runeIds는 단일 id(구 호환) 또는 배열. 룬워드 완성 시 fx 추가 적용
export function buriedModdedSkill(skill, modId, runeIds = null) {
  const runes = Array.isArray(runeIds) ? runeIds : runeIds ? [runeIds] : [];
  const mod = getBuriedMod(modId);
  if (!skill || (!mod && runes.length === 0)) return skill;
  let out = { ...skill };
  if (mod) { out.modId = modId; out = applyBuriedSkillFx(out, mod.fx); }
  for (const rid of runes) {
    const rune = getBuriedRune(rid);
    if (rune) { out.runeId = rid; out = applyBuriedSkillFx(out, rune.fx); }
  }
  const rw = buriedRunewordOf(runes);
  if (rw?.fx) { out.runewordId = rw.id; out = applyBuriedSkillFx(out, rw.fx); }
  return out;
}

// =========================================================
// 21b. ᚱ 룬 소켓 (1.123.0) — BB2 데이터시트 이식 2탄
// =========================================================
// 원작 규칙(도박 룰): 룬은 장비의 스킬에 영구 각인된다 — 제거·교체 불가.
// 그 장비를 버리거나 분해하면 룬도 함께 소멸한다. 장비당 소켓 1칸.
// fx 어휘는 접두어(BURIED_MODS)와 100% 동일 — applyBuriedSkillFx가 공용 적용.
export const BURIED_RUNE_RARITIES = {
  1: { stars: '★',      color: '#9b8975', name: '평범' },
  2: { stars: '★★',     color: '#7ba3c4', name: '전술' },
  3: { stars: '★★★',    color: '#c48bd4', name: '강력' },
  4: { stars: '★★★★',   color: '#e8b04a', name: '유일' },
  // 1.149.0 — ★5 전승급. **드랍되지 않는다** — 룬 융합으로만 얻는다 (rollBuriedRune은 1~4만 굴린다)
  5: { stars: '★★★★★', color: '#ff6b35', name: '전승' },
};
export const BURIED_RUNES = {
  // ★1 — 평범 (시트: パワー弱·コスト弱·シールダー·ヒーラー)
  rPower1: { id: 'rPower1', name: '힘의 룬',   rarity: 1, desc: '위력 +12%',                fx: { powerPct: 12 } },
  rSave1:  { id: 'rSave1',  name: '절약의 룬', rarity: 1, desc: 'SP 소모 -25%',             fx: { spPct: -25 } },
  rGuard1: { id: 'rGuard1', name: '수호의 룬', rarity: 1, desc: '사용 시 보호막 +12',        fx: { barrierGain: 12 } },
  rMend1:  { id: 'rMend1',  name: '치유의 룬', rarity: 1, desc: '사용 시 HP 10 회복',        fx: { heal: 10 } },
  rWhet1:  { id: 'rWhet1',  name: '숫돌의 룬', rarity: 1, desc: '이 스킬 치명 확률 +6%',     fx: { critBonus: 6 } },
  rSpark1: { id: 'rSpark1', name: '불씨의 룬', rarity: 1, desc: '적중 시 [화상] 1 부여',     fx: { addApply: { s: 'burn', n: 1, p: 100 } } },
  rBreath1:{ id: 'rBreath1',name: '호흡의 룬', rarity: 1, desc: '사용 시 SP +8 회수',        fx: { spGain: 8 } },
  // ★2 — 전술 (시트: スピード弱·クリティカル中·ステイン·パリィ 계열)
  rSpeed:  { id: 'rSpeed',  name: '신속의 룬', rarity: 2, desc: '쿨다운 -1',                fx: { cdAdd: -1 } },
  rKeen:   { id: 'rKeen',   name: '예리한 룬', rarity: 2, desc: '이 스킬 치명 확률 +12%',    fx: { critBonus: 12 } },
  rVenom:  { id: 'rVenom',  name: '맹독의 룬', rarity: 2, desc: '적중 시 [중독] 2 부여',     fx: { addApply: { s: 'poison', n: 2, p: 100 } } },
  rBind:   { id: 'rBind',   name: '결박의 룬', rarity: 2, desc: '적중 시 [속박] 1 부여',     fx: { addApply: { s: 'bind', n: 1, p: 100 } } },
  rWall:   { id: 'rWall',   name: '방벽의 룬', rarity: 2, desc: '사용 시 25% 확률 🧱방벽 +1', fx: { wallChance: 25 } },
  rFrost:  { id: 'rFrost',  name: '서리의 룬', rarity: 2, desc: '적중 시 [약화] 2 부여',     fx: { addApply: { s: 'weaken', n: 2, p: 100 } } },
  rGash:   { id: 'rGash',   name: '열상의 룬', rarity: 2, desc: '적중 시 [출혈] 2 부여',     fx: { addApply: { s: 'bleed', n: 2, p: 100 } } },
  rGrind:  { id: 'rGrind',  name: '분쇄의 룬', rarity: 2, desc: '적중 시 [파쇄] 2 부여',     fx: { addApply: { s: 'shatter', n: 2, p: 100 } } },
  rFocus:  { id: 'rFocus',  name: '집중의 룬', rarity: 2, desc: '사용 시 SP +16 회수',       fx: { spGain: 16 } },
  // ★3 — 강력 (시트: パワー中·レイジ弱·エンチャント 계열)
  rRage:   { id: 'rRage',   name: '격노의 룬', rarity: 3, desc: '위력 +30%, 사용 시 자해 6',  fx: { powerPct: 30, selfDmg: 6 } },
  rDrain:  { id: 'rDrain',  name: '흡혈의 룬', rarity: 3, desc: '준 피해의 20% 흡혈',        fx: { drain: 20 } },
  rPierce: { id: 'rPierce', name: '관통의 룬', rarity: 3, desc: '방어·보호막 무시',          fx: { pierce: true } },
  rChain:  { id: 'rChain',  name: '연쇄의 룬', rarity: 3, desc: '적중 시 다른 스킬 쿨다운 -1', fx: { cdrOnHit: 1 } },
  rTwin:   { id: 'rTwin',   name: '쌍격의 룬', rarity: 3, desc: '타격 +1회 — 대신 위력 -25%', fx: { hitsAdd: 1, powerPct: -25 } },
  rThunder:{ id: 'rThunder',name: '뇌명의 룬', rarity: 3, desc: '적중 시 35% [기절] 1',       fx: { addApply: { s: 'stun', n: 1, p: 35 } } },
  rWard:   { id: 'rWard',   name: '결계의 룬', rarity: 3, desc: '사용 시 보호막 +30',        fx: { barrierGain: 30 } },
  rEcho:   { id: 'rEcho',   name: '반향의 룬', rarity: 3, desc: '2턴간 받은 피해의 25% 반사',  fx: { reflect: 25 } },
  // ★4 — 유일급 (시트: 상위 희귀 룬 포지션)
  rDoom:   { id: 'rDoom',   name: '파멸의 룬', rarity: 4, desc: '위력 +65%, 쿨다운 2배(최소 2)', fx: { powerPct: 65, cdMult: 2 } },
  rKing:   { id: 'rKing',   name: '군주의 룬', rarity: 4, desc: '위력 +20%, 쿨다운 -1, 치명 +8%', fx: { powerPct: 20, cdAdd: -1, critBonus: 8 } },
  rDawn:   { id: 'rDawn',   name: '여명의 룬', rarity: 4, desc: '사용 시 HP 15 회복 + 보호막 +15', fx: { heal: 15, barrierGain: 15 } },
  rReaper: { id: 'rReaper', name: '사신의 룬', rarity: 4, desc: '적 HP 30% 이하면 위력 2배',   fx: { executeBelow: 30 } },
  rBlood:  { id: 'rBlood',  name: '광혈의 룬', rarity: 4, desc: '잃은 HP에 비례해 위력 증가',   fx: { berserk: true } },
  rTide:   { id: 'rTide',   name: '격류의 룬', rarity: 4, desc: '타격 +2회 — 대신 위력 -35%',  fx: { hitsAdd: 2, powerPct: -35 } },
  // ★5 — 전승급 (1.149.0). 드랍 없음 — ★4 융합으로만 얻는다
  rGenesis:  { id: 'rGenesis',  name: '태초의 룬', rarity: 5, desc: '위력 +40%, 치명 +15%',            fx: { powerPct: 40, critBonus: 15 } },
  rEternity: { id: 'rEternity', name: '영겁의 룬', rarity: 5, desc: '쿨다운 -2, SP 소모 -40%',         fx: { cdAdd: -2, spPct: -40 } },
  rApex:     { id: 'rApex',     name: '정점의 룬', rarity: 5, desc: '타격 +1회, 위력 +25% (감소 없음)', fx: { hitsAdd: 1, powerPct: 25 } },
  rOblivion: { id: 'rOblivion', name: '망각의 룬', rarity: 5, desc: '방어 무시, 위력 +30%, [저주] 1',  fx: { pierce: true, powerPct: 30, addApply: { s: 'curse', n: 1, p: 100 } } },
  rImmortal: { id: 'rImmortal', name: '불멸의 룬', rarity: 5, desc: '사용 시 HP 30 회복 + 보호막 +60', fx: { heal: 30, barrierGain: 60 } },
};
export const getBuriedRune = (id) => BURIED_RUNES[id] || null;

// 룬 드랍 굴림 — 등급 가중치(운이 상위 등급을 밀어 올린다) → 등급 내 균등
export function rollBuriedRune(luck = 0) {
  const w = { 1: 54, 2: 30, 3: 13 + luck, 4: 3 + luck / 2 };
  const total = w[1] + w[2] + w[3] + w[4];
  let roll = Math.random() * total;
  let rarity = 1;
  for (const r of [1, 2, 3, 4]) { roll -= w[r]; if (roll <= 0) { rarity = r; break; } }
  const pool = Object.values(BURIED_RUNES).filter(x => x.rarity === rarity);
  return pick(pool).id;
}

// =========================================================
// ᚱ 룬 융합 (1.149.0) — PM 지시 "룬끼리 조합해서 상위 룬, 성공확률 포함"
// =========================================================
// 규칙: **같은 등급 룬 3개 → 한 등급 위의 룬 1개** (무작위).
//   성공 → 재료 3개 전부 소모 + 상위 룬 1개 획득
//   실패 → 재료 **1개만** 소실 (2개는 돌아온다). 먼지 비용은 성패 무관 선지불.
// ★5는 드랍되지 않으므로 융합이 유일한 획득 경로다 (rollBuriedRune은 1~4만 굴린다).
// ⚠ 밸런스 조정은 이 표 한 곳.
export const BURIED_RUNE_FUSION = {
  1: { need: 3, rate: 80, dust: 0,   to: 2 },
  2: { need: 3, rate: 62, dust: 60,  to: 3 },
  3: { need: 3, rate: 42, dust: 150, to: 4 },
  4: { need: 3, rate: 22, dust: 400, to: 5 },
};
export const BURIED_RUNE_MAX_RARITY = 5;

// 융합 가능 여부·비용·확률 조회 (UI 표시 + 실행 전 검사 공용)
export function buriedFusionInfo(char, rarity, dust = 0) {
  const rule = BURIED_RUNE_FUSION[rarity];
  if (!rule) return null;
  const have = (char?.runes || []).filter(id => BURIED_RUNES[id]?.rarity === rarity).length;
  return {
    ...rule, rarity, have,
    enoughRunes: have >= rule.need,
    enoughDust: dust >= rule.dust,
    ok: have >= rule.need && dust >= rule.dust,
  };
}

// 융합 실행 — runeIdxs는 주머니에서 고른 재료 3개의 index (전부 같은 등급이어야 한다).
// 순수 함수가 아니다(Math.random) — 호출부는 setMeta updater **밖**에서 부를 것 (StrictMode 이중 실행 방지).
export function fuseBuriedRunes(char, runeIdxs, dust = 0) {
  const idxs = [...new Set(runeIdxs || [])];
  const pouch = char?.runes || [];
  const picked = idxs.map(i => BURIED_RUNES[pouch[i]]).filter(Boolean);
  if (picked.length !== idxs.length || picked.length === 0) return { char, ok: false, dustCost: 0, text: '재료를 다시 고르시오.' };
  const rarity = picked[0].rarity;
  if (picked.some(r => r.rarity !== rarity)) return { char, ok: false, dustCost: 0, text: '같은 등급의 룬만 융합할 수 있다.' };
  const rule = BURIED_RUNE_FUSION[rarity];
  if (!rule) return { char, ok: false, dustCost: 0, text: '★5는 더 위가 없다.' };
  if (picked.length !== rule.need) return { char, ok: false, dustCost: 0, text: `재료 ${rule.need}개를 골라야 한다.` };
  if (dust < rule.dust) return { char, ok: false, dustCost: 0, text: `먼지가 부족하다 (${rule.dust} 필요).` };

  const success = Math.random() * 100 < rule.rate;
  const sorted = [...idxs].sort((a, b) => b - a); // 뒤에서부터 지워야 index가 안 밀린다
  const next = [...pouch];
  if (success) {
    for (const i of sorted) next.splice(i, 1);
    const pool = Object.values(BURIED_RUNES).filter(r => r.rarity === rule.to);
    const got = pick(pool);
    next.push(got.id);
    return {
      char: { ...char, runes: next }, ok: true, dustCost: rule.dust, gained: got.id,
      text: `융합 성공! ${BURIED_RUNE_RARITIES[rule.to].stars} 「${got.name}」을(를) 얻었다.`,
    };
  }
  // 실패 — 재료 1개만 소실
  const lostIdx = sorted[Math.floor(Math.random() * sorted.length)];
  const lost = BURIED_RUNES[pouch[lostIdx]];
  next.splice(lostIdx, 1);
  return {
    char: { ...char, runes: next }, ok: false, dustCost: rule.dust, gained: null,
    text: `융합 실패 — 「${lost?.name}」이(가) 재로 흩어졌다. (나머지 2개는 남았다)`,
  };
}

// 등급 범위 지정 룬 굴림 — 보급 계약(1.129.0) 등 지급처용
export function rollBuriedRuneIn(minRar, maxRar) {
  const pool = Object.values(BURIED_RUNES).filter(r => r.rarity >= minRar && r.rarity <= maxRar);
  return pool.length > 0 ? pick(pool).id : null;
}

// 소켓 각인 (순수 함수) — 성공 시 주머니에서 제거 + 장비에 영구 각인
// 1.146.0 — 다중 소켓 헬퍼. 구세이브 장비(sockets 없음)는 1칸으로 취급 (기존 rune 1칸과 호환)
export const buriedItemSockets = (item) => item?.sockets ?? 1;
export const buriedItemRunes = (item) => (item?.runes && item.runes.length > 0) ? item.runes : (item?.rune ? [item.rune] : []);

// ⟪룬워드⟫ (1.146.0, PM 지시 — 디아블로 모티브): 소켓에 박은 룬의 **순서**가 조합과 정확히 일치하면 발동.
// fx = 그 장비 스킬에 추가 적용 (applyBuriedSkillFx 어휘) / charFx = 캐릭터 단위 특수 효과 (전투가 소비)
// ⟪룬워드⟫ (1.146.0 신설 / 1.149.0 전면 재설계 — PM 지적: 「질풍」의 방어 무시가 관통의 룬과 순수 중복이었다)
// 🔒 설계 원칙: **룬워드 효과는 구성 룬의 합으로는 절대 만들 수 없는 것이어야 한다.**
//    ① 불린 플래그(pierce·berserk·swift·statusUncap)는 구성 룬이 이미 주면 넣지 말 것 — 켜져 있는 걸 또 켜면 무효과다.
//    ② 수치는 겹쳐도 되지만(합산되어 실제로 오른다), 그것만 있으면 "그냥 더 센 룬"이라 재미가 없다.
//    ③ 가능하면 신규 메커니즘을 준다 — ⚡신속화 / 연격화(hitsAdd) / 처형(executeBelow) / 광폭(berserk) / 상한 해제.
//    검증: scripts 없이 node로 buriedRunewordAudit()를 돌리면 ①번 위반이 전부 잡힌다.
export const BURIED_RUNEWORDS = [
  // ===== 2룬 — 접근성 (초·중반에 노려볼 만하다) =====
  { id: 'rwSlaughter', name: '살육(殺戮)',   runes: ['rKeen', 'rRage'],        fx: { powerPct: 12, critBonus: 6 },
    desc: '위력 +12%, 치명 +6%' },
  { id: 'rwGale',      name: '질풍(疾風)',   runes: ['rSpeed', 'rPierce'],     fx: { cdAdd: -1, hitsAdd: 1 },
    desc: '쿨다운 -1 추가, 타격 +1회' },
  { id: 'rwFlash',     name: '섬광검(閃光劍)', runes: ['rSpeed', 'rKeen'],     fx: { swift: true },
    desc: '⚡ 이 스킬이 턴을 소모하지 않는다 (턴당 1회)' },
  { id: 'rwLeech',     name: '흡귀(吸鬼)',   runes: ['rDrain', 'rDoom'],       fx: { drain: 25, cdAdd: -2 },
    desc: '흡혈 +25%, 쿨다운 -2 (파멸의 2배 쿨을 상쇄한다)' },
  { id: 'rwAegis',     name: '수호자',       runes: ['rGuard1', 'rWall'],      fx: { barrierGain: 15, wallChance: 25 }, charFx: { takenPct: -6 },
    desc: '보호막 +15, 🧱방벽 확률 +25% · 받는 피해 -6%' },
  { id: 'rwDawnsong',  name: '여명의 노래',  runes: ['rMend1', 'rDawn'],       fx: { heal: 25, swift: true },
    desc: 'HP +25 회복 · ⚡ 턴을 소모하지 않는다' },
  { id: 'rwMajesty',   name: '군주의 위엄',  runes: ['rKing', 'rPower1'],      fx: { powerPct: 15, executeBelow: 25 },
    desc: '위력 +15% · 적 HP 25% 이하면 위력 2배' },
  { id: 'rwHemorrhage',name: '실혈(失血)',   runes: ['rGash', 'rVenom'],       fx: { hitsAdd: 1 },
    desc: '타격 +1회 — 출혈·중독도 타격 수만큼 겹겹이 박힌다' },
  { id: 'rwFrostbite', name: '동상(凍傷)',   runes: ['rFrost', 'rGrind'],      fx: { addApply: { s: 'stun', n: 1, p: 40 } },
    desc: '적중 시 40% [기절] 1 — 약화·파쇄가 얼어붙는다' },
  { id: 'rwIronwall',  name: '철벽(鐵壁)',   runes: ['rGuard1', 'rWard'],      fx: { barrierGain: 40 }, charFx: { takenPct: -8 },
    desc: '보호막 +40 · 받는 피해 -8%' },
  { id: 'rwBloodpact', name: '혈약(血約)',   runes: ['rRage', 'rDrain'],       fx: { berserk: true, drain: 20 },
    desc: '잃은 HP에 비례해 위력 증가 · 흡혈 +20%' },
  { id: 'rwThunder',   name: '뇌명(雷鳴)',   runes: ['rThunder', 'rChain'],    fx: { addApply: { s: 'stun', n: 1, p: 35 }, cdAdd: -1 },
    desc: '[기절] 확률 +35% (총 70%), 쿨다운 -1' },
  { id: 'rwSoulfeast', name: '혼찬(魂餐)',   runes: ['rDrain', 'rReaper'],     fx: { executeBelow: 40, drain: 15 },
    desc: '처형 임계 30%→40% · 흡혈 +15%' },
  { id: 'rwTempest',   name: '폭풍(暴風)',   runes: ['rTwin', 'rSpeed'],       fx: { hitsAdd: 1, powerPct: 25 },
    desc: '타격 +1회 (총 3연격), 위력 +25% — 쌍격의 손실을 메운다' },
  { id: 'rwMirror',    name: '경상(鏡像)',   runes: ['rEcho', 'rWard'],        fx: { reflect: 30, barrierGain: 20 },
    desc: '반사 +30% (총 55%), 보호막 +20' },
  { id: 'rwBreath',    name: '심호흡(深呼吸)', runes: ['rBreath1', 'rSave1'],  fx: { spGain: 14, swift: true },
    desc: 'SP 회수 +14 · ⚡ 턴을 소모하지 않는다' },
  { id: 'rwWhetstone', name: '연마(硏磨)',   runes: ['rWhet1', 'rGrind'],      fx: { critBonus: 14, executeBelow: 20 },
    desc: '치명 +14% · 적 HP 20% 이하면 위력 2배' },
  { id: 'rwPlague',    name: '역병(疫病)',   runes: ['rVenom', 'rSpark1'],     charFx: { statusUncap: true }, fx: { powerPct: 8 },
    desc: '⚠ 내가 거는 상태이상의 스택 상한 해제 · 위력 +8%' },
  { id: 'rwEclipse',   name: '식(蝕)',       runes: ['rOblivion', 'rDoom'],    fx: { powerPct: 35, cdAdd: -2 },
    desc: '위력 +35%, 쿨다운 -2' },
  { id: 'rwAscension', name: '승천(昇天)',   runes: ['rGenesis', 'rApex'],     fx: { hitsAdd: 1, powerPct: 30, critBonus: 10 },
    desc: '타격 +1회, 위력 +30%, 치명 +10%' },

  // ===== 3룬 — 심층 목표 (소켓 3칸 = 유물·전설 장비에만) =====
  { id: 'rwNether',    name: '명적(冥籍)',   runes: ['rBind', 'rSave1', 'rKing'],        fx: { spPct: -30, cdAdd: -1 },
    desc: 'SP 소모 -30% 추가, 쿨다운 -1 추가' },
  { id: 'rwBloom',     name: '만개(滿開)',   runes: ['rVenom', 'rChain', 'rDoom'],       fx: { powerPct: 5 }, charFx: { statusUncap: true },
    desc: '⚠ 상태이상 스택 상한 해제 · 위력 +5%' },
  { id: 'rwCarnage',   name: '학살(虐殺)',   runes: ['rKeen', 'rRage', 'rTwin'],         fx: { hitsAdd: 1, critBonus: 15, powerPct: 15 },
    desc: '타격 +1회 (총 3연격), 치명 +15%, 위력 +15%' },
  { id: 'rwPurgatory', name: '연옥(煉獄)',   runes: ['rSpark1', 'rVenom', 'rGash'],      fx: { hitsAdd: 1 }, charFx: { statusUncap: true },
    desc: '⚠ 상태이상 상한 해제 + 타격 +1회 — 도트 3종이 두 배로 쌓인다' },
  { id: 'rwSanctuary', name: '성역(聖域)',   runes: ['rMend1', 'rGuard1', 'rDawn'],      fx: { heal: 40, barrierGain: 40, swift: true },
    desc: 'HP +40, 보호막 +40 · ⚡ 턴을 소모하지 않는다' },
  { id: 'rwRuin',      name: '파멸의 전조',  runes: ['rDoom', 'rPierce', 'rRage'],       fx: { powerPct: 45, cdAdd: -2 },
    desc: '위력 +45%, 쿨다운 -2' },
  { id: 'rwPhantom',   name: '환영(幻影)',   runes: ['rSpeed', 'rChain', 'rKeen'],       fx: { swift: true, cdrOnHit: 1 },
    desc: '⚡ 턴 미소모 · 적중 시 다른 스킬 쿨다운 -1 추가' },
  { id: 'rwGluttony',  name: '폭식(暴食)',   runes: ['rDrain', 'rTide', 'rReaper'],      fx: { drain: 30, executeBelow: 35, powerPct: 20 },
    desc: '흡혈 +30%, 처형 35%, 위력 +20% (격류의 손실 보전)' },
  { id: 'rwJudgment',  name: '심판(審判)',   runes: ['rKing', 'rReaper', 'rPierce'],     fx: { executeBelow: 45, powerPct: 30 },
    desc: '처형 임계 45%, 위력 +30%' },
  { id: 'rwCataclysm', name: '재앙(災殃)',   runes: ['rDoom', 'rTide', 'rBlood'],        fx: { hitsAdd: 1, powerPct: 35 },
    desc: '타격 +1회 (총 4연격), 위력 +35%' },
  { id: 'rwImmortal',  name: '불사(不死)',   runes: ['rDawn', 'rWard', 'rImmortal'],     fx: { heal: 50, barrierGain: 60, swift: true }, charFx: { takenPct: -10 },
    desc: 'HP +50, 보호막 +60 · ⚡ 턴 미소모 · 받는 피해 -10%' },
  { id: 'rwOmega',     name: '종언(終焉)',   runes: ['rGenesis', 'rEternity', 'rOblivion'], fx: { powerPct: 50, hitsAdd: 1, swift: true }, charFx: { dmgPct: 10 },
    desc: '위력 +50%, 타격 +1회 · ⚡ 턴 미소모 · 주는 피해 +10% (최종 룬워드)' },
];

// 🔍 룬워드 감사 (1.149.0) — 「구성 룬이 이미 주는 불린 플래그를 또 준다」를 전부 잡아낸다.
// node로 호출해 빈 배열이 나오는지 확인할 것. 신규 룬워드 추가 시 반드시 재실행.
export function buriedRunewordAudit() {
  const FLAGS = ['pierce', 'berserk', 'swift'];
  const bad = [];
  for (const rw of BURIED_RUNEWORDS) {
    const from = {};
    for (const rid of rw.runes) {
      const f = BURIED_RUNES[rid]?.fx || {};
      for (const k of FLAGS) if (f[k]) from[k] = rid;
    }
    for (const k of FLAGS) {
      if (rw.fx?.[k] && from[k]) bad.push(`${rw.name}: ${k}는 ${BURIED_RUNES[from[k]].name}이(가) 이미 준다 (무효과)`);
    }
    if (rw.charFx?.statusUncap) { /* charFx는 룬이 주지 않는 축이라 중복 불가 */ }
    if (!rw.fx && !rw.charFx) bad.push(`${rw.name}: 효과가 비어 있다`);
    const unknown = rw.runes.filter(r => !BURIED_RUNES[r]);
    if (unknown.length) bad.push(`${rw.name}: 미존재 룬 ${unknown.join(',')}`);
  }
  return bad;
}

export function buriedRunewordOf(runes) {
  const list = runes || [];
  return BURIED_RUNEWORDS.find(rw => rw.runes.length === list.length && rw.runes.every((r, i) => list[i] === r)) || null;
}
// 장착 6칸의 완성 룬워드 charFx 합산 — 전투가 소비 (statusUncap 등)
export function buriedRunewordCharFx(char) {
  const out = {};
  for (const s of BURIED_SLOT_IDS) {
    const rw = buriedRunewordOf(buriedItemRunes(char?.equipped?.[s]));
    if (rw?.charFx) for (const [k, v] of Object.entries(rw.charFx)) out[k] = out[k] || v;
  }
  return out;
}

// ⟪룬워드⟫ 열람용 진행도 (1.148.0, PM 지시 "룬워드를 볼 수 있는 방법") —
// 각 조합의 완성 여부 / 보유 룬으로 만들 수 있는지 / 부족한 룬을 한 번에 계산한다.
// 순서가 정확히 일치해야 완성되므로, 각인 순서까지 그대로 보여준다.
export function buriedRunewordProgress(char) {
  const pouch = [...(char?.runes || [])];
  // 장착 6칸에서 이미 완성된 룬워드
  const doneIds = new Set();
  for (const sl of BURIED_SLOT_IDS) {
    const rw = buriedRunewordOf(buriedItemRunes(char?.equipped?.[sl]));
    if (rw) doneIds.add(rw.id);
  }
  return BURIED_RUNEWORDS.map(rw => {
    const runes = rw.runes.map(id => getBuriedRune(id));
    // 주머니 보유분으로 충당 가능한지 (같은 룬 중복 요구도 정확히 계산)
    const left = [...pouch];
    const missing = [];
    for (const id of rw.runes) {
      const i = left.indexOf(id);
      if (i >= 0) left.splice(i, 1);
      else missing.push(getBuriedRune(id)?.name || id);
    }
    return {
      ...rw, runes,
      done: doneIds.has(rw.id),
      craftable: missing.length === 0,
      missing,
    };
  });
}

export function socketBuriedRune(char, runeIdx, slot) {
  const runeId = (char.runes || [])[runeIdx];
  const rune = getBuriedRune(runeId);
  const item = char.equipped?.[slot];
  if (!rune || !item) return { char, text: '각인할 수 없다.' };
  const cur = buriedItemRunes(item);
  const sockets = buriedItemSockets(item);
  if (cur.length >= sockets) return { char, text: `소켓이 가득 찼다 (${cur.length}/${sockets}) — 소켓 수만큼만 각인할 수 있다.` };
  const runes = (char.runes || []).filter((_, i) => i !== runeIdx);
  const nextRunes = [...cur, runeId];
  const nextItem = { ...item, runes: nextRunes };
  delete nextItem.rune; // 구필드 → 배열 승격
  const rw = buriedRunewordOf(nextRunes);
  const next = { ...char, runes, equipped: { ...char.equipped, [slot]: nextItem } };
  return { char: next, text: `${item.name}에 「${rune.name}」 각인 (${nextRunes.length}/${sockets})${rw ? ` — ⟪${rw.name}⟫ 룬워드 완성! ${rw.desc}` : ''}` };
}

// =========================================================
// 22. 이벤트 방 5종 (1.107.0) — 원작의 묘비·샘·조각상·나그네·관
// =========================================================
// 원작 규칙: 이벤트는 도박이다 — 영구 보너스와 함정이 한 테이블에 섞여 있다.
// 결과는 순수 함수가 뽑고(char 패치 + 로그 반환), 화면은 표시만 한다.
// pendingStatuses: 다음 전투 시작 시 자신에게 적용될 상태이상 (함정의 지연 청구서)
export const BURIED_EVENT_ROOMS = {
  gravestone: { id: 'gravestone', name: '이끼 낀 묘비', icon: '🪦', color: '#8b8378', weight: 8,
    desc: '누군가의 묘비다. 파헤칠 수도, 그냥 지나갈 수도 있다.' },
  spring:     { id: 'spring',     name: '빛나는 샘',   icon: '⛲', color: '#7ba3c4', weight: 6,
    desc: '바닥이 보이지 않는 샘이 빛난다. 마실 것인가.' },
  statue:     { id: 'statue',     name: '이름 없는 석상', icon: '🗿', color: '#9b8975', weight: 5,
    desc: '기도하는 자세의 석상. 손을 대면 무슨 일이 일어날 것 같다.' },
  wanderer:   { id: 'wanderer',   name: '수상한 나그네', icon: '🧙', color: '#5c4a8c', weight: 6,
    desc: '어둠 속의 나그네가 세 가지 제안을 내민다.' },
  coffin:     { id: 'coffin',     name: '장식된 관',   icon: '⚱', color: '#e8b04a', weight: 4,
    desc: '지나치게 화려한 관. 좋은 것이 들었거나, 나쁜 것이 들었다.' },
};
export const BURIED_EVENT_ROOM_IDS = Object.keys(BURIED_EVENT_ROOMS);

// 1.151.0 전면 재설계 (PM 지시 A안) — 「선택권 + 성격 분리」
// 진단: PM이 야영·제단·상점·서고만 가던 이유는 **그쪽만 내가 고르고, 이벤트는 버튼 하나 = 랜덤**이었기 때문.
//       게다가 묘비/석상은 「재화·HP ↔ HP손실·디버프」로 성격이 겹쳐 실질 2종이었다.
// 해법: 방마다 **성격 1개**를 못 박고, **선택지 2~3개**로 리스크·리턴을 플레이어가 고르게 한다.
//       🪦 도굴=재화 / ⛲ 샘=영구 성장 / 🗿 석상=대가 지불(확정) / ⚱ 관=장비 도박 / 🧙 나그네=장비 개조
// 결과 테이블 키는 `방id:선택지id`. { w: 가중치, run(char, ctx) → { char, text, tone } }
const pendStatus = (char, s, n) => ({ ...char, pendingStatuses: [...(char.pendingStatuses || []), { s, n }] });
// 1.134.0 — 이벤트 보상 심층 스케일 (저주 보상 1.117.0과 동일 공식: 마물 레벨당 +10%)
const evScale = (c) => 1 + Math.max(0, buriedMonsterLevel(c) - 1) * 0.10;
// 1.151.0 — 영구 스탯 보상도 깊이를 탄다 (고정 +2는 심층에서 무의미했다)
const evStatGain = (c) => 2 + Math.floor(buriedMonsterLevel(c) / 25);
const evGold = (c, base) => Math.round(base * evScale(c));
const evHeal = (c, pct) => { const d = buriedDerived(c); return { ...c, hp: Math.min(d.maxHp, c.hp + Math.round(d.maxHp * pct / 100)) }; };
const evHurt = (c, pct) => { const d = buriedDerived(c); return { ...c, hp: Math.max(1, c.hp - Math.round(d.maxHp * pct / 100)) }; };

// 선택지 정의 — cost가 있으면 지불 가능할 때만 활성화된다
export const BURIED_EVENT_CHOICES = {
  gravestone: {
    theme: '도굴 — 골드와 먼지',
    list: [
      { id: 'dig',   label: '파헤친다',       risk: 'high', desc: '고위험 고보상 — 큰 재화, 아니면 함정' },
      { id: 'mourn', label: '조의를 표한다',   risk: 'safe', desc: '위험 없음 — 소액 확정 + HP 15% 회복' },
    ],
  },
  spring: {
    theme: '영구 성장 — 능력치',
    list: [
      { id: 'drink', label: '들이켠다',       risk: 'high', desc: '능력치 영구 상승 도박 — 실패하면 [저주]' },
      { id: 'bottle',label: '병에 담는다',     risk: 'safe', desc: '위험 없음 — 🧪 물약 +2 확정' },
      { id: 'wash',  label: '몸을 씻는다',     risk: 'safe', desc: '위험 없음 — HP 완전 회복 + 예약된 디버프 정화' },
    ],
  },
  statue: {
    theme: '대가 지불 — 바친 만큼 확정',
    list: [
      { id: 'coin',  label: '골드를 바친다',   risk: 'cost', desc: '골드 지불 → 먼지 대량 + HP 40% 확정', cost: { gold: 120 } },
      { id: 'blood', label: '피를 바친다',     risk: 'cost', desc: '최대 HP 25% 지불 → 영구 성장 확정', cost: { hpPct: 25 } },
      { id: 'break', label: '부순다',          risk: 'high', desc: '무료 — 먼지 특대, 대신 신벌을 각오하라' },
    ],
  },
  coffin: {
    theme: '장비 — 고위험 고보상',
    list: [
      { id: 'open',  label: '연다',            risk: 'high', desc: '영웅~유물 장비 60% / 함정 40%' },
      { id: 'seal',  label: '봉인을 덧댄다',   risk: 'safe', desc: '위험 없음 — 🕯 먼지 확정' },
    ],
  },
};
export function buriedEventChoices(roomId, char) {
  const def = BURIED_EVENT_CHOICES[roomId];
  if (!def) return null;
  const d = buriedDerived(char);
  return {
    theme: def.theme,
    list: def.list.map(c => {
      const goldCost = c.cost?.gold ? evGold(char, c.cost.gold) : 0;
      const hpCost = c.cost?.hpPct ? Math.round(d.maxHp * c.cost.hpPct / 100) : 0;
      return {
        ...c, goldCost, hpCost,
        costText: goldCost ? `🪙 ${goldCost}` : hpCost ? `HP ${hpCost}` : null,
        disabled: (goldCost > 0 && char.gold < goldCost) || (hpCost > 0 && char.hp <= hpCost),
      };
    }),
  };
}

const EVENT_OUTCOMES = {
  // ===== 🪦 묘비 — 재화 =====
  'gravestone:dig': [
    { w: 26, run: (c) => { const g = evGold(c, 260); return { char: { ...c, gold: c.gold + g }, text: `관 밑바닥까지 파냈다 — 🪙 ${g}.`, tone: 'good' }; } },
    { w: 22, run: (c, ctx) => ({ char: c, text: `유골이 바스러지며 먼지가 쏟아진다 — 🕯 +${ctx.dustGain = Math.round(95 * evScale(c))}.`, tone: 'good' }) },
    { w: 10, run: (c, ctx) => { const g = evGold(c, 300); ctx.dustGain = Math.round(110 * evScale(c)); return { char: { ...c, gold: c.gold + g }, text: `무덤 주인은 부자였다 — 🪙 ${g} · 🕯 +${ctx.dustGain}.`, tone: 'good' }; } },
    { w: 24, run: (c) => ({ char: evHurt(c, 35), text: '함정이다! 폭발이 일어났다 — 최대 HP의 35% 피해.', tone: 'bad' }) },
    { w: 18, run: (c) => ({ char: pendStatus(c, 'poison', 4), text: '독가스가 새어나온다 — 다음 전투를 [중독] 4로 시작한다.', tone: 'bad' }) },
  ],
  'gravestone:mourn': [
    { w: 100, run: (c) => { const g = evGold(c, 70); return { char: evHeal({ ...c, gold: c.gold + g }, 15), text: `잠시 고개를 숙였다. 발치에 놓인 공물을 챙긴다 — 🪙 ${g} · HP 15% 회복.`, tone: 'good' }; } },
  ],
  // ===== ⛲ 샘 — 영구 성장 =====
  'spring:drink': [
    { w: 42, run: (c) => { const n = evStatGain(c); const k = pick(['str', 'dex', 'int', 'vit']); const nm = BURIED_STATS.find(s => s.id === k)?.name;
      return { char: { ...c, stats: { ...c.stats, [k]: (c.stats[k] || 0) + n } }, text: `힘이 차오른다 — ${nm} +${n} (영구).`, tone: 'good' }; } },
    { w: 20, run: (c) => { const n = evStatGain(c) * 2; const k = pick(['str', 'dex', 'int', 'vit']); const nm = BURIED_STATS.find(s => s.id === k)?.name;
      return { char: { ...c, stats: { ...c.stats, [k]: (c.stats[k] || 0) + n } }, text: `샘이 응답했다! ${nm} +${n} (영구).`, tone: 'good' }; } },
    { w: 22, run: (c) => ({ char: pendStatus(c, 'curse', 3), text: '샘 바닥의 눈과 마주쳤다 — 다음 전투를 [저주] 3으로 시작한다.', tone: 'bad' }) },
    { w: 16, run: (c) => ({ char: evHurt(c, 30), text: '물이 시커멓게 변한다 — 최대 HP의 30% 피해.', tone: 'bad' }) },
  ],
  'spring:bottle': [
    { w: 100, run: (c) => ({ char: { ...c, potions: (c.potions || 0) + 2 }, text: '맑은 샘물을 병에 담았다 — 🧪 물약 +2.', tone: 'good' }) },
  ],
  'spring:wash': [
    { w: 100, run: (c) => { const had = (c.pendingStatuses || []).length;
      return { char: { ...evHeal(c, 100), pendingStatuses: [] }, text: `상처를 씻어낸다 — HP 완전 회복${had > 0 ? ` · 예약된 디버프 ${had}건 정화` : ''}.`, tone: 'good' }; } },
  ],
  // ===== 🗿 석상 — 대가 지불 (확정 보상) =====
  'statue:coin': [
    { w: 100, run: (c, ctx) => { ctx.dustGain = Math.round(140 * evScale(c));
      return { char: evHeal(c, 40), text: `석상이 헌금을 받아들인다 — 🕯 +${ctx.dustGain} · HP 40% 회복.`, tone: 'good' }; } },
  ],
  'statue:blood': [
    { w: 55, run: (c) => { const n = evStatGain(c); const k = pick(['str', 'dex', 'int', 'vit']); const nm = BURIED_STATS.find(s => s.id === k)?.name;
      return { char: { ...c, stats: { ...c.stats, [k]: (c.stats[k] || 0) + n } }, text: `피를 받아 마신 석상이 축복을 내린다 — ${nm} +${n} (영구).`, tone: 'good' }; } },
    { w: 45, run: (c) => { const ids = buriedEquippedSkills(c).map(x => x.skill.id).filter(id => (c.skillLevels?.[id] || 1) < BURIED_SKILL_MAX_LV);
      if (ids.length === 0) { const n = evStatGain(c); const k = pick(['str', 'dex', 'int', 'vit']);
        return { char: { ...c, stats: { ...c.stats, [k]: (c.stats[k] || 0) + n } }, text: `올릴 스킬이 없어 힘으로 갚는다 — ${BURIED_STATS.find(s => s.id === k)?.name} +${n}.`, tone: 'good' }; }
      const r = raiseBuriedSkill(c, pick(ids));
      return { char: r.char, text: `석상이 기억을 되돌려준다 — 스킬 하나가 Lv.${r.lv}이 되었다.`, tone: 'good' }; } },
  ],
  'statue:break': [
    { w: 40, run: (c, ctx) => ({ char: c, text: `석상이 산산조각 났다 — 🕯 +${ctx.dustGain = Math.round(220 * evScale(c))}.`, tone: 'good' }) },
    { w: 22, run: (c, ctx) => { const g = evGold(c, 180); ctx.dustGain = Math.round(120 * evScale(c));
      return { char: { ...c, gold: c.gold + g }, text: `속이 비어 있었다 — 🪙 ${g} · 🕯 +${ctx.dustGain}.`, tone: 'good' }; } },
    { w: 22, run: (c) => { const loss = Math.round(buriedExpToNext(c.lv || 1) * 0.40);
      return { char: { ...c, exp: Math.max(0, (c.exp || 0) - loss) }, text: `신벌 — 기억이 흐려진다. 경험치 ${loss}을 잃었다.`, tone: 'bad' }; } },
    { w: 16, run: (c) => ({ char: pendStatus(pendStatus(c, 'confuse', 2), 'curse', 2), text: '신벌 — 다음 전투를 [혼란] 2 · [저주] 2로 시작한다.', tone: 'bad' }) },
  ],
  // ===== ⚱ 관 — 장비 도박 =====
  'coffin:open': [
    { w: 38, run: (c, ctx) => { ctx.item = rollBuriedItem({ slot: null, classId: c.classId, floor: buriedMonsterLevel(c), tier: 'epic', powerMult: buriedLootPower(c) }); return { char: c, text: '영웅의 장비가 잠들어 있었다!', tone: 'good' }; } },
    { w: 22, run: (c, ctx) => { ctx.item = rollBuriedItem({ slot: null, classId: c.classId, floor: buriedMonsterLevel(c), tier: 'relic', powerMult: buriedLootPower(c) }); return { char: c, text: '유물급 장비가 잠들어 있었다!', tone: 'good' }; } },
    { w: 24, run: (c) => ({ char: evHurt(c, 35), text: '관 속의 것이 손을 뻗는다 — 최대 HP의 35% 피해.', tone: 'bad' }) },
    { w: 16, run: (c) => ({ char: pendStatus(c, 'silence', 2), text: '봉인 문자가 목에 감긴다 — 다음 전투를 [침묵] 2로 시작한다.', tone: 'bad' }) },
  ],
  'coffin:seal': [
    { w: 100, run: (c, ctx) => ({ char: c, text: `관을 덧대어 봉인했다. 떨어진 봉인재를 챙긴다 — 🕯 +${ctx.dustGain = Math.round(110 * evScale(c))}.`, tone: 'neutral' }) },
  ],
};

// 이벤트 실행 — 반환 { char, text, tone, item(관 전용), dustGain }
export function resolveBuriedEvent(roomId, char, choiceId = null) {
  const def = BURIED_EVENT_CHOICES[roomId];
  const cid = choiceId || def?.list?.[0]?.id;
  const table = EVENT_OUTCOMES[`${roomId}:${cid}`];
  if (!table) return { char, text: '아무 일도 일어나지 않았다.', tone: 'neutral' };
  // 선택지 비용 선지불 (골드·HP) — buriedEventChoices가 이미 지불 가능 여부를 걸러준다
  let c = char;
  const info = buriedEventChoices(roomId, char)?.list.find(x => x.id === cid);
  if (info?.disabled) return { char, text: '대가를 치를 수 없다.', tone: 'neutral' };
  if (info?.goldCost) c = { ...c, gold: c.gold - info.goldCost };
  if (info?.hpCost) c = { ...c, hp: Math.max(1, c.hp - info.hpCost) };
  const ctx = { dustGain: 0, item: null };
  const picked = weightedPick(table, (o) => o.w);
  const r = picked.run(c, ctx);
  const paid = info?.costText ? `(${info.costText} 지불) ` : '';
  return { char: r.char, text: paid + r.text, tone: r.tone, item: ctx.item, dustGain: ctx.dustGain, choiceId: cid };
}

// 수상한 나그네 — 세 가지 제안 (원작 그대로: 옵션 추가 / 스킬 변화 / 수치 재조정)
export function buriedWandererOffers(char) {
  const equippedSlots = BURIED_SLOT_IDS.filter(s => char.equipped?.[s]);
  return {
    canAddOption: equippedSlots.length > 0,
    canMod: equippedSlots.some(s => !char.equipped[s].mod && !char.equipped[s].unique),
    canReroll: equippedSlots.some(s => (char.equipped[s].options || []).length > 0),
  };
}
// ① 무작위 장착 장비에 랜덤 옵션 1개 추가
export function wandererAddOption(char) {
  const slots = BURIED_SLOT_IDS.filter(s => char.equipped?.[s]);
  if (slots.length === 0) return { char, text: '장비가 없다.' };
  const slot = pick(slots);
  const item = char.equipped[slot];
  const o = pick(BURIED_OPTIONS);
  const next = { ...item, options: [...(item.options || []), { key: o.key, name: o.name, pct: !!o.pct, affix: o.affix, value: rnd(o.min, o.max) }] };
  return { char: { ...char, equipped: { ...char.equipped, [slot]: next } }, text: `${item.name}에 「${o.name}」 옵션이 새겨졌다.` };
}
// ② 무작위 장착 장비에 스킬 변화(접두어) 부여 — 유니크·이미 변화된 장비 제외
export function wandererApplyMod(char) {
  const slots = BURIED_SLOT_IDS.filter(s => char.equipped?.[s] && !char.equipped[s].mod && !char.equipped[s].unique);
  if (slots.length === 0) return { char, text: '변화를 받을 장비가 없다.' };
  const slot = pick(slots);
  const item = char.equipped[slot];
  const modId = rollBuriedMod();
  const mod = getBuriedMod(modId);
  const next = { ...item, mod: modId, name: `${mod.name} ${item.name}` };
  return { char: { ...char, equipped: { ...char.equipped, [slot]: next } }, text: `${item.name}이(가) 「${mod.name}」 변화를 얻었다 — ${mod.desc}` };
}
// ③ 무작위 장착 장비의 옵션 수치 재조정
export function wandererReroll(char) {
  const slots = BURIED_SLOT_IDS.filter(s => char.equipped?.[s] && (char.equipped[s].options || []).length > 0);
  if (slots.length === 0) return { char, text: '재조정할 옵션이 없다.' };
  const slot = pick(slots);
  const item = char.equipped[slot];
  const next = {
    ...item,
    options: item.options.map(o => {
      const def = BURIED_OPTIONS.find(x => x.key === o.key);
      return def ? { ...o, value: rnd(def.min, def.max) } : o;
    }),
  };
  return { char: { ...char, equipped: { ...char.equipped, [slot]: next } }, text: `${item.name}의 옵션 수치가 다시 굴려졌다.` };
}

// =========================================================
// 23. 저주 — 해골 왕관 (1.108.0)
// =========================================================
// 원작의 저주 72종(솔로몬 악마) 중 18종 각색. 「해골 왕관」 방에서 제안받는다.
// 수락 = 즉시 보상(먼지+골드) + **이번 런이 끝날 때까지** 페널티. 최대 3개.
// fx 판정: 전투는 hasBuriedCurse(char, id) 분기, 던전·성장은 각 지점에서 분기.
export const BURIED_CURSES = [
  { id: 'gaap',       name: '가프',       sev: 1, desc: '치명타 확률이 0이 된다.' },
  { id: 'balam',      name: '발람',       sev: 3, desc: '전투에서 승리해도 HP가 1이 된다.' },
  { id: 'berith',     name: '베리트',     sev: 2, desc: '모든 적이 🧱방벽 2개를 두르고 나타난다.' },
  { id: 'bathin',     name: '바팀',       sev: 2, desc: '적의 공격력 +15%.' },
  { id: 'vual',       name: '부알',       sev: 2, desc: '모든 스킬 쿨다운 +1.' },
  { id: 'belial',     name: '베리알',     sev: 2, desc: '회피할 수 없다.' },
  { id: 'amon',       name: '아몬',       sev: 1, desc: '보호막이 절반이 된다.' },
  { id: 'sabnock',    name: '사브나크',   sev: 1, desc: '적이 거는 상태이상 스택 +1.' },
  { id: 'paimon',     name: '파이몬',     sev: 2, desc: '내가 받는 지속피해(도트) 2배.' },
  { id: 'gremory',    name: '그레모리',   sev: 2, desc: '제단·야영지에서 HP를 회복할 수 없다.' },
  { id: 'naberius',   name: '나베리우스', sev: 2, desc: '스킬 레벨이 오르지 않는다.' },
  { id: 'malphas',    name: '말파스',     sev: 2, desc: '전투 중 물약을 마실 수 없다.' },
  { id: 'leraje',     name: '레라지에',   sev: 3, desc: '적을 처치할 때마다 최대 HP -1% (이번 런 영구, 최대 -50%).' },
  { id: 'marchosias', name: '마르코시아스', sev: 3, desc: '자신에게 버프를 걸 수 없다.' },
  { id: 'andras',     name: '안드라스',   sev: 1, desc: '🧱방벽을 얻을 수 없다.' },
  { id: 'alloces',    name: '알로켄',     sev: 2, desc: '전투를 보호막 0으로 시작한다.' },
  { id: 'decarabia',  name: '데카라비아', sev: 2, desc: '적이 매 턴 [격노] 1을 얻는다.' },
  { id: 'phenex',     name: '페넥스',     sev: 2, desc: '적이 매 턴 최대 HP의 3%를 회복한다.' },
];
export const BURIED_CURSE_MAX = 3;
export const getBuriedCurse = (id) => BURIED_CURSES.find(c => c.id === id) || null;
export const buriedCurseIds = (char) => char?.curses || [];
export const hasBuriedCurse = (char, id) => buriedCurseIds(char).includes(id);
// 심각도별 보상 (수락 즉시)
export const BURIED_CURSE_REWARD = { 1: { dust: 40, gold: 60 }, 2: { dust: 75, gold: 110 }, 3: { dust: 120, gold: 180 } };
// 해골 왕관 방 — 아직 안 받은 저주 중 하나를 제안
export function rollBuriedCurseOffer(char) {
  if (buriedCurseIds(char).length >= BURIED_CURSE_MAX) return null;
  const pool = BURIED_CURSES.filter(c => !hasBuriedCurse(char, c.id));
  return pool.length > 0 ? pick(pool).id : null;
}
export function acceptBuriedCurse(char, curseId) {
  const c = getBuriedCurse(curseId);
  if (!c || hasBuriedCurse(char, curseId)) return { char, reward: null };
  // 1.117.0 — 보상이 마물 레벨을 따라 자란다 (무한층에서 저주가 계속 거래로 남도록)
  const scale = 1 + Math.max(0, buriedMonsterLevel(char) - 1) * 0.10;
  const base = BURIED_CURSE_REWARD[c.sev];
  const reward = { dust: Math.round(base.dust * scale), gold: Math.round(base.gold * scale) };
  return {
    char: { ...char, curses: [...buriedCurseIds(char), curseId], gold: char.gold + reward.gold },
    reward,
  };
}
export const BURIED_SKULL_ROOM = {
  id: 'skullcrown', name: '해골 왕관', icon: '💀', color: '#c9a86a', weight: 6,
  desc: '허공에 뜬 왕관이 거래를 제안한다 — 저주를 받아들이면 보상을 주겠다고.',
};

// =========================================================
// 24. 조우 해금 직업 3종 (1.109.0)
// =========================================================
// 원작 패턴: 성녀·용기병·다크엘프는 "이벤트 4회 조우"로 해금된다.
// 각색: **특정 적을 N회 처치**하면 해금. 진행은 meta.buried.killsByEnemy로 추적.
// 원작 모티브: 마검사(혈류) / 흡혈귀(저주받은 혈족) / 페어리(요정의 날개)
export const BURIED_ENCOUNTER_CLASSES = [
  {
    id: 'magiblade', name: '마검사', sub: 'Spellblade', color: '#a8556e',
    image: './classes/wanderer.jpg', encounter: true,
    desc: '검과 마도서를 함께 쥔 자. 제 피를 태워 칼날을 벼린다.',
    lines: { weapon: 'sword', offhand: 'tome' },
    stats: { str: 11, dex: 6, int: 11, vit: 8 },
    traits: ['bloodflow', 'swordmastery', 'arcana'],
    unlock: { enemyKey: 'sealWitch', kills: 4, label: '봉인의 마녀 4회 처치' },
  },
  {
    id: 'vampire', name: '흡혈귀', sub: 'Cursed Blood', color: '#7d2b4a',
    image: './classes/demonblood.jpg', encounter: true,
    desc: '저주받은 혈족. 생명의 그릇은 작지만, 피는 마르지 않는다.',
    lines: { weapon: 'sword', offhand: 'claw' },
    stats: { str: 13, dex: 9, int: 6, vit: 10 },
    traits: ['cursedblood', 'sanguine', 'toughness'],
    unlock: { enemyKey: 'graveWraith', kills: 8, label: '묘지 망령 8회 처치' },
  },
  {
    id: 'fairy', name: '페어리', sub: 'Twilight Fae', color: '#8fb8d8',
    image: './classes/elf.jpg', encounter: true,
    desc: '황혼의 요정. 몸은 유리처럼 여리지만, 날개가 칼날을 흘려낸다.',
    lines: { weapon: 'staff', offhand: 'relic' },
    stats: { str: 4, dex: 11, int: 15, vit: 5 },
    traits: ['fairywing', 'wardstone', 'lightstep'],
    unlock: { enemyKey: 'twilightHusk', kills: 4, label: '황혼의 잔재 4회 처치' },
  },
];
// 조우 해금 판정 — killsByEnemy 갱신 후 새로 열린 직업 id 반환 (없으면 null)
export function checkBuriedEncounterUnlock(killsByEnemy, alreadyUnlocked) {
  for (const c of BURIED_ENCOUNTER_CLASSES) {
    if (alreadyUnlocked.includes(c.id)) continue;
    if ((killsByEnemy[c.unlock.enemyKey] || 0) >= c.unlock.kills) return c.id;
  }
  return null;
}

// =========================================================
// 26b. 던전 심층 직업 4종 (1.116.0) — 100층 이상 보스 처치로 해금
// =========================================================
// PM 결정: "이 던전 고층에서만 얻을 수 있는 직업" — 각 던전 기믹과 한 몸인 전용 특성을 가진다.
export const BURIED_DEPTH_CLASSES = [
  {
    id: 'mazewarden', name: '미궁의 안내인', sub: 'Maze Warden', color: '#7ba3c4',
    image: './classes/wanderer.jpg', depth: true,
    desc: '길을 전부 외운 자. 갈림길 앞에서 웃는다.',
    lines: { weapon: 'sword', offhand: 'tome' },
    stats: { str: 10, dex: 8, int: 10, vit: 9 },
    traits: ['pathfinder', 'swordmastery', 'willpower'],
    unlock: { dungeonId: 'labyrinth', floor: 100, label: '잊혀진 미궁 100층 이상 보스 처치' },
  },
  {
    id: 'plaguedoc', name: '역병 사제', sub: 'Plague Cleric', color: '#7a9a5e',
    image: './classes/priest.jpg', depth: true,
    desc: '곪은 물에서 기도하는 자. 병이 곧 축복이다.',
    lines: { weapon: 'mace', offhand: 'relic' },
    stats: { str: 5, dex: 6, int: 13, vit: 10 },
    traits: ['pestilence', 'arcana', 'faith'],
    unlock: { dungeonId: 'ruins', floor: 100, label: '침몰한 폐허 100층 이상 보스 처치' },
  },
  {
    id: 'chasmrager', name: '나락의 광전사', sub: 'Chasm Rager', color: '#c4453d',
    image: './classes/demonblood.jpg', depth: true,
    desc: '떨어지며 강해진 자. 바닥이 없다는 걸 안다.',
    lines: { weapon: 'axe', offhand: 'claw' },
    stats: { str: 15, dex: 6, int: 4, vit: 10 },
    traits: ['freefall', 'toughness', 'sanguine'],
    unlock: { dungeonId: 'chasm', floor: 100, label: '나락의 계단 100층 이상 보스 처치' },
  },
  {
    id: 'voidwalker', name: '공허 감시자', sub: 'Void Watcher', color: '#5c4a8c',
    image: './classes/elf.jpg', depth: true,
    desc: '어둠을 너무 오래 본 자. 이제 어둠이 그를 비켜 간다.',
    lines: { weapon: 'bow', offhand: 'blade' },
    stats: { str: 5, dex: 15, int: 8, vit: 8 },
    traits: ['voidsight', 'precision', 'lightstep'],
    unlock: { dungeonId: 'abyss', floor: 100, label: '심연 100층 이상 보스 처치' },
  },
];
// 심층 직업 해금 판정 — 100층 이상 보스 처치 시 호출
export function checkBuriedDepthClassUnlock(dungeonId, floor, alreadyUnlocked) {
  const c = BURIED_DEPTH_CLASSES.find(x => x.unlock.dungeonId === dungeonId);
  if (!c || alreadyUnlocked.includes(c.id) || (floor || 1) < c.unlock.floor) return null;
  return c.id;
}

// =========================================================
// 26d. 🏛 조직 (1.141.0) — BB2 유니온의 솔로 각색 (PM 결정: 평판형)
// =========================================================
// 원전 유니온은 온라인 공동 오더(일일 퀘스트) 구조 — 솔로에선 무의미해 재설계.
// ① 전 조직 동시 개방 (가입 없음) ② 플레이 실적이 평판으로 자동 적립 (일일 리셋 없음)
// ③ 조직 = 던전 1:1 — 그 던전에서의 전투 승리·보스 격파·정복이 곧 그 조직 평판
// ④ 보상은 레벨 도달 시 자동 지급 (storage.addBuriedUnionRep) — 먼지·조각·전속 종족(Lv5)·전속 직업(Lv7)
export const BURIED_UNIONS = [
  { id: 'sealwatch',  dungeon: 'labyrinth', name: '봉인 감시단',   icon: '🏛', color: '#7ba3c4',
    desc: '미궁의 봉인이 풀리지 않게 지키는 기사단. 미궁에서의 전과가 곧 신임이다.',
    classId: 'paladin', raceId: 'angelkin' },
  { id: 'mourners',   dungeon: 'ruins',     name: '침묵의 상조회', icon: '🕯', color: '#7a9a5e',
    desc: '가라앉은 자들을 거두는 장의 조합. 폐허의 망자를 잠재울수록 빚이 쌓인다.',
    classId: 'necroseer', raceId: 'ghoulkin' },
  { id: 'darkmoon',   dungeon: 'chasm',     name: '암월상회',      icon: '🌘', color: '#c9a86a',
    desc: '나락 밑바닥까지 물건을 대는 암시장. 깊이 내려가는 자만이 단골이 된다.',
    classId: 'ronin', raceId: 'dwarfkin' },
  { id: 'abyssorder', dungeon: 'abyss',     name: '무저갱 교단',   icon: '🕳', color: '#5c4a8c',
    desc: '심연 그 자체를 섬기는 이단. 어둠 속의 살육이 곧 기도다.',
    classId: 'darkknight', raceId: 'onikin' },
];
export const getBuriedUnion = (id) => BURIED_UNIONS.find(u => u.id === id) || null;
export const getBuriedUnionByDungeon = (dungeonId) => BURIED_UNIONS.find(u => u.dungeon === dungeonId) || null;

// 누적 평판 → 레벨 (Lv1~8). 임계는 공통.
export const BURIED_UNION_LEVELS = [0, 30, 80, 160, 280, 450, 700, 1000];
export function buriedUnionLevel(rep) {
  let lv = 1;
  for (let i = 1; i < BURIED_UNION_LEVELS.length; i++) if ((rep || 0) >= BURIED_UNION_LEVELS[i]) lv = i + 1;
  return lv;
}
// 평판 획득 — 그 던전에서의 전투 승리 종류별 (App이 승리 정산에서 호출)
export const BURIED_UNION_REP_GAIN = { normal: 1, elite: 3, boss: 10, guardian: 30, calamity: 15, conquest: 50 };
// 레벨 도달 보상 (인덱스 = 레벨). race/clazz는 그 조직의 전속 id를 해금.
export const BURIED_UNION_REWARDS = [
  null, null,                                        // (미사용) / Lv1 기본
  { dust: 300, label: '🕯 먼지 300' },               // Lv2
  { shards: 3, label: '☠ 죽음의 조각 3' },           // Lv3
  { dust: 600, label: '🕯 먼지 600' },               // Lv4
  { race: true, label: '전속 종족 해금' },            // Lv5
  { shards: 8, label: '☠ 죽음의 조각 8' },           // Lv6
  { clazz: true, label: '전속 직업 해금' },           // Lv7
  { dust: 1500, shards: 10, label: '🕯 먼지 1,500 + ☠ 조각 10' }, // Lv8
];

// 조직 전속 직업 4종 — 기존 특성 재사용 (전투 코드 0줄), 해금은 unlockedClasses로 기존 위저드 흐름 그대로
export const BURIED_UNION_CLASSES = [
  {
    id: 'paladin', name: '성기사', sub: 'Paladin', color: '#e8d8a8',
    image: './classes/priest.jpg', unionOnly: true,
    desc: '봉인 감시단의 수호 기사. 빛과 강철로 벽이 된다.',
    lines: { weapon: 'mace', offhand: 'relic' },
    stats: { str: 10, dex: 5, int: 9, vit: 12 },
    traits: ['crusade', 'faith', 'wardstone'],
    unlock: { union: 'sealwatch', label: '봉인 감시단 평판 Lv.7' },
  },
  {
    id: 'necroseer', name: '강령술사', sub: 'Necroseer', color: '#5e7a3e',
    image: './classes/sage.jpg', unionOnly: true,
    desc: '상조회가 거둔 망자의 목소리를 듣는 자. 병과 저주가 도구다.',
    lines: { weapon: 'staff', offhand: 'tome' },
    stats: { str: 4, dex: 6, int: 14, vit: 8 },
    traits: ['necromancy', 'arcana', 'willpower'],
    unlock: { union: 'mourners', label: '침묵의 상조회 평판 Lv.7' },
  },
  {
    id: 'ronin', name: '떠돌이 사무라이', sub: 'Ronin', color: '#c9a86a',
    image: './classes/wanderer.jpg', unionOnly: true,
    desc: '암월상회의 해결사. 칼값은 선불이다.',
    lines: { weapon: 'sword', offhand: 'blade' },
    stats: { str: 12, dex: 11, int: 4, vit: 7 },
    traits: ['iaido', 'precision', 'swordmastery'],
    unlock: { union: 'darkmoon', label: '암월상회 평판 Lv.7' },
  },
  {
    id: 'darkknight', name: '암흑기사', sub: 'Dark Knight', color: '#5c4a8c',
    image: './classes/demonblood.jpg', unionOnly: true,
    desc: '무저갱 교단의 성전 기사. 어둠을 갑주처럼 두른다.',
    lines: { weapon: 'axe', offhand: 'tome' },
    stats: { str: 13, dex: 5, int: 10, vit: 10 },
    traits: ['blackplate', 'cursedblood', 'sanguine'],
    unlock: { union: 'abyssorder', label: '무저갱 교단 평판 Lv.7' },
  },
];

// =========================================================
// 26c. 던전 심층 특성 4종 (1.116.0) — 150층 도달 해금, 전 캐릭터 자동 적용
// =========================================================
export const BURIED_DEPTH_TRAITS = [
  { id: 'echoMaze', dungeon: 'labyrinth', need: 150 },
  { id: 'rotVein',  dungeon: 'ruins',     need: 150 },
  { id: 'ironFall', dungeon: 'chasm',     need: 150 },
  { id: 'nightEye', dungeon: 'abyss',     need: 150 },
];
// 도달 기록 → 획득한 심층 특성 id 목록 (캐릭터 생성 시 구워진다)
export function buriedEarnedDepthTraits(deepestByDungeon) {
  return BURIED_DEPTH_TRAITS
    .filter(t => (deepestByDungeon?.[t.dungeon] || 0) >= t.need)
    .map(t => t.id);
}

// =========================================================
// 25. 마의 계약 (1.111.0) — 출정 시 지참하는 영구 패시브
// =========================================================
// 원작: 마의 계약 상점(500마석 랜덤 구입) + 출정 시 지참. 각색: 먼지로 구입, 지참 최대 2개.
// 스탯형은 aggregateBuriedContracts가 fx 뭉치로 합산 → 파생 스탯·전투·던전이 나눠 읽는다.
export const BURIED_CONTRACT_COST = 60;      // 기본 단가 — 1.135.0부터 buriedContractCost 누진의 1계약 가격
export const BURIED_CONTRACT_CARRY = 2;      // 출정 시 지참 한도
// 1.135.0 — PM 지시: 계약 완주가 너무 이르다 → 이중 게이트 (누진 비용 + 진행도 보유 한도)
// n+1번째 계약 가격 = 60 × (n+1). 1번째 60 → 28번째 1,680 (전종 총 🕯23,520)
export const buriedContractCost = (ownedCount) => BURIED_CONTRACT_COST * ((ownedCount || 0) + 1);
export const BURIED_CONTRACTS = [
  { id: 'c_vitality', name: '활력의 계약',   desc: '최대 HP +15%',                        fx: { hpPct: 15 } },
  { id: 'c_might',    name: '완력의 계약',   desc: '물리·기교 공격력 +12%',                fx: { physPct: 12 } },
  { id: 'c_arcane',   name: '마도의 계약',   desc: '마법 공격력 +12%',                     fx: { magPct: 12 } },
  { id: 'c_recovery', name: '회복의 계약',   desc: '모든 회복량 +30%',                     fx: { healPct: 30 } },
  { id: 'c_evasion',  name: '회피의 계약',   desc: '회피율 +8%',                          fx: { dodge: 8 } },
  { id: 'c_shield',   name: '수호의 계약',   desc: '보호막 +30%',                         fx: { barrierPct: 30 } },
  { id: 'c_crit',     name: '치명의 계약',   desc: '치명 확률 +10%',                      fx: { crit: 10 } },
  { id: 'c_exp',      name: '경험의 계약',   desc: '경험치 +20%',                         fx: { expPct: 20 } },
  { id: 'c_greed',    name: '탐욕의 계약',   desc: '전투 승리 골드 +30%',                 fx: { goldPct: 30 } },
  { id: 'c_fortune',  name: '행운의 계약',   desc: '장비 드랍의 등급 운 +2',              fx: { dropLuck: 2 } },
  { id: 'c_venom',    name: '부여의 계약',   desc: '내가 거는 상태이상 확률 +30%',         fx: { statusChance: 30 } },
  { id: 'c_resist',   name: '내성의 계약',   desc: '적이 거는 상태이상 확률 -30%',         fx: { statusResist: 30 } },
  { id: 'c_first',    name: '선제의 계약',   desc: '전투를 SP 80%로 시작한다',            fx: { startSpPct: 25 } },
  { id: 'c_drain',    name: '흡혈의 계약',   desc: '주는 피해의 5% 흡혈',                 fx: { drainPct: 5 } },
  { id: 'c_wall',     name: '방벽의 계약',   desc: '전투를 🧱방벽 1개로 시작한다',        fx: { startWall: 1 } },
  { id: 'c_guts',     name: '근성의 계약',   desc: 'HP가 0이 될 피해를 전투당 1회, 25% 확률로 HP 1로 버틴다', fx: { guts: 25 } },
  { id: 'c_calm',     name: '유유자적의 계약', desc: '마물 레벨이 1레벨 오르는 데 필요한 걸음 +1', fx: { stepBonus: 1 } },
  { id: 'c_camp',     name: '야영의 계약',   desc: '제단·야영지 회복량 +25%',             fx: { campPct: 25 } },
  // ===== 1.129.0 — 보급 계약 10종 (BB2 契約Contract 이식 7탄) =====
  // 원작: 유니온(진영)에게서 스킬·룬·장비를 지급받는 지원 계약. 각색: 지참하면 **출정 시작 시 실물 지급**.
  // fx는 비워두고 supply만 갖는다 — 리스크·리턴 계약과 지참 2칸을 두고 경쟁하는 보급형.
  { id: 's_masses',    name: '보급 · 유상무상',   desc: '[전사단] 출정 시작 시 물약 +2',                      fx: {}, supply: { potions: 2 } },
  { id: 's_patrol',    name: '보급 · 순찰대',     desc: '[결사단] 출정 시작 시 골드 +200',                    fx: {}, supply: { gold: 200 } },
  { id: 's_collect',   name: '보급 · 수집품',     desc: '[오물 구덩이] 출정 시작 시 ᚱ룬 1개 (★~★★)',        fx: {}, supply: { rune: [1, 2] } },
  { id: 's_mentor',    name: '보급 · 견습 지도',  desc: '[연구소] 출정 시작 시 무작위 장착 스킬 Lv +1',        fx: {}, supply: { skillLv: 1 } },
  { id: 's_firesup',   name: '보급 · 사격 지원',  desc: '[전사단] 출정 시작 시 ᚱ룬 1개 (★★~★★★)',          fx: {}, supply: { rune: [2, 3] } },
  { id: 's_library',   name: '보급 · 장서 제공',  desc: '[연구소] 출정 시작 시 희귀 장비 1개 지급',            fx: {}, supply: { item: 'rare' } },
  { id: 's_liveaid',   name: '보급 · 생활 지원',  desc: '[결사단] 출정 시작 시 물약 +1, 골드 +120',           fx: {}, supply: { potions: 1, gold: 120 } },
  { id: 's_labpass',   name: '보급 · 실험실 개방', desc: '[연구소] 출정 시작 시 무작위 장착 스킬 Lv +2',       fx: {}, supply: { skillLv: 2 } },
  { id: 's_blackmkt',  name: '보급 · 어둠 거래',  desc: '[암월 상회] 출정 시작 시 영웅 장비 1개 지급',         fx: {}, supply: { item: 'epic' } },
  { id: 's_forbidden', name: '보급 · 금서',       desc: '[연구소] 출정 시작 시 ᚱ룬 1개 (★★★~★★★★)',       fx: {}, supply: { rune: [3, 4] } },

  // ===== 1.142.0 — 계약 2차 (BB2 契約 시트 기반 +30 = 58종) =====
  // ── 일반 계약 10종 (복합·페널티형 포함) ──
  { id: 'c_precision', name: '정밀의 계약',   desc: '치명 확률 +6%, 물리·기교 +5%',          fx: { crit: 6, physPct: 5 } },
  { id: 'c_focus',     name: '집중의 계약',   desc: '시작 SP +15%p, 마법 +5%',               fx: { startSpPct: 15, magPct: 5 } },
  { id: 'c_scaven',    name: '수습의 계약',   desc: '골드 +15%, 드랍 운 +1',                 fx: { goldPct: 15, dropLuck: 1 } },
  { id: 'c_ward',      name: '결계의 계약',   desc: '보호막 +20%, 상태이상 저항 +10%',        fx: { barrierPct: 20, statusResist: 10 } },
  { id: 'c_frenzy',    name: '광란의 계약',   desc: '물리·기교 +18% — 대신 회피 -4%',        fx: { physPct: 18, dodge: -4 } },
  { id: 'c_gloom',     name: '그늘의 계약',   desc: '마법 +18% — 대신 회복 -10%',            fx: { magPct: 18, healPct: -10 } },
  { id: 'c_pilgrim',   name: '순례의 계약',   desc: '경험치 +15%, 야영 회복 +15%',           fx: { expPct: 15, campPct: 15 } },
  { id: 'c_ironhide',  name: '철피의 계약',   desc: '최대 HP +12%, 상태이상 저항 +15%',      fx: { hpPct: 12, statusResist: 15 } },
  { id: 'c_hunter',    name: '사냥꾼의 계약', desc: '치명 확률 +8%, 흡혈 +3%',               fx: { crit: 8, drainPct: 3 } },
  { id: 'c_slowstep',  name: '느긋한 걸음의 계약', desc: '마물 레벨업 필요 걸음 +1, 야영 회복 +10%', fx: { stepBonus: 1, campPct: 10 } },
  // ── 보급 계약 8종 ──
  { id: 's_scoutkit',  name: '보급 · 정찰 꾸러미', desc: '출정 시작 시 물약 +1, 골드 +150',            fx: {}, supply: { potions: 1, gold: 150 } },
  { id: 's_fieldkit',  name: '보급 · 야전 배낭',   desc: '출정 시작 시 물약 +3',                       fx: {}, supply: { potions: 3 } },
  { id: 's_warchest',  name: '보급 · 군자금',      desc: '출정 시작 시 골드 +400',                     fx: {}, supply: { gold: 400 } },
  { id: 's_armory',    name: '보급 · 무기고 열쇠', desc: '출정 시작 시 희귀 장비 1개 지급',             fx: {}, supply: { item: 'rare' } },
  { id: 's_relicbox',  name: '보급 · 유물 상자',   desc: '출정 시작 시 영웅 장비 1개 지급',             fx: {}, supply: { item: 'epic' } },
  { id: 's_runecase',  name: '보급 · 룬 상자',     desc: '출정 시작 시 ᚱ룬 1개 (★~★★★)',             fx: {}, supply: { rune: [1, 3] } },
  { id: 's_drillbook', name: '보급 · 조련 교본',   desc: '출정 시작 시 무작위 장착 스킬 Lv +1, 물약 +1', fx: {}, supply: { skillLv: 1, potions: 1 } },
  { id: 's_fullpack',  name: '보급 · 완전 군장',   desc: '출정 시작 시 골드 +250, ᚱ룬 1개 (★★)',       fx: {}, supply: { gold: 250, rune: [2, 2] } },
  // ── 🏛 조직 상급 계약 12종 (1.141.0 조직 평판 게이트 — 해당 조직 Lv 도달 시 랜덤 풀에 들어온다) ──
  { id: 'u_seal1', union: 'sealwatch', unionLv: 3, name: '감시단 · 파수의 인장',   desc: '[봉인 감시단 Lv.3] 보호막 +25%, 상태이상 저항 +10%', fx: { barrierPct: 25, statusResist: 10 } },
  { id: 'u_seal2', union: 'sealwatch', unionLv: 5, name: '감시단 · 봉인 기사단',   desc: '[봉인 감시단 Lv.5] 최대 HP +15%, 회복 +15%',        fx: { hpPct: 15, healPct: 15 } },
  { id: 'u_seal3', union: 'sealwatch', unionLv: 7, name: '감시단 · 대봉인 서약',   desc: '[봉인 감시단 Lv.7] 시작 🧱방벽 +1, 보호막 +20%',     fx: { startWall: 1, barrierPct: 20 } },
  { id: 'u_mour1', union: 'mourners', unionLv: 3, name: '상조회 · 곡소리',        desc: '[침묵의 상조회 Lv.3] 상태이상 확률 +20%, 마법 +8%',  fx: { statusChance: 20, magPct: 8 } },
  { id: 'u_mour2', union: 'mourners', unionLv: 5, name: '상조회 · 방부 처리',     desc: '[침묵의 상조회 Lv.5] 회복 +25%, 상태이상 저항 +15%', fx: { healPct: 25, statusResist: 15 } },
  { id: 'u_mour3', union: 'mourners', unionLv: 7, name: '상조회 · 망자의 계(契)', desc: '[침묵의 상조회 Lv.7] 흡혈 +6%, 최대 HP +10%',       fx: { drainPct: 6, hpPct: 10 } },
  { id: 'u_dark1', union: 'darkmoon', unionLv: 3, name: '상회 · 뒷돈',            desc: '[암월상회 Lv.3] 골드 +25%, 드랍 운 +1',             fx: { goldPct: 25, dropLuck: 1 } },
  { id: 'u_dark2', union: 'darkmoon', unionLv: 5, name: '상회 · 밀수로',          desc: '[암월상회 Lv.5] 드랍 운 +2, 경험치 +10%',           fx: { dropLuck: 2, expPct: 10 } },
  { id: 'u_dark3', union: 'darkmoon', unionLv: 7, name: '상회 · 달빛 금고',       desc: '[암월상회 Lv.7] 골드 +40%, 치명 +5%',               fx: { goldPct: 40, crit: 5 } },
  { id: 'u_abys1', union: 'abyssorder', unionLv: 3, name: '교단 · 어둠 세례',     desc: '[무저갱 교단 Lv.3] 마법 +15%, 상태이상 확률 +10%',   fx: { magPct: 15, statusChance: 10 } },
  { id: 'u_abys2', union: 'abyssorder', unionLv: 5, name: '교단 · 피의 기도',     desc: '[무저갱 교단 Lv.5] 물리·기교 +12%, 흡혈 +4%',       fx: { physPct: 12, drainPct: 4 } },
  { id: 'u_abys3', union: 'abyssorder', unionLv: 7, name: '교단 · 무저갱 강림',   desc: '[무저갱 교단 Lv.7] 모든 공격 +10%, 치명 +5%',       fx: { physPct: 10, magPct: 10, crit: 5 } },
];
export const getBuriedContract = (id) => BURIED_CONTRACTS.find(c => c.id === id) || null;
// 1.135.0 — 보유 한도 (진행도 연동): 기본 6 + 던전 정복당 +4 + 최고 100층 +3 + 200층 +3.
// 4던전 정복(+16) + 200층(+6) = 28 = 전종 — 풀 컬렉션은 엔드 콘텐츠 도달의 증표
export function buriedContractCap(b) {
  const conquered = Object.keys(b?.clears || {}).filter(k => (b.clears?.[k] || 0) > 0).length;
  const deepest = b?.deepest || 0;
  // 1.142.0 — 조직 평판도 한도를 늘린다: 조직당 Lv.4 도달 +4, Lv.8 도달 +4 (최대 +32)
  const unionCap = BURIED_UNIONS.reduce((s, u) => {
    const lv = buriedUnionLevel(b?.unionRep?.[u.id] || 0);
    return s + (lv >= 4 ? 4 : 0) + (lv >= 8 ? 4 : 0);
  }, 0);
  return Math.min(BURIED_CONTRACTS.length, 6 + conquered * 4 + (deepest >= 100 ? 3 : 0) + (deepest >= 200 ? 3 : 0) + unionCap);
}
// 1.142.0 — 조직 상급 계약(union 필드)은 해당 조직 평판 레벨 도달 전엔 풀에서 제외
export function rollBuriedContract(ownedIds, unionRep = {}) {
  const pool = BURIED_CONTRACTS.filter(c => !ownedIds.includes(c.id)
    && (!c.union || buriedUnionLevel(unionRep[c.union] || 0) >= (c.unionLv || 3)));
  return pool.length > 0 ? pick(pool).id : null;
}
// 지참 중인 계약의 fx 합산 — 전투·던전·파생 스탯이 이 뭉치를 나눠 읽는다
// 1.144.0 — 🕯 동행 괴이의 패시브도 같은 어휘로 여기에 합산 (파생·전투·보상 전 소비 지점 공짜)
export function aggregateBuriedContracts(char) {
  const out = {};
  if (char?.ghost?.id) {
    const g = getBuriedGhost(char.ghost.id);
    if (g) {
      const kit = buriedGhostKit(g, char.ghost.breaks || 0);
      for (const [k, v] of Object.entries(kit.passive)) out[k] = (out[k] || 0) + v;
    }
  }
  for (const id of char?.contracts || []) {
    const c = getBuriedContract(id);
    if (!c) continue;
    for (const [k, v] of Object.entries(c.fx)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

// =========================================================
// 26. 연구실 부품 + 죽음의 조각 (1.112.0)
// =========================================================
// 원작: 죽음의 조각으로 부품 구입, 슬롯 5칸 (무료→20→100→240→500), 일괄 탈착만 가능.
// 각색: 조각은 보스·재앙이 떨어뜨린다. 부품 효과는 **새 캐릭터 생성 시점에 구워져**(partsFx)
// 런 내내 적용 — 진행 중 캐릭터에는 소급되지 않는다 (원작의 "시체 개조" 감성).
export const BURIED_SHARD = { name: '죽음의 조각', icon: '☠' };
export const BURIED_PART_SLOT_COSTS = [0, 20, 100, 240, 500]; // n번째 부품 장착 비용
export const BURIED_PARTS = [
  { id: 'p_atk',    name: '완력 코어',    desc: '물리·기교 공격력 +6', fx: { atk: 6 } },
  { id: 'p_mag',    name: '마도 코어',    desc: '마법 공격력 +6',      fx: { mag: 6 } },
  { id: 'p_hp',     name: '생체 조직',    desc: '최대 HP +40',        fx: { hp: 40 } },
  { id: 'p_def',    name: '골판 장갑',    desc: '방어력 +6',           fx: { def: 6 } },
  { id: 'p_shield', name: '역장 발생기',  desc: '보호막 +25',          fx: { barrier: 25 } },
  { id: 'p_crit',   name: '조준 렌즈',    desc: '치명 확률 +5%',       fx: { crit: 5 } },
  { id: 'p_dodge',  name: '반사 신경',    desc: '회피율 +4%',          fx: { dodge: 4 } },
  { id: 'p_chase',  name: '추격 기관',    desc: '추격 피해 +6',        fx: { chase: 6 } },
  { id: 'p_sp',     name: '순환 펌프',    desc: 'SP 회복 +3',          fx: { spRegen: 3 } },
  { id: 'p_drain',  name: '흡혈 침샘',    desc: '흡혈 +4%',            fx: { drainPct: 4 } },
  { id: 'p_heal',   name: '재생 세포',    desc: '회복량 +15%',         fx: { healPct: 15 } },
  { id: 'p_status', name: '독선 분비샘',  desc: '상태이상 확률 +15%',   fx: { statusChance: 15 } },
  { id: 'p_luck',   name: '도굴꾼의 눈',  desc: '드랍 등급 운 +1',     fx: { dropLuck: 1 } },
  { id: 'p_gold',   name: '탐욕 회로',    desc: '골드 +15%',           fx: { goldPct: 15 } },
  { id: 'p_exp',    name: '학습 회로',    desc: '경험치 +15%',         fx: { expPct: 15 } },
  { id: 'p_wall',   name: '증축 골조',    desc: '전투 시작 🧱방벽 +1', fx: { startWall: 1 } },
  // ===== 던전 전용 부품 8종 (1.115.0) — 해당 던전 100층 도달 시 구매 해금. 기본 부품보다 강하다 =====
  { id: 'p_lab_exp',    dungeon: 'labyrinth', needDeep: 100, name: '탐험자 회로',   desc: '경험치 +30%', fx: { expPct: 30 } },
  { id: 'p_lab_eye',    dungeon: 'labyrinth', needDeep: 100, name: '도굴 광학 렌즈', desc: '드랍 등급 운 +2', fx: { dropLuck: 2 } },
  { id: 'p_ruin_rot',   dungeon: 'ruins',     needDeep: 100, name: '부패 배양낭',   desc: '상태이상 확률 +30%', fx: { statusChance: 30 } },
  { id: 'p_ruin_seal',  dungeon: 'ruins',     needDeep: 100, name: '방수 격막',     desc: '회복량 +25%', fx: { healPct: 25 } },
  { id: 'p_chasm_bone', dungeon: 'chasm',     needDeep: 100, name: '충격 흡수 골격', desc: '최대 HP +80', fx: { hp: 80 } },
  { id: 'p_chasm_core', dungeon: 'chasm',     needDeep: 100, name: '낙하자의 심장', desc: '물리·기교 공격력 +10, 마법 +10', fx: { atk: 10, mag: 10 } },
  { id: 'p_abyss_eye',  dungeon: 'abyss',     needDeep: 100, name: '심연 동공',     desc: '치명 확률 +8%, 추격 피해 +8', fx: { crit: 8, chase: 8 } },
  { id: 'p_abyss_skin', dungeon: 'abyss',     needDeep: 100, name: '어둠막 피막',   desc: '보호막 +60, 전투 시작 🧱방벽 +1', fx: { barrier: 60, startWall: 1 } },
];
export const getBuriedPart = (id) => BURIED_PARTS.find(p => p.id === id) || null;
export function aggregateBuriedParts(partIds) {
  const out = {};
  for (const id of partIds || []) {
    const p = getBuriedPart(id);
    if (!p) continue;
    for (const [k, v] of Object.entries(p.fx)) out[k] = (out[k] || 0) + v;
  }
  return out;
}
// 보스 처치 조각 (던전별) — 최종 보스는 2배
export const BURIED_SHARD_DROP = { labyrinth: 1, ruins: 2, chasm: 3, abyss: 5 };

// =========================================================
// 27. 재앙 (1.112.0) — 소환형 초고난도 보스
// =========================================================
// 원작: 연구실 방문 5회 누적 시 「둥지」에 재앙 출현 (계정 단위 게이지).
// 각색: **이벤트 방(묘비·샘·석상·나그네·관·해골왕관)을 해결할 때마다 게이지 +1**,
// 5가 되면 던전 화면에 소환 배너 — 맞서면 게이지 0으로. 도망칠 수 있다(배너 무시).
export const BURIED_CALAMITY_GAUGE_MAX = 5;
export const BURIED_CALAMITY = {
  key: 'calamity', name: '재앙 — 낙젤리온의 그림자',
  img: { key: 'nakzelionShadow', chapter: 4 }, color: '#4a1f5c',
  desc: '이 무덤 아래 잠든 것의 그림자. 마주친 자는 돌아오지 못했다.',
  tier: 'boss',
  actions: [
    { name: '그림자 발톱', power: 118, kind: 'attack', apply: [{ s: 'bleed', n: 3, p: 100 }], weight: 3 },
    { name: '심연의 응시', power: 70, kind: 'attack', apply: [{ s: 'curse', n: 2, p: 100 }, { s: 'confuse', n: 1, p: 60 }], weight: 2 },
    { name: '종언의 파도', power: 95, kind: 'attack', hits: 3, heavy: true, weight: 2 },
    { name: '그림자 육신', kind: 'defend', self: [{ s: 'guard', n: 4 }, { s: 'wall', n: 1 }], weight: 1 },
  ],
};
// 재앙 실체화 — 현재 마물 레벨 기반으로 크게 강하다.
// ⚠️ 기울기 0.16 — 보스(던전별 스케일)보다 완만하면 심연에서 역전된다 (시뮬 검증 필수)
export function buildBuriedCalamity(char) {
  const lv = buriedMonsterLevel(char) + 3;
  const m = 1 + (lv - 1) * 0.16;
  return {
    ...BURIED_CALAMITY,
    lv,
    hp: Math.round(480 * m * 1.35),
    atk: Math.round(34 * m * 1.15),
    def: Math.round(12 * (1 + (lv - 1) * 0.08)),
    exp: Math.round(300 * (1 + (lv - 1) * 0.1)),
    gold: [260, 420],
    roomType: 'calamity', isBoss: true,
  };
}
// 재앙 보상 — 조각 대량 + 유니크 확정 + 먼지
export const BURIED_CALAMITY_REWARD = {
  shards: { labyrinth: 15, ruins: 20, chasm: 25, abyss: 30 },
  dust: 80,
};

// =========================================================
// 26. ⚔ 난입 — 라이벌 등반자 100인 (1.153.0, PM 지시)
// =========================================================
// 「일반 적인 줄 알고 들어갔는데 다른 유저를 만난다」 — 솔로 게임에 유사 멀티 감각을 넣는 축.
// 설계 원칙 3가지:
//   ① **결정론 시뮬** — 더미 100명의 등반은 전부 시드 함수로 계산한다. 저장하는 것은
//      `meta.buried.rivalTicks`(내 누적 걸음) 하나뿐. 언제 계산해도 같은 결과 = 치트·꼬임 없음.
//   ② **시계 = 내 걸음** — "내가 진행한 만큼 세계도 움직인다"(PM). 방을 하나 지날 때마다
//      전 더미의 시간이 1틱 흐른다. 자리를 비워도 더미가 앞서가지 않는다.
//   ③ 더미도 죽고, 체크포인트에서 재출발한다 — 실제 유저의 등반 곡선을 흉내 낸다.
// ⚠ 밸런스 조정은 BURIED_RIVAL_TUNING 한 곳.

export const BURIED_RIVAL_TUNING = {
  count: 100,          // 더미 수
  intrusionPct: 1,     // 일반 전투 방에서 난입으로 바뀔 확률 (%) — 1.154.0 PM 지시 「100층에 1번 수준」
  hpMult: 1.7,         // 난입 적 HP = 파리티 유저 최대 HP × 이 값 (유저전 특유의 "질긴" 감각)
  hitPct: 27,          // 난입 적 일반타 = 내 최대 HP의 이 % (내 방어를 반영해 역산 — 전 층 일정한 위협)
  defMult: 0.55,       // 방어·회피는 절반 수준 — 유저전이 수문장보다 아프면 안 된다
  statSteal: 2,        // 승리 시 주 스탯 영구 획득 기본치 (+ 마물 25레벨당 +1)
};

// 시드 난수 — mulberry32. Math.random 금지 구역 (결정론이 시스템의 뼈대다)
function rivalRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 더미 100인 — 고정 시드로 코드에서 생성 (항상 동일한 로스터)
export const BURIED_RIVALS = (() => {
  const A = ['잿빛', '새벽', '침묵의', '어스름', '핏빛', '무저갱', '떠도는', '녹슨', '창백한', '검은',
             '여명의', '황혼', '무너진', '얼어붙은', '이름없는', '가면의', '탑골', '심연의', '폐허의', '달빛'];
  const B = ['까마귀', '삽자루', '순례자', '등불', '해골꾼', '올빼미', '이리', '문지기', '곡괭이', '나방',
             '방울뱀', '지렁이', '수집가', '약장수', '재봉사', '거미', '박쥐', '독버섯', '두더지', '유령'];
  const solo = ['무덤도둑A', '9층주민', '포기를모름', '한줌의재', '지하철도', '뼈와먼지', '백골단장', '관짝수집가',
                'RIP중독', '심장이두개', '오늘도유령', '가지마세요', '먼지풀풀', '지하실장', '평생등반러'];
  const rng = rivalRng(20260819);
  const dungeons = ['labyrinth', 'ruins', 'chasm', 'abyss'];
  const classes = buriedAllClasses().map(c => c.id);
  const names = new Set();
  const out = [];
  while (out.length < BURIED_RIVAL_TUNING.count) {
    const i = out.length;
    let name;
    if (i < solo.length && rng() < 0.7) name = solo[i];
    else name = A[Math.floor(rng() * A.length)] + ' ' + B[Math.floor(rng() * B.length)];
    if (names.has(name)) continue;
    names.add(name);
    const classId = classes[Math.floor(rng() * classes.length)];
    out.push({
      id: `rv${i}`,
      name,
      classId,
      dungeonId: dungeons[i % 4],           // 4던전 균등 배치 (25명씩)
      pace: 0.5 + rng() * 1.3,              // 등반 실력 계수 — 상위권은 나보다 빠르다
      grit: 60 + Math.floor(rng() * 160),   // 평균 런 길이(틱) — 길수록 한 런에 깊이 간다
      seed: Math.floor(rng() * 1e9),
    });
  }
  return out;
})();

// 더미의 런 목록 — [{ runNo, floor(도달층), len(틱), ongoing }] (1.154.0 — 랭킹이 런 단위가 되면서 분리)
// 런 구조: 체크포인트(최고기록의 100층 단위)에서 출발 → 심층 감속·숙련 성장 반영해 오르고 사망 → 재출발.
// gen = 더미 세계 세대. 초기화하면 gen이 올라 시드가 바뀌고 완전히 새 등반 이력이 시작된다.
export function buriedRivalRuns(rival, ticks, gen = 0) {
  const rng = rivalRng(rival.seed + gen * 7777777);
  const out = [];
  let best = 0, t = 0, runs = 0;
  while (t < ticks && runs < 400) {
    runs++;
    const len = Math.max(20, Math.round(rival.grit * (0.5 + rng() * 1.0)));
    const used = Math.min(len, ticks - t);
    const start = 1 + Math.floor(best / 100) * 100;             // 돌파한 관문 너머에서 재출발
    // 심층 감속(깊이 압력 재현) × 숙련 성장 — 숙련이 없으면 한 런에 +100층을 영원히 못 넘어 세계가 정체한다
    const climb = rival.pace * Math.pow(used, 0.78) * (1 / (1 + start / 350)) * (1 + runs * 0.012);
    // 100층 관문 통과 판정 — 관문마다 실력 굴림. 런을 거듭할수록 통과율이 조금씩 오른다
    let reach = start + climb;
    const gate = (Math.floor(start / 100) + 1) * 100;
    if (reach >= gate && rng() > 0.30 + rival.pace * 0.22 + runs * 0.006) reach = gate - 1 - Math.floor(rng() * 4);
    const floor = Math.max(1, Math.round(reach));
    best = Math.max(best, floor);
    t += used;
    out.push({ runNo: runs, floor, len: used, ongoing: used < len && t >= ticks });
    if (used < len) break; // 진행 중인 런 (아직 안 죽음)
  }
  return out;
}

// 더미의 시각 t(틱)에서의 요약 상태 — { floor: 현재 층, best: 최고 기록, runs: 런 수 }
export function buriedRivalState(rival, ticks, gen = 0) {
  const runs = buriedRivalRuns(rival, ticks, gen);
  const last = runs[runs.length - 1];
  return {
    floor: last ? last.floor : 1,
    best: runs.reduce((m, r) => Math.max(m, r.floor), 0),
    runs: runs.length,
  };
}

// 던전별 등반 랭킹 TOP N — 1.154.0 개편: **런(등반 1회) 단위**. 같은 등반자의 여러 런이
// 순위를 독식할 수 있다 (PM: "한 번 등반한 기록 결과가 랭킹이야").
// myRuns = 내 사망 기록(runLog 중 이 던전) / myLive = 진행 중인 내 런 (있으면 실시간 반영)
export function buriedRivalRanking(dungeonId, ticks, { gen = 0, myRuns = [], myLive = null, topN = 10 } = {}) {
  const rows = [];
  for (const r of BURIED_RIVALS.filter(x => x.dungeonId === dungeonId)) {
    for (const run of buriedRivalRuns(r, ticks, gen)) {
      rows.push({ name: r.name, classId: r.classId, floor: run.floor, runNo: run.runNo, rivalId: r.id, ongoing: run.ongoing, isMe: false });
    }
  }
  myRuns.forEach((m, i) => rows.push({ name: '나', classId: m.classId, floor: m.floor, isMe: true, entry: m, runNo: i + 1 }));
  if (myLive?.floor > 0) rows.push({ name: '나', classId: myLive.classId, floor: myLive.floor, isMe: true, ongoing: true, live: true });
  rows.sort((a, b) => b.floor - a.floor);
  const myBestRank = rows.findIndex(r => r.isMe) + 1 || null;
  return { rows: rows.slice(0, topN), myRank: myBestRank, total: rows.length };
}

// 틱 구간 사이에 100층 경계를 새로 넘은 더미 — 공지용. 결정론이라 전후 비교만 하면 된다
export function buriedRivalNews(prevTicks, ticks, limit = 2, gen = 0) {
  if (ticks <= prevTicks) return [];
  const news = [];
  for (const r of BURIED_RIVALS) {
    const a = Math.floor(buriedRivalState(r, prevTicks, gen).best / 100);
    const b = buriedRivalState(r, ticks, gen).best;
    if (Math.floor(b / 100) > a) news.push({ name: r.name, classId: r.classId, floor: Math.floor(b / 100) * 100, dungeonId: r.dungeonId });
  }
  news.sort((x, y) => y.floor - x.floor);
  return news.slice(0, limit);
}

// 전투 방 난입 판정 — 내 층 근처(±40%)를 오르는 중인 더미를 상대로 고른다.
// Math.random 사용 — 반드시 이벤트 핸들러(enterRoom)에서만 부를 것 (setMeta updater 금지).
export function rollBuriedIntrusion(char, ticks, gen = 0) {
  if (Math.random() * 100 >= BURIED_RIVAL_TUNING.intrusionPct) return null;
  const myFloor = char.floor || 1;
  const beaten = char.beatenRivals || [];
  const near = BURIED_RIVALS.filter(r => {
    if (beaten.includes(r.id)) return null;
    const f = buriedRivalState(r, ticks, gen).floor;
    return f >= myFloor * 0.6 && f <= myFloor * 1.6;
  }).filter(Boolean);
  const pool = near.length > 0 ? near : BURIED_RIVALS.filter(r => !beaten.includes(r.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 난입 적 생성 — 상대는 "그 층 파리티 장비를 갖춘 유저". 실제 캐릭터 생성 공식으로 스탯을 만든다.
export function buildBuriedRivalEnemy(rival, char, stolenPts = 0) {
  // stolenPts = 이 더미가 과거 난입에서 나를 이기고 빼앗아간 스탯 포인트 — 그만큼 실제로 강해져 돌아온다
  const T = BURIED_RIVAL_TUNING;
  const floor = char.floor || 1;
  const dummy = createBuriedChar(rival.classId, { items: [], gold: 0 }, char.dungeonId || 'labyrinth', [], {}, floor);
  const d = buriedDerived(dummy);
  const cls = getBuriedClass(rival.classId);
  // 공격력은 "내가 얼마나 아프게 맞느냐"로 역산 — 수문장 상한(1.152.0)과 같은 자기교정 방식.
  // 파리티 스탯을 그대로 쓰면 심층에서 내 방어 감쇠에 묻혀 10%대로 물렁해진다(실측).
  const pd = buriedDerived(char);
  const myDefMult = Math.max(0.25, 100 / (100 + (pd.def || 0)));
  const stealBoost = 1 + Math.min(40, stolenPts * 2) / 100; // 뺏은 포인트당 +2% (최대 +40%)
  const atk = Math.max(1, Math.round((pd.maxHp * T.hitPct / 100) / (myDefMult * (BURIED_TUNING.enemyDmgMult || 1)) * stealBoost));
  const mainStatKey = Object.entries(cls.stats).sort((a, b) => b[1] - a[1])[0][0];
  const mainStat = BURIED_STATS.find(s => s.id === mainStatKey);
  return {
    key: `rival_${rival.id}`,
    name: `등반자 「${rival.name}」`,
    color: cls.color,
    tier: 'elite',
    lv: buriedMonsterLevel(char),
    hp: Math.round(d.maxHp * T.hpMult * (1 + Math.min(40, stolenPts * 2) / 100)),
    atk,
    def: Math.round(d.def * T.defMult),
    crit: d.crit,
    dodge: Math.round(d.dodge * T.defMult),
    exp: Math.round(30 * (1 + (buriedMonsterLevel(char) - 1) * 0.1) * 1.3),
    gold: [Math.round(40 * (1 + floor * 0.02)), Math.round(90 * (1 + floor * 0.02))],
    actions: [
      { name: '가늠하기', power: 90, kind: 'attack', weight: 3 },
      { name: `${cls.name}의 일격`, power: 125, kind: 'attack', weight: 3 },
      { name: '필살의 한 수', power: 175, kind: 'attack', heavy: true, weight: 2 },
    ],
    // 전투·정산이 읽는 난입 메타
    rival: { id: rival.id, name: rival.name, classId: rival.classId, mainStat: mainStatKey, mainStatName: mainStat?.name, image: cls.image },
    roomType: 'battle', isBoss: false,
  };
}

// 승리 보상 — 상대 주 스탯 영구 획득량 (샘·석상과 같은 심층 스케일)
export function buriedRivalStatGain(char) {
  return BURIED_RIVAL_TUNING.statSteal + Math.floor(buriedMonsterLevel(char) / 25);
}

// 시드 고정 실행 (1.154.0) — 블록 안에서 Math.random이 시드 난수로 바뀐다.
// 기존 롤러(rollBuriedItem 등)를 결정론으로 재사용하기 위한 유틸. 반드시 동기 블록에서만 쓸 것.
export function withSeededRandom(seed, fn) {
  const orig = Math.random;
  const rng = rivalRng(seed >>> 0);
  Math.random = rng;
  try { return fn(); } finally { Math.random = orig; }
}

// 라이벌 런의 「죽기 직전」 상세 스냅샷 (1.154.0, PM: 공략에 쓸 수 있게 가능한 정보 전부) —
// 상태창(스탯·파생), 장비 6슬롯, 주 사용 스킬 분포, 사망 원인까지 시드로 결정론 재구성한다.
// 같은 (더미, 런, 세대)는 언제 열어도 같은 스냅샷 — 저장 0바이트.
export function buriedRivalSnapshot(rival, runNo, floor, gen = 0) {
  return withSeededRandom((rival.seed ^ Math.imul(runNo, 2654435761) ^ (gen * 97)) >>> 0, () => {
    const ch = createBuriedChar(rival.classId, { items: [], gold: 0 }, rival.dungeonId, [], {}, Math.max(1, floor));
    // 그 층 파리티 등급으로 장비 6슬롯을 다시 굴린다 (낡은 시작 장비 → 실제 등반 장비)
    for (const slot of BURIED_SLOT_IDS) {
      const it = rollBuriedItem({ slot, classId: rival.classId, floor: buriedMonsterLevel(ch), luck: 2, powerMult: buriedLootPower(ch) });
      if (it) ch.equipped[slot] = it;
    }
    const d = buriedDerived(ch);
    // 주 사용 스킬 — 장착 스킬에 시드 가중치로 사용률 분배 (공격기는 가중 ↑)
    const skills = buriedEquippedSkills(ch).map(x => x.skill);
    const w = skills.map(sk => (sk.power ? 3 : 1) * (0.5 + Math.random()));
    const tot = w.reduce((a, b) => a + b, 0) || 1;
    const topSkills = skills.map((sk, i) => ({ id: sk.id, name: sk.name, pct: Math.round((w[i] / tot) * 100) }))
      .sort((a, b) => b.pct - a.pct);
    // 사망 원인 — 그 층에서 실제로 나올 법한 적 (100층 배수면 수문장이 잡는다)
    let killer = '무덤의 어둠';
    try { killer = buildBuriedRoomEnemy(ch, Math.random() < 0.3 ? 'elite' : 'battle')?.name || killer; } catch { /* noop */ }
    return {
      name: rival.name, classId: rival.classId, dungeonId: rival.dungeonId,
      floor, runNo, monLv: buriedMonsterLevel(ch),
      stats: ch.stats,
      derived: { maxHp: d.maxHp, atk: d.atk, fin: d.fin, mag: d.mag, def: d.def, crit: d.crit, dodge: d.dodge, barrier: d.barrier || 0 },
      equipped: BURIED_SLOT_IDS.map(sl => ch.equipped[sl]).filter(Boolean),
      topSkills: topSkills.slice(0, 4),
      killer,
    };
  });
}
