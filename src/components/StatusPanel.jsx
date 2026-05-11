// ============================================
// components/StatusPanel.jsx — 상태창 (능력치, 패시브, 유물)
// ============================================

import React, { useState } from 'react';
import { Heart, X, Lock, Check } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS, ULTIMATE_SKILLS } from '../data.js';

export default function StatusPanel({ classData, hp, maxHp, skills, stats, relics, ultimates = [], activeSkills = null, activeRelicNames = null, onClose }) {
  const skillsByAxis = { attack: [], defense: [], utility: [] };
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv > 0 && PASSIVE_SKILLS[name]) {
      skillsByAxis[PASSIVE_SKILLS[name].axis].push({ name, lv, ...PASSIVE_SKILLS[name] });
    }
  });
  const axisNames = { attack: '공격', defense: '방어', utility: '유틸' };

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
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.dawn }}>◆ 패시브 스킬</div>
          {Object.entries(skillsByAxis).map(([axis, list]) => (
            list.length > 0 && (
              <div key={axis} className="mb-3">
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>{axisNames[axis]} 축</div>
                <div className="space-y-1.5">
                  {list.map(sk => {
                    const tierKeys = Object.keys(sk.tiers).map(Number).sort();
                    const activeTiers = tierKeys.filter(t => t <= sk.lv);
                    const nextTier = tierKeys.find(t => t > sk.lv);
                    const isSealed = activeSkills && !activeSkills.includes(sk.name);
                    return (
                      <div key={sk.name} className="px-3 py-2" style={{
                        background: `${sk.color}10`, border: `1px solid ${sk.color}40`,
                        opacity: isSealed ? 0.4 : 1,
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
                        <div className="h-1 mb-2" style={{ background: PALETTE.bgDeep }}>
                          <div className="h-full transition-all" style={{
                            width: `${(sk.lv / sk.maxLv) * 100}%`, background: sk.color,
                          }} />
                        </div>
                        {/* minorEffect 누적 표시 */}
                        {sk.minorEffect && (
                          <div className="text-[10px] flex items-start gap-1.5 mb-1" style={{ color: sk.color, opacity: 0.85 }}>
                            <span style={{ flexShrink: 0, marginTop: '0px' }}>◇</span>
                            <span>
                              {sk.minorEffect.desc} 
                              <span style={{ color: PALETTE.text, marginLeft: '4px', fontWeight: 'bold' }}>
                                (현재 +{sk.minorEffect.perLv * sk.lv})
                              </span>
                            </span>
                          </div>
                        )}
                        {activeTiers.length > 0 && (
                          <div className="space-y-0.5">
                            {activeTiers.map(t => (
                              <div key={t} className="text-[10px] flex items-start gap-1.5" style={{ color: PALETTE.text }}>
                                <Check size={9} style={{ color: sk.color, flexShrink: 0, marginTop: '2px' }} />
                                <span>Lv.{t}: {sk.tiers[t].text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {nextTier && (
                          <div className="text-[10px] flex items-start gap-1.5 mt-1" style={{ color: PALETTE.textDim }}>
                            <Lock size={9} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>Lv.{nextTier}: {sk.tiers[nextTier].text}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
        {ultimates.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.legendary }}>★ 궁극 스킬</div>
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
                  <div key={i} className="px-3 py-2 flex items-center gap-2" style={{
                    background: `${r.color}10`, border: `1px solid ${r.color}40`,
                    opacity: isSealed ? 0.4 : 1,
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
                      <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
                        {r.desc || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
