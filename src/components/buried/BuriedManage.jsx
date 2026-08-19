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
  buriedItemRunes, buriedItemSockets,
  buriedDerived, buriedDustValue, getBuriedClass,
  buriedTraitIds, getBuriedTrait, buriedSkillLv, buriedSkillRank, BURIED_SKILL_RANKS,
  getBuriedRune, BURIED_RUNE_RARITIES, socketBuriedRune, buriedSkillUsesLeft, buriedBreakIn,
  buriedDamageFormula, buriedRunewordProgress,
} from '../../data.js';
import { BuriedItemCard, BuriedItemSheet, BURIED_DUST_ICON } from './BuriedCommon.jsx';

export default function BuriedManage({ char, dust = 0, onUpdate, onClose }) {
  const [sheet, setSheet] = useState(null); // { item, slot }
  const [runePick, setRunePick] = useState(null); // ᚱ 각인할 룬 index (1.123.0)
  const [openPanel, setOpenPanel] = useState(null); // 1.148.0 — 'formula' | 'runeword'

  if (!char) return null;
  const cls = getBuriedClass(char.classId);
  const d = buriedDerived(char);
  const runes = char.runes || [];

  // ᚱ 룬 각인 — 영구 (제거 불가 도박 룰). 소켓 빈 장착 장비만 후보
  const socketRune = (slot) => {
    const { char: next, text } = socketBuriedRune(char, runePick, slot);
    if (next !== char) onUpdate(next, 0);
    setRunePick(null);
    void text;
  };

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

        {/* 1.148.0 — ⚔ 데미지 공식 / ⟪룬워드⟫ 조합표 (PM 지시: 계산이 명확하고, 룬워드를 볼 수 있게) */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'formula', label: '⚔ 데미지 공식', color: PALETTE.dawn },
            { id: 'runeword', label: '⟪ ᚱ 룬워드 조합표', color: PALETTE.legendary },
          ].map(b => (
            <button key={b.id} onClick={() => setOpenPanel(openPanel === b.id ? null : b.id)}
              className="ui-press px-2.5 py-2 text-[12px] font-bold"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: openPanel === b.id ? PALETTE.panelLight : PALETTE.panel,
                border: `1px solid ${openPanel === b.id ? b.color : PALETTE.panelBorder}`, color: b.color }}>
              {b.label} {openPanel === b.id ? '▲' : '▼'}
            </button>
          ))}
        </div>

        {openPanel === 'formula' && (
          <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.dawn}44` }}>
            <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              위에서 아래로 순서대로 계산한다. ②는 <b style={{ color: PALETTE.dawn }}>곱연산</b>, ③은 <b style={{ color: PALETTE.dawn }}>곱해지지 않는 별도 가산</b> — 장비 비교의 핵심이다.
            </div>
            {buriedDamageFormula(char).map((r, i) => (
              <div key={i} className="flex gap-2 py-1" style={{ borderTop: i > 0 ? `1px solid ${PALETTE.panelBorder}` : 'none' }}>
                <span className="text-[12px] font-bold shrink-0 w-4 text-center" style={{ color: PALETTE.dawn }}>{r.n}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2 text-[12px]">
                    <span style={{ color: PALETTE.text }}>{r.label}</span>
                    <span className="tabular-nums text-right shrink-0" style={{ color: PALETTE.legendary }}>{r.value}</span>
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>{r.note}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {openPanel === 'runeword' && (
          <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.legendary}44` }}>
            <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              한 장비의 소켓에 <b style={{ color: PALETTE.legendary }}>정해진 순서 그대로</b> 각인하면 완성된다. 각인은 영구 — 순서를 틀리면 되돌릴 수 없다.
              <br />★ = 장착 장비에 완성됨 · ✅ = 지금 주머니 룬으로 완성 가능
            </div>
            {buriedRunewordProgress(char).map(rw => (
              <div key={rw.id} className="py-1.5" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[12px] font-bold" style={{ color: rw.done ? PALETTE.legendary : rw.craftable ? PALETTE.green : PALETTE.text }}>
                    {rw.done ? '★ ' : rw.craftable ? '✅ ' : ''}⟪{rw.name}⟫
                  </span>
                  <span className="text-[11px] shrink-0" style={{ color: PALETTE.dawn }}>{rw.desc}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>
                  {rw.runes.map((r, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ color: PALETTE.panelBorder }}> → </span>}
                      <span style={{ color: BURIED_RUNE_RARITIES[r?.rarity]?.color || PALETTE.text }}>{r?.name || '?'}</span>
                    </span>
                  ))}
                  {rw.missing.length > 0 && <span style={{ color: PALETTE.accent }}> · 부족: {rw.missing.join(', ')}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

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
                <BuriedItemCard key={s.id} item={item} slotId={s.id} char={char}
                  right={item ? (
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold tabular-nums" style={{ color: lv >= BURIED_SKILL_MAX_LV ? PALETTE.legendary : PALETTE.text }}>
                        Lv.{lv}
                      </div>
                      <div className="text-[11px]" style={{ color: BURIED_SKILL_RANKS[rank]?.color }}>{rank}급</div>
                      {(() => { // 1.132.0 — 스킬 사용 횟수 / 1.134.0 — 파손 카운트다운
                        const left = buriedSkillUsesLeft(char, s.id);
                        const brk = left <= 0 ? buriedBreakIn(char, s.id) : null;
                        return (
                          <div className="text-[11px] tabular-nums" style={{ color: left <= 0 ? PALETTE.accent : PALETTE.textDim }}>
                            {left <= 0 ? `⛓ 봉인${brk != null ? ` · ${brk}층 후 파손` : ''}` : `횟수 ${left}`}
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                  onClick={item ? () => setSheet({ item, slot: s.id }) : null} />
              );
            })}
          </div>
        </div>

        {/* ᚱ 룬 주머니 (1.123.0) — 각인은 영구, 장비를 버리면 소멸 */}
        {runes.length > 0 && (
          <div className="px-3 py-2.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.legendary}44` }}>
            <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.legendary }}>
              ᚱ 룬 주머니 {runes.length}개 — 장비 스킬에 영구 각인 (장비당 1칸 · 제거 불가)
            </div>
            <div className="space-y-1.5">
              {runes.map((id, i) => {
                const r = getBuriedRune(id);
                if (!r) return null;
                const rar = BURIED_RUNE_RARITIES[r.rarity];
                return (
                  <div key={`${id}-${i}`} className="flex items-center gap-2 px-2.5 py-2"
                    style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${rar.color}55` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: rar.color }}>ᚱ {r.name} <span className="font-normal">{rar.stars}</span></div>
                      <div className="text-[11px] break-keep" style={{ color: PALETTE.textDim }}>{r.desc}</div>
                    </div>
                    <button onClick={() => setRunePick(i)} className="ui-press shrink-0 px-2.5 py-1.5 text-[11px] font-bold"
                      style={{ borderRadius: 'var(--r-chip, 8px)', background: `${rar.color}22`, border: `1px solid ${rar.color}66`, color: rar.color }}>
                      각인
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          char={char}
          item={sheet.item}
          onDismantle={() => dismantle(sheet.item)}
          onClose={() => setSheet(null)}
        />
      )}

      {/* ᚱ 각인 대상 선택 (1.123.0) — 소켓이 빈 장착 장비만 */}
      {runePick !== null && getBuriedRune(runes[runePick]) && (() => {
        const r = getBuriedRune(runes[runePick]);
        const rar = BURIED_RUNE_RARITIES[r.rarity];
        const targets = BURIED_SLOTS.filter(s => char.equipped?.[s.id] && buriedItemRunes(char.equipped[s.id]).length < buriedItemSockets(char.equipped[s.id]));
        return (
          <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.72)' }} onClick={() => setRunePick(null)}>
            <div className="w-full px-3 pb-4 pt-3" onClick={(e) => e.stopPropagation()}
              style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${rar.color}66`, borderRadius: '18px 18px 0 0', maxHeight: '80%', overflowY: 'auto' }}>
              <div className="text-[13px] font-bold mb-0.5" style={{ color: rar.color }}>ᚱ {r.name} {rar.stars} — 어디에 각인할까</div>
              <div className="text-[11px] mb-2 leading-relaxed" style={{ color: PALETTE.textDim }}>
                {r.desc}. <b style={{ color: PALETTE.accent }}>각인은 영구</b> — 떼어낼 수 없고, 그 장비를 버리거나 분해하면 룬도 함께 소멸한다.
              </div>
              {targets.length === 0 ? (
                <div className="px-3 py-3 text-[12px]" style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, color: PALETTE.textDim }}>
                  각인할 수 있는 장비가 없다 — 모든 장착 장비의 소켓이 가득 찼거나, 슬롯이 비어 있다.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {targets.map(s => (
                    <BuriedItemCard key={s.id} item={char.equipped[s.id]} slotId={s.id} char={char} onClick={() => socketRune(s.id)} />
                  ))}
                </div>
              )}
              <button onClick={() => setRunePick(null)} className="ui-press w-full py-2.5 mt-2 text-[12px]"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
                취소
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
