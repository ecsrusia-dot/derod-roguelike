// ============================================
// components/SoulAltar.jsx — 영혼의 제단 (메타 강화)
// ============================================

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PALETTE, getUpgradeCost } from '../utils/helpers.js';
import { META_UPGRADES, SOUL_REWARDS } from '../data.js';
import { getNextRefreshTime } from '../storage.js';

export default function SoulAltar({ meta, onPurchase, onReroll, slots, onBack }) {
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
  
  // 강화 목록 모달 표시 상태
  const [showOwnedUpgrades, setShowOwnedUpgrades] = useState(false);
  
  // 보유한 강화 (스택 1 이상) — META_UPGRADES에서 조회
  const ownedUpgrades = META_UPGRADES
    .filter(u => (meta.upgrades?.[u.id] || 0) > 0)
    .map(u => ({ ...u, stack: meta.upgrades[u.id] }));
  const totalSpent = ownedUpgrades.reduce((sum, u) => {
    let cost = 0;
    for (let i = 0; i < u.stack; i++) {
      cost += u.cost(i);
    }
    return sum + cost;
  }, 0);
  
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
        <button 
          onClick={() => setShowOwnedUpgrades(true)} 
          className="mt-2 mx-auto block px-3 py-1 text-[10px] tracking-[0.2em]"
          style={{
            background: `${PALETTE.twilight}20`,
            border: `1px solid ${PALETTE.twilight}80`,
            color: PALETTE.twilight,
          }}
        >📜 보유 강화 ({ownedUpgrades.length})</button>
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
      
      {/* 보유 강화 목록 모달 */}
      {showOwnedUpgrades && (
        <div 
          className="absolute inset-0 flex items-center justify-center px-4 z-50" 
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowOwnedUpgrades(false)}
        >
          <div 
            className="w-full max-w-sm max-h-[85vh] flex flex-col" 
            style={{
              background: PALETTE.panel,
              border: `2px solid ${PALETTE.twilight}`,
              boxShadow: `0 0 30px ${PALETTE.twilight}60`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${PALETTE.twilight}40` }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>★ 영혼의 제단</div>
                  <div className="text-base font-bold" style={{ color: PALETTE.twilight }}>보유한 강화</div>
                  <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
                    총 {ownedUpgrades.length}종 · 누적 ✦{totalSpent} 영혼 사용
                  </div>
                </div>
                <button 
                  onClick={() => setShowOwnedUpgrades(false)} 
                  className="text-lg px-2 py-0.5"
                  style={{ color: PALETTE.textDim, background: 'transparent' }}
                >✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {ownedUpgrades.length === 0 ? (
                <div className="text-center py-8" style={{ color: PALETTE.textDim }}>
                  <p className="text-sm mb-2">아직 보유한 강화가 없습니다</p>
                  <p className="text-[11px]">제단에서 영혼을 사용해 강화를 구매하세요</p>
                </div>
              ) : (
                ownedUpgrades.map((upgrade) => {
                  const isMax = upgrade.stackable && upgrade.maxStacks && upgrade.stack >= upgrade.maxStacks;
                  const upgradeColor = upgrade.color || PALETTE.twilight;
                  return (
                    <div key={upgrade.id} className="px-3 py-2" style={{
                      background: `${upgradeColor}15`,
                      border: `1px solid ${upgradeColor}60`,
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold" style={{ color: upgradeColor }}>
                            {upgrade.name}
                          </span>
                          {upgrade.stackable && (
                            <span className="text-[10px] px-1.5 py-0.5" style={{
                              background: `${upgradeColor}30`,
                              color: upgradeColor,
                              border: `1px solid ${upgradeColor}80`,
                            }}>
                              {isMax ? `MAX (${upgrade.stack}/${upgrade.maxStacks})` : `Lv.${upgrade.stack}${upgrade.maxStacks ? `/${upgrade.maxStacks}` : ''}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px]" style={{ color: PALETTE.text }}>
                        {upgrade.desc}
                      </div>
                      {upgrade.category && (
                        <div className="text-[9px] mt-1" style={{ color: PALETTE.textDim }}>
                          분류: {upgrade.category === 'permanent' ? '영구' : upgrade.category === 'expedition' ? '원정 시작 보너스' : upgrade.category}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="px-3 py-2" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
              <button 
                onClick={() => setShowOwnedUpgrades(false)} 
                className="w-full py-2 text-[11px] tracking-[0.2em]"
                style={{ 
                  background: 'transparent', 
                  border: `1px solid ${PALETTE.panelBorder}`,
                  color: PALETTE.textDim 
                }}
              >닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

