// ============================================
// components/buried/BuriedBattleScreen.jsx — 무덤의 유산 전투 (1.103.0)
// ============================================
// 1:1 턴제. 행동은 **장착한 6슬롯의 스킬 + 기본 공격**뿐이다 (원작: 장비 = 스킬).
// 자원은 SP — 턴마다 회복하고, 기본 공격은 SP를 되돌려준다.
// 라운드 = 플레이어 행동 → 적 행동 → 양쪽 상태이상 처리(도트·스택 감소) → 다음 라운드.
//
// 전투 수식·상태이상 규칙은 전부 data/buried.js의 순수 함수를 호출한다 (밸런스 단일 출처).

import React, { useState, useRef, useEffect } from 'react';
import { PALETTE, getEnemyImageSrc } from '../../utils/helpers.js';
import {
  BURIED_SKILLS, BURIED_STATUS, BURIED_BASIC, BURIED_SLOT_IDS, BURIED_POTION_HEAL_PCT,
  buriedDerived, buriedEquippedSkills, getBuriedClass, getBuriedTier,
  resolveBuriedAttack, applyBuriedStatuses, tickBuriedStatuses,
  chooseBuriedEnemyAction, buriedCanHeal, buriedEffDodge, buriedEffDef, rollBuriedItem,
} from '../../data.js';
import { BuriedBar, BuriedStatusRow, BuriedItemCard, slotMeta } from './BuriedCommon.jsx';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export default function BuriedBattleScreen({ char, enemy, roomType, onFinish }) {
  const cls = getBuriedClass(char.classId);
  const traitId = cls?.trait?.id || null;
  const d = buriedDerived(char);
  const equipped = buriedEquippedSkills(char);

  const [player, setPlayer] = useState(() => ({
    name: cls?.name || '탐험가',
    hp: char.hp, maxHp: d.maxHp, sp: Math.round(d.maxSp * 0.55), maxSp: d.maxSp,
    atk: d.atk, fin: d.fin, mag: d.mag, def: d.def,
    crit: d.crit, critDmg: d.critDmg, dodge: d.dodge, spRegen: d.spRegen,
    statuses: {}, cds: {}, reflect: 0, reflectTurns: 0,
  }));
  const [foe, setFoe] = useState(() => ({
    name: enemy.name, hp: enemy.hp, maxHp: enemy.hp,
    atk: enemy.atk, fin: enemy.atk, mag: enemy.atk, def: enemy.def,
    crit: 6, critDmg: 55, dodge: 3,
    statuses: {},
  }));
  const [log, setLog] = useState([{ t: `${enemy.name}이(가) 길을 막아섰다.`, c: PALETTE.textDim }]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);      // { win, gold, exp, drops }
  const [floats, setFloats] = useState([]);
  const [potionUsedThisTurn, setPotionUsedThisTurn] = useState(false);
  const [potions, setPotions] = useState(char.potions || 0);
  const [imgFailed, setImgFailed] = useState(false);
  const [detail, setDetail] = useState(null);      // 스킬 상세
  const floatSeq = useRef(0);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const pushLog = (t, c = PALETTE.text) => setLog(l => [...l.slice(-40), { t, c }]);
  const pushFloat = (side, text, color) => {
    const id = ++floatSeq.current;
    setFloats(f => [...f, { id, side, text, color }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 950);
  };

  // 회복량 산출 — [저주]가 있으면 0. 사제 특성 '여명'은 +30%
  const healAmount = (unit, base, isPlayer = true) => {
    if (!buriedCanHeal(unit)) return 0;
    return Math.round(base * (isPlayer && traitId === 'dawnlight' ? 1.3 : 1));
  };

  // ===== 전투 종료 =====
  const finish = (win, finalHp) => {
    if (win) {
      const gold = rnd(enemy.gold[0], enemy.gold[1]);
      const dropChance = roomType === 'boss' ? 100 : roomType === 'elite' ? 100 : 38;
      const drops = [];
      if (Math.random() * 100 < dropChance) {
        const it = rollBuriedItem({
          slot: null, classId: char.classId, floor: char.floor,
          luck: roomType === 'boss' ? 6 : roomType === 'elite' ? 3 : 0,
        });
        if (it) drops.push(it);
      }
      if (roomType === 'boss') {
        const extra = rollBuriedItem({ slot: null, classId: char.classId, floor: char.floor, luck: 8 });
        if (extra) drops.push(extra);
      }
      setResult({ win: true, gold, exp: enemy.exp, drops, hp: Math.max(1, Math.round(finalHp)), potions });
    } else {
      setResult({ win: false, hp: 0, potions });
    }
  };

  // ===== 라운드 진행 =====
  const act = async (kind, payload) => {
    if (busy || result) return;
    setBusy(true);
    let P = { ...player, statuses: { ...player.statuses }, cds: { ...player.cds } };
    let E = { ...foe, statuses: { ...foe.statuses } };

    // ---------- 1. 플레이어 행동 ----------
    // kind === 'skip' — [기절]로 행동을 건너뛴다 (적 턴과 상태이상 처리만 진행)
    const skill = kind === 'skip' ? null : (kind === 'basic' ? BURIED_BASIC : payload);
    if (skill) {
      if (skill.sp > P.sp) { setBusy(false); return; }
      P.sp -= skill.sp;
      if (skill.cd > 0) P.cds[skill.id] = skill.cd + 1; // 이번 턴 종료 시 1 감소하므로 +1
      pushLog(`▶ ${skill.name}`, PALETTE.dawn);
    }

    if (skill && skill.power) {
      const res = resolveBuriedAttack(P, E, skill, { isPlayer: true, traitId });
      if (res.dodged) {
        pushLog(`${E.name}이(가) 회피했다.`, PALETTE.textDim);
        pushFloat('enemy', 'MISS', PALETTE.textDim);
      } else {
        E.hp -= res.total;
        pushFloat('enemy', `-${res.total}${res.crits > 0 ? ' 치명!' : ''}`, res.crits > 0 ? PALETTE.legendary : PALETTE.accent);
        pushLog(`${E.name}에게 ${res.total} 피해${res.crits > 0 ? ` (치명타 ${res.crits}회)` : ''}`, PALETTE.accent);
        // 직업 특성 — 질풍 (치명 시 SP)
        if (traitId === 'gale' && res.crits > 0) {
          P.sp = Math.min(P.maxSp, P.sp + 12 * res.crits);
          pushLog(`질풍 — SP +${12 * res.crits}`, PALETTE.green);
        }
        // 직업 특성 — 발화 (마법 적중 시 화상)
        if (traitId === 'kindle' && skill.stat === 'int' && Math.random() < 0.3) {
          E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'burn', n: 1 }]);
          pushLog('발화 — [화상] 1 추가', '#ff6b35');
        }
        if (skill.drain) {
          const h = healAmount(P, Math.round(res.total * skill.drain / 100));
          if (h > 0) { P.hp = Math.min(P.maxHp, P.hp + h); pushFloat('player', `+${h}`, PALETTE.green); pushLog(`흡혈 ${h} 회복`, PALETTE.green); }
        }
        if (skill.apply) {
          const before = { ...E.statuses };
          E.statuses = applyBuriedStatuses(E.statuses, skill.apply);
          const added = Object.keys(E.statuses).filter(k => (E.statuses[k] || 0) > (before[k] || 0));
          if (added.length > 0) pushLog(`${E.name}에게 ${added.map(k => `[${BURIED_STATUS[k].name}]`).join(' ')}`, PALETTE.twilight);
        }
      }
    } else if (skill && skill.apply) {
      // 순수 디버프 스킬 — 회피 판정 없이 적용
      E.statuses = applyBuriedStatuses(E.statuses, skill.apply);
      pushLog(`${E.name}에게 ${skill.apply.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
    }

    if (skill && skill.self) {
      P.statuses = applyBuriedStatuses(P.statuses, skill.self);
      pushLog(`자신에게 ${skill.self.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.ice);
    }
    if (skill && skill.heal) {
      const h = healAmount(P, skill.heal);
      if (h > 0) { P.hp = Math.min(P.maxHp, P.hp + h); pushFloat('player', `+${h}`, PALETTE.green); pushLog(`HP ${h} 회복`, PALETTE.green); }
      else pushLog('저주가 회복을 막았다.', PALETTE.textDim);
    }
    if (skill && skill.spGain) { P.sp = Math.min(P.maxSp, P.sp + skill.spGain); pushLog(`SP +${skill.spGain}`, PALETTE.ice); }
    if (skill && skill.selfDmg) { P.hp -= skill.selfDmg; pushFloat('player', `-${skill.selfDmg}`, PALETTE.blood); pushLog(`자해 ${skill.selfDmg}`, PALETTE.blood); }
    if (skill && skill.reflect) { P.reflect = skill.reflect; P.reflectTurns = 2; }

    setPlayer(P); setFoe(E);
    await wait(520);

    if (E.hp <= 0) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }

    // ---------- 2. 적 행동 ----------
    if ((E.statuses.stun || 0) > 0) {
      pushLog(`${E.name}은(는) 기절해 움직이지 못한다.`, PALETTE.shock);
      await wait(420);
    } else {
      const action = chooseBuriedEnemyAction(E, enemy.actions);
      pushLog(`◀ ${E.name} — ${action.name}${action.heavy ? ' (강공격)' : ''}`, action.heavy ? PALETTE.legendary : PALETTE.textDim);
      if (action.kind === 'defend') {
        if (action.self) { E.statuses = applyBuriedStatuses(E.statuses, action.self); pushLog(`${E.name}에게 ${action.self.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.ice); }
      } else {
        const eSkill = { power: action.power || 100, hits: action.hits, stat: 'str', pierce: action.pierce };
        const res = resolveBuriedAttack(E, P, eSkill, { isPlayer: false });
        if (res.dodged) {
          pushLog('회피!', PALETTE.green);
          pushFloat('player', 'MISS', PALETTE.green);
          // 직업 특성 — 반격
          if (traitId === 'riposte') {
            const back = resolveBuriedAttack(P, E, { power: Math.round(BURIED_BASIC.power * 0.6), stat: 'str' }, { isPlayer: true, traitId });
            if (!back.dodged) {
              E.hp -= back.total;
              pushFloat('enemy', `-${back.total}`, PALETTE.accent);
              pushLog(`반격 — ${back.total} 피해`, PALETTE.accent);
            }
          }
        } else {
          P.hp -= res.total;
          pushFloat('player', `-${res.total}${res.crits > 0 ? ' 치명!' : ''}`, res.crits > 0 ? PALETTE.legendary : PALETTE.blood);
          pushLog(`${res.total} 피해를 입었다${res.crits > 0 ? ' (치명타)' : ''}`, PALETTE.blood);
          if (P.reflectTurns > 0 && P.reflect > 0) {
            const back = Math.max(1, Math.round(res.total * P.reflect / 100));
            E.hp -= back;
            pushFloat('enemy', `-${back}`, PALETTE.ice);
            pushLog(`가시 반사 — ${back} 피해`, PALETTE.ice);
          }
          if (action.drain) {
            const h = Math.round(res.total * action.drain / 100);
            E.hp = Math.min(E.maxHp, E.hp + h);
            pushLog(`${E.name}이(가) ${h} 흡수했다.`, PALETTE.green);
          }
          if (action.apply) {
            P.statuses = applyBuriedStatuses(P.statuses, action.apply);
            pushLog(`나에게 ${action.apply.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
          }
        }
      }
      setPlayer(P); setFoe(E);
      await wait(520);
    }

    if (E.hp <= 0) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }

    // ---------- 3. 라운드 종료 — 상태이상 처리 ----------
    const pt = tickBuriedStatuses(P, { canHeal: buriedCanHeal(P) });
    if (pt.dmg > 0) { P.hp -= pt.dmg; pushFloat('player', `-${pt.dmg}`, PALETTE.bleed); pushLog(`상태이상 피해 ${pt.dmg} (${pt.log.filter(x => x.dmg).map(x => x.name).join('·')})`, PALETTE.bleed); }
    if (pt.heal > 0) { P.hp = Math.min(P.maxHp, P.hp + pt.heal); pushFloat('player', `+${pt.heal}`, PALETTE.green); pushLog(`재생 ${pt.heal} 회복`, PALETTE.green); }
    P.statuses = pt.statuses;

    const et = tickBuriedStatuses(E, { canHeal: buriedCanHeal(E) });
    if (et.dmg > 0) { E.hp -= et.dmg; pushFloat('enemy', `-${et.dmg}`, PALETTE.bleed); pushLog(`${E.name} 상태이상 피해 ${et.dmg}`, PALETTE.bleed); }
    if (et.heal > 0) E.hp = Math.min(E.maxHp, E.hp + et.heal);
    E.statuses = et.statuses;

    // SP 회복 + 쿨다운 감소 + 반사 지속
    P.sp = Math.min(P.maxSp, P.sp + P.spRegen);
    for (const k of Object.keys(P.cds)) { P.cds[k] = Math.max(0, P.cds[k] - 1); if (P.cds[k] === 0) delete P.cds[k]; }
    if (P.reflectTurns > 0) { P.reflectTurns -= 1; if (P.reflectTurns === 0) P.reflect = 0; }

    setPlayer(P); setFoe(E);
    setPotionUsedThisTurn(false);
    await wait(260);

    if (E.hp <= 0) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }
    setBusy(false);
  };

  // 물약 — 턴을 소모하지 않지만 한 턴에 하나만
  const usePotion = () => {
    if (busy || result || potions <= 0 || potionUsedThisTurn) return;
    const h = healAmount(player, Math.round(player.maxHp * BURIED_POTION_HEAL_PCT / 100));
    if (h <= 0) { pushLog('저주가 회복을 막았다.', PALETTE.textDim); return; }
    setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + h) }));
    setPotions(n => n - 1);
    setPotionUsedThisTurn(true);
    pushFloat('player', `+${h}`, PALETTE.green);
    pushLog(`물약 — HP ${h} 회복`, PALETTE.green);
  };

  const imgSrc = getEnemyImageSrc(enemy.img.key, { chapter: enemy.img.chapter }, 'combat');
  const silenced = (player.statuses.silence || 0) > 0;
  const stunned = (player.statuses.stun || 0) > 0;

  // 기절 상태면 자동으로 턴을 넘긴다
  useEffect(() => {
    if (stunned && !busy && !result) {
      pushLog('기절해 움직일 수 없다!', PALETTE.shock);
      act('skip').catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stunned, busy, result]);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* ===== 적 ===== */}
      <div className="relative shrink-0" style={{ height: '38%', minHeight: 190 }}>
        {imgSrc && !imgFailed
          ? <img src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setImgFailed(true)} style={{ filter: foe.hp <= 0 ? 'grayscale(100%) brightness(0.4)' : 'none', transition: 'filter 500ms' }} />
          : <div className="absolute inset-0 flex items-center justify-center text-[12px]" style={{ background: PALETTE.panel, color: PALETTE.textDim }}>[ 적 모습 미구현 ]</div>}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,3,4,0.75) 0%, rgba(5,3,4,0.15) 45%, rgba(5,3,4,0.92) 100%)' }} />
        <div className="absolute top-2 left-3 right-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-bold" style={{ color: enemy.color || PALETTE.text }}>{enemy.name}</span>
            <span className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {roomType === 'boss' ? '👑 보스' : roomType === 'elite' ? '☠ 강적' : ''} 방어 {buriedEffDef(foe)} · 회피 {buriedEffDodge(foe)}%
            </span>
          </div>
          <BuriedBar value={foe.hp} max={foe.maxHp} color={PALETTE.accent} height={9} showText={false} />
          <div className="text-[11px] tabular-nums text-right mt-0.5" style={{ color: PALETTE.accent }}>{Math.max(0, foe.hp)} / {foe.maxHp}</div>
        </div>
        <div className="absolute bottom-2 left-3 right-3"><BuriedStatusRow statuses={foe.statuses} /></div>
        {floats.filter(f => f.side === 'enemy').map((f, i) => (
          <div key={f.id} className="absolute text-[18px] font-bold tabular-nums pointer-events-none"
            style={{ left: `${42 + (i % 3) * 9}%`, top: '38%', color: f.color, textShadow: '0 2px 6px #000', animation: 'fx-float-up 950ms ease-out forwards' }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* ===== 로그 ===== */}
      <div ref={logRef} className="px-3 py-1.5 overflow-y-auto shrink-0" style={{ height: 86, borderTop: `1px solid ${PALETTE.panelBorder}`, borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        {log.map((l, i) => <div key={i} className="text-[11px] leading-snug" style={{ color: l.c }}>{l.t}</div>)}
      </div>

      {/* ===== 플레이어 ===== */}
      <div className="px-3 pt-2 pb-1 shrink-0 relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] font-bold" style={{ color: cls?.color }}>{cls?.name} Lv.{char.lv}</span>
          <span className="text-[11px] ml-auto" style={{ color: PALETTE.textDim }}>
            방어 {buriedEffDef(player)} · 회피 {buriedEffDodge(player)}%
          </span>
        </div>
        <BuriedBar value={player.hp} max={player.maxHp} color={PALETTE.accent} label="HP" height={9} />
        <div className="mt-1"><BuriedBar value={player.sp} max={player.maxSp} color={PALETTE.ice} label="SP" height={7} /></div>
        <div className="mt-1"><BuriedStatusRow statuses={player.statuses} /></div>
        {floats.filter(f => f.side === 'player').map((f, i) => (
          <div key={f.id} className="absolute text-[17px] font-bold tabular-nums pointer-events-none"
            style={{ left: `${12 + (i % 3) * 9}%`, top: 0, color: f.color, textShadow: '0 2px 6px #000', animation: 'fx-float-up 950ms ease-out forwards' }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* ===== 행동 ===== */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          {/* 기본 공격 */}
          <button onClick={() => act('basic', BURIED_BASIC)} disabled={busy || !!result}
            className="ui-press px-2.5 py-2 text-left"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.dawn}66`, opacity: busy || result ? 0.5 : 1 }}>
            <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>{BURIED_BASIC.name}</div>
            <div className="text-[11px] tabular-nums" style={{ color: PALETTE.ice }}>SP 0 → +{BURIED_BASIC.spGain}</div>
          </button>

          {/* 물약 */}
          <button onClick={usePotion} disabled={busy || !!result || potions <= 0 || potionUsedThisTurn}
            className="ui-press px-2.5 py-2 text-left"
            style={{
              borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
              border: `1px solid ${PALETTE.green}66`,
              opacity: busy || result || potions <= 0 || potionUsedThisTurn ? 0.4 : 1,
            }}>
            <div className="text-[12px] font-bold" style={{ color: PALETTE.green }}>🧪 물약 ×{potions}</div>
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {potionUsedThisTurn ? '이번 턴 사용함' : `HP ${BURIED_POTION_HEAL_PCT}% · 턴 소모 없음`}
            </div>
          </button>

          {/* 장착 장비 6칸 = 스킬 6개 */}
          {equipped.map(({ slot, item, skill }) => {
            const cd = player.cds[skill.id] || 0;
            const noSp = skill.sp > player.sp;
            const off = busy || !!result || cd > 0 || noSp || silenced;
            const tier = getBuriedTier(item.tier);
            return (
              <button key={slot} onClick={() => act('skill', skill)} disabled={off}
                onContextMenu={(e) => { e.preventDefault(); setDetail({ item, skill, slot }); }}
                className="ui-press px-2.5 py-2 text-left"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${tier.color}66`, opacity: off ? 0.42 : 1 }}>
                <div className="text-[12px] font-bold truncate" style={{ color: tier.color }}>{skill.name}</div>
                <div className="text-[11px] tabular-nums truncate" style={{ color: noSp ? PALETTE.accent : PALETTE.ice }}>
                  SP {skill.sp}{cd > 0 ? ` · 쿨 ${cd}` : ''}{skill.power ? ` · ${skill.power}%${skill.hits ? `×${skill.hits}` : ''}` : ''}
                </div>
                <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{slotMeta(slot).icon} {skill.desc}</div>
              </button>
            );
          })}

          {equipped.length < BURIED_SLOT_IDS.length && (
            <div className="col-span-2 px-2.5 py-2 text-[11px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px dashed ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
              빈 슬롯 {BURIED_SLOT_IDS.length - equipped.length}칸 — 장비를 채우면 쓸 수 있는 스킬이 그만큼 늘어난다.
            </div>
          )}
        </div>
        {silenced && (
          <div className="mt-2 px-3 py-2 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.twilight}22`, border: `1px solid ${PALETTE.twilight}66`, color: PALETTE.twilight }}>
            [침묵] — 스킬을 쓸 수 없다. 기본 공격만 가능하다.
          </div>
        )}
      </div>

      {/* ===== 스킬 상세 ===== */}
      {detail && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDetail(null)}>
          <div className="w-full px-3 py-3" onClick={e => e.stopPropagation()}
            style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${PALETTE.panelBorder}`, borderRadius: '18px 18px 0 0' }}>
            <BuriedItemCard item={detail.item} slotId={detail.slot} showSlot />
            <div className="text-[12px] mt-2 leading-relaxed" style={{ color: PALETTE.textDim }}>{detail.skill.desc}</div>
            <button onClick={() => setDetail(null)} className="ui-press w-full mt-2 py-2 text-[12px]" style={{ color: PALETTE.textDim }}>닫기</button>
          </div>
        </div>
      )}

      {/* ===== 결과 ===== */}
      {result && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full px-4 py-4" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.bgDeep, border: `1px solid ${result.win ? PALETTE.legendary : PALETTE.accent}66`, maxHeight: '82%', overflowY: 'auto' }}>
            <div className="text-[15px] font-bold tracking-[0.2em] text-center mb-2" style={{ color: result.win ? PALETTE.legendary : PALETTE.accent }}>
              {result.win ? '격 파' : '사 망'}
            </div>
            {result.win ? (
              <>
                <div className="text-[12px] text-center mb-3" style={{ color: PALETTE.textDim }}>
                  🪙 {result.gold} · EXP {result.exp} 획득
                </div>
                {result.drops.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>전리품</div>
                    {result.drops.map(it => <BuriedItemCard key={it.id} item={it} showSlot />)}
                  </div>
                )}
                <button onClick={() => onFinish(result)} className="ui-press w-full py-3 text-[13px] font-bold"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>
                  계속한다
                </button>
              </>
            ) : (
              <>
                <div className="text-[12px] text-center leading-relaxed mb-3" style={{ color: PALETTE.textDim }}>
                  {cls?.name}은(는) {char.floor}층에서 무덤의 일부가 되었다.<br />
                  장착 중이던 장비 일부와 골드가 <b style={{ color: PALETTE.text }}>유산</b>으로 남는다.
                </div>
                <button onClick={() => onFinish(result)} className="ui-press w-full py-3 text-[13px] font-bold"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                  묻는다
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
