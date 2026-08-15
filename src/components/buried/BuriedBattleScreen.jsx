// ============================================
// components/buried/BuriedBattleScreen.jsx — 무덤의 유산 전투 (1.104.0)
// ============================================
// 1:1 턴제. 행동은 **장착한 6슬롯의 스킬 + 기본 공격**뿐이다 (원작: 장비 = 스킬).
// 라운드 = 플레이어 행동 → 적 행동 → 양쪽 상태이상 처리(도트·스택 감소) → 다음 라운드.
//
// 1.104.0에서 원작 규칙 5종이 이 화면에 들어왔다:
//   ① 보호막(barrier) — HP 위에 덧씌워져 먼저 깎인다. 관통 스킬은 무시하고 HP를 때린다.
//   ② 추격 피해(chase) — 스킬이 적중하면 본체와 별개로 한 번 더 들어간다.
//   ③ 방 효과 / 층 효과 — 붉은 이름 방은 나와 적 모두에게 적용된다.
//   ④ 스킬 레벨 1~8 — Lv.3·Lv.8에서 추가 효과. buriedSkillAt이 실효 스킬을 만든다.
//   ⑤ 특성 3개 — 직업 전용 1 + 공용 2. 스탯형은 파생 스탯에 이미 반영, 트리거형만 여기서 판정.
//
// 전투 수식·상태이상 규칙은 전부 data/buried.js의 순수 함수를 호출한다 (밸런스 단일 출처).

import React, { useState, useRef, useEffect } from 'react';
import { PALETTE, getEnemyImageSrc } from '../../utils/helpers.js';
import {
  BURIED_STATUS, BURIED_BASIC, BURIED_SLOT_IDS, BURIED_POTION_HEAL_PCT,
  BURIED_ROOM_COLORS,
  buriedDerived, buriedEquippedSkills, getBuriedClass, getBuriedTier,
  resolveBuriedAttack, applyBuriedStatuses, tickBuriedStatuses, applyBuriedDamage,
  chooseBuriedEnemyAction, buriedCanHeal, buriedEffDodge, buriedEffDef, rollBuriedItem,
  buriedSkillAt, buriedSkillLv, buriedSkillLvNote, buriedTraitIds, getBuriedTrait,
  getBuriedRoomEffect, getBuriedFloorEffect, resolveBuriedEnvFx, getBuriedDungeon,
} from '../../data.js';
import { BuriedBar, BuriedStatusRow, BuriedItemCard, slotMeta, SkillKindBadge } from './BuriedCommon.jsx';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export default function BuriedBattleScreen({ char, enemy, roomType, roomEffectId, onFinish }) {
  const cls = getBuriedClass(char.classId);
  const traits = buriedTraitIds(char);
  const d = buriedDerived(char);
  const equipped = buriedEquippedSkills(char);
  const dungeon = getBuriedDungeon(char.dungeonId);

  // ===== 방 효과 / 층 효과 — 전투 시작 전에 한 번 계산해 유닛에 발라둔다 =====
  const roomFx = getBuriedRoomEffect(roomEffectId);
  const floorFx = getBuriedFloorEffect(char.floorEffect);
  const env = resolveBuriedEnvFx(roomEffectId, char.floorEffect);

  const [player, setPlayer] = useState(() => ({
    name: cls?.name || '탐험가',
    hp: char.hp, maxHp: d.maxHp, sp: Math.round(d.maxSp * 0.55), maxSp: d.maxSp,
    barrier: (d.barrier || 0) + (env.self.barrierAdd || 0),
    atk: d.atk, fin: d.fin, mag: d.mag, def: d.def, chase: d.chase || 0,
    crit: d.crit, critDmg: d.critDmg, dodge: d.dodge, spRegen: d.spRegen,
    statuses: {}, cds: {}, reflect: 0, reflectTurns: 0,
    envDmgPct: env.self.dmgPct || 0, envTakenPct: env.self.takenPct || 0,
    envCritAdd: env.self.critAdd || 0, envMagPct: env.self.magPct || 0,
    envDodgeAdd: env.self.dodgeAdd || 0,
  }));
  const [foe, setFoe] = useState(() => ({
    name: enemy.name, hp: enemy.hp, maxHp: enemy.hp, barrier: 0,
    atk: enemy.atk, fin: enemy.atk, mag: enemy.atk, def: enemy.def, chase: 0,
    crit: 6, critDmg: 55, dodge: 3,
    statuses: {},
    envDmgPct: env.foe.dmgPct || 0, envTakenPct: env.foe.takenPct || 0,
    envCritAdd: env.foe.critAdd || 0, envMagPct: 0, envDodgeAdd: env.foe.dodgeAdd || 0,
  }));

  const [log, setLog] = useState(() => {
    const init = [{ t: `${enemy.name} (Lv.${enemy.lv || 1})이(가) 길을 막아섰다.`, c: PALETTE.textDim }];
    if (floorFx) init.push({ t: `★ ${floorFx.name} — ${floorFx.desc}`, c: PALETTE.legendary });
    if (roomFx) init.push({ t: `${roomFx.both ? '◆' : '◇'} ${roomFx.name} — ${roomFx.desc}`, c: BURIED_ROOM_COLORS[roomFx.color]?.color || PALETTE.dawn });
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [floats, setFloats] = useState([]);
  const [potionUsedThisTurn, setPotionUsedThisTurn] = useState(false);
  const [potions, setPotions] = useState(char.potions || 0);
  const [imgFailed, setImgFailed] = useState(false);
  const [detail, setDetail] = useState(null);
  const floatSeq = useRef(0);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const pushLog = (t, c = PALETTE.text) => setLog(l => [...l.slice(-40), { t, c }]);
  const pushFloat = (side, text, color) => {
    const id = ++floatSeq.current;
    setFloats(f => [...f, { id, side, text, color }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 950);
  };

  // 회복량 — [저주]·「저주받은 묘실」이면 0. 여명/대여명 특성과 「생명의 샘」 반영
  const healAmount = (unit, base, isPlayer = true) => {
    if (!buriedCanHeal(unit)) return 0;
    if (isPlayer && env.self.noHeal) return 0;
    if (!isPlayer && env.foe.noHeal) return 0;
    let mult = 1;
    if (isPlayer) {
      if (traits.includes('highdawn')) mult += 0.6;
      else if (traits.includes('dawnlight')) mult += 0.3;
      mult += (d.healPct || 0) / 100;
      mult += (env.self.healPct || 0) / 100;
    }
    return Math.round(base * mult);
  };

  // 회복 적용 — 대여명 특성은 회복량의 50%를 보호막으로 덧입힌다
  const applyHeal = (P, base) => {
    const h = healAmount(P, base, true);
    if (h <= 0) return 0;
    P.hp = Math.min(P.maxHp, P.hp + h);
    if (traits.includes('highdawn')) P.barrier = (P.barrier || 0) + Math.round(h * 0.5);
    return h;
  };

  // 데미지 적용 — 보호막을 먼저 깎는다
  const hurt = (unit, dmg, pierceBarrier = false) => {
    const r = applyBuriedDamage(unit, dmg, { pierceBarrier });
    unit.barrier = r.barrier;
    unit.hp = r.hp;
    return r;
  };
  const dmgText = (r, extra = '') => `-${r.toHp}${r.absorbed > 0 ? ` (🔷${r.absorbed})` : ''}${extra}`;

  const statusOpts = { chancePct: env.self.statusChancePct || 0, extra: env.self.statusExtra || 0 };
  const foeStatusOpts = { chancePct: env.foe.statusChancePct || 0, extra: 0 };

  // ===== 전투 종료 =====
  const finish = (win, finalHp) => {
    if (win) {
      const goldMult = dungeon.goldMult * (1 + (env.meta.goldPct || 0) / 100);
      const gold = Math.round(rnd(enemy.gold[0], enemy.gold[1]) * goldMult);
      const exp = Math.round(enemy.exp * dungeon.expMult);
      const dropChance = roomType === 'boss' ? 100 : roomType === 'elite' ? 100 : 38;
      const drops = [];
      const luck = dungeon.dropLuck + (roomType === 'boss' ? 6 : roomType === 'elite' ? 3 : 0);
      if (Math.random() * 100 < dropChance) {
        const it = rollBuriedItem({ slot: null, classId: char.classId, floor: enemy.lv || char.floor, luck });
        if (it) drops.push(it);
      }
      if (roomType === 'boss') {
        const extra = rollBuriedItem({ slot: null, classId: char.classId, floor: enemy.lv || char.floor, luck: luck + 2 });
        if (extra) drops.push(extra);
      }
      setResult({ win: true, gold, exp, drops, hp: Math.max(1, Math.round(finalHp)), potions });
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
      // 「봉인의 방」은 SP 소모를 올린다
      const spCost = Math.round(skill.sp * (1 + (env.self.spCostPct || 0) / 100));
      if (spCost > P.sp) { setBusy(false); return; }
      P.sp -= spCost;
      if (skill.cd > 0) P.cds[skill.id] = skill.cd + 1; // 이번 턴 종료 시 1 감소하므로 +1
      pushLog(`▶ ${skill.name}${skill.lv > 1 ? ` Lv.${skill.lv}` : ''}`, PALETTE.dawn);
    }

    if (skill && skill.power) {
      const res = resolveBuriedAttack(P, E, skill, { isPlayer: true, traits });
      if (res.dodged) {
        pushLog(`${E.name}이(가) 회피했다.`, PALETTE.textDim);
        pushFloat('enemy', 'MISS', PALETTE.textDim);
      } else {
        const r = hurt(E, res.total, !!skill.pierce);
        pushFloat('enemy', dmgText(r, res.crits > 0 ? ' 치명!' : ''), res.crits > 0 ? PALETTE.legendary : PALETTE.accent);
        pushLog(`${E.name}에게 ${res.total} 피해${r.absorbed > 0 ? ` (보호막 ${r.absorbed} 흡수)` : ''}${res.crits > 0 ? ` · 치명타 ${res.crits}회` : ''}`, PALETTE.accent);

        // 추격 피해 — 본체와 별개로 한 번 더
        if (res.chase > 0) {
          const cr = hurt(E, res.chase, false);
          pushFloat('enemy', `추격 ${dmgText(cr)}`, PALETTE.dawn);
          pushLog(`추격 피해 ${res.chase}`, PALETTE.dawn);
        }
        // 특성 — 질풍/폭풍 (치명 시 SP)
        if ((traits.includes('gale') || traits.includes('tempest')) && res.crits > 0) {
          P.sp = Math.min(P.maxSp, P.sp + 12 * res.crits);
          pushLog(`${traits.includes('tempest') ? '폭풍' : '질풍'} — SP +${12 * res.crits}`, PALETTE.green);
        }
        // 특성 — 발화/겁화 (마법 적중 시 화상)
        if (skill.stat === 'int' && (traits.includes('kindle') || traits.includes('conflag'))) {
          const chance = traits.includes('conflag') ? 0.6 : 0.3;
          if (Math.random() < chance) {
            E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'burn', n: 1 }], statusOpts);
            pushLog(`${traits.includes('conflag') ? '겁화' : '발화'} — [화상] 1 추가`, '#ff6b35');
          }
        }
        // 특성 — 겁화 (화상 스택당 추가 피해)
        if (traits.includes('conflag') && (E.statuses.burn || 0) > 0) {
          const stacks = E.statuses.burn || 0;
          const extra = stacks * 3;
          const er = hurt(E, extra, false);
          pushFloat('enemy', dmgText(er), '#ff6b35');
          pushLog(`겁화 — 화상 ${stacks}스택 × 3 = ${extra} 추가 피해`, '#ff6b35');
        }
        // 흡혈 (스킬 drain + 특성 흡혈 기질)
        const drainPct = (skill.drain || 0) + (d.drainPct || 0);
        if (drainPct > 0) {
          const h = applyHeal(P, Math.round((res.total + res.chase) * drainPct / 100));
          if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`흡혈 ${h} 회복`, PALETTE.green); }
        }
        if (skill.apply) {
          const before = { ...E.statuses };
          E.statuses = applyBuriedStatuses(E.statuses, skill.apply, statusOpts);
          const added = Object.keys(E.statuses).filter(k => (E.statuses[k] || 0) > (before[k] || 0));
          if (added.length > 0) pushLog(`${E.name}에게 ${added.map(k => `[${BURIED_STATUS[k].name}]`).join(' ')}`, PALETTE.twilight);
        }
      }
    } else if (skill && skill.apply) {
      E.statuses = applyBuriedStatuses(E.statuses, skill.apply, statusOpts);
      pushLog(`${E.name}에게 ${skill.apply.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
    }

    if (skill && skill.self) {
      P.statuses = applyBuriedStatuses(P.statuses, skill.self, { extra: env.self.statusExtra || 0 });
      pushLog(`자신에게 ${skill.self.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.ice);
    }
    if (skill && skill.heal) {
      const h = applyHeal(P, skill.heal);
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`HP ${h} 회복`, PALETTE.green); }
      else pushLog('회복이 봉쇄되어 있다.', PALETTE.textDim);
    }
    if (skill && skill.barrierGain) {
      P.barrier = (P.barrier || 0) + skill.barrierGain;
      pushFloat('player', `🔷+${skill.barrierGain}`, PALETTE.ice);
      pushLog(`보호막 +${skill.barrierGain}`, PALETTE.ice);
    }
    if (skill && skill.spGain) { P.sp = Math.min(P.maxSp, P.sp + skill.spGain); pushLog(`SP +${skill.spGain}`, PALETTE.ice); }
    if (skill && skill.selfDmg) { hurt(P, skill.selfDmg, true); pushFloat('player', `-${skill.selfDmg}`, PALETTE.blood); pushLog(`자해 ${skill.selfDmg}`, PALETTE.blood); }
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
        if (action.self) { E.statuses = applyBuriedStatuses(E.statuses, action.self, foeStatusOpts); pushLog(`${E.name}에게 ${action.self.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.ice); }
      } else {
        const eSkill = { power: action.power || 100, hits: action.hits, stat: 'str', pierce: action.pierce };
        const res = resolveBuriedAttack(E, P, eSkill, { isPlayer: false });
        if (res.dodged) {
          pushLog('회피!', PALETTE.green);
          pushFloat('player', 'MISS', PALETTE.green);
          // 특성 — 반격 / 혼결
          if (traits.includes('riposte') || traits.includes('soulbind')) {
            const bound = traits.includes('soulbind');
            const back = resolveBuriedAttack(P, E, { power: Math.round(BURIED_BASIC.power * (bound ? 1.2 : 0.6)), stat: 'str' }, { isPlayer: true, traits });
            if (!back.dodged) {
              const br = hurt(E, back.total + back.chase, false);
              pushFloat('enemy', dmgText(br), PALETTE.accent);
              pushLog(`${bound ? '혼결' : '반격'} — ${back.total + back.chase} 피해`, PALETTE.accent);
              if (bound) {
                E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'bleed', n: 2 }], statusOpts);
                pushLog(`${E.name}에게 [출혈] 2`, PALETTE.twilight);
              }
            }
          }
        } else {
          const r = hurt(P, res.total, !!action.pierce);
          pushFloat('player', dmgText(r, res.crits > 0 ? ' 치명!' : ''), res.crits > 0 ? PALETTE.legendary : PALETTE.blood);
          pushLog(`${res.total} 피해를 입었다${r.absorbed > 0 ? ` (보호막 ${r.absorbed} 흡수)` : ''}${res.crits > 0 ? ' · 치명타' : ''}`, PALETTE.blood);
          if (P.reflectTurns > 0 && P.reflect > 0) {
            const back = Math.max(1, Math.round(res.total * P.reflect / 100));
            const br = hurt(E, back, false);
            pushFloat('enemy', dmgText(br), PALETTE.ice);
            pushLog(`가시 반사 — ${back} 피해`, PALETTE.ice);
          }
          if (action.drain) {
            const h = Math.round(res.total * action.drain / 100);
            if (!env.foe.noHeal) { E.hp = Math.min(E.maxHp, E.hp + h); pushLog(`${E.name}이(가) ${h} 흡수했다.`, PALETTE.green); }
          }
          if (action.apply) {
            P.statuses = applyBuriedStatuses(P.statuses, action.apply, foeStatusOpts);
            pushLog(`나에게 ${action.apply.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
          }
        }
      }
      setPlayer(P); setFoe(E);
      await wait(520);
    }

    if (E.hp <= 0) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }

    // ---------- 3. 라운드 종료 — 상태이상 + 방/층 효과 ----------
    const canP = buriedCanHeal(P) && !env.self.noHeal;
    const pt = tickBuriedStatuses(P, { canHeal: canP });
    if (pt.dmg > 0) { hurt(P, pt.dmg, true); pushFloat('player', `-${pt.dmg}`, PALETTE.bleed); pushLog(`상태이상 피해 ${pt.dmg} (${pt.log.filter(x => x.dmg).map(x => x.name).join('·')})`, PALETTE.bleed); }
    if (pt.heal > 0) { const h = applyHeal(P, pt.heal); if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`재생 ${h} 회복`, PALETTE.green); } }
    P.statuses = pt.statuses;

    const canE = buriedCanHeal(E) && !env.foe.noHeal;
    const et = tickBuriedStatuses(E, { canHeal: canE });
    if (et.dmg > 0) { hurt(E, et.dmg, true); pushFloat('enemy', `-${et.dmg}`, PALETTE.bleed); pushLog(`${E.name} 상태이상 피해 ${et.dmg}`, PALETTE.bleed); }
    if (et.heal > 0) E.hp = Math.min(E.maxHp, E.hp + et.heal);
    E.statuses = et.statuses;

    // 방·층 효과 — 매 턴 피해 / 회복 / SP
    if (env.self.hpDrainPct) {
      const dmg = Math.max(1, Math.round(P.maxHp * env.self.hpDrainPct / 100));
      hurt(P, dmg, true); pushFloat('player', `-${dmg}`, PALETTE.accent);
      pushLog(`${roomFx?.name} — ${dmg} 피해`, PALETTE.accent);
    }
    if (env.foe.hpDrainPct) {
      const dmg = Math.max(1, Math.round(E.maxHp * env.foe.hpDrainPct / 100));
      hurt(E, dmg, true); pushFloat('enemy', `-${dmg}`, PALETTE.accent);
    }
    if (env.self.hpRegenPct) {
      const h = applyHeal(P, Math.round(P.maxHp * env.self.hpRegenPct / 100));
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`${roomFx?.name} — ${h} 회복`, PALETTE.green); }
    }

    // SP 회복 + 쿨다운 감소 + 반사 지속
    P.sp = Math.min(P.maxSp, P.sp + P.spRegen + (env.self.spAdd || 0));
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
    const P = { ...player };
    const h = applyHeal(P, Math.round(player.maxHp * BURIED_POTION_HEAL_PCT / 100));
    if (h <= 0) { pushLog('회복이 봉쇄되어 있다.', PALETTE.textDim); return; }
    setPlayer(P);
    setPotions(n => n - 1);
    setPotionUsedThisTurn(true);
    pushFloat('player', `+${h}`, PALETTE.green);
    pushLog(`물약 — HP ${h} 회복`, PALETTE.green);
  };

  const imgSrc = getEnemyImageSrc(enemy.img.key, { chapter: enemy.img.chapter }, 'combat');
  const silenced = (player.statuses.silence || 0) > 0;
  const stunned = (player.statuses.stun || 0) > 0;

  useEffect(() => {
    if (stunned && !busy && !result) {
      pushLog('기절해 움직일 수 없다!', PALETTE.shock);
      act('skip').catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stunned, busy, result]);

  const roomColor = roomFx ? (BURIED_ROOM_COLORS[roomFx.color]?.color || PALETTE.dawn) : null;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* ===== 적 ===== */}
      <div className="relative shrink-0" style={{ height: '35%', minHeight: 180 }}>
        {imgSrc && !imgFailed
          ? <img src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setImgFailed(true)} style={{ filter: foe.hp <= 0 ? 'grayscale(100%) brightness(0.4)' : 'none', transition: 'filter 500ms' }} />
          : <div className="absolute inset-0 flex items-center justify-center text-[12px]" style={{ background: PALETTE.panel, color: PALETTE.textDim }}>[ 적 모습 미구현 ]</div>}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,3,4,0.78) 0%, rgba(5,3,4,0.15) 45%, rgba(5,3,4,0.92) 100%)' }} />
        <div className="absolute top-2 left-3 right-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-bold" style={{ color: enemy.color || PALETTE.text }}>
              {enemy.name} <span style={{ color: PALETTE.textDim }}>Lv.{enemy.lv || 1}</span>
            </span>
            <span className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {roomType === 'boss' ? '👑 ' : roomType === 'elite' ? '☠ ' : ''}방어 {buriedEffDef(foe)} · 회피 {buriedEffDodge(foe)}%
            </span>
          </div>
          <BuriedBar value={foe.hp} max={foe.maxHp} color={PALETTE.accent} height={9} showText={false} />
          <div className="text-[11px] tabular-nums text-right mt-0.5" style={{ color: PALETTE.accent }}>{Math.max(0, foe.hp)} / {foe.maxHp}</div>
        </div>
        {/* 방·층 효과 배지 */}
        <div className="absolute left-3 right-3 flex flex-wrap gap-1 pointer-events-none" style={{ top: '48%' }}>
          {floorFx && (
            <span className="px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.72)', border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary }}>
              ★ {floorFx.name}
            </span>
          )}
          {roomFx && (
            <span className="px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.72)', border: `1px solid ${roomColor}88`, color: roomColor }}>
              {roomFx.both ? '◆' : '◇'} {roomFx.name}
            </span>
          )}
        </div>
        <div className="absolute bottom-2 left-3 right-3"><BuriedStatusRow statuses={foe.statuses} /></div>
        {floats.filter(f => f.side === 'enemy').map((f, i) => (
          <div key={f.id} className="absolute text-[16px] font-bold tabular-nums pointer-events-none"
            style={{ left: `${38 + (i % 3) * 10}%`, top: '34%', color: f.color, textShadow: '0 2px 6px #000', animation: 'fx-float-up 950ms ease-out forwards' }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* ===== 로그 ===== */}
      <div ref={logRef} className="px-3 py-1.5 overflow-y-auto shrink-0" style={{ height: 82, borderTop: `1px solid ${PALETTE.panelBorder}`, borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        {log.map((l, i) => <div key={i} className="text-[11px] leading-snug" style={{ color: l.c }}>{l.t}</div>)}
      </div>

      {/* ===== 플레이어 ===== */}
      <div className="px-3 pt-2 pb-1 shrink-0 relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] font-bold" style={{ color: cls?.color }}>{cls?.name} Lv.{char.lv}</span>
          <span className="text-[11px] ml-auto" style={{ color: PALETTE.textDim }}>
            방어 {buriedEffDef(player)} · 회피 {buriedEffDodge(player)}%{player.chase > 0 ? ` · 추격 ${player.chase}` : ''}
          </span>
        </div>
        <BuriedBar value={player.hp} max={player.maxHp} color={PALETTE.accent} label="HP" height={9} />
        {player.barrier > 0 && (
          <div className="text-[11px] tabular-nums mt-0.5 flex justify-between">
            <span style={{ color: PALETTE.ice }}>🔷 보호막</span>
            <span style={{ color: PALETTE.ice }}>{player.barrier}</span>
          </div>
        )}
        <div className="mt-1"><BuriedBar value={player.sp} max={player.maxSp} color={PALETTE.ice} label="SP" height={7} /></div>
        <div className="mt-1"><BuriedStatusRow statuses={player.statuses} /></div>
        {floats.filter(f => f.side === 'player').map((f, i) => (
          <div key={f.id} className="absolute text-[15px] font-bold tabular-nums pointer-events-none"
            style={{ left: `${10 + (i % 3) * 10}%`, top: 0, color: f.color, textShadow: '0 2px 6px #000', animation: 'fx-float-up 950ms ease-out forwards' }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* ===== 행동 ===== */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => act('basic', BURIED_BASIC)} disabled={busy || !!result}
            className="ui-press px-2.5 py-2 text-left"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.dawn}66`, opacity: busy || result ? 0.5 : 1 }}>
            <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>{BURIED_BASIC.name}</div>
            <div className="text-[11px] tabular-nums" style={{ color: PALETTE.ice }}>SP 0 → +{BURIED_BASIC.spGain}</div>
          </button>

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

          {/* 장착 장비 6칸 = 스킬 6개 (스킬 레벨 반영) */}
          {equipped.map(({ slot, item, skill }) => {
            const lv = buriedSkillLv(char, skill.id);
            const eff = buriedSkillAt(skill, lv);
            const cd = player.cds[eff.id] || 0;
            const spCost = Math.round(eff.sp * (1 + (env.self.spCostPct || 0) / 100));
            const noSp = spCost > player.sp;
            const off = busy || !!result || cd > 0 || noSp || silenced;
            const tier = getBuriedTier(item.tier);
            return (
              <button key={slot} onClick={() => act('skill', eff)} disabled={off}
                onContextMenu={(e) => { e.preventDefault(); setDetail({ item, skill: eff, slot, lv }); }}
                className="ui-press px-2.5 py-2 text-left"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${tier.color}66`, opacity: off ? 0.42 : 1 }}>
                <div className="text-[12px] font-bold truncate flex items-center gap-1" style={{ color: tier.color }}>
                  <SkillKindBadge skill={eff} />
                  <span className="truncate">{eff.name}{lv > 1 && <span style={{ color: PALETTE.legendary }}> Lv.{lv}</span>}</span>
                </div>
                <div className="text-[11px] tabular-nums truncate" style={{ color: noSp ? PALETTE.accent : PALETTE.ice }}>
                  SP {spCost}{cd > 0 ? ` · 쿨 ${cd}` : ''}{eff.power ? ` · ${eff.power}%${eff.hits ? `×${eff.hits}` : ''}` : ''}
                </div>
                <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{slotMeta(slot).icon} {eff.desc}</div>
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

        {/* 특성 3종 */}
        <div className="mt-2 flex flex-wrap gap-1">
          {traits.map(id => {
            const t = getBuriedTrait(id);
            if (!t) return null;
            return (
              <span key={id} className="px-2 py-0.5 text-[11px]"
                style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${cls?.color}55`, color: PALETTE.textDim }}
                title={t.desc}>◆ {t.name}</span>
            );
          })}
        </div>
      </div>

      {/* ===== 스킬 상세 ===== */}
      {detail && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDetail(null)}>
          <div className="w-full px-3 py-3" onClick={e => e.stopPropagation()}
            style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${PALETTE.panelBorder}`, borderRadius: '18px 18px 0 0' }}>
            <BuriedItemCard item={detail.item} slotId={detail.slot} showSlot />
            <div className="text-[12px] mt-2 leading-relaxed" style={{ color: PALETTE.textDim }}>{detail.skill.desc}</div>
            <div className="mt-1.5 space-y-0.5">
              {buriedSkillLvNote(detail.skill, detail.lv).map((n, i) => (
                <div key={i} className="text-[11px]" style={{ color: n.startsWith('✓') ? PALETTE.legendary : PALETTE.textDim }}>{n}</div>
              ))}
            </div>
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
                  {cls?.name}은(는) {dungeon.name} {char.floor}층에서 무덤의 일부가 되었다.<br />
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
