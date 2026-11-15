// ============================================
// chronicle/ascend.js — 황혼 연대기 · 승천계 (시즌 시리즈 PR ①)
// ============================================
// 설계서: docs/chronicle-season-design.md
// PM 결정: 시즌계에서 키운 캐릭터가 시즌 종료 때 「승천」 → 승천계에서는 레벨링 없이 그 상태 그대로 쓴다.
//   · 갈래마다 1칸 (같은 갈래는 강한 쪽만) · 전승한 캐릭터만 승천
//   · 전승할 때마다 「전승 직전 상태」를 후보로 보관 → 시즌 종료 때 후보와 현재 상태 중 강한 쪽이 승천
// 이 파일(PR ①)은 저장 구조 · 스냅샷 · 승천 전투력 · 미리 보기까지. 시즌 교체(정산·초기화)는 PR ②.
// 저장: 계정 asc { slots{갈래: snap}, cand{직업: snap}, log[], seal }
//   snap = { v, cls, branch, rebirth, lv, at, power, char{unit, bag(착용 장비만), famTeam}, fams{보유 전체 — 보유 효과·인연 계산용}, peers{직업: 최고 레벨 — 원정대 버프 계산용} }
// 데이터 + 순수 함수만.
// ============================================
import * as E from './engine.js';
import { buildChronicleEnemy, REBIRTH_BRANCHES, CHRONICLE_TUNING as T } from './data.js';
import { CENEMIES } from './enemies.js';
import { toView, fromView, newAccount } from './account.js';
import { peakOf } from './roster.js';

export const ASCEND = {
  // 승천 전투력 — 고정된 훈련 상대(같은 난수)에게 준 피해. 오래 버틸수록 많이 때리므로 생존력도 반영된다
  dummyName: '심장의 마왕', dummyLv: 120, dummyHp: 400, dummyAtk: 1.0, seeds: [11, 23, 37],
  powerDiv: 1000,
};
export const ASC_SLOTS = Object.keys(REBIRTH_BRANCHES); // 갈래 10칸

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clone = (o) => JSON.parse(JSON.stringify(o));

export function ascState(acc) {
  const a = acc?.asc || {};
  return { slots: a.slots || {}, cand: a.cand || {}, log: a.log || [], seal: a.seal || 0 };
}

// ===== 스냅샷 =====
// 지금 상태를 그대로 떠 둔다 (전승 전 캐릭터는 null)
export function snapshotOf(acc, cid, at = Date.now()) {
  const c = acc?.chars?.[cid];
  const u = c?.unit;
  if (!u?.rebirth?.branch) return null;
  const worn = new Set(Object.values(u.equip || {}).filter(x => x != null));
  const fams = {};
  for (const [k, f] of Object.entries(acc.fams || {})) fams[k] = { grade: f.grade, plus: f.plus || 0, lv: f.lv || 1, ...(f.base ? { base: f.base } : {}), ...(f.trans ? { trans: f.trans } : {}) };
  const peers = {};
  for (const [id, pc] of Object.entries(acc.chars || {})) if (id !== cid) peers[id] = peakOf(pc);
  const snap = {
    v: 1, cls: cid, branch: u.rebirth.branch, rebirth: u.rebirth.count || 0, lv: u.lv || 1, at,
    char: { classId: cid, unit: clone(u), bag: clone((c.bag || []).filter(it => worn.has(it.uid))), famTeam: clone(c.famTeam || {}) },
    fams, peers,
  };
  snap.power = ascPower(snap);
  return snap;
}
// 스냅샷 → 전투 엔진이 읽는 save 뷰
export function snapView(snap) {
  const base = newAccount(false);
  const chars = { [snap.cls]: { ...snap.char, progress: { bossCleared: {} }, quests: {}, story: {}, dungeon: null, stats: {} } };
  for (const [id, peak] of Object.entries(snap.peers || {})) chars[id] = { classId: id, unit: { lv: peak }, peakLv: peak, bag: [] };
  return toView({ ...base, chars, fams: snap.fams || {}, active: snap.cls });
}
// 승천 전투력 — 훈련 상대에게 준 피해 (난수 고정 · 여러 번 평균)
export function ascPower(snap) {
  const view = snapView(snap);
  if (!view) return 0;
  const key = Object.keys(CENEMIES).find(k => CENEMIES[k].name === ASCEND.dummyName);
  let sum = 0;
  for (const seed of ASCEND.seeds) {
    const dummy = { ...buildChronicleEnemy(key, ASCEND.dummyLv, 'dummy', { hpMult: ASCEND.dummyHp, atkMult: ASCEND.dummyAtk }), tier: 'boss', name: '훈련 상대' };
    const party = E.partyCombatants(view);
    const sim = E.simulateChronicleBattle(party, [dummy], mulberry(seed));
    const last = sim.events[sim.events.length - 1];
    const left = last?.st?.dummy ? last.st.dummy[0] : dummy.maxHp;
    sum += Math.max(0, dummy.maxHp - left);
  }
  return Math.round(sum / ASCEND.seeds.length / ASCEND.powerDiv);
}

// ===== 전승 직전 상태 보관 =====
// 전승 (계정 단위) — 직전 상태가 지금 후보보다 강하면 후보로 남긴다
export function rebirthWithCandidate(acc0, branchId, perkId, cid = acc0.active) {
  const before = toView({ ...acc0, active: cid });
  const after = E.rebirth(before, branchId, cid, perkId);
  if (after === before) return acc0;
  let acc = fromView({ ...acc0, active: cid }, after);
  acc = { ...acc, active: acc0.active };
  const snap = snapshotOf(acc0, cid); // 첫 전승은 갈래가 없어 null
  if (!snap) return acc;
  const s = ascState(acc);
  const old = s.cand[cid];
  if (old && old.power >= snap.power) return acc;
  return { ...acc, asc: { ...(acc.asc || {}), cand: { ...s.cand, [cid]: snap } } };
}

// ===== 미리 보기 =====
// 지금 시즌이 끝나면 승천할 상태 — 캐릭터마다 (현재 · 전승 직전 후보) 중 강한 쪽
export function ascPreview(acc) {
  const s = ascState(acc);
  return Object.keys(acc?.chars || {}).map(cid => {
    const u = acc.chars[cid].unit;
    const now = snapshotOf(acc, cid);
    const cand = s.cand[cid] || null;
    if (!now && !cand) return { cid, eligible: false, lv: u.lv || 1 };
    const best = !cand || (now && now.power >= cand.power) ? now : cand;
    const cur = s.slots[best.branch] || null;
    return { cid, eligible: true, snap: best, from: best === now ? 'now' : 'cand', now, cand, slot: best.branch, cur, replaces: !cur || best.power > cur.power };
  });
}
export const ascFilled = (acc) => ASC_SLOTS.filter(b => ascState(acc).slots[b]).length;
// 승천 조건(전승)을 갖춘 캐릭터 수 — 전투력 계산 없이 (마을 타일용)
export const ascEligibleCount = (acc) => Object.values(acc?.chars || {}).filter(c => c.unit?.rebirth?.branch).length;
