// ============================================
// components/buried/BuriedScreen.jsx — 무덤의 유산 로비 (1.119.0 전면 재설계)
// ============================================
// PM 지시: "첫 화면이 모든 정보가 보여 어지럽다 → 단계별 셋팅 후 시작".
// 구조 — ①허브(캐릭터/CTA + 시설 4버튼 + 기록 요약) ②출정 위저드 4단계(던전→층→직업→최종)
// ③시설 서브뷰(재련소/계약/연구실/기록·규칙). 로직은 전부 data/buried.js — 이 파일은 표시만.

import React, { useState } from 'react';
import { ChevronLeft, Skull, BarChart3, Lock, Hammer, ScrollText, FlaskConical } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_CLASSES, BURIED_ADVANCED_CLASSES, BURIED_ENCOUNTER_CLASSES, BURIED_DUNGEONS,
  BURIED_SKILL_MAX_LV,
  BURIED_SLOTS, BURIED_FORGE,
  buriedForgeLevel,
  BURIED_CONTRACTS, BURIED_CONTRACT_COST, BURIED_CONTRACT_CARRY, getBuriedContract,
  buriedDerived, buriedExpToNext, getBuriedClass, getBuriedDungeon,
  buriedTraitIds, getBuriedTrait, buriedMonsterLevel,
  BURIED_PARTS, BURIED_PART_SLOT_COSTS, getBuriedPart, BURIED_SHARD,
  resolveBuriedLoot, buriedCheckpointFloors,
  BURIED_DEPTH_CLASSES, buriedEarnedDepthTraits,
  BURIED_RACES, getBuriedRace,
} from '../../data.js';
import { BuriedBar, BURIED_DUST_ICON, BuriedTierLegend, BuriedLootModal } from './BuriedCommon.jsx';
import BuriedManage from './BuriedManage.jsx';

const R = { chip: 'var(--r-chip, 8px)', btn: 'var(--r-btn, 13px)', panel: 'var(--r-panel, 18px)' };

export default function BuriedScreen({ meta, onStartChar, onContinue, onUpdateChar, onRetire, onForge, onBuyContract, onBuyPart, onDetachParts, forgeNotice, onBack }) {
  const b = meta?.buried || {};
  const char = b.char || null;
  const clears = (b.clears && typeof b.clears === 'object') ? b.clears : {};
  const unlockedDungeons = b.unlockedDungeons || ['labyrinth'];
  const unlockedClasses = b.unlockedClasses || [];

  // 화면 상태 — 허브 / 출정 위저드(1~4) / 시설 서브뷰
  const [view, setView] = useState('home'); // home | wizard | forge | contracts | lab | records
  const [wizStep, setWizStep] = useState(1); // 1 던전 → 2 시작 층 → 3 종족 → 4 직업 → 5 최종
  const [pickClass, setPickClass] = useState(BURIED_CLASSES[0].id);
  const [pickRace, setPickRace] = useState('human'); // 1.122.0 — 종족 축
  const [pickDungeon, setPickDungeon] = useState(unlockedDungeons[unlockedDungeons.length - 1] || 'labyrinth');
  const [pickStart, setPickStart] = useState(1);
  const [carryPicks, setCarryPicks] = useState([]);
  const [manage, setManage] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [forgeSlot, setForgeSlot] = useState('weapon');

  const ownedContracts = b.contracts || [];
  const toggleCarry = (id) => setCarryPicks(p =>
    p.includes(id) ? p.filter(x => x !== id) : (p.length < BURIED_CONTRACT_CARRY ? [...p, id] : p));

  const cls = char ? getBuriedClass(char.classId) : null;
  const d = char ? buriedDerived(char) : null;
  const curDungeon = char ? getBuriedDungeon(char.dungeonId) : null;

  const selectable = [
    ...BURIED_CLASSES,
    ...BURIED_ADVANCED_CLASSES.filter(c => unlockedClasses.includes(c.id)),
    ...BURIED_ENCOUNTER_CLASSES.filter(c => unlockedClasses.includes(c.id)),
    ...BURIED_DEPTH_CLASSES.filter(c => unlockedClasses.includes(c.id)),
  ];
  const earnedDepthTraits = buriedEarnedDepthTraits(b.deepestByDungeon);
  const killsByEnemy = b.killsByEnemy || {};
  const isDungeonUnlocked = (dg) => unlockedDungeons.includes(dg.id);
  const checkpoints = buriedCheckpointFloors(b.deepestByDungeon?.[pickDungeon] || 0);

  // 위저드 이동 — 체크포인트 없는 던전은 층 단계 자동 스킵
  const wizNext = () => {
    if (wizStep === 1 && checkpoints.length === 0) { setWizStep(3); return; }
    setWizStep(st => Math.min(5, st + 1));
  };
  const wizPrev = () => {
    if (wizStep === 3 && checkpoints.length === 0) { setWizStep(1); return; }
    if (wizStep === 1) { setView('home'); return; }
    setWizStep(st => st - 1);
  };
  const openWizard = () => { setWizStep(1); setPickStart(1); setCarryPicks([]); setView('wizard'); };

  // ===== 공용 부품 =====
  const SectionTitle = ({ children, color = PALETTE.dawn }) => (
    <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color }}>{children}</div>
  );
  const SubHeader = ({ title, color = PALETTE.dawn, onPrev }) => (
    <div className="px-3 pt-5 pb-3 flex items-center gap-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
      <button onClick={onPrev} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><ChevronLeft size={20} /></button>
      <div className="text-[13px] font-bold flex-1" style={{ color }}>{title}</div>
      <div className="text-[11px] tabular-nums font-bold text-right" style={{ color: PALETTE.dawn }}>
        {BURIED_DUST_ICON} {b.dust || 0}
        <div style={{ color: '#c48bd4' }}>{BURIED_SHARD.icon} {b.shards || 0}</div>
      </div>
    </div>
  );
  const NoticeChip = () => forgeNotice ? (
    <div className="px-2.5 py-1.5 text-[11px]" style={{ borderRadius: R.chip, background: `${PALETTE.dawn}15`, border: `1px solid ${PALETTE.dawn}55`, color: PALETTE.dawn }}>
      {forgeNotice}
    </div>
  ) : null;

  // ============================================
  // 허브 (home)
  // ============================================
  const renderHome = () => (
    <>
      <div className="px-3 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><ChevronLeft size={20} /></button>
        <div className="text-center">
          <div className="text-[12px] tracking-[0.35em] font-bold" style={{ color: PALETTE.legendary }}>⚰ 무덤의 유산 ⚰</div>
          <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>남기는 것은 먼지뿐이다</div>
        </div>
        <div className="text-[11px] tabular-nums font-bold text-right" style={{ color: PALETTE.dawn }}>
          {BURIED_DUST_ICON} {b.dust || 0}
          <div style={{ color: '#c48bd4' }}>{BURIED_SHARD.icon} {b.shards || 0}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 ui-stagger">
        <NoticeChip />

        {/* 탐험 중 캐릭터 or 출정 CTA */}
        {char ? (
          <div className="px-3 py-3" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${cls?.color || PALETTE.panelBorder}66` }}>
            <div className="flex gap-3">
              <div className="w-16 h-16 shrink-0 overflow-hidden" style={{ borderRadius: R.chip, border: `1px solid ${cls?.color}55` }}>
                <img src={cls?.image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold" style={{ color: cls?.color }}>
                  {getBuriedRace(char.raceId)?.icon} {cls?.name} <span style={{ color: PALETTE.text }}>Lv.{char.lv}</span>
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
              <div className="mt-2 px-2.5 py-1.5 text-[11px]" style={{ borderRadius: R.chip, background: `${PALETTE.legendary}1a`, border: `1px solid ${PALETTE.legendary}55`, color: PALETTE.legendary }}>
                판단 대기 장비 {(char.pendingLoot || []).length}개 — [교체/버리기]를 결정하라.
              </div>
            )}
            <div className="flex gap-2 mt-2.5">
              <button onClick={onContinue} className="ui-press ui-sheen flex-1 py-2.5 text-[12px] font-bold"
                style={{ borderRadius: R.btn, background: PALETTE.accent, color: '#fff' }}>
                {char.floor}층으로 내려간다
              </button>
              <button onClick={() => setManage(true)} className="ui-press px-4 py-2.5 text-[12px]"
                style={{ borderRadius: R.btn, background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                장비
              </button>
            </div>
            <button onClick={() => setConfirmRetire(true)} className="ui-press w-full mt-1.5 py-2 text-[11px]" style={{ color: PALETTE.textDim }}>
              은퇴 — 장비를 먼지로 정산하고 이 캐릭터를 묻는다
            </button>
          </div>
        ) : (
          <button onClick={openWizard} className="ui-press ui-sheen w-full px-4 py-5 text-left"
            style={{ borderRadius: R.panel, background: `linear-gradient(135deg, ${PALETTE.accent}cc, #4a1626)`, border: `1px solid ${PALETTE.accent}` }}>
            <div className="text-[15px] font-bold" style={{ color: '#fff' }}>⚰ 새 탐험 준비</div>
            <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              던전 → 시작 층 → 직업 → 최종 확인, 4단계로 차근차근 내려갈 준비를 한다
              {(b.legacyGold || 0) > 0 && <> · 🪙 {b.legacyGold} 계승 대기</>}
            </div>
          </button>
        )}

        {/* 시설 4버튼 */}
        <div>
          <SectionTitle>무덤 시설</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'forge', icon: <Hammer size={15} />, name: '무덤 재련소', sub: `${BURIED_DUST_ICON}${b.dust || 0} · 제작 Lv.${buriedForgeLevel(b.deepest)}`, c: PALETTE.dawn },
              { id: 'contracts', icon: <ScrollText size={15} />, name: '마의 계약', sub: `보유 ${ownedContracts.length}/${BURIED_CONTRACTS.length}`, c: PALETTE.twilight },
              { id: 'lab', icon: <FlaskConical size={15} />, name: '연구실', sub: `${BURIED_SHARD.icon}${b.shards || 0} · 부품 ${(b.parts || []).length}/5`, c: '#c48bd4' },
              { id: 'records', icon: <BarChart3 size={15} />, name: '기록 · 규칙', sub: `최고 ${b.deepest || 0}층 · 사망 ${b.deaths || 0}`, c: PALETTE.ice },
            ].map(m => (
              <button key={m.id} onClick={() => setView(m.id)} className="ui-press px-3 py-3 text-left"
                style={{ borderRadius: R.btn, background: PALETTE.panel, border: `1px solid ${m.c}44` }}>
                <div className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: m.c }}>{m.icon} {m.name}</div>
                <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: PALETTE.textDim }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 던전 진행 한눈에 */}
        <div>
          <SectionTitle>던전 — 최고 도달</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            {BURIED_DUNGEONS.map(dg => {
              const open = isDungeonUnlocked(dg);
              return (
                <div key={dg.id} className="px-2.5 py-2" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${open ? dg.color + '55' : PALETTE.panelBorder}`, opacity: open ? 1 : 0.5 }}>
                  <div className="text-[11px] font-bold flex items-center gap-1" style={{ color: dg.color }}>
                    {open ? dg.gimmick?.icon : <Lock size={11} />} {dg.name}
                  </div>
                  <div className="text-[11px] tabular-nums" style={{ color: PALETTE.textDim }}>
                    {open ? `최고 ${b.deepestByDungeon?.[dg.id] || 0}층 · 정복 ${clears[dg.id] || 0}` : '잠김'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  // ============================================
  // 출정 위저드 (4단계)
  // ============================================
  const WIZ_STEPS = ['던전', '시작 층', '종족', '직업', '최종 확인'];
  const renderWizard = () => (
    <>
      <div className="px-3 pt-5 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="flex items-center gap-2">
          <button onClick={wizPrev} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><ChevronLeft size={20} /></button>
          <div className="text-[13px] font-bold flex-1" style={{ color: PALETTE.legendary }}>새 탐험 준비 — {wizStep}. {WIZ_STEPS[wizStep - 1]}</div>
        </div>
        {/* 진행 인디케이터 */}
        <div className="flex gap-1 mt-2">
          {WIZ_STEPS.map((nm, i) => {
            const stepNo = i + 1;
            const skipped = stepNo === 2 && checkpoints.length === 0;
            return (
              <div key={nm} className="flex-1 h-1 overflow-hidden" style={{ borderRadius: 2, background: PALETTE.panelBorder, opacity: skipped ? 0.3 : 1 }}>
                <div style={{ width: wizStep >= stepNo ? '100%' : '0%', height: '100%', background: PALETTE.legendary, transition: 'width 260ms ease' }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 ui-screen-enter" key={`wiz-${wizStep}`}>
        {/* ── 1. 던전 ── */}
        {wizStep === 1 && (
          <div className="space-y-1.5 ui-stagger">
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>층은 무한 — 죽거나 포기할 때까지. 던전은 난이도가 아니라 <b style={{ color: PALETTE.text }}>기믹</b>으로 고른다.</div>
            {BURIED_DUNGEONS.map(dg => {
              const open = isDungeonUnlocked(dg);
              const on = pickDungeon === dg.id;
              return (
                <button key={dg.id} disabled={!open} onClick={() => { setPickDungeon(dg.id); setPickStart(1); }}
                  className="ui-press w-full flex items-start gap-2.5 px-3 py-2.5 text-left"
                  style={{ borderRadius: R.btn, background: on ? PALETTE.panelLight : PALETTE.panel, border: `1px solid ${on ? dg.color : PALETTE.panelBorder}`, opacity: open ? 1 : 0.45 }}>
                  <span className="text-[15px] mt-0.5">{open ? dg.gimmick?.icon || '⚰' : <Lock size={13} />}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold" style={{ color: dg.color }}>
                      {dg.name}
                      {(clears[dg.id] || 0) > 0 && <span className="text-[11px] ml-1.5" style={{ color: PALETTE.legendary }}>정복 {clears[dg.id]}</span>}
                      {(b.deepestByDungeon?.[dg.id] || 0) > 0 && <span className="text-[11px] ml-1.5" style={{ color: PALETTE.dawn }}>최고 {b.deepestByDungeon[dg.id]}층</span>}
                    </div>
                    {dg.gimmick && (
                      <div className="text-[11px] mt-0.5" style={{ color: dg.color }}>
                        <b>{dg.gimmick.name}</b> — {dg.gimmick.desc}
                      </div>
                    )}
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                      정복 {dg.floors}층 · {dg.stepsPerLevel}걸음/Lv · 시작 마물 Lv.{dg.baseLevel + 1} · 골드 ×{dg.goldMult}
                    </div>
                    {!open && <div className="text-[11px] mt-0.5" style={{ color: PALETTE.accent }}>🔒 {getBuriedDungeon(dg.unlock)?.name} 정복 시 해금</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 2. 시작 층 (체크포인트 보유 시에만) ── */}
        {wizStep === 2 && (
          <div className="space-y-2 ui-stagger">
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              {getBuriedDungeon(pickDungeon).name} 최고 기록 <b style={{ color: PALETTE.dawn }}>{b.deepestByDungeon?.[pickDungeon] || 0}층</b> —
              🚪수문장을 격파한 100층 관문 너머에서 재출발할 수 있다.
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, ...checkpoints].map(f => (
                <button key={f} onClick={() => setPickStart(f)} className="ui-press px-3 py-3 text-[13px] font-bold"
                  style={{
                    borderRadius: R.btn,
                    border: `1px solid ${pickStart === f ? PALETTE.dawn : PALETTE.panelBorder}`,
                    background: pickStart === f ? PALETTE.panelLight : PALETTE.panel,
                    color: pickStart === f ? PALETTE.dawn : PALETTE.textDim,
                  }}>
                  {f === 1 ? '1층부터' : `${f}층 돌파`}
                </button>
              ))}
            </div>
            {pickStart > 1 && (
              <div className="px-3 py-2 text-[11px] leading-relaxed" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
                그 층 마물 레벨 + 깊이 압력을 보정한 <b style={{ color: PALETTE.text }}>낡은 장비 6종</b>으로 시작한다 — 빠르게 더 좋은 장비를 주워야 산다.
              </div>
            )}
          </div>
        )}

        {/* ── 3. 종족 (1.122.0 — BB2 모티브 종족 × 직업 2축) ── */}
        {wizStep === 3 && (
          <div className="space-y-1.5 ui-stagger">
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
              시체의 뼈대를 고른다 — 종족은 기본 스탯과 체질을 바꾼다.
            </div>
            {BURIED_RACES.map(r => {
              const on = pickRace === r.id;
              return (
                <button key={r.id} onClick={() => setPickRace(r.id)} className="ui-press w-full flex items-start gap-2.5 px-3 py-2 text-left"
                  style={{ borderRadius: R.btn, background: on ? PALETTE.panelLight : PALETTE.panel, border: `1px solid ${on ? r.color : PALETTE.panelBorder}` }}>
                  <span className="text-[16px] mt-0.5">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold" style={{ color: r.color }}>
                      {r.name}
                      <span className="text-[11px] ml-1.5 font-normal tabular-nums" style={{ color: PALETTE.textDim }}>
                        {Object.entries(r.statMods).map(([k, v]) => `${{ str: '완력', dex: '기교', int: '지혜', vit: '체력' }[k]}${v > 0 ? '+' : ''}${v}`).join(' ')}
                      </span>
                    </div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{r.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 4. 직업 ── */}
        {wizStep === 4 && (
          <div className="space-y-1.5 ui-stagger">
            {selectable.map(c => {
              const on = pickClass === c.id;
              return (
                <button key={c.id} onClick={() => setPickClass(c.id)} className="ui-press w-full flex gap-2.5 px-2.5 py-2.5 text-left"
                  style={{ borderRadius: R.btn, background: on ? PALETTE.panelLight : PALETTE.panel, border: `1px solid ${on ? c.color : PALETTE.panelBorder}` }}>
                  <div className="w-12 h-12 shrink-0 overflow-hidden" style={{ borderRadius: R.chip }}>
                    <img src={c.image} alt="" className="w-full h-full object-cover" style={{ filter: on ? 'none' : 'grayscale(60%)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold" style={{ color: c.color }}>
                      {c.name}
                      {c.advanced && <span className="text-[11px] ml-1.5 px-1.5 py-0.5" style={{ borderRadius: 4, background: `${PALETTE.legendary}22`, color: PALETTE.legendary }}>전직</span>}
                      {c.depth && <span className="text-[11px] ml-1.5 px-1.5 py-0.5" style={{ borderRadius: 4, background: '#c48bd422', color: '#c48bd4' }}>심층</span>}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{c.desc}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: PALETTE.dawn }}>
                      {c.traits.map(id => getBuriedTrait(id)?.name).filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </button>
              );
            })}
            {/* 선택 직업 특성 미리보기 */}
            {(() => {
              const c = getBuriedClass(pickClass);
              if (!c) return null;
              return (
                <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: R.panel, background: PALETTE.panelLight, border: `1px solid ${c.color}44` }}>
                  <div className="text-[11px] tracking-[0.2em]" style={{ color: c.color }}>영구 특성 (★ = 직업 전용)</div>
                  {c.traits.map((id, i) => {
                    const t = getBuriedTrait(id);
                    return t ? (
                      <div key={id} className="text-[12px] leading-relaxed">
                        <span className="font-bold" style={{ color: i === 0 ? c.color : PALETTE.text }}>{i === 0 ? '★' : '◆'} {t.name}</span>
                        <span style={{ color: PALETTE.textDim }}> — {t.desc}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              );
            })()}
            {/* 잠긴 직업 안내 (접힘) */}
            <details className="px-3 py-2" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
              <summary className="text-[11px] cursor-pointer" style={{ color: PALETTE.textDim }}>🔒 잠긴 직업 보기 (전직 · 조우 · 심층)</summary>
              <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
                {BURIED_ADVANCED_CLASSES.filter(c => !unlockedClasses.includes(c.id)).map(c => (
                  <div key={c.id} style={{ color: PALETTE.textDim }}><span style={{ color: c.color }}>{c.name}</span> — {getBuriedClass(c.base)?.name}(으)로 미궁 정복</div>
                ))}
                {BURIED_ENCOUNTER_CLASSES.filter(c => !unlockedClasses.includes(c.id)).map(c => (
                  <div key={c.id} style={{ color: PALETTE.textDim }}>
                    <span style={{ color: c.color }}>{c.name}</span> — {c.unlock.label}
                    <span className="tabular-nums"> ({Math.min(killsByEnemy[c.unlock.enemyKey] || 0, c.unlock.kills)}/{c.unlock.kills})</span>
                  </div>
                ))}
                {BURIED_DEPTH_CLASSES.filter(c => !unlockedClasses.includes(c.id)).map(c => (
                  <div key={c.id} style={{ color: PALETTE.textDim }}>
                    <span style={{ color: c.color }}>{c.name}</span> — {c.unlock.label}
                    <span className="tabular-nums"> (최고 {b.deepestByDungeon?.[c.unlock.dungeonId] || 0}층)</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* ── 5. 최종 확인 ── */}
        {wizStep === 5 && (() => {
          const dg = getBuriedDungeon(pickDungeon);
          const c = getBuriedClass(pickClass);
          return (
            <div className="space-y-3 ui-stagger">
              <div className="px-3 py-3 space-y-1.5" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.legendary}44` }}>
                <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.legendary }}>출정 요약</div>
                <div className="flex justify-between text-[12px]"><span style={{ color: PALETTE.textDim }}>던전</span><span style={{ color: dg.color }}>{dg.gimmick?.icon} {dg.name}</span></div>
                <div className="flex justify-between text-[12px]"><span style={{ color: PALETTE.textDim }}>시작 층</span><span style={{ color: PALETTE.text }}>{pickStart > 1 ? `${pickStart + 1}층 (${pickStart}층 관문 너머)` : '1층'}</span></div>
                <div className="flex justify-between text-[12px]"><span style={{ color: PALETTE.textDim }}>종족</span><span style={{ color: getBuriedRace(pickRace)?.color }}>{getBuriedRace(pickRace)?.icon} {getBuriedRace(pickRace)?.name}</span></div>
                <div className="flex justify-between text-[12px]"><span style={{ color: PALETTE.textDim }}>직업</span><span style={{ color: c?.color }}>{c?.name}</span></div>
                {(b.legacyGold || 0) > 0 && <div className="flex justify-between text-[12px]"><span style={{ color: PALETTE.textDim }}>계승 골드</span><span style={{ color: PALETTE.legendary }}>🪙 {b.legacyGold}</span></div>}
                {earnedDepthTraits.length > 0 && (
                  <div className="flex justify-between text-[12px]"><span style={{ color: PALETTE.textDim }}>심층 특성</span>
                    <span style={{ color: '#c48bd4' }}>{earnedDepthTraits.map(id => getBuriedTrait(id)?.name).join(' · ')}</span></div>
                )}
              </div>

              {/* 마의 계약 지참 */}
              {ownedContracts.length > 0 && (
                <div>
                  <SectionTitle>마의 계약 지참 — {carryPicks.length}/{BURIED_CONTRACT_CARRY}</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {ownedContracts.map(id => {
                      const ct = getBuriedContract(id);
                      if (!ct) return null;
                      const on = carryPicks.includes(id);
                      return (
                        <button key={id} onClick={() => toggleCarry(id)} className="ui-press px-2 py-1.5 text-[11px] text-left" title={ct.desc}
                          style={{ borderRadius: R.chip, background: on ? PALETTE.panelLight : PALETTE.panel, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, color: on ? PALETTE.legendary : PALETTE.textDim }}>
                          {on ? '✓ ' : ''}{ct.name}
                        </button>
                      );
                    })}
                  </div>
                  {carryPicks.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {carryPicks.map(id => {
                        const ct = getBuriedContract(id);
                        return ct ? <div key={id} className="text-[11px]" style={{ color: PALETTE.textDim }}>✓ {ct.name} — {ct.desc}</div> : null;
                      })}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => onStartChar(pickClass, pickDungeon, carryPicks, pickStart > 1 ? pickStart + 1 : 1, pickRace)}
                className="ui-press ui-sheen w-full py-3.5 text-[14px] font-bold"
                style={{ borderRadius: R.btn, background: PALETTE.accent, color: '#fff' }}>
                ⚰ {dg.name} {pickStart > 1 ? pickStart + 1 : 1}층으로 내려간다
              </button>
            </div>
          );
        })()}
      </div>

      {/* 위저드 하단 다음 버튼 (1~3단계) */}
      {wizStep < 5 && (
        <div className="px-3 pb-4 pt-2">
          <button onClick={wizNext} className="ui-press w-full py-3 text-[13px] font-bold"
            style={{ borderRadius: R.btn, background: PALETTE.panelLight, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}66` }}>
            다음 →
          </button>
        </div>
      )}
    </>
  );

  // ============================================
  // 시설 서브뷰 — 재련소
  // ============================================
  const renderForge = () => (
    <>
      <SubHeader title={`${BURIED_DUST_ICON} 무덤 재련소`} onPrev={() => setView('home')} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 ui-screen-enter">
        <NoticeChip />
        <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
            장비를 분해해 모은 먼지로 새 장비를 벼린다. 제작 레벨은 <b style={{ color: PALETTE.text }}>역대 최고 기록 기반 Lv.{buriedForgeLevel(b.deepest)}</b> —
            죽어도 남는 진행도다. {char ? '완성품은 즉시 [교체/버리기]로 판단한다.' : '탐험 중인 캐릭터가 있어야 벼릴 수 있다.'}
          </div>
          <div className="flex flex-wrap gap-1">
            {BURIED_SLOTS.map(sl => (
              <button key={sl.id} onClick={() => setForgeSlot(sl.id)} className="ui-press px-2 py-1 text-[11px]"
                style={{ borderRadius: R.chip, border: `1px solid ${forgeSlot === sl.id ? PALETTE.dawn : PALETTE.panelBorder}`, color: forgeSlot === sl.id ? PALETTE.dawn : PALETTE.textDim, background: forgeSlot === sl.id ? PALETTE.panelLight : 'transparent' }}>
                {sl.icon} {sl.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[{ epic: false, cost: BURIED_FORGE.randomCost, label: '랜덤 제작', c: PALETTE.dawn }, { epic: true, cost: BURIED_FORGE.epicCost, label: '영웅급 확정', c: PALETTE.legendary }].map(f => {
              const ok = (b.dust || 0) >= f.cost && char;
              return (
                <button key={f.label} onClick={() => onForge(forgeSlot, f.epic, char ? char.classId : pickClass)} disabled={!ok}
                  className="ui-press flex-1 py-2 text-[12px] font-bold"
                  style={{ borderRadius: R.btn, background: ok ? PALETTE.panelLight : PALETTE.panel, border: `1px solid ${f.c}55`, color: ok ? f.c : PALETTE.textDim, opacity: ok ? 1 : 0.5 }}>
                  {f.label} {BURIED_DUST_ICON}{f.cost}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  // ============================================
  // 시설 서브뷰 — 마의 계약
  // ============================================
  const renderContracts = () => (
    <>
      <SubHeader title="📜 마의 계약" color={PALETTE.twilight} onPrev={() => setView('home')} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 ui-screen-enter">
        <NoticeChip />
        <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
            출정 시 <b style={{ color: PALETTE.text }}>최대 {BURIED_CONTRACT_CARRY}개</b>를 지참하는 영구 패시브.
            먼지로 미보유 계약 중 하나를 무작위로 얻는다. 보유 {ownedContracts.length} / {BURIED_CONTRACTS.length}
          </div>
          <button onClick={onBuyContract}
            disabled={(b.dust || 0) < BURIED_CONTRACT_COST || ownedContracts.length >= BURIED_CONTRACTS.length}
            className="ui-press w-full py-2 text-[12px] font-bold"
            style={{
              borderRadius: R.btn,
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
    </>
  );

  // ============================================
  // 시설 서브뷰 — 연구실
  // ============================================
  const renderLab = () => (
    <>
      <SubHeader title={`⚗ 연구실 — ${BURIED_SHARD.icon} ${b.shards || 0}`} color="#c48bd4" onPrev={() => setView('home')} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 ui-screen-enter">
        <NoticeChip />
        <div className="px-3 py-2.5 space-y-2" style={{ borderRadius: R.panel, background: PALETTE.panel, border: '1px solid #7b3fa055' }}>
          <div className="text-[11px] leading-relaxed" style={{ color: PALETTE.textDim }}>
            보스와 🌑재앙이 떨어뜨리는 {BURIED_SHARD.icon}조각으로 시체에 부품을 심는다.
            최대 <b style={{ color: PALETTE.text }}>5칸</b> ({BURIED_PART_SLOT_COSTS.map(c => c === 0 ? '무료' : c).join('→')}).
            효과는 <b style={{ color: '#c48bd4' }}>다음 캐릭터 생성부터</b>. 탈착은 전체 일괄({BURIED_DUST_ICON}50, 부품 소멸)만.
          </div>
          {(b.parts || []).length > 0 && (
            <div className="space-y-0.5">
              {(b.parts || []).map(id => {
                const p = getBuriedPart(id);
                return p ? (
                  <div key={id} className="text-[11px]" style={{ color: PALETTE.textDim }}>
                    <span style={{ color: '#c48bd4' }}>✓ {p.name}</span> — {p.desc}
                  </div>
                ) : null;
              })}
            </div>
          )}
          {(b.parts || []).length < 5 && (() => {
            const nextCost = BURIED_PART_SLOT_COSTS[(b.parts || []).length];
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
                        style={{ borderRadius: R.chip, border: `1px solid ${ok ? '#7b3fa0' : PALETTE.panelBorder}`, background: ok ? PALETTE.panelLight : 'transparent', color: ok ? PALETTE.text : PALETTE.textDim, opacity: ok ? 1 : 0.5 }}>
                        <div style={{ color: ok ? '#c48bd4' : PALETTE.textDim }}>{dgName && '★ '}{p.name}</div>
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
              style={{ borderRadius: R.btn, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim, opacity: (b.dust || 0) >= 50 ? 1 : 0.5 }}>
              전체 일괄 탈착 — {BURIED_DUST_ICON}50 (부품은 소멸, 칸 비용은 처음부터)
            </button>
          )}
        </div>
      </div>
    </>
  );

  // ============================================
  // 시설 서브뷰 — 기록·규칙
  // ============================================
  const renderRecords = () => (
    <>
      <SubHeader title="📊 기록 · 규칙" color={PALETTE.ice} onPrev={() => setView('home')} />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 ui-screen-enter">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: '최고 층', v: b.deepest || 0, c: PALETTE.legendary },
            { l: '정복', v: Object.values(clears).reduce((s, n) => s + n, 0), c: PALETTE.green },
            { l: '사망', v: b.deaths || 0, c: PALETTE.accent },
            { l: '캐릭터', v: b.runs || 0, c: PALETTE.ice },
          ].map(x => (
            <div key={x.l} className="px-2 py-2 text-center" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
              <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{x.l}</div>
              <div className="text-[14px] font-bold tabular-nums" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
        <div>
          <SectionTitle>던전별 최고 도달</SectionTitle>
          <div className="space-y-1">
            {BURIED_DUNGEONS.map(dg => (
              <div key={dg.id} className="flex justify-between px-3 py-1.5 text-[12px]" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                <span style={{ color: dg.color }}>{dg.gimmick?.icon} {dg.name}</span>
                <span className="tabular-nums" style={{ color: PALETTE.text }}>최고 {b.deepestByDungeon?.[dg.id] || 0}층 · 정복 {clears[dg.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>규칙</div>
          <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>
            <b style={{ color: PALETTE.text }}>장비 6칸이 곧 스킬 6개다.</b> 장비를 바꾸지 않으면 새로운 수를 쓸 수 없다.<br />
            같은 스킬이 붙은 장비를 다시 얻으면 그 <b style={{ color: PALETTE.text }}>스킬 레벨이 오른다</b> (최대 Lv.{BURIED_SKILL_MAX_LV}, Lv.3·Lv.8에서 추가 효과).<br />
            마물 레벨은 층이 아니라 <b style={{ color: PALETTE.text }}>지나온 방 수</b>로 오른다.
            <span style={{ color: PALETTE.accent }}> 붉은 이름의 방</span>은 나와 적 모두에게 적용된다.<br />
            <b style={{ color: PALETTE.ice }}>보호막</b>은 HP보다 먼저 깎이고, <b style={{ color: PALETTE.dawn }}>추격 피해</b>는 스킬이 적중할 때마다 한 번 더 들어간다.<br />
            죽으면 장비는 전부 🕯먼지로 정산되고 골드는 사라진다.
          </div>
          <BuriedTierLegend />
        </div>
      </div>
    </>
  );

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {view === 'home' && renderHome()}
      {view === 'wizard' && renderWizard()}
      {view === 'forge' && renderForge()}
      {view === 'contracts' && renderContracts()}
      {view === 'lab' && renderLab()}
      {view === 'records' && renderRecords()}

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
          <div className="w-full px-4 py-4" style={{ borderRadius: R.panel, background: PALETTE.bgDeep, border: `1px solid ${PALETTE.accent}66` }}>
            <div className="text-[13px] font-bold flex items-center gap-1.5 mb-1.5" style={{ color: PALETTE.accent }}>
              <Skull size={14} /> 이 캐릭터를 묻는다
            </div>
            <div className="text-[12px] leading-relaxed mb-3" style={{ color: PALETTE.textDim }}>
              {cls?.name} Lv.{char.lv}는 사라진다. 장착 장비는 전부 분해되어 🕯먼지로 정산되고, 골드는 무덤에 흩어진다.
              <b style={{ color: PALETTE.text }}> 되돌릴 수 없다.</b>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmRetire(false); onRetire(char); }}
                className="ui-press flex-1 py-2.5 text-[12px] font-bold"
                style={{ borderRadius: R.btn, background: PALETTE.accent, color: '#fff' }}>묻는다</button>
              <button onClick={() => setConfirmRetire(false)} className="ui-press flex-1 py-2.5 text-[12px]"
                style={{ borderRadius: R.btn, background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
