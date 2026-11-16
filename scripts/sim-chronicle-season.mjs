// 사용: [CLS=sage] [ACC=2] node scripts/sim-chronicle-season.mjs [최대 전투 수=20000]
// 시즌 성장 시뮬 — 빈 계정(재화·사역마 0)에서 캐릭터 1명을 계속 키우며 전투 수별 도달 지점을 잰다.
// 봇: 사역마는 얻은 조각으로 소환 · 강화는 +7까지 · 전승 조건이 되면 바로 전승(특전 = 경험의 축복)
//     사냥은 레벨 +2 이하 최고 스테이지, 관문·보스는 레벨이 닿으면 도전(지면 1레벨 올린 뒤 재도전). 원정대 레벨 상한 없음.
// ACC = 시즌 가속(경험치 배율) 시험 · ASCT = 승천 특성 단계(4종 모두 그 단계 — 0~10)
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS, CHRONICLE_TUNING as T, REBIRTH_BRANCHES, fieldStages } from '../src/chronicle/data.js';
import { famStats } from '../src/chronicle/familiar.js';
import { ascTalentFx } from '../src/chronicle/ascPerk.js';
const ASCT = +(process.env.ASCT || 0); const ASC_FX = ASCT ? ascTalentFx({ might: ASCT, vigor: ASCT, lore: ASCT, guide: ASCT }) : null;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MAX = +process.argv[2] || 20000; const ACC = +(process.env.ACC || 1);
if (ACC !== 1) { const o = T.expNeed; T.expNeed = (lv) => Math.max(1, Math.round(o(lv) / ACC)); }
const MARKS = [1000, 2000, 3500, 5000, 7000, 10000, 14000, 19000, 25000, 32000, 40000].filter(x => x <= MAX);
const famScore = (k, f, hlv) => { const st = famStats(k, { ...f, lv: Math.max(f.lv || 1, Math.round(hlv * 0.6)) }, hlv); return st.atk + st.maxHp * 0.25 + st.healPower; };
function famUpkeep(save, rng) {
  while ((save.mats.famShard || 0) >= 10) save = E.summonFam(save, save.mats.famShard >= 100 ? 10 : 1, rng).save;
  const hlv = save.units[save.hero].lv;
  const ranked = Object.entries(save.fams).sort((a, b) => famScore(b[0], b[1], hlv) - famScore(a[0], a[1], hlv)).map(x => x[0]);
  if (!ranked.length) return save;
  save = E.setFamTeam(save, 'main', ranked[0]); if (ranked[1]) save = E.setFamTeam(save, 'sub1', ranked[1]); if (ranked[2]) save = E.setFamTeam(save, 'sub2', ranked[2]);
  let g = 0; while (g++ < 30) { const f = save.fams[ranked[0]]; if (f.plus >= 10) { const r = E.evolveFam(save, ranked[0], rng); if (!r.result) break; save = r.save; } else { const n = E.enhanceFam(save, ranked[0]); if (n === save) break; save = n; } }
  return save;
}
function upkeep(save, rng) {
  save = famUpkeep(save, rng); const cid = save.hero; save = E.autoAllocate(save, cid);
  let g = 0; while (save.units[cid].sp > 0 && g++ < 60) { const u = save.units[cid]; const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x)); const n = s ? E.learnSkill(save, cid, s.id) : E.autoAllocateTalents(save, cid); if (n === save) break; save = n; }
  save = E.autoEquip(E.appraiseAll(save)); // 1.301.0 — 봇도 전승·유니크를 감정해서 쓴다
  save = E.dismantleItems(save, save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid)).save;
  for (const uid of Object.values(save.units[cid].equip)) { if (uid == null) continue; let k = 0; while (k++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (!it) break; if (E.canPromote(save, it) && it.grade !== 'epic') save = E.forgePromote(save, uid, rng).save; else if (E.canEnhance(save, it) && (it.plus || 0) < 7) save = E.forgeEnhance(save, uid, rng).save; else break; } }
  return save;
}
function fight(save, field, mode, stage, rng) {
  const enc = mode === 'gate' ? { ...E.rollGateEncounter(field, stage, rng), stage } : E.rollFieldEncounter(field, rng, mode === 'boss', null, mode === 'boss' ? null : stage);
  enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
  const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng);
  const r = E.applyBattle(save, { kind: 'field', fieldId: field.id, type: enc.type, enemies: enc.enemies, stage: enc.stage }, b, rng);
  r.save.bossDaily = { date: 'x', counts: {} };
  return { save: r.save, win: b.result === 'win' };
}
function run(c) {
  const cid = c.id; const rng = mulberry(cid.length * 131 + 9); let save = E.newChronicleSave(cid);
  save.fams = {}; save.famTeam = {}; save.famPity = { total: 0, sinceViolet: 0 }; save.mats = { ...save.mats, famShard: 0, famSoul: 0 };
  const branch = Object.keys(REBIRTH_BRANCHES).find(k => REBIRTH_BRANCHES[k].cls === cid);
  const fail = {}; const marks = {}; const rbAt = {}; let wins = 0, hunts = 0;
  for (let k = 1; k <= MAX; k++) {
    if (ASC_FX) save.ascFx = ASC_FX;
    save = upkeep(save, rng);
    if (E.canRebirth(save)) { save = E.rebirth(save, branch, cid, 'exp'); rbAt[save.units[cid].rebirth.count] = k; for (const x of Object.keys(fail)) delete fail[x]; save = upkeep(save, rng); }
    const lv = save.units[cid].lv;
    const fid = CHRONICLE_FIELDS.map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f)); const field = CHRONICLE_FIELDS[fid - 1];
    const si = Math.min(E.stageState(save, fid).cleared, 5); const stages = fieldStages(field);
    const boss = !save.progress.bossCleared[fid] && E.bossReady(save, fid) && lv >= field.bossLv - 3 && lv > (fail[fid] ?? -1);
    const gate = !boss && E.gateReady(save, fid, si) && stages[si].lv <= lv + 3 && lv > (fail[fid + ':' + si] ?? -1);
    if (boss || gate) { const r = fight(save, field, boss ? 'boss' : 'gate', si, rng); save = r.save; if (!r.win) fail[boss ? fid : fid + ':' + si] = lv; }
    else {
      let best = null;
      for (const f of CHRONICLE_FIELDS) { if (!E.fieldUnlocked(save, f.id)) continue; const c0 = E.stageState(save, f.id).cleared; for (const s of fieldStages(f)) if (s.idx <= Math.min(c0, 5) && s.lv <= lv + 2 && (!best || s.lv >= best.s.lv)) best = { f, s }; }
      const hf = best ? best.f : CHRONICLE_FIELDS[0]; const hs = best ? best.s.idx : 0;
      const r = fight(save, hf, 'hunt', hs, rng); save = r.save; hunts++; if (r.win) wins++;
    }
    if (MARKS.includes(k)) { const u = save.units[cid]; const f = save.fams[save.famTeam?.main]; marks[k] = `전승${u.rebirth?.count || 0} Lv.${u.lv}${f ? ` (${f.grade[0]}+${f.plus})` : ''}`; }
  }
  return { name: c.name, marks, rbAt, wr: Math.round(wins / Math.max(1, hunts) * 100) };
}
console.log(`시즌 성장 · 경험치 ×${ACC} · 승천 특성 ${ASCT}단계 · 최대 ${MAX}전`);
for (const c of CHRONICLE_CLASSES.filter(x => !process.env.CLS || process.env.CLS.split(',').includes(x.id))) {
  const r = run(c);
  console.log(`${r.name} | ` + MARKS.map(m => `${m}전 ${r.marks[m]}`).join(' | ') + ` | 전승 시점 ${Object.entries(r.rbAt).map(([n, k]) => `${n}회 ${k}전`).join(' · ')} | 사냥 승률 ${r.wr}%`);
}
