// ============================================
// components/buried/BuriedManage.jsx — 장비·능력치 관리 시트 (1.103.0)
// ============================================
// 로비와 던전 양쪽에서 같은 시트를 띄운다 (원작: 언제든 장비 교체 = 스킬 교체).

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_SLOTS, BURIED_SLOT_IDS, BURIED_STATS, BURIED_SKILLS,
  buriedDerived, buriedDustValue, canClassUseSkill, getBuriedClass, slotPool,
} from '../../data.js';
import { BuriedItemCard, BuriedItemSheet, slotMeta, BURIED_DUST_ICON } from './BuriedCommon.jsx';

export default function BuriedManage({ char, dust = 0, onUpdate, onClose }) {
  const [tab, setTab] = useState('gear');       // gear | stats
  const [sheet, setSheet] = useState(null);     // { item, from: 'equipped'|'bag' }
  const [pickSlot, setPickSlot] = useState(null); // 슬롯 탭 시 후보 목록

  if (!char) return null;
  const cls = getBuriedClass(char.classId);
  const d = buriedDerived(char);

  const equip = (item) => {
    const slot = pickSlot || item.slot;
    const prev = char.equipped?.[slot] || null;
    const next = {
      ...char,
      equipped: { ...char.equipped, [slot]: item },
      inventory: char.inventory.filter(i => i.id !== item.id).concat(prev ? [prev] : []),
    };
    // 최대 HP가 줄면 현재 HP도 같이 clamp
    next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
    onUpdate(next, 0);
    setSheet(null); setPickSlot(null);
  };
  const unequip = (slot) => {
    const item = char.equipped?.[slot];
    if (!item) return;
    const next = { ...char, equipped: { ...char.equipped, [slot]: null }, inventory: [...char.inventory, item] };
    next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
    onUpdate(next, 0);
    setSheet(null); setPickSlot(null);
  };
  const dismantle = (item, from) => {
    const gain = buriedDustValue(item);
    let next;
    if (from === 'equipped') {
      const slot = BURIED_SLOT_IDS.find(s => char.equipped?.[s]?.id === item.id);
      next = { ...char, equipped: { ...char.equipped, [slot]: null } };
    } else {
      next = { ...char, inventory: char.inventory.filter(i => i.id !== item.id) };
    }
    next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
    onUpdate(next, gain);
    setSheet(null); setPickSlot(null);
  };
  const spendPoint = (statId) => {
    if ((char.statPoints || 0) <= 0) return;
    const next = {
      ...char,
      statPoints: char.statPoints - 1,
      stats: { ...char.stats, [statId]: (char.stats[statId] || 0) + 1 },
    };
    // 체력을 올렸으면 늘어난 최대치만큼 현재 HP도 함께 상승
    const before = buriedDerived(char).maxHp;
    const after = buriedDerived(next).maxHp;
    next.hp = Math.min(after, char.hp + Math.max(0, after - before));
    onUpdate(next, 0);
  };

  // 특정 슬롯에 넣을 수 있는 가방 속 후보
  const candidatesFor = (slot) => char.inventory.filter(i =>
    slotPool(i.slot) === slotPool(slot) && canClassUseSkill(char.classId, BURIED_SKILLS[i.skillId]));

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-4 pb-2.5 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div>
          <div className="text-[13px] font-bold" style={{ color: cls?.color || PALETTE.text }}>
            {cls?.name} <span style={{ color: PALETTE.textDim }}>Lv.{char.lv}</span>
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: PALETTE.textDim }}>
            🪙 {char.gold} · {BURIED_DUST_ICON} {dust} · 가방 {char.inventory.length}
          </div>
        </div>
        <button onClick={onClose} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><X size={18} /></button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5 px-3 py-2">
        {[{ id: 'gear', name: '장비 · 스킬' }, { id: 'stats', name: `능력치${char.statPoints > 0 ? ` (${char.statPoints})` : ''}` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="ui-press flex-1 py-2 text-[12px]"
            style={{
              borderRadius: 'var(--r-btn, 13px)',
              background: tab === t.id ? PALETTE.panelLight : 'transparent',
              border: `1px solid ${tab === t.id ? PALETTE.dawn + '88' : PALETTE.panelBorder}`,
              color: tab === t.id ? PALETTE.dawn : PALETTE.textDim,
            }}>{t.name}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
        {tab === 'gear' && (
          <>
            {/* 파생 스탯 요약 */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { l: '최대 HP', v: d.maxHp, c: PALETTE.accent },
                { l: '최대 SP', v: d.maxSp, c: PALETTE.ice },
                { l: '방어력', v: d.def, c: PALETTE.ice },
                { l: '물리/기교/마법', v: `${d.atk}/${d.fin}/${d.mag}`, c: PALETTE.dawn },
                { l: '치명', v: `${d.crit}% ×${(1 + d.critDmg / 100).toFixed(1)}`, c: PALETTE.legendary },
                { l: '회피 / SP회복', v: `${d.dodge}% / +${d.spRegen}`, c: PALETTE.green },
              ].map(x => (
                <div key={x.l} className="px-2 py-1.5" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                  <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{x.l}</div>
                  <div className="text-[12px] font-bold tabular-nums" style={{ color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* 6슬롯 */}
            <div>
              <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>
                장착 — 슬롯 6칸이 곧 전투 스킬 6개
              </div>
              <div className="space-y-1.5">
                {BURIED_SLOTS.map(s => {
                  const item = char.equipped?.[s.id] || null;
                  return (
                    <BuriedItemCard key={s.id} item={item} slotId={s.id}
                      onClick={() => { setPickSlot(s.id); setSheet(item ? { item, from: 'equipped' } : null); }} />
                  );
                })}
              </div>
            </div>

            {/* 슬롯 후보 목록 */}
            {pickSlot && !sheet && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>
                    {slotMeta(pickSlot).name} 후보
                  </div>
                  <button onClick={() => setPickSlot(null)} className="ui-press text-[11px]" style={{ color: PALETTE.textDim }}>취소</button>
                </div>
                {candidatesFor(pickSlot).length === 0
                  ? <div className="text-[12px] px-3 py-3" style={{ color: PALETTE.textDim, background: PALETTE.panel, borderRadius: 'var(--r-btn, 13px)' }}>
                      가방에 이 슬롯에 넣을 장비가 없다.
                    </div>
                  : <div className="space-y-1.5">
                      {candidatesFor(pickSlot).map(i => (
                        <BuriedItemCard key={i.id} item={i} slotId={pickSlot} onClick={() => setSheet({ item: i, from: 'bag' })} />
                      ))}
                    </div>}
              </div>
            )}

            {/* 가방 */}
            <div>
              <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>가방 — {char.inventory.length}개</div>
              {char.inventory.length === 0
                ? <div className="text-[12px] px-3 py-3" style={{ color: PALETTE.textDim, background: PALETTE.panel, borderRadius: 'var(--r-btn, 13px)' }}>비어 있다.</div>
                : <div className="space-y-1.5">
                    {char.inventory.map(i => (
                      <BuriedItemCard key={i.id} item={i} showSlot onClick={() => { setPickSlot(i.slot); setSheet({ item: i, from: 'bag' }); }} />
                    ))}
                  </div>}
            </div>
          </>
        )}

        {tab === 'stats' && (
          <>
            <div className="px-3 py-2.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
              <div className="text-[12px]" style={{ color: PALETTE.text }}>
                남은 포인트 <span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{char.statPoints || 0}</span>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>
                레벨업마다 3포인트. 배분한 포인트는 되돌릴 수 없다.
              </div>
            </div>
            {BURIED_STATS.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                <span className="text-[15px]">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold" style={{ color: s.color }}>
                    {s.name} <span className="tabular-nums" style={{ color: PALETTE.text }}>{char.stats[s.id] || 0}</span>
                    {d.stats[s.id] !== char.stats[s.id] && (
                      <span className="text-[11px] ml-1" style={{ color: PALETTE.green }}>(+{d.stats[s.id] - (char.stats[s.id] || 0)} 장비)</span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{s.desc}</div>
                </div>
                <button disabled={(char.statPoints || 0) <= 0} onClick={() => spendPoint(s.id)}
                  className="ui-press px-3 py-1.5 text-[13px] font-bold"
                  style={{
                    borderRadius: 'var(--r-chip, 8px)',
                    background: (char.statPoints || 0) > 0 ? PALETTE.accent : PALETTE.panelLight,
                    color: (char.statPoints || 0) > 0 ? '#fff' : PALETTE.textDim,
                    opacity: (char.statPoints || 0) > 0 ? 1 : 0.5,
                  }}>+1</button>
              </div>
            ))}
            {cls?.trait && (
              <div className="px-3 py-2.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panelLight, border: `1px solid ${cls.color}55` }}>
                <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: cls.color }}>직업 특성</div>
                <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>{cls.trait.name}</div>
                <div className="text-[12px] mt-0.5 leading-relaxed" style={{ color: PALETTE.textDim }}>{cls.trait.desc}</div>
              </div>
            )}
          </>
        )}
      </div>

      {sheet && (
        <BuriedItemSheet
          item={sheet.item}
          compare={sheet.from === 'bag' ? (char.equipped?.[pickSlot || sheet.item.slot] || null) : null}
          onEquip={sheet.from === 'bag' ? () => equip(sheet.item) : null}
          onUnequip={sheet.from === 'equipped' ? () => unequip(BURIED_SLOT_IDS.find(s => char.equipped?.[s]?.id === sheet.item.id)) : null}
          onDismantle={() => dismantle(sheet.item, sheet.from)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
