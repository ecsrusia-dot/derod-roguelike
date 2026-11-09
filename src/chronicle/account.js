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
import { buildRoster, peakOf } from './roster.js';

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// 1.x 저장이 있던 플레이어 시작 보상 (설계서 8절) — sealPlus는 1.212.0부터 「사역마 소환권」
export const V1_GIFT = { gold: 3000, keys: 5, sealPlus: 3, rareBoxes: 2 };

export function newAccount(hadV1 = false) {
  return {
    v: 2, gold: 50, mats: { essence: 0, shard: 0, seal: 0, sealPlus: 0 },
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
    acc.mats.sealPlus = (acc.mats.sealPlus || 0) + g.sealPlus;
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
  });
}

// save 뷰 → 계정 (공유 필드는 계정으로, 나머지는 현재 캐릭터로)
export function fromView(acc, v) {
  if (!v) return acc;
  const c = acc.chars[v.hero];
  return {
    ...acc,
    gold: v.gold, mats: v.mats, keys: v.keys, bossDaily: v.bossDaily, nextUid: v.nextUid, stash: v.stash || [],
    fams: v.fams || {}, famPity: v.famPity, rosterQuests: v.rosterQuests || acc.rosterQuests || { claimed: {} }, boostUntil: v.boostUntil || 0, towerWeek: v.towerWeek || acc.towerWeek || null,
    chars: {
      ...acc.chars,
      [v.hero]: { ...c, peakLv: Math.max(peakOf(c), v.units[v.hero]?.lv || 0), unit: v.units[v.hero], bag: v.inventory, progress: v.progress, quests: v.quests, story: v.story, dungeon: v.dungeon, stats: v.stats, famTeam: v.famTeam || {}, tower: v.tower || { best: 0, checkpoint: 0, run: null }, bagExpand: v.bagExpand || 0 },
    },
  };
}

export function charSummary(acc, classId) {
  const c = acc.chars[classId];
  if (!c) return null;
  return { lv: c.unit.lv, bosses: Object.keys(c.progress.bossCleared || {}).length };
}
export const STASH_MAX = T.stashMax;
