// ============================================
// components/MapView.jsx — 노드 맵 (챕터 진행)
// ============================================

import React from 'react';
import { 
  Sword, Skull, Crown, BookOpen, Coins, Hammer, Flame, HelpCircle, 
  ChevronRight 
} from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';

// 노드 종류별 아이콘/색상/라벨
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

export default function MapView({ chapter, classData, mapData, hp, maxHp, gold, gem, relics = [], activeRelicNames = null, expedition, curses = [], chapterIdx, onEnterNode, onOpenStatus, onOpenAchievements, onOpenCodex, onBack }) {
  // 천리안 유물 보유 (활성 상태) 시 모든 노드 공개
  const hasMapReveal = relics && relics.some(r => 
    r.statBonus?.mapReveal > 0 && (!activeRelicNames || activeRelicNames.includes(r.name))
  );
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{
        background: `linear-gradient(180deg, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 100%)`,
        borderBottom: `1px solid ${PALETTE.panelBorder}`,
      }}>
        <button onClick={onOpenStatus} className="w-9 h-9 flex items-center justify-center text-base font-bold" style={{
          background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.dawn}`,
        }}>{classData.name[0]}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>HP</span>
            <div className="flex-1 h-1.5 relative" style={{ background: PALETTE.bgDeep, border: `1px solid ${PALETTE.panelBorder}` }}>
              <div className="absolute inset-y-0 left-0 transition-all" style={{
                width: `${(hp/maxHp)*100}%`,
                background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.accent})`,
              }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: PALETTE.text }}>{hp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: chapter.color }}>CH.{chapter.id}</span>
            <span className="text-[10px] flex-1" style={{ color: PALETTE.text }}>{chapter.name}</span>
          </div>
        </div>
        <div className="flex flex-col items-end text-[10px] gap-0.5">
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.ice }}>◆</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gem}</span></div>
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.dawn }}>◉</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gold}</span></div>
        </div>
      </div>
      <div className="text-center py-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="flex items-center justify-center gap-2">
          {expedition && (
            <span className="text-[9px] tracking-[0.3em] px-1.5 py-0.5" style={{ 
              color: expedition.color, 
              background: `${expedition.color}20`,
              border: `1px solid ${expedition.color}80`,
            }}>{expedition.name}</span>
          )}
          <div className="text-[9px] tracking-[0.4em]" style={{ color: chapter.color }}>
            {expedition ? `Ch.${(chapterIdx || 0) + 1}/${expedition.chapters.length}` : chapter.sub}
          </div>
        </div>
        <div className="text-sm font-bold tracking-[0.2em] mt-0.5" style={{
          color: PALETTE.text, textShadow: `0 0 10px ${chapter.color}50`,
        }}>{chapter.name}</div>
        {/* 저주 뱃지 */}
        {curses && curses.length > 0 && (
          <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap px-2">
            {curses.map((c, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5" style={{
                color: c.color,
                background: `${c.color}15`,
                border: `1px solid ${c.color}50`,
              }} title={c.desc}>✦ {c.name}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 relative overflow-hidden" style={{
        background: `radial-gradient(ellipse at center top, ${chapter.color}15 0%, ${PALETTE.bgDeep} 70%)`,
      }}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {mapData.edges.map(([a, b], i) => {
            const na = mapData.nodes.find(n => n.id === a);
            const nb = mapData.nodes.find(n => n.id === b);
            if (!na || !nb) return null;
            const reachable = na.completed || na.current;
            const eitherLocked = na.locked || nb.locked;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={
                  eitherLocked ? '#2a1515'
                  : na.completed && nb.completed ? PALETTE.dawn 
                  : reachable ? chapter.color 
                  : PALETTE.panelBorder
                }
                strokeWidth="0.3"
                strokeDasharray={na.completed && nb.completed ? "0" : "1.5 1"}
                opacity={eitherLocked ? 0.2 : reachable ? 0.6 : 0.3} />
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
          const size = isBoss ? 48 : isCurrent ? 38 : 30;
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
                  ? `radial-gradient(circle, ${PALETTE.dawn}30, ${PALETTE.bgDeep})`
                  : isCurrent
                    ? `radial-gradient(circle, ${cfg.color}40, ${PALETTE.bgDeep})`
                    : isLocked
                      ? `radial-gradient(circle, ${PALETTE.bgDeep}, #1a0a0a)`
                      : `radial-gradient(circle, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
                border: `${isBoss ? 2 : 1.5}px solid ${
                  isCompleted ? PALETTE.dawn 
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
                    ? <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.dawn : cfg.color }} />
                    : !isCurrent && !isCompleted && !isBoss
                      ? <span className="text-base" style={{ color: PALETTE.textDim }}>?</span>
                      : <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.dawn : cfg.color }} />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 border-t" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        <button onClick={onBack} className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>나가기</button>
        <button onClick={onOpenCodex} className="py-2.5 text-[10px]" style={{ color: '#c46535' }}>도감</button>
        <button onClick={onOpenStatus} className="py-2.5 text-[10px]" style={{ color: PALETTE.dawn }}>스킬</button>
        <button onClick={onOpenAchievements} className="py-2.5 text-[10px]" style={{ color: PALETTE.legendary }}>업적</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>설정</button>
      </div>
    </div>
  );
}

// =========== 전투 화면 ===========
