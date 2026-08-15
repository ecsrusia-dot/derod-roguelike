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
// lines: 착용 가능한 무기/보조 계열 (원작의 직업별 장비 제한)
// trait: 직업 고유 패시브 (원작의 Job Trait 대응). 판정은 BuriedBattleScreen.
export const BURIED_CLASSES = [
  {
    id: 'wanderer', name: '방랑검사', sub: 'Gravewalker Blade', color: '#c4453d',
    image: './classes/wanderer.jpg',
    desc: '어둠 속에서도 검을 뻗는 자. 반격으로 되갚는다.',
    lines: { weapon: 'sword', offhand: 'blade' },
    stats: { str: 12, dex: 9, int: 5, vit: 9 },
    trait: { id: 'riposte', name: '반격', desc: '회피에 성공하면 즉시 기본 공격의 60% 위력으로 반격한다.' },
  },
  {
    id: 'sage', name: '술법사', sub: 'Sorcerer of Ash', color: '#5c4a8c',
    image: './classes/sage.jpg',
    desc: '정념을 태우는 자. 불길은 꺼지지 않는다.',
    lines: { weapon: 'staff', offhand: 'tome' },
    stats: { str: 4, dex: 7, int: 14, vit: 6 },
    trait: { id: 'kindle', name: '발화', desc: '마법 스킬이 적중하면 30% 확률로 [화상] 1스택을 추가로 부여한다.' },
  },
  {
    id: 'demonblood', name: '혼혈 마족', sub: 'Demon Heritage', color: '#8b1f1f',
    image: './classes/demonblood.jpg',
    desc: '마왕의 피가 흐르는 자. 상처가 곧 힘이 된다.',
    lines: { weapon: 'axe', offhand: 'claw' },
    stats: { str: 13, dex: 6, int: 5, vit: 11 },
    trait: { id: 'bloodrush', name: '혈투', desc: 'HP가 50% 이하일 때 주는 데미지 +25%.' },
  },
  {
    id: 'elf', name: '숲의 정령사', sub: 'Elf of Twilight', color: '#7a9a5e',
    image: './classes/elf.jpg',
    desc: '바람과 교감하는 자. 화살은 빗나가지 않는다.',
    lines: { weapon: 'bow', offhand: 'quiver' },
    stats: { str: 5, dex: 14, int: 8, vit: 7 },
    trait: { id: 'gale', name: '질풍', desc: '치명타가 터질 때마다 SP +12를 회복한다.' },
  },
  {
    id: 'priest', name: '여명의 사제', sub: 'Priest of Dawn', color: '#d4a574',
    image: './classes/priest.jpg',
    desc: '여명의 가호를 받은 자. 죽음을 거부한다.',
    lines: { weapon: 'mace', offhand: 'relic' },
    stats: { str: 5, dex: 6, int: 14, vit: 10 },
    trait: { id: 'dawnlight', name: '여명', desc: '모든 회복량 +30%.' },
  },
];
export const getBuriedClass = (id) => BURIED_CLASSES.find(c => c.id === id) || null;

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
  guard:   { id: 'guard',   name: '방벽', icon: '🔷', color: '#7ba3c4', kind: 'buff',   max: 8,  decay: 'one',  desc: '받는 피해 스택당 -12% (최대 -80%)' },
  regen:   { id: 'regen',   name: '재생', icon: '💚', color: '#7a9a5e', kind: 'buff',   max: 10, tickHeal: 5, decay: 'one', desc: '턴 종료 시 스택×5 회복. 매 턴 1 감소' },
  evade:   { id: 'evade',   name: '잔영', icon: '💨', color: '#d4a574', kind: 'buff',   max: 6,  decay: 'one',  desc: '회피율 스택당 +15%' },
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
  riposteEdge: SK({ id: 'riposteEdge', name: '역린',       slot: 'offhand', line: 'blade', gear: '수비 단검', sp: 14, cd: 0, stat: 'str', power: 68, self: [{ s: 'guard', n: 2 }], desc: '베며 자세를 굳힌다. [방벽] 2' }),
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
  arcaneWard:  SK({ id: 'arcaneWard',  name: '마법 방벽',  slot: 'offhand', line: 'tome', gear: '수호 마도서', sp: 16, cd: 2, self: [{ s: 'guard', n: 3 }], desc: '[방벽] 3' }),

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
  benediction: SK({ id: 'benediction', name: '가호',       slot: 'offhand', line: 'relic', gear: '가호의 성물', sp: 16, cd: 2, self: [{ s: 'guard', n: 3 }, { s: 'regen', n: 2 }], desc: '[방벽] 3 + [재생] 2' }),
  blessing:    SK({ id: 'blessing',    name: '축복',       slot: 'offhand', line: 'relic', gear: '축복의 성물', sp: 14, cd: 2, self: [{ s: 'rage', n: 2 }], heal: 15, desc: '[격노] 2, HP 15 회복.' }),

  // ===== 방어구 (전 직업 공용) =====
  ironWall:    SK({ id: 'ironWall',    name: '철벽',       slot: 'armor', line: null, gear: '판금 갑옷',   sp: 14, cd: 1, self: [{ s: 'guard', n: 3 }], desc: '[방벽] 3' }),
  thornMail:   SK({ id: 'thornMail',   name: '가시 갑주',  slot: 'armor', line: null, gear: '가시 갑주',   sp: 12, cd: 1, self: [{ s: 'guard', n: 2 }], reflect: 35, desc: '[방벽] 2. 2턴간 받은 피해의 35% 반사' }),
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
];
export const getBuriedTier = (id) => BURIED_TIERS.find(t => t.id === id) || BURIED_TIERS[0];

// 슬롯별 기본 스탯 (1층 기준). 층·등급 배율이 곱해진다.
const SLOT_BASE = {
  weapon:  { atk: 14, mag: 14 },
  offhand: { atk: 7,  mag: 7, def: 3 },
  armor:   { def: 9,  hp: 26 },
  helm:    { def: 5,  hp: 12, sp: 8 },
  acc:     { atk: 4,  mag: 4, hp: 10, sp: 5 },
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

export function createBuriedChar(classId, legacy = { items: [], gold: 0 }) {
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
    floor: 1, room: null, offers: null, roomDone: false,
    potions: 2,
    kills: 0, startedAt: Date.now(),
    legacyTaken: (legacy.items || []).length,
  };
  char.hp = buriedDerived(char).maxHp;
  return char;
}

// 파생 스탯 — 장비·레벨·스탯 전부 합산
export function buriedDerived(char) {
  if (!char) return { maxHp: 1, maxSp: 1, atk: 1, mag: 1, fin: 1, def: 0, crit: 0, critDmg: 60, dodge: 0, spRegen: 12, stats: { str: 0, dex: 0, int: 0, vit: 0 } };
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
  return {
    stats: st,
    maxHp:   Math.round(140 + st.vit * 11 + (lv - 1) * 18 + (gear.hp || 0)),
    maxSp:   Math.round(38 + st.int * 1.3 + (gear.sp || 0)),
    atk:     Math.round(10 + st.str * 1.6 + (gear.atk || 0)),
    fin:     Math.round(10 + st.dex * 1.6 + (gear.atk || 0)),
    mag:     Math.round(10 + st.int * 1.6 + (gear.mag || 0)),
    def:     Math.round(4 + st.vit * 0.9 + (gear.def || 0)),
    crit:    Math.round(5 + st.dex * 0.6 + (gear.crit || 0)),
    critDmg: 60 + (gear.critDmg || 0),
    dodge:   Math.min(45, Math.round(3 + st.dex * 0.4 + (gear.dodge || 0))),
    spRegen: Math.round(9 + st.int / 8 + (gear.spRegen || 0)),
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
    hp: 430, atk: 33, def: 12, exp: 320, gold: [220, 320],
    actions: [
      { name: '빙결의 창', power: 118, kind: 'attack', apply: [{ s: 'bind', n: 2, p: 100 }], weight: 3 },
      { name: '봉인 각인', power: 62, kind: 'attack', apply: [{ s: 'silence', n: 2, p: 100 }, { s: 'weaken', n: 3, p: 100 }], weight: 2 },
      { name: '서리 폭풍', power: 92, kind: 'attack', hits: 3, heavy: true, weight: 2 },
      { name: '얼음 결계', kind: 'defend', self: [{ s: 'guard', n: 5 }, { s: 'regen', n: 4 }], weight: 1 },
    ],
  },
  tombTyrant: {
    key: 'tombTyrant', name: '무덤의 폭군', img: { key: 'forestTyrant', chapter: 2 }, color: '#8b1f1f',
    desc: '이 무덤에 묻힌 모든 것의 주인. 유산은 그의 손에 있다.',
    tier: 'boss', minFloor: 10, maxFloor: 10,
    hp: 820, atk: 50, def: 16, exp: 900, gold: [520, 780],
    actions: [
      { name: '폭군의 낫', power: 128, kind: 'attack', apply: [{ s: 'bleed', n: 4, p: 100 }], weight: 3 },
      { name: '무덤의 손아귀', power: 96, kind: 'attack', drain: 60, apply: [{ s: 'curse', n: 3, p: 100 }], weight: 2 },
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
  boss:     { id: 'boss',     name: '봉인의 문',  icon: '👑', color: '#e8b04a', desc: '보스가 기다린다.', weight: 0 },
};

export const BURIED_DUNGEON = {
  id: 'tomb', name: '잊혀진 무덤', sub: 'The Forgotten Tomb',
  floors: 10,
  bossFloors: { 5: 'sealWitch', 10: 'tombTyrant' },
  desc: '열 개의 층. 바닥에는 먼저 내려간 자들의 유산이 쌓여 있다.',
};

// 이번 층에서 고를 방 2~3개
export function rollBuriedOffers(floor) {
  const bossKey = BURIED_DUNGEON.bossFloors[floor];
  if (bossKey) return [{ type: 'boss', enemyKey: bossKey }];
  const count = Math.random() < 0.45 ? 2 : 3;
  const pool = Object.values(BURIED_ROOMS).filter(r => r.weight > 0);
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
  return offers;
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

// 주는 데미지 배율 (격노 ↑ / 약화 ↓)
export function buriedOffenseMult(u) {
  return Math.max(0.2, 1 + stacksOf(u, 'rage') * 0.10 - stacksOf(u, 'weaken') * 0.06);
}
// 받는 데미지 배율 (속박·저주 ↑ / 방벽 ↓)
export function buriedTakenMult(u) {
  return Math.max(0.2, 1 + stacksOf(u, 'bind') * 0.20 + stacksOf(u, 'curse') * 0.15 - stacksOf(u, 'guard') * 0.12);
}
// 실효 방어력 (파쇄 반영)
export function buriedEffDef(u) {
  const raw = u?.def || 0;
  return Math.max(0, Math.round(raw * Math.max(0.2, 1 - stacksOf(u, 'shatter') * 0.10)));
}
// 실효 회피율 (잔영 ↑, 속박이면 0)
export function buriedEffDodge(u) {
  if (stacksOf(u, 'bind') > 0) return 0;
  return Math.min(70, (u?.dodge || 0) + stacksOf(u, 'evade') * 15);
}
// 회복 가능 여부 (저주 = 회복 무효)
export const buriedCanHeal = (u) => stacksOf(u, 'curse') === 0;

// 스킬 1회 판정. 반환: { dodged, hits:[{dmg,crit}], total }
export function resolveBuriedAttack(att, def, skill, { isPlayer = false, traitId = null } = {}) {
  const dodgeRoll = Math.random() * 100 < buriedEffDodge(def);
  if (dodgeRoll) return { dodged: true, hits: [], total: 0, crits: 0 };

  const statKey = skill.stat || 'str';
  const baseAtk = statKey === 'int' ? (att.mag || 0) : statKey === 'dex' ? (att.fin || 0) : (att.atk || 0);
  const hitCount = Math.max(1, skill.hits || 1);
  const critRate = (att.crit || 0) + (skill.critBonus || 0);
  const offense = buriedOffenseMult(att);
  const taken = buriedTakenMult(def);
  const effDef = skill.pierce ? 0 : buriedEffDef(def);
  const defMult = 100 / (100 + effDef);

  let power = skill.power || 0;
  if (skill.executeBelow && def.maxHp > 0 && (def.hp / def.maxHp) * 100 <= skill.executeBelow) power *= 2;
  if (skill.berserk && att.maxHp > 0) power *= 1 + (1 - att.hp / att.maxHp);
  // 직업 특성 — 혼혈 마족 혈투
  if (traitId === 'bloodrush' && att.maxHp > 0 && att.hp / att.maxHp <= 0.5) power *= 1.25;

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
  return { dodged: false, hits, total: hits.reduce((s, h) => s + h.dmg, 0), crits };
}

// 상태이상 부여 — 확률·최대 스택 반영. 새 statuses 객체 반환
export function applyBuriedStatuses(statuses, list) {
  if (!list || list.length === 0) return statuses;
  const next = { ...statuses };
  for (const a of list) {
    const def = BURIED_STATUS[a.s];
    if (!def) continue;
    if (a.p != null && Math.random() * 100 >= a.p) continue;
    next[a.s] = Math.min(def.max, (next[a.s] || 0) + (a.n || 1));
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

// 다음 층으로. 10층을 넘어서면 던전 클리어.
export function advanceBuriedFloor(char) {
  const next = (char.floor || 1) + 1;
  if (next > BURIED_DUNGEON.floors) return { char: { ...char, room: null, roomData: null }, cleared: true };
  return {
    char: { ...char, floor: next, offers: rollBuriedOffers(next), room: null, roomData: null },
    cleared: false,
  };
}

// 방 하나에서 만날 적 (전투/강적/보스 공용)
export function buildBuriedRoomEnemy(char, roomType) {
  const floor = char?.floor || 1;
  if (roomType === 'boss') {
    const key = BURIED_DUNGEON.bossFloors[floor];
    return key ? buriedEnemyAt(key, floor) : rollBuriedEnemy(floor, 'normal');
  }
  return rollBuriedEnemy(floor, roomType === 'elite' ? 'elite' : 'normal');
}
