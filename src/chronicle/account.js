// ============================================
// chronicle/account.js — 황혼 연대기 2.0 계정 · 캐릭터 슬롯
// ============================================
// 저장(dnt_chronicle_v2) = 계정 하나:
//   공유: 골드 · 재료 · 열쇠 · 공용 창고 · 보스 일일 횟수  (+ 사역마: PR ②)
//   캐릭터별(직업당 1명): 레벨·스킬·장비·개인 가방·진행도·의뢰·이야기·던전
// engine/quest/화면은 예전처럼 「save 뷰」 하나를 다룬다 — toView/fromView가 계정 ↔ 뷰를 변환.
// ============================================
import { DUNGEON_KEYS, CLASS_SLOTS, CHRONICLE_TUNING as T } from './data.js';
import * as E from './engine.js';
import { ensureQuestFields } from './quest.js';
import { buildRoster, peakOf, claimAllRosterQuests, rosterQuestBadge } from './roster.js';
import { claimAllQuests, acceptAllQuests, questList } from './quest.js';
import { claimAllMissions, dailyBadge, weeklyBadge } from './daily.js';

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// 1.x 저장이 있던 플레이어 시작 보상 (설계서 8절) — 1.233.1 소환권 폐지로 계약서 조각 30개(= 소환 3회)
export const V1_GIFT = { gold: 3000, keys: 5, famShard: 30, rareBoxes: 2 };

export function newAccount(hadV1 = false) {
  return {
    v: 2, gold: 50, mats: { essence: 0, shard: 0, seal: 0, famShard: 0 },
    keys: { count: DUNGEON_KEYS.dailyRefill, refillDate: E.kstDateKey(), boughtDate: null, bought: 0 },
    stash: [], nextUid: 1, bossDaily: null, chars: {}, active: null, fams: {}, famPity: { total: 0, sinceViolet: 0 },
    gift: hadV1 ? { ...V1_GIFT } : null, giftNotice: hadV1, createdAt: Date.now(),
  };
}

export function createCharacter(acc0, classId, rng = Math.random) {
  if (acc0.chars[classId]) return { ...acc0, active: classId };
  const acc = clone(acc0);
  const s = E.newChronicleSave(classId);
  acc.chars[classId] = {
    classId, unit: s.units[classId], bag: [], progress: s.progress, quests: {}, story: s.story,
    dungeon: null, stats: s.stats, createdAt: Date.now(),
  };
  acc.active = classId;
  // 시작 보상은 첫 캐릭터에게 한 번 — 희귀 상자 = 그 직업 희귀 장비
  if (acc.gift) {
    const g = acc.gift;
    acc.gold += g.gold;
    acc.keys.count = Math.min(DUNGEON_KEYS.max, acc.keys.count + g.keys);
    acc.mats.famShard = (acc.mats.famShard || 0) + (g.famShard || 0) + (g.sealPlus || 0) * 10; // 구 gift(sealPlus) 호환
    for (let i = 0; i < g.rareBoxes; i++) {
      const it = E.makeItem(rng, { cls: classId, slot: CLASS_SLOTS[i % CLASS_SLOTS.length], grade: 'rare', ilv: 8 });
      acc.chars[classId].bag.push({ ...it, uid: acc.nextUid++ });
    }
    acc.gift = null;
  }
  return acc;
}

export function selectCharacter(acc, classId) {
  return acc.chars[classId] ? { ...acc, active: classId } : acc;
}

// 계정 → 현재 캐릭터의 save 뷰
export function toView(acc) {
  const c = acc?.chars?.[acc.active];
  if (!c) return null;
  return ensureQuestFields({
    v: 2, hero: c.classId, units: { [c.classId]: c.unit }, party: [c.classId],
    gold: acc.gold, mats: acc.mats, keys: acc.keys, bossDaily: acc.bossDaily, nextUid: acc.nextUid,
    stash: acc.stash, inventory: c.bag, progress: c.progress, quests: c.quests, story: c.story,
    boostUntil: acc.boostUntil || 0, towerWeek: acc.towerWeek || null, tower: c.tower || { best: 0, checkpoint: 0, run: null }, bagExpand: c.bagExpand || 0, fams: acc.fams || {}, famPity: acc.famPity || { total: 0, sinceViolet: 0 }, famTeam: c.famTeam || {},
    dungeon: c.dungeon, stats: c.stats, createdAt: c.createdAt,
    roster: buildRoster(acc.chars), // 원정대 (1.229.0) — 레벨 상한·전역 버프 계산용, 읽기 전용
    rosterQuests: acc.rosterQuests || { claimed: {} }, // 원정대 의뢰 (1.230.0) — 계정 공유
    autoSalvage: acc.autoSalvage || { grade: -1, other: false }, // 획득 즉시 자동 분해 (1.231.2) — 계정 공유
    raid: acc.raid || null, // 원정대 레이드 기록 (1.231.0) — 읽기 전용 (갱신은 raid.applyRaidResult가 계정에 직접)
  });
}

// save 뷰 → 계정 (공유 필드는 계정으로, 나머지는 현재 캐릭터로)
export function fromView(acc, v) {
  if (!v) return acc;
  const c = acc.chars[v.hero];
  return {
    ...acc,
    gold: v.gold, mats: v.mats, keys: v.keys, bossDaily: v.bossDaily, nextUid: v.nextUid, stash: v.stash || [],
    fams: v.fams || {}, famPity: v.famPity, rosterQuests: v.rosterQuests || acc.rosterQuests || { claimed: {} }, autoSalvage: v.autoSalvage || acc.autoSalvage || { grade: -1, other: false }, boostUntil: v.boostUntil || 0, towerWeek: v.towerWeek || acc.towerWeek || null,
    chars: {
      ...acc.chars,
      [v.hero]: { ...c, peakLv: Math.max(peakOf(c), v.units[v.hero]?.lv || 0), unit: v.units[v.hero], bag: v.inventory, progress: v.progress, quests: v.quests, story: v.story, dungeon: v.dungeon, stats: v.stats, famTeam: v.famTeam || {}, tower: v.tower || { best: 0, checkpoint: 0, run: null }, bagExpand: v.bagExpand || 0 },
    },
  };
}

// 원정대 레이드 파티 (1.231.0) — 5캐릭 각자의 장비·특성·전역 버프·사역마 패시브로 계산 (동행 사역마는 불참)
export function raidParty(acc) {
  return Object.keys(acc.chars).map(cid => {
    const v = toView({ ...acc, active: cid });
    const d = E.deriveUnit(v, cid);
    return { ...d, hp: d.maxHp };
  });
}

// 받을 보상 수 (1.275.0) — 의뢰 · 일일 · 주간 · 원정대 의뢰 (현재 캐릭터 기준)
export function pendingRewards(acc) {
  const v = toView(acc);
  if (!v) return { quests: 0, missions: 0, roster: 0, total: 0 };
  const quests = questList(v).filter(x => x.status === 'done').length;
  const missions = dailyBadge(acc) + weeklyBadge(acc);
  const roster = rosterQuestBadge(v);
  return { quests, missions, roster, total: quests + missions + roster };
}
// 보상 한 번에 받기 (1.275.0) → { acc, quests, missions, roster, total, items }
export function claimEverything(acc0, rng = Math.random) {
  const m = claimAllMissions(acc0);
  const v = toView(m.acc);
  if (!v) return { acc: acc0, quests: 0, missions: 0, roster: 0, total: 0, items: [] };
  const q = claimAllQuests(v, rng);
  const r = claimAllRosterQuests(q.save);
  const total = m.n + q.n + r.n;
  return { acc: total ? fromView(m.acc, r.save) : acc0, quests: q.n, missions: m.n, roster: r.n, total, items: q.items };
}
// 의뢰 자동 수락 (1.275.0) — 계정 설정 autoAccept (없으면 켬) → { acc, n }
export const autoAcceptOn = (acc) => acc?.autoAccept !== false;
export function autoAcceptQuests(acc) {
  if (!autoAcceptOn(acc)) return { acc, n: 0 };
  const v = toView(acc);
  if (!v) return { acc, n: 0 };
  const r = acceptAllQuests(v);
  return r.n ? { acc: fromView(acc, r.save), n: r.n } : { acc, n: 0 };
}

export function charSummary(acc, classId) {
  const c = acc.chars[classId];
  if (!c) return null;
  return { lv: c.unit.lv, bosses: Object.keys(c.progress.bossCleared || {}).length };
}
export const STASH_MAX = T.stashMax;
