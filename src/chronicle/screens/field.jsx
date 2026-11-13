// ============================================
// chronicle/screens/field.jsx — 황혼 연대기 · 사냥터 · 던전 · 첨탑
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { CHRONICLE_PARTS, CHRONICLE_TUNING, CHRONICLE_FIELDS, CHRONICLE_DUNGEONS, DUNGEON_TIERS, dungeonDef, BOSS_DAILY_LIMIT, BOSS_MECHS, DUNGEON_KEYS, SLOTS, UNIQUE_CHANCE, UNIQUE_ITEMS, fieldStages, FIELD_STAGES, chronicleClass, chronicleEnemyArt } from '../data.js';
import * as E from '../engine.js';
import * as D from '../daily.js';
import { CENEMIES as ENEMIES } from '../enemies.js';
import { Header, Wallet, Bar, UnitIcon, BossMechNote, IntimNote, MainKvRows, MainTabs, MS, MainSecHead, MainModal } from './common.jsx';

export function FieldView({ save, onBack, onFight, onAuto, playScene, sceneOpen }) {
  const [sel, setSel] = useState(() => [...CHRONICLE_FIELDS].reverse().find(f => E.fieldUnlocked(save, f.id))?.id || 1);
  useEffect(() => { if (!sceneOpen) playScene({ at: 'field', fieldId: sel }); }, [sel, sceneOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = CHRONICLE_FIELDS[sel - 1];
  const part = CHRONICLE_PARTS.find(p => p.fields.includes(sel)) || CHRONICLE_PARTS[0];
  const st = E.stageState(save, f.id);
  const stages = fieldStages(f);
  const [stage, setStage] = useState(() => Math.min(st.cleared, FIELD_STAGES - 1));
  useEffect(() => { setStage(Math.min(E.stageState(save, sel).cleared, FIELD_STAGES - 1)); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const cleared = !!save.progress.bossCleared[f.id];
  const bossOpen = E.bossReady(save, f.id);
  const S = stages[stage];
  const sKills = Math.min(st.kills[stage] || 0, S.kills);
  const gateDone = st.cleared > stage;
  const gateOk = E.gateReady(save, f.id, stage);
  const gateEnemy = f.elites[stage % f.elites.length];
  const heroLv = save.units[save.hero].lv;
  const lvColor = (lv) => (lv > heroLv + 2 ? '#e06a5f' : lv > heroLv ? '#e8b04a' : '#8fe08a');
  // 1.251.0 — 본편 스타일 (시안 ⑳)
  const left = E.bossAttemptsLeft(save, f.id);
  const bossName = ENEMIES[f.boss]?.name;
  const sq = (extra = {}) => ({ padding: '11px 0', fontSize: 13, fontWeight: 800, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.textDim, ...extra });
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사냥터" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-none px-4 pt-1">
        <MainTabs size={12.5} value={part.id} onChange={(id) => { const p = CHRONICLE_PARTS.find(x => x.id === id); const last = [...p.fields].reverse().find(fid => E.fieldUnlocked(save, fid)) || p.fields[0]; setSel(last); }}
          items={CHRONICLE_PARTS.map(p => { const open = E.fieldUnlocked(save, p.fields[0]); return [p.id, open ? (p.id === part.id ? p.name : p.name.split(' · ')[0]) : `🔒 ${p.name.split(' · ')[0]}`, false, !open]; })} />
        <MainTabs size={12.5} value={sel} onChange={setSel}
          items={CHRONICLE_FIELDS.filter(x => part.fields.includes(x.id)).map(x => { const open = E.fieldUnlocked(save, x.id); return [x.id, open ? `${x.id} ${x.name.split(' ').pop()}` : `🔒 ${x.id}`, false, !open]; })} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 7', border: `1px solid ${MS.strong}` }}>
          <img src={chronicleEnemyArt(f.normals[Math.min(stage, f.normals.length - 1)])} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 38%, #0b0708)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 18, color: PALETTE.text }}>{f.name} <span style={{ fontSize: 13, color: MS.gold }}>스테이지 {stage + 1}</span></div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>몹 <b style={{ color: lvColor(S.lv) }}>Lv.{S.lv}</b> · 강적 Lv.{S.lv + 1} · 보스 Lv.{f.bossLv}{BOSS_MECHS[E.bossMechOf('field', f.id)] ? ` · ◇ ${BOSS_MECHS[E.bossMechOf('field', f.id)].name}` : ''}</div>
            <IntimNote heroLv={heroLv} lv={S.lv} what="몹" />
          </div>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${stages.length + 1}, 1fr)` }}>
          {stages.map((x, i) => {
            const open = E.stageUnlocked(save, f.id, i); const done = st.cleared > i; const on = stage === i;
            return (
              <button key={i} disabled={!open} onClick={() => setStage(i)} className="ui-press text-center" style={{ padding: '5px 0', border: `1px solid ${on ? MS.gold : done ? '#8fd08a88' : MS.line}`, background: MS.box, borderRadius: MS.r, opacity: open ? 1 : 0.4 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: on ? MS.gold : done ? '#8fd08a' : PALETTE.text }}>{open ? (done ? '✓' : i + 1) : '🔒'}</div>
                <div style={{ fontSize: 11, color: open ? lvColor(x.lv) : PALETTE.textDim }}>Lv.{x.lv}</div>
              </button>
            );
          })}
          <div className="text-center" style={{ padding: '5px 0', border: `1px solid ${bossOpen ? MS.red : MS.line}`, background: MS.box, borderRadius: MS.r, opacity: bossOpen ? 1 : 0.4 }}>
            <div style={{ fontSize: 13 }}>👑</div><div style={{ fontSize: 11, color: PALETTE.textDim }}>Lv.{f.bossLv}</div>
          </div>
        </div>
        <MainSecHead title="처 치 목 표" />
        <div className="flex justify-between" style={{ fontSize: 12.5, color: PALETTE.text }}><span>스테이지 {stage + 1}</span><b>{sKills} / {S.kills}</b></div>
        <Bar v={sKills} max={S.kills} color={MS.gold} h={5} />
        <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>
          {gateDone ? '관문 통과 — 이 스테이지는 자유롭게 사냥할 수 있다'
            : gateOk ? `처치 목표 달성! 관문 강적 「${ENEMIES[gateEnemy]?.name}」(Lv.${S.lv + 1})을 쓰러뜨리면 ${stage + 1 < FIELD_STAGES ? `스테이지 ${stage + 2}` : '보스'} 개방`
              : `채우면 관문 강적 등장 · 강적 ${Math.round(CHRONICLE_TUNING.eliteChance * 100)}% 확률로 출몰`}
          {cleared && <> · 보스 재도전은 하루 {BOSS_DAILY_LIMIT}회</>}
        </div>
        <button onClick={() => onFight(f, 'hunt', stage)} className="ui-press mt-1" style={sq({ padding: '13px 0', fontSize: 14, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.18)', color: '#ff8a7e' })}>⚔ 스테이지 {stage + 1} 사냥 (Lv.{S.lv})</button>
        <button onClick={() => onAuto(f)} className="ui-press" style={sq({ border: `1px solid ${MS.gold}`, color: MS.gold })}>▶ 자동 진행 <span style={{ fontWeight: 400, fontSize: 11.5 }}>사냥 → 관문 → 다음 스테이지 → 보스</span></button>
        {bossOpen && <BossMechNote mech={E.bossMechOf('field', f.id)} compact />}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {gateDone ? <div className="text-center" style={sq({ color: '#8fd08a', fontSize: 12.5 })}>✓ 관문 통과</div>
            : <button disabled={!gateOk} onClick={() => onFight(f, 'gate', stage)} className="ui-press" style={sq(gateOk ? { border: `1px solid ${MS.gold}`, color: MS.gold, fontSize: 12.5 } : { fontSize: 12.5 })}>{gateOk ? `⚔ 관문 — ${ENEMIES[gateEnemy]?.name}` : `🔒 관문 (처치 ${S.kills - sKills} 남음)`}</button>}
          {!bossOpen ? <div className="text-center" style={sq({ fontSize: 12.5 })}>👑 보스 ({FIELD_STAGES} 관문 뒤)</div>
            : cleared && left <= 0 ? <div className="text-center" style={sq({ fontSize: 12 })}>👑 오늘 횟수 소진</div>
              : <button onClick={() => onFight(f, 'boss', null)} className="ui-press" style={sq({ border: `1px solid ${MS.red}`, color: '#ff8a7e', fontSize: 12.5 })}>{cleared ? `👑 재도전 (${left}/${BOSS_DAILY_LIMIT})` : `👑 ${bossName}`}</button>}
        </div>
      </div>
    </div>
  );
}

// ===== 던전 =====
export function DungeonView({ save, onBack, onEnter, onFight, onLeave, onBuyKey, dungeonAuto, onToggleDungeonAuto }) {
  // 1.253.0 — 본편 스타일 (시안 ㉓)
  const d = save.dungeon;
  const opened = CHRONICLE_DUNGEONS.filter(x => E.dungeonUnlocked(save, x.id));
  const [selId, setSelId] = useState(d?.id || opened[opened.length - 1]?.id || 'frostTomb');
  const [tier, setTier] = useState(d?.tier || 0);
  const D = dungeonDef(d ? d.id : selId);
  const T = DUNGEON_TIERS[d ? d.tier || 0 : tier];
  const party = E.partyCombatants(save, d?.hp);
  const best = save.progress.dungeonTier?.[D.id];
  const heroLv = save.units[save.hero].lv;
  const mech = BOSS_MECHS[E.bossMechOf('dungeon', D.id)];
  const partOf = (x) => x.part || 1;
  const parts = [...new Set(CHRONICLE_DUNGEONS.map(partOf))];
  const curPart = partOf(D);
  const inPart = CHRONICLE_DUNGEONS.filter(x => partOf(x) === curPart);
  const keys = E.keyCount(save);
  const bossF = D.floors.find(f => f.boss) || D.floors[D.floors.length - 1];
  const sq = (extra = {}) => ({ padding: '12px 0', fontSize: 14, fontWeight: 800, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.text, width: '100%', ...extra });
  const hotBtn = { border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.18)', color: '#ff8a7e' };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={d ? `${D.name} · ${T.label}` : '던전'} onBack={d ? null : onBack} right={<div className="flex items-center gap-2"><span style={{ fontSize: 12, color: MS.gold }}>🗝 {keys}</span><Wallet save={save} /></div>} />
      {!d && (
        <div className="px-3 flex-none">
          <MainTabs size={12.5} value={curPart} onChange={(pid) => { const list = CHRONICLE_DUNGEONS.filter(x => partOf(x) === pid); const last = [...list].reverse().find(x => E.dungeonUnlocked(save, x.id)) || list[0]; setSelId(last.id); setTier(0); }}
            items={parts.map(pid => { const open = CHRONICLE_DUNGEONS.some(x => partOf(x) === pid && E.dungeonUnlocked(save, x.id)); return [pid, open ? `${pid}부` : `🔒 ${pid}부`, false, !open]; })} />
          <MainTabs size={11.5} value={D.id} onChange={(id) => { setSelId(id); setTier(0); }}
            items={inPart.map(x => { const open = E.dungeonUnlocked(save, x.id); return [x.id, open ? x.name : `🔒 ${x.name}`, false, !open]; })} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2.5">
        <div className="relative overflow-hidden" style={{ height: 150, border: `1px solid ${MS.line}` }}>
          <img src={chronicleEnemyArt(D.art)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 35%, #0b0708)' }} />
          <div className="absolute left-3 right-3 bottom-2">
            <div className="font-bold" style={{ fontSize: 19, color: PALETTE.text }}>{D.name} <span style={{ fontSize: 13, color: MS.gold }}>권장 Lv.{D.recLv + T.lv}</span></div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>{D.floors.length}층 · 보스 Lv.{bossF.lv + T.lv}{mech ? ` · 기믹 ${mech.icon} ${mech.name}` : ''}</div>
          </div>
        </div>
        {!d && <>
          <MainSecHead title="난 이 도" right={<span style={{ fontSize: 11, color: PALETTE.textDim }}>앞 단계 보스 처치 시 개방</span>} />
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${DUNGEON_TIERS.length}, 1fr)` }}>
            {DUNGEON_TIERS.map((t, i) => {
              const open = E.dungeonTierUnlocked(save, D.id, i);
              const cleared = best != null && best >= i;
              const on = tier === i;
              return (
                <button key={t.id} disabled={!open} onClick={() => setTier(i)} className="ui-press" style={{ padding: '7px 0', fontSize: 12.5, fontWeight: on ? 800 : 500, border: `1px solid ${on ? MS.gold : MS.line}`, background: on ? 'rgba(232,176,74,0.1)' : MS.box, color: on ? MS.gold : PALETTE.text, opacity: open ? 1 : 0.45 }}>
                  {open ? t.label : `🔒 ${t.label}`} <span style={{ fontWeight: 400, color: PALETTE.textDim }}>🗝{t.keyCost}</span>{cleared ? <span style={{ color: '#8fd08a' }}> ✓</span> : null}
                </button>
              );
            })}
          </div>
        </>}
        <MainSecHead title="층" right={d ? <span style={{ fontSize: 11, color: PALETTE.textDim }}>층 사이 최대 HP 25% 회복</span> : null} />
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${D.floors.length}, 1fr)` }}>
          {D.floors.map((f, i) => {
            const curF = d && d.floor === i; const past = d && d.floor > i;
            const lv = f.lv + T.lv; const intim = E.intimidateLevel(heroLv, lv);
            return (
              <div key={i} className="text-center" style={{ padding: '5px 0', fontSize: 11.5, border: `1px solid ${curF ? MS.gold : past ? '#8fd08a88' : MS.line}`, background: MS.box, borderRadius: MS.r, color: past ? '#8fd08a' : curF ? MS.gold : f.boss ? MS.gold : PALETTE.text }}>
                <b style={{ fontSize: 13, display: 'block' }}>{past ? '✓' : f.boss ? '👑' : i + 1}</b>
                <span style={{ color: intim ? '#ff7a6a' : undefined }}>Lv.{lv}</span>
              </div>
            );
          })}
        </div>
        {!d && (
          <div className="mt-2"><MainKvRows rows={[
            { l: '적 HP', v: `×${T.hp}` }, { l: '적 공격', v: `×${T.atk}` },
            { l: '에픽 확률', v: `×${T.epicMult}` }, { l: '보스 유니크', v: `${Math.round(UNIQUE_CHANCE.dungeonBoss[tier] * 100)}%`, c: '#c79bff' },
            { l: '◆ 파편', v: `×${T.shardMult}` }, { l: '입장 열쇠', v: `🗝 ${T.keyCost}`, c: MS.gold },
          ]} /></div>
        )}
        <div className="mt-1.5"><IntimNote heroLv={heroLv} lv={Math.max(...D.floors.map(x => x.lv)) + T.lv} what="던전 최고층" /></div>
        {mech && (
          <div className="mt-1.5" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, lineHeight: 1.55 }}>
            <b style={{ color: MS.gold }}>{mech.icon} {mech.name}</b> <span style={{ color: PALETTE.text }}>— {mech.desc}</span>
            <div style={{ color: '#8fd08a' }}>💡 공략: {mech.tip}</div>
          </div>
        )}
        <MainSecHead title={d ? '내 상 태' : '파 티'} />
        <div className="flex flex-col gap-1.5">
          {party.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <UnitIcon u={p} size={28} dim={p.hp <= 0} />
              <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={6} /></div>
              <span style={{ fontSize: 11, color: PALETTE.textDim, width: 74, textAlign: 'right' }}>{p.hp.toLocaleString()}/{p.maxHp.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          {!d ? <>
            <button disabled={keys < T.keyCost} onClick={() => onEnter(D.id, tier)} className="ui-press" style={sq(keys < T.keyCost ? { color: PALETTE.textDim } : hotBtn)}>
              {keys < T.keyCost ? `열쇠 부족 (🗝 ${T.keyCost}개 필요)` : `입장 — ${T.label} · 🗝 ${T.keyCost}개`}
            </button>
            <button onClick={onToggleDungeonAuto} className="ui-press" style={sq({ fontSize: 13, border: `1px solid ${dungeonAuto ? MS.gold : MS.line}`, color: dungeonAuto ? MS.gold : PALETTE.textDim })}>▶ 연속 도전 {dungeonAuto ? '켜짐' : '꺼짐'} <span style={{ fontWeight: 400, fontSize: 11.5 }}>승리하면 보스까지 자동</span></button>
          </> : <>
            <button onClick={onFight} className="ui-press" style={sq(hotBtn)}>{D.floors[d.floor].boss ? '👑 보스와 싸운다' : `⚔ ${d.floor + 1}층 전투`}{dungeonAuto && !D.floors[d.floor].boss ? ' → 보스까지 연속' : ''}</button>
            <button onClick={onToggleDungeonAuto} className="ui-press" style={sq({ fontSize: 13, border: `1px solid ${dungeonAuto ? MS.gold : MS.line}`, color: dungeonAuto ? MS.gold : PALETTE.textDim })}>▶ 연속 도전 {dungeonAuto ? '켜짐' : '꺼짐'}</button>
            <button onClick={onLeave} className="ui-press" style={sq({ fontSize: 13, fontWeight: 500 })}>후퇴 (마을로)</button>
          </>}
        </div>
        {!d && <>
          <MainSecHead title="열 쇠" />
          <div className="flex items-center justify-between gap-2" style={{ fontSize: 12.5 }}>
            <span style={{ color: PALETTE.textDim }}>🗝 던전 열쇠 <b style={{ color: MS.gold, fontSize: 14 }}>{keys} / {DUNGEON_KEYS.max}</b></span>
            <button disabled={!E.canBuyKey(save)} onClick={onBuyKey} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${E.canBuyKey(save) ? MS.gold : MS.line}`, color: E.canBuyKey(save) ? MS.gold : PALETTE.textDim, background: MS.box, borderRadius: MS.r, opacity: E.canBuyKey(save) ? 1 : 0.55 }}>
              구매 🪙{DUNGEON_KEYS.shopPrice} ({E.keysBoughtToday(save)}/{DUNGEON_KEYS.shopDailyLimit})
            </button>
          </div>
          <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.5 }}>매일 0시 3개까지 충전 · 사냥터 강적 처치 시 {Math.round(DUNGEON_KEYS.eliteDrop * 100)}% · 입장 시 소모(후퇴·전멸해도 돌려받지 못함)</div>
        </>}
      </div>
    </div>
  );
}

// ===== 무한 탑 「황혼의 첨탑」 (1.215.0) =====
export function TowerView({ save, setSave, onBack, onFight, flash, towerAuto = false, onToggleTowerAuto, onStartAuto }) {
  const [shop, setShop] = useState(false);
  const [pickUnique, setPickUnique] = useState(false);
  const t = save.tower || { best: 0, checkpoint: 0, run: null };
  const run = t.run;
  const coins = save.mats.towerCoin || 0;
  const wk = save.towerWeek;
  const nextFloor = run ? run.floor : (t.checkpoint || 0) + 1;
  const boss = E.isTowerBoss(nextFloor);
  const party = E.partyCombatants(save, run?.hp);
  const nextCp = Math.ceil(nextFloor / E.TOWER.bossEvery) * E.TOWER.bossEvery;
  const myUniques = Object.values(UNIQUE_ITEMS).filter(u => !u.disabled && !u.branch && (u.cls === save.hero || u.cls === 'common'));
  const buy = (id, uid) => { const n = E.buyTowerItem(save, id, uid); if (n === save) { flash('구매할 수 없습니다'); return false; } setSave(n); flash('구매 완료'); return true; };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={run ? `황혼의 첨탑 · ${run.floor}층` : '황혼의 첨탑'} onBack={run ? null : onBack} right={<span style={{ fontSize: 12.5, color: '#e8b04a' }}>✪ {coins}</span>} />
      {/* 1.253.0 — 본편 스타일 (시안 ㉔) */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2.5">
        <div className="relative overflow-hidden" style={{ height: 150, border: `1px solid ${MS.line}` }}>
          <img src={chronicleEnemyArt('champ_dawn_boss4', 'combat')} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.9 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 35%, #0b0708)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 19, color: PALETTE.text }}>{nextFloor}층 {boss ? <span style={{ color: MS.gold }}>👑 보스</span> : nextFloor % 5 === 0 ? <span style={{ color: '#ff8a7e' }}>⚔ 강적</span> : null} <span style={{ fontSize: 13, color: MS.gold }}>적 Lv.{E.towerEnemyLv(nextFloor)}</span></div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>다음 체크포인트 {nextCp}층 · {E.TOWER.bossEvery}층마다 보스{boss ? ` · 유니크 ${Math.round(E.TOWER.uniqueChance(nextFloor) * 100)}%` : ''}</div>
          </div>
        </div>
        <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[['최고', t.best || 0, MS.gold], ['체크포인트', t.checkpoint || 0], ['이번 주', wk?.key && wk.key === E.towerWeekKeyNow() ? wk.best : 0]].map(([l, v, c]) => (
            <div key={l} className="text-center" style={{ padding: '6px 0', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r }}>
              <div style={{ fontSize: 11, color: PALETTE.textDim }}>{l}</div>
              <b style={{ fontSize: 15, color: c || PALETTE.text }}>{v}층</b>
            </div>
          ))}
        </div>
        {run && <>
          <MainSecHead title="내 상 태" right={<span style={{ fontSize: 11, color: PALETTE.textDim }}>층 사이 최대 HP 25% 회복</span>} />
          <div className="flex flex-col gap-1.5">
            {party.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <UnitIcon u={p} size={28} dim={p.hp <= 0} />
                <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={6} /></div>
                <span style={{ fontSize: 11, color: PALETTE.textDim, width: 74, textAlign: 'right' }}>{p.hp.toLocaleString()}/{p.maxHp.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>}
        {(() => {
          const sq = (extra = {}) => ({ padding: '12px 0', fontSize: 14, fontWeight: 800, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.text, width: '100%', ...extra });
          const hot = { border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.18)', color: '#ff8a7e' };
          const gold = { fontSize: 13, border: `1px solid ${MS.gold}`, color: MS.gold };
          return (
            <div className="flex flex-col gap-1.5 mt-3">
              {run ? <>
                <button onClick={onFight} className="ui-press" style={sq(hot)}>{boss ? `👑 ${run.floor}층 보스와 싸운다` : `⚔ ${run.floor}층 전투`}{towerAuto ? ' → 실패할 때까지' : ''}</button>
                <button onClick={onToggleTowerAuto} className="ui-press" style={sq(towerAuto ? gold : { fontSize: 13, color: PALETTE.textDim })}>⏫ 자동 등반 {towerAuto ? '켜짐' : '꺼짐'} <span style={{ fontWeight: 400, fontSize: 11.5 }}>패배하면 멈춤</span></button>
                <button onClick={() => setSave(E.leaveTower(save))} className="ui-press" style={sq({ fontSize: 13, fontWeight: 500 })}>도전 종료 (체크포인트 {t.checkpoint || 0}층 유지)</button>
              </> : <>
                <button onClick={() => setSave(E.startTower(save))} className="ui-press" style={sq(hot)}>🗼 {nextFloor}층부터 도전 (무료)</button>
                <button onClick={onStartAuto} className="ui-press" style={sq(gold)}>⏫ 자동 등반 <span style={{ fontWeight: 400, fontSize: 11.5 }}>실패할 때까지</span></button>
              </>}
              <button onClick={() => setShop(true)} className="ui-press" style={sq({ fontSize: 13 })}>✪ 첨탑 상점 <span style={{ fontWeight: 400, fontSize: 11.5, color: MS.gold }}>보유 ✪ {coins}</span></button>
            </div>
          );
        })()}
        {(() => {
          const sec = (title) => <div style={{ margin: '14px 0 6px' }}><span className="chr-head">{title}</span></div>;
          return <>
            {sec('규칙')}
            <MainKvRows rows={[
              { l: '층마다', v: '적 Lv +1' }, { l: '층 사이', v: 'HP 25% 회복' },
              { l: `${E.TOWER.bossEvery}층`, v: '보스·체크포인트' }, { l: '쓰러지면', v: '도전 종료' },
              { l: '입장', v: '무료', c: '#8fe08a' }, { l: '보스', v: '사냥터·던전 번갈아' },
            ]} />
            {sec('주화')}
            <MainKvRows rows={[
              { l: '일반 층', v: `✪ ${E.TOWER.coins(1)}~`, c: MS.gold }, { l: '보스 층', v: `×${E.TOWER.bossCoinMult}`, c: MS.gold },
              { l: '주간 보너스', v: '층 ×3', c: MS.gold }, { l: '초기화', v: '월요일 0시' },
            ]} />
            <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 3 }}>주간 보너스 = 이번 주 처음 도달한 {E.TOWER.bossEvery}층 단위마다 층 × 3</div>
          </>;
        })()}
      </div>
      {shop && (
        // 1.255.0 — 본편 카드 창 (시안 ㉝)
        <MainModal kicker="TOWER SHOP" title="첨탑 상점" badge={`✪ ${coins}`} color={MS.red} sub="층을 올라 받은 ✪ 주화로 구매" onClose={() => setShop(false)}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {E.TOWER_SHOP.map(it => {
              const ok = E.towerShopCanBuy(save, it.id);
              const lack = Math.max(0, it.cost - coins);
              const wide = it.id === 'unique';
              return (
                <button key={it.id} disabled={!ok} onClick={() => (it.id === 'unique' ? setPickUnique(true) : buy(it.id))} className="ui-press text-left flex flex-col" style={{ gridColumn: wide ? 'span 2' : undefined, padding: '8px 9px', border: `1px solid ${wide ? '#f0883e88' : MS.line}`, background: MS.box, borderRadius: MS.r, opacity: ok ? 1 : 0.6 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: wide ? '#f0a86a' : PALETTE.text }}>{it.name}</div>
                  <div className="flex-1" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.4, minHeight: 28 }}>{it.desc}</div>
                  <div className="flex items-center justify-between mt-1.5" style={{ fontSize: 12 }}>
                    <span style={{ padding: '0 7px', border: `1px solid ${MS.gold}`, color: MS.gold, fontWeight: 700 }}>✪ {it.cost}</span>
                    <b style={{ color: ok ? '#8fd08a' : '#e07a6a' }}>{ok ? '구매' : lack ? `${lack} 부족` : '구매 불가'}</b>
                  </div>
                </button>
              );
            })}
          </div>
        </MainModal>
      )}
      {pickUnique && (
        <MainModal kicker="UNIQUE BOX" title="유니크 선택" badge={`Lv.${save.units[save.hero].lv}`} color="#f0883e" sub="하나를 고르면 ✪ 600을 쓰고 바로 얻는다" onClose={() => setPickUnique(false)}>
          <div className="flex flex-col gap-1.5">
            {myUniques.map(u => {
              const sl = SLOTS.find(x => x.id === u.slot);
              return (
                <button key={u.id} onClick={() => { if (buy('unique', u.id)) { setPickUnique(false); setShop(false); } }} className="ui-press w-full text-left" style={{ padding: '8px 10px 8px 12px', background: MS.box, borderRadius: MS.r, border: `1px solid ${MS.line}`, borderLeft: '3px solid #f0883e' }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-bold" style={{ fontSize: 13.5, color: '#f0883e' }}>{sl?.icon} {u.name}</span>
                    <span className="flex-none" style={{ fontSize: 11, color: PALETTE.textDim }}>{sl?.label} · {u.cls === 'common' ? '공용' : chronicleClass(u.cls).name}</span>
                  </div>
                  <div className="grid mt-1" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
                    {Object.entries(u.opts).map(([k, v]) => { const t = E.statLabel(k, v); const m = t.match(/^(.*?)\s*([+-]?[\d.]+.*)$/); return (
                      <div key={k} className="flex items-baseline justify-between gap-1" style={{ padding: '1px 0' }}>
                        <span className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{m ? m[1] : t}</span><span style={{ fontSize: 12, fontWeight: 800, color: MS.red }}>{m ? m[2] : ''}</span>
                      </div>
                    ); })}
                    <div className="flex items-baseline justify-between gap-1" style={{ padding: '1px 0' }}><span style={{ fontSize: 11.5, color: PALETTE.textDim }}>무작위 옵션</span><span style={{ fontSize: 12, fontWeight: 800, color: MS.red }}>+1</span></div>
                  </div>
                  <div className="mt-1" style={{ fontSize: 11.5, color: '#c79bff', lineHeight: 1.45 }}>★ <span style={{ color: PALETTE.text }}>{u.desc}</span></div>
                </button>
              );
            })}
          </div>
        </MainModal>
      )}
    </div>
  );
}
