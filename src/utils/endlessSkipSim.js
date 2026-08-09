// ============================================
// utils/endlessSkipSim.js — 무한던전 스킵 시뮬레이션 (1.73.0~)
// ============================================
// 하루 5회, 버튼 클릭 시 가상 무한 런을 간이 전투 모델로 진행해
// 도달 깊이·처치 내역·영혼 보상을 산출한다.
//
// 실제 밸런스 상수를 그대로 사용:
//   - AP_TUNING (적 HP ×1.6 / 데미지 ×1.25)
//   - 무한 깊이 스케일 (HP +15%/깊이, 데미지 +12%/깊이 — App.jsx와 동일)
//   - SOUL_REWARDS (일반 1 / 강적 3 / 보스·챕터 표 / 깊이×15)
//   - 매력 시그니처 영혼 획득 보정
// 각인·각성도(getCombinedClassFx)·제단 메타(getMetaBonus)가 전투력에 반영되어
// 계정이 강할수록 스킵 보상도 커진다.
//
// 기록·도감·업적·일일 임무에는 반영하지 않음 (보상 전용).

import { CLASSES, CHAPTERS, ENEMIES, COMBAT_SKILLS, GAME_CONFIG, SOUL_REWARDS } from '../data.js';
import { getCombinedClassFx, getMetaBonus, getCharismaSoulGainBonus } from './helpers.js';
import { AP_TUNING } from '../combat/initCombat.js';

// 폭주 안전장치 — 시뮬 최대 깊이
const MAX_SIM_DEPTH = 30;

// 한 직업의 가상 런 1회
export function simulateEndlessRun(meta, classId) {
  const cls = CLASSES.find(c => c.id === classId);
  if (!cls) return null;
  const fx = getCombinedClassFx(meta, classId);

  // --- 플레이어 전투력 모델 ---
  const maxHp = GAME_CONFIG.startHp + getMetaBonus(meta, 'startHp+10') * 10 + (fx.startHp || 0);
  let hp = maxHp;

  // 스킬 기대 데미지: AP 3 가정 — 기본기×2 + 주력기×0.8(쿨다운 평균 가동률)
  const skillDefs = (cls.combatSkills || []).map(k => COMBAT_SKILLS[k]).filter(Boolean);
  const atkSkills = skillDefs.filter(s => s.type === 'physical' || s.type === 'magic');
  const basic = atkSkills.find(s => (s.cost || 0) === 0) || atkSkills[0];
  const main = atkSkills.find(s => s !== basic) || basic;
  const avgDmg = (s) => (s && s.baseDmg ? ((s.baseDmg[0] + s.baseDmg[1]) / 2) * (s.hitCount || 1) : 0);
  // 콤보 연계(+40%)는 주력기 사용 턴의 절반에 적중한다고 가정
  const comboMult = main?.comboAfter ? 1 + (main.comboBonusPct || 0) / 200 : 1;
  let dmgPerTurn = avgDmg(basic) * 2 + avgDmg(main) * 0.8 * comboMult;

  // 치명타·데미지 보정: 제단 메타 + 각인/각성도 fx
  const critRate = Math.min(60, 5 + getMetaBonus(meta, 'critRate+2%') * 2 + (fx.critRate || 0));
  const critDmg = 50 + getMetaBonus(meta, 'critDmg+5%') * 5;
  dmgPerTurn *= 1 + (critRate / 100) * (critDmg / 100);
  const dmgPct = getMetaBonus(meta, 'dmgDealt+2%') * 2 + (basic?.type === 'physical' ? (fx.physDmgPct || 0) : 0);
  dmgPerTurn *= 1 + dmgPct / 100;

  // 방어 모델: 회피 + 받는 데미지 감소 + 방어 스킬 평균 흡수
  const dodge = Math.min(60, 5 + getMetaBonus(meta, 'dodgeRate+2%') * 2 + (fx.dodgeRate || 0));
  const dmgTakenPct = -getMetaBonus(meta, 'dmgTaken-2%') * 2 - (fx.dmgTakenPct || 0);
  const takenMult = Math.max(0.3, 1 + dmgTakenPct / 100) * (1 - dodge / 100);
  const defSkill = skillDefs.find(s => s.type === 'defense');
  const avgAbsorb = defSkill ? (defSkill.defense || 0) * 0.4 : 0;

  // --- 가상 런 진행 ---
  const charismaPct = getCharismaSoulGainBonus(cls.stats || {});
  const soulMult = 1 + charismaPct / 100;
  let souls = 0;
  let kills = 0, elites = 0, bosses = 0;
  let depth = 0;

  const avgOf = (arr, f) => (arr.length ? arr.reduce((s, e) => s + f(e), 0) / arr.length : 0);
  const avgPatternDmg = (e) => {
    const atks = (e.patterns || []).filter(p => p.type === 'attack' && p.dmg);
    if (!atks.length) return 10;
    return atks.reduce((s, p) => s + (p.dmg[0] + p.dmg[1]) / 2, 0) / atks.length;
  };

  while (depth < MAX_SIM_DEPTH) {
    // 무한모드 챕터 순환 1→2→3→4→1→… (App.jsx handleChapterContinue와 동일)
    const chapter = CHAPTERS.find(c => c.id === (depth % 4) + 1);
    if (!chapter) break;
    const hpScale = (1 + depth * 0.15) * AP_TUNING.enemyHpMult;
    const dmgScale = (1 + depth * 0.12) * AP_TUNING.enemyDmgMult;

    const pool = (chapter.enemies?.normal || []).map(k => ENEMIES[k]).filter(Boolean);
    const elitePool = (chapter.enemies?.elite || []).map(k => ENEMIES[k]).filter(Boolean);
    const boss = ENEMIES[chapter.enemies?.boss];

    // 한 깊이 = 일반 5 + 강적 1 + 보스 1 (일반 챕터 맵 평균 구성)
    const fights = [
      ...Array.from({ length: 5 }, () => ({ hp: avgOf(pool, e => e.hp), dmg: avgOf(pool, avgPatternDmg), kind: 'normal' })),
      { hp: avgOf(elitePool.length ? elitePool : pool, e => e.hp), dmg: avgOf(elitePool.length ? elitePool : pool, avgPatternDmg), kind: 'elite' },
      ...(boss ? [{ hp: boss.hp, dmg: avgPatternDmg(boss), kind: 'boss' }] : []),
    ];

    let died = false;
    for (const f of fights) {
      // 전투별 운 변수 ±15% — 시뮬마다 결과가 달라짐
      const luck = 0.85 + Math.random() * 0.3;
      const enemyHp = f.hp * hpScale;
      const enemyDmg = f.dmg * dmgScale;
      const turns = Math.max(1, Math.ceil(enemyHp / Math.max(1, dmgPerTurn * luck)));
      // 첫 턴 이후부터 피격 가정 → (turns-1)회
      const incoming = Math.max(0, (turns - 1) * Math.max(1, enemyDmg * takenMult - avgAbsorb));
      hp -= incoming;
      if (hp <= 0) { died = true; break; }
      if (f.kind === 'normal') { kills++; souls += Math.floor(SOUL_REWARDS.normalKill * soulMult); }
      else if (f.kind === 'elite') { elites++; souls += Math.floor(SOUL_REWARDS.eliteKill * soulMult); }
      else {
        bosses++;
        const ci = depth % 4;
        souls += Math.floor((SOUL_REWARDS.bossKill[ci] || 5) * soulMult);
        souls += Math.floor((SOUL_REWARDS.chapterClear[ci] || 5) * soulMult);
      }
      // 전투 사이 소회복 (보상·사건 회복 평균)
      hp = Math.min(maxHp, hp + maxHp * 0.03);
    }
    if (died) break;
    depth += 1;
    // 깊이 사이 정비·챕터 보상 회복 (평균 30%)
    hp = Math.min(maxHp, hp + maxHp * 0.3);
  }

  // 사망 정산 — 무한모드 공식 그대로 (깊이×15, 매력 보정)
  let depthBonus = depth * 15;
  if (charismaPct > 0) depthBonus = Math.floor(depthBonus * soulMult);
  return { classId, className: cls.name, depth, kills, elites, bosses, souls: souls + depthBonus };
}

// 5직업 전부 시뮬 → 영혼이 가장 큰 결과 채택
export function simulateBestEndlessRun(meta) {
  const results = CLASSES.map(c => simulateEndlessRun(meta, c.id)).filter(Boolean);
  results.sort((a, b) => b.souls - a.souls);
  return results[0] || null;
}
