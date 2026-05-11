// ============================================
// components/RewardSelect.jsx — 운명의 갈림길 (보상 카드 3종 선택)
// ============================================

import React, { useState } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { PALETTE, hasEffect } from '../utils/helpers.js';
import { PASSIVE_SKILLS, GAME_CONFIG } from '../data.js';
import { rollRewards } from '../utils/rewards.js';

export default function RewardSelect({ rewards: initialRewards, gem, skills, relics, ultimates, activeSkills = null, onPick, onReroll, hasRerolled, isElite, classId = null, meta = null, expedition = null }) {
  const [rewards, setRewards] = useState(initialRewards);
  // 운명 Lv.3: 리롤 비용 -1
  const rerollCost = hasEffect(skills, 'rerollDiscount', activeSkills) ? GAME_CONFIG.rerollDiscountCost : GAME_CONFIG.rerollCost;

  const handleReroll = () => {
    if (hasRerolled || gem < rerollCost) return;
    // 운명 Lv.5: 보상 4중1
    const count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
    const newRewards = rollRewards(count, isElite, skills, relics, ultimates, classId, meta, expedition);
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
