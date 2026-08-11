// ============================================
// data/potions.js — 황혼의 벨트 (포션 시스템, 1.96.0 PM 결정)
// ============================================
// 디아블로식 벨트: 전투 중 AP 소모 없이 턴당 1회 사용.
// 획득: 상점 구매 (런 한정 소모품). 슬롯: 기본 2칸 + 영혼 제단 「황혼의 벨트」 +1/단계 (최대 4칸).
// 회복량은 최대 HP 비례(%) — 진행도가 올라도 가치 유지. 회복 보정(유물 heal% 등) 미적용 — 표기값 그대로.

export const POTIONS = {
  hp_small:  { id: 'hp_small',  name: '회복 물약 (소)', icon: '🧪', color: '#9ad4a3', desc: '최대 HP 25% 회복', healPct: 25, price: 50 },
  hp_medium: { id: 'hp_medium', name: '회복 물약 (중)', icon: '⚗️', color: '#d4a574', desc: '최대 HP 50% 회복', healPct: 50, price: 100 },
  hp_large:  { id: 'hp_large',  name: '회복 물약 (대)', icon: '🏺', color: '#e8b04a', desc: 'HP 완전 회복', healFull: true, price: 180 },
  ether:     { id: 'ether',     name: '에테르 물약',    icon: '💧', color: '#7ba3c4', desc: '에테르 +3', ether: 3, price: 60 },
};

export const BELT_BASE_SLOTS = 2;
