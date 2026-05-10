// ============================================
// components/DefeatScreen.jsx — 패배 화면
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { SOUL_REWARDS } from '../data.js';

export default function DefeatScreen({ classData, chapter, soulsGained, onContinue }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shaken, setShaken] = useState(true);
  
  useEffect(() => {
    const t = setTimeout(() => setShaken(false), 700);
    return () => clearTimeout(t);
  }, []);
  
  return (
    <div className="absolute inset-0 overflow-hidden" style={{
      background: PALETTE.bgDeep,
      animation: shaken ? 'defeatShake 0.6s ease-out' : 'none',
    }}>
      {classData?.lossImage && !imageError && (
        <img 
          src={classData.lossImage} 
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
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
        background: `linear-gradient(180deg, transparent 0%, ${PALETTE.bgDeep}90 60%, ${PALETTE.bgDeep} 100%)`,
        pointerEvents: 'none',
      }} />
      <style>{`
        @keyframes defeatShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
        @keyframes defeatTitleAppear {
          0% { opacity: 0; transform: scale(1.4); filter: blur(8px); text-shadow: 0 0 100px ${PALETTE.accent}, 0 0 150px ${PALETTE.accent}; }
          60% { opacity: 1; filter: blur(0); transform: scale(1.05); text-shadow: 0 0 80px ${PALETTE.accent}, 0 0 130px ${PALETTE.accent}; }
          100% { opacity: 1; transform: scale(1); text-shadow: 0 0 25px ${PALETTE.accent}80, 0 2px 8px rgba(0,0,0,0.9); }
        }
        @keyframes defeatSubFade {
          0%, 50% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 text-center">
        <div className="text-[10px] tracking-[0.5em] mb-2" style={{ 
          color: PALETTE.accent, opacity: 0.9,
          animation: 'defeatSubFade 1.5s ease-out 0.5s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>━━ D E F E A T ━━</div>
        <h2 className="text-5xl font-bold mb-2" style={{
          color: PALETTE.accent, fontFamily: '"Cinzel", serif',
          animation: 'defeatTitleAppear 1.5s ease-out forwards',
        }}>죽음</h2>
        <p className="text-xs italic mt-2" style={{ 
          color: PALETTE.textDim,
          animation: 'defeatSubFade 1.5s ease-out 1s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>
          {chapter ? `${chapter.name}에서 쓰러지다` : '여정의 끝'}
        </p>
        <div className="mt-4 mx-auto px-6 py-2 inline-flex flex-col items-center" style={{
          background: `${PALETTE.twilight}30`,
          border: `1px solid ${PALETTE.twilight}80`,
          animation: 'defeatSubFade 1.5s ease-out 1.4s both',
        }}>
          <div className="text-[9px] tracking-[0.3em] mb-1" style={{ color: PALETTE.twilight }}>
            SOULS RECOVERED · {Math.round(SOUL_REWARDS.deathPenalty * 100)}%
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: PALETTE.twilight, fontSize: '20px' }}>✦</span>
            <span className="text-2xl font-bold" style={{ 
              color: PALETTE.text, fontFamily: '"Cinzel", serif',
            }}>+{soulsGained}</span>
          </div>
        </div>
        <button onClick={onContinue} className="mt-5 px-10 py-2.5 block mx-auto" style={{
          background: `linear-gradient(180deg, ${PALETTE.accent}40, ${PALETTE.accentDim}40)`,
          border: `1px solid ${PALETTE.accent}`,
          color: PALETTE.text, letterSpacing: '0.3em', fontSize: '13px',
          animation: 'defeatSubFade 1.5s ease-out 1.8s both',
        }}>▸ 메인 메뉴</button>
      </div>
    </div>
  );
}

// =========== 업적 화면 ===========
// 업적 진행 + 보상 수령 UI
// 추적 시스템은 별도 작업 — 현재는 progress/completed/claimed 상태만 표시
