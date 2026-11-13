// 황혼 연대기 3부 진행 시뮬 (1.278.0) — 전승자 Lv.100 → 120 성장과 3부 보스 3종
// 사용: node scripts/sim-chronicle-part3.mjs [최대 전투 수=9000]
// 환경변수: OVER=3 (100↑ 필요 경험치 배율 시험)  CLS=sage (직업 하나만)  G=indigo P=5 (동행 등급·강화)  ROLE=tank|healer|dps (기본 = 직업별 추천)
// 봇: 1·2부를 실제로 진행(사역마 없이) → 전승 → Lv.100으로 건너뜀(재육성 생략 — 그동안 얻을 장비는 없다고 보는 보수적 가정)
//     → 3부: 주인공 레벨 +2 이하인 가장 높은 스테이지에서 사냥, 관문·보스는 레벨이 닿으면 도전(지면 1레벨 올린 뒤 재도전)
//     강화는 +7까지만(파괴 구간 진입 안 함). 동행 사역마 레벨 = 주인공 레벨
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS, REBIRTH, REBIRTH_BRANCHES, fieldStages } from '../src/chronicle/data.js';
import { CENEMIES as EN } from '../src/chronicle/enemies.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MAX = +process.argv[2] || 9000;
if (process.env.OVER) REBIRTH.overExp = +process.env.OVER; // 시험용: 100↑ 필요 경험치 배율
const GRADE = process.env.G || 'indigo', PLUS = +(process.env.P ?? 5);
const keyOf = (name) => Object.keys(EN).find(k => EN[k].name === name);
const FAMS = { tank: keyOf('동상 거인'), dps: keyOf('극지의 망령'), healer: keyOf('오염된 정령') };
const BEST = { wanderer: 'healer', sage: 'tank', demonblood: 'healer', elf: 'tank', priest: 'dps' };
const KO = { tank: '수호', dps: '맹공', healer: '치유' };

function upkeep(save, rng, safe = 99) {
  const cid = save.hero; save = E.autoAllocate(save, cid);
  let g = 0; while (save.units[cid].sp > 0 && g++ < 60) { const u = save.units[cid]; const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && x.branch == null && E.canLearn(u, x)) || Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x)); const n = s ? E.learnSkill(save, cid, s.id) : E.autoAllocateTalents(save, cid); if (n === save) break; save = n; }
  save = E.autoEquip(save);
  save = E.dismantleItems(save, save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid)).save;
  for (const uid of Object.values(save.units[cid].equip)) { if (uid == null) continue; let k = 0; while (k++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (!it) break; if (E.canPromote(save, it) && it.grade !== 'epic') save = E.forgePromote(save, uid, rng).save; else if (E.canEnhance(save, it) && (it.plus || 0) < safe) save = E.forgeEnhance(save, uid, rng).save; else break; } }
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
  // ── 1·2부
  const failLv = {}; let n = 0;
  while (n++ < 8000 && !save.progress.bossCleared[9]) {
    save.fams = { [FAMS[BEST[cid]]]: { grade: 'blue', base: 'blue', plus: 0, lv: save.units[cid].lv } }; save.famTeam = { main: FAMS[BEST[cid]] }; // 1·2부는 청령 동행으로 통과만
    const fid = CHRONICLE_FIELDS.map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f)); const field = CHRONICLE_FIELDS[fid - 1];
    save = upkeep(save, rng, 7); const lv = save.units[cid].lv; const si = Math.min(E.stageState(save, fid).cleared, 5);
    const boss = E.bossReady(save, fid) && lv >= field.bossLv - 2 && lv > (failLv[fid] ?? -1);
    const gate = !boss && E.gateReady(save, fid, si) && lv > (failLv[fid + ':' + si] ?? -1);
    const r = fight(save, field, boss ? 'boss' : gate ? 'gate' : 'hunt', si, rng); save = r.save;
    if (!r.win && boss) failLv[fid] = lv; if (!r.win && gate) failLv[fid + ':' + si] = lv;
  }
  if (!save.progress.bossCleared[9]) return { name: c.name, fail: '2부 미완주' };
  // ── 전승 → Lv.100 (재육성 생략)
  const u0 = save.units[cid]; u0.lv = Math.max(u0.lv, REBIRTH.reqLevel);
  save = E.rebirth(save, Object.keys(REBIRTH_BRANCHES).find(k => REBIRTH_BRANCHES[k].cls === cid));
  const u = save.units[cid]; u.lv = 100; u.exp = 0; u.points = 99 * 4; u.sp = 100;
  const role = process.env.ROLE || BEST[cid];
  const setFam = (s) => { s.fams = { [FAMS[role]]: { grade: GRADE, base: GRADE, plus: PLUS, lv: s.units[cid].lv } }; s.famTeam = { main: FAMS[role] }; return s; };
  // ── 3부
  const out = { name: c.name, role, boss: {}, lvAt: {}, hunts: 0, huntWins: 0 }; const f3 = {}; let k = 0;
  while (k++ < MAX && !save.progress.bossCleared[12]) {
    save = setFam(upkeep(save, rng, 7)); const lv = save.units[cid].lv;
    for (const L of [105, 110, 115, 120]) if (lv >= L && !out.lvAt[L]) out.lvAt[L] = k;
    const fid = CHRONICLE_FIELDS.map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f)); const field = CHRONICLE_FIELDS[fid - 1];
    const st = E.stageState(save, fid); const si = Math.min(st.cleared, 5); const stages = fieldStages(field);
    const boss = E.bossReady(save, fid) && lv >= field.bossLv - 4 && lv > (f3[fid] ?? -1);
    const gate = !boss && E.gateReady(save, fid, si) && stages[si].lv + 1 <= lv + 4 && lv > (f3[fid + ':' + si] ?? -1);
    if (boss || gate) { const r = fight(save, field, boss ? 'boss' : 'gate', si, rng); save = r.save; if (!r.win) f3[boss ? fid : fid + ':' + si] = lv; else if (boss) out.boss[fid] = { k, lv }; continue; }
    // 사냥: 지금 스테이지가 레벨 +2 이하면 거기서, 아니면 열린 곳 중 레벨이 맞는 가장 높은 곳
    let hf = field, hs = si;
    if (stages[si].lv > lv + 2) { let best = null; for (const f of CHRONICLE_FIELDS) { if (!E.fieldUnlocked(save, f.id)) continue; const c0 = E.stageState(save, f.id).cleared; for (const s of fieldStages(f)) if (s.idx <= Math.min(c0, 5) && s.lv <= lv + 2 && (!best || s.lv > best.s.lv)) best = { f, s }; } if (best) { hf = best.f; hs = best.s.idx; } }
    const r = fight(save, hf, 'hunt', hs, rng); save = r.save; out.hunts++; if (r.win) out.huntWins++;
  }
  out.end = { k, lv: save.units[cid].lv, done: !!save.progress.bossCleared[12] };
  out.gear = Object.values(save.units[cid].equip).map(uid => { const it = save.inventory.find(i => i.uid === uid); return it ? `${it.grade[0]}${it.ilv}+${it.plus || 0}` : '-'; }).join(' ');
  return out;
}
console.log(`3부 진행 · 동행 ${GRADE}+${PLUS} · 상한 Lv.${REBIRTH.levelCap} · 100↑ 경험치 ×${REBIRTH.overExp} · 최대 ${MAX}전 (숫자 = 전승 후 Lv.100부터 센 전투 수)`);
for (const c of CHRONICLE_CLASSES) {
  if (process.env.CLS && process.env.CLS !== c.id) continue;
  const o = run(c); if (o.fail) { console.log(c.name, o.fail); continue; }
  const b = (f) => o.boss[f] ? `${o.boss[f].k}전 Lv${o.boss[f].lv}` : '-';
  console.log(`${o.name.padEnd(6)} ${KO[o.role]} | 보스10 ${b(10)} | 보스11 ${b(11)} | 보스12 ${b(12)} | Lv105 ${o.lvAt[105] ?? '-'} · 110 ${o.lvAt[110] ?? '-'} · 115 ${o.lvAt[115] ?? '-'} · 120 ${o.lvAt[120] ?? '-'} | 끝 ${o.end.k}전 Lv${o.end.lv} ${o.end.done ? '완주' : '미완'} | 사냥 승률 ${Math.round(o.huntWins / Math.max(1, o.hunts) * 100)}% | 장비 ${o.gear}`);
}
