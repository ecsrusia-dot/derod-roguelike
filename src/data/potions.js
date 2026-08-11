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

// 1.97.0~ 직업별 벨트 슬롯 (PM 지정) — 기본/최대. 확장은 영혼 제단이 아니라 직업별 조건 달성으로.
export const CLASS_BELT = {
  wanderer:   { base: 2, max: 4 },
  sage:       { base: 1, max: 3 },
  demonblood: { base: 0, max: 1 },
  elf:        { base: 1, max: 3 },
  priest:     { base: 1, max: 2 },
};

// 확장 조건 (순차 달성 — 1차를 깨야 2차 판정) — max-base 개수만큼 정의
// type 'training' = 해당 직업 수련의 길 클리어 / 'clears' = 해당 직업 원정 누적 클리어 N회 (expert 카운터)
export const BELT_EXPANSIONS = {
  wanderer:   [{ type: 'training', desc: '방랑검사의 수련 클리어' }, { type: 'clears', count: 20, desc: '방랑검사로 원정 20회 클리어' }],
  sage:       [{ type: 'training', desc: '술법사의 수련 클리어' },   { type: 'clears', count: 20, desc: '술법사로 원정 20회 클리어' }],
  demonblood: [{ type: 'training', desc: '혼혈 마족의 수련 클리어' }],
  elf:        [{ type: 'training', desc: '엘프의 수련 클리어' },     { type: 'clears', count: 20, desc: '숲의 정령사로 원정 20회 클리어' }],
  priest:     [{ type: 'training', desc: '사제의 수련 클리어' }],
};
