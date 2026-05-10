// ============================================
// components/VictoryScreen.jsx — 전투 승리 화면
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';

export default function VictoryScreen({ classData, enemy, gains = { gold: 0, gem: 0, souls: 0 }, onContinue }) {
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
