// ============================================
// components/LoginScreen.jsx — 첫 진입 시 모드 선택
// ============================================
// 3가지 모드:
// 1. 로컬 (인터넷 X 필요, 기기 변경 시 데이터 손실)
// 2. 게스트 (Firebase 익명, 클라우드 동기화)
// 3. Google 로그인 (멀티 디바이스)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { GAME_VERSION } from '../data.js';

export default function LoginScreen({ onSelectLocal, onSelectGuest, onSelectGoogle }) {
  const [loading, setLoading] = useState(null);  // null | 'guest' | 'google'
  const [error, setError] = useState(null);
  
  const handleSelect = async (mode, handler) => {
    setLoading(mode);
    setError(null);
    try {
      await handler();
    } catch (err) {
      setError(err.message || '로그인 실패');
      setLoading(null);
    }
  };
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-8" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 70%)`,
    }}>
      {/* 타이틀 */}
      <div className="text-center mt-8">
        <div className="text-xs tracking-[0.4em] mb-4" style={{ color: PALETTE.dawn, opacity: 0.7 }}>
          DAWN &amp; TWILIGHT
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3" style={{
          color: PALETTE.text,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          textShadow: `0 0 30px ${PALETTE.accent}40`,
        }}>
          던앤<br/>트와일라잇
        </h1>
        <div className="text-xs tracking-widest mt-4" style={{ color: PALETTE.textDim }}>
          ━━━ 어떻게 시작하시겠습니까 ━━━
        </div>
      </div>
      
      {/* 모드 선택 버튼 */}
      <div className="w-full max-w-xs space-y-3">
        {/* Google 로그인 — 최우선 추천 */}
        <button 
          onClick={() => handleSelect('google', onSelectGoogle)}
          disabled={loading !== null}
          className="w-full py-3 transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{
            background: `linear-gradient(180deg, ${PALETTE.legendary}50, ${PALETTE.legendary}25)`,
            color: PALETTE.text,
            border: `2px solid ${PALETTE.legendary}`,
            fontFamily: '"Cinzel", serif',
            letterSpacing: '0.2em',
            fontSize: '13px',
          }}
        >
          {loading === 'google' ? '연결 중...' : 'G  Google 로그인'}
        </button>
        <div className="text-[10px] text-center -mt-1.5" style={{ color: PALETTE.textDim }}>
          ✓ 멀티 디바이스 · ✓ 영구 보장 · ✓ 추천
        </div>
        
        {/* 게스트 — 익명 */}
        <button 
          onClick={() => handleSelect('guest', onSelectGuest)}
          disabled={loading !== null}
          className="w-full py-3 mt-4 transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{
            background: `linear-gradient(180deg, ${PALETTE.twilight}50, ${PALETTE.twilight}25)`,
            color: PALETTE.text,
            border: `1px solid ${PALETTE.twilight}`,
            fontFamily: '"Cinzel", serif',
            letterSpacing: '0.2em',
            fontSize: '12px',
          }}
        >
          {loading === 'guest' ? '연결 중...' : '▶  게스트로 시작'}
        </button>
        <div className="text-[10px] text-center -mt-1.5" style={{ color: PALETTE.textDim }}>
          익명 클라우드 저장 · 나중에 Google 연동 가능
        </div>
        
        {/* 로컬 — 인터넷 필요없음 */}
        <button 
          onClick={onSelectLocal}
          disabled={loading !== null}
          className="w-full py-2.5 mt-4 transition-all disabled:opacity-50"
          style={{
            background: 'transparent',
            color: PALETTE.textDim,
            border: `1px solid ${PALETTE.panelBorder}`,
            letterSpacing: '0.2em',
            fontSize: '11px',
          }}
        >
          로컬 모드 (인터넷 없이)
        </button>
        <div className="text-[9px] text-center -mt-1.5" style={{ color: PALETTE.textDim, opacity: 0.7 }}>
          ⚠ 브라우저 데이터 삭제 시 진행 사라짐
        </div>
      </div>
      
      {/* 에러 표시 */}
      {error && (
        <div className="text-[10px] text-center px-4 py-2" style={{ 
          color: PALETTE.accent, 
          background: `${PALETTE.accent}10`,
          border: `1px solid ${PALETTE.accent}40`,
        }}>
          {error}
        </div>
      )}
      
      {/* 버전 정보 */}
      <div className="text-[9px] tracking-[0.3em]" style={{ color: PALETTE.textDim, opacity: 0.5 }}>
        v{GAME_VERSION}
      </div>
    </div>
  );
}
