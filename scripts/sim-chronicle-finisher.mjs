// 사용: [CLS=elf] [LV=100] node scripts/sim-chronicle-finisher.mjs [전투 수=200]
// 「마무리 우선」(CHRONICLE_TUNING.finisher) 끔 → 켬 비교 — 직업·갈래별 무리전 평균 라운드·승률 (레벨 차 −10 ~ +7)
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS, CHRONICLE_TUNING as T } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 200;
const LV = +process.env.LV || 100;
const CLSS = process.env.CLS ? [process.env.CLS] : ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
function build(cid, branch) {
  let save = E.newChronicleSave(cid); const u = save.units[cid];
  { const rg = mulberry(5); for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) { const it = E.rollItem(rg, 'epic', LV, slot, 'field', cid); it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid; } }
  u.rebirth = { branch, count: 1 }; u.lv = LV; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: LV * 4 - 4 } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70; const trees = TL.talentTrees(cid, branch);
  for (const tr of [trees[trees.length - 1], ...trees]) for (const tier of tr.tiers) for (const n of tier) while (uu.sp > 0 && TL.canLearnTalent(uu, n.id)) { uu.talents[n.id] = (uu.talents[n.id] || 0) + 1; uu.sp--; }
  return save;
}
function run(save, gap) {
  const lv = Math.max(1, LV + gap); const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(11); let w = 0, r = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, false, null, 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); if (b.result === 'win') w++; r += b.rounds || 0; }
  return [Math.round(w / N * 100), r / N];
}
const GAPS = [-10, -5, 0, 5, 7];
console.log('갈래'.padEnd(10), GAPS.map(g => `차 ${g >= 0 ? '+' : ''}${g}: 끔 → 켬`.padEnd(30)).join(''));
for (const cid of CLSS) for (const branch of Object.keys(TL.BRANCH_TREES).filter(b => TL.BRANCH_TREES[b].cls === cid)) {
  const s = build(cid, branch);
  const cells = GAPS.map(g => { T.finisher = false; const a = run(s, g); T.finisher = true; const b = run(s, g); return `${a[0]}% ${a[1].toFixed(2)}R → ${b[0]}% ${b[1].toFixed(2)}R`.padEnd(30); });
  console.log(TL.BRANCH_TREES[branch].name.padEnd(10), cells.join(''));
}
