// ============================================
// components/regression/RegressionSkillInfo.jsx — 스킬 정보 시트 (1.188.0~, PM 요청: 스킬을 누르면 정보)
// ============================================
// 이야기 화면(능력치 창)·전투 준비·전투 재생의 스킬 카드가 공용으로 연다.
import React from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { REGRESSION_SKILLS, REGRESSION_SKILL_TIERS, REGRESSION_COMBAT, regressionSkillValue } from '../../data.js';
import { BottomSheet } from '../ui/CommonUI.jsx';

const TRIGGER_TEXT = {
  battleStart: () => '전투가 시작되면', firstHit: () => '처음 공격받으면', enemyDodge: () => '상대가 회피하면',
  selfDodge: () => '내가 회피하면', selfHp: (a) => `내 HP가 ${Math.round(a * 100)}% 이하가 되면`, enemyHp: (a) => `적 HP가 ${Math.round(a * 100)}% 이하가 되면`,
  turn: (a) => `${a}턴째가 되면`, enemyHeavy: () => '적이 대공격을 예고하면', lethal: () => '쓰러질 때',
};
const EFFECT_TEXT = {
  strike: '즉시 피해', heal: 'HP 회복', shield: '보호막', guard: '이번 피격 피해 감소', buff: '공격력 증가',
  stun: '적 행동 1회 봉쇄 (+피해)', sure: '다음 평타 필중 + 추가 피해', revive: '부활',
};

export function regressionSkillPowerLines(id, stats = {}) {
  const sk = REGRESSION_SKILLS[id]; if (!sk) return [];
  const lore = 1 + (stats.학식 || 0) * REGRESSION_COMBAT.lorePower;
  const lines = [];
  if (sk.scale) {
    lines.push(`기본 ${sk.base}`);
    for (const [k, c] of Object.entries(sk.scale)) lines.push(`${k} ${stats[k] || 0} × ${c} = ${Math.round((stats[k] || 0) * c * 10) / 10}`);
    if (lore > 1 && sk.effect !== 'buff') lines.push(`학식 ${stats.학식 || 0} → 스킬 위력 ×${lore.toFixed(2)}`);
  }
  if (sk.scaleMult) {
    lines.push(`기본 ${Math.round(sk.base * 100)}%`);
    for (const [k, c] of Object.entries(sk.scaleMult)) lines.push(`${k} ${stats[k] || 0} × ${Math.round(c * 100)}% = +${Math.round((stats[k] || 0) * c * 100)}%`);
  }
  if (sk.reflect) {
    lines.push(`반사 기본 ${sk.reflect.base}`);
    for (const [k, c] of Object.entries(sk.reflect.scale || {})) lines.push(`반사 ${k} ${stats[k] || 0} × ${c}`);
  }
  return lines;
}

export default function RegressionSkillInfo({ skillId, stats = {}, onClose }) {
  const sk = REGRESSION_SKILLS[skillId];
  if (!sk) return null;
  const tier = REGRESSION_SKILL_TIERS[sk.tier];
  const pct = ['buff', 'revive', 'guard'].includes(sk.effect);
  return (
    <BottomSheet title="✦ 스킬 정보" onClose={onClose}>
      <div className="space-y-3 pb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-1.5 rounded" style={{ color: tier.color, border: `1px solid ${tier.color}` }}>{tier.name}</span>
          <b className="text-[15px]" style={{ color: PALETTE.text }}>{sk.name}</b>
        </div>
        <div className="text-[12px]" style={{ color: PALETTE.textDim }}>{sk.desc}</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[['발동 조건', (TRIGGER_TEXT[sk.trigger] || (() => sk.trigger))(sk.at)], ['효과', EFFECT_TEXT[sk.effect] || sk.effect],
            ['현재 위력', `${regressionSkillValue(skillId, stats)}${pct ? '%' : ''}`], ['사용 횟수', '전투당 1번 (자동)']].map(([l, v]) => (
            <div key={l} className="px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight }}>
              <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{l}</div>
              <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>{v}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[12px] font-bold mb-1" style={{ color: PALETTE.dawn }}>위력 계산</div>
          {regressionSkillPowerLines(skillId, stats).map((l, i) => <div key={i} className="text-[11px]" style={{ color: PALETTE.textDim }}>· {l}</div>)}
          <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>관련 능력치가 높을수록 위력이 오른다. 전투 태세 배율은 별도로 곱해진다.</div>
        </div>
        <button className="ui-press w-full text-[13px] font-bold" onClick={onClose}
          style={{ minHeight: 44, borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text }}>닫기</button>
      </div>
    </BottomSheet>
  );
}
