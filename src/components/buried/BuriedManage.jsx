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
  buriedTraitIds, getBuriedTrait, buriedSkillLv, BURIED_QUALITY_COLORS,
  getBuriedRune, BURIED_RUNE_RARITIES, socketBuriedRune, buriedSkillUsesLeft, buriedBreakIn,
  buriedDamageFormula, buriedRunewordProgress, getBuriedRace, getBuriedOrigin,
  BURIED_RUNE_FUSION, buriedFusionInfo, fuseBuriedRunes,
  buriedRunePouchGroups, buriedRunewordFitCheck, applyBuriedRuneword, BURIED_RUNEWORDS,
  rollBuriedRuneRecovery, BURIED_RUNE_RECOVERY,
} from '../../data.js';
import { BuriedItemCard, BuriedItemSheet, BURIED_DUST_ICON } from './BuriedCommon.jsx';

// 1.155.0 — readOnly: 랭킹 상세 열람 모드 (분해·각인·융합 숨김) / subtitle: 헤더 보조 문구 교체
export default function BuriedManage({ char, dust = 0, onUpdate, onClose, readOnly = false, subtitle = null }) {
  const [sheet, setSheet] = useState(null); // { item, slot }
  const [runePick, setRunePick] = useState(null); // ᚱ 각인할 룬 index (1.123.0)
  const [openPanel, setOpenPanel] = useState(null); // 1.148.0 — 'formula' | 'runeword'
  const [fuseSel, setFuseSel] = useState([]);       // 1.149.0 — 융합 재료로 고른 룬 index
  const [fuseMsg, setFuseMsg] = useState(null);     // 융합 결과 메시지
  const [rwOnly, setRwOnly] = useState(false);      // 1.165.0 — ✅ 완성 가능만 보기
  const [rwPick, setRwPick] = useState(null);       // 1.165.0 — 원클릭 각인할 룬워드
  const [rwMsg, setRwMsg] = useState(null);         // 원클릭 각인 결과

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

  // ᚱ 룬 융합 (1.149.0) — 같은 등급 3개 → 상위 1개. 랜덤이므로 updater 밖에서 굴린다
  const doFuse = () => {
    const r = fuseBuriedRunes(char, fuseSel, dust);
    if (r.char !== char) onUpdate(r.char, -r.dustCost);
    setFuseSel([]);
    setFuseMsg({ ok: r.ok, text: r.text });
  };
  // ⟪룬워드⟫ 원클릭 각인 (1.165.0) — 재료가 다 모인 룬워드를 눌러 장비 하나에 한 번에 박는다
  const doRuneword = (rw, slot) => {
    const r = applyBuriedRuneword(char, rw.id, slot);
    if (r.ok) onUpdate(r.char, 0);
    setRwPick(null);
    setRwMsg({ ok: r.ok, text: r.text });
  };

  const toggleFuse = (i) => {
    setFuseMsg(null);
    setFuseSel(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i);
      const rar = getBuriedRune(runes[i])?.rarity;
      // 다른 등급을 고르면 선택을 새로 시작한다 (같은 등급끼리만 융합)
      const same = prev.filter(x => getBuriedRune(runes[x])?.rarity === rar);
      const need = BURIED_RUNE_FUSION[rar]?.need || 3;
      if (!BURIED_RUNE_FUSION[rar]) return prev; // ★5는 더 위가 없다
      return same.length >= need ? [...same.slice(1), i] : [...same, i];
    });
  };

  // 장착 장비 분해 — 슬롯이 비면 그 스킬도 못 쓴다 (신중히)
  // 1.160.0 「순환 패키지」 — 각인된 룬 회수 / 1.167.0 — 등급별 확률(★1 90% ~ ★5 40%)
  const dismantle = (item) => {
    if (readOnly) return;
    const gain = buriedDustValue(item);
    const slot = BURIED_SLOT_IDS.find(s => char.equipped?.[s]?.id === item.id);
    const rec = rollBuriedRuneRecovery(buriedItemRunes(item)); // 1.167.0 — 등급별 확률 회수
    const next = { ...char, equipped: { ...char.equipped, [slot]: null }, runes: [...(char.runes || []), ...rec.kept] };
    next.hp = Math.min(next.hp, buriedDerived(next).maxHp);
    onUpdate(next, gain);
    setSheet(null);
    if (rec.kept.length + rec.lost.length > 0) {
      setRwMsg({ ok: rec.lost.length === 0, text: `ᚱ 룬 회수 ${rec.kept.length}개${rec.lost.length > 0 ? ` · ${rec.lost.length}개는 부서졌다` : ''}` });
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-4 pb-2.5 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div>
          <div className="text-[13px] font-bold" style={{ color: cls?.color || PALETTE.text }}>
            {cls?.name} <span style={{ color: PALETTE.textDim }}>Lv.{char.lv}</span>
            {/* 1.155.0 — 종족·출신 표기 (PM 지시) */}
            {(() => {
              const race = getBuriedRace(char.raceId), origin = getBuriedOrigin(char.originId);
              return (race || origin) ? (
                <span className="text-[11px] font-normal ml-1.5" style={{ color: PALETTE.dawn }}>
                  {race ? `${race.icon} ${race.name}` : ''}{race && origin ? ' · ' : ''}{origin ? `${origin.icon || '🌾'} ${origin.name}` : ''}
                </span>
              ) : null;
            })()}
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: PALETTE.textDim }}>
            {subtitle != null ? subtitle : <>🪙 {char.gold} · {BURIED_DUST_ICON} {dust}</>}
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
            // 1.166.0 — PM 지적: "67% ×2.6"이 곱셈으로 읽혔다 → 확률·피해를 완전히 분리 표시
            { l: '치명 확률', v: `${d.crit}%${d.critOverflowDmg ? ` (상한)` : ''}`, c: PALETTE.legendary },
            { l: '치명 피해', v: `×${(1 + d.critDmg / 100).toFixed(1)}`, c: PALETTE.legendary },
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

        {/* 1.166.0 — 치명 확률 상한 초과분이 치명 피해로 전환됐음을 그 자리에서 알린다 */}
        {d.critOverflowDmg > 0 && (
          <div className="px-2.5 py-1.5 text-[11px] leading-relaxed"
            style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.legendary}12`, border: `1px solid ${PALETTE.legendary}44`, color: PALETTE.textDim }}>
            🎯 치명 확률 원본 <b style={{ color: PALETTE.text }}>{d.critRaw}%</b> → 상한 {d.crit}%.
            초과 {d.critRaw - d.crit}%p는 <b style={{ color: PALETTE.legendary }}>치명 피해 +{d.critOverflowDmg}%</b>로 전환됐다.
          </div>
        )}

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
            {(() => { const L = buriedRunewordProgress(char);
              const ready = L.filter(x => x.craftable && !x.done).length;
              return (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] tabular-nums" style={{ color: PALETTE.dawn }}>
                    총 {L.length}종 · ★ 완성 {L.filter(x => x.done).length} · ✅ 지금 가능 {ready}
                  </span>
                  {/* 1.165.0 — PM 지시: 재료가 다 모인 룬워드만 추려 보기 */}
                  <button onClick={() => setRwOnly(v => !v)} className="ui-press shrink-0 px-2 py-1 text-[11px] font-bold"
                    style={{ borderRadius: 'var(--r-chip, 8px)',
                      background: rwOnly ? `${PALETTE.green}22` : PALETTE.panelLight,
                      border: `1px solid ${rwOnly ? PALETTE.green : PALETTE.panelBorder}`,
                      color: rwOnly ? PALETTE.green : PALETTE.textDim }}>
                    {rwOnly ? `✅ 완성 가능만 (${ready})` : '↕ 전체 보기'}
                  </button>
                </div>
              ); })()}
            {rwMsg && (
              <div className="px-2.5 py-1.5 text-[11px] leading-relaxed"
                style={{ borderRadius: 'var(--r-chip, 8px)',
                  background: rwMsg.ok ? `${PALETTE.legendary}18` : `${PALETTE.accent}18`,
                  border: `1px solid ${rwMsg.ok ? PALETTE.legendary : PALETTE.accent}66`,
                  color: rwMsg.ok ? PALETTE.legendary : PALETTE.accent }}>
                {rwMsg.text}
              </div>
            )}
            {[...buriedRunewordProgress(char)]
              .filter(rw => !rwOnly || (rw.craftable && !rw.done))
              .sort((a, b) => (b.done - a.done) || (b.craftable - a.craftable) || (a.runes.length - b.runes.length))
              .map(rw => {
              // 1.165.0 — 원클릭 각인: 지금 이 룬워드를 받을 수 있는 장비가 하나라도 있는가
              const canApply = !readOnly && rw.craftable && !rw.done
                && BURIED_SLOT_IDS.some(sl => buriedRunewordFitCheck(char, rw, sl).ok);
              return (
              <div key={rw.id} className="py-1.5" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[12px] font-bold" style={{ color: rw.done ? PALETTE.legendary : rw.craftable ? PALETTE.green : PALETTE.text }}>
                    {rw.done ? '★ ' : rw.craftable ? '✅ ' : ''}⟪{rw.name}⟫
                  </span>
                  {canApply ? (
                    <button onClick={() => { setRwMsg(null); setRwPick(rw); }}
                      className="ui-press shrink-0 px-2.5 py-1 text-[11px] font-bold"
                      style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.green}22`, border: `1px solid ${PALETTE.green}88`, color: PALETTE.green }}>
                      ⚡ 한 번에 각인
                    </button>
                  ) : (
                    <span className="text-[11px] shrink-0" style={{ color: PALETTE.textDim }}>룬 {rw.runes.length}칸</span>
                  )}
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.dawn }}>{rw.desc}</div>
                <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>
                  {rw.runes.map((r, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ color: PALETTE.panelBorder }}> → </span>}
                      <span style={{ color: BURIED_RUNE_RARITIES[r?.rarity]?.color || PALETTE.text }}>{r?.name || '?'}</span>
                    </span>
                  ))}
                  {rw.missing.length > 0 && <span style={{ color: PALETTE.accent }}> · 부족: {rw.missing.join(', ')}</span>}
                  {rw.craftable && !rw.done && !canApply && <span style={{ color: PALETTE.accent }}> · 받을 장비 없음 (소켓 {rw.runes.length}칸 빈 장비 필요)</span>}
                </div>
              </div>
            );})}
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

        {/* 주 사용 스킬 (1.155.0) — 전투에서 실제로 쓴 스킬 집계. 랭킹 열람 시 공략 정보가 된다 */}
        {char.skillUsage && Object.keys(char.skillUsage).length > 0 && (
          <div className="px-3 py-2.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
            <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>주 사용 스킬</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(char.skillUsage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => (
                <span key={id} className="px-2 py-0.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.dawn}44`, color: PALETTE.text }}>
                  {BURIED_SKILLS[id]?.name || id} <b className="tabular-nums" style={{ color: PALETTE.dawn }}>{char.skillUsagePct ? `${n}%` : `${n}회`}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 6슬롯 */}
        <div>
          <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>
            장착 — 슬롯 6칸이 곧 전투 스킬 6개. 교체는 새 장비를 주웠을 때만 (인벤토리 없음)
          </div>
          <div className="space-y-1.5">
            {BURIED_SLOTS.map(s => {
              const item = char.equipped?.[s.id] || null;
              const lv = item ? buriedSkillLv(char, item.skillId) : 1;
              const q = item ? (item.quality || 'B') : null; // 1.164.0 — 🎖 장비 품질 (구 세이브 = B)
              return (
                <BuriedItemCard key={s.id} item={item} slotId={s.id} char={char}
                  right={item ? (
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold tabular-nums" style={{ color: lv >= BURIED_SKILL_MAX_LV ? PALETTE.legendary : PALETTE.text }}>
                        Lv.{lv}
                      </div>
                      <div className="text-[11px]" style={{ color: BURIED_QUALITY_COLORS[q] }}>품질 {q}</div>
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

        {/* ᚱ 룬 주머니 (1.123.0) — 각인은 영구, 1.167.0~ 분해 시 등급별 확률 회수 */}
        {!readOnly && runes.length > 0 && (
          <div className="px-3 py-2.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.legendary}44` }}>
            <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.legendary }}>
              ᚱ 룬 주머니 {runes.length}개 — 등급순 정리 · 각인은 영구 · 분해 시 등급별 확률 회수
            </div>
            {/* 1.165.0 PM 지시 — 등급 내림차순 + 같은 룬은 한 줄에 ×개수로 묶는다 */}
            <div className="space-y-1.5">
              {buriedRunePouchGroups(char).map(g => {
                const r = g.rune;
                const rar = BURIED_RUNE_RARITIES[r.rarity];
                const selN = g.idxs.filter(i => fuseSel.includes(i)).length;
                // 융합 버튼: 이 묶음에서 아직 안 고른 것 하나를 넣거나, 마지막으로 고른 것을 뺀다
                const nextIdx = g.idxs.find(i => !fuseSel.includes(i));
                const lastSel = [...g.idxs].reverse().find(i => fuseSel.includes(i));
                return (
                  <div key={g.id} className="flex items-center gap-2 px-2.5 py-2"
                    style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${rar.color}55` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: rar.color }}>
                        ᚱ {r.name} <span className="font-normal">{rar.stars}</span>
                        {g.count > 1 && <span className="tabular-nums ml-1" style={{ color: PALETTE.text }}>×{g.count}</span>}
                      </div>
                      <div className="text-[11px] break-keep" style={{ color: PALETTE.textDim }}>{r.desc}</div>
                    </div>
                    <button onClick={() => setRunePick(g.idxs[0])} className="ui-press shrink-0 px-2.5 py-1.5 text-[11px] font-bold"
                      style={{ borderRadius: 'var(--r-chip, 8px)', background: `${rar.color}22`, border: `1px solid ${rar.color}66`, color: rar.color }}>
                      각인
                    </button>
                    {/* 1.149.0 — 융합 재료 선택 (★5는 더 위가 없어 제외) */}
                    {BURIED_RUNE_FUSION[r.rarity] && (
                      <button onClick={() => toggleFuse(selN > 0 && nextIdx == null ? lastSel : (nextIdx ?? lastSel))}
                        className="ui-press shrink-0 px-2 py-1.5 text-[11px] font-bold tabular-nums"
                        style={{ borderRadius: 'var(--r-chip, 8px)',
                          background: selN > 0 ? PALETTE.legendary : 'transparent',
                          border: `1px solid ${PALETTE.legendary}66`,
                          color: selN > 0 ? '#1a0f14' : PALETTE.legendary }}>
                        {selN > 0 ? `✓ 재료 ${selN}` : '융합'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ᚱ 융합 패널 (1.149.0) — 같은 등급 3개 → 상위 1개. 실패해도 1개만 잃는다 */}
            {(() => {
              const selRar = fuseSel.length > 0 ? getBuriedRune(runes[fuseSel[0]])?.rarity : null;
              const info = selRar ? buriedFusionInfo(char, selRar, dust) : null;
              return (
                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
                  <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
                    ᚱ <b style={{ color: PALETTE.legendary }}>융합</b> — 같은 등급 3개로 한 등급 위의 룬 1개를 노린다.
                    성공 시 재료 3개 소모 · <b style={{ color: PALETTE.accent }}>실패해도 1개만 소실</b> (2개는 남는다).
                    ★★★★★ 전승급은 <b style={{ color: '#ff6b35' }}>드랍되지 않는다 — 융합이 유일한 길</b>.
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[1, 2, 3, 4].map(r => {
                      const f = BURIED_RUNE_FUSION[r];
                      const st = BURIED_RUNE_RARITIES[r];
                      return (
                        <span key={r} className="px-1.5 py-0.5 text-[11px] tabular-nums"
                          style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${st.color}44`, color: PALETTE.textDim }}>
                          <span style={{ color: st.color }}>{st.stars}</span>×{f.need} → {f.rate}%{f.dust ? ` · ${BURIED_DUST_ICON}${f.dust}` : ''}
                        </span>
                      );
                    })}
                  </div>
                  {info && (
                    <button onClick={doFuse} disabled={fuseSel.length !== info.need || !info.enoughDust}
                      className="ui-press w-full mt-1.5 py-2 text-[12px] font-bold"
                      style={{ borderRadius: 'var(--r-btn, 13px)',
                        background: fuseSel.length === info.need && info.enoughDust ? `${PALETTE.legendary}22` : PALETTE.panel,
                        border: `1px solid ${PALETTE.legendary}66`, color: PALETTE.legendary,
                        opacity: fuseSel.length === info.need && info.enoughDust ? 1 : 0.45 }}>
                      {fuseSel.length !== info.need
                        ? `${BURIED_RUNE_RARITIES[selRar].stars} 재료 ${fuseSel.length}/${info.need} 선택`
                        : !info.enoughDust ? `${BURIED_DUST_ICON} 먼지 부족 (${info.dust} 필요)`
                        : `융합 실행 — 성공률 ${info.rate}%${info.dust ? ` · ${BURIED_DUST_ICON}${info.dust}` : ''} → ${BURIED_RUNE_RARITIES[info.to].stars}`}
                    </button>
                  )}
                  {fuseMsg && (
                    <div className="mt-1.5 px-2.5 py-1.5 text-[11px] leading-relaxed"
                      style={{ borderRadius: 'var(--r-chip, 8px)',
                        background: fuseMsg.ok ? `${PALETTE.legendary}18` : `${PALETTE.accent}18`,
                        border: `1px solid ${fuseMsg.ok ? PALETTE.legendary : PALETTE.accent}66`,
                        color: fuseMsg.ok ? PALETTE.legendary : PALETTE.accent }}>
                      {fuseMsg.text}
                    </div>
                  )}
                </div>
              );
            })()}
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
          onDismantle={readOnly ? null : () => dismantle(sheet.item)}
          onClose={() => setSheet(null)}
        />
      )}

      {/* ᚱ 각인 대상 선택 (1.123.0) — 소켓이 빈 장착 장비만 */}
      {/* ⟪룬워드⟫ 원클릭 각인 — 받을 장비 고르기 (1.165.0) */}
      {rwPick && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.72)' }} onClick={() => setRwPick(null)}>
          <div className="w-full px-3 pb-4 pt-3" onClick={(e) => e.stopPropagation()}
            style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${PALETTE.legendary}66`, borderRadius: '18px 18px 0 0', maxHeight: '80%', overflowY: 'auto' }}>
            <div className="text-[13px] font-bold mb-0.5" style={{ color: PALETTE.legendary }}>
              ⟪{rwPick.name}⟫ — 어느 장비에 한 번에 각인할까
            </div>
            <div className="text-[11px] mb-2 leading-relaxed" style={{ color: PALETTE.textDim }}>
              {rwPick.runes.map((r, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: PALETTE.panelBorder }}> → </span>}
                  <span style={{ color: BURIED_RUNE_RARITIES[r?.rarity]?.color }}>{r?.name}</span>
                </span>
              ))}
              <br />순서대로 자동 각인된다. <b style={{ color: PALETTE.accent }}>각인은 영구</b> — 되돌릴 수 없다.
            </div>
            <div className="space-y-1.5">
              {BURIED_SLOTS.map(sl => {
                const item = char.equipped?.[sl.id];
                if (!item) return null;
                const fit = buriedRunewordFitCheck(char, rwPick, sl.id);
                return (
                  <div key={sl.id} style={{ opacity: fit.ok ? 1 : 0.5 }}>
                    <BuriedItemCard item={item} slotId={sl.id} char={char}
                      onClick={fit.ok ? () => doRuneword(rwPick, sl.id) : undefined}
                      right={
                        <span className="text-[11px] shrink-0 text-right" style={{ color: fit.ok ? PALETTE.green : PALETTE.accent }}>
                          {fit.ok ? `⚡ ${fit.reason}` : fit.reason}
                        </span>
                      } />
                  </div>
                );
              })}
            </div>
            <button onClick={() => setRwPick(null)} className="ui-press w-full py-2.5 mt-2 text-[12px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
              취소
            </button>
          </div>
        </div>
      )}

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
                {r.desc}. <b style={{ color: PALETTE.accent }}>각인은 영구</b> — 장착 중엔 떼어낼 수 없다. 그 장비를 분해하면 <b style={{ color: PALETTE.text }}>{BURIED_RUNE_RECOVERY[r.rarity]}% 확률</b>로만 회수된다 (실패 시 소멸).
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
