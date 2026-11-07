// ============================================
// data/regression.js — 🌀 회귀의 탐험가 (MVP 1차: 데이터 + 순수 로직)
// ============================================
// 설계서: docs/regression-exploration-mode-design.md (PM 확정: 60일(1.186.0~, 이전 40일) · 본편 메타 강화 미적용)
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
  days: 60,                 // 한 생의 길이 (1.186.0 PM 결정: 40 → 60, 지역당 15일). 61일째 = 황혼의 첨탑
  fameGate: 140,            // 첨탑 입장 자격
  eliteFameGate: 30,        // 강적 출현 명성
  fameGain: { normal: 3, elite: 8 },    // 1.185.0 랜덤 하루 구조 — 2/5 → 3/8
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
  { id: 'mem_rift_scar', name: '균열의 상흔', desc: '균열 너머의 기연이 어디 숨어 있는지 몸이 기억한다.',
    hint: '마계의 균열에서 쓰러진다', effect: { fortuneBonus: 4 }, // 1.185.0~ 이동 폐지 → 기연이 더 자주
    trigger: (m, run, cause) => cause === 'death' && run.region === 4 },
  { id: 'mem_chronicler', name: '기록자의 각성', desc: '보는 것만으로 더 깊이 새긴다.',
    hint: '한 생에서 적 5종을 완전히 기록한다', effect: { recordBonusPct: 10 },
    trigger: (m, run) => run.learned.length >= 5 },
  { id: 'mem_nameless_hero', name: '이름 없는 영웅', desc: '사람들이 처음 보는 나를 어딘가 안다.',
    hint: '한 생에서 명성 85에 도달한다', effect: { startFame: 15 },
    trigger: (m, run) => run.fame >= 85 },
  { id: 'mem_spire_shadow', name: '첨탑의 그림자', desc: '첨탑의 계단 사이 숨 돌릴 틈을 안다.',
    hint: '황혼의 첨탑에서 패배한다', effect: { spireRestPct: 20 },
    trigger: (m, run, cause) => cause === 'spireLose' },
  { id: 'mem_lonely_loop', name: '고독한 회귀자', desc: '다섯 번의 죽음 끝에 더 많은 것을 쥐고 돌아온다.',
    hint: '다섯 번 회귀한다', effect: { carrySlots: 1 },
    trigger: (m) => (m.loops || 0) + 1 >= 5 },
  { id: 'mem_time_end', name: '시간의 끝', desc: '황혼이 오는 날을 정확히 안다 — 조금 더 일찍 움직인다.',
    hint: '명성 미달로 60일을 넘긴다', effect: { extraDays: 3 },
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
export function createRegressionRun(metaR = EMPTY_REGRESSION, classId, stats = null, skills = null) {
  const T = REGRESSION_TUNING;
  const fx = aggregateRegressionMemories(metaR.memories);
  const records = {};
  for (const k of (metaR.carry || []).slice(0, regressionCarrySlots(metaR))) {
    if (REGRESSION_RECORDS[k]) records[k] = T.carryRecordPct;
  }
  const run = {
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
    fortuneBonus: fx.fortuneBonus || 0,
    traits: { truth: 0, power: 0, bond: 0 },   // 1.186.0~ 메인 스토리 성향
    storyFlags: {},                              // 1.186.0~ 메인 스토리 플래그 (breakLoop 등)   // 1.185.0~ 기연 가중 +
    today: null,           // 1.185.0~ 오늘의 일 (랜덤 카드) — 새로고침해도 같은 카드
    memoryCount: (metaR.memories || []).length,
    spireRound: null,      // 첨탑 진입 후 0~3
    pending: null,         // 진행 중 전투 { enemyKey, tier } — 새로고침 복원용
    relics: [],            // 1.178.0~ 획득 유물 이름 (본편 RELICS)
    bonusSkills: {},       // 1.178.0~ 랜덤 획득 패시브 Lv
    potions: {},           // 1.178.0~ 포션 보유 { potionId: 개수 }
    loadout: null,         // 1.178.0~ 직전 출전 준비 { activeSkills, activeRelics, belt }
    affinity: {},          // 1.179.0~ 동료 호감 { companionId: 0~100 }
    stats: stats || regressionPresetStats(classId),   // 1.181.0~ 능력치 10종 (시작 커스텀)
    level: 0, exp: 0, statPoints: 0,                  // 1.181.0~ 레벨업 → 추가 능력치
    skills: skills || null,                           // 1.182.0~ 보유 스킬 id (null = 직업 프리셋)
    flames: 3,                                        // 1.182.0~ 생명의 불꽃 (강한 전투 태세 자원, 한 생 3개)
    fameBy: {},                                       // 1.181.0~ 판정 성공 능력치 집계 → 명성 경로
    seenEvents: [],        // 1.179.0~ 이번 생에 본 사건 id
    statBonus: {},         // 1.179.0~ 사건 능력치 보너스 { 근력: n } (1.184.0~ 실효 능력치에 반영)
    gear: { weapon: null, armor: null, accessory: null }, // 1.184.0~ 장착 장비 id
    bag: [],               // 1.184.0~ 보유 장비 id (장착분 포함)
    shop: null,            // 1.184.0~ 마을 상점 진열 { offers, resets } — 생성 직후 채움
    over: null,            // null | 'death' | 'timeout' | 'spireLose' | 'victory'
    log: [],
  };
  return { ...run, shop: buildRegressionShopStock(run) };
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
  const next = { ...run, day: run.day + n, today: null, log: logLine ? [...run.log, `D${run.day}: ${logLine}`] : run.log };
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

export function applyRegressionTravel(run, to, rng = Math.random) {
  const cost = regressionTravelCost(run, to);
  const name = to === REGRESSION_HUB ? '여명의 마을' : getRegressionRegion(to)?.name;
  const next = { ...advanceDays(run, cost, `${name}(으)로 이동 (${cost}일)`), region: to };
  return to === REGRESSION_HUB ? { ...next, shop: buildRegressionShopStock(next, rng) } : next;
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
    next = gainRegressionExp(next, REGRESSION_EXP[tier] || 0).run;
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
// 61일째(마지막 날 다음) 도달 시 호출. 자격 미달이면 timeout으로 종료
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
      endings: (() => { const e = regressionEndingFor(run); return e && !base.endings.includes(e.id) ? [...base.endings, e.id] : base.endings; })(),
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
  let maxHp = baseMaxHp + (run.maxHpBonus || 0) + regressionMaxHpBonusFromStats(regressionEffectiveStats(run));
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
export const REGRESSION_POTION_POOL = ['hp_small', 'hp_small', 'hp_medium', 'hp_medium', 'hp_large']; // 1.182.0 소울 물약 제외 (전용 전투에 소울 게이지 없음)

export function regressionRelicObjects(run) {
  return (run.relics || []).map(n => RELICS.find(r => r.name === n)).filter(Boolean);
}

export function regressionBeltSlots(classId, run = null) {
  const extra = run?.affinity ? aggregateRegressionCompanions(run).potionCap : 0;
  return Math.max(1, CLASS_BELT[classId]?.max ?? 2) + extra;
}

// 승리 보상 굴림 — rng 주입 (setMeta updater 밖에서 호출)
// 1.184.0~ PR D: 유물·패시브 드랍 폐지 → 장비(낮은 확률) + 회복약. 확률은 REGRESSION_ECON.drop
export function rollRegressionLoot(run, tier = 'normal', rng = Math.random) {
  const D = REGRESSION_ECON.drop[tier === 'elite' ? 'elite' : 'normal'];
  const loot = {};
  if (rng() < D.gear) loot.gear = rollRegressionGear(REGRESSION_ECON.gradeWeights[tier === 'elite' ? 'elite' : 'normal'], rng);
  if (rng() < D.potion) loot.potion = REGRESSION_POTION_POOL[Math.floor(rng() * REGRESSION_POTION_POOL.length)];
  if (!loot.gear) delete loot.gear;
  return loot;
}

export function applyRegressionLoot(run, loot = {}) {
  const next = { ...run, relics: [...(run.relics || [])], bonusSkills: { ...(run.bonusSkills || {}) }, potions: { ...(run.potions || {}) } };
  if (loot.relic && !next.relics.includes(loot.relic)) next.relics.push(loot.relic);
  if (loot.passive) next.bonusSkills[loot.passive] = (next.bonusSkills[loot.passive] || 0) + 1;
  if (loot.potion) next.potions[loot.potion] = (next.potions[loot.potion] || 0) + 1;
  if (loot.gear) return addRegressionGear(next, loot.gear);
  return next;
}

export function describeRegressionLoot(loot = {}) {
  const out = [];
  if (loot.gear) out.push(regressionGearLabel(loot.gear));
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
export const REGRESSION_ENDING_SPIRE = { id: 'ending_spire', name: '황혼을 끊은 자', branch: '정복', hint: '첨탑을 정복한다 (성향이 한쪽으로 기울지 않음)', text: '홀로 첨탑에 올라 황혼을 끊었다. 회귀의 고리가 멈추고, 처음으로 황혼 다음 날 아침이 밝았다.' };
// 1.186.0~ 메인 스토리 분기 엔딩 (PM 결정: 진실·힘·유대 3성향 누적, 동료 엔딩은 유대 갈래로 흡수)
export const REGRESSION_STORY_ENDINGS = [
  { id: 'ending_loop_end', name: '회귀의 끝', branch: '진실', hint: '진실을 끝까지 좇아 결전 전야에 고리를 끊을 방법을 찾고, 첨탑을 정복한다', text: '첨탑 꼭대기에서 황혼을 부른 자의 이름을 불렀다 — 그것은 첫 번째 생의 나였다. 고리를 끊자 기억이 하나씩 흩어진다. 이번에는 정말로, 다시 돌아오지 않는다.' },
  { id: 'ending_truth', name: '진실의 기록자', branch: '진실', hint: '진실 성향이 가장 높은 채로 첨탑을 정복한다', text: '황혼은 끊었지만, 그것이 왜 왔는지는 아무도 모른다 — 나 말고는. 나는 펜을 들었다. 다음에 올 회귀자가 같은 길을 걷지 않도록.' },
  { id: 'ending_heir', name: '황혼의 계승자', branch: '힘', hint: '힘 성향이 가장 높은 채로 첨탑을 정복한다', text: '첨탑의 주인이 쓰러지자 황혼이 내 안으로 흘러들었다. 하늘은 다시 맑아졌지만, 내 그림자는 해 질 녘처럼 붉다. 이제 황혼은 나다.' },
  { id: 'ending_spire_name', name: '첨탑에 남은 이름', branch: '패배', hint: '첨탑에서 쓰러진다', text: '마지막 계단 앞에서 무릎이 꺾였다. 첨탑 벽에 내 이름이 새겨진다 — 먼저 쓰러진 수많은 이름들 사이에.' },
  { id: 'ending_dusk', name: '황혼에 잠긴 대륙', branch: '패배', hint: '이름을 알리지 못한 채 마지막 날을 넘긴다', text: '이름 없는 자에게 첨탑은 문을 열지 않았다. 황혼이 대륙을 덮고, 나는 마을 언덕에서 그것을 끝까지 지켜보았다.' },
];
export const REGRESSION_ENDINGS = [REGRESSION_ENDING_SPIRE, ...REGRESSION_STORY_ENDINGS.slice(0, 3), ...REGRESSION_COMPANIONS.map(c => ({ ...c.ending, branch: '유대', hint: `유대 성향이 가장 높고 ${c.name}와 맹약을 맺은 채 첨탑을 정복한다` })), ...REGRESSION_STORY_ENDINGS.slice(3)];

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
    ...run, today: null, day: run.day + 1, affinity: { ...(run.affinity || {}), [companionId]: after },
    log: [...run.log, `D${run.day}: ${c.name}와 교류 (호감 ${after})${up}`],
  };
}

// 엔딩 — 1.186.0~ 첨탑 결과 × 가장 높은 성향(동점이면 기울지 않음) × 맹약 동료. 사망은 엔딩 없음(회귀)
export function regressionTopTrait(run) {
  const t = run?.traits || {};
  const ent = Object.keys(REGRESSION_TRAITS).map(k => [k, t[k] || 0]).sort((a, b) => b[1] - a[1]);
  return ent[0][1] > 0 && ent[0][1] > ent[1][1] ? ent[0][0] : null;
}
export function regressionEndingFor(run) {
  const byId = (id) => REGRESSION_ENDINGS.find(e => e.id === id);
  if (run.over === 'spireLose') return byId('ending_spire_name');
  if (run.over === 'timeout') return byId('ending_dusk');
  if (run.over !== 'victory') return null;
  const top = regressionTopTrait(run);
  if (top === 'truth' && run.storyFlags?.breakLoop) return byId('ending_loop_end');
  if (top === 'truth') return byId('ending_truth');
  if (top === 'power') return byId('ending_heir');
  if (top === 'bond') {
    const oaths = REGRESSION_COMPANIONS.filter(c => (run.affinity?.[c.id] || 0) >= 100)
      .sort((a, b) => (run.affinity?.[b.id] || 0) - (run.affinity?.[a.id] || 0));
    if (oaths.length) return { ...oaths[0].ending, branch: '유대' };
  }
  return REGRESSION_ENDING_SPIRE;
}

// =========== 상점 (여명의 마을) ===========
// 1.184.0~ PR D: 고정 상품(회복약·치료소) + 랜덤 진열(스킬·장비 4개, 리셋 1회). 진열은 마을에 도착할 때마다 새로 짜인다
export const REGRESSION_SHOP = [
  { id: 'hp_small', kind: 'potion', price: 70 },
  { id: 'hp_medium', kind: 'potion', price: 130 },
  { id: 'hp_large', kind: 'potion', price: 220 },
  { id: 'clinic', kind: 'heal', name: '마을 치료소', desc: 'HP 50% 회복', price: 100 },
];
export function buyRegressionShop(run, itemId) {
  const item = REGRESSION_SHOP.find(x => x.id === itemId);
  if (!item || (run.gold || 0) < item.price) return { run, bought: null };
  let next = { ...run, gold: run.gold - item.price };
  let bought = '';
  if (item.kind === 'potion') { next = applyRegressionLoot(next, { potion: item.id }); bought = POTIONS[item.id]?.name; }
  else if (item.kind === 'heal') { next.hpPct = Math.min(1, next.hpPct + 0.5); bought = 'HP 50% 회복'; }
  return { run: { ...next, log: [...next.log, `D${run.day}: 구매 — ${bought} (-${item.price}G)`] }, bought };
}

// 전투 승리 골드 (적 drop.gold 범위 × 동료 보너스)
export function regressionVictoryGold(run, enemyKey, rng = Math.random) {
  const g = ENEMIES[enemyKey]?.drop?.gold || [10, 20];
  const base = g[0] + Math.floor(rng() * (g[1] - g[0] + 1));
  const pct = aggregateRegressionCompanions(run).goldPct;
  return Math.max(1, Math.round(base * REGRESSION_ECON.goldMult * (1 + pct / 100)));
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
    { text: '숨어서 사냥 습성을 지켜본다', stat: '통찰', dc: 14, success: { text: '늑대가 송곳니를 드러내는 순간을 익혔다.', reward: { type: 'record', name: 'iceWolf', value: 40 } }, fail: { text: '들켰다. 늑대가 달려든다!', combat: 'iceWolf' } },
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
    { text: '귀를 기울인다', stat: '통찰', dc: 15, success: { text: '망자가 숲의 비밀 하나를 속삭인다.', reward: { type: 'skill_random_lv' } }, fail: { text: '목소리가 비명으로 바뀐다.', penalty: { hp: -30 } } },
    { text: '무덤을 정돈해 준다', result: '목소리가 잦아든다. 묘비 아래 은화가 놓여 있다.', reward: { type: 'gold', value: 50 } },
  ] },
  { id: 'rg_spider_nest', region: 2, title: '거미줄 회랑', text: '나무 사이가 온통 거미줄이다. 그 끝에서 무언가 반짝인다.', choices: [
    { text: '거미줄을 헤치고 간다', stat: '민첩', dc: 15, success: { text: '반짝이던 것은 유물이었다.', reward: { type: 'random_relic' } }, fail: { text: '줄에 걸렸다. 거미가 내려온다!', combat: 'corruptSpider' } },
    { text: '거미의 움직임만 관찰한다', result: '거미가 먹이를 감는 방식을 지켜봤다.', reward: { type: 'record', name: 'corruptSpider', value: 35 } },
  ] },
  { id: 'rg_lost_child', region: 2, title: '길 잃은 아이', text: '숲속에서 아이가 울고 있다. 망자의 숲에 살아 있는 아이가?', choices: [
    { text: '아이를 마을까지 데려다준다', result: '아이는 무사히 돌아갔다. 마을에 이름이 알려진다.', reward: { type: 'fame', value: 10 }, penalty: { hp: -10 } },
    { text: '경계한다', stat: '통찰', dc: 13, success: { text: '아이의 그림자가 없다. 망령이었다 — 물러나 화를 피했다.', reward: { type: 'gold', value: 40 } }, fail: { text: '아이가 웃으며 형체를 바꾼다!', combat: 'fallenElf' } },
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
    { text: '책을 몰래 읽는다', stat: '학식', dc: 15, success: { text: '고대 전투 기록에서 한 수를 배웠다.', reward: { type: 'skill_random_lv' } }, fail: { text: '봉인이 발동해 머리가 깨질 듯하다.', penalty: { hp: -30 } } },
  ] },
  { id: 'rg_time_echo', region: 3, title: '시간의 잔향', text: '복도 끝에서 나 자신이 걸어온다. 전생의 나였다.', choices: [
    { text: '그를 따라간다', result: '잔향이 숨겨진 방으로 안내한다.', reward: { type: 'random_relic' } },
    { text: '그와 마주 선다', stat: '신성', dc: 15, success: { text: '잔향이 말없이 고개를 끄덕이고 사라진다. 마음이 단단해진다.', reward: { type: 'heal_pct', value: 40 } }, fail: { text: '잔향이 검을 뽑는다!', combat: 'timeKeeper' } },
  ] },
  { id: 'rg_golem_repair', region: 3, title: '고장 난 골렘', text: '깨진 골렘이 같은 동작을 반복하고 있다. 핵이 드러나 있다.', choices: [
    { text: '핵을 고쳐 준다', stat: '학식', dc: 16, success: { text: '골렘이 멈추고 길을 비킨다. 그 뒤에 보물상자가.', reward: { type: 'gold', value: 130 } }, fail: { text: '핵이 폭주한다!', combat: 'brokenGolem' } },
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
    { text: '대신 그의 기록을 읽는다', stat: '학식', dc: 14, success: { text: '옛 사제의 전투 방식이 적혀 있다.', reward: { type: 'record', name: 'ancientPriest', value: 50 } }, fail: { text: '읽을 수 없는 문자다.', result: '' } },
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
    { text: '흥정한다', stat: '화술', dc: 15, success: { text: '"…좋아, 선불로 주지." 니아가 웃는다.', reward: { type: 'gold', value: 80 } }, fail: { text: '"손님, 균열에서 흥정은 목숨으로 하는 거야."', penalty: { gold: -30 } } },
  ] },
  { id: 'rg_rift_echo', region: 4, title: '균열의 메아리', text: '균열 속에서 수많은 목소리가 내 이름을 부른다.', choices: [
    { text: '목소리를 따라간다', stat: '신성', dc: 16, success: { text: '목소리들이 물러나며 힘을 남긴다.', reward: { type: 'skill_random_lv' } }, fail: { text: '목소리가 발톱이 되어 할퀸다.', penalty: { hp: -40 } } },
    { text: '「전생의 기억」 — 상흔이 길을 안다', requireMemory: 'mem_rift_scar', result: '몸이 기억하는 길로 균열을 빠져나오며 은화를 주웠다.', reward: { type: 'gold', value: 120 } },
  ] },
  // ── 1.183.0~ 기연 사건 6종 (fortune: 배울 수 있는 기연 스킬 — 빌드 가중·적성 판정) ──
  { id: 'rg_fortune_swordgrave', region: 1, fortune: 'saint_flash', title: '검객의 얼음 무덤', text: '얼음 속에 한 검객이 검을 내리친 자세 그대로 잠들어 있다.\n검끝이 가리키는 바위에 한 줄기 베인 자국이 남아 있다.', choices: [
    { text: '그 자국을 따라 검을 휘둘러 본다', stat: '검술', dc: 15, success: { text: '바람이 멎는다. 검객의 마지막 일격이 눈앞에 그려진다.', reward: { type: 'learn', name: 'saint_flash' } }, fail: { text: '검이 얼음에 박혀 손목이 꺾였다.', penalty: { hp: -25 } } },
    { text: '검객에게 묵념한다', result: '무덤가에 놓인 은화 몇 닢을 그대로 두고 떠났다. 마음이 가볍다.', reward: { type: 'fame', value: 3 } },
  ] },
  { id: 'rg_fortune_titan', region: 1, fortune: 'titan_body', title: '거인의 뼈', text: '눈밭에 집채만 한 갈비뼈가 솟아 있다. 뼈 사이로 뜨거운 김이 피어오른다.', choices: [
    { text: '김이 나는 골수 곁에서 버틴다', stat: '강인', dc: 15, success: { text: '살갗이 타는 듯하더니 몸 깊은 곳이 단단해진다.', reward: { type: 'learn', name: 'titan_body' } }, fail: { text: '열기를 견디지 못하고 쓰러졌다.', penalty: { hp: -30 } } },
    { text: '뼈 조각을 떼어 간다', result: '마을 대장장이가 좋은 값을 쳐 줄 것이다.', reward: { type: 'gold', value: 40 } },
  ] },
  { id: 'rg_fortune_archer_spirit', region: 2, fortune: 'sky_volley', title: '고대 궁수의 혼', text: '썩은 나무 꼭대기에 빛나는 궁수가 앉아 있다. "내 화살을 피해 보아라."', choices: [
    { text: '쏟아지는 화살 사이에서 맞받아 쏜다', stat: '사격', dc: 15, success: { text: '"…좋은 눈이다." 궁수가 하늘을 가리킨다. 화살비의 궤적이 보인다.', reward: { type: 'learn', name: 'sky_volley' } }, fail: { text: '화살 하나가 어깨를 꿰뚫었다.', penalty: { hp: -30 } } },
    { text: '나무 뒤로 몸을 숨긴다', result: '궁수가 웃음소리만 남기고 사라졌다.' },
  ] },
  { id: 'rg_fortune_dawn_chapel', region: 3, fortune: 'dawn_miracle', title: '여명의 예배당', text: '봉인된 신전 깊은 곳, 햇빛이 들지 않는데도 밝은 예배당이 있다.\n제단에 「한 번 꺼진 불도 다시 타오른다」라고 새겨져 있다.', choices: [
    { text: '제단 앞에 무릎 꿇고 기도한다', stat: '신성', dc: 15, success: { text: '빛이 가슴에 스며든다. 죽음의 문턱에서 돌아오는 길이 보인다.', reward: { type: 'learn', name: 'dawn_miracle' } }, fail: { text: '빛이 잦아든다. 아직 응답할 때가 아닌 모양이다.', reward: { type: 'heal_pct', value: 15 } } },
    { text: '촛대를 챙긴다', result: '은촛대 한 쌍. 신의 노여움은 없었다 — 아마도.', reward: { type: 'gold', value: 50 } },
  ] },
  { id: 'rg_fortune_sage_tome', region: 3, fortune: 'sage_eye', title: '현자의 마지막 책', text: '서고 맨 안쪽 책상 위에 펼쳐진 채 굳은 책이 있다.\n마지막 문장이 중간에서 끊겨 있다.', choices: [
    { text: '끊긴 문장을 이어 읽는다', stat: '학식', dc: 15, success: { text: '문장이 스스로 완성된다. 적의 일격이 오기 전에 그 끝이 보인다.', reward: { type: 'learn', name: 'sage_eye' } }, fail: { text: '글자가 눈을 찌르는 듯하다.', penalty: { hp: -25 } } },
    { text: '책을 덮어 둔다', result: '어떤 지식은 아직 이르다.' },
  ] },
  { id: 'rg_fortune_dragon_ash', region: 4, fortune: 'dragon_breath', title: '용의 재', text: '균열 바닥에 아직 식지 않은 검은 재가 쌓여 있다. 재 속에서 불씨가 숨을 쉰다.', choices: [
    { text: '불씨에 마력을 불어넣는다', stat: '마법', dc: 15, success: { text: '불씨가 손바닥 위에서 용의 형상으로 타오른다.', reward: { type: 'learn', name: 'dragon_breath' } }, fail: { text: '불씨가 폭발했다.', penalty: { hp: -40 } } },
    { text: '재를 모아 판다', result: '연금술사들이 탐내는 재다.', reward: { type: 'gold', value: 60 } },
  ] },
];

// 지역 사건 고르기 — 이번 생에 본 사건 제외, 기억 조각 요구 선택지는 미보유 시 숨김
export function rollRegressionEvent(run, memories = [], rng = Math.random, { fortune = null } = {}) {
  const pool = REGRESSION_EVENTS.filter(e => e.region === run.region && !(run.seenEvents || []).includes(e.id)
    && (fortune == null || !!e.fortune === fortune));
  if (!pool.length) return null;
  // 1.183.0~ 빌드 가중 — 내 능력치로 풀 수 있는 사건·내 빌드에 맞는 기연이 더 자주 (PM 요청 4: 육성 방향대로 랜덤)
  const stats = regressionEffectiveStats(run);
  const weights = pool.map(e => regressionEventWeight(e, stats));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  let ev = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll < 0) { ev = pool[i]; break; } }
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
    else if (r.type === 'random_relic') { const id = rollRegressionGear(REGRESSION_ECON.gradeWeights.event, rng); next = addRegressionGear(next, id); notes.push(regressionGearLabel(id)); }
    else if (r.type === 'potion_random') { const id = REGRESSION_POTION_POOL[Math.floor(rng() * REGRESSION_POTION_POOL.length)]; next = applyRegressionLoot(next, { potion: id }); notes.push(POTIONS[id]?.name); }
    else if (r.type === 'skill_specific') { const st = REGRESSION_PASSIVE_TO_STAT[r.name] || '강인'; next.statBonus[st] = (next.statBonus[st] || 0) + 1; notes.push(`${st} +1 (영구)`); }
    else if (r.type === 'skill_random_lv') { const g = gainRegressionExp(next, 25); next = g.run; notes.push('깨달음 — 경험치 +25'); if (g.levelUps > 0) notes.push(`레벨 상승 ${g.from}→${next.level}`, `추가 능력치 +${g.levelUps}`); }
    else if (r.type === 'stat') { next.statBonus[r.name] = (next.statBonus[r.name] || 0) + r.value; notes.push(`${r.name} +${r.value}`); }
    else if (r.type === 'learn') {
      // 1.183.0~ 기연 — 배울 기회만 연다. 실제 습득은 적성 판정 (resolveRegressionLearn)
      const owned = regressionRunSkills(next);
      if (owned.includes(r.name)) { const g = gainRegressionExp(next, REGRESSION_LEARN.knownExp); next = g.run; notes.push(`이미 아는 깨달음 — 경험치 +${REGRESSION_LEARN.knownExp}`); }
      else { next.pendingLearn = { skillId: r.name, source: 'fortune', from: eventId }; notes.push(`기연 — 「${__RSK[r.name]?.name}」`); }
    }
  }
  // 1.181.0~ 판정 성공 = 경험치 + 명성 + 명성 경로 (원작: 주사위 성공으로 이름이 알려진다)
  if (res?.check === 'ok' && res.stat) {
    // 1.183.0~ 어려운 판정일수록 경험치 ↑ (DC 15부터 +3씩) + 낮은 확률로 덤 (회복약)
    const exp = regressionCheckExp(res.dc);
    const g = gainRegressionExp(next, exp);
    next = g.run;
    next.fame += REGRESSION_DAY.checkFame;
    next.fameBy = { ...(next.fameBy || {}), [res.stat]: ((next.fameBy || {})[res.stat] || 0) + 1 };
    notes.push(`경험치 +${exp}`, `명성 +${REGRESSION_DAY.checkFame}`);
    if (rng() < REGRESSION_LEARN.checkPotionChance) {
      const id = REGRESSION_POTION_POOL[Math.floor(rng() * REGRESSION_POTION_POOL.length)];
      next = applyRegressionLoot(next, { potion: id });
      notes.push(`덤 — ${POTIONS[id]?.name}`);
    }
    if (g.levelUps > 0) notes.push(`레벨 상승 ${g.from}→${next.level}`, `추가 능력치 +${g.levelUps}`);
  } else if (!res?.check) {
    const g = gainRegressionExp(next, REGRESSION_EXP.event);
    next = g.run;
    notes.push(`경험치 +${REGRESSION_EXP.event}`);
    if (g.levelUps > 0) notes.push(`레벨 상승 ${g.from}→${next.level}`, `추가 능력치 +${g.levelUps}`);
  }
  const p = res?.penalty;
  if (p?.hp) { next.hpPct = Math.max(0.01, next.hpPct + p.hp / maxHp); notes.push(`HP ${p.hp}`); }
  if (p?.gold) { next.gold = Math.max(0, (next.gold || 0) + p.gold); notes.push(`${p.gold}G`); }
  if (res?.trait) {
    next.traits = { ...(next.traits || {}) };
    for (const [k, v] of Object.entries(res.trait)) { next.traits[k] = (next.traits[k] || 0) + v; notes.push(`${REGRESSION_TRAITS[k]?.name} +${v}`); }
  }
  if (res?.flag) next.storyFlags = { ...(next.storyFlags || {}), [res.flag]: true };
  const ev = regressionEventById(eventId);
  next.log = [...next.log, `D${run.day}: 사건 「${ev?.title || eventId}」${notes.length ? ` (${notes.filter(Boolean).join(' · ')})` : ''}`];
  let combat = res?.combat || combatFromReward || null;
  if (combat && ENEMIES[combat]) next.pending = { enemyKey: combat, tier: ENEMIES[combat].tier === 'elite' ? 'elite' : 'normal', fromEvent: true };
  else combat = null;
  return { run: next, combat, notes };
}

// ============================================
// 1.180.0~ 이야기 화면 (PM 결정: 「무림귀환」 스크린샷 스타일 전면 개편)
// ============================================
// 서술 → 선택(성공 가능성 라벨) → 결과(보상 태그) → 「다음」 흐름. 전투는 이야기 안에서 시작·결과 서술.

// 상단 목표 바 — 명성 단계 (n/4)
export const REGRESSION_FAME_STAGES = [
  { min: 0, name: '아무도 이름을 모른다' },
  { min: 35, name: '소문이 도는 중' },      // 1.186.0~ 첨탑 자격 140 기준 (35 단위)
  { min: 70, name: '이름이 알려지는 중' },
  { min: 105, name: '별호가 붙는 중' },
  { min: 140, name: '첨탑의 문이 열렸다' },
];
export function regressionFameStage(fame = 0) {
  let idx = 0;
  REGRESSION_FAME_STAGES.forEach((s, i) => { if (fame >= s.min) idx = i; });
  return { ...REGRESSION_FAME_STAGES[idx], step: idx, total: REGRESSION_FAME_STAGES.length - 1 };
}

// 적 등급 표기 — [하급] 얼음 늑대
export const REGRESSION_ENEMY_GRADES = { normal: '하급', elite: '상급', boss: '군주' };
export function regressionEnemyLabel(enemyKey, tierOverride = null) {
  const e = ENEMIES[enemyKey] || (enemyKey === 'spireLord' ? REGRESSION_SPIRE_LORD : null);
  const tier = tierOverride || e?.tier || 'normal';
  return `[${REGRESSION_ENEMY_GRADES[tier] || '하급'}] ${e?.name || enemyKey}`;
}

// 지역 서술 — 날짜마다 다른 문장
export const REGRESSION_NARRATION = {
  village: [
    '여명의 마을. 굴뚝에서 피어오르는 연기 너머로, 지평선 끝이 붉게 물들어 있다.',
    '마을 사람들은 황혼 이야기를 애써 입에 올리지 않는다. 그래도 모두 서쪽 하늘을 흘끔거린다.',
    '광장의 게시판에 새 의뢰서가 붙었다. 대부분은 돌아오지 못한 사람을 찾는 내용이다.',
  ],
  1: [
    '눈보라가 시야를 가린다. 발밑의 얼음이 낮게 우는 소리를 낸다.',
    '얼어붙은 원정대의 깃발이 바람에 찢겨 나부낀다. 이곳에서 길을 잃은 자가 많다.',
    '숨을 쉴 때마다 폐가 얼어붙는 것 같다. 멀리서 늑대 울음이 들린다.',
    '얼음 아래로 무언가 지나가는 그림자가 보였다. 기분 탓이길 바란다.',
  ],
  2: [
    '죽은 자의 숲. 나무들이 숨을 죽인 채 이쪽을 지켜보는 듯하다.',
    '부패한 안개가 발목까지 차오른다. 달콤하고 역한 냄새가 코를 찌른다.',
    '이끼 덮인 묘비들 사이로 희미한 불빛이 떠다닌다.',
    '어딘가에서 누군가 이름을 부른다. 돌아보면 아무도 없다.',
  ],
  3: [
    '봉인된 신전의 회랑. 발소리가 몇 박자 늦게 되돌아온다.',
    '벽의 문양이 맥박처럼 깜빡인다. 시간이 이곳에서만 느리게 흐르는 것 같다.',
    '부서진 골렘의 파편이 바닥에 흩어져 있다. 그중 하나가 아직 움직인다.',
    '천장에서 모래가 흘러내린다. 오래된 봉인이 조금씩 무너지고 있다.',
  ],
  4: [
    '마계의 균열. 하늘이 찢어진 자리에서 핏빛 빛이 새어 나온다.',
    '공기가 무겁다. 숨을 들이쉴 때마다 쇠 맛이 난다.',
    '균열 너머에서 거대한 무언가가 이쪽을 내려다보고 있다.',
    '부러진 검과 갑옷이 산처럼 쌓여 있다. 먼저 온 자들의 흔적이다.',
  ],
};
export function regressionNarration(run) {
  const lines = REGRESSION_NARRATION[run.region] || REGRESSION_NARRATION.village;
  return lines[(run.day + (run.region === REGRESSION_HUB ? 0 : run.region)) % lines.length];
}

// 동료 대화 — 호감 단계별
export const REGRESSION_COMPANION_LINES = {
  knight: ['"검을 쥔 손이 떨리는군. 추위 때문인가, 두려움 때문인가."', '"기사단은 사라졌지만, 지킬 것이 생긴다면 다시 검을 들겠다."', '"네 등은 내가 지킨다. 그게 기사의 맹세다."'],
  healer: ['"상처는 보여 줘요. 숨기면 더 깊어져요."', '"당신이 돌아올 때마다 조금씩 덜 다쳐 오네요. 다행이에요."', '"이번엔 끝까지 함께 갈게요. 아무도 혼자 죽게 두지 않아요."'],
  archivist: ['"회귀자라… 기록에 남은 건 대부분 실패담일세."', '"자네의 기록이 늘어갈수록, 첨탑의 문장이 읽히기 시작하는군."', '"마지막 장은 자네와 함께 쓰겠네. 그게 기록관의 일이지."'],
  broker: ['"정보는 공짜가 아니야. 근데 넌 갚을 줄 아는 얼굴이네."', '"요즘 균열 쪽 시세가 네 덕에 올랐어. 고마운 손님이지."', '"좋아, 이번 판은 너한테 다 걸지. 지면 같이 죽는 거야."'],
};
export function regressionCompanionLine(companionId, affinity = 0) {
  const lines = REGRESSION_COMPANION_LINES[companionId] || [''];
  const idx = affinity >= 100 ? 2 : affinity >= 40 ? 1 : 0;
  return lines[Math.min(idx, lines.length - 1)];
}

// 판정 성공 확률 — 1.181.0~ 능력치 10종(0~10) 체계: 능력치 × 2 + 주사위(1~6) ≥ (DC − 9)
// 사건 데이터의 DC(13~17)는 그대로 두고 여기서 환산 → 능력치 0이면 대부분 운, 3이면 유리, 5면 거의 확실
export const REGRESSION_DC_OFFSET = 9;
export function regressionCheckChance(statValue = 0, dc = 10, diceMin = 1, diceMax = 6) {
  let ok = 0; const n = diceMax - diceMin + 1;
  for (let d = diceMin; d <= diceMax; d++) if (statValue * 2 + d >= dc - REGRESSION_DC_OFFSET) ok++;
  return ok / n;
}
// 성공 가능성 라벨 — 원작 표기(유리함/보통/불리함)에 맞춤
export function regressionChanceLabel(p) {
  if (p >= 1) return { text: '확실', color: '#9ad4a3' };
  if (p >= 0.8) return { text: '유리함', color: '#9ad4a3' };
  if (p >= 0.5) return { text: '보통', color: '#d4a574' };
  if (p >= 0.2) return { text: '불리함', color: '#e08a5c' };
  if (p > 0) return { text: '도전적', color: '#c4453d' };
  return { text: '불가능', color: '#9b8975' };
}

// 사건 선택지 판정 — EventScreen 없이 이야기 화면에서 직접. 반환 형식은 applyRegressionEvent 입력과 같다
export function resolveRegressionChoice(choice, stats = {}, rng = Math.random) {
  const res = { text: '', reward: null, penalty: null, combat: null, check: null };
  if (choice.stat) {
    const sv = stats[choice.stat] || 0;
    const dice = 1 + Math.floor(rng() * 6);
    const ok = sv * 2 + dice >= choice.dc - REGRESSION_DC_OFFSET;
    const br = ok ? choice.success : choice.fail;
    res.text = br?.text || '';
    res.reward = br?.reward || null;
    res.penalty = br?.penalty || null;
    res.combat = br?.combat || null;
    res.check = ok ? 'ok' : 'fail';
    res.stat = choice.stat;
    res.dc = choice.dc;
  } else {
    res.text = choice.result || '';
    res.reward = choice.reward || null;
    res.penalty = choice.penalty ? { ...choice.penalty } : null;
  }
  if (choice.cost?.gold) res.penalty = { ...(res.penalty || {}), gold: (res.penalty?.gold || 0) - choice.cost.gold };
  // 1.186.0~ 메인 스토리 — 성향 점수 (선택 기본 + 판정 성공 시 가산) · 플래그
  if (choice.trait) {
    const br = res.check === 'ok' ? choice.success : res.check === 'fail' ? choice.fail : null;
    res.trait = { [choice.trait]: (choice.traitValue || 1) + (br?.traitBonus || 0) };
  }
  if (choice.flag) res.flag = choice.flag;
  return res;
}

// 결과 장면 (run.scene) — { title, text, tags: [{ text, tone }] }. 「다음」을 누르면 비운다
export function regressionResultScene(title, text, tags = []) {
  return { kind: 'result', title, text, tags: tags.filter(t => t && t.text) };
}
// 노트 문자열 → 보상 태그 (명성·골드·호감 등은 좋은 색, HP 감소는 붉은색)
export function regressionNotesToTags(notes = []) {
  return notes.filter(Boolean).map(n => ({ text: n, tone: /^HP -|-\d+G|^-/.test(n) ? 'bad' : 'good' }));
}

// ============================================
// 1.181.0~ 2.0 PR A — 능력치 10종 · 시작 커스텀 · 레벨업 (docs/regression-v2-design.md 2.1·2.2)
// ============================================
export const REGRESSION_STATS = [
  { id: '근력', group: '신체', desc: '물리 피해 · 힘쓰기·파괴 판정' },
  { id: '민첩', group: '신체', desc: '회피·선공 · 추격·도주·잠입 판정' },
  { id: '강인', group: '신체', desc: 'HP·피해 감소 · 버티기·독·추위 판정' },
  { id: '검술', group: '전투술', desc: '근접 무기 스킬 위력 · 결투 판정' },
  { id: '사격', group: '전투술', desc: '활·투척 스킬 위력 · 견제·사냥 판정' },
  { id: '마법', group: '전투술', desc: '주문 스킬 위력 · 결계·마법 장치 판정' },
  { id: '신성', group: '전투술', desc: '회복·축복 위력 · 정화·망령 판정' },
  { id: '통찰', group: '비전투', desc: '약점 간파 · 함정·거짓·기척 판정' },
  { id: '화술', group: '비전투', desc: '설득·흥정·위협 판정' },
  { id: '학식', group: '비전투', desc: '고대 문자·지름길·기연 해석 판정' },
];
export const REGRESSION_STAT_IDS = REGRESSION_STATS.map(s => s.id);
export const REGRESSION_START_POINTS = 12;
export const REGRESSION_START_CAP = 5;
export const REGRESSION_STAT_MAX = 10;

// 직업 = 초상화 + 프리셋 (PM 확정). 합계 12
export const REGRESSION_PRESETS = {
  wanderer:   { 검술: 4, 민첩: 3, 근력: 2, 통찰: 2, 강인: 1 },
  sage:       { 마법: 5, 학식: 4, 통찰: 2, 민첩: 1 },
  demonblood: { 근력: 5, 강인: 4, 검술: 2, 화술: 1 },
  elf:        { 사격: 5, 민첩: 4, 통찰: 2, 학식: 1 },
  priest:     { 신성: 5, 강인: 3, 화술: 2, 학식: 2 },
};
export function emptyRegressionStats() {
  return Object.fromEntries(REGRESSION_STAT_IDS.map(k => [k, 0]));
}
export function regressionPresetStats(classId) {
  return { ...emptyRegressionStats(), ...(REGRESSION_PRESETS[classId] || {}) };
}
export function regressionRandomStats(rng = Math.random) {
  const st = emptyRegressionStats();
  let left = REGRESSION_START_POINTS;
  while (left > 0) {
    const k = REGRESSION_STAT_IDS[Math.floor(rng() * REGRESSION_STAT_IDS.length)];
    if (st[k] < REGRESSION_START_CAP) { st[k] += 1; left -= 1; }
  }
  return st;
}
export function regressionStatsSpent(stats) {
  return REGRESSION_STAT_IDS.reduce((a, k) => a + (stats?.[k] || 0), 0);
}
// 구세이브(1.180.0 이전 생)는 stats가 없음 → 직업 프리셋으로 보정
export function regressionRunStats(run) {
  return { ...emptyRegressionStats(), ...(run?.stats || regressionPresetStats(run?.classId)) };
}

// 경험치·레벨 — 판정 성공·전투로 획득. 레벨마다 추가 능력치 +1
export const REGRESSION_EXP = { check: 20, normal: 30, elite: 60, event: 8 };  // 1.185.0 랜덤 하루 구조로 상향
export function regressionExpToNext(level = 0) { return 30 + level * 15; }
export function gainRegressionExp(run, amount = 0) {
  let next = { ...run, exp: (run.exp || 0) + amount, level: run.level || 0, statPoints: run.statPoints || 0 };
  const before = next.level;
  while (next.exp >= regressionExpToNext(next.level)) {
    next.exp -= regressionExpToNext(next.level);
    next.level += 1;
    next.statPoints += 1;
  }
  return { run: next, levelUps: next.level - before, from: before };
}
export function spendRegressionStatPoint(run, statId) {
  const st = regressionRunStats(run);
  if (!(run.statPoints > 0) || !REGRESSION_STAT_IDS.includes(statId) || st[statId] >= REGRESSION_STAT_MAX) return run;
  return { ...run, stats: { ...st, [statId]: st[statId] + 1 }, statPoints: run.statPoints - 1 };
}

// 명성 경로 — 판정에 가장 많이 성공한 능력치 (원작 「검술로 알려지는 중」)
export function regressionFamePath(run) {
  const entries = Object.entries(run?.fameBy || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : null;
}

// PR B(전용 전투) 전까지 본편 CombatScreen에 넘기는 환산 능력치 — 커스텀이 전투에도 바로 반영되도록
export function regressionLegacyCombatStats(stats) {
  const s = { ...emptyRegressionStats(), ...stats };
  return {
    근력: 10 + Math.max(s.근력, s.검술) * 2,
    민첩: 10 + Math.max(s.민첩, s.사격) * 2,
    지능: 10 + Math.max(s.마법, s.학식) * 2,
    매력: 10 + Math.max(s.신성, s.화술) * 2,
  };
}
export function regressionMaxHpBonusFromStats(stats) {
  return (stats?.강인 || 0) * __RCB.hpPerVit;
}

// 1.182.0~ 보유 스킬 (시작 커스텀 3개 + 습득). 구세이브는 직업 프리셋
import { REGRESSION_SKILL_PRESETS as __RSP, REGRESSION_FLAMES_PER_LIFE as __RFL, REGRESSION_SKILLS as __RSK, regressionSkillStats as __rss, REGRESSION_COMBAT as __RCB } from './regressionCombat.js';
export function regressionRunSkills(run) {
  return Array.isArray(run?.skills) && run.skills.length ? run.skills : (__RSP[run?.classId] || []);
}
export function regressionRunFlames(run) { return run?.flames ?? __RFL; }


// ============================================
// 1.183.0~ 2.0 PR C — 스킬 습득 개연성 (docs/regression-v2-design.md 2.4)
// ============================================
// 습득 성공률 = 등급 기본률 × (하한 + (1−하한) × 적성²) + 학식 보정.
// 적성 = 스킬 관련 능력치 평균 ÷ 내 최고 능력치 — 검술·근력 빌드가 마법 기연을 만나면 적성 0 → 약 3%.
// 밸런스는 REGRESSION_LEARN 한 곳.
export const REGRESSION_LEARN = {
  base: { normal: 0.85, advanced: 0.7, fortune: 0.55 },
  floor: 0.05,              // 적성 0일 때 기본률에 곱해지는 하한
  lorePerPoint: 0.01,       // 학식 1당 +1%p (배우는 머리)
  min: 0.02, max: 0.95,
  offer: { normal: 0.12, elite: 0.6, boss: 1 },  // 승리 후 배울 기회가 열릴 확률
  offFocusWeight: 0.15,     // 기회가 열릴 때 빌드와 무관한 스킬이 뽑힐 기본 가중 (개연성 드라마)
  learnExp: 10,             // 습득 성공 경험치
  knownExp: 20,             // 이미 아는 기연을 다시 만나면
  checkPotionChance: 0.1,   // 판정 성공 덤 (회복약)
};
const LEARN_SOURCE_TIER = { normal: 'normal', elite: 'advanced', boss: 'fortune', fortune: 'fortune' };

export function regressionCheckExp(dc = 14) {
  return REGRESSION_EXP.check + Math.max(0, (dc || 14) - 14) * 3;
}
export function regressionSkillAptitude(skillId, stats = {}) {
  return regressionAptitude(__rss(skillId), stats);
}
// 관련 능력치 목록 기준 적성 (스킬·유니크 장비 공용)
export function regressionAptitude(rel = [], stats = {}) {
  if (!rel.length) return 0;
  const top = Math.max(1, ...REGRESSION_STAT_IDS.map(k => stats[k] || 0));
  const avg = rel.reduce((a, k) => a + (stats[k] || 0), 0) / rel.length;
  return Math.max(0, Math.min(1, avg / top));
}
export function regressionLearnChance(skillId, stats = {}) {
  const L = REGRESSION_LEARN;
  const sk = __RSK[skillId]; if (!sk) return 0;
  const apt = regressionSkillAptitude(skillId, stats);
  const p = (L.base[sk.tier] || 0.5) * (L.floor + (1 - L.floor) * apt * apt) + (stats.학식 || 0) * L.lorePerPoint;
  return Math.max(L.min, Math.min(L.max, p));
}
// 사건 가중 — 판정 능력치가 높을수록, 기연은 적성이 맞을수록 자주
export function regressionEventWeight(ev, stats = {}) {
  if (ev.fortune) return 0.3 + 2 * regressionSkillAptitude(ev.fortune, stats);
  const checks = ev.choices.filter(c => c.stat);
  return 1 + checks.reduce((a, c) => a + (stats[c.stat] || 0) / 5, 0) / Math.max(1, checks.length);
}
// 배울 기회 — 승리 직후 호출. 반환 pendingLearn | null
export function offerRegressionLearn(run, source = 'normal', enemyKey = null, rng = Math.random) {
  const L = REGRESSION_LEARN;
  const owned = regressionRunSkills(run);
  if (rng() >= (L.offer[source] ?? 0)) return null;
  const tier = LEARN_SOURCE_TIER[source];
  const stats = regressionEffectiveStats(run);
  const cands = Object.keys(__RSK).filter(k => __RSK[k].tier === tier && !owned.includes(k));
  if (!cands.length) return null;
  const w = cands.map(k => L.offFocusWeight + regressionSkillAptitude(k, stats));
  let roll = rng() * w.reduce((a, b) => a + b, 0);
  let pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { roll -= w[i]; if (roll < 0) { pick = cands[i]; break; } }
  return { skillId: pick, source, from: enemyKey };
}
const LEARN_FAIL_TEXT = {
  근력: '자세를 흉내 내 보지만 힘이 실리지 않는다. 몸이 이 기술을 받아들이지 못한다.',
  민첩: '발이 꼬였다. 이 움직임은 아직 내 것이 아니다.',
  강인: '몸이 버티지 못하고 무너진다. 이 기술은 단련된 육체를 요구한다.',
  검술: '검의 궤적을 따라가 보지만 손목이 따라가지 못한다.',
  사격: '시위를 당기는 손이 떨려 화살이 엉뚱한 곳에 꽂힌다.',
  마법: '주문이 머릿속에 들어오지 않는다. 글자가 눈앞에서 흩어진다.',
  신성: '기도문을 외워도 아무런 빛이 내려오지 않는다.',
  통찰: '무엇을 봐야 하는지조차 보이지 않는다.',
  화술: '목소리에 힘이 실리지 않는다. 아무도 움츠러들지 않는다.',
  학식: '문장의 뜻을 끝내 헤아리지 못했다.',
};
export const REGRESSION_LEARN_SOURCE = {
  normal: { title: '엿본 기술', intro: (en, sk) => `${en}의 움직임에서 「${sk}」의 요령을 엿봤다. 몸에 익힐 수 있을까?` },
  elite: { title: '강적의 비급', intro: (en, sk) => `쓰러진 ${en}의 품에서 낡은 비급서가 나왔다. 표지에 「${sk}」이라 적혀 있다.` },
  boss: { title: '기연 — 군주의 잔향', intro: (en, sk) => `무너지는 ${en}의 힘이 흩어지며 한 줄기 깨달음이 스친다. 「${sk}」.` },
  fortune: { title: '기연', intro: (_en, sk) => `눈앞에 「${sk}」의 깨달음이 손에 잡힐 듯 걸려 있다.` },
};
export function regressionLearnIntro(pl) {
  const src = REGRESSION_LEARN_SOURCE[pl?.source] || REGRESSION_LEARN_SOURCE.fortune;
  const en = (pl?.from && ENEMIES[pl.from]?.name) || '적';
  return { title: src.title, text: src.intro(en, __RSK[pl?.skillId]?.name || '?') };
}
// 습득 시도 / 포기 — 날짜 소모 없음. 반환 { run, scene }
export function resolveRegressionLearn(run, accept, rng = Math.random) {
  const pl = run.pendingLearn;
  const base = { ...run, pendingLearn: null };
  const sk = pl && __RSK[pl.skillId];
  if (!sk) return { run: base, scene: null };
  if (!accept) return { run: base, scene: regressionResultScene(sk.name, '욕심을 접었다. 지금의 길을 끝까지 걷기로 한다.', []) };
  const stats = regressionEffectiveStats(run);
  const p = regressionLearnChance(pl.skillId, stats);
  const owned = regressionRunSkills(run);
  if (rng() < p) {
    let next = { ...base, skills: [...owned, pl.skillId] };
    const g = gainRegressionExp(next, REGRESSION_LEARN.learnExp);
    next = g.run;
    next.log = [...(next.log || []), `D${run.day}: 「${sk.name}」 습득`];
    const tags = [{ text: `「${sk.name}」 습득!`, tone: 'gold' }, { text: `경험치 +${REGRESSION_LEARN.learnExp}`, tone: 'good' }];
    if (g.levelUps > 0) tags.push({ text: `레벨 상승 ${g.from}→${next.level}`, tone: 'gold' }, { text: `추가 능력치 +${g.levelUps}`, tone: 'gold' });
    return { run: next, scene: regressionResultScene(`${sk.name} - 성공!`, '몸 깊은 곳에 새 기술이 새겨졌다. 이제 싸움 속에서 저절로 나올 것이다.', tags) };
  }
  const apt = regressionSkillAptitude(pl.skillId, stats);
  const rel = __rss(pl.skillId);
  const weakest = rel.slice().sort((a, b) => (stats[a] || 0) - (stats[b] || 0))[0];
  const text = apt < 0.5 ? (LEARN_FAIL_TEXT[weakest] || LEARN_FAIL_TEXT.학식) : '거의 손에 잡힐 듯했지만, 끝내 깨달음은 오지 않았다.';
  const next = { ...base, log: [...(base.log || []), `D${run.day}: 「${sk.name}」 습득 실패`] };
  return { run: next, scene: regressionResultScene(`${sk.name} - 실패!`, text, [{ text: `${rel.join('·')} 적성 ${Math.round(apt * 100)}%`, tone: 'bad' }]) };
}


// ============================================
// 1.184.0~ 2.0 PR D — 장비 3칸 · 유니크 적성 판정 · 상점 랜덤 진열 · 경제 (docs/regression-v2-design.md 2.5·2.6)
// ============================================
// 밸런스는 REGRESSION_ECON 한 곳. 장비 = 능력치 보너스(원작 「귀면갑: 힘 +1, 외공 +2」 방식, 이름은 오리지널).
// 실효 능력치(regressionEffectiveStats) = 기본 + 사건 보너스 + 장비 → 전투·판정·적성 모두 이것을 쓴다.
// 능력치 배분(spendRegressionStatPoint)은 기본 능력치만 — 장비 수치가 기본에 굳지 않도록.
export const REGRESSION_ECON = {
  goldMult: 0.5,             // 전투 승리 은화 배율 (1.183.0 대비 절반)
  drop: {
    normal: { gear: 0.08, potion: 0.15 },
    elite: { gear: 0.35, potion: 0.25, unique: 0.08 },  // unique = 유니크를 다뤄 볼 기회 (적성 판정)
  },
  gradeWeights: {
    normal: { normal: 85, advanced: 15 },
    elite: { normal: 30, advanced: 55, treasure: 15 },
    event: { advanced: 70, treasure: 30 },
    shop: { normal: 50, advanced: 40, treasure: 10 },
  },
  shopOffers: 4,             // 랜덤 진열 수 (스킬·장비)
  shopResets: 1,             // 진열 바꾸기 횟수 (마을 방문마다)
  shopSkillShare: 0.4,       // 진열 중 스킬 비율
  prices: {
    skill: { normal: 140, advanced: 320 },
    gear: { normal: 80, advanced: 180, treasure: 380 },
  },
  offBuildPriceMult: 1.5,    // 스킬 교습비 — 적성 0이면 ×2.5 (빌드와 먼 기술은 가르치기도 비싸다)
  uniqueBase: 0.6,           // 유니크 다루기 기본률 (스킬 적성 공식과 같은 하한·학식 보정)
};
export const REGRESSION_GEAR_SLOTS = [
  { id: 'weapon', name: '무기' },
  { id: 'armor', name: '방어구' },
  { id: 'accessory', name: '장신구' },
];
export const REGRESSION_GEAR_GRADES = {
  normal: { name: '일반', color: '#c9b8a4' },
  advanced: { name: '고급', color: '#7ba3c4' },
  treasure: { name: '보물', color: '#b58ad6' },
  unique: { name: '유니크', color: '#e8b04a' },
};
// fx: 전투 보정 (relicBonus 어휘 — dmgDealt/critRate/dodge/lifesteal/dmgTaken). rel: 유니크를 다루는 데 필요한 능력치
export const REGRESSION_GEAR = {
  // ── 무기 ──
  rusty_sword:     { slot: 'weapon', grade: 'normal', name: '녹슨 장검', stats: { 검술: 1 } },
  hunting_bow:     { slot: 'weapon', grade: 'normal', name: '사냥꾼의 활', stats: { 사격: 1 } },
  oak_staff:       { slot: 'weapon', grade: 'normal', name: '참나무 지팡이', stats: { 마법: 1 } },
  iron_mace:       { slot: 'weapon', grade: 'normal', name: '쇠 철퇴', stats: { 근력: 1 } },
  prayer_censer:   { slot: 'weapon', grade: 'normal', name: '기도 향로', stats: { 신성: 1 } },
  knight_blade:    { slot: 'weapon', grade: 'advanced', name: '기사의 장검', stats: { 검술: 1, 근력: 1 } },
  elm_longbow:     { slot: 'weapon', grade: 'advanced', name: '느릅나무 장궁', stats: { 사격: 1, 민첩: 1 } },
  rune_staff:      { slot: 'weapon', grade: 'advanced', name: '룬 지팡이', stats: { 마법: 1, 학식: 1 } },
  blessed_hammer:  { slot: 'weapon', grade: 'advanced', name: '축복받은 망치', stats: { 신성: 1, 근력: 1 } },
  moonsteel_saber: { slot: 'weapon', grade: 'treasure', name: '월철 곡도', stats: { 검술: 2, 민첩: 1, 통찰: 1 } },
  stormstring_bow: { slot: 'weapon', grade: 'treasure', name: '폭풍현 활', stats: { 사격: 2, 민첩: 1, 통찰: 1 } },
  ember_scepter:   { slot: 'weapon', grade: 'treasure', name: '잔불의 홀', stats: { 마법: 2, 학식: 1, 통찰: 1 } },
  sun_mace:        { slot: 'weapon', grade: 'treasure', name: '태양 철퇴', stats: { 신성: 2, 근력: 1, 강인: 1 } },
  // ── 방어구 ──
  leather_vest:    { slot: 'armor', grade: 'normal', name: '가죽 조끼', stats: { 민첩: 1 } },
  chain_mail:      { slot: 'armor', grade: 'normal', name: '사슬 갑옷', stats: { 강인: 1 } },
  traveler_robe:   { slot: 'armor', grade: 'normal', name: '여행자의 로브', stats: { 학식: 1 } },
  scale_armor:     { slot: 'armor', grade: 'advanced', name: '비늘 갑옷', stats: { 강인: 2 } },
  shadow_cloak:    { slot: 'armor', grade: 'advanced', name: '그림자 망토', stats: { 민첩: 1, 통찰: 1 } },
  pilgrim_vestment:{ slot: 'armor', grade: 'advanced', name: '순례자의 법의', stats: { 신성: 1, 강인: 1 } },
  frost_plate:     { slot: 'armor', grade: 'treasure', name: '서리 판금', stats: { 근력: 1, 강인: 2, 통찰: 1 } },
  archmage_robe:   { slot: 'armor', grade: 'treasure', name: '대마도사의 예복', stats: { 마법: 2, 학식: 1, 강인: 1 } },
  // ── 장신구 ──
  bone_charm:      { slot: 'accessory', grade: 'normal', name: '뼈 부적', stats: { 통찰: 1 } },
  silver_ring:     { slot: 'accessory', grade: 'normal', name: '은반지', stats: { 화술: 1 } },
  old_compass:     { slot: 'accessory', grade: 'normal', name: '낡은 나침반', stats: { 학식: 1 } },
  hawk_feather:    { slot: 'accessory', grade: 'advanced', name: '매의 깃털', stats: { 민첩: 1, 사격: 1 } },
  merchant_seal:   { slot: 'accessory', grade: 'advanced', name: '상인의 인장', stats: { 화술: 2 } },
  star_amulet:     { slot: 'accessory', grade: 'treasure', name: '별의 목걸이', stats: { 신성: 1, 마법: 1, 학식: 1, 화술: 1 } },
  // ── 유니크 (상점·일반 드랍 없음 — 강적 8% / 기연 사건, 적성 판정으로만 손에 넣는다) ──
  dawnbreaker:     { slot: 'weapon', grade: 'unique', name: '여명을 가르는 검', stats: { 검술: 2, 근력: 1, 민첩: 1 }, fx: { dmgDealt: 15 }, rel: ['검술', '근력'], fxText: '공격 +15%' },
  void_grimoire:   { slot: 'weapon', grade: 'unique', name: '공허의 마도서', stats: { 마법: 3, 학식: 2 }, fx: { critRate: 10 }, rel: ['마법', '학식'], fxText: '치명 +10%' },
  skywarden_bow:   { slot: 'weapon', grade: 'unique', name: '하늘지기의 활', stats: { 사격: 3, 민첩: 2 }, fx: { dodge: 8 }, rel: ['사격', '민첩'], fxText: '회피 +8%' },
  titan_heart:     { slot: 'armor', grade: 'unique', name: '거인 심장 갑주', stats: { 강인: 3, 근력: 2 }, fx: { dmgTaken: -15 }, rel: ['강인', '근력'], fxText: '받는 피해 -15%' },
  saint_relic:     { slot: 'accessory', grade: 'unique', name: '성자의 성물', stats: { 신성: 3, 화술: 1 }, fx: { lifesteal: 8 }, rel: ['신성'], fxText: '흡혈 8%' },
  oracle_eye:      { slot: 'accessory', grade: 'unique', name: '예언자의 눈', stats: { 통찰: 3, 학식: 2 }, fx: { critRate: 12 }, rel: ['통찰', '학식'], fxText: '치명 +12%' },
};
// 1.184.0~ 사건 「패시브 +1Lv」 보상 → 영구 능력치 +1로 환산 (패시브 시스템은 이 모드에서 단계적 폐지)
export const REGRESSION_PASSIVE_TO_STAT = { 수비: '강인', 강타: '근력', 신앙: '신성', 잔혹: '근력' };

export function regressionGearLabel(id) {
  const g = REGRESSION_GEAR[id];
  return g ? `[${REGRESSION_GEAR_GRADES[g.grade].name}] ${g.name}` : id;
}
export function regressionGearStatText(id) {
  const g = REGRESSION_GEAR[id]; if (!g) return '';
  const st = Object.entries(g.stats || {}).map(([k, v]) => `${k} +${v}`).join(', ');
  return g.fxText ? `${st} · ${g.fxText}` : st;
}
export function regressionEquippedGear(run) {
  return REGRESSION_GEAR_SLOTS.map(s => run?.gear?.[s.id]).filter(id => id && REGRESSION_GEAR[id]);
}
export function regressionGearStats(run) {
  const out = {};
  for (const id of regressionEquippedGear(run)) for (const [k, v] of Object.entries(REGRESSION_GEAR[id].stats || {})) out[k] = (out[k] || 0) + v;
  return out;
}
export function regressionGearFx(run) {
  const out = {};
  for (const id of regressionEquippedGear(run)) for (const [k, v] of Object.entries(REGRESSION_GEAR[id].fx || {})) out[k] = (out[k] || 0) + v;
  return out;
}
// 실효 능력치 = 기본 + 사건 보너스 + 장비
export function regressionEffectiveStats(run) {
  const st = { ...regressionRunStats(run) };
  for (const src of [run?.statBonus || {}, regressionGearStats(run)]) for (const [k, v] of Object.entries(src)) if (k in st) st[k] += v;
  return st;
}
// 장비 획득 — 가방에 넣고, 그 칸이 비어 있으면 바로 장착
export function addRegressionGear(run, id) {
  const g = REGRESSION_GEAR[id]; if (!g) return run;
  const gear = { weapon: null, armor: null, accessory: null, ...(run.gear || {}) };
  if (!gear[g.slot]) gear[g.slot] = id;
  return { ...run, bag: [...(run.bag || []), id], gear };
}
export function equipRegressionGear(run, id) {
  const g = REGRESSION_GEAR[id];
  if (!g || !(run.bag || []).includes(id)) return run;
  return { ...run, gear: { weapon: null, armor: null, accessory: null, ...(run.gear || {}), [g.slot]: id } };
}
export function unequipRegressionGear(run, slot) {
  return { ...run, gear: { weapon: null, armor: null, accessory: null, ...(run.gear || {}), [slot]: null } };
}
function pickWeighted(weights, rng) {
  const ent = Object.entries(weights);
  let x = rng() * ent.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of ent) { x -= w; if (x < 0) return k; }
  return ent[ent.length - 1][0];
}
export function rollRegressionGear(gradeWeights = REGRESSION_ECON.gradeWeights.normal, rng = Math.random) {
  const grade = pickWeighted(gradeWeights, rng);
  const pool = Object.keys(REGRESSION_GEAR).filter(k => REGRESSION_GEAR[k].grade === grade);
  return pool[Math.floor(rng() * pool.length)];
}

// ── 유니크 — 다룰 수 있는지 적성 판정 (스킬 습득과 같은 공식) ──
export function regressionUniqueChance(id, stats = {}) {
  const g = REGRESSION_GEAR[id]; if (!g) return 0;
  const L = REGRESSION_LEARN;
  const apt = regressionAptitude(g.rel || [], stats);
  const p = REGRESSION_ECON.uniqueBase * (L.floor + (1 - L.floor) * apt * apt) + (stats.학식 || 0) * L.lorePerPoint;
  return Math.max(L.min, Math.min(L.max, p));
}
// 강적 승리 후 호출 — 미보유 유니크 중 빌드 가중 (적성이 맞는 쪽이 더 자주, 가끔은 엉뚱한 것)
export function offerRegressionUnique(run, enemyKey = null, rng = Math.random) {
  if (rng() >= REGRESSION_ECON.drop.elite.unique) return null;
  const stats = regressionEffectiveStats(run);
  const cands = Object.keys(REGRESSION_GEAR).filter(k => REGRESSION_GEAR[k].grade === 'unique' && !(run.bag || []).includes(k));
  if (!cands.length) return null;
  const w = cands.map(k => REGRESSION_LEARN.offFocusWeight + regressionAptitude(REGRESSION_GEAR[k].rel, stats));
  let roll = rng() * w.reduce((a, b) => a + b, 0);
  let pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { roll -= w[i]; if (roll < 0) { pick = cands[i]; break; } }
  return { gearId: pick, from: enemyKey };
}
const UNIQUE_FAIL_TEXT = {
  검술: '칼자루가 손을 밀어낸다. 이 검은 검사를 원한다.',
  근력: '들어 올리는 것조차 버겁다. 이 무게를 감당할 힘이 없다.',
  민첩: '시위가 손보다 빠르게 튕겨 나간다.',
  강인: '갑주가 살을 짓누른다. 몸이 이 무게를 버티지 못한다.',
  사격: '활이 손안에서 뒤틀린다. 이 활은 사수를 원한다.',
  마법: '책장이 넘어가지 않는다. 마력 없는 손에는 빈 종이일 뿐이다.',
  신성: '성물이 차갑게 식는다. 기도가 닿지 않는다.',
  통찰: '눈이 흐려진다. 보아야 할 것이 보이지 않는다.',
  학식: '새겨진 문자를 읽지 못해 힘을 깨우지 못했다.',
  화술: '성물이 응답하지 않는다.',
};
export function regressionUniqueIntro(pg) {
  const g = REGRESSION_GEAR[pg?.gearId];
  const en = (pg?.from && ENEMIES[pg.from]?.name) || '강적';
  return { title: '유니크 — 주인을 고르는 무구', text: `쓰러진 ${en}이(가) 지니고 있던 「${g?.name}」. 무구가 새 주인을 시험하듯 낮게 울린다.` };
}
// 다뤄 본다 / 두고 간다 — 날짜 소모 없음. 실패하면 무구는 부서지듯 빛을 잃는다 (기회 소멸)
export function resolveRegressionUnique(run, accept, rng = Math.random) {
  const pg = run.pendingGear;
  const base = { ...run, pendingGear: null };
  const g = pg && REGRESSION_GEAR[pg.gearId];
  if (!g) return { run: base, scene: null };
  if (!accept) return { run: base, scene: regressionResultScene(g.name, '손을 거두었다. 감당할 수 없는 힘은 화를 부른다.', []) };
  const stats = regressionEffectiveStats(run);
  if (rng() < regressionUniqueChance(pg.gearId, stats)) {
    let next = addRegressionGear(base, pg.gearId);
    next = { ...next, gear: { ...next.gear, [g.slot]: pg.gearId } };
    next.log = [...(next.log || []), `D${run.day}: 유니크 「${g.name}」 획득`];
    return { run: next, scene: regressionResultScene(`${g.name} - 성공!`, '무구가 손에 녹아들 듯 감긴다. 이제 이것은 내 것이다. (바로 장착했다)',
      [{ text: `${regressionGearLabel(pg.gearId)} 획득`, tone: 'gold' }, { text: regressionGearStatText(pg.gearId), tone: 'good' }]) };
  }
  const apt = regressionAptitude(g.rel || [], stats);
  const weakest = (g.rel || []).slice().sort((a, b) => (stats[a] || 0) - (stats[b] || 0))[0];
  const text = apt < 0.5 ? (UNIQUE_FAIL_TEXT[weakest] || '무구가 응답하지 않는다.') : '한순간 손에 감기는 듯했지만, 무구는 끝내 빛을 잃었다.';
  return { run: { ...base, log: [...(base.log || []), `D${run.day}: 유니크 「${g.name}」 실패`] },
    scene: regressionResultScene(`${g.name} - 실패!`, text, [{ text: `${(g.rel || []).join('·')} 적성 ${Math.round(apt * 100)}%`, tone: 'bad' }]) };
}

// ── 상점 랜덤 진열 — 스킬(일반·고급) + 장비(일반~보물). 기연·유니크는 상점 불가 ──
export function regressionSkillShopPrice(skillId, stats = {}) {
  const sk = __RSK[skillId]; if (!sk) return 0;
  const E = REGRESSION_ECON;
  return Math.round((E.prices.skill[sk.tier] || 200) * (1 + (1 - regressionSkillAptitude(skillId, stats)) * E.offBuildPriceMult) / 10) * 10;
}
export function buildRegressionShopStock(run, rng = Math.random, resets = 0) {
  const E = REGRESSION_ECON;
  const owned = regressionRunSkills(run);
  const skillPool = Object.keys(__RSK).filter(k => ['normal', 'advanced'].includes(__RSK[k].tier) && !owned.includes(k));
  const offers = [];
  for (let i = 0; i < E.shopOffers * 4 && offers.length < E.shopOffers; i++) {
    if (skillPool.length && rng() < E.shopSkillShare) {
      const id = skillPool[Math.floor(rng() * skillPool.length)];
      if (!offers.some(o => o.id === id)) offers.push({ kind: 'skill', id });
    } else {
      const id = rollRegressionGear(E.gradeWeights.shop, rng);
      if (!offers.some(o => o.id === id)) offers.push({ kind: 'gear', id, price: E.prices.gear[REGRESSION_GEAR[id].grade] });
    }
  }
  return { offers, resets };
}
export function rerollRegressionShop(run, rng = Math.random) {
  const used = run.shop?.resets || 0;
  if (used >= REGRESSION_ECON.shopResets) return run;
  return { ...run, shop: buildRegressionShopStock(run, rng, used + 1) };
}
export function regressionShopOfferPrice(run, offer) {
  return offer.kind === 'skill' ? regressionSkillShopPrice(offer.id, regressionEffectiveStats(run)) : offer.price;
}
// 진열 상품 구매 — 스킬은 교습(적성에 따라 값이 다를 뿐 확정 습득), 장비는 가방으로
export function buyRegressionOffer(run, idx) {
  const offer = run.shop?.offers?.[idx];
  if (!offer || offer.sold) return { run, bought: null };
  const price = regressionShopOfferPrice(run, offer);
  if ((run.gold || 0) < price) return { run, bought: null };
  let next = { ...run, gold: run.gold - price, shop: { ...run.shop, offers: run.shop.offers.map((o, i) => (i === idx ? { ...o, sold: true } : o)) } };
  let bought;
  if (offer.kind === 'skill') { next.skills = [...regressionRunSkills(run), offer.id]; bought = `「${__RSK[offer.id].name}」 습득`; }
  else { next = addRegressionGear(next, offer.id); bought = `${regressionGearLabel(offer.id)} 획득`; }
  return { run: { ...next, log: [...next.log, `D${run.day}: 구매 — ${bought} (-${price}G)`] }, bought, price };
}


// ============================================
// 1.185.0~ 하루 = 랜덤 이벤트 1개 (PM 결정: 매일 선택지를 다 공개하지 않는다)
// ============================================
// 흐름: 지역은 날짜로 자동 진행 (D1~10 극지대 → 11~20 숲 → 21~30 신전 → 31~40 균열) →
//       「오늘의 일」 카드 1장이 가중 랜덤으로 찾아옴 → 그 카드의 선택지만 고른다 → 하루가 지난다.
// 날이 갈수록: 적 HP·피해 +enemyRamp/일, 기연 가중 +fortune.perDay/일. 밸런스는 REGRESSION_DAY 한 곳.
export const REGRESSION_DAY = {
  regionDays: 15,                       // 1.186.0 PM 결정: 10 → 15 (총 60일)
  weights: { battle: 32, elite: 12, event: 26, companion: 9, merchant: 7, shelter: 10 },
  fortune: { base: 4, perDay: 0.37 },   // 기연 가중 — D1 ≈4% → D60 ≈17% (+ 기억 조각 보너스)
  enemyRamp: 0.015,                     // 하루당 적 HP·피해 +1.5% (D60 ×1.89) — 지역 단계 상승과 곱
  hideDc: { battle: 14, elite: 15 },    // 몸을 숨겨 피하기 판정
  trainExp: 25,                         // 쉼터에서 단련
  dailyHealPct: 10,                     // 아침마다 자연 회복 (최대 HP %)
  checkFame: 3,                         // 판정 성공 명성
};
export function regressionRegionForDay(day = 1) {
  return Math.min(REGRESSION_REGIONS.length, Math.max(1, Math.ceil(day / REGRESSION_DAY.regionDays)));
}
export function regressionDayEnemyMult(day = 1) {
  return 1 + Math.max(0, day - 1) * REGRESSION_DAY.enemyRamp;
}
export function regressionFortuneWeight(run) {
  const F = REGRESSION_DAY.fortune;
  return F.base + Math.max(0, (run.day || 1) - 1) * F.perDay + (run.fortuneBonus || 0);
}
// 오늘의 일 확률표 (UI 안내·시뮬용) — { kind: 확률 }
export function regressionDayTable(run) {
  const W = REGRESSION_DAY.weights;
  const region = regressionRegionForDay(run.day);
  const comp = regressionCompanionAt(region);
  const w = {
    battle: W.battle,
    elite: isRegressionEliteOpen({ ...run, region }, region) ? W.elite : 0,
    event: REGRESSION_EVENTS.some(e => e.region === region && !e.fortune && !(run.seenEvents || []).includes(e.id)) ? W.event : 0,
    companion: comp && (run.affinity?.[comp.id] || 0) < 100 ? W.companion : 0,
    merchant: W.merchant,
    shelter: W.shelter,
    fortune: regressionFortuneWeight(run),
  };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / total]));
}
const REGION_ENTER_TEXT = {
  1: (first) => (first ? '' : '') + '마을을 떠나 북쪽으로 향한다. 숨결이 하얗게 얼어붙는다 — 북부 극지대다.',
  2: () => '눈길이 끝나고 검게 썩은 나무들이 나타났다. 죽은 자의 숲. 열흘 안에 지나가야 한다.',
  3: () => '숲 너머로 거대한 석조 신전이 모습을 드러낸다. 봉인된 신전 — 시간이 느리게 흐르는 곳.',
  4: () => '신전의 마지막 문을 지나자 하늘이 찢어져 있다. 마계의 균열. 황혼의 첨탑이 그 너머에 서 있다.',
};
// 오늘의 일 굴림 — 반환: 갱신된 run (today 카드 / pendingEvent / 지역 전환 장면 중 하나)
export function rollRegressionDay(run, memories = [], rng = Math.random) {
  const region = regressionRegionForDay(run.day);
  if (run.region !== region) {
    const wake = run.region === REGRESSION_HUB && run.day === 1;
    return { ...run, region, today: null, scene: regressionResultScene(getRegressionRegion(region).name, REGION_ENTER_TEXT[region](wake), [{ text: `D${run.day} — 이곳에서 ${REGRESSION_DAY.regionDays}일`, tone: 'gold' }]) };
  }
  // 1.186.0~ 메인 스토리 — 정해진 날 확정 등장
  const story = regressionMainStoryFor(run);
  if (story) return { ...run, today: null, pendingEvent: story.id };
  // 아침 — 하룻밤 자며 조금 회복 (하루 1회)
  if (run.healedDay !== run.day) run = { ...run, healedDay: run.day, hpPct: Math.min(1, (run.hpPct ?? 1) + REGRESSION_DAY.dailyHealPct / 100) };
  const table = regressionDayTable(run);
  let x = rng(), kind = 'battle';
  for (const [k, p] of Object.entries(table)) { x -= p; if (x < 0) { kind = k; break; } }
  if (kind === 'event') {
    const ev = rollRegressionEvent(run, memories, rng, { fortune: false });
    if (ev) return { ...run, today: null, pendingEvent: ev.id };
    kind = 'battle';
  }
  if (kind === 'fortune') {
    const ev = rollRegressionEvent(run, memories, rng, { fortune: true });
    if (ev) return { ...run, today: null, pendingEvent: ev.id };
    // 지역 기연 사건을 다 봤으면 떠도는 은자 — 기연(없으면 고급) 스킬의 가르침
    const offer = offerRegressionLearn(run, 'boss', null, rng) || offerRegressionLearn({ ...run }, 'elite', null, () => 0);
    if (offer) return { ...run, today: { kind: 'hermit', skillId: offer.skillId } };
    kind = 'shelter';
  }
  if (kind === 'battle' || kind === 'elite') {
    const tier = kind === 'elite' ? 'elite' : 'normal';
    const enemyKey = rollRegressionEnemy(region, tier, rng);
    if (enemyKey) return { ...run, today: { kind, tier, enemyKey } };
    kind = 'shelter';
  }
  if (kind === 'companion') return { ...run, today: { kind, companionId: regressionCompanionAt(region).id } };
  if (kind === 'merchant') return { ...run, today: { kind }, shop: buildRegressionShopStock(run, rng) };
  return { ...run, today: { kind: 'shelter' } };
}
// 하루 넘기기 (오늘의 일을 끝냄) — 날짜 +1
export function passRegressionDay(run, logLine) {
  return { ...run, today: null, day: run.day + 1, log: logLine ? [...run.log, `D${run.day}: ${logLine}`] : run.log };
}
// 숨어서 피하기 — 성공 = 하루 넘김, 실패 = 전투 (pending)
export function hideFromRegressionEnemy(run, rng = Math.random) {
  const t = run.today; if (!t?.enemyKey) return { run, ok: false };
  const st = t.tier === 'elite' ? '통찰' : '민첩';
  const res = resolveRegressionChoice({ stat: st, dc: REGRESSION_DAY.hideDc[t.kind] || 14, success: {}, fail: {} }, regressionEffectiveStats(run), rng);
  if (res.check === 'ok') return { run: passRegressionDay(run, `${ENEMIES[t.enemyKey]?.name}을(를) 피해 지나감`), ok: true, stat: st };
  return { run: { ...startRegressionCombat({ ...run, today: null }, t.enemyKey, t.tier) }, ok: false, stat: st };
}
export function fightRegressionToday(run) {
  const t = run.today; if (!t?.enemyKey) return run;
  return startRegressionCombat({ ...run, today: null }, t.enemyKey, t.tier);
}
export function restRegressionShelter(run) {
  return { ...applyRegressionRest({ ...run, today: null }) };
}
export function trainRegressionShelter(run) {
  const g = gainRegressionExp(run, REGRESSION_DAY.trainExp);
  return { run: passRegressionDay(g.run, `단련 (경험치 +${REGRESSION_DAY.trainExp})`), levelUps: g.levelUps, from: g.from };
}
export function askRegressionHermit(run) {
  const id = run.today?.skillId;
  return passRegressionDay({ ...run, pendingLearn: id ? { skillId: id, source: 'fortune', from: null } : null }, `떠도는 은자를 만남`);
}
export const REGRESSION_TODAY_INTRO = {
  battle: (r) => `${regressionEnemyLabel(r.today.enemyKey, 'normal')}이(가) 길을 막아선다.`,
  elite: (r) => `땅이 울린다. 무거운 기척 — ${regressionEnemyLabel(r.today.enemyKey, 'elite')}의 흔적이다.`,
  companion: (r) => { const c = getRegressionCompanion(r.today.companionId); return `${c.name}(${c.title})이(가) 모닥불 곁에 앉아 있다. 이쪽을 알아보고 고개를 든다.`; },
  merchant: () => '짐마차를 끄는 떠돌이 상인이 손을 흔든다. "구경은 공짜요, 회귀자 양반."',
  shelter: () => '버려진 오두막을 찾았다. 지붕은 새지만 하룻밤 머물 만하다.',
  hermit: () => '누더기를 걸친 은자가 길가에 앉아 있다. "기다렸네. 자네가 배울 것이 하나 있지."',
};


// ============================================
// 1.186.0~ 메인 스토리 5편 — 정해진 날 확정 등장 (PM 결정)
// ============================================
// 지역마다 중반(그 지역 8일째)에 1편 + 마지막 날 「결전 전야」. 선택마다 성향(진실·힘·유대)이 쌓이고 엔딩을 가른다.
// choice.trait: 'truth'|'power'|'bond' (+traitValue) · success.traitBonus: 판정 성공 가산 · choice.flag · choice.requireTrait {성향: n}
export const REGRESSION_TRAITS = {
  truth: { name: '진실', color: '#9cc4e8', desc: '황혼의 정체를 좇는다' },
  power: { name: '힘', color: '#e0705c', desc: '황혼의 힘을 취한다' },
  bond: { name: '유대', color: '#9ad4a3', desc: '동료와 함께 걷는다' },
};
export const REGRESSION_STORY_DAY_IN_REGION = 8;
export const REGRESSION_MAIN_STORY = [
  { id: 'ms_1', main: 1, region: 1, title: '얼음 속의 사자(使者)', text: '빙벽 속에 한 사내가 얼어붙어 있다. 왕국의 문장이 박힌 전령의 망토 — 품 안에 봉인된 편지가 비쳐 보인다.\n얼음 너머로 겨우 읽히는 첫 줄. 「황혼은 저절로 오는 것이 아니다. 누군가 부른 것이다.」', choices: [
    { text: '얼음을 녹여 편지를 끝까지 읽는다', trait: 'truth', stat: '학식', dc: 14, success: { text: '편지는 첨탑에 오른 첫 번째 사람에 대한 보고였다. 그는 황혼을 「멈추려」 했다고 적혀 있다.', traitBonus: 1, reward: { type: 'fame', value: 5 } }, fail: { text: '글자 절반이 얼음과 함께 녹아내렸다. 「첨탑」, 「첫 번째」라는 단어만 남았다.' } },
    { text: '전령의 검을 빼낸다', trait: 'power', result: '얼어붙은 손가락을 하나씩 펴고 검을 쥐었다. 차가운 힘이 팔을 타고 올라온다.', reward: { type: 'random_relic' } },
    { text: '그를 묻어 주고 발터에게 알린다', trait: 'bond', result: '발터는 오래 말이 없었다. "…내 부하였다. 고맙다, 회귀자."', reward: { type: 'affinity', name: 'knight', value: 30 } },
  ] },
  { id: 'ms_2', main: 2, region: 2, title: '망자의 행렬', text: '안개 속으로 망자들이 줄지어 걸어간다. 모두 같은 방향 — 서쪽, 첨탑이 있는 곳이다.\n행렬 끝의 아이 망령이 돌아본다. "당신도 가는 거지? 다들 불려 가."', choices: [
    { text: '행렬을 따라가며 그들의 말을 듣는다', trait: 'truth', stat: '통찰', dc: 15, success: { text: '"첨탑의 주인은 우리를 먹고 자라." 망자들은 황혼의 땔감이었다.', traitBonus: 1, reward: { type: 'fame', value: 5 } }, fail: { text: '망자들의 속삭임이 한데 뒤섞여 아무것도 알아들을 수 없었다.', penalty: { hp: -20 } } },
    { text: '망자들의 남은 힘을 거둬들인다', trait: 'power', traitValue: 2, result: '망자들이 하나둘 흩어지며 그 온기가 내 몸으로 스며든다. 강해졌다 — 그리고 조금 차가워졌다.', reward: { type: 'stat', name: '강인', value: 1 }, penalty: { hp: -25 } },
    { text: '세레나와 함께 그들을 잠재운다', trait: 'bond', result: '세레나의 노래에 망자들이 하나씩 눈을 감는다. "고마워요. 혼자서는 못 했을 거예요."', reward: { type: 'affinity', name: 'healer', value: 30 } },
  ] },
  { id: 'ms_3', main: 3, region: 3, title: '회귀자의 기록', text: '봉인된 서고 가장 깊은 곳. 먼지 쌓인 책장 하나에 같은 필체의 일지가 빼곡하다.\n표지마다 숫자가 적혀 있다 — 1, 2, 3 … 12. 그리고 빈 표지 하나. 13.', choices: [
    { text: '일지를 처음부터 읽는다', trait: 'truth', stat: '학식', dc: 15, success: { text: '열두 명의 회귀자. 모두 첨탑에 올랐고, 모두 「주인을 쓰러뜨렸다」고 적었다. 그런데 황혼은 매번 다시 왔다.', traitBonus: 1, reward: { type: 'fame', value: 5 } }, fail: { text: '필체가 갈수록 무너져 뒤쪽은 읽을 수가 없다.' } },
    { text: '봉인을 부수고 서고의 힘을 취한다', trait: 'power', traitValue: 2, stat: '근력', dc: 15, success: { text: '봉인이 깨지며 쏟아진 힘이 손바닥에 고인다.', reward: { type: 'random_relic' } }, fail: { text: '봉인의 반동이 온몸을 때렸다. 그래도 힘의 일부는 손에 남았다.', penalty: { hp: -30 } } },
    { text: '오렌에게 13번째 표지를 보여 준다', trait: 'bond', result: '오렌의 손이 떨린다. "…이번에는 내가 끝까지 적겠네. 자네 이름으로."', reward: { type: 'affinity', name: 'archivist', value: 30 } },
  ] },
  { id: 'ms_4', main: 4, region: 4, title: '황혼의 사도', text: '균열 한복판, 사도가 기다리고 있었다. "열세 번째로군. 주인께서 너를 눈여겨보신다."\n사도가 손을 내민다. "첨탑의 주인을 쓰러뜨려 봐야 황혼은 다시 온다. 차라리 네가 주인이 되어라."', choices: [
    { text: '「황혼을 처음 부른 자는 누구냐」고 묻는다', trait: 'truth', stat: '화술', dc: 15, success: { text: '사도가 웃는다. "모르는 척은 그만둬라. 첫 번째 생의 너였다." 등골이 서늘해진다.', traitBonus: 1, reward: { type: 'fame', value: 5 } }, fail: { text: '"알고 싶으면 올라와라." 사도는 그 말만 남기고 사라졌다.' } },
    { text: '사도의 손을 잡는다', trait: 'power', traitValue: 2, result: '황혼의 힘 일부가 혈관으로 흘러든다. 사도가 속삭인다. "꼭대기에서 보자, 주인님."', reward: { type: 'fame', value: 10 }, penalty: { hp: -30 } },
    { text: '니아와 짜고 사도의 제단을 무너뜨린다', trait: 'bond', result: '니아가 흘린 거짓 정보에 사도가 자리를 비운 사이, 제단을 무너뜨렸다. "손해 보는 장사는 아니었네."', reward: { type: 'affinity', name: 'broker', value: 30 } },
  ] },
  { id: 'ms_5', main: 5, eve: true, title: '결전 전야', text: '내일이면 첨탑의 문이 열린다. 모닥불이 낮게 타오른다.\n지금까지의 생들이 한꺼번에 떠오른다. 이번에는 무엇을 위해 오를 것인가.', choices: [
    { text: '고리를 끊을 방법을 찾는다', requireTrait: { truth: 4 }, trait: 'truth', flag: 'breakLoop', result: '열두 권의 일지, 망자들의 말, 사도의 웃음. 모든 조각이 맞춰진다 — 황혼을 부른 것이 나라면, 끊을 수 있는 것도 나다.' },
    { text: '황혼의 힘을 받아들인다', trait: 'power', traitValue: 2, result: '눈을 감자 붉은 힘이 맥박처럼 뛴다. 두렵지 않다.', reward: { type: 'heal_pct', value: 30 } },
    { text: '동료들과 마지막 밤을 보낸다', trait: 'bond', traitValue: 2, result: '누군가 웃고, 누군가 노래한다. 이 밤을 지키기 위해 오르는 것이다.', reward: { type: 'heal_pct', value: 50 } },
    { text: '홀로 검을 닦는다', result: '말없이 날을 세운다. 내일은 오직 이 검만 믿는다.', reward: { type: 'heal_pct', value: 40 } },
  ] },
];
export function regressionEventById(id) {
  return REGRESSION_EVENTS.find(e => e.id === id) || REGRESSION_MAIN_STORY.find(e => e.id === id) || null;
}
// 오늘 확정 등장할 메인 스토리 (없으면 null)
export function regressionMainStoryFor(run) {
  const seen = run.seenEvents || [];
  for (const ms of REGRESSION_MAIN_STORY) {
    if (seen.includes(ms.id)) continue;
    const day = ms.eve ? run.maxDays : (ms.region - 1) * REGRESSION_DAY.regionDays + REGRESSION_STORY_DAY_IN_REGION;
    if (run.day === day) return ms;
  }
  return null;
}
export function regressionChoiceVisible(choice, run, memories = []) {
  if (choice.requireMemory && !memories.includes(choice.requireMemory)) return false;
  if (choice.requireTrait) for (const [k, v] of Object.entries(choice.requireTrait)) if ((run?.traits?.[k] || 0) < v) return false;
  return true;
}
