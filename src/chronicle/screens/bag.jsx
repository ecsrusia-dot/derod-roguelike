// ============================================
// chronicle/screens/bag.jsx — 황혼 연대기 · 가방 · 창고
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { UIButton } from '../../components/ui/CommonUI.jsx';
import { CHRONICLE_CLASSES, GRADES, gradeIdx, SLOTS, BAG_EXPAND, chronicleClass } from '../data.js';
import * as E from '../engine.js';
import * as A from '../account.js';
import * as GE from '../gearEval.js';
import { gradeOf, clsTag, Header, Wallet, Bar, MainTabs, MS, MainSecHead, MainModal, ConfirmSheet } from './common.jsx';
import { useGearEval, SORT_LABEL, effSort, EvalFooter, MainGearCard, MainItemModal, useItemSort, sortItems, filterItems } from './gear.jsx';
import { PreviewSheet } from './report.jsx';

// ===== 가방 (캐릭터 전용) =====
export function BagView({ save, setSave, onBack, flash, onForge }) {
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null); // 효율 미리보기 (1.232.0)
  const [sel, setSel] = useState(null);
  // 정렬 (1.213.1): 착용 장비가 맨 위 → 그 아래 전투력(주 능력치) 높은 순
  const [sortBy, pickSort] = useItemSort();
  const [incOther, setIncOther] = useState(() => { try { return localStorage.getItem('chronicleBulkOther') === '1'; } catch { return false; } });
  // 타직업 포함 — 일괄 분해·자동 분해 공용 (1.231.2: 자동 분해 설정은 계정에 저장)
  const toggleOther = () => { const v = !incOther; setIncOther(v); try { localStorage.setItem('chronicleBulkOther', v ? '1' : '0'); } catch { /* */ } setSave({ ...save, autoSalvage: { ...(save.autoSalvage || { grade: -1 }), other: v } }); };
  const autoG = save.autoSalvage?.grade ?? -1;
  const setAutoG = (g) => setSave({ ...save, autoSalvage: { grade: g, other: incOther } });
  // 선택 분해 모드 (1.231.2)
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const togglePick = (uid) => setPicked(p => { const n = new Set(p); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const endPick = () => { setPicking(false); setPicked(new Set()); };
  const pickedSalvage = (() => { const tot = {}; for (const it of save.inventory) if (picked.has(it.uid)) for (const [k, v] of Object.entries(E.salvageOf(it))) tot[k] = (tot[k] || 0) + v; return tot; })();
  const hero = save.hero;
  const list = sortItems(save, filterItems(save.inventory, filter, hero), sortBy);
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const others = save.inventory.filter(i => !E.itemUsable(i, hero));
  const [confirm, setConfirm] = useState(null); // 분해 확인 창 (1.232.1)
  const salvageOfUids = (uids) => { const tot = {}; for (const it of save.inventory) if (uids.includes(it.uid)) for (const [k, v] of Object.entries(E.salvageOf(it))) tot[k] = (tot[k] || 0) + v; return tot; };
  const gradeCount = (uids) => GRADES.map(g => ({ g, n: save.inventory.filter(i => uids.includes(i.uid) && i.grade === g.id).length })).filter(x => x.n);
  const askDismantle = (uids, after) => {
    if (!uids.length) { flash('분해할 장비가 없습니다'); return; }
    const plused = save.inventory.filter(i => uids.includes(i.uid) && i.plus > 0).length;
    setConfirm({
      title: `장비 ${uids.length}개 분해`,
      lines: [
        { t: gradeCount(uids).map(x => `${x.g.label} ${x.n}`).join(' · ') },
        { t: `얻는 재화: ${E.salvageText(salvageOfUids(uids))}` },
        ...(plused ? [{ t: `⚠ 강화된 장비 ${plused}개 포함`, color: '#e8b04a' }] : []),
        { t: '분해한 장비는 되돌릴 수 없습니다', color: PALETTE.textDim },
      ],
      confirmLabel: `${uids.length}개 분해`,
      onConfirm: () => { const r = E.dismantleItems(save, uids); setSave(r.save); flash(`${uids.length}개 분해 → ${E.salvageText(r.salvage)}`); setConfirm(null); if (after) after(); },
    });
  };
  const bulk = (maxGrade) => {
    const uids = save.inventory.filter(i => gradeIdx(i.grade) <= maxGrade && !E.equippedBy(save, i.uid) && (incOther || E.itemUsable(i, hero))).map(i => i.uid);
    askDismantle(uids);
  };
  const toStash = (uids) => {
    const r = E.moveToStash(save, uids);
    setSave(r.save);
    flash(r.moved ? `창고로 ${r.moved}개 보관` : '창고가 가득 찼습니다');
  };
  // 1.249.0 — 본편 스타일 가방 (PM 승인 시안 ⑬): 착용 4칸 상자 · 밑줄 탭 · 2열 카드 · 관리 창
  const [manage, setManage] = useState(false);
  const eqUids = Object.values(save.units[hero].equip).filter(v => v != null);
  const eqPower = eqUids.reduce((s, uid) => { const it = save.inventory.find(i => i.uid === uid); return s + (it ? E.itemPower(it) : 0); }, 0);
  const bagList0 = list.filter(it => !E.equippedBy(save, it.uid));
  const ev = useGearEval(save, bagList0); // 1.267.0 실전 평가
  const bagList = sortBy === 'eff' ? effSort(bagList0, ev) : bagList0;
  // 1.267.0 자동 장착 — 실전 효율(+7 기준)이 착용보다 0.5% 이상 좋은 장비를 부위마다 1개씩
  const autoEquipEval = () => {
    const cands = bagList0.filter(it => GE.canEvalItem(save, hero, it) && E.canWear(it, save.units[hero]));
    if (cands.some(it => ev.info(it).state === 'pending')) { flash('효율 계산 중입니다 — 잠시 뒤 다시 눌러 주세요'); return; }
    const best = {};
    for (const it of cands) { const inf = ev.info(it); if (inf.state !== 'ok') continue; const d = inf.full ? inf.full.delta : inf.delta; if (d < 0.005) continue; if (!best[it.slot] || d > best[it.slot].d) best[it.slot] = { it, d }; }
    const picks = Object.values(best);
    if (!picks.length) { flash('지금 착용보다 효율이 좋은 장비가 없습니다'); return; }
    let sv = save; for (const p of picks) sv = E.equipItem(sv, hero, p.it.uid);
    setSave(sv); flash(`${picks.length}부위 교체 (실전 효율 기준)`);
  };
  const mBtn = { height: 40, fontSize: 12.5, background: MS.box, border: `1px solid ${MS.line}`, color: PALETTE.text };
  const ec = E.bagExpandCost(save);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={`가방 ${save.inventory.length}/${E.bagMax(save)}`} onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-none px-4 pt-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span className="chr-head">착용 장비</span>
          <span style={{ fontSize: 12, color: PALETTE.textDim }}>⚔ 전투력 {eqPower.toLocaleString()}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {SLOTS.map(sl => {
            const it = save.inventory.find(i => i.uid === save.units[hero].equip[sl.id]);
            const g = it ? gradeOf(it.grade) : null;
            return (
              <button key={sl.id} onClick={() => (it ? setSel(it.uid) : setFilter(sl.id))} className="ui-press text-center" style={{ padding: '6px 3px', borderRadius: 12, border: `1.5px solid ${it ? `${g.color}99` : MS.line}`, background: MS.box, minWidth: 0 }}>
                <div style={{ fontSize: 18, lineHeight: 1.2 }}>{sl.icon}</div>
                <div className="truncate font-bold" style={{ fontSize: 11, color: it ? g.color : PALETTE.textDim }}>{it ? E.itemName(it) : `${sl.label} 비어 있음`}</div>
                <div style={{ fontSize: 11, color: PALETTE.textDim }}>{it ? `${it.plus ? `+${it.plus} · ` : ''}⚔${E.itemPower(it)}` : '눌러서 찾기'}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-2"><MainTabs items={[['all', '전체'], ...SLOTS.map(x => [x.id, x.label]), ['other', '타직업']]} value={filter} onChange={setFilter} size={12.5} /></div>
        <div className="flex items-center gap-1.5 py-2" style={{ fontSize: 12 }}>
          <span style={{ color: PALETTE.textDim }}>보관 <b style={{ color: PALETTE.text }}>{bagList.length}</b> · 정렬 <b style={{ color: MS.gold }}>{SORT_LABEL[sortBy] || '전투력'}</b></span>
          <div className="flex-1" />
          <button onClick={() => setManage(true)} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>⚙ 관리</button>
          <button onClick={() => (picking ? endPick() : setPicking(true))} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${picking ? MS.gold : MS.line}`, background: picking ? 'rgba(232,176,74,0.12)' : MS.box, color: picking ? MS.gold : PALETTE.text }}>{picking ? '선택 끝' : '☑ 선택'}</button>
        </div>
        {ev.target && <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: -4, paddingBottom: 6 }}>⚔ 효율 기준 <b style={{ color: PALETTE.text }}>{GE.evalTargetLabel(ev.target)}</b></div>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className="flex flex-col gap-1.5">
          {bagList.map(it => {
            const usable = E.itemUsable(it, hero);
            const cur = usable ? save.inventory.find(x => x.uid === save.units[hero].equip[it.slot]) : null;
            const wear = usable && E.canWear(it, save.units[hero]);
            return <MainGearCard key={it.uid} it={it} dim={!usable} note={usable ? null : clsTag(it)} picked={picking ? picked.has(it.uid) : null}
              cmp={usable && !picking ? (cur || null) : undefined} evalInfo={usable && !picking ? ev.info(it) : null}
              onClick={() => (picking ? togglePick(it.uid) : setSel(it.uid))}
              footer={usable ? <EvalFooter it={it} cur={cur} info={ev.info(it)} canWear={wear} needLv={it.ilv} onEquip={() => { setSave(E.equipItem(save, hero, it.uid)); flash(`${E.itemName(it)} 착용`); }} /> : <span style={{ color: PALETTE.textDim }}>타직업 장비 — 창고로 보내면 {it.cls === 'common' ? '다른 캐릭터' : chronicleClass(it.cls).name}가 쓴다</span>} />;
          })}
        </div>
        {!bagList.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{list.length ? '보관 중인 장비가 없습니다 — 착용 장비만 있어요' : save.inventory.length ? (filter === 'other' ? '타직업 장비가 없습니다' : '이 분류에 내 직업 장비가 없습니다 — 다른 직업 장비는 「타직업」 탭에 있어요') : '비어 있습니다 — 사냥터에서 장비를 모아 보세요'}</div>}
      </div>
      {picking && (
        <div className="flex-none px-3 py-2 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${MS.line}`, background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
            <span style={{ color: PALETTE.text }}>선택 <b style={{ color: '#e06a5f' }}>{picked.size}</b>개{picked.size ? ` → ${E.salvageText(pickedSalvage)}` : ''}</span>
            <div className="flex-1" />
            <button onClick={() => setPicked(new Set(bagList.map(i => i.uid)))} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', border: `1px solid ${MS.line}`, color: PALETTE.dawn, background: 'transparent' }}>보이는 것 전체</button>
            <button onClick={() => setPicked(new Set())} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', border: `1px solid ${MS.line}`, color: PALETTE.textDim, background: 'transparent' }}>해제</button>
          </div>
          <div className="flex gap-2">
            <UIButton variant="ghost" style={{ height: 40 }} disabled={!picked.size} onClick={() => { toStash([...picked]); endPick(); }}>{picked.size ? `${picked.size}개 창고로` : '창고로'}</UIButton>
            <UIButton style={{ height: 40, background: picked.size ? '#b8443a' : undefined }} disabled={!picked.size} onClick={() => askDismantle([...picked], endPick)}>{picked.size ? `${picked.size}개 분해` : '분해할 장비를 고르세요'}</UIButton>
          </div>
        </div>
      )}
      {manage && (
        <MainModal kicker="가 방 관 리" title="⚙ 관리" onClose={() => setManage(false)}>
          <MainSecHead title="정 리" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button onClick={autoEquipEval} className="ui-press" style={{ ...mBtn, color: MS.gold, borderColor: `${MS.gold}88` }}>자동 장착 (실전 효율)</button>
            <button disabled={!others.length} onClick={() => toStash(others.map(i => i.uid))} className="ui-press" style={{ ...mBtn, color: '#9cc4e4', opacity: others.length ? 1 : 0.45 }}>타직업 → 창고 ({others.length})</button>
            <button disabled={ec == null || save.gold < ec} onClick={() => { setSave(E.expandBag(save)); flash(`가방 +${BAG_EXPAND.step}칸`); }} className="ui-press" style={{ ...mBtn, gridColumn: 'span 2', opacity: ec == null || save.gold < ec ? 0.45 : 1 }}>{ec == null ? `가방 최대 확장 (${BAG_EXPAND.max}칸)` : `가방 +${BAG_EXPAND.step}칸 · 🪙 ${ec.toLocaleString()}`}</button>
          </div>
          <MainSecHead title="일 괄 분 해" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[[0, '일반'], [1, '고급 이하'], [2, '희귀 이하']].map(([g, l]) => <button key={g} onClick={() => bulk(g)} className="ui-press" style={{ ...mBtn, color: g === 2 ? '#6aa6e0' : PALETTE.text }}>{l}</button>)}
          </div>
          <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>착용 장비는 항상 제외 · 분해 재화 — 일반 🪙 · 고급 ✦ · 희귀 ✦📜 · 에픽 ✦◆ · 유니크 ◆🔮</div>
          <MainSecHead title="획 득 즉 시 자 동 분 해" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[[-1, '끔'], [0, '일반'], [1, '고급↓'], [2, '희귀↓']].map(([g, l]) => (
              <button key={g} onClick={() => setAutoG(g)} className="ui-press" style={{ height: 36, fontSize: 12, border: `1px solid ${autoG === g ? MS.gold : MS.line}`, color: autoG === g ? MS.gold : PALETTE.textDim, background: autoG === g ? 'rgba(232,176,74,0.12)' : MS.box }}>{l}</button>
            ))}
          </div>
          <button onClick={toggleOther} className="ui-press flex items-center gap-1.5 mt-2" style={{ background: 'transparent', border: 'none', color: incOther ? MS.gold : PALETTE.textDim, padding: '4px 0', fontSize: 12 }}>
            <span className="flex items-center justify-center" style={{ width: 18, height: 18, border: `1.5px solid ${incOther ? MS.gold : MS.line}`, fontSize: 12 }}>{incOther ? '✓' : ''}</span>
            분해·자동 분해에 타직업 장비 포함
          </button>
          <MainSecHead title="정 렬" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['eff', '효율 높은 순 (실전)'], ['power', '전투력 높은 순'], ['grade', '등급 높은 순'], ['level', '레벨 높은 순']].map(([v, l]) => <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ height: 36, fontSize: 12, border: `1px solid ${sortBy === v ? MS.gold : MS.line}`, color: sortBy === v ? MS.gold : PALETTE.textDim, background: sortBy === v ? 'rgba(232,176,74,0.12)' : MS.box }}>{l}</button>)}
          </div>
        </MainModal>
      )}
      {item && (() => {
        const usable = E.itemUsable(item, hero);
        const by = E.equippedBy(save, item.uid);
        const cur = save.inventory.find(i => i.uid === save.units[hero].equip[item.slot]);
        const canPrev = usable && !by && E.canWear(item, save.units[hero]);
        const fb = (extra = {}) => ({ height: 42, fontSize: 13, background: 'transparent', border: `1px solid ${MS.line}`, color: PALETTE.text, ...extra });
        return (
          <MainItemModal save={save} item={item} cur={cur} by={by} usable={usable} evalInfo={usable && !by ? ev.info(item) : null} onClose={() => setSel(null)}
            footer={<>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {by ? <button onClick={() => { setSave(E.unequipItem(save, by, item.slot)); setSel(null); flash('착용 해제'); }} className="ui-press" style={fb({ color: MS.gold, borderColor: MS.gold })}>착용 해제</button>
                  : usable && E.canWear(item, save.units[hero]) ? <button onClick={() => { setSave(E.equipItem(save, hero, item.uid)); setSel(null); flash('장착'); }} className="ui-press" style={fb({ color: MS.gold, borderColor: MS.gold, fontWeight: 800 })}>착용</button>
                    : <button disabled className="ui-press" style={fb({ color: PALETTE.textDim, opacity: 0.6 })}>{usable ? `Lv.${item.ilv}부터 착용` : '착용 불가'}</button>}
                {canPrev ? <button onClick={() => setPreview({ after: E.equipItem(save, hero, item.uid), title: `⚔ ${E.itemName(item)}${item.plus ? ` +${item.plus}` : ''} 장착 시` })} className="ui-press" style={fb()}>📊 효율 미리보기</button>
                  : <button onClick={() => { setSel(null); onForge?.(); }} className="ui-press" style={fb()}>⚒ 대장간</button>}
                {canPrev && <button onClick={() => { setSel(null); onForge?.(); }} className="ui-press" style={fb()}>⚒ 대장간</button>}
                {!by && <button onClick={() => { toStash([item.uid]); setSel(null); }} className="ui-press" style={fb({ color: '#9cc4e4' })}>창고로</button>}
                {!by && <button onClick={() => { const r = E.dismantleItems(save, [item.uid]); setSave(r.save); setSel(null); flash(`분해 → ${E.salvageText(r.salvage)}`); }} className="ui-press" style={fb({ color: '#e07a6a', gridColumn: canPrev ? 'span 2' : 'auto' })}>분해 {E.salvageText(E.salvageOf(item))}</button>}
              </div>
            </>} />
        );
      })()}
      {confirm && <ConfirmSheet {...confirm} danger onCancel={() => setConfirm(null)} />}
      {preview && <PreviewSheet save={save} after={preview.after} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ===== 공용 창고 (계정 공유) =====
export function StashView({ save, setSave, onBack, flash }) {
  // 1.252.0 — 본편 스타일 (시안 ㉗ + PM 「장비 탭과 같은 카드」)
  const [filter, setFilter] = useState('mine');
  const [sel, setSel] = useState(null);
  const [manage, setManage] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const stash = save.stash || [];
  const hero = save.hero;
  const list = stash.filter(i => filter === 'all' || (filter === 'mine' ? E.itemUsable(i, hero) : filter === 'unique' ? i.grade === 'unique' : i.cls === filter))
    .sort((a, b) => gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a));
  const item = sel != null ? stash.find(i => i.uid === sel) : null;
  const bagFull = save.inventory.length >= E.bagMax(save);
  const cnt = (f) => stash.filter(f).length;
  const shortCls = { wanderer: '검사', sage: '술법사', demonblood: '마족', elf: '정령사', priest: '사제' };
  const askDismantle = (uids, title) => {
    if (!uids.length) { flash('분해할 장비가 없습니다'); return; }
    const sal = {}; for (const it of stash.filter(i => uids.includes(i.uid))) for (const [k, v] of Object.entries(E.salvageOf(it))) sal[k] = (sal[k] || 0) + v;
    setConfirm({
      title,
      lines: [{ t: `장비 ${uids.length}개` }, { t: `얻는 재화: ${E.salvageText(sal)}` }, { t: '분해한 장비는 되돌릴 수 없습니다', color: PALETTE.textDim }],
      confirmLabel: `${uids.length}개 분해`,
      onConfirm: () => { const r = E.dismantleStash(save, uids); setSave(r.save); flash(`${uids.length}개 분해 → ${E.salvageText(r.salvage)}`); setConfirm(null); setManage(false); },
    });
  };
  const fb = (extra = {}) => ({ height: 42, fontSize: 13, background: 'transparent', border: `1px solid ${MS.line}`, color: PALETTE.text, ...extra });
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="공용 창고" onBack={onBack} right={<button onClick={() => setManage(true)} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>⚙ 관리</button>} />
      <div className="px-4 pt-2 flex-none">
        <div className="flex justify-between" style={{ fontSize: 12.5 }}><span style={{ color: PALETTE.textDim }}>보관 <span style={{ fontSize: 11 }}>· 가방 {save.inventory.length}/{E.bagMax(save)}</span></span><b style={{ color: PALETTE.text }}>{stash.length} / {A.STASH_MAX}</b></div>
        <div className="mt-1"><Bar v={stash.length} max={A.STASH_MAX} color={MS.gold} h={5} /></div>
      </div>
      <div className="px-3 pt-2 flex-none">
        <MainTabs value={filter} onChange={setFilter} items={[['mine', `착용 가능 ${cnt(i => E.itemUsable(i, hero))}`], ['unique', `유니크 ${cnt(i => i.grade === 'unique')}`], ['all', `전체 ${stash.length}`]]} />
        <MainTabs size={11.5} value={filter} onChange={setFilter} items={CHRONICLE_CLASSES.map(c => [c.id, `${shortCls[c.id] || c.name} ${cnt(i => i.cls === c.id)}`])} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map(it => {
          const usable = E.itemUsable(it, hero);
          return <MainGearCard key={it.uid} it={it} dim={!usable} note={usable ? null : `${chronicleClass(hero).name} 착용 불가`} onClick={() => setSel(it.uid)} />;
        })}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>보관된 장비가 없습니다 — 가방에서 「창고로」를 눌러 보관하세요</div>}
        <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 4 }}>모든 캐릭터가 함께 쓰는 창고 — 다른 직업 장비를 넣어 두면 그 직업 캐릭터가 꺼내 쓴다</div>
      </div>
      {item && (() => {
        const usable = E.itemUsable(item, hero);
        const cur = save.inventory.find(i => i.uid === save.units[hero].equip[item.slot]);
        return (
          <MainItemModal save={save} item={item} cur={cur} by={null} usable={usable} onClose={() => setSel(null)}
            footer={<div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button disabled={bagFull} onClick={() => { setSave(E.takeFromStash(save, item.uid)); setSel(null); flash('가방으로 꺼냄'); }} className="ui-press" style={fb({ color: bagFull ? PALETTE.textDim : MS.gold, borderColor: bagFull ? MS.line : MS.gold, fontWeight: 800 })}>{bagFull ? '가방이 가득 참' : '가방으로 꺼내기'}</button>
              <button onClick={() => askDismantle([item.uid], `${E.itemName(item)} 분해`)} className="ui-press" style={fb({ color: '#e07a6a' })}>분해 {E.salvageText(E.salvageOf(item))}</button>
            </div>} />
        );
      })()}
      {manage && (
        <MainModal kicker="STASH" title="창고 관리" onClose={() => setManage(false)}>
          <MainSecHead title="일 괄 분 해" />
          <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginBottom: 6 }}>지금 보이는 목록({list.length}개) 기준 · 유니크는 제외</div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['고급 이하', 1], ['희귀 이하', 2]].map(([l, gi]) => {
              const ids = list.filter(i => i.grade !== 'unique' && gradeIdx(i.grade) <= gi).map(i => i.uid);
              return <button key={l} onClick={() => askDismantle(ids, `창고 ${l} ${ids.length}개 분해`)} className="ui-press" style={fb({ color: '#e07a6a' })}>{l} {ids.length}개</button>;
            })}
            {(() => { const ids = list.filter(i => !E.itemUsable(i, hero) && i.grade !== 'unique').map(i => i.uid);
              return <button onClick={() => askDismantle(ids, `착용 불가 장비 ${ids.length}개 분해`)} className="ui-press" style={fb({ gridColumn: 'span 2' })}>{chronicleClass(hero).name} 착용 불가 {ids.length}개</button>; })()}
          </div>
        </MainModal>
      )}
      {confirm && <ConfirmSheet {...confirm} danger onCancel={() => setConfirm(null)} />}
    </div>
  );
}
