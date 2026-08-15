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

export const BURIED_STAT_POINTS_PER_LEVEL = 3;

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
export const getBuriedClass = (id) => BURIED_ALL_CLASSES.find(c => c.id === id) || null;

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
export const BURIED_STATUS_LIST = Object.values(BURIED_STATUS);

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
  healPrayer:  SK({ id: 'healPrayer',  name: '치유 기도',  slot: 'offhand', line: 'relic', gear: '치유의 성물', sp: 20, cd: 1, heal: 72, desc: 'HP 62 회복.' }),
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
  desc: '무기를 휘두른다. SP +14',
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

// 강화 — 제단에서 +1씩. 단계당 스탯 +12%
export const BURIED_ENHANCE_MAX = 5;
export const buriedEnhanceMult = (plus) => 1 + (plus || 0) * 0.12;
export const buriedEnhanceCost = (plus) => 60 + (plus || 0) * 55;

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
  const depth = Math.max(0, (floor || 1) - 1);
  const rankIdx = BURIED_TIERS.indexOf(tier);
  return Math.max(0.5, tier.weight * (1 + rankIdx * depth * 0.09) - (rankIdx === 0 ? depth * 2.6 : 0));
}

// 장비 1개 생성.
// opts: { slot, classId, floor, tier(강제), luck(등급 가중 보정) }
export function rollBuriedItem({ slot, classId, floor = 1, tier = null, luck = 0 } = {}) {
  const slotId = slot || pick(BURIED_SLOT_IDS);
  const pool = slotPool(slotId);
  const candidates = BURIED_SKILL_LIST.filter(s => s.slot === pool && canClassUseSkill(classId, s));
  if (candidates.length === 0) return null;
  const skill = pick(candidates);
  const t = tier ? getBuriedTier(tier)
    : weightedPick(BURIED_TIERS, (x) => tierWeightAt(x, (floor || 1) + luck));

  const floorMult = 1 + Math.max(0, (floor || 1) - 1) * 0.14;
  const base = SLOT_BASE[pool] || {};
  const stats = {};
  for (const [k, v] of Object.entries(base)) {
    const val = Math.round(v * t.mult * floorMult * (0.85 + Math.random() * 0.3));
    if (val > 0) stats[k] = val;
  }
  // 무기·장신구는 스킬이 참조하는 능력치 쪽만 남겨 낭비 방지
  if (skill.stat === 'int' && stats.atk) { stats.mag = Math.max(stats.mag || 0, stats.atk); delete stats.atk; }
  if ((skill.stat === 'str' || skill.stat === 'dex') && stats.mag) { stats.atk = Math.max(stats.atk || 0, stats.mag); delete stats.mag; }

  const optPool = [...BURIED_OPTIONS];
  const options = [];
  for (let i = 0; i < t.opts && optPool.length > 0; i++) {
    const o = optPool.splice(Math.floor(Math.random() * optPool.length), 1)[0];
    options.push({ key: o.key, name: o.name, pct: !!o.pct, affix: o.affix, value: rnd(o.min, o.max) });
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

// 분해 가치 (무덤 먼지)
export function buriedDustValue(item) {
  if (!item) return 0;
  return getBuriedTier(item.tier).dust + (item.plus || 0) * 2;
}

// =========================================================
// 7. 캐릭터 — 생성 / 파생 스탯 / 레벨
// =========================================================
export const buriedExpToNext = (lv) => 32 + lv * 20;

export function createBuriedChar(classId, legacy = { items: [], gold: 0 }, dungeonId = 'labyrinth') {
  const cls = getBuriedClass(classId);
  if (!cls) return null;
  const equipped = {};
  for (const s of BURIED_SLOT_IDS) equipped[s] = null;
  // 시작 장비 — 무기 + 방어구는 반드시 지급 (BB: 맨몸 시작 방지)
  const w = rollBuriedItem({ slot: 'weapon', classId, floor: 1, tier: 'worn' });
  const a = rollBuriedItem({ slot: 'armor', classId, floor: 1, tier: 'worn' });
  if (w) equipped.weapon = w;
  if (a) equipped.armor = a;

  // 유산 계승 — 슬롯이 비어 있으면 자동 장착, 아니면 가방으로
  const inventory = [];
  for (const it of (legacy.items || [])) {
    if (it && !equipped[it.slot]) equipped[it.slot] = it;
    else if (it) inventory.push(it);
  }

  const char = {
    classId, lv: 1, exp: 0, statPoints: 0,
    stats: { ...cls.stats },
    gold: 80 + (legacy.gold || 0),
    dust: 0,
    equipped, inventory,
    // 1.104.0 — 던전 선택 / 걸음수 기반 마물 레벨 / 스킬 레벨 / 방·층 효과
    dungeonId,
    floor: 1, steps: 0, room: null, roomEffect: null, floorEffect: null, offers: null, roomDone: false,
    skillLevels: {},
    potions: 2,
    kills: 0, startedAt: Date.now(),
    legacyTaken: (legacy.items || []).length,
  };
  // 시작 장비·유산 장비의 스킬은 Lv.1로 등록
  for (const s of BURIED_SLOT_IDS) {
    const it = equipped[s];
    if (it?.skillId) char.skillLevels[it.skillId] = char.skillLevels[it.skillId] || 1;
  }
  char.hp = buriedDerived(char).maxHp;
  return char;
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
  return {
    stats: st,
    traitFx: tf,
    maxHp:   Math.round((140 + st.vit * 11 + (lv - 1) * 18 + (gear.hp || 0) + (tf.hp || 0)) * (1 - Math.min(50, char.curseHpLossPct || 0) / 100)),
    maxSp:   Math.round(38 + st.int * 1.3 + (gear.sp || 0) + (tf.sp || 0)),
    atk:     Math.round((10 + st.str * 1.6 + (gear.atk || 0)) * (1 + (tf.physPct || 0) / 100)),
    fin:     Math.round((10 + st.dex * 1.6 + (gear.atk || 0)) * (1 + (tf.physPct || 0) / 100)),
    mag:     Math.round((10 + st.int * 1.6 + (gear.mag || 0)) * (1 + (tf.magPct || 0) / 100)),
    def:     Math.round(4 + st.vit * 0.9 + (gear.def || 0)),
    crit:    Math.round(5 + st.dex * 0.6 + (gear.crit || 0) + (tf.crit || 0)),
    critDmg: 60 + (gear.critDmg || 0),
    dodge:   Math.min(45, Math.round(3 + st.dex * 0.4 + (gear.dodge || 0) + (tf.dodge || 0))),
    spRegen: Math.round(9 + st.int / 8 + (gear.spRegen || 0)),
    barrier: Math.round((gear.barrier || 0) + (tf.barrier || 0)),
    chase:   Math.round((gear.chase || 0) + (tf.chase || 0)),
    healPct: tf.healPct || 0,
    drainPct: tf.drainPct || 0,
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

// 경험치 적용 — 레벨업 시 스탯 포인트 지급 + HP 완전 회복 (원작 규칙)
export function grantBuriedExp(char, amount) {
  let c = { ...char, exp: (char.exp || 0) + amount };
  const gained = [];
  while (c.exp >= buriedExpToNext(c.lv)) {
    c.exp -= buriedExpToNext(c.lv);
    c.lv += 1;
    c.statPoints = (c.statPoints || 0) + BURIED_STAT_POINTS_PER_LEVEL;
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
};
export const BURIED_ENEMY_LIST = Object.values(BURIED_ENEMIES);

// 층 배율 — 같은 적도 깊을수록 강해진다
export function buriedEnemyAt(key, floor) {
  const base = BURIED_ENEMIES[key];
  if (!base) return null;
  const depth = Math.max(0, (floor || 1) - (base.minFloor || 1));
  const m = 1 + depth * 0.16;
  return {
    ...base,
    hp: Math.round(base.hp * m),
    atk: Math.round(base.atk * m),
    def: Math.round(base.def * (1 + depth * 0.1)),
    exp: Math.round(base.exp * (1 + depth * 0.12)),
    floor: floor || 1,
  };
}

export function rollBuriedEnemy(floor, tier = 'normal') {
  const pool = BURIED_ENEMY_LIST.filter(e =>
    e.tier === tier && floor >= e.minFloor && floor <= e.maxFloor);
  const fallback = BURIED_ENEMY_LIST.filter(e => e.tier === tier);
  const chosen = pick(pool.length > 0 ? pool : fallback);
  return buriedEnemyAt(chosen.key, floor);
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

// 1.104.0 이전의 단일 던전 상수 — 이제 '잊혀진 미궁'의 별칭 (하위 호환용, 신규 코드는 BURIED_DUNGEONS 사용)
export const BURIED_DUNGEON = {
  id: 'labyrinth', name: '잊혀진 미궁', sub: 'The Forgotten Labyrinth',
  floors: 10,
  bossFloors: { 5: 'sealWitch', 10: 'tombTyrant' },
  desc: '열 개의 층. 바닥에는 먼저 내려간 자들의 유산이 쌓여 있다.',
};

// 이번 층에서 고를 방 2~3개. 각 방에는 던전 난이도에 따라 **방 효과**가 붙는다.
export function rollBuriedOffers(floor, dungeonId = 'labyrinth') {
  const dg = getBuriedDungeon(dungeonId);
  const bossKey = dg.bossFloors[floor];
  if (bossKey) return [{ type: 'boss', enemyKey: bossKey, effect: rollBuriedRoomEffect(dg.roomEffectChance) }];
  const count = Math.random() < 0.45 ? 2 : 3;
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
  // 방 효과는 전투 계열에만 (비전투 방은 효과 없이 깔끔하게)
  return offers.map(o => (o.type === 'battle' || o.type === 'elite')
    ? { ...o, effect: rollBuriedRoomEffect(dg.roomEffectChance) }
    : o);
}

// 상점 진열 (장비 3종)
export function rollBuriedShop(floor, classId) {
  const slots = [...BURIED_SLOT_IDS].sort(() => Math.random() - 0.5).slice(0, 3);
  return slots.map(slot => {
    const item = rollBuriedItem({ slot, classId, floor, luck: 2 });
    if (!item) return null;
    const t = getBuriedTier(item.tier);
    return { item, price: Math.round((45 + floor * 22) * t.mult) };
  }).filter(Boolean);
}

export const BURIED_POTION_HEAL_PCT = 45;
export const BURIED_POTION_PRICE = 55;

// =========================================================
// 10. 전투 계산 — 순수 함수 (BuriedBattleScreen이 호출만 한다)
// =========================================================
export const BURIED_TUNING = {
  enemyDmgMult: 1.0,   // 적 화력 체감 조정은 여기 한 곳
  playerDmgMult: 1.0,
  spPerTurn: 0,        // 파생 spRegen에 더해지는 고정값 (SP 압박 조정은 buriedDerived의 spRegen과 함께)
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

  const statKey = skill.stat || 'str';
  const baseAtk = statKey === 'int' ? (att.mag || 0) : statKey === 'dex' ? (att.fin || 0) : (att.atk || 0);
  const hitCount = Math.max(1, skill.hits || 1);
  const critRate = (att.crit || 0) + (skill.critBonus || 0) + (att.envCritAdd || 0);
  let offense = buriedOffenseMult(att) * (1 + (att.envDmgPct || 0) / 100);
  if (statKey === 'int') offense *= 1 + (att.envMagPct || 0) / 100;
  const taken = buriedTakenMult(def) * (1 + (def.envTakenPct || 0) / 100);
  const effDef = skill.pierce ? 0 : buriedEffDef(def);
  const defMult = 100 / (100 + effDef);

  let power = skill.power || 0;
  if (skill.executeBelow && def.maxHp > 0 && (def.hp / def.maxHp) * 100 <= skill.executeBelow) power *= 2;
  if (skill.berserk && att.maxHp > 0) power *= 1 + (1 - att.hp / att.maxHp);
  // 특성 — 혈투 / 혈군 (HP가 낮을수록 강해진다)
  const lowHp = att.maxHp > 0 && att.hp / att.maxHp <= 0.5;
  if (lowHp && traits.includes('bloodlord')) power *= 1.45;
  else if (lowHp && traits.includes('bloodrush')) power *= 1.25;

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
export const BURIED_LEGACY_MAX = 6;       // 보관 가능한 유산 장비 수
export const BURIED_LEGACY_GOLD_PCT = 30; // 계승 골드 비율

// 사망한 캐릭터에서 계승 대상 산출. 층이 깊을수록 더 많이 남긴다 (1~3개)
export function buildBuriedLegacy(char) {
  if (!char) return { items: [], gold: 0 };
  const equipped = BURIED_SLOT_IDS.map(s => char.equipped?.[s]).filter(Boolean);
  const count = Math.min(equipped.length, (char.floor || 1) >= 8 ? 3 : (char.floor || 1) >= 4 ? 2 : 1);
  const shuffled = [...equipped].sort(() => Math.random() - 0.5);
  return {
    items: shuffled.slice(0, count),
    gold: Math.floor((char.gold || 0) * BURIED_LEGACY_GOLD_PCT / 100),
  };
}

// 무덤 먼지 — 유산 보관함이 가득 찼을 때의 대체 보상 + 제단 강화 재료
export const BURIED_DUST = { name: '무덤 먼지', icon: '🕯' };

// 다음 층으로. 마지막 층을 넘어서면 던전 클리어.
// 층을 오를 때 **층 효과**를 새로 굴리고(이전 층 효과는 소멸), 방 선택지도 새로 만든다.
export function advanceBuriedFloor(char) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const next = (char.floor || 1) + 1;
  if (next > dg.floors) return { char: { ...char, room: null, roomData: null, roomEffect: null }, cleared: true };
  return {
    char: {
      ...char,
      floor: next,
      offers: rollBuriedOffers(next, char.dungeonId),
      floorEffect: rollBuriedFloorEffect(dg.floorEffectChance),
      room: null, roomData: null, roomEffect: null,
    },
    cleared: false,
  };
}

// 방을 하나 지날 때마다 걸음수 +1 (원작: 마물 레벨은 층이 아니라 걸음수로 오른다)
export function stepBuriedChar(char, extraSteps = 0) {
  return { ...char, steps: (char.steps || 0) + 1 + extraSteps };
}

// 방 하나에서 만날 적 (전투/강적/보스 공용). 스펙은 **걸음수 기반 마물 레벨**로 정해진다.
export function buildBuriedRoomEnemy(char, roomType, roomEffectId = null) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const floor = char?.floor || 1;
  const envBump = getBuriedRoomEffect(roomEffectId)?.fx?.monsterLevel || 0;
  const monLevel = buriedMonsterLevel(char) + envBump;
  let key;
  if (roomType === 'boss') {
    key = dg.bossFloors[floor];
  }
  if (!key) {
    const tier = roomType === 'elite' ? 'elite' : 'normal';
    const band = Math.min(10, Math.max(1, Math.round(monLevel * 0.8)));
    const pool = BURIED_ENEMY_LIST.filter(e => e.tier === tier && band >= e.minFloor && band <= e.maxFloor);
    const fallback = BURIED_ENEMY_LIST.filter(e => e.tier === tier);
    key = pick(pool.length > 0 ? pool : fallback).key;
  }
  const enemy = buriedEnemyAtLevel(key, monLevel);
  return { ...enemy, roomType, isBoss: roomType === 'boss' };
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
  hunter:       { id: 'hunter',       name: '추격자',   fx: { chase: 9 },    desc: '추격 피해 +9.' },
};
export const getBuriedTrait = (id) => BURIED_TRAITS[id] || null;

// 캐릭터의 특성 목록 (전직했다면 상위 직업 기준)
export function buriedTraitIds(char) {
  const cls = getBuriedClass(char?.classId);
  return cls?.traits || [];
}
// 스탯형 특성 합산 — buriedDerived가 호출
export function aggregateBuriedTraits(char) {
  const out = {};
  for (const id of buriedTraitIds(char)) {
    const t = BURIED_TRAITS[id];
    if (!t?.fx) continue;
    for (const [k, v] of Object.entries(t.fx)) out[k] = (out[k] || 0) + v;
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
export const BURIED_ALL_CLASSES = [...BURIED_CLASSES, ...BURIED_ADVANCED_CLASSES];

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
  },
  {
    id: 'ruins', name: '침몰한 폐허', sub: 'The Sunken Ruins', color: '#7a9a5e',
    floors: 12, stepsPerLevel: 4, baseLevel: 2, roomEffectChance: 55, floorEffectChance: 26,
    dropLuck: 2, goldMult: 1.4, expMult: 1.25,
    bossFloors: { 6: 'boneGiant', 12: 'tombTyrant' },
    unlock: 'labyrinth',
    desc: '물에 잠긴 층계. 걸음이 빨라질수록 마물도 빨리 자란다.',
  },
  {
    id: 'chasm', name: '나락의 계단', sub: 'The Chasm Stair', color: '#c4453d',
    floors: 14, stepsPerLevel: 3, baseLevel: 4, roomEffectChance: 65, floorEffectChance: 34,
    dropLuck: 3, goldMult: 1.9, expMult: 1.5,
    bossFloors: { 7: 'twilightHusk', 14: 'tombTyrant' },
    unlock: 'ruins',
    desc: '내려갈수록 좁아지는 계단. 한 걸음마다 무언가가 자란다.',
  },
  {
    id: 'abyss', name: '심연', sub: 'The Abyss', color: '#5c4a8c',
    floors: 20, stepsPerLevel: 2, baseLevel: 6, roomEffectChance: 75, floorEffectChance: 42,
    dropLuck: 5, goldMult: 2.6, expMult: 1.8,
    bossFloors: { 5: 'boneGiant', 10: 'sealWitch', 15: 'twilightHusk', 20: 'tombTyrant' },
    unlock: 'chasm',
    desc: '끝이 있는지 아무도 모른다. 여기서 죽은 자의 장비만이 위로 올라간다.',
  },
];
export const getBuriedDungeon = (id) => BURIED_DUNGEONS.find(d => d.id === id) || BURIED_DUNGEONS[0];

// 걸음수 → 마물 레벨 (원작 규칙)
export function buriedMonsterLevel(char) {
  const dg = getBuriedDungeon(char?.dungeonId);
  const steps = char?.steps || 0;
  return 1 + dg.baseLevel + Math.floor(steps / dg.stepsPerLevel);
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
  };
}

// 장비를 캐릭터에게 넣는 단일 창구 (드랍·부장품·상점 공용).
// 원작 규칙: **같은 스킬을 다시 얻으면 그 스킬의 레벨이 오른다.** 처음 보는 스킬이면 Lv.1로 등록.
// 빈 슬롯이면 즉시 장착하고, 아니면 가방으로 보낸다.
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
  else c = { ...c, inventory: [...c.inventory, item] };
  return { char: c, raised, lv, equippedDirect: !char.equipped?.[item.slot] };
}

// 협상 방 — 지불액과 보상. 마물 레벨이 높을수록 비싸고 크다.
export function buildBuriedNegotiation(char) {
  const lv = buriedMonsterLevel(char);
  const price = Math.round(45 + lv * 22);
  return {
    price,
    // 지불하면 전투 없이 통과 + 장비 1개. 거절하면 강적과 싸운다.
    reward: rollBuriedItem({ slot: null, classId: char.classId, floor: lv, luck: 4 }),
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
// 제작 장비 레벨 — 역대 최고 도달 층 기반 (최소 3)
export const buriedForgeLevel = (deepest) => Math.max(3, deepest || 0);

export function craftBuriedItem({ slot, classId, deepest, epic = false }) {
  const floor = buriedForgeLevel(deepest);
  if (!epic) return rollBuriedItem({ slot, classId, floor, luck: 3 });
  const tier = Math.random() < 0.75 ? 'epic' : 'relic';
  return rollBuriedItem({ slot, classId, floor, tier });
}

export const BURIED_LEGACY_CAP_MAX = 12;
// 확장 비용 — 7칸째 60, 8칸째 90, … (칸당 +30)
export const buriedLegacyExpandCost = (currentSlots) => 60 + (currentSlots - BURIED_LEGACY_MAX) * 30;

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

// 유니크 장비 생성 — 스탯은 전설 등급 배율, 이름·스킬·효과 고정
export function rollBuriedUniqueItem({ classId, floor = 1, excludeIds = [] } = {}) {
  const pool = BURIED_UNIQUES.filter(u => !excludeIds.includes(u.id));
  if (pool.length === 0) return null;
  const def = pick(pool);
  const slotId = def.slot === 'acc' ? (Math.random() < 0.5 ? 'acc1' : 'acc2') : def.slot;
  const base = rollBuriedItem({ slot: slotId, classId, floor, tier: 'legend' });
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
export function rollBuriedUniqueDrop({ dungeonId, isFinalBoss, classId, floor, ownedIds = [] }) {
  const base = BURIED_UNIQUE_DROP[dungeonId] || 8;
  const chance = base * (isFinalBoss ? 2 : 1);
  if (Math.random() * 100 >= chance) return null;
  return rollBuriedUniqueItem({ classId, floor, excludeIds: ownedIds });
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
export function buriedModdedSkill(skill, modId) {
  const mod = getBuriedMod(modId);
  if (!skill || !mod) return skill;
  const fx = mod.fx;
  const out = { ...skill, modId };
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
  if (fx.wallChance) out.wallChance = fx.wallChance;   // 전투 화면이 판정
  if (fx.cdrOnHit) out.cdrOnHit = fx.cdrOnHit;         // 전투 화면이 판정
  return out;
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
    { w: 18, run: (c) => ({ char: { ...c, statPoints: (c.statPoints || 0) + 1 }, text: '비석의 문양을 읽자 무언가 깨달았다 — 능력치 포인트 +1.', tone: 'good' }) },
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
    { w: 22, run: (c) => ({ char: { ...c, statPoints: (c.statPoints || 0) + 2 }, text: '석상이 고개를 끄덕인다 — 능력치 포인트 +2.', tone: 'good' }) },
    { w: 20, run: (c) => { const d = buriedDerived(c); return { char: { ...c, hp: Math.min(d.maxHp, c.hp + Math.round(d.maxHp * 0.5)) }, text: '석상의 손이 빛난다 — HP 50% 회복.', tone: 'good' }; } },
    { w: 16, run: (c) => ({ char: { ...c, gold: c.gold + 140 }, text: '석상 밑에서 헌금함을 찾았다 — 🪙 140.', tone: 'good' }) },
    { w: 22, run: (c) => ({ char: { ...c, exp: Math.max(0, (c.exp || 0) - 30) }, text: '기억이 흐려진다 — 경험치 30을 잃었다.', tone: 'bad' }) },
    { w: 12, run: (c) => ({ char: pendStatus(c, 'confuse', 1), text: '석상의 눈이 빙글 돈다 — 다음 전투를 [혼란] 1로 시작한다.', tone: 'bad' }) },
  ],
  coffin: [
    { w: 34, run: (c, ctx) => { ctx.item = rollBuriedItem({ slot: null, classId: c.classId, floor: buriedMonsterLevel(c), tier: 'epic' }); return { char: c, text: '영웅의 장비가 잠들어 있었다!', tone: 'good' }; } },
    { w: 16, run: (c, ctx) => { ctx.item = rollBuriedItem({ slot: null, classId: c.classId, floor: buriedMonsterLevel(c), tier: 'relic' }); return { char: c, text: '유물급 장비가 잠들어 있었다!', tone: 'good' }; } },
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
  const reward = BURIED_CURSE_REWARD[c.sev];
  return {
    char: { ...char, curses: [...buriedCurseIds(char), curseId], gold: char.gold + reward.gold },
    reward,
  };
}
export const BURIED_SKULL_ROOM = {
  id: 'skullcrown', name: '해골 왕관', icon: '💀', color: '#c9a86a', weight: 6,
  desc: '허공에 뜬 왕관이 거래를 제안한다 — 저주를 받아들이면 보상을 주겠다고.',
};
