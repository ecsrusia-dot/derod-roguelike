// ============================================
// components/regression/RegressionGame.jsx — 🌀 회귀의 탐험가 컨테이너 (1.177.0, MVP 2차)
// ============================================
// 로비(직업 선택·기억 조각) → 날짜 허브(하루 1행동) → 본편 CombatScreen 전투 → 41일째 황혼의 첨탑 → 회귀 정산.
// 모든 상태는 meta.regression 하나로 영속 (onSave 패치). 진행 중인 생은 regression.run.
// 전투 중 새로고침 = 같은 적과 재전투 (run.pending / run.spireRound — 도주 불가).
// PM 결정: 본편 메타 강화(각인·각성도·제단) 미적용 → engravingFx={}, meta.upgrades 비움.
// 순수 로직은 전부 src/data/regression.js — 이 파일은 화면과 저장만.

import React, { useMemo, useState } from 'react';
import { Footprints, Tent, Swords, Skull, BookOpen, Sparkles, MapPin, Hourglass } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  CLASSES, CHAPTERS, ENEMIES, GAME_CONFIG,
  REGRESSION_TUNING, REGRESSION_REGIONS, REGRESSION_HUB, REGRESSION_RECORDS, REGRESSION_MEMORIES,
  REGRESSION_SPIRE_CHAIN, getRegressionRegion, regressionEnemyPool,
  createRegressionRun, regressionActions, applyRegressionTravel, applyRegressionRest,
  rollRegressionEnemy, startRegressionCombat, applyRegressionCombat,
  isRegressionSpireDay, isRegressionSpireEligible, isRegressionEliteOpen,
  enterRegressionSpire, applyRegressionSpireResult, buildRegressionSpireEnemy,
  settleRegression, setRegressionCarry, regressionCarrySlots, buildRegressionLoadout,
  describeRegressionRecord, getRegressionMemory,
} from '../../data.js';
import { ScreenHeader, GlassPanel, Chip, UIButton, BottomSheet } from '../ui/CommonUI.jsx';
import CombatScreen from '../CombatScreen.jsx';

const CLASS_IDS = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
const classById = (id) => CLASSES.find(c => c.id === id) || null;
const AUTO_SPEEDS = [1, 5, 10];
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
      </div>
    </BottomSheet>
  );
}

export default function RegressionGame({ reg, meta, onSave, onBack }) {
  const run = reg.run;
  const [pickClass, setPickClass] = useState('wanderer');
  const [showBook, setShowBook] = useState(false);
  const [banner, setBanner] = useState(null);
  const [carrySel, setCarrySel] = useState([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(1);

  const classData = run ? classById(run.classId) : null;
  const loadout = useMemo(() => (run && classData
    ? buildRegressionLoadout(run, classData.startSkills, GAME_CONFIG.startHp)
    : null), [run, classData]);
  // PM 결정: 본편 메타 강화 미적용 — 제단 업그레이드를 비운 meta로 전투
  const combatMeta = useMemo(() => ({ ...(meta || {}), upgrades: {} }), [meta]);

  const saveRun = (nextRun, extra = {}) => onSave({ run: nextRun, ...extra });

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
          <GlassPanel style={{ padding: 14 }}>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['명성', run.fame], ['기록', `${run.learned.length}종`], ['처치', run.kills.normal + run.kills.elite]].map(([l, v]) => (
                <div key={l}><div className="text-[11px]" style={{ color: PALETTE.textDim }}>{l}</div><div className="text-[17px] font-bold tabular-nums" style={{ color: PALETTE.text }}>{v}</div></div>
              ))}
            </div>
          </GlassPanel>
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

  // ===== 전투 (탐험 / 첨탑) =====
  const inSpire = run && run.spireRound != null && !run.over;
  if (run && loadout && (run.pending || inSpire)) {
    const spireKey = inSpire ? REGRESSION_SPIRE_CHAIN[run.spireRound] : null;
    const enemyKey = inSpire ? spireKey : run.pending.enemyKey;
    const override = inSpire ? buildRegressionSpireEnemy(run.spireRound, run.memoryCount) : null;
    const region = getRegressionRegion(run.region);
    const gimmick = !inSpire && region ? (CHAPTERS.find(ch => ch.id === region.chapterId)?.gimmick || null) : null;
    const finishSpire = (win, finalHp) => {
      const next = applyRegressionSpireResult(run, { win, hpPct: Math.max(0, finalHp / loadout.maxHp) });
      if (win && !next.over) setBanner(`🗼 첨탑 ${run.spireRound + 1}층 돌파`);
      saveRun(next);
    };
    const finishExplore = (win, finalHp, observations) => {
      const { run: next, learnedNow } = applyRegressionCombat(run, {
        enemyKey, tier: run.pending.tier, win,
        hpPct: Math.max(0, finalHp / loadout.maxHp), observations, intStat: classData.stats?.지능 || 10,
      });
      if (learnedNow.length) setBanner(`📖 기록 완성 — ${ENEMIES[learnedNow[0]].name}: ${describeRegressionRecord(learnedNow[0])}`);
      saveRun(next);
    };
    return (
      <CombatScreen
        key={`${run.day}-${enemyKey}-${run.spireRound ?? 'x'}`}
        classData={classData}
        initialPlayer={{ hp: loadout.hp, maxHp: loadout.maxHp, ...classData.stats }}
        initialSkills={loadout.skills}
        enemyKey={enemyKey}
        enemyOverride={override}
        isBoss={inSpire}
        expedition={null}
        meta={combatMeta}
        engravingFx={{}}
        chapterGimmick={gimmick}
        autoPlay={autoPlay}
        autoSpeed={autoSpeed}
        onToggleAuto={() => setAutoPlay(v => !v)}
        onCycleAutoSpeed={() => setAutoSpeed(s => AUTO_SPEEDS[(AUTO_SPEEDS.indexOf(s) + 1) % AUTO_SPEEDS.length])}
        onVictory={(finalHp, drop, stats) => (inSpire ? finishSpire(true, finalHp) : finishExplore(true, finalHp, stats?.observations || []))}
        onDefeat={(info) => (inSpire ? finishSpire(false, 0) : finishExplore(false, 0, info?.observations || []))}
      />
    );
  }

  // ===== 로비 =====
  if (!run) {
    const startLife = () => {
      setBanner(null);
      onSave({ run: createRegressionRun(reg, pickClass) });
    };
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

          <ActionButton icon={BookOpen} title={`기록서 (전생 포함 ${learnedEver}/${Object.keys(REGRESSION_RECORDS).length}종)`} sub="적별 기록 보상 보기" onClick={() => setShowBook(true)} />
          <UIButton variant="primary" className="w-full ui-sheen" onClick={startLife}>
            {reg.loops === 0 ? '여명의 마을에서 눈을 뜬다' : `${reg.loops + 1}번째 생을 시작한다`}
          </UIButton>
        </div>
        {showBook && <RecordBook reg={reg} run={null} onClose={() => setShowBook(false)} />}
      </div>
    );
  }

  // ===== 날짜 허브 =====
  const spireDay = isRegressionSpireDay(run);
  const actions = regressionActions(run);
  const region = getRegressionRegion(run.region);
  const gimmick = region ? CHAPTERS.find(ch => ch.id === region.chapterId)?.gimmick : null;
  const unrecorded = (tier) => region ? regressionEnemyPool(region.id, tier).filter(k => REGRESSION_RECORDS[k] && !run.learned.includes(k)).length : 0;

  const explore = (tier) => {
    const key = rollRegressionEnemy(run.region, tier);
    if (!key) return;
    setBanner(null);
    saveRun(startRegressionCombat(run, key, tier));
  };
  const doAction = (a) => {
    setBanner(null);
    if (a.kind === 'explore') return explore(a.tier);
    if (a.kind === 'rest') return saveRun(applyRegressionRest(run));
    if (a.kind === 'travel') return saveRun(applyRegressionTravel(run, a.to));
  };
  const goSpire = () => {
    setBanner(null);
    saveRun(enterRegressionSpire(run));
  };
  const daysLeft = Math.max(0, run.maxDays - run.day + 1);

  return (
    <div className="h-full flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
      <ScreenHeader title={regionLabel(run.region)} subtitle={`${reg.loops + 1}번째 생 · ${classData.name}`} onBack={onBack}
        right={<Chip icon={<Hourglass size={12} />} color={daysLeft <= 5 ? PALETTE.accent : PALETTE.dawn}>{spireDay ? '첨탑의 날' : `D${run.day}/${run.maxDays}`}</Chip>} />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {banner && (
          <GlassPanel strong style={{ padding: 12, border: `1px solid ${PALETTE.legendary}66` }}>
            <div className="text-[12px] font-bold" style={{ color: PALETTE.legendary }}>{banner}</div>
          </GlassPanel>
        )}

        <GlassPanel style={{ padding: 14 }} className="space-y-2.5">
          <Bar label="HP" value={loadout.hp} max={loadout.maxHp} color={PALETTE.accent} right={`${loadout.hp} / ${loadout.maxHp}`} />
          <Bar label={`명성 (첨탑 자격 ${REGRESSION_TUNING.fameGate})`} value={run.fame} max={REGRESSION_TUNING.fameGate}
            color={isRegressionSpireEligible(run) ? PALETTE.legendary : PALETTE.dawn} right={run.fame} />
          <Bar label="남은 날" value={daysLeft} max={run.maxDays} color={PALETTE.twilight} right={`${daysLeft}일`} />
        </GlassPanel>

        {spireDay ? (
          <GlassPanel strong style={{ padding: 16, textAlign: 'center' }}>
            <div className="text-[34px]">🗼</div>
            <div className="text-[15px] font-bold mt-1" style={{ color: PALETTE.legendary }}>황혼의 첨탑</div>
            <div className="text-[12px] mt-1 mb-3" style={{ color: PALETTE.textDim }}>
              {isRegressionSpireEligible(run)
                ? `4연전 — 층 사이 회복 없음${run.spireRestPct ? ` (기억: 층마다 +${run.spireRestPct}%)` : ''}.${run.memoryCount >= REGRESSION_TUNING.spireWeaknessMemories ? ' 기억 조각이 첨탑 주인의 약점을 비춘다.' : ''}`
                : `명성 ${run.fame} / ${REGRESSION_TUNING.fameGate} — 문은 이름 없는 자에게 열리지 않는다.`}
            </div>
            <UIButton variant="primary" className="w-full ui-sheen" onClick={goSpire}>
              {isRegressionSpireEligible(run) ? '첨탑에 오른다' : '황혼을 맞는다'}
            </UIButton>
          </GlassPanel>
        ) : (
          <>
            {region && gimmick && (
              <GlassPanel style={{ padding: 12 }}>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: PALETTE.text }}>
                  <MapPin size={14} color={PALETTE.dawn} /> <b>{gimmick.name}</b>
                  <span style={{ color: PALETTE.textDim }}>— {gimmick.desc}</span>
                </div>
              </GlassPanel>
            )}
            <div className="space-y-2">
              {actions.filter(a => a.kind === 'explore').map(a => (
                <ActionButton key={`ex-${a.tier}`} icon={a.tier === 'elite' ? Skull : Swords} color={a.tier === 'elite' ? PALETTE.accent : PALETTE.dawn}
                  title={a.tier === 'elite' ? '강적에게 도전 (1일)' : '탐험 (1일)'}
                  sub={`명성 +${Math.round(REGRESSION_TUNING.fameGain[a.tier] * (REGRESSION_TUNING.regionFameMult[run.region] || 1))} · 기록할 적 ${unrecorded(a.tier)}종 남음`}
                  onClick={() => doAction(a)} />
              ))}
              {region && !isRegressionEliteOpen(run, run.region) && (
                <div className="text-[11px] px-1" style={{ color: PALETTE.textDim }}>강적은 명성 {REGRESSION_TUNING.eliteFameGate}부터 나타난다.</div>
              )}
              <ActionButton icon={Tent} title="야영 (1일)" sub={`HP +${REGRESSION_TUNING.restHealPct}%`} color={PALETTE.green} onClick={() => doAction({ kind: 'rest' })} />
            </div>
            <GlassPanel style={{ padding: 12 }}>
              <div className="text-[12px] font-bold mb-2 flex items-center gap-1.5" style={{ color: PALETTE.dawn }}><Footprints size={14} /> 이동</div>
              <div className="grid grid-cols-2 gap-1.5">
                {actions.filter(a => a.kind === 'travel').map(a => (
                  <button key={`tr-${a.to}`} onClick={() => doAction(a)} className="ui-press px-2 text-left"
                    style={{ minHeight: 44, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}` }}>
                    <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>{regionLabel(a.to)}</div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                      {a.days}일{a.to !== REGRESSION_HUB ? ` · 위험 ${'★'.repeat(getRegressionRegion(a.to).danger)}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            </GlassPanel>
          </>
        )}

        <ActionButton icon={BookOpen} title={`기록서 (${run.learned.length}종 완성)`} sub="적별 기록 게이지·보상" onClick={() => setShowBook(true)} />

        <GlassPanel style={{ padding: 12 }}>
          <div className="text-[12px] font-bold mb-1.5 flex items-center gap-1.5" style={{ color: PALETTE.textDim }}><Sparkles size={13} /> 이번 생의 기록</div>
          <div className="space-y-0.5">
            {run.log.slice(-6).reverse().map((l, i) => (
              <div key={i} className="text-[11px]" style={{ color: i === 0 ? PALETTE.text : PALETTE.textDim }}>{l}</div>
            ))}
            {run.log.length === 0 && <div className="text-[11px]" style={{ color: PALETTE.textDim }}>여명의 마을. 황혼까지 {run.maxDays}일 — 이름을 알리고 첨탑에 올라야 한다.</div>}
          </div>
        </GlassPanel>
      </div>
      {showBook && <RecordBook reg={reg} run={run} onClose={() => setShowBook(false)} />}
    </div>
  );
}
