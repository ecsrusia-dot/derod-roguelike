// 황혼 연대기 2.0 솔로 성장 시뮬 — node scripts/sim-chronicle.mjs [N]
// 봇: 최고 사냥터에서 사냥 → (처치 수 충족 + 보스 레벨-2 도달) 보스 도전 → 자동 배분·장착·강화·승급
// 장비는 봇이 실제로 얻은 것만 사용 (1.208 교훈 — 이상적 장비 가정 금지)
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 10;

function upkeep(save) {
  const cid = save.hero;
  save = E.autoAllocate(save, cid);
  let g = 0;
  while (save.units[cid].sp > 0 && g++ < 30) {
    const u = save.units[cid];
    const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x));
    save = s ? E.learnSkill(save, cid, s.id) : E.addMastery(save, cid, u.sp);
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
  const log = {}; const wr = { normal: [0, 0], elite: [0, 0], boss: [0, 0] }; let hpLoss = [];
  let battles = 0; const failLv = {}; // 보스 패배 시 1레벨 더 올리고 재도전 (사람처럼)
  while (battles < 3000) {
    if (save.progress.bossCleared[4]) break;
    const fid = [4, 3, 2, 1].find(f => E.fieldUnlocked(save, f));
    const field = CHRONICLE_FIELDS[fid - 1];
    save = upkeep(save);
    const lv = save.units[classId].lv;
    const tryBoss = (save.progress.fieldKills[fid] || 0) >= field.bossKills && lv >= field.bossLv - 2 && lv > (failLv[fid] ?? -1) && E.bossAttemptsLeft(save, fid) > 0;
    const enc = E.rollFieldEncounter(field, rng, tryBoss, E.partyLevel(save));
    const party = E.partyCombatants(save);
    const b = E.simulateChronicleBattle(party, enc.enemies, rng);
    battles++;
    const t = enc.type;
    wr[t][1]++; if (b.result === 'win') { wr[t][0]++; if (t === 'normal') hpLoss.push(1 - b.finalHp[classId] / party[0].maxHp); }
    const r = E.applyBattle(save, { kind: 'field', fieldId: fid, type: enc.type, enemies: enc.enemies }, b, rng);
    save = r.save;
    if (b.result !== 'win' && t === 'boss') failLv[fid] = lv;
    if (b.result === 'win' && t === 'boss') log[fid] = { battles, lv: save.units[classId].lv };
  }
  const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100) : 0;
  return { log, battles, lv: save.units[classId].lv, wr, hpLoss: avg(hpLoss) };
}

for (const c of CHRONICLE_CLASSES) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(run(c.id, i * 97 + 3));
  const med = (f) => { const v = rs.map(f).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : '-'; };
  const rate = (t) => { const w = rs.reduce((s, r) => s + r.wr[t][0], 0); const n = rs.reduce((s, r) => s + r.wr[t][1], 0); return n ? Math.round(w / n * 100) + '%' : '-'; };
  console.log(`${c.name.padEnd(7)} | ` + [1, 2, 3, 4].map(f => `보스${f} ${med(r => r.log[f]?.battles)}전 Lv${med(r => r.log[f]?.lv)}`).join(' | ') + ` | 완주 ${rs.filter(r => r.log[4]).length}/${N} | 승률 일반 ${rate('normal')}(HP-${med(r => r.hpLoss)}%) 강적 ${rate('elite')} 보스 ${rate('boss')}`);
}
