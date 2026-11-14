// ============================================
// chronicle/screens/rival.jsx — 황혼 연대기 · 경쟁자 순위 (1.289.0)
// ============================================
import React, { useState, useMemo } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { chronicleClass, REBIRTH_BRANCHES, CHRONICLE_SKILLS, SLOTS } from '../data.js';
import * as E from '../engine.js';
import * as TL from '../talents.js';
import { MainGearCard } from './gear.jsx';
import * as RV from '../rival.js';
import * as AR from '../arena.js';
import * as D from '../daily.js';
import * as F from '../familiar.js';
import { chronicleEnemyArt } from '../data.js';
import { Header, Portrait, MainTabs, MainModal, MainKvRows, MainSecHead, MainCell, MS } from './common.jsx';

// 경쟁자 상세 (1.293.1) — 투기장에서 실제로 싸우는 캐릭터를 그대로 보여 준다 (AR.rivalSave가 조립한 것)
const pct1 = (v) => `${Math.round((v || 0) * 1000) / 10}%`;
const RIVAL_STAT_ROWS = [
  ['치명타 확률', 'crit', pct1], ['치명타 피해', 'critMult', (v) => `×${Math.round(v * 100) / 100}`], ['회피', 'dodge', pct1],
  ['받는 피해 감소', 'dmgReduce', pct1], ['방어 무시', 'armorPen', pct1], ['스킬 피해', 'skillDmg', (v) => `+${pct1(v)}`],
  ['지속 피해', 'dotDmg', (v) => `+${pct1(v)}`], ['추가 타격', 'chain', pct1], ['반격 확률', 'counterPct', pct1],
  ['반격 피해', 'counterDmg', (v) => `+${pct1(v)}`], ['흡혈', 'lifesteal', pct1], ['회복량', 'healPct', (v) => `+${pct1(v)}`],
  ['매 턴 재생', 'regenPct', pct1], ['시작 보호막', 'startShieldPct', pct1], ['전체 재사용 감소', 'cdr', (v) => `-${v}턴`],
];
function RivalDetail({ def, st }) {
  const [tab, setTab] = useState('stat');
  const save = useMemo(() => AR.rivalSave(def, st), [def, st.lv, st.rebirth]);
  const u = save.units[def.cls];
  const d = useMemo(() => E.deriveUnit(save, def.cls), [save]);
  const m = AR.ARENA.rivalMult;
  const items = Object.keys(u.equip || {}).map(sl => save.inventory.find(it => it.uid === u.equip[sl])).filter(Boolean);
  const skills = Object.entries(u.skills || {}).map(([id, lv]) => ({ s: CHRONICLE_SKILLS[id], lv })).filter(x => x.s);
  const trees = TL.talentTrees(def.cls, u.rebirth?.branch || null).map(t => ({ t, pts: TL.treePoints(u, t.id), nodes: t.tiers.flat().filter(n => u.talents?.[n.id]) })).filter(x => x.pts > 0);
  const fk = save.famTeam?.main; const ff = fk && save.fams?.[fk];
  const famSt = ff ? F.famStats(fk, ff, u.lv, d.famPct || 0) : null;
  const famReso = ff ? F.famReso(fk, ff, u.rebirth?.branch || null, def.cls) : null;
  const famPv = ff ? F.famPassive(fk, ff) : null;
  const box = { padding: '8px 10px', background: MS.box, border: `1px solid ${MS.line}`, borderRadius: MS.r, fontSize: 12.5, lineHeight: 1.55 };
  return (
    <>
      <div className="mt-2"><MainTabs value={tab} onChange={setTab} items={[['stat', '능력치'], ['gear', '장비'], ['skill', '스킬·특성'], ['fam', '사역마']]} /></div>
      {tab === 'stat' && <>
        <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <MainCell label="HP (투기장)" value={Math.round(d.maxHp * m).toLocaleString()} />
          <MainCell label="공격력 (투기장)" value={Math.round(d.atk * m).toLocaleString()} color={MS.gold} />
          <MainCell label="방어" value={d.def.toLocaleString()} color={MS.blue} />
          <MainCell label="속도" value={d.spd} />
        </div>
        <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.5 }}>투기장에서는 경쟁자의 HP·공격력에 ×{m}이 곱해진다 (경쟁자가 따로 갖추지 않는 보조 사역마·보유 효과·인연·원정대 몫). 장비만의 값은 HP {d.maxHp.toLocaleString()} · 공격력 {d.atk.toLocaleString()}.</div>
        <MainSecHead title="기 본 능 력 치" />
        <MainKvRows rows={[['힘', 'str'], ['지능', 'int'], ['민첩', 'agi'], ['체력', 'vit']].map(([l, k]) => ({ l, v: u.stats?.[k] || 0 }))} />
        <MainSecHead title="전 투 수 치" />
        <MainKvRows rows={RIVAL_STAT_ROWS.filter(([, k]) => d[k]).map(([l, k, f]) => ({ l, v: f(d[k]) }))} />
      </>}
      {tab === 'gear' && <div className="flex flex-col gap-1.5 mt-2">
        <div style={{ ...box, fontSize: 11.5, color: PALETTE.textDim }}>⚒ 경쟁자도 <b style={{ color: MS.gold }}>내 대장간과 같은 확률</b>로 강화합니다 (실패·하락·파괴 포함). 이 경쟁자의 목표는 <b style={{ color: MS.gold }}>+{AR.rivalForgeTarget(def)}</b>입니다.</div>
        {items.map(it => { const e = AR.rivalEnhance(def, it.slot, st); return <MainGearCard key={it.uid} it={it} note={`${SLOTS.find(x => x.id === it.slot)?.label} · 강화 ${e.tries}회 시도${e.fails ? ` · 실패 ${e.fails}` : ''}${e.breaks ? ` · 파괴 ${e.breaks}` : ''}`} />; })}
        {!items.length && <div style={{ fontSize: 12, color: PALETTE.textDim }}>착용 장비 없음</div>}
      </div>}
      {tab === 'skill' && <>
        <MainSecHead title="스 킬" />
        <MainKvRows rows={skills.map(({ s, lv }) => ({ l: `${s.branch ? '✦ ' : ''}${s.name}`, v: `Lv.${lv}${s.cd ? ` · ⏱${s.cd}턴` : ' · 패시브'}`, c: s.branch ? MS.gold : undefined }))} />
        <MainSecHead title="특 성" />
        {trees.length ? trees.map(({ t, pts, nodes }) => (
          <div key={t.id} className="mt-1.5" style={box}>
            <div className="flex justify-between"><b style={{ color: t.color || MS.gold }}>{t.branch ? '✦ ' : ''}{t.name}</b><span style={{ color: MS.gold, fontWeight: 800 }}>{pts}점</span></div>
            <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{nodes.map(n => `${n.name} ${u.talents[n.id]}`).join(' · ')}</div>
          </div>
        )) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>찍은 특성 없음</div>}
        <MainSecHead title="전 승" />
        <MainKvRows rows={[{ l: '전승 횟수', v: `${u.rebirth?.count || 0}회`, c: u.rebirth?.count ? MS.gold : undefined }, { l: '갈래', v: u.rebirth?.branch ? REBIRTH_BRANCHES[u.rebirth.branch]?.name : '전승 전', c: u.rebirth?.branch ? REBIRTH_BRANCHES[u.rebirth.branch]?.color : undefined }, { l: '전승 특전', v: '없음 (경쟁자는 특전을 고르지 않는다)' }]} />
      </>}
      {tab === 'fam' && (ff ? <>
        <div className="flex gap-2.5 mt-2" style={box}>
          <img src={chronicleEnemyArt(fk)} alt="" className="flex-none object-cover" style={{ width: 56, height: 56, borderRadius: 8, border: `1px solid ${F.famGrade(ff.grade).color}` }} />
          <div className="flex-1 min-w-0">
            <b style={{ fontSize: 13.5, color: F.famGrade(ff.grade).color }}>{F.famName(fk)}{F.famPlusText(ff)}</b>
            <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{F.famGrade(ff.grade).label} · {F.FAM_ROLES[F.famRole(fk)].icon} {F.FAM_ROLES[F.famRole(fk)].label} · 동행 칸 · Lv.{F.famLv(ff)}</div>
          </div>
        </div>
        <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <MainCell label="HP (투기장)" value={Math.round(famSt.maxHp * m).toLocaleString()} />
          <MainCell label="공격력 (투기장)" value={Math.round(famSt.atk * m).toLocaleString()} color={MS.gold} />
          <MainCell label="방어" value={famSt.def.toLocaleString()} color={MS.blue} />
          <MainCell label="회복력" value={famSt.healPower.toLocaleString()} color="#8fd08a" />
        </div>
        {famReso && <div className="mt-2" style={{ ...box, borderColor: famReso.on ? '#7fe0c0aa' : MS.line }}><b style={{ color: famReso.on ? '#7fe0c0' : PALETTE.textDim }}>✦ 공명 「{famReso.name}」 {famReso.on ? '켜짐' : '꺼짐'}</b><div style={{ color: famReso.on ? PALETTE.text : PALETTE.textDim }}>{famReso.desc}</div></div>}
        {famPv && <div className="mt-2" style={box}><b style={{ color: '#c79bff' }}>◇ 고유 패시브 「{famPv.name}」</b> {famPv.desc}</div>}
        {F.famSkillInfo(fk, ff).map(sk => (
          <div key={sk.id} className="mt-2" style={box}>
            <div className="flex justify-between gap-2"><b style={{ color: sk.sig ? '#d07ae8' : MS.red }}>◇ {sk.sig ? '고유 스킬 ' : ''}「{sk.name}」</b><span style={{ fontSize: 11, color: PALETTE.textDim }}>⏱ {sk.cd}턴</span></div>
            <div>{sk.effect}</div>
          </div>
        ))}
        <div className="mt-2" style={{ fontSize: 11, color: PALETTE.textDim }}>보조 칸 사역마는 없다 (경쟁자는 동행 1마리만 데리고 다닌다).</div>
      </> : <div className="mt-2" style={{ fontSize: 12, color: PALETTE.textDim }}>사역마 없음 (Lv.20부터 동행)</div>)}
    </>
  );
}

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
          {selDef && <div className="mt-2" style={{ padding: '8px 10px', background: MS.box, border: `1px solid ${MS.line}`, borderRadius: MS.r, fontSize: 12, color: PALETTE.textDim, lineHeight: 1.55 }}>
            <b style={{ color: MS.gold }}>활동량 {Math.round(selDef.pace * 100)}%</b> — {RV.RIVAL_STYLES.find(s => s.id === selDef.style).desc}.<br />
            경쟁자는 실제 사람이 아니라서, <b style={{ color: PALETTE.text }}>내 계정 전체 전투 수</b>에 맞춰 자란다. 내가 (어느 캐릭터로든) 전투 100회를 하면 이 경쟁자는 <b style={{ color: PALETTE.text }}>{Math.round(selDef.pace * 100)}회</b> 싸운 것으로 계산한다. 이 값은 경쟁자마다 {Math.round(RV.RIVAL_TUNING.paceMin * 100)}~{Math.round(RV.RIVAL_TUNING.paceMax * 100)}%로 달라서, 높을수록 빨리 크는 경쟁자다.
          </div>}
          {selDef && <RivalDetail def={selDef} st={RV.rivalState(selDef, ticks)} />}
        </MainModal>
      )}
    </div>
  );
}
