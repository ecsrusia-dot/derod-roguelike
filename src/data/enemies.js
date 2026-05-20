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
  tundraRaider: {
    name: '동토의 약탈자', hp: 110, color: '#8b6f4d',
    desc: '한기에 미친 인간 야만전사. 옛 원정대를 약탈하며 살아남았다',
    tier: 'normal', chapter: 1,
    patterns: [
      { name: '얼어붙은 도끼', dmg: [14, 18], type: 'attack' },
      { name: '광폭한 돌진', dmg: [20, 26], type: 'attack', heavy: true },
      { name: '늑대 가죽 방어', dmg: [0, 0], type: 'defend', defense: 20 },
      { name: '빙결 회수', dmg: [10, 14], type: 'attack' },
    ],
    drop: { gold: [35, 55] },
  },
  wraith: {
    name: '극지의 망령', hp: 180, color: '#7ba3c4',
    desc: '얼음 속에 잠든 죽은 원정대의 영혼',
    tier: 'elite', chapter: 1,
    patterns: [
      { name: '얼음 손길', dmg: [18, 24], type: 'attack' },
      { name: '저주의 속삭임', dmg: [12, 16], type: 'attack' },
      { name: '망령의 가호', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [80, 120], gem: [2, 3] },
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
    name: '동상 거인', hp: 180, color: '#7ba3c4',
    desc: '동토의 거대 거인. 한 발자국마다 땅이 갈라진다',
    tier: 'elite', chapter: 1,
    patterns: [
      { name: '얼어붙은 주먹', dmg: [18, 24], type: 'attack' },
      { name: '한파', dmg: [14, 20], type: 'attack' },
      { name: '냉기 결계', dmg: [0, 0], type: 'defend', defense: 35 },
      { name: '눈사태', dmg: [30, 40], type: 'attack', heavy: true },
    ],
    drop: { gold: [70, 100], gem: [1, 2] },
  },
  iceMage: {
    name: '한기의 마녀', hp: 320, color: '#9ad4d4',
    desc: '북부 극지대의 진정한 지배자. 절대영도의 마법을 부린다',
    isBoss: true, tier: 'boss', chapter: 1,
    patterns: [
      { name: '얼음 창', dmg: [22, 28], type: 'attack' },
      { name: '눈보라', dmg: [28, 36], type: 'attack', heavy: true },
      { name: '서리 방벽', dmg: [0, 0], type: 'defend', defense: 45 },
      { name: '동결 저주', dmg: [16, 22], type: 'attack' },
      { name: '절대영도', dmg: [38, 50], type: 'attack', heavy: true },
    ],
    drop: { gold: [180, 250], gem: [4, 6] },
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
    desc: '여명의 봉인을 유지하는 마법사',
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
    desc: '여명의 봉인을 지키는 마지막 수호자',
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
    desc: '마왕의 분노가 형상화된 존재',
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
    desc: '마왕의 직속 사도',
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
    name: '마왕의 그림자', hp: 580, color: '#0a0608',
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
  champ_forest_leopard: {
    name: '굶주린 표범', hp: 90, color: '#6e8a4a',
    desc: '광기에 빠진 숲의 사냥꾼',
    tier: 'normal', chapter: 'forest_1',
    berserkPerTurn: 3,
    patterns: [
      { name: '광기의 발톱', dmg: [12, 16], type: 'attack' },
      { name: '으르렁대는 포효', dmg: [16, 22], type: 'attack', heavy: true },
      { name: '저자세 경계', dmg: [0, 0], type: 'defend', defense: 20 },
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
  champ_forest_tiger: {
    name: '광기의 호랑이', hp: 130, color: '#8a4e1e',
    desc: '숲의 정점에 군림하는 광기의 맹수',
    tier: 'elite', chapter: 'forest_1',
    berserkPerTurn: 4,  // 강적은 광폭 누적 빠름
    patterns: [
      { name: '광기의 송곳니', dmg: [14, 19], type: 'attack' },
      { name: '광기의 도약', dmg: [22, 28], type: 'attack', heavy: true },
      { name: '으르렁대는 자세', dmg: [0, 0], type: 'defend', defense: 32 },
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
      { name: '시든 자식 소환', dmg: [24, 32], type: 'attack', heavy: true },
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
      { name: '광기의 가호', dmg: [0, 0], type: 'defend', defense: 38 },
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
      { name: '부패 갑옷', dmg: [0, 0], type: 'defend', defense: 45 },
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
    name: '광기의 마녀', hp: 400, color: '#2d4a1c',
    desc: '광기의 정원 가장 깊은 곳에서 어둠의 비술을 완성한 마녀',
    isBoss: true, tier: 'boss', chapter: 'forest_3',
    berserkPerTurn: 9,
    patterns: [
      { name: '광기의 저주', dmg: [22, 28], type: 'attack' },
      { name: '광기의 만개', dmg: [16, 22], type: 'attack' },
      { name: '광기의 융단 폭격', dmg: [38, 50], type: 'attack', heavy: true },
      { name: '마녀의 결계', dmg: [0, 0], type: 'defend', defense: 55 },
    ],
    drop: { gold: [320, 420], gem: [7, 10] },
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
  champ_forest_minstrel: {
    name: '광기의 악사', hp: 110, color: '#6e5a3c',
    desc: '광기의 선율을 류트로 연주하는 광인',
    tier: 'normal', chapter: 'forest_3',
    berserkPerTurn: 5,
    patterns: [
      { name: '광기의 선율', dmg: [14, 18], type: 'attack' },
      { name: '광기의 화음', dmg: [20, 26], type: 'attack', heavy: true },
      { name: '광기의 자장가', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [60, 90] },
  },
  
  // === 챕터 4: 광기의 종막 (forest_4) — 극한 광폭 ===
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
      { name: '심부의 봉인', dmg: [22, 28], type: 'attack' },
      { name: '광기의 절대 폭주', dmg: [36, 48], type: 'attack', heavy: true },
      { name: '광기의 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_forest_boss4: {
    name: '광기의 종말 마에스트로', hp: 500, color: '#8a6db8',
    desc: '심부에 봉인된 광기의 종말 교향곡을 끊임없이 연주하는 광인 마에스트로',
    isBoss: true, tier: 'boss', chapter: 'forest_4',
    berserkPerTurn: 12,  // 최종 보스 — 매 턴 +12 누적
    patterns: [
      { name: '광기의 음', dmg: [22, 28], type: 'attack' },
      { name: '광기의 화음', dmg: [16, 22], type: 'attack' },
      { name: '광기의 협주곡', dmg: [32, 42], type: 'attack' },
      { name: '광기의 종지부', dmg: [44, 58], type: 'attack', heavy: true },
      { name: '광기의 무대', dmg: [0, 0], type: 'defend', defense: 65 },
    ],
    drop: { gold: [400, 520], gem: [10, 14] },
  },
  
  // ============================================================
  // === 챔피언십 — 봉인된 신전 (sanctum) ===
  // 컨셉: 봉인/제약 — 적이 플레이어 액티브 스킬(기본 스킬 제외) 1~2개 봉인 (1~3턴 차등)
  // 적 패턴에 seal: N, sealTurns: M 명시 시 플레이어 액티브 스킬 중 N개를 M턴 임시 봉인
  // 기본 스킬(cost 0, cd 0 — 참격·정밀사격·마법탄·신성광선·광폭참격)은 봉인 제외
  // 적 캐릭터성에 따라 차등: 사제·신탁자 = 적게 길게, 거인·폭군 = 적당히 짧게, 보스 = 많이 길게
  // ============================================================
  
  // === 챕터 1: 외곽 회랑 (sanctum_1) — 입문, 약한 봉인 ===
  champ_sanctum_acolyte: {
    name: '신전 봉인사', hp: 80, color: '#5c4a8c',
    desc: '봉인의 비술을 익히기 시작한 사도',
    tier: 'normal', chapter: 'sanctum_1',
    patterns: [
      { name: '봉인의 손길', dmg: [10, 14], type: 'attack', seal: 1, sealTurns: 1 },  // 약 봉인
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
      { name: '봉인의 저주', dmg: [8, 12], type: 'attack', seal: 2, sealTurns: 2 },  // 예언 = 미래 봉쇄
      { name: '예언 결계', dmg: [0, 0], type: 'defend', defense: 30 },
    ],
    drop: { gold: [40, 60] },
  },
  champ_sanctum_brute1: {
    name: '봉인된 거인', hp: 130, color: '#3a2a5c',
    desc: '한 때 영웅이었던 봉인된 거대 전사',
    tier: 'elite', chapter: 'sanctum_1',
    patterns: [
      { name: '봉인된 강타', dmg: [16, 22], type: 'attack', seal: 1, sealTurns: 2 },  // 단순 강력
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
      { name: '봉인의 의식', dmg: [10, 14], type: 'attack', seal: 2, sealTurns: 3 },  // 보스 의식 = 길게
      { name: '신전 분쇄', dmg: [24, 32], type: 'attack', heavy: true, seal: 1, sealTurns: 1 },
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
      { name: '봉인의 손길', dmg: [10, 14], type: 'attack', seal: 2, sealTurns: 1 },  // 수 많이, 짧게
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
      { name: '봉인 분쇄', dmg: [22, 28], type: 'attack', heavy: true, seal: 1, sealTurns: 2 },
      { name: '감시자 자세', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [55, 80] },
  },
  champ_sanctum_elite2: {
    name: '봉인의 화신', hp: 180, color: '#3a2a5c',
    desc: '봉인 그 자체가 형상을 갖춘 존재',
    tier: 'elite', chapter: 'sanctum_2',
    patterns: [
      { name: '봉인의 강타', dmg: [18, 24], type: 'attack', seal: 1, sealTurns: 2 },
      { name: '봉인 폭발', dmg: [24, 32], type: 'attack', heavy: true, seal: 2, sealTurns: 2 },
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
      { name: '봉인의 폭주', dmg: [12, 16], type: 'attack', seal: 2, sealTurns: 3 },  // 보스 = 많이 길게
      { name: '봉인 분쇄', dmg: [28, 38], type: 'attack', heavy: true, seal: 1, sealTurns: 2 },
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
      { name: '대사제의 강타', dmg: [18, 24], type: 'attack', seal: 2, sealTurns: 2 },
      { name: '봉인의 폭발', dmg: [24, 32], type: 'attack', heavy: true, seal: 1, sealTurns: 1 },
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
      { name: '봉인의 폭주', dmg: [10, 14], type: 'attack', seal: 1, sealTurns: 3 },  // 신탁자 = 적게 길게
      { name: '신탁 결계', dmg: [0, 0], type: 'defend', defense: 32 },
    ],
    drop: { gold: [60, 90] },
  },
  champ_sanctum_elite3: {
    name: '봉인의 폭군', hp: 230, color: '#3a2a5c',
    desc: '봉인을 무기로 휘두르는 신전의 폭군',
    tier: 'elite', chapter: 'sanctum_3',
    patterns: [
      { name: '폭군의 강타', dmg: [22, 28], type: 'attack', seal: 2, sealTurns: 2 },
      { name: '봉인 폭렬', dmg: [32, 42], type: 'attack', heavy: true, seal: 1, sealTurns: 1 },
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
      { name: '봉인의 절대 봉쇄', dmg: [16, 22], type: 'attack', seal: 2, sealTurns: 3 },  // 보스 = 많이 길게
      { name: '봉인 폭주', dmg: [38, 50], type: 'attack', heavy: true, seal: 2, sealTurns: 2 },
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
      { name: '화신의 손길', dmg: [18, 24], type: 'attack', seal: 2, sealTurns: 2 },
      { name: '봉인의 폭격', dmg: [26, 34], type: 'attack', heavy: true, seal: 1, sealTurns: 2 },
      { name: '봉인의 장막', dmg: [0, 0], type: 'defend', defense: 40 },
    ],
    drop: { gold: [80, 120] },
  },
  champ_sanctum_elite4: {
    name: '절대봉인의 사도', hp: 270, color: '#3a2a5c',
    desc: '절대봉인의 군주를 섬기는 어둠의 사도',
    tier: 'elite', chapter: 'sanctum_4',
    patterns: [
      { name: '사도의 일격', dmg: [22, 28], type: 'attack', seal: 2, sealTurns: 2 },
      { name: '절대봉인의 폭주', dmg: [36, 48], type: 'attack', heavy: true, seal: 2, sealTurns: 3 },
      { name: '봉인의 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_sanctum_boss4: {
    name: '절대봉인의 군주', hp: 500, color: '#3a2a5c',
    desc: '봉인된 신전 가장 깊은 곳에 봉인된 봉인의 신',
    isBoss: true, tier: 'boss', chapter: 'sanctum_4',
    patterns: [
      { name: '절대봉인의 강타', dmg: [22, 28], type: 'attack', seal: 2, sealTurns: 2 },
      { name: '절대봉인의 절규', dmg: [16, 22], type: 'attack', seal: 1, sealTurns: 3 },  // 적게 길게
      { name: '봉인의 절대 폭주', dmg: [32, 42], type: 'attack', seal: 2, sealTurns: 2 },
      { name: '절대봉인의 분쇄', dmg: [44, 58], type: 'attack', heavy: true, seal: 2, sealTurns: 3 },  // 최종 보스 = 많이 길게
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
  
  // === 챕터 4: 마왕의 영역 (rift_4) — 절대 폭딜 ===
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
    name: '절대 사도', hp: 270, color: '#3a0a0a',
    desc: '마왕을 섬기는 절대 사도',
    tier: 'elite', chapter: 'rift_4',
    patterns: [
      { name: '사도의 일격', dmg: [26, 34], type: 'attack', shock: 60 },
      { name: '절대 폭렬', dmg: [42, 56], type: 'attack', heavy: true, shock: 80 },
      { name: '마계의 방벽', dmg: [0, 0], type: 'defend', defense: 50 },
    ],
    drop: { gold: [140, 200], gem: [4, 6] },
  },
  champ_rift_boss4: {
    name: '마왕의 화신', hp: 540, color: '#3a0a0a',
    desc: '마계의 균열 가장 깊은 곳에 봉인된 마왕의 화신',
    isBoss: true, tier: 'boss', chapter: 'rift_4',
    patterns: [
      { name: '화신의 강타', dmg: [22, 28], type: 'attack', shock: 50 },
      { name: '마계의 절규', dmg: [16, 22], type: 'attack', shock: 80 },
      { name: '심부의 분노', dmg: [34, 44], type: 'attack', shock: 60 },
      { name: '마왕의 분쇄', dmg: [50, 64], type: 'attack', heavy: true, shock: 90 },  // 한 방에 충격 90
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

