// 황혼 연대기 원정대 레이드 밸런스 (1.231.0)
// 1) node scripts/sim-chronicle-raid-snap.mjs 1 && node scripts/sim-chronicle-raid-snap.mjs 2  → OS 임시 폴더 raidsnap{1,2}.json (5직업 × Lv.20/40/60/80/100 봇 저장)
// 2) node scripts/sim-chronicle-raid.mjs  → 단계별 균형 파티 / 전원+20 / 1명 -20(하드캐리 시도) 승률. 환경변수 T=단계id,.. SA=봉인반향 BA/BH=보스 배율 SAM={"r60":1.2,..}
import fs from 'fs';
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function upkeep(save) {
  const cid = save.hero; save = E.autoAllocate(save, cid);
  let g = 0; while (save.units[cid].sp > 0 && g++ < 30) { const u = save.units[cid]; const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x)); save = s ? E.learnSkill(save, cid, s.id) : E.autoAllocateTalents(save, cid); }
  save = E.autoEquip(save);
  save = E.dismantleItems(save, save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid)).save;
  for (const uid of Object.values(save.units[cid].equip)) { if (uid == null) continue; let k = 0; while (k++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (E.canPromote(save, it)) save = E.promoteItem(save, uid); else if (E.canEnhance(save, it)) save = E.enhanceItem(save, uid); else break; } }
  return save;
}
const out = {};
const seed = +(process.argv[2] || 1);
for (const c of CHRONICLE_CLASSES) {
  out[c.id] = {};
  const rng = mulberry(c.id.length * 131 + seed * 7); let save = E.newChronicleSave(c.id); const failLv = {}; let n = 0;
  while (n++ < 9000 && !(out[c.id][100])) {
    save.fams = {}; save.famTeam = {};
    const fid = CHRONICLE_FIELDS.filter(f => !f.reqRebirth).map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f)); const field = CHRONICLE_FIELDS[fid - 1];
    save = upkeep(save); const lv = save.units[c.id].lv;
    for (const L of [20, 40, 60, 80, 100]) if (lv >= L && !out[c.id][L]) out[c.id][L] = structuredClone(save);
    if (lv >= 100 && save.progress.bossCleared[9]) { out[c.id][100] = structuredClone(save); break; }
    const st = E.stageState(save, fid); const si = Math.min(st.cleared, 5);
    const tryBoss = E.bossReady(save, fid) && lv >= field.bossLv - 2 && lv > (failLv[fid] ?? -1) && E.bossAttemptsLeft(save, fid) > 0;
    const tryGate = !tryBoss && E.gateReady(save, fid, si) && lv > (failLv[fid + ':' + si] ?? -1);
    const enc = tryGate ? { ...E.rollGateEncounter(field, si, rng), stage: si } : E.rollFieldEncounter(field, rng, tryBoss, null, tryBoss ? null : si);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng);
    save = E.applyBattle(save, { kind: 'field', fieldId: fid, type: enc.type, enemies: enc.enemies, stage: enc.stage }, b, rng).save;
    save.bossDaily = { date: 'x', counts: {} };
    if (b.result !== 'win' && enc.type === 'boss') failLv[fid] = lv; if (b.result !== 'win' && enc.type === 'gate') failLv[fid + ':' + si] = lv;
  }
  console.error(c.id, Object.keys(out[c.id]).map(L => L + ':' + out[c.id][L].units[c.id].lv).join(' '), 'battles', n);
}
fs.writeFileSync((await import('os')).tmpdir() + `/raidsnap${seed}.json`, JSON.stringify(out));
