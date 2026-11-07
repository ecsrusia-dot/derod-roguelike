// ============================================
// components/regression/RegressionSkillCutin.jsx — 스킬 발동 컷인 (1.189.0~, PM 요청)
// ============================================
// 화면 전체에 스킬명 노출 + 등급별로 화려함 차등:
//   일반 — 가로 띠 + 슬라이드 인 + 은은한 글로우
//   고급 — 청색 플래시 + 사선 광선 3줄 + 펀치 확대 + 약한 흔들림
//   기연 — 백금 섬광 + 회전 방사광 + 충격파 링 2겹 + 불꽃 입자 + 금빛 그라데이션 글자 + 강한 흔들림
// 지속 시간은 배속을 따른다 (--rg-cut-dur). ⏩ 스킵(speed ≥100)에서는 표시하지 않는다. 키프레임은 index.css rg-cut-*.
import React from 'react';
import { REGRESSION_SKILLS } from '../../data.js';

export const REGRESSION_CUTIN_MS = { normal: 1100, advanced: 1450, fortune: 2000, bond: 1450 };
const TIER = {
  normal: { label: '일반 스킬', color: '#e8dccb', glow: '#c9b8a4', size: 30 },
  advanced: { label: '고급 스킬', color: '#dff0ff', glow: '#5fa8e8', size: 34 },
  fortune: { label: '기 연', color: '#ffe9a8', glow: '#ffb02e', size: 40 },
  bond: { label: '유대 스킬', color: '#e6ffe9', glow: '#6fd38a', size: 34, look: 'advanced' },   // 1.200.0~ 고급 연출 + 초록
};

export default function RegressionSkillCutin({ skillId, durMs, nonce }) {
  const sk = REGRESSION_SKILLS[skillId];
  if (!sk) return null;
  const tierId = sk.tier in TIER ? sk.tier : 'normal';
  const t = TIER[tierId];
  const style = { '--rg-cut-dur': `${Math.max(250, durMs)}ms`, '--rg-glow': t.glow };
  return (
    <div key={nonce} className={`rg-cut rg-cut-${t.look || tierId}`} style={style} aria-live="polite">
      <div className="rg-cut-flash" />
      {tierId !== 'normal' && <div className="rg-cut-vignette" />}
      {tierId === 'fortune' && <div className="rg-cut-rays" />}
      {tierId === 'fortune' && <><div className="rg-cut-ring" /><div className="rg-cut-ring rg-cut-ring2" /></>}
      {tierId !== 'normal' && (
        <div className="rg-cut-streaks">
          {[0, 1, 2].map(i => <span key={i} style={{ top: `${28 + i * 18}%`, animationDelay: `calc(var(--rg-cut-dur) * ${0.04 * i})` }} />)}
        </div>
      )}
      {tierId === 'fortune' && (
        <div className="rg-cut-sparks">
          {Array.from({ length: 14 }, (_, i) => <span key={i} style={{ '--a': `${(360 / 14) * i}deg`, '--d': `${90 + (i % 3) * 40}px` }} />)}
        </div>
      )}
      <div className="rg-cut-center"><div className="rg-cut-band">
        <div className="rg-cut-tier" style={{ color: t.glow }}>{t.label}</div>
        <div className="rg-cut-name" style={{ fontSize: t.size, color: t.color, textShadow: `0 0 12px ${t.glow}, 0 0 28px ${t.glow}, 0 2px 4px #000` }}>{sk.name}</div>
      </div></div>
    </div>
  );
}
