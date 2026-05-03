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

// =========== 패시브 스킬 ===========
// effect 필드는 문자열 키. 실제 동작은 메인 코드의 trigger handler에서 처리.
// minorEffect: Lv.1부터 매 Lv마다 누적되는 작은 효과
// tiers: Lv.3, 5, 7에 발현되는 마일스톤 효과
export const PASSIVE_SKILLS = {
  강타: {
    axis: 'attack', maxLv: 7, color: '#c4453d',
    desc: '공격 시 충격 게이지 누적, 100 도달 시 기절',
    minorEffect: { type: 'physDmg+', perLv: 2, desc: '물리 데미지 +2/Lv' },
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
    minorEffect: { type: 'magicDmg+', perLv: 4, desc: '마법 데미지 +4%/Lv' },
    tiers: {
      3: { text: '마법 데미지 추가 +25%', trigger: 'passive', effect: 'magicDmg+25' },
      5: { text: '에테르 비용 -1 (최소 0)', trigger: 'passive', effect: 'etherCost-20' },
      7: { text: '마법 공격 시 50% 확률로 재시전', trigger: 'passive', effect: 'magicEcho' }
    }
  },
  회피: {
    axis: 'defense', maxLv: 7, color: '#7a9a5e',
    desc: '회피율 증가',
    minorEffect: { type: 'dodge+', perLv: 3, desc: '회피율 +3%/Lv' },
    tiers: {
      3: { text: '회피 추가 +15%', trigger: 'passive', effect: 'dodge+15' },
      5: { text: '회피 시 50% 확률로 반격', trigger: 'onDodge', effect: 'counterAttack' },
      7: { text: '첫 피격 무효 (전투당 1회)', trigger: 'onCombatStart', effect: 'firstHitImmune' }
    }
  },
  수비: {
    axis: 'defense', maxLv: 7, color: '#7ba3c4',
    desc: '방어 게이지 강화',
    minorEffect: { type: 'startDef+', perLv: 5, desc: '시작 방어 +5/Lv' },
    tiers: {
      3: { text: '시작 방어 추가 +20', trigger: 'onCombatStart', effect: 'startDefense+20' },
      5: { text: '받는 모든 데미지 -15% (마법 포함)', trigger: 'passive', effect: 'dmgTaken-15' },
      7: { text: '방어 50% 이상일 때 받는 데미지 50% 차단', trigger: 'passive', effect: 'fortify' }
    }
  },
  재생: {
    axis: 'defense', maxLv: 7, color: '#9ad4a3',
    desc: '체력 회복',
    minorEffect: { type: 'maxHp+', perLv: 8, desc: '최대 체력 +8/Lv (영구)' },
    tiers: {
      3: { text: '매 턴 종료 시 HP +3', trigger: 'onTurnStart', effect: 'regenPerTurn' },
      5: { text: '전투 시작 시 HP 20% 회복', trigger: 'onCombatStart', effect: 'heal20%' },
      7: { text: 'HP 30% 이하 시 전투당 1회 부활', trigger: 'onLethal', effect: 'revive' }
    }
  },
  가속: {
    axis: 'utility', maxLv: 7, color: '#e8b04a',
    desc: '추가 행동',
    minorEffect: { type: 'cdReduce+', perLv: 1, desc: '쿨다운 -1턴 (Lv.4마다 누적)' },
    tiers: {
      3: { text: '5턴마다 추가 턴 획득', trigger: 'onTurnStart', effect: 'extraTurn', interval: 5 },
      5: { text: '4턴마다 추가 턴', trigger: 'onTurnStart', effect: 'extraTurn', interval: 4 },
      7: { text: '3턴마다 추가 턴', trigger: 'onTurnStart', effect: 'extraTurn', interval: 3 }
    }
  },
  심안: {
    axis: 'utility', maxLv: 7, color: '#7ba3c4',
    desc: '시야와 인지',
    minorEffect: { type: 'accuracy+', perLv: 2, desc: '명중률 +2%/Lv' },
    tiers: {
      3: { text: '회피 불가 적에게도 50% 회피 가능', trigger: 'passive', effect: 'pierceDodge' },
      5: { text: '함정 탐지율 +100%', trigger: 'passive', effect: 'trapDetect' },
      7: { text: '미지 노드 정보 사전 공개', trigger: 'passive', effect: 'revealNodes' }
    }
  },
  신앙: {
    axis: 'utility', maxLv: 7, color: '#d4a574',
    desc: '신의 가호',
    minorEffect: { type: 'allStats+', perLv: 1, desc: '모든 능력치 +1/Lv' },
    tiers: {
      3: { text: '5턴마다 다음 공격 치명타 확정', trigger: 'onTurnStart', effect: 'guaranteeCrit', interval: 5 },
      5: { text: '치명적 피격 30% 회피', trigger: 'onLethal', effect: 'divineSave' },
      7: { text: '수신사 등극 - 신탁 마법', trigger: 'passive', effect: 'oracleUser' }
    }
  },
  운명: {
    axis: 'utility', maxLv: 7, color: '#5c4a8c',
    desc: '데로드/데블랑 게이지',
    minorEffect: { type: 'rewardChoice+', perLv: 1, desc: '보상 시 추가 보석 +1/Lv' },
    tiers: {
      3: { text: '보석 리롤 비용 -1', trigger: 'passive', effect: 'rerollDiscount' },
      5: { text: '보상 1회 추가 (3중1 → 4중1)', trigger: 'passive', effect: 'extraReward' },
      7: { text: '운명 카드 1회 재선택', trigger: 'passive', effect: 'fateReroll' }
    }
  },
};

// =========== 직업 ===========
// locked: true인 직업은 메타 강화로 해금
export const CLASSES = [
  {
    id: 'lanthert', name: '방랑검사', sub: 'Lanthert Path',
    desc: '시력을 잃었던 검사. 어둠 속에서도 검을 뻗는다.',
    startSkills: { 강타: 3, 심안: 2 },
    stats: { 근력: 16, 민첩: 15, 지능: 14, 매력: 11 },
    combatSkills: ['참격', '관통', '수비'],
    color: '#c4453d',
    locked: false,
  },
  {
    id: 'sage', name: '술법사', sub: 'Sorcerer of Tour',
    desc: '정념계 마법을 익힌 자. 신과 정령의 힘을 빌린다.',
    startSkills: { 마력: 3, 신앙: 2 },
    stats: { 근력: 8, 민첩: 11, 지능: 18, 매력: 14 },
    combatSkills: ['마법탄', '정념폭발', '결계'],
    color: '#5c4a8c',
    locked: false,
  },
  {
    id: 'demonblood', name: '마족 혼혈', sub: 'Demon Heritage',
    desc: '나크젤리온의 피가 흐르는 자. 분노가 곧 힘이 된다.',
    startSkills: { 잔혹: 3, 강타: 1 },
    stats: { 근력: 17, 민첩: 13, 지능: 13, 매력: 9 },
    combatSkills: ['광폭참격', '피의 일격', '광기'],
    color: '#8b1f1f',
    locked: false,
  },
  {
    id: 'elf', name: '숲의 정령사', sub: 'Elf of Twilight',
    desc: '엘프 종족. 숲의 정령과 교감하며 활을 다룬다.',
    startSkills: { 회피: 3, 정밀: 2 },
    stats: { 근력: 11, 민첩: 18, 지능: 14, 매력: 15 },
    combatSkills: ['정밀사격', '연속화살', '바람결계'],
    color: '#7a9a5e',
    locked: false,
  },
  {
    id: 'priest', name: '데로드의 사제', sub: 'Priest of Derod',
    desc: '데로드의 가호를 받은 자. 회복과 가호로 동료를 살린다.',
    startSkills: { 신앙: 3, 재생: 2 },
    stats: { 근력: 9, 민첩: 11, 지능: 15, 매력: 17 },
    combatSkills: ['신성광선', '축복', '가호'],
    color: '#d4a574',
    locked: true,  // 메타 강화로 해금
    unlockId: 'unlock_priest',  // 해금 ID
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
  참격: { name: '참격', cost: 0, cd: 0, type: 'physical', baseDmg: [18, 24], desc: '기본 검 공격' },
  관통: { name: '관통', cost: 1, cd: 2, type: 'physical', baseDmg: [30, 38], desc: '방어 무시', pierce: true },
  수비: { name: '수비', cost: 0, cd: 0, type: 'defense', defense: 30, desc: '방어 +30' },
  // 술법사
  마법탄: { name: '마법탄', cost: 0, cd: 0, type: 'magic', baseDmg: [16, 22], desc: '기본 마법' },
  정념폭발: { name: '정념폭발', cost: 2, cd: 3, type: 'magic', baseDmg: [40, 50], desc: '강력한 마법' },
  결계: { name: '결계', cost: 1, cd: 0, type: 'defense', defense: 40, desc: '방어 +40' },
  // 마족 혼혈
  광폭참격: { name: '광폭참격', cost: 0, cd: 0, type: 'physical', baseDmg: [20, 28], desc: 'HP 낮을수록 ↑', berserker: true },
  '피의 일격': { name: '피의 일격', cost: 1, cd: 2, type: 'physical', baseDmg: [25, 32], desc: '자해+출혈', selfDmg: 10, forceBleed: true },
  광기: { name: '광기', cost: 0, cd: 4, type: 'buff', buff: 'rage', desc: '3턴 데미지+30%' },
  // 정령사
  정밀사격: { name: '정밀사격', cost: 0, cd: 0, type: 'physical', baseDmg: [16, 22], desc: '기본 활 공격' },
  연속화살: { name: '연속화살', cost: 1, cd: 2, type: 'physical', baseDmg: [12, 16], hitCount: 3, desc: '3연발' },
  바람결계: { name: '바람결계', cost: 1, cd: 0, type: 'defense', defense: 25, desc: '방어+회피', dodgeBuff: 20 },
  // 데로드의 사제
  신성광선: { name: '신성광선', cost: 0, cd: 0, type: 'magic', baseDmg: [14, 20], desc: '신성 데미지+자가 회복 5', selfHeal: 5 },
  축복: { name: '축복', cost: 1, cd: 3, type: 'buff', buff: 'rage', desc: '2턴 데미지+30% (분노 효과)' },
  가호: { name: '가호', cost: 1, cd: 0, type: 'defense', defense: 35, desc: '방어 +35, HP 회복 +10', selfHeal: 10 },
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
};

// =========== 챕터 ===========
// enemies: 챕터에서 등장하는 적 풀
//   - normal: 일반 노드에서 등장
//   - elite: 강적 노드에서 등장
//   - boss: 보스 노드에서 등장 (1마리)
export const CHAPTERS = [
  {
    id: 1, name: '북부 극지대', sub: 'The Northern Wastes',
    desc: '눈보라가 멈추지 않는 변경. 마족의 첩자들이 잠복한다.',
    nodeCount: 8, biome: 'ice', color: '#7ba3c4',
    enemies: { normal: ['goblin', 'iceWolf'], elite: ['cultist'], boss: 'wraith' },
  },
  {
    id: 2, name: '죽은 자의 숲', sub: 'Forest of the Fallen',
    desc: '엘프의 옛 영토. 망자화된 황혼의 자녀들이 떠돈다.',
    nodeCount: 10, biome: 'forest', color: '#7a9a5e',
    enemies: { normal: ['fallenElf'], elite: ['forestSpirit'], boss: 'twilightChild' },
  },
  {
    id: 3, name: '봉인된 신전', sub: 'The Sealed Sanctum',
    desc: '엘디마이어의 파편이 깨어나는 곳. 시간이 뒤틀린다.',
    nodeCount: 12, biome: 'ruin', color: '#5c4a8c',
    enemies: { normal: ['cultist'], elite: ['forestSpirit'], boss: 'wraith' },
  },
  {
    id: 4, name: '마계의 균열', sub: 'The Demon Rift',
    desc: '나크젤리온의 군세가 쏟아지는 차원의 틈.',
    nodeCount: 12, biome: 'demon', color: '#8b1f1f',
    enemies: { normal: ['cultist'], elite: ['forestSpirit'], boss: 'twilightChild' },
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
    title: '눈 속의 행상',
    text: '눈보라 속에서 등이 굽은 노인이 손짓한다. 그의 마차에는 낡은 유물들이 가득하다.\n"용감한 자여, 내 물건을 보겠는가?"',
    chapter: [1, 2, 3, 4],
    choices: [
      {
        text: '거래에 응한다 (은화 50)',
        cost: { gold: 50 },
        result: '낡은 부적이 손에 쥐어진다.',
        reward: { type: 'random_relic' }
      },
      {
        text: '의심스럽다, 떠난다',
        result: '노인의 시선을 등 뒤로 한다.',
        reward: null
      },
      {
        text: '강제로 빼앗는다 (매력 검정)',
        stat: '매력', dc: 13,
        success: { text: '노인의 정신을 흔든다. 짐을 챙겨 달아난다.', reward: { type: 'gold', value: 80 } },
        fail: { text: '노인이 뼈를 드러낸다. 망자였다!', combat: 'cultist', penalty: { hp: -30 } }
      },
    ],
  },
  {
    id: 'shrine',
    title: '버려진 신전',
    text: '얼어붙은 돌계단 위에 작은 신전. 데로드의 표식이 새겨져 있다.\n무언가가 당신을 부르는 듯하다.',
    chapter: [1, 2, 3],
    choices: [
      {
        text: '기도를 올린다 (지능 검정)',
        stat: '지능', dc: 14,
        success: { text: '데로드의 가호가 손에 깃든다.', reward: { type: 'skill_random_lv', axis: 'utility' } },
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
        reward: { type: 'skill_random_lv', axis: 'utility' }
      },
      {
        text: '장비를 챙긴다',
        result: '낡았지만 쓸만한 장비.',
        reward: { type: 'gold', value: 40 }
      },
      {
        text: '경의를 표한다 (매력)',
        stat: '매력', dc: 12,
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
  // === 추가 사건은 여기에 자유롭게 추가 ===
];

// =========== 유물 ===========
// skillBonus: { 패시브이름: +Lv수 } - 획득 시 해당 패시브 자동 강화
export const RELICS = [
  { name: '레카르도의 검편', skillBonus: { 정밀: 2 }, weight: 5, color: '#c4c4d4' },
  { name: '네잎 클로버', skillBonus: { 회피: 2 }, weight: 5, color: '#7a9a5e' },
  { name: '마족의 발톱', skillBonus: { 잔혹: 2 }, weight: 5, color: '#8b1f1f' },
  { name: '수신사의 가면', skillBonus: { 신앙: 2 }, weight: 5, color: '#d4a574' },
  { name: '명검 로비아의 파편', skillBonus: { 강타: 2 }, weight: 4, color: '#e8b04a' },
  { name: '에테르의 결정', skillBonus: { 마력: 2 }, weight: 4, color: '#5c4a8c' },
  // === 추가 유물 예시 (필요 시 활성화) ===
  // { name: '시간의 모래시계', skillBonus: { 가속: 2 }, weight: 3, color: '#e8b04a' },
  // { name: '대지의 심장', skillBonus: { 재생: 2 }, weight: 4, color: '#9ad4a3' },
  // { name: '수호의 방패', skillBonus: { 수비: 2 }, weight: 4, color: '#7ba3c4' },
];

// =========== 보상 풀 ===========
// 가중치 기반 랜덤 추출. 가중치가 클수록 더 자주 등장.
// 이 함수는 PASSIVE_SKILLS와 RELICS를 합쳐 동적으로 풀을 생성합니다.
export function buildRewardPool() {
  return [
    // 패시브 스킬 (모든 종)
    ...Object.keys(PASSIVE_SKILLS).map(name => ({ type: 'skill', name, weight: 28 })),
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
    // 유물 (RELICS에서 자동 추가)
    ...RELICS.map(r => ({ type: 'relic', ...r })),
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
  rerollCost: 3,
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
      desc: '마법 공격 시 30% 확률로 쿨다운 1턴 감소 + 에테르 +1.',
      effect: 'ult_timeRewind',
      color: '#5c4a8c',
    },
    {
      id: '마력_정념폭주',
      name: '정념 폭주',
      desc: '마법 데미지 ×1.5, 모든 마법 스킬 쿨다운 -1.',
      effect: 'ult_aetherStorm',
      color: '#5c4a8c',
    },
    {
      id: '마력_신탁각성',
      name: '신탁 각성',
      desc: '마법 공격 시 100% 재시전 (마력 Lv.7 50% 대체).',
      effect: 'ult_oracleAwaken',
      color: '#5c4a8c',
    },
  ],
  신앙: [
    {
      id: '신앙_데로드의축복',
      name: '데로드의 축복',
      desc: '매 턴 HP +5, 모든 회복 효과 +50%.',
      effect: 'ult_derodBlessing',
      color: '#d4a574',
    },
    {
      id: '신앙_데블랑의저주',
      name: '데블랑의 저주',
      desc: '받는 데미지 -25%. 적 공격 시 30% 확률로 적이 자해.',
      effect: 'ult_deblanCurse',
      color: '#5c4a8c',
    },
    {
      id: '신앙_운명의저울',
      name: '운명의 저울',
      desc: '치명적 피격 시 100% 회피 (전투당 2회). 모든 능력치 +5.',
      effect: 'ult_destinyScale',
      color: '#d4a574',
    },
  ],
  // === 다른 패시브의 궁극은 향후 콘텐츠 확장에서 추가 ===
  // (정밀, 회피, 수비, 재생, 가속, 심안, 운명)
  // 위 4개 패시브는 핵심 빌드 축이라 우선 구현. 나머지는 일반 Lv.7 효과로 충분.
};

// =========== 원정 (Expedition) ===========
// 원정 = 4챕터 묶음 (한 던전). 클리어 시 다음 원정 해금.
// 새 원정은 능력치 배율 + 저주 시스템으로 난이도 상승.
// maxRelicSelect: 첫 노드(전투 준비)에서 활성화 가능한 유물 개수
export const EXPEDITIONS = [
  {
    id: 1,
    name: '북부 원정',
    sub: 'The Northern Expedition',
    desc: '얼어붙은 변경에서 마계의 균열까지. 첫 시련.',
    color: '#7ba3c4',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,    // 활성 유물 1개
    soulReward: 30,
    unlockId: null,
  },
  {
    id: 2,
    name: '심연의 원정',
    sub: 'Expedition of the Abyss',
    desc: '같은 길, 더 깊은 어둠. 적은 강해지고 저주가 깃든다.',
    color: '#5c4a8c',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.3,
    enemyDmgMult: 1.2,
    curseCount: 1,
    maxRelicSelect: 2,    // 활성 유물 2개
    soulReward: 60,
    unlockId: 'unlock_expedition_2',
    unlockCost: 200,
  },
  {
    id: 3,
    name: '광기의 원정',
    sub: 'Expedition of Madness',
    desc: '정신이 무너지기 시작한다. 적은 더 강하고 저주는 두 겹이다.',
    color: '#8b1f1f',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.6,
    enemyDmgMult: 1.4,
    curseCount: 2,
    maxRelicSelect: 3,    // 활성 유물 3개
    soulReward: 120,
    unlockId: 'unlock_expedition_3',
    unlockCost: 500,
  },
  {
    id: 4,
    name: '망각의 원정',
    sub: 'Expedition of Oblivion',
    desc: '존재의 끝. 모든 적이 강적이고, 저주는 세 겹이다.',
    color: '#0a0608',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 2.0,
    enemyDmgMult: 1.6,
    curseCount: 3,
    maxRelicSelect: 4,    // 활성 유물 4개
    eliteRatio: 0.5,
    soulReward: 250,
    unlockId: 'unlock_expedition_4',
    unlockCost: 1000,
  },
];

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
    maxStacks: 10,
    cost: (stack) => 10 + stack * 5,  // 10, 15, 20, 25, ... 75
    effect: 'startHp+10',
    color: '#9ad4a3',
  },
  {
    id: 'meta_startGold',
    name: '풍요의 축복',
    desc: '시작 은화 +20',
    category: 'resource',
    stackable: true,
    maxStacks: 8,
    cost: (stack) => 5 + stack * 3,
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
    cost: (stack) => 15 + stack * 8,
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
    cost: (stack) => 50 + stack * 50,
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
    maxStacks: 5,
    cost: (stack) => 50 + stack * 20,
    effect: 'startSkill+1',
    color: '#c4453d',
  },
  {
    id: 'meta_startRelic',
    name: '신탁의 유물',
    desc: '시작 시 무작위 유물 +1',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 30 + stack * 30,
    effect: 'startRelic+1',
    color: '#e8b04a',
  },
  {
    id: 'meta_dmgDealt',
    name: '강자의 길',
    desc: '주는 모든 데미지 +5%',
    category: 'combat',
    stackable: true,
    maxStacks: 4,
    cost: (stack) => 40 + stack * 30,
    effect: 'dmgDealt+5%',
    color: '#c4453d',
  },
  {
    id: 'meta_dmgTaken',
    name: '강철의 의지',
    desc: '받는 모든 데미지 -3%',
    category: 'combat',
    stackable: true,
    maxStacks: 4,
    cost: (stack) => 50 + stack * 40,
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
    cost: (stack) => 30 + stack * 25,
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
    cost: (stack) => 80 + stack * 60,
    effect: 'chapterHeal+10%',
    color: '#9ad4a3',
  },
  {
    id: 'meta_rerollDiscount',
    name: '운명의 손길',
    desc: '리롤 비용 -1 보석',
    category: 'expedition',
    stackable: false,
    cost: () => 200,
    effect: 'reroll-1',
    color: '#5c4a8c',
  },
  {
    id: 'meta_extraReward',
    name: '풍성한 보상',
    desc: '보상 3중1 → 4중1',
    category: 'expedition',
    stackable: false,
    cost: () => 300,
    effect: 'reward+1',
    color: '#e8b04a',
  },
  
  // === 해금 ===
  {
    id: 'unlock_priest',
    name: '데로드의 사제 해금',
    desc: '새 직업 "데로드의 사제" 사용 가능',
    category: 'unlock',
    stackable: false,
    cost: () => 100,
    effect: 'unlock_priest',
    color: '#d4a574',
  },
  {
    id: 'unlock_expedition_2',
    name: '심연의 원정 해금',
    desc: '2번째 원정 사용 가능 (원정 1 클리어 필요)',
    category: 'unlock',
    stackable: false,
    cost: () => 200,
    requirePriorClear: 1,  // 원정 1 클리어 필요
    effect: 'unlock_expedition_2',
    color: '#5c4a8c',
  },
  {
    id: 'unlock_expedition_3',
    name: '광기의 원정 해금',
    desc: '3번째 원정 사용 가능 (원정 2 클리어 필요)',
    category: 'unlock',
    stackable: false,
    cost: () => 500,
    requirePriorClear: 2,
    effect: 'unlock_expedition_3',
    color: '#8b1f1f',
  },
  {
    id: 'unlock_expedition_4',
    name: '망각의 원정 해금',
    desc: '4번째 원정 사용 가능 (원정 3 클리어 필요)',
    category: 'unlock',
    stackable: false,
    cost: () => 1000,
    requirePriorClear: 3,
    effect: 'unlock_expedition_4',
    color: '#0a0608',
  },
];

// =========== 영혼 (Soul) 획득량 ===========
export const SOUL_REWARDS = {
  normalKill: 1,         // 일반 적 처치
  eliteKill: 3,          // 강적 처치
  bossKill: [5, 8, 12, 20],  // 챕터별 보스 처치
  chapterClear: [5, 10, 15, 20],  // 챕터별 클리어 보너스
  deathPenalty: 0.7,     // 사망 시 누적량의 70%만 획득
  rerollCost: 1,         // 제단 새로고침 비용
  altarSlots: 3,         // 제단 등장 강화 개수
};
