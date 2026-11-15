// 딜 사이클 점검 — SAVE=<백업 JSON> [LV=137 RB=3 GAP=5 BGAP=3] node scripts/sim-chronicle-rotation.mjs [N=200]
// 백업의 술법사(대마도사) 장비·사역마를 그대로 쓰고, 레벨·전승·스킬·특성만 바꿔 빌드별 사용 스킬·피해 비중·승률을 본다.
import fs from 'fs';
import * as E from '../src/chronicle/engine.js';
import * as A from '../src/chronicle/account.js';
import * as TL from '../src/chronicle/talents.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS, CHRONICLE_CLASSES, CHRONICLE_TUNING as T } from '../src/chronicle/data.js';
const N = +process.argv[2] || 200;
const LV = +process.env.LV || 137, RB = +process.env.RB || 3, GAP = +(process.env.GAP ?? 5), BGAP = +(process.env.BGAP ?? 3);
const raw = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8'));
const base = A.toView(raw.acc || raw);
const cid = 'sage';
const HPX = +process.env.HPX || 1, ATKX = +(process.env.ATKX ?? 1); // 긴 전투로 사이클을 보려면 HPX=20 ATKX=0.3
const rngOf = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const cls = CHRONICLE_CLASSES.find(c => c.id === cid) || {};
const BASE = { str: 2, int: 10, agi: 4, vit: 6 };
// PM 배분: 지능·민첩 상한, 나머지 힘:체력 3:2
function stats(lv) { const cap = Math.floor(lv * T.stat.softPerLv); let pts = 4 * (lv - 1); const s = { ...BASE };
  for (const k of ['int', 'agi']) { const add = Math.max(0, Math.min(pts, cap - s[k])); s[k] += add; pts -= add; }
  const st = Math.round(pts * 0.6); s.str += st; s.vit += pts - st; return s; }
export function build({ lv = LV, rb = RB, skills, talents, fam }) {
  const save = structuredClone(base); save.hero = cid; const u = save.units[cid];
  u.lv = lv; u.rebirth = { branch: 's_arch', count: rb, perks: [] }; u.stats = stats(lv); u.points = 0; u.sp = 0;
  u.skills = { ...skills }; u.talents = { ...talents };
  if (fam !== undefined) save.famTeam = { ...save.famTeam, main: fam };
  for (const f of Object.values(save.fams || {})) f.lv = lv;
  return save;
}
function run(save, boss, n = N) {
  const gap = boss ? BGAP : GAP; const lv = LV + gap; const f = { ...CHRONICLE_FIELDS[11], lv: [lv, lv], bossLv: lv };
  let w = 0, rounds = 0; const use = {}, dmg = {}; let basic = 0, basicDmg = 0, total = 0, first = null;
  for (let i = 0; i < n; i++) { const rng = rngOf(77 + i * 7919);
    const enc = E.rollFieldEncounter(f, rng, boss, null, boss ? null : 0); const en = E.scaleEnemiesForRebirth(save, enc.enemies).map(e => ({ ...e, hp: Math.round(e.hp * HPX), maxHp: Math.round(e.maxHp * HPX), atk: Math.round(e.atk * ATKX) }));
    const party = E.partyCombatants(save); const sim = E.simulateChronicleBattle(party, en, rng);
    if (sim.result === 'win') w++; rounds += sim.rounds || 0;
    const d = E.battleDetailStats(sim, party); const hu = d.units[cid] || {};
    basic += hu.basicUses || 0; total += hu.dmg || 0;
    for (const [k, v] of Object.entries(d.skills)) { const [id, name] = k.split('|'); if (id !== cid) continue; use[name] = (use[name] || 0) + v.uses; dmg[name] = (dmg[name] || 0) + v.dmg; }
    if (!first) first = sim.events.filter(e => e.a === cid && e.k !== 'pre' && e.k !== 'open').map(e => e.n).slice(0, 16).join(' → ');
  }
  const sk = Object.keys(use).sort((a, b) => dmg[b] - dmg[a]).map(k => `${k} ${(use[k] / n).toFixed(1)}회·${Math.round(dmg[k] / total * 100)}%`).join(' / ');
  const sd = Object.values(dmg).reduce((a, b) => a + b, 0);
  return { win: Math.round(w / n * 100), r: (rounds / n).toFixed(1), sk, basic: (basic / n).toFixed(1), basicPct: Math.round((total - sd) / total * 100), first, dpr: Math.round(total / rounds) };
}
const PM_SK = { sa_storm: 5, s_amplify: 5, sa_mind: 5, s_meteor: 5, sa_rain: 5, s_surge: 5, s_starfall: 5 };
const PM_T = { st_f1: 5, st_f3: 5, st_f6: 5, st_f7: 1,
  st_a1: 5, st_a2: 5, st_a3: 5, st_a4: 5, st_a5: 5, st_a6: 5, st_a7: 1, st_a8: 3, st_a9: 1,
  st_w2: 5, st_w3: 1, st_w4: 5, st_w5: 5, st_w7: 3, st_w8: 1, st_w9: 1,
  ba_s1: 5, ba_s2: 5, ba_s3: 5, ba_s4: 5, ba_s5: 2, ba_s6: 5, ba_s7: 1, ba_s8: 3, ba_s9: 1 };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const VAR = JSON.parse(process.env.VAR || 'null');
const FB = { s_fireball: 5, ...PM_SK };
const noFlame = Object.fromEntries(Object.entries(PM_T).filter(([k]) => !k.startsWith('st_f')));
const variants = VAR || {
  'PM 현재': { skills: PM_SK, talents: PM_T },
  'PM + 화염구 5 (포인트 추가 가정)': { skills: FB, talents: PM_T },
  '새 규칙 · PM 현재': { skills: PM_SK, talents: PM_T, rot: 1 },
  '새 규칙 · + 화염구 5': { skills: FB, talents: PM_T, rot: 1 },
  '새 규칙 · 겁화 16점 → 과부하 3·단단한 정신 5·결계 갑옷 4·마력 순환 4': { skills: PM_SK, talents: { ...noFlame, ba_s5: 5, st_w1: 5, st_w3: 5, st_w6: 4 }, rot: 1 },
};
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Lv.${LV} 전승 ${RB} · 무리 +${GAP} / 보스 +${BGAP} · ${N}전`);
  for (const [name, v] of Object.entries(variants)) {
    const s = build(v); const d = E.deriveUnit(s, cid);
    console.log(`\n== ${name} (스킬 ${sum(v.skills)} + 특성 ${sum(v.talents)} = ${sum(v.skills) + sum(v.talents)}점) 공 ${d.atk} HP ${d.maxHp} 스킬피해 +${Math.round((d.skillDmg || 0) * 100)}% 쿨감 ${d.cdr}`);
    for (const boss of [false, true]) { const r = run(s, boss);
      console.log(` ${boss ? '보스' : '무리'}: 승 ${r.win}% · ${r.r}R · 라운드당 피해 ${r.dpr} · 기본 공격 ${r.basic}회(피해 ${r.basicPct}%)\n   ${r.sk}\n   순서: ${r.first}`); }
  }
}
export { run, PM_SK, PM_T, cid };
