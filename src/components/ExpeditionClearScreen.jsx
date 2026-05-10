// ============================================
// components/ExpeditionClearScreen.jsx — 원정 완전 클리어 화면
// ============================================
import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { RELICS } from '../data.js';

export default function ExpeditionClearScreen({ expedition, soulsGained, firstClear, onContinue }) {
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
