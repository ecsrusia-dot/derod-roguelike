// ============================================
// components/StatusPanel.jsx — 상태창 (능력치, 패시브, 유물, 액티브 스킬)
// ============================================
// 패시브/유물/액티브 스킬 카드는 클릭 시 CardInfoModal로 상세 정보 표시.
// 전투 중에도 상태창에서 직업 액티브 스킬을 확인할 수 있도록 포함.
// ============================================

import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { PALETTE, getCharismaHealBonus, getCharismaDmgReduction } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS, ULTIMATE_SKILLS } from '../data.js';
import CardInfoModal, { buildPassiveInfo, buildRelicInfo, buildActiveSkillInfo } from './CardInfoModal.jsx';

export default function StatusPanel({ classData, hp, maxHp, skills, stats, relics, ultimates = [], activeSkills = null, activeRelicNames = null, onClose }) {
  const skillsByAxis = { attack: [], defense: [], utility: [] };
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv > 0 && PASSIVE_SKILLS[name]) {
      skillsByAxis[PASSIVE_SKILLS[name].axis].push({ name, lv, ...PASSIVE_SKILLS[name] });
    }
  });
  const axisNames = { attack: '공격', defense: '방어', utility: '유틸' };
  // modalState = { kind: 'passive'|'relic'|'active', name?, rel? }
  const [modalState, setModalState] = useState(null);

  let modalInfo = null;
  if (modalState?.kind === 'passive') {
    modalInfo = buildPassiveInfo(modalState.name, skills[modalState.name] || 0);
  } else if (modalState?.kind === 'relic') {
    modalInfo = buildRelicInfo(modalState.rel);
  } else if (modalState?.kind === 'active') {
    modalInfo = buildActiveSkillInfo(modalState.name, classData?.color);
  }

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>◆ 캐릭터 정보 ◆</span>
        <button onClick={onClose}><X size={16} style={{ color: PALETTE.textDim }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b" style={{
          background: `linear-gradient(180deg, ${classData.color}20, transparent)`,
          borderColor: PALETTE.panelBorder,
        }}>
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 flex items-center justify-center text-2xl font-bold" style={{
              background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.dawn}`,
            }}>{classData.name[0]}</div>
            <div className="flex-1">
              <div className="text-[10px] tracking-[0.2em]" style={{ color: classData.color }}>{classData.sub}</div>
              <div className="text-base font-bold mb-1" style={{ color: PALETTE.text }}>{classData.name}</div>
              <div className="flex items-center gap-1">
                <Heart size={11} style={{ color: PALETTE.accent }} />
                <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>{hp}/{maxHp}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
            {Object.entries(stats).filter(([k]) => ['근력', '민첩', '지능', '매력'].includes(k)).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
              </div>
            ))}
          </div>
          {/* 매력 시그니처 효과 — 사제 정체성 (모든 직업이 매력 보석으로 효과 획득 가능) */}
          {(() => {
            const healPct = getCharismaHealBonus(stats);
            const reducePct = getCharismaDmgReduction(stats);
            if (healPct <= 0 && reducePct <= 0) return null;
            return (
              <div className="mt-2 pt-2 border-t flex items-center justify-center gap-3 text-[10px]" style={{ borderColor: `${classData.color}20` }}>
                <span style={{ color: PALETTE.textDim }}>◇ 매력 시그니처</span>
                {healPct > 0 && (
                  <span style={{ color: PALETTE.green }}>회복 <span className="font-bold tabular-nums">+{healPct}%</span></span>
                )}
                {reducePct > 0 && (
                  <span style={{ color: PALETTE.dawn }}>받는뎀 <span className="font-bold tabular-nums">-{reducePct}%</span></span>
                )}
              </div>
            );
          })()}
        </div>

        {/* 액티브 스킬 — 카드 클릭 시 정보 모달 (전투 중에도 확인 가능) */}
        {classData && Array.isArray(classData.combatSkills) && classData.combatSkills.length > 0 && (
          <div className="px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: classData.color }}>◆ 액티브 스킬</div>
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

        <div className="px-4 py-3">
          <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.dawn }}>◆ 패시브 스킬</div>
          {Object.entries(skillsByAxis).map(([axis, list]) => (
            list.length > 0 && (
              <div key={axis} className="mb-3">
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>{axisNames[axis]} 축</div>
                <div className="space-y-1.5">
                  {list.map(sk => {
                    const isSealed = activeSkills && !activeSkills.includes(sk.name);
                    return (
                      <button key={sk.name}
                        onClick={() => setModalState({ kind: 'passive', name: sk.name })}
                        className="w-full text-left px-3 py-2"
                        style={{
                          background: `${sk.color}10`,
                          border: `1px solid ${sk.color}40`,
                          opacity: isSealed ? 0.5 : 1,
                        }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: sk.color }}>{sk.name}</span>
                            <span className="text-[10px] px-1.5" style={{
                              background: `${sk.color}30`, color: sk.color,
                            }}>Lv.{sk.lv} / {sk.maxLv}</span>
                            {isSealed && (
                              <span className="text-[9px] px-1.5 py-0.5" style={{
                                background: `${PALETTE.twilight}30`, color: PALETTE.twilight,
                                letterSpacing: '0.1em',
                              }}>봉인</span>
                            )}
                          </div>
                        </div>
                        <div className="h-1" style={{ background: PALETTE.bgDeep }}>
                          <div className="h-full transition-all" style={{
                            width: `${(sk.lv / sk.maxLv) * 100}%`, background: sk.color,
                          }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ))}
          <p className="text-[10px] text-center mt-1" style={{ color: PALETTE.textDim }}>
            카드를 눌러 누적 효과 및 마일스톤을 확인하세요
          </p>
        </div>
        {ultimates.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.legendary }}>★ 각성 스킬</div>
            <div className="space-y-1.5">
              {ultimates.map((ultId, i) => {
                let ultData = null;
                let skillName = '';
                for (const sn in ULTIMATE_SKILLS) {
                  const found = ULTIMATE_SKILLS[sn].find(u => u.id === ultId);
                  if (found) { ultData = found; skillName = sn; break; }
                }
                if (!ultData) return null;
                return (
                  <div key={i} className="px-3 py-2" style={{
                    background: `${ultData.color}15`,
                    border: `1px solid ${ultData.color}`,
                    boxShadow: `0 0 8px ${ultData.color}40`,
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: PALETTE.legendary }}>★</span>
                      <span className="text-[12px] font-bold" style={{ color: ultData.color }}>{ultData.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5" style={{
                        background: `${PALETTE.legendary}30`, color: PALETTE.legendary,
                        letterSpacing: '0.1em',
                      }}>ULT</span>
                    </div>
                    <div className="text-[10px] leading-snug whitespace-pre-line" style={{ color: PALETTE.textDim }}>
                      {skillName} · {ultData.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {relics.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.dawn }}>◆ 보유 유물</div>
            <div className="space-y-1.5">
              {relics.map((r, i) => {
                const isSealed = activeRelicNames && !activeRelicNames.includes(r.name);
                return (
                  <button key={i}
                    onClick={() => setModalState({ kind: 'relic', rel: r })}
                    className="w-full text-left px-3 py-2 flex items-center gap-2"
                    style={{
                      background: `${r.color}10`,
                      border: `1px solid ${r.color}40`,
                      opacity: isSealed ? 0.5 : 1,
                    }}>
                    <span className="text-base" style={{ color: r.color }}>◆</span>
                    <div className="flex-1">
                      <div className="text-[12px] font-bold flex items-center gap-2" style={{ color: PALETTE.text }}>
                        {r.name}
                        {isSealed && (
                          <span className="text-[9px] px-1.5 py-0.5" style={{
                            background: `${PALETTE.twilight}30`, color: PALETTE.twilight,
                            letterSpacing: '0.1em',
                          }}>봉인</span>
                        )}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: PALETTE.textDim }}>
                        {r.desc || ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalInfo && (
        <CardInfoModal info={modalInfo} onClose={() => setModalState(null)} />
      )}
    </div>
  );
}
