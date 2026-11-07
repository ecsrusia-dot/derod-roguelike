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
  fameGain: { normal: 3, elite: 8, boss: 15 },   // 1.194.0~ boss = 길목의 군주 (루트 보스)    // 1.185.0 랜덤 하루 구조 — 2/5 → 3/8
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
// type: 'stat' (영구 능력치 +n — 1.188.0 PM 결정: 패시브 폐지) / 'maxHp' (최대 HP +n)
// 직업 전용 액티브 스킬은 직업별 풀이라 MVP에서는 패시브·HP만 (설계서 3.1 — 액티브 해금은 후속 검토)
export const REGRESSION_RECORDS = {
  // 북부 극지대
  goblin:        { reward: { type: 'stat', id: '민첩', n: 1 } },
  iceWolf:       { reward: { type: 'stat', id: '통찰', n: 1 } },
  tundraRaider:  { reward: { type: 'stat', id: '근력', n: 1 } },
  wraith:        { reward: { type: 'stat', id: '통찰', n: 1 } },
  frostGiant:    { reward: { type: 'stat', id: '강인', n: 2 } },
  // 죽은 자의 숲
  fallenElf:     { reward: { type: 'stat', id: '민첩', n: 1 } },
  shadowWolf:    { reward: { type: 'stat', id: '근력', n: 1 } },
  corruptSpider: { reward: { type: 'maxHp', n: 20 } },
  forestSpirit:  { reward: { type: 'stat', id: '신성', n: 2 } },
  forestTyrant:  { reward: { type: 'maxHp', n: 30 } },  // 1.178.0 강타+2 → HP (자동 전투 실측: 강타 Lv.3+ 다단히트 = 기절 고정)
  // 봉인된 신전
  timeKeeper:    { reward: { type: 'stat', id: '민첩', n: 1 } },
  brokenGolem:   { reward: { type: 'stat', id: '강인', n: 1 } },
  sealMage:      { reward: { type: 'stat', id: '마법', n: 1 } },
  ancientPriest: { reward: { type: 'stat', id: '신성', n: 2 } },
  // 마계의 균열
  demonScout:    { reward: { type: 'stat', id: '사격', n: 1 } },
  wrathDemon:    { reward: { type: 'stat', id: '근력', n: 1 } },
  riftBreach:    { reward: { type: 'stat', id: '학식', n: 1 } },
  demonApostle:  { reward: { type: 'stat', id: '마법', n: 2 } },
};

export function describeRegressionRecord(enemyKey) {
  const r = REGRESSION_RECORDS[enemyKey]?.reward;
  if (!r) return '';
  if (r.type === 'stat') return `${r.id} +${r.n} (이번 생 영구)`;
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
  grave: null,         // 1.196.0~ 전생의 유품 { gearId, gold, day, life, cause }
  endingLog: {},       // 1.198.0~ 엔딩 도감 { endingId: { life, classId, day } }
  loops: 0,            // 누적 회귀 횟수
  memories: [],        // 획득 기억 조각 id
  carry: [],           // 다음 생에 들고 갈 기록 (enemyKey) — carrySlots 개까지
  recordsEver: {},     // 회귀 도감: enemyKey → true (한 번이라도 완전 기록)
  bestFame: 0,
  bestDay: 0,
  endings: [],         // 도달 엔딩 id
  spireClears: 0,
  echo: 0,             // 1.187.0~ 잔향 — 시작 특성 해금 재화
  unlockedTraits: [],  // 1.187.0~ 해금한 시작 특성 id
  equippedTraits: [],  // 1.187.0~ 다음 생에 들고 갈 시작 특성 (슬롯 수만큼)
  traitLv: {},         // 1.191.0~ 특성 레벨 { id: 1~5 } (구세이브 = unlockedTraits → Lv.1)
  traitSlotsBought: 0, // 1.191.0~ 잔향으로 산 추가 슬롯 수
};

export function regressionCarrySlots(metaR) {
  return REGRESSION_TUNING.carrySlotsBase + aggregateRegressionMemories(metaR?.memories).carrySlots;
}

// =========== 런 생성 ===========
export function createRegressionRun(metaR = EMPTY_REGRESSION, classId, stats = null, skills = null, startTraits = [], provisions = [], oaths = []) {
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
    skillLv: {},                                      // 1.192.0~ 스킬 레벨 { id: 2~5 } (없으면 Lv.1)
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
  const withGrave0 = metaR.grave ? { ...run, grave: { ...metaR.grave } } : run;   // 1.196.0~ 전생의 유품
  const withGrave = { ...withGrave0, rival: { level: metaR.rival?.level || 0, met: metaR.rival?.met || 0, defeats: metaR.rival?.defeats || 0 } };   // 1.202.0~ 라이벌
  const made = applyRegressionProvisions(applyRegressionStartTraits({ ...withGrave, shop: buildRegressionShopStock(withGrave) }, startTraits, metaR), provisions);
  const ok = (oaths || []).filter(id => REGRESSION_OATHS[id]);
  return ok.length ? { ...made, oaths: ok, gold: regressionOathFx(ok).startGoldZero ? 0 : made.gold } : made;   // 1.197.0~ 황혼의 맹세
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
  return run.fame >= regressionFameGate(run);
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
export function startRegressionCombat(run, enemyKey, tier, extra = {}) {
  return { ...run, pending: { enemyKey, tier, ...extra } };
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
    const moon = run.pending?.redMoon ? REGRESSION_RED_MOON.rewardMult : 1;   // 1.195.0~ 붉은 달 보상 배율
    const fame = Math.round((T.fameGain[tier] || 0) * regionMult * moon) + (run.affinity ? aggregateRegressionCompanions(run).famePerWin : 0);
    next.fame += fame;
    next.kills[tier] = (next.kills[tier] || 0) + 1;
    next = gainRegressionExp(next, (REGRESSION_EXP[tier] || 0) * moon).run;
    next.hpPct = Math.min(1, Math.max(0.01, result.hpPct ?? next.hpPct)); // 1.178.0 상한 — 전투 화면 최대 HP(근력 보너스 포함)가 더 커서 100% 초과 누적되던 버그
    // 사건에서 이어진 전투는 사건이 이미 하루를 썼으므로 날짜 미소모
    next = advanceDays(next, run.pending?.fromEvent ? 0 : 1, `${name} 처치 (명성 +${fame})${learnedNow.length ? ' · 기록 완성' : ''}`);
  } else if ((run.revives || 0) > 0) {
    // 1.187.0~ 시작 특성 「생환」 — 한 번은 죽음 대신 일어난다 (그날은 그대로 지나감)
    next.revives = run.revives - 1;
    next.hpPct = run.reviveHpPct || REGRESSION_TRAIT_TUNING.reviveHpPct;
    next = advanceDays(next, run.pending?.fromEvent ? 0 : 1, `${name}에게 쓰러졌으나 생환`);
    next.revivedNow = true;
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
  // 1.194.0~ 첨탑 구성은 마지막으로 걸은 길(run.route)로 정해진다
  const spireRoute = run.route || 'none';
  return { ...run, spireRound: 0, spireRoute, log: [...run.log, `D${run.day}: 황혼의 첨탑 진입 (${REGRESSION_ROUTES[spireRoute].name})`] };
}

export function applyRegressionSpireResult(run, { win, hpPct }) {
  if (run.spireRound == null) return run;
  if (!win) return { ...run, hpPct: 0, over: 'spireLose', log: [...run.log, `첨탑 ${run.spireRound + 1}층에서 패배`] };
  const round = run.spireRound + 1;
  if (round >= regressionSpireChain(run).length) {
    return { ...run, hpPct: Math.min(1, hpPct), spireRound: round, over: 'victory', log: [...run.log, '황혼의 첨탑 정복'] };
  }
  const compRest = run.affinity ? aggregateRegressionCompanions(run).spireRestPct : 0;
  const rally = run.storyFlags?.alliesRally ? REGRESSION_ROUTE_TUNING.alliesRallyRestPct : 0;
  const healed = Math.min(1, Math.min(1, hpPct) + ((run.spireRestPct || 0) + compRest + rally) / 100);
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
      echo: (base.echo || 0) + regressionEchoGain(base, run) + regressionEndingMilestoneGain(base, run),
      // 1.202.0~ 라이벌 — 그가 이기면 강해지고, 내가 이기면 기록된다 (생을 넘어 이어진다)
      rival: {
        level: Math.min(REGRESSION_RIVAL.maxLevel, (base.rival?.level || 0) + (run.rivalGain || 0)),
        met: (base.rival?.met || 0) + ((run.rivalMet || []).length ? 1 : 0),
        defeats: (base.rival?.defeats || 0) + (run.rivalWins || 0),
      },
      // 1.196.0~ 전생의 유품 — 죽으면 새 무덤이 생긴다(이전 무덤은 덮인다). 정복했으면 회수 여부만 반영
      grave: cause !== 'victory' ? buildRegressionGrave(run, base.loops + 1) : (run.graveRecovered ? null : base.grave || null),
      endings: (() => { const e = regressionEndingFor(run); return e && !base.endings.includes(e.id) ? [...base.endings, e.id] : base.endings; })(),
      // 1.198.0~ 엔딩 도감 — 처음 본 생·직업·날 기록 + 수집 보상(잔향)
      endingLog: (() => { const e = regressionEndingFor(run); const log = { ...(base.endingLog || {}) }; if (e && !log[e.id]) log[e.id] = { life: base.loops + 1, classId: run.classId, day: Math.min(run.day, run.maxDays) }; return log; })(),
    },
    gainedMemories: gained,
    endingReward: regressionEndingMilestoneGain(base, run),
    grave: cause !== 'victory' ? buildRegressionGrave(run, base.loops + 1) : null,
    echoGain: regressionEchoGain(base, run),
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
    perks: { ally: { stats: { 강인: 2 }, dmgTaken: -5 }, oath: { stats: { 근력: 2 }, dmgTaken: -10, spireWoundCut: 0.15 } },
    perkText: { ally: '강인 +2 · 받는 피해 -5%', oath: '근력 +2 · 받는 피해 -10% 추가 · 첨탑 상처 -15%p' },
    ending: { id: 'ending_knight', name: '눈 속의 기사단', text: '발터와 함께 북부에 새 기사단의 깃발을 세웠다. 황혼은 걷혔고, 지킬 것이 생겼다.' } },
  { id: 'healer', name: '세레나', title: '떠돌이 치유사', region: 2, color: '#9ad4a3',
    desc: '망자의 숲에서 살아 있는 자를 돌보는 치유사. 죽음을 미워한다.',
    perks: { ally: { restHealPct: 20, dailyHealPct: 5 }, oath: { stats: { 신성: 2 }, spireRestPct: 30, potionCap: 1 } },
    perkText: { ally: '쉼터 회복 +20%p · 아침 회복 +5%p', oath: '신성 +2 · 첨탑 층 사이 HP +30% · 포션 벨트 +1' },
    ending: { id: 'ending_healer', name: '은둔의 숲', text: '세레나와 함께 숲 깊은 곳에 치료소를 열었다. 더는 아무도 그 숲에서 길을 잃지 않는다.' } },
  { id: 'archivist', name: '오렌', title: '신전 기록관', region: 3, color: '#c9b8ff',
    desc: '봉인된 신전의 마지막 기록관. 회귀하는 자에 대한 기록을 찾고 있다.',
    perks: { ally: { stats: { 학식: 2 }, recordBonusPct: 30 }, oath: { critRate: 10, spireWeakness: true } },
    perkText: { ally: '학식 +2 · 기록 게이지 +30%', oath: '치명 +10% · 첨탑 주인의 약점 즉시 개방' },
    ending: { id: 'ending_archivist', name: '마지막 기록', text: '오렌은 회귀의 고리를 처음부터 끝까지 기록했다. 그 책의 마지막 장에는 내 이름이 적혀 있다.' } },
  { id: 'broker', name: '니아', title: '균열의 정보상', region: 4, color: '#e8b04a',
    desc: '균열 가장자리에서 마족과도 거래하는 정보상. 손해 보는 장사는 하지 않는다.',
    perks: { ally: { goldPct: 50, critRate: 5 }, oath: { dmgDealt: 10, famePerWin: 2 } },
    perkText: { ally: '전투 은화 +50% · 치명 +5%', oath: '공격 +10% · 전투 승리마다 명성 +2' },
    ending: { id: 'ending_broker', name: '그림자 시장의 주인', text: '니아와 함께 균열의 시장을 손에 넣었다. 대륙의 모든 소문이 이제 내 귀로 먼저 들어온다.' } },
];
export const REGRESSION_ENDING_SPIRE = { id: 'ending_spire', name: '황혼을 끊은 자', branch: '정복', hint: '방랑의 길(성향이 한쪽으로 기울지 않음)로 첨탑을 정복한다', text: '홀로 첨탑에 올라 황혼을 끊었다. 회귀의 고리가 멈추고, 처음으로 황혼 다음 날 아침이 밝았다.' };
// 1.186.0~ 메인 스토리 분기 엔딩 (PM 결정: 진실·힘·유대 3성향 누적, 동료 엔딩은 유대 갈래로 흡수)
export const REGRESSION_STORY_ENDINGS = [
  { id: 'ending_loop_end', name: '회귀의 끝', branch: '진실', hint: '진실을 끝까지 좇아 결전 전야에 고리를 끊을 방법을 찾고, 첨탑을 정복한다', text: '첨탑 꼭대기에서 황혼을 부른 자의 이름을 불렀다 — 그것은 첫 번째 생의 나였다. 고리를 끊자 기억이 하나씩 흩어진다. 이번에는 정말로, 다시 돌아오지 않는다.' },
  { id: 'ending_truth', name: '진실의 기록자', branch: '진실', hint: '진실의 길로 첨탑을 정복한다', text: '황혼은 끊었지만, 그것이 왜 왔는지는 아무도 모른다 — 나 말고는. 나는 펜을 들었다. 다음에 올 회귀자가 같은 길을 걷지 않도록.' },
  { id: 'ending_heir', name: '황혼의 계승자', branch: '힘', hint: '힘의 길로 첨탑을 정복한다', text: '첨탑의 주인이 쓰러지자 황혼이 내 안으로 흘러들었다. 하늘은 다시 맑아졌지만, 내 그림자는 해 질 녘처럼 붉다. 이제 황혼은 나다.' },
  { id: 'ending_bond_road', name: '함께 걸은 길', branch: '유대', hint: '유대의 길로 첨탑을 정복한다 (맹약 동료 없음)', text: '맹약을 맺은 이는 없었다. 그래도 길 위에서 만난 얼굴들이 첨탑 아래에서 기다리고 있었다. 내려가자, 모두 함께 첫 아침을 맞았다.' },
  { id: 'ending_spire_name', name: '첨탑에 남은 이름', branch: '패배', hint: '방랑의 길로 첨탑에서 쓰러진다', text: '마지막 계단 앞에서 무릎이 꺾였다. 첨탑 벽에 내 이름이 새겨진다 — 먼저 쓰러진 수많은 이름들 사이에.' },
  { id: 'ending_lost_record', name: '기록되지 않은 열세 번째', branch: '패배', hint: '진실의 길로 첨탑에서 쓰러진다', text: '첫 번째 회귀자의 얼굴을 보았다 — 그리고 무너졌다. 서고의 열세 번째 표지는 끝내 빈 채로 남는다. 다음 생의 나는 이 사실을 기억할까.' },
  { id: 'ending_devoured', name: '황혼에 삼켜진 자', branch: '패배', hint: '힘의 길로 첨탑에서 쓰러진다', text: '받아들인 힘이 나를 삼켰다. 첨탑 꼭대기의 옥좌가 새 주인을 맞는다 — 내 얼굴을 한, 내가 아닌 무언가를.' },
  { id: 'ending_fallen_together', name: '함께 쓰러진 자들', branch: '패배', hint: '유대의 길로 첨탑에서 쓰러진다', text: '마지막 계단에서 동료들과 함께 쓰러졌다. 누구도 혼자 남지 않았다는 것만이 위안이었다.' },
  { id: 'ending_dusk', name: '황혼에 잠긴 대륙', branch: '패배', hint: '이름을 알리지 못한 채 마지막 날을 넘긴다', text: '이름 없는 자에게 첨탑은 문을 열지 않았다. 황혼이 대륙을 덮고, 나는 마을 언덕에서 그것을 끝까지 지켜보았다.' },
];
export const REGRESSION_ENDINGS = [REGRESSION_ENDING_SPIRE, ...REGRESSION_STORY_ENDINGS.slice(0, 3), ...REGRESSION_COMPANIONS.map(c => ({ ...c.ending, branch: '유대', hint: `유대의 길로 ${c.name}와 맹약을 맺은 채 첨탑을 정복한다` })), ...REGRESSION_STORY_ENDINGS.slice(3)];

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
  const fx = { passive: {}, stats: {}, restHealPct: 0, dailyHealPct: 0, spireRestPct: 0, potionCap: 0, recordBonusPct: 0, spireWeakness: false, goldPct: 0, famePerWin: 0, spireWoundCut: 0, dmgDealt: 0, dmgTaken: 0, critRate: 0, dodge: 0 };
  for (const c of REGRESSION_COMPANIONS) {
    const aff = run.affinity?.[c.id] || 0;
    const tiers = [];
    if (aff >= 40) tiers.push('ally');
    if (aff >= 100) tiers.push('oath');
    for (const t of tiers) {
      for (const [k, v] of Object.entries(c.perks[t] || {})) {
        if (k === 'passive') for (const [n, lv] of Object.entries(v)) fx.passive[n] = (fx.passive[n] || 0) + lv;
        else if (k === 'stats') for (const [n, lv] of Object.entries(v)) fx.stats[n] = (fx.stats[n] || 0) + lv;
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
  const gain = Math.round((T.affinityPerTalk + (charisma >= T.charismaGate ? T.charismaBonus : 0)) * regressionOathFx(run.oaths).affinityMult);
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
  // 1.194.0~ 첨탑에 오른 길(spireRoute) 기준. 구세이브(루트 없음)는 가장 높은 성향으로 대체
  const top = run.spireRoute || run.route || regressionTopTrait(run) || 'none';
  if (run.over === 'spireLose') return byId({ truth: 'ending_lost_record', power: 'ending_devoured', bond: 'ending_fallen_together' }[top] || 'ending_spire_name');
  if (run.over === 'timeout') return byId('ending_dusk');
  if (run.over !== 'victory') return null;
  if (top === 'truth' && run.storyFlags?.breakLoop) return byId('ending_loop_end');
  if (top === 'truth') return byId('ending_truth');
  if (top === 'power') return byId('ending_heir');
  if (top === 'bond') {
    const oaths = REGRESSION_COMPANIONS.filter(c => (run.affinity?.[c.id] || 0) >= 100)
      .sort((a, b) => (run.affinity?.[b.id] || 0) - (run.affinity?.[a.id] || 0));
    if (oaths.length) return { ...oaths[0].ending, branch: '유대' };
    return byId('ending_bond_road');
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
  const oath = regressionOathFx(run.oaths).goldMult;
  return Math.max(1, Math.round(base * REGRESSION_ECON.goldMult * (1 + pct / 100) * oath));
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
  // ── 기연 사건 (fortune: 배울 수 있는 기연 스킬 — 빌드 가중·적성 판정) · 1.193.0~ region 0 = 어느 지역에서나 ──
  { id: 'rg_fortune_swordgrave', region: 0, fortune: 'saint_flash', title: '검객의 얼음 무덤', text: '바위 틈에 한 검객이 검을 내리친 자세 그대로 잠들어 있다.\n검끝이 가리키는 바위에 한 줄기 베인 자국이 남아 있다.', choices: [
    { text: '그 자국을 따라 검을 휘둘러 본다', stat: '검술', dc: 15, success: { text: '바람이 멎는다. 검객의 마지막 일격이 눈앞에 그려진다.', reward: { type: 'learn', name: 'saint_flash' } }, fail: { text: '검이 바위에 박혀 손목이 꺾였다.', penalty: { hp: -25 } } },
    { text: '검객에게 묵념한다', result: '무덤가에 놓인 은화 몇 닢을 그대로 두고 떠났다. 마음이 가볍다.', reward: { type: 'fame', value: 3 } },
  ] },
  { id: 'rg_fortune_titan', region: 0, fortune: 'titan_body', title: '거인의 뼈', text: '들판에 집채만 한 갈비뼈가 솟아 있다. 뼈 사이로 뜨거운 김이 피어오른다.', choices: [
    { text: '김이 나는 골수 곁에서 버틴다', stat: '강인', dc: 15, success: { text: '살갗이 타는 듯하더니 몸 깊은 곳이 단단해진다.', reward: { type: 'learn', name: 'titan_body' } }, fail: { text: '열기를 견디지 못하고 쓰러졌다.', penalty: { hp: -30 } } },
    { text: '뼈 조각을 떼어 간다', result: '마을 대장장이가 좋은 값을 쳐 줄 것이다.', reward: { type: 'gold', value: 40 } },
  ] },
  { id: 'rg_fortune_archer_spirit', region: 0, fortune: 'sky_volley', title: '고대 궁수의 혼', text: '고목 꼭대기에 빛나는 궁수가 앉아 있다. "내 화살을 피해 보아라."', choices: [
    { text: '쏟아지는 화살 사이에서 맞받아 쏜다', stat: '사격', dc: 15, success: { text: '"…좋은 눈이다." 궁수가 하늘을 가리킨다. 화살비의 궤적이 보인다.', reward: { type: 'learn', name: 'sky_volley' } }, fail: { text: '화살 하나가 어깨를 꿰뚫었다.', penalty: { hp: -30 } } },
    { text: '나무 뒤로 몸을 숨긴다', result: '궁수가 웃음소리만 남기고 사라졌다.' },
  ] },
  { id: 'rg_fortune_dawn_chapel', region: 0, fortune: 'dawn_miracle', title: '여명의 예배당', text: '무너진 성당 깊은 곳, 햇빛이 들지 않는데도 밝은 예배당이 있다.\n제단에 「한 번 꺼진 불도 다시 타오른다」라고 새겨져 있다.', choices: [
    { text: '제단 앞에 무릎 꿇고 기도한다', stat: '신성', dc: 15, success: { text: '빛이 가슴에 스며든다. 죽음의 문턱에서 돌아오는 길이 보인다.', reward: { type: 'learn', name: 'dawn_miracle' } }, fail: { text: '빛이 잦아든다. 아직 응답할 때가 아닌 모양이다.', reward: { type: 'heal_pct', value: 15 } } },
    { text: '촛대를 챙긴다', result: '은촛대 한 쌍. 신의 노여움은 없었다 — 아마도.', reward: { type: 'gold', value: 50 } },
  ] },
  { id: 'rg_fortune_sage_tome', region: 0, fortune: 'sage_eye', title: '현자의 마지막 책', text: '서고 맨 안쪽 책상 위에 펼쳐진 채 굳은 책이 있다.\n마지막 문장이 중간에서 끊겨 있다.', choices: [
    { text: '끊긴 문장을 이어 읽는다', stat: '학식', dc: 15, success: { text: '문장이 스스로 완성된다. 적의 일격이 오기 전에 그 끝이 보인다.', reward: { type: 'learn', name: 'sage_eye' } }, fail: { text: '글자가 눈을 찌르는 듯하다.', penalty: { hp: -25 } } },
    { text: '책을 덮어 둔다', result: '어떤 지식은 아직 이르다.' },
  ] },
  { id: 'rg_fortune_dragon_ash', region: 0, fortune: 'dragon_breath', title: '용의 재', text: '그을린 땅에 아직 식지 않은 검은 재가 쌓여 있다. 재 속에서 불씨가 숨을 쉰다.', choices: [
    { text: '불씨에 마력을 불어넣는다', stat: '마법', dc: 15, success: { text: '불씨가 손바닥 위에서 용의 형상으로 타오른다.', reward: { type: 'learn', name: 'dragon_breath' } }, fail: { text: '불씨가 폭발했다.', penalty: { hp: -40 } } },
    { text: '재를 모아 판다', result: '연금술사들이 탐내는 재다.', reward: { type: 'gold', value: 60 } },
  ] },
  // ── 1.193.0~ 기연 사건 +14 (능력치당 2종, 어느 지역에서나) ──
  { id: 'rg_fortune_giant_anvil', region: 0, fortune: 'giant_fist', title: '거인의 모루', text: '버려진 대장간 한가운데, 사람 키만 한 모루가 박혀 있다.\n모루 위에 커다란 주먹 자국이 움푹 패어 있다.', choices: [
    { text: '주먹 자국에 내 주먹을 맞춰 내리친다', stat: '근력', dc: 15, success: { text: '모루가 울린다. 팔 끝까지 힘이 한 줄로 꿰인다.', reward: { type: 'learn', name: 'giant_fist' } }, fail: { text: '손등이 터졌다.', penalty: { hp: -25 } } },
    { text: '쓸 만한 쇳조각을 챙긴다', result: '고철로 팔면 몇 푼은 된다.', reward: { type: 'gold', value: 40 } },
  ] },
  { id: 'rg_fortune_rift_stone', region: 0, fortune: 'earthshaker', title: '갈라진 바위', text: '길 한복판의 큰 바위가 위에서 아래로 깨끗하게 갈라져 있다.\n갈라진 틈에서 아직 먼지가 피어오른다.', choices: [
    { text: '같은 바위를 하나 골라 내리찍는다', stat: '근력', dc: 15, success: { text: '바위가 둘로 쪼개진다. 발밑의 땅이 함께 울렸다.', reward: { type: 'learn', name: 'earthshaker' } }, fail: { text: '반동에 어깨가 빠질 뻔했다.', penalty: { hp: -30 } } },
    { text: '틈에 앉아 쉬어 간다', result: '바위 그늘이 시원하다.', reward: { type: 'heal_pct', value: 10 } },
  ] },
  { id: 'rg_fortune_wind_shrine', region: 0, fortune: 'wind_blade', title: '바람의 사당', text: '언덕 위 작은 사당. 바람개비 수십 개가 바람도 없는데 돌고 있다.', choices: [
    { text: '도는 바람개비 사이를 빠르게 지나간다', stat: '민첩', dc: 15, success: { text: '바람개비가 한꺼번에 멈춘다. 바람이 내 칼끝을 따라온다.', reward: { type: 'learn', name: 'wind_blade' } }, fail: { text: '날개에 뺨이 베였다.', penalty: { hp: -20 } } },
    { text: '바람개비 하나를 챙긴다', result: '아이들이 좋아할 물건이다.', reward: { type: 'gold', value: 30 } },
  ] },
  { id: 'rg_fortune_mirror_hall', region: 0, fortune: 'phantom_step', title: '거울의 복도', text: '폐허 속 복도 양쪽에 깨진 거울이 늘어서 있다.\n거울마다 내 모습이 한 박자씩 늦게 움직인다.', choices: [
    { text: '거울 속 나를 앞지른다', stat: '민첩', dc: 15, success: { text: '거울 속 내가 나를 놓쳤다. 발걸음에 잔상이 남는다.', reward: { type: 'learn', name: 'phantom_step' } }, fail: { text: '거울 조각에 발이 찔렸다.', penalty: { hp: -25 } } },
    { text: '복도를 돌아 나간다', result: '괜히 오래 보고 싶지 않은 거울이다.' },
  ] },
  { id: 'rg_fortune_last_stand', region: 0, fortune: 'undying_will', title: '마지막까지 선 자', text: '무너진 성벽 앞에 선 채로 굳은 병사의 해골이 있다.\n방패는 부서졌지만 무릎은 끝내 꿇지 않았다.', choices: [
    { text: '해골 곁에 서서 같은 자세로 버틴다', stat: '강인', dc: 15, success: { text: '쓰러질 것 같던 다리에 힘이 돌아온다. 아직 끝나지 않았다.', reward: { type: 'learn', name: 'undying_will' } }, fail: { text: '한기에 몸이 굳어 버렸다.', penalty: { hp: -25 } } },
    { text: '해골을 묻어 준다', result: '이름 모를 병사가 편히 잠든다.', reward: { type: 'fame', value: 3 } },
  ] },
  { id: 'rg_fortune_sword_tomb', region: 0, fortune: 'sword_storm', title: '천 자루의 검', text: '골짜기 바닥에 검 천 자루가 꽂혀 있다. 모두 한곳을 향해 기울어 있다.', choices: [
    { text: '검들이 가리키는 곳으로 검을 뽑아 든다', stat: '검술', dc: 15, success: { text: '천 자루의 검이 한꺼번에 울린다. 검이 모이는 길이 보인다.', reward: { type: 'learn', name: 'sword_storm' } }, fail: { text: '검들이 일제히 쓰러져 다리를 그었다.', penalty: { hp: -30 } } },
    { text: '쓸 만한 검 하나를 판다', result: '이름 없는 명검이다.', reward: { type: 'gold', value: 60 } },
  ] },
  { id: 'rg_fortune_star_tower', region: 0, fortune: 'falling_star', title: '별 관측탑', text: '부서진 관측탑 꼭대기에 낡은 석궁이 하늘을 향해 고정돼 있다.\n화살 끝에 별빛이 맺혀 있다.', choices: [
    { text: '석궁을 들어 땅을 향해 쏜다', stat: '사격', dc: 15, success: { text: '화살이 유성처럼 떨어져 땅을 꿰뚫었다.', reward: { type: 'learn', name: 'falling_star' } }, fail: { text: '시위가 끊어져 손을 쳤다.', penalty: { hp: -20 } } },
    { text: '별자리를 기록해 둔다', result: '길을 잃지 않을 것 같다.', reward: { type: 'heal_pct', value: 10 } },
  ] },
  { id: 'rg_fortune_void_circle', region: 0, fortune: 'void_ward', title: '빈 마법진', text: '바닥에 그려진 마법진 안쪽만 비가 내리지 않는다.\n진 가장자리의 문자가 반쯤 지워져 있다.', choices: [
    { text: '지워진 문자를 마력으로 채운다', stat: '마법', dc: 15, success: { text: '마법진이 내 둘레로 옮겨 온다. 보이지 않는 벽이 생겼다.', reward: { type: 'learn', name: 'void_ward' } }, fail: { text: '마법진이 터지며 손이 그을렸다.', penalty: { hp: -30 } } },
    { text: '진 안에서 하룻밤 묵는다', result: '빗소리만 들리는 고요한 밤이었다.', reward: { type: 'heal_pct', value: 15 } },
  ] },
  { id: 'rg_fortune_judge_bell', region: 0, fortune: 'holy_judgment', title: '심판의 종', text: '마을 터 한가운데 종탑만 남아 있다. 종에 「죄 있는 자에게만 울린다」고 새겨져 있다.', choices: [
    { text: '종을 향해 기도하고 줄을 당긴다', stat: '신성', dc: 15, success: { text: '종소리가 빛이 되어 쏟아진다. 무엇을 심판할지 알게 되었다.', reward: { type: 'learn', name: 'holy_judgment' } }, fail: { text: '종이 울리지 않는다. 아직 자격이 없다.', reward: { type: 'heal_pct', value: 10 } } },
    { text: '종탑을 그냥 지나친다', result: '뒤에서 종이 한 번 울린 것 같았다.' },
  ] },
  { id: 'rg_fortune_fate_cards', region: 0, fortune: 'fate_read', title: '눈먼 점술사', text: '길가에서 눈먼 노파가 카드를 펼치고 있다. "한 장만 뒤집어 보게. 맞히면 가르쳐 주지."', choices: [
    { text: '노파의 손끝을 보고 카드를 고른다', stat: '통찰', dc: 15, success: { text: '"보이는구먼." 상대의 첫 수가 머릿속에 그려진다.', reward: { type: 'learn', name: 'fate_read' } }, fail: { text: '"틀렸네." 노파가 은화를 한 줌 가져갔다.', penalty: { gold: -30 } } },
    { text: '점괘만 듣고 간다', result: '"자네는 이미 한 번 죽었구먼." 등골이 서늘하다.', reward: { type: 'fame', value: 2 } },
  ] },
  { id: 'rg_fortune_forbidden_shelf', region: 0, fortune: 'forbidden_tome', title: '쇠사슬 서가', text: '무너진 도서관 지하, 쇠사슬로 묶인 책장이 하나 있다.\n사슬 사이로 검은 표지가 보인다.', choices: [
    { text: '사슬을 풀지 않고 틈으로 읽는다', stat: '학식', dc: 15, success: { text: '금지된 문장이 머릿속에 새겨졌다. 입 밖에 내는 순간 불이 된다.', reward: { type: 'learn', name: 'forbidden_tome' } }, fail: { text: '글자가 머릿속을 긁는다.', penalty: { hp: -25 } } },
    { text: '사슬만 떼어 판다', result: '고급 쇠사슬이다.', reward: { type: 'gold', value: 40 } },
  ] },
  { id: 'rg_fortune_seal_stone', region: 0, fortune: 'ancient_seal', title: '봉인석', text: '이끼 낀 석판에 고대 문양이 둥글게 새겨져 있다.\n문양 가운데만 이끼가 자라지 않는다.', choices: [
    { text: '문양을 처음부터 끝까지 해독한다', stat: '학식', dc: 15, success: { text: '마지막 획을 읽자 공기가 멈춘다. 무엇이든 한순간 묶어 둘 수 있다.', reward: { type: 'learn', name: 'ancient_seal' } }, fail: { text: '읽다 만 문양이 머리를 조였다.', penalty: { hp: -20 } } },
    { text: '석판을 탁본해 둔다', result: '학자에게 팔면 값이 나간다.', reward: { type: 'gold', value: 35 } },
  ] },
  { id: 'rg_fortune_empty_throne', region: 0, fortune: 'kings_voice', title: '빈 옥좌', text: '폐성의 알현실. 옥좌는 비어 있고, 무릎 꿇은 기사 석상들이 옥좌를 향해 있다.', choices: [
    { text: '옥좌 앞에 서서 명령한다 — "일어나라"', stat: '화술', dc: 15, success: { text: '석상들이 고개를 든 것 같았다. 목소리에 무게가 실린다.', reward: { type: 'learn', name: 'kings_voice' } }, fail: { text: '메아리만 돌아온다. 민망하다.', penalty: { hp: -10 } } },
    { text: '옥좌의 보석을 떼어 낸다', result: '석상들이 노려보는 것 같다.', reward: { type: 'gold', value: 70 } },
  ] },
  { id: 'rg_fortune_torn_banner', region: 0, fortune: 'banner_oath', title: '찢어진 군기', text: '옛 전장 언덕에 찢어진 군기가 아직 꽂혀 있다.\n주위엔 깃발을 지키다 쓰러진 자들의 무기가 흩어져 있다.', choices: [
    { text: '깃발을 뽑아 들고 맹세를 외친다', stat: '화술', dc: 15, success: { text: '바람이 깃발을 펼친다. 쓰러진 자들의 함성이 귀에 울린다.', reward: { type: 'learn', name: 'banner_oath' } }, fail: { text: '깃대가 부러졌다. 맹세는 바람에 흩어진다.', penalty: { hp: -15 } } },
    { text: '깃발을 정리해 다시 꽂는다', result: '언덕이 조금 덜 쓸쓸해졌다.', reward: { type: 'fame', value: 3 } },
  ] },
];

// 지역 사건 고르기 — 이번 생에 본 사건 제외, 기억 조각 요구 선택지는 미보유 시 숨김
export function rollRegressionEvent(run, memories = [], rng = Math.random, { fortune = null } = {}) {
  const pool = REGRESSION_EVENTS.filter(e => (e.region === run.region || e.region === 0) && !(run.seenEvents || []).includes(e.id)
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
    else if (r.type === 'affinity') { const v = Math.round(r.value * regressionOathFx(run.oaths).affinityMult); next.affinity[r.name] = Math.min(100, (next.affinity[r.name] || 0) + v); notes.push(`${getRegressionCompanion(r.name)?.name} 호감 +${v}`); }
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
      if (!canRegressionSkillGrow(next, r.name)) { const g = gainRegressionExp(next, REGRESSION_LEARN.knownExp); next = g.run; notes.push(`이미 아는 깨달음 — 경험치 +${REGRESSION_LEARN.knownExp}`); }
      else { next.pendingLearn = { skillId: r.name, source: 'fortune', from: eventId }; notes.push(`기연 — 「${__RSK[r.name]?.name}」${regressionRunSkills(next).includes(r.name) ? ' 숙련' : ''}`); }
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
  if (res?.quest) {
    // 1.200.0~ 동료 개인 퀘스트 단계 완수 — 2단계 완수 = 유대 스킬 확정 습득
    const { c, s: st } = res.quest;
    next.questStage = { ...(next.questStage || {}), [c]: Math.max(next.questStage?.[c] || 0, st) };
    const qc = getRegressionCompanion(c);
    notes.push(`${qc?.name} 개인 이야기 ${st}/2`);
    if (st >= 2 && qc?.bondSkill) { const a = addRegressionSkill(next, qc.bondSkill); next = a.run; notes.push(`유대 스킬 「${__RSK[qc.bondSkill]?.name}」${a.upgraded ? ` Lv.${a.lv}` : ' 습득'}`); }
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
export function regressionFameStage(fame = 0, gate = REGRESSION_TUNING.fameGate) {
  const k = gate / REGRESSION_TUNING.fameGate;   // 1.197.0~ 무명 서약 — 단계 기준도 같이 오른다
  let idx = 0;
  REGRESSION_FAME_STAGES.forEach((s, i) => { if (fame >= Math.round(s.min * k)) idx = i; });
  return { ...REGRESSION_FAME_STAGES[idx], step: idx, total: REGRESSION_FAME_STAGES.length - 1 };
}

// 적 등급 표기 — [하급] 얼음 늑대
export const REGRESSION_ENEMY_GRADES = { normal: '하급', elite: '상급', boss: '군주' };
export function regressionEnemyLabel(enemyKey, tierOverride = null, obj = null) {
  const e = obj || ENEMIES[enemyKey] || (enemyKey === 'spireLord' ? REGRESSION_SPIRE_LORD : null);
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
  // 1.200.0~ 동료 개인 퀘스트 — 성공 갈래의 quest 필드 { c: 동료, s: 단계 }
  const qb = res.check === 'ok' ? choice.success : res.check == null ? choice : null;
  if (qb?.quest) res.quest = qb.quest;
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
export const REGRESSION_EXP = { check: 20, normal: 30, elite: 60, boss: 100, event: 8 };  // 1.185.0 랜덤 하루 구조로 상향
export function regressionExpToNext(level = 0) { return 30 + level * 15; }
export function gainRegressionExp(run, amount = 0) {
  let next = { ...run, exp: (run.exp || 0) + amount, level: run.level || 0, statPoints: run.statPoints || 0 };
  const before = next.level;
  while (next.exp >= regressionExpToNext(next.level)) {
    next.exp -= regressionExpToNext(next.level);
    next.level += 1;
    next.statPoints += 1;
  }
  // 1.199.0~ 각성 분기 — 처음 각성 레벨에 닿으면 2택 카드
  if (before < __RAWL && next.level >= __RAWL && !next.awaken && __RAW[next.classId]) next.pendingAwaken = true;
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
import { REGRESSION_SKILL_PRESETS as __RSP, REGRESSION_FLAMES_PER_LIFE as __RFL, REGRESSION_SKILLS as __RSK, regressionSkillStats as __rss, REGRESSION_COMBAT as __RCB, REGRESSION_SKILL_LV as __RSLV, regressionSkillLevel as __rsl, REGRESSION_AWAKEN_LEVEL as __RAWL, REGRESSION_AWAKENINGS as __RAW } from './regressionCombat.js';
export function chooseRegressionAwakening(run, id) {
  const ok = (__RAW[run.classId] || []).some(a => a.id === id);
  return ok ? { ...run, awaken: id, pendingAwaken: false, log: [...(run.log || []), `D${run.day}: 각성 — ${(__RAW[run.classId].find(a => a.id === id)).name}`] } : run;
}
export function regressionRunSkills(run) {
  return Array.isArray(run?.skills) && run.skills.length ? run.skills : (__RSP[run?.classId] || []);
}
export function regressionRunFlames(run) { return run?.flames ?? __RFL; }
// 1.192.0~ 스킬 레벨 — 같은 스킬을 다시 배우면 Lv+1 (최대 REGRESSION_SKILL_LV.max)
export function regressionRunSkillLv(run, id) { return __rsl(run?.skillLv, id); }
export function canRegressionSkillGrow(run, id) {
  return !regressionRunSkills(run).includes(id) || regressionRunSkillLv(run, id) < __RSLV.max;
}
// 새로 배우거나 레벨 +1. 반환 { run, lv, upgraded }
export function addRegressionSkill(run, id) {
  const owned = regressionRunSkills(run);
  if (!owned.includes(id)) return { run: { ...run, skills: [...owned, id] }, lv: 1, upgraded: false };
  const lv = Math.min(__RSLV.max, regressionRunSkillLv(run, id) + 1);
  return { run: { ...run, skills: owned, skillLv: { ...(run.skillLv || {}), [id]: lv } }, lv, upgraded: true };
}


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
  knownExp: 20,             // 이미 만렙인 기연을 다시 만나면
  upgradeBonus: 0.1,        // 1.192.0~ 이미 아는 스킬을 다시 익힐 때 성공률 +10%p (몸이 기억한다)
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
export function regressionLearnChance(skillId, stats = {}, known = false) {
  const L = REGRESSION_LEARN;
  const sk = __RSK[skillId]; if (!sk) return 0;
  const apt = regressionSkillAptitude(skillId, stats);
  const p = (L.base[sk.tier] || 0.5) * (L.floor + (1 - L.floor) * apt * apt) + (stats.학식 || 0) * L.lorePerPoint + (known ? L.upgradeBonus : 0);
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
  const cands = Object.keys(__RSK).filter(k => __RSK[k].tier === tier && canRegressionSkillGrow(run, k));
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
  const known = regressionRunSkills(run).includes(pl.skillId);
  const p = regressionLearnChance(pl.skillId, stats, known);
  if (rng() < p) {
    const add = addRegressionSkill(base, pl.skillId);
    let next = add.run;
    const g = gainRegressionExp(next, REGRESSION_LEARN.learnExp);
    next = g.run;
    const what = add.upgraded ? `「${sk.name}」 Lv.${add.lv}` : `「${sk.name}」 습득`;
    next.log = [...(next.log || []), `D${run.day}: ${what}`];
    const tags = [{ text: add.upgraded ? `${what}!` : `「${sk.name}」 습득!`, tone: 'gold' }, { text: `경험치 +${REGRESSION_LEARN.learnExp}`, tone: 'good' }];
    if (g.levelUps > 0) tags.push({ text: `레벨 상승 ${g.from}→${next.level}`, tone: 'gold' }, { text: `추가 능력치 +${g.levelUps}`, tone: 'gold' });
    const text = add.upgraded ? `이미 아는 기술이 한층 깊어졌다. 위력이 오른다 (Lv.${add.lv - 1} → Lv.${add.lv}).` : '몸 깊은 곳에 새 기술이 새겨졌다. 이제 싸움 속에서 저절로 나올 것이다.';
    return { run: next, scene: regressionResultScene(`${sk.name} - 성공!`, text, tags) };
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
  route: { name: '여정', color: '#ff9a6a' },   // 1.194.0~ 루트 보스 전용 (랜덤 드랍·상점 없음)
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
  // 1.194.0~ 여정 장비 — 루트 보스(길목의 군주) 2번째 격파 보상 전용
  route_truth_lens:  { slot: 'accessory', grade: 'route', name: '진실의 단안경', stats: { 통찰: 3, 학식: 2 }, fx: { critRate: 12, dmgDealt: 5 }, rel: ['통찰', '학식'], fxText: '치명 +12% · 공격 +5%' },
  route_dusk_blade:  { slot: 'weapon', grade: 'route', name: '황혼을 먹은 대검', stats: { 근력: 3, 검술: 2 }, fx: { dmgDealt: 18, lifesteal: 4 }, rel: ['근력', '검술'], fxText: '공격 +18% · 흡혈 4%' },
  route_oath_cloak:  { slot: 'armor', grade: 'route', name: '맹약의 망토', stats: { 강인: 3, 화술: 2 }, fx: { dmgTaken: -15, dodge: 4 }, rel: ['강인', '화술'], fxText: '받는 피해 -15% · 회피 +4%' },
  route_wander_boots:{ slot: 'accessory', grade: 'route', name: '방랑자의 장화', stats: { 민첩: 3, 강인: 1 }, fx: { dodge: 8, dmgTaken: -5 }, rel: ['민첩'], fxText: '회피 +8% · 받는 피해 -5%' },
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
  for (const src of Object.values(regressionStatSources(run))) for (const [k, v] of Object.entries(src)) if (k in st) st[k] += v;
  return st;
}
// 1.188.0~ 능력치 보너스 출처 (능력치 창 「+N」 내역) — 사건 · 장비 · 기록서 · 동료 · 구 패시브(레거시 환산)
export const REGRESSION_LEGACY_PASSIVE_STAT = { 가속: '민첩', 정밀: '통찰', 강타: '근력', 심안: '통찰', 수비: '강인', 회피: '민첩', 잔혹: '근력', 재생: '신성', 마력: '마법', 신앙: '신성', 운명: '학식' };
export function regressionStatSources(run) {
  const records = {};
  for (const k of run?.learned || []) { const r = REGRESSION_RECORDS[k]?.reward; if (r?.type === 'stat') records[r.id] = (records[r.id] || 0) + r.n; }
  const legacy = {};
  for (const [n, lv] of Object.entries(run?.bonusSkills || {})) { const st = REGRESSION_LEGACY_PASSIVE_STAT[n]; if (st) legacy[st] = (legacy[st] || 0) + lv; }
  return { 사건: run?.statBonus || {}, 장비: regressionGearStats(run), 기록서: records, 동료: run?.affinity ? aggregateRegressionCompanions(run).stats : {}, '이전 패시브': legacy };
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
  const skillPool = Object.keys(__RSK).filter(k => ['normal', 'advanced'].includes(__RSK[k].tier) && canRegressionSkillGrow(run, k));
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
  if (offer.kind !== 'skill') return offer.price;
  // 1.192.0~ 아는 스킬은 숙련 교습 — 현재 Lv당 +40%
  const known = regressionRunSkills(run).includes(offer.id);
  const lvMult = known ? 1 + regressionRunSkillLv(run, offer.id) * 0.4 : 1;
  return Math.round(regressionSkillShopPrice(offer.id, regressionEffectiveStats(run)) * lvMult / 10) * 10;
}
// 진열 상품 구매 — 스킬은 교습(적성에 따라 값이 다를 뿐 확정 습득), 장비는 가방으로
export function buyRegressionOffer(run, idx) {
  const offer = run.shop?.offers?.[idx];
  if (!offer || offer.sold) return { run, bought: null };
  const price = regressionShopOfferPrice(run, offer);
  if ((run.gold || 0) < price) return { run, bought: null };
  let next = { ...run, gold: run.gold - price, shop: { ...run.shop, offers: run.shop.offers.map((o, i) => (i === idx ? { ...o, sold: true } : o)) } };
  let bought;
  if (offer.kind === 'skill') {
    if (!canRegressionSkillGrow(next, offer.id)) return { run, bought: null };
    const add = addRegressionSkill(next, offer.id); next = add.run;
    bought = add.upgraded ? `「${__RSK[offer.id].name}」 Lv.${add.lv}` : `「${__RSK[offer.id].name}」 습득`;
  }
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
  followerWeight: 4,                    // 1.190.0~ 따라오는 동료 1명당 동료 카드 가중 +
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
    companion: regressionCompanionCandidates(run, region).length ? W.companion + REGRESSION_DAY.followerWeight * regressionCompanionFollowers(run).length : 0,
    merchant: W.merchant,
    shelter: W.shelter,
    secret: regressionSecretAvailable({ ...run, region }) ? REGRESSION_SECRET.weight : 0,   // 1.201.0~ 숨겨진 장소
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
    const tags = [{ text: `D${run.day} — 이곳에서 ${REGRESSION_DAY.regionDays}일`, tone: 'gold' }];
    let next = { ...run, region, today: null };
    // 1.194.0~ 성향 루트 — 2지역부터 지역에 들어설 때마다 가장 높은 성향으로 길이 정해진다
    let text = REGION_ENTER_TEXT[region](wake);
    if (region >= REGRESSION_ROUTE_FROM_REGION) {
      const route = regressionRouteFor(run);
      const R = REGRESSION_ROUTES[route];
      const changed = run.route && run.route !== route;
      next = { ...next, route, routeHistory: [...(run.routeHistory || []), route] };
      const boss = REGRESSION_ROUTE_BOSSES[route]?.[region];
      text += `\n\n${R.icon} ${changed ? '길이 바뀌었다 — ' : ''}「${R.name}」. ${R.enter}`;
      tags.push({ text: `${R.icon} ${R.name}`, tone: 'gold' });
      if (boss) tags.push({ text: `${REGRESSION_ROUTE_BOSS_DAY_IN_REGION}일째 — 길목의 군주 「${boss.name}」`, tone: 'bad' });
    }
    return { ...next, scene: regressionResultScene(getRegressionRegion(region).name, text, tags) };
  }
  // 1.186.0~ 메인 스토리 — 정해진 날 확정 등장
  const story = regressionMainStoryFor(run);
  if (story) return { ...run, today: null, pendingEvent: story.id };
  // 1.194.0~ 길목의 군주 — 루트별 확정 보스 (2~4지역 13일째)
  const rb = regressionRouteBossToday(run);
  if (rb) return { ...run, today: { kind: 'routeBoss', tier: 'boss', enemyKey: rb.key, routeBoss: rb.region, route: rb.route } };
  // 1.196.0~ 전생의 유품 — 지난 생이 쓰러진 날(또는 그 뒤 첫 빈 날)에 무덤을 만난다
  if (run.grave && !run.graveDone && run.day >= run.grave.day) return { ...run, today: { kind: 'grave' } };
  // 1.202.0~ 라이벌 회귀자 — 지역 1~3의 정해진 날
  if (regressionRivalToday(run)) return { ...run, today: { kind: 'rival' }, rivalMet: [...(run.rivalMet || []), run.region] };
  // 1.195.0~ 붉은 달의 날 — 지역 11일째, 반드시 전투 (적 강화 · 보상 2배)
  if (isRegressionRedMoonDay(run.day)) {
    const RM = REGRESSION_RED_MOON;
    const tier = isRegressionEliteOpen({ ...run, region }, region) && rng() < RM.eliteChance ? 'elite' : 'normal';
    const enemyKey = rollRegressionEnemy(region, tier, rng);
    if (enemyKey) return { ...run, today: { kind: tier === 'elite' ? 'elite' : 'battle', tier, enemyKey, redMoon: true } };
  }
  // 아침 — 하룻밤 자며 조금 회복 (하루 1회)
  if (run.healedDay !== run.day) run = { ...run, healedDay: run.day, hpPct: Math.min(1, (run.hpPct ?? 1) + (REGRESSION_DAY.dailyHealPct + (run.affinity ? aggregateRegressionCompanions(run).dailyHealPct : 0)) / 100) };
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
  if (kind === 'companion') {
    const cands = regressionCompanionCandidates(run, region);
    if (cands.length) {
      const c = cands[Math.floor(rng() * cands.length)];
      const q = regressionCompanionQuestFor(run, c.id);   // 1.200.0~ 호감이 쌓였으면 대화 대신 개인 퀘스트
      if (q) return { ...run, today: null, pendingEvent: q.id };
      return { ...run, today: { kind, companionId: c.id } };
    }
    kind = 'shelter';
  }
  if (kind === 'merchant') return { ...run, today: { kind }, shop: buildRegressionShopStock(run, rng) };
  if (kind === 'secret') return { ...run, today: { kind }, secretSeen: [...(run.secretSeen || []), region] };
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
  return { run: { ...startRegressionCombat({ ...run, today: null }, t.enemyKey, t.tier, t.redMoon ? { redMoon: true } : {}) }, ok: false, stat: st };
}
export function fightRegressionToday(run) {
  const t = run.today; if (!t?.enemyKey) return run;
  return startRegressionCombat({ ...run, today: null }, t.enemyKey, t.tier, t.routeBoss ? { routeBoss: t.routeBoss, route: t.route } : t.redMoon ? { redMoon: true } : {});
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
  rival: (r) => regressionRivalLine(r),
  secret: (r) => REGRESSION_SECRET_PLACES[r.region]?.hint || '',
  grave: (r) => `길가에 낯익은 돌무덤이 있다. 비석에 새겨진 것은 — 내 이름이다.\n${r.grave?.life || '?'}번째 생의 내가 ${r.grave?.cause || '이곳에서'} 쓰러진 자리. 흙 아래에서 무언가 희미하게 빛난다.`,
  routeBoss: (r) => { const b = REGRESSION_ROUTE_BOSSES[r.today.route]?.[r.today.routeBoss]; return b ? `${b.line}\n\n길목의 군주 「${b.name}」. 이 길을 계속 가려면 피할 수 없다.` : ''; },
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
  return REGRESSION_EVENTS.find(e => e.id === id) || REGRESSION_MAIN_STORY.find(e => e.id === id) || REGRESSION_COMPANION_QUESTS.find(e => e.id === id) || null;
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


// ============================================
// 1.187.0~ 시작 특성 (원작 「생환·노잣돈·시작 무공」 → 판타지 각색)
// ============================================
// 잔향(회귀할 때마다 쌓이는 영구 재화)으로 영구 해금 → 한 생에 최대 2개를 골라 들고 시작.
// 밸런스는 REGRESSION_TRAIT_TUNING + REGRESSION_START_TRAITS 한 곳.
export const REGRESSION_TRAIT_TUNING = {
  slots: 2,                          // 기본 장착 슬롯 (1.191.0~ 잔향으로 3·4칸 확장)
  slotCosts: [120, 300],             // 3번째 · 4번째 슬롯 해금 비용
  maxLv: 5,
  upgradeMult: [1, 1.5, 2, 2.5],     // Lv.2~5 강화 비용 = 해금 비용 × 배율
  reviveHpPct: 0.3,
  echo: { per10Fame: 1, perStory: 2, spireRound: 3, victory: 10, newEnding: 10, min: 3 },
};
// fxAt(lv) — 레벨별 효과 (1.191.0~ 특성 강화 Lv.1~5). desc(lv)는 그 레벨의 설명
export const REGRESSION_START_TRAITS = [
  { id: 'st_revive', name: '생환', icon: '🕯', cost: 40,
    fxAt: (lv) => ({ revives: 1, reviveHpPct: 0.3 + 0.05 * (lv - 1) }),
    desc: (lv) => `한 생에 한 번, 전투에서 쓰러지면 HP ${30 + 5 * (lv - 1)}%로 일어난다 (첨탑 제외)` },
  { id: 'st_purse', name: '노잣돈', icon: '💰', cost: 12,
    fxAt: (lv) => ({ gold: 150 + 50 * (lv - 1) }),
    desc: (lv) => `시작 은화 +${150 + 50 * (lv - 1)}` },
  { id: 'st_talent', name: '타고난 재능', icon: '📊', cost: 30,
    fxAt: (lv) => ({ startPoints: 2 + Math.floor((lv - 1) / 2) }),
    desc: (lv) => `시작 능력치 배분 +${2 + Math.floor((lv - 1) / 2)}` },
  { id: 'st_tome', name: '비전서', icon: '📕', cost: 30,
    fxAt: (lv) => ({ startSkills: lv >= 5 ? 2 : 1, startExp: (lv - 1) * 10, startSkillLvUps: lv >= 4 ? 2 : lv >= 2 ? 1 : 0 }),
    desc: (lv) => {
      const n = lv >= 5 ? 2 : 1, ups = lv >= 4 ? 2 : lv >= 2 ? 1 : 0;
      return `시작 스킬을 ${n}개 더 고른다${ups ? ` · 고른 스킬 앞 ${ups}개가 Lv.2로 시작` : ''}${lv > 1 ? ` · 시작 경험치 +${(lv - 1) * 10}` : ''}`;
    } },
  { id: 'st_luck', name: '기연의 별', icon: '✨', cost: 20,
    fxAt: (lv) => ({ fortuneBonus: 4 + 2 * (lv - 1) }),
    desc: (lv) => `기연이 더 자주 찾아온다 (기연 가중 +${4 + 2 * (lv - 1)})` },
  { id: 'st_bond', name: '익숙한 얼굴', icon: '🤝', cost: 20,
    fxAt: (lv) => ({ affinityAll: 20 + 5 * (lv - 1) }),
    desc: (lv) => `모든 동료의 호감 +${20 + 5 * (lv - 1)}으로 시작한다 (전생에서 알던 사이)` },
];
export function getRegressionStartTrait(id) { return REGRESSION_START_TRAITS.find(t => t.id === id) || null; }
// 특성 레벨 — 1.187.0 구세이브는 unlockedTraits만 있으므로 Lv.1로 본다
export function regressionTraitLevel(metaR, id) {
  const lv = metaR?.traitLv?.[id];
  if (lv) return lv;
  return (metaR?.unlockedTraits || []).includes(id) ? 1 : 0;
}
export function regressionTraitSlots(metaR) { return REGRESSION_TRAIT_TUNING.slots + (metaR?.traitSlotsBought || 0); }
// 다음 행동 비용 — Lv.0이면 해금 비용, 그 외 강화 비용, 만렙이면 null
export function regressionTraitNextCost(metaR, id) {
  const t = getRegressionStartTrait(id); if (!t) return null;
  const lv = regressionTraitLevel(metaR, id);
  if (lv <= 0) return t.cost;
  if (lv >= REGRESSION_TRAIT_TUNING.maxLv) return null;
  return Math.round(t.cost * REGRESSION_TRAIT_TUNING.upgradeMult[lv - 1]);
}
export function regressionNextSlotCost(metaR) {
  return REGRESSION_TRAIT_TUNING.slotCosts[metaR?.traitSlotsBought || 0] ?? null;
}
export function aggregateRegressionStartTraits(ids = [], metaR = null) {
  const fx = { revives: 0, reviveHpPct: 0, gold: 0, startPoints: 0, startSkills: 0, startExp: 0, startSkillLvUps: 0, fortuneBonus: 0, affinityAll: 0 };
  for (const id of ids) {
    const t = getRegressionStartTrait(id); if (!t) continue;
    const lv = Math.max(1, metaR ? regressionTraitLevel(metaR, id) : 1);
    for (const [k, v] of Object.entries(t.fxAt(lv))) fx[k] = k === 'reviveHpPct' ? Math.max(fx[k], v) : (fx[k] || 0) + v;
  }
  return fx;
}
function applyRegressionStartTraits(run, ids = [], metaR = null) {
  const picked = (ids || []).filter(id => getRegressionStartTrait(id)).slice(0, regressionTraitSlots(metaR));
  const fx = aggregateRegressionStartTraits(picked, metaR);
  const affinity = { ...(run.affinity || {}) };
  if (fx.affinityAll) for (const c of REGRESSION_COMPANIONS) affinity[c.id] = Math.min(100, (affinity[c.id] || 0) + fx.affinityAll);
  let next = {
    ...run, startTraits: picked, revives: fx.revives, reviveHpPct: fx.reviveHpPct || REGRESSION_TRAIT_TUNING.reviveHpPct,
    gold: (run.gold || 0) + fx.gold,
    fortuneBonus: (run.fortuneBonus || 0) + fx.fortuneBonus,
    affinity,
  };
  if (fx.startExp) next = gainRegressionExp(next, fx.startExp).run;
  if (fx.startSkillLvUps) {
    const lvMap = { ...(next.skillLv || {}) };
    for (const id of regressionRunSkills(next).slice(0, fx.startSkillLvUps)) lvMap[id] = Math.max(2, lvMap[id] || 1);
    next.skillLv = lvMap;
  }
  return next;
}
// 잔향 — 생을 마칠 때. 명성·메인 스토리·첨탑 진행·정복·새 엔딩
export function regressionEchoGain(metaR, run) {
  const E = REGRESSION_TRAIT_TUNING.echo;
  const stories = (run.seenEvents || []).filter(id => id.startsWith('ms_')).length;
  const rounds = run.spireRound || 0;
  const end = regressionEndingFor(run);
  const newEnding = end && !(metaR?.endings || []).includes(end.id);
  const raw = Math.max(E.min, Math.floor((run.fame || 0) / 10) * E.per10Fame + stories * E.perStory + rounds * E.spireRound
    + (run.over === 'victory' ? E.victory : 0) + (newEnding ? E.newEnding : 0));
  return Math.round(raw * regressionOathEchoMult(run.oaths));   // 1.197.0~ 황혼의 맹세 배율
}
// 해금(Lv.0→1) 또는 강화(Lv.n→n+1)
export function unlockRegressionStartTrait(metaR, id) {
  const r = { ...EMPTY_REGRESSION, ...metaR };
  const cost = regressionTraitNextCost(r, id);
  if (cost == null || (r.echo || 0) < cost) return metaR;
  const lv = regressionTraitLevel(r, id) + 1;
  return { ...r, echo: r.echo - cost, traitLv: { ...(r.traitLv || {}), [id]: lv },
    unlockedTraits: (r.unlockedTraits || []).includes(id) ? r.unlockedTraits : [...(r.unlockedTraits || []), id] };
}
export function buyRegressionTraitSlot(metaR) {
  const r = { ...EMPTY_REGRESSION, ...metaR };
  const cost = regressionNextSlotCost(r);
  if (cost == null || (r.echo || 0) < cost) return metaR;
  return { ...r, echo: r.echo - cost, traitSlotsBought: (r.traitSlotsBought || 0) + 1 };
}
export function toggleRegressionStartTrait(metaR, id) {
  const r = { ...EMPTY_REGRESSION, ...metaR };
  const eq = r.equippedTraits || [];
  if (eq.includes(id)) return { ...r, equippedTraits: eq.filter(x => x !== id) };
  if (regressionTraitLevel(r, id) <= 0 || eq.length >= regressionTraitSlots(r)) return metaR;
  return { ...r, equippedTraits: [...eq, id] };
}


// ============================================
// 1.188.0~ 떠돌이 상인에게 장비 판매 (PM 요청: 미사용 장비 판매)
// ============================================
export const REGRESSION_SELL_PRICE = { normal: 40, advanced: 90, treasure: 190, unique: 300, route: 250 };
export function regressionGearSellPrice(id) { return REGRESSION_SELL_PRICE[REGRESSION_GEAR[id]?.grade] || 0; }
// 장착 중이 아닌 가방 장비 1개 판매
export function sellRegressionGear(run, id) {
  const bag = [...(run.bag || [])];
  const equipped = Object.values(run.gear || {}).filter(Boolean);
  const owned = bag.filter(x => x === id).length;
  const inUse = equipped.filter(x => x === id).length;
  if (owned - inUse <= 0) return { run, sold: 0 };
  bag.splice(bag.lastIndexOf(id), 1);
  const price = regressionGearSellPrice(id);
  return { run: { ...run, bag, gold: (run.gold || 0) + price, log: [...(run.log || []), `D${run.day}: 판매 — ${REGRESSION_GEAR[id]?.name} (+${price}G)`] }, sold: price };
}
export function regressionSellableGear(run) {
  const bag = run?.bag || [];
  const equipped = Object.values(run?.gear || {}).filter(Boolean);
  const out = [];
  for (const id of [...new Set(bag)]) {
    const n = bag.filter(x => x === id).length - equipped.filter(x => x === id).length;
    if (n > 0) out.push({ id, count: n });
  }
  return out;
}


// ============================================
// 1.190.0~ 동료가 따라온다 (PM 결정) — 호감 40(동행)이 되면 지역이 바뀌어도 함께 다닌다
// ============================================
export function regressionCompanionFollowers(run) {
  return REGRESSION_COMPANIONS.filter(c => { const a = run?.affinity?.[c.id] || 0; return a >= 40 && a < 100; });
}
// 오늘 만날 수 있는 동료 — 이 지역의 동료(맹약 전) + 따라오는 동료
export function regressionCompanionCandidates(run, region) {
  const here = regressionCompanionAt(region);
  const out = regressionCompanionFollowers(run);
  if (here && (run?.affinity?.[here.id] || 0) < 100 && !out.includes(here)) out.push(here);
  return out;
}
// 1.190.0~ 전투 보정 합산 — 장비(유니크) + 동료 (relicBonus 어휘: dmgDealt/dmgTaken/critRate/dodge/lifesteal)
export function regressionCombatBonus(run) {
  const out = { ...regressionGearFx(run) };
  const c = run?.affinity ? aggregateRegressionCompanions(run) : {};
  for (const k of ['dmgDealt', 'dmgTaken', 'critRate', 'dodge']) if (c[k]) out[k] = (out[k] || 0) + c[k];
  return out;
}


// ============================================
// 1.191.0~ 출발 준비물 (PM 결정 B) — 매 생 출발 전 잔향으로 사는 일회용 준비. 종류당 한 생 1개
// ============================================
export const REGRESSION_PROVISIONS = [
  { id: 'pv_potions', name: '회복약 꾸러미', icon: '🧪', cost: 8, desc: '회복 물약(중) 2개를 들고 시작한다' },
  { id: 'pv_gear', name: '낡은 장비 상자', icon: '🎁', cost: 12, desc: '고급~보물 장비 1개를 들고 시작한다' },
  { id: 'pv_flame', name: '여분의 불꽃', icon: '🔥', cost: 15, desc: '생명의 불꽃 +1 (강한 전투 태세를 한 번 더)' },
  { id: 'pv_tutor', name: '경험의 서', icon: '📖', cost: 10, desc: '경험치 +30으로 시작한다' },
  { id: 'pv_rumor', name: '앞선 소문', icon: '📣', cost: 10, desc: '시작 명성 +10' },
];
export function getRegressionProvision(id) { return REGRESSION_PROVISIONS.find(p => p.id === id) || null; }
export function regressionProvisionsCost(ids = []) {
  return [...new Set(ids)].reduce((a, id) => a + (getRegressionProvision(id)?.cost || 0), 0);
}
export function applyRegressionProvisions(run, ids = [], rng = Math.random) {
  let next = { ...run, potions: { ...(run.potions || {}) } };
  for (const id of [...new Set(ids || [])]) {
    if (id === 'pv_potions') next.potions.hp_medium = (next.potions.hp_medium || 0) + 2;
    else if (id === 'pv_gear') next = addRegressionGear(next, rollRegressionGear(REGRESSION_ECON.gradeWeights.event, rng));
    else if (id === 'pv_flame') next.flames = (next.flames ?? 3) + 1;
    else if (id === 'pv_tutor') next = gainRegressionExp(next, 30).run;
    else if (id === 'pv_rumor') next.fame = (next.fame || 0) + 10;
  }
  return { ...next, provisions: [...new Set(ids || [])] };
}


// ============================================
// 1.194.0~ 성향 루트 (PM 결정 「성향 루트제」) — 진행 과정에 따라 보스·보상·첨탑·엔딩이 달라진다
// ============================================
// 2지역부터 지역에 들어설 때마다 가장 높은 성향(regressionTopTrait)으로 길이 정해진다 (동점·0 = 방랑의 길).
// 길마다: 지역 13일째 「길목의 군주」(확정 보스) → 승리 보상(능력치 / 여정 장비 / 첨탑 효과) → 첨탑 3·4층 구성 → 엔딩.
// 밸런스는 REGRESSION_ROUTE_TUNING 한 곳.
export const REGRESSION_ROUTE_FROM_REGION = 2;
export const REGRESSION_ROUTE_BOSS_DAY_IN_REGION = 13;
export const REGRESSION_ROUTE_TUNING = {
  bossHpMult: { 2: 0.6, 3: 0.75, 4: 0.75 },   // 길목의 군주 HP = 지역 기준 보스(아래 ref) × 이 값 (지역·날짜 배율은 전투가 따로 곱함)
  bossDmgMult: { 2: 0.7, 3: 0.8, 4: 0.8 },    // 공격력 = 기준 보스 평균 최대 피해 × 이 값
  unmaskedHpMult: 0.85,      // 진실: 「가면 벗기기」 — 첨탑 3·4층 HP
  apostleBloodHpMult: 0.9,   // 힘: 「사도의 피」 — 첨탑 전 층 HP (내가 더 세게 친다)
  allyHpCutPerCompanion: 0.04, allyHpCutMax: 3,  // 유대: 동행 중인 동료 1명당 첨탑 적 HP -4% (최대 3명)
  alliesRallyRestPct: 10,    // 유대: 「원군」 — 첨탑 층 사이 HP +10%p
};
export const REGRESSION_ROUTE_BOSS_REF = { 2: 'twilightChild', 3: 'oblivionSealer', 4: 'nakzelionShadow' };
export const REGRESSION_ROUTES = {
  truth: { id: 'truth', name: '진실의 길', icon: '📜', color: '#9cc4e8', enter: '황혼을 부른 자를 좇는다. 진실을 덮으려는 자들이 길목을 지킨다.', spire: '3층의 「가면 쓴 첨탑 주인」을 넘으면 꼭대기에서 「첫 번째 회귀자」가 기다린다' },
  power: { id: 'power', name: '힘의 길', icon: '🗡', color: '#e0705c', enter: '황혼의 힘을 거둬들이며 나아간다. 힘을 탐하는 자들이 앞을 막는다.', spire: '3층은 「황혼의 사도」가 지키고, 꼭대기에서 「황혼의 옥좌」가 새 주인을 기다린다' },
  bond: { id: 'bond', name: '유대의 길', icon: '🤝', color: '#9ad4a3', enter: '함께 걷는 이들을 지키며 나아간다. 외로움에 삼켜진 자들이 길목에 서 있다.', spire: '동행 중인 동료가 원군으로 오른다 (1명당 적 HP -4%). 꼭대기의 주인은 망자들을 거느렸다' },
  none: { id: 'none', name: '방랑의 길', icon: '🧭', color: '#c9b8a4', enter: '어느 쪽에도 기울지 않은 채 걷는다. 이름 없는 강자들이 길목을 차지하고 있다.', spire: '정해진 4연전 — 꼭대기에 「황혼의 첨탑 주인」' },
};
export function regressionRouteFor(run) { return regressionTopTrait(run) || 'none'; }
// key = 일러스트를 빌려 오는 적 / name·line = 이 길에서의 정체
export const REGRESSION_ROUTE_BOSSES = {
  truth: {
    2: { key: 'champ_forest_witch', name: '진실을 삼킨 마녀', line: '숲 한가운데서 웃음소리가 번진다. "그 편지를 읽었구나. 그럼 돌려보낼 수 없지."' },
    3: { key: 'ancientPriest', name: '기록을 불태우는 사제', line: '서고 앞에 횃불을 든 사제가 서 있다. "열세 번째 기록은 쓰이지 않는다."' },
    4: { key: 'champ_frost_elite4', name: '얼어붙은 열두 번째 회귀자', line: '균열 가장자리, 얼음에 갇힌 사내가 눈을 뜬다. 열두 번째 일지의 필체와 같은 손이 지팡이를 든다.' },
  },
  power: {
    2: { key: 'champ_forest_elite2', name: '망자를 삼키는 폭군', line: '망자들의 행렬 끝에서 거대한 그림자가 그들을 집어삼키고 있다. "그 힘은 내 것이다."' },
    3: { key: 'champ_frost_boss3', name: '황혼을 먹은 한기룡', line: '깨진 봉인 너머에서 붉게 물든 용이 고개를 든다. 봉인의 힘을 먼저 먹은 것은 그였다.' },
    4: { key: 'demonApostle', name: '황혼의 사도', line: '사도가 손뼉을 친다. "손을 잡았으니 시험을 치러야지. 옥좌는 한 자리뿐이다."' },
  },
  bond: {
    2: { key: 'champ_forest_boss1', name: '시든 자들의 어머니', line: '잃어버린 아이들을 찾아 헤매는 거대한 망령. 세레나가 이를 악문다. "저건… 구할 수 없어요."' },
    3: { key: 'champ_frost_boss2', name: '홀로 남은 빙왕', line: '신전 지하, 신하를 모두 잃은 왕이 얼음 옥좌에서 일어선다. "너도 결국 혼자가 될 것이다."' },
    4: { key: 'champ_frost_boss4', name: '모든 것을 얼린 군주', line: '균열 앞의 군주는 곁에 있던 모든 이를 얼려 조각으로 남겼다. "함께라는 건 약점일 뿐."' },
  },
  none: {
    2: { key: 'forestTyrant', name: '숲의 폭군', line: '썩은 숲의 주인이 길을 막는다. 이유는 없다. 그저 지나가는 자를 부순다.' },
    3: { key: 'champ_frost_elite3', name: '빙하 폭군', line: '신전 회랑이 통째로 얼어 있다. 그 끝에서 빙하가 일어선다.' },
    4: { key: 'champ_forest_boss4', name: '광기의 종말 마에스트로', line: '균열 앞, 지휘봉을 든 자가 황혼을 연주하고 있다. 마지막 악장에 당신의 비명이 필요하다고 한다.' },
  },
};
// 길목의 군주 보상 — 지역 2: 능력치 / 지역 3: 여정 장비 / 지역 4: 첨탑 효과 (storyFlags)
export const REGRESSION_ROUTE_REWARDS = {
  truth: { 2: { stats: { 통찰: 2, 학식: 1 } }, 3: { gear: 'route_truth_lens' }, 4: { flag: 'lordUnmasked', text: '첨탑의 가면이 벗겨진다 — 3·4층 HP -15%' } },
  power: { 2: { stats: { 근력: 2, 검술: 1 } }, 3: { gear: 'route_dusk_blade' }, 4: { flag: 'apostleBlood', text: '사도의 피 — 첨탑 전 층 HP -10%' } },
  bond: { 2: { affinityAll: 20 }, 3: { gear: 'route_oath_cloak' }, 4: { flag: 'alliesRally', text: '원군의 약속 — 첨탑 층 사이 HP +10%' } },
  none: { 2: { gold: 150, potion: 'hp_medium' }, 3: { gear: 'route_wander_boots' }, 4: { flames: 1, text: '홀로 선 각오 — 생명의 불꽃 +1' } },
};
function avgMaxDmg(e) {
  const atk = (e?.patterns || []).filter(p => p.type !== 'defend' && p.dmg);
  return atk.length ? atk.reduce((a, p) => a + p.dmg[1], 0) / atk.length : 10;
}
// 일러스트는 artKey 적, 수치는 기준(ref) 적에 맞춘다
function regressionScaleEnemy(artKey, ref, name, hpMult = 1, dmgMult = 1) {
  const art = ENEMIES[artKey] || ref;
  const k = (avgMaxDmg(ref) / avgMaxDmg(art)) * dmgMult;
  const hp = Math.round(ref.hp * hpMult);
  return {
    ...art, name, hp, tier: 'boss', isBoss: true,
    patterns: (art.patterns || []).map(p => ({ ...p, dmg: p.dmg ? p.dmg.map(d => Math.round(d * k)) : p.dmg, defense: p.defense ? Math.round(p.defense * hp / art.hp) : p.defense })),
  };
}
export function regressionRouteBossToday(run) {
  const region = regressionRegionForDay(run.day);
  if (region < REGRESSION_ROUTE_FROM_REGION || region !== run.region) return null;
  const day = (region - 1) * REGRESSION_DAY.regionDays + REGRESSION_ROUTE_BOSS_DAY_IN_REGION;
  if (run.day !== day || (run.routeBossDone || []).includes(region)) return null;
  const route = run.route || 'none';
  const b = REGRESSION_ROUTE_BOSSES[route]?.[region];
  return b ? { key: b.key, region, route } : null;
}
export function buildRegressionRouteBoss(route, region) {
  const b = REGRESSION_ROUTE_BOSSES[route]?.[region]; if (!b) return null;
  const T = REGRESSION_ROUTE_TUNING;
  return { ...regressionScaleEnemy(b.key, ENEMIES[REGRESSION_ROUTE_BOSS_REF[region]], b.name, T.bossHpMult[region] ?? 0.75, T.bossDmgMult[region] ?? 0.8), routeBoss: region };
}
// 길목의 군주 승리 — 보상 적용. 반환 { run, tags }
export function applyRegressionRouteReward(run, route, region) {
  const rw = REGRESSION_ROUTE_REWARDS[route]?.[region] || {};
  let next = { ...run, routeBossDone: [...(run.routeBossDone || []), region], statBonus: { ...(run.statBonus || {}) }, storyFlags: { ...(run.storyFlags || {}) } };
  const tags = [];
  if (rw.stats) for (const [k, v] of Object.entries(rw.stats)) { next.statBonus[k] = (next.statBonus[k] || 0) + v; tags.push({ text: `${k} +${v} (영구)`, tone: 'gold' }); }
  if (rw.affinityAll) {
    const aff = { ...(next.affinity || {}) };
    for (const c of REGRESSION_COMPANIONS) if (aff[c.id] > 0) aff[c.id] = Math.min(100, aff[c.id] + rw.affinityAll);
    next.affinity = aff; tags.push({ text: `만난 동료 모두 호감 +${rw.affinityAll}`, tone: 'gold' });
  }
  if (rw.gold) { next.gold = (next.gold || 0) + rw.gold; tags.push({ text: `은화 +${rw.gold}`, tone: 'good' }); }
  if (rw.potion) { next = applyRegressionLoot(next, { potion: rw.potion }); tags.push({ text: POTIONS[rw.potion]?.name || '회복약', tone: 'good' }); }
  if (rw.gear) { next = addRegressionGear(next, rw.gear); tags.push({ text: `${regressionGearLabel(rw.gear)} 획득`, tone: 'gold' }); }
  if (rw.flag) next.storyFlags[rw.flag] = true;
  if (rw.flames) next.flames = regressionRunFlames(next) + rw.flames;
  if (rw.text) tags.push({ text: rw.text, tone: 'gold' });
  return { run: next, tags };
}
// 첨탑 — 길마다 3·4층이 다르다 (1·2층은 공통)
export const REGRESSION_SPIRE_ROUTES = {
  none: ['iceMage', 'twilightChild', 'oblivionSealer', 'spireLord'],
  truth: ['iceMage', 'twilightChild', 'falseLord', 'firstSelf'],
  power: ['iceMage', 'twilightChild', 'duskApostle', 'duskThrone'],
  bond: ['iceMage', 'twilightChild', 'oblivionSealer', 'hollowLord'],
};
// 특수 층: art = 일러스트를 빌려 오는 적, ref = 수치 기준
const REGRESSION_SPIRE_SPECIAL = {
  falseLord: { art: 'spireLord', ref: 'spireLord', name: '가면 쓴 첨탑 주인', hpMult: 0.8, dmgMult: 0.9 },
  firstSelf: { art: 'nakzelionShadow', ref: 'spireLord', name: '첫 번째 회귀자', hpMult: 0.95, dmgMult: 1 },
  duskApostle: { art: 'demonApostle', ref: 'oblivionSealer', name: '황혼의 사도', hpMult: 0.95, dmgMult: 0.88 },
  duskThrone: { art: 'champ_forest_boss4', ref: 'spireLord', name: '황혼의 옥좌', hpMult: 1, dmgMult: 1.05 },
  hollowLord: { art: 'champ_forest_boss2', ref: 'spireLord', name: '망자를 거느린 첨탑 주인', hpMult: 1.1, dmgMult: 1.05 },
};
export function regressionSpireChain(run) {
  return REGRESSION_SPIRE_ROUTES[run?.spireRoute] || REGRESSION_SPIRE_CHAIN;
}
function spireBase(key) {
  if (key === 'spireLord') return REGRESSION_SPIRE_LORD;
  const T = REGRESSION_TUNING, base = ENEMIES[key];
  return { ...base, hp: Math.round(base.hp * T.spireHpMult), patterns: base.patterns.map(p => ({ ...p, dmg: p.dmg.map(d => Math.round(d * T.spireAtkMult)) })) };
}
// 반환 { key: 일러스트 키, obj: 실효 적 } — 마지막 층은 기억 조각·동료(오렌) 약점 규칙을 그대로 받는다
export function regressionSpireEnemyFor(run, round, forceWeak = false) {
  const chain = regressionSpireChain(run);
  const id = chain[round]; if (!id) return null;
  const T = REGRESSION_TUNING, RT = REGRESSION_ROUTE_TUNING;
  const sp = REGRESSION_SPIRE_SPECIAL[id];
  let key = id, obj;
  if (sp) { key = sp.art; obj = regressionScaleEnemy(sp.art === 'spireLord' ? null : sp.art, spireBase(sp.ref), sp.name, sp.hpMult, sp.dmgMult); if (sp.art === 'spireLord') obj = { ...REGRESSION_SPIRE_LORD, ...obj, patterns: REGRESSION_SPIRE_LORD.patterns.map(p => ({ ...p, dmg: p.dmg.map(d => Math.round(d * sp.dmgMult)) })) }; }
  else obj = spireBase(id);
  let hpMult = 1;
  const last = round === chain.length - 1;
  if (last && (forceWeak || (run.memoryCount || 0) >= T.spireWeaknessMemories)) { hpMult /= 1 + T.spireWeaknessTakenPct / 100; obj = { ...obj, weaknessRevealed: true }; }
  const f = run.storyFlags || {};
  if (f.lordUnmasked && (id === 'falseLord' || id === 'firstSelf')) hpMult *= RT.unmaskedHpMult;
  if (f.apostleBlood && run.spireRoute === 'power') hpMult *= RT.apostleBloodHpMult;
  if (run.spireRoute === 'bond') hpMult *= 1 - RT.allyHpCutPerCompanion * Math.min(RT.allyHpCutMax, regressionCompanionFollowers(run).length);
  return { key, obj: { ...obj, hp: Math.round(obj.hp * hpMult) } };
}


// ============================================
// 1.195.0~ 붉은 달의 날 (PM 선택 재미 요소 1) — 지역마다 11일째(D11·D26·D41·D56)
// ============================================
// 그날은 반드시 전투 카드(강적 30%). 적 HP·피해 ×enemyMult, 승리 시 명성·경험치·은화 ×rewardMult, 전리품 2번 굴림.
export const REGRESSION_RED_MOON = { dayInRegion: 11, enemyMult: 1.15, rewardMult: 2, eliteChance: 0.3 };
export function isRegressionRedMoonDay(day = 1) {
  return ((day - 1) % REGRESSION_DAY.regionDays) + 1 === REGRESSION_RED_MOON.dayInRegion;
}
// 다음 붉은 달까지 남은 날 (0 = 오늘)
export function regressionDaysToRedMoon(day = 1) {
  const pos = ((day - 1) % REGRESSION_DAY.regionDays) + 1;
  const d = REGRESSION_RED_MOON.dayInRegion - pos;
  return d >= 0 ? d : d + REGRESSION_DAY.regionDays;
}


// ============================================
// 1.196.0~ 전생의 유품 (PM 선택 재미 요소 2) — 죽음이 다음 생의 보상이 된다
// ============================================
// 죽은 생의 가장 좋은 장비 1개 + 은화 일부가 그날에 묻힌다. 다음 생 같은 날(그날 확정 일정이 있으면 그 뒤 첫날) 무덤 카드.
// 회수 = 장비·은화·경험치 / 두고 간다 = 명성 (무덤은 다음 생에도 남는다). 새로 죽으면 무덤은 새것으로 바뀐다.
export const REGRESSION_GRAVE = { goldPct: 0.3, exp: 30, leaveFame: 5 };
const GRADE_RANK = { route: 5, unique: 4, treasure: 3, advanced: 2, normal: 1 };
export function buildRegressionGrave(run, life = 1) {
  const pool = regressionEquippedGear(run).length ? regressionEquippedGear(run) : (run.bag || []).filter(id => REGRESSION_GEAR[id]);
  const gearId = pool.slice().sort((a, b) => (GRADE_RANK[REGRESSION_GEAR[b].grade] || 0) - (GRADE_RANK[REGRESSION_GEAR[a].grade] || 0))[0] || null;
  const gold = Math.round((run.gold || 0) * REGRESSION_GRAVE.goldPct);
  const lastLine = [...(run.log || [])].reverse().find(l => /쓰러짐|패배/.test(l)) || '';
  const killer = (lastLine.match(/: (.+?)에게 쓰러짐/) || [])[1];
  const day = Math.max(2, Math.min(run.day, (run.maxDays || 60) - 1));
  return { gearId, gold, day, life, cause: killer ? `${killer}에게` : run.over === 'spireLose' ? '첨탑 앞에서' : run.over === 'timeout' ? '황혼 속에서' : '' };
}
export function resolveRegressionGrave(run, take) {
  const g = run.grave;
  if (!g) return { run: passRegressionDay({ ...run, graveDone: true }), tags: [] };
  if (!take) {
    const next = passRegressionDay({ ...run, graveDone: true, fame: (run.fame || 0) + REGRESSION_GRAVE.leaveFame }, '전생의 무덤에 꽃을 놓음');
    return { run: next, tags: [{ text: `명성 +${REGRESSION_GRAVE.leaveFame}`, tone: 'gold' }, { text: '유품은 다음 생에도 남는다', tone: 'good' }] };
  }
  let next = { ...run, graveDone: true, graveRecovered: true, gold: (run.gold || 0) + (g.gold || 0) };
  const tags = [];
  if (g.gearId && REGRESSION_GEAR[g.gearId]) { next = addRegressionGear(next, g.gearId); tags.push({ text: `${regressionGearLabel(g.gearId)} 회수`, tone: 'gold' }); }
  if (g.gold) tags.push({ text: `은화 +${g.gold}`, tone: 'good' });
  const e = gainRegressionExp(next, REGRESSION_GRAVE.exp); next = e.run;
  tags.push({ text: `경험치 +${REGRESSION_GRAVE.exp}`, tone: 'good' });
  if (e.levelUps > 0) tags.push({ text: `레벨 상승 ${e.from}→${next.level}`, tone: 'gold' });
  return { run: passRegressionDay(next, '전생의 유품 회수'), tags };
}


// ============================================
// 1.197.0~ 황혼의 맹세 (PM 선택 재미 요소 3) — 출발 전 스스로 족쇄를 건다 → 잔향 배율
// ============================================
// 여러 개를 함께 걸 수 있다. 잔향 = 기본 잔향 × (1 + 맹세 보너스 합). 해금: 회귀 REGRESSION_OATH_UNLOCK_LOOPS번 이후.
export const REGRESSION_OATH_UNLOCK_LOOPS = 2;
export const REGRESSION_OATHS = {
  blood:    { name: '핏빛 서약', icon: '🩸', echo: 0.25, desc: '적의 피해 +20%', fx: { enemyDmg: 0.2 } },
  iron:     { name: '강철 서약', icon: '🛡', echo: 0.25, desc: '적의 HP +20%', fx: { enemyHp: 0.2 } },
  dusk:     { name: '짧아지는 해', icon: '🌒', echo: 0.2, desc: '날이 갈수록 적이 강해지는 속도 ×1.5', fx: { rampMult: 1.5 } },
  empty:    { name: '빈손 서약', icon: '🪙', echo: 0.15, desc: '시작 은화 0 · 전투 은화 -30%', fx: { startGoldZero: true, goldMult: 0.7 } },
  lonely:   { name: '고독 서약', icon: '🕯', echo: 0.15, desc: '동료 호감 획득 절반', fx: { affinityMult: 0.5 } },
  nameless: { name: '무명 서약', icon: '🎭', echo: 0.2, desc: '첨탑 명성 요구 +30', fx: { fameGate: 30 } },
  sealed:   { name: '봉인 서약', icon: '🔒', echo: 0.15, desc: '시작 스킬 1개 적게', fx: { startSkills: -1 } },
};
export function regressionOathFx(ids = []) {
  const fx = { enemyDmg: 0, enemyHp: 0, rampMult: 1, startGoldZero: false, goldMult: 1, affinityMult: 1, fameGate: 0, startSkills: 0 };
  for (const id of ids || []) {
    const o = REGRESSION_OATHS[id]?.fx; if (!o) continue;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'boolean') fx[k] = fx[k] || v;
      else if (['rampMult', 'goldMult', 'affinityMult'].includes(k)) fx[k] *= v;
      else fx[k] += v;
    }
  }
  return fx;
}
export function regressionOathEchoMult(ids = []) {
  return 1 + (ids || []).reduce((a, id) => a + (REGRESSION_OATHS[id]?.echo || 0), 0);
}
export function regressionFameGate(run) {
  return REGRESSION_TUNING.fameGate + regressionOathFx(run?.oaths).fameGate;
}
// 전투 적 배율 { hp, dmg } — 날짜 강화(짧아지는 해 반영) × 맹세 (첨탑은 날짜 강화 없음)
export function regressionOathEnemyMult(run, inSpire = false) {
  const fx = regressionOathFx(run?.oaths);
  const day = inSpire ? 1 : 1 + (regressionDayEnemyMult(run.day) - 1) * fx.rampMult;
  return { hp: day * (1 + fx.enemyHp), dmg: day * (1 + fx.enemyDmg) };
}


// ============================================
// 1.198.0~ 엔딩 도감 + 에필로그 (PM 선택 재미 요소 4)
// ============================================
// 엔딩마다 후일담(그 후) + 수집 보상: 모은 엔딩 수가 단계에 닿으면 잔향 (settleRegression이 정산 — 정산 결과 meta에 반영)
export const REGRESSION_ENDING_MILESTONES = [{ n: 3, echo: 30 }, { n: 6, echo: 60 }, { n: 10, echo: 100 }, { n: 14, echo: 200 }];
export const REGRESSION_EPILOGUES = {
  ending_spire: '그 후 — 대륙 사람들은 황혼이 왜 사라졌는지 모른다. 다만 매년 그날이 오면, 마을 언덕 위 이름 없는 비석에 누군가 꽃을 놓고 간다.',
  ending_loop_end: '그 후 — 기억은 모두 흩어졌다. 여명의 마을에서 눈을 뜬 청년은 자신이 누구였는지 모른다. 다만 첨탑이 있던 자리를 보면 이유 없이 눈물이 난다.',
  ending_truth: '그 후 — 「회귀자의 기록」 열세 권째가 서고에 꽂혔다. 오렌은 그 책을 금서로 지정하지 않았다. 다음에 올 누군가가 반드시 읽어야 하니까.',
  ending_heir: '그 후 — 대륙은 평화로워졌다. 밤이 오지 않는 땅에서 사람들은 새 군주를 「황혼의 왕」이라 부른다. 왕은 가끔 첨탑 꼭대기에서 아무도 없는 지평선을 오래 바라본다.',
  ending_knight: '그 후 — 북부 기사단의 깃발은 눈 속에서도 꺾이지 않았다. 발터는 신입 기사에게 늘 같은 말을 한다. "우리 단장은 한 번 죽어 본 사람이다. 그래서 겁이 없지."',
  ending_healer: '그 후 — 숲의 치료소에는 망령도 찾아온다. 세레나는 산 자와 죽은 자를 가리지 않고 돌본다. 나는 약초를 캐고, 그녀는 노래한다.',
  ending_archivist: '그 후 — 오렌의 책은 끝내 출간되지 않았다. 그는 원고를 내게 건네며 말했다. "다음 생에 자네가 읽게. 이번엔 자네가 마지막 장을 쓰는 거야."',
  ending_broker: '그 후 — 그림자 시장에서는 이제 마족과 인간이 같은 저울을 쓴다. 니아는 장부를 덮으며 웃는다. "손해 보는 장사는 안 한다니까. 너만 빼고."',
  ending_bond_road: '그 후 — 첨탑 아래 작은 마을이 생겼다. 길 위에서 만난 이들이 하나둘 모여든 곳이다. 이름은 아직 없다. 모두가 「우리 마을」이라고만 부른다.',
  ending_spire_name: '그 후 — 다음 생의 나는 첨탑 벽에서 내 이름을 찾아낼 것이다. 그리고 그 옆에 한 줄을 더 새기겠지. 「이번에는 넘는다.」',
  ending_lost_record: '그 후 — 빈 열세 번째 표지 위에 먼지가 쌓인다. 하지만 오렌은 매일 그 책을 닦는다. 언젠가 누군가 채워 넣을 것이라고 믿으면서.',
  ending_devoured: '그 후 — 대륙은 여전히 황혼에 잠겨 있다. 다만 첨탑 꼭대기의 그림자는 이제 낯익은 검을 쥐고 있다. 다음 회귀자는 나를 쓰러뜨려야 할 것이다.',
  ending_fallen_together: '그 후 — 첨탑 계단참에 무기 여러 자루가 나란히 꽂혀 있다. 지나가는 이들은 그 앞에서 잠시 멈춘다. 누구도 혼자 쓰러지지 않았다는 표식이다.',
  ending_dusk: '그 후 — 황혼은 끝나지 않았다. 사람들은 해가 지지 않는 저녁에 익숙해져 갔다. 그리고 나는, 다시 여명의 마을에서 눈을 뜬다.',
};
export function regressionEndingMilestoneGain(metaR, run) {
  const e = regressionEndingFor(run);
  const before = (metaR?.endings || []).length;
  const after = e && !(metaR?.endings || []).includes(e.id) ? before + 1 : before;
  return REGRESSION_ENDING_MILESTONES.filter(m => before < m.n && after >= m.n).reduce((a, m) => a + m.echo, 0);
}


// ============================================
// 1.200.0~ 동료 개인 퀘스트 (PM 선택 재미 요소 6) — 동료가 효과 숫자가 아니라 이야기가 된다
// ============================================
// 동료 카드가 뜰 때 호감이 단계 기준에 닿아 있으면 대화 대신 개인 이야기(사건). 1단계 호감 60 / 2단계 호감 80 + 1단계 완수.
// 판정에 성공해야 단계가 넘어간다(실패하면 다음 만남에 다시). 2단계 완수 = 동료의 유대 스킬 확정 습득.
export const REGRESSION_QUEST_AFFINITY = { 1: 60, 2: 80 };
export const REGRESSION_COMPANION_BOND_SKILL = { knight: 'knight_aegis', healer: 'healer_lullaby', archivist: 'archivist_mark', broker: 'broker_deal' };
for (const c of REGRESSION_COMPANIONS) c.bondSkill = REGRESSION_COMPANION_BOND_SKILL[c.id];
export const REGRESSION_COMPANION_QUESTS = [
  { id: 'cq_knight_1', quest: { c: 'knight', s: 1 }, title: '발터 — 무너진 초소', text: '발터가 지도를 펼친다. "북쪽 초소가 연락이 끊겼다. 내 부하들이 있던 곳이다. 같이 가 주겠나."\n초소에는 얼어붙은 깃발과, 아직 따뜻한 발자국이 남아 있다.', choices: [
    { text: '발자국을 쫓아 생존자를 찾는다', stat: '통찰', dc: 15, trait: 'bond', success: { text: '눈 동굴 안에서 떨고 있는 병사 둘을 찾았다. 발터가 말없이 그들을 끌어안는다.', quest: { c: 'knight', s: 1 }, reward: { type: 'affinity', name: 'knight', value: 10 } }, fail: { text: '발자국은 눈보라 속에서 끊겼다. 발터의 어깨가 무겁다.', penalty: { hp: -15 } } },
    { text: '초소를 다시 세우는 일을 돕는다', stat: '근력', dc: 15, trait: 'bond', success: { text: '깃발을 다시 세웠다. "…이걸 보면 돌아올 거다." 발터의 목소리가 떨린다.', quest: { c: 'knight', s: 1 }, reward: { type: 'affinity', name: 'knight', value: 10 } }, fail: { text: '얼어붙은 기둥이 꿈쩍도 하지 않는다.', penalty: { hp: -20 } } },
  ] },
  { id: 'cq_knight_2', quest: { c: 'knight', s: 2 }, title: '발터 — 기사의 맹세', text: '모닥불 앞에서 발터가 검을 뽑아 무릎 위에 올린다. "나는 한 번 부하들을 버렸다. 황혼이 왔을 때, 도망쳤지."\n그가 검을 내민다. "이번에는 끝까지 서 있겠다. 증인이 되어 주겠나."', choices: [
    { text: '검을 맞대고 함께 맹세한다', stat: '강인', dc: 16, trait: 'bond', success: { text: '두 검이 부딪히는 소리가 밤을 가른다. "이 방패는 이제 네 등을 지킨다."', quest: { c: 'knight', s: 2 }, reward: { type: 'affinity', name: 'knight', value: 10 } }, fail: { text: '팔이 먼저 떨렸다. 발터가 웃는다. "아직은 둘 다 부족하군. 다음에 다시."' } },
    { text: '「도망친 것도 살기 위해서였다」고 말한다', stat: '화술', dc: 15, trait: 'bond', success: { text: '발터가 오래 불을 바라본다. "…그런가. 그럼 이번엔 살리기 위해 서 있지."', quest: { c: 'knight', s: 2 }, reward: { type: 'affinity', name: 'knight', value: 10 } }, fail: { text: '"위로는 필요 없다." 발터가 검을 거둔다.' } },
  ] },
  { id: 'cq_healer_1', quest: { c: 'healer', s: 1 }, title: '세레나 — 이름 없는 아이', text: '세레나가 작은 망령 하나를 품에 안고 있다. "이 아이, 자기 이름을 잊어버렸어요. 이름을 찾아 주면 편히 잠들 수 있을 텐데."', choices: [
    { text: '숲의 묘비를 하나하나 읽어 본다', stat: '학식', dc: 15, trait: 'bond', success: { text: '이끼 아래에서 아이의 이름을 찾았다. 이름을 불러 주자 망령이 웃으며 흩어진다.', quest: { c: 'healer', s: 1 }, reward: { type: 'affinity', name: 'healer', value: 10 } }, fail: { text: '묘비의 글씨가 모두 지워져 있다.', penalty: { hp: -10 } } },
    { text: '아이와 놀아 주며 기억을 끌어낸다', stat: '화술', dc: 15, trait: 'bond', success: { text: '"…엄마가 부르던 노래!" 아이가 노래를 따라 부르다 빛이 되어 사라진다.', quest: { c: 'healer', s: 1 }, reward: { type: 'affinity', name: 'healer', value: 10 } }, fail: { text: '아이가 울음을 터뜨렸다. 세레나가 한숨을 쉰다.' } },
  ] },
  { id: 'cq_healer_2', quest: { c: 'healer', s: 2 }, title: '세레나 — 마지막 환자', text: '세레나의 손이 떨린다. "제가 처음 살리지 못한 사람이… 저기 있어요." 숲 깊은 곳, 망자의 군주가 된 사내가 서 있다.\n"그를 쓰러뜨리지 말고, 잠들게 해 주세요."', choices: [
    { text: '세레나의 노래에 맞춰 기도한다', stat: '신성', dc: 16, trait: 'bond', success: { text: '노래와 기도가 겹친다. 사내가 무릎을 꿇고 세레나의 손을 잡는다. "…고마워." 그가 잠든다.', quest: { c: 'healer', s: 2 }, reward: { type: 'affinity', name: 'healer', value: 10 } }, fail: { text: '기도가 닿지 않았다. 사내가 숲 속으로 사라진다.', penalty: { hp: -20 } } },
    { text: '그의 공격을 몸으로 받아 내며 다가간다', stat: '강인', dc: 16, trait: 'bond', success: { text: '마지막 일격을 견디고 그를 껴안았다. 세레나가 그 위에 손을 얹는다. 둘 다 울고 있다.', quest: { c: 'healer', s: 2 }, reward: { type: 'affinity', name: 'healer', value: 10 } }, fail: { text: '버티지 못하고 쓰러졌다. 세레나가 급히 치료한다.', penalty: { hp: -30 } } },
  ] },
  { id: 'cq_archivist_1', quest: { c: 'archivist', s: 1 }, title: '오렌 — 사라진 한 장', text: '오렌이 책장을 뒤지며 중얼거린다. "열두 번째 일지에 한 장이 비어. 누군가 찢어 갔어. 그 장에 고리의 시작이 적혀 있었을 텐데."', choices: [
    { text: '찢긴 자국의 종이 질을 감정한다', stat: '통찰', dc: 15, trait: 'truth', success: { text: '찢긴 종이는 신전 안뜰 우물 속에서 발견됐다. 오렌의 눈이 반짝인다.', quest: { c: 'archivist', s: 1 }, reward: { type: 'affinity', name: 'archivist', value: 10 } }, fail: { text: '단서는 먼지처럼 흩어졌다.' } },
    { text: '남은 문장으로 사라진 장을 추론한다', stat: '학식', dc: 16, trait: 'truth', success: { text: '"…세상에. 그 장은 일부러 비워 둔 거야. 다음 회귀자가 쓰라고." 오렌이 펜을 쥔다.', quest: { c: 'archivist', s: 1 }, reward: { type: 'affinity', name: 'archivist', value: 10 } }, fail: { text: '추론이 엉뚱한 곳으로 흘렀다.', penalty: { hp: -10 } } },
  ] },
  { id: 'cq_archivist_2', quest: { c: 'archivist', s: 2 }, title: '오렌 — 기록관의 선택', text: '오렌이 봉인된 서고 문 앞에 선다. "이 안의 기록을 꺼내면, 신전은 무너진다. 그래도 나는 알고 싶네. 자네는?"', choices: [
    { text: '함께 봉인을 풀고 기록을 지켜 낸다', stat: '마법', dc: 16, trait: 'truth', success: { text: '무너지는 서고에서 마지막 기록을 안고 빠져나왔다. 오렌이 숨을 몰아쉬며 웃는다. "이제 자네 차례야."', quest: { c: 'archivist', s: 2 }, reward: { type: 'affinity', name: 'archivist', value: 10 } }, fail: { text: '봉인이 튕겨 냈다. 아직 열 때가 아니다.', penalty: { hp: -20 } } },
    { text: '기록 대신 오렌을 지킨다고 말한다', stat: '화술', dc: 15, trait: 'bond', success: { text: '오렌이 문에서 손을 뗀다. "…기록보다 사람이 먼저라니. 그것도 기록해 두지."', quest: { c: 'archivist', s: 2 }, reward: { type: 'affinity', name: 'archivist', value: 10 } }, fail: { text: '"자네는 모르는군." 오렌이 등을 돌린다.' } },
  ] },
  { id: 'cq_broker_1', quest: { c: 'broker', s: 1 }, title: '니아 — 빚쟁이', text: '니아가 드물게 굳은 얼굴이다. "마족 상인한테 빚이 좀 있어. 오늘 밤까지 못 갚으면… 뭐, 귀찮아지지."', choices: [
    { text: '상인과 흥정해 빚을 줄인다', stat: '화술', dc: 15, trait: 'bond', success: { text: '빚이 절반으로 줄었다. 니아가 휘파람을 분다. "너, 이쪽 일 해도 되겠는데?"', quest: { c: 'broker', s: 1 }, reward: { type: 'affinity', name: 'broker', value: 10 } }, fail: { text: '상인이 이를 드러낸다. 결국 은화로 갚았다.', penalty: { gold: -60 } } },
    { text: '상인의 장부를 몰래 바꿔 놓는다', stat: '민첩', dc: 16, trait: 'power', success: { text: '장부의 숫자가 사라졌다. 니아가 배를 잡고 웃는다. "최고야, 회귀자."', quest: { c: 'broker', s: 1 }, reward: { type: 'affinity', name: 'broker', value: 10 } }, fail: { text: '들켰다. 도망치며 한 대 맞았다.', penalty: { hp: -20 } } },
  ] },
  { id: 'cq_broker_2', quest: { c: 'broker', s: 2 }, title: '니아 — 마지막 거래', text: '니아가 작은 상자를 내민다. "이거, 첨탑 주인의 비밀이 들어 있대. 대신 누군가 한 명을 팔아야 해. …나는 너를 팔 생각이었어. 처음엔."', choices: [
    { text: '「그럼 나를 팔아라」라고 말한다', stat: '화술', dc: 16, trait: 'bond', success: { text: '니아가 상자를 균열 속으로 던져 버린다. "손해 보는 장사는 안 한다니까. 너는 안 팔아."', quest: { c: 'broker', s: 2 }, reward: { type: 'affinity', name: 'broker', value: 10 } }, fail: { text: '니아가 눈을 피한다. "…생각 좀 해 볼게."' } },
    { text: '거래 상대를 속여 상자만 빼앗는다', stat: '통찰', dc: 16, trait: 'power', success: { text: '상자는 비어 있었다. 니아가 웃는다. "역시 사기였네. 우리 둘 다 안 팔렸어."', quest: { c: 'broker', s: 2 }, reward: { type: 'affinity', name: 'broker', value: 10 } }, fail: { text: '거래 상대가 사라졌다. 상자도, 은화도 함께.', penalty: { gold: -40 } } },
  ] },
];
// 동료 카드에서 열 개인 퀘스트 (없으면 null)
export function regressionCompanionQuestFor(run, companionId) {
  const stage = (run.questStage?.[companionId] || 0) + 1;
  if (stage > 2) return null;
  if ((run.affinity?.[companionId] || 0) < REGRESSION_QUEST_AFFINITY[stage]) return null;
  return REGRESSION_COMPANION_QUESTS.find(q => q.quest.c === companionId && q.quest.s === stage) || null;
}


// ============================================
// 1.201.0~ 숨겨진 장소 (PM 선택 재미 요소 7) — 통찰·학식이 여는 3층 비밀 던전
// ============================================
// 지역마다 한 번, 지역 5일째부터 「수상한 흔적」 카드(가중 weight). 통찰 또는 학식 판정에 성공하면 입장 (실패 = 하루가 지나고 그 지역 기회 끝).
// 1층 수수께끼(통찰·학식·민첩 중 택1 판정) → 2층 수호자(그 지역 강적, 1지역은 일반 적 · ×guardianMult) → 3층 보물(여정 밖 보물 장비 + 유니크 기회 + 기연 기회).
// 던전 안은 하루로 친다 — 나올 때(보물 획득 또는 물러남) 날짜 +1. 수호자 전투는 fromEvent(날짜 미소모).
export const REGRESSION_SECRET = { weight: 5, minRegionDay: 5, dc: 15, puzzleDc: 16, puzzleGold: 80, puzzleFailHp: 15, guardianMult: 1.0 };
export const REGRESSION_SECRET_PLACES = {
  1: { name: '얼어붙은 왕릉', hint: '눈더미 아래로 돌계단 끝이 삐죽 나와 있다. 계단 옆 얼음에 왕관 문양이 새겨져 있다.', puzzle: '왕릉 입구에 얼음 거울 세 개가 서 있다. 하나만 진짜 문이다.', guard: '왕의 시신을 지키던 것이 깨어났다.', treasure: '석관 위에 왕의 부장품이 놓여 있다.' },
  2: { name: '뿌리 아래 성소', hint: '거대한 고목 뿌리 사이로 희미한 녹색 빛이 새어 나온다. 뿌리에 오래된 기도문이 감겨 있다.', puzzle: '뿌리가 얽힌 통로가 세 갈래로 갈라진다. 숨 쉬는 뿌리가 길을 바꾼다.', guard: '성소를 삼킨 것이 뿌리를 털고 일어선다.', treasure: '뿌리에 감싸인 성물함이 열려 있다.' },
  3: { name: '시간이 멈춘 방', hint: '회랑 벽의 한 구간만 먼지가 쌓이지 않았다. 그 앞에서는 모래시계가 거꾸로 흐른다.', puzzle: '방 안의 시계 바늘 세 개가 서로 다른 시간을 가리킨다. 맞춰야 문이 열린다.', guard: '멈춘 시간 속에서 수호자가 움직이기 시작한다.', treasure: '멈춘 시간 한가운데에 보물이 그대로 떠 있다.' },
  4: { name: '균열 너머의 보물고', hint: '균열 틈 사이로 금빛이 번쩍인다. 마족 문자로 「주인 외 출입 금지」라고 적혀 있다.', puzzle: '보물고 문에 마족 자물쇠가 셋 달려 있다. 하나라도 틀리면 함정이 작동한다.', guard: '보물고의 문지기가 사슬을 끊고 달려든다.', treasure: '금화 더미 사이에 주인 없는 무구가 잠들어 있다.' },
};
export function regressionSecretAvailable(run) {
  const region = run.region;
  if (!REGRESSION_SECRET_PLACES[region] || (run.secretSeen || []).includes(region)) return false;
  const pos = ((run.day - 1) % REGRESSION_DAY.regionDays) + 1;
  return pos >= REGRESSION_SECRET.minRegionDay;
}
// 입구 찾기 — stat: '통찰' | '학식'
export function discoverRegressionSecret(run, stat, rng = Math.random) {
  const res = resolveRegressionChoice({ stat, dc: REGRESSION_SECRET.dc, success: {}, fail: {} }, regressionEffectiveStats(run), rng);
  if (res.check === 'ok') return { run: { ...run, today: null, secret: { region: run.region, floor: 1 } }, ok: true };
  return { run: passRegressionDay(run, `${REGRESSION_SECRET_PLACES[run.region]?.name}의 입구를 찾지 못함`), ok: false };
}
// 1층 수수께끼 — 성공: 은화, 실패: HP. 어느 쪽이든 2층으로
export function solveRegressionSecretPuzzle(run, stat, rng = Math.random) {
  const S = REGRESSION_SECRET;
  const res = resolveRegressionChoice({ stat, dc: S.puzzleDc, success: {}, fail: {} }, regressionEffectiveStats(run), rng);
  const ok = res.check === 'ok';
  const next = ok ? { ...run, gold: (run.gold || 0) + S.puzzleGold } : { ...run, hpPct: Math.max(0.01, (run.hpPct ?? 1) - S.puzzleFailHp / 100) };
  return { run: { ...next, secret: { ...run.secret, floor: 2 } }, ok, tags: ok ? [{ text: `${stat} - 성공!`, tone: 'gold' }, { text: `은화 +${S.puzzleGold}`, tone: 'good' }] : [{ text: `${stat} - 실패`, tone: 'bad' }, { text: `HP -${S.puzzleFailHp}%`, tone: 'bad' }] };
}
// 2층 수호자 — 그 지역 강적 (없으면 일반)
export function fightRegressionSecretGuardian(run, rng = Math.random) {
  const region = run.secret?.region || run.region;
  // 1지역은 아직 약할 때라 일반 적이 수호자 (강적 승률 60%대로 너무 치명적이었음)
  const tier = region === 1 ? 'normal' : 'elite';
  const key = rollRegressionEnemy(region, tier, rng) || rollRegressionEnemy(region, 'normal', rng);
  return startRegressionCombat(run, key, tier, { secret: true, fromEvent: true });
}
// 3층 보물 — 보물 등급 장비 확정 + 유니크 판정 기회 + 기연 기회, 그리고 던전을 나선다 (하루 소모)
export function claimRegressionSecretTreasure(run, rng = Math.random) {
  const tags = [];
  const tr = Object.keys(REGRESSION_GEAR).filter(k => REGRESSION_GEAR[k].grade === 'treasure' && !(run.bag || []).includes(k));
  let next = { ...run, secret: null, secretDone: [...(run.secretDone || []), run.secret?.region] };
  if (tr.length) { const id = tr[Math.floor(rng() * tr.length)]; next = addRegressionGear(next, id); tags.push({ text: `${regressionGearLabel(id)} 획득`, tone: 'gold' }); }
  let first = true;
  const gateRng = () => (first ? ((first = false), 0) : rng());
  const uq = offerRegressionUnique(next, null, gateRng);
  if (uq) { next.pendingGear = uq; tags.push({ text: '주인을 고르는 무구가 울린다', tone: 'gold' }); }
  const lo = offerRegressionLearn(next, 'boss', null, rng);
  if (lo && !next.pendingGear) { next.pendingLearn = lo; tags.push({ text: '벽화에서 깨달음이 스친다', tone: 'gold' }); }
  return { run: passRegressionDay(next, `${REGRESSION_SECRET_PLACES[run.secret?.region]?.name} 탐사 완료`), tags };
}
export function leaveRegressionSecret(run) {
  return passRegressionDay({ ...run, secret: null }, '숨겨진 장소에서 물러남');
}


// ============================================
// 1.202.0~ 라이벌 회귀자 (PM 선택 재미 요소 8) — 생을 넘어 이어지는 악연
// ============================================
// 「카엘」 — 같은 고리에 갇힌 또 다른 회귀자. 지역 1~3의 정해진 날(REGRESSION_RIVAL.dayInRegion) 같은 기연을 다투러 나타난다.
// 결투(승리 = 기연 기회·명성) / 먼저 차지하기(민첩 판정) / 양보. 그가 이기면(패배·실패·양보) 다음 생부터 강해진다(meta.rival.level).
// 결투에서 져도 죽지 않는다 — HP 30%로 남고 은화 30%를 빼앗긴다.
export const REGRESSION_RIVAL = {
  name: '카엘', title: '또 다른 회귀자', art: 'champ_frost_brute',
  dayInRegion: 6, regions: [1, 2, 3],
  ref: { 1: 'frostGiant', 2: 'forestTyrant', 3: 'ancientPriest' },
  hpMult: 0.75, dmgMult: 0.75, growthPerLevel: 0.08, maxLevel: 10,
  raceDc: 16, winFame: 8, loseHpPct: 0.3, loseGoldPct: 0.3,
};
export function regressionRivalToday(run) {
  const R = REGRESSION_RIVAL;
  if (!R.regions.includes(run.region) || (run.rivalMet || []).includes(run.region)) return false;
  const pos = ((run.day - 1) % REGRESSION_DAY.regionDays) + 1;
  return pos >= R.dayInRegion;
}
export function buildRegressionRival(run) {
  const R = REGRESSION_RIVAL;
  const lv = run.rival?.level || 0;
  const k = 1 + lv * R.growthPerLevel;
  const ref = ENEMIES[R.ref[run.region] || 'forestTyrant'];
  return { ...regressionScaleEnemy(R.art, ref, `${R.name}${lv ? ` Lv.${lv}` : ''}`, R.hpMult * k, R.dmgMult * k), tier: 'elite', rival: true };
}
const RIVAL_LINES = [
  '눈앞을 가로막은 사내가 피식 웃는다. "너도 보이는구나, 저 기연이. 나는 카엘. …너처럼 같은 날을 되풀이하는 사람이지."',
  '"또 만났군." 카엘이 검을 어깨에 걸친다. "지난 생에도 여기서 마주쳤지. 이번엔 누가 가져갈까?"',
  '카엘이 먼저 와 있었다. "몇 번째 생이지? 나는 세는 걸 그만뒀다. 그래도 너만은 기억나더군."',
  '"지겹지도 않나." 카엘의 눈이 지쳐 있다. "우리 둘 중 하나가 고리를 끊어야 해. 그게 내가 될 거고."',
];
export function regressionRivalLine(run) {
  const met = (run.rival?.met || 0) + Math.max(0, (run.rivalMet || []).length - 1);
  const line = RIVAL_LINES[Math.min(RIVAL_LINES.length - 1, met)];
  const lv = run.rival?.level || 0;
  return `${line}\n\n${lv ? `(카엘은 지난 생들에서 ${lv}번 앞서 나갔다 — 그만큼 강해졌다)` : '(아직 그의 실력은 알 수 없다)'}`;
}
// 먼저 차지하기 — 민첩 판정. 성공: 기연 기회 / 실패: 카엘이 가져가고 강해진다. 하루 소모
export function raceRegressionRival(run, rng = Math.random) {
  const R = REGRESSION_RIVAL;
  const res = resolveRegressionChoice({ stat: '민첩', dc: R.raceDc, success: {}, fail: {} }, regressionEffectiveStats(run), rng);
  if (res.check === 'ok') {
    const offer = offerRegressionLearn(run, 'boss', null, rng);
    return { run: passRegressionDay({ ...run, today: null, rivalWins: (run.rivalWins || 0) + 1, pendingLearn: offer || null }, '카엘보다 먼저 기연에 닿음'), ok: true };
  }
  return { run: passRegressionDay({ ...run, today: null, rivalGain: (run.rivalGain || 0) + 1 }, '카엘에게 기연을 빼앗김'), ok: false };
}
export function yieldRegressionRival(run) {
  return passRegressionDay({ ...run, today: null, rivalGain: (run.rivalGain || 0) + 1, hpPct: Math.min(1, (run.hpPct ?? 1) + 0.1) }, '카엘에게 기연을 양보함');
}
export function duelRegressionRival(run) {
  return startRegressionCombat({ ...run, today: null }, REGRESSION_RIVAL.art, 'elite', { rival: true });
}
// 결투 패배 — 죽지 않는다
export function loseRegressionRivalDuel(run) {
  const R = REGRESSION_RIVAL;
  const lost = Math.round((run.gold || 0) * R.loseGoldPct);
  const next = passRegressionDay({ ...run, pending: null, hpPct: R.loseHpPct, gold: (run.gold || 0) - lost, rivalGain: (run.rivalGain || 0) + 1 }, '카엘과의 결투에서 패배');
  return { run: next, lost };
}
