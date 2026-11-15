// 방어 관통 효율 · 유니크 vs 전승 장비 (1.300.0 진단)
//   [N=120] node scripts/sim-chronicle-pen-mythic.mjs
// ① 관통: Lv.100 전승 · 에픽+7 4부위 — 지금 관통 수치 / 관통을 0·+20%p로 바꿨을 때 / 같은 조건에 공격력 +20%
// ② 장비: 한 부위를 유니크(+7)·전승 무작위 옵션(+7)·전승 맞춤 옵션(+7)으로 바꿨을 때 승률·라운드
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS, UNIQUE_ITEMS, REBIRTH_BRANCHES, OPTION_DEFS, GRADES } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.env.N || 120;
// 직업별 「원하는 대로 맞춘」 전승 옵션 4줄 (그 직업 풀에서 공격에 좋은 것 · 최고치)
const BEST = {
  wanderer: ['atkPct', 'counterPct', 'counterDmg', 'dmgReduce'], sage: ['skillDmg', 'atkPct', 'critDmg', 'dotDmg'],
  demonblood: ['atkPct', 'lifesteal', 'lowHpDmg', 'hpPct'], elf: ['crit', 'chain', 'critDmg', 'dodge'], priest: ['holyDmg', 'healPct', 'dmgReduce', 'hpPct'],
  common: ['atkPct', 'critDmg', 'hpPct', 'chain'],
};
const mythOpt = GRADES.find(g => g.id === 'mythic').optMult;
function build(cls, branch, swap) {
  let save = E.newChronicleSave(cls); const u = save.units[cls]; const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) {
    let it = E.makeItem(rg, { cls: slot === 'accessory' ? 'common' : cls, slot, grade: 'epic', ilv: 100 });
    if (swap && swap.slot === slot) {
      if (swap.named) { it = E.makeItem(mulberry(9), { named: swap.named, ilv: 100 });
        if (swap.tuned) { const uq = GRADES.find(g => g.id === 'unique').optMult; const have = new Set(it.opts.map(o => o.k));
          for (const k of BEST[UNIQUE_ITEMS[swap.named].cls]) { if (it.opts.length >= 4) break; if (!have.has(k)) it.opts.push({ k, v: +(OPTION_DEFS[k].v[1] * uq).toFixed(3) }); } } }
      else { it = E.makeItem(mulberry(9), { cls: it.cls, slot, grade: 'mythic', ilv: 100 });
        if (swap.tuned) it.opts = BEST[it.cls].map(k => ({ k, v: +(OPTION_DEFS[k].v[1] * mythOpt).toFixed(3) })); }
    }
    it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid;
  }
  u.rebirth = { branch, count: 1 }; u.lv = 100; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cls]: { ...u, points: 396 } } }, cls);
  const uu = save.units[cls];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cls && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70; E.autoSpendTalents(uu);
  return save;
}
function run(save, gap, boss, tweak) {
  const lv = 100 + gap; const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(11); let w = 0, r = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, boss ? null : 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const party = E.partyCombatants(save).map(p => (tweak && !p.fam ? tweak({ ...p }) : p));
    const b = E.simulateChronicleBattle(party, enc.enemies, rng); if (b.result === 'win') w++; r += b.rounds || 0; }
  return { w: Math.round(w / N * 100), r: +(r / N).toFixed(1) };
}
const fmt = (x) => `${String(x.w).padStart(3)}% ${x.r.toFixed(1)}R`;
const branches = Object.entries(REBIRTH_BRANCHES);
if (!process.env.PART || process.env.PART === '1') {
  console.log('=== ① 방어 관통 (Lv.100 · 무리 +7 / 보스 +5)');
  for (const [bid, br] of branches) {
    const s = build(br.cls, bid, null); const pen = E.deriveUnit(s, br.cls).armorPen;
    const t = (fn) => `${fmt(run(s, 7, false, fn))} | ${fmt(run(s, 5, true, fn))}`;
    console.log(`${br.name.padEnd(6)} 관통 ${(pen * 100).toFixed(0).padStart(2)}% | 지금 ${t(null)} | 관통 0 ${t(p => { p.armorPen = 0; return p; })} | 관통 +20%p ${t(p => { p.armorPen = Math.min(0.8, p.armorPen + 0.2); return p; })} | 공격 +20% ${t(p => { p.atk = Math.round(p.atk * 1.2); return p; })}`);
  }
}
if (!process.env.PART || process.env.PART === '2') {
  console.log('\n=== ② 한 부위 교체 (무리 +7 | 보스 +5) — 에픽 기준 / 유니크 / 전승 무작위 / 전승 맞춤');
  for (const [bid, br] of branches) {
    const cell = (sw) => { const s = build(br.cls, bid, sw); return `${fmt(run(s, 7, false))} | ${fmt(run(s, 5, true))}`; };
    console.log(`== ${br.name}  에픽 기준 ${cell(null)}`);
    for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) {
      const us = Object.values(UNIQUE_ITEMS).filter(u => !u.disabled && u.slot === slot && (u.cls === br.cls || (slot === 'accessory' && u.cls === 'common')) && (!u.branch || u.branch === bid));
      console.log(`  [${slot}] 전승 무작위 ${cell({ slot })} · 전승 맞춤 ${cell({ slot, tuned: true })}`);
      for (const u of us) console.log(`     ${u.branch ? '✦' : ' '}${u.name.padEnd(12)} ${cell({ slot, named: u.id })} · 자유 2줄 맞춤 ${cell({ slot, named: u.id, tuned: true })}`);
    }
  }
}
