// 🌀 회귀의 탐험가 밸런스 시뮬 — node scripts/sim-regression.mjs [플레이어수=2000] [회귀수=12]
// 전투는 근사 모델 (실제 CombatScreen 아님): 지역·등급별 HP 소모 기댓값 ÷ 성장 배율.
// 목적: 40일 안에 명성 100이 "몇 번째 생부터" 가능한지, 기록·기억 조각이 회차마다 쌓이는지 확인.
import {
  REGRESSION_TUNING as T, REGRESSION_RECORDS, EMPTY_REGRESSION, ENEMIES_FOR_SIM,
} from './sim-regression-shim.mjs';
import {
  createRegressionRun, regressionActions, applyRegressionTravel, applyRegressionRest, applyRegressionCombat,
  rollRegressionEnemy, isRegressionSpireDay, enterRegressionSpire, applyRegressionSpireResult, settleRegression,
  setRegressionCarry, isRegressionEliteOpen, buildRegressionLoadout,
} from '../src/data/regression.js';

const PLAYERS = Number(process.argv[2] || 2000);
const LOOPS = Number(process.argv[3] || 12);
const INT = 14;
const BASE_COST = { 1: 0.10, 2: 0.18, 3: 0.28, 4: 0.40 };
const ELITE_MULT = 1.6;
const SPIRE_COST = [0.30, 0.34, 0.38, 0.48];

function power(run) {
  const lo = buildRegressionLoadout(run, {}, 300);
  const passiveLv = Object.values(lo.skills).reduce((a, b) => a + b, 0);
  return 1 + passiveLv * 0.045 + (lo.maxHp - 300) / 300;
}

function fight(run, region, tier, rng) {
  const key = rollRegressionEnemy(region, tier, rng);
  const e = ENEMIES_FOR_SIM[key];
  const heavyShare = e.patterns.filter(p => p.heavy).length / e.patterns.length;
  const turns = Math.round((tier === 'elite' ? 6 : 4) + rng() * 3);
  const observations = Array.from({ length: turns }, () => {
    const heavy = rng() < heavyShare;
    return { heavy, countered: heavy && rng() < 0.5 };
  });
  const cost = BASE_COST[region] * (tier === 'elite' ? ELITE_MULT : 1) / power(run) * (0.7 + 0.6 * rng());
  const win = cost < run.hpPct;
  return applyRegressionCombat(run, { enemyKey: key, tier, win, hpPct: run.hpPct - cost, observations, intStat: INT }).run;
}

function expCost(run, region, tier) {
  return BASE_COST[region] * (tier === 'elite' ? ELITE_MULT : 1) / power(run);
}

function playLife(metaR, rng) {
  const risk = 0.22 + rng() * 0.2; // 플레이어 성향: 일반전 허용 기대 소모 (0.22 신중 ~ 0.42 공격적)
  let run = createRegressionRun(metaR, 'wanderer');
  let guard = 0;
  while (!run.over && !isRegressionSpireDay(run) && guard++ < 200) {
    if (run.hpPct < 0.45) { run = applyRegressionRest(run); continue; }
    // 목표 지역: 일반전 기대 소모가 성향치 미만인 가장 깊은 지역
    // 기록할 적이 남은 지역을 우선 (기록 가치 판단) — 없으면 가장 깊은 안전 지역
    const safe = [1, 2, 3, 4].filter(r => r === 1 || expCost(run, r, 'normal') < risk);
    const unlearned = safe.filter(r => Object.keys(REGRESSION_RECORDS).some(k => ENEMIES_FOR_SIM[k].chapter === r && !run.learned.includes(k)
      && (ENEMIES_FOR_SIM[k].tier === 'normal' || isRegressionEliteOpen(run, r))));
    const target = unlearned.length ? unlearned[unlearned.length - 1] : safe[safe.length - 1];
    if (run.region !== target) { run = applyRegressionTravel(run, target); continue; }
    const eliteOk = isRegressionEliteOpen(run, target) && expCost(run, target, 'elite') * 1.3 < run.hpPct;
    run = fight(run, target, eliteOk ? 'elite' : 'normal', rng);
  }
  if (!run.over && isRegressionSpireDay(run)) {
    run = enterRegressionSpire(run);
    while (!run.over && run.spireRound != null) {
      const cost = SPIRE_COST[run.spireRound] / power(run) * (0.8 + 0.4 * rng());
      run = applyRegressionSpireResult(run, { win: cost < run.hpPct, hpPct: run.hpPct - cost });
    }
  }
  return run;
}

// mulberry32 — 재현 가능한 시드 RNG
let seed = 12345;
const rng = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const byLoop = Array.from({ length: LOOPS }, () => ({ fame: 0, learned: 0, eligible: 0, victory: 0, death: 0, timeout: 0, spireLose: 0, memories: 0, deathRegion: { 1: 0, 2: 0, 3: 0, 4: 0 } }));
let firstClearLoops = [];
for (let p = 0; p < PLAYERS; p++) {
  let metaR = { ...EMPTY_REGRESSION };
  let cleared = false;
  for (let l = 0; l < LOOPS; l++) {
    const run = playLife(metaR, rng);
    const s = byLoop[l];
    s.fame += run.fame; s.learned += run.learned.length;
    if (run.fame >= T.fameGate) s.eligible++;
    s[run.over]++;
    if (run.over === 'death') s.deathRegion[run.region]++;
    const { meta, carryOptions } = settleRegression(metaR, run);
    // 계승: 최대 HP/고Lv 패시브 우선 (간단히 마지막에 배운 것)
    metaR = setRegressionCarry(meta, carryOptions.slice(-3).reverse());
    s.memories += metaR.memories.length;
    if (run.over === 'victory' && !cleared) { cleared = true; firstClearLoops.push(l + 1); }
  }
}
const pct = (n) => `${(n / PLAYERS * 100).toFixed(0)}%`;
console.log(`플레이어 ${PLAYERS}명 × ${LOOPS}생 (일수 ${T.days}, 명성 게이트 ${T.fameGate})`);
console.log('생 | 평균 명성 | 평균 기록 | 기억 조각 | 첨탑 자격 | 정복 | 사망 | 시간초과 | 첨탑패배 | 사망 지역(1/2/3/4)');
byLoop.forEach((s, i) => {
  console.log(`${String(i + 1).padStart(2)} | ${(s.fame / PLAYERS).toFixed(0).padStart(5)} | ${(s.learned / PLAYERS).toFixed(1).padStart(5)} | ${(s.memories / PLAYERS).toFixed(1).padStart(4)} | ${pct(s.eligible).padStart(5)} | ${pct(s.victory).padStart(4)} | ${pct(s.death).padStart(4)} | ${pct(s.timeout).padStart(4)} | ${pct(s.spireLose).padStart(4)} | ${Object.values(s.deathRegion).map(pct).join('/')}`);
});
firstClearLoops.sort((a, b) => a - b);
const med = firstClearLoops[Math.floor(firstClearLoops.length / 2)];
console.log(`첫 정복까지 생 수 — 중앙값 ${med ?? '-'} / 정복 경험 ${pct(firstClearLoops.length)}`);
console.log(`기록 대상 적 ${Object.keys(REGRESSION_RECORDS).length}종`);
