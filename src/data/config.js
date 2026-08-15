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


// =========== 전투 준비 시스템 ===========
export const PREP_CONFIG = {
  maxSkillSelect: 5,    // 활성 패시브 개수 (모든 원정 동일)
};


// =========== 자동 사냥 배속 (1.102.0~) ===========
// 배속 순환: ×1 → ×5 → ×10 → ×20 → ⏩스킵 → ×1
// 스킵 = 전투 딜레이 0으로 즉시 진행 (PM 지시: 최종 결과가 승리인 전투는 안 보고 넘김.
// 패배는 그대로 패배 화면 노출 — 결과 조작·재굴림 없음, 동일 전투 로직을 빨리 감기만 함).
// 스킵 모드 런은 ×1 환산 런타임 산출 불가 → 던전 베스트 기록 무효 (이어하기와 동일 취급)
export const AUTO_SPEED_SKIP = 100;

// =========== 기능 플래그 (1.99.1~) ===========
// PM 지시로 임시 비활성화된 기능 — 코드·데이터·저장 데이터는 보존, 진입점과 작동만 차단.
// 재활성화는 해당 플래그를 true로 바꾸면 끝.
export const FEATURE_FLAGS = {
  dailyMissions: false, // 일일 임무 (타이틀 패널 + 진행 추적·보상 지급)
  raid: false,          // 레이드 (타이틀 메뉴 + 백그라운드 전투)
  hof: false,           // 명예의 전당 (타이틀 메뉴)
};
