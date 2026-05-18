// ============================================
// components/StatusPanel.jsx — 상태창 (능력치, 패시브, 유물, 액티브 스킬)
// ============================================
// 패시브/유물/액티브 스킬 카드는 클릭 시 CardInfoModal로 상세 정보 표시.
// 전투 중에도 상태창에서 직업 액티브 스킬을 확인할 수 있도록 포함.
// ============================================

import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { PALETTE, getCharismaHealBonus, getCharismaDmgReduction, getCharismaSoulGainBonus, getIntellectStartSoul, getIntellectSoulPerMagic, getStrengthHpBonus, getStrengthSoulPerPhys, getAgilityCritDmgBonus, getAgilitySoulOnDodge, getIfritIgniteRate, getMinorBonus, getMetaBonus, hasEffect, hasUltimate, hasCurse } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS, ULTIMATE_SKILLS, CLASS_ULTIMATES } from '../data.js';
import CardInfoModal, { buildPassiveInfo, buildRelicInfo, buildActiveSkillInfo, buildClassUltimateInfo, buildBreakdownInfo } from './CardInfoModal.jsx';
import StatSignatureModal from './StatSignatureModal.jsx';

export default function StatusPanel({ classData, hp, maxHp, skills, stats, derivedStats = null, relics, ultimates = [], activeSkills = null, activeRelicNames = null, relicStat = {}, meta = null, curses = [], engravingFx = {}, onClose }) {
  const skillsByAxis = { attack: [], defense: [], utility: [] };
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv > 0 && PASSIVE_SKILLS[name]) {
      skillsByAxis[PASSIVE_SKILLS[name].axis].push({ name, lv, ...PASSIVE_SKILLS[name] });
    }
  });
  const axisNames = { attack: '공격', defense: '방어', utility: '유틸' };
  // modalState = { kind: 'passive'|'relic'|'active', name?, rel? }
  const [modalState, setModalState] = useState(null);
  // 1.37.0~ 능력치 클릭 → 시그니처 설명 모달
  const [statSigStat, setStatSigStat] = useState(null);

  let modalInfo = null;
  if (modalState?.kind === 'passive') {
    modalInfo = buildPassiveInfo(modalState.name, skills[modalState.name] || 0);
  } else if (modalState?.kind === 'relic') {
    modalInfo = buildRelicInfo(modalState.rel);
  } else if (modalState?.kind === 'active') {
    modalInfo = buildActiveSkillInfo(modalState.name, classData?.color);
  } else if (modalState?.kind === 'classult') {
    modalInfo = buildClassUltimateInfo(modalState.ultimateId);
  } else if (modalState?.kind === 'breakdown') {
    modalInfo = modalState.info;
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
            {['근력', '민첩', '지능', '매력'].map((k) => {
              const v = stats[k];
              if (v === undefined) return null;
              return (
                <button
                  key={k}
                  onClick={() => setStatSigStat(k)}
                  className="text-center transition-all"
                  style={{
                    background: `${classData.color}10`,
                    border: `1px solid ${classData.color}40`,
                    padding: '6px 4px',
                  }}
                  title={`${k} 시그니처 설명`}
                >
                  <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                  <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-center mt-1" style={{ color: PALETTE.textDim }}>능력치를 눌러 시그니처 효과를 확인하세요</p>
          {/* ━ 전투 수치 ━ 1.41.0~ 모든 라인 클릭 시 출처 분해 모달 */}
          {(() => {
            const playerDex = stats['민첩'] || 10;
            const dexAutoCrit = Math.max(0, (playerDex - 10) * 0.5);
            const dexAutoDodge = Math.max(0, (playerDex - 10) * 0.3);
            const dexPts = Math.max(0, playerDex - 10);
            const critMinor = getMinorBonus(skills, 'critRate+', activeSkills);
            const critMetaStacks = getMetaBonus(meta, 'critRate+3%');
            const critMeta = critMetaStacks * 3;
            const critRelic = relicStat.critRate || 0;
            const critWeakness = hasEffect(skills, 'weaknessPoint', activeSkills) ? 10 : 0;
            const critShadowUlt = hasUltimate(ultimates, 'ult_counterShadow') ? 15 : 0;
            const critEng = engravingFx.critRate || 0;
            const critRate = 5 + dexAutoCrit + critMinor + critMeta + critRelic + critWeakness + critShadowUlt + critEng;
            // 치명타 데미지
            const critDmgBase = 50;
            const critDmgLv4 = hasEffect(skills, 'critDmg+30', activeSkills) ? 30 : 0;
            const critDmgWeakness = hasEffect(skills, 'weaknessPoint', activeSkills) ? 50 : 0;
            const critDmgRelic = relicStat.critDmg || 0;
            const critDmgSig = getAgilityCritDmgBonus(stats);
            const critDmg = critDmgBase + critDmgLv4 + critDmgRelic + critDmgWeakness + critDmgSig;
            // 회피
            const dodgeMinor = getMinorBonus(skills, 'dodge+', activeSkills);
            const dodgeRelic = relicStat.dodge || 0;
            const dodgeLv5 = hasEffect(skills, 'dodge+15', activeSkills) ? 15 : 0;
            const dodgeDetailIntent = hasEffect(skills, 'detailIntent', activeSkills) ? 10 : 0;
            const dodgeMirrorUlt = hasUltimate(ultimates, 'ult_counterMirror') ? 10 : 0;
            const dodgeEng = engravingFx.dodgeRate || 0;
            const dodgeRate = dexAutoDodge + dodgeMinor + dodgeRelic + dodgeLv5 + dodgeDetailIntent + dodgeMirrorUlt + dodgeEng;
            // 방어 무시
            const ifritLv = skills['이프리트'] || 0;
            const ifritActive = !activeSkills || activeSkills.includes('이프리트');
            const armorIfritLv3 = ifritActive && ifritLv >= 3 ? 5 : 0;
            const armorIfritLv5 = ifritActive && ifritLv >= 5 ? 10 : 0;
            const armorIfritUlt = hasUltimate(ultimates, 'ult_ifritDescent') ? 25 : 0;
            const armorIgnore = armorIfritLv3 + armorIfritLv5 + armorIfritUlt;
            // 반격률
            const simanLv = skills['심안류'] || 0;
            const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
            const hasShock = hasUltimate(ultimates, 'ult_counterShock');
            const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
            const counterBaseLv = simanLv * 5;
            const counterLv3 = simanLv >= 3 ? 20 : 0;
            const counterUlt = (hasMirror || hasShock || hasShadow) ? 60 : 0;
            const counterEng = engravingFx.counterRatePct || 0;
            let counterRate = 0;
            if (simanLv > 0 || hasMirror || hasShock || hasShadow) {
              counterRate = counterBaseLv + counterLv3 + counterUlt;
              if (counterRate > 100) counterRate = 100;
            }
            counterRate += counterEng;
            const ignite = getIfritIgniteRate(skills, ultimates, activeSkills);
            const openLine = (info) => setModalState({ kind: 'breakdown', info: buildBreakdownInfo(info) });
            return (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>━ 전투 수치 ━</div>
                <p className="text-[9px] mb-1.5" style={{ color: PALETTE.textDim }}>각 라인을 눌러 산출 근거를 확인하세요</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  <button onClick={() => openLine({
                    title: '치명타 발동율',
                    totalText: `${Math.round(critRate)}%`,
                    subtitle: '치명타가 발동할 확률.',
                    color: PALETTE.legendary,
                    sources: [
                      { label: '기본 (전 직업 공통)', value: 5, unit: '%' },
                      { label: '민첩 자동 가산', value: dexAutoCrit, unit: '%', note: `적용 포인트 ${dexPts}(=민첩-10) × +0.5%/p` },
                      { label: '패시브 critRate+ 누적', value: critMinor, unit: '%' },
                      { label: '영혼의 제단 (critRate+3% × 스택)', value: critMeta, unit: '%', note: critMetaStacks > 0 ? `${critMetaStacks} 스택` : null },
                      { label: '유물 critRate', value: critRelic, unit: '%' },
                      { label: '약점 노출 (심안 Lv.7)', value: critWeakness, unit: '%' },
                      { label: '카운터 새도우 궁극', value: critShadowUlt, unit: '%' },
                      { label: '각인 critRate', value: critEng, unit: '%' },
                    ],
                  })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>치명타 발동율 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{Math.round(critRate)}%</span></button>
                  <button onClick={() => openLine({
                    title: '치명타 데미지',
                    totalText: `+${Math.round(critDmg)}%`,
                    subtitle: '치명타 발동 시 가하는 추가 데미지의 합산.',
                    color: PALETTE.legendary,
                    sources: [
                      { label: '기본 (전 직업 공통)', value: 50, unit: '%' },
                      { label: '심안 Lv.4 critDmg+30', value: critDmgLv4, unit: '%' },
                      { label: '약점 노출 (심안 Lv.7)', value: critDmgWeakness, unit: '%' },
                      { label: '유물 critDmg', value: critDmgRelic, unit: '%' },
                      { label: '민첩 시그니처 1단계', value: critDmgSig, unit: '%', note: `적용 포인트 ${dexPts}(=민첩-10) × +2%/p` },
                    ],
                  })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>치명타 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{Math.round(critDmg)}%</span></button>
                  <button onClick={() => openLine({
                    title: '회피 발동율',
                    totalText: `${Math.round(dodgeRate)}%`,
                    subtitle: '적의 공격을 피할 확률.',
                    color: PALETTE.green,
                    sources: [
                      { label: '민첩 자동 가산', value: dexAutoDodge, unit: '%', note: `적용 포인트 ${dexPts}(=민첩-10) × +0.3%/p` },
                      { label: '패시브 dodge+ 누적', value: dodgeMinor, unit: '%' },
                      { label: '유물 dodge', value: dodgeRelic, unit: '%' },
                      { label: '회피 Lv.5 (+15%)', value: dodgeLv5, unit: '%' },
                      { label: '심안 Lv.5 detailIntent (+10%)', value: dodgeDetailIntent, unit: '%' },
                      { label: '카운터 미러 궁극 (+10%)', value: dodgeMirrorUlt, unit: '%' },
                      { label: '각인 dodgeRate', value: dodgeEng, unit: '%' },
                    ],
                  })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>회피 발동율 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>{Math.round(dodgeRate)}%</span></button>
                  {armorIgnore > 0 && (
                    <button onClick={() => openLine({
                      title: '방어 무시',
                      totalText: `+${armorIgnore}`,
                      subtitle: '적의 방어력 중 무시하고 데미지를 가하는 양.',
                      color: PALETTE.accent,
                      sources: [
                        { label: '이프리트 Lv.3 (+5)', value: armorIfritLv3 },
                        { label: '이프리트 Lv.5 (+10)', value: armorIfritLv5 },
                        { label: '이프리트 강림 궁극 (+25)', value: armorIfritUlt },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>방어 무시 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{armorIgnore}</span></button>
                  )}
                  {counterRate > 0 && (
                    <button onClick={() => openLine({
                      title: '반격 발동율',
                      totalText: `${counterRate}%`,
                      subtitle: '적의 공격을 회피한 후 반격이 발동할 확률 (상한 100%).',
                      color: PALETTE.accent,
                      sources: [
                        { label: `심안류 Lv.${simanLv} (×5)`, value: counterBaseLv, unit: '%' },
                        { label: '심안류 Lv.3 마일스톤 (+20)', value: counterLv3, unit: '%' },
                        { label: '반격 궁극 보유 (+60)', value: counterUlt, unit: '%' },
                        { label: '각인 counterRatePct', value: counterEng, unit: '%' },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>반격 발동율 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{counterRate}%</span></button>
                  )}
                  {ignite.has && (
                    <button onClick={() => openLine({
                      title: '화염 각인 발동율',
                      totalText: `${ignite.rate}%`,
                      subtitle: '공격 시 적에게 화염 각인(igniteDmg)이 적용될 확률.',
                      color: '#d97706',
                      sources: [
                        { label: '이프리트 패시브 누적', value: ignite.rate, unit: '%', note: '이프리트 Lv. + 영겁지화 마일스톤 등의 누적 합계 (helpers.getIfritIgniteRate)' },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>화염 각인 발동율 ◇</span><span className="font-bold tabular-nums" style={{ color: '#d97706' }}>{ignite.rate}%</span></button>
                  )}
                </div>
              </div>
            );
          })()}
          {/* ━ 데미지 보정 ━ 1.41.0~ 모든 라인 클릭 시 출처 분해 모달 */}
          {(() => {
            const physMinor = getMinorBonus(skills, 'physDmg+', activeSkills);
            const physBonus = physMinor;
            const magicMinor = getMinorBonus(skills, 'magicDmg+', activeSkills);
            const magicLv5 = hasEffect(skills, 'magicDmg+30', activeSkills) ? 30 : 0;
            const magicRelic = relicStat.magicDmg || 0;
            const magicBonus = magicMinor + magicLv5 + magicRelic;
            const bleedBonus = getMinorBonus(skills, 'bleedDmg+', activeSkills);
            const simanLv = skills['심안류'] || 0;
            const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
            const hasShock = hasUltimate(ultimates, 'ult_counterShock');
            const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
            const counterBase = simanLv * 5;
            const counterLv5 = simanLv >= 5 ? 15 : 0;
            const counterUlt = (hasMirror || hasShock || hasShadow) ? 50 : 0;
            const counterEng = engravingFx.counterDmgPct || 0;
            const counterDmgBonus = counterBase + counterLv5 + counterUlt + counterEng;
            const physDmgPct = engravingFx.physDmgPct || 0;
            const afterDodgeDmg = engravingFx.afterDodgeDmg || 0;
            const metaStacks = getMetaBonus(meta, 'dmgDealt+5%');
            const metaDmgBonus = metaStacks * 5;
            const relicDmgBonus = relicStat.dmgDealt || 0;
            const allDmgBonus = metaDmgBonus + relicDmgBonus;
            // 받는 데미지 감소
            const dmgTakenMetaStacks = getMetaBonus(meta, 'dmgTaken-3%');
            const dmgTakenMeta = dmgTakenMetaStacks * 3;
            const dmgTakenRelic = relicStat.dmgTaken || 0;
            const dmgTakenLv5 = hasEffect(skills, 'dmgTaken-20', activeSkills) ? 20 : 0;
            const dmgTakenCharisma = getCharismaDmgReduction(stats);
            const dmgTakenEngFx = engravingFx.dmgTakenPct || 0;
            const dmgTakenReduceTotal = dmgTakenMeta + dmgTakenRelic + dmgTakenLv5 + dmgTakenCharisma - dmgTakenEngFx;
            const dmgDealtCurse = hasCurse(curses, 'curse_dmgDealt-15') ? 15 : 0;
            const dmgTakenCurse15 = hasCurse(curses, 'curse_dmgTaken+15') ? 15 : 0;
            const dmgTakenCurse30 = hasCurse(curses, 'curse_dmgTaken+30') ? 30 : 0;
            const dmgTakenCurse = dmgTakenCurse15 + dmgTakenCurse30;
            const hasAny = physBonus || magicBonus || bleedBonus || counterDmgBonus || physDmgPct || afterDodgeDmg || allDmgBonus || dmgTakenReduceTotal || dmgDealtCurse || dmgTakenCurse;
            if (!hasAny) return null;
            const openLine = (info) => setModalState({ kind: 'breakdown', info: buildBreakdownInfo(info) });
            return (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>━ 데미지 보정 ━</div>
                <p className="text-[9px] mb-1.5" style={{ color: PALETTE.textDim }}>각 라인을 눌러 산출 근거를 확인하세요</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  {physBonus > 0 && (
                    <button onClick={() => openLine({
                      title: '물리 데미지',
                      totalText: `+${physBonus}`,
                      subtitle: '물리 데미지에 가산되는 고정값.',
                      color: PALETTE.accent,
                      sources: [{ label: '패시브 physDmg+ 누적', value: physMinor }],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>물리 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{physBonus}</span></button>
                  )}
                  {physDmgPct > 0 && (
                    <button onClick={() => openLine({
                      title: '물리 데미지(각인)',
                      totalText: `+${physDmgPct}%`,
                      subtitle: '물리 데미지에 곱셈으로 적용되는 각인 보너스.',
                      color: '#c4453d',
                      sources: [{ label: '각인 physDmgPct', value: physDmgPct, unit: '%' }],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>물리 데미지(각인) ◇</span><span className="font-bold tabular-nums" style={{ color: '#c4453d' }}>+{physDmgPct}%</span></button>
                  )}
                  {magicBonus > 0 && (
                    <button onClick={() => openLine({
                      title: '마법 데미지',
                      totalText: `+${magicBonus}%`,
                      subtitle: '마법 데미지에 가산되는 % 보너스.',
                      color: PALETTE.twilight,
                      sources: [
                        { label: '패시브 magicDmg+ 누적', value: magicMinor, unit: '%' },
                        { label: '마력 Lv.5 magicDmg+30', value: magicLv5, unit: '%' },
                        { label: '유물 magicDmg', value: magicRelic, unit: '%' },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>마법 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{magicBonus}%</span></button>
                  )}
                  {bleedBonus > 0 && (
                    <button onClick={() => openLine({
                      title: '출혈 데미지',
                      totalText: `+${bleedBonus}%`,
                      subtitle: '출혈 상태이상의 틱 데미지에 가산되는 % 보너스.',
                      color: PALETTE.bleed,
                      sources: [{ label: '패시브 bleedDmg+ 누적', value: bleedBonus, unit: '%' }],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>출혈 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.bleed }}>+{bleedBonus}%</span></button>
                  )}
                  {counterDmgBonus > 0 && (
                    <button onClick={() => openLine({
                      title: '반격 데미지',
                      totalText: `+${counterDmgBonus}%`,
                      subtitle: '반격 발동 시 데미지에 가산되는 % 보너스.',
                      color: PALETTE.accent,
                      sources: [
                        { label: `심안류 Lv.${simanLv} (×5)`, value: counterBase, unit: '%' },
                        { label: '심안류 Lv.5 (+15)', value: counterLv5, unit: '%' },
                        { label: '반격 궁극 보유 (+50)', value: counterUlt, unit: '%' },
                        { label: '각인 counterDmgPct', value: counterEng, unit: '%' },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>반격 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{counterDmgBonus}%</span></button>
                  )}
                  {allDmgBonus > 0 && (
                    <button onClick={() => openLine({
                      title: '모든 데미지',
                      totalText: `+${allDmgBonus}%`,
                      subtitle: '모든 데미지 종류(물리·마법·출혈·반격)에 곱셈으로 적용.',
                      color: PALETTE.legendary,
                      sources: [
                        { label: '영혼의 제단 (dmgDealt+5% × 스택)', value: metaDmgBonus, unit: '%', note: metaStacks > 0 ? `${metaStacks} 스택` : null },
                        { label: '유물 dmgDealt', value: relicDmgBonus, unit: '%' },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>모든 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{allDmgBonus}%</span></button>
                  )}
                  {afterDodgeDmg > 0 && (
                    <button onClick={() => openLine({
                      title: '회피 후 데미지',
                      totalText: `+${afterDodgeDmg}%`,
                      subtitle: '회피 성공 직후 다음 공격의 데미지에 가산되는 % 보너스.',
                      color: PALETTE.green,
                      sources: [{ label: '각인 afterDodgeDmg', value: afterDodgeDmg, unit: '%' }],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>회피 후 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{afterDodgeDmg}%</span></button>
                  )}
                  {dmgTakenReduceTotal !== 0 && (
                    <button onClick={() => openLine({
                      title: '받는 데미지',
                      totalText: `${dmgTakenReduceTotal >= 0 ? '-' : '+'}${Math.abs(dmgTakenReduceTotal)}%`,
                      subtitle: '적의 공격이 깎인 후 받는 데미지의 감소량. 음수면 오히려 받는 데미지가 증가하는 상태.',
                      color: PALETTE.green,
                      sources: [
                        { label: '영혼의 제단 (dmgTaken-3% × 스택)', value: dmgTakenMeta, unit: '%', note: dmgTakenMetaStacks > 0 ? `${dmgTakenMetaStacks} 스택` : null },
                        { label: '유물 dmgTaken', value: dmgTakenRelic, unit: '%' },
                        { label: '패시브 Lv.5 dmgTaken-20', value: dmgTakenLv5, unit: '%' },
                        { label: '매력 시그니처 2단계', value: dmgTakenCharisma, unit: '%', note: (stats['매력'] || 10) < 17 ? `매력 17 필요 (현재 ${stats['매력'] || 10})` : `17~21 -5% / 22~26 -10% / 27~31 -15% (현재 -${dmgTakenCharisma}%)` },
                        { label: '각인 dmgTakenPct', value: dmgTakenEngFx !== 0 ? -dmgTakenEngFx : 0, unit: '%', note: dmgTakenEngFx > 0 ? '(부정 각인 — 받는 데미지 증가)' : null },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>받는 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: dmgTakenReduceTotal > 0 ? PALETTE.green : PALETTE.accent }}>{dmgTakenReduceTotal > 0 ? '-' : '+'}{Math.abs(dmgTakenReduceTotal)}%</span></button>
                  )}
                  {dmgDealtCurse > 0 && (
                    <button onClick={() => openLine({
                      title: '저주: 가하는 데미지',
                      totalText: `-${dmgDealtCurse}%`,
                      subtitle: '저주 효과로 가하는 데미지가 감소합니다.',
                      color: PALETTE.twilight,
                      sources: [{ label: 'curse_dmgDealt-15', value: -dmgDealtCurse, unit: '%' }],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>저주: 가하는 데미지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{dmgDealtCurse}%</span></button>
                  )}
                  {dmgTakenCurse > 0 && (
                    <button onClick={() => openLine({
                      title: '저주: 받는 피해',
                      totalText: `+${dmgTakenCurse}%`,
                      subtitle: '저주 효과로 받는 피해가 증가합니다.',
                      color: PALETTE.twilight,
                      sources: [
                        { label: 'curse_dmgTaken+15', value: dmgTakenCurse15, unit: '%' },
                        { label: 'curse_dmgTaken+30', value: dmgTakenCurse30, unit: '%' },
                      ],
                    })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>저주: 받는 피해 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{dmgTakenCurse}%</span></button>
                  )}
                </div>
              </div>
            );
          })()}
          {/* ━ 기타 효과 ━ 1.41.0~ 회복량 합산 라인 추가 + 모든 라인 클릭 시 출처 모달 + 계산식 명확화 */}
          {(() => {
            const regenLv = skills['재생'] || 0;
            const lifesteal = relicStat.lifesteal || 0;
            const reflect = relicStat.reflect || 0;
            const heal = relicStat.heal || 0;
            const charismaHeal = getCharismaHealBonus(stats);
            const charismaSoul = getCharismaSoulGainBonus(stats);
            const intellectStartSoul = getIntellectStartSoul(stats);
            const intellectMagicSoul = getIntellectSoulPerMagic(stats);
            const strHp = getStrengthHpBonus(stats);
            const strPhysSoul = getStrengthSoulPerPhys(stats);
            const dexDodgeSoul = getAgilitySoulOnDodge(stats);
            const cdReduce = getMinorBonus(skills, 'cdReduce+', activeSkills);
            const etherReduce = hasEffect(skills, 'etherCost-20', activeSkills);
            const startSoulEng = engravingFx.startSoul || 0;
            const perTurnSoul = engravingFx.perTurnSoul || 0;
            const dodgeSoulEng = engravingFx.dodgeSoul || 0;
            const counterHitSoul = engravingFx.counterHitSoul || 0;
            const counterShock = engravingFx.counterShock || 0;
            const counterCanCrit = !!engravingFx.counterCanCrit;
            const soulGainMult = engravingFx.soulGainMult || 0;
            const perTurnHpLoss = engravingFx.perTurnHpLoss || 0;
            const disableInsightPredict = !!engravingFx.disableInsightPredict;
            // 합산
            const startSoulTotal = intellectStartSoul + startSoulEng;
            const dodgeSoulTotal = dexDodgeSoul + dodgeSoulEng;
            // 회복량 보너스 — 유물 heal과 매력 시그가 곱셈(multiplicative)으로 적용
            // 실제 적용: baseHeal × (1 + heal/100) × (1 + charismaHeal/100)
            // 표시값: ((1+heal/100) × (1+charismaHeal/100) - 1) × 100  (소수 1자리)
            const healMult = (1 + heal / 100) * (1 + charismaHeal / 100);
            const healTotalPct = Math.round((healMult - 1) * 1000) / 10;
            const showSoul = !!classData?.ultimateId;
            const hasAny = regenLv || lifesteal || reflect || heal || charismaHeal || charismaSoul
              || strHp || strPhysSoul || intellectMagicSoul
              || cdReduce || etherReduce
              || (showSoul && (startSoulTotal || perTurnSoul || dodgeSoulTotal || counterHitSoul || soulGainMult))
              || counterShock || counterCanCrit || perTurnHpLoss || disableInsightPredict;
            if (!hasAny) return null;
            // 공통 모달 오픈
            const openLine = (info) => setModalState({ kind: 'breakdown', info: buildBreakdownInfo(info) });
            // 합산 라인 출처 모달들 (계산식 명확화)
            const intPts = Math.max(0, (stats['지능'] || 10) - 10);
            const dexPts = Math.max(0, (stats['민첩'] || 10) - 10);
            const openStartSoulBreakdown = () => openLine({
              title: '시작 소울 게이지',
              totalText: `+${startSoulTotal}`,
              subtitle: '전투 진입 시 소울 게이지(0~100)의 초기값에 더해지는 양.',
              color: PALETTE.dawn,
              sources: [
                { label: '지능 시그니처 1단계', value: intellectStartSoul, note: `적용 포인트 ${intPts}(=지능-10) × 0.5 = floor → +${intellectStartSoul}` },
                { label: '각인 startSoul', value: startSoulEng },
              ],
            });
            const openDodgeSoulBreakdown = () => openLine({
              title: '회피 시 소울',
              totalText: `+${dodgeSoulTotal}`,
              subtitle: '적의 공격을 회피했을 때 소울 게이지가 충전되는 양.',
              color: PALETTE.dawn,
              sources: [
                { label: '민첩 시그니처 2단계', value: dexDodgeSoul, note: (stats['민첩'] || 10) < 17 ? `민첩 17 필요 (현재 ${stats['민첩'] || 10})` : `17~21 +5 / 22~26 +10 (현재 +${dexDodgeSoul})` },
                { label: '각인 dodgeSoul', value: dodgeSoulEng },
              ],
            });
            const openHealBreakdown = () => openLine({
              title: '회복량 보너스',
              totalText: `+${healTotalPct}%`,
              subtitle: `유물(heal)과 매력 시그가 곱셈으로 누적 적용됩니다.\n계산: (1 + ${heal}/100) × (1 + ${charismaHeal}/100) = ${healMult.toFixed(3)}배`,
              color: PALETTE.green,
              sources: [
                { label: '유물 heal', value: heal, unit: '%' },
                { label: '매력 시그니처 1단계', value: charismaHeal, unit: '%', note: `적용 포인트 ${Math.max(0, (stats['매력'] || 10) - 10)}(=매력-10) × +0.5%/p` },
              ],
            });
            // 단일 출처 라인 모달 (간단 desc 형태)
            const openSimpleLine = (title, totalText, sources, color, subtitle) => openLine({
              title, totalText, subtitle, color, sources,
            });
            return (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>━ 기타 효과 ━</div>
                <p className="text-[9px] mb-1.5" style={{ color: PALETTE.textDim }}>각 라인을 눌러 산출 근거를 확인하세요</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  {regenLv > 0 && (
                    <button onClick={() => openSimpleLine('HP 자동 회복', `+${regenLv}/턴`, [{ label: '재생 패시브', value: regenLv, unit: '/턴', note: `Lv.${regenLv}` }], PALETTE.green, '매 턴 시작 시 HP를 회복합니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>HP 자동 회복 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{regenLv}/턴</span></button>
                  )}
                  {lifesteal > 0 && (
                    <button onClick={() => openSimpleLine('흡혈', `+${lifesteal}`, [{ label: '유물 lifesteal', value: lifesteal }], PALETTE.accent, '적에게 가한 데미지의 일부를 회복합니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>흡혈 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{lifesteal}</span></button>
                  )}
                  {reflect > 0 && (
                    <button onClick={() => openSimpleLine('데미지 반사', `${reflect}%`, [{ label: '유물 reflect', value: reflect, unit: '%' }], PALETTE.accent, '받은 데미지의 일부를 적에게 되돌려줍니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>데미지 반사 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{reflect}%</span></button>
                  )}
                  {healTotalPct > 0 && (
                    <button onClick={openHealBreakdown} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>회복량 보너스 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{healTotalPct}%</span></button>
                  )}
                  {charismaSoul > 0 && (
                    <button onClick={() => openSimpleLine('매력 시그: 영혼 획득', `+${charismaSoul}%`, [{ label: '매력 시그니처 (자동 가산)', value: charismaSoul, unit: '%', note: `적용 포인트 ${Math.max(0, (stats['매력'] || 10) - 10)}(=매력-10) × +0.5%/p` }], PALETTE.dawn, '영구 메타 영혼 획득량 보너스 (처치 영혼·챕터 보너스·무한 깊이 보너스·대장간 등 모든 영혼 가산처).')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>매력 시그: 영혼 획득 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{charismaSoul}%</span></button>
                  )}
                  {strHp > 0 && (
                    <button onClick={() => openSimpleLine('근력 시그: 시작 HP', `+${strHp}`, [{ label: '근력 시그니처 1단계', value: strHp, note: `적용 포인트 ${Math.max(0, (stats['근력'] || 10) - 10)}(=근력-10) × +5 HP/p` }], PALETTE.accent, '전투 시작 시 최대 HP가 증가합니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>근력 시그: 시작 HP ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{strHp}</span></button>
                  )}
                  {strPhysSoul > 0 && (
                    <button onClick={() => openSimpleLine('근력 시그: 물리 시 소울', `+${strPhysSoul}`, [{ label: '근력 시그니처 2단계', value: strPhysSoul, note: (stats['근력'] || 10) < 17 ? `근력 17 필요 (현재 ${stats['근력'] || 10})` : `17~21 +1 / 22~26 +2 (현재 +${strPhysSoul})` }], PALETTE.dawn, '물리 스킬 시전 시 소울 게이지가 충전됩니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>근력 시그: 물리 시 소울 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{strPhysSoul}</span></button>
                  )}
                  {intellectMagicSoul > 0 && (
                    <button onClick={() => openSimpleLine('지능 시그: 마법 시 소울', `+${intellectMagicSoul}`, [{ label: '지능 시그니처 2단계', value: intellectMagicSoul, note: (stats['지능'] || 10) < 17 ? `지능 17 필요 (현재 ${stats['지능'] || 10})` : `17~21 +1 / 22~26 +2 (현재 +${intellectMagicSoul})` }], PALETTE.legendary, '마법 스킬 시전 시 소울 게이지가 충전됩니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>지능 시그: 마법 시 소울 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{intellectMagicSoul}</span></button>
                  )}
                  {cdReduce > 0 && (
                    <button onClick={() => openSimpleLine('쿨다운 감소', `-${cdReduce}턴`, [{ label: '패시브 cdReduce+', value: cdReduce, unit: '턴', note: `해당 패시브의 누적 보너스` }], PALETTE.twilight, '액티브 스킬의 쿨다운 턴 수가 감소합니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>쿨다운 감소 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{cdReduce}턴</span></button>
                  )}
                  {etherReduce && (
                    <button onClick={() => openSimpleLine('에테르 비용', '-1', [{ label: '패시브 etherCost-20', value: '-1', note: '발동 중' }], PALETTE.twilight, '액티브 스킬의 에테르 비용이 1 감소합니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>에테르 비용 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-1</span></button>
                  )}
                  {showSoul && startSoulTotal > 0 && (
                    <button onClick={openStartSoulBreakdown} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>시작 소울 게이지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{startSoulTotal}</span></button>
                  )}
                  {showSoul && perTurnSoul > 0 && (
                    <button onClick={() => openSimpleLine('매 턴 소울 게이지', `+${perTurnSoul}`, [{ label: '각인 perTurnSoul', value: perTurnSoul }], PALETTE.dawn, '매 턴 시작 시 소울 게이지가 추가로 충전됩니다 (기본 +5 외).')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>매 턴 소울 게이지 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{perTurnSoul}</span></button>
                  )}
                  {showSoul && dodgeSoulTotal > 0 && (
                    <button onClick={openDodgeSoulBreakdown} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>회피 시 소울 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{dodgeSoulTotal}</span></button>
                  )}
                  {showSoul && soulGainMult !== 0 && (
                    <button onClick={() => openSimpleLine('영구 영혼 획득 배수', `×${(1 + soulGainMult).toFixed(2)}`, [{ label: '각인 soulGainMult', value: `×${(1 + soulGainMult).toFixed(2)}` }], PALETTE.legendary, '영구 메타 영혼 획득량의 배수 보너스. 매력 시그(영혼 획득)와 별개로 적용.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>영구 영혼 획득 배수 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>×{(1 + soulGainMult).toFixed(2)}</span></button>
                  )}
                  {showSoul && counterHitSoul > 0 && (
                    <button onClick={() => openSimpleLine('반격 시 소울', `+${counterHitSoul}`, [{ label: '각인 counterHitSoul', value: counterHitSoul }], PALETTE.dawn, '반격 발동 시 소울 게이지가 충전됩니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>반격 시 소울 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{counterHitSoul}</span></button>
                  )}
                  {counterShock > 0 && (
                    <button onClick={() => openSimpleLine('반격 시 충격', `+${counterShock}`, [{ label: '각인 counterShock', value: counterShock }], PALETTE.twilight, '반격 발동 시 적에게 충격 게이지가 누적됩니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>반격 시 충격 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{counterShock}</span></button>
                  )}
                  {counterCanCrit && (
                    <button onClick={() => openSimpleLine('반격 치명타 가능', 'ON', [{ label: '각인 counterCanCrit', value: 'ON' }], PALETTE.legendary, '반격 공격도 치명타가 발동할 수 있습니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>반격 치명타 가능 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>ON</span></button>
                  )}
                  {perTurnHpLoss > 0 && (
                    <button onClick={() => openSimpleLine('매 턴 HP 손실', `-${perTurnHpLoss}`, [{ label: '각인 perTurnHpLoss (저주)', value: perTurnHpLoss, note: '부정 효과' }], PALETTE.accent, '매 턴 시작 시 HP가 감소합니다 (부정 각인 효과).')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>매 턴 HP 손실 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>-{perTurnHpLoss}</span></button>
                  )}
                  {disableInsightPredict && (
                    <button onClick={() => openSimpleLine('심안 사용 차단', 'ON', [{ label: '각인 disableInsightPredict (저주)', value: 'ON', note: '부정 효과' }], PALETTE.accent, '심안 패시브의 적 의도 카드 표시와 detailIntent 회피 보너스가 비활성화됩니다.')}
                      className="flex justify-between text-left" style={{ color: PALETTE.textDim }}><span>심안 사용 차단 ◇</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>ON</span></button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 액티브 스킬 — 카드 클릭 시 정보 모달 (전투 중에도 확인 가능) */}
        {/* 1.41.0~ 액티브 스킬과 직업 소울 스킬을 별도 섹션으로 분리 */}
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

        {/* 직업 소울 스킬 — 별도 섹션 (소울 게이지 100 발동) */}
        {classData?.ultimateId && CLASS_ULTIMATES[classData.ultimateId] && (() => {
          const ult = CLASS_ULTIMATES[classData.ultimateId];
          return (
            <div className="px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
              <div className="text-[11px] tracking-[0.3em] mb-3 flex items-center gap-1" style={{ color: PALETTE.legendary }}>
                <span>★</span><span>직업 소울 스킬</span>
              </div>
              <button onClick={() => setModalState({ kind: 'classult', ultimateId: classData.ultimateId })}
                className="w-full text-left px-3 py-3 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${ult.color}25, ${ult.color}08)`,
                  border: `1px solid ${ult.color}`,
                  boxShadow: `0 0 8px ${ult.color}40`,
                }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px]" style={{ color: PALETTE.legendary }}>★</span>
                    <span className="text-[13px] font-bold" style={{ color: PALETTE.text }}>{ult.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5" style={{ color: PALETTE.legendary, background: `${PALETTE.legendary}20`, border: `1px solid ${PALETTE.legendary}60`, letterSpacing: '0.1em' }}>SOUL 100</span>
                </div>
                <div className="text-[10px] leading-snug" style={{ color: PALETTE.textDim }}>{ult.desc}</div>
              </button>
            </div>
          );
        })()}

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
      {statSigStat && (
        <StatSignatureModal stat={statSigStat} stats={stats} onClose={() => setStatSigStat(null)} />
      )}
    </div>
  );
}
