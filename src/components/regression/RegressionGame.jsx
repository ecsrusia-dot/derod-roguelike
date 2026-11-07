// ============================================
// components/regression/RegressionGame.jsx — 🌀 회귀의 탐험가 컨테이너 (1.177.0, MVP 2차)
// ============================================
// 로비(직업 선택·능력치·스킬 커스텀) → 이야기 화면(하루 1행동) → 전용 전투(RegressionBattle) → 61일째 황혼의 첨탑 → 회귀 정산.
// 모든 상태는 meta.regression 하나로 영속 (onSave 패치). 진행 중인 생은 regression.run.
// 전투 중 새로고침 = 같은 적과 재전투 (run.pending / run.spireRound — 도주 불가).
// PM 결정: 본편 메타 강화(각인·각성도·제단) 미적용 → engravingFx={}, meta.upgrades 비움.
// 순수 로직은 전부 src/data/regression.js — 이 파일은 화면과 저장만.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Footprints, Tent, Swords, Skull, BookOpen, Sparkles, MapPin, Hourglass, ScrollText, HeartHandshake, Store, Coins } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  CLASSES, CHAPTERS, ENEMIES, GAME_CONFIG,
  REGRESSION_TUNING, REGRESSION_REGIONS, REGRESSION_HUB, REGRESSION_RECORDS, REGRESSION_MEMORIES,
  REGRESSION_SPIRE_CHAIN, getRegressionRegion, regressionEnemyPool,
  createRegressionRun, regressionActions, applyRegressionTravel, applyRegressionRest,
  rollRegressionEnemy, startRegressionCombat, applyRegressionCombat,
  isRegressionSpireDay, isRegressionSpireEligible, isRegressionEliteOpen,
  enterRegressionSpire, applyRegressionSpireResult, buildRegressionSpireEnemy,
  REGRESSION_ROUTES, REGRESSION_ROUTE_BOSSES, REGRESSION_ROUTE_REWARDS, REGRESSION_ROUTE_BOSS_DAY_IN_REGION, REGRESSION_ROUTE_FROM_REGION,
  REGRESSION_ENDING_MILESTONES, REGRESSION_EPILOGUES, REGRESSION_QUEST_AFFINITY,
  REGRESSION_SECRET, REGRESSION_SECRET_PLACES, discoverRegressionSecret, solveRegressionSecretPuzzle, fightRegressionSecretGuardian, claimRegressionSecretTreasure, leaveRegressionSecret,
  REGRESSION_OATHS, REGRESSION_OATH_UNLOCK_LOOPS, regressionOathFx, regressionOathEchoMult, regressionOathEnemyMult, regressionFameGate,
  buildRegressionRouteBoss, applyRegressionRouteReward, REGRESSION_RED_MOON, regressionDaysToRedMoon, REGRESSION_GRAVE, resolveRegressionGrave, regressionSpireChain, regressionSpireEnemyFor, regressionRouteFor, REGRESSION_GEAR as __RG_GEAR,
  settleRegression, setRegressionCarry, regressionCarrySlots, buildRegressionLoadout,
  describeRegressionRecord, getRegressionMemory,
  POTIONS, AUTO_SPEED_SKIP, rollRegressionLoot, applyRegressionLoot, describeRegressionLoot,
  setRegressionLoadout, consumeRegressionPotions, regressionCombatExpedition, regressionBeltSlots, regressionClassFx, regressionPostCombatHpPct,
  REGRESSION_COMPANIONS, REGRESSION_ENDINGS, REGRESSION_SHOP, REGRESSION_EVENTS, regressionCompanionAt, regressionCompanionTier,
  aggregateRegressionCompanions, applyRegressionTalk, rollRegressionEvent, applyRegressionEvent, buyRegressionShop,
  regressionVictoryGold, regressionEndingFor, getRegressionCompanion, RELICS,
  regressionFameStage, regressionEnemyLabel, regressionNarration, regressionCompanionLine, regressionCheckChance,
  regressionChanceLabel, resolveRegressionChoice, regressionResultScene, regressionNotesToTags, regressionTravelCost,
  REGRESSION_STATS, REGRESSION_STAT_IDS, REGRESSION_START_POINTS, REGRESSION_START_CAP, REGRESSION_STAT_MAX, REGRESSION_EXP,
  emptyRegressionStats, regressionPresetStats, regressionRandomStats, regressionStatsSpent, regressionRunStats,
  regressionExpToNext, spendRegressionStatPoint, regressionFamePath, regressionLegacyCombatStats,
  REGRESSION_SKILLS, REGRESSION_SKILL_TIERS, REGRESSION_NORMAL_SKILLS, REGRESSION_START_SKILL_COUNT, REGRESSION_SKILL_PRESETS,
  REGRESSION_FLAMES_PER_LIFE, getRegressionStance, regressionRunSkills, regressionSkillValue, REGRESSION_COMBAT,
  REGRESSION_ECON, REGRESSION_GEAR, REGRESSION_GEAR_SLOTS, REGRESSION_GEAR_GRADES, regressionGearLabel, regressionGearStatText, regressionGearFx, regressionGearStats,
  regressionEffectiveStats, equipRegressionGear, unequipRegressionGear, offerRegressionUnique, resolveRegressionUnique, regressionUniqueChance, regressionUniqueIntro,
  regressionAptitude, buildRegressionShopStock, rerollRegressionShop, regressionShopOfferPrice, buyRegressionOffer,
  regressionCombatBonus, regressionCompanionFollowers, regressionStatSources, regressionSellableGear, sellRegressionGear, regressionGearSellPrice,
  REGRESSION_START_TRAITS, REGRESSION_TRAIT_TUNING, aggregateRegressionStartTraits, unlockRegressionStartTrait, toggleRegressionStartTrait,
  regressionTraitLevel, regressionTraitSlots, regressionTraitNextCost, regressionNextSlotCost, buyRegressionTraitSlot,
  REGRESSION_PROVISIONS, regressionProvisionsCost,
  REGRESSION_TRAITS, REGRESSION_MAIN_STORY, regressionEventById, regressionChoiceVisible, regressionTopTrait,
  REGRESSION_DAY, rollRegressionDay, passRegressionDay, hideFromRegressionEnemy, fightRegressionToday, restRegressionShelter, trainRegressionShelter,
  askRegressionHermit, regressionDayEnemyMult, regressionDayTable, regressionFortuneWeight, REGRESSION_TODAY_INTRO,
  REGRESSION_LEARN, offerRegressionLearn, resolveRegressionLearn, regressionLearnChance, regressionLearnIntro, regressionSkillAptitude, regressionRunSkillLv, getRegressionClassPerk,
  REGRESSION_AWAKENINGS, REGRESSION_AWAKEN_LEVEL, getRegressionAwakening, chooseRegressionAwakening, regressionSkillStats,
} from '../../data.js';
import { AP_TUNING } from '../../combat/initCombat.js';
import { ScreenHeader, GlassPanel, Chip, UIButton, BottomSheet } from '../ui/CommonUI.jsx';
import RegressionBattle, { regressionTriggerText } from './RegressionBattle.jsx';
import RegressionSkillInfo from './RegressionSkillInfo.jsx';

const CLASS_IDS = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
const classById = (id) => CLASSES.find(c => c.id === id) || null;

// 1.198.0~ 엔딩 도감 — 갈래별 묶음 · 본 엔딩은 본문 + 후일담 + 처음 본 생
function EndingCodex({ reg, onClose }) {
  const n = reg.endings.length;
  const branches = [...new Set(REGRESSION_ENDINGS.map(e => e.branch))];
  return (
    <BottomSheet title="👑 엔딩 도감" onClose={onClose}>
      <div className="space-y-3 pb-3 px-1">
        <div>
          <div className="flex justify-between text-[12px]"><b style={{ color: PALETTE.legendary }}>{n} / {REGRESSION_ENDINGS.length}종</b><span style={{ color: PALETTE.textDim }}>수집 보상</span></div>
          <div className="flex gap-1.5 mt-1.5">
            {REGRESSION_ENDING_MILESTONES.map(m => (
              <div key={m.n} className="flex-1 text-center px-1 py-1" style={{ borderRadius: 8, background: n >= m.n ? `${PALETTE.legendary}22` : PALETTE.panelLight, border: `1px solid ${n >= m.n ? PALETTE.legendary : PALETTE.panelBorder}` }}>
                <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{m.n}종</div>
                <div className="text-[11px] font-bold" style={{ color: n >= m.n ? PALETTE.legendary : PALETTE.text }}>{n >= m.n ? '✓ ' : ''}잔향 {m.echo}</div>
              </div>
            ))}
          </div>
        </div>
        {branches.map(br => (
          <div key={br}>
            <div className="text-[12px] font-bold mb-1" style={{ color: PALETTE.dawn }}>{br} 갈래</div>
            <div className="space-y-1.5">
              {REGRESSION_ENDINGS.filter(e => e.branch === br).map(e => {
                const has = reg.endings.includes(e.id);
                const log = reg.endingLog?.[e.id];
                return (
                  <div key={e.id} className="px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${has ? `${PALETTE.legendary}66` : PALETTE.panelBorder}` }}>
                    <div className="text-[13px] font-bold" style={{ color: has ? PALETTE.legendary : PALETTE.textDim }}>{has ? `◆ ${e.name}` : '◇ ???'}</div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>조건: {e.hint}</div>
                    {has && <div className="text-[12px] mt-1" style={{ color: PALETTE.text }}>{e.text}</div>}
                    {has && REGRESSION_EPILOGUES[e.id] && <div className="text-[11px] mt-1 italic" style={{ color: PALETTE.textDim }}>{REGRESSION_EPILOGUES[e.id]}</div>}
                    {has && log && <div className="text-[11px] mt-1" style={{ color: PALETTE.dawn }}>처음 본 생: {log.life}번째 생 · {classById(log.classId)?.name || '?'} · D{log.day}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button className="ui-press w-full text-[13px] font-bold" onClick={onClose}
          style={{ minHeight: 44, borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text }}>닫기</button>
      </div>
    </BottomSheet>
  );
}
const AUTO_SPEEDS = [2, 5, 10, AUTO_SPEED_SKIP];
const CAUSE_TEXT = {
  death: { icon: '💀', title: '쓰러졌다', desc: '눈앞이 어두워지고 — 다시 여명의 마을에서 눈을 뜬다.' },
  timeout: { icon: '⌛', title: '황혼이 왔다', desc: '이름이 알려지지 않은 자에게 첨탑의 문은 열리지 않았다.' },
  spireLose: { icon: '🗼', title: '첨탑에서 쓰러졌다', desc: '정상까지 닿지 못했다. 하지만 계단의 기억은 남는다.' },
  victory: { icon: '👑', title: '황혼의 첨탑 정복', desc: '황혼이 걷히고, 회귀의 고리가 끊어졌다.' },
};

function regionLabel(id) {
  return id === REGRESSION_HUB ? '여명의 마을' : (getRegressionRegion(id)?.name || '');
}

function Bar({ value, max, color, label, right }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1" style={{ color: PALETTE.textDim }}>
        <span>{label}</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{right}</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, title, sub, onClick, color = PALETTE.dawn, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="ui-press w-full flex items-center gap-3 px-3 text-left"
      style={{ minHeight: 52, borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${color}55`, opacity: disabled ? 0.4 : 1 }}>
      <Icon size={18} color={color} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold" style={{ color: PALETTE.text }}>{title}</div>
        {sub && <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{sub}</div>}
      </div>
    </button>
  );
}

// 기록서 — 18종 적의 기록 상태
function RecordBook({ reg, run, onClose }) {
  return (
    <BottomSheet title="📖 기록서" onClose={onClose}>
      <div className="space-y-3 pb-2">
        <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
          적이 행동할 때마다 게이지 +{REGRESSION_TUNING.recordPerPattern}% (지능 보정). 예고된 대공격을 회피·방어·기절로 받아내면 ×{REGRESSION_TUNING.heavyCounterMult}. 100%가 된 전투에서 이기면 보상을 얻는다.
        </div>
        {REGRESSION_REGIONS.map(r => (
          <div key={r.id}>
            <div className="text-[12px] font-bold mb-1.5" style={{ color: PALETTE.dawn }}>{r.name}</div>
            <div className="space-y-1.5">
              {Object.keys(REGRESSION_RECORDS).filter(k => ENEMIES[k]?.chapter === r.chapterId).map(k => {
                const learned = run?.learned?.includes(k);
                const gauge = run?.records?.[k] || 0;
                const ever = reg.recordsEver?.[k];
                return (
                  <div key={k} className="flex items-center gap-2 px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${learned ? PALETTE.legendary : PALETTE.panelBorder}66` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold truncate" style={{ color: learned ? PALETTE.legendary : PALETTE.text }}>
                        {ENEMIES[k].name} {ENEMIES[k].tier === 'elite' && <span style={{ color: PALETTE.accent, fontSize: 11 }}>강적</span>} {ever && <span style={{ color: PALETTE.textDim, fontSize: 11 }}>· 전생 기록</span>}
                      </div>
                      <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{describeRegressionRecord(k)}</div>
                    </div>
                    <span className="text-[12px] tabular-nums font-bold" style={{ color: learned ? PALETTE.legendary : PALETTE.dawn }}>
                      {learned ? '완성' : run ? `${Math.floor(gauge)}%` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button className="ui-press w-full text-[13px] font-bold" onClick={onClose}
          style={{ minHeight: 44, borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text }}>닫기</button>
      </div>
    </BottomSheet>
  );
}

export default function RegressionGame({ reg, meta, onSave, onBack }) {
  const run = reg.run;
  const [pickClass, setPickClass] = useState('wanderer');
  const [customStats, setCustomStats] = useState(null); // 시작 커스텀 화면 (null = 로비)
  const [customSkills, setCustomSkills] = useState([]);  // 시작 일반 스킬 3개
  const [provisions, setProvisions] = useState([]);      // 1.191.0~ 이번 생 출발 준비물 (잔향 소모)
  const [oaths, setOaths] = useState([]);                // 1.197.0~ 황혼의 맹세
  const [showBook, setShowBook] = useState(false);
  const [showEndings, setShowEndings] = useState(false);   // 1.198.0~ 엔딩 도감
  const [banner, setBanner] = useState(null);
  const [carrySel, setCarrySel] = useState([]);
  const [autoSpeed, setAutoSpeed] = useState(() => {
    try { const v = Number(localStorage.getItem('regressionSpeed')); return AUTO_SPEEDS.includes(v) ? v : 2; } catch { return 2; }
  });
  const cycleSpeed = () => setAutoSpeed(sp => {
    const nx = AUTO_SPEEDS[(AUTO_SPEEDS.indexOf(sp) + 1) % AUTO_SPEEDS.length];
    try { localStorage.setItem('regressionSpeed', String(nx)); } catch { /* 저장 불가 무시 */ }
    return nx;
  });
  // 1.191.1~ 전투 준비 화면에서 배속을 바로 고른다 (PM 요청)
  const setSpeed = (v) => { setAutoSpeed(v); try { localStorage.setItem('regressionSpeed', String(v)); } catch { /* 저장 불가 무시 */ } };
  const [showShop, setShowShop] = useState(false);
  const [skillInfo, setSkillInfo] = useState(null);
  const [shopLog, setShopLog] = useState([]);       // 1.188.1~ 이번 상인 방문 거래 내역 (상인을 떠날 때까지 창 유지)   // 1.188.0~ 스킬 정보 시트
  const [menu, setMenu] = useState(null);         // 이야기 화면 보조 메뉴: travel | party | log

  const classData = run ? classById(run.classId) : null;
  const loadout = useMemo(() => (run && classData
    ? buildRegressionLoadout(run, classData.startSkills, REGRESSION_COMBAT.baseHp + (run.level || 0) * REGRESSION_COMBAT.hpPerLevel)
    : null), [run, classData]);
  // PM 결정: 본편 메타 강화 미적용 — 제단 업그레이드를 비운 meta로 전투
  const combatMeta = useMemo(() => ({ ...(meta || {}), upgrades: {} }), [meta]);

  const saveRun = (nextRun, extra = {}) => onSave({ run: nextRun, ...extra });
  // 1.185.0~ 오늘의 일 — 할 일이 없으면 랜덤 카드 1장을 굴린다 (렌더 밖에서 1회, 결과는 저장돼 새로고침해도 같다)
  const needRoll = !!run && !run.over && !run.today && !run.scene && !run.pending && !run.pendingEvent && !run.pendingLearn && !run.pendingGear && !run.pendingAwaken && !run.secret
    && run.spireRound == null && !isRegressionSpireDay(run);
  useEffect(() => {
    if (!needRoll) return;
    let next = rollRegressionDay(run, reg.memories || []);
    if (next.scene && run.day === 1 && run.region === REGRESSION_HUB) {
      const wake = (reg.loops || 0) === 0 ? '눈을 뜨자 낯선 마을의 천장이 보였다. 분명 죽었을 텐데 — 몸에는 상처 하나 없다.' : `또다시 여명의 마을에서 눈을 떴다. ${(reg.loops || 0) + 1}번째 아침이다. 기억은 아직 선명하다.`;
      next = { ...next, scene: { ...next.scene, text: `${wake}\n\n${next.scene.text}` } };
    }
    saveRun(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRoll, run?.day]);
  // 1.181.0~ 능력치 10종. combatStats(구 4능력치 환산)는 동료 화술 판정·기록 게이지 보정에만 남음
  const storyStats = run ? regressionEffectiveStats(run) : {};   // 1.184.0~ 실효 능력치 (기본 + 사건 + 장비)
  const baseStats = run ? regressionRunStats(run) : {};
  const combatStats = run ? regressionLegacyCombatStats(storyStats) : {};


  // ===== 회귀 정산 화면 =====
  if (run?.over) {
    const settle = settleRegression(reg, run);
    const slots = regressionCarrySlots(settle.meta);
    const c = CAUSE_TEXT[run.over] || CAUSE_TEXT.death;
    const confirm = () => {
      const next = setRegressionCarry(settle.meta, carrySel);
      setCarrySel([]);
      onSave({ ...next, run: null });
    };
    return (
      <div className="h-full flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
        <ScreenHeader title={c.title} subtitle={`${reg.loops + 1}번째 생 · D${Math.min(run.day, run.maxDays)}`} />
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          <GlassPanel strong style={{ padding: 16, textAlign: 'center' }}>
            <div className="text-[40px]">{c.icon}</div>
            <div className="text-[12px] mt-1" style={{ color: PALETTE.textDim }}>{c.desc}</div>
          </GlassPanel>
          {regressionEndingFor(run) && (() => {
            const end = regressionEndingFor(run);
            return (
              <GlassPanel strong style={{ padding: 14, border: `1px solid ${PALETTE.legendary}66` }}>
                <div className="text-[11px]" style={{ color: PALETTE.textDim }}>엔딩 · {end.branch} 갈래</div>
                <div className="text-[15px] font-bold" style={{ color: PALETTE.legendary }}>👑 {end.name}</div>
                <div className="text-[12px] mt-1" style={{ color: PALETTE.text }}>{end.text}</div>
                {REGRESSION_EPILOGUES[end.id] && <div className="text-[12px] mt-2 pt-2 italic" style={{ color: PALETTE.textDim, borderTop: `1px solid ${PALETTE.panelBorder}` }}>{REGRESSION_EPILOGUES[end.id]}</div>}
                {!reg.endings.includes(end.id) && <div className="text-[11px] mt-1.5 font-bold" style={{ color: PALETTE.green }}>✦ 새 엔딩 — 도감 {reg.endings.length + 1}/{REGRESSION_ENDINGS.length}{settle.endingReward ? ` · 수집 보상 잔향 +${settle.endingReward}` : ''}</div>}
              </GlassPanel>
            );
          })()}
          <GlassPanel style={{ padding: 14 }}>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['명성', run.fame], ['기록', `${run.learned.length}종`], ['처치', run.kills.normal + run.kills.elite]].map(([l, v]) => (
                <div key={l}><div className="text-[11px]" style={{ color: PALETTE.textDim }}>{l}</div><div className="text-[17px] font-bold tabular-nums" style={{ color: PALETTE.text }}>{v}</div></div>
              ))}
            </div>
          </GlassPanel>
          <GlassPanel style={{ padding: 12 }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>🔔 잔향 +{settle.echoGain}{run.oaths?.length ? ` (⛓ 맹세 ×${regressionOathEchoMult(run.oaths).toFixed(2)})` : ''}</span>
              <span className="text-[11px]" style={{ color: PALETTE.textDim }}>보유 {settle.meta.echo} · 시작 특성 해금에 쓴다</span>
            </div>
          </GlassPanel>
          {settle.grave && (
            <GlassPanel style={{ padding: 12 }}>
              <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>⚱ 유품이 묻혔다 — 다음 생 D{settle.grave.day}</div>
              <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{settle.grave.gearId ? `${regressionGearLabel(settle.grave.gearId)}` : '장비 없음'}{settle.grave.gold ? ` · 은화 ${settle.grave.gold}` : ''} — 다음 생 같은 날 무덤을 찾으면 회수할 수 있다.{reg.grave && !run.graveRecovered ? ' (회수하지 않은 이전 무덤은 덮인다)' : ''}</div>
            </GlassPanel>
          )}
          {settle.gainedMemories.length > 0 && (
            <GlassPanel style={{ padding: 14 }}>
              <div className="text-[12px] font-bold mb-2" style={{ color: PALETTE.legendary }}>🧩 새 기억 조각 {settle.gainedMemories.length}개</div>
              <div className="space-y-1.5">
                {settle.gainedMemories.map(id => {
                  const m = getRegressionMemory(id);
                  return (
                    <div key={id} className="px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.legendary}55` }}>
                      <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>{m.name}</div>
                      <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{m.desc}</div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          )}
          {run.over !== 'victory' && (
            <GlassPanel style={{ padding: 14 }}>
              <div className="text-[12px] font-bold mb-1" style={{ color: PALETTE.dawn }}>📖 다음 생에 들고 갈 기록 ({carrySel.length}/{slots})</div>
              <div className="text-[11px] mb-2" style={{ color: PALETTE.textDim }}>고른 기록은 다음 생에 게이지 {REGRESSION_TUNING.carryRecordPct}%에서 시작한다.</div>
              {settle.carryOptions.length === 0 ? (
                <div className="text-[11px]" style={{ color: PALETTE.textDim }}>이번 생에 완성한 기록이 없다.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {settle.carryOptions.map(k => {
                    const on = carrySel.includes(k);
                    return (
                      <button key={k} className="ui-press px-2.5" onClick={() => setCarrySel(on ? carrySel.filter(x => x !== k) : (carrySel.length < slots ? [...carrySel, k] : carrySel))}
                        style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', fontSize: 12, background: on ? `${PALETTE.legendary}22` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, color: on ? PALETTE.legendary : PALETTE.text }}>
                        {ENEMIES[k].name} <span style={{ color: PALETTE.textDim, fontSize: 11 }}>{describeRegressionRecord(k)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassPanel>
          )}
          <UIButton variant="primary" className="w-full ui-sheen" onClick={confirm}>{run.over === 'victory' ? '여명의 마을로' : '회귀한다'}</UIButton>
        </div>
      </div>
    );
  }

  // ===== 전투 (탐험 / 첨탑) — 1.182.0~ 전용 전투 (시안 2, RegressionBattle) =====
  // 흐름: 적 확정(pending / spireRound) → 전투 준비(태세·벨트) → 자동 전투 재생(개입 불가) → 결과 장면
  const inSpire = run && run.spireRound != null && !run.over;
  if (run && loadout && (run.pending || (inSpire && !run.scene && !run.pendingLearn && !run.pendingGear && !run.pendingAwaken))) {
    const compFx = aggregateRegressionCompanions(run);
    // 1.194.0~ 첨탑은 길(spireRoute)마다 구성이 다르고, 길목의 군주는 일러스트를 빌린 전용 적
    const spireEnemy = inSpire ? regressionSpireEnemyFor(run, run.spireRound, compFx.spireWeakness) : null;
    const enemyKey = inSpire ? spireEnemy.key : run.pending.enemyKey;
    const override = inSpire ? spireEnemy.obj : (run.pending.routeBoss ? buildRegressionRouteBoss(run.pending.route, run.pending.routeBoss) : null);
    const enemyObj = override || ENEMIES[enemyKey];
    const spireLen = regressionSpireChain(run).length;
    const committed = inSpire ? (run.spirePrepared || null) : (run.pending.prepared || null);
    const tier = inSpire ? 'boss' : run.pending.tier;
    const lo = run.loadout || {};
    const activeRelics = (lo.activeRelics?.length ? loadout.relics.filter(r => lo.activeRelics.includes(r.name)) : loadout.relics).slice(0, REGRESSION_TUNING.relicSlots);
    const relicBonus = {};
    activeRelics.forEach(r => Object.entries(r.statBonus || {}).forEach(([k, v]) => { relicBonus[k] = (relicBonus[k] || 0) + v; }));
    // 1.188.0~ 패시브 폐지 — 기록서·동료·구 패시브는 실효 능력치(regressionEffectiveStats)로 반영된다
    for (const [k, v] of Object.entries(regressionCombatBonus(run))) relicBonus[k] = (relicBonus[k] || 0) + v; // 1.190.0~ 유니크 장비 + 동료 전투 효과
    const finishSpire = (win, taken, usedPotions = []) => {
      let next = applyRegressionSpireResult(consumeRegressionPotions(run, usedPotions), { win, hpPct: regressionPostCombatHpPct(loadout.hp, loadout.maxHp, taken, true, compFx.spireWoundCut) });
      next = { ...next, spirePrepared: null };
      if (win && !next.over) {
        const hpLoss = Math.round((run.hpPct - next.hpPct) * 100);
        next.scene = regressionResultScene(`[전투 당신 vs ${regressionEnemyLabel(enemyKey, 'boss', enemyObj)}] - 승리!`,
          `첨탑 ${run.spireRound + 1}층의 주인이 무너졌다. 계단 위에서 더 짙은 황혼이 내려다보고 있다.`,
          [hpLoss > 0 ? { text: `HP -${hpLoss}%`, tone: 'bad' } : null, { text: `다음 층 ${run.spireRound + 2}/${spireLen}`, tone: 'gold' }]);
        // 1.183.0~ 군주 격파 = 기연의 기회 (적성 판정)
        const offer = offerRegressionLearn(next, 'boss', enemyKey);
        if (offer) { next.pendingLearn = offer; next.scene.tags.push({ text: '흩어지는 힘 속에서 깨달음이 스친다', tone: 'gold' }); }
      }
      saveRun(next);
    };
    const finishExplore = (win, taken, observations, usedPotions = []) => {
      const tier = run.pending.tier;
      const label = regressionEnemyLabel(enemyKey, tier, override);
      const enemyName = enemyObj?.name || enemyKey;
      const { run: afterCombat, learnedNow } = applyRegressionCombat(consumeRegressionPotions(run, usedPotions), {
        enemyKey, tier, win,
        hpPct: regressionPostCombatHpPct(loadout.hp, loadout.maxHp, taken), observations, intStat: combatStats.지능 || 10,
      });
      let next = afterCombat;
      if (!win) {
        // 1.187.0~ 생환 — 쓰러졌지만 일어났다
        if (next.revivedNow) {
          const { revivedNow, ...rest } = next;
          saveRun({ ...rest, scene: regressionResultScene(`[전투 당신 vs ${label}] - 패배`, '눈앞이 캄캄해졌다 — 그런데 촛불 하나가 꺼지지 않는다. 숨이 돌아온다. 아직은 끝이 아니다.', [{ text: '🕯 생환 — HP 30%로 일어났다', tone: 'gold' }, { text: '이번 생의 생환 소진', tone: 'bad' }]) });
          return;
        }
        saveRun(next); return;
      }
      const tags = [];
      tags.push({ text: `명성 +${next.fame - run.fame}`, tone: 'gold' });
      const moonMult = run.pending?.redMoon ? REGRESSION_RED_MOON.rewardMult : 1;
      const gold = regressionVictoryGold(next, enemyKey) * moonMult;
      next = { ...next, gold: (next.gold || 0) + gold };
      tags.push({ text: `은화 +${gold}`, tone: 'good' });
      for (let li = 0; li < moonMult; li++) {
        const loot = rollRegressionLoot(next, tier);
        next = applyRegressionLoot(next, loot);
        const lootTxt = describeRegressionLoot(loot);
        if (lootTxt) tags.push({ text: lootTxt, tone: 'good' });
      }
      if (moonMult > 1) tags.unshift({ text: `🌕 붉은 달 — 보상 ×${moonMult}`, tone: 'gold' });
      tags.push({ text: `경험치 +${(REGRESSION_EXP[tier] || 0) * moonMult}`, tone: 'good' });
      if ((next.level || 0) > (run.level || 0)) tags.push({ text: `레벨 상승 ${run.level || 0}→${next.level}`, tone: 'gold' }, { text: `추가 능력치 +${next.level - (run.level || 0)}`, tone: 'gold' });
      if (learnedNow.length) tags.push({ text: `기록 완성 — ${describeRegressionRecord(learnedNow[0])}`, tone: 'gold' });
      else if (REGRESSION_RECORDS[enemyKey] && !run.learned.includes(enemyKey)) {
        const g = Math.round((next.records[enemyKey] || 0) - (run.records[enemyKey] || 0));
        if (g > 0) tags.push({ text: `기록 +${g}% (${Math.floor(next.records[enemyKey])}%)`, tone: 'good' });
      }
      const hpLoss = Math.round((run.hpPct - next.hpPct) * 100);
      if (hpLoss > 0) tags.push({ text: `HP -${hpLoss}%`, tone: 'bad' });
      const lines = [`${enemyName}이(가) 쓰러졌다. 숨을 고르고 주위를 살핀다.`, `${enemyName}의 마지막 일격을 흘려 내고, 승부를 끝냈다.`, `쓰러진 ${enemyName} 곁에서 쓸 만한 것을 챙겨 길을 나선다.`];
      // 1.201.0~ 숨겨진 장소 수호자 — 3층(보물)로
      if (run.pending.secret && run.secret) {
        next.secret = { ...run.secret, floor: 3 };
        next.scene = regressionResultScene(`[수호자 ${enemyName}] - 승리!`, '수호자가 무너지자 마지막 문이 저절로 열린다.', tags);
        saveRun(next); return;
      }
      // 1.194.0~ 길목의 군주 — 길마다 다른 보상 + 기연 기회 확정
      if (run.pending.routeBoss) {
        const rr = applyRegressionRouteReward(next, run.pending.route, run.pending.routeBoss);
        next = rr.run; tags.push(...rr.tags);
        const bo = offerRegressionLearn(next, 'boss', enemyKey);
        if (bo) { next.pendingLearn = bo; tags.push({ text: '군주의 힘이 흩어지며 깨달음이 스친다', tone: 'gold' }); }
        next.scene = regressionResultScene(`[길목의 군주 ${enemyName}] - 승리!`, `${enemyName}이(가) 무너졌다. ${REGRESSION_ROUTES[run.pending.route]?.name || '이 길'}이 한층 선명해진다.`, tags);
        saveRun(next); return;
      }
      // 1.183.0~ 배울 기회 — 일반 몹 12% (일반 스킬) / 강적 60% (고급 스킬). 실제 습득은 적성 판정
      const offer = offerRegressionLearn(next, tier === 'elite' ? 'elite' : 'normal', enemyKey);
      if (offer) { next.pendingLearn = offer; tags.push({ text: tier === 'elite' ? '비급서를 발견했다' : '기술 하나를 엿봤다', tone: 'gold' }); }
      // 1.184.0~ 강적 8% — 유니크 무구 (적성 판정)
      const uq = tier === 'elite' ? offerRegressionUnique(next, enemyKey) : null;
      if (uq) { next.pendingGear = uq; tags.push({ text: '주인을 고르는 무구가 울린다', tone: 'gold' }); }
      next.scene = regressionResultScene(`[전투 당신 vs ${label}] - 승리!`, lines[run.day % lines.length], tags);
      saveRun(next);
    };
    const commit = ({ stanceId, belt }) => {
      const st = getRegressionStance(stanceId);
      const base = { ...run, flames: Math.max(0, (run.flames ?? REGRESSION_FLAMES_PER_LIFE) - (st.flames || 0)), loadout: { ...lo, belt } };
      saveRun(inSpire ? { ...base, spirePrepared: { stanceId, belt } } : { ...base, pending: { ...run.pending, prepared: { stanceId, belt } } });
    };
    return (
      <RegressionBattle
        key={`${run.day}-${enemyKey}-${run.spireRound ?? 'x'}`}
        classData={classData}
        enemyKey={enemyKey}
        enemyObj={enemyObj}
        enemyLabel={regressionEnemyLabel(enemyKey, tier, override)}
        regionKey={inSpire ? 'spire' : run.region}
        enemyMult={inSpire ? 1 : regressionDayEnemyMult(run.day) * (run.pending?.redMoon ? REGRESSION_RED_MOON.enemyMult : 1)}
        enemyExtra={(() => { const om = regressionOathEnemyMult(run, inSpire); const moon = !inSpire && run.pending?.redMoon ? REGRESSION_RED_MOON.enemyMult : !inSpire && run.pending?.secret ? REGRESSION_SECRET.guardianMult : 1; return { hp: om.hp * moon, dmg: om.dmg * moon }; })()}
        intro={inSpire ? `첨탑 ${run.spireRound + 1}/${spireLen}층. ${regressionEnemyLabel(enemyKey, 'boss', enemyObj)}이(가) 길을 막아선다.` : `${regressionEnemyLabel(enemyKey, tier, override)}이(가) 앞을 막아선다. 피할 수는 없다.`}
        stats={storyStats}
        level={run.level || 0}
        maxHp={loadout.maxHp}
        hp={loadout.hp}
        skills={regressionRunSkills(run)}
        skillLv={run.skillLv || {}}
        awakenId={run.awaken || null}
        relicBonus={relicBonus}
        potions={run.potions || {}}
        beltSlots={regressionBeltSlots(run.classId, run)}
        defaultBelt={lo.belt || []}
        flames={run.flames ?? REGRESSION_FLAMES_PER_LIFE}
        committed={committed}
        speed={autoSpeed}
        speedLabel={autoSpeed >= AUTO_SPEED_SKIP ? '⏩ 스킵' : `배속 ×${autoSpeed}`}
        onCycleSpeed={cycleSpeed}
        speedOptions={AUTO_SPEEDS.map(v => ({ value: v, label: v >= AUTO_SPEED_SKIP ? '⏩ 스킵' : `×${v}` }))}
        onSetSpeed={setSpeed}
        onCommit={commit}
        onFinish={(res) => (inSpire ? finishSpire(res.win, res.damageTaken, res.usedPotions) : finishExplore(res.win, res.damageTaken, res.observations, res.usedPotions))}
      />
    );
  }

  // ===== 로비 =====
  if (!run) {
    const startLife = () => { setBanner(null); setCustomStats(regressionPresetStats(pickClass)); setCustomSkills(REGRESSION_SKILL_PRESETS[pickClass] || []); };
    // ===== 시작 커스텀 — 능력치 배분 (원작 「남은 능력치」 화면) =====
    if (customStats) {
      const tfx = aggregateRegressionStartTraits(reg.equippedTraits || [], reg);
      const provCost = regressionProvisionsCost(provisions);
      const skillCount = Math.max(1, REGRESSION_START_SKILL_COUNT + (tfx.startSkills || 0) + regressionOathFx(oaths).startSkills);
      const spent = regressionStatsSpent(customStats);
      const left = REGRESSION_START_POINTS + (tfx.startPoints || 0) - spent;
      const adj = (k, d) => {
        const v = customStats[k] + d;
        if (v < 0 || v > REGRESSION_START_CAP || (d > 0 && left <= 0)) return;
        setCustomStats({ ...customStats, [k]: v });
      };
      const groups = ['신체', '전투술', '비전투'];
      const cls = classById(pickClass);
      return (
        <div className="h-full flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
          <ScreenHeader title="능력치 배분" subtitle={`${cls?.name} · 남은 능력치 ${left}`} onBack={() => setCustomStats(null)} />
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
            <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>
              능력치는 전투 위력과 이야기 판정 성공률을 정한다. 시작 후에는 레벨업 때 얻는 추가 능력치로만 바꿀 수 있다. 시작 상한 {REGRESSION_START_CAP}.
            </div>
            {groups.map(g => (
              <GlassPanel key={g} style={{ padding: 12 }}>
                <div className="text-[12px] font-bold mb-2" style={{ color: PALETTE.dawn }}>{g}</div>
                <div className="space-y-1.5">
                  {REGRESSION_STATS.filter(st => st.group === g).map(st => (
                    <div key={st.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold" style={{ color: PALETTE.text }}>{st.id}</div>
                        <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{st.desc}</div>
                      </div>
                      <button aria-label={`${st.id} 내리기`} className="ui-press" onClick={() => adj(st.id, -1)} disabled={customStats[st.id] <= 0}
                        style={{ width: 40, height: 40, borderRadius: 10, background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text, opacity: customStats[st.id] <= 0 ? 0.35 : 1 }}>−</button>
                      <b className="text-[16px] tabular-nums text-center" style={{ width: 24, color: customStats[st.id] > 0 ? PALETTE.legendary : PALETTE.textDim }}>{customStats[st.id]}</b>
                      <button aria-label={`${st.id} 올리기`} className="ui-press" onClick={() => adj(st.id, 1)} disabled={left <= 0 || customStats[st.id] >= REGRESSION_START_CAP}
                        style={{ width: 40, height: 40, borderRadius: 10, background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text, opacity: left <= 0 || customStats[st.id] >= REGRESSION_START_CAP ? 0.35 : 1 }}>+</button>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            ))}
            <div className="grid grid-cols-3 gap-1.5">
              <UIButton variant="ghost" onClick={() => { setCustomStats(regressionPresetStats(pickClass)); setCustomSkills(REGRESSION_SKILL_PRESETS[pickClass] || []); }}>프리셋</UIButton>
              <UIButton variant="ghost" onClick={() => setCustomStats(regressionRandomStats())}>랜덤</UIButton>
              <UIButton variant="ghost" onClick={() => setCustomStats(emptyRegressionStats())}>초기화</UIButton>
            </div>
            <GlassPanel style={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-1">
                <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>✦ 일반 스킬 — {skillCount}개 선택</div>
                <span className="text-[12px] tabular-nums" style={{ color: customSkills.length === skillCount ? PALETTE.legendary : PALETTE.textDim }}>{customSkills.length}/{skillCount}</span>
              </div>
              <div className="text-[11px] mb-2" style={{ color: PALETTE.textDim }}>육성 방향을 정한다. 스킬 위력은 관련 능력치에 비례하니, 쓰려는 스킬에 맞춰 능력치를 배분하는 편이 유리하다. 전투 중에는 조건이 맞을 때 각 1번만 자동 발동한다.</div>
              <div className="space-y-1.5">
                {REGRESSION_NORMAL_SKILLS.map(id => {
                  const sk = REGRESSION_SKILLS[id];
                  const on = customSkills.includes(id);
                  const full = !on && customSkills.length >= skillCount;
                  const rel = Object.keys(sk.scale || sk.scaleMult || sk.reflect?.scale || {});
                  return (
                    <button key={id} disabled={full} onClick={() => setCustomSkills(on ? customSkills.filter(x => x !== id) : [...customSkills, id])}
                      className="ui-press w-full text-left px-2.5 py-2" style={{ minHeight: 48, borderRadius: 'var(--r-chip, 8px)', background: on ? `${PALETTE.legendary}1a` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, opacity: full ? 0.4 : 1 }}>
                      <div className="text-[12px] font-bold" style={{ color: on ? PALETTE.legendary : PALETTE.text }}>{sk.name} <span className="font-normal text-[11px]" style={{ color: PALETTE.textDim }}>· {rel.join('·')} · 위력 {regressionSkillValue(id, customStats)}{['buff', 'revive', 'guard'].includes(sk.effect) ? '%' : ''}</span></div>
                      <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{sk.desc}</div>
                    </button>
                  );
                })}
              </div>
            </GlassPanel>
            <GlassPanel style={{ padding: 12 }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>🎒 출발 준비물 — 이번 생에만</div>
                <span className="text-[11px] tabular-nums" style={{ color: PALETTE.legendary }}>잔향 {(reg.echo || 0) - provCost} / {reg.echo || 0}</span>
              </div>
              <div className="space-y-1.5">
                {REGRESSION_PROVISIONS.map(pv => {
                  const on = provisions.includes(pv.id);
                  const can = on || (reg.echo || 0) - provCost >= pv.cost;
                  return (
                    <button key={pv.id} disabled={!can} onClick={() => setProvisions(on ? provisions.filter(x => x !== pv.id) : [...provisions, pv.id])}
                      className="ui-press w-full flex items-center gap-2 px-2.5 text-left"
                      style={{ minHeight: 44, borderRadius: 'var(--r-chip, 8px)', background: on ? `${PALETTE.legendary}18` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, opacity: can ? 1 : 0.45 }}>
                      <span className="text-[16px]">{pv.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold" style={{ color: on ? PALETTE.legendary : PALETTE.text }}>{pv.name}</div>
                        <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{pv.desc}</div>
                      </div>
                      <span className="text-[11px] font-bold flex-none" style={{ color: PALETTE.legendary }}>{on ? '✓ ' : ''}{pv.cost}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: PALETTE.textDim }}>잔향은 출발할 때 빠져나간다. 준비물은 이번 생에서만 쓴다.</div>
            </GlassPanel>
            {reg.loops >= REGRESSION_OATH_UNLOCK_LOOPS ? (
              <GlassPanel style={{ padding: 12 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[12px] font-bold" style={{ color: PALETTE.accent }}>⛓ 황혼의 맹세 — 스스로 족쇄를 건다</div>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: PALETTE.legendary }}>잔향 ×{regressionOathEchoMult(oaths).toFixed(2)}</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(REGRESSION_OATHS).map(([id, o]) => {
                    const on = oaths.includes(id);
                    return (
                      <button key={id} onClick={() => setOaths(on ? oaths.filter(x => x !== id) : [...oaths, id])}
                        className="ui-press w-full flex items-center gap-2 px-2.5 text-left"
                        style={{ minHeight: 44, borderRadius: 'var(--r-chip, 8px)', background: on ? `${PALETTE.accent}22` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.accent : PALETTE.panelBorder}` }}>
                        <span className="text-[16px]">{o.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold" style={{ color: on ? '#f0a59c' : PALETTE.text }}>{o.name}</div>
                          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{o.desc}</div>
                        </div>
                        <span className="text-[11px] font-bold flex-none" style={{ color: PALETTE.legendary }}>{on ? '✓ ' : ''}잔향 +{Math.round(o.echo * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: PALETTE.textDim }}>맹세는 이번 생 내내 풀 수 없다. 이번 생이 끝날 때 받는 잔향이 늘어난다.</div>
              </GlassPanel>
            ) : (
              <div className="text-[11px] px-1" style={{ color: PALETTE.textDim }}>⛓ 황혼의 맹세 — {REGRESSION_OATH_UNLOCK_LOOPS}번 회귀하면 열린다 (현재 {reg.loops}번)</div>
            )}
            <UIButton variant="primary" className="w-full ui-sheen" disabled={left !== 0 || customSkills.length !== skillCount}
              onClick={() => { onSave({ run: createRegressionRun(reg, pickClass, customStats, customSkills, reg.equippedTraits || [], provisions, oaths), echo: Math.max(0, (reg.echo || 0) - provCost) }); setProvisions([]); setOaths([]); setCustomStats(null); }}>
              {left !== 0 ? `능력치를 ${left} 더 배분하세요` : customSkills.length > skillCount ? `일반 스킬을 ${customSkills.length - skillCount}개 빼세요` : customSkills.length !== skillCount ? `일반 스킬을 ${skillCount - customSkills.length}개 더 고르세요` : (reg.loops === 0 ? '여명의 마을에서 눈을 뜬다' : `${reg.loops + 1}번째 생을 시작한다`)}
            </UIButton>
          </div>
        </div>
      );
    }
    const learnedEver = Object.keys(reg.recordsEver || {}).length;
    return (
      <div className="h-full flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
        <ScreenHeader title="🌀 회귀의 탐험가" subtitle={`황혼까지 ${REGRESSION_TUNING.days}일 · 죽으면 여명의 마을로`} onBack={onBack} />
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          <GlassPanel style={{ padding: 14 }}>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[['회귀', reg.loops], ['기억 조각', `${reg.memories.length}/${REGRESSION_MEMORIES.length}`], ['최고 명성', reg.bestFame], ['정복', reg.spireClears]].map(([l, v]) => (
                <div key={l}><div className="text-[11px]" style={{ color: PALETTE.textDim }}>{l}</div><div className="text-[16px] font-bold tabular-nums" style={{ color: PALETTE.text }}>{v}</div></div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: 14 }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: PALETTE.dawn }}>탐험가 선택</div>
            <div className="grid grid-cols-5 gap-1.5">
              {CLASS_IDS.map(id => {
                const c = classById(id);
                const on = pickClass === id;
                return (
                  <button key={id} onClick={() => setPickClass(id)} className="ui-press flex flex-col items-center"
                    style={{ borderRadius: 'var(--r-chip, 8px)', padding: 3, border: `1px solid ${on ? c.color || PALETTE.dawn : PALETTE.panelBorder}`, background: on ? `${c.color || PALETTE.dawn}22` : 'transparent' }}>
                    <img src={`./classes/${id}.jpg`} alt="" className="w-full" style={{ aspectRatio: '1', objectFit: 'cover', borderRadius: 6, opacity: on ? 1 : 0.55 }} />
                    <span className="text-[11px] mt-1 truncate w-full text-center" style={{ color: on ? PALETTE.text : PALETTE.textDim }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] mt-2" style={{ color: PALETTE.textDim }}>
              본편 각인·각성도·제단 강화는 적용되지 않는다. 이 세계의 힘은 <b style={{ color: PALETTE.dawn }}>기록</b>과 <b style={{ color: PALETTE.legendary }}>기억</b>뿐.
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: 14 }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: PALETTE.legendary }}>🧩 기억 조각</div>
            <div className="space-y-1.5">
              {REGRESSION_MEMORIES.map(m => {
                const has = reg.memories.includes(m.id);
                return (
                  <div key={m.id} className="px-2.5 py-1.5" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, opacity: has ? 1 : 0.55 }}>
                    <div className="text-[12px] font-bold" style={{ color: has ? PALETTE.legendary : PALETTE.textDim }}>{has ? m.name : '??? '}<span className="font-normal text-[11px]" style={{ color: PALETTE.textDim }}> — {has ? m.desc : m.hint}</span></div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: 14 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>🔔 시작 특성 — 장착 {(reg.equippedTraits || []).length}/{regressionTraitSlots(reg)}</span>
              <span className="text-[11px] tabular-nums" style={{ color: PALETTE.legendary }}>잔향 {reg.echo || 0}</span>
            </div>
            <div className="space-y-1.5">
              {REGRESSION_START_TRAITS.map(t => {
                const lv = regressionTraitLevel(reg, t.id);
                const on = (reg.equippedTraits || []).includes(t.id);
                const full = !on && (reg.equippedTraits || []).length >= regressionTraitSlots(reg);
                const next = regressionTraitNextCost(reg, t.id);
                const canBuy = next != null && (reg.echo || 0) >= next;
                return (
                  <div key={t.id} className="flex items-center gap-2 px-2.5 py-1.5"
                    style={{ minHeight: 52, borderRadius: 'var(--r-chip, 8px)', background: on ? `${PALETTE.legendary}18` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}` }}>
                    <span className="text-[18px]">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: on ? PALETTE.legendary : lv > 0 ? PALETTE.text : PALETTE.textDim }}>{t.name} {lv > 0 && <span className="text-[11px]" style={{ color: PALETTE.dawn }}>Lv.{lv}/{REGRESSION_TRAIT_TUNING.maxLv}</span>}</div>
                      <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{t.desc(Math.max(1, lv))}</div>
                      {lv > 0 && lv < REGRESSION_TRAIT_TUNING.maxLv && <div className="text-[11px]" style={{ color: PALETTE.green }}>다음 Lv: {t.desc(lv + 1)}</div>}
                    </div>
                    <div className="flex flex-col gap-1 flex-none">
                      {lv > 0 && (
                        <button disabled={full} className="ui-press text-[11px] px-2" onClick={() => onSave(toggleRegressionStartTrait(reg, t.id))}
                          style={{ minHeight: 30, borderRadius: 8, background: on ? `${PALETTE.legendary}33` : 'transparent', border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, color: on ? PALETTE.legendary : PALETTE.dawn, opacity: full ? 0.45 : 1 }}>{on ? '장착 중' : '장착'}</button>
                      )}
                      {next != null && (
                        <button disabled={!canBuy} className="ui-press text-[11px] px-2" onClick={() => onSave(unlockRegressionStartTrait(reg, t.id))}
                          style={{ minHeight: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.legendary, opacity: canBuy ? 1 : 0.45 }}>{lv > 0 ? `강화 ${next}` : `해금 ${next}`}</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {regressionNextSlotCost(reg) != null && (
                <button disabled={(reg.echo || 0) < regressionNextSlotCost(reg)} className="ui-press w-full text-[12px] font-bold" onClick={() => onSave(buyRegressionTraitSlot(reg))}
                  style={{ minHeight: 42, borderRadius: 'var(--r-chip, 8px)', background: 'transparent', border: `1px dashed ${PALETTE.legendary}`, color: PALETTE.legendary, opacity: (reg.echo || 0) >= regressionNextSlotCost(reg) ? 1 : 0.45 }}>
                  ＋ 장착 슬롯 {regressionTraitSlots(reg) + 1}번째 열기 — 잔향 {regressionNextSlotCost(reg)}
                </button>
              )}
            </div>
            <div className="text-[11px] mt-2" style={{ color: PALETTE.textDim }}>잔향은 생을 마칠 때마다 쌓인다 — 명성 10당 1 · 메인 스토리 1편당 2 · 첨탑 1층당 3 · 정복 10 · 새 엔딩 10.</div>
          </GlassPanel>

          <ActionButton icon={BookOpen} title={`👑 엔딩 도감 ${reg.endings.length}/${REGRESSION_ENDINGS.length}`} sub={(() => { const m = REGRESSION_ENDING_MILESTONES.find(x => reg.endings.length < x.n); return m ? `${m.n}종 모으면 잔향 +${m.echo}` : '모든 엔딩을 모았다'; })()} onClick={() => setShowEndings(true)} />
          <ActionButton icon={BookOpen} title={`기록서 (전생 포함 ${learnedEver}/${Object.keys(REGRESSION_RECORDS).length}종)`} sub="적별 기록 보상 보기" onClick={() => setShowBook(true)} />
          <UIButton variant="primary" className="w-full ui-sheen" onClick={startLife}>
            능력치를 정하고 출발한다
          </UIButton>
        </div>
        {showBook && <RecordBook reg={reg} run={null} onClose={() => setShowBook(false)} />}
        {showEndings && <EndingCodex reg={reg} onClose={() => setShowEndings(false)} />}
      </div>
    );
  }

  // ===== 이야기 화면 (1.180.0 — 무림귀환 스타일 전면 개편) =====
  // 서술 → 선택(성공 가능성 라벨) → 결과(보상 태그) → 「다음」. 허브 버튼 목록 대신 이야기 속 선택지로 행동한다.
  const spireDay = isRegressionSpireDay(run);
  const region = getRegressionRegion(run.region);
  const gimmick = region ? CHAPTERS.find(ch => ch.id === region.chapterId)?.gimmick : null;
  const unrecorded = (tier) => region ? regressionEnemyPool(region.id, tier).filter(k => REGRESSION_RECORDS[k] && !run.learned.includes(k)).length : 0;
  const companion = region ? regressionCompanionAt(region.id) : null;
  const eventsLeft = region ? REGRESSION_EVENTS.filter(e => e.region === region.id && !(run.seenEvents || []).includes(e.id)).length : 0;
  const stage = regressionFameStage(run.fame, regressionFameGate(run));
  const famePath = regressionFamePath(run);
  const daysLeft = Math.max(0, run.maxDays - run.day + 1);
  const compFx = aggregateRegressionCompanions(run);
  const scene = run.scene || null;
  const pendingEv = run.pendingEvent ? regressionEventById(run.pendingEvent) : null;

  const nextScene = () => { setMenu(null); saveRun({ ...run, scene: null }); };
  // 1.188.1~ 상인을 떠날 때 하루를 마치고, 이번 방문의 거래를 결과 장면에 모아 보여 준다
  const leaveMerchant = () => {
    const tags = shopLog.map(l => ({ text: l.text, tone: l.tone }));
    setShowShop(false); setShopLog([]);
    saveRun({ ...passRegressionDay(run, '떠돌이 상인과 만남'), scene: regressionResultScene('떠돌이 상인', '"다음에 또 봅시다. 살아 있다면 말이오." 짐마차가 멀어진다.', tags) });
  };
  const logShop = (text, tone = 'good') => setShopLog(l => [...l, { text, tone }]);
  const explore = (tier) => {
    const key = rollRegressionEnemy(run.region, tier);
    if (!key) return;
    saveRun(startRegressionCombat({ ...run, scene: null }, key, tier));
  };
  const rest = () => {
    const before = run.hpPct;
    const next = applyRegressionRest(run);
    const gain = Math.round((next.hpPct - before) * 100);
    saveRun({ ...next, scene: regressionResultScene('야영', compFx.restHealPct ? '모닥불 곁에서 밤을 보냈다. 동료가 상처를 살펴 주었다.' : '모닥불 곁에서 밤을 보냈다. 상처가 조금 아물었다.', [{ text: `HP +${gain}%`, tone: 'good' }]) });
  };
  const travel = (to) => { setMenu(null); saveRun({ ...applyRegressionTravel(run, to), scene: null }); };
  const startEvent = () => {
    const ev = rollRegressionEvent(run, reg.memories);
    if (ev) saveRun({ ...run, scene: null, pendingEvent: ev.id });
  };
  const talk = () => {
    const before = run.affinity?.[companion.id] || 0;
    const next = applyRegressionTalk(run, companion.id, combatStats.매력 || 10);
    const after = next.affinity[companion.id];
    const upTier = regressionCompanionTier(after).id !== regressionCompanionTier(before).id;
    saveRun({ ...next, scene: regressionResultScene(`${companion.name} — ${companion.title}`, regressionCompanionLine(companion.id, after),
      [{ text: `호감 +${after - before} (${after}/100)`, tone: 'good' }, upTier ? { text: `「${regressionCompanionTier(after).name}」 달성`, tone: 'gold' } : null]) });
  };
  const chooseEvent = (choice) => {
    const res = resolveRegressionChoice(choice, storyStats);
    const { run: next, notes } = applyRegressionEvent({ ...run, pendingEvent: null }, pendingEv.id, res, { maxHp: loadout.maxHp });
    const checkTag = res.check ? [{ text: res.check === 'ok' ? `${choice.stat} - 성공!` : `${choice.stat} - 실패!`, tone: res.check === 'ok' ? 'gold' : 'bad' }] : [];
    saveRun({ ...next, scene: regressionResultScene(pendingEv.title, res.text, [...checkTag, ...regressionNotesToTags(notes)]) });
  };

  const TONE = { good: PALETTE.green, bad: PALETTE.accent, gold: PALETTE.legendary };
  const Choice = ({ text, sub, onClick, disabled, label }) => (
    <button onClick={onClick} disabled={disabled} className="ui-press w-full text-left px-3 py-2.5"
      style={{ minHeight: 44, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, opacity: disabled ? 0.4 : 1 }}>
      <div className="flex items-start gap-2">
        <span className="text-[13px] font-bold" style={{ color: PALETTE.dawn }}>&gt;</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px]" style={{ color: PALETTE.text }}>
            {label && <b style={{ color: label.color, marginRight: 6 }}>{label.stat} {label.text}</b>}{text}
          </div>
          {sub && <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>{sub}</div>}
        </div>
      </div>
    </button>
  );

  // 이야기 본문 — 우선순위: 결과 장면 > 사건 > 첨탑의 날 > 이동 메뉴 > 하루 선택지
  let body;
  if (scene) {
    body = (
      <div className="space-y-3 ui-screen-enter">
        {scene.title && <div className="text-[14px] font-bold" style={{ color: PALETTE.legendary }}>{scene.title}</div>}
        {scene.text && <div className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>{scene.text}</div>}
        {scene.tags?.length > 0 && (
          <div className="space-y-1">
            {scene.tags.map((t, i) => <div key={i} className="text-[13px] font-bold" style={{ color: TONE[t.tone] || PALETTE.text }}>[{t.text}]</div>)}
          </div>
        )}
        <Choice text="다음" onClick={nextScene} />
      </div>
    );
  } else if (run.pendingAwaken && (REGRESSION_AWAKENINGS[run.classId] || []).length) {
    // 1.199.0~ 각성 분기 — 2택 1, 이번 생 동안 유지
    const perk = getRegressionClassPerk(run.classId);
    body = (
      <div className="space-y-3 ui-screen-enter">
        <div className="text-[14px] font-bold" style={{ color: PALETTE.legendary }}>✦ 각성 — Lv.{REGRESSION_AWAKEN_LEVEL}</div>
        <div className="text-[14px] leading-relaxed" style={{ color: PALETTE.text }}>몸 깊은 곳에서 무언가 깨어난다. {perk ? `「${perk.name}」이(가) 두 갈래로 갈라진다.` : ''} 하나만 고를 수 있다 — 이번 생이 끝날 때까지.</div>
        <div className="space-y-1.5">
          {REGRESSION_AWAKENINGS[run.classId].map(a => (
            <Choice key={a.id} text={`「${a.name}」`} sub={a.desc} onClick={() => saveRun({ ...chooseRegressionAwakening(run, a.id), scene: regressionResultScene(`각성 — ${a.name}`, '힘의 결이 하나로 모였다. 싸움의 방식이 달라질 것이다.', [{ text: a.desc, tone: 'gold' }]) })} />
          ))}
        </div>
      </div>
    );
  } else if (run.pendingLearn && REGRESSION_SKILLS[run.pendingLearn.skillId]) {
    // 1.183.0~ 스킬 습득 기회 — 적성(관련 능력치 ÷ 내 최고 능력치)으로 성공률 결정
    const pl = run.pendingLearn;
    const sk = REGRESSION_SKILLS[pl.skillId];
    const tierInfo = REGRESSION_SKILL_TIERS[sk.tier];
    const intro = regressionLearnIntro(pl);
    const knownLv = regressionRunSkills(run).includes(pl.skillId) ? regressionRunSkillLv(run, pl.skillId) : 0;
    const p = regressionLearnChance(pl.skillId, storyStats, knownLv > 0);
    const apt = regressionSkillAptitude(pl.skillId, storyStats);
    const lab = regressionChanceLabel(p);
    body = (
      <div className="space-y-3 ui-screen-enter">
        <div className="text-[14px] font-bold" style={{ color: tierInfo.color }}>◆ {intro.title}</div>
        <div className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>{intro.text}</div>
        <GlassPanel style={{ padding: 12 }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-1.5 rounded" style={{ color: tierInfo.color, border: `1px solid ${tierInfo.color}` }}>{tierInfo.name}</span>
            <b className="text-[13px]" style={{ color: PALETTE.text }}>{sk.name}</b>
            {knownLv > 0 && <span className="text-[11px] font-bold" style={{ color: PALETTE.legendary }}>숙련 Lv.{knownLv} → Lv.{knownLv + 1}</span>}
          </div>
          <div className="text-[12px] mt-1" style={{ color: PALETTE.dawn }}>발동: {regressionTriggerText(pl.skillId)}</div>
          <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>{sk.desc}</div>
          <div className="text-[11px] mt-1.5" style={{ color: PALETTE.textDim }}>
            관련 능력치 {regressionSkillStats(pl.skillId).map(k => `${k} ${storyStats[k] || 0}`).join(' · ')} → 적성 <b style={{ color: apt >= 0.6 ? PALETTE.green : apt >= 0.3 ? PALETTE.dawn : PALETTE.accent }}>{Math.round(apt * 100)}%</b>
          </div>
        </GlassPanel>
        <div className="space-y-1.5">
          <Choice text="익혀 본다" label={{ stat: '습득', text: `${lab.text} ${Math.round(p * 100)}%`, color: lab.color }}
            sub={apt < 0.3 ? '내 빌드와 거리가 먼 기술이다 — 실패하면 기회는 사라진다' : '실패하면 기회는 사라진다 · 날짜 소모 없음'}
            onClick={() => { const r = resolveRegressionLearn(run, true); saveRun({ ...r.run, scene: r.scene }); }} />
          <Choice text="지나친다" onClick={() => { const r = resolveRegressionLearn(run, false); saveRun({ ...r.run, scene: r.scene }); }} />
        </div>
      </div>
    );
  } else if (run.pendingGear && REGRESSION_GEAR[run.pendingGear.gearId]) {
    // 1.184.0~ 유니크 — 다룰 수 있는지 적성 판정
    const pg = run.pendingGear;
    const g = REGRESSION_GEAR[pg.gearId];
    const intro = regressionUniqueIntro(pg);
    const p = regressionUniqueChance(pg.gearId, storyStats);
    const apt = regressionAptitude(g.rel || [], storyStats);
    const lab = regressionChanceLabel(p);
    body = (
      <div className="space-y-3 ui-screen-enter">
        <div className="text-[14px] font-bold" style={{ color: REGRESSION_GEAR_GRADES.unique.color }}>◆ {intro.title}</div>
        <div className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>{intro.text}</div>
        <GlassPanel style={{ padding: 12 }}>
          <div className="text-[13px] font-bold" style={{ color: REGRESSION_GEAR_GRADES.unique.color }}>{regressionGearLabel(pg.gearId)} <span className="text-[11px] font-normal" style={{ color: PALETTE.textDim }}>· {REGRESSION_GEAR_SLOTS.find(x => x.id === g.slot)?.name}</span></div>
          <div className="text-[12px] mt-1" style={{ color: PALETTE.dawn }}>{regressionGearStatText(pg.gearId)}</div>
          <div className="text-[11px] mt-1.5" style={{ color: PALETTE.textDim }}>
            다루는 능력치 {(g.rel || []).map(k => `${k} ${storyStats[k] || 0}`).join(' · ')} → 적성 <b style={{ color: apt >= 0.6 ? PALETTE.green : apt >= 0.3 ? PALETTE.dawn : PALETTE.accent }}>{Math.round(apt * 100)}%</b>
          </div>
        </GlassPanel>
        <div className="space-y-1.5">
          <Choice text="손에 쥐어 본다" label={{ stat: '획득', text: `${lab.text} ${Math.round(p * 100)}%`, color: lab.color }}
            sub="실패하면 무구는 빛을 잃는다 · 날짜 소모 없음"
            onClick={() => { const r = resolveRegressionUnique(run, true); saveRun({ ...r.run, scene: r.scene }); }} />
          <Choice text="두고 간다" onClick={() => { const r = resolveRegressionUnique(run, false); saveRun({ ...r.run, scene: r.scene }); }} />
        </div>
      </div>
    );
  } else if (pendingEv) {
    const choices = pendingEv.choices.filter(c => regressionChoiceVisible(c, run, reg.memories));
    body = (
      <div className="space-y-3 ui-screen-enter">
        {pendingEv.main
          ? <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>📜 메인 스토리 {pendingEv.main}/{REGRESSION_MAIN_STORY.length}</div>
          : null}
        <div className="text-[14px] font-bold" style={{ color: pendingEv.main ? PALETTE.legendary : PALETTE.twilight }}>◆ {pendingEv.title}</div>
        <div className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>{pendingEv.text}</div>
        <div className="space-y-1.5">
          {choices.map((c, i) => {
            const label = c.stat ? { stat: c.stat, ...regressionChanceLabel(regressionCheckChance(storyStats[c.stat] || 0, c.dc)) } : null;
            const cantPay = c.cost?.gold && (run.gold || 0) < c.cost.gold;
            const traitTxt = c.trait ? `${REGRESSION_TRAITS[c.trait].name} +${c.traitValue || 1}${c.success?.traitBonus ? ` (성공 시 +${(c.traitValue || 1) + c.success.traitBonus})` : ''}` : null;
            const req = c.requireTrait ? `★ ${Object.entries(c.requireTrait).map(([k, v]) => `${REGRESSION_TRAITS[k].name} ${v} 이상`).join(' · ')}` : null;
            const sub = [c.requireMemory ? '★ 전생의 기억' : null, req, traitTxt, cantPay ? `은화가 부족하다 (보유 ${run.gold || 0}G)` : null].filter(Boolean).join(' · ') || null;
            return <Choice key={i} text={c.text} label={label} disabled={cantPay} sub={sub} onClick={() => chooseEvent(c)} />;
          })}
        </div>
      </div>
    );
  } else if (run.secret && REGRESSION_SECRET_PLACES[run.secret.region]) {
    // 1.201.0~ 숨겨진 장소 — 3층
    const P = REGRESSION_SECRET_PLACES[run.secret.region];
    const f = run.secret.floor;
    const chance = (st, dc) => ({ stat: st, ...regressionChanceLabel(regressionCheckChance(storyStats[st] || 0, dc)) });
    body = (
      <div className="space-y-3 ui-screen-enter">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-bold" style={{ color: PALETTE.legendary }}>🗝 {P.name}</div>
          <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>{f}/3층</div>
        </div>
        <div className="text-[14px] leading-relaxed" style={{ color: PALETTE.text }}>{f === 1 ? P.puzzle : f === 2 ? P.guard : P.treasure}</div>
        <div className="space-y-1.5">
          {f === 1 && ['통찰', '학식', '민첩'].map(st => (
            <Choice key={st} text={{ 통찰: '흔적을 읽고 진짜를 고른다', 학식: '문양을 해독해 원리를 푼다', 민첩: '함정이 작동하기 전에 빠져나간다' }[st]} label={chance(st, REGRESSION_SECRET.puzzleDc)}
              sub={`성공: 은화 +${REGRESSION_SECRET.puzzleGold} · 실패: HP -${REGRESSION_SECRET.puzzleFailHp}% (어느 쪽이든 2층으로)`}
              onClick={() => { const r = solveRegressionSecretPuzzle(run, st); saveRun({ ...r.run, scene: regressionResultScene(`${P.name} — 1층`, r.ok ? '문이 소리 없이 열렸다.' : '함정이 터졌지만, 길은 열렸다.', r.tags) }); }} />
          ))}
          {f === 2 && <Choice text="수호자에게 맞선다" sub={`${run.secret.region === 1 ? '하급' : '상급'} 적 · 이기면 3층 보물`} onClick={() => saveRun(fightRegressionSecretGuardian(run))} />}
          {f === 3 && <Choice text="보물을 연다" sub="보물 장비 확정 · 유니크 무구 또는 기연의 기회" onClick={() => { const r = claimRegressionSecretTreasure(run); saveRun({ ...r.run, scene: regressionResultScene(`${P.name} — 보물`, '오래 잠들어 있던 것들이 손에 들어왔다.', r.tags) }); }} />}
          {f < 3 && <Choice text="물러난다 (하루가 지난다)" onClick={() => saveRun({ ...leaveRegressionSecret(run), scene: regressionResultScene(P.name, '욕심을 접고 밖으로 나왔다.', []) })} />}
        </div>
      </div>
    );
  } else if (spireDay) {
    const ok = isRegressionSpireEligible(run);
    body = (
      <div className="space-y-3 ui-screen-enter">
        <div className="text-[14px] font-bold" style={{ color: PALETTE.legendary }}>🗼 황혼의 첨탑</div>
        <div className="text-[14px] leading-relaxed" style={{ color: PALETTE.text }}>
          {ok ? `마침내 ${run.maxDays + 1}일째. 하늘이 붉게 타오르고, 첨탑의 문이 이름을 알린 자를 부른다.${run.memoryCount >= REGRESSION_TUNING.spireWeaknessMemories || compFx.spireWeakness ? '\n기억의 조각들이 첨탑 주인의 약점을 비춘다.' : ''}`
            : `${run.maxDays + 1}일째. 황혼이 대륙을 덮는다. 이름 없는 자에게 첨탑의 문은 열리지 않았다.`}
        </div>
        {ok && (() => { const R = REGRESSION_ROUTES[run.route || 'none']; return (
          <div className="text-[12px] px-3 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${R.color}` }}>
            <b style={{ color: R.color }}>{R.icon} {R.name}</b><div style={{ color: PALETTE.textDim }}>{R.spire}</div>
          </div>); })()}
        <Choice text={ok ? '첨탑에 오른다 (4연전, 층 사이 회복 없음)' : '황혼을 맞는다'} onClick={() => saveRun(enterRegressionSpire(run))} />
      </div>
    );
  } else if (run.today) {
    // 1.185.0~ 오늘의 일 — 랜덤 카드 1장. 선택지는 그 카드의 것뿐
    const t = run.today;
    const intro = (REGRESSION_TODAY_INTRO[t.kind] || (() => ''))(run);
    const stats = storyStats;
    const sceneOf = (title, text, tags) => regressionResultScene(title, text, tags);
    let choices = null;
    if (t.kind === 'battle' || t.kind === 'elite') {
      const st = t.kind === 'elite' ? '통찰' : '민첩';
      const hide = regressionChanceLabel(regressionCheckChance(stats[st] || 0, REGRESSION_DAY.hideDc[t.kind] || 14));
      choices = (
        <>
          <Choice text="맞서 싸운다" sub={`승리 시 명성 +${Math.round(REGRESSION_TUNING.fameGain[t.tier] * (REGRESSION_TUNING.regionFameMult[run.region] || 1) * (t.redMoon ? REGRESSION_RED_MOON.rewardMult : 1))} · 경험치 +${REGRESSION_EXP[t.tier] * (t.redMoon ? REGRESSION_RED_MOON.rewardMult : 1)}${t.kind === 'elite' ? ' · 장비 35% · 비급·유니크 기회' : ''}`} onClick={() => saveRun(fightRegressionToday(run))} />
          <Choice text="몸을 숨기고 지나간다" label={{ stat: st, ...hide }} sub="실패하면 들킨 채로 싸운다 · 성공하면 아무것도 얻지 못한다"
            onClick={() => { const r = hideFromRegressionEnemy(run); saveRun(r.ok ? { ...r.run, scene: sceneOf('숨어서 지나감', '숨을 죽이고 그림자 속에 몸을 묻었다. 적은 끝내 이쪽을 보지 못했다.', [{ text: `${st} - 성공!`, tone: 'gold' }]) } : r.run); }} />
        </>
      );
    } else if (t.kind === 'companion') {
      const c = getRegressionCompanion(t.companionId);
      const aff = run.affinity?.[c.id] || 0;
      choices = (
        <>
          <Choice text="곁에 앉아 이야기를 나눈다" sub={`호감 ${aff}/100 「${regressionCompanionTier(aff).name}」${aff >= 40 ? ' · 함께 다니는 중' : ' · 40이 되면 다른 지역까지 따라온다'} · 다음 단계: ${aff >= 40 ? c.perkText.oath : c.perkText.ally}`} onClick={() => {
            const next = applyRegressionTalk(run, c.id, combatStats.매력 || 10);
            const after = next.affinity[c.id];
            const upTier = regressionCompanionTier(after).id !== regressionCompanionTier(aff).id;
            saveRun({ ...next, scene: sceneOf(`${c.name} — ${c.title}`, regressionCompanionLine(c.id, after), [{ text: `호감 +${after - aff} (${after}/100)`, tone: 'good' }, upTier ? { text: `「${regressionCompanionTier(after).name}」 달성`, tone: 'gold' } : null]) });
          }} />
          <Choice text="가볍게 인사만 하고 지나간다" onClick={() => saveRun({ ...passRegressionDay(run, `${c.name}과 스쳐 지나감`), scene: sceneOf(c.name, '고개만 끄덕이고 길을 재촉했다.', []) })} />
        </>
      );
    } else if (t.kind === 'merchant') {
      choices = (
        <>
          <Choice text="물건을 본다" sub={`보유 ${run.gold || 0}G · 진열 ${(run.shop?.offers || []).filter(o => !o.sold).length}개 · 진열 바꾸기 ${REGRESSION_ECON.shopResets - (run.shop?.resets || 0)}회`} onClick={() => setShowShop(true)} />
          <Choice text="상인과 헤어진다 (하루를 마친다)" onClick={leaveMerchant} />
        </>
      );
    } else if (t.kind === 'shelter') {
      const heal = REGRESSION_TUNING.restHealPct + compFx.restHealPct;
      choices = (
        <>
          <Choice text="불을 피우고 푹 쉰다" sub={`HP +${heal}%`} onClick={() => { const before = run.hpPct; const next = restRegressionShelter(run); saveRun({ ...next, scene: sceneOf('쉼터', '모처럼 깊이 잠들었다. 상처가 아물어 간다.', [{ text: `HP +${Math.round((next.hpPct - before) * 100)}%`, tone: 'good' }]) }); }} />
          <Choice text="밤새 단련한다" sub={`경험치 +${REGRESSION_DAY.trainExp}`} onClick={() => { const r = trainRegressionShelter(run); saveRun({ ...r.run, scene: sceneOf('쉼터', '잠을 줄이고 검을 휘둘렀다. 몸이 조금 더 기억한다.', [{ text: `경험치 +${REGRESSION_DAY.trainExp}`, tone: 'good' }, r.levelUps > 0 ? { text: `레벨 상승 ${r.from}→${r.run.level}`, tone: 'gold' } : null, r.levelUps > 0 ? { text: `추가 능력치 +${r.levelUps}`, tone: 'gold' } : null]) }); }} />
        </>
      );
    } else if (t.kind === 'grave') {
      const g = run.grave || {};
      choices = (
        <>
          <Choice text="흙을 파고 유품을 거둔다" sub={`${g.gearId && __RG_GEAR[g.gearId] ? `${regressionGearLabel(g.gearId)} · ` : ''}${g.gold ? `은화 +${g.gold} · ` : ''}경험치 +${REGRESSION_GRAVE.exp}`} onClick={() => { const r = resolveRegressionGrave(run, true); saveRun({ ...r.run, scene: sceneOf('전생의 유품', '손에 익은 감촉이다. 지난 생의 내가 이번 생의 나에게 건네는 것 같다.', r.tags) }); }} />
          <Choice text="무덤에 꽃을 놓고 떠난다" sub={`명성 +${REGRESSION_GRAVE.leaveFame} · 유품은 다음 생에도 남는다`} onClick={() => { const r = resolveRegressionGrave(run, false); saveRun({ ...r.run, scene: sceneOf('전생의 무덤', '지난 생의 나에게 작별을 고했다. 이번에는 다른 길을 걷겠다고.', r.tags) }); }} />
        </>
      );
    } else if (t.kind === 'secret') {
      const P = REGRESSION_SECRET_PLACES[run.region];
      const lab = (st) => ({ stat: st, ...regressionChanceLabel(regressionCheckChance(stats[st] || 0, REGRESSION_SECRET.dc)) });
      choices = (
        <>
          {['통찰', '학식'].map(st => (
            <Choice key={st} text={st === '통찰' ? '주변을 살펴 숨은 입구를 찾는다' : '새겨진 문양을 해독한다'} label={lab(st)} sub={`성공하면 「${P?.name}」에 들어간다 (3층) · 실패하면 이 지역의 기회는 끝`}
              onClick={() => { const r = discoverRegressionSecret(run, st); saveRun(r.ok ? { ...r.run, scene: sceneOf(P?.name || '숨겨진 장소', '돌이 밀리며 어두운 통로가 드러났다.', [{ text: `${st} - 성공!`, tone: 'gold' }]) } : { ...r.run, scene: sceneOf('수상한 흔적', '끝내 입구를 찾지 못했다. 흔적은 바람에 지워졌다.', [{ text: `${st} - 실패`, tone: 'bad' }]) }); }} />
          ))}
          <Choice text="지나친다" onClick={() => saveRun({ ...passRegressionDay(run, '수상한 흔적을 지나침'), scene: sceneOf('수상한 흔적', '괜한 위험은 피하기로 했다.', []) })} />
        </>
      );
    } else if (t.kind === 'routeBoss') {
      const rw = REGRESSION_ROUTE_REWARDS[t.route]?.[t.routeBoss] || {};
      const rwTxt = rw.stats ? Object.entries(rw.stats).map(([k, v]) => `${k} +${v}`).join(' · ') : rw.gear ? `여정 장비 「${__RG_GEAR[rw.gear]?.name}」` : rw.affinityAll ? `만난 동료 호감 +${rw.affinityAll}` : rw.text || (rw.gold ? `은화 +${rw.gold} · 회복약` : '');
      choices = (
        <Choice text="맞선다 — 피할 수 없다" sub={`승리 시 명성 +${Math.round(REGRESSION_TUNING.fameGain.boss * (REGRESSION_TUNING.regionFameMult[run.region] || 1))} · 경험치 +${REGRESSION_EXP.boss} · ${rwTxt} · 기연 기회`} onClick={() => saveRun(fightRegressionToday(run))} />
      );
    } else if (t.kind === 'hermit') {
      const sk = REGRESSION_SKILLS[t.skillId];
      choices = (
        <>
          <Choice text={`가르침을 청한다 — 「${sk?.name}」`} sub={`${REGRESSION_SKILL_TIERS[sk?.tier]?.name} 스킬 · ${regressionRunSkills(run).includes(t.skillId) ? `숙련 Lv.${regressionRunSkillLv(run, t.skillId)}→${regressionRunSkillLv(run, t.skillId) + 1} · ` : ''}습득 ${Math.round(regressionLearnChance(t.skillId, stats, regressionRunSkills(run).includes(t.skillId)) * 100)}% (적성 판정)`} onClick={() => saveRun(askRegressionHermit(run))} />
          <Choice text="정중히 사양한다" onClick={() => saveRun({ ...passRegressionDay(run, '떠도는 은자를 지나침'), scene: sceneOf('떠도는 은자', '"인연이 아니었군." 은자가 연기처럼 사라졌다.', []) })} />
        </>
      );
    }
    body = (
      <div className="space-y-3 ui-screen-enter">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold" style={{ color: t.kind === 'routeBoss' || t.redMoon ? PALETTE.accent : PALETTE.dawn }}>D{run.day} — {t.kind === 'routeBoss' ? `${REGRESSION_ROUTES[t.route]?.icon} 길목의 군주` : t.redMoon ? '🌕 붉은 달의 날' : t.kind === 'grave' ? '⚱ 전생의 무덤' : t.kind === 'secret' ? '🗝 수상한 흔적' : '오늘의 일'}</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>기연의 기운 <b style={{ color: PALETTE.legendary }}>{Math.round((regressionDayTable(run).fortune || 0) * 100)}%</b> · 적 강도 ×{regressionDayEnemyMult(run.day).toFixed(2)}{regressionDaysToRedMoon(run.day) > 0 ? ` · 🌕 붉은 달까지 ${regressionDaysToRedMoon(run.day)}일` : ''}</div>
        </div>
        <div className="text-[14px] leading-relaxed" style={{ color: PALETTE.textDim }}>{regressionNarration(run)}</div>
        {t.redMoon && <div className="text-[13px] leading-relaxed" style={{ color: '#f0a59c' }}>하늘에 핏빛 달이 떴다. 오늘 밤 마물들은 미쳐 날뛴다 — 그만큼 거둘 것도 많다. (적 ×{REGRESSION_RED_MOON.enemyMult} · 보상 ×{REGRESSION_RED_MOON.rewardMult})</div>}
        <div className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text }}>{intro}</div>
        {gimmick && (t.kind === 'battle' || t.kind === 'elite') && <div className="text-[11px]" style={{ color: PALETTE.dawn }}>◈ {gimmick.name} — {gimmick.desc}</div>}
        <div className="space-y-1.5">{choices}</div>
      </div>
    );
  } else {
    body = <div className="text-[13px]" style={{ color: PALETTE.textDim }}>…</div>;
  }

  return (
    <div className="h-full flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 상단 목표 바 — 스크린샷 스타일: 목표 · 단계 (n/4) · 이름 · HP */}
      <div className="flex-none px-4 pt-3 pb-2.5" style={{ borderBottom: `1px solid ${PALETTE.panelBorder}`, background: PALETTE.panel }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label="뒤로가기" className="ui-press flex-none text-[12px] px-2" style={{ minHeight: 32, color: PALETTE.textDim, background: 'transparent', border: 'none' }}>‹</button>
          <div className="flex-1 min-w-0">
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>이름을 알려 첨탑에 오르기</div>
            <div className="text-[13px] font-bold truncate" style={{ color: stage.step >= stage.total ? PALETTE.legendary : PALETTE.dawn }}>
              {famePath ? `${famePath}${/[가-힣]/.test(famePath) && (famePath.charCodeAt(famePath.length - 1) - 0xac00) % 28 && (famePath.charCodeAt(famePath.length - 1) - 0xac00) % 28 !== 8 ? '으로' : '로'} 알려지는 중` : stage.name} ({stage.step}/{stage.total}) <span className="font-normal tabular-nums" style={{ color: PALETTE.textDim }}>· 명성 {run.fame}</span>
            </div>
          </div>
          <Chip icon={<Hourglass size={12} />} color={daysLeft <= 5 ? PALETTE.accent : PALETTE.dawn}>{spireDay ? '첨탑의 날' : `D${run.day}/${run.maxDays}`}</Chip>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="text-[12px] font-bold flex-none" style={{ color: PALETTE.text }}>{classData.name} <span style={{ color: PALETTE.dawn }}>Lv.{run.level || 0}</span></div>
          <div className="flex-1"><Bar label="" value={loadout.hp} max={loadout.maxHp} color={PALETTE.accent} right="" /></div>
          <div className="text-[11px] tabular-nums flex-none" style={{ color: PALETTE.text }}>{loadout.hp}/{loadout.maxHp}</div>
          <div className="text-[11px] tabular-nums flex-none" style={{ color: PALETTE.legendary }}>{run.gold || 0}G</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: PALETTE.textDim }}>
          <MapPin size={13} color={PALETTE.dawn} /> {regionLabel(run.region)}
        </div>
        {body}

        <div className="flex gap-1.5 pt-2">
          <button className="ui-press flex-1 text-[12px]" onClick={() => setShowBook(true)} style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>📖 기록서 {run.learned.length}</button>
          <button className="ui-press flex-1 text-[12px]" onClick={() => setMenu(menu === 'party' ? null : 'party')} style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>🤝 동료</button>
          <button className="ui-press flex-1 text-[12px]" onClick={() => setMenu(menu === 'stats' ? null : 'stats')} style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: run.statPoints > 0 ? `${PALETTE.legendary}22` : 'transparent', border: `1px solid ${run.statPoints > 0 ? PALETTE.legendary : PALETTE.panelBorder}`, color: run.statPoints > 0 ? PALETTE.legendary : PALETTE.textDim }}>📊 능력치{run.statPoints > 0 ? ` +${run.statPoints}` : ''}</button>
          <button className="ui-press flex-1 text-[12px]" onClick={() => setMenu(menu === 'gear' ? null : 'gear')} style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>🎒 장비</button>
          <button className="ui-press flex-1 text-[12px]" onClick={() => setMenu(menu === 'log' ? null : 'log')} style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>📜 지난 일</button>
        </div>
        {menu === 'party' && (
          <GlassPanel style={{ padding: 12 }}>
            <div className="text-[11px] mb-1.5" style={{ color: PALETTE.textDim }}>호감은 대화(+20)·사건·메인 스토리·개인 이야기로 오른다. <b style={{ color: PALETTE.text }}>40 = 동행</b>(효과 발동 + 다른 지역까지 따라옴) · <b style={{ color: PALETTE.legendary }}>100 = 맹약</b>(효과 추가 + 유대 엔딩). 효과는 둘 다 겹쳐 적용된다.</div>
            <div className="space-y-1">
              {REGRESSION_COMPANIONS.map(c => {
                const aff = run.affinity?.[c.id] || 0;
                return (
                  <div key={c.id} className="text-[11px]" style={{ color: aff > 0 ? PALETTE.text : PALETTE.textDim }}>
                    <b style={{ color: aff > 0 ? c.color : PALETTE.textDim }}>{c.name}</b> {c.title} · {getRegressionRegion(c.region).name} · {regressionCompanionTier(aff).name} {aff}{aff >= 40 && aff < 100 ? ' · 함께 다니는 중' : ''}
                    <span style={{ color: PALETTE.textDim }}> — 동행: {c.perkText.ally} / 맹약: {c.perkText.oath}</span>
                    <div style={{ color: (run.questStage?.[c.id] || 0) >= 2 ? PALETTE.green : PALETTE.textDim }}>📜 개인 이야기 {run.questStage?.[c.id] || 0}/2 (호감 {REGRESSION_QUEST_AFFINITY[1]}·{REGRESSION_QUEST_AFFINITY[2]}에서 만나면) → 유대 스킬 「{REGRESSION_SKILLS[c.bondSkill]?.name}」{(run.questStage?.[c.id] || 0) >= 2 ? ' ✓' : ''}</div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        )}
        {menu === 'stats' && (
          <GlassPanel style={{ padding: 12 }}>
            <div className="flex justify-between text-[12px] mb-2">
              <span style={{ color: PALETTE.text }}>Lv.{run.level || 0} · 경험치 {run.exp || 0}/{regressionExpToNext(run.level || 0)}</span>
              <span style={{ color: run.statPoints > 0 ? PALETTE.legendary : PALETTE.textDim }}>남은 추가 능력치 {run.statPoints || 0}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {REGRESSION_STATS.map(st => (
                <div key={st.id} className="flex items-center gap-2 px-2" style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight }}>
                  <span className="text-[12px] flex-1" style={{ color: PALETTE.text }}>{st.id}</span>
                  <b className="text-[13px] tabular-nums" style={{ color: PALETTE.dawn }}>{storyStats[st.id]}{storyStats[st.id] !== baseStats[st.id] && <span className="text-[10px] font-normal" style={{ color: PALETTE.green }}> (+{storyStats[st.id] - baseStats[st.id]})</span>}</b>
                  {run.statPoints > 0 && baseStats[st.id] < REGRESSION_STAT_MAX && (
                    <button aria-label={`${st.id} 올리기`} className="ui-press text-[13px] font-bold" onClick={() => saveRun(spendRegressionStatPoint(run, st.id))}
                      style={{ width: 32, height: 32, borderRadius: 8, background: `${PALETTE.legendary}22`, border: `1px solid ${PALETTE.legendary}`, color: PALETTE.legendary }}>+</button>
                  )}
                </div>
              ))}
            </div>
            {(() => {
              const srcs = Object.entries(regressionStatSources(run)).map(([name, o]) => [name, Object.entries(o).filter(([, v]) => v)]).filter(([, e]) => e.length);
              return srcs.length > 0 && (
                <div className="mt-2 px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight }}>
                  <div className="text-[11px] font-bold mb-0.5" style={{ color: PALETTE.green }}>능력치 보너스 (+N) 내역</div>
                  {srcs.map(([name, e]) => <div key={name} className="text-[11px]" style={{ color: PALETTE.textDim }}>{name}: {e.map(([k, v]) => `${k} +${v}`).join(' · ')}</div>)}
                </div>
              );
            })()}
            <div className="text-[11px] mt-2" style={{ color: PALETTE.textDim }}>판정에 성공하거나 전투에서 이기면 경험치를 얻는다. 레벨이 오를 때마다 추가 능력치 +1.</div>
            {(() => {
              const cur = run.route || null;
              const next = regressionRouteFor(run);
              const R = REGRESSION_ROUTES[cur || next];
              const nextRegion = REGRESSION_ROUTE_BOSS_DAY_IN_REGION;
              return (
                <div className="mt-3 px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${R.color}` }}>
                  <div className="text-[12px] font-bold" style={{ color: R.color }}>{R.icon} {cur ? R.name : `아직 길이 정해지지 않음 (지금이면 「${R.name}」)`}</div>
                  <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{REGRESSION_ROUTE_FROM_REGION}지역부터 지역에 들어설 때마다 가장 높은 성향으로 길이 정해진다. 길마다 각 지역 {nextRegion}일째 「길목의 군주」·보상·첨탑 3~4층·엔딩이 달라진다.</div>
                  {cur && [2, 3, 4].map(rg => { const b = REGRESSION_ROUTE_BOSSES[cur]?.[rg]; const done = (run.routeBossDone || []).includes(rg); return b && <div key={rg} className="text-[11px]" style={{ color: done ? PALETTE.green : PALETTE.textDim }}>{done ? '✓' : '·'} {rg}지역 — {b.name}</div>; })}
                  <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>첨탑: {R.spire}</div>
                </div>
              );
            })()}
            <div className="text-[12px] font-bold mt-3 mb-1" style={{ color: PALETTE.text }}>성향 (메인 스토리 선택)</div>
            <div className="flex gap-1.5">
              {Object.entries(REGRESSION_TRAITS).map(([k, tr]) => (
                <div key={k} className="flex-1 text-center px-1 py-1.5" style={{ borderRadius: 8, background: PALETTE.panelLight, border: `1px solid ${regressionTopTrait(run) === k ? tr.color : 'transparent'}` }}>
                  <div className="text-[11px]" style={{ color: tr.color }}>{tr.name}</div>
                  <b className="text-[14px] tabular-nums" style={{ color: PALETTE.text }}>{run.traits?.[k] || 0}</b>
                </div>
              ))}
            </div>
            <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>가장 높은 성향이 길(루트)을 정하고, 첨탑에 오른 길이 엔딩을 가른다. 메인 스토리는 각 지역 {8}일째와 마지막 날 찾아온다.</div>
            {getRegressionClassPerk(run.classId) && <div className="text-[11px] mt-3" style={{ color: PALETTE.textDim }}><b style={{ color: PALETTE.legendary }}>◆ 직업 특성 「{getRegressionClassPerk(run.classId).name}」</b> — {getRegressionClassPerk(run.classId).desc}</div>}
            {run.awaken && getRegressionAwakening(run.awaken) && <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}><b style={{ color: PALETTE.legendary }}>✦ 각성 「{getRegressionAwakening(run.awaken).name}」</b> — {getRegressionAwakening(run.awaken).desc}</div>}
            {!run.awaken && <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>✦ Lv.{REGRESSION_AWAKEN_LEVEL}에 각성 — 두 갈래 중 하나를 고른다</div>}
            <div className="text-[12px] font-bold mt-3 mb-1" style={{ color: PALETTE.text }}>보유 스킬 {regressionRunSkills(run).length}개</div>
            <div className="space-y-1">
              {regressionRunSkills(run).map(id => {
                const sk = REGRESSION_SKILLS[id]; if (!sk) return null;
                const t = REGRESSION_SKILL_TIERS[sk.tier];
                return (
                  <button key={id} className="ui-press w-full text-left text-[11px] px-2.5 flex items-center gap-2" onClick={() => setSkillInfo(id)}
                    style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
                    <span className="flex-1"><b style={{ color: t.color }}>[{t.name}] {sk.name}</b> <b style={{ color: PALETTE.legendary }}>Lv.{regressionRunSkillLv(run, id)}</b> — {regressionTriggerText(id)}</span>
                    <span style={{ color: PALETTE.dawn }}>ⓘ</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>강적의 비급·군주 격파·기연 사건으로 새 스킬을 배울 기회가 온다. 이미 아는 스킬을 다시 익히면 레벨이 오른다 (최대 Lv.5). 성공률은 스킬의 관련 능력치가 내 빌드와 얼마나 맞는지(적성)로 정해진다.</div>
          </GlassPanel>
        )}
        {menu === 'gear' && (
          <GlassPanel style={{ padding: 12 }}>
            <div className="space-y-1.5">
              {REGRESSION_GEAR_SLOTS.map(sl => {
                const id = run.gear?.[sl.id];
                const g = id && REGRESSION_GEAR[id];
                return (
                  <div key={sl.id} className="flex items-center gap-2 px-2" style={{ minHeight: 44, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight }}>
                    <span className="text-[11px] w-12 flex-none" style={{ color: PALETTE.textDim }}>{sl.name}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold truncate" style={{ color: g ? REGRESSION_GEAR_GRADES[g.grade].color : PALETTE.textDim }}>{g ? regressionGearLabel(id) : '— 비어 있음'}</div>
                      {g && <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{regressionGearStatText(id)}</div>}
                    </div>
                    {g && <button className="ui-press text-[11px] px-2" onClick={() => saveRun(unequipRegressionGear(run, sl.id))} style={{ minHeight: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>해제</button>}
                  </div>
                );
              })}
            </div>
            <div className="text-[12px] font-bold mt-3 mb-1" style={{ color: PALETTE.text }}>가방</div>
            <div className="space-y-1">
              {[...new Set(run.bag || [])].filter(id => !Object.values(run.gear || {}).includes(id)).map(id => (
                <button key={id} className="ui-press w-full flex items-center gap-2 px-2 text-left" onClick={() => saveRun(equipRegressionGear(run, id))}
                  style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px]" style={{ color: REGRESSION_GEAR_GRADES[REGRESSION_GEAR[id].grade].color }}>{regressionGearLabel(id)} <span style={{ color: PALETTE.textDim }}>· {REGRESSION_GEAR_SLOTS.find(x => x.id === REGRESSION_GEAR[id].slot)?.name}</span></div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{regressionGearStatText(id)}</div>
                  </div>
                  <span className="text-[11px]" style={{ color: PALETTE.dawn }}>장착</span>
                </button>
              ))}
              {![...new Set(run.bag || [])].some(id => !Object.values(run.gear || {}).includes(id)) && <div className="text-[11px]" style={{ color: PALETTE.textDim }}>남는 장비가 없다.</div>}
            </div>
            <div className="text-[11px] mt-2" style={{ color: PALETTE.textDim }}>장비의 능력치는 전투·판정·적성에 모두 더해진다. 장비는 전투(하급 8% · 강적 35%)·사건·상점에서 얻는다.</div>
          </GlassPanel>
        )}
        {menu === 'log' && (
          <GlassPanel style={{ padding: 12 }}>
            <div className="space-y-0.5">
              {run.log.slice(-12).reverse().map((l, i) => <div key={i} className="text-[11px]" style={{ color: i === 0 ? PALETTE.text : PALETTE.textDim }}>{l}</div>)}
              {run.log.length === 0 && <div className="text-[11px]" style={{ color: PALETTE.textDim }}>아직 아무 일도 없었다.</div>}
            </div>
          </GlassPanel>
        )}
      </div>
      {showShop && (
        <BottomSheet title={`🛒 떠돌이 상인 — ${run.gold || 0}G`} onClose={() => setShowShop(false)}>
          <div className="space-y-1.5 pb-2">
            {shopLog.length > 0 && (
              <div className="px-2.5 py-2" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.green}14`, border: `1px solid ${PALETTE.green}55` }}>
                <div className="text-[11px] font-bold mb-0.5" style={{ color: PALETTE.green }}>이번 거래 {shopLog.length}건</div>
                {shopLog.slice(-4).map((l, i) => <div key={i} className="text-[11px]" style={{ color: PALETTE.text }}>· {l.text}</div>)}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>오늘의 진열</div>
              {(() => {
                const left = REGRESSION_ECON.shopResets - (run.shop?.resets || 0);
                return <button disabled={left <= 0} className="ui-press text-[11px] px-2.5" onClick={() => saveRun(rerollRegressionShop(run))}
                  style={{ minHeight: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: left > 0 ? PALETTE.dawn : PALETTE.textDim, opacity: left > 0 ? 1 : 0.5 }}>↻ 진열 바꾸기 ({left}/{REGRESSION_ECON.shopResets})</button>;
              })()}
            </div>
            {(run.shop?.offers || []).map((o, idx) => {
              const price = regressionShopOfferPrice(run, o);
              const can = !o.sold && (run.gold || 0) >= price;
              const isSkill = o.kind === 'skill';
              const sk = isSkill ? REGRESSION_SKILLS[o.id] : null;
              const g = !isSkill ? REGRESSION_GEAR[o.id] : null;
              const color = isSkill ? REGRESSION_SKILL_TIERS[sk.tier].color : REGRESSION_GEAR_GRADES[g.grade].color;
              return (
                <button key={idx} disabled={!can} className="ui-press w-full flex items-center gap-2 px-3 text-left"
                  onClick={() => { const r = buyRegressionOffer(run, idx); if (r.bought) { saveRun(r.run); logShop(`${r.bought} (-${r.price}G)`); } }}
                  style={{ minHeight: 52, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, opacity: o.sold ? 0.3 : (can ? 1 : 0.5) }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold" style={{ color }}>{isSkill ? `[${REGRESSION_SKILL_TIERS[sk.tier].name} 스킬] ${sk.name}${regressionRunSkills(run).includes(o.id) ? ` — 숙련 Lv.${regressionRunSkillLv(run, o.id)}→${regressionRunSkillLv(run, o.id) + 1}` : ''}` : regressionGearLabel(o.id)}{o.sold ? ' — 판매됨' : ''}</div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                      {isSkill ? `${regressionTriggerText(o.id)} · 교습비는 적성 ${Math.round(regressionSkillAptitude(o.id, storyStats) * 100)}% 기준` : `${REGRESSION_GEAR_SLOTS.find(x => x.id === g.slot)?.name} · ${regressionGearStatText(o.id)}`}
                    </div>
                  </div>
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{price}G</span>
                </button>
              );
            })}
            <div className="text-[12px] font-bold pt-2" style={{ color: PALETTE.text }}>늘 파는 것</div>
            {REGRESSION_SHOP.map(it => {
              const name = it.kind === 'potion' ? `${POTIONS[it.id].icon} ${POTIONS[it.id].name}` : it.name;
              const desc = it.kind === 'potion' ? POTIONS[it.id].desc : it.desc;
              const can = (run.gold || 0) >= it.price;
              return (
                <button key={it.id} disabled={!can} className="ui-press w-full flex items-center gap-2 px-3 text-left"
                  onClick={() => { const r = buyRegressionShop(run, it.id); if (r.bought) { saveRun(r.run); logShop(`${r.bought} (-${it.price}G)`); } }}
                  style={{ minHeight: 48, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, opacity: can ? 1 : 0.45 }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>{name}</div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{desc}</div>
                  </div>
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{it.price}G</span>
                </button>
              );
            })}
            <div className="text-[12px] font-bold pt-2" style={{ color: PALETTE.text }}>장비 팔기 <span className="font-normal text-[11px]" style={{ color: PALETTE.textDim }}>· 장착하지 않은 장비만</span></div>
            {regressionSellableGear(run).map(({ id, count }) => (
              <button key={id} className="ui-press w-full flex items-center gap-2 px-3 text-left" onClick={() => { const r = sellRegressionGear(run, id); if (r.sold) { saveRun(r.run); logShop(`${REGRESSION_GEAR[id].name} 판매 (+${r.sold}G)`, 'gold'); } }}
                style={{ minHeight: 48, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold" style={{ color: REGRESSION_GEAR_GRADES[REGRESSION_GEAR[id].grade].color }}>{regressionGearLabel(id)}{count > 1 ? ` ×${count}` : ''}</div>
                  <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{regressionGearStatText(id)}</div>
                </div>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: PALETTE.green }}>+{regressionGearSellPrice(id)}G</span>
              </button>
            ))}
            {regressionSellableGear(run).length === 0 && <div className="text-[11px]" style={{ color: PALETTE.textDim }}>팔 수 있는 장비가 없다.</div>}
            <div className="text-[11px] pt-1" style={{ color: PALETTE.textDim }}>진열은 상인을 만날 때마다 새로 짜인다. 기연 스킬과 유니크 무구는 팔지 않는다.</div>
            <button className="ui-press w-full text-[13px] font-bold" onClick={leaveMerchant}
              style={{ minHeight: 44, borderRadius: 'var(--r-btn, 13px)', background: `${PALETTE.accent}22`, border: `1px solid ${PALETTE.accent}`, color: PALETTE.text }}>상인과 헤어진다 (하루를 마친다)</button>
            <button className="ui-press w-full text-[12px]" onClick={() => setShowShop(false)}
              style={{ minHeight: 40, borderRadius: 'var(--r-btn, 13px)', background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>잠시 닫기 (상인은 기다린다)</button>
          </div>
        </BottomSheet>
      )}
      {showBook && <RecordBook reg={reg} run={run} onClose={() => setShowBook(false)} />}
      {skillInfo && <RegressionSkillInfo skillId={skillInfo} stats={storyStats} lv={regressionRunSkillLv(run, skillInfo)} onClose={() => setSkillInfo(null)} />}
    </div>
  );
}
