// ============================================
// chronicle/daily.js — 일일 임무 (1.233.0) · 주간 임무 (1.274.0)
// ============================================
// 일일: KST 0시 초기화 · **캐릭터(직업)별로 따로** (1.274.0 PM 결정 — 이전엔 계정 공유)
//   계정 필드 daily = { date, by: { [classId]: { prog: {metric: n}, claimed: {id: true}, bonus: bool } } }
//   (구 저장 { date, prog, claimed, bonus }는 그날 처음 기록하는 캐릭터의 것으로 옮긴다)
// 주간: KST 월요일 0시 초기화 · 계정 공유 (모든 캐릭터의 기록 합산)
//   계정 필드 weekly = { key, prog, claimed, bonus }
// 보상은 사냥으로 쉽게 못 모으는 재화 위주 (계약서 조각·열쇠·사역혼)
// 순수 함수 (engine·data·tower만 import)
// ============================================
import { kstDateKey } from './engine.js';
import { kstWeekKey } from './tower.js';
import { DUNGEON_KEYS } from './data.js';

// metric: win(전투 승리) · elite(강적·보스 처치) · dungeonWin(던전 전투 승리) · forge(강화·승급 시도) · summon(사역마 소환 횟수)
export const DAILY_MISSIONS = [
  { id: 'd_win', icon: '⚔', title: '전투 30회 승리', metric: 'win', need: 30, reward: { gold: 3000, famShard: 10 } },
  { id: 'd_elite', icon: '💀', title: '강적·보스 10마리 처치', metric: 'elite', need: 10, reward: { keys: 1 } },
  { id: 'd_dungeon', icon: '🕳', title: '던전 전투 5회 승리', metric: 'dungeonWin', need: 5, reward: { essence: 30 } },
  { id: 'd_forge', icon: '⚒', title: '대장간 강화·승급 3회 시도', metric: 'forge', need: 3, reward: { gold: 5000 } },
  { id: 'd_summon', icon: '🐾', title: '사역마 1회 소환', metric: 'summon', need: 1, reward: { famSoul: 10 } },
];
export const DAILY_BONUS = { reward: { famShard: 10 } }; // 5개 모두 받으면 (1.233.1 소환권 1장 → 조각 10개)

// 주간 임무 (1.274.0) — metric은 일일과 같은 기록 + dailyAll(일일 임무 완주 횟수, 어느 캐릭터든)
export const WEEKLY_MISSIONS = [
  { id: 'w_win', icon: '⚔', title: '전투 300회 승리', metric: 'win', need: 300, reward: { gold: 30000, famShard: 30 } },
  { id: 'w_elite', icon: '💀', title: '강적·보스 100마리 처치', metric: 'elite', need: 100, reward: { keys: 3 } },
  { id: 'w_dungeon', icon: '🕳', title: '던전 전투 30회 승리', metric: 'dungeonWin', need: 30, reward: { essence: 200, shard: 5 } },
  { id: 'w_forge', icon: '⚒', title: '대장간 강화·승급 20회 시도', metric: 'forge', need: 20, reward: { gold: 40000 } },
  { id: 'w_summon', icon: '🐾', title: '사역마 10회 소환', metric: 'summon', need: 10, reward: { famSoul: 40 } },
  { id: 'w_daily', icon: '📅', title: '일일 임무 5회 완주', metric: 'dailyAll', need: 5, reward: { famShard: 30 } },
];
export const WEEKLY_BONUS = { reward: { famSoul: 60, keys: 2 } }; // 6개 모두 받으면

const REWARD_LBL = { gold: ['🪙', '골드'], famShard: ['📜', '계약서 조각'], keys: ['🗝', '던전 열쇠'], essence: ['✦', '정수'], shard: ['◆', '파편'], famSoul: ['🔮', '사역혼'] };
export const dailyRewardText = (r) => Object.entries(r).map(([k, v]) => `${(REWARD_LBL[k] || ['', k])[0]} ${(REWARD_LBL[k] || ['', k])[1]} ${v.toLocaleString()}`).join(' · ');
const EMPTY = () => ({ prog: {}, claimed: {}, bonus: false });
const norm = (s) => ({ prog: s?.prog || {}, claimed: s?.claimed || {}, bonus: !!s?.bonus });
const mergeReward = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (o[k] || 0) + v; return o; };

function giveReward(acc, r) {
  const out = { ...acc, mats: { ...acc.mats } };
  for (const [k, v] of Object.entries(r)) {
    if (k === 'gold') out.gold = (out.gold || 0) + v;
    else if (k === 'keys') out.keys = { ...(out.keys || { count: 0 }), count: Math.min(DUNGEON_KEYS.max, (out.keys?.count || 0) + v) };
    else out.mats[k] = (out.mats[k] || 0) + v;
  }
  return out;
}

// ===== 일일 (캐릭터별) =====
// 오늘의 캐릭터별 기록 묶음 { date, by } — 날짜가 바뀌었으면 비운 상태, 구 저장은 legacyTo 캐릭터의 것으로
function dailyAll(acc, now, legacyTo = acc?.active) {
  const date = kstDateKey(now);
  const d = acc?.daily;
  if (!d || d.date !== date) return { date, by: {} };
  if (d.by) return { date, by: d.by };
  return { date, by: legacyTo ? { [legacyTo]: norm(d) } : {} };
}
// 오늘 상태 — cid 생략 시 현재 캐릭터
export function dailyState(acc, now = Date.now(), cid = acc?.active) {
  const all = dailyAll(acc, now);
  return { date: all.date, ...norm(all.by[cid]) };
}
const putDaily = (acc, now, cid, st) => {
  const all = dailyAll(acc, now, cid);
  return { ...acc, daily: { date: all.date, by: { ...all.by, [cid]: { prog: st.prog, claimed: st.claimed, bonus: st.bonus } } } };
};
const stateOf = (st, m) => {
  const cur = Math.min(m.need, st.prog[m.metric] || 0);
  return { cur, status: st.claimed[m.id] ? 'claimed' : cur >= m.need ? 'done' : 'progress' };
};
export const missionState = (acc, m, now = Date.now(), cid = acc?.active) => stateOf(dailyState(acc, now, cid), m);
export const bonusReady = (acc, now = Date.now(), cid = acc?.active) => { const st = dailyState(acc, now, cid); return DAILY_MISSIONS.every(m => st.claimed[m.id]); };
export const dailyBadge = (acc, now = Date.now(), cid = acc?.active) => {
  const st = dailyState(acc, now, cid);
  const n = DAILY_MISSIONS.filter(m => stateOf(st, m).status === 'done').length;
  return n + (DAILY_MISSIONS.every(m => st.claimed[m.id]) && !st.bonus ? 1 : 0);
};
// 캐릭터별 오늘 요약 — { fin: 달성 수(받음 포함), ready: 받을 보상 수 }
export const dailyCharSummary = (acc, cid, now = Date.now()) => {
  const st = dailyState(acc, now, cid);
  return { fin: DAILY_MISSIONS.filter(m => stateOf(st, m).status !== 'progress').length, ready: dailyBadge(acc, now, cid), bonus: st.bonus };
};

// ===== 주간 (계정 공유) =====
export function weeklyState(acc, now = Date.now()) {
  const key = kstWeekKey(now);
  const w = acc?.weekly;
  return { key, ...(w && w.key === key ? norm(w) : EMPTY()) };
}
export const weeklyMissionState = (acc, m, now = Date.now()) => stateOf(weeklyState(acc, now), m);
export const weeklyBonusReady = (acc, now = Date.now()) => { const st = weeklyState(acc, now); return WEEKLY_MISSIONS.every(m => st.claimed[m.id]); };
export const weeklyBadge = (acc, now = Date.now()) => {
  const st = weeklyState(acc, now);
  const n = WEEKLY_MISSIONS.filter(m => stateOf(st, m).status === 'done').length;
  return n + (WEEKLY_MISSIONS.every(m => st.claimed[m.id]) && !st.bonus ? 1 : 0);
};
const addWeekly = (acc, deltas, now) => {
  const st = weeklyState(acc, now);
  const prog = { ...st.prog };
  for (const [k, v] of Object.entries(deltas)) if (v > 0) prog[k] = (prog[k] || 0) + v;
  return { ...acc, weekly: { ...st, prog } };
};

// 진행 기록 — deltas = { win: 1, elite: 2, ... } · 일일(현재 캐릭터) + 주간(계정) 동시에
export function trackDaily(acc, deltas, now = Date.now()) {
  if (!acc || !deltas || !acc.active) return acc;
  if (!Object.values(deltas).some(v => v > 0)) return acc;
  const st = dailyState(acc, now);
  const prog = { ...st.prog };
  for (const [k, v] of Object.entries(deltas)) if (v > 0) prog[k] = (prog[k] || 0) + v;
  return addWeekly(putDaily(acc, now, acc.active, { ...st, prog }), deltas, now);
}

// ===== 받기 =====
export function claimDaily(acc, id, now = Date.now()) {
  const m = DAILY_MISSIONS.find(x => x.id === id);
  if (!m || missionState(acc, m, now).status !== 'done') return acc;
  const st = dailyState(acc, now);
  return putDaily(giveReward(acc, m.reward), now, acc.active, { ...st, claimed: { ...st.claimed, [id]: true } });
}
export function claimDailyBonus(acc, now = Date.now()) {
  const st = dailyState(acc, now);
  if (st.bonus || !bonusReady(acc, now)) return acc;
  return addWeekly(putDaily(giveReward(acc, DAILY_BONUS.reward), now, acc.active, { ...st, bonus: true }), { dailyAll: 1 }, now);
}
export function claimWeekly(acc, id, now = Date.now()) {
  const m = WEEKLY_MISSIONS.find(x => x.id === id);
  if (!m || weeklyMissionState(acc, m, now).status !== 'done') return acc;
  const st = weeklyState(acc, now);
  return { ...giveReward(acc, m.reward), weekly: { ...st, claimed: { ...st.claimed, [id]: true } } };
}
export function claimWeeklyBonus(acc, now = Date.now()) {
  const st = weeklyState(acc, now);
  if (st.bonus || !weeklyBonusReady(acc, now)) return acc;
  return { ...giveReward(acc, WEEKLY_BONUS.reward), weekly: { ...st, bonus: true } };
}

// 모두 받기 (1.274.0) → { acc, n: 받은 건수, reward: 합계 } — 임무를 다 받으면 완주 보상까지
export function claimAllDaily(acc0, now = Date.now()) {
  let acc = acc0, n = 0, reward = {};
  for (const m of DAILY_MISSIONS) {
    if (missionState(acc, m, now).status !== 'done') continue;
    acc = claimDaily(acc, m.id, now); n += 1; reward = mergeReward(reward, m.reward);
  }
  if (bonusReady(acc, now) && !dailyState(acc, now).bonus) { acc = claimDailyBonus(acc, now); n += 1; reward = mergeReward(reward, DAILY_BONUS.reward); }
  return { acc, n, reward };
}
export function claimAllWeekly(acc0, now = Date.now()) {
  let acc = acc0, n = 0, reward = {};
  for (const m of WEEKLY_MISSIONS) {
    if (weeklyMissionState(acc, m, now).status !== 'done') continue;
    acc = claimWeekly(acc, m.id, now); n += 1; reward = mergeReward(reward, m.reward);
  }
  if (weeklyBonusReady(acc, now) && !weeklyState(acc, now).bonus) { acc = claimWeeklyBonus(acc, now); n += 1; reward = mergeReward(reward, WEEKLY_BONUS.reward); }
  return { acc, n, reward };
}
// 일일 + 주간 한 번에 (일일 완주가 주간 진행을 올리므로 일일 먼저)
export function claimAllMissions(acc0, now = Date.now()) {
  const d = claimAllDaily(acc0, now);
  const w = claimAllWeekly(d.acc, now);
  return { acc: w.acc, n: d.n + w.n, reward: mergeReward(d.reward, w.reward) };
}
