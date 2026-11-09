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
import { CHRONICLE_TUNING as T, REBIRTH } from './data.js';

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
export function levelCap(roster) {
  if (!roster) return T.maxLevel;
  const n = reachedCount(roster, ROSTER.unlockLv);
  return Math.min(T.maxLevel, ROSTER.baseCap + ROSTER.perChar * Math.max(0, n - 1));
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
