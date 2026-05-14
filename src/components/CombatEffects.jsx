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

// ============================================
// Phase 2: 스킬 타입별 이팩트
// ============================================

// 슬래시(물리 공격) — 대각선 검선 + 잔광. crit이면 노란/금색, 평타면 흰색
export function SlashFx({ trigger, crit }) {
  if (!trigger) return null;
  const color = crit ? '#ffd86b' : '#f4e6c8';
  const glow = crit ? 'rgba(255,216,107,0.55)' : 'rgba(244,230,200,0.4)';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      {/* 잔광 */}
      <div
        className="absolute fx-slash-glow"
        style={{
          width: 220, height: 220,
          background: `radial-gradient(circle, ${glow} 0%, transparent 65%)`,
          filter: 'blur(4px)',
        }}
      />
      {/* SVG 검선 — 좌상→우하 대각선 */}
      <svg
        viewBox="0 0 200 200"
        className="absolute"
        style={{ width: 240, height: 240, overflow: 'visible' }}
      >
        <path
          d="M 18 162 Q 70 110 100 96 T 184 32"
          fill="none"
          stroke={color}
          strokeWidth={crit ? 5 : 3.5}
          strokeLinecap="round"
          className="fx-slash-stroke"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
    </div>
  );
}

// 마법 임팩트 — 룬 원형 + 십자 빔
export function MagicImpactFx({ trigger, color = '#a479d4' }) {
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute fx-magic-rune"
        style={{
          width: 200, height: 200,
          filter: `drop-shadow(0 0 8px ${color})`,
        }}
      >
        <circle cx="100" cy="100" r="74" fill="none" stroke={color} strokeWidth="2.5" opacity="0.85" />
        <circle cx="100" cy="100" r="58" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" strokeDasharray="6 8" />
        <circle cx="100" cy="100" r="40" fill="none" stroke={color} strokeWidth="1.2" opacity="0.5" />
        {/* 룬 표식 6개 */}
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <g key={deg} transform={`rotate(${deg} 100 100)`}>
            <rect x="96" y="22" width="8" height="10" fill={color} opacity="0.9" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// 마법 입자 — 8개 입자가 중앙에서 방사형으로 흩어짐
export function MagicParticles({ trigger, color = '#c8a8e8', count = 10 }) {
  if (!trigger) return null;
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i + (trigger % 23);
    const dist = 70 + ((i * 13) % 50);
    const size = 5 + ((i * 7) % 4);
    const delay = (i % 4) * 0.04;
    return { angle, dist, size, delay, i };
  });
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 23 }}
    >
      {particles.map(p => (
        <span
          key={p.i}
          className="absolute fx-particle"
          style={{
            top: '50%', left: '50%',
            width: p.size, height: p.size,
            background: color,
            borderRadius: '50%',
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            animationDelay: `${p.delay}s`,
            '--p-angle': `${p.angle}deg`,
            '--p-dist': `${p.dist}px`,
          }}
        />
      ))}
    </div>
  );
}

// 방어 결계 링 — 플레이어 둘레로 확장하는 청록 펄스 (defense 스킬 사용 시)
export function BarrierRing({ trigger, color = '#7ba3c4' }) {
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      <div
        className="absolute fx-barrier-pulse"
        style={{
          top: '50%', left: '50%',
          width: 180, height: 180,
          border: `3px solid ${color}`,
          borderRadius: '50%',
          boxShadow: `0 0 18px ${color}, inset 0 0 18px ${color}`,
        }}
      />
      <div
        className="absolute fx-barrier-pulse"
        style={{
          top: '50%', left: '50%',
          width: 110, height: 110,
          border: `2px solid ${color}`,
          borderRadius: '50%',
          opacity: 0.7,
          animationDelay: '0.12s',
        }}
      />
    </div>
  );
}

// 방어 소진 펄스 — 적 공격이 방어를 깎을 때 작은 파편 + 빠른 펄스
export function BarrierBreakFx({ trigger, color = '#7ba3c4' }) {
  if (!trigger) return null;
  const shards = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 23 }}
    >
      <div
        className="absolute fx-barrier-break"
        style={{
          top: '50%', left: '50%',
          width: 90, height: 90,
          border: `2px solid ${color}`,
          borderRadius: '50%',
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      {shards.map(angle => (
        <span
          key={angle}
          className="absolute fx-barrier-shard"
          style={{
            top: '50%', left: '50%',
            width: 6, height: 2,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            '--s-angle': `${angle}deg`,
          }}
        />
      ))}
    </div>
  );
}

// 관통 스러스트 — 좌→우 직선 빔 + 끝점 임팩트 (방랑검사 슬롯 2)
export function ThrustFx({ trigger, crit }) {
  if (!trigger) return null;
  const color = crit ? '#ffd86b' : '#cfd6e0';
  const glow = crit ? 'rgba(255,216,107,0.65)' : 'rgba(207,214,224,0.45)';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      {/* 직선 빔 — 좌측에서 빠르게 관통 */}
      <div
        className="absolute fx-thrust-line"
        style={{
          top: '50%', left: '50%',
          width: 260, height: crit ? 6 : 4,
          background: `linear-gradient(90deg, transparent 0%, ${color} 45%, #fff 50%, ${color} 55%, transparent 100%)`,
          boxShadow: `0 0 14px ${color}, 0 0 24px ${glow}`,
          borderRadius: 2,
        }}
      />
      {/* 끝점 임팩트 — 중앙에서 폭발 */}
      <div
        className="absolute fx-thrust-tip"
        style={{
          top: '50%', left: '50%',
          width: 60, height: 60,
          background: `radial-gradient(circle, ${color} 0%, ${glow} 35%, transparent 70%)`,
          borderRadius: '50%',
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
}

// 방검 다이아몬드 가드 — 회전 사각형 + 사방 스파크 (방랑검사 슬롯 3)
export function BladeGuardFx({ trigger, color = '#9bb8d4' }) {
  if (!trigger) return null;
  const sparks = [0, 90, 180, 270];
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      {/* 다이아몬드 (45도 회전 사각형) */}
      <div
        className="absolute fx-blade-guard"
        style={{
          top: '50%', left: '50%',
          width: 130, height: 130,
          border: `3px solid ${color}`,
          boxShadow: `0 0 18px ${color}, inset 0 0 14px ${color}`,
          background: `linear-gradient(135deg, ${color}22 0%, transparent 100%)`,
        }}
      />
      {/* 내부 작은 다이아몬드 */}
      <div
        className="absolute fx-blade-guard"
        style={{
          top: '50%', left: '50%',
          width: 70, height: 70,
          border: `2px solid ${color}`,
          opacity: 0.7,
          animationDelay: '0.1s',
        }}
      />
      {/* 사방 스파크 */}
      {sparks.map(angle => (
        <span
          key={angle}
          className="absolute fx-blade-guard-spark"
          style={{
            top: '50%', left: '50%',
            width: 10, height: 2,
            background: color,
            boxShadow: `0 0 8px ${color}`,
            '--g-angle': `${angle}deg`,
          }}
        />
      ))}
    </div>
  );
}

// 무영(無影)의 일격 — 3중 슬래시 (X자 + 가로) + 그림자 오라 (방랑검사 슬롯 4)
export function ShadowStrikeFx({ trigger }) {
  if (!trigger) return null;
  const color = '#ffd86b';
  const shadow = '#1a0f0a';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 24 }}
    >
      {/* 그림자 오라 — 검은 배경 + 골든 림 */}
      <div
        className="absolute fx-shadow-aura"
        style={{
          width: 280, height: 280,
          background: `radial-gradient(circle, ${shadow}cc 0%, ${shadow}66 35%, transparent 70%)`,
          boxShadow: `0 0 40px rgba(255,216,107,0.6), inset 0 0 30px rgba(255,216,107,0.3)`,
          borderRadius: '50%',
        }}
      />
      {/* 3중 슬래시 SVG — 시차를 두고 발동 */}
      <svg
        viewBox="0 0 200 200"
        className="absolute"
        style={{ width: 280, height: 280, overflow: 'visible' }}
      >
        {/* 슬래시 1: 좌상→우하 대각선 */}
        <path
          d="M 18 162 Q 70 110 100 96 T 184 32"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          className="fx-shadow-strike"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* 슬래시 2: 우상→좌하 대각선 (X자 완성) */}
        <path
          d="M 184 162 Q 130 110 100 96 T 18 32"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          className="fx-shadow-strike fx-shadow-strike-2"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* 슬래시 3: 가로 (피니시) */}
        <path
          d="M 14 100 Q 80 90 100 100 T 186 100"
          fill="none"
          stroke="#fff"
          strokeWidth={6}
          strokeLinecap="round"
          className="fx-shadow-strike fx-shadow-strike-3"
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
    </div>
  );
}

// 액티브 궁극 컷인 — 화면 전체에 골든 버스트 + 궁극명 배너 (~0.9초)
// info: { name, color } 이거나 null
export function UltimateCutin({ info }) {
  if (!info) return null;
  return (
    <div
      key={info.name}
      className="absolute inset-0 pointer-events-none flex items-center justify-center fx-ult-burst"
      style={{
        zIndex: 60,
        background: `radial-gradient(ellipse at center, ${info.color}aa 0%, ${info.color}33 30%, rgba(0,0,0,0.85) 75%)`,
      }}
    >
      {/* 골든 광선 */}
      <div
        className="absolute"
        style={{
          width: '200%', height: 80,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `linear-gradient(90deg, transparent 0%, rgba(255,216,107,0.85) 50%, transparent 100%)`,
          filter: 'blur(3px)',
        }}
      />
      {/* 궁극명 배너 */}
      <div
        className="absolute fx-ult-banner"
        style={{
          top: '50%', left: '50%',
          padding: '14px 36px',
          background: `linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.65))`,
          border: `1px solid #ffd86b`,
          boxShadow: `0 0 24px ${info.color}, 0 0 12px #ffd86b`,
        }}
      >
        <div className="text-[9px] tracking-[0.4em] mb-1 text-center" style={{ color: '#ffd86b' }}>★ 궁극 발동 ★</div>
        <div
          className="text-2xl font-bold fx-ult-name text-center whitespace-nowrap"
          style={{
            color: '#fff',
            textShadow: `0 0 12px ${info.color}, 0 0 18px #ffd86b, 0 2px 4px rgba(0,0,0,0.9)`,
            fontFamily: '"Cinzel", "Noto Serif KR", serif',
          }}
        >
          {info.name}
        </div>
      </div>
    </div>
  );
}

// 상태이상 오버레이 — 적의 debuffs에 따라 지속 표시되는 환경 효과
// bleed > 0 : 빨간 액 드립이 위에서 흘러내림
// igniteTurns > 0 : 주황색 글로우가 깜빡임
// stunned > 0 : 별 3개가 적 머리 위에서 회전
export function StatusOverlay({ debuffs }) {
  if (!debuffs) return null;
  const bleed = debuffs.bleed > 0 && debuffs.bleedTurns > 0;
  const ignite = debuffs.igniteDmg > 0 && debuffs.igniteTurns > 0;
  const stunned = debuffs.stunned > 0;
  if (!bleed && !ignite && !stunned) return null;

  return (
    <>
      {/* 화염 글로우 — 적 영역 전체에 깔리는 배경 */}
      {ignite && (
        <div
          className="absolute inset-0 fx-ignite-glow pointer-events-none"
          style={{
            zIndex: 18,
            background: `radial-gradient(ellipse at center, rgba(255,107,53,0.32) 0%, rgba(255,107,53,0.08) 50%, transparent 75%)`,
          }}
        />
      )}
      {/* 출혈 드립 — 상단에 여러 위치에서 떨어지는 빨간 액 */}
      {bleed && (
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ zIndex: 19, height: 60 }}>
          {[18, 38, 58, 76].slice(0, Math.min(4, Math.max(1, debuffs.bleed))).map((leftPct, i) => (
            <span
              key={i}
              className="absolute fx-bleed-drip"
              style={{
                left: `${leftPct}%`,
                top: 0,
                width: 4, height: 14,
                background: 'linear-gradient(180deg, #c4453d 0%, #8b1f1f 100%)',
                borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%',
                boxShadow: '0 0 6px rgba(196,69,61,0.7)',
                animationDelay: `${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* 기절 별 — 중앙 상단에서 회전 */}
      {stunned && (
        <div
          className="absolute pointer-events-none fx-stun-orbit"
          style={{
            zIndex: 21,
            top: '15%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 60, height: 60,
          }}
        >
          {[0, 120, 240].map(deg => (
            <span
              key={deg}
              className="absolute text-base"
              style={{
                top: '50%', left: '50%',
                transform: `rotate(${deg}deg) translateX(28px) rotate(-${deg}deg)`,
                color: '#ffd86b',
                textShadow: '0 0 6px rgba(255,216,107,0.8)',
                fontFamily: 'serif',
              }}
            >★</span>
          ))}
        </div>
      )}
    </>
  );
}
