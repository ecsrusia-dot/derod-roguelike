// ============================================
// utils/helpers.js — 순수 헬퍼 함수
// ============================================
// 의존성: data.js (상수만), 외부 상태 X
// 모든 함수는 인자만으로 동작 — 사이드 이펙트 없음
// ============================================

import {
  PASSIVE_SKILLS,
  META_UPGRADES,
  CURSES,
  ULTIMATE_SKILLS,
  ENGRAVINGS,
  ENGRAVING_TIERS,
  ENGRAVING_AWAKENING_TABLE,
  CHAMPIONSHIP_EXP_IDS,
  CLASSES,
} from '../data.js';

// ===== 색상 팔레트 =====
export const PALETTE = {
  bg: '#0a0608', bgDeep: '#050304',
  panel: '#1a0e12', panelLight: '#241419', panelBorder: '#3d1f28',
  accent: '#c4453d', accentDim: '#7a2820',
  dawn: '#d4a574', twilight: '#5c4a8c',
  text: '#e8d9c4', textDim: '#9b8975',
  ice: '#7ba3c4', blood: '#8b1f1f',
  green: '#7a9a5e', legendary: '#e8b04a',
  shock: '#e8b04a', bleed: '#8b1f1f', defense: '#7ba3c4',
};

// ===== 스킬 헬퍼 =====

// 스킬 레벨 가져오기 (object/number 모두 처리)
export function getSkillLevel(skills, skillName) {
  if (!skills || !skills[skillName]) return 0;
  return typeof skills[skillName] === 'object' 
    ? (skills[skillName].lv || 0) 
    : (skills[skillName] || 0);
}

// 봉인된 패시브를 0Lv으로 처리한 skills 반환 (챔피언십 신전)
export function applySealsToSkills(skills, sealedSkills) {
  if (!sealedSkills || sealedSkills.length === 0) return skills;
  const result = { ...skills };
  for (const sealed of sealedSkills) {
    if (result[sealed] !== undefined) {
      if (typeof result[sealed] === 'object') {
        result[sealed] = { ...result[sealed], lv: 0 };
      } else {
        result[sealed] = 0;
      }
    }
  }
  return result;
}

// 활성 패시브 효과 추출 (trigger별)
export function getActivePassives(skills, trigger, activeSkills = null) {
  const out = [];
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv === 0 || !PASSIVE_SKILLS[name]) return;
    // 봉인 체크
    if (activeSkills && !activeSkills.includes(name)) return;
    const tiers = PASSIVE_SKILLS[name].tiers || {};
    Object.entries(tiers).forEach(([reqLv, t]) => {
      if (lv >= parseInt(reqLv) && t.trigger === trigger) {
        out.push({ skillName: name, tierLv: parseInt(reqLv), ...t });
      }
    });
  });
  return out;
}

// 효과 보유 여부 (모든 trigger 검색)
export function hasEffect(skills, effectName, activeSkills = null) {
  for (const trigger of ['passive', 'onCombatStart', 'onAttack', 'onTurnStart', 'onDodge', 'onLethal']) {
    if (getActivePassives(skills, trigger, activeSkills).some(p => p.effect === effectName)) return true;
  }
  return false;
}

// 1.45.3 마력 패시브 재시전 확률 누적 합산 (Lv3 +5% / Lv5 +10% / Lv7 +15% = 만렙 30%)
// 반환: 백분율 (0~30 정수)
export function getMagicEchoChance(skills, activeSkills = null) {
  let chance = 0;
  if (hasEffect(skills, 'magicEcho+5', activeSkills)) chance += 5;
  if (hasEffect(skills, 'magicEcho+10', activeSkills)) chance += 10;
  if (hasEffect(skills, 'magicEcho+15', activeSkills)) chance += 15;
  return chance;
}

// 궁극 효과 보유 여부
export function hasUltimate(ultimates, effectName) {
  if (!ultimates || ultimates.length === 0) return false;
  for (const ultId of ultimates) {
    for (const skillName in ULTIMATE_SKILLS) {
      const ult = ULTIMATE_SKILLS[skillName].find(u => u.id === ultId);
      if (ult && ult.effect === effectName) return true;
    }
  }
  return false;
}

// minorEffect 누적치 계산 (Lv.1부터 효과)
export function getMinorBonus(skills, effectType, activeSkills = null) {
  let total = 0;
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv === 0 || !PASSIVE_SKILLS[name]?.minorEffect) return;
    if (activeSkills && !activeSkills.includes(name)) return;
    if (PASSIVE_SKILLS[name].minorEffect.type === effectType) {
      total += PASSIVE_SKILLS[name].minorEffect.perLv * lv;
    }
  });
  return total;
}

// ===== 유물 헬퍼 =====

// 활성 유물 보너스 합산
export function getActiveRelicStat(relics, activeRelicNames, statName) {
  if (!relics || relics.length === 0) return 0;
  let total = 0;
  relics.forEach(rel => {
    if (!rel.statBonus) return;
    if (activeRelicNames && !activeRelicNames.includes(rel.name)) return;
    if (rel.statBonus[statName] !== undefined) {
      total += rel.statBonus[statName];
    }
  });
  return total;
}

// effective skills (현재는 통과만 — 추후 유물 영향 시 확장)
export function getEffectiveSkills(skills, relics, activeRelicNames = null) {
  return skills;
}

// ===== 메타 헬퍼 =====

// 메타 강화 누적치
export function getMetaBonus(meta, effectType) {
  let bonus = 0;
  if (!meta || !meta.upgrades) return 0;
  Object.entries(meta.upgrades).forEach(([upgradeId, stack]) => {
    const upgrade = META_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;
    if (upgrade.effect === effectType) {
      bonus += stack;
    }
  });
  return bonus;
}

// 1.44.2~ 챔피언십 메타 4난이도 분할 — normal/hard/hell/madness
// 효과 통일: 시작 HP·은화. 패시브 +Lv·유물 +1은 폐기 (환불 처리됨)
const CHAMPION_META_IDS = {
  normal: 'meta_champion_normal',
  hard: 'meta_champion_hard',
  hell: 'meta_champion_hell',
  madness: 'meta_champion_madness',
};
const CHAMPION_META_HP = { normal: 10, hard: 15, hell: 20, madness: 25 };
const CHAMPION_META_GOLD = { normal: 10, hard: 15, hell: 20, madness: 25 };

export function hasChampionMeta(meta, level) {
  if (!meta || !meta.upgrades) return false;
  const id = CHAMPION_META_IDS[level];
  return !!(id && meta.upgrades[id]);
}

// 챔피언십 메타: 시작 HP 보너스 (1.44.2~ 4난이도 누적 가능)
export function getChampionshipMetaHp(meta) {
  let bonus = 0;
  for (const [level, hp] of Object.entries(CHAMPION_META_HP)) {
    if (hasChampionMeta(meta, level)) bonus += hp;
  }
  return bonus;
}

// 챔피언십 메타: 시작 은화 보너스 (1.44.2 신설)
export function getChampionshipMetaGold(meta) {
  let bonus = 0;
  for (const [level, gold] of Object.entries(CHAMPION_META_GOLD)) {
    if (hasChampionMeta(meta, level)) bonus += gold;
  }
  return bonus;
}

// 챔피언십 메타: 시작 패시브 +Lv (1.44.2 폐기. 호환 위해 0 반환)
export function getChampionshipMetaSkillBonus() {
  return 0;
}

// 챔피언십 메타: 시작 유물 +개수 (1.44.2 폐기. 호환 위해 0 반환)
export function getChampionshipMetaRelicBonus() {
  return 0;
}

// 해금 여부
// unlockId 형식:
//   - "unlock_xxx" : meta.unlocks 배열 확인
//   - "tutorial_basic_clear" / "tutorial_market_clear" : 해당 expedition 클리어 여부 확인
//   - "training_xxx" : 클리어 여부 확인 (수련의 길)
//   - null : 항상 해금
export function isUnlocked(meta, unlockId) {
  if (!unlockId) return true;  // null이면 항상 해금
  if (!meta) return false;
  
  // expedition 클리어 확인 (tutorial_basic_clear 같은 형식)
  if (unlockId.endsWith('_clear')) {
    const expId = unlockId.replace('_clear', '');
    return (meta.clearedExpeditions || []).includes(expId);
  }
  
  // 일반 unlock (영혼 제단 등에서 해금)
  return (meta.unlocks || []).includes(unlockId);
}

// 강화 비용 계산
export function getUpgradeCost(upgrade, currentStack) {
  if (typeof upgrade.cost === 'function') {
    return upgrade.cost(currentStack);
  }
  return upgrade.cost || 0;
}

// 강화 가능 여부
export function canPurchaseUpgrade(meta, upgrade) {
  if (!upgrade) return false;
  if (!upgrade.stackable) {
    if (meta.unlocks.includes(upgrade.id) || (meta.upgrades[upgrade.id] || 0) > 0) return false;
    if (upgrade.requirePriorClear && !meta.clearedExpeditions.includes(upgrade.requirePriorClear)) return false;
    if (upgrade.requireChampionshipAll) {
      const allChamps = ['frost', 'forest', 'sanctum', 'rift', 'dawn'];
      const diff = upgrade.requireChampionshipAll;
      const allClear = allChamps.every(c => meta.championshipClears?.[c]?.[diff]);
      if (!allClear) return false;
    }
    return true;
  }
  return (meta.upgrades[upgrade.id] || 0) < (upgrade.maxStacks || 999);
}

// 제단 슬롯 추첨
export function rollAltarSlots(meta, count = 3) {
  const available = META_UPGRADES.filter(u => canPurchaseUpgrade(meta, u));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ===== 저주 헬퍼 =====

export function rollCurses(count) {
  if (count <= 0) return [];
  const shuffled = [...CURSES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CURSES.length));
}

export function hasCurse(curses, effectName) {
  if (!curses || curses.length === 0) return false;
  return curses.some(c => c.effect === effectName);
}

// ===== 매력 효과 헬퍼 =====
// 1.23.0 — 여명의 사제 시그니처. 매력 능력치가 회복 효율 + 받는 데미지 감소를 제공.
// 모든 직업이 매력 보석으로 효과를 얻을 수 있으나, 시작 매력이 가장 높은 사제(19)가 시작부터
// 두 효과 모두 누림. 정령사(15)·술법사(14)는 회복+만 받음.

// 매력 → 회복 효율 보너스 (%). 매력 11+ 시 발동.
// 공식: max(0, (매력 - 10)) × 0.5%
//   매력 11 → +0.5% / 매력 15 → +2.5% / 매력 19 → +4.5% / 매력 25 → +7.5%
export function getCharismaHealBonus(stats) {
  if (!stats || !stats.매력) return 0;
  return Math.max(0, (stats.매력 - 10) * 0.5);
}

// 매력 → 받는 데미지 감소 (%). 매력 17+ 시 발동, 5단위마다 -5% 누진.
//   매력 17~21 → -5% / 22~26 → -10% / 27~31 → -15%
export function getCharismaDmgReduction(stats) {
  if (!stats || !stats.매력 || stats.매력 < 17) return 0;
  return (Math.floor((stats.매력 - 17) / 5) + 1) * 5;
}

// 1.37.0~ 매력 자동 가산: 영혼 획득량 +0.5%/포인트. 임계 없음.
// 1.42.0~ 공식 단순화: 매력 × 0.5 (스탯 - 10 시작 → 스탯 × N 통일, 근력·지능 자동 가산과 같은 패턴)
//   매력 10 → +5% / 매력 15 → +7.5% / 매력 19 → +9.5% / 매력 25 → +12.5%
// 적용 위치: handleVictory 처치 영혼·챕터 보너스·무한 깊이 보너스·대장간 영혼 보상 등 모든 영혼 가산처.
export function getCharismaSoulGainBonus(stats) {
  if (!stats || !stats.매력) return 0;
  return (stats.매력 || 0) * 0.5;
}

// ===== 지능 효과 헬퍼 (1.32.0~ / 1.37.0 재정의) =====
// 술법사 시그니처. 1.37.0에서 시작 에테르 → 전투 시작 소울 게이지로 재설계.
// 시작 base 지능이 가장 높은 술법사(20)가 시작부터 두 효과 모두 누림.
//
// 1단계 (지능 11+): 전투 시작 시 소울 게이지 +0.5/포인트. 정수 내림.
//   지능 11 → +0 (0.5 내림) / 12 → +1 / 14 → +2 / 15 → +2 / 20 → +5
//   ※ 공식: floor((지능 - 10) × 0.5)
// 2단계 (지능 17+): 마법 시전 시 소울 게이지 +1/5단위 (기존 1단계가 2단계로 이동).
//   지능 17~21 → +1 / 22~26 → +2
export function getIntellectStartSoul(stats) {
  if (!stats || !stats.지능 || stats.지능 < 11) return 0;
  return Math.floor((stats.지능 - 10) * 0.5);
}

export function getIntellectSoulPerMagic(stats) {
  if (!stats || !stats.지능 || stats.지능 < 17) return 0;
  return Math.floor((stats.지능 - 17) / 5) + 1;
}

// ===== 근력 효과 헬퍼 (1.37.0~) =====
// 방랑검사·마족 시그니처. 시작 base 근력이 가장 높은 마족(19)·방랑검사(18)가 두 효과 모두 누림.
//
// 1단계 (근력 11+): 최대 HP +5/포인트. 정수 내림.
//   근력 11 → +5 / 18 → +40 / 19 → +45 / 25 → +75
//   ※ 공식: max(0, (근력 - 10)) × 5
// 2단계 (근력 17+): 물리 시전 시 소울 게이지 +1/5단위.
//   근력 17~21 → +1 / 22~26 → +2
export function getStrengthHpBonus(stats) {
  if (!stats || !stats.근력 || stats.근력 < 11) return 0;
  return (stats.근력 - 10) * 5;
}

export function getStrengthSoulPerPhys(stats) {
  if (!stats || !stats.근력 || stats.근력 < 17) return 0;
  return Math.floor((stats.근력 - 17) / 5) + 1;
}

// ===== 민첩 효과 헬퍼 (1.37.0~) =====
// 정령사·마족 시그니처. 시작 base 민첩이 가장 높은 정령사(20)가 두 효과 모두 누림.
// ※ 민첩의 회피율·치명타율 자동 가산은 별도 (CombatScreen·StatusPanel에서 직접 계산).
//
// 1단계 (민첩 11+): 치명타 데미지 +2%/포인트.
//   민첩 11 → +2% / 15 → +10% / 20 → +20% / 25 → +30%
//   ※ 공식: max(0, (민첩 - 10)) × 2
// 2단계 (민첩 17+): 회피 성공 시 소울 게이지 +5/5단위.
//   민첩 17~21 → +5 / 22~26 → +10
export function getAgilityCritDmgBonus(stats) {
  if (!stats || !stats.민첩 || stats.민첩 < 11) return 0;
  return (stats.민첩 - 10) * 2;
}

export function getAgilitySoulOnDodge(stats) {
  if (!stats || !stats.민첩 || stats.민첩 < 17) return 0;
  return (Math.floor((stats.민첩 - 17) / 5) + 1) * 5;
}

// ===== 표시용 능력치 합산 (1.31.0~) =====
// StatusPanel 등 정보창 전용. CombatScreen.jsx의 player 초기화·intro 로직과
// 동일한 결과를 내도록 일치시킴 (단 ULTIMATE_SKILLS와 PASSIVE_SKILLS의
// 분기는 CombatScreen이 우선. 여기서 누락된 효과가 있어도 실제 게임 동작은
// CombatScreen 인라인 로직이 책임).
//
// 누락 시 캐릭터 정보창의 능력치가 base 값으로 고정되어 표시되는 버그(1.30.0
// 이전) 해결을 위한 함수.
export function computeDisplayPlayerStats(classData, skills, baseStats, ultimates, activeSkills = null) {
  const out = { ...(classData?.stats || {}), ...(baseStats || {}) };
  // 이프리트 마일스톤 (Lv.3 +2 / Lv.5 +3 — 누적. 1.33.0~ Lv.7 +4 마일스톤 제거)
  const ifritLv = (skills && skills['이프리트']) || 0;
  if (ifritLv > 0 && (!activeSkills || activeSkills.includes('이프리트'))) {
    if (ifritLv >= 3) out.지능 = (out.지능 || 0) + 2;
    if (ifritLv >= 5) out.지능 = (out.지능 || 0) + 3;
  }
  // 이프리트 궁극 +10 지능 (1.33.0~ 상향, 이전 +4)
  if (hasUltimate(ultimates, 'ult_eternalFire') ||
      hasUltimate(ultimates, 'ult_ifritDescent') ||
      hasUltimate(ultimates, 'ult_purgatoryFire')) {
    out.지능 = (out.지능 || 0) + 10;
  }
  // 신앙 minor: 모든 능력치 +allStats+/Lv (실제 전투에서 intro phase 적용)
  const allStatsBonus = getMinorBonus(skills || {}, 'allStats+', activeSkills);
  if (allStatsBonus > 0) {
    out.근력 = (out.근력 || 0) + allStatsBonus;
    out.민첩 = (out.민첩 || 0) + allStatsBonus;
    out.지능 = (out.지능 || 0) + allStatsBonus;
    out.매력 = (out.매력 || 0) + allStatsBonus;
  }
  return out;
}

// 표시용 파생 능력치 (방어 무시·치명타율·회피율·마법딜+·물리딜+)
// 0인 항목은 컴포넌트 단에서 행 자체를 숨김 (StatusPanel.jsx 참조).
// 정확도: 패시브·유물·각인·궁극의 정적(고정) 효과만 합산. 동적 조건부 효과
// (예: 연옥지화 "겁화 보유 적 공격 시 +20%", 정밀 "단발사격 시 치명타 +N" 등)는
// 제외 — 표시에 혼란 유발하므로 정적 보너스만 안내.
export function computeDerivedStats(skills, ultimates, activeSkills = null, relicStat = {}, engravingFx = {}) {
  const s = skills || {};
  // 방어 무시 (절대값)
  let armorIgnore = 0;
  const ifritLv = s['이프리트'] || 0;
  const ifritActive = !activeSkills || activeSkills.includes('이프리트');
  if (ifritActive && ifritLv >= 3) armorIgnore += 5;
  if (ifritActive && ifritLv >= 5) armorIgnore += 10;
  if (hasUltimate(ultimates, 'ult_ifritDescent')) armorIgnore += 25;
  // 회피율 (%)
  let dodgeRate = getMinorBonus(s, 'dodge+', activeSkills);
  if (hasEffect(s, 'dodge+15', activeSkills)) dodgeRate += 15;
  if (hasEffect(s, 'detailIntent', activeSkills)) dodgeRate += 10;
  dodgeRate += relicStat.dodge || 0;
  dodgeRate += engravingFx.dodgeRate || 0;
  // 치명타율 (%)
  let critRate = 0;
  if (hasEffect(s, 'weaknessPoint', activeSkills)) critRate += 10;
  critRate += relicStat.critRate || 0;
  critRate += engravingFx.critRate || 0;
  // 마법 데미지+ (%)
  let magicDmgPct = getMinorBonus(s, 'magicDmg+', activeSkills);
  if (hasEffect(s, 'magicDmg+30', activeSkills)) magicDmgPct += 30;
  magicDmgPct += relicStat.magicDmg || 0;
  // 물리 데미지+ (절대값 — minor type 'physDmg+'은 데미지 합산에 절대값으로 더해짐)
  const physDmg = getMinorBonus(s, 'physDmg+', activeSkills);
  // 1.36.0~ 각인 누적 보너스도 derivedStats에 포함 (정보창 표시용)
  const physDmgPct = engravingFx.physDmgPct || 0;
  const dmgTakenPct = engravingFx.dmgTakenPct || 0;
  const counterRatePct = engravingFx.counterRatePct || 0;
  const counterDmgPct = engravingFx.counterDmgPct || 0;
  const counterHitSoul = engravingFx.counterHitSoul || 0;
  const counterShock = engravingFx.counterShock || 0;
  const counterCanCrit = !!engravingFx.counterCanCrit;
  const startSoul = engravingFx.startSoul || 0;
  const perTurnSoul = engravingFx.perTurnSoul || 0;
  const dodgeSoul = engravingFx.dodgeSoul || 0;
  const afterDodgeDmg = engravingFx.afterDodgeDmg || 0;
  const soulGainMult = engravingFx.soulGainMult || 0;
  const perTurnHpLoss = engravingFx.perTurnHpLoss || 0;
  const disableInsightPredict = !!engravingFx.disableInsightPredict;
  return {
    armorIgnore, dodgeRate, critRate, magicDmgPct, physDmg,
    physDmgPct, dmgTakenPct,
    counterRatePct, counterDmgPct, counterHitSoul, counterShock, counterCanCrit,
    startSoul, perTurnSoul, dodgeSoul, afterDodgeDmg, soulGainMult, perTurnHpLoss,
    disableInsightPredict,
  };
}

// 술법사 화염 각인 발동율 (정보창 표시용, 1.36.0~)
// 전투 시작 시점 기준 발동율 = 기본(패시브 30% / 궁극 70%) + minor(이프리트 Lv × 2%).
// 영겁 미발동 누적 보너스는 전투 중 동적 변화라 미포함.
// 반환: { rate: 0~100, has: bool } — 이프리트 패시브/궁극 없으면 has=false
export function getIfritIgniteRate(skills, ultimates, activeSkills = null) {
  const s = skills || {};
  const ifritLv = s['이프리트'] || 0;
  const hasIfritPassive = ifritLv > 0 && (!activeSkills || activeSkills.includes('이프리트'));
  const hasEternalFire = hasUltimate(ultimates, 'ult_eternalFire');
  const hasIfritDescent = hasUltimate(ultimates, 'ult_ifritDescent');
  const hasPurgatoryFire = hasUltimate(ultimates, 'ult_purgatoryFire');
  const hasAnyIfritUlt = hasEternalFire || hasIfritDescent || hasPurgatoryFire;
  if (!hasIfritPassive && !hasAnyIfritUlt) return { rate: 0, has: false };
  let rate = 0;
  if (hasAnyIfritUlt) rate = 70;
  else if (hasIfritPassive) rate = 30;
  const minorBonus = getMinorBonus(s, 'ifritIgniteRate+', activeSkills);
  rate += minorBonus;
  rate = Math.min(100, rate);
  return { rate, has: true };
}

// ===== 적 일러스트 경로 헬퍼 =====
// chapter 값으로 클래식/챔피언십 자동 판별:
//   - number (1, 2, 3, 4) → 클래식: ./enemies/classic/chapter_<n>/
//   - string ('frost_1', 'forest_2', …) → 챔피언십: ./enemies/championship/<concept>/
//
// kind는 'combat'(전투 16:9) 또는 'intro'(보스 진입 9:16)
export function getEnemyImageSrc(enemyKey, enemy, kind = 'combat') {
  if (!enemy?.chapter) return null;
  if (typeof enemy.chapter === 'string') {
    const concept = enemy.chapter.split('_')[0];
    return `./enemies/championship/${concept}/${enemyKey}_${kind}.jpg`;
  }
  return `./enemies/classic/chapter_${enemy.chapter}/${enemyKey}_${kind}.jpg`;
}

// ===== 직업 각인 시스템 (1.25.0~) =====

// 등급별 가중치 weighted random — 결과: tier 키 ('C' | 'R' | 'E' | 'L' | 'NEG_FLAW' | 'NEG_CURSE')
export function rollEngravingTier() {
  const total = Object.values(ENGRAVING_TIERS).reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const [key, info] of Object.entries(ENGRAVING_TIERS)) {
    r -= info.weight;
    if (r <= 0) return key;
  }
  return 'C';
}

// 풀에서 등급 매칭 카드 중 1장 균등 random. 해당 등급에 카드가 없으면 더 흔한 등급으로 폴백.
export function pickEngravingByTier(classId, tier) {
  const pool = ENGRAVINGS[classId] || [];
  let candidates = pool.filter(e => e.tier === tier);
  if (candidates.length === 0) {
    // 폴백: 같은 풀 안의 아무 카드 1장 (풀이 비어있으면 null)
    if (pool.length === 0) return null;
    candidates = pool;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 가챠 1회 — 등급 롤 + 카드 픽 → 카드 객체 반환 (없으면 null)
export function rollEngravingCard(classId) {
  const tier = rollEngravingTier();
  return pickEngravingByTier(classId, tier);
}

// 카드 ID로 풀에서 카드 객체 찾기 (UI 표시용)
export function getEngravingById(classId, cardId) {
  if (!cardId) return null;
  const pool = ENGRAVINGS[classId] || [];
  return pool.find(e => e.id === cardId) || null;
}

// 장착된 각인의 effect 객체를 모두 합산해 단일 객체로 반환 (1.27.0~)
// 수치형은 합산, 불린형은 OR. 빈 슬롯·null·미정 카드는 무시.
export function aggregateEngravingEffects(classId, slots) {
  const result = {};
  if (!classId || !Array.isArray(slots)) return result;
  for (const cardId of slots) {
    if (!cardId) continue;
    const card = getEngravingById(classId, cardId);
    if (!card?.effect) continue;
    for (const [k, v] of Object.entries(card.effect)) {
      if (typeof v === 'boolean') {
        result[k] = (result[k] || false) || v;
      } else if (typeof v === 'number') {
        result[k] = (result[k] || 0) + v;
      }
    }
  }
  return result;
}

// ===== 각성도 조건 체크 (1.26.0~) =====

// 조건 충족 여부. condition이 없으면 항상 true.
export function isAwakeningConditionMet(meta, classId, lv) {
  const table = ENGRAVING_AWAKENING_TABLE[classId] || [];
  const step = table.find(s => s.lv === lv);
  if (!step || !step.condition) return true;
  return checkCondition(meta, classId, step.condition);
}

function checkCondition(meta, classId, cond) {
  switch (cond.type) {
    case 'trainingClear': {
      const cleared = meta?.clearedExpeditions || [];
      return cleared.includes(`training_${classId}`);
    }
    case 'ultimatePickedCount': {
      const picked = meta?.ultimatesPickedByClass?.[classId] || [];
      return picked.length >= (cond.count || 1);
    }
    case 'championshipAllClear': {
      const byClass = meta?.championshipClearsByClass?.[classId] || {};
      return CHAMPIONSHIP_EXP_IDS.every(expId =>
        byClass[expId]?.[cond.difficulty] === true
      );
    }
    case 'ultimateAllOfOnePassive': {
      const cls = CLASSES.find(c => c.id === classId);
      if (!cls) return false;
      const picked = meta?.ultimatesPickedByClass?.[classId] || [];
      const startPassives = Object.keys(cls.startSkills || {});
      // 시작 패시브 중 1개의 ULTIMATE_SKILLS 모두를 픽했는지 (택일)
      return startPassives.some(passive => {
        const ults = ULTIMATE_SKILLS[passive] || [];
        return ults.length > 0 && ults.every(u => picked.includes(u.id));
      });
    }
    case 'engravingsLvReached': {
      const engravings = meta?.engravings || {};
      const passing = Object.values(engravings).filter(e => (e?.lv || 1) >= cond.minLv).length;
      return passing >= cond.classCount;
    }
    default:
      return true;
  }
}

// 조건 텍스트 (UI 표시용)
export function describeAwakeningCondition(condition, classId) {
  if (!condition) return null;
  const cls = CLASSES.find(c => c.id === classId);
  const className = cls?.name || '';
  switch (condition.type) {
    case 'trainingClear':
      return `${className} 수련의 길 클리어`;
    case 'ultimatePickedCount':
      return `${className} 직업 전용 패시브의 각성 스킬 ${condition.count || 1}개 픽`;
    case 'championshipAllClear': {
      const diffLabels = { normal: '일반', hard: '하드', hell: '지옥', madness: '광기' };
      return `${className} 챔피언십 ${diffLabels[condition.difficulty] || condition.difficulty} 5컨셉 모두 클리어`;
    }
    case 'ultimateAllOfOnePassive': {
      // 1.43.0~ 직업 전용 패시브(ULTIMATE_SKILLS 보유)만 각성 가능
      const startPassives = Object.keys(cls?.startSkills || {});
      const eligible = startPassives.filter(p => (ULTIMATE_SKILLS[p] || []).length > 0);
      if (eligible.length === 0) return `${className} 직업 전용 패시브 미정 (Lv.5 미달성 — 추후 업데이트)`;
      return `${className} 직업 전용 패시브 [${eligible.join(' or ')}]의 3 각성 스킬 모두 픽`;
    }
    case 'engravingsLvReached':
      return `${condition.classCount}개 직업의 각성도 Lv.${condition.minLv} 이상 도달`;
    default:
      return null;
  }
}

// 조건 진행도 텍스트 — 미충족 시 현재 진행도를 같이 표시
export function describeAwakeningConditionProgress(meta, condition, classId) {
  if (!condition) return null;
  switch (condition.type) {
    case 'ultimatePickedCount': {
      const picked = meta?.ultimatesPickedByClass?.[classId] || [];
      return `(${picked.length} / ${condition.count || 1})`;
    }
    case 'championshipAllClear': {
      const byClass = meta?.championshipClearsByClass?.[classId] || {};
      const cleared = CHAMPIONSHIP_EXP_IDS.filter(expId => byClass[expId]?.[condition.difficulty]).length;
      return `(${cleared} / ${CHAMPIONSHIP_EXP_IDS.length})`;
    }
    case 'ultimateAllOfOnePassive': {
      const cls = CLASSES.find(c => c.id === classId);
      if (!cls) return null;
      const picked = meta?.ultimatesPickedByClass?.[classId] || [];
      const startPassives = Object.keys(cls.startSkills || {});
      // 1.44.1~ ULTIMATE_SKILLS 없는 패시브(직업 전용 아닌)는 진행도 표시 제외
      const counts = startPassives
        .filter(passive => (ULTIMATE_SKILLS[passive] || []).length > 0)
        .map(passive => {
          const ults = ULTIMATE_SKILLS[passive];
          const got = ults.filter(u => picked.includes(u.id)).length;
          return `${passive} ${got}/${ults.length}`;
        });
      if (counts.length === 0) return null;
      return `(${counts.join(' · ')})`;
    }
    case 'engravingsLvReached': {
      const engravings = meta?.engravings || {};
      const passing = Object.values(engravings).filter(e => (e?.lv || 1) >= condition.minLv).length;
      return `(${passing} / ${condition.classCount})`;
    }
    default:
      return null;
  }
}
