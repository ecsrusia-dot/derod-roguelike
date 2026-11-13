// ============================================
// chronicle/screens/gear.jsx — 황혼 연대기 · 장비 카드·정보창·실전 효율·정렬
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useMemo, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { gradeIdx, SLOTS, FORGE, chronicleClass } from '../data.js';
import * as E from '../engine.js';
import * as GE from '../gearEval.js';
import { gradeOf, clsTag, BASE_STATS, BASE_LABEL, MS, MainSecHead, MainModal, MainCell } from './common.jsx';

// 장비 카드 — 성능 한눈에 (1.251.1 성장 정보 탭 → 1.252.0 공용 창고 공용)
// ===== 장비 실전 평가 (1.267.0) — PM 결정 「아이템 + 실전 시뮬 기준 · +7 강화 시로 비교」 =====
// 1단계: 후보마다 짧은 시뮬(24전) → 지금 착용 대비 효율 % / 2단계: 착용보다 좋은 상위 3개만 80전으로 승률·남은 HP 확인
// 화면을 막지 않도록 조금씩(setTimeout) 계산하고, 캐릭터 상태·사냥 기준이 같으면 결과를 재사용한다
// ⚠️ 결과는 저장 객체(save)별로 따로 둔다 — 계산 도중 저장이 바뀌면(사역마 경험치·보상 등) 기준과 후보가 다른 상태로 계산돼 같은 장비가 ▼로 보였다
const gearEvalStore = new WeakMap();

export function useGearEval(save, items) {
  const target = useMemo(() => GE.evalTarget(save), [save]); // 1.268.0 다음 관문·지역 보스 기준
  const hero = save.hero;
  if (!gearEvalStore.has(save)) gearEvalStore.set(save, new Map());
  const cache = gearEvalStore.get(save);
  const [, setTick] = useState(0);
  const itemsKey = items.map(i => `${i.uid}:${i.plus || 0}`).join(',');
  const fastKey = (it) => `${it.uid}:${it.plus || 0}|f`;
  const fullKey = (it) => `${it.uid}:${it.plus || 0}|F`;
  const baseKey = (sl, full, lv = 0) => `base|${sl}|${full ? 'F' : 'f'}|${lv}`;
  const cands = items.filter(it => GE.canEvalItem(save, hero, it));
  const lvOf = (it) => GE.evalLvOf(save, hero, it);
  const deltaOf = (it) => { const b = cache.get(baseKey(it.slot, false, lvOf(it))); const r = cache.get(fastKey(it)); return r && b ? GE.effDelta(r, b) : null; };
  useEffect(() => {
    if (!target) return undefined;
    let alive = true; let id = null;
    const step = () => {
      if (!alive) return;
      const jobs = [];
      for (const sk of [...new Set(cands.map(i => `${i.slot}|${lvOf(i)}`))]) { const [sl, lv] = sk.split('|'); jobs.push([baseKey(sl, false, +lv), () => GE.evalBaseline(save, hero, sl, target, undefined, +lv)]); }
      for (const it of cands) jobs.push([fastKey(it), () => GE.evalCandidate(save, hero, it, target)]);
      let todo = jobs.filter(([k]) => !cache.has(k));
      if (!todo.length) {
        const top = cands.map(it => [it, deltaOf(it)]).filter(([, d]) => d != null && d > 0).sort((x, y) => y[1] - x[1]).slice(0, GE.GEAR_EVAL.topN).map(([it]) => it);
        const full = [];
        for (const it of top) {
          full.push([baseKey(it.slot, true, lvOf(it)), () => GE.evalBaseline(save, hero, it.slot, target, GE.GEAR_EVAL.fullBattles, lvOf(it))]);
          full.push([fullKey(it), () => GE.evalCandidate(save, hero, it, target, GE.GEAR_EVAL.fullBattles)]);
        }
        todo = full.filter(([k]) => !cache.has(k));
        if (!todo.length) return;
      }
      for (const [k, run] of todo.slice(0, 2)) cache.set(k, run());
      setTick(t => t + 1);
      id = setTimeout(step, 0);
    };
    id = setTimeout(step, 60);
    return () => { alive = false; clearTimeout(id); };
  }, [save, itemsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const info = (it) => {
    if (!target) return { state: 'none' };
    if (!GE.canEvalItem(save, hero, it)) return { state: 'na' };
    const d = deltaOf(it);
    if (d == null) return { state: 'pending' };
    const fb = cache.get(baseKey(it.slot, true, lvOf(it))); const fr = cache.get(fullKey(it));
    return { state: 'ok', atLv: lvOf(it) || 0, delta: d, full: fr && fb ? { delta: GE.effDelta(fr, fb), win: fr.winRate, hp: fr.hpLeft, n: fr.battles } : null };
  };
  return { target, info };
}

export const SORT_LABEL = { power: '전투력', grade: '등급', level: '레벨', eff: '효율' };

export function effSort(items, ev) {
  const rank = (it) => { const i = ev.info(it); return i.state === 'ok' ? 3 : i.state === 'pending' ? 2 : 1; };
  const val = (it) => { const i = ev.info(it); return i.state === 'ok' ? (i.full ? i.full.delta : i.delta) : 0; };
  return items.slice().sort((a, b) => rank(b) - rank(a) || val(b) - val(a) || E.itemPower(b) - E.itemPower(a));
}

// 효율 칩 — 지금 착용 대비 (+7 기준 · 실전 시뮬)
function EvalChip({ info }) {
  if (!info || info.state === 'na' || info.state === 'none') return null;
  if (info.state === 'pending') return <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>효율 계산 중…</span>;
  const d = info.full ? info.full.delta : info.delta; const pct = Math.round(d * 1000) / 10;
  const c = pct >= 0.5 ? CMP_UP : pct <= -0.5 ? CMP_DN : PALETTE.textDim;
  return <b style={{ fontSize: 12.5, color: c }}>{info.atLv ? `Lv.${info.atLv} 시 ` : ''}효율 {pct >= 0.5 ? `▲${pct}%` : pct <= -0.5 ? `▼${Math.abs(pct)}%` : '= 비슷'}</b>;
}

// 1.267.1 PM 결정 「지금 기준 유지 + 설명」 — 각자 몇 강 기준으로 비교했는지 (+7 미만은 +7로 가정, 그 이상은 실제 단계)
export function EvalBasis({ it, cur }) {
  const tag = (x) => { const p = x.plus || 0; const e = GE.evalPlus(x); return e > p ? <><b style={{ color: MS.gold }}>+{e}</b><span>(+{p}→강화 가정)</span></> : <b style={{ color: PALETTE.text }}>+{e}</b>; };
  return cur ? <>이 장비 {tag(it)} vs 착용 {tag(cur)}</> : <>이 장비 {tag(it)} vs 빈 칸</>;
}

// 카드 아래 줄 — 착용 비교 + 실전 결과 + 바로 착용 (가방)
export function EvalFooter({ it, cur, info, canWear, needLv, onEquip }) {
  return <>
    <div className="flex-1 min-w-0" style={{ lineHeight: 1.45 }}>
      <div className="truncate" style={{ color: PALETTE.textDim }}>{cur ? <>vs 착용 「{E.itemName(cur)}{cur.plus ? ` +${cur.plus}` : ''}」</> : '빈 칸에 장착'}</div>
      <div style={{ fontSize: 11, color: PALETTE.textDim }}>효율 비교 = <EvalBasis it={it} cur={cur} /></div>
      {info?.full && <div style={{ fontSize: 11, color: PALETTE.text }}>실전 {info.full.n}전 · 승률 <b>{Math.round(info.full.win * 100)}%</b> · 남은 HP <b>{Math.round(info.full.hp * 100)}%</b></div>}
    </div>
    {canWear
      ? <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onEquip(); }} className="ui-press flex-none" style={{ padding: '4px 14px', fontWeight: 800, fontSize: 12.5, border: `1px solid ${MS.gold}`, color: MS.gold }}>착용</span>
      : <span className="flex-none" style={{ fontSize: 11.5, color: CMP_DN }}>Lv.{needLv} 필요</span>}
  </>;
}

export function MainGearCard({ it, onClick, note, dim = false, footer = null, tag = null, picked = null, cmp, evalInfo = null, syncLv = 0 }) {
  const sl = SLOTS.find(x => x.id === it.slot);
  // 1.267.0 비교 모드(cmp !== undefined) — 양쪽 모두 +7 기준 능력치로 줄마다 ▲▼
  const cmpMode = cmp !== undefined;
  const itE = cmpMode ? GE.asEvalItem(it) : it;
  const g = gradeOf(it.grade); const st = E.itemStats(itE, cmpMode ? 0 : syncLv); const ud = E.uniqueDef(it); const eo = E.epicOptOf(it);
  const cst = cmpMode && cmp ? E.itemStats(GE.asEvalItem(cmp)) : {};
  const fmtD = (k, d) => (BASE_STATS.includes(k) ? Math.round(Math.abs(d)).toLocaleString() : /%/.test(E.statLabel(k, 0.1)) ? `${Math.round(Math.abs(d) * 1000) / 10}` : `${Math.round(Math.abs(d) * 10) / 10}`);
  const lbl = (k, v) => { if (BASE_STATS.includes(k)) return { l: BASE_LABEL[k] === '공격' ? '공격력' : BASE_LABEL[k], v: Math.round(v).toLocaleString(), base: true }; const t = E.statLabel(k, v); const m = t.match(/^(.*?)\s*([+-]?[\d.]+.*)$/); return { l: m ? m[1] : t, v: m ? m[2] : '' }; };
  const rows = Object.keys(st).filter(k => st[k]).sort((x, y) => (BASE_STATS.indexOf(x) + 1 || 99) - (BASE_STATS.indexOf(y) + 1 || 99)).map(k => {
    const r = { k, ...lbl(k, st[k]) };
    if (cmpMode && cmp) { const d = st[k] - (cst[k] || 0); r.d = !cst[k] ? { t: '새 옵션', c: CMP_UP } : Math.abs(d) < 1e-6 ? null : { t: `${d > 0 ? '▲' : '▼'}${fmtD(k, d)}`, c: d > 0 ? CMP_UP : CMP_DN }; }
    return r;
  });
  if (cmpMode && cmp) for (const k of Object.keys(cst)) if (cst[k] && !st[k]) rows.push({ k, ...lbl(k, cst[k]), gone: true, d: { t: '▼ 사라짐', c: CMP_DN } });
  return (
    <button onClick={onClick} className="ui-press w-full text-left" style={{ opacity: dim ? 0.6 : 1, padding: '8px 10px 8px 12px', background: picked ? 'rgba(224,106,95,0.16)' : MS.box, border: `1px solid ${picked ? '#e06a5f' : MS.line}`, borderLeft: `3px solid ${g.color}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-bold" style={{ fontSize: 13.5, color: g.color }}>{sl.icon} {E.itemName(it)}{it.plus ? ` +${it.plus}` : ''}{tag}</span>
        {picked != null ? <span className="flex-none flex items-center justify-center" style={{ width: 20, height: 20, border: `1.5px solid ${picked ? '#e06a5f' : MS.line}`, color: '#e06a5f', fontSize: 13 }}>{picked ? '✓' : ''}</span>
          : evalInfo && evalInfo.state !== 'na' && evalInfo.state !== 'none' ? <span className="flex-none"><EvalChip info={evalInfo} /></span>
          : <b className="flex-none" style={{ fontSize: 12.5, color: MS.gold }}>⚔ {E.itemPower(it).toLocaleString()}</b>}
      </div>
      {syncLv > 0 && !cmpMode && <div style={{ fontSize: 11, color: MS.gold }}>⚖ 레벨 맞춤 — 기본 능력치는 Lv.{syncLv} 수준으로 적용 (옵션·특수 효과는 그대로)</div>}
      <div style={{ fontSize: 11, color: PALETTE.textDim }}>{g.label} · Lv.{it.ilv} · {sl.label}{cmpMode && (it.plus || 0) < GE.evalPlus(it) ? <> · <span style={{ color: MS.gold }}>+{GE.evalPlus(it)} 강화 시 능력치</span></> : null}{note ? <> · {note}</> : null}</div>
      <div className="grid mt-1" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
        {rows.map(r => (
          <div key={r.k} className="flex items-baseline justify-between gap-1" style={{ padding: '1px 0', minWidth: 0, opacity: r.gone ? 0.7 : 1 }}>
            <span className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim, textDecoration: r.gone ? 'line-through' : 'none' }}>{r.l}</span>
            <span className="flex-none" style={{ fontSize: 12, fontWeight: 800, color: r.base ? PALETTE.text : MS.red, textDecoration: r.gone ? 'line-through' : 'none' }}>{r.v}{r.d && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 3, color: r.d.c, textDecoration: 'none', display: 'inline-block' }}>{r.d.t}</span>}</span>
          </div>
        ))}
      </div>
      {(ud || eo) && <div className="mt-1" style={{ fontSize: 11.5, color: '#c79bff', lineHeight: 1.45 }}>★ {(ud || eo).name} — <span style={{ color: PALETTE.text }}>{(ud || eo).desc}</span></div>}
      {footer && <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5" style={{ borderTop: `1px dashed ${MS.line}`, fontSize: 11.5 }}>{footer}</div>}
    </button>
  );
}

// 카드 아래 줄 — 지금 착용과 비교 (1.254.0, 시안 ㉙㉜)
export const CMP_UP = '#8fd08a';
export const CMP_DN = '#e07a6a';

function gearCmpParts(it, cur) {
  const pd = E.itemPower(it) - (cur ? E.itemPower(cur) : 0);
  const a = E.itemStats(it); const b = cur ? E.itemStats(cur) : {};
  const label = (k) => E.statLabel(k, 1).replace(/\s*[+-]?[\d.]+.*$/, '');
  const gone = Object.keys(b).filter(k => !BASE_STATS.includes(k) && b[k] && !a[k]).map(label);
  const add = Object.keys(a).filter(k => !BASE_STATS.includes(k) && a[k] && !b[k]).map(label);
  const sp = (E.uniqueDef(it) || E.epicOptOf(it)) && !(cur && (E.uniqueDef(cur) || E.epicOptOf(cur)));
  const spGone = cur && (E.uniqueDef(cur) || E.epicOptOf(cur)) && !(E.uniqueDef(it) || E.epicOptOf(it));
  const ch = [];
  if (add.length) ch.push({ t: `${add.slice(0, 3).join('·')} 생김`, c: CMP_UP });
  if (gone.length) ch.push({ t: `${gone.slice(0, 3).join('·')} 사라짐`, c: CMP_DN });
  if (sp) ch.push({ t: '★ 특수 효과 생김', c: '#c79bff' }); if (spGone) ch.push({ t: '★ 특수 효과 사라짐', c: CMP_DN });
  return { pd, ch, pdText: pd > 0 ? `▲ +${pd.toLocaleString()}` : pd < 0 ? `▼ ${pd.toLocaleString()}` : '= 같음', color: pd > 0 ? CMP_UP : pd < 0 ? CMP_DN : PALETTE.textDim };
}

function GearCmpFooter({ it, cur, right = null }) {
  const c = gearCmpParts(it, cur);
  return <>
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate" style={{ color: PALETTE.textDim }}>{cur ? <>vs 착용 「{E.itemName(cur)}{cur.plus ? ` +${cur.plus}` : ''}」</> : '빈 칸에 장착'}</span>
        <b className="flex-none" style={{ color: c.color }}>⚔ {c.pdText}</b>
      </div>
      {c.ch.length > 0 && <div style={{ fontSize: 11, lineHeight: 1.45 }}>{c.ch.map((x, i) => <span key={i} style={{ color: x.c }}>{i ? ' · ' : ''}{x.t}</span>)}</div>}
    </div>
    {right}
  </>;
}

const forgeRateColor = (r) => (r == null ? PALETTE.textDim : r >= 1 ? '#8fd08a' : r >= 0.5 ? MS.gold : '#e07a6a');

export function ForgeFooter({ it, onEquip = null, canWear = true }) {
  const r = forgeNextRate(it); const ngi = E.nextGrade(it); const prr = ngi && E.promoteRisk(it);
  const risk = r != null && r < 1 ? E.enhanceRisk(it) : null;
  return <>
    <span className="min-w-0 truncate">⚒ {r == null ? <b style={{ color: PALETTE.textDim }}>최대 강화</b> : <>+{it.plus || 0}→+{(it.plus || 0) + 1} <b style={{ color: forgeRateColor(r) }}>{Math.round(r * 100)}%</b>{risk ? <span style={{ color: CMP_DN }}> · {risk.breakChance ? `파괴 ${Math.round(risk.breakChance * 100)}%` : risk.drop ? '실패 시 하락' : ''}</span> : r >= 1 ? <span style={{ color: PALETTE.textDim }}> · 안전</span> : null}</>}</span>
    <span className="flex-none">⬆ {ngi ? <>{gradeOf(ngi).label} <b style={{ color: MS.gold }}>{Math.round(prr.rate * 100)}%</b></> : <span style={{ color: PALETTE.textDim }}>—</span>}</span>
    {onEquip && (canWear
      ? <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onEquip(); }} className="ui-press flex-none" style={{ padding: '4px 12px', fontWeight: 800, fontSize: 12.5, border: `1px solid ${MS.gold}`, color: MS.gold }}>착용</span>
      : <span className="flex-none" style={{ fontSize: 11.5, color: CMP_DN }}>Lv.{it.ilv} 필요</span>)}
  </>;
}

// 장비 정보창 — 본편 카드 모달 (1.249.0, PM 승인 시안 ⑭)
export function MainItemModal({ save, item, cur, by, usable, onClose, footer, evalInfo = null }) {
  const g = gradeOf(item.grade);
  const slot = SLOTS.find(sl => sl.id === item.slot);
  const st = E.itemStats(item);
  const showCmp = usable && !by;
  const b = showCmp && cur ? E.itemStats(cur) : {};
  const opts = Object.keys(st).filter(k => !BASE_STATS.includes(k) && st[k]);
  const gone = showCmp && cur ? Object.keys(b).filter(k => !BASE_STATS.includes(k) && b[k] && !st[k]) : [];
  const optCap = Math.max(g.opts || 0, opts.length);
  const ud = E.uniqueDef(item); const eo = E.epicOptOf(item);
  const risk = (item.plus || 0) < FORGE.maxEnhance ? E.enhanceRisk(item) : null;
  const pd = showCmp ? E.itemPower(item) - (cur ? E.itemPower(cur) : 0) : 0;
  const split = (k, v) => { const t = E.statLabel(k, v); const m = t.match(/^(.*?)\s*([+-]?[\d.]+.*)$/); return m ? [m[1], m[2]] : [t, '']; };
  const dTag = (k) => {
    if (!showCmp || !cur) return null;
    const a = st[k] || 0, c = b[k] || 0, d = +(a - c).toFixed(3);
    if (a && !c) return <span style={{ fontSize: 11, color: '#8fd08a', marginLeft: 3 }}>신규</span>;
    if (!d) return null;
    const txt = BASE_STATS.includes(k) ? Math.abs(Math.round(d)).toLocaleString() : split(k, Math.abs(d))[1].replace(/^\+/, '');
    return <span style={{ fontSize: 11, color: d > 0 ? '#8fd08a' : '#e07a6a', marginLeft: 3 }}>{d > 0 ? '▲' : '▼'}{txt}</span>;
  };
  const optColor = (k) => (/crit/i.test(k) ? MS.gold : /^scdr_|cdr/.test(k) ? MS.violet : /hp|def|reduce|regen|shield|heal|steal/i.test(k) ? MS.blue : MS.red);
  return (
    <MainModal kicker={`${g.label} · ${slot?.label || ''}`.split('').join(' ').replace(/ {3}/g, '  ')} title={`${E.itemName(item)}${item.plus ? ` +${item.plus}` : ''}`} color={g.color} badge={`⚔ ${E.itemPower(item)}`} onClose={onClose} footer={footer}>
      <div className="flex flex-wrap gap-1" style={{ fontSize: 11.5, marginBottom: 10 }}><span className="chr-pill">Lv.{item.ilv}</span><span className="chr-pill">{clsTag(item)}</span><span className="chr-pill" style={by ? { color: '#8fd08a', borderColor: 'rgba(143,208,138,.45)' } : { color: PALETTE.textDim }}>{by ? '착용 중' : '가방'}</span></div>
      {evalInfo && evalInfo.state !== 'na' && evalInfo.state !== 'none' && (
        <div className="chr-cell" style={{ padding: '9px 11px', marginBottom: 10, borderColor: 'rgba(232,176,74,.4)' }}>
          <div className="flex items-baseline justify-between gap-2"><span style={{ fontSize: 11.5, color: PALETTE.textDim }}>⚔ 실전 효율 (착용 대비)</span><span style={{ fontSize: 15 }}><EvalChip info={evalInfo} /></span></div>
          <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 2 }}>비교 = <EvalBasis it={item} cur={cur} /></div>
          {evalInfo.full && <div style={{ fontSize: 11.5, color: PALETTE.text, marginTop: 2 }}>실전 {evalInfo.full.n}전 · 승률 <b>{Math.round(evalInfo.full.win * 100)}%</b> · 남은 HP <b>{Math.round(evalInfo.full.hp * 100)}%</b></div>}
        </div>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {BASE_STATS.filter(k => st[k] || b[k]).map((k, i) => <MainCell key={k} hot={i === 0} label={BASE_LABEL[k] === '공격' ? '공격력' : BASE_LABEL[k]} value={st[k] ? <>{Math.round(st[k]).toLocaleString()}{dTag(k)}</> : (b[k] ? <span style={{ color: '#e07a6a', fontSize: 12 }}>▼{Math.round(b[k]).toLocaleString()}</span> : '—')} />)}
      </div>
      <MainSecHead title={`추 가 옵 션 (${opts.length}/${optCap})`} />
      {opts.length || gone.length ? (
        <div className="chr-list">
          {opts.map(k => { const [l, v] = split(k, st[k]); return (
            <div key={k} className="flex items-baseline justify-between gap-2" style={{ padding: '8px 11px', minWidth: 0 }}>
              <span className="truncate" style={{ fontSize: 12, color: PALETTE.textDim }}>{l}</span>
              <span className="flex-none" style={{ fontSize: 12.5, fontWeight: 800, color: optColor(k) }}>{v}{dTag(k)}</span>
            </div>); })}
          {gone.map(k => <div key={k} className="flex items-baseline justify-between gap-2" style={{ padding: '8px 11px', minWidth: 0 }}><span className="truncate" style={{ fontSize: 12, color: PALETTE.textDim }}>{split(k, b[k])[0]}</span><span className="flex-none" style={{ fontSize: 12, fontWeight: 800, color: '#e07a6a' }}>사라짐 ▼</span></div>)}
        </div>
      ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>{g.opts ? '옵션 없음' : '추가 옵션은 고급 등급부터 붙는다'}</div>}
      <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
        <b style={{ color: ud || eo ? '#c79bff' : MS.red }}>◇ 특수 효과</b> {ud ? <><b style={{ color: '#f0a86a' }}>{ud.name}</b> — {ud.desc}</> : eo ? <><b style={{ color: '#d7a8ff' }}>{eo.name}</b> — {eo.desc}</> : <span style={{ color: PALETTE.textDim }}>없음 (에픽 장신구 · 유니크 장비에만 붙는다)</span>}
      </div>
      {showCmp && (
        <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
          <b style={{ color: MS.red }}>◇ 비교 기준</b> {cur ? <>지금 착용 「{E.itemName(cur)}{cur.plus ? ` +${cur.plus}` : ''}」 · 전투력 <b style={{ color: pd > 0 ? '#8fd08a' : pd < 0 ? '#e07a6a' : PALETTE.textDim }}>{pd > 0 ? `▲ ${pd}` : pd < 0 ? `▼ ${-pd}` : '같음'}</b></> : '이 부위 비어 있음 — 끼면 전부 추가'}
          {(E.uniqueDef(cur) || E.epicOptOf(cur)) && <div style={{ fontSize: 11.5, color: '#e07a6a' }}>※ 교체하면 착용 중 장비의 특수 효과를 잃는다</div>}
        </div>
      )}
      <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
        <b style={{ color: MS.red }}>◇ 강화</b> {risk ? <>+{item.plus || 0} → +{(item.plus || 0) + 1} 성공 <b>{Math.round(risk.rate * 100)}%</b> · {risk.breakChance ? <span style={{ color: '#e07a6a' }}>실패 시 파괴 {Math.round(risk.breakChance * 100)}%</span> : risk.drop ? '실패 시 단계 하락' : '실패해도 단계 유지'} (대장간)</> : <span style={{ color: PALETTE.textDim }}>최대 강화 +{FORGE.maxEnhance}</span>}
      </div>
      {!usable && <div className="mt-2" style={{ fontSize: 12, color: '#e06a5f' }}>{chronicleClass(save.hero).name}는 착용할 수 없다 — 공용 창고에 넣으면 {chronicleClass(item.cls).name} 캐릭터가 쓸 수 있다</div>}
    </MainModal>
  );
}

// ===== 대장간 =====
// 가방·대장간 공용 정렬 (1.215.1): 착용 장비가 맨 위(부위 순) → 전투력 또는 등급 순
export function useItemSort() {
  const [sortBy, setSortBy] = useState(() => { try { return localStorage.getItem('chronicleBagSort') || 'power'; } catch { return 'power'; } });
  const pickSort = (v) => { setSortBy(v); try { localStorage.setItem('chronicleBagSort', v); } catch { /* */ } };
  return [sortBy, pickSort];
}

export function sortItems(save, items, sortBy) {
  const slotIdx = (i) => SLOTS.findIndex(x => x.id === i.slot);
  const eqd = (i) => (E.equippedBy(save, i.uid) ? 1 : 0);
  return items.slice().sort((a, b) => eqd(b) - eqd(a) || (eqd(a) && eqd(b) ? slotIdx(a) - slotIdx(b) : 0)
    || (sortBy === 'grade' ? gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a)
      : sortBy === 'level' ? (b.ilv || 0) - (a.ilv || 0) || E.itemPower(b) - E.itemPower(a)
      : E.itemPower(b) - E.itemPower(a) || gradeIdx(b.grade) - gradeIdx(a.grade)));
}

export function filterItems(items, filter, hero) {
  // 1.270.1 — 타직업 장비는 「타직업」 탭에서만 (전체·부위 탭은 내 직업이 쓸 수 있는 장비만)
  return items.filter(i => (filter === 'other' ? !E.itemUsable(i, hero) : E.itemUsable(i, hero) && (filter === 'all' || i.slot === filter)));
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
      {[['power', '전투력'], ['grade', '등급'], ['level', '레벨']].map(([v, l]) => (
        <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', borderRadius: 8, border: `1px solid ${sortBy === v ? PALETTE.legendary : 'var(--ui-line)'}`, color: sortBy === v ? PALETTE.legendary : PALETTE.textDim, background: 'transparent' }}>{l}</button>
      ))}
    </>
  );
}

export function EquipBoxes({ save, hero, onPick, sub }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {SLOTS.map(sl => {
        const it = save.inventory.find(i => i.uid === save.units[hero].equip[sl.id]);
        const g = it ? gradeOf(it.grade) : null;
        return (
          <button key={sl.id} onClick={() => onPick(sl, it)} className="ui-press text-center" style={{ padding: '6px 3px', borderRadius: 12, border: `1.5px solid ${it ? `${g.color}99` : MS.line}`, background: MS.box, minWidth: 0 }}>
            <div style={{ fontSize: 18, lineHeight: 1.2 }}>{sl.icon}</div>
            <div className="truncate font-bold" style={{ fontSize: 11, color: it ? g.color : PALETTE.textDim }}>{it ? E.itemName(it) : `${sl.label} 비어 있음`}</div>
            <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{it ? sub(it) : '—'}</div>
          </button>
        );
      })}
    </div>
  );
}

// ===== 대장간 본편 스타일 (1.250.0, 시안 ⑰⑱) =====
export const forgeNextRate = (it) => ((it.plus || 0) >= FORGE.maxEnhance ? null : E.enhanceRisk(it).rate);
