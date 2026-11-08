// ============================================
// Launcher.jsx — 게임 선택 화면 (1.204.0)
// ============================================
// 같은 레포·같은 호스팅 주소에서 여러 게임을 나눠 띄운다.
//   - Dawn & Twilight (본편 App.jsx — 코드·세이브 변경 없음)
//   - 트와일라잇 아르카나 (src/arcana — 덱빌딩 로그라이크, 세이브 분리)
//   - 황혼 연대기 (src/chronicle — 정통 RPG, 1.205.0, 세이브 분리)
// 두 게임 모두 React.lazy로 불러서 고른 쪽만 내려받는다.
// 마지막 선택은 localStorage에 기억해 「최근」 표시만 한다 (자동 진입 X — PM 결정: 런처 화면).
// ============================================
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PALETTE } from './utils/helpers.js';
import { GAME_VERSION } from './data/version.js';

const DntApp = lazy(() => import('./App.jsx'));
const ArcanaGame = lazy(() => import('./arcana/ArcanaGame.jsx'));
const ChronicleGame = lazy(() => import('./chronicle/ChronicleGame.jsx'));

const LAST_KEY = 'dnt_launcher_last';
const readLast = () => { try { return localStorage.getItem(LAST_KEY); } catch { return null; } };
const writeLast = (v) => { try { localStorage.setItem(LAST_KEY, v); } catch { /* 무시 */ } };

const GAMES = [
  {
    id: 'dnt', title: 'Dawn & Twilight', kr: '던앤트와일라잇',
    desc: '다크 판타지 텍스트 로그라이크 — 원정·챔피언십·레이드',
    image: './classes/wanderer.jpg', color: PALETTE.accent,
  },
  {
    id: 'arcana', title: 'Twilight Arcana', kr: '트와일라잇 아르카나',
    desc: '카드로 싸우는 덱빌딩 로그라이크 — 4막 원정',
    image: './enemies/classic/chapter_3/oblivionSealer_intro.jpg', color: '#b48ce0',
  },
  {
    id: 'chronicle', title: 'Twilight Chronicle', kr: '황혼 연대기',
    desc: '정통 RPG — 레벨업·동료·파밍·던전·장비 승급', badge: 'NEW',
    image: './enemies/championship/frost/champ_frost_boss4_intro.jpg', color: '#9cc4e4',
  },
];

// PC에서는 폰 프레임, 모바일은 전체 화면
function Frame({ children }) {
  const [mobile, setMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : true));
  useEffect(() => {
    const f = () => setMobile(window.innerWidth < 1024);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  if (mobile) {
    return <div className="fixed inset-0 overflow-hidden" style={{ background: PALETTE.bg }}>{children}</div>;
  }
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: `radial-gradient(ellipse at center, ${PALETTE.bg} 0%, ${PALETTE.bgDeep} 100%)` }}>
      <div className="relative overflow-hidden" style={{
        width: 420, height: 'min(92vh, 920px)', background: PALETTE.bg, borderRadius: 40,
        border: `8px solid ${PALETTE.bgDeep}`, boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 60px ${PALETTE.dawn}15`,
      }}>{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <Frame>
      <div className="absolute inset-0 flex items-center justify-center" style={{ color: PALETTE.textDim, fontSize: 13, fontFamily: '"Noto Serif KR", serif' }}>불러오는 중…</div>
    </Frame>
  );
}

function LauncherScreen({ onPick }) {
  const last = readLast();
  return (
    <Frame>
      <div className="absolute inset-0 flex flex-col px-5 pt-8 pb-5" style={{ fontFamily: '"Noto Serif KR", serif' }}>
        <div className="text-center mb-4">
          <div style={{ fontSize: 11, letterSpacing: '0.45em', color: PALETTE.dawn }}>SELECT GAME</div>
          <div className="font-semibold mt-1" style={{ fontSize: 20, color: PALETTE.text }}>게임 선택</div>
        </div>
        <div className="flex-1 flex flex-col gap-3 ui-stagger">
          {GAMES.map(g => (
            <button key={g.id} onClick={() => onPick(g.id)} className="ui-press relative flex-1 overflow-hidden text-left"
              style={{ borderRadius: 22, border: `1px solid ${g.color}88`, minHeight: 140, boxShadow: `0 16px 40px -18px ${g.color}` }}>
              <img src={g.image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 30%' }} draggable={false} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,6,8,0.15) 0%, rgba(10,6,8,0.55) 55%, rgba(10,6,8,0.95) 100%)' }} />
              <div className="absolute top-3 right-3 flex gap-1.5">
                {g.badge && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: g.color, color: '#140b0f', fontWeight: 700 }}>{g.badge}</span>}
                {last === g.id && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: '#000a', color: PALETTE.dawn, border: `1px solid ${PALETTE.dawn}66` }}>최근</span>}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div style={{ fontSize: 22, color: PALETTE.text, fontFamily: '"Cinzel", serif', fontWeight: 700, textShadow: '0 2px 10px #000' }}>{g.title}</div>
                <div style={{ fontSize: 13, color: g.color }}>{g.kr}</div>
                <div className="mt-1" style={{ fontSize: 12, color: PALETTE.textDim }}>{g.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="text-center mt-4" style={{ fontSize: 10.5, color: PALETTE.textDim }}>v{GAME_VERSION}</div>
      </div>
    </Frame>
  );
}

export default function Launcher() {
  const [game, setGame] = useState(null);
  const pick = (id) => { writeLast(id); setGame(id); };
  const back = () => setGame(null);
  if (game === 'dnt') {
    return <Suspense fallback={<Loading />}><DntApp onSwitchGame={back} /></Suspense>;
  }
  if (game === 'chronicle') {
    return (
      <Suspense fallback={<Loading />}>
        <Frame><ChronicleGame onExit={back} /></Frame>
      </Suspense>
    );
  }
  if (game === 'arcana') {
    return (
      <Suspense fallback={<Loading />}>
        <Frame><ArcanaGame onExit={back} /></Frame>
      </Suspense>
    );
  }
  return <LauncherScreen onPick={pick} />;
}
