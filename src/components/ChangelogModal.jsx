// ============================================
// components/ChangelogModal.jsx — 업데이트 로그 모달
// ============================================
// firstSeen=true: 첫 접속 시 자동 표시 (가장 최신 버전 1개만)
// firstSeen=false: 메인 화면에서 클릭 시 (전체 히스토리)
// ============================================

import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { CHANGELOG, CHANGE_TYPES } from '../data/changelog.js';

export default function ChangelogModal({ firstSeen = false, onClose }) {
  // 첫 접속 시 = 최신 버전만, 메인 클릭 시 = 전체
  const displayLogs = firstSeen ? [CHANGELOG[0]] : CHANGELOG;
  
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center px-4 z-50" 
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm max-h-[85vh] flex flex-col" 
        style={{
          background: PALETTE.panel,
          border: `2px solid ${PALETTE.dawn}`,
          boxShadow: `0 0 30px ${PALETTE.dawn}40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${PALETTE.dawn}40` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>
                {firstSeen ? '◆ 신규 업데이트' : '◆ 업데이트 히스토리'}
              </div>
              <div className="text-base font-bold mt-0.5" style={{ 
                color: PALETTE.dawn,
                fontFamily: '"Cinzel", serif',
              }}>
                {firstSeen ? `v${CHANGELOG[0].version} · ${CHANGELOG[0].label}` : '업데이트 로그'}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-lg px-2 py-0.5"
              style={{ color: PALETTE.textDim, background: 'transparent' }}
            >✕</button>
          </div>
        </div>
        
        {/* 본문 — 버전별 변경사항 */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {displayLogs.map((log) => (
            <div key={log.version}>
              {/* 버전 헤더 */}
              <div className="flex items-center gap-2 mb-2 pb-1" style={{ 
                borderBottom: `1px solid ${PALETTE.panelBorder}` 
              }}>
                <span className="text-sm font-bold" style={{ 
                  color: PALETTE.dawn,
                  fontFamily: '"Cinzel", serif',
                }}>v{log.version}</span>
                <span className="text-[10px]" style={{ color: PALETTE.textDim }}>
                  {log.date}
                </span>
                {log.label && (
                  <span className="text-[10px] ml-auto" style={{ color: PALETTE.text }}>
                    {log.label}
                  </span>
                )}
              </div>
              
              {/* 변경사항 리스트 */}
              <div className="space-y-1.5">
                {log.changes.map((change, idx) => {
                  const typeInfo = CHANGE_TYPES[change.type] || CHANGE_TYPES.system;
                  return (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <span 
                        className="text-[9px] px-1.5 py-0.5 shrink-0 mt-0.5"
                        style={{
                          background: `${typeInfo.color}25`,
                          color: typeInfo.color,
                          border: `1px solid ${typeInfo.color}60`,
                          minWidth: '46px',
                          textAlign: 'center',
                        }}
                      >{typeInfo.label}</span>
                      <span style={{ color: PALETTE.text, lineHeight: '1.5' }}>
                        {change.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* 닫기 */}
        <div className="px-3 py-2" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
          <button 
            onClick={onClose} 
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
  );
}
