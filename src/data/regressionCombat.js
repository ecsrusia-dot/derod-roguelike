// ============================================
// data/regressionCombat.js — 🌀 회귀의 탐험가 2.0 전용 전투 (PR B, 1.182.0)
// ============================================
// PM 결정: 전투 화면은 시안 2(본편 전투 화면 스타일). 단 본편 CombatScreen은 고치지 않고 이 모드 전용으로 만든다.
// 규칙 (docs/regression-v2-design.md 2.3·2.7):
//   - 평타로 싸운다. 스킬은 발동 조건이 맞으면 「전투당 각 1회」 자동 발동. 플레이어 개입 불가
//   - 스킬 위력·회복량 = 기본치 + Σ(관련 능력치 × 계수)
//   - 전투 직전 유일한 선택 = 전투 태세 (강한 태세는 생명의 불꽃 소모)
// 구조: simulateRegressionCombat(순수 함수, rng 주입) → 사건 목록 → 화면은 재생만. node로 밸런스 검증 가능
// ⚠️ 밸런스는 REGRESSION_COMBAT 한 곳
// =========================================================

import { ENEMIES } from './enemies.js';
import { POTIONS } from './potions.js';

export const REGRESSION_COMBAT = {
  baseHp: 100, hpPerVit: 10, hpPerLevel: 6,           // 1.184.0 강인 HP 12→10 (강인 빌드 독주 완화)
  baseAtk: 6, atkPerStr: 1.2,       // 평타 = 6 + 근력×1.2 + max(무기 능력치 × 계열 계수)
  // 1.184.0~ 계열 계수 (직업 밸런스 — 능력치 역할 기준): 주문은 강하고, 신성은 회복을 겸하니 공격이 약하다
  weaponMult: { 검술: 2.0, 사격: 1.8, 마법: 2.2, 신성: 1.5 },
  lorePower: 0.04,                                       // 1.184.0~ 학식 1당 스킬 위력·회복·보호막 +4%
  dodgeBase: 5, dodgePerAgi: 2.5, dodgeCap: 45,          // %
  critBase: 5, critPerInsight: 2, critMult: 1.5,          // %
  defPerVit: 0.6,                                         // 받는 피해 고정 감소
  variance: 0.15,
  enemyDodge: { normal: 8, elite: 10, boss: 6 },
  // 적 강도 — 지역별 (본편 수치 × 배율). 체감 조정은 여기서
  enemyHp: { 1: 0.85, 2: 0.8, 3: 0.75, 4: 0.7, spire: 0.45 },
  enemyDmg: { 1: 0.85, 2: 0.75, 3: 0.68, 4: 0.62, spire: 0.42 },
  maxTurns: 30,
  potionBelowPct: 0.5,
};

// =========== 전투 태세 (PM 확정) ===========
export const REGRESSION_STANCES = [
  { id: 'calm', name: '평상', mult: 1, flames: 0, desc: '아무 대가 없이 싸운다' },
  { id: 'spirit', name: '투지 개방', mult: 1.2, flames: 0, hpCostPct: 5, desc: '공격·회피 ×1.2 · 시작 시 HP 5% 소모' },
  { id: 'burn', name: '생명 연소', mult: 1.5, flames: 1, shieldPct: 20, desc: '공격·회피 ×1.5 · 최대 HP 20% 보호막 · 생명의 불꽃 1' },
  { id: 'limit', name: '한계 돌파', mult: 2, flames: 2, sacrificePct: 30, desc: '공격·회피 ×2 · 현재 HP 30% 희생(죽지 않음) · 생명의 불꽃 2' },
];
export const REGRESSION_FLAMES_PER_LIFE = 3;
export function getRegressionStance(id) { return REGRESSION_STANCES.find(s => s.id === id) || REGRESSION_STANCES[0]; }

// =========== 스킬 3등급 — 오리지널 판타지 ===========
// trigger: battleStart | firstHit(처음 공격받을 때) | enemyDodge(상대가 회피) | selfDodge(내가 회피) |
//          selfHp(이하 비율) | enemyHp(이하 비율) | turn(N턴째) | enemyHeavy(대공격 예고) | lethal(쓰러질 때)
// effect: strike(즉시 피해) | heal | shield | guard(이번 피격 감소율) | reflect | buff(공격 배율·턴) | stun(적 행동 1회 봉쇄)
//         | sure(다음 평타 필중 + 추가 피해) | revive
// scale: { 능력치: 계수 } — 위력 = base + Σ(능력치 × 계수)
export const REGRESSION_SKILL_TIERS = {
  normal: { name: '일반', color: '#c9b8a4' },
  advanced: { name: '고급', color: '#7ba3c4' },
  fortune: { name: '기연', color: '#e8b04a' },
};
export const REGRESSION_SKILLS = {
  // ── 일반 12 (시작 커스텀에서 3개 선택) ──
  gale_step:    { tier: 'normal', name: '질풍 걸음', trigger: 'enemyDodge', effect: 'sure', base: 4, scale: { 민첩: 1.5 }, desc: '상대가 회피하면 — 다음 평타 필중 + 추가 피해' },
  iron_stance:  { tier: 'normal', name: '철벽 자세', trigger: 'firstHit', effect: 'guard', base: 0.5, reflect: { base: 0, scale: { 강인: 2 } }, desc: '처음 공격받으면 — 피해 50% 감소 + 강인 비례 반사' },
  first_aid:    { tier: 'normal', name: '응급 처치', trigger: 'selfHp', at: 0.4, effect: 'heal', base: 10, scale: { 신성: 4, 강인: 2 }, desc: 'HP 40% 이하 — 신성·강인 비례 회복' },
  fireball:     { tier: 'normal', name: '화염구', trigger: 'battleStart', effect: 'strike', base: 8, scale: { 마법: 3 }, desc: '전투 시작 — 마법 비례 화염 피해' },
  pin_shot:     { tier: 'normal', name: '견제 사격', trigger: 'enemyHeavy', effect: 'stun', base: 4, scale: { 사격: 2 }, desc: '적이 대공격을 준비하면 — 사격 비례 피해 + 대공격 저지' },
  vital_thrust: { tier: 'normal', name: '급소 찌르기', trigger: 'enemyHp', at: 0.3, effect: 'strike', base: 6, scale: { 검술: 2, 통찰: 1.5 }, desc: '적 HP 30% 이하 — 검술·통찰 비례 마무리 일격' },
  power_blow:   { tier: 'normal', name: '강타', trigger: 'turn', at: 2, effect: 'strike', base: 6, scale: { 근력: 2.5 }, desc: '2턴째 — 근력 비례 강타' },
  ward:         { tier: 'normal', name: '수호의 빛', trigger: 'selfHp', at: 0.6, effect: 'shield', base: 6, scale: { 신성: 3 }, desc: 'HP 60% 이하 — 신성 비례 보호막' },
  counter_cut:  { tier: 'normal', name: '반격 베기', trigger: 'selfDodge', effect: 'strike', base: 4, scale: { 검술: 2, 민첩: 1 }, desc: '내가 회피하면 — 검술·민첩 비례 반격' },
  war_cry:      { tier: 'normal', name: '함성', trigger: 'battleStart', effect: 'buff', base: 0.2, turns: 3, scaleMult: { 화술: 0.03 }, desc: '전투 시작 — 3턴 공격 +20% (화술 1당 +3%)' },
  snare:        { tier: 'normal', name: '올가미', trigger: 'turn', at: 3, effect: 'stun', base: 2, scale: { 사격: 1, 통찰: 1 }, desc: '3턴째 — 적 행동 1회 봉쇄' },
  frost_bolt:   { tier: 'normal', name: '서리 화살', trigger: 'enemyHp', at: 0.6, effect: 'strike', base: 6, scale: { 마법: 2.5 }, desc: '적 HP 60% 이하 — 마법 비례 냉기 피해' },
  // ── 고급 8 (강적 승리 후 이야기 + 판정 / 상점 드묾) ──
  storm_slash:  { tier: 'advanced', name: '폭풍 베기', trigger: 'turn', at: 3, effect: 'strike', base: 12, scale: { 검술: 3, 근력: 2 }, desc: '3턴째 — 검술·근력 비례 연속 베기' },
  pierce_arrow: { tier: 'advanced', name: '관통 화살', trigger: 'enemyHp', at: 0.5, effect: 'strike', base: 12, scale: { 사격: 4 }, desc: '적 HP 50% 이하 — 사격 비례 관통 피해' },
  chain_bolt:   { tier: 'advanced', name: '연쇄 번개', trigger: 'enemyDodge', effect: 'strike', base: 10, scale: { 마법: 4 }, desc: '상대가 회피하면 — 피할 수 없는 번개' },
  sanctuary:    { tier: 'advanced', name: '성역', trigger: 'selfHp', at: 0.5, effect: 'heal', base: 16, scale: { 신성: 8 }, desc: 'HP 50% 이하 — 신성 비례 대회복' },
  blood_armor:  { tier: 'advanced', name: '피의 갑주', trigger: 'firstHit', effect: 'shield', base: 10, scale: { 강인: 5 }, desc: '처음 공격받으면 — 강인 비례 보호막' },
  shadow_step:  { tier: 'advanced', name: '그림자 걸음', trigger: 'selfDodge', effect: 'buff', base: 0.35, turns: 2, scaleMult: { 민첩: 0.03 }, desc: '내가 회피하면 — 2턴 공격 +35%' },
  silver_tongue:{ tier: 'advanced', name: '위압', trigger: 'battleStart', effect: 'stun', base: 0, scale: { 화술: 1 }, desc: '전투 시작 — 적의 첫 행동 봉쇄' },
  hunter_mark:  { tier: 'advanced', name: '사냥꾼의 표식', trigger: 'battleStart', effect: 'buff', base: 0.25, turns: 4, scaleMult: { 통찰: 0.03 }, desc: '전투 시작 — 4턴 공격 +25%' },
  // ── 기연 6 (보스 승리 / 기연 사건 — 빌드 개연성 판정) ──
  saint_flash:  { tier: 'fortune', name: '검성의 일섬', trigger: 'enemyHp', at: 0.5, effect: 'strike', base: 24, scale: { 검술: 6 }, desc: '적 HP 50% 이하 — 검술 비례 일섬' },
  dragon_breath:{ tier: 'fortune', name: '용의 숨결', trigger: 'battleStart', effect: 'strike', base: 22, scale: { 마법: 6 }, desc: '전투 시작 — 마법 비례 화염 폭풍' },
  sky_volley:   { tier: 'fortune', name: '천궁의 화살비', trigger: 'selfDodge', effect: 'strike', base: 20, scale: { 사격: 5, 민첩: 2 }, desc: '내가 회피하면 — 사격·민첩 비례 화살비' },
  dawn_miracle: { tier: 'fortune', name: '여명의 기적', trigger: 'lethal', effect: 'revive', base: 0.3, scaleMult: { 신성: 0.03 }, desc: '쓰러질 때 1회 — HP 30% (신성 1당 +3%)로 부활' },
  titan_body:   { tier: 'fortune', name: '거인의 육체', trigger: 'battleStart', effect: 'shield', base: 20, scale: { 강인: 8, 근력: 2 }, desc: '전투 시작 — 강인·근력 비례 거대 보호막' },
  sage_eye:     { tier: 'fortune', name: '현자의 눈', trigger: 'enemyHeavy', effect: 'guard', base: 1, reflect: { base: 10, scale: { 통찰: 4, 학식: 3 } }, desc: '적이 대공격을 준비하면 — 그 공격을 완전히 막고 반사' },
};
export const REGRESSION_NORMAL_SKILLS = Object.keys(REGRESSION_SKILLS).filter(k => REGRESSION_SKILLS[k].tier === 'normal');
export const REGRESSION_START_SKILL_COUNT = 3;
export const REGRESSION_SKILL_PRESETS = {
  wanderer: ['gale_step', 'iron_stance', 'vital_thrust'],
  sage: ['fireball', 'frost_bolt', 'iron_stance'],
  demonblood: ['power_blow', 'iron_stance', 'war_cry'],
  elf: ['pin_shot', 'snare', 'gale_step'],
  priest: ['first_aid', 'ward', 'iron_stance'],
};
export function regressionSkillStats(id) { return Object.keys(REGRESSION_SKILLS[id]?.scale || REGRESSION_SKILLS[id]?.scaleMult || REGRESSION_SKILLS[id]?.reflect?.scale || {}); }

function scaled(base, scale, stats) {
  return base + Object.entries(scale || {}).reduce((a, [k, c]) => a + (stats[k] || 0) * c, 0);
}
// 스킬 수치 미리보기 (화면 설명용)
export function regressionSkillValue(id, stats) {
  const sk = REGRESSION_SKILLS[id]; if (!sk) return null;
  if (sk.effect === 'buff') return Math.round((sk.base + scaled(0, sk.scaleMult, stats)) * 100);
  if (sk.effect === 'revive') return Math.round((sk.base + scaled(0, sk.scaleMult, stats)) * 100);
  if (sk.effect === 'guard') return Math.round(sk.base * 100);
  return Math.round(scaled(sk.base, sk.scale, stats) * (1 + (stats.학식 || 0) * REGRESSION_COMBAT.lorePower));
}

// =========== 전투 참가자 ===========
export function regressionPlayerCombatant({ stats, level = 0, maxHp, hp, skills = [], belt = [], relicBonus = {} }) {
  const C = REGRESSION_COMBAT;
  const weapon = Math.max(...Object.entries(C.weaponMult).map(([k, m]) => (stats[k] || 0) * m));
  return {
    maxHp, hp,
    atk: (C.baseAtk + (stats.근력 || 0) * C.atkPerStr + weapon + level * 0.5) * (1 + (relicBonus.dmgDealt || 0) / 100),
    dodge: Math.min(C.dodgeCap, C.dodgeBase + (stats.민첩 || 0) * C.dodgePerAgi + (relicBonus.dodge || 0)),
    crit: C.critBase + (stats.통찰 || 0) * C.critPerInsight + (relicBonus.critRate || 0),
    def: (stats.강인 || 0) * C.defPerVit,
    takenMult: 1 + (relicBonus.dmgTaken || 0) / 100,
    lifesteal: relicBonus.lifesteal || 0,
    skillPower: 1 + (stats.학식 || 0) * C.lorePower,
    stats, skills, belt: [...belt],
  };
}
// dayMult — 1.185.0~ 날이 갈수록 강해지는 적 (regressionDayEnemyMult, 첨탑은 1)
export function regressionEnemyCombatant(enemyKey, enemyObj, regionKey, dayMult = 1) {
  const C = REGRESSION_COMBAT;
  const e = enemyObj || ENEMIES[enemyKey];
  const tier = e.tier || 'normal';
  const hpMult = (C.enemyHp[regionKey] ?? 1) * dayMult, dmgMult = (C.enemyDmg[regionKey] ?? 1) * dayMult;
  const hp = Math.round(e.hp * hpMult);
  return {
    key: enemyKey, name: e.name, tier, maxHp: hp, hp,
    dodge: C.enemyDodge[tier] ?? 8,
    patterns: (e.patterns || []).map(p => ({ ...p, dmg: (p.dmg || [0, 0]).map(d => Math.round(d * dmgMult)) })),
  };
}

// =========== 전투 시뮬 (순수) ===========
// 반환: { win, events, hpEnd, damageTaken, observations, usedPotions }
// events: { t, ... } — UI가 그대로 재생 (t: start|stance|hit|miss|crit|skill|heal|shield|stun|warn|potion|revive|end)
export function simulateRegressionCombat({ player: P0, enemy: E0, stanceId = 'calm', rng = Math.random }) {
  const C = REGRESSION_COMBAT;
  const P = { ...P0, shield: 0, buffMult: 1, buffTurns: 0, sureBonus: null, hitTaken: false, used: new Set(), guardNext: 0, reflectNext: 0 };
  const E = { ...E0, stunned: 0, heavyNext: null, defense: 0 };
  const stance = getRegressionStance(stanceId);
  const ev = [];
  let damageTaken = 0;
  const observations = [];
  const usedPotions = [];
  const vary = (v) => Math.max(1, Math.round(v * (1 - C.variance + rng() * C.variance * 2)));
  const skillsBy = (trig) => P.skills.filter(id => REGRESSION_SKILLS[id]?.trigger === trig && !P.used.has(id));

  ev.push({ t: 'start', p: P.hp, e: E.hp });
  // 태세 대가
  if (stance.hpCostPct) { const c = Math.round(P.maxHp * stance.hpCostPct / 100); P.hp = Math.max(1, P.hp - c); }
  if (stance.sacrificePct) { const c = Math.round(P.hp * stance.sacrificePct / 100); P.hp = Math.max(1, P.hp - c); }
  if (stance.shieldPct) P.shield += Math.round(P.maxHp * stance.shieldPct / 100);
  ev.push({ t: 'stance', id: stance.id, p: P.hp, shield: P.shield });

  const dealToEnemy = (amt, label, kind = 'hit') => {
    let d = amt;
    if (E.defense > 0) { const a = Math.min(E.defense, d); E.defense -= a; d -= a; }
    E.hp = Math.max(0, E.hp - d);
    if (P.lifesteal && d > 0) P.hp = Math.min(P.maxHp, P.hp + Math.round(d * P.lifesteal / 100));
    ev.push({ t: kind, who: 'P', dmg: d, label, p: P.hp, e: E.hp });
    return d;
  };
  const fire = (id, ctx = {}) => {
    const sk = REGRESSION_SKILLS[id]; if (!sk || P.used.has(id)) return false;
    P.used.add(id);
    ev.push({ t: 'skill', id, p: P.hp, e: E.hp });
    const st = P.stats;
    const sp = P.skillPower || 1;
    if (sk.effect === 'strike') dealToEnemy(vary(scaled(sk.base, sk.scale, st) * sp * stance.mult), sk.name);
    else if (sk.effect === 'heal') { const h = Math.round(scaled(sk.base, sk.scale, st) * sp); P.hp = Math.min(P.maxHp, P.hp + h); ev.push({ t: 'heal', amt: h, label: sk.name, p: P.hp, e: E.hp }); }
    else if (sk.effect === 'shield') { const s = Math.round(scaled(sk.base, sk.scale, st) * sp); P.shield += s; ev.push({ t: 'shield', amt: s, label: sk.name, p: P.hp, e: E.hp }); }
    else if (sk.effect === 'buff') { P.buffMult = 1 + sk.base + scaled(0, sk.scaleMult, st); P.buffTurns = sk.turns || 2; ev.push({ t: 'buff', pct: Math.round((P.buffMult - 1) * 100), turns: P.buffTurns, label: sk.name }); }
    else if (sk.effect === 'stun') { const d = Math.round(scaled(sk.base, sk.scale, st) * sp); if (d > 0) dealToEnemy(vary(d * stance.mult), sk.name); E.stunned = 1; if (E.heavyNext) E.heavyNext = null; ev.push({ t: 'stun', label: sk.name, p: P.hp, e: E.hp }); }
    else if (sk.effect === 'sure') P.sureBonus = Math.round(scaled(sk.base, sk.scale, st));
    else if (sk.effect === 'guard') { P.guardNext = sk.base; if (sk.reflect) P.reflectNext = Math.round(scaled(sk.reflect.base, sk.reflect.scale, st) * sp); }
    return true;
  };
  const checkHpTriggers = () => {
    for (const id of skillsBy('selfHp')) if (P.hp > 0 && P.hp / P.maxHp <= REGRESSION_SKILLS[id].at) fire(id);
    for (const id of skillsBy('enemyHp')) if (E.hp > 0 && E.hp / E.maxHp <= REGRESSION_SKILLS[id].at) fire(id);
  };
  const tryPotion = () => {
    if (P.hp <= 0 || P.hp / P.maxHp >= C.potionBelowPct || !P.belt.length) return;
    const idx = P.belt.findIndex(id => POTIONS[id]?.healPct || POTIONS[id]?.healFull);
    if (idx < 0) return;
    const pid = P.belt.splice(idx, 1)[0];
    const pot = POTIONS[pid];
    const h = pot.healFull ? P.maxHp : Math.round(P.maxHp * pot.healPct / 100);
    P.hp = Math.min(P.maxHp, P.hp + h); usedPotions.push(pid);
    ev.push({ t: 'potion', id: pid, amt: h, p: P.hp, e: E.hp });
  };

  for (const id of skillsBy('battleStart')) fire(id);

  for (let turn = 1; turn <= C.maxTurns && P.hp > 0 && E.hp > 0; turn++) {
    ev.push({ t: 'turn', n: turn });
    for (const id of skillsBy('turn')) if (REGRESSION_SKILLS[id].at === turn) fire(id);
    if (E.hp <= 0) break;
    // 플레이어 평타
    const mult = stance.mult * (P.buffTurns > 0 ? P.buffMult : 1);
    if (P.sureBonus != null) {
      const bonus = P.sureBonus; P.sureBonus = null;
      dealToEnemy(vary(P.atk * mult) + bonus, `필중 평타 (+${bonus})`);
    } else if (rng() * 100 < E.dodge) {
      ev.push({ t: 'miss', who: 'P', p: P.hp, e: E.hp });
      for (const id of skillsBy('enemyDodge')) fire(id);
    } else {
      const crit = rng() * 100 < P.crit;
      dealToEnemy(vary(P.atk * mult * (crit ? C.critMult : 1)), crit ? '치명타' : '평타', crit ? 'crit' : 'hit');
    }
    if (P.buffTurns > 0) P.buffTurns -= 1;
    checkHpTriggers();
    if (E.hp <= 0) break;
    // 적 행동
    if (E.stunned > 0) { E.stunned = 0; ev.push({ t: 'stunned', p: P.hp, e: E.hp }); }
    else {
      let pat;
      if (E.heavyNext) { pat = E.heavyNext; E.heavyNext = null; }
      else {
        pat = E.patterns[Math.floor(rng() * E.patterns.length)] || { name: '공격', dmg: [5, 8], type: 'attack' };
        if (pat.heavy) { // 대공격은 한 턴 전에 예고
          E.heavyNext = pat;
          ev.push({ t: 'warn', name: pat.name });
          for (const id of skillsBy('enemyHeavy')) fire(id);
          if (!E.heavyNext) continue; // 견제 사격 등으로 저지됨
          pat = { name: '기세 모으기', type: 'defend', defense: 0 };
        }
      }
      if (pat.type === 'defend') { E.defense += pat.defense || 0; ev.push({ t: 'defend', name: pat.name, def: pat.defense || 0 }); }
      else {
        const obs = { heavy: !!pat.heavy, countered: false };
        observations.push(obs);
        if (rng() * 100 < P.dodge * stance.mult ** 0.5) {
          obs.countered = !!pat.heavy;
          ev.push({ t: 'miss', who: 'E', name: pat.name, p: P.hp, e: E.hp });
          for (const id of skillsBy('selfDodge')) fire(id);
        } else {
          if (!P.hitTaken) { P.hitTaken = true; for (const id of skillsBy('firstHit')) fire(id); }
          let d = vary(pat.dmg[0] + rng() * (pat.dmg[1] - pat.dmg[0]));
          d = Math.max(1, Math.round(d * P.takenMult - P.def));
          if (P.guardNext) { d = Math.round(d * (1 - P.guardNext)); P.guardNext = 0; if (pat.heavy) obs.countered = true; }
          if (P.shield > 0) { const a = Math.min(P.shield, d); P.shield -= a; d -= a; }
          P.hp = Math.max(0, P.hp - d); damageTaken += d;
          ev.push({ t: 'hit', who: 'E', dmg: d, name: pat.name, heavy: !!pat.heavy, p: P.hp, e: E.hp, shield: P.shield });
          if (P.reflectNext) { const r = P.reflectNext; P.reflectNext = 0; dealToEnemy(r, '반사'); }
          if (P.hp <= 0) {
            const rv = skillsBy('lethal')[0];
            if (rv) { fire(rv); const sk = REGRESSION_SKILLS[rv]; P.hp = Math.round(P.maxHp * (sk.base + scaled(0, sk.scaleMult, P.stats))); ev.push({ t: 'revive', p: P.hp, e: E.hp }); }
          }
        }
      }
    }
    checkHpTriggers();
    tryPotion();
  }
  const win = E.hp <= 0 && P.hp > 0;
  ev.push({ t: 'end', win, p: P.hp, e: E.hp });
  return { win, events: ev, hpEnd: P.hp, damageTaken, observations, usedPotions };
}
