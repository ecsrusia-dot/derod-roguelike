// ============================================
// chronicle/gearEval.js — 장비 실전 평가 (1.267.0)
// ============================================
// PM 지적: 아이템 전투력(itemPower)은 옵션 종류를 구분하지 않고 아이템 레벨에 비례해
//   술법사에게 가장 좋은 무기(스킬 피해)를 꼴찌로 판단했다.
// PM 결정 「아이템 + 실전 시뮬 기준 · +7 강화 시로 비교」
//   - 비교는 양쪽 모두 +7(이미 더 높으면 그 단계)로 올린 가상 장비로 한다 — +7까지는 파괴 위험이 없다
//   - 1단계: 모든 후보를 짧은 시뮬(fast)로 → 지금 착용 대비 효율 %
//   - 기준 전투 = evalTarget (1.270.3 — 지금 승률 55%에 가장 가까운 관문·보스)
//   - 2단계: 착용보다 좋아 보이는 상위 topN개만 긴 시뮬(full)로 승률·남은 HP까지 확인
//   - 같은 적·같은 난수(previewCompare 방식)라 장비 차이만 남는다
// 순수 함수 (engine·preview만 import) — 저장은 바꾸지 않는다
// ============================================
import * as E from './engine.js';
import * as P from './preview.js';
import { FORGE, CHRONICLE_FIELDS, FIELD_STAGES } from './data.js';

export const GEAR_EVAL = { plusTarget: 7, fastBattles: 24, fullBattles: 80, topN: 3, seed: 4242 };

// 비교용 강화 단계 — +7 (이미 높으면 그대로, 최대 강화 넘지 않게)
export function evalPlus(it) {
  return Math.min(FORGE.maxEnhance, Math.max(it?.plus || 0, GEAR_EVAL.plusTarget));
}
export function asEvalItem(it) {
  return it ? { ...it, plus: evalPlus(it) } : it;
}

// 평가용 저장 — 그 부위 착용 장비를 +7 기준으로 올리고, 후보가 있으면 후보를 끼운다
function evalSave(save, hero, slot, candUid, atLv = 0) {
  if (atLv && save.units[hero] && atLv > save.units[hero].lv) save = { ...save, units: { ...save.units, [hero]: { ...save.units[hero], lv: atLv } } };
  const u = save.units[hero];
  const curUid = u?.equip?.[slot];
  const lift = new Set([curUid, candUid].filter(v => v != null));
  const view = { ...save, inventory: save.inventory.map(i => (lift.has(i.uid) ? asEvalItem(i) : i)) };
  return candUid == null ? view : E.equipItem(view, hero, candUid);
}

// 평가 대상이 될 수 있는가 (이 직업 · 착용 레벨 충족 · 지금 착용 중 아님)
// 1.273.2 PM 「유니크 효율 미표시」 — 레벨이 모자란 장비도 그 레벨에 도달했다고 가정하고 비교 (기준 장비도 같은 레벨)
export function evalLvOf(save, hero, it) {
  const u = save.units[hero];
  if (!u || E.canWear(it, u)) return 0;
  return E.canWear(it, { ...u, lv: it.ilv }) ? it.ilv : -1;
}
export function canEvalItem(save, hero, it) {
  const u = save.units[hero];
  return !!u && E.itemUsable(it, hero) && evalLvOf(save, hero, it) >= 0 && u.equip[it.slot] !== it.uid;
}

// 평가 기준 전투
//   1.268.0 — 보스를 못 잡은 첫 지역의 다음 관문(다 넘었으면 그 지역 보스)
//   1.270.3 PM 결정 「승률 50~60% 지점」 — 다음 관문이 너무 쉬우면(승률 100% · 5라운드) 쿨감·생존 옵션 차이가
//     0%로 보였고, 반대로 승률 0% 보스는 2~3라운드에 져서 모든 장비가 0%였다.
//     → 다음 관문부터 앞으로 관문·보스를 차례로 짧게 시뮬해, 지금 장비 승률이 TARGET_WIN에 가장 가까운 곳을 고른다
export const EVAL_TARGET = { win: 0.55, stopBelow: 0.3, maxSteps: 14, battles: 20, seed: 9191 };
function evalTargetBase(save) {
  let last = null;
  for (const f of CHRONICLE_FIELDS) {
    if (!E.fieldUnlocked(save, f.id)) break;
    last = f;
    if (save.progress.bossCleared[f.id]) continue;
    const st = E.stageState(save, f.id);
    if (st.cleared >= FIELD_STAGES) return { field: f, stage: null, mode: 'boss' };
    return { field: f, stage: st.cleared, mode: 'gate' };
  }
  return last ? { field: last, stage: null, mode: 'boss' } : null;
}
// 다음 관문부터 앞으로 이어지는 전투 목록 (관문 → 보스 → 다음 지역 관문 …)
function targetLadder(start) {
  const out = [];
  let fi = CHRONICLE_FIELDS.findIndex(f => f.id === start.field.id);
  let stage = start.mode === 'boss' ? FIELD_STAGES : start.stage;
  while (fi >= 0 && fi < CHRONICLE_FIELDS.length && out.length < EVAL_TARGET.maxSteps) {
    const f = CHRONICLE_FIELDS[fi];
    if (stage < FIELD_STAGES) { out.push({ field: f, stage, mode: 'gate' }); stage += 1; }
    else { out.push({ field: f, stage: null, mode: 'boss' }); fi += 1; stage = 0; }
  }
  return out;
}
const _targetCache = new Map();
function targetKey(save) {
  const u = save.units[save.hero] || {};
  const eq = Object.values(u.equip || {}).map(uid => { const it = save.inventory.find(i => i.uid === uid); return it ? `${it.uid}+${it.plus || 0}` : '-'; }).join(',');
  return [save.hero, u.lv, JSON.stringify(u.stats || {}), JSON.stringify(u.skills || {}), eq, JSON.stringify(save.famTeam || {}), JSON.stringify(save.progress?.stages || {}), JSON.stringify(save.progress?.bossCleared || {})].join('|');
}
export function evalTarget(save) {
  const start = evalTargetBase(save);
  if (!start) return null;
  const key = targetKey(save);
  if (_targetCache.has(key)) return _targetCache.get(key);
  let best = null;
  for (const t of targetLadder(start)) {
    const r = P.estimateRate(save, t, { battles: EVAL_TARGET.battles, speed: 2, seed: EVAL_TARGET.seed });
    const cand = { ...t, winRate: r.winRate };
    if (!best || Math.abs(r.winRate - EVAL_TARGET.win) < Math.abs(best.winRate - EVAL_TARGET.win)) best = cand;
    if (r.winRate < EVAL_TARGET.stopBelow) break; // 이보다 어려운 곳은 더 멀어질 뿐
  }
  const res = best || start;
  if (_targetCache.size > 50) _targetCache.clear();
  _targetCache.set(key, res);
  return res;
}
export const evalTargetLabel = (t) => (!t ? '' : `${t.mode === 'boss' ? `${t.field.name} 보스` : `${t.field.name} ${t.stage + 1} 관문`}${t.winRate != null ? ` (지금 승률 ${Math.round(t.winRate * 100)}%)` : ''}`);

// 지표 — 「전투 속도 × 승률 × 생존」: 전투 시간(다음 전투 대기 제외)이 짧을수록, 이길수록, HP가 남을수록 높다
//   분당 경험치는 대기 시간·보상 고정분에 묻혀 장비 차이가 1~2%로만 보여 쓰지 않는다
export const effOf = (r) => {
  if (!r) return 0;
  const combat = Math.max(0.3, (r.secPerBattle || 0) - P.PREVIEW.gapMs / 1000);
  return (r.winRate || 0) / combat * (0.8 + 0.2 * (r.hpLeft || 0));
};

// 지금 착용 기준 (부위별) — 결과: estimateRate 객체
export function evalBaseline(save, hero, slot, target, battles = GEAR_EVAL.fastBattles, atLv = 0) {
  if (!target) return null;
  return P.estimateRate(evalSave(save, hero, slot, null, atLv), target, { battles, speed: 2, seed: GEAR_EVAL.seed });
}
// 후보 장비를 +7로 끼웠을 때
export function evalCandidate(save, hero, it, target, battles = GEAR_EVAL.fastBattles) {
  if (!target || !canEvalItem(save, hero, it)) return null;
  return P.estimateRate(evalSave(save, hero, it.slot, it.uid, evalLvOf(save, hero, it)), target, { battles, speed: 2, seed: GEAR_EVAL.seed });
}
// 진척도 — 승률(남은 HP 가산) + 졌을 때 적에게 준 피해 (아직 못 이기는 보스도 비교되게)
export const progressOf = (r) => (!r ? 0 : (r.winRate || 0) * (0.8 + 0.2 * (r.hpLeft || 0)) + (1 - (r.winRate || 0)) * 0.6 * (r.lossDmg || 0));
// 기준 대비 % (0.12 = 12% 좋음)
//   둘 다 거의 확실히 이기면(승률 95%+) 전투 속도까지 보고, 아니면 진척도(승률·준 피해)로 본다
export function effDelta(cand, base) {
  if (!cand || !base) return null;
  if ((cand.winRate || 0) >= 0.95 && (base.winRate || 0) >= 0.95) {
    const b = effOf(base);
    return b ? effOf(cand) / b - 1 : null;
  }
  const b = progressOf(base);
  if (!b) return progressOf(cand) > 0 ? 1 : 0;
  return progressOf(cand) / b - 1;
}
