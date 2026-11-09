// ============================================
// chronicle/daily.js — 일일 임무 (1.233.0)
// ============================================
// PM 결정 (점검 보고 4번): 하루 단위 목표 — KST 0시 초기화 · 계정 공유(어느 캐릭터로 해도 진행)
//   보상은 사냥으로 쉽게 못 모으는 재화 위주 (계약서 조각·열쇠·사역혼)
//   계정 필드 daily = { date, prog: {metric: n}, claimed: {id: true}, bonus: bool }
// 순수 함수 (engine·data만 import)
// ============================================
import { kstDateKey } from './engine.js';
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

const REWARD_LBL = { gold: ['🪙', '골드'], famShard: ['📜', '계약서 조각'], keys: ['🗝', '던전 열쇠'], essence: ['✦', '정수'], famSoul: ['🔮', '사역혼'] };
export const dailyRewardText = (r) => Object.entries(r).map(([k, v]) => `${(REWARD_LBL[k] || ['', k])[0]} ${(REWARD_LBL[k] || ['', k])[1]} ${v.toLocaleString()}`).join(' · ');

// 오늘 상태 (날짜가 바뀌었으면 비운 상태)
export function dailyState(acc, now = Date.now()) {
  const date = kstDateKey(now);
  const d = acc?.daily;
  if (!d || d.date !== date) return { date, prog: {}, claimed: {}, bonus: false };
  return { date, prog: d.prog || {}, claimed: d.claimed || {}, bonus: !!d.bonus };
}
export function missionState(acc, m, now = Date.now()) {
  const st = dailyState(acc, now);
  const cur = Math.min(m.need, st.prog[m.metric] || 0);
  return { cur, status: st.claimed[m.id] ? 'claimed' : cur >= m.need ? 'done' : 'progress' };
}
export const dailyBadge = (acc, now = Date.now()) => {
  const st = dailyState(acc, now);
  const n = DAILY_MISSIONS.filter(m => missionState(acc, m, now).status === 'done').length;
  return n + (bonusReady(acc, now) && !st.bonus ? 1 : 0);
};
export const bonusReady = (acc, now = Date.now()) => DAILY_MISSIONS.every(m => dailyState(acc, now).claimed[m.id]);

// 진행 기록 — deltas = { win: 1, elite: 2, ... }
export function trackDaily(acc, deltas, now = Date.now()) {
  if (!acc || !deltas) return acc;
  const st = dailyState(acc, now);
  const prog = { ...st.prog };
  let changed = false;
  for (const [k, v] of Object.entries(deltas)) if (v > 0) { prog[k] = (prog[k] || 0) + v; changed = true; }
  return changed ? { ...acc, daily: { ...st, prog } } : acc;
}

function giveReward(acc, r) {
  const out = { ...acc, mats: { ...acc.mats } };
  for (const [k, v] of Object.entries(r)) {
    if (k === 'gold') out.gold = (out.gold || 0) + v;
    else if (k === 'keys') out.keys = { ...(out.keys || { count: 0 }), count: Math.min(DUNGEON_KEYS.max, (out.keys?.count || 0) + v) };
    else out.mats[k] = (out.mats[k] || 0) + v;
  }
  return out;
}
export function claimDaily(acc, id, now = Date.now()) {
  const m = DAILY_MISSIONS.find(x => x.id === id);
  if (!m || missionState(acc, m, now).status !== 'done') return acc;
  const st = dailyState(acc, now);
  return { ...giveReward(acc, m.reward), daily: { ...st, claimed: { ...st.claimed, [id]: true } } };
}
export function claimDailyBonus(acc, now = Date.now()) {
  const st = dailyState(acc, now);
  if (st.bonus || !bonusReady(acc, now)) return acc;
  return { ...giveReward(acc, DAILY_BONUS.reward), daily: { ...st, bonus: true } };
}
