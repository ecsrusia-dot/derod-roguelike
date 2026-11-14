// 사용: [MODE=branch|class] [LV=100] [FAMS=none,tank,healer,dps] [CAL=반복 수] node scripts/sim-chronicle-duel.mjs [판 수=20]
// 결투 시험 — 같은 레벨(에픽 +7 4부위)끼리 총당. MODE=branch: 전승 10갈래 / class: 전승 전 5직업.
// CAL을 주면 평균 승률이 50%에 모이도록 DUEL.mult를 반복 조정해 마지막에 출력한다 (data.js에 붙여 넣는다).
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_SKILLS, REBIRTH_BRANCHES, CHRONICLE_FIELDS, CHRONICLE_CLASSES, DUEL } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 20;
const MODE = process.env.MODE || 'branch';
const LV = +process.env.LV || (MODE === 'branch' ? 100 : 80);
const FAMS = (process.env.FAMS || 'none,tank,healer,dps').split(',');
const CAL = +process.env.CAL || 0;
const famKey = (role) => CHRONICLE_FIELDS.filter(f => !f.part).map(f => f.boss).find(k => F.famRole(k) === role) || CHRONICLE_FIELDS.flatMap(f => f.elites).find(k => F.famRole(k) === role);
function build(cid, branch, fam) {
  let save = E.newChronicleSave(cid); const u = save.units[cid];
  const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) { const it = E.rollItem(rg, 'epic', LV, slot, 'field', cid); it.uid = save.nextUid++; it.plus = 7; save.inventory.push(it); u.equip[slot] = it.uid; }
  if (branch) u.rebirth = { branch, count: 1 };
  u.lv = LV; u.talents = {}; u.skills = {}; u.points = 0;
  save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: (LV - 1) * 4 } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch) && (s.reqLv || 1) <= LV) uu.skills[s.id] = 5;
  uu.sp = Math.max(0, LV - 30);
  const trees = TL.talentTrees(cid, branch); const order = [...(branch ? ['bt_' + branch] : []), ...TL.talentTrees(cid).map(t => t.id)];
  for (const tid of order) { const tr = trees.find(t => t.id === tid); if (!tr) continue;
    for (const tier of tr.tiers) for (const n of tier) while (uu.sp > 0 && TL.canLearnTalent(uu, n.id)) { uu.talents[n.id] = (uu.talents[n.id] || 0) + 1; uu.sp--; } }
  if (fam !== 'none') { const key = famKey(fam); save.fams = { [key]: { grade: 'indigo', plus: 5, lv: LV, exp: 0, base: 'indigo' } }; save.famTeam = { main: key, sub1: null, sub2: null }; }
  return save;
}
const list = MODE === 'branch' ? Object.entries(REBIRTH_BRANCHES).map(([id, b]) => ({ cid: b.cls, id, name: b.name, branch: id }))
  : Object.values(CHRONICLE_CLASSES).map(c => ({ cid: c.id, id: c.id, name: c.name, branch: null }));
const chars = list.map(b => ({ ...b, saves: Object.fromEntries(FAMS.map(f => [f, build(b.cid, b.branch, f)])) }));
function roundRobin() {
  const win = chars.map(() => chars.map(() => 0)); let rounds = 0, games = 0, draws = 0;
  for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) {
    const rng = mulberry(1000 + i * 31 + j);
    for (const fam of FAMS) for (let n = 0; n < N; n++) {
      const swap = n % 2 === 1; const a = swap ? chars[j] : chars[i], b = swap ? chars[i] : chars[j];
      const sim = E.simulateChronicleBattle(E.duelSide(a.saves[fam], false), E.duelSide(b.saves[fam], true), rng);
      rounds += sim.rounds; games++;
      const aw = sim.result === 'win' ? 1 : sim.result === 'lose' ? 0 : 0.5; if (sim.result === 'draw') draws++;
      const iw = swap ? 1 - aw : aw; win[i][j] += iw; win[j][i] += 1 - iw;
    }
  }
  const per = N * FAMS.length;
  return { win, per, avg: win.map(r => r.reduce((s, v) => s + v, 0) / (per * (chars.length - 1))), rounds: rounds / games, draws: draws / games };
}
if (CAL) for (const c of chars) DUEL.mult[c.id] = 1;
for (let it = 0; it < CAL; it++) {
  const r = roundRobin();
  chars.forEach((c, i) => { DUEL.mult[c.id] = +(Math.min(3, Math.max(0.3, (DUEL.mult[c.id] || 1) * Math.exp(0.6 * (0.5 - r.avg[i]))))).toFixed(3); });
  console.log(`조정 ${it + 1}: ` + r.avg.map(v => Math.round(v * 100)).join(' '));
}
const r = roundRobin();
console.log(`${MODE} · Lv.${LV} · 동행 ${FAMS.join('/')} · 상대당 ${r.per}판 · 평균 ${r.rounds.toFixed(1)}라운드 · 무승부 ${Math.round(r.draws * 100)}%`);
const pad = (s, n) => { let w = 0; for (const c of String(s)) w += c.charCodeAt(0) > 255 ? 2 : 1; return String(s) + ' '.repeat(Math.max(0, n - w)); };
console.log(pad('', 12) + chars.map(c => pad(c.name.slice(0, 3), 7)).join('') + '평균   보정');
chars.forEach((c, i) => console.log(pad(c.name, 12) + chars.map((_, j) => (i === j ? pad('-', 7) : pad(Math.round(r.win[i][j] / r.per * 100), 7))).join('') + pad(Math.round(r.avg[i] * 100) + '%', 7) + `×${DUEL.mult[c.id] || 1}`));
if (CAL) console.log(JSON.stringify(Object.fromEntries(chars.map(c => [c.id, DUEL.mult[c.id]]))));
