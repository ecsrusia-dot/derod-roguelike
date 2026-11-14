// ============================================
// chronicle/screens/rival.jsx — 황혼 연대기 · 경쟁자 순위 (1.289.0)
// ============================================
import React, { useState, useMemo } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { chronicleClass, REBIRTH_BRANCHES } from '../data.js';
import * as RV from '../rival.js';
import * as AR from '../arena.js';
import * as D from '../daily.js';
import * as F from '../familiar.js';
import { chronicleEnemyArt } from '../data.js';
import { Header, Portrait, MainTabs, MainModal, MainKvRows, MainSecHead, MS } from './common.jsx';

const RANK_COLOR = (rank) => (rank === 1 ? '#f0d27a' : rank <= 3 ? '#e8b04a' : rank <= 10 ? '#9cc4e4' : PALETTE.textDim);
const titleOf = (x) => (x.branch && x.rebirth > 0 ? REBIRTH_BRANCHES[x.branch]?.name : null) || chronicleClass(x.cls).name;

// ===== 투기장 (경쟁 시리즈 3단계) — 비슷한 점수 3명 중 골라 결투 =====
function ArenaPanel({ acc, onFight, onArena }) {
  const cid = acc.active;
  const [shop, setShop] = useState(false);
  const [whole, setWhole] = useState(false);
  const left = AR.arenaLeft(acc); const refreshLeft = AR.arenaRefreshLeft(acc);
  const board = useMemo(() => AR.arenaBoard(acc), [acc]);
  const me = board.find(x => x.id === `me_${cid}`);
  const opps = useMemo(() => AR.arenaOpponents(acc, cid), [acc, cid]);
  const odds = useMemo(() => Object.fromEntries(opps.map(o => [o.id, AR.arenaOdds(acc, o, cid)])), [opps, acc, cid]);
  const coin = acc.mats?.arenaCoin || 0;
  const st = AR.arenaState(acc);
  const shown = useMemo(() => {
    if (whole) return board;
    const keep = new Set();
    board.forEach((x, i) => { if (i < 5) keep.add(i); if (x.id === `me_${cid}`) for (let d = -2; d <= 2; d++) if (board[i + d]) keep.add(i + d); });
    return board.filter((_, i) => keep.has(i));
  }, [board, whole, cid]);
  const oddsColor = (p) => (p >= 0.7 ? '#8fd08a' : p >= 0.4 ? MS.gold : '#ff8a7e');
  let prev = 0;
  return (
    <>
      {me && (
        <div className="chr-glass flex-none" style={{ '--edge': MS.gold, padding: 12, borderRadius: MS.r, marginTop: 8 }}>
          <div className="flex items-center gap-3">
            <Portrait cid={cid} size={46} />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{chronicleClass(cid).name} · 투기장 점수</div>
              <div className="font-bold" style={{ fontSize: 20, color: RANK_COLOR(me.rank) }}>{me.rating}점 <span style={{ fontSize: 12, color: PALETTE.textDim }}>· {me.rank}위 / {board.length}명</span></div>
              <div style={{ fontSize: 11.5, color: PALETTE.text }}>오늘 남은 도전 <b style={{ color: left ? MS.gold : '#ff8a7e' }}>{left}</b> / {AR.ARENA.daily}회 · 전적 {st.wins}승 {st.losses}패</div>
            </div>
            <button onClick={() => setShop(true)} className="ui-press flex-none" style={{ padding: '8px 10px', fontSize: 12, fontWeight: 800, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'rgba(232,176,74,0.1)' }}>🏟 {coin}<br /><span style={{ fontSize: 11, fontWeight: 500 }}>상점</span></button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-none" style={{ marginTop: 2 }}>
        <span className="chr-head">오늘의 상대</span>
        <button disabled={!refreshLeft} onClick={() => onArena((a) => AR.arenaRefresh(a))} className="ui-press" style={{ fontSize: 11.5, padding: '3px 10px', border: `1px solid ${MS.line}`, color: PALETTE.textDim, background: 'transparent', opacity: refreshLeft ? 1 : 0.4 }}>↻ 다른 상대 ({refreshLeft})</button>
      </div>
      <div className="flex flex-col gap-1.5 flex-none">
        {opps.map(o => {
          const c = chronicleClass(o.cls); const stake = AR.arenaStake(acc, o, cid); const p = odds[o.id];
          const plan = AR.rivalGearPlan(o);
          return (
            <div key={o.id} style={{ padding: '9px 10px', borderRadius: MS.r, border: `1px solid ${MS.line}`, background: MS.box }}>
              <div className="flex items-center gap-2">
                <Portrait cid={o.cls} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-bold" style={{ fontSize: 13.5, color: PALETTE.text }}>{o.name} <span style={{ fontSize: 11.5, color: PALETTE.textDim, fontWeight: 500 }}>{o.rating}점 · {o.rank}위</span></div>
                  <div className="truncate" style={{ fontSize: 11.5, color: c.color }}>{titleOf(o)} <span style={{ color: PALETTE.textDim }}>· Lv.{o.lv}{o.rebirth ? ` · 전승 ${o.rebirth}` : ''} · {RV.RIVAL_FAMS[o.fam][1]}{plan.famGrade ? ` (${F.famGrade(plan.famGrade).label})` : ' 없음'}</span></div>
                </div>
                <div className="flex-none text-right">
                  <div className="font-bold" style={{ fontSize: 15, color: oddsColor(p) }}>{p == null ? '—' : `${Math.round(p * 100)}%`}</div>
                  <div style={{ fontSize: 11, color: PALETTE.textDim }}>예상 승률</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>승 <b style={{ color: '#8fd08a' }}>+{stake.win}점</b> · 🏟 {AR.arenaCoinFor(acc, o, true, cid)} / 패 <b style={{ color: '#ff8a7e' }}>{stake.lose}점</b> · 🏟 {AR.arenaCoinFor(acc, o, false, cid)}</span>
                <button disabled={!left} onClick={() => onFight(o.id)} className="ui-press chr-btn-pri flex-none" style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 800, opacity: left ? 1 : 0.45 }}>결투</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between flex-none" style={{ marginTop: 2 }}>
        <span className="chr-head">투기장 순위</span>
        <button onClick={() => setWhole(w => !w)} className="ui-press" style={{ fontSize: 11.5, padding: '3px 10px', border: `1px solid ${MS.line}`, color: PALETTE.textDim, background: 'transparent' }}>{whole ? '줄여 보기' : `전체 ${board.length}명 보기`}</button>
      </div>
      <div className="flex flex-col gap-1 flex-none">
        {shown.map(x => {
          const gapRow = prev > 0 && x.rank > prev + 1; prev = x.rank; const mine = x.id === `me_${cid}`;
          return (
            <React.Fragment key={x.id}>
              {gapRow && <div className="text-center" style={{ fontSize: 11, color: PALETTE.textDim, letterSpacing: 4 }}>···</div>}
              <div className="flex items-center gap-2" style={{ padding: '6px 9px', borderRadius: 12, border: `1px solid ${mine ? MS.gold : MS.line}`, background: x.me ? 'rgba(232,193,90,0.1)' : MS.box }}>
                <span className="flex-none text-center font-bold" style={{ width: 34, fontSize: 14, color: RANK_COLOR(x.rank) }}>{x.rank}</span>
                <Portrait cid={x.cls} size={28} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-bold" style={{ fontSize: 12.5, color: x.me ? MS.gold : PALETTE.text }}>{x.me ? `나 · ${x.name}` : x.name}</span>
                  <span className="block truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{titleOf(x)} · Lv.{x.lv}{x.rebirth ? ` · 전승 ${x.rebirth}` : ''}</span>
                </span>
                <span className="flex-none font-bold" style={{ fontSize: 13, color: PALETTE.text }}>{x.rating}<span style={{ fontSize: 11, color: PALETTE.textDim }}>점</span></span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex-none" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
        시작 점수 = {AR.ARENA.base} + (레벨 + 전승 × {AR.ARENA.rebirthPower}) × {AR.ARENA.perPower} · 이기면 오르고 지면 내려간다 (점수가 높은 상대일수록 많이 오른다).<br />
        결투는 <b style={{ color: PALETTE.text }}>자동 전투</b> · 직업·갈래별 결투 보정이 들어간다 · 캐릭터마다 하루 {AR.ARENA.daily}회 (KST 0시 초기화) · 50라운드를 넘기면 남은 체력 비율로 판정.
      </div>
      {shop && (
        <MainModal kicker="ARENA SHOP" title="투기장 상점" badge={`🏟 ${coin}`} color={MS.gold} sub={`승리 🏟 ${AR.ARENA.coinWin} (강한 상대 +${AR.ARENA.coinUpset}) · 패배 🏟 ${AR.ARENA.coinLose}`} onClose={() => setShop(false)}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {AR.ARENA_SHOP.map(it => {
              const can = AR.arenaShopCanBuy(acc, it.id);
              return (
                <button key={it.id} disabled={!can.ok} onClick={() => onArena((a) => AR.arenaBuy(a, it.id))} className="ui-press text-left" style={{ padding: '9px 10px', borderRadius: MS.r, border: `1px solid ${can.ok ? MS.gold : MS.line}`, background: MS.box, opacity: can.ok ? 1 : 0.55 }}>
                  <div className="font-bold" style={{ fontSize: 12.5, color: PALETTE.text }}>{it.name}</div>
                  <div style={{ fontSize: 11, color: PALETTE.textDim, minHeight: 30 }}>{it.desc}</div>
                  <div className="font-bold" style={{ fontSize: 12.5, color: can.ok ? MS.gold : '#ff8a7e' }}>🏟 {it.cost}{can.ok ? '' : ` · ${can.why}`}</div>
                </button>
              );
            })}
          </div>
        </MainModal>
      )}
    </>
  );
}

export function RivalView({ acc, onBack, onAct, top = 'rank', onTop, onFight, onArena }) {
  const [tab, setTab] = useState('all');
  const [sel, setSel] = useState(null);
  const [whole, setWhole] = useState(false);
  const [monthPick, setMonthPick] = useState(false);
  const rewardText = (r) => [r.fam ? `🐾 ${RV.rivalFamLabel(r.fam)}` : null, D.dailyRewardText(r.reward)].filter(Boolean).join(' · ');
  const monthDone = RV.rivalMonthClaimed(acc); const monthReady = RV.rivalMonthReady(acc);
  const myCls = acc.active;
  const rows = useMemo(() => RV.rivalBoard(acc, tab === 'cls' ? myCls : null), [acc, tab, myCls]);
  const best = useMemo(() => RV.myBestRank(acc), [acc]);
  const claimed = RV.rivalWeekClaimed(acc);
  const tier = best ? RV.rivalRewardFor(best.rank) : null;
  const ticks = RV.rivalTicks(acc);
  // 기본은 상위 10 + 내 캐릭터 주변(±3) — 「전체 보기」로 펼친다
  const shown = useMemo(() => {
    if (whole) return rows;
    const keep = new Set();
    rows.forEach((x, i) => { if (i < 10) keep.add(i); if (x.me) for (let d = -3; d <= 3; d++) if (rows[i + d]) keep.add(i + d); });
    return rows.filter((_, i) => keep.has(i));
  }, [rows, whole]);
  const selRow = sel && rows.find(x => x.id === sel);
  const selDef = selRow && !selRow.me ? RV.RIVALS.find(r => r.id === selRow.id) : null;
  let prevRank = 0;
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={top === 'arena' ? '투기장' : '경쟁자 순위'} onBack={onBack} right={<span style={{ fontSize: 11.5, color: PALETTE.textDim }}>내 전투 {ticks.toLocaleString()}회 기준</span>} />
      <div className="px-3 pt-1 flex-none">
        <MainTabs value={top} onChange={(v) => onTop?.(v)} items={[['rank', '성장 순위'], ['arena', '🏟 투기장', AR.arenaLeft(acc) > 0]]} />
      </div>
      {top !== 'arena' && <div className="px-3 pt-1 flex-none">
        <MainTabs value={tab} onChange={setTab} items={[['all', '통합 순위'], ['cls', `${chronicleClass(myCls).name} 순위`]]} />
      </div>}
      {top === 'arena' && <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-2"><ArenaPanel acc={acc} onFight={onFight} onArena={onArena} /></div>}
      {top !== 'arena' && <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-2">
        {best && (
          <div className="chr-glass flex-none" style={{ '--edge': MS.gold, padding: 12, borderRadius: MS.r, marginTop: 8 }}>
            <div className="flex items-center gap-3">
              <Portrait cid={best.row.cls} size={46} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>내 최고 순위 (통합)</div>
                <div className="font-bold" style={{ fontSize: 20, color: RANK_COLOR(best.rank) }}>{best.rank}위 <span style={{ fontSize: 12, color: PALETTE.textDim }}>/ {best.total}명</span></div>
                <div style={{ fontSize: 11.5, color: PALETTE.text }}>{best.above ? <>바로 위 「{best.above.name}」까지 <b style={{ color: MS.gold }}>{best.gap}점</b></> : '정상에 섰다'}</div>
              </div>
            </div>
            <button disabled={claimed} onClick={() => onAct((a) => RV.claimRivalWeek(a))} className="ui-press w-full mt-2 chr-btn-pri" style={{ height: 40, fontSize: 13, fontWeight: 800, opacity: claimed ? 0.45 : 1 }}>
              {claimed ? '이번 주 순위 보상 받음 (월요일 0시 초기화)' : `이번 주 순위 보상 받기 — ${tier.label}`}
            </button>
            {!claimed && <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{rewardText(tier)} · 주 1회, 받는 순간의 순위 기준</div>}
            <button disabled={!monthReady} onClick={() => setMonthPick(true)} className="ui-press w-full mt-2" style={{ height: 38, fontSize: 12.5, fontWeight: 800, border: `1px solid ${monthReady ? MS.violet : MS.line}`, background: monthReady ? 'rgba(208,122,232,0.16)' : 'transparent', color: monthReady ? MS.violet : PALETTE.textDim }}>
              {monthDone ? '이번 달 1위 보상 받음' : monthReady ? '👑 월간 1위 보상 — 자령 고르기' : '👑 월간 1위 보상 — 통합 1위일 때 자령 선택권 (월 1회)'}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between flex-none" style={{ marginTop: 2 }}>
          <span className="chr-head">순위표</span>
          <button onClick={() => setWhole(w => !w)} className="ui-press" style={{ fontSize: 11.5, padding: '3px 10px', border: `1px solid ${MS.line}`, color: PALETTE.textDim, background: 'transparent' }}>{whole ? '줄여 보기' : `전체 ${rows.length}명 보기`}</button>
        </div>
        <div className="flex flex-col gap-1 flex-none">
          {shown.map(x => {
            const gapRow = prevRank > 0 && x.rank > prevRank + 1; prevRank = x.rank;
            const c = chronicleClass(x.cls);
            return (
              <React.Fragment key={x.id}>
                {gapRow && <div className="text-center" style={{ fontSize: 11, color: PALETTE.textDim, letterSpacing: 4 }}>···</div>}
                <button onClick={() => setSel(x.id)} className="ui-press flex items-center gap-2 text-left" style={{ padding: '7px 9px', borderRadius: 12, border: `1px solid ${x.me ? MS.gold : MS.line}`, background: x.me ? 'rgba(232,193,90,0.12)' : MS.box }}>
                  <span className="flex-none text-center font-bold" style={{ width: 34, fontSize: 14, color: RANK_COLOR(x.rank) }}>{x.rank}</span>
                  <Portrait cid={x.cls} size={30} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-bold" style={{ fontSize: 13, color: x.me ? MS.gold : PALETTE.text }}>{x.me ? `나 · ${x.name}` : x.name}</span>
                    <span className="block truncate" style={{ fontSize: 11, color: c.color }}>{titleOf(x)} <span style={{ color: PALETTE.textDim }}>· Lv.{x.lv}{x.rebirth ? ` · 전승 ${x.rebirth}` : ''}{x.tower ? ` · 첨탑 ${x.tower}층` : ''}</span></span>
                  </span>
                  <span className="flex-none font-bold" style={{ fontSize: 13, color: PALETTE.text }}>{x.score}<span style={{ fontSize: 11, color: PALETTE.textDim }}>점</span></span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <MainSecHead title="순 위 보 상 (주 1회)" />
        <MainKvRows rows={[...RV.RIVAL_REWARDS.map(r => ({ l: r.label, v: rewardText(r), c: tier && r.label === tier.label ? MS.gold : undefined })), { l: '월간 1위', v: '🐾 자령 선택권 1장', c: MS.violet }]} />
        <div className="flex-none" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
          점수 = 전승 횟수 × {RV.RIVAL_TUNING.scorePerRebirth} + 레벨 + 첨탑 최고층 ÷ {RV.RIVAL_TUNING.towerDiv}<br />
          경쟁자 {RV.RIVALS.length}명은 <b style={{ color: PALETTE.text }}>내가 전투한 만큼만</b> 성장한다 — 쉬는 동안에는 순위가 바뀌지 않는다.
        </div>
      </div>}
      {monthPick && (
        <MainModal kicker="MONTHLY No.1" title="자령 선택" color={MS.violet} sub="이번 달 1위 보상 — 원하는 자령 1마리 · 이미 가진 자령은 사역혼 100" onClose={() => setMonthPick(false)}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {RV.rivalMonthChoices(acc).map(k => {
              const have = acc.fams?.[k]; const role = F.FAM_ROLES[F.famRole(k)];
              return (
                <button key={k} onClick={() => { onAct((a) => RV.claimRivalMonth(a, k)); setMonthPick(false); }} className="ui-press text-left overflow-hidden" style={{ borderRadius: 12, border: `1.5px solid ${have?.grade === 'violet' ? MS.line : MS.violet}`, background: MS.box, padding: 0 }}>
                  <img src={chronicleEnemyArt(k)} alt="" className="w-full object-cover" style={{ height: 64, display: 'block' }} />
                  <div style={{ padding: '5px 8px' }}>
                    <div className="truncate font-bold" style={{ fontSize: 12.5, color: MS.violet }}>{F.famName(k)}</div>
                    <div style={{ fontSize: 11, color: PALETTE.textDim }}>{role.icon} {role.label}{have?.grade === 'violet' ? ' · 보유 (사역혼)' : have ? ' · 자령으로 승급' : ' · 새로 얻음'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </MainModal>
      )}
      {selRow && (
        <MainModal kicker={selRow.me ? 'MY CHARACTER' : 'RIVAL'} title={selRow.me ? selRow.name : selRow.name} badge={`${selRow.rank}위`} color={chronicleClass(selRow.cls).color} img={chronicleClass(selRow.cls).image} sub={`${titleOf(selRow)} · 점수 ${selRow.score}`} onClose={() => setSel(null)}>
          <MainKvRows rows={[
            { l: '레벨', v: `Lv.${selRow.lv}` }, { l: '전승', v: `${selRow.rebirth}회`, c: selRow.rebirth ? MS.gold : undefined },
            { l: '첨탑 최고층', v: selRow.tower ? `${selRow.tower}층` : '미도전' }, { l: '이 캐릭터의 전투', v: `${selRow.battles.toLocaleString()}회` },
            ...(selDef ? [
              { l: '갈래', v: REBIRTH_BRANCHES[selDef.branch]?.name || '-', c: REBIRTH_BRANCHES[selDef.branch]?.color },
              { l: '성향', v: RV.RIVAL_STYLES.find(s => s.id === selDef.style).name },
              { l: '육성', v: RV.RIVAL_BUILDS[selDef.build] }, { l: '사역마', v: RV.RIVAL_FAMS[selDef.fam][1] },
            ] : []),
          ]} />
          {selDef && <div className="mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.5 }}>{RV.RIVAL_STYLES.find(s => s.id === selDef.style).desc}. 내가 전투 100회를 하면 이 경쟁자는 약 <b style={{ color: PALETTE.text }}>{Math.round(selDef.pace * 100)}회</b>를 이 캐릭터에 쓴다.</div>}
        </MainModal>
      )}
    </div>
  );
}
