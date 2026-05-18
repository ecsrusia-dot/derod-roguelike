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
    enemies: { normal: ['goblin', 'iceWolf'], elite: ['frostGiant'], boss: 'iceMage' },
  },
  {
    id: 'tutorial_market',
    name: '황혼의 시장',
    sub: 'The Twilight Market',
    desc: '상인과 대장장이가 모인 거리. 은화로 거래하고 유물을 단련하라.',
    nodeCount: 7,
    biome: 'tutorial',
    color: '#c46535',
    isTutorial: true,
    // 일직선 7노드 시퀀스: 준비 → 사건(은화 250) → 상점 → 사건(랜덤 유물) → 대장간 → 정비 → 보스
    // 사건/대장간 노드는 객체 형태로 추가 옵션 지정
    linearSequence: [
      { type: 'prep' },
      { type: 'event', forceEventId: 'tutorial_silver_grant' },
      { type: 'shop' },
      { type: 'event', forceEventId: 'tutorial_relic_grant' },
      {
        type: 'forge',
        tutorialForge: true,  // 진입 시 랜덤 유물 +1 (조합용 두 번째 유물)
        modalOverride: {
          desc: '유물 두 개를 희생해 더 강한 보상으로 단련합니다.',
          detail: '· 레시피 일치: 패시브 스킬 Lv +1\n· 레시피 불일치: 영혼 +50 (위로 보상)\n\n도감에서 레시피를 미리 모아 두면 도움이 됩니다.\n\n※ 튜토리얼 한정 — 이번 진입에 한해 랜덤 유물 1개를 추가 지급합니다.\n일반 원정의 대장간은 유물을 따로 주지 않으므로, 평소엔 보유 유물 2개 이상일 때만 사용 가능합니다.',
        },
      },
      { type: 'rest' },
      { type: 'boss' },
    ],
    enemies: { normal: ['goblin', 'iceWolf', 'tundraRaider'], elite: ['frostGiant'], boss: 'iceMage' },
  },
  {
    id: 'tutorial_branching',
    name: '갈림길의 시험',
    sub: 'The Trial of Crossroads',
    desc: '세 갈래 길이 가로지른다. 어디로 향하느냐에 따라 얻는 것이 달라진다.',
    nodeCount: 13,
    biome: 'tutorial',
    color: '#b48ad4',
    isTutorial: true,
    // 분기 시퀀스 — 다열 노드 구조
    // 레이어 0~1: 단일 / 레이어 2~4: 3열 / 레이어 5~6: 단일 (정비에서 합류)
    branchSequence: [
      {
        type: 'prep',
        modalOverride: {
          desc: '출정 전 활성화할 패시브·유물·액티브 스킬을 점검합니다.',
          detail: '이번 챕터는 분기 선택을 익히는 단계입니다.\n\n· 일반 맵에서 노드의 정체는 가려져 있고, 상점·대장간만 항상 공개됩니다.\n· 따라서 어느 갈래로 갈지 미리 길을 가늠해야 합니다.\n\n곧 만나는 사건에서 천리안 유물을 받게 됩니다. 천리안은 맵의 모든 노드를 미리 공개해 줍니다.',
        },
      },
      { type: 'event', forceEventId: 'tutorial_farsight_grant' },
      [{ type: 'battle' }, { type: 'battle' }, { type: 'battle' }],
      [
        { type: 'shop' },
        { type: 'event' },
        {
          type: 'forge',
          tutorialForge: true,  // 튜토리얼 한정 보너스 유물 1개 지급
          modalOverride: {
            desc: '유물 두 개를 희생해 더 강한 보상으로 단련합니다.',
            detail: '· 레시피 일치: 패시브 스킬 Lv +1\n· 레시피 불일치: 영혼 +50 (위로 보상)\n\n도감에서 레시피를 미리 모아 두면 도움이 됩니다.\n\n※ 튜토리얼 한정 — 이번 진입에 한해 랜덤 유물 1개를 추가 지급합니다.\n일반 원정의 대장간은 유물을 따로 주지 않으므로, 평소엔 보유 유물 2개 이상일 때만 사용 가능합니다.',
          },
        },
      ],
      [{ type: 'battle' }, { type: 'event' }, { type: 'battle' }],
      { type: 'rest' },
      { type: 'boss' },
    ],
    enemies: { normal: ['goblin', 'iceWolf', 'tundraRaider'], elite: ['frostGiant'], boss: 'iceMage' },
  },
  {
    id: 'tutorial_curse',
    name: '저주의 시련',
    sub: 'The Trial of Curses',
    desc: '강적과 마주할수록 어둠이 짙어진다. 난이도가 오를수록 늘어나는 저주를 직접 체험하라.',
    nodeCount: 6,
    biome: 'tutorial',
    color: '#8b1f1f',
    isTutorial: true,
    // 일직선 시퀀스: 준비 - 강적 - 강적+저주1 - 강적+저주2 - 정비 - 보스
    // addCurseId가 지정된 노드 진입 시 해당 저주가 누적됩니다.
    // 1.17.1 너프: elite 4→3 (저주 3단계 부패의 저주 노드 제거). 보스전 저주 2개로 진입.
    // 부패의 저주(회복-50%)가 rest 회복을 무력화시켜 보스(한기의 마녀 HP 320) 부담 과중하던 문제 해소.
    linearSequence: [
      {
        type: 'prep',
        modalOverride: {
          desc: '저주를 익히는 시련에 앞서, 준비를 마칩니다.',
          detail: '이번 챕터는 저주 시스템을 익히는 단계입니다.\n\n실제 원정·챔피언십에서는 난이도가 오를수록 저주 수가 늘어납니다.\n· 일반: 0개\n· 하드: 1개\n· 지옥: 2개\n· 광기: 3개\n\n앞으로 강적을 마주할 때마다 저주가 하나씩 추가됩니다. 누적 패널티를 직접 체감해 보세요.',
        },
      },
      {
        type: 'elite',
        modalOverride: {
          desc: '강적 — 저주 없는 기준 전투.',
          detail: '저주가 부여되지 않은 상태에서 강적과 한 번 맞붙습니다.\n\n이후 같은 강적이라도 저주가 어떻게 난이도를 흔드는지 비교해 보세요.',
        },
      },
      {
        type: 'elite',
        addCurseId: 'curse_fragility',
        modalOverride: {
          desc: '강적 · 저주 1단계 — 깨지기 쉬운 영혼.',
          detail: '이번 전투부터 저주 [깨지기 쉬운 영혼]이 활성화됩니다.\n· 받는 모든 데미지 +15%\n\n같은 강적이지만 한 발 한 발이 더 아프게 느껴질 것입니다.',
        },
      },
      {
        type: 'elite',
        addCurseId: 'curse_weakness',
        modalOverride: {
          desc: '강적 · 저주 2단계 — 약화의 저주 추가.',
          detail: '이번 전투부터 두 번째 저주가 함께 활성화됩니다.\n· [약화의 저주] 주는 모든 데미지 -15%\n\n버티는 데 더 오래 걸리고, 피해도 더 크게 받습니다. 누적되는 패널티의 무게를 느껴 보세요.',
        },
      },
      { type: 'rest' },
      { type: 'boss' },
    ],
    enemies: { normal: ['goblin', 'iceWolf', 'tundraRaider'], elite: ['frostGiant', 'wraith'], boss: 'iceMage' },
  },

  // === 기존 클래식 챕터 (수련의 길에서 사용) ===
  {
    id: 1, name: '북부 극지대', sub: 'The Northern Wastes',
    desc: '눈보라가 멈추지 않는 변경. 한기에 미친 약탈자들이 길을 막는다.',
    nodeCount: 20, biome: 'ice', color: '#7ba3c4',
    enemies: { normal: ['goblin', 'iceWolf', 'tundraRaider'], elite: ['frostGiant', 'wraith'], boss: 'iceMage' },
  },
  {
    id: 2, name: '죽은 자의 숲', sub: 'Forest of the Fallen',
    desc: '엘프의 옛 영토. 망자화된 황혼의 자녀들이 떠돈다.',
    nodeCount: 24, biome: 'forest', color: '#7a9a5e',
    enemies: { normal: ['fallenElf', 'shadowWolf', 'corruptSpider'], elite: ['forestSpirit', 'forestTyrant'], boss: 'twilightChild' },
  },
  {
    id: 3, name: '봉인된 신전', sub: 'The Sealed Sanctum',
    desc: '여명의 봉인이 깨어나는 곳. 시간이 뒤틀린다.',
    nodeCount: 28, biome: 'ruin', color: '#5c4a8c',
    enemies: { normal: ['timeKeeper', 'brokenGolem', 'sealMage'], elite: ['ancientPriest'], boss: 'oblivionSealer' },
  },
  {
    id: 4, name: '마계의 균열', sub: 'The Demon Rift',
    desc: '마왕의 군세가 쏟아지는 차원의 틈.',
    nodeCount: 32, biome: 'demon', color: '#8b1f1f',
    enemies: { normal: ['demonScout', 'wrathDemon', 'riftBreach'], elite: ['demonApostle'], boss: 'nakzelionShadow' },
  },
];

