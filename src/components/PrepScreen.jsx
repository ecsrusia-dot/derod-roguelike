// ============================================
// components/PrepScreen.jsx — 전투 준비 화면 (패시브 + 유물 + 액티브 스킬)
// ============================================

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS, PREP_CONFIG } from '../data.js';

// 카드별 정보 모달 — 패시브/유물/액티브 스킬 공용
function CardInfoModal({ info, onClose }) {
  if (!info) return null;
  const accent = info.color || PALETTE.dawn;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-4 z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col"
        style={{
          background: PALETTE.panel,
          border: `2px solid ${accent}`,
          boxShadow: `0 0 30px ${accent}50`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${accent}40` }}>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>{info.tag}</div>
            <div className="text-base font-bold mt-0.5" style={{ color: accent, fontFamily: '"Cinzel", serif' }}>
              {info.title}
            </div>
          </div>
          {info.badge && (
            <div className="text-[11px] px-2 py-0.5 ml-2" style={{
              color: accent, border: `1px solid ${accent}80`, background: `${accent}15`,
            }}>{info.badge}</div>
          )}
        </div>

        <div className="px-4 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {info.subtitle && (
            <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>
              {info.subtitle}
            </div>
          )}
          {info.stats && info.stats.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {info.stats.map(([k, v], i) => (
                <div key={i} className="px-2 py-1 text-[10px] flex items-center justify-between" style={{
                  background: `${accent}10`, border: `1px solid ${accent}30`,
                }}>
                  <span style={{ color: PALETTE.textDim }}>{k}</span>
                  <span style={{ color: PALETTE.text }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {info.lines && info.lines.length > 0 && (
            <div className="space-y-1.5">
              {info.lines.map((line, i) => (
                <div key={i} className="text-[11px] leading-relaxed whitespace-pre-line px-3 py-2" style={{
                  color: PALETTE.text, background: `${accent}08`, border: `1px solid ${accent}25`,
                }}>{line}</div>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-3" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-[12px] tracking-[0.2em] font-bold"
            style={{
              background: `linear-gradient(180deg, ${accent}40, ${accent}20)`,
              border: `1px solid ${accent}`,
              color: PALETTE.text,
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// 카드 우상단에 표시되는 (i) 정보 아이콘 — 클릭 시 정보 모달 오픈
function InfoIcon({ color, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      className="w-5 h-5 flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
      style={{ color }}
      aria-label="정보 보기"
    >
      <Info size={13} />
    </button>
  );
}

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
  const [infoModal, setInfoModal] = useState(null);

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

  // 패시브 카드 클릭 → 정보 모달
  const openPassiveInfo = (name) => {
    const sk = PASSIVE_SKILLS[name];
    if (!sk) return;
    const lv = skills[name] || 0;
    const lines = [];
    if (sk.desc) lines.push(sk.desc);
    if (sk.minorEffect?.desc) {
      lines.push(`소계: ${sk.minorEffect.desc} (현재 Lv ${lv} → 누적 적용)`);
    }
    if (sk.tiers) {
      const tierLines = Object.entries(sk.tiers).map(([tierLv, t]) => {
        const unlocked = lv >= Number(tierLv);
        const prefix = unlocked ? '○' : '·';
        return `${prefix} Lv.${tierLv}: ${t.text}`;
      });
      lines.push(tierLines.join('\n'));
    }
    setInfoModal({
      color: sk.color,
      tag: '◆ 패시브 스킬',
      title: name,
      badge: `Lv.${lv}`,
      subtitle: sk.axis ? `축: ${sk.axis}` : null,
      lines,
    });
  };

  // 유물 카드 클릭 → 정보 모달
  const openRelicInfo = (rel) => {
    const stats = [];
    if (rel.statBonus) {
      Object.entries(rel.statBonus).forEach(([k, v]) => stats.push([k, String(v)]));
    }
    setInfoModal({
      color: rel.color,
      tag: '◆ 유물',
      title: rel.name,
      subtitle: rel.desc || null,
      stats,
    });
  };

  // 액티브 스킬 카드 클릭 → 정보 모달
  const openActiveSkillInfo = (name) => {
    const sk = COMBAT_SKILLS[name];
    if (!sk) return;
    const stats = [];
    if (sk.type) stats.push(['타입', sk.type === 'physical' ? '물리' : sk.type === 'magic' ? '마법' : sk.type === 'defense' ? '방어' : sk.type]);
    if (typeof sk.cost === 'number') stats.push(['마나', String(sk.cost)]);
    if (typeof sk.cd === 'number') stats.push(['쿨다운', `${sk.cd}턴`]);
    if (Array.isArray(sk.baseDmg)) stats.push(['데미지', `${sk.baseDmg[0]}~${sk.baseDmg[1]}`]);
    if (typeof sk.defense === 'number') stats.push(['방어', `+${sk.defense}`]);
    if (sk.pierce) stats.push(['특수', '방어 무시']);
    setInfoModal({
      color: classData?.color || PALETTE.accent,
      tag: '◆ 액티브 스킬',
      title: sk.name || name,
      subtitle: sk.desc || null,
      stats,
    });
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
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]" style={{ color: sk.color }}>Lv.{lv}</span>
                        <InfoIcon color={sk.color} onClick={() => openPassiveInfo(name)} />
                      </div>
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] truncate max-w-[150px]" style={{ color: PALETTE.textDim }}>
                          {rel.desc || ''}
                        </span>
                        <InfoIcon color={rel.color} onClick={() => openRelicInfo(rel)} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
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
                <button key={name} onClick={() => openActiveSkillInfo(name)}
                  className="text-left px-2 py-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${classData.color}20, ${classData.color}05)`,
                    border: `1px solid ${classData.color}80`,
                  }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12px] font-bold" style={{ color: PALETTE.text }}>
                      {sk.name || name}
                    </span>
                    <InfoIcon color={classData.color} onClick={() => openActiveSkillInfo(name)} />
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

      {infoModal && <CardInfoModal info={infoModal} onClose={() => setInfoModal(null)} />}
    </div>
  );
}

// =========== 출정 화면 ===========
// 직업 선택 확정 후 표시. 탭하면 원정 선택 화면으로.
