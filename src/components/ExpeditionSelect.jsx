// ============================================
// components/ExpeditionSelect.jsx — 원정 선택 (클래식 + 챔피언십)
// ============================================

import React, { useState } from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { PALETTE, isUnlocked } from '../utils/helpers.js';
import { EXPEDITIONS, CHAMPIONSHIPS } from '../data.js';

export default function ExpeditionSelect({ meta, onSelect, onSelectChampionship, onBack }) {
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
