// ============================================
// components/HofBattleScreen.jsx — 전당 전투 관전 (1.98.0)
// ============================================
// 순수 시뮬레이션(simulateHofBattle)을 마운트 시 1회 실행 → 이벤트 로그를 배속 재생.
// HP 바는 각 이벤트에 포함된 스냅샷으로 갱신.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import {
  HOF_CLASSES, HOF_DEFAULT_PATTERNS, HOF_STAGES, hofStatAt,
  simulateHofBattle, buildHofPlayerUnit, buildHofEnemyUnit,
} from '../data.js';

export default function HofBattleScreen({ meta, stage, onFinish, onRetreat }) {
  const hof = meta?.hof || {};
  // 시뮬은 1회만 (useMemo) — 재생만 상태로
  const sim = useMemo(() => {
    const patterns = hof.patterns || HOF_DEFAULT_PATTERNS;
    const party = HOF_CLASSES.map((c, idx) => buildHofPlayerUnit(c, (hof.levels || {})[c.id] || 1, patterns[c.id] || HOF_DEFAULT_PATTERNS[c.id], idx));
    const foes = stage.party.map((e, idx) => buildHofEnemyUnit(e, stage.mult, idx));
    const result = simulateHofBattle(party, foes);
    // 유닛 메타 (표시용 — 이름/아이콘/진영/열)
    const roster = [...party, ...foes].map(u => ({ key: u.key, name: u.name, icon: u.icon, color: u.color, side: u.side, row: u.row, maxHp: u.maxHp }));
    return { result, roster };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(2); // 기본 ×2
  const doneRef = useRef(false);
  const events = sim.result.events;
  const currentHp = events[Math.max(0, Math.min(cursor, events.length - 1))]?.hp || {};
  const finished = cursor >= events.length;

  useEffect(() => {
    if (finished) {
      if (!doneRef.current) { doneRef.current = true; setTimeout(() => onFinish(sim.result), 900); }
      return;
    }
    const t = setTimeout(() => setCursor(c => c + 1), Math.max(90, 550 / speed));
    return () => clearTimeout(t);
  }, [cursor, speed, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const logEndRef = useRef(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [cursor]);

  const renderUnit = (u) => {
    const [hp, maxHp] = currentHp[u.key] || [u.maxHp, u.maxHp];
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    const dead = hp <= 0;
    return (
      <div key={u.key} className="flex items-center gap-1.5" style={{ opacity: dead ? 0.3 : 1 }}>
        <span style={{ fontSize: 13, filter: dead ? 'grayscale(1)' : 'none' }}>{u.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[8.5px]">
            <span className="truncate" style={{ color: PALETTE.text }}>{u.name}{u.row === 'back' ? ' ▫' : ''}</span>
            <span className="tabular-nums flex-none" style={{ color: PALETTE.textDim }}>{Math.max(0, hp)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ratio * 100}%`, borderRadius: 999, background: dead ? '#555' : u.side === 'p' ? `linear-gradient(90deg, ${u.color}88, ${u.color})` : `linear-gradient(90deg, #8b1f1f88, #c4453d)`, transition: 'width 0.25s' }} />
          </div>
        </div>
      </div>
    );
  };

  const kindColor = (k) => k === 'heal' ? PALETTE.green : k === 'crit' ? PALETTE.legendary : k === 'guard' ? PALETTE.ice
    : k === 'debuff' ? PALETTE.twilight : k === 'stun' ? PALETTE.shock : k === 'round' || k === 'end' ? PALETTE.dawn : PALETTE.text;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onRetreat} className="ui-press text-[10px] px-2 py-1" style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', color: PALETTE.textDim }}>포기</button>
        <div className="text-[11px] font-bold tracking-[0.2em]" style={{ color: PALETTE.legendary }}>전당 {stage.id}단계 — {stage.name}</div>
        <button onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))} className="ui-press text-[10px] px-2 py-1 tabular-nums" style={{ borderRadius: 999, border: `1px solid ${PALETTE.dawn}66`, color: PALETTE.dawn }}>×{speed}</button>
      </div>

      {/* 양측 유닛 패널 */}
      <div className="px-3 pt-2 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-[9px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>내 파티</div>
          {sim.roster.filter(u => u.side === 'p').map(renderUnit)}
        </div>
        <div className="space-y-1">
          <div className="text-[9px] tracking-[0.2em] text-right" style={{ color: PALETTE.accent }}>적 파티</div>
          {sim.roster.filter(u => u.side === 'e').map(renderUnit)}
        </div>
      </div>

      {/* 전투 로그 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 mt-2 space-y-1" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
        {events.slice(0, cursor).map((e, i) => (
          <div key={i} className={e.kind === 'round' || e.kind === 'end' ? 'text-center py-0.5' : ''} style={{ fontSize: e.kind === 'round' || e.kind === 'end' ? 10 : 10.5, color: kindColor(e.kind) }}>
            {e.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {finished && (
        <div className="px-4 py-3 text-center border-t" style={{ borderColor: PALETTE.panelBorder }}>
          <div className="text-[13px] font-bold" style={{ color: sim.result.win ? PALETTE.legendary : PALETTE.accent }}>
            {sim.result.win ? '✦ 승리 — 정산 중...' : '전멸 — 패턴을 다듬어 재도전'}
          </div>
        </div>
      )}
    </div>
  );
}
