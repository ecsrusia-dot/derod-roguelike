// 황혼 연대기 사역마 고유 스킬 비교 (1.218.0) — 먼저 node scripts/sim-chronicle-dungeon.mjs snap
// 사용: G=indigo P=5 D=sanctumVault R=40 A=T1,H1 node scripts/sim-chronicle-fam-sig.mjs
import fs from 'fs'; import os from 'os';
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_CLASSES } from '../src/chronicle/data.js';
import { ENEMIES } from '../src/data/enemies.js';
import { FAM_SIGS, famSignatureId, famRole } from '../src/chronicle/familiar.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const snaps = JSON.parse(fs.readFileSync(os.tmpdir() + '/snaps.json', 'utf8'));
const G = process.env.G || 'indigo', P = +(process.env.P ?? 5), R = +(process.env.R || 40), did = process.env.D || 'sanctumVault';
const keys = Object.keys(ENEMIES).filter(k => ENEMIES[k].name);
const byArch = {}; for (const k of keys) { const a = famSignatureId(k); if (!byArch[a]) byArch[a] = k; }
function run(save, id, tier, rng) { let s = structuredClone(save); s.dungeon = { id, tier, floor: 0, hp: null };
  for (let i = 0; i < 8; i++) { const d = s.dungeon; if (!d) return false; const enc = E.dungeonEncounter(d, rng); const p = E.partyCombatants(s, d.hp); const b = E.simulateChronicleBattle(p, (enc.enemies = E.scaleEnemiesForRebirth(s, enc.enemies)), rng);
    const r = E.applyBattle(s, { kind: 'dungeon', type: enc.type, enemies: enc.enemies }, b, rng); s = r.save; if (b.result !== 'win') return false; if (r.summary.dungeonClear) return true; } return false; }
const archs = (process.env.A || Object.keys(FAM_SIGS).join(',')).split(',');
console.log(`${did} ${G}+${P} 영웅/전설 ${R}회`);
console.log('고유'.padEnd(18) + CHRONICLE_CLASSES.map(c => c.name.slice(0, 4).padEnd(9)).join(''));
for (const a of archs) {
  const k = byArch[a]; if (!k) { console.log(a, '키 없음'); continue; }
  const row = CHRONICLE_CLASSES.map(c => { const s0 = snaps[c.id + '|' + did]; if (!s0) return '-'.padEnd(9);
    const s = structuredClone(s0); s.fams = { [k]: { grade: G, plus: P } }; s.famTeam = { main: k }; const rng = mulberry(11);
    return [1, 2].map(t => { let w = 0; for (let i = 0; i < R; i++) if (run(s, did, t, rng)) w++; return Math.round(w / R * 100); }).join('/').padEnd(9); });
  console.log(`${a} ${FAM_SIGS[a].type}`.padEnd(18) + row.join(''));
}
