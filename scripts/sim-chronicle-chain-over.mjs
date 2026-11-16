// 사용: [CLS=elf] [LV=100] [GAP=5] [BGAP=3] node scripts/sim-chronicle-chain-over.mjs [전투 수=200]
// 추가 타격 확률 초과분 → 추가 타격 피해 (CHRONICLE_TUNING.chainOverflow) 끔 → 켬 비교
// 갈래별로 장신구에 추가 타격 옵션을 더 얹어 가며(EXTRA) 확률 합계·추가 타격 피해·무리전/보스전 승률·라운드를 본다
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS, CHRONICLE_TUNING as T } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 200;
const LV = +process.env.LV || 100, GAP = +(process.env.GAP ?? 5), BGAP = +(process.env.BGAP ?? 3);
const CLSS = process.env.CLS ? [process.env.CLS] : ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
const EXTRA = [0, 0.3, 0.6, 1.0];
function build(cid, branch, extra) {
  let save = E.newChronicleSave(cid); const u = save.units[cid];
  { const rg = mulberry(5); for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) { const it = E.rollItem(rg, 'epic', LV, slot, 'field', cid); it.uid = save.nextUid++; it.plus = 0; if (slot === 'accessory' && extra) it.opts = [...(it.opts || []), { k: 'chain', v: extra }]; save.inventory.push(it); u.equip[slot] = it.uid; } }
  u.rebirth = { branch, count: 1 }; u.lv = LV; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: LV * 4 - 4 } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70; const trees = TL.talentTrees(cid, branch);
  for (const tr of [trees[trees.length - 1], ...trees]) for (const tier of tr.tiers) for (const n of tier) while (uu.sp > 0 && TL.canLearnTalent(uu, n.id)) { uu.talents[n.id] = (uu.talents[n.id] || 0) + 1; uu.sp--; }
  return save;
}
function run(save, gap, boss) {
  const lv = Math.max(1, LV + gap); const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(11); let w = 0, r = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); if (b.result === 'win') w++; r += b.rounds || 0; }
  return `${String(Math.round(w / N * 100)).padStart(3)}% ${(r / N).toFixed(2)}R`;
}
console.log(`Lv.${LV} · 무리 +${GAP} / 보스 +${BGAP} · ${N}전 — 끔 → 켬`);
for (const cid of CLSS) for (const branch of Object.keys(TL.BRANCH_TREES).filter(b => TL.BRANCH_TREES[b].cls === cid)) for (const ex of EXTRA) {
  const s = build(cid, branch, ex);
  const bd = E.statBreakdown(s, cid, 'chain'); const tot = [...bd.base, ...bd.flat].reduce((a, x) => a + (x.v || 0), 0);
  T.chainOverflow = 1; const pow = E.deriveUnit(s, cid).chainPow || 0.5;
  T.chainOverflow = 0; const a = [run(s, GAP, false), run(s, BGAP, true)];
  T.chainOverflow = 1; const b = [run(s, GAP, false), run(s, BGAP, true)];
  console.log(TL.BRANCH_TREES[branch].name.padEnd(8), `확률 합 ${String(Math.round(tot * 100)).padStart(3)}%`, `피해 ${Math.round(pow * 100)}%`.padEnd(9), `무리 ${a[0]} → ${b[0]}`.padEnd(30), `보스 ${a[1]} → ${b[1]}`);
}
