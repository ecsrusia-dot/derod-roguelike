// ============================================
// data/masters.js — 마스터즈 퓨전 던전 (1.89.0~, PM 확정 신규 콘텐츠)
// ============================================
// PM 확정 설계:
//   - 챔피언십 5컨셉을 2개씩 섞은 듀얼 퓨전 10종 + 3개씩 섞은 트리플 퓨전 10종
//   - 던전 특성 = 구성 컨셉의 전투 기믹이 전부 동시 적용 (기믹 융합)
//   - 몹 = 구성 컨셉의 상위 챕터(3·4장) 풀 통합 랜덤
//   - 보스 = 1방에서 구성 컨셉 최종 보스들을 연속 처치 (듀얼 2페이즈 / 트리플 3페이즈,
//     페이즈 사이 회복 없음 — HP 그대로 이월)
//   - 어려운 만큼 보상 압도적: 영혼 듀얼 400 / 트리플 800 + 칭호 드랍 (titles.js)
// ============================================

import { CHAMPIONSHIP_CHAPTERS } from './expeditions.js';

// 컨셉별 전투 기믹 — frost/decay/sealEcho/surge는 클래식 챕터와 동일 구현,
// dawnheal은 1.89.0 신규 (CombatScreen endTurn에서 적 자가 회복)
export const MASTERS_GIMMICKS = {
  frost:   { id: 'frost',    name: '혹한',        desc: '3턴마다 한파 — 양측 HP -5' },
  forest:  { id: 'decay',    name: '부패의 안개', desc: '4턴째부터 매 턴 양측 부패 데미지 (갈수록 증가)' },
  sanctum: { id: 'sealEcho', name: '봉인의 잔향', desc: '전투 시작 시 액티브 스킬 1개가 1턴 봉인' },
  rift:    { id: 'surge',    name: '마기 폭주',   desc: '양측 모든 데미지 +10%' },
  dawn:    { id: 'dawnheal', name: '여명의 재생', desc: '적이 매 턴 최대 HP의 3% 자가 회복' },
};

const CONCEPT_COLORS = { frost: '#7ba3c4', forest: '#7a9a5e', sanctum: '#8a76c9', rift: '#c4453d', dawn: '#d4a574' };

// 듀얼 퓨전 10종 — C(5,2) 경우의 수 전부 (PM 예시: frost+forest = 북부의 죽음숲)
export const MASTERS_DUALS = [
  { id: 'fusion_frost_forest',   concepts: ['frost', 'forest'],   name: '북부의 죽음숲' },
  { id: 'fusion_frost_sanctum',  concepts: ['frost', 'sanctum'],  name: '얼어붙은 봉인전' },
  { id: 'fusion_frost_rift',     concepts: ['frost', 'rift'],     name: '극지의 균열' },
  { id: 'fusion_frost_dawn',     concepts: ['frost', 'dawn'],     name: '한기의 여명' },
  { id: 'fusion_forest_sanctum', concepts: ['forest', 'sanctum'], name: '부패한 신전' },
  { id: 'fusion_forest_rift',    concepts: ['forest', 'rift'],    name: '죽음숲의 균열' },
  { id: 'fusion_forest_dawn',    concepts: ['forest', 'dawn'],    name: '여명의 부패림' },
  { id: 'fusion_sanctum_rift',   concepts: ['sanctum', 'rift'],   name: '균열된 봉인전' },
  { id: 'fusion_sanctum_dawn',   concepts: ['sanctum', 'dawn'],   name: '여명의 성소' },
  { id: 'fusion_rift_dawn',      concepts: ['rift', 'dawn'],      name: '여명의 마계' },
];

// 트리플 퓨전 10종 — C(5,3) 경우의 수 전부 (3페이즈 보스)
export const MASTERS_TRIPLES = [
  { id: 'fusion_frost_forest_sanctum', concepts: ['frost', 'forest', 'sanctum'], name: '얼어붙은 부패의 신전' },
  { id: 'fusion_frost_forest_rift',    concepts: ['frost', 'forest', 'rift'],    name: '북부 죽음숲의 균열' },
  { id: 'fusion_frost_forest_dawn',    concepts: ['frost', 'forest', 'dawn'],    name: '여명이 진 죽음숲' },
  { id: 'fusion_frost_sanctum_rift',   concepts: ['frost', 'sanctum', 'rift'],   name: '봉인 깨진 극지 균열' },
  { id: 'fusion_frost_sanctum_dawn',   concepts: ['frost', 'sanctum', 'dawn'],   name: '얼어붙은 여명의 성소' },
  { id: 'fusion_frost_rift_dawn',      concepts: ['frost', 'rift', 'dawn'],      name: '극광의 마계' },
  { id: 'fusion_forest_sanctum_rift',  concepts: ['forest', 'sanctum', 'rift'],  name: '타락한 신전의 심연' },
  { id: 'fusion_forest_sanctum_dawn',  concepts: ['forest', 'sanctum', 'dawn'],  name: '부패한 여명의 성소' },
  { id: 'fusion_forest_rift_dawn',     concepts: ['forest', 'rift', 'dawn'],     name: '죽음숲의 여명 균열' },
  { id: 'fusion_sanctum_rift_dawn',    concepts: ['sanctum', 'rift', 'dawn'],    name: '종언의 대성소' },
];

export const MASTERS_ALL = [...MASTERS_DUALS, ...MASTERS_TRIPLES];

// 밸런스 — 체감 조정은 여기 한 곳 (AP_TUNING·GAMBLE_CONFIG 패턴)
export const MASTERS_TUNING = {
  dual:   { enemyHpMult: 2.0, enemyDmgMult: 1.6, soulReward: 400, nodeCount: 12 },
  triple: { enemyHpMult: 2.6, enemyDmgMult: 2.0, soulReward: 800, nodeCount: 16 },
};

export function getMastersKind(fusion) {
  return fusion.concepts.length >= 3 ? 'triple' : 'dual';
}

// 퓨전 챕터 합성 — 구성 컨셉들의 상위 챕터(3·4장) 풀 통합 + 최종 보스 체인
export function buildMastersChapter(fusion) {
  const kind = getMastersKind(fusion);
  const tune = MASTERS_TUNING[kind];
  const normal = [...new Set(fusion.concepts.flatMap(c => [
    ...CHAMPIONSHIP_CHAPTERS[`${c}_3`].enemies.normal,
    ...CHAMPIONSHIP_CHAPTERS[`${c}_4`].enemies.normal,
  ]))];
  const elite = [...new Set(fusion.concepts.flatMap(c => [
    ...CHAMPIONSHIP_CHAPTERS[`${c}_3`].enemies.elite,
    ...CHAMPIONSHIP_CHAPTERS[`${c}_4`].enemies.elite,
  ]))];
  const bossChain = fusion.concepts.map(c => CHAMPIONSHIP_CHAPTERS[`${c}_4`].enemies.boss);
  const gimmicks = fusion.concepts.map(c => MASTERS_GIMMICKS[c]);
  return {
    id: `${fusion.id}_ch`,
    name: fusion.name,
    sub: `Masters · ${kind === 'triple' ? 'Triple' : 'Dual'} Fusion`,
    desc: `${gimmicks.map(g => g.name).join(' + ')} — ${fusion.concepts.length}컨셉 융합`,
    nodeCount: tune.nodeCount,
    biome: 'masters',
    color: CONCEPT_COLORS[fusion.concepts[0]],
    enemies: { normal, elite, boss: bossChain[0] },
    bossChain,               // 1.89.0~ 보스 페이즈 체인 (1번 방 연속 처치)
    gimmick: gimmicks,       // 1.89.0~ 기믹 배열 — CombatScreen이 전부 동시 적용
  };
}

// 퓨전 원정 객체 — startMasters(App)가 사용
export function buildMastersExpedition(fusion) {
  const kind = getMastersKind(fusion);
  const tune = MASTERS_TUNING[kind];
  const gimmicks = fusion.concepts.map(c => MASTERS_GIMMICKS[c]);
  return {
    id: fusion.id,
    isMasters: true,
    mastersKind: kind,
    name: fusion.name,
    sub: `Masters ${kind === 'triple' ? 'Triple' : 'Dual'} Fusion`,
    desc: `던전 특성: ${gimmicks.map(g => `${g.name}(${g.desc})`).join(' + ')}`,
    color: '#e8b04a',
    chapters: [`${fusion.id}_ch`],
    enemyHpMult: tune.enemyHpMult,
    enemyDmgMult: tune.enemyDmgMult,
    curseCount: 0,
    maxRelicSelect: 3,
    soulReward: tune.soulReward,
    unlockId: null,
    category: 'masters',
  };
}

// 해금 — 구성 컨셉 전부 챔피언십 지옥(hell) 이상 클리어
export function isMastersFusionUnlocked(meta, fusion) {
  const clears = meta?.championshipClears || {};
  return fusion.concepts.every(c => clears[c]?.hell || clears[c]?.madness);
}
