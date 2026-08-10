// ============================================
// components/AutoStatsScreen.jsx — 전적 분석 (1.84.0~, 옵션 A)
// ============================================
// 자동 사냥 런 기록(meta.autoRunLog, 최근 300건)을 직업/원정별로 그룹핑해
// 조합(패시브+유물+각성)별 클리어율·평균 데미지 랭킹을 보여준다.
// "학습"은 순수 통계 집계 — 기록이 쌓일수록 정확해진다.
// ============================================

import React, { useState, useMemo } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { CLASSES, EXPEDITIONS, CHAMPIONSHIPS, CHAMPIONSHIP_DIFFICULTIES, PASSIVE_SKILLS, ULTIMATE_SKILLS } from '../data.js';
import { ScreenHeader, GlassPanel, Chip } from './ui/CommonUI.jsx';

// 각성 id → 이름
function ultName(ultId) {
  for (const sn in ULTIMATE_SKILLS) {
    const u = ULTIMATE_SKILLS[sn].find(x => x.id === ultId);
    if (u) return u.name;
  }
  return ultId;
}

// 원정 키(exp|diff) → 표시명
function expLabel(exp, diff) {
  const champ = CHAMPIONSHIPS.find(c => c.id === exp);
  if (champ) {
    const d = CHAMPIONSHIP_DIFFICULTIES.find(x => x.id === diff);
    return `${champ.name}${d ? ` · ${d.name}` : ''}`;
  }
  const e = EXPEDITIONS.find(x => x.id === exp);
  return e?.name || exp;
}

export default function AutoStatsScreen({ meta, onClose }) {
  const log = meta?.autoRunLog || [];
  const [clsFilter, setClsFilter] = useState(null);   // classId | null(전체)
  const [expFilter, setExpFilter] = useState(null);   // 'exp|diff' | null(전체)

  // 필터 후보 (기록에 등장한 것만)
  const expKeys = useMemo(() => {
    const set = new Map();
    log.forEach(e => { const k = `${e.exp}|${e.diff || ''}`; if (!set.has(k)) set.set(k, expLabel(e.exp, e.diff)); });
    return [...set.entries()];
  }, [log]);

  const filtered = log.filter(e =>
    (!clsFilter || e.cls === clsFilter) &&
    (!expFilter || `${e.exp}|${e.diff || ''}` === expFilter)
  );

  // 조합별 집계 — 키: 패시브+유물+각성 정렬 결합
  const combos = useMemo(() => {
    const map = new Map();
    filtered.forEach(e => {
      const key = [
        [...(e.sk || [])].sort().join(','),
        [...(e.rl || [])].sort().join(','),
        [...(e.ul || [])].sort().join(','),
      ].join('||') + `||${e.cls}`;
      const cur = map.get(key) || { cls: e.cls, sk: e.sk || [], rl: e.rl || [], ul: e.ul || [], games: 0, clears: 0, sumDmg: 0, sumBt: 0 };
      cur.games += 1;
      if (e.res === 'clear') cur.clears += 1;
      cur.sumDmg += e.dmg || 0;
      cur.sumBt += e.bt || 0;
      map.set(key, cur);
    });
    return [...map.values()]
      .map(c => ({ ...c, rate: c.games > 0 ? c.clears / c.games : 0, avgDmg: c.games > 0 ? Math.round(c.sumDmg / c.games) : 0 }))
      .sort((a, b) => b.rate - a.rate || b.games - a.games || b.avgDmg - a.avgDmg)
      .slice(0, 20);
  }, [filtered]);

  const totalClears = filtered.filter(e => e.res === 'clear').length;
  const clsName = (id) => CLASSES.find(c => c.id === id)?.name || id;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bg }}>
      <ScreenHeader title="전적 분석" onBack={onClose} />
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2" style={{ minHeight: 0 }}>
        {/* 요약 */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <Chip color={PALETTE.dawn} style={{ height: 20 }}>기록 <span className="tabular-nums">{filtered.length}</span>런</Chip>
          <Chip color={PALETTE.green} style={{ height: 20 }}>클리어율 <span className="tabular-nums">{filtered.length > 0 ? Math.round((totalClears / filtered.length) * 100) : 0}%</span></Chip>
          <span className="ml-auto" style={{ fontSize: 9, color: PALETTE.textDim }}>자동 사냥 런 종료 시 자동 기록 (최근 300건)</span>
        </div>

        {/* 직업 필터 */}
        <div className="flex gap-1.5 flex-wrap">
          {[null, ...CLASSES.map(c => c.id)].map(id => (
            <button key={id || 'all'} onClick={() => setClsFilter(id)} className="ui-press" style={{
              height: 24, padding: '0 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: clsFilter === id ? 'rgba(232,176,74,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${clsFilter === id ? PALETTE.legendary : 'var(--ui-line)'}`,
              color: clsFilter === id ? PALETTE.legendary : PALETTE.textDim,
            }}>{id ? clsName(id) : '전체 직업'}</button>
          ))}
        </div>
        {/* 원정 필터 */}
        {expKeys.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {[[null, '전체 원정'], ...expKeys].map(([k, label]) => (
              <button key={k || 'all'} onClick={() => setExpFilter(k)} className="ui-press" style={{
                height: 24, padding: '0 10px', borderRadius: 999, fontSize: 10,
                background: expFilter === k ? 'rgba(123,163,196,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${expFilter === k ? `${PALETTE.ice}aa` : 'var(--ui-line)'}`,
                color: expFilter === k ? PALETTE.ice : PALETTE.textDim,
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* 조합 랭킹 */}
        {combos.length === 0 ? (
          <GlassPanel style={{ borderRadius: 13, padding: '18px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>
              아직 기록이 없습니다.{'\n'}자동 사냥으로 런을 완주(클리어/전멸)하면 조합과 결과가 자동 기록됩니다.
            </div>
          </GlassPanel>
        ) : combos.map((c, i) => (
          <GlassPanel key={i} style={{ borderRadius: 13, padding: '9px 12px' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex-none font-bold tabular-nums" style={{
                fontSize: 12, color: i === 0 ? PALETTE.legendary : PALETTE.textDim, width: 26,
              }}>{i === 0 ? '👑' : `#${i + 1}`}</span>
              <Chip color={PALETTE.dawn} style={{ height: 18 }}>{clsName(c.cls)}</Chip>
              <span className="tabular-nums font-bold" style={{ fontSize: 13, color: c.rate >= 0.8 ? PALETTE.green : c.rate >= 0.5 ? PALETTE.dawn : '#e05248' }}>
                {Math.round(c.rate * 100)}%
              </span>
              <span className="tabular-nums" style={{ fontSize: 9.5, color: PALETTE.textDim }}>({c.games}전 {c.clears}승)</span>
              <span className="ml-auto tabular-nums" style={{ fontSize: 9.5, color: PALETTE.textDim }}>평균 딜 <b style={{ color: PALETTE.legendary }}>{c.avgDmg}</b></span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {c.sk.map(n => <Chip key={`s-${n}`} color={PASSIVE_SKILLS[n]?.color || PALETTE.dawn} style={{ height: 18 }}>{n}</Chip>)}
              {c.ul.map(id => <Chip key={`u-${id}`} color={PALETTE.legendary} style={{ height: 18 }}>★ {ultName(id)}</Chip>)}
            </div>
            {c.rl.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1" style={{ opacity: 0.85 }}>
                {c.rl.map(n => <Chip key={`r-${n}`} color={PALETTE.ice} style={{ height: 18 }}>◆ {n}</Chip>)}
              </div>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
