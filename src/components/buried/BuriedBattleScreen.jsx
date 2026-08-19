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
  BURIED_STATUS, BURIED_BASIC, buriedClassBasic, BURIED_SLOT_IDS, BURIED_POTION_HEAL_PCT,
  BURIED_ROOM_COLORS,
  buriedDerived, buriedEquippedSkills, getBuriedClass, getBuriedTier,
  resolveBuriedAttack, applyBuriedStatuses, tickBuriedStatuses, applyBuriedDamage,
  chooseBuriedEnemyAction, buriedCanHeal, buriedEffDodge, buriedEffDef, rollBuriedItem,
  buriedSkillAt, buriedSkillLv, buriedSkillLvNote, buriedTraitIds, getBuriedTrait,
  getBuriedRoomEffect, getBuriedFloorEffect, resolveBuriedEnvFx, getBuriedDungeon,
  buriedUniqueIds, getBuriedUnique, rollBuriedUniqueDrop, BURIED_UNDEAD_KEYS,
  buriedModdedSkill, hasBuriedCurse, aggregateBuriedContracts, buriedLootPower, buriedRaceFx,
  rollBuriedRune, getBuriedRune, BURIED_RUNE_RARITIES,
  buriedUniqueFx, buriedKeystoneFx, buriedKeystoneBonus, getBuriedKeystone,
  buriedSkillMaxUses,
  BURIED_SIGILS, buriedZoneAt,
  BURIED_GHOST_RANKS, getBuriedGhost, buriedGhostForEnemy, buriedGhostKit, buriedTameChance,
  buriedItemRunes, buriedRunewordCharFx,
} from '../../data.js';
import { BuriedBar, BuriedStatusRow, BuriedItemCard, slotMeta, SkillKindBadge, BuriedInfoModal } from './BuriedCommon.jsx';

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
  const rf = buriedRaceFx(char); // 1.122.0 — 종족 fx
  const ufx = buriedUniqueFx(char); // 1.127.0 — 전설무구 선언형 fx
  const kf = buriedKeystoneFx(char); // 1.128.0 — ⚓ 쐐기석 (자가 디버프)
  const rwFx = buriedRunewordCharFx(char); // 1.149.0 — ⟪룬워드⟫ 캐릭터 단위 효과
  // ===== 던전 고유 기믹 (1.114.0) — flood(침수): 도트 ×1.5·회복 -25% 양쪽 / dark(어둠): 적 수치 은폐
  const gimmickId = dungeon.gimmick?.id || null;
  // [da1] 심연의 눈 / 특성 「공허시」 — 어둠을 꿰뚫는다 (수치 은폐 무효)
  const darkBlind = (gimmickId === 'dark' || buriedKeystoneFx(char).darkAll) && !buriedUniqueIds(char).includes('da1') && !traits.includes('voidsight');
  // [da2] 어둠에 벼린 칼 ×2 / 특성 「공허시」 ×1.5 — 매 전투 첫 공격 (1회 소비)
  const firstStrikeRef = useRef(true);
  const foeFirstTurnRef = useRef(true); // [u38] 투명화 — 일반 전투 첫 턴 적 행동 스킵
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
    // [u53] 바쥬라 — 전 스킬 쿨 -1 / [u9][u10][u11] 극의 — 해당 계열 쿨 -1 / [u12] 세라핌 — 보조 쿨 -1
    if (uq('u53')) out.cd = Math.max(0, (out.cd || 0) - 1);
    if (out.power) {
      const lineU = { str: 'u9', dex: 'u10', int: 'u11' }[out.stat || 'str'];
      if (lineU && uq(lineU)) out.cd = Math.max(0, (out.cd || 0) - 1);
    } else if (uq('u12')) {
      out.cd = Math.max(0, (out.cd || 0) - 1);
    }
    // 저주 「부알」 — 쿨다운 +1 (폭주 기관의 쿨 0에는 못 이긴다 / [u74] 금줄이 무시)
    if (!uq('u113') && !uq('u74') && cs('vual') && out.cd > 0) out.cd += 1;
    // [dr1] 가라앉은 왕의 창 — 공격 스킬 적중 시 [중독] 2 추가
    if (uq('dr1') && out.power) out.apply = [...(out.apply || []), { s: 'poison', n: 2, p: 100 }];
    // [u28] 합리주의 — 부가 효과 1종당 위력 +25%
    if (uq('u28') && out.power) {
      const n = (out.apply?.length || 0) + (out.self?.length || 0) + (out.heal ? 1 : 0)
        + (out.barrierGain ? 1 : 0) + (out.spGain ? 1 : 0) + (out.reflect ? 1 : 0);
      if (n > 0) out.power = Math.round(out.power * (1 + 0.25 * n));
    }
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
    sp: Math.round(d.maxSp * (uniques.includes('u106') ? 1
      : 0.55 + (aggregateBuriedContracts(char).startSpPct || 0) / 100 + (traits.includes('pathfinder') ? 0.25 : 0))), maxSp: d.maxSp,
    barrier: hasBuriedCurse(char, 'alloces') || kf.noBarrier ? 0
      : Math.round(((d.barrier || 0) + (env.self.barrierAdd || 0) + (char.carryBarrier || 0) + (uniques.includes('u80') ? 30 : 0)) * (hasBuriedCurse(char, 'amon') ? 0.5 : 1)),
    noDodge: !!kf.noDodge, noCrit: !!kf.noCrit,
    // 1.148.0 — [u107] 최대HP 8% / [u111] 보호막 30% 고정 가산은 buriedDerived로 이관 (정보창에도 보이도록).
    //           여기서 다시 더하면 이중 계산이 되므로 절대 되살리지 말 것.
    // [u36] 비전 — 1.133.0 %화: researchPct(처치당 +0.5%) 배율. 구세이브 researchPower(고정치)는 그대로 가산 유지
    atk: Math.round((d.atk + (char.researchPower || 0)) * (1 + (char.researchPct || 0) / 100)),
    fin: Math.round((d.fin + (char.researchPower || 0)) * (1 + (char.researchPct || 0) / 100)),
    mag: Math.round((d.mag + (char.researchPower || 0)) * (1 + (char.researchPct || 0) / 100)),
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
              + (uniques.includes('da3') ? 1 : 0) // [da3] 그림자 장막
              + (uniques.includes('u80') ? 1 : 0); // [u80] 빙벽
            const init = w > 0 ? { wall: w } : {};
            // [dl3] 선택자의 낫 — 방 선택지 3개 이상이던 층은 [격노] 2로 시작
            if (uniques.includes('dl3') && (char.offers || []).length >= 3) init.rage = (init.rage || 0) + 2;
            // [u49] 변신 — 보스·재앙 전투를 [격노] 2 + [수호] 2로 시작
            if (uniques.includes('u49') && (roomType === 'boss' || roomType === 'calamity')) {
              init.rage = (init.rage || 0) + 2; init.guard = (init.guard || 0) + 2;
            }
            return init;
          })() : {},
      [...(char.pendingStatuses || []), ...(kf.startConfuse ? [{ s: 'confuse', n: kf.startConfuse }] : [])]
    ),
    cds: {}, reflect: 0, reflectTurns: 0,
    immuneCrit: uniques.includes('u61'), // [u61] 휘황찬란 — 적 치명타 무효 (resolveBuriedAttack def-side)
    // [u21] 모리건 — 주고받는 피해 절반 / [u52] 결전 — 받는 피해 +15 / 🗝 인장 (1.143.0) — 개당 위력 +8·받피 -4
    // 1.149.0 — rwFx = 완성된 ⟪룬워드⟫의 캐릭터 단위 효과 (dmgPct·takenPct·critAdd·statusUncap)
    envDmgPct: (env.self.dmgPct || 0) + (uniques.includes('u21') ? -50 : 0) + (char.sigils || 0) * BURIED_SIGILS.dmgPct + (rwFx.dmgPct || 0),
    envTakenPct: (env.self.takenPct || 0) + (uniques.includes('u21') ? -50 : 0) + (uniques.includes('u52') ? 15 : 0) + (ufx.takenPct || 0) + (kf.takenPct || 0) + (cf.takenPct || 0) - (char.sigils || 0) * BURIED_SIGILS.takenPct + (rwFx.takenPct || 0), // cf.takenPct = 🕯 동행 괴이 패시브 (1.144.0)
    envCritAdd: (env.self.critAdd || 0) + (rwFx.critAdd || 0), envMagPct: env.self.magPct || 0,
    envDodgeAdd: env.self.dodgeAdd || 0,
  }));
  // [u25] 성스러운 유산 — 전 공격 스탯이 최고값을 따른다 (첫 렌더에서 1회 정규화)
  useEffect(() => {
    if (!uniques.includes('u25')) return;
    setPlayer(p => { const top = Math.max(p.atk, p.fin, p.mag); return { ...p, atk: top, fin: top, mag: top }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eliteFx = enemy.eliteFx || {}; // ☠ 엘리트 변형 판정 플래그 (1.124.0)
  const [foe, setFoe] = useState(() => ({
    name: enemy.name, hp: enemy.hp, maxHp: enemy.hp,
    // 1.106.0 — 강적·보스는 보호막을 두른다 ([u90] 파성추의 3배 조건이 의미를 갖는 지점)
    barrier: (enemy.tier === 'boss' ? Math.round(enemy.hp * 0.15) : enemy.tier === 'elite' ? Math.round(enemy.hp * 0.08) : 0)
      + (eliteFx.barrierPct ? Math.round(enemy.hp * eliteFx.barrierPct / 100) : 0)
      + (enemy.startBarrier || 0), // 1.130.0 — 실드형 몬스터
    atk: Math.round(enemy.atk * (hasBuriedCurse(char, 'bathin') ? 1.15 : 1)),
    fin: Math.round(enemy.atk * (hasBuriedCurse(char, 'bathin') ? 1.15 : 1)),
    mag: Math.round(enemy.atk * (hasBuriedCurse(char, 'bathin') ? 1.15 : 1)),
    def: enemy.def, chase: 0,
    crit: (enemy.crit ?? 6) + (eliteFx.critAdd || 0), critDmg: 55, dodge: enemy.dodge ?? 3,
    // 1.130.0 — 내성 프로필 (resolveBuriedAttack def-side가 읽는다)
    physTakenPct: enemy.physTakenPct || 0, magTakenPct: enemy.magTakenPct || 0, fullGuardPct: enemy.fullGuardPct || 0,
    immuneCrit: !!eliteFx.immuneCrit, enrage: !!eliteFx.enrage,
    statuses: (() => {
      const s = hasBuriedCurse(char, 'berith') ? { wall: 2 } : {};
      if (uniques.includes('u22')) s.stun = (s.stun || 0) + 1; // [u22] 심판자
      if (uniques.includes('u51')) s.weaken = (s.weaken || 0) + 2; // [u51] 탐식자
      if (uniques.includes('u55')) s.shatter = (s.shatter || 0) + 2; // [u55] 군림
      return s;
    })(),
    envDmgPct: env.foe.dmgPct || 0, envTakenPct: (env.foe.takenPct || 0) + (eliteFx.takenPct || 0),
    envCritAdd: env.foe.critAdd || 0, envMagPct: 0, envDodgeAdd: env.foe.dodgeAdd || 0,
  }));

  const [log, setLog] = useState(() => {
    const init = [{ t: `${enemy.name} (Lv.${enemy.lv || 1})이(가) 길을 막아섰다.`, c: PALETTE.textDim }];
    if (enemy.eliteFx) init.push({ t: `☠ 변형 「${enemy.eliteFx.name}」 — ${enemy.eliteFx.desc}`, c: enemy.eliteFx.color || PALETTE.accent });
    // 1.130.0 — 내성 프로필 힌트 (어둠에서는 은폐)
    if (!darkBlind) {
      const hints = [];
      if ((enemy.physTakenPct || 0) < 0) hints.push(`물리 내성 ${-enemy.physTakenPct}%`);
      if ((enemy.physTakenPct || 0) > 0) hints.push(`물리 약점 +${enemy.physTakenPct}%`);
      if ((enemy.magTakenPct || 0) < 0) hints.push(`마법 내성 ${-enemy.magTakenPct}%`);
      if ((enemy.magTakenPct || 0) > 0) hints.push(`마법 약점 +${enemy.magTakenPct}%`);
      if (enemy.fullGuardPct) hints.push(`온전할 때 피해 -${enemy.fullGuardPct}%`);
      if (enemy.dodge > 3) hints.push(`회피 ${enemy.dodge}%`);
      if (hints.length > 0) init.push({ t: `⚠ ${hints.join(' · ')}`, c: PALETTE.dawn });
    }
    // 🗝 수문장의 인장 (1.143.0)
    if ((char.sigils || 0) > 0) {
      init.push({ t: `🗝 수문장의 인장 ×${char.sigils} — 위력 +${char.sigils * BURIED_SIGILS.dmgPct}% · 받는 피해 -${char.sigils * BURIED_SIGILS.takenPct}%`, c: PALETTE.legendary });
    }
    for (const kid of char.keystones || []) {
      const k = getBuriedKeystone(kid);
      if (k) init.push({ t: `⚓ ${k.name} — ${k.desc}`, c: PALETTE.twilight });
    }
    if (floorFx) init.push({ t: `★ ${floorFx.name} — ${floorFx.desc}`, c: PALETTE.legendary });
    if (roomFx) init.push({ t: `${roomFx.both ? '◆' : '◇'} ${roomFx.name} — ${roomFx.desc}`, c: BURIED_ROOM_COLORS[roomFx.color]?.color || PALETTE.dawn });
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [floats, setFloats] = useState([]);
  const [potionUsedThisTurn, setPotionUsedThisTurn] = useState(false);
  const [swiftUsedThisTurn, setSwiftUsedThisTurn] = useState(false); // 1.136.0 — ⚡ 신속 (턴당 1회)
  const [spentMap, setSpentMap] = useState({}); // 1.132.0 — 이번 전투에서 슬롯별 스킬 사용 횟수
  const spentMapRef = useRef({});
  // 🕯 괴이 사역 (1.144.0)
  const tameTarget = buriedGhostForEnemy(enemy.key); // 이 적이 괴이인가
  const companion = char.ghost?.id ? getBuriedGhost(char.ghost.id) : null; // 동행 괴이
  const companionKit = companion ? buriedGhostKit(companion, char.ghost?.breaks || 0) : null;
  const [ghostCd, setGhostCd] = useState(0); // 동행 액티브 쿨 (0 = 이번 턴 종료 시 발동)
  const [tameLocked, setTameLocked] = useState(false); // 실패 시 이 전투 제령 잠금
  const [talismanSpent, setTalismanSpent] = useState({}); // 이번 전투 소모 제령부 (rank → n)
  const talismanSpentRef = useRef({});
  const tameRef = useRef(null); // 제령 성공 결과 { ghostId, breakUp }
  useEffect(() => { spentMapRef.current = spentMap; }, [spentMap]);
  const [potions, setPotions] = useState(char.potions || 0);
  const [imgFailed, setImgFailed] = useState(false);
  const [detail, setDetail] = useState(null);
  const [info, setInfo] = useState(null); // 1.117.0 — 상태·효과 칩 탭 시 설명 팝업

  // 상태이상 칩 탭 → 설명 (스택 의미·감소 규칙 포함)
  const pickStatus = (key, stacks) => {
    const def = BURIED_STATUS[key];
    if (!def) return;
    const decayText = def.decay === 'one' ? '매 턴 1 감소' : def.decay === 'half' ? '매 턴 절반으로 감소' : '스스로 사라지지 않음';
    setInfo({
      icon: def.icon, title: `${def.name} ${stacks}`, color: def.color,
      lines: [
        { text: def.desc },
        def.tickDmg ? { text: `현재 스택 기준 턴 종료 시 ${def.tickDmg * stacks} 피해.`, color: def.color } : null,
        def.tickHeal ? { text: `현재 스택 기준 턴 종료 시 ${def.tickHeal * stacks} 회복.`, color: def.color } : null,
        { text: `지속 — ${decayText}. (최대 ${def.max}스택)` },
      ].filter(Boolean),
    });
  };
  const floatSeq = useRef(0);
  const logRef = useRef(null);
  // ===== 1.119.0 전투 이펙트 — 슬래시·버스트·치명 링·셰이크·피격 비네트·회복 글로우 =====
  const [fxHit, setFxHit] = useState(null);   // { kind, crit, id } — 적 피격 오버레이
  const [fxHurt, setFxHurt] = useState(0);    // 플레이어 피격 비네트 트리거 id
  const [fxHeal, setFxHeal] = useState(0);    // 회복 글로우 트리거 id
  const enemyBoxRef = useRef(null);
  const rootRef = useRef(null);
  const retriggerClass = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const FX_SLASH_COLOR = { str: '#ff8a7a', dex: '#b9e08a', any: '#e8c8a0' };
  const dustGainRef = useRef(0); // [u109] 전투 중 획득한 먼지 — 결과에 실어 보낸다
  const playerRef = useRef(null); // [u6] 달인 — 종료 시점 보호막 계승용


  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { playerRef.current = player; }, [player]);

  const pushLog = (t, c = PALETTE.text) => setLog(l => [...l.slice(-40), { t, c }]);
  const pushFloat = (side, text, color) => {
    const id = ++floatSeq.current;
    setFloats(f => [...f, { id, side, text, color }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 950);
    // 1.119.0 — 이펙트 자동 트리거: 부호로 판별 (도트·자해·반사까지 전부 커버)
    if (typeof text === 'string') {
      if (side === 'player' && text.startsWith('-')) setFxHurt(id);
      else if (side === 'player' && text.startsWith('+')) setFxHeal(id);
      else if (side === 'enemy' && text.startsWith('-')) retriggerClass(enemyBoxRef.current, 'fx-b-shake');
    }
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
    if (kf.noHeal) return 0; // ⚓ 고행의 쐐기 — 전투 중 회복 봉인
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

  // ☠ 「불멸의」 변형 (1.124.0) — 죽음을 1회 버틴다 (HP 1 생존). true = 되살아났음
  const eliteRevive = (E) => {
    if (E.hp <= 0 && eliteFx.undying && !E.undyingUsed) {
      E.hp = 1; E.undyingUsed = true;
      pushFloat('enemy', '불멸!', PALETTE.legendary);
      pushLog(`${E.name}이(가) 죽음을 거부했다 — HP 1로 버틴다!`, PALETTE.legendary);
      return true;
    }
    return false;
  };

  // 특성 「역병」 — 내가 거는 상태이상 스택 +1
  const statusOpts = { chancePct: (env.self.statusChancePct || 0) + (uq('u57') ? 100 : 0) + (cf.statusChance || 0) + (pf.statusChance || 0) + (rf.statusChance || 0) + (ufx.statusChance || 0), extra: (env.self.statusExtra || 0) + (traits.includes('pestilence') ? 1 : 0),
    // 1.146.0 — 상한 해제: ⟪만개⟫ 룬워드 또는 「백화의 낙인」 (절대 상한 99)
    uncap: !!((ufx.statusUncap || 0) || rwFx.statusUncap) };
  const foeStatusOpts = { chancePct: (env.foe.statusChancePct || 0) - (cf.statusResist || 0) - (rf.statusResist || 0) - (ufx.statusResist || 0), extra: (uq('u113') ? 1 : 0) + (cs('sabnock') ? 1 : 0) };

  // ===== 전투 종료 =====
  const finish = (win, finalHp) => {
    if (win) {
      // [u112] 전당의 휘장 — 승리 골드 +50%
      const zoneMult = 1 + (buriedZoneAt(char.floor).rewardPct || 0) / 100; // 🕳 심층 대역 보상 (1.143.0)
      const goldMult = dungeon.goldMult * zoneMult * (1 + (env.meta.goldPct || 0) / 100) * (uq('u112') ? 1.5 : 1) * (uq('u27') ? 3 : 1) * (uq('dc4') ? 1.5 : 1) * (1 + ((cf.goldPct || 0) + (pf.goldPct || 0) + (rf.goldPct || 0) + (ufx.goldPct || 0) + buriedKeystoneBonus(char).rewardPct) / 100);
      const gold = Math.round(rnd(enemy.gold[0], enemy.gold[1]) * goldMult);
      const exp = Math.max(0, Math.round(enemy.exp * dungeon.expMult * zoneMult * (uq('u40') ? 2 : 1) * (1 + ((cf.expPct || 0) + (pf.expPct || 0) + (rf.expPct || 0) + (ufx.expPct || 0) + buriedKeystoneBonus(char).rewardPct) / 100))); // [u81] 고고학 expPct -100 → 0 하한
      const bossy = roomType === 'boss' || roomType === 'calamity';
      // 1.120.0 — 층계 수문장 (100층 단위): 유니크 확정 + 드랍 운 대폭
      const guardianFight = roomType === 'boss' && (char.floor || 1) % 100 === 0;
      // [dl4] 유산 도굴사 — 드랍 확률 +20%p
      const dropChance = bossy || roomType === 'elite' ? 100 : Math.min(100, 38 + (uq('dl4') ? 20 : 0));
      const drops = [];
      const luck = dungeon.dropLuck + (cf.dropLuck || 0) + (pf.dropLuck || 0) + (rf.dropLuck || 0) + (ufx.dropLuck || 0) + buriedKeystoneBonus(char).luck + (guardianFight ? 12 : bossy ? 6 : roomType === 'elite' ? 3 : 0);
      const lootPower = buriedLootPower(char); // 1.121.0 — 깊이 위력 배율 (시작 장비와 같은 저울)
      if (Math.random() * 100 < dropChance) {
        const it = rollBuriedItem({ slot: null, classId: char.classId, floor: enemy.lv || char.floor, luck, powerMult: lootPower });
        if (it) drops.push(it);
      }
      if (bossy) {
        const extra = rollBuriedItem({ slot: null, classId: char.classId, floor: enemy.lv || char.floor, luck: luck + 2, powerMult: lootPower });
        if (extra) drops.push(extra);
        // ===== 전설의 무구 드랍 (1.106.0, PM 결정: 보스 전용 / 1.112.0 재앙은 확정) =====
        const owned = [
          ...Object.values(char.equipped || {}).map(i => i?.unique),
          ...(char.pendingLoot || []).map(i => i.unique),
        ].filter(Boolean);
        const uniqueDrop = rollBuriedUniqueDrop({
          dungeonId: char.dungeonId,
          isFinalBoss: (char.floor || 1) >= dungeon.floors,
          deep: (char.floor || 1) > dungeon.floors, // 전용 유니크는 정복 층 '이후'만 (1.117.0 off-by-one 픽스)
          classId: char.classId,
          floor: enemy.lv || char.floor,
          ownedIds: owned,
          guaranteed: roomType === 'calamity' || guardianFight,
          powerMult: lootPower,
        });
        if (uniqueDrop) drops.push(uniqueDrop);
      }
      // ᚱ 룬 드랍 (1.123.0) — 소켓용 룬. 보스·강적일수록 잘 나온다
      const runeChance = guardianFight || roomType === 'calamity' ? 100 : bossy ? 40 : roomType === 'elite' ? 22 : 6;
      const runeDrop = Math.random() * 100 < runeChance ? rollBuriedRune(luck) : null;
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
        win: true, gold, exp, drops, rune: runeDrop, usesSpent: spentMapRef.current,
        hp: cs('balam') ? 1 : hp, // 저주 「발람」 — 승리해도 HP 1
        potions,
        dustGain: dustGainRef.current,
        skillLvUp: uq('u100') && Math.random() < 0.75, // [u100] 수확자의 서
        carryBarrier: uq('u6') ? Math.max(0, playerRef.current?.barrier || 0) : 0, // [u6] 달인
        researchPct: uq('u36') ? 0.5 : 0, // [u36] 비전 — 1.133.0 %화: 처치마다 공격력 +0.5% (런 영구)
        tamed: tameRef.current, // 🕯 제령 성공 (1.144.0) — { ghostId, breakUp }
        talismansSpent: talismanSpentRef.current, // 이번 전투 소모 제령부
      });
    } else {
      setResult({ win: false, hp: 0, potions, dustGain: dustGainRef.current });
    }
  };

  // ===== 라운드 진행 =====
  const act = async (kind, payload, slotUsed = null) => {
    if (busy || result) return;
    if (kind === 'skill' && slotUsed && !uq('u77')) setSpentMap(m => ({ ...m, [slotUsed]: (m[slotUsed] || 0) + 1 })); // 1.132.0 — 횟수 차감 ([u77] 공허는 미소모)
    setBusy(true);
    let P = { ...player, statuses: { ...player.statuses }, cds: { ...player.cds } };
    let E = { ...foe, statuses: { ...foe.statuses } };

    // ---------- 1. 플레이어 행동 ----------
    // kind === 'skip' — [기절]로 행동을 건너뛴다 (적 턴과 상태이상 처리만 진행)
    // kind === 'tame' — 🕯 제령 시도 (1.144.0): 성공 시 즉시 종전, 실패 시 턴 소모 + 적 광포화
    // 1.147.0 — 직업별 기본기: %형 효과(회복·보호막·자해)는 현재 최대 HP로, 도트 스택은 마물 레벨로 환산해 굽는다
    let skill = (kind === 'skip' || kind === 'tame') ? null : (kind === 'basic' ? buriedClassBasic(char?.classId, P.maxHp, enemy?.lv || 1) : payload);

    if (kind === 'tame' && tameTarget) {
      const rank = BURIED_GHOST_RANKS[tameTarget.rank];
      talismanSpentRef.current = { ...talismanSpentRef.current, [tameTarget.rank]: (talismanSpentRef.current[tameTarget.rank] || 0) + 1 };
      setTalismanSpent(talismanSpentRef.current);
      const hpPct = (E.hp / E.maxHp) * 100;
      const chance = buriedTameChance(tameTarget.rank, hpPct);
      pushLog(`🧿 ${rank.name}부(${rank.hanja})를 태운다 — 제령 시도 (성공률 ${Math.round(chance * 10) / 10}%)`, PALETTE.legendary);
      await wait(420);
      if (Math.random() * 100 < chance) {
        const owned = (char.ownedGhosts || []).includes(tameTarget.id);
        tameRef.current = { ghostId: tameTarget.id, breakUp: owned };
        pushFloat('enemy', '🕯 제령!', PALETTE.legendary);
        pushLog(owned
          ? `${tameTarget.name}의 원혼이 다시 굴복했다 — 한계돌파!`
          : `${tameTarget.name}이(가) 굴복해 사역에 들어왔다!`, PALETTE.legendary);
        setFoe({ ...E, hp: 0 });
        finish(true, P.hp);
        setBusy(false);
        return;
      }
      pushFloat('enemy', '제령 실패!', PALETTE.accent);
      pushLog('제령 실패 — 원혼이 광포해진다! [격노] 3 · 이번 전투에서는 다시 시도할 수 없다.', PALETTE.accent);
      E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'rage', n: 3 }]);
      setTameLocked(true);
      // 턴 소모 — skill=null 그대로 적 행동·라운드 종료로 진행
    }
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
      // [u65] 폭풍우 — 30% 확률 쿨다운 미등록
      if (skill.cd > 0) {
        if (uq('u65') && Math.random() < 0.3) pushLog('폭풍우 — 쿨다운이 일지 않는다.', PALETTE.ice);
        else P.cds[skill.id] = skill.cd + 1; // 이번 턴 종료 시 1 감소하므로 +1
      }
      pushLog(`▶ ${skill.name}${skill.lv > 1 ? ` Lv.${skill.lv}` : ''}`, PALETTE.dawn);
      // [u68] 끝없이 깊은 물 — 쿨 2 이상 스킬 사용 시 최대 HP 12% 회복
      if (uq('u68') && (skill.cd || 0) >= 2) {
        const h = applyHeal(P, Math.round(P.maxHp * 0.12));
        if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`끝없이 깊은 물 — 심연이 상처를 적신다. +${h}`, PALETTE.green); }
      }
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
        // [u64] 일그러진 사랑 — 적 디버프 종류당 +6%
        if (uq('u64')) {
          const n = Object.keys(E.statuses).filter(k => (E.statuses[k] || 0) > 0 && BURIED_STATUS[k]?.kind === 'debuff').length;
          if (n > 0) { res.total = Math.round(res.total * (1 + 0.06 * n)); res.chase = Math.round(res.chase * (1 + 0.06 * n)); }
        }
        // [u60] 강령술 — 준 피해의 15% 추격 추가 / [u35] 사령술 — 추격 2배
        if (uq('u60')) res.chase += Math.max(1, Math.round(res.total * 0.15));
        if (uq('u35') && res.chase > 0) res.chase = Math.round(res.chase * 2);
        // [dc3] 심락의 대검 — 잃은 HP 1%당 +0.5% (최대 +40%)
        if (uq('dc3')) {
          const lostPct = Math.max(0, (1 - P.hp / P.maxHp) * 100);
          const mult = 1 + Math.min(40, lostPct * 0.5) / 100;
          res.total = Math.round(res.total * mult); res.chase = Math.round(res.chase * mult);
        }
        // 특성 「자유낙하」 — 잃은 HP 1%당 +0.4% (최대 +32%)
        if (traits.includes('freefall')) {
          const lostPct = Math.max(0, (1 - P.hp / P.maxHp) * 100);
          const mult = 1 + Math.min(32, lostPct * 0.4) / 100;
          res.total = Math.round(res.total * mult); res.chase = Math.round(res.chase * mult);
        }
        // [da2] 어둠에 벼린 칼 ×2 / 특성 「공허시」 ×1.5 — 매 전투 첫 공격
        // 1.152.0 — 「거합」(떠돌이 사무라이 전용) 첫 공격 ×2 합류
        if ((uq('da2') || traits.includes('voidsight') || traits.includes('iaido')) && firstStrikeRef.current) {
          const fsMult = (uq('da2') ? 2 : 1) * (traits.includes('voidsight') ? 1.5 : 1) * (traits.includes('iaido') ? 2 : 1);
          res.total = Math.round(res.total * fsMult); res.chase = Math.round(res.chase * fsMult);
          firstStrikeRef.current = false;
          pushLog(`어둠 속의 일격 — 첫 공격 피해 ×${fsMult}!`, PALETTE.legendary);
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
        // 1.119.0 — 스킬 계열별 피격 이펙트 (물리·기교 슬래시 / 마법 버스트 / 치명 링+펀치)
        setFxHit({ kind: skill.stat || 'any', crit: res.crits > 0, id: ++floatSeq.current });
        if (res.crits > 0) retriggerClass(rootRef.current, 'fx-b-punch');
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
        // [u15] 폭풍 — 공격 적중마다 [파쇄] 1
        if (uq('u15')) {
          E.statuses = applyBuriedStatuses(E.statuses, [{ s: 'shatter', n: 1 }], statusOpts);
        }
        // [u63] 스탬피드 — 적중마다 적 최대 HP -2%
        if (uq('u63')) {
          E.maxHp = Math.max(1, Math.round(E.maxHp * 0.98));
          if (E.hp > E.maxHp) E.hp = E.maxHp;
        }
        // [u31] 오의 — 치명타 시 10% 즉사 (보스 면역)
        if (uq('u31') && res.crits > 0 && E.hp > 0 && enemy.tier !== 'boss' && Math.random() < 0.1) {
          E.hp = 0;
          pushFloat('enemy', '오의!', PALETTE.legendary);
          pushLog('오의 — 일격에 숨이 끊겼다. 즉사!', PALETTE.legendary);
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
          // [u95] 균일한 저주(항상 5) > [u59] 간계(2배) > 원본
          let list = uq('u95') ? skill.apply.map(a => ({ ...a, n: 5 }))
            : uq('u59') ? skill.apply.map(a => ({ ...a, n: (a.n || 1) * 2 }))
            : skill.apply;
          // 1.146.0 — 다중 타격 중복 (PM 지시): N연격이면 타격 시 부여 상태이상도 ×N (2연격 [중독]2 → 4)
          const hitMul = Math.max(1, skill.hits || 1);
          if (hitMul > 1) list = list.map(a => ({ ...a, n: (a.n || 1) * hitMul }));
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
      // 보조 디버프 스킬도 [u95] 균일한 저주 / [u59] 간계 적용 (공격 스킬 경로와 동일)
      const list = uq('u95') ? skill.apply.map(a => ({ ...a, n: 5 }))
        : uq('u59') ? skill.apply.map(a => ({ ...a, n: (a.n || 1) * 2 }))
        : skill.apply;
      E.statuses = applyBuriedStatuses(E.statuses, list, statusOpts);
      pushLog(`${E.name}에게 ${list.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.twilight);
    }

    // [u4] 카두세우스 — 보조(비공격) 스킬 사용 시 마법 공격력 25% 타격
    if (skill && !skill.power && uq('u4') && E.hp > 0) {
      const dmg = Math.max(1, Math.round(P.mag * 0.25));
      const cr = hurt(E, dmg, false);
      pushFloat('enemy', dmgText(cr), PALETTE.twilight);
      pushLog(`카두세우스 — 마력이 흘러넘쳐 ${dmg} 피해`, PALETTE.twilight);
    }

    if (skill && skill.self) {
      let selfList = uq('u95') ? skill.self.map(a => ({ ...a, n: 5 })) : skill.self;
      // 1.146.0 — 다중 타격 중복: 공격 스킬의 자가 버프도 타격 수만큼 (PM 지시 "버프·흡혈·디버프 등")
      const selfHitMul = skill.power ? Math.max(1, skill.hits || 1) : 1;
      if (selfHitMul > 1) selfList = selfList.map(a => ({ ...a, n: (a.n || 1) * selfHitMul }));
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
      const room = Math.max(0, P.maxHp - P.hp);
      const h = applyHeal(P, skill.heal);
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`HP ${h} 회복`, PALETTE.green); }
      else pushLog('회복이 봉쇄되어 있다.', PALETTE.textDim);
      // 1.147.1 — 사제 계열 기본기: 넘친 회복은 🔷보호막으로 (만피 낭비 제거. 회복 봉쇄 중엔 전환도 없음)
      if (skill.overhealToBarrier && h > 0 && !kf.noBarrier) {
        const over = Math.max(0, h - room);
        if (over > 0) {
          P.barrier = (P.barrier || 0) + over;
          pushFloat('player', `🔷+${over}`, PALETTE.ice);
          pushLog(`넘친 여명이 보호막이 된다. 🔷+${over}`, PALETTE.ice);
        }
      }
    }
    if (skill && skill.barrierGain && !kf.noBarrier) {
      P.barrier = (P.barrier || 0) + skill.barrierGain;
      pushFloat('player', `🔷+${skill.barrierGain}`, PALETTE.ice);
      pushLog(`보호막 +${skill.barrierGain}`, PALETTE.ice);
    }
    if (skill && skill.spGain) { P.sp = Math.min(P.maxSp, P.sp + skill.spGain); pushLog(`SP +${skill.spGain}`, PALETTE.ice); }
    if (skill && skill.selfDmg) {
      // [u32] 혈기왕성 — 자해가 같은 양의 회복으로 뒤집힌다
      if (uq('u32')) {
        const h = applyHeal(P, skill.selfDmg);
        if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`혈기왕성 — 흘린 피가 되돌아온다. +${h}`, PALETTE.green); }
      } else {
        hurt(P, skill.selfDmg, true); pushFloat('player', `-${skill.selfDmg}`, PALETTE.blood); pushLog(`자해 ${skill.selfDmg}`, PALETTE.blood);
      }
      // 특성 「혈류」 (마검사) — 자해 스킬마다 이 전투 동안 데미지 +15% (최대 +150%)
      if (traits.includes('bloodflow') && (P.bloodflowStacks || 0) < 10) {
        P.bloodflowStacks = (P.bloodflowStacks || 0) + 1;
        P.envDmgPct = (P.envDmgPct || 0) + 15;
        pushLog(`혈류 — 피가 칼날을 벼린다. 데미지 +15% (누적 +${P.bloodflowStacks * 15}%)`, '#a8556e');
      }
    }
    if (skill && skill.reflect) { P.reflect = skill.reflect * (uq('u33') ? 2 : 1); P.reflectTurns = 2; } // [u33] 용신 — 반사율 2배
    // 접두어 「수호하는」 — 사용 시 확률 방벽
    if (skill && skill.wallChance && Math.random() * 100 < skill.wallChance) {
      P.statuses = applyBuriedStatuses(P.statuses, [{ s: 'wall', n: 1 }]);
      pushLog('수호하는 — 🧱방벽 +1', PALETTE.ice);
    }

    settleMichael(E);
    setPlayer(P); setFoe(E);
    await wait(520);

    if (E.hp <= 0 && !eliteRevive(E)) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }

    // ---------- ⚡ 신속 (1.136.0) — 순수 버프·디버프는 턴을 소모하지 않는다 (턴당 1회) ----------
    // [혼란]으로 행동이 실패하면(skill=null) 신속이라도 턴을 날린다 — 혼란의 정의 그대로.
    if (kind === 'skill' && skill && skill.swift && !swiftUsedThisTurn) {
      setSwiftUsedThisTurn(true);
      pushLog('⚡ 신속 — 턴을 소모하지 않았다. 이어서 행동할 수 있다.', PALETTE.dawn);
      setBusy(false);
      return;
    }

    // ---------- 🕯 동행 괴이 액티브 (1.144.0) — 내 턴 종료 시 자동 발동, 적 행동보다 우선 ----------
    if (companionKit && E.hp > 0 && P.hp > 0) {
      if (ghostCd > 0) {
        setGhostCd(ghostCd - 1);
      } else {
        setGhostCd(companionKit.active.cd - 1);
        const ga = companionKit.active;
        pushLog(`🕯 사역귀 ${companion.name}${(char.ghost?.breaks || 0) > 0 ? ` +${char.ghost.breaks}` : ''}이(가) 움직인다`, BURIED_GHOST_RANKS[companion.rank].color);
        if (ga.power) {
          const base = { str: P.atk, dex: P.fin, int: P.mag }[ga.power.stat] || P.atk;
          const dmg = Math.max(1, Math.round(base * ga.power.pct / 100));
          const gr = hurt(E, dmg, false);
          pushFloat('enemy', dmgText(gr), BURIED_GHOST_RANKS[companion.rank].color);
          pushLog(`괴이의 일격 — ${dmg} 피해`, BURIED_GHOST_RANKS[companion.rank].color);
          if (ga.drainPct > 0) {
            const h = applyHeal(P, Math.round(dmg * ga.drainPct / 100));
            if (h > 0) pushFloat('player', `+${h}`, PALETTE.green);
          }
        }
        if (ga.apply.length > 0 && E.hp > 0) {
          E.statuses = applyBuriedStatuses(E.statuses, ga.apply.map(x => ({ ...x, p: 100 })), statusOpts);
          pushLog(`${E.name}에게 ${ga.apply.map(x => `[${BURIED_STATUS[x.s]?.name}] ${x.n}`).join(' ')}`, PALETTE.twilight);
        }
        if (ga.self.length > 0) {
          P.statuses = applyBuriedStatuses(P.statuses, ga.self);
          pushLog(`자신에게 ${ga.self.map(x => `[${BURIED_STATUS[x.s]?.name}] ${x.n}`).join(' ')}`, PALETTE.ice);
        }
        if (ga.healPct > 0) {
          const h = applyHeal(P, Math.max(1, Math.round(P.maxHp * ga.healPct / 100)));
          if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`괴이의 가호 — HP ${h} 회복`, PALETTE.green); }
        }
        if (ga.barrier > 0 && !kf.noBarrier) {
          P.barrier = (P.barrier || 0) + ga.barrier;
          pushLog(`보호막 +${ga.barrier}`, PALETTE.ice);
        }
        setPlayer(P); setFoe(E);
        await wait(380);
        if (E.hp <= 0 && !eliteRevive(E)) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
      }
    }

    // ---------- 2. 적 행동 ----------
    if ((E.statuses.stun || 0) > 0) {
      pushLog(`${E.name}은(는) 기절해 움직이지 못한다.`, PALETTE.shock);
      await wait(420);
    } else if (uq('u38') && foeFirstTurnRef.current && roomType !== 'boss' && roomType !== 'elite' && roomType !== 'calamity' && enemy.tier !== 'boss') {
      // [u38] 투명화 — 일반 전투 첫 턴, 적이 나를 찾지 못한다
      foeFirstTurnRef.current = false;
      pushLog(`투명화 — ${E.name}이(가) 나를 찾지 못하고 두리번거린다.`, PALETTE.textDim);
      await wait(420);
    } else {
      foeFirstTurnRef.current = false;
      // 1.146.1 — A안 (PM 채택): 수문장의 대기술(heavy)은 1턴 충전 예고 후 발동.
      // 예고 턴에 방어·🧱방벽·회복을 준비할 수 있다 — "무대응 원킬"을 "대응 가능한 원킬"로.
      let action;
      if (E.charging) {
        action = E.charging;
        E.charging = null;
        pushLog(`◀ ${E.name} — 충전된 「${action.name}」 발동!`, PALETTE.accent);
      } else {
        action = chooseBuriedEnemyAction(E, enemy.actions);
        if (enemy.guardian && action.heavy) {
          E.charging = action;
          pushFloat('enemy', '⚠ 충전', PALETTE.legendary);
          pushLog(`⚠ ${E.name}이(가) 「${action.name}」을(를) 그러모은다 — 다음 턴 발동! 방어·🧱방벽을 준비하라.`, PALETTE.legendary);
          action = null;
        } else {
          pushLog(`◀ ${E.name} — ${action.name}${action.heavy ? ' (강공격)' : ''}`, action.heavy ? PALETTE.legendary : PALETTE.textDim);
        }
      }
      if (!action) {
        // 충전 턴 — 적은 이번 턴 행동하지 않는다
      } else if (action.kind === 'defend') {
        if (action.self) { E.statuses = applyBuriedStatuses(E.statuses, action.self, foeStatusOpts); pushLog(`${E.name}에게 ${action.self.map(a => `[${BURIED_STATUS[a.s]?.name}]`).join(' ')}`, PALETTE.ice); }
      } else if ((P.statuses.wall || 0) > 0) {
        // ===== 🧱 방벽 (1.106.0) — 적의 공격 행동 1회를 통째로 무효화하고 1개 소모 =====
        // [u62] 근심 — 40% 확률로 소모되지 않는다
        if (uq('u62') && Math.random() < 0.4) {
          pushLog('근심 — 방벽이 소모되지 않았다.', PALETTE.ice);
        } else {
          P.statuses = { ...P.statuses, wall: P.statuses.wall - 1 };
          if (P.statuses.wall <= 0) delete P.statuses.wall;
        }
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
          // [u5] 틈새경계 — 쿨다운 도는 스킬 1개당 받는 피해 -8% (최대 -32%)
          if (uq('u5')) {
            const n = Math.min(4, Object.keys(P.cds).length);
            if (n > 0) res.total = Math.max(0, Math.round(res.total * (1 - n * 0.08)));
          }
          // [u58] 무념무상 — 피격 누적당 받는 피해 -3% (최대 -30%)
          if (uq('u58') && (P.serenity || 0) > 0) {
            res.total = Math.max(0, Math.round(res.total * (1 - Math.min(30, P.serenity * 3) / 100)));
          }
          // [u78] 강인 — 받는 피해의 30%를 뒤로 미룬다
          if (uq('u78') && res.total > 3) {
            const defer = Math.round(res.total * 0.3);
            res.total -= defer;
            P.delayedDmg = (P.delayedDmg || 0) + defer;
          }
          const hadBarrier = (P.barrier || 0) > 0;
          const r = hurt(P, res.total, !!action.pierce);
          if (uq('u58')) P.serenity = (P.serenity || 0) + 1;
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
          // [u33] 용신 — 반사 스킬 없이도 기본 10% 반사
          const effReflect = Math.max(P.reflectTurns > 0 ? (P.reflect || 0) : 0, uq('u33') ? 10 : 0);
          if (effReflect > 0 && res.total > 0) {
            const back = Math.max(1, Math.round(res.total * effReflect / 100));
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

    if (E.hp <= 0 && !eliteRevive(E)) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }

    // ---------- 3. 라운드 종료 — 상태이상 + 방/층 효과 ----------
    const canP = buriedCanHeal(P) && !env.self.noHeal;
    const pt = tickBuriedStatuses(P, { canHeal: canP });
    if (gimmickId === 'flood' && pt.dmg > 0) pt.dmg = Math.round(pt.dmg * 1.5); // 기믹 「침수」 — 도트 +50%
    if (cs('paimon') && pt.dmg > 0) pt.dmg *= 2; // 저주 「파이몬」 — 도트 2배
    // [u19] 부정한 피 — 내 도트 피해가 같은 양의 회복으로 뒤집힌다
    if (uq('u19') && pt.dmg > 0) {
      const h = applyHeal(P, pt.dmg);
      if (h > 0) { pushFloat('player', `+${h}`, PALETTE.green); pushLog(`부정한 피 — 썩은 피가 살이 된다. +${h}`, PALETTE.green); }
      pt.dmg = 0;
    }
    if (pt.dmg > 0) { hurt(P, pt.dmg, true); pushFloat('player', `-${pt.dmg}`, PALETTE.bleed); pushLog(`상태이상 피해 ${pt.dmg} (${pt.log.filter(x => x.dmg).map(x => x.name).join('·')})`, PALETTE.bleed); }
    // [u78] 강인 — 미뤄둔 피해를 절반씩 청구 (보호막 무시)
    if ((P.delayedDmg || 0) > 0) {
      const take = P.delayedDmg > 12 ? Math.round(P.delayedDmg / 2) : P.delayedDmg;
      P.delayedDmg -= take;
      hurt(P, take, true);
      pushFloat('player', `-${take}`, PALETTE.blood);
      pushLog(`강인 — 미뤄둔 고통 ${take}`, PALETTE.blood);
    }
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
    setSwiftUsedThisTurn(false);
    await wait(260);

    if (E.hp <= 0 && !eliteRevive(E)) { pushLog(`${E.name} 격파!`, PALETTE.legendary); setFoe({ ...E, hp: 0 }); finish(true, P.hp); setBusy(false); return; }
    if (P.hp <= 0) { finish(false, 0); setBusy(false); return; }
    setBusy(false);
  };

  // 물약 — 턴을 소모하지 않지만 한 턴에 하나만
  const usePotion = () => {
    if (kf.noPotion) { pushLog('🚱 금주의 쐐기 — 물약이 재로 변한다.', PALETTE.textDim); return; }
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
    // [u16] 왕녀의 명령 — 물약을 마시면 적이 현재 HP의 20%를 잃는다 (보스 10%)
    if (uq('u16') && foe.hp > 0 && !result) {
      const E2 = { ...foe, statuses: { ...foe.statuses } };
      const dmg = Math.max(1, Math.round(E2.hp * (enemy.tier === 'boss' ? 0.10 : 0.20)));
      const r = hurt(E2, dmg, true);
      pushFloat('enemy', dmgText(r), PALETTE.legendary);
      pushLog(`왕녀의 명령 — 독배가 뒤바뀌었다. ${E2.name}에게 ${dmg} 피해`, PALETTE.legendary);
      if (E2.hp <= 0 && !eliteRevive(E2)) {
        setFoe({ ...E2, hp: 0 });
        pushLog(`${E2.name} 격파!`, PALETTE.legendary);
        finish(true, P.hp);
        return;
      }
      setFoe(E2);
    }
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
    <div ref={rootRef} className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 1.119.0 — 피격 비네트 / 회복 글로우 (부호 자동 트리거, forwards라 종료 후 투명) */}
      {fxHurt > 0 && <div key={`hurt-${fxHurt}`} className="fx-b-hurt" />}
      {fxHeal > 0 && <div key={`heal-${fxHeal}`} className="fx-b-healglow" />}
      {/* ===== 적 ===== */}
      <div ref={enemyBoxRef} className="relative shrink-0" style={{ height: '35%', minHeight: 180 }}>
        {/* 1.119.0 — 스킬 계열별 피격 오버레이 */}
        {fxHit && (
          <div key={`hit-${fxHit.id}`} className="absolute inset-0 pointer-events-none" style={{ zIndex: 25, overflow: 'hidden' }}>
            {fxHit.kind !== 'int' && (
              <div className="fx-b-slash" style={{ background: `linear-gradient(90deg, transparent, ${FX_SLASH_COLOR[fxHit.kind] || '#fff'}, #fff, transparent)` }} />
            )}
            {fxHit.kind === 'int' && (
              <div className="fx-b-burst" style={{ background: 'radial-gradient(circle, rgba(176,127,224,0.75) 0%, rgba(92,74,140,0.35) 45%, transparent 70%)' }} />
            )}
            {fxHit.crit && <div className="fx-b-critring" />}
          </div>
        )}
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
          <BuriedBar value={darkBlind ? (foe.hp > 0 ? foe.maxHp : 0) : foe.hp} max={foe.maxHp} color={PALETTE.accent} height={9} showText={false} />
          <div className="text-[11px] tabular-nums text-right mt-0.5" style={{ color: PALETTE.accent }}>
            {(foe.barrier || 0) > 0 && <span style={{ color: PALETTE.ice }}>🔷{darkBlind ? '??' : foe.barrier} · </span>}
            {darkBlind ? '?? / ??' : `${Math.max(0, foe.hp)} / ${foe.maxHp}`}
          </div>
        </div>
        {/* 방·층 효과 배지 */}
        <div className="absolute left-3 right-3 flex flex-wrap gap-1" style={{ top: '48%' }}>
          {foe.charging && foe.hp > 0 && (
            <span className="animate-pulse px-2 py-0.5 text-[11px] font-bold" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.85)', border: `1px solid ${PALETTE.legendary}`, color: PALETTE.legendary }}>
              ⚠ 「{foe.charging.name}」 충전 중 — 다음 턴 발동
            </span>
          )}
          {dungeon.gimmick && (gimmickId === 'flood' || gimmickId === 'dark') && (
            <button className="ui-press px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.72)', border: `1px solid ${dungeon.color}88`, color: dungeon.color }}
              onClick={() => setInfo({ icon: dungeon.gimmick.icon, title: `던전 기믹 — ${dungeon.gimmick.name}`, color: dungeon.color, lines: [{ text: dungeon.gimmick.desc }, { text: `${dungeon.name} 전역에 항상 적용된다.` }] })}>
              {dungeon.gimmick.icon} {dungeon.gimmick.name}
            </button>
          )}
          {floorFx && (
            <button className="ui-press px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.72)', border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary }}
              onClick={() => setInfo({ icon: '★', title: `층 효과 — ${floorFx.name}`, color: PALETTE.legendary, lines: [{ text: floorFx.desc }, { text: '이 층의 모든 전투에 적용된다. 다음 층으로 가면 사라진다.' }] })}>
              ★ {floorFx.name}
            </button>
          )}
          {roomFx && (
            <button className="ui-press px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: 'rgba(5,3,4,0.72)', border: `1px solid ${roomColor}88`, color: roomColor }}
              onClick={() => setInfo({ icon: roomFx.both ? '◆' : '◇', title: `방 효과 — ${roomFx.name}`, color: roomColor, lines: [{ text: roomFx.desc }, { text: roomFx.both ? '◆ 붉은 이름 — 나와 적 모두에게 적용된다.' : '◇ 이 전투에만 적용된다.' }] })}>
              {roomFx.both ? '◆' : '◇'} {roomFx.name}
            </button>
          )}
        </div>
        <div className="absolute bottom-2 left-3 right-3"><BuriedStatusRow statuses={foe.statuses} onPick={pickStatus} /></div>
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
        <div className="mt-1"><BuriedStatusRow statuses={player.statuses} onPick={pickStatus} /></div>
        {/* 🕯 동행 괴이 칩 (1.144.0) */}
        {companion && (
          <div className="mt-1 text-[11px] tabular-nums flex items-center gap-1" style={{ color: BURIED_GHOST_RANKS[companion.rank].color }}>
            🕯 {companion.name}{(char.ghost?.breaks || 0) > 0 ? ` +${char.ghost.breaks}` : ''}
            <span style={{ color: PALETTE.textDim }}>— {companionKit.active.cd > 0 && ghostCd > 0 ? `발동까지 ${ghostCd}턴` : '이번 턴 종료 시 발동'} · {companion.aDesc}</span>
          </div>
        )}
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
          {(() => {
            // 1.147.0 — 직업별 기본기 표시 (효과 한 줄 = flavor)
            const cb = buriedClassBasic(char?.classId, player.maxHp, enemy?.lv || 1);
            return (
              <button onClick={() => act('basic', cb)} disabled={busy || !!result}
                className="ui-press px-2.5 py-2 text-left"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.dawn}66`, opacity: busy || result ? 0.5 : 1 }}>
                <div className="text-[12px] font-bold flex items-center gap-1" style={{ color: PALETTE.dawn }}>
                  <SkillKindBadge skill={cb} /> {cb.name}
                </div>
                <div className="text-[11px] tabular-nums" style={{ color: PALETTE.ice }}>
                  SP 0 → +{cb.spGain}{cb.flavor ? ` · ${cb.flavor}` : ' · 최고 스탯 참조'}
                </div>
              </button>
            );
          })()}

          <button onClick={usePotion} disabled={busy || !!result || potions <= 0 || potionUsedThisTurn || kf.noPotion}
            className="ui-press px-2.5 py-2 text-left"
            style={{
              borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
              border: `1px solid ${PALETTE.green}66`,
              opacity: busy || result || potions <= 0 || potionUsedThisTurn ? 0.4 : 1,
            }}>
            <div className="text-[12px] font-bold" style={{ color: PALETTE.green }}>🧪 물약 ×{potions}</div>
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {potionUsedThisTurn ? '이번 턴 사용함' : `HP ${BURIED_POTION_HEAL_PCT}% (≈${Math.round(player.maxHp * BURIED_POTION_HEAL_PCT / 100)}) · 턴 소모 없음`}
            </div>
          </button>

          {/* 🕯 제령 (1.144.0) — 이 적이 괴이일 때만. HP 25% 이하 + 등급 제령부 필요 */}
          {tameTarget && (() => {
            const tRank = BURIED_GHOST_RANKS[tameTarget.rank];
            const left = Math.max(0, (char.talismans?.[tameTarget.rank] || 0) - (talismanSpent[tameTarget.rank] || 0));
            const owned = (char.ownedGhosts || []).includes(tameTarget.id);
            const canBreak = owned && char.ghost?.id === tameTarget.id && (char.ghost?.breaks || 0) < tRank.breakMax;
            if (owned && !canBreak) return null; // 재제령 불가 (동행 동일 개체 한계돌파만 예외)
            const hpPctNow = foe.maxHp > 0 ? (foe.hp / foe.maxHp) * 100 : 100;
            const ready = !tameLocked && hpPctNow <= 25 && left > 0 && foe.hp > 0 && !busy && !result;
            const chance = buriedTameChance(tameTarget.rank, hpPctNow);
            return (
              <button onClick={() => ready && act('tame', tameTarget)} disabled={!ready}
                className="ui-press col-span-2 px-2.5 py-2 text-left"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${tRank.color}88`, opacity: ready ? 1 : 0.45 }}>
                <div className="text-[12px] font-bold" style={{ color: tRank.color }}>
                  🧿 제령 — {tRank.name}({tRank.hanja}) {canBreak ? '한계돌파' : ''} · 부적 ×{left}
                </div>
                <div className="text-[11px] tabular-nums" style={{ color: PALETTE.textDim }}>
                  {tameLocked ? '광포화 — 이 전투에서는 다시 시도할 수 없다'
                    : hpPctNow > 25 ? `적 HP 25% 이하에서 가능 (현재 ${Math.round(hpPctNow)}%)`
                    : left <= 0 ? `${tRank.name}부가 없다 — 보스가 낮은 확률로 떨어뜨린다`
                    : `성공률 ${Math.round(chance * 10) / 10}% · 실패 시 부적 소진 + 턴 소모 + 적 광포화`}
                </div>
              </button>
            );
          })()}

          {/* 🧿 보유 제령부 안내 (1.147.2) — 괴이가 아닌 적일 때도 부적이 유지 중임을 보여준다 */}
          {!tameTarget && Object.entries(char.talismans || {}).some(([, n]) => n > 0) && (
            <div className="col-span-2 px-1 text-[11px]" style={{ color: PALETTE.textDim }}>
              🧿 보유 부적: {Object.entries(char.talismans).filter(([, n]) => n > 0)
                .map(([r, n]) => `${BURIED_GHOST_RANKS[r]?.name}부 ×${n}`).join(' · ')} — 이 적은 괴이가 아니라 제령할 수 없다
            </div>
          )}

          {/* 장착 장비 6칸 = 스킬 6개 (스킬 레벨 반영) */}
          {equipped.map(({ slot, item, skill }) => {
            const lv = Math.min(8, buriedSkillLv(char, skill.id) + (uq('u71') ? 1 : 0)); // [u71] 후손
            const eff0 = applyUniqueSkillMods(buriedModdedSkill(buriedSkillAt(skill, lv), item.mod, buriedItemRunes(item)));
            const eff = kf.cdAdd && !uq('u74') ? { ...eff0, cd: (eff0.cd || 0) + kf.cdAdd } : eff0; // ⚓ 정체의 쐐기 ([u74] 금줄이 무시)
            const cd = player.cds[eff.id] || 0;
            const spCost = Math.round(eff.sp * (1 + (env.self.spCostPct || 0) / 100));
            const noSp = spCost > player.sp;
            // 1.132.0 — 사용 횟수: 잔여 0이면 봉인 (새 장비를 주워야 다시 쓴다)
            const usesLeft = buriedSkillMaxUses(skill, lv) - (item.usesSpent || 0) - (spentMap[slot] || 0);
            const sealed = usesLeft <= 0;
            // 1.144.1 — 현재(버프 포함) 공격력 기준 예상 데미지 (적 방어 적용 전)
            const pvBase = eff.power ? ({ str: player.atk, dex: player.fin, int: player.mag }[eff.stat] ?? Math.max(player.atk, player.fin, player.mag)) : 0;
            const pvDmg = eff.power ? Math.max(1, Math.round(pvBase * eff.power / 100)) * Math.max(1, eff.hits || 1) : 0;
            const off = busy || !!result || cd > 0 || noSp || silenced || sealed;
            const tier = getBuriedTier(item.tier);
            return (
              <button key={slot} onClick={() => act('skill', eff, slot)} disabled={off}
                onContextMenu={(e) => { e.preventDefault(); setDetail({ item, skill: eff, slot, lv }); }}
                className="ui-press px-2.5 py-2 text-left"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${tier.color}66`, opacity: off ? 0.42 : 1 }}>
                <div className="text-[12px] font-bold truncate flex items-center gap-1" style={{ color: tier.color }}>
                  <SkillKindBadge skill={eff} />
                  <span className="truncate">{eff.name}{lv > 1 && <span style={{ color: PALETTE.legendary }}> Lv.{lv}</span>}</span>
                </div>
                <div className="text-[11px] tabular-nums truncate" style={{ color: sealed ? PALETTE.accent : noSp ? PALETTE.accent : PALETTE.ice }}>
                  {sealed ? '⛓ 봉인 — 새 장비 필요' : `SP ${spCost}${cd > 0 ? ` · 쿨 ${cd}` : ''}${eff.power ? ` · ${eff.power}%${eff.hits ? `×${eff.hits}` : ''} ≈${pvDmg}` : ''}${eff.swift ? (swiftUsedThisTurn ? ' · ⚡사용됨' : ' · ⚡신속') : ''} · 횟수 ${usesLeft}`}
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
      {/* 상태·효과 설명 팝업 (1.117.0) */}
      <BuriedInfoModal info={info} onClose={() => setInfo(null)} />

      {detail && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDetail(null)}>
          <div className="w-full px-3 py-3" onClick={e => e.stopPropagation()}
            style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${PALETTE.panelBorder}`, borderRadius: '18px 18px 0 0' }}>
            <BuriedItemCard item={detail.item} slotId={detail.slot} showSlot char={char} />
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
                    {result.drops.map(it => <BuriedItemCard key={it.id} item={it} showSlot char={char} />)}
                  </div>
                )}
                {result.rune && getBuriedRune(result.rune) && (
                  <div className="px-3 py-2 mb-3 text-[12px]"
                    style={{ borderRadius: 'var(--r-chip, 8px)', background: `${BURIED_RUNE_RARITIES[getBuriedRune(result.rune).rarity].color}18`, border: `1px solid ${BURIED_RUNE_RARITIES[getBuriedRune(result.rune).rarity].color}66` }}>
                    <span style={{ color: BURIED_RUNE_RARITIES[getBuriedRune(result.rune).rarity].color }}>
                      ᚱ {getBuriedRune(result.rune).name} {BURIED_RUNE_RARITIES[getBuriedRune(result.rune).rarity].stars}
                    </span>
                    <span style={{ color: PALETTE.textDim }}> — {getBuriedRune(result.rune).desc}. 장비 화면에서 각인할 수 있다.</span>
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
                  장비는 전부 분해되어 <b style={{ color: PALETTE.dawn }}>🕯 먼지</b>로 정산된다. 골드는 무덤에 흩어진다.
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
