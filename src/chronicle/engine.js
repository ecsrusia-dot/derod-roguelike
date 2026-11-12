// ============================================
// chronicle/engine.js — 황혼 연대기 순수 로직
// ============================================
// 저장 객체(save)를 받아 새 save를 돌려주는 순수 함수 + 전투 시뮬.
// 전투는 simulateChronicleBattle이 끝까지 계산해 사건 목록을 돌려주고, UI는 재생만 한다 (풀오토 관전).
// ============================================
import { levelCap, globalBuffFx } from './roster.js';
import { talentFx, canLearnTalent, talentNode, talentResetCost, talentTrees, tierUnlocked } from './talents.js';
import { BOSS_MECHS, BOSS_MECH_OF, fieldStages, FIELD_STAGES, STAGE_TUNING, BOOST, BAG_EXPAND, SALVAGE, SALVAGE_ICON, REBIRTH, REBIRTH_BRANCHES, expNeedFor, OPTION_LV_CURVE } from './data.js';
import { TOWER, TOWER_SHOP, towerUnlocked, isTowerBoss, towerEnemyLv, towerArea, towerFloorPicks, towerTheme, kstWeekKey } from './tower.js';
import { famCombatant, famRole, famSubFx, famOwnFx, famBondFx, rollFamShards, rollFamSouls, gainFamExp, FAM_AI, FAM_TUNING, summonFamiliars, enhanceFamiliar, evolveFamiliar } from './familiar.js';
import {
  CHRONICLE_TUNING as T, CHRONICLE_CLASSES, CHRONICLE_SKILLS, CHRONICLE_FIELDS, CHRONICLE_DUNGEON, CHRONICLE_DUNGEONS, DUNGEON_TIERS, dungeonDef,
  STAT_KEYS, SKILL_MAX_LV, MASTERY_PCT, BOSS_DAILY_LIMIT, DUNGEON_KEYS, GRADES, gradeIdx, SLOTS, CLASS_SLOTS, FORGE, DROP_TABLE,
  CLASS_GEAR_NAMES, EPIC_PREFIX, OPTION_DEFS, OPTION_POOLS, OFFHAND_BASE, CLASS_DROP, UNIQUE_DROP, EPIC_OPTIONS, UNIQUE_ITEMS, UNIQUE_CHANCE,
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
  // 1.270.0 — 지금까지 찍은 양 기준으로 목표 비율에 가장 모자란 능력치부터 1점씩 (레벨마다 4점이어도 비율이 정확히 맞는다)
  const base = cls.base || {};
  while (u.points > 0) {
    const spent = (k) => (u.stats[k] || 0) - (base[k] || 0);
    const total = keys.reduce((t, k) => t + Math.max(0, spent(k)), 0) + 1;
    let best = keys[0], gap = -Infinity;
    for (const k of keys) { const g = (ratio[k] / sum) * total - spent(k); if (g > gap) { gap = g; best = k; } }
    u.stats[best] += 1; u.points -= 1;
  }
  let guard = 0;
  while (u.sp > 0 && guard++ < 50) {
    const learnable = classSkills(u.classId, u.rebirth?.branch).filter(s => s.reqLv <= u.lv && (u.skills[s.id] || 0) < SKILL_MAX_LV);
    if (!learnable.length) { autoSpendTalents(u); break; }
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
  const f = CHRONICLE_FIELDS[fieldId - 1];
  if (f?.reqRebirth && (save.units[save.hero]?.rebirth?.count || 0) < f.reqRebirth) return false; // 3부는 전승자만
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
  return item.grade === 'epic' ? `${EPIC_PREFIX[item.set] || EPIC_PREFIX.field} ${base}` : item.grade === 'mythic' ? `전승의 ${base}` : base;
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
  if (k === 'scdr') { const list = scdrSkillList(cls); if (!list.length) return null; return { k, v: 1, sk: pick(rng, list) }; }
  return { k, v };
}
// 1.241.0 「스킬 재사용 단축」 옵션 대상 — 그 직업의 시전 스킬 (갈래 전용 제외, 재사용 2턴 이상)
export function scdrSkillList(cls) {
  return Object.values(CHRONICLE_SKILLS).filter(s => s.cls === cls && !s.branch && s.kind !== 'passive' && (s.cd || 0) >= 2).map(s => s.id);
}
// 구 장비의 「재사용 단축(모든 스킬)」 옵션 → 그 직업 스킬 1개 전용으로 읽는다 (장비 번호로 고정 — 매번 같은 스킬)
function normOpt(item, o) {
  // 1.270.0 PM 결정 — 장비 「속도」 옵션은 「추가 타격 확률」로 (속도 1~3 → 3.3~10%, 읽을 때 변환)
  if (o.k === 'spd') return { k: 'chain', v: +(o.v / 3 * 0.1).toFixed(3) };
  if (o.k !== 'cdr' || item.named) return o;
  const list = scdrSkillList(item.cls);
  if (!list.length) return o;
  return { k: 'scdr', v: o.v || 1, sk: list[Math.abs((item.uid ?? 0) * 7 + 3) % list.length] };
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
  if (grade === 'mythic' && slot === 'accessory') it.eopt = pick(rng, Object.keys(EPIC_OPTIONS));
  return it;
}
// 드랍 직업 분배 (현재 직업 70 / 다른 직업 25 / 공용 장신구 5)
function rollDropClass(rng, heroCls, D = CLASS_DROP) {
  const r = rng();
  if (r < D.common) return 'common';
  if (r < D.common + D.own) return heroCls;
  return pick(rng, CHRONICLE_CLASSES.map(c => c.id).filter(id => id !== heroCls));
}
export function rollGear(rng, grade, ilv, heroCls, set = 'field') {
  const cls = rollDropClass(rng, heroCls);
  const slot = cls === 'common' ? 'accessory' : pick(rng, CLASS_SLOTS);
  return makeItem(rng, { cls, slot, grade, ilv, set });
}
export function rollUniqueItem(rng, ilv, heroCls) {
  const cls = rollDropClass(rng, heroCls, UNIQUE_DROP);
  const pool = Object.values(UNIQUE_ITEMS).filter(u => u.cls === cls && !u.disabled && !u.branch);
  if (!pool.length) return null;
  return makeItem(rng, { named: pick(rng, pool).id, ilv });
}
// 하위 호환 이름 (의뢰 보상 등)
export function rollItem(rng, grade, ilv, slot = null, set = 'field', heroCls = 'wanderer') {
  return rollGear(rng, grade, ilv, heroCls, set);
}
// 유니크 3번째 옵션 (1.269.0 PM 결정) — 고정 옵션 2개 + 그 직업 풀에서 무작위 1개
//   장비 번호(uid)로 고정 굴림 → 저장하지 않고 읽을 때 계산 (기존 유니크도 바로 생긴다)
function uidRng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function itemOpts(item) {
  const base = item?.opts || [];
  if (!item?.named || item.uid == null) return base;
  const u = UNIQUE_ITEMS[item.named]; const want = GRADES[gradeIdx('unique')]?.opts || 0;
  if (!u || base.length >= want) return base;
  const o = rollOption(uidRng(item.uid * 9973 + 17), u.cls, 'unique', base);
  return o ? [...base, o] : base;
}
// 강화 누적 보너스 (1.268.0 — 고강화일수록 단계당 상승폭이 커진다)
export const enhanceBonus = (plus) => FORGE.enhanceBonus[Math.max(0, Math.min(FORGE.maxEnhance, plus || 0))] || 0;
// 옵션 레벨 배율 (1.268.0 — 저레벨 장비의 옵션이 고레벨 장비를 압도하지 않게)
export function optionLvMult(ilv) {
  const C = OPTION_LV_CURVE; const L = ilv || 1;
  if (L <= C[0][0]) return C[0][1];
  for (let i = 1; i < C.length; i++) if (L <= C[i][0]) { const [a, x] = C[i - 1]; const [b, y] = C[i]; return +(x + (y - x) * (L - a) / (b - a)).toFixed(4); }
  const [a, x] = C[C.length - 2]; const [b, y] = C[C.length - 1];
  return +(y + (y - x) / (b - a) * (L - b)).toFixed(4);
}
// 장비가 주는 수치 전부 (기본 능력치 + 옵션) — 고유 효과(fx)는 gearTotals에서 합산
export function itemStats(item) {
  if (!item) return {};
  const g = GRADES[gradeIdx(item.grade)] || GRADES[0];
  const gm = g.mult * (1 + enhanceBonus(item.plus));
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
  const optM = (1 + 0.5 * enhanceBonus(item.plus)) * optionLvMult(L);
  for (const o0 of itemOpts(item)) {
    const o = normOpt(item, o0);
    if (o.k === 'scdr') { add(`scdr_${o.sk}`, o.v); continue; }
    add(o.k, o.k === 'cdr' ? o.v : (OPTION_DEFS[o.k]?.pct ? +(o.v * optM).toFixed(3) : Math.max(1, Math.round(o.v * optM))));
  }
  return out;
}
export function itemPower(item) {
  const s = itemStats(item);
  let pctSum = 0;
  let scdr = 0;
  for (const [k, v] of Object.entries(s)) { if (OPTION_DEFS[k]?.pct) pctSum += v; if (k.startsWith('scdr_')) scdr += v; }
  return Math.round((s.atk || 0) * 2 + (s.def || 0) * 2 + (s.hp || 0) * 0.3 + (s.spd || 0) * 3 + (s.cdr || 0) * 20 + scdr * 10 + pctSum * (30 + item.ilv * 5)
    + (item.named ? 60 + item.ilv * 3 : 0) + (item.eopt ? 30 + item.ilv * 2 : 0));
}
export function statLabel(k, v) {
  const d = OPTION_DEFS[k];
  if (k === 'atk') return `공격 ${v}`;
  if (k === 'def') return `방어 ${v}`;
  if (k === 'hp') return `HP ${v}`;
  if (k.startsWith('scdr_')) return `「${CHRONICLE_SKILLS[k.slice(5)]?.name || '스킬'}」 재사용 -${v}턴`;
  if (!d) return `${k} ${v}`;
  if (d.pct) return `${d.label} +${Math.round(v * 1000) / 10}%`;
  return `${d.label} ${k === 'cdr' ? '-' : '+'}${v}${d.unit || ''}`;
}

// 전승 캐릭터 착용 제한 (1.220.0) — 장비 레벨 ≤ 내 레벨 + 5 (전승 전에는 제한 없음)
export function canWear(it, u) {
  const ub = it.named && UNIQUE_ITEMS[it.named]?.branch;
  if (ub && u?.rebirth?.branch !== ub) return false; // 갈래 유니크는 그 갈래만
  // 1.225.0 PM: 장비 레벨이 내 레벨 이하일 때만 착용 (전승 여부 무관)
  return (it.ilv || 1) <= (u?.lv || 1);
}
// 전승 단계 (1.221.0) — 전승 횟수만큼 적 강화. UI·시뮬이 조우 직후 호출
export function rebirthCount(save) { return save.units[save.hero]?.rebirth?.count || 0; }
// 위압 (1.235.0) — 적이 주인공보다 레벨이 높을수록 단계별 강화 (T.intimidate 표). 단계 0 = 없음
export function intimidateLevel(heroLv, enemyLv) {
  const steps = T.intimidate || [];
  if (heroLv == null || enemyLv == null) return 0;
  const gap = enemyLv - heroLv;
  let n = 0;
  steps.forEach((s, i) => { if (gap >= s.gap) n = i + 1; });
  return n;
}
export const intimidateStep = (n) => (n > 0 ? (T.intimidate || [])[n - 1] : null);
// 전투 직전 적 보정 — 전승 단계 + 위압. 전투 경로(사냥·던전·첨탑·미리보기)는 반드시 이 함수를 거친다
export function scaleEnemiesForRebirth(save, enemies) {
  const c = rebirthCount(save);
  const hm = 1 + REBIRTH.enemyHp * c; const am = 1 + REBIRTH.enemyAtk * c;
  const heroLv = save.units?.[save.hero]?.lv;
  return enemies.map(e => {
    const n = intimidateLevel(heroLv, e.lv);
    const st = intimidateStep(n);
    const h = hm * (st ? st.hp : 1); const a = am * (st ? st.atk : 1);
    if (h === 1 && a === 1) return e;
    return { ...e, hp: Math.round(e.hp * h), maxHp: Math.round(e.maxHp * h), atk: Math.round(e.atk * a), ...(c ? { rebirthTier: c } : {}), ...(n ? { intim: n } : {}) };
  });
}
function gearTotals(save, u) {
  const t = {};
  const add = (k, v) => { t[k] = (t[k] || 0) + v; };
  for (const slot of Object.keys(u.equip)) {
    const uid = u.equip[slot];
    const it = uid != null ? save.inventory.find(i => i.uid === uid) : null;
    if (!it || !itemUsable(it, u.classId) || !canWear(it, u)) continue;
    for (const [k, v] of Object.entries(itemStats(it))) add(k, v);
    const ud = uniqueDef(it);
    if (ud) for (const [k, v] of Object.entries(ud.fx)) add(k, v);
    const eo = epicOptOf(it);
    if (eo) for (const [k, v] of Object.entries(eo.fx)) add(k, v);
  }
  return t;
}
// 실제 재사용 단축 = 모든 스킬(유니크·특성) + 이 스킬 전용(일반 장비·시간의 모래) — 합계 최대 2턴
export const CDR_CAP = 2;
export function skillCdrOf(u, skillId) { return Math.min(CDR_CAP, (u.cdr || 0) + (u.skillCdr?.[skillId] || 0)); }
function passiveFx(u) {
  const fx = {};
  for (const [id, lv] of Object.entries(u.skills)) {
    const s = CHRONICLE_SKILLS[id];
    if (!s || s.kind !== 'passive' || lv <= 0) continue;
    for (const [k, v] of Object.entries(s.fx(lv))) fx[k] = (fx[k] || 0) + v;
  }
  return fx;
}

// 대기형 효과 출처 (1.260.0) — 전투 시작 연출에 「어디서 온 효과인지」 이름을 보여 준다 (전투 계산과 무관)
export const STANDBY_KEYS = ['firstCrit', 'revive', 'guts', 'emergencyHeal'];
function standbySources(save, u, br) {
  const src = {};
  const add = (fx, name) => { for (const k of STANDBY_KEYS) if (fx?.[k]) (src[k] ||= []).includes(name) || src[k].push(name); };
  for (const slot of Object.keys(u.equip)) {
    const uid = u.equip[slot];
    const it = uid != null ? save.inventory.find(i => i.uid === uid) : null;
    if (!it || !itemUsable(it, u.classId) || !canWear(it, u)) continue;
    const ud = uniqueDef(it); if (ud) add(ud.fx, ud.name);
    const eo = epicOptOf(it); if (eo) add(eo.fx, eo.name);
  }
  if (br) add(br.fx, br.name);
  for (const [id, r] of Object.entries(u.talents || {})) { const n = r && talentNode(id); if (n) add(n.fx, n.name); }
  add(famSubFx(save.fams, activeSubs(save), u.lv), '보조 사역마');
  add(famOwnFx(save.fams), '사역마 보유 효과'); add(famBondFx(save.fams), '사역마 인연');
  add(globalBuffFx(save.roster, u.classId), '원정대');
  return src;
}
// 전투 능력치 (2.0 — 장비 옵션·유니크 효과 합산)
const PASS_KEYS = ['counterDouble', 'tauntReduce', 'critAfterCounter', 'emergencyHeal', 'dotTurnsMult', 'openInferno', 'skillShield', 'resetEvery',
  'overhealShield', 'missingHpAtk', 'rageDouble', 'rageTurnsAdd', 'rageLifesteal', 'multiHitsAdd', 'spiritArrow', 'dodgeHeal', 'firstCrit', 'revive', 'shieldReduce', 'blessMult', 'blessTurns',
  'execute', 'chain', 'holyDmg', 'regenPct', 'counterDmg', 'skillDmg', 'dotDmg', 'expPct', 'goldPct', 'dropPct', 'famPct', 'fam_tank', 'fam_healer', 'fam_dps'];
const MULT_KEYS = ['dotTurnsMult', 'blessMult'];
export function deriveUnit(save, classId) {
  const u = save.units[classId];
  const cls = chronicleClass(classId);
  const g = gearTotals(save, u);
  // 보조 사역마 패시브 (1.212.0) — 장비 합산과 같은 키로 더한다
  for (const [k, v] of Object.entries(famSubFx(save.fams, activeSubs(save), u.lv))) g[k] = (g[k] || 0) + v;
  // 사역마 보유 효과(남령+) · 인연 (1.228.0) — 가지고만 있으면 적용
  for (const fx of [famOwnFx(save.fams), famBondFx(save.fams)]) for (const [k, v] of Object.entries(fx)) g[k] = (g[k] || 0) + v;
  // 원정대 전역 버프 (1.229.0) — 다른 캐릭터들의 Lv.20/40/60/80/100 달성 보상
  for (const [k, v] of Object.entries(globalBuffFx(save.roster, classId))) g[k] = (g[k] || 0) + v;
  // 전승 갈래 기본 효과 (1.220.0)
  const br = u.rebirth?.branch && REBIRTH_BRANCHES[u.rebirth.branch];
  if (br) for (const [k, v] of Object.entries(br.fx)) g[k] = (g[k] || 0) + v;
  // 특성 트리 (1.224.0) — sb_<스킬> = 스킬 위력, 배율 키는 큰 값만 (장비 ×2와 곱해지지 않게)
  const skillBoost = {};
  for (const [k, v] of Object.entries(talentFx(u))) {
    if (k.startsWith('sb_')) skillBoost[k.slice(3)] = (skillBoost[k.slice(3)] || 0) + v;
    else if (MULT_KEYS.includes(k)) g[k] = Math.max(g[k] || 0, v);
    else g[k] = (g[k] || 0) + v;
  }
  // 1.247.0 PM 결정 「겹칠 때만 대체」 — 「광폭화 중 2회」가 두 출처(광기의 혈인 + 특성 피의 광란)에서 겹치면
  // 겹친 몫은 「광폭화 지속 +1턴 · 광폭화 중 흡혈 2배」로 바뀐다 (2회 공격은 2중첩이 없으므로)
  if ((g.rageDouble || 0) >= 2) { g.rageTurnsAdd = (g.rageTurnsAdd || 0) + 1; g.rageLifesteal = 1; }
  const rb = 1 + REBIRTH.bonusPct * (u.rebirth?.count || 0);
  const G = (k) => g[k] || 0;
  const fx = passiveFx(u);
  // 1.270.0 효율 감소 구간 — 한 능력치가 레벨×softPerLv를 넘으면 넘친 몫은 softMult배 (몰빵 방지)
  const SK0 = T.stat || {};
  const softCap = Math.max(SK0.softMin || 0, u.lv * (SK0.softPerLv || 1e9));
  const effStat = (v) => (v <= softCap ? v : softCap + (v - softCap) * (SK0.softMult ?? 1));
  const st = { str: effStat(u.stats.str), int: effStat(u.stats.int), agi: effStat(u.stats.agi), vit: effStat(u.stats.vit) };
  const main = cls.main === 'int' ? st.int : cls.main === 'agi' ? st.agi : st.str;
  const mast = 0; // 마스터리 폐지 (1.224.0 — 특성 트리로 환급)
  // 1.270.0 비주 능력치 보조 효과 — 힘 = 방어 관통 · 지능 = 스킬 피해 (모든 직업 공통)
  const SK = T.stat || { strPen: 0, intSkill: 0, agiCrit: 0.004, agiDodge: 0.002, critOverflow: 0 };
  g.armorPen = (g.armorPen || 0) + st.str * SK.strPen;
  g.skillDmg = (g.skillDmg || 0) + st.int * SK.intSkill;
  g.dmgReduce = (g.dmgReduce || 0) + st.str * (SK.strReduce || 0);
  g.chain = (g.chain || 0) + st.agi * (SK.agiChain || 0);
  const critRaw = 0.05 + st.agi * SK.agiCrit + (fx.critAdd || 0) + G('crit');
  const atk = (main * 2.2 + u.lv * 1.5 + G('atk')) * (1 + (fx.atkPct || 0) + G('atkPct') + mast) * rb;
  const out = {
    id: classId, classId, name: cls.name, side: 'party', lv: u.lv, magic: cls.magic,
    maxHp: Math.round((50 + st.vit * 10 + u.lv * 6 + G('hp')) * (1 + (fx.hpPct || 0) + G('hpPct') + mast) * rb),
    atk: Math.round(atk),
    healPower: Math.round(Math.max(st.int * 2.2 + u.lv * 1.5 + G('atk') * 0.5, atk * G('healFromAtk')) * (1 + G('healPct'))),
    def: Math.round((st.vit * 0.8 + G('def')) * (1 + (fx.defPct || 0) + G('defPct'))),
    spd: +((8 + st.agi * 0.6 + G('spd')) * (1 + G('spdPct'))).toFixed(1),
    crit: Math.min(0.6, critRaw),
    critMult: T.critMult + G('critDmg') + Math.max(0, critRaw - 0.6) * (SK.critOverflow || 0), // 상한 초과분 → 치명 피해 (1.270.0)
    dodge: Math.min(0.35, st.agi * SK.agiDodge + (fx.dodgeAdd || 0) + G('dodge')),
    counterPct: (fx.counterPct || 0) + G('counterPct'),
    lowHpDmg: (fx.lowHpDmg || 0) + G('lowHpDmg'),
    lifesteal: Math.min(T.lifestealCap || 1, G('lifesteal')), thornsPct: G('thornsPct'), armorPen: Math.min(0.8, G('armorPen')),
    startShieldPct: Math.min(T.shieldCap || 1, G('shieldPct')), guts: G('guts') ? 1 : 0, cdr: Math.min(2, G('cdr')),
    dmgReduce: Math.min(0.5, G('dmgReduce')) - G('dmgTakenUp'),
    skills: Object.entries(u.skills)
      .map(([id, lv]) => ({ s: CHRONICLE_SKILLS[id], lv }))
      .filter(x => x.s && x.lv > 0 && x.s.kind !== 'passive'),
  };
  for (const k of PASS_KEYS) if (G(k)) out[k] = G(k);
  if (out.chain) out.chain = Math.min(T.chainCap || 1, out.chain); // 추가 타격 확률 상한 (1.270.0)
  if (out.guts || out.revive || out.firstCrit || out.emergencyHeal) out.standbySrc = standbySources(save, u, br);
  if (out.rageDouble) out.rageDouble = 1; // 중첩 수가 아닌 보유 여부
  if (Object.keys(skillBoost).length) out.skillBoost = skillBoost;
  // 스킬별 재사용 단축 (1.241.0) — 일반 장비 「「스킬」 재사용 -1턴」 + 에픽 「시간의 모래」(가장 긴 스킬)
  const skillCdr = {};
  for (const [k, v] of Object.entries(g)) if (k.startsWith('scdr_') && v) skillCdr[k.slice(5)] = (skillCdr[k.slice(5)] || 0) + v;
  if (G('longCdr')) {
    const longest = out.skills.slice().sort((a, b) => (b.s.cd || 0) - (a.s.cd || 0))[0];
    if (longest) skillCdr[longest.s.id] = (skillCdr[longest.s.id] || 0) + G('longCdr');
  }
  if (Object.keys(skillCdr).length) out.skillCdr = skillCdr;
  if (out.holyDmg) out.holyDmg = Math.min(T.holyCap || 9, out.holyDmg); // 치유→신성 피해 상한 (1.216.0)
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
// 능력치 재분배 (1.270.0) — 찍은 포인트를 전부 돌려받는다. 캐릭터당 첫 1회 무료, 이후 골드 (레벨 × statResetGold)
export function statResetCost(u) { return u?.statResetUsed ? Math.round((u.lv || 1) * (T.statResetGold || 300)) : 0; }
export function canResetStats(save, classId) {
  const u = save.units[classId];
  if (!u) return false;
  const base = chronicleClass(classId).base || {};
  const spent = STAT_KEYS.reduce((t, k) => t + Math.max(0, (u.stats[k] || 0) - (base[k] || 0)), 0);
  return spent > 0 && save.gold >= statResetCost(u);
}
export function resetStats(save0, classId) {
  if (!canResetStats(save0, classId)) return save0;
  const save = clone(save0);
  const u = save.units[classId];
  const base = chronicleClass(classId).base || {};
  const cost = statResetCost(u);
  let back = 0;
  for (const k of STAT_KEYS) { const extra = Math.max(0, (u.stats[k] || 0) - (base[k] || 0)); back += extra; u.stats[k] -= extra; }
  u.points = (u.points || 0) + back; u.statResetUsed = true;
  save.gold -= cost;
  return save;
}
// 효율 감소 기준 (1.270.0) — 이 값을 넘는 능력치는 1점당 효과가 줄어든다
export function statSoftCap(u) { const S = T.stat || {}; return Math.round(Math.max(S.softMin || 0, (u?.lv || 1) * (S.softPerLv || 1e9))); }
export function autoAllocate(save0, classId) {
  const save = clone(save0);
  const u = save.units[classId];
  const sp = u.sp;
  const grown = autoGrowUnit({ ...u, sp: 0 });
  save.units[classId] = { ...grown, sp };
  return save;
}
export function canLearn(u, s) {
  return u.sp > 0 && s.reqLv <= u.lv && (u.skills[s.id] || 0) < SKILL_MAX_LV && (!s.branch || s.branch === u.rebirth?.branch);
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
// ===== 특성 트리 (1.224.0) =====
export function learnTalent(save0, classId, nodeId) {
  const u0 = save0.units[classId];
  if (!u0 || !canLearnTalent(u0, nodeId)) return save0;
  const save = clone(save0);
  const u = save.units[classId];
  u.talents = { ...(u.talents || {}), [nodeId]: (u.talents?.[nodeId] || 0) + 1 };
  u.sp -= 1;
  return save;
}
// 자동 배분 (봇·동료용) — 가장 많이 찍은 갈래를 먼저 채우고, 단이 막히면 다른 갈래
export function autoSpendTalents(u) {
  u.talents = u.talents || {};
  const trees = talentTrees(u.classId);
  let guard = 0;
  while (u.sp > 0 && guard++ < 200) {
    let picked = null;
    for (const tree of trees) {
      for (let ti = tree.tiers.length - 1; ti >= 0 && !picked; ti--) {
        if (!tierUnlocked(u, tree.id, ti)) continue;
        picked = tree.tiers[ti].find(n => (u.talents[n.id] || 0) < n.max);
      }
      if (picked) break;
    }
    if (!picked) break;
    u.talents[picked.id] = (u.talents[picked.id] || 0) + 1; u.sp -= 1;
  }
  return u;
}
export function canResetTalents(save, classId) {
  const u = save.units[classId];
  if (!u || !Object.keys(u.talents || {}).length) return false;
  const c = talentResetCost(u);
  return save.gold >= c.gold && (save.mats.talentScroll || 0) >= c.scrolls;
}
export function resetTalents(save0, classId) {
  if (!canResetTalents(save0, classId)) return save0;
  const save = clone(save0);
  const u = save.units[classId];
  const c = talentResetCost(u);
  const spent = Object.values(u.talents).reduce((a, b) => a + b, 0);
  save.gold -= c.gold;
  save.mats.talentScroll = (save.mats.talentScroll || 0) - c.scrolls;
  u.talents = {}; u.sp += spent;
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
// cap = 원정대 레벨 상한 (1.229.0) — 상한에 닿으면 경험치를 받지 않는다 (기존 고레벨 저장은 레벨 유지)
export const levelCapOf = (save) => levelCap(save?.roster);
function gainExp(u, n, cap = T.maxLevel) {
  let ups = 0;
  if (u.lv >= cap) return 0;
  u.exp += n;
  while (u.lv < cap && u.exp >= expNeedFor(u)) {
    u.exp -= expNeedFor(u);
    u.lv += 1; u.points += T.pointsPerLevel; u.sp += T.spPerLevel; ups++;
  }
  return ups;
}

// 오프라인 보상 지급 (1.233.0) — 경험치(원정대 상한 적용)·골드·정수 → { save, ups }
export function grantOffline(save0, rw) {
  const save = clone(save0);
  const u = save.units[save.hero];
  const ups = u ? gainExp(u, rw.exp || 0, levelCapOf(save)) : 0;
  save.gold += rw.gold || 0;
  save.mats = { ...save.mats, essence: (save.mats.essence || 0) + (rw.essence || 0) };
  return { save, ups };
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
  if (!it || !u || !itemUsable(it, classId) || !canWear(it, u)) return save0;
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
// 분해 재화 (1.217.0) — 등급별 재화 종류 + 강화 단계 ✦ 환급
export function salvageOf(it) {
  const s = SALVAGE[it.grade] || {};
  const out = {};
  if (s.gold) out.gold = s.gold[0] + s.gold[1] * (it.ilv || 1);
  for (const k of ['essence', 'shard', 'famShard', 'famSoul']) if (s[k]) out[k] = s[k];
  if (it.plus) out.essence = (out.essence || 0) + it.plus * (it.grade === 'unique' ? 3 : 1);
  return out;
}
function addSalvage(save, tot) {
  save.gold += tot.gold || 0;
  for (const k of ['essence', 'shard', 'famShard', 'famSoul']) if (tot[k]) save.mats[k] = (save.mats[k] || 0) + tot[k];
}
export function salvageText(tot) {
  return Object.entries(SALVAGE_ICON).filter(([k]) => tot[k]).map(([k, ic]) => `${ic} +${tot[k].toLocaleString()}`).join(' ') || '없음';
}
export function dismantleItems(save0, uids) {
  const save = clone(save0);
  const tot = {};
  for (const uid of uids) {
    if (equippedBy(save, uid)) continue;
    const idx = save.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) continue;
    for (const [k, v] of Object.entries(salvageOf(save.inventory[idx]))) tot[k] = (tot[k] || 0) + v;
    save.inventory.splice(idx, 1);
  }
  addSalvage(save, tot);
  return { save, ...tot, essence: tot.essence || 0, shard: tot.shard || 0, salvage: tot };
}
// 가방 한도 (1.217.0) — 기본 + 확장
export function bagMax(save) { return T.inventoryMax + BAG_EXPAND.step * (save.bagExpand || 0); }
export function bagExpandCost(save) { return bagMax(save) >= BAG_EXPAND.max ? null : BAG_EXPAND.cost(save.bagExpand || 0); }
export function expandBag(save0) {
  const c = bagExpandCost(save0);
  if (c == null || save0.gold < c) return save0;
  const save = clone(save0);
  save.gold -= c; save.bagExpand = (save.bagExpand || 0) + 1;
  return save;
}
// 빈 슬롯·더 강한 장비 자동 장착 (파티 전원)
export function autoEquip(save0) {
  let save = clone(save0);
  for (const cid of save.party) {
    for (const sl of SLOTS.map(s => s.id)) {
      const u = save.units[cid];
      const cur = save.inventory.find(i => i.uid === u.equip[sl] && itemUsable(i, cid) && canWear(i, u));
      const free = save.inventory.filter(i => i.slot === sl && itemUsable(i, cid) && canWear(i, u) && !equippedBy(save, i.uid));
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
  if (save0.inventory.length >= bagMax(save0)) return save0;
  const idx = (save0.stash || []).findIndex(i => i.uid === uid);
  if (idx < 0) return save0;
  const save = clone(save0);
  save.inventory.push(save.stash[idx]); save.stash.splice(idx, 1);
  return save;
}
export function dismantleStash(save0, uids) {
  const save = clone(save0);
  const tot = {};
  for (const uid of uids) {
    const idx = (save.stash || []).findIndex(i => i.uid === uid);
    if (idx < 0) continue;
    for (const [k, v] of Object.entries(salvageOf(save.stash[idx]))) tot[k] = (tot[k] || 0) + v;
    save.stash.splice(idx, 1);
  }
  addSalvage(save, tot);
  return { save, ...tot, essence: tot.essence || 0, shard: tot.shard || 0, salvage: tot };
}

// ===== 대장간 =====
export function enhanceCost(item) { return FORGE.enhanceCost(item.plus || 0, item.ilv); }
export function canEnhance(save, item) {
  if (!item || (item.plus || 0) >= FORGE.maxEnhance) return false;
  const c = enhanceCost(item);
  return save.gold >= c.gold && save.mats.essence >= c.essence;
}
// 강화 성공률·실패 결과 (1.219.0)
export function enhanceRisk(item) {
  const n = item.plus || 0;
  const rate = FORGE.enhanceRate[n] ?? 0;
  const drop = n >= FORGE.enhanceDropFrom;
  const brk = n >= FORGE.enhanceBreakFrom ? FORGE.enhanceBreakChance : 0;
  return { rate, drop, breakChance: brk };
}
export function promoteRisk(item) {
  const g = nextGrade(item);
  return g ? { rate: FORGE.promoteRate[g] ?? 1, breaks: !!FORGE.promoteBreak[g] } : null;
}
// 장비 파괴 — 착용 중이면 칸도 비운다
function destroyItem(save, uid) {
  for (const u of Object.values(save.units)) for (const sl of Object.keys(u.equip || {})) if (u.equip[sl] === uid) u.equip[sl] = null;
  save.inventory = save.inventory.filter(i => i.uid !== uid);
  save.stats.destroyed = (save.stats.destroyed || 0) + 1;
}
// result: 'success' | 'fail'(재료만) | 'down'(단계 하락) | 'destroy'
export function forgeEnhance(save0, uid, rng = Math.random) {
  const it0 = save0.inventory.find(i => i.uid === uid);
  if (!canEnhance(save0, it0)) return { save: save0, result: null };
  const save = clone(save0);
  const it = save.inventory.find(i => i.uid === uid);
  const c = enhanceCost(it);
  save.gold -= c.gold; save.mats.essence -= c.essence;
  const r = enhanceRisk(it);
  if (rng() < r.rate) { it.plus = (it.plus || 0) + 1; return { save, result: 'success' }; }
  if (r.breakChance && rng() < r.breakChance) { destroyItem(save, uid); return { save, result: 'destroy' }; }
  if (r.drop) { it.plus = Math.max(0, (it.plus || 0) - 1); return { save, result: 'down' }; }
  return { save, result: 'fail' };
}
// 1.266.3 연속 강화 — 하락 위험이 없는 구간(+enhanceDropFrom 미만)만, 목표 또는 재료 부족까지 반복
export const SAFE_ENHANCE_MAX = FORGE.enhanceDropFrom;
export function forgeEnhanceTo(save0, uid, target, rng = Math.random) {
  const goal = Math.min(target, SAFE_ENHANCE_MAX);
  const it0 = save0.inventory.find(i => i.uid === uid);
  const from = it0?.plus || 0;
  let save = save0, tries = 0, gold = 0, essence = 0, fails = 0;
  for (let guard = 0; guard < 200; guard++) {
    const it = save.inventory.find(i => i.uid === uid);
    if (!it || (it.plus || 0) >= goal) break;
    if (!canEnhance(save, it)) break;
    const c = enhanceCost(it);
    const r = forgeEnhance(save, uid, rng);
    if (!r.result) break;
    save = r.save; tries++; gold += c.gold; essence += c.essence;
    if (r.result !== 'success') fails++;
  }
  const to = save.inventory.find(i => i.uid === uid)?.plus || 0;
  return { save, tries, fails, from, to, gold, essence, reached: to >= goal };
}
export function enhanceItem(save0, uid, rng = Math.random) { return forgeEnhance(save0, uid, rng).save; }
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
export function promoteItem(save0, uid, rng = Math.random) { return forgePromote(save0, uid, rng).save; }
export function forgePromote(save0, uid, rng = Math.random) {
  const it0 = save0.inventory.find(i => i.uid === uid);
  if (!canPromote(save0, it0)) return { save: save0, result: null };
  const save = clone(save0);
  const it = save.inventory.find(i => i.uid === uid);
  const c = promoteCost(it);
  save.gold -= c.gold; save.mats.essence -= c.essence; save.mats.shard -= c.shard;
  const r = promoteRisk(it);
  if (rng() >= r.rate) {
    if (r.breaks) { destroyItem(save, uid); return { save, result: 'destroy' }; }
    return { save, result: 'fail' };
  }
  it.grade = nextGrade(it);
  it.opts = it.opts || [];
  const o = rollOption(rng, it.cls, it.grade, it.opts); // 승급마다 옵션 +1
  if (o) it.opts.push(o);
  if (it.grade === 'epic') {
    save.stats.epics += 1;
    it.set = it.set || 'field';
    if (it.slot === 'accessory' && !it.eopt) it.eopt = pick(rng, Object.keys(EPIC_OPTIONS));
  }
  return { save, result: 'success' };
}

// ===== 사역마 편성 (1.212.0) — 칸은 주인공 레벨로 개방 =====
export function famSlotOpen(save, slot) {
  if (save.units[save.hero]?.rebirth?.count > 0) return true; // 전승자는 이미 개방한 칸 유지
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

// 소환 — n회 (계약서 조각 10개 = 1회, 1.233.1 소환권 폐지). → { save, results, souls } (재료 부족이면 results null)
export function summonFam(save0, n, rng = Math.random) {
  if ((save0.mats.famShard || 0) < n * FAM_TUNING.shardsPerSummon) return { save: save0, results: null };
  const save = clone(save0);
  save.mats.famShard -= n * FAM_TUNING.shardsPerSummon;
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
// 특성 갈래 → 짝 동행 사역마 기능 강화 (1.236.0 PM: 특성 테크에 따라 최적 동행이 바뀌도록)
//   pts = 그 역할과 짝인 갈래에 찍은 포인트 (talents.js TREE_FAM) — 능력치가 아니라 역할 기능을 키운다
export function famSynergyFx(role, pts) {
  const S = T.famSynergy?.[role]; if (!S || !pts) return {};
  return Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v * pts]));
}
function applyFamSynergy(fam, role, pts) {
  const fx = famSynergyFx(role, pts);
  if (fx.guard) fam.guardian = Math.min(0.85, (fam.guardian || 0) + fx.guard);
  if (fx.healPower) fam.healPower = Math.round(fam.healPower * (1 + fx.healPower));
  if (fx.healBelow) fam.healBelowAdd = fx.healBelow;
  if (fx.healShield) fam.healShield = fx.healShield;
  if (fx.chain) fam.chain = (fam.chain || 0) + fx.chain;
  if (fx.atk) fam.atk = Math.round(fam.atk * (1 + fx.atk));
}
export function partyCombatants(save, hpMap = null) {
  const list = save.party.map(cid => {
    const d = deriveUnit(save, cid);
    const hp = hpMap && hpMap[cid] != null ? Math.min(d.maxHp, hpMap[cid] + Math.round(d.maxHp * (T.dungeonFloorHeal || 0))) : d.maxHp;
    return { ...d, hp, leader: cid === save.hero };
  });
  const mk = activeMain(save);
  if (mk) {
    const hero = list.find(u => u.leader) || list[0];
    const fam = famCombatant(mk, save.fams[mk], hero, hero.famPct || 0);
    applyFamSynergy(fam, famRole(mk), hero[`fam_${famRole(mk)}`] || 0);
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
// 자동 진행 다음 단계 (1.234.0) — { field, mode: 'hunt'|'gate'|'boss', stage } 또는 { field: null, reason }
//   보스를 이미 잡은 지역이면 다음 지역으로 넘어간다 · 진행 중 스테이지 = 관문을 넘은 수(cleared)
export function autoProgressStep(save, field) {
  let f = field;
  for (let guard = 0; f && save.progress.bossCleared[f.id] && guard < 30; guard++) {
    const next = CHRONICLE_FIELDS[f.id]; // id는 1부터 — 다음 지역
    if (!next) return { field: null, reason: '모든 지역의 보스를 쓰러뜨렸다' };
    if (!fieldUnlocked(save, next.id)) return { field: null, reason: `${next.name}은 아직 열리지 않았다${next.reqRebirth ? ' (전승 필요)' : ''}` };
    f = next;
  }
  if (!f) return { field: null, reason: '사냥터 없음' };
  const st = stageState(save, f.id);
  if (st.cleared >= FIELD_STAGES) return { field: f, mode: 'boss', stage: null };
  const i = st.cleared;
  return gateReady(save, f.id, i) ? { field: f, mode: 'gate', stage: i } : { field: f, mode: 'hunt', stage: i };
}
// 관문 강적 — 그 스테이지 강적 1 + 일반 1, 레벨 +1
export function rollGateEncounter(field, stageIdx, rng) {
  const lv = fieldStages(field)[stageIdx].lv + STAGE_TUNING.gateLvAdd;
  const area = { hpMult: field.area.hpMult * STAGE_TUNING.gateEliteMult, atkMult: field.area.atkMult };
  const list = [buildChronicleEnemy(field.elites[stageIdx % field.elites.length], lv, 'e0', area), buildChronicleEnemy(pick(rng, field.normals), lv - 1, 'e1', field.area)];
  if (T.enemyParty?.on) { list.push(buildChronicleEnemy(pick(rng, field.normals), lv - 1, 'e2', field.area)); return { type: 'gate', enemies: packOf(rng, list) }; }
  return { type: 'gate', enemies: list };
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
// ===== 적 파티 (1.236.0) — 역할(erole) 부여: tank = 도발 · healer = 아군 회복 =====
export function roleEnemy(e, role, mult = null) {
  const R = T.enemyParty?.roles?.[role] || {};
  const hm = (R.hp || 1) * (mult?.hp || 1); const am = (R.atk || 1) * (mult?.atk || 1);
  return { ...e, erole: role === 'dps' ? undefined : role, hp: Math.round(e.hp * hm), maxHp: Math.round(e.maxHp * hm), atk: Math.round(e.atk * am), def: Math.round((e.def || 0) * (R.def || 1)) };
}
// 무리 3마리 — 역할은 마리마다 완전 랜덤 (수호 3마리·맹공 3마리도 나올 수 있다, PM 1.236.0)
function packOf(rng, list, opt = null) {
  const P = T.enemyParty; const W = P.roleWeights;
  const tot = W.tank + W.healer + W.dps;
  // opt (1.257.0 — 던전·첨탑 층): {mult, reward, all} — all이면 강적도 무리 배율 적용
  const mult = opt?.mult || P.packMult; const reward = opt?.reward ?? P.packReward;
  return list.map(e => {
    const x = rng() * tot;
    const role = x < W.tank ? 'tank' : x < W.tank + W.healer ? 'healer' : 'dps';
    const scaled = e.tier === 'normal' || (opt?.all && e.tier !== 'boss');
    const r = roleEnemy(e, role, scaled ? mult : null);
    // 보상도 마리당 줄여 전투 1회 보상은 예전(평균 1.8마리)과 같게
    return scaled ? { ...r, rewardMult: (e.rewardMult || 1) * reward, goldMult: reward } : r;
  });
}
// ===== 보스 공략 기믹 (1.237.0) — boss = 보스 적 객체 · make(key, i, {hp, atk}) = 같은 조건의 수행원 생성 =====
export const bossMechOf = (kind, id) => BOSS_MECH_OF[kind]?.[id] || null;
export function withBossMech(boss, mechId, pool, make, rng) {
  const M = T.bossMech?.[mechId];
  if (!M || !BOSS_MECHS[mechId]) return [boss];
  const b = { ...boss, mech: mechId };
  if (M.bossHp) { b.hp = Math.round(b.hp * M.bossHp); b.maxHp = Math.round(b.maxHp * M.bossHp); }
  const minion = (role, i, hp, atk, extra) => {
    const e = make(pick(rng, pool), i, { hp, atk });
    return { ...e, erole: role, rewardMult: (e.rewardMult || 1) * 0.2, goldMult: 0.2, ...extra };
  };
  if (mechId === 'ward') return [b, ...Array.from({ length: M.guards }, (_, i) => minion('tank', i + 1, M.guardHp, M.guardAtk, { warden: true }))];
  if (mechId === 'ritual') return [b, minion('healer', 1, M.acolyteHp, M.acolyteAtk, { acolyte: true, healPct: M.heal, healCd: 0, healBelow: 1 })];
  return [b];
}
export function rollFieldEncounter(field, rng, boss = false, partyLv = null, stage = null) {
  const EP = T.enemyParty?.on;
  if (boss) {
    const b = buildChronicleEnemy(field.boss, field.bossLv, 'e0', field.area);
    const pool = field.elites.length ? field.elites : field.normals;
    const make = (key, i, m) => buildChronicleEnemy(key, field.bossLv - 2, `e${i}`, { hpMult: field.area.hpMult * (m.hp || 1), atkMult: field.area.atkMult * (m.atk || 1) });
    return { type: 'boss', mech: bossMechOf('field', field.id), enemies: withBossMech(b, bossMechOf('field', field.id), pool, make, rng) };
  }
  if (EP && stage != null) {
    const slv = fieldStages(field)[stage].lv;
    if (rng() < T.eliteChance && field.elites.length) {
      const list = [buildChronicleEnemy(pick(rng, field.elites), slv + 1, 'e0', field.area), buildChronicleEnemy(pick(rng, field.normals), slv, 'e1', field.area), buildChronicleEnemy(pick(rng, field.normals), slv, 'e2', field.area)];
      return { type: 'elite', enemies: packOf(rng, list), stage };
    }
    const list = Array.from({ length: T.enemyParty.packSize }, (_, i) => buildChronicleEnemy(pick(rng, field.normals), slv, `e${i}`, field.area));
    return { type: 'normal', stage, enemies: packOf(rng, list) };
  }
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
  const ds = T.dungeonSolo || { hp: 1, atk: 1 };
  const area = { hpMult: D.area.hpMult * tier.hp * ds.hp, atkMult: D.area.atkMult * tier.atk * ds.atk };
  const lv = f.lv + tier.lv;
  // 경험치 배율 (1.234.1) — 난이도 HP 배율 대신 고정 보너스 (일반 기준 = 지역 × 솔로 보정)
  const rm = D.area.hpMult * ds.hp * (tier.expMult || 1);
  const mk = (key, i) => ({ ...buildChronicleEnemy(key, lv, `e${i}`, area), rewardMult: rm });
  if (f.boss) {
    const mech = bossMechOf('dungeon', d.id);
    const pool = [...new Set(D.floors.filter(x => !x.boss).flatMap(x => x.enemies))];
    const make = (key, i, m) => ({ ...buildChronicleEnemy(key, lv - 2, `e${i}`, { hpMult: area.hpMult * (m.hp || 1) * 3, atkMult: area.atkMult * (m.atk || 1) * 1.6 }), rewardMult: rm });
    return { type: 'dungeonBoss', mech, enemies: withBossMech(mk(f.enemies[0], 0), mech, pool.length ? pool : f.enemies, make, rng) };
  }
  // 1.257.0 — 던전 층도 3마리 무리 (예전 평균 1.5마리 → 마리당 배율 T.floorPack로 총량 유지)
  if (T.enemyParty?.on) {
    const FP = T.floorPack;
    const list = Array.from({ length: T.enemyParty.packSize }, (_, i) => mk(pick(rng, f.enemies), i));
    return { type: 'dungeonFloor', enemies: packOf(rng, list, { mult: FP.mult, reward: FP.reward, all: true }) };
  }
  const [n0, n1] = T.dungeonFloorEnemies || [2, 3];
  const n = n0 + Math.floor(rng() * (n1 - n0 + 1));
  const enemies = [];
  for (let i = 0; i < n; i++) enemies.push(mk(pick(rng, f.enemies), i));
  return { type: 'dungeonFloor', enemies };
}

// 고유 스킬과 같은 규칙으로 고르는 스킬 종류 (사역마 고유 스킬 · 전승 스킬 공용)
const SPECIAL_KINDS = new Set(['duel', 'warcry', 'cover', 'fortify', 'bigHeal', 'hot', 'healShield', 'healBuff', 'breakStrike', 'weakStrike', 'markStrike', 'executeStrike']);

// ===== 전승 (1.220.0) =====
export function canRebirth(save, classId = save.hero) {
  const u = save.units[classId];
  return !!u && u.lv >= REBIRTH.reqLevel && (u.rebirth?.count || 0) < REBIRTH.max;
}
export function rebirth(save0, branchId, classId = save0.hero) {
  const br = REBIRTH_BRANCHES[branchId];
  const u0 = save0.units[classId];
  if (!br || br.cls !== classId || !canRebirth(save0, classId)) return save0;
  if (u0.rebirth?.branch && u0.rebirth.branch !== branchId) return save0; // 갈래는 첫 전승 때 고정
  const save = clone(save0);
  const u = save.units[classId];
  const cls = chronicleClass(classId);
  u.rebirth = { branch: branchId, count: (u0.rebirth?.count || 0) + 1 };
  u.lv = 1; u.exp = 0; u.points = 0; u.sp = 1; u.stats = { ...cls.base }; u.skills = {}; u.mastery = 0; u.talents = {};
  save.stats.rebirths = (save.stats.rebirths || 0) + 1;
  return save;
}

// ===== 전투 시뮬 (풀오토) =====
export function simulateChronicleBattle(party0, enemies0, rng = Math.random) {
  const units = [
    ...party0.map(p => ({ ...p, buffs: {}, shield: Math.round((p.startShieldPct || 0) * p.maxHp), taunt: p.startTaunt || 0, tauntDef: 0, dots: [], cds: {}, fx: {}, hots: [], forced: null, cover: null, turn: 0, critNext: false, firstDone: false, reviveUsed: false, emergencyUsed: false })),
    ...enemies0.map(e => ({ ...e, buffs: {}, shield: 0, taunt: 0, tauntDef: 0, dots: [], cds: {}, fx: {}, hots: [], forced: null, cover: null, turn: 0, skills: [] })),
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
    if (u.mech === 'enrage' && round > T.bossMech.enrage.after) m += (round - T.bossMech.enrage.after) * T.bossMech.enrage.perRound; // 광폭 타이머
    return m;
  };
  // 일시 효과 (1.218.0 사역마 고유 스킬): armorBreak·weak·vuln(적) / guardDef·guardRed(아군)
  const fxv = (u, k) => (u.fx && u.fx[k] && u.fx[k].t > 0 ? u.fx[k].v : 0);
  // 보호막 (1.226.2) — 모든 경로가 이 함수를 쓴다. mode 'add' = 누적 / 'max' = 큰 값으로 갱신. 총량 상한 최대 HP × shieldMaxPct
  const addShield = (t, v, mode = 'add') => {
    const cap = Math.round(t.maxHp * (T.shieldMaxPct || 9));
    const before = t.shield;
    t.shield = Math.min(cap, Math.max(before, mode === 'max' ? v : before + v));
    return t.shield - before;
  };
  const healUnit = (t, h) => {
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + h);
    if (t.overhealShield) addShield(t, Math.max(0, h - (t.hp - before)));
    return t.hp - before;
  };
  // 쓰러짐 직전 처리 — 불굴(guts) · 부활(revive) · 응급(emergencyHeal)
  const onHurt = (def) => {
    // 자령 수호 고유 패시브 (1.243.0) — 전투당 1회, 주인공이 쓰러질 피해를 사역마가 막아 HP n%로 버틴다
    if (def.hp <= 0 && def.leader) {
      const g = units.find(x => x.side === def.side && x.vGuard && !x.vGuardUsed && x.hp > 0);
      if (g) { g.vGuardUsed = true; def.hp = Math.max(1, Math.round(def.maxHp * g.vGuard)); }
    }
    if (def.hp <= 0 && def.guts > 0) { def.hp = 1; def.guts = 0; }
    if (def.hp <= 0 && def.revive && !def.reviveUsed) { def.reviveUsed = true; def.hp = Math.round(def.maxHp * def.revive); }
    if (def.hp > 0 && def.emergencyHeal && !def.emergencyUsed && def.hp < def.maxHp * 0.3) { def.emergencyUsed = true; def.hp = Math.min(def.maxHp, def.hp + Math.round(def.maxHp * def.emergencyHeal)); }
  };
  // 원정대 레이드 「다섯 봉인」 (1.231.0) — 봉인은 그 직업만, 봉인이 남아 있으면 보스 무적. 일반 전투엔 봉인이 없어 영향 0
  const immuneTo = (att, def) => !!def && ((def.sealOf && att?.classId !== def.sealOf) || (def.sealedBoss && units.some(x => x.sealOf && x.hp > 0))
    || (def.mech === 'ward' && units.some(x => x.warden && x.hp > 0))); // 호위 결계 (1.237.0)
  const damage = (att, def, mult, { noDodge = false, skill = false } = {}) => {
    if (immuneTo(att, def)) return { d: 0, immune: true };
    if (!noDodge && rng() < (def.dodge || 0)) {
      if (def.dodgeHeal) healUnit(def, Math.round(def.maxHp * def.dodgeHeal));
      if (def.critAfterCounter) def.critNext = true;
      return { miss: true, d: 0 };
    }
    let raw = att.atk * mult * atkMod(att) * (1 + (skill ? att.skillDmg || 0 : 0)) * (0.9 + rng() * 0.2) * (1 - fxv(att, 'weak'));
    if (att.execute && def.hp < def.maxHp * 0.3) raw *= 1 + att.execute;
    let crit = rng() < (att.crit || 0);
    if (att.side === 'party' && (att.critNext || (att.firstCrit && !att.firstDone))) crit = true;
    att.critNext = false; att.firstDone = true;
    if (crit) raw *= att.critMult || T.critMult;
    const defV = (def.def || 0) * (1 + (def.taunt > 0 ? def.tauntDef : 0) + fxv(def, 'guardDef')) * (1 - (att.armorPen || 0)) * (1 - fxv(def, 'armorBreak'));
    let d = raw * T.defK / (T.defK + defV);
    d *= 1 - (def.dmgReduce || 0);
    d *= (1 + fxv(def, 'vuln')) * (1 - fxv(def, 'guardRed'));
    if (def.taunt > 0 && def.tauntReduce) d *= 1 - def.tauntReduce;
    if (def.shield > 0 && def.shieldReduce) d *= 1 - def.shieldReduce;
    d = Math.max(1, Math.round(d));
    let absorbed = 0;
    if (def.shield > 0) { absorbed = Math.min(def.shield, d); def.shield -= absorbed; d -= absorbed; }
    // 보호 (수호 맹세) — 피해 일부를 보호자가 대신 받는다
    let cover = null;
    if (def.cover && def.cover.t > 0 && d > 0) {
      const pr = units.find(x => x.id === def.cover.by && x.hp > 0);
      if (pr) { const part = Math.round(d * def.cover.v); pr.hp = Math.max(0, pr.hp - part); onHurt(pr); d -= part; cover = { t: pr.id, d: part }; }
    }
    def.hp = Math.max(0, def.hp - d);
    onHurt(def);
    if (att.lifesteal && d > 0 && att.hp > 0) healUnit(att, Math.round(d * att.lifesteal * (att.rageLifesteal && att.buffs?.rage?.t > 0 ? 2 : 1))); // 1.247.0 광폭화 중 흡혈 2배
    if (def.thornsPct && d > 0 && att.hp > 0 && !immuneTo(def, att)) att.hp = Math.max(0, att.hp - Math.max(1, Math.round(d * def.thornsPct)));
    // 반사 갑주 (1.237.0 보스 기믹) — 직접 공격 피해의 일부를 되돌린다 (지속 피해는 이 함수를 거치지 않아 반사 안 됨)
    if (def.fx?.reflect?.t > 0 && att.side === 'party' && d > 0 && att.hp > 0) {
      const rd = Math.max(1, Math.min(Math.round(d * def.fx.reflect.v), Math.round(att.maxHp * (T.bossMech?.reflect?.capPct || 1))));
      att.hp = Math.max(0, att.hp - rd); onHurt(att);
      push({ a: def.id, n: '반사', k: 'reflect', hits: [{ t: att.id, d: rd }] });
    }
    return { d, crit, absorbed, cover };
  };
  // 정령 화살 — 공격 뒤 확률 추가 타격 (유니크)
  const spiritHit = (u, hits) => {
    if (!u.spiritArrow || rng() >= u.spiritArrow) return;
    const t = pickEnemyTarget(u);
    if (!t) return;
    const r = damage(u, t, 0.8, { noDodge: true });
    hits.push({ t: t.id, d: r.d, c: r.crit, chain: true, ab: r.absorbed });
  };
  // 연격 — 단일 공격 뒤 추가 타격
  const chainHit = (u, t, hits) => {
    if (!u.chain || !t || t.hp <= 0 || rng() >= u.chain) return;
    const r = damage(u, t, 0.5, { noDodge: true });
    hits.push({ t: t.id, d: r.d, c: r.crit, chain: true, ab: r.absorbed });
  };
  const pickEnemyTarget = (u) => {
    const foes = alive(u.side === 'party' ? 'enemy' : 'party');
    if (!foes.length) return null;
    if (u.side === 'enemy') {
      // 결투·함성 도발 (고유 스킬) — 강제 대상
      if (u.forced && u.forced.t > 0) { const ft = foes.find(f => f.id === u.forced.by); if (ft) return ft; }
      const t = foes.find(f => f.taunt > 0);
      if (t && rng() < 0.85) return t;
      // 수호 사역마 — 살아 있으면 등급별 확률로 공격을 대신 받는다 (1.216.0)
      const g = foes.find(f => f.guardian);
      if (g && rng() < g.guardian) return g;
      // 사역마가 있어도 적은 주인공을 노린다 (70%) — 동행이 방패막이로만 쓰이지 않게 (1.212.0)
      const leader = foes.find(f => f.leader);
      if (leader && foes.length > 1 && rng() < 0.7) return leader;
      return pick(rng, foes);
    }
    const own = foes.find(f => f.sealOf === u.classId);
    if (own) return own;
    // 적 파티 (1.236.0) — 적 수호가 도발 중이면 그쪽으로 · 맹공 사역마는 적 치유를 먼저 노린다
    const tk = foes.find(f => f.erole === 'tank' && f.taunt > 0);
    if (tk && rng() < (T.enemyParty?.roles?.tank?.tauntPull || 0.8)) return tk;
    if (u.famRole === 'dps') { const hl = foes.find(f => f.erole === 'healer'); if (hl) return hl; }
    const ok = foes.filter(f => !immuneTo(u, f));
    return (ok.length ? ok : foes).slice().sort((a, b) => a.hp - b.hp)[0];
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
    const foes = alive('enemy').filter(f => !immuneTo(u, f));
    const has = (k) => ready.find(x => x.s.kind === k);
    // 1.227.1 PM: 사역마는 덜 놀게 — 치유 HP 75% 미만(주인공은 55% 그대로) · 보호막은 주인공 보호막이 최대 HP 10% 미만이면 다시
    const lowAlly = allies.find(a => a.hp < a.maxHp * (u.fam ? FAM_AI.healBelow + (u.healBelowAdd || 0) : 0.55));
    const hurt = allies.filter(a => a.hp < a.maxHp * 0.7).length;
    // 사역마 고유 스킬 (1.218.0) — 조건이 맞으면 최우선
    for (const sig of ready.filter(x => x.s.sig || SPECIAL_KINDS.has(x.s.kind))) {
      const leader = allies.find(a => a.leader) || allies[0];
      const k = sig.s.kind;
      const ok = k === 'duel' ? foes.some(f => !(f.forced?.t > 0))
        : k === 'warcry' ? (foes.length >= 2 || !foes.some(f => f.forced?.t > 0))
          : k === 'cover' ? leader && leader.hp < leader.maxHp * 0.85 && !(leader.cover?.t > 0)
            : k === 'fortify' ? leader && !(fxv(leader, 'guardDef') > 0)
              : k === 'bigHeal' ? !!lowAlly
                : k === 'hot' ? allies.some(a => a.hp < a.maxHp * 0.8 && !a.hots.length)
                  : k === 'healShield' ? allies.some(a => a.hp < a.maxHp * 0.65)
                    : k === 'healBuff' ? (allies.some(a => a.hp < a.maxHp * 0.75) || !allies.some(a => a.buffs.song?.t > 0))
                      : true;
      if (ok && !(k === 'cover' && u.leader)) return sig;
    }
    if (hurt >= 2 && has('healAll')) return has('healAll');
    if (lowAlly && has('heal')) return has('heal');
    if (lowAlly && has('healAll')) return has('healAll');
    const shieldNeed = u.fam ? (() => { const ld = allies.find(a => a.leader) || allies[0]; return ld && ld.shield < ld.maxHp * FAM_AI.shieldBelow; })() : !allies.some(a => a.shield > 0);
    if (has('shield') && shieldNeed) return has('shield');
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
      if (u.passive) return; // 행동하지 않는 적
      // 봉인의 반향 (1.231.0) — 봉인은 자기 주인만 공격한다 (약한 캐릭터는 자기 봉인을 버티지 못한다)
      if (u.sealOf) {
        const o = alive('party').find(p => p.classId === u.sealOf);
        if (!o || !u.atk) return;
        const r = damage(u, o, 1);
        const hits = [{ t: o.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed }];
        if (r.cover) hits.push({ t: r.cover.t, d: r.cover.d, cover: true });
        push({ a: u.id, n: '봉인의 반향', k: 'attack', hits });
        return;
      }
      const foes = alive('party');
      if (!foes.length) return;
      const ER = T.enemyParty?.roles || {};
      if (u.erole === 'tank' && (u.turn - 1) % ER.tank.tauntEvery === 0) {
        u.taunt = ER.tank.tauntTurns + 1; // 자기 턴 끝에 1 감소
        push({ a: u.id, n: '도발', k: 'taunt', skill: true, hits: [{ t: u.id, buff: true }] });
        return;
      }
      if (u.erole === 'healer' && !(u.cds.eheal > 0)) {
        const below = u.healBelow ?? ER.healer.below;
        const cand = alive('enemy').filter(x => x.hp < x.maxHp * below);
        // 의식 사제 = 보스 우선 (1.237.0)
        const al = (u.acolyte && cand.find(x => x.mech)) || cand.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (al) {
          const h = Math.round(al.maxHp * (u.healPct ?? ER.healer.heal));
          const before = al.hp; al.hp = Math.min(al.maxHp, al.hp + h);
          u.cds.eheal = (u.healCd ?? ER.healer.cd) + 1;
          push({ a: u.id, n: '치유', k: 'heal', skill: true, hits: [{ t: al.id, h: al.hp - before }] });
          return;
        }
      }
      const BM = T.bossMech || {};
      if (u.mech === 'reflect' && (u.turn - 1) % BM.reflect.every === 0) {
        u.fx.reflect = { v: BM.reflect.pct, t: BM.reflect.turns + 1 };
        push({ a: u.id, n: '반사 갑주', k: 'buff', skill: true, hits: [{ t: u.id, buff: true }] });
        return;
      }
      if (u.mech === 'storm' && u.turn % BM.storm.every === 0) {
        const hits = [];
        for (const f of foes) { const r = damage(u, f, BM.storm.mult); hits.push({ t: f.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed }); if (r.cover) hits.push({ t: r.cover.t, d: r.cover.d, cover: true }); }
        push({ a: u.id, n: '광역 폭풍', k: 'aoe', skill: true, hits });
        return;
      }
      const bossAoe = u.tier === 'boss' && !u.mech && u.turn % 4 === 0;
      const heavy = (u.tier !== 'normal') && u.turn % 3 === 0;
      if (bossAoe) {
        const hits = [];
        for (const f of foes) { const r = damage(u, f, 0.7); hits.push({ t: f.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed }); if (r.cover) hits.push({ t: r.cover.t, d: r.cover.d, cover: true }); }
        push({ a: u.id, n: '광역 강타', k: 'aoe', hits });
        return;
      }
      const t = pickEnemyTarget(u);
      const exec = u.mech === 'execute' && t.leader && t.hp < t.maxHp * T.bossMech.execute.below; // 처형 표식
      const r = damage(u, t, exec ? T.bossMech.execute.mult : heavy ? 1.6 : 1);
      const hits = [{ t: t.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed }];
      if (r.cover) hits.push({ t: r.cover.t, d: r.cover.d, cover: true });
      if (!r.miss) counterCheck(t, u, hits);
      push({ a: u.id, n: exec ? '처형' : heavy ? '강공격' : '공격', k: exec || heavy ? 'heavy' : 'attack', ...(exec ? { skill: true } : {}), hits });
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
        hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed });
        if (!r.miss) chainHit(u, t, hits);
      }
      spiritHit(u, hits);
      push({ a: u.id, n: '공격', k: 'attack', hits });
      return;
    }
    const { s, lv } = choice;
    const v = (s.base + s.perLv * (lv - 1)) * (1 + (u.skillBoost?.[s.id] || 0));
    u.cds[s.id] = Math.max(1, s.cd + 1 - skillCdrOf(u, s.id));
    const hits = [];
    const foes = alive('enemy').filter(f => !immuneTo(u, f)); // 봉인 레이드: 깰 수 없는 대상 제외 (1.231.0)
    const allies = alive('party');
    switch (s.kind) {
      case 'strike': case 'lifesteal': {
        const t = pickEnemyTarget(u);
        const times = u.rageDouble && u.buffs.rage?.t > 0 ? 2 : 1;
        let r = { d: 0 };
        for (let i = 0; i < times && t.hp > 0; i++) {
          r = damage(u, t, v, { skill: true });
          hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed });
          if (!r.miss) chainHit(u, t, hits);
        }
        spiritHit(u, hits);
        if (s.kind === 'lifesteal' && r.d > 0) {
          const h = Math.round(r.d * s.steal * (u.rageLifesteal && u.buffs.rage?.t > 0 ? 2 : 1)); // 1.247.0 광기의 혈인
          const before = u.hp;
          u.hp = Math.min(u.maxHp, u.hp + h);
          hits.push({ t: u.id, h, eh: u.hp - before });
        }
        break;
      }
      case 'multi': {
        const n = s.hits + (s.id === 'e_volley' ? u.multiHitsAdd || 0 : 0);
        for (let i = 0; i < n; i++) {
          const t = pickEnemyTarget(u);
          if (!t) break;
          const r = damage(u, t, v, { skill: true });
          hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed });
        }
        break;
      }
      case 'aoe':
        for (const t of foes) { const r = damage(u, t, v, { skill: true }); hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed }); }
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
        const eh = healUnit(t, h);
        const es = u.healShield ? addShield(t, Math.round(h * u.healShield)) : 0; // 치유 시너지 (1.236.0)
        hits.push({ t: t.id, h, eh, ...(es ? { es } : {}) });
        holyHit(u, h, hits);
        break;
      }
      case 'healAll':
        for (const a of allies) { const h = Math.round(u.healPower * v); const eh = healUnit(a, h); hits.push({ t: a.id, h, eh }); holyHit(u, h, hits); }
        break;
      case 'shield':
        for (const a of allies) { const sh = Math.round(u.healPower * v); const es = addShield(a, sh, 'max'); hits.push({ t: a.id, s: sh, es }); }
        break;
      case 'buffAtk':
        for (const a of allies) { a.buffs.bless = { v: v * (u.blessMult || 1), t: s.turns + (u.blessTurns || 0) }; hits.push({ t: a.id, buff: true }); }
        break;
      case 'rage':
        u.buffs.rage = { v, t: s.turns + (u.rageTurnsAdd || 0) }; hits.push({ t: u.id, buff: true }); // 1.247.0 광기의 혈인 — 광폭화 지속 +N
        break;
      case 'taunt':
        u.taunt = s.turns + 1; u.tauntDef = v; // 1.243.0 — 자기 턴 끝에 1 감소하므로 +1 (N턴 = 적이 N라운드 공격하는 동안)
        hits.push({ t: u.id, buff: true });
        break;
      // ===== 사역마 고유 스킬 (1.218.0) =====
      case 'duel': {
        const t = foes.filter(f => !(f.forced?.t > 0)).sort((a, b) => b.atk - a.atk)[0] || foes[0];
        t.forced = { by: u.id, t: s.turns };
        u.fx.guardDef = { v, t: s.turns + 1 };
        hits.push({ t: t.id, debuff: true }, { t: u.id, buff: true });
        break;
      }
      case 'warcry':
        for (const f of foes) { f.forced = { by: u.id, t: s.turns }; hits.push({ t: f.id, debuff: true }); }
        u.fx.guardDef = { v, t: s.turns + 1 }; hits.push({ t: u.id, buff: true });
        break;
      case 'cover': {
        const ld = allies.find(a => a.leader) || allies[0];
        ld.cover = { by: u.id, v: Math.min(0.8, v), t: s.turns }; hits.push({ t: ld.id, buff: true });
        break;
      }
      case 'fortify': {
        const ld = allies.find(a => a.leader) || allies[0];
        ld.fx.guardDef = { v, t: s.turns }; ld.fx.guardRed = { v: s.red, t: s.turns }; hits.push({ t: ld.id, buff: true });
        break;
      }
      case 'bigHeal': case 'healShield': case 'healBuff': {
        const t = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const h = Math.round(u.healPower * v);
        const eh = healUnit(t, h); const es0 = u.healShield ? addShield(t, Math.round(h * u.healShield)) : 0; hits.push({ t: t.id, h, eh, ...(es0 ? { es: es0 } : {}) });
        if (s.kind === 'healShield') { const sh = Math.round(u.healPower * s.shieldV); const es = addShield(t, sh, 'max'); hits.push({ t: t.id, s: sh, es }); }
        if (s.kind === 'healBuff') for (const a of allies) { a.buffs.song = { v: s.buff, t: s.turns }; hits.push({ t: a.id, buff: true }); }
        break;
      }
      case 'hot': {
        const t = allies.filter(a => !a.hots.length).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || allies[0];
        t.hots.push({ v: Math.round(u.healPower * v), t: s.turns, src: u.id, sn: s.name }); hits.push({ t: t.id, buff: true });
        break;
      }
      case 'breakStrike': case 'weakStrike': case 'markStrike': case 'executeStrike': {
        const t = pickEnemyTarget(u);
        const mult = s.kind === 'executeStrike' && t.hp < t.maxHp * 0.35 ? v * 2 : v;
        const r = damage(u, t, mult, { skill: true });
        hits.push({ t: t.id, d: r.d, c: r.crit, m: r.miss, ab: r.absorbed });
        const key = { breakStrike: 'armorBreak', weakStrike: 'weak', markStrike: 'vuln' }[s.kind];
        if (key && !r.miss && t.hp > 0) { t.fx[key] = { v: s.dv, t: s.turns }; hits.push({ t: t.id, debuff: true }); }
        break;
      }
      default: break;
    }
    if (u.skillShield) addShield(u, Math.round(u.atk * u.skillShield));
    push({ a: u.id, n: s.name, k: s.kind, skill: true, hits });
  };
  // 치유 → 신성 피해 (사제 옵션·유니크)
  function holyHit(u, h, hits) {
    if (!u.holyDmg || h <= 0) return;
    const t = pickEnemyTarget(u);
    if (!t || immuneTo(u, t)) return;
    const d = Math.max(1, Math.round(h * u.holyDmg));
    t.hp = Math.max(0, t.hp - d);
    hits.push({ t: t.id, d, holy: true });
  }
  // ===== 전투 시작 연출 (1.259.0, 시안 ㊹) — k 'pre' = 행동 아님 (통계 제외), UI가 「전투 돌입 → 전투 전 효과 → 1라운드」로 보여 준다 =====
  const enterEv = { k: 'pre', pre: 'enter', foes: units.filter(x => x.side === 'enemy').length, roles: units.filter(x => x.side === 'enemy').map(x => (x.tier === 'boss' ? 'boss' : x.erole || 'dps')) };
  push(enterEv);
  for (const p of units.filter(x => x.side === 'party')) {
    if (p.shield > 0) push({ k: 'pre', pre: 'fx', a: p.id, icon: '◈', n: '시작 보호막', v: `+${p.shield.toLocaleString()}`, tone: 'shield' });
    if (p.guardian) push({ k: 'pre', pre: 'fx', a: p.id, icon: '🛡', n: '수호 태세', v: `공격 ${Math.round(p.guardian * 100)}% 대신 받음`, tone: 'buff' });
    if (p.taunt > 0) push({ k: 'pre', pre: 'fx', a: p.id, icon: '📢', n: '도발', v: `${p.taunt}턴`, tone: 'buff' });
    // 대기형 효과 (1.260.0) — 발동 조건이 올 때까지 기다리는 효과. tone 'ready' = 직업색 컷인
    const ss = p.standbySrc || {}; const by = (k) => (ss[k]?.length ? ss[k].join(' · ') : null);
    if (p.firstCrit) push({ k: 'pre', pre: 'fx', a: p.id, icon: '✦', n: '선제 일격', v: '첫 공격 치명 확정', src: by('firstCrit'), tone: 'ready' });
    if (p.emergencyHeal) push({ k: 'pre', pre: 'fx', a: p.id, icon: '✚', n: '위기 회복', v: `HP 30% 아래가 되면 1회 ${Math.round(p.emergencyHeal * 100)}% 회복`, src: by('emergencyHeal'), tone: 'ready' });
    if (p.guts) push({ k: 'pre', pre: 'fx', a: p.id, icon: '⛨', n: '버팀', v: '쓰러질 피해를 1회 HP 1로 버팀', src: by('guts'), tone: 'ready' });
    if (p.revive) push({ k: 'pre', pre: 'fx', a: p.id, icon: '✧', n: '부활 대기', v: `쓰러지면 1회 HP ${Math.round(p.revive * 100)}%로 부활`, src: by('revive'), tone: 'ready' });
    if (p.vGuard) push({ k: 'pre', pre: 'fx', a: p.id, icon: '✧', n: '수호신의 가호', v: '주인공이 쓰러질 피해를 1회 막는다', tone: 'buff' });
  }
  const foesAll = units.filter(x => x.side === 'enemy');
  const im = Math.max(0, ...foesAll.map(x => x.intim || 0));
  if (im) { const st = intimidateStep(im); push({ k: 'pre', pre: 'fx', icon: im >= 4 ? '☠' : '☗', n: im >= 4 ? '절대 위압' : `위압 ${im}단계`, v: `적 HP ×${st?.hp} · 공격 ×${st?.atk}`, tone: 'foe' }); }
  const mb = foesAll.find(x => x.mech && BOSS_MECHS[x.mech]);
  if (mb) push({ k: 'pre', pre: 'fx', a: mb.id, icon: BOSS_MECHS[mb.mech].icon, n: `보스 기믹 · ${BOSS_MECHS[mb.mech].name}`, v: BOSS_MECHS[mb.mech].desc, tone: 'foe' });
  // 전투 시작 효과 — 이프리트의 계약서
  // 1.252.0 — 시작 로그 추가(PM 「겁화가 적용 안 되는 것 같다」: 실제로는 걸렸지만 로그에 출처가 없어 안 보였음)
  //   스킬 「겁화」와 별개 · 턴 소모 없음 · 쿨타임 무관 · 매 턴 공격력 × openInferno (유니크 60% + 특성 낙인의 불씨 4%/점)
  for (const p of units.filter(x => x.side === 'party' && x.openInferno)) {
    const v = Math.max(1, Math.round(p.atk * p.openInferno * (1 + (p.dotDmg || 0)))); const turns = 3 * (p.dotTurnsMult || 1);
    const foes = units.filter(x => x.side === 'enemy' && !immuneTo(p, x));
    for (const e of foes) e.dots.push({ v, t: turns, src: p.id, sn: '이프리트의 낙인' });
    push({ a: p.id, n: `이프리트의 낙인 (매 턴 ${v.toLocaleString()} · ${turns}턴)`, k: 'open', brand: { v, turns }, hits: foes.map(e => ({ t: e.id, burn: true })) });
  }
  enterEv.fx = events.filter(x => (x.k === 'pre' && x.pre === 'fx') || x.k === 'open').length;

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
      if (u.hots.length) {
        const h = healUnit(u, u.hots.reduce((t, x) => t + x.v, 0));
        const src = u.hots[0].src;
        u.hots = u.hots.map(x => ({ ...x, t: x.t - 1 })).filter(x => x.t > 0);
        push({ a: src, n: '지속 회복', k: 'hot', hits: [{ t: u.id, h }] });
      }
      if (u.dots.length && (u.sealOf || u.sealedBoss)) u.dots = u.dots.filter(d => !immuneTo(units.find(x => x.id === d.src), u));
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
      // 자령 치유 고유 패시브 (1.243.0) — 자기 턴마다 아군 전원 소량 회복
      if (u.vRegenAll) {
        const hits = units.filter(x => x.side === u.side && x.hp > 0 && x.hp < x.maxHp).map(x => ({ t: x.id, h: healUnit(x, Math.round(u.healPower * u.vRegenAll)) }));
        if (hits.length) push({ a: u.id, n: u.vName || '생명의 순환', k: 'hot', hits });
      }
      act(u);
      for (const k of Object.keys(u.cds)) if (u.cds[k] > 0) u.cds[k] -= 1;
      if (u.resetEvery && u.turn % u.resetEvery === 0) { const ks = Object.keys(u.cds).filter(k => u.cds[k] > 0); if (ks.length) u.cds[pick(rng, ks)] = 0; }
      for (const b of Object.values(u.buffs)) if (b.t > 0) b.t -= 1;
      if (u.taunt > 0) u.taunt -= 1;
      for (const k of Object.keys(u.fx)) if (u.fx[k].t > 0) u.fx[k].t -= 1;
      if (u.forced && u.forced.t > 0) u.forced.t -= 1;
      if (u.cover && u.cover.t > 0) u.cover.t -= 1;
      if (!alive('enemy').length) { result = 'win'; break; }
      if (!alive('party').length || units.some(x => x.leader && x.hp <= 0)) { result = 'lose'; break; }
      // 봉인 주인이 쓰러지면 그 봉인은 영원히 깰 수 없다 → 실패
      if (units.some(x => x.sealOf && x.hp > 0 && !units.some(p => p.side === 'party' && p.classId === x.sealOf && p.hp > 0))) { result = 'lose'; break; }
    }
    if (result) break;
  }
  if (!result) result = 'lose';
  const finalHp = Object.fromEntries(units.filter(u => u.side === 'party').map(u => [u.id, u.hp]));
  return { result, events, rounds: round, finalHp };
}

// ===== 전투 보상 =====
function rollGrade(rng, grades) { return weighted(rng, grades); }
// 레벨 차이 경험치 배율 (1.234.1) — heroLv 없으면 1
export function expGapMult(heroLv, enemyLv) {
  const g = T.expGap; if (!g || heroLv == null) return 1;
  const over = heroLv - enemyLv - g.free;
  return over > 0 ? Math.max(g.min, 1 - g.perLv * over) : 1;
}
export function battleRewards(enemies, type, rng, mods = {}) {
  const exp = enemies.reduce((s, e) => s + Math.round((6 + e.lv * 3) * (e.rewardMult || 1) * (T.expMult || 1) * (e.tier === 'boss' ? 10 : e.tier === 'elite' ? 3 : 1) * expGapMult(mods.heroLv, e.lv)), 0);
  const gold = enemies.reduce((s, e) => s + Math.round((3 + e.lv * 2) * (e.tier === 'boss' ? 8 : e.tier === 'elite' ? 3 : 1) * (e.goldMult || 1) * (0.85 + rng() * 0.3)), 0);
  const tableKey = type === 'normal' ? 'normal' : type;
  const base = DROP_TABLE[tableKey] || DROP_TABLE.normal;
  const tbl = { ...base, grades: { ...base.grades } };
  if (tbl.grades.epic && mods.epicMult) tbl.grades.epic = tbl.grades.epic * mods.epicMult;
  const ilv = Math.max(...enemies.map(e => e.lv));
  const items = [];
  const count = tbl.items || 1;
  const heroCls = mods.heroCls || 'wanderer';
  const uChance = type === 'boss' ? UNIQUE_CHANCE.boss : (type === 'dungeonBoss' || type === 'towerBoss') ? (mods.uniqueChance || 0) : 0;
  // 🎁 아이템 획득 % (1.225.0 — 보조 사역마) — 확률을 올리고, 100%를 넘는 몫은 추가 장비 확률
  const p = tbl.itemChance * (1 + (mods.dropPct || 0));
  const extra = Math.max(0, p - 1);
  let total = count;
  for (let i = 0; i < count; i++) if (extra && rng() < extra) total++;
  for (let i = 0; i < total; i++) {
    if (i < count && rng() >= Math.min(1, p)) continue;
    const uq = uChance && rng() < uChance ? rollUniqueItem(rng, ilv, heroCls) : null;
    items.push(uq || rollGear(rng, rollGrade(rng, tbl.grades), ilv, heroCls, mods.set || 'field'));
  }
  const essence = ri(rng, tbl.essence[0], tbl.essence[1]);
  const shard = tbl.shard ? Math.round(ri(rng, tbl.shard[0], tbl.shard[1]) * (mods.shardMult || 1)) : 0;
  // 📖 특성 초기화 주문서 (1.224.0 — PM: 보스 확률 드랍, 유니크와 같은 확률)
  const talentScroll = uChance && rng() < uChance ? 1 : 0;
  return { exp, gold, items, essence, shard, talentScroll };
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
    } else if (ctx.kind === 'tower' && save.tower) {
      summary.towerFell = save.tower.run?.floor;
      save.tower.run = null; // 쓰러지면 이번 도전 종료 — 체크포인트는 남는다
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
  let mods = { heroCls: save.hero, dropPct: deriveUnit(save, save.hero).dropPct || 0 };
  if (ctx.kind === 'dungeon' && save.dungeon) {
    const ti = save.dungeon.tier || 0;
    const tier = DUNGEON_TIERS[ti];
    mods = { ...mods, epicMult: tier.epicMult, shardMult: tier.shardMult, set: dungeonDef(save.dungeon.id).set, uniqueChance: UNIQUE_CHANCE.dungeonBoss[ti] || 0 };
  }
  if (ctx.kind === 'tower' && save.tower?.run) mods = { ...mods, uniqueChance: TOWER.uniqueChance(save.tower.run.floor) };
  // 📜 계약서 조각 (1.212.0 — 사역마 소환 재료, 계정 공유)
  const fs = rollFamShards(ctx.enemies, ctx.type, rng, save.dungeon?.tier || 0);
  if (fs) { save.mats.famShard = (save.mats.famShard || 0) + fs; summary.famShards = fs; }
  // 🔮 사역혼 (1.242.0 — 강화·진화 재료 직접 드랍)
  const fso = rollFamSouls(ctx.enemies, ctx.type, rng, save.dungeon?.tier || 0);
  if (fso) { save.mats.famSoul = (save.mats.famSoul || 0) + fso; summary.famSouls = fso; }
  mods = { ...mods, heroLv: save.units[save.hero]?.lv };
  const r = battleRewards(ctx.enemies, ctx.type, rng, mods);
  // 장비 옵션 — 경험치·골드 % (주인공 기준)
  const hd = deriveUnit(save, save.hero);
  r.exp = Math.round(r.exp * (1 + (hd.expPct || 0)));
  r.gold = Math.round(r.gold * (1 + (hd.goldPct || 0)));
  if (r.talentScroll) { save.mats.talentScroll = (save.mats.talentScroll || 0) + r.talentScroll; summary.talentScroll = r.talentScroll; }
  summary.exp = r.exp; summary.gold = r.gold; summary.essence = r.essence; summary.shard = r.shard;
  save.gold += r.gold; save.mats.essence += r.essence; save.mats.shard += r.shard;
  for (const cid of save.party) {
    const ups = gainExp(save.units[cid], r.exp, levelCapOf(save));
    if (ups) summary.levelUps[cid] = save.units[cid].lv;
  }
  // 🐾 동행 사역마 경험치 (1.225.0 — 동행 칸만, 주인공 레벨이 상한)
  const mk = activeMain(save);
  if (mk) {
    const g = gainFamExp(save.fams[mk], r.exp, save.units[save.hero].lv);
    save.fams = { ...save.fams, [mk]: g.f };
    summary.famExp = { key: mk, gained: g.gained, ups: g.ups, lv: g.f.lv };
  }
  // 전승 장비 · 갈래 유니크 (1.221.0 — 전승 캐릭터만)
  const hu = save.units[save.hero];
  if (hu?.rebirth?.count > 0 && battle.result === 'win') {
    const tierI = save.dungeon?.tier || 0;
    const pickC = (t) => (Array.isArray(t) ? t[Math.min(tierI, t.length - 1)] : t) || 0;
    const ty = ctx.type === 'normal' && ctx.enemies.some(e => e.tier === 'elite') ? 'elite' : ctx.type;
    const ilv = Math.max(...ctx.enemies.map(e => e.lv));
    if (rng() < pickC(REBIRTH.mythicDrop[ty])) r.items.push(rollGear(rng, 'mythic', ilv, save.hero));
    const bu = Object.values(UNIQUE_ITEMS).filter(x => x.branch === hu.rebirth.branch);
    if (bu.length && rng() < pickC(REBIRTH.branchUnique[ty])) r.items.push(makeItem(rng, { named: pick(rng, bu).id, ilv }));
  }
  // 자동 분해 (1.231.2) — 설정 등급 이하 · 에픽 이상은 항상 보존 · 타직업은 other 설정일 때만
  const as = save.autoSalvage || { grade: -1 };
  const autoTot = {};
  for (const it of r.items) {
    const g = gradeIdx(it.grade);
    if (as.grade >= 0 && g <= Math.min(as.grade, gradeIdx('rare')) && (as.other || itemUsable(it, save.hero))) {
      for (const [k, v] of Object.entries(salvageOf(it))) autoTot[k] = (autoTot[k] || 0) + v;
      summary.autoSalvaged = (summary.autoSalvaged || 0) + 1;
      continue;
    }
    if (save.inventory.length >= bagMax(save)) { const sv = salvageOf(it); addSalvage(save, sv); summary.autoDismantled = (summary.autoDismantled || 0) + 1; summary.dismantleLoot = summary.dismantleLoot || {}; for (const [k, v] of Object.entries(sv)) summary.dismantleLoot[k] = (summary.dismantleLoot[k] || 0) + v; continue; }
    const item = { ...it, uid: save.nextUid++ };
    save.inventory.push(item);
    summary.items.push(item);
    if (item.grade === 'epic') save.stats.epics += 1;
    if (item.grade === 'unique') save.stats.uniques = (save.stats.uniques || 0) + 1;
    if (item.grade === 'mythic') save.stats.mythics = (save.stats.mythics || 0) + 1;
  }
  if (summary.autoSalvaged) { addSalvage(save, autoTot); summary.autoSalvage = autoTot; }
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
  if (ctx.kind === 'tower' && save.tower?.run) towerAdvance(save, battle, summary);
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
  // 지원 기여 (1.226.1) — 회복(실제 찬 HP) · 보호막(실제 증가량) · 받아낸 피해(적 공격·대신 맞기)
  const healBy = {}; const shieldBy = {}; const takenBy = {};
  const addTo = (m, id, v) => { if (ids.has(id) && v > 0) m[id] = (m[id] || 0) + v; };
  const add = (id, skill, d) => {
    if (!ids.has(id) || !(d > 0)) return;
    byUnit[id] = (byUnit[id] || 0) + d;
    const k = `${id}|${skill}`; bySkill[k] = (bySkill[k] || 0) + d;
  };
  for (const e of sim.events) {
    if (e.k === 'dotTick') { for (const [k, d] of Object.entries(e.dotSrc || {})) { const [id, sn] = k.split('|'); add(id, sn, d); } continue; }
    if (!e.a || !e.hits) continue;
    for (const h of e.hits) {
      if (ids.has(e.a)) { addTo(healBy, e.a, h.eh ?? (e.k === 'hot' ? h.h : 0)); addTo(shieldBy, e.a, h.es || 0); }
      else if (ids.has(h.t) && h.d > 0) addTo(takenBy, h.t, h.d);
      if (!(h.d > 0) || ids.has(h.t)) continue;
      if (h.counter) add(h.by, '반격', h.d);
      else add(e.a, h.chain ? `${e.n}(추가타)` : e.n, h.d);
    }
  }
  return { byUnit, bySkill, healBy, shieldBy, takenBy, rounds: sim.rounds || 1 };
}


// ===== 상세 전투 통계 (1.238.0) — 전투 집계 「📈 상세 통계」 탭 =====
// 유닛(주인공·사역마)마다 행동·스킬·피해·치명·빗나감·반격·추가타·처치·회복·보호막·받은 피해·회피·흡수·대신 맞기·쓰러짐을 센다
// 스킬마다 사용 횟수·피해·적중·치명·회복·보호막 · 합치기는 mergeDetailStats (최대값 키는 max, 나머지는 합)
export const DETAIL_MAX_KEYS = ['maxHit', 'maxTaken', 'maxHeal'];
function emptyDetail() {
  return {
    acts: 0, skillUses: 0, basicUses: 0,
    dmg: 0, hitDmg: 0, landed: 0, crits: 0, critDmg: 0, misses: 0, maxHit: 0,
    dotDmg: 0, counters: 0, counterDmg: 0, chains: 0, chainDmg: 0, holyDmg: 0, reflectDmg: 0, kills: 0,
    heal: 0, overheal: 0, hotHeal: 0, maxHeal: 0, shield: 0, buffs: 0, debuffs: 0,
    taken: 0, timesHit: 0, maxTaken: 0, absorbed: 0, dodged: 0, targeted: 0, incoming: 0, coverHits: 0, coverDmg: 0, dotTaken: 0,
    healRecv: 0, shieldRecv: 0, deaths: 0,
  };
}
export function battleDetailStats(sim, party) {
  const ids = new Set(party.map(p => p.id));
  const units = Object.fromEntries(party.map(p => [p.id, emptyDetail()]));
  const skills = {}; // `${id}|${스킬명}` → { uses, dmg, hits, crits, heal, shield }
  const sk = (id, n) => { const k = `${id}|${n}`; return (skills[k] = skills[k] || { uses: 0, dmg: 0, hits: 0, crits: 0, heal: 0, shield: 0 }); };
  const prevHp = {};
  for (const e of sim.events) {
    if (!e.a) continue;
    const mine = ids.has(e.a);
    const U = mine ? units[e.a] : null;
    // 처치·쓰러짐 — 사건 뒤 HP 스냅샷이 0이 된 유닛 (처치 공로 = 마지막 일격의 주인)
    const credit = (tid) => {
      if (e.k === 'dotTick') { const top = Object.entries(e.dotSrc || {}).sort((a, b) => b[1] - a[1])[0]; return top ? top[0].split('|')[0] : null; }
      const h = (e.hits || []).find(x => x.t === tid && x.counter);
      return h ? h.by : e.a;
    };
    if (e.k === 'dotTick') {
      for (const [k, d] of Object.entries(e.dotSrc || {})) {
        const [id, sn] = k.split('|');
        if (!ids.has(id)) continue;
        units[id].dotDmg += d; units[id].dmg += d;
        const S = sk(id, sn); S.dmg += d;
      }
      if (mine) { const d = e.hits?.[0]?.d || 0; U.dotTaken += d; U.taken += d; }
    } else if (e.k === 'open' || e.k === 'pre') {
      // 개전 효과 — 행동 아님 (피해는 이후 dotTick으로 집계)
    } else if (e.k === 'hot') {
      for (const h of e.hits || []) {
        if (mine) { U.hotHeal += h.h || 0; U.heal += h.h || 0; }
        if (ids.has(h.t)) units[h.t].healRecv += h.h || 0;
      }
    } else {
      if (mine) {
        U.acts += 1;
        if (e.skill) U.skillUses += 1; else if (e.k === 'attack') U.basicUses += 1;
        sk(e.a, e.n).uses += 1;
      }
      for (const h of e.hits || []) {
        const toParty = ids.has(h.t);
        // 반격 — 맞은 쪽(by)이 공격자에게 되돌린 피해
        if (h.counter) {
          if (ids.has(h.by) && !toParty && h.d > 0) {
            const C = units[h.by]; C.counters += 1; C.counterDmg += h.d; C.dmg += h.d; C.landed += 1; C.maxHit = Math.max(C.maxHit, h.d);
            if (h.c) { C.crits += 1; C.critDmg += h.d; }
            const S = sk(h.by, '반격'); S.uses += 1; S.dmg += h.d; S.hits += 1; if (h.c) S.crits += 1;
          }
          continue;
        }
        if (mine) {
          const S = sk(e.a, h.chain ? `${e.n}(추가타)` : e.n);
          if (!toParty) {
            if (h.m) { U.misses += 1; continue; }
            if (h.d > 0) {
              U.dmg += h.d; U.landed += 1; U.maxHit = Math.max(U.maxHit, h.d);
              if (h.holy) U.holyDmg += h.d; else if (h.chain) { U.chains += 1; U.chainDmg += h.d; } else if (e.k === 'reflect') U.reflectDmg += h.d; else U.hitDmg += h.d;
              if (h.c) { U.crits += 1; U.critDmg += h.d; S.crits += 1; }
              S.dmg += h.d; S.hits += 1;
            }
            if (h.debuff) U.debuffs += 1;
          } else {
            const eh = h.eh ?? 0;
            if (eh > 0 || h.h > 0) { U.heal += eh; U.overheal += Math.max(0, (h.h || 0) - eh); U.maxHeal = Math.max(U.maxHeal, eh); S.heal += eh; units[h.t].healRecv += eh; }
            if (h.es > 0) { U.shield += h.es; S.shield += h.es; units[h.t].shieldRecv += h.es; }
            if (h.buff) U.buffs += 1;
          }
        } else if (toParty) {
          // 적의 공격 → 파티가 받은 피해
          // 1.239.2: 피격 = HP가 닳았거나 보호막에 막힌 타격 (전부 막힌 타격도 맞은 것) · targeted = 회피 포함 공격 대상이 된 횟수
          const T = units[h.t];
          if (!(h.d > 0 || h.ab > 0 || h.m)) continue;
          T.targeted += 1;
          if (h.m) { T.dodged += 1; continue; }
          const inc = (h.d || 0) + (h.ab || 0);
          T.timesHit += 1; T.incoming += inc; T.maxTaken = Math.max(T.maxTaken, inc);
          if (h.d > 0) {
            T.taken += h.d;
            if (h.cover) { T.coverHits += 1; T.coverDmg += h.d; }
          }
          if (h.ab > 0) T.absorbed += h.ab;
        }
      }
    }
    for (const [id, v] of Object.entries(e.st || {})) {
      const hp = v[0];
      if ((prevHp[id] ?? 1) > 0 && hp <= 0) {
        if (ids.has(id)) units[id].deaths += 1;
        else { const c = credit(id); if (c && ids.has(c)) units[c].kills += 1; }
      }
      prevHp[id] = hp;
    }
  }
  return { units, skills };
}
export function mergeDetailStats(a, b) {
  const out = { units: { ...(a?.units || {}) }, skills: { ...(a?.skills || {}) } };
  for (const [k, u] of Object.entries(b?.units || {})) {
    const cur = { ...(out.units[k] || emptyDetail()) };
    for (const [f, v] of Object.entries(u)) cur[f] = DETAIL_MAX_KEYS.includes(f) ? Math.max(cur[f] || 0, v) : (cur[f] || 0) + v;
    out.units[k] = cur;
  }
  for (const [k, s] of Object.entries(b?.skills || {})) {
    const cur = { ...(out.skills[k] || { uses: 0, dmg: 0, hits: 0, crits: 0, heal: 0, shield: 0 }) };
    for (const [f, v] of Object.entries(s)) cur[f] = (cur[f] || 0) + v;
    out.skills[k] = cur;
  }
  return out;
}

// ===== 무한 탑 「황혼의 첨탑」 (1.215.0) =====
// 캐릭터: save.tower = { best, checkpoint, run: {floor, hp} | null }
// 계정: mats.towerCoin · save.towerWeek = { key(월요일), best, claimed: [10,20,…] }
export { TOWER, TOWER_SHOP, towerUnlocked, isTowerBoss, towerEnemyLv, towerArea };
export const towerWeekKeyNow = () => kstWeekKey();
export function refreshTowerWeek(save0, now = Date.now()) {
  const key = kstWeekKey(now);
  if (save0.towerWeek?.key === key) return save0;
  return { ...save0, towerWeek: { key, best: 0, claimed: [] } };
}
export function startTower(save0) {
  if (!towerUnlocked(save0.progress) || save0.tower?.run) return save0;
  const save = refreshTowerWeek(clone(save0));
  save.tower = save.tower || { best: 0, checkpoint: 0, run: null };
  save.tower.run = { floor: (save.tower.checkpoint || 0) + 1, hp: null };
  return save;
}
export function leaveTower(save0) {
  if (!save0.tower?.run) return save0;
  const save = clone(save0);
  save.tower.run = null;
  return save;
}
export function towerEncounter(save, rng) {
  const floor = save.tower.run.floor;
  const { type, picks } = towerFloorPicks(floor, rng);
  const area = towerArea(floor);
  const lv = towerEnemyLv(floor);
  const enemies = picks.map((k, i) => buildChronicleEnemy(k, lv + (i === 0 && type !== 'towerFloor' ? 1 : 0), `e${i}`, area));
  // 1.257.0 — 첨탑 일반·강적 층도 3마리 무리 (보스 층은 그대로)
  if (T.enemyParty?.on && type !== 'towerBoss') {
    const th = towerTheme(floor);
    while (enemies.length < T.enemyParty.packSize) enemies.push(buildChronicleEnemy(th.normals[Math.floor(rng() * th.normals.length)], lv, `e${enemies.length}`, area));
    const FP = T.floorPack;
    return { type, floor, enemies: packOf(rng, enemies, type === 'towerFloor' ? { mult: FP.mult, reward: FP.reward, all: true } : { mult: FP.mult, reward: FP.reward }) };
  }
  return { type, floor, enemies };
}
function towerAdvance(save, battle, summary) {
  const t = save.tower;
  const floor = t.run.floor;
  const boss = isTowerBoss(floor);
  let coins = TOWER.coins(floor) * (boss ? TOWER.bossCoinMult : 1);
  t.best = Math.max(t.best || 0, floor);
  if (boss) { t.checkpoint = Math.max(t.checkpoint || 0, floor); summary.towerCheckpoint = floor; }
  // 주간 기록 · 10층 단위 첫 도달 보너스
  const w = save.towerWeek && save.towerWeek.key === kstWeekKey() ? save.towerWeek : { key: kstWeekKey(), best: 0, claimed: [] };
  w.best = Math.max(w.best, floor);
  if (boss && !w.claimed.includes(floor)) { w.claimed = [...w.claimed, floor]; const b = TOWER.weeklyBonus(floor); coins += b; summary.towerWeekly = b; }
  save.towerWeek = w;
  save.mats.towerCoin = (save.mats.towerCoin || 0) + coins;
  summary.towerCoins = coins;
  summary.towerFloor = floor;
  t.run = { floor: floor + 1, hp: battle.finalHp };
}
// 첨탑 상점 — uniqueId: 유니크 선택 상자에서 고른 유니크
export function towerShopCanBuy(save, id) {
  const it = TOWER_SHOP.find(x => x.id === id);
  if (!it || (save.mats.towerCoin || 0) < it.cost) return false;
  if (id === 'key' && keyCount(save) >= DUNGEON_KEYS.max) return false;
  if (id === 'unique' && save.inventory.length >= bagMax(save)) return false;
  return true;
}
export function buyTowerItem(save0, id, uniqueId = null) {
  if (!towerShopCanBuy(save0, id)) return save0;
  const it = TOWER_SHOP.find(x => x.id === id);
  const save = clone(save0);
  if (id === 'unique') {
    const u = UNIQUE_ITEMS[uniqueId];
    if (!u || u.disabled || !(u.cls === save.hero || u.cls === 'common')) return save0;
    save.inventory.push({ ...makeItem(Math.random, { named: uniqueId, ilv: save.units[save.hero].lv }), uid: save.nextUid++ });
    save.stats.uniques = (save.stats.uniques || 0) + 1;
  } else if (id === 'shards') save.mats.famShard = (save.mats.famShard || 0) + 10;
  else if (id === 'key') addKeys(save, 1);
  else if (id === 'ancient') save.mats.shard += 5;
  else if (id === 'essence') save.mats.essence += 40;
  save.mats.towerCoin -= it.cost;
  return save;
}

// 남은 스킬 포인트를 특성에 자동 배분 (1.224.0 — 「자동 배분」 버튼·시뮬용)
export function autoAllocateTalents(save0, classId) {
  const u0 = save0.units[classId];
  if (!u0 || u0.sp <= 0) return save0;
  const save = clone(save0);
  const u = save.units[classId];
  autoSpendTalents(u);
  return u.sp === u0.sp ? save0 : save;
}
