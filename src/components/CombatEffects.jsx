// ============================================
// components/CombatEffects.jsx — Phase 1 전투 시각 효과
// ============================================
// 부유 데미지 숫자 / 미스 텍스트 / 빨간 비네트 / 흰 플래시 오버레이.
// 모든 키프레임은 src/index.css에 정의 (.fx-*).
// ============================================

import React from 'react';
import { PALETTE } from '../utils/helpers.js';

// 한 번 떠올랐다 사라지는 데미지/회복/미스 라벨
// item: { id, kind: 'damage'|'heal'|'crit'|'miss', value?, side: 'enemy'|'player' }
// position은 부모가 absolute로 잡아주고 이 컴포넌트는 그 위에 중앙정렬 부유.
export function FloatingLabel({ kind, value, label }) {
  let color = PALETTE.text;
  let cls = 'fx-float-up';
  let text;
  let size = 'text-lg';
  let weight = 'font-bold';
  let shadow = '0 2px 6px rgba(0,0,0,0.6)';

  if (kind === 'damage') {
    color = '#ff6a6a';
    text = `-${value}`;
  } else if (kind === 'crit') {
    color = '#ffd86b';
    text = `-${value}!`;
    cls = 'fx-float-crit';
    size = 'text-2xl';
    shadow = `0 0 12px rgba(255,216,107,0.7), 0 2px 6px rgba(0,0,0,0.7)`;
  } else if (kind === 'heal') {
    color = '#7ed99a';
    text = `+${value}`;
  } else if (kind === 'miss') {
    color = PALETTE.textDim || '#9b8975';
    text = label || '회피!';
    cls = 'fx-miss';
    size = 'text-sm';
    weight = 'font-medium';
  } else {
    text = String(value ?? label ?? '');
  }

  return (
    <span
      className={`absolute left-1/2 ${cls} ${size} ${weight} tabular-nums select-none pointer-events-none`}
      style={{
        top: '20%',
        color,
        textShadow: shadow,
        fontFamily: '"Cinzel", serif',
        zIndex: 30,
      }}
    >
      {text}
    </span>
  );
}

// 화면 가장자리 빨간 비네트 — 플레이어 피격 위기감용
// trigger: 이펙트를 재생하기 위한 key (값이 바뀔 때마다 새로 재생)
export function DamageVignette({ trigger }) {
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      className="absolute inset-0 fx-vignette pointer-events-none"
      style={{
        zIndex: 25,
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(196,69,61,0.55) 100%)`,
      }}
    />
  );
}

// 흰 플래시 오버레이 — 적/플레이어 컨테이너 안에 겹쳐 깔면 됨
export function WhiteFlash({ trigger }) {
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      className="absolute inset-0 fx-white-flash pointer-events-none"
      style={{ background: '#ffffff', mixBlendMode: 'overlay', zIndex: 20 }}
    />
  );
}
