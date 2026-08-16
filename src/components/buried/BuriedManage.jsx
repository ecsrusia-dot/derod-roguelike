// ============================================
// components/buried/BuriedManage.jsx — 장비·스킬 관리 시트 (1.103.0 / 1.113.0 개편)
// ============================================
// 로비와 던전 양쪽에서 같은 시트를 띄운다 (원작: 언제든 장비 확인 = 스킬 확인).
// 1.113.0 — 인벤토리·능력치 배분 폐지 (PM: 스탯은 장비를 통해서만, 획득 즉시 판단).
// 이 화면은 장착 6슬롯 + 능력치 출처 열람 전용이 됐다.

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_SLOTS, BURIED_SLOT_IDS, BURIED_STATS, BURIED_SKILLS, BURIED_SKILL_MAX_LV,
  buriedDerived, buriedDustValue, getBuriedClass,
  buriedTraitIds, getBuriedTrait, buriedSkillLv, buriedSkillRank, BURIED_SKILL_RANKS,
} from '../../data.js';
import { BuriedItemCard, BuriedItemSheet, BURIED_DUST_ICON } from './BuriedCommon.jsx';

export default function BuriedManage({ char, dust = 0, onUpdate, onClose }) {
  const [sheet, setSheet] = useState(null); // { item, slot }

  if (!char) return null;
  const cls = getBuriedClass(char.classId);
  const d = buriedDerived(char);

  // 장착 장비 분해 — 슬롯이 비면 그 스킬도 못 쓴다 (신중히)
  const dismantle = (item) => {
    const gain = buriedDustValue(item);
    const slot = BURIED_SLOT_IDS.find(s => char.equipped?.[s]?.id === item.id);
    const next = { ...char, equipped: { ...char.equipped, [slot]: null } };
    next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
    onUpdate(next, gain);
    setSheet(null);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-4 pb-2.5 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div>
          <div className="text-[13px] font-bold" style={{ color: cls?.color || PALETTE.text }}>
            {cls?.name} <span style={{ color: PALETTE.textDim }}>Lv.{char.lv}</span>
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: PALETTE.textDim }}>
            🪙 {char.gold} · {BURIED_DUST_ICON} {dust}
          </div>
        </div>
        <button onClick={onClose} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-4 space-y-3">
        {/* 파생 스탯 요약 */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { l: '최대 HP', v: d.maxHp, c: PALETTE.accent },
            { l: '최대 SP', v: d.maxSp, c: PALETTE.ice },
            { l: '방어력', v: d.def, c: PALETTE.ice },
            { l: '물리/기교/마법', v: `${d.atk}/${d.fin}/${d.mag}`, c: PALETTE.dawn },
            { l: '치명', v: `${d.crit}% ×${(1 + d.critDmg / 100).toFixed(1)}`, c: PALETTE.legendary },
            { l: '회피 / SP회복', v: `${d.dodge}% / +${d.spRegen}`, c: PALETTE.green },
            { l: '🔷 보호막', v: d.barrier || 0, c: PALETTE.ice },
            { l: '추격 피해', v: d.chase || 0, c: PALETTE.dawn },
          ].map(x => (
            <div key={x.l} className="px-2 py-1.5" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
              <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{x.l}</div>
              <div className="text-[12px] font-bold tabular-nums" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>

        {/* 능력치 4종 — 1.113.0: 배분 폐지, 장비 출처 열람만 */}
        <div className="px-3 py-2.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>
            능력치 — 성장은 100% 장비 (배분 없음)
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {BURIED_STATS.map(s => (
              <div key={s.id} className="flex justify-between items-center text-[12px]">
                <span style={{ color: s.color }}>{s.icon} {s.name}</span>
                <span className="tabular-nums" style={{ color: PALETTE.text }}>
                  {d.stats[s.id]}
                  {d.stats[s.id] !== (char.stats[s.id] || 0) && (
                    <span className="text-[11px] ml-1" style={{ color: PALETTE.green }}>(+{d.stats[s.id] - (char.stats[s.id] || 0)})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 6슬롯 */}
        <div>
          <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>
            장착 — 슬롯 6칸이 곧 전투 스킬 6개. 교체는 새 장비를 주웠을 때만 (인벤토리 없음)
          </div>
          <div className="space-y-1.5">
            {BURIED_SLOTS.map(s => {
              const item = char.equipped?.[s.id] || null;
              const lv = item ? buriedSkillLv(char, item.skillId) : 1;
              const rank = item ? buriedSkillRank(BURIED_SKILLS[item.skillId]) : null;
              return (
                <BuriedItemCard key={s.id} item={item} slotId={s.id}
                  right={item ? (
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold tabular-nums" style={{ color: lv >= BURIED_SKILL_MAX_LV ? PALETTE.legendary : PALETTE.text }}>
                        Lv.{lv}
                      </div>
                      <div className="text-[11px]" style={{ color: BURIED_SKILL_RANKS[rank]?.color }}>{rank}급</div>
                    </div>
                  ) : null}
                  onClick={item ? () => setSheet({ item, slot: s.id }) : null} />
              );
            })}
          </div>
        </div>

        {/* 특성 3개 — 원작 규칙: 첫 번째가 직업 전용 */}
        <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panelLight, border: `1px solid ${cls?.color}55` }}>
          <div className="text-[11px] tracking-[0.2em]" style={{ color: cls?.color }}>영구 특성 — 3개 (첫 번째는 직업 전용)</div>
          {buriedTraitIds(char).map((id, i) => {
            const t = getBuriedTrait(id);
            if (!t) return null;
            return (
              <div key={id}>
                <div className="text-[12px] font-bold" style={{ color: i === 0 ? cls?.color : PALETTE.text }}>
                  {i === 0 ? '★' : '◆'} {t.name}
                </div>
                <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>{t.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {sheet && (
        <BuriedItemSheet
          item={sheet.item}
          onDismantle={() => dismantle(sheet.item)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
