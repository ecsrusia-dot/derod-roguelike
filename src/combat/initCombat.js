// ============================================
// combat/initCombat.js — 전투 초기 상태 빌더
// ============================================
// CombatScreen.jsx의 useState/useMemo 초기화 콜백을 순수 함수로 추출.
// 호출처: CombatScreen 마운트 시 1회. 부수효과 없음.
// ============================================

import {
  getMetaBonus,
  hasCurse,
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

// 플레이어 초기 상태 생성 — 메타·저주·이프리트 패시브 보너스 반영.
// ※ 시작 소울 게이지 가산은 useEffect에서 별도 처리 (passive 로그 출력 때문)
export function buildInitialPlayer({ initialPlayer, initialSkills, initialUltimates, activeSkills, meta, curses }) {
  let p = {
    ...initialPlayer, defense: 0, buffs: {}, debuffs: {}, cooldowns: {},
    ether: 3, maxEther: 3, firstHitImmune: false, revivedThisCombat: false,
    soulGauge: 0,
  };
  if (meta) {
    const etherBonus = getMetaBonus(meta, 'maxEther+1');
    p.maxEther += etherBonus;
    p.ether += etherBonus;
    const startDefenseBonus = getMetaBonus(meta, 'startDefense+5') * 5;
    if (startDefenseBonus > 0) p.defense += startDefenseBonus;
  }
  if (hasCurse(curses, 'curse_ether-1')) {
    p.maxEther = Math.max(1, p.maxEther - 1);
    p.ether = Math.max(1, p.ether - 1);
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
  const hpMult = expedition?.enemyHpMult || 1.0;
  const dmgMult = expedition?.enemyDmgMult || 1.0;
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
