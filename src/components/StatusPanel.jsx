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
import CardInfoModal, { buildPassiveInfo, buildRelicInfo, buildActiveSkillInfo, buildClassUltimateInfo } from './CardInfoModal.jsx';
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
          {/* ━ 전투 수치 ━ (치명타·회피·방어 무시·반격·화염 각인) */}
          {(() => {
            const playerDex = stats['민첩'] || 10;
            let critRate = 5 + Math.max(0, (playerDex - 10) * 0.5);
            critRate += getMinorBonus(skills, 'critRate+', activeSkills);
            critRate += getMetaBonus(meta, 'critRate+3%') * 3;
            critRate += relicStat.critRate || 0;
            if (hasEffect(skills, 'weaknessPoint', activeSkills)) critRate += 10;
            if (hasUltimate(ultimates, 'ult_counterShadow')) critRate += 15;
            critRate += engravingFx.critRate || 0;
            let critDmg = hasEffect(skills, 'critDmg+30', activeSkills) ? 80 : 50;
            critDmg += relicStat.critDmg || 0;
            if (hasEffect(skills, 'weaknessPoint', activeSkills)) critDmg += 50;
            let dodgeRate = Math.max(0, (playerDex - 10) * 0.3);
            dodgeRate += getMinorBonus(skills, 'dodge+', activeSkills);
            dodgeRate += relicStat.dodge || 0;
            if (hasEffect(skills, 'dodge+15', activeSkills)) dodgeRate += 15;
            if (hasEffect(skills, 'detailIntent', activeSkills)) dodgeRate += 10;
            if (hasUltimate(ultimates, 'ult_counterMirror')) dodgeRate += 10;
            dodgeRate += engravingFx.dodgeRate || 0;
            // 방어 무시
            let armorIgnore = 0;
            const ifritLv = skills['이프리트'] || 0;
            const ifritActive = !activeSkills || activeSkills.includes('이프리트');
            if (ifritActive && ifritLv >= 3) armorIgnore += 5;
            if (ifritActive && ifritLv >= 5) armorIgnore += 10;
            if (hasUltimate(ultimates, 'ult_ifritDescent')) armorIgnore += 25;
            // 반격률
            const simanLv = skills['심안류'] || 0;
            const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
            const hasShock = hasUltimate(ultimates, 'ult_counterShock');
            const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
            let counterRate = 0;
            if (simanLv > 0 || hasMirror || hasShock || hasShadow) {
              counterRate = simanLv * 5;
              if (simanLv >= 3) counterRate += 20;
              if (hasMirror || hasShock || hasShadow) counterRate += 60;
              if (counterRate > 100) counterRate = 100;
            }
            counterRate += engravingFx.counterRatePct || 0;
            const ignite = getIfritIgniteRate(skills, ultimates, activeSkills);
            return (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>━ 전투 수치 ━</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>치명타율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{Math.round(critRate)}%</span></div>
                  <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>치명타데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{Math.round(critDmg)}%</span></div>
                  <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회피율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>{Math.round(dodgeRate)}%</span></div>
                  {armorIgnore > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>방어무시</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{armorIgnore}</span></div>)}
                  {counterRate > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격률</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{counterRate}%</span></div>)}
                  {ignite.has && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>화염각인</span><span className="font-bold tabular-nums" style={{ color: '#d97706' }}>{ignite.rate}%</span></div>)}
                </div>
              </div>
            );
          })()}
          {/* ━ 데미지 보정 ━ */}
          {(() => {
            const physBonus = getMinorBonus(skills, 'physDmg+', activeSkills);
            const magicBonus = getMinorBonus(skills, 'magicDmg+', activeSkills) + (hasEffect(skills, 'magicDmg+30', activeSkills) ? 30 : 0) + (relicStat.magicDmg || 0);
            const bleedBonus = getMinorBonus(skills, 'bleedDmg+', activeSkills);
            const simanLv = skills['심안류'] || 0;
            const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
            const hasShock = hasUltimate(ultimates, 'ult_counterShock');
            const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
            let counterDmgBonus = simanLv * 5;
            if (simanLv >= 5) counterDmgBonus += 15;
            if (hasMirror || hasShock || hasShadow) counterDmgBonus += 50;
            counterDmgBonus += engravingFx.counterDmgPct || 0;
            const physDmgPct = engravingFx.physDmgPct || 0;
            const afterDodgeDmg = engravingFx.afterDodgeDmg || 0;
            const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+5%') * 5;
            const relicDmgBonus = relicStat.dmgDealt || 0;
            const allDmgBonus = metaDmgBonus + relicDmgBonus;
            const dmgTakenMeta = getMetaBonus(meta, 'dmgTaken-3%') * 3;
            const dmgTakenRelic = relicStat.dmgTaken || 0;
            const dmgTakenLv5 = hasEffect(skills, 'dmgTaken-20', activeSkills) ? 20 : 0;
            const dmgTakenCharisma = getCharismaDmgReduction(stats);
            const dmgTakenReduce = dmgTakenMeta + dmgTakenRelic + dmgTakenLv5 + dmgTakenCharisma;
            const dmgTakenEngFx = engravingFx.dmgTakenPct || 0;
            const dmgDealtCurse = hasCurse(curses, 'curse_dmgDealt-15') ? 15 : 0;
            const dmgTakenCurse = (hasCurse(curses, 'curse_dmgTaken+15') ? 15 : 0)
              + (hasCurse(curses, 'curse_dmgTaken+30') ? 30 : 0);
            const hasAny = physBonus || magicBonus || bleedBonus || counterDmgBonus || physDmgPct || afterDodgeDmg || allDmgBonus || dmgTakenReduce || dmgTakenEngFx || dmgDealtCurse || dmgTakenCurse;
            if (!hasAny) return null;
            return (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>━ 데미지 보정 ━</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  {physBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>물리데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{physBonus}</span></div>)}
                  {physDmgPct > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>물리데미지+</span><span className="font-bold tabular-nums" style={{ color: '#c4453d' }}>+{physDmgPct}%</span></div>)}
                  {magicBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>마법데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{magicBonus}%</span></div>)}
                  {bleedBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>출혈데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.bleed }}>+{bleedBonus}%</span></div>)}
                  {counterDmgBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{counterDmgBonus}%</span></div>)}
                  {allDmgBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>모든데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{allDmgBonus}%</span></div>)}
                  {afterDodgeDmg > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회피후데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{afterDodgeDmg}%</span></div>)}
                  {dmgTakenReduce > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>받는데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>-{dmgTakenReduce}%</span></div>)}
                  {dmgTakenEngFx !== 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>받는데미지(각인)</span><span className="font-bold tabular-nums" style={{ color: dmgTakenEngFx > 0 ? PALETTE.accent : PALETTE.green }}>{dmgTakenEngFx > 0 ? '+' : ''}{dmgTakenEngFx}%</span></div>)}
                  {dmgDealtCurse > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>저주(딜)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{dmgDealtCurse}%</span></div>)}
                  {dmgTakenCurse > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>저주(피)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{dmgTakenCurse}%</span></div>)}
                </div>
              </div>
            );
          })()}
          {/* ━ 기타 효과 ━ (소울 게이지·재생·흡혈·반사·시그니처·각인 부수) */}
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
            const dexCritDmg = getAgilityCritDmgBonus(stats);
            const dexDodgeSoul = getAgilitySoulOnDodge(stats);
            const cdReduce = getMinorBonus(skills, 'cdReduce+', activeSkills);
            const etherReduce = hasEffect(skills, 'etherCost-20', activeSkills);
            const startSoul = engravingFx.startSoul || 0;
            const perTurnSoul = engravingFx.perTurnSoul || 0;
            const dodgeSoul = engravingFx.dodgeSoul || 0;
            const counterHitSoul = engravingFx.counterHitSoul || 0;
            const counterShock = engravingFx.counterShock || 0;
            const counterCanCrit = !!engravingFx.counterCanCrit;
            const soulGainMult = engravingFx.soulGainMult || 0;
            const perTurnHpLoss = engravingFx.perTurnHpLoss || 0;
            const disableInsightPredict = !!engravingFx.disableInsightPredict;
            const hasAny = regenLv || lifesteal || reflect || heal || charismaHeal || charismaSoul
              || intellectStartSoul || intellectMagicSoul || strHp || strPhysSoul || dexCritDmg || dexDodgeSoul
              || cdReduce || etherReduce
              || startSoul || perTurnSoul || dodgeSoul || counterHitSoul || counterShock || counterCanCrit || soulGainMult || perTurnHpLoss || disableInsightPredict;
            if (!hasAny) return null;
            return (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim, letterSpacing: '0.15em' }}>━ 기타 효과 ━</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  {regenLv > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>HP재생</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{regenLv}/턴</span></div>)}
                  {lifesteal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>흡혈</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{lifesteal}</span></div>)}
                  {reflect > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반사</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{reflect}%</span></div>)}
                  {heal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회복효과</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{heal}%</span></div>)}
                  {charismaHeal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>매력(회복)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{charismaHeal}%</span></div>)}
                  {charismaSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>매력(영혼)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{charismaSoul}%</span></div>)}
                  {strHp > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>근력(시작HP)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{strHp}</span></div>)}
                  {strPhysSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>근력(물리영혼)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{strPhysSoul}</span></div>)}
                  {dexCritDmg > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>민첩(치명뎀)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{dexCritDmg}%</span></div>)}
                  {dexDodgeSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>민첩(회피영혼)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{dexDodgeSoul}</span></div>)}
                  {intellectStartSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>지능(시작영혼)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{intellectStartSoul}</span></div>)}
                  {intellectMagicSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>지능(마법영혼)</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{intellectMagicSoul}</span></div>)}
                  {cdReduce > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>쿨다운감소</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{cdReduce}턴</span></div>)}
                  {etherReduce && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>에테르비용</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-1</span></div>)}
                  {startSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>시작영혼</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{startSoul}</span></div>)}
                  {perTurnSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>턴당영혼</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{perTurnSoul}</span></div>)}
                  {dodgeSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회피→영혼</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{dodgeSoul}</span></div>)}
                  {soulGainMult !== 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>영혼획득</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>×{(1 + soulGainMult).toFixed(2)}</span></div>)}
                  {counterHitSoul > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격→영혼</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{counterHitSoul}</span></div>)}
                  {counterShock > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격→충격</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{counterShock}</span></div>)}
                  {counterCanCrit && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격치명</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>가능</span></div>)}
                  {perTurnHpLoss > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>턴당HP</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>-{perTurnHpLoss}</span></div>)}
                  {disableInsightPredict && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>심안차단</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>ON</span></div>)}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 액티브 스킬 — 카드 클릭 시 정보 모달 (전투 중에도 확인 가능) */}
        {/* 1.39.0~ 직업 소울 스킬(classData.ultimateId)이 있으면 4번째 슬롯에 정보 카드. */}
        {classData && Array.isArray(classData.combatSkills) && classData.combatSkills.length > 0 && (() => {
          const hasUlt = !!classData.ultimateId;
          const ult = hasUlt ? CLASS_ULTIMATES[classData.ultimateId] : null;
          return (
          <div className="px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: classData.color }}>◆ 액티브 스킬</div>
            <div className={`grid gap-1.5 ${hasUlt ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
              {/* 4번째 슬롯: 직업 소울 스킬 (소울 게이지 100 발동) */}
              {hasUlt && ult && (
                <button onClick={() => setModalState({ kind: 'classult', ultimateId: classData.ultimateId })}
                  className="text-left px-2 py-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${ult.color}30, ${ult.color}08)`,
                    border: `1px solid ${ult.color}`,
                    boxShadow: `0 0 6px ${ult.color}40`,
                  }}>
                  <div className="text-[12px] font-bold mb-0.5 flex items-center gap-0.5" style={{ color: PALETTE.text }}>
                    <span style={{ color: PALETTE.legendary }}>★</span>
                    <span className="truncate">{ult.name}</span>
                  </div>
                  <div className="text-[9px]" style={{ color: PALETTE.legendary, letterSpacing: '0.05em' }}>
                    소울 100
                  </div>
                </button>
              )}
            </div>
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
