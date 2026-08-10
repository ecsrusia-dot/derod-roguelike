// ============================================
// data/titles.js — 칭호 시스템 (1.89.0~, PM 확정)
// ============================================
// PM 확정 설계:
//   - 마스터즈 퓨전 던전 클리어 시에만 드랍 (직업별 별도 획득 — 플레이한 직업 것만)
//   - 등급 4단계: 영웅(R) / 전설(E) / 신화(L) / 태초(M)
//   - 등급별 "수치 차이"가 아니라 옵션 유형 자체가 다름 + 직업 정체성 반영
//   - 최고 등급(태초) 드랍률 0.1% 수준 (듀얼 0.1% / 트리플 0.2%)
//   - 장착은 직업당 1개 — 효과는 engravingFx 파이프라인으로 런에 자동 적용
// ============================================

export const TITLE_TIERS = {
  R: { name: '영웅', color: '#7ba3c4' },
  E: { name: '전설', color: '#c46ba3' },
  L: { name: '신화', color: '#e8873a' },
  M: { name: '태초', color: '#e8b04a' },
};

// 클리어당 드랍률 — 높은 등급일수록 낮게 (단조 감소, PM 룰). 트리플은 2배
export const TITLE_DROP_RATES = {
  dual:   { M: 0.001, L: 0.01, E: 0.04, R: 0.10 },
  triple: { M: 0.002, L: 0.02, E: 0.08, R: 0.18 },
};

// 직업별 칭호 — fx는 각인 effect 키 재사용 (전투 코드 변경 0)
export const CLASS_TITLES = {
  wanderer: [
    { id: 'title_wan_r', tier: 'R', name: '균열을 걷는 자',  desc: '시작 소울 게이지 +20 — 소울 스킬 시동형',                          fx: { startSoul: 20 } },
    { id: 'title_wan_e', tier: 'E', name: '검막의 종주',      desc: '반격 확률 +12%, 반격 시 충격 게이지 +10 — 반격 압박형',            fx: { counterRatePct: 12, counterShock: 10 } },
    { id: 'title_wan_l', tier: 'L', name: '무영검성',         desc: '반격에 치명타 적용 + 반격 데미지 +40% — 반격 치명형',              fx: { counterCanCrit: true, counterDmgPct: 40 } },
    { id: 'title_wan_m', tier: 'M', name: '태초의 검혼',      desc: '회피 +10% · 회피 후 공격 +40% · 반격 확률 +15% · 반격 시 소울 +8 — 회피·반격 융합', fx: { dodgeRate: 10, afterDodgeDmg: 40, counterRatePct: 15, counterHitSoul: 8 } },
  ],
  sage: [
    { id: 'title_sage_r', tier: 'R', name: '재의 수집가',     desc: '매 턴 소울 게이지 +3 — 소울 순환형',                               fx: { perTurnSoul: 3 } },
    { id: 'title_sage_e', tier: 'E', name: '불길의 지휘자',   desc: '마법 데미지 +12% — 정공 화력형',                                   fx: { magicDmgPct: 12 } },
    { id: 'title_sage_l', tier: 'L', name: '겁화의 대가',     desc: '화염 각인 데미지 +60% — 도트 특화형',                              fx: { igniteDmgPct: 60 } },
    { id: 'title_sage_m', tier: 'M', name: '태초의 화신',     desc: '지능 +8 · 마법 데미지 +18% · 소울 획득 ×1.3 — 화력·소울 융합',     fx: { int: 8, magicDmgPct: 18, soulGainMult: 0.3 } },
  ],
  demonblood: [
    { id: 'title_demon_r', tier: 'R', name: '피의 흔적',      desc: '시작 HP +40 — 자해 여유형',                                        fx: { startHp: 40 } },
    { id: 'title_demon_e', tier: 'E', name: '광기의 인장',    desc: '물리 데미지 +12% — 정공 폭딜형',                                   fx: { physDmgPct: 12 } },
    { id: 'title_demon_l', tier: 'L', name: '혈전의 지배자',  desc: '받는 데미지 -15% — 저체력 유지 생존형',                            fx: { dmgTakenPct: -15 } },
    { id: 'title_demon_m', tier: 'M', name: '태초의 마혈',    desc: '근력 +8 · 물리 데미지 +18% · 매 턴 HP -2 (자해 가속) — 극한 리스크·폭딜', fx: { str: 8, physDmgPct: 18, perTurnHpLoss: 2 } },
  ],
  elf: [
    { id: 'title_elf_r', tier: 'R', name: '바람의 흔적',      desc: '회피 시 소울 게이지 +6 — 회피 순환형',                             fx: { dodgeSoul: 6 } },
    { id: 'title_elf_e', tier: 'E', name: '숲의 명사수',      desc: '치명타율 +10% — 정공 치명형',                                      fx: { critRate: 10 } },
    { id: 'title_elf_l', tier: 'L', name: '질풍의 정령왕',    desc: '회피율 +12% + 회피 후 공격 +30% — 회피 반전형',                    fx: { dodgeRate: 12, afterDodgeDmg: 30 } },
    { id: 'title_elf_m', tier: 'M', name: '태초의 바람',      desc: '민첩 +8 · 치명타율 +12% · 회피율 +8% — 치명·회피 융합',            fx: { dex: 8, critRate: 12, dodgeRate: 8 } },
  ],
  priest: [
    { id: 'title_priest_r', tier: 'R', name: '새벽 순례자',   desc: '시작 HP +50 — 지구전 기반형',                                      fx: { startHp: 50 } },
    { id: 'title_priest_e', tier: 'E', name: '빛의 집전자',   desc: '회복량 +30% — 회복 특화형',                                        fx: { combatHealPct: 30 } },
    { id: 'title_priest_l', tier: 'L', name: '여명의 대사제', desc: '받는 데미지 -12% + 회복량 +20% — 수호형',                          fx: { dmgTakenPct: -12, combatHealPct: 20 } },
    { id: 'title_priest_m', tier: 'M', name: '태초의 성광',   desc: '매력 +8 · 회복량 +40% · 시작 소울 +25 — 성광 융합',                fx: { cha: 8, combatHealPct: 40, startSoul: 25 } },
  ],
};

// 클리어 시 칭호 등급 롤 — 높은 등급부터 판정 (미당첨 시 null)
export function rollTitleDrop(kind) {
  const rates = TITLE_DROP_RATES[kind] || TITLE_DROP_RATES.dual;
  const r = Math.random();
  let acc = 0;
  for (const tier of ['M', 'L', 'E', 'R']) {
    acc += rates[tier];
    if (r < acc) return tier;
  }
  return null;
}

// titleId → { classId, title }
export function findTitle(titleId) {
  for (const classId in CLASS_TITLES) {
    const t = CLASS_TITLES[classId].find(x => x.id === titleId);
    if (t) return { classId, title: t };
  }
  return null;
}
