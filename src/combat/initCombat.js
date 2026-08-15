// ============================================
// combat/initCombat.js — 전투 초기 상태 빌더
// ============================================
// CombatScreen.jsx의 useState/useMemo 초기화 콜백을 순수 함수로 추출.
// 호출처: CombatScreen 마운트 시 1회. 부수효과 없음.
// ============================================

import {
  getMetaBonus,
  getEffectiveSkills,
  getActiveRelicStat,
} from '../utils/helpers.js';
import { ENEMIES } from '../data.js';

// 유물에서 집계할 stat 키. relic을 들고 있을 때만 0 이상 값이 들어옴.
const RELIC_STAT_KEYS = [
  'dmgDealt', 'dmgTaken', 'critRate', 'critDmg', 'dodge', 'maxHp',
  'startGold', 'startGem', 'heal', 'reflect', 'lifesteal', 'shieldOnStart',
  'magicDmg', 'cdReduceChance', 'mapReveal',
  // 챔피언십 전용 stat
  'frostbiteResist', 'berserkResist', 'sealResist', 'shockResist', 'antiHeal',
];

// ============================================
// 1.69.0 전투 개편 B — AP(행동력) 턴 시스템
// ============================================
// 플레이어는 턴당 AP 3으로 복수 행동 조합 (기본기 1 / 주력기 2 / 방어·버프 1 / 소울 3=전체 턴).
// AP 도입으로 플레이어 턴당 산출량이 약 ×1.9로 늘어 적 전체에 보정 배율 적용.
export const AP_PER_TURN = 3;

// 스킬 AP 비용 — 데이터 ap 필드 우선, 미지정 시 기본 규칙
export function getSkillApCost(skill) {
  if (!skill) return 1;
  if (skill.ap) return skill.ap;
  if (skill.type === 'defense' || skill.type === 'buff') return 1;
  if ((skill.cd || 0) === 0) return 1; // 기본기 (1.101.0~ 에테르 폐지 — cd 0 기준)
  return 2; // 주력기
}

// AP 시스템 밸런스 보정 — PM 실기기 확인 후 이 두 수치만 조정하면 전역 반영
export const AP_TUNING = { enemyHpMult: 1.6, enemyDmgMult: 1.25 };

// 플레이어 초기 상태 생성 — 메타·저주·이프리트 패시브 보너스 반영.
// ※ 시작 소울 게이지 가산은 useEffect에서 별도 처리 (passive 로그 출력 때문)
export function buildInitialPlayer({ initialPlayer, initialSkills, initialUltimates, activeSkills, meta, curses }) {
  let p = {
    ...initialPlayer, defense: 0, buffs: {}, debuffs: {}, cooldowns: {},
    firstHitImmune: false, revivedThisCombat: false,
    soulGauge: 0, ap: AP_PER_TURN,
  };
  if (meta) {
    const startDefenseBonus = getMetaBonus(meta, 'startDefense+5') * 5;
    if (startDefenseBonus > 0) p.defense += startDefenseBonus;
  }
  // 이프리트 minor (Tier 효과 누적): 지능 +2 (Lv.3) +3 (Lv.5) +4 (Lv.7)
  const ifritLv = (initialSkills && initialSkills['이프리트']) || 0;
  if (ifritLv > 0 && (!activeSkills || activeSkills.includes('이프리트'))) {
    let intBonus = 0;
    if (ifritLv >= 3) intBonus += 2;
    if (ifritLv >= 5) intBonus += 3;
    if (ifritLv >= 7) intBonus += 4;
    p.지능 = (p.지능 || 0) + intBonus;
  }
  // 이프리트 궁극: 지능 +4 (3궁극 공통)
  if (initialUltimates && (initialUltimates.includes('ult_eternalFire') || initialUltimates.includes('ult_ifritDescent') || initialUltimates.includes('ult_purgatoryFire'))) {
    p.지능 = (p.지능 || 0) + 4;
  }
  return p;
}

// 적 초기 상태 생성 — 원정 배율 적용된 HP와 패턴 데미지 반영.
export function buildInitialEnemy({ enemyKey, expedition }) {
  const e = ENEMIES[enemyKey];
  // 1.69.0~ AP 시스템 보정 배율이 원정 배율에 곱연산으로 얹힘
  const hpMult = (expedition?.enemyHpMult || 1.0) * AP_TUNING.enemyHpMult;
  const dmgMult = (expedition?.enemyDmgMult || 1.0) * AP_TUNING.enemyDmgMult;
  const adjustedHp = Math.floor(e.hp * hpMult);
  const adjustedPatterns = (e.patterns || []).map(pat => ({
    ...pat,
    dmg: pat.dmg ? [Math.floor(pat.dmg[0] * dmgMult), Math.floor(pat.dmg[1] * dmgMult)] : pat.dmg,
  }));
  return {
    ...e, key: enemyKey,
    hp: adjustedHp,
    currentHp: adjustedHp, maxHp: adjustedHp,
    patterns: adjustedPatterns,
    defense: 0, debuffs: {}, nextIntent: null,
  };
}

// ============================================
// 1.68.0 전투 개편 A — 적 의도 선택 지능화
// ============================================
// - pattern.weight 지원 (기본 1 — 데이터에 없으면 기존 균등 추첨과 동일)
// - 보스 격노(enraged) 시 공격 패턴 가중치 ×2 (방어로 시간 끄는 빈도 급감)
// - 같은 패턴 3연속 방지: 직전 2연속과 동일한 패턴이 뽑히면 1회 리롤
export function rollEnemyIntent(enemyState) {
  const patterns = enemyState?.patterns || [];
  if (patterns.length === 0) return null;
  const pick = () => {
    const weights = patterns.map(p => {
      let w = p.weight || 1;
      if (enemyState.enraged && p.type === 'attack') w *= 2;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < patterns.length; i++) {
      r -= weights[i];
      if (r < 0) return patterns[i];
    }
    return patterns[patterns.length - 1];
  };
  let intent = pick();
  if (patterns.length > 1 && intent?.name === enemyState._lastIntentName && (enemyState._lastIntentRepeat || 0) >= 1) {
    intent = pick();
  }
  return intent;
}

// 의도 확정 + 연속 추적 필드 갱신 (enemyState를 직접 변형하고 intent 반환)
export function assignNextIntent(enemyState) {
  const intent = rollEnemyIntent(enemyState);
  enemyState._lastIntentRepeat = intent && intent.name === enemyState._lastIntentName
    ? (enemyState._lastIntentRepeat || 0) + 1
    : 0;
  enemyState._lastIntentName = intent?.name || null;
  enemyState.nextIntent = intent;
  return intent;
}

// 패시브 스킬 계산 — 활성 유물 효과를 패시브에 반영.
// 1.49.0~ 신전 봉인은 액티브 스킬을 봉인하도록 변경되어 패시브 봉인 시스템은 사용하지 않음.
export function buildEffectivePassives({ initialSkills, initialRelics, activeRelicNames }) {
  return getEffectiveSkills(initialSkills, initialRelics, activeRelicNames);
}

// 활성 유물의 모든 stat 보너스를 단일 객체로 집계 (전투 중 반복 호출 비용 절감).
export function buildRelicStatBag({ initialRelics, activeRelicNames }) {
  const stats = {};
  RELIC_STAT_KEYS.forEach(k => { stats[k] = getActiveRelicStat(initialRelics, activeRelicNames, k); });
  return stats;
}
