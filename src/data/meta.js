// =========== 메타 강화 (영혼의 제단) ===========
// stackable: true는 단계별 누적 / false는 1회성 해금
// 매번 제단 입장 시 풀에서 랜덤 3개 등장 (canPurchaseUpgrade 통과 항목만)
// 1.44.2 재설계: 자원 균일화(×20) + 전투 강화 확장(7개) + 챔피언십 4난이도 분할 + rerollDiscount 폐기
export const META_UPGRADES = [
  // === 자원 강화 (4) ===
  {
    id: 'meta_startHp',
    name: '강인한 시작',
    desc: '시작 HP +10',
    category: 'resource',
    stackable: true,
    maxStacks: 20,
    cost: (stack) => 50 + stack * 50,  // 50→1000, 합 10,500
    effect: 'startHp+10',
    color: '#9ad4a3',
  },
  {
    id: 'meta_startGold',
    name: '풍요의 축복',
    desc: '시작 은화 +10',
    category: 'resource',
    stackable: true,
    maxStacks: 20,
    cost: (stack) => 50 + stack * 50,  // 50→1000, 합 10,500
    effect: 'startGold+10',
    color: '#d4a574',
  },
  {
    id: 'meta_startGem',
    name: '명상의 결정',
    desc: '시작 보석 +2',
    category: 'resource',
    stackable: true,
    maxStacks: 20,
    cost: (stack) => 50 + stack * 50,  // 50→1000, 합 10,500
    effect: 'startGem+2',
    color: '#7ba3c4',
  },
  {
    id: 'meta_startRelic',
    name: '신탁의 유물',
    desc: '시작 시 무작위 유물 +1',
    category: 'resource',
    stackable: true,
    maxStacks: 2,
    cost: (stack) => stack === 0 ? 1000 : 2000,  // 1000, 2000, 합 3,000
    effect: 'startRelic+1',
    color: '#e8b04a',
  },

  // === 전투 강화 (7) ===
  {
    id: 'meta_maxEther',
    name: '에테르의 그릇',
    desc: '최대 에테르 +1',
    category: 'combat',
    stackable: true,
    maxStacks: 2,
    cost: (stack) => stack === 0 ? 1500 : 3000,  // 1500, 3000, 합 4,500
    effect: 'maxEther+1',
    color: '#5c4a8c',
  },
  {
    id: 'meta_dmgDealt',
    name: '강자의 길',
    desc: '주는 모든 데미지 +2%',
    category: 'combat',
    stackable: true,
    maxStacks: 10,
    cost: (stack) => 700 + stack * 100,  // 700→1600, 합 11,500
    effect: 'dmgDealt+2%',
    color: '#c4453d',
  },
  {
    id: 'meta_dmgTaken',
    name: '강철의 의지',
    desc: '받는 모든 데미지 -2%',
    category: 'combat',
    stackable: true,
    maxStacks: 10,
    cost: (stack) => 700 + stack * 100,  // 700→1600, 합 11,500
    effect: 'dmgTaken-2%',
    color: '#7ba3c4',
  },
  {
    id: 'meta_critRate',
    name: '예리한 감각',
    desc: '치명타율 +2%',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 1500 + stack * 300,  // 1500→2700, 합 10,500
    effect: 'critRate+2%',
    color: '#d4a574',
  },
  {
    id: 'meta_dodgeRate',
    name: '유연한 그림자',
    desc: '회피율 +2%',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 1500 + stack * 300,  // 1500→2700, 합 10,500
    effect: 'dodgeRate+2%',
    color: '#9aa8c4',
  },
  {
    id: 'meta_critDmg',
    name: '절명의 각인',
    desc: '치명타 데미지 +5%',
    category: 'combat',
    stackable: true,
    maxStacks: 5,
    cost: (stack) => 1500 + stack * 300,  // 1500→2700, 합 10,500
    effect: 'critDmg+5%',
    color: '#c4774a',
  },
  {
    id: 'meta_startDefense',
    name: '선견의 강철',
    desc: '전투 시작 시 방어 +5',
    category: 'combat',
    stackable: true,
    maxStacks: 10,
    cost: (stack) => 700 + stack * 100,  // 700→1600, 합 11,500
    effect: 'startDefense+5',
    color: '#5c8c7a',
  },

  // === 원정 강화 (2) ===
  // 1.44.2 폐기: meta_rerollDiscount (운명의 손길) — 효과 키 'reroll-1'이 코드에 적용 안 되던 죽은 항목. 환불 처리.
  {
    id: 'meta_chapterHeal',
    name: '여정의 가호',
    desc: '챕터 클리어 시 HP 회복 +10%',
    category: 'expedition',
    stackable: true,
    maxStacks: 3,
    cost: (stack) => 1000 + stack * 1000,  // 1000, 2000, 3000, 합 6,000
    effect: 'chapterHeal+10%',
    color: '#9ad4a3',
  },
  {
    id: 'meta_extraReward',
    name: '풍성한 보상',
    desc: '보상 3중1 → 4중1 (첫 보상만)',
    category: 'expedition',
    stackable: false,
    cost: () => 800,
    effect: 'reward+1',
    color: '#e8b04a',
  },

  // === 챔피언십 메타 강화 (4난이도, 조건부 해금) ===
  // 1.44.2 재설계: 효과 통일 (시작 HP·은화), 4난이도 신설 (normal/hard/hell/madness)
  {
    id: 'meta_champion_normal',
    name: '도전자의 영혼',
    desc: '시작 HP +10, 시작 은화 +10 (5원정 일반 전 클리어)',
    category: 'champion',
    stackable: false,
    cost: () => 3000,
    requireChampionshipAll: 'normal',
    effect: 'champion_normal',
    color: '#d4a574',
  },
  {
    id: 'meta_champion_hard',
    name: '용맹의 영혼',
    desc: '시작 HP +15, 시작 은화 +15 (5원정 하드 전 클리어)',
    category: 'champion',
    stackable: false,
    cost: () => 6000,
    requireChampionshipAll: 'hard',
    effect: 'champion_hard',
    color: '#c47a45',
  },
  {
    id: 'meta_champion_hell',
    name: '지옥의 영혼',
    desc: '시작 HP +20, 시작 은화 +20 (5원정 지옥 전 클리어)',
    category: 'champion',
    stackable: false,
    cost: () => 9000,
    requireChampionshipAll: 'hell',
    effect: 'champion_hell',
    color: '#c4453d',
  },
  {
    id: 'meta_champion_madness',
    name: '광기의 영혼',
    desc: '시작 HP +25, 시작 은화 +25 (5원정 광기 전 클리어)',
    category: 'champion',
    stackable: false,
    cost: () => 10000,
    requireChampionshipAll: 'madness',
    effect: 'champion_madness',
    color: '#a02828',
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

// =========== 일일 임무 (1.72.0~) ===========
// 매일 KST 자정 리셋. 완료 즉시 영혼 자동 지급 (수령 버튼 없음).
// 진행/완료 상태는 meta.dailyMissions = { date, progress, claimed } (storage.js)
export const DAILY_MISSIONS = [
  { id: 'dm_kill10', name: '사냥꾼의 하루', desc: '적 10마리 처치', target: 10, reward: 30 },
  { id: 'dm_elite3', name: '강적 토벌', desc: '강적 3마리 처치', target: 3, reward: 40 },
  { id: 'dm_clear1', name: '원정의 완수', desc: '원정 1회 클리어', target: 1, reward: 50 },
];

// =========== 도감 발견 보너스 (1.72.0~) ===========
// 신규 발견 1건당 +5 영혼, 카테고리 전체 완성 시 +100 영혼 (1회)
export const CODEX_DISCOVERY_REWARD = 5;
export const CODEX_COMPLETE_REWARD = 100;

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
    name: '상인과 대장장이', desc: '튜토리얼 - 황혼의 시장 클리어' },
  { id: 'clear_tutorial_branching', cat: 'tutorial', kind: 'first', target: 1, reward: 100,
    name: '갈림길을 가르는 자', desc: '튜토리얼 - 갈림길의 시험 클리어' },
  { id: 'clear_tutorial_curse', cat: 'tutorial', kind: 'first', target: 1, reward: 120,
    name: '저주를 견딘 자', desc: '튜토리얼 - 저주의 시련 클리어' },

  // === 수련의 길 클리어 업적 (5직업) ===
  // 보상: 직업 순서대로 100/150/200/250/300
  { id: 'clear_training_wanderer', cat: 'training', class: 'wanderer', kind: 'first', target: 1, reward: 100,
    name: '검의 수련자', desc: '방랑검사의 수련 클리어 — 챔피언십 방랑검사 해금' },
  { id: 'clear_training_sage', cat: 'training', class: 'sage', kind: 'first', target: 1, reward: 150,
    name: '주문의 수련자', desc: '술법사의 수련 클리어 — 챔피언십 술법사 해금' },
  { id: 'clear_training_demonblood', cat: 'training', class: 'demonblood', kind: 'first', target: 1, reward: 200,
    name: '마성의 수련자', desc: '혼혈 마족의 수련 클리어 — 챔피언십 혼혈 마족 해금' },
  { id: 'clear_training_elf', cat: 'training', class: 'elf', kind: 'first', target: 1, reward: 250,
    name: '자연의 수련자', desc: '엘프의 수련 클리어 — 챔피언십 숲의 정령사 해금' },
  { id: 'clear_training_priest', cat: 'training', class: 'priest', kind: 'first', target: 1, reward: 300,
    name: '신앙의 수련자', desc: '사제의 수련 클리어 — 챔피언십 여명의 사제 해금' },
  
  // === 수련의 길 숙달 업적 (5직업 × 10회) ===
  { id: 'master10_training_wanderer', cat: 'training', class: 'wanderer', kind: 'count', target: 10, reward: 300, 
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
  { id: 'expert_wanderer', cat: 'clear', class: 'wanderer', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '검의 전문가', desc: '방랑검사로 망각의 원정 50회 클리어' },
  { id: 'expert_sage', cat: 'clear', class: 'sage', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '술법의 전문가', desc: '술법사로 망각의 원정 50회 클리어' },
  { id: 'expert_demonblood', cat: 'clear', class: 'demonblood', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '마혈의 전문가', desc: '혼혈 마족로 망각의 원정 50회 클리어' },
  { id: 'expert_elf', cat: 'clear', class: 'elf', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '숲의 전문가', desc: '숲의 정령사로 망각의 원정 50회 클리어' },
  { id: 'expert_priest', cat: 'clear', class: 'priest', expedition: 4, kind: 'count', target: 50, reward: 2000, name: '신앙의 전문가', desc: '여명의 사제로 망각의 원정 50회 클리어' },
  
  // === 마스터 (100회) - 직업당 1개 ===
  { id: 'master_wanderer', cat: 'clear', class: 'wanderer', expedition: 4, kind: 'count', target: 100, reward: 5000, name: '검의 마스터', desc: '방랑검사로 망각의 원정 100회 클리어' },
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
  { id: 'special_wanderer_3ult', cat: 'special', kind: 'event', target: 1, reward: 600, name: '검의 길', desc: '방랑검사 각성 3종 모두 1런에 진화' },
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

