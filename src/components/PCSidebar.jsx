// ============================================
// components/PCSidebar.jsx — PC 전용 우측 실시간 상태 사이드바
// ============================================
// 클릭 시 상세 모달 표시:
// - 영혼 → 영혼의 제단 정보 (메타 강화 보유 목록 등)
// - 유물 → 보유 유물 목록
// - 패시브 → 보유 패시브 + 레벨
// - 챔피언십 → 진행 상황
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS } from '../data.js';

// 현재 화면명 → 한글 라벨
const SCREEN_LABELS = {
  title: '메인 메뉴',
  classSelect: '직업 선택',
  expeditionSelect: '원정 선택',
  championshipDifficulty: '챔피언십 난이도',
  map: '챕터 진행',
  combat: '전투',
  reward: '보상 선택',
  prep: '전투 준비',
  event: '사건',
  rest: '정비',
  shop: '상점',
  forge: '대장간',
  status: '상태창',
  altar: '영혼의 제단',
  achievements: '업적',
  codex: '도감',
  account: '계정 관리',
  victory: '전투 승리',
  defeat: '패배',
  chapterClear: '챕터 클리어',
  expeditionClear: '원정 완료',
};

export default function PCSidebar({ 
  screen,
  meta,
  hp, maxHp,
  gold, gem,
  relics,
  skills,
  ultimates,
  chapter,
  chapterIdx,
  expedition,
  classData,
  curses,
}) {
  const [modal, setModal] = useState(null);  // null | 'relics' | 'skills' | 'achievements' | 'curses'
  
  const screenLabel = SCREEN_LABELS[screen] || screen;
  const inRun = ['map','combat','reward','prep','event','rest','shop','forge','status','victory','chapterClear'].includes(screen);
  
  // 보유 패시브 (lv > 0인 것들만)
  const ownedSkills = skills ? Object.entries(skills)
    .filter(([_, lv]) => lv > 0)
    .map(([name, lv]) => ({ name, lv }))
    : [];
  
  // 클릭 가능 항목 스타일
  const clickableStyle = {
    cursor: 'pointer',
    transition: 'all 0.2s',
  };
  
  return (
    <>
      <div 
        className="fixed right-6 flex flex-col gap-3"
        style={{ 
          top: '50%',
          transform: 'translateY(-50%)',
          width: '260px',
          maxHeight: '90vh',
          overflow: 'auto',
          color: PALETTE.text,
          fontFamily: '"Noto Serif KR", serif',
        }}
      >
        {/* 헤더 */}
        <div className="px-3 py-2" style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.panelBorder}`,
        }}>
          <div className="text-[9px] tracking-[0.3em] mb-1" style={{ color: PALETTE.textDim }}>
            ━━ 실시간 상태 ━━
          </div>
          <div className="text-[11px]" style={{ color: PALETTE.text }}>
            <span style={{ color: PALETTE.textDim }}>현재 화면 ▸ </span>
            <span style={{ color: PALETTE.dawn }}>{screenLabel}</span>
          </div>
          {classData && inRun && (
            <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
              {classData.name} · {expedition?.name}
              {typeof chapterIdx === 'number' && chapter && (
                <span> · 챕터 {chapterIdx + 1}/{expedition?.chapters?.length || '?'}</span>
              )}
            </div>
          )}
        </div>
        
        {/* 영혼 (상시 표시) */}
        <div className="px-3 py-2" style={{
          background: `${PALETTE.twilight}10`,
          border: `1px solid ${PALETTE.twilight}40`,
        }}>
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: PALETTE.textDim }}>✦ 영혼</span>
            <span style={{ color: PALETTE.twilight, fontWeight: 'bold' }}>{meta?.souls || 0}</span>
          </div>
        </div>
        
        {/* 런 중일 때만 표시되는 항목들 */}
        {inRun && (
          <>
            {/* HP */}
            {typeof hp === 'number' && typeof maxHp === 'number' && maxHp > 0 && (
              <div className="px-3 py-2" style={{
                background: PALETTE.panel,
                border: `1px solid ${PALETTE.accent}40`,
              }}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: PALETTE.textDim }}>♥ 체력</span>
                  <span style={{ color: hp / maxHp < 0.3 ? PALETTE.accent : PALETTE.text }}>
                    {hp} / {maxHp}
                  </span>
                </div>
                {/* HP 바 */}
                <div className="h-1.5" style={{ background: PALETTE.bgDeep, position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`,
                    background: hp / maxHp < 0.3 ? PALETTE.accent : PALETTE.dawn,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )}
            
            {/* 골드 / 보석 */}
            {(typeof gold === 'number' || typeof gem === 'number') && (
              <div className="px-3 py-2" style={{
                background: PALETTE.panel,
                border: `1px solid ${PALETTE.panelBorder}`,
              }}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: PALETTE.textDim }}>◈ 은화</span>
                  <span style={{ color: PALETTE.dawn }}>{gold || 0}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: PALETTE.textDim }}>◆ 보석</span>
                  <span style={{ color: PALETTE.twilight }}>{gem || 0}</span>
                </div>
              </div>
            )}
            
            {/* 보유 유물 (클릭 가능) */}
            <button
              onClick={() => setModal('relics')}
              className="px-3 py-2 text-left transition-all hover:scale-[1.02]"
              style={{
                background: PALETTE.panel,
                border: `1px solid ${PALETTE.legendary}40`,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: PALETTE.textDim }}>◇ 보유 유물</span>
                <span style={{ color: PALETTE.legendary }}>
                  {(relics || []).length}개 ▸
                </span>
              </div>
            </button>
            
            {/* 보유 패시브 (클릭 가능) */}
            <button
              onClick={() => setModal('skills')}
              className="px-3 py-2 text-left transition-all hover:scale-[1.02]"
              style={{
                background: PALETTE.panel,
                border: `1px solid ${PALETTE.dawn}40`,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: PALETTE.textDim }}>★ 패시브</span>
                <span style={{ color: PALETTE.dawn }}>
                  {ownedSkills.length}종 ▸
                </span>
              </div>
              {ultimates && ultimates.length > 0 && (
                <div className="text-[10px] mt-1" style={{ color: PALETTE.legendary }}>
                  ✦ 궁극 {ultimates.length}개
                </div>
              )}
            </button>
            
            {/* 저주 (있을 때만) */}
            {curses && curses.length > 0 && (
              <button
                onClick={() => setModal('curses')}
                className="px-3 py-2 text-left transition-all hover:scale-[1.02]"
                style={{
                  background: `${PALETTE.accent}10`,
                  border: `1px solid ${PALETTE.accent}60`,
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: PALETTE.accent }}>☠ 저주</span>
                  <span style={{ color: PALETTE.accent }}>
                    {curses.length}개 ▸
                  </span>
                </div>
              </button>
            )}
          </>
        )}
        
        {/* 안내 */}
        <div className="text-[9px] text-center pt-2" style={{ color: PALETTE.textDim, opacity: 0.5 }}>
          항목 클릭 시 상세 표시
        </div>
      </div>
      
      {/* 상세 모달 — fixed로 화면 전체 가운데에 표시 */}
      {modal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setModal(null)}
        >
          <div 
            className="w-full max-w-md max-h-[85vh] flex flex-col"
            style={{
              background: PALETTE.panel,
              border: `2px solid ${
                modal === 'relics' ? PALETTE.legendary :
                modal === 'skills' ? PALETTE.dawn :
                modal === 'curses' ? PALETTE.accent :
                PALETTE.panelBorder
              }`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between" style={{ 
              borderBottom: `1px solid ${PALETTE.panelBorder}` 
            }}>
              <div>
                <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>
                  ◆ 상세 정보
                </div>
                <div className="text-base font-bold mt-0.5" style={{ 
                  color: modal === 'relics' ? PALETTE.legendary :
                         modal === 'skills' ? PALETTE.dawn :
                         modal === 'curses' ? PALETTE.accent :
                         PALETTE.text,
                  fontFamily: '"Cinzel", serif',
                }}>
                  {modal === 'relics' && '보유 유물'}
                  {modal === 'skills' && '보유 패시브'}
                  {modal === 'curses' && '활성 저주'}
                </div>
              </div>
              <button 
                onClick={() => setModal(null)} 
                className="text-lg px-2"
                style={{ color: PALETTE.textDim, background: 'transparent' }}
              >✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {/* 유물 */}
              {modal === 'relics' && (
                <>
                  {(!relics || relics.length === 0) ? (
                    <div className="text-center py-8 text-sm" style={{ color: PALETTE.textDim }}>
                      아직 획득한 유물이 없습니다
                    </div>
                  ) : (
                    relics.map((relic, i) => (
                      <div key={i} className="px-3 py-2" style={{
                        background: `${PALETTE.legendary}10`,
                        border: `1px solid ${PALETTE.legendary}40`,
                      }}>
                        <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>
                          {relic.name}
                        </div>
                        {relic.desc && (
                          <div className="text-[10px] mt-1" style={{ color: PALETTE.text }}>
                            {relic.desc}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
              
              {/* 패시브 */}
              {modal === 'skills' && (
                <>
                  {ownedSkills.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: PALETTE.textDim }}>
                      보유한 패시브가 없습니다
                    </div>
                  ) : (
                    <>
                      {ultimates && ultimates.length > 0 && (
                        <div className="mb-3">
                          <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: PALETTE.legendary }}>
                            ✦ 궁극기
                          </div>
                          {ultimates.map((ult, i) => (
                            <div key={i} className="px-3 py-2 mb-2" style={{
                              background: `${PALETTE.legendary}15`,
                              border: `1px solid ${PALETTE.legendary}80`,
                            }}>
                              <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>
                                {typeof ult === 'string' ? ult : ult.id || ult.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: PALETTE.dawn }}>
                        ★ 패시브 ({ownedSkills.length}종)
                      </div>
                      {ownedSkills.map((s, i) => {
                        const def = PASSIVE_SKILLS[s.name];
                        return (
                          <div key={i} className="px-3 py-2" style={{
                            background: PALETTE.bgDeep,
                            border: `1px solid ${def?.color || PALETTE.dawn}40`,
                          }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold" style={{ color: def?.color || PALETTE.dawn }}>
                                {s.name}
                              </span>
                              <span className="text-[11px] px-2 py-0.5" style={{
                                background: `${def?.color || PALETTE.dawn}25`,
                                color: def?.color || PALETTE.dawn,
                              }}>
                                Lv.{s.lv}
                              </span>
                            </div>
                            {def?.axis && (
                              <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
                                {def.axis === 'attack' ? '공격' : 
                                 def.axis === 'defense' ? '방어' : 
                                 def.axis === 'utility' ? '유틸' : def.axis}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
              
              {/* 저주 */}
              {modal === 'curses' && (
                <>
                  {(!curses || curses.length === 0) ? (
                    <div className="text-center py-8 text-sm" style={{ color: PALETTE.textDim }}>
                      활성 저주가 없습니다
                    </div>
                  ) : (
                    curses.map((curse, i) => (
                      <div key={i} className="px-3 py-2" style={{
                        background: `${PALETTE.accent}10`,
                        border: `1px solid ${PALETTE.accent}60`,
                      }}>
                        <div className="text-[12px] font-bold" style={{ color: PALETTE.accent }}>
                          ☠ {curse.name || curse.id || curse}
                        </div>
                        {curse.desc && (
                          <div className="text-[10px] mt-1" style={{ color: PALETTE.text }}>
                            {curse.desc}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
            
            <div className="px-3 py-2" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
              <button 
                onClick={() => setModal(null)} 
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
      )}
    </>
  );
}
