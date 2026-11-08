// ============================================
// chronicle/engine.js — 황혼 연대기 순수 로직
// ============================================
// 저장 객체(save)를 받아 새 save를 돌려주는 순수 함수 + 전투 시뮬.
// 전투는 simulateChronicleBattle이 끝까지 계산해 사건 목록을 돌려주고, UI는 재생만 한다 (풀오토 관전).
// ============================================
import { fieldStages, FIELD_STAGES, STAGE_TUNING, BOOST } from './data.js';
import { famCombatant, famSubFx, rollFamShards, FAM_TUNING, summonFamiliars, enhanceFamiliar, evolveFamiliar } from './familiar.js';
import {
  CHRONICLE_TUNING as T, CHRONICLE_CLASSES, CHRONICLE_SKILLS, CHRONICLE_FIELDS, CHRONICLE_DUNGEON, CHRONICLE_DUNGEONS, DUNGEON_TIERS, dungeonDef,
  STAT_KEYS, SKILL_MAX_LV, MASTERY_PCT, BOSS_DAILY_LIMIT, DUNGEON_KEYS, GRADES, gradeIdx, SLOTS, CLASS_SLOTS, FORGE, DROP_TABLE,
  CLASS_GEAR_NAMES, EPIC_PREFIX, OPTION_DEFS, OPTION_POOLS, OFFHAND_BASE, CLASS_DROP, EPIC_OPTIONS, UNIQUE_ITEMS, UNIQUE_CHANCE,
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
    skills: {}, equip: { weapon: null, offhand: null, armor: null, accessory: null },
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
    if (!learnable.length) { u.mastery = (u.mastery || 0) + u.sp; u.sp = 0; break; }
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
    progress: { fieldKills: {}, bossCleared: {}, dungeonClears: 0, killsByKey: {} },
    dungeon: null, stats: { battles: 0, kills: 0, elites: 0, epics: 0 }, createdAt: Date.now(),
    quests: {}, story: { seen: {}, recruitSeen: {} },
    keys: { count: DUNGEON_KEYS.dailyRefill, refillDate: kstDateKey(), boughtDate: null, bought: 0 },
  };
}

// 동료 영입 순서 — 주인공을 뺀 4직업
export function companionOrder(heroId) {
  return CHRONICLE_CLASSES.map(c => c.id).filter(id => id !== heroId);
}
export function fieldUnlocked(save, fieldId) {
  return fieldId === 1 || !!save.progress.bossCleared[fieldId - 1];
}
export function dungeonUnlocked(save, id = null) {
  if (id) return !!save.progress.bossCleared[dungeonDef(id).unlockField];
  return CHRONICLE_DUNGEONS.some(d => !!save.progress.bossCleared[d.unlockField]);
}
// 난이도 개방 — 0(일반)은 항상, 이후는 직전 단계 보스 처치
export function dungeonTierUnlocked(save, id, tierIdx) {
  if (tierIdx <= 0) return true;
  const best = save.progress.dungeonTier?.[id];
  return best != null && best >= tierIdx - 1;
}

// ===== 장비 (2.0 — 직업 전용 4칸 · 직업별 옵션 · 유니크) =====
const tierOf = (ilv) => Math.min(6, Math.floor((Math.max(1, ilv) - 1) / 15));
// 2부(아이템 레벨 61+) 이름 — 4단계 이름의 「균열의/심연의」를 2부 지역 접두어로 바꾼다
const LATE_PREFIX = ['성역의', '핏빛', '황혼의'];
export const itemUsable = (item, classId) => !!item && (item.cls === 'common' || item.cls === classId);
export const uniqueDef = (item) => (item?.named ? UNIQUE_ITEMS[item.named] : null);
export const epicOptOf = (item) => (item?.eopt ? EPIC_OPTIONS[item.eopt] : null);
export function itemName(item) {
  if (item.named) return UNIQUE_ITEMS[item.named]?.name || '유니크';
  const names = (CLASS_GEAR_NAMES[item.cls] || CLASS_GEAR_NAMES.common)[item.slot] || [];
  const t = tierOf(item.ilv);
  const base = (t <= 3 ? names[t] : names[3] && `${LATE_PREFIX[t - 4]} ${names[3].replace(/^(균열의|심연의) /, '')}`) || '장비';
  return item.grade === 'epic' ? `${EPIC_PREFIX[item.set] || EPIC_PREFIX.field} ${base}` : base;
}
function rollOption(rng, cls, gradeId, have) {
  const pool = { ...(OPTION_POOLS[cls] || OPTION_POOLS.common) };
  for (const o of have) delete pool[o.k];
  if (!Object.keys(pool).length) return null;
  const k = weighted(rng, pool);
  const d = OPTION_DEFS[k];
  const gm = GRADES[gradeIdx(gradeId)]?.optMult || 1;
  let v = (d.v[0] + rng() * (d.v[1] - d.v[0])) * gm;
  v = d.pct ? +v.toFixed(3) : Math.max(1, Math.round(v));
  if (k === 'cdr') v = 1;
  return { k, v };
}
// 장비 생성 — cls: 직업 id 또는 'common'(장신구)
export function makeItem(rng, { cls, slot, grade, ilv, set = 'field', named = null }) {
  const it = { cls, slot, grade, ilv: Math.max(1, ilv), plus: 0, roll: +(0.9 + rng() * 0.2).toFixed(3), opts: [] };
  if (named) {
    const u = UNIQUE_ITEMS[named];
    Object.assign(it, { cls: u.cls, slot: u.slot, grade: 'unique', named, roll: 1, opts: Object.entries(u.opts).map(([k, v]) => ({ k, v })) });
    return it;
  }
  const n = GRADES[gradeIdx(grade)]?.opts || 0;
  for (let i = 0; i < n; i++) { const o = rollOption(rng, cls, grade, it.opts); if (o) it.opts.push(o); }
  if (grade === 'epic') { it.set = set; if (slot === 'accessory') it.eopt = pick(rng, Object.keys(EPIC_OPTIONS)); }
  return it;
}
// 드랍 직업 분배 (현재 직업 70 / 다른 직업 25 / 공용 장신구 5)
function rollDropClass(rng, heroCls) {
  const r = rng();
  if (r < CLASS_DROP.common) return 'common';
  if (r < CLASS_DROP.common + CLASS_DROP.own) return heroCls;
  return pick(rng, CHRONICLE_CLASSES.map(c => c.id).filter(id => id !== heroCls));
}
export function rollGear(rng, grade, ilv, heroCls, set = 'field') {
  const cls = rollDropClass(rng, heroCls);
  const slot = cls === 'common' ? 'accessory' : pick(rng, CLASS_SLOTS);
  return makeItem(rng, { cls, slot, grade, ilv, set });
}
export function rollUniqueItem(rng, ilv, heroCls) {
  const cls = rollDropClass(rng, heroCls);
  const pool = Object.values(UNIQUE_ITEMS).filter(u => u.cls === cls && !u.disabled);
  if (!pool.length) return null;
  return makeItem(rng, { named: pick(rng, pool).id, ilv });
}
// 하위 호환 이름 (의뢰 보상 등)
export function rollItem(rng, grade, ilv, slot = null, set = 'field', heroCls = 'wanderer') {
  return rollGear(rng, grade, ilv, heroCls, set);
}
// 장비가 주는 수치 전부 (기본 능력치 + 옵션) — 고유 효과(fx)는 gearTotals에서 합산
export function itemStats(item) {
  if (!item) return {};
  const g = GRADES[gradeIdx(item.grade)] || GRADES[0];
  const gm = g.mult * (1 + FORGE.enhancePct * (item.plus || 0));
  const m = gm * (item.roll || 1);
  const L = item.ilv;
  const out = {};
  const add = (k, v) => { out[k] = +((out[k] || 0) + v).toFixed(3); };
  if (item.slot === 'weapon') add('atk', Math.round((4 + L * 1.7) * m));
  if (item.slot === 'armor') { add('def', Math.round((2 + L * 1.1) * m)); add('hp', Math.round((10 + L * 6) * m)); }
  if (item.slot === 'accessory') add('hp', Math.round((6 + L * 3.5) * m));
  if (item.slot === 'offhand') {
    const b = OFFHAND_BASE[item.cls] || { flat: {}, pct: {} };
    for (const [k, [a, per]] of Object.entries(b.flat)) add(k, k === 'spd' ? +((a + per * L) * m).toFixed(1) : Math.round((a + per * L) * m));
    for (const [k, v] of Object.entries(b.pct)) add(k, +(v * gm).toFixed(3));
  }
  const optM = 1 + 0.5 * FORGE.enhancePct * (item.plus || 0);
  for (const o of item.opts || []) add(o.k, o.k === 'cdr' ? o.v : (OPTION_DEFS[o.k]?.pct ? +(o.v * optM).toFixed(3) : Math.round(o.v * optM)));
  return out;
}
export function itemPower(item) {
  const s = itemStats(item);
  let pctSum = 0;
  for (const [k, v] of Object.entries(s)) if (OPTION_DEFS[k]?.pct) pctSum += v;
  return Math.round((s.atk || 0) * 2 + (s.def || 0) * 2 + (s.hp || 0) * 0.3 + (s.spd || 0) * 3 + (s.cdr || 0) * 20 + pctSum * (30 + item.ilv * 5)
    + (item.named ? 60 + item.ilv * 3 : 0) + (item.eopt ? 30 + item.ilv * 2 : 0));
}
export function statLabel(k, v) {
  const d = OPTION_DEFS[k];
  if (k === 'atk') return `공격 ${v}`;
  if (k === 'def') return `방어 ${v}`;
  if (k === 'hp') return `HP ${v}`;
  if (!d) return `${k} ${v}`;
  if (d.pct) return `${d.label} +${Math.round(v * 1000) / 10}%`;
  return `${d.label} ${k === 'cdr' ? '-' : '+'}${v}${d.unit || ''}`;
}

function gearTotals(save, u) {
  const t = {};
  const add = (k, v) => { t[k] = (t[k] || 0) + v; };
  for (const slot of Object.keys(u.equip)) {
    const uid = u.equip[slot];
    const it = uid != null ? save.inventory.find(i => i.uid === uid) : null;
    if (!it || !itemUsable(it, u.classId)) continue;
    for (const [k, v] of Object.entries(itemStats(it))) add(k, v);
    const ud = uniqueDef(it);
    if (ud) for (const [k, v] of Object.entries(ud.fx)) add(k, v);
    const eo = epicOptOf(it);
    if (eo) for (const [k, v] of Object.entries(eo.fx)) add(k, v);
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

// 전투 능력치 (2.0 — 장비 옵션·유니크 효과 합산)
const PASS_KEYS = ['counterDouble', 'tauntReduce', 'critAfterCounter', 'emergencyHeal', 'dotTurnsMult', 'openInferno', 'skillShield', 'resetEvery',
  'overhealShield', 'missingHpAtk', 'rageDouble', 'multiHitsAdd', 'spiritArrow', 'dodgeHeal', 'firstCrit', 'revive', 'shieldReduce', 'blessMult', 'blessTurns',
  'execute', 'chain', 'holyDmg', 'regenPct', 'counterDmg', 'skillDmg', 'dotDmg', 'expPct', 'goldPct', 'famPct'];
export function deriveUnit(save, classId) {
  const u = save.units[classId];
  const cls = chronicleClass(classId);
  const g = gearTotals(save, u);
  // 보조 사역마 패시브 (1.212.0) — 장비 합산과 같은 키로 더한다
  for (const [k, v] of Object.entries(famSubFx(save.fams, activeSubs(save)))) g[k] = (g[k] || 0) + v;
  const G = (k) => g[k] || 0;
  const fx = passiveFx(u);
  const st = u.stats;
  const main = cls.main === 'int' ? st.int : cls.main === 'agi' ? st.agi : st.str;
  const mast = (u.mastery || 0) * MASTERY_PCT;
  const atk = (main * 2.2 + u.lv * 1.5 + G('atk')) * (1 + (fx.atkPct || 0) + G('atkPct') + mast);
  const out = {
    id: classId, classId, name: cls.name, side: 'party', lv: u.lv, magic: cls.magic,
    maxHp: Math.round((50 + st.vit * 10 + u.lv * 6 + G('hp')) * (1 + (fx.hpPct || 0) + G('hpPct') + mast)),
    atk: Math.round(atk),
    healPower: Math.round((st.int * 2.2 + u.lv * 1.5 + G('atk') * 0.5) * (1 + G('healPct'))),
    def: Math.round((st.vit * 0.8 + G('def')) * (1 + (fx.defPct || 0) + G('defPct'))),
    spd: +((8 + st.agi * 0.6 + G('spd')) * (1 + G('spdPct'))).toFixed(1),
    crit: Math.min(0.6, 0.05 + st.agi * 0.004 + (fx.critAdd || 0) + G('crit')),
    critMult: T.critMult + G('critDmg'),
    dodge: Math.min(0.35, st.agi * 0.002 + (fx.dodgeAdd || 0) + G('dodge')),
    counterPct: (fx.counterPct || 0) + G('counterPct'),
    lowHpDmg: (fx.lowHpDmg || 0) + G('lowHpDmg'),
    lifesteal: G('lifesteal'), thornsPct: G('thornsPct'), armorPen: Math.min(0.8, G('armorPen')),
    startShieldPct: G('shieldPct'), guts: G('guts') ? 1 : 0, cdr: Math.min(2, G('cdr')),
    dmgReduce: Math.min(0.5, G('dmgReduce')) - G('dmgTakenUp'),
    skills: Object.entries(u.skills)
      .map(([id, lv]) => ({ s: CHRONICLE_SKILLS[id], lv }))
      .filter(x => x.s && x.lv > 0 && x.s.kind !== 'passive'),
  };
  for (const k of PASS_KEYS) if (G(k)) out[k] = G(k);
  return out;
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
export function addMastery(save0, classId, n = 1) {
  const u0 = save0.units[classId];
  if (!u0 || u0.sp < n) return save0;
  const save = clone(save0);
  const u = save.units[classId];
  u.sp -= n; u.mastery = (u.mastery || 0) + n;
  return save;
}

// ===== 보스 재도전 일일 제한 (1.207.0) =====
export function kstDateKey(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
// 첫 처치 전 = 무제한(Infinity), 이후 = 오늘 남은 횟수
export function bossAttemptsLeft(save, fieldId, now = Date.now()) {
  if (!save.progress.bossCleared[fieldId]) return Infinity;
  const d = save.bossDaily;
  const used = d && d.date === kstDateKey(now) ? (d.counts[fieldId] || 0) : 0;
  return Math.max(0, BOSS_DAILY_LIMIT - used);
}
function useBossAttempt(save, fieldId, now = Date.now()) {
  const key = kstDateKey(now);
  if (!save.bossDaily || save.bossDaily.date !== key) save.bossDaily = { date: key, counts: {} };
  save.bossDaily.counts[fieldId] = (save.bossDaily.counts[fieldId] || 0) + 1;
}

// ===== 🗝 던전 열쇠 (1.209.0) =====
// 날짜가 바뀌었으면 3개까지 채운다 (변경 없으면 같은 객체 반환)
export function refreshDungeonKeys(save0, now = Date.now()) {
  const today = kstDateKey(now);
  const k = save0.keys || { count: 0, refillDate: null, boughtDate: null, bought: 0 };
  if (save0.keys && k.refillDate === today) return save0;
  const save = clone(save0);
  save.keys = { ...k, count: Math.max(k.count || 0, DUNGEON_KEYS.dailyRefill), refillDate: today };
  return save;
}
export function keyCount(save) { return save.keys?.count || 0; }
export function keysBoughtToday(save, now = Date.now()) {
  return save.keys?.boughtDate === kstDateKey(now) ? (save.keys.bought || 0) : 0;
}
export function canBuyKey(save, now = Date.now()) {
  return save.gold >= DUNGEON_KEYS.shopPrice && keysBoughtToday(save, now) < DUNGEON_KEYS.shopDailyLimit && keyCount(save) < DUNGEON_KEYS.max;
}
export function buyDungeonKey(save0, now = Date.now()) {
  let save = refreshDungeonKeys(save0, now);
  if (!canBuyKey(save, now)) return save0;
  save = clone(save);
  const today = kstDateKey(now);
  save.gold -= DUNGEON_KEYS.shopPrice;
  save.keys.bought = (save.keys.boughtDate === today ? save.keys.bought || 0 : 0) + 1;
  save.keys.boughtDate = today;
  save.keys.count += 1;
  return save;
}
function addKeys(save, n) {
  if (!save.keys) save.keys = { count: 0, refillDate: null, boughtDate: null, bought: 0 };
  const before = save.keys.count;
  save.keys.count = Math.min(DUNGEON_KEYS.max, before + n);
  return save.keys.count - before;
}
export { addKeys as _addKeys };

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
  if (!it || !u || !itemUsable(it, classId)) return save0;
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
    essence += g.dismantle + (it.plus || 0) * (it.grade === 'unique' ? 3 : 1);
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
      const cur = save.inventory.find(i => i.uid === save.units[cid].equip[sl] && itemUsable(i, cid));
      const free = save.inventory.filter(i => i.slot === sl && itemUsable(i, cid) && !equippedBy(save, i.uid));
      free.sort((a, b) => itemPower(b) - itemPower(a));
      if (free[0] && (!cur || itemPower(free[0]) > itemPower(cur))) save = equipItem(save, cid, free[0].uid);
    }
  }
  return save;
}

// ===== 공용 창고 (2.0) — save.stash는 계정 공유 =====
export function moveToStash(save0, uids) {
  const save = clone(save0);
  save.stash = save.stash || [];
  let moved = 0;
  for (const uid of uids) {
    if (save.stash.length >= T.stashMax) break;
    if (equippedBy(save, uid)) continue;
    const idx = save.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) continue;
    save.stash.push(save.inventory[idx]); save.inventory.splice(idx, 1); moved++;
  }
  return { save, moved };
}
export function takeFromStash(save0, uid) {
  if (save0.inventory.length >= T.inventoryMax) return save0;
  const idx = (save0.stash || []).findIndex(i => i.uid === uid);
  if (idx < 0) return save0;
  const save = clone(save0);
  save.inventory.push(save.stash[idx]); save.stash.splice(idx, 1);
  return save;
}
export function dismantleStash(save0, uids) {
  const save = clone(save0);
  let essence = 0; let shard = 0;
  for (const uid of uids) {
    const idx = (save.stash || []).findIndex(i => i.uid === uid);
    if (idx < 0) continue;
    const it = save.stash[idx];
    const g = GRADES[gradeIdx(it.grade)];
    essence += g.dismantle + (it.plus || 0); shard += g.shard || 0;
    save.stash.splice(idx, 1);
  }
  save.mats.essence += essence; save.mats.shard += shard;
  return { save, essence, shard };
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
export function nextGrade(item) {
  if (item.grade === 'unique') return null; // 유니크는 승급 불가
  const i = gradeIdx(item.grade);
  return i < gradeIdx('epic') ? GRADES[i + 1].id : null;
}
export function promoteCost(item) { const n = nextGrade(item); return n ? FORGE.promoteCost[n] : null; }
export function canPromote(save, item) {
  const c = item && promoteCost(item);
  return !!c && save.gold >= c.gold && save.mats.essence >= c.essence && save.mats.shard >= c.shard;
}
export function promoteItem(save0, uid, rng = Math.random) {
  const it0 = save0.inventory.find(i => i.uid === uid);
  if (!canPromote(save0, it0)) return save0;
  const save = clone(save0);
  const it = save.inventory.find(i => i.uid === uid);
  const c = promoteCost(it);
  save.gold -= c.gold; save.mats.essence -= c.essence; save.mats.shard -= c.shard;
  it.grade = nextGrade(it);
  it.opts = it.opts || [];
  const o = rollOption(rng, it.cls, it.grade, it.opts); // 승급마다 옵션 +1
  if (o) it.opts.push(o);
  if (it.grade === 'epic') {
    save.stats.epics += 1;
    it.set = it.set || 'field';
    if (it.slot === 'accessory' && !it.eopt) it.eopt = pick(rng, Object.keys(EPIC_OPTIONS));
  }
  return save;
}

// ===== 사역마 편성 (1.212.0) — 칸은 주인공 레벨로 개방 =====
export function famSlotOpen(save, slot) {
  const lv = save.units[save.hero]?.lv || 1;
  return lv >= FAM_TUNING.slotLv[slot];
}
export function activeSubs(save) {
  const t = save.famTeam || {};
  return [famSlotOpen(save, 'sub1') ? t.sub1 : null, famSlotOpen(save, 'sub2') ? t.sub2 : null].filter(k => k && save.fams?.[k]);
}
export function activeMain(save) {
  const k = save.famTeam?.main;
  return k && save.fams?.[k] && famSlotOpen(save, 'main') ? k : null;
}

// 소환 — n회. useTicket이면 소환권(mats.sealPlus) 1장 = 1회. → { save, results, souls } (재료 부족이면 results null)
export function summonFam(save0, n, useTicket = false, rng = Math.random) {
  const m = save0.mats;
  if (useTicket ? (m.sealPlus || 0) < n : (m.famShard || 0) < n * FAM_TUNING.shardsPerSummon) return { save: save0, results: null };
  const save = clone(save0);
  if (useTicket) save.mats.sealPlus -= n; else save.mats.famShard -= n * FAM_TUNING.shardsPerSummon;
  const r = summonFamiliars(save.fams || {}, save.famPity, save.progress, n, rng);
  save.fams = r.fams; save.famPity = r.pity;
  save.mats.famSoul = (save.mats.famSoul || 0) + r.souls;
  return { save, results: r.results, souls: r.souls };
}
export function enhanceFam(save0, key) {
  const r = enhanceFamiliar(save0.fams, save0.mats.famSoul || 0, key);
  if (!r.ok) return save0;
  const save = clone(save0);
  save.fams = r.fams; save.mats.famSoul = r.souls;
  return save;
}
export function evolveFam(save0, key, rng = Math.random) {
  const r = evolveFamiliar(save0.fams, save0.mats.famSoul || 0, key, rng);
  if (!r.result) return { save: save0, result: null };
  const save = clone(save0);
  save.fams = r.fams; save.mats.famSoul = r.souls;
  return { save, result: r.result };
}
// slot: 'main' | 'sub1' | 'sub2' — 같은 사역마는 한 칸에만
export function setFamTeam(save0, slot, key) {
  const save = clone(save0);
  const t = { ...(save.famTeam || {}) };
  for (const k of ['main', 'sub1', 'sub2']) if (key && t[k] === key) t[k] = null;
  t[slot] = key || null;
  save.famTeam = t;
  return save;
}

// ===== 전투 준비 =====
export function partyCombatants(save, hpMap = null) {
  const list = save.party.map(cid => {
    const d = deriveUnit(save, cid);
    const hp = hpMap && hpMap[cid] != null ? Math.min(d.maxHp, hpMap[cid]) : d.maxHp;
    return { ...d, hp, leader: cid === save.hero };
  });
  const mk = activeMain(save);
  if (mk) {
    const hero = list.find(u => u.leader) || list[0];
    const fam = famCombatant(mk, save.fams[mk], hero, hero.famPct || 0);
    // 던전 층 사이: 쓰러진 사역마는 다음 층에서 HP 30%로 일어난다
    if (hpMap && hpMap.fam != null) fam.hp = Math.max(Math.round(fam.maxHp * 0.3), Math.min(fam.maxHp, hpMap.fam));
    list.push(fam);
  }
  return list;
}
// partyLv: 파티 평균 레벨 — 몹 레벨은 그 근처(±1)에서 사냥터 범위 안으로 맞춘다
export function partyLevel(save) {
  return Math.round(save.party.reduce((s, c) => s + save.units[c].lv, 0) / Math.max(1, save.party.length));
}
// ===== 스테이지 진행 (1.213.0) =====
// progress.stages[fid] = { cleared: 0~6, kills: [6] } — cleared = 관문을 넘은 스테이지 수
export function stageState(save, fid) {
  const st = save.progress.stages?.[fid];
  if (st) return st;
  // 구 저장: 보스를 잡은 지역은 전부 클리어, 진행 중인 지역은 누적 처치 수로 환산 (관문 통과로 간주)
  const field = CHRONICLE_FIELDS[fid - 1];
  const need = fieldStages(field)[0].kills;
  const cleared = save.progress.bossCleared[fid] ? FIELD_STAGES : Math.min(FIELD_STAGES, Math.floor((save.progress.fieldKills?.[fid] || 0) / need));
  return { cleared, kills: Array.from({ length: FIELD_STAGES }, (_, i) => (i < cleared ? need : 0)) };
}
export const stageUnlocked = (save, fid, i) => i === 0 || stageState(save, fid).cleared >= i;
export function gateReady(save, fid, i) {
  const st = stageState(save, fid);
  return st.cleared === i && (st.kills[i] || 0) >= fieldStages(CHRONICLE_FIELDS[fid - 1])[i].kills;
}
export const bossReady = (save, fid) => stageState(save, fid).cleared >= FIELD_STAGES;
// 관문 강적 — 그 스테이지 강적 1 + 일반 1, 레벨 +1
export function rollGateEncounter(field, stageIdx, rng) {
  const lv = fieldStages(field)[stageIdx].lv + STAGE_TUNING.gateLvAdd;
  const area = { hpMult: field.area.hpMult * STAGE_TUNING.gateEliteMult, atkMult: field.area.atkMult };
  return { type: 'gate', enemies: [buildChronicleEnemy(field.elites[stageIdx % field.elites.length], lv, 'e0', area), buildChronicleEnemy(pick(rng, field.normals), lv - 1, 'e1', field.area)] };
}

// ===== ×4 배속 이용권 (계정 공유, boostUntil = 만료 시각 ms) =====
export const boostLeftMs = (save, now = Date.now()) => Math.max(0, (save.boostUntil || 0) - now);
export const boostCost = (save) => BOOST.cost(save.units[save.hero]?.lv || 1);
export function buyBoost(save0, now = Date.now()) {
  const c = boostCost(save0);
  if (save0.gold < c || boostLeftMs(save0, now) + BOOST.minutes * 60000 > BOOST.maxStackMin * 60000) return save0;
  const save = clone(save0);
  save.gold -= c;
  save.boostUntil = Math.max(now, save.boostUntil || 0) + BOOST.minutes * 60000;
  return save;
}

// stage: 스테이지 번호(0~5) — 주면 몹 레벨을 그 스테이지로 고정 (강적은 +1)
export function rollFieldEncounter(field, rng, boss = false, partyLv = null, stage = null) {
  if (boss) return { type: 'boss', enemies: [buildChronicleEnemy(field.boss, field.bossLv, 'e0', field.area)] };
  if (stage != null) {
    const slv = fieldStages(field)[stage].lv;
    if (rng() < T.eliteChance && field.elites.length) {
      const list = [buildChronicleEnemy(pick(rng, field.elites), slv + 1, 'e0', field.area)];
      if (rng() < 0.5) list.push(buildChronicleEnemy(pick(rng, field.normals), slv, 'e1', field.area));
      return { type: 'elite', enemies: list, stage };
    }
    const n = rng() < 0.35 ? 1 : rng() < 0.75 ? 2 : 3;
    return { type: 'normal', stage, enemies: Array.from({ length: n }, (_, i) => buildChronicleEnemy(pick(rng, field.normals), slv, `e${i}`, field.area)) };
  }
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
// d = save.dungeon {id, tier, floor}
export function dungeonEncounter(d, rng) {
  const D = dungeonDef(d.id);
  const tier = DUNGEON_TIERS[d.tier || 0];
  const f = D.floors[d.floor];
  const area = { hpMult: D.area.hpMult * tier.hp, atkMult: D.area.atkMult * tier.atk };
  const lv = f.lv + tier.lv;
  if (f.boss) return { type: 'dungeonBoss', enemies: [buildChronicleEnemy(f.enemies[0], lv, 'e0', area)] };
  const n = Math.min(3, 2 + (rng() < 0.5 ? 1 : 0));
  const enemies = [];
  for (let i = 0; i < n; i++) enemies.push(buildChronicleEnemy(pick(rng, f.enemies), lv, `e${i}`, area));
  return { type: 'dungeonFloor', enemies };
}

// ===== 전투 시뮬 (풀오토) =====
export function simulateChronicleBattle(party0, enemies0, rng = Math.random) {
  const units = [
    ...party0.map(p => ({ ...p, buffs: {}, shield: Math.round((p.startShieldPct || 0) * p.maxHp), taunt: 0, tauntDef: 0, dots: [], cds: {}, turn: 0, critNext: false, firstDone: false, reviveUsed: false, emergencyUsed: false })),
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
    if (u.missingHpAtk) m += Math.floor((1 - u.hp / u.maxHp) * 10) * u.missingHpAtk;
    return m;
  };
  const healUnit = (t, h) => {
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + h);
    if (t.overhealShield) t.shield += Math.max(0, h - (t.hp - before));
    return t.hp - before;
  };
  // 쓰러짐 직전 처리 — 불굴(guts) · 부활(revive) · 응급(emergencyHeal)
  const onHurt = (def) => {
    if (def.hp <= 0 && def.guts > 0) { def.hp = 1; def.guts = 0; }
    if (def.hp <= 0 && def.revive && !def.reviveUsed) { def.reviveUsed = true; def.hp = Math.round(def.maxHp * def.revive); }
    if (def.hp > 0 && def.emergencyHeal && !def.emergencyUsed && def.hp < def.maxHp * 0.3) { def.emergencyUsed = true; def.hp = Math.min(def.maxHp, def.hp + Math.round(def.maxHp * def.emergencyHeal)); }
  };
  const damage = (att, def, mult, { noDodge = false, skill = false } = {}) => {
    if (!noDodge && rng() < (def.dodge || 0)) {
      if (def.dodgeHeal) healUnit(def, Math.round(def.maxHp * def.dodgeHeal));
      if (def.critAfterCounter) def.critNext = true;
      return { miss: true, d: 0 };
    }
    let raw = att.atk * mult * atkMod(att) * (1 + (skill ? att.skillDmg || 0 : 0)) * (0.9 + rng() * 0.2);
    if (att.execute && def.hp < def.maxHp * 0.3) raw *= 1 + att.execute;
    let crit = rng() < (att.crit || 0);
    if (att.side === 'party' && (att.critNext || (att.firstCrit && !att.firstDone))) crit = true;
    att.critNext = false; att.firstDone = true;
    if (crit) raw *= att.critMult || T.critMult;
    const defV = (def.def || 0) * (1 + (def.taunt > 0 ? def.tauntDef : 0)) * (1 - (att.armorPen || 0));
    let d = raw * T.defK / (T.defK + defV);
    d *= 1 - (def.dmgReduce || 0);
    if (def.taunt > 0 && def.tauntReduce) d *= 1 - def.tauntReduce;
    if (def.shield > 0 && def.shieldReduce) d *= 1 - def.shieldReduce;
    d = Math.max(1, Math.round(d));
    let absorbed = 0;
    if (def.shield > 0) { absorbed = Math.min(def.shield, d); def.shield -= absorbed; d -= absorbed; }
    def.hp = Math.max(0, def.hp - d);
    onHurt(def);
    if (att.lifesteal && d > 0 && att.hp > 0) healUnit(att, Math.round(d * att.lifesteal));
    if (def.thornsPct && d > 0 && att.hp > 0) att.hp = Math.max(0, att.hp - Math.max(1, Math.round(d * def.thornsPct)));
    return { d, crit, absorbed };
  };
  // 정령 화살 — 공격 뒤 확률 추가 타격 (유니크)
  const spiritHit = (u, hits) => {
    if (!u.spiritArrow || rng() >= u.spiritArrow) return;
    const t = pickEnemyTarget(u);
    if (!t) return;
    const r = damage(u, t, 0.8, { noDodge: true });
    hits.push({ t: t.id, d: r.d, c: r.crit, chain: true });
  };
  // 연격 — 단일 공격 뒤 추가 타격
  const chainHit = (u, t, hits) => {
    if (!u.chain || !t || t.hp <= 0 || rng() >= u.chain) return;
    const r = damage(u, t, 0.5, { noDodge: true });
    hits.push({ t: t.id, d: r.d, c: r.crit, chain: true });
  };
  const pickEnemyTarget = (u) => {
    const foes = alive(u.side === 'party' ? 'enemy' : 'party');
    if (!foes.length) return null;
    if (u.side === 'enemy') {
      const t = foes.find(f => f.taunt > 0);
      if (t && rng() < 0.85) return t;
      // 사역마가 있어도 적은 주인공을 노린다 (70%) — 동행이 방패막이로만 쓰이지 않게 (1.212.0)
      const leader = foes.find(f => f.leader);
      if (leader && foes.length > 1 && rng() < 0.7) return leader;
      return pick(rng, foes);
    }
    return foes.slice().sort((a, b) => a.hp - b.hp)[0];
  };
  const counterCheck = (def, att, hits) => {
    if (def.side !== 'party' || def.hp <= 0 || att.hp <= 0 || !def.counterPct) return;
    if (rng() < def.counterPct) {
      const times = def.counterDouble && rng() < def.counterDouble ? 2 : 1;
      for (let i = 0; i < times && att.hp > 0; i++) {
        const r = damage(def, att, 0.6 * (1 + (def.counterDmg || 0)), { noDodge: true });
        hits.push({ t: att.id, d: r.d, c: r.crit, counter: true, by: def.id });
      }
      if (def.critAfterCounter) def.critNext = true;
    }
  };

  const chooseSkill = (u) => {
    const ready = u.skills.filter(x => !(u.cds[x.s.id] > 0));
    const allies = alive('party');
    const foes = alive('enemy');
    const has = (k) => ready.find(x => x.s.kind === k);
    const lowAlly = allies.find(a => a.hp < a.maxHp * 0.55);
    const hurt = allies.filter(a => a.hp < a.maxHp * 0.7).length;
    if (hurt >= 2 && has('healAll')) return has('healAll');
    if (lowAlly && has('heal')) return has('heal');
    if (lowAlly && has('healAll')) return has('healAll');
    if (has('shield') && !allies.some(a => a.shield > 0)) return has('shield');
    if (has('buffAtk') && !allies.some(a => a.buffs.bless?.t > 0)) return has('buffAtk');
    if (has('rage') && !(u.buffs.rage?.t > 0)) return has('rage');
    if (has('taunt') && !(u.taunt > 0) && (u.fam || u.hp < u.maxHp * 0.6)) return has('taunt'); // 솔로: 도발 = 방어 태세 (위급하거나 강적·보스전에서만)
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
      const times = u.rageDouble && u.buffs.rage?.t > 0 ? 2 : 1;
      const hits = [];
      for (let i = 0; i < times && t.hp > 0; i++) {
        const r = damage(u, t, 1);
        hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss });
        if (!r.miss) chainHit(u, t, hits);
      }
      spiritHit(u, hits);
      push({ a: u.id, n: '공격', k: 'attack', hits });
      return;
    }
    const { s, lv } = choice;
    const v = s.base + s.perLv * (lv - 1);
    u.cds[s.id] = Math.max(1, s.cd + 1 - (u.cdr || 0));
    const hits = [];
    const foes = alive('enemy');
    const allies = alive('party');
    switch (s.kind) {
      case 'strike': case 'lifesteal': {
        const t = pickEnemyTarget(u);
        const times = u.rageDouble && u.buffs.rage?.t > 0 ? 2 : 1;
        let r = { d: 0 };
        for (let i = 0; i < times && t.hp > 0; i++) {
          r = damage(u, t, v, { skill: true });
          hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss });
          if (!r.miss) chainHit(u, t, hits);
        }
        spiritHit(u, hits);
        if (s.kind === 'lifesteal' && r.d > 0) {
          const h = Math.round(r.d * s.steal);
          u.hp = Math.min(u.maxHp, u.hp + h);
          hits.push({ t: u.id, h });
        }
        break;
      }
      case 'multi': {
        const n = s.hits + (s.id === 'e_volley' ? u.multiHitsAdd || 0 : 0);
        for (let i = 0; i < n; i++) {
          const t = pickEnemyTarget(u);
          if (!t) break;
          const r = damage(u, t, v, { skill: true });
          hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss });
        }
        break;
      }
      case 'aoe':
        for (const t of foes) { const r = damage(u, t, v, { skill: true }); hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss }); }
        break;
      case 'dot': {
        const targets = s.all ? foes : [pickEnemyTarget(u)];
        for (const t of targets) {
          t.dots.push({ v: Math.max(1, Math.round(u.atk * v * atkMod(u) * (1 + (u.dotDmg || 0)))), t: s.turns * (u.dotTurnsMult || 1), src: u.id, sn: s.name });
          hits.push({ t: t.id, dot: true });
        }
        break;
      }
      case 'heal': {
        const t = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const h = Math.round(u.healPower * v);
        healUnit(t, h);
        hits.push({ t: t.id, h });
        holyHit(u, h, hits);
        break;
      }
      case 'healAll':
        for (const a of allies) { const h = Math.round(u.healPower * v); healUnit(a, h); hits.push({ t: a.id, h }); holyHit(u, h, hits); }
        break;
      case 'shield':
        for (const a of allies) { const sh = Math.round(u.healPower * v); a.shield = Math.max(a.shield, sh); hits.push({ t: a.id, s: sh }); }
        break;
      case 'buffAtk':
        for (const a of allies) { a.buffs.bless = { v: v * (u.blessMult || 1), t: s.turns + (u.blessTurns || 0) }; hits.push({ t: a.id, buff: true }); }
        break;
      case 'rage':
        u.buffs.rage = { v, t: s.turns }; hits.push({ t: u.id, buff: true });
        break;
      case 'taunt':
        u.taunt = s.turns; u.tauntDef = v; hits.push({ t: u.id, buff: true });
        break;
      default: break;
    }
    if (u.skillShield) u.shield += Math.round(u.atk * u.skillShield);
    push({ a: u.id, n: s.name, k: s.kind, skill: true, hits });
  };
  // 치유 → 신성 피해 (사제 옵션·유니크)
  function holyHit(u, h, hits) {
    if (!u.holyDmg || h <= 0) return;
    const t = pickEnemyTarget(u);
    if (!t) return;
    const d = Math.max(1, Math.round(h * u.holyDmg));
    t.hp = Math.max(0, t.hp - d);
    hits.push({ t: t.id, d, holy: true });
  }
  // 전투 시작 효과 — 이프리트의 계약서
  for (const p of units.filter(x => x.side === 'party' && x.openInferno)) {
    for (const e of units.filter(x => x.side === 'enemy')) e.dots.push({ v: Math.max(1, Math.round(p.atk * p.openInferno)), t: 3 * (p.dotTurnsMult || 1), src: p.id, sn: '겁화(계약서)' });
  }

  let round = 0;
  let result = null;
  while (round < T.maxRounds) {
    round += 1;
    push({ round });
    const order = units.filter(u => u.hp > 0).sort((a, b) => (b.spd + rng() * 3) - (a.spd + rng() * 3));
    for (const u of order) {
      if (u.hp <= 0) continue;
      // 지속 피해 → 행동
      if (u.regenPct && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * u.regenPct));
      if (u.dots.length) {
        const total = u.dots.reduce((s, d) => s + d.v, 0);
        const dotSrc = {};
        for (const d of u.dots) if (d.src) { const k = `${d.src}|${d.sn || '지속 피해'}`; dotSrc[k] = (dotSrc[k] || 0) + Math.min(d.v, Math.max(0, u.hp)); }
        u.hp = Math.max(0, u.hp - total);
        u.dots = u.dots.map(d => ({ ...d, t: d.t - 1 })).filter(d => d.t > 0);
        push({ a: u.id, n: '지속 피해', k: 'dotTick', hits: [{ t: u.id, d: total, dot: true }], dotSrc });
        if (!alive('enemy').length) { result = 'win'; break; }
        if (u.leader && u.hp <= 0) { result = 'lose'; break; }
        if (u.hp <= 0) continue;
      }
      act(u);
      for (const k of Object.keys(u.cds)) if (u.cds[k] > 0) u.cds[k] -= 1;
      if (u.resetEvery && u.turn % u.resetEvery === 0) { const ks = Object.keys(u.cds).filter(k => u.cds[k] > 0); if (ks.length) u.cds[pick(rng, ks)] = 0; }
      for (const b of Object.values(u.buffs)) if (b.t > 0) b.t -= 1;
      if (u.taunt > 0) u.taunt -= 1;
      if (!alive('enemy').length) { result = 'win'; break; }
      if (!alive('party').length || units.some(x => x.leader && x.hp <= 0)) { result = 'lose'; break; }
    }
    if (result) break;
  }
  if (!result) result = 'lose';
  const finalHp = Object.fromEntries(units.filter(u => u.side === 'party').map(u => [u.id, u.hp]));
  return { result, events, rounds: round, finalHp };
}

// ===== 전투 보상 =====
function rollGrade(rng, grades) { return weighted(rng, grades); }
export function battleRewards(enemies, type, rng, mods = {}) {
  const exp = enemies.reduce((s, e) => s + Math.round((6 + e.lv * 3) * (e.rewardMult || 1) * (T.expMult || 1) * (e.tier === 'boss' ? 10 : e.tier === 'elite' ? 3 : 1)), 0);
  const gold = enemies.reduce((s, e) => s + Math.round((3 + e.lv * 2) * (e.tier === 'boss' ? 8 : e.tier === 'elite' ? 3 : 1) * (0.85 + rng() * 0.3)), 0);
  const tableKey = type === 'normal' ? 'normal' : type;
  const base = DROP_TABLE[tableKey] || DROP_TABLE.normal;
  const tbl = { ...base, grades: { ...base.grades } };
  if (tbl.grades.epic && mods.epicMult) tbl.grades.epic = tbl.grades.epic * mods.epicMult;
  const ilv = Math.max(...enemies.map(e => e.lv));
  const items = [];
  const count = tbl.items || 1;
  const heroCls = mods.heroCls || 'wanderer';
  const uChance = type === 'boss' ? UNIQUE_CHANCE.boss : type === 'dungeonBoss' ? (mods.uniqueChance || 0) : 0;
  for (let i = 0; i < count; i++) {
    if (rng() >= tbl.itemChance) continue;
    const uq = uChance && rng() < uChance ? rollUniqueItem(rng, ilv, heroCls) : null;
    items.push(uq || rollGear(rng, rollGrade(rng, tbl.grades), ilv, heroCls, mods.set || 'field'));
  }
  const essence = ri(rng, tbl.essence[0], tbl.essence[1]);
  const shard = tbl.shard ? Math.round(ri(rng, tbl.shard[0], tbl.shard[1]) * (mods.shardMult || 1)) : 0;
  return { exp, gold, items, essence, shard };
}

// 전투 결과를 저장에 반영 — ctx: { kind:'field'|'dungeon', fieldId, type }
export function applyBattle(save0, ctx, battle, rng = Math.random) {
  const save = clone(save0);
  save.stats.battles += 1;
  const summary = { result: battle.result, exp: 0, gold: 0, items: [], essence: 0, shard: 0, levelUps: {}, recruit: null, unlocks: [] };
  // 이미 처치한 보스 재도전은 결과와 관계없이 하루 횟수 1회 소모
  if (ctx.kind === 'field' && ctx.type === 'boss' && save.progress.bossCleared[ctx.fieldId]) useBossAttempt(save, ctx.fieldId);
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
  // 🗝 강적 처치 시 열쇠 드랍 (사냥터)
  if (ctx.kind === 'field') {
    const elites = ctx.enemies.filter(e => e.tier === 'elite').length;
    let got = 0;
    for (let i = 0; i < elites; i++) if (rng() < DUNGEON_KEYS.eliteDrop) got += addKeys(save, 1);
    if (got) summary.keys = got;
  }
  // 의뢰용 카운터 (1.206.0)
  save.progress.killsByKey = save.progress.killsByKey || {};
  for (const e of ctx.enemies) save.progress.killsByKey[e.key] = (save.progress.killsByKey[e.key] || 0) + 1;
  save.stats.elites = (save.stats.elites || 0) + ctx.enemies.filter(e => e.tier === 'elite').length;
  let mods = { heroCls: save.hero };
  if (ctx.kind === 'dungeon' && save.dungeon) {
    const ti = save.dungeon.tier || 0;
    const tier = DUNGEON_TIERS[ti];
    mods = { ...mods, epicMult: tier.epicMult, shardMult: tier.shardMult, set: dungeonDef(save.dungeon.id).set, uniqueChance: UNIQUE_CHANCE.dungeonBoss[ti] || 0 };
  }
  // 📜 계약서 조각 (1.212.0 — 사역마 소환 재료, 계정 공유)
  const fs = rollFamShards(ctx.enemies, ctx.type, rng, save.dungeon?.tier || 0);
  if (fs) { save.mats.famShard = (save.mats.famShard || 0) + fs; summary.famShards = fs; }
  const r = battleRewards(ctx.enemies, ctx.type, rng, mods);
  // 장비 옵션 — 경험치·골드 % (주인공 기준)
  const hd = deriveUnit(save, save.hero);
  r.exp = Math.round(r.exp * (1 + (hd.expPct || 0)));
  r.gold = Math.round(r.gold * (1 + (hd.goldPct || 0)));
  summary.exp = r.exp; summary.gold = r.gold; summary.essence = r.essence; summary.shard = r.shard;
  save.gold += r.gold; save.mats.essence += r.essence; save.mats.shard += r.shard;
  for (const cid of save.party) {
    const ups = gainExp(save.units[cid], r.exp);
    if (ups) summary.levelUps[cid] = save.units[cid].lv;
  }
  for (const it of r.items) {
    if (save.inventory.length >= T.inventoryMax) { const g = GRADES[gradeIdx(it.grade)]; save.mats.essence += g.dismantle; summary.autoDismantled = (summary.autoDismantled || 0) + 1; continue; }
    const item = { ...it, uid: save.nextUid++ };
    save.inventory.push(item);
    summary.items.push(item);
    if (item.grade === 'epic') save.stats.epics += 1;
    if (item.grade === 'unique') save.stats.uniques = (save.stats.uniques || 0) + 1;
  }
  if (ctx.kind === 'field') {
    const fid = ctx.fieldId;
    save.progress.fieldKills[fid] = (save.progress.fieldKills[fid] || 0) + ctx.enemies.length;
    // 스테이지 진행 (1.213.0)
    if (ctx.stage != null && ctx.type !== 'boss') {
      save.progress.stages = save.progress.stages || {};
      const st = clone(stageState(save, fid));
      if (ctx.type === 'gate') {
        if (st.cleared === ctx.stage) { st.cleared += 1; summary.stageClear = ctx.stage + 1; }
      } else {
        st.kills[ctx.stage] = (st.kills[ctx.stage] || 0) + ctx.enemies.length;
      }
      save.progress.stages[fid] = st;
    }
    if (ctx.type === 'boss' && !save.progress.bossCleared[fid]) {
      save.progress.bossCleared[fid] = true;
      if (fid < CHRONICLE_FIELDS.length) summary.unlocks.push(`사냥터 「${CHRONICLE_FIELDS[fid].name}」`);
      for (const D of CHRONICLE_DUNGEONS) if (fid === D.unlockField) summary.unlocks.push(`던전 「${D.name}」`);
    }
  }
  if (ctx.kind === 'dungeon' && save.dungeon) {
    save.dungeon.hp = battle.finalHp;
    if (ctx.type === 'dungeonBoss') {
      const { id, tier = 0 } = save.dungeon;
      save.progress.dungeonTier = save.progress.dungeonTier || {};
      const prev = save.progress.dungeonTier[id];
      if (prev == null || tier > prev) { save.progress.dungeonTier[id] = tier; if (tier < DUNGEON_TIERS.length - 1) summary.unlocks.push(`${dungeonDef(id).name} 「${DUNGEON_TIERS[tier + 1].label}」 난이도`); }
      save.dungeon = null; save.progress.dungeonClears += 1; summary.dungeonClear = true;
    }
    else save.dungeon.floor += 1;
  }
  return { save, summary };
}

// ===== 던전 =====
export function dungeonKeyCost(tier = 0) { return DUNGEON_TIERS[tier]?.keyCost || 1; }
export function startDungeon(save0, id = 'frostTomb', tier = 0, now = Date.now()) {
  if (!dungeonUnlocked(save0, id) || !dungeonTierUnlocked(save0, id, tier)) return save0;
  const fresh = refreshDungeonKeys(save0, now);
  const cost = dungeonKeyCost(tier);
  if (keyCount(fresh) < cost) return save0;
  const save = clone(fresh);
  save.keys.count -= cost;
  save.dungeon = { id, tier, floor: 0, hp: null };
  return save;
}
export function leaveDungeon(save0) {
  const save = clone(save0);
  save.dungeon = null;
  return save;
}

// ===== 사냥 보고서 (1.213.0) — 전투 사건에서 아군별·스킬별 피해 집계 =====
// 반환: { byUnit: {id: dmg}, bySkill: {'id|스킬': dmg}, rounds }
export function battleDamageStats(sim, party) {
  const ids = new Set(party.map(p => p.id));
  const byUnit = {}; const bySkill = {};
  const add = (id, skill, d) => {
    if (!ids.has(id) || !(d > 0)) return;
    byUnit[id] = (byUnit[id] || 0) + d;
    const k = `${id}|${skill}`; bySkill[k] = (bySkill[k] || 0) + d;
  };
  for (const e of sim.events) {
    if (e.k === 'dotTick') { for (const [k, d] of Object.entries(e.dotSrc || {})) { const [id, sn] = k.split('|'); add(id, sn, d); } continue; }
    if (!e.a || !e.hits) continue;
    for (const h of e.hits) {
      if (!(h.d > 0) || ids.has(h.t)) continue;
      if (h.counter) add(h.by, '반격', h.d);
      else add(e.a, h.chain ? `${e.n}(추가타)` : e.n, h.d);
    }
  }
  return { byUnit, bySkill, rounds: sim.rounds || 1 };
}
