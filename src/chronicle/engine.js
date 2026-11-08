// ============================================
// chronicle/engine.js — 황혼 연대기 순수 로직
// ============================================
// 저장 객체(save)를 받아 새 save를 돌려주는 순수 함수 + 전투 시뮬.
// 전투는 simulateChronicleBattle이 끝까지 계산해 사건 목록을 돌려주고, UI는 재생만 한다 (풀오토 관전).
// ============================================
import {
  CHRONICLE_TUNING as T, CHRONICLE_CLASSES, CHRONICLE_SKILLS, CHRONICLE_FIELDS, CHRONICLE_DUNGEON,
  STAT_KEYS, SKILL_MAX_LV, GRADES, gradeIdx, SLOTS, SLOT_NAMES, EPIC_NAMES, FORGE, DROP_TABLE,
  chronicleClass, classSkills, buildChronicleEnemy,
} from './data.js';

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weighted(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

// ===== 유닛 =====
export function makeUnit(classId, lv = 1) {
  const cls = chronicleClass(classId);
  const u = {
    classId, lv: 1, exp: 0, points: 0, sp: 1, stats: { ...cls.base },
    skills: {}, equip: { weapon: null, armor: null, accessory: null },
  };
  for (let l = 1; l < lv; l++) { u.lv += 1; u.points += T.pointsPerLevel; u.sp += T.spPerLevel; }
  return u;
}
// 동료용 자동 성장 — 남은 포인트를 직업 비율로, 스킬은 배울 수 있는 것부터
export function autoGrowUnit(u0) {
  const u = clone(u0);
  const cls = chronicleClass(u.classId);
  const ratio = cls.auto;
  const keys = Object.keys(ratio);
  const sum = keys.reduce((s, k) => s + ratio[k], 0);
  let i = 0;
  while (u.points > 0) {
    // 비율대로 순환 배분
    const k = keys[i % keys.length];
    const share = Math.max(1, Math.round((ratio[k] / sum) * T.pointsPerLevel));
    const n = Math.min(share, u.points);
    u.stats[k] += n; u.points -= n; i++;
  }
  let guard = 0;
  while (u.sp > 0 && guard++ < 50) {
    const learnable = classSkills(u.classId).filter(s => s.reqLv <= u.lv && (u.skills[s.id] || 0) < SKILL_MAX_LV);
    if (!learnable.length) break;
    learnable.sort((a, b) => (u.skills[a.id] || 0) - (u.skills[b.id] || 0) || a.reqLv - b.reqLv);
    const s = learnable[0];
    u.skills[s.id] = (u.skills[s.id] || 0) + 1; u.sp -= 1;
  }
  return u;
}

export function newChronicleSave(heroClassId) {
  const hero = autoGrowUnit(makeUnit(heroClassId, 1));
  return {
    v: 1, hero: heroClassId, units: { [heroClassId]: hero }, party: [heroClassId],
    gold: 50, mats: { essence: 0, shard: 0 }, inventory: [], nextUid: 1,
    progress: { fieldKills: {}, bossCleared: {}, dungeonClears: 0 },
    dungeon: null, stats: { battles: 0, kills: 0, epics: 0 }, createdAt: Date.now(),
  };
}

// 동료 영입 순서 — 주인공을 뺀 4직업
export function companionOrder(heroId) {
  return CHRONICLE_CLASSES.map(c => c.id).filter(id => id !== heroId);
}
export function fieldUnlocked(save, fieldId) {
  return fieldId === 1 || !!save.progress.bossCleared[fieldId - 1];
}
export function dungeonUnlocked(save) {
  return !!save.progress.bossCleared[CHRONICLE_DUNGEON.unlockField];
}

// ===== 장비 =====
export function itemStats(item) {
  if (!item) return {};
  const g = GRADES[gradeIdx(item.grade)] || GRADES[0];
  const m = g.mult * (1 + FORGE.enhancePct * (item.plus || 0)) * (item.roll || 1);
  const L = item.ilv;
  const out = {};
  if (item.slot === 'weapon') out.atk = Math.round((4 + L * 1.7) * m);
  if (item.slot === 'armor') { out.def = Math.round((2 + L * 1.1) * m); out.hp = Math.round((10 + L * 6) * m); }
  if (item.slot === 'accessory') { out.hp = Math.round((6 + L * 3.5) * m); out.crit = +(0.01 + L * 0.0015 * m).toFixed(3); out.spd = +(0.5 + L * 0.08 * m).toFixed(1); }
  if (item.grade === 'epic') {
    if (item.slot === 'weapon') out.critDmg = 0.3;
    if (item.slot === 'armor') out.hpPct = 0.1;
    if (item.slot === 'accessory') out.atkPct = 0.08;
  }
  return out;
}
export function itemName(item) {
  if (item.grade === 'epic') return EPIC_NAMES[item.slot];
  const tier = Math.min(3, Math.floor((item.ilv - 1) / 8));
  return SLOT_NAMES[item.slot][tier];
}
export function itemPower(item) {
  const s = itemStats(item);
  return Math.round((s.atk || 0) * 2 + (s.def || 0) * 2 + (s.hp || 0) * 0.3 + (s.crit || 0) * 300 + (s.spd || 0) * 3 + (s.critDmg || 0) * 60 + (s.hpPct || 0) * 200 + (s.atkPct || 0) * 300);
}
export function rollItem(rng, grade, ilv, slot = null) {
  return {
    slot: slot || pick(rng, SLOTS).id, grade, ilv: Math.max(1, ilv), plus: 0,
    roll: +(0.9 + rng() * 0.2).toFixed(3),
  };
}

function gearTotals(save, u) {
  const t = { atk: 0, def: 0, hp: 0, crit: 0, spd: 0, critDmg: 0, hpPct: 0, atkPct: 0 };
  for (const slot of Object.keys(u.equip)) {
    const uid = u.equip[slot];
    const it = uid != null ? save.inventory.find(i => i.uid === uid) : null;
    if (!it) continue;
    const s = itemStats(it);
    for (const k of Object.keys(t)) t[k] += s[k] || 0;
  }
  return t;
}
function passiveFx(u) {
  const fx = {};
  for (const [id, lv] of Object.entries(u.skills)) {
    const s = CHRONICLE_SKILLS[id];
    if (!s || s.kind !== 'passive' || lv <= 0) continue;
    for (const [k, v] of Object.entries(s.fx(lv))) fx[k] = (fx[k] || 0) + v;
  }
  return fx;
}

// 전투 능력치
export function deriveUnit(save, classId) {
  const u = save.units[classId];
  const cls = chronicleClass(classId);
  const g = gearTotals(save, u);
  const fx = passiveFx(u);
  const st = u.stats;
  const main = cls.main === 'int' ? st.int : cls.main === 'agi' ? st.agi : st.str;
  const atk = (main * 2.2 + u.lv * 1.5 + g.atk) * (1 + (fx.atkPct || 0) + g.atkPct);
  return {
    id: classId, classId, name: cls.name, side: 'party', lv: u.lv, magic: cls.magic,
    maxHp: Math.round((50 + st.vit * 10 + u.lv * 6 + g.hp) * (1 + (fx.hpPct || 0) + g.hpPct)),
    atk: Math.round(atk),
    healPower: Math.round(st.int * 2.2 + u.lv * 1.5 + g.atk * 0.5),
    def: Math.round((st.vit * 0.8 + g.def) * (1 + (fx.defPct || 0))),
    spd: +(8 + st.agi * 0.6 + g.spd).toFixed(1),
    crit: Math.min(0.5, 0.05 + st.agi * 0.004 + g.crit + (fx.critAdd || 0)),
    critMult: T.critMult + g.critDmg,
    dodge: Math.min(0.3, st.agi * 0.002 + (fx.dodgeAdd || 0)),
    counterPct: fx.counterPct || 0, lowHpDmg: fx.lowHpDmg || 0,
    skills: Object.entries(u.skills)
      .map(([id, lv]) => ({ s: CHRONICLE_SKILLS[id], lv }))
      .filter(x => x.s && x.lv > 0 && x.s.kind !== 'passive'),
  };
}
export function unitPower(save, classId) {
  const d = deriveUnit(save, classId);
  return Math.round(d.atk * 2 + d.maxHp * 0.3 + d.def * 2 + d.spd * 2 + d.healPower * (d.classId === 'priest' ? 1.5 : 0.2));
}

// ===== 성장 =====
export function addStat(save0, classId, key, n = 1) {
  const save = clone(save0);
  const u = save.units[classId];
  if (!u || !STAT_KEYS.includes(key) || u.points < n) return save0;
  u.stats[key] += n; u.points -= n;
  return save;
}
export function autoAllocate(save0, classId) {
  const save = clone(save0);
  const u = save.units[classId];
  const sp = u.sp;
  const grown = autoGrowUnit({ ...u, sp: 0 });
  save.units[classId] = { ...grown, sp };
  return save;
}
export function canLearn(u, s) {
  return u.sp > 0 && s.reqLv <= u.lv && (u.skills[s.id] || 0) < SKILL_MAX_LV;
}
export function learnSkill(save0, classId, skillId) {
  const u0 = save0.units[classId];
  const s = CHRONICLE_SKILLS[skillId];
  if (!u0 || !s || s.cls !== classId || !canLearn(u0, s)) return save0;
  const save = clone(save0);
  const u = save.units[classId];
  u.skills[skillId] = (u.skills[skillId] || 0) + 1; u.sp -= 1;
  return save;
}
// 경험치 — 레벨업 횟수 반환
function gainExp(u, n) {
  let ups = 0;
  if (u.lv >= T.maxLevel) return 0;
  u.exp += n;
  while (u.lv < T.maxLevel && u.exp >= T.expNeed(u.lv)) {
    u.exp -= T.expNeed(u.lv);
    u.lv += 1; u.points += T.pointsPerLevel; u.sp += T.spPerLevel; ups++;
  }
  return ups;
}

// ===== 파티 · 장비 조작 =====
export function setParty(save0, ids) {
  const save = clone(save0);
  const list = [save.hero, ...ids.filter(id => id !== save.hero && save.units[id])].slice(0, 4);
  save.party = list;
  return save;
}
export function equipItem(save0, classId, uid) {
  const save = clone(save0);
  const it = save.inventory.find(i => i.uid === uid);
  const u = save.units[classId];
  if (!it || !u) return save0;
  // 다른 유닛이 끼고 있으면 해제
  for (const other of Object.values(save.units)) {
    for (const sl of Object.keys(other.equip)) if (other.equip[sl] === uid) other.equip[sl] = null;
  }
  u.equip[it.slot] = uid;
  return save;
}
export function unequipItem(save0, classId, slot) {
  const save = clone(save0);
  if (save.units[classId]) save.units[classId].equip[slot] = null;
  return save;
}
export function equippedBy(save, uid) {
  for (const [cid, u] of Object.entries(save.units)) {
    for (const sl of Object.keys(u.equip)) if (u.equip[sl] === uid) return cid;
  }
  return null;
}
export function dismantleItems(save0, uids) {
  const save = clone(save0);
  let essence = 0; let shard = 0;
  for (const uid of uids) {
    if (equippedBy(save, uid)) continue;
    const idx = save.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) continue;
    const it = save.inventory[idx];
    const g = GRADES[gradeIdx(it.grade)];
    essence += g.dismantle + (it.plus || 0);
    shard += g.shard || 0;
    save.inventory.splice(idx, 1);
  }
  save.mats.essence += essence; save.mats.shard += shard;
  return { save, essence, shard };
}
// 빈 슬롯·더 강한 장비 자동 장착 (파티 전원)
export function autoEquip(save0) {
  let save = clone(save0);
  for (const cid of save.party) {
    for (const sl of SLOTS.map(s => s.id)) {
      const cur = save.inventory.find(i => i.uid === save.units[cid].equip[sl]);
      const free = save.inventory.filter(i => i.slot === sl && !equippedBy(save, i.uid));
      free.sort((a, b) => itemPower(b) - itemPower(a));
      if (free[0] && (!cur || itemPower(free[0]) > itemPower(cur))) save = equipItem(save, cid, free[0].uid);
    }
  }
  return save;
}

// ===== 대장간 =====
export function enhanceCost(item) { return FORGE.enhanceCost(item.plus || 0, item.ilv); }
export function canEnhance(save, item) {
  if (!item || (item.plus || 0) >= FORGE.maxEnhance) return false;
  const c = enhanceCost(item);
  return save.gold >= c.gold && save.mats.essence >= c.essence;
}
export function enhanceItem(save0, uid) {
  const it0 = save0.inventory.find(i => i.uid === uid);
  if (!canEnhance(save0, it0)) return save0;
  const save = clone(save0);
  const it = save.inventory.find(i => i.uid === uid);
  const c = enhanceCost(it);
  save.gold -= c.gold; save.mats.essence -= c.essence;
  it.plus = (it.plus || 0) + 1;
  return save;
}
export function nextGrade(item) { const i = gradeIdx(item.grade); return i < GRADES.length - 1 ? GRADES[i + 1].id : null; }
export function promoteCost(item) { const n = nextGrade(item); return n ? FORGE.promoteCost[n] : null; }
export function canPromote(save, item) {
  const c = item && promoteCost(item);
  return !!c && save.gold >= c.gold && save.mats.essence >= c.essence && save.mats.shard >= c.shard;
}
export function promoteItem(save0, uid) {
  const it0 = save0.inventory.find(i => i.uid === uid);
  if (!canPromote(save0, it0)) return save0;
  const save = clone(save0);
  const it = save.inventory.find(i => i.uid === uid);
  const c = promoteCost(it);
  save.gold -= c.gold; save.mats.essence -= c.essence; save.mats.shard -= c.shard;
  it.grade = nextGrade(it);
  if (it.grade === 'epic') save.stats.epics += 1;
  return save;
}

// ===== 전투 준비 =====
export function partyCombatants(save, hpMap = null) {
  return save.party.map(cid => {
    const d = deriveUnit(save, cid);
    const hp = hpMap && hpMap[cid] != null ? Math.min(d.maxHp, hpMap[cid]) : d.maxHp;
    return { ...d, hp };
  });
}
// partyLv: 파티 평균 레벨 — 몹 레벨은 그 근처(±1)에서 사냥터 범위 안으로 맞춘다
export function partyLevel(save) {
  return Math.round(save.party.reduce((s, c) => s + save.units[c].lv, 0) / Math.max(1, save.party.length));
}
export function rollFieldEncounter(field, rng, boss = false, partyLv = null) {
  if (boss) return { type: 'boss', enemies: [buildChronicleEnemy(field.boss, field.bossLv, 'e0', field.area)] };
  const lv = () => {
    if (partyLv == null) return ri(rng, field.lv[0], field.lv[1]);
    return Math.max(field.lv[0], Math.min(field.lv[1], partyLv + ri(rng, -1, 1)));
  };
  if (rng() < T.eliteChance && field.elites.length) {
    const list = [buildChronicleEnemy(pick(rng, field.elites), field.lv[1], 'e0', field.area)];
    if (rng() < 0.5) list.push(buildChronicleEnemy(pick(rng, field.normals), lv(), 'e1', field.area));
    return { type: 'elite', enemies: list };
  }
  const n = rng() < 0.35 ? 1 : rng() < 0.75 ? 2 : 3;
  const enemies = [];
  for (let i = 0; i < n; i++) enemies.push(buildChronicleEnemy(pick(rng, field.normals), lv(), `e${i}`, field.area));
  return { type: 'normal', enemies };
}
export function dungeonEncounter(floorIdx, rng) {
  const f = CHRONICLE_DUNGEON.floors[floorIdx];
  if (f.boss) return { type: 'dungeonBoss', enemies: [buildChronicleEnemy(f.enemies[0], f.lv, 'e0', CHRONICLE_DUNGEON.area)] };
  const n = Math.min(3, 2 + (rng() < 0.5 ? 1 : 0));
  const enemies = [];
  for (let i = 0; i < n; i++) enemies.push(buildChronicleEnemy(pick(rng, f.enemies), f.lv, `e${i}`, CHRONICLE_DUNGEON.area));
  return { type: 'dungeonFloor', enemies };
}

// ===== 전투 시뮬 (풀오토) =====
export function simulateChronicleBattle(party0, enemies0, rng = Math.random) {
  const units = [
    ...party0.map(p => ({ ...p, buffs: {}, shield: 0, taunt: 0, tauntDef: 0, dots: [], cds: {}, turn: 0 })),
    ...enemies0.map(e => ({ ...e, buffs: {}, shield: 0, taunt: 0, tauntDef: 0, dots: [], cds: {}, turn: 0, skills: [] })),
  ];
  const events = [];
  const alive = (side) => units.filter(u => u.side === side && u.hp > 0);
  const snap = () => Object.fromEntries(units.map(u => [u.id, [u.hp, u.shield]]));
  const push = (ev) => { ev.st = snap(); events.push(ev); };

  const atkMod = (u) => {
    let m = 1;
    for (const b of Object.values(u.buffs)) if (b.t > 0) m += b.v;
    if (u.lowHpDmg && u.hp < u.maxHp * 0.5) m += u.lowHpDmg;
    return m;
  };
  const damage = (att, def, mult, { noDodge = false } = {}) => {
    if (!noDodge && rng() < (def.dodge || 0)) return { miss: true, d: 0 };
    let raw = att.atk * mult * atkMod(att) * (0.9 + rng() * 0.2);
    const crit = rng() < (att.crit || 0);
    if (crit) raw *= att.critMult || T.critMult;
    const defV = (def.def || 0) * (1 + (def.taunt > 0 ? def.tauntDef : 0));
    let d = Math.max(1, Math.round(raw * T.defK / (T.defK + defV)));
    let absorbed = 0;
    if (def.shield > 0) { absorbed = Math.min(def.shield, d); def.shield -= absorbed; d -= absorbed; }
    def.hp = Math.max(0, def.hp - d);
    return { d, crit, absorbed };
  };
  const pickEnemyTarget = (u) => {
    const foes = alive(u.side === 'party' ? 'enemy' : 'party');
    if (!foes.length) return null;
    if (u.side === 'enemy') {
      const t = foes.find(f => f.taunt > 0);
      if (t && rng() < 0.85) return t;
      return pick(rng, foes);
    }
    return foes.slice().sort((a, b) => a.hp - b.hp)[0];
  };
  const counterCheck = (def, att, hits) => {
    if (def.side !== 'party' || def.hp <= 0 || att.hp <= 0 || !def.counterPct) return;
    if (rng() < def.counterPct) {
      const r = damage(def, att, 0.6, { noDodge: true });
      hits.push({ t: att.id, d: r.d, c: r.crit, counter: true });
    }
  };

  const chooseSkill = (u) => {
    const ready = u.skills.filter(x => !(u.cds[x.s.id] > 0));
    const allies = alive('party');
    const foes = alive('enemy');
    const has = (k) => ready.find(x => x.s.kind === k);
    const lowAlly = allies.find(a => a.hp < a.maxHp * 0.55);
    if (lowAlly && has('heal')) return has('heal');
    if (has('shield') && !allies.some(a => a.shield > 0)) return has('shield');
    if (has('buffAtk') && !allies.some(a => a.buffs.bless?.t > 0)) return has('buffAtk');
    if (has('rage') && !(u.buffs.rage?.t > 0)) return has('rage');
    if (has('taunt') && allies.length > 1 && !(u.taunt > 0)) return has('taunt');
    if (foes.length >= 2) {
      const aoe = has('aoe') || ready.find(x => x.s.kind === 'dot' && x.s.all);
      if (aoe) return aoe;
    }
    const single = ready.filter(x => ['strike', 'multi', 'lifesteal', 'dot'].includes(x.s.kind));
    if (single.length) return single.sort((a, b) => (b.s.base + b.s.perLv * b.lv) - (a.s.base + a.s.perLv * a.lv))[0];
    return null;
  };

  const act = (u) => {
    u.turn += 1;
    if (u.side === 'enemy') {
      const foes = alive('party');
      if (!foes.length) return;
      const bossAoe = u.tier === 'boss' && u.turn % 4 === 0;
      const heavy = (u.tier !== 'normal') && u.turn % 3 === 0;
      if (bossAoe) {
        const hits = foes.map(f => { const r = damage(u, f, 0.7); return { t: f.id, d: r.d, c: r.crit, m: r.miss }; });
        push({ a: u.id, n: '광역 강타', k: 'aoe', hits });
        return;
      }
      const t = pickEnemyTarget(u);
      const r = damage(u, t, heavy ? 1.6 : 1);
      const hits = [{ t: t.id, d: r.d, c: r.crit, m: r.miss }];
      if (!r.miss) counterCheck(t, u, hits);
      push({ a: u.id, n: heavy ? '강공격' : '공격', k: heavy ? 'heavy' : 'attack', hits });
      return;
    }
    if (!alive('enemy').length) return;
    const choice = chooseSkill(u);
    if (!choice) {
      const t = pickEnemyTarget(u);
      if (!t) return;
      const r = damage(u, t, 1);
      push({ a: u.id, n: '공격', k: 'attack', hits: [{ t: t.id, d: r.d, c: r.crit, m: r.miss }] });
      return;
    }
    const { s, lv } = choice;
    const v = s.base + s.perLv * (lv - 1);
    u.cds[s.id] = s.cd + 1;
    const hits = [];
    const foes = alive('enemy');
    const allies = alive('party');
    switch (s.kind) {
      case 'strike': case 'lifesteal': {
        const t = pickEnemyTarget(u);
        const r = damage(u, t, v);
        hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss });
        if (s.kind === 'lifesteal' && r.d > 0) {
          const h = Math.round(r.d * s.steal);
          u.hp = Math.min(u.maxHp, u.hp + h);
          hits.push({ t: u.id, h });
        }
        break;
      }
      case 'multi': {
        for (let i = 0; i < s.hits; i++) {
          const t = pickEnemyTarget(u);
          if (!t) break;
          const r = damage(u, t, v);
          hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss });
        }
        break;
      }
      case 'aoe':
        for (const t of foes) { const r = damage(u, t, v); hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss }); }
        break;
      case 'dot': {
        const targets = s.all ? foes : [pickEnemyTarget(u)];
        for (const t of targets) {
          t.dots.push({ v: Math.max(1, Math.round(u.atk * v * atkMod(u))), t: s.turns });
          hits.push({ t: t.id, dot: true });
        }
        break;
      }
      case 'heal': {
        const t = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const h = Math.round(u.healPower * v);
        t.hp = Math.min(t.maxHp, t.hp + h);
        hits.push({ t: t.id, h });
        break;
      }
      case 'shield':
        for (const a of allies) { const sh = Math.round(u.healPower * v); a.shield = Math.max(a.shield, sh); hits.push({ t: a.id, s: sh }); }
        break;
      case 'buffAtk':
        for (const a of allies) { a.buffs.bless = { v, t: s.turns }; hits.push({ t: a.id, buff: true }); }
        break;
      case 'rage':
        u.buffs.rage = { v, t: s.turns }; hits.push({ t: u.id, buff: true });
        break;
      case 'taunt':
        u.taunt = s.turns; u.tauntDef = v; hits.push({ t: u.id, buff: true });
        break;
      default: break;
    }
    push({ a: u.id, n: s.name, k: s.kind, skill: true, hits });
  };

  let round = 0;
  let result = null;
  while (round < T.maxRounds) {
    round += 1;
    push({ round });
    const order = units.filter(u => u.hp > 0).sort((a, b) => (b.spd + rng() * 3) - (a.spd + rng() * 3));
    for (const u of order) {
      if (u.hp <= 0) continue;
      // 지속 피해 → 행동
      if (u.dots.length) {
        const total = u.dots.reduce((s, d) => s + d.v, 0);
        u.hp = Math.max(0, u.hp - total);
        u.dots = u.dots.map(d => ({ ...d, t: d.t - 1 })).filter(d => d.t > 0);
        push({ a: u.id, n: '지속 피해', k: 'dotTick', hits: [{ t: u.id, d: total, dot: true }] });
        if (!alive('enemy').length) { result = 'win'; break; }
        if (u.hp <= 0) continue;
      }
      act(u);
      for (const k of Object.keys(u.cds)) if (u.cds[k] > 0) u.cds[k] -= 1;
      for (const b of Object.values(u.buffs)) if (b.t > 0) b.t -= 1;
      if (u.taunt > 0) u.taunt -= 1;
      if (!alive('enemy').length) { result = 'win'; break; }
      if (!alive('party').length) { result = 'lose'; break; }
    }
    if (result) break;
  }
  if (!result) result = 'lose';
  const finalHp = Object.fromEntries(units.filter(u => u.side === 'party').map(u => [u.id, u.hp]));
  return { result, events, rounds: round, finalHp };
}

// ===== 전투 보상 =====
function rollGrade(rng, grades) { return weighted(rng, grades); }
export function battleRewards(enemies, type, rng) {
  const exp = enemies.reduce((s, e) => s + Math.round((6 + e.lv * 3) * (e.rewardMult || 1) * (e.tier === 'boss' ? 10 : e.tier === 'elite' ? 3 : 1)), 0);
  const gold = enemies.reduce((s, e) => s + Math.round((3 + e.lv * 2) * (e.tier === 'boss' ? 8 : e.tier === 'elite' ? 3 : 1) * (0.85 + rng() * 0.3)), 0);
  const tableKey = type === 'normal' ? 'normal' : type;
  const tbl = DROP_TABLE[tableKey] || DROP_TABLE.normal;
  const ilv = Math.max(...enemies.map(e => e.lv));
  const items = [];
  const count = tbl.items || 1;
  for (let i = 0; i < count; i++) if (rng() < tbl.itemChance) items.push(rollItem(rng, rollGrade(rng, tbl.grades), ilv));
  const essence = ri(rng, tbl.essence[0], tbl.essence[1]);
  const shard = tbl.shard ? ri(rng, tbl.shard[0], tbl.shard[1]) : 0;
  return { exp, gold, items, essence, shard };
}

// 전투 결과를 저장에 반영 — ctx: { kind:'field'|'dungeon', fieldId, type }
export function applyBattle(save0, ctx, battle, rng = Math.random) {
  const save = clone(save0);
  save.stats.battles += 1;
  const summary = { result: battle.result, exp: 0, gold: 0, items: [], essence: 0, shard: 0, levelUps: {}, recruit: null, unlocks: [] };
  if (battle.result !== 'win') {
    if (ctx.kind === 'field') {
      const loss = Math.floor(save.gold * T.fieldDefeatGoldLoss);
      save.gold -= loss; summary.goldLost = loss;
    } else if (ctx.kind === 'dungeon') {
      save.dungeon = null;
    }
    return { save, summary };
  }
  save.stats.kills += ctx.enemies.length;
  const r = battleRewards(ctx.enemies, ctx.type, rng);
  summary.exp = r.exp; summary.gold = r.gold; summary.essence = r.essence; summary.shard = r.shard;
  save.gold += r.gold; save.mats.essence += r.essence; save.mats.shard += r.shard;
  for (const cid of save.party) {
    const ups = gainExp(save.units[cid], r.exp);
    if (ups) summary.levelUps[cid] = save.units[cid].lv;
  }
  // 동료는 자동 성장 (주인공은 직접 배분)
  for (const cid of save.party) if (cid !== save.hero && summary.levelUps[cid]) save.units[cid] = autoGrowUnit(save.units[cid]);
  for (const it of r.items) {
    if (save.inventory.length >= T.inventoryMax) { const g = GRADES[gradeIdx(it.grade)]; save.mats.essence += g.dismantle; summary.autoDismantled = (summary.autoDismantled || 0) + 1; continue; }
    const item = { ...it, uid: save.nextUid++ };
    save.inventory.push(item);
    summary.items.push(item);
    if (item.grade === 'epic') save.stats.epics += 1;
  }
  if (ctx.kind === 'field') {
    const fid = ctx.fieldId;
    save.progress.fieldKills[fid] = (save.progress.fieldKills[fid] || 0) + ctx.enemies.length;
    if (ctx.type === 'boss' && !save.progress.bossCleared[fid]) {
      save.progress.bossCleared[fid] = true;
      const order = companionOrder(save.hero);
      const cid = order[fid - 1];
      if (cid && !save.units[cid]) {
        const hero = save.units[save.hero];
        save.units[cid] = autoGrowUnit(makeUnit(cid, Math.max(1, hero.lv - 1)));
        if (save.party.length < 4) save.party.push(cid);
        summary.recruit = cid;
      }
      if (fid < CHRONICLE_FIELDS.length) summary.unlocks.push(`사냥터 「${CHRONICLE_FIELDS[fid].name}」`);
      if (fid === CHRONICLE_DUNGEON.unlockField) summary.unlocks.push(`던전 「${CHRONICLE_DUNGEON.name}」`);
    }
  }
  if (ctx.kind === 'dungeon' && save.dungeon) {
    save.dungeon.hp = battle.finalHp;
    if (ctx.type === 'dungeonBoss') { save.dungeon = null; save.progress.dungeonClears += 1; summary.dungeonClear = true; }
    else save.dungeon.floor += 1;
  }
  return { save, summary };
}

// ===== 던전 =====
export function startDungeon(save0) {
  if (!dungeonUnlocked(save0)) return save0;
  const save = clone(save0);
  save.dungeon = { floor: 0, hp: null };
  return save;
}
export function leaveDungeon(save0) {
  const save = clone(save0);
  save.dungeon = null;
  return save;
}
