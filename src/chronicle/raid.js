// ============================================
// chronicle/raid.js — 황혼 연대기 원정대 레이드 「다섯 봉인」 (1.231.0)
// ============================================
// PM 요청: 키운 캐릭터들로 파티를 짜서 깨는 레이드 — 한 캐릭터가 하드캐리할 수 없고, 고르게 키워 각자 역할을 해야 클리어
//   단계: Lv.60 → 80 → 100 → 각성(전승) 20 → 40 → 60 → 80 → 100 — 매 단계 「5캐릭 전원」이 조건 충족해야 입장
// 하드캐리 방지 장치 (engine simulateChronicleBattle):
//   ① 보스를 직업별 봉인 5개가 지킨다 — 봉인은 그 직업만 깰 수 있고(sealOf), 봉인이 남아 있으면 보스 무적(sealedBoss)
//   ② 봉인 주인이 쓰러지면 그 봉인은 영원히 못 깬다 → 즉시 실패
//   ③ 보스는 파티 전원을 공격한다 (주인공 우선 없음 · 광역 강타) — 약한 캐릭터가 버티지 못하면 실패
// 데이터 + 순수 함수만 (account·engine·data만 import)
// ============================================
import { CHRONICLE_CLASSES, buildChronicleEnemy, chronicleClass } from './data.js';
import { CENEMIES as ENEMIES } from './enemies.js';

const keyByName = (name) => Object.keys(ENEMIES).find(k => ENEMIES[k].name === name);
// hp/atk = 보스 배율 · seal = 봉인 HP 배율 (buildChronicleEnemy area) — 시뮬로 맞춘 값 (scratch raidcal.mjs)
export const RAID_TIERS = [
  { id: 'r60', name: '봉인의 문', desc: '서리 왕좌 아래 잠든 첫 번째 문', req: { lv: 60 }, lv: 60, boss: '절대영도의 군주', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 1.2 },
  { id: 'r80', name: '광기의 회랑', desc: '종말의 지휘봉이 울리는 회랑', req: { lv: 80 }, lv: 80, boss: '광기의 종말 마에스트로', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 1.55 },
  { id: 'r100', name: '심장의 제단', desc: '마왕의 심장이 뛰는 제단', req: { lv: 100 }, lv: 100, boss: '심장의 마왕', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 2.0 },
  { id: 'a20', name: '각성 · 천상의 정원', desc: '전승한 자만 들어서는 정원', req: { lv: 20, rebirth: 1 }, lv: 20, boss: '정원의 대천사', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 0.95 },
  { id: 'a40', name: '각성 · 봉인의 심처', desc: '봉인자가 숨은 가장 깊은 곳', req: { lv: 40, rebirth: 1 }, lv: 40, boss: '심처의 봉인자', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 1.05 },
  { id: 'a60', name: '각성 · 기억의 왕좌', desc: '잊힌 시대의 군주', req: { lv: 60, rebirth: 1 }, lv: 60, boss: '기억의 군주 므네메', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 1.4 },
  { id: 'a80', name: '각성 · 공허의 문', desc: '세계 바깥을 지키는 문지기', req: { lv: 80, rebirth: 1 }, lv: 80, boss: '공허의 문지기 네하르', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 1.8 },
  { id: 'a100', name: '각성 · 황혼의 근원', desc: '모든 황혼이 시작된 곳', req: { lv: 100, rebirth: 1 }, lv: 100, boss: '황혼의 근원 아이온', hp: 3.0, atk: 1.15, seal: 1.0, sealAtk: 2.3 },
];
export const RAID_SEAL_ART = '봉인의 화신';
const RAID_SEAL_SHORT = { wanderer: '검사', sage: '술사', demonblood: '마족', elf: '정령', priest: '사제' };
// 직업별 봉인 HP — 직업 화력 차이 보정 (모두 비슷한 라운드에 깨지도록, 시뮬 측정값)
export const RAID_SEAL_CLASS_HP = { wanderer: 0.55, sage: 1.7, demonblood: 1.25, elf: 2.0, priest: 0.3 };
// 직업별 봉인 반향 세기 — 탱커(방랑검사)는 단단해서 레벨이 낮아도 버티므로 더 세게
export const RAID_SEAL_CLASS_ATK = { wanderer: 2.4, sage: 1, demonblood: 1.5, elf: 1, priest: 1 };
export const raidTier = (id) => RAID_TIERS.find(t => t.id === id);

// 입장 조건 — 5직업 「전원」이 현재 레벨(최고 레벨 아님)·전승 횟수 충족
export function raidMemberOk(r, tier) {
  return !!r && r.lv >= tier.req.lv && (r.rebirth || 0) >= (tier.req.rebirth || 0);
}
export function raidEligible(roster, tier) {
  return CHRONICLE_CLASSES.every(c => raidMemberOk(roster?.[c.id], tier));
}
export function raidUnlocked(roster, raidState, i) {
  if (!raidEligible(roster, RAID_TIERS[i])) return false;
  return i === 0 || (raidState?.clears?.[RAID_TIERS[i - 1].id] || 0) > 0; // 앞 단계를 깨야 다음 단계
}

// 적 — 보스 1 + 직업별 봉인 5
export function buildRaidEnemies(tier) {
  const bossKey = keyByName(tier.boss);
  const boss = buildChronicleEnemy(bossKey, tier.lv, 'raid_boss', { hpMult: tier.hp, atkMult: tier.atk });
  boss.tier = 'boss'; boss.sealedBoss = true;
  const sealKey = keyByName(RAID_SEAL_ART);
  const seals = CHRONICLE_CLASSES.map(c => {
    const e = buildChronicleEnemy(sealKey, tier.lv, `seal_${c.id}`, { hpMult: tier.seal * (RAID_SEAL_CLASS_HP[c.id] || 1), atkMult: tier.sealAtk * (RAID_SEAL_CLASS_ATK[c.id] || 1) });
    return { ...e, name: `${c.name}의 봉인`, short: `${RAID_SEAL_SHORT[c.id]} 봉인`, tier: 'elite', sealOf: c.id, dodge: 0 };
  });
  return [boss, ...seals];
}

// 보상 — 단계별 하루 1회 (KST) + 첫 클리어 보너스. 재화는 계정 공유
export function raidReward(i, first) {
  const r = { gold: 4000 * (i + 1), sealPlus: 1 + Math.floor(i / 2), famSoul: 20 * (i + 1) };
  if (first) { r.sealPlus += 3; r.talentScroll = 1 + Math.floor(i / 3); }
  return r;
}
// 결과 반영 (계정 단위) → { acc, summary }
export function applyRaidResult(acc0, tierId, win, today) {
  const i = RAID_TIERS.findIndex(t => t.id === tierId);
  const raid = { clears: {}, daily: { date: today, done: {} }, ...(acc0.raid || {}) };
  if (raid.daily?.date !== today) raid.daily = { date: today, done: {} };
  const summary = { result: win ? 'win' : 'lose', exp: 0, gold: 0, items: [], essence: 0, shard: 0, levelUps: {}, unlocks: [], raid: { tierId } };
  if (!win || i < 0) return { acc: { ...acc0, raid }, summary };
  const first = !(raid.clears[tierId] > 0);
  const daily = !raid.daily.done[tierId];
  raid.clears = { ...raid.clears, [tierId]: (raid.clears[tierId] || 0) + 1 };
  const acc = { ...acc0, raid, mats: { ...acc0.mats } };
  if (daily || first) {
    const rw = raidReward(i, first);
    raid.daily = { ...raid.daily, done: { ...raid.daily.done, [tierId]: true } };
    acc.gold += rw.gold;
    for (const [k, v] of Object.entries(rw)) if (k !== 'gold') acc.mats[k] = (acc.mats[k] || 0) + v;
    summary.gold = rw.gold;
    summary.raid = { tierId, reward: rw, first };
  } else summary.raid = { tierId, noReward: true };
  if (first && RAID_TIERS[i + 1]) summary.unlocks.push(`원정대 레이드 「${RAID_TIERS[i + 1].name}」`);
  return { acc, summary };
}
export const raidClassName = (cid) => chronicleClass(cid).name;
