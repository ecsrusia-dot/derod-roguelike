// ============================================
// components/exo/ExoBattleScreen.jsx — ⚱ 제령사 1:1 턴제 전투 (1.169.0)
// ============================================
// 핵심 축: 브레이크(자세 붕괴) + 약점 5속성 + 자동 스킬 4슬롯 + 제령 도박.
// 수동 행동: 무기 스킬 / 보조 스킬 / 기본 공격(SP 회수) / 성수(전투당 1회, 행동 무소모) / 제령.
// 자동 스킬: battleStart / turnStart / struck / onCrit / onBreak / onStatusApply 트리거.

import React, { useEffect, useRef, useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import {
  EXO_SKILLS, EXO_AUTO, EXO_STATUS, EXO_STATUS_CAP, EXO_ATTACK_TYPES,
  EXO_TUNING, exoDerived, exoCaptureChance, makeExoSpirit, EXO_SPIRIT_CAP,
} from '../../data.js';

const T = EXO_TUNING;

export default function ExoBattleScreen({ char, enemy, onFinish }) {
  const d = exoDerived(char);
  const [p, setP] = useState(() => ({
    hp: char.hp, sp: Math.round(d.maxSp * 0.6), shield: 0,
    statuses: {}, atkStackPct: 0, critBonus: 0, cds: {}, potionUsed: false, lowHpUsed: false, amp: 0,
  }));
  const [foe, setFoe] = useState(() => ({
    ...enemy, statuses: {}, broken: 0, turnCount: 0, enraged: false,
    revealed: false, captureLocked: false, rageAtkPct: 0,
  }));
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const talUsedRef = useRef(0);
  const logRef = useRef(null);
  const endedRef = useRef(false);

  const pushLog = (text, color = PALETTE.text) =>
    setLog(l => [...l.slice(-40), { text, color, id: Math.random() }]);

  useEffect(() => { logRef.current?.scrollTo(0, 99999); }, [log]);

  // ===== 상태이상 헬퍼 =====
  const addStatus = (obj, s, n) => {
    const next = { ...obj, [s]: Math.min(EXO_STATUS_CAP, (obj[s] || 0) + n) };
    return next;
  };
  const decayStatuses = (obj) => {
    const next = {};
    for (const [s, n] of Object.entries(obj)) {
      const def = EXO_STATUS[s];
      const left = n - (def?.decay ?? 1);
      if (left > 0) next[s] = left;
      else if ((def?.decay ?? 1) === 0) next[s] = n; // 유지형 (중독·집중)
    }
    return next;
  };

  // ===== 자동 스킬 (피드백 1 — 4슬롯이 매 전투 일한다) =====
  // 반환: 양쪽 상태를 직접 패치하기 위해 작업 큐 대신 mutable 초안 객체를 쓴다
  const runAutos = (trigger, draft) => {
    for (const slot of ['armor', 'helm', 'acc1', 'acc2']) {
      const it = char.equipped?.[slot];
      const auto = it ? EXO_AUTO[it.skillId] : null;
      if (!auto || auto.trigger !== trigger) continue;
      if (trigger === 'lowHpOnce') { /* 호출부에서 조건 판정 */ }
      if (Math.random() * 100 >= auto.chance) continue;
      const fx = auto.fx;
      if (fx.shieldPct) { draft.p.shield += Math.round(d.maxHp * fx.shieldPct / 100); pushLog(`🛡 ${it.name} — 보호막 +${Math.round(d.maxHp * fx.shieldPct / 100)}`, PALETTE.ice); }
      if (fx.healPct) { draft.p.hp = Math.min(d.maxHp, draft.p.hp + Math.round(d.maxHp * fx.healPct / 100)); pushLog(`🌿 ${it.name} — HP ${Math.round(d.maxHp * fx.healPct / 100)} 회복`, PALETTE.green); }
      if (fx.sp) { draft.p.sp = Math.min(d.maxSp, draft.p.sp + fx.sp); pushLog(`💠 ${it.name} — SP +${fx.sp}`, PALETTE.ice); }
      if (fx.status) { draft.p.statuses = addStatus(draft.p.statuses, fx.status.s, fx.status.n); pushLog(`${EXO_STATUS[fx.status.s].icon} ${it.name} — [${EXO_STATUS[fx.status.s].name}] ${fx.status.n}`, PALETTE.dawn); }
      if (fx.enemyStatus) { draft.foe.statuses = addStatus(draft.foe.statuses, fx.enemyStatus.s, fx.enemyStatus.n); pushLog(`${EXO_STATUS[fx.enemyStatus.s].icon} ${it.name} — 적 [${EXO_STATUS[fx.enemyStatus.s].name}] ${fx.enemyStatus.n}`, PALETTE.dawn); }
      if (fx.poiseDmg) { draft.foe.poise = Math.max(0, draft.foe.poise - fx.poiseDmg); pushLog(`💥 ${it.name} — 적 자세 -${fx.poiseDmg}`, PALETTE.dawn); }
      if (fx.counterPct) { const dmg = Math.max(1, Math.round(d.phys * fx.counterPct / 100) - Math.round(draft.foe.def * 0.6)); draft.foe.hp -= dmg; pushLog(`⚡ ${it.name} — 반격 ${dmg}`, PALETTE.accent); }
      if (fx.bonusHitPct) { const dmg = Math.max(1, Math.round(d.phys * fx.bonusHitPct / 100) - Math.round(draft.foe.def * 0.6)); draft.foe.hp -= dmg; pushLog(`💢 ${it.name} — 추가타 ${dmg}`, PALETTE.accent); }
      if (fx.ampStack) { draft.p.amp += fx.ampStack; pushLog(`🔗 ${it.name} — 다음 상태이상 스택 +1`, PALETTE.dawn); }
      if (fx.atkStackPct) { draft.p.atkStackPct += fx.atkStackPct; }
      if (fx.reveal && !draft.foe.revealed) { draft.foe.revealed = true; pushLog(`👁 ${it.name} — 약점 간파: [${EXO_ATTACK_TYPES[foe.weak].name}]`, PALETTE.legendary); }
    }
  };

  // ===== 브레이크 판정 =====
  const applyBreak = (draft, bp, type) => {
    if (draft.foe.broken > 0 || draft.foe.hp <= 0) return;
    const weakHit = type === draft.foe.weak;
    if (weakHit && !draft.foe.revealed) { draft.foe.revealed = true; pushLog(`🎯 약점 발견 — [${EXO_ATTACK_TYPES[type].name}]!`, PALETTE.legendary); }
    const amount = Math.round(bp * (1 + d.breakPct / 100) * (weakHit ? T.weaknessBreakMult : 1));
    if (amount <= 0) return;
    draft.foe.poise = Math.max(0, draft.foe.poise - amount);
    if (draft.foe.poise <= 0) {
      draft.foe.broken = T.breakTurns;
      pushLog(`💥 브레이크! ${draft.foe.name}의 자세가 무너졌다 — ${T.breakTurns}턴간 받는 피해 +${T.breakVulnPct}% · 행동 불가`, PALETTE.legendary);
      runAutos('onBreak', draft);
    }
  };

  // ===== 피해 계산 (내 공격) =====
  const hitEnemy = (draft, { stat, pow, type, pierce = 0, canCrit = true }) => {
    const base = (stat === 'spirit' ? d.spirit : d.phys) * pow / 100;
    const weakHit = type === draft.foe.weak;
    let m = 1 + (weakHit ? T.weaknessDmgPct / 100 : 0);
    m *= 1 + draft.p.atkStackPct / 100;
    m *= 1 - (draft.p.statuses.weak || 0) * EXO_STATUS.weak.perPct / 100;
    m *= 1 + (draft.foe.statuses.vuln || 0) * EXO_STATUS.vuln.perPct / 100;
    if (draft.foe.broken > 0) m *= 1 + T.breakVulnPct / 100;
    const critChance = d.crit + (draft.p.statuses.focus || 0) * EXO_STATUS.focus.perPct;
    const isCrit = canCrit && Math.random() * 100 < critChance;
    if (isCrit) m *= 1.6;
    const mitDef = draft.foe.def * (1 - pierce / 100);
    const dmg = Math.max(1, Math.round(base * m * (0.92 + Math.random() * 0.16) - mitDef));
    draft.foe.hp -= dmg;
    pushLog(`${isCrit ? '✦ 치명! ' : ''}${weakHit ? '🎯 ' : ''}${dmg} 피해`, isCrit ? PALETTE.legendary : PALETTE.text);
    if (isCrit) runAutos('onCrit', draft);
    return dmg;
  };

  // 플레이어가 적에게 상태이상 부여 (증폭 팔찌 소비 + onStatusApply)
  const inflict = (draft, s, n, chance = 100) => {
    const bonus = (d.bag.statusChance || 0);
    if (Math.random() * 100 >= Math.min(100, chance + bonus)) { pushLog(`[${EXO_STATUS[s].name}] 부여 실패`, PALETTE.textDim); return; }
    let stacks = n;
    if (draft.p.amp > 0) { stacks += 1; draft.p.amp -= 1; }
    draft.foe.statuses = addStatus(draft.foe.statuses, s, stacks);
    pushLog(`${EXO_STATUS[s].icon} 적에게 [${EXO_STATUS[s].name}] ${stacks}`, EXO_STATUS[s].color);
    runAutos('onStatusApply', draft);
  };

  // ===== 종료 처리 =====
  const finish = (draft, res) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setResult(res);
    setP({ ...draft.p });
    setFoe({ ...draft.foe });
  };

  const checkEnd = (draft) => {
    if (draft.foe.hp <= 0) {
      pushLog(`${draft.foe.name}이(가) 스러진다…`, PALETTE.legendary);
      finish(draft, { win: true, hp: Math.max(1, draft.p.hp), captured: null, talismansUsed: talUsedRef.current, potionUsed: draft.p.potionUsed });
      return true;
    }
    if (draft.p.hp <= 0) {
      finish(draft, { win: false, talismansUsed: talUsedRef.current });
      return true;
    }
    return false;
  };

  // ===== 턴 종료 — 도트·재생 처리 =====
  const tickDots = (draft, side) => {
    const t = side === 'foe' ? draft.foe : draft.p;
    const maxHp = side === 'foe' ? draft.foe.maxHp : d.maxHp;
    let dot = 0;
    for (const s of ['poison', 'burn', 'bleed']) {
      const n = t.statuses[s] || 0;
      if (n > 0) dot += Math.round(maxHp * EXO_STATUS[s].pct / 100) * n;
    }
    if (dot > 0) { t.hp -= dot; pushLog(`${side === 'foe' ? draft.foe.name : '나'} — 지속피해 ${dot}`, '#e05a5a'); }
    const regen = t.statuses.regen || 0;
    if (regen > 0) { const heal = Math.round(maxHp * EXO_STATUS.regen.pct / 100) * regen; t.hp = Math.min(maxHp, t.hp + heal); pushLog(`${side === 'foe' ? draft.foe.name : '나'} — 재생 ${heal}`, PALETTE.green); }
    t.statuses = decayStatuses(t.statuses);
  };

  // ===== 적 턴 =====
  const enemyTurn = (draft) => {
    if (checkEnd(draft)) return;
    if (draft.foe.broken > 0) {
      draft.foe.broken -= 1;
      pushLog(`${draft.foe.name}은(는) 무너진 채 일어나지 못한다.`, PALETTE.textDim);
      if (draft.foe.broken <= 0) { draft.foe.poise = draft.foe.poiseMax; pushLog(`${draft.foe.name}이(가) 자세를 추스른다.`, PALETTE.textDim); }
    } else if ((draft.foe.statuses.stun || 0) > 0) {
      pushLog(`${draft.foe.name}은(는) 기절해 움직이지 못한다!`, PALETTE.dawn);
    } else {
      // 격노 (보스 HP 50% 이하 1회)
      if (draft.foe.boss && !draft.foe.enraged && draft.foe.hp < draft.foe.maxHp * 0.5) {
        draft.foe.enraged = true; draft.foe.rageAtkPct += 20;
        pushLog(`⚠ ${draft.foe.name}이(가) 격노한다 — 공격 +20%!`, PALETTE.accent);
      }
      draft.foe.turnCount += 1;
      const spc = draft.foe.spc;
      const isSpecial = spc && draft.foe.turnCount % (spc.every || 3) === 0;
      const mult = isSpecial ? spc.mult : 1;
      const hits = isSpecial && spc.hits ? spc.hits : 1;
      if (isSpecial) pushLog(`‼ ${draft.foe.name} — 「${spc.name}」!`, PALETTE.accent);
      for (let h = 0; h < hits; h++) {
        if (draft.p.hp <= 0) break;
        if (Math.random() * 100 < d.dodge) { pushLog('회피했다!', PALETTE.green); continue; }
        const atk = draft.foe.atk * (1 + draft.foe.rageAtkPct / 100);
        const foeWeak = 1 - (draft.foe.statuses.weak || 0) * EXO_STATUS.weak.perPct / 100;
        const myVuln = 1 + (draft.p.statuses.vuln || 0) * EXO_STATUS.vuln.perPct / 100;
        let dmg = Math.max(1, Math.round(atk * mult * foeWeak * myVuln * (0.9 + Math.random() * 0.2) - d.def * 0.9));
        // 철벽 흉갑 — HP 35% 이하 첫 피격 (전투당 1회)
        if (!draft.p.lowHpUsed && draft.p.hp - dmg <= d.maxHp * 0.35) {
          const iron = ['armor'].map(s => char.equipped?.[s]).find(it => it && EXO_AUTO[it.skillId]?.trigger === 'lowHpOnce');
          if (iron) { draft.p.lowHpUsed = true; draft.p.shield += Math.round(d.maxHp * 0.2); pushLog(`🧱 ${iron.name} — 최대 HP 20% 보호막!`, PALETTE.ice); }
        }
        if (draft.p.shield > 0) {
          const absorbed = Math.min(draft.p.shield, dmg);
          draft.p.shield -= absorbed; dmg -= absorbed;
          if (absorbed > 0) pushLog(`보호막이 ${absorbed} 흡수`, PALETTE.ice);
        }
        if (dmg > 0) {
          draft.p.hp -= dmg;
          pushLog(`${dmg} 피해를 입었다`, PALETTE.accent);
          if (isSpecial && spc.st && Math.random() * 100 < (spc.st.p ?? 100)) {
            draft.p.statuses = addStatus(draft.p.statuses, spc.st.s, spc.st.n);
            pushLog(`${EXO_STATUS[spc.st.s].icon} [${EXO_STATUS[spc.st.s].name}] ${spc.st.n}에 걸렸다`, EXO_STATUS[spc.st.s].color);
          }
          if (isSpecial && spc.drainPct) {
            const heal = Math.round(dmg * spc.drainPct / 100);
            draft.foe.hp = Math.min(draft.foe.maxHp, draft.foe.hp + heal);
            pushLog(`${draft.foe.name}이(가) ${heal} 흡수했다`, PALETTE.accent);
          }
          runAutos('struck', draft);
        }
      }
    }
    tickDots(draft, 'foe');
    if (checkEnd(draft)) return;
    tickDots(draft, 'p');
    if (checkEnd(draft)) return;
    // 내 턴 시작 — 쿨다운·SP·오라
    const cds = {};
    for (const [k, v] of Object.entries(draft.p.cds)) if (v > 1) cds[k] = v - 1;
    draft.p.cds = cds;
    const leyline = char.floorMod === 'leyline' ? 5 : 0;
    draft.p.sp = Math.min(d.maxSp, draft.p.sp + d.spRegen + leyline);
    runAutos('turnStart', draft);
    checkEnd(draft);
  };

  // ===== 수동 행동 =====
  const act = (kind, slot = null) => {
    if (busy || result) return;
    const draft = { p: { ...p, statuses: { ...p.statuses }, cds: { ...p.cds } }, foe: { ...foe, statuses: { ...foe.statuses } } };
    let consumed = true;
    if (kind === 'skill') {
      const it = char.equipped?.[slot];
      const sk = it ? EXO_SKILLS[it.skillId] : null;
      if (!sk) return;
      if ((draft.p.cds[slot] || 0) > 0 || draft.p.sp < sk.sp) return;
      draft.p.sp -= sk.sp;
      if (sk.cd > 0) draft.p.cds[slot] = sk.cd + 1;
      pushLog(`「${sk.name}」`, PALETTE.dawn);
      if (sk.reveal && !draft.foe.revealed) { draft.foe.revealed = true; pushLog(`👁 약점 폭로 — [${EXO_ATTACK_TYPES[draft.foe.weak].name}]!`, PALETTE.legendary); }
      const hits = sk.hits || 1;
      for (let h = 0; h < hits; h++) {
        if (sk.pow > 0 && draft.foe.hp > 0) hitEnemy(draft, { stat: sk.stat, pow: sk.pow, type: sk.type, pierce: sk.pierce || 0 });
        if (draft.foe.hp > 0) applyBreak(draft, sk.bp, sk.type);
      }
      if (sk.st && draft.foe.hp > 0) inflict(draft, sk.st.s, sk.st.n, sk.st.p ?? 100);
      if (sk.selfHealPct) { const heal = Math.round(d.maxHp * sk.selfHealPct / 100); draft.p.hp = Math.min(d.maxHp, draft.p.hp + heal); pushLog(`HP ${heal} 회복`, PALETTE.green); }
      if (sk.selfShieldPct) { const sh = Math.round(d.maxHp * sk.selfShieldPct / 100); draft.p.shield += sh; pushLog(`보호막 +${sh}`, PALETTE.ice); }
      if (sk.spGain) { draft.p.sp = Math.min(d.maxSp, draft.p.sp + sk.spGain); pushLog(`SP +${sk.spGain}`, PALETTE.ice); }
    } else if (kind === 'basic') {
      const wsk = EXO_SKILLS[char.equipped?.weapon?.skillId] || EXO_SKILLS.wSlash1;
      pushLog('기본 공격', PALETTE.textDim);
      hitEnemy(draft, { stat: wsk.stat, pow: T.basicPow, type: wsk.type });
      if (draft.foe.hp > 0) applyBreak(draft, 10, wsk.type);
      draft.p.sp = Math.min(d.maxSp, draft.p.sp + T.basicSpGain);
    } else if (kind === 'potion') {
      if (draft.p.potionUsed || (char.potions || 0) <= 0) return;
      draft.p.potionUsed = true;
      const heal = Math.round(d.maxHp * T.potionHealPct / 100);
      draft.p.hp = Math.min(d.maxHp, draft.p.hp + heal);
      pushLog(`🧪 성수 — HP ${heal} 회복 (행동 소모 없음)`, PALETTE.green);
      consumed = false; // 행동 무소모
    } else if (kind === 'capture') {
      const left = (char.talismans || 0) - talUsedRef.current;
      if (left <= 0 || draft.foe.captureLocked || draft.foe.hp > draft.foe.maxHp * T.captureHpPct / 100) return;
      if ((char.spirits || []).length >= EXO_SPIRIT_CAP) { pushLog(`사령부가 가득 찼다 (${EXO_SPIRIT_CAP}) — 빙의하거나 방생한 뒤 시도하라.`, PALETTE.accent); return; }
      talUsedRef.current += 1;
      const chance = exoCaptureChance(draft.foe);
      pushLog(`🧿 제령부를 태운다 — 제령 시도 (성공률 ${chance}%)`, PALETTE.legendary);
      if (Math.random() * 100 < chance) {
        const spirit = makeExoSpirit(draft.foe.key, draft.foe.level, draft.foe.rank);
        pushLog(`🕯 제령 성공! «${spirit.name}»이(가) 부적에 깃들었다.`, PALETTE.legendary);
        finish(draft, { win: true, hp: Math.max(1, draft.p.hp), captured: spirit, talismansUsed: talUsedRef.current, potionUsed: draft.p.potionUsed });
        return;
      }
      draft.foe.captureLocked = true;
      draft.foe.rageAtkPct += 25;
      pushLog('제령 실패 — 원혼이 광포해진다! 공격 +25% · 이번 전투 재시도 불가', PALETTE.accent);
    }
    setP({ ...draft.p }); setFoe({ ...draft.foe });
    if (checkEnd(draft)) return;
    if (!consumed) return;
    setBusy(true);
    setTimeout(() => {
      enemyTurn(draft);
      if (!endedRef.current) { setP({ ...draft.p }); setFoe({ ...draft.foe }); }
      setBusy(false);
    }, 420);
  };

  // 개전 트리거 (1회)
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const draft = { p: { ...p, statuses: { ...p.statuses } }, foe: { ...foe, statuses: { ...foe.statuses } } };
    pushLog(`${foe.icon} ${foe.name} (Lv.${foe.level})${foe.boss ? ' — 지배자' : foe.elite ? ' — 강령' : ''}이(가) 나타났다!`, PALETTE.accent);
    const bag = d.bag;
    if (bag.shieldStartPct) draft.p.shield += Math.round(d.maxHp * bag.shieldStartPct / 100);
    if (bag.regenStart) draft.p.statuses = addStatus(draft.p.statuses, 'regen', bag.regenStart);
    runAutos('battleStart', draft);
    setP({ ...draft.p }); setFoe({ ...draft.foe });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 표시 =====
  const spc = foe.spc;
  const telegraph = spc?.heavy && foe.broken <= 0 && (foe.turnCount + 1) % (spc.every || 3) === 0;
  const captureLeft = (char.talismans || 0) - talUsedRef.current;
  const captureReady = foe.hp > 0 && foe.hp <= foe.maxHp * T.captureHpPct / 100 && captureLeft > 0 && !foe.captureLocked && !result;
  const Bar = ({ cur, max, color, h = 8 }) => (
    <div className="w-full overflow-hidden" style={{ height: h, borderRadius: 4, background: '#00000055' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, cur / Math.max(1, max) * 100))}%`, height: '100%', background: color, transition: 'width .25s' }} />
    </div>
  );
  const StatusChips = ({ st }) => (
    <div className="flex flex-wrap gap-1">
      {Object.entries(st).map(([s, n]) => n > 0 && (
        <span key={s} className="text-[10px] px-1.5 py-0.5" style={{ borderRadius: 6, background: `${EXO_STATUS[s].color}22`, color: EXO_STATUS[s].color, border: `1px solid ${EXO_STATUS[s].color}55` }}>
          {EXO_STATUS[s].icon}{EXO_STATUS[s].name} {n}
        </span>
      ))}
    </div>
  );
  const skillBtn = (slot) => {
    const it = char.equipped?.[slot];
    const sk = it ? EXO_SKILLS[it.skillId] : null;
    if (!sk) return (
      <div key={slot} className="flex-1 py-2.5 text-center text-[11px]" style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, color: PALETTE.textDim, border: `1px solid ${PALETTE.panelBorder}`, opacity: 0.5 }}>
        {slot === 'weapon' ? '무기 없음' : '보조 없음'}
      </div>
    );
    const cd = p.cds[slot] || 0;
    const off = busy || !!result || cd > 0 || p.sp < sk.sp;
    const tp = EXO_ATTACK_TYPES[sk.type];
    return (
      <button key={slot} onClick={() => act('skill', slot)} disabled={off}
        className="ui-press flex-1 py-2 px-2 text-left"
        style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px solid ${foe.revealed && sk.type === foe.weak ? PALETTE.legendary : PALETTE.panelBorder}`, opacity: off ? 0.45 : 1 }}>
        <div className="text-[11px] font-bold" style={{ color: PALETTE.text }}>{tp.icon} {sk.name}{foe.revealed && sk.type === foe.weak ? ' 🎯' : ''}</div>
        <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
          {sk.pow > 0 ? `위력 ${sk.pow}%` : '기술'} · 자세 {sk.bp} · SP {sk.sp}{cd > 0 ? ` · 쿨 ${cd}` : ''}
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* ===== 적 패널 ===== */}
      <div className="px-3 pt-3 pb-2 space-y-1.5" style={{ background: PALETTE.panel, borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold" style={{ color: foe.boss ? PALETTE.legendary : foe.elite ? PALETTE.accent : PALETTE.text }}>
            {foe.icon} {foe.name} <span className="text-[10px]" style={{ color: PALETTE.textDim }}>Lv.{foe.level}</span>
          </div>
          <div className="text-[10px]" style={{ color: foe.revealed ? PALETTE.legendary : PALETTE.textDim }}>
            약점 {foe.revealed ? `${EXO_ATTACK_TYPES[foe.weak].icon}${EXO_ATTACK_TYPES[foe.weak].name}` : '???'}
          </div>
        </div>
        <Bar cur={foe.hp} max={foe.maxHp} color={PALETTE.accent} />
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] shrink-0" style={{ color: foe.broken > 0 ? PALETTE.legendary : PALETTE.textDim }}>{foe.broken > 0 ? `붕괴 ${foe.broken}` : '자세'}</span>
          <div className="flex-1"><Bar cur={foe.broken > 0 ? 0 : foe.poise} max={foe.poiseMax} color={foe.broken > 0 ? PALETTE.legendary : '#e8c84a'} h={5} /></div>
        </div>
        <StatusChips st={foe.statuses} />
        {telegraph && <div className="text-[10px] font-bold" style={{ color: PALETTE.accent }}>‼ 다음 턴 「{spc.name}」 — 방어하거나 자세를 부숴 저지하라!</div>}
      </div>

      {/* ===== 로그 ===== */}
      <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {log.map(l => <div key={l.id} className="text-[11px] leading-relaxed" style={{ color: l.color }}>{l.text}</div>)}
      </div>

      {/* ===== 결과 ===== */}
      {result && (
        <div className="px-3 pb-2">
          <button onClick={() => onFinish(result)} className="ui-press w-full py-3 text-[13px] font-bold"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: result.win ? PALETTE.legendary : PALETTE.accent, color: '#0a0608' }}>
            {result.captured ? `🕯 «${result.captured.name}» 획득 — 나아간다` : result.win ? '승리 — 나아간다' : '쓰러졌다…'}
          </button>
        </div>
      )}

      {/* ===== 플레이어 패널 ===== */}
      {!result && (
        <div className="px-3 pb-3 pt-2 space-y-1.5" style={{ background: PALETTE.panel, borderTop: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: PALETTE.textDim }}>
            <span style={{ color: PALETTE.text }}>HP {p.hp}/{d.maxHp}</span>
            {p.shield > 0 && <span style={{ color: PALETTE.ice }}>🛡{p.shield}</span>}
            <span style={{ color: PALETTE.ice }}>SP {p.sp}/{d.maxSp}</span>
            {p.atkStackPct > 0 && <span style={{ color: PALETTE.dawn }}>공격 +{p.atkStackPct}%</span>}
          </div>
          <Bar cur={p.hp} max={d.maxHp} color={PALETTE.green} />
          <Bar cur={p.sp} max={d.maxSp} color={PALETTE.ice} h={5} />
          <StatusChips st={p.statuses} />
          <div className="flex gap-1.5">{skillBtn('weapon')}{skillBtn('offhand')}</div>
          <div className="flex gap-1.5">
            <button onClick={() => act('basic')} disabled={busy}
              className="ui-press flex-1 py-2 text-[11px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}`, opacity: busy ? 0.45 : 1 }}>
              기본 공격 (SP +{T.basicSpGain})
            </button>
            <button onClick={() => act('potion')} disabled={busy || p.potionUsed || (char.potions || 0) <= 0}
              className="ui-press py-2 px-3 text-[11px]"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: p.potionUsed || (char.potions || 0) <= 0 ? PALETTE.textDim : PALETTE.green, border: `1px solid ${PALETTE.green}44`, opacity: busy || p.potionUsed || (char.potions || 0) <= 0 ? 0.45 : 1 }}>
              🧪 성수 ×{char.potions || 0}
            </button>
            <button onClick={() => act('capture')} disabled={busy || !captureReady}
              className={`ui-press py-2 px-3 text-[11px] font-bold${captureReady ? ' ui-sheen' : ''}`}
              style={{ borderRadius: 'var(--r-btn, 13px)', background: captureReady ? PALETTE.legendary : PALETTE.panelLight, color: captureReady ? '#0a0608' : PALETTE.textDim, border: `1px solid ${PALETTE.legendary}66`, opacity: busy || !captureReady ? 0.5 : 1 }}>
              🧿 제령 ×{Math.max(0, captureLeft)}{captureReady ? ` ${exoCaptureChance(foe)}%` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
