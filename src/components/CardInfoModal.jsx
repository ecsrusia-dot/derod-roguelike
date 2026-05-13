// ============================================
// components/CardInfoModal.jsx — 패시브/유물/액티브 스킬 공용 정보 모달
// ============================================
// 준비/정비/전투 상태창 등 어디서든 동일한 모달로 표시.
// info.tiers가 있으면 마일스톤 리스트를 색상 강조로 렌더 (특수문자는 통일).
// info.action이 있으면 하단에 선택 토글 버튼 표시 (준비 화면용).
// ============================================

import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { PASSIVE_SKILLS, COMBAT_SKILLS } from '../data.js';

const TIER_PREFIX = '◇';  // 모든 마일스톤에 같은 prefix 사용

export function buildPassiveInfo(name, currentLv = null) {
  const sk = PASSIVE_SKILLS[name];
  if (!sk) return null;
  const lv = currentLv ?? 0;
  const tiers = Object.entries(sk.tiers || {})
    .map(([tierLv, t]) => ({
      level: Number(tierLv),
      text: t.text,
      unlocked: lv >= Number(tierLv),
    }))
    .sort((a, b) => a.level - b.level);
  return {
    kind: 'passive',
    color: sk.color,
    tag: '◆ 패시브 스킬',
    title: name,
    badge: lv > 0 ? `Lv.${lv}` : null,
    subtitle: sk.desc || null,
    minorEffect: sk.minorEffect && lv > 0 ? {
      desc: sk.minorEffect.desc,
      currentValue: sk.minorEffect.perLv ? sk.minorEffect.perLv * lv : null,
    } : (sk.minorEffect ? { desc: sk.minorEffect.desc, currentValue: null } : null),
    tiers,
  };
}

export function buildRelicInfo(rel) {
  if (!rel) return null;
  const stats = [];
  if (rel.statBonus) {
    Object.entries(rel.statBonus).forEach(([k, v]) => stats.push([k, String(v)]));
  }
  return {
    kind: 'relic',
    color: rel.color,
    tag: '◆ 유물',
    title: rel.name,
    subtitle: rel.desc || null,
    stats,
  };
}

export function buildActiveSkillInfo(name, classColor = null) {
  const sk = COMBAT_SKILLS[name];
  if (!sk) return null;
  const stats = [];
  if (sk.type) {
    const typeLabel = sk.type === 'physical' ? '물리' : sk.type === 'magic' ? '마법' : sk.type === 'defense' ? '방어' : sk.type;
    stats.push(['타입', typeLabel]);
  }
  if (typeof sk.cost === 'number') stats.push(['마나', String(sk.cost)]);
  if (typeof sk.cd === 'number') stats.push(['쿨다운', `${sk.cd}턴`]);
  if (Array.isArray(sk.baseDmg)) stats.push(['데미지', `${sk.baseDmg[0]}~${sk.baseDmg[1]}`]);
  if (typeof sk.defense === 'number') stats.push(['방어', `+${sk.defense}`]);
  if (sk.pierce) stats.push(['특수', '방어 무시']);
  return {
    kind: 'active',
    color: classColor || PALETTE.accent,
    tag: '◆ 액티브 스킬',
    title: sk.name || name,
    subtitle: sk.desc || null,
    stats,
  };
}

export default function CardInfoModal({ info, action = null, onClose }) {
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
        {/* 헤더 — 태그 + 제목 + 배지(Lv 등) */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${accent}40` }}>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>{info.tag}</div>
            <div
              className="text-base font-bold mt-0.5"
              style={{ color: accent, fontFamily: '"Cinzel", serif' }}
            >
              {info.title}
            </div>
          </div>
          {info.badge && (
            <div
              className="text-[11px] px-2 py-0.5 ml-2"
              style={{ color: accent, border: `1px solid ${accent}80`, background: `${accent}15` }}
            >
              {info.badge}
            </div>
          )}
        </div>

        {/* 본문 */}
        <div className="px-4 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {info.subtitle && (
            <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>
              {info.subtitle}
            </div>
          )}

          {/* stats — 2열 그리드 (액티브 스킬·유물용) */}
          {info.stats && info.stats.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {info.stats.map(([k, v], i) => (
                <div
                  key={i}
                  className="px-2 py-1 text-[10px] flex items-center justify-between"
                  style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}
                >
                  <span style={{ color: PALETTE.textDim }}>{k}</span>
                  <span style={{ color: PALETTE.text }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* minorEffect — 패시브 누적 효과 */}
          {info.minorEffect && (
            <div
              className="text-[11px] leading-relaxed px-3 py-2"
              style={{ color: PALETTE.text, background: `${accent}08`, border: `1px solid ${accent}30` }}
            >
              <span style={{ color: accent, marginRight: '4px' }}>◇ 누적</span>
              {info.minorEffect.desc}
              {typeof info.minorEffect.currentValue === 'number' && (
                <span style={{ color: accent, marginLeft: '6px', fontWeight: 'bold' }}>
                  (현재 +{info.minorEffect.currentValue})
                </span>
              )}
            </div>
          )}

          {/* tiers — 마일스톤 (Lv.3/5/7 등). 모두 같은 prefix, 색상 차이로 해금 표시 */}
          {info.tiers && info.tiers.length > 0 && (
            <div className="space-y-1">
              {info.tiers.map(t => (
                <div
                  key={t.level}
                  className="text-[11px] leading-relaxed flex items-start gap-1.5"
                  style={{
                    color: t.unlocked ? PALETTE.text : PALETTE.textDim,
                    opacity: t.unlocked ? 1 : 0.55,
                  }}
                >
                  <span
                    style={{
                      color: t.unlocked ? accent : PALETTE.textDim,
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >{TIER_PREFIX}</span>
                  <span>
                    <span style={{
                      color: t.unlocked ? accent : PALETTE.textDim,
                      fontWeight: 'bold',
                      marginRight: '4px',
                    }}>Lv.{t.level}</span>
                    {t.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 — 선택 토글 (있을 때) + 닫기 */}
        <div className="px-3 py-3 space-y-2" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="w-full py-2 text-[12px] tracking-[0.2em] font-bold"
              style={{
                background: action.disabled
                  ? 'transparent'
                  : `linear-gradient(180deg, ${action.color || accent}40, ${action.color || accent}20)`,
                border: `1px solid ${action.disabled ? PALETTE.panelBorder : (action.color || accent)}`,
                color: action.disabled ? PALETTE.textDim : PALETTE.text,
                opacity: action.disabled ? 0.5 : 1,
              }}
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-[11px] tracking-[0.2em]"
            style={{ background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
