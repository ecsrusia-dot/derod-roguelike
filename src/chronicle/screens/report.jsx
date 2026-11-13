// ============================================
// chronicle/screens/report.jsx — 황혼 연대기 · 전투 집계 · 효율 기록 · 미리보기 · ×4 이용권
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useMemo, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { UIButton, BottomSheet } from '../../components/ui/CommonUI.jsx';
import { GRADES, BOOST, chronicleClass } from '../data.js';
import * as E from '../engine.js';
import * as P from '../preview.js';
import { Bar, UnitIcon, MainKvRows, MainTabs, MS, MainSecHead, MainModal } from './common.jsx';

// ===== 효율 미리보기 (1.232.0) — 바꾸기 전에 같은 적 200전씩 계산해 비교 (저장은 안 바뀜) =====
export const LAST_HUNT_KEY = 'chronicleLastHunt';

export function readLastHunt() { try { return JSON.parse(localStorage.getItem(LAST_HUNT_KEY) || 'null'); } catch { return null; } }

const PREVIEW_ROWS = [
  { k: 'winRate', label: '승률', fmt: (v) => `${Math.round(v * 100)}%`, better: 1 },
  { k: 'hpLeft', label: '남는 HP (승리 시)', fmt: (v) => `${Math.round(v * 100)}%`, better: 1 },
  { k: 'secPerBattle', label: '전투 1회 시간', fmt: (v) => `${v.toFixed(1)}초`, better: -1 },
  { k: 'expPerMin', label: '⭐ 경험치/분', fmt: (v) => Math.round(v).toLocaleString(), better: 1, pct: true },
  { k: 'goldPerMin', label: '🪙 골드/분', fmt: (v) => Math.round(v).toLocaleString(), better: 1, pct: true },
];

export function PreviewSheet({ save, after, title, onClose }) {
  const target = useMemo(() => P.previewTarget(save, readLastHunt()), [save]);
  const speed = readSpeedPref(E.boostLeftMs(save));
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!target) return undefined;
    setRes(null);
    const t = setTimeout(() => setRes(P.previewCompare(save, after, target, { speed })), 30);
    return () => clearTimeout(t);
  }, [save, after, target, speed]);
  const same = after === save;
  const delta = (row) => {
    const a = res.before[row.k], b = res.after[row.k];
    const d = b - a;
    const noise = row.pct ? Math.abs(a) * 0.03 : row.k === 'secPerBattle' ? 0.05 : 0.01;
    if (Math.abs(d) <= noise) return { mark: '=', color: PALETTE.textDim, txt: '' };
    const good = d * row.better > 0;
    return { mark: good ? '▲' : '▼', color: good ? '#8fe08a' : '#e06a5f', txt: row.pct && a ? ` ${d > 0 ? '+' : ''}${Math.round(d / a * 100)}%` : '' };
  };
  const verdict = res && (() => {
    const e = res.after.expPerMin - res.before.expPerMin;
    const w = res.after.winRate - res.before.winRate;
    if (res.after.winRate < 0.9 && w < -0.005) return { t: '⚠ 패배가 늘어납니다 — 반복 사냥이 끊길 수 있어요', c: '#e06a5f' };
    if (Math.abs(e) <= Math.abs(res.before.expPerMin) * 0.03 && Math.abs(w) <= 0.005) return { t: '효율 차이가 거의 없습니다', c: PALETTE.textDim };
    return e > 0 ? { t: `✔ 바꾸면 사냥 효율이 오릅니다 (경험치/분 +${Math.round(e / Math.max(1, res.before.expPerMin) * 100)}%)`, c: '#8fe08a' } : { t: `✖ 지금이 더 효율적입니다 (경험치/분 ${Math.round(e / Math.max(1, res.before.expPerMin) * 100)}%)`, c: '#e06a5f' };
  })();
  return (
    <BottomSheet title="📊 효율 미리보기" onClose={onClose} maxHeight="80%">
      <div className="text-center font-semibold" style={{ fontSize: 13, color: PALETTE.text }}>{title}</div>
      {target && <div className="text-center" style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: 2 }}>📍 {target.field.name} {target.stage + 1} {target.fromLast ? '(마지막 사냥)' : '(열린 최고 스테이지)'} · 같은 적 {P.PREVIEW.battles}전씩 · ×{speed} 재생 기준</div>}
      {!target && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>비교할 사냥터가 없습니다</div>}
      {target && same && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>지금과 같은 상태라 비교할 것이 없습니다</div>}
      {target && !same && !res && <div className="text-center py-8" style={{ fontSize: 12.5, color: PALETTE.textDim }}>계산 중…</div>}
      {target && !same && res && (
        <>
          <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', columnGap: 10, rowGap: 5, fontSize: 12.5, color: PALETTE.text, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: PALETTE.textDim }}>항목</span>
            <span style={{ fontSize: 11, color: PALETTE.textDim, textAlign: 'right' }}>지금</span>
            <span style={{ fontSize: 11, color: PALETTE.legendary, textAlign: 'right' }}>바꾸면</span>
            <span />
            {PREVIEW_ROWS.map(row => {
              const d = delta(row);
              return (
                <React.Fragment key={row.k}>
                  <span>{row.label}</span>
                  <span style={{ textAlign: 'right', color: PALETTE.textDim }}>{row.fmt(res.before[row.k])}</span>
                  <b style={{ textAlign: 'right' }}>{row.fmt(res.after[row.k])}</b>
                  <span style={{ color: d.color, fontSize: 12, whiteSpace: 'nowrap' }}>{d.mark}{d.txt}</span>
                </React.Fragment>
              );
            })}
          </div>
          {verdict && <div className="text-center mt-3 font-semibold" style={{ fontSize: 13, color: verdict.c }}>{verdict.t}</div>}
          <div className="mt-2" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.5 }}>※ 저장은 바뀌지 않습니다 · 보상은 운이라 ±3% 정도 흔들림(이 범위는 「=」로 표시) · 사냥터 일반 전투 기준 (던전·탑·보스 제외)</div>
        </>
      )}
      <UIButton variant="ghost" style={{ height: 40, marginTop: 12 }} onClick={onClose}>닫기</UIButton>
    </BottomSheet>
  );
}

// ===== 반복 사냥 보고서 (1.213.0) =====
// 전투 1회 재생 시간은 preview.js battlePlayMs (효율 미리보기와 같은 공식)
const battlePlayMs = P.battlePlayMs;

export function readSpeedPref(boostLeft) {
  let s = 2;
  try { s = +localStorage.getItem('chronicleSpeed') || 2; } catch { /* */ }
  return s === 4 && boostLeft <= 0 ? 2 : s;
}

export function huntRecord(sim, party, enc, summary, speed = 2, label = '') {
  const dmg = E.battleDamageStats(sim, party);
  const salv = {};
  for (const src of [summary.autoSalvage, summary.dismantleLoot]) for (const [k, v] of Object.entries(src || {})) salv[k] = (salv[k] || 0) + v;
  const hero = party.find(p => !p.fam);
  const fam = party.find(p => p.fam);
  const units = {};
  for (const p of party) units[p.id] = { id: p.id, name: p.name, fam: !!p.fam, famKey: p.famKey, classId: p.classId, dmg: dmg.byUnit[p.id] || 0, heal: dmg.healBy[p.id] || 0, shield: dmg.shieldBy[p.id] || 0, taken: dmg.takenBy[p.id] || 0 };
  return {
    win: sim.result === 'win', type: enc.type, rounds: dmg.rounds,
    kills: sim.result === 'win' ? enc.enemies.reduce((m, e) => ({ ...m, [e.tier]: (m[e.tier] || 0) + 1 }), {}) : {},
    units, skills: dmg.bySkill, detail: E.battleDetailStats(sim, party),
    exp: summary.exp || 0, gold: summary.gold || 0, essence: summary.essence || 0, famShards: summary.famShards || 0, famSouls: summary.famSouls || 0, talentScroll: summary.talentScroll || 0,
    shard: summary.shard || 0, keys: summary.keys || 0, famExp: summary.famExp?.gained || 0, salv,
    salvaged: (summary.autoSalvaged || 0) + (summary.autoDismantled || 0),
    items: (summary.items || []).map(i => i.grade), levelUps: Object.keys(summary.levelUps || {}).length,
    ms: battlePlayMs(sim, speed), speed, label,
    setup: { classId: hero?.classId, lv: hero?.lv, famKey: fam?.famKey || null, famName: fam?.name || null },
  };
}

export function newHuntStats() {
  return { battles: 0, wins: 0, losses: 0, rounds: 0, types: {}, kills: {}, units: {}, skills: {}, detail: { units: {}, skills: {} }, exp: 0, gold: 0, essence: 0, famShards: 0, talentScroll: 0, shard: 0, keys: 0, famExp: 0, salv: {}, salvaged: 0, items: {}, levelUps: 0, ms: 0, speeds: {}, places: {}, setup: null, startedAt: Date.now() };
}

export function addHuntRecord(st, r) {
  st.battles += 1; if (r.win) st.wins += 1; else st.losses += 1;
  st.rounds += r.rounds;
  st.types[r.type] = (st.types[r.type] || 0) + 1;
  for (const [k, v] of Object.entries(r.kills)) st.kills[k] = (st.kills[k] || 0) + v;
  for (const u of Object.values(r.units)) {
    const key = u.fam ? `fam:${u.famKey}` : u.id;
    const cur = st.units[key] || { ...u, dmg: 0, heal: 0, shield: 0, taken: 0, rounds: 0 };
    cur.dmg += u.dmg; cur.heal = (cur.heal || 0) + (u.heal || 0); cur.shield = (cur.shield || 0) + (u.shield || 0); cur.taken = (cur.taken || 0) + (u.taken || 0); cur.rounds += r.rounds;
    st.units[key] = cur;
  }
  // 상세 통계 (1.238.0) — 유닛 키를 사역마 종류 기준(fam:키)으로 바꿔 합친다
  if (r.detail) {
    const ukey = (id) => { const u = r.units[id]; return u?.fam ? `fam:${u.famKey}` : id; };
    const d = {
      units: Object.fromEntries(Object.entries(r.detail.units).map(([id, v]) => [ukey(id), v])),
      skills: Object.fromEntries(Object.entries(r.detail.skills).map(([k, v]) => { const [id, sn] = k.split('|'); return [`${ukey(id)}|${sn}`, v]; })),
    };
    st.detail = E.mergeDetailStats(st.detail, d);
  }
  for (const [k, v] of Object.entries(r.skills)) {
    const [id, sn] = k.split('|');
    const u = r.units[id];
    const key = `${u?.fam ? `fam:${u.famKey}` : id}|${sn}`;
    st.skills[key] = (st.skills[key] || 0) + v;
  }
  st.exp += r.exp; st.gold += r.gold; st.essence += r.essence; st.famShards += r.famShards; st.famSouls = (st.famSouls || 0) + (r.famSouls || 0); st.talentScroll = (st.talentScroll || 0) + (r.talentScroll || 0); st.levelUps += r.levelUps;
  st.shard = (st.shard || 0) + (r.shard || 0); st.keys = (st.keys || 0) + (r.keys || 0); st.famExp = (st.famExp || 0) + (r.famExp || 0); st.salvaged = (st.salvaged || 0) + (r.salvaged || 0);
  st.salv = st.salv || {}; for (const [k, v] of Object.entries(r.salv || {})) st.salv[k] = (st.salv[k] || 0) + v;
  st.ms = (st.ms || 0) + (r.ms || 0);
  st.speeds = st.speeds || {}; if (r.speed) st.speeds[r.speed] = (st.speeds[r.speed] || 0) + 1;
  st.places = st.places || {}; if (r.label) st.places[r.label] = (st.places[r.label] || 0) + 1;
  if (r.setup) st.setup = r.setup;
  for (const g of r.items) st.items[g] = (st.items[g] || 0) + 1;
}

const TIER_LABEL = { normal: '일반 몹', elite: '강적', boss: '보스' };

export function HuntReport({ report: r, onClose, title = '📊 사냥 보고서' }) {
  // 1.255.0 — 본편 카드 창 (시안 ㉞)
  const units = Object.entries(r.units).map(([key, u]) => ({ key, ...u })).sort((a, b) => b.dmg - a.dmg);
  const total = units.reduce((t, u) => t + u.dmg, 0) || 1;
  const dUnits = r.detail?.units || {};
  const tAll = Object.values(dUnits).reduce((t, x) => t + (x.targeted || 0), 0);
  const atkShare = (k) => (Object.keys(dUnits).length > 1 && tAll && dUnits[k]?.targeted ? pctTxt(dUnits[k].targeted, tAll) : null);
  const skills = Object.entries(r.skills).map(([k, v]) => { const [uk, sn] = k.split('|'); return { uk, sn, v }; }).sort((a, b) => b.v - a.v).slice(0, 6);
  const ms = r.ms || Math.max(60000, (r.endedAt || Date.now()) - r.startedAt);
  const [effOpen, setEffOpen] = useState(false);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('chronicleReportTab') || 'sum'; } catch { return 'sum'; } });
  const pickTab = (t) => { setTab(t); try { localStorage.setItem('chronicleReportTab', t); } catch { /* */ } };
  const hasDetail = !!r.detail && Object.keys(r.detail.units || {}).length > 0;
  const kills = ['normal', 'elite', 'boss'].reduce((t, k) => t + (r.kills[k] || 0), 0);
  const one = r.battles === 1;
  const badge = one ? (r.wins ? '승리' : '패배') : `${r.wins}승 ${r.losses}패`;
  const cleanTitle = String(title).replace(/^\S+\s/, '');
  const cell = (l, v, c) => (
    <div className="text-center" style={{ padding: '5px 0', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r }}>
      <div style={{ fontSize: 11, color: PALETTE.textDim }}>{l}</div><b style={{ fontSize: 13.5, color: c || PALETTE.text }}>{v}</b>
    </div>
  );
  const th = { fontSize: 11, color: PALETTE.textDim, textAlign: 'right' };
  return (
    <MainModal kicker="BATTLE REPORT" title={cleanTitle} badge={badge} color={one && !r.wins ? '#e06a5f' : MS.red} sub={<SetupLine r={r} />} onClose={onClose}
      footer={tab !== 'detail' ? <button onClick={() => setEffOpen(true)} className="ui-press" style={{ height: 40, fontSize: 13, border: `1px solid ${MS.gold}`, background: 'transparent', color: MS.gold }}>📈 효율 기록 비교</button> : null}>
      {hasDetail && <MainTabs value={tab} onChange={pickTab} items={[['sum', '📊 요약'], ['detail', '📈 상세 통계']]} />}
      {hasDetail && tab === 'detail' ? <DetailReport r={r} /> : <>
        <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {cell('전투', `${r.battles}회`)}{cell('라운드', r.rounds)}{cell('시간', fmtDur(ms))}{cell('처치', kills, MS.gold)}
        </div>
        {(r.kills.elite || r.kills.boss || r.types.gate) ? <div className="mt-1.5"><MainKvRows rows={[
          ...['normal', 'elite', 'boss'].filter(t => r.kills[t]).map(t => ({ l: `${TIER_LABEL[t]} 처치`, v: `${r.kills[t]}마리` })),
          ...(r.types.gate ? [{ l: '관문 전투', v: `${r.types.gate}회` }] : []),
        ]} /></div> : null}
        <MainSecHead title="기 여 도" />
        <div className="flex flex-col gap-2 mt-1">
          {units.map((u) => {
            const pct = Math.round(u.dmg / total * 100);
            const dps = Math.round(u.dmg / Math.max(1, u.rounds));
            const col = u.fam ? MS.violet : MS.gold;
            return (
              <div key={u.key} className="flex items-center gap-2">
                <UnitIcon u={u} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2" style={{ fontSize: 12.5 }}><b className="truncate" style={{ color: PALETTE.text }}>{u.fam ? `🐾 ${u.name}` : u.name}</b><b className="flex-none" style={{ color: col }}>{pct}% · {u.dmg.toLocaleString()}</b></div>
                  <Bar v={u.dmg} max={total} color={col} h={5} />
                  <div style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.45 }}>
                    라운드당 {dps.toLocaleString()}
                    {u.heal > 0 && <span style={{ color: '#8fe08a' }}> · ✚ 회복 {Math.round(u.heal).toLocaleString()}</span>}
                    {u.shield > 0 && <span style={{ color: '#9cc4e4' }}> · ◈ 보호막 {Math.round(u.shield).toLocaleString()}</span>}
                    {u.taken > 0 && <span style={{ color: MS.gold }}> · 🛡 받아낸 피해 {Math.round(u.taken).toLocaleString()}</span>}
                    {atkShare(u.key) ? <span style={{ color: MS.gold }}> · 적 공격의 {atkShare(u.key)} 받음</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {skills.length > 0 && <>
          <MainSecHead title="스 킬 별 피 해" />
          <MainKvRows rows={skills.map(x => ({ l: `${x.sn}${r.units[x.uk]?.fam ? ' 🐾' : ''}`, v: <>{x.v.toLocaleString()} <span style={{ fontWeight: 400, color: PALETTE.textDim }}>{Math.round(x.v / total * 100)}%</span></> }))} />
        </>}
        {(r.wins > 0 || r.battles > 1) && <>
          <MainSecHead title="획 득 · 분 당 효 율" right={<span style={{ fontSize: 11, color: PALETTE.textDim }}>{speedText(r)} 재생 기준</span>} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', columnGap: 12, rowGap: 3, fontSize: 12.5, color: PALETTE.text, alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ ...th, textAlign: 'left' }}>항목</span><span style={th}>총량</span><span style={{ ...th, color: MS.gold }}>분당</span><span style={th}>전투당</span>
            {gainRows(r).map(g => (
              <React.Fragment key={g.k}>
                <span>{g.icon} {g.label}{g.sub ? <span style={{ fontSize: 11, color: PALETTE.textDim }}> {g.sub}</span> : null}</span>
                <b style={{ textAlign: 'right' }}>{fmtNum(g.v)}</b>
                <b style={{ textAlign: 'right', color: MS.gold }}>{fmtNum(g.v * 60000 / ms)}</b>
                <span style={{ textAlign: 'right', color: PALETTE.textDim }}>{fmtNum(g.v / Math.max(1, r.battles))}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="mt-1"><MainKvRows rows={[
            ...(r.levelUps ? [{ l: '레벨 업', v: `▲ ${r.levelUps}`, c: MS.gold }] : []),
            { l: '장비 (보관)', wide: true, v: Object.keys(r.items).length ? GRADES.filter(g => r.items[g.id]).map(g => <span key={g.id} style={{ color: g.color, marginLeft: 6 }}>{g.label} {r.items[g.id]}</span>) : '없음' },
          ]} /></div>
          {r.salvaged ? <div style={{ fontSize: 11, color: PALETTE.textDim }}>자동 분해 {r.salvaged}개 — 분해로 얻은 재화는 위 골드·정수·파편에 포함</div> : null}
          <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 4, lineHeight: 1.5 }}>분당 = 전투 재생 시간(다음 전투 대기 1.8초 포함) 기준 · 배속이 다르면 분당 값도 달라지므로 비교는 같은 배속끼리</div>
        </>}
      </>}
      {effOpen && <EfficiencyLog onClose={() => setEffOpen(false)} />}
    </MainModal>
  );
}

// ===== 상세 통계 탭 (1.238.0) — engine battleDetailStats 집계를 유닛별·스킬별로 =====
const pctTxt = (a, b) => (b > 0 ? `${Math.round(a / b * 1000) / 10}%` : '-');

function detailSections(d, rounds, share = null) {
  const hitTry = d.landed + d.misses;
  const defTry = d.timesHit + d.dodged;
  return [
    { title: '⚔ 공격', color: PALETTE.legendary, rows: [
      ['총 피해', d.dmg, true], ['라운드당 피해', d.dmg / Math.max(1, rounds), true, 'r'], ['최대 일격', d.maxHit, true, 'x'],
      ['적중', d.landed], ['치명타', d.crits, true, '', `치명률 ${pctTxt(d.crits, d.landed)}`], ['치명타 피해', d.critDmg, false, '', `전체의 ${pctTxt(d.critDmg, d.dmg)}`],
      ['빗나감', d.misses, true, '', `명중률 ${pctTxt(d.landed, hitTry)}`],
      ['반격', d.counters, false, '', d.counterDmg ? `피해 ${fmtNum(d.counterDmg)}` : ''], ['추가타', d.chains, false, '', d.chainDmg ? `피해 ${fmtNum(d.chainDmg)}` : ''],
      ['지속 피해', d.dotDmg], ['신성 피해', d.holyDmg], ['반사 피해', d.reflectDmg], ['처치', d.kills, true],
    ] },
    { title: '🎯 행동', color: '#d0c8b8', rows: [
      ['행동', d.acts, true], ['스킬 사용', d.skillUses, true, '', `스킬 비중 ${pctTxt(d.skillUses, d.acts)}`], ['기본 공격', d.basicUses, true],
      ['강화 부여', d.buffs], ['약화 부여', d.debuffs],
    ] },
    { title: '✚ 지원', color: '#8fe08a', rows: [
      ['회복', d.heal, false, '', d.overheal ? `초과 회복 ${fmtNum(d.overheal)} (낭비 ${pctTxt(d.overheal, d.heal + d.overheal)})` : ''],
      ['지속 회복', d.hotHeal], ['최대 1회 회복', d.maxHeal, false, 'x'], ['보호막 부여', d.shield],
    ] },
    { title: '🛡 방어', color: '#e8b04a', rows: [
      ['공격받은 횟수', d.targeted || 0, true, '', share ? `적 공격의 ${share.atk} · 들어온 피해의 ${share.dmg}` : ''],
      ['들어온 피해', d.incoming ?? d.taken + d.absorbed, true, '', '보호막에 막힌 양 포함'],
      ['HP로 받은 피해', d.taken, true], ['피격', d.timesHit, true, '', '보호막에 전부 막힌 타격 포함'], ['회피', d.dodged, true, '', `회피율 ${pctTxt(d.dodged, defTry)}`],
      ['최대 피격', d.maxTaken, false, 'x'], ['보호막 흡수', d.absorbed, false, '', d.absorbed ? `들어온 피해의 ${pctTxt(d.absorbed, d.absorbed + d.taken)} 막음` : ''],
      ['대신 맞기', d.coverHits, false, '', d.coverDmg ? `피해 ${fmtNum(d.coverDmg)}` : ''], ['지속 피해 받음', d.dotTaken],
      ['받은 회복', d.healRecv], ['받은 보호막', d.shieldRecv], ['쓰러짐', d.deaths, true],
    ] },
  ];
}

function DetailReport({ r }) {
  const units = Object.entries(r.units).map(([key, u]) => ({ key, ...u })).sort((a, b) => (a.fam ? 1 : 0) - (b.fam ? 1 : 0));
  const [sel, setSel] = useState(units[0]?.key);
  const u = units.find(x => x.key === sel) || units[0];
  const d = r.detail.units[u?.key];
  const n = Math.max(1, r.battles);
  const rounds = u?.rounds || r.rounds || 1;
  const skills = Object.entries(r.detail.skills)
    .filter(([k]) => k.split('|')[0] === u?.key)
    .map(([k, v]) => ({ sn: k.split('|').slice(1).join('|'), ...v }))
    .sort((a, b) => (b.dmg + b.heal + b.shield) - (a.dmg + a.heal + a.shield) || b.uses - a.uses);
  const cell = { fontSize: 12, color: PALETTE.text, textAlign: 'right' };
  const head = { fontSize: 11, color: PALETTE.textDim, textAlign: 'right' };
  const SEC_TITLE = { '⚔ 공격': '공 격', '🎯 행동': '행 동', '✚ 지원': '지 원', '🛡 방어': '방 어' };
  return (
    <>
      <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: `repeat(${Math.min(units.length, 3)}, 1fr)` }}>
        {units.map(x => {
          const on = x.key === u?.key; const col = x.fam ? MS.violet : MS.gold;
          return (
            <button key={x.key} onClick={() => setSel(x.key)} className="ui-press flex items-center gap-1.5 min-w-0" style={{ height: 40, padding: '0 6px', fontSize: 12.5, fontWeight: on ? 800 : 500, border: `1px solid ${on ? col : MS.line}`, color: on ? col : PALETTE.textDim, background: on ? `${col}1a` : MS.box }}>
              <UnitIcon u={x} size={26} /><span className="truncate">{x.fam ? `🐾 ${x.name}` : x.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>전투 {r.battles}회 · {rounds}라운드 집계{n > 1 ? ' · 괄호 = 전투당 평균' : ''} · 작은 글씨 = 비율</div>
      {d ? detailSections(d, rounds, (() => {
        const all = Object.values(r.detail.units);
        const tAll = all.reduce((t, x) => t + (x.targeted || 0), 0);
        const iAll = all.reduce((t, x) => t + (x.incoming ?? x.taken + x.absorbed), 0);
        return all.length > 1 && tAll ? { atk: pctTxt(d.targeted || 0, tAll), dmg: pctTxt(d.incoming ?? d.taken + d.absorbed, iAll) } : null;
      })()).map(sec => {
        const rows = sec.rows.filter(([, v, always]) => always || v > 0);
        if (!rows.length) return null;
        return (
          <div key={sec.title}>
            <MainSecHead title={SEC_TITLE[sec.title] || sec.title} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 14 }}>
              {rows.map(([label, v, , kind, note]) => (
                <div key={label} className="flex items-baseline justify-between gap-1" style={{ padding: '3px 0', minWidth: 0 }}>
                  <span className="min-w-0" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.3 }}>{label}{note ? <span className="block" style={{ fontSize: 11, opacity: 0.85 }}>{note}</span> : null}</span>
                  <b className="flex-none text-right" style={{ fontSize: 12.5, color: PALETTE.text }}>{fmtNum(v)}{!kind && n > 1 ? <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}> ({fmtNum(v / n)})</span> : null}</b>
                </div>
              ))}
            </div>
          </div>
        );
      }) : <div className="mt-2" style={{ fontSize: 12, color: PALETTE.textDim }}>기록 없음</div>}
      {skills.length > 0 && <>
        <MainSecHead title="스 킬 별" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', columnGap: 9, rowGap: 4, alignItems: 'baseline', marginTop: 4 }}>
          <span style={{ ...head, textAlign: 'left' }}>스킬</span><span style={head}>사용</span><span style={head}>피해</span><span style={head}>1회 평균</span><span style={head}>치명률</span>
          {skills.map(x => {
            const main = x.dmg || x.heal || x.shield;
            const tag = x.dmg ? '' : x.heal ? '✚' : x.shield ? '◈' : '';
            return (
              <React.Fragment key={x.sn}>
                <span style={{ fontSize: 12, color: PALETTE.text }} className="truncate">{x.sn}{(x.dmg && (x.heal || x.shield)) ? <span style={{ fontSize: 11, color: '#8fe08a' }}> ✚{fmtNum(x.heal + x.shield)}</span> : null}</span>
                <span style={cell}>{x.uses || '-'}</span>
                <b style={cell}>{main ? `${tag}${fmtNum(main)}` : '-'}</b>
                <span style={{ ...cell, color: PALETTE.textDim }}>{main && x.uses ? fmtNum(main / x.uses) : '-'}</span>
                <span style={{ ...cell, color: PALETTE.textDim }}>{x.hits ? pctTxt(x.crits, x.hits) : '-'}</span>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 6, lineHeight: 1.5 }}>✚ = 회복량 · ◈ = 보호막 (피해 없는 스킬) · 사용 횟수가 없는 줄 = 지속 피해·추가타처럼 다른 행동에서 따라 나온 피해</div>
      </>}
    </>
  );
}

// ===== 분당 효율 (1.231.3) =====
const fmtNum = (v) => (v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? (Math.round(v * 10) / 10).toLocaleString() : (Math.round(v * 100) / 100).toLocaleString());

function fmtDur(ms) {
  const sec = Math.max(1, Math.round(ms / 1000));
  return sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

function speedText(r) {
  const sp = Object.entries(r.speeds || {}).sort((a, b) => b[1] - a[1]).map(([k]) => `×${k}`);
  return sp.length ? sp.join('·') : '×2';
}

// 획득 항목 — 골드·정수·파편·조각·사역혼은 자동 분해 재화 포함
function gainRows(r) {
  const sv = r.salv || {};
  const rows = [
    { k: 'exp', icon: '⭐', label: '경험치', v: r.exp || 0 },
    { k: 'gold', icon: '🪙', label: '골드', v: (r.gold || 0) + (sv.gold || 0), sub: sv.gold ? `(분해 ${fmtNum(sv.gold)})` : '' },
    { k: 'essence', icon: '✦', label: '정수', v: (r.essence || 0) + (sv.essence || 0) },
    { k: 'shard', icon: '◆', label: '파편', v: (r.shard || 0) + (sv.shard || 0) },
    { k: 'famShards', icon: '📜', label: '계약서 조각', v: (r.famShards || 0) + (sv.famShard || 0) },
    { k: 'famSoul', icon: '🔮', label: '사역혼', v: (r.famSouls || 0) + (sv.famSoul || 0) },
    { k: 'famExp', icon: '🐾', label: '사역마 경험치', v: r.famExp || 0 },
    { k: 'talentScroll', icon: '📖', label: '특성 주문서', v: r.talentScroll || 0 },
    { k: 'keys', icon: '🗝', label: '던전 열쇠', v: r.keys || 0 },
    { k: 'drops', icon: '⚔', label: '장비 드랍', v: Object.values(r.items || {}).reduce((t, n) => t + n, 0) + (r.salvaged || 0) },
  ];
  return rows.filter(g => g.v > 0 || g.k === 'exp' || g.k === 'gold');
}

function SetupLine({ r }) {
  const su = r.setup;
  if (!su) return null;
  const place = Object.entries(r.places || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: 4, lineHeight: 1.5 }}>
      {su.classId ? <span style={{ color: chronicleClass(su.classId).color }}>{chronicleClass(su.classId).name} Lv.{su.lv}</span> : null}
      {' · '}{su.famName ? `🐾 ${su.famName}` : '사역마 없음'}
      {place ? <> · 📍 {r.kind === 'dungeon' ? placeBase(place) : r.kind === 'tower' ? '황혼의 첨탑' : place}</> : null}
    </div>
  );
}

// 던전 라벨 「금고(전설) 3층」 → 「금고(전설)」
const placeBase = (label) => (label || '').replace(/ (보스|\d+층)$/, '');

// 효율 기록 — 반복 사냥·던전 한 판이 끝날 때마다 기기에 최근 40건 저장 (기기 전용, 계정 저장과 무관)
const EFF_KEY = 'chronicleEffLog';

const EFF_MAX = 40;

function readEffLog() { try { return JSON.parse(localStorage.getItem(EFF_KEY) || '[]'); } catch { return []; } }

export function logEfficiency(r) {
  if (!r || r.battles < 2 || !r.ms) return;
  const g = Object.fromEntries(gainRows(r).map(x => [x.k, x.v]));
  const place = Object.entries(r.places || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const entry = {
    at: Date.now(), kind: r.kind, place: r.kind === 'dungeon' ? placeBase(place) : r.kind === 'tower' ? '황혼의 첨탑' : place,
    classId: r.setup?.classId, lv: r.setup?.lv, fam: r.setup?.famName || null,
    battles: r.battles, wins: r.wins, ms: r.ms, speed: speedText(r),
    exp: g.exp || 0, gold: g.gold || 0, essence: g.essence || 0, shard: g.shard || 0, famShards: g.famShards || 0, drops: g.drops || 0,
  };
  try { localStorage.setItem(EFF_KEY, JSON.stringify([entry, ...readEffLog()].slice(0, EFF_MAX))); } catch { /* */ }
}

const EFF_SORTS = [
  { id: 'exp', label: '경험치/분' }, { id: 'gold', label: '골드/분' }, { id: 'essence', label: '정수/분' }, { id: 'drops', label: '장비/분' }, { id: 'at', label: '최근 순' },
];

function EfficiencyLog({ onClose }) {
  // 1.256.0 — 본편 카드 창 (시안 ㊱) · 집계 창 위에 뜨도록 z 위로
  const [log, setLog] = useState(readEffLog);
  const [sort, setSort] = useState(() => { try { return localStorage.getItem('chronicleEffSort') || 'exp'; } catch { return 'exp'; } });
  const pickSort = (id) => { setSort(id); try { localStorage.setItem('chronicleEffSort', id); } catch { /* */ } };
  const pm = (e, k) => (e[k] || 0) * 60000 / Math.max(1, e.ms);
  const list = [...log].sort((a, b) => (sort === 'at' ? b.at - a.at : pm(b, sort) - pm(a, sort)));
  const best = sort === 'at' ? null : list[0];
  const clear = () => { try { localStorage.removeItem(EFF_KEY); } catch { /* */ } setLog([]); };
  const shortLabel = { exp: '경험치', gold: '골드', essence: '정수', drops: '장비', at: '최근' };
  return (
    <div className="absolute inset-0" style={{ zIndex: 46 }}>
      <MainModal kicker="EFFICIENCY" title="효율 기록 비교" badge={`${log.length}건`} color={MS.red} sub={`최근 ${EFF_MAX}건 · 이 기기에만 저장 · 같은 배속끼리 비교`} onClose={onClose}
        footer={log.length > 0 ? <button onClick={clear} className="ui-press" style={{ height: 40, fontSize: 13, border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>기록 지우기</button> : null}>
        <MainTabs size={12.5} value={sort} onChange={pickSort} items={EFF_SORTS.map(o => [o.id, shortLabel[o.id] || o.label.replace(/\/.*$/, '')])} />
        {!list.length && <div className="text-center py-8" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 기록이 없습니다 — 반복 사냥·던전 한 판·첨탑 도전(2전투 이상)이 끝나면 자동 기록</div>}
        <div className="flex flex-col gap-1.5 mt-2">
          {list.map((e, i) => {
            const top = e === best;
            return (
              <div key={e.at} style={{ padding: '8px 10px', background: MS.box, borderRadius: MS.r, border: `1px solid ${top ? MS.gold : MS.line}`, borderLeft: `3px solid ${top ? MS.gold : e.kind === 'dungeon' ? MS.violet : e.kind === 'tower' ? MS.blue : MS.line}` }}>
                <div className="flex justify-between items-baseline gap-2">
                  <b className="truncate" style={{ fontSize: 13, color: PALETTE.text }}>{sort !== 'at' ? `${i + 1}. ` : ''}{e.kind === 'dungeon' ? '🏰 ' : e.kind === 'tower' ? '🗼 ' : '🌾 '}{e.place || '—'}</b>
                  <span className="flex-none" style={{ fontSize: 11, color: PALETTE.textDim }}>{e.speed} · {fmtDur(e.ms)}</span>
                </div>
                <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>
                  {e.classId ? <span style={{ color: chronicleClass(e.classId).color }}>{chronicleClass(e.classId).name} Lv.{e.lv}</span> : null}
                  {' · '}{e.fam ? `🐾 ${e.fam}` : '사역마 없음'} · 전투 {e.battles} (승 {e.wins})
                </div>
                <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[['exp', '⭐'], ['gold', '🪙'], ['essence', '✦'], ['drops', '⚔']].map(([k, ic]) => (
                    <div key={k} className="text-center" style={{ padding: '3px 0', fontSize: 12, fontWeight: sort === k ? 800 : 500, border: `1px solid ${sort === k ? MS.gold : MS.line}`, background: sort === k ? 'rgba(232,176,74,0.1)' : 'transparent', color: sort === k ? MS.gold : PALETTE.text }}>
                      {ic} {fmtNum(pm(e, k))}<div style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}>/분</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </MainModal>
    </div>
  );
}

// ×4 배속 이용권 구매 창
export function BoostSheet({ save, onClose, onBuy }) {
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
