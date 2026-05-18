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

// 소울 스킬 컷인 — 화면 전체에 골든 버스트 + 궁극명 배너 (~0.9초)
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

// ============================================
// 1.45.0 술법사 화염 이펙트 6종
// ============================================

// A. 영겁의 화염 컷인 — 풀스크린 주황·적색 화염 + 한자 "永劫"(적 카드 중앙) + 한글 스킬명(로그 영역) (0.9초)
// 1.45.3: 위치 우측 쏠림 픽스 — 부모 div(position·translate) / 자식 div(fx-flame-burst 애니메이션) 분리.
//   기존: 인라인 transform:translate(-50%,-50%)와 fx-flame-burst 키프레임 transform:scale()이 충돌 → translate 덮어씀 → 좌측 모서리 기준으로 그려져 우측으로 쏠림
//   수정: 부모가 위치, 자식이 애니메이션. transform 충돌 제거
export function EternalFlameCutin({ trigger }) {
  if (!trigger) return null;
  const flameOrange = '#ff7a1a';
  const flameRed = '#c4282d';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 26 }}
    >
      {/* 풀스크린 어두운 배경 그라데이션 (inset-0 사용 — translate 불필요, 충돌 없음) */}
      <div
        className="absolute inset-0 fx-flame-burst pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${flameOrange}77 0%, ${flameRed}66 30%, rgba(20,5,0,0.85) 70%, rgba(0,0,0,0.92) 100%)`,
          willChange: 'opacity, transform',
        }}
      />
      {/* 화염 코어 1 — 큰 radial (부모가 위치 / 자식이 애니메이션) */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '17%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 280, height: 280,
        }}
      >
        <div
          className="fx-flame-burst"
          style={{
            width: '100%', height: '100%',
            background: `radial-gradient(circle, ${flameOrange}ee 0%, ${flameRed}aa 40%, transparent 75%)`,
            borderRadius: '50%',
            filter: 'blur(8px)',
            willChange: 'opacity, transform',
          }}
        />
      </div>
      {/* 화염 코어 2 — 백광 중심 */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '17%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 130, height: 130,
        }}
      >
        <div
          className="fx-flame-burst"
          style={{
            width: '100%', height: '100%',
            background: `radial-gradient(circle, rgba(255,250,220,0.95) 0%, ${flameOrange}aa 40%, transparent 70%)`,
            borderRadius: '50%',
            filter: 'blur(4px)',
            animationDuration: '0.55s',
            willChange: 'opacity, transform',
          }}
        />
      </div>
      {/* "永劫" 한자 — 적 카드 중앙 (top 17%) — 부모가 위치 / 자식이 fx-flame-kanji */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '17%', left: '50%',
          transform: 'translate(-50%, -50%)',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          className="fx-flame-kanji"
          style={{
            fontFamily: '"Cinzel", "Noto Serif KR", serif',
            fontSize: 84,
            fontWeight: 'bold',
            color: '#fff6d8',
            textShadow: `0 0 18px ${flameOrange}, 0 0 36px ${flameRed}, 0 0 56px ${flameRed}`,
            letterSpacing: '0.2em',
            willChange: 'opacity, transform',
          }}
        >
          永劫
        </div>
      </div>
      {/* 한글 스킬명 — 로그 영역 가운데 (top 45%) — 부모가 위치 / 자식이 fx-flame-kanji */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '45%', left: '50%',
          transform: 'translate(-50%, -50%)',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          className="fx-flame-kanji"
          style={{
            fontFamily: '"Noto Serif KR", "Cinzel", serif',
            fontSize: 26,
            fontWeight: 'bold',
            color: '#fff6d8',
            textShadow: `0 0 12px ${flameOrange}, 0 0 24px ${flameRed}`,
            letterSpacing: '0.3em',
            willChange: 'opacity, transform',
            animationDelay: '0.15s',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          영겁(永劫)의 화염
        </div>
      </div>
    </div>
  );
}

// 파이어볼 (소효과) — 1.45.1 재설계: 작은 화염구가 적 카드 하단 → 중앙으로 비행 → 폭발
// 0.35초 비행 + 0.4초 임팩트 = 총 0.75초 (비행 끝나는 시점에 임팩트 시작)
export function FireballFx({ trigger }) {
  if (!trigger) return null;
  const flameOrange = '#ff7a1a';
  const flameRed = '#c4282d';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      {/* 1단계: 발사체 비행 (0.35초) — 적 카드 하단에서 중앙으로 상승하며 회전 */}
      <div
        className="absolute fx-fireball-fly"
        style={{
          width: 36, height: 36,
          background: `radial-gradient(circle, rgba(255,250,210,1) 0%, ${flameOrange} 45%, ${flameRed}cc 75%, transparent 100%)`,
          borderRadius: '50%',
          filter: `drop-shadow(0 0 12px ${flameOrange}) drop-shadow(0 0 6px ${flameRed})`,
          '--fx-x0': '0px',
          '--fx-y0': '120px',
        }}
      />
      {/* 발사체 꼬리 */}
      <div
        className="absolute fx-fireball-trail"
        style={{
          width: 24, height: 60,
          background: `linear-gradient(to top, transparent 0%, ${flameOrange}aa 50%, rgba(255,250,210,0.9) 100%)`,
          borderRadius: '50%',
          filter: 'blur(4px)',
          '--fx-tx': '0px',
          '--fx-ty': '90px',
        }}
      />
      {/* 2단계: 도착 후 임팩트 폭발 (0.35초 딜레이 후 0.4초) */}
      <div
        className="absolute fx-flame-ember"
        style={{
          width: 120, height: 120,
          background: `radial-gradient(circle, rgba(255,250,210,0.95) 0%, ${flameOrange}dd 35%, ${flameRed}88 65%, transparent 85%)`,
          borderRadius: '50%',
          filter: 'blur(3px)',
          animationDelay: '0.35s',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      />
      {/* 임팩트 입자 4방향 (도착 후) */}
      {[0, 90, 180, 270].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dx = Math.cos(rad) * 50;
        const dy = Math.sin(rad) * 50;
        return (
          <div
            key={i}
            className="absolute fx-flame-shard"
            style={{
              width: 14, height: 14,
              background: `radial-gradient(circle, ${flameOrange} 0%, rgba(255,120,40,0) 70%)`,
              borderRadius: '50%',
              '--fx-dx': `${dx}px`,
              '--fx-dy': `${dy}px`,
              animationDelay: '0.35s',
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          />
        );
      })}
    </div>
  );
}

// 익스플로젼 (대효과) — 1.45.1 재설계: 화염구 5개 다발이 시차 발사 → 적 위치 풀스크린 폭발
// 화염구 5개 각각 0.35초 비행 (시차 0.05초씩) → 마지막 비행 종료 시 풀스크린 폭발 (0.5초)
export function ExplosionFx({ trigger }) {
  if (!trigger) return null;
  const flameOrange = '#ff7a1a';
  const flameRed = '#c4282d';
  // 1.45.2: 5개 화염구가 다양한 각도(상·하·좌·우·대각)에서 시차로 적 중앙에 모임
  // (0,0)이 도착점(적 중앙). 시작점은 다양한 방향에서.
  const projectiles = [
    { x0: -180, y0:  -30, delay: 0.00 },  // 좌측
    { x0:  180, y0:  -50, delay: 0.07 },  // 우측
    { x0:   20, y0: -200, delay: 0.14 },  // 상단
    { x0: -140, y0:  140, delay: 0.21 },  // 좌하 대각
    { x0:  150, y0:  120, delay: 0.28 },  // 우하 대각
  ];
  // 폭발 시작 시점: 마지막 화염구 도착 시점 = 0.28 + 0.35 = 0.63초 후
  const explodeDelay = '0.63s';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 24 }}
    >
      {/* 1단계: 5개 화염구 시차 비행 */}
      {projectiles.map((p, i) => (
        <React.Fragment key={`proj-${i}`}>
          <div
            className="absolute fx-fireball-fly"
            style={{
              width: 30, height: 30,
              background: `radial-gradient(circle, rgba(255,250,210,1) 0%, ${flameOrange} 45%, ${flameRed}cc 75%, transparent 100%)`,
              borderRadius: '50%',
              filter: `drop-shadow(0 0 10px ${flameOrange})`,
              '--fx-x0': `${p.x0}px`,
              '--fx-y0': `${p.y0}px`,
              animationDelay: `${p.delay}s`,
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          />
          <div
            className="absolute fx-fireball-trail"
            style={{
              width: 18, height: 50,
              background: `linear-gradient(to top, transparent 0%, ${flameOrange}99 50%, rgba(255,250,210,0.8) 100%)`,
              borderRadius: '50%',
              filter: 'blur(3px)',
              '--fx-tx': `${p.x0}px`,
              '--fx-ty': `${p.y0 - 30}px`,
              animationDelay: `${p.delay}s`,
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          />
        </React.Fragment>
      ))}
      {/* 2단계: 풀스크린 폭발 (마지막 화염구 도착 후) */}
      <div
        className="absolute fx-flame-burst"
        style={{
          width: 380, height: 380,
          background: `radial-gradient(circle, rgba(255,250,220,0.95) 0%, ${flameOrange}dd 25%, ${flameRed}cc 50%, rgba(80,15,10,0.6) 80%, transparent 100%)`,
          borderRadius: '50%',
          filter: 'blur(6px)',
          animationDelay: explodeDelay,
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      />
      {/* 백광 중심 */}
      <div
        className="absolute fx-flame-burst"
        style={{
          width: 160, height: 160,
          background: `radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,220,140,0.7) 50%, transparent 80%)`,
          borderRadius: '50%',
          animationDuration: '0.45s',
          animationDelay: explodeDelay,
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      />
      {/* 8방향 파편 (폭발과 동시) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 120 + (i % 2 === 0 ? 20 : 0);
        const dx = Math.cos(rad) * dist;
        const dy = Math.sin(rad) * dist;
        return (
          <div
            key={i}
            className="absolute fx-flame-shard"
            style={{
              width: 18, height: 18,
              background: `radial-gradient(circle, ${flameOrange} 0%, ${flameRed} 50%, transparent 80%)`,
              borderRadius: '50%',
              filter: `drop-shadow(0 0 6px ${flameOrange})`,
              '--fx-dx': `${dx}px`,
              '--fx-dy': `${dy}px`,
              animationDelay: explodeDelay,
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          />
        );
      })}
    </div>
  );
}

// B. 화염 각인 글로우 오라 — 적 카드 테두리 붉은 화염 지속 (반복, 절대 위치 오버레이)
// 사용처: 적 카드 컨테이너 안에 absolute inset-0으로 배치
export function IgniteGlowAura({ active }) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 fx-ignite-aura pointer-events-none"
      style={{
        zIndex: 5,
        borderRadius: 'inherit',
      }}
    />
  );
}

// C. 각인 폭발 임팩트 — 치명타 시 화염 각인 폭발 (0.4초)
// 1.45.3 재재설계: PM 피드백 — 풀스크린 빨간 글로우가 익스플로젼처럼 보임 → 글로우 제거
//   균열 라인 6개만 + 적 카드 상단 영역(top 17%)에 고정. 라인 크기 축소(240→160).
//   풀스크린 효과 0건. 익스플로젼(풀스크린 둥근 폭발)과 시각적 패턴 완전 분리.
export function IgniteExplodeFx({ trigger }) {
  if (!trigger) return null;
  const crackRed = '#ff2820';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 23 }}
    >
      {/* 적 카드 영역 (top 17%)에 위치한 균열 라인 6개 방사형 */}
      <div
        className="absolute"
        style={{
          top: '17%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 160, height: 160,
        }}
      >
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <div
            key={deg}
            className="absolute fx-ignite-crack"
            style={{
              top: '50%', left: '50%',
              marginTop: -80, marginLeft: -1.5,
              width: 3,
              height: 160,
              background: `linear-gradient(to bottom, transparent 0%, ${crackRed} 20%, #fff5b0 50%, ${crackRed} 80%, transparent 100%)`,
              transform: `rotate(${deg}deg)`,
              transformOrigin: 'center',
              filter: `drop-shadow(0 0 4px ${crackRed})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// 크리티컬 풀스크린 화면효과 — 1.45.2 신설
// 익스플로젼·각인 폭발과 시각적 패턴 차별화: 둥근 폭발 X, 화면 가장자리 노란 비네트만 (0.3초)
export function CritScreenFx({ trigger }) {
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 25 }}
    >
      {/* 화면 가장자리 노란 비네트 — 안쪽으로 갈수록 투명 */}
      <div
        className="absolute inset-0 fx-crit-vignette"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(255,200,40,0.35) 75%, rgba(255,180,30,0.6) 100%)`,
          boxShadow: 'inset 0 0 80px rgba(255,200,40,0.7)',
        }}
      />
    </div>
  );
}

// D. 화염장막 결계 — 액티브 발동 시 플레이어 앞 붉은 결계 (0.8초)
export function FlameBarrierFx({ trigger }) {
  if (!trigger) return null;
  const flameOrange = '#ff7a1a';
  const flameRed = '#c4282d';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      <div
        className="absolute fx-flame-barrier"
        style={{
          width: 260, height: 260,
          borderRadius: '50%',
          border: `4px solid ${flameOrange}`,
          boxShadow: `0 0 30px ${flameOrange}, inset 0 0 25px ${flameRed}, 0 0 60px ${flameRed}88`,
          background: `radial-gradient(circle, ${flameOrange}22 0%, ${flameRed}44 50%, transparent 80%)`,
        }}
      />
      <div
        className="absolute fx-flame-barrier"
        style={{
          width: 200, height: 200,
          borderRadius: '50%',
          border: `2px solid ${flameOrange}`,
          opacity: 0.6,
          animationDelay: '0.1s',
        }}
      />
    </div>
  );
}

// D. 화염장막 반사 — 화염장막 보유 적이 공격할 때 적→플레이어 방향 화염 입자 역방향 비행 (0.6초)
export function FlameReflectFx({ trigger }) {
  if (!trigger) return null;
  const flameOrange = '#ff7a1a';
  return (
    <div
      key={trigger}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 22 }}
    >
      {/* 5개 화염 입자가 적→플레이어 방향(왼쪽 아래)로 비행 */}
      {[0, 1, 2, 3, 4].map((i) => {
        const dx = -100 - i * 15;
        const dy = 20 - i * 10;
        return (
          <div
            key={i}
            className="absolute fx-flame-reflect"
            style={{
              width: 16, height: 16,
              background: `radial-gradient(circle, rgba(255,250,220,0.9) 0%, ${flameOrange} 50%, transparent 80%)`,
              borderRadius: '50%',
              filter: `drop-shadow(0 0 6px ${flameOrange})`,
              '--fx-dx': `${dx}px`,
              '--fx-dy': `${dy}px`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        );
      })}
    </div>
  );
}
