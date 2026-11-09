// 황혼 연대기 던전 밸런스 시뮬 (1.216.0)
// 사용: node scripts/sim-chronicle-dungeon.mjs snap   → 봇이 사역마 없이 진행하며 던전 개방 시점 저장 (OS 임시 폴더 snaps.json)
//       node scripts/sim-chronicle-dungeon.mjs eval [R] → 직업 × 동행 역할(none/tank/dps/healer) × 난이도 클리어율
// 환경변수: G=등급 P=강화 SUBS=보조 2칸 역할 D=던전id,.. T=0,1,2 CFG=none,tank,..
import fs from 'fs';
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS, CHRONICLE_DUNGEONS, DUNGEON_TIERS } from '../src/chronicle/data.js';
import { ENEMIES } from '../src/data/enemies.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const DIR = (await import('os')).tmpdir() + '/';
function upkeep(save) {
  const cid = save.hero; save = E.autoAllocate(save, cid);
  let g = 0; while (save.units[cid].sp > 0 && g++ < 30) { const u = save.units[cid]; const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x)); save = s ? E.learnSkill(save, cid, s.id) : E.addMastery(save, cid, u.sp); }
  save = E.autoEquip(save);
  save = E.dismantleItems(save, save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid)).save;
  for (const uid of Object.values(save.units[cid].equip)) { if (uid == null) continue; let k = 0; while (k++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (E.canPromote(save, it)) save = E.promoteItem(save, uid); else if (E.canEnhance(save, it)) save = E.enhanceItem(save, uid); else break; } }
  return save;
}
const mode = process.argv[2];
if (mode === 'snap') {
  const snaps = {};
  for (const c of CHRONICLE_CLASSES) {
    const rng = mulberry(c.id.length * 77 + 5); let save = E.newChronicleSave(c.id);
    const failLv = {}; let n = 0;
    while (n++ < 6000 && !save.progress.bossCleared[9]) {
      save.fams = {}; save.famTeam = {};
      const fid = CHRONICLE_FIELDS.map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f)); const field = CHRONICLE_FIELDS[fid - 1];
      save = upkeep(save); const lv = save.units[c.id].lv; const st = E.stageState(save, fid); const si = Math.min(st.cleared, 5);
      const tryBoss = E.bossReady(save, fid) && lv >= field.bossLv - 2 && lv > (failLv[fid] ?? -1) && E.bossAttemptsLeft(save, fid) > 0;
      const tryGate = !tryBoss && E.gateReady(save, fid, si) && lv > (failLv[fid + ':' + si] ?? -1);
      const enc = tryGate ? { ...E.rollGateEncounter(field, si, rng), stage: si } : E.rollFieldEncounter(field, rng, tryBoss, null, tryBoss ? null : si);
      const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng);
      save = E.applyBattle(save, { kind: 'field', fieldId: fid, type: enc.type, enemies: enc.enemies, stage: enc.stage }, b, rng).save;
      save.bossDaily = { date: 'x', counts: {} };
      if (b.result !== 'win' && enc.type === 'boss') failLv[fid] = lv; if (b.result !== 'win' && enc.type === 'gate') failLv[fid + ':' + si] = lv;
      for (const D of CHRONICLE_DUNGEONS) if (save.progress.bossCleared[D.unlockField] && !snaps[c.id + '|' + D.id]) snaps[c.id + '|' + D.id] = upkeep(save);
    }
    console.error(c.id, 'battles', n, 'lv', save.units[c.id].lv);
  }
  fs.writeFileSync(DIR + 'snaps.json', JSON.stringify(snaps));
} else {
  const R = +(process.argv[3] || 40);
  const snaps = JSON.parse(fs.readFileSync(DIR + 'snaps.json', 'utf8'));
  const keyOf = (name) => Object.keys(ENEMIES).find(k => ENEMIES[k].name === name);
  const GRADE = process.env.G || 'blue', PLUS = +(process.env.P ?? 5);
  const FAMS = { tank: keyOf('동상 거인'), dps: keyOf('극지의 망령'), healer: keyOf('오염된 정령') };
  const SUBS = process.env.SUBS; // 예: tank → 보조 2칸 모두 같은 역할
  const SUBK = { tank: [keyOf('빙하 거인'), keyOf('깨진 골렘')], dps: [keyOf('얼음 늑대'), keyOf('북부 고블린')], healer: [keyOf('한기의 예언자'), keyOf('미친 드라이어드')] };
  const configs = (process.env.CFG || 'none,tank,dps,healer').split(',');
  function withFam(s, role) {
    s = structuredClone(s); s.fams = {}; s.famTeam = {};
    if (role !== 'none') { s.fams[FAMS[role]] = { grade: GRADE, plus: PLUS }; s.famTeam.main = FAMS[role]; }
    if (SUBS) { SUBK[SUBS].forEach((k, i) => { s.fams[k] = { grade: GRADE, plus: PLUS }; s.famTeam['sub' + (i + 1)] = k; }); }
    return s;
  }
  function run(save, id, tier, rng) {
    let s = structuredClone(save); s.dungeon = { id, tier, floor: 0, hp: null };
    for (let i = 0; i < 8; i++) { const d = s.dungeon; if (!d) return false; const enc = E.dungeonEncounter(d, rng); const p = E.partyCombatants(s, d.hp); const b = E.simulateChronicleBattle(p, enc.enemies, rng);
      const r = E.applyBattle(s, { kind: 'dungeon', type: enc.type, enemies: enc.enemies }, b, rng); s = r.save; if (b.result !== 'win') return false; if (r.summary.dungeonClear) return true; }
    return false;
  }
  const dungeons = (process.env.D ? process.env.D.split(',') : CHRONICLE_DUNGEONS.map(d => d.id));
  const tiers = (process.env.T || '0,1,2').split(',').map(Number);
  console.log(`사역마 ${GRADE}+${PLUS}${SUBS ? ' · 보조 ' + SUBS + '×2' : ''} · 단계 ${tiers.map(t => DUNGEON_TIERS[t].label).join('/')} · ${R}회`);
  for (const did of dungeons) {
    const D = CHRONICLE_DUNGEONS.find(d => d.id === did);
    console.log(`■ ${D.name}`);
    for (const c of CHRONICLE_CLASSES) {
      const s0 = snaps[c.id + '|' + did]; if (!s0) continue;
      const cells = configs.map(cfg => { const s = withFam(s0, cfg); const rng = mulberry(11); return cfg.padEnd(6) + tiers.map(t => { let w = 0; for (let i = 0; i < R; i++) if (run(s, did, t, rng)) w++; return String(Math.round(w / R * 100)).padStart(3); }).join('/'); });
      console.log(`  ${c.name.padEnd(6)} Lv${s0.units[c.id].lv}  ` + cells.join('  |  '));
    }
  }
}
