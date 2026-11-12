// ============================================
// chronicle/gearEval.js — 장비 실전 평가 (1.267.0)
// ============================================
// PM 지적: 아이템 전투력(itemPower)은 옵션 종류를 구분하지 않고 아이템 레벨에 비례해
//   술법사에게 가장 좋은 무기(스킬 피해)를 꼴찌로 판단했다.
// PM 결정 「아이템 + 실전 시뮬 기준 · +7 강화 시로 비교」
//   - 비교는 양쪽 모두 +7(이미 더 높으면 그 단계)로 올린 가상 장비로 한다 — +7까지는 파괴 위험이 없다
//   - 1단계: 모든 후보를 짧은 시뮬(fast)로 → 지금 착용 대비 분당 경험치 %
//   - 2단계: 착용보다 좋아 보이는 상위 topN개만 긴 시뮬(full)로 승률·남은 HP까지 확인
//   - 같은 적·같은 난수(previewCompare 방식)라 장비 차이만 남는다
// 순수 함수 (engine·preview만 import) — 저장은 바꾸지 않는다
// ============================================
import * as E from './engine.js';
import * as P from './preview.js';
import { FORGE } from './data.js';

export const GEAR_EVAL = { plusTarget: 7, fastBattles: 24, fullBattles: 80, topN: 3, seed: 4242 };

// 비교용 강화 단계 — +7 (이미 높으면 그대로, 최대 강화 넘지 않게)
export function evalPlus(it) {
  return Math.min(FORGE.maxEnhance, Math.max(it?.plus || 0, GEAR_EVAL.plusTarget));
}
export function asEvalItem(it) {
  return it ? { ...it, plus: evalPlus(it) } : it;
}

// 평가용 저장 — 그 부위 착용 장비를 +7 기준으로 올리고, 후보가 있으면 후보를 끼운다
function evalSave(save, hero, slot, candUid) {
  const u = save.units[hero];
  const curUid = u?.equip?.[slot];
  const lift = new Set([curUid, candUid].filter(v => v != null));
  const view = { ...save, inventory: save.inventory.map(i => (lift.has(i.uid) ? asEvalItem(i) : i)) };
  return candUid == null ? view : E.equipItem(view, hero, candUid);
}

// 평가 대상이 될 수 있는가 (이 직업 · 착용 레벨 충족 · 지금 착용 중 아님)
export function canEvalItem(save, hero, it) {
  const u = save.units[hero];
  return !!u && E.itemUsable(it, hero) && E.canWear(it, u) && u.equip[it.slot] !== it.uid;
}

// 지표 — 「전투 속도 × 승률 × 생존」: 전투 시간(다음 전투 대기 제외)이 짧을수록, 이길수록, HP가 남을수록 높다
//   분당 경험치는 대기 시간·보상 고정분에 묻혀 장비 차이가 1~2%로만 보여 쓰지 않는다
export const effOf = (r) => {
  if (!r) return 0;
  const combat = Math.max(0.3, (r.secPerBattle || 0) - P.PREVIEW.gapMs / 1000);
  return (r.winRate || 0) / combat * (0.8 + 0.2 * (r.hpLeft || 0));
};

// 지금 착용 기준 (부위별) — 결과: estimateRate 객체
export function evalBaseline(save, hero, slot, target, battles = GEAR_EVAL.fastBattles) {
  if (!target) return null;
  return P.estimateRate(evalSave(save, hero, slot, null), target, { battles, speed: 2, seed: GEAR_EVAL.seed });
}
// 후보 장비를 +7로 끼웠을 때
export function evalCandidate(save, hero, it, target, battles = GEAR_EVAL.fastBattles) {
  if (!target || !canEvalItem(save, hero, it)) return null;
  return P.estimateRate(evalSave(save, hero, it.slot, it.uid), target, { battles, speed: 2, seed: GEAR_EVAL.seed });
}
// 기준 대비 % (0.12 = 12% 좋음)
export function effDelta(cand, base) {
  const b = effOf(base);
  if (!cand || !b) return null;
  return effOf(cand) / b - 1;
}
