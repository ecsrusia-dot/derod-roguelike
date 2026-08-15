// =========== 전투 스킬 ===========
// type: physical / magic / defense / buff
// baseDmg: [최소, 최대]
// cd: 쿨다운 턴 수 (1.101.0~ 에테르 폐지 — CD·AP만으로 사용 제한)
// pierce: 방어 무시
// hitCount: 다중 히트 횟수
// berserker: HP 낮을수록 데미지 증가
// selfDmg: 자해 데미지
// forceBleed: 출혈 강제 부여
// dodgeBuff: 회피율 보너스
// buff: 'rage' 등 버프 키
//
// === 1.69.0 전투 개편 B (AP) + C (콤보) ===
// ap: 행동력 비용 (턴당 AP 3). 미지정 시 initCombat.getSkillApCost 기본 규칙:
//     defense/buff = 1, cd0 기본기 = 1, 그 외 주력기 = 2
// comboAfter: 이번 턴에 해당 키의 스킬을 먼저 썼으면 연계 발동
// comboBonusPct: 연계 시 데미지 +%
// comboLabel: 연계 발동 로그·라벨 이름
// comboHealMult: 연계 시 selfHeal 배수 (사제 전용)
// ※ 1.69.0 밸런스: AP 도입으로 기본기(1AP)를 턴당 최대 3회 사용 가능해져
//    기본기 5종 baseDmg 약 60%로 하향 (3연타 ≈ 기존 1.9배 산출)
export const COMBAT_SKILLS = {
  // 방랑검사
  // 1.95.0 화력 상향 (PM 진단: 스킬 공격력 부족) — 참격·파이어볼·익스플로젼 기본 데미지 +30%
  // 1.95.0 관통 → 폭격 표시명 변경 (코드 키 '관통'은 호환 유지 — 마법탄→파이어볼과 동일 방식)
  참격: { name: '참격', cd: 0, ap: 1, type: 'physical', baseDmg: [17, 22], desc: '기본 검 공격. 적중 시 [상처악화] — 적 받는 데미지 +5% 누적 (최대 +50%)', woundOnHit: 5, woundMax: 50 },
  관통: { name: '폭격', cd: 2, ap: 2, type: 'physical', baseDmg: [32, 40], desc: '방어 무시. 치명타 시 치명타 데미지 ×1.5', pierce: true, critFinalMult: 1.5, comboAfter: '참격', comboBonusPct: 40, comboLabel: '폭렬 연계' },
  방검: { name: '방검', cd: 2, ap: 1, type: 'defense', defense: 30, desc: '방어 +30. 2턴간 받는 피해 -25% [검막]', dmgReducePct: 25, dmgReduceTurns: 2 },
  // 술법사 (1.42.0~ 표시명 변경: 마법탄→파이어볼, 정념폭발→익스플로젼. 코드 키는 호환 유지)
  마법탄: { name: '파이어볼', cd: 0, ap: 1, type: 'magic', baseDmg: [16, 21], desc: '기본 마법' },
  정념폭발: { name: '익스플로젼', cd: 3, ap: 2, type: 'magic', baseDmg: [55, 68], desc: '강력한 마법', comboAfter: '마법탄', comboBonusPct: 40, comboLabel: '유폭' },
  결계: { name: '결계', cd: 1, ap: 1, type: 'defense', defense: 50, desc: '방어 +50' },
  화염장막: { name: '화염장막', cd: 1, ap: 1, type: 'defense', defense: 40, desc: '방어 +40. 공격한 적에게 화염 각인 50% 반사 (1회). 적 공격력 -6% 누적 [위축, 최대 -30%]', reflectIgnite: 50, weakenPct: 6, weakenMax: 30 },
  // 혼혈 마족
  광폭참격: { name: '광폭참격', cd: 0, ap: 1, type: 'physical', baseDmg: [14, 20], desc: 'HP 낮을수록 ↑', berserker: true },
  '피의 일격': { name: '피의 일격', cd: 2, ap: 2, type: 'physical', baseDmg: [27, 35], desc: '자해+출혈', selfDmg: 10, forceBleed: true, comboAfter: '광폭참격', comboBonusPct: 40, comboLabel: '피의 연쇄' },
  광기: { name: '광기', cd: 3, ap: 1, type: 'buff', buff: 'rage', desc: '2턴 데미지+30% (광기의 분노)' },
  // 정령사
  정밀사격: { name: '정밀사격', cd: 0, ap: 1, type: 'physical', baseDmg: [12, 16], desc: '기본 활 공격' },
  연속화살: { name: '연속화살', cd: 3, ap: 2, type: 'physical', baseDmg: [15, 19], hitCount: 3, desc: '3연발', comboAfter: '정밀사격', comboBonusPct: 40, comboLabel: '조준 연계' },
  바람결계: { name: '바람결계', cd: 1, ap: 1, type: 'defense', defense: 30, desc: '방어+회피', dodgeBuff: 30 },
  // 여명의 사제
  신성광선: { name: '신성광선', cd: 0, ap: 1, type: 'magic', baseDmg: [11, 16], desc: '신성 데미지+자가 회복 10', selfHeal: 10, comboAfter: '축복', comboBonusPct: 40, comboLabel: '축복받은 빛', comboHealMult: 2 },
  축복: { name: '축복', cd: 3, ap: 1, type: 'buff', buff: 'rage', desc: '2턴 데미지+30% (여명의 축복)' },
  가호: { name: '가호', cd: 2, ap: 1, type: 'defense', defense: 50, desc: '방어 +50, HP 회복 +15', selfHeal: 15 },
};
