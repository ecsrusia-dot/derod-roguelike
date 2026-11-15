// 사용: SAVE=<백업 JSON> node scripts/sim-chronicle-god.mjs
// 신 토벌 점검 — ① 내 승천 캐릭터(백업의 전승 캐릭터를 승천시킨 것으로 가정)의 점수 ② 가상 파티(전승·레벨별 1명/3명/5명) 점수 ③ 경쟁자 점수 분포·계산 시간
import fs from 'fs';
import * as G from '../src/chronicle/god.js';
import * as ASC from '../src/chronicle/ascend.js';
import * as SE from '../src/chronicle/season.js';
import * as AR from '../src/chronicle/arena.js';
import * as E from '../src/chronicle/engine.js';
import { RIVALS } from '../src/chronicle/rival.js';
import { REBIRTH_BRANCHES } from '../src/chronicle/data.js';
const acc0 = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8')).acc;
let acc = SE.rollSeason(SE.armSeason(acc0, Date.now() - 8 * 86400000), Date.now());
console.log('내 보관:', Object.keys(acc.asc.slots).join(','), '· 이번 주 약점:', G.godWeak().name, G.godWeak().desc);
for (let i = 0; i < 3; i++) { const r = G.godChallenge(acc, undefined, 100 + i); acc = r.acc; console.log(`  도전 ${i + 1}: ${r.run.cleared}단계 넘음 + ${Math.round(r.run.pct * 100)}% → 점수 ${r.run.score} · 인장 +${r.summary.god.seal} · 마지막 전투 ${r.sim ? r.sim.rounds + 'R ' + r.sim.result : '-'}`); }
console.log('  남은 횟수', G.godLeft(acc), '· 최고', G.godState(acc).best, '· 인장', acc.asc.seal);
// 가상 파티 — 경쟁자 조립(rivalSave)으로 전승·레벨별
const branches = Object.keys(REBIRTH_BRANCHES);
const mk = (b, rebirth, lv) => { const def = { ...RIVALS[branches.indexOf(b) * 10], branch: b, cls: REBIRTH_BRANCHES[b].cls }; const sv = AR.rivalSave(def, { rebirth, lv, peak: Math.max(lv, 100) }); const d = E.deriveUnit(sv, def.cls); const m = AR.ARENA.rivalMult; const hp = Math.round(d.maxHp * m); return { ...d, id: b, maxHp: hp, hp, atk: Math.round(d.atk * m), leader: false }; };
console.log('\n가상 파티 점수 (경쟁자식 조립 · 약점 없음)');
for (const [rb, lv] of [[1, 100], [1, 120], [2, 130], [3, 140], [4, 150], [5, 160]]) {
  const out = [];
  for (const n of [1, 3, 5]) { const party = [branches[0], branches[2], branches[9], branches[4], branches[6]].slice(0, n).map(b => mk(b, rb, lv)); out.push(`${n}명 ${G.godRun(party, 7).score}`); }
  console.log(`  전승${rb} Lv.${lv}: ${out.join(' · ')}`);
}
// 경쟁자 분포 — 몇 시즌 지난 것처럼 승천 칸을 채운다
let rv = {}; let a2 = { ...acc0, season: { on: true, n: 1, key: '2026-11-09' } };
for (let n = 1; n <= 6; n++) { a2 = { ...a2, season: { ...a2.season, n } }; rv = SE.ascendRivals(rv, a2, 14000, n); }
const t0 = Date.now(); const scores = RIVALS.filter(r => rv[r.id]).map(r => G.rivalGodScore(r, rv[r.id])).sort((a, b) => b - a);
console.log(`\n경쟁자 ${scores.length}명 (6시즌 · 주 14,000전 기준) 계산 ${Date.now() - t0}ms — 최고 ${scores[0]} · 10위 ${scores[9]} · 중앙 ${scores[Math.floor(scores.length / 2)]} · 최저 ${scores[scores.length - 1]}`);
