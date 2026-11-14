// ============================================
// chronicle/screens/battle.jsx — 황혼 연대기 · 전투 화면 (카드·로그·결과)
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { BOSS_MECHS, gradeIdx, AUTO_CLIMB, chronicleClass, chronicleEnemyArt , unitTitle } from '../data.js';
import * as E from '../engine.js';
import * as R from '../roster.js';
import * as F from '../familiar.js';
import { FONT_TITLE, gradeOf, clsTag, CountUp, Bar, XP_HERO, XP_FAM, xpPct, XpResultRow, MainKvRows, MainTabs, MS, MainSecHead, MainModal } from './common.jsx';
import { huntRecord, newHuntStats, addHuntRecord, HuntReport } from './report.jsx';

// ===== 전투 카드 · 로그 (1.227.0) =====
// 보스 카드 (1.257.0, 시안 ㊷-②) — 가운데 크게 · 입체 금 테두리 + 진홍 띠 · BOSS 명판이 위 테두리에 절반 걸침
function BossCard({ u, art, hp, sh, acting, fx, w, h, ward = false, children }) {
  const dead = hp <= 0;
  return (
    <div className={`relative flex-none ${fx}`} style={{ width: w, opacity: dead ? 0.4 : 1, transition: 'opacity .3s', marginTop: 10 }}>
      <div className={`chr-boss${acting ? ' acting' : ''}`} style={{ height: h }}>
        <div className="chr-boss-plate"><span>BOSS</span></div>
        <div className="chr-boss-in">
          <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 25%', filter: dead ? 'grayscale(1)' : 'none' }} draggable={false} />
          <div className="chr-boss-shine" />
          {ward && <div className="absolute px-1.5" style={{ top: 14, right: 6, zIndex: 2, fontSize: 11, border: '1px solid #7fa8d8', color: '#a8c8f0', background: '#000b' }}>🛡 결계</div>}
          {u.intim ? <div className="absolute px-1.5" style={{ top: 14, left: 6, zIndex: 2, fontSize: 11, background: u.intim >= 4 ? '#7a0d0dee' : '#3a1a1acc', color: u.intim >= 4 ? '#ffd0d0' : '#ff9a8a', border: '1px solid #ff6a5a88' }}>{u.intim >= 4 ? '☠ 절대 위압' : `☗ 위압 ${u.intim}`}</div> : null}
          <div className="absolute left-0 right-0 bottom-0" style={{ padding: '22px 8px 6px', background: 'linear-gradient(transparent, #000e 55%)', zIndex: 2 }}>
            <div className="text-center truncate font-bold" style={{ fontSize: 13.5, color: '#ffe3a0', textShadow: '0 1px 2px #000' }}>Lv.{u.lv} {u.name}</div>
            <div className="mt-1"><Bar v={hp} max={u.maxHp} shield={sh} color="linear-gradient(90deg,#b8261c,#ff8a6a)" h={7} /></div>
            <div className="text-center" style={{ fontSize: 11, color: '#ddd', textShadow: '0 1px 2px #000' }}>{Math.max(0, hp).toLocaleString()} / {u.maxHp.toLocaleString()}{sh > 0 ? <span style={{ color: '#9cc4e4' }}> ◈{sh.toLocaleString()}</span> : null}</div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// 1.265.0 — 전투 결과 전체 화면 일러 (시안 ㊼, 본편 VictoryScreen 방식): 직업 승리/패배 일러 → 정산 창은 뒤에 올라온다
function ResultStage({ hero, title, lv, win, foe, rounds, revealed, onReveal }) {
  const cls = chronicleClass(hero);
  const art = (win ? cls.winImage : cls.lossImage) || cls.image;
  const tone = win ? MS.gold : '#e0574c';
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1, cursor: revealed ? 'default' : 'pointer' }} onClick={revealed ? undefined : onReveal}>
      <img src={art} onError={(e) => { if (cls.image && !e.currentTarget.src.endsWith(cls.image.slice(1))) e.currentTarget.src = cls.image; }} alt="" className="chr-result-in absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 20%', filter: win ? 'none' : 'saturate(.75)' }} draggable={false} />
      <div className="absolute left-0 right-0 top-0" style={{ height: 70, background: 'linear-gradient(#000a, transparent)' }} />
      {!revealed && <>
        <div className="absolute left-0 right-0 bottom-0" style={{ height: '45%', background: `linear-gradient(transparent, ${PALETTE.bgDeep}e6 70%, ${PALETTE.bgDeep})` }} />
        <div className="absolute left-0 right-0 text-center px-4" style={{ bottom: 64 }}>
          <div className="chr-result-sub" style={{ fontSize: 11, letterSpacing: '0.5em', color: tone }}>━━ {win ? 'V I C T O R Y' : 'D E F E A T'} ━━</div>
          <div className="chr-result-title font-bold" style={{ fontSize: 48, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: `0 0 24px ${tone}99, 0 2px 8px #000` }}>{win ? '승리' : '패배'}</div>
          <div className="chr-result-sub truncate" style={{ fontSize: 12.5, color: PALETTE.textDim, textShadow: '0 1px 4px #000', animationDelay: '.5s' }}>Lv.{lv} {title || cls.name} · {foe ? (win ? `「${foe}」 처치` : `「${foe}」에게 쓰러짐`) : (win ? '적을 처치' : '쓰러졌다')} · {rounds}라운드</div>
        </div>
        <div className="absolute left-0 right-0 text-center" style={{ bottom: 22, fontSize: 11.5, color: PALETTE.textDim, opacity: 0.8 }}>화면을 누르면 바로 정산</div>
      </>}
      {revealed && <div className="absolute left-0 right-0 text-center" style={{ top: 50 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.5em', color: tone, textShadow: '0 1px 3px #000' }}>{win ? 'V I C T O R Y' : 'D E F E A T'}</div>
        <div className="font-bold" style={{ fontSize: 30, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: `0 0 18px ${tone}99, 0 2px 6px #000` }}>{win ? '승리' : '패배'}</div>
      </div>}
    </div>
  );
}

function BattleCard({ u, art, hp, sh, acting, fx, h, enemy = false, border, children, xp = null, w = null }) {
  const dead = hp <= 0;
  const accent = enemy ? '#ff8a80' : u.fam ? '#d07ae8' : chronicleClass(u.classId).color;
  return (
    <div className={`relative ${w ? 'flex-none' : 'flex-1'} min-w-0 ${fx}`} style={{ width: w || undefined, opacity: dead ? 0.35 : 1, transition: 'opacity .3s' }}>
      <div className="relative overflow-hidden" style={{ height: h, borderRadius: 12, border: `1.5px solid ${acting ? accent : border}`, boxShadow: acting ? `0 0 12px ${accent}66` : 'none', transition: 'box-shadow .2s, border-color .2s' }}>
        <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: enemy ? '50% 40%' : '50% 22%', filter: dead ? 'grayscale(1)' : 'none' }} draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, #000d)' }} />
        {enemy && u.erole ? <div className="absolute top-1 right-1 px-1.5" style={{ fontSize: 11, borderRadius: 6, background: '#000a', color: u.erole === 'tank' ? '#9cc4e4' : '#8fe08a', border: `1px solid ${u.erole === 'tank' ? '#9cc4e4' : '#8fe08a'}66` }}>{u.warden ? '🛡 결계 호위' : u.acolyte ? '✚ 의식 사제' : u.erole === 'tank' ? '🛡 수호' : '✚ 치유'}</div> : null}
        {enemy && u.intim ? <div className="absolute top-1 left-1 px-1.5" style={{ fontSize: 11, borderRadius: 6, background: u.intim >= 4 ? '#7a0d0dee' : '#3a1a1acc', color: u.intim >= 4 ? '#ffd0d0' : '#ff9a8a', border: '1px solid #ff6a5a88' }}>{u.intim >= 4 ? '☠ 절대 위압' : `☗ 위압 ${u.intim}`}</div> : null}
        <div className="absolute bottom-1 left-1.5 right-1.5">
          {h < 150 ? (
            // 좁은 카드 (레이드 등 인원이 많을 때) — 짧은 이름 + 바 아래 HP
            <>
              <div className="truncate" style={{ fontSize: 11, color: '#fff', textShadow: '0 1px 2px #000' }}>{u.short || u.name}</div>
              <Bar v={hp} max={u.maxHp} shield={sh} color={enemy ? 'linear-gradient(90deg,#8b1f1f,#e0574c)' : 'linear-gradient(90deg,#3d7a3a,#7fcf6a)'} h={6} />
              <div className="truncate" style={{ fontSize: 11, color: '#ddd', textShadow: '0 1px 2px #000' }}>{Math.max(0, hp).toLocaleString()}{sh > 0 ? <span style={{ color: '#9cc4e4' }}> ◈{sh.toLocaleString()}</span> : null}</div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate" style={{ fontSize: 11.5, color: '#fff', textShadow: '0 1px 2px #000' }}>{u.fam ? '🐾 ' : ''}Lv.{u.lv} {u.name}</span>
                <span className="flex-none" style={{ fontSize: 11, color: '#ddd', textShadow: '0 1px 2px #000' }}>{Math.max(0, hp).toLocaleString()}{sh > 0 ? <span style={{ color: '#9cc4e4' }}> ◈{sh.toLocaleString()}</span> : null}</span>
              </div>
              <Bar v={hp} max={u.maxHp} shield={sh} color={enemy ? 'linear-gradient(90deg,#8b1f1f,#e0574c)' : 'linear-gradient(90deg,#3d7a3a,#7fcf6a)'} h={7} />
              {xp && <>
                <div className="mt-0.5"><Bar v={xp.pct} max={100} color={u.fam ? XP_FAM : XP_HERO} h={4} /></div>
                <div className="flex justify-between" style={{ fontSize: 11, color: '#e8d3a0', textShadow: '0 1px 2px #000' }}>
                  <span>EXP {Math.floor(xp.pct)}%</span>
                  {xp.gain > 0 ? <b style={{ color: u.fam ? '#e8b8ff' : '#ffe08a' }}>+{xp.gain.toLocaleString()}</b> : null}
                </div>
              </>}
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// 전체 화면 전투 기록 (1.258.0, 시안 ㊸-2) — 처음부터 끝까지 · 전체/아군/적/스킬
function FullBattleLog({ sim, party, unitOf, label, onClose }) {
  const [tab, setTab] = useState('all');
  const mine = new Set(party.map(p => p.id));
  const all = sim.events.filter(e => e.a || e.round || e.k === 'pre');
  const keep = (e) => tab === 'all' || (tab === 'party' ? mine.has(e.a) : tab === 'enemy' ? !mine.has(e.a) : (e.skill || e.k === 'open' || e.k === 'pre'));
  const list = all.filter(e => e.round || keep(e)).filter((e, i, arr) => !e.round || (arr[i + 1] && !arr[i + 1].round));
  const acts = all.filter(e => !e.round && e.k !== 'pre').length;
  const win = sim.result === 'win';
  return (
    <MainModal full kicker="BATTLE LOG" title="전투 기록" badge={win ? '승리' : '패배'} color={win ? MS.red : '#e06a5f'} sub={`${label} · ${sim.rounds || 1}라운드 · 사건 ${acts}개`} onClose={onClose}>
      <MainTabs value={tab} onChange={setTab} items={[['all', '전체'], ['party', '아군'], ['enemy', '적'], ['skill', '스킬']]} />
      <div className="flex flex-col gap-1 mt-2" style={{ fontSize: 13 }}>
        {list.map((e, i) => <BattleLogLine key={i} e={e} latest={false} unitOf={unitOf} />)}
        {!list.length && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>해당하는 기록이 없습니다</div>}
      </div>
    </MainModal>
  );
}

const LOG_C = { dmg: '#ff8a80', crit: '#ffb347', heal: '#8fe08a', shield: '#9cc4e4', buff: '#e8c48a', debuff: '#c08ae8', miss: '#9a9a9a', holy: '#ffe9a8', skill: '#e8b04a' };

const ROLE_KO = { tank: '수호', healer: '치유', dps: '맹공', boss: '보스' };

const PRE_TONE = { shield: '#9cc4e4', buff: '#e8c48a', foe: '#ff8a80', ready: '#b8f0c8' };

function BattleLogLine({ e, latest, unitOf }) {
  // 전투 시작 연출 (1.259.0) — 전투 돌입 · 전투 전 효과
  if (e.k === 'pre' && e.pre === 'enter') {
    const cnt = {}; (e.roles || []).forEach(r => { cnt[r] = (cnt[r] || 0) + 1; });
    const roles = Object.entries(cnt).map(([r, n]) => `${ROLE_KO[r] || r} ${n}`).join(' · ');
    return (
      <div className="text-center" style={{ padding: '2px 0' }}>
        <div style={{ fontSize: 11.5, letterSpacing: 4, color: MS.gold, fontWeight: 700 }}>◆ 전투 돌입 ◆</div>
        <div style={{ fontSize: 11, color: PALETTE.textDim }}>적 {e.foes}마리{roles ? ` (${roles})` : ''}</div>
        {e.fx > 0 && <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11, color: MS.gold }}><span className="flex-1" style={{ height: 1, background: 'var(--ui-line)' }} />전투 전 효과<span className="flex-1" style={{ height: 1, background: 'var(--ui-line)' }} /></div>}
      </div>
    );
  }
  if (e.k === 'pre' && e.pre === 'fx') {
    const u = e.a ? unitOf(e.a) : null;
    const nc = !u ? '#ff8a80' : u.side === 'enemy' ? '#ff7a5c' : u.fam ? '#c79bff' : chronicleClass(u.classId).color;
    return (
      <div className="flex gap-1.5" style={{ fontSize: 12, lineHeight: 1.5 }}>
        <span className="flex-none" style={{ width: 16, textAlign: 'center' }}>{e.icon}</span>
        <span>{u ? <b style={{ color: nc, fontWeight: 600 }}>{u.fam ? '🐾' : ''}{u.name} </b> : <b style={{ color: nc, fontWeight: 600 }}>적 전체 </b>}<b style={{ color: PRE_TONE[e.tone] || PALETTE.text }}>{e.n}</b> <span style={{ color: PALETTE.textDim }}>— {e.v}</span>{e.src && <span style={{ color: PALETTE.textDim, fontSize: 11 }}> ({e.src})</span>}</span>
      </div>
    );
  }
  if (e.round) {
    return <div className="flex items-center gap-2 my-0.5" style={{ fontSize: 11, color: PALETTE.textDim }}><span className="flex-1" style={{ height: 1, background: 'var(--ui-line)' }} />{e.round}라운드<span className="flex-1" style={{ height: 1, background: 'var(--ui-line)' }} /></div>;
  }
  const actor = unitOf(e.a);
  const nameColor = (u) => (!u ? PALETTE.text : u.side === 'enemy' ? '#ff7a5c' : u.fam ? '#c79bff' : chronicleClass(u.classId).color);
  const N = ({ id }) => { const u = unitOf(id); return <b style={{ color: nameColor(u), fontWeight: 600 }}>{u?.fam ? '🐾' : ''}{u?.name || ''}</b>; };
  const icon = e.k === 'open' ? '🔥' : e.k === 'dotTick' ? '☠' : e.k === 'hot' ? '✚' : e.skill ? '✦' : e.k === 'heavy' ? '💢' : e.k === 'aoe' ? '💥' : '⚔';
  const actColor = e.k === 'open' ? LOG_C.crit : e.k === 'dotTick' ? LOG_C.debuff : e.k === 'hot' ? LOG_C.heal : e.skill ? LOG_C.skill : e.k === 'heavy' ? LOG_C.crit : PALETTE.text;
  const chip = (h, i) => {
    const sp = { marginLeft: 6, whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }; // inline-block = 칩 사이에서 줄바꿈 (1.232.1)
    if (h.m) return <span key={i} style={{ ...sp, color: LOG_C.miss }}><N id={h.t} /> 빗나감</span>;
    if (e.k === 'dotTick' && h.d > 0) return <span key={i} style={{ ...sp, color: LOG_C.debuff, fontWeight: 600 }}>-{h.d.toLocaleString()}</span>;
    if (h.d > 0) {
      const c = h.c ? LOG_C.crit : h.holy ? LOG_C.holy : h.cover ? LOG_C.shield : LOG_C.dmg;
      const pre = h.counter ? '↺ 반격 ' : h.cover ? '🛡 대신 ' : h.chain ? '⚡ 추가타 ' : h.holy ? '☀ ' : h.c ? '💥 ' : '';
      return <span key={i} style={{ ...sp, color: c, fontWeight: h.c ? 800 : 600, fontSize: h.c ? 13 : undefined }}>{pre}<N id={h.t} /> -{h.d.toLocaleString()}{h.c ? ' 치명!' : ''}{h.ab > 0 ? <span style={{ color: LOG_C.shield, fontWeight: 400 }}> (◈흡수 {h.ab.toLocaleString()})</span> : null}</span>;
    }
    if (h.d === 0 && h.ab > 0) return <span key={i} style={{ ...sp, color: LOG_C.shield, fontWeight: 600 }}>◈ <N id={h.t} /> 보호막 흡수 {h.ab.toLocaleString()}{h.c ? ' (치명)' : ''}</span>;
    if (h.d === 0 && !h.m && h.h == null && h.s == null) return <span key={i} style={{ ...sp, color: LOG_C.miss }}><N id={h.t} /> 피해 없음</span>;
    if (h.h) return <span key={i} style={{ ...sp, color: LOG_C.heal, fontWeight: 600 }}>✚ <N id={h.t} /> +{(h.eh ?? h.h).toLocaleString()}</span>;
    if (h.s) return <span key={i} style={{ ...sp, color: LOG_C.shield, fontWeight: 600 }}>◈ <N id={h.t} /> +{(h.es ?? h.s).toLocaleString()}</span>;
    if (h.buff) return <span key={i} style={{ ...sp, color: LOG_C.buff }}>▲ <N id={h.t} /> 강화</span>;
    if (h.debuff) return <span key={i} style={{ ...sp, color: LOG_C.debuff }}>▼ <N id={h.t} /> 약화</span>;
    if (h.burn) return <span key={i} style={{ ...sp, color: LOG_C.crit }}>🔥 <N id={h.t} /></span>;
    if (h.dot) return <span key={i} style={{ ...sp, color: LOG_C.debuff }}>☠ <N id={h.t} /> 「{e.n}」 부여</span>;
    return null;
  };
  return (
    <div className={latest ? 'chr-log-in' : ''} style={{ fontSize: 12, lineHeight: 1.5, padding: latest || e.k === 'open' ? '3px 6px' : '0 6px', borderRadius: 8, background: e.k === 'open' ? 'linear-gradient(90deg, #5a1a0a99, transparent)' : latest ? 'rgba(232,176,74,0.10)' : 'transparent', borderLeft: `2px solid ${e.k === 'open' ? '#ff7a3a' : latest ? actColor : 'transparent'}`, color: PALETTE.textDim, opacity: latest || e.k === 'open' ? 1 : 0.85 }}>
      <span style={{ color: actColor }}>{icon} </span>
      {e.k === 'dotTick' ? <><N id={e.a} /> <span style={{ color: LOG_C.debuff }}>지속 피해{e.dotSrc && Object.keys(e.dotSrc).length ? ` (${[...new Set(Object.keys(e.dotSrc).map(k => k.split('|')[1]))].join('·')})` : ''}</span></> : <><N id={e.a} /> <span style={{ color: e.k === 'open' ? '#ff9a5a' : actColor, fontWeight: e.skill || e.k === 'open' ? 700 : 400 }}>{e.n}</span></>}
      {(e.hits || []).map(chip)}
    </div>
  );
}

// ===== 전투 재생 =====
const SPEEDS = [1, 2, 4];

export function BattleView({ battle, save, onDone, repeat, onToggleRepeat, onAgain, boostLeft = 0, onAskBoost, dungeonAuto = false, onToggleDungeonAuto, autoProg = false, onStopAuto, onReplayDone, sessionReport = null, holdAuto = false, towerAuto = false, onToggleTowerAuto, onIdle = null, idleDelay = 60, autoClimb = false, onToggleClimb }) {
  const { sim, enemies, party, summary, ctx, xp } = battle;
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState(null); // 전투 집계 (1.215.1)
  const openStats = () => { const r = newHuntStats(); addHuntRecord(r, huntRecord(sim, party, { type: ctx.type, enemies }, summary, speed, ctx.label)); setStats(r); };
  const dungeonNext = ctx.kind === 'dungeon' && sim.result === 'win' && !summary.dungeonClear;
  const towerNext = ctx.kind === 'tower' && sim.result === 'win'; // 첨탑은 지면 도전이 끝난다 — 이기는 동안 계속
  const [speedPref, setSpeed] = useState(() => { try { return +localStorage.getItem('chronicleSpeed') || 2; } catch { return 2; } });
  // ×4는 이용권이 있을 때만 (1.213.0) — 만료되면 ×2로
  const speed = speedPref === 4 && boostLeft <= 0 ? 2 : speedPref;
  const done = idx >= sim.events.length;
  const brief = repeat || autoProg || towerAuto || dungeonAuto || speed >= 4; // 연출 짧게
  useEffect(() => { if (done) onReplayDone?.(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  // 1.265.0 — 결과: 전체 화면 일러 먼저, 정산 창은 1.2초 뒤(반복·자동 중엔 0.3초) 또는 탭
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!done || revealed) return undefined;
    const t = setTimeout(() => setRevealed(true), brief ? 300 : 1200);
    return () => clearTimeout(t);
  }, [done, revealed, brief]);
  useEffect(() => {
    if (done) return undefined;
    const ev = sim.events[idx];
    // 1.259.0 — 전투 시작 연출: 돌입 · 낙인 · 1라운드는 길게 (반복·자동·×4에선 짧게)
    const base = !brief && ev.k === 'pre' && ev.pre === 'enter' ? 1300 : !brief && ev.k === 'pre' && ev.tone === 'ready' ? 1100 : !brief && ev.k === 'pre' ? 560 : !brief && ev.k === 'open' ? 1500 : !brief && ev.round === 1 ? 900
      : ev.k === 'pre' ? 160 : ev.round ? 160 : ev.k === 'dotTick' ? (brief ? 80 : 380) : ev.k === 'open' ? (brief ? 80 : 620) : 620; // 1.286.4 반복·자동 중엔 낙인·지속 피해 표시를 짧게
    const t = setTimeout(() => setIdx(i => i + 1), base / speed);
    return () => clearTimeout(t);
  }, [idx, speed, done, sim.events]);
  // 자동 진행 (1.234.0): 승리하면 다음 단계(사냥·관문·보스)로
  useEffect(() => {
    if (!done || !autoProg || stats || holdAuto || sim.result !== 'win' || ctx.kind !== 'field') return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, autoProg, stats, sim.result, ctx, onAgain]);
  // 반복 사냥: 승리 후 자동 다음 전투
  useEffect(() => {
    const fb = !!battle.summary?.fallback; // 패배 → 직전 성공 맵으로 이어서 반복
    if (!done || !repeat || stats || holdAuto || ctx.kind !== 'field' || (!fb && (sim.result !== 'win' || ctx.type === 'boss'))) return undefined;
    const t = setTimeout(onAgain, fb ? 2600 : 1800);
    return () => clearTimeout(t);
  }, [done, repeat, stats, sim.result, ctx, onAgain]);
  // 던전 연속 도전 (1.215.1): 승리하면 다음 층 → 보스까지 자동 진행
  useEffect(() => {
    if (!done || !dungeonAuto || !dungeonNext || stats || holdAuto) return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, dungeonAuto, dungeonNext, stats, onAgain]);
  // 첨탑 자동 등반 (1.240.0): 승리하면 다음 층 → 패배할 때까지
  useEffect(() => {
    if (!done || !towerAuto || !towerNext || stats || holdAuto) return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, towerAuto, towerNext, stats, holdAuto, onAgain]);
  const setSp = (s) => { setSpeed(s); try { localStorage.setItem('chronicleSpeed', String(s)); } catch { /* */ } };

  const cur = sim.events[Math.min(idx, sim.events.length - 1)];
  // 최신 상태 스냅샷 (st가 있는 마지막 사건)
  let st = null;
  for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) { if (sim.events[i].st) { st = sim.events[i].st; break; } }
  const hpOf = (u) => (st && st[u.id] ? st[u.id][0] : u.hp);
  const shOf = (u) => (st && st[u.id] ? st[u.id][1] : 0);
  const unitOf = (id) => [...party, ...enemies].find(u => u.id === id);
  const curHits = cur && cur.a ? cur.hits || [] : [];
  const hitFor = (id) => curHits.filter(h => h.t === id);
  const round = (() => { for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) if (sim.events[i].round) return sim.events[i].round; return 0; })();
  const isBoss = ctx.type === 'boss' || ctx.type === 'dungeonBoss';
  const bg = isBoss ? chronicleEnemyArt(enemies[0].key, 'intro') : null;
  // 로그 (1.227.0) — 지금까지의 사건 전부, 최신이 아래. 자동 스크롤
  const logEvents = sim.events.slice(Math.max(0, idx + 1 - 80), idx + 1).filter(e => e.a || e.round || e.k === 'pre');
  const logRef = useRef(null);
  const [logFull, setLogFull] = useState(false);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [idx]);

  const Float = ({ id }) => hitFor(id).map((h, i) => {
    const txt = h.m ? '빗나감' : h.d === 0 && h.ab > 0 ? `◈흡수 ${h.ab}` : h.h ? `+${h.eh ?? h.h}` : h.s ? `◈${h.es ?? h.s}` : h.buff ? '▲강화' : h.debuff ? '▼약화' : h.dot && h.d == null ? '☠중독' : h.d != null ? `${h.counter ? '반격 ' : h.cover ? '대신 ' : ''}-${h.d}${h.c ? '!' : ''}` : '';
    const color = h.m ? '#bbb' : h.d === 0 && h.ab > 0 ? '#9cc4e4' : h.h ? '#8fe08a' : h.s ? '#9cc4e4' : h.buff ? '#e8c48a' : h.debuff || h.dot ? '#c08ae8' : h.cover ? '#9cc4e4' : h.c ? '#ffd27a' : '#ff8a80';
    if (!txt) return null;
    return <div key={`${idx}-${i}`} className="arc-float absolute font-bold pointer-events-none" style={{ left: '50%', top: '35%', fontSize: h.c ? 22 : 17, color, textShadow: '0 2px 6px #000', animationDelay: `${i * 80}ms`, zIndex: 3 }}>{txt}</div>;
  });
  // 카드 이펙트 — 치명타 섬광 · 회복 초록빛 · 보호막 하늘빛 · 피격 흔들림
  const fxClass = (id) => {
    const hs = hitFor(id);
    if (hs.some(h => h.c && h.d > 0)) return 'chr-fx-crit';
    if (hs.some(h => h.d > 0)) return 'arc-shake';
    if (hs.some(h => h.h)) return 'chr-fx-heal';
    if (hs.some(h => h.s)) return 'chr-fx-shield';
    if (hs.some(h => h.burn)) return 'chr-fx-burn';
    return '';
  };
  const cardH = enemies.length > 3 || party.length > 3 ? 118 : 150;
  const maxIntim = Math.max(0, ...enemies.map(e => e.intim || 0));

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bg }}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.18 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div className="relative flex items-center gap-2 px-3 pt-2 flex-none" style={{ minHeight: 44, zIndex: 5 }}>
        <span style={{ fontSize: 12, color: PALETTE.textDim }}>{ctx.label} · {round ? `${round}라운드` : '전투 준비'}{enemies[0]?.rebirthTier ? <span style={{ color: '#ff6ad5' }}> · ✦전승 {enemies[0].rebirthTier}단계</span> : null}{enemies[0]?.mech && BOSS_MECHS[enemies[0].mech] ? <span style={{ color: PALETTE.legendary }}> · {BOSS_MECHS[enemies[0].mech].icon}{BOSS_MECHS[enemies[0].mech].name}</span> : null}{maxIntim ? <span style={{ color: '#ff7a6a' }}> · {maxIntim >= 4 ? '☠절대 위압' : `☗위압 ${maxIntim}단계`}</span> : null}</span>
        <div className="flex-1" />
        {SPEEDS.map(s => {
          const locked = s === 4 && boostLeft <= 0;
          return (
            <button key={s} onClick={() => (locked ? onAskBoost?.() : setSp(s))} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: `1px solid ${speed === s ? PALETTE.legendary : 'var(--ui-line)'}`, color: speed === s ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', opacity: locked ? 0.6 : 1 }}>
              {locked ? '×4 🔒' : s === 4 ? `×4 ${Math.ceil(boostLeft / 60000)}분` : `×${s}`}
            </button>
          );
        })}
        {!done && <button onClick={() => setIdx(sim.events.length)} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: '1px solid var(--ui-line)', color: PALETTE.dawn, background: 'transparent' }}>⏩</button>}
        {onIdle && <button onClick={onIdle} aria-label="대기화면" className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary, background: 'transparent', whiteSpace: 'nowrap' }}>🌙{idleDelay ? '' : <span style={{ fontSize: 11, marginLeft: 3, color: PALETTE.textDim }}>수동</span>}</button>}
      </div>

      {/* 적 — 전투가 끝나면 직업 승리/패배 일러 (1.261.0) */}
      {done ? (
        <ResultStage title={unitTitle(save.units[save.hero], save.hero)} hero={party.find(p => !p.fam)?.classId || save.hero} lv={(xp?.after?.hero || xp?.before?.hero)?.lv || party.find(p => !p.fam)?.lv}
          win={sim.result === 'win'} foe={(enemies.find(e => e.tier === 'boss') || enemies.find(e => e.tier === 'elite') || enemies[0])?.name}
          rounds={sim.rounds || round} revealed={revealed} onReveal={() => setRevealed(true)} />
      ) : (() => {
        // 1.257.0 — 보스가 있고 3마리 이하면 보스를 가운데 크게 (레이드처럼 많을 땐 기존 배열)
        const boss = enemies.length <= 3 ? enemies.find(e => e.tier === 'boss') : null;
        const card = (e, extra = {}) => (
          <BattleCard key={e.id} u={e} art={e.art || chronicleEnemyArt(e.key)} hp={hpOf(e)} sh={shOf(e)} acting={cur?.a === e.id} fx={fxClass(e.id)} h={cardH} enemy
            border={e.tier === 'boss' ? '#c4453d88' : e.tier === 'elite' ? '#e8b04a88' : 'var(--ui-line)'} {...extra}>
            <Float id={e.id} />
          </BattleCard>
        );
        if (!boss) return <div className="relative flex gap-2 px-3 pt-1 flex-none">{enemies.map(e => card(e))}</div>;
        const others = enemies.filter(e => e !== boss);
        const ward = others.some(e => e.warden && hpOf(e) > 0);
        const solo = !others.length;
        return (
          <div className="relative flex items-center justify-center gap-2 px-3 pt-2 flex-none">
            {others[0] && card(others[0], { h: 140, w: 88 })}
            <BossCard u={boss} art={chronicleEnemyArt(boss.key)} hp={hpOf(boss)} sh={shOf(boss)} acting={cur?.a === boss.id} fx={fxClass(boss.id)} w={solo ? 190 : 172} h={solo ? 236 : 222} ward={ward}>
              <Float id={boss.id} />
            </BossCard>
            {others[1] && card(others[1], { h: 140, w: 88 })}
          </div>
        );
      })()}

      {/* 전투 시작 연출 (1.259.0, 시안 ㊹) — 돌입 배너 · 이프리트의 낙인 컷인 · 1라운드 배너 */}
      {!brief && !done && cur && (cur.k === 'pre' && cur.pre === 'enter' ? (
        <div key={`ov-${idx}`} className="chr-banner absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 6, background: 'radial-gradient(ellipse at center, #000c 0%, #0008 60%, transparent 100%)' }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 8, color: '#ffe3a0', textShadow: '0 0 18px #e8b04a, 0 2px 4px #000', fontFamily: FONT_TITLE }}>전투 돌입</div>
          <div style={{ height: 2, width: 240, margin: '8px 0', background: 'linear-gradient(90deg, transparent, #e8b04a, transparent)' }} />
          <div style={{ fontSize: 12.5, color: PALETTE.text, textShadow: '0 1px 3px #000' }}>{ctx.label} · 적 {cur.foes}마리</div>
        </div>
      ) : cur.k === 'open' && cur.brand ? (
        <div key={`ov-${idx}`} className="chr-banner absolute left-0 right-0 text-center pointer-events-none" style={{ zIndex: 6, top: '30%' }}>
          <div className="absolute left-0 right-0" style={{ top: -6, height: 66, background: 'linear-gradient(90deg, transparent, #3a0a04ee 18%, #3a0a04ee 82%, transparent)', borderTop: '1px solid #ff7a3a88', borderBottom: '1px solid #ff7a3a88' }} />
          <div className="relative" style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, color: '#ffb070', textShadow: '0 0 16px #ff5a1a, 0 0 4px #000', fontFamily: FONT_TITLE }}>🔥 이프리트의 낙인</div>
          <div className="relative" style={{ fontSize: 12, color: '#ffe3c0', textShadow: '0 1px 3px #000' }}>적 전체 · 매 턴 {cur.brand.v.toLocaleString()} 피해 · {cur.brand.turns}턴</div>
        </div>
      ) : cur.k === 'pre' && cur.tone === 'ready' ? (() => {
        // 1.260.0 — 대기형 효과 컷인 (직업색 띠): 선제 일격 · 위기 회복 · 버팀 · 부활 대기
        const ru = unitOf(cur.a); const rc = ru && !ru.fam ? chronicleClass(ru.classId).color : '#c79bff';
        return (
          <div key={`ov-${idx}`} className="chr-banner absolute left-0 right-0 text-center pointer-events-none" style={{ zIndex: 6, top: '30%' }}>
            <div className="absolute left-0 right-0" style={{ top: -6, height: cur.src ? 80 : 64, background: `linear-gradient(90deg, transparent, #0a0a0cee 18%, #0a0a0cee 82%, transparent)`, borderTop: `1px solid ${rc}99`, borderBottom: `1px solid ${rc}99`, boxShadow: `inset 0 0 24px ${rc}33` }} />
            <div className="relative" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: rc, textShadow: `0 0 14px ${rc}, 0 0 4px #000`, fontFamily: FONT_TITLE }}>{cur.icon} {cur.n}</div>
            <div className="relative" style={{ fontSize: 12, color: PALETTE.text, textShadow: '0 1px 3px #000' }}>{ru?.name} · {cur.v}</div>
            {cur.src && <div className="relative" style={{ fontSize: 11, color: PALETTE.textDim, textShadow: '0 1px 3px #000' }}>{cur.src}</div>}
          </div>
        );
      })() : cur.round === 1 ? (
        <div key={`ov-${idx}`} className="chr-banner absolute left-0 right-0 text-center pointer-events-none" style={{ zIndex: 6, top: '30%' }}>
          <div className="absolute left-0 right-0" style={{ top: -6, height: 60, background: 'linear-gradient(90deg, transparent, #1a0e04ee 18%, #1a0e04ee 82%, transparent)', borderTop: '1px solid #e8b04a88', borderBottom: '1px solid #e8b04a88' }} />
          <div className="relative" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, color: '#ffe3a0', textShadow: '0 0 14px #e8b04a', fontFamily: FONT_TITLE }}>⚔ 1라운드</div>
          <div className="relative" style={{ fontSize: 12, color: PALETTE.text }}>턴 시작</div>
        </div>
      ) : null)}

      {/* 전투 로그 — 적과 아군 사이 전체 (끝나면 숨김 — 「📜 전투 기록」 버튼으로 전체 화면) */}
      <div className={`relative flex-1 min-h-0 mx-3 my-2 flex-col ${done ? 'hidden' : 'flex'}`} style={{ borderRadius: 12, background: 'rgba(0,0,0,0.38)', border: '1px solid var(--ui-line)' }}>
        {cur?.skill && !done && (
          <div key={`call-${idx}`} className="chr-skill-call absolute font-bold pointer-events-none text-center" style={{ left: '50%', top: '50%', zIndex: 4, fontSize: 22, color: PALETTE.legendary, fontFamily: FONT_TITLE, textShadow: '0 0 14px #e8b04acc, 0 2px 6px #000', whiteSpace: 'nowrap' }}>
            ✦ {cur.n}
            <div style={{ fontSize: 12, color: PALETTE.text, fontWeight: 400, textShadow: '0 1px 4px #000' }}>{unitOf(cur.a)?.name}</div>
          </div>
        )}
        <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-1">
          {logEvents.map((e, i) => <BattleLogLine key={`${idx - (logEvents.length - 1 - i)}-${i}`} e={e} latest={i === logEvents.length - 1 && !done} unitOf={unitOf} />)}
        </div>
        {/* 1.258.0 — 전투가 끝나면 전체 화면 로그 (시안 ㊸) */}
        {done && (
          <button onClick={() => setLogFull(true)} aria-label="로그 크게 보기" className="ui-press absolute flex items-center justify-center" style={{ top: 6, right: 6, zIndex: 3, width: 32, height: 32, borderRadius: 6, border: `1px solid ${MS.gold}`, color: MS.gold, background: MS.box, boxShadow: '0 0 10px #e8b04a55', fontSize: 16 }}>⤢</button>
        )}
      </div>
      {logFull && <FullBattleLog sim={sim} party={party} unitOf={unitOf} label={ctx.label} onClose={() => setLogFull(false)} />}

      {/* 아군 — 적과 같은 카드 형식 (끝나면 숨김 — 성장 줄에 경험치 표시) */}
      <div className={`relative gap-2 px-3 pb-2 flex-none ${done ? 'hidden' : 'flex'}`}>
        {party.map(p => (
          <BattleCard key={p.id} u={p} art={p.fam ? chronicleEnemyArt(p.famKey) : chronicleClass(p.classId).combatImage} hp={hpOf(p)} sh={shOf(p)} acting={cur?.a === p.id} fx={fxClass(p.id)} h={cardH}
            border={p.fam ? '#d07ae888' : `${chronicleClass(p.classId).color}88`}
            xp={xp && cardH >= 150 ? (() => {
              const b = p.fam ? xp.before.fam : xp.before.hero; const a = p.fam ? xp.after.fam : xp.after.hero;
              if (!b) return null;
              const win = done && sim.result === 'win' && a;
              return { pct: xpPct(win ? a : b), gain: win ? (p.fam ? summary.famExp?.gained || 0 : summary.exp || 0) : 0 };
            })() : null}>
            <Float id={p.id} />
          </BattleCard>
        ))}
      </div>

      {/* 결과 */}
      {done && revealed && (
        <div className="chr-result-panel absolute left-0 right-0 bottom-0 flex flex-col min-h-0 px-3 pb-3" style={{ zIndex: 4, height: brief ? 'auto' : '62%', maxHeight: '62%' }}>
          {/* 1.253.0 — 본편 스타일 (시안 ㉘) · 1.260.1 버튼은 스크롤 밖 하단 고정 (보상이 길면 버튼이 화면 밖으로 밀리던 문제) */}
          <div className="chr-glass flex flex-col min-h-0 flex-1" style={{ '--edge': sim.result === 'win' ? MS.gold : MS.red, '--glow': sim.result === 'win' ? 'rgba(232,176,74,.22)' : 'rgba(224,87,76,.22)' }}>
          <div className="overflow-y-auto min-h-0 flex-1" style={{ padding: '10px 12px 4px' }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold" style={{ fontSize: 18, color: sim.result === 'win' ? PALETTE.text : '#e06a5f', fontFamily: FONT_TITLE }}>{sim.result === 'win' ? (ctx.kind === 'arena' ? '결투 승리' : '전투 결과') : ctx.kind === 'arena' ? '결투 패배' : '전멸'}</span>
              <span className="truncate" style={{ fontSize: 11, letterSpacing: 2, color: MS.gold }}>{ctx.label} · {sim.rounds || round}라운드</span>
            </div>
            {sim.result === 'win' ? (
              <div className="mt-1.5 flex flex-col gap-1" style={{ fontSize: 12.5, color: PALETTE.text }}>
                {ctx.kind !== 'raid' && ctx.kind !== 'arena' && <>
                  <MainSecHead title="획 득" />
                  <MainKvRows rows={[
                    { l: '경험치', v: <>+<CountUp v={summary.exp} /></>, c: MS.gold }, { l: '골드', v: <>🪙 +<CountUp v={summary.gold} /></>, c: MS.gold },
                    { l: '정수', v: `✦ +${summary.essence}` }, summary.shard ? { l: '파편', v: `◆ +${summary.shard}`, c: '#c79bff' } : { l: '장비', v: summary.items.length ? `${summary.items.length}개` : '—', c: summary.items.length ? '#7fa8d8' : PALETTE.textDim },
                    ...(summary.shard ? [{ l: '장비', v: summary.items.length ? `${summary.items.length}개` : '—', c: summary.items.length ? '#7fa8d8' : PALETTE.textDim }] : []),
                  ]} />
                </>}
                {!brief && xp && (xp.after.hero || xp.after.fam) && <MainSecHead title="성 장" />}
                {!brief && xp && (xp.after.hero || xp.after.fam) && <div className="flex flex-col gap-1.5 mb-0.5">
                  <XpResultRow art={chronicleClass(save.hero).image} name={unitTitle(save.units[save.hero], save.hero)} before={xp.before.hero} after={xp.after.hero} />
                  {xp.after.fam && summary.famExp ? <XpResultRow fam art={chronicleEnemyArt(xp.after.fam.key)} name={F.famName(xp.after.fam.key)} before={xp.before.fam} after={xp.after.fam} /> : null}
                </div>}
                {summary.items.length ? <div className="grid gap-1 mt-1.5" style={{ gridTemplateColumns: summary.items.length > 1 ? '1fr 1fr' : '1fr' }}>
                  {summary.items.map(it => (
                    <div key={it.uid} className={`truncate text-center ${gradeIdx(it.grade) >= gradeIdx('rare') ? 'chr-drop' : ''}`} style={{ '--g': gradeOf(it.grade).color, fontSize: 11.5, padding: '4px 6px', border: `1px solid ${gradeOf(it.grade).color}88`, background: MS.box, borderRadius: MS.r, color: gradeOf(it.grade).color, fontWeight: it.grade === 'unique' || it.grade === 'mythic' ? 700 : 400 }}>
                      {it.grade === 'mythic' ? '✦ ' : it.grade === 'unique' ? '★ ' : ''}{E.itemName(it)} <span style={{ opacity: 0.75 }}>({gradeOf(it.grade).label}{E.itemUsable(it, save.hero) ? '' : ` · ${clsTag(it)}`})</span>
                    </div>
                  ))}
                </div> : null}
                <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                {Object.entries(summary.levelUps).map(([cid, lv]) => (
                  <div key={cid} className="chr-chip font-semibold chr-levelup" style={{ color: PALETTE.legendary }}>▲ 레벨 업! {chronicleClass(cid).name} Lv.{lv}</div>
                ))}
                {summary.autoSalvaged ? <div className="chr-chip" style={{ color: PALETTE.textDim }}>♻ 자동 분해 {summary.autoSalvaged}개 → {E.salvageText(summary.autoSalvage || {})}</div> : null}
                {summary.autoDismantled ? <div className="chr-chip" style={{ color: PALETTE.textDim }}>가방이 가득 차 {summary.autoDismantled}개 자동 분해</div> : null}
                {summary.unlocks.map(u => <div key={u} className="chr-chip" style={{ color: '#9cc4e4' }}>🔓 {u} 개방</div>)}
                {summary.dungeonClear && <div className="chr-chip font-semibold" style={{ color: '#c08ae8' }}>던전 정복!</div>}
                {summary.towerCoins ? <div className="chr-chip" style={{ color: '#e8b04a' }}>✪ 첨탑 주화 +{summary.towerCoins}{summary.towerWeekly ? ` (주간 ${summary.towerFloor}층 첫 도달 +${summary.towerWeekly} 포함)` : ''}</div> : null}
                {summary.towerCheckpoint ? <div className="chr-chip font-semibold" style={{ color: '#9cc4e4' }}>🚩 {summary.towerCheckpoint}층 체크포인트 저장 — 다음 도전은 {summary.towerCheckpoint + 1}층부터</div> : null}
                {summary.climb ? <div className="chr-chip font-semibold" style={{ color: MS.gold }}>⏫ 다음 사냥 {summary.climb.label} (Lv.{summary.climb.lv}) — {summary.climb.why === 'low' ? '적 레벨이 낮아 한 단계 올림' : `${AUTO_CLIMB.easyStreak}연속 손쉬운 승리`}</div> : null}
                {summary.gateOpen ? <div className="chr-chip font-semibold" style={{ color: PALETTE.legendary }}>⚔ 처치 목표 달성 — 관문 도전 가능!</div> : null}
                {summary.stageClear ? <div className="chr-chip font-semibold" style={{ color: '#9cc4e4' }}>🔓 스테이지 {summary.stageClear} 관문 통과!</div> : null}
                {summary.famShards || summary.famSouls ? <div className="chr-chip" style={{ color: '#d07ae8' }}>{summary.famShards ? `📜 계약서 조각 +${summary.famShards}` : ''}{summary.famShards && summary.famSouls ? ' · ' : ''}{summary.famSouls ? `🔮 사역혼 +${summary.famSouls}` : ''}</div> : null}
                {summary.famExp?.ups ? <div className="chr-chip font-semibold" style={{ color: '#e8b04a' }}>🐾 {F.famName(summary.famExp.key)} Lv.{summary.famExp.lv} 달성!</div> : null}
                {summary.keys ? <div className="chr-chip font-semibold" style={{ color: PALETTE.legendary }}>🗝 던전 열쇠 +{summary.keys}</div> : null}
                {summary.talentScroll ? <div className="chr-chip font-semibold" style={{ color: '#7fd1c8' }}>📖 특성 초기화 주문서 +{summary.talentScroll}</div> : null}
                {summary.arena ? <div className="chr-chip font-semibold" style={{ color: MS.gold }}>🏟 투기장 점수 {summary.arena.before} → {summary.arena.after} (+{summary.arena.delta}) · 주화 +{summary.arena.coin}{summary.arena.upset ? ' (강한 상대 보너스)' : ''}</div> : null}
                {summary.arena?.timeout ? <div className="chr-chip" style={{ color: PALETTE.textDim }}>시간 초과 — 남은 체력 비율로 판정</div> : null}
                {summary.arena ? <div className="chr-chip" style={{ color: PALETTE.textDim }}>오늘 남은 도전 {summary.arena.left}회</div> : null}
                {summary.raid?.reward ? <div className="chr-chip font-semibold" style={{ color: '#ff8a80' }}>⚔ 원정대 레이드 보상{summary.raid.first ? ' (첫 클리어!)' : ''} — {R.rosterRewardText(summary.raid.reward)}</div> : null}
                {summary.raid?.noReward ? <div className="chr-chip" style={{ color: PALETTE.textDim }}>오늘 이 단계 보상은 이미 받았다 (KST 0시 초기화)</div> : null}
                {(summary.questsDone || []).map(t => <div key={t} className="chr-chip font-semibold" style={{ color: PALETTE.dawn }}>📜 의뢰 완료: {t} — 게시판에서 보상</div>)}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-center" style={{ fontSize: 12.5, color: PALETTE.textDim }}>
                {ctx.kind === 'arena' ? `「${summary.arena?.name}」에게 졌다 — 투기장 점수 ${summary.arena?.before} → ${summary.arena?.after} (${summary.arena?.delta}) · 주화 +${summary.arena?.coin}${summary.arena?.timeout ? ' · 시간 초과 판정' : ''} · 오늘 남은 도전 ${summary.arena?.left}회` : ctx.kind === 'raid' ? '원정대가 무너졌다 — 봉인의 주인이 쓰러지면 그 봉인은 깰 수 없다. 약한 캐릭터를 더 키워 다시 도전하자.' : ctx.kind === 'tower' ? `첨탑 ${summary.towerFell}층에서 쓰러졌다. 다음 도전은 체크포인트부터.` : ctx.kind === 'dungeon' ? '던전에서 쫓겨났다.' : `쓰러졌다${summary.fallback ? '.' : ' — 사냥터로 돌아간다.'}${summary.goldLost ? ` (골드 -${summary.goldLost})` : ''}`}
                {summary.fallback ? <div className="mt-2 font-semibold" style={{ color: MS.gold }}>↩ 직전 성공 맵 「{summary.fallback}」에서 반복 사냥을 이어간다</div> : null}
                {summary.lossStop ? <div className="mt-2 font-semibold" style={{ color: '#ff8a7e' }}>⏹ {summary.lossStop}연속 패배 — 자동 사냥을 멈췄다. 장비·성장을 점검하자</div> : null}
              </div>
            )}
          </div>
          <div className="flex-none" style={{ padding: '0 12px 12px', borderTop: `1px solid ${MS.line}` }}>
            {(() => {
              const sq = (extra = {}) => ({ height: 44, fontSize: 13.5, fontWeight: 800, border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text, ...extra });
              const sm = (extra = {}) => ({ height: 36, fontSize: 12, border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text, ...extra });
              const hot = { border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.2)', color: '#ff8a7e' };
              const on = { border: `1px solid ${MS.gold}`, color: MS.gold, background: 'rgba(232,176,74,0.1)' };
              const toggle = towerNext ? [towerAuto ? '⏫ 자동 등반 중 (끄기)' : '⏫ 자동 등반', towerAuto, onToggleTowerAuto]
                : dungeonNext ? [dungeonAuto ? '▶ 연속 도전 중 (끄기)' : '▶ 연속 도전', dungeonAuto, onToggleDungeonAuto]
                  : autoProg && ctx.kind === 'field' ? ['▶ 자동 진행 중 (끄기)', true, onStopAuto]
                    : ctx.kind === 'field' && ((ctx.type !== 'boss' && sim.result === 'win') || summary.fallback) ? [repeat ? '🔁 반복 중 (끄기)' : '🔁 반복 사냥', repeat, onToggleRepeat] : null;
              const next = dungeonNext || towerNext;
              const back = ctx.kind === 'dungeon' ? '던전 목록으로' : ctx.kind === 'tower' ? '첨탑으로' : ctx.kind === 'raid' ? '레이드로' : ctx.kind === 'arena' ? '투기장으로' : '사냥터로';
              const sub = [
                ['📜 전투 기록', () => setLogFull(true), {}],
                ['📊 전투 집계', openStats, {}],
                sessionReport && ['📋 사냥 보고서', () => setStats(sessionReport), { color: MS.gold }],
                battle.runReport && [battle.runReport.kind === 'tower' ? '🗼 첨탑 집계' : '🏰 던전 집계', () => setStats(battle.runReport), { color: '#c08ae8' }],
                next && [`⏸ 잠시 멈추기`, onDone, { color: PALETTE.textDim }],
                // 1.291.1 — 켬/끔이 한눈에 보이는 스위치 (켬 = 금색 채움 + 오른쪽 손잡이 / 끔 = 회색 + 왼쪽 손잡이)
                onToggleClimb && !autoProg && ctx.kind === 'field' && ctx.type !== 'boss' && ['자동 상향', onToggleClimb,
                  autoClimb ? { border: `1px solid ${MS.gold}`, background: 'rgba(232,176,74,0.2)', color: MS.gold, fontWeight: 800 } : { color: PALETTE.textDim, background: 'rgba(0,0,0,0.25)' },
                  <span className="flex items-center justify-center gap-1.5" aria-label={`자동 상향 ${autoClimb ? '켬' : '끔'}`}>
                    <span>자동 상향</span>
                    <span style={{ position: 'relative', width: 38, height: 18, borderRadius: 9, flex: 'none', background: autoClimb ? MS.gold : 'rgba(255,255,255,0.16)', transition: 'background .18s' }}>
                      <span style={{ position: 'absolute', top: 0, bottom: 0, left: autoClimb ? 6 : 'auto', right: autoClimb ? 'auto' : 6, fontSize: 11, lineHeight: '18px', fontWeight: 800, color: autoClimb ? '#2a1a08' : '#b8aea4' }}>{autoClimb ? '켬' : '끔'}</span>
                      <span style={{ position: 'absolute', top: 3, left: autoClimb ? 23 : 3, width: 12, height: 12, borderRadius: 6, background: autoClimb ? '#2a1a08' : '#8a8078', transition: 'left .18s' }} />
                    </span>
                  </span>],
                !next && ctx.kind === 'field' && sim.result === 'win' && ctx.type !== 'boss' && ['⚔ 한 번 더', onAgain, {}],
              ].filter(Boolean);
              return <>
                <div className="grid gap-1.5 mt-3" style={{ gridTemplateColumns: toggle ? '1fr 1fr' : '1fr' }}>
                  {toggle && <button onClick={toggle[2]} className="ui-press" style={sq(toggle[1] ? on : {})}>{toggle[0]}</button>}
                  {next ? <button onClick={onAgain} className="ui-press" style={sq(hot)}>다음 층으로 ▸</button>
                    : <button onClick={onDone} className="ui-press" style={sq(hot)}>{back}</button>}
                </div>
                <div className="grid gap-1.5 mt-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(sub.length, 3)}, 1fr)` }}>
                  {sub.map(([l, fn, ex, node]) => <button key={l} onClick={fn} className="ui-press truncate" style={sm(ex)}>{node || l}</button>)}
                </div>
              </>;
            })()}
          </div>
          </div>
        </div>
      )}
      {stats && <HuntReport report={stats} title={stats === battle.runReport ? (battle.runReport.kind === 'tower' ? '🗼 첨탑 도전 집계' : '🏰 던전 전체 집계') : stats === sessionReport ? '📋 사냥 보고서' : '📊 전투 집계'} onClose={() => setStats(null)} />}
    </div>
  );
}
