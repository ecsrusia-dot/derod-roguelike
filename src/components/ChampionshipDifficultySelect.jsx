// ============================================
// components/ChampionshipDifficultySelect.jsx — 챔피언십 난이도 선택
// ============================================

import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { CHAMPIONSHIP_DIFFICULTIES } from '../data.js';
import { isChampionshipDifficultyUnlocked, hasChampionshipClear } from '../storage.js';

export default function ChampionshipDifficultySelect({ championship, meta, onSelect, onBack }) {
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

