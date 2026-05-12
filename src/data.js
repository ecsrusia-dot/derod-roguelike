// ============================================
// derod_data.js — 게임 콘텐츠 데이터
// ============================================
// 이 파일은 모든 게임 콘텐츠 데이터를 담습니다.
// 코드 수정 없이 이 파일만 편집해서 콘텐츠를 추가/수정할 수 있습니다.
//
// 구조:
// - PASSIVE_SKILLS: 패시브 스킬 (effect는 문자열 키, 실제 함수는 메인 코드에 있음)
// - CLASSES: 직업
// - COMBAT_SKILLS: 전투 스킬
// - ENEMIES: 적
// - CHAPTERS: 챕터
// - EVENTS: 텍스트 사건
// - RELICS: 유물 (REWARD_POOL의 relic 부분)
// - REWARD_POOL: 보상 가중치 풀
//
// JSON 호환 형식이라 향후 .json 파일로 그대로 분리 가능.
// ============================================

// =========== 게임 버전 ===========
// MAJOR.MINOR.PATCH 형식
// MAJOR: 큰 시스템 변경 (1 → 2)
// MINOR: 새 기능/원정 추가 (1.0 → 1.1)
// PATCH: 버그 수정/밸런스 조정 (1.0.0 → 1.0.1)
export const GAME_VERSION = '1.1.0';
export const VERSION_DATE = '2026-05-12';
export const VERSION_LABEL = '튜토리얼 1 일직선 + 노드 설명 모달';

// =========== 패시브 스킬 ===========
// effect 필드는 문자열 키. 실제 동작은 메인 코드의 trigger handler에서 처리.
// minorEffect: Lv.1부터 매 Lv마다 누적되는 작은 효과
// tiers: Lv.3, 5, 7에 발현되는 마일스톤 효과
export const PASSIVE_SKILLS = {
  강타: {
    axis: 'attack', maxLv: 7, color: '#c4453d',
    desc: '공격 시 충격 게이지 누적, 100 도달 시 기절',
    minorEffect: { type: 'physDmg+', perLv: 3, desc: '물리 데미지 +3/Lv' },
    tiers: {
      3: { text: '공격 시 충격 게이지 +30 (100 시 기절 1턴)', trigger: 'onAttack', effect: 'applyShockGauge' },
      5: { text: '충격 게이지 누적량 +10, 기절 시 추가 데미지', trigger: 'passive', effect: 'shockBonus' },
      7: { text: '기절한 적에게 +50% 데미지', trigger: 'passive', effect: 'shockExploit' }
    }
  },
  정밀: {
    axis: 'attack', maxLv: 7, color: '#d4a574',
    desc: '치명타·명중 강화',
    minorEffect: { type: 'critRate+', perLv: 3, desc: '치명타율 +3%/Lv' },
    tiers: {
      3: { text: '치명타 시 적 방어 50% 무시', trigger: 'passive', effect: 'critPierce' },
      5: { text: '치명타 데미지 배율 ×1.5 → ×1.8', trigger: 'passive', effect: 'critDmg+30' },
      7: { text: '약점 자동 간파 (방어 무시)', trigger: 'passive', effect: 'pierceArmor' }
    }
  },
  잔혹: {
    axis: 'attack', maxLv: 7, color: '#8b1f1f',
    desc: '출혈·즉사 효과',
    minorEffect: { type: 'bleedDmg+', perLv: 1, desc: '출혈 1스택당 데미지 +1/Lv' },
    tiers: {
      3: { text: '공격 시 출혈 부여 (3턴, 5+α 데미지)', trigger: 'onAttack', effect: 'applyBleed' },
      5: { text: '출혈 중첩 가능 (최대 5스택)', trigger: 'passive', effect: 'bleedStack' },
      7: { text: 'HP 20% 이하 적 즉사 (15%)', trigger: 'onAttack', effect: 'execute' }
    }
  },
  마력: {
    axis: 'attack', maxLv: 7, color: '#5c4a8c',
    desc: '마법 데미지 강화',
    minorEffect: { type: 'magicDmg+', perLv: 5, desc: '마법 데미지 +5%/Lv' },
    tiers: {
      3: { text: '마법 데미지 추가 +30%', trigger: 'passive', effect: 'magicDmg+30' },
      5: { text: '에테르 비용 -1 (최소 0)', trigger: 'passive', effect: 'etherCost-20' },
      7: { text: '마법 공격 시 50% 확률로 재시전', trigger: 'passive', effect: 'magicEcho' }
    }
  },
  회피: {
    axis: 'defense', maxLv: 7, color: '#7a9a5e',
    desc: '회피율 증가',
    minorEffect: { type: 'dodge+', perLv: 4, desc: '회피율 +4%/Lv' },
    tiers: {
      3: { text: '회피 추가 +15%', trigger: 'passive', effect: 'dodge+15' },
      5: { text: '회피 시 70% 확률로 반격', trigger: 'onDodge', effect: 'counterAttack' },
      7: { text: '첫 피격 무효 (전투당 1회)', trigger: 'onCombatStart', effect: 'firstHitImmune' }
    }
  },
  수비: {
    axis: 'defense', maxLv: 7, color: '#7ba3c4',
    desc: '방어 게이지 강화',
    minorEffect: { type: 'startDef+', perLv: 5, desc: '시작 방어 +5/Lv' },
    tiers: {
      3: { text: '시작 방어 추가 +30', trigger: 'onCombatStart', effect: 'startDefense+30' },
      5: { text: '받는 모든 데미지 -20% (마법 포함)', trigger: 'passive', effect: 'dmgTaken-20' },
      7: { text: '방어 50% 이상일 때 받는 데미지 50% 차단', trigger: 'passive', effect: 'fortify' }
    }
  },
  재생: {
    axis: 'defense', maxLv: 7, color: '#9ad4a3',
    desc: '체력 회복',
    minorEffect: { type: 'maxHp+', perLv: 10, desc: '최대 체력 +10/Lv (영구)' },
    tiers: {
      3: { text: '매 턴 종료 시 HP +3', trigger: 'onTurnStart', effect: 'regenPerTurn' },
      5: { text: '전투 시작 시 HP 30% 회복', trigger: 'onCombatStart', effect: 'heal30%' },
      7: { text: 'HP 30% 이하 시 전투당 1회 부활', trigger: 'onLethal', effect: 'revive' }
    }
  },
  가속: {
    axis: 'utility', maxLv: 7, color: '#e8b04a',
    desc: '추가 행동',
    minorEffect: { type: 'cdReduce+', perLv: 1, desc: '쿨다운 -1턴 (Lv.4마다 누적)' },
    tiers: {
      3: { text: '4턴마다 추가 턴 획득', trigger: 'onTurnStart', effect: 'extraTurn', interval: 4 },
      5: { text: '3턴마다 추가 턴', trigger: 'onTurnStart', effect: 'extraTurn', interval: 3 },
      7: { text: '2턴마다 추가 턴', trigger: 'onTurnStart', effect: 'extraTurn', interval: 2 }
    }
  },
  심안: {
  axis: 'utility', maxLv: 7, color: '#7ba3c4',
  desc: '시야와 인지',
  minorEffect: { type: 'dodge+', perLv: 3, desc: '회피율 +3%/Lv' },
  tiers: {
    3: { text: '적의 행동을 어렴풋이 감지한다 (공격/방어 구분)', trigger: 'passive', effect: 'predictIntent' },
    5: { text: '적의 다음 스킬명을 파악한다. 회피율 +10%', trigger: 'passive', effect: 'detailIntent' },
    7: { text: '적의 약점을 파악한다 (수치 확인). 치명타 +10%, 치명타 데미지 +50%', trigger: 'passive', effect: 'weaknessPoint' }
  }
},
  신앙: {
    axis: 'utility', maxLv: 7, color: '#d4a574',
    desc: '신의 가호',
    minorEffect: { type: 'allStats+', perLv: 2, desc: '모든 능력치 +2/Lv' },
    tiers: {
      3: { text: '5턴마다 다음 공격 치명타 확정', trigger: 'onTurnStart', effect: 'guaranteeCrit', interval: 5 },
      5: { text: '치명적 피격 30% 회피', trigger: 'onLethal', effect: 'divineSave' },
      7: { text: '수신사 등극 - 신탁 마법', trigger: 'passive', effect: 'oracleUser' }
    }
  },
  운명: {
    axis: 'utility', maxLv: 7, color: '#5c4a8c',
    desc: '여명/황혼 게이지',
    minorEffect: { type: 'rewardChoice+', perLv: 1, desc: '보상 시 추가 보석 +1/Lv' },
    tiers: {
      3: { text: '보석 리롤 비용 -1', trigger: 'passive', effect: 'rerollDiscount' },
      5: { text: '보상 1회 추가 (3중1 → 4중1)', trigger: 'passive', effect: 'extraReward' },
      7: { text: '운명 카드 1회 재선택', trigger: 'passive', effect: 'fateReroll' }
    }
  },
  
  // === 직업 전용 패시브 ===
  // classOnly: 해당 직업만 시작 시 보유. 보상 풀에서 등장하지 않음.
  심안류: {
    axis: 'utility', maxLv: 7, color: '#c4453d',
    desc: '맹인 검사의 감각 극대화. 공격을 흘리고 반격한다',
    classOnly: 'lanthert',
    minorEffect: { type: 'counterStat+', perLv: 5, desc: '반격율 +5%/Lv, 반격 데미지 +5%/Lv' },
    tiers: {
      3: { text: '반격 확률 +20%', trigger: 'passive', effect: 'counterRate+20' },
      5: { text: '반격 데미지 +20%, 반격 시 받는 데미지 30% 차단', trigger: 'passive', effect: 'counterShield' },
      7: { text: '반격 데미지 +20%, 반격 시 다음 턴 반드시 치명타', trigger: 'passive', effect: 'counterCrit' }
    }
  },
  이프리트: {
    axis: 'utility', maxLv: 7, color: '#ff6b35',
    desc: '불의 정령왕의 힘. 마법으로 화염 각인을 부여하고 치명타로 폭발시킨다',
    classOnly: 'sage',
    minorEffect: { type: 'ifritIgnite', perLv: 0, desc: '마법 공격 시 30% 화염 각인 (3턴, 지능×0.3/턴, 방어무시), 치명타 시 폭발' },
    tiers: {
      3: { text: '지능 +2, 방어 무시 +5', trigger: 'passive', effect: 'ifritT3' },
      5: { text: '지능 +3 (누적 +5), 방어 무시 +10 (누적 +15)', trigger: 'passive', effect: 'ifritT5' },
      7: { text: '지능 +4 (누적 +9), 화염 각인 +1턴 (총 4턴)', trigger: 'passive', effect: 'ifritT7' }
    }
  },
};

// =========== 직업 ===========
// locked: true인 직업은 이전 직업의 수련의 길 클리어로 해금
// 해금 순서: 방랑검사 → 술법사 → 마족 → 엘프 → 사제
export const CLASSES = [
  {
    id: 'lanthert', name: '방랑검사', sub: 'Lanthert Path',
    quote: '다녀오겠습니다...',
    desc: '시력을 잃었던 검사. 어둠 속에서도 검을 뻗는다.',
    startSkills: { 심안류: 3, 심안: 2 },
    stats: { 근력: 18, 민첩: 15, 지능: 14, 매력: 11 },
    combatSkills: ['참격', '관통', '방검'],
    color: '#c4453d',
    locked: false,        // 항상 사용 가능 (시작 직업)
    image: './classes/lanthert.jpg',
    winImage: './classes/lanthertwin.jpg',
    lossImage: './classes/lanthertloss.jpg',
    startImage: './classes/lanthertstart.jpg',
    combatImage: './classes/combat/lanthert_combat.jpg',
  },
  {
    id: 'sage', name: '술법사', sub: 'Sorcerer of Tour',
    quote: '다녀올께~ 보고싶어도 참아?',
    desc: '정념계 마법을 익힌 자. 신과 정령의 힘을 빌린다.',
    startSkills: { 이프리트: 3, 마력: 2 },
    stats: { 근력: 8, 민첩: 11, 지능: 20, 매력: 14 },
    combatSkills: ['마법탄', '정념폭발', '결계'],
    color: '#5c4a8c',
    locked: true,
    unlockId: 'training_lanthert_clear',     // 방랑검사 수련 클리어 시 해금
    image: './classes/sage.jpg',
    winImage: './classes/sagewin.jpg',
    lossImage: './classes/sageloss.jpg',
    startImage: './classes/sagestart.jpg',
    combatImage: './classes/combat/sage_combat.jpg',
  },
  {
    id: 'demonblood', name: '혼혈 마족', sub: 'Demon Heritage',
    quote: '걱정마, 밤이되기전에 돌아올께!',
    desc: '나크젤리온의 피가 흐르는 자. 분노가 곧 힘이 된다.',
    startSkills: { 잔혹: 3, 강타: 1 },
    stats: { 근력: 19, 민첩: 13, 지능: 13, 매력: 9 },
    combatSkills: ['광폭참격', '피의 일격', '광기'],
    color: '#8b1f1f',
    locked: true,
    unlockId: 'training_sage_clear',         // 술법사 수련 클리어 시 해금
    image: './classes/demonblood.jpg',
    winImage: './classes/demonbloodwin.jpg',
    lossImage: './classes/demonbloodloss.jpg',
    startImage: './classes/demonbloodstart.jpg',
    combatImage: './classes/combat/demonblood_combat.jpg',
  },
  {
    id: 'elf', name: '숲의 정령사', sub: 'Elf of Twilight',
    quote: '바람이 부르는 길로... 다녀올게요',
    desc: '엘프 종족. 숲의 정령과 교감하며 활을 다룬다.',
    startSkills: { 회피: 3, 정밀: 2 },
    stats: { 근력: 11, 민첩: 20, 지능: 14, 매력: 15 },
    combatSkills: ['정밀사격', '연속화살', '바람결계'],
    color: '#7a9a5e',
    locked: true,
    unlockId: 'training_demonblood_clear',   // 마족 수련 클리어 시 해금
    image: './classes/elf.jpg',
    winImage: './classes/elfwin.jpg',
    lossImage: './classes/elfloss.jpg',
    startImage: './classes/elfstart.jpg',
    combatImage: './classes/combat/elf_combat.jpg',
  },
  {
    id: 'priest', name: '여명의 사제', sub: 'Priest of Dawn',
    quote: '여명의 가호 아래... 반드시 돌아오겠습니다.',
    desc: '여명의 가호를 받은 자. 회복과 가호로 동료를 살린다.',
    startSkills: { 신앙: 3, 재생: 2 },
    stats: { 근력: 9, 민첩: 11, 지능: 15, 매력: 19 },
    combatSkills: ['신성광선', '축복', '가호'],
    color: '#d4a574',
    locked: true,
    unlockId: 'training_elf_clear',          // 엘프 수련 클리어 시 해금
    image: './classes/priest.jpg',
    winImage: './classes/priestwin.jpg',
    lossImage: './classes/priestloss.jpg',
    startImage: './classes/prieststart.jpg',
    combatImage: './classes/combat/priest_combat.jpg',
  },
];

// =========== 전투 스킬 ===========
// type: physical / magic / defense / buff
// baseDmg: [최소, 최대]
// cost: 에테르 소모량
// cd: 쿨다운 턴 수
// pierce: 방어 무시
// hitCount: 다중 히트 횟수
// berserker: HP 낮을수록 데미지 증가
// selfDmg: 자해 데미지
// forceBleed: 출혈 강제 부여
// dodgeBuff: 회피율 보너스
// buff: 'rage' 등 버프 키
export const COMBAT_SKILLS = {
  // 방랑검사
  참격: { name: '참격', cost: 0, cd: 0, type: 'physical', baseDmg: [20, 26], desc: '기본 검 공격' },
  관통: { name: '관통', cost: 2, cd: 2, type: 'physical', baseDmg: [32, 40], desc: '방어 무시', pierce: true },
  방검: { name: '방검', cost: 1, cd: 2, type: 'defense', defense: 30, desc: '방어 +30' },
  // 술법사
  마법탄: { name: '마법탄', cost: 0, cd: 0, type: 'magic', baseDmg: [18, 24], desc: '기본 마법' },
  정념폭발: { name: '정념폭발', cost: 2, cd: 3, type: 'magic', baseDmg: [42, 52], desc: '강력한 마법' },
  결계: { name: '결계', cost: 1, cd: 1, type: 'defense', defense: 50, desc: '방어 +50' },
  // 혼혈 마족
  광폭참격: { name: '광폭참격', cost: 0, cd: 0, type: 'physical', baseDmg: [22, 30], desc: 'HP 낮을수록 ↑', berserker: true },
  '피의 일격': { name: '피의 일격', cost: 1, cd: 2, type: 'physical', baseDmg: [27, 35], desc: '자해+출혈', selfDmg: 10, forceBleed: true },
  광기: { name: '광기', cost: 2, cd: 3, type: 'buff', buff: 'rage', desc: '3턴 데미지+30% (광기의 분노)' },
  // 정령사
  정밀사격: { name: '정밀사격', cost: 0, cd: 0, type: 'physical', baseDmg: [18, 24], desc: '기본 활 공격' },
  연속화살: { name: '연속화살', cost: 2, cd: 3, type: 'physical', baseDmg: [15, 19], hitCount: 3, desc: '3연발' },
  바람결계: { name: '바람결계', cost: 1, cd: 1, type: 'defense', defense: 30, desc: '방어+회피', dodgeBuff: 30 },
  // 여명의 사제
  신성광선: { name: '신성광선', cost: 0, cd: 0, type: 'magic', baseDmg: [17, 25], desc: '신성 데미지+자가 회복 10', selfHeal: 10 },
  축복: { name: '축복', cost: 1, cd: 3, type: 'buff', buff: 'rage', desc: '3턴 데미지+30% (여명의 축복)' },
  가호: { name: '가호', cost: 2, cd: 2, type: 'defense', defense: 50, desc: '방어 +50, HP 회복 +15', selfHeal: 15 },
};

// =========== 적 ===========
// chapter: 등장 챕터 (1~4)
// tier: 'normal' | 'elite' | 'boss'
// patterns: 적의 행동 패턴 풀 (랜덤 선택)
//   - type: 'attack' | 'defend'
//   - dmg: [최소, 최대]
//   - heavy: 강공격 표시
//   - defense: 방어 자세 시 방어 게이지
// drop: 처치 시 드롭 (gold/gem 모두 [min, max] 범위)
export const ENEMIES = {
  // === 챕터 1: 북부 극지대 ===
  goblin: {
    name: '북부 고블린', hp: 60, color: '#7a9a5e',
    desc: '얼어붙은 동굴의 약탈자',
    tier: 'normal', chapter: 1,
    patterns: [
      { name: '단검 찌르기', dmg: [8, 12], type: 'attack' },
      { name: '독 뿌리기', dmg: [4, 6], type: 'attack' },
      { name: '도망 자세', dmg: [0, 0], type: 'defend', defense: 15 },
    ],
    drop: { gold: [20, 40] },
  },
  iceWolf: {
    name: '얼음 늑대', hp: 90, color: '#7ba3c4',
    desc: '극지의 포식자',
    tier: 'normal', chapter: 1,
    patterns: [
      { name: '물어뜯기', dmg: [12, 18], type: 'attack' },
      { name: '얼음 송곳니', dmg: [16, 22], type: 'attack', heavy: true },
      { name: '경계 자세', dmg: [0, 0], type: 'defend', defense: 20 },
    ],
    drop: { gold: [30, 50] },
  },
  cultist: {
    name: '마족 첩자', hp: 110, color: '#8b1f1f',
    desc: '나크젤리온을 섬기는 광신도',
    tier: 'elite', chapter: 1,
    patterns: [
      { name: '저주받은 칼', dmg: [14, 20], type: 'attack' },
      { name: '피의 의식', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '암흑 결계', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [60, 90], gem: [1, 2] },
  },
  wraith: {
    name: '극지의 망령', hp: 250, color: '#7ba3c4',
    desc: '얼음 속에 잠든 죽은 원정대의 영혼',
    isBoss: true, tier: 'boss', chapter: 1,
    patterns: [
      { name: '얼음 손길', dmg: [18, 24], type: 'attack' },
      { name: '저주의 속삭임', dmg: [12, 16], type: 'attack' },
      { name: '한기의 폭풍', dmg: [25, 35], type: 'attack', heavy: true },
      { name: '망령의 가호', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [150, 200], gem: [3, 5] },
  },
  // === 챕터 2: 죽은 자의 숲 ===
  fallenElf: {
    name: '타락한 엘프', hp: 130, color: '#7a9a5e',
    desc: '망자화된 황혼의 자녀',
    tier: 'normal', chapter: 2,
    patterns: [
      { name: '독화살', dmg: [14, 20], type: 'attack' },
      { name: '연속 사격', dmg: [10, 14], type: 'attack' },
      { name: '숲의 위장', dmg: [0, 0], type: 'defend', defense: 25 },
    ],
    drop: { gold: [50, 80] },
  },
  forestSpirit: {
    name: '오염된 정령', hp: 160, color: '#5c4a8c',
    desc: '대삼림의 분노한 영혼',
    tier: 'elite', chapter: 2,
    patterns: [
      { name: '에테르 폭발', dmg: [18, 24], type: 'attack' },
      { name: '오염의 손길', dmg: [25, 32], type: 'attack', heavy: true },
      { name: '정령의 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [80, 120], gem: [2, 3] },
  },
  twilightChild: {
    name: '타락한 황혼의 자녀', hp: 380, color: '#7a9a5e',
    desc: '엘프 종족의 추락한 영광',
    isBoss: true, tier: 'boss', chapter: 2,
    patterns: [
      { name: '황혼의 화살', dmg: [22, 28], type: 'attack' },
      { name: '독무', dmg: [16, 22], type: 'attack' },
      { name: '대삼림의 분노', dmg: [32, 42], type: 'attack', heavy: true },
      { name: '숲의 가호', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [200, 280], gem: [4, 6] },
  },
  
  // === 챕터 1 (북부) 추가 ===
  frostGiant: {
    name: '동상 거인', hp: 130, color: '#7ba3c4',
    desc: '동토의 거인. 한기를 발산한다',
    tier: 'normal', chapter: 1,
    patterns: [
      { name: '얼어붙은 주먹', dmg: [16, 22], type: 'attack' },
      { name: '한파', dmg: [10, 14], type: 'attack' },
      { name: '냉기 결계', dmg: [0, 0], type: 'defend', defense: 25 },
      { name: '눈사태', dmg: [24, 32], type: 'attack', heavy: true },
    ],
    drop: { gold: [40, 60] },
  },
  iceMage: {
    name: '한기의 마녀', hp: 145, color: '#9ad4d4',
    desc: '얼음을 다루는 흑마법사',
    tier: 'elite', chapter: 1,
    patterns: [
      { name: '얼음 창', dmg: [18, 24], type: 'attack' },
      { name: '눈보라', dmg: [22, 30], type: 'attack', heavy: true },
      { name: '서리 방벽', dmg: [0, 0], type: 'defend', defense: 35 },
      { name: '동결 저주', dmg: [12, 16], type: 'attack' },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  
  // === 챕터 2 (숲) 추가 ===
  shadowWolf: {
    name: '그림자 늑대', hp: 165, color: '#3a2a4a',
    desc: '숲의 어둠을 먹고 자란 사냥꾼',
    tier: 'normal', chapter: 2,
    patterns: [
      { name: '어둠의 물어뜯기', dmg: [18, 24], type: 'attack' },
      { name: '그림자 도약', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '잠복 자세', dmg: [0, 0], type: 'defend', defense: 25 },
    ],
    drop: { gold: [50, 75] },
  },
  corruptSpider: {
    name: '부패한 거미', hp: 175, color: '#5c4a8c',
    desc: '독액이 스며든 거대 거미',
    tier: 'normal', chapter: 2,
    patterns: [
      { name: '독니', dmg: [16, 22], type: 'attack' },
      { name: '거미줄 포박', dmg: [10, 14], type: 'attack' },
      { name: '대량 독무', dmg: [22, 30], type: 'attack', heavy: true },
      { name: '갑각 방어', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [55, 80] },
  },
  forestTyrant: {
    name: '숲의 폭군', hp: 220, color: '#5a7a3a',
    desc: '대삼림을 지배하는 거대 늑대왕',
    tier: 'elite', chapter: 2,
    patterns: [
      { name: '왕의 송곳니', dmg: [22, 30], type: 'attack' },
      { name: '포효', dmg: [12, 18], type: 'attack' },
      { name: '왕의 분노', dmg: [30, 38], type: 'attack', heavy: true },
      { name: '거대한 자세', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [110, 140], gem: [2, 3] },
  },
  
  // === 챕터 3 (봉인된 신전) ===
  timeKeeper: {
    name: '시간의 수호자', hp: 195, color: '#7ba3c4',
    desc: '신전을 지키는 시간 정령',
    tier: 'normal', chapter: 3,
    patterns: [
      { name: '시간 일그러뜨리기', dmg: [20, 26], type: 'attack' },
      { name: '연속 공격', dmg: [14, 18], type: 'attack' },
      { name: '시간 가속', dmg: [26, 34], type: 'attack', heavy: true },
      { name: '정지 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100] },
  },
  brokenGolem: {
    name: '깨진 골렘', hp: 240, color: '#8b8378',
    desc: '신전의 수호 골렘. 부서져도 움직인다',
    tier: 'normal', chapter: 3,
    patterns: [
      { name: '돌 주먹', dmg: [22, 28], type: 'attack' },
      { name: '바닥 쪼개기', dmg: [16, 22], type: 'attack' },
      { name: '거대한 일격', dmg: [32, 42], type: 'attack', heavy: true },
      { name: '암석 자세', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [80, 110] },
  },
  sealMage: {
    name: '봉인 마법사', hp: 200, color: '#5c4a8c',
    desc: '엘디마이어의 봉인을 유지하는 마법사',
    tier: 'normal', chapter: 3,
    patterns: [
      { name: '봉인 광선', dmg: [24, 30], type: 'attack' },
      { name: '마력 폭발', dmg: [18, 24], type: 'attack' },
      { name: '대봉인술', dmg: [30, 40], type: 'attack', heavy: true },
      { name: '마법 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [85, 115] },
  },
  ancientPriest: {
    name: '옛 사제', hp: 280, color: '#d4a574',
    desc: '여명을 모시던 신전의 옛 사제. 광기에 빠졌다',
    tier: 'elite', chapter: 3,
    patterns: [
      { name: '심판의 광선', dmg: [28, 36], type: 'attack' },
      { name: '저주의 기도', dmg: [20, 26], type: 'attack' },
      { name: '신성한 분노', dmg: [38, 48], type: 'attack', heavy: true },
      { name: '신성 결계', dmg: [0, 0], type: 'defend', defense: 45 },
    ],
    drop: { gold: [130, 170], gem: [2, 4] },
  },
  oblivionSealer: {
    name: '망각의 봉인자', hp: 460, color: '#5c4a8c',
    desc: '엘디마이어의 마지막 수호자',
    isBoss: true, tier: 'boss', chapter: 3,
    patterns: [
      { name: '망각의 일격', dmg: [28, 36], type: 'attack' },
      { name: '시간 역행', dmg: [20, 28], type: 'attack' },
      { name: '봉인 해제', dmg: [40, 52], type: 'attack', heavy: true },
      { name: '절대 결계', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [260, 340], gem: [5, 8] },
  },
  
  // === 챕터 4 (마계의 균열) ===
  demonScout: {
    name: '마계 정찰병', hp: 230, color: '#8b1f1f',
    desc: '마계의 첨병',
    tier: 'normal', chapter: 4,
    patterns: [
      { name: '마계의 칼', dmg: [26, 32], type: 'attack' },
      { name: '독니 던지기', dmg: [18, 24], type: 'attack' },
      { name: '암흑 베기', dmg: [34, 44], type: 'attack', heavy: true },
      { name: '마계 자세', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [90, 120] },
  },
  wrathDemon: {
    name: '분노한 악마', hp: 280, color: '#c4453d',
    desc: '나크젤리온의 분노가 형상화된 존재',
    tier: 'normal', chapter: 4,
    patterns: [
      { name: '광기의 발톱', dmg: [28, 36], type: 'attack' },
      { name: '분노의 외침', dmg: [16, 22], type: 'attack' },
      { name: '대광살', dmg: [38, 50], type: 'attack', heavy: true },
      { name: '마계 결계', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [100, 130] },
  },
  riftBreach: {
    name: '차원의 균열', hp: 260, color: '#0a0608',
    desc: '차원이 찢어져 흘러나온 존재',
    tier: 'normal', chapter: 4,
    patterns: [
      { name: '차원 베기', dmg: [30, 38], type: 'attack' },
      { name: '공간 일그러뜨리기', dmg: [22, 28], type: 'attack' },
      { name: '차원 폭발', dmg: [40, 54], type: 'attack', heavy: true },
      { name: '균열 자세', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [105, 135] },
  },
  demonApostle: {
    name: '마왕의 사도', hp: 340, color: '#5c1a1a',
    desc: '나크젤리온의 직속 사도',
    tier: 'elite', chapter: 4,
    patterns: [
      { name: '사도의 일격', dmg: [32, 40], type: 'attack' },
      { name: '암흑 마법', dmg: [26, 34], type: 'attack' },
      { name: '신성 모독', dmg: [44, 56], type: 'attack', heavy: true },
      { name: '왕의 결계', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [160, 210], gem: [3, 5] },
  },
  nakzelionShadow: {
    name: '나크젤리온의 그림자', hp: 580, color: '#0a0608',
    desc: '마왕의 분신. 진정한 마왕은 더 깊은 곳에 있다',
    isBoss: true, tier: 'boss', chapter: 4,
    patterns: [
      { name: '왕의 권능', dmg: [34, 44], type: 'attack' },
      { name: '암흑의 격노', dmg: [26, 34], type: 'attack' },
      { name: '절대 멸살', dmg: [50, 64], type: 'attack', heavy: true },
      { name: '왕좌의 가호', dmg: [0, 0], type: 'defend', defense: 60 },
      { name: '저주의 손길', dmg: [22, 30], type: 'attack' },
    ],
    drop: { gold: [340, 440], gem: [8, 12] },
  },
  
  // ============================================================
  // === 챔피언십 — 북부 극지대 (frost) === 
  // 컨셉: 한기/지속데미지 — 동상 도트로 압박, 결빙으로 행동 봉쇄
  // 적 패턴에 frostbite: N 명시 시 플레이어에게 동상 부여 (3턴 도트)
  // ============================================================
  
  // === 챕터 1: 눈보라의 변경 (frost_1) — 입문 ===
  champ_frost_imp: {
    name: '서리 임프', hp: 70, color: '#9bc4e0',
    desc: '얼어붙은 안개 속에서 튀어나오는 작은 정령',
    tier: 'normal', chapter: 'frost_1',
    patterns: [
      { name: '서리 갈퀴', dmg: [10, 14], type: 'attack' },
      { name: '한기 입김', dmg: [6, 10], type: 'attack', frostbite: 3 },  // 약한 동상
      { name: '얼음 막', dmg: [0, 0], type: 'defend', defense: 18 },
    ],
    drop: { gold: [25, 40] },
  },
  champ_frost_wolf: {
    name: '서리 늑대', hp: 95, color: '#7ba3c4',
    desc: '눈보라 속에서 사냥을 즐기는 무리짐승',
    tier: 'normal', chapter: 'frost_1',
    patterns: [
      { name: '얼음 송곳니', dmg: [10, 14], type: 'attack', frostbite: 3 },
      { name: '얼어붙은 도약', dmg: [14, 20], type: 'attack', heavy: true },
      { name: '경계 자세', dmg: [0, 0], type: 'defend', defense: 22 },
    ],
    drop: { gold: [35, 55] },
  },
  champ_frost_shaman: {
    name: '얼음 무당', hp: 80, color: '#5c8eb8',
    desc: '한기를 다루는 부족 사제',
    tier: 'normal', chapter: 'frost_1',
    patterns: [
      { name: '얼음 화살', dmg: [11, 15], type: 'attack' },
      { name: '동상 의식', dmg: [4, 6], type: 'attack', frostbite: 5 },  // 약한 데미지 + 강한 동상
      { name: '한기의 결계', dmg: [0, 0], type: 'defend', defense: 28 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_frost_brute: {
    name: '얼음 광전사', hp: 115, color: '#3d6a8a',
    desc: '냉기로 단련된 야만 전사',
    tier: 'elite', chapter: 'frost_1',
    patterns: [
      { name: '얼음 도끼', dmg: [13, 18], type: 'attack', frostbite: 3 },
      { name: '광폭한 일격', dmg: [20, 26], type: 'attack', heavy: true, frostbite: 4 },
      { name: '얼음 갑주', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  champ_frost_boss1: {
    name: '눈보라의 군주', hp: 220, color: '#7ba3c4',
    desc: '눈보라를 부리는 변경의 지배자',
    isBoss: true, tier: 'boss', chapter: 'frost_1',
    patterns: [
      { name: '얼음 창', dmg: [15, 20], type: 'attack', frostbite: 3 },
      { name: '눈보라 휘몰이', dmg: [8, 12], type: 'attack', frostbite: 6 },
      { name: '결빙의 일격', dmg: [22, 30], type: 'attack', heavy: true, frostbite: 4 },
      { name: '얼음 결계', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [180, 240], gem: [3, 5] },
  },
  
  // === 챕터 2: 얼음 동굴 (frost_2) — 동상 누적 강화 ===
  champ_frost_lurker: {
    name: '동굴 잠복자', hp: 110, color: '#5c8eb8',
    desc: '동굴 천장에서 떨어지는 한기 짐승',
    tier: 'normal', chapter: 'frost_2',
    patterns: [
      { name: '한기 강타', dmg: [15, 20], type: 'attack', frostbite: 6 },
      { name: '동결 발톱', dmg: [10, 14], type: 'attack', frostbite: 8 },  // 데미지 약하지만 동상 강
      { name: '얼음 거미줄', dmg: [0, 0], type: 'defend', defense: 25 },
    ],
    drop: { gold: [50, 75] },
  },
  champ_frost_revenant: {
    name: '얼어붙은 망자', hp: 130, color: '#9bc4e0',
    desc: '동굴에서 얼어 죽은 옛 원정대원',
    tier: 'normal', chapter: 'frost_2',
    patterns: [
      { name: '망자의 손길', dmg: [12, 16], type: 'attack', frostbite: 7 },
      { name: '한기의 절규', dmg: [8, 12], type: 'attack', frostbite: 10 },  // 매우 강한 동상
      { name: '얼어붙은 자세', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [55, 80] },
  },
  champ_frost_elite2: {
    name: '심연의 빙룡', hp: 180, color: '#3d6a8a',
    desc: '동굴 깊은 곳의 작은 용족',
    tier: 'elite', chapter: 'frost_2',
    patterns: [
      { name: '빙룡의 숨결', dmg: [14, 18], type: 'attack', frostbite: 9 },
      { name: '얼음 송곳니', dmg: [22, 28], type: 'attack', heavy: true, frostbite: 7 },
      { name: '결빙의 비늘', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [90, 130], gem: [2, 3] },
  },
  champ_frost_boss2: {
    name: '동굴의 빙왕', hp: 360, color: '#5c8eb8',
    desc: '동굴 가장 깊은 곳에 잠든 한기의 군주',
    isBoss: true, tier: 'boss', chapter: 'frost_2',
    patterns: [
      { name: '빙왕의 강타', dmg: [22, 28], type: 'attack', frostbite: 8 },
      { name: '한기의 폭주', dmg: [12, 16], type: 'attack', frostbite: 12 },  // 보스급 동상
      { name: '결빙의 분쇄', dmg: [32, 42], type: 'attack', heavy: true, frostbite: 10 },
      { name: '얼음 왕좌', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [240, 320], gem: [5, 7] },
  },
  
  // === 챕터 3: 빙하 협곡 (frost_3) — 강한 한 방 + 동상 ===
  champ_frost_juggernaut: {
    name: '빙하 거인', hp: 170, color: '#3d6a8a',
    desc: '빙하 사이를 거니는 거대한 한기 골렘',
    tier: 'normal', chapter: 'frost_3',
    patterns: [
      { name: '빙하 강타', dmg: [20, 26], type: 'attack', frostbite: 8 },
      { name: '얼음 분쇄', dmg: [28, 36], type: 'attack', heavy: true, frostbite: 6 },
      { name: '얼음 갑옷', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [70, 100] },
  },
  champ_frost_seer: {
    name: '한기의 예언자', hp: 110, color: '#9bc4e0',
    desc: '빙하의 운명을 읽는 늙은 무당',
    tier: 'normal', chapter: 'frost_3',
    patterns: [
      { name: '얼음 저주', dmg: [10, 14], type: 'attack', frostbite: 12 },  // 핵심 동상 부여자
      { name: '한기의 일갈', dmg: [18, 24], type: 'attack', frostbite: 8 },
      { name: '결계 시전', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [60, 90] },
  },
  champ_frost_elite3: {
    name: '빙하 폭군', hp: 230, color: '#3d6a8a',
    desc: '협곡을 지배하는 한기의 화신',
    tier: 'elite', chapter: 'frost_3',
    patterns: [
      { name: '폭군의 강타', dmg: [26, 34], type: 'attack', frostbite: 10 },
      { name: '얼음 폭렬', dmg: [38, 48], type: 'attack', heavy: true, frostbite: 8 },
      { name: '얼음 결계', dmg: [0, 0], type: 'defend', defense: 45 },
    ],
    drop: { gold: [110, 160], gem: [3, 5] },
  },
  champ_frost_boss3: {
    name: '협곡의 한기룡', hp: 440, color: '#3d6a8a',
    desc: '빙하 협곡 깊은 곳에 잠든 고대 용족',
    isBoss: true, tier: 'boss', chapter: 'frost_3',
    patterns: [
      { name: '한기룡의 숨결', dmg: [16, 22], type: 'attack', frostbite: 14 },
      { name: '빙하의 발톱', dmg: [28, 36], type: 'attack', frostbite: 10 },
      { name: '절대 결빙', dmg: [42, 54], type: 'attack', heavy: true, frostbite: 12 },
      { name: '용의 비늘', dmg: [0, 0], type: 'defend', defense: 60 },
    ],
    drop: { gold: [320, 420], gem: [7, 10] },
  },
  
  // === 챕터 4: 절대영도 (frost_4) — 최종, 극한 동상 ===
  champ_frost_avatar: {
    name: '한기의 화신', hp: 200, color: '#7ba3c4',
    desc: '한기 그 자체가 형상을 갖춘 존재',
    tier: 'normal', chapter: 'frost_4',
    patterns: [
      { name: '한기의 손길', dmg: [16, 22], type: 'attack', frostbite: 12 },
      { name: '얼음 폭격', dmg: [28, 36], type: 'attack', heavy: true, frostbite: 10 },
      { name: '결빙의 장막', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [80, 120] },
  },
  champ_frost_elite4: {
    name: '서리의 대마법사', hp: 280, color: '#5c8eb8',
    desc: '한기의 모든 비술을 통달한 절대자',
    tier: 'elite', chapter: 'frost_4',
    patterns: [
      { name: '서리 폭풍', dmg: [22, 28], type: 'attack', frostbite: 14 },
      { name: '절대영도', dmg: [40, 52], type: 'attack', heavy: true, frostbite: 16 },
      { name: '한기의 방벽', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_frost_boss4: {
    name: '절대영도의 군주', hp: 540, color: '#9bc4e0',
    desc: '북부 극지대 가장 깊은 곳에 봉인된 한기의 신',
    isBoss: true, tier: 'boss', chapter: 'frost_4',
    patterns: [
      { name: '절대영도의 손길', dmg: [22, 28], type: 'attack', frostbite: 16 },
      { name: '얼음 시간', dmg: [14, 18], type: 'attack', frostbite: 20 },  // 극강 동상
      { name: '한기의 폭주', dmg: [34, 44], type: 'attack', frostbite: 14 },
      { name: '절대 결빙 분쇄', dmg: [50, 64], type: 'attack', heavy: true, frostbite: 18 },
      { name: '한기의 옥좌', dmg: [0, 0], type: 'defend', defense: 70 },
    ],
    drop: { gold: [400, 520], gem: [10, 14] },
  },
  
  // ============================================================
  // === 챔피언십 — 죽은자의 숲 (forest) === 
  // 컨셉: 광폭/자해 — 적이 매 턴 자신에게 공격력 +N (시간 끌수록 강력)
  // 적 객체에 berserkPerTurn: N 명시 → 매 턴 시작 시 berserkStacks 누적
  // ============================================================
  
  // === 챕터 1: 시든 외곽 (forest_1) — 입문, 약한 광폭 ===
  champ_forest_husk: {
    name: '시든 자', hp: 75, color: '#7a9a5e',
    desc: '숲의 부패한 영혼이 깃든 시든 신체',
    tier: 'normal', chapter: 'forest_1',
    berserkPerTurn: 2,  // 매 턴 +2 데미지
    patterns: [
      { name: '시든 손길', dmg: [11, 15], type: 'attack' },
      { name: '부패의 손톱', dmg: [13, 17], type: 'attack' },
      { name: '뿌리 방어', dmg: [0, 0], type: 'defend', defense: 18 },
    ],
    drop: { gold: [25, 40] },
  },
  champ_forest_wolf: {
    name: '굶주린 늑대', hp: 90, color: '#5e7a4a',
    desc: '광기에 빠진 숲의 짐승',
    tier: 'normal', chapter: 'forest_1',
    berserkPerTurn: 3,
    patterns: [
      { name: '광기의 송곳니', dmg: [12, 16], type: 'attack' },
      { name: '울부짖음', dmg: [16, 22], type: 'attack', heavy: true },
      { name: '경계 자세', dmg: [0, 0], type: 'defend', defense: 20 },
    ],
    drop: { gold: [35, 55] },
  },
  champ_forest_dryad: {
    name: '미친 드라이어드', hp: 85, color: '#8b9e6a',
    desc: '광기에 사로잡힌 숲의 정령',
    tier: 'normal', chapter: 'forest_1',
    berserkPerTurn: 2,
    patterns: [
      { name: '가시 채찍', dmg: [10, 14], type: 'attack' },
      { name: '뿌리 속박', dmg: [14, 18], type: 'attack' },
      { name: '나무 결계', dmg: [0, 0], type: 'defend', defense: 25 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_forest_brute1: {
    name: '광기의 거미', hp: 130, color: '#5e7a4a',
    desc: '눈이 여덟인 거대한 숲의 사냥꾼',
    tier: 'elite', chapter: 'forest_1',
    berserkPerTurn: 4,  // 강적은 광폭 누적 빠름
    patterns: [
      { name: '독니', dmg: [14, 19], type: 'attack' },
      { name: '광기의 도약', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '거미줄 결계', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  champ_forest_boss1: {
    name: '시든 자들의 어머니', hp: 240, color: '#7a9a5e',
    desc: '숲의 광기를 퍼뜨리는 근원',
    isBoss: true, tier: 'boss', chapter: 'forest_1',
    berserkPerTurn: 5,
    patterns: [
      { name: '광기의 손길', dmg: [16, 22], type: 'attack' },
      { name: '뿌리 폭발', dmg: [12, 16], type: 'attack' },
      { name: '광기 분쇄', dmg: [24, 32], type: 'attack', heavy: true },
      { name: '뿌리 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [180, 240], gem: [3, 5] },
  },
  
  // === 챕터 2: 망자의 길 (forest_2) — 광폭 누적 강화 ===
  champ_forest_revenant: {
    name: '망자의 영혼', hp: 105, color: '#8b9e6a',
    desc: '죽음에서 깨어난 분노의 망령',
    tier: 'normal', chapter: 'forest_2',
    berserkPerTurn: 4,
    patterns: [
      { name: '망자의 손길', dmg: [13, 17], type: 'attack' },
      { name: '분노의 일격', dmg: [18, 24], type: 'attack', heavy: true },
      { name: '망자의 갑주', dmg: [0, 0], type: 'defend', defense: 26 },
    ],
    drop: { gold: [50, 75] },
  },
  champ_forest_treant: {
    name: '광폭한 트리언트', hp: 145, color: '#5e7a4a',
    desc: '미쳐버린 거대한 숲의 정령목',
    tier: 'normal', chapter: 'forest_2',
    berserkPerTurn: 5,  // 큰 적이라 광폭 누적 ↑
    patterns: [
      { name: '나무 강타', dmg: [16, 22], type: 'attack' },
      { name: '뿌리 폭주', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '나무 갑옷', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [55, 80] },
  },
  champ_forest_elite2: {
    name: '광기의 폭군', hp: 180, color: '#3d5a2c',
    desc: '광기의 정점에 다다른 숲의 폭군',
    tier: 'elite', chapter: 'forest_2',
    berserkPerTurn: 6,
    patterns: [
      { name: '폭군의 강타', dmg: [18, 24], type: 'attack' },
      { name: '광기의 폭주', dmg: [26, 34], type: 'attack', heavy: true },
      { name: '나무 방패', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [90, 130], gem: [2, 3] },
  },
  champ_forest_boss2: {
    name: '망자의 군주', hp: 320, color: '#5e7a4a',
    desc: '죽은 자들을 이끄는 숲의 어둠',
    isBoss: true, tier: 'boss', chapter: 'forest_2',
    berserkPerTurn: 7,
    patterns: [
      { name: '군주의 강타', dmg: [20, 26], type: 'attack' },
      { name: '망자의 분노', dmg: [14, 18], type: 'attack' },
      { name: '광기의 분쇄', dmg: [28, 38], type: 'attack', heavy: true },
      { name: '왕좌의 가호', dmg: [0, 0], type: 'defend', defense: 45 },
    ],
    drop: { gold: [240, 320], gem: [5, 7] },
  },
  
  // === 챕터 3: 광기의 정원 (forest_3) — 빠른 광폭 누적 ===
  champ_forest_chimera: {
    name: '광기의 키메라', hp: 165, color: '#8b9e6a',
    desc: '여러 짐승의 광기가 합쳐진 괴수',
    tier: 'normal', chapter: 'forest_3',
    berserkPerTurn: 6,
    patterns: [
      { name: '키메라 강타', dmg: [18, 24], type: 'attack' },
      { name: '광기의 절규', dmg: [24, 32], type: 'attack', heavy: true },
      { name: '광기 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100] },
  },
  champ_forest_witch: {
    name: '광기의 마녀', hp: 110, color: '#3d5a2c',
    desc: '광기의 비술을 전수받은 어둠의 마녀',
    tier: 'normal', chapter: 'forest_3',
    berserkPerTurn: 5,
    patterns: [
      { name: '광기 저주', dmg: [14, 18], type: 'attack' },
      { name: '광기 폭발', dmg: [20, 26], type: 'attack', heavy: true },
      { name: '결계 시전', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [60, 90] },
  },
  champ_forest_elite3: {
    name: '광기의 화신', hp: 230, color: '#3d5a2c',
    desc: '광기 그 자체가 형상을 갖춘 존재',
    tier: 'elite', chapter: 'forest_3',
    berserkPerTurn: 8,  // Ch3 강적 가장 빠른 광폭
    patterns: [
      { name: '광기의 강타', dmg: [22, 28], type: 'attack' },
      { name: '광기 폭렬', dmg: [32, 42], type: 'attack', heavy: true },
      { name: '광기 결계', dmg: [0, 0], type: 'defend', defense: 42 },
    ],
    drop: { gold: [110, 160], gem: [3, 5] },
  },
  champ_forest_boss3: {
    name: '광기의 정원사', hp: 400, color: '#3d5a2c',
    desc: '정원에서 광기의 꽃을 가꾸는 노쇠한 정원사',
    isBoss: true, tier: 'boss', chapter: 'forest_3',
    berserkPerTurn: 9,
    patterns: [
      { name: '정원사의 가지치기', dmg: [22, 28], type: 'attack' },
      { name: '광기의 만개', dmg: [16, 22], type: 'attack' },
      { name: '광기의 폭주', dmg: [38, 50], type: 'attack', heavy: true },
      { name: '정원의 보호', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [320, 420], gem: [7, 10] },
  },
  
  // === 챕터 4: 심부의 폭군 (forest_4) — 극한 광폭 ===
  champ_forest_avatar: {
    name: '광기의 화신', hp: 195, color: '#7a9a5e',
    desc: '심부에 도달한 광기의 정점',
    tier: 'normal', chapter: 'forest_4',
    berserkPerTurn: 8,
    patterns: [
      { name: '화신의 손길', dmg: [18, 24], type: 'attack' },
      { name: '광기의 폭격', dmg: [26, 34], type: 'attack', heavy: true },
      { name: '광기의 장막', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [80, 120] },
  },
  champ_forest_elite4: {
    name: '심부의 사도', hp: 270, color: '#3d5a2c',
    desc: '광기의 폭군을 섬기는 어둠의 사도',
    tier: 'elite', chapter: 'forest_4',
    berserkPerTurn: 10,
    patterns: [
      { name: '사도의 일격', dmg: [22, 28], type: 'attack' },
      { name: '광기의 절대 폭주', dmg: [36, 48], type: 'attack', heavy: true },
      { name: '광기의 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_forest_boss4: {
    name: '심부의 폭군', hp: 500, color: '#3d5a2c',
    desc: '죽은자의 숲 가장 깊은 곳에 봉인된 광기의 신',
    isBoss: true, tier: 'boss', chapter: 'forest_4',
    berserkPerTurn: 12,  // 최종 보스 — 매 턴 +12 누적
    patterns: [
      { name: '폭군의 강타', dmg: [22, 28], type: 'attack' },
      { name: '광기의 절규', dmg: [16, 22], type: 'attack' },
      { name: '심부의 분노', dmg: [32, 42], type: 'attack' },
      { name: '광기의 절대 분쇄', dmg: [44, 58], type: 'attack', heavy: true },
      { name: '폭군의 옥좌', dmg: [0, 0], type: 'defend', defense: 65 },
    ],
    drop: { gold: [400, 520], gem: [10, 14] },
  },
  
  // ============================================================
  // === 챔피언십 — 봉인된 신전 (sanctum) === 
  // 컨셉: 봉인/제약 — 적이 N턴마다 플레이어 패시브 1~3개 봉인 (1~2턴)
  // 적 패턴에 seal: N 명시 시 플레이어 보유 패시브 중 N개 임시 봉인
  // ============================================================
  
  // === 챕터 1: 외곽 회랑 (sanctum_1) — 입문, 약한 봉인 ===
  champ_sanctum_acolyte: {
    name: '신전 봉인사', hp: 80, color: '#5c4a8c',
    desc: '봉인의 비술을 익히기 시작한 사도',
    tier: 'normal', chapter: 'sanctum_1',
    patterns: [
      { name: '봉인의 손길', dmg: [10, 14], type: 'attack', seal: 1 },  // 패시브 1개 봉인
      { name: '봉인의 일격', dmg: [14, 18], type: 'attack' },
      { name: '봉인 결계', dmg: [0, 0], type: 'defend', defense: 22 },
    ],
    drop: { gold: [30, 50] },
  },
  champ_sanctum_guardian: {
    name: '신전 수호자', hp: 105, color: '#4a3a6c',
    desc: '신전을 지키는 봉인된 영혼',
    tier: 'normal', chapter: 'sanctum_1',
    patterns: [
      { name: '신전 강타', dmg: [13, 18], type: 'attack' },
      { name: '봉인 일격', dmg: [18, 24], type: 'attack', heavy: true },
      { name: '신성 결계', dmg: [0, 0], type: 'defend', defense: 28 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_sanctum_seer: {
    name: '봉인의 선견자', hp: 75, color: '#7066a8',
    desc: '봉인의 미래를 보는 늙은 사제',
    tier: 'normal', chapter: 'sanctum_1',
    patterns: [
      { name: '예언의 일격', dmg: [11, 15], type: 'attack' },
      { name: '봉인의 저주', dmg: [8, 12], type: 'attack', seal: 2 },  // 패시브 2개 봉인
      { name: '예언 결계', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_sanctum_brute1: {
    name: '봉인된 거인', hp: 130, color: '#3a2a5c',
    desc: '한 때 영웅이었던 봉인된 거대 전사',
    tier: 'elite', chapter: 'sanctum_1',
    patterns: [
      { name: '봉인된 강타', dmg: [16, 22], type: 'attack', seal: 1 },
      { name: '거인의 일격', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '신전 갑주', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  champ_sanctum_boss1: {
    name: '신전 대사제', hp: 240, color: '#5c4a8c',
    desc: '신전의 봉인을 관장하는 최고 사제',
    isBoss: true, tier: 'boss', chapter: 'sanctum_1',
    patterns: [
      { name: '대사제의 강타', dmg: [16, 22], type: 'attack' },
      { name: '봉인의 의식', dmg: [10, 14], type: 'attack', seal: 2 },
      { name: '신전 분쇄', dmg: [24, 32], type: 'attack', heavy: true, seal: 1 },
      { name: '대사제 결계', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [180, 240], gem: [3, 5] },
  },
  
  // === 챕터 2: 봉인의 회랑 (sanctum_2) — 봉인 강화 ===
  champ_sanctum_priest: {
    name: '봉인 사제', hp: 110, color: '#5c4a8c',
    desc: '봉인의 의식에 정통한 사제',
    tier: 'normal', chapter: 'sanctum_2',
    patterns: [
      { name: '사제의 강타', dmg: [14, 19], type: 'attack' },
      { name: '봉인의 손길', dmg: [10, 14], type: 'attack', seal: 2 },
      { name: '봉인 결계', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [50, 75] },
  },
  champ_sanctum_warden: {
    name: '회랑의 감시자', hp: 130, color: '#4a3a6c',
    desc: '봉인된 회랑을 순찰하는 영혼',
    tier: 'normal', chapter: 'sanctum_2',
    patterns: [
      { name: '감시자의 일격', dmg: [16, 22], type: 'attack' },
      { name: '봉인 분쇄', dmg: [22, 28], type: 'attack', heavy: true, seal: 1 },
      { name: '감시자 자세', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [55, 80] },
  },
  champ_sanctum_elite2: {
    name: '봉인의 화신', hp: 180, color: '#3a2a5c',
    desc: '봉인 그 자체가 형상을 갖춘 존재',
    tier: 'elite', chapter: 'sanctum_2',
    patterns: [
      { name: '봉인의 강타', dmg: [18, 24], type: 'attack', seal: 1 },
      { name: '봉인 폭발', dmg: [24, 32], type: 'attack', heavy: true, seal: 2 },
      { name: '봉인 결계', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [90, 130], gem: [2, 3] },
  },
  champ_sanctum_boss2: {
    name: '봉인의 군주', hp: 320, color: '#4a3a6c',
    desc: '봉인된 회랑의 지배자',
    isBoss: true, tier: 'boss', chapter: 'sanctum_2',
    patterns: [
      { name: '군주의 강타', dmg: [20, 26], type: 'attack' },
      { name: '봉인의 폭주', dmg: [12, 16], type: 'attack', seal: 3 },  // 패시브 3개 봉인
      { name: '봉인 분쇄', dmg: [28, 38], type: 'attack', heavy: true, seal: 2 },
      { name: '왕좌의 결계', dmg: [0, 0], type: 'defend', defense: 45 },
    ],
    drop: { gold: [240, 320], gem: [5, 7] },
  },
  
  // === 챕터 3: 봉인의 심처 (sanctum_3) — 빠른 봉인 누적 ===
  champ_sanctum_archpriest: {
    name: '봉인의 대사제', hp: 165, color: '#5c4a8c',
    desc: '봉인의 정점에 다다른 신전의 대사제',
    tier: 'normal', chapter: 'sanctum_3',
    patterns: [
      { name: '대사제의 강타', dmg: [18, 24], type: 'attack', seal: 2 },
      { name: '봉인의 폭발', dmg: [24, 32], type: 'attack', heavy: true, seal: 1 },
      { name: '대사제 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100] },
  },
  champ_sanctum_oracle: {
    name: '봉인의 신탁자', hp: 110, color: '#7066a8',
    desc: '봉인의 신탁을 받아 적의 미래를 결정짓는 신탁자',
    tier: 'normal', chapter: 'sanctum_3',
    patterns: [
      { name: '신탁의 일격', dmg: [16, 22], type: 'attack' },
      { name: '봉인의 폭주', dmg: [10, 14], type: 'attack', seal: 3 },
      { name: '신탁 결계', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [60, 90] },
  },
  champ_sanctum_elite3: {
    name: '봉인의 폭군', hp: 230, color: '#3a2a5c',
    desc: '봉인을 무기로 휘두르는 신전의 폭군',
    tier: 'elite', chapter: 'sanctum_3',
    patterns: [
      { name: '폭군의 강타', dmg: [22, 28], type: 'attack', seal: 2 },
      { name: '봉인 폭렬', dmg: [32, 42], type: 'attack', heavy: true, seal: 1 },
      { name: '봉인 결계', dmg: [0, 0], type: 'defend', defense: 42 },
    ],
    drop: { gold: [110, 160], gem: [3, 5] },
  },
  champ_sanctum_boss3: {
    name: '심처의 봉인자', hp: 400, color: '#5c4a8c',
    desc: '신전 가장 깊은 곳의 봉인을 담당하는 자',
    isBoss: true, tier: 'boss', chapter: 'sanctum_3',
    patterns: [
      { name: '봉인자의 강타', dmg: [22, 28], type: 'attack' },
      { name: '봉인의 절대 봉쇄', dmg: [16, 22], type: 'attack', seal: 3 },
      { name: '봉인 폭주', dmg: [38, 50], type: 'attack', heavy: true, seal: 2 },
      { name: '심처의 결계', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [320, 420], gem: [7, 10] },
  },
  
  // === 챕터 4: 절대봉인 (sanctum_4) — 극한 봉인 ===
  champ_sanctum_avatar: {
    name: '봉인의 화신', hp: 195, color: '#7066a8',
    desc: '봉인 그 자체의 정점에 도달한 존재',
    tier: 'normal', chapter: 'sanctum_4',
    patterns: [
      { name: '화신의 손길', dmg: [18, 24], type: 'attack', seal: 2 },
      { name: '봉인의 폭격', dmg: [26, 34], type: 'attack', heavy: true, seal: 2 },
      { name: '봉인의 장막', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [80, 120] },
  },
  champ_sanctum_elite4: {
    name: '절대봉인의 사도', hp: 270, color: '#3a2a5c',
    desc: '절대봉인의 군주를 섬기는 어둠의 사도',
    tier: 'elite', chapter: 'sanctum_4',
    patterns: [
      { name: '사도의 일격', dmg: [22, 28], type: 'attack', seal: 2 },
      { name: '절대봉인의 폭주', dmg: [36, 48], type: 'attack', heavy: true, seal: 3 },
      { name: '봉인의 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_sanctum_boss4: {
    name: '절대봉인의 군주', hp: 500, color: '#3a2a5c',
    desc: '봉인된 신전 가장 깊은 곳에 봉인된 봉인의 신',
    isBoss: true, tier: 'boss', chapter: 'sanctum_4',
    patterns: [
      { name: '절대봉인의 강타', dmg: [22, 28], type: 'attack', seal: 2 },
      { name: '절대봉인의 절규', dmg: [16, 22], type: 'attack', seal: 3 },
      { name: '봉인의 절대 폭주', dmg: [32, 42], type: 'attack', seal: 2 },
      { name: '절대봉인의 분쇄', dmg: [44, 58], type: 'attack', heavy: true, seal: 3 },
      { name: '봉인의 옥좌', dmg: [0, 0], type: 'defend', defense: 65 },
    ],
    drop: { gold: [400, 520], gem: [10, 14] },
  },
  
  // ============================================================
  // === 챔피언십 — 마계의 균열 (rift) === 
  // 컨셉: 폭딜/충격 — 강한 헤비 공격 + 충격 게이지 부여 (100시 1턴 기절)
  // 적 패턴에 shock: N 명시 시 플레이어 충격 게이지 +N
  // 강한 헤비 공격이 핵심 — 회피/방어로 막아야 함
  // ============================================================
  
  // === 챕터 1: 균열의 입구 (rift_1) — 입문, 약한 충격 ===
  champ_rift_imp: {
    name: '균열의 임프', hp: 75, color: '#8b1f1f',
    desc: '균열에서 튀어나온 작은 마족',
    tier: 'normal', chapter: 'rift_1',
    patterns: [
      { name: '균열 강타', dmg: [11, 15], type: 'attack' },
      { name: '폭딜 일격', dmg: [16, 22], type: 'attack', heavy: true },
      { name: '균열 결계', dmg: [0, 0], type: 'defend', defense: 20 },
    ],
    drop: { gold: [30, 50] },
  },
  champ_rift_warrior: {
    name: '균열의 전사', hp: 100, color: '#a52a2a',
    desc: '마계의 강한 전사',
    tier: 'normal', chapter: 'rift_1',
    patterns: [
      { name: '강타', dmg: [13, 18], type: 'attack', shock: 20 },  // 충격 +20
      { name: '폭렬 일격', dmg: [20, 26], type: 'attack', heavy: true, shock: 30 },
      { name: '전사 자세', dmg: [0, 0], type: 'defend', defense: 25 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_rift_caster: {
    name: '균열의 술사', hp: 80, color: '#7c1f1f',
    desc: '마계의 폭렬 마법을 다루는 술사',
    tier: 'normal', chapter: 'rift_1',
    patterns: [
      { name: '폭렬 마법', dmg: [12, 16], type: 'attack', shock: 25 },
      { name: '마계 폭발', dmg: [22, 28], type: 'attack', heavy: true, shock: 30 },
      { name: '결계 시전', dmg: [0, 0], type: 'defend', defense: 28 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_rift_brute1: {
    name: '균열의 거인', hp: 130, color: '#5c1a1a',
    desc: '균열을 넘어온 거대한 마족',
    tier: 'elite', chapter: 'rift_1',
    patterns: [
      { name: '거인의 강타', dmg: [16, 22], type: 'attack', shock: 30 },
      { name: '균열 분쇄', dmg: [26, 32], type: 'attack', heavy: true, shock: 40 },
      { name: '균열 갑주', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  champ_rift_boss1: {
    name: '균열의 군주', hp: 240, color: '#8b1f1f',
    desc: '균열의 첫번째 지배자',
    isBoss: true, tier: 'boss', chapter: 'rift_1',
    patterns: [
      { name: '군주의 강타', dmg: [16, 22], type: 'attack', shock: 30 },
      { name: '폭발 일격', dmg: [12, 16], type: 'attack', shock: 50 },  // 충격 누적
      { name: '균열 분쇄', dmg: [26, 36], type: 'attack', heavy: true, shock: 40 },
      { name: '왕좌의 결계', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [180, 240], gem: [3, 5] },
  },
  
  // === 챕터 2: 피의 전선 (rift_2) — 폭딜 강화 ===
  champ_rift_assassin: {
    name: '균열의 암살자', hp: 95, color: '#a52a2a',
    desc: '균열에서 어둠 속을 다니는 사냥꾼',
    tier: 'normal', chapter: 'rift_2',
    patterns: [
      { name: '암살 일격', dmg: [16, 22], type: 'attack', shock: 30 },
      { name: '폭딜 칼날', dmg: [24, 32], type: 'attack', heavy: true, shock: 40 },
      { name: '암살자 은신', dmg: [0, 0], type: 'defend', defense: 22 },
    ],
    drop: { gold: [50, 75] },
  },
  champ_rift_devourer: {
    name: '피의 포식자', hp: 130, color: '#5c1a1a',
    desc: '피의 전선에서 인간을 사냥하는 마족',
    tier: 'normal', chapter: 'rift_2',
    patterns: [
      { name: '포식', dmg: [18, 24], type: 'attack', shock: 35 },
      { name: '피의 일격', dmg: [26, 34], type: 'attack', heavy: true, shock: 45 },
      { name: '포식자 자세', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [55, 80] },
  },
  champ_rift_elite2: {
    name: '균열의 마장', hp: 180, color: '#3a0a0a',
    desc: '균열 군세를 이끄는 마계의 명장',
    tier: 'elite', chapter: 'rift_2',
    patterns: [
      { name: '마장의 강타', dmg: [20, 26], type: 'attack', shock: 40 },
      { name: '균열의 폭주', dmg: [30, 40], type: 'attack', heavy: true, shock: 50 },
      { name: '마장 결계', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [90, 130], gem: [2, 3] },
  },
  champ_rift_boss2: {
    name: '피의 전선 사령관', hp: 320, color: '#5c1a1a',
    desc: '피의 전선을 지휘하는 마족 사령관',
    isBoss: true, tier: 'boss', chapter: 'rift_2',
    patterns: [
      { name: '사령관의 강타', dmg: [22, 28], type: 'attack', shock: 35 },
      { name: '피의 진격', dmg: [16, 22], type: 'attack', shock: 60 },
      { name: '사령관의 분쇄', dmg: [32, 44], type: 'attack', heavy: true, shock: 50 },
      { name: '사령관 갑주', dmg: [0, 0], type: 'defend', defense: 45 },
    ],
    drop: { gold: [240, 320], gem: [5, 7] },
  },
  
  // === 챕터 3: 마계의 심장 (rift_3) — 극한 폭딜 ===
  champ_rift_demonlord: {
    name: '소악마군', hp: 165, color: '#8b1f1f',
    desc: '마계의 작은 영주',
    tier: 'normal', chapter: 'rift_3',
    patterns: [
      { name: '영주의 강타', dmg: [22, 28], type: 'attack', shock: 40 },
      { name: '마계 폭주', dmg: [30, 40], type: 'attack', heavy: true, shock: 55 },
      { name: '영주 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100] },
  },
  champ_rift_archmage: {
    name: '마계의 대마법사', hp: 110, color: '#7c1f1f',
    desc: '마계의 비술을 통달한 대마법사',
    tier: 'normal', chapter: 'rift_3',
    patterns: [
      { name: '대마법사의 일격', dmg: [18, 24], type: 'attack', shock: 50 },
      { name: '마계의 폭렬', dmg: [28, 36], type: 'attack', heavy: true, shock: 60 },
      { name: '대마법사 결계', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [60, 90] },
  },
  champ_rift_elite3: {
    name: '마계의 폭군', hp: 230, color: '#3a0a0a',
    desc: '마계의 폭군 중 하나',
    tier: 'elite', chapter: 'rift_3',
    patterns: [
      { name: '폭군의 강타', dmg: [26, 34], type: 'attack', shock: 50 },
      { name: '마계 절대 폭렬', dmg: [40, 52], type: 'attack', heavy: true, shock: 70 },
      { name: '폭군 결계', dmg: [0, 0], type: 'defend', defense: 42 },
    ],
    drop: { gold: [110, 160], gem: [3, 5] },
  },
  champ_rift_boss3: {
    name: '심장의 마왕', hp: 400, color: '#8b1f1f',
    desc: '마계의 심장에 자리잡은 마왕',
    isBoss: true, tier: 'boss', chapter: 'rift_3',
    patterns: [
      { name: '마왕의 강타', dmg: [22, 28], type: 'attack', shock: 50 },
      { name: '마계의 분쇄', dmg: [30, 40], type: 'attack', shock: 60 },
      { name: '폭렬의 폭주', dmg: [42, 56], type: 'attack', heavy: true, shock: 80 },  // 한방에 충격 80
      { name: '마왕의 결계', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [320, 420], gem: [7, 10] },
  },
  
  // === 챕터 4: 나크젤리온의 영역 (rift_4) — 절대 폭딜 ===
  champ_rift_avatar: {
    name: '마계의 화신', hp: 195, color: '#a52a2a',
    desc: '마계 그 자체가 형상을 갖춘 존재',
    tier: 'normal', chapter: 'rift_4',
    patterns: [
      { name: '화신의 손길', dmg: [22, 28], type: 'attack', shock: 50 },
      { name: '마계의 폭격', dmg: [30, 40], type: 'attack', heavy: true, shock: 70 },
      { name: '마계의 장막', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [80, 120] },
  },
  champ_rift_elite4: {
    name: '나크젤리온의 사도', hp: 270, color: '#3a0a0a',
    desc: '마왕 나크젤리온을 섬기는 절대 사도',
    tier: 'elite', chapter: 'rift_4',
    patterns: [
      { name: '사도의 일격', dmg: [26, 34], type: 'attack', shock: 60 },
      { name: '절대 폭렬', dmg: [42, 56], type: 'attack', heavy: true, shock: 80 },
      { name: '마계의 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_rift_boss4: {
    name: '나크젤리온의 화신', hp: 540, color: '#3a0a0a',
    desc: '마계의 균열 가장 깊은 곳에 봉인된 마왕의 화신',
    isBoss: true, tier: 'boss', chapter: 'rift_4',
    patterns: [
      { name: '화신의 강타', dmg: [22, 28], type: 'attack', shock: 50 },
      { name: '마계의 절규', dmg: [16, 22], type: 'attack', shock: 80 },
      { name: '심부의 분노', dmg: [34, 44], type: 'attack', shock: 60 },
      { name: '나크젤리온의 분쇄', dmg: [50, 64], type: 'attack', heavy: true, shock: 90 },  // 한 방에 충격 90
      { name: '마왕의 옥좌', dmg: [0, 0], type: 'defend', defense: 65 },
    ],
    drop: { gold: [400, 520], gem: [10, 14] },
  },
  
  // ============================================================
  // === 챔피언십 — 여명의 회랑 (dawn) === 
  // 컨셉: 회복/지구전 — 적이 매 턴 HP 자가 회복 (regen)
  // 적 객체에 regen: N 명시 → 매 턴 HP +N (max HP 캡)
  // 빠른 처치 강제 — 시간 끌면 적이 회복으로 못 잡음
  // ============================================================
  
  // === 챕터 1: 여명의 입구 (dawn_1) — 입문, 약한 회복 ===
  champ_dawn_acolyte: {
    name: '여명의 사제', hp: 75, color: '#d4a574',
    desc: '여명의 빛으로 자신을 치유하는 신성한 사제',
    tier: 'normal', chapter: 'dawn_1',
    regen: 4,  // 매 턴 +4 HP
    patterns: [
      { name: '여명의 손길', dmg: [11, 15], type: 'attack' },
      { name: '신성 일격', dmg: [16, 22], type: 'attack', heavy: true },
      { name: '여명 결계', dmg: [0, 0], type: 'defend', defense: 22 },
    ],
    drop: { gold: [30, 50] },
  },
  champ_dawn_warrior: {
    name: '여명의 기사', hp: 105, color: '#c4a05c',
    desc: '신성한 빛으로 단련된 기사',
    tier: 'normal', chapter: 'dawn_1',
    regen: 5,
    patterns: [
      { name: '기사의 강타', dmg: [13, 18], type: 'attack' },
      { name: '신성 분쇄', dmg: [19, 25], type: 'attack', heavy: true },
      { name: '기사 자세', dmg: [0, 0], type: 'defend', defense: 28 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_dawn_seraph: {
    name: '하급 천사', hp: 85, color: '#e8c79a',
    desc: '여명의 회랑을 지키는 빛의 천사',
    tier: 'normal', chapter: 'dawn_1',
    regen: 6,
    patterns: [
      { name: '빛의 일격', dmg: [12, 16], type: 'attack' },
      { name: '신성한 빛', dmg: [18, 24], type: 'attack', heavy: true },
      { name: '천사의 결계', dmg: [0, 0], type: 'defend', defense: 26 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_dawn_brute1: {
    name: '여명의 거인', hp: 130, color: '#a08040',
    desc: '여명의 회랑을 수호하는 신성한 거인',
    tier: 'elite', chapter: 'dawn_1',
    regen: 8,  // 강적은 회복 빠름
    patterns: [
      { name: '거인의 강타', dmg: [16, 22], type: 'attack' },
      { name: '신성 분쇄', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '여명 갑주', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  champ_dawn_boss1: {
    name: '여명의 대천사', hp: 240, color: '#d4a574',
    desc: '여명의 빛을 다루는 최고 천사',
    isBoss: true, tier: 'boss', chapter: 'dawn_1',
    regen: 10,
    patterns: [
      { name: '대천사의 강타', dmg: [16, 22], type: 'attack' },
      { name: '신성한 회복', dmg: [10, 14], type: 'attack' },  // 약 데미지 + 적 HP 회복 가속 효과
      { name: '여명의 일격', dmg: [24, 32], type: 'attack', heavy: true },
      { name: '천사의 결계', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [180, 240], gem: [3, 5] },
  },
  
  // === 챕터 2: 빛의 회랑 (dawn_2) — 회복 강화 ===
  champ_dawn_priest: {
    name: '빛의 사제', hp: 110, color: '#d4a574',
    desc: '신성한 빛으로 자신을 치유하는 강한 사제',
    tier: 'normal', chapter: 'dawn_2',
    regen: 8,
    patterns: [
      { name: '사제의 강타', dmg: [14, 19], type: 'attack' },
      { name: '신성 일격', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '신성 결계', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [50, 75] },
  },
  champ_dawn_paladin: {
    name: '빛의 성전사', hp: 140, color: '#c4a05c',
    desc: '신성한 빛으로 무장한 성전사',
    tier: 'normal', chapter: 'dawn_2',
    regen: 10,
    patterns: [
      { name: '성전사의 강타', dmg: [18, 24], type: 'attack' },
      { name: '신성한 분쇄', dmg: [26, 32], type: 'attack', heavy: true },
      { name: '신성 갑옷', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [55, 80] },
  },
  champ_dawn_elite2: {
    name: '천사의 화신', hp: 180, color: '#a08040',
    desc: '빛 그 자체가 형상을 갖춘 존재',
    tier: 'elite', chapter: 'dawn_2',
    regen: 12,
    patterns: [
      { name: '화신의 강타', dmg: [20, 26], type: 'attack' },
      { name: '신성한 폭발', dmg: [28, 36], type: 'attack', heavy: true },
      { name: '신성 결계', dmg: [0, 0], type: 'defend', defense: 38 },
    ],
    drop: { gold: [90, 130], gem: [2, 3] },
  },
  champ_dawn_boss2: {
    name: '회랑의 수호 천사', hp: 320, color: '#c4a05c',
    desc: '빛의 회랑을 지키는 최강 천사',
    isBoss: true, tier: 'boss', chapter: 'dawn_2',
    regen: 14,
    patterns: [
      { name: '천사의 강타', dmg: [22, 28], type: 'attack' },
      { name: '신성한 분노', dmg: [16, 22], type: 'attack' },
      { name: '신성 분쇄', dmg: [30, 40], type: 'attack', heavy: true },
      { name: '천사의 결계', dmg: [0, 0], type: 'defend', defense: 45 },
    ],
    drop: { gold: [240, 320], gem: [5, 7] },
  },
  
  // === 챕터 3: 신성한 정원 (dawn_3) — 빠른 회복 ===
  champ_dawn_high_seraph: {
    name: '상급 천사', hp: 165, color: '#d4a574',
    desc: '여명의 정원을 가꾸는 신성한 천사',
    tier: 'normal', chapter: 'dawn_3',
    regen: 14,
    patterns: [
      { name: '상급 천사의 강타', dmg: [22, 28], type: 'attack' },
      { name: '신성 폭주', dmg: [30, 40], type: 'attack', heavy: true },
      { name: '신성 결계', dmg: [0, 0], type: 'defend', defense: 35 },
    ],
    drop: { gold: [70, 100] },
  },
  champ_dawn_oracle: {
    name: '여명의 신탁자', hp: 110, color: '#e8c79a',
    desc: '여명의 미래를 보는 신탁자',
    tier: 'normal', chapter: 'dawn_3',
    regen: 12,
    patterns: [
      { name: '신탁의 일격', dmg: [18, 24], type: 'attack' },
      { name: '신성 폭발', dmg: [26, 32], type: 'attack', heavy: true },
      { name: '신탁 결계', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [60, 90] },
  },
  champ_dawn_elite3: {
    name: '신성한 폭군', hp: 230, color: '#a08040',
    desc: '여명의 정원을 지배하는 폭군',
    tier: 'elite', chapter: 'dawn_3',
    regen: 16,
    patterns: [
      { name: '폭군의 강타', dmg: [24, 30], type: 'attack' },
      { name: '신성 폭렬', dmg: [36, 48], type: 'attack', heavy: true },
      { name: '폭군 결계', dmg: [0, 0], type: 'defend', defense: 42 },
    ],
    drop: { gold: [110, 160], gem: [3, 5] },
  },
  champ_dawn_boss3: {
    name: '정원의 대천사', hp: 400, color: '#d4a574',
    desc: '여명의 정원에서 영원한 회복을 누리는 대천사',
    isBoss: true, tier: 'boss', chapter: 'dawn_3',
    regen: 18,
    patterns: [
      { name: '대천사의 강타', dmg: [22, 28], type: 'attack' },
      { name: '신성한 회복', dmg: [12, 16], type: 'attack' },
      { name: '신성 폭주', dmg: [38, 50], type: 'attack', heavy: true },
      { name: '정원의 결계', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [320, 420], gem: [7, 10] },
  },
  
  // === 챕터 4: 빛의 옥좌 (dawn_4) — 절대 회복 ===
  champ_dawn_avatar: {
    name: '빛의 화신', hp: 195, color: '#e8c79a',
    desc: '여명의 빛 그 자체가 형상을 갖춘 존재',
    tier: 'normal', chapter: 'dawn_4',
    regen: 18,
    patterns: [
      { name: '화신의 손길', dmg: [22, 28], type: 'attack' },
      { name: '신성한 폭격', dmg: [30, 40], type: 'attack', heavy: true },
      { name: '빛의 장막', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [80, 120] },
  },
  champ_dawn_elite4: {
    name: '빛의 사도', hp: 270, color: '#a08040',
    desc: '여명의 신을 섬기는 빛의 절대 사도',
    tier: 'elite', chapter: 'dawn_4',
    regen: 22,
    patterns: [
      { name: '사도의 일격', dmg: [26, 34], type: 'attack' },
      { name: '신성 절대 폭렬', dmg: [40, 52], type: 'attack', heavy: true },
      { name: '신성 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_dawn_boss4: {
    name: '여명의 신', hp: 540, color: '#d4a574',
    desc: '여명의 회랑 가장 깊은 곳에 봉인된 빛의 신',
    isBoss: true, tier: 'boss', chapter: 'dawn_4',
    regen: 25,  // 최종 보스 매 턴 +25 회복
    patterns: [
      { name: '신의 강타', dmg: [22, 28], type: 'attack' },
      { name: '신성한 절규', dmg: [16, 22], type: 'attack' },
      { name: '심부의 분노', dmg: [34, 44], type: 'attack' },
      { name: '신성 절대 분쇄', dmg: [50, 64], type: 'attack', heavy: true },
      { name: '여명의 옥좌', dmg: [0, 0], type: 'defend', defense: 65 },
    ],
    drop: { gold: [400, 520], gem: [10, 14] },
  },
};

// =========== 챕터 ===========
// enemies: 챕터에서 등장하는 적 풀
//   - normal: 일반 노드에서 등장
//   - elite: 강적 노드에서 등장
//   - boss: 보스 노드에서 등장 (1마리)
export const CHAPTERS = [
  // === 튜토리얼 챕터 ===
  {
    id: 'tutorial_basic',
    name: '여명의 시작',
    sub: 'Where the Dawn Begins',
    desc: '여명의 검사가 마주하는 첫 시련. 모든 종류의 노드를 경험하라.',
    nodeCount: 7,
    biome: 'tutorial',
    color: '#d4a574',
    isTutorial: true,
    // 일직선 7노드 시퀀스: 준비 → 일반몹 → 강적 → 미지 → 사건 → 정비 → 보스
    // 각 노드 진입 시 NodeInfoModal로 설명 팝업
    linearSequence: ['prep', 'battle', 'elite', 'unknown', 'event', 'rest', 'boss'],
    enemies: { normal: ['goblin', 'iceWolf'], elite: ['cultist'], boss: 'wraith' },
  },
  {
    id: 'tutorial_market',
    name: '대장간 길목',
    sub: 'The Path of Trade',
    desc: '상인과 대장장이의 영역. 은화를 모으고 유물을 단련하라.',
    nodeCount: 16,
    biome: 'tutorial',
    color: '#c46535',
    isTutorial: true,
    // 노드 구성: 전투 위주(은화/유물 확보) + 상점/대장간 보장
    nodeWeights: {
      battle: 0.50,
      event: 0.10,
      shop: 0.15,      // 1~2개 등장 보장
      forge: 0.15,     // 1~2개 등장 보장
      unknown: 0.10,
    },
    guaranteedNodes: ['shop', 'forge'],  // 최소 1개씩 보장
    preShopBattles: 3,  // 상점 등장 전 최소 전투 수
    preForgeBattles: 4, // 대장간 등장 전 최소 전투 수
    enemies: { normal: ['goblin', 'iceWolf', 'frostGiant'], elite: ['cultist'], boss: 'iceMage' },
  },
  
  // === 기존 클래식 챕터 (수련의 길에서 사용) ===
  {
    id: 1, name: '북부 극지대', sub: 'The Northern Wastes',
    desc: '눈보라가 멈추지 않는 변경. 마족의 첩자들이 잠복한다.',
    nodeCount: 20, biome: 'ice', color: '#7ba3c4',
    enemies: { normal: ['goblin', 'iceWolf', 'frostGiant'], elite: ['cultist', 'iceMage'], boss: 'wraith' },
  },
  {
    id: 2, name: '죽은 자의 숲', sub: 'Forest of the Fallen',
    desc: '엘프의 옛 영토. 망자화된 황혼의 자녀들이 떠돈다.',
    nodeCount: 24, biome: 'forest', color: '#7a9a5e',
    enemies: { normal: ['fallenElf', 'shadowWolf', 'corruptSpider'], elite: ['forestSpirit', 'forestTyrant'], boss: 'twilightChild' },
  },
  {
    id: 3, name: '봉인된 신전', sub: 'The Sealed Sanctum',
    desc: '엘디마이어의 파편이 깨어나는 곳. 시간이 뒤틀린다.',
    nodeCount: 28, biome: 'ruin', color: '#5c4a8c',
    enemies: { normal: ['timeKeeper', 'brokenGolem', 'sealMage'], elite: ['ancientPriest'], boss: 'oblivionSealer' },
  },
  {
    id: 4, name: '마계의 균열', sub: 'The Demon Rift',
    desc: '나크젤리온의 군세가 쏟아지는 차원의 틈.',
    nodeCount: 32, biome: 'demon', color: '#8b1f1f',
    enemies: { normal: ['demonScout', 'wrathDemon', 'riftBreach'], elite: ['demonApostle'], boss: 'nakzelionShadow' },
  },
];

// =========== 사건 (텍스트 이벤트) ===========
// id: 고유 식별자
// title: 이벤트 제목
// text: 이벤트 본문 (\n으로 줄바꿈)
// chapter: 등장 챕터 (배열, [1,2] 처럼 여러 챕터 가능)
// choices: 선택지 배열
//   - text: 선택지 표시 텍스트
//   - cost: { gold: N } 처럼 비용 (있으면 비용 차감 후 진행)
//   - stat: 능력 검정 (예: '매력', '지능')
//   - dc: 검정 난이도 (성공 = 능력치 + 1d6 >= dc)
//   - success/fail: 검정 결과별 분기 (text/reward/penalty/combat)
//   - result: 검정 없이 즉시 결과 텍스트
//   - reward: { type, value, name, ... } 보상
//   - penalty: { hp: -30 } 등 페널티
//   - combat: 'enemyKey' 강제 전투 발생
//
// reward.type 종류:
//   - 'gold' / 'gem' / 'heal' / 'heal_full'
//   - 'random_relic' (랜덤 유물 1개)
//   - 'skill_random_lv' (보유 패시브 中 랜덤 +1Lv)
//   - 'skill_specific' (특정 패시브 +1Lv) — name 필요
//   - 'stat' (능력치 +X) — name, value 필요
export const EVENTS = [
  {
    id: 'merchant',
    title: '봉인된 신전 의문의 행상',
    text: '어둠 속에서 등이 굽은 노인이 손짓한다. 그의 마차에는 낡은 유물들이 가득하다.\n"용감한 자여, 내 물건을 보겠는가?"',
    chapter: [3],
    choices: [
      {
        text: '거래에 응한다 (은화 300)',
        cost: { gold: 300 },
        result: '알 수 없는 유물 손에 쥐어진다.',
        reward: { type: 'random_relic' }
      },
      {
        text: '의심스럽다, 떠난다',
        result: '노인의 시선을 등 뒤로 한다.',
        reward: null
      },
      {
        text: '정신을 홀린 뒤 짐을 뒤진다. (매력 검정)',
        stat: '매력', dc: 20,
        success: { text: '노인의 정신을 뒤흔든다. 짐을 챙겨 달아난다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '노인이 뼈를 드러낸다. 망자였다!', combat: 'cultist', penalty: { hp: -50 } }
      },
    ],
  },
  {
    id: 'shrine',
    title: '버려진 신전',
    text: '얼어붙은 돌계단 위에 작은 신전. 여명의 표식이 새겨져 있다.\n무언가가 당신을 부르는 듯하다.',
    chapter: [1, 2, 3],
    choices: [
      {
        text: '기도를 올린다 (지능 검정)',
        stat: '지능', dc: 19,
        success: { text: '여명의 가호가 손에 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '응답이 없다. 차가운 침묵만이.', penalty: null }
      },
      {
        text: '제단을 뒤진다',
        result: '잊혀진 보물을 찾아낸다.',
        reward: { type: 'gold', value: 60 }
      },
      {
        text: '돌아간다',
        result: '신성한 곳을 건드리지 않기로 한다.',
        reward: null
      },
    ],
  },
  {
    id: 'corpse',
    title: '얼어붙은 시체',
    text: '눈 속에 반쯤 묻힌 원정대원의 시체. 손에 쥔 일지가 보인다.\n그의 마지막 기록이 희미하게 남아있다.',
    chapter: [1],
    choices: [
      {
        text: '일지를 읽는다',
        result: '북부의 위험에 대한 단서를 얻는다.',
        reward: { type: 'stat', name: '지력', value : 2 }
      },
      {
        text: '장비를 챙긴다',
        result: '낡았지만 쓸만한 장비.',
        reward: { type: 'gold', value: 40 }
      },
      {
        text: '경의를 표한다 (매력)',
        stat: '매력', dc: 17,
        success: { text: '동료의 영혼이 가호를 내린다.', reward: { type: 'heal', value: 50 } },
        fail: { text: '시체는 그저 차가울 뿐.', penalty: null }
      },
    ],
  },
  // === 챕터 2 추가 사건 예시 ===
  {
    id: 'forestPath',
    title: '갈림길의 정령',
    text: '숲 속 갈림길에서 빛나는 정령이 나타난다.\n"가는 길을 알려주마. 그러나 대가가 필요하지."',
    chapter: [2, 3],
    choices: [
      {
        text: '체력으로 답한다 (HP -20)',
        result: '정령이 만족하며 사라진다. 옳은 길이 보인다.',
        reward: { type: 'gem', value: 5 },
        penalty: { hp: -20 }
      },
      {
        text: '은화로 답한다 (은화 -80)',
        cost: { gold: 80 },
        result: '정령이 길을 안내한다.',
        reward: { type: 'skill_random_lv' }
      },
      {
        text: '거절한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '정령의 환영을 꿰뚫어본다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '환영에 휩쓸려 길을 잃는다.', penalty: { hp: -30 } }
      },
    ],
  },
  
  // === 챕터 1 (북부) 추가 사건 ===
  {
    id: 'frozenCave',
    title: '얼어붙은 동굴 입구',
    text: '거대한 빙벽이 갈라진 틈. 안에서 차가운 바람이 불어온다.\n무언가가 안에 잠들어 있는 듯하다.',
    chapter: [1],
    choices: [
      {
        text: '안으로 들어간다 (근력 검정)',
        stat: '근력', dc: 13,
        success: { text: '얼음을 뚫고 들어가 잊혀진 보물을 찾는다.', reward: { type: 'random_relic' } },
        fail: { text: '얼음이 무너져 깔린다.', penalty: { hp: -25 } }
      },
      { text: '우회한다', result: '안전한 길을 택한다.', reward: null },
      {
        text: '입구에서 살핀다 (심안 검정)',
        stat: '지능', dc: 12,
        success: { text: '안에 있는 보물을 발견한다.', reward: { type: 'gold', value: 70 } },
        fail: { text: '아무것도 보이지 않는다.', penalty: null }
      },
    ],
  },
  {
    id: 'frozenCorpse',
    title: '얼어붙은 시신',
    text: '눈 속에 박힌 시신. 이전 원정대의 일원이었을까. 손에는 무언가가 쥐어져 있다.',
    chapter: [1, 2],
    choices: [
      { text: '시신을 뒤진다', result: '낡은 지갑을 챙긴다.', reward: { type: 'gold', value: 40 } },
      {
        text: '예의를 갖춰 묻어준다 (매력 검정)',
        stat: '매력', dc: 12,
        success: { text: '망자의 영혼이 가호를 내린다.', reward: { type: 'heal', value: 30 } },
        fail: { text: '얼어붙은 땅이 너무 단단하다.', penalty: null }
      },
      { text: '지나친다', result: '추위 속에 발걸음을 옮긴다.', reward: null },
    ],
  },
  {
    id: 'auroraNight',
    title: '극광의 밤',
    text: '하늘이 보랏빛 빛으로 흐른다. 황혼의 표식이 가득하다.',
    chapter: [1],
    choices: [
      {
        text: '빛에 몸을 맡긴다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '황혼의 진리가 어렴풋이 보인다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '광기가 잠시 정신을 좀먹는다.', penalty: { hp: -20 } }
      },
      { text: '눈을 감고 지나친다', result: '아무것도 보지 않는다.', reward: null },
    ],
  },
  {
    id: 'oldBattlefield',
    title: '옛 전장',
    text: '눈 아래 묻힌 전장. 부서진 무기들이 흩어져 있다.',
    chapter: [1, 2],
    choices: [
      {
        text: '쓸 만한 무기를 찾는다 (근력 검정)',
        stat: '근력', dc: 13,
        success: { text: '단단한 검을 발견한다.', reward: { type: 'stat', name: '근력', value: 1 } },
        fail: { text: '쓸 만한 게 없다.', penalty: null }
      },
      { text: '시신들에게 인사한다', result: '망자의 가호가 잠시 깃든다.', reward: { type: 'heal', value: 25 } },
    ],
  },
  
  // === 챕터 2 (숲) 추가 사건 ===
  {
    id: 'runeStone',
    title: '고대 룬스톤',
    text: '대지에 박힌 거대한 룬스톤. 알 수 없는 문자가 빛난다.\n손을 대면 무언가가 깃들 것 같다.',
    chapter: [2, 3],
    choices: [
      {
        text: '룬을 만진다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '고대 마법의 힘이 깃든다.', reward: { type: 'skill_random_lv', axis: 'attack' } },
        fail: { text: '마법의 폭발이 몸을 강타한다.', penalty: { hp: -35 } }
      },
      {
        text: '읽으려 한다 (마력 검정)',
        stat: '지능', dc: 16,
        success: { text: '룬이 가르침을 준다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '의미를 알 수 없다.', penalty: null }
      },
      { text: '지나친다', result: '룬이 등 뒤에서 빛난다.', reward: null },
    ],
  },
  {
    id: 'lostElf',
    title: '길 잃은 엘프',
    text: '나무에 기댄 어린 엘프. 무릎을 다쳤다.\n"인간이여... 도와주실 수 있나요?"',
    chapter: [2],
    choices: [
      { text: '치료를 도와준다 (은화 30)', cost: { gold: 30 }, result: '엘프가 감사하며 작은 부적을 건넨다.', reward: { type: 'random_relic' } },
      {
        text: '함정인지 의심한다 (지능 검정)',
        stat: '지능', dc: 13,
        success: { text: '실제로 함정이었다. 잠복했던 적을 처치한다.', reward: { type: 'gold', value: 60 } },
        fail: { text: '진짜였다. 도와주지 않았다.', penalty: null }
      },
      { text: '무시한다', result: '엘프의 울음소리가 등 뒤에서.', reward: null },
    ],
  },
  {
    id: 'huntersTrap',
    title: '사냥꾼의 함정',
    text: '바닥에 덫. 누군가 짐승을 잡으려 했다.\n주변에 사냥꾼은 보이지 않는다.',
    chapter: [2],
    choices: [
      {
        text: '덫을 회수한다 (민첩 검정)',
        stat: '민첩', dc: 13,
        success: { text: '함정을 무력화하고 부품을 챙긴다.', reward: { type: 'gold', value: 50 } },
        fail: { text: '발이 걸린다.', penalty: { hp: -30 } }
      },
      { text: '우회한다', result: '함정을 피해 간다.', reward: null },
    ],
  },
  {
    id: 'sacredTree',
    title: '신성한 나무',
    text: '거대한 신성목. 나무 줄기에 자그마한 빛이 어른거린다.',
    chapter: [2],
    choices: [
      {
        text: '명상한다 (매력 검정)',
        stat: '매력', dc: 14,
        success: { text: '나무의 정령이 가호를 내린다.', reward: { type: 'heal_full' } },
        fail: { text: '정령은 응답하지 않는다.', penalty: null }
      },
      { text: '나무 열매를 딴다', result: '신성한 열매를 먹는다.', reward: { type: 'heal', value: 40 } },
      {
        text: '나뭇가지를 꺾는다 (근력 검정)',
        stat: '근력', dc: 14,
        success: { text: '신성목의 가지를 얻는다.', reward: { type: 'random_relic' } },
        fail: { text: '나무가 분노한다!', combat: 'forestSpirit', penalty: null }
      },
    ],
  },
  {
    id: 'wolfPack',
    title: '늑대 무리',
    text: '어둠 속에서 빛나는 눈동자들. 늑대 무리가 길을 막고 있다.',
    chapter: [2],
    choices: [
      {
        text: '위협한다 (근력 검정)',
        stat: '근력', dc: 14,
        success: { text: '늑대들이 물러난다.', reward: null },
        fail: { text: '늑대들이 달려든다!', combat: 'shadowWolf', penalty: null }
      },
      {
        text: '먹이를 던진다 (은화 30)',
        cost: { gold: 30 },
        result: '늑대들이 먹이에 정신이 팔린 사이 지나간다.',
        reward: null
      },
      { text: '강제 돌파', result: '강행돌파. 길을 뚫는다.', reward: null, penalty: { hp: -25 } },
    ],
  },
  
  // === 챕터 3 (봉인된 신전) 사건 ===
  {
    id: 'sealedDoor',
    title: '봉인된 문',
    text: '거대한 석문. 여명의 표식이 새겨져 있다.\n안에서 무언가가 깨어나려 한다.',
    chapter: [3],
    choices: [
      {
        text: '강제로 연다 (근력 검정)',
        stat: '근력', dc: 16,
        success: { text: '문을 열고 봉인된 보물을 얻는다.', reward: { type: 'random_relic' } },
        fail: { text: '문이 흔들리지 않는다. 손목이 시리다.', penalty: { hp: -30 } }
      },
      {
        text: '봉인을 해독한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '봉인을 무사히 풀고 안에 들어간다.', reward: { type: 'skill_random_lv' } },
        fail: { text: '잘못된 주문에 마력이 폭발한다.', penalty: { hp: -25 } }
      },
      { text: '경고를 듣고 떠난다', result: '봉인은 그대로 둔다.', reward: null },
    ],
  },
  {
    id: 'timeRift',
    title: '시간의 균열',
    text: '공간이 일그러진다. 과거인지 미래인지 알 수 없는 풍경이 흘러간다.',
    chapter: [3],
    choices: [
      {
        text: '균열을 통과한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '균열 너머의 보물을 챙긴다.', reward: { type: 'gold', value: 150 } },
        fail: { text: '시간에 휩쓸려 부상을 입는다.', penalty: { hp: -35 } }
      },
      { text: '관찰만 한다', result: '시간의 비밀을 어렴풋이 깨닫는다.', reward: { type: 'stat', name: '지능', value: 1 } },
      { text: '서둘러 지나친다', result: '균열을 피해 간다.', reward: null },
    ],
  },
  {
    id: 'oldOracle',
    title: '낡은 신탁',
    text: '신전 깊숙한 곳, 잠든 신탁녀. 그녀의 입에서 알 수 없는 말이 흘러나온다.',
    chapter: [3],
    choices: [
      { text: '말을 듣는다', result: '신탁녀의 예언이 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
      {
        text: '깨워서 묻는다 (매력 검정)',
        stat: '매력', dc: 15,
        success: { text: '신탁녀가 보물의 위치를 알려준다.', reward: { type: 'gold', value: 130 } },
        fail: { text: '신탁녀가 분노한다!', penalty: { hp: -40 } }
      },
      { text: '잠든 모습 그대로 둔다', result: '예의를 갖춰 떠난다.', reward: null },
    ],
  },
  {
    id: 'shatteredAltar',
    title: '깨진 제단',
    text: '여명의 제단이 박살나 있다. 누군가의 흔적이 남아있다.',
    chapter: [3],
    choices: [
      {
        text: '제단을 복원한다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '여명의 가호가 깃든다.', reward: { type: 'heal_full' } },
        fail: { text: '제단이 더 부서진다.', penalty: null }
      },
      { text: '잔해를 뒤진다', result: '낡은 보물을 챙긴다.', reward: { type: 'gold', value: 80 } },
      {
        text: '깨끗이 정리한다 (매력 검정)',
        stat: '매력', dc: 13,
        success: { text: '여명이 작은 가호를 내린다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '응답이 없다.', penalty: null }
      },
    ],
  },
  {
    id: 'corruptedPriest',
    title: '타락한 사제',
    text: '신전의 사제. 광기에 빠진 눈으로 당신을 노려본다.\n"여명은 죽었다... 황혼이 진실이다..."',
    chapter: [3],
    choices: [
      {
        text: '대화를 시도한다 (매력 검정)',
        stat: '매력', dc: 16,
        success: { text: '사제의 마음을 진정시킨다. 그의 보물을 받는다.', reward: { type: 'random_relic' } },
        fail: { text: '사제가 폭주한다!', combat: 'ancientPriest', penalty: null }
      },
      { text: '즉시 공격', result: '사제와의 전투가 시작된다.', combat: 'sealMage', reward: null },
      { text: '도망간다', result: '광기를 등 뒤로 한다.', reward: null },
    ],
  },
  
  // === 챕터 4 (마계의 균열) 사건 ===
  {
    id: 'demonDeal',
    title: '악마와의 거래',
    text: '균열 속에서 악마가 손을 내민다.\n"네 영혼의 일부를 다오. 대가는 풍족할 것이다."',
    chapter: [4],
    choices: [
      { 
        text: '거래에 응한다 (HP -40)', 
        cost: { hp: 40 },
        result: '악마가 약속을 지킨다.', 
        reward: { type: 'random_relic' } 
      },
      { 
        text: '큰 거래를 시도한다 (HP -60)', 
        cost: { hp: 60 },
        result: '악마가 강력한 힘을 건넨다.', 
        reward: { type: 'skill_random_lv', axis: 'attack' } 
      },
      {
        text: '거절한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '악마의 함정을 꿰뚫어본다.', reward: { type: 'gold', value: 150 } },
        fail: { text: '악마가 분노한다.', penalty: { hp: -30 } }
      },
    ],
  },
  {
    id: 'soulPond',
    title: '영혼의 연못',
    text: '검은 액체로 가득 찬 연못. 안에서 영혼들이 떠올랐다 가라앉는다.',
    chapter: [4],
    choices: [
      {
        text: '액체를 마신다 (근력 검정)',
        stat: '근력', dc: 16,
        success: { text: '영혼의 힘을 흡수한다.', reward: { type: 'maxhp', value: 30 } },
        fail: { text: '영혼들이 정신을 잠식한다.', penalty: { hp: -45 } }
      },
      {
        text: '영혼들에게 기도한다 (매력 검정)',
        stat: '매력', dc: 15,
        success: { text: '영혼들이 가호를 내린다.', reward: { type: 'heal_full' } },
        fail: { text: '응답이 없다.', penalty: null }
      },
      { text: '지나친다', result: '검은 연못은 그대로 둔다.', reward: null },
    ],
  },
  {
    id: 'demonWeapon',
    title: '마계의 무기고',
    text: '버려진 마계의 무기들. 어두운 힘이 깃들어 있다.',
    chapter: [4],
    choices: [
      {
        text: '강력한 무기를 든다 (근력 검정)',
        stat: '근력', dc: 15,
        success: { text: '마계의 검을 휘두른다.', reward: { type: 'random_relic' } },
        fail: { text: '무기가 영혼을 물어뜯는다.', penalty: { hp: -40 } }
      },
      {
        text: '안전한 것을 고른다 (심안 검정)',
        stat: '지능', dc: 14,
        success: { text: '저주받지 않은 무기를 찾는다.', reward: { type: 'stat', name: '근력', value: 2 } },
        fail: { text: '모두 저주받았다.', penalty: null }
      },
      { text: '아무것도 만지지 않는다', result: '경계심을 유지한다.', reward: null },
    ],
  },
  {
    id: 'lostSoul',
    title: '방황하는 영혼',
    text: '한 영혼이 길을 막는다. 죽은 자의 슬픔이 가득하다.\n"제발... 나를 풀어주오..."',
    chapter: [4],
    choices: [
      {
        text: '진혼한다 (매력 검정)',
        stat: '매력', dc: 15,
        success: { text: '영혼이 평안을 찾는다. 작은 보물을 남긴다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '영혼이 분노로 변한다.', penalty: { hp: -35 } }
      },
      { text: '소금을 뿌린다 (보석 -3)', cost: { gem: 3 }, result: '영혼이 흩어진다.', reward: { type: 'gold', value: 70 } },
      { text: '무시한다', result: '슬픈 울음을 등 뒤로.', reward: null },
    ],
  },
  {
    id: 'demonGate',
    title: '마계의 문',
    text: '마계로 통하는 작은 문. 심한 악취가 풍긴다.\n안에 무엇이 있을지 알 수 없다.',
    chapter: [4],
    choices: [
      {
        text: '안으로 진입한다 (근력 검정)',
        stat: '근력', dc: 16,
        success: { text: '마계의 보물을 약탈한다.', reward: { type: 'gold', value: 200 } },
        fail: { text: '악마들에게 둘러싸인다!', combat: 'wrathDemon', penalty: null }
      },
      {
        text: '문을 봉인한다 (지능 검정)',
        stat: '지능', dc: 15,
        success: { text: '마계의 침입을 막아낸다. 여명의 가호가 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
        fail: { text: '봉인이 실패한다.', penalty: null }
      },
      { text: '돌아간다', result: '문을 등 뒤로 한다.', reward: null },
    ],
  },
  {
    id: 'cursedGold',
    title: '저주받은 황금',
    text: '거대한 금화 더미. 너무 풍요롭다. 분명 저주가 깃들어 있다.',
    chapter: [3, 4],
    choices: [
      {
        text: '모두 챙긴다 (저주 위험)',
        result: '엄청난 부를 얻지만 저주가 깃든다.',
        reward: { type: 'gold', value: 250 },
        penalty: { hp: -50 }
      },
      {
        text: '조금만 챙긴다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '저주받지 않은 부분만 골라낸다.', reward: { type: 'gold', value: 120 } },
        fail: { text: '저주가 깃든다.', penalty: { hp: -30 } }
      },
      { text: '만지지 않는다', result: '욕망을 누른다.', reward: null },
    ],
  },
  
  // === 모든 챕터 공용 추가 사건 ===
  {
    id: 'mysteriousFountain',
    title: '신비한 샘',
    text: '맑은 물이 흐르는 작은 샘. 여명의 표식이 살짝 보인다.',
    chapter: [1, 2, 3, 4],
    choices: [
      { text: '물을 마신다', result: '몸이 한결 가벼워진다.', reward: { type: 'heal', value: 35 } },
      {
        text: '동전을 던진다 (은화 -20)',
        cost: { gold: 20 },
        result: '샘에서 빛이 솟아오른다.',
        reward: { type: 'skill_random_lv' }
      },
      { text: '샘에 손을 씻는다', result: '정화된다.', reward: { type: 'heal', value: 15 } },
    ],
  },
  {
    id: 'lonelyTraveler',
    title: '외로운 여행자',
    text: '같은 길을 걷는 여행자. 잠시 함께 쉬어가자고 청한다.',
    chapter: [1, 2, 3, 4],
    choices: [
      { text: '함께 식사한다 (은화 -30)', cost: { gold: 30 }, result: '여행자가 정보를 알려준다.', reward: { type: 'gem', value: 3 } },
      {
        text: '대화를 나눈다 (매력 검정)',
        stat: '매력', dc: 13,
        success: { text: '여행자가 작은 도움을 준다.', reward: { type: 'gold', value: 50 } },
        fail: { text: '대화가 어색해 헤어진다.', penalty: null }
      },
      { text: '인사만 하고 떠난다', result: '각자의 길을 간다.', reward: null },
    ],
  },
  {
    id: 'hiddenChest',
    title: '숨겨진 보물상자',
    text: '풀숲 사이 보물상자. 자물쇠가 굳게 잠겨 있다.',
    chapter: [1, 2, 3, 4],
    choices: [
      {
        text: '자물쇠를 뜯는다 (근력 검정)',
        stat: '근력', dc: 14,
        success: { text: '자물쇠가 부러진다.', reward: { type: 'gold', value: 100 } },
        fail: { text: '함정이 발동한다.', penalty: { hp: -25 } }
      },
      {
        text: '열쇠를 따낸다 (민첩 검정)',
        stat: '민첩', dc: 13,
        success: { text: '자물쇠를 정밀하게 풀어낸다.', reward: { type: 'random_relic' } },
        fail: { text: '독침이 발동한다.', penalty: { hp: -30 } }
      },
      { text: '의심스럽다, 떠난다', result: '함정일지도.', reward: null },
    ],
  },
  // === 추가 사건은 여기에 자유롭게 추가 ===
];

// =========== 유물 ===========
// statBonus: 스탯형 효과
//   - dmgDealt: 주는 데미지 % 증가
//   - dmgTaken: 받는 데미지 % 감소 (음수)
//   - critRate: 치명타율 % 증가
//   - critDmg: 치명타 데미지 % 증가
//   - dodge: 회피율 % 증가
//   - maxHp: 최대 HP % 증가
//   - startGold: 시작 은화 +
//   - startGem: 시작 보석 +
//   - heal: 회복 효과 % 증가
//   - reflect: 받은 데미지 % 반사
//   - lifesteal: 적 처치 시 HP 회복 +
//   - shieldOnStart: 전투 시작 시 방어 +
export const RELICS = [
  // === 공격 계열 ===
  { name: '레카르도의 검편', statBonus: { dmgDealt: 10 }, weight: 5, color: '#c4c4d4',
    desc: '주는 데미지 +10%' },
  { name: '마족의 발톱', statBonus: { critRate: 15 }, weight: 5, color: '#8b1f1f',
    desc: '치명타율 +15%' },
  { name: '명검 로비아의 파편', statBonus: { critDmg: 30 }, weight: 4, color: '#e8b04a',
    desc: '치명타 데미지 +30%' },
  { name: '나크젤리온의 송곳니', statBonus: { lifesteal: 8 }, weight: 3, color: '#5c1a1a',
    desc: '적 처치 시 HP +8' },
  { name: '광기의 가면', statBonus: { dmgDealt: 20, dmgTaken: 10 }, weight: 3, color: '#c4453d',
    desc: '주는 데미지 +20%, 받는 데미지 +10%' },
  
  // === 방어 계열 ===
  { name: '네잎 클로버', statBonus: { dodge: 10 }, weight: 5, color: '#7a9a5e',
    desc: '회피율 +10%' },
  { name: '수신사의 가면', statBonus: { dmgTaken: -10 }, weight: 5, color: '#d4a574',
    desc: '받는 데미지 -10%' },
  { name: '에테르의 결정', statBonus: { maxHp: 20 }, weight: 4, color: '#5c4a8c',
    desc: '최대 HP +20%' },
  { name: '수호의 방패', statBonus: { shieldOnStart: 25 }, weight: 4, color: '#7ba3c4',
    desc: '전투 시작 시 방어 +25' },
  { name: '가시 갑옷', statBonus: { reflect: 20 }, weight: 3, color: '#8b8378',
    desc: '받은 데미지의 20% 반사' },
  
  // === 회복 / 자원 계열 ===
  { name: '대지의 심장', statBonus: { heal: 50 }, weight: 4, color: '#9ad4a3',
    desc: '모든 회복 효과 +50%' },
  { name: '왕의 보고', statBonus: { startGold: 80, startGem: 5 }, weight: 4, color: '#e8b04a',
    desc: '시작 은화 +80, 시작 보석 +5' },
  { name: '현자의 서', statBonus: { magicDmg: 10 }, weight: 4, color: '#5c4a8c',
    desc: '마법 데미지 +10%' },
  { name: '황혼의 모래시계', statBonus: { cdReduceChance: 20 }, weight: 4, color: '#d4a574',
    desc: '매 턴 20% 확률로 모든 스킬 쿨다운 -1턴' },
  { name: '천리안', statBonus: { mapReveal: 1 }, weight: 4, color: '#7ba3c4',
    desc: '맵의 모든 노드 공개 (사전 루트 파악)' },
  
  // === 챔피언십 전용 유물 (해당 원정 클리어 시 해금) ===
  // championshipUnlock: 어느 챔피언십에서 해금되는지
  // 일반 풀 weight = 0 (랜덤 미등장), 해금 후 프렙 단계에서 선택 가능
  { name: '한기의 결정', statBonus: { frostbiteResist: 50, magicDmg: 5 }, weight: 0, color: '#9bc4e0',
    desc: '동상 데미지 -50%, 마법 데미지 +5% (북부 극지대 클리어 시 해금)',
    championshipUnlock: 'frost' },
  { name: '광기의 송곳니', statBonus: { berserkResist: 50, dmg: 8 }, weight: 0, color: '#7a9a5e',
    desc: '적 광폭 누적 -50%, 데미지 +8% (죽은자의 숲 클리어 시 해금)',
    championshipUnlock: 'forest' },
  { name: '봉인의 인장', statBonus: { sealResist: 50, cdReduceChance: 15 }, weight: 0, color: '#5c4a8c',
    desc: '봉인 저항 +50%, 매 턴 15% 확률 쿨다운 -1 (봉인된 신전 클리어 시 해금)',
    championshipUnlock: 'sanctum' },
  { name: '균열의 핵', statBonus: { shockResist: 50, critRate: 10 }, weight: 0, color: '#8b1f1f',
    desc: '받는 충격 -50%, 치명타율 +10% (마계의 균열 클리어 시 해금)',
    championshipUnlock: 'rift' },
  { name: '여명의 성배', statBonus: { antiHeal: 50, dmgDealt: 8 }, weight: 0, color: '#d4a574',
    desc: '적 회복 효과 -50%, 주는 데미지 +8% (여명의 회랑 클리어 시 해금)',
    championshipUnlock: 'dawn' },
];

// =========== 황혼의 대장간 조합식 ===========
// 유물 2개 → 패시브 +1레벨
// 직업 전용 패시브 (심안류, 이프리트) 제외
// 정의되지 않은 조합 또는 이미 Lv.7인 패시브 시도 시 → 영혼 +50 보상만
export const FORGE_RECIPES = [
  { ingredients: ['레카르도의 검편', '광기의 가면'], result: '강타' },
  { ingredients: ['나크젤리온의 송곳니', '가시 갑옷'], result: '잔혹' },
  { ingredients: ['현자의 서', '에테르의 결정'], result: '마력' },
  { ingredients: ['대지의 심장', '수신사의 가면'], result: '신앙' },
  { ingredients: ['마족의 발톱', '명검 로비아의 파편'], result: '정밀' },
  { ingredients: ['수호의 방패', '가시 갑옷'], result: '수비' },
  { ingredients: ['네잎 클로버', '수신사의 가면'], result: '회피' },
  { ingredients: ['에테르의 결정', '대지의 심장'], result: '재생' },
  { ingredients: ['황혼의 모래시계', '왕의 보고'], result: '가속' },
  { ingredients: ['왕의 보고', '네잎 클로버'], result: '운명' },
  { ingredients: ['광기의 가면', '나크젤리온의 송곳니'], result: '광폭' },
  { ingredients: ['천리안', '마족의 발톱'], result: '심안' },
];

// 조합 도우미: 두 유물 이름으로 조합식 검색 (순서 무관)
export function findRecipe(relicName1, relicName2) {
  const set = new Set([relicName1, relicName2]);
  return FORGE_RECIPES.find(r => 
    r.ingredients.length === 2 && 
    r.ingredients.every(i => set.has(i))
  );
}
// 가중치 기반 랜덤 추출. 가중치가 클수록 더 자주 등장.
// 이 함수는 PASSIVE_SKILLS와 RELICS를 합쳐 동적으로 풀을 생성합니다.
export function buildRewardPool(currentClassId = null) {
  return [
    // 패시브 스킬 (직업 전용은 자기 직업일 때만 등장, weight ×1.2 부스트)
    ...Object.entries(PASSIVE_SKILLS)
      .filter(([_, sk]) => !sk.classOnly || sk.classOnly === currentClassId)
      .map(([name, sk]) => ({ 
        type: 'skill', 
        name, 
        weight: sk.classOnly ? Math.floor(28 * 1.2) : 28  // 직업 전용 ×1.2 = 33
      })),
    // 능력치
    { type: 'stat', name: '근력', value: 2, weight: 10 },
    { type: 'stat', name: '민첩', value: 2, weight: 10 },
    { type: 'stat', name: '지능', value: 2, weight: 10 },
    { type: 'stat', name: '매력', value: 2, weight: 10 },
    { type: 'stat', name: '최대 체력', value: 25, weight: 14 },
    // 회복
    { type: 'heal', value: 50, weight: 16 },
    { type: 'heal', value: 100, weight: 6 },
    { type: 'heal_full', weight: 3 },
    // 유물 (RELICS에서 자동 추가, weight 0인 챔피언십 전용 유물 제외)
    ...RELICS.filter(r => (r.weight || 0) > 0).map(r => ({ type: 'relic', ...r })),
    // 재화
    { type: 'gold', value: 80, weight: 10 },
    { type: 'gem', value: 3, weight: 5 },
  ];
}

// =========== 상점 가격표 ===========
// 보상 타입별 상점 가격 (은화)
// 일반 전투 드롭이 30~50, 강적 60~90이므로
// 가격은 노드 1~2개 클리어 비용 수준으로 책정
export const SHOP_PRICES = {
  skill: 250,         // 패시브 +1Lv (가장 가치 있음)
  // relic 제거 - 유물은 상점 판매 금지 (보상으로만 획득)
  stat: 180,          // 능력치 +2 (영구 효과)
  heal_full: 200,     // 완전 회복 (전투 직후 매우 가치)
  heal_100: 130,      // 회복 100
  heal_50: 70,        // 회복 50
  default: 100,
};

// =========== 게임 밸런스 상수 ===========
export const GAME_CONFIG = {
  // 시작 자원
  startHp: 300,
  startGold: 120,
  startGem: 15,
  
  // 보상 / 리롤
  rerollCost: 15,
  rerollDiscountCost: 2, // 운명 Lv.3 적용 시
  
  // 챕터 간 회복률
  chapterHealRatio: 0.7,
  
  // 야영 옵션 효과치
  rest: {
    healRatio: 0.4,
    gemAmount: 5,
    maxhpAmount: 20,
  },
  
  // 출혈 데미지 (스택당)
  bleedDmgPerStack: 5,
  
  // 충격 게이지
  shockGaugeBase: 30,       // 강타 Lv.3 기본
  shockGaugeBonus: 10,       // 강타 Lv.5 추가
  shockResistTurns: 3,       // 기절 후 저항 지속 턴
  shockResistReduction: 0.7, // 저항 시 게이지 누적량 70%
  
  // 능력 검정 주사위
  diceRoll: { min: 1, max: 6 },
  
  // 노드 그래프
  minLayers: 4,
  branchProbability: 0.4, // 두 갈래 분기 확률
};

// =========== 궁극 스킬 ===========
// Lv.7 도달 후 같은 패시브를 다시 획득하면 "궁극 진화" 가능.
// 한 패시브당 3개 궁극 분기. 진화 시:
//   - 해당 패시브 Lv → 0 리셋 (보상 풀에 다시 등장)
//   - 유물로 올린 경우 유물도 소멸
//   - 3개 궁극 모두 획득 시 보상 풀에서 영구 제외
// 
// 각 궁극은 ID 기준으로 활성화 여부 추적 (player.ultimates 배열)
export const ULTIMATE_SKILLS = {
  강타: [
    {
      id: '강타_광역폭발',
      name: '광역 폭발',
      desc: '공격 시 적 충격 게이지 +60. 기절 발동 시 광역 폭발(주변 데미지 30 추가).',
      effect: 'ult_shockBlast',
      color: '#c4453d',
    },
    {
      id: '강타_즉시처형',
      name: '즉시 처형',
      desc: '충격 게이지 100 도달 시 즉시 적 HP 25% 제거.',
      effect: 'ult_shockExecute',
      color: '#c4453d',
    },
    {
      id: '강타_영구침묵',
      name: '영구 침묵',
      desc: '한 번 기절시킨 적은 매 턴 시작 시 25% 확률로 또 기절.',
      effect: 'ult_perpetualStun',
      color: '#c4453d',
    },
  ],
  잔혹: [
    {
      id: '잔혹_피의축제',
      name: '피의 축제',
      desc: '출혈 데미지 ×2. 출혈 적 처치 시 HP 30 흡수.',
      effect: 'ult_bloodFeast',
      color: '#8b1f1f',
    },
    {
      id: '잔혹_사형선고',
      name: '사형 선고',
      desc: '즉사 조건 HP 35% 이하로 확장, 확률 30%로 증가.',
      effect: 'ult_deathSentence',
      color: '#8b1f1f',
    },
    {
      id: '잔혹_광기각성',
      name: '광기 각성',
      desc: 'HP 50% 이하 시 모든 데미지 +50%. 출혈 자가 부여로도 발동.',
      effect: 'ult_madness',
      color: '#8b1f1f',
    },
  ],
  마력: [
    {
      id: '마력_시간역행',
      name: '시간 역행',
      desc: '마법 공격 쿨다운 제거 + 에테르 +1.',
      effect: 'ult_timeRewind',
      color: '#5c4a8c',
    },
    {
      id: '마력_정념폭주',
      name: '정념 폭주',
      desc: '마법 데미지 ×2.0, 모든 마법 스킬 쿨다운 -1.',
      effect: 'ult_aetherStorm',
      color: '#5c4a8c',
    },
    {
      id: '마력_신탁각성',
      name: '신탁 각성',
      desc: '마법 공격 시 50% 확율로 3회 시전 (마력 Lv.7 대체).',
      effect: 'ult_oracleAwaken',
      color: '#5c4a8c',
    },
  ],
  신앙: [
    {
      id: '신앙_여명의축복',
      name: '여명의 축복',
      desc: '매 턴 HP +5, 모든 회복 효과 +50%.',
      effect: 'ult_derodBlessing',
      color: '#d4a574',
    },
    {
      id: '신앙_황혼의저주',
      name: '황혼의 저주',
      desc: '받는 데미지 -25%. 적 공격 시 30% 확률로 적이 자해.',
      effect: 'ult_deblanCurse',
      color: '#5c4a8c',
    },
    {
      id: '신앙_운명의저울',
      name: '운명의 저울',
      desc: '치명적 피격 시 100% 회피 (전투당 2회). 모든 능력치 +10.',
      effect: 'ult_destinyScale',
      color: '#d4a574',
    },
  ],
  // === 다른 패시브의 궁극은 향후 콘텐츠 확장에서 추가 ===
  // (정밀, 회피, 수비, 재생, 가속, 심안, 운명)
  // 위 4개 패시브는 핵심 빌드 축이라 우선 구현. 나머지는 일반 Lv.7 효과로 충분.
  
  // === 직업 전용 궁극 (방랑검사) ===
  심안류: [
    {
      id: '심안류_명경지수',
      name: '명경지수',
      desc: '반격 확률 +60%, 반격 데미지 +100%, 회피율 +10%.\n반격 발생 시 다음 턴 회피율 +30%.\n적 공격 회피 후 반격 시 반격 데미지 +100%.',
      effect: 'ult_counterMirror',
      color: '#7ba3c4',
    },
    {
      id: '심안류_검로일여',
      name: '검로일여',
      desc: '반격 확률 +60%, 반격 데미지 +150%.\n반격 발생 시 충격 게이지 +50 (100시 기절).\n기절한 적 공격 시 치명타 발생.',
      effect: 'ult_counterShock',
      color: '#e8b04a',
    },
    {
      id: '심안류_무영검',
      name: '무영검',
      desc: '반격 확률 +60%, 반격 데미지 +100%, 치명타 +15%.\n반격 발생 시 다음 턴 반드시 치명타.\n반격 실패 시 데미지 +50% 누적 (제한 없음). 반격 발동 시 누적 초기화.',
      effect: 'ult_counterShadow',
      color: '#5c4a8c',
    },
  ],
  // === 직업 전용 궁극 (술법사) ===
  이프리트: [
    {
      id: '이프리트_영겁지화',
      name: '영겁지화',
      desc: '이프리트 Lv.7 효과 초기화 (보상 풀 재등장).\n지능 +4. 화염 각인 발동 40%.\n발동 시마다 각인 데미지 누적 (지능×0.3씩 추가).\n각인 영구 지속. 치명타 폭발 비활성.\n* 이프리트 재획득 시: 발동 70% (40+30), 데미지 지능×0.3 고정, 폭발 가능.',
      effect: 'ult_eternalFire',
      color: '#ff4500',
    },
    {
      id: '이프리트_화신강림',
      name: '화신강림',
      desc: '이프리트 Lv.7 효과 초기화 (보상 풀 재등장).\n지능 +4. 방어 무시 +25 (절대값).\n화염 각인 발동 50%.\n치명타 시 화염 각인 폭발 → 다음 1턴 치명타 확률 +20%.\n* 이프리트 재획득 시: 발동 80% (50+30), 데미지 지능×0.3 고정.',
      effect: 'ult_ifritDescent',
      color: '#ff6b35',
    },
    {
      id: '이프리트_연옥지화',
      name: '연옥지화',
      desc: '이프리트 Lv.7 효과 초기화 (보상 풀 재등장).\n지능 +4. 화염 각인 발동 40%.\n치명타 시 화염 각인 폭발.\n화염 각인 보유 적 공격 시 마법 데미지 +20% (각인 부여 턴 미적용).\n화염 각인 보유 적 처치 시 HP +50 (다음 전투 적용).\n* 이프리트 재획득 시: 발동 70% (40+30), 데미지 지능×0.3 고정.',
      effect: 'ult_purgatoryFire',
      color: '#ff8c42',
    },
  ],
};

// =========== 원정 (Expedition) ===========
// 원정 = 4챕터 묶음 (한 던전). 클리어 시 다음 원정 해금.
// 새 원정은 능력치 배율 + 저주 시스템으로 난이도 상승.
// maxRelicSelect: 첫 노드(전투 준비)에서 활성화 가능한 유물 개수
// ============================================
// 클래식 모드 = 튜토리얼 + 수련의 길
// ============================================
// 1. 튜토리얼 (방랑검사 고정): 노드 입문 + 대장간 길목
// 2. 수련의 길 (5직업 각각): 클리어 시 해당 직업으로 챔피언십 해금
// ============================================
export const EXPEDITIONS = [
  // === 튜토리얼 1: 노드 입문 ===
  {
    id: 'tutorial_basic',
    name: '여명의 시작',
    sub: 'Where the Dawn Begins',
    desc: '방랑검사의 첫 발걸음. 노드의 종류를 익혀라.',
    color: '#d4a574',
    chapters: ['tutorial_basic'],
    enemyHpMult: 0.8,        // 살짝 쉽게
    enemyDmgMult: 0.8,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 20,
    unlockId: null,
    isTutorial: true,
    forcedClassId: 0,        // 방랑검사 고정 (CLASSES 배열 인덱스)
    category: 'tutorial',
    tutorialOrder: 1,
  },
  // === 튜토리얼 2: 대장간 길목 ===
  {
    id: 'tutorial_market',
    name: '대장간 길목',
    sub: 'The Path of Trade',
    desc: '은화를 모으고 유물을 단련하라. 상점과 대장간을 익혀라.',
    color: '#c46535',
    chapters: ['tutorial_market'],
    enemyHpMult: 0.9,
    enemyDmgMult: 0.9,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 30,
    unlockId: 'tutorial_basic_clear',     // 튜토리얼 1 클리어 후 해금
    isTutorial: true,
    forcedClassId: 0,
    category: 'tutorial',
    tutorialOrder: 2,
  },
  
  // === 수련의 길 (5직업) — 챔피언십 해금 트리거 ===
  {
    id: 'training_lanthert',
    name: '방랑검사의 수련',
    sub: 'Path of the Lanthert',
    desc: '검을 마스터한다. 클리어 시 챔피언십에서 방랑검사 사용 가능 + 술법사 해금.',
    color: '#c4453d',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'tutorial_market_clear',    // 튜토리얼 2 클리어 후 해금
    category: 'training',
    forcedClassId: 0,
    unlocksChampionshipFor: 0,            // 클리어 시 챔피언십(방랑검사) 해금
    unlocksClass: 1,                       // 클리어 시 술법사 직업 해금
  },
  {
    id: 'training_sage',
    name: '술법사의 수련',
    sub: 'Path of the Sage',
    desc: '주문을 연마한다. 클리어 시 챔피언십에서 술법사 사용 가능 + 마족 해금.',
    color: '#7ba3c4',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'training_lanthert_clear',
    category: 'training',
    forcedClassId: 1,
    unlocksChampionshipFor: 1,
    unlocksClass: 2,
  },
  {
    id: 'training_demonblood',
    name: '혼혈 마족의 수련',
    sub: 'Path of the Demonblood',
    desc: '마성을 다스린다. 클리어 시 챔피언십에서 마족 사용 가능 + 엘프 해금.',
    color: '#8b1f1f',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'training_sage_clear',
    category: 'training',
    forcedClassId: 2,
    unlocksChampionshipFor: 2,
    unlocksClass: 3,
  },
  {
    id: 'training_elf',
    name: '엘프의 수련',
    sub: 'Path of the Elf',
    desc: '자연을 부린다. 클리어 시 챔피언십에서 엘프 사용 가능 + 사제 해금.',
    color: '#7a9a5e',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'training_demonblood_clear',
    category: 'training',
    forcedClassId: 3,
    unlocksChampionshipFor: 3,
    unlocksClass: 4,
  },
  {
    id: 'training_priest',
    name: '사제의 수련',
    sub: 'Path of the Priest',
    desc: '신앙을 굳힌다. 클리어 시 챔피언십에서 사제 사용 가능.',
    color: '#d4a574',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'training_elf_clear',
    category: 'training',
    forcedClassId: 4,
    unlocksChampionshipFor: 4,
    // 마지막 수련 — 다음 직업 해금 없음
  },
];

// =========== 챔피언십 원정 (신규 5원정 × 4난이도) ===========
// 기존 EXPEDITIONS와 별개의 시스템
// 각 원정은 고유 컨셉을 가지며 적/스킬/패턴이 다르다
// 4난이도(일반/하드/지옥/광기)는 능력치만 다르고 구조는 동일

// 챔피언십 난이도 (기존과 동일 비율)
export const CHAMPIONSHIP_DIFFICULTIES = [
  { id: 'normal',  name: '일반', sub: 'Normal',
    enemyHpMult: 1.0, enemyDmgMult: 1.0, curseCount: 0, maxRelicSelect: 1, soulReward: 30 },
  { id: 'hard',    name: '하드', sub: 'Hard',
    enemyHpMult: 1.3, enemyDmgMult: 1.2, curseCount: 1, maxRelicSelect: 2, soulReward: 60 },
  { id: 'hell',    name: '지옥', sub: 'Hell',
    enemyHpMult: 1.6, enemyDmgMult: 1.4, curseCount: 2, maxRelicSelect: 3, soulReward: 120 },
  { id: 'madness', name: '광기', sub: 'Madness',
    enemyHpMult: 2.0, enemyDmgMult: 1.6, curseCount: 3, maxRelicSelect: 4, soulReward: 250 },
];

// 챔피언십 5원정 — 컨셉/챕터 구성
// Phase 1에서는 데이터 구조만 정의 (적/스킬은 Phase 2에서 추가)
// chapters: [chapterId × 4] — 각 챕터는 챔피언십 전용 (CHAMPIONSHIP_CHAPTERS 참조)
export const CHAMPIONSHIPS = [
  {
    id: 'frost',
    name: '북부 극지대',
    sub: 'The Frostbound Wastes',
    desc: '얼음과 한기의 영토. 적은 동상을 퍼뜨려 천천히 갉아먹는다.',
    color: '#7ba3c4',
    concept: '한기/지속데미지 — 동상 도트로 압박, 결빙으로 행동 봉쇄',
    chapters: ['frost_1', 'frost_2', 'frost_3', 'frost_4'],
    // 추천 직업: 술법사(화염), 사제(정화)
  },
  {
    id: 'forest',
    name: '죽은자의 숲',
    sub: 'Forest of the Fallen',
    desc: '망자가 떠도는 숲. 적은 시간이 흐를수록 광폭해진다.',
    color: '#7a9a5e',
    concept: '광폭/자해 — 적이 매 턴 강해짐, 빠른 처치가 핵심',
    chapters: ['forest_1', 'forest_2', 'forest_3', 'forest_4'],
    // 추천 직업: 혼혈 마족(폭딜), 정령사(즉살)
  },
  {
    id: 'sanctum',
    name: '봉인된 신전',
    sub: 'The Sealed Sanctum',
    desc: '시간이 뒤틀린 신전. 적은 마법과 봉인으로 스킬을 막는다.',
    color: '#5c4a8c',
    concept: '봉인/제약 — 적이 내 스킬을 봉인, 자원 운용 중요',
    chapters: ['sanctum_1', 'sanctum_2', 'sanctum_3', 'sanctum_4'],
    // 추천 직업: 방랑검사(반격), 혼혈 마족(물리)
  },
  {
    id: 'rift',
    name: '마계의 균열',
    sub: 'The Demon Rift',
    desc: '차원의 틈에서 마족이 쏟아진다. 적의 한 방이 치명적이다.',
    color: '#8b1f1f',
    concept: '폭딜/충격 — 적이 강력한 한 방, 회피와 충격 누적이 핵심',
    chapters: ['rift_1', 'rift_2', 'rift_3', 'rift_4'],
    // 추천 직업: 정령사(회피), 방랑검사(반격)
  },
  {
    id: 'dawn',
    name: '여명의 회랑',
    sub: 'Hall of Dawn',
    desc: '여명의 빛이 깃든 회랑. 적은 매 턴 회복하며 끝없이 일어선다.',
    color: '#d4a574',
    concept: '회복/지구전 — 적이 매 턴 자가 회복, 즉발 폭딜로 압도',
    chapters: ['dawn_1', 'dawn_2', 'dawn_3', 'dawn_4'],
    // 추천 직업: 술법사(폭딜), 혼혈 마족(즉살)
  },
];

// 챔피언십 챕터 — Phase 2에서 적/스킬 채워질 placeholder
// 현재는 구조만 정의
export const CHAMPIONSHIP_CHAPTERS = {
  // 북부 극지대
  frost_1: { name: '눈보라의 변경', sub: 'The Snowfields', biome: 'ice', color: '#7ba3c4',
             nodeCount: 20,
             enemies: { 
               normal: ['champ_frost_imp', 'champ_frost_wolf', 'champ_frost_shaman'],
               elite: ['champ_frost_brute'],
               boss: 'champ_frost_boss1' 
             } },
  frost_2: { name: '얼음 동굴', sub: 'Frozen Caverns', biome: 'ice', color: '#7ba3c4',
             nodeCount: 22,
             enemies: { 
               normal: ['champ_frost_lurker', 'champ_frost_revenant', 'champ_frost_wolf'],
               elite: ['champ_frost_elite2'],
               boss: 'champ_frost_boss2' 
             } },
  frost_3: { name: '빙하 협곡', sub: 'Glacial Chasm', biome: 'ice', color: '#7ba3c4',
             nodeCount: 24,
             enemies: { 
               normal: ['champ_frost_juggernaut', 'champ_frost_seer', 'champ_frost_revenant'],
               elite: ['champ_frost_elite3'],
               boss: 'champ_frost_boss3' 
             } },
  frost_4: { name: '절대영도', sub: 'Absolute Zero', biome: 'ice', color: '#7ba3c4',
             nodeCount: 26,
             enemies: { 
               normal: ['champ_frost_avatar', 'champ_frost_juggernaut', 'champ_frost_seer'],
               elite: ['champ_frost_elite4', 'champ_frost_elite3'],
               boss: 'champ_frost_boss4' 
             } },
  // 죽은자의 숲
  forest_1: { name: '시든 외곽', sub: 'Withered Outskirts', biome: 'forest', color: '#7a9a5e',
              nodeCount: 20,
              enemies: { 
                normal: ['champ_forest_husk', 'champ_forest_wolf', 'champ_forest_dryad'],
                elite: ['champ_forest_brute1'],
                boss: 'champ_forest_boss1' 
              } },
  forest_2: { name: '망자의 길', sub: 'Path of the Fallen', biome: 'forest', color: '#7a9a5e',
              nodeCount: 22,
              enemies: { 
                normal: ['champ_forest_revenant', 'champ_forest_treant', 'champ_forest_wolf'],
                elite: ['champ_forest_elite2'],
                boss: 'champ_forest_boss2' 
              } },
  forest_3: { name: '광기의 정원', sub: 'Garden of Madness', biome: 'forest', color: '#7a9a5e',
              nodeCount: 24,
              enemies: { 
                normal: ['champ_forest_chimera', 'champ_forest_witch', 'champ_forest_treant'],
                elite: ['champ_forest_elite3'],
                boss: 'champ_forest_boss3' 
              } },
  forest_4: { name: '심부의 폭군', sub: 'The Inner Tyrant', biome: 'forest', color: '#7a9a5e',
              nodeCount: 26,
              enemies: { 
                normal: ['champ_forest_avatar', 'champ_forest_chimera', 'champ_forest_witch'],
                elite: ['champ_forest_elite4', 'champ_forest_elite3'],
                boss: 'champ_forest_boss4' 
              } },
  // 봉인된 신전
  sanctum_1: { name: '잊혀진 입구', sub: 'Forgotten Entrance', biome: 'ruin', color: '#5c4a8c',
               nodeCount: 20,
               enemies: { 
                 normal: ['champ_sanctum_acolyte', 'champ_sanctum_guardian', 'champ_sanctum_seer'],
                 elite: ['champ_sanctum_brute1'],
                 boss: 'champ_sanctum_boss1' 
               } },
  sanctum_2: { name: '봉인의 통로', sub: 'Hall of Seals', biome: 'ruin', color: '#5c4a8c',
               nodeCount: 22,
               enemies: { 
                 normal: ['champ_sanctum_priest', 'champ_sanctum_warden', 'champ_sanctum_guardian'],
                 elite: ['champ_sanctum_elite2'],
                 boss: 'champ_sanctum_boss2' 
               } },
  sanctum_3: { name: '시간의 미궁', sub: 'Maze of Time', biome: 'ruin', color: '#5c4a8c',
               nodeCount: 24,
               enemies: { 
                 normal: ['champ_sanctum_archpriest', 'champ_sanctum_oracle', 'champ_sanctum_warden'],
                 elite: ['champ_sanctum_elite3'],
                 boss: 'champ_sanctum_boss3' 
               } },
  sanctum_4: { name: '깨어나는 봉인', sub: 'The Awakening Seal', biome: 'ruin', color: '#5c4a8c',
               nodeCount: 26,
               enemies: { 
                 normal: ['champ_sanctum_avatar', 'champ_sanctum_archpriest', 'champ_sanctum_oracle'],
                 elite: ['champ_sanctum_elite4', 'champ_sanctum_elite3'],
                 boss: 'champ_sanctum_boss4' 
               } },
  // 마계의 균열
  rift_1: { name: '균열의 시작', sub: 'Breach Point', biome: 'demon', color: '#8b1f1f',
            nodeCount: 20,
            enemies: { 
              normal: ['champ_rift_imp', 'champ_rift_warrior', 'champ_rift_caster'],
              elite: ['champ_rift_brute1'],
              boss: 'champ_rift_boss1' 
            } },
  rift_2: { name: '피의 전선', sub: 'The Bloody Front', biome: 'demon', color: '#8b1f1f',
            nodeCount: 22,
            enemies: { 
              normal: ['champ_rift_assassin', 'champ_rift_devourer', 'champ_rift_warrior'],
              elite: ['champ_rift_elite2'],
              boss: 'champ_rift_boss2' 
            } },
  rift_3: { name: '마계의 심장', sub: 'Heart of the Abyss', biome: 'demon', color: '#8b1f1f',
            nodeCount: 24,
            enemies: { 
              normal: ['champ_rift_demonlord', 'champ_rift_archmage', 'champ_rift_devourer'],
              elite: ['champ_rift_elite3'],
              boss: 'champ_rift_boss3' 
            } },
  rift_4: { name: '나크젤리온의 옥좌', sub: 'Throne of Nakzelion', biome: 'demon', color: '#8b1f1f',
            nodeCount: 26,
            enemies: { 
              normal: ['champ_rift_avatar', 'champ_rift_demonlord', 'champ_rift_archmage'],
              elite: ['champ_rift_elite4', 'champ_rift_elite3'],
              boss: 'champ_rift_boss4' 
            } },
  // 여명의 회랑
  dawn_1: { name: '여명의 입구', sub: 'Gate of Dawn', biome: 'holy', color: '#d4a574',
            nodeCount: 20,
            enemies: { 
              normal: ['champ_dawn_acolyte', 'champ_dawn_warrior', 'champ_dawn_seraph'],
              elite: ['champ_dawn_brute1'],
              boss: 'champ_dawn_boss1' 
            } },
  dawn_2: { name: '빛의 회랑', sub: 'Hall of Light', biome: 'holy', color: '#d4a574',
            nodeCount: 22,
            enemies: { 
              normal: ['champ_dawn_priest', 'champ_dawn_paladin', 'champ_dawn_warrior'],
              elite: ['champ_dawn_elite2'],
              boss: 'champ_dawn_boss2' 
            } },
  dawn_3: { name: '신성한 정원', sub: 'Sacred Garden', biome: 'holy', color: '#d4a574',
            nodeCount: 24,
            enemies: { 
              normal: ['champ_dawn_high_seraph', 'champ_dawn_oracle', 'champ_dawn_paladin'],
              elite: ['champ_dawn_elite3'],
              boss: 'champ_dawn_boss3' 
            } },
  dawn_4: { name: '여명의 옥좌', sub: 'Throne of Dawn', biome: 'holy', color: '#d4a574',
            nodeCount: 26,
            enemies: { 
              normal: ['champ_dawn_avatar', 'champ_dawn_high_seraph', 'champ_dawn_oracle'],
              elite: ['champ_dawn_elite4', 'champ_dawn_elite3'],
              boss: 'champ_dawn_boss4' 
            } },
};

// =========== 전투 준비 시스템 ===========
export const PREP_CONFIG = {
  maxSkillSelect: 5,    // 활성 패시브 개수 (모든 원정 동일)
};

// =========== 저주 (원정 2+ 적용) ===========
// 원정 시작 시 curseCount만큼 무작위로 부여
export const CURSES = [
  {
    id: 'curse_fragility',
    name: '깨지기 쉬운 영혼',
    desc: '받는 모든 데미지 +15%',
    effect: 'curse_dmgTaken+15',
    color: '#c4453d',
  },
  {
    id: 'curse_weakness',
    name: '약화의 저주',
    desc: '주는 모든 데미지 -15%',
    effect: 'curse_dmgDealt-15',
    color: '#8b1f1f',
  },
  {
    id: 'curse_drain',
    name: '활력의 고갈',
    desc: '최대 체력 -20%',
    effect: 'curse_maxHp-20',
    color: '#5c4a8c',
  },
  {
    id: 'curse_poverty',
    name: '빈곤의 저주',
    desc: '획득 은화 -50%',
    effect: 'curse_gold-50',
    color: '#d4a574',
  },
  {
    id: 'curse_silence',
    name: '침묵의 저주',
    desc: '에테르 최대치 -1',
    effect: 'curse_ether-1',
    color: '#7ba3c4',
  },
  {
    id: 'curse_isolation',
    name: '고립의 저주',
    desc: '시작 시 보석 없음',
    effect: 'curse_noGem',
    color: '#7a9a5e',
  },
  {
    id: 'curse_decay',
    name: '부패의 저주',
    desc: '회복 효과 -50%',
    effect: 'curse_heal-50',
    color: '#9ad4a3',
  },
  {
    id: 'curse_brittleness',
    name: '취약함',
    desc: '시작 방어 0',
    effect: 'curse_noDefense',
    color: '#7ba3c4',
  },
];

// =========== 메타 강화 (영혼의 제단) ===========
// stackable: true는 단계별 누적 / false는 1회성 해금
// 매번 제단 입장 시 6개 풀에서 랜덤 3개 등장
export const META_UPGRADES = [
  // === 시작 자원 강화 ===
  {
    id: 'meta_startHp',
    name: '강인한 시작',
    desc: '시작 HP +10',
    category: 'resource',
    stackable: true,
    maxStacks: 20,
    cost: (stack) => 50 + stack * 50,  // 30, 50, 70, 90, 110, 130, 150, 170, 190, 210
    effect: 'startHp+10',
    color: '#9ad4a3',
  },
  {
    id: 'meta_startGold',
    name: '풍요의 축복',
    desc: '시작 은화 +20',
    category: 'resource',
    stackable: true,
    maxStacks: 10,
    cost: (stack) => 50 + stack * 50,  // 20, 35, 50, ... 125
    effect: 'startGold+20',
    color: '#d4a574',
  },
  {
    id: 'meta_startGem',
    name: '명상의 결정',
    desc: '시작 보석 +3',
    category: 'resource',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 50 + stack * 50,  // 50, 80, 110, 140, 170
    effect: 'startGem+3',
    color: '#7ba3c4',
  },
  {
    id: 'meta_maxEther',
    name: '에테르의 그릇',
    desc: '최대 에테르 +1',
    category: 'resource',
    stackable: true,
    maxStacks: 2,
    cost: (stack) => 200 + stack * 200,  // 200, 400
    effect: 'maxEther+1',
    color: '#5c4a8c',
  },
  
  // === 전투 강화 ===
  {
    id: 'meta_startSkillLv',
    name: '단련된 영혼',
    desc: '직업 시작 패시브 +1Lv',
    category: 'combat',
    stackable: true,
    maxStacks: 2,             // 5 → 2 너프
    cost: (stack) => stack === 0 ? 500 : 2000,  // 500, 2000
    effect: 'startSkill+1',
    color: '#c4453d',
  },
  {
    id: 'meta_startRelic',
    name: '신탁의 유물',
    desc: '시작 시 무작위 유물 +1',
    category: 'combat',
    stackable: true,
    maxStacks: 2,             // 5 → 2 너프
    cost: (stack) => stack === 0 ? 500 : 2000,  // 500, 2000
    effect: 'startRelic+1',
    color: '#e8b04a',
  },
  {
    id: 'meta_dmgDealt',
    name: '강자의 길',
    desc: '주는 모든 데미지 +5%',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 500 + stack * 500,  // 500, 1000, 1500, 2000, 2500
    effect: 'dmgDealt+5%',
    color: '#c4453d',
  },
  {
    id: 'meta_dmgTaken',
    name: '강철의 의지',
    desc: '받는 모든 데미지 -3%',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 300 + stack * 300,  // 300, 600, 900, 1200, 1500
    effect: 'dmgTaken-3%',
    color: '#7ba3c4',
  },
  {
    id: 'meta_critRate',
    name: '예리함의 시야',
    desc: '치명타율 +3%',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 500 + stack * 500,  // 500, 1000, 1500, 2000, 2500
    effect: 'critRate+3%',
    color: '#d4a574',
  },
  
  // === 원정 강화 ===
  {
    id: 'meta_chapterHeal',
    name: '여정의 가호',
    desc: '챕터 클리어 시 HP 회복 +10%',
    category: 'expedition',
    stackable: true,
    maxStacks: 3,
    cost: (stack) => 1000 + stack * 1000,  // 1000, 2000, 3000
    effect: 'chapterHeal+10%',
    color: '#9ad4a3',
  },
  {
    id: 'meta_rerollDiscount',
    name: '운명의 손길',
    desc: '리롤 비용 -10 영혼',
    category: 'expedition',
    stackable: false,
    cost: () => 600,
    effect: 'reroll-1',
    color: '#5c4a8c',
  },
  {
    id: 'meta_extraReward',
    name: '풍성한 보상',
    desc: '보상 3중1 → 4중1',
    category: 'expedition',
    stackable: false,
    cost: () => 800,
    effect: 'reward+1',
    color: '#e8b04a',
  },
  
  // === 해금 ===
  // 직업 해금은 수련의 길 클리어로 자동 해금 (영혼 구매 불필요)
  // 원정 해금도 진행 기반 (튜토리얼 → 수련 → 챔피언십)으로 변경
  
  // === 챔피언십 메타 강화 (도전자 보상) ===
  {
    id: 'meta_champion_normal',
    name: '도전자의 영혼',
    desc: '시작 HP +50, 시작 패시브 +1Lv (모든 챔피언십 일반 클리어 후 구매 가능)',
    category: 'champion',
    stackable: false,
    cost: () => 3000,
    requireChampionshipAll: 'normal',  // 5원정 모두 일반 클리어 필요
    effect: 'champion_normal',
    color: '#d4a574',
  },
  {
    id: 'meta_champion_madness',
    name: '정복자의 영혼',
    desc: '시작 HP +100, 시작 패시브 +2Lv, 시작 유물 +1 (모든 챔피언십 광기 클리어 후 구매 가능)',
    category: 'champion',
    stackable: false,
    cost: () => 10000,
    requireChampionshipAll: 'madness',
    effect: 'champion_madness',
    color: '#c4453d',
  },
];

// =========== 영혼 (Soul) 획득량 ===========
export const SOUL_REWARDS = {
  normalKill: 1,         // 일반 적 처치
  eliteKill: 3,          // 강적 처치
  bossKill: [5, 8, 12, 20],  // 챕터별 보스 처치
  chapterClear: [5, 10, 15, 20],  // 챕터별 클리어 보너스
  deathPenalty: 0.7,     // 사망 시 누적량의 70%만 획득
  rerollCost: 50,        // 제단 새로고침 비용
  altarSlots: 3,         // 제단 등장 강화 개수
  dailyRerollLimit: 10,  // 일일 유료 리롤 횟수 제한 (KST 0시 리셋)
};

// =========== 업적 시스템 ===========
// 업적 카테고리:
//   - clear: 직업/원정 클리어 진행 업적
//   - special: 기발한/특수 업적
//   - meta: 누적 메타 업적
//
// progress / target: 진행도 / 목표
// reward: 영혼 보상
// 진행 조건:
//   - clear_expedition: 특정 직업 + 원정 클리어
//   - kill_count: 누적 처치
//   - cumulative_souls: 누적 영혼 보유
//   - first_kill: 첫 처치
//   - 등 (구현은 추적 시스템에서)
export const ACHIEVEMENTS = [
  // === 튜토리얼 진행 업적 ===
  { id: 'clear_tutorial_basic', cat: 'tutorial', kind: 'first', target: 1, reward: 50, 
    name: '여명의 첫 발걸음', desc: '튜토리얼 - 노드 입문 클리어' },
  { id: 'clear_tutorial_market', cat: 'tutorial', kind: 'first', target: 1, reward: 80, 
    name: '상인과 대장장이', desc: '튜토리얼 - 대장간 길목 클리어' },
  
  // === 수련의 길 클리어 업적 (5직업) ===
  // 보상: 직업 순서대로 100/150/200/250/300
  { id: 'clear_training_lanthert', cat: 'training', class: 'lanthert', kind: 'first', target: 1, reward: 100, 
    name: '검의 수련자', desc: '방랑검사의 수련 클리어 — 술법사 해금' },
  { id: 'clear_training_sage', cat: 'training', class: 'sage', kind: 'first', target: 1, reward: 150, 
    name: '주문의 수련자', desc: '술법사의 수련 클리어 — 마족 해금' },
  { id: 'clear_training_demonblood', cat: 'training', class: 'demonblood', kind: 'first', target: 1, reward: 200, 
    name: '마성의 수련자', desc: '혼혈 마족의 수련 클리어 — 엘프 해금' },
  { id: 'clear_training_elf', cat: 'training', class: 'elf', kind: 'first', target: 1, reward: 250, 
    name: '자연의 수련자', desc: '엘프의 수련 클리어 — 사제 해금' },
  { id: 'clear_training_priest', cat: 'training', class: 'priest', kind: 'first', target: 1, reward: 300, 
    name: '신앙의 수련자', desc: '사제의 수련 클리어 — 모든 직업 마스터' },
  
  // === 수련의 길 숙달 업적 (5직업 × 10회) ===
  { id: 'master10_training_lanthert', cat: 'training', class: 'lanthert', kind: 'count', target: 10, reward: 300, 
    name: '방랑검사의 숙달자', desc: '방랑검사의 수련 10회 클리어' },
  { id: 'master10_training_sage', cat: 'training', class: 'sage', kind: 'count', target: 10, reward: 300, 
    name: '술법사의 숙달자', desc: '술법사의 수련 10회 클리어' },
  { id: 'master10_training_demonblood', cat: 'training', class: 'demonblood', kind: 'count', target: 10, reward: 300, 
    name: '혼혈 마족의 숙달자', desc: '혼혈 마족의 수련 10회 클리어' },
  { id: 'master10_training_elf', cat: 'training', class: 'elf', kind: 'count', target: 10, reward: 300, 
    name: '엘프의 숙달자', desc: '엘프의 수련 10회 클리어' },
  { id: 'master10_training_priest', cat: 'training', class: 'priest', kind: 'count', target: 10, reward: 300, 
    name: '사제의 숙달자', desc: '사제의 수련 10회 클리어' },
  
  // === 전문가 (50회) - 직업당 1개 (가장 어려운 원정 4 기준) ===
  { id: 'expert_lanthert', cat: 'clear', class: 'lanthert', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '검의 전문가', desc: '방랑검사로 망각의 원정 50회 클리어' },
  { id: 'expert_sage', cat: 'clear', class: 'sage', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '술법의 전문가', desc: '술법사로 망각의 원정 50회 클리어' },
  { id: 'expert_demonblood', cat: 'clear', class: 'demonblood', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '마혈의 전문가', desc: '혼혈 마족로 망각의 원정 50회 클리어' },
  { id: 'expert_elf', cat: 'clear', class: 'elf', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '숲의 전문가', desc: '숲의 정령사로 망각의 원정 50회 클리어' },
  { id: 'expert_priest', cat: 'clear', class: 'priest', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '신앙의 전문가', desc: '여명의 사제로 망각의 원정 50회 클리어' },
  
  // === 마스터 (100회) - 직업당 1개 ===
  { id: 'master_lanthert', cat: 'clear', class: 'lanthert', expedition: 4, kind: 'count', target: 100, reward: 5000, name: '검의 마스터', desc: '방랑검사로 망각의 원정 100회 클리어' },
  { id: 'master_sage', cat: 'clear', class: 'sage', expedition: 4, kind: 'count', target: 100, reward: 5000, name: '술법의 마스터', desc: '술법사로 망각의 원정 100회 클리어' },
  { id: 'master_demonblood', cat: 'clear', class: 'demonblood', expedition: 4, kind: 'count', target: 100, reward: 5000, name: '마혈의 마스터', desc: '혼혈 마족로 망각의 원정 100회 클리어' },
  { id: 'master_elf', cat: 'clear', class: 'elf', expedition: 4, kind: 'count', target: 100, reward: 5000, name: '숲의 마스터', desc: '숲의 정령사로 망각의 원정 100회 클리어' },
  { id: 'master_priest', cat: 'clear', class: 'priest', expedition: 4, kind: 'count', target: 100, reward: 5000, name: '신앙의 마스터', desc: '여명의 사제로 망각의 원정 100회 클리어' },
  
  // === 기발한 업적 (Achievement Hunter) ===
  { id: 'special_first_kill', cat: 'special', kind: 'event', target: 1, reward: 20, name: '첫걸음', desc: '처음으로 적을 처치' },
  { id: 'special_dodge_only', cat: 'special', kind: 'event', target: 10, reward: 150, name: '무결한 검사', desc: '한 전투 중 회피만으로 적 10마리 처치' },
  { id: 'special_low_hp_kill', cat: 'special', kind: 'event', target: 1, reward: 100, name: '핏빛 광기', desc: 'HP 1로 적 처치' },
  { id: 'special_souls_5000', cat: 'meta', kind: 'cumulative', target: 5000, reward: 200, name: '영혼 부자', desc: '영혼 5000 누적 보유' },
  { id: 'special_no_relic', cat: 'special', kind: 'event', target: 1, reward: 300, name: '미니멀리스트', desc: '유물 없이 원정 클리어' },
  { id: 'special_no_passive', cat: 'special', kind: 'event', target: 1, reward: 400, name: '공허한 승리', desc: '패시브 1Lv 강화 없이 원정 클리어' },
  { id: 'special_no_death', cat: 'special', kind: 'event', target: 1, reward: 250, name: '신중한 자', desc: '단 한번도 사망하지 않고 원정 클리어' },
  { id: 'special_kill_50', cat: 'special', kind: 'event', target: 50, reward: 150, name: '몰살자', desc: '한 챕터에서 적 50마리 처치' },
  { id: 'special_speed_clear', cat: 'special', kind: 'event', target: 1, reward: 200, name: '광속 클리어', desc: '챕터를 5분 안에 클리어' },
  { id: 'special_all_lv7', cat: 'special', kind: 'event', target: 1, reward: 350, name: '여명의 의지', desc: '한 런에서 패시브 5종 모두 Lv.7 보유' },
  { id: 'special_three_curses', cat: 'special', kind: 'event', target: 1, reward: 500, name: '황혼의 손길', desc: '저주 3개 모두 받은 채 원정 클리어' },
  { id: 'special_event_perfect', cat: 'special', kind: 'event', target: 1, reward: 200, name: '운명의 심판자', desc: '한 런에서 모든 사건 성공' },
  { id: 'special_lanthert_3ult', cat: 'special', kind: 'event', target: 1, reward: 600, name: '검의 길', desc: '방랑검사 궁극 3종 모두 1런에 진화' },
  { id: 'special_all_class_e4', cat: 'meta', kind: 'event', target: 5, reward: 3000, name: '미답의 도전자', desc: '모든 직업으로 망각 원정 클리어' },
  { id: 'special_max_meta', cat: 'meta', kind: 'event', target: 1, reward: 1000, name: '영혼의 수호자', desc: '영혼 제단 모든 강화 최대 단계' },
  
  // === 누적 업적 ===
  { id: 'meta_kill_100', cat: 'meta', kind: 'cumulative', target: 100, reward: 50, name: '백 인의 처단자', desc: '누적 100마리 처치' },
  { id: 'meta_kill_1000', cat: 'meta', kind: 'cumulative', target: 1000, reward: 300, name: '천 인의 처단자', desc: '누적 1000마리 처치' },
  { id: 'meta_runs_10', cat: 'meta', kind: 'cumulative', target: 10, reward: 100, name: '도전자', desc: '누적 10회 원정 시도' },
  { id: 'meta_runs_100', cat: 'meta', kind: 'cumulative', target: 100, reward: 500, name: '불굴의 의지', desc: '누적 100회 원정 시도' },
  
  // === 황혼의 대장간 업적 ===
  { id: 'forge_first', cat: 'forge', kind: 'event', target: 1, reward: 30, name: '첫 단련', desc: '황혼의 대장간에서 첫 조합 시도' },
  { id: 'forge_recipe_3', cat: 'forge', kind: 'cumulative', target: 3, reward: 150, name: '초보 대장장이', desc: '레시피 3종 발견' },
  { id: 'forge_recipe_6', cat: 'forge', kind: 'cumulative', target: 6, reward: 250, name: '숙련 대장장이', desc: '레시피 6종 발견' },
  { id: 'forge_recipe_all', cat: 'forge', kind: 'cumulative', target: 12, reward: 500, name: '황혼의 대장장이', desc: '모든 레시피 12종 발견' },
  { id: 'forge_count_10', cat: 'forge', kind: 'cumulative', target: 10, reward: 100, name: '단련의 길', desc: '대장간 누적 조합 10회' },
  { id: 'forge_count_50', cat: 'forge', kind: 'cumulative', target: 50, reward: 500, name: '무한 단련', desc: '대장간 누적 조합 50회' },
  { id: 'forge_count_100', cat: 'forge', kind: 'cumulative', target: 100, reward: 1000, name: '단련 100회', desc: '대장간 누적 조합 100회' },
  { id: 'forge_count_200', cat: 'forge', kind: 'cumulative', target: 200, reward: 1000, name: '단련 200회', desc: '대장간 누적 조합 200회' },
  { id: 'forge_count_300', cat: 'forge', kind: 'cumulative', target: 300, reward: 1000, name: '단련 300회', desc: '대장간 누적 조합 300회' },
  { id: 'forge_count_400', cat: 'forge', kind: 'cumulative', target: 400, reward: 1000, name: '단련 400회', desc: '대장간 누적 조합 400회' },
  { id: 'forge_count_500', cat: 'forge', kind: 'cumulative', target: 500, reward: 1000, name: '단련 500회', desc: '대장간 누적 조합 500회' },
  
  // === 챔피언십 업적 ===
  // 북부 극지대 (frost) — 5개
  { id: 'champ_clear_frost_normal',  cat: 'champ', kind: 'oneshot', target: 1, reward: 50,  name: '북부 정복', desc: '북부 극지대 일반 클리어' },
  { id: 'champ_clear_frost_hard',    cat: 'champ', kind: 'oneshot', target: 1, reward: 100, name: '북부 강화', desc: '북부 극지대 하드 클리어' },
  { id: 'champ_clear_frost_hell',    cat: 'champ', kind: 'oneshot', target: 1, reward: 200, name: '북부 지옥', desc: '북부 극지대 지옥 클리어' },
  { id: 'champ_clear_frost_madness', cat: 'champ', kind: 'oneshot', target: 1, reward: 400, name: '북부 광기', desc: '북부 극지대 광기 클리어' },
  { id: 'champ_master_frost',        cat: 'champ', kind: 'oneshot', target: 1, reward: 500, name: '한기의 마스터', desc: '북부 극지대 모든 난이도 정복' },
  
  // 죽은자의 숲 (forest) — 5개
  { id: 'champ_clear_forest_normal',  cat: 'champ', kind: 'oneshot', target: 1, reward: 50,  name: '숲 정복', desc: '죽은자의 숲 일반 클리어' },
  { id: 'champ_clear_forest_hard',    cat: 'champ', kind: 'oneshot', target: 1, reward: 100, name: '숲 강화', desc: '죽은자의 숲 하드 클리어' },
  { id: 'champ_clear_forest_hell',    cat: 'champ', kind: 'oneshot', target: 1, reward: 200, name: '숲 지옥', desc: '죽은자의 숲 지옥 클리어' },
  { id: 'champ_clear_forest_madness', cat: 'champ', kind: 'oneshot', target: 1, reward: 400, name: '숲 광기', desc: '죽은자의 숲 광기 클리어' },
  { id: 'champ_master_forest',        cat: 'champ', kind: 'oneshot', target: 1, reward: 500, name: '광기의 마스터', desc: '죽은자의 숲 모든 난이도 정복' },
  
  // 봉인된 신전 (sanctum) — 5개
  { id: 'champ_clear_sanctum_normal',  cat: 'champ', kind: 'oneshot', target: 1, reward: 50,  name: '신전 정복', desc: '봉인된 신전 일반 클리어' },
  { id: 'champ_clear_sanctum_hard',    cat: 'champ', kind: 'oneshot', target: 1, reward: 100, name: '신전 강화', desc: '봉인된 신전 하드 클리어' },
  { id: 'champ_clear_sanctum_hell',    cat: 'champ', kind: 'oneshot', target: 1, reward: 200, name: '신전 지옥', desc: '봉인된 신전 지옥 클리어' },
  { id: 'champ_clear_sanctum_madness', cat: 'champ', kind: 'oneshot', target: 1, reward: 400, name: '신전 광기', desc: '봉인된 신전 광기 클리어' },
  { id: 'champ_master_sanctum',        cat: 'champ', kind: 'oneshot', target: 1, reward: 500, name: '봉인의 마스터', desc: '봉인된 신전 모든 난이도 정복' },
  
  // 마계의 균열 (rift) — 5개
  { id: 'champ_clear_rift_normal',  cat: 'champ', kind: 'oneshot', target: 1, reward: 50,  name: '균열 정복', desc: '마계의 균열 일반 클리어' },
  { id: 'champ_clear_rift_hard',    cat: 'champ', kind: 'oneshot', target: 1, reward: 100, name: '균열 강화', desc: '마계의 균열 하드 클리어' },
  { id: 'champ_clear_rift_hell',    cat: 'champ', kind: 'oneshot', target: 1, reward: 200, name: '균열 지옥', desc: '마계의 균열 지옥 클리어' },
  { id: 'champ_clear_rift_madness', cat: 'champ', kind: 'oneshot', target: 1, reward: 400, name: '균열 광기', desc: '마계의 균열 광기 클리어' },
  { id: 'champ_master_rift',        cat: 'champ', kind: 'oneshot', target: 1, reward: 500, name: '균열의 마스터', desc: '마계의 균열 모든 난이도 정복' },
  
  // 여명의 회랑 (dawn) — 5개
  { id: 'champ_clear_dawn_normal',  cat: 'champ', kind: 'oneshot', target: 1, reward: 50,  name: '회랑 정복', desc: '여명의 회랑 일반 클리어' },
  { id: 'champ_clear_dawn_hard',    cat: 'champ', kind: 'oneshot', target: 1, reward: 100, name: '회랑 강화', desc: '여명의 회랑 하드 클리어' },
  { id: 'champ_clear_dawn_hell',    cat: 'champ', kind: 'oneshot', target: 1, reward: 200, name: '회랑 지옥', desc: '여명의 회랑 지옥 클리어' },
  { id: 'champ_clear_dawn_madness', cat: 'champ', kind: 'oneshot', target: 1, reward: 400, name: '회랑 광기', desc: '여명의 회랑 광기 클리어' },
  { id: 'champ_master_dawn',        cat: 'champ', kind: 'oneshot', target: 1, reward: 500, name: '여명의 마스터', desc: '여명의 회랑 모든 난이도 정복' },
  
  // 종합 업적 (5원정 모두) — 마지막에 1번씩만 발동
  { id: 'champ_all_normal',  cat: 'champ', kind: 'cumulative', target: 5, reward: 1000, name: '챔피언십 입문',   desc: '모든 챔피언십 원정 일반 클리어' },
  { id: 'champ_all_hard',    cat: 'champ', kind: 'cumulative', target: 5, reward: 2000, name: '챔피언십 도전자', desc: '모든 챔피언십 원정 하드 클리어' },
  { id: 'champ_all_hell',    cat: 'champ', kind: 'cumulative', target: 5, reward: 3500, name: '챔피언십 지옥자', desc: '모든 챔피언십 원정 지옥 클리어' },
  { id: 'champ_all_madness', cat: 'champ', kind: 'cumulative', target: 5, reward: 5000, name: '챔피언십 정복자', desc: '모든 챔피언십 원정 광기 클리어' },
];
