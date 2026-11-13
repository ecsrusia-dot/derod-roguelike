// 황혼 연대기 무리전 승률 점검 (1.277.3) — 직업 × 동행 역할 × 레벨 차
// 사용: node scripts/sim-chronicle-matchup.mjs [전투 수=60]
// 환경변수: LV=30,50,70,90 (점검할 주인공 레벨)  GAP=0,3,5,7 (적 레벨 - 주인공 레벨)
//           G=blue (동행 등급)  P=5 (동행 강화)  CLS=sage (직업 하나만)
// 봇이 사역마 없이 진행해 그 레벨에 도달한 저장(실제로 얻은 장비)으로, 일반 무리 3마리와 싸운 승률을 잰다.
// 밸런스(직업·동행 역할·위압·적 무리)를 바꾼 뒤 역할 간 격차를 볼 때 쓴다.
import * as E from '../src/chronicle/engine.js';
import { CHRONICLE_FIELDS, CHRONICLE_CLASSES, CHRONICLE_SKILLS, fieldStages } from '../src/chronicle/data.js';
import { CENEMIES as EN } from '../src/chronicle/enemies.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 60;
const LVS = (process.env.LV || '30,50,70,90').split(',').map(Number);
const GAPS = (process.env.GAP || '0,3,5,7').split(',').map(Number);
const GRADE = process.env.G || 'blue', PLUS = +(process.env.P ?? 5);
const keyOf = (name) => Object.keys(EN).find(k => EN[k].name === name);
const FAMS = { none: null, tank: keyOf('동상 거인'), dps: keyOf('극지의 망령'), healer: keyOf('오염된 정령') };
const ROLE_KO = { none: '없음', tank: '수호', dps: '맹공', healer: '치유' };

function upkeep(save) {
  const cid = save.hero; save = E.autoAllocate(save, cid);
  let g = 0; while (save.units[cid].sp > 0 && g++ < 30) { const u = save.units[cid]; const s = Object.values(CHRONICLE_SKILLS).find(x => x.cls === cid && E.canLearn(u, x)); save = s ? E.learnSkill(save, cid, s.id) : E.autoAllocateTalents(save, cid); }
  save = E.autoEquip(save);
  save = E.dismantleItems(save, save.inventory.filter(i => !E.equippedBy(save, i.uid)).map(i => i.uid)).save;
  for (const uid of Object.values(save.units[cid].equip)) { if (uid == null) continue; let k = 0; while (k++ < 3) { const it = save.inventory.find(i => i.uid === uid); if (E.canPromote(save, it)) save = E.promoteItem(save, uid); else if (E.canEnhance(save, it)) save = E.enhanceItem(save, uid); else break; } }
  return save;
}
// 봇 진행 → 목표 레벨 도달 시점의 저장
function snapshots(cid) {
  const rng = mulberry(cid.length * 77 + 5); let save = E.newChronicleSave(cid);
  const failLv = {}, snaps = {}; let n = 0;
  while (n++ < 8000 && Object.keys(snaps).length < LVS.length && !save.progress.bossCleared[9]) {
    save.fams = {}; save.famTeam = {};
    const fid = CHRONICLE_FIELDS.map(f => f.id).reverse().find(f => E.fieldUnlocked(save, f)); const field = CHRONICLE_FIELDS[fid - 1];
    save = upkeep(save); const lv = save.units[cid].lv;
    for (const L of LVS) if (lv >= L && !snaps[L]) snaps[L] = structuredClone(save);
    const st = E.stageState(save, fid); const si = Math.min(st.cleared, 5);
    const tryBoss = E.bossReady(save, fid) && lv >= field.bossLv - 2 && lv > (failLv[fid] ?? -1);
    const tryGate = !tryBoss && E.gateReady(save, fid, si) && lv > (failLv[fid + ':' + si] ?? -1);
    const enc = tryGate ? { ...E.rollGateEncounter(field, si, rng), stage: si } : E.rollFieldEncounter(field, rng, tryBoss, null, tryBoss ? null : si);
    enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const b = E.simulateChronicleBattle(E.partyCombatants(save), enc.enemies, rng);
    save = E.applyBattle(save, { kind: 'field', fieldId: fid, type: enc.type, enemies: enc.enemies, stage: enc.stage }, b, rng).save;
    save.bossDaily = { date: 'x', counts: {} };
    if (b.result !== 'win' && enc.type === 'boss') failLv[fid] = lv; if (b.result !== 'win' && enc.type === 'gate') failLv[fid + ':' + si] = lv;
  }
  return snaps;
}
// 그 레벨대 사냥터의 적 구성을 쓰되, 적 레벨은 정확히 목표 레벨로 고정 (스테이지 레벨은 2단위라 그대로 쓰면 차이가 어긋난다)
function stageNear(lv) {
  const fs = CHRONICLE_FIELDS.filter(f => f.part !== 3);
  const f = fs.find(x => lv >= x.lv[0] && lv <= x.lv[1]) || (lv < fs[0].lv[0] ? fs[0] : fs[fs.length - 1]);
  return { field: { ...f, lv: [lv, lv] }, stage: 0, lv };
}
function winRate(save0, role, gap) {
  const s = structuredClone(save0); s.fams = {}; s.famTeam = {};
  const lv = s.units[s.hero].lv;
  if (FAMS[role]) { s.fams[FAMS[role]] = { grade: GRADE, plus: PLUS, lv }; s.famTeam.main = FAMS[role]; }
  const t = stageNear(lv + gap); const rng = mulberry(31 + gap); let w = 0;
  for (let i = 0; i < N; i++) {
    const enc = E.rollFieldEncounter(t.field, rng, false, null, t.stage);
    const b = E.simulateChronicleBattle(E.partyCombatants(s), E.scaleEnemiesForRebirth(s, enc.enemies), rng);
    if (b.result === 'win') w++;
  }
  return Math.round(w / N * 100);
}
console.log(`무리전 승률(%) · 동행 ${GRADE}+${PLUS} · ${N}전 · 레벨 차 ${GAPS.map(g => '+' + g).join('/')}`);
for (const c of CHRONICLE_CLASSES) {
  if (process.env.CLS && process.env.CLS !== c.id) continue;
  const snaps = snapshots(c.id);
  for (const L of LVS) {
    const s = snaps[L]; if (!s) { console.log(`${c.name} Lv${L}  (도달 못 함)`); continue; }
    const cells = Object.keys(FAMS).map(role => ROLE_KO[role] + ' ' + GAPS.map(g => String(winRate(s, role, g)).padStart(3)).join('/'));
    console.log(`${c.name.padEnd(6)} Lv${String(s.units[c.id].lv).padStart(2)}  ` + cells.join('  |  '));
  }
}
