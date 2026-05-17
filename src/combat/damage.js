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
} from '../utils/helpers.js';

export function calculateDamage(skill, attacker, defender, skills, isCrit, ultimates = [], meta = null, curses = [], activeSkills = null, relicStat = {}, engravingFx = {}) {
  if (skill.type === 'defense' || skill.type === 'buff') return { finalDmg: 0, defenseMitigated: 0, breakdown: [], isCrit: false };
  let base = Math.floor(skill.baseDmg[0] + Math.random() * (skill.baseDmg[1] - skill.baseDmg[0]));
  let dmg = base;
  let breakdown = [`기본 ${base}`];
  if (skill.type === 'physical') {
    const strBonus = Math.floor((attacker.근력 - 10) * 0.5);
    dmg += strBonus;
    if (strBonus > 0) breakdown.push(`근력 +${strBonus}`);
    // 강타 minor: 물리 데미지 +2/Lv
    const physBonus = getMinorBonus(skills, 'physDmg+', activeSkills);
    if (physBonus > 0) {
      dmg += physBonus;
      breakdown.push(`강타 +${physBonus}`);
    }
  } else if (skill.type === 'magic') {
    const intBonus = Math.floor((attacker.지능 - 10) * 0.7);
    dmg += intBonus;
    if (intBonus > 0) breakdown.push(`지능 +${intBonus}`);
    // 마력 minor: 마법 데미지 +4%/Lv
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
  if (skill.type === 'magic' && hasEffect(skills, 'magicDmg+25', activeSkills)) {
    const magicBonus = Math.floor(dmg * 0.25);
    dmg += magicBonus;
    breakdown.push(`마력 Lv.3 +${magicBonus}`);
  }
  // 마법 데미지 보너스 (현자의 서, 한기의 결정 등 magicDmg stat 보유 유물)
  if (skill.type === 'magic' && relicStat.magicDmg > 0) {
    const bookBonus = Math.floor(dmg * (relicStat.magicDmg / 100));
    dmg += bookBonus;
    if (bookBonus > 0) breakdown.push(`마법 데미지 +${bookBonus}`);
  }
  // 연옥지화: 화염 각인 보유 적 공격 시 마법 데미지 +20% (각인 부여 턴 미적용)
  // calculateDamage는 데미지 계산 후 부여이므로, defender.debuffs.igniteDmg > 0 = 이전 턴 부여된 각인
  if (skill.type === 'magic' && hasUltimate(ultimates, 'ult_purgatoryFire') && defender.debuffs?.igniteDmg > 0 && defender.debuffs?.igniteTurns > 0) {
    const purgatoryBonus = Math.floor(dmg * 0.2);
    dmg += purgatoryBonus;
    breakdown.push(`연옥지화 +${purgatoryBonus}`);
  }
  // 궁극 [정념 폭주] 마력_aetherStorm: 마법 데미지 ×2.0
  if (skill.type === 'magic' && hasUltimate(ultimates, 'ult_aetherStorm')) {
    // 기존 데미지만큼을 더해서 2배로 만듦
    const ultBonus = dmg; 
    dmg += ultBonus;
    breakdown.push(`★정념폭주 +${ultBonus} (2배)`);
  }
  // 궁극 [광기 각성] 잔혹_madness: HP 50% 이하 시 모든 데미지 +50%
  if (hasUltimate(ultimates, 'ult_madness') && attacker.hp <= attacker.maxHp * 0.5) {
    const ultBonus = Math.floor(dmg * 0.5);
    dmg += ultBonus;
    breakdown.push(`★광기각성 +${ultBonus}`);
  }
  // 강타 Lv.7: 기절(stunned)한 적에게 +50% 데미지
  if (defender.debuffs?.stunned > 0 && hasEffect(skills, 'shockExploit', activeSkills)) {
    const stunBonus = Math.floor(dmg * 0.5);
    dmg += stunBonus;
    breakdown.push(`강타 Lv.7 +${stunBonus}`);
  }
  // 1.27.0~ 각인: 물리 데미지 +N%
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
  // 5. 최종 데미지 계산 (소수점 버림)
  dmg = Math.floor(dmg * critMult);
  // 6. 로그 기록 (소수점 1자리까지 표시하여 가독성 확보)
  const critLabel = hasEffect(skills, 'weaknessPoint', activeSkills) ? '약점 간파' : '치명타';
  breakdown.push(`${critLabel} ×${critMult.toFixed(1)}`);
}
  // 메타 강화: 주는 데미지 +5%/단계
  const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+5%') * 0.05;
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
      dmg += Math.floor((attacker.근력 - 10) * 0.5);
      dmg += getMinorBonus(skills, 'physDmg+', activeSkills);
    } else if (skill.type === 'magic') {
      dmg += Math.floor((attacker.지능 - 10) * 0.7);
      const magicMinorPct = getMinorBonus(skills, 'magicDmg+', activeSkills);
      if (magicMinorPct > 0) dmg += Math.floor(dmg * (magicMinorPct / 100));
    }
    if (skill.berserker) {
      const hpRatio = attacker.hp / attacker.maxHp;
      dmg += Math.floor(dmg * (1 - hpRatio) * 0.5);
    }
    if (attacker.buffs?.rage > 0) dmg += Math.floor(dmg * 0.3);
    if (skill.type === 'magic' && hasEffect(skills, 'magicDmg+25', activeSkills)) {
      dmg += Math.floor(dmg * 0.25);
    }
    if (skill.type === 'magic' && hasUltimate(ultimates, 'ult_aetherStorm')) dmg *= 2;
    if (hasUltimate(ultimates, 'ult_madness') && attacker.hp <= attacker.maxHp * 0.5) {
      dmg += Math.floor(dmg * 0.5);
    }
    const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+5%') * 0.05;
    if (metaDmgBonus > 0) dmg += Math.floor(dmg * metaDmgBonus);
    const relicDmgPct = (relicStat.dmgDealt || 0) / 100;
    if (relicDmgPct > 0) dmg += Math.floor(dmg * relicDmgPct);
    if (hasCurse(curses, 'curse_dmgDealt-15')) dmg -= Math.floor(dmg * 0.15);
    // 1.27.0~ 각인: 물리 데미지 +N%
    if (skill.type === 'physical' && engravingFx.physDmgPct) {
      dmg += Math.floor(dmg * engravingFx.physDmgPct / 100);
    }
    return Math.max(0, dmg);
  };
  // hitCount 처리 (연속화살 등)
  const hits = skill.hitCount || 1;
  return [calcOne(skill.baseDmg[0]) * hits, calcOne(skill.baseDmg[1]) * hits];
}

export function rollCrit(skills, attacker, meta = null, activeSkills = null, relicStat = {}, ultimates = null, engravingFx = {}) {
  // 1. 기본 확률 + 민첩 보너스
  let critRate = 5 + Math.max(0, (attacker.민첩 - 10) * 0.5);

  // 2. 정밀 minor: 치명타율 +3%/Lv
  critRate += getMinorBonus(skills, 'critRate+', activeSkills);

  // 3. 메타 강화 및 유물 보너스
  critRate += getMetaBonus(meta, 'critRate+3%') * 3;
  critRate += relicStat.critRate || 0;

  // 4. ★ [심안] 7단계 효과 적용
  if (hasEffect(skills, 'weaknessPoint', activeSkills)) {
    critRate += 10;
  }
  // 화신강림: 폭발 후 다음 1턴 치명타 +20%
  if (attacker.buffs?.ifritCritNext) {
    critRate += 20;
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

export function rollDodge(skills, defender, activeSkills = null, relicStat = {}, ultimates = null, engravingFx = {}) {
  // 1. 민첩 보너스 (기본)
  let dodgeRate = Math.max(0, (defender.민첩 - 10) * 0.3);

  // 2. 회피 minor 스킬 보너스 (+3%/Lv)
  dodgeRate += getMinorBonus(skills, 'dodge+', activeSkills);

  // 3. 유물 보너스
  dodgeRate += relicStat.dodge || 0;

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
