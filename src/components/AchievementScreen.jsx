// ============================================
// components/AchievementScreen.jsx — 업적 화면
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { ACHIEVEMENTS } from '../data.js';
import { getAchievementState } from '../storage.js';

export default function AchievementScreen({ meta, onClaim, onClose }) {
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
