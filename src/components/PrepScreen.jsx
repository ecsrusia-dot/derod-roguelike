// ============================================
// components/PrepScreen.jsx — 전투 준비 화면 (패시브 + 유물 선택)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS, PREP_CONFIG } from '../data.js';

export default function PrepScreen({ skills, relics, ultimates, expedition, mode = 'full', currentActiveSkills = null, currentActiveRelicNames = null, onConfirm }) {
  // Lv > 0 인 보유 패시브 목록
  const ownedSkills = Object.entries(skills)
    .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
    .map(([n]) => n);
  
  const maxSkillSelect = PREP_CONFIG.maxSkillSelect;
  const maxRelicSelect = expedition?.maxRelicSelect || 1;
  
  const showSkills = mode === 'full' || mode === 'skills';
  const showRelics = mode === 'full' || mode === 'relics';
  
  // 보유 패시브가 max보다 적으면 자동 통과
  const skillsAutoPass = ownedSkills.length <= maxSkillSelect;
  // 보유 유물이 max보다 적으면 자동 통과
  const relicsAutoPass = relics.length <= maxRelicSelect;
  
  // 자동 통과면 모두 활성화. 비활성 영역은 기존 active 유지
  const initialSelectedSkills = !showSkills 
    ? new Set(currentActiveSkills || ownedSkills)
    : (skillsAutoPass ? new Set(ownedSkills) : new Set());
  const initialSelectedRelics = !showRelics
    ? new Set(currentActiveRelicNames || relics.map(r => r.name))
    : (relicsAutoPass ? new Set(relics.map(r => r.name)) : new Set());
  
  const [selectedSkills, setSelectedSkills] = useState(initialSelectedSkills);
  const [selectedRelics, setSelectedRelics] = useState(initialSelectedRelics);
  
  const toggleSkill = (name) => {
    if (skillsAutoPass || !showSkills) return;
    const newSet = new Set(selectedSkills);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else if (newSet.size < maxSkillSelect) {
      newSet.add(name);
    }
    setSelectedSkills(newSet);
  };
  
  const toggleRelic = (name) => {
    if (relicsAutoPass || !showRelics) return;
    const newSet = new Set(selectedRelics);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else if (newSet.size < maxRelicSelect) {
      newSet.add(name);
    }
    setSelectedRelics(newSet);
  };
  
  const skillsOk = !showSkills || skillsAutoPass || selectedSkills.size === maxSkillSelect;
  const relicsOk = !showRelics || relicsAutoPass || selectedRelics.size === maxRelicSelect || relics.length === 0;
  const canConfirm = skillsOk && relicsOk;
  
  const titleText = mode === 'skills' ? '패시브 재선택' :
                    mode === 'relics' ? '유물 재선택' : '전투 준비';
  const subText = mode === 'full' ? '이번 챕터 동안 활성화할 빌드를 선택합니다' :
                  mode === 'skills' ? '활성 패시브를 다시 고릅니다' : '활성 유물을 다시 고릅니다';
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-5 pb-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.dawn }}>
          ◆ {titleText} ◆
        </p>
        <p className="text-center text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
          {subText}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {showSkills && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>
              ◇ 활성 패시브
            </div>
            <div className="text-[10px]" style={{ 
              color: skillsAutoPass ? PALETTE.green : 
                     selectedSkills.size === maxSkillSelect ? PALETTE.green : PALETTE.textDim 
            }}>
              {skillsAutoPass ? `자동 (${ownedSkills.length}개)` : `${selectedSkills.size}/${maxSkillSelect}`}
            </div>
          </div>
          
          {ownedSkills.length === 0 ? (
            <div className="text-center py-4 text-[11px]" style={{ color: PALETTE.textDim }}>
              보유한 패시브가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {ownedSkills.map(name => {
                const sk = PASSIVE_SKILLS[name];
                const lv = skills[name];
                const isSelected = selectedSkills.has(name);
                const canSelect = skillsAutoPass || isSelected || selectedSkills.size < maxSkillSelect;
                return (
                  <button key={name} onClick={() => toggleSkill(name)}
                    disabled={!canSelect && !isSelected}
                    className="text-left px-2.5 py-2 transition-all"
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${sk.color}30, ${sk.color}10)`
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected 
                        ? `1.5px solid ${sk.color}`
                        : `1px solid ${PALETTE.panelBorder}`,
                      opacity: !canSelect && !isSelected ? 0.4 : 1,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold" style={{ color: isSelected ? sk.color : PALETTE.text }}>
                        {name}
                      </span>
                      <span className="text-[10px]" style={{ color: sk.color }}>Lv.{lv}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
        
        {showRelics && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.legendary }}>
              ◇ 활성 유물
            </div>
            <div className="text-[10px]" style={{ 
              color: relicsAutoPass ? PALETTE.green : 
                     selectedRelics.size === maxRelicSelect ? PALETTE.green : PALETTE.textDim 
            }}>
              {relicsAutoPass 
                ? (relics.length === 0 ? '없음' : `자동 (${relics.length}개)`)
                : `${selectedRelics.size}/${maxRelicSelect}`}
            </div>
          </div>
          
          {relics.length === 0 ? (
            <div className="text-center py-4 text-[11px]" style={{ color: PALETTE.textDim }}>
              보유한 유물이 없습니다
            </div>
          ) : (
            <div className="space-y-1.5">
              {relics.map((rel, i) => {
                const isSelected = selectedRelics.has(rel.name);
                const canSelect = relicsAutoPass || isSelected || selectedRelics.size < maxRelicSelect;
                return (
                  <button key={i} onClick={() => toggleRelic(rel.name)}
                    disabled={!canSelect && !isSelected}
                    className="w-full text-left px-3 py-2 transition-all"
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${rel.color}30, ${rel.color}10)`
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected 
                        ? `1.5px solid ${rel.color}`
                        : `1px solid ${PALETTE.panelBorder}`,
                      opacity: !canSelect && !isSelected ? 0.4 : 1,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold" style={{ color: isSelected ? rel.color : PALETTE.text }}>
                        {rel.name}
                      </span>
                      <span className="text-[10px]" style={{ color: PALETTE.textDim }}>
                        {rel.desc || ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
      
      <div className="p-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={() => onConfirm(Array.from(selectedSkills), Array.from(selectedRelics))}
          disabled={!canConfirm}
          className="w-full py-3 text-[12px] tracking-[0.3em]" style={{
            background: canConfirm 
              ? `linear-gradient(180deg, ${PALETTE.dawn}40, ${PALETTE.dawn}20)`
              : 'transparent',
            border: `1px solid ${canConfirm ? PALETTE.dawn : PALETTE.panelBorder}`,
            color: canConfirm ? PALETTE.text : PALETTE.textDim,
            opacity: canConfirm ? 1 : 0.5,
          }}>
          {canConfirm 
            ? (mode === 'full' ? '여정 시작 ▸' : '확정 ▸')
            : '필요 개수만큼 선택하세요'}
        </button>
      </div>
    </div>
  );
}

// =========== 출정 화면 ===========
// 직업 선택 확정 후 표시. 탭하면 원정 선택 화면으로.


