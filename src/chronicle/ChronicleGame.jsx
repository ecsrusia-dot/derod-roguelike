// ============================================
// chronicle/ChronicleGame.jsx — 황혼 연대기 (전통 RPG) 화면
// ============================================
// 로직은 engine.js 순수 함수. 전투는 시작 순간 끝까지 계산·저장하고 화면은 재생만 한다
// (재생 중 새로고침해도 보상 중복·유실 없음).
// 저장: localStorage CHRONICLE_SAVE_KEY — 본편·아르카나와 완전 분리.
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Coins } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../components/ui/CommonUI.jsx';
import {
  CHRONICLE_TITLE, CHRONICLE_SUB, CHRONICLE_PARTS, CHRONICLE_SAVE_KEY, CHRONICLE_SAVE_KEY_V1, CHRONICLE_TUNING, CHRONICLE_CLASSES, CHRONICLE_FIELDS,
  CHRONICLE_DUNGEON, CHRONICLE_DUNGEONS, DUNGEON_TIERS, dungeonDef, STAT_META, STAT_KEYS, SKILL_MAX_LV, MASTERY_PCT, BOSS_DAILY_LIMIT, DUNGEON_KEYS, GRADES, gradeIdx, SLOTS, FORGE, UNIQUE_CHANCE, UNIQUE_ITEMS, fieldStages, FIELD_STAGES, BOOST, BAG_EXPAND,
  chronicleClass, classSkills, describeSkill, chronicleEnemyArt,
} from './data.js';
import * as E from './engine.js';
import * as Q from './quest.js';
import * as A from './account.js';
import * as F from './familiar.js';
import { NPCS } from './story.js';
import { ENEMIES } from '../data/enemies.js';

const FONT_TITLE = '"Cinzel", "Noto Serif KR", serif';

// 2.0 저장 = 계정(캐릭터 슬롯 + 공유 창고·재화). 1.x 저장(v1 키)은 읽기만 — 있었으면 시작 보상.
function loadAccount() {
  try {
    const raw = localStorage.getItem(CHRONICLE_SAVE_KEY);
    if (raw) return JSON.parse(raw);
    return A.newAccount(!!localStorage.getItem(CHRONICLE_SAVE_KEY_V1));
  } catch { return A.newAccount(false); }
}
function writeAccount(acc) {
  try { localStorage.setItem(CHRONICLE_SAVE_KEY, JSON.stringify(acc)); } catch { /* 저장 불가 */ }
}

// ===== 작은 부품 =====
const gradeOf = (id) => GRADES[gradeIdx(id)] || GRADES[0];
// 받침 여부로 이/가 고르기
const iga = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? `${w}이` : `${w}가`; };
function statLine(st) {
  return Object.entries(st).filter(([, v]) => v).map(([k, v]) => E.statLabel(k, v)).join(' · ');
}
// 장비 소속 표시 — 직업 전용 / 공용
const clsTag = (item) => (item.cls === 'common' ? '공용' : `${chronicleClass(item.cls).name} 전용`);
// 특수 효과 한 줄 (유니크 고유 효과 · 에픽 장신구 옵션)
function ItemSpecial({ item, center = false }) {
  const ud = E.uniqueDef(item);
  const eo = E.epicOptOf(item);
  if (!ud && !eo) return null;
  return (
    <div className={center ? 'text-center mt-1' : 'truncate'} style={{ fontSize: center ? 12.5 : 11, color: ud ? '#f0a86a' : '#d7a8ff' }}>
      ✦ {ud ? `고유 효과 — ${ud.desc}` : `「${eo.name}」 ${eo.desc}`}
    </div>
  );
}
function Header({ title, onBack, right }) {
  return (
    <div className="flex items-center gap-2 px-3 flex-none" style={{ minHeight: 54, borderBottom: '1px solid var(--ui-line)' }}>
      {onBack && (
        <button onClick={onBack} aria-label="뒤로" className="ui-press flex items-center justify-center flex-none" style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.dawn }}>
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex-1 font-semibold truncate" style={{ fontSize: 16, color: PALETTE.text }}>{title}</div>
      {right}
    </div>
  );
}
function Wallet({ save }) {
  return (
    <div className="flex items-center gap-2 flex-none" style={{ fontSize: 12 }}>
      <span className="flex items-center gap-0.5" style={{ color: PALETTE.legendary }}><Coins size={13} />{save.gold}</span>
      <span style={{ color: '#9fd18a' }}>✦{save.mats.essence}</span>
      <span style={{ color: '#c08ae8' }}>◆{save.mats.shard}</span>
    </div>
  );
}
function Bar({ v, max, color, h = 8, shield = 0 }) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  const sp = Math.max(0, Math.min(100 - pct, (shield / Math.max(1, max)) * 100));
  return (
    <div className="flex overflow-hidden" style={{ height: h, borderRadius: 999, background: '#0008', border: '1px solid #ffffff14' }}>
      <div style={{ width: `${pct}%`, background: color, transition: 'width .25s ease' }} />
      {sp > 0 && <div style={{ width: `${sp}%`, background: '#9cc4e4aa' }} />}
    </div>
  );
}
// 장비 비교 (1.213.1) — 새 장비 vs 지금 착용 중인 같은 부위 장비
const STAT_ORDER = ['atk', 'def', 'hp', 'spd'];
function itemDiff(item, cur) {
  const a = E.itemStats(item); const b = cur ? E.itemStats(cur) : {};
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .sort((x, y) => (STAT_ORDER.indexOf(x) + 1 || 99) - (STAT_ORDER.indexOf(y) + 1 || 99));
  return keys.map(k => ({ k, d: +((a[k] || 0) - (b[k] || 0)).toFixed(3) })).filter(x => x.d !== 0);
}
const powerDiff = (item, cur) => E.itemPower(item) - (cur ? E.itemPower(cur) : 0);
function DiffLine({ item, cur, compact = false }) {
  const pd = powerDiff(item, cur);
  const lines = itemDiff(item, cur);
  const col = (d) => (d > 0 ? '#8fe08a' : '#e06a5f');
  const fmt = (k, d) => { const t = E.statLabel(k, Math.abs(d)); return `${d > 0 ? '▲' : '▼'} ${t.replace(/[+-](?=\d)/, '')}`; };
  if (compact) {
    return (
      <div className="truncate" style={{ fontSize: 11 }}>
        <b style={{ color: pd > 0 ? '#8fe08a' : pd < 0 ? '#e06a5f' : PALETTE.textDim }}>{pd > 0 ? `▲${pd}` : pd < 0 ? `▼${-pd}` : '='}</b>
        {lines.slice(0, 3).map(x => <span key={x.k} style={{ color: col(x.d), marginLeft: 6 }}>{fmt(x.k, x.d)}</span>)}
      </div>
    );
  }
  return (
    <div className="mt-2" style={{ padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ui-line)' }}>
      <div className="flex justify-between" style={{ fontSize: 12, color: PALETTE.textDim }}>
        <span>{cur ? `착용 중: ${E.itemName(cur)}${cur.plus ? ` +${cur.plus}` : ''}` : '이 부위 비어 있음'}</span>
        <b style={{ color: pd > 0 ? '#8fe08a' : pd < 0 ? '#e06a5f' : PALETTE.textDim }}>전투력 {pd > 0 ? `▲ ${pd}` : pd < 0 ? `▼ ${-pd}` : '변화 없음'}</b>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1" style={{ fontSize: 12 }}>
        {lines.map(x => <span key={x.k} style={{ color: col(x.d) }}>{fmt(x.k, x.d)}</span>)}
        {!lines.length && <span style={{ color: PALETTE.textDim }}>능력치 차이 없음</span>}
      </div>
      {(E.uniqueDef(cur) || E.epicOptOf(cur)) && <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>※ 교체하면 착용 중 장비의 특수 효과를 잃습니다</div>}
    </div>
  );
}
function ItemRow({ save, item, onClick, right }) {
  const g = gradeOf(item.grade);
  const by = save.inventory.some(i => i.uid === item.uid) ? E.equippedBy(save, item.uid) : null;
  const usable = E.itemUsable(item, save.hero);
  const slot = SLOTS.find(s => s.id === item.slot);
  return (
    <button onClick={onClick} className="ui-press w-full flex items-center gap-2.5 text-left" style={{ padding: '8px 10px', borderRadius: 12, background: `${g.color}10`, border: `1px solid ${g.color}55` }}>
      <div className="flex-none flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: '#000', fontSize: 17, border: `1px solid ${g.color}88` }}>{slot?.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold" style={{ fontSize: 13, color: g.color }}>
          {E.itemName(item)}{item.plus ? ` +${item.plus}` : ''} <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>{g.label} · Lv.{item.ilv}</span>
        </div>
        <div className="truncate" style={{ fontSize: 11, color: usable ? PALETTE.textDim : '#e06a5f' }}>{usable ? clsTag(item) : `🔒 ${clsTag(item)} — 창고에 보관해 두세요`}</div>
        <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{statLine(E.itemStats(item))}</div>
        <ItemSpecial item={item} />
      </div>
      {right ?? (by && <span className="flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>착용 중</span>)}
    </button>
  );
}
// 전투·던전 유닛 아이콘 — 사역마는 원본 적 그림
function UnitIcon({ u, size = 38, dim = false }) {
  if (!u.fam) return <Portrait cid={u.classId} size={size} dim={dim} />;
  return <img src={chronicleEnemyArt(u.famKey)} alt={u.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: '1.5px solid #d07ae8', filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}
function Portrait({ cid, size = 44, dim = false }) {
  const c = chronicleClass(cid);
  return <img src={c.image} alt={c.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: `1.5px solid ${c.color}`, filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}

// ===== 전투 재생 =====
const SPEEDS = [1, 2, 4];
function BattleView({ battle, save, onDone, repeat, onToggleRepeat, onAgain, boostLeft = 0, onAskBoost, dungeonAuto = false, onToggleDungeonAuto }) {
  const { sim, enemies, party, summary, ctx } = battle;
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState(null); // 전투 집계 (1.215.1)
  const openStats = () => { const r = newHuntStats(); addHuntRecord(r, huntRecord(sim, party, { type: ctx.type, enemies }, summary)); setStats({ ...r, endedAt: r.startedAt }); };
  const dungeonNext = ctx.kind === 'dungeon' && sim.result === 'win' && !summary.dungeonClear;
  const [speedPref, setSpeed] = useState(() => { try { return +localStorage.getItem('chronicleSpeed') || 2; } catch { return 2; } });
  // ×4는 이용권이 있을 때만 (1.213.0) — 만료되면 ×2로
  const speed = speedPref === 4 && boostLeft <= 0 ? 2 : speedPref;
  const done = idx >= sim.events.length;
  useEffect(() => {
    if (done) return undefined;
    const ev = sim.events[idx];
    const base = ev.round ? 160 : ev.k === 'dotTick' ? 380 : 620;
    const t = setTimeout(() => setIdx(i => i + 1), base / speed);
    return () => clearTimeout(t);
  }, [idx, speed, done, sim.events]);
  // 반복 사냥: 승리 후 자동 다음 전투
  useEffect(() => {
    if (!done || !repeat || stats || sim.result !== 'win' || ctx.kind !== 'field' || ctx.type === 'boss') return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, repeat, stats, sim.result, ctx, onAgain]);
  // 던전 연속 도전 (1.215.1): 승리하면 다음 층 → 보스까지 자동 진행
  useEffect(() => {
    if (!done || !dungeonAuto || !dungeonNext || stats) return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, dungeonAuto, dungeonNext, stats, onAgain]);
  const setSp = (s) => { setSpeed(s); try { localStorage.setItem('chronicleSpeed', String(s)); } catch { /* */ } };

  const cur = sim.events[Math.min(idx, sim.events.length - 1)];
  // 최신 상태 스냅샷 (st가 있는 마지막 사건)
  let st = null;
  for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) { if (sim.events[i].st) { st = sim.events[i].st; break; } }
  const hpOf = (u) => (st && st[u.id] ? st[u.id][0] : u.hp);
  const shOf = (u) => (st && st[u.id] ? st[u.id][1] : 0);
  const nameOf = (id) => [...party, ...enemies].find(u => u.id === id)?.name || '';
  const recent = sim.events.slice(0, idx + 1).filter(e => e.a).slice(-4).reverse();
  const curHits = cur && cur.a ? cur.hits || [] : [];
  const hitFor = (id) => curHits.filter(h => h.t === id);
  const round = (() => { for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) if (sim.events[i].round) return sim.events[i].round; return 1; })();
  const isBoss = ctx.type === 'boss' || ctx.type === 'dungeonBoss';
  const bg = isBoss ? chronicleEnemyArt(enemies[0].key, 'intro') : null;

  const Float = ({ id }) => hitFor(id).map((h, i) => {
    const txt = h.m ? '빗나감' : h.h ? `+${h.h}` : h.s ? `🛡${h.s}` : h.buff ? '강화' : h.debuff ? '약화' : h.dot && h.d == null ? '중독' : h.d != null ? `${h.counter ? '반격 ' : h.cover ? '대신 ' : ''}-${h.d}${h.c ? '!' : ''}` : '';
    const color = h.m ? '#bbb' : h.h ? '#8fe08a' : h.s ? '#9cc4e4' : h.buff ? '#e8c48a' : h.debuff ? '#c08ae8' : h.cover ? '#9cc4e4' : h.c ? '#ffd27a' : '#ff8a80';
    if (!txt) return null;
    return <div key={`${idx}-${i}`} className="arc-float absolute font-bold pointer-events-none" style={{ left: '50%', top: '30%', fontSize: h.c ? 18 : 15, color, textShadow: '0 2px 5px #000', animationDelay: `${i * 80}ms` }}>{txt}</div>;
  });

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bg }}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.18 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div className="relative flex items-center gap-2 px-3 pt-2 flex-none" style={{ minHeight: 44 }}>
        <span style={{ fontSize: 12, color: PALETTE.textDim }}>{ctx.label} · {round}라운드</span>
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
      </div>

      {/* 적 */}
      <div className="relative flex gap-2 px-3 pt-1 flex-none">
        {enemies.map(e => {
          const hp = hpOf(e);
          const dead = hp <= 0;
          const acting = cur?.a === e.id;
          return (
            <div key={e.id} className={`relative flex-1 min-w-0 ${hitFor(e.id).some(h => h.d > 0) ? 'arc-shake' : ''}`} style={{ opacity: dead ? 0.3 : 1, transition: 'opacity .3s' }}>
              <div className="relative overflow-hidden" style={{ borderRadius: 12, aspectRatio: enemies.length === 1 ? '16 / 10' : '3 / 4', border: `1.5px solid ${acting ? '#ff8a80' : e.tier === 'boss' ? '#c4453d88' : e.tier === 'elite' ? '#e8b04a88' : 'var(--ui-line)'}` }}>
                <img src={chronicleEnemyArt(e.key)} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: dead ? 'grayscale(1)' : 'none' }} draggable={false} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, #000c)' }} />
                <div className="absolute bottom-1 left-1.5 right-1.5">
                  <div className="truncate" style={{ fontSize: 11, color: '#fff', textShadow: '0 1px 2px #000' }}>Lv.{e.lv} {e.name}</div>
                  <Bar v={hp} max={e.maxHp} color="linear-gradient(90deg,#8b1f1f,#e0574c)" h={6} />
                </div>
              </div>
              <Float id={e.id} />
            </div>
          );
        })}
      </div>

      {/* 행동 */}
      <div className="relative flex-1 min-h-0 px-4 pt-3 flex flex-col justify-center">
        {cur?.a && (
          <div className="text-center" style={{ fontSize: 15, color: cur.skill ? PALETTE.legendary : PALETTE.text, fontWeight: 600 }}>
            {nameOf(cur.a)} — {cur.n}
          </div>
        )}
        <div className="mt-2 flex flex-col gap-0.5 overflow-hidden">
          {recent.map((e, i) => (
            <div key={i} className="truncate" style={{ fontSize: 11.5, color: i === 0 ? PALETTE.text : PALETTE.textDim, opacity: 1 - i * 0.2 }}>
              {nameOf(e.a)} · {e.n}{(e.hits || []).filter(h => h.d > 0).length ? ` → ${(e.hits || []).filter(h => h.d > 0).map(h => `${nameOf(h.t)} ${h.d}`).join(', ')}` : ''}
            </div>
          ))}
        </div>
      </div>

      {/* 파티 */}
      <div className={`relative grid ${party.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 px-3 pb-2 flex-none`}>
        {party.map(p => {
          const hp = hpOf(p);
          const acting = cur?.a === p.id;
          return (
            <div key={p.id} className={`relative flex items-center gap-2 ${hitFor(p.id).some(h => h.d > 0) ? 'arc-shake' : ''}`} style={{ padding: 7, borderRadius: 12, background: acting ? `${chronicleClass(p.classId).color}26` : 'rgba(255,255,255,0.03)', border: `1px solid ${acting ? chronicleClass(p.classId).color : 'var(--ui-line)'}` }}>
              <UnitIcon u={p} size={38} dim={hp <= 0} />
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.text }}>Lv.{p.lv} {p.name}</div>
                <Bar v={hp} max={p.maxHp} shield={shOf(p)} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} />
                <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>{hp}/{p.maxHp}</div>
              </div>
              <Float id={p.id} />
            </div>
          );
        })}
      </div>

      {/* 결과 */}
      {done && (
        <div className="relative flex-none px-3 pb-3">
          <GlassPanel strong className="p-3">
            <div className="font-bold text-center" style={{ fontSize: 17, color: sim.result === 'win' ? PALETTE.legendary : '#e06a5f', fontFamily: FONT_TITLE }}>
              {sim.result === 'win' ? '승리' : '전멸'}
            </div>
            {sim.result === 'win' ? (
              <div className="mt-1.5 flex flex-col gap-1" style={{ fontSize: 12.5, color: PALETTE.text }}>
                <div className="text-center">경험치 +{summary.exp} · 🪙 +{summary.gold} · ✦ +{summary.essence}{summary.shard ? ` · ◆ +${summary.shard}` : ''}</div>
                {Object.entries(summary.levelUps).map(([cid, lv]) => (
                  <div key={cid} className="text-center" style={{ color: PALETTE.legendary }}>▲ {chronicleClass(cid).name} Lv.{lv} 달성!</div>
                ))}
                {summary.items.map(it => (
                  <div key={it.uid} className="text-center" style={{ color: gradeOf(it.grade).color, fontWeight: it.grade === 'unique' ? 700 : 400 }}>{it.grade === 'unique' ? '★ 유니크 획득: ' : '획득: '}{E.itemName(it)} ({gradeOf(it.grade).label}{E.itemUsable(it, save.hero) ? '' : ` · ${clsTag(it)}`})</div>
                ))}
                {summary.autoDismantled ? <div className="text-center" style={{ color: PALETTE.textDim }}>가방이 가득 차 {summary.autoDismantled}개 자동 분해</div> : null}
                {summary.unlocks.map(u => <div key={u} className="text-center" style={{ color: '#9cc4e4' }}>🔓 {u} 개방</div>)}
                {summary.dungeonClear && <div className="text-center font-semibold" style={{ color: '#c08ae8' }}>던전 정복!</div>}
                {summary.towerCoins ? <div className="text-center" style={{ color: '#e8b04a' }}>✪ 첨탑 주화 +{summary.towerCoins}{summary.towerWeekly ? ` (주간 ${summary.towerFloor}층 첫 도달 +${summary.towerWeekly} 포함)` : ''}</div> : null}
                {summary.towerCheckpoint ? <div className="text-center font-semibold" style={{ color: '#9cc4e4' }}>🚩 {summary.towerCheckpoint}층 체크포인트 저장 — 다음 도전은 {summary.towerCheckpoint + 1}층부터</div> : null}
                {summary.gateOpen ? <div className="text-center font-semibold" style={{ color: PALETTE.legendary }}>⚔ 처치 목표 달성 — 관문 도전 가능!</div> : null}
                {summary.stageClear ? <div className="text-center font-semibold" style={{ color: '#9cc4e4' }}>🔓 스테이지 {summary.stageClear} 관문 통과!</div> : null}
                {summary.famShards ? <div className="text-center" style={{ color: '#d07ae8' }}>📜 계약서 조각 +{summary.famShards}</div> : null}
                {summary.keys ? <div className="text-center font-semibold" style={{ color: PALETTE.legendary }}>🗝 던전 열쇠 +{summary.keys}</div> : null}
                {(summary.questsDone || []).map(t => <div key={t} className="text-center font-semibold" style={{ color: PALETTE.dawn }}>📜 의뢰 완료: {t} — 게시판에서 보상</div>)}
              </div>
            ) : (
              <div className="mt-1 text-center" style={{ fontSize: 12.5, color: PALETTE.textDim }}>
                {ctx.kind === 'tower' ? `첨탑 ${summary.towerFell}층에서 쓰러졌다. 다음 도전은 체크포인트부터.` : ctx.kind === 'dungeon' ? '던전에서 쫓겨났다.' : `마을로 돌아간다.${summary.goldLost ? ` (골드 -${summary.goldLost})` : ''}`}
              </div>
            )}
            <div className="flex gap-2 mt-2.5">
              <button onClick={openStats} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 12, border: '1px solid var(--ui-line-strong)', color: PALETTE.text, background: 'transparent' }}>📊 전투 집계</button>
              {battle.runReport && <button onClick={() => setStats(battle.runReport)} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 12, border: '1px solid #c08ae888', color: '#c08ae8', background: 'transparent' }}>🏰 던전 전체 집계</button>}
            </div>
            <div className="flex gap-2 mt-2">
              {dungeonNext && (
                <UIButton variant={dungeonAuto ? 'gold' : 'ghost'} style={{ height: 42 }} onClick={onToggleDungeonAuto}>{dungeonAuto ? '연속 도전 중… (끄기)' : '연속 도전'}</UIButton>
              )}
              {ctx.kind === 'field' && ctx.type !== 'boss' && sim.result === 'win' && (
                <UIButton variant={repeat ? 'gold' : 'ghost'} style={{ height: 42 }} onClick={onToggleRepeat}>{repeat ? '반복 중… (끄기)' : '반복 사냥'}</UIButton>
              )}
              <UIButton style={{ height: 42 }} onClick={onDone}>{(ctx.kind === 'dungeon' && sim.result === 'win' && !summary.dungeonClear) || (ctx.kind === 'tower' && sim.result === 'win') ? '다음 층으로' : '계속'}</UIButton>
            </div>
            {ctx.kind === 'field' && sim.result === 'win' && ctx.type !== 'boss' && (
              <button onClick={onAgain} className="ui-press w-full mt-2" style={{ fontSize: 12.5, color: PALETTE.dawn, background: 'transparent', border: 'none', padding: 6 }}>한 번 더 사냥</button>
            )}
          </GlassPanel>
        </div>
      )}
      {stats && <HuntReport report={stats} title={stats === battle.runReport ? '🏰 던전 전체 집계' : '📊 전투 집계'} onClose={() => setStats(null)} />}
    </div>
  );
}

// ===== 마을 =====
function TownView({ save, go, onExit, onSwitchChar }) {
  const hero = save.units[save.hero];
  const alertParty = hero.points > 0 || hero.sp > 0;
  const cls = chronicleClass(save.hero);
  const nextField = CHRONICLE_FIELDS.find(f => !save.progress.bossCleared[f.id]);
  const main = Q.currentMainQuest(save);
  const goal = nextField
    ? `${main ? `[${main.title}] ` : ''}${nextField.name} — ${E.bossReady(save, nextField.id) ? '보스 도전 가능' : `스테이지 ${E.stageState(save, nextField.id).cleared + 1}/${FIELD_STAGES}`}`
    : main ? `[${main.title}] 보상을 받으러 게시판으로` : '2부 완결! 던전·보스 재도전으로 유니크를 노리자';
  const qBadge = Q.questBadgeCount(save);
  const tiles = [
    { id: 'quests', icon: '📜', label: '의뢰 게시판', sub: qBadge ? `새 소식 ${qBadge}건` : '메인 · 의뢰 · 이야기', badge: qBadge > 0 },
    { id: 'field', icon: '⚔', label: '사냥터', sub: '몹 사냥 · 보스' },
    { id: 'tower', icon: '🗼', label: '황혼의 첨탑', sub: E.towerUnlocked(save.progress) ? (save.tower?.run ? `${save.tower.run.floor}층 도전 중` : `최고 ${save.tower?.best || 0}층 · ✪${save.mats.towerCoin || 0}`) : '마계의 균열 보스 후 개방', locked: !E.towerUnlocked(save.progress) },
    { id: 'dungeon', icon: '🕳', label: '던전', sub: save.dungeon ? `${dungeonDef(save.dungeon.id).name} 진행 중` : E.dungeonUnlocked(save) ? `🗝 열쇠 ${E.keyCount(save)}개 · ${CHRONICLE_DUNGEONS.filter(d => E.dungeonUnlocked(save, d.id)).length}곳` : '죽은 자의 숲 보스 후 개방', locked: !E.dungeonUnlocked(save) },
    { id: 'party', icon: '🧭', label: '성장', sub: '능력치 · 스킬 · 장비', badge: alertParty },
    { id: 'bag', icon: '🎒', label: '가방', sub: `${save.inventory.length}/${E.bagMax(save)}${save.inventory.some(i => !E.itemUsable(i, save.hero)) ? ' · 다른 직업 장비 있음' : ''}` },
    { id: 'fam', icon: '🐾', label: '사역마', sub: E.famSlotOpen(save, 'main') ? `📜 ${save.mats.famShard || 0} · 보유 ${Object.keys(save.fams || {}).length}` : `Lv.${F.FAM_TUNING.slotLv.main}부터 동행`, badge: (save.mats.famShard || 0) >= F.FAM_TUNING.shardsPerSummon || (save.mats.sealPlus || 0) > 0 },
    { id: 'stash', icon: '🏛', label: '공용 창고', sub: `${(save.stash || []).length}/${A.STASH_MAX} · 모든 캐릭터 공유` },
    { id: 'forge', icon: '⚒', label: '대장간', sub: '강화 · 등급 승급' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_2/twilightChild_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.16 }} />
      <div className="relative flex items-center gap-2 px-3 flex-none" style={{ minHeight: 54, borderBottom: '1px solid var(--ui-line)' }}>
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: 15, color: PALETTE.text }}>여명의 마을</div>
          <div style={{ fontSize: 11, color: PALETTE.textDim }}>{CHRONICLE_TITLE}</div>
        </div>
        <Wallet save={save} />
      </div>
      <div className="relative flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <GlassPanel className="p-3">
          <div className="flex items-center gap-3">
            <Portrait cid={save.hero} size={54} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold" style={{ fontSize: 15, color: PALETTE.text }}>{cls.name} <span style={{ fontSize: 11.5, color: cls.color }}>{cls.role}</span></div>
              <div style={{ fontSize: 12, color: PALETTE.legendary }}>Lv.{hero.lv} / {CHRONICLE_TUNING.maxLevel} · 전투력 {E.unitPower(save, save.hero)}</div>
            </div>
            <button onClick={onSwitchChar} className="ui-press flex-none" style={{ fontSize: 11.5, padding: '6px 10px', borderRadius: 9, border: '1px solid var(--ui-line-strong)', color: PALETTE.dawn, background: 'transparent' }}>캐릭터 변경</button>
          </div>
          <div className="mt-2" style={{ fontSize: 12, color: PALETTE.dawn }}>▶ {goal}</div>
          <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>경험치 {hero.exp}/{CHRONICLE_TUNING.expNeed(hero.lv)}</div>
          <Bar v={hero.exp} max={CHRONICLE_TUNING.expNeed(hero.lv)} color={PALETTE.legendary} h={5} />
        </GlassPanel>
        <div className="grid grid-cols-2 gap-2.5 ui-stagger">
          {tiles.map(t => (
            <button key={t.id} disabled={t.locked} onClick={() => go(t.id)} className="ui-press relative text-left" style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--ui-line-strong)', opacity: t.locked ? 0.45 : 1, minHeight: 92 }}>
              <div style={{ fontSize: 24 }}>{t.icon}</div>
              <div className="font-semibold mt-1" style={{ fontSize: 14, color: PALETTE.text }}>{t.label}</div>
              <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{t.sub}</div>
              {t.badge && <span className="absolute" style={{ top: 10, right: 10, width: 9, height: 9, borderRadius: 999, background: '#e06a5f' }} />}
            </button>
          ))}
          <button onClick={onExit} className="ui-press text-left" style={{ padding: 14, borderRadius: 16, background: 'transparent', border: '1px dashed var(--ui-line-strong)', minHeight: 92 }}>
            <div style={{ fontSize: 24 }}>⇄</div>
            <div className="font-semibold mt-1" style={{ fontSize: 14, color: PALETTE.dawn }}>게임 선택</div>
            <div style={{ fontSize: 11, color: PALETTE.textDim }}>진행은 자동 저장</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 사냥터 (1.213.0 — 지역당 6스테이지 · 처치 목표 + 관문 강적 → 보스) =====
function FieldView({ save, onBack, onFight, playScene, sceneOpen }) {
  const [sel, setSel] = useState(() => [...CHRONICLE_FIELDS].reverse().find(f => E.fieldUnlocked(save, f.id))?.id || 1);
  useEffect(() => { if (!sceneOpen) playScene({ at: 'field', fieldId: sel }); }, [sel, sceneOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = CHRONICLE_FIELDS[sel - 1];
  const part = CHRONICLE_PARTS.find(p => p.fields.includes(sel)) || CHRONICLE_PARTS[0];
  const st = E.stageState(save, f.id);
  const stages = fieldStages(f);
  const [stage, setStage] = useState(() => Math.min(st.cleared, FIELD_STAGES - 1));
  useEffect(() => { setStage(Math.min(E.stageState(save, sel).cleared, FIELD_STAGES - 1)); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const cleared = !!save.progress.bossCleared[f.id];
  const bossOpen = E.bossReady(save, f.id);
  const S = stages[stage];
  const sKills = Math.min(st.kills[stage] || 0, S.kills);
  const gateDone = st.cleared > stage;
  const gateOk = E.gateReady(save, f.id, stage);
  const gateEnemy = f.elites[stage % f.elites.length];
  const heroLv = save.units[save.hero].lv;
  const lvColor = (lv) => (lv > heroLv + 2 ? '#e06a5f' : lv > heroLv ? '#e8b04a' : '#8fe08a');
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사냥터" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {CHRONICLE_PARTS.map(p => {
          const open = E.fieldUnlocked(save, p.fields[0]);
          const on = p.id === part.id;
          const last = [...p.fields].reverse().find(id => E.fieldUnlocked(save, id)) || p.fields[0];
          return (
            <button key={p.id} disabled={!open} onClick={() => setSel(last)} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${on ? PALETTE.legendary : 'var(--ui-line)'}`, color: open ? (on ? PALETTE.legendary : PALETTE.text) : PALETTE.textDim, background: on ? 'rgba(232,176,74,0.10)' : 'transparent', opacity: open ? 1 : 0.4 }}>
              {open ? p.name : `🔒 ${p.name.split(' · ')[0]} — ${CHRONICLE_FIELDS[p.fields[0] - 2].name} 보스 후`}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 px-3 pt-1.5 flex-none">
        {CHRONICLE_FIELDS.filter(x => part.fields.includes(x.id)).map(x => {
          const open = E.fieldUnlocked(save, x.id);
          return (
            <button key={x.id} disabled={!open} onClick={() => setSel(x.id)} className="ui-press flex-1" style={{ height: 40, borderRadius: 10, fontSize: 12, border: `1px solid ${sel === x.id ? x.color : 'var(--ui-line)'}`, color: open ? (sel === x.id ? x.color : PALETTE.text) : PALETTE.textDim, background: sel === x.id ? `${x.color}1c` : 'transparent', opacity: open ? 1 : 0.4 }}>
              {open ? `${x.id}. ${x.name.split(' ').pop()}` : `🔒 ${x.id}`}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 7', border: `1px solid ${f.color}88` }}>
          <img src={chronicleEnemyArt(f.normals[Math.min(stage, f.normals.length - 1)])} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 35%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 17, color: PALETTE.text }}>{f.name} <span style={{ fontSize: 13, color: f.color }}>· 스테이지 {stage + 1}</span></div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>몹 <b style={{ color: lvColor(S.lv) }}>Lv.{S.lv}</b> · 강적 Lv.{S.lv + 1} · 보스 Lv.{f.bossLv}</div>
          </div>
        </div>

        {/* 스테이지 지도 — 이전 스테이지 관문을 넘으면 다음 스테이지 개방 */}
        <div className="flex items-center gap-1">
          {stages.map((x, i) => {
            const open = E.stageUnlocked(save, f.id, i);
            const done = st.cleared > i;
            const on = stage === i;
            return (
              <React.Fragment key={i}>
                <button disabled={!open} onClick={() => setStage(i)} className="ui-press flex-1 flex flex-col items-center justify-center" style={{ height: 52, borderRadius: 10, border: `1.5px solid ${on ? f.color : done ? `${f.color}66` : 'var(--ui-line)'}`, background: on ? `${f.color}22` : done ? `${f.color}0d` : 'transparent', opacity: open ? 1 : 0.35 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: on ? f.color : PALETTE.text }}>{open ? (done ? '✓' : i + 1) : '🔒'}</span>
                  <span style={{ fontSize: 10.5, color: open ? lvColor(x.lv) : PALETTE.textDim }}>Lv.{x.lv}</span>
                </button>
                {i < stages.length - 1 && <span style={{ color: PALETTE.textDim, fontSize: 10 }}>›</span>}
              </React.Fragment>
            );
          })}
          <span style={{ color: PALETTE.textDim, fontSize: 10 }}>›</span>
          <div className="flex-1 flex flex-col items-center justify-center" style={{ height: 52, borderRadius: 10, border: `1.5px solid ${bossOpen ? '#c4453d' : 'var(--ui-line)'}`, opacity: bossOpen ? 1 : 0.35 }}>
            <span style={{ fontSize: 13 }}>👑</span>
            <span style={{ fontSize: 10.5, color: PALETTE.textDim }}>Lv.{f.bossLv}</span>
          </div>
        </div>

        <GlassPanel className="p-3">
          <div className="flex justify-between" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <span>스테이지 {stage + 1} 처치 목표</span><span className="font-semibold">{sKills}/{S.kills}</span>
          </div>
          <div className="mt-1"><Bar v={sKills} max={S.kills} color={f.color} h={6} /></div>
          <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>
            {gateDone ? '관문 통과 — 이 스테이지는 자유롭게 사냥할 수 있다'
              : gateOk ? `처치 목표 달성! 관문 강적 「${ENEMIES[gateEnemy]?.name}」(Lv.${S.lv + 1})을 쓰러뜨리면 ${stage + 1 < FIELD_STAGES ? `스테이지 ${stage + 2}` : '보스'} 개방`
                : `처치 목표를 채우면 관문 강적이 나타난다 · 강적 ${Math.round(CHRONICLE_TUNING.eliteChance * 100)}% 확률로 출몰`}
            {cleared && <><br />보스 처치 완료 — 재도전은 하루 {BOSS_DAILY_LIMIT}회</>}
          </div>
        </GlassPanel>
        <UIButton onClick={() => onFight(f, 'hunt', stage)}>스테이지 {stage + 1} 사냥 (Lv.{S.lv})</UIButton>
        {!gateDone && (
          <UIButton variant="gold" disabled={!gateOk} onClick={() => onFight(f, 'gate', stage)}>
            {gateOk ? `⚔ 관문 도전 — ${ENEMIES[gateEnemy]?.name} Lv.${S.lv + 1}` : `관문 잠김 (처치 ${S.kills - sKills} 남음)`}
          </UIButton>
        )}
        {(() => {
          const left = E.bossAttemptsLeft(save, f.id);
          const bossName = ENEMIES[f.boss]?.name;
          if (!bossOpen) return <UIButton variant="ghost" disabled>{`👑 보스 — 스테이지 ${FIELD_STAGES} 관문을 넘으면 개방`}</UIButton>;
          if (cleared && left <= 0) return <UIButton variant="gold" disabled>보스 재도전 — 오늘 횟수 소진 (0시 초기화)</UIButton>;
          return (
            <UIButton variant="gold" onClick={() => onFight(f, 'boss', null)}>
              {cleared ? `👑 보스 재도전 — ${bossName} (오늘 ${left}/${BOSS_DAILY_LIMIT})` : `👑 보스 도전 — ${bossName} Lv.${f.bossLv}`}
            </UIButton>
          );
        })()}
      </div>
    </div>
  );
}

// ===== 던전 =====
function DungeonView({ save, onBack, onEnter, onFight, onLeave, onBuyKey, dungeonAuto, onToggleDungeonAuto }) {
  const d = save.dungeon;
  const opened = CHRONICLE_DUNGEONS.filter(x => E.dungeonUnlocked(save, x.id));
  const [selId, setSelId] = useState(d?.id || opened[opened.length - 1]?.id || 'frostTomb');
  const [tier, setTier] = useState(d?.tier || 0);
  const D = dungeonDef(d ? d.id : selId);
  const T = DUNGEON_TIERS[d ? d.tier || 0 : tier];
  const party = E.partyCombatants(save, d?.hp);
  const best = save.progress.dungeonTier?.[D.id];
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={d ? `${D.name} · ${T.label}` : '던전'} onBack={d ? null : onBack} right={<div className="flex items-center gap-2"><span style={{ fontSize: 12, color: PALETTE.legendary }}>🗝{E.keyCount(save)}</span><Wallet save={save} /></div>} />
      {!d && (
        <div className="grid grid-cols-3 gap-1.5 px-3 pt-2 flex-none">
          {CHRONICLE_DUNGEONS.map(x => {
            const open = E.dungeonUnlocked(save, x.id);
            return (
              <button key={x.id} disabled={!open} onClick={() => { setSelId(x.id); setTier(0); }} className="ui-press" style={{ minHeight: 44, padding: '4px 6px', borderRadius: 10, fontSize: 11.5, lineHeight: 1.3, border: `1px solid ${selId === x.id ? x.color : 'var(--ui-line)'}`, color: open ? (selId === x.id ? x.color : PALETTE.text) : PALETTE.textDim, background: selId === x.id ? `${x.color}1c` : 'transparent', opacity: open ? 1 : 0.4 }}>
                {open ? <>{x.name}<br /><span style={{ fontSize: 10.5, color: PALETTE.textDim }}>{x.part === 2 ? '2부' : '1부'} · Lv.{x.recLv}</span></> : <>🔒 {CHRONICLE_FIELDS[x.unlockField - 1].name}<br /><span style={{ fontSize: 10.5 }}>보스 후</span></>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 9', border: `1px solid ${D.color}88` }}>
          <img src={chronicleEnemyArt(D.art)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3" style={{ fontSize: 12, color: PALETTE.textDim }}>{D.desc}</div>
        </div>
        {!d && (
          <div>
            <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginBottom: 6 }}>난이도 — 이전 단계 보스를 쓰러뜨리면 다음 단계가 열린다</div>
            <div className="flex gap-1.5">
              {DUNGEON_TIERS.map((t, i) => {
                const open = E.dungeonTierUnlocked(save, D.id, i);
                const cleared = best != null && best >= i;
                return (
                  <button key={t.id} disabled={!open} onClick={() => setTier(i)} className="ui-press flex-1" style={{ padding: '8px 0', borderRadius: 10, fontSize: 12.5, border: `1px solid ${tier === i ? t.color : 'var(--ui-line)'}`, color: open ? t.color : PALETTE.textDim, background: tier === i ? `${t.color}1c` : 'transparent', opacity: open ? 1 : 0.4 }}>
                    {open ? t.label : `🔒 ${t.label}`}{cleared ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-1.5">
          {D.floors.map((f, i) => {
            const curF = d && d.floor === i;
            const past = d && d.floor > i;
            return (
              <div key={i} className="flex-1 text-center" style={{ padding: '8px 0', borderRadius: 10, fontSize: 11.5, border: `1px solid ${curF ? D.color : 'var(--ui-line)'}`, color: past ? PALETTE.textDim : curF ? D.color : PALETTE.text, background: curF ? `${D.color}1c` : 'transparent' }}>
                {f.boss ? '👑' : `${i + 1}층`}<br /><span style={{ fontSize: 10.5 }}>Lv.{f.lv + T.lv}</span>
              </div>
            );
          })}
        </div>
        <GlassPanel className="p-3 flex flex-col gap-2">
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>
            {d ? '내 상태 — 층 사이 최대 HP의 25%만 회복' : `권장 Lv.${D.recLv + T.lv} · 적 HP ×${T.hp} · 공격 ×${T.atk} · 에픽 확률 ×${T.epicMult} · ◆ ×${T.shardMult} · 보스 유니크 ${Math.round(UNIQUE_CHANCE.dungeonBoss[d ? d.tier || 0 : tier] * 100)}%`}
          </div>
          {party.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <UnitIcon u={p} size={30} dim={p.hp <= 0} />
              <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} /></div>
              <span style={{ fontSize: 11, color: PALETTE.textDim, width: 70, textAlign: 'right' }}>{p.hp}/{p.maxHp}</span>
            </div>
          ))}
        </GlassPanel>
        {!d ? (
          <>
            <UIButton disabled={E.keyCount(save) < T.keyCost} onClick={() => onEnter(D.id, tier)}>
              {E.keyCount(save) < T.keyCost ? `열쇠 부족 (🗝 ${T.keyCost}개 필요)` : `${D.name} · ${T.label} 입장 — 🗝 ${T.keyCost}개`}
            </UIButton>
            <GlassPanel className="p-3">
              <div className="flex items-center justify-between" style={{ fontSize: 12.5, color: PALETTE.text }}>
                <span>🗝 던전 열쇠 <b style={{ color: PALETTE.legendary }}>{E.keyCount(save)}</b> / {DUNGEON_KEYS.max}</span>
                <button disabled={!E.canBuyKey(save)} onClick={onBuyKey} className="ui-press" style={{ fontSize: 12, padding: '6px 10px', borderRadius: 9, border: `1px solid ${E.canBuyKey(save) ? PALETTE.legendary : 'var(--ui-line)'}`, color: E.canBuyKey(save) ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', opacity: E.canBuyKey(save) ? 1 : 0.5 }}>
                  구매 🪙{DUNGEON_KEYS.shopPrice} (오늘 {E.keysBoughtToday(save)}/{DUNGEON_KEYS.shopDailyLimit})
                </button>
              </div>
              <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.55 }}>
                매일 0시 3개까지 충전 · 사냥터 강적 처치 시 {Math.round(DUNGEON_KEYS.eliteDrop * 100)}% · 일부 의뢰 보상 · 입장 시 소모(후퇴·전멸해도 돌려받지 못함) — 일반 1 · 영웅 2 · 전설 3
              </div>
            </GlassPanel>
          </>
        ) : (
          <>
            <UIButton onClick={onFight}>{D.floors[d.floor].boss ? '보스와 싸운다' : `${d.floor + 1}층 전투`}{dungeonAuto && !D.floors[d.floor].boss ? ' → 보스까지 연속' : ''}</UIButton>
            <button onClick={onToggleDungeonAuto} className="ui-press flex items-center gap-1.5 self-start" style={{ background: 'transparent', border: 'none', color: dungeonAuto ? PALETTE.legendary : PALETTE.textDim, padding: '4px 0', fontSize: 12.5 }}>
              <span className="flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${dungeonAuto ? PALETTE.legendary : 'var(--ui-line-strong)'}`, background: dungeonAuto ? `${PALETTE.legendary}33` : 'transparent', fontSize: 12 }}>{dungeonAuto ? '✓' : ''}</span>
              연속 도전 — 승리하면 다음 층으로 자동 진행 (보스까지)
            </button>
            <UIButton variant="ghost" onClick={onLeave}>후퇴 (마을로)</UIButton>
          </>
        )}
      </div>
    </div>
  );
}

// ===== 파티 · 성장 =====
function PartyView({ save, setSave, onBack }) {
  const cid = save.hero;
  const [slotPick, setSlotPick] = useState(null);
  const [skillInfo, setSkillInfo] = useState(null);
  const u = save.units[cid];
  const cls = chronicleClass(cid);
  const d = E.deriveUnit(save, cid);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="성장" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={cls.combatImage} alt="" className="object-cover flex-none" style={{ width: 92, height: 92, borderRadius: 16, border: `1px solid ${cls.color}`, objectPosition: '50% 25%' }} />
          <div className="flex-1 min-w-0">
            <div className="font-bold" style={{ fontSize: 17, color: PALETTE.text }}>{cls.name} <span style={{ fontSize: 12, color: cls.color }}>{cls.role}</span></div>
            <div style={{ fontSize: 12.5, color: PALETTE.legendary }}>Lv.{u.lv} / {CHRONICLE_TUNING.maxLevel} · 전투력 {E.unitPower(save, cid)}</div>
            <div className="mt-1"><Bar v={u.exp} max={CHRONICLE_TUNING.expNeed(u.lv)} color={PALETTE.legendary} h={5} /></div>
            <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>경험치 {u.exp}/{CHRONICLE_TUNING.expNeed(u.lv)}</div>
          </div>
        </div>

        {/* 능력치 */}
        <GlassPanel className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>능력치</span>
            <span style={{ fontSize: 12, color: u.points ? PALETTE.legendary : PALETTE.textDim }}>남은 포인트 {u.points}</span>
          </div>
          {STAT_KEYS.map(k => (
            <div key={k} className="flex items-center gap-2 mt-1.5">
              <span style={{ width: 34, fontSize: 13, color: k === cls.main ? PALETTE.legendary : PALETTE.text }}>{STAT_META[k].label}</span>
              <span className="font-semibold" style={{ width: 30, fontSize: 13.5, color: PALETTE.text }}>{u.stats[k]}</span>
              <span className="flex-1 truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{STAT_META[k].desc}</span>
              <button disabled={!u.points} onClick={() => setSave(E.addStat(save, cid, k, 1))} className="ui-press flex-none" style={{ width: 40, height: 34, borderRadius: 9, border: '1px solid var(--ui-line-strong)', color: PALETTE.legendary, background: 'transparent', opacity: u.points ? 1 : 0.3, fontSize: 16 }}>+</button>
            </div>
          ))}
          {u.points > 0 && <button onClick={() => setSave(E.autoAllocate(save, cid))} className="ui-press w-full mt-2" style={{ height: 36, borderRadius: 10, border: '1px dashed var(--ui-line-strong)', color: PALETTE.dawn, background: 'transparent', fontSize: 12.5 }}>추천 배분 ({cls.role} 기준)</button>}
          <table className="w-full mt-2" style={{ fontSize: 12, color: PALETTE.text }}>
            <tbody>
              <tr><td style={{ color: PALETTE.textDim }}>HP</td><td className="text-right">{d.maxHp}</td><td style={{ color: PALETTE.textDim, paddingLeft: 12 }}>공격력</td><td className="text-right">{d.atk}</td></tr>
              <tr><td style={{ color: PALETTE.textDim }}>방어</td><td className="text-right">{d.def}</td><td style={{ color: PALETTE.textDim, paddingLeft: 12 }}>속도</td><td className="text-right">{d.spd}</td></tr>
              <tr><td style={{ color: PALETTE.textDim }}>치명</td><td className="text-right">{Math.round(d.crit * 100)}%</td><td style={{ color: PALETTE.textDim, paddingLeft: 12 }}>회피</td><td className="text-right">{Math.round(d.dodge * 100)}%</td></tr>
              {cid === 'priest' && <tr><td style={{ color: PALETTE.textDim }}>치유력</td><td className="text-right">{d.healPower}</td><td /><td /></tr>}
            </tbody>
          </table>
        </GlassPanel>

        {/* 스킬 */}
        <GlassPanel className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>스킬 <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>— 전투에서 자동 사용</span></span>
            <span style={{ fontSize: 12, color: u.sp ? PALETTE.legendary : PALETTE.textDim }}>스킬 포인트 {u.sp}</span>
          </div>
          {classSkills(cid).map(s => {
            const lv = u.skills[s.id] || 0;
            const locked = s.reqLv > u.lv;
            const can = E.canLearn(u, s);
            return (
              <div key={s.id} className="flex items-center gap-2 mt-2">
                <button onClick={() => setSkillInfo(s)} className="flex-1 min-w-0 text-left ui-press" style={{ background: 'transparent', border: 'none', padding: 0, opacity: locked ? 0.45 : 1 }}>
                  <div style={{ fontSize: 13, color: lv ? PALETTE.text : PALETTE.textDim }}>{s.name} <span style={{ fontSize: 11, color: lv ? PALETTE.legendary : PALETTE.textDim }}>{lv ? `Lv.${lv}/${SKILL_MAX_LV}` : locked ? `Lv.${s.reqLv}부터` : '미습득'}</span></div>
                  <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{describeSkill(s, Math.max(1, lv))}</div>
                </button>
                <button disabled={!can} onClick={() => setSave(E.learnSkill(save, cid, s.id))} className="ui-press flex-none" style={{ height: 34, padding: '0 10px', borderRadius: 9, border: `1px solid ${can ? PALETTE.legendary : 'var(--ui-line)'}`, color: can ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', fontSize: 12, opacity: can ? 1 : 0.4 }}>
                  {lv ? '강화' : '배우기'}
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-2 mt-3 pt-2" style={{ borderTop: '1px solid var(--ui-line)' }}>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, color: u.mastery ? PALETTE.text : PALETTE.textDim }}>마스터리 <span style={{ fontSize: 11, color: PALETTE.legendary }}>Lv.{u.mastery || 0}</span></div>
              <div style={{ fontSize: 11, color: PALETTE.textDim }}>포인트 1개당 공격력·최대 HP +{Math.round(MASTERY_PCT * 100)}% · 상한 없음 (현재 +{Math.round((u.mastery || 0) * MASTERY_PCT * 100)}%)</div>
            </div>
            <button disabled={!u.sp} onClick={() => setSave(E.addMastery(save, cid, 1))} className="ui-press flex-none" style={{ height: 34, padding: '0 10px', borderRadius: 9, border: `1px solid ${u.sp ? PALETTE.legendary : 'var(--ui-line)'}`, color: u.sp ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', fontSize: 12, opacity: u.sp ? 1 : 0.4 }}>+1</button>
            {u.sp > 1 && <button onClick={() => setSave(E.addMastery(save, cid, u.sp))} className="ui-press flex-none" style={{ height: 34, padding: '0 10px', borderRadius: 9, border: `1px solid ${PALETTE.legendary}`, color: PALETTE.legendary, background: 'transparent', fontSize: 12 }}>전부</button>}
          </div>
        </GlassPanel>

        {/* 장비 */}
        <GlassPanel className="p-3 flex flex-col gap-2">
          <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>장비</span>
          {SLOTS.map(sl => {
            const it = save.inventory.find(i => i.uid === u.equip[sl.id]);
            return it ? (
              <ItemRow key={sl.id} save={save} item={it} onClick={() => setSlotPick(sl.id)} right={<span style={{ fontSize: 11, color: PALETTE.dawn }}>교체</span>} />
            ) : (
              <button key={sl.id} onClick={() => setSlotPick(sl.id)} className="ui-press w-full text-left" style={{ padding: '12px', borderRadius: 12, border: '1px dashed var(--ui-line-strong)', background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>
                {sl.icon} {sl.label} — 비어 있음 (눌러서 장착)
              </button>
            );
          })}
        </GlassPanel>
      </div>
      {slotPick && (
        <BottomSheet title={`${SLOTS.find(s => s.id === slotPick).label} 장착`} onClose={() => setSlotPick(null)}>
          <div className="flex flex-col gap-2">
            {u.equip[slotPick] != null && (
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => { setSave(E.unequipItem(save, cid, slotPick)); setSlotPick(null); }}>장착 해제</UIButton>
            )}
            {save.inventory.filter(i => i.slot === slotPick && i.uid !== u.equip[slotPick] && E.itemUsable(i, cid))
              .sort((a, b) => E.itemPower(b) - E.itemPower(a))
              .map(it => {
                const cur = save.inventory.find(i => i.uid === u.equip[slotPick]);
                return (
                  <div key={it.uid}>
                    <ItemRow save={save} item={it} onClick={() => { setSave(E.equipItem(save, cid, it.uid)); setSlotPick(null); }} />
                    <div className="px-2 pt-0.5"><DiffLine item={it} cur={cur} compact /></div>
                  </div>
                );
              })}
            {!save.inventory.some(i => i.slot === slotPick && i.uid !== u.equip[slotPick] && E.itemUsable(i, cid)) && <div className="text-center py-4" style={{ fontSize: 12.5, color: PALETTE.textDim }}>가방에 착용할 수 있는 장비가 없습니다{slotPick === 'accessory' ? '' : ` (${cls.name} 전용)`}</div>}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSlotPick(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
      {skillInfo && (
        <BottomSheet title={skillInfo.name} onClose={() => setSkillInfo(null)} maxHeight="60%">
          <div className="flex flex-col gap-1.5" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <div style={{ color: PALETTE.textDim }}>배울 수 있는 레벨 Lv.{skillInfo.reqLv}{skillInfo.cd ? ` · 재사용 ${skillInfo.cd}턴` : ''}</div>
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} style={{ color: (u.skills[skillInfo.id] || 0) === l ? PALETTE.legendary : PALETTE.text }}>Lv.{l} — {describeSkill(skillInfo, l)}</div>
            ))}
          </div>
          <div className="mt-4"><UIButton variant="ghost" onClick={() => setSkillInfo(null)}>닫기</UIButton></div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 가방 (캐릭터 전용) =====
function BagView({ save, setSave, onBack, flash }) {
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  // 정렬 (1.213.1): 착용 장비가 맨 위 → 그 아래 전투력(주 능력치) 높은 순
  const [sortBy, pickSort] = useItemSort();
  const [incOther, setIncOther] = useState(() => { try { return localStorage.getItem('chronicleBulkOther') === '1'; } catch { return false; } });
  const toggleOther = () => { const v = !incOther; setIncOther(v); try { localStorage.setItem('chronicleBulkOther', v ? '1' : '0'); } catch { /* */ } };
  const hero = save.hero;
  const list = sortItems(save, filterItems(save.inventory, filter, hero), sortBy);
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const others = save.inventory.filter(i => !E.itemUsable(i, hero));
  const bulk = (maxGrade) => {
    const uids = save.inventory.filter(i => gradeIdx(i.grade) <= maxGrade && !E.equippedBy(save, i.uid) && (incOther || E.itemUsable(i, hero))).map(i => i.uid);
    if (!uids.length) return;
    const r = E.dismantleItems(save, uids);
    setSave(r.save);
    flash(`${uids.length}개 분해 → ${E.salvageText(r.salvage)}`);
  };
  const toStash = (uids) => {
    const r = E.moveToStash(save, uids);
    setSave(r.save);
    flash(r.moved ? `창고로 ${r.moved}개 보관` : '창고가 가득 찼습니다');
  };
  const btn = { height: 34, borderRadius: 10, fontSize: 11.5, background: 'transparent' };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={`가방 ${save.inventory.length}/${E.bagMax(save)}`} onBack={onBack} right={<Wallet save={save} />} />
      {(() => {
        const c = E.bagExpandCost(save);
        return (
          <div className="flex items-center gap-2 px-3 pt-2 flex-none" style={{ fontSize: 12 }}>
            <span style={{ color: PALETTE.textDim }}>가방 확장 (최대 {BAG_EXPAND.max}칸)</span>
            <div className="flex-1" />
            {c == null ? <span style={{ color: PALETTE.textDim }}>최대 확장</span> : (
              <button disabled={save.gold < c} onClick={() => { setSave(E.expandBag(save)); flash(`가방 +${BAG_EXPAND.step}칸 → ${E.bagMax(save) + BAG_EXPAND.step}칸`); }} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', borderRadius: 9, border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary, background: 'transparent', opacity: save.gold < c ? 0.45 : 1 }}>
                +{BAG_EXPAND.step}칸 · 🪙 {c.toLocaleString()}
              </button>
            )}
          </div>
        );
      })()}
      <ItemFilterBar filter={filter} setFilter={setFilter} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        <button onClick={() => { setSave(E.autoEquip(save)); flash('더 강한 장비로 교체'); }} className="ui-press flex-1" style={{ ...btn, border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary }}>자동 장착</button>
        <button disabled={!others.length} onClick={() => toStash(others.map(i => i.uid))} className="ui-press flex-1" style={{ ...btn, border: '1px solid #9cc4e488', color: '#9cc4e4', opacity: others.length ? 1 : 0.4 }}>타직업 → 창고 ({others.length})</button>
      </div>
      <div className="flex gap-1.5 px-3 pt-1.5 flex-none">
        <button onClick={() => bulk(0)} className="ui-press flex-1" style={{ ...btn, border: '1px dashed var(--ui-line-strong)', color: PALETTE.textDim }}>일반 분해</button>
        <button onClick={() => bulk(1)} className="ui-press flex-1" style={{ ...btn, border: '1px dashed var(--ui-line-strong)', color: PALETTE.textDim }}>고급 이하 분해</button>
      </div>
      <div className="px-3 pt-1 flex-none" style={{ fontSize: 11, color: PALETTE.textDim }}>분해 재화 — 일반 🪙 · 고급 ✦ · 희귀 ✦📜 · 에픽 ✦◆ · 유니크 ◆🔮</div>
      <div className="flex items-center gap-2 px-3 pt-1.5 flex-none" style={{ fontSize: 12 }}>
        <button onClick={toggleOther} className="ui-press flex items-center gap-1.5" style={{ background: 'transparent', border: 'none', color: incOther ? PALETTE.legendary : PALETTE.textDim, padding: '4px 0' }}>
          <span className="flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${incOther ? PALETTE.legendary : 'var(--ui-line-strong)'}`, background: incOther ? `${PALETTE.legendary}33` : 'transparent', fontSize: 12 }}>{incOther ? '✓' : ''}</span>
          일괄 분해에 타직업 장비 포함
        </button>
        <div className="flex-1" />
        <SortButtons sortBy={sortBy} pickSort={pickSort} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map((it, i) => {
          const by = E.equippedBy(save, it.uid);
          const cur = !by && E.itemUsable(it, hero) ? save.inventory.find(x => x.uid === save.units[hero].equip[it.slot]) : null;
          const firstUnequipped = !by && (i === 0 || E.equippedBy(save, list[i - 1].uid));
          return (
            <React.Fragment key={it.uid}>
              {i === 0 && by && <div style={{ fontSize: 11.5, color: PALETTE.dawn, padding: '2px 2px 0' }}>착용 중</div>}
              {firstUnequipped && <div style={{ fontSize: 11.5, color: PALETTE.textDim, padding: '6px 2px 0' }}>보관 중 · {sortBy === 'grade' ? '등급' : '전투력'} 높은 순</div>}
              <ItemRow save={save} item={it} onClick={() => setSel(it.uid)} right={<span className="flex-none text-right" style={{ fontSize: 11, color: by ? PALETTE.dawn : PALETTE.textDim }}>{by ? '착용' : ''}<br />⚔{E.itemPower(it)}</span>} />
              {!by && E.itemUsable(it, hero) && <div className="px-2"><DiffLine item={it} cur={cur} compact /></div>}
            </React.Fragment>
          );
        })}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>비어 있습니다 — 사냥터에서 장비를 모아 보세요</div>}
      </div>
      {item && (() => {
        const usable = E.itemUsable(item, hero);
        const by = E.equippedBy(save, item.uid);
        const cur = save.inventory.find(i => i.uid === save.units[hero].equip[item.slot]);
        const diff = E.itemPower(item) - (cur ? E.itemPower(cur) : 0);
        return (
          <BottomSheet title={E.itemName(item) + (item.plus ? ` +${item.plus}` : '')} onClose={() => setSel(null)} maxHeight="72%">
            <div style={{ fontSize: 12.5, color: gradeOf(item.grade).color }} className="text-center">{gradeOf(item.grade).label} · Lv.{item.ilv} · {SLOTS.find(s => s.id === item.slot).label} · {clsTag(item)}</div>
            <div className="text-center mt-1" style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.6 }}>{statLine(E.itemStats(item))}</div>
            <ItemSpecial item={item} center />
            {usable && !by && <DiffLine item={item} cur={cur} />}
            {!usable && <div className="text-center mt-2" style={{ fontSize: 12, color: '#e06a5f' }}>{chronicleClass(save.hero).name}{'는 착용할 수 없습니다 — 공용 창고에 넣으면 '}{chronicleClass(item.cls).name} 캐릭터가 쓸 수 있습니다</div>}
            <div className="mt-3 flex flex-col gap-2">
              {usable && !by && (
                <UIButton style={{ height: 42 }} onClick={() => { setSave(E.equipItem(save, hero, item.uid)); setSel(null); flash('장착'); }}>
                  장착 {diff > 0 ? `(전투력 ▲ ${diff})` : diff < 0 ? `(전투력 ▼ ${-diff})` : ''}
                </UIButton>
              )}
              <div className="flex gap-2">
                <UIButton variant="ghost" style={{ height: 42 }} disabled={!!by} onClick={() => { toStash([item.uid]); setSel(null); }}>{by ? '착용 중' : '창고로'}</UIButton>
                <UIButton variant="ghost" style={{ height: 42 }} disabled={!!by} onClick={() => { const r = E.dismantleItems(save, [item.uid]); setSave(r.save); setSel(null); flash(`분해 → ${E.salvageText(r.salvage)}`); }}>
                  {by ? '착용 중' : `분해 ${E.salvageText(E.salvageOf(item))}`}
                </UIButton>
              </div>
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>닫기</UIButton>
            </div>
          </BottomSheet>
        );
      })()}
    </div>
  );
}

// ===== 사역마 (1.212.0) — 조각 소환(가챠) · 강화 · 진화 · 편성 =====
const famColor = (g) => F.famGrade(g).color;
// 사역마 역할 안내 + 직업별 추천 (1.216.0)
function FamRoleGuide({ heroCls }) {
  const tip = F.FAM_CLASS_TIP[heroCls];
  return (
    <GlassPanel className="p-3" style={{ fontSize: 12, lineHeight: 1.6 }}>
      <div className="font-semibold mb-1" style={{ fontSize: 13, color: PALETTE.text }}>역할 3종</div>
      {Object.entries(F.FAM_ROLES).map(([id, r]) => (
        <div key={id} style={{ color: PALETTE.textDim }}>
          <b style={{ color: r.color }}>{r.icon} {r.label}</b>{tip?.best === id ? <span style={{ color: PALETTE.legendary }}> ★ 추천</span> : ''} — {r.desc}
        </div>
      ))}
      {tip && <div className="mt-1.5" style={{ color: PALETTE.text }}>{chronicleClass(heroCls).name} 추천 동행: <b style={{ color: F.FAM_ROLES[tip.best].color }}>{F.FAM_ROLES[tip.best].icon} {F.FAM_ROLES[tip.best].label}</b> <span style={{ color: PALETTE.textDim }}>— {tip.why}</span></div>}
    </GlassPanel>
  );
}
// 동행 스킬 · 능력치 상세 (1.217.0)
function FamSkillPanel({ k, f }) {
  const skills = F.famSkillInfo(k, f);
  const r = F.famStatRatios(k, f);
  const p = (x) => `${Math.round(x * 100)}%`;
  return (
    <GlassPanel className="p-2.5 mt-2" style={{ fontSize: 12, lineHeight: 1.55 }}>
      <div className="font-semibold" style={{ color: PALETTE.text }}>동행 시 능력치 <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>(주인공 대비)</span></div>
      <div style={{ color: PALETTE.textDim }}>최대 HP {p(r.hp)} · 공격력 {p(r.atk)} · 방어 {p(r.def)} · 회복력 {p(r.heal)}{r.guard ? ` · 수호 태세 ${p(r.guard)}` : ''}</div>
      <div className="font-semibold mt-2" style={{ color: PALETTE.text }}>동행 스킬</div>
      {skills.map(sk => (
        <div key={sk.id} className="mt-1.5" style={{ paddingLeft: 8, borderLeft: `2px solid ${sk.sig ? '#d07ae8' : 'var(--ui-line-strong)'}`, opacity: sk.locked ? 0.55 : 1 }}>
          {sk.sig && <div style={{ fontSize: 11, color: '#d07ae8', fontWeight: 700 }}>★ 고유 스킬 · {sk.sigType}{sk.locked ? ' — 🔒 남령부터 사용 (수치는 남령 기준)' : ''}</div>}
          <div style={{ color: PALETTE.legendary, fontWeight: 600 }}>{sk.name} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>· 재사용 {sk.cd}턴</span></div>
          <div style={{ color: PALETTE.text }}>{sk.effect}</div>
          <div style={{ color: PALETTE.textDim }}>발동: {sk.when}</div>
        </div>
      ))}
      <div className="mt-1.5" style={{ color: PALETTE.textDim, fontSize: 11.5 }}>스킬이 모두 대기 중이면 일반 공격. 스킬 위력은 등급이 오를수록 커지고, 자령은 고유 스킬 지속 턴 +1.</div>
    </GlassPanel>
  );
}
// 보조 효과 등급표 — 청령부터 효과가 하나 더 붙는다
function FamSubTable({ k, gi }) {
  const rows = F.famSubPreview(k);
  const keys = Object.keys(F.FAM_ROLES[F.famRole(k)].sub);
  return (
    <div className="mt-2" style={{ fontSize: 11.5 }}>
      <div style={{ color: PALETTE.textDim, marginBottom: 3 }}>등급별 보조 효과 (강화 전 · 청령부터 효과 추가)</div>
      <div className="grid gap-x-2" style={{ gridTemplateColumns: `auto repeat(${keys.length}, 1fr)` }}>
        <span />
        {keys.map(kk => <span key={kk} className="text-right" style={{ color: PALETTE.textDim }}>{F.famSubLabel(kk)}</span>)}
        {rows.map((r, i) => (
          <React.Fragment key={r.grade.id}>
            <span style={{ color: r.grade.color, fontWeight: i === gi ? 700 : 400 }}>{i === gi ? '▶ ' : ''}{r.grade.label}</span>
            {keys.map(kk => <span key={kk} className="text-right" style={{ color: i === gi ? PALETTE.text : PALETTE.textDim, fontWeight: i === gi ? 700 : 400 }}>{r.vals[kk] ? `${Math.round(r.vals[kk] * 1000) / 10}%` : '—'}</span>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
function FamCard({ k, f, onClick, right, size = 46 }) {
  const g = F.famGrade(f.grade);
  const role = F.FAM_ROLES[F.famRole(k)];
  return (
    <button onClick={onClick} className="ui-press w-full flex items-center gap-2.5 text-left" style={{ padding: '7px 10px', borderRadius: 12, background: `${g.color}12`, border: `1px solid ${g.color}66` }}>
      <img src={chronicleEnemyArt(k)} alt="" className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 10, border: `1.5px solid ${g.color}` }} />
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold" style={{ fontSize: 13, color: g.color }}>{F.famName(k)}{f.plus ? ` +${f.plus}` : ''} <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>{g.label} · <span style={{ color: role.color }}>{role.icon} {role.label}</span></span></div>
        <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>보조 효과: {F.famSubText(k, f)}</div>
      </div>
      {right}
    </button>
  );
}
function FamiliarView({ save, setSave, onBack, flash }) {
  const [tab, setTab] = useState('summon');
  const [results, setResults] = useState(null);
  const [sel, setSel] = useState(null);
  const [pickSlot, setPickSlot] = useState(null);
  const fams = save.fams || {};
  const shards = save.mats.famShard || 0;
  const tickets = save.mats.sealPlus || 0;
  const souls = save.mats.famSoul || 0;
  const per = F.FAM_TUNING.shardsPerSummon;
  const pool = F.famPool(save.progress);
  const pity = save.famPity || { total: 0, sinceViolet: 0 };
  const team = save.famTeam || {};
  const list = Object.entries(fams).sort((a, b) => F.famGradeIdx(b[1].grade) - F.famGradeIdx(a[1].grade) || b[1].plus - a[1].plus);
  const doSummon = (n, ticket) => {
    const r = E.summonFam(save, n, ticket);
    if (!r.results) { flash(ticket ? '소환권이 부족합니다' : '계약서 조각이 부족합니다'); return; }
    setSave(r.save); setResults(r.results);
  };
  const slots = [
    { id: 'main', label: '동행', desc: '전투에 함께 싸운다' },
    { id: 'sub1', label: '보조 1', desc: '패시브 효과만' },
    { id: 'sub2', label: '보조 2', desc: '패시브 효과만' },
  ];
  const selF = sel && fams[sel];
  const tabBtn = (id, label) => <button key={id} onClick={() => setTab(id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 12, border: `1px solid ${tab === id ? PALETTE.legendary : 'var(--ui-line)'}`, color: tab === id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{label}</button>;
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사역마" onBack={onBack} right={<div className="flex items-center gap-2" style={{ fontSize: 12 }}><span style={{ color: '#d07ae8' }}>📜{shards}</span><span style={{ color: PALETTE.legendary }}>🎫{tickets}</span><span style={{ color: '#9cc4e4' }}>🔮{souls}</span></div>} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">{tabBtn('summon', '소환')}{tabBtn('list', `보관함 ${list.length}`)}{tabBtn('team', '편성')}</div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {tab === 'summon' && (
          <>
            <GlassPanel className="p-3">
              <div className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>계약의 제단</div>
              <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
                📜 계약서 조각 {per}개로 1회 소환 · 사냥터·던전에서 떨어진다 (보스 확정)<br />
                10연 소환은 청령 이상 1마리 확정 · 누적 {F.FAM_TUNING.violetPity}회 안에 자령 확정{pool.violet.length ? ` (지금 ${pity.sinceViolet}/${F.FAM_TUNING.violetPity})` : ' — 던전 보스나 2부 보스를 쓰러뜨리면 자령이 소환 목록에 들어온다'}
              </div>
              <div className="grid grid-cols-5 gap-1 mt-2">
                {F.FAM_GRADES.map(g => (
                  <div key={g.id} className="text-center" style={{ padding: '5px 0', borderRadius: 8, border: `1px solid ${g.color}55`, opacity: pool[g.id].length ? 1 : 0.35 }}>
                    <div style={{ fontSize: 12, color: g.color, fontWeight: 600 }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: PALETTE.textDim }}>{Math.round(g.rate * 1000) / 10}%</div>
                    <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>{pool[g.id].length}종</div>
                  </div>
                ))}
              </div>
              <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>소환 목록은 진행한 지역의 적만 — 보스를 잡을수록 늘어난다. 아직 없는 등급이 뽑히면 한 단계 아래로.</div>
            </GlassPanel>
            <div className="grid grid-cols-2 gap-2">
              <UIButton variant="ghost" disabled={shards < per} onClick={() => doSummon(1, false)}>1회 소환 📜{per}</UIButton>
              <UIButton disabled={shards < per * 10} onClick={() => doSummon(10, false)}>10연 소환 📜{per * 10}</UIButton>
            </div>
            {tickets > 0 && <UIButton variant="gold" onClick={() => doSummon(1, true)}>🎫 소환권으로 1회 소환 (남은 {tickets}장)</UIButton>}
            <GlassPanel className="p-3" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
              <b style={{ color: PALETTE.text }}>중복</b> → 🔮 사역혼 (적 1 · 녹 3 · 청 10 · 남 30 · 자 100). 더 높은 등급으로 중복이 나오면 그 등급으로 올라간다.<br />
              <b style={{ color: PALETTE.text }}>강화</b> +1~+{F.FAM_TUNING.maxPlus} (단계당 능력치 +{Math.round(F.FAM_TUNING.plusStatPct * 100)}%) → <b style={{ color: PALETTE.text }}>+{F.FAM_TUNING.maxPlus}에서 진화</b> 도전 — 실패하면 강화 -{F.FAM_TUNING.evolveFailDrop}단계.
            </GlassPanel>
          </>
        )}
        {tab === 'list' && (
          <>
            {list.map(([k, f]) => <FamCard key={k} k={k} f={f} onClick={() => setSel(k)} right={['main', 'sub1', 'sub2'].find(sl => team[sl] === k) && <span style={{ fontSize: 11, color: PALETTE.dawn }}>{slots.find(x => x.id === ['main', 'sub1', 'sub2'].find(sl => team[sl] === k)).label}</span>} />)}
            {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 사역마가 없습니다 — 계약서 조각을 모아 소환하세요</div>}
          </>
        )}
        {tab === 'team' && slots.map(sl => {
          const open = E.famSlotOpen(save, sl.id);
          const k = team[sl.id];
          const f = k && fams[k];
          return (
            <div key={sl.id}>
              <div style={{ fontSize: 12, color: PALETTE.text, marginBottom: 4 }}><b>{sl.label}</b> <span style={{ color: PALETTE.textDim }}>— {sl.desc}</span></div>
              {!open ? <div style={{ padding: 12, borderRadius: 12, border: '1px dashed var(--ui-line)', color: PALETTE.textDim, fontSize: 12.5 }}>🔒 주인공 Lv.{F.FAM_TUNING.slotLv[sl.id]}에 개방</div>
                : f ? <FamCard k={k} f={f} onClick={() => setPickSlot(sl.id)} right={<span style={{ fontSize: 11, color: PALETTE.dawn }}>교체</span>} />
                  : <button onClick={() => setPickSlot(sl.id)} className="ui-press w-full text-left" style={{ padding: 12, borderRadius: 12, border: '1px dashed var(--ui-line-strong)', background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>＋ 비어 있음 (눌러서 편성)</button>}
            </div>
          );
        })}
        {tab === 'team' && <FamRoleGuide heroCls={save.hero} />}
        {tab === 'team' && <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>동행 사역마는 주인공 능력치에 비례해 강해진다 (역할·등급·강화 반영). 주인공이 쓰러지면 패배. 사역마는 모든 캐릭터가 함께 쓴다.</div>}
      </div>

      {results && (
        <BottomSheet title="소환 결과" onClose={() => setResults(null)} maxHeight="80%">
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((r, i) => {
              const g = F.famGrade(r.grade);
              return (
                <div key={i} className={`flex items-center gap-2 ${F.famGradeIdx(r.grade) >= 3 ? 'ui-sheen' : ''}`} style={{ padding: 6, borderRadius: 10, border: `1px solid ${g.color}`, background: `${g.color}1a`, animationDelay: `${i * 60}ms` }}>
                  <img src={chronicleEnemyArt(r.key)} alt="" className="object-cover flex-none" style={{ width: 36, height: 36, borderRadius: 8 }} />
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: 12, color: g.color, fontWeight: 600 }}>{g.label} {F.famName(r.key)}</div>
                    <div style={{ fontSize: 10.5, color: r.isNew ? '#8fe08a' : r.upgraded ? PALETTE.legendary : PALETTE.textDim }}>{r.isNew ? 'NEW!' : r.upgraded ? '등급 상승!' : `중복 → 🔮+${r.soul}`}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4"><UIButton onClick={() => setResults(null)}>확인</UIButton></div>
        </BottomSheet>
      )}
      {selF && (() => {
        const g = F.famGrade(selF.grade);
        const gi = F.famGradeIdx(selF.grade);
        const maxed = selF.plus >= F.FAM_TUNING.maxPlus;
        const ec = F.FAM_TUNING.enhanceCost(selF.plus, selF.grade);
        const vc = F.FAM_TUNING.evolveCost(selF.grade);
        const last = gi >= F.FAM_GRADES.length - 1;
        return (
          <BottomSheet title={`${F.famName(sel)}${selF.plus ? ` +${selF.plus}` : ''}`} onClose={() => setSel(null)} maxHeight="80%">
            <img src={chronicleEnemyArt(sel)} alt="" className="w-full object-cover" style={{ aspectRatio: '16 / 8', borderRadius: 12, border: `1px solid ${g.color}` }} />
            <div className="text-center mt-2" style={{ fontSize: 13, color: g.color, fontWeight: 600 }}>{g.label} · {F.FAM_ROLES[F.famRole(sel)].icon} {F.FAM_ROLES[F.famRole(sel)].label}</div>
            <div className="text-center mt-0.5" style={{ fontSize: 12, color: PALETTE.textDim }}>{F.FAM_ROLES[F.famRole(sel)].desc}</div>
            <GlassPanel className="p-2.5 mt-2" style={{ fontSize: 12, color: PALETTE.text, lineHeight: 1.6 }}>
              <div><b>동행</b> <span style={{ color: PALETTE.textDim }}>— {gi >= F.FAM_SIG_MIN_GRADE ? `★${F.famSignature(sel, selF.grade).name} · ` : ''}{F.FAM_SKILLS[F.famRole(sel)].map(x => x.name).join(' · ')}{F.FAM_ROLES[F.famRole(sel)].guard ? ` · 수호 태세: 적 공격의 ${Math.round(F.FAM_ROLES[F.famRole(sel)].guard[gi] * 100)}%를 대신 받음` : ''}</span></div>
              <div><b>보조</b> <span style={{ color: PALETTE.textDim }}>— {F.famSubText(sel, selF)}</span></div>
            </GlassPanel>
            <FamSubTable k={sel} gi={gi} />
            <FamSkillPanel k={sel} f={selF} />
            <div className="flex gap-1 mt-3 justify-center">{Array.from({ length: F.FAM_TUNING.maxPlus }, (_, i) => <span key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i < selF.plus ? g.color : '#ffffff1a' }} />)}</div>
            <div className="mt-3 flex flex-col gap-2">
              {!maxed && <UIButton disabled={souls < ec} onClick={() => setSave(E.enhanceFam(save, sel))}>강화 +{selF.plus} → +{selF.plus + 1} (🔮{ec} / 보유 {souls})</UIButton>}
              {maxed && !last && (
                <UIButton variant="gold" disabled={souls < vc} onClick={() => {
                  const r = E.evolveFam(save, sel);
                  if (!r.result) return;
                  setSave(r.save);
                  flash(r.result === 'success' ? `진화 성공! ${F.FAM_GRADES[gi + 1].label}(으)로` : `진화 실패… 강화 -${F.FAM_TUNING.evolveFailDrop}단계`);
                }}>
                  {F.FAM_GRADES[gi + 1].label}(으)로 진화 — 성공률 {Math.round(g.evolve * 100)}% (🔮{vc})
                </UIButton>
              )}
              {maxed && last && <div className="text-center" style={{ fontSize: 12.5, color: g.color }}>최고 등급 · 최대 강화</div>}
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>닫기</UIButton>
            </div>
          </BottomSheet>
        );
      })()}
      {pickSlot && (
        <BottomSheet title={`${slots.find(x => x.id === pickSlot).label} 편성`} onClose={() => setPickSlot(null)} maxHeight="75%">
          <div className="flex flex-col gap-1.5">
            {team[pickSlot] && <UIButton variant="ghost" style={{ height: 40 }} onClick={() => { setSave(E.setFamTeam(save, pickSlot, null)); setPickSlot(null); }}>편성 해제</UIButton>}
            {list.filter(([k]) => k !== team[pickSlot]).map(([k, f]) => <FamCard key={k} k={k} f={f} onClick={() => { setSave(E.setFamTeam(save, pickSlot, k)); setPickSlot(null); }} />)}
            {!list.length && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>보유한 사역마가 없습니다</div>}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setPickSlot(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 무한 탑 「황혼의 첨탑」 (1.215.0) =====
function TowerView({ save, setSave, onBack, onFight, flash }) {
  const [shop, setShop] = useState(false);
  const [pickUnique, setPickUnique] = useState(false);
  const t = save.tower || { best: 0, checkpoint: 0, run: null };
  const run = t.run;
  const coins = save.mats.towerCoin || 0;
  const wk = save.towerWeek;
  const nextFloor = run ? run.floor : (t.checkpoint || 0) + 1;
  const boss = E.isTowerBoss(nextFloor);
  const party = E.partyCombatants(save, run?.hp);
  const nextCp = Math.ceil(nextFloor / E.TOWER.bossEvery) * E.TOWER.bossEvery;
  const myUniques = Object.values(UNIQUE_ITEMS).filter(u => !u.disabled && (u.cls === save.hero || u.cls === 'common'));
  const buy = (id, uid) => { const n = E.buyTowerItem(save, id, uid); if (n === save) { flash('구매할 수 없습니다'); return false; } setSave(n); flash('구매 완료'); return true; };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={run ? `황혼의 첨탑 · ${run.floor}층` : '황혼의 첨탑'} onBack={run ? null : onBack} right={<span style={{ fontSize: 12.5, color: '#e8b04a' }}>✪ {coins}</span>} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 8', border: '1px solid #e8b04a88' }}>
          <img src={chronicleEnemyArt('champ_dawn_boss4', 'combat')} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.85 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 18, color: PALETTE.text }}>{nextFloor}층 {boss ? '👑 보스' : nextFloor % 5 === 0 ? '⚔ 강적' : ''}</div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>적 Lv.{E.towerEnemyLv(nextFloor)} · 다음 체크포인트 {nextCp}층{boss ? ` · 유니크 ${Math.round(E.TOWER.uniqueChance(nextFloor) * 100)}%` : ''}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['최고 층', `${t.best || 0}`], ['체크포인트', `${t.checkpoint || 0}`], ['이번 주', `${wk?.key && wk.key === E.towerWeekKeyNow() ? wk.best : 0}`]].map(([l, v]) => (
            <GlassPanel key={l} className="p-2 text-center"><div style={{ fontSize: 11, color: PALETTE.textDim }}>{l}</div><div className="font-bold" style={{ fontSize: 17, color: PALETTE.legendary }}>{v}층</div></GlassPanel>
          ))}
        </div>
        {run && (
          <GlassPanel className="p-3 flex flex-col gap-2">
            <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>내 상태 — 층 사이 최대 HP의 25%만 회복</div>
            {party.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <UnitIcon u={p} size={30} dim={p.hp <= 0} />
                <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} /></div>
                <span style={{ fontSize: 11, color: PALETTE.textDim, width: 70, textAlign: 'right' }}>{p.hp}/{p.maxHp}</span>
              </div>
            ))}
          </GlassPanel>
        )}
        {run ? (
          <>
            <UIButton onClick={onFight}>{boss ? `👑 ${run.floor}층 보스와 싸운다` : `${run.floor}층 전투`}</UIButton>
            <UIButton variant="ghost" onClick={() => setSave(E.leaveTower(save))}>도전 종료 (체크포인트 {t.checkpoint || 0}층 유지)</UIButton>
          </>
        ) : (
          <UIButton onClick={() => setSave(E.startTower(save))}>🗼 {nextFloor}층부터 도전 (무료)</UIButton>
        )}
        <UIButton variant="gold" onClick={() => setShop(true)}>✪ 첨탑 상점</UIButton>
        <GlassPanel className="p-3" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
          층마다 적 레벨 +1 · 10층마다 보스 (사냥터·던전 보스 순환) · 보스를 쓰러뜨리면 그 층이 체크포인트가 된다.<br />
          쓰러지면 이번 도전이 끝나고, 다음 도전은 체크포인트 다음 층부터. 입장은 무료.<br />
          ✪ 첨탑 주화: 층마다 {E.TOWER.coins(1)}~ · 보스 층 ×{E.TOWER.bossCoinMult} · 이번 주 처음 도달한 10층 단위마다 층×3 보너스 (월요일 0시 초기화)
        </GlassPanel>
      </div>
      {shop && (
        <BottomSheet title={`✪ 첨탑 상점 — 보유 ${coins}`} onClose={() => setShop(false)} maxHeight="80%">
          <div className="flex flex-col gap-2">
            {E.TOWER_SHOP.map(it => {
              const ok = E.towerShopCanBuy(save, it.id);
              return (
                <button key={it.id} disabled={!ok} onClick={() => (it.id === 'unique' ? setPickUnique(true) : buy(it.id))} className="ui-press flex items-center gap-2 text-left" style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${ok ? '#e8b04a66' : 'var(--ui-line)'}`, background: 'transparent', opacity: ok ? 1 : 0.45 }}>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, color: PALETTE.text }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: PALETTE.textDim }}>{it.desc}</div>
                  </div>
                  <span className="flex-none font-semibold" style={{ fontSize: 13, color: '#e8b04a' }}>✪ {it.cost}</span>
                </button>
              );
            })}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setShop(false)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
      {pickUnique && (
        <BottomSheet title="🎁 유니크 선택 — 하나를 고르세요" onClose={() => setPickUnique(false)} maxHeight="85%">
          <div className="flex flex-col gap-1.5">
            {myUniques.map(u => (
              <button key={u.id} onClick={() => { if (buy('unique', u.id)) { setPickUnique(false); setShop(false); } }} className="ui-press text-left" style={{ padding: '9px 11px', borderRadius: 12, border: '1px solid #f0883e66', background: '#f0883e10' }}>
                <div style={{ fontSize: 13, color: '#f0883e', fontWeight: 600 }}>{u.name} <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>{SLOTS.find(s => s.id === u.slot)?.label} · {u.cls === 'common' ? '공용' : chronicleClass(u.cls).name}</span></div>
                <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{Object.entries(u.opts).map(([k, v]) => E.statLabel(k, v)).join(' · ')}</div>
                <div style={{ fontSize: 11.5, color: '#f0a86a' }}>✦ {u.desc}</div>
              </button>
            ))}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setPickUnique(false)}>취소</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 공용 창고 (계정 공유) =====
function StashView({ save, setSave, onBack, flash }) {
  const [filter, setFilter] = useState('mine');
  const [sel, setSel] = useState(null);
  const stash = save.stash || [];
  const hero = save.hero;
  const list = stash.filter(i => filter === 'all' || (filter === 'mine' ? E.itemUsable(i, hero) : filter === 'unique' ? i.grade === 'unique' : i.cls === filter))
    .sort((a, b) => gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a));
  const item = sel != null ? stash.find(i => i.uid === sel) : null;
  const bagFull = save.inventory.length >= E.bagMax(save);
  const tabs = [{ id: 'mine', label: '착용 가능' }, { id: 'unique', label: '유니크' }, { id: 'all', label: '전체' }];
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={`공용 창고 ${stash.length}/${A.STASH_MAX}`} onBack={onBack} right={<Wallet save={save} />} />
      <div className="px-4 pt-2 flex-none" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>
        모든 캐릭터가 함께 쓰는 창고 — 다른 직업 장비를 넣어 두면 그 직업 캐릭터가 꺼내 쓸 수 있습니다. (가방 {save.inventory.length}/{E.bagMax(save)})
      </div>
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {tabs.map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 12, border: `1px solid ${filter === s.id ? PALETTE.legendary : 'var(--ui-line)'}`, color: filter === s.id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{s.label}</button>
        ))}
      </div>
      <div className="flex gap-1.5 px-3 pt-1.5 flex-none overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CHRONICLE_CLASSES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className="ui-press flex-none" style={{ height: 32, padding: '0 10px', borderRadius: 9, fontSize: 11.5, border: `1px solid ${filter === c.id ? c.color : 'var(--ui-line)'}`, color: filter === c.id ? c.color : PALETTE.textDim, background: 'transparent' }}>
            {c.name} {stash.filter(i => i.cls === c.id).length}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map(it => <ItemRow key={it.uid} save={save} item={it} onClick={() => setSel(it.uid)} />)}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>보관된 장비가 없습니다 — 가방에서 「창고로」를 눌러 보관하세요</div>}
      </div>
      {item && (
        <BottomSheet title={E.itemName(item) + (item.plus ? ` +${item.plus}` : '')} onClose={() => setSel(null)} maxHeight="70%">
          <div style={{ fontSize: 12.5, color: gradeOf(item.grade).color }} className="text-center">{gradeOf(item.grade).label} · Lv.{item.ilv} · {SLOTS.find(s => s.id === item.slot).label} · {clsTag(item)}</div>
          <div className="text-center mt-1" style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.6 }}>{statLine(E.itemStats(item))}</div>
          <ItemSpecial item={item} center />
          <div className="mt-3 flex flex-col gap-2">
            <UIButton style={{ height: 42 }} disabled={bagFull} onClick={() => { setSave(E.takeFromStash(save, item.uid)); setSel(null); flash('가방으로 꺼냄'); }}>
              {bagFull ? '가방이 가득 찼습니다' : `가방으로 꺼내기${E.itemUsable(item, hero) ? '' : ' (지금 캐릭터는 착용 불가)'}`}
            </UIButton>
            <UIButton variant="ghost" style={{ height: 42 }} onClick={() => { const r = E.dismantleStash(save, [item.uid]); setSave(r.save); setSel(null); flash(`분해 → ${E.salvageText(r.salvage)}`); }}>
              분해 {E.salvageText(E.salvageOf(item))}
            </UIButton>
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 대장간 =====
// 가방·대장간 공용 정렬 (1.215.1): 착용 장비가 맨 위(부위 순) → 전투력 또는 등급 순
function useItemSort() {
  const [sortBy, setSortBy] = useState(() => { try { return localStorage.getItem('chronicleBagSort') || 'power'; } catch { return 'power'; } });
  const pickSort = (v) => { setSortBy(v); try { localStorage.setItem('chronicleBagSort', v); } catch { /* */ } };
  return [sortBy, pickSort];
}
function sortItems(save, items, sortBy) {
  const slotIdx = (i) => SLOTS.findIndex(x => x.id === i.slot);
  const eqd = (i) => (E.equippedBy(save, i.uid) ? 1 : 0);
  return items.slice().sort((a, b) => eqd(b) - eqd(a) || (eqd(a) && eqd(b) ? slotIdx(a) - slotIdx(b) : 0)
    || (sortBy === 'grade' ? gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a) : E.itemPower(b) - E.itemPower(a) || gradeIdx(b.grade) - gradeIdx(a.grade)));
}
function filterItems(items, filter, hero) {
  return items.filter(i => filter === 'all' || (filter === 'other' ? !E.itemUsable(i, hero) : i.slot === filter));
}
function ItemFilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-1.5 px-3 pt-2 flex-none">
      {[{ id: 'all', label: '전체' }, ...SLOTS, { id: 'other', label: '타직업' }].map(s => (
        <button key={s.id} onClick={() => setFilter(s.id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 11.5, border: `1px solid ${filter === s.id ? PALETTE.legendary : 'var(--ui-line)'}`, color: filter === s.id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{s.label}</button>
      ))}
    </div>
  );
}
function SortButtons({ sortBy, pickSort }) {
  return (
    <>
      <span style={{ color: PALETTE.textDim }}>정렬</span>
      {[['power', '전투력'], ['grade', '등급']].map(([v, l]) => (
        <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', borderRadius: 8, border: `1px solid ${sortBy === v ? PALETTE.legendary : 'var(--ui-line)'}`, color: sortBy === v ? PALETTE.legendary : PALETTE.textDim, background: 'transparent' }}>{l}</button>
      ))}
    </>
  );
}

function RiskLine({ rate, fail, danger }) {
  return (
    <div style={{ fontSize: 12, marginTop: 2 }}>
      <span style={{ color: rate >= 1 ? '#8fe08a' : rate >= 0.5 ? PALETTE.legendary : '#e06a5f', fontWeight: 700 }}>성공률 {Math.round(rate * 100)}%</span>
      {fail ? <span style={{ color: danger ? '#e06a5f' : PALETTE.textDim, fontWeight: danger ? 700 : 400 }}> · {danger ? '⚠ ' : ''}{fail}</span> : null}
    </div>
  );
}
function ForgeView({ save, setSave, onBack, flash }) {
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, pickSort] = useItemSort();
  const list = sortItems(save, filterItems(save.inventory, filter, save.hero), sortBy);
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const ec = item && E.enhanceCost(item);
  const pc = item && E.promoteCost(item);
  const ng = item && E.nextGrade(item);
  const er = item && E.enhanceRisk(item);
  const pr = item && ng && E.promoteRisk(item);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="대장간" onBack={onBack} right={<Wallet save={save} />} />
      <div className="px-4 pt-3 flex-none" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.55 }}>
        <b style={{ color: PALETTE.text }}>강화</b> +1당 능력치 +{Math.round(FORGE.enhancePct * 100)}% (최대 +{FORGE.maxEnhance}, +3부터 실패 · +6부터 하락 · +8부터 파괴 위험) · <b style={{ color: PALETTE.text }}>승급</b> 다음 등급으로 + 옵션 1개 추가 — 에픽 승급은 던전의 ◆ 고대 파편 필요 · 유니크는 승급 불가(강화만)
      </div>
      <ItemFilterBar filter={filter} setFilter={setFilter} />
      <div className="flex items-center gap-2 px-3 pt-1.5 flex-none" style={{ fontSize: 12 }}>
        <span style={{ color: PALETTE.textDim }}>{list.length}개</span>
        <div className="flex-1" />
        <SortButtons sortBy={sortBy} pickSort={pickSort} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map(it => <ItemRow key={it.uid} save={save} item={it} onClick={() => setSel(it.uid)} />)}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{save.inventory.length ? '이 분류에 장비가 없습니다' : '가방에 장비가 없습니다'}</div>}
      </div>
      {item && (
        <BottomSheet title={E.itemName(item) + (item.plus ? ` +${item.plus}` : '')} onClose={() => setSel(null)} maxHeight="70%">
          <div className="text-center" style={{ fontSize: 12.5, color: gradeOf(item.grade).color }}>{gradeOf(item.grade).label} · Lv.{item.ilv}</div>
          <div className="text-center mt-1" style={{ fontSize: 12.5, color: PALETTE.text }}>{statLine(E.itemStats(item))}</div>
          <ItemSpecial item={item} center />
          <div className="mt-3 flex flex-col gap-2">
            <GlassPanel className="p-3">
              <div style={{ fontSize: 13, color: PALETTE.text }} className="font-semibold">강화 +{item.plus || 0} → +{(item.plus || 0) + 1}</div>
              {(item.plus || 0) < FORGE.maxEnhance ? (
                <>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>결과: {statLine(E.itemStats({ ...item, plus: (item.plus || 0) + 1 }))}</div>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>비용: 🪙 {ec.gold} · ✦ {ec.essence}</div>
                  <RiskLine rate={er.rate} fail={er.breakChance ? `실패 시 1단계 하락 · 그중 ${Math.round(er.breakChance * 100)}%는 장비 파괴` : er.drop ? '실패 시 1단계 하락' : er.rate < 1 ? '실패 시 재료만 잃음' : ''} danger={!!er.breakChance} />
                  <UIButton style={{ height: 40, marginTop: 8 }} disabled={!E.canEnhance(save, item)} onClick={() => {
                    const r = E.forgeEnhance(save, item.uid); if (!r.result) return; setSave(r.save);
                    if (r.result === 'destroy') { setSel(null); flash('💥 강화 실패 — 장비가 파괴되었습니다'); }
                    else flash({ success: `강화 성공! +${(item.plus || 0) + 1}`, fail: '강화 실패 — 재료만 잃었습니다', down: `강화 실패 — +${Math.max(0, (item.plus || 0) - 1)}로 하락` }[r.result]);
                  }}>강화</UIButton>
                </>
              ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>최대 강화</div>}
            </GlassPanel>
            <GlassPanel className="p-3">
              <div style={{ fontSize: 13, color: PALETTE.text }} className="font-semibold">등급 승급 {ng ? `→ ${gradeOf(ng).label}` : ''}</div>
              {ng ? (
                <>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>결과: {statLine(E.itemStats({ ...item, grade: ng }))}{` + 무작위 옵션 1개`}{ng === 'epic' && item.slot === 'accessory' ? ' + 에픽 장신구 효과' : ''}</div>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>비용: 🪙 {pc.gold} · ✦ {pc.essence}{pc.shard ? ` · ◆ ${pc.shard}` : ''}</div>
                  <RiskLine rate={pr.rate} fail={pr.breaks ? '실패 시 장비 파괴' : '실패 시 재료만 잃음'} danger={pr.breaks} />
                  <UIButton variant="gold" style={{ height: 40, marginTop: 8 }} disabled={!E.canPromote(save, item)} onClick={() => {
                    const r = E.forgePromote(save, item.uid); if (!r.result) return; setSave(r.save);
                    if (r.result === 'destroy') { setSel(null); flash('💥 승급 실패 — 장비가 파괴되었습니다'); return; }
                    if (r.result === 'fail') { flash('승급 실패 — 재료만 잃었습니다'); return; }
                    const it2 = r.save.inventory.find(i => i.uid === item.uid); flash(E.epicOptOf(it2) ? `에픽 승급! 「${E.epicOptOf(it2).name}」` : `${gradeOf(ng).label} 등급으로 승급!`);
                  }}>승급</UIButton>
                </>
              ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>최고 등급</div>}
            </GlassPanel>
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 시작 · 캐릭터 슬롯 =====
// 직업당 캐릭터 1명 (최대 5). 재화·열쇠·공용 창고는 모든 캐릭터가 공유한다.
function TitleView({ acc, onSelect, onCreate, onExit }) {
  const [picking, setPicking] = useState(null); // 새로 만들 직업 id
  const chars = acc.chars || {};
  const owned = CHRONICLE_CLASSES.filter(c => chars[c.id]);
  const last = acc.active && chars[acc.active] ? acc.active : null;
  if (picking) {
    const cls = chronicleClass(picking);
    return (
      <div className="absolute inset-0 flex flex-col">
        <Header title="새 캐릭터" onBack={() => setPicking(null)} />
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex gap-2">
            {CHRONICLE_CLASSES.map(c => (
              <button key={c.id} disabled={!!chars[c.id]} onClick={() => setPicking(c.id)} className="ui-press flex-1" style={{ borderRadius: 14, padding: 2, border: `2px solid ${picking === c.id ? c.color : 'transparent'}`, opacity: chars[c.id] ? 0.25 : picking === c.id ? 1 : 0.55, background: 'transparent' }}>
                <img src={c.image} alt={c.name} className="w-full object-cover" style={{ aspectRatio: '1', borderRadius: 11 }} />
              </button>
            ))}
          </div>
          <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 10', border: `1px solid ${cls.color}88` }}>
            <img src={cls.combatImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, #0a0608)' }} />
            <div className="absolute bottom-2 left-3">
              <div className="font-bold" style={{ fontSize: 19, color: PALETTE.text }}>{cls.name} <span style={{ fontSize: 12.5, color: cls.color }}>{cls.role}</span></div>
              <div style={{ fontSize: 12, color: PALETTE.textDim }}>「{cls.quote}」</div>
            </div>
          </div>
          <GlassPanel className="p-3" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <div className="font-semibold mb-1">스킬</div>
            {classSkills(picking).map(s => <div key={s.id} style={{ color: PALETTE.textDim, lineHeight: 1.55 }}><b style={{ color: PALETTE.text }}>{s.name}</b> (Lv.{s.reqLv}) — {describeSkill(s, 1)}</div>)}
          </GlassPanel>
          <GlassPanel className="p-3" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>
            <div className="font-semibold mb-1" style={{ color: PALETTE.text }}>전용 장비</div>
            무기 · 보조({SLOTS[1].label}) · 갑옷은 {cls.name} 전용, 장신구는 공용. 유니크 {Object.values(UNIQUE_ITEMS).filter(u => u.cls === picking && !u.disabled).length}종.
          </GlassPanel>
        </div>
        <div className="p-4 flex-none"><UIButton onClick={() => onCreate(picking)}>{cls.name}{'(으)로 시작'}</UIButton></div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_1/iceMage_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0608cc 0%, #0a060844 30%, #0a0608 70%)' }} />
      <div className="relative flex-1 flex flex-col px-5 pt-12 pb-5 min-h-0">
        <div className="text-center flex-none">
          <div style={{ fontSize: 11, letterSpacing: '0.45em', color: '#9cc4e4' }}>{CHRONICLE_SUB.toUpperCase()}</div>
          <div className="font-bold mt-1" style={{ fontSize: 32, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: '0 4px 20px #000' }}>{CHRONICLE_TITLE}</div>
          <div className="mt-2" style={{ fontSize: 12.5, color: PALETTE.textDim }}>홀로 걷는 정통 RPG — 레벨 {CHRONICLE_TUNING.maxLevel} · 직업 장비 · 유니크 · 공용 창고</div>
        </div>
        <div className="mt-auto flex flex-col gap-2 ui-stagger overflow-y-auto">
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>캐릭터 ({owned.length}/{CHRONICLE_CLASSES.length}) · 🪙{acc.gold} · 🗝{acc.keys?.count || 0} · 창고 {(acc.stash || []).length}</div>
          {CHRONICLE_CLASSES.map(c => {
            const ch = chars[c.id];
            return (
              <button key={c.id} onClick={() => (ch ? onSelect(c.id) : setPicking(c.id))} className="ui-press flex items-center gap-3 text-left" style={{ padding: 8, borderRadius: 14, background: last === c.id ? `${c.color}22` : 'rgba(10,6,8,0.7)', border: `1px solid ${ch ? c.color + '88' : 'var(--ui-line)'}` }}>
                <Portrait cid={c.id} size={42} dim={!ch} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: 14, color: ch ? PALETTE.text : PALETTE.textDim }}>{c.name} <span style={{ fontSize: 11, color: c.color }}>{c.role}</span></div>
                  <div style={{ fontSize: 11.5, color: ch ? PALETTE.legendary : PALETTE.textDim }}>
                    {ch ? `Lv.${ch.unit.lv} · 보스 ${Object.keys(ch.progress.bossCleared || {}).length}/${CHRONICLE_FIELDS.length} 처치` : '비어 있음 — 눌러서 만들기'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: ch ? PALETTE.dawn : PALETTE.textDim }}>{ch ? (last === c.id ? '이어하기 ▸' : '선택 ▸') : '＋'}</span>
              </button>
            );
          })}
          <button onClick={onExit} className="ui-press" style={{ background: 'transparent', border: 'none', color: PALETTE.dawn, padding: 10, fontSize: 12.5 }}>⇄ 게임 선택</button>
        </div>
      </div>
    </div>
  );
}

// 2.0 첫 진입 안내 (1.x 플레이어 — 초기화 + 시작 보상)
function GiftNotice({ acc, onClose }) {
  const g = A.V1_GIFT;
  return (
    <BottomSheet title="황혼 연대기 2.0" onClose={onClose} maxHeight="70%">
      <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
        파티제 → <b style={{ color: PALETTE.legendary }}>솔로 RPG</b>로 다시 태어났습니다. 직업 전용 장비 · 유니크 등급 · 공용 창고 · 레벨 {CHRONICLE_TUNING.maxLevel}.
        <div className="mt-2" style={{ color: PALETTE.textDim }}>이전 버전(1.x) 진행은 새 구조와 맞지 않아 초기화되었습니다. 미안한 마음을 담아 시작 보상을 드립니다.</div>
        <GlassPanel className="p-3 mt-3">
          <div>🪙 골드 {g.gold.toLocaleString()}</div>
          <div>🗝 던전 열쇠 +{g.keys}</div>
          <div>🎫 사역마 소환권 {g.sealPlus}장</div>
          <div>🎁 첫 캐릭터 직업 희귀 장비 {g.rareBoxes}개</div>
        </GlassPanel>
        <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{Object.keys(acc.chars || {}).length ? '보상은 지급되었습니다.' : '첫 캐릭터를 만들면 지급됩니다.'}</div>
      </div>
      <div className="mt-4"><UIButton onClick={onClose}>확인</UIButton></div>
    </BottomSheet>
  );
}

// ===== 이야기 장면 =====
function speakerOf(save, sp) {
  if (sp === 'narr') return { name: '', img: null, color: PALETTE.textDim };
  if (sp === 'hero') { const c = chronicleClass(save.hero); return { name: c.name, img: c.image, color: c.color }; }
  if (NPCS[sp]) return { name: NPCS[sp].name, icon: NPCS[sp].icon, color: NPCS[sp].color };
  if (CHRONICLE_CLASSES.some(c => c.id === sp)) { const c = chronicleClass(sp); return { name: c.name, img: c.image, color: c.color }; }
  if (ENEMIES[sp]) return { name: ENEMIES[sp].name, img: chronicleEnemyArt(sp), color: '#e06a5f' };
  return { name: sp, color: PALETTE.text };
}
function SceneView({ save, scene, onEnd }) {
  const [i, setI] = useState(0);
  const line = scene.lines[i];
  const who = speakerOf(save, line.sp);
  const bg = scene.id === 'ending' && save.hero !== 'priest' ? `./classes/${save.hero}win.jpg` : scene.bg;
  const next = () => (i + 1 < scene.lines.length ? setI(i + 1) : onEnd());
  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: '#050304' }} onClick={next}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55 }} draggable={false} />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #050304aa 0%, transparent 30%, #050304ee 72%)' }} />
      <div className="relative flex items-center px-4 pt-4">
        <div className="flex-1" style={{ fontSize: 11, letterSpacing: '0.3em', color: PALETTE.dawn }}>{scene.title}</div>
        <button onClick={(e) => { e.stopPropagation(); onEnd(); }} className="ui-press" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--ui-line-strong)', color: PALETTE.textDim, background: '#0008' }}>건너뛰기 ⏭</button>
      </div>
      <div className="flex-1" />
      <div className="relative px-4 pb-6">
        <div key={i} className="ui-screen-enter" style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(12,7,9,0.88)', border: `1px solid ${line.sp === 'narr' ? 'var(--ui-line)' : who.color + '88'}`, minHeight: 130 }}>
          {line.sp !== 'narr' && (
            <div className="flex items-center gap-2 mb-2">
              {who.img ? <img src={who.img} alt="" className="object-cover" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${who.color}` }} /> : <span style={{ fontSize: 26 }}>{who.icon}</span>}
              <span className="font-semibold" style={{ fontSize: 14, color: who.color }}>{who.name}</span>
            </div>
          )}
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: line.sp === 'narr' ? '#cbbba6' : PALETTE.text, fontStyle: line.sp === 'narr' ? 'italic' : 'normal' }}>{line.t}</div>
          <div className="text-right mt-2" style={{ fontSize: 11, color: PALETTE.textDim }}>{i + 1}/{scene.lines.length} · 눌러서 계속 ▸</div>
        </div>
      </div>
    </div>
  );
}

// ===== 의뢰 게시판 =====
const Q_KIND = { main: { label: '메인', color: '#e8b04a' }, side: { label: '의뢰', color: '#9cc4e4' }, companion: { label: '동료', color: '#9fd18a' } };
function QuestCard({ save, item, onAccept, onClaim, onAbandon }) {
  const { q, status, prog } = item;
  const k = Q_KIND[q.kind];
  return (
    <div style={{ padding: 12, borderRadius: 14, background: status === 'done' ? 'rgba(232,176,74,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${status === 'done' ? PALETTE.legendary : 'var(--ui-line)'}` }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, color: k.color, border: `1px solid ${k.color}66` }}>{k.label}</span>
        <span className="flex-1 font-semibold truncate" style={{ fontSize: 13.5, color: status === 'claimed' ? PALETTE.textDim : PALETTE.text }}>{q.title}</span>
        {q.kind === 'companion' && <Portrait cid={q.req.companion} size={26} />}
      </div>
      <div className="mt-1" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.5 }}>{q.desc}</div>
      {(status === 'active' || status === 'done') && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1"><Bar v={prog.cur} max={prog.max} color={status === 'done' ? PALETTE.legendary : '#9cc4e4'} h={6} /></div>
          <span style={{ fontSize: 11.5, color: PALETTE.text }}>{Math.max(0, prog.cur)}/{prog.max}</span>
        </div>
      )}
      <div className="mt-1.5" style={{ fontSize: 11.5, color: PALETTE.legendary }}>보상: {Q.rewardText(q.reward)}</div>
      {status === 'available' && <UIButton variant="ghost" style={{ height: 38, marginTop: 8 }} onClick={onAccept}>수락</UIButton>}
      {status === 'done' && <UIButton style={{ height: 38, marginTop: 8 }} onClick={onClaim}>보상 받기</UIButton>}
      {status === 'active' && q.kind !== 'main' && (
        <button onClick={onAbandon} className="ui-press mt-1" style={{ fontSize: 11, color: PALETTE.textDim, background: 'transparent', border: 'none', padding: '4px 0' }}>포기하기</button>
      )}
    </div>
  );
}
function QuestView({ save, setSave, onBack, flash, onReplay }) {
  const [tab, setTab] = useState('board');
  const list = Q.questList(save);
  const order = { done: 0, active: 1, available: 2 };
  const shown = list.filter(x => order[x.status] != null).sort((a, b) => order[a.status] - order[b.status] || (a.q.kind === 'main' ? -1 : 0));
  const claimed = list.filter(x => x.status === 'claimed');
  const seen = Q.seenScenes(save);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="의뢰 게시판" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {[['board', `게시판 ${shown.length}`], ['done', `완료 ${claimed.length}`], ['story', '지난 이야기']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 12, border: `1px solid ${tab === id ? PALETTE.legendary : 'var(--ui-line)'}`, color: tab === id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {tab === 'board' && shown.map(item => (
          <QuestCard key={item.q.id} save={save} item={item}
            onAccept={() => { setSave(Q.acceptQuest(save, item.q.id)); flash(`「${item.q.title}」 수락`); }}
            onAbandon={() => setSave(Q.abandonQuest(save, item.q.id))}
            onClaim={() => {
              const r = Q.claimQuest(save, item.q.id, Math.random);
              setSave(r.save);
              flash(r.gained?.item ? `보상 수령 — ${E.itemName(r.gained.item)} 획득` : r.gained?.keysGot ? `보상 수령 — 🗝 열쇠 +${r.gained.keysGot}` : '보상 수령!');
            }} />
        ))}
        {tab === 'board' && !shown.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>지금 받을 수 있는 의뢰가 없습니다 — 새 지역을 열면 의뢰가 붙습니다</div>}
        {tab === 'done' && claimed.map(item => <QuestCard key={item.q.id} save={save} item={item} />)}
        {tab === 'story' && seen.map(sc => (
          <button key={sc.id} onClick={() => onReplay(sc)} className="ui-press text-left" style={{ padding: 12, borderRadius: 14, border: '1px solid var(--ui-line)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>{sc.title}</div>
            <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{sc.lines[0].t}</div>
          </button>
        ))}
        {tab === 'story' && !seen.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 본 이야기가 없습니다</div>}
      </div>
    </div>
  );
}

// ===== 반복 사냥 보고서 (1.213.0) =====
function huntRecord(sim, party, enc, summary) {
  const dmg = E.battleDamageStats(sim, party);
  const units = {};
  for (const p of party) units[p.id] = { id: p.id, name: p.name, fam: !!p.fam, famKey: p.famKey, classId: p.classId, dmg: dmg.byUnit[p.id] || 0 };
  return {
    win: sim.result === 'win', type: enc.type, rounds: dmg.rounds,
    kills: sim.result === 'win' ? enc.enemies.reduce((m, e) => ({ ...m, [e.tier]: (m[e.tier] || 0) + 1 }), {}) : {},
    units, skills: dmg.bySkill,
    exp: summary.exp || 0, gold: summary.gold || 0, essence: summary.essence || 0, famShards: summary.famShards || 0,
    items: (summary.items || []).map(i => i.grade), levelUps: Object.keys(summary.levelUps || {}).length,
  };
}
function newHuntStats() {
  return { battles: 0, wins: 0, losses: 0, rounds: 0, types: {}, kills: {}, units: {}, skills: {}, exp: 0, gold: 0, essence: 0, famShards: 0, items: {}, levelUps: 0, startedAt: Date.now() };
}
function addHuntRecord(st, r) {
  st.battles += 1; if (r.win) st.wins += 1; else st.losses += 1;
  st.rounds += r.rounds;
  st.types[r.type] = (st.types[r.type] || 0) + 1;
  for (const [k, v] of Object.entries(r.kills)) st.kills[k] = (st.kills[k] || 0) + v;
  for (const u of Object.values(r.units)) {
    const key = u.fam ? `fam:${u.famKey}` : u.id;
    const cur = st.units[key] || { ...u, dmg: 0, rounds: 0 };
    cur.dmg += u.dmg; cur.rounds += r.rounds;
    st.units[key] = cur;
  }
  for (const [k, v] of Object.entries(r.skills)) {
    const [id, sn] = k.split('|');
    const u = r.units[id];
    const key = `${u?.fam ? `fam:${u.famKey}` : id}|${sn}`;
    st.skills[key] = (st.skills[key] || 0) + v;
  }
  st.exp += r.exp; st.gold += r.gold; st.essence += r.essence; st.famShards += r.famShards; st.levelUps += r.levelUps;
  for (const g of r.items) st.items[g] = (st.items[g] || 0) + 1;
}
const TIER_LABEL = { normal: '일반 몹', elite: '강적', boss: '보스' };
function HuntReport({ report: r, onClose, title = '📊 사냥 보고서' }) {
  const units = Object.entries(r.units).map(([key, u]) => ({ key, ...u })).sort((a, b) => b.dmg - a.dmg);
  const total = units.reduce((t, u) => t + u.dmg, 0) || 1;
  const skills = Object.entries(r.skills).map(([k, v]) => { const [uk, sn] = k.split('|'); return { uk, sn, v }; }).sort((a, b) => b.v - a.v).slice(0, 6);
  const mins = Math.max(1, Math.round((r.endedAt - r.startedAt) / 60000));
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: PALETTE.text, padding: '3px 0' };
  return (
    <BottomSheet title={title} onClose={onClose} maxHeight="85%">
      <div className="flex flex-col gap-3">
        <GlassPanel className="p-3">
          <div className="font-semibold mb-1" style={{ fontSize: 13, color: PALETTE.legendary }}>
            {r.battles === 1 ? <>{r.wins ? '승리' : '패배'} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>· {r.rounds}라운드</span></> : <>전투 {r.battles}회 · 승리 {r.wins} · 패배 {r.losses} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>· {r.rounds}라운드 · 약 {mins}분</span></>}
          </div>
          {['normal', 'elite', 'boss'].filter(t => r.kills[t]).map(t => <div key={t} style={row}><span>{TIER_LABEL[t]} 처치</span><b>{r.kills[t]}마리</b></div>)}
          {r.types.gate ? <div style={row}><span>관문 전투</span><b>{r.types.gate}회</b></div> : null}
        </GlassPanel>
        <GlassPanel className="p-3">
          <div className="font-semibold mb-2" style={{ fontSize: 13, color: PALETTE.text }}>기여도 · 라운드당 피해(DPS) 순위</div>
          {units.map((u, i) => {
            const pct = Math.round(u.dmg / total * 100);
            const dps = Math.round(u.dmg / Math.max(1, u.rounds));
            return (
              <div key={u.key} className="flex items-center gap-2 mb-2">
                <span style={{ width: 18, fontSize: 13, fontWeight: 700, color: i === 0 ? PALETTE.legendary : PALETTE.textDim }}>{i + 1}</span>
                <UnitIcon u={u} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between" style={{ fontSize: 12, color: PALETTE.text }}><span className="truncate">{u.fam ? `🐾 ${u.name}` : u.name}</span><span>{pct}%</span></div>
                  <Bar v={u.dmg} max={total} color={u.fam ? '#d07ae8' : PALETTE.legendary} h={6} />
                  <div style={{ fontSize: 11, color: PALETTE.textDim }}>총 {u.dmg.toLocaleString()} · 라운드당 {dps.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
          {skills.length > 0 && <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>스킬별 피해 상위</div>}
          {skills.map((x, i) => (
            <div key={i} style={{ ...row, fontSize: 12 }}><span>{i + 1}. {x.sn} <span style={{ color: PALETTE.textDim }}>({r.units[x.uk]?.fam ? '사역마' : '주인공'})</span></span><span>{x.v.toLocaleString()} ({Math.round(x.v / total * 100)}%)</span></div>
          ))}
        </GlassPanel>
        {(r.wins > 0 || r.battles > 1) && <GlassPanel className="p-3">
          <div className="font-semibold mb-1" style={{ fontSize: 13, color: PALETTE.text }}>획득</div>
          <div style={row}><span>경험치</span><b>{r.exp.toLocaleString()}</b></div>
          <div style={row}><span>골드</span><b>🪙 {r.gold.toLocaleString()}</b></div>
          <div style={row}><span>정수</span><b>✦ {r.essence}</b></div>
          {r.famShards ? <div style={row}><span>계약서 조각</span><b>📜 {r.famShards}</b></div> : null}
          {r.levelUps ? <div style={row}><span>레벨 업</span><b>▲ {r.levelUps}</b></div> : null}
          <div style={row}><span>장비</span><b>{GRADES.filter(g => r.items[g.id]).map(g => <span key={g.id} style={{ color: g.color, marginLeft: 6 }}>{g.label} {r.items[g.id]}</span>)}{!Object.keys(r.items).length && '없음'}</b></div>
        </GlassPanel>}
        <UIButton onClick={onClose}>확인</UIButton>
      </div>
    </BottomSheet>
  );
}
// ×4 배속 이용권 구매 창
function BoostSheet({ save, onClose, onBuy }) {
  const left = E.boostLeftMs(save);
  const c = E.boostCost(save);
  return (
    <BottomSheet title="⏩ ×4 배속 이용권" onClose={onClose} maxHeight="55%">
      <div className="text-center" style={{ fontSize: 12.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
        기본 배속은 ×1 · ×2. 이용권이 있는 동안 전투를 ×4로 볼 수 있다.<br />
        {BOOST.minutes}분 = 🪙 {c.toLocaleString()} (레벨에 따라 가격 상승) · 최대 {BOOST.maxStackMin / 60}시간까지 쌓인다 · 모든 캐릭터 공유
      </div>
      <div className="text-center mt-3 font-semibold" style={{ fontSize: 15, color: left ? PALETTE.legendary : PALETTE.textDim }}>
        {left ? `남은 시간 ${Math.ceil(left / 60000)}분` : '이용권 없음'}
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <UIButton variant="gold" disabled={save.gold < c} onClick={onBuy}>{BOOST.minutes}분 구매 — 🪙 {c.toLocaleString()} (보유 {save.gold.toLocaleString()})</UIButton>
        <UIButton variant="ghost" style={{ height: 40 }} onClick={onClose}>닫기</UIButton>
      </div>
    </BottomSheet>
  );
}

// ===== 메인 =====
export default function ChronicleGame({ onExit }) {
  const [acc, setAcc] = useState(loadAccount);
  const save = useMemo(() => A.toView(acc), [acc]);
  const [view, setView] = useState('title');
  const [battle, setBattle] = useState(null);
  const [repeat, setRepeat] = useState(false);
  const [toast, setToast] = useState(null);
  const [scene, setScene] = useState(null); // { scene, replay, after }
  const lastFieldRef = useRef(null);
  const rng = Math.random;
  // 반복 사냥 보고서 (1.213.0)
  const repStatsRef = useRef(null);
  const lastRecRef = useRef(null);
  const [report, setReport] = useState(null);
  const [boostSheet, setBoostSheet] = useState(false);
  // 던전 연속 도전 (1.215.1) — 설정은 기억, 던전 한 판의 전투 기록은 dungRunRef에 누적
  const [dungeonAuto, setDungeonAuto] = useState(() => { try { return localStorage.getItem('chronicleDungeonAuto') === '1'; } catch { return false; } });
  const toggleDungeonAuto = () => { const v = !dungeonAuto; setDungeonAuto(v); try { localStorage.setItem('chronicleDungeonAuto', v ? '1' : '0'); } catch { /* */ } };
  const dungRunRef = useRef(null);
  const toggleRepeat = () => {
    if (!repeat) { repStatsRef.current = newHuntStats(); if (lastRecRef.current) addHuntRecord(repStatsRef.current, lastRecRef.current); }
    setRepeat(r => !r);
  };
  useEffect(() => {
    if (repeat || !repStatsRef.current) return;
    const st = repStatsRef.current;
    repStatsRef.current = null;
    if (st.battles > 1) setReport({ ...st, endedAt: Date.now() });
  }, [repeat]);

  useEffect(() => { writeAccount(acc); }, [acc]);
  // 🗝 날짜가 바뀌면 열쇠 충전 (화면 이동 때마다 확인)
  useEffect(() => {
    if (!save) return;
    const next = E.refreshDungeonKeys(save);
    if (next !== save) setAcc(a => A.fromView(a, next));
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const setSave = (next) => setAcc(a => A.fromView(a, next));
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(t => (t === msg ? null : t)), 1600); };

  // 이야기 — 조건에 맞는 장면이 있으면 띄우고 true
  const playScene = (ctx, after = null) => {
    if (!save || scene) return false;
    const sc = Q.nextScene(save, ctx);
    if (!sc) return false;
    setScene({ scene: sc, after });
    return true;
  };
  const endScene = () => {
    const cur = scene;
    setScene(null);
    if (!cur) return;
    if (!cur.replay) setSave(Q.markSceneSeen(save, cur.scene));
    if (cur.after) cur.after();
  };
  // 마을에 있을 때 밀린 장면 (서장 · 보스 처치 후 · 동료 합류 · 던전 개방 · 종장)
  useEffect(() => {
    if (view === 'town' && save && !scene && !battle) playScene({ at: 'town' });
  }, [view, save, scene, battle]); // eslint-disable-line react-hooks/exhaustive-deps

  // 전투 시작: 끝까지 계산 → 저장 반영 → 재생
  // mode: 'hunt' | 'gate' | 'boss' · stage: 스테이지 번호
  const fightField = (field, mode = 'hunt', stage = 0) => {
    const boss = mode === 'boss';
    if (boss && E.bossAttemptsLeft(save, field.id) <= 0) { flash('오늘 보스 재도전 횟수를 모두 썼습니다'); return; }
    if (boss && playScene({ at: 'bossPre', fieldId: field.id }, () => flash('준비되면 「보스 도전」을 누르세요'))) return; // 보스 앞 장면 먼저 (저장 반영 후 다시 도전)
    if (mode === 'hunt') lastFieldRef.current = { field, stage };
    const enc = mode === 'gate' ? E.rollGateEncounter(field, stage, rng) : E.rollFieldEncounter(field, rng, boss, null, boss ? null : stage);
    const party = E.partyCombatants(save);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'field', fieldId: field.id, type: enc.type, enemies: enc.enemies, stage: boss ? null : stage, label: boss ? `${field.name} 보스` : mode === 'gate' ? `${field.name} ${stage + 1} 관문` : `${field.name} ${stage + 1}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    if (mode === 'hunt' && !E.gateReady(save, field.id, stage) && E.gateReady(r.save, field.id, stage)) r.summary.gateOpen = true;
    setSave(r.save);
    const rec = huntRecord(sim, party, enc, r.summary);
    lastRecRef.current = rec;
    if (repStatsRef.current) addHuntRecord(repStatsRef.current, rec);
    if (mode !== 'hunt' || sim.result !== 'win' || r.summary.questsDone.length) setRepeat(false);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, key: Date.now() });
    setView('battle');
  };
  const fightDungeon = () => {
    const d = save.dungeon;
    if (!d) return;
    const enc = E.dungeonEncounter(d, rng);
    const party = E.partyCombatants(save, d.hp);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'dungeon', type: enc.type, enemies: enc.enemies, label: `${dungeonDef(d.id).name}(${DUNGEON_TIERS[d.tier || 0].label}) ${dungeonDef(d.id).floors[d.floor].boss ? '보스' : `${d.floor + 1}층`}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    setSave(r.save);
    if (!dungRunRef.current) dungRunRef.current = newHuntStats();
    addHuntRecord(dungRunRef.current, huntRecord(sim, party, enc, r.summary));
    let runReport = null;
    if (sim.result !== 'win' || r.summary.dungeonClear) {
      if (dungRunRef.current.battles > 1) runReport = { ...dungRunRef.current, endedAt: Date.now() };
      dungRunRef.current = null;
    }
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, runReport, key: Date.now() });
    setView('battle');
  };

  const fightTower = () => {
    if (!save.tower?.run) return;
    const enc = E.towerEncounter(save, rng);
    const party = E.partyCombatants(save, save.tower.run.hp);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'tower', type: enc.type, enemies: enc.enemies, label: `황혼의 첨탑 ${enc.floor}층${E.isTowerBoss(enc.floor) ? ' 보스' : ''}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    setSave(r.save);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, key: Date.now() });
    setView('battle');
  };
  const afterBattle = () => {
    const ctx = battle?.ctx;
    setBattle(null);
    if (ctx?.kind === 'dungeon') setView(save.dungeon ? 'dungeon' : 'town');
    else if (ctx?.kind === 'tower') setView('tower');
    else setView(battle?.sim.result === 'win' ? 'field' : 'town');
  };

  let content;
  if (!save || view === 'title') {
    content = (
      <TitleView acc={acc} onExit={onExit}
        onSelect={(cid) => { setRepeat(false); setAcc(a => A.selectCharacter(a, cid)); setView('town'); }}
        onCreate={(cid) => { setRepeat(false); setAcc(a => A.createCharacter(a, cid)); setView('town'); }} />
    );
  } else if (view === 'battle' && battle) {
    content = (
      <BattleView key={battle.key} battle={battle} save={save} onDone={afterBattle}
        repeat={repeat} onToggleRepeat={toggleRepeat}
        onAgain={() => (battle.ctx.kind === 'dungeon' ? fightDungeon() : lastFieldRef.current && fightField(lastFieldRef.current.field, 'hunt', lastFieldRef.current.stage))}
        dungeonAuto={dungeonAuto} onToggleDungeonAuto={toggleDungeonAuto}
        boostLeft={E.boostLeftMs(save)} onAskBoost={() => setBoostSheet(true)} />
    );
  } else if (view === 'field') {
    content = <FieldView save={save} onBack={() => { setRepeat(false); setView('town'); }} onFight={fightField} playScene={playScene} sceneOpen={!!scene} />;
  } else if (view === 'quests') {
    content = <QuestView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onReplay={(sc) => setScene({ scene: sc, replay: true })} />;
  } else if (view === 'dungeon') {
    content = (
      <DungeonView save={save} onBack={() => setView('town')}
        onEnter={(id, tier) => { dungRunRef.current = null; setSave(E.startDungeon(save, id, tier)); }}
        dungeonAuto={dungeonAuto} onToggleDungeonAuto={toggleDungeonAuto}
        onBuyKey={() => { setSave(E.buyDungeonKey(save)); flash('🗝 던전 열쇠 +1'); }}
        onFight={fightDungeon}
        onLeave={() => { dungRunRef.current = null; setSave(E.leaveDungeon(save)); setView('town'); }} />
    );
  } else if (view === 'party') {
    content = <PartyView save={save} setSave={setSave} onBack={() => setView('town')} />;
  } else if (view === 'bag') {
    content = <BagView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else if (view === 'tower') {
    content = <TowerView save={save} setSave={setSave} onBack={() => setView('town')} onFight={fightTower} flash={flash} />;
  } else if (view === 'fam') {
    content = <FamiliarView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else if (view === 'stash') {
    content = <StashView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else if (view === 'forge') {
    content = <ForgeView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else {
    content = <TownView save={save} go={(v) => setView(v === 'dungeon' && save.dungeon ? 'dungeon' : v)} onExit={onExit} onSwitchChar={() => setView('title')} />;
  }

  return (
    <div className="absolute inset-0" style={{ background: PALETTE.bg, fontFamily: '"Noto Serif KR", serif', color: PALETTE.text }}>
      <div key={view} className="ui-screen-enter absolute inset-0">{content}</div>
      {report && <HuntReport report={report} save={save} onClose={() => setReport(null)} />}
      {boostSheet && save && <BoostSheet save={save} onClose={() => setBoostSheet(false)} onBuy={() => { const n = E.buyBoost(save); if (n === save) { flash(save.gold < E.boostCost(save) ? '골드가 부족합니다' : `최대 ${BOOST.maxStackMin / 60}시간까지 쌓을 수 있습니다`); return; } setSave(n); flash(`⏩ ×4 배속 +${BOOST.minutes}분`); }} />}
      {acc.giftNotice && view === 'title' && <GiftNotice acc={acc} onClose={() => setAcc(a => ({ ...a, giftNotice: false }))} />}
      {scene && <SceneView key={scene.scene.id} save={save} scene={scene.scene} onEnd={endScene} />}
      {toast && (
        <div className="absolute left-1/2 z-50 pointer-events-none" style={{ bottom: 90, transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 999, background: '#000d', border: '1px solid var(--ui-line-strong)', color: PALETTE.legendary, fontSize: 12.5, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  );
}
