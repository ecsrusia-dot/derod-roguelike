// 전승 특전(1.288.0) 검증 — SAVE=<백업 JSON> node scripts/sim-chronicle-perk.mjs [N]
// 특전별로 심연 Ⅰ·사냥터 승률 변화와 수치 적용을 확인한다.
import fs from 'fs';
import * as E from '../src/chronicle/engine.js';
import * as A from '../src/chronicle/account.js';
import { CHRONICLE_DUNGEONS, DUNGEON_TIERS, REBIRTH_PERKS } from '../src/chronicle/data.js';
const N = +process.argv[2] || 60;
const raw = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8'));
const acc = raw.acc || raw;
const base = A.toView(acc);
const cid = base.hero;
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const tierIdx = DUNGEON_TIERS.findIndex(t => t.abyss === (+process.env.AB || 2));
const dg = CHRONICLE_DUNGEONS.find(d => d.id === (process.env.DG || 'firstDusk'));
function winRate(save) {
  let w = 0;
  for (let i = 0; i < N; i++) {
    const r = rng(1000 + i * 7919);
    const enc = E.dungeonEncounter({ id: dg.id, tier: tierIdx, floor: dg.floors.length - 1, hp: null }, r);
    const enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const sim = E.simulateChronicleBattle(E.partyCombatants(save), enemies, r);
    if (sim.result === 'win') w++;
  }
  return Math.round(w / N * 100);
}
console.log(`${cid} Lv.${base.units[cid].lv} 전승 ${base.units[cid].rebirth?.count || 0} · ${dg.name} ${DUNGEON_TIERS[tierIdx].label} 보스 ${N}전`);
console.log('특전 없음', winRate(base) + '%', '· 남은 선택', (base.units[cid].rebirth?.count || 0) - (base.units[cid].rebirth?.perks || []).length);
for (const d of REBIRTH_PERKS) {
  let s = E.pickRebirthPerk(base, d.id, cid);
  if (s === base) { console.log(d.name, '선택 불가'); continue; }
  if (d.id === 'talent') s = { ...s, units: { ...s.units, [cid]: E.autoSpendTalents(structuredClone(s.units[cid])) || s.units[cid] } };
  const u = s.units[cid];
  console.log(d.name.padEnd(8), winRate(s) + '%', `sp ${u.sp} · 경험치 ×${E.regrowExpMult({ ...u, lv: 50 })} · 보조3 ${E.famSlotOpen(s, 'sub3')}`);
}
