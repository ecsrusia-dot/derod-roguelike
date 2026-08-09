// ============================================
// components/TitleScreen.jsx — 메인 타이틀 화면
// ============================================
// 1.65.0 리디자인 (승인 시안 03절):
//   - accent(와인 그라디언트)는 "여정 시작" 1개에만 — 시선 3단계 정리
//   - 이어하기는 골드 하이라이트 행, 제단·각인·업적은 글래스 리스트로
//   - 로고 부유 모션 + 골드 그라디언트 타이틀 + CTA 셔츠광
// ============================================
import React from 'react';
import { PlayCircle, Sparkles, Gem, Trophy, ChevronRight, Swords } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GAME_VERSION, CLASSES, DAILY_MISSIONS } from '../data.js';
import { getKstDateKey } from '../utils/dailyChallenge.js';
import { GlassPanel, Chip, UIButton } from './ui/CommonUI.jsx';

// 글래스 리스트 행 — 타이틀 화면 보조 메뉴 전용
function MenuRow({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="ui-press flex items-center gap-2.5 w-full text-left"
      style={{ height: 44, padding: '0 12px', background: 'transparent', border: 'none', color: PALETTE.text, fontSize: 13 }}
    >
      <span
        className="flex items-center justify-center flex-none"
        style={{ width: 26, height: 26, borderRadius: 'var(--r-chip)', background: 'rgba(212,165,116,0.12)', color: PALETTE.dawn }}
      >
        <Icon size={14} />
      </span>
      {label}
      <ChevronRight size={14} className="ml-auto" style={{ color: PALETTE.textDim, opacity: 0.7 }} />
    </button>
  );
}

export default function TitleScreen({ meta, onStart, onResume, onAltar, onEngravings, onRaid, onAchievements, onChangelog, onAccount }) {
  // 진행 중인 런이 있는지 — 이어하기 버튼 노출 여부 결정
  const activeRun = meta?.activeRun;
  const canResume = !!(activeRun && activeRun.v === 1 && activeRun.expedition);
  const resumeClassName = canResume ? (CLASSES[activeRun.selectedClass]?.name || '') : '';
  const resumeExpName = canResume ? (activeRun.expedition?.name || '') : '';
  const resumeChapterDepth = canResume
    ? (activeRun.expedition?.endless
        ? `Depth ${(activeRun.chapterIdx || 0) + 1}`
        : `Ch.${(activeRun.chapterIdx || 0) + 1}`)
    : '';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between pt-12 pb-4 px-5" style={{
      background: `radial-gradient(140% 60% at 50% -12%, ${PALETTE.dawn}24, transparent 60%), radial-gradient(90% 40% at 50% 115%, ${PALETTE.twilight}29, transparent 65%), ${PALETTE.bg}`,
    }}>
      <div className="text-center mt-6 ui-floaty">
        <div className="text-[10px] tracking-[0.55em]" style={{ color: PALETTE.dawn }}>
          DAWN &amp; TWILIGHT
        </div>
        <h1 className="text-4xl font-semibold leading-tight mt-3" style={{
          fontFamily: '"Cinzel", "Noto Serif KR", serif',
          letterSpacing: '0.05em',
          background: 'linear-gradient(115deg, #f3e2c2, #e8b04a 60%, #b47f3a)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}>
          던앤<br/>트와일라잇
        </h1>
        <div className="mx-auto mt-4" style={{
          width: 70, height: 1,
          background: `linear-gradient(90deg, transparent, ${PALETTE.legendary}b0, transparent)`,
        }} />
        <div className="flex justify-center mt-3">
          <Chip color={PALETTE.legendary} icon={<span>✦</span>}>
            <span className="font-bold tracking-wider tabular-nums" style={{ fontSize: 11 }}>{meta?.souls || 0}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.8 }}>SOULS</span>
          </Chip>
        </div>
      </div>

      <div className="w-full flex flex-col gap-2">
        <UIButton onClick={onStart} className="ui-sheen" style={{ fontFamily: '"Cinzel", "Noto Serif KR", serif', letterSpacing: '0.3em' }}>
          {canResume ? '새 여정 시작' : '여정 시작'}
        </UIButton>

        {canResume && onResume && (
          <button
            onClick={onResume}
            className="ui-press flex items-center gap-2.5 w-full text-left"
            style={{
              minHeight: 48, padding: '6px 14px',
              borderRadius: 'var(--r-btn)',
              background: 'rgba(232,176,74,0.06)',
              border: '1px solid rgba(232,176,74,0.3)',
              color: PALETTE.text, fontSize: 13,
            }}
          >
            <PlayCircle size={17} className="flex-none" style={{ color: PALETTE.legendary }} />
            <span className="min-w-0">
              이어하기
              <span className="block truncate" style={{ fontSize: 10.5, color: PALETTE.textDim }}>
                {resumeClassName} · {resumeExpName} · {resumeChapterDepth}
              </span>
            </span>
            <ChevronRight size={14} className="ml-auto flex-none" style={{ color: PALETTE.legendary, opacity: 0.7 }} />
          </button>
        )}

        <GlassPanel style={{ borderRadius: 14, padding: 4 }} className="flex flex-col">
          <MenuRow icon={Sparkles} label="영혼의 제단" onClick={onAltar} />
          {onEngravings && <MenuRow icon={Gem} label="직업 각인" onClick={onEngravings} />}
          {onRaid && <MenuRow icon={Swords} label="레이드" onClick={onRaid} />}
          <MenuRow icon={Trophy} label="업적" onClick={onAchievements} />
        </GlassPanel>

        {/* 1.72.0~ 일일 임무 — 완료 즉시 영혼 자동 지급, KST 자정 리셋 */}
        {(() => {
          const todayKey = getKstDateKey();
          const dm = meta?.dailyMissions?.date === todayKey ? meta.dailyMissions : null;
          return (
            <GlassPanel style={{ borderRadius: 14, padding: '8px 12px' }}>
              <div className="flex justify-between items-center mb-1">
                <span style={{ fontSize: 10, letterSpacing: '0.25em', color: PALETTE.dawn, fontWeight: 700 }}>일일 임무</span>
                <span style={{ fontSize: 9, color: PALETTE.textDim }}>매일 자정(KST) 초기화</span>
              </div>
              {DAILY_MISSIONS.map(m => {
                const prog = Math.min(m.target, dm?.progress?.[m.id] || 0);
                const done = (dm?.claimed || []).includes(m.id);
                return (
                  <div key={m.id} className="flex justify-between items-center" style={{ padding: '2.5px 0' }}>
                    <span style={{ fontSize: 11, color: done ? PALETTE.green : PALETTE.text }}>
                      {done ? '✓ ' : '· '}{m.desc}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: 10.5, color: done ? PALETTE.green : PALETTE.textDim }}>
                      {prog}/{m.target} · <span style={{ color: done ? PALETTE.green : PALETTE.legendary }}>✦{m.reward}</span>
                    </span>
                  </div>
                );
              })}
            </GlassPanel>
          );
        })()}

        <div className="flex items-center justify-between px-1 mt-1">
          {onAccount ? (
            <button onClick={onAccount} className="ui-press" style={{
              background: 'transparent', border: 'none', color: PALETTE.textDim,
              fontSize: 10.5, letterSpacing: '0.12em', padding: '8px 4px',
            }}>계정 관리</button>
          ) : <span />}
          {/* 버전 정보 — 클릭 시 업데이트 로그 */}
          <button onClick={onChangelog} className="ui-press" style={{
            background: 'transparent', border: 'none', color: PALETTE.textDim,
            fontSize: 10.5, letterSpacing: '0.1em', padding: '8px 4px',
          }}>
            v{GAME_VERSION} <span style={{ color: PALETTE.dawn }}>📋</span>
          </button>
        </div>
      </div>
    </div>
  );
}
