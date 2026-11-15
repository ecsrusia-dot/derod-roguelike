// ============================================
// chronicle/screens/ascend.jsx — 황혼 연대기 · 승천계 (시즌 시리즈 PR ① — 보관함 · 승천 예정)
// ============================================
import React, { useState, useMemo } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { chronicleClass, REBIRTH_BRANCHES, SLOTS } from '../data.js';
import * as E from '../engine.js';
import * as F from '../familiar.js';
import * as ASC from '../ascend.js';
import { MainGearCard } from './gear.jsx';
import { Header, Portrait, MainTabs, MainModal, MainCell, MainSecHead, MS } from './common.jsx';

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

export function AscendView({ acc, onBack }) {
  const [tab, setTab] = useState('plan');
  const [sel, setSel] = useState(null);
  const s = ASC.ascState(acc);
  const plan = useMemo(() => ASC.ascPreview(acc), [acc]);
  const filled = ASC.ascFilled(acc);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="승천계" onBack={onBack} right={<span style={{ fontSize: 11.5, color: PALETTE.textDim }}>보관 {filled} / {ASC.ASC_SLOTS.length}</span>} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <div className="flex-none" style={{ ...box, borderColor: MS.strong }}>
          <b style={{ color: MS.gold }}>시즌제 준비 중</b><br />
          시즌이 끝나면 <b style={{ color: PALETTE.text }}>전승한 캐릭터</b>가 승천해 이곳에 갈래별로 보관된다. 승천한 캐릭터는 더 자라지 않고, 그 모습 그대로 「신 토벌」에 나선다.<br />
          <span style={{ color: PALETTE.textDim }}>첫 시즌은 직접 시작 버튼을 누를 때 열린다 (다음 업데이트). 그때까지 지금 캐릭터를 계속 키울 수 있다.</span>
        </div>
        <div className="flex-none"><MainTabs value={tab} onChange={setTab} items={[['plan', '승천 예정'], ['vault', '보관함']]} /></div>
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
