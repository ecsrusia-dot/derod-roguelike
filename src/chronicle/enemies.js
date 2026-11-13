// ============================================
// chronicle/enemies.js — 황혼 연대기 전용 적 목록 (1.222.0)
// ============================================
// 본편 ENEMIES + 3부 「황혼 너머」 신규 적 27종 (사냥터 21 + 던전 전용 6 — 1.279.0).
// 3부 적은 본편 적을 원본으로 이름·등급·소속만 바꾼다 (수치는 buildChronicleEnemy가 레벨 공식으로 계산).
// 일러는 원본을 색 보정한 임시본 — public/enemies/championship/{memory,void,origin}/
// ⚠️ 본편 ENEMIES에 섞지 않는다 (본편 도감·챔피언십에 새어 나가지 않도록) — 연대기 코드는 이 CENEMIES만 쓴다.
// ============================================
import { ENEMIES } from '../data/enemies.js';

// key: [원본 키, 이름, 소속(컨셉_단계), 등급]
const P3 = {
  // 10 · 기억의 폐허 — 잊힌 자들의 잔상
  p3_m_sentinel: ['tundraRaider', '잊힌 파수병', 'memory_1', 'normal'],
  p3_m_wolf: ['champ_frost_wolf', '메아리 늑대', 'memory_1', 'normal'],
  p3_m_eater: ['champ_forest_leopard', '기억 포식자', 'memory_1', 'normal'],
  p3_m_knight: ['timeKeeper', '흐려진 기사', 'memory_1', 'normal'],
  p3_m_colossus: ['frostGiant', '망각의 거상', 'memory_1', 'elite'],
  p3_m_witch: ['champ_forest_dryad', '회상의 마녀', 'memory_1', 'elite'],
  p3_m_boss: ['oblivionSealer', '기억의 군주 므네메', 'memory_1', 'boss'],
  // 던전 「잊힌 왕의 서고」 전용 (1.279.0)
  p3_m_scribe: ['champ_sanctum_archpriest', '금서의 필경사', 'memory_1', 'elite'],
  p3_m_keeper: ['champ_sanctum_boss1', '기록 관리자 아르케', 'memory_1', 'boss'],
  // 11 · 공허의 회랑 — 차원 틈새
  p3_v_creeper: ['corruptSpider', '공허 잠식자', 'void_1', 'normal'],
  p3_v_hound: ['shadowWolf', '무형의 사냥개', 'void_1', 'normal'],
  p3_v_shade: ['wraith', '회랑의 그림자', 'void_1', 'normal'],
  p3_v_caster: ['sealMage', '틈새 술사', 'void_1', 'normal'],
  p3_v_executor: ['champ_frost_brute', '공허의 집행자', 'void_1', 'elite'],
  p3_v_devourer: ['riftBreach', '차원 포식자', 'void_1', 'elite'],
  p3_v_boss: ['champ_forest_boss2', '공허의 문지기 네하르', 'void_1', 'boss'],
  // 던전 「틈새의 밑바닥」 전용 (1.279.0)
  p3_v_maw: ['champ_rift_devourer', '밑바닥의 아귀', 'void_1', 'elite'],
  p3_v_heart: ['nakzelionShadow', '공허의 심장 에레보스', 'void_1', 'boss'],
  // 12 · 황혼의 근원 — 모든 황혼의 시작
  p3_o_shard: ['brokenGolem', '근원의 파편', 'origin_1', 'normal'],
  p3_o_warden: ['forestSpirit', '타오르는 수호령', 'origin_1', 'normal'],
  p3_o_apostle: ['demonApostle', '황혼 사도', 'origin_1', 'normal'],
  p3_o_rider: ['wrathDemon', '종말의 기수', 'origin_1', 'normal'],
  p3_o_avatar: ['champ_frost_elite2', '황혼의 화신', 'origin_1', 'elite'],
  p3_o_watcher: ['forestTyrant', '근원의 감시자', 'origin_1', 'elite'],
  p3_o_boss: ['champ_frost_boss4', '황혼의 근원 아이온', 'origin_1', 'boss'],
  // 던전 「최초의 황혼」 전용 (1.279.0)
  p3_o_herald: ['champ_dawn_high_seraph', '첫 황혼의 전령', 'origin_1', 'elite'],
  p3_o_first: ['twilightChild', '최초의 황혼 오르페', 'origin_1', 'boss'],
};
export const PART3_ENEMY_SOURCES = Object.fromEntries(Object.entries(P3).map(([k, v]) => [k, v[0]]));
export const CENEMIES = {
  ...ENEMIES,
  ...Object.fromEntries(Object.entries(P3).map(([k, [src, name, chapter, tier]]) => [k, { ...ENEMIES[src], name, chapter, tier }])),
};
