import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sword, Shield, Heart, Zap, Skull, Sparkles, Eye, Flame, Crown, BookOpen, Compass, ChevronRight, X, RefreshCw, Lock, Check, AlertTriangle } from 'lucide-react';

// ============================================
// 데로드앤데블랑 로그라이크 v0.4 - INTEGRATED
// 전체 게임 루프: 챕터 → 맵 → 노드 → 전투/사건 → 보상 → 다음 노드 → 보스 → 다음 챕터
// ============================================

function getSkillLevel(skills, skillName) {
  return skills[skillName] || 0; 
}

const PALETTE = {
  bg: '#0a0608', bgDeep: '#050304',
  panel: '#1a0e12', panelLight: '#241419', panelBorder: '#3d1f28',
  accent: '#c4453d', accentDim: '#7a2820',
  derod: '#d4a574', deblan: '#5c4a8c',
  text: '#e8d9c4', textDim: '#9b8975',
  ice: '#7ba3c4', blood: '#8b1f1f',
  green: '#7a9a5e', legendary: '#e8b04a',
  shock: '#e8b04a', bleed: '#8b1f1f', defense: '#7ba3c4',
};

// =========== 데이터 모듈 import ===========
// 모든 게임 콘텐츠 (적, 사건, 유물, 직업, 챕터, 패시브 등)는 derod_data.js에 있습니다.
// 콘텐츠를 추가/수정하려면 그 파일만 편집하세요.
import {
  PASSIVE_SKILLS,
  CLASSES,
  COMBAT_SKILLS,
  ENEMIES,
  CHAPTERS,
  EVENTS,
  RELICS,
  ULTIMATE_SKILLS,
  EXPEDITIONS,
  CURSES,
  META_UPGRADES,
  SOUL_REWARDS,
  PREP_CONFIG,
  buildRewardPool,
  SHOP_PRICES,
  GAME_CONFIG,
} from './data.js';
import { loadMeta, saveMeta, addSouls, applyUpgrade, applyUnlock, recordExpeditionClear } from './storage.js';

// 보상 풀은 PASSIVE_SKILLS와 RELICS를 합쳐 동적으로 빌드
const REWARD_POOL = buildRewardPool();

// 유물은 더 이상 패시브 Lv을 변경하지 않음 (스탯형으로 전환)
// 봉인 시스템은 활성 유물의 statBonus만 적용하는 방식으로 동작
function getEffectiveSkills(skills, relics, activeRelicNames = null) {
  return skills;
}

// 활성 유물에서 특정 스탯 보너스 합산
// statName: 'dmgDealt' | 'dmgTaken' | 'critRate' | 'critDmg' | 'dodge' | 'maxHp' 
//         | 'startGold' | 'startGem' | 'heal' | 'reflect' | 'lifesteal' | 'shieldOnStart'
function getActiveRelicStat(relics, activeRelicNames, statName) {
  if (!relics || relics.length === 0) return 0;
  let total = 0;
  relics.forEach(rel => {
    if (!rel.statBonus) return;
    // 봉인된 유물은 효과 0
    if (activeRelicNames && !activeRelicNames.includes(rel.name)) return;
    if (rel.statBonus[statName] !== undefined) {
      total += rel.statBonus[statName];
    }
  });
  return total;
}

// =========== 메타 헬퍼 ===========
// 보유 강화 단계로부터 효과 누적량 계산
function getMetaBonus(meta, effectType) {
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

// 해금 여부 확인
function isUnlocked(meta, unlockId) {
  if (!meta || !meta.unlocks) return false;
  return meta.unlocks.includes(unlockId);
}

// 강화 비용 계산 (다음 단계)
function getUpgradeCost(upgrade, currentStack) {
  if (typeof upgrade.cost === 'function') {
    return upgrade.cost(currentStack);
  }
  return upgrade.cost || 0;
}

// 강화 가능 여부
function canPurchaseUpgrade(meta, upgrade) {
  if (!upgrade) return false;
  // 1회성 해금: 이미 가졌으면 불가
  if (!upgrade.stackable) {
    if (meta.unlocks.includes(upgrade.id) || (meta.upgrades[upgrade.id] || 0) > 0) return false;
    // 사전 클리어 요구사항
    if (upgrade.requirePriorClear && !meta.clearedExpeditions.includes(upgrade.requirePriorClear)) return false;
    return true;
  }
  // 누적 강화: 최대 단계 도달 안 했으면 가능
  return (meta.upgrades[upgrade.id] || 0) < (upgrade.maxStacks || 999);
}

// 매번 제단 입장 시 풀에서 랜덤 N개 선택
function rollAltarSlots(meta, count = 3) {
  const available = META_UPGRADES.filter(u => canPurchaseUpgrade(meta, u));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 무작위 저주 N개 선택
function rollCurses(count) {
  if (count <= 0) return [];
  const shuffled = [...CURSES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CURSES.length));
}

// 저주 효과 적용 헬퍼
function hasCurse(curses, effectName) {
  if (!curses || curses.length === 0) return false;
  return curses.some(c => c.effect === effectName);
}


// - skills: 현재 보유 패시브 Lv 맵 (예: { 강타: 7 })
// - relics: 현재 보유 유물 배열
// - ultimates: 획득한 궁극 ID 배열 (예: ['강타_광역폭발'])
function rollRewards(count = 3, eliteBonus = false, skills = {}, relics = [], ultimates = []) {
  // 보상 풀 동적 필터링
  const filteredPool = REWARD_POOL.filter(r => {
    // 유물 중복 방지: 이미 보유한 유물은 풀에서 제외
    if (r.type === 'relic') {
      const owned = relics.some(rel => rel.name === r.name);
      if (owned) return false;
    }
    // 궁극 3개 모두 획득한 패시브는 보상 풀에서 영구 제외
    if (r.type === 'skill') {
      const skillUltimates = ULTIMATE_SKILLS[r.name];
      if (skillUltimates) {
        const acquiredCount = skillUltimates.filter(u => ultimates.includes(u.id)).length;
        if (acquiredCount >= 3) return false;
      }
    }
    return true;
  });

  const totalWeight = filteredPool.reduce((s, r) => s + r.weight, 0);
  const picked = [];
  const usedKeys = new Set();
  let attempts = 0;
  
  while (picked.length < count && attempts < 100) {
    attempts++;
    let r = Math.random() * totalWeight;
    for (const reward of filteredPool) {
      r -= reward.weight;
      if (r <= 0) {
        const key = `${reward.type}-${reward.name || reward.value}`;
        if (!usedKeys.has(key)) {
          let final = { ...reward };
          if (eliteBonus && (final.type === 'gold' || final.type === 'gem')) {
            final.value = Math.floor(final.value * 1.5);
          }
          
          // Lv.7 도달한 패시브가 또 등장하면 → 궁극 진화 카드로 변환
          if (final.type === 'skill' && skills[final.name] >= 7 && ULTIMATE_SKILLS[final.name]) {
            const availableUltimates = ULTIMATE_SKILLS[final.name].filter(u => !ultimates.includes(u.id));
            if (availableUltimates.length > 0) {
              // 랜덤 궁극 1개 선택
              const ult = availableUltimates[Math.floor(Math.random() * availableUltimates.length)];
              final = {
                type: 'ultimate',
                skillName: final.name,
                ultimate: ult,
                weight: reward.weight,
              };
            } else {
              // 이 패시브의 궁극은 다 가짐 → 다른 보상 시도
              continue;
            }
          }
          
          picked.push(final);
          usedKeys.add(key);
        }
        break;
      }
    }
  }
  return picked;
}

// =========== 노드 그래프 생성 ===========
// 보장 사항:
// 1. 시작 노드(layer 0)에서 모든 중간 노드까지 도달 가능
// 2. 모든 노드는 보스로 가는 경로가 존재
// 3. 모든 중간 레이어 노드는 최소 1개의 들어오는 엣지를 가짐
// 모든 챕터의 첫 노드 = 'prep' (전투 준비), 보스 직전 = 'rest' (정비)
function generateChapterMap(chapter, chapterIdx = 0) {
  // 더 큰 노드 수에 맞춰 layers 확대
  // 시작(1) + 중간(여러 layer) + 보스직전(1) + 보스(1)
  const layers = Math.max(5, Math.ceil(chapter.nodeCount / 2.8));
  const nodes = [];
  let id = 0;

  // Layer 0: 모든 챕터 첫 노드 = 'prep' (전투 준비)
  nodes.push({ id: id++, type: 'prep', layer: 0, x: 50, y: 95, completed: false, current: true, locked: false });

  // 중간 레이어 노드 타입 (rest 완전 제거)
  const types = ['battle', 'event', 'shop', 'unknown', 'elite'];
  const weights = [50, 24, 9, 14, 9];

  // 중간 레이어 (1 ~ layers-3) — 보스 직전 layer는 별도 처리
  for (let l = 1; l < layers - 2; l++) {
    const yPos = 95 - (l / (layers - 1)) * 85;
    // layer당 2~4개 노드 (기존 2~3 → 2~4)
    const r = Math.random();
    const nodeCount = r < 0.3 ? 2 : r < 0.75 ? 3 : 4;
    for (let i = 0; i < nodeCount; i++) {
      const xPos = (i + 1) * (100 / (nodeCount + 1)) + (Math.random() - 0.5) * 5;
      let rt = Math.random() * 100;
      let type = 'battle';
      for (let t = 0; t < types.length; t++) {
        rt -= weights[t];
        if (rt <= 0) { type = types[t]; break; }
      }
      nodes.push({ id: id++, type, layer: l, x: xPos, y: yPos, completed: false, current: false, locked: false });
    }
  }

  // 보스 직전 레이어 (layers-2): 정비 노드 1개 (모든 경로가 여기로 모임)
  const preBossY = 95 - ((layers - 2) / (layers - 1)) * 85;
  nodes.push({ id: id++, type: 'rest', layer: layers - 2, x: 50, y: preBossY, completed: false, current: false, locked: false });

  // 마지막 레이어: 보스 - 1개
  nodes.push({ id: id++, type: 'boss', layer: layers - 1, x: 50, y: 8, completed: false, current: false, locked: false });

  // 엣지 생성 (개선된 알고리즘)
  const edges = [];
  const edgeSet = new Set(); // 중복 방지
  const addEdge = (a, b) => {
    const key = `${a}-${b}`;
    if (!edgeSet.has(key)) {
      edges.push([a, b]);
      edgeSet.add(key);
    }
  };

  for (let l = 0; l < layers - 1; l++) {
    const cur = nodes.filter(n => n.layer === l);
    const next = nodes.filter(n => n.layer === l + 1);
    if (cur.length === 0 || next.length === 0) continue;

    // Phase 1: 각 cur 노드는 가장 가까운 next 노드와 연결 보장
    cur.forEach(c => {
      const sorted = [...next].sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x));
      addEdge(c.id, sorted[0].id);
      // 분기 가능성 (40%): 두 번째로 가까운 노드도 연결
      if (Math.random() < GAME_CONFIG.branchProbability && sorted.length > 1) {
        addEdge(c.id, sorted[1].id);
      }
    });

    // Phase 2: 모든 next 노드가 최소 1개의 들어오는 엣지를 갖도록 보장
    next.forEach(n => {
      const hasIncoming = edges.some(([_, b]) => b === n.id);
      if (!hasIncoming) {
        // 가장 가까운 cur 노드와 연결
        const sorted = [...cur].sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
        addEdge(sorted[0].id, n.id);
      }
    });
  }

  return { nodes, edges };
}

// =========== 패시브 트리거 헬퍼 ===========
// activeSkills: null이면 모든 보유 스킬 활성. 배열이면 그 이름들만 활성 (전투 준비 봉인 시스템)
function getActivePassives(skills, triggerType, activeSkills = null) {
  const active = [];
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv === 0 || !PASSIVE_SKILLS[name]) return;
    // 봉인 체크
    if (activeSkills && !activeSkills.includes(name)) return;
    Object.entries(PASSIVE_SKILLS[name].tiers).forEach(([tierLv, tierData]) => {
      if (lv >= Number(tierLv) && tierData.trigger === triggerType) {
        active.push({ skillName: name, tierLv: Number(tierLv), ...tierData });
      }
    });
  });
  return active;
}

function hasEffect(skills, effectName, activeSkills = null) {
  for (const trigger of ['passive', 'onCombatStart', 'onAttack', 'onTurnStart', 'onDodge', 'onLethal']) {
    if (getActivePassives(skills, trigger, activeSkills).some(p => p.effect === effectName)) return true;
  }
  return false;
}

// 궁극 효과 보유 여부 확인 (ultimates 배열에서 검색)
function hasUltimate(ultimates, effectName) {
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
function getMinorBonus(skills, effectType, activeSkills = null) {
  let total = 0;
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv === 0 || !PASSIVE_SKILLS[name]?.minorEffect) return;
    // 봉인 체크
    if (activeSkills && !activeSkills.includes(name)) return;
    if (PASSIVE_SKILLS[name].minorEffect.type === effectType) {
      total += PASSIVE_SKILLS[name].minorEffect.perLv * lv;
    }
  });
  return total;
}

function calculateDamage(skill, attacker, defender, skills, isCrit, ultimates = [], meta = null, curses = [], activeSkills = null, relicStat = {}) {
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
  if (defender.defense > 0 && !piercesArmor && skill.type !== 'magic') {
    let effectiveDefense = defender.defense;
    if (critPierces) {
      effectiveDefense = Math.floor(effectiveDefense * 0.5);
      breakdown.push(`정밀 Lv.3 방어 50% 무시`);
    }
    defenseMitigated = Math.min(effectiveDefense, dmg);
    dmg -= defenseMitigated;
  }
  return { finalDmg: Math.max(0, dmg), defenseMitigated, breakdown, isCrit };
}

function rollCrit(skills, attacker, meta = null, activeSkills = null, relicStat = {}) {
  // 1. 기본 확률 + 민첩 보너스
  let critRate = 5 + Math.max(0, (attacker.민첩 - 10) * 0.5);
  
  // 2. 정밀 minor: 치명타율 +3%/Lv
  critRate += getMinorBonus(skills, 'critRate+', activeSkills);
  
  // 3. 메타 강화 및 유물 보너스
  critRate += getMetaBonus(meta, 'critRate+3%') * 3;
  critRate += relicStat.critRate || 0;

  // 4. ★ [심안] 7단계 효과 적용
  // getSkillLevel 대신 기존에 정의된 hasEffect를 사용합니다.
  if (hasEffect(skills, 'weaknessPoint', activeSkills)) {
    critRate += 10;
  }

  // 5. 최종 확률 판정
  return Math.random() * 100 < critRate;
}

function rollDodge(skills, defender, activeSkills = null, relicStat = {}) {
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

  // 5. ★ [심안] 5단계 (detailIntent) 효과 적용
  // getSkillLevel 대신 hasEffect를 사용하여 일관성 유지
  if (hasEffect(skills, 'detailIntent', activeSkills)) {
    dodgeRate += 10;
  }

  // 6. 인게임 버프 (예: 회피 물약, 스킬 버프 등)
  if (defender.buffs?.dodgeBuff > 0) {
    dodgeRate += defender.buffs.dodgeBuff;
  }

  // 7. 최종 확률 판정
  return Math.random() * 100 < dodgeRate;
}

// =========== UI ===========
const NODE_TYPES = {
  battle: { icon: Skull, color: '#c4453d', label: '전투' },
  elite: { icon: Crown, color: '#e8b04a', label: '강적' },
  event: { icon: BookOpen, color: '#7ba3c4', label: '사건' },
  shop: { icon: Sparkles, color: '#5c4a8c', label: '상점' },
  rest: { icon: Flame, color: '#d4a574', label: '정비' },
  prep: { icon: Sword, color: '#9ad4a3', label: '준비' },
  unknown: { icon: Compass, color: '#9b8975', label: '미지' },
  boss: { icon: Crown, color: '#8b1f1f', label: '보스' },
};

function PhoneFrame({ children }) {
  // 모바일에서는 풀스크린, 데스크톱에서는 폰 프레임
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    // 모바일: 풀스크린 (폰 자체가 폰 프레임 역할)
    return (
      <div className="fixed inset-0 overflow-hidden" style={{
        background: PALETTE.bg,
        fontFamily: '"Noto Serif KR", serif',
      }}>
        <div className="absolute inset-0 pointer-events-none opacity-25" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }} />
        {children}
      </div>
    );
  }

  // 데스크톱: 폰 프레임으로 미리보기
  return (
    <div className="relative mx-auto" style={{
      width: '375px', height: '780px',
      background: PALETTE.bg,
      borderRadius: '36px',
      border: `8px solid ${PALETTE.bgDeep}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      fontFamily: '"Noto Serif KR", serif',
    }}>
      <div className="absolute inset-0 pointer-events-none opacity-25" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }} />
      {children}
    </div>
  );
}

// =========== 화면들 ===========

function TitleScreen({ meta, onStart, onAltar }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-8" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mt-8">
        <div className="text-xs tracking-[0.4em] mb-4" style={{ color: PALETTE.derod, opacity: 0.7 }}>
          DEROD &amp; DEBLAN
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-3" style={{
          color: PALETTE.text,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          textShadow: `0 0 30px ${PALETTE.accent}40`,
        }}>
          행복과<br/>불행 사이
        </h1>
        <div className="text-xs tracking-widest mt-4" style={{ color: PALETTE.textDim }}>
          ━━━ 텍스트 로그라이크 ━━━
        </div>
      </div>
      
      {/* 영혼 카운터 */}
      <div className="px-6 py-2 flex items-center gap-2" style={{
        background: `${PALETTE.deblan}20`,
        border: `1px solid ${PALETTE.deblan}80`,
      }}>
        <span style={{ color: PALETTE.deblan, fontSize: '20px' }}>✦</span>
        <span className="text-base font-bold tracking-wider" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
          {meta?.souls || 0}
        </span>
        <span className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>SOULS</span>
      </div>
      
      <div className="w-full flex flex-col gap-2.5">
        <button onClick={onStart} className="w-full py-3 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.accent}, ${PALETTE.accentDim})`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.derod}40`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.3em',
          fontSize: '14px',
          boxShadow: `0 0 20px ${PALETTE.accent}40`,
        }}>여정 시작</button>
        
        <button onClick={onAltar} className="w-full py-2.5 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.deblan}40, ${PALETTE.deblan}20)`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.deblan}`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.25em',
          fontSize: '12px',
        }}>★ 영혼의 제단</button>
      </div>
    </div>
  );
}

function ClassSelect({ meta, selected, onSelect, onNext, onBack }) {
  const cls = CLASSES[selected];
  const isClsLocked = (c) => c.locked && !isUnlocked(meta, c.unlockId);
  const clsLocked = isClsLocked(cls);
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3">
        <p className="text-center text-[11px] tracking-[0.4em] mb-3" style={{ color: PALETTE.textDim }}>
          ◆ 직업을 선택하세요 ◆
        </p>
        <div className="flex gap-1.5">
          {CLASSES.map((c, i) => {
            const lk = isClsLocked(c);
            return (
              <button key={c.id} onClick={() => onSelect(i)}
                className="flex-1 aspect-square flex items-center justify-center transition-all"
                style={{
                  background: selected === i ? `linear-gradient(135deg, ${c.color}30, ${c.color}10)` : 'rgba(255,255,255,0.02)',
                  border: selected === i ? `1.5px solid ${c.color}` : `1px solid ${PALETTE.panelBorder}`,
                  opacity: lk ? 0.45 : 1,
                }}>
                <span className="text-xl" style={{ color: selected === i ? c.color : PALETTE.textDim }}>
                  {lk ? '🔒' : (selected === i ? '◆' : '+')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 px-6 py-3 overflow-hidden">
        <div className="h-full relative overflow-hidden" style={{
          background: `linear-gradient(180deg, ${PALETTE.bgDeep}, ${cls.color}20 60%, ${cls.color}40)`,
          border: `1px solid ${cls.color}60`,
        }}>
          <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.12 }}>
            <div style={{ fontSize: '180px', color: cls.color, fontFamily: 'serif', textShadow: `0 0 40px ${cls.color}` }}>
              {cls.name[0]}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 text-center" style={{
            background: `linear-gradient(180deg, transparent, ${PALETTE.bgDeep}cc 40%, ${PALETTE.bgDeep})`,
          }}>
            <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: cls.color }}>{cls.sub}</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: cls.color, textShadow: `0 0 20px ${cls.color}80` }}>
              {cls.name}
            </h2>
            <p className="text-xs leading-relaxed mb-3" style={{ color: PALETTE.text }}>{cls.desc}</p>
            <div className="text-[11px] mb-2 flex flex-wrap justify-center gap-1.5">
              {Object.entries(cls.startSkills).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5" style={{
                  background: `${PASSIVE_SKILLS[k].color}30`,
                  color: PASSIVE_SKILLS[k].color,
                  border: `1px solid ${PASSIVE_SKILLS[k].color}60`,
                }}>{k} Lv.{v}</span>
              ))}
            </div>
            <div className="flex justify-around pt-2 border-t" style={{ borderColor: `${cls.color}30` }}>
              {Object.entries(cls.stats).map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                  <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`,
          color: PALETTE.textDim, letterSpacing: '0.2em', fontSize: '13px',
        }}>◂ 이전</button>
        <button onClick={onNext} disabled={clsLocked} className="py-3" style={{
          background: clsLocked 
            ? `${PALETTE.panel}` 
            : `linear-gradient(180deg, ${cls.color}40, ${cls.color}20)`,
          border: `1px solid ${clsLocked ? PALETTE.panelBorder : cls.color}`,
          color: clsLocked ? PALETTE.textDim : PALETTE.text,
          letterSpacing: '0.2em', fontSize: '13px',
          opacity: clsLocked ? 0.5 : 1,
        }}>{clsLocked ? '🔒 잠김' : '확정 ▸'}</button>
      </div>
    </div>
  );
}

function ExpeditionSelect({ meta, onSelect, onBack }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.textDim }}>
          ◆ 원정을 선택하세요 ◆
        </p>
        <p className="text-center text-xs mt-1" style={{ color: PALETTE.derod }}>각 원정은 4개 챕터로 구성됩니다</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {EXPEDITIONS.map((exp) => {
          const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
          const cleared = meta.clearedExpeditions?.includes(exp.id);
          return (
            <button key={exp.id} onClick={() => !locked && onSelect(exp)} disabled={locked}
              className="w-full text-left relative overflow-hidden transition-all"
              style={{
                background: locked
                  ? `linear-gradient(135deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`
                  : `linear-gradient(135deg, ${exp.color}25, ${PALETTE.bgDeep})`,
                border: `1px solid ${locked ? PALETTE.panelBorder : exp.color}`,
                opacity: locked ? 0.4 : 1,
              }}>
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] tracking-[0.2em] mb-0.5" style={{ color: exp.color, opacity: 0.7 }}>
                      EXPEDITION {exp.id} · {exp.sub}
                    </div>
                    <div className="text-base font-bold flex items-center gap-2" style={{ color: PALETTE.text }}>
                      {exp.name}
                      {cleared && <span className="text-[10px] px-1.5 py-0.5" style={{
                        background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                        border: `1px solid ${PALETTE.legendary}80`,
                      }}>CLEAR</span>}
                    </div>
                  </div>
                  {locked ? <Lock size={14} style={{ color: PALETTE.textDim }} />
                    : <ChevronRight size={16} style={{ color: exp.color }} />}
                </div>
                <p className="text-[11px] mb-2 leading-relaxed" style={{ color: PALETTE.textDim }}>{exp.desc}</p>
                
                {/* 난이도 정보 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {exp.enemyHpMult > 1 && (
                    <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.accent}20`, color: PALETTE.accent,
                    }}>적 HP ×{exp.enemyHpMult}</span>
                  )}
                  {exp.enemyDmgMult > 1 && (
                    <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.accent}20`, color: PALETTE.accent,
                    }}>적 데미지 ×{exp.enemyDmgMult}</span>
                  )}
                  {exp.curseCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.deblan}30`, color: PALETTE.deblan,
                    }}>저주 {exp.curseCount}개</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[10px]">
                  <div style={{ color: PALETTE.textDim }}>
                    클리어 보상 <span style={{ color: PALETTE.deblan }}>✦ {exp.soulReward}</span>
                  </div>
                  {locked && exp.unlockCost && (
                    <div style={{ color: PALETTE.textDim }}>
                      해금 <span style={{ color: PALETTE.deblan }}>✦ {exp.unlockCost}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="w-full py-2 text-[11px] tracking-[0.3em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
    </div>
  );
}

// =========== 영혼의 제단 ===========
function SoulAltar({ meta, onPurchase, onReroll, slots, onBack }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.deblan }}>
          ★ 영혼의 제단 ★
        </p>
        <div className="flex justify-center items-center gap-2 mt-2">
          <span style={{ color: PALETTE.deblan, fontSize: '16px' }}>✦</span>
          <span className="text-base font-bold" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
            {meta.souls}
          </span>
          <span className="text-[10px]" style={{ color: PALETTE.textDim }}>SOULS</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {slots.length === 0 ? (
          <div className="text-center py-8" style={{ color: PALETTE.textDim }}>
            <p className="text-sm mb-2">강화 가능한 항목이 없습니다</p>
            <p className="text-[11px]">새로운 원정을 클리어하여 더 많은 강화를 해금하세요</p>
          </div>
        ) : (
          slots.map((upgrade, idx) => {
            const stack = meta.upgrades[upgrade.id] || 0;
            const cost = getUpgradeCost(upgrade, stack);
            const canAfford = meta.souls >= cost;
            const isOwned = !upgrade.stackable && (meta.unlocks.includes(upgrade.id) || stack > 0);
            const isMaxed = upgrade.stackable && stack >= (upgrade.maxStacks || 999);
            const disabled = !canAfford || isOwned || isMaxed;
            
            return (
              <button key={`${upgrade.id}_${idx}`} onClick={() => !disabled && onPurchase(upgrade)} disabled={disabled}
                className="w-full text-left transition-all"
                style={{
                  background: disabled
                    ? `linear-gradient(135deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`
                    : `linear-gradient(135deg, ${upgrade.color}25, ${PALETTE.bgDeep})`,
                  border: `1px solid ${disabled ? PALETTE.panelBorder : upgrade.color}`,
                  opacity: disabled ? 0.5 : 1,
                }}>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="text-[9px] tracking-[0.2em]" style={{ color: upgrade.color, opacity: 0.7 }}>
                        {upgrade.category === 'unlock' ? 'UNLOCK' : 
                         upgrade.category === 'resource' ? 'RESOURCE' :
                         upgrade.category === 'combat' ? 'COMBAT' : 'EXPEDITION'}
                      </div>
                      <div className="text-sm font-bold mt-0.5" style={{ color: PALETTE.text }}>
                        {upgrade.name}
                        {upgrade.stackable && stack > 0 && (
                          <span className="text-[10px] ml-2" style={{ color: upgrade.color }}>
                            Lv.{stack}/{upgrade.maxStacks}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span style={{ color: PALETTE.deblan, fontSize: '12px' }}>✦</span>
                      <span className="text-sm font-bold" style={{
                        color: canAfford ? PALETTE.text : PALETTE.accent,
                      }}>{cost}</span>
                    </div>
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: PALETTE.textDim }}>{upgrade.desc}</p>
                  {isOwned && (
                    <div className="text-[10px] mt-1" style={{ color: PALETTE.legendary }}>✓ 획득 완료</div>
                  )}
                  {isMaxed && (
                    <div className="text-[10px] mt-1" style={{ color: PALETTE.legendary }}>✓ 최대 단계</div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      
      <div className="p-3 border-t flex gap-2" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onReroll} disabled={meta.souls < SOUL_REWARDS.rerollCost}
          className="flex-1 py-2.5 text-[11px] tracking-[0.2em] flex items-center justify-center gap-2" style={{
            background: meta.souls >= SOUL_REWARDS.rerollCost ? `${PALETTE.deblan}20` : 'transparent',
            border: `1px solid ${meta.souls >= SOUL_REWARDS.rerollCost ? PALETTE.deblan : PALETTE.panelBorder}`,
            color: meta.souls >= SOUL_REWARDS.rerollCost ? PALETTE.text : PALETTE.textDim,
            opacity: meta.souls >= SOUL_REWARDS.rerollCost ? 1 : 0.5,
          }}>
          <RefreshCw size={11} /> 새로고침 (✦{SOUL_REWARDS.rerollCost})
        </button>
        <button onClick={onBack} className="flex-1 py-2.5 text-[11px] tracking-[0.2em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
    </div>
  );
}

function MapView({ chapter, classData, mapData, hp, maxHp, gold, gem, expedition, curses = [], chapterIdx, onEnterNode, onOpenStatus, onBack }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{
        background: `linear-gradient(180deg, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 100%)`,
        borderBottom: `1px solid ${PALETTE.panelBorder}`,
      }}>
        <button onClick={onOpenStatus} className="w-9 h-9 flex items-center justify-center text-base font-bold" style={{
          background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.derod}`,
        }}>{classData.name[0]}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>HP</span>
            <div className="flex-1 h-1.5 relative" style={{ background: PALETTE.bgDeep, border: `1px solid ${PALETTE.panelBorder}` }}>
              <div className="absolute inset-y-0 left-0 transition-all" style={{
                width: `${(hp/maxHp)*100}%`,
                background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.accent})`,
              }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: PALETTE.text }}>{hp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: chapter.color }}>CH.{chapter.id}</span>
            <span className="text-[10px] flex-1" style={{ color: PALETTE.text }}>{chapter.name}</span>
          </div>
        </div>
        <div className="flex flex-col items-end text-[10px] gap-0.5">
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.ice }}>◆</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gem}</span></div>
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.derod }}>◉</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gold}</span></div>
        </div>
      </div>
      <div className="text-center py-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="flex items-center justify-center gap-2">
          {expedition && (
            <span className="text-[9px] tracking-[0.3em] px-1.5 py-0.5" style={{ 
              color: expedition.color, 
              background: `${expedition.color}20`,
              border: `1px solid ${expedition.color}80`,
            }}>{expedition.name}</span>
          )}
          <div className="text-[9px] tracking-[0.4em]" style={{ color: chapter.color }}>
            {expedition ? `Ch.${(chapterIdx || 0) + 1}/${expedition.chapters.length}` : chapter.sub}
          </div>
        </div>
        <div className="text-sm font-bold tracking-[0.2em] mt-0.5" style={{
          color: PALETTE.text, textShadow: `0 0 10px ${chapter.color}50`,
        }}>{chapter.name}</div>
        {/* 저주 뱃지 */}
        {curses && curses.length > 0 && (
          <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap px-2">
            {curses.map((c, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5" style={{
                color: c.color,
                background: `${c.color}15`,
                border: `1px solid ${c.color}50`,
              }} title={c.desc}>✦ {c.name}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 relative overflow-hidden" style={{
        background: `radial-gradient(ellipse at center top, ${chapter.color}15 0%, ${PALETTE.bgDeep} 70%)`,
      }}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {mapData.edges.map(([a, b], i) => {
            const na = mapData.nodes.find(n => n.id === a);
            const nb = mapData.nodes.find(n => n.id === b);
            if (!na || !nb) return null;
            const reachable = na.completed || na.current;
            const eitherLocked = na.locked || nb.locked;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={
                  eitherLocked ? '#2a1515'
                  : na.completed && nb.completed ? PALETTE.derod 
                  : reachable ? chapter.color 
                  : PALETTE.panelBorder
                }
                strokeWidth="0.3"
                strokeDasharray={na.completed && nb.completed ? "0" : "1.5 1"}
                opacity={eitherLocked ? 0.2 : reachable ? 0.6 : 0.3} />
            );
          })}
        </svg>
        {mapData.nodes.map(n => {
          const cfg = NODE_TYPES[n.type];
          const Icon = cfg.icon;
          const isCurrent = n.current;
          const isCompleted = n.completed;
          const isLocked = n.locked;  // 선택 안 한 형제 노드
          const isBoss = n.type === 'boss';
          const size = isBoss ? 48 : isCurrent ? 38 : 30;
          return (
            <button key={n.id} onClick={() => isCurrent && onEnterNode(n)} disabled={!isCurrent}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${size}px`, height: `${size}px` }}>
              {isCurrent && (
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: cfg.color, opacity: 0.4 }} />
              )}
              <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{
                background: isCompleted
                  ? `radial-gradient(circle, ${PALETTE.derod}30, ${PALETTE.bgDeep})`
                  : isCurrent
                    ? `radial-gradient(circle, ${cfg.color}40, ${PALETTE.bgDeep})`
                    : isLocked
                      ? `radial-gradient(circle, ${PALETTE.bgDeep}, #1a0a0a)`
                      : `radial-gradient(circle, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
                border: `${isBoss ? 2 : 1.5}px solid ${
                  isCompleted ? PALETTE.derod 
                  : isCurrent ? cfg.color 
                  : isLocked ? '#3a1f1f' 
                  : PALETTE.panelBorder
                }`,
                boxShadow: isCurrent ? `0 0 24px ${cfg.color}80` : isBoss ? `0 0 16px ${PALETTE.accent}60` : 'none',
                opacity: isLocked ? 0.4 : 1,
              }}>
                {isLocked
                  ? <X size={isBoss ? 18 : 14} style={{ color: '#5a3030' }} />
                  : !isCurrent && !isCompleted && !isBoss
                    ? <span className="text-base" style={{ color: PALETTE.textDim }}>?</span>
                    : <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.derod : cfg.color }} />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 border-t" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        <button onClick={onBack} className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>나가기</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>기록</button>
        <button onClick={onOpenStatus} className="py-2.5 text-[10px]" style={{ color: PALETTE.derod }}>스킬</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>도감</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>설정</button>
      </div>
    </div>
  );
}

// =========== 전투 화면 ===========
function CombatScreen({ classData, initialPlayer, initialSkills, initialUltimates = [], initialRelics = [], activeSkills = null, activeRelicNames = null, enemyKey, isBoss, expedition, curses = [], meta, onVictory, onDefeat }) {
  const [player, setPlayer] = useState(() => {
    let p = {
      ...initialPlayer, defense: 0, buffs: {}, debuffs: {}, cooldowns: {},
      ether: 3, maxEther: 3, firstHitImmune: false, revivedThisCombat: false,
    };
    // 메타 강화: 최대 에테르 +1
    if (meta) {
      const etherBonus = getMetaBonus(meta, 'maxEther+1');
      p.maxEther += etherBonus;
      p.ether += etherBonus;
    }
    // 저주: 에테르 -1
    if (hasCurse(curses, 'curse_ether-1')) {
      p.maxEther = Math.max(1, p.maxEther - 1);
      p.ether = Math.max(1, p.ether - 1);
    }
    return p;
  });
  const [enemy, setEnemy] = useState(() => {
    const e = ENEMIES[enemyKey];
    // 원정 능력치 배율
    const hpMult = expedition?.enemyHpMult || 1.0;
    const dmgMult = expedition?.enemyDmgMult || 1.0;
    const adjustedHp = Math.floor(e.hp * hpMult);
    // 패턴의 데미지에도 배율 적용
    const adjustedPatterns = (e.patterns || []).map(pat => ({
      ...pat,
      dmg: pat.dmg ? [Math.floor(pat.dmg[0] * dmgMult), Math.floor(pat.dmg[1] * dmgMult)] : pat.dmg,
    }));
    return { 
      ...e, key: enemyKey, 
      currentHp: adjustedHp, maxHp: adjustedHp, 
      patterns: adjustedPatterns,
      defense: 0, debuffs: {}, nextIntent: null 
    };
  });
  // 전투 준비 봉인 시스템 (이제 패스스루 — 유물이 패시브에 영향 없음)
  const skills = useMemo(() => 
    getEffectiveSkills(initialSkills, initialRelics, activeRelicNames),
    [initialSkills, initialRelics, activeRelicNames]
  );
  // 활성 유물의 모든 스탯 보너스를 단일 객체로 집계 (성능 최적화)
  const relicStat = useMemo(() => {
    const stats = {};
    const keys = ['dmgDealt', 'dmgTaken', 'critRate', 'critDmg', 'dodge', 'maxHp', 
                  'startGold', 'startGem', 'heal', 'reflect', 'lifesteal', 'shieldOnStart'];
    keys.forEach(k => stats[k] = getActiveRelicStat(initialRelics, activeRelicNames, k));
    return stats;
  }, [initialRelics, activeRelicNames]);
  const [ultimates] = useState(initialUltimates);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState('intro');
  const [log, setLog] = useState([]);
  const [animDmg, setAnimDmg] = useState({ player: null, enemy: null });
  const logEndRef = useRef(null);
  // 동기적 액션 락: setPhase는 비동기라 빠른 연타 시 race condition 발생.
  // 이 ref로 클릭 즉시 잠그고, 적 턴 종료 후 해제한다.
  const actionLockRef = useRef(false);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  useEffect(() => {
    const initialLog = [{ type: 'narrative', text: `━━ ${enemy.name}이(가) 나타났다 ━━` },
      { type: 'narrative', text: `「${enemy.desc}」` }];
    
    // 저주 표시
    if (curses && curses.length > 0) {
      curses.forEach(c => {
        initialLog.push({ type: 'debuff', text: `✦ [저주 · ${c.name}] ${c.desc}` });
      });
    }
    
    let newPlayer = { ...player };
    
    // 신앙 minor: 모든 능력치 +1/Lv (전투 동안만)
    const allStatsBonus = getMinorBonus(skills, 'allStats+', activeSkills);
    if (allStatsBonus > 0) {
      newPlayer.근력 = (newPlayer.근력 || 10) + allStatsBonus;
      newPlayer.민첩 = (newPlayer.민첩 || 10) + allStatsBonus;
      newPlayer.지능 = (newPlayer.지능 || 10) + allStatsBonus;
      newPlayer.매력 = (newPlayer.매력 || 10) + allStatsBonus;
      initialLog.push({ type: 'passive', text: `◆ [신앙 누적] 모든 능력치 +${allStatsBonus}` });
    }
    
    // 궁극 [운명의 저울] ult_destinyScale: 모든 능력치 +10
    if (hasUltimate(ultimates, 'ult_destinyScale')) {
      newPlayer.근력 = (newPlayer.근력 || 10) + 10;
      newPlayer.민첩 = (newPlayer.민첩 || 10) + 10;
      newPlayer.지능 = (newPlayer.지능 || 10) + 10;
      newPlayer.매력 = (newPlayer.매력 || 10) + 10;
      newPlayer.destinyScaleUses = 0;
      initialLog.push({ type: 'passive', text: `★ [운명의 저울] 모든 능력치 +10, 치명적 회피 0/2` });
    }
    
    // 수비 minor: 시작 방어 +5/Lv
    const minorDef = getMinorBonus(skills, 'startDef+', activeSkills);
    if (minorDef > 0) {
      newPlayer.defense += minorDef;
      initialLog.push({ type: 'passive', text: `◆ [수비 누적] 시작 방어 +${minorDef}` });
    }
    if (hasEffect(skills, 'startDefense+20', activeSkills)) {
      newPlayer.defense += 20;
      initialLog.push({ type: 'passive', text: `◆ [수비 Lv.3] 시작 방어 +20` });
    }
    // 유물: 전투 시작 시 방어 +
    if (relicStat.shieldOnStart > 0) {
      newPlayer.defense += relicStat.shieldOnStart;
      initialLog.push({ type: 'passive', text: `◆ [수호의 방패] 시작 방어 +${relicStat.shieldOnStart}` });
    }
    if (hasEffect(skills, 'heal20%', activeSkills)) {
      const heal = Math.floor(newPlayer.maxHp * 0.2);
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
      initialLog.push({ type: 'passive', text: `◆ [재생 Lv.5] HP ${heal} 회복` });
    }
    if (hasEffect(skills, 'firstHitImmune', activeSkills)) {
      newPlayer.firstHitImmune = true;
      initialLog.push({ type: 'passive', text: `◆ [회피 Lv.7] 첫 피격 무효 활성` });
    }
    
    // 저주: 시작 방어 0
    if (hasCurse(curses, 'curse_noDefense')) {
      newPlayer.defense = 0;
    }
    
    // 신앙 Lv.7: 수신사 등극 - 전투 시작 시 적에게 신탁 발동
    let oracleDebuffs = null;
    if (hasEffect(skills, 'oracleUser', activeSkills)) {
      oracleDebuffs = { bleed: 2, bleedTurns: 3, shockGauge: 100 };
      initialLog.push({ type: 'passive', text: `◆ [신앙 Lv.7] 수신사의 신탁! 적에게 출혈 3턴 + 기절 1턴` });
    }
    
    setPlayer(newPlayer);
    if (oracleDebuffs) {
      setEnemy(e => ({ ...e, debuffs: { ...e.debuffs, ...oracleDebuffs } }));
    }
    setLog(initialLog);
    setTimeout(() => {
      const patterns = enemy.patterns;
      setEnemy(e => ({ ...e, nextIntent: patterns[Math.floor(Math.random() * patterns.length)] }));
      setPhase('playerTurn');
    }, 600);
  }, []);

  const handlePlayerAction = (skillKey) => {
    if (phase !== 'playerTurn') return;
    if (actionLockRef.current) return;  // 동기 락 체크 - 처리 중이면 무시
    const skill = COMBAT_SKILLS[skillKey];
    if (!skill) return;
    if (player.cooldowns[skillKey] > 0) return;
    let etherCost = skill.cost || 0;
    if (etherCost > 0 && hasEffect(skills, 'etherCost-20', activeSkills)) etherCost = Math.max(0, etherCost - 1);
    if (etherCost > player.ether) return;

    // 모든 검증 통과 → 락 획득
    actionLockRef.current = true;

    const newLog = [...log, { type: 'player', text: `▸ ${skill.name}` }];
    let newPlayer = { ...player, ether: player.ether - etherCost };
    let newEnemy = { ...enemy };

    if (skill.selfDmg) {
      newPlayer.hp = Math.max(1, newPlayer.hp - skill.selfDmg);
      newLog.push({ type: 'system', text: `· 자신 HP -${skill.selfDmg}` });
    }

    if (skill.type === 'physical' || skill.type === 'magic') {
      // 마력 Lv.7: 마법 공격 시 50% 확률로 재시전 (총 2회 시전)
      // 궁극 [신탁 각성] ult_oracleAwaken: 100% 재시전
      // 1. 재시전 확률 및 횟수 설정 부분 수정
      const echoChance = hasUltimate(ultimates, 'ult_oracleAwaken') ? 1.0 : 0.5;
      const canEcho = skill.type === 'magic' && (hasEffect(skills, 'magicEcho', activeSkills) || hasUltimate(ultimates, 'ult_oracleAwaken'));
      const echoTimes = (canEcho && Math.random() < echoChance) ? 3 : 1;
      
      const hitCount = skill.hitCount || 1;
      let totalDmg = 0;
      let usedGuaranteedCrit = false;
      
      for (let echo = 0; echo < echoTimes; echo++) {
        if (echo > 0) {
          newLog.push({ type: 'passive', text: `◆ [마력 Lv.7] 마법 재시전! (${echo + 1}/3)` });
        }
        
        for (let i = 0; i < hitCount; i++) {
          let isCrit = rollCrit(skills, newPlayer, meta, activeSkills, relicStat);
          // 신앙 Lv.3: 다음 공격 치명타 확정 (한 번 사용)
          if (!usedGuaranteedCrit && newPlayer.buffs?.guaranteedCrit > 0) {
            isCrit = true;
            usedGuaranteedCrit = true;
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCrit: 0 };
            newLog.push({ type: 'passive', text: `◆ [신앙 Lv.3] 치명타 확정 발동` });
          }
          const dmgResult = calculateDamage(skill, newPlayer, newEnemy, skills, isCrit, ultimates, meta, curses, activeSkills, relicStat);
          let actualDmg = dmgResult.finalDmg;
          if (newEnemy.defense > 0 && !skill.pierce && skill.type !== 'magic') {
            newEnemy.defense = Math.max(0, newEnemy.defense - dmgResult.defenseMitigated);
          }
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg);
          totalDmg += actualDmg;
          
          const echoTag = (echo === 1) ? ' [재시전]' : '';
          newLog.push({
            type: 'damage',
            text: `· ${enemy.name}에게 ${actualDmg} 데미지${isCrit ? ' [치명타!]' : ''}${hitCount > 1 ? ` (${i+1}/${hitCount})` : ''}${echoTag}`,
            breakdown: dmgResult.breakdown.join(' / '),
          });
          
          // 작업 5: 매 히트마다 디버프 부여 (다단히트 누적)
          const attackPassivesPerHit = getActivePassives(skills, 'onAttack', activeSkills);
          attackPassivesPerHit.forEach(p => {
            if (p.effect === 'applyShockGauge') {
              let gaugeAdd = GAME_CONFIG.shockGaugeBase;
              if (hasEffect(skills, 'shockBonus', activeSkills)) gaugeAdd = GAME_CONFIG.shockGaugeBase + GAME_CONFIG.shockGaugeBonus;
              // 궁극 [광역 폭발] ult_shockBlast: 게이지 +60
              if (hasUltimate(ultimates, 'ult_shockBlast')) gaugeAdd = 60;
              if (newEnemy.debuffs?.shockResist > 0) {
                gaugeAdd = Math.floor(gaugeAdd * GAME_CONFIG.shockResistReduction);
              }
              const currentGauge = newEnemy.debuffs?.shockGauge || 0;
              let newGauge = currentGauge + gaugeAdd;
              if (newGauge >= 100) {
                newLog.push({ type: 'debuff', text: `◆ [${p.skillName} Lv.${p.tierLv}] 충격 ${currentGauge}+${gaugeAdd}=100! 기절!` });
                newEnemy.debuffs = { 
                  ...newEnemy.debuffs, 
                  stunned: 1, shockGauge: 0,
                  shockResist: GAME_CONFIG.shockResistTurns,
                  shockResistTurns: GAME_CONFIG.shockResistTurns,
                  everStunned: true,  // 궁극 [영구 침묵] 추적용
                };
                if (hasEffect(skills, 'shockBonus', activeSkills)) {
                  const bonusDmg = 15;
                  newEnemy.currentHp = Math.max(0, newEnemy.currentHp - bonusDmg);
                  newLog.push({ type: 'damage', text: `· [강타 Lv.5] 기절 추가 데미지 ${bonusDmg}` });
                }
                // 궁극 [광역 폭발]: 기절 발동 시 추가 30 데미지
                if (hasUltimate(ultimates, 'ult_shockBlast')) {
                  newEnemy.currentHp = Math.max(0, newEnemy.currentHp - 30);
                  newLog.push({ type: 'damage', text: `★ [광역 폭발] 폭발 데미지 30` });
                }
                // 궁극 [즉시 처형] ult_shockExecute: 적 HP 25% 즉시 제거
                if (hasUltimate(ultimates, 'ult_shockExecute')) {
                  const execDmg = Math.floor(newEnemy.maxHp * 0.25);
                  newEnemy.currentHp = Math.max(0, newEnemy.currentHp - execDmg);
                  newLog.push({ type: 'damage', text: `★ [즉시 처형] HP 25% 제거 (${execDmg})` });
                }
              } else {
                newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: newGauge };
              }
            }
            if (p.effect === 'applyBleed') {
              const stacks = (newEnemy.debuffs?.bleed || 0);
              const newStacks = hasEffect(skills, 'bleedStack', activeSkills) ? Math.min(stacks + 1, 5) : 1;
              newEnemy.debuffs = { ...newEnemy.debuffs, bleed: newStacks, bleedTurns: 3 };
            }
            if (p.effect === 'execute') {
              // 궁극 [사형 선고] ult_deathSentence: HP 35% 이하, 30% 확률로 확장
              const execThreshold = hasUltimate(ultimates, 'ult_deathSentence') ? 0.35 : 0.2;
              const execChance = hasUltimate(ultimates, 'ult_deathSentence') ? 0.3 : 0.15;
              if (newEnemy.currentHp > 0 && newEnemy.currentHp <= newEnemy.maxHp * execThreshold && Math.random() < execChance) {
                newLog.push({ type: 'system', text: `◆ [잔혹 Lv.7] 즉사 발동!` });
                newEnemy.currentHp = 0;
              }
            }
          });
          
          if (newEnemy.currentHp <= 0) break;
        }
        if (newEnemy.currentHp <= 0) break;
      }
      
      setAnimDmg({ player: null, enemy: totalDmg });
      setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);

      // 강제 출혈 (피의 일격)
      if (skill.forceBleed) {
        newEnemy.debuffs = { ...newEnemy.debuffs, bleed: (newEnemy.debuffs?.bleed || 0) + 1, bleedTurns: 3 };
        newLog.push({ type: 'debuff', text: `· 출혈 부여` });
      }
      // 자가 회복 (사제 - 신성광선)
      if (skill.selfHeal) {
        let heal = skill.selfHeal;
        // 유물 heal % 보너스
        if (relicStat.heal > 0) heal = Math.floor(heal * (1 + relicStat.heal / 100));
        if (hasCurse(curses, 'curse_heal-50')) heal = Math.floor(heal * 0.5);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◇ HP +${heal}` });
      }
    }

    if (skill.type === 'defense') {
      newPlayer.defense += skill.defense;
      newLog.push({ type: 'system', text: `· 방어 +${skill.defense}` });
      if (skill.dodgeBuff) {
        newPlayer.buffs = { ...newPlayer.buffs, dodgeBuff: skill.dodgeBuff, dodgeBuffTurns: 1 };
      }
      // 자가 회복 (사제 - 가호)
      if (skill.selfHeal) {
        let heal = skill.selfHeal;
        // 유물 heal % 보너스
        if (relicStat.heal > 0) heal = Math.floor(heal * (1 + relicStat.heal / 100));
        if (hasCurse(curses, 'curse_heal-50')) heal = Math.floor(heal * 0.5);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◇ HP +${heal}` });
      }
    }
    if (skill.type === 'buff' && skill.buff === 'rage') {
      newPlayer.buffs = { ...newPlayer.buffs, rage: 3 };
      newLog.push({ type: 'system', text: `· 분노 발동! 3턴간 데미지 +30%` });
    }
    if (skill.cd > 0) {
      // 가속 minor: 쿨다운 -1턴 (Lv.4마다 누적)
      let cdReduce = Math.floor(getMinorBonus(skills, 'cdReduce+', activeSkills) / 4);
      // 궁극 [정념 폭주] ult_aetherStorm: 마법 스킬 쿨다운 -1
      if (skill.type === 'magic' && hasUltimate(ultimates, 'ult_aetherStorm')) cdReduce += 1;
      const finalCd = Math.max(0, skill.cd - cdReduce);
      if (finalCd > 0) newPlayer.cooldowns = { ...newPlayer.cooldowns, [skillKey]: finalCd };
    }
    // 궁극 [시간 역행] ult_timeRewind: 모든 마법 스킬 쿨다운 제거, 에테르 +1
    if (skill.type === 'magic' && hasUltimate(ultimates, 'ult_timeRewind')) {
      // 에테르 +1 (최대치 제한)
      newPlayer.ether = Math.min(newPlayer.maxEther || 3, newPlayer.ether + 1);
      
      // 모든 스킬 쿨다운 즉시 제거 (빈 객체로 초기화)
      newPlayer.cooldowns = {}; 
      
      newLog.push({ type: 'passive', text: `★ [시간 역행] 모든 마법 스킬 쿨다운 제거, 에테르 +1` });
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setLog(newLog);

    if (newEnemy.currentHp <= 0) {
      // 유물 lifesteal: 적 처치 시 HP 회복
      if (relicStat.lifesteal > 0) {
        const heal = relicStat.lifesteal;
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◆ [유물] 흡혈 +${heal}` });
        setPlayer(newPlayer);
      }
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'victory', text: `━━ ${enemy.name} 처치 ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
      }, 800);
      return;
    }
    // 즉시 phase 전환으로 버튼 그룹 숨김 (시각적 즉각 피드백)
    setPhase('enemyTurn');
    setTimeout(() => { executeEnemyTurn(newPlayer, newEnemy, newLog); }, 350);
  };

  const executeEnemyTurn = (curPlayer, curEnemy, curLog) => {
    const newLog = [...curLog];
    let newPlayer = { ...curPlayer };
    let newEnemy = { ...curEnemy };

    if (newEnemy.debuffs?.stunned > 0) {
      newLog.push({ type: 'debuff', text: `◆ ${enemy.name}이(가) 기절 상태로 행동 못 함` });
      // 기절 1턴 소모
      newEnemy.debuffs = { ...newEnemy.debuffs, stunned: 0 };
      setEnemy(newEnemy); setLog(newLog);
      setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 400);
      return;
    }

    const intent = curEnemy.nextIntent;
    if (!intent) { setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 300); return; }
    newLog.push({ type: 'enemy', text: `◂ ${enemy.name}: ${intent.name}` });

    if (intent.type === 'attack') {
      const dodged = rollDodge(skills, newPlayer, activeSkills, relicStat);
      if (dodged) {
        newLog.push({ type: 'system', text: `· 회피 성공!` });
        if (hasEffect(skills, 'counterAttack', activeSkills) && Math.random() < 0.5) {
          const counterDmg = Math.floor(15 + Math.random() * 10);
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - counterDmg);
          newLog.push({ type: 'damage', text: `◆ [회피 Lv.5] 반격 ${counterDmg} 데미지` });
        }
      } else {
        if (newPlayer.firstHitImmune) {
          newLog.push({ type: 'passive', text: `◆ [회피 Lv.7] 첫 피격 무효!` });
          newPlayer.firstHitImmune = false;
        } else {
          let dmg = Math.floor(intent.dmg[0] + Math.random() * (intent.dmg[1] - intent.dmg[0]));
          // 수비 Lv.7: 방어 게이지가 최대 HP의 50% 이상이면 받는 데미지 50% 차단
          if (hasEffect(skills, 'fortify', activeSkills) && newPlayer.defense >= newPlayer.maxHp * 0.5) {
            const blocked = Math.floor(dmg * 0.5);
            dmg -= blocked;
            if (blocked > 0) newLog.push({ type: 'passive', text: `◆ [수비 Lv.7] 요새화! 데미지 -${blocked}` });
          }
          if (newPlayer.defense > 0) {
            const absorbed = Math.min(newPlayer.defense, dmg);
            newPlayer.defense -= absorbed;
            dmg -= absorbed;
            if (absorbed > 0) newLog.push({ type: 'system', text: `· 방어 ${absorbed} 흡수` });
          }
          if (hasEffect(skills, 'dmgTaken-15', activeSkills) && dmg > 0) {
            const reduced = Math.floor(dmg * 0.15);
            dmg -= reduced;
            if (reduced > 0) newLog.push({ type: 'passive', text: `◆ [수비 Lv.5] 데미지 -${reduced}` });
          }
          // 메타 강화: 받는 데미지 -3%/단계
          const metaReduction = getMetaBonus(meta, 'dmgTaken-3%') * 0.03;
          if (metaReduction > 0 && dmg > 0) {
            const reduced = Math.floor(dmg * metaReduction);
            dmg -= reduced;
            if (reduced > 0) newLog.push({ type: 'passive', text: `◇ [강철의 의지] -${reduced}` });
          }
          // 유물: dmgTaken % (음수면 감소, 양수면 증가)
          if (relicStat.dmgTaken && dmg > 0) {
            const change = Math.floor(dmg * relicStat.dmgTaken / 100);
            dmg += change;
            if (change < 0) newLog.push({ type: 'passive', text: `◇ [유물] -${-change}` });
            else if (change > 0) newLog.push({ type: 'debuff', text: `· [유물 부작용] +${change}` });
          }
          // 유물: reflect % (받은 데미지의 일정 % 적에게 반사)
          if (relicStat.reflect > 0 && dmg > 0) {
            const reflectDmg = Math.floor(dmg * relicStat.reflect / 100);
            if (reflectDmg > 0) {
              newEnemy.currentHp = Math.max(0, newEnemy.currentHp - reflectDmg);
              newLog.push({ type: 'damage', text: `◆ [가시 갑옷] 반사 ${reflectDmg}` });
            }
          }
          // 저주: 받는 데미지 +15%
          if (hasCurse(curses, 'curse_dmgTaken+15') && dmg > 0) {
            const inc = Math.floor(dmg * 0.15);
            dmg += inc;
            newLog.push({ type: 'debuff', text: `✦ [저주] 데미지 +${inc}` });
          }
          // 궁극 [데블랑의 저주]: 받는 데미지 -25%
          if (hasUltimate(ultimates, 'ult_deblanCurse') && dmg > 0) {
            const reduced = Math.floor(dmg * 0.25);
            dmg -= reduced;
            if (reduced > 0) newLog.push({ type: 'passive', text: `★ [데블랑의 저주] 데미지 -${reduced}` });
            // 30% 확률로 적 자해
            if (Math.random() < 0.3) {
              const counterDmg = Math.floor(dmg * 0.5);
              newEnemy.currentHp = Math.max(0, newEnemy.currentHp - counterDmg);
              newLog.push({ type: 'passive', text: `★ [데블랑의 저주] 적 자해 ${counterDmg}` });
            }
          }
          if (dmg > 0) {
            // [체크] 이번 공격을 맞으면 죽는가?
            const isFatalDamage = newPlayer.hp - dmg <= 0;
          
            if (isFatalDamage) {
              // 1순위: [운명의 저울] - 치명타 상황에서만 횟수 차감 후 100% 회피
              if (hasUltimate(ultimates, 'ult_destinyScale') && (newPlayer.destinyScaleUses || 0) < 2) {
                newPlayer.destinyScaleUses = (newPlayer.destinyScaleUses || 0) + 1;
                newLog.push({ 
                  type: 'passive', 
                  text: `★ [운명의 저울] 치명적 피격 회피! (${newPlayer.destinyScaleUses}/2)` 
                });
                dmg = 0; // 데미지 무효화
              } 
              // 2순위: [신의 가호] - 30% 확률로 생존
              else if (hasEffect(skills, 'divineSave', activeSkills) && Math.random() < 0.3) {
                newLog.push({ type: 'passive', text: `◆ [신앙 Lv.5] 신의 가호!` });
                dmg = newPlayer.hp - 1; // 체력을 1로 만듦
              } 
              // 3순위: [부활] - 전투당 1회 체력 50% 회복
              else if (hasEffect(skills, 'revive', activeSkills) && !newPlayer.revivedThisCombat) {
                newPlayer.hp = Math.floor(newPlayer.maxHp * 0.5);
                newPlayer.revivedThisCombat = true;
                newLog.push({ type: 'passive', text: `◆ [재생 Lv.7] 부활!` });
                dmg = 0; // 데미지 무효화
              }
            }
          
            // 최종 데미지 적용 (위의 조건들에서 dmg가 0이 되었다면 실행되지 않음)
            if (dmg > 0) {
              newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
              newLog.push({ type: 'damageTaken', text: `· ${dmg} 데미지` });
              setAnimDmg({ player: dmg, enemy: null });
              setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);
            }
          }
        }
      }
    } else if (intent.type === 'defend') {
      newEnemy.defense += intent.defense;
      newLog.push({ type: 'system', text: `· 방어 자세 (+${intent.defense})` });
    }

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog);
    if (newPlayer.hp <= 0) {
      setTimeout(() => { 
        setLog(prev => [...prev, { type: 'defeat', text: `━━ 패배 ━━` }]); 
        setPhase('defeat'); 
        actionLockRef.current = false;  // 전투 종료 - 락 해제
      }, 800);
      return;
    }
    setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 400);
  };

  const endTurn = (curPlayer, curEnemy, curLog) => {
    const newLog = [...curLog];
    let newPlayer = { ...curPlayer };
    let newEnemy = { ...curEnemy };
    const newTurn = turn + 1;

    if (newEnemy.debuffs?.bleed > 0 && newEnemy.debuffs?.bleedTurns > 0) {
      // 잔혹 minor: 출혈 1스택당 데미지 +1/Lv
      const bleedBonus = getMinorBonus(skills, 'bleedDmg+', activeSkills);
      let bleedDmg = newEnemy.debuffs.bleed * (GAME_CONFIG.bleedDmgPerStack + bleedBonus);
      // 궁극 [피의 축제] ult_bloodFeast: 출혈 데미지 ×2
      if (hasUltimate(ultimates, 'ult_bloodFeast')) {
        bleedDmg *= 2;
      }
      newEnemy.currentHp = Math.max(0, newEnemy.currentHp - bleedDmg);
      newEnemy.debuffs = {
        ...newEnemy.debuffs,
        bleedTurns: newEnemy.debuffs.bleedTurns - 1,
        bleed: newEnemy.debuffs.bleedTurns - 1 <= 0 ? 0 : newEnemy.debuffs.bleed,
      };
      newLog.push({ type: 'debuff', text: `◆ 출혈 ${bleedDmg} 데미지${hasUltimate(ultimates, 'ult_bloodFeast') ? ' [×2 피의축제]' : ''}` });
      if (newEnemy.currentHp <= 0) {
        // 궁극 [피의 축제]: 출혈 처치 시 HP 30 흡수
        if (hasUltimate(ultimates, 'ult_bloodFeast')) {
          newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + 30);
          newLog.push({ type: 'passive', text: `★ [피의 축제] HP 30 흡수` });
          setPlayer(newPlayer);
        }
        setEnemy(newEnemy);
        setLog([...newLog, { type: 'victory', text: `━━ ${enemy.name} 처치 (출혈 사망) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;  // 전투 종료 - 락 해제
        return;
      }
    }
    
    // 충격 저항 디버프 턴 감소
    if (newEnemy.debuffs?.shockResistTurns > 0) {
      newEnemy.debuffs = {
        ...newEnemy.debuffs,
        shockResistTurns: newEnemy.debuffs.shockResistTurns - 1,
        shockResist: newEnemy.debuffs.shockResistTurns - 1 <= 0 ? 0 : newEnemy.debuffs.shockResist,
      };
    }

    Object.keys(newPlayer.cooldowns).forEach(k => {
      if (newPlayer.cooldowns[k] > 0) newPlayer.cooldowns[k]--;
    });
    if (newPlayer.buffs?.rage > 0) {
      newPlayer.buffs.rage--;
      if (newPlayer.buffs.rage === 0) newLog.push({ type: 'system', text: `· 분노 종료` });
    }
    if (newPlayer.buffs?.dodgeBuffTurns > 0) {
      newPlayer.buffs.dodgeBuffTurns--;
      if (newPlayer.buffs.dodgeBuffTurns === 0) newPlayer.buffs.dodgeBuff = 0;
    }
    newPlayer.ether = Math.min(newPlayer.maxEther, newPlayer.ether + 1);

    let extraTurnTriggered = false;
    let bestExtraTurnInterval = Infinity;
    let guaranteedCrit = false;
    getActivePassives(skills, 'onTurnStart', activeSkills).forEach(p => {
      if (p.effect === 'regenPerTurn') {
        let regen = 3;
        // 궁극 [데로드의 축복]: 회복 효과 +50%
        if (hasUltimate(ultimates, 'ult_derodBlessing')) regen = Math.floor(regen * 1.5);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + regen);
        newLog.push({ type: 'passive', text: `◆ [재생 Lv.3] HP +${regen}` });
      }
      if (p.effect === 'extraTurn' && p.interval && newTurn % p.interval === 0) {
        if (p.interval < bestExtraTurnInterval) {
          bestExtraTurnInterval = p.interval;
          extraTurnTriggered = true;
        }
      }
      if (p.effect === 'guaranteeCrit' && p.interval && newTurn % p.interval === 0) {
        guaranteedCrit = true;
        newPlayer.buffs = { ...newPlayer.buffs, guaranteedCrit: 1 };
        newLog.push({ type: 'passive', text: `◆ [신앙 Lv.3] 다음 공격 치명타 확정!` });
      }
    });
    
    // 궁극 [데로드의 축복]: 매 턴 HP +5
    if (hasUltimate(ultimates, 'ult_derodBlessing')) {
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + 5);
      newLog.push({ type: 'passive', text: `★ [데로드의 축복] HP +5` });
    }
    // 궁극 [영구 침묵] 강타_ult_perpetualStun: 매 턴 25% 확률로 적 기절
    if (hasUltimate(ultimates, 'ult_perpetualStun') && newEnemy.debuffs?.everStunned) {
      if (Math.random() < 0.25) {
        newEnemy.debuffs = { ...newEnemy.debuffs, stunned: 1 };
        newLog.push({ type: 'passive', text: `★ [영구 침묵] 적 기절!` });
      }
    }
    // 궁극 [운명의 저울]: 모든 능력치 +5 (전투 시작 한 번만, useEffect에서 처리)

    const patterns = newEnemy.patterns;
    newEnemy.nextIntent = patterns[Math.floor(Math.random() * patterns.length)];
    newPlayer.defense = Math.floor(newPlayer.defense * 0.5);
    newEnemy.defense = Math.floor(newEnemy.defense * 0.5);

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog); setTurn(newTurn);

    if (extraTurnTriggered) {
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'passive', text: `◆ [가속] 추가 턴!` }]);
        setPhase('playerTurn');
        actionLockRef.current = false;  // 플레이어 턴 시작 → 락 해제
      }, 350);
    } else {
      setTimeout(() => {
        setPhase('playerTurn');
        actionLockRef.current = false;  // 플레이어 턴 시작 → 락 해제
      }, 250);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.accent }}>━━ 전투 ━━</span>
        <span className="text-[10px] tabular-nums" style={{ color: PALETTE.derod }}>TURN {turn}</span>
      </div>
      <div className="px-3 py-2.5" style={{
        background: `linear-gradient(180deg, ${enemy.color}25, transparent)`,
        borderBottom: `1px solid ${enemy.color}40`,
      }}>
        <div className="flex justify-between items-center mb-1">
          <div>
            <span className="text-xs font-bold" style={{ color: enemy.color }}>{enemy.name}</span>
            {enemy.isBoss && <span className="ml-1 text-[9px] px-1" style={{ background: PALETTE.legendary, color: PALETTE.bgDeep }}>BOSS</span>}
          </div>
          <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>
            {enemy.currentHp}/{enemy.maxHp}
            {animDmg.enemy && <span className="ml-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.enemy}</span>}
          </span>
        </div>
        <div className="h-1.5 relative mb-1.5" style={{ background: PALETTE.bgDeep }}>
          <div className="absolute inset-y-0 left-0 transition-all" style={{
            width: `${(enemy.currentHp/enemy.maxHp)*100}%`,
            background: `linear-gradient(90deg, ${PALETTE.blood}, ${enemy.color})`,
          }} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {enemy.defense > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}30`, color: PALETTE.defense, border: `1px solid ${PALETTE.defense}60` }}>
              ◈ 방어 {enemy.defense}
            </span>
          )}
          {enemy.debuffs?.bleed > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.bleed}30`, color: PALETTE.bleed, border: `1px solid ${PALETTE.bleed}60` }}>
              ◆ 출혈 {enemy.debuffs.bleed} ({enemy.debuffs.bleedTurns}T)
            </span>
          )}
          {enemy.debuffs?.shockGauge > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.shock}30`, color: PALETTE.shock, border: `1px solid ${PALETTE.shock}60` }}>
              ⚡ 충격 {enemy.debuffs.shockGauge}/100
            </span>
          )}
          {enemy.debuffs?.stunned > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}40`, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}` }}>
              ✦ 기절 1T
            </span>
          )}
          {enemy.debuffs?.shockResist > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.textDim}30`, color: PALETTE.textDim, border: `1px solid ${PALETTE.textDim}60` }}>
              ◇ 충격 저항 ({enemy.debuffs.shockResistTurns}T)
            </span>
          )}
        </div>
        {/* 심안 3단계 이상일 때만 박스 자체가 나타남 */}
        {phase === 'playerTurn' && enemy.nextIntent && getSkillLevel(skills, '심안') >= 3 && (
          <div className="mt-1.5 px-2 py-1 flex items-center gap-2" style={{
            background: PALETTE.bgDeep, border: `1px dashed ${enemy.color}80`,
          }}>
            <AlertTriangle size={10} style={{ color: enemy.color }} />
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>[심안] 의도:</span>
        
            {/* 3단계(predictIntent): 행동 이름 공개 */}
            <span className="text-[10px] font-bold" style={{ color: PALETTE.text }}>
              {enemy.nextIntent.name}
            </span>
        
            {/* 5단계(detailIntent): 구체적인 수치(데미지/방어) 공개 */}
            {getSkillLevel(skills, '심안') >= 5 && (
              <div className="flex ml-auto gap-2">
                {enemy.nextIntent.dmg[1] > 0 && (
                  <span className="text-[10px] tabular-nums" style={{ color: enemy.nextIntent.heavy ? PALETTE.accent : PALETTE.textDim }}>
                    {enemy.nextIntent.dmg[0]}-{enemy.nextIntent.dmg[1]}
                  </span>
                )}
                {enemy.nextIntent.type === 'defend' && (
                  <span className="text-[10px]" style={{ color: PALETTE.defense }}>방어</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{
        background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)`,
      }}>
        {log.map((entry, i) => (
          <div key={i} className="text-[11px] leading-relaxed" style={{
            color: entry.type === 'narrative' ? PALETTE.text
              : entry.type === 'player' ? PALETTE.green
              : entry.type === 'enemy' ? PALETTE.accent
              : entry.type === 'damageTaken' ? PALETTE.accent
              : entry.type === 'system' ? PALETTE.textDim
              : entry.type === 'passive' ? PALETTE.derod
              : entry.type === 'debuff' ? PALETTE.bleed
              : entry.type === 'victory' ? PALETTE.legendary
              : entry.type === 'defeat' ? PALETTE.accent
              : PALETTE.text,
            fontStyle: entry.type === 'narrative' ? 'italic' : 'normal',
            paddingLeft: ['damage', 'damageTaken', 'system', 'passive', 'debuff'].includes(entry.type) ? '12px' : '0',
          }}>
            {entry.text}
            {entry.breakdown && (
              <span className="block text-[9px] opacity-60" style={{ paddingLeft: '12px' }}>({entry.breakdown})</span>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <div className="px-3 py-2 border-t" style={{ borderColor: PALETTE.panelBorder, background: `${classData.color}10` }}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold" style={{ color: classData.color }}>{classData.name}</span>
          <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>
            {animDmg.player && <span className="mr-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.player}</span>}
            {player.hp}/{player.maxHp}
          </span>
        </div>
        <div className="h-1.5 relative mb-1.5" style={{ background: PALETTE.bgDeep }}>
          <div className="absolute inset-y-0 left-0 transition-all" style={{
            width: `${(player.hp/player.maxHp)*100}%`,
            background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.green})`,
          }} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.deblan}30`, color: PALETTE.deblan, border: `1px solid ${PALETTE.deblan}60` }}>
            ✦ 에테르 {player.ether}/{player.maxEther}
          </span>
          {player.defense > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}30`, color: PALETTE.defense, border: `1px solid ${PALETTE.defense}60` }}>
              ◈ 방어 {player.defense}
            </span>
          )}
          {player.buffs?.rage > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.accent}30`, color: PALETTE.accent, border: `1px solid ${PALETTE.accent}60` }}>
              ☩ 분노 ({player.buffs.rage}T)
            </span>
          )}
          {player.firstHitImmune && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}30`, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}60` }}>
              ✦ 무적 1회
            </span>
          )}
        </div>
      </div>
      <div className="border-t p-2.5" style={{
        borderColor: PALETTE.panelBorder, background: `linear-gradient(180deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
      }}>
        {phase === 'intro' && <div className="text-center text-[11px] py-2" style={{ color: PALETTE.textDim }}>전투 준비 중...</div>}
        {phase === 'enemyTurn' && <div className="text-center text-[11px] py-2" style={{ color: PALETTE.accent }}>◂ 적의 턴 ◂</div>}
        {phase === 'playerTurn' && (
          <div className="grid grid-cols-3 gap-1.5">
            {classData.combatSkills.map(skillKey => {
              const skill = COMBAT_SKILLS[skillKey];
              if (!skill) return null;
              const onCd = (player.cooldowns[skillKey] || 0) > 0;
              let cost = skill.cost || 0;
              if (cost > 0 && hasEffect(skills, 'etherCost-20', activeSkills)) cost = Math.max(0, cost - 1);
              const noEther = cost > player.ether;
              const disabled = onCd || noEther;
              return (
                <button key={skillKey} onClick={() => handlePlayerAction(skillKey)} disabled={disabled}
                  className="py-2 transition-all flex flex-col items-center gap-0.5"
                  style={{
                    background: disabled ? PALETTE.bgDeep
                      : skill.type === 'physical' ? `${PALETTE.accent}20`
                      : skill.type === 'magic' ? `${PALETTE.deblan}20`
                      : skill.type === 'defense' ? `${PALETTE.ice}20`
                      : `${PALETTE.derod}20`,
                    border: `1px solid ${disabled ? PALETTE.panelBorder : skill.type === 'physical' ? PALETTE.accent : skill.type === 'magic' ? PALETTE.deblan : skill.type === 'defense' ? PALETTE.ice : PALETTE.derod}`,
                    color: disabled ? PALETTE.textDim : PALETTE.text,
                    opacity: disabled ? 0.5 : 1,
                  }}>
                  <span className="text-[11px] font-bold">{skill.name}</span>
                  <span className="text-[9px]" style={{ color: PALETTE.textDim }}>
                    {skill.type === 'defense' ? `+${skill.defense}` : skill.type === 'buff' ? '버프' : `${skill.baseDmg[0]}-${skill.baseDmg[1]}`}
                    {cost > 0 && ` ✦${cost}`}
                  </span>
                  {onCd && <span className="text-[9px]" style={{ color: PALETTE.accent }}>CD {player.cooldowns[skillKey]}</span>}
                </button>
              );
            })}
          </div>
        )}
        {phase === 'victory' && (
          <button onClick={() => onVictory(player.hp, enemy.drop)}
            className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
              background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
              border: `1px solid ${PALETTE.legendary}`, color: PALETTE.text,
            }}>▸ 보상 획득</button>
        )}
        {phase === 'defeat' && (
          <button onClick={() => onDefeat()} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
            background: `linear-gradient(180deg, ${PALETTE.accent}40, ${PALETTE.accent}20)`,
            border: `1px solid ${PALETTE.accent}`, color: PALETTE.text,
          }}>▸ 메인 메뉴로</button>
        )}
      </div>
    </div>
  );
}

// =========== 보상 선택 ===========
function RewardSelect({ rewards: initialRewards, gem, skills, relics, ultimates, activeSkills = null, onPick, onReroll, hasRerolled, isElite }) {
  const [rewards, setRewards] = useState(initialRewards);
  // 운명 Lv.3: 리롤 비용 -1
  const rerollCost = hasEffect(skills, 'rerollDiscount', activeSkills) ? GAME_CONFIG.rerollDiscountCost : GAME_CONFIG.rerollCost;

  const handleReroll = () => {
    if (hasRerolled || gem < rerollCost) return;
    // 운명 Lv.5: 보상 4중1
    const count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
    const newRewards = rollRewards(count, isElite, skills, relics, ultimates);
    setRewards(newRewards);
    onReroll(newRewards, rerollCost);
  };

  const renderReward = (r, idx) => {
    let title, desc, color, icon, currentLv, nextLv;
    if (r.type === 'ultimate') {
      // 궁극 진화 카드 - 가장 화려하게
      title = `★ ${r.ultimate.name}`;
      desc = `${r.skillName} 궁극 진화\n${r.ultimate.desc}\n⚠ ${r.skillName} Lv → 0 리셋, 관련 유물 소멸`;
      color = r.ultimate.color || PALETTE.legendary;
      icon = '☆';
    } else if (r.type === 'skill') {
      const sk = PASSIVE_SKILLS[r.name];
      currentLv = skills[r.name] || 0;
      nextLv = currentLv + 1;
      title = r.name;
      const tierKeys = Object.keys(sk.tiers).map(Number).sort();
      const nextTier = tierKeys.find(t => t > currentLv);
      // 다음 Lv이 마일스톤이면 마일스톤 효과를, 아니면 minor 효과를 보여줌
      if (nextTier && nextTier === nextLv) {
        desc = `★ ${sk.tiers[nextTier].text}`;
      } else if (sk.minorEffect) {
        desc = `${sk.minorEffect.desc}` + (nextTier ? ` (Lv.${nextTier}: ${sk.tiers[nextTier].text.substring(0, 20)}...)` : '');
      } else {
        desc = sk.desc;
      }
      color = sk.color; icon = '◈';
    } else if (r.type === 'stat') {
      title = `${r.name} +${r.value}`; desc = '영구 능력치 상승'; color = PALETTE.derod; icon = '↑';
    } else if (r.type === 'heal') {
      title = `회복 ${r.value}`; desc = '즉시 체력 회복'; color = PALETTE.green; icon = '+';
    } else if (r.type === 'heal_full') {
      title = '완전 회복'; desc = '최대 체력까지 회복'; color = PALETTE.legendary; icon = '+';
    } else if (r.type === 'relic') {
      title = r.name;
      desc = r.desc || `유물 · 스탯 효과`;
      color = r.color; icon = '◆';
    } else if (r.type === 'gold') {
      title = `은화 +${r.value}`; desc = '상점에서 사용'; color = PALETTE.derod; icon = '◉';
    } else if (r.type === 'gem') {
      title = `보석 +${r.value}`; desc = '리롤·부활에 사용'; color = PALETTE.ice; icon = '◆';
    }

    return (
      <button key={idx} onClick={() => onPick(r)}
        className="w-full text-left relative overflow-hidden transition-all hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${color}30, ${PALETTE.bgDeep})`,
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 20px ${color}30`,
        }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{
            background: `${color}20`, border: `1px solid ${color}80`,
            color, fontSize: '24px', fontWeight: 'bold',
          }}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: PALETTE.text }}>{title}</span>
              {r.type === 'skill' && (
                <span className="text-[10px] px-1.5 py-0.5" style={{
                  background: `${color}30`, color, border: `1px solid ${color}80`,
                }}>Lv.{currentLv} → Lv.{nextLv}</span>
              )}
              {r.type === 'ultimate' && (
                <span className="text-[10px] px-1.5 py-0.5 font-bold" style={{
                  background: `${color}40`, color: PALETTE.legendary,
                  border: `1px solid ${PALETTE.legendary}`,
                  letterSpacing: '0.1em',
                }}>★ ULTIMATE</span>
              )}
            </div>
            <p className="text-[11px] leading-snug whitespace-pre-line" style={{ color: PALETTE.textDim }}>{desc}</p>
          </div>
          <ChevronRight size={14} style={{ color, flexShrink: 0 }} />
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel}, ${PALETTE.bgDeep} 80%)`,
    }}>
      <div className="px-4 py-4 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[10px] tracking-[0.4em] mb-1" style={{ color: PALETTE.derod }}>◆ 운명의 갈림길 ◆</p>
        <p className="text-center text-base font-bold" style={{ color: PALETTE.text }}>하나의 길을 선택하라</p>
        <p className="text-center text-[11px] mt-1" style={{ color: PALETTE.textDim }}>
          {isElite ? '◆ 강적 보상 ◆' : '세 갈래 중 단 하나만 가질 수 있다'}
        </p>
      </div>
      <div className="flex-1 px-4 py-4 space-y-2.5 overflow-y-auto">
        {rewards.map((r, i) => renderReward(r, i))}
      </div>
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        {hasRerolled ? (
          <div className="text-center text-[11px] py-2" style={{ color: PALETTE.textDim }}>
            ◇ 운명은 한 번만 다시 짜여질 수 있다 ◇
          </div>
        ) : (
          <button onClick={handleReroll} disabled={gem < rerollCost}
            className="w-full py-2.5 flex items-center justify-center gap-2 transition-all"
            style={{
              background: gem >= rerollCost ? `${PALETTE.ice}20` : 'transparent',
              border: `1px solid ${gem >= rerollCost ? PALETTE.ice : PALETTE.panelBorder}`,
              color: gem >= rerollCost ? PALETTE.text : PALETTE.textDim,
              opacity: gem >= rerollCost ? 1 : 0.5,
            }}>
            <RefreshCw size={14} />
            <span className="text-xs tracking-[0.2em]">선택지 재배치</span>
            <span className="text-[10px]" style={{ color: PALETTE.ice }}>◆ {rerollCost}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// =========== 사건 화면 ===========
function EventScreen({ event, classData, stats, onResolve }) {
  const [stage, setStage] = useState('intro'); // intro | result
  const [resultData, setResultData] = useState(null);

  const handleChoice = (choice) => {
    let result = { text: '', reward: null, penalty: null };
    if (choice.cost) {
      result.text = `${choice.text} 선택...`;
      result.reward = choice.reward;
    } else if (choice.stat) {
      const statValue = stats[choice.stat] || 10;
      const diceMin = GAME_CONFIG.diceRoll.min;
      const diceMax = GAME_CONFIG.diceRoll.max;
      const dice = diceMin + Math.floor(Math.random() * (diceMax - diceMin + 1));
      const total = statValue + dice;
      const success = total >= choice.dc;
      const rollText = `[${choice.stat} 검정] ${statValue} + ${dice}(주사위) = ${total} vs DC ${choice.dc}`;
      if (success) {
        result.text = `${rollText} ... 성공!\n${choice.success.text}`;
        result.reward = choice.success.reward;
      } else {
        result.text = `${rollText} ... 실패\n${choice.fail.text}`;
        result.penalty = choice.fail.penalty;
        result.combat = choice.fail.combat;
      }
    } else {
      result.text = choice.result || choice.text;
      result.reward = choice.reward;
    }
    setResultData(result);
    setStage('result');
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{
        borderColor: PALETTE.panelBorder, background: PALETTE.panel,
      }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.ice }}>◆ 사건 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>{event.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{
        background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)`,
      }}>
        {stage === 'intro' && (
          <div>
            <p className="text-sm leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
              {event.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </p>
          </div>
        )}
        {stage === 'result' && resultData && (
          <div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: PALETTE.text }}>
              {resultData.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </p>
            {resultData.reward && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.derod}60`, background: `${PALETTE.derod}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.derod }}>◆ 보상</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {/* 기존 gold, heal 로직에 아래 항목들을 추가하세요 */}
                  {resultData.reward.type === 'gold' && `은화 +${resultData.reward.value}`}
                  {resultData.reward.type === 'heal' && `체력 ${resultData.reward.value} 회복`}
                  
                  {/* ★ 추가: 랜덤 유물 및 스킬 보상 텍스트 대응 */}
                  {resultData.reward.type === 'random_relic' && (
                    <span style={{ color: PALETTE.legendary }}>무작위 유물 1개 획득</span>
                  )}
                  {resultData.reward.type === 'skill_random_lv' && (
                    <span style={{ color: PALETTE.ice }}>무작위 패시브 숙련도 +1Lv</span>
                  )}
                  {/* 기타 보상 타입이 있다면 여기에 추가 */}
                </div>
              </div>
            )}
            {resultData.penalty && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}60`, background: `${PALETTE.accent}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 페널티</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {/* HP 감소 (기존) */}
                  {resultData.penalty.hp && `체력 ${resultData.penalty.hp}`}
                  
                  {/* 은화/보석 상실 (추가 가능성 대비) */}
                  {resultData.penalty.gold && `은화 ${resultData.penalty.gold}`}
                  {resultData.penalty.gem && `보석 ${resultData.penalty.gem}`}
                </div>
              </div>
            )}
            {resultData.combat && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}`, background: `${PALETTE.accent}20` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 전투 발생</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {/* 에러 방지를 위해 옵셔널 체이닝(?.) 추가 권장 */}
                  {ENEMIES[resultData.combat]?.name || '적'}이(가) 나타난다!
                </div>
          </div>
        )}
      </div>
      <div className="border-t p-3" style={{
        borderColor: PALETTE.panelBorder, background: `linear-gradient(180deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
      }}>
        {stage === 'intro' && (
          <div className="space-y-1.5">
            {event.choices.map((c, i) => (
              <button key={i} onClick={() => handleChoice(c)}
                className="w-full text-left px-3 py-2 text-xs transition-all hover:translate-x-1"
                style={{
                  background: c.stat ? `${PALETTE.ice}10` : c.cost ? `${PALETTE.derod}10` : 'transparent',
                  border: `1px solid ${c.stat ? PALETTE.ice : c.cost ? PALETTE.derod : PALETTE.panelBorder}40`,
                  color: PALETTE.text,
                }}>
                <div className="flex items-center justify-between">
                  <span>▸ {c.text}</span>
                  {c.stat && <span className="text-[10px]" style={{ color: PALETTE.ice }}>[{c.stat} DC{c.dc}]</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        {stage === 'result' && (
          <button onClick={() => onResolve(resultData)} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
            background: `linear-gradient(180deg, ${PALETTE.derod}40, ${PALETTE.derod}20)`,
            border: `1px solid ${PALETTE.derod}`, color: PALETTE.text,
          }}>▸ 여정을 계속한다</button>
        )}
      </div>
    </div>
  );
}

// =========== 야영 화면 ===========
function RestScreen({ classData, hp, maxHp, skills, relics, expedition, onChoice, onClose }) {
  const ownedSkills = Object.entries(skills)
    .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
    .map(([n]) => n);
  const maxSkillSelect = PREP_CONFIG.maxSkillSelect;
  const maxRelicSelect = expedition?.maxRelicSelect || 1;
  const canReselectSkills = ownedSkills.length > maxSkillSelect;
  const canReselectRelics = relics.length > maxRelicSelect;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.derod }}>◆ 정비 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>보스 직전</span>
      </div>
      <div className="flex-1 px-5 py-5 space-y-3 overflow-y-auto" style={{
        background: `radial-gradient(ellipse at center top, ${PALETTE.derod}15, ${PALETTE.bgDeep} 70%)`,
      }}>
        <p className="text-xs leading-relaxed italic mb-4" style={{ color: PALETTE.textDim }}>
          앞에 있을 적은 강력하다. 마지막 정비를 해야 할 시간.<br/>
          단 한 가지만 선택할 수 있다.
        </p>

        <button onClick={() => onChoice({ type: 'heal', value: Math.floor(maxHp * 0.2) })}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{ background: `${PALETTE.green}20`, border: `1px solid ${PALETTE.green}` }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.green }}>◇ 휴식</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            최대 체력의 20% 회복 (+{Math.floor(maxHp * 0.2)})
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'reselect_skills' })}
          disabled={!canReselectSkills}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{
            background: canReselectSkills ? `${PALETTE.derod}20` : 'transparent',
            border: `1px solid ${canReselectSkills ? PALETTE.derod : PALETTE.panelBorder}`,
            opacity: canReselectSkills ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.derod }}>◇ 패시브 재선택</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {canReselectSkills 
              ? `보유 패시브 ${ownedSkills.length}개 中 ${maxSkillSelect}개 다시 선택`
              : `보유 패시브가 ${maxSkillSelect}개 이하라 재선택 불필요`}
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'reselect_relics' })}
          disabled={!canReselectRelics}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{
            background: canReselectRelics ? `${PALETTE.legendary}20` : 'transparent',
            border: `1px solid ${canReselectRelics ? PALETTE.legendary : PALETTE.panelBorder}`,
            opacity: canReselectRelics ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.legendary }}>◇ 유물 재선택</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {canReselectRelics 
              ? `보유 유물 ${relics.length}개 中 ${maxRelicSelect}개 다시 선택`
              : `보유 유물이 ${maxRelicSelect}개 이하라 재선택 불필요`}
          </div>
        </button>
      </div>
    </div>
  );
}

// =========== 상점 ===========
function ShopScreen({ gold, skills, relics, ultimates, onBuy, onLeave }) {
  // 상점 재고: 유물·궁극·재화는 제외하고 다양한 카테고리로
  const [stock] = useState(() => {
    const initial = rollRewards(8, false, skills, relics, ultimates);
    // 유물/궁극/재화 제외, 4개만 추출
    return initial.filter(r => 
      r.type !== 'relic' && r.type !== 'ultimate' && 
      r.type !== 'gold' && r.type !== 'gem'
    ).slice(0, 4);
  });
  const [bought, setBought] = useState(new Set());

  const getPrice = (r) => {
    if (r.type === 'skill') return SHOP_PRICES.skill;
    if (r.type === 'stat') return SHOP_PRICES.stat;
    if (r.type === 'heal_full') return SHOP_PRICES.heal_full;
    if (r.type === 'heal') return r.value === 50 ? SHOP_PRICES.heal_50 : SHOP_PRICES.heal_100;
    return SHOP_PRICES.default;
  };

  const renderItem = (r, idx) => {
    const price = getPrice(r);
    const canAfford = gold >= price;
    const isBought = bought.has(idx);
    let title, color;
    if (r.type === 'skill') { title = `${r.name} +1Lv`; color = PASSIVE_SKILLS[r.name].color; }
    else if (r.type === 'stat') { title = `${r.name} +${r.value}`; color = PALETTE.derod; }
    else if (r.type === 'heal') { title = `회복 ${r.value}`; color = PALETTE.green; }
    else if (r.type === 'heal_full') { title = '완전 회복'; color = PALETTE.legendary; }
    else { title = `${r.type} +${r.value}`; color = PALETTE.derod; }

    return (
      <button key={idx} disabled={!canAfford || isBought}
        onClick={() => { onBuy(r, price); setBought(prev => new Set([...prev, idx])); }}
        className="w-full text-left px-3 py-2.5 transition-all"
        style={{
          background: isBought ? PALETTE.bgDeep : `${color}15`,
          border: `1px solid ${isBought ? PALETTE.panelBorder : color}`,
          opacity: isBought ? 0.4 : (canAfford ? 1 : 0.6),
        }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold" style={{ color: PALETTE.text }}>{title}</div>
            <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
              {isBought ? '구매 완료' : r.type === 'skill' ? PASSIVE_SKILLS[r.name].desc : ''}
            </div>
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: canAfford ? PALETTE.derod : PALETTE.accent }}>
            {isBought ? '✓' : `◉ ${price}`}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.deblan }}>◆ 상점 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>떠돌이 행상</span>
      </div>
      <div className="px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder, background: `${PALETTE.deblan}10` }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] italic" style={{ color: PALETTE.textDim }}>"운 좋은 날이군. 좋은 물건들이 있다네."</p>
          <span className="text-xs tabular-nums" style={{ color: PALETTE.derod }}>◉ {gold}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {stock.map((r, i) => renderItem(r, i))}
      </div>
      <div className="border-t p-3" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        <button onClick={onLeave} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>▸ 떠난다</button>
      </div>
    </div>
  );
}

// =========== 전투 준비 노드 ===========
// 보유 패시브 中 5개, 보유 유물 中 N개 (원정별) 선택 → 나머지 봉인
// =========== 전투 준비 / 재선택 노드 ===========
// mode: 'full' (둘 다) | 'skills' (패시브만) | 'relics' (유물만)
function PrepScreen({ skills, relics, ultimates, expedition, mode = 'full', currentActiveSkills = null, currentActiveRelicNames = null, onConfirm }) {
  // Lv > 0 인 보유 패시브 목록
  const ownedSkills = Object.entries(skills)
    .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
    .map(([n]) => n);
  
  const maxSkillSelect = PREP_CONFIG.maxSkillSelect;
  const maxRelicSelect = expedition?.maxRelicSelect || 1;
  
  const showSkills = mode === 'full' || mode === 'skills';
  const showRelics = mode === 'full' || mode === 'relics';
  
  // 보유 패시브가 max보다 적으면 자동 통과
  const skillsAutoPass = ownedSkills.length <= maxSkillSelect;
  // 보유 유물이 max보다 적으면 자동 통과
  const relicsAutoPass = relics.length <= maxRelicSelect;
  
  // 자동 통과면 모두 활성화. 비활성 영역은 기존 active 유지
  const initialSelectedSkills = !showSkills 
    ? new Set(currentActiveSkills || ownedSkills)
    : (skillsAutoPass ? new Set(ownedSkills) : new Set());
  const initialSelectedRelics = !showRelics
    ? new Set(currentActiveRelicNames || relics.map(r => r.name))
    : (relicsAutoPass ? new Set(relics.map(r => r.name)) : new Set());
  
  const [selectedSkills, setSelectedSkills] = useState(initialSelectedSkills);
  const [selectedRelics, setSelectedRelics] = useState(initialSelectedRelics);
  
  const toggleSkill = (name) => {
    if (skillsAutoPass || !showSkills) return;
    const newSet = new Set(selectedSkills);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else if (newSet.size < maxSkillSelect) {
      newSet.add(name);
    }
    setSelectedSkills(newSet);
  };
  
  const toggleRelic = (name) => {
    if (relicsAutoPass || !showRelics) return;
    const newSet = new Set(selectedRelics);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else if (newSet.size < maxRelicSelect) {
      newSet.add(name);
    }
    setSelectedRelics(newSet);
  };
  
  const skillsOk = !showSkills || skillsAutoPass || selectedSkills.size === maxSkillSelect;
  const relicsOk = !showRelics || relicsAutoPass || selectedRelics.size === maxRelicSelect || relics.length === 0;
  const canConfirm = skillsOk && relicsOk;
  
  const titleText = mode === 'skills' ? '패시브 재선택' :
                    mode === 'relics' ? '유물 재선택' : '전투 준비';
  const subText = mode === 'full' ? '이번 챕터 동안 활성화할 빌드를 선택합니다' :
                  mode === 'skills' ? '활성 패시브를 다시 고릅니다' : '활성 유물을 다시 고릅니다';
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-5 pb-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.derod }}>
          ◆ {titleText} ◆
        </p>
        <p className="text-center text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
          {subText}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {showSkills && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.derod }}>
              ◇ 활성 패시브
            </div>
            <div className="text-[10px]" style={{ 
              color: skillsAutoPass ? PALETTE.green : 
                     selectedSkills.size === maxSkillSelect ? PALETTE.green : PALETTE.textDim 
            }}>
              {skillsAutoPass ? `자동 (${ownedSkills.length}개)` : `${selectedSkills.size}/${maxSkillSelect}`}
            </div>
          </div>
          
          {ownedSkills.length === 0 ? (
            <div className="text-center py-4 text-[11px]" style={{ color: PALETTE.textDim }}>
              보유한 패시브가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {ownedSkills.map(name => {
                const sk = PASSIVE_SKILLS[name];
                const lv = skills[name];
                const isSelected = selectedSkills.has(name);
                const canSelect = skillsAutoPass || isSelected || selectedSkills.size < maxSkillSelect;
                return (
                  <button key={name} onClick={() => toggleSkill(name)}
                    disabled={!canSelect && !isSelected}
                    className="text-left px-2.5 py-2 transition-all"
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${sk.color}30, ${sk.color}10)`
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected 
                        ? `1.5px solid ${sk.color}`
                        : `1px solid ${PALETTE.panelBorder}`,
                      opacity: !canSelect && !isSelected ? 0.4 : 1,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold" style={{ color: isSelected ? sk.color : PALETTE.text }}>
                        {name}
                      </span>
                      <span className="text-[10px]" style={{ color: sk.color }}>Lv.{lv}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
        
        {showRelics && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.legendary }}>
              ◇ 활성 유물
            </div>
            <div className="text-[10px]" style={{ 
              color: relicsAutoPass ? PALETTE.green : 
                     selectedRelics.size === maxRelicSelect ? PALETTE.green : PALETTE.textDim 
            }}>
              {relicsAutoPass 
                ? (relics.length === 0 ? '없음' : `자동 (${relics.length}개)`)
                : `${selectedRelics.size}/${maxRelicSelect}`}
            </div>
          </div>
          
          {relics.length === 0 ? (
            <div className="text-center py-4 text-[11px]" style={{ color: PALETTE.textDim }}>
              보유한 유물이 없습니다
            </div>
          ) : (
            <div className="space-y-1.5">
              {relics.map((rel, i) => {
                const isSelected = selectedRelics.has(rel.name);
                const canSelect = relicsAutoPass || isSelected || selectedRelics.size < maxRelicSelect;
                return (
                  <button key={i} onClick={() => toggleRelic(rel.name)}
                    disabled={!canSelect && !isSelected}
                    className="w-full text-left px-3 py-2 transition-all"
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${rel.color}30, ${rel.color}10)`
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected 
                        ? `1.5px solid ${rel.color}`
                        : `1px solid ${PALETTE.panelBorder}`,
                      opacity: !canSelect && !isSelected ? 0.4 : 1,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold" style={{ color: isSelected ? rel.color : PALETTE.text }}>
                        {rel.name}
                      </span>
                      <span className="text-[10px]" style={{ color: PALETTE.textDim }}>
                        {rel.desc || ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
      
      <div className="p-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={() => onConfirm(Array.from(selectedSkills), Array.from(selectedRelics))}
          disabled={!canConfirm}
          className="w-full py-3 text-[12px] tracking-[0.3em]" style={{
            background: canConfirm 
              ? `linear-gradient(180deg, ${PALETTE.derod}40, ${PALETTE.derod}20)`
              : 'transparent',
            border: `1px solid ${canConfirm ? PALETTE.derod : PALETTE.panelBorder}`,
            color: canConfirm ? PALETTE.text : PALETTE.textDim,
            opacity: canConfirm ? 1 : 0.5,
          }}>
          {canConfirm 
            ? (mode === 'full' ? '여정 시작 ▸' : '확정 ▸')
            : '필요 개수만큼 선택하세요'}
        </button>
      </div>
    </div>
  );
}

// =========== 챕터 클리어 ===========
function ChapterClearScreen({ chapter, isLastChapter, onContinue }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{
      background: `radial-gradient(ellipse at center, ${chapter.color}25, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: chapter.color }}>━━ CHAPTER CLEAR ━━</div>
        <h2 className="text-3xl font-bold mb-2" style={{
          color: PALETTE.text, fontFamily: '"Cinzel", serif',
          textShadow: `0 0 20px ${chapter.color}80`,
        }}>{chapter.name}</h2>
        <p className="text-xs italic mt-3" style={{ color: PALETTE.textDim }}>{chapter.sub}</p>
      </div>
      <p className="text-sm text-center leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
        "한 챕터의 어둠이 걷힌다.<br/>
        여정은 아직 끝나지 않았다."
      </p>
      <div className="text-[11px] mb-8" style={{ color: PALETTE.derod }}>◇ 체력 회복 ◇</div>
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${chapter.color}40, ${chapter.color}20)`,
        border: `1px solid ${chapter.color}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 다음 챕터</button>
    </div>
  );
}

// =========== 원정 클리어 ===========
function ExpeditionClearScreen({ expedition, soulsGained, onContinue }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{
      background: `radial-gradient(ellipse at center, ${expedition.color}40, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mb-6">
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: PALETTE.legendary }}>━━ EXPEDITION CLEAR ━━</div>
        <h2 className="text-3xl font-bold mb-2" style={{
          color: PALETTE.legendary, fontFamily: '"Cinzel", serif',
          textShadow: `0 0 30px ${PALETTE.legendary}80`,
        }}>{expedition.name}</h2>
        <p className="text-xs italic mt-2" style={{ color: PALETTE.textDim }}>{expedition.sub}</p>
      </div>
      <p className="text-sm text-center leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
        "원정의 끝.<br/>
        영혼이 깃든다."
      </p>
      
      {/* 영혼 획득 카운터 */}
      <div className="mb-8 px-8 py-4 flex flex-col items-center" style={{
        background: `${PALETTE.deblan}30`,
        border: `1px solid ${PALETTE.deblan}`,
        boxShadow: `0 0 30px ${PALETTE.deblan}40`,
      }}>
        <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: PALETTE.deblan }}>SOULS GAINED</div>
        <div className="flex items-center gap-3">
          <span style={{ color: PALETTE.deblan, fontSize: '32px' }}>✦</span>
          <span className="text-4xl font-bold" style={{ 
            color: PALETTE.text, 
            fontFamily: '"Cinzel", serif',
            textShadow: `0 0 20px ${PALETTE.deblan}`,
          }}>+{soulsGained}</span>
        </div>
      </div>
      
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
        border: `1px solid ${PALETTE.legendary}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 메인 메뉴</button>
    </div>
  );
}

// =========== 사망 화면 ===========
function DefeatScreen({ chapter, soulsGained, onContinue }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.accent}30, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mb-6">
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: PALETTE.accent }}>━━ DEFEAT ━━</div>
        <h2 className="text-3xl font-bold mb-2" style={{
          color: PALETTE.accent, fontFamily: '"Cinzel", serif',
          textShadow: `0 0 30px ${PALETTE.accent}`,
        }}>죽음</h2>
        <p className="text-xs italic mt-2" style={{ color: PALETTE.textDim }}>
          {chapter ? `${chapter.name}에서 쓰러지다` : '여정의 끝'}
        </p>
      </div>
      <p className="text-sm text-center leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
        "영혼이 흩어진다.<br/>
        그러나 일부는 남는다."
      </p>
      
      {/* 영혼 (페널티 적용된) 획득 */}
      <div className="mb-8 px-8 py-4 flex flex-col items-center" style={{
        background: `${PALETTE.deblan}20`,
        border: `1px solid ${PALETTE.deblan}80`,
      }}>
        <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: PALETTE.deblan }}>
          SOULS RECOVERED · {Math.round(SOUL_REWARDS.deathPenalty * 100)}%
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: PALETTE.deblan, fontSize: '28px' }}>✦</span>
          <span className="text-3xl font-bold" style={{ 
            color: PALETTE.text, 
            fontFamily: '"Cinzel", serif',
          }}>+{soulsGained}</span>
        </div>
      </div>
      
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${PALETTE.accent}40, ${PALETTE.accentDim}40)`,
        border: `1px solid ${PALETTE.accent}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 메인 메뉴</button>
    </div>
  );
}

// =========== 상태창 ===========
function StatusPanel({ classData, hp, maxHp, skills, stats, relics, ultimates = [], activeSkills = null, activeRelicNames = null, onClose }) {
  const skillsByAxis = { attack: [], defense: [], utility: [] };
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv > 0 && PASSIVE_SKILLS[name]) {
      skillsByAxis[PASSIVE_SKILLS[name].axis].push({ name, lv, ...PASSIVE_SKILLS[name] });
    }
  });
  const axisNames = { attack: '공격', defense: '방어', utility: '유틸' };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>◆ 캐릭터 정보 ◆</span>
        <button onClick={onClose}><X size={16} style={{ color: PALETTE.textDim }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b" style={{
          background: `linear-gradient(180deg, ${classData.color}20, transparent)`,
          borderColor: PALETTE.panelBorder,
        }}>
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 flex items-center justify-center text-2xl font-bold" style={{
              background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.derod}`,
            }}>{classData.name[0]}</div>
            <div className="flex-1">
              <div className="text-[10px] tracking-[0.2em]" style={{ color: classData.color }}>{classData.sub}</div>
              <div className="text-base font-bold mb-1" style={{ color: PALETTE.text }}>{classData.name}</div>
              <div className="flex items-center gap-1">
                <Heart size={11} style={{ color: PALETTE.accent }} />
                <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>{hp}/{maxHp}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
            {Object.entries(stats).filter(([k]) => ['근력', '민첩', '지능', '매력'].includes(k)).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.derod }}>◆ 패시브 스킬</div>
          {Object.entries(skillsByAxis).map(([axis, list]) => (
            list.length > 0 && (
              <div key={axis} className="mb-3">
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>{axisNames[axis]} 축</div>
                <div className="space-y-1.5">
                  {list.map(sk => {
                    const tierKeys = Object.keys(sk.tiers).map(Number).sort();
                    const activeTiers = tierKeys.filter(t => t <= sk.lv);
                    const nextTier = tierKeys.find(t => t > sk.lv);
                    const isSealed = activeSkills && !activeSkills.includes(sk.name);
                    return (
                      <div key={sk.name} className="px-3 py-2" style={{
                        background: `${sk.color}10`, border: `1px solid ${sk.color}40`,
                        opacity: isSealed ? 0.4 : 1,
                      }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: sk.color }}>{sk.name}</span>
                            <span className="text-[10px] px-1.5" style={{
                              background: `${sk.color}30`, color: sk.color,
                            }}>Lv.{sk.lv} / {sk.maxLv}</span>
                            {isSealed && (
                              <span className="text-[9px] px-1.5 py-0.5" style={{
                                background: `${PALETTE.deblan}30`, color: PALETTE.deblan,
                                letterSpacing: '0.1em',
                              }}>봉인</span>
                            )}
                          </div>
                        </div>
                        <div className="h-1 mb-2" style={{ background: PALETTE.bgDeep }}>
                          <div className="h-full transition-all" style={{
                            width: `${(sk.lv / sk.maxLv) * 100}%`, background: sk.color,
                          }} />
                        </div>
                        {/* minorEffect 누적 표시 */}
                        {sk.minorEffect && (
                          <div className="text-[10px] flex items-start gap-1.5 mb-1" style={{ color: sk.color, opacity: 0.85 }}>
                            <span style={{ flexShrink: 0, marginTop: '0px' }}>◇</span>
                            <span>
                              {sk.minorEffect.desc} 
                              <span style={{ color: PALETTE.text, marginLeft: '4px', fontWeight: 'bold' }}>
                                (현재 +{sk.minorEffect.perLv * sk.lv})
                              </span>
                            </span>
                          </div>
                        )}
                        {activeTiers.length > 0 && (
                          <div className="space-y-0.5">
                            {activeTiers.map(t => (
                              <div key={t} className="text-[10px] flex items-start gap-1.5" style={{ color: PALETTE.text }}>
                                <Check size={9} style={{ color: sk.color, flexShrink: 0, marginTop: '2px' }} />
                                <span>Lv.{t}: {sk.tiers[t].text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {nextTier && (
                          <div className="text-[10px] flex items-start gap-1.5 mt-1" style={{ color: PALETTE.textDim }}>
                            <Lock size={9} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>Lv.{nextTier}: {sk.tiers[nextTier].text}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
        {ultimates.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.legendary }}>★ 궁극 스킬</div>
            <div className="space-y-1.5">
              {ultimates.map((ultId, i) => {
                let ultData = null;
                let skillName = '';
                for (const sn in ULTIMATE_SKILLS) {
                  const found = ULTIMATE_SKILLS[sn].find(u => u.id === ultId);
                  if (found) { ultData = found; skillName = sn; break; }
                }
                if (!ultData) return null;
                return (
                  <div key={i} className="px-3 py-2" style={{
                    background: `${ultData.color}15`, 
                    border: `1px solid ${ultData.color}`,
                    boxShadow: `0 0 8px ${ultData.color}40`,
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: PALETTE.legendary }}>★</span>
                      <span className="text-[12px] font-bold" style={{ color: ultData.color }}>{ultData.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5" style={{
                        background: `${PALETTE.legendary}30`, color: PALETTE.legendary,
                        letterSpacing: '0.1em',
                      }}>ULT</span>
                    </div>
                    <div className="text-[10px] leading-snug whitespace-pre-line" style={{ color: PALETTE.textDim }}>
                      {skillName} · {ultData.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {relics.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.derod }}>◆ 보유 유물</div>
            <div className="space-y-1.5">
              {relics.map((r, i) => {
                const isSealed = activeRelicNames && !activeRelicNames.includes(r.name);
                return (
                  <div key={i} className="px-3 py-2 flex items-center gap-2" style={{
                    background: `${r.color}10`, border: `1px solid ${r.color}40`,
                    opacity: isSealed ? 0.4 : 1,
                  }}>
                    <span className="text-base" style={{ color: r.color }}>◆</span>
                    <div className="flex-1">
                      <div className="text-[12px] font-bold flex items-center gap-2" style={{ color: PALETTE.text }}>
                        {r.name}
                        {isSealed && (
                          <span className="text-[9px] px-1.5 py-0.5" style={{
                            background: `${PALETTE.deblan}30`, color: PALETTE.deblan,
                            letterSpacing: '0.1em',
                          }}>봉인</span>
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
                        {r.desc || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========== Main App - 통합 게임 루프 ===========
export default function App() {
  const [screen, setScreen] = useState('title');
  const [selectedClass, setSelectedClass] = useState(0);
  const [chapter, setChapter] = useState(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [mapData, setMapData] = useState(null);
  const [hp, setHp] = useState(GAME_CONFIG.startHp);
  const [maxHp, setMaxHp] = useState(GAME_CONFIG.startHp);
  const [gold, setGold] = useState(GAME_CONFIG.startGold);
  const [gem, setGem] = useState(GAME_CONFIG.startGem);

  const classData = CLASSES[selectedClass];
  const [skills, setSkills] = useState({});
  const [stats, setStats] = useState({});
  const [relics, setRelics] = useState([]);
  const [ultimates, setUltimates] = useState([]);  // 획득한 궁극 ID 배열

  // 메타 진행 시스템
  const [meta, setMeta] = useState({ souls: 0, upgrades: {}, unlocks: [], clearedExpeditions: [] });
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [altarSlots, setAltarSlots] = useState([]);
  const [currentExpedition, setCurrentExpedition] = useState(null);
  const [currentCurses, setCurrentCurses] = useState([]);
  const [runSouls, setRunSouls] = useState(0);  // 이번 런에서 획득한 영혼 (사망 시 70%만 적용)
  
  // 전투 준비: 활성화된 패시브/유물 이름 배열 (null이면 모두 활성)
  // 첫 노드 (prep)에서 결정. 한 원정 내내 유지.
  const [activeSkills, setActiveSkills] = useState(null);
  const [activeRelicNames, setActiveRelicNames] = useState(null);
  // 재선택 모드: 'skills' | 'relics' | null
  const [reselectMode, setReselectMode] = useState(null);

  // 메타 데이터 로드 (앱 시작 시 한 번)
  useEffect(() => {
    loadMeta().then(data => {
      setMeta(data);
      setMetaLoaded(true);
    });
  }, []);

  // 메타 변경 시 자동 저장
  useEffect(() => {
    if (metaLoaded) {
      saveMeta(meta);
    }
  }, [meta, metaLoaded]);

  // 보상 시스템
  const [currentRewards, setCurrentRewards] = useState([]);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeNodeType, setActiveNodeType] = useState(null);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isEliteReward, setIsEliteReward] = useState(false);
  const [isBossReward, setIsBossReward] = useState(false);

  // 영혼의 제단 진입
  const enterAltar = () => {
    setAltarSlots(rollAltarSlots(meta, SOUL_REWARDS.altarSlots));
    setScreen('altar');
  };

  // 강화 구매
  const purchaseUpgrade = (upgrade) => {
    const stack = meta.upgrades[upgrade.id] || 0;
    const cost = getUpgradeCost(upgrade, stack);
    if (meta.souls < cost) return;
    
    let newMeta = { ...meta, souls: meta.souls - cost };
    if (upgrade.stackable) {
      newMeta = applyUpgrade(newMeta, upgrade.id);
    } else {
      newMeta = applyUnlock(newMeta, upgrade.id);
      newMeta = applyUpgrade(newMeta, upgrade.id);  // 1회성도 카운트로 추적
    }
    setMeta(newMeta);
    // 슬롯 새로고침 (구매한 항목 제거)
    setAltarSlots(rollAltarSlots(newMeta, SOUL_REWARDS.altarSlots));
  };

  // 제단 새로고침
  const rerollAltar = () => {
    if (meta.souls < SOUL_REWARDS.rerollCost) return;
    const newMeta = { ...meta, souls: meta.souls - SOUL_REWARDS.rerollCost };
    setMeta(newMeta);
    setAltarSlots(rollAltarSlots(newMeta, SOUL_REWARDS.altarSlots));
  };

  // 새로운 런 시작 (원정 선택 시)
  const startExpedition = (expedition) => {
    setCurrentExpedition(expedition);
    // 저주 부여
    const curses = rollCurses(expedition.curseCount);
    setCurrentCurses(curses);
    setRunSouls(0);
    
    // 활성 패시브/유물 초기화 (prep 노드에서 결정될 때까지 null = 모두 비활성)
    setActiveSkills(null);
    setActiveRelicNames(null);
    
    // 첫 챕터 시작
    const firstChapterIdx = expedition.chapters[0] - 1;
    initializeRun(CHAPTERS[firstChapterIdx], 0, expedition, curses);
  };

  // 새로운 런 시작
  const initializeRun = (chapterData, idx = 0, expeditionOverride = null, cursesOverride = null) => {
    const exp = expeditionOverride || currentExpedition;
    const curses = cursesOverride || currentCurses;
    
    if (idx === 0) {
      // 완전 새 런
      const baseSkills = { ...classData.startSkills };
      
      // 메타 강화: 시작 패시브 +1Lv
      const startSkillBonus = getMetaBonus(meta, 'startSkill+1');
      if (startSkillBonus > 0) {
        Object.keys(baseSkills).forEach(k => {
          baseSkills[k] = Math.min(baseSkills[k] + startSkillBonus, PASSIVE_SKILLS[k].maxLv);
        });
      }
      setSkills(baseSkills);
      setStats({ ...classData.stats });
      
      // 시작 HP 계산
      const hpBonus = getMinorBonus(baseSkills, 'maxHp+');
      const metaHpBonus = getMetaBonus(meta, 'startHp+10') * 10;
      let startHp = GAME_CONFIG.startHp + hpBonus + metaHpBonus;
      // 저주: 최대 HP -20%
      if (hasCurse(curses, 'curse_maxHp-20')) {
        startHp = Math.floor(startHp * 0.8);
      }
      setHp(startHp);
      setMaxHp(startHp);
      
      // 시작 자원 (메타 강화)
      let startGold = GAME_CONFIG.startGold + getMetaBonus(meta, 'startGold+20') * 20;
      let startGem = GAME_CONFIG.startGem + getMetaBonus(meta, 'startGem+3') * 3;
      // 저주: 시작 시 보석 없음
      if (hasCurse(curses, 'curse_noGem')) startGem = 0;
      setGold(startGold);
      setGem(startGem);
      
      // 시작 유물 (메타 강화)
      const startRelicCount = getMetaBonus(meta, 'startRelic+1');
      const startRelics = [];
      if (startRelicCount > 0) {
        const shuffled = [...RELICS].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(startRelicCount, shuffled.length); i++) {
          const relicReward = { type: 'relic', ...shuffled[i] };
          startRelics.push(relicReward);
          // 유물은 더 이상 패시브 Lv에 영향 없음 (스탯형으로 전환)
        }
      }
      setRelics(startRelics);
      setUltimates([]);
      
      // 유물 startGold/startGem 적용
      const relicStartGold = startRelics.reduce((sum, r) => sum + (r.statBonus?.startGold || 0), 0);
      const relicStartGem = startRelics.reduce((sum, r) => sum + (r.statBonus?.startGem || 0), 0);
      if (relicStartGold > 0) setGold(prev => prev + relicStartGold);
      if (relicStartGem > 0) setGem(prev => prev + relicStartGem);
      
      // 유물 maxHp% 보너스 적용
      const relicMaxHpPct = startRelics.reduce((sum, r) => sum + (r.statBonus?.maxHp || 0), 0);
      if (relicMaxHpPct > 0) {
        const bonus = Math.floor(startHp * relicMaxHpPct / 100);
        setMaxHp(prev => prev + bonus);
        setHp(prev => prev + bonus);
      }
    } else {
      // 다음 챕터 - HP 회복
      let healRatio = GAME_CONFIG.chapterHealRatio + getMetaBonus(meta, 'chapterHeal+10%') * 0.1;
      if (hasCurse(curses, 'curse_heal-50')) healRatio *= 0.5;
      setHp(prev => Math.min(maxHp, Math.floor(maxHp * healRatio)));
    }
    setHasRerolled(false);
    const map = generateChapterMap(chapterData, idx);
    setMapData(map);
    setChapter(chapterData);
    setChapterIdx(idx);
    setScreen('map');
  };

  // 노드 진입 분기
  const handleEnterNode = (node) => {
    setActiveNodeId(node.id);
    let nodeType = node.type;
    
    // 미지 노드는 진입 시 랜덤 결정 (rest 제거)
    if (nodeType === 'unknown') {
      const types = ['battle', 'event', 'shop'];
      nodeType = types[Math.floor(Math.random() * types.length)];
    }
    setActiveNodeType(nodeType);

    if (nodeType === 'battle') {
      const pool = chapter.enemies.normal;
      const enemyKey = pool[Math.floor(Math.random() * pool.length)];
      setCurrentEnemy(enemyKey);
      setIsEliteReward(false);
      setIsBossReward(false);
      setScreen('combat');
    } else if (nodeType === 'elite') {
      const pool = chapter.enemies.elite;
      const enemyKey = pool[Math.floor(Math.random() * pool.length)];
      setCurrentEnemy(enemyKey);
      setIsEliteReward(true);
      setIsBossReward(false);
      setScreen('combat');
    } else if (nodeType === 'boss') {
      setCurrentEnemy(chapter.enemies.boss);
      setIsBossReward(true);
      setIsEliteReward(false);
      setScreen('combat');
    } else if (nodeType === 'event') {
      // 현재 챕터에 적용 가능한 사건만 필터링
      const chapterId = chapter.id;
      const validEvents = EVENTS.filter(e => !e.chapter || e.chapter.includes(chapterId));
      const ev = validEvents.length > 0
        ? validEvents[Math.floor(Math.random() * validEvents.length)]
        : EVENTS[Math.floor(Math.random() * EVENTS.length)]; // 폴백
      setCurrentEvent(ev);
      setScreen('event');
    } else if (nodeType === 'shop') {
      setScreen('shop');
    } else if (nodeType === 'rest') {
      setScreen('rest');
    } else if (nodeType === 'prep') {
      setScreen('prep');
    }
  };
  
  // 전투 준비 완료 처리
  const handlePrepConfirm = (selSkills, selRelicNames) => {
    setActiveSkills(selSkills);
    setActiveRelicNames(selRelicNames);
    completeCurrentNode();
    setScreen('map');
  };

  // 노드 완료 처리 (같은 레이어의 다른 노드 잠금 + 다음 레이어 활성화)
  const completeCurrentNode = () => {
    if (!mapData || activeNodeId === null) return;
    
    const currentNode = mapData.nodes.find(n => n.id === activeNodeId);
    if (!currentNode) return;
    const currentLayer = currentNode.layer;
    
    // 1. 현재 노드 = completed, 같은 레이어의 다른 current 노드들 = locked (선택 못 함)
    const newNodes = mapData.nodes.map(n => {
      if (n.id === activeNodeId) return { ...n, completed: true, current: false };
      if (n.layer === currentLayer && n.current) {
        // 같은 레이어의 형제 노드 → 비활성화
        return { ...n, current: false, locked: true };
      }
      return n;
    });
    
    // 2. 다음 레이어에서, 완료한 노드와 연결된 노드만 활성화
    const nextNodeIds = mapData.edges
      .filter(([a]) => a === activeNodeId)
      .map(([_, b]) => b);
    nextNodeIds.forEach(nid => {
      const idx = newNodes.findIndex(n => n.id === nid);
      if (idx !== -1) newNodes[idx] = { ...newNodes[idx], current: true, locked: false };
    });
    
    setMapData({ ...mapData, nodes: newNodes });
  };

  // 전투 승리
  const handleVictory = (remainingHp, drop) => {
    setHp(remainingHp);
    
    // 드랍 적용 (저주: 획득 은화 -50%)
    if (drop?.gold) {
      let g = Math.floor(drop.gold[0] + Math.random() * (drop.gold[1] - drop.gold[0]));
      if (hasCurse(currentCurses, 'curse_gold-50')) g = Math.floor(g * 0.5);
      setGold(prev => prev + g);
    }
    if (drop?.gem) {
      const gm = Math.floor(drop.gem[0] + Math.random() * (drop.gem[1] - drop.gem[0]));
      setGem(prev => prev + gm);
    }
    
    // 영혼 획득: 일반=1, 엘리트=3, 보스=챕터별 5/8/12/20
    let soulGain = SOUL_REWARDS.normalKill;
    if (isBossReward) {
      const ci = currentExpedition ? chapterIdx : 0;
      soulGain = SOUL_REWARDS.bossKill[ci] || SOUL_REWARDS.bossKill[0];
    } else if (isEliteReward) {
      soulGain = SOUL_REWARDS.eliteKill;
    }
    setRunSouls(prev => prev + soulGain);

    // 보스라면 챕터 클리어로 (챕터 보너스도 추가)
    if (isBossReward) {
      const chapterBonus = SOUL_REWARDS.chapterClear[chapterIdx] || 5;
      setRunSouls(prev => prev + chapterBonus);
      completeCurrentNode();
      setScreen('chapterClear');
      return;
    }

    // 일반 전투/엘리트는 보상 화면으로
    // 운명 Lv.5: 보상 4중1 / 메타 강화 'reward+1' 도 적용
    let count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
    if (isUnlocked(meta, 'meta_extraReward')) count = Math.max(count, 4);
    const rewards = rollRewards(count, isEliteReward, skills, relics, ultimates);
    setCurrentRewards(rewards);
    setHasRerolled(false);
    setScreen('reward');
  };

  // 전투 패배
  const handleDefeat = () => {
    // 사망 페널티: 누적 영혼의 70%만 획득
    const recoveredSouls = Math.floor(runSouls * SOUL_REWARDS.deathPenalty);
    if (recoveredSouls > 0) {
      const newMeta = addSouls(meta, recoveredSouls);
      setMeta(newMeta);
    }
    setRunSouls(recoveredSouls);  // 화면 표시용
    setScreen('defeat');
  };

  // 보상 획득
  const handlePickReward = (reward) => {
    applyReward(reward);
    // 운명 minor: 보상 받을 때 추가 보석 +1/Lv
    const extraGem = getMinorBonus(skills, 'rewardChoice+', activeSkills);
    if (extraGem > 0) {
      setGem(prev => prev + extraGem);
    }
    completeCurrentNode();
    setScreen('map');
  };

  const applyReward = (reward) => {
    if (reward.type === 'ultimate') {
      // 궁극 진화: 패시브 Lv → 0 리셋, 궁극 ID 추가
      const skillName = reward.skillName;
      
      // 패시브 Lv을 0으로 리셋
      setSkills(prev => ({ ...prev, [skillName]: 0 }));
      
      // 궁극 ID 추가
      setUltimates(prev => [...prev, reward.ultimate.id]);
      
      // 재생이었다면 minor 보너스 HP는 잃음
      if (skillName === '재생') {
        const lostHp = PASSIVE_SKILLS['재생'].minorEffect.perLv * 7;
        setMaxHp(prev => Math.max(GAME_CONFIG.startHp, prev - lostHp));
        setHp(prev => Math.min(maxHp - lostHp, prev));
      }
    } else if (reward.type === 'skill') {
      // 재생 minor: 최대 HP +8/Lv (보상 획득 시도)
      if (reward.name === '재생' && (skills['재생'] || 0) < PASSIVE_SKILLS['재생'].maxLv) {
        const hpAdd = PASSIVE_SKILLS['재생'].minorEffect.perLv;
        setMaxHp(prev => prev + hpAdd);
        setHp(prev => prev + hpAdd);
      }
      setSkills(prev => ({
        ...prev,
        [reward.name]: Math.min((prev[reward.name] || 0) + 1, PASSIVE_SKILLS[reward.name].maxLv)
      }));
      // ★ 추가: 활성화 슬롯이 남았다면(5개 미만) 획득 즉시 활성화 목록에 추가
      setActiveSkills(prev => {
        const currentActive = prev || [];
        if (currentActive.length < PREP_CONFIG.maxSkillSelect && !currentActive.includes(reward.name)) {
          return [...currentActive, reward.name];
        }
        return currentActive;
      });
    } else if (reward.type === 'relic') {
      // 1. 유물 보유 목록 추가
      setRelics(prev => [...prev, reward]);
      
      // 2. 유물 즉시 효과(HP/골드/보석) 적용
      const stat = reward.statBonus || {};
      if (stat.maxHp) {
        const bonus = Math.floor(maxHp * stat.maxHp / 100);
        setMaxHp(prev => prev + bonus);
        setHp(prev => prev + bonus);
      }
      if (stat.startGold) setGold(prev => prev + stat.startGold);
      if (stat.startGem) setGem(prev => prev + stat.startGem);
  
      // ★ 추가: 유물 슬롯이 남았다면 즉시 활성화 목록에 추가
      setActiveRelicNames(prev => {
        const currentActive = prev || [];
        const maxRelicSelect = currentExpedition?.maxRelicSelect || 1;
        if (currentActive.length < maxRelicSelect && !currentActive.includes(reward.name)) {
          return [...currentActive, reward.name];
        }
        return currentActive;
      });
      
    } else if (reward.type === 'stat') {
      setStats(prev => ({ ...prev, [reward.name]: (prev[reward.name] || 10) + reward.value }));
      if (reward.name === '최대 체력') {
        setMaxHp(prev => prev + reward.value);
        setHp(prev => prev + reward.value);
      }
    } else if (reward.type === 'heal') {
      let healValue = reward.value;
      // 유물 heal % 보너스
      const relicHealPct = getActiveRelicStat(relics, activeRelicNames, 'heal');
      if (relicHealPct > 0) healValue = Math.floor(healValue * (1 + relicHealPct / 100));
      if (hasCurse(currentCurses, 'curse_heal-50')) healValue = Math.floor(healValue * 0.5);
      setHp(prev => Math.min(maxHp, prev + healValue));
    } else if (reward.type === 'heal_full') {
      if (hasCurse(currentCurses, 'curse_heal-50')) {
        setHp(prev => Math.min(maxHp, prev + Math.floor(maxHp * 0.5)));
      } else {
        setHp(maxHp);
      }
    } else if (reward.type === 'relic') {
      setRelics(prev => [...prev, reward]);
      // 유물의 maxHp% / startGold / startGem 즉시 적용
      const stat = reward.statBonus || {};
      if (stat.maxHp) {
        const bonus = Math.floor(maxHp * stat.maxHp / 100);
        setMaxHp(prev => prev + bonus);
        setHp(prev => prev + bonus);
      }
      if (stat.startGold) setGold(prev => prev + stat.startGold);
      if (stat.startGem) setGem(prev => prev + stat.startGem);
    } else if (reward.type === 'gold') {
      setGold(prev => prev + reward.value);
    } else if (reward.type === 'gem') {
      setGem(prev => prev + reward.value);
    }
  };

  const handleReroll = (newRewards, cost) => {
    setGem(prev => prev - (cost || GAME_CONFIG.rerollCost));
    setHasRerolled(true);
    setCurrentRewards(newRewards);
  };

  // 사건 결과 처리
  const handleEventResolve = (resultData) => {
    if (resultData.reward) {
      if (resultData.reward.type === 'gold') setGold(prev => prev + resultData.reward.value);
      else if (resultData.reward.type === 'heal') setHp(prev => Math.min(maxHp, prev + resultData.reward.value));
      else if (resultData.reward.type === 'random_relic') {
        // 보유한 유물은 제외 (중복 불가)
        const ownedNames = relics.map(r => r.name);
        const relicRewards = REWARD_POOL.filter(r => r.type === 'relic' && !ownedNames.includes(r.name));
        if (relicRewards.length > 0) {
          const r = relicRewards[Math.floor(Math.random() * relicRewards.length)];
          applyReward(r);
        } else {
          // 모든 유물을 이미 보유 → 영혼 보상으로 대체
          setGold(prev => prev + 80);
        }
      } else if (resultData.reward.type === 'skill_random_lv') {
        const ownedSkills = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
        if (ownedSkills.length > 0) {
          const [name] = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
          setSkills(prev => ({ ...prev, [name]: Math.min(prev[name] + 1, 7) }));
        }
      }
    }
    if (resultData.penalty?.hp) {
      setHp(prev => Math.max(1, prev + resultData.penalty.hp));
    }
    if (resultData.combat) {
      setCurrentEnemy(resultData.combat);
      setIsEliteReward(false); setIsBossReward(false);
      setScreen('combat');
      return;
    }
    completeCurrentNode();
    setScreen('map');
  };

  // 야영 선택
  const handleRestChoice = (choice) => {
    if (choice.type === 'heal') {
      let healValue = choice.value;
      const relicHealPct = getActiveRelicStat(relics, activeRelicNames, 'heal');
      if (relicHealPct > 0) healValue = Math.floor(healValue * (1 + relicHealPct / 100));
      if (hasCurse(currentCurses, 'curse_heal-50')) healValue = Math.floor(healValue * 0.5);
      setHp(prev => Math.min(maxHp, prev + healValue));
      completeCurrentNode();
      setScreen('map');
    } else if (choice.type === 'reselect_skills') {
      // 패시브 재선택 화면으로 (PrepScreen 재사용, mode='skills_only')
      setReselectMode('skills');
      setScreen('reselect');
    } else if (choice.type === 'reselect_relics') {
      setReselectMode('relics');
      setScreen('reselect');
    }
  };
  
  // 재선택 완료 처리 (정비 노드에서 → 보스로 이동)
  const handleReselectConfirm = (selSkills, selRelicNames) => {
    if (reselectMode === 'skills') {
      setActiveSkills(selSkills);
    } else if (reselectMode === 'relics') {
      setActiveRelicNames(selRelicNames);
    }
    setReselectMode(null);
    completeCurrentNode();
    setScreen('map');
  };

  // 상점 구매
  const handleShopBuy = (item, price) => {
    setGold(prev => prev - price);
    applyReward(item);
  };

  const handleShopLeave = () => {
    completeCurrentNode();
    setScreen('map');
  };

  // 챕터 클리어 → 다음 챕터 / 원정 클리어
  const handleChapterContinue = () => {
    if (!currentExpedition) {
      setScreen('title');
      return;
    }
    
    const isLastChapter = chapterIdx >= currentExpedition.chapters.length - 1;
    
    if (isLastChapter) {
      // 원정 클리어
      const expSoulReward = currentExpedition.soulReward;
      const totalSouls = runSouls + expSoulReward;
      
      // 메타 저장
      let newMeta = { ...meta };
      newMeta = addSouls(newMeta, totalSouls);
      newMeta = recordExpeditionClear(newMeta, currentExpedition.id);
      setMeta(newMeta);
      
      setRunSouls(totalSouls);  // 화면에 표시용
      setScreen('expeditionClear');
    } else {
      // 다음 챕터
      const nextChapterIdx = chapterIdx + 1;
      const nextChIdx = currentExpedition.chapters[nextChapterIdx] - 1;
      initializeRun(CHAPTERS[nextChIdx], nextChapterIdx);
    }
  };
  
  // 원정 클리어 화면 → 메인 메뉴
  const handleExpeditionClearContinue = () => {
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setRunSouls(0);
    setScreen('title');
  };
  
  // 사망 화면 → 메인 메뉴
  const handleDefeatContinue = () => {
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setRunSouls(0);
    setScreen('title');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: `radial-gradient(ellipse at top, #1a0e12 0%, #050304 100%)`,
      fontFamily: '"Noto Serif KR", serif',
    }}>
      <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start max-w-7xl">
        {/* 좌측 안내 */}
        <div className="hidden lg:block max-w-sm" style={{ color: PALETTE.text }}>
          <p className="text-xs tracking-[0.4em] mb-2" style={{ color: PALETTE.deblan }}>RELIC REFORM · v1.4</p>
          <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: '"Cinzel", serif' }}>
            데로드앤데블랑<br/>
            <span style={{ color: PALETTE.accent }}>로그라이크</span>
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: PALETTE.textDim }}>
            v1.4 — 유물 시스템 재편 + 영혼의 제단 너프.
          </p>
          
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.legendary }}>★ 유물 스탯형 전환</div>
              <p style={{ color: PALETTE.textDim }}>
                패시브 Lv 강화 → 직접 스탯 보너스로 전환. 12종 유물.
                데미지 % / 치명타율 / 회피율 / 최대 HP / 흡혈 / 반사 등.
              </p>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.deblan }}>✦ 영혼 제단 너프</div>
              <p style={{ color: PALETTE.textDim }}>
                전체 비용 3~5배 증가. 신탁의 유물 / 단련된 영혼 최대 2단계 (500/1000).
                리롤 비용 1 → 20 영혼.
              </p>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.derod }}>◆ 유물 중복 방지</div>
              <p style={{ color: PALETTE.textDim }}>
                이미 보유한 유물은 보상·사건·상점 풀에서 모두 제외.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-[11px] leading-relaxed" style={{ color: PALETTE.textDim, borderColor: PALETTE.panelBorder }}>
            ◇ 유물은 봉인되면 효과 0<br/>
            ◇ 모든 진행은 IndexedDB에 자동 저장
          </div>
        </div>

        {/* 폰 (게임 화면) */}
        <PhoneFrame>
          {screen === 'title' && <TitleScreen meta={meta} 
            onStart={() => setScreen('classSelect')}
            onAltar={enterAltar} />}
          {screen === 'classSelect' && (
            <ClassSelect meta={meta} selected={selectedClass} onSelect={setSelectedClass}
              onNext={() => setScreen('expeditionSelect')}
              onBack={() => setScreen('title')} />
          )}
          {screen === 'expeditionSelect' && (
            <ExpeditionSelect meta={meta}
              onSelect={startExpedition}
              onBack={() => setScreen('classSelect')} />
          )}
          {screen === 'altar' && (
            <SoulAltar meta={meta} slots={altarSlots}
              onPurchase={purchaseUpgrade}
              onReroll={rerollAltar}
              onBack={() => setScreen('title')} />
          )}
          {screen === 'map' && chapter && mapData && (
            <MapView chapter={chapter} classData={classData} mapData={mapData}
              hp={hp} maxHp={maxHp} gold={gold} gem={gem}
              expedition={currentExpedition} curses={currentCurses} chapterIdx={chapterIdx}
              onEnterNode={handleEnterNode}
              onOpenStatus={() => setScreen('status')}
              onBack={() => setScreen('title')} />
          )}
          {screen === 'combat' && currentEnemy && (
            <CombatScreen
              key={`${activeNodeId}-${currentEnemy}`}
              classData={classData}
              initialPlayer={{ hp, maxHp, ...stats, ...classData.stats }}
              initialSkills={skills}
              initialUltimates={ultimates}
              initialRelics={relics}
              activeSkills={activeSkills}
              activeRelicNames={activeRelicNames}
              enemyKey={currentEnemy}
              isBoss={isBossReward}
              expedition={currentExpedition}
              curses={currentCurses}
              meta={meta}
              onVictory={handleVictory}
              onDefeat={handleDefeat}
            />
          )}
          {screen === 'reward' && (
            <RewardSelect rewards={currentRewards} gem={gem} skills={skills}
              relics={relics} ultimates={ultimates}
              onPick={handlePickReward}
              onReroll={handleReroll}
              hasRerolled={hasRerolled}
              isElite={isEliteReward} />
          )}
          {screen === 'event' && currentEvent && (
            <EventScreen event={currentEvent} classData={classData} stats={{ ...classData.stats, ...stats }}
              onResolve={handleEventResolve} />
          )}
          {screen === 'rest' && (
            <RestScreen classData={classData} hp={hp} maxHp={maxHp} skills={skills}
              relics={relics} expedition={currentExpedition}
              onChoice={handleRestChoice} />
          )}
          {screen === 'prep' && (
            <PrepScreen skills={skills} relics={relics} ultimates={ultimates}
              expedition={currentExpedition}
              mode="full"
              onConfirm={handlePrepConfirm} />
          )}
          {screen === 'reselect' && (
            <PrepScreen skills={skills} relics={relics} ultimates={ultimates}
              expedition={currentExpedition}
              mode={reselectMode}
              currentActiveSkills={activeSkills}
              currentActiveRelicNames={activeRelicNames}
              onConfirm={handleReselectConfirm} />
          )}
          {screen === 'shop' && (
            <ShopScreen gold={gold} skills={skills} relics={relics} ultimates={ultimates}
              onBuy={handleShopBuy} onLeave={handleShopLeave} />
          )}
          {screen === 'chapterClear' && chapter && (
            <ChapterClearScreen chapter={chapter}
              isLastChapter={false}
              onContinue={handleChapterContinue} />
          )}
          {screen === 'expeditionClear' && currentExpedition && (
            <ExpeditionClearScreen expedition={currentExpedition}
              soulsGained={runSouls}
              onContinue={handleExpeditionClearContinue} />
          )}
          {screen === 'defeat' && (
            <DefeatScreen chapter={chapter}
              soulsGained={runSouls}
              onContinue={handleDefeatContinue} />
          )}
          {screen === 'status' && (
            <StatusPanel classData={classData} hp={hp} maxHp={maxHp}
              skills={skills} stats={{ ...classData.stats, ...stats }} relics={relics}
              ultimates={ultimates}
              activeSkills={activeSkills}
              activeRelicNames={activeRelicNames}
              onClose={() => setScreen('map')} />
          )}
        </PhoneFrame>

        {/* 우측 디버그 */}
        <div className="hidden lg:block max-w-sm">
          <p className="text-xs tracking-[0.4em] mb-3" style={{ color: PALETTE.derod }}>현재 상태</p>
          
          <div className="px-3 py-2.5 mb-3" style={{ background: `${PALETTE.accent}10`, border: `1px solid ${PALETTE.panelBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: PALETTE.textDim }}>현재 화면</div>
            <div className="text-xs font-bold" style={{ color: PALETTE.text }}>{screen}</div>
          </div>

          <div className="space-y-1 text-[11px] mb-4">
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>HP</span><span style={{ color: PALETTE.text }}>{hp}/{maxHp}</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>은화</span><span style={{ color: PALETTE.text }}>{gold}</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>보석</span><span style={{ color: PALETTE.text }}>{gem}</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>유물</span><span style={{ color: PALETTE.text }}>{relics.length}개</span></div>
            {chapter && <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>챕터</span><span style={{ color: PALETTE.text }}>{chapter.name}</span></div>}
          </div>

          {Object.keys(skills).length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] mb-1" style={{ color: PALETTE.derod }}>패시브 스킬</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(skills).filter(([_, lv]) => lv > 0).map(([k, lv]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5" style={{
                    background: `${PASSIVE_SKILLS[k].color}30`,
                    color: PASSIVE_SKILLS[k].color,
                    border: `1px solid ${PASSIVE_SKILLS[k].color}60`,
                  }}>{k} {lv}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-[10px] leading-relaxed" style={{ color: PALETTE.textDim, borderColor: PALETTE.panelBorder }}>
            <p className="mb-2">◇ <strong style={{ color: PALETTE.text }}>플레이 순서:</strong></p>
            <p>1. 직업 선택 → 챕터 선택</p>
            <p>2. 발광 노드 탭 → 해당 컨텐츠 진행</p>
            <p>3. 전투 승리 → 보상 3중1 선택</p>
            <p>4. 보스 처치 → 다음 챕터로 자동 이동</p>
            <p className="mt-2">◇ 보석 3개로 보상 1회 리롤</p>
            <p>◇ 우측 상단 캐릭터 아이콘으로 상태창</p>
          </div>
        </div>
      </div>
    </div>
  );
}
