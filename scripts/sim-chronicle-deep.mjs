// 사용: [CLS=sage] [G=indigo] [P=5] node scripts/sim-chronicle-deep.mjs [전투 수=60]
// 심층 구간 점검 (1.294.0) — 전승 n회 캐릭터가 Lv.120 이후 10레벨을 올리는 데 걸리는 전투 수와 승률.
// 각 레벨대에서 「내 레벨 이하 최고 스테이지」를 사냥한다고 보고 전투당 경험치 ÷ 필요 경험치로 환산한다.
import * as E from '../src/chronicle/engine.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_SKILLS, CHRONICLE_FIELDS, REBIRTH_BRANCHES, expNeedFor, rebirthLevelCap, fieldStages } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 60; const G = process.env.G || 'indigo'; const P = +(process.env.P ?? 5);
const all = { bossCleared: Object.fromEntries(CHRONICLE_FIELDS.map(f => [f.id, true])), dungeonTier: {}, stages: Object.fromEntries(CHRONICLE_FIELDS.map(f => [f.id, { cleared: 6, kills: [99, 99, 99, 99, 99, 99] }])) };
function build(cid, branch, count, lv) {
  let save = E.newChronicleSave(cid); const u = save.units[cid]; const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) { const it = E.rollItem(rg, count >= 2 ? 'mythic' : 'epic', lv, slot, 'field', cid); it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid; }
  u.rebirth = { branch, count, perks: [] }; u.lv = lv; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: (lv - 1) * 4 } } }, cid);
  const uu = save.units[cid]; for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = lv - 30; save = E.autoSpendTalents(save, cid);
  const fk = F.famPool(all)[G].find(k => F.famRole(k) === 'tank') || F.famPool(all)[G][0];
  save.fams = { [fk]: { grade: G, plus: P, lv, exp: 0, base: G } }; save.famTeam = { main: fk, sub1: null, sub2: null };
  save.progress = { ...save.progress, ...all };
  return save;
}
function bestStage(lv, count) {
  let best = null;
  for (const f of CHRONICLE_FIELDS) { if ((f.reqRebirth || 0) > count) continue; fieldStages(f).forEach((st, i) => { if (st.lv <= lv && (!best || st.lv > best.lv)) best = { f, i, lv: st.lv }; }); }
  return best;
}
const classes = process.env.CLS ? [process.env.CLS] : ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
console.log(`심층 구간 · 동행 ${G}+${P} 수호 · 장비 +7 (전승 2회부터 전승 등급) · ${N}전씩`);
for (const cid of classes) {
  const br = Object.values(REBIRTH_BRANCHES).find(b => b.cls === cid).id;
  const out = [];
  for (let count = 1; count <= 5; count++) {
    const cap = rebirthLevelCap(count); let total = 0; const wins = [];
    for (let lv = cap - (count === 1 ? 20 : 10); lv < cap; lv += 5) {
      const save = build(cid, br, count, lv); const t = bestStage(lv, count); const rng = mulberry(100 + lv);
      let exp = 0, w = 0;
      for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(t.f, rng, false, null, t.i); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
        const sim = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); const r = E.applyBattle(save, { kind: 'field', fieldId: t.f.id, type: enc.type, enemies: enc.enemies, stage: enc.stage }, sim, rng);
        if (sim.result === 'win') { w++; exp += r.summary.exp || 0; } }
      let need = 0; for (let l = lv; l < lv + 5; l++) need += expNeedFor({ lv: l, rebirth: { count } });
      total += exp > 0 ? need / (exp / N) : Infinity; wins.push(Math.round(w / N * 100));
    }
    out.push(`전승${count} Lv.${cap - (count === 1 ? 20 : 10)}→${cap}: ${isFinite(total) ? Math.round(total) : '∞'}전 (승률 ${wins.join('/')}%)`);
  }
  console.log(cid.padEnd(11), out.join(' | '));
}
