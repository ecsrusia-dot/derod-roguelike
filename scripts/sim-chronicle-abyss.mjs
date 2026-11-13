// 사용: SAVE=<백업 JSON 경로> node scripts/sim-chronicle-abyss.mjs [회수=30]
// 백업 저장의 현재 캐릭터로 던전 9곳 × (전설 · 심연 Ⅰ~Ⅴ) 클리어율 — 전승 횟수·레벨을 env RB·LV로 바꿔 볼 수 있다
import fs from 'fs';
import * as E from '../src/chronicle/engine.js';
import * as A from '../src/chronicle/account.js';
import { CHRONICLE_DUNGEONS, DUNGEON_TIERS } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = +process.argv[2] || 30;
const raw = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8'));
const save0 = A.toView(raw.acc || raw); const h = save0.hero;
if (process.env.RB) save0.units[h].rebirth = { ...save0.units[h].rebirth, count: +process.env.RB };
if (process.env.LV) { save0.units[h].lv = +process.env.LV; for (const k of Object.keys(save0.fams || {})) save0.fams[k].lv = +process.env.LV; }
const u = save0.units[h]; const d0 = E.deriveUnit(save0, h);
console.log(`${d0.name} Lv.${u.lv} 전승 ${u.rebirth?.count || 0}회 · 공 ${d0.atk} HP ${d0.maxHp}`);
function run(id, tier, rng) {
  let s = structuredClone(save0); s.dungeon = { id, tier, floor: 0, hp: null };
  for (let i = 0; i < 8; i++) { const d = s.dungeon; if (!d) return true; const enc = E.dungeonEncounter(d, rng); enc.enemies = E.scaleEnemiesForRebirth(s, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(s, d.hp), enc.enemies, rng);
    const r = E.applyBattle(s, { kind: 'dungeon', type: enc.type, enemies: enc.enemies }, b, rng); s = r.save; if (b.result !== 'win') return false; if (r.summary.dungeonClear) return true; }
  return false;
}
const tiers = DUNGEON_TIERS.map((t, i) => i).filter(i => i >= 2);
console.log('던전'.padEnd(14), tiers.map(i => DUNGEON_TIERS[i].label.padStart(6)).join(' '));
for (const D of CHRONICLE_DUNGEONS) {
  const rng = mulberry(77);
  console.log(D.name.padEnd(14), tiers.map(i => { let w = 0; for (let k = 0; k < R; k++) if (run(D.id, i, rng)) w++; return (Math.round(w / R * 100) + '%').padStart(6); }).join(' '));
}
