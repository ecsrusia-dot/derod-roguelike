// ============================================
// components/RestScreen.jsx — 정비 화면 (보스 직전)
// ============================================
// 휴식/패시브 재선택/유물 재선택 + 직업 액티브 스킬 카드(클릭 → 정보 모달)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS, PREP_CONFIG } from '../data.js';
import CardInfoModal, { buildActiveSkillInfo } from './CardInfoModal.jsx';
import BuildSummaryPanel from './BuildSummaryPanel.jsx';

export default function RestScreen({ classData, hp, maxHp, skills, stats = {}, activeSkills = null, activeRelicNames = null, relics, ultimates = [], engravingFx = {}, meta = null, expedition, onChoice, onClose }) {
  const ownedSkills = Object.entries(skills)
    .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
    .map(([n]) => n);
  const maxSkillSelect = PREP_CONFIG.maxSkillSelect;
  const maxRelicSelect = expedition?.maxRelicSelect || 1;
  const canReselectSkills = ownedSkills.length > maxSkillSelect;
  const canReselectRelics = relics.length > maxRelicSelect;
  const [modalSkill, setModalSkill] = useState(null);
  // 1.48.0~ BuildSummaryPanel 출처 분해 모달용
  const [breakdownInfo, setBreakdownInfo] = useState(null);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>◆ 정비 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>보스 직전</span>
      </div>
      <div className="flex-1 px-5 py-5 space-y-3 overflow-y-auto" style={{
        background: `radial-gradient(ellipse at center top, ${PALETTE.dawn}15, ${PALETTE.bgDeep} 70%)`,
      }}>
        <p className="text-xs leading-relaxed italic mb-4" style={{ color: PALETTE.textDim }}>
          앞에 있을 적은 강력하다. 마지막 정비를 해야 할 시간.<br/>
          단 한 가지만 선택할 수 있다.
        </p>

        {/* 1.48.0~ 빌드 요약 패널 — 정비 직전 현재 빌드 상태 검증용 (정적) */}
        <BuildSummaryPanel
          classData={classData}
          stats={stats}
          skills={skills}
          activeSkills={activeSkills}
          relics={relics}
          activeRelicNames={activeRelicNames}
          ultimates={ultimates}
          engravingFx={engravingFx}
          meta={meta}
          onLineClick={(info) => setBreakdownInfo(info)}
        />

        <button onClick={() => onChoice({ type: 'heal', value: Math.floor(maxHp * 0.2) })}
          className="ui-press w-full text-left px-4 py-3 transition-all"
          style={{ borderRadius: 13, background: `${PALETTE.green}20`, border: `1px solid ${PALETTE.green}99`, boxShadow: `0 0 14px -6px ${PALETTE.green}66` }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.green }}>◇ 휴식</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            최대 체력의 20% 회복 (+{Math.floor(maxHp * 0.2)})
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'reselect_skills' })}
          disabled={!canReselectSkills}
          className="ui-press w-full text-left px-4 py-3 transition-all"
          style={{
            borderRadius: 13,
            background: canReselectSkills ? `${PALETTE.dawn}20` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${canReselectSkills ? `${PALETTE.dawn}99` : 'var(--ui-line)'}`,
            opacity: canReselectSkills ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.dawn }}>◇ 패시브 재선택</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {canReselectSkills
              ? `보유 패시브 ${ownedSkills.length}개 中 ${maxSkillSelect}개 다시 선택`
              : `보유 패시브가 ${maxSkillSelect}개 이하라 재선택 불필요`}
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'reselect_relics' })}
          disabled={!canReselectRelics}
          className="ui-press w-full text-left px-4 py-3 transition-all"
          style={{
            borderRadius: 13,
            background: canReselectRelics ? `${PALETTE.legendary}20` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${canReselectRelics ? `${PALETTE.legendary}99` : 'var(--ui-line)'}`,
            opacity: canReselectRelics ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.legendary }}>◇ 유물 재선택</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {canReselectRelics
              ? `보유 유물 ${relics.length}개 中 ${maxRelicSelect}개 다시 선택`
              : `보유 유물이 ${maxRelicSelect}개 이하라 재선택 불필요`}
          </div>
        </button>

        {/* 직업 액티브 스킬 — 클릭 시 정보 모달 (참고용) */}
        {classData && Array.isArray(classData.combatSkills) && classData.combatSkills.length > 0 && (
          <div className="pt-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-[11px] tracking-[0.3em]" style={{ color: classData.color }}>
                ◇ 액티브 스킬
              </div>
              <div className="text-[10px]" style={{ color: PALETTE.textDim }}>참고</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {classData.combatSkills.map(name => {
                const sk = COMBAT_SKILLS[name];
                if (!sk) return null;
                const typeLabel = sk.type === 'physical' ? '물리' : sk.type === 'magic' ? '마법' : sk.type === 'defense' ? '방어' : '';
                return (
                  <button key={name} onClick={() => setModalSkill(name)}
                    className="ui-press text-left px-2 py-2 transition-all"
                    style={{
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${classData.color}20, ${classData.color}05)`,
                      border: `1px solid ${classData.color}66`,
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

      {modalSkill && (
        <CardInfoModal
          info={buildActiveSkillInfo(modalSkill, classData?.color)}
          onClose={() => setModalSkill(null)}
        />
      )}
      {breakdownInfo && (
        <CardInfoModal info={breakdownInfo} onClose={() => setBreakdownInfo(null)} />
      )}
    </div>
  );
}

// =========== 상점 ===========
