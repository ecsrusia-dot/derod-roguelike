// ============================================
// chronicle/god.js — 황혼 연대기 · 승천계 「신 토벌」 (시즌 시리즈 PR ③ · 1.297.0)
// ============================================
// 설계서: docs/chronicle-season-design.md 6절
// PM 결정: 승천 캐릭터 최대 5명(갈래 중복 없음) 파티로 신에게 도전 · 단계가 끝없이 오른다 · 하루 3회 · 최고 기록이 점수
//   · 주마다 신의 약점이 바뀐다 (그 계열 능력이 강해짐) → 여러 갈래를 키울 이유
//   · 경쟁자 100명도 자기 승천 캐릭터로 같은 계산을 해 「승천 순위」를 이룬다
// 한 번의 도전 = 지금 파티가 넘을 수 있는 가장 높은 단계를 찾는다 (단계마다 체력은 가득)
//   점수 = 넘은 단계 수 + 다음 단계에서 깎은 체력 비율 (예: 12.43)
// 동행 사역마는 참전하지 않는다 (보조·보유 효과·인연·공명은 능력치에 이미 들어 있다)
// 저장: 계정 asc.god { date, used, best(최고 점수), weekKey, weekBest, party[갈래…], sealStage(인장을 받은 최고 단계) }
// 데이터 + 순수 함수만. ⚠ 밸런스는 GOD 한 곳.
// ============================================
import * as E from './engine.js';
import { buildChronicleEnemy, REBIRTH_BRANCHES } from './data.js';
import { kstWeekKey } from './tower.js';
import { ascState, snapView, ASC_SLOTS } from './ascend.js';
import { rivalSave, ARENA } from './arena.js';
import { RIVALS } from './rival.js';

export const GOD = {
  daily: 3, partyMax: 5,
  bossKey: 'p3_o_boss', bossName: '황혼의 근원 아이온', lv: 130,
  hp0: 30, hpGrow: 1.10,     // 단계 s의 체력 배율 = hp0 × hpGrow^(s−1)
  atk0: 0.7, atkGrow: 1.07,  // 공격 배율
  stageMax: 200,
  sealPerStage: 6,            // 새로 넘은 단계마다 승천 인장 (계정에서 처음 넘는 단계만)
  rankSeals: [[1, 200], [3, 140], [10, 90], [30, 50], [60, 30], [9999, 15]], // 시즌 결산 때 승천 순위 보상
};
// 주간 약점 — 이번 주 파티 전원에게 붙는 보너스 (전투 능력치에 더한다)
export const GOD_WEAK = [
  { id: 'dot', name: '타오르는 살', desc: '지속 피해 +60%', fx: { dotDmg: 0.6 } },
  { id: 'crit', name: '갈라진 갑주', desc: '치명타 피해 +50%', fx: { critMult: 0.5 } },
  { id: 'skill', name: '흔들리는 결계', desc: '스킬 피해 +30%', fx: { skillDmg: 0.3 } },
  { id: 'chain', name: '느린 응수', desc: '추가 타격 확률 +25%p', fx: { chain: 0.25 } },
  { id: 'counter', name: '무딘 일격', desc: '반격 확률 +20%p', fx: { counterPct: 0.2 } },
];
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const godWeak = (now = Date.now()) => GOD_WEAK[hash(kstWeekKey(now)) % GOD_WEAK.length];

const today = () => E.kstDateKey();
export function godState(acc, now = Date.now()) {
  const g = acc?.asc?.god || {};
  const fresh = g.date === today(); const wk = kstWeekKey(now);
  return { date: today(), used: fresh ? g.used || 0 : 0, best: g.best || 0, weekKey: wk, weekBest: g.weekKey === wk ? g.weekBest || 0 : 0, party: g.party || null, sealStage: g.sealStage || 0 };
}
export const godLeft = (acc) => Math.max(0, GOD.daily - godState(acc).used);

// ===== 편성 =====
// 저장된 편성이 없으면 전투력 높은 순으로 5명
export function godPartyIds(acc) {
  const slots = ascState(acc).slots; const have = ASC_SLOTS.filter(b => slots[b]);
  const saved = (godState(acc).party || []).filter(b => slots[b]);
  if (saved.length) return saved.slice(0, GOD.partyMax);
  return have.sort((a, b) => (slots[b].power || 0) - (slots[a].power || 0)).slice(0, GOD.partyMax);
}
// 스냅샷 → 전투 유닛 (id = 갈래 — 같은 직업 두 갈래가 함께 설 수 있다)
function snapUnit(snap, weak) {
  const d = E.deriveUnit(snapView(snap), snap.cls);
  return applyWeak({ ...d, id: snap.branch, name: REBIRTH_BRANCHES[snap.branch]?.name || d.name, short: REBIRTH_BRANCHES[snap.branch]?.name, hp: d.maxHp, leader: false }, weak);
}
function applyWeak(u, weak) {
  if (!weak) return u;
  const o = { ...u };
  for (const [k, v] of Object.entries(weak.fx)) o[k] = (o[k] || 0) + v;
  return o;
}
export function godParty(acc, ids = godPartyIds(acc), weak = godWeak()) {
  const slots = ascState(acc).slots;
  return ids.filter(b => slots[b]).map(b => snapUnit(slots[b], weak));
}
// ===== 신 =====
export function buildGod(stage) {
  const key = GOD.bossKey;
  const s = Math.max(1, stage);
  const e = buildChronicleEnemy(key, GOD.lv, 'god', { hpMult: GOD.hp0 * Math.pow(GOD.hpGrow, s - 1), atkMult: GOD.atk0 * Math.pow(GOD.atkGrow, s - 1) });
  return { ...e, tier: 'boss', name: `${GOD.bossName} · ${s}단계`, short: `${s}단계`, mech: 'storm', god: s };
}
function fightStage(party, stage, seed) {
  const god = buildGod(stage);
  const sim = E.simulateChronicleBattle(party.map(u => ({ ...u })), [god], mulberry(seed + stage * 7919));
  let left = god.maxHp;
  for (let i = sim.events.length - 1; i >= 0; i--) { const st = sim.events[i].st; if (st && st.god) { left = st.god[0]; break; } }
  return { sim, god, win: sim.result === 'win', pct: Math.max(0, Math.min(0.999, 1 - left / god.maxHp)) };
}
// 한 번의 도전 → { cleared, pct, score, last{sim, god} } — 넘을 수 있는 가장 높은 단계를 찾는다 (두 배씩 올라간 뒤 사이를 좁힌다)
export function godRun(party, seed) {
  if (!party.length) return { cleared: 0, pct: 0, score: 0, last: null, won: null };
  let lo = 0, hi = null, last = null, won = null, s = 1;
  while (s <= GOD.stageMax) { const r = fightStage(party, s, seed); if (r.win) { lo = s; won = r; s *= 2; } else { hi = s; last = r; break; } }
  if (hi == null) return { cleared: lo, pct: 0, score: lo, last: null, won };
  while (hi - lo > 1) { const m = (lo + hi) >> 1; const r = fightStage(party, m, seed); if (r.win) { lo = m; won = r; } else { hi = m; last = r; } }
  return { cleared: lo, pct: last.pct, score: Math.round((lo + last.pct) * 100) / 100, last, won };
}
// ===== 도전 (계정 반영) → { acc, run, party, enemies, summary } =====
export function godChallenge(acc0, ids = godPartyIds(acc0), seed = Math.floor(Math.random() * 1e9), now = Date.now()) {
  const g = godState(acc0, now);
  if (g.used >= GOD.daily) return null;
  const weak = godWeak(now);
  const party = godParty(acc0, ids, weak);
  if (!party.length) return null;
  const run = godRun(party, seed);
  const gain = Math.max(0, run.cleared - g.sealStage) * GOD.sealPerStage;
  const asc = { ...(acc0.asc || {}) };
  asc.god = { date: g.date, used: g.used + 1, best: Math.max(g.best, run.score), weekKey: g.weekKey, weekBest: Math.max(g.weekBest, run.score), party: ids, sealStage: Math.max(g.sealStage, run.cleared) };
  asc.seal = (asc.seal || 0) + gain;
  // 보여 줄 전투 = 마지막으로 넘은 단계 (한 단계도 못 넘었으면 막힌 전투)
  const show = run.won || run.last;
  const summary = { result: run.won ? 'win' : 'lose', exp: 0, gold: 0, items: [], essence: 0, shard: 0, levelUps: {}, unlocks: [], god: { cleared: run.cleared, pct: run.pct, score: run.score, best: asc.god.best, prevBest: g.best, seal: gain, weak: weak.name, left: GOD.daily - asc.god.used, wall: run.last ? run.cleared + 1 : null } };
  return { acc: { ...acc0, asc }, run, party, enemies: [show.god], sim: show.sim, summary };
}
export const setGodParty = (acc, ids) => ({ ...acc, asc: { ...(acc.asc || {}), god: { ...(acc.asc?.god || {}), party: ids.slice(0, GOD.partyMax) } } });

// ===== 경쟁자 승천 순위 =====
// 경쟁자의 승천 캐릭터(asc.rivals) 중 강한 5명으로 같은 계산. 약점은 적용하지 않는다(누적 기록이라 주마다 바뀌면 안 된다)
const RIVAL_CACHE = new Map();
export function rivalGodScore(r, slots) {
  const list = Object.entries(slots || {}).map(([branch, f]) => ({ branch, ...f })).sort((a, b) => (b.rebirth * 120 + b.lv) - (a.rebirth * 120 + a.lv)).slice(0, GOD.partyMax);
  if (!list.length) return 0;
  const sig = `${r.id}|${list.map(x => `${x.branch}:${x.rebirth}:${x.lv}`).join(',')}`;
  if (RIVAL_CACHE.has(sig)) return RIVAL_CACHE.get(sig);
  const m = ARENA.rivalMult;
  const party = list.map(x => {
    const def = { ...r, branch: x.branch, cls: REBIRTH_BRANCHES[x.branch].cls };
    const sv = rivalSave(def, { rebirth: x.rebirth, lv: x.lv, peak: Math.max(x.lv, x.rebirth > 0 ? 100 : 1) });
    const d = E.deriveUnit(sv, def.cls);
    const maxHp = Math.round(d.maxHp * m);
    return { ...d, id: x.branch, maxHp, hp: maxHp, atk: Math.round(d.atk * m), leader: false };
  });
  const score = godRun(party, hash(r.id)).score;
  RIVAL_CACHE.set(sig, score);
  return score;
}
// 순위표 한 줄씩 계산할 수 있게 목록만 먼저 준다 (계산은 화면이 조금씩 나눠서)
export function rivalGodEntries(acc) {
  const rv = acc?.asc?.rivals || {};
  return RIVALS.filter(r => rv[r.id]).map(r => ({ r, slots: rv[r.id] }));
}
export function godBoard(acc, scores) {
  const rows = rivalGodEntries(acc).map(({ r, slots }) => ({ id: r.id, name: r.name, n: Object.keys(slots).length, score: scores?.[r.id] ?? null }));
  const g = godState(acc);
  if (g.best > 0) rows.push({ id: 'me', me: true, name: '나', n: Object.keys(ascState(acc).slots).length, score: g.best });
  const done = rows.filter(x => x.score != null).sort((a, b) => b.score - a.score || (b.me ? 1 : 0) - (a.me ? 1 : 0));
  done.forEach((x, i) => { x.rank = i + 1; });
  return { rows: done, pending: rows.length - done.length };
}
export const godRankSeal = (rank) => (GOD.rankSeals.find(([r]) => rank <= r) || GOD.rankSeals[GOD.rankSeals.length - 1])[1];
