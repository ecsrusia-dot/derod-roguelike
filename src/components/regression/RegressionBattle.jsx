// ============================================
// components/regression/RegressionBattle.jsx — 🌀 회귀의 탐험가 전용 전투 (1.182.0, 2.0 PR B)
// ============================================
// PM 결정: 시안 2 화면 (적 일러 위 · 전투 기록 · 주인공 일러 아래 · 스킬 슬롯 카드 · 발동 컷인).
// 본편 CombatScreen은 쓰지 않는다 — 전투 계산은 data/regressionCombat.js의 순수 함수, 이 화면은 결과 재생만.
// 흐름: 전투 준비(태세·포션 벨트 — 유일한 선택) → ▶ 전투 시작 → 자동 재생(개입 불가) → onFinish(res)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE, getEnemyImageSrc } from '../../utils/helpers.js';
import {
  POTIONS, REGRESSION_STANCES, REGRESSION_SKILLS, REGRESSION_SKILL_TIERS, getRegressionStance,
  regressionSkillValue, regressionSkillLevel, regressionPlayerCombatant, getRegressionClassPerk, getRegressionAwakening, regressionEnemyCombatant, simulateRegressionCombat,
} from '../../data.js';
import RegressionSkillInfo from './RegressionSkillInfo.jsx';
import RegressionSkillCutin, { REGRESSION_CUTIN_MS } from './RegressionSkillCutin.jsx';
import { ScreenHeader, GlassPanel, Chip, UIButton } from '../ui/CommonUI.jsx';

const TRIGGER_TEXT = {
  battleStart: () => '전투 시작', firstHit: () => '처음 공격받으면', enemyDodge: () => '상대가 회피하면',
  selfDodge: () => '내가 회피하면', selfHp: (a) => `HP ${Math.round(a * 100)}% 이하`, enemyHp: (a) => `적 HP ${Math.round(a * 100)}% 이하`,
  turn: (a) => `${a}턴째`, enemyHeavy: () => '대공격 예고 시', lethal: () => '쓰러질 때',
};
export function regressionTriggerText(id) {
  const sk = REGRESSION_SKILLS[id];
  return sk ? (TRIGGER_TEXT[sk.trigger] || (() => sk.trigger))(sk.at) : '';
}

// 1.191.2~ 방어 식별 색 — 보호막(내 것) 하늘색 / 적 방어 강철색 / 막기 보라
export const RG_SHIELD = '#7fd4ff';
export const RG_DEF = '#c3cddc';
export const RG_GUARD = '#c9a6ff';
// HP 바 + 보호막 구간 (HP 뒤에 하늘색으로 이어 붙임, 최대 HP를 넘으면 바 끝에서 자름)
function HpBar({ value, max, color, shield = 0 }) {
  const hpPct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const shPct = Math.max(0, Math.min(100 - hpPct, (shield / Math.max(1, max)) * 100));
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: shield > 0 ? `0 0 0 1px ${RG_SHIELD}aa` : 'none' }}>
      <div style={{ width: `${hpPct}%`, height: '100%', background: color, transition: 'width .3s' }} />
      {shPct > 0 && <div style={{ width: `${shPct}%`, height: '100%', background: `repeating-linear-gradient(45deg, ${RG_SHIELD}, ${RG_SHIELD} 4px, ${RG_SHIELD}bb 4px, ${RG_SHIELD}bb 8px)`, transition: 'width .3s' }} />}
    </div>
  );
}
function StateChip({ color, children }) {
  return <span className="text-[11px] font-bold px-1.5" style={{ borderRadius: 6, color, background: '#000b', border: `1px solid ${color}`, lineHeight: '18px' }}>{children}</span>;
}

export default function RegressionBattle({
  classData, enemyKey, enemyObj, enemyLabel, regionKey, enemyMult = 1, enemyExtra = null, intro, stats, level, maxHp, hp, skills, skillLv = {}, awakenId = null, relicBonus,
  potions, beltSlots, defaultBelt, flames, committed, speed, onCycleSpeed, onCommit, onFinish, speedLabel, speedOptions = [], onSetSpeed,
}) {
  const [stanceId, setStanceId] = useState(committed?.stanceId || 'calm');
  const [infoId, setInfoId] = useState(null);   // 1.188.0~ 스킬 정보 시트
  const [beltSel, setBeltSel] = useState(null);
  const [run, setRun] = useState(null);        // { res, idx }
  const timer = useRef(null);
  const finished = useRef(false);

  const enemyBase = useMemo(() => regressionEnemyCombatant(enemyKey, enemyObj, regionKey, enemyMult, enemyExtra), [enemyKey, enemyObj, regionKey, enemyMult, enemyExtra?.hp, enemyExtra?.dmg]);
  const enemySrc = getEnemyImageSrc(enemyKey, enemyObj, 'combat');
  const heroSrc = `./classes/combat/${classData.id}_combat.jpg`;

  // 벨트: 보유 포션 범위 안에서만
  const inv = potions || {};
  const fitBelt = (arr) => { const left = { ...inv }; return (arr || []).filter(id => { if ((left[id] || 0) > 0) { left[id] -= 1; return true; } return false; }).slice(0, beltSlots); };
  const belt = fitBelt(beltSel ?? defaultBelt);
  const remaining = { ...inv }; belt.forEach(id => { remaining[id] -= 1; });

  const startFight = (stId, beltArr) => {
    const player = regressionPlayerCombatant({ stats, level, maxHp, hp, skills, skillLv, belt: beltArr, relicBonus, classId: classData.id, awakenId });
    const res = simulateRegressionCombat({ player, enemy: enemyBase, stanceId: stId });
    finished.current = false;
    setRun({ res, idx: 0 });
  };
  // 새로고침 복원 — 이미 전투를 시작했다면(committed) 같은 태세·벨트로 즉시 재전투 (도주 불가)
  useEffect(() => { if (committed && !run) startFight(committed.stanceId, committed.belt || []); /* eslint-disable-next-line */ }, []);

  // 재생
  useEffect(() => {
    if (!run) return;
    if (run.idx >= run.res.events.length) {
      if (!finished.current) { finished.current = true; const t = setTimeout(() => onFinish(run.res, committed?.stanceId || stanceId), speed >= 100 ? 0 : 1200 / speed); return () => clearTimeout(t); }
      return;
    }
    const ev = run.res.events[run.idx];
    // 1.189.0~ 스킬 컷인은 등급별 길이 (일반 1.1초 · 고급 1.45초 · 기연 2초, 배속 적용)
    const base = ev.t === 'skill' ? (REGRESSION_CUTIN_MS[REGRESSION_SKILLS[ev.id]?.tier] || 1100) : ev.t === 'turn' ? 250 : ev.t === 'warn' ? 900 : 650;
    timer.current = setTimeout(() => setRun(r => ({ ...r, idx: r.idx + 1 })), speed >= 100 ? 0 : base / speed);
    return () => clearTimeout(timer.current);
  }, [run, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== 전투 준비 =====
  if (!run) {
    const can = (st) => (st.flames || 0) <= flames;
    return (
      <div className="h-full flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep, position: 'relative' }}>
        <ScreenHeader title="전투 준비" subtitle={enemyLabel} />
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          <div className="text-[14px] leading-relaxed" style={{ color: PALETTE.text }}>{intro}</div>
          <GlassPanel strong style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 8', background: PALETTE.panel }}>
              {enemySrc && <img src={enemySrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8 }}>
                <div className="flex justify-between text-[12px] font-bold" style={{ color: '#fff', textShadow: '0 1px 3px #000' }}><span>{enemyLabel}</span><span className="tabular-nums">HP {enemyBase.maxHp}</span></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 p-2.5">
              {enemyBase.patterns.map((pt, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5" style={{ borderRadius: 999, background: PALETTE.panelLight, color: pt.heavy ? PALETTE.accent : PALETTE.textDim, border: `1px solid ${pt.heavy ? PALETTE.accent : PALETTE.panelBorder}66` }}>{pt.heavy ? '⚠ ' : ''}{pt.name}</span>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: 12 }}>
            <div className="flex justify-between items-center mb-2">
              <div className="text-[12px] font-bold" style={{ color: PALETTE.dawn }}>⚔ 전투 태세 — 유일한 선택</div>
              <Chip color={PALETTE.legendary}>🔥 생명의 불꽃 {flames}</Chip>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {REGRESSION_STANCES.map(st => {
                const on = stanceId === st.id; const ok = can(st);
                return (
                  <button key={st.id} disabled={!ok} onClick={() => setStanceId(st.id)} className="ui-press text-left px-2.5 py-2"
                    style={{ minHeight: 56, borderRadius: 'var(--r-chip, 8px)', background: on ? `${PALETTE.legendary}1f` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, opacity: ok ? 1 : 0.4 }}>
                    <div className="text-[12px] font-bold" style={{ color: on ? PALETTE.legendary : PALETTE.text }}>{st.name}{st.flames ? ` · 🔥${st.flames}` : ''}</div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: 12 }}>
            {getRegressionClassPerk(classData.id) && (
              <div className="text-[11px] mb-2 px-2.5 py-1.5" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, color: PALETTE.textDim }}>
                <b style={{ color: PALETTE.legendary }}>◆ {getRegressionClassPerk(classData.id).name}</b> (직업 특성) — {getRegressionClassPerk(classData.id).desc}
                {awakenId && getRegressionAwakening(awakenId) && <div><b style={{ color: PALETTE.legendary }}>✦ {getRegressionAwakening(awakenId).name}</b> (각성) — {getRegressionAwakening(awakenId).desc}</div>}
              </div>
            )}
            <div className="text-[12px] font-bold mb-2" style={{ color: PALETTE.dawn }}>✦ 스킬 — 조건이 맞으면 전투당 1번 자동 발동</div>
            <div className="space-y-1.5">
              {skills.map(id => {
                const sk = REGRESSION_SKILLS[id]; if (!sk) return null;
                const tier = REGRESSION_SKILL_TIERS[sk.tier];
                return (
                  <div key={id} role="button" onClick={() => setInfoId(id)} className="ui-press px-2.5 py-1.5" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, cursor: 'pointer' }}>
                    <div className="text-[12px] font-bold" style={{ color: tier.color }}>ⓘ {sk.name} <span style={{ color: PALETTE.legendary }}>Lv.{regressionSkillLevel(skillLv, id)}</span> <span className="font-normal text-[11px]" style={{ color: PALETTE.textDim }}>[{tier.name}] · {regressionTriggerText(id)} · 위력 {regressionSkillValue(id, stats, regressionSkillLevel(skillLv, id))}{['buff', 'revive', 'guard'].includes(sk.effect) ? '%' : ''}</span></div>
                    <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{sk.desc}</div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: 12 }}>
            <div className="text-[12px] font-bold mb-1" style={{ color: PALETTE.dawn }}>🧪 포션 벨트 ({belt.length}/{beltSlots}) — HP 50% 미만에서 자동 사용</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {belt.map((id, i) => (
                <button key={`b${i}`} className="ui-press px-2.5" onClick={() => setBeltSel(belt.filter((_, j) => j !== i))}
                  style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: `${POTIONS[id].color}22`, border: `1px solid ${POTIONS[id].color}`, color: PALETTE.text, fontSize: 12 }}>{POTIONS[id].icon} {POTIONS[id].name} ✕</button>
              ))}
              {Object.entries(remaining).filter(([id, n]) => n > 0 && (POTIONS[id]?.healPct || POTIONS[id]?.healFull)).map(([id, n]) => (
                <button key={id} className="ui-press px-2.5" disabled={belt.length >= beltSlots} onClick={() => setBeltSel([...belt, id])}
                  style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text, fontSize: 12, opacity: belt.length >= beltSlots ? 0.4 : 1 }}>+ {POTIONS[id].icon} {POTIONS[id].name} ×{n}</button>
              ))}
              {Object.keys(inv).length === 0 && <span className="text-[11px]" style={{ color: PALETTE.textDim }}>보유 포션 없음</span>}
            </div>
          </GlassPanel>

          <div className="text-[11px] px-1" style={{ color: PALETTE.textDim }}>전투는 자동으로 진행되며 개입할 수 없다. HP {hp}/{maxHp}로 출전.</div>
          {speedOptions.length > 0 && onSetSpeed && (
            <GlassPanel style={{ padding: 12 }}>
              <div className="text-[12px] font-bold mb-2" style={{ color: PALETTE.dawn }}>⏱ 전투 속도</div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${speedOptions.length}, 1fr)` }}>
                {speedOptions.map(o => {
                  const on = o.value === speed;
                  return (
                    <button key={o.value} onClick={() => onSetSpeed(o.value)} className="ui-press text-[13px] font-bold"
                      style={{ minHeight: 40, borderRadius: 'var(--r-chip, 8px)', background: on ? `${PALETTE.legendary}26` : PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, color: on ? PALETTE.legendary : PALETTE.text }}>{o.label}</button>
                  );
                })}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: PALETTE.textDim }}>⏩ 스킵은 연출 없이 결과만 보여 준다. 고른 속도는 다음 전투에도 유지된다.</div>
            </GlassPanel>
          )}
          <UIButton variant="primary" className="w-full ui-sheen" onClick={() => { onCommit({ stanceId, belt }); startFight(stanceId, belt); }}>▶ 전투 시작</UIButton>
        </div>
        {infoId && <RegressionSkillInfo skillId={infoId} stats={stats} lv={regressionSkillLevel(skillLv, infoId)} onClose={() => setInfoId(null)} />}
      </div>
    );
  }

  // ===== 자동 전투 재생 (시안 2) =====
  const evs = run.res.events.slice(0, run.idx);
  const last = evs[evs.length - 1] || {};
  const lastState = [...evs].reverse().find(e => e.p != null) || { p: hp, e: enemyBase.maxHp };
  const usedIds = new Set(evs.filter(e => e.t === 'skill').map(e => e.id));
  const activeId = last.t === 'skill' ? last.id : null;
  const warn = (() => { for (let i = evs.length - 1; i >= 0; i--) { if (evs[i].t === 'warn') return evs[i].name; if (evs[i].t === 'hit' && evs[i].heavy) return null; if (evs[i].t === 'stun') return null; } return null; })();
  const turn = [...evs].reverse().find(e => e.t === 'turn')?.n || 0;
  const logs = evs.filter(e => ['hit', 'crit', 'miss', 'heal', 'shield', 'buff', 'stun', 'stunned', 'potion', 'revive', 'defend', 'skill', 'warn', 'stance'].includes(e.t)).slice(-3).reverse().map(e => {
    if (e.t === 'skill') return `★ ${REGRESSION_SKILLS[e.id]?.name} 발동`;
    if (e.t === 'hit') {
      const extra = [e.absorbed > 0 ? `🛡흡수 ${e.absorbed}` : null, e.guarded > 0 ? `◈막음 ${e.guarded}` : null, e.blocked > 0 ? `적 방어에 ${e.blocked} 막힘` : null].filter(Boolean).join(' · ');
      return e.who === 'P' ? `${e.label} — ${e.dmg}${extra ? ` (${extra})` : ''}` : `${enemyBase.name}의 ${e.name} — ${e.dmg}${e.heavy ? ' (대공격)' : ''}${extra ? ` (${extra})` : ''}`;
    }
    if (e.t === 'crit') return `치명타! — ${e.dmg}`;
    if (e.t === 'miss') return e.who === 'P' ? `${enemyBase.name}이(가) 회피했다` : `${e.name}을(를) 회피했다`;
    if (e.t === 'heal') return `${e.label} — HP +${e.amt}`;
    if (e.t === 'shield') return `${e.label} — 보호막 +${e.amt}`;
    if (e.t === 'buff') return `${e.label} — ${e.turns}턴 공격 +${e.pct}%`;
    if (e.t === 'stun') return `${e.label} — 적의 다음 행동 봉쇄`;
    if (e.t === 'stunned') return `${enemyBase.name}이(가) 움직이지 못한다`;
    if (e.t === 'potion') return `${POTIONS[e.id]?.name} — HP +${e.amt}`;
    if (e.t === 'revive') return '여명의 기적 — 다시 일어섰다';
    if (e.t === 'defend') return `${enemyBase.name}의 ${e.name}${e.def > 0 ? ` — 🛡 방어 +${e.def}` : ''}`;
    if (e.t === 'warn') return `⚠ ${enemyBase.name}이(가) ${e.name}을(를) 준비한다`;
    if (e.t === 'stance') return `전투 태세: ${getRegressionStance(committed?.stanceId || stanceId).name}`;
    return '';
  });
  // 1.191.2~ 떠오르는 숫자 — 피해 + 방어 내역(보호막 흡수·막기·적 방어 막힘)을 함께 띄운다
  const fx = (who) => {
    if (!last) return [];
    const out = [];
    const hitOn = (last.t === 'hit' || last.t === 'crit') && ((last.who === 'P' && who === 'E') || (last.who === 'E' && who === 'P'));
    if (hitOn) {
      out.push({ text: `-${last.dmg}`, color: last.who === 'P' ? '#fff' : PALETTE.accent, size: 26 });
      if (last.absorbed > 0) out.push({ text: `🛡 흡수 ${last.absorbed}`, color: RG_SHIELD, size: 15 });
      if (last.guarded > 0) out.push({ text: `◈ 막음 ${last.guarded}`, color: RG_GUARD, size: 15 });
      if (last.blocked > 0) out.push({ text: `🛡 막힘 ${last.blocked}`, color: RG_DEF, size: 15 });
    }
    if (last.t === 'miss' && ((last.who === 'P' && who === 'E') || (last.who === 'E' && who === 'P'))) out.push({ text: '회피', color: PALETTE.ice, size: 24 });
    if ((last.t === 'heal' || last.t === 'potion') && who === 'P') out.push({ text: `+${last.amt}`, color: PALETTE.green, size: 24 });
    if (last.t === 'shield' && who === 'P') out.push({ text: `🛡 보호막 +${last.amt}`, color: RG_SHIELD, size: 20 });
    if (last.t === 'stance' && who === 'P' && last.shield > 0) out.push({ text: `🛡 보호막 +${last.shield}`, color: RG_SHIELD, size: 20 });
    if (last.t === 'defend' && who === 'E' && last.def > 0) out.push({ text: `🛡 방어 +${last.def}`, color: RG_DEF, size: 20 });
    return out;
  };
  const ps = last.ps || 0, ed = last.ed || 0, gd = !!last.gd;   // 모든 사건에 방어 상태가 붙어 있다 (방어 행동처럼 HP가 없는 사건 포함)
  const shake = (who) => (last.t === 'hit' || last.t === 'crit') && ((last.who === 'P' && who === 'E') || (last.who === 'E' && who === 'P' && last.heavy));
  const Art = ({ who, src, name, cur, max, color }) => {
    const fs = fx(who);
    const ring = who === 'P' ? (ps > 0 ? RG_SHIELD : gd ? RG_GUARD : null) : (ed > 0 ? RG_DEF : null);
    return (
      <div className={shake(who) ? 'fx-b-shake' : ''} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: PALETTE.panel }}>
        {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        {ring && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: `inset 0 0 0 2px ${ring}, inset 0 0 26px ${ring}88`, transition: 'box-shadow .3s' }} />}
        {fs.map((f, k) => (
          <span key={`${run.idx}-${who}-${k}`} style={{ position: 'absolute', left: '50%', top: `${30 + k * 11}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: f.size, fontWeight: 800, color: f.color, textShadow: '0 2px 6px #000', animation: 'rgRise .9s ease-out forwards' }}>{f.text}</span>
        ))}
        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8 }}>
          <div className="flex gap-1 mb-1 flex-wrap">
            {who === 'P' && ps > 0 && <StateChip color={RG_SHIELD}>🛡 보호막 {ps}</StateChip>}
            {who === 'P' && gd && <StateChip color={RG_GUARD}>◈ 막기 준비</StateChip>}
            {who === 'E' && ed > 0 && <StateChip color={RG_DEF}>🛡 방어 {ed}</StateChip>}
          </div>
          <div className="flex justify-between text-[12px] font-bold mb-1" style={{ color: '#fff', textShadow: '0 1px 3px #000' }}><span>{name}</span><span className="tabular-nums">{cur}/{max}{who === 'P' && ps > 0 ? <span style={{ color: RG_SHIELD }}> +🛡{ps}</span> : null}</span></div>
          <HpBar value={cur} max={max} color={color} shield={who === 'P' ? ps : 0} />
        </div>
      </div>
    );
  };
  const ended = run.idx >= run.res.events.length;
  return (
    <div className="h-full flex flex-col" style={{ background: '#050304', position: 'relative' }}>
      <style>{'@keyframes rgRise{from{transform:translate(-50%,6px);opacity:0}20%{opacity:1}to{transform:translate(-50%,-22px);opacity:0}}'}</style>
      <div className="flex items-center justify-between px-3 py-2 text-[11px]" style={{ color: PALETTE.dawn, letterSpacing: '0.12em' }}>
        <span>{ended ? '전투 종료' : `TURN ${turn} · ${getRegressionStance(committed?.stanceId || stanceId).name}`}</span>
        <button onClick={onCycleSpeed} className="ui-press px-3" style={{ minHeight: 32, borderRadius: 999, border: `1px solid ${PALETTE.panelBorder}`, background: 'transparent', color: PALETTE.text, fontSize: 11 }}>{speedLabel}</button>
      </div>
      <Art who="E" src={enemySrc} name={enemyLabel} cur={lastState.e} max={enemyBase.maxHp} color={PALETTE.accent} />
      <div className="px-3 py-2 text-[11px]" style={{ minHeight: 58, borderTop: `1px solid ${PALETTE.panelBorder}`, borderBottom: `1px solid ${PALETTE.panelBorder}`, background: PALETTE.panel }}>
        {warn && <div style={{ color: '#f0a59c' }}>⚠ 대공격 예고 — {warn}</div>}
        {logs.map((l, i) => { const def = /🛡|보호막|◈/.test(l); return <div key={i} style={{ color: def ? (i === 0 ? RG_SHIELD : `${RG_SHIELD}aa`) : (i === 0 ? PALETTE.text : PALETTE.textDim) }}>{l}</div>; })}
      </div>
      <Art who="P" src={heroSrc} name={`${classData.name} Lv.${level}`} cur={lastState.p} max={maxHp} color={lastState.p / maxHp <= 0.4 ? PALETTE.accent : PALETTE.green} />
      <div className="grid gap-1.5 p-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, skills.length))}, 1fr)`, background: PALETTE.panel }}>
        {skills.map(id => {
          const sk = REGRESSION_SKILLS[id]; if (!sk) return null;
          const on = activeId === id, used = usedIds.has(id) && !on;
          return (
            <div key={id} role="button" onClick={() => setInfoId(id)} className="px-2 py-1.5" style={{ cursor: 'pointer', borderRadius: 10, minHeight: 52, background: PALETTE.panelLight, border: `1px solid ${on ? PALETTE.legendary : PALETTE.panelBorder}`, boxShadow: on ? `0 0 14px ${PALETTE.legendary}66` : 'none', opacity: used ? 0.45 : 1 }}>
              <div className="text-[11px] font-bold truncate" style={{ color: on ? PALETTE.legendary : REGRESSION_SKILL_TIERS[sk.tier].color }}>{sk.name}{regressionSkillLevel(skillLv, id) > 1 ? ` Lv.${regressionSkillLevel(skillLv, id)}` : ''}</div>
              <div className="text-[11px] truncate" style={{ color: on ? PALETTE.legendary : PALETTE.textDim }}>{on ? '발동!' : used ? '사용함 1/1' : regressionTriggerText(id)}</div>
            </div>
          );
        })}
      </div>
      {activeId && !ended && speed < 100 && (
        <RegressionSkillCutin skillId={activeId} nonce={run.idx} durMs={(REGRESSION_CUTIN_MS[REGRESSION_SKILLS[activeId]?.tier] || 1100) / speed} />
      )}
      {ended && (
        <div className="ui-screen-enter" style={{ position: 'absolute', inset: 0, background: '#050304e0', display: 'grid', placeContent: 'center', gap: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: run.res.win ? PALETTE.legendary : PALETTE.accent }}>{run.res.win ? '승리' : '패배'}</div>
          <div className="text-[12px]" style={{ color: PALETTE.textDim }}>이야기로 돌아갑니다</div>
        </div>
      )}
        {infoId && <RegressionSkillInfo skillId={infoId} stats={stats} lv={regressionSkillLevel(skillLv, infoId)} onClose={() => setInfoId(null)} />}
    </div>
  );
}
