// ============================================
// components/StatusPanel.jsx — 상태창 (능력치, 패시브, 유물, 액티브 스킬)
// ============================================
// 패시브/유물/액티브 스킬 카드는 클릭 시 CardInfoModal로 상세 정보 표시.
// 전투 중에도 상태창에서 직업 액티브 스킬을 확인할 수 있도록 포함.
// ============================================

import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { PALETTE, getCharismaHealBonus, getCharismaDmgReduction, getIntellectSoulBonus, getIntellectEtherBonus, getIfritIgniteRate } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS, ULTIMATE_SKILLS } from '../data.js';
import CardInfoModal, { buildPassiveInfo, buildRelicInfo, buildActiveSkillInfo } from './CardInfoModal.jsx';

export default function StatusPanel({ classData, hp, maxHp, skills, stats, derivedStats = null, relics, ultimates = [], activeSkills = null, activeRelicNames = null, onClose }) {
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
          {/* 지능 시그니처 효과 (1.32.0~) — 술법사 정체성. 1단계 지능 11+ / 2단계 지능 17+ */}
          {(() => {
            const soulBonus = getIntellectSoulBonus(stats);
            const etherBonus = getIntellectEtherBonus(stats);
            if (soulBonus <= 0 && etherBonus <= 0) return null;
            return (
              <div className="mt-1 flex items-center justify-center gap-3 text-[10px]">
                <span style={{ color: PALETTE.textDim }}>◇ 지능 시그니처</span>
                {soulBonus > 0 && (
                  <span style={{ color: PALETTE.legendary }}>마법 시 영혼 <span className="font-bold tabular-nums">+{soulBonus}</span></span>
                )}
                {etherBonus > 0 && (
                  <span style={{ color: '#5c4a8c' }}>시작 에테르 <span className="font-bold tabular-nums">+{etherBonus}</span></span>
                )}
              </div>
            );
          })()}
          {/* 파생 능력치 (1.31.0~) — 방어 무시/치명타율/회피율/마법딜/물리딜. 0인 항목은 숨김. */}
          {derivedStats && (() => {
            const items = [];
            if (derivedStats.armorIgnore > 0) items.push({ label: '방어 무시', value: `+${derivedStats.armorIgnore}`, color: PALETTE.accent });
            if (derivedStats.critRate > 0) items.push({ label: '치명타율', value: `+${derivedStats.critRate}%`, color: PALETTE.legendary });
            if (derivedStats.dodgeRate > 0) items.push({ label: '회피율', value: `+${derivedStats.dodgeRate}%`, color: PALETTE.green });
            if (derivedStats.magicDmgPct > 0) items.push({ label: '마법 딜', value: `+${derivedStats.magicDmgPct}%`, color: '#5c4a8c' });
            if (derivedStats.physDmg > 0) items.push({ label: '물리 딜', value: `+${derivedStats.physDmg}`, color: '#c4453d' });
            if (items.length === 0) return null;
            return (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: `${classData.color}20` }}>
                <div className="text-[9px] mb-1 text-center" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>◇ 파생 능력치</div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px]">
                  {items.map((it, i) => (
                    <span key={i}>
                      <span style={{ color: PALETTE.textDim }}>{it.label} </span>
                      <span className="font-bold tabular-nums" style={{ color: it.color }}>{it.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* 종합 효과 (1.36.0~) — 각인·유물·패시브 누적 보너스 한눈에 보기. 0인 항목은 숨김. */}
          {derivedStats && (() => {
            const items = [];
            // 공격·방어 가산
            if (derivedStats.physDmgPct > 0) items.push({ label: '물리 딜+', value: `+${derivedStats.physDmgPct}%`, color: '#c4453d' });
            if (derivedStats.dmgTakenPct > 0) items.push({ label: '받는 뎀', value: `+${derivedStats.dmgTakenPct}%`, color: PALETTE.accent });
            if (derivedStats.dmgTakenPct < 0) items.push({ label: '받는 뎀', value: `${derivedStats.dmgTakenPct}%`, color: PALETTE.green });
            if (derivedStats.afterDodgeDmg > 0) items.push({ label: '회피 후 딜', value: `+${derivedStats.afterDodgeDmg}%`, color: PALETTE.green });
            // 반격 계열
            if (derivedStats.counterRatePct !== 0) items.push({ label: '반격율', value: `${derivedStats.counterRatePct > 0 ? '+' : ''}${derivedStats.counterRatePct}%`, color: PALETTE.legendary });
            if (derivedStats.counterDmgPct !== 0) items.push({ label: '반격 뎀', value: `${derivedStats.counterDmgPct > 0 ? '+' : ''}${derivedStats.counterDmgPct}%`, color: PALETTE.legendary });
            if (derivedStats.counterHitSoul > 0) items.push({ label: '반격→영혼', value: `+${derivedStats.counterHitSoul}`, color: PALETTE.dawn });
            if (derivedStats.counterShock > 0) items.push({ label: '반격→충격', value: `+${derivedStats.counterShock}`, color: PALETTE.twilight });
            if (derivedStats.counterCanCrit) items.push({ label: '반격 치명', value: '가능', color: PALETTE.legendary });
            // 영혼 게이지 계열
            if (derivedStats.startSoul > 0) items.push({ label: '시작 영혼', value: `+${derivedStats.startSoul}`, color: PALETTE.dawn });
            if (derivedStats.perTurnSoul > 0) items.push({ label: '턴당 영혼', value: `+${derivedStats.perTurnSoul}`, color: PALETTE.dawn });
            if (derivedStats.dodgeSoul > 0) items.push({ label: '회피→영혼', value: `+${derivedStats.dodgeSoul}`, color: PALETTE.dawn });
            if (derivedStats.soulGainMult !== 0) items.push({ label: '영혼 획득', value: `×${(1 + derivedStats.soulGainMult).toFixed(2)}`, color: PALETTE.legendary });
            // 패널티 / 손실
            if (derivedStats.perTurnHpLoss > 0) items.push({ label: '턴당 HP', value: `-${derivedStats.perTurnHpLoss}`, color: PALETTE.accent });
            if (derivedStats.disableInsightPredict) items.push({ label: '심안 차단', value: 'ON', color: PALETTE.accent });
            // 술법사 화염 각인 발동율
            const ignite = getIfritIgniteRate(skills, ultimates, activeSkills);
            if (ignite.has) items.push({ label: '화염 각인', value: `${ignite.rate}%`, color: '#d97706' });
            if (items.length === 0) return null;
            return (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: `${classData.color}20` }}>
                <div className="text-[9px] mb-1 text-center" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>◇ 종합 효과 (각인·유물·패시브 누적)</div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px]">
                  {items.map((it, i) => (
                    <span key={i}>
                      <span style={{ color: PALETTE.textDim }}>{it.label} </span>
                      <span className="font-bold tabular-nums" style={{ color: it.color }}>{it.value}</span>
                    </span>
                  ))}
                </div>
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
