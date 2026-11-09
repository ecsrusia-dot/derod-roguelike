// ============================================
// chronicle/offline.js — 오프라인 보상 (1.233.0)
// ============================================
// PM 결정 (점검 보고 4번): 자리를 비운 시간 × 마지막 사냥 효율 — 상한 8시간
//   효율 = 마지막 사냥 스테이지를 ×1 재생 기준으로 40전 계산한 분당 값 × OFFLINE.eff (승률 반영 — 지는 사냥터는 덜 받는다)
//   보상 = 골드 · 정수 — 장비는 주지 않는다 (가방 정리 부담 방지)
//   1.233.1 PM 결정: 경험치 제거 (3시간에 Lv.60→72 — 너무 많이 오름)
//   접속 시각은 localStorage 따로(chronicleLastSeen) · 계산된 보상은 계정 offline.pending에 저장 → 새로고침해도 중복·유실 없음
// 순수 함수 (engine·account·preview만 import)
// ============================================
import * as E from './engine.js';
import * as A from './account.js';
import * as P from './preview.js';

export const OFFLINE = { minMs: 5 * 60000, maxMs: 8 * 3600000, eff: 0.5, battles: 40 };

// 보상 계산 — target = previewTarget 결과 (없으면 null)
export function offlineReward(save, target, awayMs) {
  if (!target || awayMs < OFFLINE.minMs) return null;
  const ms = Math.min(OFFLINE.maxMs, awayMs);
  const r = P.estimateRate(save, target, { battles: OFFLINE.battles, speed: 1 });
  const mins = ms / 60000;
  const k = mins * OFFLINE.eff;
  return {
    ms, hero: save.hero, place: `${target.field.name} ${target.stage + 1}`, winRate: r.winRate,
    exp: 0, gold: Math.floor(r.goldPerMin * k), essence: Math.floor(r.essencePerMin * k),
  };
}
// 쌓인 보상과 합치기 — 같은 캐릭터면 더하고 시간 상한(8시간)에 맞춰 줄인다, 다른 캐릭터면 새 것으로
export function mergeOffline(prev, next) {
  if (!next) return prev || null;
  if (!prev || prev.hero !== next.hero) return next;
  const ms = prev.ms + next.ms;
  const k = ms > OFFLINE.maxMs ? OFFLINE.maxMs / ms : 1;
  return {
    ...next, ms: Math.min(ms, OFFLINE.maxMs),
    exp: Math.floor((prev.exp + next.exp) * k), gold: Math.floor((prev.gold + next.gold) * k), essence: Math.floor((prev.essence + next.essence) * k),
  };
}
// 받기 — 계정에 반영 → { acc, ups }
export function claimOffline(acc) {
  const pd = acc.offline?.pending;
  if (!pd || !acc.chars?.[pd.hero]) return { acc: { ...acc, offline: { pending: null } }, ups: 0 };
  const view = A.toView({ ...acc, active: pd.hero });
  const r = E.grantOffline(view, { ...pd, exp: 0 }); // 1.233.1 이전에 쌓인 대기분의 경험치도 지급하지 않음
  const acc2 = A.fromView(acc, r.save);
  return { acc: { ...acc2, offline: { pending: null } }, ups: r.ups };
}
export function fmtAway(ms) {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
}
