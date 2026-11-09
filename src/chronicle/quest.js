// ============================================
// chronicle/quest.js — 황혼 연대기 의뢰·이야기 순수 로직 (1.206.0)
// ============================================
// save.quests = { [id]: { state: 'active'|'claimed', base: {…수락 시점 카운터} } }
// save.story  = { seen: { [sceneId]: true } }
// 완료 여부는 저장하지 않고 매번 goal로 계산한다 (저장 꼬임 방지).
// ============================================
import { QUESTS, SCENES, RECRUIT_SCENES } from './story.js';
import { GRADES, gradeIdx, CHRONICLE_TUNING as T, DUNGEON_TIERS, expNeedFor } from './data.js';
import { rollItem, autoGrowUnit, refreshDungeonKeys, _addKeys } from './engine.js';

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// 구 저장 보정 — 1.205.0 저장에는 quests/story/killsByKey가 없다
export function ensureQuestFields(save) {
  if (!save) return save;
  const s = clone(save);
  s.quests = s.quests || {};
  s.story = s.story || { seen: {}, recruitSeen: {} };
  s.story.recruitSeen = s.story.recruitSeen || {};
  s.progress.killsByKey = s.progress.killsByKey || {};
  s.progress.dungeonTier = s.progress.dungeonTier || {};
  s.stats.elites = s.stats.elites ?? 0;
  s.stash = s.stash || [];
  s.fams = s.fams || {};
  s.famTeam = s.famTeam || {};
  s.famPity = s.famPity || { total: 0, sinceViolet: 0 };
  s.mats = { famShard: 0, famSoul: 0, sealPlus: 0, towerCoin: 0, talentScroll: 0, ...s.mats };
  s.tower = s.tower || { best: 0, checkpoint: 0, run: null };
  // 마스터리 폐지 (1.224.0) — 찍은 마스터리는 전부 스킬 포인트로 환급 (반복 실행해도 안전)
  for (const u of Object.values(s.units || {})) {
    if (u.mastery) { u.sp = (u.sp || 0) + u.mastery; u.mastery = 0; }
    u.talents = u.talents || {};
  }
  return refreshDungeonKeys(s);
}

export const questDef = (id) => QUESTS.find(q => q.id === id);

function counters(save) {
  return {
    kills: save.stats.kills || 0,
    elites: save.stats.elites || 0,
    dungeon: save.progress.dungeonClears || 0,
    keys: { ...(save.progress.killsByKey || {}) },
  };
}

export function questReqMet(save, q) {
  const r = q.req || {};
  if (r.field && !(r.field === 1 || save.progress.bossCleared[r.field - 1])) return false;
  if (r.main && save.quests[r.main]?.state !== 'claimed') return false;
  if (r.rebirth && (save.units[save.hero]?.rebirth?.count || 0) < r.rebirth) return false; // 3부 (1.222.0)
  if (r.companion && (!save.units[r.companion] || r.companion === save.hero)) return false;
  return true;
}

// 진행도 { cur, max }
export function questProgress(save, q) {
  const g = q.goal;
  const st = save.quests[q.id];
  const base = st?.base || { kills: 0, elites: 0, dungeon: 0, keys: {} };
  const c = counters(save);
  switch (g.type) {
    case 'boss': return { cur: save.progress.bossCleared[g.field] ? 1 : 0, max: 1 };
    case 'killKey': return { cur: Math.min(g.n, (c.keys[g.key] || 0) - (base.keys?.[g.key] || 0)), max: g.n };
    case 'kills': return { cur: Math.min(g.n, c.kills - base.kills), max: g.n };
    case 'elites': return { cur: Math.min(g.n, c.elites - base.elites), max: g.n };
    case 'dungeon': return { cur: Math.min(g.n, c.dungeon - base.dungeon), max: g.n };
    case 'level': return { cur: Math.min(g.n, save.units[save.hero].lv), max: g.n };
    case 'enhance': return { cur: Math.min(g.n, Math.max(0, ...save.inventory.map(i => i.plus || 0))), max: g.n };
    case 'dungeonTier': { const best = save.progress.dungeonTier?.[g.id]; return { cur: best != null && best >= g.tier ? 1 : 0, max: 1 }; }
    case 'tower': return { cur: Math.min(g.n, save.tower?.best || 0), max: g.n };
    case 'grade': return { cur: save.inventory.some(i => gradeIdx(i.grade) >= gradeIdx(g.grade)) ? 1 : 0, max: 1 };
    default: return { cur: 0, max: 1 };
  }
}

// 상태: locked | available | active | done | claimed
export function questStatus(save, q) {
  const st = save.quests[q.id];
  if (st?.state === 'claimed') return 'claimed';
  if (!questReqMet(save, q)) return 'locked';
  const active = st?.state === 'active' || q.kind === 'main';
  if (!active) return 'available';
  const p = questProgress(save, q);
  return p.cur >= p.max ? 'done' : 'active';
}

export function questList(save) {
  return QUESTS.map(q => ({ q, status: questStatus(save, q), prog: questProgress(save, q) }));
}
export function currentMainQuest(save) {
  return QUESTS.find(q => q.kind === 'main' && questStatus(save, q) !== 'claimed' && questStatus(save, q) !== 'locked') || null;
}
export function questBadgeCount(save) {
  return questList(save).filter(x => x.status === 'done' || x.status === 'available').length;
}

export function acceptQuest(save0, id) {
  const q = questDef(id);
  if (!q || questStatus(save0, q) !== 'available') return save0;
  const save = clone(save0);
  save.quests[id] = { state: 'active', base: counters(save) };
  return save;
}
export function abandonQuest(save0, id) {
  const q = questDef(id);
  if (!q || q.kind === 'main' || save0.quests[id]?.state !== 'active') return save0;
  const save = clone(save0);
  delete save.quests[id];
  return save;
}

// 보상 수령 → { save, gained }
export function claimQuest(save0, id, rng = Math.random) {
  const q = questDef(id);
  if (!q || questStatus(save0, q) !== 'done') return { save: save0, gained: null };
  const save = clone(save0);
  const r = q.reward || {};
  const gained = { ...r, item: null };
  save.gold += r.gold || 0;
  save.mats.essence += r.essence || 0;
  save.mats.shard += r.shard || 0;
  if (r.keys) gained.keysGot = _addKeys(save, r.keys);
  if (r.exp) {
    for (const cid of save.party) {
      const u = save.units[cid];
      if (u.lv >= T.maxLevel) continue;
      u.exp += r.exp;
      let up = false;
      while (u.lv < T.maxLevel && u.exp >= expNeedFor(u)) { u.exp -= expNeedFor(u); u.lv += 1; u.points += T.pointsPerLevel; u.sp += T.spPerLevel; up = true; }
      if (up && cid !== save.hero) save.units[cid] = autoGrowUnit(u);
    }
  }
  if (r.item) {
    const heroLv = save.units[save.hero].lv;
    const it = { ...rollItem(rng, r.item.grade, heroLv, null, r.item.set || 'field', save.hero), uid: save.nextUid++ };
    save.inventory.push(it);
    if (it.grade === 'epic') save.stats.epics += 1;
    gained.item = it;
  }
  if (r.growth) {
    const target = q.kind === 'companion' ? q.req.companion : save.hero;
    const u = save.units[target];
    if (u) { u.points += r.growth.points || 0; u.sp += r.growth.sp || 0; }
    gained.growthTarget = target;
  }
  save.quests[id] = { ...(save.quests[id] || {}), state: 'claimed' };
  return { save, gained };
}

// 전투 전후 비교 — 새로 완료된 의뢰 이름
export function newlyDoneQuests(before, after) {
  return QUESTS.filter(q => questStatus(before, q) !== 'done' && questStatus(after, q) === 'done').map(q => q.title);
}

export function rewardText(r) {
  const p = [];
  if (r.gold) p.push(`🪙 ${r.gold}`);
  if (r.exp) p.push(`경험치 ${r.exp}`);
  if (r.essence) p.push(`✦ ${r.essence}`);
  if (r.shard) p.push(`◆ ${r.shard}`);
  if (r.keys) p.push(`🗝 ${r.keys}`);
  if (r.item) p.push(`${GRADES[gradeIdx(r.item.grade)].label} 장비`);
  if (r.growth) p.push(`능력치 +${r.growth.points} · 스킬 포인트 +${r.growth.sp}`);
  return p.join(' · ');
}

// ===== 이야기 =====
// 지금 보여 줄 장면 (없으면 null). 동료 합류 장면은 일반 장면 뒤에 나온다.
export function nextScene(save, ctx = { at: 'town' }) {
  if (!save?.story) return null;
  for (const sc of SCENES) {
    if (save.story.seen[sc.id]) continue;
    if (sc.when(save, ctx)) return { ...sc };
  }
  for (const cid of Object.keys(save.units)) {
    if (cid === save.hero || save.story.recruitSeen[cid]) continue;
    const sc = RECRUIT_SCENES[cid];
    if (sc) return { id: `recruit_${cid}`, recruit: cid, ...sc };
  }
  return null;
}
export function markSceneSeen(save0, scene) {
  const save = clone(save0);
  if (scene.recruit) save.story.recruitSeen[scene.recruit] = true;
  else save.story.seen[scene.id] = true;
  return save;
}
export function seenScenes(save) {
  return SCENES.filter(s => save.story?.seen?.[s.id]);
}
