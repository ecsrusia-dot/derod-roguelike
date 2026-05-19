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
    enemyHpMult: 0.9,        // 입문 — 한 두 턴 더 끌리도록 살짝 상향
    enemyDmgMult: 0.9,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 20,
    unlockId: null,
    isTutorial: true,
    forcedClassId: 0,        // 방랑검사 고정 (CLASSES 배열 인덱스)
    category: 'tutorial',
    tutorialOrder: 1,
  },
  // === 튜토리얼 2: 황혼의 시장 ===
  {
    id: 'tutorial_market',
    name: '황혼의 시장',
    sub: 'The Twilight Market',
    desc: '은화를 모으고 유물을 단련하라. 상점과 대장간을 익혀라.',
    color: '#c46535',
    chapters: ['tutorial_market'],
    enemyHpMult: 1.0,        // 상점·대장간 운영 가르치는 단계 — 기준값
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 30,
    unlockId: 'tutorial_basic_clear',     // 튜토리얼 1 클리어 후 해금
    isTutorial: true,
    forcedClassId: 0,
    category: 'tutorial',
    tutorialOrder: 2,
  },
  // === 튜토리얼 3: 갈림길의 시험 ===
  {
    id: 'tutorial_branching',
    name: '갈림길의 시험',
    sub: 'The Trial of Crossroads',
    desc: '세 갈래 길이 갈라진다. 어디로 향하느냐에 따라 얻는 것이 달라진다.',
    color: '#b48ad4',
    chapters: ['tutorial_branching'],
    enemyHpMult: 1.1,        // 분기 선택의 무게가 느껴지도록 약간 상향
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 40,
    unlockId: 'tutorial_market_clear',    // 튜토리얼 2 클리어 후 해금
    isTutorial: true,
    forcedClassId: 0,
    category: 'tutorial',
    tutorialOrder: 3,
  },
  // === 튜토리얼 4: 저주의 시련 ===
  {
    id: 'tutorial_curse',
    name: '저주의 시련',
    sub: 'The Trial of Curses',
    desc: '강적과 거듭 맞붙으며 저주가 한 단계씩 늘어난다. 난이도 곡선을 체감하라.',
    color: '#8b1f1f',
    chapters: ['tutorial_curse'],
    enemyHpMult: 1.6,        // 강적이 빨리 죽으면 저주 누적 체감 불가 — 큰 폭으로 상향
    enemyDmgMult: 1.2,       // 저주 1단계(받는 +15%)가 실제 위협이 되도록 기본 화력도 상향
    curseCount: 0,  // 시작 시 저주 없음. 노드 진입마다 누적됨.
    maxRelicSelect: 1,
    soulReward: 50,
    unlockId: 'tutorial_branching_clear',    // 튜토리얼 3 클리어 후 해금
    isTutorial: true,
    forcedClassId: 0,
    category: 'tutorial',
    tutorialOrder: 4,
  },

  // === 수련의 길 (5직업) — 챔피언십 해금 트리거 ===
  // 1.24.0~ 5개 수련 모두 튜토리얼 4 클리어 시 일괄 해금. 직업 자체는 처음부터 사용 가능하나
  // 챔피언십에서는 해당 직업의 수련 클리어가 사용 조건. unlocksClass 필드 제거 (deprecated).
  {
    id: 'training_wanderer',
    name: '방랑검사의 수련',
    sub: 'Path of the Wanderer',
    desc: '검을 마스터한다. 클리어 시 챔피언십에서 방랑검사 사용 가능.',
    color: '#c4453d',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'tutorial_curse_clear',
    category: 'training',
    forcedClassId: 0,
    unlocksChampionshipFor: 0,
  },
  {
    id: 'training_sage',
    name: '술법사의 수련',
    sub: 'Path of the Sage',
    desc: '주문을 연마한다. 클리어 시 챔피언십에서 술법사 사용 가능.',
    color: '#7ba3c4',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'tutorial_curse_clear',
    category: 'training',
    forcedClassId: 1,
    unlocksChampionshipFor: 1,
  },
  {
    id: 'training_demonblood',
    name: '혼혈 마족의 수련',
    sub: 'Path of the Demonblood',
    desc: '마성을 다스린다. 클리어 시 챔피언십에서 마족 사용 가능.',
    color: '#8b1f1f',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'tutorial_curse_clear',
    category: 'training',
    forcedClassId: 2,
    unlocksChampionshipFor: 2,
  },
  {
    id: 'training_elf',
    name: '엘프의 수련',
    sub: 'Path of the Elf',
    desc: '자연을 부린다. 클리어 시 챔피언십에서 엘프 사용 가능.',
    color: '#7a9a5e',
    chapters: [1, 2, 3, 4],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 80,
    unlockId: 'tutorial_curse_clear',
    category: 'training',
    forcedClassId: 3,
    unlocksChampionshipFor: 3,
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
    unlockId: 'tutorial_curse_clear',
    category: 'training',
    forcedClassId: 4,
    unlocksChampionshipFor: 4,
  },
  // === 무한모드: 황혼의 끝 ===
  // 보스 클리어해도 끝나지 않고 다음 챕터로 — 깊이가 깊어질수록 적 능력치 상향.
  // 죽을 때까지 도달한 깊이가 영혼 보상으로 환산.
  {
    id: 'endless_dusk',
    name: '황혼의 끝',
    sub: 'Endless Twilight',
    desc: '쓰러질 때까지 이어지는 영원의 도전. 깊이가 깊어질수록 적이 강해진다.',
    color: '#5c1a1a',
    chapters: [1, 2, 3, 4],
    endless: true,
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 3,
    soulReward: 0,   // 깊이 기반 보너스로 대체
    unlockId: 'tutorial_curse_clear',
    category: 'endless',
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
                normal: ['champ_forest_husk', 'champ_forest_leopard', 'champ_forest_dryad'],
                elite: ['champ_forest_tiger'],
                boss: 'champ_forest_boss1' 
              } },
  forest_2: { name: '망자의 길', sub: 'Path of the Fallen', biome: 'forest', color: '#7a9a5e',
              nodeCount: 22,
              enemies: { 
                normal: ['champ_forest_revenant', 'champ_forest_treant', 'champ_forest_leopard'],
                elite: ['champ_forest_elite2'],
                boss: 'champ_forest_boss2' 
              } },
  forest_3: { name: '광기의 정원', sub: 'Garden of Madness', biome: 'forest', color: '#7a9a5e',
              nodeCount: 24,
              enemies: {
                normal: ['champ_forest_chimera', 'champ_forest_minstrel', 'champ_forest_treant'],
                elite: ['champ_forest_elite3'],
                boss: 'champ_forest_witch'
              } },
  forest_4: { name: '심부의 폭군', sub: 'The Inner Tyrant', biome: 'forest', color: '#7a9a5e',
              nodeCount: 26,
              enemies: {
                normal: ['champ_forest_avatar', 'champ_forest_chimera', 'champ_forest_minstrel'],
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
  rift_4: { name: '마왕의 옥좌', sub: 'Throne of the Demon King', biome: 'demon', color: '#8b1f1f',
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


// 챔피언십 컨셉 ID 목록 (5컨셉 올 클리어 검사용)
export const CHAMPIONSHIP_EXP_IDS = ['frost', 'forest', 'sanctum', 'rift', 'dawn'];
