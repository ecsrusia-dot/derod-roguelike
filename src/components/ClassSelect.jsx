// ============================================
// components/ClassSelect.jsx — 직업 선택 + 스킬 정보 모달
// ============================================

import React, { useState } from 'react';
import { PALETTE, isUnlocked } from '../utils/helpers.js';
import { CLASSES, PASSIVE_SKILLS } from '../data.js';
import { isChampionshipClassUnlocked } from '../storage.js';

export default function ClassSelect({ meta, selected, onSelect, onNext, onBack, isChampionship = false }) {
  const cls = CLASSES[selected]; 
  // 잠금 기준:
  // - 챔피언십: isChampionshipClassUnlocked 사용
  // - 일반: 직업 자체의 locked + unlockId
  const isClsLocked = (c, i) => {
    if (isChampionship) {
      // 챔피언십은 수련의 길 클리어 여부로 판단
      return !isChampionshipClassUnlocked(meta, i);
    }
    return c.locked && !isUnlocked(meta, c.unlockId);
  };
  const clsLocked = isClsLocked(cls, selected);
  const [skillModal, setSkillModal] = useState(null);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 1. 상단 직업 아이콘 선택 바 */}
      <div className="px-4 pt-6 pb-3">
        <p className="text-center text-[11px] tracking-[0.4em] mb-3" style={{ color: PALETTE.textDim }}>
          ◆ 직업을 선택하세요 ◆
        </p>
        <div className="flex gap-1.5">
          {CLASSES.map((c, i) => {
            const lk = isClsLocked(c, i);
            return (
              <button key={c.id} onClick={() => onSelect(i)}
                className="flex-1 aspect-square flex items-center justify-center transition-all"
                style={{
                  background: selected === i ? `linear-gradient(135deg, ${c.color}30, ${c.color}10)` : 'rgba(255,255,255,0.02)',
                  border: selected === i ? `1.5px solid ${c.color}` : `1px solid ${PALETTE.panelBorder}`,
                  opacity: lk ? 0.45 : 1,
                }}>
                <span className="text-xl" style={{ color: selected === i ? c.color : PALETTE.textDim }}>
                  {lk ? '🔒' : (selected === i ? '◆' : '+')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 중앙 직업 상세 정보 영역 */}
      <div className="flex-1 px-6 py-3 overflow-hidden">
        <div className="h-full relative overflow-hidden" style={{
          background: PALETTE.bgDeep,
          border: `1px solid ${cls.color}60`,
        }}>
          
          {/* 캐릭터 삽화 레이어 */}
          <div className="absolute inset-0 z-0">
             <img 
               src={cls.image} 
               alt={cls.name}
               className="w-full h-full object-cover" // ★ opacity 제거하여 원본 밝기 유지
               onError={(e) => { e.target.style.display = 'none'; }} 
             />
             {/* ★ 하단 텍스트 가독성을 위한 부분 그라데이션 수정 */}
             <div className="absolute inset-0" style={{
               background: `linear-gradient(to bottom, 
                 transparent 0%, 
                 transparent 50%, 
                 ${PALETTE.bgDeep}cc 75%, 
                 ${PALETTE.bgDeep} 100%)`
             }} />
          </div>

          {/* 정보 텍스트 영역 (최상단 z-10) */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-center z-10">
            <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: cls.color }}>{cls.sub}</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: cls.color, textShadow: `0 0 20px ${cls.color}80` }}>
              {cls.name}
            </h2>
            <p className="text-xs leading-relaxed mb-3" style={{ color: PALETTE.text }}>{cls.desc}</p>
            
            <div className="text-[11px] mb-2 flex flex-wrap justify-center gap-1.5">
              {Object.entries(cls.startSkills).map(([k, v]) => (
                <button 
                  key={k} 
                  onClick={() => setSkillModal({ name: k, startLv: v })}
                  className="px-2 py-0.5 transition-all hover:scale-105 active:scale-95" 
                  style={{
                    background: `${PASSIVE_SKILLS[k].color}30`,
                    color: PASSIVE_SKILLS[k].color,
                    border: `1px solid ${PASSIVE_SKILLS[k].color}60`,
                    cursor: 'pointer',
                  }}
                >{k} Lv.{v} <span style={{ opacity: 0.6, fontSize: '9px' }}>ⓘ</span></button>
              ))}
            </div>

            <div className="flex justify-around pt-2 border-t" style={{ borderColor: `${cls.color}30` }}>
              {Object.entries(cls.stats).map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                  <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 하단 버튼 영역 */}
      <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`,
          color: PALETTE.textDim, letterSpacing: '0.2em', fontSize: '13px',
        }}>◂ 이전</button>
        <button onClick={onNext} disabled={clsLocked} className="py-3" style={{
          background: clsLocked 
            ? `${PALETTE.panel}` 
            : `linear-gradient(180deg, ${cls.color}40, ${cls.color}20)`,
          border: `1px solid ${clsLocked ? PALETTE.panelBorder : cls.color}`,
          color: clsLocked ? PALETTE.textDim : PALETTE.text,
          letterSpacing: '0.2em', fontSize: '13px',
        }}>{clsLocked ? '🔒 잠김' : '확정 ▸'}</button>
      </div>
      
      {/* 스킬 정보 모달 */}
      {skillModal && (() => {
        const sk = PASSIVE_SKILLS[skillModal.name];
        if (!sk) return null;
        return (
          <div 
            className="absolute inset-0 flex items-center justify-center px-4 z-50" 
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setSkillModal(null)}
          >
            <div 
              className="w-full max-w-sm p-5" 
              style={{
                background: PALETTE.panel,
                border: `2px solid ${sk.color}`,
                boxShadow: `0 0 30px ${sk.color}60`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: `1px solid ${sk.color}40` }}>
                <div>
                  <div className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>
                    {sk.classOnly ? '◆ 직업 전용' : sk.axis === 'attack' ? '◆ 공격형' : sk.axis === 'defense' ? '◆ 방어형' : '◆ 특수'}
                  </div>
                  <div className="text-base font-bold" style={{ color: sk.color }}>
                    {skillModal.name}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
                    시작 Lv.{skillModal.startLv} · 최대 Lv.{sk.maxLv}
                  </div>
                </div>
                <button 
                  onClick={() => setSkillModal(null)} 
                  className="text-lg px-2 py-0.5"
                  style={{ color: PALETTE.textDim, background: 'transparent' }}
                >✕</button>
              </div>
              
              {/* 설명 */}
              <p className="text-[11px] mb-3 italic" style={{ color: PALETTE.text }}>
                {sk.desc}
              </p>
              
              {/* minorEffect */}
              <div className="mb-3 px-3 py-2" style={{ 
                background: `${sk.color}15`, border: `1px solid ${sk.color}40` 
              }}>
                <div className="text-[10px] tracking-[0.2em] mb-1" style={{ color: sk.color }}>
                  ◇ 기본 효과 (Lv마다 누적)
                </div>
                <div className="text-[11px]" style={{ color: PALETTE.text }}>
                  {sk.minorEffect?.desc || '없음'}
                </div>
              </div>
              
              {/* tier 효과 */}
              <div className="space-y-2">
                {[3, 5, 7].map(tier => {
                  const t = sk.tiers?.[tier];
                  if (!t) return null;
                  const isStartLv = skillModal.startLv >= tier;
                  return (
                    <div key={tier} className="px-3 py-2" style={{
                      background: isStartLv ? `${sk.color}25` : `${PALETTE.panel}80`,
                      border: `1px solid ${isStartLv ? sk.color : PALETTE.panelBorder}`,
                    }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold" style={{ 
                          color: isStartLv ? sk.color : PALETTE.textDim,
                          letterSpacing: '0.15em'
                        }}>Lv.{tier}</span>
                        {isStartLv && (
                          <span className="text-[8px] px-1" style={{ color: sk.color }}>● 시작 도달</span>
                        )}
                      </div>
                      <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.text }}>
                        {t.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 닫기 */}
              <button 
                onClick={() => setSkillModal(null)} 
                className="w-full mt-4 py-2 text-[11px] tracking-[0.2em]"
                style={{ 
                  background: 'transparent', 
                  border: `1px solid ${PALETTE.panelBorder}`,
                  color: PALETTE.textDim 
                }}
              >닫기</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
} // <--- 반드시 여기서 함수가 끝나는 닫는 중괄호가 있어야 합니다!

// =========== 챔피언십 난이도 선택 ===========
// 5원정 중 하나 선택 → 난이도 선택 (일반/하드/지옥/광기)
// 이전 난이도 클리어 시 다음 난이도 해금
