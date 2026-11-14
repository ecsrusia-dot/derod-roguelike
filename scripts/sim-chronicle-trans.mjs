// 자령 초월(1.290.0) 검증 — SAVE=<백업 JSON> [AB=2 DG=firstDusk] node scripts/sim-chronicle-trans.mjs [N]
// 동행 자령의 초월 단계별로 심연 보스 승률을 잰다. 밸런스는 familiar.js FAM_TRANS.
import fs from 'fs';
import * as E from '../src/chronicle/engine.js';
import * as A from '../src/chronicle/account.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_DUNGEONS, DUNGEON_TIERS } from '../src/chronicle/data.js';
const N = +process.argv[2] || 80;
const raw = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8'));
const base = A.toView(raw.acc || raw);
const key = base.famTeam?.main;
const rng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const tierIdx = DUNGEON_TIERS.findIndex(t => t.abyss === (+process.env.AB || 2));
const dg = CHRONICLE_DUNGEONS.find(d => d.id === (process.env.DG || 'firstDusk'));
console.log(`동행 ${F.famName(key)} · ${dg.name} ${DUNGEON_TIERS[tierIdx].label} 보스 ${N}전`);
for (const t of [0, 1, 3, 5]) {
  const save = { ...base, fams: { ...base.fams, [key]: { ...base.fams[key], grade: 'violet', base: 'violet', plus: 10, trans: t } } };
  let w = 0;
  for (let i = 0; i < N; i++) {
    const r = rng(1000 + i * 7919);
    const enc = E.dungeonEncounter({ id: dg.id, tier: tierIdx, floor: dg.floors.length - 1, hp: null }, r);
    const sim = E.simulateChronicleBattle(E.partyCombatants(save), E.scaleEnemiesForRebirth(save, enc.enemies), r);
    if (sim.result === 'win') w++;
  }
  const st = F.famStats(key, save.fams[key], save.units[save.hero].lv);
  console.log(`초월 ${t}: 승률 ${Math.round(w / N * 100)}% · HP ${st.maxHp} 공 ${st.atk}${F.famHasTransSkill(save.fams[key]) ? ' · 초월 스킬' : ''}`);
}
