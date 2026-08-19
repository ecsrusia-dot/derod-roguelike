// ============================================
// components/buried/BuriedDungeonScreen.jsx — 층 진행 + 방 선택 (1.104.0)
// ============================================
// 원작 구조: 층마다 방 2~3개 중 하나를 고른다. 마지막 층에 보스.
// 전투 방은 App으로 위임(onEnterBattle), 나머지 방은 이 화면에서 해결한다.
//
// 1.104.0 추가:
//   - 던전 4종 (미궁/폐허/나락/심연) — 층수·마물 성장 속도·보상이 전부 다르다
//   - **걸음수 기반 마물 레벨** — 층이 아니라 "지나온 방 수"로 오른다 (원작 규칙)
//   - 방 효과 / 층 효과 배지 — 붉은 이름 방은 나와 적 모두에게 적용
//   - 신규 방 2종: 협상(🤝) / 망자의 서고(📜)

import React, { useEffect, useState } from 'react';
import { ChevronLeft, Package } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_ROOMS, BURIED_SLOT_IDS, BURIED_ROOM_COLORS,
  BURIED_ALTAR_BOONS, buriedBoonCost, buriedShopRerollCost,
  buriedKeystoneFx,
  rechargeBuriedSlot, rechargeBuriedRandomSlot, buriedSkillUsesLeft, buriedSkillMaxUses, BURIED_SKILLS,
  BURIED_POTION_HEAL_PCT, buriedPotionPrice, BURIED_SKILL_MAX_LV,
  buriedDerived, buriedExpToNext,
  getBuriedClass, getBuriedTier, getBuriedDungeon, buriedMonsterLevel,
  rollBuriedOffers, rollBuriedItem, rollBuriedShop,
  advanceBuriedFloor, buildBuriedRoomEnemy, addBuriedItemToChar, stepBuriedChar,
  getBuriedRoomEffect, getBuriedFloorEffect,
  buildBuriedNegotiation, buriedLibraryChoices, raiseBuriedSkill, buriedSkillLv, buriedTraitIds,
  hasBuriedUnique, maybeBuriedFloorSkillUp,
  BURIED_EVENT_ROOMS, BURIED_EVENT_ROOM_IDS, resolveBuriedEvent,
  buriedWandererOffers, wandererAddOption, wandererApplyMod, wandererReroll,
  BURIED_SKULL_ROOM, BURIED_CURSE_MAX, getBuriedCurse, buriedCurseIds,
  rollBuriedCurseOffer, acceptBuriedCurse, hasBuriedCurse, BURIED_CURSE_REWARD,
  aggregateBuriedContracts,
  BURIED_CALAMITY_GAUGE_MAX, buildBuriedCalamity,
  resolveBuriedLoot, buriedBossKeyAt,
  BURIED_CHUTE_ROOM, BURIED_CHUTE_HP_PCT, buriedChuteJump, buriedLootPower,
  tickBuriedGearBreak, BURIED_BREAK_GRACE,
  buriedZoneAt, buriedRoomThreat,
  BURIED_GHOST_RANKS,
} from '../../data.js';
import { BuriedItemCard, BuriedBar, BURIED_DUST_ICON, slotMeta, BuriedLootModal } from './BuriedCommon.jsx';
import BuriedManage from './BuriedManage.jsx';

export default function BuriedDungeonScreen({ meta, onUpdateChar, onLogEvent, onEnterBattle, onLeave, notice: extNotice, onClearNotice }) {
  const b = meta?.buried || {};
  const char = b.char || null;
  const [manage, setManage] = useState(false);
  const [notice, setNotice] = useState(null);
  const [resupplyOpen, setResupplyOpen] = useState(false); // 1.133.0 — 보충의 봉헌 슬롯 지정 피커
  const [eventLogOpen, setEventLogOpen] = useState(false); // 1.134.0 — 이벤트 지난 기록 모달

  // 이번 층의 방 선택지가 없으면 생성 (새로고침 후에도 그대로 이어진다).
  // 1.117.0 — 첫 층에도 [dl1] 실타래 / 「길잡이」 선택지 +1 적용 (advance와 동일 규칙)
  useEffect(() => {
    if (char && !char.offers) {
      const extra = (hasBuriedUnique(char, 'dl1') || buriedTraitIds(char).includes('pathfinder')) ? 1 : 0;
      onUpdateChar({ ...char, offers: rollBuriedOffers(char.floor, char.dungeonId, extra), room: null, roomData: null }, 0);
    }
  }, [char, onUpdateChar]);

  // 1.117.0 — 새로고침 도주 차단: 전투 방에 들어간 상태로 복귀하면 즉시 전투로 되돌린다.
  // (전투 상태는 저장되지 않으므로 적은 새로 굴려지지만, 도망은 불가능해진다)
  useEffect(() => {
    if (char && (char.room === 'battle' || char.room === 'elite' || char.room === 'boss')) {
      onEnterBattle(buildBuriedRoomEnemy(char, char.room, char.roomEffect), char.room, char.roomEffect || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!char) return null;
  const cls = getBuriedClass(char.classId);
  const dungeon = getBuriedDungeon(char.dungeonId);
  const d = buriedDerived(char);
  const offers = char.offers || [];
  const monLevel = buriedMonsterLevel(char);
  const floorFx = getBuriedFloorEffect(char.floorEffect);

  // 방을 하나 해결하면 걸음수 +1 후 다음 층으로 (1.113.0~ 층 무한 — 클리어 귀환 없음)
  const advance = () => {
    // [u102] 순례자의 성표 — 층 이동 시 25% 확률 무작위 스킬 레벨 +1
    const { char: blessed, raised } = maybeBuriedFloorSkillUp(stepBuriedChar(char));
    const { char: next } = advanceBuriedFloor(blessed);
    // ⛓ 장비 파손 (1.134.0) — 소진 후 5층 안에 충전 못 하면 파괴. 어떤 효과로도 막을 수 없다
    const tick = tickBuriedGearBreak(next);
    const msgs = [];
    if (raised) msgs.push(`순례자의 성표 — 오르는 길에 [${raised.id}] 스킬이 Lv.${raised.lv}이 되었다.`);
    for (const it of tick.broken) msgs.push(`⛓ «${it.name}»이(가) 부서져 사라졌다 — 소진된 채 ${BURIED_BREAK_GRACE}층이 지났다.`);
    for (const it of tick.marked) msgs.push(`⚠ «${it.name}» 스킬 소진 — ${BURIED_BREAK_GRACE}층 안에 충전하지 못하면 부서진다!`);
    setEventLogOpen(false);
    onUpdateChar(tick.char, 0);
    setNotice(msgs.length > 0 ? msgs.join(' ') : null);
  };

  // ===== 방 진입 =====
  const enterRoom = (offer) => {
    const type = offer.type;
    // 기믹 「낙하 구멍」(나락, 1.114.0) — HP를 바치고 층을 건너뛴다. [dc1] 나락의 갈고리 — 비용 절반
    if (type === 'chute') {
      const cost = Math.round(d.maxHp * BURIED_CHUTE_HP_PCT / (hasBuriedUnique(char, 'dc1') ? 200 : 100));
      if (char.hp <= cost) { setNotice('HP가 부족해 뛰어내릴 수 없다.'); return; }
      const jumped = buriedChuteJump({ ...char, hp: char.hp - cost });
      // ⛓ 장비 파손 (1.134.0) — 낙하로 건너뛴 층도 그대로 계산된다
      const tick = tickBuriedGearBreak(jumped);
      const extra = [
        ...tick.broken.map(it => ` ⛓ «${it.name}» 파손!`),
        ...tick.marked.map(it => ` ⚠ «${it.name}» 소진 — ${BURIED_BREAK_GRACE}층 내 충전 필요!`),
      ].join('');
      onUpdateChar(tick.char, 0);
      setNotice(`🕳 어둠 속으로 낙하 — HP ${cost}을 바치고 ${jumped.floor}층에 착지했다.${extra}`);
      return;
    }
    if (type === 'battle' || type === 'elite' || type === 'boss') {
      const enemy = buildBuriedRoomEnemy(char, type, offer.effect);
      onUpdateChar({ ...char, room: type, roomEffect: offer.effect || null }, 0);
      onEnterBattle(enemy, type, offer.effect || null);
      return;
    }
    let roomData = null;
    if (type === 'shop') {
      let shop = rollBuriedShop(monLevel, char.classId, buriedLootPower(char));
      // [u103] 상인의 인장 — 판매가 40% 할인
      if (hasBuriedUnique(char, 'u103')) shop = shop.map(e => ({ ...e, price: Math.round(e.price * 0.6) }));
      roomData = { shop, bought: [] };
    }
    if (type === 'treasure') {
      // [u110] 도굴왕의 곡괭이 — 부장품 방에서 장비 1개 추가
      const items = [rollBuriedItem({ slot: null, classId: char.classId, floor: monLevel, luck: 2 + dungeon.dropLuck, powerMult: buriedLootPower(char) })];
      if (hasBuriedUnique(char, 'u110')) items.push(rollBuriedItem({ slot: null, classId: char.classId, floor: monLevel, luck: 2 + dungeon.dropLuck, powerMult: buriedLootPower(char) }));
      roomData = { items: items.filter(Boolean), taken: [] };
    }
    if (type === 'negotiate') roomData = { deal: buildBuriedNegotiation(char), done: false };
    if (type === 'library') roomData = { done: false };
    if (BURIED_EVENT_ROOM_IDS.includes(type)) roomData = { done: false, text: null, tone: null };
    if (type === 'skullcrown') roomData = { offer: rollBuriedCurseOffer(char), done: false };
    onUpdateChar({ ...char, room: type, roomData, roomEffect: offer.effect || null }, 0);
  };

  // 장비 획득 — 같은 스킬이면 스킬 레벨이 오른다 (원작 규칙)
  const gainItem = (item, extraPatch = {}) => {
    const { char: next, raised, lv, equippedDirect } = addBuriedItemToChar(char, item);
    onUpdateChar({ ...next, ...extraPatch }, 0);
    setNotice(raised
      ? `${item.name} — 같은 스킬을 다시 얻어 [${item.skillId}] 스킬이 Lv.${lv}이 되었다.`
      : equippedDirect
        ? `${item.name} — 빈 ${slotMeta(item.slot).name} 슬롯에 바로 장착했다.`
        : `${item.name} — [교체/버리기]를 판단하라.`);
  };

  const takeTreasure = (idx) => {
    const item = char.roomData?.items?.[idx];
    if (!item || char.roomData?.taken?.includes(idx)) return;
    gainItem(item, { roomData: { ...char.roomData, taken: [...(char.roomData.taken || []), idx] } });
  };

  const buy = (entry, idx) => {
    if (char.gold < entry.price || char.roomData?.bought?.includes(idx)) return;
    const { char: next, raised, lv } = addBuriedItemToChar(char, entry.item);
    onUpdateChar({
      ...next,
      gold: char.gold - entry.price,
      roomData: { ...char.roomData, bought: [...(char.roomData.bought || []), idx] },
    }, 0);
    setNotice(raised ? `${entry.item.name} 구매 — 스킬이 Lv.${lv}이 되었다.` : `${entry.item.name}을(를) 샀다.`);
  };

  const potionPrice = buriedPotionPrice(monLevel, char.potionsBought || 0); // 1.117.0 깊이 + 1.150.0 구매할수록 누진
  const buyPotion = () => {
    if (char.gold < potionPrice) return;
    onUpdateChar({ ...char, gold: char.gold - potionPrice, potions: (char.potions || 0) + 1, potionsBought: (char.potionsBought || 0) + 1 }, 0);
    setNotice('물약을 하나 챙겼다.');
  };

  const shrineHeal = () => {
    const kf = buriedKeystoneFx(char);
    if (kf.noCampHeal || kf.noHeal) { setNotice('⚓ 쐐기의 저주 — 제단의 빛이 닿지 않는다.'); return; }
    if (hasBuriedCurse(char, 'gremory')) { setNotice('그레모리의 저주 — 제단의 빛이 닿지 않는다.'); return; }
    const amount = Math.round(d.maxHp * 0.6 * (1 + (aggregateBuriedContracts(char).campPct || 0) / 100));
    onUpdateChar({ ...char, hp: Math.min(d.maxHp, char.hp + amount) }, 0);
    setNotice(`제단의 빛이 HP ${amount}을(를) 되돌렸다.`);
  };

  // 1.125.0 — 강화 폐지 → 봉헌 (골드 일회성 소비: 영구 파워 인플레 없음)
  const buyBoon = (boon) => {
    const cost = buriedBoonCost(boon, monLevel);
    if (char.gold < cost || (char.roomData?.boons || []).includes(boon.id)) return;
    let patch = { gold: char.gold - cost, roomData: { ...char.roomData, boons: [...(char.roomData?.boons || []), boon.id] } };
    if (boon.id === 'guard') {
      patch.carryBarrier = (char.carryBarrier || 0) + Math.round(d.maxHp * 0.35);
      setNotice(`수호의 봉헌 — 다음 전투를 보호막 ${Math.round(d.maxHp * 0.35)}과 함께 시작한다.`);
    } else if (boon.id === 'bless') {
      patch.pendingStatuses = [...(char.pendingStatuses || []), { s: 'regen', n: 5 }, { s: 'guard', n: 3 }];
      setNotice('축복의 봉헌 — 다음 전투 시작 시 [재생] 5 + [수호] 3.');
    } else if (boon.id === 'cleanse') {
      const curses = char.curses || [];
      if (curses.length === 0) { setNotice('해제할 저주가 없다.'); return; }
      const idx = Math.floor(Math.random() * curses.length);
      patch.curses = curses.filter((_, i) => i !== idx);
      setNotice('정화의 봉헌 — 저주 하나가 재로 흩어졌다.');
    } else if (boon.id === 'resupply') {
      // 1.133.0 — PM 결정: 전 장비 만충 → 지정 1장비 만충. 결제는 슬롯 선택 시점에
      const has = BURIED_SLOT_IDS.some(s => (char.equipped?.[s]?.usesSpent || 0) > 0);
      if (!has) { setNotice('충전이 필요한 장비가 없다.'); return; }
      setResupplyOpen(true);
      return;
    }
    onUpdateChar({ ...char, ...patch }, 0);
  };

  // 1.133.0 — 보충의 봉헌: 지정한 슬롯 1개만 만충 (여기서 결제 + 봉헌 소모)
  const applyResupply = (slotId) => {
    const boon = BURIED_ALTAR_BOONS.find(x => x.id === 'resupply');
    const cost = buriedBoonCost(boon, monLevel);
    const it = char.equipped?.[slotId];
    if (char.gold < cost || (char.roomData?.boons || []).includes('resupply') || !it || !(it.usesSpent > 0)) {
      setResupplyOpen(false);
      return;
    }
    onUpdateChar({
      ...rechargeBuriedSlot(char, slotId),
      gold: char.gold - cost,
      roomData: { ...char.roomData, boons: [...(char.roomData?.boons || []), 'resupply'] },
    }, 0);
    setResupplyOpen(false);
    setNotice(`보충의 봉헌 — «${it.name}» 스킬 사용 횟수 만충.`);
  };

  // 1.125.0 — 상점 리롤 (골드 싱크: 반복할수록 2배)
  const rerollShop = () => {
    const count = char.roomData?.rerolls || 0;
    const cost = buriedShopRerollCost(monLevel, count);
    if (char.gold < cost) return;
    let shop = rollBuriedShop(monLevel, char.classId, buriedLootPower(char));
    if (hasBuriedUnique(char, 'u103')) shop = shop.map(e => ({ ...e, price: Math.round(e.price * 0.6) }));
    onUpdateChar({ ...char, gold: char.gold - cost, roomData: { ...char.roomData, shop, bought: [], rerolls: count + 1 } }, 0);
    setNotice('상인이 다른 물건을 꺼내 보인다.');
  };

  // 1.132.0 — 방당 1회 (PM 제보: 무한 휴식 익스플로잇 픽스)
  // 1.133.0 — PM 결정: 충전은 전 장비 30% → 무작위 1장비만 만충
  const rest = () => {
    if (char.roomData?.rested) return;
    const mark = { roomData: { ...char.roomData, rested: true } };
    const rc = rechargeBuriedRandomSlot(char);
    const rcMsg = rc.item ? `«${rc.item.name}» 스킬 만충` : '정비할 스킬 없음';
    const kfR = buriedKeystoneFx(char);
    if (kfR.noCampHeal || kfR.noHeal) {
      // 회복만 봉인 — 물약 제작·횟수 충전은 유지 (방이 헛걸음이 되지 않게)
      onUpdateChar({ ...rc.char, potions: (char.potions || 0) + 1, ...mark }, 0);
      setNotice(`⚓ 쐐기의 저주 — 상처는 아물지 않았지만, 물약 하나와 장비 하나(${rcMsg})는 챙겼다.`);
      return;
    }
    if (hasBuriedCurse(char, 'gremory')) {
      onUpdateChar({ ...rc.char, potions: (char.potions || 0) + 1, ...mark }, 0);
      setNotice(`그레모리의 저주 — 잠들지 못했다. 물약 하나와 ${rcMsg}만 마쳤다.`);
      return;
    }
    // [u54] 건강한 잠 — 야영 회복 2배
    const amount = Math.round(d.maxHp * 0.45 * (1 + (aggregateBuriedContracts(char).campPct || 0) / 100) * (hasBuriedUnique(char, 'u54') ? 2 : 1));
    onUpdateChar({ ...rc.char, hp: Math.min(d.maxHp, char.hp + amount), potions: (char.potions || 0) + 1, ...mark }, 0);
    setNotice(`야영 — HP ${amount} 회복, 물약 +1, 무작위 ${rcMsg}.`);
  };

  // 협상 — 지불하면 전투 없이 통과 + 장비. 거절하면 강적과 싸운다.
  const payNegotiation = () => {
    const deal = char.roomData?.deal;
    if (!deal || char.roomData?.done || char.gold < deal.price) return;
    if (deal.reward) {
      const { char: next, raised, lv } = addBuriedItemToChar(char, deal.reward);
      onUpdateChar({ ...next, gold: char.gold - deal.price, roomData: { ...char.roomData, done: true } }, 0);
      setNotice(raised ? `거래 성립 — 스킬이 Lv.${lv}이 되었다.` : '거래 성립. 길이 열렸다.');
    } else {
      onUpdateChar({ ...char, gold: char.gold - deal.price, roomData: { ...char.roomData, done: true } }, 0);
      setNotice('거래 성립. 길이 열렸다.');
    }
  };
  const refuseNegotiation = () => {
    const enemy = buildBuriedRoomEnemy(char, 'elite', char.roomEffect);
    onUpdateChar({ ...char, room: 'elite' }, 0);
    onEnterBattle(enemy, 'elite', char.roomEffect || null);
  };

  // 재앙 게이지 (1.112.0) — 이벤트 방(묘비·샘·석상·나그네·관·해골왕관) 해결마다 +1, 5에서 소환 배너
  const bumpGauge = (c) => ({ ...c, calamityGauge: Math.min(BURIED_CALAMITY_GAUGE_MAX, (c.calamityGauge || 0) + 1) });

  // ===== 해골 왕관 (1.108.0) — 저주 수락 = 즉시 보상 + 런 전체 페널티 =====
  const acceptCurse = () => {
    const offer = char.roomData?.offer;
    if (!offer || char.roomData?.done) return;
    const { char: cursed, reward } = acceptBuriedCurse(char, offer);
    const c = getBuriedCurse(offer);
    onUpdateChar(bumpGauge({ ...cursed, roomData: { ...char.roomData, done: true, text: `「${c.name}」의 저주를 받아들였다 — 🕯 ${reward.dust} · 🪙 ${reward.gold}. 이번 런이 끝날 때까지 저주가 따라붙는다.` } }), reward.dust);
  };

  // ===== 이벤트 방 (1.107.0) — 도박: 영구 보너스와 함정이 한 테이블에 =====
  const runEvent = (roomId) => {
    if (char.roomData?.done) return;
    const r = resolveBuriedEvent(roomId, char);
    let next = { ...r.char, roomData: { done: true, text: r.text, tone: r.tone } };
    if (r.item) {
      const added = addBuriedItemToChar(next, r.item);
      next = { ...added.char, roomData: next.roomData };
    }
    // 1.134.0 — 선택 결과 영구 기록 (지난 기록 모달용)
    onLogEvent?.(roomId, { text: r.text, tone: r.tone, floor: char.floor, dungeonId: char.dungeonId, at: Date.now() });
    onUpdateChar(bumpGauge(next), r.dustGain || 0);
  };
  const runWanderer = (kind) => {
    if (char.roomData?.done) return;
    const fn = kind === 'option' ? wandererAddOption : kind === 'mod' ? wandererApplyMod : wandererReroll;
    const r = fn(char);
    onLogEvent?.('wanderer', { text: r.text, tone: 'good', floor: char.floor, dungeonId: char.dungeonId, at: Date.now() });
    onUpdateChar(bumpGauge({ ...r.char, roomData: { done: true, text: r.text, tone: 'good' } }), 0);
  };

  // ===== 재앙 (1.112.0) — 게이지 5에서 소환 배너, 맞서면 게이지 0. 무시하고 계속 갈 수 있다 =====
  const faceCalamity = () => {
    const beast = buildBuriedCalamity(char);
    onUpdateChar({ ...char, calamityGauge: 0 }, 0);
    onEnterBattle(beast, 'calamity', null);
  };

  // 망자의 서고 — 장착 스킬 하나의 레벨을 올린다
  const studySkill = (skillId) => {
    if (char.roomData?.done) return;
    const { char: next, lv } = raiseBuriedSkill(char, skillId);
    onUpdateChar({ ...next, roomData: { ...char.roomData, done: true } }, 0);
    setNotice(`서고의 기록을 읽었다 — 스킬이 Lv.${lv}이 되었다.`);
  };

  // ===== 렌더 =====
  const room = char.room;
  const inRoom = room && room !== 'battle' && room !== 'elite' && room !== 'boss';
  const libChoices = room === 'library' ? buriedLibraryChoices(char) : [];

  // 1.113.0 무한층 — 다음 층 보스 경고는 buriedBossKeyAt로 (정복 층 이후 반복 보스 포함)
  const nextBossFloor = buriedBossKeyAt(dungeon, char.floor + 1) ? char.floor + 1 : null;

  return (
    <div className="absolute inset-0 flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-4 pb-2.5 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onLeave} disabled={inRoom} className="ui-press p-1.5" style={{ color: PALETTE.textDim, opacity: inRoom ? 0.3 : 1 }}>
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-[12px] tracking-[0.25em] font-bold" style={{ color: dungeon.color }}>
              {dungeon.name} · {char.floor}층{char.floor <= dungeon.floors ? ` (정복 ${dungeon.floors}층)` : ' · ∞'}
            </div>
            {/* 🕳 심층 대역 (1.143.0) — 100층부터 대역 이름 표시 */}
            {char.floor >= 100 && (() => { const z = buriedZoneAt(char.floor); return (
              <div className="text-[11px] font-bold tracking-[0.15em]" style={{ color: z.color }}>
                {z.icon} {z.name} · 보상 +{z.rewardPct}%
              </div>
            ); })()}
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {cls?.name} Lv.{char.lv} · 🪙 {char.gold} · 🧪 {char.potions || 0} · 마물 Lv.{monLevel}
              {(char.calamityGauge || 0) > 0 && <span style={{ color: '#c48bd4' }}> · 🌑 {char.calamityGauge}/{BURIED_CALAMITY_GAUGE_MAX}</span>}
              {/* 🧿 보유 제령부 (1.147.2) — 등반 내내 유지된다. 전에는 제령 버튼에서만 보여 "사라진 것처럼" 보이던 문제 */}
              {Object.entries(char.talismans || {}).filter(([, n]) => n > 0).length > 0 && (
                <span title={Object.entries(char.talismans).filter(([, n]) => n > 0)
                  .map(([r, n]) => `${BURIED_GHOST_RANKS[r]?.name}부(${BURIED_GHOST_RANKS[r]?.hanja}) ×${n}`)
                  .join(' · ') + ' — 이번 등반 동안 유지 · 사망 시 소멸'}>
                  {' · '}🧿{Object.entries(char.talismans).filter(([, n]) => n > 0)
                    .map(([r, n]) => <span key={r} style={{ color: BURIED_GHOST_RANKS[r]?.color }}>{BURIED_GHOST_RANKS[r]?.hanja}{n}</span>)}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setManage(true)} className="ui-press p-1.5 relative" style={{ color: PALETTE.dawn }}>
            <Package size={18} />
          </button>
        </div>
        <BuriedBar value={char.hp} max={d.maxHp} color={PALETTE.accent} label="HP" />
        <div className="mt-1">
          <BuriedBar value={char.exp} max={buriedExpToNext(char.lv)} color={PALETTE.twilight} label="EXP" height={4} showText={false} />
        </div>
        {/* 걸음수 — 원작 규칙: 방을 지날수록 마물이 강해진다 */}
        <div className="flex items-center justify-between mt-1.5 text-[11px]" style={{ color: PALETTE.textDim }}>
          <span>
            걸음 {char.steps || 0} · {dungeon.stepsPerLevel}걸음마다 마물 Lv.+1
            {buriedCurseIds(char).length > 0 && (
              <span className="ml-1.5" style={{ color: '#c9a86a' }}
                title={buriedCurseIds(char).map(id => `${getBuriedCurse(id)?.name}: ${getBuriedCurse(id)?.desc}`).join('\n')}>
                💀{buriedCurseIds(char).map(id => getBuriedCurse(id)?.name).join('·')}
              </span>
            )}
          </span>
          {dungeon.gimmick && (
            <span className="px-1.5 py-0.5" style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${dungeon.color}66`, color: dungeon.color }}
              title={dungeon.gimmick.desc}>{dungeon.gimmick.icon} {dungeon.gimmick.name}</span>
          )}
          {floorFx && (
            <span className="px-1.5 py-0.5" style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${PALETTE.legendary}66`, color: PALETTE.legendary }}
              title={floorFx.desc}>★ {floorFx.name}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {extNotice && (
          <button onClick={onClearNotice} className="ui-press w-full px-3 py-2 text-left text-[12px]"
            style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.legendary}15`, border: `1px solid ${PALETTE.legendary}66`, color: PALETTE.legendary }}>
            {extNotice} <span style={{ color: PALETTE.textDim }}>(탭하여 닫기)</span>
          </button>
        )}
        {notice && (
          <div className="px-3 py-2 text-[12px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.dawn}15`, border: `1px solid ${PALETTE.dawn}55`, color: PALETTE.dawn }}>
            {notice}
          </div>
        )}

        {/* ===== 재앙 소환 배너 (1.112.0) — 게이지 5. 무시하고 다른 방으로 가도 된다 ===== */}
        {!inRoom && (char.calamityGauge || 0) >= BURIED_CALAMITY_GAUGE_MAX && (
          <div className="px-3 py-3 space-y-2"
            style={{ borderRadius: 'var(--r-panel, 18px)', background: '#1a0d22', border: '1px solid #7b3fa0' }}>
            <div className="text-[13px] font-bold" style={{ color: '#c48bd4' }}>🌑 재앙이 냄새를 맡았다</div>
            <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              무덤을 너무 헤집었다. 낙젤리온의 그림자가 이 층 어딘가에서 기다린다.
              맞서 이기면 <b style={{ color: '#c48bd4' }}>☠ 죽음의 조각 대량 + ⚔ 전설의 무구 확정</b>. 무시하고 계속 갈 수도 있다.
            </div>
            <button onClick={faceCalamity} className="ui-press w-full py-2.5 text-[12px] font-bold"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: '#4a1f5c', color: '#e8c8f4', border: '1px solid #7b3fa0' }}>
              맞선다 (초고난도)
            </button>
          </div>
        )}

        {/* ===== 방 선택 ===== */}
        {!inRoom && (
          <>
            <div className="text-[11px] tracking-[0.25em]" style={{ color: PALETTE.dawn }}>
              {offers.length === 1 ? '길은 하나뿐이다' : '어느 길로 갈 것인가'}
            </div>
            <div className="space-y-2">
              {offers.map((o, i) => {
                const r = BURIED_ROOMS[o.type] || BURIED_EVENT_ROOMS[o.type]
                  || (o.type === 'skullcrown' ? BURIED_SKULL_ROOM : o.type === 'chute' ? BURIED_CHUTE_ROOM : BURIED_ROOMS.battle);
                const fx = getBuriedRoomEffect(o.effect);
                const fxColor = fx ? (BURIED_ROOM_COLORS[fx.color]?.color || PALETTE.dawn) : null;
                return (
                  <button key={`${o.type}-${i}`} onClick={() => enterRoom(o)}
                    className="ui-press w-full flex items-start gap-3 px-3 py-3 text-left"
                    style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${fxColor || r.color}66` }}>
                    <span className="text-[22px] mt-0.5">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold" style={{ color: r.color }}>{r.name}</div>
                      <div className="text-[12px]" style={{ color: PALETTE.textDim }}>{r.desc}</div>
                      {/* 1.145.0 — 위협 미리보기: 적 평타 일격 ≈ 내 HP % (PM: 결정 전 필요한 숫자) */}
                      {(o.type === 'battle' || o.type === 'elite' || o.type === 'boss') && (() => {
                        const th = buriedRoomThreat(char, o.type);
                        if (!th) return null;
                        const danger = th.hiPct >= 40 ? PALETTE.accent : th.hiPct >= 20 ? PALETTE.legendary : PALETTE.textDim;
                        return (
                          <div className="mt-0.5 text-[11px] tabular-nums" style={{ color: danger }}>
                            ⚔ 적 일격 ≈ HP {th.loPct === th.hiPct ? `${th.hiPct}%` : `${th.loPct}~${th.hiPct}%`} <span style={{ color: PALETTE.textDim }}>(평타 기준)</span>
                          </div>
                        );
                      })()}
                      {fx && (
                        <div className="mt-1 text-[11px]" style={{ color: fxColor }}>
                          {fx.both ? '◆' : '◇'} {fx.name} — {fx.desc}
                          {fx.both && <span style={{ color: PALETTE.textDim }}> (나와 적 모두)</span>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-2.5 text-[11px] leading-relaxed"
              style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
              한 층에서는 방 하나만 고를 수 있다. 고르지 않은 방은 사라진다.
              {nextBossFloor === char.floor + 1 && <><br /><b style={{ color: PALETTE.legendary }}>다음 층은 봉인의 문이다. 정비할 마지막 기회.</b></>}
            </div>
          </>
        )}

        {/* ===== 부장품 ===== */}
        {room === 'treasure' && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>📦 부장품{(char.roomData?.items?.length || 0) > 1 ? ' — 도굴왕의 곡괭이가 빛난다' : ''}</div>
            {(char.roomData?.items?.length || 0) === 0 && <div className="text-[12px]" style={{ color: PALETTE.textDim }}>관은 비어 있었다.</div>}
            {(char.roomData?.items || []).map((it, idx) => (
              <div key={it.id} className="space-y-1">
                <BuriedItemCard item={it} showSlot full char={char} dim={char.roomData?.taken?.includes(idx)} />
                {!char.roomData?.taken?.includes(idx) && (
                  <button onClick={() => takeTreasure(idx)} className="ui-press w-full py-2 text-[12px] font-bold"
                    style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>가져간다</button>
                )}
              </div>
            ))}
            <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
              다음 층으로
            </button>
          </div>
        )}

        {/* ===== 무덤 상인 ===== */}
        {room === 'shop' && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>🪙 무덤 상인 — 보유 {char.gold}</div>
            {(char.roomData?.shop || []).map((entry, i) => {
              const sold = char.roomData?.bought?.includes(i);
              const afford = char.gold >= entry.price;
              return (
                <BuriedItemCard key={i} item={entry.item} showSlot full char={char} dim={sold}
                  right={<span className="text-[12px] tabular-nums font-bold shrink-0"
                    style={{ color: sold ? PALETTE.textDim : afford ? PALETTE.legendary : PALETTE.accent }}>
                    {sold ? '판매됨' : `🪙${entry.price}`}
                  </span>}
                  onClick={sold || !afford ? null : () => buy(entry, i)} />
              );
            })}
            <button onClick={rerollShop} disabled={char.gold < buriedShopRerollCost(monLevel, char.roomData?.rerolls || 0)}
              className="ui-press w-full py-2.5 text-[12px]"
              style={{
                borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                border: `1px solid ${PALETTE.dawn}55`,
                color: char.gold >= buriedShopRerollCost(monLevel, char.roomData?.rerolls || 0) ? PALETTE.dawn : PALETTE.textDim,
                opacity: char.gold >= buriedShopRerollCost(monLevel, char.roomData?.rerolls || 0) ? 1 : 0.5,
              }}>
              🎲 진열 리롤 — 🪙{buriedShopRerollCost(monLevel, char.roomData?.rerolls || 0)} (반복할수록 2배)
            </button>
            <button onClick={buyPotion} disabled={char.gold < potionPrice}
              className="ui-press w-full py-2.5 text-[12px]"
              style={{
                borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                border: `1px solid ${PALETTE.panelBorder}`,
                color: char.gold >= potionPrice ? PALETTE.text : PALETTE.textDim,
                opacity: char.gold >= potionPrice ? 1 : 0.5,
              }}>
              🧪 물약 구매 — 🪙{potionPrice} (전투 중 HP {BURIED_POTION_HEAL_PCT}% 회복)
              {(char.potionsBought || 0) > 0 && (
                <span style={{ color: PALETTE.textDim }}> · 이번 런 {char.potionsBought}개 구매 — 다음 🪙{buriedPotionPrice(monLevel, (char.potionsBought || 0) + 1)}</span>
              )}
            </button>
            <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
              떠난다 — 다음 층으로
            </button>
          </div>
        )}

        {/* ===== 제단 ===== */}
        {room === 'shrine' && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold" style={{ color: PALETTE.ice }}>⛩ 제단 — 회복하거나 봉헌을 바친다</div>
            <button onClick={shrineHeal} disabled={char.hp >= d.maxHp}
              className="ui-press w-full py-2.5 text-[12px]"
              style={{
                borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                border: `1px solid ${PALETTE.accent}55`, color: char.hp >= d.maxHp ? PALETTE.textDim : PALETTE.text,
                opacity: char.hp >= d.maxHp ? 0.5 : 1,
              }}>
              🩹 HP 60% 회복 {char.hp >= d.maxHp ? '(이미 최대)' : ''}
            </button>
            <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>🪙 골드를 바쳐 봉헌을 받는다 (제단당 각 1회)</div>
            {BURIED_ALTAR_BOONS.map(boon => {
              const cost = buriedBoonCost(boon, monLevel);
              const used = (char.roomData?.boons || []).includes(boon.id);
              const afford = char.gold >= cost;
              const off = used || !afford || (boon.id === 'cleanse' && (char.curses || []).length === 0);
              return (
                <button key={boon.id} onClick={off ? null : () => buyBoon(boon)} disabled={off}
                  className="ui-press w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  style={{
                    borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                    border: `1px solid ${PALETTE.panelBorder}`, opacity: off ? 0.5 : 1,
                  }}>
                  <span className="text-[13px]">{boon.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>{boon.name}</div>
                    <div className="text-[11px] break-keep leading-relaxed" style={{ color: PALETTE.textDim }}>
                      {boon.id === 'cleanse' && (char.curses || []).length === 0 ? '해제할 저주가 없다' : boon.desc}
                    </div>
                  </div>
                  <span className="text-[12px] tabular-nums shrink-0" style={{ color: used ? PALETTE.textDim : afford ? PALETTE.legendary : PALETTE.accent }}>
                    {used ? '봉헌함' : `🪙${cost}`}
                  </span>
                </button>
              );
            })}
            {resupplyOpen && (
              <div className="space-y-1 px-3 py-2.5"
                style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.ice}55` }}>
                <div className="text-[12px] font-bold" style={{ color: PALETTE.ice }}>🔧 만충할 장비 1개를 지정하라</div>
                {BURIED_SLOT_IDS.filter(s => (char.equipped?.[s]?.usesSpent || 0) > 0).map(s => {
                  const it = char.equipped[s];
                  const left = buriedSkillUsesLeft(char, s);
                  const max = buriedSkillMaxUses(BURIED_SKILLS[it.skillId], buriedSkillLv(char, it.skillId));
                  return (
                    <button key={s} onClick={() => applyResupply(s)}
                      className="ui-press w-full flex items-center gap-2 px-2.5 py-2 text-left"
                      style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}` }}>
                      <span className="text-[11px] shrink-0" style={{ color: PALETTE.textDim }}>{slotMeta(it.slot).name}</span>
                      <span className="text-[12px] font-bold flex-1 min-w-0 truncate" style={{ color: PALETTE.text }}>{it.name}</span>
                      <span className="text-[11px] tabular-nums shrink-0" style={{ color: PALETTE.dawn }}>잔여 {left}/{max}</span>
                    </button>
                  );
                })}
                <button onClick={() => setResupplyOpen(false)} className="ui-press w-full py-2 text-[12px]"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.textDim, border: `1px solid ${PALETTE.panelBorder}` }}>
                  취소
                </button>
              </div>
            )}
            <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
              다음 층으로
            </button>
          </div>
        )}

        {/* ===== 야영지 ===== */}
        {room === 'rest' && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold" style={{ color: PALETTE.green }}>🔥 야영지</div>
            <div className="text-[12px]" style={{ color: PALETTE.textDim }}>불을 피우면 몸이 조금 낫는다. 남은 재료로 물약도 하나 만들 수 있다.</div>
            <button onClick={rest} disabled={!!char.roomData?.rested}
              className="ui-press w-full py-2.5 text-[12px] font-bold"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: char.roomData?.rested ? PALETTE.panel : PALETTE.green, color: char.roomData?.rested ? PALETTE.textDim : '#0a0608', opacity: char.roomData?.rested ? 0.55 : 1 }}>
              {char.roomData?.rested ? '이미 쉬었다 — 불이 꺼져 간다' : '쉰다 — HP 45% 회복 + 물약 +1 + 무작위 장비 1개 스킬 만충 (1회)'}
            </button>
            <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
              다음 층으로
            </button>
          </div>
        )}

        {/* ===== 협상 (1.104.0) ===== */}
        {room === 'negotiate' && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>🤝 협상</div>
            <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              길을 막은 것이 손을 내민다. 값을 치르면 싸우지 않고 지나갈 수 있다.
              거절하면 <b style={{ color: PALETTE.accent }}>강적</b>이 덤빈다.
            </div>
            {char.roomData?.deal?.reward && !char.roomData?.done && (
              <>
                <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>내놓은 물건</div>
                <BuriedItemCard item={char.roomData.deal.reward} showSlot full char={char} />
              </>
            )}
            {!char.roomData?.done && (
              <div className="flex gap-2">
                <button onClick={payNegotiation} disabled={char.gold < (char.roomData?.deal?.price || 0)}
                  className="ui-press flex-1 py-2.5 text-[12px] font-bold"
                  style={{
                    borderRadius: 'var(--r-btn, 13px)',
                    background: char.gold >= (char.roomData?.deal?.price || 0) ? PALETTE.dawn : PALETTE.panelLight,
                    color: char.gold >= (char.roomData?.deal?.price || 0) ? '#0a0608' : PALETTE.textDim,
                  }}>
                  🪙 {char.roomData?.deal?.price} 지불
                </button>
                <button onClick={refuseNegotiation} className="ui-press flex-1 py-2.5 text-[12px]"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.accent, border: `1px solid ${PALETTE.accent}55` }}>
                  거절한다 — 싸운다
                </button>
              </div>
            )}
            {char.roomData?.done && (
              <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                다음 층으로
              </button>
            )}
          </div>
        )}

        {/* ===== 망자의 서고 (1.104.0) ===== */}
        {room === 'library' && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold" style={{ color: PALETTE.twilight }}>📜 망자의 서고</div>
            <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              먼저 죽은 자들이 남긴 기록. 장착 중인 스킬 하나를 <b style={{ color: PALETTE.text }}>한 단계</b> 끌어올릴 수 있다 (최대 Lv.{BURIED_SKILL_MAX_LV}).
            </div>
            {char.roomData?.done
              ? <div className="text-[12px]" style={{ color: PALETTE.textDim }}>기록은 재로 바스러졌다.</div>
              : libChoices.length === 0
                ? <div className="text-[12px]" style={{ color: PALETTE.textDim }}>더 올릴 수 있는 스킬이 없다.</div>
                : libChoices.map(({ slot, item, skill, lv }) => (
                    <button key={slot} onClick={() => studySkill(skill.id)}
                      className="ui-press w-full flex items-center gap-2 px-3 py-2.5 text-left"
                      style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.twilight}55` }}>
                      <span className="text-[13px]">{slotMeta(slot).icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold truncate" style={{ color: PALETTE.text }}>{skill.name}</div>
                        <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{item.name}</div>
                      </div>
                      <span className="text-[12px] tabular-nums shrink-0" style={{ color: PALETTE.legendary }}>
                        Lv.{lv} → {lv + 1}
                      </span>
                    </button>
                  ))}
            <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
              다음 층으로
            </button>
          </div>
        )}
        {/* ===== 해골 왕관 (1.108.0) ===== */}
        {room === 'skullcrown' && (() => {
          const rd = char.roomData || {};
          const c = rd.offer ? getBuriedCurse(rd.offer) : null;
          return (
            <div className="space-y-2">
              <div className="text-[12px] font-bold" style={{ color: BURIED_SKULL_ROOM.color }}>💀 해골 왕관</div>
              <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>{BURIED_SKULL_ROOM.desc}</div>
              {rd.text && (
                <div className="px-3 py-2.5 text-[12px] leading-relaxed" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${BURIED_SKULL_ROOM.color}15`, border: `1px solid ${BURIED_SKULL_ROOM.color}66`, color: BURIED_SKULL_ROOM.color }}>
                  {rd.text}
                </div>
              )}
              {!rd.done && c && (
                <div className="px-3 py-2.5 space-y-1" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${BURIED_SKULL_ROOM.color}55` }}>
                  <div className="text-[12px] font-bold" style={{ color: BURIED_SKULL_ROOM.color }}>
                    「{c.name}」 {'★'.repeat(c.sev)}
                  </div>
                  <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.text }}>{c.desc}</div>
                  <div className="text-[11px]" style={{ color: PALETTE.legendary }}>
                    보상: 🕯 {BURIED_CURSE_REWARD[c.sev].dust} · 🪙 {BURIED_CURSE_REWARD[c.sev].gold} (즉시) · 저주는 이번 런 내내 지속 ({buriedCurseIds(char).length}/{BURIED_CURSE_MAX})
                  </div>
                </div>
              )}
              {!rd.done && !c && (
                <div className="text-[12px]" style={{ color: PALETTE.textDim }}>왕관은 더 이상 너에게 관심이 없다. (저주 {BURIED_CURSE_MAX}개 보유)</div>
              )}
              {!rd.done && c && (
                <button onClick={acceptCurse} className="ui-press w-full py-2.5 text-[12px] font-bold"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: BURIED_SKULL_ROOM.color, color: '#0a0608' }}>
                  저주를 받아들인다
                </button>
              )}
              <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                {rd.done ? '다음 층으로' : '거절한다 — 다음 층으로'}
              </button>
            </div>
          );
        })()}

        {/* ===== 이벤트 방 5종 (1.107.0) ===== */}
        {BURIED_EVENT_ROOM_IDS.includes(room) && (() => {
          const ev = BURIED_EVENT_ROOMS[room];
          const rd = char.roomData || {};
          const wOffers = room === 'wanderer' ? buriedWandererOffers(char) : null;
          return (
            <div className="space-y-2">
              <div className="text-[12px] font-bold" style={{ color: ev.color }}>{ev.icon} {ev.name}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>{ev.desc}</div>
              {(b.eventLog?.[room] || []).length > 0 && (
                <button onClick={() => setEventLogOpen(true)} className="ui-press w-full py-2 text-[11px]"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${ev.color}44`, color: PALETTE.textDim }}>
                  📜 지난 선택 기록 {(b.eventLog[room] || []).length}건 — 전에 여기서 무슨 일이 있었나
                </button>
              )}
              {rd.text && (
                <div className="px-3 py-2.5 text-[12px] leading-relaxed"
                  style={{
                    borderRadius: 'var(--r-chip, 8px)',
                    background: rd.tone === 'bad' ? `${PALETTE.accent}15` : rd.tone === 'good' ? `${PALETTE.green}12` : PALETTE.panel,
                    border: `1px solid ${rd.tone === 'bad' ? PALETTE.accent : rd.tone === 'good' ? PALETTE.green : PALETTE.panelBorder}55`,
                    color: rd.tone === 'bad' ? PALETTE.accent : rd.tone === 'good' ? PALETTE.green : PALETTE.text,
                  }}>
                  {rd.text}
                </div>
              )}
              {!rd.done && room !== 'wanderer' && (
                <button onClick={() => runEvent(room)} className="ui-press w-full py-2.5 text-[12px] font-bold"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: ev.color, color: '#0a0608' }}>
                  {room === 'gravestone' ? '파헤친다' : room === 'spring' ? '마신다' : room === 'statue' ? '손을 댄다' : '연다'} — 무슨 일이 생길지 모른다
                </button>
              )}
              {!rd.done && room === 'wanderer' && (
                <div className="space-y-1.5">
                  <button disabled={!wOffers.canAddOption} onClick={() => runWanderer('option')} className="ui-press w-full py-2.5 text-[12px] text-left px-3"
                    style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.dawn}55`, color: wOffers.canAddOption ? PALETTE.text : PALETTE.textDim, opacity: wOffers.canAddOption ? 1 : 0.5 }}>
                    ① 무작위 장착 장비에 <b style={{ color: PALETTE.dawn }}>옵션 1개 추가</b>
                  </button>
                  <button disabled={!wOffers.canMod} onClick={() => runWanderer('mod')} className="ui-press w-full py-2.5 text-[12px] text-left px-3"
                    style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.twilight}55`, color: wOffers.canMod ? PALETTE.text : PALETTE.textDim, opacity: wOffers.canMod ? 1 : 0.5 }}>
                    ② 무작위 장비에 <b style={{ color: PALETTE.twilight }}>◈스킬 변화</b> 부여 (접두어 13종 중 랜덤)
                  </button>
                  <button disabled={!wOffers.canReroll} onClick={() => runWanderer('reroll')} className="ui-press w-full py-2.5 text-[12px] text-left px-3"
                    style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: wOffers.canReroll ? PALETTE.text : PALETTE.textDim, opacity: wOffers.canReroll ? 1 : 0.5 }}>
                    ③ 무작위 장비의 <b>옵션 수치 재조정</b> (도박)
                  </button>
                </div>
              )}
              <button onClick={advance} className="ui-press w-full py-2.5 text-[12px]"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                {rd.done ? '다음 층으로' : '지나친다 — 다음 층으로'}
              </button>
            </div>
          );
        })()}
      </div>

      {/* 1.134.0 — 이벤트 지난 기록 모달 (선택 전 과거 결과 확인) */}
      {eventLogOpen && BURIED_EVENT_ROOM_IDS.includes(room) && (() => {
        const ev = BURIED_EVENT_ROOMS[room];
        const hist = b.eventLog?.[room] || [];
        return (
          <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEventLogOpen(false)}>
            <div className="w-full px-4 pb-4 pt-3 max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}
              style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${ev.color}88`, borderRadius: '18px 18px 0 0' }}>
              <div className="text-[14px] font-bold mb-1" style={{ color: ev.color }}>{ev.icon} {ev.name} — 지난 선택 기록</div>
              <div className="text-[11px] mb-2" style={{ color: PALETTE.textDim }}>
                최근 {hist.length}건 (이전 런 포함). 결과는 매번 새로 굴려진다 — 기록은 확률 감각을 잡는 참고용.
              </div>
              <div className="space-y-1.5">
                {hist.map((h, i) => (
                  <div key={i} className="px-2.5 py-2 text-[11px] leading-relaxed"
                    style={{
                      borderRadius: 'var(--r-chip, 8px)',
                      background: h.tone === 'bad' ? `${PALETTE.accent}15` : h.tone === 'good' ? `${PALETTE.green}12` : PALETTE.panel,
                      border: `1px solid ${h.tone === 'bad' ? PALETTE.accent : h.tone === 'good' ? PALETTE.green : PALETTE.panelBorder}44`,
                      color: PALETTE.text,
                    }}>
                    <span style={{ color: PALETTE.textDim }}>{getBuriedDungeon(h.dungeonId)?.name || '?'} {h.floor}층 — </span>{h.text}
                  </div>
                ))}
              </div>
              <button onClick={() => setEventLogOpen(false)} className="ui-press w-full py-2.5 text-[12px] mt-2"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                닫기
              </button>
            </div>
          </div>
        );
      })()}

      {manage && (
        <BuriedManage char={char} dust={b.dust || 0}
          onUpdate={(next, dustGain) => onUpdateChar(next, dustGain)}
          onClose={() => setManage(false)} />
      )}

      {/* 획득 판단 (1.113.0) — 인벤토리 폐지: 대기열이 빌 때까지 차례로 [교체/버리기] */}
      {(char.pendingLoot || []).length > 0 && (
        <BuriedLootModal char={char} onResolve={(replace) => {
          const r = resolveBuriedLoot(char, replace);
          onUpdateChar(r.char, r.dustGain);
          if (r.dismantled) setNotice(`${r.dismantled.name} 자동 분해 — ${BURIED_DUST_ICON} +${r.dustGain}`);
        }} />
      )}
    </div>
  );
}
