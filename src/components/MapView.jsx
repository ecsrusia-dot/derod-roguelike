// ============================================
// components/MapView.jsx — 노드 맵 (챕터 진행)
// ============================================
// 1.65.0 리디자인 (승인 시안 05절):
//   - 글래스 HUD 헤더 카드 — HP바 7px 라운드 + 재화 칩 분리 (기존 8px 압축 텍스트 제거)
//   - 지나온 길 실선(green) / 남은 길 점선 — 선만으로 진행 방향 읽힘
//   - 하단 탭바: 텍스트 5개 → 아이콘+라벨 4개 (미구현 "설정" 제거), 44px 터치 타깃
// ============================================

import React from 'react';
import { BookOpen, Coins, Crown, Flame, Hammer, HelpCircle, LogOut, Skull, Sword, Trophy, User, X } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GlassPanel, Chip } from './ui/CommonUI.jsx';

// 노드 종류별 아이콘/색상/라벨 — 색 값은 디자인 토큰(--ui-*)과 동일 계열
const NODE_TYPES = {
  battle: { icon: Skull, color: '#c4453d', label: '전투' },
  elite: { icon: Crown, color: '#e8b04a', label: '강적' },
  event: { icon: BookOpen, color: '#7ba3c4', label: '사건' },
  shop: { icon: Coins, color: '#d4a574', label: '상점' },
  forge: { icon: Hammer, color: '#c46535', label: '대장간' },
  rest: { icon: Flame, color: '#d4a574', label: '정비' },
  prep: { icon: Sword, color: '#9ad4a3', label: '준비' },
  unknown: { icon: HelpCircle, color: '#9b8975', label: '미지' },
  boss: { icon: Crown, color: '#8b1f1f', label: '보스' },
};

// 하단 탭바 버튼 — 아이콘 + 라벨, 44px 터치 타깃
function NavTab({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="ui-press text-center" style={{
      background: 'transparent', border: 'none', padding: '7px 0 6px', borderRadius: 12,
    }}>
      <Icon size={17} className="mx-auto" style={{ color: PALETTE.dawn }} />
      <div style={{ fontSize: 10, color: PALETTE.textDim, marginTop: 2 }}>{label}</div>
    </button>
  );
}

export default function MapView({ chapter, classData, mapData, hp, maxHp, gold, gem, relics = [], activeRelicNames = null, expedition, curses = [], chapterIdx, autoHunt = false, autoHuntAllowed = false, onToggleAutoHunt = null, autoSpeed = 1, onCycleAutoSpeed = null, autoRunCount = 0, onEnterNode, onOpenStatus, onOpenAchievements, onOpenCodex, onBack }) {
  // 천리안 유물 보유 (활성 상태) 시 모든 노드 공개
  const hasMapReveal = relics && relics.some(r =>
    r.statBonus?.mapReveal > 0 && (!activeRelicNames || activeRelicNames.includes(r.name))
  );
  const completedCount = mapData.nodes.filter(n => n.completed).length;
  const chapterLabel = expedition?.endless
    ? `DEPTH ${(chapterIdx || 0) + 1}`
    : (expedition ? `CH.${(chapterIdx || 0) + 1}/${expedition.chapters.length}` : chapter.sub);
  return (
    <div className="absolute inset-0 flex flex-col" style={{
      background: `radial-gradient(110% 45% at 50% -10%, ${chapter.color}20, transparent), ${PALETTE.bg}`,
    }}>
      {/* ===== 글래스 HUD 헤더 ===== */}
      <div className="px-3 pt-3 flex-none">
        <GlassPanel className="flex items-center gap-2.5" style={{ padding: '9px 12px', borderRadius: 15 }}>
          <button onClick={onOpenStatus} className="ui-press flex items-center justify-center flex-none text-base font-bold" style={{
            width: 38, height: 38, borderRadius: 12,
            background: `linear-gradient(160deg, ${classData.color}, ${PALETTE.bgDeep})`,
            border: '1px solid rgba(232,176,74,0.4)',
            color: PALETTE.bgDeep,
          }}>{classData.name[0]}</button>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold truncate" style={{ fontSize: 12.5, color: PALETTE.text }}>{classData.name}</span>
              <span className="tabular-nums flex-none" style={{ fontSize: 11, color: PALETTE.textDim }}>
                <span style={{ color: PALETTE.text }}>{hp}</span>/{maxHp}
              </span>
            </div>
            <div className="mt-1.5 relative overflow-hidden" style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
              <div className="absolute inset-y-0 left-0 transition-all" style={{
                width: `${(hp / maxHp) * 100}%`,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #8f2c24, #d05248)',
                boxShadow: '0 0 10px rgba(208,82,72,0.5)',
              }} />
            </div>
          </div>
        </GlassPanel>

        {/* 재화 칩 + 챕터 라벨 */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Chip color={PALETTE.dawn} style={{ height: 20 }}>◉ <span className="tabular-nums">{gold}</span></Chip>
          <Chip color={PALETTE.ice} style={{ height: 20 }}>◆ <span className="tabular-nums">{gem}</span></Chip>
          {/* 1.72.0~ 자동 사냥 토글 (1.80.0~ 전 원정 노출 — 미클리어 포함) */}
          {autoHuntAllowed && onToggleAutoHunt && (
            <button onClick={onToggleAutoHunt} className="ui-press flex items-center gap-1" style={{
              height: 20, padding: '0 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.06em',
              background: autoHunt ? 'rgba(232,176,74,0.22)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoHunt ? PALETTE.legendary : 'rgba(255,255,255,0.15)'}`,
              color: autoHunt ? PALETTE.legendary : PALETTE.textDim,
              boxShadow: autoHunt ? '0 0 8px rgba(232,176,74,0.45)' : 'none',
            }}>
              {autoHunt ? '⏸ 자동 사냥 중' : '▶ 자동 사냥'}
            </button>
          )}
          {/* 1.80.0~ 자동 사냥 배속 (×1→×5→×10 순환) — 자동 사냥 중에만 노출 */}
          {autoHuntAllowed && autoHunt && onCycleAutoSpeed && (
            <button onClick={onCycleAutoSpeed} className="ui-press tabular-nums" style={{
              height: 20, padding: '0 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: autoSpeed > 1 ? 'rgba(123,163,196,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoSpeed > 1 ? `${PALETTE.ice}aa` : 'rgba(255,255,255,0.15)'}`,
              color: autoSpeed > 1 ? PALETTE.ice : PALETTE.textDim,
            }}>⚡ ×{autoSpeed}</button>
          )}
          {/* 1.83.0~ 자동 사냥 런 카운터 */}
          {autoHunt && autoRunCount > 0 && (
            <Chip color={PALETTE.legendary} style={{ height: 20 }}>⟳ <span className="tabular-nums">{autoRunCount}</span>번째 런</Chip>
          )}
          {expedition && <Chip color={expedition.color} style={{ height: 20 }}>{expedition.name}</Chip>}
          {/* 1.89.0~ 마스터즈 기믹 융합 — 배열이면 전부 칩 표시 */}
          {chapter.gimmick && (Array.isArray(chapter.gimmick) ? chapter.gimmick : [chapter.gimmick]).map((g, i) => (
            <Chip key={`gim-${i}`} color={chapter.color} style={{ height: 20 }}>◈ {g.name}</Chip>
          ))}
          <span className="ml-auto tracking-[0.14em] truncate" style={{ fontSize: 10.5, color: chapter.color }}>
            {chapterLabel} {chapter.name} · <span className="tabular-nums">{completedCount}/{mapData.nodes.length}</span>
          </span>
        </div>

        {/* 저주 칩 */}
        {curses && curses.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {curses.map((c, i) => (
              <Chip key={i} color={c.color} style={{ height: 20 }}>✦ {c.name}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* ===== 노드 맵 ===== */}
      <div className="flex-1 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {mapData.edges.map(([a, b], i) => {
            const na = mapData.nodes.find(n => n.id === a);
            const nb = mapData.nodes.find(n => n.id === b);
            if (!na || !nb) return null;
            const reachable = na.completed || na.current;
            const eitherLocked = na.locked || nb.locked;
            const bothCompleted = na.completed && nb.completed;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={
                  eitherLocked ? '#2a1515'
                  : bothCompleted ? PALETTE.green
                  : reachable ? chapter.color
                  : PALETTE.dawn
                }
                strokeWidth={bothCompleted ? 0.45 : 0.3}
                strokeLinecap="round"
                strokeDasharray={bothCompleted ? '0' : '1.5 1'}
                opacity={eitherLocked ? 0.2 : bothCompleted ? 0.65 : reachable ? 0.55 : 0.22} />
            );
          })}
        </svg>
        {mapData.nodes.map(n => {
          const cfg = NODE_TYPES[n.type];
          const Icon = cfg.icon;
          const isCurrent = n.current;
          const isCompleted = n.completed;
          const isLocked = n.locked;  // 선택 안 한 형제 노드
          const isBoss = n.type === 'boss';
          const size = isBoss ? 48 : isCurrent ? 40 : 30;
          return (
            <button key={n.id} onClick={() => isCurrent && onEnterNode(n)} disabled={!isCurrent}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${size}px`, height: `${size}px` }}>
              {isCurrent && (
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: cfg.color, opacity: 0.4 }} />
              )}
              {/* 상점/대장간 노드는 항상 강조 (방문 전) — 펄스 + 외곽 링 */}
              {(n.type === 'shop' || n.type === 'forge') && !isCompleted && !isCurrent && (
                <>
                  <div className="absolute rounded-full animate-ping" style={{
                    inset: '-4px', background: cfg.color, opacity: 0.5,
                  }} />
                  <div className="absolute rounded-full animate-pulse" style={{
                    inset: '-2px', background: cfg.color, opacity: 0.6,
                    border: `2px solid ${cfg.color}`,
                  }} />
                </>
              )}
              <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{
                background: isCompleted
                  ? `radial-gradient(circle, ${PALETTE.green}26, ${PALETTE.bgDeep})`
                  : isCurrent
                    ? `radial-gradient(circle, ${cfg.color}40, ${PALETTE.bgDeep})`
                    : isLocked
                      ? `radial-gradient(circle, ${PALETTE.bgDeep}, #1a0a0a)`
                      : `radial-gradient(circle, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
                border: `${isBoss ? 2 : 1.5}px solid ${
                  isCompleted ? `${PALETTE.green}99`
                  : isCurrent ? cfg.color
                  : isLocked ? '#3a1f1f'
                  : PALETTE.panelBorder
                }`,
                boxShadow: isCurrent ? `0 0 24px ${cfg.color}80` : isBoss ? `0 0 16px ${PALETTE.accent}60` : 'none',
                opacity: isLocked ? 0.4 : 1,
              }}>
                {isLocked
                  ? <X size={isBoss ? 18 : 14} style={{ color: '#5a3030' }} />
                  : (n.type === 'shop' || n.type === 'forge' || hasMapReveal)
                    ? <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.green : cfg.color }} />
                    : !isCurrent && !isCompleted && !isBoss
                      ? <span className="text-base" style={{ color: PALETTE.textDim }}>?</span>
                      : <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.green : cfg.color }} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== 하단 탭바 — 아이콘 + 라벨 4종 ===== */}
      <div className="px-3 pb-3 pt-1 flex-none">
        <GlassPanel className="grid grid-cols-4" style={{ borderRadius: 16, padding: 5 }}>
          <NavTab icon={LogOut} label="나가기" onClick={onBack} />
          <NavTab icon={BookOpen} label="도감" onClick={onOpenCodex} />
          <NavTab icon={User} label="정보" onClick={onOpenStatus} />
          <NavTab icon={Trophy} label="업적" onClick={onOpenAchievements} />
        </GlassPanel>
      </div>
    </div>
  );
}
