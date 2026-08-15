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
  BURIED_ROOMS, BURIED_ENHANCE_MAX, BURIED_SLOT_IDS, BURIED_ROOM_COLORS,
  BURIED_POTION_HEAL_PCT, BURIED_POTION_PRICE, BURIED_SKILL_MAX_LV,
  buriedDerived, buriedExpToNext, buriedEnhanceCost,
  getBuriedClass, getBuriedTier, getBuriedDungeon, buriedMonsterLevel,
  rollBuriedOffers, rollBuriedItem, rollBuriedShop,
  advanceBuriedFloor, buildBuriedRoomEnemy, addBuriedItemToChar, stepBuriedChar,
  getBuriedRoomEffect, getBuriedFloorEffect,
  buildBuriedNegotiation, buriedLibraryChoices, raiseBuriedSkill, buriedSkillLv,
} from '../../data.js';
import { BuriedItemCard, BuriedBar, BURIED_DUST_ICON, slotMeta } from './BuriedCommon.jsx';
import BuriedManage from './BuriedManage.jsx';

export default function BuriedDungeonScreen({ meta, onUpdateChar, onEnterBattle, onClear, onLeave }) {
  const b = meta?.buried || {};
  const char = b.char || null;
  const [manage, setManage] = useState(false);
  const [notice, setNotice] = useState(null);

  // 이번 층의 방 선택지가 없으면 생성 (새로고침 후에도 그대로 이어진다)
  useEffect(() => {
    if (char && !char.offers) {
      onUpdateChar({ ...char, offers: rollBuriedOffers(char.floor, char.dungeonId), room: null, roomData: null }, 0);
    }
  }, [char, onUpdateChar]);

  if (!char) return null;
  const cls = getBuriedClass(char.classId);
  const dungeon = getBuriedDungeon(char.dungeonId);
  const d = buriedDerived(char);
  const offers = char.offers || [];
  const monLevel = buriedMonsterLevel(char);
  const floorFx = getBuriedFloorEffect(char.floorEffect);

  // 방을 하나 해결하면 걸음수 +1 후 다음 층으로
  const advance = () => {
    const stepped = stepBuriedChar(char);
    const { char: next, cleared } = advanceBuriedFloor(stepped);
    if (cleared) onClear(next);
    else onUpdateChar(next, 0);
    setNotice(null);
  };

  // ===== 방 진입 =====
  const enterRoom = (offer) => {
    const type = offer.type;
    if (type === 'battle' || type === 'elite' || type === 'boss') {
      const enemy = buildBuriedRoomEnemy(char, type, offer.effect);
      onUpdateChar({ ...char, room: type, roomEffect: offer.effect || null }, 0);
      onEnterBattle(enemy, type, offer.effect || null);
      return;
    }
    let roomData = null;
    if (type === 'shop') roomData = { shop: rollBuriedShop(monLevel, char.classId), bought: [] };
    if (type === 'treasure') roomData = { item: rollBuriedItem({ slot: null, classId: char.classId, floor: monLevel, luck: 2 + dungeon.dropLuck }), taken: false };
    if (type === 'negotiate') roomData = { deal: buildBuriedNegotiation(char), done: false };
    if (type === 'library') roomData = { done: false };
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
        : `${item.name} — 가방에 넣었다.`);
  };

  const takeTreasure = () => {
    const item = char.roomData?.item;
    if (!item || char.roomData?.taken) return;
    gainItem(item, { roomData: { ...char.roomData, taken: true } });
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

  const buyPotion = () => {
    if (char.gold < BURIED_POTION_PRICE) return;
    onUpdateChar({ ...char, gold: char.gold - BURIED_POTION_PRICE, potions: (char.potions || 0) + 1 }, 0);
    setNotice('물약을 하나 챙겼다.');
  };

  const shrineHeal = () => {
    const amount = Math.round(d.maxHp * 0.6);
    onUpdateChar({ ...char, hp: Math.min(d.maxHp, char.hp + amount) }, 0);
    setNotice(`제단의 빛이 HP ${amount}을(를) 되돌렸다.`);
  };

  const enhance = (slot) => {
    const item = char.equipped?.[slot];
    if (!item || item.plus >= BURIED_ENHANCE_MAX) return;
    const cost = buriedEnhanceCost(item.plus);
    if (char.gold < cost) return;
    onUpdateChar({
      ...char,
      gold: char.gold - cost,
      equipped: { ...char.equipped, [slot]: { ...item, plus: (item.plus || 0) + 1 } },
    }, 0);
    setNotice(`${item.name} +${(item.plus || 0) + 1} 강화 성공.`);
  };

  const rest = () => {
    const amount = Math.round(d.maxHp * 0.45);
    onUpdateChar({ ...char, hp: Math.min(d.maxHp, char.hp + amount), potions: (char.potions || 0) + 1 }, 0);
    setNotice(`야영으로 HP ${amount} 회복. 물약도 하나 만들었다.`);
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

  const nextBossFloor = Object.keys(dungeon.bossFloors).map(Number).sort((a, b) => a - b).find(f => f > char.floor);

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
              {dungeon.name} · {char.floor} / {dungeon.floors}층
            </div>
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {cls?.name} Lv.{char.lv} · 🪙 {char.gold} · 🧪 {char.potions || 0} · 마물 Lv.{monLevel}
            </div>
          </div>
          <button onClick={() => setManage(true)} className="ui-press p-1.5 relative" style={{ color: PALETTE.dawn }}>
            <Package size={18} />
            {char.statPoints > 0 && <span className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ background: PALETTE.legendary }} />}
          </button>
        </div>
        <BuriedBar value={char.hp} max={d.maxHp} color={PALETTE.accent} label="HP" />
        <div className="mt-1">
          <BuriedBar value={char.exp} max={buriedExpToNext(char.lv)} color={PALETTE.twilight} label="EXP" height={4} showText={false} />
        </div>
        {/* 걸음수 — 원작 규칙: 방을 지날수록 마물이 강해진다 */}
        <div className="flex items-center justify-between mt-1.5 text-[11px]" style={{ color: PALETTE.textDim }}>
          <span>걸음 {char.steps || 0} · {dungeon.stepsPerLevel}걸음마다 마물 Lv.+1</span>
          {floorFx && (
            <span className="px-1.5 py-0.5" style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${PALETTE.legendary}66`, color: PALETTE.legendary }}
              title={floorFx.desc}>★ {floorFx.name}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {notice && (
          <div className="px-3 py-2 text-[12px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.dawn}15`, border: `1px solid ${PALETTE.dawn}55`, color: PALETTE.dawn }}>
            {notice}
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
                const r = BURIED_ROOMS[o.type] || BURIED_ROOMS.battle;
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
            <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>📦 부장품</div>
            {char.roomData?.item
              ? <BuriedItemCard item={char.roomData.item} showSlot />
              : <div className="text-[12px]" style={{ color: PALETTE.textDim }}>관은 비어 있었다.</div>}
            {char.roomData?.item && !char.roomData?.taken && (
              <button onClick={takeTreasure} className="ui-press w-full py-2.5 text-[12px] font-bold"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>가져간다</button>
            )}
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
                <BuriedItemCard key={i} item={entry.item} showSlot dim={sold}
                  right={<span className="text-[12px] tabular-nums font-bold shrink-0"
                    style={{ color: sold ? PALETTE.textDim : afford ? PALETTE.legendary : PALETTE.accent }}>
                    {sold ? '판매됨' : `🪙${entry.price}`}
                  </span>}
                  onClick={sold || !afford ? null : () => buy(entry, i)} />
              );
            })}
            <button onClick={buyPotion} disabled={char.gold < BURIED_POTION_PRICE}
              className="ui-press w-full py-2.5 text-[12px]"
              style={{
                borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                border: `1px solid ${PALETTE.panelBorder}`,
                color: char.gold >= BURIED_POTION_PRICE ? PALETTE.text : PALETTE.textDim,
                opacity: char.gold >= BURIED_POTION_PRICE ? 1 : 0.5,
              }}>
              🧪 물약 구매 — 🪙{BURIED_POTION_PRICE} (전투 중 HP {BURIED_POTION_HEAL_PCT}% 회복)
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
            <div className="text-[12px] font-bold" style={{ color: PALETTE.ice }}>⛩ 제단 — 회복하거나 장비를 벼린다</div>
            <button onClick={shrineHeal} disabled={char.hp >= d.maxHp}
              className="ui-press w-full py-2.5 text-[12px]"
              style={{
                borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                border: `1px solid ${PALETTE.accent}55`, color: char.hp >= d.maxHp ? PALETTE.textDim : PALETTE.text,
                opacity: char.hp >= d.maxHp ? 0.5 : 1,
              }}>
              🩹 HP 60% 회복 {char.hp >= d.maxHp ? '(이미 최대)' : ''}
            </button>
            <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>장착 중인 장비 강화 (최대 +{BURIED_ENHANCE_MAX}, 단계당 능력치 +12%)</div>
            {BURIED_SLOT_IDS.map(slot => {
              const item = char.equipped?.[slot];
              if (!item) return null;
              const maxed = item.plus >= BURIED_ENHANCE_MAX;
              const cost = buriedEnhanceCost(item.plus);
              const afford = char.gold >= cost;
              const tier = getBuriedTier(item.tier);
              return (
                <button key={slot} onClick={maxed || !afford ? null : () => enhance(slot)} disabled={maxed || !afford}
                  className="ui-press w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  style={{
                    borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                    border: `1px solid ${PALETTE.panelBorder}`, opacity: maxed || !afford ? 0.5 : 1,
                  }}>
                  <span className="text-[13px]" style={{ color: tier.color }}>{slotMeta(slot).icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] truncate" style={{ color: tier.color }}>
                      {item.name} <span style={{ color: PALETTE.legendary }}>+{item.plus}</span>
                    </div>
                  </div>
                  <span className="text-[12px] tabular-nums shrink-0" style={{ color: maxed ? PALETTE.textDim : afford ? PALETTE.legendary : PALETTE.accent }}>
                    {maxed ? 'MAX' : `🪙${cost}`}
                  </span>
                </button>
              );
            })}
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
            <button onClick={rest} className="ui-press w-full py-2.5 text-[12px] font-bold"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.green, color: '#0a0608' }}>
              쉰다 — HP 45% 회복 + 물약 +1
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
                <BuriedItemCard item={char.roomData.deal.reward} showSlot />
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
      </div>

      {manage && (
        <BuriedManage char={char} dust={b.dust || 0}
          onUpdate={(next, dustGain) => onUpdateChar(next, dustGain)}
          onClose={() => setManage(false)} />
      )}
    </div>
  );
}
