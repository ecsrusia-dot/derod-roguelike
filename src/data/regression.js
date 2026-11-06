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
export function buildRegressionSpireEnemy(round, memoryCount = 0) {
  const key = REGRESSION_SPIRE_CHAIN[round];
  if (!key) return null;
  const T = REGRESSION_TUNING;
  if (key === 'spireLord') {
    // 약점 = 받는 데미지 +N% → 본편 CombatScreen에는 받는 데미지 배율 필드가 없어 HP ÷ (1+N%)로 동등 환산
    const weak = memoryCount >= T.spireWeaknessMemories;
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
  const hpPct = Math.min(1, run.hpPct + REGRESSION_TUNING.restHealPct / 100);
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
  return sum * (1 + (run.recordBonusPct || 0) / 100);
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
    const fame = Math.round((T.fameGain[tier] || 0) * regionMult);
    next.fame += fame;
    next.kills[tier] = (next.kills[tier] || 0) + 1;
    next.hpPct = Math.min(1, Math.max(0.01, result.hpPct ?? next.hpPct)); // 1.178.0 상한 — 전투 화면 최대 HP(근력 보너스 포함)가 더 커서 100% 초과 누적되던 버그
    next = advanceDays(next, 1, `${name} 처치 (명성 +${fame})${learnedNow.length ? ' · 기록 완성' : ''}`);
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
  const healed = Math.min(1, Math.min(1, hpPct) + (run.spireRestPct || 0) / 100);
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
      endings: cause === 'victory' && !base.endings.includes('ending_spire') ? [...base.endings, 'ending_spire'] : base.endings,
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
  for (const [name, lv] of Object.entries(run.bonusSkills || {})) {
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

export function regressionBeltSlots(classId) {
  return Math.max(1, CLASS_BELT[classId]?.max ?? 2);
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
