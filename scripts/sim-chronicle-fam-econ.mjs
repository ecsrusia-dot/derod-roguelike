// 황혼 연대기 사역마 경제 시뮬 (1.242.0) — 먼저 node scripts/sim-chronicle-dungeon.mjs snap (/tmp/snaps.json)
// 사냥 수입(조각·사역혼) + 소환 중복 사역혼 + 등급별 강화·진화 비용 → 시간 환산 (×2 배속)
import fs from 'fs'; import os from 'os';
import * as E from '../src/chronicle/engine.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_FIELDS, fieldStages } from '../src/chronicle/data.js';
import { battlePlayMs } from '../src/chronicle/preview.js';
const snaps = JSON.parse(fs.readFileSync(os.tmpdir() + '/snaps.json', 'utf8'));
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry(7);
// 1) 전투당 조각·분당 전투 (사냥 — 열린 최고 사냥터의 레벨 맞는 스테이지)
let soulsDrop = 0, shards = 0, wins = 0, ms = 0, N = 0, uniq = 0;
for (const key of Object.keys(snaps)) {
  const s0 = structuredClone(snaps[key]); const lv = s0.units[s0.hero].lv;
  const field = CHRONICLE_FIELDS.filter(f => !f.part || f.part <= 2).filter(f => f.lv[0] <= lv).pop();
  const st = fieldStages(field); let stage = 0; st.forEach((x, i) => { if (x.lv <= lv) stage = i; });
  let s = s0;
  for (let i = 0; i < 60; i++) {
    const enc = E.rollFieldEncounter(field, rng, false, null, stage);
    enc.enemies = E.scaleEnemiesForRebirth(s, enc.enemies);
    const p = E.partyCombatants(s); const sim = E.simulateChronicleBattle(p, enc.enemies, rng);
    const r = E.applyBattle(s, { kind: 'field', fieldId: field.id, type: enc.type, enemies: enc.enemies, stage }, sim, rng);
    s = r.save; N++; ms += battlePlayMs(sim, 2); if (sim.result === 'win') wins++;
    shards += r.summary.famShards || 0; soulsDrop += r.summary.famSouls || 0; uniq += (r.summary.items || []).filter(it => it.grade === 'unique').length;
  }
}
const spb = shards / N, bpm = N / (ms / 60000);
console.log(`[수입] 사냥 ${N}전: 조각 ${spb.toFixed(3)}/전투 · ${bpm.toFixed(1)}전/분(×2) · 승률 ${(wins / N * 100).toFixed(0)}% · 유니크 ${(uniq / N * 1000).toFixed(2)}/천전`);
console.log(`       → 소환 1회 = ${(10 / spb).toFixed(0)}전 = ${(10 / spb / bpm).toFixed(1)}분`);
// 2) 소환 MC — 2부 중반 진행도(보스 1~6 처치, 던전 2개)
const prog = structuredClone(snaps['wanderer|frostAbyss'].progress);
const pool = F.famPool(prog);
console.log('[풀] ' + Object.entries(pool).map(([g, a]) => `${F.famGrade(g).label} ${a.length}종`).join(' · '));
function summonRun(n) {
  let fams = {}, pity = {}, soul = 0;
  const r = mulberry(n * 13 + 1);
  for (let i = 0; i < n / 10; i++) { const o = F.summonFamiliars(fams, pity, prog, 10, r); fams = o.fams; pity = o.pity; soul += o.souls; }
  return { fams, soul };
}
for (const n of [50, 100, 200, 500]) {
  let soul = 0, ind = 0, vio = 0; const R = 40;
  for (let k = 0; k < R; k++) { const o = summonRun(n + k * 0); const x = summonRun(n); soul += x.soul; ind += Object.values(x.fams).filter(f => f.grade === 'indigo').length; vio += Object.values(x.fams).filter(f => f.grade === 'violet').length; }
  console.log(`[소환 ${n}회] 사역혼 ${Math.round(soul / R)} (${(soul / R / n).toFixed(2)}/회) · 남령 ${(ind / R).toFixed(1)}종 · 자령 ${(vio / R).toFixed(1)}종 · 필요 전투 ${Math.round(n * 10 / spb)} (${(n * 10 / spb / bpm / 60).toFixed(1)}시간)`);
}
// 3) 강화·진화 비용 MC (한 마리를 등급 g에서 목표까지)
function climb(fromGrade, toGrade, plusGoal = 0) {
  let fams = { x: { grade: fromGrade, plus: 0, lv: 1 } }, spent = 0, attempts = 0; const r = mulberry(Math.floor(Math.random() * 1e9));
  while (F.famGradeIdx(fams.x.grade) < F.famGradeIdx(toGrade)) {
    while (fams.x.plus < 10) { const c = F.FAM_TUNING.enhanceCost(fams.x.plus, fams.x.grade); spent += c; fams.x = { ...fams.x, plus: fams.x.plus + 1 }; }
    const o = F.evolveFamiliar(fams, 1e12, 'x', r); spent += 1e12 - o.souls; fams = o.fams; attempts++;
  }
  while (fams.x.plus < plusGoal) { spent += F.FAM_TUNING.enhanceCost(fams.x.plus, fams.x.grade); fams.x = { ...fams.x, plus: fams.x.plus + 1 }; }
  return { spent, attempts };
}
const soulPerSummon = (() => { const x = summonRun(500); return x.soul / 500; })();
const dropPB = soulsDrop / N; const earlySummon = 1.0; const soulPerBattle = soulPerSummon * spb / 10 + dropPB; const soulEarly = earlySummon * spb / 10 + dropPB;
console.log(`[사역혼 수입] 전투 드랍 ${dropPB.toFixed(3)}/전 · 초반(소환 100회 전후) ${soulEarly.toFixed(3)}/전 · 후반 ${soulPerBattle.toFixed(3)}/전`);
for (const [a, b, p] of [['red', 'green'], ['green', 'blue'], ['blue', 'indigo'], ['indigo', 'violet'], ['blue', 'indigo', 5], ['red', 'indigo', 5]]) {
  const xs = Array.from({ length: 2000 }, () => climb(a, b, p || 0)).map(o => o.spent).sort((m, n) => m - n);
  const med = xs[1000], p90 = xs[1800], avg = xs.reduce((s, v) => s + v, 0) / xs.length;
  console.log(`[${F.famGrade(a).label}→${F.famGrade(b).label}${p ? ` +${p}` : ''}] 사역혼 평균 ${Math.round(avg)} · 중앙 ${med} · 운 나쁨(90%) ${p90} → 후반 ${(avg / soulPerBattle / bpm / 60).toFixed(1)}시간 · 초반 ${(avg / soulEarly / bpm / 60).toFixed(1)}시간 · 시도 평균 ${(xs.att||0)}`);
}
console.log(`[참고] 소환 1회 평균 사역혼 ${soulPerSummon.toFixed(2)} · 전투당 ${soulPerBattle.toFixed(3)} · 일일 임무 하루 사역혼 10 + 조각 20`);
