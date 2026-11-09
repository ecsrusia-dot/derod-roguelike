// 황혼 연대기 2.0 솔로 성장 시뮬 — node scripts/sim-chronicle.mjs [N]
// 봇: 최고 사냥터에서 사냥 → (처치 수 충족 + 보스 레벨-2 도달) 보스 도전 → 자동 배분·장착·강화·승급
// 장비는 봇이 실제로 얻은 것만 사용 (1.208 교훈 — 이상적 장비 가정 금지)
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS } from '../src/chronicle/data.js';
import { FAM_GRADES, FAM_ROLES, famRole, famGradeIdx, famStats } from '../src/chronicle/familiar.js';
const USE_FAM = process.env.FAM !== '0'; // FAM=0 이면 사역마 없이 (1.211.0 기준선 비교용)
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 10;
const LAST = CHRONICLE_FIELDS[CHRONICLE_FIELDS.length - 1].id;

// 사역마 봇: 조각 생기면 소환 · 가장 강한 맹공/주술을 동행, 나머지 상위 2마리 보조 · 사역혼은 동행에 몰아서 강화·진화
// 1.225.0 — 레벨 비율 반영 (단, 0.6 하한: 등급이 크게 높은 신규 사역마는 데려가서 키운다)
// 1.226.0 — 사역마 실제 능력치 기준 (단, 실효 레벨이 주인공의 60% 미만이어도 등급이 높으면 데려가서 키운다)
const famScore = (k, f, hlv = 1) => { const st = famStats(k, { ...f, lv: Math.max(f.lv || 1, Math.round(hlv * 0.6)) }, hlv); return st.atk + st.maxHp * 0.25 + st.healPower; };
function famUpkeep(save, rng) {
  while ((save.mats.famShard || 0) >= 10) { const r = E.summonFam(save, save.mats.famShard >= 100 ? 10 : 1, rng); save = r.save; }
  const hlv = save.units[save.hero].lv;
  const ranked = Object.entries(save.fams).sort((a, b) => famScore(b[0], b[1], hlv) - famScore(a[0], a[1], hlv)).map(x => x[0]);
  if (!ranked.length) return save;
  save = E.setFamTeam(save, 'main', ranked[0]);
  if (ranked[1]) save = E.setFamTeam(save, 'sub1', ranked[1]);
  if (ranked[2]) save = E.setFamTeam(save, 'sub2', ranked[2]);
  let g = 0;
  while (g++ < 30) {
    const f = save.fams[ranked[0]];
    if (f.plus >= 10) { const r = E.evolveFam(save, ranked[0], rng); if (!r.result) break; save = r.save; }
    else { const n = E.enhanceFam(save, ranked[0]); if (n === save) break; save = n; }
  }
  return save;
}
function upkeep(save, rng) {
  if (USE_FAM) save = famUpkeep(save, rng);
  const cid = save.hero;
  save = E.autoAllocate(save, cid);
  let g = 0;
  while (save.units[cid].sp > 0 && g++ < 30) {
    const u = save.units[cid];
    const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x));
    save = s ? E.learnSkill(save, cid, s.id) : E.autoAllocateTalents(save, cid);
  }
  save = E.autoEquip(save);
  const junk = save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid);
  save = E.dismantleItems(save, junk).save;
  for (const uid of Object.values(save.units[cid].equip)) {
    if (uid == null) continue;
    let k = 0; while (k++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (E.canPromote(save, it)) save = E.promoteItem(save, uid); else if (E.canEnhance(save, it)) save = E.enhanceItem(save, uid); else break; }
  }
  return save;
}

function run(classId, seed) {
  const rng = mulberry(seed);
  let save = E.newChronicleSave(classId);
  save.fams = {}; save.famTeam = {}; save.famPity = { total: 0, sinceViolet: 0 }; save.mats = { ...save.mats, famShard: 0, famSoul: 0 };
  const log = {}; const wr = { normal: [0, 0], elite: [0, 0], boss: [0, 0], gate: [0, 0] }; let hpLoss = [];
  let battles = 0; const failLv = {}; // 보스 패배 시 1레벨 더 올리고 재도전 (사람처럼)
  while (battles < 6000) {
    if (save.progress.bossCleared[LAST]) break;
    const fid = CHRONICLE_FIELDS.map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f));
    const field = CHRONICLE_FIELDS[fid - 1];
    save = upkeep(save, rng);
    const lv = save.units[classId].lv;
    // 1.213.0 스테이지: 가장 높은 개방 스테이지에서 사냥 → 처치 목표 달성 시 관문 → 6관문 뒤 보스
    const st = E.stageState(save, fid);
    const si = Math.min(st.cleared, 5);
    const gateKey = `${fid}:${si}`;
    const tryBoss = E.bossReady(save, fid) && lv >= field.bossLv - 2 && lv > (failLv[fid] ?? -1) && E.bossAttemptsLeft(save, fid) > 0;
    const tryGate = !tryBoss && E.gateReady(save, fid, si) && lv > (failLv[gateKey] ?? -1);
    const enc = tryGate ? { ...E.rollGateEncounter(field, si, rng), stage: si } : E.rollFieldEncounter(field, rng, tryBoss, null, tryBoss ? null : si);
    const party = E.partyCombatants(save);
    const b = E.simulateChronicleBattle(party, enc.enemies, rng);
    battles++;
    const t = enc.type;
    wr[t][1]++; if (b.result === 'win') { wr[t][0]++; if (t === 'normal') hpLoss.push(1 - b.finalHp[classId] / party[0].maxHp); }
    const r = E.applyBattle(save, { kind: 'field', fieldId: fid, type: enc.type, enemies: enc.enemies, stage: enc.stage }, b, rng);
    save = r.save;
    if (b.result !== 'win' && t === 'boss') failLv[fid] = lv;
    if (b.result !== 'win' && t === 'gate') failLv[gateKey] = lv;
    if (b.result === 'win' && t === 'boss') log[fid] = { battles, lv: save.units[classId].lv };
  }
  const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100) : 0;
  const fams = Object.values(save.fams || {});
  const best = fams.length ? Math.max(...fams.map(f => famGradeIdx(f.grade))) : -1;
  if (process.env.FAMLOG) console.error(classId, "hero", save.units[classId].lv, "main fam lv", save.fams[save.famTeam?.main]?.lv);
  return { log, battles, lv: save.units[classId].lv, wr, hpLoss: avg(hpLoss), summons: save.famPity?.total || 0, famCount: fams.length, best, mainFam: save.famTeam?.main && save.fams[save.famTeam.main] };
}

for (const c of CHRONICLE_CLASSES) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(run(c.id, i * 97 + 3));
  const med = (f) => { const v = rs.map(f).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : '-'; };
  const rate = (t) => { const w = rs.reduce((s, r) => s + r.wr[t][0], 0); const n = rs.reduce((s, r) => s + r.wr[t][1], 0); return n ? Math.round(w / n * 100) + '%' : '-'; };
  console.log(`${c.name.padEnd(7)} | ` + CHRONICLE_FIELDS.map(f => f.id).map(f => `보스${f} ${med(r => r.log[f]?.battles)}전 Lv${med(r => r.log[f]?.lv)}`).join(' | ') + ` | 완주 ${rs.filter(r => r.log[LAST]).length}/${N} | 승률 일반 ${rate('normal')}(HP-${med(r => r.hpLoss)}%) 강적 ${rate('elite')} 보스 ${rate('boss')} 관문 ${rate('gate')} | 소환 ${med(r => r.summons)}회 보유 ${med(r => r.famCount)} 최고 ${(FAM_GRADES[med(r => r.best)] || {}).label || '-'} 동행 ${rs.map(r => r.mainFam ? FAM_GRADES[famGradeIdx(r.mainFam.grade)].label + '+' + r.mainFam.plus : '-').join(',')}`);
}
