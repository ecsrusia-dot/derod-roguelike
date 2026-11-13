// 사용: CLS=sage node scripts/sim-chronicle-unique.mjs [전투 수=150]
// 전승 캐릭터 Lv.100 (에픽 +7 4부위 · 특성 자동) — 한 부위를 유니크(+7)로 바꿨을 때 승률·라운드 (에픽 기준 대비)
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS, UNIQUE_ITEMS, REBIRTH_BRANCHES } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 150;
const CLS = process.env.CLS || 'sage';
function build(branch, named) {
  let save = E.newChronicleSave(CLS); const cid = CLS; const u = save.units[cid];
  const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) {
    let it = E.makeItem(rg, { cls: cid, slot, grade: 'epic', ilv: 100 });
    if (named && UNIQUE_ITEMS[named].slot === slot) it = E.makeItem(mulberry(9), { named, ilv: 100 });
    it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid;
  }
  u.rebirth = { branch, count: 1 }; u.lv = 100; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: 396 } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70;
  E.autoSpendTalents(uu);
  return save;
}
function run(save, gap, boss) {
  const lv = 100 + gap; const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(11); let w = 0, r = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, boss ? null : 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); if (b.result === 'win') w++; r += b.rounds || 0; }
  return `${String(Math.round(w / N * 100)).padStart(3)}% ${(r / N).toFixed(1)}R`;
}
for (const [branch, br] of Object.entries(REBIRTH_BRANCHES).filter(([, b]) => b.cls === CLS)) {
  console.log('==', br.name);
  const row = (label, named) => { const s = build(branch, named); console.log(label.padEnd(26), '무리 +5', run(s, 5, false), ' +7', run(s, 7, false), ' 보스 +3', run(s, 3, true), ' 보스 +5', run(s, 5, true)); };
  row('에픽 4부위 (기준)', null);
  for (const u of Object.values(UNIQUE_ITEMS)) if (u.cls === CLS && !u.disabled && (!u.branch || u.branch === branch)) row(`${u.branch ? '✦' : ' '}${u.name} (${u.slot})`, u.id);
}
