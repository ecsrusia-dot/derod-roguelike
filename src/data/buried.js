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
];
export const getBuriedRace = (id) => BURIED_RACES.find(r => r.id === id) || null;
// 종족 fx 뭉치 — 특성·계약·부품과 같은 소비 어휘 (미선택 구 캐릭터는 빈 객체 = 회귀 안전)
export function buriedRaceFx(char) {
  return getBuriedRace(char?.raceId)?.fx || {};
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
  stormVolley: SK({ id: 'stormVolley', name: '폭풍 화살',  slot: 'weapon', line: 'bow', gear: '폭풍궁',     sp: 26, cd: 2, stat: 'dex', power: 58, hits: 4, desc: '4연타 (타격당 58%).' }),
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
};
export const BURIED_SKILL_LIST = Object.values(BURIED_SKILLS);

// 기본 공격 — 장비가 없어도 항상 사용 가능 (SP 0, 사용 시 SP 회복)
export const BURIED_BASIC = {
  id: 'basic', name: '기본 공격', sp: 0, cd: 0, power: 85, spGain: 14,
  desc: '물리·기교·마법 중 가장 높은 공격력으로 후려친다. SP +14',
};

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

// 강화 — 제단에서 +1씩. 단계당 스탯 +12%. 1.117.0 — 비용이 마물 레벨을 따라 자란다 (심층 골드 싱크)
export const BURIED_ENHANCE_MAX = 5;
export const buriedEnhanceMult = (plus) => 1 + (plus || 0) * 0.12;
export const buriedEnhanceCost = (plus, monLevel = 1) =>
  Math.round((60 + (plus || 0) * 55) * (1 + Math.max(0, (monLevel || 1) - 1) * 0.06));

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
  return {
    id: nextItemId(),
    slot: slotId, pool, tier: t.id, skillId: skill.id,
    name: `${t.name} ${affix ? affix + ' ' : ''}${skill.gear}`,
    stats, options, plus: 0, floor: floor || 1,
  };
}

// 장비의 최종 스탯 (기본 + 옵션 + 강화)
export function buriedItemStats(item) {
  if (!item) return {};
  const mult = buriedEnhanceMult(item.plus);
  const out = {};
  for (const [k, v] of Object.entries(item.stats || {})) out[k] = Math.round(v * mult);
  for (const o of item.options || []) out[o.key] = (out[o.key] || 0) + o.value;
  return out;
}

// 분해 가치 (무덤 먼지) — 1.117.0~ 장비 레벨도 반영 (심층 장비 정산이 의미를 갖도록)
export function buriedDustValue(item) {
  if (!item) return 0;
  return getBuriedTier(item.tier).dust + (item.plus || 0) * 2 + Math.floor((item.floor || 1) / 3);
}

// =========================================================
// 7. 캐릭터 — 생성 / 파생 스탯 / 레벨
// =========================================================
export const buriedExpToNext = (lv) => 32 + lv * 20;

export function createBuriedChar(classId, legacy = { items: [], gold: 0 }, dungeonId = 'labyrinth', contracts = [], partsFx = {}, startFloor = 1, depthTraits = [], raceId = null) {
  const cls = getBuriedClass(classId);
  if (!cls) return null;
  const race = getBuriedRace(raceId);
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
    stats: Object.fromEntries(Object.entries(cls.stats).map(([k, v]) =>
      [k, Math.max(1, v + (race?.statMods?.[k] || 0))])),
    gold: 80 + (legacy.gold || 0),
    equipped,
    pendingLoot: [], // 1.113.0 — 획득 즉시 [교체/버리기] 판단 대기열
    runes: [],       // 1.123.0 — ᚱ 룬 주머니 (각인 전 보관)
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
  char.hp = buriedDerived(char).maxHp;
  return char;
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
  const gear = {};
  for (const s of BURIED_SLOT_IDS) {
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
  return {
    stats: st,
    traitFx: tf,
    // 1.113.0 — 레벨당 HP+18 폐지 (성장은 100% 장비)
    maxHp:   Math.max(1, Math.round((140 + st.vit * 11 + (gear.hp || 0) + (tf.hp || 0) + (pf.hp || 0) + (rf.hp || 0)) * (tf.hpMult || 1) * (rf.hpMult || 1) * (1 + (cf.hpPct || 0) / 100) * (1 - Math.min(50, char.curseHpLossPct || 0) / 100))),
    maxSp:   Math.round(38 + st.int * 1.3 + (gear.sp || 0) + (tf.sp || 0) + (rf.sp || 0)),
    atk:     Math.round((10 + st.str * 1.6 + (gear.atk || 0) + (pf.atk || 0)) * (1 + ((tf.physPct || 0) + (cf.physPct || 0) + (rf.physPct || 0)) / 100)),
    fin:     Math.round((10 + st.dex * 1.6 + (gear.atk || 0) + (pf.atk || 0)) * (1 + ((tf.physPct || 0) + (cf.physPct || 0) + (rf.physPct || 0)) / 100)),
    mag:     Math.round((10 + st.int * 1.6 + (gear.mag || 0) + (pf.mag || 0)) * (1 + ((tf.magPct || 0) + (cf.magPct || 0) + (rf.magPct || 0)) / 100)),
    def:     Math.round(4 + st.vit * 0.9 + (gear.def || 0) + (pf.def || 0)),
    crit:    Math.round(5 + st.dex * 0.6 + (gear.crit || 0) + (tf.crit || 0) + (cf.crit || 0) + (pf.crit || 0) + (rf.crit || 0)),
    critDmg: 60 + (gear.critDmg || 0),
    dodge:   Math.min(45, Math.round(3 + st.dex * 0.4 + (gear.dodge || 0) + (tf.dodge || 0) + (cf.dodge || 0) + (pf.dodge || 0) + (rf.dodge || 0))),
    // 1.118.0 — 패시브 회복 9+int/8 → 3+int/12 (PM: SP가 무의미). 이제 SP의 주 엔진은
    // 기본 공격(+14)·마력 흡수·집중이고, 패시브·장비 spRegen은 보조가 된다
    spRegen: Math.round(3 + st.int / 12 + (gear.spRegen || 0) + (pf.spRegen || 0)),
    barrier: Math.round(((gear.barrier || 0) + (tf.barrier || 0) + (pf.barrier || 0) + (rf.barrier || 0)) * (1 + (cf.barrierPct || 0) / 100)),
    chase:   Math.round((gear.chase || 0) + (tf.chase || 0) + (pf.chase || 0)),
    healPct: (tf.healPct || 0) + (cf.healPct || 0) + (pf.healPct || 0) + (rf.healPct || 0),
    drainPct: (tf.drainPct || 0) + (cf.drainPct || 0) + (pf.drainPct || 0) + (rf.drainPct || 0),
  };
}

// 장착 중인 6슬롯의 스킬 목록 (빈 슬롯은 제외)
export function buriedEquippedSkills(char) {
  if (!char) return [];
  return BURIED_SLOT_IDS
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
};
export const BURIED_ENEMY_LIST = Object.values(BURIED_ENEMIES);
// 수문장 로테이션 — 100층 망령왕 → 200층 마에스트로 → 300층 낙젤리온 → 반복
export const BURIED_GUARDIAN_KEYS = ['gateWraithKing', 'gateMaestro', 'gateNakzelion'];

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
export const BURIED_POTION_PRICE = 55; // 기준가 — 실판매가는 buriedPotionPrice(마물 레벨)
export const buriedPotionPrice = (monLevel = 1) =>
  Math.round(BURIED_POTION_PRICE * (1 + Math.max(0, (monLevel || 1) - 1) * 0.08));

// =========================================================
// 10. 전투 계산 — 순수 함수 (BuriedBattleScreen이 호출만 한다)
// =========================================================
export const BURIED_TUNING = {
  enemyDmgMult: 1.1,   // 적 화력 체감 조정은 여기 한 곳. 1.113.0 — 레벨 스탯 폐지에도 "너무 쉽다" 응답으로 +10%
  playerDmgMult: 1.0,
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
  const critRate = def.immuneCrit ? 0 : (att.crit || 0) + (skill.critBonus || 0) + (att.envCritAdd || 0);
  let offense = buriedOffenseMult(att) * (1 + (att.envDmgPct || 0) / 100);
  if (statKey === 'int') offense *= 1 + (att.envMagPct || 0) / 100;
  const taken = buriedTakenMult(def) * (1 + (def.envTakenPct || 0) / 100);
  const effDef = skill.pierce ? 0 : buriedEffDef(def);
  // 1.121.0 — 감쇠 하한 25%: 방어가 아무리 높아도 피해의 1/4은 통과 (심층 "안 아픔" 붕괴 픽스)
  const defMult = Math.max(0.25, 100 / (100 + effDef));

  let power = skill.power || 0;
  if (skill.executeBelow && def.maxHp > 0 && (def.hp / def.maxHp) * 100 <= skill.executeBelow) power *= 2;
  if (skill.berserk && att.maxHp > 0) power *= 1 + (1 - att.hp / att.maxHp);
  // 특성 — 혈투 / 혈군 (HP가 낮을수록 강해진다)
  const lowHp = att.maxHp > 0 && att.hp / att.maxHp <= 0.5;
  if (lowHp && traits.includes('bloodlord')) power *= 1.45;
  else if (lowHp && traits.includes('bloodrush')) power *= 1.25;
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
export function applyBuriedStatuses(statuses, list, { chancePct = 0, extra = 0 } = {}) {
  if (!list || list.length === 0) return statuses;
  const next = { ...statuses };
  for (const a of list) {
    const def = BURIED_STATUS[a.s];
    if (!def) continue;
    const chance = a.p != null ? a.p + chancePct : 100 + chancePct;
    if (chance < 100 && Math.random() * 100 >= chance) continue;
    next[a.s] = Math.min(def.max, (next[a.s] || 0) + (a.n || 1) + extra);
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
  return {
    dust: items.reduce((s, it) => s + buriedDustValue(it), 0),
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
  // 1.120.0 — 100층 단위 층계 수문장 (일반 보스 로테이션보다 우선)
  if (floor > 0 && floor % 100 === 0) {
    return BURIED_GUARDIAN_KEYS[(Math.floor(floor / 100) - 1) % BURIED_GUARDIAN_KEYS.length];
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
export function stepBuriedChar(char, extraSteps = 0) {
  return { ...char, steps: (char.steps || 0) + 1 + extraSteps };
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
    enemy = { ...enemy, hp: Math.round(enemy.hp * pressure), atk: Math.round(enemy.atk * pressure) };
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
    stats: { str: 7, dex: 19, int: 10, vit: 10 },
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
export const buriedAllClasses = () => [...BURIED_CLASSES, ...BURIED_ADVANCED_CLASSES, ...BURIED_ENCOUNTER_CLASSES, ...BURIED_DEPTH_CLASSES];

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
export function buriedSkillAt(skill, lv = 1) {
  if (!skill) return skill;
  const L = Math.min(BURIED_SKILL_MAX_LV, Math.max(1, lv));
  if (L === 1) return skill;
  const out = { ...skill, lv: L };
  let mult = 1 + (L - 1) * 0.07;
  let stackBonus = 0;
  if (L >= 3) { stackBonus += 1; out.sp = Math.max(0, skill.sp - 2); }
  if (L >= 8) { mult += 0.10; stackBonus += 1; out.chaseBonusPct = (out.chaseBonusPct || 0) + 20; }
  if (out.power) out.power = Math.round(skill.power * mult);
  if (out.heal) out.heal = Math.round(skill.heal * mult);
  if (out.barrierGain) out.barrierGain = Math.round(skill.barrierGain * mult);
  if (stackBonus > 0) {
    if (skill.apply) out.apply = skill.apply.map(a => ({ ...a, n: (a.n || 1) + stackBonus }));
    if (skill.self) out.self = skill.self.map(a => ({ ...a, n: (a.n || 1) + stackBonus }));
  }
  if (skill.lv3 && L >= 3) Object.assign(out, skill.lv3);
  if (skill.lv8 && L >= 8) Object.assign(out, skill.lv8);
  return out;
}
// Lv.3 / Lv.8에서 무엇이 열리는지 안내 문구 (UI 표시용)
export function buriedSkillLvNote(skill, lv) {
  const notes = [];
  notes.push(lv >= 3 ? '✓ Lv.3 — 상태이상 +1스택 · SP -2' : '· Lv.3 — 상태이상 +1스택 · SP -2');
  notes.push(lv >= 8 ? '✓ Lv.8 — 위력 +10% · 추격 +20% · 상태이상 +1' : '· Lv.8 — 위력 +10% · 추격 +20% · 상태이상 +1');
  return notes;
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
    exp: Math.round(base.exp * (1 + (lv - 1) * 0.1)),
    gold: [Math.round(base.gold[0] * m), Math.round(base.gold[1] * m)], // 1.117.0 — 골드도 레벨 스케일 (상점·강화 경제 유지)
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
  if (!replace) {
    return { char: { ...char, pendingLoot: rest }, dustGain: buriedDustValue(item), dismantled: item };
  }
  const prev = char.equipped?.[item.slot] || null;
  let next = { ...char, pendingLoot: rest, equipped: { ...char.equipped, [item.slot]: item } };
  next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
  return { char: next, dustGain: prev ? buriedDustValue(prev) : 0, dismantled: prev };
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
  randomCost: 40,    // 랜덤 등급 제작
  epicCost: 180,     // 영웅의 이상 확정 제작 (영웅 75% / 유물급 25%)
};
// 제작 장비 레벨 — 1.117.0: 역대 최고 도달 '층'을 **마물 레벨로 환산** (미궁 기준 4걸음/Lv).
// 층수를 그대로 장비 레벨로 쓰면 드랍(마물 레벨 기준) 대비 3.7배 파워 브레이크가 난다 (감사 픽스)
export const buriedForgeLevel = (deepest) => Math.max(3, 1 + Math.floor(Math.max(0, (deepest || 0) - 1) / 4));

export function craftBuriedItem({ slot, classId, deepest, epic = false, char = null }) {
  // 1.121.0 — 탐험 중이면 현재 깊이 기준으로 벼린다 (심층에서도 재련소가 의미를 갖도록)
  const floor = char ? buriedMonsterLevel(char) : buriedForgeLevel(deepest);
  const powerMult = char ? buriedLootPower(char) : 1;
  if (!epic) return rollBuriedItem({ slot, classId, floor, luck: 3, powerMult });
  const tier = Math.random() < 0.75 ? 'epic' : 'relic';
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
  if (skill.power) {
    if (skill.hits > 1) push(`${skill.hits}회 연속 타격 — 타격마다 위력 ${skill.power}% 적용`);
    if (skill.pierce) push('방어 무시 — 적 방어력을 계산하지 않는다');
    if (skill.critBonus) push(`이 스킬 한정 치명 확률 +${skill.critBonus}%`);
    if (skill.executeBelow) push(`적 HP ${skill.executeBelow}% 이하면 데미지 2배`);
    if (skill.berserk) push('잃은 HP 비율만큼 위력 증가 (최대 2배)');
    if (skill.drain) push(`준 피해의 ${skill.drain}%만큼 HP 회복`);
  }
  for (const a of skill.apply || []) {
    const st = BURIED_STATUS[a.s];
    if (!st) continue;
    push(`적에게 ${st.icon}[${st.name}] ${a.n}${a.p != null && a.p < 100 ? ` (${a.p}% 확률)` : ''} — ${st.desc}`, st.color);
  }
  for (const a of skill.self || []) {
    const st = BURIED_STATUS[a.s];
    if (!st) continue;
    push(`자신에게 ${st.icon}[${st.name}] ${a.n} — ${st.desc}`, st.color);
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
  UQ({ id: 'u107', name: '거체의 반지',     slot: 'acc',   skillId: 'bloodSigil',  src: 107, desc: '물리·기교 공격력이 최대 HP의 8%만큼 증가한다.' }),
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
  UQ({ id: 'u36',  name: '비전',           slot: 'acc',   skillId: 'venomSigil',  src: 36,  desc: '적을 처치할 때마다 모든 공격력 +2 (이번 런 영구).' }),
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
];
export const getBuriedUnique = (id) => BURIED_UNIQUES.find(u => u.id === id) || null;

// 장착 중인 유니크 효과 보유 여부 — 전투·던전·App이 이것 하나로 분기
export function buriedUniqueIds(char) {
  if (!char) return [];
  return BURIED_SLOT_IDS
    .map(s => char.equipped?.[s]?.unique)
    .filter(Boolean);
}
export const hasBuriedUnique = (char, id) => buriedUniqueIds(char).includes(id);

// 유니크 장비 생성 — 스탯은 전설 등급 배율, 이름·스킬·효과 고정.
// 1.115.0 — dungeonId·deep: 던전 전용 유니크는 그 던전 심층에서만 풀에 들어오고,
// 미보유 전용이 남아 있으면 50% 확률로 전용 쪽을 우선 뽑는다 (공략 목적지 역할)
export function rollBuriedUniqueItem({ classId, floor = 1, excludeIds = [], dungeonId = null, deep = false, powerMult = 1 } = {}) {
  const generic = BURIED_UNIQUES.filter(u => !u.dungeon && !excludeIds.includes(u.id));
  const exclusive = (deep && dungeonId)
    ? BURIED_UNIQUES.filter(u => u.dungeon === dungeonId && !excludeIds.includes(u.id))
    : [];
  const pool = exclusive.length > 0 && Math.random() < 0.5 ? exclusive : [...generic, ...exclusive];
  if (pool.length === 0) return null;
  const def = pick(pool);
  const slotId = def.slot === 'acc' ? (Math.random() < 0.5 ? 'acc1' : 'acc2') : def.slot;
  const base = rollBuriedItem({ slot: slotId, classId, floor, tier: 'legend', powerMult });
  if (!base) return null;
  return {
    ...base,
    skillId: def.skillId,
    unique: def.id,
    name: def.name,
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
  return out;
}

export function buriedModdedSkill(skill, modId, runeId = null) {
  const mod = getBuriedMod(modId);
  const rune = getBuriedRune(runeId);
  if (!skill || (!mod && !rune)) return skill;
  let out = { ...skill };
  if (mod) { out.modId = modId; out = applyBuriedSkillFx(out, mod.fx); }
  if (rune) { out.runeId = runeId; out = applyBuriedSkillFx(out, rune.fx); }
  return out;
}

// =========================================================
// 21b. ᚱ 룬 소켓 (1.123.0) — BB2 데이터시트 이식 2탄
// =========================================================
// 원작 규칙(도박 룰): 룬은 장비의 스킬에 영구 각인된다 — 제거·교체 불가.
// 그 장비를 버리거나 분해하면 룬도 함께 소멸한다. 장비당 소켓 1칸.
// fx 어휘는 접두어(BURIED_MODS)와 100% 동일 — applyBuriedSkillFx가 공용 적용.
export const BURIED_RUNE_RARITIES = {
  1: { stars: '★',     color: '#9b8975' },
  2: { stars: '★★',    color: '#7ba3c4' },
  3: { stars: '★★★',   color: '#c48bd4' },
  4: { stars: '★★★★', color: '#e8b04a' },
};
export const BURIED_RUNES = {
  // 1★ — 기본기 (시트: パワー弱·コスト弱·シールダー·ヒーラー)
  rPower1: { id: 'rPower1', name: '힘의 룬',   rarity: 1, desc: '위력 +12%',                fx: { powerPct: 12 } },
  rSave1:  { id: 'rSave1',  name: '절약의 룬', rarity: 1, desc: 'SP 소모 -25%',             fx: { spPct: -25 } },
  rGuard1: { id: 'rGuard1', name: '수호의 룬', rarity: 1, desc: '사용 시 보호막 +12',        fx: { barrierGain: 12 } },
  rMend1:  { id: 'rMend1',  name: '치유의 룬', rarity: 1, desc: '사용 시 HP 10 회복',        fx: { heal: 10 } },
  // 2★ — 전술 (시트: スピード弱·クリティカル中·ステイン·パリィ 계열)
  rSpeed:  { id: 'rSpeed',  name: '신속의 룬', rarity: 2, desc: '쿨다운 -1',                fx: { cdAdd: -1 } },
  rKeen:   { id: 'rKeen',   name: '예리한 룬', rarity: 2, desc: '이 스킬 치명 확률 +12%',    fx: { critBonus: 12 } },
  rVenom:  { id: 'rVenom',  name: '맹독의 룬', rarity: 2, desc: '적중 시 [중독] 2 부여',     fx: { addApply: { s: 'poison', n: 2, p: 100 } } },
  rBind:   { id: 'rBind',   name: '결박의 룬', rarity: 2, desc: '적중 시 [속박] 1 부여',     fx: { addApply: { s: 'bind', n: 1, p: 100 } } },
  rWall:   { id: 'rWall',   name: '방벽의 룬', rarity: 2, desc: '사용 시 25% 확률 🧱방벽 +1', fx: { wallChance: 25 } },
  // 3★ — 강력 (시트: パワー中·レイジ弱·エンチャント 계열)
  rRage:   { id: 'rRage',   name: '격노의 룬', rarity: 3, desc: '위력 +30%, 사용 시 자해 6',  fx: { powerPct: 30, selfDmg: 6 } },
  rDrain:  { id: 'rDrain',  name: '흡혈의 룬', rarity: 3, desc: '준 피해의 20% 흡혈',        fx: { drain: 20 } },
  rPierce: { id: 'rPierce', name: '관통의 룬', rarity: 3, desc: '방어·보호막 무시',          fx: { pierce: true } },
  rChain:  { id: 'rChain',  name: '연쇄의 룬', rarity: 3, desc: '적중 시 다른 스킬 쿨다운 -1', fx: { cdrOnHit: 1 } },
  // 4★ — 유일급 (시트: 상위 희귀 룬 포지션)
  rDoom:   { id: 'rDoom',   name: '파멸의 룬', rarity: 4, desc: '위력 +65%, 쿨다운 2배(최소 2)', fx: { powerPct: 65, cdMult: 2 } },
  rKing:   { id: 'rKing',   name: '군주의 룬', rarity: 4, desc: '위력 +20%, 쿨다운 -1, 치명 +8%', fx: { powerPct: 20, cdAdd: -1, critBonus: 8 } },
  rDawn:   { id: 'rDawn',   name: '여명의 룬', rarity: 4, desc: '사용 시 HP 15 회복 + 보호막 +15', fx: { heal: 15, barrierGain: 15 } },
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

// 소켓 각인 (순수 함수) — 성공 시 주머니에서 제거 + 장비에 영구 각인
export function socketBuriedRune(char, runeIdx, slot) {
  const runeId = (char.runes || [])[runeIdx];
  const rune = getBuriedRune(runeId);
  const item = char.equipped?.[slot];
  if (!rune || !item) return { char, text: '각인할 수 없다.' };
  if (item.rune) return { char, text: '이미 룬이 각인된 장비다 — 소켓은 장비당 1칸.' };
  const runes = (char.runes || []).filter((_, i) => i !== runeIdx);
  const next = { ...char, runes, equipped: { ...char.equipped, [slot]: { ...item, rune: runeId } } };
  return { char: next, text: `${item.name}에 「${rune.name}」 각인 — ${rune.desc}` };
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

// 결과 테이블 — { w: 가중치, run(char, ctx) → { char, text, tone } }  tone: 'good'|'bad'|'neutral'
const pendStatus = (char, s, n) => ({ ...char, pendingStatuses: [...(char.pendingStatuses || []), { s, n }] });
const EVENT_OUTCOMES = {
  gravestone: [
    { w: 22, run: (c) => ({ char: { ...c, gold: c.gold + 90 }, text: '관 틈에서 🪙 90을 찾아냈다.', tone: 'good' }) },
    { w: 18, run: (c, ctx) => ({ char: c, text: `비석의 문양을 읽자 잊힌 자의 기억이 먼지가 되어 흩어진다 — 🕯 +${ctx.dustGain = 20}.`, tone: 'good' }) },
    { w: 16, run: (c, ctx) => ({ char: c, text: `먼지가 쏟아진다 — 🕯 무덤 먼지 +${ctx.dustGain = 35}.`, tone: 'good' }) },
    { w: 16, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: Math.min(d.maxHp, c.hp + Math.round(d.maxHp * 0.35)) }, text: '따뜻한 기운이 감돈다 — HP 35% 회복.', tone: 'good' }; } },
    { w: 14, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: Math.max(1, c.hp - Math.round(d.maxHp * 0.25)) }, text: '함정이다! 폭발이 일어났다 — 최대 HP의 25% 피해.', tone: 'bad' }; } },
    { w: 14, run: (c) => ({ char: pendStatus(c, 'poison', 3), text: '독가스가 새어나온다 — 다음 전투를 [중독] 3으로 시작한다.', tone: 'bad' }) },
  ],
  spring: [
    { w: 20, run: (c) => { const k = pick(['str', 'dex', 'int', 'vit']); const nm = BURIED_STATS.find(s => s.id === k)?.name; return { char: { ...c, stats: { ...c.stats, [k]: (c.stats[k] || 0) + 2 } }, text: `힘이 차오른다 — ${nm} +2 (영구).`, tone: 'good' }; } },
    { w: 22, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: d.maxHp }, text: '몸의 상처가 전부 아문다 — HP 완전 회복.', tone: 'good' }; } },
    { w: 16, run: (c) => ({ char: { ...c, potions: (c.potions || 0) + 1 }, text: '샘물을 병에 담았다 — 🧪 물약 +1.', tone: 'good' }) },
    { w: 20, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: Math.max(1, c.hp - Math.round(d.maxHp * 0.25)) }, text: '물이 시커멓게 변한다 — 최대 HP의 25% 피해.', tone: 'bad' }; } },
    { w: 12, run: (c) => ({ char: pendStatus(c, 'curse', 2), text: '샘 바닥의 눈과 마주쳤다 — 다음 전투를 [저주] 2로 시작한다.', tone: 'bad' }) },
    { w: 10, run: (c) => ({ char: c, text: '그냥 물이었다.', tone: 'neutral' }) },
  ],
  statue: [
    { w: 22, run: (c, ctx) => ({ char: c, text: `석상이 고개를 끄덕이며 손에 든 것을 부수어 준다 — 🕯 +${ctx.dustGain = 30}.`, tone: 'good' }) },
    { w: 20, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: Math.min(d.maxHp, c.hp + Math.round(d.maxHp * 0.5)) }, text: '석상의 손이 빛난다 — HP 50% 회복.', tone: 'good' }; } },
    { w: 16, run: (c) => ({ char: { ...c, gold: c.gold + 140 }, text: '석상 밑에서 헌금함을 찾았다 — 🪙 140.', tone: 'good' }) },
    { w: 22, run: (c) => ({ char: { ...c, exp: Math.max(0, (c.exp || 0) - 30) }, text: '기억이 흐려진다 — 경험치 30을 잃었다.', tone: 'bad' }) },
    { w: 12, run: (c) => ({ char: pendStatus(c, 'confuse', 1), text: '석상의 눈이 빙글 돈다 — 다음 전투를 [혼란] 1로 시작한다.', tone: 'bad' }) },
  ],
  coffin: [
    { w: 34, run: (c, ctx) => { ctx.item = rollBuriedItem({ slot: null, classId: c.classId, floor: buriedMonsterLevel(c), tier: 'epic', powerMult: buriedLootPower(c) }); return { char: c, text: '영웅의 장비가 잠들어 있었다!', tone: 'good' }; } },
    { w: 16, run: (c, ctx) => { ctx.item = rollBuriedItem({ slot: null, classId: c.classId, floor: buriedMonsterLevel(c), tier: 'relic', powerMult: buriedLootPower(c) }); return { char: c, text: '유물급 장비가 잠들어 있었다!', tone: 'good' }; } },
    { w: 26, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: Math.max(1, c.hp - Math.round(d.maxHp * 0.3)) }, text: '관 속의 것이 손을 뻗는다 — 최대 HP의 30% 피해.', tone: 'bad' }; } },
    { w: 14, run: (c) => ({ char: pendStatus(c, 'silence', 2), text: '봉인 문자가 목에 감긴다 — 다음 전투를 [침묵] 2로 시작한다.', tone: 'bad' }) },
    { w: 10, run: (c) => ({ char: { ...c, gold: c.gold + 60 }, text: '부장품 몇 닢뿐이었다 — 🪙 60.', tone: 'neutral' }) },
  ],
};

// 이벤트 실행 — 반환 { char, text, tone, item(관 전용), dustGain }
export function resolveBuriedEvent(roomId, char) {
  const table = EVENT_OUTCOMES[roomId];
  if (!table) return { char, text: '아무 일도 일어나지 않았다.', tone: 'neutral' };
  const ctx = { dustGain: 0, item: null };
  const picked = weightedPick(table, (o) => o.w);
  const r = picked.run(char, ctx);
  return { char: r.char, text: r.text, tone: r.tone, item: ctx.item, dustGain: ctx.dustGain };
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
    stats: { str: 12, dex: 8, int: 6, vit: 10 },
    traits: ['cursedblood', 'sanguine', 'toughness'],
    unlock: { enemyKey: 'graveWraith', kills: 8, label: '묘지 망령 8회 처치' },
  },
  {
    id: 'fairy', name: '페어리', sub: 'Twilight Fae', color: '#8fb8d8',
    image: './classes/elf.jpg', encounter: true,
    desc: '황혼의 요정. 몸은 유리처럼 여리지만, 날개가 칼날을 흘려낸다.',
    lines: { weapon: 'staff', offhand: 'relic' },
    stats: { str: 4, dex: 10, int: 13, vit: 5 },
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
export const BURIED_CONTRACT_COST = 60;      // 랜덤 1개 구입 (미보유 풀에서)
export const BURIED_CONTRACT_CARRY = 2;      // 출정 시 지참 한도
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
];
export const getBuriedContract = (id) => BURIED_CONTRACTS.find(c => c.id === id) || null;
export function rollBuriedContract(ownedIds) {
  const pool = BURIED_CONTRACTS.filter(c => !ownedIds.includes(c.id));
  return pool.length > 0 ? pick(pool).id : null;
}
// 지참 중인 계약의 fx 합산 — 전투·던전·파생 스탯이 이 뭉치를 나눠 읽는다
export function aggregateBuriedContracts(char) {
  const out = {};
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
