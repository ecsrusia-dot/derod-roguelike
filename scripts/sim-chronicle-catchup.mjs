// 전승 따라잡기 — SAVE=<백업 JSON> [RB=3] HPX=12 ATKX=0.3 node scripts/sim-chronicle-catchup.mjs [N=40]
// 전승 RB회 만렙 캐릭터와 전승 RB+1회 캐릭터(레벨별)를 같은 장비(레벨 = 직전 만렙)로 비교한다.
import * as E from '../src/chronicle/engine.js';
import { rebirthLevelCap } from '../src/chronicle/data.js';
import { build, run, PM_SK, PM_T, cid } from './sim-chronicle-rotation.mjs';
const N = +process.argv[2] || 40;
const RB = +process.env.RB || 3;
const cap = rebirthLevelCap(RB);
const TRIM = ['st_w8', 'st_w9', 'st_w7', 'st_w5', 'st_w4', 'st_w3', 'st_w2', 'st_f6', 'st_f3', 'ba_s5', 'ba_s6', 'ba_s3', 'st_a6', 'st_a5', 'st_a4', 'st_a3', 'st_a2', 'st_a1'];
function talentsFor(lv) { // 스킬 포인트 = 레벨 + 2 (특전), 스킬 35점 뒤 나머지를 특성에
  const t = { ...PM_T }; let over = Object.values(t).reduce((a, b) => a + b, 0) - Math.max(0, lv + 2 - 35);
  for (const k of TRIM) { while (over > 0 && t[k] > 0) { t[k]--; over--; } }
  if (over > 0) return {}; return t; }
function mk(rb, lv) { const s = build({ lv, rb, skills: PM_SK, talents: talentsFor(lv) });
  for (const it of s.inventory) if (Object.values(s.units[cid].equip).includes(it.uid)) it.ilv = cap; return s; }
const row = (name, s) => { const d = E.deriveUnit(s, cid); const p = run(s, false, N), b = run(s, true, N);
  console.log(name.padEnd(22), `공 ${String(d.atk).padStart(5)} HP ${String(d.maxHp).padStart(5)} 방 ${String(d.def).padStart(4)} · 무리 라운드당 ${String(p.dpr).padStart(7)} · 보스 ${String(b.dpr).padStart(7)}`); return { d, p, b }; };
const ref = row(`전승 ${RB} Lv.${cap}`, mk(RB, cap));
for (let lv = cap - 40; lv <= cap + 10; lv += 5) { const r = row(`전승 ${RB + 1} Lv.${lv}`, mk(RB + 1, lv));
  console.log('   →', `공 ${Math.round(r.d.atk / ref.d.atk * 100)}% · HP ${Math.round(r.d.maxHp / ref.d.maxHp * 100)}% · 무리 피해 ${Math.round(r.p.dpr / ref.p.dpr * 100)}% · 보스 피해 ${Math.round(r.b.dpr / ref.b.dpr * 100)}%`); }
