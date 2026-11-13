// ============================================
// chronicle/screens/idle.jsx — 황혼 연대기 · 대기화면 · 밀어서 해제
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { chronicleClass, expNeedFor } from '../data.js';
import * as F from '../familiar.js';
import { XP_HERO, XP_FAM, expSnap, xpPct, MS } from './common.jsx';

// ===== 메인 =====
// ===== 대기화면 (1.271.0, PM 승인 시안) — 직업 일러 전체 + 숨쉬기 + 직업별 입자, 문구·설정은 하단 =====
const IDLE_MOTION = {
  wanderer: { glow: 'rgba(220,90,70,.30)', p: '#ffd2c4', kind: 'slash' },
  sage: { glow: 'rgba(255,130,60,.30)', p: '#ffb347', kind: 'rise' },
  demonblood: { glow: 'rgba(170,30,40,.34)', p: '#ff4d5a', kind: 'mist' },
  elf: { glow: 'rgba(120,190,110,.28)', p: '#a8f0a0', kind: 'drift' },
  priest: { glow: 'rgba(255,220,140,.30)', p: '#fff0b0', kind: 'fall' },
};

export const LOSS_STOP = 3; // 반복·자동 사냥이 연속으로 이만큼 지면 멈춤 (1.273.1)

const IDLE_KIND_LABEL = { repeat: '반복 사냥 중', prog: '자동 진행 중', tower: '자동 등반 중', dungeon: '연속 도전 중' };

const IDLE_DELAYS = [[30, '30초'], [60, '1분'], [180, '3분'], [0, '끄기']];

// 대기화면 경험치 (1.272.1, PM 승인 시안 C) — 대기화면이 열린 뒤 얻은 경험치를 레벨을 넘어서도 누적
// (렌더 중 ref 갱신 — 같은 값으로 두 번 그려도 차이가 0이라 StrictMode 이중 렌더에 안전)
function useIdleXp(x, needAt) {
  const ref = useRef({ prev: x, gain: 0, upAt: 0, upLv: 0 });
  const r = ref.current;
  if (x && r.prev && (x.key || '') !== (r.prev.key || '')) { r.gain = 0; r.upAt = 0; } // 동행 사역마가 바뀜
  else if (x && r.prev && (x.lv !== r.prev.lv || x.exp !== r.prev.exp)) {
    let g = 0;
    if (x.lv === r.prev.lv) g = x.exp - r.prev.exp;
    else if (x.lv > r.prev.lv) {
      g = needAt(r.prev.lv) - r.prev.exp;
      for (let L = r.prev.lv + 1; L < x.lv; L++) g += needAt(L);
      g += x.exp; r.upAt = Date.now(); r.upLv = x.lv;
    }
    r.gain += Math.max(0, g);
  }
  r.prev = x;
  return r;
}

function IdleXpRow({ name, x, st, now, fam = false }) {
  if (!x) return null;
  const pct = xpPct(x);
  const up = st.upAt && now - st.upAt < 2500;
  const c = fam ? '#c08ae8' : '#f5cf72';
  return (
    <div style={{ marginTop: fam ? 7 : 0 }}>
      <div className="flex justify-between" style={{ fontSize: 11.5, color: '#d8c8b0', marginBottom: 3 }}>
        <span className="truncate" style={{ marginRight: 8 }}>{fam ? '🐾 ' : ''}{name} Lv.{x.lv}{up ? <span key={st.upAt} className="chr-idle-lvup" style={{ color: c, fontWeight: 800, marginLeft: 6 }}>✦ LEVEL UP</span> : null}</span>
        <span style={{ whiteSpace: 'nowrap' }}>{st.gain > 0 ? <b style={{ color: c }}>+{Math.round(st.gain).toLocaleString()}</b> : null}{st.gain > 0 ? ' · ' : ''}{x.cap ? (fam ? '주인공 레벨까지' : '레벨 상한') : `${pct.toFixed(1)}%`}</span>
      </div>
      <div key={up ? st.upAt : 'n'} className={up ? 'chr-idle-xpflash' : ''} style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${x.cap ? 100 : pct}%`, background: fam ? XP_FAM : XP_HERO, boxShadow: `0 0 8px ${c}`, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

const SLIDE_ICON = {"wanderer": "<defs><linearGradient id=\"sl_bw\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\".5\" stop-color=\"#cfd6e0\"/><stop offset=\"1\" stop-color=\"#7c8796\"/></linearGradient></defs><path d=\"M25.5 4.2 L27.8 6.5 L13 21.3 L10.7 19 Z\" fill=\"url(#sl_bw)\" stroke=\"#fff\" stroke-width=\".4\"/><path d=\"M26.6 5.4 L14 18\" stroke=\"#ffffff\" stroke-width=\".5\" opacity=\".9\"/><ellipse cx=\"11.6\" cy=\"20.4\" rx=\"3.6\" ry=\"1.3\" transform=\"rotate(-45 11.6 20.4)\" fill=\"#e9c27a\" stroke=\"#7a4a1c\" stroke-width=\".5\"/><path d=\"M10.2 21.8 L6.2 25.8\" stroke=\"#3a1414\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><path d=\"M9.4 22.6 l-.9 .9 M8.2 23.8 l-.9 .9 M7.1 24.9 l-.6 .6\" stroke=\"#c4453d\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><circle cx=\"5.6\" cy=\"26.4\" r=\"1.1\" fill=\"#e9c27a\"/><path d=\"M6 8 Q16 3 27 10\" stroke=\"#ffd2c4\" stroke-width=\".7\" fill=\"none\" opacity=\".7\"/><path d=\"M4 12 Q14 7 24 13\" stroke=\"#ffd2c4\" stroke-width=\".5\" fill=\"none\" opacity=\".45\"/>", "sage": "<defs><radialGradient id=\"sl_fs\" cx=\".5\" cy=\".75\" r=\".7\"><stop offset=\"0\" stop-color=\"#fff6c8\"/><stop offset=\".45\" stop-color=\"#ffb347\"/><stop offset=\"1\" stop-color=\"#d0401a\"/></radialGradient></defs><circle cx=\"16\" cy=\"17\" r=\"12\" fill=\"none\" stroke=\"#ffb347\" stroke-width=\".6\" stroke-dasharray=\"1.5 2.2\" opacity=\".8\"/><path d=\"M16 4 C20 10 25 13 23 20 C22 25 18.5 27.5 16 27.5 C12 27.5 8.5 24.5 9 19.5 C9.4 15.5 12 14 12.5 10.5 C14 12.5 14.6 14 14.6 15.8 C17 12.8 17.5 8.5 16 4 Z\" fill=\"url(#sl_fs)\"/><path d=\"M16 15 C18.5 18 20 20 19 23 C18.3 25 17 26 16 26 C14 26 12.8 24.4 13 22.6 C13.2 20.6 15 19.5 16 15 Z\" fill=\"#fff4c0\" opacity=\".9\"/><circle cx=\"24.5\" cy=\"8\" r=\".9\" fill=\"#ffd27a\"/><circle cx=\"7.5\" cy=\"11\" r=\".7\" fill=\"#ffd27a\"/><circle cx=\"26\" cy=\"15\" r=\".5\" fill=\"#fff\"/>", "demonblood": "<defs><radialGradient id=\"sl_bd\" cx=\".38\" cy=\".35\" r=\".8\"><stop offset=\"0\" stop-color=\"#ff8a92\"/><stop offset=\".4\" stop-color=\"#d4122a\"/><stop offset=\"1\" stop-color=\"#4a0010\"/></radialGradient></defs><path d=\"M8 9 C7 6 7.5 4 9 3 C9 5.5 10.5 7 12 8\" fill=\"none\" stroke=\"#1a0006\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M24 9 C25 6 24.5 4 23 3 C23 5.5 21.5 7 20 8\" fill=\"none\" stroke=\"#1a0006\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M16 5 C19.5 11 24 15 24 20 C24 24.6 20.4 28 16 28 C11.6 28 8 24.6 8 20 C8 15 12.5 11 16 5 Z\" fill=\"url(#sl_bd)\" stroke=\"#ff4d5a\" stroke-width=\".5\"/><path d=\"M16 15 L18.5 20 L16 25 L13.5 20 Z\" fill=\"none\" stroke=\"#ffd0d4\" stroke-width=\".8\"/><circle cx=\"16\" cy=\"20\" r=\"1.1\" fill=\"#ffd0d4\"/><ellipse cx=\"12.6\" cy=\"15.5\" rx=\"1.3\" ry=\"2.4\" fill=\"#fff\" opacity=\".55\" transform=\"rotate(25 12.6 15.5)\"/>", "elf": "<defs><linearGradient id=\"sl_le\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#2f7a3a\"/><stop offset=\".55\" stop-color=\"#7fd77a\"/><stop offset=\"1\" stop-color=\"#e2ffd8\"/></linearGradient></defs><path d=\"M6 26 C6 14 14 6 27 5 C26.5 18 18 26 6 26 Z\" fill=\"url(#sl_le)\" stroke=\"#d8ffd0\" stroke-width=\".5\"/><path d=\"M6 26 C12 20 18 13 25 7\" stroke=\"#eaffe4\" stroke-width=\".9\" fill=\"none\"/><path d=\"M11 20.5 L10.5 15.5 M14 17.5 L14.2 12 M17.3 14.4 L18 9.8 M13 19 L18.5 19.3 M16.3 15.8 L21.6 15.2 M19.4 12.6 L23.5 11.6\" stroke=\"#eaffe4\" stroke-width=\".55\" opacity=\".85\"/><path d=\"M3 13 Q8 10 12 12\" stroke=\"#a8f0a0\" stroke-width=\".6\" fill=\"none\" opacity=\".7\"/><path d=\"M20 28 Q25 27 29 23\" stroke=\"#a8f0a0\" stroke-width=\".6\" fill=\"none\" opacity=\".7\"/>", "priest": "<defs><radialGradient id=\"sl_ps\" cx=\".5\" cy=\".5\" r=\".5\"><stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\".5\" stop-color=\"#fff0b0\"/><stop offset=\"1\" stop-color=\"#d9a640\"/></radialGradient></defs><circle cx=\"16\" cy=\"16\" r=\"11.5\" fill=\"none\" stroke=\"#f3d27a\" stroke-width=\".7\"/><circle cx=\"16\" cy=\"16\" r=\"13.2\" fill=\"none\" stroke=\"#f3d27a\" stroke-width=\".35\" stroke-dasharray=\"1 1.6\" opacity=\".8\"/><g stroke=\"#ffe9a6\" stroke-width=\".5\" opacity=\".8\"><path d=\"M16 1.5 V5 M16 27 V30.5 M1.5 16 H5 M27 16 H30.5 M5.7 5.7 L8 8 M24 24 L26.3 26.3 M26.3 5.7 L24 8 M8 24 L5.7 26.3\"/></g><path d=\"M16 6 L18 14 L26 16 L18 18 L16 26 L14 18 L6 16 L14 14 Z\" fill=\"url(#sl_ps)\"/><path d=\"M16 10.5 L17 15 L21.5 16 L17 17 L16 21.5 L15 17 L10.5 16 L15 15 Z\" fill=\"#fff\"/>"};

const SLIDE_THEME = {
  wanderer: { c: '#c4453d', p: '#ffd2c4', a: '#9aa6b5', txt: '검을 뽑아 해제', kind: 'slash' },
  sage: { c: '#ff7a2e', p: '#ffb347', a: '#ffd27a', txt: '불꽃을 밀어 해제', kind: 'ember' },
  demonblood: { c: '#b0202e', p: '#ff4d5a', a: '#5a0010', txt: '피의 계약 해제', kind: 'blood' },
  elf: { c: '#4f9e4a', p: '#a8f0a0', a: '#d6ffcc', txt: '바람을 따라 해제', kind: 'leaf' },
  priest: { c: '#d9a640', p: '#fff0b0', a: '#ffffff', txt: '빛을 밀어 해제', kind: 'light' },
};

// 꼬리 입자 — 지나간 자리(채움) 안에 고정 배치, CSS로 흔들림
function slideParticle(kind, c, p, i) {
  const x = 8 + i * 14; const y = 10 + ((i * 37) % 28);
  const base = { position: 'absolute', left: x, top: y, animationDelay: `${-(i * 0.37) % 2}s` };
  if (kind === 'slash') return { ...base, width: 16, height: 1.5, background: p, transform: 'rotate(-18deg)', boxShadow: `0 0 6px ${p}` };
  if (kind === 'ember') return { ...base, width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: '50%', background: p, boxShadow: `0 0 6px ${c}` };
  if (kind === 'blood') return { ...base, width: 3 + (i % 3), height: 4 + (i % 3), borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: c, opacity: 0.8 };
  if (kind === 'leaf') return { ...base, width: 7, height: 4, borderRadius: '0 80% 0 80%', background: p, transform: `rotate(${i * 40}deg)`, opacity: 0.8 };
  return { ...base, width: 3, height: 3, background: '#fff', transform: 'rotate(45deg)', boxShadow: `0 0 6px ${p}` };
}

function slideBurst(kind, c, p) {
  if (kind === 'slash') return [`linear-gradient(160deg,transparent 46%,${p} 49%,#fff 50%,${p} 51%,transparent 54%)`, `linear-gradient(150deg,transparent 58%,${c}aa 60%,transparent 63%)`];
  if (kind === 'ember') return [`radial-gradient(circle at 88% 50%,#fff 0,${p} 12%,${c}aa 30%,transparent 55%)`];
  if (kind === 'blood') return [`radial-gradient(ellipse at 88% 50%,${p} 0,${c} 18%,#3a0008cc 45%,transparent 70%)`];
  if (kind === 'leaf') return [`radial-gradient(circle at 88% 50%,${p}cc 0,transparent 45%)`];
  return [`radial-gradient(circle at 88% 50%,#fff 0,${p} 15%,transparent 50%)`, `conic-gradient(from 0deg at 88% 50%,transparent 0 10deg,${p}55 12deg,transparent 14deg 40deg,${p}55 42deg,transparent 44deg 80deg,${p}55 82deg,transparent 84deg 120deg,${p}55 122deg,transparent 124deg)`];
}

// 1.273.3 밀어서 해제 · 1.273.4 PM 승인 시안 2 — 직업별 문장 손잡이(회전 링 + 유리 구슬) · 유리 트랙 · 꼬리 입자 · 끝까지 밀면 0.4초 해제 연출
function SlideUnlock({ onUnlock, classId }) {
  const th = SLIDE_THEME[classId] || SLIDE_THEME.sage;
  const trackRef = useRef(null);
  const drag = useRef(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const KNOB = 52;
  const maxX = () => Math.max(1, (trackRef.current?.clientWidth || 300) - KNOB - 6);
  const down = (e) => { if (done) return; drag.current = { sx: e.clientX, x0: x }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!drag.current) return; setX(Math.max(0, Math.min(maxX(), drag.current.x0 + e.clientX - drag.current.sx))); };
  const up = () => {
    if (!drag.current) return; drag.current = null;
    if (x >= maxX() * 0.85) { setX(maxX()); setDone(true); setTimeout(onUnlock, 400); } else setX(0);
  };
  const pct = x / maxX();
  const { c, p, a, kind } = th;
  return (
    <div ref={trackRef} className="absolute overflow-hidden" style={{ left: 14, right: 14, bottom: 14, height: KNOB + 6, borderRadius: 30, touchAction: 'none' }}>
      <div className="absolute inset-0 chr-slide-border" style={{ borderRadius: 30, background: `linear-gradient(90deg,${c}aa,${p}55,${c}22)` }} />
      <div className="absolute" style={{ inset: 1, borderRadius: 30, background: 'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02) 45%,rgba(0,0,0,.45)), rgba(14,8,8,.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18)' }} />
      <div className="absolute inset-0 chr-slide-sheen" />
      <div className="absolute" style={{ left: 0, top: 0, bottom: 0, width: done ? '100%' : x + KNOB / 2 + 3, borderRadius: 30, background: `linear-gradient(90deg,${c}00,${c}55 60%,${p}88)`, overflow: 'hidden', transition: drag.current ? 'none' : 'width .25s ease' }}>
        {Array.from({ length: 12 }, (_, i) => <i key={i} className={`chr-slide-pt chr-slide-pt-${kind}`} style={slideParticle(kind, c, p, i)} />)}
      </div>
      <div className="absolute flex items-center justify-center" style={{ top: 0, bottom: 0, right: 0, left: x + KNOB + 8, opacity: done ? 0 : 0.9 * (1 - pct), pointerEvents: 'none', color: p, fontSize: 13, letterSpacing: 3, fontWeight: 600, textShadow: `0 0 8px ${c}`, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ marginRight: 8 }}>{th.txt}</span><b className="chr-slide-chev">›</b><b className="chr-slide-chev" style={{ animationDelay: '.15s' }}>›</b><b className="chr-slide-chev" style={{ animationDelay: '.3s' }}>›</b>
      </div>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="밀어서 해제" role="slider" aria-valuenow={Math.round(pct * 100)}
        className="absolute" style={{ left: 3 + x, top: 3, width: KNOB, height: KNOB, transition: drag.current ? 'none' : 'left .25s ease', cursor: 'grab' }}>
        <div className="absolute inset-0 chr-slide-ring" style={{ borderRadius: '50%', background: `conic-gradient(from 210deg,${p},${c},${a},${p},${c})`, filter: `drop-shadow(0 0 6px ${p})` }} />
        <div className="absolute flex items-center justify-center" style={{ inset: 3, borderRadius: '50%', background: 'radial-gradient(circle at 35% 28%,rgba(255,255,255,.35),rgba(30,14,14,.95) 55%,#0c0505)', boxShadow: `0 0 18px ${c}aa, inset 0 0 10px ${c}66` }}>
          <svg viewBox="0 0 32 32" width="36" height="36" style={{ filter: `drop-shadow(0 0 4px ${p})` }} dangerouslySetInnerHTML={{ __html: SLIDE_ICON[classId] || SLIDE_ICON.sage }} />
        </div>
      </div>
      {done && slideBurst(kind, c, p).map((bg, i) => <div key={i} className="absolute inset-0 chr-slide-burst" style={{ background: bg, mixBlendMode: 'screen' }} />)}
      {done && kind === 'leaf' && Array.from({ length: 9 }, (_, i) => <i key={i} className="chr-slide-burst" style={{ position: 'absolute', right: 20 + i * 22, top: 8 + (i * 29) % 40, width: 9, height: 5, borderRadius: '0 80% 0 80%', background: p, transform: `rotate(${i * 55}deg)` }} />)}
    </div>
  );
}

export function IdleScreen({ save, kind, label, startedAt, wakeOn, delay, onDelay, onExit }) {
  const hero = save.hero; const cls = chronicleClass(hero); const u = save.units[hero];
  const mo = IDLE_MOTION[hero] || IDLE_MOTION.sage;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const sec = Math.max(0, Math.floor((now - (startedAt || now)) / 1000));
  const el = `${Math.floor(sec / 3600) ? `${Math.floor(sec / 3600)}:` : ''}${String(Math.floor(sec / 60) % 60).padStart(Math.floor(sec / 3600) ? 2 : 1, '0')}:${String(sec % 60).padStart(2, '0')}`;
  const parts = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37 + 11) % 96 + 2, y: (i * 53 + 7) % 70 + 15, d: 5 + (i % 5) * 1.3, dl: -(i * 0.9) % 7, s: 3 + (i % 3) })), []);
  const xs = expSnap(save);
  const heroXp = useIdleXp(xs.hero, (L) => expNeedFor({ ...u, lv: L }));
  const famXp = useIdleXp(xs.fam, (L) => F.FAM_LEVEL.expNeed(L));
  const wakeTxt = typeof navigator !== 'undefined' && !('wakeLock' in navigator) ? '⚠ 이 브라우저는 화면 유지 미지원 — 화면이 꺼지면 멈춥니다' : wakeOn ? '🔆 화면 꺼짐 방지 켜짐' : '🔅 화면 꺼짐 방지 대기 중';
  return (
    <div className="absolute inset-0 overflow-hidden chr-idle" style={{ zIndex: 60, background: '#070404' }}>
      <img src={cls.image} alt="" className="absolute inset-0 w-full h-full object-cover chr-idle-breathe" style={{ objectPosition: '50% 18%', filter: 'brightness(.62) saturate(.9)' }} />
      <div className="absolute chr-idle-glow" style={{ left: '50%', top: '45%', width: 320, height: 320, margin: -160, borderRadius: '50%', background: `radial-gradient(circle, ${mo.glow}, transparent 65%)` }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,4,4,.25) 0%, rgba(7,4,4,0) 20%, rgba(7,4,4,0) 55%, rgba(7,4,4,.82) 76%, rgba(7,4,4,.96) 100%)' }} />
      {mo.kind === 'mist' && <div className="absolute inset-0 chr-idle-mist" style={{ background: `radial-gradient(60% 30% at 30% 70%, ${mo.glow}, transparent), radial-gradient(50% 25% at 75% 55%, ${mo.glow}, transparent)` }} />}
      {parts.map((q, i) => (
        <span key={i} className={`absolute chr-idle-p chr-idle-${mo.kind}`} style={{ left: `${q.x}%`, top: `${q.y}%`, width: mo.kind === 'slash' ? 46 : q.s, height: mo.kind === 'slash' ? 1.5 : q.s, borderRadius: mo.kind === 'slash' ? 1 : '50%', background: mo.p, boxShadow: `0 0 8px ${mo.p}`, animationDuration: `${q.d}s`, animationDelay: `${q.dl}s` }} />
      ))}
      <div className="absolute left-0 right-0 text-center" style={{ bottom: 126 }}>
        <div style={{ fontSize: 12, letterSpacing: 6, color: PALETTE.legendary, fontWeight: 700 }}>🌙 대기화면</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: PALETTE.text }}>{IDLE_KIND_LABEL[kind] || '자동 진행 중'}</div>
        <div style={{ fontSize: 12.5, color: '#d8c8b0', marginTop: 4 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#8fd08a', boxShadow: '0 0 8px #8fd08a', marginRight: 5 }} />{label ? `${label} · ` : ''}Lv.{u.lv} {cls.name} · 경과 {el}</div>
        <div style={{ margin: '9px 28px 0', textAlign: 'left' }}>
          <IdleXpRow name={cls.name} x={xs.hero} st={heroXp} now={now} />
          {xs.fam ? <IdleXpRow name={F.famName(xs.fam.key)} x={xs.fam} st={famXp} now={now} fam /> : null}
        </div>
        <div style={{ fontSize: 11.5, color: '#b8a890', marginTop: 7 }}>{wakeTxt}</div>
      </div>
      <div className="absolute flex items-center gap-1.5" style={{ left: 16, right: 16, bottom: 84 }}>
        <span style={{ fontSize: 11.5, color: '#9b8975', whiteSpace: 'nowrap', marginRight: 2 }}>자동 전환</span>
        {IDLE_DELAYS.map(([v, l]) => <button key={v} onClick={() => onDelay(v)} className="ui-press flex-1" style={{ height: 30, fontSize: 12, border: `1px solid ${delay === v ? MS.gold : MS.line}`, color: delay === v ? MS.gold : '#9b8975', background: delay === v ? 'rgba(232,176,74,.12)' : 'rgba(20,10,10,.6)' }}>{l}</button>)}
      </div>
      <SlideUnlock onUnlock={onExit} classId={hero} />
    </div>
  );
}
