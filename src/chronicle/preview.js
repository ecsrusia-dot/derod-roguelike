// ============================================
// chronicle/preview.js — 효율 미리보기 (1.232.0)
// ============================================
// PM 요청: 사역마·장비를 바꾸기 전에 사냥 효율이 오르는지 미리 비교
//   같은 적(미리 굴린 조우 목록) · 같은 전투 난수(전투 번호별 고정 시드)로 「지금」과 「바꾸면」을 N전씩 계산
//   저장은 바꾸지 않는다 — applyBattle 결과는 버리고 summary(경험치·골드)만 읽는다
// 순수 함수 (engine·data만 import)
// ============================================
import * as E from './engine.js';
import { CHRONICLE_FIELDS, fieldStages } from './data.js';

export const PREVIEW = { battles: 200, gapMs: 1800 };

// 전투 1회 재생 시간 — BattleView 재생 공식 ÷ 배속 + 다음 전투 대기 1.8초 (분당 효율 계산용)
export function battlePlayMs(sim, speed = 1) {
  let ms = 0;
  for (const ev of sim.events) ms += ev.round || ev.k === 'pre' ? 160 : ev.k === 'dotTick' ? 380 : 620;
  return Math.round(ms / speed) + PREVIEW.gapMs;
}

// 시드 난수 (mulberry32) — 지금/바꾸면 양쪽이 같은 순서를 쓰도록
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 비교 기준 — 마지막 사냥 스테이지(같은 캐릭터·열려 있을 때), 없으면 열린 가장 높은 스테이지
export function previewTarget(save, last) {
  if (last && last.hero === save.hero && E.fieldUnlocked(save, last.fieldId) && E.stageUnlocked(save, last.fieldId, last.stage)) {
    return { field: CHRONICLE_FIELDS[last.fieldId - 1], stage: last.stage, fromLast: true };
  }
  // 1.282.0 — 마지막 사냥 기록이 없으면 내 레벨에 맞는 자리 (전승 직후 최고 지역을 기준으로 잡지 않게)
  const rec = E.recommendedHunt(save);
  if (rec) return { field: rec.field, stage: rec.stage, fromLast: false };
  for (let i = CHRONICLE_FIELDS.length - 1; i >= 0; i--) {
    const f = CHRONICLE_FIELDS[i];
    if (!E.fieldUnlocked(save, f.id)) continue;
    let s = 0;
    for (let k = fieldStages(f).length - 1; k > 0; k--) if (E.stageUnlocked(save, f.id, k)) { s = k; break; }
    return { field: f, stage: s, fromLast: false };
  }
  return null;
}

// 한 상태로 N전 — encounters는 미리 굴린 조우 목록
function runSide(save, target, encounters, seed, speed) {
  let wins = 0, hpLeft = 0, ms = 0, exp = 0, gold = 0, essence = 0, lossDmg = 0;
  const noReward = target.mode === 'gate' || target.mode === 'boss'; // 장비 평가 (1.268.0) — 보상 계산 생략
  encounters.forEach((enc0, i) => {
    const enemies = E.scaleEnemiesForRebirth(save, enc0.enemies);
    const party = E.partyCombatants(save);
    const rng = seededRng(seed + i * 7919);
    const sim = E.simulateChronicleBattle(party, enemies, rng);
    const hero = party.find(u => u.leader) || party[0];
    const last = [...sim.events].reverse().find(ev => ev.st && ev.st[hero.id]);
    const heroHp = last ? last.st[hero.id][0] : hero.hp;
    ms += battlePlayMs(sim, speed);
    if (sim.result !== 'win') {
      // 졌을 때 적에게 준 피해 비율 (적 전체 최대 HP 대비) — 보스처럼 아직 못 이기는 상대의 진척도
      const tot = enemies.reduce((a, e) => a + (e.maxHp || e.hp || 0), 0);
      const left = enemies.reduce((a, e) => { const ev = [...sim.events].reverse().find(x => x.st && x.st[e.id]); return a + Math.max(0, ev ? ev.st[e.id][0] : (e.hp || 0)); }, 0);
      lossDmg += tot ? Math.max(0, 1 - left / tot) : 0;
    }
    if (sim.result === 'win') {
      wins += 1;
      hpLeft += Math.max(0, heroHp) / hero.maxHp;
      if (noReward) return;
      const ctx = { kind: 'field', fieldId: target.field.id, type: enc0.type, enemies, stage: target.stage };
      const r = E.applyBattle(save, ctx, sim, seededRng(seed + i * 104729 + 1));
      exp += r.summary.exp || 0;
      gold += r.summary.gold || 0;
      essence += r.summary.essence || 0;
    }
  });
  const n = encounters.length;
  const perMin = (v) => (ms ? v * 60000 / ms : 0);
  return {
    battles: n, winRate: wins / n, hpLeft: wins ? hpLeft / wins : 0, secPerBattle: ms / n / 1000, lossDmg: n - wins ? lossDmg / (n - wins) : 0,
    expPerMin: perMin(exp), goldPerMin: perMin(gold), essencePerMin: perMin(essence),
  };
}

// 지금(before) vs 바꾸면(after) — 같은 적·같은 난수
export function previewCompare(before, after, target, { battles = PREVIEW.battles, speed = 2, seed = 12345 } = {}) {
  const encRng = seededRng(seed);
  // target.mode (1.268.0 장비 평가): 'gate' = 그 스테이지 관문 · 'boss' = 지역 보스 · 없으면 그 스테이지 사냥
  const roll = target.mode === 'gate' ? () => E.rollGateEncounter(target.field, target.stage, encRng)
    : target.mode === 'boss' ? () => E.rollFieldEncounter(target.field, encRng, true)
      : () => E.rollFieldEncounter(target.field, encRng, false, null, target.stage);
  const encounters = Array.from({ length: battles }, roll);
  return {
    before: runSide(before, target, encounters, seed + 1, speed),
    after: runSide(after, target, encounters, seed + 1, speed),
    target, battles, speed,
  };
}

// 한 상태의 효율만 (오프라인 보상 1.233.0)
export function estimateRate(save, target, { battles = 40, speed = 1, seed = 777 } = {}) {
  const encRng = seededRng(seed);
  // target.mode (1.268.0 장비 평가): 'gate' = 그 스테이지 관문 · 'boss' = 지역 보스 · 없으면 그 스테이지 사냥
  const roll = target.mode === 'gate' ? () => E.rollGateEncounter(target.field, target.stage, encRng)
    : target.mode === 'boss' ? () => E.rollFieldEncounter(target.field, encRng, true)
      : () => E.rollFieldEncounter(target.field, encRng, false, null, target.stage);
  const encounters = Array.from({ length: battles }, roll);
  return runSide(save, target, encounters, seed + 1, speed);
}
