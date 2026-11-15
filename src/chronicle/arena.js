// ============================================
// chronicle/arena.js — 황혼 연대기 · 투기장 (경쟁 시리즈 3단계)
// ============================================
// PM 결정: 투기장 순위는 성장 순위와 따로 · 캐릭터당 하루 5회 · 투기장 주화 + 전용 상점 · 비슷한 점수 3명 중 선택.
// 구조
//   ① 경쟁자는 rival.js의 상태(레벨·전승)로 「실제 캐릭터」를 조립한다 (rivalSave — 결정론, 저장 안 함)
//   ② 전투는 engine의 결투(pvp) + 결투 보정(DUEL.mult) — 사냥·던전 밸런스와 무관
//   ③ 저장: 계정 arena { date, used{cid}, refresh{cid}, my{cid: 점수 변동}, rv{경쟁자 id: 점수 변동}, wins, losses } + mats.arenaCoin
// ⚠ 밸런스 조정은 ARENA 한 곳.
import * as E from './engine.js';
import * as F from './familiar.js';
import { chronicleClass, chronicleEnemyArt, CHRONICLE_FIELDS, CHRONICLE_DUNGEONS, DUNGEON_KEYS, FORGE, rebirthLevelCap } from './data.js';
import { RIVAL_FAMS, RIVAL_TUNING, rivalState, rivalTicks, rivalDefs } from './rival.js';
import { toView } from './account.js';

export const ARENA = {
  daily: 5,            // 캐릭터당 하루 도전 횟수
  refreshDaily: 1,     // 상대 목록 새로 고침 (캐릭터당 하루)
  base: 1000,          // 투기장 점수 = base + 전력 점수 × perPower + 결투로 얻은 변동
  perPower: 4, rebirthPower: 25, // 전력 점수 = 레벨 + 전승 횟수 × 25 (성장 순위의 전승 × 120과 다르다 — 갓 전승한 Lv.30은 결투에서 약하다)
  // 경쟁자 전력 배율 — 경쟁자가 조립하지 않는 몫(원정대 버프·전승 특전·유니크 풀세트 등)을 체력·공격 배율로 준다.
  // 1.299.0: 사역마를 실제 소환·강화로 얻고 보조 2칸·보유 효과·인연이 붙어 2.5 → 2.0 (PM 저장 구간 승률 평균 58% → 59%)
  rivalMult: 2.0,
  k: 24,               // 한 판에 움직이는 최대 점수
  spread: 200,         // 이 점수 차이면 기대 승률 약 76%
  rivalShare: 0.5,     // 상대 점수는 내 변동의 절반만 반대로 움직인다
  coinWin: 12, coinLose: 4, coinUpset: 4, upsetGap: 40, // 점수가 upsetGap 이상 높은 상대를 이기면 추가
  oddsBattles: 16,     // 예상 승률 계산 판 수
};

export const ARENA_SHOP = [
  { id: 'soul', name: '🔮 사역혼 ×50', desc: '사역마 강화·진화·초월 재료', cost: 40, give: { famSoul: 50 } },
  { id: 'shards', name: '📜 계약서 조각 ×10', desc: '사역마 소환 1회분', cost: 25, give: { famShard: 10 } },
  { id: 'ancient', name: '◆ 고대 파편 ×5', desc: '에픽 승급·수치 재설정 재료', cost: 30, give: { shard: 5 } },
  { id: 'essence', name: '✦ 정수 ×60', desc: '강화·옵션 재설정 재료', cost: 20, give: { essence: 60 } },
  { id: 'scroll', name: '📖 특성 초기화 주문서', desc: '특성을 다시 찍는다', cost: 60, give: { talentScroll: 1 } },
  { id: 'key', name: '🗝 던전 열쇠', desc: '던전 입장권 1개 (최대 보유량까지)', cost: 25, key: 1 },
];

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// ===== 경쟁자 → 실제 캐릭터 =====
// 장비: 레벨에 맞는 등급 · 강화 / 전승자는 유니크 무기 + 높은 레벨 장비(레벨 맞춤 착용) / 사역마: 진행도에 맞는 등급

// ===== 경쟁자 사역마 (1.299.0 PM: 「직접 소환·강화로 얻게」) =====
// 경쟁자가 치른 전투 수만큼 조각·사역혼을 벌어, 플레이어와 같은 함수(소환·강화·진화)로 굴린다.
// 10회 소환 묶음마다 그 시점의 진행도(레벨·전승)로 소환 → 번 사역혼을 동행·보조 2칸에 쓴다. 난수는 경쟁자별 고정.
export const RIVAL_FAM = {
  battlesPerSummon: 25,   // 약 25전에 소환 1회 (플레이어 실측과 같은 속도)
  soulPerBattle: 0.2,     // 전투로 버는 사역혼 (일반 0.09 + 강적·보스·던전 몫)
  batch: 10,              // 10회 소환 묶음 (청령 이상 1마리 확정)
  mainWeight: 0.5,        // 사역혼은 동행에 먼저 쓴다 (동행 비용을 절반으로 쳐서 비교)
};
const GI = (g) => F.famGradeIdx(g);
function progressAt(st) {
  const peak = st.peak || st.lv;
  const bossCleared = {};
  for (const f of CHRONICLE_FIELDS) if (f.bossLv <= peak && (st.rebirth || 0) >= (f.reqRebirth || 0)) bossCleared[f.id] = true;
  const dungeonTier = {};
  for (const d of CHRONICLE_DUNGEONS) if (bossCleared[d.unlockField]) dungeonTier[d.id] = 0;
  return { bossCleared, dungeonTier };
}
// 전투 수를 모르는 상태(승천한 경쟁자 등)의 전투 수 추정
function battlesFor(st) {
  if (st.battles != null) return st.battles;
  const T = RIVAL_TUNING; const first = T.firstCurve[T.firstCurve.length - 1][0];
  const over = (g) => (g <= 100 ? 0 : g <= 120 ? T.overBattles * Math.pow((g - 100) / 20, 1 / T.overPow) : T.overBattles + (g - 120) / 10 * T.deepBattles);
  let n = 0;
  for (let i = 0; i < (st.rebirth || 0); i++) n += first * (i === 0 ? 1 : T.regrowMult) + over(i === 0 ? 100 : rebirthLevelCap(i));
  const sc = st.rebirth ? T.regrowMult : 1; const lv = st.lv || 1;
  if (lv >= 100) n += first * sc + over(lv);
  else { const c = T.firstCurve; let k = 1; while (k < c.length - 1 && c[k][1] < lv) k++; n += (c[k - 1][0] + (c[k][0] - c[k - 1][0]) * (lv - c[k - 1][1]) / Math.max(1, c[k][1] - c[k - 1][1])) * sc; }
  return Math.round(n);
}
function pickTeam(fams, role) {
  const keys = Object.keys(fams).sort((a, b) => GI(fams[b].grade) - GI(fams[a].grade) || (fams[b].plus || 0) - (fams[a].plus || 0) || (a < b ? -1 : 1));
  const main = keys.find(k => F.famRole(k) === role) || keys[0] || null;
  const rest = keys.filter(k => k !== main);
  return { main, sub1: rest[0] || null, sub2: rest[1] || null };
}
const FAM_CACHE = new Map();
// → { fams, team, log { summons, enhance, evoTry, evoOk, soulsEarned, soulsLeft, byGrade } }
export function rivalFams(r, st) {
  const R = RIVAL_FAM;
  const battles = battlesFor(st);
  const batches = Math.floor(battles / (R.battlesPerSummon * R.batch));
  const role = RIVAL_FAMS[r.fam][0];
  const ck = `${r.id}|${r.fam}|${batches}`;
  if (FAM_CACHE.has(ck)) return FAM_CACHE.get(ck);
  const rng = seeded(hash(r.id + ':fam'));
  let fams = {}; let pity = {}; let souls = 0;
  const log = { summons: 0, enhance: 0, evoTry: 0, evoOk: 0, transTry: 0, transOk: 0, soulsEarned: 0, soulsLeft: 0, byGrade: {} };
  const perBatch = R.battlesPerSummon * R.batch;
  const pr = { ...r, pace: 1 };
  for (let i = 1; i <= batches; i++) {
    const at = st.battles != null ? rivalState(pr, i * perBatch) : st; // 그 시점의 진행도 (전투 수를 모르면 지금 상태)
    const res = F.summonFamiliars(fams, pity, progressAt(at), R.batch, rng);
    fams = res.fams; pity = res.pity;
    const earn = res.souls + perBatch * R.soulPerBattle;
    souls += earn; log.soulsEarned += earn; log.summons += R.batch;
    for (const x of res.results || []) { const g = x.grade || x.gid; if (g) log.byGrade[g] = (log.byGrade[g] || 0) + 1; }
    for (let guard = 0; guard < 300; guard++) {
      const t = pickTeam(fams, role);
      const acts = [];
      for (const [slot, k] of Object.entries(t)) {
        const f = k && fams[k]; if (!f) continue;
        const w = slot === 'main' ? R.mainWeight : 1;
        if ((f.plus || 0) < F.FAM_TUNING.maxPlus) acts.push({ k, kind: 'enh', cost: F.FAM_TUNING.enhanceCost(f.plus || 0, f.grade), w });
        else if (slot === 'main' && GI(f.grade) < F.FAM_GRADES.length - 1) acts.push({ k, kind: 'evo', cost: F.FAM_TUNING.evolveCost(f.grade), w });
        else if (slot === 'main' && F.famCanTranscend(f)) acts.push({ k, kind: 'trans', cost: F.famTransCost(f), w }); // 자령 +10 → 초월 (1.299.1)
      }
      if (!acts.length) break;
      acts.sort((a, b) => a.cost * a.w - b.cost * b.w);
      const a = acts[0];
      if (souls < a.cost) break; // 모은다
      if (a.kind === 'enh') { const x = F.enhanceFamiliar(fams, souls, a.k); if (!x.ok) break; fams = x.fams; souls = x.souls; log.enhance += 1; }
      else if (a.kind === 'trans') { const x = F.transcendFamiliar(fams, souls, a.k, rng); if (!x.result) break; fams = x.fams; souls = x.souls; log.transTry += 1; if (x.result === 'success') log.transOk += 1; }
      else { const x = F.evolveFamiliar(fams, souls, a.k, rng); if (!x.result) break; fams = x.fams; souls = x.souls; log.evoTry += 1; if (x.result === 'success') log.evoOk += 1; }
    }
  }
  log.soulsLeft = Math.floor(souls); log.soulsEarned = Math.floor(log.soulsEarned);
  const out = { fams, team: pickTeam(fams, role), log };
  if (FAM_CACHE.size > 400) FAM_CACHE.clear();
  FAM_CACHE.set(ck, out);
  return out;
}
// 1.294.1 PM 결정 「실제 확률로 강화」 — 경쟁자도 내 대장간과 같은 성공·하락·파괴 확률로 강화한다.
//   부위마다 따로 굴린다 (경쟁자·부위별 고정 난수 — 시도 횟수가 늘면 그 뒤를 이어서 굴리므로 결과가 뒤바뀌지 않는다)
//   시도 횟수 = 최고 레벨 × tryPerLv + 전승 × tryPerRebirth (무기는 ×weaponTry)
//   목표 = 경쟁자 성향 (+7 안전 / +8 / +9 / +10) — 목표에 닿으면 멈춘다. 파괴되면 새 장비(+0)로 다시 시작한다.
export const RIVAL_FORGE = {
  tryPerLv: 0.12, tryPerRebirth: 6, weaponTry: 1.3,
  targets: [[7, 50], [8, 30], [9, 15], [10, 5]], // [목표 강화, 비중 %]
};
export function rivalForgeTarget(r) {
  let x = hash(r.id + ':forge') % 100;
  for (const [t, w] of RIVAL_FORGE.targets) { if (x < w) return t; x -= w; }
  return 7;
}
// → { plus, tries, fails, drops, breaks, target }
export function rivalEnhance(r, slot, st) {
  const peak = st.peak || st.lv;
  const tries = Math.floor((peak * RIVAL_FORGE.tryPerLv + st.rebirth * RIVAL_FORGE.tryPerRebirth) * (slot === 'weapon' ? RIVAL_FORGE.weaponTry : 1));
  const target = rivalForgeTarget(r);
  const rng = seeded(hash(r.id + ':' + slot));
  let plus = 0, fails = 0, drops = 0, breaks = 0, used = 0;
  for (let i = 0; i < tries && plus < target; i++) {
    used++;
    if (rng() < FORGE.enhanceRate[plus]) { plus++; continue; }
    fails++;
    if (plus >= FORGE.enhanceBreakFrom && rng() < FORGE.enhanceBreakChance) { breaks++; plus = 0; continue; }
    if (plus >= FORGE.enhanceDropFrom) { drops++; plus--; }
  }
  return { plus, tries: used, fails, drops, breaks, target };
}
export function rivalGearPlan(st) {
  const peak = st.peak || st.lv;
  const grade = st.rebirth >= 3 ? 'mythic' : peak >= 50 ? 'epic' : peak >= 25 ? 'rare' : 'uncommon';
  const ilv = st.rebirth > 0 ? Math.max(100, peak) : st.lv;
  return { grade, ilv, unique: st.rebirth >= 1 };
}
const SAVE_CACHE = new Map();
export function rivalSave(r, st) {
  const ck = `${r.id}|${r.branch}|${st.rebirth}|${st.lv}|${st.peak || st.lv}|${st.battles ?? 'x'}`;
  if (SAVE_CACHE.has(ck)) return SAVE_CACHE.get(ck);
  const rng = seeded(hash(r.id) + st.rebirth * 7919 + st.lv * 31);
  const plan = rivalGearPlan(st);
  let u = E.makeUnit(r.cls, st.lv);
  if (st.rebirth > 0) u.rebirth = { branch: r.branch, count: st.rebirth, perks: [] };
  const save = E.newChronicleSave(r.cls);
  for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) {
    let it = null;
    if (plan.unique && slot === 'weapon') it = E.rollUniqueItem(rng, plan.ilv, r.cls);
    if (!it || it.slot !== slot) it = E.rollItem(rng, plan.grade, plan.ilv, slot, 'field', r.cls);
    it.uid = save.nextUid++; it.plus = rivalEnhance(r, slot, st).plus;
    save.inventory.push(it); u.equip[slot] = it.uid;
  }
  u = E.autoGrowUnit(u);
  save.units = { [r.cls]: u };
  // 사역마 — 실제 소환·강화·진화 결과 (rivalFams). 동행 1 + 보조 2 · 보유한 것 전부가 보유 효과·인연에 들어간다
  const fm = rivalFams(r, st);
  if (fm.team.main) {
    save.fams = Object.fromEntries(Object.entries(fm.fams).map(([k, f]) => [k, { ...f, lv: st.lv, exp: 0 }]));
    save.famTeam = { ...fm.team };
    save.famLog = fm.log;
  }
  if (SAVE_CACHE.size > 60) SAVE_CACHE.clear();
  SAVE_CACHE.set(ck, save);
  return save;
}
// 결투 상대 편 — 이름·그림을 붙인다
export function rivalSide(r, st) {
  const save = rivalSave(r, st);
  const m = ARENA.rivalMult;
  return E.duelSide(save, true).map(u0 => {
    const maxHp = Math.round(u0.maxHp * m);
    const u = { ...u0, maxHp, hp: maxHp, atk: Math.round(u0.atk * m) };
    return u.fam ? { ...u, art: chronicleEnemyArt(u.famKey) } : { ...u, name: r.name, short: r.name, art: chronicleClass(r.cls).combatImage, rival: r.id };
  });
}

// ===== 점수·순위 =====
export const arenaPower = (rebirth, lv) => (lv || 1) + (rebirth || 0) * ARENA.rebirthPower;
const baseRating = (rebirth, lv) => ARENA.base + arenaPower(rebirth, lv) * ARENA.perPower;
const today = () => E.kstDateKey();
export function arenaState(acc) {
  const a = acc?.arena || {};
  const fresh = a.date === today();
  return { date: today(), used: fresh ? a.used || {} : {}, refresh: fresh ? a.refresh || {} : {}, my: a.my || {}, rv: a.rv || {}, wins: a.wins || 0, losses: a.losses || 0 };
}
export const arenaLeft = (acc, cid = acc?.active) => Math.max(0, ARENA.daily - (arenaState(acc).used[cid] || 0));
export const arenaRefreshLeft = (acc, cid = acc?.active) => Math.max(0, ARENA.refreshDaily - (arenaState(acc).refresh[cid] || 0));
export function myArenaRating(acc, cid = acc?.active) {
  const c = acc?.chars?.[cid];
  if (!c?.unit) return ARENA.base;
  return baseRating(c.unit.rebirth?.count || 0, c.unit.lv || 1) + (arenaState(acc).my[cid] || 0);
}
// 순위표 — 경쟁자 100명 + 내 캐릭터들 (투기장 점수 순)
export function arenaBoard(acc, now = Date.now()) {
  const ticks = rivalTicks(acc, now); const s = arenaState(acc);
  const rows = rivalDefs(acc).map(r => { const st = rivalState(r, ticks); return { ...r, ...st, rating: baseRating(st.rebirth, st.lv) + (s.rv[r.id] || 0) }; });
  for (const [cid, c] of Object.entries(acc?.chars || {})) {
    if (!c?.unit) continue;
    rows.push({ id: `me_${cid}`, me: true, cls: cid, branch: c.unit.rebirth?.branch || null, name: chronicleClass(cid).name, rebirth: c.unit.rebirth?.count || 0, lv: c.unit.lv || 1, rating: myArenaRating(acc, cid) });
  }
  rows.sort((a, b) => b.rating - a.rating || (b.me ? 1 : 0) - (a.me ? 1 : 0) || (a.id < b.id ? -1 : 1));
  rows.forEach((x, i) => { x.rank = i + 1; });
  return rows;
}
// 상대 3명 — 내 점수와 가까운 순. 새로 고침하면 그다음으로 가까운 3명
export function arenaOpponents(acc, cid = acc?.active) {
  const mine = myArenaRating(acc, cid);
  const s = arenaState(acc);
  const list = arenaBoard(acc).filter(x => !x.me).sort((a, b) => Math.abs(a.rating - mine) - Math.abs(b.rating - mine) || (a.id < b.id ? -1 : 1));
  const off = ((s.refresh[cid] || 0) * 3) % Math.max(1, list.length - 2);
  return list.slice(off, off + 3).sort((a, b) => b.rating - a.rating);
}
const expected = (me, opp) => 1 / (1 + Math.pow(10, (opp - me) / (ARENA.spread * 2)));
// 이기면/지면 움직이는 점수 (미리 보기용)
export function arenaStake(acc, opp, cid = acc?.active) {
  const e = expected(myArenaRating(acc, cid), opp.rating);
  return { win: Math.max(2, Math.round(ARENA.k * (1 - e))), lose: -Math.max(2, Math.round(ARENA.k * e)) };
}
export const arenaCoinFor = (acc, opp, win, cid = acc?.active) => (win ? ARENA.coinWin + (opp.rating - myArenaRating(acc, cid) >= ARENA.upsetGap ? ARENA.coinUpset : 0) : ARENA.coinLose);

// 결과 판정 — 시간 초과(draw)는 남은 체력 비율이 높은 쪽 승
function settle(sim, party, enemies) {
  if (sim.result !== 'draw') return sim.result;
  let st = null;
  for (let i = sim.events.length - 1; i >= 0; i--) if (sim.events[i].st) { st = sim.events[i].st; break; }
  const pct = (u) => (st && st[u.id] ? st[u.id][0] : u.hp) / Math.max(1, u.maxHp);
  const me = party.find(u => u.leader) || party[0]; const foe = enemies.find(u => u.leader) || enemies[0];
  return pct(me) > pct(foe) ? 'win' : 'lose';
}
// 예상 승률 (같은 시드 → 같은 값)
export function arenaOdds(acc, opp, cid = acc?.active) {
  const r = rivalDefs(acc).find(x => x.id === opp.id); if (!r) return null;
  const view = toView({ ...acc, active: cid }); if (!view) return null;
  const party = E.duelSide(view, false); const enemies = rivalSide(r, opp);
  let w = 0;
  for (let i = 0; i < ARENA.oddsBattles; i++) {
    const sim = E.simulateChronicleBattle(party, enemies, seeded(hash(opp.id) + i * 7919 + opp.lv));
    if (settle(sim, party, enemies) === 'win') w++;
  }
  return w / ARENA.oddsBattles;
}

// ===== 결투 =====
export function arenaFight(acc0, rid, rng = Math.random) {
  const cid = acc0?.active;
  const r = rivalDefs(acc0).find(x => x.id === rid);
  const view = toView(acc0);
  if (!r || !view || arenaLeft(acc0, cid) <= 0) return null;
  const opp = arenaBoard(acc0).find(x => x.id === rid);
  const party = E.duelSide(view, false); const enemies = rivalSide(r, opp);
  const sim0 = E.simulateChronicleBattle(party, enemies, rng);
  const result = settle(sim0, party, enemies);
  const sim = { ...sim0, result, timeout: sim0.result === 'draw' };
  const win = result === 'win';
  const stake = arenaStake(acc0, opp, cid);
  const delta = win ? stake.win : stake.lose;
  const coin = arenaCoinFor(acc0, opp, win, cid);
  const s = arenaState(acc0);
  const before = myArenaRating(acc0, cid);
  const arena = {
    ...s,
    used: { ...s.used, [cid]: (s.used[cid] || 0) + 1 },
    my: { ...s.my, [cid]: (s.my[cid] || 0) + delta },
    rv: { ...s.rv, [rid]: (s.rv[rid] || 0) - Math.round(delta * ARENA.rivalShare) },
    wins: s.wins + (win ? 1 : 0), losses: s.losses + (win ? 0 : 1),
  };
  const acc = { ...acc0, arena, mats: { ...acc0.mats, arenaCoin: (acc0.mats?.arenaCoin || 0) + coin } };
  const summary = { result, exp: 0, gold: 0, items: [], essence: 0, shard: 0, levelUps: {}, unlocks: [],
    arena: { name: r.name, delta, coin, before, after: before + delta, timeout: sim.timeout, left: arenaLeft(acc, cid), upset: win && coin > ARENA.coinWin } };
  return { acc, sim, party, enemies, summary, opp };
}
export function arenaRefresh(acc0, cid = acc0?.active) {
  if (arenaRefreshLeft(acc0, cid) <= 0) return { acc: acc0, n: 0 };
  const s = arenaState(acc0);
  return { acc: { ...acc0, arena: { ...s, refresh: { ...s.refresh, [cid]: (s.refresh[cid] || 0) + 1 } } }, n: 1 };
}

// ===== 상점 =====
export function arenaShopCanBuy(acc, id) {
  const it = ARENA_SHOP.find(x => x.id === id);
  if (!it) return { ok: false, why: '' };
  const have = acc?.mats?.arenaCoin || 0;
  if (have < it.cost) return { ok: false, why: `${it.cost - have} 부족` };
  if (it.key && (acc?.keys?.count || 0) >= DUNGEON_KEYS.max) return { ok: false, why: '열쇠 가득' };
  return { ok: true, why: '' };
}
export function arenaBuy(acc0, id) {
  const it = ARENA_SHOP.find(x => x.id === id);
  if (!it || !arenaShopCanBuy(acc0, id).ok) return { acc: acc0, n: 0 };
  const acc = { ...acc0, mats: { ...acc0.mats, arenaCoin: (acc0.mats.arenaCoin || 0) - it.cost } };
  for (const [k, v] of Object.entries(it.give || {})) acc.mats[k] = (acc.mats[k] || 0) + v;
  if (it.key) acc.keys = { ...acc.keys, count: Math.min(DUNGEON_KEYS.max, (acc.keys?.count || 0) + it.key) };
  return { acc, n: 1, item: it };
}
