// ============================================
// arcana/ArcanaGame.jsx — 트와일라잇 아르카나 화면 (덱빌딩 로그라이크)
// ============================================
// 로직은 전부 engine.js 순수 함수 — 이 파일은 그리기와 저장만 한다.
// 저장: localStorage ARCANA_SAVE_KEY (본편 IndexedDB derod_meta와 완전 분리)
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Layers, Heart, Coins } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../components/ui/CommonUI.jsx';
import {
  ARCANA_TITLE, ARCANA_SUB, ARCANA_SAVE_KEY, ARCANA_CLASSES, ARCANA_CARDS, ARCANA_RELICS, ARCANA_ACTS,
  ARCANA_KEYWORDS, ARCANA_TUNING, RARITY_META, TYPE_META, arcanaClass, cardDef, describeCard, enemyArt,
} from './data.js';
import * as E from './engine.js';
import { useGameCloudSync } from '../cloud/useGameCloudSync.js';

// ===== 저장 =====
const EMPTY_SAVE = { run: null, records: { runs: 0, wins: 0, bestAct: 0, byClass: {} } };
function loadSave() {
  try {
    const raw = localStorage.getItem(ARCANA_SAVE_KEY);
    if (!raw) return EMPTY_SAVE;
    const s = JSON.parse(raw);
    return { ...EMPTY_SAVE, ...s, records: { ...EMPTY_SAVE.records, ...(s.records || {}) } };
  } catch { return EMPTY_SAVE; }
}
// 클라우드 저장 (1.237.2) — users/{uid}/arcana/save · 비교용 요약
const normalizeSave = (s) => ({ ...EMPTY_SAVE, ...s, records: { ...EMPTY_SAVE.records, ...(s?.records || {}) } });
const validArcanaSave = (o) => !!o && typeof o === 'object' && !!o.records && typeof o.records.runs === 'number';
const arcanaSummary = (s) => ({ runs: s.records?.runs || 0, wins: s.records?.wins || 0, bestAct: s.records?.bestAct || 0, inRun: s.run && !['victory', 'defeat'].includes(s.run.phase) ? `${s.run.classId}·${s.run.act}막 ${s.run.floor + 1}층` : null });
const compareArcana = (l, c) => ({
  same: l.runs === c.runs && l.wins === c.wins && l.bestAct === c.bestAct && (l.inRun || null) === (c.inRun || null),
  cloudAhead: c.runs > l.runs || (c.runs === l.runs && !!c.inRun && !l.inRun),
});
const sumText = (m) => `원정 ${m.runs} · 승리 ${m.wins} · 최고 ${m.bestAct}막${m.inRun ? ` · 진행 중 ${m.inRun}` : ''}`;
const whenText = (ms) => { if (!ms) return '알 수 없음'; const d = new Date(ms); const p = (n) => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

function writeSave(s) {
  try { localStorage.setItem(ARCANA_SAVE_KEY, JSON.stringify(s)); } catch { /* 저장 불가 환경 — 진행은 계속 */ }
}

const FONT_TITLE = '"Cinzel", "Noto Serif KR", serif';

// ===== 카드 =====
function CardFace({ inst, size = 'md', dim = false, selected = false, onClick, price, sold }) {
  const card = cardDef(inst.id, inst.up);
  if (!card) return null;
  const cls = card.cls === 'neutral' ? null : arcanaClass(card.cls);
  const type = TYPE_META[card.type];
  const rar = RARITY_META[card.rarity];
  const sm = size === 'sm';
  const w = sm ? 70 : 104;
  const h = sm ? 100 : 150;
  const art = cls ? (card.type === 'attack' ? cls.combatImage : cls.image) : null;
  return (
    <button
      onClick={onClick}
      disabled={sold}
      className="ui-press relative flex-none flex flex-col overflow-hidden text-left"
      style={{
        width: w, height: h, borderRadius: 10,
        background: '#140b0f',
        border: `1.5px solid ${selected ? PALETTE.legendary : rar.color + '99'}`,
        boxShadow: selected ? `0 0 0 2px ${PALETTE.legendary}55, 0 10px 24px -8px #000` : '0 6px 16px -8px #000',
        opacity: sold ? 0.3 : dim ? 0.5 : 1,
        transform: selected ? 'translateY(-14px)' : 'none',
        transition: 'transform .16s ease, box-shadow .16s ease',
      }}
    >
      <div className="relative flex-none" style={{ height: sm ? 46 : 70, background: art ? '#000' : `linear-gradient(150deg, ${type.color}55, #120a0d)` }}>
        {art && <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 25%', opacity: 0.85 }} draggable={false} />}
        {!art && <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: sm ? 20 : 28, color: type.color }}>{type.icon}</div>}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, #140b0f 100%)' }} />
        <div className="absolute flex items-center justify-center font-bold" style={{
          top: 3, left: 3, width: sm ? 20 : 24, height: sm ? 20 : 24, borderRadius: 999,
          background: 'radial-gradient(circle at 35% 30%, #f5d48a, #b5781f)', color: '#2a1606',
          fontSize: sm ? 12 : 14, border: '1px solid #2a1606',
        }}>{card.cost}</div>
      </div>
      <div className="flex-1 flex flex-col px-1.5 pb-1 min-h-0">
        <div className="font-semibold truncate" style={{ fontSize: sm ? 11 : 12.5, color: card.upgraded ? PALETTE.green : PALETTE.text }}>{card.name}</div>
        <div style={{ fontSize: 10, color: type.color, letterSpacing: '0.05em' }}>{type.label}</div>
        {!sm && (
          <div className="mt-0.5 overflow-hidden" style={{ fontSize: 11, lineHeight: 1.3, color: PALETTE.textDim }}>{describeCard(card)}</div>
        )}
        {sm && <div className="mt-auto truncate" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{shortFx(card)}</div>}
      </div>
      {price != null && (
        <div className="absolute bottom-0 inset-x-0 text-center font-semibold" style={{ fontSize: 11.5, background: '#000a', color: PALETTE.legendary, padding: '2px 0' }}>
          {sold ? '판매됨' : `🪙 ${price}`}
        </div>
      )}
    </button>
  );
}
function shortFx(card) {
  const parts = [];
  for (const op of card.fx) {
    if (op.dmg != null) parts.push(`⚔${op.dmg}${op.hits > 1 ? '×' + op.hits : ''}`);
    else if (op.dmgBlock != null) parts.push('⚔방어');
    else if (op.dmgPoison != null) parts.push('⚔독');
    else if (op.block != null) parts.push(`🛡${op.block}`);
    else if (op.poison != null) parts.push(`☠${op.poison}`);
    else if (op.heal != null) parts.push(`♥${op.heal}`);
    else if (op.draw != null) parts.push(`+${op.draw}장`);
  }
  return parts.join(' ') || (card.type === 'power' ? '지속' : '');
}

// ===== 공통 상단 바 =====
function TopBar({ run, onDeck, onExit }) {
  const cls = arcanaClass(run.classId);
  const act = ARCANA_ACTS[run.act - 1];
  return (
    <div className="flex-none px-3 pt-2 pb-1.5" style={{ borderBottom: '1px solid var(--ui-line)' }}>
      <div className="flex items-center gap-2">
        <button onClick={onExit} aria-label="타이틀로" className="ui-press flex items-center justify-center flex-none" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.dawn }}>
          <ChevronLeft size={18} />
        </button>
        <img src={cls.image} alt="" className="flex-none object-cover" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${cls.color}` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
            <span className="flex items-center gap-0.5" style={{ color: '#e06a5f' }}><Heart size={13} fill="#e06a5f" /> {run.hp}/{run.maxHp}</span>
            <span className="flex items-center gap-0.5" style={{ color: PALETTE.legendary }}><Coins size={13} /> {run.gold}</span>
          </div>
          <div className="truncate" style={{ fontSize: 11, color: act.color }}>{run.act}막 · {act.name} · {run.floor + 1}/{ARCANA_TUNING.floorsPerAct}층</div>
        </div>
        <button onClick={onDeck} className="ui-press flex items-center gap-1 flex-none" style={{ height: 36, padding: '0 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.text, fontSize: 12 }}>
          <Layers size={14} /> {run.deck.length}
        </button>
      </div>
      {run.relics.length > 0 && <RelicStrip relics={run.relics} />}
    </div>
  );
}
function RelicStrip({ relics }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="flex gap-1 mt-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {relics.map(id => (
          <button key={id} onClick={() => setOpen(id)} className="ui-press flex-none flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,176,74,0.08)', border: '1px solid rgba(232,176,74,0.3)', fontSize: 15 }}>
            {ARCANA_RELICS[id]?.icon}
          </button>
        ))}
      </div>
      {open && (
        <BottomSheet title="유물" onClose={() => setOpen(null)} maxHeight="50%">
          <RelicRow id={open} />
          <div className="mt-4"><UIButton variant="ghost" onClick={() => setOpen(null)}>닫기</UIButton></div>
        </BottomSheet>
      )}
    </>
  );
}
function RelicRow({ id, onClick, price, sold }) {
  const r = ARCANA_RELICS[id];
  if (!r) return null;
  return (
    <button onClick={onClick} disabled={sold || !onClick} className="ui-press w-full flex items-center gap-3 text-left" style={{ padding: 10, borderRadius: 12, background: 'rgba(232,176,74,0.06)', border: '1px solid rgba(232,176,74,0.28)', opacity: sold ? 0.35 : 1 }}>
      <div className="flex-none flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, background: '#000', fontSize: 22 }}>{r.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.legendary }}>{r.name}</div>
        <div style={{ fontSize: 12, color: PALETTE.textDim }}>{r.desc}</div>
      </div>
      {price != null && <div className="flex-none font-semibold" style={{ fontSize: 13, color: PALETTE.legendary }}>{sold ? '판매됨' : `🪙 ${price}`}</div>}
    </button>
  );
}

// 덱 그리드 (보기·선택 공용)
function DeckGrid({ deck, onPick, filter }) {
  const list = filter ? deck.filter(filter) : deck;
  const sorted = list.slice().sort((a, b) => (ARCANA_CARDS[a.id].cost - ARCANA_CARDS[b.id].cost) || a.id.localeCompare(b.id));
  return (
    <div className="grid gap-2 justify-items-center" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
      {sorted.map(inst => <CardFace key={inst.uid} inst={inst} onClick={onPick ? () => onPick(inst) : undefined} />)}
      {sorted.length === 0 && <div className="col-span-3 text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>해당하는 카드가 없습니다</div>}
    </div>
  );
}

// ===== 전투 =====
function StatusChips({ s, enemy = false }) {
  const chips = [];
  if (s.str) chips.push({ t: `힘 ${s.str > 0 ? '+' : ''}${s.str}`, c: '#e06a5f' });
  if (s.dex) chips.push({ t: `민첩 +${s.dex}`, c: '#7ba3c4' });
  if (s.vuln) chips.push({ t: `취약 ${s.vuln}`, c: '#e8b04a' });
  if (s.weak) chips.push({ t: `약화 ${s.weak}`, c: '#b48ce0' });
  if (s.poison) chips.push({ t: `중독 ${s.poison}`, c: '#7a9a5e' });
  if (!enemy) {
    if (s.counter) chips.push({ t: `반격 ${s.counter}`, c: '#d4a574' });
    if (s.thorns) chips.push({ t: `가시 ${s.thorns}`, c: '#d4a574' });
    if (s.turnBlock) chips.push({ t: `턴 방어 ${s.turnBlock}`, c: '#7ba3c4' });
    if (s.turnStr) chips.push({ t: `턴 힘 +${s.turnStr}`, c: '#e06a5f' });
    if (s.turnPoison) chips.push({ t: `턴 중독 ${s.turnPoison}`, c: '#7a9a5e' });
    if (s.turnDmg) chips.push({ t: `턴 피해 ${s.turnDmg}`, c: '#e8b04a' });
    if (s.turnEnergy) chips.push({ t: `턴 에너지 +${s.turnEnergy}`, c: '#e8b04a' });
    if (s.turnDraw) chips.push({ t: `턴 카드 +${s.turnDraw}`, c: '#7ba3c4' });
    if (s.blockKeep) chips.push({ t: '방어 유지', c: '#7ba3c4' });
    if (s.undying) chips.push({ t: '불사', c: '#c4453d' });
  }
  if (enemy && s.raged) chips.push({ t: '격노', c: '#c4453d' });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((ch, i) => (
        <span key={i} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, color: ch.c, border: `1px solid ${ch.c}66`, background: `${ch.c}18` }}>{ch.t}</span>
      ))}
    </div>
  );
}
function HpBar({ hp, max, block, color }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className="relative" style={{ height: 14, borderRadius: 999, background: '#00000099', border: '1px solid #ffffff1a', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .3s ease' }} />
      <div className="absolute inset-0 flex items-center justify-center font-semibold" style={{ fontSize: 10.5, color: '#fff', textShadow: '0 1px 2px #000' }}>
        {hp} / {max}{block > 0 ? `  ·  🛡 ${block}` : ''}
      </div>
    </div>
  );
}

function CombatView({ run, onRun, rng }) {
  const c = run.combat;
  const e = c.enemy;
  const [sel, setSel] = useState(null);
  const [floats, setFloats] = useState([]);
  const [shake, setShake] = useState(null);
  const seq = useRef(0);
  const cls = arcanaClass(run.classId);

  // 마지막 행동의 사건 → 떠오르는 숫자
  const pushFloats = (events) => {
    const out = [];
    for (const ev of events || []) {
      if (ev.t === 'enemyHit' && ev.raw > 0) out.push({ side: 'enemy', text: ev.n > 0 ? `-${ev.n}` : '막힘', color: ev.n > 0 ? '#ffb1a8' : '#9cc4e4' });
      if (ev.t === 'poison') out.push({ side: 'enemy', text: `☠ -${ev.n}`, color: '#a7cf86' });
      if (ev.t === 'playerHit') out.push({ side: 'player', text: ev.n > 0 ? `-${ev.n}` : '방어', color: ev.n > 0 ? '#ff8a80' : '#9cc4e4' });
      if (ev.t === 'counter') out.push({ side: 'enemy', text: `반격 ${ev.n}`, color: '#e8c48a' });
      if (ev.t === 'rage') out.push({ side: 'enemy', text: '격노!', color: '#ff6b5e' });
      if (ev.t === 'enemyStr') out.push({ side: 'enemy', text: '힘 +1', color: '#ff9e80' });
      if (ev.t === 'undying') out.push({ side: 'player', text: '불사!', color: '#ffd27a' });
    }
    if (!out.length) return;
    const stamped = out.map((f, i) => ({ ...f, id: ++seq.current, delay: i * 90 }));
    setFloats(prev => [...prev, ...stamped]);
    if (out.some(f => f.side === 'enemy' && f.text.startsWith('-'))) setShake('enemy');
    else if (out.some(f => f.side === 'player' && f.text.startsWith('-'))) setShake('player');
    setTimeout(() => setShake(null), 280);
    setTimeout(() => setFloats(prev => prev.filter(f => !stamped.some(s => s.id === f.id))), 1100);
  };

  const commit = (next) => {
    const evs = next.combat?.events || [];
    onRun(next);
    if (next.phase === 'combat') pushFloats(evs);
  };

  const play = (uid) => {
    if (!E.canPlay(run, uid)) return;
    setSel(null);
    commit(E.playCard(run, uid, rng));
  };
  const endTurn = () => { setSel(null); commit(E.endTurn(run, rng)); };

  const selCard = sel != null && c.hand.includes(sel) ? E.deckCard(run, sel) : null;
  const intentDmg = E.intentDamage(run);
  const it = e.intent;
  const overlap = c.hand.length > 5 ? -Math.min(30, (c.hand.length - 5) * 9) : 4;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 적 */}
      <div className="relative flex-none" style={{ aspectRatio: '16 / 11', maxHeight: '42%' }}>
        <img src={enemyArt(e.key)} alt="" className={`absolute inset-0 w-full h-full object-cover ${shake === 'enemy' ? 'arc-shake' : ''}`} draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a060833 0%, transparent 35%, #0a0608 100%)' }} />
        <div className="absolute top-2 right-2 flex items-center gap-1.5" style={{
          padding: '5px 10px', borderRadius: 12, background: '#000000b0',
          border: `1px solid ${it.type === 'attack' ? (it.heavy ? '#ff6b5e' : '#c4453d') : '#7ba3c4'}`,
        }}>
          <span style={{ fontSize: 15 }}>{it.type === 'attack' ? (it.heavy ? '💢' : '⚔') : '🛡'}</span>
          <span className="font-bold" style={{ fontSize: 15, color: it.type === 'attack' ? '#ff8a80' : '#9cc4e4' }}>{it.type === 'attack' ? intentDmg : it.block}</span>
          <span style={{ fontSize: 11, color: PALETTE.textDim }}>{it.name}</span>
        </div>
        <div className="absolute bottom-1.5 inset-x-3">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold" style={{ fontSize: 14, color: PALETTE.text, textShadow: '0 1px 3px #000' }}>{e.name}</span>
            <span style={{ fontSize: 11, color: e.tier === 'boss' ? '#ff8a80' : e.tier === 'elite' ? PALETTE.legendary : PALETTE.textDim }}>{e.tier === 'boss' ? '막 보스' : e.tier === 'elite' ? '강적' : '일반'} · {c.turn}턴</span>
          </div>
          <HpBar hp={e.hp} max={e.maxHp} block={e.block} color="linear-gradient(90deg, #8b1f1f, #c4453d)" />
          <div className="mt-1"><StatusChips s={e} enemy /></div>
        </div>
        {floats.filter(f => f.side === 'enemy').map((f, i) => (
          <div key={f.id} className="arc-float absolute font-bold pointer-events-none" style={{ left: `${42 + (i % 3) * 8}%`, top: '38%', fontSize: 22, color: f.color, textShadow: '0 2px 6px #000', animationDelay: `${f.delay}ms` }}>{f.text}</div>
        ))}
      </div>

      {/* 플레이어 */}
      <div className={`relative flex-none px-3 pt-2 ${shake === 'player' ? 'arc-shake' : ''}`}>
        <div className="flex items-center gap-2.5">
          <img src={cls.combatImage} alt="" className="flex-none object-cover" style={{ width: 58, height: 58, borderRadius: 14, border: `1px solid ${cls.color}`, objectPosition: '50% 25%' }} draggable={false} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 12.5, color: cls.color === '#d4a574' ? PALETTE.dawn : PALETTE.text }}>{cls.name}</span>
              {c.p.block > 0 && <span className="font-semibold" style={{ fontSize: 12.5, color: '#9cc4e4' }}>🛡 방어 {c.p.block}</span>}
            </div>
            <HpBar hp={run.hp} max={run.maxHp} block={0} color="linear-gradient(90deg, #6b1a16, #e06a5f)" />
            <div className="mt-1"><StatusChips s={c.p} /></div>
          </div>
        </div>
        {floats.filter(f => f.side === 'player').map((f) => (
          <div key={f.id} className="arc-float absolute font-bold pointer-events-none" style={{ left: '50%', top: -6, fontSize: 20, color: f.color, textShadow: '0 2px 6px #000', animationDelay: `${f.delay}ms` }}>{f.text}</div>
        ))}
      </div>

      {/* 선택한 카드 설명 */}
      <div className="flex-1 min-h-0 px-3 pt-2 flex flex-col justify-end">
        {selCard ? (
          <GlassPanel className="p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ fontSize: 14, color: selCard.upgraded ? PALETTE.green : PALETTE.text }}>{selCard.name}</span>
              <span style={{ fontSize: 11, color: TYPE_META[selCard.type].color }}>{TYPE_META[selCard.type].label} · 비용 {selCard.cost}</span>
            </div>
            <div className="mt-1" style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.45 }}>{describeCard(selCard)}</div>
            <div className="flex gap-2 mt-2.5">
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>취소</UIButton>
              <UIButton disabled={!E.canPlay(run, sel)} style={{ height: 40 }} onClick={() => play(sel)}>
                {selCard.cost > c.p.energy ? '에너지 부족' : '사용'}
              </UIButton>
            </div>
          </GlassPanel>
        ) : (
          <div className="text-center pb-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>
            카드를 눌러 확인 · 한 번 더 누르면 사용
          </div>
        )}
      </div>

      {/* 손패 */}
      <div className="flex-none flex justify-center items-end px-2 pt-4 pb-1" style={{ minHeight: 124 }}>
        {c.hand.map((uid, i) => {
          const inst = run.deck.find(d => d.uid === uid);
          if (!inst) return null;
          return (
            <div key={uid} style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: sel === uid ? 20 : i }}>
              <CardFace inst={inst} size="sm" selected={sel === uid} dim={!E.canPlay(run, uid)}
                onClick={() => (sel === uid ? play(uid) : setSel(uid))} />
            </div>
          );
        })}
      </div>

      {/* 하단 */}
      <div className="flex-none flex items-center gap-2 px-3 pb-3 pt-1">
        <div className="relative flex-none flex items-center justify-center font-bold" style={{
          width: 48, height: 48, borderRadius: 999,
          background: 'radial-gradient(circle at 35% 30%, #ffe1a1, #c0801f 60%, #6b3f0b)',
          color: '#2a1606', fontSize: 19, border: '2px solid #2a1606', boxShadow: '0 0 16px #e8b04a55',
        }} aria-label="에너지">
          {c.p.energy}
          <span className="absolute" style={{ bottom: -6, fontSize: 9.5, color: PALETTE.legendary, background: '#000c', borderRadius: 6, padding: '0 4px' }}>에너지</span>
        </div>
        <div className="flex-none text-center" style={{ fontSize: 11, color: PALETTE.textDim, width: 50 }}>뽑을 카드<br /><b style={{ color: PALETTE.text, fontSize: 13 }}>{c.draw.length}</b></div>
        <div className="flex-none text-center" style={{ fontSize: 11, color: PALETTE.textDim, width: 50 }}>버린 카드<br /><b style={{ color: PALETTE.text, fontSize: 13 }}>{c.discard.length}</b></div>
        <UIButton onClick={endTurn} style={{ height: 46 }}>턴 종료</UIButton>
      </div>
    </div>
  );
}

// ===== 맵 =====
function MapView({ run, onRun, rng }) {
  const act = ARCANA_ACTS[run.act - 1];
  const rows = run.map.map((nodes, f) => ({ nodes, f })).reverse();
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="text-center mb-3">
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: act.color }}>ACT {run.act}</div>
        <div className="font-semibold" style={{ fontSize: 18, color: PALETTE.text }}>{act.name}</div>
        <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>층마다 갈 곳을 하나 고른다 · 위쪽 끝에 막 보스</div>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ nodes, f }) => {
          const cur = f === run.floor;
          const past = f < run.floor;
          return (
            <div key={f} className="flex items-center gap-2" style={{ opacity: past ? 0.3 : 1 }}>
              <div className="flex-none text-right" style={{ width: 26, fontSize: 11, color: cur ? PALETTE.legendary : PALETTE.textDim }}>{f + 1}층</div>
              <div className="flex-1 flex gap-2">
                {nodes.map((n, i) => {
                  const m = E.NODE_META[n];
                  return (
                    <button key={i} disabled={!cur} onClick={() => onRun(E.chooseNode(run, i, rng))}
                      className={`ui-press flex-1 flex items-center gap-2 ${cur ? 'arc-pulse' : ''}`}
                      style={{
                        height: cur ? 58 : 40, padding: '0 10px', borderRadius: 12, textAlign: 'left',
                        background: cur ? `${m.color}22` : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${cur ? m.color : 'var(--ui-line)'}`,
                      }}>
                      <span style={{ fontSize: cur ? 20 : 15, color: m.color, width: 22, textAlign: 'center' }}>{m.icon}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold" style={{ fontSize: 13, color: cur ? PALETTE.text : PALETTE.textDim }}>{m.label}</span>
                        {cur && <span className="block truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{m.desc}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== 보상 =====
function RewardView({ run, onRun, rng }) {
  const r = run.reward;
  const taken = r.cardTaken;
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      <div className="text-center">
        <div className="font-semibold" style={{ fontSize: 18, color: PALETTE.legendary, fontFamily: FONT_TITLE }}>{r.title}</div>
        {r.goldGained > 0 && <div style={{ fontSize: 13, color: PALETTE.legendary }}>🪙 골드 +{r.goldGained}</div>}
      </div>
      {(r.relic || r.relicTaken) && (
        <div>
          <div style={{ fontSize: 12, color: PALETTE.textDim, marginBottom: 6 }}>유물</div>
          {r.relic ? <RelicRow id={r.relic} onClick={() => onRun(E.takeRewardRelic(run))} /> : <RelicRow id={r.relicTaken} sold />}
        </div>
      )}
      {r.cards.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: PALETTE.textDim, marginBottom: 6 }}>카드 1장을 덱에 넣는다</div>
          <div className="flex flex-wrap justify-center gap-2">
            {r.cards.map(id => <CardFace key={id} inst={{ id, up: false }} onClick={() => onRun(E.takeRewardCard(run, id))} />)}
          </div>
          <button onClick={() => onRun(E.takeRewardCard(run, null))} className="ui-press w-full mt-2" style={{ height: 38, fontSize: 12.5, color: PALETTE.textDim, background: 'transparent', border: '1px dashed var(--ui-line-strong)', borderRadius: 10 }}>
            카드 받지 않기
          </button>
        </div>
      )}
      {taken && taken !== 'skip' && (
        <div className="text-center" style={{ fontSize: 12.5, color: PALETTE.green }}>「{ARCANA_CARDS[taken]?.name}」 덱에 추가</div>
      )}
      <div className="mt-auto">
        <UIButton onClick={() => onRun(E.finishReward(run, rng))}>계속</UIButton>
      </div>
    </div>
  );
}

function BossRelicView({ run, onRun, rng }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      <div className="text-center">
        <div className="font-semibold" style={{ fontSize: 18, color: PALETTE.legendary, fontFamily: FONT_TITLE }}>보스의 유물</div>
        <div style={{ fontSize: 12, color: PALETTE.textDim }}>하나를 골라 다음 막으로 — 강력하지만 대가가 따른다</div>
      </div>
      {run.bossRelics.map(id => <RelicRow key={id} id={id} onClick={() => onRun(E.takeBossRelic(run, id, rng))} />)}
      <button onClick={() => onRun(E.takeBossRelic(run, null, rng))} className="ui-press mt-1" style={{ height: 40, fontSize: 12.5, color: PALETTE.textDim, background: 'transparent', border: '1px dashed var(--ui-line-strong)', borderRadius: 10 }}>받지 않기</button>
    </div>
  );
}

// ===== 야영 =====
function RestView({ run, onRun, rng }) {
  const [upgrading, setUpgrading] = useState(false);
  const noHeal = !!E.runFx(run).noRestHeal;
  const heal = Math.round(run.maxHp * ARCANA_TUNING.restHealPct);
  return (
    <div className="flex-1 flex flex-col justify-center px-5 gap-3">
      <div className="text-center mb-2">
        <div style={{ fontSize: 40 }}>🔥</div>
        <div className="font-semibold" style={{ fontSize: 18, color: PALETTE.text }}>야영</div>
        <div style={{ fontSize: 12, color: PALETTE.textDim }}>하나만 할 수 있다</div>
      </div>
      <UIButton variant="gold" disabled={noHeal} onClick={() => onRun(E.restHeal(run, rng))}>
        {noHeal ? '휴식 불가 (황혼의 심장)' : `휴식 — 체력 +${heal}`}
      </UIButton>
      <UIButton variant="ghost" onClick={() => setUpgrading(true)}>카드 강화 — 1장</UIButton>
      {upgrading && (
        <BottomSheet title="강화할 카드" onClose={() => setUpgrading(false)}>
          <DeckGrid deck={run.deck} filter={E.canUpgrade} onPick={(inst) => { setUpgrading(false); onRun(E.advance(E.upgradeCard(run, inst.uid), rng)); }} />
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 상점 =====
function ShopView({ run, onRun, rng }) {
  const [removing, setRemoving] = useState(false);
  const s = run.shop;
  const removePrice = E.shopRemovePrice(run);
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
      <div className="text-center">
        <div className="font-semibold" style={{ fontSize: 17, color: PALETTE.dawn }}>⚖ 황혼의 상점</div>
      </div>
      <div className="grid gap-2 justify-items-center" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {s.cards.map((it, i) => (
          <CardFace key={i} inst={{ id: it.id, up: false }} price={it.price} sold={it.sold} dim={!it.sold && run.gold < it.price}
            onClick={() => onRun(E.shopBuyCard(run, i))} />
        ))}
      </div>
      {s.relics.map((it, i) => (
        <RelicRow key={it.id} id={it.id} price={it.price} sold={it.sold} onClick={run.gold >= it.price ? () => onRun(E.shopBuyRelic(run, i)) : undefined} />
      ))}
      <UIButton variant="ghost" disabled={s.removed || run.gold < removePrice} onClick={() => setRemoving(true)}>
        {s.removed ? '카드 제거 (완료)' : `카드 제거 — 🪙 ${removePrice}`}
      </UIButton>
      <UIButton onClick={() => onRun(E.leaveShop(run, rng))}>떠나기</UIButton>
      {removing && (
        <BottomSheet title="덱에서 뺄 카드" onClose={() => setRemoving(false)}>
          <DeckGrid deck={run.deck} onPick={(inst) => { setRemoving(false); onRun(E.shopRemove(run, inst.uid)); }} />
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 사건 =====
function EventView({ run, onRun, rng }) {
  const ev = E.eventDef(run.event);
  if (!ev) return null;
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
      <div className="font-semibold text-center" style={{ fontSize: 18, color: '#c9a8f0' }}>{ev.title}</div>
      <GlassPanel className="p-4"><div style={{ fontSize: 13.5, lineHeight: 1.65, color: PALETTE.text }}>{ev.text}</div></GlassPanel>
      {ev.choices.map((ch, i) => {
        const locked = ch.needGold && run.gold < ch.needGold;
        return (
          <button key={i} disabled={locked} onClick={() => onRun(E.chooseEvent(run, i, rng))} className="ui-press text-left" style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(180,140,224,0.08)', border: '1px solid rgba(180,140,224,0.35)', opacity: locked ? 0.4 : 1 }}>
            <div className="font-semibold" style={{ fontSize: 14, color: PALETTE.text }}>› {ch.label}</div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>{ch.desc}{locked ? ' (골드 부족)' : ''}</div>
          </button>
        );
      })}
    </div>
  );
}

function PickView({ run, onRun, rng }) {
  const mode = run.pick.mode;
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="text-center mb-3">
        <div className="font-semibold" style={{ fontSize: 16, color: PALETTE.text }}>{run.pick.title}</div>
        <div style={{ fontSize: 12, color: PALETTE.textDim }}>{mode === 'upgrade' ? '강화할 카드를 고른다' : '덱에서 뺄 카드를 고른다'}</div>
      </div>
      <DeckGrid deck={run.deck} filter={mode === 'upgrade' ? E.canUpgrade : null} onPick={(inst) => onRun(E.resolvePick(run, inst.uid, rng))} />
    </div>
  );
}

// ===== 결과 =====
function ResultView({ run, onDone }) {
  const win = run.phase === 'victory';
  const cls = arcanaClass(run.classId);
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center gap-3 text-center">
      <img src={cls.image} alt="" className="object-cover" style={{ width: 120, height: 120, borderRadius: 18, border: `2px solid ${win ? PALETTE.legendary : '#555'}`, filter: win ? 'none' : 'grayscale(0.9)' }} />
      <div className="font-bold" style={{ fontSize: 22, color: win ? PALETTE.legendary : '#c9b6a0', fontFamily: FONT_TITLE }}>{win ? '황혼을 넘어서' : '여정의 끝'}</div>
      <div style={{ fontSize: 13, color: PALETTE.textDim }}>{win ? '네 막의 지배자를 모두 쓰러뜨렸다.' : `${run.act}막 ${run.floor + 1}층에서 쓰러졌다.`}</div>
      <GlassPanel className="w-full p-3">
        <table className="w-full" style={{ fontSize: 13, color: PALETTE.text }}>
          <tbody>
            {[
              ['도달', `${run.act}막 ${run.floor + 1}층`],
              ['처치', `${run.stats.kills} (강적 ${run.stats.elites} · 보스 ${run.stats.bosses})`],
              ['사용한 카드', run.stats.cardsPlayed],
              ['최대 한 방', run.stats.maxHit],
              ['덱 / 유물', `${run.deck.length}장 / ${run.relics.length}개`],
            ].map(([k, v]) => (
              <tr key={k}><td className="text-left py-1" style={{ color: PALETTE.textDim }}>{k}</td><td className="text-right py-1 font-semibold">{v}</td></tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
      <div className="w-full mt-2"><UIButton onClick={onDone}>타이틀로</UIButton></div>
    </div>
  );
}

// ===== 타이틀 · 직업 선택 =====
function TitleView({ save, onContinue, onNew, onExit, onGlossary, onCloud, cloudLine }) {
  const rec = save.records;
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_4/nakzelionShadow_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.45 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0608cc 0%, #0a060855 35%, #0a0608 78%)' }} />
      <div className="relative flex-1 flex flex-col px-6 pt-16 pb-6">
        <div className="text-center">
          <div style={{ fontSize: 11, letterSpacing: '0.45em', color: '#b48ce0' }}>{ARCANA_SUB.toUpperCase()}</div>
          <div className="font-bold mt-1" style={{ fontSize: 30, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: '0 4px 20px #000' }}>{ARCANA_TITLE}</div>
          <div className="mt-2" style={{ fontSize: 12.5, color: PALETTE.textDim }}>카드로 싸우는 덱빌딩 로그라이크 · 4막</div>
        </div>
        <div className="mt-auto flex flex-col gap-2.5 ui-stagger">
          {save.run && !['victory', 'defeat'].includes(save.run.phase) && (
            <UIButton onClick={onContinue}>이어하기 — {arcanaClass(save.run.classId).name} · {save.run.act}막 {save.run.floor + 1}층</UIButton>
          )}
          <UIButton variant={save.run ? 'ghost' : 'primary'} onClick={onNew}>새 원정</UIButton>
          <UIButton variant="ghost" onClick={onGlossary}>카드 용어</UIButton>
          <UIButton variant="ghost" onClick={onCloud}>☁ 클라우드 저장</UIButton>
          {cloudLine ? <div className="text-center" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{cloudLine}</div> : null}
          <div className="flex justify-between items-center mt-1 px-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>
            <button onClick={onExit} className="ui-press" style={{ background: 'transparent', border: 'none', color: PALETTE.dawn, padding: '8px 2px', fontSize: 12 }}>⇄ 게임 선택</button>
            <span>원정 {rec.runs} · 승리 {rec.wins} · 최고 {rec.bestAct || 0}막</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassSelectView({ records, onPick, onBack }) {
  const [sel, setSel] = useState(ARCANA_CLASSES[0].id);
  const cls = arcanaClass(sel);
  const sig = cardDef(cls.sig);
  const r = records.byClass?.[sel];
  const lvColor = { 쉬움: PALETTE.green, 보통: PALETTE.dawn, 어려움: '#e06a5f' };
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 flex-none" style={{ minHeight: 52 }}>
        <button onClick={onBack} aria-label="뒤로" className="ui-press flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.dawn }}><ChevronLeft size={20} /></button>
        <div className="font-semibold" style={{ fontSize: 16, color: PALETTE.text }}>직업 선택</div>
      </div>
      <div className="flex gap-2 px-3 flex-none overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {ARCANA_CLASSES.map(c => (
          <button key={c.id} onClick={() => setSel(c.id)} className="ui-press flex-none relative overflow-hidden" style={{ width: 62, height: 62, borderRadius: 14, border: `2px solid ${sel === c.id ? c.color : 'transparent'}`, opacity: sel === c.id ? 1 : 0.55 }}>
            <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-2">
        <div className="relative overflow-hidden" style={{ borderRadius: 18, aspectRatio: '16 / 10', border: `1px solid ${cls.color}88` }}>
          <img src={cls.combatImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0a0608 100%)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ fontSize: 19, color: PALETTE.text }}>{cls.name}</span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, color: lvColor[cls.level], border: `1px solid ${lvColor[cls.level]}77` }}>난이도 {cls.level}</span>
            </div>
            <div style={{ fontSize: 12.5, color: PALETTE.textDim }}>{cls.tagline}</div>
          </div>
        </div>
        <table className="w-full mt-3" style={{ fontSize: 12.5, color: PALETTE.text }}>
          <tbody>
            <tr><td className="py-1" style={{ color: PALETTE.textDim }}>시작 체력</td><td className="text-right font-semibold">{cls.hp}</td></tr>
            <tr><td className="py-1" style={{ color: PALETTE.textDim }}>시작 덱</td><td className="text-right">베기 5 · 방어 4 · {sig.name} 1</td></tr>
            <tr><td className="py-1" style={{ color: PALETTE.textDim }}>이 직업 기록</td><td className="text-right">{r ? `원정 ${r.runs} · 승리 ${r.wins} · 최고 ${r.bestAct}막` : '없음'}</td></tr>
          </tbody>
        </table>
        <div className="flex items-center gap-3 mt-2">
          <CardFace inst={{ id: cls.sig, up: false }} />
          <div style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.5 }}>
            <b style={{ color: PALETTE.text }}>대표 카드</b><br />{describeCard(sig)}
          </div>
        </div>
      </div>
      <div className="flex-none p-4"><UIButton onClick={() => onPick(sel)}>이 직업으로 출정</UIButton></div>
    </div>
  );
}

// ===== 메인 =====
export default function ArcanaGame({ onExit }) {
  const [save, setSave] = useState(loadSave);
  const [view, setView] = useState('title'); // title | classSelect | run
  const [deckOpen, setDeckOpen] = useState(false);
  const [glossary, setGlossary] = useState(false);
  const rng = Math.random;

  useEffect(() => { writeSave(save); }, [save]);
  // 클라우드 자동 저장 (1.237.2) — 본편과 같은 계정 · 확인 전에는 자동 업로드 안 함
  const sync = useGameCloudSync({
    slot: 'arcana', data: save, validate: validArcanaSave, summarize: arcanaSummary, compare: compareArcana,
    onLoad: (o) => { setSave(normalizeSave(o)); setView('title'); },
  });
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudMsg, setCloudMsg] = useState(null);
  const [cloudPick, setCloudPick] = useState(null); // 불러오기 확인 대기 {obj, savedAt}
  const cloudLine = !sync.user ? null : sync.state.error ? `⚠ ${sync.state.error}` : sync.state.busy ? '☁ 동기화 중…' : sync.state.lastUp ? `☁ 클라우드 저장됨 ${whenText(sync.state.lastUp)}` : null;

  const run = save.run;
  const setRun = (next) => {
    setSave(prev => {
      let records = prev.records;
      if (next && ['victory', 'defeat'].includes(next.phase) && !next.recorded) {
        const win = next.phase === 'victory';
        const reached = win ? 4 : next.act;
        const bc = records.byClass?.[next.classId] || { runs: 0, wins: 0, bestAct: 0 };
        records = {
          ...records,
          runs: records.runs + 1, wins: records.wins + (win ? 1 : 0), bestAct: Math.max(records.bestAct || 0, reached),
          byClass: { ...records.byClass, [next.classId]: { runs: bc.runs + 1, wins: bc.wins + (win ? 1 : 0), bestAct: Math.max(bc.bestAct, reached) } },
        };
        next = { ...next, recorded: true };
      }
      return { ...prev, run: next, records };
    });
  };

  const startRun = (classId) => {
    setRun(E.newArcanaRun(classId, rng));
    setView('run');
  };

  const body = (() => {
    if (view !== 'run' || !run) return null;
    const props = { run, onRun: setRun, rng };
    switch (run.phase) {
      case 'map': return <MapView {...props} />;
      case 'combat': return <CombatView {...props} />;
      case 'reward': return <RewardView {...props} />;
      case 'bossRelic': return <BossRelicView {...props} />;
      case 'rest': return <RestView {...props} />;
      case 'shop': return <ShopView {...props} />;
      case 'event': return <EventView {...props} />;
      case 'pick': return <PickView {...props} />;
      default: return null;
    }
  })();

  let content;
  if (view === 'classSelect') {
    content = <ClassSelectView records={save.records} onPick={startRun} onBack={() => setView('title')} />;
  } else if (view === 'run' && run && ['victory', 'defeat'].includes(run.phase)) {
    content = (
      <div className="absolute inset-0 flex flex-col">
        <ResultView run={run} onDone={() => { setSave(prev => ({ ...prev, run: null })); setView('title'); }} />
      </div>
    );
  } else if (view === 'run' && run) {
    content = (
      <div className="absolute inset-0 flex flex-col">
        <TopBar run={run} onDeck={() => setDeckOpen(true)} onExit={() => setView('title')} />
        <div key={`${run.phase}-${run.act}-${run.floor}`} className="ui-screen-enter flex-1 flex flex-col min-h-0">{body}</div>
      </div>
    );
  } else {
    content = (
      <TitleView save={save} onExit={onExit} onGlossary={() => setGlossary(true)} onCloud={() => { setCloudMsg(null); setCloudOpen(true); }} cloudLine={cloudLine}
        onContinue={() => setView('run')}
        onNew={() => setView('classSelect')} />
    );
  }

  return (
    <div className="absolute inset-0" style={{ background: PALETTE.bg, fontFamily: '"Noto Serif KR", serif', color: PALETTE.text }}>
      {content}
      {deckOpen && run && (
        <BottomSheet title={`덱 ${run.deck.length}장`} onClose={() => setDeckOpen(false)}>
          <DeckGrid deck={run.deck} />
          <div className="mt-4"><UIButton variant="ghost" onClick={() => setDeckOpen(false)}>닫기</UIButton></div>
        </BottomSheet>
      )}
      {sync.conflict && (
        <BottomSheet title="☁ 클라우드 저장 확인" onClose={() => {}}>
          <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>이 기기의 기록과 클라우드 저장이 다릅니다. 어느 쪽으로 이어갈까요? <b style={{ color: '#e06a5f' }}>고르지 않은 쪽은 덮어씌워집니다.</b></div>
          <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.7 }}>
            ☁ 클라우드{sync.conflict.savedAt ? ` (${whenText(sync.conflict.savedAt)})` : ''}: <b style={{ color: PALETTE.text }}>{sumText(sync.conflict.cloud)}</b><br />📱 이 기기: {sumText(sync.conflict.local)}
          </GlassPanel>
          <div className="flex flex-col gap-2 mt-3">
            <UIButton variant={sync.conflict.cloudAhead ? 'primary' : 'ghost'} onClick={sync.chooseCloud}>☁ 클라우드 저장으로 이어하기</UIButton>
            <UIButton variant={sync.conflict.cloudAhead ? 'ghost' : 'primary'} onClick={sync.chooseLocal}>📱 이 기기 기록 유지 (클라우드에 올리기)</UIButton>
          </div>
        </BottomSheet>
      )}
      {cloudOpen && (
        <BottomSheet title="☁ 클라우드 저장" onClose={() => setCloudOpen(false)}>
          {cloudPick ? (
            <>
              <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>지금 기록이 <b style={{ color: '#e06a5f' }}>클라우드 저장으로 바뀝니다</b>.</div>
              <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.7 }}>
                지금: {sumText(arcanaSummary(save))}<br />클라우드{cloudPick.savedAt ? ` (${whenText(cloudPick.savedAt)})` : ''}: <b style={{ color: PALETTE.text }}>{sumText(arcanaSummary(normalizeSave(cloudPick.obj)))}</b>
              </GlassPanel>
              <div className="flex gap-2 mt-3">
                <UIButton variant="ghost" onClick={() => setCloudPick(null)}>취소</UIButton>
                <UIButton onClick={() => { setSave(normalizeSave(cloudPick.obj)); setView('title'); setCloudPick(null); setCloudOpen(false); }}>클라우드로 바꾸기</UIButton>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>본편과 같은 구글(또는 게스트) 계정으로 저장합니다. 로그인돼 있으면 바뀐 내용이 있을 때 30초마다·앱을 내릴 때 자동 저장됩니다.</div>
              {!sync.user ? (
                <div className="mt-3"><UIButton onClick={sync.login}>구글 로그인</UIButton></div>
              ) : (
                <>
                  <div className="mt-2" style={{ fontSize: 12, color: PALETTE.textDim }}>{sync.user.isAnonymous ? '게스트 계정 (이 기기 전용)' : `${sync.user.displayName}${sync.user.email ? ` · ${sync.user.email}` : ''}`} · {sync.state.busy ? '동기화 중…' : sync.state.lastUp ? `마지막 저장 ${whenText(sync.state.lastUp)}` : '자동 저장 대기'}</div>
                  <div className="flex gap-2 mt-3">
                    <UIButton onClick={async () => { const r = await sync.upload(); setCloudMsg(r.ok ? '클라우드에 저장했습니다' : r.error); }}>⬆ 지금 올리기</UIButton>
                    <UIButton variant="ghost" onClick={async () => { const r = await sync.download(); if (!r) return; if (!r.ok) setCloudMsg(r.error); else if (!r.exists) setCloudMsg('클라우드에 저장된 기록이 없습니다'); else setCloudPick({ obj: r.obj, savedAt: r.savedAt }); }}>⬇ 불러오기</UIButton>
                  </div>
                </>
              )}
              {sync.state.error ? <div className="mt-2" style={{ fontSize: 12, color: '#e06a5f' }}>⚠ {sync.state.error}</div> : null}
              {cloudMsg ? <div className="mt-2" style={{ fontSize: 12, color: PALETTE.dawn }}>{cloudMsg}</div> : null}
              <div className="mt-4"><UIButton variant="ghost" onClick={() => setCloudOpen(false)}>닫기</UIButton></div>
            </>
          )}
        </BottomSheet>
      )}
      {glossary && (
        <BottomSheet title="카드 용어" onClose={() => setGlossary(false)}>
          <div className="flex flex-col gap-2">
            {ARCANA_KEYWORDS.map(k => (
              <div key={k.k} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <b style={{ color: PALETTE.dawn }}>{k.k}</b> <span style={{ color: PALETTE.textDim }}>— {k.d}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, lineHeight: 1.5, color: PALETTE.textDim }} className="mt-1">
              매 턴 에너지 {ARCANA_TUNING.energyPerTurn} · 카드 {ARCANA_TUNING.handSize}장. 적은 오래 싸울수록 힘이 오르고, 막 보스는 체력 절반에서 격노한다.
            </div>
          </div>
          <div className="mt-4"><UIButton variant="ghost" onClick={() => setGlossary(false)}>닫기</UIButton></div>
        </BottomSheet>
      )}
    </div>
  );
}
