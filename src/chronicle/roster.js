// ============================================
// chronicle/roster.js — 황혼 연대기 원정대 (1.229.0)
// ============================================
// PM 결정 (1.229.0): 모든 캐릭터를 키우게 하는 장치
//   레벨 상한 = 60 · 두 번째 캐릭터부터 Lv.60 달성마다 +10 (5캐릭 모두 60 = 100)
//   전역 버프 = 각 캐릭터가 Lv.20/40/60/80/100에 도달할 때마다 「다른 캐릭터들」에게 영구 버프 (직업 특성)
//   기존 저장 = 레벨 유지, 상한을 넘는 동안 경험치만 멈춤
//   최고 레벨(peak)은 기록 — 전승해서 Lv.1이 돼도 상한·버프는 유지
// roster = { [classId]: { lv, peak, rebirth } } — account.toView가 만들어 save 뷰에 넣는다
// 데이터 + 순수 함수만 (engine·account가 이 파일을 쓴다)
// ============================================
import { CHRONICLE_TUNING as T, REBIRTH, rebirthLevelCap } from './data.js';

export const ROSTER = { baseCap: 60, perChar: 10, unlockLv: 60 };
export const ROSTER_MILESTONES = [20, 40, 60, 80, 100];

// 캐릭터 최고 레벨 — 전승한 적이 있으면 만렙(전승 조건)을 찍은 것
export const peakOf = (c) => Math.max(c?.peakLv || 0, c?.unit?.lv || 0, c?.unit?.rebirth?.count > 0 ? REBIRTH.reqLevel : 0);

export function buildRoster(chars) {
  const r = {};
  for (const [cid, c] of Object.entries(chars || {})) r[cid] = { lv: c.unit?.lv || 1, peak: peakOf(c), rebirth: c.unit?.rebirth?.count || 0 };
  return r;
}
export const reachedCount = (roster, lv) => Object.values(roster || {}).filter(r => r.peak >= lv).length;
// 레벨 상한 — roster가 없으면(시뮬·구 뷰) 만렙
// rebirthCount (1.278.0) — 전승자는 원정대 상한이 만렙(100)까지 풀려 있으면 전승 횟수별 만렙(1회 120 · 이후 +10씩, rebirthLevelCap)까지 성장
export function levelCap(roster, rebirthCount = 0) {
  const base = roster ? Math.min(T.maxLevel, ROSTER.baseCap + ROSTER.perChar * Math.max(0, reachedCount(roster, ROSTER.unlockLv) - 1)) : T.maxLevel;
  return rebirthCount > 0 && base >= T.maxLevel ? rebirthLevelCap(rebirthCount) : base;
}
// 다음 상한 해제까지 필요한 것 (UI)
export function nextCapHint(roster) {
  const cap = levelCap(roster);
  if (cap >= T.maxLevel) return null;
  return { cap, next: cap + ROSTER.perChar, need: reachedCount(roster, ROSTER.unlockLv) + 1 };
}

// 전역 버프 — 직업별 [Lv.20, 40, 60, 80, 100] (그 캐릭터 「외의」 캐릭터에게)
export const GLOBAL_BUFFS = {
  wanderer: { title: '검객의 가르침', fx: [{ crit: 0.01 }, { counterPct: 0.02 }, { critDmg: 0.05 }, { crit: 0.01 }, { critDmg: 0.1 }] },
  sage: { title: '술사의 지혜', fx: [{ skillDmg: 0.02 }, { atkPct: 0.01 }, { skillDmg: 0.03 }, { atkPct: 0.02 }, { skillDmg: 0.05 }] },
  demonblood: { title: '마족의 혈기', fx: [{ hpPct: 0.02 }, { lowHpDmg: 0.03 }, { hpPct: 0.03 }, { lowHpDmg: 0.05 }, { hpPct: 0.05 }] },
  elf: { title: '정령의 바람', fx: [{ dodge: 0.005 }, { spdPct: 0.02 }, { dodge: 0.01 }, { spdPct: 0.03 }, { dodge: 0.015 }] },
  priest: { title: '여명의 축복', fx: [{ healPct: 0.05 }, { regenPct: 0.001 }, { dmgReduce: 0.01 }, { regenPct: 0.001 }, { dmgReduce: 0.02 }] },
};
// selfCid가 받는 전역 버프 합계
export function globalBuffFx(roster, selfCid) {
  const fx = {};
  for (const [cid, r] of Object.entries(roster || {})) {
    if (cid === selfCid || !GLOBAL_BUFFS[cid]) continue;
    ROSTER_MILESTONES.forEach((lv, i) => {
      if (r.peak < lv) return;
      for (const [k, v] of Object.entries(GLOBAL_BUFFS[cid].fx[i])) fx[k] = (fx[k] || 0) + v;
    });
  }
  return fx;
}
const LBL = {
  crit: '치명타 확률', counterPct: '반격 확률', critDmg: '치명타 피해', skillDmg: '스킬 피해', atkPct: '공격력', hpPct: '최대 HP',
  lowHpDmg: 'HP 50% 이하일 때 피해', dodge: '회피', spdPct: '속도', healPct: '회복량', regenPct: '매 턴 HP 재생', dmgReduce: '받는 피해 감소',
};
export function rosterFxText(fx) {
  return Object.entries(fx).filter(([, v]) => v).map(([k, v]) => `${LBL[k] || k} +${Math.round(v * 1000) / 10}%`).join(' · ');
}

// ============================================
// 원정대 의뢰 (1.230.0) — 계정 목표 · 보상은 공유 재화
// 진행도는 roster로 매번 계산 (저장 X) · 받은 의뢰만 계정 rosterQuests.claimed에 기록
// ============================================
const cnt = (roster, lv) => reachedCount(roster, lv);
const made = (roster) => Object.keys(roster || {}).length;
const reborn = (roster) => Object.values(roster || {}).filter(r => r.rebirth > 0).length;
export const ROSTER_QUESTS = [
  { id: 'rq_make2', title: '동료를 찾아서', desc: '캐릭터 2명 만들기', need: 2, cur: made, reward: { gold: 1000 } },
  { id: 'rq_make5', title: '다섯 갈래의 길', desc: '캐릭터 5명 모두 만들기', need: 5, cur: made, reward: { famShard: 30 } },
  { id: 'rq_all20', title: '첫걸음', desc: '캐릭터 5명 모두 Lv.20', need: 5, cur: (r) => cnt(r, 20), reward: { gold: 3000, famShard: 50 } },
  { id: 'rq_two60', title: '두 번째 기둥', desc: '캐릭터 2명 Lv.60 (상한 Lv.70 해제)', need: 2, cur: (r) => cnt(r, 60), reward: { famShard: 20, talentScroll: 1 } },
  { id: 'rq_all40', title: '단단해진 원정대', desc: '캐릭터 5명 모두 Lv.40', need: 5, cur: (r) => cnt(r, 40), reward: { famShard: 30, gold: 5000 } },
  { id: 'rq_three60', title: '세 번째 기둥', desc: '캐릭터 3명 Lv.60 (상한 Lv.80 해제)', need: 3, cur: (r) => cnt(r, 60), reward: { talentScroll: 1, famShard: 100 } },
  { id: 'rq_all60', title: '황혼을 넘는 자들', desc: '캐릭터 5명 모두 Lv.60 (상한 Lv.100 해제)', need: 5, cur: (r) => cnt(r, 60), reward: { famShard: 50, talentScroll: 2 } },
  { id: 'rq_all80', title: '여명의 수호자들', desc: '캐릭터 5명 모두 Lv.80', need: 5, cur: (r) => cnt(r, 80), reward: { famShard: 50, gold: 20000 } },
  { id: 'rq_all100', title: '전설의 원정대', desc: '캐릭터 5명 모두 Lv.100', need: 5, cur: (r) => cnt(r, 100), reward: { famShard: 100, talentScroll: 3 } },
  { id: 'rq_reb1', title: '다시 태어난 자', desc: '캐릭터 1명 전승', need: 1, cur: reborn, reward: { famShard: 30, famSoul: 100 } },
  { id: 'rq_reb5', title: '윤회의 원정대', desc: '캐릭터 5명 모두 전승', need: 5, cur: reborn, reward: { famShard: 100, famSoul: 500 } },
];
export function rosterQuestState(save, q) {
  const cur = Math.min(q.need, q.cur(save.roster));
  if (save.rosterQuests?.claimed?.[q.id]) return { cur, status: 'claimed' };
  return { cur, status: cur >= q.need ? 'done' : 'progress' };
}
export const rosterQuestBadge = (save) => ROSTER_QUESTS.filter(q => rosterQuestState(save, q).status === 'done').length;
// 보상 받기 → 새 save (재화는 계정 공유 필드)
export function claimRosterQuest(save0, id) {
  const q = ROSTER_QUESTS.find(x => x.id === id);
  if (!q || rosterQuestState(save0, q).status !== 'done') return save0;
  const save = { ...save0, mats: { ...save0.mats }, rosterQuests: { claimed: { ...(save0.rosterQuests?.claimed || {}), [id]: true } } };
  for (const [k, v] of Object.entries(q.reward)) {
    if (k === 'gold') save.gold += v; else save.mats[k] = (save.mats[k] || 0) + v;
  }
  return save;
}
// 모두 받기 (1.275.0) → { save, n }
export function claimAllRosterQuests(save0) {
  let save = save0, n = 0;
  for (const q of ROSTER_QUESTS) {
    if (rosterQuestState(save, q).status !== 'done') continue;
    save = claimRosterQuest(save, q.id); n += 1;
  }
  return { save, n };
}
const REWARD_LBL = { gold: ['🪙', '골드'], talentScroll: ['📖', '특성 주문서'], famShard: ['📜', '계약서 조각'], famSoul: ['🔮', '사역혼'] };
export const rosterRewardText = (r) => Object.entries(r).map(([k, v]) => `${(REWARD_LBL[k] || ['', k])[0]} ${(REWARD_LBL[k] || ['', k])[1]} ${v.toLocaleString()}`).join(' · ');
