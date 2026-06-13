// ============================================
// components/BuildSummaryPanel.jsx — 빌드 요약 패널 (PrepScreen·RestScreen 공용)
// ============================================
// 1.48.0~ StatusPanel의 ◇ 출처 모달 패턴을 PrepScreen·RestScreen에 확산.
// 활성 패시브·유물·각인의 합산 효과를 6~8개 라인으로 압축 표시.
// 모든 라인 클릭 시 buildBreakdownInfo 모달 (StatusPanel과 동일 패턴).
//
// 라인 (조건부 2개 포함, 최대 8개):
//   1. 시작 HP — base HP + strHp 시그니처 + 각인 startHp
//   2. 물리 데미지 % — 근력 시그 + 각인 physDmgPct
//   3. 마법 데미지 % — 지능 시그 + 패시브 + 유물 + 각인 magicDmgPct
//   4. 회피율 % — 패시브 + 유물 + 각인 (computeDerivedStats 활용)
//   5. 치명타율 % — 패시브 + 유물 + 각인
//   6. 받는 데미지 감소/증가 % — 메타·유물·패시브·매력 시그·각인 dmgTakenPct
//   7. (조건부) 화염 각인 발동율 — 이프리트·igniteApplyPct·igniteSuppress
//   8. (조건부) 시작 소울 게이지 — 지능 시그 + 각인 startSoul
// ============================================

import React, { useMemo } from 'react';
import {
  PALETTE,
  getActiveRelicStat,
  getMinorBonus,
  getMetaBonus,
  getCharismaDmgReduction,
  getIfritIgniteRate,
  getStrengthHpBonus,
  getIntellectStartSoul,
  getChampionshipMetaHp,
  hasEffect,
  hasUltimate,
  computeDerivedStats,
} from '../utils/helpers.js';
import { buildBreakdownInfo } from './CardInfoModal.jsx';
import { GAME_CONFIG } from '../data.js';

export default function BuildSummaryPanel({
  classData,
  stats = {},
  skills = {},
  activeSkills = null,
  relics = [],
  activeRelicNames = null,
  ultimates = [],
  engravingFx = {},
  meta = null,
  onLineClick,
}) {
  // useMemo로 토글 변경 시 즉시 재계산
  const data = useMemo(() => {
    if (!classData) return null;
    const playerStr = stats['근력'] || 10;
    const playerInt = stats['지능'] || 10;

    // 유물 stat 집계 (활성 유물 기준)
    const relicStat = {
      dodge: getActiveRelicStat(relics, activeRelicNames, 'dodge'),
      critRate: getActiveRelicStat(relics, activeRelicNames, 'critRate'),
      magicDmg: getActiveRelicStat(relics, activeRelicNames, 'magicDmg'),
      dmgTaken: getActiveRelicStat(relics, activeRelicNames, 'dmgTaken'),
    };

    // 능력치 시그니처
    const strSigPct = Math.round((playerStr * 0.4) * 10) / 10;
    const intSigPct = Math.round((playerInt * 0.4) * 10) / 10;
    const strHp = getStrengthHpBonus(stats);
    const intellectStartSoul = getIntellectStartSoul(stats);

    // 시작 HP — GAME_CONFIG.startHp + 패시브 maxHp+ + 메타 + 챔피언십 + 시그니처 + 각인
    // 1.55.0 픽스: 패시브·메타·챔피언십 출처 누락 추가
    // 1.55.1 픽스: baseStartHp가 classData.startingHp/stats.maxHp 폴백으로 100 떨어지던 버그 수정
    //              (어느 클래스도 해당 필드 미정의). App.jsx:721은 GAME_CONFIG.startHp = 300 사용.
    const baseStartHp = GAME_CONFIG.startHp;
    const hpPassiveBonus = getMinorBonus(skills, 'maxHp+', activeSkills);
    const metaHpBonus = getMetaBonus(meta, 'startHp+10') * 10;
    const champHpBonus = getChampionshipMetaHp(meta);
    const engStartHp = engravingFx.startHp || 0;
    const startHpTotal = baseStartHp + hpPassiveBonus + metaHpBonus + champHpBonus + strHp + engStartHp;

    // 물리 데미지 % (PrepScreen·RestScreen용 압축)
    const physDmgPct = engravingFx.physDmgPct || 0;
    const physPctTotal = Math.round((strSigPct + physDmgPct) * 10) / 10;

    // 마법 데미지 %
    const magicMinor = getMinorBonus(skills, 'magicDmg+', activeSkills);
    const magicRelic = relicStat.magicDmg || 0;
    const magicEngPct = engravingFx.magicDmgPct || 0;
    const magicPctTotal = Math.round((magicMinor + intSigPct + magicRelic + magicEngPct) * 10) / 10;

    // 회피·치명타·각종 derivedStats
    const derived = computeDerivedStats(skills, ultimates, activeSkills, relicStat, engravingFx);
    const dodgeTotal = derived.dodgeRate;
    const critTotal = derived.critRate;

    // 회피·치명 출처 분해 (모달용)
    const dodgeMinor = getMinorBonus(skills, 'dodge+', activeSkills);
    const dodgeLv5 = hasEffect(skills, 'dodge+15', activeSkills) ? 15 : 0;
    const dodgeIntent = hasEffect(skills, 'detailIntent', activeSkills) ? 10 : 0;
    const dodgeRelic = relicStat.dodge || 0;
    const dodgeEng = engravingFx.dodgeRate || 0;

    const critWeakness = hasEffect(skills, 'weaknessPoint', activeSkills) ? 10 : 0;
    const critRelic = relicStat.critRate || 0;
    const critEng = engravingFx.critRate || 0;

    // 받는 데미지 (메타·유물·패시브·매력시그·각인)
    const dmgTakenMetaStacks = getMetaBonus(meta, 'dmgTaken-2%');
    const dmgTakenMeta = dmgTakenMetaStacks * 2;
    const dmgTakenRelic = relicStat.dmgTaken || 0;
    const dmgTakenLv5 = hasEffect(skills, 'dmgTaken-20', activeSkills) ? 20 : 0;
    const dmgTakenCharisma = getCharismaDmgReduction(stats);
    const dmgTakenEng = engravingFx.dmgTakenPct || 0;
    const dmgTakenReduceTotal = dmgTakenMeta + dmgTakenRelic + dmgTakenLv5 + dmgTakenCharisma - dmgTakenEng;

    // 화염 각인 (조건부)
    const ignite = getIfritIgniteRate(skills, ultimates, activeSkills);
    const igniteApplyEng = engravingFx.igniteApplyPct || 0;
    const igniteSuppress = !!engravingFx.igniteSuppress;
    const igniteShow = ignite.has || igniteApplyEng > 0 || igniteSuppress;
    const igniteRateTotal = igniteSuppress ? 0 : Math.min(100, (ignite.has ? ignite.rate : 0) + igniteApplyEng);

    // 시작 소울 (조건부 — 직업이 ultimateId 보유 시만 의미)
    const showSoul = !!classData?.ultimateId;
    const startSoulEng = engravingFx.startSoul || 0;
    const startSoulTotal = intellectStartSoul + startSoulEng;

    return {
      playerStr, playerInt,
      strSigPct, intSigPct, strHp, intellectStartSoul,
      baseStartHp, engStartHp, startHpTotal,
      hpPassiveBonus, metaHpBonus, champHpBonus,
      physDmgPct, physPctTotal,
      magicMinor, magicRelic, magicEngPct, magicPctTotal, intMagic: intSigPct,
      dodgeTotal, dodgeMinor, dodgeLv5, dodgeIntent, dodgeRelic, dodgeEng,
      critTotal, critWeakness, critRelic, critEng,
      dmgTakenReduceTotal, dmgTakenMeta, dmgTakenMetaStacks, dmgTakenRelic, dmgTakenLv5, dmgTakenCharisma, dmgTakenEng,
      ignite, igniteApplyEng, igniteSuppress, igniteShow, igniteRateTotal,
      showSoul, startSoulEng, startSoulTotal,
    };
  }, [classData, stats, skills, activeSkills, relics, activeRelicNames, ultimates, engravingFx, meta]);

  if (!data || !classData) return null;

  const openLine = (info) => {
    if (typeof onLineClick === 'function') onLineClick(buildBreakdownInfo(info));
  };

  const accentColor = classData.color || PALETTE.dawn;

  return (
    <div
      className="px-3 py-2.5 mt-2"
      style={{
        background: `${PALETTE.panel}80`,
        border: `1px solid ${accentColor}30`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="text-[10px] tracking-[0.25em]" style={{ color: accentColor }}>
          ◇ 내 빌드 요약
        </div>
        <div className="text-[9px]" style={{ color: PALETTE.textDim }}>
          ◇ 탭하면 출처 분해
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
        {/* 시작 HP */}
        <button onClick={() => openLine({
          title: '시작 HP',
          totalText: `${data.startHpTotal}`,
          subtitle: '전투 시작 시 최대 HP. 직업 기본값 + 패시브 + 메타 + 챔피언십 + 시그니처 + 각인 합산.',
          color: PALETTE.green,
          sources: [
            { label: '기본 시작 HP (전 직업 공통)', value: data.baseStartHp },
            { label: '패시브 maxHp+', value: data.hpPassiveBonus },
            { label: '영혼의 제단: 시작 HP +10', value: data.metaHpBonus },
            { label: '챔피언십 강화: 시작 HP', value: data.champHpBonus },
            { label: '근력 시그니처 1단계', value: data.strHp, note: `적용 포인트 ${Math.max(0, data.playerStr - 10)}(=근력-10) × +5 HP/p` },
            { label: '각인: 시작 HP', value: data.engStartHp },
          ],
        })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
          <span>시작 HP ◇</span>
          <span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>{data.startHpTotal}</span>
        </button>

        {/* 물리 데미지 % */}
        {(data.physPctTotal > 0) && (
          <button onClick={() => openLine({
            title: '물리 데미지 (%)',
            totalText: `+${data.physPctTotal}%`,
            subtitle: '물리 데미지에 곱셈으로 적용되는 % 보너스.',
            color: '#c4453d',
            sources: [
              { label: '근력 시그니처 기본', value: data.strSigPct, unit: '%', note: `근력 ${data.playerStr} × +0.4%/p` },
              { label: '각인: physDmgPct', value: data.physDmgPct, unit: '%' },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>물리 데미지 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: '#c4453d' }}>+{data.physPctTotal}%</span>
          </button>
        )}

        {/* 마법 데미지 % */}
        {(data.magicPctTotal > 0) && (
          <button onClick={() => openLine({
            title: '마법 데미지',
            totalText: `+${data.magicPctTotal}%`,
            subtitle: '마법 데미지에 가산되는 % 보너스.',
            color: PALETTE.twilight,
            sources: [
              { label: '지능 시그니처 기본', value: data.intMagic, unit: '%', note: `지능 ${data.playerInt} × +0.4%/p` },
              { label: '패시브: 마법 데미지 누적', value: data.magicMinor, unit: '%' },
              { label: '유물: 마법 데미지', value: data.magicRelic, unit: '%' },
              { label: '각인: magicDmgPct', value: data.magicEngPct, unit: '%' },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>마법 데미지 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{data.magicPctTotal}%</span>
          </button>
        )}

        {/* 회피율 */}
        {(data.dodgeTotal !== 0) && (
          <button onClick={() => openLine({
            title: '회피율',
            totalText: `${data.dodgeTotal}%`,
            subtitle: '적의 공격을 회피할 확률.',
            color: PALETTE.green,
            sources: [
              { label: '패시브: 회피율 누적', value: data.dodgeMinor, unit: '%' },
              { label: '회피 Lv.5 (+15%)', value: data.dodgeLv5, unit: '%' },
              { label: '심안 Lv.5 의도 카드 회피', value: data.dodgeIntent, unit: '%' },
              { label: '유물: 회피율', value: data.dodgeRelic, unit: '%' },
              { label: '각인: dodgeRate', value: data.dodgeEng, unit: '%' },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>회피율 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>{data.dodgeTotal}%</span>
          </button>
        )}

        {/* 치명타율 */}
        {(data.critTotal !== 0) && (
          <button onClick={() => openLine({
            title: '치명타율',
            totalText: `${data.critTotal}%`,
            subtitle: '공격 시 치명타가 발동할 확률.',
            color: PALETTE.legendary,
            sources: [
              { label: '심안류 약점 노출 (+10%)', value: data.critWeakness, unit: '%' },
              { label: '유물: 치명타율', value: data.critRelic, unit: '%' },
              { label: '각인: critRate', value: data.critEng, unit: '%' },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>치명타율 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{data.critTotal}%</span>
          </button>
        )}

        {/* 받는 데미지 (양수 = 감소, 음수 = 증가) */}
        {(data.dmgTakenReduceTotal !== 0) && (
          <button onClick={() => openLine({
            title: '받는 데미지',
            totalText: `${data.dmgTakenReduceTotal >= 0 ? '-' : '+'}${Math.abs(data.dmgTakenReduceTotal)}%`,
            subtitle: '적 공격이 깎인 후 받는 데미지의 감소량. 음수면 오히려 증가.',
            color: PALETTE.green,
            sources: [
              { label: '영혼의 제단: 받는 데미지 -2% × 스택', value: data.dmgTakenMeta, unit: '%', note: data.dmgTakenMetaStacks > 0 ? `${data.dmgTakenMetaStacks} 스택` : null },
              { label: '유물: 받는 데미지', value: data.dmgTakenRelic, unit: '%' },
              { label: '회피 Lv.5: 받는 데미지 -20%', value: data.dmgTakenLv5, unit: '%' },
              { label: '매력 시그니처 2단계', value: data.dmgTakenCharisma, unit: '%', note: data.dmgTakenCharisma > 0 ? `매력 17~21 -5% / 22~26 -10% / 27~31 -15%` : null },
              { label: '각인: dmgTakenPct (음수 = 증가)', value: -data.dmgTakenEng, unit: '%' },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>받는 데미지 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: data.dmgTakenReduceTotal >= 0 ? PALETTE.green : PALETTE.accent }}>
              {data.dmgTakenReduceTotal >= 0 ? '-' : '+'}{Math.abs(data.dmgTakenReduceTotal)}%
            </span>
          </button>
        )}

        {/* 화염 각인 발동율 (조건부) */}
        {data.igniteShow && (
          <button onClick={() => openLine({
            title: '화염 각인 발동율',
            totalText: data.igniteSuppress ? '0% (봉인)' : `${data.igniteRateTotal}%`,
            subtitle: data.igniteSuppress
              ? '각인 igniteSuppress로 강제 봉인됨. 이프리트 패시브·igniteApplyPct 무효.'
              : '마법 공격 시 적에게 화염 각인(igniteDmg)이 적용될 확률.',
            color: data.igniteSuppress ? PALETTE.curse : '#d97706',
            sources: data.igniteSuppress ? [
              { label: '각인: igniteSuppress (봉인)', value: 'ON', note: '아래 출처 모두 무효' },
              { label: '이프리트 패시브 누적 (무효)', value: data.ignite.has ? `${data.ignite.rate}%` : null },
              { label: '각인: igniteApplyPct (무효)', value: data.igniteApplyEng > 0 ? `+${data.igniteApplyEng}%` : null },
            ] : [
              { label: '이프리트 패시브 누적', value: data.ignite.has ? data.ignite.rate : 0, unit: '%', note: '이프리트 Lv. + 영겁지화 마일스톤 누적' },
              { label: '각인: igniteApplyPct', value: data.igniteApplyEng, unit: '%' },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>화염 각인 발동율 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: data.igniteSuppress ? PALETTE.curse : '#d97706' }}>
              {data.igniteSuppress ? '0%' : `${data.igniteRateTotal}%`}
            </span>
          </button>
        )}

        {/* 시작 소울 게이지 (조건부) */}
        {data.showSoul && data.startSoulTotal > 0 && (
          <button onClick={() => openLine({
            title: '시작 소울 게이지',
            totalText: `+${data.startSoulTotal}`,
            subtitle: '전투 진입 시 소울 게이지의 초기값.',
            color: PALETTE.dawn,
            sources: [
              { label: '지능 시그니처 1단계', value: data.intellectStartSoul, note: `적용 포인트 ${Math.max(0, data.playerInt - 10)}(=지능-10) × 0.5 = floor → +${data.intellectStartSoul}` },
              { label: '각인: 시작 소울 게이지', value: data.startSoulEng },
            ],
          })} className="flex justify-between text-left" style={{ color: PALETTE.textDim }}>
            <span>시작 소울 ◇</span>
            <span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{data.startSoulTotal}</span>
          </button>
        )}
      </div>
    </div>
  );
}
