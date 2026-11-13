// ============================================
// chronicle/screens/forge.jsx — 황혼 연대기 · 대장간
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { SLOTS, FORGE } from '../data.js';
import * as E from '../engine.js';
import * as GE from '../gearEval.js';
import { gradeOf, clsTag, Header, ForgePop, Wallet, BASE_STATS, BASE_LABEL, MainKvRows, MainTabs, MS, MainSecHead, MainModal, MainCell, ConfirmSheet } from './common.jsx';
import { useGearEval, SORT_LABEL, effSort, EvalBasis, MainGearCard, CMP_DN, ForgeFooter, useItemSort, sortItems, filterItems, EquipBoxes, forgeNextRate } from './gear.jsx';

function RiskLine({ rate, fail, danger }) {
  return (
    <div style={{ fontSize: 12, marginTop: 2 }}>
      <span style={{ color: rate >= 1 ? '#8fe08a' : rate >= 0.5 ? PALETTE.legendary : '#e06a5f', fontWeight: 700 }}>성공률 {Math.round(rate * 100)}%</span>
      {fail ? <span style={{ color: danger ? '#e06a5f' : PALETTE.textDim, fontWeight: danger ? 700 : 400 }}> · {danger ? '⚠ ' : ''}{fail}</span> : null}
    </div>
  );
}

// 대장간 부품 (1.246.0)
const FORGE_COST_ROWS = [['gold', '🪙 골드', (s) => s.gold], ['essence', '✦ 정수', (s) => s.mats.essence || 0], ['shard', '◆ 고대 파편', (s) => s.mats.shard || 0]];

function forgeShort(save, cost) {
  const miss = FORGE_COST_ROWS.filter(([k, , have]) => cost[k] && have(save) < cost[k]).map(([k, l, have]) => `${l.replace(/^\S+\s/, '')} ${(cost[k] - have(save)).toLocaleString()}`);
  return miss.length ? `${miss.join(' · ')} 부족합니다` : '진행할 수 없습니다';
}

function MainForgeCompare({ before, after }) {
  const a = E.itemStats(before), b = E.itemStats(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => a[k] || b[k]);
  const val = (k, v) => (v ? (BASE_STATS.includes(k) ? Math.round(v).toLocaleString() : E.statLabel(k, v).replace(/^[^\d+-]*(?=[+-]?\d)/, '')) : '—');
  const name = (k) => (BASE_LABEL[k] === '공격' ? '공격력' : BASE_LABEL[k]) || E.statLabel(k, 1).replace(/\s*[+-]?[\d.]+.*$/, '');
  const pa = E.itemPower(before), pb = E.itemPower(after);
  const rows = [...keys.map(k => ({ k, l: name(k), from: val(k, a[k]), to: val(k, b[k]), d: +((b[k] || 0) - (a[k] || 0)).toFixed(3) })), { k: '_pw', l: '전투력', from: pa, to: pb, d: pb - pa }];
  return (
    <>
      <MainSecHead title="지 금 → 이 후" />
      <div className="grid" style={{ gridTemplateColumns: '1fr', rowGap: 0 }}>
        {rows.map(r => (
          <div key={r.k} className="flex items-baseline justify-between gap-2" style={{ padding: '4px 0', borderBottom: '1px dashed rgba(196,69,61,0.18)' }}>
            <span style={{ fontSize: 12, color: PALETTE.textDim }}>{r.l}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: r.k === '_pw' ? MS.gold : PALETTE.text }}>{r.from} → {r.to}{r.d ? <span style={{ fontSize: 11, marginLeft: 4, color: r.d > 0 ? '#8fd08a' : '#e07a6a' }}>{r.d > 0 ? '▲' : '▼'}{r.k === '_pw' || BASE_STATS.includes(r.k) ? Math.abs(Math.round(r.d)).toLocaleString() : E.statLabel(r.k, Math.abs(r.d)).replace(/^[^\d]*/, '')}</span> : null}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function MainForgeCost({ save, cost }) {
  const rows = FORGE_COST_ROWS.filter(([k]) => cost[k]);
  return (
    <>
      <MainSecHead title="비 용" />
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {rows.map(([k, l, have]) => { const h = have(save); const ok = h >= cost[k]; return <MainCell key={k} label={l} value={<>{cost[k].toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}> / {h.toLocaleString()}</span></>} color={ok ? '#8fd08a' : '#e07a6a'} />; })}
      </div>
    </>
  );
}

function MainForgeOdds({ outcomes }) {
  const list = outcomes.filter(([, p]) => p > 0.0005);
  return (
    <>
      <MainSecHead title="결 과 확 률" />
      <div className="flex" style={{ height: 10 }}>{list.map(([l, p, c]) => <div key={l} style={{ width: `${p * 100}%`, background: c }} />)}</div>
      <div className="mt-1" style={{ fontSize: 12 }}>{list.map(([l, p, c], i) => <React.Fragment key={l}>{i ? <span style={{ color: PALETTE.textDim }}> · </span> : null}<b style={{ color: c }}>{l} {Math.round(p * 100)}%</b></React.Fragment>)}</div>
    </>
  );
}

export function ForgeView({ save, setSave, onBack, flash, onTrack = () => {} }) {
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
  const [confirm, setConfirm] = useState(null); // 하락·파괴 위험 확인 (1.232.1)
  const [pop, setPop] = useState(null); // 결과 팝업 (1.232.2)
  const showPop = (kind, title, sub) => setPop({ kind, title, sub, key: Date.now() });
  const [skipAsk, setSkipAsk] = useState(forgeConfirmSkip);
  const [ftab, setFtab] = useState('enhance'); // 강화/승급 탭 (1.246.0)
  const [rulesOpen, setRulesOpen] = useState(false);
  // 옵션 재설정 (1.276.0) — 줄 선택 → 굴리기(비용 소모) → 새 옵션을 보고 바꾸기/유지
  const [rfIdx, setRfIdx] = useState(null);
  const [rfCand, setRfCand] = useState(null); // { uid, idx, opt, mode }
  const [rfMode, setRfMode] = useState('kind'); // 'kind' 옵션 재설정(✦) · 'value' 수치 재설정(◆) — 1.280.0
  useEffect(() => { setRfIdx(null); setRfCand(null); }, [sel]);
  const guard = (risky, info, run) => {
    if (!risky || forgeConfirmSkip) { run(); return; }
    setConfirm({ ...info, onConfirm: () => { forgeConfirmSkip = skipAsk; setConfirm(null); run(); } });
  };
  const hero = save.hero;
  const bagList0 = list.filter(it => !E.equippedBy(save, it.uid));
  const ev = useGearEval(save, bagList0); // 1.267.0 실전 평가
  const bagList = sortBy === 'eff' ? effSort(bagList0, ev) : bagList0;
  const by = item ? E.equippedBy(save, item.uid) : null;
  // 1.270.1 대장간에서 바로 착용·해제
  const equipNow = (it) => { setSave(E.equipItem(save, hero, it.uid)); flash(`${E.itemName(it)} 착용`); };
  const maxed = item && (item.plus || 0) >= FORGE.maxEnhance;
  const doEnhance = () => guard(er.drop || er.breakChance > 0, {
    title: `강화 +${item.plus || 0} → +${(item.plus || 0) + 1}`,
    lines: [
      { t: `성공 확률 ${Math.round(er.rate * 100)}%` },
      { t: er.breakChance ? `실패하면 1단계 하락, 그중 ${Math.round(er.breakChance * 100)}%는 장비가 파괴됩니다` : '실패하면 1단계 하락합니다', color: er.breakChance ? '#e06a5f' : '#e8b04a' },
      ...(by ? [{ t: '⚠ 착용 중인 장비입니다', color: '#e8b04a' }] : []),
    ],
    confirmLabel: '강화한다', danger: er.breakChance > 0,
  }, () => {
    const r = E.forgeEnhance(save, item.uid); if (!r.result) return; setSave(r.save); onTrack({ forge: 1 });
    if (r.result === 'destroy') { setSel(null); showPop('destroy', '장비 파괴', `${E.itemName(item)} +${item.plus || 0}`); }
    else if (r.result === 'success') showPop('success', `강화 성공! +${(item.plus || 0) + 1}`, E.itemName(item));
    else if (r.result === 'down') showPop('down', `강화 실패 — +${Math.max(0, (item.plus || 0) - 1)}로 하락`, E.itemName(item));
    else showPop('fail', '강화 실패', '재료만 잃었습니다');
  });
  // 1.266.3 목표까지 연속 강화 → 1.270.2 최대 +10까지 (하락은 계속 시도, 파괴되면 종료)
  const [goal, setGoal] = useState(E.SAFE_ENHANCE_MAX);
  const runEnhanceTo = (target) => {
    const r = E.forgeEnhanceTo(save, item.uid, target); if (!r.tries) return;
    setSave(r.save); onTrack({ forge: r.tries });
    const sub = `시도 ${r.tries}회${r.fails ? ` (실패 ${r.fails}${r.drops ? ` · 하락 ${r.drops}` : ''})` : ''} · 🪙${r.gold.toLocaleString()} · ✦${r.essence}`;
    if (r.destroyed) { setSel(null); showPop('destroy', `장비 파괴 — 최고 +${r.peak}까지 도달`, sub); }
    else if (r.reached) showPop('success', `연속 강화 +${r.from} → +${r.to}`, sub);
    else showPop('fail', `재료 부족으로 +${r.to}에서 멈춤`, sub);
  };
  const doEnhanceTo = (target) => {
    if (target <= E.SAFE_ENHANCE_MAX) { runEnhanceTo(target); return; }
    // 하락·파괴 구간 — 「묻지 않기」 설정과 무관하게 항상 확인
    const o = E.enhanceOutlook(item, target);
    setConfirm({
      title: `+${item.plus || 0} → +${target} 연속 강화`,
      lines: [
        { t: `+${FORGE.enhanceDropFrom}부터 실패하면 1단계 하락 — 하락해도 목표까지 계속 시도합니다`, color: '#e8b04a' },
        ...(target > FORGE.enhanceBreakFrom ? [{ t: `+${FORGE.enhanceBreakFrom}부터 실패하면 ${Math.round(FORGE.enhanceBreakChance * 100)}% 확률로 장비 파괴 — 파괴되면 즉시 멈춥니다`, color: '#e06a5f' }] : []),
        { t: `예상 (재료 충분 시): 파괴 확률 약 ${Math.round(o.destroyPct * 100)}% · 평균 시도 ${Math.round(o.avgTries)}회 · 🪙${o.avgGold.toLocaleString()} · ✦${o.avgEssence.toLocaleString()}` },
        ...(by ? [{ t: '⚠ 착용 중인 장비입니다', color: '#e8b04a' }] : []),
      ],
      confirmLabel: `+${target}까지 강화한다`, danger: o.destroyPct > 0,
      noSkip: true, onConfirm: () => { setConfirm(null); runEnhanceTo(target); },
    });
  };
  const doPromote = () => guard(pr.breaks, {
    title: `${gradeOf(ng).label} 승급`,
    lines: [
      { t: `성공 확률 ${Math.round(pr.rate * 100)}%` },
      { t: '실패하면 장비가 파괴됩니다', color: '#e06a5f' },
      ...(by ? [{ t: '⚠ 착용 중인 장비입니다', color: '#e8b04a' }] : []),
    ],
    confirmLabel: '승급한다', danger: true,
  }, () => {
    const r = E.forgePromote(save, item.uid); if (!r.result) return; setSave(r.save); onTrack({ forge: 1 });
    if (r.result === 'destroy') { setSel(null); showPop('destroy', '장비 파괴', `${gradeOf(ng).label} 승급 실패`); return; }
    if (r.result === 'fail') { showPop('fail', '승급 실패', '재료만 잃었습니다'); return; }
    const it2 = r.save.inventory.find(i => i.uid === item.uid); showPop('success', `${gradeOf(ng).label} 등급으로 승급!`, E.epicOptOf(it2) ? `에픽 효과 「${E.epicOptOf(it2).name}」` : E.itemName(it2));
  });
  const rfLines = item ? E.reforgeLines(item) : [];
  const rfValue = rfMode === 'value';
  const rfCost = item ? (rfValue ? E.tuneCost(item) : E.reforgeCost(item)) : null;
  const rfTune = (i) => E.tuneLineState(item, i);
  const rfOpen = rfLines.filter(l => (rfValue ? rfTune(l.i).ok : !l.locked));
  const rfSel = rfOpen.some(l => l.i === rfIdx) ? rfIdx : (rfOpen[0]?.i ?? null);
  const rfPending = rfCand && item && rfCand.uid === item.uid ? rfCand : null;
  const doReforge = () => {
    const r = rfValue ? E.tuneRoll(save, item.uid, rfSel, Math.random) : E.reforgeRoll(save, item.uid, rfSel, Math.random);
    if (!r.cand) return;
    setSave(r.save); setRfCand({ uid: item.uid, idx: rfSel, opt: r.cand, mode: rfMode });
  };
  const rfDecide = (take) => {
    if (take && rfPending) { setSave(E.reforgeApply(save, item.uid, rfPending.idx, rfPending.opt, rfPending.mode || 'kind')); flash(rfPending.mode === 'value' ? '수치를 바꿨습니다' : '옵션을 바꿨습니다'); }
    else flash('기존 옵션을 유지했습니다');
    setRfCand(null);
  };
  const qTag = (o) => { const q = E.optQuality(item, o); return q == null ? null : <span style={{ fontSize: 11, color: q >= 0.8 ? MS.gold : q >= 0.4 ? PALETTE.text : PALETTE.textDim }}> · 수치 {Math.round(q * 100)}%</span>; };
  const bigBtn = (on, label, onClick, gold) => (
    <button disabled={!on} onClick={onClick} className={`ui-press${on && !gold ? ' chr-btn-pri' : ''}`} style={{ height: 46, fontSize: 14, fontWeight: 800, border: `1px solid ${on ? MS.gold : MS.line}`, background: on ? 'rgba(232,176,74,0.12)' : 'transparent', color: on ? MS.gold : PALETTE.textDim, opacity: on ? 1 : 0.6 }}>{label}</button>
  );
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="대장간" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-none px-4 pt-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span className="chr-head">착용 장비</span>
          <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>누르면 강화 창</span>
        </div>
        <EquipBoxes save={save} hero={hero} onPick={(sl, it) => (it ? setSel(it.uid) : setFilter(sl.id))} sub={(it) => { const r = forgeNextRate(it); return `+${it.plus || 0} · ${r == null ? '최대' : `다음 ${Math.round(r * 100)}%`}`; }} />
        <div className="mt-2"><MainTabs items={[['all', '전체'], ...SLOTS.map(s => [s.id, s.label]), ['other', '타직업']]} value={filter} onChange={setFilter} size={12.5} /></div>
        <div className="flex items-center gap-1.5 py-2" style={{ fontSize: 12 }}>
          <span style={{ color: PALETTE.textDim }}>보관 <b style={{ color: PALETTE.text }}>{bagList.length}</b> · 정렬 <b style={{ color: MS.gold }}>{SORT_LABEL[sortBy] || '전투력'}</b></span>
          <div className="flex-1" />
          <button onClick={() => setRulesOpen(true)} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>ⓘ 규칙 · 정렬</button>
        </div>
        {ev.target && <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: -4, paddingBottom: 6 }}>⚔ 효율 기준 <b style={{ color: PALETTE.text }}>{GE.evalTargetLabel(ev.target)}</b></div>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className="flex flex-col gap-1.5">
          {bagList.map(it => { const usable = E.itemUsable(it, hero); const cur = usable ? save.inventory.find(x => x.uid === save.units[hero].equip[it.slot]) : null;
            return <MainGearCard key={it.uid} it={it} onClick={() => setSel(it.uid)} cmp={usable ? (cur || null) : undefined} evalInfo={usable ? ev.info(it) : null} note={usable ? <>효율 = <EvalBasis it={it} cur={cur} /></> : clsTag(it)} footer={<ForgeFooter it={it} onEquip={usable ? () => equipNow(it) : null} canWear={usable && E.canWear(it, save.units[hero])} />} />; })}
        </div>
        {!bagList.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{list.length ? '보관 중인 장비가 없습니다 — 착용 장비는 위 상자를 누르세요' : save.inventory.length ? (filter === 'other' ? '타직업 장비가 없습니다' : '이 분류에 내 직업 장비가 없습니다 — 다른 직업 장비는 「타직업」 탭') : '가방에 장비가 없습니다'}</div>}
      </div>
      {rulesOpen && (
        <MainModal kicker="대 장 간" title="ⓘ 규칙 · 정렬" onClose={() => setRulesOpen(false)}>
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
            <div>◇ 강화 능력치 <b style={{ color: MS.gold }}>+1~+7 단계당 +8%</b> · +8 <b>+12%</b> · +9 <b>+16%</b> · +10 <b>+22%</b> (누적 +{Math.round(FORGE.enhanceBonus[FORGE.maxEnhance] * 100)}%) · 옵션은 그 절반</div>
            <div>◇ 옵션 수치는 장비 레벨 비례 — Lv.10 ×0.6 · Lv.60 ×1.0 · Lv.100 ×1.3</div>
            <div style={{ color: '#e07a6a' }}>◇ +3부터 실패 · +6부터 실패 시 하락 · +8부터 파괴 위험</div>
            <div>◇ 승급 = 다음 등급 + 옵션 1개 · 에픽 승급은 던전의 ◆ 고대 파편 필요</div>
            <div style={{ color: PALETTE.textDim }}>◇ 유니크·전승 장비는 승급 불가 (강화만)</div>
            <div>◇ <b style={{ color: MS.gold }}>🎲 옵션 재설정</b> — 정수로 옵션 1줄을 다시 굴린다 (같은 장비는 굴릴수록 비싸짐)</div>
          </div>
          <MainSecHead title="정 렬" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['eff', '효율 높은 순 (실전)'], ['power', '전투력 높은 순'], ['grade', '등급 높은 순'], ['level', '레벨 높은 순']].map(([v, l]) => <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ height: 36, fontSize: 12, border: `1px solid ${sortBy === v ? MS.gold : MS.line}`, color: sortBy === v ? MS.gold : PALETTE.textDim, background: sortBy === v ? 'rgba(232,176,74,0.12)' : MS.box }}>{l}</button>)}
          </div>
        </MainModal>
      )}
      {item && (() => {
        const g = gradeOf(item.grade); const slot = SLOTS.find(sl => sl.id === item.slot);
        const enhOk = !maxed && E.canEnhance(save, item);
        const proOk = ng && E.canPromote(save, item);
        return (
          <MainModal kicker={`${g.label} · ${slot?.label || ''}${by ? ' · 착용 중' : ''}`.split('').join(' ').replace(/ {3}/g, '  ')} title={`${E.itemName(item)}${item.plus ? ` +${item.plus}` : ''}`} color={g.color} badge={`⚔ ${E.itemPower(item)}`} sub={`Lv.${item.ilv} · ${clsTag(item)} · 최대 +${FORGE.maxEnhance}`} onClose={() => setSel(null)}
            footer={ftab === 'reforge'
              ? (!rfCost || rfSel == null ? null : rfPending
                ? <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>{bigBtn(true, '유지', () => rfDecide(false), true)}{bigBtn(true, rfPending.mode === 'value' ? '새 수치로 바꾸기' : '새 옵션으로 바꾸기', () => rfDecide(true))}</div>
                : (rfValue ? E.canTune(save, item, rfSel) : E.canReforge(save, item, rfSel)) ? bigBtn(true, rfValue ? '🎯 선택한 옵션의 수치 다시 굴리기' : '🎲 선택한 옵션 다시 굴리기', doReforge) : bigBtn(false, forgeShort(save, rfCost)))
              : ftab === 'enhance'
              ? (maxed ? null : enhOk ? bigBtn(true, `⚒ 강화 +${item.plus || 0} → +${(item.plus || 0) + 1}`, doEnhance) : bigBtn(false, forgeShort(save, ec)))
              : (!ng ? null : proOk ? bigBtn(true, `⬆ ${gradeOf(ng).label} 승급`, doPromote, true) : bigBtn(false, forgeShort(save, pc)))}>
            {by === hero
              ? <button onClick={() => { setSave(E.unequipItem(save, hero, item.slot)); flash(`${E.itemName(item)} 착용 해제`); }} className="ui-press w-full mb-2" style={{ height: 36, fontSize: 12.5, border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>착용 해제</button>
              : !by && E.itemUsable(item, hero) && (E.canWear(item, save.units[hero])
                ? <button onClick={() => equipNow(item)} className="ui-press w-full mb-2" style={{ height: 36, fontSize: 12.5, fontWeight: 800, border: `1px solid ${MS.gold}`, background: 'rgba(232,176,74,0.10)', color: MS.gold }}>착용하기</button>
                : <div className="mb-2 text-center" style={{ fontSize: 12, color: CMP_DN }}>Lv.{item.ilv}부터 착용 가능</div>)}
            <MainTabs items={[['enhance', maxed ? '⚒ 최대 강화' : `⚒ 강화 +${item.plus || 0} → +${(item.plus || 0) + 1}`], ['promote', ng ? `⬆ 승급 → ${gradeOf(ng).label}` : '⬆ 승급'], ['reforge', '🎲 옵션']]} value={ftab} onChange={(t) => { if (!rfPending) setFtab(t); }} size={12.5} />
            {ftab === 'enhance' && (maxed
              ? <div className="mt-3" style={{ fontSize: 12.5, color: PALETTE.textDim }}>최대 강화 +{FORGE.maxEnhance}에 도달했습니다</div>
              : <>
                <MainForgeCompare before={item} after={{ ...item, plus: (item.plus || 0) + 1 }} />
                <MainForgeCost save={save} cost={ec} />
                <MainForgeOdds outcomes={(() => { const f = 1 - er.rate; return er.drop ? [['성공', er.rate, '#8fd08a'], [`+${Math.max(0, (item.plus || 0) - 1)}로 하락`, f * (1 - er.breakChance), '#e8b04a'], ['파괴', f * er.breakChance, '#e07a6a']] : [['성공', er.rate, '#8fd08a'], ['실패 (재료만 잃음)', f, '#9b8975']]; })()} />
                {(item.plus || 0) < FORGE.maxEnhance && (() => {
                  const goals = []; for (let t = (item.plus || 0) + 1; t <= FORGE.maxEnhance; t++) goals.push(t);
                  const g0 = goals.includes(goal) ? goal : goals[0];
                  const o = g0 > E.SAFE_ENHANCE_MAX ? E.enhanceOutlook(item, g0) : null;
                  const zc = (t) => (t > FORGE.enhanceBreakFrom ? '#e07a6a' : t > FORGE.enhanceDropFrom ? '#e8b04a' : MS.gold);
                  return (
                    <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.gold}66`, background: 'rgba(232,176,74,0.06)' }}>
                      <div style={{ fontSize: 12.5, color: MS.gold, fontWeight: 700 }}>⏩ 목표까지 연속 강화</div>
                      <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: 2 }}>목표 도달 · 재료 부족 · 장비 파괴 중 먼저 오는 것에서 멈춥니다. <span style={{ color: MS.gold }}>+{E.SAFE_ENHANCE_MAX}까지 안전</span> · <span style={{ color: '#e8b04a' }}>+{E.SAFE_ENHANCE_MAX + 1}~{FORGE.enhanceBreakFrom} 하락 위험</span> · <span style={{ color: '#e07a6a' }}>+{FORGE.enhanceBreakFrom + 1}~{FORGE.maxEnhance} 파괴 위험</span></div>
                      <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        {goals.map(t => <button key={t} onClick={() => setGoal(t)} className="ui-press" style={{ height: 34, fontSize: 12.5, border: `1px solid ${g0 === t ? zc(t) : MS.line}`, color: g0 === t ? zc(t) : PALETTE.textDim, background: g0 === t ? 'rgba(232,176,74,0.12)' : MS.box }}>+{t}</button>)}
                      </div>
                      {o && <div className="mt-1.5" style={{ fontSize: 11.5, color: PALETTE.text }}>예상 · 파괴 <b style={{ color: o.destroyPct > 0 ? '#e07a6a' : MS.gold }}>{Math.round(o.destroyPct * 100)}%</b> · 평균 시도 <b>{Math.round(o.avgTries)}회</b> · 🪙{o.avgGold.toLocaleString()} · ✦{o.avgEssence.toLocaleString()}</div>}
                      <button disabled={!enhOk} onClick={() => doEnhanceTo(g0)} className="ui-press w-full mt-2" style={{ height: 40, fontSize: 13, fontWeight: 800, border: `1px solid ${enhOk ? zc(g0) : MS.line}`, color: enhOk ? zc(g0) : PALETTE.textDim, background: enhOk ? 'rgba(232,176,74,0.12)' : MS.box }}>⏩ +{g0}까지 연속 강화</button>
                    </div>
                  );
                })()}
                <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12, color: PALETTE.text, lineHeight: 1.55 }}>
                  <b style={{ color: MS.red }}>◇ 규칙</b> +6부터 실패 시 하락 · +8부터 실패 시 파괴 위험 · 파괴되면 착용 칸이 빈다
                </div>
              </>)}
            {ftab === 'reforge' && (!rfCost
              ? <div className="mt-3" style={{ fontSize: 12.5, color: PALETTE.textDim }}>옵션이 없는 장비입니다 — 고급 등급부터 옵션이 붙는다</div>
              : <>
                <div className="mt-2"><MainTabs size={12.5} value={rfMode} onChange={(m) => { if (!rfPending) { setRfMode(m); setRfIdx(null); } }} items={[['kind', '🎲 옵션 재설정 · ✦'], ['value', '🎯 수치 재설정 · ◆']]} /></div>
                <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>{rfValue ? '옵션 종류는 그대로 두고 수치만 다시 굴린다 — 유니크의 고정 옵션도 가능' : '옵션 종류와 수치를 함께 다시 굴린다'}</div>
                <MainSecHead title="옵 션" />
                <div className="flex flex-col gap-1.5">
                  {rfLines.map(l => { const on = l.i === rfSel; const ts = rfValue ? rfTune(l.i) : null; const off = rfValue ? !ts.ok : l.locked; return (
                    <button key={l.i} disabled={off || !!rfPending} onClick={() => setRfIdx(l.i)} className="ui-press text-left flex items-center gap-2" style={{ padding: '9px 10px', border: `1px solid ${on ? MS.gold : MS.line}`, background: on ? 'rgba(232,176,74,0.10)' : MS.box, opacity: off ? 0.55 : 1 }}>
                      <span style={{ fontSize: 13, color: on ? MS.gold : PALETTE.textDim }}>{off ? '🔒' : on ? '◆' : '◇'}</span>
                      <span className="flex-1" style={{ fontSize: 13, color: PALETTE.text }}>{E.optText(item, l.o)}{l.locked && !rfValue ? null : qTag(l.o)}</span>
                      {rfValue ? (off ? <span style={{ fontSize: 11, color: PALETTE.textDim }}>{ts.why}</span> : l.locked ? <span style={{ fontSize: 11, color: MS.gold }}>고정 옵션</span> : null) : (l.locked && <span style={{ fontSize: 11, color: PALETTE.textDim }}>고정 · 수치만 가능</span>)}
                    </button>
                  ); })}
                </div>
                {rfSel == null && <div className="mt-2" style={{ fontSize: 12, color: PALETTE.textDim }}>{rfValue ? '수치를 다시 굴릴 수 있는 옵션이 없습니다' : '다시 굴릴 수 있는 옵션이 없습니다 — 「수치 재설정」을 확인하세요'}</div>}
                {rfPending && (
                  <div className="mt-2" style={{ padding: 10, border: `1px solid ${MS.red}`, background: "rgba(224,87,76,0.10)", borderRadius: MS.r }}>
                    <div style={{ fontSize: 12, color: MS.red, fontWeight: 700, letterSpacing: 3 }}>{rfPending.mode === 'value' ? '◆ 새 수치' : '◆ 새 옵션'}</div>
                    <div className="mt-1" style={{ fontSize: 12.5, color: PALETTE.textDim }}>지금 · <span style={{ color: PALETTE.text }}>{E.optText(item, rfLines[rfPending.idx].o)}</span>{qTag(rfLines[rfPending.idx].o)}</div>
                    <div className="mt-1" style={{ fontSize: 14, fontWeight: 800, color: MS.gold }}>새로 · {E.optText(item, rfPending.opt)}{qTag(rfPending.opt)}</div>
                    <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>아래에서 바꿀지 유지할지 고르세요 — 비용은 이미 냈습니다</div>
                  </div>
                )}
                {!rfPending && rfSel != null && <>
                  <MainForgeCost save={save} cost={rfCost} />
                  {rfValue
                    ? (() => { const r = rfTune(rfSel).range; const f = (v) => E.optText(item, { ...E.reforgeLines(item)[rfSel].o, k: r.k, v }); return (
                      <>
                        <MainSecHead title="나 올 수 있 는 수 치" />
                        <MainKvRows rows={[{ l: '최저', v: f(r.min) }, { l: '지금', v: f(r.cur), c: MS.gold }, { l: '최고', v: f(r.max), c: '#8fd08a' }]} />
                        <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>최저~최고 사이에서 고르게 나온다 — 지금보다 낮게 나오면 「유지」를 고르면 된다</div>
                      </>
                    ); })()
                    : <>
                      <MainSecHead title="나 올 수 있 는 옵 션" />
                      <div className="flex flex-wrap gap-1">
                        {E.reforgePool(item, rfSel).map(x => <span key={x.k} style={{ fontSize: 11.5, padding: '2px 7px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>{x.label} <b style={{ color: MS.gold }}>{Math.round(x.p * 100)}%</b></span>)}
                      </div>
                    </>}
                </>}
                <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12, color: PALETTE.text, lineHeight: 1.55 }}>
                  <b style={{ color: MS.red }}>◇ 규칙</b> 옵션 1줄을 골라 다시 굴린다 · 나온 결과를 보고 바꾸거나 유지 · 같은 장비는 굴릴수록 비싸진다 (두 방식 합쳐 이 장비 {item.rr || 0}회){item.named ? ' · 유니크의 고정 옵션은 종류를 못 바꾸고 수치만 다시 굴릴 수 있다' : ''}
                </div>
              </>)}
            {ftab === 'promote' && (ng
              ? <>
                <MainForgeCompare before={item} after={{ ...item, grade: ng }} />
                <div className="mt-1" style={{ fontSize: 12, color: '#c79bff' }}>◇ 무작위 옵션 1개 추가{ng === 'epic' && item.slot === 'accessory' ? ' + 에픽 장신구 효과' : ''}</div>
                <MainForgeCost save={save} cost={pc} />
                <MainForgeOdds outcomes={[['성공', pr.rate, '#8fd08a'], [pr.breaks ? '파괴' : '실패 (재료만 잃음)', 1 - pr.rate, pr.breaks ? '#e07a6a' : '#9b8975']]} />
              </>
              : <div className="mt-3" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{item.grade === 'unique' || item.grade === 'mythic' ? '유니크·전승 장비는 승급할 수 없다 — 강화만' : '최고 등급입니다'}</div>)}
          </MainModal>
        );
      })()}
      {confirm && <ConfirmSheet {...confirm} onCancel={() => setConfirm(null)} skipLabel={confirm.noSkip ? null : '이번 접속 동안 다시 묻지 않기'} skip={skipAsk} onSkipChange={setSkipAsk} />}
      {pop && <ForgePop pop={pop} onDone={() => setPop(null)} />}
    </div>
  );
}

// 대장간 위험 경고 「이번 접속 동안 묻지 않기」 — 새로고침하면 다시 묻는다
let forgeConfirmSkip = false;
