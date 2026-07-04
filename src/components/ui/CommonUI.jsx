// ============================================
// components/ui/CommonUI.jsx — 공통 UI 부품 (1.64.0 리디자인 PR 1 신설)
// ============================================
// 리디자인 시안(2026-07 승인)의 토큰·부품 구현.
// 색·모서리는 index.css의 :root CSS 변수(--ui-*, --r-*)를 사용한다.
// PR 2부터 타이틀·원정·맵 화면이 순차 채택 — 그 전까지 기존 화면 영향 0.
//
// 부품 목록:
//   ScreenHeader — 뒤로가기(40px 타깃) + 타이틀 + 우측 슬롯. 뒤로가기 패턴 통일용
//   GlassPanel   — 반투명 블러 패널 (.ui-glass 래퍼)
//   Chip         — 상태·재화 pill 칩 (최소 폰트 10.5px)
//   UIButton     — primary(주 액션 전용 accent) / ghost / gold 3종
//   BottomSheet  — 그래버 + 배경 탭 닫기. absolute 포지션이라 PC 폰 프레임 안에 갇힘
// ============================================
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';

// 공통 화면 헤더 — 전 화면 뒤로가기 1종 통일
export function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <div className="flex items-center gap-2.5 px-3 flex-none" style={{ minHeight: 56 }}>
      {onBack && (
        <button
          onClick={onBack}
          aria-label="뒤로가기"
          className="ui-press flex items-center justify-center flex-none"
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--r-btn)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--ui-line)',
            color: PALETTE.dawn,
          }}
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold truncate" style={{ color: PALETTE.text }}>{title}</div>
        {subtitle && (
          <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// 반투명 블러 글래스 패널
export function GlassPanel({ children, strong = false, className = '', style, onClick }) {
  return (
    <div
      className={`ui-glass ${className}`}
      onClick={onClick}
      style={{
        ...(strong ? { background: 'var(--ui-glass-strong)' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// 상태·재화 칩 — color 하나로 글자·테두리·배경 파생
export function Chip({ icon, children, color = PALETTE.dawn, style }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap flex-none"
      style={{
        height: 22,
        padding: '0 9px',
        borderRadius: 999,
        fontSize: 10.5,
        color,
        border: `1px solid ${color}55`,
        background: `${color}18`,
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

// 버튼 — accent는 primary에만 허용 (시안 02절 색 역할 규칙)
export function UIButton({ variant = 'primary', children, onClick, disabled, className = '', style }) {
  const variants = {
    primary: {
      background: `linear-gradient(160deg, #d05248, ${PALETTE.accentDim})`,
      border: '1px solid rgba(232,176,74,0.35)',
      color: '#ffe9d2',
      boxShadow: '0 6px 24px -6px rgba(196,69,61,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
    },
    ghost: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--ui-line)',
      color: PALETTE.text,
    },
    gold: {
      background: 'rgba(232,176,74,0.08)',
      border: '1px solid rgba(232,176,74,0.35)',
      color: PALETTE.legendary,
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`ui-press w-full ${className}`}
      style={{
        height: 48,
        borderRadius: 'var(--r-btn)',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '0.12em',
        ...variants[variant],
        ...(disabled ? { opacity: 0.45 } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// 바텀시트 — 엄지 도달권 모달. 배경 탭 또는 그래버 영역 탭으로 닫기
export function BottomSheet({ title, onClose, children, maxHeight = '88%' }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="ui-glass flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ui-glass-strong)',
          borderRadius: '22px 22px 0 0',
          borderBottom: 'none',
          maxHeight,
          animation: 'ui-sheet-up 0.32s cubic-bezier(.16,.8,.3,1) backwards',
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="flex-none pt-2.5 pb-1 flex justify-center w-full"
          style={{ background: 'transparent', border: 'none' }}
        >
          <span style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(212,165,116,0.3)', display: 'block' }} />
        </button>
        {title && (
          <div className="flex-none text-center text-sm font-semibold pb-2" style={{ color: PALETTE.text }}>{title}</div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-5">{children}</div>
      </div>
    </div>
  );
}
