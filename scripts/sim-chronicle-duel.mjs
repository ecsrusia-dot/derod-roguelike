// 사용: [HP=체력 배율] [FAM=tank|healer|dps|none] [LV=100] node scripts/sim-chronicle-duel.mjs [판 수=60]
// 결투 시험 — 10갈래 Lv.100 (에픽 +7 4부위 · 갈래 특성 우선) 끼리 1:1. 양쪽 자리를 바꿔 가며 붙인다.
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_SKILLS, REBIRTH_BRANCHES, CHRONICLE_FIELDS } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 60;
const HP = +process.env.HP || 1;
const FAM = process.env.FAM || 'none';
const LV = +process.env.LV || 100;
const FAM_KEYS = { tank: null, healer: null, dps: null };
function build(cid, branch) {
  let save = E.newChronicleSave(cid); const u = save.units[cid];
  const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) { const it = E.rollItem(rg, 'epic', LV, slot, 'field', cid); it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid; }
  u.rebirth = { branch, count: 1 }; u.lv = LV; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: (LV - 1) * 4 } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70;
  const trees = TL.talentTrees(cid, branch); const order = ['bt_' + branch, ...TL.talentTrees(cid).map(t => t.id)];
  for (const tid of order) { const tr = trees.find(t => t.id === tid); if (!tr) continue;
    for (const tier of tr.tiers) for (const n of tier) while (uu.sp > 0 && TL.canLearnTalent(uu, n.id)) { uu.talents[n.id] = (uu.talents[n.id] || 0) + 1; uu.sp--; } }
  if (FAM !== 'none') {
    const key = CHRONICLE_FIELDS.filter(f => !f.part).map(f => f.boss).find(k => F.famRole(k) === FAM) || CHRONICLE_FIELDS.flatMap(f => f.elites).find(k => F.famRole(k) === FAM);
    if (key) { save.fams = { [key]: { grade: 'indigo', plus: 5, lv: LV, exp: 0, base: 'indigo' } }; save.famTeam = { main: key, sub1: null, sub2: null }; }
  }
  return save;
}
const side = (save, enemy) => E.partyCombatants(save).map(u => {
  const o = { ...u, maxHp: Math.round(u.maxHp * HP), hp: Math.round(u.maxHp * HP) };
  return enemy ? { ...o, id: 'r_' + o.id, side: 'enemy', pvp: true } : o;
});
const list = Object.entries(REBIRTH_BRANCHES).map(([id, b]) => ({ cid: b.cls, id, name: b.name }));
const chars = list.map(b => ({ ...b, save: build(b.cid, b.id) }));
const win = chars.map(() => chars.map(() => 0)); let rounds = 0, games = 0, draws = 0;
for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) {
  const rng = mulberry(1000 + i * 31 + j);
  for (let n = 0; n < N; n++) {
    const swap = n % 2 === 1; const a = swap ? chars[j] : chars[i], b = swap ? chars[i] : chars[j];
    const sim = E.simulateChronicleBattle(side(a.save, false), side(b.save, true), rng);
    rounds += sim.rounds; games++;
    let aw = sim.result === 'win' ? 1 : sim.result === 'lose' ? 0 : 0.5; if (sim.result === 'draw') draws++;
    const iw = swap ? 1 - aw : aw; win[i][j] += iw; win[j][i] += 1 - iw;
  }
}
console.log(`체력 ×${HP} · 동행 ${FAM} · Lv.${LV} · 상대당 ${N}판 · 평균 ${(rounds / games).toFixed(1)}라운드 · 무승부 ${Math.round(draws / games * 100)}%`);
const pad = (s, n) => { let w = 0; for (const c of String(s)) w += c.charCodeAt(0) > 255 ? 2 : 1; return String(s) + ' '.repeat(Math.max(0, n - w)); };
console.log(pad('', 12) + chars.map(c => pad(c.name.slice(0, 3), 7)).join('') + '평균');
chars.forEach((c, i) => {
  const row = chars.map((_, j) => (i === j ? pad('-', 7) : pad(Math.round(win[i][j] / N * 100), 7))).join('');
  const d = E.deriveUnit(c.save, c.cid);
  console.log(pad(c.name, 12) + row + Math.round(win[i].reduce((s, v) => s + v, 0) / (N * (chars.length - 1)) * 100) + `%  (공 ${d.atk} · HP ${d.maxHp})`);
});
