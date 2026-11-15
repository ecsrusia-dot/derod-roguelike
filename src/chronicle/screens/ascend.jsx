// ============================================
// chronicle/screens/ascend.jsx — 황혼 연대기 · 승천계 (시즌 시리즈 PR ① — 보관함 · 승천 예정)
// ============================================
import React, { useState, useMemo, useEffect } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { chronicleClass, REBIRTH_BRANCHES, SLOTS } from '../data.js';
import * as E from '../engine.js';
import * as F from '../familiar.js';
import * as ASC from '../ascend.js';
import * as SE from '../season.js';
import * as GD from '../god.js';
import { MainGearCard } from './gear.jsx';
import { Header, Portrait, MainTabs, MainModal, MainCell, MainSecHead, MainKvRows, MS } from './common.jsx';

const box = { padding: '9px 11px', background: MS.box, border: `1px solid ${MS.line}`, borderRadius: MS.r, fontSize: 12.5, lineHeight: 1.6 };
const pw = (n) => (n || 0).toLocaleString();

// 승천 캐릭터 상세 — 스냅샷을 그대로 보여 준다
function SnapDetail({ snap, onClose, note }) {
  const view = useMemo(() => ASC.snapView(snap), [snap]);
  const d = useMemo(() => E.deriveUnit(view, snap.cls), [view]);
  const u = view.units[snap.cls];
  const br = REBIRTH_BRANCHES[snap.branch]; const c = chronicleClass(snap.cls);
  const items = SLOTS.map(s => view.inventory.find(it => it.uid === u.equip?.[s.id])).filter(Boolean);
  const fk = view.famTeam?.main; const ff = fk && view.fams?.[fk];
  return (
    <MainModal kicker="ASCENDED" title={br?.name || c.name} badge={`전투력 ${pw(snap.power)}`} color={MS.gold} sub={`${c.name} · 전승 ${snap.rebirth}회 · Lv.${snap.lv}`} onClose={onClose}>
      {note && <div className="mt-2" style={{ ...box, color: PALETTE.textDim }}>{note}</div>}
      <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MainCell label="HP" value={d.maxHp.toLocaleString()} />
        <MainCell label="공격력" value={d.atk.toLocaleString()} color={MS.gold} />
        <MainCell label="방어" value={d.def.toLocaleString()} color={MS.blue} />
        <MainCell label="치명타" value={`${Math.round(d.crit * 100)}%`} />
      </div>
      <MainSecHead title="장 비" />
      <div className="flex flex-col gap-1.5">
        {items.map(it => <MainGearCard key={it.uid} it={it} note={SLOTS.find(x => x.id === it.slot)?.label} />)}
        {!items.length && <div style={{ fontSize: 12, color: PALETTE.textDim }}>착용 장비 없음</div>}
      </div>
      <MainSecHead title="동 행 사 역 마" />
      <div style={box}>{ff ? <><b style={{ color: F.famGrade(ff.grade).color }}>{F.famGrade(ff.grade).label}</b> {F.famName(fk)}{F.famPlusText(ff)} <span style={{ color: PALETTE.textDim }}>· {F.FAM_ROLES[F.famRole(fk)]?.label}</span></> : <span style={{ color: PALETTE.textDim }}>동행 없음</span>}</div>
      <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.55 }}>전투력 = 같은 훈련 상대에게 준 피해 (오래 버틸수록 높다). 같은 갈래끼리 비교할 때 쓴다.</div>
    </MainModal>
  );
}

// 결산 내용 — 시작 전 미리 보기와 시즌 종료 결산 창이 같이 쓴다
const RESULT_KO = { new: ['새 칸', MS.green], replace: ['교체', MS.gold], keep: ['기존 유지', PALETTE.textDim] };
function SettlementBody({ st }) {
  return (
    <>
      <MainSecHead title="승 천" />
      {st.ascended.map(a => { const r = RESULT_KO[a.result]; return (
        <div key={a.cid} className="flex items-center gap-2 mt-1.5" style={box}>
          <Portrait cid={a.cid} size={36} />
          <div className="flex-1 min-w-0"><b style={{ color: chronicleClass(a.cid).color }}>{REBIRTH_BRANCHES[a.branch]?.name}</b> <span style={{ color: PALETTE.textDim }}>전승 {a.rebirth}회 · Lv.{a.lv}</span><br /><span style={{ fontSize: 11.5, color: r[1] }}>{r[0]}{a.result === 'replace' ? ` (이전 ${pw(a.prev)})` : a.result === 'keep' ? ` (보관 중 ${pw(a.prev)})` : ''}</span></div>
          <b style={{ color: MS.gold }}>{pw(a.power)}</b>
        </div>
      ); })}
      {!st.ascended.length && <div className="mt-1.5" style={{ ...box, color: PALETTE.textDim }}>승천한 캐릭터가 없다 (전승한 캐릭터만 승천한다).</div>}
      {st.skipped.length > 0 && <div className="mt-1.5" style={{ ...box, borderColor: MS.red, color: '#ff9a90' }}>승천하지 못하고 사라짐: {st.skipped.map(x => `${chronicleClass(x.cid).name} Lv.${x.lv}`).join(' · ')}</div>}
      <MainSecHead title="승 천 인 장" />
      <MainKvRows rows={[
        st.growth ? { l: `시즌 순위 ${st.growth.rank}위 / ${st.growth.total}명`, v: `+${st.growth.seal}` } : null,
        st.arena ? { l: `투기장 ${st.arena.rank}위 / ${st.arena.total}명`, v: `+${st.arena.seal}` } : null,
        st.god ? { l: `승천 순위 ${st.god.rank}위 / ${st.god.total}명 (점수 ${st.god.score})`, v: `+${st.god.seal}` } : null,
        st.ascSeal ? { l: '승천 (새 칸 · 교체)', v: `+${st.ascSeal}` } : null,
        { l: `남은 재화 환산${st.conv.raw > st.conv.seal ? ` (상한 ${SE.SEASON.convertCap})` : ''}`, v: `+${st.conv.seal}` },
        { l: '합계', v: `✶ +${st.seal}`, c: MS.gold },
      ].filter(Boolean)} />
      {st.conv.parts.length > 0 && <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.55 }}>환산 내역: {st.conv.parts.map(p => `${p.label} ${p.n}`).join(' · ')}</div>}
    </>
  );
}
export function SeasonReportModal({ acc, onClose }) {
  const r = acc.season.report;
  return (
    <MainModal kicker="SEASON END" title={r.n === 0 ? '시즌제 시작' : `시즌 ${r.n} 종료`} badge={`시즌 ${acc.season.n} 시작`} color={MS.gold} sub={`남은 시간 ${SE.fmtLeft(SE.seasonLeftMs(acc))}`} onClose={onClose}>
      <div className="mt-2" style={{ ...box, color: PALETTE.textDim }}>시즌계가 새로 열렸다. 캐릭터·재화·사역마는 0에서 다시 시작하고, 승천한 캐릭터는 「승천계」에 보관됐다. 이번 시즌은 경험치 ×{1.5}, 레벨 상한 제한이 없다.</div>
      <SettlementBody st={r} />
    </MainModal>
  );
}
// 시즌제 상태 · 시작 버튼
function SeasonPanel({ acc, onAct }) {
  const s = SE.seasonState(acc);
  const [step, setStep] = useState(0);
  const st = useMemo(() => (step ? SE.seasonSettlement(acc) : null), [step, acc]);
  const left = SE.fmtLeft(SE.seasonLeftMs(acc));
  const seal = ASC.ascState(acc).seal;
  if (s.on) return (
    <div className="flex-none" style={{ ...box, borderColor: MS.strong }}>
      <div className="flex justify-between"><b style={{ color: MS.gold }}>시즌 {s.n} 진행 중</b><span style={{ color: PALETTE.text }}>남은 시간 <b>{left}</b></span></div>
      월요일 0시에 순위가 확정되고, <b style={{ color: PALETTE.text }}>전승한 캐릭터</b>가 승천한 뒤 시즌계가 초기화된다.<br />
      <span style={{ color: PALETTE.textDim }}>승천 인장 ✶ {seal.toLocaleString()} — 쓰임새(시작 특전 · 승천 특성)는 다음 업데이트에 열린다.</span>
    </div>
  );
  return (
    <>
      <div className="flex-none" style={{ ...box, borderColor: MS.strong }}>
        <b style={{ color: MS.gold }}>{s.armed ? `시즌 1 시작 예약됨 — ${left} 뒤` : '시즌제 시작 전'}</b><br />
        {s.armed
          ? <>다음 월요일 0시에 지금 캐릭터가 「시즌 0」으로 승천하고, 시즌계는 0에서 다시 시작한다. 그때까지 계속 키울 수 있다.</>
          : <>시즌은 1주 단위다. 시즌이 끝나면 <b style={{ color: PALETTE.text }}>전승한 캐릭터</b>가 승천해 갈래별로 보관되고, 시즌계(캐릭터·재화·사역마)는 초기화된다. 시작하면 지금 캐릭터가 「시즌 0」으로 승천한다.</>}
        <div className="flex gap-2 mt-2">
          {s.armed
            ? <button onClick={() => onAct(SE.disarmSeason, '시즌 시작 예약을 취소했습니다')} className="ui-press flex-1" style={{ height: 40, fontSize: 13, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.textDim }}>예약 취소</button>
            : <button onClick={() => setStep(1)} className="ui-press flex-1 chr-btn-pri" style={{ height: 42, fontSize: 13.5, fontWeight: 800 }}>시즌제 시작…</button>}
        </div>
      </div>
      {step > 0 && st && (
        <MainModal kicker="SEASON" title="시즌제를 시작할까요?" color={MS.red} sub={`시작까지 ${SE.fmtLeft(SE.seasonLeftMs(SE.armSeason(acc)))} — 다음 월요일 0시에 아래처럼 처리된다 (지금 상태 기준)`} onClose={() => setStep(0)}
          footer={step === 1
            ? <button onClick={() => setStep(2)} className="ui-press w-full chr-btn-pri" style={{ height: 44, fontSize: 14, fontWeight: 800 }}>내용을 확인했다</button>
            : <button onClick={() => { onAct((a) => SE.armSeason(a), '시즌 1 시작을 예약했습니다'); setStep(0); }} className="ui-press w-full" style={{ height: 44, fontSize: 14, fontWeight: 800, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.22)', color: '#ff8a7e' }}>정말 시작한다 — 다음 월요일에 초기화</button>}>
          <div className="mt-2" style={{ ...box, borderColor: MS.red, color: PALETTE.text }}>
            · 시즌계의 <b>캐릭터·장비·재화·사역마·창고가 전부 초기화</b>된다<br />
            · <b>전승한 캐릭터만</b> 승천해 보관된다 — 전승 전 캐릭터는 사라진다<br />
            · 월요일 전까지는 예약을 취소할 수 있고, 그동안 더 키우면 결과가 바뀐다<br />
            · 교체 직전 상태는 이 기기에 한 벌 따로 남는다
          </div>
          <SettlementBody st={st} />
        </MainModal>
      )}
    </>
  );
}

// 신 토벌 — 편성 · 도전 · 승천 순위 (경쟁자 점수는 조금씩 나눠 계산한다)
const GOD_SCORES = {}; // 경쟁자 id → 점수 (이번 접속 동안 기억 · god.js가 구성별로 캐시)
function GodPanel({ acc, onGod, onAct }) {
  const slots = ASC.ascState(acc).slots;
  const have = ASC.ASC_SLOTS.filter(b => slots[b]);
  const g = GD.godState(acc); const weak = GD.godWeak(); const left = GD.godLeft(acc);
  const ids = GD.godPartyIds(acc);
  const [tick, setTick] = useState(0);
  const entries = useMemo(() => GD.rivalGodEntries(acc), [acc.asc?.rivals]);
  useEffect(() => {
    let stop = false;
    const step = () => {
      if (stop) return;
      const todo = entries.filter(e => GOD_SCORES[e.r.id + ':' + JSON.stringify(e.slots)] == null).slice(0, 3);
      if (!todo.length) return;
      for (const e of todo) GOD_SCORES[e.r.id + ':' + JSON.stringify(e.slots)] = GD.rivalGodScore(e.r, e.slots);
      setTick(t => t + 1); setTimeout(step, 30);
    };
    const t = setTimeout(step, 200);
    return () => { stop = true; clearTimeout(t); };
  }, [entries]);
  const scores = useMemo(() => Object.fromEntries(entries.map(e => [e.r.id, GOD_SCORES[e.r.id + ':' + JSON.stringify(e.slots)]]).filter(x => x[1] != null)), [entries, tick]);
  const board = GD.godBoard(acc, scores);
  const me = board.rows.find(x => x.me);
  const toggle = (b) => { const on = ids.includes(b); const next = on ? ids.filter(x => x !== b) : ids.length >= GD.GOD.partyMax ? ids : [...ids, b]; if (next.length) onAct((a) => GD.setGodParty(a, next)); };
  if (!have.length) return <div className="flex-none" style={{ ...box, color: PALETTE.textDim }}>승천한 캐릭터가 없다. 시즌이 끝나 전승한 캐릭터가 승천하면 신 토벌에 나설 수 있다.</div>;
  return (
    <>
      <div className="flex-none" style={{ ...box, borderColor: MS.strong }}>
        <div className="flex justify-between items-baseline"><b style={{ color: MS.gold }}>신 토벌</b><span style={{ color: PALETTE.text }}>오늘 <b>{left}</b> / {GD.GOD.daily}회</span></div>
        승천 캐릭터 최대 {GD.GOD.partyMax}명이 「{GD.GOD.bossName}」에 도전한다. 넘은 단계가 곧 점수다 (동행 사역마는 참전하지 않는다).<br />
        <span style={{ color: MS.violet }}>이번 주 약점 「{weak.name}」</span> <span style={{ color: PALETTE.text }}>— 파티 전원 {weak.desc}</span>
        <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <MainCell label="최고 점수" value={g.best || '-'} color={MS.gold} />
          <MainCell label="이번 주" value={g.weekBest || '-'} />
          <MainCell label="승천 순위" value={me ? `${me.rank}위` : '-'} />
        </div>
        <button disabled={!left || !ids.length} onClick={() => onGod(ids)} className="ui-press w-full mt-2 chr-btn-pri" style={{ height: 44, fontSize: 14, fontWeight: 800, opacity: left && ids.length ? 1 : 0.45 }}>{left ? `토벌 출정 (${ids.length}명)` : '오늘 도전을 다 썼다 (0시 초기화)'}</button>
      </div>
      <MainSecHead title={`편 성  ${ids.length} / ${GD.GOD.partyMax}`} />
      <div className="grid gap-1.5 flex-none" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {have.map(b => { const sn = slots[b]; const on = ids.includes(b); const c = chronicleClass(sn.cls); return (
          <div key={b} role="button" onClick={() => toggle(b)} className="ui-press flex items-center gap-2" style={{ ...box, borderColor: on ? MS.gold : MS.line, opacity: on ? 1 : 0.6 }}>
            <Portrait cid={sn.cls} size={34} dim={!on} />
            <div className="min-w-0 flex-1"><b className="block truncate" style={{ color: c.color }}>{REBIRTH_BRANCHES[b].name}</b><span style={{ fontSize: 11, color: PALETTE.textDim }}>전승 {sn.rebirth} · Lv.{sn.lv} · {pw(sn.power)}</span></div>
            <span style={{ color: on ? MS.gold : PALETTE.textDim, fontWeight: 800 }}>{on ? '✓' : '+'}</span>
          </div>
        ); })}
      </div>
      <MainSecHead title="승 천 순 위" />
      <div className="flex-none" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.55 }}>경쟁자도 자기 승천 캐릭터로 같은 신에게 도전한다. 시즌이 끝날 때 순위에 따라 승천 인장을 받는다 (1위 {GD.godRankSeal(1)} · 10위 {GD.godRankSeal(10)}).{board.pending ? ` 계산 중… (${board.pending}명 남음)` : ''}</div>
      <div className="chr-list flex-none">
        {board.rows.filter(x => x.rank <= 10 || x.me || (me && Math.abs(x.rank - me.rank) <= 2)).map(x => (
          <div key={x.id} className="flex items-center gap-2" style={{ padding: '7px 10px', fontSize: 12.5, background: x.me ? 'rgba(232,176,74,0.1)' : 'transparent' }}>
            <b style={{ width: 34, color: x.rank <= 3 ? MS.gold : PALETTE.textDim }}>{x.rank}위</b>
            <span className="flex-1 truncate" style={{ color: x.me ? MS.gold : PALETTE.text, fontWeight: x.me ? 800 : 500 }}>{x.name} <span style={{ fontSize: 11, color: PALETTE.textDim }}>승천 {x.n}명</span></span>
            <b style={{ color: PALETTE.text }}>{x.score}</b>
          </div>
        ))}
        {!board.rows.length && <div style={{ padding: 10, fontSize: 12, color: PALETTE.textDim }}>아직 기록이 없다.</div>}
      </div>
    </>
  );
}

export function AscendView({ acc, onBack, onAct, onGod }) {
  const [tab, setTab] = useState(() => (Object.keys(ASC.ascState(acc).slots).length ? 'god' : 'plan'));
  const [sel, setSel] = useState(null);
  const s = ASC.ascState(acc);
  const plan = useMemo(() => ASC.ascPreview(acc), [acc]);
  const filled = ASC.ascFilled(acc);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="승천계" onBack={onBack} right={<span style={{ fontSize: 11.5, color: PALETTE.textDim }}>보관 {filled} / {ASC.ASC_SLOTS.length}</span>} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <SeasonPanel acc={acc} onAct={onAct} />
        <div className="flex-none"><MainTabs value={tab} onChange={setTab} items={[['god', '신 토벌'], ['plan', '승천 예정'], ['vault', '보관함']]} /></div>
        {tab === 'god' && <GodPanel acc={acc} onGod={onGod} onAct={onAct} />}
        {tab === 'plan' && plan.map(p => {
          const c = chronicleClass(p.cid);
          if (!p.eligible) return (
            <div key={p.cid} className="flex-none flex items-center gap-2" style={{ ...box, opacity: 0.7 }}>
              <Portrait cid={p.cid} size={40} dim />
              <div className="flex-1 min-w-0"><b style={{ color: PALETTE.text }}>{c.name}</b> <span style={{ color: PALETTE.textDim }}>Lv.{p.lv}</span><br /><span style={{ fontSize: 11.5, color: PALETTE.textDim }}>전승해야 승천할 수 있다 (갈래가 정해져야 칸이 생긴다)</span></div>
            </div>
          );
          const br = REBIRTH_BRANCHES[p.slot];
          const st = !p.cur ? ['새 칸에 보관', MS.green] : p.replaces ? [`보관 중(${pw(p.cur.power)})보다 강함 → 교체`, MS.gold] : [`보관 중(${pw(p.cur.power)})이 더 강함 → 유지`, PALETTE.textDim];
          return (
            <div key={p.cid} role="button" onClick={() => setSel({ snap: p.snap, note: p.from === 'cand' ? '전승 직전 상태가 지금보다 강해서, 그 상태가 승천한다.' : '지금 상태가 그대로 승천한다.' })} className="ui-press flex-none flex items-center gap-2" style={box}>
              <Portrait cid={p.cid} size={40} />
              <div className="flex-1 min-w-0">
                <div><b style={{ color: c.color }}>{br?.name}</b> <span style={{ color: PALETTE.textDim }}>전승 {p.snap.rebirth}회 · Lv.{p.snap.lv}</span></div>
                <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{p.from === 'cand' ? '전승 직전 상태' : '지금 상태'} · <span style={{ color: st[1] }}>{st[0]}</span></div>
              </div>
              <div className="text-right flex-none"><div style={{ fontSize: 11, color: PALETTE.textDim }}>전투력</div><b style={{ fontSize: 15, color: MS.gold }}>{pw(p.snap.power)}</b></div>
            </div>
          );
        })}
        {tab === 'plan' && !plan.length && <div style={{ fontSize: 12.5, color: PALETTE.textDim }}>캐릭터가 없다.</div>}
        {tab === 'vault' && <div className="grid gap-1.5 flex-none" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {ASC.ASC_SLOTS.map(b => {
            const br = REBIRTH_BRANCHES[b]; const snap = s.slots[b]; const c = chronicleClass(br.cls);
            return (
              <div key={b} role={snap ? 'button' : undefined} onClick={snap ? () => setSel({ snap }) : undefined} className={snap ? 'ui-press' : ''} style={{ ...box, opacity: snap ? 1 : 0.55, minHeight: 74 }}>
                <div className="flex items-center gap-2">
                  <Portrait cid={br.cls} size={34} dim={!snap} />
                  <div className="min-w-0"><b className="block truncate" style={{ color: snap ? c.color : PALETTE.textDim }}>{br.name}</b><span style={{ fontSize: 11, color: PALETTE.textDim }}>{c.name}</span></div>
                </div>
                <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{snap ? <>전승 {snap.rebirth}회 · Lv.{snap.lv} · <b style={{ color: MS.gold }}>{pw(snap.power)}</b></> : '비어 있음'}</div>
              </div>
            );
          })}
        </div>}
      </div>
      {sel && <SnapDetail snap={sel.snap} note={sel.note} onClose={() => setSel(null)} />}
    </div>
  );
}
