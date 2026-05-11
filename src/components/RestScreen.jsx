// ============================================
// components/RestScreen.jsx — 정비 화면 (보스 직전)
// ============================================

import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS } from '../data.js';

export default function RestScreen({ classData, hp, maxHp, skills, relics, expedition, onChoice, onClose }) {
  const ownedSkills = Object.entries(skills)
    .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
    .map(([n]) => n);
  const maxSkillSelect = PREP_CONFIG.maxSkillSelect;
  const maxRelicSelect = expedition?.maxRelicSelect || 1;
  const canReselectSkills = ownedSkills.length > maxSkillSelect;
  const canReselectRelics = relics.length > maxRelicSelect;

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

        <button onClick={() => onChoice({ type: 'heal', value: Math.floor(maxHp * 0.2) })}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{ background: `${PALETTE.green}20`, border: `1px solid ${PALETTE.green}` }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.green }}>◇ 휴식</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            최대 체력의 20% 회복 (+{Math.floor(maxHp * 0.2)})
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'reselect_skills' })}
          disabled={!canReselectSkills}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{
            background: canReselectSkills ? `${PALETTE.dawn}20` : 'transparent',
            border: `1px solid ${canReselectSkills ? PALETTE.dawn : PALETTE.panelBorder}`,
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
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{
            background: canReselectRelics ? `${PALETTE.legendary}20` : 'transparent',
            border: `1px solid ${canReselectRelics ? PALETTE.legendary : PALETTE.panelBorder}`,
            opacity: canReselectRelics ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.legendary }}>◇ 유물 재선택</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {canReselectRelics 
              ? `보유 유물 ${relics.length}개 中 ${maxRelicSelect}개 다시 선택`
              : `보유 유물이 ${maxRelicSelect}개 이하라 재선택 불필요`}
          </div>
        </button>
      </div>
    </div>
  );
}

// =========== 상점 ===========
