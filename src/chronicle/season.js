// ============================================
// chronicle/season.js — 황혼 연대기 · 시즌 교체 (시즌 시리즈 PR ② · 1.296.0)
// ============================================
// 설계서: docs/chronicle-season-design.md
// PM 결정
//   · 시즌 = 1주 (한국 시간 월요일 0시 교체) · 시즌계는 매번 전부 0에서 시작 (경험치 ×1.5 · 원정대 레벨 상한 해제)
//   · 첫 시즌은 PM이 「시즌제 시작」을 누른 뒤 다음 월요일 — 그때의 캐릭터가 「시즌 0」으로 승천한다
//   · 시즌 종료: 순위 확정 → 승천 인장 지급 → 전승한 캐릭터 승천(현재/전승 직전 중 강한 쪽) → 남은 재화 일부를 인장으로 환산 → 초기화
//   · 경쟁자도 같은 방식으로 승천 (내가 쉬어도 주당 최소 활동량만큼은 성장 — rival.js rivalTicks)
// 저장: 계정 season { on, n(시즌 번호), key(주), armed(시작 예약 주), report(지난 시즌 결산 — 확인하면 지움) }
// 데이터 + 순수 함수만. ⚠ 밸런스(보상·환산)는 SEASON 한 곳.
// ============================================
import { kstWeekKey, kstWeekStartMs } from './tower.js';
import { rebirthLevelCap } from './data.js';
import { newAccount } from './account.js';
import { rivalDefs, rivalState, rivalTicks, rivalBoard, RIVAL_TUNING } from './rival.js';
import { arenaBoard } from './arena.js';
import { ascState, ascPreview } from './ascend.js';
import { godState, godRankSeal, rivalGodScore, rivalGodEntries } from './god.js';

const WEEK = 7 * 86400000;
export const SEASON = {
  // 순위 보상 (승천 인장) — [이 순위까지, 인장]
  growthSeals: [[1, 300], [3, 200], [10, 120], [30, 70], [60, 40], [9999, 20]],
  arenaSeals: [[1, 150], [3, 100], [10, 60], [30, 35], [60, 20], [9999, 10]],
  ascendSeal: 30,        // 승천 칸을 새로 채우거나 더 강한 캐릭터로 바꿀 때마다
  // 남은 재화 환산 — 이만큼이 인장 1개 (합계 상한 convertCap)
  convert: { gold: 20000, essence: 400, shard: 20, famSoul: 40, famShard: 20, towerCoin: 40, arenaCoin: 10 },
  convertFam: { red: 0, green: 0, blue: 1, indigo: 4, violet: 15 },   // 사역마 1마리당 인장
  convertItem: { epic: 1, unique: 4, mythic: 4 },                      // 승천하지 않는 장비 1개당 인장
  convertCap: 200,
  logMax: 52,
};
const sealFor = (table, rank) => (table.find(([r]) => rank <= r) || table[table.length - 1])[1];

export function seasonState(acc) {
  const s = acc?.season || {};
  return { on: !!s.on, n: s.n || 0, key: s.key || null, armed: s.armed || null, report: s.report || null };
}
// 시작 예약 — 다음 월요일 0시에 시즌 1이 열린다
export function armSeason(acc, now = Date.now()) {
  const s = seasonState(acc);
  if (s.on) return acc;
  return { ...acc, season: { ...(acc.season || {}), on: false, n: 0, armed: kstWeekKey(now + WEEK) } };
}
export function disarmSeason(acc) {
  const s = seasonState(acc);
  if (s.on || !s.armed) return acc;
  return { ...acc, season: { ...(acc.season || {}), armed: null } };
}
// 남은 시간 (ms) — 시즌 중이면 종료까지, 예약 중이면 시작까지
export function seasonLeftMs(acc, now = Date.now()) {
  const s = seasonState(acc);
  if (s.on && s.key) return Math.max(0, kstWeekStartMs(s.key) + WEEK - now);
  if (s.armed) return Math.max(0, kstWeekStartMs(s.armed) - now);
  return null;
}
export function seasonDue(acc, now = Date.now()) {
  const s = seasonState(acc); const wk = kstWeekKey(now);
  if (s.on) return !!s.key && wk !== s.key;
  return !!s.armed && wk >= s.armed;
}
export const fmtLeft = (ms) => {
  if (ms == null) return '';
  const m = Math.floor(ms / 60000); const d = Math.floor(m / 1440); const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}일 ${h}시간` : h > 0 ? `${h}시간 ${m % 60}분` : `${m % 60}분`;
};

// ===== 남은 재화 → 승천 인장 =====
// keep = 승천하는 스냅샷들 (그 캐릭터의 착용 장비·편성 사역마는 환산하지 않는다)
export function convertLeftovers(acc, keep = []) {
  const parts = [];
  const add = (label, n) => { if (n > 0) parts.push({ label, n }); };
  const C = SEASON.convert; const m = acc.mats || {};
  add('골드', Math.floor((acc.gold || 0) / C.gold));
  add('정수', Math.floor((m.essence || 0) / C.essence));
  add('고대 파편', Math.floor((m.shard || 0) / C.shard));
  add('사역혼', Math.floor((m.famSoul || 0) / C.famSoul));
  add('계약서 조각', Math.floor((m.famShard || 0) / C.famShard));
  add('첨탑 주화', Math.floor((m.towerCoin || 0) / C.towerCoin));
  add('투기장 주화', Math.floor((m.arenaCoin || 0) / C.arenaCoin));
  const keptFam = new Set(); const keptUid = new Set();
  for (const sn of keep) { for (const k of Object.values(sn.char?.famTeam || {})) if (k) keptFam.add(k); for (const it of sn.char?.bag || []) keptUid.add(it.uid); }
  let fam = 0;
  for (const [k, f] of Object.entries(acc.fams || {})) if (!keptFam.has(k)) fam += SEASON.convertFam[f.grade] || 0;
  add('사역마', fam);
  let gear = 0;
  const items = [...(acc.stash || []), ...Object.values(acc.chars || {}).flatMap(c => c.bag || [])];
  for (const it of items) if (!keptUid.has(it.uid)) gear += SEASON.convertItem[it.grade] || 0;
  add('장비', gear);
  const raw = parts.reduce((s, p) => s + p.n, 0);
  return { parts, raw, seal: Math.min(SEASON.convertCap, raw) };
}

// ===== 경쟁자 승천 =====
// 시즌이 끝난 순간의 경쟁자 상태 → 승천할 모습 (전승 직후 저레벨이면 전승 직전 상태)
function rivalAscForm(st) {
  if (st.rebirth < 1) return null;
  if (st.rebirth >= 2 && st.lv < 100) return { rebirth: st.rebirth - 1, lv: rebirthLevelCap(st.rebirth - 1) };
  return { rebirth: st.rebirth, lv: st.lv };
}
const formScore = (f) => f.rebirth * RIVAL_TUNING.scorePerRebirth + f.lv;
export function ascendRivals(rivals0, acc, ticks, n) {
  const rivals = { ...(rivals0 || {}) };
  for (const def of rivalDefs(acc)) {
    const form = rivalAscForm(rivalState(def, ticks));
    if (!form) continue;
    const cur = rivals[def.id]?.[def.branch];
    if (cur && formScore(cur) >= formScore(form)) continue;
    rivals[def.id] = { ...(rivals[def.id] || {}), [def.branch]: { ...form, n } };
  }
  return rivals;
}

// ===== 시즌 교체 =====
// 지금 계정으로 결산 내용을 미리 계산 (버튼 누르기 전 안내 · 실제 교체 공용). endNow = 시즌이 끝난 시각
export function seasonSettlement(acc, endNow = Date.now()) {
  const s = seasonState(acc);
  const plan = ascPreview(acc);
  const asc0 = ascState(acc);
  const ascended = []; const skipped = []; const keep = [];
  const slots = { ...asc0.slots };
  for (const p of plan) {
    if (!p.eligible) { skipped.push({ cid: p.cid, lv: p.lv }); continue; }
    const result = !p.cur ? 'new' : p.replaces ? 'replace' : 'keep';
    ascended.push({ cid: p.cid, branch: p.slot, power: p.snap.power, rebirth: p.snap.rebirth, lv: p.snap.lv, from: p.from, result, prev: p.cur ? p.cur.power : 0 });
    if (result !== 'keep') { slots[p.slot] = { ...p.snap, season: s.n }; keep.push(p.snap); }
  }
  const conv = convertLeftovers(acc, keep);
  let growth = null, arena = null;
  if (s.on) { // 순위 보상은 시즌 중에만 (시즌 0은 경쟁이 아니었다)
    const rows = rivalBoard(acc, null, endNow);
    const mine = rows.find(x => x.me);
    if (mine) growth = { rank: mine.rank, total: rows.length, seal: sealFor(SEASON.growthSeals, mine.rank), name: mine.name };
    const ab = arenaBoard(acc, endNow); const am = ab.find(x => x.me);
    if (am) arena = { rank: am.rank, total: ab.length, seal: sealFor(SEASON.arenaSeals, am.rank) };
  }
  // 승천 순위 (신 토벌 최고 점수) — 기록이 있을 때만. 경쟁자 점수는 이때 계산한다 (구성별 캐시)
  let god = null;
  const gs = godState(acc, endNow);
  if (s.on && gs.best > 0) {
    const above = rivalGodEntries(acc).filter(e => rivalGodScore(e.r, e.slots) > gs.best).length;
    god = { rank: above + 1, total: rivalGodEntries(acc).length + 1, score: gs.best, seal: godRankSeal(above + 1) };
  }
  const ascSeal = ascended.filter(a => a.result !== 'keep').length * SEASON.ascendSeal;
  const seal = (growth?.seal || 0) + (arena?.seal || 0) + (god?.seal || 0) + ascSeal + conv.seal;
  return { n: s.n, ascended, skipped, slots, conv, growth, arena, god, ascSeal, seal };
}
// 교체 실행 → 새 계정 (시즌계는 비고, 승천계·설정·결산 보고만 남는다)
export function rollSeason(acc, now = Date.now()) {
  if (!seasonDue(acc, now)) return acc;
  const s = seasonState(acc);
  const endNow = s.on && s.key ? kstWeekStartMs(s.key) + WEEK : now;
  const st = seasonSettlement(acc, endNow);
  const asc0 = ascState(acc);
  const rivals = ascendRivals(acc.asc?.rivals, acc, rivalTicks(acc, endNow), s.n);
  const storySeen = { ...(acc.asc?.storySeen || {}) };
  for (const c of Object.values(acc.chars || {})) for (const [id, v] of Object.entries(c.story?.seen || {})) if (v) storySeen[id] = true;
  const report = { n: s.n, at: now, ascended: st.ascended, skipped: st.skipped, growth: st.growth, arena: st.arena, god: st.god, ascSeal: st.ascSeal, conv: st.conv, seal: st.seal };
  const log = [...asc0.log, { n: s.n, at: now, ascended: st.ascended.map(a => ({ branch: a.branch, power: a.power, rebirth: a.rebirth, lv: a.lv, result: a.result })), growth: st.growth?.rank || null, arena: st.arena?.rank || null, seal: st.seal }].slice(-SEASON.logMax);
  const fresh = newAccount(false);
  return {
    ...fresh,
    createdAt: acc.createdAt || fresh.createdAt,
    autoSalvage: acc.autoSalvage, autoAccept: acc.autoAccept,
    asc: { ...(acc.asc || {}), slots: st.slots, cand: {}, log, seal: asc0.seal + st.seal, rivals, storySeen },
    season: { on: true, n: s.n + 1, key: kstWeekKey(now), armed: null, report },
  };
}
export const clearSeasonReport = (acc) => (acc?.season?.report ? { ...acc, season: { ...acc.season, report: null } } : acc);
// 백업·되돌리기로 불러온 계정 — 불러오자마자 교체가 일어나지 않게 붙잡는다
//   예약 중이던 저장 → 예약 해제 (다시 눌러야 함) / 시즌 중이던 저장 → 그 시즌을 이번 주까지 이어 감
export function holdSeason(acc, now = Date.now()) {
  const s = seasonState(acc);
  if (!seasonDue(acc, now)) return acc;
  return s.on ? { ...acc, season: { ...acc.season, key: kstWeekKey(now) } } : { ...acc, season: { ...(acc.season || {}), armed: null } };
}
