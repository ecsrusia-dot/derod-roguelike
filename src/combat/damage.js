// ============================================
// combat/damage.js — 데미지 계산 및 회피/치명타 판정
// ============================================
// calculateDamage: 메인 데미지 계산 (방어, 치명, 효과 모두 포함)
// getDisplayDamage: UI 표시용 — 평균 데미지 (랜덤 범위는 평균값)
// rollCrit: 치명타 확률 판정
// rollDodge: 회피 확률 판정
// ============================================

import {
  getMinorBonus,
  hasEffect,
  hasUltimate,
  hasCurse,
  getMetaBonus,
  getAgilityCritDmgBonus,
} from '../utils/helpers.js';

export function calculateDamage(skill, attacker, defender, skills, isCrit, ultimates = [], meta = null, curses = [], activeSkills = null, relicStat = {}, engravingFx = {}) {
  if (skill.type === 'defense' || skill.type === 'buff') return { finalDmg: 0, defenseMitigated: 0, breakdown: [], isCrit: false };
  let base = Math.floor(skill.baseDmg[0] + Math.random() * (skill.baseDmg[1] - skill.baseDmg[0]));
  let dmg = base;
  let breakdown = [`기본 ${base}`];
  if (skill.type === 'physical') {
    // 1.44.1~ 근력 자동 가산: 절대값 → %로 변경. 포인트당 0.4%, 임계 없음.
    const strSigPct = (attacker.근력 || 0) * 0.4;
    if (strSigPct > 0) {
      const strBonus = Math.floor(dmg * strSigPct / 100);
      dmg += strBonus;
      if (strBonus > 0) breakdown.push(`근력 시그 +${strBonus}`);
    }
    // 강타 minor: 물리 데미지 +2/Lv (절대값)
    const physBonus = getMinorBonus(skills, 'physDmg+', activeSkills);
    if (physBonus > 0) {
      dmg += physBonus;
      breakdown.push(`강타 +${physBonus}`);
    }
    // 1.55.1~ 광폭 Lv.7: 물리 데미지 +15% (분노 보너스)
    if (hasEffect(skills, 'berserkRage', activeSkills)) {
      const rageBonus = Math.floor(dmg * 0.15);
      dmg += rageBonus;
      if (rageBonus > 0) breakdown.push(`광폭 +${rageBonus}`);
    }
    // 1.61.0~ 혈광 minor: 잃은 HP% × Lv × 0.5% 물리 데미지 (만렙 Lv.7 = 잃은%×3.5%)
    const bloodLv = (skills && skills['혈광']) || 0;
    if (bloodLv > 0 && (!activeSkills || activeSkills.includes('혈광'))) {
      const lostHpPct = Math.max(0, 100 - (attacker.hp / Math.max(1, attacker.maxHp)) * 100);
      const bloodPct = lostHpPct * bloodLv * 0.5 / 100;
      if (bloodPct > 0) {
        const bloodBonus = Math.floor(dmg * bloodPct);
        if (bloodBonus > 0) {
          dmg += bloodBonus;
          breakdown.push(`혈광 +${bloodBonus}`);
        }
      }
    }
    // 1.61.0~ 혈광 Lv.3 bloodRageNext buff: 다음 공격 데미지 +15% (자해 직후 1회 소비)
    if (attacker.buffs?.bloodRageNext) {
      const rageBonus = Math.floor(dmg * 0.15);
      if (rageBonus > 0) {
        dmg += rageBonus;
        breakdown.push(`혈광 분노 +${rageBonus}`);
      }
    }
  } else if (skill.type === 'magic') {
    // 1.44.1~ 지능 자동 가산: 절대값 → %로 변경. 포인트당 0.4%, 임계 없음.
    const intSigPct = (attacker.지능 || 0) * 0.4;
    if (intSigPct > 0) {
      const intBonus = Math.floor(dmg * intSigPct / 100);
      dmg += intBonus;
      if (intBonus > 0) breakdown.push(`지능 시그 +${intBonus}`);
    }
    // 마력 minor: 마법 데미지 +5%/Lv
    const magicMinorPct = getMinorBonus(skills, 'magicDmg+', activeSkills);
    if (magicMinorPct > 0) {
      const magicMinorBonus = Math.floor(dmg * (magicMinorPct / 100));
      dmg += magicMinorBonus;
      if (magicMinorBonus > 0) breakdown.push(`마력 +${magicMinorBonus}`);
    }
  }
  if (skill.berserker) {
    const hpRatio = attacker.hp / attacker.maxHp;
    const berserkBonus = Math.floor(dmg * (1 - hpRatio) * 0.5);
    dmg += berserkBonus;
    if (berserkBonus > 0) breakdown.push(`광폭 +${berserkBonus}`);
  }
  if (attacker.buffs?.rage > 0) {
    const rageBonus = Math.floor(dmg * 0.3);
    dmg += rageBonus;
    breakdown.push(`분노 +${rageBonus}`);
  }
  // 1.45.3: 마력 Lv.3 magicDmg+30 효과 폐기 (재시전 +5%로 변경됨)
  // 마법 데미지 보너스 (현자의 서, 한기의 결정 등 magicDmg stat 보유 유물)
  if (skill.type === 'magic' && relicStat.magicDmg > 0) {
    const bookBonus = Math.floor(dmg * (relicStat.magicDmg / 100));
    dmg += bookBonus;
    if (bookBonus > 0) breakdown.push(`마법 데미지 +${bookBonus}`);
  }
  // 연옥지화: 화염 각인 또는 겁화 보유 적 공격 시 마법 데미지 +20% (각인 부여 턴 미적용)
  // calculateDamage는 데미지 계산 후 부여이므로, defender.debuffs.igniteDmg > 0 = 이전 턴 부여된 각인
  // 1.29.0~ 겁화도 OR 조건으로 확장 — 시그니처 발동 직후 마법 공격도 보너스 받음 (단 겁화도 부여 턴 미적용)
  if (skill.type === 'magic' && hasUltimate(ultimates, 'ult_purgatoryFire')) {
    const hasIgnite = defender.debuffs?.igniteDmg > 0 && defender.debuffs?.igniteTurns > 0 && !defender.debuffs?.igniteJustApplied;
    const hasEternalFire = defender.debuffs?.eternalFireDmg > 0 && defender.debuffs?.eternalFireTurns > 0 && !defender.debuffs?.eternalFireJustApplied;
    if (hasIgnite || hasEternalFire) {
      const purgatoryBonus = Math.floor(dmg * 0.2);
      dmg += purgatoryBonus;
      breakdown.push(`연옥지화 +${purgatoryBonus}`);
    }
  }
  // 1.28.0~ 시그니처 [영겁의 화염] 후속 버프: 다음 2턴 마법 데미지 +N% (sage)
  if (skill.type === 'magic' && attacker.buffs?.flameBoostTurns > 0 && attacker.buffs?.flameBoostPct > 0) {
    const flameBonus = Math.floor(dmg * (attacker.buffs.flameBoostPct / 100));
    if (flameBonus > 0) {
      dmg += flameBonus;
      breakdown.push(`★영겁의 정념 +${flameBonus}`);
    }
  }
  // 강타 Lv.7: 기절(stunned)한 적에게 +50% 데미지
  if (defender.debuffs?.stunned > 0 && hasEffect(skills, 'shockExploit', activeSkills)) {
    const stunBonus = Math.floor(dmg * 0.5);
    dmg += stunBonus;
    breakdown.push(`강타 Lv.7 +${stunBonus}`);
  }
  // 1.27.0~ 각인: 물리 데미지 +N%
  // 1.46.0~ 각인: 마법 데미지 +N% (술법사 풀)
  if (skill.type === 'magic' && engravingFx.magicDmgPct) {
    const engBonus = Math.floor(dmg * engravingFx.magicDmgPct / 100);
    dmg += engBonus;
    if (engBonus !== 0) breakdown.push(`각인 ${engBonus >= 0 ? '+' : ''}${engBonus}`);
  }
  if (skill.type === 'physical' && engravingFx.physDmgPct) {
    const engBonus = Math.floor(dmg * engravingFx.physDmgPct / 100);
    if (engBonus !== 0) {
      dmg += engBonus;
      breakdown.push(`각인 ${engBonus >= 0 ? '+' : ''}${engBonus}`);
    }
  }
  // 1.27.0~ 각인: 회피 직후 다음 공격 데미지 +N% (afterDodgeDmg, attacker.buffs.afterDodgeDmgNext에 저장)
  if (engravingFx.afterDodgeDmg && attacker.buffs?.afterDodgeDmgNext) {
    const dodgeBonus = Math.floor(dmg * engravingFx.afterDodgeDmg / 100);
    if (dodgeBonus > 0) {
      dmg += dodgeBonus;
      breakdown.push(`★잔영 +${dodgeBonus}`);
    }
  }
if (isCrit) {
  // 1. 기본 치명타 배율 설정 (1.5배)
  let critMult = 1.5;
  // 2. 기존 [치명타 데미지 +30%] 패시브 체크 (+0.3)
  if (hasEffect(skills, 'critDmg+30', activeSkills)) {
    critMult += 0.3;
  }
  // 3. ★ [심안] 7단계 (weaknessPoint) 효과 체크 (+0.5)
  if (hasEffect(skills, 'weaknessPoint', activeSkills)) {
    critMult += 0.5;
  }
  // 4. 유물 보너스 합산
  critMult += (relicStat.critDmg || 0) / 100;
  // 5. 1.37.0~ 민첩 시그니처 1단계: 치명타 데미지 +2%/포인트 (민첩 11+)
  critMult += getAgilityCritDmgBonus(attacker) / 100;
  // 5-2. 1.44.2~ 메타 강화 「절명의 각인」: 치명타 데미지 +5%/단계
  critMult += getMetaBonus(meta, 'critDmg+5%') * 0.05;
  // 6. 최종 데미지 계산 (소수점 버림)
  dmg = Math.floor(dmg * critMult);
  // 7. 로그 기록 (소수점 1자리까지 표시하여 가독성 확보)
  const critLabel = hasEffect(skills, 'weaknessPoint', activeSkills) ? '약점 간파' : '치명타';
  breakdown.push(`${critLabel} ×${critMult.toFixed(1)}`);
}
  // 메타 강화: 주는 데미지 +2%/단계 (1.44.2~)
  const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+2%') * 0.02;
  if (metaDmgBonus > 0) {
    const bonus = Math.floor(dmg * metaDmgBonus);
    dmg += bonus;
    if (bonus > 0) breakdown.push(`강자의길 +${bonus}`);
  }
  // 유물: dmgDealt %
  const relicDmgPct = (relicStat.dmgDealt || 0) / 100;
  if (relicDmgPct > 0) {
    const bonus = Math.floor(dmg * relicDmgPct);
    dmg += bonus;
    if (bonus > 0) breakdown.push(`유물 +${bonus}`);
  }
  // 저주: 주는 데미지 -15%
  if (hasCurse(curses, 'curse_dmgDealt-15')) {
    const reduce = Math.floor(dmg * 0.15);
    dmg -= reduce;
    if (reduce > 0) breakdown.push(`저주 -${reduce}`);
  }
  
  let defenseMitigated = 0;
  // 정밀 Lv.3: 치명타 시 적 방어 50% 무시
  const critPierces = isCrit && hasEffect(skills, 'critPierce', activeSkills);
  const piercesArmor = skill.pierce || hasEffect(skills, 'pierceArmor', activeSkills);
  // 이프리트 minor: 방어 무시 (Tier 누적) +5 (Lv.3) +10 (Lv.5)
  const ifritLv = (skills && skills['이프리트']) || 0;
  let ifritDefIgnore = 0;
  if (ifritLv > 0 && (!activeSkills || activeSkills.includes('이프리트'))) {
    if (ifritLv >= 3) ifritDefIgnore += 5;
    if (ifritLv >= 5) ifritDefIgnore += 10;
  }
  // 이프리트 화신강림 궁극: 방어 무시 +25 추가
  if (hasUltimate(ultimates, 'ult_ifritDescent')) ifritDefIgnore += 25;
  if (defender.defense > 0 && !piercesArmor) {
    let effectiveDefense = defender.defense;
    if (critPierces) {
      effectiveDefense = Math.floor(effectiveDefense * 0.5);
      breakdown.push(`정밀 Lv.3 방어 50% 무시`);
    }
    if (ifritDefIgnore > 0) {
      effectiveDefense = Math.max(0, effectiveDefense - ifritDefIgnore);
      breakdown.push(`이프리트 방어 무시 -${ifritDefIgnore}`);
    }
    defenseMitigated = Math.min(effectiveDefense, dmg);
    if (defenseMitigated > 0) {
      breakdown.push(`적 방어 -${defenseMitigated}`);
    }
    dmg -= defenseMitigated;
  }
  return { finalDmg: Math.max(0, dmg), defenseMitigated, breakdown, isCrit };
}

// 스킬 버튼에 표시할 최종 데미지 범위 계산 (치명타 제외, 적 방어 무시)
// calculateDamage와 동일한 보정을 적용하지만 랜덤 없이 baseDmg 양 끝값으로
export function getDisplayDamage(skill, attacker, skills, ultimates, meta, curses, activeSkills, relicStat, engravingFx = {}) {
  if (!skill.baseDmg) return null;
  const calcOne = (base) => {
    let dmg = base;
    if (skill.type === 'physical') {
      // 1.44.1~ 근력 자동 가산 % 변환
      const strSigPct = (attacker.근력 || 0) * 0.4;
      if (strSigPct > 0) dmg += Math.floor(dmg * strSigPct / 100);
      dmg += getMinorBonus(skills, 'physDmg+', activeSkills);
      // 1.55.1~ 광폭 Lv.7: 물리 데미지 +15% (calculateDamage와 동일)
      if (hasEffect(skills, 'berserkRage', activeSkills)) dmg += Math.floor(dmg * 0.15);
    } else if (skill.type === 'magic') {
      // 1.44.1~ 지능 자동 가산 % 변환
      const intSigPct = (attacker.지능 || 0) * 0.4;
      if (intSigPct > 0) dmg += Math.floor(dmg * intSigPct / 100);
      const magicMinorPct = getMinorBonus(skills, 'magicDmg+', activeSkills);
      if (magicMinorPct > 0) dmg += Math.floor(dmg * (magicMinorPct / 100));
    }
    if (skill.berserker) {
      const hpRatio = attacker.hp / attacker.maxHp;
      dmg += Math.floor(dmg * (1 - hpRatio) * 0.5);
    }
    if (attacker.buffs?.rage > 0) dmg += Math.floor(dmg * 0.3);
    // 1.45.3: 마력 Lv.3 magicDmg+30 효과 폐기 (재시전 +5%로 변경됨)
    // 1.28.0~ 시그니처 [영겁의 화염] 후속 버프
    if (skill.type === 'magic' && attacker.buffs?.flameBoostTurns > 0 && attacker.buffs?.flameBoostPct > 0) {
      dmg += Math.floor(dmg * (attacker.buffs.flameBoostPct / 100));
    }
    const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+2%') * 0.02;
    if (metaDmgBonus > 0) dmg += Math.floor(dmg * metaDmgBonus);
    const relicDmgPct = (relicStat.dmgDealt || 0) / 100;
    if (relicDmgPct > 0) dmg += Math.floor(dmg * relicDmgPct);
    if (hasCurse(curses, 'curse_dmgDealt-15')) dmg -= Math.floor(dmg * 0.15);
    // 1.27.0~ 각인: 물리 데미지 +N%
    if (skill.type === 'physical' && engravingFx.physDmgPct) {
      dmg += Math.floor(dmg * engravingFx.physDmgPct / 100);
    }
    // 1.46.0~ 각인: 마법 데미지 +N% (술법사 풀)
    if (skill.type === 'magic' && engravingFx.magicDmgPct) {
      dmg += Math.floor(dmg * engravingFx.magicDmgPct / 100);
    }
    return Math.max(0, dmg);
  };
  // hitCount 처리 (연속화살 등)
  const hits = skill.hitCount || 1;
  return [calcOne(skill.baseDmg[0]) * hits, calcOne(skill.baseDmg[1]) * hits];
}

export function rollCrit(skills, attacker, meta = null, activeSkills = null, relicStat = {}, ultimates = null, engravingFx = {}) {
  // 1. 기본 확률 + 민첩 자동 가산 (1.42.0~ 민첩 × 0.5%/포인트, 임계 없음)
  let critRate = 5 + (attacker.민첩 || 0) * 0.5;

  // 2. 정밀 minor: 치명타율 +3%/Lv
  critRate += getMinorBonus(skills, 'critRate+', activeSkills);

  // 3. 메타 강화 및 유물 보너스 (1.44.2~ critRate +2%/단계)
  critRate += getMetaBonus(meta, 'critRate+2%') * 2;
  critRate += relicStat.critRate || 0;

  // 4. ★ [심안] 7단계 효과 적용
  if (hasEffect(skills, 'weaknessPoint', activeSkills)) {
    critRate += 10;
  }
  // 1.55.1~ 광폭 Lv.5: 치명타율 +15%
  if (hasEffect(skills, 'berserkCrit', activeSkills)) {
    critRate += 15;
  }
  // 1.61.0~ 혈광 Lv.5: HP 50% 이하 시 치명타율 +30%
  if (hasEffect(skills, 'bloodLow50Crit', activeSkills)) {
    const hpPct = (attacker.hp / Math.max(1, attacker.maxHp)) * 100;
    if (hpPct <= 50) {
      critRate += 30;
    }
  }
  // 화신강림: 폭발 후 다음 1턴 치명타 +30% (1.33.0~ 상향, 이전 +20%)
  if (attacker.buffs?.ifritCritNext) {
    critRate += 30;
  }

  // 5. 무영검 궁극: 치명타 +15% 정적 보너스 (명세 일치)
  if (hasUltimate(ultimates, 'ult_counterShadow')) {
    critRate += 15;
  }

  // 6. 1.27.0~ 각인: 치명타 확률 +N% (음수 = 결함 페널티)
  if (engravingFx.critRate) {
    critRate += engravingFx.critRate;
  }

  // 7. 최종 확률 판정
  return Math.random() * 100 < critRate;
}

export function rollDodge(skills, defender, activeSkills = null, relicStat = {}, ultimates = null, engravingFx = {}, meta = null) {
  // 1. 민첩 자동 가산 (1.42.0~ 민첩 × 0.3%/포인트, 임계 없음)
  let dodgeRate = (defender.민첩 || 0) * 0.3;

  // 2. 회피 minor 스킬 보너스 (+3%/Lv)
  dodgeRate += getMinorBonus(skills, 'dodge+', activeSkills);

  // 3. 유물 보너스 + 메타 강화 「유연한 그림자」 (1.44.2~ +2%/단계)
  dodgeRate += relicStat.dodge || 0;
  dodgeRate += getMetaBonus(meta, 'dodgeRate+2%') * 2;

  // 4. 기존 특정 스킬 효과 (회피+15)
  if (hasEffect(skills, 'dodge+15', activeSkills)) {
    dodgeRate += 15;
  }

  // 5. ★ [심안] 5단계 (detailIntent) 효과 적용 (각인 disableInsightPredict 결함 시 무효화)
  if (hasEffect(skills, 'detailIntent', activeSkills) && !engravingFx.disableInsightPredict) {
    dodgeRate += 10;
  }

  // 6. 인게임 버프 (예: 회피 물약, 스킬 버프 등)
  if (defender.buffs?.dodgeBuff > 0) {
    dodgeRate += defender.buffs.dodgeBuff;
  }
  // 명경지수 궁극: 반격 후 다음 턴 회피율 +30%
  if (defender.buffs?.mirrorDodgeNext > 0) {
    dodgeRate += defender.buffs.mirrorDodgeNext;
  }

  // 7. 명경지수 궁극: 회피율 +10% 정적 보너스 (명세 일치)
  if (hasUltimate(ultimates, 'ult_counterMirror')) {
    dodgeRate += 10;
  }

  // 8. 1.27.0~ 각인: 회피율 +N% (음수 = 결함 페널티)
  if (engravingFx.dodgeRate) {
    dodgeRate += engravingFx.dodgeRate;
  }

  // 9. 최종 확률 판정
  return Math.random() * 100 < dodgeRate;
}
