// ============================================
// chronicle/screens/quest.jsx — 황혼 연대기 · 의뢰 게시판 · 일일/주간 임무
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import * as E from '../engine.js';
import * as Q from '../quest.js';
import * as D from '../daily.js';
import { Header, Wallet, Bar, Portrait, MainTabs, MS } from './common.jsx';

// ===== 의뢰 게시판 =====
const Q_KIND = { main: { label: '메인', color: '#e8b04a' }, side: { label: '의뢰', color: '#9cc4e4' }, companion: { label: '동료', color: '#9fd18a' } };

// 1.252.0 — 본편 스타일 (시안 ㉕)
function QuestCard({ save, item, onAccept, onClaim, onAbandon }) {
  const { q, status, prog } = item;
  const k = Q_KIND[q.kind];
  const done = status === 'done';
  const btn = (label, onClick, hot) => (
    <button onClick={onClick} className="ui-press flex-none" style={{ fontSize: 12, padding: '4px 11px', fontWeight: hot ? 800 : 500, border: `1px solid ${hot ? MS.red : MS.line}`, background: hot ? 'rgba(224,87,76,0.22)' : 'transparent', color: hot ? '#ff8a7e' : PALETTE.text }}>{label}</button>
  );
  return (
    <div style={{ padding: '9px 10px', background: MS.box, borderRadius: MS.r, border: `1px solid ${done ? MS.gold : MS.line}`, opacity: status === 'claimed' ? 0.6 : 1 }}>
      <div className="flex items-center gap-2">
        <span className="flex-none" style={{ fontSize: 11, padding: '1px 7px', color: k.color, border: `1px solid ${k.color}88` }}>{k.label}</span>
        <span className="flex-1 font-bold truncate" style={{ fontSize: 13.5, color: PALETTE.text }}>{q.title}</span>
        {q.kind === 'companion' && <Portrait cid={q.req.companion} size={24} />}
        {status === 'available' && btn('수락', onAccept)}
        {done && btn('받기', onClaim, true)}
        {status === 'active' && q.kind !== 'main' && onAbandon && btn('포기', onAbandon)}
      </div>
      <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.desc}</div>
      {(status === 'active' || done) && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1"><Bar v={prog.cur} max={prog.max} color={done ? MS.gold : '#7fa8d8'} h={4} /></div>
          <span style={{ fontSize: 11.5, color: done ? MS.gold : PALETTE.text, fontWeight: 700 }}>{Math.max(0, prog.cur)}/{prog.max}</span>
        </div>
      )}
      <div className="mt-1" style={{ fontSize: 11.5, color: MS.gold }}>{Q.rewardText(q.reward)}</div>
    </div>
  );
}

export function QuestView({ save, setSave, onBack, flash, onReplay, autoAccept, onAutoAccept }) {
  const [tab, setTab] = useState('board');
  const list = Q.questList(save);
  const mainFirst = (a, b) => (a.q.kind === 'main' ? -1 : 0) - (b.q.kind === 'main' ? -1 : 0);
  const done = list.filter(x => x.status === 'done').sort(mainFirst);
  const active = list.filter(x => x.status === 'active').sort(mainFirst);
  const avail = list.filter(x => x.status === 'available').sort(mainFirst);
  const claimed = list.filter(x => x.status === 'claimed');
  const seen = Q.seenScenes(save);
  const card = (item) => (
    <QuestCard key={item.q.id} save={save} item={item}
      onAccept={() => { setSave(Q.acceptQuest(save, item.q.id)); flash(`「${item.q.title}」 수락`); }}
      onAbandon={() => setSave(Q.abandonQuest(save, item.q.id))}
      onClaim={() => {
        const r = Q.claimQuest(save, item.q.id, Math.random);
        setSave(r.save);
        flash(r.gained?.item ? `보상 수령 — ${E.itemName(r.gained.item)} 획득` : r.gained?.keysGot ? `보상 수령 — 🗝 열쇠 +${r.gained.keysGot}` : '보상 수령!');
      }} />
  );
  const bulk = (label, onClick, hot) => (
    <button onClick={onClick} className="ui-press" style={{ fontSize: 12, padding: '3px 11px', fontWeight: 800, border: `1px solid ${hot ? MS.red : MS.gold}`, background: hot ? 'rgba(224,87,76,0.22)' : 'rgba(232,176,74,0.12)', color: hot ? '#ff8a7e' : MS.gold }}>{label}</button>
  );
  const sec = (title, n, btn) => (
    <div className="flex items-center justify-between" style={{ margin: '10px 0 5px' }}>
      <span className="chr-head">{title} <span style={{ letterSpacing: 0, fontSize: 11.5, color: PALETTE.textDim, fontWeight: 400 }}>{n}</span></span>
      {btn || null}
    </div>
  );
  const claimAll = () => {
    const r = Q.claimAllQuests(save, Math.random);
    if (!r.n) return;
    setSave(r.save);
    flash(`의뢰 보상 ${r.n}건 수령${r.items.length ? ` — 장비 ${r.items.length}개` : ''}${r.keys ? ` · 🗝 열쇠 +${r.keys}` : ''}`);
  };
  const acceptAll = () => {
    const r = Q.acceptAllQuests(save);
    if (!r.n) return;
    setSave(r.save);
    flash(`의뢰 ${r.n}건 수락`);
  };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="의뢰 게시판" onBack={onBack} right={<Wallet save={save} />} />
      <div className="px-3 pt-1 flex-none">
        <MainTabs value={tab} onChange={setTab} items={[['board', `게시판 ${done.length + active.length + avail.length}`, done.length > 0], ['done', `완료 ${claimed.length}`], ['story', '지난 이야기']]} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {tab === 'board' && <>
          {done.length > 0 && <>{sec('보상 받기', done.length, bulk(`전체 받기 ${done.length}`, claimAll, true))}{done.map(card)}</>}
          {sec('진행 중', active.length)}
          {active.length ? active.map(card) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>수락한 의뢰가 없다</div>}
          {sec('받을 수 있는 의뢰', avail.length, <span className="flex items-center gap-1.5">
            <button onClick={() => onAutoAccept(!autoAccept)} className="ui-press" aria-pressed={autoAccept} style={{ fontSize: 12, padding: '3px 10px', border: `1px solid ${autoAccept ? MS.gold : MS.line}`, background: autoAccept ? 'rgba(232,176,74,0.12)' : 'transparent', color: autoAccept ? MS.gold : PALETTE.textDim }}>자동 수락 {autoAccept ? '켬' : '끔'}</button>
            {avail.length > 0 && bulk(`전체 수락 ${avail.length}`, acceptAll)}
          </span>)}
          {avail.length ? avail.map(card) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>{autoAccept ? '새 의뢰는 뜨는 즉시 자동으로 수락된다' : '지금 받을 수 있는 의뢰가 없다 — 새 지역을 열면 의뢰가 붙는다'}</div>}
        </>}
        {tab === 'done' && <div className="pt-2 flex flex-col gap-1.5">{claimed.map(item => <QuestCard key={item.q.id} save={save} item={item} />)}</div>}
        {tab === 'done' && !claimed.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 끝낸 의뢰가 없습니다</div>}
        {tab === 'story' && <div className="pt-2 flex flex-col gap-1.5">{seen.map(sc => (
          <button key={sc.id} onClick={() => onReplay(sc)} className="ui-press text-left" style={{ padding: '9px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r }}>
            <div className="flex justify-between gap-2"><span className="font-bold truncate" style={{ fontSize: 13.5, color: PALETTE.text }}>{sc.title}</span><span style={{ fontSize: 12, color: PALETTE.textDim }}>다시 보기 ›</span></div>
            <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{sc.lines[0].t}</div>
          </button>
        ))}</div>}
        {tab === 'story' && !seen.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 본 이야기가 없습니다</div>}
      </div>
    </div>
  );
}

// ===== 일일 · 주간 임무 (1.233.0 · 1.274.0 캐릭터별 일일 + 주간 + 모두 받기) =====
export function DailyView({ acc, onBack, onAct, onSwitch }) {
  const [tab, setTab] = useState('daily');
  const weekly = tab === 'weekly';
  const missions = weekly ? D.WEEKLY_MISSIONS : D.DAILY_MISSIONS;
  const st = weekly ? D.weeklyState(acc) : D.dailyState(acc);
  const bonusDef = weekly ? D.WEEKLY_BONUS : D.DAILY_BONUS;
  const allClaimed = weekly ? D.weeklyBonusReady(acc) : D.bonusReady(acc);
  const states = missions.map(m => ({ m, ms: weekly ? D.weeklyMissionState(acc, m) : D.missionState(acc, m) }));
  const fin = states.filter(x => x.ms.status !== 'progress').length;
  const left = states.filter(x => x.ms.status !== 'claimed').length;
  const dB = D.dailyBadge(acc), wB = D.weeklyBadge(acc);
  const ready = weekly ? wB : dB;
  const hot = { fontSize: 12, padding: '3px 12px', fontWeight: 800, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.22)', color: '#ff8a7e' };
  const sec = (title, right) => (
    <div className="flex items-center justify-between" style={{ margin: '12px 0 6px' }}>
      <span className="chr-head">{title}</span>
      <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{right}</span>
    </div>
  );
  const chars = Object.keys(acc.chars || {});
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="임무" onBack={onBack} right={<span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{weekly ? '매주 월요일 0시 초기화' : '매일 0시 초기화'}</span>} />
      <div className="px-3 pt-1 flex-none">
        <MainTabs value={tab} onChange={setTab} items={[['daily', '일일 임무', dB > 0], ['weekly', '주간 임무', wB > 0]]} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!weekly && chars.length > 1 && <>
          {sec('캐릭터별 오늘 진행', '누르면 그 캐릭터로 전환')}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${chars.length}, 1fr)` }}>
            {chars.map(cid => {
              const cs = D.dailyCharSummary(acc, cid);
              const on = cid === acc.active;
              return (
                <button key={cid} onClick={() => !on && onSwitch(cid)} className="ui-press flex flex-col items-center" style={{ padding: '6px 0 5px', border: `1px solid ${on ? MS.red : cs.bonus ? MS.gold : MS.line}`, background: on ? 'rgba(224,87,76,0.14)' : MS.box, position: 'relative' }}>
                  <Portrait cid={cid} size={30} />
                  <span style={{ fontSize: 11.5, marginTop: 3, fontWeight: 700, color: cs.bonus ? '#8fe08a' : cs.fin ? MS.gold : PALETTE.textDim }}>{cs.bonus ? '✔ 완주' : `${cs.fin}/${D.DAILY_MISSIONS.length}`}</span>
                  {cs.ready > 0 && <span style={{ position: 'absolute', top: 3, right: 4, width: 7, height: 7, borderRadius: 4, background: MS.gold }} />}
                </button>
              );
            })}
          </div>
        </>}
        {sec(weekly ? '이번 주 진행' : '오늘 진행', <b style={{ color: MS.gold, fontSize: 13 }}>{fin} / {states.length}</b>)}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${states.length}, 1fr)` }}>
          {states.map(({ m, ms }) => {
            const ok = ms.status !== 'progress';
            return <div key={m.id} className="text-center" style={{ padding: '6px 0', fontSize: 16, border: `1px solid ${ok ? MS.gold : MS.line}`, background: ok ? 'rgba(232,176,74,0.12)' : MS.box, opacity: ok ? 1 : 0.7 }}>{m.icon}</div>;
          })}
        </div>
        <div className="flex items-center justify-between" style={{ margin: '12px 0 6px' }}>
          <span className="chr-head">임무</span>
          {ready > 0
            ? <button onClick={() => onAct(weekly ? D.claimAllWeekly : D.claimAllDaily)} className="ui-press" style={hot}>모두 받기 {ready}</button>
            : <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{weekly ? '모든 캐릭터의 기록을 합산' : '캐릭터마다 따로 진행'}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          {states.map(({ m, ms }) => (
            <div key={m.id} style={{ padding: '9px 10px', background: MS.box, borderRadius: MS.r, border: `1px solid ${ms.status === 'done' ? MS.gold : MS.line}`, opacity: ms.status === 'claimed' ? 0.6 : 1 }}>
              <div className="flex items-center justify-between gap-2">
                <b style={{ fontSize: 13, color: PALETTE.text }}>{m.icon} {m.title}</b>
                {ms.status === 'done' ? <button onClick={() => onAct((a) => { const next = (weekly ? D.claimWeekly : D.claimDaily)(a, m.id); return { acc: next, n: next === a ? 0 : 1, reward: m.reward }; })} className="ui-press flex-none" style={hot}>받기</button>
                  : <span className="flex-none" style={{ fontSize: 12, color: ms.status === 'claimed' ? '#8fe08a' : PALETTE.textDim }}>{ms.status === 'claimed' ? '✔ 받음' : `${ms.cur}/${m.need}`}</span>}
              </div>
              <div style={{ margin: '5px 0 4px' }}><Bar v={ms.cur} max={m.need} color={ms.status === 'progress' ? '#7fa8d8' : MS.gold} h={4} /></div>
              <div className="flex justify-between" style={{ fontSize: 11.5 }}><span style={{ color: MS.gold }}>{D.dailyRewardText(m.reward)}</span>{ms.status === 'done' && <span style={{ color: PALETTE.text }}>{m.need}/{m.need}</span>}</div>
            </div>
          ))}
        </div>
        <button disabled={!allClaimed || st.bonus} onClick={() => onAct((a) => { const next = (weekly ? D.claimWeeklyBonus : D.claimDailyBonus)(a); return { acc: next, n: next === a ? 0 : 1, reward: bonusDef.reward }; })} className="ui-press w-full mt-2" style={{ padding: '12px 0', fontSize: 13.5, fontWeight: 800, border: `1px solid ${allClaimed && !st.bonus ? MS.red : MS.line}`, background: allClaimed && !st.bonus ? 'rgba(224,87,76,0.2)' : 'transparent', color: st.bonus ? '#8fe08a' : allClaimed ? '#ff8a7e' : PALETTE.textDim }}>
          🎁 모두 완료 보상 — {D.dailyRewardText(bonusDef.reward)} <span style={{ fontWeight: 400 }}>{st.bonus ? '(받음)' : allClaimed ? '' : `(${left}개 남음)`}</span>
        </button>
      </div>
    </div>
  );
}
