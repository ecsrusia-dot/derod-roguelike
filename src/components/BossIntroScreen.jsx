// components/BossIntroScreen.jsx — 보스 노드 진입 시 시네마틱 풀컷 컷신
// ============================================
// 흐름: 보스 노드 도착 → NodeInfoModal 확인 → [BossIntroScreen] → 전투
// - 9:16 인트로 일러스트 페이드인 + 미세 줌
// - 보스 이름·서브타이틀 배너 라이즈
// - 2.5초 자동 진행 또는 탭 즉시 스킵
// - 인트로 일러 없으면 0.3초만에 자동 스킵 (챕터 2~4 보스 호환)
// ============================================

import React, { useEffect, useState } from 'react';
import { ENEMIES } from '../data.js';
import { PALETTE } from '../utils/helpers.js';

const AUTO_ADVANCE_MS = 2500;
const FALLBACK_ADVANCE_MS = 300;

export default function BossIntroScreen({ enemyKey, onComplete }) {
  const enemy = ENEMIES[enemyKey];
  const [imgFailed, setImgFailed] = useState(false);
  const [exiting, setExiting] = useState(false);

  const introSrc = enemy?.chapter
    ? `/enemies/classic/chapter_${enemy.chapter}/${enemyKey}_intro.jpg`
    : null;

  const finish = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 400);
  };

  useEffect(() => {
    if (!enemy) {
      onComplete();
      return;
    }
    const delay = imgFailed || !introSrc ? FALLBACK_ADVANCE_MS : AUTO_ADVANCE_MS;
    const t = setTimeout(finish, delay);
    return () => clearTimeout(t);
  }, [enemy, imgFailed, introSrc]);

  if (!enemy) return null;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer ${exiting ? 'fx-boss-intro-exit' : 'fx-boss-intro-enter'}`}
      style={{ background: '#000', zIndex: 70 }}
      onClick={finish}
    >
      {/* 9:16 인트로 일러스트 */}
      {!imgFailed && introSrc && (
        <img
          src={introSrc}
          alt={enemy.name}
          className="absolute inset-0 w-full h-full object-cover fx-boss-intro-zoom"
          style={{ objectPosition: 'center center' }}
          onError={() => setImgFailed(true)}
        />
      )}

      {/* 어두운 비네트 — 일러 상하 가독성 확보 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.85) 100%)`,
        }}
      />

      {/* 상단 라벨 */}
      <div
        className="absolute top-[12%] left-1/2 -translate-x-1/2 fx-boss-intro-label"
        style={{
          fontSize: 11,
          letterSpacing: '0.5em',
          color: '#ffd86b',
          textShadow: '0 0 12px rgba(0,0,0,0.9), 0 0 6px #ffd86b80',
          fontFamily: '"Cinzel", "Noto Serif KR", serif',
        }}
      >
        ◆ 보스 등장 ◆
      </div>

      {/* 하단 배너 — 보스 이름 + 서브타이틀 */}
      <div
        className="absolute bottom-[8%] left-1/2 -translate-x-1/2 px-8 py-4 fx-boss-intro-banner"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.65))`,
          border: `1px solid ${enemy.color || '#8b1f1f'}`,
          boxShadow: `0 0 32px ${enemy.color || '#8b1f1f'}, 0 0 16px #ffd86b80`,
          minWidth: '70%',
          textAlign: 'center',
        }}
      >
        <div
          className="text-3xl font-bold whitespace-nowrap"
          style={{
            color: '#fff',
            textShadow: `0 0 16px ${enemy.color || '#8b1f1f'}, 0 0 24px #ffd86b, 0 2px 6px rgba(0,0,0,0.95)`,
            fontFamily: '"Cinzel", "Noto Serif KR", serif',
            letterSpacing: '0.15em',
          }}
        >
          {enemy.name}
        </div>
        {enemy.desc && (
          <div
            className="text-[12px] mt-2 px-2"
            style={{
              color: PALETTE.textDim,
              fontFamily: '"Noto Serif KR", serif',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            「{enemy.desc}」
          </div>
        )}
      </div>

      {/* 스킵 안내 (우하단) */}
      <div
        className="absolute bottom-3 right-3 text-[10px] tracking-[0.2em] fx-boss-intro-skip"
        style={{ color: '#ffffff80', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        탭하여 건너뛰기
      </div>
    </div>
  );
}
