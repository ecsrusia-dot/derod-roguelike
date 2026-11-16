// 사용: [LV=100] [N=200] node scripts/sim-chronicle-dodge.mjs
// 회피 상한·적중 규칙 시험 — 회피 빌드(정령사 2갈래·검귀)와 비회피 빌드(대마도사·혈귀)를 규칙 변형별로 비교
// 변형은 CHRONICLE_TUNING.dodgeCap · accRule · intimidate[].acc/.dodge · stat.acc 를 바꿔 가며 같은 캐릭터·같은 시드로 돌린다
// 칸: 승률 · 평균 라운드 · 피 = 실제 회피율 · 빗 = 내 공격 빗나감 · HP = 끝났을 때 남은 체력
import * as E from '../src/chronicle/engine.js';
import * as TL from '../src/chronicle/talents.js';
import { CHRONICLE_FIELDS, CHRONICLE_SKILLS, CHRONICLE_TUNING as T } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.env.N || 200, LV = +process.env.LV || 100;
// dodgeGear: 방어구를 회피 유니크로 + 나머지 장비 옵션을 회피로 · heroAcc: 주인공에게 얹는 적중
function build(cid, branch, { dodgeGear = false, armor = null, heroAcc = 0, agi = false } = {}) {
  let save = E.newChronicleSave(cid); const u = save.units[cid];
  const rg = mulberry(5);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) {
    let it = slot === 'armor' && armor ? E.makeItem(rg, { cls: cid, slot, grade: 'unique', ilv: LV, named: armor }) : E.rollItem(rg, 'epic', LV, slot, 'field', cid);
    it.uid = save.nextUid++; it.plus = 7; delete it.unid;
    if (dodgeGear && !it.named) it.opts = [{ k: 'dodge', v: 0.04 }, { k: 'dodge', v: 0.04 }, ...(it.opts || []).slice(2)];
    save.inventory.push(it); u.equip[slot] = it.uid;
  }
  u.rebirth = { branch, count: 1 }; u.lv = LV; u.talents = {}; u.skills = {}; u.points = 0;
  const pts = LV * 4 - 4;
  if (agi) { const cap = E.statSoftCap(u); const a = Math.max(0, Math.min(pts, cap - u.stats.agi)); u.stats.agi += a; save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: pts - a } } }, cid); }
  else save = E.autoAllocate({ ...save, units: { ...save.units, [cid]: { ...u, points: pts } } }, cid);
  const uu = save.units[cid];
  for (const s of Object.values(CHRONICLE_SKILLS)) if (s.cls === cid && (!s.branch || s.branch === branch)) uu.skills[s.id] = 5;
  uu.sp = 70; const trees = TL.talentTrees(cid, branch);
  const learn = (n) => { while (uu.sp > 0 && TL.canLearnTalent(uu, n.id)) { uu.talents[n.id] = (uu.talents[n.id] || 0) + 1; uu.sp--; } };
  if (dodgeGear) for (const tr of trees) for (const tier of tr.tiers) for (const n of tier) if (n.fx.dodge || n.fx.dodgeHeal) { for (const t2 of tr.tiers) { if (t2 === tier) break; for (const m of t2) learn(m); } learn(n); }
  for (const tr of [trees[trees.length - 1], ...trees]) for (const tier of tr.tiers) for (const n of tier) learn(n);
  return save;
}
function run(save, gap, boss, hacc = 0) {
  const lv = Math.max(1, LV + gap); const f = { ...CHRONICLE_FIELDS[8], lv: [lv, lv], bossLv: lv }; const rng = mulberry(11); let w = 0, r = 0, hpl = 0, at = 0, ms = 0, hm = 0, ha = 0;
  for (let i = 0; i < N; i++) { const enc = E.rollFieldEncounter(f, rng, boss, null, 0); enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const party = E.partyCombatants(save); const hero = party[0]; if (hacc && T.stat.acc) hero.acc = (hero.acc || 0) + hacc;
    const b = E.simulateChronicleBattle(party, enc.enemies, rng); if (b.result === 'win') w++; r += b.rounds || 0;
    hpl += Math.max(0, b.finalHp[hero.id] || 0) / hero.maxHp;
    for (const e of b.events) for (const h of e.hits || []) {
      if (h.t === hero.id && e.a !== hero.id && (h.d != null || h.m)) { at++; if (h.m) ms++; }
      if (e.a === hero.id && h.t !== hero.id && (h.d != null || h.m) && !h.chain) { ha++; if (h.m) hm++; }
    } }
  return `${String(Math.round(w / N * 100)).padStart(3)}% ${(r / N).toFixed(1).padStart(4)}R 피${String(Math.round(ms / Math.max(1, at) * 100)).padStart(2)} 빗${String(Math.round(hm / Math.max(1, ha) * 100)).padStart(2)} HP${String(Math.round(hpl / N * 100)).padStart(3)}`;
}
// 규칙 변형 — [이름, 회피 상한, 적 적중·회피 켬, 주인공 적중 켬]
const RULE0 = { rule: { ...T.accRule }, intim: T.intimidate.map(x => ({ ...x })), statAcc: T.stat.acc, cap: T.dodgeCap };
function setRule(cap, foe, hero) {
  T.dodgeCap = cap;
  T.accRule = foe ? RULE0.rule : {};
  T.intimidate.forEach((x, i) => { x.acc = foe ? RULE0.intim[i].acc : 0; x.dodge = foe ? RULE0.intim[i].dodge : 0; });
  T.stat.acc = hero ? RULE0.statAcc : 0;
}
const RULES = [
  ['① 이전 (상한 35%)', 0.35, false, false],
  ['② 상한 70%만', 0.7, false, false],
  ['③ 지금 규칙 (1.307.0)', RULE0.cap, true, true],
];
const CHARS = [
  ['폭풍궁수 회피', () => build('elf', 'e_storm', { dodgeGear: true, armor: 'ub_storm3', agi: true })],
  ['폭풍궁수 기본', () => build('elf', 'e_storm')],
  ['저격수 회피', () => build('elf', 'e_sniper', { dodgeGear: true, armor: 'ub_sniper4', agi: true })],
  ['검귀 반격', () => build('wanderer', 'w_warlord', { dodgeGear: true })],
  ['대마도사', () => build('sage', 's_arch')],
  ['혈귀', () => build('demonblood', 'd_reaper')],
  ['대마도사 적중 투자 +15', () => build('sage', 's_arch'), 0.15],
  ['혈귀 적중 투자 +15', () => build('demonblood', 'd_reaper'), 0.15],
  ['폭풍궁수 회피 + 적중 투자 +15', () => build('elf', 'e_storm', { dodgeGear: true, armor: 'ub_storm3', agi: true }), 0.15],
];
const CASES = [['무리 +0', 0, false], ['무리 +5', 5, false], ['무리 +7', 7, false], ['무리 +9', 9, false], ['무리 +10', 10, false], ['보스 +5', 5, true], ['보스 +7', 7, true]];
console.log(`Lv.${LV} · ${N}전 · 승률/평균 라운드`);
for (const [name, mk, hacc] of CHARS) {
  const s = mk(); setRule(9, true, true); const d = E.deriveUnit(s, s.hero);
  console.log(`\n■ ${name} — 회피 합계 ${Math.round(d.dodge * 100)}% · 적중 ${Math.round(((d.acc || 0) + (hacc || 0)) * 100)}%${hacc ? `(추가 투자 ${Math.round(hacc * 100)}% 포함)` : ''} · HP ${d.maxHp} · 공 ${d.atk}`);
  console.log(' '.repeat(30) + CASES.map(c => c[0].padEnd(27)).join(''));
  for (const [rn, cap, foe, hero] of RULES) { setRule(cap, foe, hero); console.log(rn.padEnd(30) + CASES.map(c => run(s, c[1], c[2], hacc || 0).padEnd(27)).join('')); }
}
setRule(RULE0.cap, true, true);
