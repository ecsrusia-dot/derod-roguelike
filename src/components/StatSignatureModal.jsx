// ============================================
// components/StatSignatureModal.jsx — 능력치 시그니처 설명 모달
// ============================================
// 1.37.0~ 4 스탯 (근력·민첩·지능·매력) 클릭 시 시그니처 효과 표시.
// 1단계 (11+) / 2단계 (17+) 두 효과 + 자동 가산 효과 안내.
// 현재 스탯에 따라 발동 여부와 누진 값을 동적으로 보여준다.
// ============================================

import React from 'react';
import { X } from 'lucide-react';
import {
  PALETTE,
  getStrengthHpBonus,
  getStrengthSoulPerPhys,
  getAgilityCritDmgBonus,
  getAgilitySoulOnDodge,
  getIntellectStartSoul,
  getIntellectSoulPerMagic,
  getCharismaHealBonus,
  getCharismaDmgReduction,
} from '../utils/helpers.js';

const SIGNATURES = {
  근력: {
    color: PALETTE.accent,
    sub: '검술·압박',
    auto: '물리 데미지 +0.5/포인트 (자동 가산)',
    tier1: {
      label: '1단계 · 근력 11+',
      desc: '최대 HP +5/포인트',
      calc: (stats) => getStrengthHpBonus(stats),
      suffix: '',
    },
    tier2: {
      label: '2단계 · 근력 17+',
      desc: '물리 시전 시 영혼 게이지 +1/5단위',
      calc: (stats) => getStrengthSoulPerPhys(stats),
      suffix: '',
    },
  },
  민첩: {
    color: PALETTE.green,
    sub: '회피·정밀',
    auto: '회피율 +0.3%/포인트 · 치명타율 +0.5%/포인트 (자동 가산)',
    tier1: {
      label: '1단계 · 민첩 11+',
      desc: '치명타 데미지 +2%/포인트',
      calc: (stats) => getAgilityCritDmgBonus(stats),
      suffix: '%',
    },
    tier2: {
      label: '2단계 · 민첩 17+',
      desc: '회피 성공 시 영혼 게이지 +5/5단위',
      calc: (stats) => getAgilitySoulOnDodge(stats),
      suffix: '',
    },
  },
  지능: {
    color: PALETTE.legendary,
    sub: '주문·정신',
    auto: '마법 데미지 +0.7/포인트 (자동 가산)',
    tier1: {
      label: '1단계 · 지능 11+',
      desc: '전투 시작 시 영혼 게이지 +0.5/포인트 (내림)',
      calc: (stats) => getIntellectStartSoul(stats),
      suffix: '',
    },
    tier2: {
      label: '2단계 · 지능 17+',
      desc: '마법 시전 시 영혼 게이지 +1/5단위',
      calc: (stats) => getIntellectSoulPerMagic(stats),
      suffix: '',
    },
  },
  매력: {
    color: PALETTE.dawn,
    sub: '신앙·축복',
    auto: '영혼 획득량 +0.5%/포인트 (자동 가산)',
    tier1: {
      label: '1단계 · 매력 11+',
      desc: '회복 효율 +0.5%/포인트',
      calc: (stats) => getCharismaHealBonus(stats),
      suffix: '%',
    },
    tier2: {
      label: '2단계 · 매력 17+',
      desc: '받는 데미지 -5%/5단위',
      calc: (stats) => getCharismaDmgReduction(stats),
      suffix: '%',
    },
  },
};

export default function StatSignatureModal({ stat, stats, onClose }) {
  const cfg = SIGNATURES[stat];
  if (!cfg) return null;
  const current = stats?.[stat] || 0;
  const t1Val = cfg.tier1.calc(stats);
  const t2Val = cfg.tier2.calc(stats);
  const t1Active = t1Val > 0;
  const t2Active = t2Val > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-[88%] max-w-sm"
        style={{ background: PALETTE.bgDeep, border: `1px solid ${cfg.color}80`, boxShadow: `0 0 24px ${cfg.color}40` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}15` }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.25em]" style={{ color: cfg.color }}>◆ 시그니처</span>
            <span className="text-base font-bold" style={{ color: PALETTE.text }}>{stat}</span>
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>· {cfg.sub}</span>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: PALETTE.textDim }} /></button>
        </div>

        <div className="px-4 py-3">
          <div className="text-center mb-3 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[10px]" style={{ color: PALETTE.textDim }}>현재 {stat}</div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: cfg.color }}>{current}</div>
          </div>

          <div className="text-[10px] mb-3 px-2 py-2" style={{ background: `${cfg.color}08`, color: PALETTE.textDim, border: `1px dashed ${cfg.color}30` }}>
            {cfg.auto}
          </div>

          {/* 1단계 */}
          <div className="mb-3 px-3 py-2" style={{ border: `1px solid ${t1Active ? cfg.color : PALETTE.panelBorder}`, background: t1Active ? `${cfg.color}10` : 'transparent', opacity: t1Active ? 1 : 0.55 }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] tracking-[0.15em]" style={{ color: cfg.color }}>{cfg.tier1.label}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: t1Active ? cfg.color : PALETTE.textDim }}>
                {t1Active ? `+${t1Val}${cfg.tier1.suffix} 발동` : '미발동'}
              </span>
            </div>
            <div className="text-[11px] leading-snug" style={{ color: PALETTE.text }}>{cfg.tier1.desc}</div>
          </div>

          {/* 2단계 */}
          <div className="mb-1 px-3 py-2" style={{ border: `1px solid ${t2Active ? cfg.color : PALETTE.panelBorder}`, background: t2Active ? `${cfg.color}10` : 'transparent', opacity: t2Active ? 1 : 0.55 }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] tracking-[0.15em]" style={{ color: cfg.color }}>{cfg.tier2.label}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: t2Active ? cfg.color : PALETTE.textDim }}>
                {t2Active ? `+${t2Val}${cfg.tier2.suffix} 발동` : '미발동'}
              </span>
            </div>
            <div className="text-[11px] leading-snug" style={{ color: PALETTE.text }}>{cfg.tier2.desc}</div>
          </div>

          <p className="text-[9px] text-center mt-3" style={{ color: PALETTE.textDim }}>
            모든 직업이 보석으로 시그니처 효과를 누릴 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
