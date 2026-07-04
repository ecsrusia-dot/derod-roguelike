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
import { EXPEDITIONS, CHAMPIONSHIPS, CHAMPIONSHIP_DIFFICULTIES, CLASSES, CURSES } from '../data.js';
import { isChampionshipDifficultyUnlocked, getUnlockedChampionshipClasses, hasDailyCleared } from '../storage.js';
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

export default function ExpeditionSelect({ meta, onSelect, onSelectChampionship, onBack }) {
  const [tab, setTab] = useState('classic');

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
            </>
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

          <div className="ui-stagger flex flex-col gap-2">
            {CHAMPIONSHIPS.map((champ) => {
              const clears = meta.championshipClears?.[champ.id] || {};
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
