// ============================================
// components/ShopScreen.jsx — 상점 (패시브 강화 + 유물 구매)
// ============================================

import React, { useState } from 'react';
import { PALETTE, hasCurse } from '../utils/helpers.js';
import { SHOP_PRICES, PASSIVE_SKILLS } from '../data.js';
import { getRewardPool, rollRewards } from '../utils/rewards.js';

export default function ShopScreen({ gold, skills, relics, ultimates, curses = [], onBuy, onLeave, classId = null }) {
  const priceMultiplier = hasCurse(curses, 'curse_shopPrice+50') ? 1.5 : 1.0;
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
    let base;
    if (r.type === 'skill') base = SHOP_PRICES.skill;
    else if (r.type === 'stat') base = SHOP_PRICES.stat;
    else if (r.type === 'heal_full') base = SHOP_PRICES.heal_full;
    else if (r.type === 'heal') base = r.value === 50 ? SHOP_PRICES.heal_50 : SHOP_PRICES.heal_100;
    else base = SHOP_PRICES.default;
    return Math.ceil(base * priceMultiplier);
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
        className="ui-press w-full text-left px-3 py-2.5 transition-all"
        style={{
          borderRadius: 13,
          background: isBought ? 'rgba(255,255,255,0.02)' : `${color}15`,
          border: `1px solid ${isBought ? 'var(--ui-line)' : `${color}88`}`,
          opacity: isBought ? 0.4 : (canAfford && !isMaxed ? 1 : 0.6),
        }}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold" style={{ color: PALETTE.text }}>{title}</span>
              {r.type === 'skill' && (
                <span className="text-[10px] px-2 py-0.5" style={{
                  borderRadius: 999, background: `${color}30`, color, border: `1px solid ${color}80`,
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
      <div className="border-t p-3" style={{ borderColor: 'var(--ui-line)', background: PALETTE.bgDeep }}>
        <button onClick={onLeave} className="ui-press w-full text-xs tracking-[0.3em]" style={{
          height: 44, borderRadius: 'var(--r-btn)',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ui-line)', color: PALETTE.text,
        }}>▸ 떠난다</button>
      </div>
    </div>
  );
}

// =========== 황혼의 대장간 ===========
// 유물 2개 희생 → 정해진 패시브 +1Lv (또는 영혼 +50)
// 직업 전용 패시브 (심안류, 이프리트) 제외
