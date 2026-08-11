// ============================================
// components/HofScreen.jsx — 명예의 전당 로비 (1.98.0)
// ============================================
// 리그 스테이지 선택 + 파티 5인 레벨업 + 패턴 편집기 (HOF 제로식 모티브)

import React, { useState } from 'react';
import { ChevronLeft, Swords, Trophy, Wrench } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import {
  HOF_CLASSES, HOF_SKILLS, HOF_CLASS_SKILLS, HOF_CONDITIONS, HOF_DEFAULT_PATTERNS,
  HOF_MAX_PATTERNS, HOF_MEDAL, HOF_STAGES, hofLevelCost, hofStatAt,
} from '../data.js';

export default function HofScreen({ meta, onEnterStage, onLevelUp, onSavePatterns, onBack }) {
  const hof = meta?.hof || {};
  const medals = hof.medals || 0;
  const levels = hof.levels || {};
  const patterns = hof.patterns || HOF_DEFAULT_PATTERNS;
  const clears = hof.clears || {};
  const [editChar, setEditChar] = useState(null); // 패턴 편집 중인 charId
  const [draft, setDraft] = useState(null);       // 편집 드래프트 [{c,v,s}]

  const openEditor = (charId) => {
    setEditChar(charId);
    setDraft((patterns[charId] || HOF_DEFAULT_PATTERNS[charId] || []).map(r => ({ ...r })));
  };
  const saveEditor = () => {
    const cleaned = draft.filter(r => r.c && r.s);
    onSavePatterns({ ...patterns, [editChar]: cleaned.length > 0 ? cleaned : HOF_DEFAULT_PATTERNS[editChar] });
    setEditChar(null);
  };

  const isStageUnlocked = (stage) => stage.id === 1 || !!clears[stage.id - 1];

  return (
    <div className="absolute inset-0 flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><ChevronLeft size={20} /></button>
        <div className="text-center">
          <div className="text-[12px] tracking-[0.35em] font-bold" style={{ color: PALETTE.legendary }}>✦ 명예의 전당 ✦</div>
          <div className="text-[9px] mt-0.5" style={{ color: PALETTE.textDim }}>내가 짠 행동 패턴이 곧 전투력</div>
        </div>
        <div className="text-[11px] tabular-nums font-bold" style={{ color: PALETTE.legendary }}>{HOF_MEDAL.icon} {medals}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ===== 전당 리그 ===== */}
        <div>
          <div className="text-[10px] tracking-[0.25em] mb-2 flex items-center gap-1.5" style={{ color: PALETTE.dawn }}>
            <Trophy size={12} /> 전당 리그 — 10단계
          </div>
          <div className="space-y-1.5">
            {HOF_STAGES.map(stage => {
              const unlocked = isStageUnlocked(stage);
              const cleared = !!clears[stage.id];
              return (
                <button key={stage.id} disabled={!unlocked} onClick={() => onEnterStage(stage)}
                  className="ui-press w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                  style={{
                    borderRadius: 13, opacity: unlocked ? 1 : 0.4,
                    background: cleared ? 'rgba(232,176,74,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${cleared ? `${PALETTE.legendary}66` : 'rgba(255,255,255,0.12)'}`,
                  }}>
                  <span className="text-[13px] font-bold tabular-nums flex-none" style={{ color: cleared ? PALETTE.legendary : PALETTE.textDim, width: 22 }}>{stage.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold truncate" style={{ color: PALETTE.text }}>
                      {stage.name} {cleared && <span style={{ color: PALETTE.legendary }}>✓</span>}
                    </div>
                    <div className="text-[9.5px]" style={{ color: PALETTE.textDim }}>
                      적 {stage.party.length}인 · 첫 클리어 {HOF_MEDAL.icon}{stage.firstMedals} + ✦{stage.souls} · 반복 {HOF_MEDAL.icon}2
                    </div>
                  </div>
                  <Swords size={14} className="flex-none" style={{ color: unlocked ? PALETTE.accent : PALETTE.textDim }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== 파티 5인 ===== */}
        <div>
          <div className="text-[10px] tracking-[0.25em] mb-2" style={{ color: PALETTE.dawn }}>◆ 전당 파티 — 패턴 편집·레벨업</div>
          <div className="space-y-1.5">
            {HOF_CLASSES.map(cls => {
              const lv = levels[cls.id] || 1;
              const cost = hofLevelCost(lv);
              const pats = patterns[cls.id] || HOF_DEFAULT_PATTERNS[cls.id] || [];
              return (
                <div key={cls.id} className="px-3 py-2.5" style={{ borderRadius: 13, background: `${cls.color}12`, border: `1px solid ${cls.color}55` }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>{cls.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>
                        {cls.name} <span className="tabular-nums" style={{ color: cls.color }}>Lv.{lv}</span>
                        <span className="text-[9px] ml-1.5 px-1.5 py-0.5" style={{ borderRadius: 999, background: 'rgba(0,0,0,0.4)', color: PALETTE.textDim }}>{cls.row === 'front' ? '전열' : '후열'}</span>
                      </div>
                      <div className="text-[9.5px] tabular-nums" style={{ color: PALETTE.textDim }}>
                        HP {hofStatAt(cls.base.hp, lv)} · {cls.base.atk > 0 ? `공격 ${hofStatAt(cls.base.atk, lv)}` : `마력 ${hofStatAt(cls.base.mag, lv)}`} · 속도 {cls.base.spd} · 방어 {hofStatAt(cls.base.def, lv)}
                      </div>
                    </div>
                    <button onClick={() => onLevelUp(cls.id, cost)} disabled={medals < cost}
                      className="ui-press flex-none px-2.5 py-1.5 text-[10px] font-bold"
                      style={{ borderRadius: 999, background: medals >= cost ? `${PALETTE.legendary}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${medals >= cost ? PALETTE.legendary : 'rgba(255,255,255,0.15)'}`, color: medals >= cost ? PALETTE.legendary : PALETTE.textDim }}>
                      Lv+1 ({HOF_MEDAL.icon}{cost})
                    </button>
                  </div>
                  {/* 패턴 미리보기 + 편집 */}
                  <button onClick={() => openEditor(cls.id)} className="ui-press w-full mt-2 px-2.5 py-1.5 text-left flex items-center gap-1.5"
                    style={{ borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: '1px dashed rgba(255,255,255,0.2)' }}>
                    <Wrench size={11} className="flex-none" style={{ color: PALETTE.dawn }} />
                    <span className="text-[9.5px] truncate" style={{ color: PALETTE.textDim }}>
                      패턴 {pats.length}/{HOF_MAX_PATTERNS} — {pats.map(r => HOF_SKILLS[r.s]?.name).join(' → ')}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== 패턴 편집기 (풀스크린 오버레이) ===== */}
      {editChar && draft && (() => {
        const cls = HOF_CLASSES.find(c => c.id === editChar);
        const skillIds = HOF_CLASS_SKILLS[editChar] || [];
        return (
          <div className="absolute inset-0 z-50 flex flex-col" style={{ background: 'rgba(5,3,4,0.97)' }}>
            <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
              <div className="text-center text-[12px] font-bold" style={{ color: cls.color }}>{cls.icon} {cls.name} — 행동 패턴</div>
              <div className="text-center text-[9px] mt-1" style={{ color: PALETTE.textDim }}>위에서부터 차례로 검사 — 조건 충족 + SP 충분한 첫 행을 실행 (없으면 기본 공격)</div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {draft.map((row, idx) => {
                const cond = HOF_CONDITIONS.find(c => c.id === row.c);
                return (
                  <div key={idx} className="px-2.5 py-2" style={{ borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-bold tabular-nums flex-none" style={{ color: PALETTE.dawn, width: 14 }}>{idx + 1}</span>
                      <select value={row.c} onChange={e => {
                        const c = HOF_CONDITIONS.find(x => x.id === e.target.value);
                        setDraft(d => d.map((r, i) => i === idx ? { ...r, c: c.id, v: c.needsValue ? (c.def || 0) : 0 } : r));
                      }} className="flex-1 text-[11px] px-2 py-1.5" style={{ borderRadius: 8, background: '#1a0e12', color: PALETTE.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                        {HOF_CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {cond?.needsValue && (
                        <input type="number" value={row.v} min={0} max={100}
                          onChange={e => setDraft(d => d.map((r, i) => i === idx ? { ...r, v: Math.max(0, parseInt(e.target.value) || 0) } : r))}
                          className="flex-none text-[11px] px-1.5 py-1.5 text-center tabular-nums" style={{ width: 52, borderRadius: 8, background: '#1a0e12', color: PALETTE.legendary, border: '1px solid rgba(255,255,255,0.2)' }} />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] flex-none" style={{ color: PALETTE.textDim, width: 14 }}>→</span>
                      <select value={row.s} onChange={e => setDraft(d => d.map((r, i) => i === idx ? { ...r, s: e.target.value } : r))}
                        className="flex-1 text-[11px] px-2 py-1.5" style={{ borderRadius: 8, background: '#1a0e12', color: PALETTE.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                        {skillIds.map(sid => {
                          const sk = HOF_SKILLS[sid];
                          return <option key={sid} value={sid}>{sk.name} (SP {sk.sp || 0}{sk.gain ? ` / +${sk.gain}` : ''})</option>;
                        })}
                      </select>
                      <button onClick={() => setDraft(d => d.filter((_, i) => i !== idx))}
                        className="ui-press flex-none text-[10px] px-2 py-1.5" style={{ borderRadius: 8, color: PALETTE.accent, border: `1px solid ${PALETTE.accent}66` }}>삭제</button>
                    </div>
                    <div className="text-[8.5px] mt-1 pl-5" style={{ color: PALETTE.textDim }}>{HOF_SKILLS[row.s]?.desc}</div>
                  </div>
                );
              })}
              {draft.length < HOF_MAX_PATTERNS && (
                <button onClick={() => setDraft(d => [...d, { c: 'always', v: 0, s: skillIds[0] }])}
                  className="ui-press w-full py-2 text-[11px]" style={{ borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)', color: PALETTE.dawn }}>
                  + 패턴 추가 ({draft.length}/{HOF_MAX_PATTERNS})
                </button>
              )}
            </div>
            <div className="px-3 pb-4 pt-2 flex gap-2 border-t" style={{ borderColor: PALETTE.panelBorder }}>
              <button onClick={() => setEditChar(null)} className="ui-press flex-1 py-2.5 text-[12px]" style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', color: PALETTE.textDim }}>취소</button>
              <button onClick={saveEditor} className="ui-press flex-1 py-2.5 text-[12px] font-bold" style={{ borderRadius: 12, background: `${PALETTE.legendary}25`, border: `1px solid ${PALETTE.legendary}`, color: PALETTE.legendary }}>저장</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
