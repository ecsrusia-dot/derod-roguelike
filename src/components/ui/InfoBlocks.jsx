// ============================================
// components/ui/InfoBlocks.jsx — 정보창 공용 부품 (1.244.0)
// ============================================
// PM 결정: 정보창은 「어디서 적용되나」 기준으로 구획을 나누고, 각 줄은 「항목 — 값」 표로 쓴다.
// 사역마 설명창에 먼저 적용하고, 장비·스킬 정보창 등은 후속 PR에서 같은 부품으로 바꾼다.
//   InfoSection  색 띠 머리 구획 카드
//   InfoRow      왼쪽 항목 / 오른쪽 값
//   StatTiles    능력치 타일 격자
//   ValueChip    값 칩 (증감 표시 포함)
//   HiNum        문장 속 숫자 강조
// ============================================
import React from 'react';
import { PALETTE } from '../../utils/helpers.js';

export function InfoSection({ icon, title, color = PALETTE.dawn, right, children, dim = false, style }) {
  return (
    <div style={{ borderRadius: 14, border: '1px solid var(--ui-line)', borderLeft: `3px solid ${color}`, background: 'var(--ui-glass)', padding: '9px 11px', opacity: dim ? 0.6 : 1, ...style }}>
      <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, fontWeight: 800, color, marginBottom: children ? 4 : 0 }}>
        {icon && <span>{icon}</span>}<span>{title}</span>
        {right != null && <span className="ml-auto" style={{ fontSize: 11, fontWeight: 600, color: PALETTE.textDim }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

export function InfoRow({ label, value, note, color = PALETTE.text, first = false }) {
  return (
    <div style={{ padding: '4px 0', borderTop: first ? 'none' : '1px dashed rgba(212,165,116,0.12)' }}>
      <div className="flex items-baseline justify-between gap-2" style={{ fontSize: 12 }}>
        <span style={{ color: PALETTE.textDim }}>{label}</span>
        <span className="text-right" style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      {note && <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 1 }}>{note}</div>}
    </div>
  );
}

export function StatTiles({ items, cols = 3 }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map(it => (
        <div key={it.label} style={{ borderRadius: 10, padding: '5px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${it.accent ? `${it.accent}66` : 'var(--ui-line)'}` }}>
          <div style={{ fontSize: 11, color: PALETTE.textDim }}>{it.label}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: it.accent || PALETTE.text, lineHeight: 1.2 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

// delta: { kind: 'up'|'down'|'new'|'gone', text }
const DELTA_C = { up: '#8fe08a', new: '#8fe08a', down: '#e07a6a', gone: '#e07a6a' };
export function ValueChip({ label, value, delta, tone }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 7px', borderRadius: 7, background: tone ? `${tone}14` : 'rgba(255,255,255,0.05)', border: `1px solid ${tone ? `${tone}55` : 'var(--ui-line)'}`, color: PALETTE.textDim, lineHeight: 1.5 }}>
      {label}{value != null && <> <b style={{ color: PALETTE.text }}>{value}</b></>}
      {delta && <b style={{ color: DELTA_C[delta.kind], marginLeft: 4 }}>{delta.text}</b>}
    </span>
  );
}

// 문장 속 숫자(+54% · 4턴 · 148% 등)를 굵게
export function HiNum({ text, color = PALETTE.text }) {
  const parts = String(text).split(/([+-]?\d+(?:\.\d+)?(?:%p|%|턴|회)?)/g);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} style={{ color }}>{p}</b> : <span key={i}>{p}</span>))}</>;
}
