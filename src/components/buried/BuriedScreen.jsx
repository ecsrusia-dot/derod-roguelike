// ============================================
// components/buried/BuriedScreen.jsx — 무덤의 유산 로비 (1.104.0)
// ============================================
// 던전 선택 / 캐릭터 생성(전직 포함) / 탐험 계속 / 재련소·계약·연구실 / 기록.
// 1.117.0 — 장비 계승 폐지: 죽으면 장비는 전부 먼지로 정산되고, 골드 30%만 넘어간다.

import React, { useState } from 'react';
import { ChevronLeft, Skull, BarChart3, Lock } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_CLASSES, BURIED_ADVANCED_CLASSES, BURIED_ENCOUNTER_CLASSES, BURIED_DUNGEONS,
  BURIED_LEGACY_GOLD_PCT, BURIED_SKILL_MAX_LV,
  BURIED_SLOTS, BURIED_FORGE,
  buriedForgeLevel,
  BURIED_CONTRACTS, BURIED_CONTRACT_COST, BURIED_CONTRACT_CARRY, getBuriedContract, rollBuriedContract,
  buriedDerived, buriedExpToNext, getBuriedClass, getBuriedDungeon, buriedDeathSettlement,
  buriedTraitIds, getBuriedTrait, buriedMonsterLevel,
  BURIED_PARTS, BURIED_PART_SLOT_COSTS, getBuriedPart, BURIED_SHARD,
  resolveBuriedLoot, buriedCheckpointFloors,
  BURIED_DEPTH_CLASSES, buriedEarnedDepthTraits,
} from '../../data.js';
import { BuriedItemCard, BuriedBar, BURIED_DUST_ICON, BuriedTierLegend, BuriedLootModal } from './BuriedCommon.jsx';
import BuriedManage from './BuriedManage.jsx';

export default function BuriedScreen({ meta, onStartChar, onContinue, onUpdateChar, onRetire, onForge, onBuyContract, onBuyPart, onDetachParts, forgeNotice, onBack }) {
  const b = meta?.buried || {};
  const char = b.char || null;
  const clears = (b.clears && typeof b.clears === 'object') ? b.clears : {};
  const unlockedDungeons = b.unlockedDungeons || ['labyrinth'];
  const unlockedClasses = b.unlockedClasses || [];

  const [pickClass, setPickClass] = useState(BURIED_CLASSES[0].id);
  const [pickDungeon, setPickDungeon] = useState(unlockedDungeons[unlockedDungeons.length - 1] || 'labyrinth');
  const [pickStart, setPickStart] = useState(1); // 1.114.0 — 체크포인트 시작 층
  const [manage, setManage] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [forgeSlot, setForgeSlot] = useState('weapon');
  const [carryPicks, setCarryPicks] = useState([]); // 출정 지참 계약 (최대 2)
  const ownedContracts = b.contracts || [];
  const toggleCarry = (id) => setCarryPicks(p =>
    p.includes(id) ? p.filter(x => x !== id) : (p.length < BURIED_CONTRACT_CARRY ? [...p, id] : p));

  const cls = char ? getBuriedClass(char.classId) : null;
  const d = char ? buriedDerived(char) : null;
  const curDungeon = char ? getBuriedDungeon(char.dungeonId) : null;

  // 선택 가능한 직업 = 기본 5직업 + 해금된 상위 직업 + 해금된 조우 직업 (1.109.0)
  const selectable = [
    ...BURIED_CLASSES,
    ...BURIED_ADVANCED_CLASSES.filter(c => unlockedClasses.includes(c.id)),
    ...BURIED_ENCOUNTER_CLASSES.filter(c => unlockedClasses.includes(c.id)),
    ...BURIED_DEPTH_CLASSES.filter(c => unlockedClasses.includes(c.id)), // 1.116.0 — 심층 직업
  ];
  const earnedDepthTraits = buriedEarnedDepthTraits(b.deepestByDungeon);
  const killsByEnemy = b.killsByEnemy || {};
  const isDungeonUnlocked = (dg) => unlockedDungeons.includes(dg.id);

  return (
    <div className="absolute inset-0 flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><ChevronLeft size={20} /></button>
        <div className="text-center">
          <div className="text-[12px] tracking-[0.35em] font-bold" style={{ color: PALETTE.legendary }}>⚰ 무덤의 유산 ⚰</div>
          <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>남기는 것은 장비뿐이다</div>
        </div>
        <div className="text-[11px] tabular-nums font-bold text-right" style={{ color: PALETTE.dawn }}>
          {BURIED_DUST_ICON} {b.dust || 0}
          <div style={{ color: '#c48bd4' }}>{BURIED_SHARD.icon} {b.shards || 0}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ===== 진행 중 캐릭터 ===== */}
        {char ? (
          <div className="ui-stagger">
            <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>탐험 중</div>
            <div className="px-3 py-3" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${cls?.color || PALETTE.panelBorder}66` }}>
              <div className="flex gap-3">
                <div className="w-16 h-16 shrink-0 overflow-hidden" style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${cls?.color}55` }}>
                  <img src={cls?.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold" style={{ color: cls?.color }}>
                    {cls?.name} <span style={{ color: PALETTE.text }}>Lv.{char.lv}</span>
                    {cls?.advanced && <span className="text-[11px] ml-1" style={{ color: PALETTE.legendary }}>전직</span>}
                  </div>
                  <div className="text-[11px] tabular-nums mb-1.5" style={{ color: PALETTE.textDim }}>
                    {curDungeon?.name} {char.floor}층 · 마물 Lv.{buriedMonsterLevel(char)} · 🪙 {char.gold}
                  </div>
                  <BuriedBar value={char.hp} max={d.maxHp} color={PALETTE.accent} label="HP" />
                </div>
              </div>
              <div className="mt-2">
                <BuriedBar value={char.exp} max={buriedExpToNext(char.lv)} color={PALETTE.twilight} label="EXP" height={5} />
              </div>
              {(char.pendingLoot || []).length > 0 && (
                <div className="mt-2 px-2.5 py-1.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.legendary}1a`, border: `1px solid ${PALETTE.legendary}55`, color: PALETTE.legendary }}>
                  판단 대기 장비 {(char.pendingLoot || []).length}개 — [교체/버리기]를 결정하라.
                </div>
              )}
              <div className="flex gap-2 mt-2.5">
                <button onClick={onContinue} className="ui-press ui-sheen flex-1 py-2.5 text-[12px] font-bold"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>
                  {char.floor}층으로 내려간다
                </button>
                <button onClick={() => setManage(true)} className="ui-press px-4 py-2.5 text-[12px]"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                  장비
                </button>
              </div>
              <button onClick={() => setConfirmRetire(true)} className="ui-press w-full mt-1.5 py-2 text-[11px]"
                style={{ color: PALETTE.textDim }}>
                은퇴 — 장비를 먼지로 정산하고 이 캐릭터를 묻는다
              </button>
            </div>
          </div>
        ) : (
          /* ===== 새 캐릭터 ===== */
          <div className="ui-stagger space-y-3">
            {/* 던전 선택 */}
            <div>
              <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
                던전 선택 — 깊을수록 마물이 빨리 자란다
              </div>
              <div className="space-y-1.5">
                {BURIED_DUNGEONS.map(dg => {
                  const open = isDungeonUnlocked(dg);
                  const on = pickDungeon === dg.id;
                  const cleared = clears[dg.id] || 0;
                  return (
                    <button key={dg.id} disabled={!open} onClick={() => { setPickDungeon(dg.id); setPickStart(1); }}
                      className="ui-press w-full flex items-start gap-2.5 px-3 py-2.5 text-left"
                      style={{
                        borderRadius: 'var(--r-btn, 13px)',
                        background: on ? PALETTE.panelLight : PALETTE.panel,
                        border: `1px solid ${on ? dg.color : PALETTE.panelBorder}`,
                        opacity: open ? 1 : 0.45,
                      }}>
                      <span className="text-[15px] mt-0.5">{open ? '⚰' : <Lock size={13} />}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold" style={{ color: dg.color }}>
                          {dg.name}
                          {cleared > 0 && <span className="text-[11px] ml-1.5" style={{ color: PALETTE.legendary }}>정복 {cleared}</span>}
                          {(b.deepestByDungeon?.[dg.id] || 0) > 0 && <span className="text-[11px] ml-1.5" style={{ color: PALETTE.dawn }}>최고 {b.deepestByDungeon[dg.id]}층</span>}
                        </div>
                        <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                          층 무한 (정복 {dg.floors}층) · {dg.stepsPerLevel}걸음마다 마물 Lv.+1 · 시작 마물 Lv.{dg.baseLevel + 1}
                        </div>
                        {dg.gimmick && (
                          <div className="text-[11px] mt-0.5" style={{ color: dg.color }}>
                            {dg.gimmick.icon} <b>{dg.gimmick.name}</b> — {dg.gimmick.desc}
                          </div>
                        )}
                        <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                          골드 ×{dg.goldMult} · 경험치 ×{dg.expMult} · 방 효과 {dg.roomEffectChance}%
                        </div>
                        {!open && (
                          <div className="text-[11px] mt-0.5" style={{ color: PALETTE.accent }}>
                            🔒 {getBuriedDungeon(dg.unlock)?.name} 정복(구 최종층 보스) 시 해금
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 체크포인트 시작 층 (1.114.0) — 던전별 최고 도달 층 기준 100층 단위 */}
            {(() => {
              const cps = buriedCheckpointFloors(b.deepestByDungeon?.[pickDungeon] || 0);
              if (cps.length === 0) return null;
              return (
                <div>
                  <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
                    시작 층 — 100층 단위 재출발 (최고 {b.deepestByDungeon?.[pickDungeon] || 0}층 도달 기록)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, ...cps].map(f => (
                      <button key={f} onClick={() => setPickStart(f)} className="ui-press px-3 py-1.5 text-[12px] font-bold"
                        style={{
                          borderRadius: 'var(--r-chip, 8px)',
                          border: `1px solid ${pickStart === f ? PALETTE.dawn : PALETTE.panelBorder}`,
                          background: pickStart === f ? PALETTE.panelLight : 'transparent',
                          color: pickStart === f ? PALETTE.dawn : PALETTE.textDim,
                        }}>{f}층</button>
                    ))}
                  </div>
                  {pickStart > 1 && (
                    <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>
                      그 층 마물 레벨에 맞춘 <b style={{ color: PALETTE.text }}>낡은 장비 6종</b>으로 시작한다 — 빠르게 더 좋은 장비를 주워야 산다.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 직업 선택 */}
            <div>
              <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
                직업 선택 — 특성 3개와 장비 계열이 결정된다
              </div>
              <div className="space-y-1.5">
                {selectable.map(c => {
                  const on = pickClass === c.id;
                  return (
                    <button key={c.id} onClick={() => setPickClass(c.id)} className="ui-press w-full flex gap-2.5 px-2.5 py-2.5 text-left"
                      style={{
                        borderRadius: 'var(--r-btn, 13px)',
                        background: on ? PALETTE.panelLight : PALETTE.panel,
                        border: `1px solid ${on ? c.color : PALETTE.panelBorder}`,
                      }}>
                      <div className="w-12 h-12 shrink-0 overflow-hidden" style={{ borderRadius: 'var(--r-chip, 8px)' }}>
                        <img src={c.image} alt="" className="w-full h-full object-cover" style={{ filter: on ? 'none' : 'grayscale(60%)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold" style={{ color: c.color }}>
                          {c.name}
                          {c.advanced && <span className="text-[11px] ml-1.5 px-1.5 py-0.5" style={{ borderRadius: 4, background: `${PALETTE.legendary}22`, color: PALETTE.legendary }}>전직</span>}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{c.desc}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: PALETTE.dawn }}>
                          {c.traits.map(id => getBuriedTrait(id)?.name).filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* 잠긴 전직 안내 */}
              {BURIED_ADVANCED_CLASSES.filter(c => !unlockedClasses.includes(c.id)).length > 0 && (
                <div className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed"
                  style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
                  🔒 <b style={{ color: PALETTE.text }}>전직</b> — 해당 직업으로 잊혀진 미궁을 클리어하면 상위 직업이 열린다.
                  아직 잠긴 전직: {BURIED_ADVANCED_CLASSES.filter(c => !unlockedClasses.includes(c.id)).map(c => c.name).join(', ')}
                </div>
              )}
              {/* 심층 직업 안내 (1.116.0) */}
              {BURIED_DEPTH_CLASSES.filter(c => !unlockedClasses.includes(c.id)).length > 0 && (
                <div className="mt-1.5 px-3 py-2 space-y-1 text-[11px] leading-relaxed"
                  style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                  <div style={{ color: PALETTE.text }}>🔒 <b>심층 해금</b> — 각 던전 100층 이상의 보스를 잡으면 그 던전의 직업이 열린다.</div>
                  {BURIED_DEPTH_CLASSES.filter(c => !unlockedClasses.includes(c.id)).map(c => (
                    <div key={c.id} style={{ color: PALETTE.textDim }}>
                      <span style={{ color: c.color }}>{c.name}</span> — {c.unlock.label}
                      <span className="tabular-nums" style={{ color: PALETTE.textDim }}> (최고 {b.deepestByDungeon?.[c.unlock.dungeonId] || 0}층)</span>
                    </div>
                  ))}
                </div>
              )}
              {/* 조우 해금 직업 진행도 (1.109.0) */}
              {BURIED_ENCOUNTER_CLASSES.filter(c => !unlockedClasses.includes(c.id)).length > 0 && (
                <div className="mt-1.5 px-3 py-2 space-y-1 text-[11px] leading-relaxed"
                  style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                  <div style={{ color: PALETTE.text }}>🔒 <b>조우 해금</b> — 특정 마물을 거듭 쓰러뜨리면 새 직업이 열린다.</div>
                  {BURIED_ENCOUNTER_CLASSES.filter(c => !unlockedClasses.includes(c.id)).map(c => (
                    <div key={c.id} style={{ color: PALETTE.textDim }}>
                      <span style={{ color: c.color }}>{c.name}</span> — {c.unlock.label}
                      <span className="tabular-nums" style={{ color: (killsByEnemy[c.unlock.enemyKey] || 0) > 0 ? PALETTE.legendary : PALETTE.textDim }}>
                        {' '}({Math.min(killsByEnemy[c.unlock.enemyKey] || 0, c.unlock.kills)}/{c.unlock.kills})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 선택한 직업의 특성 3개 */}
            {(() => {
              const c = getBuriedClass(pickClass);
              if (!c) return null;
              return (
                <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panelLight, border: `1px solid ${c.color}44` }}>
                  <div className="text-[11px] tracking-[0.2em]" style={{ color: c.color }}>영구 특성 3개 (★ = 직업 전용)</div>
                  {c.traits.map((id, i) => {
                    const t = getBuriedTrait(id);
                    if (!t) return null;
                    return (
                      <div key={id} className="text-[12px] leading-relaxed">
                        <span className="font-bold" style={{ color: i === 0 ? c.color : PALETTE.text }}>{i === 0 ? '★' : '◆'} {t.name}</span>
                        <span style={{ color: PALETTE.textDim }}> — {t.desc}</span>
                      </div>
                    );
                  })}
                  {/* 심층 특성 (1.116.0) — 150층 해금분, 모든 캐릭터에 자동 적용 */}
                  {earnedDepthTraits.length > 0 && (
                    <div className="pt-1 space-y-1" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
                      <div className="text-[11px] tracking-[0.2em]" style={{ color: '#c48bd4' }}>+ 심층 특성 (150층 기록 — 전 직업 자동 적용)</div>
                      {earnedDepthTraits.map(id => {
                        const t = getBuriedTrait(id);
                        return t ? (
                          <div key={id} className="text-[12px] leading-relaxed">
                            <span className="font-bold" style={{ color: '#c48bd4' }}>✦ {t.name}</span>
                            <span style={{ color: PALETTE.textDim }}> — {t.desc}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="text-[11px] pt-1" style={{ color: PALETTE.textDim, borderTop: `1px solid ${PALETTE.panelBorder}` }}>
                    장비 계열 — 무기 {c.lines.weapon} / 보조 {c.lines.offhand}
                  </div>
                </div>
              );
            })()}

            {/* 마의 계약 지참 (1.111.0) — 보유 중 최대 2개 */}
            {ownedContracts.length > 0 && (
              <div>
                <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
                  마의 계약 지참 — {carryPicks.length}/{BURIED_CONTRACT_CARRY}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ownedContracts.map(id => {
                    const c = getBuriedContract(id);
                    if (!c) return null;
                    const on = carryPicks.includes(id);
                    return (
                      <button key={id} onClick={() => toggleCarry(id)} className="ui-press px-2 py-1.5 text-[11px] text-left"
                        title={c.desc}
                        style={{
                          borderRadius: 'var(--r-chip, 8px)',
                          background: on ? PALETTE.panelLight : PALETTE.panel,
                          border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`,
                          color: on ? PALETTE.legendary : PALETTE.textDim,
                        }}>
                        {on ? '✓ ' : ''}{c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => onStartChar(pickClass, pickDungeon, carryPicks, pickStart)} className="ui-press ui-sheen w-full py-3 text-[13px] font-bold"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>
              {getBuriedDungeon(pickDungeon).name}(으)로 내려간다{(b.legacyGold || 0) > 0 ? ` — 🪙 ${b.legacyGold} 계승` : ''}{carryPicks.length > 0 ? ` · 계약 ${carryPicks.length}` : ''}
            </button>
          </div>
        )}

        {/* ===== 무덤 재련소 (1.105.0) — 먼지 소비처 ===== */}
        <div>
          <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
            {BURIED_DUST_ICON} 무덤 재련소 — 보유 먼지 {b.dust || 0}
          </div>
          <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
            <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              장비를 분해해 모은 먼지로 새 장비를 벼린다. 제작 레벨은 <b style={{ color: PALETTE.text }}>역대 최고 도달 층({buriedForgeLevel(b.deepest)})</b> 기반 —
              죽어도 남는 진행도다. {char ? '완성품은 즉시 [교체/버리기]로 판단한다.' : '탐험 중인 캐릭터가 있어야 벼릴 수 있다.'}
            </div>
            <div className="flex flex-wrap gap-1">
              {BURIED_SLOTS.map(sl => (
                <button key={sl.id} onClick={() => setForgeSlot(sl.id)} className="ui-press px-2 py-1 text-[11px]"
                  style={{
                    borderRadius: 'var(--r-chip, 8px)',
                    border: `1px solid ${forgeSlot === sl.id ? PALETTE.dawn : PALETTE.panelBorder}`,
                    color: forgeSlot === sl.id ? PALETTE.dawn : PALETTE.textDim,
                    background: forgeSlot === sl.id ? PALETTE.panelLight : 'transparent',
                  }}>{sl.icon} {sl.name}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => onForge(forgeSlot, false, char ? char.classId : pickClass)}
                disabled={(b.dust || 0) < BURIED_FORGE.randomCost}
                className="ui-press flex-1 py-2 text-[12px] font-bold"
                style={{
                  borderRadius: 'var(--r-btn, 13px)',
                  background: (b.dust || 0) >= BURIED_FORGE.randomCost ? PALETTE.panelLight : PALETTE.panel,
                  border: `1px solid ${PALETTE.dawn}55`,
                  color: (b.dust || 0) >= BURIED_FORGE.randomCost ? PALETTE.dawn : PALETTE.textDim,
                  opacity: (b.dust || 0) >= BURIED_FORGE.randomCost ? 1 : 0.5,
                }}>
                랜덤 제작 {BURIED_DUST_ICON}{BURIED_FORGE.randomCost}
              </button>
              <button onClick={() => onForge(forgeSlot, true, char ? char.classId : pickClass)}
                disabled={(b.dust || 0) < BURIED_FORGE.epicCost}
                className="ui-press flex-1 py-2 text-[12px] font-bold"
                style={{
                  borderRadius: 'var(--r-btn, 13px)',
                  background: (b.dust || 0) >= BURIED_FORGE.epicCost ? PALETTE.panelLight : PALETTE.panel,
                  border: `1px solid ${PALETTE.legendary}66`,
                  color: (b.dust || 0) >= BURIED_FORGE.epicCost ? PALETTE.legendary : PALETTE.textDim,
                  opacity: (b.dust || 0) >= BURIED_FORGE.epicCost ? 1 : 0.5,
                }}>
                영웅급 확정 {BURIED_DUST_ICON}{BURIED_FORGE.epicCost}
              </button>
            </div>
            {forgeNotice && (
              <div className="px-2.5 py-1.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.dawn}15`, border: `1px solid ${PALETTE.dawn}55`, color: PALETTE.dawn }}>
                {forgeNotice}
              </div>
            )}
          </div>
        </div>

        {/* ===== 마의 계약 상점 (1.111.0) ===== */}
        <div>
          <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
            📜 마의 계약 — 보유 {ownedContracts.length} / {BURIED_CONTRACTS.length}
          </div>
          <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
            <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              출정 시 <b style={{ color: PALETTE.text }}>최대 {BURIED_CONTRACT_CARRY}개</b>를 지참하는 영구 패시브.
              먼지로 미보유 계약 중 하나를 무작위로 얻는다.
            </div>
            <button onClick={onBuyContract}
              disabled={(b.dust || 0) < BURIED_CONTRACT_COST || ownedContracts.length >= BURIED_CONTRACTS.length}
              className="ui-press w-full py-2 text-[12px] font-bold"
              style={{
                borderRadius: 'var(--r-btn, 13px)',
                background: (b.dust || 0) >= BURIED_CONTRACT_COST && ownedContracts.length < BURIED_CONTRACTS.length ? PALETTE.panelLight : PALETTE.panel,
                border: `1px solid ${PALETTE.twilight}66`,
                color: (b.dust || 0) >= BURIED_CONTRACT_COST && ownedContracts.length < BURIED_CONTRACTS.length ? PALETTE.twilight : PALETTE.textDim,
                opacity: (b.dust || 0) >= BURIED_CONTRACT_COST && ownedContracts.length < BURIED_CONTRACTS.length ? 1 : 0.5,
              }}>
              {ownedContracts.length >= BURIED_CONTRACTS.length ? '모든 계약 수집 완료' : `랜덤 계약 체결 — ${BURIED_DUST_ICON}${BURIED_CONTRACT_COST}`}
            </button>
            {ownedContracts.length > 0 && (
              <div className="space-y-0.5">
                {ownedContracts.map(id => {
                  const c = getBuriedContract(id);
                  return c ? (
                    <div key={id} className="text-[11px]" style={{ color: PALETTE.textDim }}>
                      <span style={{ color: PALETTE.twilight }}>{c.name}</span> — {c.desc}
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== 연구실 (1.112.0) — ☠ 죽음의 조각 소비처 ===== */}
        <div>
          <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: '#c48bd4' }}>
            ⚗ 연구실 — {BURIED_SHARD.icon} {BURIED_SHARD.name} {b.shards || 0}
          </div>
          <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: '1px solid #7b3fa055' }}>
            <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              보스와 🌑재앙이 떨어뜨리는 {BURIED_SHARD.icon}조각으로 시체에 부품을 심는다.
              최대 <b style={{ color: PALETTE.text }}>5칸</b> — 칸이 늘수록 비쌈 ({BURIED_PART_SLOT_COSTS.map(c => c === 0 ? '무료' : c).join('→')}).
              효과는 <b style={{ color: '#c48bd4' }}>다음 캐릭터 생성부터</b> 적용된다. 탈착은 전체 일괄({BURIED_DUST_ICON}50, 부품 소멸)만 가능.
            </div>
            {(b.parts || []).length > 0 && (
              <div className="space-y-0.5">
                {(b.parts || []).map(id => {
                  const p = getBuriedPart(id);
                  return p ? (
                    <div key={id} className="text-[11px]" style={{ color: PALETTE.textDim }}>
                      <span style={{ color: '#c48bd4' }}>{p.name}</span> — {p.desc}
                    </div>
                  ) : null;
                })}
              </div>
            )}
            {(b.parts || []).length < 5 && (() => {
              const nextCost = BURIED_PART_SLOT_COSTS[(b.parts || []).length];
              // 1.115.0 — 던전 전용 부품: 해당 던전 100층 도달 시 해금
              const isLocked = (p) => p.dungeon && (b.deepestByDungeon?.[p.dungeon] || 0) < (p.needDeep || 100);
              const avail = BURIED_PARTS.filter(p => !(b.parts || []).includes(p.id));
              return (
                <div className="space-y-1">
                  <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                    다음 칸 비용 — <b style={{ color: (b.shards || 0) >= nextCost ? '#c48bd4' : PALETTE.textDim }}>{BURIED_SHARD.icon}{nextCost === 0 ? ' 무료' : nextCost}</b>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {avail.map(p => {
                      const locked = isLocked(p);
                      const ok = !locked && (b.shards || 0) >= nextCost;
                      const dgName = p.dungeon ? getBuriedDungeon(p.dungeon)?.name : null;
                      return (
                        <button key={p.id} onClick={() => ok && onBuyPart(p.id)} disabled={!ok}
                          className="ui-press px-2 py-1.5 text-left text-[11px]"
                          style={{
                            borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${ok ? '#7b3fa0' : PALETTE.panelBorder}`,
                            background: ok ? PALETTE.panelLight : 'transparent',
                            color: ok ? PALETTE.text : PALETTE.textDim, opacity: ok ? 1 : 0.5,
                          }}>
                          <div style={{ color: ok ? '#c48bd4' : PALETTE.textDim }}>
                            {dgName && '★ '}{p.name}
                          </div>
                          <div>{p.desc}</div>
                          {locked && <div style={{ color: PALETTE.accent }}>🔒 {dgName} 100층 도달 시</div>}
                          {dgName && !locked && <div style={{ color: '#c48bd4' }}>{dgName} 전용</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {(b.parts || []).length > 0 && (
              <button onClick={onDetachParts} disabled={(b.dust || 0) < 50}
                className="ui-press w-full py-2 text-[11px]"
                style={{
                  borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
                  border: `1px solid ${PALETTE.panelBorder}`, color: (b.dust || 0) >= 50 ? PALETTE.textDim : PALETTE.textDim,
                  opacity: (b.dust || 0) >= 50 ? 1 : 0.5,
                }}>
                전체 일괄 탈착 — {BURIED_DUST_ICON}50 (부품은 소멸, 칸 비용은 처음부터)
              </button>
            )}
          </div>
        </div>

        {/* ===== 계승 골드 (1.117.0 — 장비 계승 폐지, 사망 시 전 장비 먼지 정산) ===== */}
        {(b.legacyGold || 0) > 0 && (
          <div className="px-3 py-2 text-[11px] leading-relaxed"
            style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
            🪙 계승 대기 골드 <b style={{ color: PALETTE.legendary }}>{b.legacyGold}</b> — 다음 캐릭터가 시작할 때 자동으로 물려받는다.
          </div>
        )}

        {/* ===== 기록 ===== */}
        <div>
          <div className="text-[11px] tracking-[0.25em] mb-1.5 flex items-center gap-1.5" style={{ color: PALETTE.dawn }}>
            <BarChart3 size={12} /> 기록
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { l: '최고 층', v: b.deepest || 0, c: PALETTE.legendary },
              { l: '클리어', v: Object.values(clears).reduce((s, n) => s + n, 0), c: PALETTE.green },
              { l: '사망', v: b.deaths || 0, c: PALETTE.accent },
              { l: '캐릭터', v: b.runs || 0, c: PALETTE.ice },
            ].map(x => (
              <div key={x.l} className="px-2 py-2 text-center" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{x.l}</div>
                <div className="text-[14px] font-bold tabular-nums" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 안내 ===== */}
        <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>규칙</div>
          <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>
            <b style={{ color: PALETTE.text }}>장비 6칸이 곧 스킬 6개다.</b> 장비를 바꾸지 않으면 새로운 수를 쓸 수 없다.<br />
            같은 스킬이 붙은 장비를 다시 얻으면 그 <b style={{ color: PALETTE.text }}>스킬 레벨이 오른다</b> (최대 Lv.{BURIED_SKILL_MAX_LV},
            Lv.3·Lv.8에서 추가 효과).<br />
            마물 레벨은 층이 아니라 <b style={{ color: PALETTE.text }}>지나온 방 수</b>로 오른다. 방마다 색이 다른 효과가 붙고,
            <span style={{ color: PALETTE.accent }}> 붉은 이름의 방</span>은 나와 적 모두에게 적용된다.<br />
            <b style={{ color: PALETTE.ice }}>보호막</b>은 HP보다 먼저 깎이고, <b style={{ color: PALETTE.dawn }}>추격 피해</b>는 스킬이 적중할 때마다 한 번 더 들어간다.
          </div>
          <BuriedTierLegend />
        </div>
      </div>

      {/* 장비 관리 */}
      {manage && char && (
        <BuriedManage char={char} dust={b.dust || 0}
          onUpdate={(next, dustGain) => onUpdateChar(next, dustGain)}
          onClose={() => setManage(false)} />
      )}

      {/* 획득 판단 (1.113.0) — 재련소 제작품 등, 로비에서도 대기열을 비운다 */}
      {char && (char.pendingLoot || []).length > 0 && (
        <BuriedLootModal char={char} onResolve={(replace) => {
          const r = resolveBuriedLoot(char, replace);
          onUpdateChar(r.char, r.dustGain);
        }} />
      )}

      {/* 은퇴 확인 */}
      {confirmRetire && char && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.78)' }}>
          <div className="w-full px-4 py-4" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.bgDeep, border: `1px solid ${PALETTE.accent}66` }}>
            <div className="text-[13px] font-bold flex items-center gap-1.5 mb-1.5" style={{ color: PALETTE.accent }}>
              <Skull size={14} /> 이 캐릭터를 묻는다
            </div>
            <div className="text-[12px] leading-relaxed mb-3" style={{ color: PALETTE.textDim }}>
              {cls?.name} Lv.{char.lv}는 사라진다. 장착 장비는 전부 분해되어 🕯먼지로 정산되고, 골드 {BURIED_LEGACY_GOLD_PCT}%만 다음 캐릭터에게 넘어간다.
              <b style={{ color: PALETTE.text }}> 되돌릴 수 없다.</b>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmRetire(false); onRetire(char); }}
                className="ui-press flex-1 py-2.5 text-[12px] font-bold"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>묻는다</button>
              <button onClick={() => setConfirmRetire(false)} className="ui-press flex-1 py-2.5 text-[12px]"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
