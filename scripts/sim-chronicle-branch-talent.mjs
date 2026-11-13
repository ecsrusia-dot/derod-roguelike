// 전승 술법사 Lv.100 — 특성 빌드별 무리전 승률·라운드 (갈래 트리 유무 비교)
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import * as A from '../src/chronicle/account.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS } from '../src/chronicle/data.js';
import fs from 'fs';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const acc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const CLS = process.env.CLS || 'sage';
function build(branch, order) {
  let save = A.toView(acc); const cid = save.hero; const u = save.units[cid];
  u.rebirth = { branch, count: 1 }; u.lv = 100; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: 396 } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70; // Lv.100에서 스킬을 다 배우고 남는 포인트 (약 70)
  const trees = TL.talentTrees(cid, branch);
  for (const tid of order) { const tr = trees.find(t => t.id === tid); if (!tr) continue;
    for (let ti = 0; ti < tr.tiers.length; ti++) for (const n of tr.tiers[ti]) while (uu.sp > 0 && TL.canLearnTalent(uu, n.id)) { uu.talents[n.id] = (uu.talents[n.id] || 0) + 1; uu.sp--; } }
  return save;
}
function run(save, gap, boss) {
  const lv = 100 + gap; const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(11); let w = 0, r = 0; const N = 150;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, boss ? null : 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); if (b.result === 'win') w++; r += b.rounds || 0; }
  return `${Math.round(w / N * 100)}% ${(r / N).toFixed(1)}R`;
}
const base = TL.talentTrees(CLS).map(t => t.id);
for (const branch of Object.keys(TL.BRANCH_TREES).filter(b => TL.BRANCH_TREES[b].cls === CLS)) {
  const bt = 'bt_' + branch;
  const builds = { [`기본 ${base[0]}+${base[1]}`]: [base[0], base[1], base[2]], [`기본 ${base[1]}+${base[0]}`]: [base[1], base[0], base[2]], [`기본 ${base[2]}+${base[1]}`]: [base[2], base[1], base[0]],
    [`갈래+${base[0]}`]: [bt, base[0], base[1]], [`갈래+${base[1]}`]: [bt, base[1], base[0]], [`${base[1]}+갈래`]: [base[1], bt, base[0]] };
  console.log('==', TL.BRANCH_TREES[branch].name);
  for (const [name, order] of Object.entries(builds)) { const s = build(branch, order); const d = E.deriveUnit(s, s.hero);
    console.log(name.padEnd(30), '무리 +7', run(s, 7, false).padEnd(11), '+9', run(s, 9, false).padEnd(11), '보스 +5', run(s, 5, true).padEnd(11), `공 ${d.atk} HP ${d.maxHp} 투자 ${TL.talentSpent(s.units[s.hero])}`); }
}
