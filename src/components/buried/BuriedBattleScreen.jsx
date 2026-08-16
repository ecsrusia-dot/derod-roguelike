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
  buriedUniqueIds, getBuriedUnique, rollBuriedUniqueDrop, BURIED_UNDEAD_KEYS,
  buriedModdedSkill, hasBuriedCurse, aggregateBuriedContracts,
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

  // ===== 전설의 무구 (1.106.0) — 장착 중 유니크 효과 =====
  const uniques = buriedUniqueIds(char);
  const uq = (id) => uniques.includes(id);
  // ===== 저주 (1.108.0) — 해골 왕관과의 거래 대가 =====
  const cs = (id) => hasBuriedCurse(char, id);
  // ===== 마의 계약 (1.111.0) — 지참 fx =====
  const cf = aggregateBuriedContracts(char);
  // ===== 연구실 부품 (1.112.0) — 캐릭터 생성 시 구운 partsFx.
  // 스탯 키(hp·atk 등)는 buriedDerived가 이미 반영 — 여기서는 전투·전리품 전용 키만 읽는다
  const pf = char.partsFx || {};
  // ===== 던전 고유 기믹 (1.114.0) — flood(침수): 도트 ×1.5·회복 -25% 양쪽 / dark(어둠): 적 수치 은폐
  const gimmickId = dungeon.gimmick?.id || null;
  // [da1] 심연의 눈 — 어둠을 꿰뚫는다 (수치 은폐 무효)
  const darkBlind = gimmickId === 'dark' && !buriedUniqueIds(char).includes('da1');
  // [da2] 어둠에 벼린 칼 — 매 전투 첫 공격 2배 (1회 소비)
  const firstStrikeRef = useRef(true);
  // 스킬 단계 보정 — [u113] 쿨 0 / [u101] 쿨 상한 1 / [u99] 레벨당 위력 +2% / [u94] 2회 시전·위력 절반
  const applyUniqueSkillMods = (sk) => {
    let out = { ...sk };
    if (uq('u113')) out.cd = 0;
    else if (uq('u101')) out.cd = Math.min(out.cd || 0, 1);
    if (out.power) {
      let mult = 1;
      if (uq('u99')) mult *= 1 + (char.lv || 1) * 0.02;
      if (uq('u94')) { out.hits = Math.max(1, (out.hits || 1)) * 2; mult *= 0.5; }
      out.power = Math.max(1, Math.round(out.power * mult));
    }
    // [u53] 바쥬라 — 전 스킬 쿨 -1 / [u9][u10][u11] 극의 — 해당 계열 쿨 -1
    if (uq('u53')) out.cd = Math.max(0, (out.cd || 0) - 1);
    if (out.power) {
      const lineU = { str: 'u9', dex: 'u10', int: 'u11' }[out.stat || 'str'];
      if (lineU && uq(lineU)) out.cd = Math.max(0, (out.cd || 0) - 1);
    }
    // 저주 「부알」 — 쿨다운 +1 (폭주 기관의 쿨 0에는 못 이긴다)
    if (!uq('u113') && cs('vual') && out.cd > 0) out.cd += 1;
    // [dr1] 가라앉은 왕의 창 — 공격 스킬 적중 시 [중독] 2 추가
    if (uq('dr1') && out.power) out.apply = [...(out.apply || []), { s: 'poison', n: 2, p: 100 }];
    return out;
  };

  // ===== 방 효과 / 층 효과 — 전투 시작 전에 한 번 계산해 유닛에 발라둔다 =====
  const roomFx = getBuriedRoomEffect(roomEffectId);
  const floorFx = getBuriedFloorEffect(char.floorEffect);
  // [u41] 왕관 — 방·층 효과 전부 무시
  const env = uniques.includes('u41')
    ? { self: {}, foe: {}, meta: { goldPct: 0, monsterLevel: 0 } }
    : resolveBuriedEnvFx(roomEffectId, char.floorEffect);

  const [player, setPlayer] = useState(() => ({
    name: cls?.name || '탐험가',
    hp: char.hp, maxHp: d.maxHp,
    sp: Math.round(d.maxSp * (uniques.includes('u106') ? 1 : 0.55 + (aggregateBuriedContracts(char).startSpPct || 0) / 100)), maxSp: d.maxSp,
    barrier: hasBuriedCurse(char, 'alloces') ? 0
      : Math.round(((d.barrier || 0) + (env.self.barrierAdd || 0) + (char.carryBarrier || 0)) * (hasBuriedCurse(char, 'amon') ? 0.5 : 1)),
    // [u107] 물리·기교 += 최대 HP 8% / [u111] 마법 += 보호막 30%
    atk: d.atk + (uniques.includes('u107') ? Math.round(d.maxHp * 0.08) : 0) + (char.researchPower || 0),
    fin: d.fin + (uniques.includes('u107') ? Math.round(d.maxHp * 0.08) : 0) + (char.researchPower || 0),
    mag: d.mag + (uniques.includes('u111') ? Math.round((d.barrier || 0) * 0.3) : 0) + (char.researchPower || 0),
    def: d.def, chase: d.chase || 0,
    crit: hasBuriedCurse(char, 'gaap') ? 0 : (uniques.includes('u52') ? 100 : d.crit + (uniques.includes('da1') ? 8 : 0)),
    critDmg: d.critDmg,
    dodge: hasBuriedCurse(char, 'belial') ? -999 : d.dodge + (uniques.includes('da3') ? 8 : 0),
    spRegen: d.spRegen,
    // 1.107.0 — 이벤트 방 함정의 지연 상태이상 + 1.109.0 요정의 날개(시작 방벽 2)
    statuses: applyBuriedStatuses(
      (!hasBuriedCurse(char, 'andras'))
        ? (() => {
            const w = (traits.includes('fairywing') ? 2 : 0)
              + (uniques.includes('u76') ? 2 : 0)
              + (aggregateBuriedContracts(char).startWall || 0) // 「방벽의 계약」
              + (char.partsFx?.startWall || 0) // 부품 「증축 골조」
              + (uniques.includes('da3') ? 1 : 0); // [da3] 그림자 장막
            const init = w > 0 ? { wall: w } : {};
            // [dl3] 선택자의 낫 — 방 선택지 3개 이상이던 층은 [격노] 2로 시작
            if (uniques.includes('dl3') && (char.offers || []).length >= 3) init.rage = (init.rage || 0) + 2;
            return init;
          })() : {},
      char.pendingStatuses || []
    ),
    cds: {}, reflect: 0, reflectTurns: 0,
    // [u21] 모리건 — 주고받는 피해 절반 / [u52] 결전 — 받는 피해 +15
    envDmgPct: (env.self.dmgPct || 0) + (uniques.includes('u21') ? -50 : 0),
    envTakenPct: (env.self.takenPct || 0) + (uniques.includes('u21') ? -50 : 0) + (uniques.includes('u52') ? 15 : 0),
    envCritAdd: env.self.critAdd || 0, envMagPct: env.self.magPct || 0,
    envDodgeAdd: env.self.dodgeAdd || 0,
  }));
  // [u25] 성스러운 유산 — 전 공격 스탯이 최고값을 따른다 (첫 렌더에서 1회 정규화)
  useEffect(() => {
    if (!uniques.includes('u25')) return;
    setPlayer(p => { const top = Math.max(p.atk, p.fin, p.mag); return { ...p, atk: top, fin: top, mag: top }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [foe, setFoe] = useState(() => ({
    name: enemy.name, hp: enemy.hp, maxHp: enemy.hp,
    // 1.106.0 — 강적·보스는 보호막을 두른다 ([u90] 파성추의 3배 조건이 의미를 갖는 지점)
    barrier: enemy.tier === 'boss' ? Math.round(enemy.hp * 0.15) : enemy.tier === 'elite' ? Math.round(enemy.hp * 0.08) : 0,
    atk: Math.round(enemy.atk * (hasBuriedCurse(char, 'bathin') ? 1.15 : 1)),
    fin: Math.round(enemy.atk * (hasBuriedCurse(char, 'bathin') ? 1.15 : 1)),
    mag: Math.round(enemy.atk * (hasBuriedCurse(char, 'bathin') ? 1.15 : 1)),
    def: enemy.def, chase: 0,
    crit: 6, critDmg: 55, dodge: 3,
    statuses: hasBuriedCurse(char, 'berith') ? { wall: 2 } : {},
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
  const dustGainRef = useRef(0); // [u109] 전투 중 획득한 먼지 — 결과에 실어 보낸다
  const playerRef = useRef(null); // [u6] 달인 — 종료 시점 보호막 계승용


  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { playerRef.current = player; }, [player]);

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
    // 기믹 「침수」 — 회복 -25% (양쪽). [dr3] 침수된 성배 — 페널티 무시 + 회복 +25%
    if (gimmickId === 'flood' && !(isPlayer && buriedUniqueIds(char).includes('dr3'))) mult -= 0.25;
    if (isPlayer && buriedUniqueIds(char).includes('dr3')) mult += 0.25;
    return Math.max(0, Math.round(base * mult));
  };

  // 회복 적용 — 대여명 특성은 회복량의 50%를 보호막으로 덧입힌다
  // [u8] 미카엘 — 회복량만큼 적 피해 (healedRef에 누적, 각 처리 지점에서 정산)
  const healedRef = useRef(0);
  const applyHeal = (P, base) => {
    const h = healAmount(P, base, true);
    if (h <= 0) return 0;
    P.hp = Math.min(P.maxHp, P.hp + h);
    if (traits.includes('highdawn')) P.barrier = (P.barrier || 0) + Math.round(h * 0.5);
    if (uq('u8')) healedRef.current += h;
    return h;
  };
  const settleMichael = (E) => {
    if (!uq('u8') || healedRef.current <= 0 || E.hp <= 0) { healedRef.current = 0; return; }
    const dmg = healedRef.current;
    healedRef.current = 0;
    const mr = hurt(E, dmg, false);
    pushFloat('enemy', dmgText(mr), '#d4a574');
    pushLog(`미카엘 — 회복의 빛이 적을 불사른다. ${dmg} 피해`, '#d4a574');
  };

  // 데미지 적용 — 보호막을 먼저 깎는다
  const hurt = (unit, dmg, pierceBarrier = false) => {
    const r = applyBuriedDamage(unit, dmg, { pierceBarrier });
    unit.barrier = r.barrier;
    unit.hp = r.hp;
    return r;
  };
  const dmgText = (r, extra = '') => `-${r.toHp}${r.absorbed > 0 ? ` (🔷${r.absorbed})` : ''}${extra}`;

  const statusOpts = { chancePct: (env.self.statusChancePct || 0) + (uq('u57') ? 100 : 0) + (cf.statusChance || 0) + (pf.statusChance || 0), extra: env.self.statusExtra || 0 };
  const foeStatusOpts = { chancePct: (env.foe.statusChancePct || 0) - (cf.statusResist || 0), extra: (uq('u113') ? 1 : 0) + (cs('sabnock') ? 1 : 0) };

  // ===== 전투 종료 =====
  const finish = (win, finalHp) => {
    if (win) {
      // [u112] 전당의 휘장 — 승리 골드 +50%
      const goldMult = dungeon.goldMult * (1 + (env.meta.goldPct || 0) / 100) * (uq('u112') ? 1.5 : 1) * (uq('u27') ? 3 : 1) * (uq('dc4') ? 1.5 : 1) * (1 + ((cf.goldPct || 0) + (pf.goldPct || 0)) / 100);
      const gold = Math.round(rnd(enemy.gold[0], enemy.gold[1]) * goldMult);
      const exp = Math.round(enemy.exp * dungeon.expMult * (uq('u40') ? 2 : 1) * (1 + ((cf.expPct || 0) + (pf.expPct || 0)) / 100));
      const bossy = roomType === 'boss' || roomType === 'calamity';
      // [dl4] 유산 도굴사 — 드랍 확률 +20%p
      const dropChance = bossy || roomType === 'elite' ? 100 : Math.min(100, 38 + (uq('dl4') ? 20 : 0));
      const drops = [];
      const luck = dungeon.dropLuck + (cf.dropLuck || 0) + (pf.dropLuck || 0) + (bossy ? 6 : roomType === 'elite' ? 3 : 0);
      if (Math.random() * 100 < dropChance) {
        const it = rollBuriedItem({ slot: null, classId: char.classId, floor: enemy.lv || char.floor, luck });
        if (it) drops.push(it);
      }
      if (bossy) {
        const extra = rollBuriedItem({ slot: null, classId: char.classId, floor: enemy.lv || char.floor, luck: luck + 2 });
        if (extra) drops.push(extra);
        // ===== 전설의 무구 드랍 (1.106.0, PM 결정: 보스 전용 / 1.112.0 재앙은 확정) =====
        const owned = [
          ...Object.values(char.equipped || {}).map(i => i?.unique),
          ...(char.pendingLoot || []).map(i => i.unique),
        ].filter(Boolean);
        const uniqueDrop = rollBuriedUniqueDrop({
          dungeonId: char.dungeonId,
          isFinalBoss: (char.floor || 1) >= dungeon.floors,
          classId: char.classId,
          floor: enemy.lv || char.floor,
          ownedIds: owned,
          guaranteed: roomType === 'calamity',
        });
        if (uniqueDrop) drops.push(uniqueDrop);
      }
      // [u91] 망자 사냥꾼 — 망령·정령·잔재 처치 시 최대 HP 15% 회복
      let hp = Math.max(1, Math.round(finalHp));
      if (uq('u91') && BURIED_UNDEAD_KEYS.includes(enemy.key)) {
        hp = Math.min(d.maxHp, hp + Math.round(d.maxHp * 0.15));
        pushLog('망자 사냥꾼 — 망자의 기운을 흡수해 HP 15% 회복', PALETTE.green);
      }
      // [u7] 드라큘라 — 처치 시 HP 전액 회복
      if (uq('u7')) { hp = d.maxHp; pushLog('드라큘라 — 적의 피가 상처를 전부 메운다.', '#7d2b4a'); }
      // [dc4] 바닥 없는 주머니 — 승리 시 최대 HP 8% 회복
      if (uq('dc4')) hp = Math.min(d.maxHp, hp + Math.round(d.maxHp * 0.08));
      setResult({
        win: true, gold, exp, drops,
        hp: cs('balam') ? 1 : hp, // 저주 「발람」 — 승리해도 HP 1
        potions,
        dustGain: dustGainRef.current,
        skillLvUp: uq('u100') && Math.random() < 0.75, // [u100] 수확자의 서
        carryBarrier: uq('u6') ? Math.max(0, playerRef.current?.barrier || 0) : 0, // [u6] 달인
        research: uq('u36') ? 2 : 0, // [u36] 비전 — 처치마다 공격력 +2 (런 영구)
      });
    } else {
      setResult({ win: false, hp: 0, potions, dustGain: dustGainRef.current });
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
    let skill = kind === 'skip' ? null : (kind === 'basic' ? BURIED_BASIC : payload);
    // [혼란] — 스택×30% 확률로 행동 실패 ([u97] 광인의 벽은 면제)
    if (skill && !uq('u97') && (P.statuses.confuse || 0) > 0 && Math.random() < P.statuses.confuse * 0.3) {
      pushLog('🌀 혼란에 빠져 허우적거렸다 — 행동 실패!', '#c48bd4');
      skill = null;
    }
    if (skill) {
      // 「봉인의 방」은 SP 소모를 올린다
      const spCost = Math.round(skill.sp * (1 + (env.self.spCostPct || 0) / 100));
      if (spCost > P.sp) { setBusy(false); return; }
      P.sp -= spCost;
      if (skill.cd > 0) P.cds[skill.id] = skill.cd + 1; // 이번 턴 종료 시 1 감소하므로 +1
      pushLog(`▶ ${skill.name}${skill.lv > 1 ? ` Lv.${skill.lv}` : ''}`, PALETTE.dawn);
    }

    if (skill && skill.power && (E.statuses.wall || 0) > 0) {
      // 적의 🧱방벽 — 내 공격 행동 1회를 통째로 막고 1개 소모
      E.statuses = { ...E.statuses, wall: E.statuses.wall - 1 };
      if (E.statuses.wall <= 0) delete E.statuses.wall;
      pushFloat('enemy', '🧱 방벽!', PALETTE.ice);
      pushLog(`${E.name}의 방벽이 공격을 막았다.`, PALETTE.ice);
    } else if (skill && skill.power) {
      const res = resolveBuriedAttack(P, E, skill, { isPlayer: true, traits });
      if (res.dodged) {
        pushLog(`${E.name}이(가) 회피했다.`, PALETTE.textDim);
        pushFloat('enemy', 'MISS', PALETTE.textDim);
      } else {
        // [u90] 파성추 — 보호막·방벽 없는 적에게 3배
        if (uq('u90') && (E.barrier || 0) <= 0 && (E.statuses.wall || 0) <= 0) {
          res.total *= 3; res.chase *= 3;
          pushLog('파성추 — 무방비 적에게 3배 피해!', PALETTE.legendary);
        }
        // [dr4] 곪은 낫 — 지속피해를 앓는 적에게 +25%
        if (uq('dr4') && ((E.statuses.poison || 0) + (E.statuses.bleed || 0) + (E.statuses.burn || 0)) > 0) {
          res.total = Math.round(res.total * 1.25); res.chase = Math.round(res.chase * 1.25);
        }
        // [dc3] 심락의 대검 — 잃은 HP 1%당 +0.5% (최대 +40%)
        if (uq('dc3')) {
          const lostPct = Math.max(0, (1 - P.hp / P.maxHp) * 100);
          const mult = 1 + Math.min(40, lostPct * 0.5) / 100;
          res.total = Math.round(res.total * mult); res.chase = Math.round(res.chase * mult);
        }
        // [da2] 어둠에 벼린 칼 — 매 전투 첫 공격 2배
        if (uq('da2') && firstStrikeRef.current) {
          res.total *= 2; res.chase *= 2;
          firstStrikeRef.current = false;
          pushLog('어둠에 벼린 칼 — 어둠 속의 일격, 피해 2배!', PALETTE.legendary);
        }
        // [u87] 도살자의 눈 — 치명타마다 치명 확률 누적
        if (uq('u87') && res.crits > 0) { P.crit += 2 * res.crits; pushLog(`도살자의 눈 — 치명 확률 +${2 * res.crits}% (현재 ${P.crit}%)`, PALETTE.legendary); }
        // 접두어 「반응형」 — 적중 시 다른 스킬 쿨다운 -1
        if (skill.cdrOnHit) {
          const keys = Object.keys(P.cds).filter(k => k !== skill.id);
          if (keys.length > 0) {
            const k = keys[Math.floor(Math.random() * keys.length)];
            P.cds[k] = Math.max(0, P.cds[k] - skill.cdrOnHit);
            if (P.cds[k] === 0) delete P.cds[k];
            pushLog('반응형 — 다른 스킬 쿨다운 -1', PALETTE.ice);
          }
        }
        const r = hurt(E, res.total, !!skill.pierce);
        pushFloat('enemy', dmgText(r, res.crits > 0 ? ' 치명!' : ''), res.crits > 0 ? PALETTE.legendary : PALETTE.accent);
        pushLog(`${E.name}에게 ${res.total} 피해${r.absorbed > 0 ? ` (보호막 ${r.absorbed} 흡수)` : ''}${res.crits > 0 ? ` · 치명타 ${res.crits}회` : ''}`, PALETTE.accent);

        // 추격 피해 — 본체와 별개로 한 번 더
        if (res.chase > 0) {
          const cr = hurt(E, res.chase, false);
          pushFloat('enemy', `추격 ${dmgText(cr)}`, PALETTE.dawn);
          pushLog(`추격 피해 ${res.chase}`, PALETTE.dawn);
        }
        // [u1][u2][u3] 그람·바람수리검·오베론 — 계열 스킬 적중 시 스탯 30% 추가 타격
        {
          const chaser = { str: ['u1', P.atk, '그람'], dex: ['u2', P.fin, '바람수리검'], int: ['u3', P.mag, '오베론'] }[skill.stat || 'str'];
          if (chaser && uq(chaser[0])) {
            const extra = Math.max(1, Math.round(chaser[1] * 0.3));
            const xr = hurt(E, extra, false);
            pushFloat('enemy', dmgText(xr), PALETTE.legendary);
            pushLog(`${chaser[2]} — 추가 타격 ${extra}`, PALETTE.legendary);
          }
        }
        // [da4] 종언의 낫 — HP 30% 이하의 적 20% 확률 즉사 (보스·재앙 제외)
        if (uq('da4') && E.hp > 0 && E.hp <= E.maxHp * 0.3 && enemy.tier !== 'boss' && Math.random() < 0.2) {
          E.hp = 0;
          pushFloat('enemy', '💀 종언', '#c48bd4');
          pushLog('종언의 낫 — 어둠이 목숨을 거두어 갔다.', '#c48bd4');
        }
        // [u79] 눈보라 — 치명타마다 30% [기절]
        if (uq('u79') && res.crits > 0 && Math.random() < 0.3 * res.crits) {
          E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'stun', n: 1 }]);
          pushLog('눈보라 — 적이 얼어붙었다. [기절] 1', PALETTE.ice);
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
        // [u93] 거인 살해자 — 적 최대 HP 비례 추가 피해
        if (uq('u93')) {
          const extra = Math.max(1, Math.round(E.maxHp * (enemy.tier === 'boss' ? 0.015 : 0.03)));
          const gr = hurt(E, extra, false);
          pushFloat('enemy', dmgText(gr), PALETTE.dawn);
          pushLog(`거인 살해자 — 최대 HP 비례 ${extra} 피해`, PALETTE.dawn);
        }
        if (skill.apply) {
          const before = { ...E.statuses };
          const list = uq('u95') ? skill.apply.map(a => ({ ...a, n: 5 })) : skill.apply;
          E.statuses = applyBuriedStatuses(E.statuses, list, statusOpts);
          const added = Object.keys(E.statuses).filter(k => (E.statuses[k] || 0) > (before[k] || 0));
          if (added.length > 0) pushLog(`${E.name}에게 ${added.map(k => `[${BURIED_STATUS[k].name}]`).join(' ')}`, PALETTE.twilight);
          // [u86] 기절 부여 → 전 스킬 쿨다운 -1 / [u105] 기절 부여 → 방벽 +1
          if ((E.statuses.stun || 0) > (before.stun || 0)) {
            if (uq('u86')) { for (const k of Object.keys(P.cds)) P.cds[k] = Math.max(0, P.cds[k] - 1); pushLog('뇌격의 고동 — 쿨다운 -1', PALETTE.ice); }
            if (uq('u105')) { P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'wall', n: 1 }]); pushLog('기절 수집가 — 🧱방벽 +1', PALETTE.ice); }
          }
        }
        // [u84] 사신의 낫끝 — HP 절반 이하 즉사 (보스 면역)
        if (uq('u84') && E.hp > 0 && enemy.tier !== 'boss' && E.hp / E.maxHp <= 0.5) {
          E.hp = 0;
          pushFloat('enemy', '즉사!', PALETTE.legendary);
          pushLog('사신의 낫끝 — 절반 이하의 목숨을 거둔다. 즉사!', PALETTE.legendary);
        }
      }
    } else if (skill && skill.apply) {
      E.statuses = applyBuriedStatuses(E.statuses, skill.apply, statusOpts);
      pushLog(`${E.name}에게 ${skill.apply.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
    }

    if (skill && skill.self) {
      let selfList = uq('u95') ? skill.self.map(a => ({ ...a, n: 5 })) : skill.self;
      // 저주 「마르코시아스」 — 버프 획득 불가 (디버프성 self는 통과)
      if (cs('marchosias')) {
        const before = selfList.length;
        selfList = selfList.filter(a => BURIED_STATUS[a.s]?.kind !== 'buff');
        if (selfList.length < before) pushLog('마르코시아스의 저주 — 버프가 스러진다.', '#c9a86a');
      }
      if (uq('u88')) selfList = selfList.map(a => ({ ...a, n: (a.n || 1) * 2 })); // [u88] 증폭의 심장
      P.statuses = applyBuriedStatuses(P.statuses, selfList, { extra: env.self.statusExtra || 0 });
      pushLog(`자신에게 ${selfList.map(a => `[${BURIED_STATUS[a.s]?.name}] ${a.n}`).join(' ')}`, PALETTE.ice);
      // [u96] 축복의 벽돌 — 버프 획득 시 방벽 +1
      if (uq('u96') && selfList.some(a => BURIED_STATUS[a.s]?.kind === 'buff')) {
        P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'wall', n: 1 }]);
        pushLog('축복의 벽돌 — 🧱방벽 +1', PALETTE.ice);
      }
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
    if (skill && skill.selfDmg) {
      hurt(P, skill.selfDmg, true); pushFloat('player', `-${skill.selfDmg}`, PALETTE.blood); pushLog(`자해 ${skill.selfDmg}`, PALETTE.blood);
      // 특성 「혈류」 (마검사) — 자해 스킬마다 이 전투 동안 데미지 +15% (최대 +150%)
      if (traits.includes('bloodflow') && (P.bloodflowStacks || 0) < 10) {
        P.bloodflowStacks = (P.bloodflowStacks || 0) + 1;
        P.envDmgPct = (P.envDmgPct || 0) + 15;
        pushLog(`혈류 — 피가 칼날을 벼린다. 데미지 +15% (누적 +${P.bloodflowStacks * 15}%)`, '#a8556e');
      }
    }
    if (skill && skill.reflect) { P.reflect = skill.reflect; P.reflectTurns = 2; }
    // 접두어 「수호하는」 — 사용 시 확률 방벽
    if (skill && skill.wallChance && Math.random() * 100 < skill.wallChance) {
      P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'wall', n: 1 }]);
      pushLog('수호하는 — 🧱방벽 +1', PALETTE.ice);
    }

    settleMichael(E);
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
      } else if ((P.statuses.wall || 0) > 0) {
        // ===== 🧱 방벽 (1.106.0) — 적의 공격 행동 1회를 통째로 무효화하고 1개 소모 =====
        P.statuses = { ...P.statuses, wall: P.statuses.wall - 1 };
        if (P.statuses.wall <= 0) delete P.statuses.wall;
        pushFloat('player', '🧱 방벽!', PALETTE.ice);
        pushLog(`🧱 방벽이 ${action.name}을(를) 완전히 막았다. (남은 방벽 ${P.statuses.wall || 0})`, PALETTE.ice);
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
          const hadBarrier = (P.barrier || 0) > 0;
          const r = hurt(P, res.total, !!action.pierce);
          pushFloat('player', dmgText(r, res.crits > 0 ? ' 치명!' : ''), res.crits > 0 ? PALETTE.legendary : PALETTE.blood);
          pushLog(`${res.total} 피해를 입었다${r.absorbed > 0 ? ` (보호막 ${r.absorbed} 흡수)` : ''}${res.crits > 0 ? ' · 치명타' : ''}`, PALETTE.blood);
          // [u18] 바빌론 — 25% 확률 같은 피해 반사
          if (uq('u18') && Math.random() < 0.25) {
            const br2 = hurt(E, res.total, false);
            pushFloat('enemy', dmgText(br2), PALETTE.legendary);
            pushLog(`바빌론 — 같은 피해를 되돌렸다. ${res.total}`, PALETTE.legendary);
          }
          // [u34] 책사 — 피격마다 격노 / [u83] 수수께끼의 보석 — 15% 쿨 초기화
          if (uq('u34')) { P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'rage', n: 1 }]); }
          if (uq('u83') && Math.random() < 0.15 && Object.keys(P.cds).length > 0) {
            P.cds = {};
            pushLog('수수께끼의 보석 — 시간이 되감긴다. 모든 쿨다운 초기화!', PALETTE.legendary);
          }
          // [u104] 균열의 종 — 내 보호막이 깨지는 순간 적 기절
          if (uq('u104') && hadBarrier && (P.barrier || 0) <= 0) {
            E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'stun', n: 1 }]);
            pushLog('균열의 종 — 보호막이 깨지며 울린다. 적 [기절] 1', PALETTE.ice);
          }
          // [u89] 최후의 성벽 — HP 0이 될 피해를 방벽 전부로 버틴다
          if (uq('u89') && P.hp <= 0 && (P.statuses.wall || 0) > 0) {
            delete P.statuses.wall;
            P.hp = 1;
            pushFloat('player', '버티기!', PALETTE.legendary);
            pushLog('최후의 성벽 — 모든 방벽을 소모하고 HP 1로 버틴다!', PALETTE.legendary);
          }
          // 「근성의 계약」 — 전투당 1회, 25% 확률 HP 1 생존
          if ((cf.guts || 0) > 0 && P.hp <= 0 && !P.gutsUsed && Math.random() * 100 < cf.guts) {
            P.hp = 1; P.gutsUsed = true;
            pushFloat('player', '근성!', PALETTE.legendary);
            pushLog('근성의 계약 — 이를 악물고 버텼다. HP 1', PALETTE.legendary);
          }
          if (P.reflectTurns > 0 && P.reflect > 0) {
            const back = Math.max(1, Math.round(res.total * P.reflect / 100));
            const br = hurt(E, back, false);
            pushFloat('enemy', dmgText(br), PALETTE.ice);
            pushLog(`가시 반사 — ${back} 피해`, PALETTE.ice);
          }
          if (action.drain) {
            const h = Math.round(res.total * action.drain / 100);
            if (!env.foe.noHeal) {
              E.hp = Math.min(E.maxHp, E.hp + h);
              pushLog(`${E.name}이(가) ${h} 흡수했다.`, PALETTE.green);
              // [u48] 게헨나 — 적 회복량의 3배 피해
              if (uq('u48') && h > 0) {
                const gr = hurt(E, h * 3, false);
                pushFloat('enemy', dmgText(gr), '#ff6b35');
                pushLog(`게헨나 — 회복이 불길로 뒤집힌다. ${h * 3} 피해`, '#ff6b35');
              }
            }
          }
          if (action.apply && uq('u73')) {
            pushLog('버섯 — 상태이상이 스며들지 않는다.', PALETTE.green);
          } else if (action.apply) {
            const beforeP = { ...P.statuses };
            P.statuses = applyBuriedStatuses(P.statuses, action.apply, foeStatusOpts);
            pushLog(`나에게 ${action.apply.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
            // [u108] 역행의 모래시계 — [노화] 즉시 제거 + 쿨다운 초기화
            if (uq('u108') && (P.statuses.aging || 0) > (beforeP.aging || 0)) {
              delete P.statuses.aging;
              P.cds = {};
              pushLog('역행의 모래시계 — 노화를 되감고 모든 쿨다운 초기화!', PALETTE.legendary);
            }
            // [u109] 저주 포식자 — [저주]를 받을 때마다 먼지 +10
            if (uq('u109') && (P.statuses.curse || 0) > (beforeP.curse || 0)) {
              dustGainRef.current += 10;
              pushLog('저주 포식자 — 저주를 삼켜 🕯 먼지 +10', PALETTE.dawn);
            }
            // [u98] 거울 가면 — 받은 디버프를 적에게도
            if (uq('u98')) {
              const mirrored = (action.apply || []).filter(a => BURIED_STATUS[a.s]?.kind === 'debuff');
              if (mirrored.length > 0) {
                E.statuses = applyBuriedStatuses(E.statuses, mirrored.map(a => ({ ...a, p: 100 })), statusOpts);
                pushLog(`거울 가면 — 같은 디버프를 ${E.name}에게 되돌린다`, PALETTE.twilight);
              }
            }
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
    if (gimmickId === 'flood' && pt.dmg > 0) pt.dmg = Math.round(pt.dmg * 1.5); // 기믹 「침수」 — 도트 +50%
    if (cs('paimon') && pt.dmg > 0) pt.dmg *= 2; // 저주 「파이몬」 — 도트 2배
    if (pt.dmg > 0) { hurt(P, pt.dmg, true); pushFloat('player', `-${pt.dmg}`, PALETTE.bleed); pushLog(`상태이상 피해 ${pt.dmg} (${pt.log.filter(x => x.dmg).map(x => x.name).join('·')})`, PALETTE.bleed); }
    if (pt.heal > 0) { const h = applyHeal(P, pt.heal); if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`재생 ${h} 회복`, PALETTE.green); } }
    P.statuses = pt.statuses;

    const canE = buriedCanHeal(E) && !env.foe.noHeal;
    const et = tickBuriedStatuses(E, { canHeal: canE });
    if (gimmickId === 'flood') { // 기믹 「침수」 — 도트 +50% · 회복 -25% (적도 동일)
      if (et.dmg > 0) et.dmg = Math.round(et.dmg * 1.5);
      if (et.heal > 0) et.heal = Math.round(et.heal * 0.75);
    }
    if (uq('u17') && et.dmg > 0) et.dmg *= 2; // [u17] 아누비스 — 내 도트 2배
    // [dr2] 부패의 심장 — 적 도트 피해의 50%를 내가 회복
    if (uq('dr2') && et.dmg > 0 && P.hp > 0) {
      const h = applyHeal(P, Math.round(et.dmg * 0.5));
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`부패의 심장 — 곪은 상처에서 ${h}을 빨아들였다.`, PALETTE.green); }
    }
    if (et.dmg > 0) { hurt(E, et.dmg, true); pushFloat('enemy', `-${et.dmg}`, PALETTE.bleed); pushLog(`${E.name} 상태이상 피해 ${et.dmg}`, PALETTE.bleed); }
    if (et.heal > 0) {
      E.hp = Math.min(E.maxHp, E.hp + et.heal);
      if (uq('u48')) { const gr = hurt(E, et.heal * 3, false); pushLog(`게헨나 — ${et.heal * 3} 피해`, '#ff6b35'); }
    }
    E.statuses = et.statuses;
    // [u42] 공물 — 적 매 턴 최대 HP 2% 부식
    if (uq('u42') && E.hp > 0) {
      const rot = Math.max(1, Math.round(E.maxHp * 0.02));
      hurt(E, rot, true);
      pushFloat('enemy', `-${rot}`, PALETTE.twilight);
    }
    // [u56] 심장 — 매 턴 최대 HP 12% 회복
    if (uq('u56') && P.hp > 0) {
      const h = applyHeal(P, Math.round(P.maxHp * 0.12));
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`심장 — 고동이 상처를 메운다. +${h}`, PALETTE.green); }
    }

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

    // [u89] 도트로 HP 0이 될 때도 방벽으로 버틴다
    if (uq('u89') && P.hp <= 0 && (P.statuses.wall || 0) > 0) {
      delete P.statuses.wall;
      P.hp = 1;
      pushLog('최후의 성벽 — 모든 방벽을 소모하고 HP 1로 버틴다!', PALETTE.legendary);
    }
    // [u92] 재생하는 성벽 — 방벽이 없으면 턴 종료 시 +1
    if (uq('u92') && (P.statuses.wall || 0) <= 0) {
      P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'wall', n: 1 }]);
      pushLog('재생하는 성벽 — 🧱방벽 +1', PALETTE.ice);
    }
    // [u97] 광인의 벽 — 혼란 스택당 방벽 +1
    if (uq('u97') && (P.statuses.confuse || 0) > 0) {
      P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'wall', n: P.statuses.confuse }]);
      pushLog(`광인의 벽 — 혼란 ${P.statuses.confuse}스택 → 🧱방벽 +${P.statuses.confuse}`, PALETTE.ice);
    }

    // 특성 「저주받은 혈족」 (흡혈귀) — 매 턴 최대 HP 10% 회복
    if (traits.includes('cursedblood') && P.hp > 0) {
      const h = applyHeal(P, Math.round(P.maxHp * 0.10));
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`저주받은 혈족 — 피가 스스로 차오른다. +${h}`, '#7d2b4a'); }
    }

    // 저주 — 안드라스(방벽 몰수) / 데카라비아(적 격노) / 페넥스(적 회복)
    if (cs('andras') && P.statuses.wall) { delete P.statuses.wall; pushLog('안드라스의 저주 — 방벽이 부서진다.', '#c9a86a'); }
    if (cs('decarabia') && E.hp > 0) E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'rage', n: 1 }]);
    if (cs('phenex') && E.hp > 0 && !env.foe.noHeal && buriedCanHeal(E)) {
      const h = Math.round(E.maxHp * 0.03);
      E.hp = Math.min(E.maxHp, E.hp + h);
      pushLog(`페넥스의 저주 — ${E.name}이(가) ${h} 회복했다.`, '#c9a86a');
    }

    // [u20] 늑대 — 턴 종료 무작위 쿨 -1
    if (uq('u20')) {
      const keys = Object.keys(P.cds);
      if (keys.length > 0) {
        const k = keys[Math.floor(Math.random() * keys.length)];
        P.cds[k] = Math.max(0, P.cds[k] - 1);
        if (P.cds[k] === 0) delete P.cds[k];
      }
    }

    // SP 회복 + 쿨다운 감소 + 반사 지속
    P.sp = Math.min(P.maxSp, P.sp + P.spRegen + (env.self.spAdd || 0));
    for (const k of Object.keys(P.cds)) { P.cds[k] = Math.max(0, P.cds[k] - 1); if (P.cds[k] === 0) delete P.cds[k]; }
    if (P.reflectTurns > 0) { P.reflectTurns -= 1; if (P.reflectTurns === 0) P.reflect = 0; }

    settleMichael(E);
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
    if (cs('malphas')) { pushLog('말파스의 저주 — 물약이 목을 넘어가지 않는다.', '#c9a86a'); return; }
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
              {roomType === 'calamity' ? '🌑 ' : roomType === 'boss' ? '👑 ' : roomType === 'elite' ? '☠ ' : ''}
              {darkBlind
                ? '방어 ?? · 회피 ??%'
                : `방어 ${buriedEffDef(foe)} · 회피 ${buriedEffDodge(foe)}%`}
            </span>
          </div>
          <BuriedBar value={foe.hp} max={foe.maxHp} color={PALETTE.accent} height={9} showText={false} />
          <div className="text-[11px] tabular-nums text-right mt-0.5" style={{ color: PALETTE.accent }}>
            {(foe.barrier || 0) > 0 && <span style={{ color: PALETTE.ice }}>🔷{darkBlind ? '??' : foe.barrier} · </span>}
            {darkBlind ? '?? / ??' : `${Math.max(0, foe.hp)} / ${foe.maxHp}`}
          </div>
        </div>
        {/* 방·층 효과 배지 */}
        <div className="absolute left-3 right-3 flex flex-wrap gap-1 pointer-events-none" style={{ top: '48%' }}>
          {dungeon.gimmick && (gimmickId === 'flood' || gimmickId === 'dark') && (
            <span className="px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.72)', border: `1px solid ${dungeon.color}88`, color: dungeon.color }}>
              {dungeon.gimmick.icon} {dungeon.gimmick.name}
            </span>
          )}
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
            const lv = Math.min(8, buriedSkillLv(char, skill.id) + (uq('u71') ? 1 : 0)); // [u71] 후손
            const eff = applyUniqueSkillMods(buriedModdedSkill(buriedSkillAt(skill, lv), item.mod));
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
