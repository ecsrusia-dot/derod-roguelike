// ============================================
// data/regression.js — 🌀 회귀의 탐험가 (MVP 1차: 데이터 + 순수 로직)
// ============================================
// 설계서: docs/regression-exploration-mode-design.md (PM 확정: 40일 · 본편 메타 강화 미적용)
//
// 구조 원칙 (무덤의 유산·제령사와 동일):
//   - 이 파일은 데이터 + 순수 함수만. React·storage 의존 0 → node 시뮬로 검증 가능
//   - 전투는 본편 CombatScreen 재사용 (MVP 2차에서 연결). 이 파일은 전투 "결과"만 받아 런 상태를 갱신
//   - 모든 상태 변경 함수는 새 객체를 반환 (입력 불변) — setMeta(prev => ...) 안에서 그대로 사용 가능
//   - 랜덤은 rng 인자로 주입 (기본 Math.random) — StrictMode 이중 실행 대비, 롤은 updater 밖에서
//
// ⚠️ 밸런스 조정은 REGRESSION_TUNING 한 곳. 검증: node scripts/sim-regression.mjs
// =========================================================

import { ENEMIES } from './enemies.js';
import { PASSIVE_SKILLS } from './passives.js';
import { RELICS } from './relics.js';
import { POTIONS, CLASS_BELT } from './potions.js';

// =========== 튜닝 ===========
export const REGRESSION_TUNING = {
  days: 40,                 // 한 생의 길이 (PM 확정). 41일째 = 황혼의 첨탑
  fameGate: 100,            // 첨탑 입장 자격
  eliteFameGate: 30,        // 강적 출현 명성
  fameGain: { normal: 2, elite: 5 },
  regionFameMult: { 1: 1.0, 2: 1.15, 3: 1.3, 4: 1.5 },
  recordPerPattern: 15,     // 적 행동 1회 관찰당 기록 게이지 %
  recordIntPerPoint: 0.5,   // 지능 (스탯-10) 1포인트당 추가 %
  heavyCounterMult: 2,      // 대공격을 간파 카운터로 받으면 배율
  loseRecordMult: 0.5,      // 패배(사망) 전투에서도 본 만큼은 절반 기록 — 다음 생 계승 후보는 아님
  carryRecordPct: 50,       // 회귀 시 계승 기록의 시작 게이지
  carrySlotsBase: 1,
  hpPerLoop: 5,             // 회귀 1회당 시작 최대 HP +
  hpPerLoopCap: 50,
  restHealPct: 40,          // 야영 1일 회복 (최대 HP 대비 %)
  spireHpMult: 1.3,         // 첨탑 1~3라운드 보스 강화
  spireAtkMult: 1.2,
  spireWeaknessMemories: 3, // 기억 조각 N개 이상 → 첨탑 주인 약점 개방
  spireWeaknessTakenPct: 25,
  // 1.178.0~ 자동 전투 전용 (PM 결정: 플레이어 개입 불가) — 본편 AI는 사람보다 약해 적을 낮춘다.
  // CombatScreen expedition.enemyHpMult/enemyDmgMult로 전달 (AP_TUNING과 곱연산). 체감 조정은 이 표 한 곳.
  regionEnemyMult: {
    1: { hp: 0.85, dmg: 0.85 },
    2: { hp: 1.00, dmg: 0.95 },
    3: { hp: 1.10, dmg: 1.05 },
    4: { hp: 1.20, dmg: 1.15 },
    spire: { hp: 1.40, dmg: 1.30 },
  },
  // 직업별 모드 보정 (CombatScreen engravingFx로 전달 — 본편 각인·각성도와 무관한 이 모드 전용 값).
  // 1.178.0 실측: 사제는 회복 -75% / 받는 피해 +35%에도 매 전투 HP ~95%로 끝나 1생부터 정복 → PM 결정 대기, 현재 보정 없음
  classFx: {},
  // 1.179.0~ 전투 후 HP 규칙 (PM 결정): 전투 중 회복은 그 전투 안에서만 유효 —
  // 전투 후 HP = 전투 전 HP − 받은 피해 × woundPct (회복으로 되돌린 양은 이월되지 않음, 사제 독주 해소)
  woundPct: 0.6,
  spireWoundPct: 0.8,       // 첨탑 층 사이 (층간 회복 없음 규칙의 연장)
  relicSlots: 2,            // 출전 준비에서 장착할 유물 수
  // 랜덤 획득 (승리 시) — 일반: 아래 중 1개 굴림 / 강적: 유물 확정 + passive·potion 중 1개
  lootNormal: { relic: 0.22, passive: 0.18, potion: 0.30 },  // 나머지 = 없음
  lootElite: { passive: 0.5, potion: 0.5 },
};

// =========== 지역 ===========
// chapterId = 본편 클래식 챕터 (적·일러·기믹 그대로 재사용)
export const REGRESSION_HUB = 'village';
export const REGRESSION_REGIONS = [
  { id: 1, chapterId: 1, name: '북부 극지대', travelDays: 1, danger: 1 },
  { id: 2, chapterId: 2, name: '죽은 자의 숲', travelDays: 1, danger: 2 },
  { id: 3, chapterId: 3, name: '봉인된 신전', travelDays: 1, danger: 3 },
  { id: 4, chapterId: 4, name: '마계의 균열', travelDays: 2, danger: 4 },
];

export function getRegressionRegion(id) {
  return REGRESSION_REGIONS.find(r => r.id === id) || null;
}

// 지역 적 풀 — ENEMIES의 chapter 필드에서 자동 산출 (보스 제외: 보스는 첨탑 전용)
export function regressionEnemyPool(regionId, tier) {
  const region = getRegressionRegion(regionId);
  if (!region) return [];
  return Object.keys(ENEMIES).filter(k => {
    const e = ENEMIES[k];
    return e.chapter === region.chapterId && e.tier === tier;
  });
}

// =========== 기록자의 눈 — 적 → 기록 보상 ===========
// type: 'passive' (공용 패시브 Lv +n, maxLv 클램프) / 'maxHp' (최대 HP +n)
// 직업 전용 액티브 스킬은 직업별 풀이라 MVP에서는 패시브·HP만 (설계서 3.1 — 액티브 해금은 후속 검토)
export const REGRESSION_RECORDS = {
  // 북부 극지대
  goblin:        { reward: { type: 'passive', id: '가속', n: 1 } },
  iceWolf:       { reward: { type: 'passive', id: '정밀', n: 1 } },
  tundraRaider:  { reward: { type: 'passive', id: '강타', n: 1 } },
  wraith:        { reward: { type: 'passive', id: '심안', n: 1 } },
  frostGiant:    { reward: { type: 'passive', id: '수비', n: 2 } },
  // 죽은 자의 숲
  fallenElf:     { reward: { type: 'passive', id: '회피', n: 1 } },
  shadowWolf:    { reward: { type: 'passive', id: '잔혹', n: 1 } },
  corruptSpider: { reward: { type: 'maxHp', n: 20 } },
  forestSpirit:  { reward: { type: 'passive', id: '재생', n: 2 } },
  forestTyrant:  { reward: { type: 'maxHp', n: 30 } },  // 1.178.0 강타+2 → HP (자동 전투 실측: 강타 Lv.3+ 다단히트 = 기절 고정)
  // 봉인된 신전
  timeKeeper:    { reward: { type: 'passive', id: '가속', n: 1 } },
  brokenGolem:   { reward: { type: 'passive', id: '수비', n: 1 } },
  sealMage:      { reward: { type: 'passive', id: '마력', n: 1 } },
  ancientPriest: { reward: { type: 'passive', id: '신앙', n: 2 } },
  // 마계의 균열
  demonScout:    { reward: { type: 'passive', id: '정밀', n: 1 } },
  wrathDemon:    { reward: { type: 'passive', id: '잔혹', n: 1 } },
  riftBreach:    { reward: { type: 'passive', id: '운명', n: 1 } },
  demonApostle:  { reward: { type: 'passive', id: '마력', n: 2 } },
};

export function describeRegressionRecord(enemyKey) {
  const r = REGRESSION_RECORDS[enemyKey]?.reward;
  if (!r) return '';
  if (r.type === 'passive') return `패시브 「${r.id}」 +${r.n}Lv`;
  if (r.type === 'maxHp') return `최대 HP +${r.n}`;
  return '';
}

// =========== 기억 조각 (회귀 메타 — 영구) ===========
// trigger: 회귀 시점에 (meta, run, cause)로 판정. effect: 다음 생부터 적용되는 선언형 보너스
// effect 키: startGold / startFame / extraDays / recordBonusPct / carrySlots / eliteUnlock(지역 id) /
//            travelDiscount(지역 id → -1일) / spireRestPct(첨탑 라운드 사이 회복 %)
export const REGRESSION_MEMORIES = [
  { id: 'mem_first_death', name: '첫 번째 죽음', desc: '죽음이 끝이 아님을 알았다.',
    hint: '한 번 회귀한다', effect: { startGold: 30 },
    trigger: () => true },
  { id: 'mem_frost_grave', name: '얼어붙은 무덤', desc: '극지에서 얼어 죽은 기억 — 망령이 사는 곳을 안다.',
    hint: '북부 극지대에서 쓰러진다', effect: { eliteUnlock: 1 },
    trigger: (m, run, cause) => cause === 'death' && run.region === 1 },
  { id: 'mem_rotten_path', name: '썩은 숲의 길', desc: '숲의 폭군이 지나간 자리를 기억한다.',
    hint: '죽은 자의 숲에서 쓰러진다', effect: { eliteUnlock: 2 },
    trigger: (m, run, cause) => cause === 'death' && run.region === 2 },
  { id: 'mem_seal_glyph', name: '봉인의 문양', desc: '신전 벽의 문양이 눈을 감아도 보인다.',
    hint: '봉인된 신전에서 쓰러진다', effect: { eliteUnlock: 3 },
    trigger: (m, run, cause) => cause === 'death' && run.region === 3 },
  { id: 'mem_rift_scar', name: '균열의 상흔', desc: '균열로 가는 지름길을 몸이 기억한다.',
    hint: '마계의 균열에서 쓰러진다', effect: { travelDiscount: 4 },
    trigger: (m, run, cause) => cause === 'death' && run.region === 4 },
  { id: 'mem_chronicler', name: '기록자의 각성', desc: '보는 것만으로 더 깊이 새긴다.',
    hint: '한 생에서 적 5종을 완전히 기록한다', effect: { recordBonusPct: 10 },
    trigger: (m, run) => run.learned.length >= 5 },
  { id: 'mem_nameless_hero', name: '이름 없는 영웅', desc: '사람들이 처음 보는 나를 어딘가 안다.',
    hint: '한 생에서 명성 60에 도달한다', effect: { startFame: 10 },
    trigger: (m, run) => run.fame >= 60 },
  { id: 'mem_spire_shadow', name: '첨탑의 그림자', desc: '첨탑의 계단 사이 숨 돌릴 틈을 안다.',
    hint: '황혼의 첨탑에서 패배한다', effect: { spireRestPct: 20 },
    trigger: (m, run, cause) => cause === 'spireLose' },
  { id: 'mem_lonely_loop', name: '고독한 회귀자', desc: '다섯 번의 죽음 끝에 더 많은 것을 쥐고 돌아온다.',
    hint: '다섯 번 회귀한다', effect: { carrySlots: 1 },
    trigger: (m) => (m.loops || 0) + 1 >= 5 },
  { id: 'mem_time_end', name: '시간의 끝', desc: '황혼이 오는 날을 정확히 안다 — 조금 더 일찍 움직인다.',
    hint: '명성 미달로 40일을 넘긴다', effect: { extraDays: 3 },
    trigger: (m, run, cause) => cause === 'timeout' },
];

export function getRegressionMemory(id) {
  return REGRESSION_MEMORIES.find(x => x.id === id) || null;
}

// 보유 기억 조각 효과 합산 (fx bag — 본편 aggregateEngravingEffects와 같은 사상)
export function aggregateRegressionMemories(memoryIds = []) {
  const fx = { startGold: 0, startFame: 0, extraDays: 0, recordBonusPct: 0, carrySlots: 0, spireRestPct: 0, eliteUnlock: [], travelDiscount: [] };
  for (const id of memoryIds) {
    const m = getRegressionMemory(id);
    if (!m) continue;
    for (const [k, v] of Object.entries(m.effect)) {
      if (Array.isArray(fx[k])) fx[k].push(v);
      else fx[k] = (fx[k] || 0) + v;
    }
  }
  return fx;
}

// =========== 황혼의 첨탑 (최종전) ===========
// 본편 마스터즈 bossChain 패턴 — 라운드 사이 회복 없음 (기억 조각 spireRestPct만 예외)
export const REGRESSION_SPIRE_LORD = {
  name: '황혼의 첨탑 주인', hp: 720, color: '#3a1f4a',
  desc: '대륙에 황혼을 부르는 자. 회귀하는 탐험가를 기다려 왔다',
  isBoss: true, tier: 'boss', chapter: 4,
  patterns: [
    { name: '황혼의 낫', dmg: [36, 46], type: 'attack' },
    { name: '되감기는 시간', dmg: [24, 32], type: 'attack' },
    { name: '종말의 일몰', dmg: [54, 68], type: 'attack', heavy: true },
    { name: '황혼의 장막', dmg: [0, 0], type: 'defend', defense: 60 },
  ],
  drop: { gold: [0, 0] },
};
export const REGRESSION_SPIRE_CHAIN = ['iceMage', 'twilightChild', 'oblivionSealer', 'spireLord'];

// 첨탑 라운드의 실효 적 객체 (본편 ENEMIES 포맷 그대로 → CombatScreen에 넘길 수 있음)
export function buildRegressionSpireEnemy(round, memoryCount = 0, forceWeak = false) {
  const key = REGRESSION_SPIRE_CHAIN[round];
  if (!key) return null;
  const T = REGRESSION_TUNING;
  if (key === 'spireLord') {
    // 약점 = 받는 데미지 +N% → 본편 CombatScreen에는 받는 데미지 배율 필드가 없어 HP ÷ (1+N%)로 동등 환산
    const weak = forceWeak || memoryCount >= T.spireWeaknessMemories;
    const hp = weak ? Math.round(REGRESSION_SPIRE_LORD.hp / (1 + T.spireWeaknessTakenPct / 100)) : REGRESSION_SPIRE_LORD.hp;
    return { ...REGRESSION_SPIRE_LORD, hp, weaknessRevealed: weak };
  }
  const base = ENEMIES[key];
  return {
    ...base,
    hp: Math.round(base.hp * T.spireHpMult),
    patterns: base.patterns.map(p => ({ ...p, dmg: p.dmg.map(d => Math.round(d * T.spireAtkMult)) })),
  };
}

// =========== 메타 (meta.regression) ===========
export const EMPTY_REGRESSION = {
  loops: 0,            // 누적 회귀 횟수
  memories: [],        // 획득 기억 조각 id
  carry: [],           // 다음 생에 들고 갈 기록 (enemyKey) — carrySlots 개까지
  recordsEver: {},     // 회귀 도감: enemyKey → true (한 번이라도 완전 기록)
  bestFame: 0,
  bestDay: 0,
  endings: [],         // 도달 엔딩 id
  spireClears: 0,
};

export function regressionCarrySlots(metaR) {
  return REGRESSION_TUNING.carrySlotsBase + aggregateRegressionMemories(metaR?.memories).carrySlots;
}

// =========== 런 생성 ===========
export function createRegressionRun(metaR = EMPTY_REGRESSION, classId) {
  const T = REGRESSION_TUNING;
  const fx = aggregateRegressionMemories(metaR.memories);
  const records = {};
  for (const k of (metaR.carry || []).slice(0, regressionCarrySlots(metaR))) {
    if (REGRESSION_RECORDS[k]) records[k] = T.carryRecordPct;
  }
  return {
    classId,
    day: 1,
    maxDays: T.days + fx.extraDays,
    region: REGRESSION_HUB,
    fame: fx.startFame,
    gold: fx.startGold,
    hpPct: 1,
    maxHpBonus: Math.min((metaR.loops || 0) * T.hpPerLoop, T.hpPerLoopCap),
    records,               // enemyKey → 게이지 0~100
    learned: [],           // 완전 기록한 enemyKey (보상 적용됨)
    kills: { normal: 0, elite: 0 },
    eliteUnlocked: fx.eliteUnlock,       // 명성 미달이어도 강적이 나오는 지역
    travelDiscount: fx.travelDiscount,
    recordBonusPct: fx.recordBonusPct,
    spireRestPct: fx.spireRestPct,
    memoryCount: (metaR.memories || []).length,
    spireRound: null,      // 첨탑 진입 후 0~3
    pending: null,         // 진행 중 전투 { enemyKey, tier } — 새로고침 복원용
    relics: [],            // 1.178.0~ 획득 유물 이름 (본편 RELICS)
    bonusSkills: {},       // 1.178.0~ 랜덤 획득 패시브 Lv
    potions: {},           // 1.178.0~ 포션 보유 { potionId: 개수 }
    loadout: null,         // 1.178.0~ 직전 출전 준비 { activeSkills, activeRelics, belt }
    affinity: {},          // 1.179.0~ 동료 호감 { companionId: 0~100 }
    seenEvents: [],        // 1.179.0~ 이번 생에 본 사건 id
    statBonus: {},         // 1.179.0~ 사건 능력치 보너스 { 근력: n }
    over: null,            // null | 'death' | 'timeout' | 'spireLose' | 'victory'
    log: [],
  };
}

// =========== 날짜·이동 ===========
export function regressionTravelCost(run, to) {
  if (to === REGRESSION_HUB) return 1;
  const r = getRegressionRegion(to);
  if (!r) return Infinity;
  const disc = run.travelDiscount?.includes(to) ? 1 : 0;
  return Math.max(1, r.travelDays - disc);
}

export function isRegressionSpireDay(run) {
  return run.day > run.maxDays;
}

export function isRegressionSpireEligible(run) {
  return run.fame >= REGRESSION_TUNING.fameGate;
}

function advanceDays(run, n, logLine) {
  const next = { ...run, day: run.day + n, log: logLine ? [...run.log, `D${run.day}: ${logLine}`] : run.log };
  return next;
}

// 오늘 할 수 있는 행동 목록 (UI는 이 목록만 그린다)
export function regressionActions(run) {
  if (run.over || isRegressionSpireDay(run)) return [];
  const acts = [];
  const inRegion = run.region !== REGRESSION_HUB;
  if (inRegion) {
    acts.push({ kind: 'explore', tier: 'normal' });
    if (isRegressionEliteOpen(run, run.region)) acts.push({ kind: 'explore', tier: 'elite' });
  }
  acts.push({ kind: 'rest' });
  for (const to of [REGRESSION_HUB, ...REGRESSION_REGIONS.map(r => r.id)]) {
    if (to !== run.region) acts.push({ kind: 'travel', to, days: regressionTravelCost(run, to) });
  }
  return acts;
}

export function isRegressionEliteOpen(run, regionId) {
  return run.fame >= REGRESSION_TUNING.eliteFameGate || (run.eliteUnlocked || []).includes(regionId);
}

export function applyRegressionTravel(run, to) {
  const cost = regressionTravelCost(run, to);
  const name = to === REGRESSION_HUB ? '여명의 마을' : getRegressionRegion(to)?.name;
  return { ...advanceDays(run, cost, `${name}(으)로 이동 (${cost}일)`), region: to };
}

export function applyRegressionRest(run) {
  const comp = run.affinity ? aggregateRegressionCompanions(run).restHealPct : 0;
  const hpPct = Math.min(1, run.hpPct + (REGRESSION_TUNING.restHealPct + comp) / 100);
  return { ...advanceDays(run, 1, '야영'), hpPct };
}

// 탐험 적 뽑기 — rng 주입 (호출부는 setMeta updater 밖에서 롤)
export function rollRegressionEnemy(regionId, tier, rng = Math.random) {
  const pool = regressionEnemyPool(regionId, tier);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

// =========== 기록 게이지 ===========
// observations: 전투 중 적이 한 행동 목록 [{ heavy: bool, countered: bool }]
// intStat: 지능 스탯 (시그니처와 같은 "적용 포인트 = 스탯-10" 규칙)
export function regressionRecordGain(run, observations = [], intStat = 10) {
  const T = REGRESSION_TUNING;
  const per = T.recordPerPattern + Math.max(0, intStat - 10) * T.recordIntPerPoint;
  let sum = 0;
  for (const o of observations) sum += per * (o.heavy && o.countered ? T.heavyCounterMult : 1);
  const comp = run.affinity ? aggregateRegressionCompanions(run).recordBonusPct : 0;
  return sum * (1 + ((run.recordBonusPct || 0) + comp) / 100);
}

// 전투 시작 기록 — 전투 중 새로고침해도 같은 적과 재전투 (도주 불가, 무덤의 유산·제령사와 동일 원칙)
export function startRegressionCombat(run, enemyKey, tier) {
  return { ...run, pending: { enemyKey, tier } };
}

// 전투 결과 반영 — CombatScreen onVictory/onDefeat에서 호출 (MVP 2차)
// result: { enemyKey, tier, win, hpPct (전투 후 남은 HP 비율), observations, intStat }
// 반환: { run, learnedNow: [enemyKey] }
export function applyRegressionCombat(run, result) {
  const T = REGRESSION_TUNING;
  const { enemyKey, tier = 'normal', win, observations = [], intStat = 10 } = result;
  let next = { ...run, pending: null, records: { ...run.records }, learned: [...run.learned], kills: { ...run.kills } };
  const learnedNow = [];

  if (REGRESSION_RECORDS[enemyKey] && !next.learned.includes(enemyKey)) {
    const gain = regressionRecordGain(run, observations, intStat) * (win ? 1 : T.loseRecordMult);
    const cur = Math.min(100, (next.records[enemyKey] || 0) + gain);
    next.records[enemyKey] = Math.round(cur * 10) / 10;
    if (cur >= 100 && win) {
      next.learned.push(enemyKey);
      learnedNow.push(enemyKey);
    }
  }

  const name = ENEMIES[enemyKey]?.name || enemyKey;
  if (win) {
    const regionMult = T.regionFameMult[run.region] || 1;
    const fame = Math.round((T.fameGain[tier] || 0) * regionMult) + (run.affinity ? aggregateRegressionCompanions(run).famePerWin : 0);
    next.fame += fame;
    next.kills[tier] = (next.kills[tier] || 0) + 1;
    next.hpPct = Math.min(1, Math.max(0.01, result.hpPct ?? next.hpPct)); // 1.178.0 상한 — 전투 화면 최대 HP(근력 보너스 포함)가 더 커서 100% 초과 누적되던 버그
    // 사건에서 이어진 전투는 사건이 이미 하루를 썼으므로 날짜 미소모
    next = advanceDays(next, run.pending?.fromEvent ? 0 : 1, `${name} 처치 (명성 +${fame})${learnedNow.length ? ' · 기록 완성' : ''}`);
  } else {
    next.hpPct = 0;
    next.over = 'death';
    next = advanceDays(next, 0, `${name}에게 쓰러짐`);
  }
  return { run: next, learnedNow };
}

// =========== 첨탑 ===========
// 41일째 도달 시 호출. 자격 미달이면 timeout으로 종료
export function enterRegressionSpire(run) {
  if (!isRegressionSpireDay(run)) return run;
  if (!isRegressionSpireEligible(run)) return { ...run, over: 'timeout', log: [...run.log, `D${run.day}: 명성 부족 — 첨탑의 문이 열리지 않는다`] };
  return { ...run, spireRound: 0, log: [...run.log, `D${run.day}: 황혼의 첨탑 진입`] };
}

export function applyRegressionSpireResult(run, { win, hpPct }) {
  if (run.spireRound == null) return run;
  if (!win) return { ...run, hpPct: 0, over: 'spireLose', log: [...run.log, `첨탑 ${run.spireRound + 1}층에서 패배`] };
  const round = run.spireRound + 1;
  if (round >= REGRESSION_SPIRE_CHAIN.length) {
    return { ...run, hpPct: Math.min(1, hpPct), spireRound: round, over: 'victory', log: [...run.log, '황혼의 첨탑 정복'] };
  }
  const compRest = run.affinity ? aggregateRegressionCompanions(run).spireRestPct : 0;
  const healed = Math.min(1, Math.min(1, hpPct) + ((run.spireRestPct || 0) + compRest) / 100);
  return { ...run, hpPct: healed, spireRound: round, log: [...run.log, `첨탑 ${round}층 돌파`] };
}

// =========== 회귀 정산 ===========
// 런 종료(over 세팅) 후 호출. meta.regression을 갱신해 반환 + 이번에 얻은 기억 조각
// 계승 기록은 별도 setRegressionCarry로 선택 (UI 단계)
export function settleRegression(metaR = EMPTY_REGRESSION, run) {
  const cause = run.over;
  const base = { ...EMPTY_REGRESSION, ...metaR };
  const gained = [];
  if (cause !== 'victory') {
    for (const m of REGRESSION_MEMORIES) {
      if (base.memories.includes(m.id)) continue;
      if (m.trigger(base, run, cause)) gained.push(m.id);
    }
  }
  const recordsEver = { ...base.recordsEver };
  for (const k of run.learned) recordsEver[k] = true;
  return {
    meta: {
      ...base,
      loops: cause === 'victory' ? base.loops : base.loops + 1,
      memories: [...base.memories, ...gained],
      carry: [],   // 계승은 매 회귀마다 새로 선택
      recordsEver,
      bestFame: Math.max(base.bestFame, run.fame),
      bestDay: Math.max(base.bestDay, Math.min(run.day, run.maxDays)),
      spireClears: base.spireClears + (cause === 'victory' ? 1 : 0),
      endings: cause === 'victory' && !base.endings.includes(regressionEndingFor(run).id) ? [...base.endings, regressionEndingFor(run).id] : base.endings,
    },
    gainedMemories: gained,
    carryOptions: [...run.learned],
  };
}

export function setRegressionCarry(metaR, enemyKeys = []) {
  const slots = regressionCarrySlots(metaR);
  const valid = enemyKeys.filter(k => REGRESSION_RECORDS[k]).slice(0, slots);
  return { ...metaR, carry: valid };
}

// =========== 전투 로드아웃 ===========
// 본편 CombatScreen에 넘길 패시브 Lv·최대 HP. 본편 메타 강화(각인·각성도)는 PM 결정으로 미적용 —
// 호출부는 engravingFx={} 로 넘길 것.
// classStartSkills: CLASSES[].startSkills, baseMaxHp: GAME_CONFIG.startHp
export function buildRegressionLoadout(run, classStartSkills = {}, baseMaxHp = 300) {
  const skills = { ...classStartSkills };
  let maxHp = baseMaxHp + (run.maxHpBonus || 0);
  const compPassive = run.affinity ? aggregateRegressionCompanions(run).passive : {};
  for (const [name, lv] of [...Object.entries(run.bonusSkills || {}), ...Object.entries(compPassive)]) {
    const maxLv = PASSIVE_SKILLS[name]?.maxLv ?? 7;
    skills[name] = Math.min(maxLv, (skills[name] || 0) + lv);
  }
  for (const k of run.learned) {
    const r = REGRESSION_RECORDS[k]?.reward;
    if (!r) continue;
    if (r.type === 'passive') {
      const maxLv = PASSIVE_SKILLS[r.id]?.maxLv ?? 7;
      skills[r.id] = Math.min(maxLv, (skills[r.id] || 0) + r.n);
    } else if (r.type === 'maxHp') {
      maxHp += r.n;
    }
  }
  const relics = regressionRelicObjects(run);
  const activeRelics = run.loadout?.activeRelics?.filter(n => (run.relics || []).includes(n)) || null;
  for (const r of relics) {
    if (r.statBonus?.maxHp && (!activeRelics || activeRelics.includes(r.name))) maxHp += r.statBonus.maxHp;
  }
  return { skills, maxHp, hp: Math.max(1, Math.round(maxHp * run.hpPct)), relics };
}

// =========== 1.178.0~ 랜덤 획득 · 출전 준비 ===========
// 전투에서만 의미 있는 유물만 (시작 골드·지도 공개 등 본편 맵 전용 효과 제외). maxHp는 로드아웃에서 가산
const REGRESSION_RELIC_KEYS = new Set([
  'dmgDealt', 'critRate', 'critDmg', 'lifesteal', 'dmgTaken', 'dodge', 'maxHp', 'shieldOnStart', 'reflect',
  'heal', 'magicDmg', 'cdReduceChance', 'frostbiteResist', 'berserkResist', 'sealResist', 'shockResist', 'antiHeal', 'startSoul',
]);
export const REGRESSION_RELIC_POOL = RELICS.filter(r => (r.weight || 0) > 0 && r.statBonus
  && Object.keys(r.statBonus).every(k => REGRESSION_RELIC_KEYS.has(k)));

// 공용 패시브 (직업 전용·대장간 전용 제외)
// 강타 제외 — 다단히트 직업(사제·정령사)이 랜덤으로 Lv.3+를 모으면 충격 누적으로 적이 기절 고정됨 (1.178.0 실측)
export const REGRESSION_PASSIVE_POOL = Object.keys(PASSIVE_SKILLS).filter(n => !PASSIVE_SKILLS[n].classOnly && n !== '강타');
export const REGRESSION_POTION_POOL = ['hp_small', 'hp_small', 'hp_medium', 'soul', 'hp_large'];

export function regressionRelicObjects(run) {
  return (run.relics || []).map(n => RELICS.find(r => r.name === n)).filter(Boolean);
}

export function regressionBeltSlots(classId, run = null) {
  const extra = run?.affinity ? aggregateRegressionCompanions(run).potionCap : 0;
  return Math.max(1, CLASS_BELT[classId]?.max ?? 2) + extra;
}

// 승리 보상 굴림 — rng 주입 (setMeta updater 밖에서 호출)
export function rollRegressionLoot(run, tier = 'normal', rng = Math.random) {
  const T = REGRESSION_TUNING;
  const loot = {};
  const pickRelic = () => {
    const pool = REGRESSION_RELIC_POOL.filter(r => !(run.relics || []).includes(r.name));
    if (!pool.length) return null;
    const total = pool.reduce((a, r) => a + r.weight, 0);
    let x = rng() * total;
    for (const r of pool) { x -= r.weight; if (x < 0) return r.name; }
    return pool[pool.length - 1].name;
  };
  const pickPassive = () => REGRESSION_PASSIVE_POOL[Math.floor(rng() * REGRESSION_PASSIVE_POOL.length)];
  const pickPotion = () => REGRESSION_POTION_POOL[Math.floor(rng() * REGRESSION_POTION_POOL.length)];
  if (tier === 'elite') {
    loot.relic = pickRelic();
    if (rng() < T.lootElite.passive) loot.passive = pickPassive(); else loot.potion = pickPotion();
  } else {
    const x = rng();
    const L = T.lootNormal;
    if (x < L.relic) loot.relic = pickRelic();
    else if (x < L.relic + L.passive) loot.passive = pickPassive();
    else if (x < L.relic + L.passive + L.potion) loot.potion = pickPotion();
  }
  if (!loot.relic) delete loot.relic;
  return loot;
}

export function applyRegressionLoot(run, loot = {}) {
  const next = { ...run, relics: [...(run.relics || [])], bonusSkills: { ...(run.bonusSkills || {}) }, potions: { ...(run.potions || {}) } };
  if (loot.relic && !next.relics.includes(loot.relic)) next.relics.push(loot.relic);
  if (loot.passive) next.bonusSkills[loot.passive] = (next.bonusSkills[loot.passive] || 0) + 1;
  if (loot.potion) next.potions[loot.potion] = (next.potions[loot.potion] || 0) + 1;
  return next;
}

export function describeRegressionLoot(loot = {}) {
  const out = [];
  if (loot.relic) out.push(`유물 「${loot.relic}」`);
  if (loot.passive) out.push(`패시브 「${loot.passive}」 +1Lv`);
  if (loot.potion) out.push(`${POTIONS[loot.potion]?.icon || ''} ${POTIONS[loot.potion]?.name || loot.potion}`);
  return out.join(' · ');
}

// 출전 준비 확정 → run.loadout 저장 (다음 전투 기본값)
export function setRegressionLoadout(run, { activeSkills = null, activeRelics = [], belt = [] }) {
  return { ...run, loadout: { activeSkills, activeRelics, belt } };
}

// 전투 후 사용한 포션을 보유량에서 차감
export function consumeRegressionPotions(run, usedIds = []) {
  const potions = { ...(run.potions || {}) };
  for (const id of usedIds) {
    if (potions[id] > 0) potions[id] -= 1;
    if (potions[id] <= 0) delete potions[id];
  }
  return { ...run, potions };
}

// CombatScreen expedition prop — 자동 전투 보정 배율 + 유물 장착 수
export function regressionCombatExpedition(regionKey) {
  const m = REGRESSION_TUNING.regionEnemyMult[regionKey] || { hp: 1, dmg: 1 };
  return { enemyHpMult: m.hp, enemyDmgMult: m.dmg, maxRelicSelect: REGRESSION_TUNING.relicSlots };
}

export function regressionClassFx(classId) {
  return { ...(REGRESSION_TUNING.classFx[classId] || {}) };
}

// 1.179.0~ 전투 후 HP 비율 — hpBefore(절대값)에서 받은 피해 × 상처 비율만큼만 남는다
export function regressionPostCombatHpPct(hpBefore, maxHp, damageTaken = 0, spire = false, woundCut = 0) {
  const w = spire ? REGRESSION_TUNING.spireWoundPct - woundCut : REGRESSION_TUNING.woundPct;
  const hp = hpBefore - Math.max(0, damageTaken) * w;
  return Math.min(1, Math.max(0.01, hp / Math.max(1, maxHp)));
}

// ============================================
// 1.179.0~ MVP 3-2 — 동료 · 지역 사건 · 상점 · 엔딩
// ============================================

// =========== 동료 4명 (오리지널) ===========
// 교류(1일) = 호감 +affinityPerTalk (매력 15+ 보너스). 단계: 동행 40 / 맹약 100. 호감은 생마다 초기화
// perks: 단계별 선언형 효과 — 소비처는 아래 aggregateRegressionCompanions 한 곳
export const REGRESSION_COMPANION_TIERS = [
  { id: 'stranger', name: '안면', min: 0 },
  { id: 'ally', name: '동행', min: 40 },
  { id: 'oath', name: '맹약', min: 100 },
];
export const REGRESSION_COMPANIONS = [
  { id: 'knight', name: '발터', title: '몰락한 기사단장', region: 1, color: '#7ba3c4',
    desc: '눈보라 속에 사라진 기사단의 마지막 생존자. 지킬 것을 찾고 있다.',
    perks: { ally: { passive: { 수비: 1 } }, oath: { passive: { 수비: 2 }, spireWoundCut: 0.1 } },
    perkText: { ally: '패시브 「수비」 +1', oath: '「수비」 +2 추가 · 첨탑 상처 -10%p' },
    ending: { id: 'ending_knight', name: '눈 속의 기사단', text: '발터와 함께 북부에 새 기사단의 깃발을 세웠다. 황혼은 걷혔고, 지킬 것이 생겼다.' } },
  { id: 'healer', name: '세레나', title: '떠돌이 치유사', region: 2, color: '#9ad4a3',
    desc: '망자의 숲에서 살아 있는 자를 돌보는 치유사. 죽음을 미워한다.',
    perks: { ally: { restHealPct: 20 }, oath: { spireRestPct: 20, potionCap: 1 } },
    perkText: { ally: '야영 회복 +20%p', oath: '첨탑 층 사이 HP +20% · 포션 벨트 +1' },
    ending: { id: 'ending_healer', name: '은둔의 숲', text: '세레나와 함께 숲 깊은 곳에 치료소를 열었다. 더는 아무도 그 숲에서 길을 잃지 않는다.' } },
  { id: 'archivist', name: '오렌', title: '신전 기록관', region: 3, color: '#c9b8ff',
    desc: '봉인된 신전의 마지막 기록관. 회귀하는 자에 대한 기록을 찾고 있다.',
    perks: { ally: { recordBonusPct: 20 }, oath: { spireWeakness: true } },
    perkText: { ally: '기록 게이지 +20%', oath: '첨탑 주인의 약점 즉시 개방' },
    ending: { id: 'ending_archivist', name: '마지막 기록', text: '오렌은 회귀의 고리를 처음부터 끝까지 기록했다. 그 책의 마지막 장에는 내 이름이 적혀 있다.' } },
  { id: 'broker', name: '니아', title: '균열의 정보상', region: 4, color: '#e8b04a',
    desc: '균열 가장자리에서 마족과도 거래하는 정보상. 손해 보는 장사는 하지 않는다.',
    perks: { ally: { goldPct: 50 }, oath: { famePerWin: 1 } },
    perkText: { ally: '전투 승리 골드 +50%', oath: '전투 승리마다 명성 +1 추가' },
    ending: { id: 'ending_broker', name: '그림자 시장의 주인', text: '니아와 함께 균열의 시장을 손에 넣었다. 대륙의 모든 소문이 이제 내 귀로 먼저 들어온다.' } },
];
export const REGRESSION_ENDING_SPIRE = { id: 'ending_spire', name: '황혼을 끊은 자', text: '홀로 첨탑에 올라 황혼을 끊었다. 회귀의 고리가 멈추고, 처음으로 41일째 아침이 밝았다.' };
export const REGRESSION_ENDINGS = [REGRESSION_ENDING_SPIRE, ...REGRESSION_COMPANIONS.map(c => c.ending)];

export const REGRESSION_COMPANION_TUNING = { affinityPerTalk: 20, charismaBonus: 5, charismaGate: 15 };

export function getRegressionCompanion(id) {
  return REGRESSION_COMPANIONS.find(c => c.id === id) || null;
}
export function regressionCompanionTier(affinity = 0) {
  let t = REGRESSION_COMPANION_TIERS[0];
  for (const x of REGRESSION_COMPANION_TIERS) if (affinity >= x.min) t = x;
  return t;
}
export function regressionCompanionAt(regionId) {
  return REGRESSION_COMPANIONS.find(c => c.region === regionId) || null;
}

// 동료 효과 합산 (fx bag) — 단계가 오르면 하위 단계 효과도 유지
export function aggregateRegressionCompanions(run) {
  const fx = { passive: {}, restHealPct: 0, spireRestPct: 0, potionCap: 0, recordBonusPct: 0, spireWeakness: false, goldPct: 0, famePerWin: 0, spireWoundCut: 0 };
  for (const c of REGRESSION_COMPANIONS) {
    const aff = run.affinity?.[c.id] || 0;
    const tiers = [];
    if (aff >= 40) tiers.push('ally');
    if (aff >= 100) tiers.push('oath');
    for (const t of tiers) {
      for (const [k, v] of Object.entries(c.perks[t] || {})) {
        if (k === 'passive') for (const [n, lv] of Object.entries(v)) fx.passive[n] = (fx.passive[n] || 0) + lv;
        else if (typeof v === 'boolean') fx[k] = fx[k] || v;
        else fx[k] = (fx[k] || 0) + v;
      }
    }
  }
  return fx;
}

export function applyRegressionTalk(run, companionId, charisma = 10) {
  const c = getRegressionCompanion(companionId);
  if (!c) return run;
  const T = REGRESSION_COMPANION_TUNING;
  const gain = T.affinityPerTalk + (charisma >= T.charismaGate ? T.charismaBonus : 0);
  const before = run.affinity?.[companionId] || 0;
  const after = Math.min(100, before + gain);
  const up = regressionCompanionTier(after).id !== regressionCompanionTier(before).id ? ` — 「${regressionCompanionTier(after).name}」` : '';
  return {
    ...run, day: run.day + 1, affinity: { ...(run.affinity || {}), [companionId]: after },
    log: [...run.log, `D${run.day}: ${c.name}와 교류 (호감 ${after})${up}`],
  };
}

// 엔딩 — 맹약 동료 중 호감이 가장 높은 동료의 엔딩, 없으면 단독 정복 엔딩
export function regressionEndingFor(run) {
  const oaths = REGRESSION_COMPANIONS.filter(c => (run.affinity?.[c.id] || 0) >= 100);
  return oaths.length ? oaths[0].ending : REGRESSION_ENDING_SPIRE;
}

// =========== 상점 (여명의 마을) ===========
export const REGRESSION_SHOP = [
  { id: 'hp_small', kind: 'potion', price: 50 },
  { id: 'hp_medium', kind: 'potion', price: 100 },
  { id: 'hp_large', kind: 'potion', price: 180 },
  { id: 'soul', kind: 'potion', price: 60 },
  { id: 'relic', kind: 'relic', name: '유물 상자', desc: '전투 효과 유물 1개 (미보유 중 랜덤)', price: 160 },
  { id: 'passive', kind: 'passive', name: '수련 교본', desc: '공용 패시브 1개 +1Lv (랜덤)', price: 180 },
  { id: 'clinic', kind: 'heal', name: '마을 치료소', desc: 'HP 50% 회복', price: 70 },
];
export function buyRegressionShop(run, itemId, rng = Math.random) {
  const item = REGRESSION_SHOP.find(x => x.id === itemId);
  if (!item || (run.gold || 0) < item.price) return { run, bought: null };
  let next = { ...run, gold: run.gold - item.price };
  let bought = '';
  if (item.kind === 'potion') { next = applyRegressionLoot(next, { potion: item.id }); bought = POTIONS[item.id]?.name; }
  else if (item.kind === 'relic') {
    const loot = rollRegressionLoot(next, 'elite', rng);
    if (!loot.relic) return { run, bought: null };
    next = applyRegressionLoot(next, { relic: loot.relic }); bought = `유물 「${loot.relic}」`;
  } else if (item.kind === 'passive') {
    const name = REGRESSION_PASSIVE_POOL[Math.floor(rng() * REGRESSION_PASSIVE_POOL.length)];
    next = applyRegressionLoot(next, { passive: name }); bought = `패시브 「${name}」 +1Lv`;
  } else if (item.kind === 'heal') { next.hpPct = Math.min(1, next.hpPct + 0.5); bought = 'HP 50% 회복'; }
  return { run: { ...next, log: [...next.log, `D${run.day}: 구매 — ${bought} (-${item.price}G)`] }, bought };
}

// 전투 승리 골드 (적 drop.gold 범위 × 동료 보너스)
export function regressionVictoryGold(run, enemyKey, rng = Math.random) {
  const g = ENEMIES[enemyKey]?.drop?.gold || [10, 20];
  const base = g[0] + Math.floor(rng() * (g[1] - g[0] + 1));
  const pct = aggregateRegressionCompanions(run).goldPct;
  return Math.round(base * (1 + pct / 100));
}

// =========== 지역 사건 24개 (본편 EventScreen 포맷) ===========
// 본편과 같은 선택지 스키마(stat/dc/success/fail, result/reward/penalty, cost, combat). 모드 전용 reward.type:
//   'fame' {value} / 'affinity' {name: companionId, value} / 'record' {name: enemyKey, value} / 'heal_pct' {value: HP%}
//   'combat' {name: enemyKey, bonus?: reward} — 본편 EventScreen은 판정 없는 선택지의 combat 필드를 전달하지 않아 보상 타입으로 대체
// choice.requireMemory: 'mem_xxx' — 해당 기억 조각 보유 시에만 보이는 「전생의 기억」 선택지
export const REGRESSION_EVENTS = [
  // ── 북부 극지대 ──
  { id: 'rg_frozen_banner', region: 1, title: '얼어붙은 깃발', text: '눈 더미 속에 기사단의 깃발이 반쯤 묻혀 있다.\n멀리서 누군가 그 깃발을 바라보고 있다.', choices: [
    { text: '깃발을 파내 그에게 건넨다', result: '사내가 깃발을 받아 들고 오래 말이 없다.\n"…발터다. 이 은혜는 잊지 않겠다."', reward: { type: 'affinity', name: 'knight', value: 30 } },
    { text: '깃발 아래를 뒤진다', stat: '민첩', dc: 15, success: { text: '얼음 틈에서 은화 주머니를 찾았다.', reward: { type: 'gold', value: 90 } }, fail: { text: '얼음이 갈라지며 손을 베였다.', penalty: { hp: -25 } } },
  ] },
  { id: 'rg_wolf_den', region: 1, title: '늑대의 굴', text: '피 냄새가 밴 동굴. 안쪽에서 낮은 으르렁거림이 들린다.', choices: [
    { text: '숨어서 사냥 습성을 지켜본다', stat: '지능', dc: 14, success: { text: '늑대가 송곳니를 드러내는 순간을 익혔다.', reward: { type: 'record', name: 'iceWolf', value: 40 } }, fail: { text: '들켰다. 늑대가 달려든다!', combat: 'iceWolf' } },
    { text: '조용히 물러난다', result: '굴 입구에 걸린 늑대 사냥꾼의 부적만 챙겼다.', reward: { type: 'gold', value: 30 } },
  ] },
  { id: 'rg_blizzard_camp', region: 1, title: '눈보라 속 야영지', text: '꺼져 가는 모닥불 곁에 원정대의 짐이 버려져 있다.', choices: [
    { text: '불을 살리고 쉰다', result: '몸이 녹는다.', reward: { type: 'heal_pct', value: 30 } },
    { text: '짐을 뒤진다', result: '낡은 물약 하나를 찾았다.', reward: { type: 'potion_random' } },
  ] },
  { id: 'rg_ice_shrine', region: 1, title: '얼음 사당', text: '얼음으로 깎은 작은 사당. 공물을 바치면 축복을 내린다는 전설이 있다.', choices: [
    { text: '은화를 바친다 (60G)', cost: { gold: 60 }, result: '사당이 옅게 빛나며 몸이 단단해진다.', reward: { type: 'skill_specific', name: '수비' } },
    { text: '얼음 조각을 깨 가져간다', stat: '근력', dc: 16, success: { text: '빛나는 얼음 결정을 손에 넣었다. 마을에서 좋은 값을 받을 것이다.', reward: { type: 'gold', value: 120 } }, fail: { text: '사당이 분노하듯 냉기를 뿜는다.', penalty: { hp: -35 } } },
  ] },
  { id: 'rg_raider_toll', region: 1, title: '약탈자의 통행세', text: '동토의 약탈자들이 길을 막고 통행세를 요구한다.', choices: [
    { text: '통행세를 낸다 (40G)', cost: { gold: 40 }, result: '약탈자들이 길을 비킨다. 이름 없는 여행자로 지나간다.' },
    { text: '정면으로 맞선다', result: '약탈자 하나가 도끼를 뽑는다!', reward: { type: 'combat', name: 'tundraRaider' } },
    { text: '「전생의 기억」 — 그들의 두목 이름을 부른다', requireMemory: 'mem_frost_grave', result: '약탈자들이 얼어붙는다. "…어떻게 그 이름을?" 소문이 퍼진다.', reward: { type: 'fame', value: 8 } },
  ] },
  { id: 'rg_frost_knight_duel', region: 1, title: '기사의 대련', text: '발터가 녹슨 검을 건넨다. "검을 쥐는 법을 보자."', choices: [
    { text: '대련에 응한다', stat: '근력', dc: 15, success: { text: '"…나쁘지 않군." 발터의 눈빛이 달라졌다.', reward: { type: 'affinity', name: 'knight', value: 25 } }, fail: { text: '검이 튕겨 나간다. 발터가 손을 내민다. "다시."', reward: { type: 'affinity', name: 'knight', value: 10 } } },
    { text: '정중히 사양한다', result: '발터가 고개를 끄덕이고 다시 눈보라 속으로 돌아간다.' },
  ] },
  // ── 죽은 자의 숲 ──
  { id: 'rg_herb_patch', region: 2, title: '약초 군락', text: '썩은 나무 사이로 은빛 약초가 자라 있다. 누군가 정성껏 돌본 흔적이 있다.', choices: [
    { text: '약초를 캐 간다', result: '쓸 만한 약초다.', reward: { type: 'heal_pct', value: 25 } },
    { text: '돌본 사람을 기다린다', result: '해 질 무렵 치유사가 나타난다. "…약초를 남겨 줘서 고마워요. 세레나예요."', reward: { type: 'affinity', name: 'healer', value: 30 } },
  ] },
  { id: 'rg_whispering_grave', region: 2, title: '속삭이는 무덤', text: '이름 없는 무덤에서 누군가의 목소리가 새어 나온다. "…돌아왔구나."', choices: [
    { text: '귀를 기울인다', stat: '지능', dc: 15, success: { text: '망자가 숲의 비밀 하나를 속삭인다.', reward: { type: 'skill_random_lv' } }, fail: { text: '목소리가 비명으로 바뀐다.', penalty: { hp: -30 } } },
    { text: '무덤을 정돈해 준다', result: '목소리가 잦아든다. 묘비 아래 은화가 놓여 있다.', reward: { type: 'gold', value: 50 } },
  ] },
  { id: 'rg_spider_nest', region: 2, title: '거미줄 회랑', text: '나무 사이가 온통 거미줄이다. 그 끝에서 무언가 반짝인다.', choices: [
    { text: '거미줄을 헤치고 간다', stat: '민첩', dc: 15, success: { text: '반짝이던 것은 유물이었다.', reward: { type: 'random_relic' } }, fail: { text: '줄에 걸렸다. 거미가 내려온다!', combat: 'corruptSpider' } },
    { text: '거미의 움직임만 관찰한다', result: '거미가 먹이를 감는 방식을 지켜봤다.', reward: { type: 'record', name: 'corruptSpider', value: 35 } },
  ] },
  { id: 'rg_lost_child', region: 2, title: '길 잃은 아이', text: '숲속에서 아이가 울고 있다. 망자의 숲에 살아 있는 아이가?', choices: [
    { text: '아이를 마을까지 데려다준다', result: '아이는 무사히 돌아갔다. 마을에 이름이 알려진다.', reward: { type: 'fame', value: 10 }, penalty: { hp: -10 } },
    { text: '경계한다', stat: '지능', dc: 13, success: { text: '아이의 그림자가 없다. 망령이었다 — 물러나 화를 피했다.', reward: { type: 'gold', value: 40 } }, fail: { text: '아이가 웃으며 형체를 바꾼다!', combat: 'fallenElf' } },
  ] },
  { id: 'rg_healer_request', region: 2, title: '치유사의 부탁', text: '세레나가 다급하게 부른다. "부패한 정령이 약초밭을 망치고 있어요."', choices: [
    { text: '정령을 쫓아낸다', result: '오염된 정령이 덤벼든다! (세레나 호감 +25)', reward: { type: 'combat', name: 'forestSpirit', bonus: { type: 'affinity', name: 'healer', value: 25 } } },
    { text: '정화 의식을 돕는다 (50G)', cost: { gold: 50 }, result: '향을 사서 함께 정화했다. 세레나가 활짝 웃는다.', reward: { type: 'affinity', name: 'healer', value: 20 } },
  ] },
  { id: 'rg_rotten_tree', region: 2, title: '썩은 고목', text: '거대한 고목이 안쪽부터 썩어 있다. 그 속에 무언가 박혀 있다.', choices: [
    { text: '팔을 넣어 꺼낸다', stat: '근력', dc: 14, success: { text: '오래된 검집이 나왔다 — 안에는 은화가.', reward: { type: 'gold', value: 100 } }, fail: { text: '부패가 살갗을 파고든다.', penalty: { hp: -30 } } },
    { text: '「전생의 기억」 — 폭군이 지나간 길을 피한다', requireMemory: 'mem_rotten_path', result: '고목 뒤 숨은 길로 숲의 폭군을 미리 지켜봤다.', reward: { type: 'record', name: 'forestTyrant', value: 50 } },
  ] },
  // ── 봉인된 신전 ──
  { id: 'rg_sealed_library', region: 3, title: '봉인된 서고', text: '먼지 쌓인 서고. 한 노인이 책장 사이를 서성이고 있다.', choices: [
    { text: '노인에게 말을 건다', result: '"회귀자로군. 나는 오렌, 이 신전의 기록관일세."', reward: { type: 'affinity', name: 'archivist', value: 30 } },
    { text: '책을 몰래 읽는다', stat: '지능', dc: 15, success: { text: '고대 전투 기록에서 한 수를 배웠다.', reward: { type: 'skill_random_lv' } }, fail: { text: '봉인이 발동해 머리가 깨질 듯하다.', penalty: { hp: -30 } } },
  ] },
  { id: 'rg_time_echo', region: 3, title: '시간의 잔향', text: '복도 끝에서 나 자신이 걸어온다. 전생의 나였다.', choices: [
    { text: '그를 따라간다', result: '잔향이 숨겨진 방으로 안내한다.', reward: { type: 'random_relic' } },
    { text: '그와 마주 선다', stat: '매력', dc: 15, success: { text: '잔향이 말없이 고개를 끄덕이고 사라진다. 마음이 단단해진다.', reward: { type: 'heal_pct', value: 40 } }, fail: { text: '잔향이 검을 뽑는다!', combat: 'timeKeeper' } },
  ] },
  { id: 'rg_golem_repair', region: 3, title: '고장 난 골렘', text: '깨진 골렘이 같은 동작을 반복하고 있다. 핵이 드러나 있다.', choices: [
    { text: '핵을 고쳐 준다', stat: '지능', dc: 16, success: { text: '골렘이 멈추고 길을 비킨다. 그 뒤에 보물상자가.', reward: { type: 'gold', value: 130 } }, fail: { text: '핵이 폭주한다!', combat: 'brokenGolem' } },
    { text: '움직임을 관찰한다', result: '골렘의 공격 주기를 기록했다.', reward: { type: 'record', name: 'brokenGolem', value: 40 } },
  ] },
  { id: 'rg_offering_altar', region: 3, title: '공물 제단', text: '제단에 "피를 바치는 자에게 힘을"이라 새겨져 있다.', choices: [
    { text: '피를 바친다 (HP -40)', penalty: { hp: -40 }, result: '제단이 붉게 타오르며 힘이 흘러든다.', reward: { type: 'skill_specific', name: '강타' } },
    { text: '은화를 바친다 (80G)', cost: { gold: 80 }, result: '제단이 조용히 빛난다.', reward: { type: 'skill_specific', name: '신앙' } },
    { text: '지나친다', result: '봉인된 신전에서는 공짜가 없다.' },
  ] },
  { id: 'rg_seal_puzzle', region: 3, title: '봉인의 문', text: '거대한 문에 문양 네 개가 새겨져 있다. 순서대로 눌러야 열린다.', choices: [
    { text: '감으로 누른다', stat: '민첩', dc: 17, success: { text: '문이 열리고 고대 유물이 모습을 드러낸다.', reward: { type: 'random_relic' } }, fail: { text: '함정이 작동한다.', penalty: { hp: -35 } } },
    { text: '「전생의 기억」 — 문양의 순서를 떠올린다', requireMemory: 'mem_seal_glyph', result: '눈을 감아도 보이는 순서대로 눌렀다. 문 너머의 이야기가 퍼진다.', reward: { type: 'fame', value: 12 } },
  ] },
  { id: 'rg_archivist_task', region: 3, title: '기록관의 숙제', text: '오렌이 두꺼운 책을 내민다. "자네가 본 것들을 적어 주겠나."', choices: [
    { text: '지금까지의 싸움을 적는다', result: '오렌이 고개를 끄덕이며 빈 페이지를 채운다.', reward: { type: 'affinity', name: 'archivist', value: 25 } },
    { text: '대신 그의 기록을 읽는다', stat: '지능', dc: 14, success: { text: '옛 사제의 전투 방식이 적혀 있다.', reward: { type: 'record', name: 'ancientPriest', value: 50 } }, fail: { text: '읽을 수 없는 문자다.', result: '' } },
  ] },
  // ── 마계의 균열 ──
  { id: 'rg_black_market', region: 4, title: '균열의 암시장', text: '균열 가장자리에 천막이 늘어서 있다. 한 여자가 손짓한다. "구경은 공짜야."', choices: [
    { text: '이야기를 나눈다', result: '"니아라고 불러. 쓸 만한 손님이 될 것 같네."', reward: { type: 'affinity', name: 'broker', value: 30 } },
    { text: '물건을 산다 (120G)', cost: { gold: 120 }, result: '정체불명의 유물을 손에 넣었다.', reward: { type: 'random_relic' } },
  ] },
  { id: 'rg_demon_contract', region: 4, title: '마족의 계약', text: '마족 하나가 계약서를 내민다. "네 피 조금이면 큰 힘을 주지."', choices: [
    { text: '서명한다 (HP -50)', penalty: { hp: -50 }, result: '피가 끓어오른다.', reward: { type: 'skill_specific', name: '잔혹' } },
    { text: '계약서를 찢는다', result: '마족이 웃으며 덤벼든다!', reward: { type: 'combat', name: 'wrathDemon' } },
  ] },
  { id: 'rg_rift_storm', region: 4, title: '차원 폭풍', text: '하늘이 찢어지며 보라색 번개가 쏟아진다.', choices: [
    { text: '폭풍을 뚫고 나아간다', stat: '근력', dc: 16, success: { text: '폭풍 너머의 소문이 대륙에 퍼진다.', reward: { type: 'fame', value: 12 } }, fail: { text: '번개에 맞았다.', penalty: { hp: -45 } } },
    { text: '바위 뒤에 숨어 기다린다', result: '폭풍이 지나가자 균열에서 떨어진 은화가 흩어져 있다.', reward: { type: 'gold', value: 60 } },
  ] },
  { id: 'rg_apostle_sermon', region: 4, title: '사도의 설교', text: '마왕의 사도가 마족들 앞에서 설교하고 있다. 아무도 나를 눈치채지 못했다.', choices: [
    { text: '숨어서 지켜본다', stat: '민첩', dc: 15, success: { text: '사도의 의식을 처음부터 끝까지 봤다.', reward: { type: 'record', name: 'demonApostle', value: 50 } }, fail: { text: '사도의 눈이 이쪽을 향한다!', combat: 'demonApostle' } },
    { text: '조용히 빠져나간다', result: '균열에서는 살아남는 것이 먼저다.' },
  ] },
  { id: 'rg_broker_job', region: 4, title: '정보상의 의뢰', text: '니아가 지도를 펼친다. "정찰병 하나만 처리해 주면 값을 쳐 주지."', choices: [
    { text: '의뢰를 받는다', result: '마계 정찰병을 찾아냈다! (니아 호감 +25)', reward: { type: 'combat', name: 'demonScout', bonus: { type: 'affinity', name: 'broker', value: 25 } } },
    { text: '흥정한다', stat: '매력', dc: 15, success: { text: '"…좋아, 선불로 주지." 니아가 웃는다.', reward: { type: 'gold', value: 80 } }, fail: { text: '"손님, 균열에서 흥정은 목숨으로 하는 거야."', penalty: { gold: -30 } } },
  ] },
  { id: 'rg_rift_echo', region: 4, title: '균열의 메아리', text: '균열 속에서 수많은 목소리가 내 이름을 부른다.', choices: [
    { text: '목소리를 따라간다', stat: '매력', dc: 16, success: { text: '목소리들이 물러나며 힘을 남긴다.', reward: { type: 'skill_random_lv' } }, fail: { text: '목소리가 발톱이 되어 할퀸다.', penalty: { hp: -40 } } },
    { text: '「전생의 기억」 — 상흔이 길을 안다', requireMemory: 'mem_rift_scar', result: '몸이 기억하는 길로 균열을 빠져나오며 은화를 주웠다.', reward: { type: 'gold', value: 120 } },
  ] },
];

// 지역 사건 고르기 — 이번 생에 본 사건 제외, 기억 조각 요구 선택지는 미보유 시 숨김
export function rollRegressionEvent(run, memories = [], rng = Math.random) {
  const pool = REGRESSION_EVENTS.filter(e => e.region === run.region && !(run.seenEvents || []).includes(e.id));
  if (!pool.length) return null;
  const ev = pool[Math.floor(rng() * pool.length)];
  return { ...ev, choices: ev.choices.filter(c => !c.requireMemory || memories.includes(c.requireMemory)) };
}

// EventScreen 결과 반영 — 반환 { run, combat: enemyKey|null }. 사건은 1일 소모, 사건으로는 죽지 않음(HP 하한 1%)
export function applyRegressionEvent(run, eventId, res, { maxHp = 300, rng = Math.random } = {}) {
  let next = { ...run, day: run.day + 1, seenEvents: [...(run.seenEvents || []), eventId], affinity: { ...(run.affinity || {}) }, statBonus: { ...(run.statBonus || {}) } };
  const notes = [];
  let combatFromReward = null;
  let r = res?.reward;
  if (r?.type === 'combat') { combatFromReward = r.name; r = r.bonus || null; }
  if (r) {
    if (r.type === 'gold') { next.gold = (next.gold || 0) + r.value; notes.push(`+${r.value}G`); }
    else if (r.type === 'heal_pct') { next.hpPct = Math.min(1, next.hpPct + r.value / 100); notes.push(`HP +${r.value}%`); }
    else if (r.type === 'fame') { next.fame += r.value; notes.push(`명성 +${r.value}`); }
    else if (r.type === 'affinity') { next.affinity[r.name] = Math.min(100, (next.affinity[r.name] || 0) + r.value); notes.push(`${getRegressionCompanion(r.name)?.name} 호감 +${r.value}`); }
    else if (r.type === 'record') {
      if (!next.learned.includes(r.name)) { next.records = { ...next.records, [r.name]: Math.min(99, (next.records[r.name] || 0) + r.value) }; notes.push(`${ENEMIES[r.name]?.name} 기록 +${r.value}%`); }
    }
    else if (r.type === 'random_relic') { const l = rollRegressionLoot(next, 'elite', rng); if (l.relic) { next = applyRegressionLoot(next, { relic: l.relic }); notes.push(`유물 「${l.relic}」`); } else { next.gold = (next.gold || 0) + 80; notes.push('+80G'); } }
    else if (r.type === 'potion_random') { const id = REGRESSION_POTION_POOL[Math.floor(rng() * REGRESSION_POTION_POOL.length)]; next = applyRegressionLoot(next, { potion: id }); notes.push(POTIONS[id]?.name); }
    else if (r.type === 'skill_specific') { next = applyRegressionLoot(next, { passive: r.name }); notes.push(`「${r.name}」 +1Lv`); }
    else if (r.type === 'skill_random_lv') { const n = REGRESSION_PASSIVE_POOL[Math.floor(rng() * REGRESSION_PASSIVE_POOL.length)]; next = applyRegressionLoot(next, { passive: n }); notes.push(`「${n}」 +1Lv`); }
    else if (r.type === 'stat') { next.statBonus[r.name] = (next.statBonus[r.name] || 0) + r.value; notes.push(`${r.name} +${r.value}`); }
  }
  const p = res?.penalty;
  if (p?.hp) { next.hpPct = Math.max(0.01, next.hpPct + p.hp / maxHp); notes.push(`HP ${p.hp}`); }
  if (p?.gold) { next.gold = Math.max(0, (next.gold || 0) + p.gold); notes.push(`${p.gold}G`); }
  const ev = REGRESSION_EVENTS.find(e => e.id === eventId);
  next.log = [...next.log, `D${run.day}: 사건 「${ev?.title || eventId}」${notes.length ? ` (${notes.filter(Boolean).join(' · ')})` : ''}`];
  let combat = res?.combat || combatFromReward || null;
  if (combat && ENEMIES[combat]) next.pending = { enemyKey: combat, tier: ENEMIES[combat].tier === 'elite' ? 'elite' : 'normal', fromEvent: true };
  else combat = null;
  return { run: next, combat, notes };
}
