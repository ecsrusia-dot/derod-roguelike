// ============================================
// components/TitleScreen.jsx — 메인 타이틀 화면
// ============================================
import React from 'react';
import { PlayCircle } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GAME_VERSION, VERSION_DATE, VERSION_LABEL, CLASSES } from '../data.js';

export default function TitleScreen({ meta, onStart, onResume, onAltar, onAchievements, onChangelog, onAccount }) {
  // 진행 중인 런이 있는지 — 이어하기 버튼 노출 여부 결정
  const activeRun = meta?.activeRun;
  const canResume = !!(activeRun && activeRun.v === 1 && activeRun.expedition);
  const resumeClassName = canResume ? (CLASSES[activeRun.selectedClass]?.name || '') : '';
  const resumeExpName = canResume ? (activeRun.expedition?.name || '') : '';
  const resumeChapterDepth = canResume
    ? (activeRun.expedition?.endless
        ? `Depth ${(activeRun.chapterIdx || 0) + 1}`
        : `Ch.${(activeRun.chapterIdx || 0) + 1}`)
    : '';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-8" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mt-8">
        <div className="text-xs tracking-[0.4em] mb-4" style={{ color: PALETTE.dawn, opacity: 0.7 }}>
          DAWN &amp; TWILIGHT
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-3" style={{
          color: PALETTE.text,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          textShadow: `0 0 30px ${PALETTE.accent}40`,
        }}>
          던앤<br/>트와일라잇
        </h1>
        <div className="text-xs tracking-widest mt-4" style={{ color: PALETTE.textDim }}>
          ━━━ 텍스트 로그라이크 ━━━
        </div>
      </div>
      
      {/* 영혼 카운터 */}
      <div className="px-6 py-2 flex items-center gap-2" style={{
        background: `${PALETTE.twilight}20`,
        border: `1px solid ${PALETTE.twilight}80`,
      }}>
        <span style={{ color: PALETTE.twilight, fontSize: '20px' }}>✦</span>
        <span className="text-base font-bold tracking-wider" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
          {meta?.souls || 0}
        </span>
        <span className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>SOULS</span>
      </div>
      
      <div className="w-full flex flex-col gap-2.5">
        {canResume && onResume && (
          <button onClick={onResume} className="w-full py-3 transition-all hover:scale-[1.02]" style={{
            background: `linear-gradient(180deg, ${PALETTE.dawn}50, ${PALETTE.dawn}20)`,
            color: PALETTE.text,
            border: `1.5px solid ${PALETTE.dawn}`,
            boxShadow: `0 0 20px ${PALETTE.dawn}40`,
          }}>
            <div className="flex items-center justify-center gap-2">
              <PlayCircle size={16} style={{ color: PALETTE.dawn }} />
              <span style={{ fontFamily: '"Cinzel", serif', letterSpacing: '0.25em', fontSize: '13px' }}>이어하기</span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
              {resumeClassName} · {resumeExpName} · {resumeChapterDepth}
            </div>
          </button>
        )}
        <button onClick={onStart} className="w-full py-3 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.accent}, ${PALETTE.accentDim})`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.dawn}40`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.3em',
          fontSize: '14px',
          boxShadow: `0 0 20px ${PALETTE.accent}40`,
        }}>{canResume ? '새 여정 시작' : '여정 시작'}</button>
        
        <button onClick={onAltar} className="w-full py-2.5 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.twilight}40, ${PALETTE.twilight}20)`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.twilight}`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.25em',
          fontSize: '12px',
        }}>★ 영혼의 제단</button>
        
        <button onClick={onAchievements} className="w-full py-2.5 transition-all hover:scale-[1.02]" style={{
          background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.legendary}`,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.25em',
          fontSize: '12px',
        }}>✦ 업적</button>
        
        {onAccount && (
          <button onClick={onAccount} className="w-full py-2 transition-all" style={{
            background: 'transparent',
            color: PALETTE.textDim,
            border: `1px solid ${PALETTE.panelBorder}`,
            letterSpacing: '0.2em',
            fontSize: '10px',
            marginTop: '4px',
          }}>◆ 계정 관리</button>
        )}
      </div>
      
      {/* 버전 정보 (하단 작은 텍스트, 클릭 시 업데이트 로그) */}
      <button 
        onClick={onChangelog}
        className="absolute bottom-2 left-0 right-0 text-center transition-opacity hover:opacity-100" 
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div className="text-[9px] tracking-[0.3em]" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
          v{GAME_VERSION} · {VERSION_LABEL} · {VERSION_DATE} <span style={{ color: PALETTE.dawn }}>📋</span>
        </div>
      </button>
    </div>
  );
}
