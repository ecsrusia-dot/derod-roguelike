// ============================================
// components/buried/BuriedDungeonScreen.jsx — 층 진행 + 방 선택 (1.103.0)
// ============================================
// 원작 구조: 층마다 방 2~3개 중 하나를 고른다. 5층 중간보스 / 10층 보스.
// 전투 방은 App으로 위임(onEnterBattle), 나머지 방(상점·제단·부장품·야영)은 이 화면에서 해결.

import React, { useEffect, useState } from 'react';
import { ChevronLeft, Package } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_DUNGEON, BURIED_ROOMS, BURIED_ENHANCE_MAX, BURIED_SLOT_IDS,
  BURIED_POTION_HEAL_PCT, BURIED_POTION_PRICE,
  buriedDerived, buriedExpToNext, buriedEnhanceCost, buriedItemStats,
  getBuriedClass, getBuriedTier, rollBuriedOffers, rollBuriedItem, rollBuriedShop,
  advanceBuriedFloor, buildBuriedRoomEnemy,
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
      onUpdateChar({ ...char, offers: rollBuriedOffers(char.floor), room: null, roomData: null }, 0);
    }
  }, [char, onUpdateChar]);

  if (!char) return null;
  const cls = getBuriedClass(char.classId);
  const d = buriedDerived(char);
  const offers = char.offers || [];

  const advance = () => {
    const { char: next, cleared } = advanceBuriedFloor(char);
    if (cleared) onClear(next);
    else onUpdateChar(next, 0);
    setNotice(null);
  };

  // ===== 방 진입 =====
  const enterRoom = (type) => {
    if (type === 'battle' || type === 'elite' || type === 'boss') {
      const enemy = buildBuriedRoomEnemy(char, type);
      onUpdateChar({ ...char, room: type }, 0);
      onEnterBattle(enemy, type);
      return;
    }
    let roomData = null;
    if (type === 'shop') roomData = { shop: rollBuriedShop(char.floor, char.classId), bought: [] };
    if (type === 'treasure') roomData = { item: rollBuriedItem({ slot: null, classId: char.classId, floor: char.floor, luck: 2 }), taken: false };
    onUpdateChar({ ...char, room: type, roomData }, 0);
  };

  // ===== 방 처리 =====
  const takeTreasure = () => {
    const item = char.roomData?.item;
    if (!item || char.roomData?.taken) return;
    const slotEmpty = !char.equipped?.[item.slot];
    const next = slotEmpty
      ? { ...char, equipped: { ...char.equipped, [item.slot]: item }, roomData: { ...char.roomData, taken: true } }
      : { ...char, inventory: [...char.inventory, item], roomData: { ...char.roomData, taken: true } };
    onUpdateChar(next, 0);
    setNotice(slotEmpty ? `${item.name} — 빈 ${slotMeta(item.slot).name} 슬롯에 바로 장착했다.` : `${item.name} — 가방에 넣었다.`);
  };

  const buy = (entry, idx) => {
    if (char.gold < entry.price || char.roomData?.bought?.includes(idx)) return;
    onUpdateChar({
      ...char,
      gold: char.gold - entry.price,
      inventory: [...char.inventory, entry.item],
      roomData: { ...char.roomData, bought: [...(char.roomData.bought || []), idx] },
    }, 0);
    setNotice(`${entry.item.name}을(를) 샀다. 장비 버튼에서 장착할 수 있다.`);
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
    const next = {
      ...char,
      gold: char.gold - cost,
      equipped: { ...char.equipped, [slot]: { ...item, plus: (item.plus || 0) + 1 } },
    };
    onUpdateChar(next, 0);
    setNotice(`${item.name} +${(item.plus || 0) + 1} 강화 성공.`);
  };

  const rest = () => {
    const amount = Math.round(d.maxHp * 0.45);
    onUpdateChar({ ...char, hp: Math.min(d.maxHp, char.hp + amount), potions: (char.potions || 0) + 1 }, 0);
    setNotice(`야영으로 HP ${amount} 회복. 물약도 하나 만들었다.`);
  };

  // ===== 렌더 =====
  const room = char.room;
  const inRoom = room && room !== 'battle' && room !== 'elite' && room !== 'boss';

  return (
    <div className="absolute inset-0 flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-4 pb-2.5 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onLeave} disabled={inRoom} className="ui-press p-1.5" style={{ color: PALETTE.textDim, opacity: inRoom ? 0.3 : 1 }}>
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-[12px] tracking-[0.3em] font-bold" style={{ color: PALETTE.legendary }}>
              {BURIED_DUNGEON.name} · {char.floor} / {BURIED_DUNGEON.floors}층
            </div>
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {cls?.name} Lv.{char.lv} · 🪙 {char.gold} · 🧪 {char.potions || 0}
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
                return (
                  <button key={`${o.type}-${i}`} onClick={() => enterRoom(o.type)}
                    className="ui-press w-full flex items-center gap-3 px-3 py-3.5 text-left"
                    style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${r.color}66` }}>
                    <span className="text-[22px]">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold" style={{ color: r.color }}>{r.name}</div>
                      <div className="text-[12px]" style={{ color: PALETTE.textDim }}>{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-2.5 text-[11px] leading-relaxed"
              style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
              한 층에서는 방 하나만 고를 수 있다. 고르지 않은 방은 사라진다.
              {char.floor === 4 && <><br /><b style={{ color: PALETTE.legendary }}>다음 층은 봉인의 문이다. 정비할 마지막 기회.</b></>}
              {char.floor === 9 && <><br /><b style={{ color: PALETTE.accent }}>다음 층에 무덤의 폭군이 있다.</b></>}
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
                <div key={i} className="space-y-1">
                  <BuriedItemCard item={entry.item} showSlot dim={sold}
                    right={<span className="text-[12px] tabular-nums font-bold shrink-0"
                      style={{ color: sold ? PALETTE.textDim : afford ? PALETTE.legendary : PALETTE.accent }}>
                      {sold ? '판매됨' : `🪙${entry.price}`}
                    </span>}
                    onClick={sold || !afford ? null : () => buy(entry, i)} />
                </div>
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
      </div>

      {manage && (
        <BuriedManage char={char} dust={b.dust || 0}
          onUpdate={(next, dustGain) => onUpdateChar(next, dustGain)}
          onClose={() => setManage(false)} />
      )}
    </div>
  );
}
