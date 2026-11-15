// ============================================
// chronicle/ascPerk.js — 황혼 연대기 · 승천 인장의 쓰임새 (시즌 시리즈 PR ④ · 1.298.0)
// ============================================
// 설계서: docs/chronicle-season-design.md 7절
// PM 결정
//   · 승천 특성 — 승천 인장으로 찍는 계정 영구 특성. 시즌계 캐릭터에게만 적용 (승천 캐릭터는 그대로). 다 찍으면 각 +20% 안팎
//   · 시즌 보급 — 인장으로 이번 시즌 출발을 돕는 물자를 산다 (시즌마다 구매 한도)
//   · 칭호 — 승천계 업적으로 얻는 표시용 이름
// 저장: 계정 asc { talents{id: 단계}, shop{n(시즌), bought{id: 수}}, title }
// 데이터 + 순수 함수만 (account·engine이 이 파일을 쓴다 — 다른 연대기 파일을 불러오지 않는다)
// ⚠ 밸런스는 ASC_TALENTS · ASC_SUPPLY 한 곳.
// ============================================

// ===== 승천 특성 =====
// 단계마다 fx가 한 번씩 더해진다. 비용 = costBase × 다음 단계 번호 (1단계 30 · 10단계 300 — 한 특성 합계 1,650)
export const ASC_TALENT_MAX = 10;
export const ASC_TALENT_COST = 30;
export const ASC_TALENTS = [
  { id: 'might', name: '승천자의 힘', icon: '⚔', desc: '시즌계 캐릭터의 공격력', fx: { atkPct: 0.02 }, unit: '공격력 +2%' },
  { id: 'vigor', name: '승천자의 가호', icon: '♥', desc: '시즌계 캐릭터의 최대 HP', fx: { hpPct: 0.02 }, unit: '최대 HP +2%' },
  { id: 'lore', name: '승천자의 가르침', icon: '✦', desc: '시즌계 전투 경험치', fx: { expPct: 0.02 }, unit: '경험치 +2%' },
  { id: 'guide', name: '승천자의 인도', icon: '🪙', desc: '시즌계 골드 · 장비 획득', fx: { goldPct: 0.02, dropPct: 0.01 }, unit: '골드 +2% · 장비 획득 +1%' },
];
export const ascTalentLv = (acc, id) => Math.max(0, Math.min(ASC_TALENT_MAX, acc?.asc?.talents?.[id] || 0));
export const ascTalentCost = (lv) => (lv >= ASC_TALENT_MAX ? null : ASC_TALENT_COST * (lv + 1));
// 합산 효과 — engine deriveUnit이 시즌계에서만 더한다
export function ascTalentFx(talents) {
  const fx = {};
  for (const t of ASC_TALENTS) {
    const lv = Math.max(0, Math.min(ASC_TALENT_MAX, talents?.[t.id] || 0));
    if (!lv) continue;
    for (const [k, v] of Object.entries(t.fx)) fx[k] = Math.round(((fx[k] || 0) + v * lv) * 1000) / 1000;
  }
  return fx;
}
export function buyAscTalent(acc, id) {
  const t = ASC_TALENTS.find(x => x.id === id); const lv = ascTalentLv(acc, id); const cost = ascTalentCost(lv);
  const seal = acc?.asc?.seal || 0;
  if (!t || cost == null || seal < cost) return acc;
  return { ...acc, asc: { ...acc.asc, seal: seal - cost, talents: { ...(acc.asc.talents || {}), [id]: lv + 1 } } };
}
export const ascTalentSpent = (acc) => ASC_TALENTS.reduce((s, t) => { const lv = ascTalentLv(acc, t.id); return s + ASC_TALENT_COST * lv * (lv + 1) / 2; }, 0);

// ===== 시즌 보급 =====
// 이번 시즌 계정에 바로 들어온다. limit = 시즌마다 살 수 있는 수
export const ASC_SUPPLY = [
  { id: 'shards', name: '📜 계약서 조각 ×100', desc: '사역마 소환 10회분', cost: 60, limit: 2, give: { famShard: 100 } },
  { id: 'gold', name: '🪙 골드 30,000', desc: '초반 강화·승급 자금', cost: 30, limit: 3, gold: 30000 },
  { id: 'keys', name: '🗝 던전 열쇠 ×5', desc: '최대 보유량까지', cost: 30, limit: 2, keys: 5 },
  { id: 'boost', name: '⏩ ×4 배속 3시간', desc: '지금 남은 시간에 더해진다', cost: 40, limit: 2, boostMin: 180 },
  { id: 'essence', name: '✦ 정수 ×300', desc: '강화·옵션 재설정 재료', cost: 30, limit: 2, give: { essence: 300 } },
];
export function ascShopState(acc) {
  const n = acc?.season?.n || 0; const sh = acc?.asc?.shop;
  return { n, bought: sh && sh.n === n ? sh.bought || {} : {} };
}
export const ascSupplyLeft = (acc, it) => Math.max(0, it.limit - (ascShopState(acc).bought[it.id] || 0));
export function ascSupplyCan(acc, id) {
  const it = ASC_SUPPLY.find(x => x.id === id);
  if (!it) return { ok: false, why: '없는 물자' };
  if (!acc?.season?.on) return { ok: false, why: '시즌이 시작되면 살 수 있다' };
  if (ascSupplyLeft(acc, it) <= 0) return { ok: false, why: '이번 시즌 한도' };
  if ((acc.asc?.seal || 0) < it.cost) return { ok: false, why: `인장 ${it.cost - (acc.asc?.seal || 0)} 부족` };
  return { ok: true };
}
export function buyAscSupply(acc0, id, keyMax = 10, now = Date.now()) {
  const it = ASC_SUPPLY.find(x => x.id === id);
  if (!ascSupplyCan(acc0, id).ok) return acc0;
  const sh = ascShopState(acc0);
  const acc = { ...acc0, mats: { ...(acc0.mats || {}) }, asc: { ...acc0.asc, seal: acc0.asc.seal - it.cost, shop: { n: sh.n, bought: { ...sh.bought, [id]: (sh.bought[id] || 0) + 1 } } } };
  for (const [k, v] of Object.entries(it.give || {})) acc.mats[k] = (acc.mats[k] || 0) + v;
  if (it.gold) acc.gold = (acc.gold || 0) + it.gold;
  if (it.keys) acc.keys = { ...(acc.keys || {}), count: Math.min(keyMax, (acc.keys?.count || 0) + it.keys) };
  if (it.boostMin) acc.boostUntil = Math.max(now, acc.boostUntil || 0) + it.boostMin * 60000;
  return acc;
}

// ===== 칭호 =====
// 조건은 승천계 기록(asc)만으로 매번 계산한다 — 얻은 칭호를 따로 저장하지 않는다
const slotN = (a) => Object.keys(a?.slots || {}).length;
const bestRank = (a, k) => Math.min(9999, ...(a?.log || []).map(x => x[k] || 9999));
export const ASC_TITLES = [
  { id: 'first', name: '첫 승천자', desc: '캐릭터 1명 승천', ok: (a) => slotN(a) >= 1 },
  { id: 'five', name: '다섯 갈래의 주인', desc: '갈래 5칸 보관', ok: (a) => slotN(a) >= 5 },
  { id: 'ten', name: '열 갈래의 완성자', desc: '갈래 10칸 전부 보관', ok: (a) => slotN(a) >= 10 },
  { id: 'god10', name: '신에게 닿은 자', desc: '신 토벌 10단계', ok: (a) => (a?.god?.best || 0) >= 10 },
  { id: 'god20', name: '신을 물러서게 한 자', desc: '신 토벌 20단계', ok: (a) => (a?.god?.best || 0) >= 20 },
  { id: 'god30', name: '황혼을 넘은 자', desc: '신 토벌 30단계', ok: (a) => (a?.god?.best || 0) >= 30 },
  { id: 'top10', name: '시즌의 강자', desc: '시즌 순위 10위 안', ok: (a) => bestRank(a, 'growth') <= 10 },
  { id: 'top1', name: '시즌의 정점', desc: '시즌 순위 1위', ok: (a) => bestRank(a, 'growth') <= 1 },
  { id: 'arena1', name: '투기장의 패자', desc: '시즌 투기장 1위', ok: (a) => bestRank(a, 'arena') <= 1 },
  { id: 'vet3', name: '세 계절의 여행자', desc: '시즌 3회 완주', ok: (a) => (a?.log || []).filter(x => x.n >= 1).length >= 3 },
  { id: 'vet10', name: '열 계절의 순례자', desc: '시즌 10회 완주', ok: (a) => (a?.log || []).filter(x => x.n >= 1).length >= 10 },
];
export const ascTitlesOwned = (acc) => ASC_TITLES.filter(t => t.ok(acc?.asc));
export function ascTitle(acc) {
  const t = ASC_TITLES.find(x => x.id === acc?.asc?.title);
  return t && t.ok(acc.asc) ? t : null;
}
export const setAscTitle = (acc, id) => ({ ...acc, asc: { ...(acc.asc || {}), title: id || null } });
