// ============================================
// components/ExpeditionSelect.jsx — 원정 선택
// ============================================
// 두 탭:
// - 클래식: 튜토리얼 (2) + 수련의 길 (5직업)
// - 챔피언십: 5컨셉 × 4난이도 (직업 잠금 기반)
// ============================================

import React, { useState, useMemo } from 'react';
import { ChevronRight, Lock, Calendar } from 'lucide-react';
import { PALETTE, isUnlocked } from '../utils/helpers.js';
import { EXPEDITIONS, CHAMPIONSHIPS, CHAMPIONSHIP_DIFFICULTIES, CLASSES, CURSES } from '../data.js';
import { isChampionshipDifficultyUnlocked, getUnlockedChampionshipClasses, hasDailyCleared } from '../storage.js';
import { buildDailyExpedition } from '../utils/dailyChallenge.js';

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
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.textDim }}>
          ◆ 원정을 선택하세요 ◆
        </p>
      </div>
      
      <div className="grid grid-cols-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={() => setTab('classic')} className="py-3 text-[11px] tracking-[0.2em]" style={{
          background: tab === 'classic' ? PALETTE.bgDeep : 'transparent',
          color: tab === 'classic' ? PALETTE.dawn : PALETTE.textDim,
          borderBottom: tab === 'classic' ? `2px solid ${PALETTE.dawn}` : 'none',
        }}>클래식</button>
        <button onClick={() => setTab('challenge')} className="py-3 text-[11px] tracking-[0.2em]" style={{
          background: tab === 'challenge' ? PALETTE.bgDeep : 'transparent',
          color: tab === 'challenge' ? '#d4d4a0' : PALETTE.textDim,
          borderBottom: tab === 'challenge' ? `2px solid #d4d4a0` : 'none',
        }}>챌린지</button>
        <button onClick={() => setTab('championship')} className="py-3 text-[11px] tracking-[0.2em]" style={{
          background: tab === 'championship' ? PALETTE.bgDeep : 'transparent',
          color: tab === 'championship' ? PALETTE.legendary : PALETTE.textDim,
          borderBottom: tab === 'championship' ? `2px solid ${PALETTE.legendary}` : 'none',
        }}>챔피언십</button>
      </div>
      
      {/* ====== 챌린지 탭 ====== */}
      {tab === 'challenge' && (
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* === 일일 챌린지 === */}
        <div className="mb-4">
          <p className="text-center text-[10px] mb-2 tracking-[0.3em]" style={{ color: daily.color, opacity: 0.8 }}>
            ━━ 일일 챌린지 ━━
          </p>
          <p className="text-center text-[9px] mb-3" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
            매일 자정(KST) 갱신 · 모든 플레이어가 동일 조건
          </p>
          <button onClick={() => onSelect(daily)}
            className="w-full text-left relative overflow-hidden transition-all"
            style={{
              background: `linear-gradient(135deg, ${daily.color}30, ${PALETTE.bgDeep})`,
              border: `1.5px solid ${daily.color}`,
              boxShadow: dailyCleared ? `0 0 12px ${daily.color}30` : 'none',
            }}>
            <div className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1">
                  <div className="text-[9px] tracking-[0.2em] flex items-center gap-1" style={{ color: daily.color, opacity: 0.8 }}>
                    <Calendar size={10} /> DAILY · {daily.dailyDateKey.slice(4,6)}/{daily.dailyDateKey.slice(6,8)}
                  </div>
                  <div className="text-sm font-bold flex items-center gap-2 mt-0.5" style={{ color: PALETTE.text }}>
                    {daily.name}
                    {dailyCleared && <span className="text-[9px] px-1.5 py-0.5" style={{
                      background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                      border: `1px solid ${PALETTE.legendary}80`,
                    }}>오늘 완료</span>}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: daily.color }} />
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: PALETTE.textDim }}>{daily.desc}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[9px] px-1.5 py-0.5" style={{
                  background: `${daily.color}25`, color: daily.color,
                }}>직업: {dailyClassName}</span>
                <span className="text-[9px] px-1.5 py-0.5" style={{
                  background: `${daily.color}25`, color: daily.color,
                }}>챕터 {daily.chapters[0]}</span>
                {daily.fixedCurses && daily.fixedCurses.map((c, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5" style={{
                    background: `${c.color}25`, color: c.color,
                  }}>저주: {c.name}</span>
                ))}
                <span className="text-[9px] px-1.5 py-0.5" style={{
                  background: `${PALETTE.twilight}20`, color: PALETTE.twilight,
                }}>영혼 +{daily.soulReward}{dailyCleared ? '' : ' (+100 첫 클리어)'}</span>
              </div>
            </div>
          </button>
        </div>

        {/* === 무한모드 === */}
        {endlessExps.length > 0 && (
        <div className="mb-4">
          <p className="text-center text-[10px] mb-2 tracking-[0.3em]" style={{ color: '#5c1a1a', opacity: 0.9 }}>
            ━━ 무한모드 ━━
          </p>
          <p className="text-center text-[9px] mb-3" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
            쓰러질 때까지 이어지는 도전 · 깊이 = 영혼
          </p>
          <div className="space-y-2">
            {endlessExps.map((exp) => {
              const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
              return (
                <button key={exp.id} onClick={() => !locked && onSelect(exp)} disabled={locked}
                  className="w-full text-left relative overflow-hidden transition-all"
                  style={{
                    background: locked
                      ? `linear-gradient(135deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`
                      : `linear-gradient(135deg, ${exp.color}30, ${PALETTE.bgDeep})`,
                    border: `1.5px solid ${locked ? PALETTE.panelBorder : exp.color}`,
                    opacity: locked ? 0.4 : 1,
                  }}>
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="text-[9px] tracking-[0.2em]" style={{ color: exp.color, opacity: 0.8 }}>
                          ENDLESS
                        </div>
                        <div className="text-sm font-bold mt-0.5" style={{ color: PALETTE.text }}>
                          {exp.name}
                        </div>
                      </div>
                      {locked
                        ? <Lock size={14} style={{ color: PALETTE.textDim }} />
                        : <ChevronRight size={14} style={{ color: exp.color }} />}
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: PALETTE.textDim }}>{exp.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[9px] px-1.5 py-0.5" style={{
                        background: `${exp.color}25`, color: exp.color,
                      }}>깊이당 적 강화</span>
                      <span className="text-[9px] px-1.5 py-0.5" style={{
                        background: `${PALETTE.twilight}20`, color: PALETTE.twilight,
                      }}>깊이 × 15 영혼</span>
                      {locked && (
                        <span className="text-[9px] px-1.5 py-0.5" style={{
                          background: `${PALETTE.accent}20`, color: PALETTE.accent,
                        }}>모든 튜토리얼 클리어 필요</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>
      )}

      {/* ====== 클래식 탭 ====== */}
      {tab === 'classic' && (
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 튜토리얼 */}
        <div className="mb-4">
          <p className="text-center text-[10px] mb-2 tracking-[0.3em]" style={{ color: PALETTE.dawn, opacity: 0.7 }}>
            ━━ 튜토리얼 ━━
          </p>
          <p className="text-center text-[9px] mb-3" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
            방랑검사로 게임 시스템을 익히세요
          </p>
          <div className="space-y-2">
            {tutorials.map((exp) => {
              const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
              const cleared = meta.clearedExpeditions?.includes(exp.id);
              return (
                <button key={exp.id} onClick={() => !locked && onSelect(exp)} disabled={locked}
                  className="w-full text-left relative overflow-hidden transition-all"
                  style={{
                    background: locked
                      ? `linear-gradient(135deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`
                      : `linear-gradient(135deg, ${exp.color}25, ${PALETTE.bgDeep})`,
                    border: `1px solid ${locked ? PALETTE.panelBorder : exp.color}`,
                    opacity: locked ? 0.4 : 1,
                  }}>
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="text-[9px] tracking-[0.2em]" style={{ color: exp.color, opacity: 0.7 }}>
                          TUTORIAL {exp.tutorialOrder}
                        </div>
                        <div className="text-sm font-bold flex items-center gap-2 mt-0.5" style={{ color: PALETTE.text }}>
                          {exp.name}
                          {cleared && <span className="text-[9px] px-1.5 py-0.5" style={{
                            background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                            border: `1px solid ${PALETTE.legendary}80`,
                          }}>완료</span>}
                        </div>
                      </div>
                      {locked
                        ? <Lock size={14} style={{ color: PALETTE.textDim }} />
                        : <ChevronRight size={14} style={{ color: exp.color }} />}
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: PALETTE.textDim }}>{exp.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[9px] px-1.5 py-0.5" style={{ 
                        background: `${PALETTE.twilight}20`, color: PALETTE.twilight 
                      }}>영혼 +{exp.soulReward}</span>
                      {locked && (
                        <span className="text-[9px] px-1.5 py-0.5" style={{ 
                          background: `${PALETTE.accent}20`, color: PALETTE.accent 
                        }}>이전 단계 클리어 필요</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* 수련의 길 */}
        <div className="mt-5">
          <p className="text-center text-[10px] mb-2 tracking-[0.3em]" style={{ color: PALETTE.accent, opacity: 0.7 }}>
            ━━ 수련의 길 ━━
          </p>
          <p className="text-center text-[9px] mb-3" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
            각 직업 수련을 클리어하면 챔피언십에서 사용 가능
          </p>
          <div className="space-y-2">
            {trainings.map((exp) => {
              const locked = exp.unlockId && !isUnlocked(meta, exp.unlockId);
              const cleared = meta.clearedExpeditions?.includes(exp.id);
              const classData = CLASSES[exp.forcedClassId];
              return (
                <button key={exp.id} onClick={() => !locked && onSelect(exp)} disabled={locked}
                  className="w-full text-left relative overflow-hidden transition-all"
                  style={{
                    background: locked
                      ? `linear-gradient(135deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`
                      : `linear-gradient(135deg, ${exp.color}25, ${PALETTE.bgDeep})`,
                    border: `1px solid ${locked ? PALETTE.panelBorder : exp.color}`,
                    opacity: locked ? 0.4 : 1,
                  }}>
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="text-[9px] tracking-[0.2em]" style={{ color: exp.color, opacity: 0.7 }}>
                          TRAINING · {classData?.name || ''}
                        </div>
                        <div className="text-sm font-bold flex items-center gap-2 mt-0.5" style={{ color: PALETTE.text }}>
                          {exp.name}
                          {cleared && <span className="text-[9px] px-1.5 py-0.5" style={{
                            background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                            border: `1px solid ${PALETTE.legendary}80`,
                          }}>완료</span>}
                        </div>
                      </div>
                      {locked
                        ? <Lock size={14} style={{ color: PALETTE.textDim }} />
                        : <ChevronRight size={14} style={{ color: exp.color }} />}
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: PALETTE.textDim }}>{exp.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[9px] px-1.5 py-0.5" style={{ 
                        background: `${PALETTE.twilight}20`, color: PALETTE.twilight 
                      }}>영혼 +{exp.soulReward}</span>
                      <span className="text-[9px] px-1.5 py-0.5" style={{ 
                        background: `${PALETTE.legendary}20`, color: PALETTE.legendary 
                      }}>4챕터</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}
      
      {tab === 'championship' && (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <p className="text-center text-[10px] mb-1" style={{ color: PALETTE.legendary, opacity: 0.7 }}>
          전술형 — 컨셉별 5개 원정 × 4난이도
        </p>
        <p className="text-center text-[9px] mb-2" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
          각 원정은 고유한 적 패턴과 전술이 적용됩니다
        </p>
        
        {!championshipUnlocked ? (
          <div className="px-3 py-3 mb-3" style={{
            background: `${PALETTE.accent}10`,
            border: `1px solid ${PALETTE.accent}60`,
          }}>
            <p className="text-[11px] text-center" style={{ color: PALETTE.accent }}>
              <Lock size={12} className="inline mr-1" />
              아직 사용 가능한 직업이 없습니다
            </p>
            <p className="text-[10px] text-center mt-1" style={{ color: PALETTE.textDim }}>
              클래식 탭의 수련의 길을 클리어하세요
            </p>
          </div>
        ) : (
          <div className="px-3 py-2 mb-3" style={{
            background: `${PALETTE.legendary}10`,
            border: `1px solid ${PALETTE.legendary}60`,
          }}>
            <p className="text-[10px] text-center" style={{ color: PALETTE.legendary }}>
              사용 가능 직업: {unlockedClasses.map(i => CLASSES[i]?.name).filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        
        {CHAMPIONSHIPS.map((champ) => {
          const clears = meta.championshipClears?.[champ.id] || {};
          const clearCount = Object.values(clears).filter(Boolean).length;
          const allCleared = clearCount === 4;
          const canEnter = championshipUnlocked;
          return (
            <button key={champ.id} 
              onClick={() => canEnter && onSelectChampionship(champ)}
              disabled={!canEnter}
              className="w-full text-left relative overflow-hidden transition-all"
              style={{
                background: `linear-gradient(135deg, ${champ.color}25, ${PALETTE.bgDeep})`,
                border: `1px solid ${champ.color}`,
                opacity: canEnter ? 1 : 0.4,
              }}>
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-[10px] tracking-[0.2em] mb-0.5" style={{ color: champ.color, opacity: 0.7 }}>
                      CHAMPIONSHIP · {champ.sub}
                    </div>
                    <div className="text-base font-bold flex items-center gap-2 flex-wrap" style={{ color: PALETTE.text }}>
                      {champ.name}
                      {allCleared && <span className="text-[10px] px-1.5 py-0.5" style={{
                        background: `${PALETTE.legendary}20`, color: PALETTE.legendary,
                        border: `1px solid ${PALETTE.legendary}80`,
                      }}>마스터</span>}
                    </div>
                  </div>
                  {canEnter
                    ? <ChevronRight size={16} style={{ color: champ.color }} />
                    : <Lock size={16} style={{ color: PALETTE.textDim }} />}
                </div>
                <p className="text-[11px] mb-2 leading-relaxed" style={{ color: PALETTE.textDim }}>{champ.desc}</p>
                <div className="text-[10px] mb-2 px-2 py-1" style={{ 
                  background: `${champ.color}15`, color: champ.color, opacity: 0.85,
                  border: `1px solid ${champ.color}40`,
                }}>
                  ◆ {champ.concept}
                </div>
                <div className="flex gap-1 mt-2">
                  {CHAMPIONSHIP_DIFFICULTIES.map((d) => {
                    const cleared = !!clears[d.id];
                    const unlocked = isChampionshipDifficultyUnlocked(meta, champ.id, d.id);
                    return (
                      <span key={d.id} className="flex-1 text-[9px] text-center py-1" style={{
                        background: cleared ? `${PALETTE.legendary}30` : unlocked ? `${champ.color}10` : 'transparent',
                        color: cleared ? PALETTE.legendary : unlocked ? champ.color : PALETTE.textDim,
                        border: `1px solid ${cleared ? PALETTE.legendary : unlocked ? champ.color : PALETTE.panelBorder}40`,
                        opacity: unlocked ? 1 : 0.5,
                      }}>
                        {cleared ? '✓ ' : unlocked ? '' : '🔒 '}{d.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}
      
      <div className="p-4 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="w-full py-2 text-[11px] tracking-[0.3em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
    </div>
  );
}
