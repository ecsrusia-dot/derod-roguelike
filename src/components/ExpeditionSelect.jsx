// ============================================
// components/ExpeditionSelect.jsx — 원정 선택
// ============================================
// 세 탭:
// - 클래식: 튜토리얼 (4) + 수련의 길 (5직업)
// - 챌린지: 일일 챌린지 + 무한모드
// - 챔피언십: 5컨셉 × 4난이도 (직업 잠금 기반)
//
// 1.65.0 리디자인 (승인 시안 04절):
//   - 공통 헤더(뒤로가기 통일) + 세그먼트 탭 (활성색 dawn 단일 규칙)
//   - 카드: 글래스 + 상태 칩 1~2개로 다이어트, 9px 뱃지 나열 제거
//   - "다음에 갈 원정" 1개만 accent 글로우 하이라이트
//   - 잠긴 원정에 해금 진행 바 (튜토리얼 클리어 수 기반)
// ============================================

import React, { useState, useMemo } from 'react';
import { ChevronRight, Lock, Calendar } from 'lucide-react';
import { PALETTE, isUnlocked } from '../utils/helpers.js';
import { EXPEDITIONS, CHAMPIONSHIPS, CHAMPIONSHIP_DIFFICULTIES, CLASSES, CURSES, ENDLESS_SKIP_LIMIT, MASTERS_DUALS, MASTERS_TRIPLES, MASTERS_GIMMICKS, MASTERS_TUNING, getMastersKind, isMastersFusionUnlocked, CLASS_TITLES, TITLE_TIERS, TITLE_DROP_RATES } from '../data.js';
import { isChampionshipDifficultyUnlocked, getUnlockedChampionshipClasses, hasDailyCleared, getEndlessSkipUsed } from '../storage.js';
import { buildDailyExpedition } from '../utils/dailyChallenge.js';
import { ScreenHeader, Chip } from './ui/CommonUI.jsx';

// 좌측 정렬 섹션 라벨 + 헤어라인
function SectionLabel({ children, hint }) {
  return (
    <div className="mt-4 mb-2 first:mt-0">
      <div className="flex items-center gap-2.5">
        <span className="tracking-[0.25em] flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>{children}</span>
        <span className="flex-1 h-px" style={{ background: 'var(--ui-line)' }} />
      </div>
      {hint && <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim, opacity: 0.75 }}>{hint}</div>}
    </div>
  );
}

// 해금 진행 바
function UnlockProgress({ value, total, label }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between items-baseline mb-1">
        <span style={{ fontSize: 11, color: PALETTE.textDim }}>{label}</span>
        <span className="tabular-nums" style={{ fontSize: 11, color: PALETTE.textDim }}>{value}/{total}</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, (value / total) * 100)}%`, borderRadius: 999,
          background: 'linear-gradient(90deg, #8a6a3e, #e8b04a)',
        }} />
      </div>
    </div>
  );
}

// 원정 카드 — 글래스 + 상태 칩. highlight는 "지금 갈 원정" 1개에만
function ExpCard({ eyebrow, eyebrowColor, title, desc, chips, locked, cleared, highlight, progress, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className="ui-glass ui-press w-full text-left"
      style={{
        borderRadius: 14,
        padding: '11px 13px',
        ...(highlight ? {
          borderColor: `${PALETTE.accent}66`,
          background: `linear-gradient(160deg, ${PALETTE.accent}21, var(--ui-glass))`,
          boxShadow: `0 0 18px -6px ${PALETTE.accent}66`,
        } : {}),
        ...(locked ? { opacity: 0.55 } : {}),
      }}
    >
      {eyebrow && (
        <div className="tracking-[0.2em] mb-0.5" style={{ fontSize: 10, color: eyebrowColor || PALETTE.textDim, opacity: 0.85 }}>
          {eyebrow}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold truncate" style={{ fontSize: 13.5, color: locked ? PALETTE.textDim : PALETTE.text }}>{title}</span>
        {cleared && <Chip color={PALETTE.green} style={{ height: 20 }}>✓ 클리어</Chip>}
        {!cleared && (locked
          ? <Lock size={14} className="flex-none" style={{ color: PALETTE.textDim }} />
          : <ChevronRight size={14} className="flex-none" style={{ color: PALETTE.textDim }} />)}
      </div>
      {desc && <div className="mt-1 leading-relaxed" style={{ fontSize: 11, color: locked ? `${PALETTE.textDim}aa` : PALETTE.textDim }}>{desc}</div>}
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {chips.map((c, i) => <Chip key={i} color={c.color} style={{ height: 20 }}>{c.text}</Chip>)}
        </div>
      )}
      {progress}
    </button>
  );
}

export default function ExpeditionSelect({ meta, onSelect, onSelectChampionship, onSelectMasters = null, onEquipTitle = null, onEndlessSkip = null, onBack }) {
  const [tab, setTab] = useState('classic');
  // 1.89.0~ 마스터즈 칭호 컬렉션 — 보고 있는 직업
  const [titleClass, setTitleClass] = useState('wanderer');
  // 1.99.2~ 클리어 이력 직업 필터 (PM 지시) — null=전체(통합 기록), classId=해당 직업 기록
  //   챔피언십 직업별 기록은 1.26.0부터 / 마스터즈는 1.99.2부터 누적 (이전 클리어 소급 불가)
  const [clearFilter, setClearFilter] = useState(null);
  const ClearFilterChips = () => (
    <div className="flex gap-1.5 mb-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {[{ id: null, name: '전체' }, ...CLASSES.map(c => ({ id: c.id, name: c.name, color: c.color }))].map(f => {
        const active = clearFilter === f.id;
        return (
          <button key={f.id ?? 'all'} onClick={() => setClearFilter(f.id)} className="ui-press flex-none px-2.5 py-1 text-[10px]"
            style={{
              borderRadius: 999,
              background: active ? `${f.color || PALETTE.legendary}25` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? (f.color || PALETTE.legendary) : 'var(--ui-line)'}`,
              color: active ? (f.color || PALETTE.legendary) : PALETTE.textDim,
              fontWeight: active ? 700 : 400,
            }}>
            {f.name}
          </button>
        );
      })}
      <span className="flex-none self-center" style={{ fontSize: 8.5, color: PALETTE.textDim }}>클리어 표시 기준</span>
    </div>
  );
  // 1.73.0~ 무한던전 스킵 결과 모달
  const [skipResult, setSkipResult] = useState(null);

  const tutorials = EXPEDITIONS.filter(e => e.category === 'tutorial')
    .sort((a, b) => (a.tutorialOrder || 0) - (b.tutorialOrder || 0));
  const trainings = EXPEDITIONS.filter(e => e.category === 'training');
  const endlessExps = EXPEDITIONS.filter(e => e.category === 'endless');

  // 일일 챌린지 — 화면 진입 시점의 KST 날짜로 빌드
  const daily = useMemo(() => buildDailyExpedition(CURSES), []);
  const dailyCleared = hasDailyCleared(meta, daily.dailyDateKey);
  const dailyClassName = CLASSES[daily.forcedClassId]?.name || '?';

  const unlockedClasses = getUnlockedChampionshipClasses(meta);
  const championshipUnlocked = unlockedClasses.length > 0;

  // 해금 진행 바용 — 튜토리얼 클리어 수 (수련·무한모드 잠금이 모두 튜토리얼 기반)
  const clearedTutorialCount = tutorials.filter(t => meta.clearedExpeditions?.includes(t.id)).length;

  // "지금 갈 원정" 하이라이트 — 클래식 탭에서 잠기지 않은 첫 미클리어 원정 1개
  const nextClassicId = useMemo(() => {
    const all = [...tutorials, ...trainings];
    const next = all.find(e => !(e.unlockId && !isUnlocked(meta, e.unlockId)) && !meta.clearedExpeditions?.includes(e.id));
    return next?.id || null;
  }, [meta, tutorials, trainings]);

  const TABS = [
    { id: 'classic', label: '클래식' },
    { id: 'challenge', label: '챌린지' },
    { id: 'championship', label: '챔피언십' },
    { id: 'masters', label: '마스터즈' },
  ];

  return (
    <div className="absolute inset-0 flex flex-col" style={{
      background: `radial-gradient(120% 40% at 50% -8%, ${PALETTE.dawn}17, transparent), ${PALETTE.bg}`,
    }}>
      <div className="pt-2">
        <ScreenHeader
          title="원정 선택"
          onBack={onBack}
          right={<Chip color={PALETTE.legendary} icon={<span>✦</span>}><span className="tabular-nums">{meta?.souls || 0}</span></Chip>}
        />
      </div>

      {/* 세그먼트 탭 — 활성색 dawn 단일 규칙 */}
      <div className="mx-3 mb-2 flex gap-1 p-1 flex-none" style={{
        borderRadius: 'var(--r-btn)',
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid var(--ui-line)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="ui-press flex-1 text-center" style={{
            padding: '8px 0',
            borderRadius: 10,
            fontSize: 12,
            letterSpacing: '0.08em',
            ...(tab === t.id ? {
              background: 'linear-gradient(160deg, rgba(212,165,116,0.22), rgba(212,165,116,0.08))',
              border: '1px solid var(--ui-line-strong)',
              color: PALETTE.dawn,
              fontWeight: 600,
            } : {
              background: 'transparent',
              border: '1px solid transparent',
              color: PALETTE.textDim,
            }),
          }}>{t.label}</button>
        ))}
      </div>

      {/* ====== 챌린지 탭 ====== */}
      {tab === 'challenge' && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SectionLabel hint="매일 자정(KST) 갱신 · 모든 플레이어가 동일 조건">일일 챌린지</SectionLabel>
          <div className="ui-stagger flex flex-col gap-2">
            <ExpCard
              eyebrow={<span className="inline-flex items-center gap-1"><Calendar size={10} /> DAILY · {daily.dailyDateKey.slice(4, 6)}/{daily.dailyDateKey.slice(6, 8)}</span>}
              eyebrowColor={daily.color}
              title={daily.name}
              desc={daily.desc}
              cleared={dailyCleared}
              highlight={!dailyCleared}
              chips={[
                { text: `직업 ${dailyClassName}`, color: daily.color },
                { text: `챕터 ${daily.chapters[0]}`, color: daily.color },
                ...(daily.fixedCurses || []).map(c => ({ text: `저주 ${c.name}`, color: c.color })),
                { text: `영혼 +${daily.soulReward}${dailyCleared ? '' : ' (+100 첫 클리어)'}`, color: PALETTE.twilight },
              ]}
              onClick={() => onSelect(daily)}
            />
          </div>

          {endlessExps.length > 0 && (
            <>
              <SectionLabel hint="쓰러질 때까지 이어지는 도전 · 깊이 = 영혼">무한모드</SectionLabel>
              <div className="ui-stagger flex flex-col gap-2">
                {endlessExps.map((exp) => {
                  const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
                  return (
                    <ExpCard key={exp.id}
                      eyebrow="ENDLESS" eyebrowColor={exp.color}
                      title={exp.name} desc={exp.desc}
                      locked={locked}
                      chips={locked ? [] : [
                        { text: '깊이당 적 강화', color: exp.color },
                        { text: '깊이 × 15 영혼', color: PALETTE.twilight },
                      ]}
                      progress={locked && (
                        <UnlockProgress value={clearedTutorialCount} total={tutorials.length} label="해금 조건 — 튜토리얼 클리어" />
                      )}
                      onClick={() => !locked && onSelect(exp)}
                    />
                  );
                })}
              </div>

              {/* 1.73.0~ 무한던전 스킵 — 하루 5회, 실전투 시뮬 보상 */}
              {onEndlessSkip && endlessExps.some(e => !(e.unlockId && !isUnlocked(meta, e.unlockId))) && (() => {
                const skipUsed = getEndlessSkipUsed(meta, daily.dailyDateKey);
                const skipLeft = Math.max(0, ENDLESS_SKIP_LIMIT - skipUsed);
                const exhausted = skipLeft <= 0;
                return (
                  <button
                    onClick={() => { const r = onEndlessSkip(); if (r) setSkipResult(r); }}
                    disabled={exhausted}
                    className="ui-press w-full mt-2 flex items-center justify-between px-3.5"
                    style={{
                      height: 44, borderRadius: 'var(--r-btn)',
                      background: exhausted ? 'rgba(255,255,255,0.03)' : 'rgba(232,176,74,0.1)',
                      border: `1px solid ${exhausted ? 'var(--ui-line)' : 'rgba(232,176,74,0.45)'}`,
                      color: exhausted ? PALETTE.textDim : PALETTE.legendary,
                      opacity: exhausted ? 0.55 : 1,
                    }}>
                    <span className="font-bold" style={{ fontSize: 12 }}>⚡ 전투 스킵 — 시뮬레이션 보상</span>
                    <span className="tabular-nums" style={{ fontSize: 11, color: exhausted ? PALETTE.textDim : PALETTE.dawn }}>
                      오늘 {skipLeft}/{ENDLESS_SKIP_LIMIT}
                    </span>
                  </button>
                );
              })()}
            </>
          )}

          {/* 스킵 결과 모달 */}
          {skipResult && (
            <div onClick={() => setSkipResult(null)} className="absolute inset-0 z-40 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
              <div onClick={(e) => e.stopPropagation()} className="w-full px-4 py-5 text-center" style={{
                borderRadius: 18, background: 'var(--ui-glass-strong, rgba(20,14,12,0.95))',
                border: `1px solid ${PALETTE.legendary}66`,
              }}>
                <div className="tracking-[0.3em] font-bold mb-3" style={{ fontSize: 11, color: PALETTE.legendary }}>⚡ 스킵 시뮬레이션 결과</div>
                <div style={{ fontSize: 12, color: PALETTE.textDim }}>최고 결과 직업</div>
                <div className="font-bold mb-3" style={{ fontSize: 15, color: PALETTE.text }}>{skipResult.className}</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    ['도달 깊이', `${skipResult.depth}`],
                    ['처치', `${skipResult.kills + skipResult.elites + skipResult.bosses}`],
                    ['보스', `${skipResult.bosses}`],
                  ].map(([label, value]) => (
                    <div key={label} className="py-2" style={{ borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)' }}>
                      <div style={{ fontSize: 9, color: PALETTE.textDim }}>{label}</div>
                      <div className="font-bold tabular-nums" style={{ fontSize: 14, color: PALETTE.text }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="font-bold tabular-nums mb-4" style={{ fontSize: 20, color: PALETTE.legendary }}>✦ +{skipResult.souls}</div>
                <button onClick={() => setSkipResult(null)} className="ui-press w-full" style={{
                  height: 42, borderRadius: 'var(--r-btn)',
                  background: 'rgba(232,176,74,0.15)', border: `1px solid ${PALETTE.legendary}`,
                  color: PALETTE.text, fontSize: 12, letterSpacing: '0.2em',
                }}>확인</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== 클래식 탭 ====== */}
      {tab === 'classic' && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SectionLabel hint="방랑검사로 게임 시스템을 익히세요">튜토리얼</SectionLabel>
          <div className="ui-stagger flex flex-col gap-2">
            {tutorials.map((exp) => {
              const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
              const cleared = meta.clearedExpeditions?.includes(exp.id);
              return (
                <ExpCard key={exp.id}
                  eyebrow={`TUTORIAL ${exp.tutorialOrder}`} eyebrowColor={exp.color}
                  title={exp.name} desc={exp.desc}
                  locked={locked} cleared={cleared}
                  highlight={exp.id === nextClassicId}
                  chips={[
                    { text: `영혼 +${exp.soulReward}`, color: PALETTE.twilight },
                    ...(locked ? [{ text: '이전 단계 클리어 필요', color: PALETTE.accent }] : []),
                  ]}
                  onClick={() => !locked && onSelect(exp)}
                />
              );
            })}
          </div>

          <SectionLabel hint="각 직업 수련을 클리어하면 챔피언십에서 사용 가능">수련의 길</SectionLabel>
          <div className="ui-stagger flex flex-col gap-2">
            {trainings.map((exp) => {
              const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
              const cleared = meta.clearedExpeditions?.includes(exp.id);
              const classData = CLASSES[exp.forcedClassId];
              return (
                <ExpCard key={exp.id}
                  eyebrow={`TRAINING · ${classData?.name || ''}`} eyebrowColor={exp.color}
                  title={exp.name} desc={exp.desc}
                  locked={locked} cleared={cleared}
                  highlight={exp.id === nextClassicId}
                  chips={[
                    { text: `영혼 +${exp.soulReward}`, color: PALETTE.twilight },
                    { text: '4챕터', color: PALETTE.legendary },
                  ]}
                  progress={locked && (
                    <UnlockProgress value={clearedTutorialCount} total={tutorials.length} label="해금 조건 — 튜토리얼 클리어" />
                  )}
                  onClick={() => !locked && onSelect(exp)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ====== 마스터즈 탭 (1.89.0~) — 챔피언십 퓨전 던전 + 칭호 ====== */}
      {tab === 'masters' && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SectionLabel hint="컨셉 기믹이 전부 동시 적용 · 보스는 한 방에서 연속 처치">퓨전 던전 — 듀얼 10 × 트리플 10</SectionLabel>

          {/* 칭호 컬렉션 — 직업별 획득·장착 (1개만) */}
          <div className="ui-glass mb-2.5" style={{ borderRadius: 14, padding: '10px 13px' }}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span style={{ fontSize: 11.5, fontWeight: 700, color: PALETTE.legendary }}>◆ 칭호 컬렉션</span>
              <span style={{ fontSize: 9, color: PALETTE.textDim }}>직업당 1개 장착 — 런에 자동 적용</span>
            </div>
            <div className="flex gap-1 flex-wrap mb-1.5">
              {CLASSES.map(cls => (
                <button key={cls.id} onClick={() => setTitleClass(cls.id)} className="ui-press" style={{
                  height: 22, padding: '0 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: titleClass === cls.id ? 'rgba(212,165,116,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${titleClass === cls.id ? PALETTE.dawn : 'var(--ui-line)'}`,
                  color: titleClass === cls.id ? PALETTE.dawn : PALETTE.textDim,
                }}>{cls.name}</button>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {(CLASS_TITLES[titleClass] || []).map(t => {
                const tier = TITLE_TIERS[t.tier];
                const owned = (meta.titles?.[titleClass] || []).includes(t.id);
                const equipped = meta.equippedTitle?.[titleClass] === t.id;
                return (
                  <div key={t.id} className="flex items-center justify-between px-2.5 py-1.5" style={{
                    borderRadius: 9, background: owned ? `${tier.color}12` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${owned ? `${tier.color}77` : 'var(--ui-line)'}`, opacity: owned ? 1 : 0.55,
                  }}>
                    <div className="min-w-0">
                      <div style={{ fontSize: 10.5 }}>
                        <span style={{ color: tier.color, fontWeight: 700 }}>[{tier.name}]</span>{' '}
                        <span style={{ color: owned ? PALETTE.text : PALETTE.textDim }}>{owned ? t.name : '???'}</span>
                      </div>
                      <div style={{ fontSize: 8.5, color: PALETTE.textDim }}>{owned ? t.desc : '마스터즈 던전 클리어 시 확률 획득'}</div>
                    </div>
                    {owned && onEquipTitle && (
                      <button onClick={() => onEquipTitle(titleClass, equipped ? null : t.id)} className="ui-press flex-none ml-2" style={{
                        fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                        background: equipped ? 'rgba(154,212,163,0.18)' : 'rgba(232,176,74,0.14)',
                        border: `1px solid ${equipped ? PALETTE.green : `${PALETTE.legendary}77`}`,
                        color: equipped ? PALETTE.green : PALETTE.legendary,
                      }}>{equipped ? '✓ 장착 중' : '장착'}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ClearFilterChips />
          {[['듀얼 퓨전 — 2컨셉 융합 · 보스 2연전', MASTERS_DUALS], ['트리플 퓨전 — 3컨셉 융합 · 보스 3연전 (최종)', MASTERS_TRIPLES]].map(([label, list]) => (
            <React.Fragment key={label}>
              <SectionLabel>{label}</SectionLabel>
              <div className="ui-stagger flex flex-col gap-2 mb-3">
                {list.map(fusion => {
                  const kind = getMastersKind(fusion);
                  const tune = MASTERS_TUNING[kind];
                  const unlocked = isMastersFusionUnlocked(meta, fusion);
                  const gimmicks = fusion.concepts.map(c => MASTERS_GIMMICKS[c]);
                  const conceptNames = fusion.concepts.map(c => CHAMPIONSHIPS.find(x => x.id === c)?.name || c);
                  // 1.99.2~ 직업 필터: 선택 직업의 기록(1.99.2부터 누적, 소급 불가)만 표시
                  const cleared = clearFilter
                    ? !!meta.mastersClearsByClass?.[clearFilter]?.[fusion.id]
                    : meta.clearedExpeditions?.includes(fusion.id);
                  const rates = TITLE_DROP_RATES[kind];
                  return (
                    <button key={fusion.id} disabled={!unlocked} onClick={() => unlocked && onSelectMasters?.(fusion)}
                      className="ui-press ui-glass text-left" style={{
                        borderRadius: 14, padding: '11px 13px',
                        borderColor: unlocked ? 'rgba(232,176,74,0.35)' : 'var(--ui-line)',
                        opacity: unlocked ? 1 : 0.5,
                      }}>
                      <div className="flex items-center justify-between">
                        <span className="tracking-[0.15em]" style={{ fontSize: 9, color: PALETTE.legendary }}>
                          MASTERS · {kind === 'triple' ? 'TRIPLE' : 'DUAL'} FUSION
                        </span>
                        {cleared && <span style={{ fontSize: 9.5, color: PALETTE.green }}>✓ 클리어</span>}
                      </div>
                      <div className="font-semibold mt-0.5" style={{ fontSize: 13.5, color: PALETTE.text }}>{fusion.name}</div>
                      <div style={{ fontSize: 9.5, color: PALETTE.textDim }}>{conceptNames.join(' × ')}</div>
                      <div className="mt-1" style={{ fontSize: 10, color: PALETTE.dawn }}>
                        ◆ {gimmicks.map(g => g.name).join(' + ')} — 전부 동시 적용
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className="tabular-nums" style={{ fontSize: 9, color: PALETTE.accent }}>적 HP ×{tune.enemyHpMult} · 공격 ×{tune.enemyDmgMult}</span>
                        <span style={{ fontSize: 9, color: PALETTE.accent }}>보스 {fusion.concepts.length}연전 (회복 없음)</span>
                        <span className="tabular-nums" style={{ fontSize: 9, color: PALETTE.legendary }}>✦ {tune.soulReward}</span>
                        <span className="tabular-nums" style={{ fontSize: 9, color: PALETTE.legendary }}>칭호 태초 {Math.round(rates.M * 1000) / 10}%</span>
                      </div>
                      {!unlocked && (
                        <div className="mt-1" style={{ fontSize: 9, color: PALETTE.accent }}>
                          🔒 구성 컨셉({conceptNames.join('·')}) 챔피언십 지옥 이상 클리어 필요
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ====== 챔피언십 탭 ====== */}
      {tab === 'championship' && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SectionLabel hint="각 원정은 고유한 적 패턴과 전술이 적용됩니다">컨셉별 5개 원정 × 4난이도</SectionLabel>

          {!championshipUnlocked ? (
            <div className="ui-glass mb-2" style={{ borderRadius: 14, padding: '10px 13px', borderColor: `${PALETTE.accent}55` }}>
              <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: PALETTE.accent }}>
                <Lock size={12} /> 아직 사용 가능한 직업이 없습니다
              </p>
              <p className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>클래식 탭의 수련의 길을 클리어하세요</p>
            </div>
          ) : (
            <div className="ui-glass mb-2" style={{ borderRadius: 14, padding: '9px 13px', borderColor: 'rgba(232,176,74,0.3)' }}>
              <p style={{ fontSize: 11, color: PALETTE.legendary }}>
                사용 가능 직업 — {unlockedClasses.map(i => CLASSES[i]?.name).filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          <ClearFilterChips />
          <div className="ui-stagger flex flex-col gap-2">
            {CHAMPIONSHIPS.map((champ) => {
              // 1.99.2~ 직업 필터: 선택 직업의 기록(1.26.0~ 누적)만 표시 — 해금 게이트는 전체 기록 유지
              const clears = clearFilter
                ? (meta.championshipClearsByClass?.[clearFilter]?.[champ.id] || {})
                : (meta.championshipClears?.[champ.id] || {});
              const clearCount = Object.values(clears).filter(Boolean).length;
              const allCleared = clearCount === 4;
              const canEnter = championshipUnlocked;
              return (
                <button key={champ.id}
                  onClick={() => canEnter && onSelectChampionship(champ)}
                  disabled={!canEnter}
                  className="ui-glass ui-press w-full text-left"
                  style={{ borderRadius: 14, padding: '12px 13px', ...(canEnter ? {} : { opacity: 0.55 }) }}
                >
                  <div className="tracking-[0.2em] mb-0.5" style={{ fontSize: 10, color: champ.color, opacity: 0.85 }}>
                    CHAMPIONSHIP · {champ.sub}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold" style={{ fontSize: 14.5, color: PALETTE.text }}>{champ.name}</span>
                    {allCleared
                      ? <Chip color={PALETTE.legendary} style={{ height: 20 }}>★ 마스터</Chip>
                      : (canEnter
                        ? <ChevronRight size={15} className="flex-none" style={{ color: PALETTE.textDim }} />
                        : <Lock size={15} className="flex-none" style={{ color: PALETTE.textDim }} />)}
                  </div>
                  <p className="mt-1 leading-relaxed" style={{ fontSize: 11, color: PALETTE.textDim }}>{champ.desc}</p>
                  <p className="mt-1.5" style={{ fontSize: 11, color: champ.color, opacity: 0.9 }}>◆ {champ.concept}</p>
                  <div className="flex gap-1.5 mt-2.5">
                    {CHAMPIONSHIP_DIFFICULTIES.map((d) => {
                      const cleared = !!clears[d.id];
                      const unlocked = isChampionshipDifficultyUnlocked(meta, champ.id, d.id);
                      return (
                        <span key={d.id} className="flex-1 text-center" style={{
                          padding: '4px 0',
                          borderRadius: 999,
                          fontSize: 11,
                          background: cleared ? 'rgba(232,176,74,0.14)' : unlocked ? `${champ.color}12` : 'transparent',
                          color: cleared ? PALETTE.legendary : unlocked ? champ.color : PALETTE.textDim,
                          border: `1px solid ${cleared ? 'rgba(232,176,74,0.4)' : unlocked ? `${champ.color}55` : 'var(--ui-line)'}`,
                          opacity: unlocked ? 1 : 0.55,
                        }}>
                          {cleared ? '✓ ' : unlocked ? '' : '🔒 '}{d.name}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
