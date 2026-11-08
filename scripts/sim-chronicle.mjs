// 황혼 연대기 성장 시뮬 — node scripts/sim-chronicle.mjs [N]
// 봇: 최고 사냥터에서 사냥 → 처치 15 + 3연속 승리면 보스 도전 → 자동 배분·장착·강화
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_DUNGEON } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 20;

function upkeep(save) {
  for (const cid of save.party) save = E.autoAllocate(save, cid);
  for (const cid of save.party) { let g = 0; while (save.units[cid].sp > 0 && g++ < 20) { const u = save.units[cid]; const s = Object.values((awaitSkills)).find(x => x.cls === cid && E.canLearn(u, x)); if (!s) break; save = E.learnSkill(save, cid, s.id); } }
  save = E.autoEquip(save);
  const junk = save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid);
  save = E.dismantleItems(save, junk).save;
  for (const cid of save.party) for (const uid of Object.values(save.units[cid].equip)) {
    if (uid == null) continue;
    let g = 0; while (g++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (E.canPromote(save, it)) save = E.promoteItem(save, uid); else if (E.canEnhance(save, it)) save = E.enhanceItem(save, uid); else break; }
  }
  return save;
}
import { CHRONICLE_SKILLS as awaitSkills } from '../src/chronicle/data.js';

function run(classId, seed) {
  const rng = mulberry(seed);
  let save = E.newChronicleSave(classId);
  const log = {};
  let battles = 0, streak = 0, fails = {};
  let dungeonTries = 0;
  while (battles < 4000) {
    const fid = [4, 3, 2, 1].find(f => E.fieldUnlocked(save, f));
    const field = CHRONICLE_FIELDS[fid - 1];
    if (save.progress.bossCleared[4]) break;
    save = upkeep(save);
    // 던전: 2막 클리어 후 Lv 18부터 가끔
    if (E.dungeonUnlocked(save) && save.units[save.hero].lv >= CHRONICLE_DUNGEON.recLv && battles % 40 === 0) {
      dungeonTries++;
      save = E.startDungeon(save);
      while (save.dungeon) {
        const enc = E.dungeonEncounter(save.dungeon, rng);
        const b = E.simulateChronicleBattle(E.partyCombatants(save, save.dungeon.hp), enc.enemies, rng);
        battles++;
        const r = E.applyBattle(save, { kind: 'dungeon', type: enc.type, enemies: enc.enemies }, b, rng);
        save = r.save;
        if (r.summary.dungeonClear) { log.dungeon = log.dungeon || { battles, lv: save.units[save.hero].lv }; }
      }
      continue;
    }
    const tryBoss = (save.progress.fieldKills[fid] || 0) >= field.bossKills && streak >= 3;
    const enc = E.rollFieldEncounter(field, rng, tryBoss, E.partyLevel(save));
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng);
    battles++;
    const r = E.applyBattle(save, { kind: 'field', fieldId: fid, type: enc.type, enemies: enc.enemies }, b, rng);
    save = r.save;
    if (b.result === 'win') streak++; else { streak = 0; if (tryBoss) fails[fid] = (fails[fid] || 0) + 1; else fails['f' + fid] = (fails['f' + fid] || 0) + 1; }
    if (tryBoss) streak = 0;
    if (r.summary.result === 'win' && enc.type === 'boss') log[fid] = { battles, lv: save.units[save.hero].lv, party: save.party.length };
  }
  return { log, fails, battles, lv: save.units[save.hero].lv, epics: save.stats.epics, dungeonTries, gold: save.gold };
}

for (const c of CHRONICLE_CLASSES) {
  const rs = [];
  for (let i = 0; i < N; i++) rs.push(run(c.id, i * 97 + 3));
  const med = (f) => { const v = rs.map(f).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : '-'; };
  const pct = (f) => Math.round(rs.filter(f).length / N * 100);
  console.log(`${c.name.padEnd(7)} | 보스1 ${med(r => r.log[1]?.battles)}전(Lv${med(r => r.log[1]?.lv)}) | 보스2 ${med(r => r.log[2]?.battles)}전(Lv${med(r => r.log[2]?.lv)}) | 보스3 ${med(r => r.log[3]?.battles)}전(Lv${med(r => r.log[3]?.lv)}) | 보스4 ${med(r => r.log[4]?.battles)}전(Lv${med(r => r.log[4]?.lv)}) ${pct(r => r.log[4])}% | 던전 첫클리어 ${med(r => r.log.dungeon?.battles)}전 Lv${med(r => r.log.dungeon?.lv)} | 에픽 ${med(r => r.epics)} | 필드패 ${med(r => Object.entries(r.fails).filter(([k]) => k.startsWith('f')).reduce((s, [, v]) => s + v, 0))} 보스패 ${med(r => [1,2,3,4].reduce((s,k)=>s+(r.fails[k]||0),0))}`);
}
