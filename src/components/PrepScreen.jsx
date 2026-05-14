// ============================================
// components/PrepScreen.jsx — 전투 준비 화면 (패시브 + 유물 + 액티브 스킬)
// ============================================
// 패시브 카드: 클릭 즉시 활성/해제 토글 (빠른 빌드 셀렉션). 정보 확인은 도감.
// 유물·액티브 스킬 카드: 클릭 시 정보 모달, 모달 내부 버튼으로 토글.
// 자동 통과 모드(보유 ≤ 최대)에서는 모든 카드가 활성, 토글 버튼이 표시되지 않음.
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS, PREP_CONFIG } from '../data.js';
import CardInfoModal, { buildPassiveInfo, buildRelicInfo, buildActiveSkillInfo } from './CardInfoModal.jsx';

export default function PrepScreen({ classData, skills, relics, ultimates, expedition, mode = 'full', currentActiveSkills = null, currentActiveRelicNames = null, onConfirm }) {
  // Lv > 0 인 보유 패시브 목록
  const ownedSkills = Object.entries(skills)
    .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
    .map(([n]) => n);

  const maxSkillSelect = PREP_CONFIG.maxSkillSelect;
  const maxRelicSelect = expedition?.maxRelicSelect || 1;

  const showSkills = mode === 'full' || mode === 'skills';
  const showRelics = mode === 'full' || mode === 'relics';
  // 액티브 스킬 섹션: full 모드에서만 표시 (재선택 모드는 패시브/유물 전용)
  const showActives = mode === 'full' && classData && Array.isArray(classData.combatSkills);

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
  // modalState = { kind: 'passive'|'relic'|'active', name?, rel? }
  const [modalState, setModalState] = useState(null);

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

  // 모달용 info + action 빌더
  let modalInfo = null;
  let modalAction = null;
  if (modalState?.kind === 'passive') {
    const name = modalState.name;
    modalInfo = buildPassiveInfo(name, skills[name] || 0);
    if (showSkills && !skillsAutoPass) {
      const isSelected = selectedSkills.has(name);
      const canSelect = isSelected || selectedSkills.size < maxSkillSelect;
      modalAction = {
        label: isSelected ? '선택 해제' : (canSelect ? '활성화' : '슬롯 가득 참'),
        disabled: !isSelected && !canSelect,
        color: modalInfo?.color,
        onClick: () => { toggleSkill(name); setModalState(null); },
      };
    }
  } else if (modalState?.kind === 'relic') {
    const rel = modalState.rel;
    modalInfo = buildRelicInfo(rel);
    if (showRelics && !relicsAutoPass && rel) {
      const isSelected = selectedRelics.has(rel.name);
      const canSelect = isSelected || selectedRelics.size < maxRelicSelect;
      modalAction = {
        label: isSelected ? '선택 해제' : (canSelect ? '활성화' : '슬롯 가득 참'),
        disabled: !isSelected && !canSelect,
        color: modalInfo?.color,
        onClick: () => { toggleRelic(rel.name); setModalState(null); },
      };
    }
  } else if (modalState?.kind === 'active') {
    modalInfo = buildActiveSkillInfo(modalState.name, classData?.color);
  }

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
                return (
                  <button key={name} onClick={() => toggleSkill(name)}
                    className="text-left px-2.5 py-2 transition-all"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${sk.color}30, ${sk.color}10)`
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected
                        ? `1.5px solid ${sk.color}`
                        : `1px solid ${PALETTE.panelBorder}`,
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
          {showSkills && !skillsAutoPass && ownedSkills.length > 0 && (
            <p className="text-[10px] mt-1.5 text-center" style={{ color: PALETTE.textDim }}>
              카드를 눌러 활성/해제
            </p>
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
                return (
                  <button key={i} onClick={() => setModalState({ kind: 'relic', rel })}
                    className="w-full text-left px-3 py-2 transition-all"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${rel.color}30, ${rel.color}10)`
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected
                        ? `1.5px solid ${rel.color}`
                        : `1px solid ${PALETTE.panelBorder}`,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold" style={{ color: isSelected ? rel.color : PALETTE.text }}>
                        {rel.name}
                      </span>
                      <span className="text-[10px] truncate max-w-[160px]" style={{ color: PALETTE.textDim }}>
                        {rel.desc || ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {showRelics && !relicsAutoPass && relics.length > 0 && (
            <p className="text-[10px] mt-1.5 text-center" style={{ color: PALETTE.textDim }}>
              카드를 눌러 정보를 확인하고 모달에서 활성/해제
            </p>
          )}
        </div>
        )}

        {showActives && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[11px] tracking-[0.3em]" style={{ color: classData.color }}>
              ◇ 액티브 스킬
            </div>
            <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
              직업 고유 ({classData.combatSkills.length}개)
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {classData.combatSkills.map(name => {
              const sk = COMBAT_SKILLS[name];
              if (!sk) return null;
              const typeLabel = sk.type === 'physical' ? '물리' : sk.type === 'magic' ? '마법' : sk.type === 'defense' ? '방어' : '';
              return (
                <button key={name} onClick={() => setModalState({ kind: 'active', name })}
                  className="text-left px-2 py-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${classData.color}20, ${classData.color}05)`,
                    border: `1px solid ${classData.color}80`,
                  }}>
                  <div className="text-[12px] font-bold mb-0.5" style={{ color: PALETTE.text }}>
                    {sk.name || name}
                  </div>
                  <div className="text-[9px]" style={{ color: PALETTE.textDim }}>
                    {typeLabel}
                    {typeof sk.cd === 'number' && sk.cd > 0 ? ` · CD ${sk.cd}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
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

      {modalInfo && (
        <CardInfoModal info={modalInfo} action={modalAction} onClose={() => setModalState(null)} />
      )}
    </div>
  );
}

// =========== 출정 화면 ===========
// 직업 선택 확정 후 표시. 탭하면 원정 선택 화면으로.
