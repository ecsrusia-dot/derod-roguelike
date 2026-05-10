// ============================================
// components/StartScreen.jsx — 원정 시작 (직업 일러스트)
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';

export default function StartScreen({ classData, onContinue }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const classColor = classData?.color || PALETTE.dawn;
  
  return (
    <div className="absolute inset-0 overflow-hidden" 
      onClick={onContinue}
      style={{ background: PALETTE.bgDeep, cursor: 'pointer' }}>
      {/* 일러스트 그대로 (필터 없음) */}
      {classData?.startImage && !imageError && (
        <img 
          src={classData.startImage} 
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
      {/* 하단 텍스트 가독성 그라디언트 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
        background: `linear-gradient(180deg, transparent 0%, ${PALETTE.bgDeep}90 70%, ${PALETTE.bgDeep} 100%)`,
        pointerEvents: 'none',
      }} />
      <style>{`
        @keyframes startTitleAppear {
          0% { opacity: 0; transform: translateY(-20px) scale(0.9); letter-spacing: 0.5em; text-shadow: 0 0 80px ${classColor}, 0 0 120px ${classColor}; }
          60% { opacity: 1; text-shadow: 0 0 60px ${classColor}, 0 0 100px ${classColor}; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.1em; text-shadow: 0 0 20px ${classColor}80, 0 2px 8px rgba(0,0,0,0.9); }
        }
        @keyframes startSubFade {
          0%, 30% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes startTapHint {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div className="absolute left-0 right-0 bottom-0 px-6 pb-10 text-center">
        <div className="text-[10px] tracking-[0.5em] mb-2" style={{ 
          color: classColor, opacity: 0.9,
          animation: 'startSubFade 1.2s ease-out 0.4s both',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>━━ D E P A R T U R E ━━</div>
        <h2 className="text-5xl font-bold mb-3" style={{
          color: PALETTE.text, fontFamily: '"Cinzel", serif',
          animation: 'startTitleAppear 1.5s ease-out forwards',
        }}>출정</h2>
        {classData && (
          <div className="text-sm font-bold tracking-[0.2em] mt-3" style={{ 
            color: classColor,
            animation: 'startSubFade 1.2s ease-out 0.9s both',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {classData.name} · <span className="text-[10px]" style={{ color: PALETTE.textDim }}>{classData.sub}</span>
          </div>
        )}
        {/* 직업 대사 */}
        {classData?.quote && (
          <div className="text-base italic mt-4 px-4" style={{
            color: '#fff',
            animation: 'startSubFade 1.4s ease-out 1.3s both',
            textShadow: `0 0 8px ${classColor}, 0 2px 6px rgba(0,0,0,0.95)`,
            letterSpacing: '0.05em',
          }}>
            「 {classData.quote} 」
          </div>
        )}
        <div className="text-[10px] tracking-[0.4em] mt-4" style={{
          color: PALETTE.textDim,
          animation: 'startTapHint 2s ease-in-out 1.8s infinite',
        }}>▸ 화면을 탭하여 출정</div>
      </div>
    </div>
  );
}
