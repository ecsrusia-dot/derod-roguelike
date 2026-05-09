import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sword, Shield, Heart, Zap, Skull, Sparkles, Eye, Flame, Crown, BookOpen, HelpCircle, ChevronRight, X, RefreshCw, Lock, Check, AlertTriangle, Hammer, Coins } from 'lucide-react';

// ============================================
// 여명앤황혼 로그라이크 v0.4 - INTEGRATED
// 전체 게임 루프: 챕터 → 맵 → 노드 → 전투/사건 → 보상 → 다음 노드 → 보스 → 다음 챕터
// ============================================

function getSkillLevel(skills, skillName) {
  if (!skills || !skills[skillName]) return 0;
  return typeof skills[skillName] === 'object' ? (skills[skillName].lv || 0) : (skills[skillName] || 0);
}

// 봉인된 패시브를 0Lv으로 처리한 skills 반환 (챔피언십 신전)
// player.debuffs.sealedSkills 배열에 있는 패시브는 비활성
function applySealsToSkills(skills, sealedSkills) {
  if (!sealedSkills || sealedSkills.length === 0) return skills;
  const result = { ...skills };
  for (const sealed of sealedSkills) {
    if (result[sealed] !== undefined) {
      // skills 형식 보존 (object or number)
      if (typeof result[sealed] === 'object') {
        result[sealed] = { ...result[sealed], lv: 0 };
      } else {
        result[sealed] = 0;
      }
    }
  }
  return result;
}

const PALETTE = {
  bg: '#0a0608', bgDeep: '#050304',
  panel: '#1a0e12', panelLight: '#241419', panelBorder: '#3d1f28',
  accent: '#c4453d', accentDim: '#7a2820',
  dawn: '#d4a574', twilight: '#5c4a8c',
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
  ACHIEVEMENTS,
  FORGE_RECIPES,
  findRecipe,
  CHAMPIONSHIPS,
  CHAMPIONSHIP_DIFFICULTIES,
  CHAMPIONSHIP_CHAPTERS,
} from './data.js';
import { loadMeta, saveMeta, addSouls, applyUpgrade, applyUnlock, recordExpeditionClear, needsAltarRefresh, getNextRefreshTime, checkAndResetDaily, claimAchievement, getAchievementState, incrementAchievement, setAchievementProgress, completeAchievement, recordChampionshipClear, hasChampionshipClear, isChampionshipDifficultyUnlocked, unlockChampionshipRelic } from './storage.js';

// 보상 풀은 PASSIVE_SKILLS와 RELICS를 합쳐 동적으로 빌드
// REWARD_POOL은 동적으로 빌드 (직업별 전용 패시브 포함 위해)
function getRewardPool(currentClassId) {
  return buildRewardPool(currentClassId);
}

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

// 챔피언십 메타 강화 보유 여부 (champion_normal / champion_madness)
function hasChampionMeta(meta, level) {
  // level: 'normal' | 'madness'
  if (!meta || !meta.upgrades) return false;
  const id = level === 'normal' ? 'meta_champion_normal' : 'meta_champion_madness';
  return !!meta.upgrades[id];
}

// 챔피언십 메타로 인한 시작 HP 보너스 합산
function getChampionshipMetaHp(meta) {
  let bonus = 0;
  if (hasChampionMeta(meta, 'normal')) bonus += 50;
  if (hasChampionMeta(meta, 'madness')) bonus += 100;
  return bonus;
}

// 챔피언십 메타로 인한 시작 패시브 +Lv 보너스 합산
function getChampionshipMetaSkillBonus(meta) {
  let bonus = 0;
  if (hasChampionMeta(meta, 'normal')) bonus += 1;
  if (hasChampionMeta(meta, 'madness')) bonus += 2;
  return bonus;
}

// 챔피언십 메타로 인한 시작 유물 +개수
function getChampionshipMetaRelicBonus(meta) {
  if (hasChampionMeta(meta, 'madness')) return 1;
  return 0;
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
    // 챔피언십 사전 요구사항: 5원정 모두 해당 난이도 클리어
    if (upgrade.requireChampionshipAll) {
      const allChamps = ['frost', 'forest', 'sanctum', 'rift', 'dawn'];
      const diff = upgrade.requireChampionshipAll;  // 'normal' | 'madness'
      const allClear = allChamps.every(c => meta.championshipClears?.[c]?.[diff]);
      if (!allClear) return false;
    }
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
function rollRewards(count = 3, eliteBonus = false, skills = {}, relics = [], ultimates = [], currentClassId = null, meta = null) {
  // 보상 풀 동적 필터링 (직업 ID 기반으로 직업 전용 패시브 포함)
  const REWARD_POOL = getRewardPool(currentClassId);
  // 챔피언십 해금 유물 추가 (낮은 weight 1)
  const unlockedChampRelics = (meta?.championshipRelicUnlocks || [])
    .map(name => RELICS.find(r => r.name === name))
    .filter(r => r)
    .map(r => ({ type: 'relic', ...r, weight: 1 }));
  const filteredPool = [...REWARD_POOL, ...unlockedChampRelics].filter(r => {
    // 유물 중복 방지: 이미 보유한 유물은 풀에서 제외
    if (r.type === 'relic') {
      const owned = relics.some(rel => rel.name === r.name);
      if (owned) return false;
    }
    // 패시브: 이미 Lv.7 (MAX) 도달한 패시브는 보상 풀에서 제외
    // 궁극 진화는 별도 ultimate 보상으로 등장
    if (r.type === 'skill') {
      const currentLv = skills[r.name] || 0;
      if (currentLv >= 7) return false;
      // 궁극 3개 모두 획득한 패시브는 보상 풀에서 영구 제외
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

  // 중간 레이어 노드 타입 (rest 완전 제거, shop은 강제 배치로 별도 처리)
  const types = ['battle', 'event', 'unknown', 'elite'];
  const weights = [55, 26, 14, 9];

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

  // === 상점/대장간 강제 배치 ===
  // 상점: 모든 챕터 1개, layer 3 ~ layers-3 (정비/보스 제외) 중 랜덤
  // 대장간: 챕터 3 이상 (chapterIdx >= 2)에서 1개, layer 1 ~ layers-3 중 랜덤
  
  // 강제 배치 가능 layer 풀 (일반 노드 중에서 변환)
  const pickRandomNode = (minLayer, maxLayer, excludeIds = []) => {
    const candidates = nodes.filter(n => 
      n.layer >= minLayer && 
      n.layer <= maxLayer && 
      n.type !== 'prep' && n.type !== 'boss' && n.type !== 'rest' &&
      !excludeIds.includes(n.id)
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };
  
  // 상점 강제 배치 (layer 3 ~ layers-3)
  const shopNode = pickRandomNode(3, layers - 3);
  if (shopNode) {
    shopNode.type = 'shop';
  }
  
  // 대장간 강제 배치 (chapterIdx >= 2 = 챕터 3+, layer 1 ~ layers-3)
  if (chapterIdx >= 2) {
    const forgeNode = pickRandomNode(1, layers - 3, shopNode ? [shopNode.id] : []);
    if (forgeNode) {
      forgeNode.type = 'forge';
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
function getDisplayDamage(skill, attacker, skills, ultimates, meta, curses, activeSkills, relicStat) {
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
    return Math.max(0, dmg);
  };
  // hitCount 처리 (연속화살 등)
  const hits = skill.hitCount || 1;
  return [calcOne(skill.baseDmg[0]) * hits, calcOne(skill.baseDmg[1]) * hits];
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
  // 화신강림: 폭발 후 다음 1턴 치명타 +20%
  if (attacker.buffs?.ifritCritNext) {
    critRate += 20;
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
  // 명경지수 궁극: 반격 후 다음 턴 회피율 +30%
  if (defender.buffs?.mirrorDodgeNext > 0) {
    dodgeRate += defender.buffs.mirrorDodgeNext;
  }

  // 7. 최종 확률 판정
  return Math.random() * 100 < dodgeRate;
}

// =========== UI ===========
const NODE_TYPES = {
  battle: { icon: Skull, color: '#c4453d', label: '전투' },
  elite: { icon: Crown, color: '#e8b04a', label: '강적' },
  event: { icon: BookOpen, color: '#7ba3c4', label: '사건' },
  shop: { icon: Coins, color: '#d4a574', label: '상점' },
  forge: { icon: Hammer, color: '#c46535', label: '대장간' },
  rest: { icon: Flame, color: '#d4a574', label: '정비' },
  prep: { icon: Sword, color: '#9ad4a3', label: '준비' },
  unknown: { icon: HelpCircle, color: '#9b8975', label: '미지' },
  boss: { icon: Crown, color: '#8b1f1f', label: '보스' },
};

function PhoneFrame({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 1024);

      if (width >= 1024) {
        // PC 환경 배율 계산 (가로 375, 세로 780 기준)
        // 화면 높이의 90% 정도를 차지하도록 배율 설정
        const scaleV = (height * 0.9) / 780;
        const scaleH = (width * 0.4) / 375; // 좌우 여백 고려
        setScale(Math.min(scaleV, scaleH, 1.2)); // 최대 1.2배까지만 확대
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  if (isMobile) {
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

  // 데스크톱: 배율에 맞춰 scale 적용
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div 
        ref={containerRef}
        className="relative transition-transform duration-300"
        style={{
          width: '375px',
          height: '780px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          background: PALETTE.bg,
          borderRadius: '36px',
          border: `8px solid ${PALETTE.bgDeep}`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          fontFamily: '"Noto Serif KR", serif',
          flexShrink: 0,
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-25" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }} />
        {children}
      </div>
    </div>
  );
}

// =========== 화면들 ===========

function TitleScreen({ meta, onStart, onAltar, onAchievements }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-8" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mt-8">
        <div className="text-xs tracking-[0.4em] mb-4" style={{ color: PALETTE.dawn, opacity: 0.7 }}>
          DAWN &amp; TWILIGHT
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-3" style={{
          color: PALETTE.text,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          textShadow: `0 0 30px ${PALETTE.accent}40`,
        }}>
          던앤<br/>트와일라잇
        </h1>
        <div className="text-xs tracking-widest mt-4" style={{ color: PALETTE.textDim }}>
          ━━━ 텍스트 로그라이크 ━━━
        </div>
      </div>
      
      {/* 영혼 카운터 */}
      <div className="px-6 py-2 flex items-center gap-2" style={{
        background: `${PALETTE.twilight}20`,
        border: `1px solid ${PALETTE.twilight}80`,
      }}>
        <span style={{ color: PALETTE.twilight, fontSize: '20px' }}>✦</span>
        <span className="text-base font-bold tracking-wider" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
          {meta?.souls || 0}
        </span>
        <span className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>SOULS</span>
      </div>
      
      <div className="w-full flex flex-col gap-2.5">
        <button onClick={onStart} className="w-full py-3 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.accent}, ${PALETTE.accentDim})`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.dawn}40`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.3em',
          fontSize: '14px',
          boxShadow: `0 0 20px ${PALETTE.accent}40`,
        }}>여정 시작</button>
        
        <button onClick={onAltar} className="w-full py-2.5 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.twilight}40, ${PALETTE.twilight}20)`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.twilight}`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.25em',
          fontSize: '12px',
        }}>★ 영혼의 제단</button>
        
        <button onClick={onAchievements} className="w-full py-2.5 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.legendary}`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.25em',
          fontSize: '12px',
        }}>✦ 업적</button>
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
      {/* 1. 상단 직업 아이콘 선택 바 */}
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

      {/* 2. 중앙 직업 상세 정보 영역 */}
      <div className="flex-1 px-6 py-3 overflow-hidden">
        <div className="h-full relative overflow-hidden" style={{
          background: PALETTE.bgDeep,
          border: `1px solid ${cls.color}60`,
        }}>
          
          {/* 캐릭터 삽화 레이어 */}
          <div className="absolute inset-0 z-0">
             <img 
               src={cls.image} 
               alt={cls.name}
               className="w-full h-full object-cover" // ★ opacity 제거하여 원본 밝기 유지
               onError={(e) => { e.target.style.display = 'none'; }} 
             />
             {/* ★ 하단 텍스트 가독성을 위한 부분 그라데이션 수정 */}
             <div className="absolute inset-0" style={{
               background: `linear-gradient(to bottom, 
                 transparent 0%, 
                 transparent 50%, 
                 ${PALETTE.bgDeep}cc 75%, 
                 ${PALETTE.bgDeep} 100%)`
             }} />
          </div>

          {/* 정보 텍스트 영역 (최상단 z-10) */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-center z-10">
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

      {/* 3. 하단 버튼 영역 */}
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
        }}>{clsLocked ? '🔒 잠김' : '확정 ▸'}</button>
      </div>
    </div>
  );
} // <--- 반드시 여기서 함수가 끝나는 닫는 중괄호가 있어야 합니다!

// =========== 챔피언십 난이도 선택 ===========
// 5원정 중 하나 선택 → 난이도 선택 (일반/하드/지옥/광기)
// 이전 난이도 클리어 시 다음 난이도 해금
function ChampionshipDifficultySelect({ championship, meta, onSelect, onBack }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[10px] tracking-[0.3em]" style={{ color: championship.color, opacity: 0.7 }}>
          CHAMPIONSHIP · {championship.sub}
        </p>
        <p className="text-center text-base font-bold mt-1" style={{ color: PALETTE.text }}>
          {championship.name}
        </p>
        <p className="text-center text-[10px] mt-2 px-3" style={{ color: PALETTE.textDim }}>
          {championship.desc}
        </p>
        <div className="text-[10px] mt-2 px-3 py-1.5 mx-2" style={{ 
          background: `${championship.color}15`, color: championship.color, opacity: 0.85,
          border: `1px solid ${championship.color}40`, textAlign: 'center',
        }}>
          ◆ {championship.concept}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-center text-[11px] tracking-[0.3em] mb-2" style={{ color: PALETTE.textDim }}>◆ 난이도 선택 ◆</p>
        {CHAMPIONSHIP_DIFFICULTIES.map((d) => {
          const cleared = hasChampionshipClear(meta, championship.id, d.id);
          const unlocked = isChampionshipDifficultyUnlocked(meta, championship.id, d.id);
          const diffColor = d.id === 'normal' ? '#7ba3c4' 
                          : d.id === 'hard' ? '#d4a574'
                          : d.id === 'hell' ? '#c4453d'
                          : '#5c4a8c';
          return (
            <button key={d.id} onClick={() => unlocked && onSelect(d)} disabled={!unlocked}
              className="w-full text-left transition-all"
              style={{
                background: unlocked 
                  ? `linear-gradient(135deg, ${diffColor}25, ${PALETTE.bgDeep})`
                  : PALETTE.panel,
                border: `1px solid ${unlocked ? diffColor : PALETTE.panelBorder}`,
                opacity: unlocked ? 1 : 0.4,
              }}>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold" style={{ color: PALETTE.text }}>{d.name}</span>
                    <span className="text-[9px] tracking-[0.2em]" style={{ color: diffColor, opacity: 0.7 }}>{d.sub}</span>
                    {cleared && <span className="text-[10px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                      border: `1px solid ${PALETTE.legendary}80`,
                    }}>CLEAR</span>}
                  </div>
                  {!unlocked && <Lock size={14} style={{ color: PALETTE.textDim }} />}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {d.enemyHpMult > 1 && (
                    <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.accent}20`, color: PALETTE.accent,
                    }}>적 HP ×{d.enemyHpMult}</span>
                  )}
                  {d.enemyDmgMult > 1 && (
                    <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.accent}20`, color: PALETTE.accent,
                    }}>적 데미지 ×{d.enemyDmgMult}</span>
                  )}
                  {d.curseCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.twilight}20`, color: PALETTE.twilight,
                    }}>저주 {d.curseCount}개</span>
                  )}
                  <span className="text-[9px] px-1.5 py-0.5" style={{
                    background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                  }}>유물 {d.maxRelicSelect}개</span>
                  <span className="text-[9px] px-1.5 py-0.5" style={{
                    background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                  }}>영혼 +{d.soulReward}</span>
                </div>
                {!unlocked && (
                  <div className="text-[10px] mt-2" style={{ color: PALETTE.textDim }}>
                    이전 난이도 클리어 후 해금
                  </div>
                )}
              </div>
            </button>
          );
        })}
        <div className="text-[9px] text-center mt-3 px-3 py-2" style={{ 
          color: PALETTE.textDim, opacity: 0.6,
          border: `1px solid ${PALETTE.panelBorder}`,
        }}>
          ⚠ Phase 1 — 난이도 선택 시 클래식 원정 화면으로 돌아갑니다.<br/>
          실제 챔피언십 진입은 Phase 2에서 구현됩니다.
        </div>
      </div>
      
      <div className="p-4 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="w-full py-2 text-[11px] tracking-[0.3em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
    </div>
  );
}

function ExpeditionSelect({ meta, onSelect, onSelectChampionship, onBack }) {
  const [tab, setTab] = useState('classic'); // 'classic' | 'championship'
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.textDim }}>
          ◆ 원정을 선택하세요 ◆
        </p>
      </div>
      
      {/* 탭 */}
      <div className="grid grid-cols-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={() => setTab('classic')} className="py-3 text-[11px] tracking-[0.2em]" style={{
          background: tab === 'classic' ? PALETTE.bgDeep : 'transparent',
          color: tab === 'classic' ? PALETTE.dawn : PALETTE.textDim,
          borderBottom: tab === 'classic' ? `2px solid ${PALETTE.dawn}` : 'none',
        }}>클래식 원정</button>
        <button onClick={() => setTab('championship')} className="py-3 text-[11px] tracking-[0.2em]" style={{
          background: tab === 'championship' ? PALETTE.bgDeep : 'transparent',
          color: tab === 'championship' ? PALETTE.legendary : PALETTE.textDim,
          borderBottom: tab === 'championship' ? `2px solid ${PALETTE.legendary}` : 'none',
        }}>챔피언십</button>
      </div>
      
      {tab === 'classic' && (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <p className="text-center text-[10px] mb-2" style={{ color: PALETTE.dawn, opacity: 0.7 }}>난이도 상승형 — 4개 챕터 묶음</p>
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
                      background: `${PALETTE.twilight}30`, color: PALETTE.twilight,
                    }}>저주 {exp.curseCount}개</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[10px]">
                  <div style={{ color: PALETTE.textDim }}>
                    클리어 보상 <span style={{ color: PALETTE.twilight }}>✦ {exp.soulReward}</span>
                  </div>
                  {locked && exp.unlockCost && (
                    <div style={{ color: PALETTE.textDim }}>
                      해금 <span style={{ color: PALETTE.twilight }}>✦ {exp.unlockCost}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}
      
      {tab === 'championship' && (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <p className="text-center text-[10px] mb-2" style={{ color: PALETTE.legendary, opacity: 0.7 }}>
          전술형 — 컨셉별 5개 원정 × 4난이도
        </p>
        <p className="text-center text-[9px] mb-3" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
          각 원정은 고유한 적 패턴과 전술이 적용됩니다
        </p>
        {CHAMPIONSHIPS.map((champ) => {
          const clears = meta.championshipClears?.[champ.id] || {};
          const clearCount = Object.values(clears).filter(Boolean).length;
          const allCleared = clearCount === 4;
          return (
            <button key={champ.id} 
              onClick={() => onSelectChampionship(champ)}
              className="w-full text-left relative overflow-hidden transition-all"
              style={{
                background: `linear-gradient(135deg, ${champ.color}25, ${PALETTE.bgDeep})`,
                border: `1px solid ${champ.color}`,
              }}>
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-[10px] tracking-[0.2em] mb-0.5" style={{ color: champ.color, opacity: 0.7 }}>
                      CHAMPIONSHIP · {champ.sub}
                    </div>
                    <div className="text-base font-bold flex items-center gap-2 flex-wrap" style={{ color: PALETTE.text }}>
                      {champ.name}
                      {allCleared && <span className="text-[10px] px-1.5 py-0.5" style={{
                        background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                        border: `1px solid ${PALETTE.legendary}80`,
                      }}>마스터</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: champ.color }} />
                </div>
                <p className="text-[11px] mb-2 leading-relaxed" style={{ color: PALETTE.textDim }}>{champ.desc}</p>
                <div className="text-[10px] mb-2 px-2 py-1" style={{ 
                  background: `${champ.color}15`, color: champ.color, opacity: 0.85,
                  border: `1px solid ${champ.color}40`,
                }}>
                  ◆ {champ.concept}
                </div>
                {/* 난이도 진행도 */}
                <div className="flex gap-1 mt-2">
                  {CHAMPIONSHIP_DIFFICULTIES.map((d) => {
                    const cleared = !!clears[d.id];
                    const unlocked = isChampionshipDifficultyUnlocked(meta, champ.id, d.id);
                    return (
                      <span key={d.id} className="flex-1 text-[9px] text-center py-1" style={{
                        background: cleared ? `${PALETTE.legendary}30` : unlocked ? `${champ.color}10` : 'transparent',
                        color: cleared ? PALETTE.legendary : unlocked ? champ.color : PALETTE.textDim,
                        border: `1px solid ${cleared ? PALETTE.legendary : unlocked ? champ.color : PALETTE.panelBorder}40`,
                        opacity: unlocked ? 1 : 0.5,
                      }}>
                        {cleared ? '✓ ' : unlocked ? '' : '🔒 '}{d.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}
      
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
  // 다음 자동 갱신 시각 표시용
  const nextRefreshTs = getNextRefreshTime();
  const nextRefreshDate = new Date(nextRefreshTs);
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(nextRefreshDate.getTime() + kstOffset);
  const refreshHour = kstDate.getUTCHours();
  const refreshLabel = refreshHour === 0 ? '자정' : '정오';
  
  // 일일 리롤 카운트
  const rerollUsed = meta.dailyRerollCount || 0;
  const rerollLimit = SOUL_REWARDS.dailyRerollLimit;
  const rerollExhausted = rerollUsed >= rerollLimit;
  const canReroll = meta.souls >= SOUL_REWARDS.rerollCost && !rerollExhausted;
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.twilight }}>
          ★ 영혼의 제단 ★
        </p>
        <div className="flex justify-center items-center gap-2 mt-2">
          <span style={{ color: PALETTE.twilight, fontSize: '16px' }}>✦</span>
          <span className="text-base font-bold" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
            {meta.souls}
          </span>
          <span className="text-[10px]" style={{ color: PALETTE.textDim }}>SOULS</span>
        </div>
        <div className="text-center text-[9px] tracking-[0.2em] mt-2" style={{ color: PALETTE.textDim }}>
          ◇ 다음 자동 갱신: {refreshLabel} (KST)
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
                      <span style={{ color: PALETTE.twilight, fontSize: '12px' }}>✦</span>
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
        <button onClick={onReroll} disabled={!canReroll}
          className="flex-1 py-2.5 text-[11px] tracking-[0.2em] flex flex-col items-center justify-center gap-0.5" style={{
            background: canReroll ? `${PALETTE.twilight}20` : 'transparent',
            border: `1px solid ${canReroll ? PALETTE.twilight : PALETTE.panelBorder}`,
            color: canReroll ? PALETTE.text : PALETTE.textDim,
            opacity: canReroll ? 1 : 0.5,
          }}>
          <span className="flex items-center gap-2">
            <RefreshCw size={11} /> 새로고침 (✦{SOUL_REWARDS.rerollCost})
          </span>
          <span className="text-[9px]" style={{ color: rerollExhausted ? PALETTE.accent : PALETTE.textDim }}>
            {rerollExhausted ? '오늘 리롤 소진' : `오늘 ${rerollUsed}/${rerollLimit}회`}
          </span>
        </button>
        <button onClick={onBack} className="flex-1 py-2.5 text-[11px] tracking-[0.2em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
    </div>
  );
}

function MapView({ chapter, classData, mapData, hp, maxHp, gold, gem, relics = [], activeRelicNames = null, expedition, curses = [], chapterIdx, onEnterNode, onOpenStatus, onOpenAchievements, onOpenCodex, onBack }) {
  // 천리안 유물 보유 (활성 상태) 시 모든 노드 공개
  const hasMapReveal = relics && relics.some(r => 
    r.statBonus?.mapReveal > 0 && (!activeRelicNames || activeRelicNames.includes(r.name))
  );
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{
        background: `linear-gradient(180deg, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 100%)`,
        borderBottom: `1px solid ${PALETTE.panelBorder}`,
      }}>
        <button onClick={onOpenStatus} className="w-9 h-9 flex items-center justify-center text-base font-bold" style={{
          background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.dawn}`,
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
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.dawn }}>◉</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gold}</span></div>
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
                  : na.completed && nb.completed ? PALETTE.dawn 
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
              {/* 상점/대장간 노드는 항상 강조 (방문 전) — 펄스 + 외곽 링 */}
              {(n.type === 'shop' || n.type === 'forge') && !isCompleted && !isCurrent && (
                <>
                  <div className="absolute rounded-full animate-ping" style={{ 
                    inset: '-4px', background: cfg.color, opacity: 0.5,
                  }} />
                  <div className="absolute rounded-full animate-pulse" style={{ 
                    inset: '-2px', background: cfg.color, opacity: 0.6,
                    border: `2px solid ${cfg.color}`,
                  }} />
                </>
              )}
              <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{
                background: isCompleted
                  ? `radial-gradient(circle, ${PALETTE.dawn}30, ${PALETTE.bgDeep})`
                  : isCurrent
                    ? `radial-gradient(circle, ${cfg.color}40, ${PALETTE.bgDeep})`
                    : isLocked
                      ? `radial-gradient(circle, ${PALETTE.bgDeep}, #1a0a0a)`
                      : `radial-gradient(circle, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
                border: `${isBoss ? 2 : 1.5}px solid ${
                  isCompleted ? PALETTE.dawn 
                  : isCurrent ? cfg.color 
                  : isLocked ? '#3a1f1f' 
                  : PALETTE.panelBorder
                }`,
                boxShadow: isCurrent ? `0 0 24px ${cfg.color}80` : isBoss ? `0 0 16px ${PALETTE.accent}60` : 'none',
                opacity: isLocked ? 0.4 : 1,
              }}>
                {isLocked
                  ? <X size={isBoss ? 18 : 14} style={{ color: '#5a3030' }} />
                  : (n.type === 'shop' || n.type === 'forge' || hasMapReveal)
                    ? <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.dawn : cfg.color }} />
                    : !isCurrent && !isCompleted && !isBoss
                      ? <span className="text-base" style={{ color: PALETTE.textDim }}>?</span>
                      : <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.dawn : cfg.color }} />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 border-t" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        <button onClick={onBack} className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>나가기</button>
        <button onClick={onOpenCodex} className="py-2.5 text-[10px]" style={{ color: '#c46535' }}>도감</button>
        <button onClick={onOpenStatus} className="py-2.5 text-[10px]" style={{ color: PALETTE.dawn }}>스킬</button>
        <button onClick={onOpenAchievements} className="py-2.5 text-[10px]" style={{ color: PALETTE.legendary }}>업적</button>
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
    // 이프리트 minor (Tier 효과 누적): 지능 +2 (Lv.3) +3 (Lv.5) +4 (Lv.7)
    const ifritLv = (initialSkills && initialSkills['이프리트']) || 0;
    if (ifritLv > 0 && (!activeSkills || activeSkills.includes('이프리트'))) {
      let intBonus = 0;
      if (ifritLv >= 3) intBonus += 2;
      if (ifritLv >= 5) intBonus += 3;
      if (ifritLv >= 7) intBonus += 4;
      p.지능 = (p.지능 || 0) + intBonus;
    }
    // 이프리트 궁극: 지능 +4 (모든 궁극 공통)
    if (initialUltimates && (initialUltimates.includes('ult_eternalFire') || initialUltimates.includes('ult_ifritDescent') || initialUltimates.includes('ult_purgatoryFire'))) {
      p.지능 = (p.지능 || 0) + 4;
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
  const skills = useMemo(() => {
    const baseSkills = getEffectiveSkills(initialSkills, initialRelics, activeRelicNames);
    // 챔피언십 신전: 봉인된 패시브 효과 비활성화
    const sealedSkills = player?.debuffs?.sealedSkills || [];
    if (sealedSkills.length > 0) {
      return applySealsToSkills(baseSkills, sealedSkills);
    }
    return baseSkills;
  }, [initialSkills, initialRelics, activeRelicNames, player?.debuffs?.sealedSkills]);
  // 활성 유물의 모든 스탯 보너스를 단일 객체로 집계 (성능 최적화)
  const relicStat = useMemo(() => {
    const stats = {};
    const keys = ['dmgDealt', 'dmgTaken', 'critRate', 'critDmg', 'dodge', 'maxHp', 
                  'startGold', 'startGem', 'heal', 'reflect', 'lifesteal', 'shieldOnStart',
                  'magicDmg', 'cdReduceChance', 'mapReveal',
                  // 챔피언십 전용 stat
                  'frostbiteResist', 'berserkResist', 'sealResist', 'shockResist', 'antiHeal'];
    keys.forEach(k => stats[k] = getActiveRelicStat(initialRelics, activeRelicNames, k));
    return stats;
  }, [initialRelics, activeRelicNames]);
  const [ultimates] = useState(initialUltimates);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState('intro');
  const [log, setLog] = useState([]);
  const [animDmg, setAnimDmg] = useState({ player: null, enemy: null });
  // 패시브/유물 툴팁 (클릭 시 정보 표시)
  const [tooltip, setTooltip] = useState(null); // { type: 'skill'|'relic', name, content }
  // 스테이터스 전체 모달 (직업명 옆 ≡ 버튼 클릭)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
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
    if (hasEffect(skills, 'startDefense+30', activeSkills)) {
      newPlayer.defense += 30;
      initialLog.push({ type: 'passive', text: `◆ [수비 Lv.3] 시작 방어 +30` });
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
      oracleDebuffs = { bleed: 2, bleedTurns: 3, shockGauge: 101 };
      initialLog.push({ type: 'passive', text: `◆ [신앙 Lv.7] 수신사의 신탁! 적에게 출혈 3턴 + 기절 1턴` });
    }
    
    setPlayer(newPlayer);
    if (oracleDebuffs) {
      setEnemy(e => ({ ...e, debuffs: { ...e.debuffs, ...oracleDebuffs } }));
    }
    setLog(initialLog);
    setTimeout(() => {
      const patterns = enemy.patterns;
      const firstIntent = patterns[Math.floor(Math.random() * patterns.length)];
      setEnemy(e => {
        const updated = { ...e, nextIntent: firstIntent };
        // 첫 의도가 defend면 즉시 방어 적용 (그 턴만 유지)
        if (firstIntent?.type === 'defend' && firstIntent.defense) {
          updated.defense = firstIntent.defense;
        }
        return updated;
      });
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
      // 마력 Lv.7 (50% × 2회) / 신탁 각성 (50% × 3회)
      const hasOracleAwaken = hasUltimate(ultimates, 'ult_oracleAwaken');
      const echoChance = 0.5;  // 둘 다 50% 확률
      const canEcho = skill.type === 'magic' && (hasEffect(skills, 'magicEcho', activeSkills) || hasOracleAwaken);
      
      let echoTimes = 1;
      if (canEcho && Math.random() < echoChance) {
        echoTimes = hasOracleAwaken ? 3 : 2;
      }
      
      const hitCount = skill.hitCount || 1;
      let totalDmg = 0;
      let usedGuaranteedCrit = false;
      
      for (let echo = 0; echo < echoTimes; echo++) {
        if (echo > 0) {
          const effectName = hasOracleAwaken ? '신탁 각성' : '마력 Lv.7';
          newLog.push({ type: 'passive', text: `◆ [${effectName}] 마법 재시전! (${echo}/${echoTimes - 1})` });
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
          // 심안류 Lv.7: 반격 후 다음 턴 반드시 치명타 (1회)
          if (!usedGuaranteedCrit && newPlayer.buffs?.guaranteedCritNext) {
            isCrit = true;
            usedGuaranteedCrit = true;
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCritNext: false };
            newLog.push({ type: 'passive', text: `◆ [심안류 Lv.7] 반격 후 치명타 확정!` });
          }
          // 검로일여: 기절한(또는 기절 경험한) 적 공격 시 치명타
          if (!isCrit && hasUltimate(ultimates, 'ult_counterShock') 
              && (newEnemy.debuffs?.stunned > 0 || newEnemy.debuffs?.everStunned)) {
            isCrit = true;
            newLog.push({ type: 'passive', text: `★ [검로일여] 기절 적 공격 → 치명타!` });
          }
          // 무영검: 다음 턴 치명타 확률 +30% 버프 적용
          if (!isCrit && newPlayer.buffs?.shadowCritNext > 0 && Math.random() * 100 < newPlayer.buffs.shadowCritNext) {
            isCrit = true;
            newLog.push({ type: 'passive', text: `★ [무영검] 치명타 +30% 발동!` });
          }
          const dmgResult = calculateDamage(skill, newPlayer, newEnemy, skills, isCrit, ultimates, meta, curses, activeSkills, relicStat);
          let actualDmg = dmgResult.finalDmg;
          if (newEnemy.defense > 0 && !skill.pierce) {
            newEnemy.defense = Math.max(0, newEnemy.defense - dmgResult.defenseMitigated);
          }
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg);
          totalDmg += actualDmg;
          
          // === 이프리트 화염 각인 폭발 (minor 효과 + 궁극) ===
          // 폭발 조건:
          // - 이프리트 패시브 보유 (Lv.0+ 활성): 항상 가능
          // - 화신강림/연옥지화 단독: 가능
          // - 영겁지화 단독: 폭발 비활성
          // - 영겁지화 + 패시브: 폭발 가능
          const ifritLvForExplode = (skills && skills['이프리트']) || 0;
          const hasIfritPassiveExplode = ifritLvForExplode > 0 && (!activeSkills || activeSkills.includes('이프리트'));
          const hasEternalFireExplode = hasUltimate(ultimates, 'ult_eternalFire');
          const hasIfritDescentExplode = hasUltimate(ultimates, 'ult_ifritDescent');
          const hasPurgatoryFireExplode = hasUltimate(ultimates, 'ult_purgatoryFire');
          
          // 영겁지화 단독 → 폭발 비활성
          const eternalSoloDisable = hasEternalFireExplode && !hasIfritPassiveExplode;
          // 폭발 가능 조건
          const canExplode = !eternalSoloDisable && (hasIfritPassiveExplode || hasIfritDescentExplode || hasPurgatoryFireExplode || hasEternalFireExplode);
          
          if (isCrit && canExplode && newEnemy.debuffs?.igniteDmg > 0 && newEnemy.debuffs?.igniteTurns > 0) {
            const remainTurns = newEnemy.debuffs.igniteEternal ? 5 : newEnemy.debuffs.igniteTurns;
            const explosionDmg = newEnemy.debuffs.igniteDmg * remainTurns * 2;
            newEnemy.currentHp = Math.max(0, newEnemy.currentHp - explosionDmg);
            totalDmg += explosionDmg;
            newLog.push({ type: 'crit', text: `🔥 [화염 폭발] ${explosionDmg} 데미지` });
            
            // 폭발 후 각인 소멸
            newEnemy.debuffs = { 
              ...newEnemy.debuffs, 
              igniteDmg: 0, 
              igniteTurns: 0,
              igniteEternal: false,
              igniteJustApplied: false,
            };
            
            // 화신강림: 폭발 후 다음 1턴 치명타 +20%
            if (hasIfritDescentExplode) {
              newPlayer.buffs = { ...newPlayer.buffs, ifritCritNext: true };
              newLog.push({ type: 'passive', text: `★ [화신강림] 다음 턴 치명타 확률 +20%` });
            }
          }
          
          const echoTag = (echo > 0) ? ` [재시전 ${echo}]` : '';
          newLog.push({
            type: 'damage',
            text: `· ${enemy.name}에게 ${actualDmg} 데미지${isCrit ? ' [치명타!]' : ''}${hitCount > 1 ? ` (${i+1}/${hitCount})` : ''}${echoTag}`,
            breakdown: dmgResult.breakdown.join(' / '),
          });
          
          // 매 히트마다 디버프 부여 (다단히트 누적)
          const attackPassivesPerHit = getActivePassives(skills, 'onAttack', activeSkills);
          attackPassivesPerHit.forEach(p => {
            if (p.effect === 'applyShockGauge') {
              let gaugeAdd = GAME_CONFIG.shockGaugeBase;
              if (hasEffect(skills, 'shockBonus', activeSkills)) gaugeAdd = GAME_CONFIG.shockGaugeBase + GAME_CONFIG.shockGaugeBonus;
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
                  everStunned: true,  
                };
                if (hasEffect(skills, 'shockBonus', activeSkills)) {
                  const bonusDmg = 15;
                  newEnemy.currentHp = Math.max(0, newEnemy.currentHp - bonusDmg);
                  newLog.push({ type: 'damage', text: `· [강타 Lv.5] 기절 추가 데미지 ${bonusDmg}` });
                }
                if (hasUltimate(ultimates, 'ult_shockBlast')) {
                  newEnemy.currentHp = Math.max(0, newEnemy.currentHp - 30);
                  newLog.push({ type: 'damage', text: `★ [광역 폭발] 폭발 데미지 30` });
                }
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
      
      // === 이프리트 화염 각인 (minor 효과 + 궁극) ===
      // 이프리트 패시브 보유 (Lv.0+ 활성) 또는 궁극 보유 시 발동
      const ifritLvForIgnite = (skills && skills['이프리트']) || 0;
      const hasIfritPassive = ifritLvForIgnite > 0 && (!activeSkills || activeSkills.includes('이프리트'));
      const hasEternalFire = hasUltimate(ultimates, 'ult_eternalFire');
      const hasIfritDescent = hasUltimate(ultimates, 'ult_ifritDescent');
      const hasPurgatoryFire = hasUltimate(ultimates, 'ult_purgatoryFire');
      const hasAnyIfritUlt = hasEternalFire || hasIfritDescent || hasPurgatoryFire;
      
      if (skill.type === 'magic' && (hasIfritPassive || hasAnyIfritUlt) && newEnemy.currentHp > 0) {
        // 발동 확률 계산
        let igniteChance = 0;
        if (hasEternalFire) igniteChance = hasIfritPassive ? 0.7 : 0.4;
        else if (hasIfritDescent) igniteChance = hasIfritPassive ? 0.8 : 0.5;
        else if (hasPurgatoryFire) igniteChance = hasIfritPassive ? 0.7 : 0.4;
        else if (hasIfritPassive) igniteChance = 0.3;  // 패시브만 보유
        
        if (Math.random() < igniteChance) {
          // 각인 데미지 = 지능 × 0.3 (모든 경우 동일, 영겁지화 단독에서만 누적)
          const baseIgniteDmg = Math.floor(newPlayer.지능 * 0.3);
          // Lv.7 효과: 지속 +1턴 (3 → 4) — 패시브 Lv.7 활성 시만
          let igniteTurns = (hasIfritPassive && ifritLvForIgnite >= 7) ? 4 : 3;
          
          let newIgniteDmg;
          let newIgniteTurns;
          let isEternal;
          
          if (hasEternalFire) {
            // 영겁지화 — 항상 누적, 영구 지속 (패시브 유무 무관)
            // 차이: 단독은 폭발 X, 패시브 함께면 폭발 O (canExplode에서 처리)
            const prevDmg = newEnemy.debuffs?.igniteDmg || 0;
            newIgniteDmg = prevDmg + baseIgniteDmg;
            newIgniteTurns = 999;  // 영구
            isEternal = true;
          } else {
            // 일반 (패시브, 화신강림, 연옥지화) — 데미지 갱신, 턴수 갱신
            newIgniteDmg = baseIgniteDmg;
            newIgniteTurns = igniteTurns;
            isEternal = false;
          }
          
          newEnemy.debuffs = { 
            ...newEnemy.debuffs, 
            igniteDmg: newIgniteDmg, 
            igniteTurns: newIgniteTurns,
            igniteEternal: isEternal,
            igniteJustApplied: true,  // 이번 턴 부여 여부 (연옥지화 +20% 마법딜에 사용)
          };
          newLog.push({ type: 'debuff', text: `🔥 [화염 각인] ${newIgniteDmg} 데미지 ${isEternal ? '영구' : newIgniteTurns + 'T'}` });
        }
      }
      // 자가 회복 (사제 - 신성광선)
      if (skill.selfHeal) {
        let heal = skill.selfHeal;
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
      newPlayer.ether = Math.min(newPlayer.maxEther || 3, newPlayer.ether + 1);
      newPlayer.cooldowns = {}; 
      newLog.push({ type: 'passive', text: `★ [시간 역행] 모든 마법 스킬 쿨다운 제거, 에테르 +1` });
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setLog(newLog);

    if (newEnemy.currentHp <= 0) {
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
          let baseDmg = Math.floor(intent.dmg[0] + Math.random() * (intent.dmg[1] - intent.dmg[0]));
          let dmg = baseDmg;
          let berserkBonus = 0;
          // 챔피언십 — 적 광폭 누적 보너스
          if (newEnemy.berserkStacks > 0) {
            berserkBonus = newEnemy.berserkStacks;
            dmg += berserkBonus;
          }
          const takenBreakdown = [`기본 ${baseDmg}`];
          if (berserkBonus > 0) takenBreakdown.push(`광폭 +${berserkBonus}`);
          // 수비 Lv.7: 방어 게이지가 최대 HP의 50% 이상이면 받는 데미지 50% 차단
          if (hasEffect(skills, 'fortify', activeSkills) && newPlayer.defense >= newPlayer.maxHp * 0.5) {
            const blocked = Math.floor(dmg * 0.5);
            dmg -= blocked;
            if (blocked > 0) takenBreakdown.push(`수비 Lv.7 -${blocked}`);
          }
          if (newPlayer.defense > 0) {
            const absorbed = Math.min(newPlayer.defense, dmg);
            newPlayer.defense -= absorbed;
            dmg -= absorbed;
            if (absorbed > 0) takenBreakdown.push(`내 방어 -${absorbed}`);
          }
          if (hasEffect(skills, 'dmgTaken-15', activeSkills) && dmg > 0) {
            const reduced = Math.floor(dmg * 0.15);
            dmg -= reduced;
            if (reduced > 0) takenBreakdown.push(`수비 Lv.5 -${reduced}`);
          }
          // 메타 강화: 받는 데미지 -3%/단계
          const metaReduction = getMetaBonus(meta, 'dmgTaken-3%') * 0.03;
          if (metaReduction > 0 && dmg > 0) {
            const reduced = Math.floor(dmg * metaReduction);
            dmg -= reduced;
            if (reduced > 0) takenBreakdown.push(`강철의 의지 -${reduced}`);
          }
          // 유물: dmgTaken % (음수면 감소, 양수면 증가)
          if (relicStat.dmgTaken && dmg > 0) {
            const change = Math.floor(dmg * relicStat.dmgTaken / 100);
            dmg += change;
            if (change < 0) takenBreakdown.push(`유물 -${-change}`);
            else if (change > 0) takenBreakdown.push(`유물 부작용 +${change}`);
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
            takenBreakdown.push(`저주 +${inc}`);
          }
          // 궁극 [황혼의 저주]: 받는 데미지 -25%
          if (hasUltimate(ultimates, 'ult_deblanCurse') && dmg > 0) {
            const reduced = Math.floor(dmg * 0.25);
            dmg -= reduced;
            if (reduced > 0) takenBreakdown.push(`황혼의 저주 -${reduced}`);
            // 30% 확률로 적 자해
            if (Math.random() < 0.3) {
              const counterDmg = Math.floor(dmg * 0.5);
              newEnemy.currentHp = Math.max(0, newEnemy.currentHp - counterDmg);
              newLog.push({ type: 'passive', text: `★ [황혼의 저주] 적 자해 ${counterDmg}` });
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
              newLog.push({ 
                type: 'damageTaken', 
                text: `· ${dmg} 데미지`,
                breakdown: takenBreakdown.join(' / '),
              });
              setAnimDmg({ player: dmg, enemy: null });
              setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);
            }
          }
        }
      }
      
      // === 적 의도가 frostbite (동상 부여)면 플레이어에 동상 디버프 적용 ===
      // 데미지 처리 후, 회피해도 디버프는 적용됨 (북부 원정 컨셉 — 한기 환경 효과)
      if (intent.frostbite && intent.frostbite > 0) {
        let frostDmg = intent.frostbite;
        // 한기의 결정 유물: 동상 데미지 -%
        const frostResist = relicStat.frostbiteResist || 0;
        if (frostResist > 0) {
          frostDmg = Math.max(1, Math.floor(frostDmg * (1 - frostResist / 100)));
        }
        // 갱신: 턴수 리셋, 데미지는 더 큰 값으로 (덮어쓰기)
        const prevDmg = newPlayer.debuffs?.frostbiteDmg || 0;
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          frostbiteDmg: Math.max(prevDmg, frostDmg),
          frostbiteTurns: 3,
        };
        const resistText = frostResist > 0 ? ` (저항 ${frostResist}%)` : '';
        newLog.push({ type: 'debuff', text: `❄️ [동상] ${frostDmg} 데미지 3T${resistText}` });
      }
      
      // === 적 의도가 seal (패시브 봉인)면 플레이어 패시브 임시 봉인 ===
      // 봉인된 신전 컨셉 — 플레이어 패시브 중 N개 랜덤 봉인 (1턴)
      // 봉인의 인장 유물: sealResist% 만큼 봉인 확률 감소
      if (intent.seal && intent.seal > 0) {
        const sealResist = relicStat.sealResist || 0;
        // 저항 체크 — 50% 보유 시 50% 확률로 봉인 무효
        const sealAvoided = sealResist > 0 && Math.random() < (sealResist / 100);
        if (!sealAvoided) {
          const sealCount = intent.seal;
          // 보유 패시브 중 봉인 가능한 것 (시작 패시브, 이미 봉인된 것 제외)
          const ownedSkills = Object.entries(skills)
            .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
            .map(([n]) => n);
          const alreadySealed = newPlayer.debuffs?.sealedSkills || [];
          const sealable = ownedSkills.filter(s => !alreadySealed.includes(s));
          // 랜덤 N개 선택
          const shuffled = [...sealable].sort(() => Math.random() - 0.5);
          const newSealed = shuffled.slice(0, sealCount);
          if (newSealed.length > 0) {
            newPlayer.debuffs = {
              ...newPlayer.debuffs,
              sealedSkills: [...alreadySealed, ...newSealed],
              sealedTurns: 2,  // 2턴 봉인 (이번 턴 + 다음 턴)
            };
            newLog.push({ type: 'debuff', text: `🔒 [봉인] ${newSealed.join(', ')} 2T` });
          }
        } else {
          newLog.push({ type: 'debuff', text: `🔒 [봉인] 저항됨 (${sealResist}%)` });
        }
      }
      
      // === 적 의도가 shock (충격 부여)면 플레이어 충격 게이지 누적 ===
      // 마계의 균열 컨셉 — 100 도달 시 1턴 기절
      // 균열의 핵 유물: shockResist% 만큼 충격 누적량 감소
      if (intent.shock && intent.shock > 0) {
        let shockAmt = intent.shock;
        const shockResist = relicStat.shockResist || 0;
        if (shockResist > 0) {
          shockAmt = Math.max(1, Math.floor(shockAmt * (1 - shockResist / 100)));
        }
        const prevShock = newPlayer.debuffs?.shockGauge || 0;
        const newShock = prevShock + shockAmt;
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          shockGauge: newShock,
        };
        const resistText = shockResist > 0 ? ` (저항 ${shockResist}%)` : '';
        newLog.push({ type: 'debuff', text: `⚡ [충격] +${shockAmt} (총 ${newShock}/100)${resistText}` });
        // 100 도달 시 다음 턴 기절
        if (newShock >= 100) {
          newPlayer.debuffs = {
            ...newPlayer.debuffs,
            shockGauge: 0,
            stunnedTurns: 1,  // 다음 1턴 기절
          };
          newLog.push({ type: 'debuff', text: `💫 [기절] 충격 100 도달 — 다음 턴 행동 불가` });
        }
      }
      
      // ============ 심안류 반격 시스템 ============
      // 회피와 독립 — 회피 성공/실패와 무관하게 반격 확률 체크
      // 적의 attack 1턴 = 1회 반격 판정
      const simanLv = skills['심안류'] || 0;
      const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
      const hasShock = hasUltimate(ultimates, 'ult_counterShock');
      const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
      const hasAnyCounterUlt = hasMirror || hasShock || hasShadow;
      
      if (simanLv > 0 || hasAnyCounterUlt) {
        // 반격 확률 계산 (기본 0% — 심안류 레벨/궁극으로만 획득)
        let counterRate = simanLv * 5;  // Lv당 +5%
        if (simanLv >= 3) counterRate += 10;  // Lv.3 추가 +10%
        if (hasMirror) counterRate += 50;
        else if (hasShock) counterRate += 40;
        else if (hasShadow) counterRate += 40;
        // 반격률 상한 75%
        if (counterRate > 75) counterRate = 75;
        
        // 회피했고 명경지수면: 다음 턴 반격 데미지 +50% 효과 표시
        if (dodged && hasMirror) {
          newPlayer.buffs = { ...newPlayer.buffs, mirrorCounterDmgNext: true };
          newLog.push({ type: 'passive', text: `★ [명경지수] 회피! 다음 턴 반격 데미지 +50%` });
        }
        
        // 반격 판정
        if (Math.random() * 100 < counterRate) {
          // 반격 데미지 = 근력 × 1.5 (기본)
          let counterDmg = Math.floor(newPlayer.근력 * 1.5);
          
          // minor: +5%/Lv
          if (simanLv > 0) counterDmg = Math.floor(counterDmg * (1 + simanLv * 0.05));
          // Lv.5: +15%
          if (simanLv >= 5) counterDmg = Math.floor(counterDmg * 1.15);
          // 궁극 공통: +50%
          if (hasAnyCounterUlt) counterDmg = Math.floor(counterDmg * 1.5);
          // 명경지수: 회피→다음턴 반격 데미지 +50% 버프 소비
          if (newPlayer.buffs?.mirrorCounterDmgPending) {
            counterDmg = Math.floor(counterDmg * 1.5);
            newPlayer.buffs = { ...newPlayer.buffs, mirrorCounterDmgPending: false };
            newLog.push({ type: 'passive', text: `★ [명경지수] 회피→반격 데미지 +50% 적용!` });
          }
          // 무영검: 누적된 미스 보너스 적용
          if (hasShadow && newPlayer.buffs?.shadowCounterStack > 0) {
            const stack = newPlayer.buffs.shadowCounterStack;
            counterDmg = Math.floor(counterDmg * (1 + stack * 0.5));
            newLog.push({ type: 'passive', text: `★ [무영검] 누적 ×${stack} 데미지 폭발!` });
            newPlayer.buffs = { ...newPlayer.buffs, shadowCounterStack: 0 };
          }
          
          // 적 방어 적용
          let actualDmg = counterDmg;
          if (newEnemy.defense > 0) {
            const absorbed = Math.min(newEnemy.defense, actualDmg);
            newEnemy.defense -= absorbed;
            actualDmg -= absorbed;
          }
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg);
          newLog.push({ type: 'damage', text: `◆ [심안류] 반격! ${actualDmg} 데미지` });
          
          // Lv.7: 반격 발생 시 다음 턴 반드시 치명타
          if (simanLv >= 7) {
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCritNext: true };
            newLog.push({ type: 'passive', text: `◆ [심안류 Lv.7] 다음 턴 반드시 치명타!` });
          }
          
          // 명경지수: 반격 후 다음 턴 회피율 +30%
          if (hasMirror) {
            newPlayer.buffs = { ...newPlayer.buffs, mirrorDodgeNext: 30 };
            newLog.push({ type: 'passive', text: `★ [명경지수] 다음 턴 회피율 +30%` });
          }
          
          // 검로일여: 반격 시 충격 게이지 +30
          if (hasShock) {
            const currentGauge = newEnemy.debuffs?.shockGauge || 0;
            const newGauge = currentGauge + 30;
            if (newGauge >= 100) {
              newEnemy.debuffs = { 
                ...newEnemy.debuffs, 
                stunned: 1, shockGauge: 0, everStunned: true,
              };
              newLog.push({ type: 'debuff', text: `★ [검로일여] 충격 100! 기절!` });
            } else {
              newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: newGauge };
              newLog.push({ type: 'debuff', text: `★ [검로일여] 충격 +30 (${newGauge}/100)` });
            }
          }
          
          // 무영검: 반격 시 다음 턴 치명타 확률 +30%
          if (hasShadow) {
            newPlayer.buffs = { ...newPlayer.buffs, shadowCritNext: 30 };
            newLog.push({ type: 'passive', text: `★ [무영검] 다음 턴 치명타 +30%` });
          }
          
          // 명경지수: 회피→다음턴 반격 데미지 +50% 버프를 다음 턴으로 넘김
          if (newPlayer.buffs?.mirrorCounterDmgNext) {
            newPlayer.buffs = { 
              ...newPlayer.buffs, 
              mirrorCounterDmgPending: true,
              mirrorCounterDmgNext: false,
            };
          }
        } else {
          // 반격 실패 — 무영검: 누적 +50%
          if (hasShadow) {
            const stack = (newPlayer.buffs?.shadowCounterStack || 0) + 1;
            newPlayer.buffs = { ...newPlayer.buffs, shadowCounterStack: stack };
            newLog.push({ type: 'passive', text: `★ [무영검] 반격 실패. 누적 ×${stack} (다음 발동 시 폭발)` });
          }
        }
      }
    } else if (intent.type === 'defend') {
      // 방어는 이미 endTurn에서 적용됨 — 적 턴엔 추가 처리 없음 (중복 방지)
    }

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog);
    
    // 반격으로 적 사망 처리
    if (newEnemy.currentHp <= 0) {
      // 흡혈 (유물)
      if (relicStat.lifesteal > 0) {
        const heal = relicStat.lifesteal;
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◆ [유물] 흡혈 +${heal}` });
        setPlayer(newPlayer);
      }
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'victory', text: `━━ ${enemy.name} 처치 (반격) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
      }, 800);
      return;
    }
    
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
    
    // === 이프리트 화염 각인 도트 처리 ===
    if (newEnemy.debuffs?.igniteDmg > 0 && newEnemy.debuffs?.igniteTurns > 0) {
      const igniteDmg = newEnemy.debuffs.igniteDmg;
      // 화염 각인은 항상 방어 무시
      newEnemy.currentHp = Math.max(0, newEnemy.currentHp - igniteDmg);
      
      // 영겁이 아니면 턴 감소
      const isEternal = newEnemy.debuffs.igniteEternal;
      if (!isEternal) {
        const newTurns = newEnemy.debuffs.igniteTurns - 1;
        newEnemy.debuffs = {
          ...newEnemy.debuffs,
          igniteTurns: newTurns,
          igniteDmg: newTurns <= 0 ? 0 : newEnemy.debuffs.igniteDmg,
        };
      }
      newLog.push({ type: 'debuff', text: `🔥 화염 각인 ${igniteDmg} 데미지` });
      if (newEnemy.currentHp <= 0) {
        setEnemy(newEnemy);
        setPlayer(newPlayer);
        setLog([...newLog, { type: 'victory', text: `━━ ${enemy.name} 처치 (화염 각인) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
        return;
      }
    }
    
    // === 챔피언십 — 플레이어 동상 도트 처리 (북부) ===
    if (newPlayer.debuffs?.frostbiteDmg > 0 && newPlayer.debuffs?.frostbiteTurns > 0) {
      const frostDmg = newPlayer.debuffs.frostbiteDmg;
      newPlayer.hp = Math.max(0, newPlayer.hp - frostDmg);
      const newTurns = newPlayer.debuffs.frostbiteTurns - 1;
      newPlayer.debuffs = {
        ...newPlayer.debuffs,
        frostbiteTurns: newTurns,
        frostbiteDmg: newTurns <= 0 ? 0 : newPlayer.debuffs.frostbiteDmg,
      };
      newLog.push({ type: 'debuff', text: `❄️ 동상 ${frostDmg} 데미지` });
      if (newPlayer.hp <= 0) {
        setEnemy(newEnemy);
        setPlayer(newPlayer);
        setLog([...newLog, { type: 'defeat', text: `━━ 동상에 의해 사망 ━━` }]);
        setPhase('defeat');
        actionLockRef.current = false;
        return;
      }
    }
    
    // === 챔피언십 — 플레이어 봉인 턴 감소 (신전) ===
    if (newPlayer.debuffs?.sealedTurns > 0) {
      const newTurns = newPlayer.debuffs.sealedTurns - 1;
      if (newTurns <= 0) {
        // 봉인 해제
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          sealedTurns: 0,
          sealedSkills: [],
        };
        newLog.push({ type: 'debuff', text: `🔓 봉인 해제` });
      } else {
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          sealedTurns: newTurns,
        };
      }
    }
    
    // === 챔피언십 — 적 자가 회복 (회랑) ===
    // 여명의 성배 유물: antiHeal% 만큼 적 회복량 감소
    if (newEnemy.regen > 0 && newEnemy.currentHp > 0 && newEnemy.currentHp < newEnemy.hp) {
      let regenAmount = newEnemy.regen;
      const antiHeal = relicStat.antiHeal || 0;
      if (antiHeal > 0) {
        regenAmount = Math.max(1, Math.floor(regenAmount * (1 - antiHeal / 100)));
      }
      newEnemy.currentHp = Math.min(newEnemy.hp, newEnemy.currentHp + regenAmount);
      const antiText = antiHeal > 0 ? ` (저항 ${antiHeal}%)` : '';
      newLog.push({ type: 'enemy_action', text: `✨ ${enemy.name} 회복 +${regenAmount}${antiText}` });
    }
    
    // === 챔피언십 — 적 광폭 누적 (숲) ===
    // berserkPerTurn: 매 턴 적 데미지 +N (누적)
    // 광기의 송곳니 유물: berserkResist% 만큼 누적량 감소
    if (newEnemy.berserkPerTurn > 0) {
      let stackAmt = newEnemy.berserkPerTurn;
      const berserkResist = relicStat.berserkResist || 0;
      if (berserkResist > 0) {
        stackAmt = Math.max(1, Math.floor(stackAmt * (1 - berserkResist / 100)));
      }
      newEnemy.berserkStacks = (newEnemy.berserkStacks || 0) + stackAmt;
      const resistText = berserkResist > 0 ? ` (저항 ${berserkResist}%)` : '';
      newLog.push({ type: 'enemy_action', text: `🩸 ${enemy.name} 광폭 +${stackAmt} (총 +${newEnemy.berserkStacks} 데미지)${resistText}` });
    }

    Object.keys(newPlayer.cooldowns).forEach(k => {
      if (newPlayer.cooldowns[k] > 0) newPlayer.cooldowns[k]--;
    });
    // 황혼의 모래시계: 매 턴 20% 확률로 모든 스킬 쿨다운 -1 (이미 -1된 거 추가)
    const hourglassChance = (relicStat.cdReduceChance || 0);
    if (hourglassChance > 0 && Math.random() * 100 < hourglassChance) {
      let reduced = false;
      Object.keys(newPlayer.cooldowns).forEach(k => {
        if (newPlayer.cooldowns[k] > 0) {
          newPlayer.cooldowns[k]--;
          reduced = true;
        }
      });
      if (reduced) newLog.push({ type: 'passive', text: `◇ [황혼의 모래시계] 쿨다운 -1` });
    }
    if (newPlayer.buffs?.rage > 0) {
      newPlayer.buffs.rage--;
      if (newPlayer.buffs.rage === 0) newLog.push({ type: 'system', text: `· 분노 종료` });
    }
    if (newPlayer.buffs?.dodgeBuffTurns > 0) {
      newPlayer.buffs.dodgeBuffTurns--;
      if (newPlayer.buffs.dodgeBuffTurns === 0) newPlayer.buffs.dodgeBuff = 0;
    }
    // 심안류 궁극 1턴 버프 정리
    if (newPlayer.buffs?.mirrorDodgeNext > 0) {
      newPlayer.buffs = { ...newPlayer.buffs, mirrorDodgeNext: 0 };
    }
    if (newPlayer.buffs?.shadowCritNext > 0) {
      newPlayer.buffs = { ...newPlayer.buffs, shadowCritNext: 0 };
    }
    // 화신강림 1턴 치명 버프 정리
    if (newPlayer.buffs?.ifritCritNext) {
      newPlayer.buffs = { ...newPlayer.buffs };
      delete newPlayer.buffs.ifritCritNext;
    }
    // 화염 각인 "이번 턴 부여" 플래그 정리 (다음 턴부터는 +20% 적용 가능)
    if (newEnemy.debuffs?.igniteJustApplied) {
      newEnemy.debuffs = { ...newEnemy.debuffs, igniteJustApplied: false };
    }
    // 방어 리셋 — 내 방어 스킬은 사용한 턴만 유지, 다음 턴 시작 시 0으로
    if (newPlayer.defense > 0) {
      newPlayer.defense = 0;
    }
    newPlayer.ether = Math.min(newPlayer.maxEther, newPlayer.ether + 1);

    let extraTurnTriggered = false;
    let bestExtraTurnInterval = Infinity;
    let guaranteedCrit = false;
    getActivePassives(skills, 'onTurnStart', activeSkills).forEach(p => {
      if (p.effect === 'regenPerTurn') {
        let regen = 3;
        // 궁극 [여명의 축복]: 회복 효과 +50%
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
    
    // 궁극 [여명의 축복]: 매 턴 HP +5
    if (hasUltimate(ultimates, 'ult_derodBlessing')) {
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + 5);
      newLog.push({ type: 'passive', text: `★ [여명의 축복] HP +5` });
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
    // 방어 리셋 — 내 방어와 적 방어 모두 그 턴만 유지 (다음 턴 시작 시 0으로)
    // 내 defense는 위에서 이미 0으로 리셋됨
    newEnemy.defense = 0;
    // 적 의도가 defend면 즉시 방어 적용 (내 공격 받기 전에 막음)
    if (newEnemy.nextIntent?.type === 'defend' && newEnemy.nextIntent.defense) {
      newEnemy.defense = newEnemy.nextIntent.defense;
      // 심안 등급별로 메시지 노출 (심안 없으면 알 수 없음)
      const simanLvForLog = getSkillLevel(skills, '심안');
      if (simanLvForLog >= 7) {
        newLog.push({ type: 'system', text: `· ${newEnemy.name}이(가) ${newEnemy.nextIntent.name} 자세 (+${newEnemy.nextIntent.defense})` });
      } else if (simanLvForLog >= 5) {
        newLog.push({ type: 'system', text: `· ${newEnemy.name}이(가) ${newEnemy.nextIntent.name} 자세를 취했다` });
      } else if (simanLvForLog >= 3) {
        newLog.push({ type: 'system', text: `· ${newEnemy.name}이(가) 방어 자세를 취한 것 같다` });
      }
      // Lv.0~2: 로그 표시 안 함
    }

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog); setTurn(newTurn);

    // === 챔피언십 균열: 플레이어 기절 시 다음 턴 스킵 ===
    if (newPlayer.debuffs?.stunnedTurns > 0) {
      // 기절 턴 감소
      const skipPlayer = {
        ...newPlayer,
        debuffs: {
          ...newPlayer.debuffs,
          stunnedTurns: Math.max(0, (newPlayer.debuffs?.stunnedTurns || 0) - 1),
        }
      };
      const skipLog = [...newLog, { type: 'debuff', text: `💫 기절 — 행동 불가 (턴 스킵)` }];
      
      setPlayer(skipPlayer);
      setLog(skipLog);
      setPhase('enemyTurn');
      
      // 다음 적 턴 실행 — 적이 의도 결정 후 행동
      setTimeout(() => {
        // 새 의도 결정 (적이 다시 행동하므로)
        const newIntent = newEnemy.patterns[Math.floor(Math.random() * newEnemy.patterns.length)];
        const enemyWithIntent = { ...newEnemy, nextIntent: newIntent };
        setEnemy(enemyWithIntent);
        // 적 턴 실행
        setTimeout(() => {
          executeEnemyTurn(skipPlayer, enemyWithIntent, skipLog);
        }, 350);
      }, 500);
      return;
    }

    if (extraTurnTriggered) {
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'passive', text: `◆ [가속] 추가 턴!` }]);
        setPhase('playerTurn');
        actionLockRef.current = false;
      }, 350);
    } else {
      setTimeout(() => {
        setPhase('playerTurn');
        actionLockRef.current = false;
      }, 250);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 최상단 턴 정보 (높이 고정) */}
      <div className="px-4 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.accent }}>━━ 전투 ━━</span>
        <span className="text-[10px] tabular-nums" style={{ color: PALETTE.dawn }}>TURN {turn}</span>
      </div>

      {/* 메인 컨테이너: 3분할 + 스킬 버튼 세로 배치 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* === 1/3: 적 영역 (일러스트 + 정보 BAR 오버레이) === */}
        <div className="flex-1 min-h-0 relative overflow-hidden border-b" style={{ borderColor: PALETTE.panelBorder }}>
          {/* 적 일러스트 미구현 — 어두운 배경 + 패턴 */}
          <div className="absolute inset-0 bg-[#0a0608] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20" style={{ background: `repeating-linear-gradient(45deg, transparent 0px, transparent 8px, ${enemy.color}15 8px, ${enemy.color}15 9px)` }} />
            <div className="text-[12px] tracking-[0.3em] relative grayscale" style={{ color: PALETTE.textDim }}>[ 적 모습 미구현 ]</div>
          </div>
          {/* 정보 BAR 오버레이 (하단 + 그라디언트) */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)`, pointerEvents: 'none' }} />
            <div className="relative px-3 py-2">
              {/* 1줄: 이름 + HP */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold drop-shadow-md" style={{ color: enemy.color }}>{enemy.name}</span>
                <span className="text-[11px] tabular-nums drop-shadow-md" style={{ color: PALETTE.text }}>{animDmg.enemy && <span className="mr-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.enemy}</span>}{enemy.currentHp}/{enemy.hp}</span>
              </div>
              <div className="h-1.5 relative mb-1.5" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${(enemy.currentHp/enemy.hp)*100}%`, background: `linear-gradient(90deg, ${PALETTE.blood}, ${enemy.color})` }} /></div>
              {/* 2줄: 디버프 카드 (고정 높이) */}
              <div className="flex items-center gap-1.5 flex-wrap min-h-[18px] mb-1">
                {enemy.defense > 0 && getSkillLevel(skills, '심안') >= 7 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}40`, color: PALETTE.defense, border: `1px solid ${PALETTE.defense}80` }}>◈ 방어 {enemy.defense}</span>)}
                {enemy.debuffs?.bleed > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.bleed}40`, color: PALETTE.bleed, border: `1px solid ${PALETTE.bleed}80` }}>◆ 출혈 {enemy.debuffs.bleed} ({enemy.debuffs.bleedTurns}T)</span>)}
                {enemy.debuffs?.igniteDmg > 0 && enemy.debuffs?.igniteTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#ff6b3540', color: '#ff6b35', border: '1px solid #ff6b3580' }}>🔥 화염 {enemy.debuffs.igniteDmg} ({enemy.debuffs.igniteEternal ? '∞' : enemy.debuffs.igniteTurns + 'T'})</span>)}
                {enemy.berserkStacks > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#c4453d40', color: '#c4453d', border: '1px solid #c4453d80' }}>🩸 광폭 +{enemy.berserkStacks}</span>)}
                {enemy.regen > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#9ad4a340', color: '#9ad4a3', border: '1px solid #9ad4a380' }}>✨ 회복 +{enemy.regen}/T</span>)}
                {enemy.debuffs?.shockGauge > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.shock}40`, color: PALETTE.shock, border: `1px solid ${PALETTE.shock}80` }}>⚡ 충격 {enemy.debuffs.shockGauge}/100</span>)}
                {enemy.debuffs?.stunned > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}40`, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}` }}>✦ 기절</span>)}
                {enemy.debuffs?.shockResist > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.textDim}40`, color: PALETTE.textDim, border: `1px solid ${PALETTE.textDim}80` }}>◇ 저항 ({enemy.debuffs.shockResistTurns}T)</span>)}
              </div>
              {/* 3줄: 심안 의도 카드 (고정 높이) */}
              <div className="min-h-[22px]">
                {phase === 'playerTurn' && enemy.nextIntent && getSkillLevel(skills, '심안') >= 3 && (() => {
                  const lv = getSkillLevel(skills, '심안');
                  const isAttack = enemy.nextIntent.type === 'attack';
                  if (lv < 5) {
                    return (
                      <div className="px-2 py-1 flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.7)', border: `1px dashed ${enemy.color}80` }}>
                        <AlertTriangle size={11} style={{ color: enemy.color }} />
                        <span className="text-[10px] italic" style={{ color: PALETTE.text }}>{isAttack ? '공격할 것 같다' : '방어할 거 같다'}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="px-2 py-1 flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.7)', border: `1px dashed ${enemy.color}80` }}>
                      <AlertTriangle size={11} style={{ color: enemy.color }} />
                      <span className="text-[10px] px-1" style={{ background: isAttack ? `${PALETTE.accent}30` : `${PALETTE.defense}30`, color: isAttack ? PALETTE.accent : PALETTE.defense, border: `1px solid ${isAttack ? PALETTE.accent : PALETTE.defense}60` }}>{isAttack ? '공격' : '방어'}</span>
                      <span className="text-[11px] font-bold" style={{ color: PALETTE.text }}>{enemy.nextIntent.name}</span>
                      {lv >= 7 && (
                        <div className="flex ml-auto gap-2">
                          {enemy.nextIntent.dmg && enemy.nextIntent.dmg[1] > 0 && (
                            <span className="text-[10px] tabular-nums" style={{ color: enemy.nextIntent.heavy ? PALETTE.accent : PALETTE.textDim }}>{enemy.nextIntent.dmg[0]}-{enemy.nextIntent.dmg[1]}</span>
                          )}
                          {enemy.nextIntent.type === 'defend' && enemy.nextIntent.defense && (
                            <span className="text-[10px]" style={{ color: PALETTE.defense }}>+{enemy.nextIntent.defense}</span>
                          )}
                          {enemy.nextIntent.frostbite > 0 && (
                            <span className="text-[10px]" style={{ color: '#7ba3c4' }}>❄️{enemy.nextIntent.frostbite}</span>
                          )}
                          {enemy.nextIntent.seal > 0 && (
                            <span className="text-[10px]" style={{ color: '#5c4a8c' }}>🔒{enemy.nextIntent.seal}</span>
                          )}
                          {enemy.nextIntent.shock > 0 && (
                            <span className="text-[10px]" style={{ color: '#8b1f1f' }}>⚡{enemy.nextIntent.shock}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* === 2/3: 전투 로그 (5줄 분량 = 약 110px 고정) === */}
        <div className="shrink-0 h-[110px] overflow-y-auto px-3 py-2 space-y-1 border-b" style={{ borderColor: PALETTE.panelBorder, background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)` }}>
          {log.map((l, i) => (
            <div key={i}>
              <div className="text-[11px] leading-snug" style={{ color: l.type === 'damage' ? PALETTE.accent : l.type === 'damageTaken' ? PALETTE.bleed : l.type === 'crit' ? PALETTE.legendary : l.type === 'passive' ? PALETTE.dawn : l.type === 'debuff' ? PALETTE.shock : l.type === 'heal' ? PALETTE.green : l.type === 'enemy_action' ? PALETTE.accent : l.type === 'victory' ? PALETTE.legendary : l.type === 'defeat' ? PALETTE.accent : PALETTE.text, opacity: l.type === 'system' ? 0.7 : 1 }}>{l.text}</div>
              {l.breakdown && (<div className="text-[9px] leading-snug pl-3" style={{ color: PALETTE.textDim, opacity: 0.7 }}>({l.breakdown})</div>)}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* === 3/3: 내 영역 (일러스트 + 정보 BAR 오버레이) === */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* 내 전투 일러스트 — 가로형, 가득 채움 */}
          <img 
            src={classData.combatImage || classData.image} 
            alt="Player Avatar" 
            className="absolute inset-0 w-full h-full object-cover" 
            style={{ objectPosition: 'center center' }} 
            onError={(e) => { 
              // 전투 일러 없으면 기본 일러로 폴백
              if (e.target.src.includes('combat/')) {
                e.target.src = classData.image; 
              } else {
                e.target.src = '/classes/lanthert.jpg'; 
              }
            }} 
          />
          {/* 정보 BAR 오버레이 (하단 + 그라디언트) */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)`, pointerEvents: 'none' }} />
            <div className="relative px-3 py-2">
              {/* 1줄: 이름 + 스테이터스 모달 버튼 + HP */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold drop-shadow-md" style={{ color: classData.color }}>{classData.name}</span>
                  <button onClick={() => setStatusModalOpen(true)} className="text-[10px] px-1.5 py-0.5 leading-none" style={{ background: `${classData.color}30`, border: `1px solid ${classData.color}80`, color: '#fff' }} title="스테이터스 보기">≡</button>
                </div>
                <span className="text-[11px] tabular-nums font-bold drop-shadow-md" style={{ color: PALETTE.text }}>{animDmg.player && <span className="mr-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.player}</span>}{player.hp}/{player.maxHp}</span>
              </div>
              <div className="h-1.5 relative mb-1.5" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${(player.hp/player.maxHp)*100}%`, background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.green})` }} /></div>
              {/* 2줄: 버프/상태 카드 (고정 높이) */}
              <div className="flex items-center gap-1.5 flex-wrap min-h-[18px]">
                <span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.twilight}50`, color: '#fff', border: `1px solid ${PALETTE.twilight}` }}>✦ 에테르 {player.ether}/{player.maxEther}</span>
                {player.defense > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}50`, color: '#fff', border: `1px solid ${PALETTE.defense}` }}>◈ 방어 {player.defense}</span>)}
                {player.buffs?.rage > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.accent}50`, color: '#fff', border: `1px solid ${PALETTE.accent}` }}>☩ 분노 ({player.buffs.rage}T)</span>)}
                {player.firstHitImmune && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}50`, color: '#fff', border: `1px solid ${PALETTE.legendary}` }}>✦ 무적 1회</span>)}
                {player.debuffs?.frostbiteDmg > 0 && player.debuffs?.frostbiteTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#7ba3c450', color: '#fff', border: '1px solid #7ba3c4' }}>❄️ 동상 {player.debuffs.frostbiteDmg} ({player.debuffs.frostbiteTurns}T)</span>)}
                {player.debuffs?.sealedTurns > 0 && player.debuffs?.sealedSkills?.length > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#5c4a8c50', color: '#fff', border: '1px solid #5c4a8c' }}>🔒 봉인 {player.debuffs.sealedSkills.join(',')} ({player.debuffs.sealedTurns}T)</span>)}
                {player.debuffs?.shockGauge > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#8b1f1f50', color: '#fff', border: '1px solid #8b1f1f' }}>⚡ 충격 {player.debuffs.shockGauge}/100</span>)}
                {player.debuffs?.stunnedTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#a52a2a50', color: '#fff', border: '1px solid #a52a2a' }}>💫 기절 ({player.debuffs.stunnedTurns}T)</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* 스킬 버튼 — 고정 높이 */}
        <div className="shrink-0 border-t px-2.5 flex flex-col justify-center h-[88px]" style={{
          borderColor: PALETTE.panelBorder, 
          background: PALETTE.bgDeep,
        }}>
          {phase === 'intro' && <div className="text-center text-[11px] font-bold w-full" style={{ color: PALETTE.textDim }}>전투 준비 중...</div>}
          {phase === 'enemyTurn' && <div className="text-center text-[11px] font-bold w-full" style={{ color: PALETTE.accent }}>◂ 적의 턴 ◂</div>}
          {phase === 'playerTurn' && (
            <div className="grid grid-cols-3 gap-1.5 w-full">
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
                      background: disabled ? 'rgba(0,0,0,0.5)'
                        : skill.type === 'physical' ? `${PALETTE.accent}30`
                        : skill.type === 'magic' ? `${PALETTE.twilight}30`
                        : skill.type === 'defense' ? `${PALETTE.ice}30`
                        : `${PALETTE.dawn}30`,
                      border: `1px solid ${disabled ? PALETTE.panelBorder : skill.type === 'physical' ? PALETTE.accent : skill.type === 'magic' ? PALETTE.twilight : skill.type === 'defense' ? PALETTE.ice : PALETTE.dawn}`,
                      color: disabled ? PALETTE.textDim : '#fff',
                      opacity: disabled ? 0.5 : 1,
                    }}>
                    <span className="text-[11px] font-bold">{skill.name}</span>
                    <span className="text-[9px]" style={{ color: disabled ? PALETTE.textDim : '#ddd' }}>
                      {skill.type === 'defense' ? `+${skill.defense}` 
                        : skill.type === 'buff' ? '버프' 
                        : (() => {
                            const dmgRange = getDisplayDamage(skill, player, skills, ultimates, meta, curses, activeSkills, relicStat);
                            return dmgRange ? `${dmgRange[0]}-${dmgRange[1]}` : `${skill.baseDmg[0]}-${skill.baseDmg[1]}`;
                          })()
                      }
                      {cost > 0 && ` ✦${cost}`}
                    </span>
                    {onCd && <span className="text-[9px] font-bold" style={{ color: PALETTE.accent }}>CD {player.cooldowns[skillKey]}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {phase === 'victory' && (
            <button onClick={() => {
              // 연옥지화: 화염 각인 보유 적 처치 시 HP +50
              let finalHp = player.hp;
              if (hasUltimate(ultimates, 'ult_purgatoryFire') && enemy.debuffs?.igniteDmg > 0 && enemy.debuffs?.igniteTurns > 0) {
                finalHp = Math.min(player.maxHp, player.hp + 50);
              }
              onVictory(finalHp, enemy.drop);
            }}
              className="w-full py-2.5 text-xs tracking-[0.3em] font-bold" style={{
                background: `linear-gradient(180deg, ${PALETTE.legendary}60, ${PALETTE.legendary}30)`,
                border: `1px solid ${PALETTE.legendary}`, color: '#fff',
              }}>▸ 보상 획득</button>
          )}
          {phase === 'defeat' && (
            <button onClick={() => onDefeat()} className="w-full py-2.5 text-xs tracking-[0.3em] font-bold" style={{
              background: `linear-gradient(180deg, ${PALETTE.accent}60, ${PALETTE.accent}30)`,
              border: `1px solid ${PALETTE.accent}`, color: '#fff',
            }}>▸ 메인 메뉴로</button>
          )}
        </div>

      </div>
      
      {/* 스테이터스 전체 모달 (직업명 옆 ≡ 클릭 시) */}
      {statusModalOpen && (
        <div onClick={() => setStatusModalOpen(false)} className="absolute inset-0 flex items-center justify-center z-40 px-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm max-h-[85%] overflow-y-auto px-4 py-4" style={{ background: PALETTE.bgDeep, border: `1px solid ${classData.color}` }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[12px] tracking-[0.3em] font-bold" style={{ color: classData.color }}>━ {classData.name} 스테이터스 ━</span>
              <button onClick={() => setStatusModalOpen(false)} className="text-[14px] px-2" style={{ color: PALETTE.textDim }}>✕</button>
            </div>
            
            {/* HP / 에테르 / 방어 */}
            <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
              <div className="px-2 py-1.5" style={{ background: `${PALETTE.blood}20`, border: `1px solid ${PALETTE.blood}60` }}>
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>체력</div>
                <div className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.hp}/{player.maxHp}</div>
              </div>
              <div className="px-2 py-1.5" style={{ background: `${PALETTE.twilight}20`, border: `1px solid ${PALETTE.twilight}60` }}>
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>에테르</div>
                <div className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.ether}/{player.maxEther}</div>
              </div>
              <div className="px-2 py-1.5" style={{ background: `${PALETTE.defense}20`, border: `1px solid ${PALETTE.defense}60` }}>
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>방어</div>
                <div className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.defense || 0}</div>
              </div>
            </div>
            
            {/* 그룹 1: 기본 능력 */}
            <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 기본 능력 ━</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>근력</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.근력 || 0}</span></div>
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>민첩</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.민첩 || 0}</span></div>
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>지능</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.지능 || 0}</span></div>
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>매력</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.매력 || 0}</span></div>
            </div>
            
            {/* 그룹 2: 전투 수치 */}
            {(() => {
              const playerDex = player.민첩 || 10;
              let critRate = 5 + Math.max(0, (playerDex - 10) * 0.5);
              critRate += getMinorBonus(skills, 'critRate+', activeSkills);
              critRate += getMetaBonus(meta, 'critRate+3%') * 3;
              critRate += relicStat.critRate || 0;
              if (hasEffect(skills, 'weaknessPoint', activeSkills)) critRate += 10;
              let critDmg = hasEffect(skills, 'critDmg+30', activeSkills) ? 80 : 50;
              critDmg += relicStat.critDmg || 0;
              if (hasEffect(skills, 'weaknessPoint', activeSkills)) critDmg += 50;
              let dodgeRate = Math.max(0, (playerDex - 10) * 0.3);
              dodgeRate += getMinorBonus(skills, 'dodge+', activeSkills);
              dodgeRate += relicStat.dodge || 0;
              if (hasEffect(skills, 'dodge+15', activeSkills)) dodgeRate += 15;
              if (hasEffect(skills, 'detailIntent', activeSkills)) dodgeRate += 10;
              const simanLv = skills['심안류'] || 0;
              const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
              const hasShock = hasUltimate(ultimates, 'ult_counterShock');
              const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
              let counterRate = 0;
              if (simanLv > 0 || hasMirror || hasShock || hasShadow) {
                counterRate = simanLv * 5;
                if (simanLv >= 3) counterRate += 10;
                if (hasMirror) counterRate += 50;
                else if (hasShock || hasShadow) counterRate += 40;
                if (counterRate > 75) counterRate = 75;  // 상한
              }
              let accuracy = 100 + getMinorBonus(skills, 'accuracy+', activeSkills);
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 전투 수치 ━</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>치명타율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{Math.round(critRate)}%</span></div>
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>치명타데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{Math.round(critDmg)}%</span></div>
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회피율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>{Math.round(dodgeRate)}%</span></div>
                    {counterRate > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격률</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{counterRate}%</span></div>)}
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>명중률</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{Math.round(accuracy)}%</span></div>
                  </div>
                </>
              );
            })()}
            
            {/* 그룹 3: 데미지 보정 */}
            {(() => {
              const physBonus = getMinorBonus(skills, 'physDmg+', activeSkills);
              const magicBonus = getMinorBonus(skills, 'magicDmg+', activeSkills);
              const bleedBonus = getMinorBonus(skills, 'bleedDmg+', activeSkills);
              // 반격 데미지: minor + Lv.5 +15% + 궁극 +50%
              const simanLv = skills['심안류'] || 0;
              const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
              const hasShock = hasUltimate(ultimates, 'ult_counterShock');
              const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
              let counterDmgBonus = simanLv * 5;
              if (simanLv >= 5) counterDmgBonus += 15;
              if (hasMirror || hasShock || hasShadow) counterDmgBonus += 50;
              const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+5%') * 5;
              const relicDmgBonus = relicStat.dmgDealt || 0;
              const allDmgBonus = metaDmgBonus + relicDmgBonus;
              const dmgTakenMeta = getMetaBonus(meta, 'dmgTaken-3%') * 3;
              const dmgTakenRelic = relicStat.dmgTaken || 0;
              const dmgTakenLv5 = hasEffect(skills, 'dmgTaken-20', activeSkills) ? 20 : 0;
              const dmgTakenReduce = dmgTakenMeta + dmgTakenRelic + dmgTakenLv5;
              const dmgDealtCurse = hasCurse(curses, 'curse_dmgDealt-15') ? 15 : 0;
              const dmgTakenCurse = hasCurse(curses, 'curse_dmgTaken+15') ? 15 : 0;
              const hasAny = physBonus || magicBonus || bleedBonus || counterDmgBonus || allDmgBonus || dmgTakenReduce || dmgDealtCurse || dmgTakenCurse || (player.buffs?.rage > 0);
              if (!hasAny) return null;
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 데미지 보정 ━</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
                    {physBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>물리데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{physBonus}</span></div>)}
                    {magicBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>마법데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{magicBonus}%</span></div>)}
                    {bleedBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>출혈데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.bleed }}>+{bleedBonus}%</span></div>)}
                    {counterDmgBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{counterDmgBonus}%</span></div>)}
                    {allDmgBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>모든데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{allDmgBonus}%</span></div>)}
                    {player.buffs?.rage > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>분노버프</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+30%</span></div>)}
                    {dmgTakenReduce > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>받는데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>-{dmgTakenReduce}%</span></div>)}
                    {dmgDealtCurse > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>저주(딜)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{dmgDealtCurse}%</span></div>)}
                    {dmgTakenCurse > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>저주(피)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{dmgTakenCurse}%</span></div>)}
                  </div>
                </>
              );
            })()}
            
            {/* 그룹 4: 기타 효과 */}
            {(() => {
              const regenLv = skills['재생'] || 0;
              const lifesteal = relicStat.lifesteal || 0;
              const reflect = relicStat.reflect || 0;
              const heal = relicStat.heal || 0;
              const cdReduce = getMinorBonus(skills, 'cdReduce+', activeSkills);
              const etherReduce = hasEffect(skills, 'etherCost-20', activeSkills);
              const hasAny = regenLv || lifesteal || reflect || heal || cdReduce || etherReduce;
              if (!hasAny) return null;
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 기타 효과 ━</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
                    {regenLv > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>HP재생</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{regenLv}/턴</span></div>)}
                    {lifesteal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>흡혈</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{lifesteal}</span></div>)}
                    {reflect > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반사</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{reflect}%</span></div>)}
                    {heal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회복효과</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{heal}%</span></div>)}
                    {cdReduce > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>쿨다운감소</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{cdReduce}턴</span></div>)}
                    {etherReduce && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>에테르비용</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-1</span></div>)}
                  </div>
                </>
              );
            })()}
            
            {/* 패시브 */}
            <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 패시브 ━</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {Object.entries(skills).filter(([n, l]) => l > 0 && (!activeSkills || activeSkills.includes(n))).map(([name, lv]) => {
                const sk = PASSIVE_SKILLS[name];
                if (!sk) return null;
                return (
                  <button key={name} onClick={() => { setStatusModalOpen(false); setTooltip({ type: 'skill', name, lv }); }} className="text-[10px] px-2 py-1" style={{ background: `${sk.color}25`, border: `1px solid ${sk.color}80`, color: '#fff' }}>
                    {name}<span style={{ color: sk.color, marginLeft: '3px' }}>Lv.{lv}</span>
                  </button>
                );
              })}
              {(ultimates || []).map(uid => {
                let ultData = null;
                Object.entries(ULTIMATE_SKILLS).forEach(([sk, ults]) => {
                  ults.forEach(u => { if (u.id === uid || u.effect === uid) ultData = u; });
                });
                if (!ultData) return null;
                return (
                  <button key={uid} onClick={() => { setStatusModalOpen(false); setTooltip({ type: 'ultimate', name: ultData.name, ult: ultData }); }} className="text-[10px] px-2 py-1" style={{ background: `${ultData.color}40`, border: `1px solid ${ultData.color}`, color: '#fff' }}>
                    ★{ultData.name}
                  </button>
                );
              })}
            </div>
            
            {/* 유물 */}
            {initialRelics && initialRelics.length > 0 && (
              <>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 유물 ━</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {initialRelics.filter(r => !activeRelicNames || activeRelicNames.includes(r.name)).map((rel, i) => (
                    <button key={i} onClick={() => { setStatusModalOpen(false); setTooltip({ type: 'relic', name: rel.name, relic: rel }); }} className="text-[10px] px-2 py-1" style={{ background: `${rel.color || PALETTE.dawn}25`, border: `1px solid ${rel.color || PALETTE.dawn}80`, color: '#fff' }}>
                      {rel.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            <button onClick={() => setStatusModalOpen(false)} className="w-full mt-2 py-2 text-[11px] tracking-[0.2em]" style={{ background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>닫기</button>
          </div>
        </div>
      )}
      
      {/* 패시브/유물/궁극 정보 툴팁 모달 */}
      {tooltip && (
        <div onClick={() => setTooltip(null)}
          className="absolute inset-0 flex items-center justify-center z-50 px-6"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs px-4 py-4" style={{
              background: PALETTE.bgDeep,
              border: `1px solid ${tooltip.type === 'relic' ? (tooltip.relic?.color || PALETTE.dawn) : tooltip.type === 'ultimate' ? (tooltip.ult?.color || PALETTE.legendary) : PALETTE.dawn}`,
              boxShadow: '0 0 30px rgba(0,0,0,0.8)',
            }}>
            {tooltip.type === 'skill' && (() => {
              const sk = PASSIVE_SKILLS[tooltip.name];
              if (!sk) return null;
              return (
                <>
                  <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: sk.color }}>패시브</div>
                  <div className="text-base font-bold mb-1" style={{ color: PALETTE.text }}>
                    {tooltip.name} <span className="text-xs ml-1" style={{ color: sk.color }}>Lv.{tooltip.lv}</span>
                  </div>
                  <p className="text-[11px] mb-3" style={{ color: PALETTE.textDim }}>{sk.desc}</p>
                  {sk.minorEffect && (
                    <div className="text-[10px] mb-2 px-2 py-1" style={{ background: `${sk.color}15`, color: PALETTE.text }}>
                      ◇ {sk.minorEffect.desc}
                    </div>
                  )}
                  {sk.tiers && Object.entries(sk.tiers).map(([tierLv, tier]) => (
                    <div key={tierLv} className="text-[10px] mb-1 px-2 py-1" style={{ 
                      background: tooltip.lv >= Number(tierLv) ? `${sk.color}25` : 'transparent',
                      color: tooltip.lv >= Number(tierLv) ? PALETTE.text : PALETTE.textDim,
                      border: `1px solid ${tooltip.lv >= Number(tierLv) ? sk.color : PALETTE.panelBorder}`,
                      opacity: tooltip.lv >= Number(tierLv) ? 1 : 0.5,
                    }}>
                      <span className="font-bold" style={{ color: sk.color }}>Lv.{tierLv}</span> {tier.text}
                    </div>
                  ))}
                </>
              );
            })()}
            {tooltip.type === 'relic' && tooltip.relic && (
              <>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: tooltip.relic.color || PALETTE.dawn }}>유물</div>
                <div className="text-base font-bold mb-2" style={{ color: PALETTE.text }}>{tooltip.relic.name}</div>
                <p className="text-[11px]" style={{ color: PALETTE.textDim }}>
                  {tooltip.relic.desc || (tooltip.relic.statBonus 
                    ? Object.entries(tooltip.relic.statBonus).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ')
                    : '')}
                </p>
              </>
            )}
            {tooltip.type === 'ultimate' && tooltip.ult && (
              <>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: tooltip.ult.color || PALETTE.legendary }}>★ 궁극</div>
                <div className="text-base font-bold mb-2" style={{ color: PALETTE.text }}>{tooltip.ult.name}</div>
                <p className="text-[11px] whitespace-pre-line" style={{ color: PALETTE.textDim }}>{tooltip.ult.desc}</p>
              </>
            )}
            <button onClick={() => setTooltip(null)}
              className="w-full mt-3 py-1.5 text-[10px] tracking-[0.2em]" style={{
                background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
              }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// =========== 보상 선택 ===========
function RewardSelect({ rewards: initialRewards, gem, skills, relics, ultimates, activeSkills = null, onPick, onReroll, hasRerolled, isElite, classId = null, meta = null }) {
  const [rewards, setRewards] = useState(initialRewards);
  // 운명 Lv.3: 리롤 비용 -1
  const rerollCost = hasEffect(skills, 'rerollDiscount', activeSkills) ? GAME_CONFIG.rerollDiscountCost : GAME_CONFIG.rerollCost;

  const handleReroll = () => {
    if (hasRerolled || gem < rerollCost) return;
    // 운명 Lv.5: 보상 4중1
    const count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
    const newRewards = rollRewards(count, isElite, skills, relics, ultimates, classId, meta);
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
      title = `${r.name} +${r.value}`; desc = '영구 능력치 상승'; color = PALETTE.dawn; icon = '↑';
    } else if (r.type === 'heal') {
      title = `회복 ${r.value}`; desc = '즉시 체력 회복'; color = PALETTE.green; icon = '+';
    } else if (r.type === 'heal_full') {
      title = '완전 회복'; desc = '최대 체력까지 회복'; color = PALETTE.legendary; icon = '+';
    } else if (r.type === 'relic') {
      title = r.name;
      desc = r.desc || `유물 · 스탯 효과`;
      color = r.color; icon = '◆';
    } else if (r.type === 'gold') {
      title = `은화 +${r.value}`; desc = '상점에서 사용'; color = PALETTE.dawn; icon = '◉';
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
                }}>{currentLv >= 7 ? 'MAX' : `Lv.${currentLv} → Lv.${nextLv}`}</span>
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
        <p className="text-center text-[10px] tracking-[0.4em] mb-1" style={{ color: PALETTE.dawn }}>◆ 운명의 갈림길 ◆</p>
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
function EventScreen({ event, classData, stats, skills = {}, onResolve }) {
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
    
    // === skill_random_lv: 어느 패시브가 오를지 미리 결정 (표시용) ===
    if (result.reward?.type === 'skill_random_lv') {
      const ownedSkills = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
      if (ownedSkills.length > 0) {
        const [name, curLv] = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
        result.reward = { ...result.reward, _resolvedSkill: name, _resolvedFrom: curLv, _resolvedTo: curLv + 1 };
      }
    }
    
    setResultData(result);
    setStage('result');
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{
        borderColor: PALETTE.panelBorder, background: PALETTE.panel,
      }}>
        <span className="text-[10px] tracking-[0.3em] style={{ color: PALETTE.ice }}">◆ 사건 ◆</span>
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
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.dawn}60`, background: `${PALETTE.dawn}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.dawn }}>◆ 보상</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {resultData.reward.type === 'gold' && `◎ 은화 +${resultData.reward.value}`}
                  {resultData.reward.type === 'gem' && `◆ 보석 +${resultData.reward.value}`}
                  {resultData.reward.type === 'heal' && `❤ 체력 ${resultData.reward.value} 회복`}
                  {resultData.reward.type === 'heal_full' && `❤ 체력 완전 회복`}
                  {resultData.reward.type === 'maxhp' && `❤ 최대 체력 +${resultData.reward.value}`}
                  {resultData.reward.type === 'stat' && (
                    <span style={{ color: PALETTE.legendary }}>
                      ★ 능력치 [{resultData.reward.name}] +{resultData.reward.value}
                    </span>
                  )}
                  {resultData.reward.type === 'random_relic' && <span style={{ color: PALETTE.legendary }}>◈ 무작위 유물 1개 획득</span>}
                  {resultData.reward.type === 'skill_random_lv' && (
                    resultData.reward._resolvedSkill ? (
                      <span style={{ color: PALETTE.ice }}>
                        ★ [{resultData.reward._resolvedSkill}] Lv.{resultData.reward._resolvedFrom} → Lv.{resultData.reward._resolvedTo}
                      </span>
                    ) : (
                      <span style={{ color: PALETTE.textDim }}>강화 가능한 패시브 없음 (모두 Lv.7)</span>
                    )
                  )}
                </div>
              </div>
            )}
            {resultData.penalty && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}60`, background: `${PALETTE.accent}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 페널티</div>
                <div className="text-xs space-y-0.5" style={{ color: PALETTE.text }}>
                  {resultData.penalty.hp && <div>❤ 체력 {resultData.penalty.hp > 0 ? '+' : ''}{resultData.penalty.hp}</div>}
                  {resultData.penalty.gold && <div>◎ 은화 {resultData.penalty.gold > 0 ? '+' : ''}{resultData.penalty.gold}</div>}
                  {resultData.penalty.gem && <div>◆ 보석 {resultData.penalty.gem > 0 ? '+' : ''}{resultData.penalty.gem}</div>}
                  {resultData.combat && <div>⚔ 전투 발생</div>}
                </div>
              </div>
            )}
            {/* ★ 이 부분이 문제였을 확률이 높습니다: 괄호 닫기 확인 */}
            {resultData.combat && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}`, background: `${PALETTE.accent}20` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 전투 발생</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {ENEMIES[resultData.combat]?.name || '적'}이(가) 나타난다!
                </div>
              </div>
            )} 
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
                  background: c.stat ? `${PALETTE.ice}10` : c.cost ? `${PALETTE.dawn}10` : 'transparent',
                  border: `1px solid ${c.stat ? PALETTE.ice : c.cost ? PALETTE.dawn : PALETTE.panelBorder}40`,
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
            background: `linear-gradient(180deg, ${PALETTE.dawn}40, ${PALETTE.dawn}20)`,
            border: `1px solid ${PALETTE.dawn}`, color: PALETTE.text,
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
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>◆ 정비 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>보스 직전</span>
      </div>
      <div className="flex-1 px-5 py-5 space-y-3 overflow-y-auto" style={{
        background: `radial-gradient(ellipse at center top, ${PALETTE.dawn}15, ${PALETTE.bgDeep} 70%)`,
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
            background: canReselectSkills ? `${PALETTE.dawn}20` : 'transparent',
            border: `1px solid ${canReselectSkills ? PALETTE.dawn : PALETTE.panelBorder}`,
            opacity: canReselectSkills ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.dawn }}>◇ 패시브 재선택</div>
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
function ShopScreen({ gold, skills, relics, ultimates, onBuy, onLeave, classId = null }) {
  // 상점 재고: 유물·궁극·재화는 제외하고 다양한 카테고리로
  const [stock] = useState(() => {
    const initial = rollRewards(8, false, skills, relics, ultimates, classId);
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
    else if (r.type === 'stat') { title = `${r.name} +${r.value}`; color = PALETTE.dawn; }
    else if (r.type === 'heal') { title = `회복 ${r.value}`; color = PALETTE.green; }
    else if (r.type === 'heal_full') { title = '완전 회복'; color = PALETTE.legendary; }
    else { title = `${r.type} +${r.value}`; color = PALETTE.dawn; }

    // 패시브 Lv 변화 계산
    const currentLv = r.type === 'skill' ? (skills[r.name] || 0) : 0;
    const nextLv = currentLv + 1;
    const maxLv = r.type === 'skill' ? (PASSIVE_SKILLS[r.name]?.maxLv || 7) : 0;
    const isMaxed = r.type === 'skill' && currentLv >= maxLv;

    return (
      <button key={idx} disabled={!canAfford || isBought || isMaxed}
        onClick={() => { onBuy(r, price); setBought(prev => new Set([...prev, idx])); }}
        className="w-full text-left px-3 py-2.5 transition-all"
        style={{
          background: isBought ? PALETTE.bgDeep : `${color}15`,
          border: `1px solid ${isBought ? PALETTE.panelBorder : color}`,
          opacity: isBought ? 0.4 : (canAfford && !isMaxed ? 1 : 0.6),
        }}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold" style={{ color: PALETTE.text }}>{title}</span>
              {r.type === 'skill' && (
                <span className="text-[10px] px-1.5 py-0.5" style={{
                  background: `${color}30`, color, border: `1px solid ${color}80`,
                }}>{isMaxed ? 'MAX' : `Lv.${currentLv} → Lv.${nextLv}`}</span>
              )}
            </div>
            <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
              {isBought ? '구매 완료' : r.type === 'skill' ? PASSIVE_SKILLS[r.name].desc : ''}
            </div>
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: canAfford ? PALETTE.dawn : PALETTE.accent }}>
            {isBought ? '✓' : `◉ ${price}`}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.twilight }}>◆ 상점 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>떠돌이 행상</span>
      </div>
      <div className="px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder, background: `${PALETTE.twilight}10` }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] italic" style={{ color: PALETTE.textDim }}>"운 좋은 날이군. 좋은 물건들이 있다네."</p>
          <span className="text-xs tabular-nums" style={{ color: PALETTE.dawn }}>◉ {gold}</span>
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

// =========== 황혼의 대장간 ===========
// 유물 2개 희생 → 정해진 패시브 +1Lv (또는 영혼 +50)
// 직업 전용 패시브 (심안류, 이프리트) 제외
function ForgeScreen({ relics, skills, activeRelicNames, onCombine, onLeave }) {
  const [selected, setSelected] = useState([]);
  const [resultMsg, setResultMsg] = useState(null);
  
  const availableRelics = relics; // 봉인 무관 — 모든 보유 유물 희생 가능
  
  const toggleSelect = (idx) => {
    if (resultMsg) return;
    if (selected.includes(idx)) {
      setSelected(selected.filter(i => i !== idx));
    } else if (selected.length < 2) {
      setSelected([...selected, idx]);
    }
  };
  
  const handleCombine = () => {
    if (selected.length !== 2) return;
    const r1 = availableRelics[selected[0]];
    const r2 = availableRelics[selected[1]];
    const recipe = findRecipe(r1.name, r2.name);
    
    let result;
    if (recipe) {
      const curLv = skills[recipe.result] || 0;
      if (curLv >= 7) {
        // 이미 Lv.7 → 영혼 보상
        result = { type: 'souls', value: 50, msg: `[${recipe.result}] 이미 Lv.7\n영혼 +50` };
      } else {
        // 패시브 +1
        result = { type: 'skill', skillName: recipe.result, msg: `★ [${recipe.result}] Lv.${curLv} → Lv.${curLv + 1}` };
      }
    } else {
      // 정의 안 된 조합 → 영혼 보상
      result = { type: 'souls', value: 50, msg: `정의되지 않은 조합\n영혼 +50` };
    }
    
    setResultMsg(result.msg);
    onCombine(selected, result);
  };
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b text-center" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="text-[10px] tracking-[0.4em]" style={{ color: '#c46535' }}>━━ T W I L I G H T   F O R G E ━━</div>
        <div className="text-base font-bold tracking-[0.2em] mt-1" style={{ color: PALETTE.text }}>황혼의 대장간</div>
        <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>유물 2개를 희생하여 패시브를 단련한다</div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {resultMsg ? (
          // 결과 화면
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center px-4 py-8" style={{ background: `${PALETTE.bgDeep}`, border: `2px solid #c46535` }}>
              <div className="text-2xl mb-3" style={{ color: '#c46535' }}>🔨</div>
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text, textShadow: '0 0 8px #c4653580' }}>
                {resultMsg}
              </div>
            </div>
            <button onClick={onLeave} className="mt-6 w-full max-w-xs py-2.5 text-xs tracking-[0.3em]" style={{
              background: `linear-gradient(180deg, #c4653540, #c4653520)`,
              border: `1px solid #c46535`, color: '#fff',
            }}>▸ 대장간을 떠난다</button>
          </div>
        ) : (
          <>
            {/* 보유 유물 목록 */}
            {availableRelics.length === 0 ? (
              <div className="text-center py-12" style={{ color: PALETTE.textDim }}>
                <div className="text-sm">희생할 유물이 없다</div>
              </div>
            ) : (
              <>
                <div className="text-[10px] mb-2" style={{ color: PALETTE.textDim }}>
                  희생할 유물 2개를 선택하라 ({selected.length}/2)
                </div>
                <div className="space-y-1.5 mb-4">
                  {availableRelics.map((rel, i) => {
                    const isSelected = selected.includes(i);
                    return (
                      <button key={i} onClick={() => toggleSelect(i)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between"
                        style={{
                          background: isSelected ? `${rel.color || PALETTE.dawn}40` : `${rel.color || PALETTE.dawn}15`,
                          border: `1px solid ${isSelected ? '#c46535' : rel.color || PALETTE.dawn}`,
                          opacity: 1,
                        }}>
                        <div>
                          <div className="text-[11px] font-bold" style={{ color: '#fff' }}>{rel.name}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: PALETTE.textDim }}>{rel.desc}</div>
                        </div>
                        {isSelected && <span className="text-sm" style={{ color: '#c46535' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <button onClick={handleCombine} disabled={selected.length !== 2}
                  className="w-full py-2.5 text-xs tracking-[0.3em] font-bold" style={{
                    background: selected.length === 2 ? `linear-gradient(180deg, #c4653560, #c4653530)` : 'transparent',
                    border: `1px solid ${selected.length === 2 ? '#c46535' : PALETTE.panelBorder}`,
                    color: selected.length === 2 ? '#fff' : PALETTE.textDim,
                  }}>🔨 단련 실행</button>
                <button onClick={onLeave} className="w-full mt-2 py-2 text-[11px] tracking-[0.2em]" style={{
                  background: 'transparent',
                  border: `1px solid ${PALETTE.panelBorder}`,
                  color: PALETTE.textDim,
                }}>떠난다 (희생 X)</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =========== 도감 (대장간 조합식) ===========
// 발견된 레시피만 공개, 미발견은 ??? + ??? = ??? 형식
function CodexScreen({ meta, onBack }) {
  const discovered = meta.discoveredRecipes || [];
  const totalRecipes = FORGE_RECIPES.length;
  
  // 발견된 것 먼저, 미발견 나중
  const sortedRecipes = [...FORGE_RECIPES].sort((a, b) => {
    const aDis = discovered.includes(a.result);
    const bDis = discovered.includes(b.result);
    if (aDis && !bDis) return -1;
    if (!aDis && bDis) return 1;
    return 0;
  });
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="text-base font-bold" style={{ color: PALETTE.textDim }}>◂</button>
        <div className="flex-1 text-center">
          <div className="text-[10px] tracking-[0.3em]" style={{ color: '#c46535' }}>━━ C O D E X ━━</div>
          <div className="text-sm font-bold tracking-[0.2em] mt-0.5" style={{ color: PALETTE.text }}>황혼의 대장간 도감</div>
        </div>
        <div style={{ width: '20px' }} />
      </div>
      
      <div className="px-4 py-2 flex justify-between items-center" style={{ background: `${PALETTE.bgDeep}`, borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        <span className="text-[10px]" style={{ color: PALETTE.textDim }}>발견된 레시피</span>
        <span className="text-[12px] font-bold tabular-nums" style={{ color: '#c46535' }}>
          {discovered.length} / {totalRecipes}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sortedRecipes.map((recipe, idx) => {
          const isDiscovered = discovered.includes(recipe.result);
          return (
            <div key={idx} className="px-3 py-2.5" style={{
              background: isDiscovered ? `${PALETTE.bgDeep}` : '#0a0608',
              border: `1px solid ${isDiscovered ? '#c46535' : PALETTE.panelBorder}`,
              opacity: isDiscovered ? 1 : 0.6,
            }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Hammer size={14} style={{ color: isDiscovered ? '#c46535' : PALETTE.textDim }} />
                <div className="text-[12px] font-bold" style={{ color: isDiscovered ? PALETTE.text : PALETTE.textDim }}>
                  {isDiscovered ? recipe.result : '???'}
                </div>
              </div>
              <div className="text-[10px] flex items-center gap-1.5 flex-wrap" style={{ color: PALETTE.textDim }}>
                {isDiscovered ? (
                  <>
                    <span>{recipe.ingredients[0]}</span>
                    <span style={{ color: '#c46535' }}>+</span>
                    <span>{recipe.ingredients[1]}</span>
                    <span style={{ color: '#c46535' }}>=</span>
                    <span style={{ color: PALETTE.legendary }}>{recipe.result} +1Lv</span>
                  </>
                ) : (
                  <>
                    <span>???</span>
                    <span>+</span>
                    <span>???</span>
                    <span>=</span>
                    <span>???</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        
        <div className="text-[9px] text-center mt-4 mb-2" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
          유물 2개를 희생하면 정해진 패시브를 획득한다
        </div>
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
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.dawn }}>
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
            <div className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>
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
              ? `linear-gradient(180deg, ${PALETTE.dawn}40, ${PALETTE.dawn}20)`
              : 'transparent',
            border: `1px solid ${canConfirm ? PALETTE.dawn : PALETTE.panelBorder}`,
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

// =========== 출정 화면 ===========
// 직업 선택 확정 후 표시. 탭하면 원정 선택 화면으로.
function StartScreen({ classData, onContinue }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const classColor = classData?.color || PALETTE.dawn;
  
  return (
    <div className="absolute inset-0 overflow-hidden" 
      onClick={onContinue}
      style={{ background: PALETTE.bgDeep, cursor: 'pointer' }}>
      {/* 일러스트 그대로 (필터 없음) */}
      {classData?.startImage && !imageError && (
        <img 
          src={classData.startImage} 
          alt=""
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 1.5s ease-out',
          }}
        />
      )}
      {/* 하단 텍스트 가독성 그라디언트 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
        background: `linear-gradient(180deg, transparent 0%, ${PALETTE.bgDeep}90 70%, ${PALETTE.bgDeep} 100%)`,
        pointerEvents: 'none',
      }} />
      <style>{`
        @keyframes startTitleAppear {
          0% { opacity: 0; transform: translateY(-20px) scale(0.9); letter-spacing: 0.5em; text-shadow: 0 0 80px ${classColor}, 0 0 120px ${classColor}; }
          60% { opacity: 1; text-shadow: 0 0 60px ${classColor}, 0 0 100px ${classColor}; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.1em; text-shadow: 0 0 20px ${classColor}80, 0 2px 8px rgba(0,0,0,0.9); }
        }
        @keyframes startSubFade {
          0%, 30% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes startTapHint {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div className="absolute left-0 right-0 bottom-0 px-6 pb-10 text-center">
        <div className="text-[10px] tracking-[0.5em] mb-2" style={{ 
          color: classColor, opacity: 0.9,
          animation: 'startSubFade 1.2s ease-out 0.4s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>━━ D E P A R T U R E ━━</div>
        <h2 className="text-5xl font-bold mb-3" style={{
          color: PALETTE.text, fontFamily: '"Cinzel", serif',
          animation: 'startTitleAppear 1.5s ease-out forwards',
        }}>출정</h2>
        {classData && (
          <div className="text-sm font-bold tracking-[0.2em] mt-3" style={{ 
            color: classColor,
            animation: 'startSubFade 1.2s ease-out 0.9s both',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {classData.name} · <span className="text-[10px]" style={{ color: PALETTE.textDim }}>{classData.sub}</span>
          </div>
        )}
        {/* 직업 대사 */}
        {classData?.quote && (
          <div className="text-base italic mt-4 px-4" style={{
            color: '#fff',
            animation: 'startSubFade 1.4s ease-out 1.3s both',
            textShadow: `0 0 8px ${classColor}, 0 2px 6px rgba(0,0,0,0.95)`,
            letterSpacing: '0.05em',
          }}>
            「 {classData.quote} 」
          </div>
        )}
        <div className="text-[10px] tracking-[0.4em] mt-4" style={{
          color: PALETTE.textDim,
          animation: 'startTapHint 2s ease-in-out 1.8s infinite',
        }}>▸ 화면을 탭하여 출정</div>
      </div>
    </div>
  );
}

// =========== 전투 승리 화면 ===========
function VictoryScreen({ classData, enemy, gains = { gold: 0, gem: 0, souls: 0 }, onContinue }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="absolute inset-0 overflow-hidden" 
      onClick={onContinue}
      style={{ background: PALETTE.bgDeep, cursor: 'pointer' }}>
      {classData?.winImage && !imageError && (
        <img 
          src={classData.winImage} 
          alt=""
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 1.5s ease-out',
          }}
        />
      )}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
        background: `linear-gradient(180deg, transparent 0%, ${PALETTE.bgDeep}90 70%, ${PALETTE.bgDeep} 100%)`,
        pointerEvents: 'none',
      }} />
      <style>{`
        @keyframes victoryTitleAppear {
          0% { opacity: 0; transform: translateY(-20px) scale(0.85); letter-spacing: 0.6em; text-shadow: 0 0 100px ${PALETTE.legendary}, 0 0 150px ${PALETTE.legendary}; }
          50% { opacity: 1; transform: scale(1.08); text-shadow: 0 0 80px ${PALETTE.legendary}, 0 0 130px ${PALETTE.legendary}; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.1em; text-shadow: 0 0 25px ${PALETTE.legendary}80, 0 2px 8px rgba(0,0,0,0.9); }
        }
        @keyframes victorySubFade {
          0%, 30% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes victoryTapHint {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div className="absolute left-0 right-0 bottom-0 px-6 pb-10 text-center">
        <div className="text-[10px] tracking-[0.5em] mb-2" style={{ 
          color: PALETTE.legendary, opacity: 0.9,
          animation: 'victorySubFade 1.2s ease-out 0.4s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>━━ V I C T O R Y ━━</div>
        <h2 className="text-5xl font-bold mb-3" style={{
          color: PALETTE.text, fontFamily: '"Cinzel", serif',
          animation: 'victoryTitleAppear 1.5s ease-out forwards',
        }}>승리</h2>
        <p className="text-xs italic mt-3" style={{ 
          color: PALETTE.textDim,
          animation: 'victorySubFade 1.2s ease-out 0.9s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>
          {enemy?.name ? `「${enemy.name}」을(를) 처치` : '적을 처치'}
        </p>
        {/* 획득 재화 */}
        {(gains.gold > 0 || gains.gem > 0 || gains.souls > 0) && (
          <div className="flex justify-center items-center gap-3 mt-4 flex-wrap" style={{
            animation: 'victorySubFade 1.4s ease-out 1.2s both',
          }}>
            {gains.gold > 0 && (
              <span className="text-sm font-bold tabular-nums px-2 py-1" style={{ 
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${PALETTE.dawn}80`,
                textShadow: `0 0 6px ${PALETTE.dawn}, 0 1px 4px rgba(0,0,0,0.9)`,
              }}>
                <span style={{ color: PALETTE.dawn }}>● </span>+{gains.gold} 은화
              </span>
            )}
            {gains.gem > 0 && (
              <span className="text-sm font-bold tabular-nums px-2 py-1" style={{ 
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${PALETTE.twilight}80`,
                textShadow: `0 0 6px ${PALETTE.twilight}, 0 1px 4px rgba(0,0,0,0.9)`,
              }}>
                <span style={{ color: PALETTE.twilight }}>◆ </span>+{gains.gem} 보석
              </span>
            )}
            {gains.souls > 0 && (
              <span className="text-sm font-bold tabular-nums px-2 py-1" style={{ 
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${PALETTE.legendary}80`,
                textShadow: `0 0 6px ${PALETTE.legendary}, 0 1px 4px rgba(0,0,0,0.9)`,
              }}>
                <span style={{ color: PALETTE.legendary }}>✦ </span>+{gains.souls} 영혼
              </span>
            )}
          </div>
        )}
        <div className="text-[10px] tracking-[0.4em] mt-4" style={{
          color: PALETTE.textDim,
          animation: 'victoryTapHint 2s ease-in-out 1.8s infinite',
        }}>▸ 화면을 탭하여 계속</div>
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
      <div className="text-[11px] mb-8" style={{ color: PALETTE.dawn }}>◇ 체력 회복 ◇</div>
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${chapter.color}40, ${chapter.color}20)`,
        border: `1px solid ${chapter.color}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 다음 챕터</button>
    </div>
  );
}

// =========== 원정 클리어 ===========
function ExpeditionClearScreen({ expedition, soulsGained, firstClear, onContinue }) {
  // 신규 해금 유물 정보 찾기
  const newRelic = firstClear?.newRelic ? RELICS.find(r => r.name === firstClear.newRelic) : null;
  
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
      <div className="mb-6 px-8 py-4 flex flex-col items-center" style={{
        background: `${PALETTE.twilight}30`,
        border: `1px solid ${PALETTE.twilight}`,
        boxShadow: `0 0 30px ${PALETTE.twilight}40`,
      }}>
        <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: PALETTE.twilight }}>SOULS GAINED</div>
        <div className="flex items-center gap-3">
          <span style={{ color: PALETTE.twilight, fontSize: '32px' }}>✦</span>
          <span className="text-4xl font-bold" style={{ 
            color: PALETTE.text, 
            fontFamily: '"Cinzel", serif',
            textShadow: `0 0 20px ${PALETTE.twilight}`,
          }}>+{soulsGained}</span>
        </div>
      </div>
      
      {/* 첫 클리어 시 신규 유물 안내 */}
      {newRelic && (
        <div className="mb-6 px-6 py-4 w-full max-w-sm" style={{
          background: `${PALETTE.legendary}15`,
          border: `2px solid ${PALETTE.legendary}`,
          boxShadow: `0 0 30px ${PALETTE.legendary}60`,
        }}>
          <div className="text-[10px] tracking-[0.3em] text-center mb-2" style={{ color: PALETTE.legendary }}>
            ◆ 첫 클리어 — 신규 유물 해금 ◆
          </div>
          <div className="text-base font-bold text-center mb-2" style={{ 
            color: newRelic.color || PALETTE.legendary,
            textShadow: `0 0 12px ${newRelic.color || PALETTE.legendary}80`,
          }}>
            {newRelic.name}
          </div>
          <div className="text-[11px] leading-relaxed text-center" style={{ color: PALETTE.text }}>
            {newRelic.desc}
          </div>
          <div className="mt-3 pt-3 text-[10px] text-center italic" style={{ 
            color: PALETTE.textDim,
            borderTop: `1px solid ${PALETTE.legendary}40`,
          }}>
            이후 시작 유물 / 보상 / 사건에서 낮은 확률로 등장
          </div>
        </div>
      )}
      
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
        border: `1px solid ${PALETTE.legendary}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 메인 메뉴</button>
    </div>
  );
}

// =========== 사망 화면 ===========
function DefeatScreen({ classData, chapter, soulsGained, onContinue }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shaken, setShaken] = useState(true);
  
  useEffect(() => {
    const t = setTimeout(() => setShaken(false), 700);
    return () => clearTimeout(t);
  }, []);
  
  return (
    <div className="absolute inset-0 overflow-hidden" style={{
      background: PALETTE.bgDeep,
      animation: shaken ? 'defeatShake 0.6s ease-out' : 'none',
    }}>
      {classData?.lossImage && !imageError && (
        <img 
          src={classData.lossImage} 
          alt=""
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 1.5s ease-out',
          }}
        />
      )}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
        background: `linear-gradient(180deg, transparent 0%, ${PALETTE.bgDeep}90 60%, ${PALETTE.bgDeep} 100%)`,
        pointerEvents: 'none',
      }} />
      <style>{`
        @keyframes defeatShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
        @keyframes defeatTitleAppear {
          0% { opacity: 0; transform: scale(1.4); filter: blur(8px); text-shadow: 0 0 100px ${PALETTE.accent}, 0 0 150px ${PALETTE.accent}; }
          60% { opacity: 1; filter: blur(0); transform: scale(1.05); text-shadow: 0 0 80px ${PALETTE.accent}, 0 0 130px ${PALETTE.accent}; }
          100% { opacity: 1; transform: scale(1); text-shadow: 0 0 25px ${PALETTE.accent}80, 0 2px 8px rgba(0,0,0,0.9); }
        }
        @keyframes defeatSubFade {
          0%, 50% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 text-center">
        <div className="text-[10px] tracking-[0.5em] mb-2" style={{ 
          color: PALETTE.accent, opacity: 0.9,
          animation: 'defeatSubFade 1.5s ease-out 0.5s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>━━ D E F E A T ━━</div>
        <h2 className="text-5xl font-bold mb-2" style={{
          color: PALETTE.accent, fontFamily: '"Cinzel", serif',
          animation: 'defeatTitleAppear 1.5s ease-out forwards',
        }}>죽음</h2>
        <p className="text-xs italic mt-2" style={{ 
          color: PALETTE.textDim,
          animation: 'defeatSubFade 1.5s ease-out 1s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>
          {chapter ? `${chapter.name}에서 쓰러지다` : '여정의 끝'}
        </p>
        <div className="mt-4 mx-auto px-6 py-2 inline-flex flex-col items-center" style={{
          background: `${PALETTE.twilight}30`,
          border: `1px solid ${PALETTE.twilight}80`,
          animation: 'defeatSubFade 1.5s ease-out 1.4s both',
        }}>
          <div className="text-[9px] tracking-[0.3em] mb-1" style={{ color: PALETTE.twilight }}>
            SOULS RECOVERED · {Math.round(SOUL_REWARDS.deathPenalty * 100)}%
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: PALETTE.twilight, fontSize: '20px' }}>✦</span>
            <span className="text-2xl font-bold" style={{ 
              color: PALETTE.text, fontFamily: '"Cinzel", serif',
            }}>+{soulsGained}</span>
          </div>
        </div>
        <button onClick={onContinue} className="mt-5 px-10 py-2.5 block mx-auto" style={{
          background: `linear-gradient(180deg, ${PALETTE.accent}40, ${PALETTE.accentDim}40)`,
          border: `1px solid ${PALETTE.accent}`,
          color: PALETTE.text, letterSpacing: '0.3em', fontSize: '13px',
          animation: 'defeatSubFade 1.5s ease-out 1.8s both',
        }}>▸ 메인 메뉴</button>
      </div>
    </div>
  );
}

// =========== 업적 화면 ===========
// 업적 진행 + 보상 수령 UI
// 추적 시스템은 별도 작업 — 현재는 progress/completed/claimed 상태만 표시
function AchievementScreen({ meta, onClaim, onClose }) {
  const [filter, setFilter] = useState('all'); // all | clear | special | meta
  
  // 카테고리별 그룹화
  const byCategory = {
    clear: ACHIEVEMENTS.filter(a => a.cat === 'clear'),
    special: ACHIEVEMENTS.filter(a => a.cat === 'special'),
    meta: ACHIEVEMENTS.filter(a => a.cat === 'meta'),
    forge: ACHIEVEMENTS.filter(a => a.cat === 'forge'),
  };
  
  // 진행률 계산
  const totalCount = ACHIEVEMENTS.length;
  const completedCount = ACHIEVEMENTS.filter(a => getAchievementState(meta, a.id).completed).length;
  const claimableCount = ACHIEVEMENTS.filter(a => {
    const s = getAchievementState(meta, a.id);
    return s.completed && !s.claimed;
  }).length;
  
  // 필터된 목록
  const filtered = filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => a.cat === filter);
  
  // 정렬: 수령 가능 → 진행중 → 완료/수령 완료
  const sorted = [...filtered].sort((a, b) => {
    const sa = getAchievementState(meta, a.id);
    const sb = getAchievementState(meta, b.id);
    const rankA = sa.completed && !sa.claimed ? 0 : !sa.completed ? 1 : 2;
    const rankB = sb.completed && !sb.claimed ? 0 : !sb.completed ? 1 : 2;
    return rankA - rankB;
  });
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.legendary }}>
          ✦ 업 적 ✦
        </p>
        <div className="flex justify-center items-center gap-3 mt-2">
          <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
            완료 <span className="font-bold" style={{ color: PALETTE.text }}>{completedCount}</span>
            <span className="opacity-50">/{totalCount}</span>
          </div>
          {claimableCount > 0 && (
            <div className="text-[10px] font-bold" style={{ color: PALETTE.legendary }}>
              ✦ 수령 가능 {claimableCount}개
            </div>
          )}
        </div>
      </div>
      
      {/* 카테고리 필터 */}
      <div className="grid grid-cols-6 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        {[
          { id: 'all', label: '전체' },
          { id: 'clear', label: `클리어` },
          { id: 'special', label: `특수` },
          { id: 'meta', label: `누적` },
          { id: 'forge', label: `대장간` },
          { id: 'champ', label: `챔피언십` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} 
            className="py-2 text-[9px] tracking-[0.05em]" style={{
              background: filter === f.id ? `${PALETTE.legendary}20` : 'transparent',
              color: filter === f.id ? PALETTE.legendary : PALETTE.textDim,
              borderBottom: filter === f.id ? `2px solid ${PALETTE.legendary}` : 'none',
            }}>
            {f.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sorted.map(ach => {
          const state = getAchievementState(meta, ach.id);
          const claimable = state.completed && !state.claimed;
          const claimed = state.claimed;
          const progress = state.progress || 0;
          const progressPct = Math.min(100, (progress / ach.target) * 100);
          
          return (
            <div key={ach.id} className="px-3 py-2.5" style={{
              background: claimed ? `${PALETTE.bgDeep}` 
                : claimable ? `${PALETTE.legendary}15`
                : `${PALETTE.panel}80`,
              border: `1px solid ${claimed ? PALETTE.panelBorder 
                : claimable ? PALETTE.legendary
                : PALETTE.panelBorder}`,
              opacity: claimed ? 0.5 : 1,
            }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.2em]" style={{ 
                    color: ach.cat === 'clear' ? PALETTE.dawn 
                         : ach.cat === 'special' ? PALETTE.accent 
                         : ach.cat === 'forge' ? '#c46535'
                         : ach.cat === 'champ' ? PALETTE.legendary
                         : PALETTE.twilight,
                    opacity: 0.7,
                  }}>
                    {ach.cat === 'clear' ? '클리어' 
                     : ach.cat === 'special' ? '특수' 
                     : ach.cat === 'forge' ? '대장간' 
                     : ach.cat === 'champ' ? '챔피언십' 
                     : '누적'}
                  </div>
                  <div className="text-sm font-bold" style={{ color: PALETTE.text }}>
                    {ach.name}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>
                    {ach.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span style={{ color: PALETTE.twilight, fontSize: '11px' }}>✦</span>
                  <span className="text-sm font-bold" style={{ color: PALETTE.text }}>{ach.reward}</span>
                </div>
              </div>
              
              {/* 진행도 바 */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 relative" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <div className="absolute inset-y-0 left-0 transition-all" style={{
                    width: `${progressPct}%`,
                    background: claimed ? PALETTE.textDim 
                      : claimable ? PALETTE.legendary
                      : PALETTE.dawn,
                  }} />
                </div>
                <span className="text-[9px] tabular-nums" style={{ color: PALETTE.textDim }}>
                  {progress}/{ach.target}
                </span>
              </div>
              
              {/* 수령 버튼 / 상태 */}
              {claimable && (
                <button onClick={() => onClaim(ach)} 
                  className="w-full mt-2 py-1.5 text-[11px] font-bold tracking-[0.2em]" style={{
                    background: `linear-gradient(180deg, ${PALETTE.legendary}50, ${PALETTE.legendary}20)`,
                    border: `1px solid ${PALETTE.legendary}`,
                    color: '#fff',
                  }}>
                  ✦ 보상 수령 (+{ach.reward})
                </button>
              )}
              {claimed && (
                <div className="text-[10px] mt-1.5 text-center" style={{ color: PALETTE.legendary, opacity: 0.6 }}>
                  ✓ 수령 완료
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-8" style={{ color: PALETTE.textDim }}>
            <p className="text-sm">업적이 없습니다</p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onClose} className="w-full py-2.5 text-[11px] tracking-[0.2em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
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
              background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.dawn}`,
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
          <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.dawn }}>◆ 패시브 스킬</div>
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
                                background: `${PALETTE.twilight}30`, color: PALETTE.twilight,
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
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.dawn }}>◆ 보유 유물</div>
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
                            background: `${PALETTE.twilight}30`, color: PALETTE.twilight,
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
  // 원정 선택 후 출정 화면에서 사용 — start 화면 탭 시 실제 startExpedition 호출
  const [selectedExpedition, setSelectedExpedition] = useState(null);
  const [selectedChampionship, setSelectedChampionship] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
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
  // 챔피언십 첫 클리어 정보 (ExpeditionClearScreen에서 사용)
  const [runFirstChampClear, setRunFirstChampClear] = useState(null);
  
  // 전투 준비: 활성화된 패시브/유물 이름 배열 (null이면 모두 활성)
  // 첫 노드 (prep)에서 결정. 한 원정 내내 유지.
  const [activeSkills, setActiveSkills] = useState(null);
  const [activeRelicNames, setActiveRelicNames] = useState(null);
  // 재선택 모드: 'skills' | 'relics' | null
  const [reselectMode, setReselectMode] = useState(null);
  // 승리 화면 후 이동할 다음 화면
  const [victoryNextScreen, setVictoryNextScreen] = useState(null);
  // 승리 화면에 표시할 획득 재화 (gold/gem/souls)
  const [victoryGains, setVictoryGains] = useState({ gold: 0, gem: 0, souls: 0 });
  // 업적 화면에서 뒤로갈 때 어디로 갈지 기억 (title 또는 map)
  const [prevAchievementsBack, setPrevAchievementsBack] = useState('title');

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
  // 자동 갱신 체크: KST 0시/12시 갱신 시각이 지났으면 새로 굴림
  // 일일 리롤 카운트도 자정 리셋 체크
  const enterAltar = () => {
    let newMeta = checkAndResetDaily(meta);
    if (needsAltarRefresh(newMeta)) {
      const newSlotIds = rollAltarSlots(newMeta, SOUL_REWARDS.altarSlots).map(s => s.id);
      newMeta = {
        ...newMeta,
        altarSlots: newSlotIds,
        altarRefreshedAt: Date.now(),
      };
      saveMeta(newMeta);
    }
    setMeta(newMeta);
    // 저장된 슬롯 ID로 실제 슬롯 객체 복원
    const slots = (newMeta.altarSlots || []).map(id => META_UPGRADES.find(u => u.id === id)).filter(Boolean);
    setAltarSlots(slots);
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
    // 구매한 항목 제거 (자동 갱신 X — 시간이 안 지났으면 같은 슬롯 유지)
    const updatedSlotIds = (newMeta.altarSlots || []).filter(id => id !== upgrade.id);
    newMeta = { ...newMeta, altarSlots: updatedSlotIds };
    
    // === 업적 트래킹: 영혼 수호자 (모든 강화 최대 단계) ===
    // 모든 stackable 강화가 maxStacks 도달 + 모든 unlock이 unlocks에 포함
    const allMaxed = META_UPGRADES.every(u => {
      if (u.stackable) {
        return (newMeta.upgrades[u.id] || 0) >= (u.maxStacks || 999);
      } else {
        return newMeta.unlocks.includes(u.id);
      }
    });
    if (allMaxed) {
      newMeta = completeAchievement(newMeta, 'special_max_meta', 1);
    }
    
    setMeta(newMeta);
    const slots = updatedSlotIds.map(id => META_UPGRADES.find(u => u.id === id)).filter(Boolean);
    setAltarSlots(slots);
  };

  // 제단 새로고침 (유료) — 일일 10회 제한
  const rerollAltar = () => {
    if (meta.souls < SOUL_REWARDS.rerollCost) return;
    if ((meta.dailyRerollCount || 0) >= SOUL_REWARDS.dailyRerollLimit) return;
    const newSlotIds = rollAltarSlots(meta, SOUL_REWARDS.altarSlots).map(s => s.id);
    const newMeta = { 
      ...meta, 
      souls: meta.souls - SOUL_REWARDS.rerollCost,
      altarSlots: newSlotIds,
      dailyRerollCount: (meta.dailyRerollCount || 0) + 1,
    };
    setMeta(newMeta);
    const slots = newSlotIds.map(id => META_UPGRADES.find(u => u.id === id)).filter(Boolean);
    setAltarSlots(slots);
  };
  
  // 업적 보상 수령
  const handleClaimAchievement = (achievement) => {
    const newMeta = claimAchievement(meta, achievement);
    setMeta(newMeta);
  };

  // 새로운 런 시작 (원정 선택 시)
  const startExpedition = (expedition) => {
    setCurrentExpedition(expedition);
    // 저주 부여
    const curses = rollCurses(expedition.curseCount);
    setCurrentCurses(curses);
    setRunSouls(0);
    
    // === 업적 트래킹: 원정 시도 ===
    let trackedMeta = { ...meta, totalRuns: (meta.totalRuns || 0) + 1 };
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_10', trackedMeta.totalRuns, 10);
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_100', trackedMeta.totalRuns, 100);
    setMeta(trackedMeta);
    
    // 활성 패시브/유물 초기화 (prep 노드에서 결정될 때까지 null = 모두 비활성)
    setActiveSkills(null);
    setActiveRelicNames(null);
    
    // 첫 챕터 시작
    const firstChapterIdx = expedition.chapters[0] - 1;
    initializeRun(CHAPTERS[firstChapterIdx], 0, expedition, curses);
  };
  
  // 챔피언십 원정 시작 (5원정 × 4난이도)
  const startChampionship = (championship, difficulty) => {
    // 챔피언십을 expedition 형식으로 변환 (initializeRun과 호환)
    const champExpedition = {
      // 챔피언십 식별자
      isChampionship: true,
      championshipId: championship.id,
      difficultyId: difficulty.id,
      // 표시용
      id: `champ_${championship.id}`,
      name: championship.name,
      sub: `${championship.sub} · ${difficulty.name}`,
      desc: championship.desc,
      color: championship.color,
      concept: championship.concept,
      // 챕터 (챔피언십 챕터 ID 배열)
      chapters: championship.chapters,  // ['frost_1', 'frost_2', ...]
      // 능력치 (난이도에서)
      enemyHpMult: difficulty.enemyHpMult,
      enemyDmgMult: difficulty.enemyDmgMult,
      curseCount: difficulty.curseCount,
      maxRelicSelect: difficulty.maxRelicSelect,
      soulReward: difficulty.soulReward,
    };
    
    setCurrentExpedition(champExpedition);
    const curses = rollCurses(difficulty.curseCount);
    setCurrentCurses(curses);
    setRunSouls(0);
    
    // 업적 트래킹
    let trackedMeta = { ...meta, totalRuns: (meta.totalRuns || 0) + 1 };
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_10', trackedMeta.totalRuns, 10);
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_100', trackedMeta.totalRuns, 100);
    setMeta(trackedMeta);
    
    setActiveSkills(null);
    setActiveRelicNames(null);
    
    // 챕터 ID로 CHAMPIONSHIP_CHAPTERS에서 데이터 조회
    const firstChapterId = championship.chapters[0];
    const firstChapterData = CHAMPIONSHIP_CHAPTERS[firstChapterId];
    if (!firstChapterData) {
      console.error('챔피언십 챕터 데이터 없음:', firstChapterId);
      return;
    }
    initializeRun(firstChapterData, 0, champExpedition, curses);
  };

  // 새로운 런 시작
  const initializeRun = (chapterData, idx = 0, expeditionOverride = null, cursesOverride = null) => {
    const exp = expeditionOverride || currentExpedition;
    const curses = cursesOverride || currentCurses;
    
    if (idx === 0) {
      // 완전 새 런
      const baseSkills = { ...classData.startSkills };
      
      // 메타 강화: 시작 패시브 +1Lv (기존)
      const startSkillBonus = getMetaBonus(meta, 'startSkill+1');
      // 챔피언십 메타: 시작 패시브 +N (도전자 +1, 정복자 +2 = 총 +3)
      const champSkillBonus = getChampionshipMetaSkillBonus(meta);
      const totalSkillBonus = startSkillBonus + champSkillBonus;
      if (totalSkillBonus > 0) {
        Object.keys(baseSkills).forEach(k => {
          baseSkills[k] = Math.min(baseSkills[k] + totalSkillBonus, PASSIVE_SKILLS[k].maxLv);
        });
      }
      setSkills(baseSkills);
      setStats({ ...classData.stats });
      
      // 시작 HP 계산
      const hpBonus = getMinorBonus(baseSkills, 'maxHp+');
      const metaHpBonus = getMetaBonus(meta, 'startHp+10') * 10;
      // 챔피언십 메타 HP (도전자 +50, 정복자 +100, 합계 +150)
      const champHpBonus = getChampionshipMetaHp(meta);
      let startHp = GAME_CONFIG.startHp + hpBonus + metaHpBonus + champHpBonus;
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
      
      // 시작 유물 (메타 강화 + 챔피언십 메타)
      const startRelicCount = getMetaBonus(meta, 'startRelic+1') + getChampionshipMetaRelicBonus(meta);
      const startRelics = [];
      
      if (startRelicCount > 0) {
        // 일반 유물 풀 (weight > 0) + 해금된 챔피언십 유물 (낮은 가중치)
        const normalPool = RELICS.filter(r => (r.weight || 0) > 0);
        // 해금된 챔피언십 유물은 weight 1로 풀에 추가 (일반 weight 3~5 대비 1/3~1/5 확률)
        const unlockedChampRelics = (meta.championshipRelicUnlocks || [])
          .map(name => RELICS.find(r => r.name === name))
          .filter(r => r) // 정의된 유물만
          .map(r => ({ ...r, weight: 1 })); // 임시 weight 1
        const fullPool = [...normalPool, ...unlockedChampRelics];
        // 가중치 기반 추첨
        const used = new Set();
        for (let i = 0; i < startRelicCount; i++) {
          const available = fullPool.filter(r => !used.has(r.name));
          if (available.length === 0) break;
          const totalWeight = available.reduce((s, r) => s + r.weight, 0);
          let roll = Math.random() * totalWeight;
          let picked = available[0];
          for (const r of available) {
            roll -= r.weight;
            if (roll <= 0) { picked = r; break; }
          }
          used.add(picked.name);
          const relicReward = { type: 'relic', ...picked };
          startRelics.push(relicReward);
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
      // 다음 챕터 - HP 회복 (70%까지 회복 보장, 이미 더 높으면 유지)
      let healRatio = GAME_CONFIG.chapterHealRatio + getMetaBonus(meta, 'chapterHeal+10%') * 0.1;
      if (hasCurse(curses, 'curse_heal-50')) healRatio *= 0.5;
      const targetHp = Math.floor(maxHp * healRatio);
      setHp(prev => Math.min(maxHp, Math.max(prev, targetHp)));
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
    
    // 미지 노드는 진입 시 랜덤 결정
    // 사건 50% / 회복의 샘 15% / 전투 30% / 강적 5%
    if (nodeType === 'unknown') {
      const r = Math.random() * 100;
      if (r < 50) nodeType = 'event';
      else if (r < 65) nodeType = 'fountain';
      else if (r < 95) nodeType = 'battle';
      else nodeType = 'elite';
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
    } else if (nodeType === 'fountain') {
      // 회복의 샘 — 사건 화면처럼 표시 후 체력 15% 회복
      const healAmount = Math.floor(maxHp * 0.15);
      // 임시 사건 객체 생성 (회복의 샘 전용)
      const fountainEvent = {
        id: 'fountain',
        title: '회복의 샘',
        text: '맑은 샘이 빛을 발한다.\n흐르는 물에 손을 담그자, 상처가 아물고 영혼이 정화된다.',
        choices: [
          { 
            text: '샘에서 휴식한다', 
            result: `편안한 휴식을 통해 체력이 회복된다.`,
            reward: { type: 'heal', value: healAmount },
          },
        ],
      };
      setCurrentEvent(fountainEvent);
      setScreen('event');
    } else if (nodeType === 'shop') {
      setScreen('shop');
    } else if (nodeType === 'forge') {
      setScreen('forge');
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
    
    // === 업적 트래킹: 적 처치 ===
    let trackedMeta = { ...meta, totalKills: (meta.totalKills || 0) + 1 };
    // 첫걸음 (첫 처치)
    trackedMeta = completeAchievement(trackedMeta, 'special_first_kill', 1);
    // 누적 처치 카운터
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_kill_100', trackedMeta.totalKills, 100);
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_kill_1000', trackedMeta.totalKills, 1000);
    setMeta(trackedMeta);
    
    // 드랍 적용 (저주: 획득 은화 -50%) + 획득량 추적
    let goldGained = 0;
    let gemGained = 0;
    if (drop?.gold) {
      let g = Math.floor(drop.gold[0] + Math.random() * (drop.gold[1] - drop.gold[0]));
      if (hasCurse(currentCurses, 'curse_gold-50')) g = Math.floor(g * 0.5);
      goldGained = g;
      setGold(prev => prev + g);
    }
    if (drop?.gem) {
      const gm = Math.floor(drop.gem[0] + Math.random() * (drop.gem[1] - drop.gem[0]));
      gemGained = gm;
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

    // 보스라면 챕터 보너스도 추가
    let chapterBonusSouls = 0;
    if (isBossReward) {
      chapterBonusSouls = SOUL_REWARDS.chapterClear[chapterIdx] || 5;
      setRunSouls(prev => prev + chapterBonusSouls);
    }
    
    // 승리 화면용 획득량 저장
    setVictoryGains({ 
      gold: goldGained, 
      gem: gemGained, 
      souls: soulGain + chapterBonusSouls 
    });

    if (isBossReward) {
      // 마지막 챕터 보스 처치 → 원정 클리어 화면, 그 외 → 챕터 클리어
      const isLastChapter = currentExpedition && chapterIdx >= currentExpedition.chapters.length - 1;
      setVictoryNextScreen(isLastChapter ? 'expeditionClear' : 'chapterClear');
      setScreen('victory');
      return;
    }

    // 일반/엘리트: 보상 데이터 준비 → victory 화면 → 탭 → reward
    let count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
    if (isUnlocked(meta, 'meta_extraReward')) count = Math.max(count, 4);
    const rewards = rollRewards(count, isEliteReward, skills, relics, ultimates, classData?.id, meta);
    setCurrentRewards(rewards);
    setHasRerolled(false);
    setVictoryNextScreen('reward');
    setScreen('victory');
  };
  
  // 승리 화면 → 다음 화면 (보상 / 챕터 클리어 / 원정 클리어)
  const handleVictoryContinue = () => {
    if (victoryNextScreen === 'chapterClear') {
      completeCurrentNode();
      setScreen('chapterClear');
    } else if (victoryNextScreen === 'expeditionClear') {
      completeCurrentNode();
      // 원정 클리어 처리 (영혼 보너스 합산 등은 handleChapterContinue에서 처리)
      handleChapterContinue();
    } else {
      setScreen('reward');
    }
    setVictoryNextScreen(null);
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
        const normalRelics = getRewardPool(classData?.id)
          .filter(r => r.type === 'relic' && !ownedNames.includes(r.name));
        // 해금된 챔피언십 유물도 추가 (낮은 weight 1)
        const unlockedChampRelics = (meta?.championshipRelicUnlocks || [])
          .map(name => RELICS.find(r => r.name === name))
          .filter(r => r && !ownedNames.includes(r.name))
          .map(r => ({ type: 'relic', ...r, weight: 1 }));
        const fullPool = [...normalRelics, ...unlockedChampRelics];
        if (fullPool.length > 0) {
          // 가중치 추첨
          const totalWeight = fullPool.reduce((s, r) => s + (r.weight || 1), 0);
          let roll = Math.random() * totalWeight;
          let picked = fullPool[0];
          for (const r of fullPool) {
            roll -= (r.weight || 1);
            if (roll <= 0) { picked = r; break; }
          }
          applyReward(picked);
        } else {
          // 모든 유물을 이미 보유 → 영혼 보상으로 대체
          setGold(prev => prev + 80);
        }
      } else if (resultData.reward.type === 'skill_random_lv') {
        // EventScreen에서 미리 결정된 스킬 사용 (없으면 다시 굴림)
        const targetName = resultData.reward._resolvedSkill;
        if (targetName && skills[targetName] != null && skills[targetName] < 7) {
          setSkills(prev => ({ ...prev, [targetName]: Math.min(prev[targetName] + 1, 7) }));
        } else {
          // 폴백 (혹시 미리 결정 안 됐을 때)
          const ownedSkills = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
          if (ownedSkills.length > 0) {
            const [name] = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
            setSkills(prev => ({ ...prev, [name]: Math.min(prev[name] + 1, 7) }));
          }
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
  
  // 황혼의 대장간: 유물 2개 희생 → 패시브 +1 또는 영혼 +50
  const handleForgeCombine = (selectedIndices, result) => {
    // 선택된 유물 2개 제거
    const removeIndices = new Set(selectedIndices);
    setRelics(prev => prev.filter((_, i) => !removeIndices.has(i)));
    // 활성 유물 목록에서도 제거 (해당 이름)
    if (activeRelicNames) {
      const removed = selectedIndices.map(i => relics[i]?.name).filter(Boolean);
      setActiveRelicNames(prev => prev ? prev.filter(n => !removed.includes(n)) : null);
    }
    
    if (result.type === 'skill') {
      // 패시브 +1
      setSkills(prev => ({ ...prev, [result.skillName]: (prev[result.skillName] || 0) + 1 }));
    } else if (result.type === 'souls') {
      // 영혼 +50 (해당 런 누적, 원정 클리어/사망 시 메타에 반영)
      setRunSouls(prev => prev + result.value);
    }
    
    // === 업적 트래킹 ===
    let trackedMeta = { 
      ...meta, 
      forgeCount: (meta.forgeCount || 0) + 1,
      discoveredRecipes: meta.discoveredRecipes || [],
    };
    
    // 첫 단련
    trackedMeta = completeAchievement(trackedMeta, 'forge_first', 1);
    
    // 누적 조합 횟수
    const newCount = trackedMeta.forgeCount;
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_10', newCount, 10);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_50', newCount, 50);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_100', newCount, 100);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_200', newCount, 200);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_300', newCount, 300);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_400', newCount, 400);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_500', newCount, 500);
    
    // 레시피 발견 (skill 결과 + 처음 발견 시만)
    if (result.type === 'skill' && result.skillName) {
      const discovered = trackedMeta.discoveredRecipes || [];
      if (!discovered.includes(result.skillName)) {
        trackedMeta.discoveredRecipes = [...discovered, result.skillName];
        const count = trackedMeta.discoveredRecipes.length;
        trackedMeta = setAchievementProgress(trackedMeta, 'forge_recipe_3', count, 3);
        trackedMeta = setAchievementProgress(trackedMeta, 'forge_recipe_6', count, 6);
        trackedMeta = setAchievementProgress(trackedMeta, 'forge_recipe_all', count, 12);
      }
    }
    
    setMeta(trackedMeta);
  };
  
  const handleForgeLeave = () => {
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
      
      // 챔피언십 vs 클래식 분기
      if (currentExpedition.isChampionship) {
        const champId = currentExpedition.championshipId;
        const diffId = currentExpedition.difficultyId;
        const wasFirstClear = !hasChampionshipClear(newMeta, champId, diffId);
        
        // 챔피언십 클리어 기록
        newMeta = recordChampionshipClear(newMeta, champId, diffId);
        
        // 첫 클리어 시 신규 유물 해금 (원정별 대표 1종)
        let newlyUnlockedRelic = null;
        if (wasFirstClear) {
          const relicMap = {
            frost: '한기의 결정',
            forest: '광기의 송곳니',
            sanctum: '봉인의 인장',
            rift: '균열의 핵',
            dawn: '여명의 성배',
          };
          const relicName = relicMap[champId];
          if (relicName) {
            const exists = RELICS.some(r => r.name === relicName);
            const alreadyUnlocked = (newMeta.championshipRelicUnlocks || []).includes(relicName);
            if (exists && !alreadyUnlocked) {
              newMeta = unlockChampionshipRelic(newMeta, relicName);
              newlyUnlockedRelic = relicName;
            }
          }
        }
        // 첫 클리어 + 신규 유물 해금 정보를 ExpeditionClearScreen에 전달
        setRunFirstChampClear({ isFirstClear: wasFirstClear, newRelic: newlyUnlockedRelic });
        
        // 업적: 챔피언십 클리어 (각 원정 × 난이도)
        newMeta = completeAchievement(newMeta, `champ_clear_${champId}_${diffId}`, 1);
        // 업적: 마스터 (해당 원정 4난이도 모두 클리어 시)
        const champClears = newMeta.championshipClears?.[champId] || {};
        if (champClears.normal && champClears.hard && champClears.hell && champClears.madness) {
          newMeta = completeAchievement(newMeta, `champ_master_${champId}`, 1);
        }
        // 업적: 모든 원정 일반/하드/지옥/광기 클리어
        const allChamps = ['frost', 'forest', 'sanctum', 'rift', 'dawn'];
        const normalCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.normal).length;
        const hardCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.hard).length;
        const hellCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.hell).length;
        const madnessCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.madness).length;
        newMeta = setAchievementProgress(newMeta, 'champ_all_normal',  normalCleared,  5);
        newMeta = setAchievementProgress(newMeta, 'champ_all_hard',    hardCleared,    5);
        newMeta = setAchievementProgress(newMeta, 'champ_all_hell',    hellCleared,    5);
        newMeta = setAchievementProgress(newMeta, 'champ_all_madness', madnessCleared, 5);
      } else {
        // 클래식 원정
        newMeta = recordExpeditionClear(newMeta, currentExpedition.id);
        
        // === 업적 트래킹: 원정 클리어 (직업 × 원정) ===
        const classId = classData?.id;
        const expId = currentExpedition.id;  // 1=북부, 2=심연, 3=광기, 4=망각
        if (classId && expId) {
          // 첫 클리어
          newMeta = completeAchievement(newMeta, `clear_${classId}_${expId}`, 1);
          // 10회 숙달 — 카운터 +1
          newMeta = incrementAchievement(newMeta, `master10_${classId}_${expId}`, 1, 10);
          // 망각 원정(4)이면 전문가 50회 / 마스터 100회 추가
          if (expId === 4) {
            newMeta = incrementAchievement(newMeta, `expert_${classId}`, 1, 50);
            newMeta = incrementAchievement(newMeta, `master_${classId}`, 1, 100);
          }
          // 미답의 도전자 (모든 직업으로 망각 클리어 = 5)
          if (expId === 4) {
            // 각 직업의 망각 첫 클리어 카운트 = 미답의 도전자 진행도
            const cleared4 = ['lanthert', 'sage', 'demonblood', 'elf', 'priest']
              .filter(c => newMeta.achievements?.[`clear_${c}_4`]?.completed).length;
            newMeta = setAchievementProgress(newMeta, 'special_all_class_e4', cleared4, 5);
          }
        }
      }
      
      // 영혼 부자 (5000 누적 보유) — 영혼 추가 후 체크
      newMeta = setAchievementProgress(newMeta, 'special_souls_5000', newMeta.souls, 5000);
      
      setMeta(newMeta);
      
      setRunSouls(totalSouls);  // 화면에 표시용
      setScreen('expeditionClear');
    } else {
      // 다음 챕터
      const nextChapterIdx = chapterIdx + 1;
      // 챔피언십이면 ID로, 클래식이면 인덱스로
      if (currentExpedition.isChampionship) {
        const nextChapterId = currentExpedition.chapters[nextChapterIdx];
        const nextChapterData = CHAMPIONSHIP_CHAPTERS[nextChapterId];
        initializeRun(nextChapterData, nextChapterIdx);
      } else {
        const nextChIdx = currentExpedition.chapters[nextChapterIdx] - 1;
        initializeRun(CHAPTERS[nextChIdx], nextChapterIdx);
      }
    }
  };
  
  // 원정 클리어 화면 → 메인 메뉴
  const handleExpeditionClearContinue = () => {
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setRunSouls(0);
    setSelectedChampionship(null);
    setSelectedDifficulty(null);
    setScreen('title');
  };
  
  // 사망 화면 → 메인 메뉴
  const handleDefeatContinue = () => {
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setRunSouls(0);
    setSelectedChampionship(null);
    setSelectedDifficulty(null);
    setScreen('title');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-10" style={{
      background: `radial-gradient(ellipse at top, #1a0e12 0%, #050304 100%)`,
      fontFamily: '"Noto Serif KR", serif',
      overflow: 'hidden' 
    }}>
      {/* 가로로 나열되는 컨테이너 */}
      <div className="flex flex-row items-center justify-center gap-12 w-full max-w-[1400px]">
        
        {/* [좌측] 게임 안내 및 패치 노트 (PC 전용) */}
        <div className="hidden xl:block w-80 flex-shrink-0" style={{ color: PALETTE.text }}>
          <p className="text-xs tracking-[0.4em] mb-2" style={{ color: PALETTE.twilight }}>RELIC REFORM · v1.4</p>
          <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: '"Cinzel", serif' }}>
            여명앤황혼<br/>
            <span style={{ color: PALETTE.accent }}>로그라이크</span>
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: PALETTE.textDim }}>
            v1.4 — 유물 시스템 재편 + 영혼의 제단 밸런스 조정.
          </p>
          
          <div className="space-y-4 text-xs">
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.legendary }}>★ 유물 스탯형 전환</div>
              <p style={{ color: PALETTE.textDim }}>패시브 Lv 강화 대신 직접적인 스탯 보너스를 부여합니다.</p>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.twilight }}>✦ 영혼 제단 조정</div>
              <p style={{ color: PALETTE.textDim }}>강화 비용이 현실적으로 조정되었습니다.</p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t text-[11px] leading-relaxed" style={{ color: PALETTE.textDim, borderColor: PALETTE.panelBorder }}>
            ◇ 모든 진행은 브라우저에 자동 저장됩니다.
          </div>
        </div>

        {/* [중앙] 실제 게임 화면 (PhoneFrame) */}
        <div className="flex-shrink-0">
          <PhoneFrame>
            {screen === 'title' && <TitleScreen meta={meta} onStart={() => setScreen('classSelect')} onAltar={enterAltar} onAchievements={() => { setPrevAchievementsBack('title'); setScreen('achievements'); }} />}
            {screen === 'classSelect' && <ClassSelect meta={meta} selected={selectedClass} onSelect={setSelectedClass} onNext={() => setScreen('expeditionSelect')} onBack={() => setScreen('title')} />}
            {screen === 'expeditionSelect' && <ExpeditionSelect meta={meta} 
              onSelect={(exp) => { setSelectedExpedition(exp); setScreen('start'); }} 
              onSelectChampionship={(champ) => { setSelectedChampionship(champ); setScreen('championshipDifficulty'); }}
              onBack={() => setScreen('classSelect')} />}
            {screen === 'championshipDifficulty' && selectedChampionship && <ChampionshipDifficultySelect 
              championship={selectedChampionship} meta={meta}
              onSelect={(diff) => { setSelectedDifficulty(diff); setScreen('start'); }}
              onBack={() => { setSelectedChampionship(null); setScreen('expeditionSelect'); }} />}
            {screen === 'start' && <StartScreen classData={classData} onContinue={() => { 
              if (selectedChampionship && selectedDifficulty) startChampionship(selectedChampionship, selectedDifficulty);
              else if (selectedExpedition) startExpedition(selectedExpedition);
            }} />}
            {screen === 'altar' && <SoulAltar meta={meta} slots={altarSlots} onPurchase={purchaseUpgrade} onReroll={rerollAltar} onBack={() => setScreen('title')} />}
            {screen === 'achievements' && <AchievementScreen meta={meta} onClaim={handleClaimAchievement} onClose={() => setScreen(prevAchievementsBack)} />}
            {screen === 'map' && chapter && mapData && <MapView chapter={chapter} classData={classData} mapData={mapData} hp={hp} maxHp={maxHp} gold={gold} gem={gem} relics={relics} activeRelicNames={activeRelicNames} expedition={currentExpedition} curses={currentCurses} chapterIdx={chapterIdx} onEnterNode={handleEnterNode} onOpenStatus={() => setScreen('status')} onOpenAchievements={() => { setPrevAchievementsBack('map'); setScreen('achievements'); }} onOpenCodex={() => setScreen('codex')} onBack={() => setScreen('title')} />}
            {screen === 'codex' && <CodexScreen meta={meta} onBack={() => setScreen('map')} />}
            {screen === 'combat' && currentEnemy && <CombatScreen key={`${activeNodeId}-${currentEnemy}`} classData={classData} initialPlayer={{ hp, maxHp, ...stats, ...classData.stats }} initialSkills={skills} initialUltimates={ultimates} initialRelics={relics} activeSkills={activeSkills} activeRelicNames={activeRelicNames} enemyKey={currentEnemy} isBoss={isBossReward} expedition={currentExpedition} curses={currentCurses} meta={meta} onVictory={handleVictory} onDefeat={handleDefeat} />}
            {screen === 'reward' && <RewardSelect rewards={currentRewards} gem={gem} skills={skills} relics={relics} ultimates={ultimates} onPick={handlePickReward} onReroll={handleReroll} hasRerolled={hasRerolled} isElite={isEliteReward} classId={classData?.id} meta={meta} />}
            {screen === 'victory' && <VictoryScreen classData={classData} enemy={currentEnemy ? ENEMIES[currentEnemy] : null} gains={victoryGains} onContinue={handleVictoryContinue} />}
            {screen === 'event' && currentEvent && <EventScreen event={currentEvent} classData={classData} stats={{ ...classData.stats, ...stats }} skills={skills} onResolve={handleEventResolve} />}
            {screen === 'rest' && <RestScreen classData={classData} hp={hp} maxHp={maxHp} skills={skills} relics={relics} expedition={currentExpedition} onChoice={handleRestChoice} />}
            {screen === 'prep' && <PrepScreen skills={skills} relics={relics} ultimates={ultimates} expedition={currentExpedition} mode="full" onConfirm={handlePrepConfirm} />}
            {screen === 'reselect' && <PrepScreen skills={skills} relics={relics} ultimates={ultimates} expedition={currentExpedition} mode={reselectMode} currentActiveSkills={activeSkills} currentActiveRelicNames={activeRelicNames} onConfirm={handleReselectConfirm} />}
            {screen === 'shop' && <ShopScreen gold={gold} skills={skills} relics={relics} ultimates={ultimates} onBuy={handleShopBuy} onLeave={handleShopLeave} classId={classData?.id} />}
            {screen === 'forge' && <ForgeScreen relics={relics} skills={skills} activeRelicNames={activeRelicNames} onCombine={handleForgeCombine} onLeave={handleForgeLeave} />}
            {screen === 'chapterClear' && chapter && <ChapterClearScreen chapter={chapter} isLastChapter={false} onContinue={handleChapterContinue} />}
            {screen === 'expeditionClear' && currentExpedition && <ExpeditionClearScreen expedition={currentExpedition} soulsGained={runSouls} firstClear={runFirstChampClear} onContinue={handleExpeditionClearContinue} />}
            {screen === 'defeat' && <DefeatScreen classData={classData} chapter={chapter} soulsGained={runSouls} onContinue={handleDefeatContinue} />}
            {screen === 'status' && <StatusPanel classData={classData} hp={hp} maxHp={maxHp} skills={skills} stats={{ ...classData.stats, ...stats }} relics={relics} ultimates={ultimates} activeSkills={activeSkills} activeRelicNames={activeRelicNames} onClose={() => setScreen('map')} />}
          </PhoneFrame>
        </div>

        {/* [우측] 실시간 디버그 정보 (PC 전용) */}
        <div className="hidden lg:block w-80 flex-shrink-0 overflow-y-auto max-h-[85vh] pr-2 custom-scrollbar">
          <p className="text-xs tracking-[0.4em] mb-3" style={{ color: PALETTE.dawn }}>실시간 상태</p>
          
          <div className="px-3 py-2 mb-4" style={{ background: `${PALETTE.accent}10`, border: `1px solid ${PALETTE.panelBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: PALETTE.textDim }}>현재 페이즈</div>
            <div className="text-xs font-bold" style={{ color: PALETTE.text }}>{screen.toUpperCase()}</div>
          </div>

          <div className="space-y-2 text-[11px] mb-6">
            <div className="flex justify-between border-b border-white/5 pb-1"><span style={{ color: PALETTE.textDim }}>체력</span><span style={{ color: PALETTE.text }}>{hp}/{maxHp}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span style={{ color: PALETTE.textDim }}>보유 은화</span><span style={{ color: PALETTE.text }}>{gold}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span style={{ color: PALETTE.textDim }}>보유 보석</span><span style={{ color: PALETTE.text }}>{gem}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span style={{ color: PALETTE.textDim }}>획득 유물</span><span style={{ color: PALETTE.text }}>{relics.length}개</span></div>
          </div>

          {Object.keys(skills).length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] mb-2" style={{ color: PALETTE.dawn }}>습득 패시브</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(skills).filter(([_, lv]) => lv > 0).map(([k, lv]) => (
                  <span key={k} className="text-[10px] px-2 py-0.5" style={{
                    background: `${PASSIVE_SKILLS[k].color}20`,
                    color: PASSIVE_SKILLS[k].color,
                    border: `1px solid ${PASSIVE_SKILLS[k].color}40`,
                  }}>{k} Lv.{lv}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-[10px]" style={{ color: PALETTE.textDim, borderColor: PALETTE.panelBorder }}>
             <p className="opacity-50">배율 조정 모드 활성화됨</p>
          </div>
        </div>

      </div>
    </div>
  ); // <--- return 문을 닫는 소괄호와 세미콜론
} // <--- App 함수를 닫는 마지막 중괄호 (이게 누락되었을 가능성이 큽니다!)
