// ============================================
// utils/rewards.js — 보상 풀 빌드 및 추첨
// ============================================
// getRewardPool: 직업 ID 기반 보상 풀 빌드
// rollRewards: count장 카드 추첨 (가중치 기반)
// ============================================

import { 
  RELICS, 
  ULTIMATE_SKILLS, 
  buildRewardPool 
} from '../data.js';

// 보상 풀 빌드 (직업별 전용 패시브 포함)
export function getRewardPool(currentClassId) {
  return buildRewardPool(currentClassId);
}

export function rollRewards(count = 3, eliteBonus = false, skills = {}, relics = [], ultimates = [], currentClassId = null, meta = null, expedition = null) {
  // 보상 풀 동적 필터링 (직업 ID 기반으로 직업 전용 패시브 포함)
  const REWARD_POOL = getRewardPool(currentClassId);
  // 챔피언십 해금 유물 추가 (낮은 weight 1)
  // 단, 해당 원정의 챔피언십 유물만 등장 (다른 원정 유물 X, 클래식에선 X)
  const currentChampId = expedition?.isChampionship ? expedition.championshipId : null;
  const unlockedChampRelics = currentChampId
    ? (meta?.championshipRelicUnlocks || [])
        .map(name => RELICS.find(r => r.name === name))
        .filter(r => r && r.championshipUnlock === currentChampId)
        .map(r => ({ type: 'relic', ...r, weight: 1 }))
    : [];
  const filteredPool = [...REWARD_POOL, ...unlockedChampRelics].filter(r => {
    // 유물 중복 방지: 이미 보유한 유물은 풀에서 제외
    if (r.type === 'relic') {
      const owned = relics.some(rel => rel.name === r.name);
      if (owned) return false;
    }
    // 패시브 풀 처리:
    // - Lv.7 미만이면 OK (일반 강화 카드)
    // - Lv.7이지만 궁극 미획득 슬롯 있으면 OK (궁극 진화 카드로 변환됨)
    // - Lv.7이고 궁극 3개 다 획득했으면 제외
    if (r.type === 'skill') {
      const currentLv = skills[r.name] || 0;
      const skillUltimates = ULTIMATE_SKILLS[r.name];
      
      // 심안류: 궁극 1개라도 획득 시 보상 풀에서 영구 제외 (방랑검사 전용)
      if (r.name === '심안류') {
        const hasAnySimanUlt = (skillUltimates || []).some(u => ultimates.includes(u.id));
        if (hasAnySimanUlt) return false;
      }
      // 1.33.0~ 이프리트: 궁극 1개라도 획득 시 보상 풀에서 영구 제외 (술법사 전용, 심안류 패턴)
      if (r.name === '이프리트') {
        const hasAnyIfritUlt = (skillUltimates || []).some(u => ultimates.includes(u.id));
        if (hasAnyIfritUlt) return false;
      }
      
      if (currentLv >= 7) {
        // Lv.7 도달 — 궁극 진화 가능한지 확인
        if (!skillUltimates) return false;  // 궁극 정의 없는 패시브는 제외
        const acquiredCount = skillUltimates.filter(u => ultimates.includes(u.id)).length;
        if (acquiredCount >= 3) return false;  // 3개 다 획득 시 제외
        // 그 외 (Lv.7 + 궁극 슬롯 남음) → 풀에 남김 (궁극 진화 카드로 변환)
      } else {
        // Lv.7 미만이지만, 만약 궁극이 있고 3개 다 획득한 패시브라면 풀에서 제외
        // (이 케이스는 거의 없지만 안전장치)
        if (skillUltimates) {
          const acquiredCount = skillUltimates.filter(u => ultimates.includes(u.id)).length;
          if (acquiredCount >= 3) return false;
        }
      }
    }
    return true;
  });

  // Lv.7 도달한 패시브 (궁극 진화 대상)는 weight 부스트 — 우선 노출
  // 기본 weight 28 → ×3 = 84 (등장 확률 약 3배 증가)
  const boostedPool = filteredPool.map(r => {
    if (r.type === 'skill' && (skills[r.name] || 0) >= 7) {
      return { ...r, weight: r.weight * 3 };
    }
    return r;
  });
  
  const totalWeight = boostedPool.reduce((s, r) => s + r.weight, 0);
  const picked = [];
  const usedKeys = new Set();
  let attempts = 0;
  
  while (picked.length < count && attempts < 100) {
    attempts++;
    let r = Math.random() * totalWeight;
    for (const reward of boostedPool) {
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
