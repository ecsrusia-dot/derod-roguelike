// ============================================
// components/ShopScreen.jsx — 상점 (패시브 강화 + 유물 구매)
// ============================================

import React, { useState, useEffect } from 'react';
import { PALETTE, hasCurse, AUTO_STAT_PREF } from '../utils/helpers.js';
import { SHOP_PRICES, PASSIVE_SKILLS, CLASSES, COMBAT_SKILLS, POTIONS } from '../data.js';
import { getRewardPool, rollRewards } from '../utils/rewards.js';

export default function ShopScreen({ gold, skills, relics, ultimates, curses = [], autoPlay = false, autoSpeed = 1, onBuy, onLeave, classId = null, hp = null, maxHp = null, beltCount = 0, beltSlots = 0 }) {
  const priceMultiplier = hasCurse(curses, 'curse_shopPrice+50') ? 1.5 : 1.0;
  // 상점 재고: 유물·궁극·재화는 제외하고 다양한 카테고리로
  const [stock] = useState(() => {
    const initial = rollRewards(8, false, skills, relics, ultimates, classId);
    // 유물/궁극/재화 제외, 4개만 추출
    const base = initial.filter(r =>
      r.type !== 'relic' && r.type !== 'ultimate' &&
      r.type !== 'gold' && r.type !== 'gem'
    ).slice(0, 4);
    // 1.96.0~ 황혼의 벨트 — 포션 2종 랜덤 진열 (중복 가능)
    const potionIds = Object.keys(POTIONS);
    const p1 = potionIds[Math.floor(Math.random() * potionIds.length)];
    const p2 = potionIds[Math.floor(Math.random() * potionIds.length)];
    return [...base, { type: 'potion', potionId: p1 }, { type: 'potion', potionId: p2 }];
  });
  const [bought, setBought] = useState(new Set());

  const getPrice = (r) => {
    let base;
    if (r.type === 'skill') base = SHOP_PRICES.skill;
    else if (r.type === 'stat') base = SHOP_PRICES.stat;
    else if (r.type === 'heal_full') base = SHOP_PRICES.heal_full;
    else if (r.type === 'heal') base = r.value === 50 ? SHOP_PRICES.heal_50 : SHOP_PRICES.heal_100;
    else if (r.type === 'potion') base = POTIONS[r.potionId]?.price || SHOP_PRICES.default;
    else base = SHOP_PRICES.default;
    return Math.ceil(base * priceMultiplier);
  };

  // 1.72.1~ 자동 사냥 — 직업 맞춤 자동 구매 후 퇴장
  // 우선순위: 직업 전용 패시브(classOnly) > 보유 패시브 강화(Lv 높은 순) > 새 패시브 > 직업 주력 스탯
  // 예비 골드 100은 남김. 회복류는 정비 노드가 담당하므로 구매 안 함.
  // 구매할 때마다 gold prop이 갱신돼 effect 재실행 → 다음 대상 구매 or 퇴장
  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => {
      const RESERVE_GOLD = 100;
      // 1.84.2 완화 (PM 결정): 잔혹은 자체 출혈 부여(Lv.3~)라 물리 직업군이면 자동 구매 허용
      //   — 마법 전용 직업(술법사·사제)만 제외 (수동 구매는 항상 가능)
      const physCapable = !!CLASSES.find(c => c.id === classId)?.combatSkills?.some(k => COMBAT_SKILLS[k]?.type === 'physical');
      // 1.94.0~ 생존 보강 (PM 옵션 A): 저체력이면 회복 아이템도 자동 구매 대상
      const hpRatio = hp != null && maxHp > 0 ? hp / maxHp : 1;
      const buyable = stock
        .map((r, idx) => ({ r, idx, price: getPrice(r) }))
        .filter(({ r, idx, price }) => {
          if (bought.has(idx)) return false;
          if (gold - price < RESERVE_GOLD) return false;
          if (r.type === 'skill' && r.name === '잔혹' && !physCapable) return false;
          if (r.type === 'skill') {
            return (skills[r.name] || 0) < (PASSIVE_SKILLS[r.name]?.maxLv || 7);
          }
          if ((r.type === 'heal' || r.type === 'heal_full') && hpRatio < 0.6) return true;
          // 1.96.0~ 포션: 벨트 여유 있으면 자동 구매 대상 (구매분 반영 위해 beltCount + 이번 세션 구매 수)
          if (r.type === 'potion') return beltCount < beltSlots;
          return r.type === 'stat';
        });
      const score = ({ r }) => {
        // 저체력 회복 최우선 — HP 40% 미만이면 완전 회복 > 부분 회복 > 나머지
        if (r.type === 'heal_full' && hpRatio < 0.4) return 500;
        if (r.type === 'heal' && hpRatio < 0.4) return 450;
        if ((r.type === 'heal' || r.type === 'heal_full') && hpRatio < 0.6) return 250;
        // 1.96.0~ 포션 — 생존 직결이라 패시브 강화보다 반 단계 아래, 새 패시브보다 위
        if (r.type === 'potion') return 150;
        if (r.type === 'skill' && PASSIVE_SKILLS[r.name]?.classOnly === classId) return 300;
        if (r.type === 'skill' && (skills[r.name] || 0) > 0) return 200 + (skills[r.name] || 0);
        if (r.type === 'skill') return 100;
        if (r.type === 'stat' && r.name === AUTO_STAT_PREF[classId]) return 50;
        return 10;
      };
      const target = [...buyable].sort((a, b) => score(b) - score(a))[0];
      if (target) {
        onBuy(target.r, target.price);
        setBought(prev => new Set([...prev, target.idx]));
      } else {
        onLeave();
      }
    }, autoSpeed > 1 ? Math.max(60, Math.round(800 / autoSpeed)) : 800);
    return () => clearTimeout(t);
  }, [autoPlay, gold, bought]);

  const renderItem = (r, idx) => {
    const price = getPrice(r);
    const canAfford = gold >= price;
    const isBought = bought.has(idx);
    let title, color;
    if (r.type === 'skill') { title = `${r.name} +1Lv`; color = PASSIVE_SKILLS[r.name].color; }
    else if (r.type === 'stat') { title = `${r.name} +${r.value}`; color = PALETTE.dawn; }
    else if (r.type === 'heal') { title = `회복 ${r.value}`; color = PALETTE.green; }
    else if (r.type === 'heal_full') { title = '완전 회복'; color = PALETTE.legendary; }
    else if (r.type === 'potion') { const p = POTIONS[r.potionId]; title = `${p?.icon || '🧪'} ${p?.name || '물약'} — ${p?.desc || ''}`; color = p?.color || PALETTE.green; }
    else { title = `${r.type} +${r.value}`; color = PALETTE.dawn; }

    // 패시브 Lv 변화 계산
    const currentLv = r.type === 'skill' ? (skills[r.name] || 0) : 0;
    const nextLv = currentLv + 1;
    const maxLv = r.type === 'skill' ? (PASSIVE_SKILLS[r.name]?.maxLv || 7) : 0;
    const isMaxed = r.type === 'skill' && currentLv >= maxLv;
    // 1.96.0~ 포션: 벨트가 가득이면 구매 불가
    const beltFull = r.type === 'potion' && beltCount >= beltSlots;

    return (
      <button key={idx} disabled={!canAfford || isBought || isMaxed || beltFull}
        onClick={() => { onBuy(r, price); setBought(prev => new Set([...prev, idx])); }}
        className="ui-press w-full text-left px-3 py-2.5 transition-all"
        style={{
          borderRadius: 13,
          background: isBought ? 'rgba(255,255,255,0.02)' : `${color}15`,
          border: `1px solid ${isBought ? 'var(--ui-line)' : `${color}88`}`,
          opacity: isBought ? 0.4 : (canAfford && !isMaxed && !beltFull ? 1 : 0.6),
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
              {isBought ? '구매 완료' : beltFull ? `벨트 가득 (${beltCount}/${beltSlots})` : r.type === 'potion' ? `벨트 ${beltCount}/${beltSlots}` : r.type === 'skill' ? PASSIVE_SKILLS[r.name].desc : ''}
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
