// 사용: [LV=80] [PG=5] [BG=3] node scripts/sim-chronicle-classreso.mjs [전투 수=150]
// 직업 공명 점검 — 직업 5 × 역할 3 × 등급(청령·남령): 공명 끔 → 켬의 효율(100라운드당 승리 ×10)과 승률.
// 등급이 오를수록 공명 이득이 커지는지, 한 직업만 과하게 이득을 보지 않는지 본다.
import * as E from '../src/chronicle/engine.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_SKILLS, CHRONICLE_FIELDS } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 150, LV = +process.env.LV || 80, PG = +(process.env.PG ?? 5), BG = +(process.env.BG ?? 3);
const keys = new Set(); for (const f of CHRONICLE_FIELDS) { for (const k of f.elites || []) keys.add(k); keys.add(f.boss); }
const pick = (cls, role, nat) => [...keys].find(k => F.famResoClass(k) === cls && F.famRole(k) === role && F.famNaturalGrade(k) === nat) || [...keys].find(k => F.famResoClass(k) === cls && F.famRole(k) === role);
function build(cid, famKey, grade) {
  let save = E.newChronicleSave(cid); const u = save.units[cid]; const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) { const it = E.rollItem(rg, 'epic', LV, slot, 'field', cid); it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid; }
  u.lv = LV; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: (LV - 1) * 4 } } }, cid);
  const uu = save.units[cid]; for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && !s.branch) uu.skills[s.id] = 5;
  uu.sp = LV - 30; save = E.autoSpendTalents ? E.autoSpendTalents(save, cid) : save;
  save.fams = { [famKey]: { grade, plus: 0, lv: LV, exp: 0, base: F.famNaturalGrade(famKey) } }; save.famTeam = { main: famKey, sub1: null, sub2: null };
  return save;
}
function run(save, gap, boss, seed) {
  const lv = LV + gap; const f = { ...CHRONICLE_FIELDS[6], lv: [lv, lv], bossLv: lv }; const rng = mulberry(seed); let w = 0, rd = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, boss ? null : 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); if (b.result === 'win') { w++; rd += b.rounds; } else rd += 50; }
  return { w: w / N, eff: w / rd * 1000 };
}
const sc = (s) => { const a = run(s, PG, false, 11), c = run(s, BG, true, 23); return { w: Math.round((a.w + c.w) * 50), e: Math.round((a.eff + c.eff) / 2) }; };
const T0 = { ...F.CLASS_RESO_TIER };
console.log(`Lv.${LV} · 강화 +0 · 무리 +${PG} / 보스 +${BG} · 효율(승률%) 끔 → 켬`);
const gain = { blue: [], indigo: [] };
for (const cls of F.CLASS_RESO_ORDER) for (const role of ['tank', 'healer', 'dps']) {
  const out = [];
  for (const grade of ['blue', 'indigo']) {
    const k = pick(cls, role, grade); if (!k) { out.push(`${grade} -`); continue; }
    const s = build(cls, k, grade);
    for (const g of Object.keys(F.CLASS_RESO_TIER)) F.CLASS_RESO_TIER[g] = 0; const off = sc(s);
    Object.assign(F.CLASS_RESO_TIER, T0); const on = sc(s);
    gain[grade].push(on.e / Math.max(1, off.e) - 1);
    out.push(`${grade === 'blue' ? '청령' : '남령'} ${off.e}(${off.w}%) → ${on.e}(${on.w}%) ${on.e >= off.e ? '+' : ''}${Math.round((on.e / Math.max(1, off.e) - 1) * 100)}%`);
  }
  console.log(`${cls.padEnd(11)} ${role.padEnd(7)} ${out.join('  |  ')}`);
}
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100);
console.log(`평균 효율 이득: 청령 +${avg(gain.blue)}% · 남령 +${avg(gain.indigo)}%`);
