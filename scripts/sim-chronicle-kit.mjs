// 사용: [LV=100] [PLUS=10] [PG=9] [BG=8] [MODE=win|eff] [BR=갈래 id,…] node scripts/sim-chronicle-kit.mjs [전투 수=40]
// 자령 키트 점검 — 갈래 10 × 자령 17 (동행 · 에픽 +7 4부위 봇): 무리 +7 · 보스 +5 승률 합.
// ★ = 그 갈래의 짝 자령(공명). 짝 자령이 그 갈래에서 최상위권인지 본다.
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import * as F from '../src/chronicle/familiar.js';
import { CHRONICLE_SKILLS, REBIRTH_BRANCHES, CHRONICLE_FIELDS, CHRONICLE_DUNGEONS } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 40;
const LV = +process.env.LV || 100;
const PLUS = +(process.env.PLUS ?? 10);
const PG = +(process.env.PG ?? 9), BG = +(process.env.BG ?? 8); // 무리·보스 레벨 차
const all = { bossCleared: Object.fromEntries(CHRONICLE_FIELDS.map(f => [f.id, true])), dungeonTier: Object.fromEntries(CHRONICLE_DUNGEONS.map(d => [d.id, 0])) };
const violets = F.famPool(all).violet;
function build(cid, branch, famKey) {
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
  if (famKey) { save.fams = { [famKey]: { grade: 'violet', plus: PLUS, lv: LV, exp: 0, base: 'violet' } }; save.famTeam = { main: famKey, sub1: null, sub2: null }; }
  return save;
}
function run(save, gap, boss, seed) {
  const lv = LV + gap; const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(seed); let w = 0, rd = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, boss ? null : 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng); if (b.result === 'win') { w++; rd += b.rounds; } else rd += 50; }
  // 효율 = 승률 × 속도 (이긴 판은 라운드 수, 진 판은 50라운드로 계산한 「100라운드당 승리 수」)
  return { w: w / N, eff: w / rd * 100 };
}
const MODE = process.env.MODE || 'win'; // win = 승률 / eff = 100라운드당 승리 수
const pad = (s, n) => { let w = 0; for (const c of String(s)) w += c.charCodeAt(0) > 255 ? 2 : 1; return String(s) + ' '.repeat(Math.max(0, n - w)); };
const short = (k) => F.famName(k).split(' ').pop().slice(0, 4);
const brs = (process.env.BR ? process.env.BR.split(',') : Object.keys(REBIRTH_BRANCHES));
console.log(`Lv.${LV} · 자령 +${PLUS} · 무리 +${PG} / 보스 +${BG} · ${MODE === 'eff' ? '효율(100라운드당 승리 ×10)' : '평균 승률 (%)'} · ★ = 짝 자령 · ! = 그 갈래 1위`);
console.log(pad('', 10) + pad('없음', 6) + violets.map(k => pad(short(k), 9)).join(''));
let sumAll = 0, cnt = 0; const rankOf = {};
for (const br of brs) {
  const b = REBIRTH_BRANCHES[br]; const partner = F.famResoPartner ? F.famResoPartner(br) : null;
  const sc = (k) => { const s = build(b.cls, br, k); const a = run(s, PG, false, 11), c = run(s, BG, true, 23); return MODE === 'eff' ? (a.eff + c.eff) / 2 / 10 : (a.w + c.w) / 2; };
  const none = sc(null); const vals = violets.map(k => [k, sc(k)]);
  const sorted = vals.slice().sort((x, y) => y[1] - x[1]);
  if (partner) rankOf[br] = sorted.findIndex(x => x[0] === partner) + 1;
  for (const [, v] of vals) { sumAll += v; cnt++; }
  console.log(pad(b.name, 10) + pad(Math.round(none * 100), 6) + vals.map(([k, v]) => pad((k === partner ? '★' : '') + Math.round(v * 100) + (k === sorted[0][0] ? '!' : ''), 9)).join('') + (partner ? ` 짝 ${rankOf[br]}위` : ''));
}
console.log(`전체 평균 ${Math.round(sumAll / cnt * 100)}%`);
