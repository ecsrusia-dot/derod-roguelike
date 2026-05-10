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
  ULTIMATE_SKILLS 
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

// 챔피언십 메타 보유 여부
export function hasChampionMeta(meta, level) {
  if (!meta || !meta.upgrades) return false;
  const id = level === 'normal' ? 'meta_champion_normal' : 'meta_champion_madness';
  return !!meta.upgrades[id];
}

// 챔피언십 메타: 시작 HP 보너스
export function getChampionshipMetaHp(meta) {
  let bonus = 0;
  if (hasChampionMeta(meta, 'normal')) bonus += 50;
  if (hasChampionMeta(meta, 'madness')) bonus += 100;
  return bonus;
}

// 챔피언십 메타: 시작 패시브 +Lv
export function getChampionshipMetaSkillBonus(meta) {
  let bonus = 0;
  if (hasChampionMeta(meta, 'normal')) bonus += 1;
  if (hasChampionMeta(meta, 'madness')) bonus += 2;
  return bonus;
}

// 챔피언십 메타: 시작 유물 +개수
export function getChampionshipMetaRelicBonus(meta) {
  if (hasChampionMeta(meta, 'madness')) return 1;
  return 0;
}

// 해금 여부
export function isUnlocked(meta, unlockId) {
  if (!meta || !meta.unlocks) return false;
  return meta.unlocks.includes(unlockId);
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
