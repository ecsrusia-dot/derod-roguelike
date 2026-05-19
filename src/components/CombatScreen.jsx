// ============================================
// components/CombatScreen.jsx — 전투 화면 (메인 게임 루프)
// ============================================
// 가장 큰 컴포넌트 — 플레이어 턴, 적 턴, 데미지 적용,
// 디버프 (출혈/충격/봉인/동상), 회피/반격 처리 모두 포함

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, X, Maximize2 } from 'lucide-react';
import {
  PALETTE,
  getActivePassives,
  hasEffect,
  hasUltimate,
  getMinorBonus,
  getMagicEchoChance,
  getMetaBonus,
  hasCurse,
  getSkillLevel,
  getEnemyImageSrc,
  getCharismaHealBonus,
  getCharismaDmgReduction,
  getIntellectStartSoul,
  getIntellectSoulPerMagic,
  getStrengthHpBonus,
  getStrengthSoulPerPhys,
  getAgilityCritDmgBonus,
  getAgilitySoulOnDodge,
  getIfritIgniteRate,
} from '../utils/helpers.js';
import {
  PASSIVE_SKILLS,
  ULTIMATE_SKILLS,
  COMBAT_SKILLS,
  GAME_CONFIG,
  CLASS_ULTIMATES,
} from '../data.js';
import { calculateDamage, getDisplayDamage, rollCrit, rollDodge } from '../combat/damage.js';
import {
  buildInitialPlayer,
  buildInitialEnemy,
  buildEffectivePassives,
  buildRelicStatBag,
} from '../combat/initCombat.js';
import { FloatingLabel, DamageVignette, WhiteFlash, SlashFx, MagicImpactFx, MagicParticles, BarrierRing, BarrierBreakFx, ThrustFx, BladeGuardFx, ShadowStrikeFx, StatusOverlay, UltimateCutin, EternalFlameCutin, FireballFx, ExplosionFx, IgniteGlowAura, IgniteExplodeFx, FlameBarrierFx, FlameReflectFx, CritScreenFx } from './CombatEffects.jsx';

export default function CombatScreen({ classData, initialPlayer, initialSkills, initialUltimates = [], initialRelics = [], activeSkills = null, activeRelicNames = null, enemyKey, isBoss, expedition, curses = [], meta, engravingFx = {}, onVictory, onDefeat }) {
  const [player, setPlayer] = useState(() => buildInitialPlayer({
    initialPlayer, initialSkills, initialUltimates, activeSkills, meta, curses,
  }));
  const [enemy, setEnemy] = useState(() => buildInitialEnemy({ enemyKey, expedition }));
  const skills = useMemo(
    () => buildEffectivePassives({
      initialSkills, initialRelics, activeRelicNames,
      sealedSkills: player?.debuffs?.sealedSkills || [],
    }),
    [initialSkills, initialRelics, activeRelicNames, player?.debuffs?.sealedSkills],
  );
  const relicStat = useMemo(
    () => buildRelicStatBag({ initialRelics, activeRelicNames }),
    [initialRelics, activeRelicNames],
  );
  const [ultimates] = useState(initialUltimates);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState('intro');
  const [log, setLog] = useState([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const [animDmg, setAnimDmg] = useState({ player: null, enemy: null });

  // === Phase 1 시각 이팩트 큐/트리거 ===
  // 부유 라벨 큐 — 카드 형식. 부모가 absolute 컨테이너로 잡고 위에 표시.
  // item: { id, side: 'enemy'|'player', kind: 'damage'|'crit'|'heal'|'miss', value?, label? }
  const [fxLabels, setFxLabels] = useState([]);
  const fxIdRef = useRef(0);
  // 흔들림/플래시/비네트는 카운터(증가시 키 리렌더). 0이면 미발동.
  const [fxScreenShake, setFxScreenShake] = useState(0);
  const [fxEnemyShake, setFxEnemyShake] = useState(0);
  const [fxPlayerShake, setFxPlayerShake] = useState(0);
  const [fxEnemyFlash, setFxEnemyFlash] = useState(0);
  const [fxPlayerFlash, setFxPlayerFlash] = useState(0);
  const [fxVignette, setFxVignette] = useState(0);
  // === Phase 2 트리거 === (각 카운터가 증가하면 해당 이팩트 1회 재생)
  const [fxSlash, setFxSlash] = useState(0);
  const [fxSlashCrit, setFxSlashCrit] = useState(false);
  const [fxMagicImpact, setFxMagicImpact] = useState(0);
  const [fxMagicParticles, setFxMagicParticles] = useState(0);
  const [fxBarrier, setFxBarrier] = useState(0);
  const [fxBarrierBreak, setFxBarrierBreak] = useState(0); // 방어 흡수 발생 시 (조건: 방어 > 0)
  // 방랑검사 슬롯별 전용 FX
  const [fxThrust, setFxThrust] = useState(0);              // 슬롯 2 — 관통
  const [fxThrustCrit, setFxThrustCrit] = useState(false);
  const [fxBladeGuard, setFxBladeGuard] = useState(0);      // 슬롯 3 — 방검
  const [fxShadowStrike, setFxShadowStrike] = useState(0);  // 슬롯 4 — 무영의 일격
  const [enemyImgFailed, setEnemyImgFailed] = useState(false);
  // 소울 스킬 컷인 (직업 이미지 + 궁극명 풀스크린 0.9초)
  const [fxUltimateCutin, setFxUltimateCutin] = useState(null); // { name, color } or null
  // 1.45.0 술법사 화염 이펙트 6종
  const [fxEternalFlame, setFxEternalFlame] = useState(0);  // A. 영겁의 화염 컷인
  const [fxFireball, setFxFireball] = useState(0);          // 파이어볼 (소효과)
  const [fxExplosion, setFxExplosion] = useState(0);        // 익스플로젼 (대효과)
  const [fxIgniteExplode, setFxIgniteExplode] = useState(0); // C. 각인 폭발 임팩트
  const [fxFlameBarrier, setFxFlameBarrier] = useState(0);  // D. 화염장막 결계
  const [fxFlameReflect, setFxFlameReflect] = useState(0);  // D. 화염장막 반사
  // 1.45.2 크리티컬 풀스크린 화면효과 (노란 비네트)
  const [fxCritScreen, setFxCritScreen] = useState(0);

  // 부유 라벨 추가 (자동 제거)
  const pushFxLabel = (side, kind, value, label) => {
    const id = ++fxIdRef.current;
    setFxLabels(prev => [...prev, { id, side, kind, value, label }]);
    const lifeMs = kind === 'crit' ? 1200 : kind === 'miss' ? 900 : 1000;
    setTimeout(() => {
      setFxLabels(prev => prev.filter(it => it.id !== id));
    }, lifeMs);
  };
  // 패시브/유물 툴팁 (클릭 시 정보 표시)
  const [tooltip, setTooltip] = useState(null); // { type: 'skill'|'relic', name, content }
  // 스테이터스 전체 모달 (직업명 옆 ≡ 버튼 클릭)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const logEndRef = useRef(null);
  // 동기적 액션 락: setPhase는 비동기라 빠른 연타 시 race condition 발생.
  // 이 ref로 클릭 즉시 잠그고, 적 턴 종료 후 해제한다.
  const actionLockRef = useRef(false);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  useEffect(() => {
    const initialLog = [{ type: 'narrative', text: `━━ ${enemy.name}이(가) 나타났다 ━━` },
      { type: 'narrative', text: `「${enemy.desc}」` }];
    
    // 저주 표시
    if (curses && curses.length > 0) {
      curses.forEach(c => {
        initialLog.push({ type: 'debuff', text: `✦ [저주 · ${c.name}] ${c.desc}` });
      });
    }
    
    let newPlayer = { ...player };
    
    // 신앙 minor: 모든 능력치 +1/Lv (전투 동안만)
    const allStatsBonus = getMinorBonus(skills, 'allStats+', activeSkills);
    if (allStatsBonus > 0) {
      newPlayer.근력 = (newPlayer.근력 || 10) + allStatsBonus;
      newPlayer.민첩 = (newPlayer.민첩 || 10) + allStatsBonus;
      newPlayer.지능 = (newPlayer.지능 || 10) + allStatsBonus;
      newPlayer.매력 = (newPlayer.매력 || 10) + allStatsBonus;
      initialLog.push({ type: 'passive', text: `◆ [신앙 누적] 모든 능력치 +${allStatsBonus}` });
    }
    
    // 수비 minor: 시작 방어 +5/Lv
    const minorDef = getMinorBonus(skills, 'startDef+', activeSkills);
    if (minorDef > 0) {
      newPlayer.defense += minorDef;
      initialLog.push({ type: 'passive', text: `◆ [수비 누적] 시작 방어 +${minorDef}` });
    }
    if (hasEffect(skills, 'startDefense+30', activeSkills)) {
      newPlayer.defense += 30;
      initialLog.push({ type: 'passive', text: `◆ [수비 Lv.3] 시작 방어 +30` });
    }
    // 유물: 전투 시작 시 방어 +
    if (relicStat.shieldOnStart > 0) {
      newPlayer.defense += relicStat.shieldOnStart;
      initialLog.push({ type: 'passive', text: `◆ [수호의 방패] 시작 방어 +${relicStat.shieldOnStart}` });
    }
    if (hasEffect(skills, 'heal20%', activeSkills)) {
      const heal = Math.floor(newPlayer.maxHp * 0.2);
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
      initialLog.push({ type: 'passive', text: `◆ [재생 Lv.5] HP ${heal} 회복` });
    }
    if (hasEffect(skills, 'firstHitImmune', activeSkills)) {
      newPlayer.firstHitImmune = true;
      initialLog.push({ type: 'passive', text: `◆ [회피 Lv.7] 첫 피격 무효 활성` });
    }
    
    // 저주: 시작 방어 0
    if (hasCurse(curses, 'curse_noDefense')) {
      newPlayer.defense = 0;
    }

    // 1.37.0~ 시작 소울 게이지 가산 (지능 시그니처 + 각인 + 유물·메타). 직업 소울 스킬 보유 직업만.
    if (classData?.ultimateId) {
      const intelStartSoul = getIntellectStartSoul(newPlayer);
      const engStartSoul = engravingFx.startSoul || 0;
      const relicStartSoul = relicStat.startSoul || 0;
      const metaStartSoul = getMetaBonus(meta, 'startSoul+5') * 5;
      const totalStartSoul = intelStartSoul + engStartSoul + relicStartSoul + metaStartSoul;
      if (totalStartSoul > 0) {
        newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + totalStartSoul);
        const parts = [];
        if (intelStartSoul > 0) parts.push(`지능 +${intelStartSoul}`);
        if (engStartSoul > 0) parts.push(`각인 +${engStartSoul}`);
        if (relicStartSoul > 0) parts.push(`유물 +${relicStartSoul}`);
        if (metaStartSoul > 0) parts.push(`메타 +${metaStartSoul}`);
        initialLog.push({
          type: 'passive',
          text: `◆ 소울 게이지 보너스 : ${totalStartSoul} (${parts.join(' + ')})`,
        });
      }
    }

    // 신앙 Lv.7: 수신사 등극 - 전투 시작 시 적에게 신탁 발동
    let oracleDebuffs = null;
    if (hasEffect(skills, 'oracleUser', activeSkills)) {
      oracleDebuffs = { bleed: 2, bleedTurns: 3, shockGauge: 101 };
      initialLog.push({ type: 'passive', text: `◆ [신앙 Lv.7] 수신사의 신탁! 적에게 출혈 3턴 + 기절 1턴` });
    }
    
    setPlayer(newPlayer);
    if (oracleDebuffs) {
      setEnemy(e => ({ ...e, debuffs: { ...e.debuffs, ...oracleDebuffs } }));
    }
    setLog(initialLog);
    setTimeout(() => {
      const patterns = enemy.patterns;
      const firstIntent = patterns[Math.floor(Math.random() * patterns.length)];
      setEnemy(e => {
        const updated = { ...e, nextIntent: firstIntent };
        // 첫 의도가 defend면 즉시 방어 적용 (그 턴만 유지)
        if (firstIntent?.type === 'defend' && firstIntent.defense) {
          updated.defense = firstIntent.defense;
        }
        return updated;
      });
      setPhase('playerTurn');
    }, 600);
  }, []);

  const handlePlayerAction = (skillKey) => {
    if (phase !== 'playerTurn') return;
    if (actionLockRef.current) return;  // 동기 락 체크 - 처리 중이면 무시
    const skill = COMBAT_SKILLS[skillKey];
    if (!skill) return;
    if (player.cooldowns[skillKey] > 0) return;
    // 단독 버프 스킬은 턴당 1회 — 같은 턴 재사용 차단 (쿨타임 0이어도)
    if (skill.type === 'buff' && player.usedBuffThisTurn) return;
    // 1.45.3: 마력 Lv5 etherCost-20 효과 폐기 (재시전 +10%로 변경됨)
    let etherCost = skill.cost || 0;
    if (etherCost > player.ether) return;

    // 모든 검증 통과 → 락 획득
    actionLockRef.current = true;

    const newLog = [...log,
      { type: 'turnDivider', turn },
      { type: 'player', text: `▸ ${skill.name}` },
    ];
    let newPlayer = { ...player, ether: player.ether - etherCost };
    let newEnemy = { ...enemy };

    if (skill.selfDmg) {
      newPlayer.hp = Math.max(1, newPlayer.hp - skill.selfDmg);
      newLog.push({ type: 'system', text: `· 자신 HP -${skill.selfDmg}` });
    }

    if (skill.type === 'physical' || skill.type === 'magic') {
      // === Phase 2 FX: 스킬 타입별 임팩트 트리거 (스킬 1회당 1번) ===
      // React state는 동일 핸들러 안에서 배치되므로, 아래에서 isCrit 확정 후
      // setFxSlashCrit(true)를 호출해도 첫 렌더에 반영됨.
      if (skill.type === 'physical') {
        // 방랑검사 슬롯별 차별화: 참격(기본 슬래시) / 관통(스러스트)
        if (skillKey === '관통') {
          setFxThrustCrit(false);
          setFxThrust(v => v + 1);
        } else {
          setFxSlashCrit(false);
          setFxSlash(v => v + 1);
        }
      } else {
        // 1.45.0~ 술법사 화염 스킬은 전용 화염 이펙트 (skillKey 기준 분기)
        // 마법탄(파이어볼) → 소효과, 정념폭발(익스플로젼) → 대효과, 그 외 마법 → 기본 보라 임팩트
        if (skillKey === '마법탄') {
          setFxFireball(v => v + 1);
        } else if (skillKey === '정념폭발') {
          setFxExplosion(v => v + 1);
        } else {
          setFxMagicImpact(v => v + 1);
          setFxMagicParticles(v => v + 1);
        }
      }
      // 1.37.0~ 시그니처: 마법 시전 시 영혼 +N (지능 17+, 5단위) / 물리 시전 시 영혼 +N (근력 17+, 5단위)
      // 1.46.0~ 각인 magicSoulBonus: 마법 시전 시 추가 소울 +N (술법사 풀, ultimateId 무관 적용)
      if (skill.type === 'magic' && engravingFx.magicSoulBonus) {
        newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + engravingFx.magicSoulBonus);
      }
      if (classData.ultimateId) {
        if (skill.type === 'magic') {
          const intelSoul = getIntellectSoulPerMagic(newPlayer);
          if (intelSoul > 0) {
            newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + intelSoul);
          }
        } else if (skill.type === 'physical') {
          const strSoul = getStrengthSoulPerPhys(newPlayer);
          if (strSoul > 0) {
            newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + strSoul);
          }
        }
      }
      // 1.45.3 마력 재시전 — Lv3 +5% / Lv5 +10% / Lv7 +15% 누적 (만렙 총 30%)
      const echoChancePct = skill.type === 'magic' ? getMagicEchoChance(skills, activeSkills) : 0;
      let echoTimes = 1;
      if (echoChancePct > 0 && Math.random() * 100 < echoChancePct) {
        echoTimes = 2;
      }
      
      const hitCount = skill.hitCount || 1;
      let totalDmg = 0;
      let usedGuaranteedCrit = false;
      
      for (let echo = 0; echo < echoTimes; echo++) {
        if (echo > 0) {
          newLog.push({ type: 'passive', text: `◆ [마력 재시전] 마법 재시전! (${echo}/${echoTimes - 1})` });
        }
        
        for (let i = 0; i < hitCount; i++) {
          let isCrit = rollCrit(skills, newPlayer, meta, activeSkills, relicStat, ultimates, engravingFx);
          // 신앙 Lv.3: 다음 공격 치명타 확정 (한 번 사용)
          if (!usedGuaranteedCrit && newPlayer.buffs?.guaranteedCrit > 0) {
            isCrit = true;
            usedGuaranteedCrit = true;
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCrit: 0 };
            newLog.push({ type: 'passive', text: `◆ [신앙 Lv.3] 치명타 확정 발동` });
          }
          // 심안류 Lv.7: 반격 후 다음 턴 반드시 치명타 (1회)
          if (!usedGuaranteedCrit && newPlayer.buffs?.guaranteedCritNext) {
            isCrit = true;
            usedGuaranteedCrit = true;
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCritNext: false };
            newLog.push({ type: 'passive', text: `◆ [심안류 Lv.7] 반격 후 치명타 확정!` });
          }
          // 검로일여: 기절한(또는 기절 경험한) 적 공격 시 치명타
          if (!isCrit && hasUltimate(ultimates, 'ult_counterShock')
              && (newEnemy.debuffs?.stunned > 0 || newEnemy.debuffs?.everStunned)) {
            isCrit = true;
            newLog.push({ type: 'passive', text: `★ [검로일여] 기절 적 공격 → 치명타!` });
          }
          const dmgResult = calculateDamage(skill, newPlayer, newEnemy, skills, isCrit, ultimates, meta, curses, activeSkills, relicStat, engravingFx);
          let actualDmg = dmgResult.finalDmg;
          // 1.27.0~ 각인: afterDodgeDmgNext 1회 소비 (calculateDamage에서 보너스 적용 완료)
          if (newPlayer.buffs?.afterDodgeDmgNext) {
            newPlayer.buffs = { ...newPlayer.buffs, afterDodgeDmgNext: false };
          }
          if (newEnemy.defense > 0 && !skill.pierce) {
            newEnemy.defense = Math.max(0, newEnemy.defense - dmgResult.defenseMitigated);
          }
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg);
          totalDmg += actualDmg;
          // 소울 게이지: 데미지 입힘 +dmg/5, 치명타 +10 보너스
          if (classData.ultimateId && actualDmg > 0) {
            let gain = Math.floor(actualDmg / 5);
            if (isCrit) gain += 10;
            // 1.27.0~ 각인: 영혼 획득 ×(1 + soulGainMult)
            if (engravingFx.soulGainMult) {
              gain = Math.floor(gain * (1 + engravingFx.soulGainMult));
            }
            newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + gain);
          }
          // FX — 적 피격: 부유 데미지 라벨 + 진동 + 흰 플래시
          if (actualDmg > 0) {
            pushFxLabel('enemy', isCrit ? 'crit' : 'damage', actualDmg);
            setFxEnemyShake(v => v + 1);
            setFxEnemyFlash(v => v + 1);
            // 크리티컬이면 화면도 가볍게 흔들기 + 스킬별로 다른 강조 + 1.45.2~ 노란 비네트 화면효과
            if (isCrit) {
              setFxScreenShake(v => v + 1);
              setFxCritScreen(v => v + 1);  // 1.45.2: 익스플로젼·각인 폭발과 차별화된 풀스크린 화면효과
              if (skill.type === 'physical') {
                if (skillKey === '관통') setFxThrustCrit(true);
                else setFxSlashCrit(true);
              }
            }
          }
          
          // === 이프리트 화염 각인 폭발 (minor 효과 + 궁극) ===
          // 1.33.0~ 폭발 조건:
          // - 영겁지화 보유: 폭발 비활성 (단독·+패시브·+다른궁극 모두). 화염 각인·겁화 모두 비활성
          // - 화신강림/연옥지화 (영겁지화 없음): 폭발 가능
          // - 이프리트 패시브만 (궁극 없음): 폭발 가능
          const ifritLvForExplode = (skills && skills['이프리트']) || 0;
          const hasIfritPassiveExplode = ifritLvForExplode > 0 && (!activeSkills || activeSkills.includes('이프리트'));
          const hasEternalFireExplode = hasUltimate(ultimates, 'ult_eternalFire');
          const hasIfritDescentExplode = hasUltimate(ultimates, 'ult_ifritDescent');
          const hasPurgatoryFireExplode = hasUltimate(ultimates, 'ult_purgatoryFire');

          // 영겁지화 보유 시 폭발 전면 비활성
          const canExplode = !hasEternalFireExplode && (hasIfritPassiveExplode || hasIfritDescentExplode || hasPurgatoryFireExplode);
          
          if (isCrit && canExplode && newEnemy.debuffs?.igniteDmg > 0 && newEnemy.debuffs?.igniteTurns > 0) {
            const remainTurns = newEnemy.debuffs.igniteEternal ? 5 : newEnemy.debuffs.igniteTurns;
            const explosionDmg = newEnemy.debuffs.igniteDmg * remainTurns * 2;
            newEnemy.currentHp = Math.max(0, newEnemy.currentHp - explosionDmg);
            totalDmg += explosionDmg;
            newLog.push({ type: 'crit', text: `🔥 [화염 폭발] ${explosionDmg} 데미지` });
            // 1.45.0~ 각인 폭발 임팩트 FX
            setFxIgniteExplode(v => v + 1);
            
            // 폭발 후 각인 소멸
            newEnemy.debuffs = { 
              ...newEnemy.debuffs, 
              igniteDmg: 0, 
              igniteTurns: 0,
              igniteEternal: false,
              igniteJustApplied: false,
            };
            
            // 화신강림: 폭발 후 다음 1턴 치명타 +30% (1.33.0~ 상향)
            if (hasIfritDescentExplode) {
              newPlayer.buffs = { ...newPlayer.buffs, ifritCritNext: true };
              newLog.push({ type: 'passive', text: `★ [화신강림] 다음 턴 치명타 확률 +30%` });
            }
          }

          // 1.42.0~ 겁화는 각인폭발 대상에서 제외 (영겁의 화염 → 무한 도트 정체성).
          // 이전(1.29.0~1.41.0): 치명타 시 겁화도 폭발했으나, 영겁의 화염은 "꺼지지 않는 도트"가 정체성이라 폭발 비활성화.

          const echoTag = (echo > 0) ? ` [재시전 ${echo}]` : '';
          newLog.push({
            type: 'damage',
            text: `· ${enemy.name}에게 ${actualDmg} 데미지${isCrit ? ' [치명타!]' : ''}${hitCount > 1 ? ` (${i+1}/${hitCount})` : ''}${echoTag}`,
            breakdown: dmgResult.breakdown.join(' / '),
          });
          
          // 매 히트마다 디버프 부여 (다단히트 누적)
          const attackPassivesPerHit = getActivePassives(skills, 'onAttack', activeSkills);
          attackPassivesPerHit.forEach(p => {
            if (p.effect === 'applyShockGauge') {
              let gaugeAdd = GAME_CONFIG.shockGaugeBase;
              if (hasEffect(skills, 'shockBonus', activeSkills)) gaugeAdd = GAME_CONFIG.shockGaugeBase + GAME_CONFIG.shockGaugeBonus;
              if (newEnemy.debuffs?.shockResist > 0) {
                gaugeAdd = Math.floor(gaugeAdd * GAME_CONFIG.shockResistReduction);
              }
              const currentGauge = newEnemy.debuffs?.shockGauge || 0;
              let newGauge = currentGauge + gaugeAdd;
              if (newGauge >= 100) {
                newLog.push({ type: 'debuff', text: `◆ [${p.skillName} Lv.${p.tierLv}] 충격 ${currentGauge}+${gaugeAdd}=100! 기절!` });
                newEnemy.debuffs = {
                  ...newEnemy.debuffs,
                  stunned: 1, shockGauge: 0,
                  shockResist: GAME_CONFIG.shockResistTurns,
                  shockResistTurns: GAME_CONFIG.shockResistTurns,
                  everStunned: true,
                };
                if (hasEffect(skills, 'shockBonus', activeSkills)) {
                  const bonusDmg = 15;
                  newEnemy.currentHp = Math.max(0, newEnemy.currentHp - bonusDmg);
                  newLog.push({ type: 'damage', text: `· [강타 Lv.5] 기절 추가 데미지 ${bonusDmg}` });
                }
              } else {
                newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: newGauge };
              }
            }
            if (p.effect === 'applyBleed') {
              const stacks = (newEnemy.debuffs?.bleed || 0);
              const newStacks = hasEffect(skills, 'bleedStack', activeSkills) ? Math.min(stacks + 1, 5) : 1;
              newEnemy.debuffs = { ...newEnemy.debuffs, bleed: newStacks, bleedTurns: 3 };
            }
            if (p.effect === 'execute') {
              const execThreshold = 0.2;
              const execChance = 0.15;
              if (newEnemy.currentHp > 0 && newEnemy.currentHp <= newEnemy.maxHp * execThreshold && Math.random() < execChance) {
                newLog.push({ type: 'system', text: `◆ [잔혹 Lv.7] 즉사 발동!` });
                newEnemy.currentHp = 0;
              }
            }
          });
          
          if (newEnemy.currentHp <= 0) break;
        }
        if (newEnemy.currentHp <= 0) break;
      }
      
      setAnimDmg({ player: null, enemy: totalDmg });
      setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);

      // 강제 출혈 (피의 일격)
      if (skill.forceBleed) {
        newEnemy.debuffs = { ...newEnemy.debuffs, bleed: (newEnemy.debuffs?.bleed || 0) + 1, bleedTurns: 3 };
        newLog.push({ type: 'debuff', text: `· 출혈 부여` });
      }
      
      // === 이프리트 화염 각인 (minor 효과 + 궁극) ===
      // 이프리트 패시브 보유 (Lv.0+ 활성) 또는 궁극 보유 시 발동
      const ifritLvForIgnite = (skills && skills['이프리트']) || 0;
      const hasIfritPassive = ifritLvForIgnite > 0 && (!activeSkills || activeSkills.includes('이프리트'));
      const hasEternalFire = hasUltimate(ultimates, 'ult_eternalFire');
      const hasIfritDescent = hasUltimate(ultimates, 'ult_ifritDescent');
      const hasPurgatoryFire = hasUltimate(ultimates, 'ult_purgatoryFire');
      const hasAnyIfritUlt = hasEternalFire || hasIfritDescent || hasPurgatoryFire;
      
      // 1.46.0~ 각인 igniteApplyPct: 이프리트 없이도 화염 각인 부여 가능 (술법사 풀)
      // 1.46.0~ 각인 igniteSuppress: 화염 각인 부여 강제 봉인 (술법사 저주, 이프리트 보유해도 0%)
      const hasIgniteSource = hasIfritPassive || hasAnyIfritUlt || (engravingFx.igniteApplyPct > 0);
      if (skill.type === 'magic' && hasIgniteSource && !engravingFx.igniteSuppress && newEnemy.currentHp > 0) {
        // 1.33.0~ 발동율 통일: 궁극 보유 시 공통 70% / 패시브만 30%. minor +2%/Lv는 별도 합산
        let igniteChance = 0;
        if (hasAnyIfritUlt) igniteChance = 0.7;
        else if (hasIfritPassive) igniteChance = 0.3;
        // 이프리트 minor: 레벨당 +2% 발동율 (패시브 + 궁극 모두 합산)
        const igniteRateBonus = getMinorBonus(skills, 'ifritIgniteRate+', activeSkills) / 100;
        igniteChance += igniteRateBonus;
        // 영겁지화 미발동 누적 보너스: 미발동 1회당 +10% (각인 발동까지 누적)
        const eternalMissStack = newPlayer.buffs?.eternalFireMissStack || 0;
        if (hasEternalFire) igniteChance += eternalMissStack * 0.1;
        // 1.46.0~ 각인 igniteApplyPct: 부여 확률 +N% (술법사 풀, 슬롯 합산)
        if (engravingFx.igniteApplyPct) {
          igniteChance += engravingFx.igniteApplyPct / 100;
        }
        igniteChance = Math.min(1, igniteChance);

        if (Math.random() < igniteChance) {
          // 각인 데미지: 영겁 ×0.5 / 화신 ×0.4 / 연옥 ×0.3 / 패시브만 ×0.3
          let dmgMult = 0.3;
          if (hasEternalFire) dmgMult = 0.5;
          else if (hasIfritDescent) dmgMult = 0.4;
          else if (hasPurgatoryFire) dmgMult = 0.3;
          const baseIgniteDmg = Math.floor(newPlayer.지능 * dmgMult);

          // 각인 지속: 영겁 영구 / 화신 3T / 연옥 4T / 패시브만 3T (1.33.0~ Lv.7 +1T 효과 제거)
          let newIgniteDmg;
          let newIgniteTurns;
          let isEternal;

          if (hasEternalFire) {
            // 영겁지화 — 스택 누적, 영구 지속
            const prevDmg = newEnemy.debuffs?.igniteDmg || 0;
            newIgniteDmg = prevDmg + baseIgniteDmg;
            newIgniteTurns = 999;
            isEternal = true;
          } else if (hasPurgatoryFire) {
            newIgniteDmg = baseIgniteDmg;
            newIgniteTurns = 4;
            isEternal = false;
          } else {
            // 화신강림 또는 패시브만
            newIgniteDmg = baseIgniteDmg;
            newIgniteTurns = 3;
            isEternal = false;
          }

          // 1.46.0~ 각인: 화염 각인 데미지 +N% (술법사 풀)
          if (engravingFx.igniteDmgPct) {
            newIgniteDmg = Math.floor(newIgniteDmg * (1 + engravingFx.igniteDmgPct / 100));
          }

          newEnemy.debuffs = {
            ...newEnemy.debuffs,
            igniteDmg: newIgniteDmg,
            igniteTurns: newIgniteTurns,
            igniteEternal: isEternal,
            igniteJustApplied: true,  // 이번 턴 부여 여부 (연옥지화 +20% 마법딜에 사용)
          };
          // 영겁지화 발동 시 미발동 스택 초기화
          if (hasEternalFire) {
            newPlayer.buffs = { ...newPlayer.buffs, eternalFireMissStack: 0 };
          }
          // 1.46.0~ 각인 soulOnIgniteApply: 화염 각인 부여 성공 시 소울 +N (술법사 풀)
          if (engravingFx.soulOnIgniteApply) {
            newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + engravingFx.soulOnIgniteApply);
          }
          newLog.push({ type: 'debuff', text: `🔥 [화염 각인] ${newIgniteDmg} 데미지 ${isEternal ? '영구' : newIgniteTurns + 'T'}` });
        } else if (hasEternalFire) {
          // 영겁지화 미발동 — 다음 발동율 +10% 누적
          const nextStack = eternalMissStack + 1;
          newPlayer.buffs = { ...newPlayer.buffs, eternalFireMissStack: nextStack };
          newLog.push({ type: 'passive', text: `☆ [영겁지화] 미발동 — 다음 발동율 +${nextStack * 10}%` });
        }
      }
      // 자가 회복 (사제 - 신성광선)
      if (skill.selfHeal) {
        let heal = skill.selfHeal;
        if (relicStat.heal > 0) heal = Math.floor(heal * (1 + relicStat.heal / 100));
        const charismaBonus = getCharismaHealBonus(newPlayer);
        if (charismaBonus > 0) heal = Math.floor(heal * (1 + charismaBonus / 100));
        if (hasCurse(curses, 'curse_heal-50')) heal = Math.floor(heal * 0.5);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◇ HP +${heal}` });
      }
    }

    if (skill.type === 'defense') {
      newPlayer.defense += skill.defense;
      newLog.push({ type: 'system', text: `· 방어 +${skill.defense}` });
      // Phase 2 FX: 방검 → 다이아몬드 가드, 화염장막 → 붉은 화염 결계, 그 외 → 일반 결계 링
      if (skillKey === '방검') setFxBladeGuard(v => v + 1);
      else if (skillKey === '화염장막') setFxFlameBarrier(v => v + 1);
      else setFxBarrier(v => v + 1);
      if (skill.dodgeBuff) {
        newPlayer.buffs = { ...newPlayer.buffs, dodgeBuff: skill.dodgeBuff, dodgeBuffTurns: 1 };
      }
      // 화염장막 (sage): 다음 적 공격 1회에 한해 50% 확률로 화염 각인 반사
      if (skill.reflectIgnite) {
        newPlayer.buffs = { ...newPlayer.buffs, flameBarrierPending: skill.reflectIgnite };
      }
      // 자가 회복 (사제 - 가호)
      if (skill.selfHeal) {
        let heal = skill.selfHeal;
        if (relicStat.heal > 0) heal = Math.floor(heal * (1 + relicStat.heal / 100));
        const charismaBonus = getCharismaHealBonus(newPlayer);
        if (charismaBonus > 0) heal = Math.floor(heal * (1 + charismaBonus / 100));
        if (hasCurse(curses, 'curse_heal-50')) heal = Math.floor(heal * 0.5);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◇ HP +${heal}` });
      }
    }
    if (skill.type === 'buff' && skill.buff === 'rage') {
      newPlayer.buffs = { ...newPlayer.buffs, rage: 2 };
      newPlayer.usedBuffThisTurn = true;  // 같은 턴 재사용 차단 플래그
      newLog.push({ type: 'system', text: `· 분노 발동! 2턴간 데미지 +30%` });
    }
    if (skill.cd > 0) {
      // 가속 minor: 쿨다운 -1턴 (Lv.4마다 누적)
      const cdReduce = Math.floor(getMinorBonus(skills, 'cdReduce+', activeSkills) / 4);
      let finalCd = Math.max(0, skill.cd - cdReduce);
      // 단독 버프 스킬은 쿨타임 감소 후에도 최소 1턴 강제 (무한 사용 방지)
      if (skill.type === 'buff') finalCd = Math.max(1, finalCd);
      if (finalCd > 0) newPlayer.cooldowns = { ...newPlayer.cooldowns, [skillKey]: finalCd };
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setLog(newLog);

    if (newEnemy.currentHp <= 0) {
      if (relicStat.lifesteal > 0) {
        const heal = relicStat.lifesteal;
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◆ [유물] 흡혈 +${heal}` });
        setPlayer(newPlayer);
      }
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'victory', text: `━━ ${enemy.name} 처치 ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
      }, 800);
      return;
    }

    // 단독 버프 스킬은 적 턴 진입 X — 시간 흐름 정지, 플레이어 입력 계속 받기
    if (skill.type === 'buff') {
      actionLockRef.current = false;
      return;
    }

    setPhase('enemyTurn');
    setTimeout(() => { executeEnemyTurn(newPlayer, newEnemy, newLog); }, 350);
  };

  // === 직업 소울 스킬 발동 ===
  // 소울 게이지 100에서만 호출됨. 발동 시 게이지 0으로 리셋, 컷인 0.9초 후
  // 효과 적용 → 적 턴으로 전환. 효과는 ult.effect ID로 분기 (CLASS_ULTIMATES).
  const handleUltimate = () => {
    if (phase !== 'playerTurn') return;
    if (actionLockRef.current) return;
    if (!classData.ultimateId) return;
    if ((player.soulGauge || 0) < 100) return;
    const ult = CLASS_ULTIMATES[classData.ultimateId];
    if (!ult) return;

    actionLockRef.current = true;

    // 컷인 표시 (CSS 키프레임이 자동 종료)
    // 1.45.2: 술법사 영겁 발동 시 UltimateCutin(공용 골든 배너) 스킵 — EternalFlameCutin이 한자 + 한글명 모두 처리
    if (classData.ultimateId === 'sage_eternalFlame') {
      setFxEternalFlame(v => v + 1);
      setTimeout(() => setFxEternalFlame(0), 950);
    } else {
      setFxUltimateCutin({ name: ult.name, color: ult.color });
      setTimeout(() => setFxUltimateCutin(null), 900);
    }

    // 0.9초 컷인 후 효과 적용
    setTimeout(() => {
      let newPlayer = { ...player, soulGauge: 0 };
      let newEnemy = { ...enemy };
      const newLog = [...log,
        { type: 'turnDivider', turn },
        { type: 'crit', text: `★ ${ult.name} 발동! ${ult.quote ? `「${ult.quote}」` : ''}` },
      ];

      // === 효과 분기 ===
      if (ult.effect === 'classult_shadowStrike') {
        // 45 데미지(방어 무시) + 3턴 반격율 100% + 다음 공격 치명타 확정
        // (현재 HP % 방식은 적이 약할 때 일반 공격보다 약해지는 문제 → 생존기 컨셉으로 재설계)
        // 1.15.0 → 1.15.1: 80 데미지가 일반 적을 한 방에 처치해 반격 버프 발동 기회를 없앤다는 PM 피드백 → 45로 너프
        const cut = 45;
        newEnemy.currentHp = Math.max(0, newEnemy.currentHp - cut);
        newPlayer.buffs = {
          ...newPlayer.buffs,
          guaranteedCrit: 1,
          shadowCounterTurns: 3,  // 3턴 동안 반격 확률 100%
        };
        newLog.push({ type: 'damage', text: `· ${enemy.name}에게 ${cut} 데미지 [방어 무시]` });
        newLog.push({ type: 'passive', text: `★ [무영의 잔영] 3턴간 반격 확률 100%` });
        newLog.push({ type: 'passive', text: `◆ 다음 공격 치명타 확정` });

        // FX — 전용 3중 슬래시 ShadowStrikeFx + 화면 흔들림 + 적 흔들림 + 흰 플래시
        setFxShadowStrike(v => v + 1);
        setFxScreenShake(v => v + 1);
        setFxEnemyShake(v => v + 1);
        setFxEnemyFlash(v => v + 1);
        pushFxLabel('enemy', 'crit', cut);
      } else if (ult.effect === 'classult_eternalFlame') {
        // 50 화염 데미지(방어 무시) + 겁화 영구 부여(지능×0.4/턴) + 다음 2턴 마법 데미지 +50%
        // 1.42.0~ 겁화 무한 도트로 재설계: 영구 지속(9999T) + 각인폭발 대상 제외.
        //   이전(1.29.0~1.41.0): 5T 한정 + 치명타 시 폭발 가능. 폭발이 정체성을 흐려 무한 도트로 통일.
        const cut = 50;
        newEnemy.currentHp = Math.max(0, newEnemy.currentHp - cut);

        // 겁화 강제 부여 (영구 지속, 재발동 시 데미지만 갱신)
        const eternalDmg = Math.floor((newPlayer.지능 || 0) * 0.4);
        if (newEnemy.currentHp > 0 && eternalDmg > 0) {
          newEnemy.debuffs = {
            ...newEnemy.debuffs,
            eternalFireDmg: eternalDmg,
            eternalFireTurns: 9999,
            eternalFireEternal: true,
            eternalFireJustApplied: true,
          };
          newLog.push({ type: 'debuff', text: `🌋 [겁화] ${eternalDmg} 데미지 영구 부여` });
        }

        // 다음 2턴 마법 데미지 +50% 버프
        newPlayer.buffs = {
          ...newPlayer.buffs,
          flameBoostPct: 50,
          flameBoostTurns: 2,
        };

        newLog.push({ type: 'damage', text: `· ${enemy.name}에게 ${cut} 화염 데미지 [방어 무시]` });
        newLog.push({ type: 'passive', text: `★ [영겁의 정념] 2턴간 마법 데미지 +50%` });

        // FX — 화면 흔들림 + 적 흔들림 + 흰 플래시
        setFxScreenShake(v => v + 1);
        setFxEnemyShake(v => v + 1);
        setFxEnemyFlash(v => v + 1);
        pushFxLabel('enemy', 'crit', cut);
      }

      setPlayer(newPlayer);
      setEnemy(newEnemy);
      setLog(newLog);

      // 적이 죽었으면 승리 처리
      if (newEnemy.currentHp <= 0) {
        actionLockRef.current = false;
        setTimeout(() => setPhase('victory'), 400);
        return;
      }

      // 적 턴으로 진행
      setPhase('enemyTurn');
      setTimeout(() => { executeEnemyTurn(newPlayer, newEnemy, newLog); }, 350);
    }, 900);
  };

  const executeEnemyTurn = (curPlayer, curEnemy, curLog) => {
    const newLog = [...curLog];
    let newPlayer = { ...curPlayer };
    let newEnemy = { ...curEnemy };

    if (newEnemy.debuffs?.stunned > 0) {
      newLog.push({ type: 'debuff', text: `◆ ${enemy.name}이(가) 기절 상태로 행동 못 함` });
      // 기절 1턴 소모
      newEnemy.debuffs = { ...newEnemy.debuffs, stunned: 0 };
      setEnemy(newEnemy); setLog(newLog);
      setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 400);
      return;
    }

    const intent = curEnemy.nextIntent;
    if (!intent) { setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 300); return; }
    newLog.push({ type: 'enemy', text: `◂ ${enemy.name}: ${intent.name}` });

    if (intent.type === 'attack') {
      const dodged = rollDodge(skills, newPlayer, activeSkills, relicStat, ultimates, engravingFx, meta);
      if (dodged) {
        newLog.push({ type: 'system', text: `· 회피 성공!` });
        // FX — 회피: 플레이어 위에 "회피!" 부유 라벨
        pushFxLabel('player', 'miss', null, '회피!');
        // 1.27.0~ 각인: 회피 시 소울 게이지 +N
        if (engravingFx.dodgeSoul) {
          newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + engravingFx.dodgeSoul);
        }
        // 1.37.0~ 민첩 시그니처 2단계: 회피 시 영혼 +N (민첩 17+, 5단위)
        if (classData?.ultimateId) {
          const dexSoul = getAgilitySoulOnDodge(newPlayer);
          if (dexSoul > 0) {
            newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + dexSoul);
          }
        }
        // 1.27.0~ 각인: 회피 후 다음 공격 데미지 +N% 버프 (다음 calculateDamage에서 소비)
        if (engravingFx.afterDodgeDmg) {
          newPlayer.buffs = { ...newPlayer.buffs, afterDodgeDmgNext: true };
        }
        if (hasEffect(skills, 'counterAttack', activeSkills) && Math.random() < 0.5) {
          const counterDmg = Math.floor(15 + Math.random() * 10);
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - counterDmg);
          newLog.push({ type: 'damage', text: `◆ [회피 Lv.5] 반격 ${counterDmg} 데미지` });
          if (counterDmg > 0) {
            pushFxLabel('enemy', 'damage', counterDmg);
            setFxEnemyShake(v => v + 1);
            setFxEnemyFlash(v => v + 1);
          }
        }
      } else {
        if (newPlayer.firstHitImmune) {
          newLog.push({ type: 'passive', text: `◆ [회피 Lv.7] 첫 피격 무효!` });
          newPlayer.firstHitImmune = false;
          pushFxLabel('player', 'miss', null, '무효!');
        } else {
          let baseDmg = Math.floor(intent.dmg[0] + Math.random() * (intent.dmg[1] - intent.dmg[0]));
          let dmg = baseDmg;
          let berserkBonus = 0;
          // 챔피언십 — 적 광폭 누적 보너스
          if (newEnemy.berserkStacks > 0) {
            berserkBonus = newEnemy.berserkStacks;
            dmg += berserkBonus;
          }
          const takenBreakdown = [`기본 ${baseDmg}`];
          if (berserkBonus > 0) takenBreakdown.push(`광폭 +${berserkBonus}`);
          
          // 심안류 Lv.5: 반격 확률 사전 굴림 (성공 시 받는 데미지 30% 차단)
          // counterRollResult를 캐싱해서 나중에 같은 결과로 반격 처리
          let counterShieldActive = false;
          const _simanLv = skills['심안류'] || 0;
          const _hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
          const _hasShock = hasUltimate(ultimates, 'ult_counterShock');
          const _hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
          const _hasAnyCounterUlt = _hasMirror || _hasShock || _hasShadow;
          if (_simanLv >= 5 || _hasAnyCounterUlt) {
            // Lv.5 이상에서만 차단 효과 발동 (단순 반격은 차단 X)
            let _counterRate = _simanLv * 5;
            if (_simanLv >= 3) _counterRate += 20;
            if (_hasAnyCounterUlt) _counterRate += 60;
            // 1.27.0~ 각인 counterRatePct도 사전 굴림에 일치 적용
            if (engravingFx.counterRatePct) _counterRate += engravingFx.counterRatePct;
            if (_counterRate > 100) _counterRate = 100;
            if (_counterRate < 0) _counterRate = 0;
            const _rolled = Math.random() * 100;
            if (_rolled < _counterRate && _simanLv >= 5) {
              counterShieldActive = true;
              newPlayer._pendingCounterRoll = _rolled; // 다음 반격 판정에 사용
            } else {
              newPlayer._pendingCounterRoll = _rolled;
            }
          }
          
          // 심안류 Lv.5: 반격 시 받는 데미지 30% 차단
          if (counterShieldActive) {
            const blocked = Math.floor(dmg * 0.3);
            dmg -= blocked;
            if (blocked > 0) takenBreakdown.push(`심안류 Lv.5 -${blocked}`);
          }
          
          // 수비 Lv.7: 방어 게이지가 최대 HP의 50% 이상이면 받는 데미지 50% 차단
          if (hasEffect(skills, 'fortify', activeSkills) && newPlayer.defense >= newPlayer.maxHp * 0.5) {
            const blocked = Math.floor(dmg * 0.5);
            dmg -= blocked;
            if (blocked > 0) takenBreakdown.push(`수비 Lv.7 -${blocked}`);
          }
          if (newPlayer.defense > 0) {
            const absorbed = Math.min(newPlayer.defense, dmg);
            newPlayer.defense -= absorbed;
            dmg -= absorbed;
            if (absorbed > 0) {
              takenBreakdown.push(`내 방어 -${absorbed}`);
              // 방어 차감 별도 로그 — 잔여 방어 명시
              newLog.push({
                type: 'system',
                text: `🛡 방어 -${absorbed} (잔여 ${newPlayer.defense})`,
              });
              // 방어 소진 FX — 방어 > 0 이었던 시점에만 발동 (다음 턴 방어=0이면 발동 X)
              setFxBarrierBreak(v => v + 1);
            }
          }
          if (hasEffect(skills, 'dmgTaken-15', activeSkills) && dmg > 0) {
            const reduced = Math.floor(dmg * 0.15);
            dmg -= reduced;
            if (reduced > 0) takenBreakdown.push(`수비 Lv.5 -${reduced}`);
          }
          // 1.27.0~ 각인: 받는 데미지 +/- N% (음수면 감소)
          if (engravingFx.dmgTakenPct && dmg > 0) {
            const change = Math.floor(dmg * engravingFx.dmgTakenPct / 100);
            dmg += change;
            if (change < 0) takenBreakdown.push(`각인 ${change}`);
            else if (change > 0) takenBreakdown.push(`각인 +${change}`);
          }
          // 메타 강화: 받는 데미지 -2%/단계 (1.44.2~)
          const metaReduction = getMetaBonus(meta, 'dmgTaken-2%') * 0.02;
          if (metaReduction > 0 && dmg > 0) {
            const reduced = Math.floor(dmg * metaReduction);
            dmg -= reduced;
            if (reduced > 0) takenBreakdown.push(`강철의 의지 -${reduced}`);
          }
          // 매력 시그니처: 받는 데미지 감소 (매력 17+ 시 5단위마다 -5%)
          const charismaReducePct = getCharismaDmgReduction(newPlayer);
          if (charismaReducePct > 0 && dmg > 0) {
            const reduced = Math.floor(dmg * charismaReducePct / 100);
            dmg -= reduced;
            if (reduced > 0) takenBreakdown.push(`매력 -${reduced}`);
          }
          // 유물: dmgTaken % (음수면 감소, 양수면 증가)
          if (relicStat.dmgTaken && dmg > 0) {
            const change = Math.floor(dmg * relicStat.dmgTaken / 100);
            dmg += change;
            if (change < 0) takenBreakdown.push(`유물 -${-change}`);
            else if (change > 0) takenBreakdown.push(`유물 부작용 +${change}`);
          }
          // 유물: reflect % (받은 데미지의 일정 % 적에게 반사)
          if (relicStat.reflect > 0 && dmg > 0) {
            const reflectDmg = Math.floor(dmg * relicStat.reflect / 100);
            if (reflectDmg > 0) {
              newEnemy.currentHp = Math.max(0, newEnemy.currentHp - reflectDmg);
              newLog.push({ type: 'damage', text: `◆ [가시 갑옷] 반사 ${reflectDmg}` });
            }
          }
          // 저주: 받는 데미지 +15% / +30% (심연의 저주는 +15와 누적)
          if (hasCurse(curses, 'curse_dmgTaken+15') && dmg > 0) {
            const inc = Math.floor(dmg * 0.15);
            dmg += inc;
            takenBreakdown.push(`저주 +${inc}`);
          }
          if (hasCurse(curses, 'curse_dmgTaken+30') && dmg > 0) {
            const inc = Math.floor(dmg * 0.30);
            dmg += inc;
            takenBreakdown.push(`심연 +${inc}`);
          }
          if (dmg > 0) {
            // [체크] 이번 공격을 맞으면 죽는가?
            const isFatalDamage = newPlayer.hp - dmg <= 0;

            if (isFatalDamage) {
              // 1순위: [신의 가호] - 30% 확률로 생존
              if (hasEffect(skills, 'divineSave', activeSkills) && Math.random() < 0.3) {
                newLog.push({ type: 'passive', text: `◆ [신앙 Lv.5] 신의 가호!` });
                dmg = newPlayer.hp - 1; // 체력을 1로 만듦
              }
              // 2순위: [부활] - 전투당 1회 체력 50% 회복
              else if (hasEffect(skills, 'revive', activeSkills) && !newPlayer.revivedThisCombat) {
                newPlayer.hp = Math.floor(newPlayer.maxHp * 0.5);
                newPlayer.revivedThisCombat = true;
                newLog.push({ type: 'passive', text: `◆ [재생 Lv.7] 부활!` });
                dmg = 0; // 데미지 무효화
              }
            }


            // 최종 데미지 적용 (위의 조건들에서 dmg가 0이 되었다면 실행되지 않음)
            if (dmg > 0) {
              newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
              // 소울 게이지: 피격 시 더 빠르게 충전 (위기일수록 한 방을)
              if (classData.ultimateId) {
                let hitGain = Math.floor(dmg / 3);
                // 1.27.0~ 각인: 영혼 획득 ×(1 + soulGainMult)
                if (engravingFx.soulGainMult) hitGain = Math.floor(hitGain * (1 + engravingFx.soulGainMult));
                newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + hitGain);
              }
              newLog.push({
                type: 'damageTaken',
                text: `· ${dmg} 데미지`,
                breakdown: takenBreakdown.join(' / '),
              });
              setAnimDmg({ player: dmg, enemy: null });
              setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);
              // FX — 플레이어 피격: 부유 데미지 + 진동 + 흰 플래시 + 빨간 비네트 + 화면 흔들림(강타)
              pushFxLabel('player', 'damage', dmg);
              setFxPlayerShake(v => v + 1);
              setFxPlayerFlash(v => v + 1);
              setFxVignette(v => v + 1);
              // 강타(heavy)면 화면 흔들림
              if (intent.heavy) setFxScreenShake(v => v + 1);

              // 1.28.0~ 화염장막 (sage): 피격 시 50% 확률로 공격한 적에게 화염 각인 반사 (1회 소비)
              const flamePct = newPlayer.buffs?.flameBarrierPending || 0;
              if (flamePct > 0 && newEnemy.currentHp > 0) {
                newPlayer.buffs = { ...newPlayer.buffs, flameBarrierPending: 0 };
                if (Math.random() * 100 < flamePct) {
                  const refIgnite = Math.floor((newPlayer.지능 || 0) * 0.3);
                  if (refIgnite > 0) {
                    newEnemy.debuffs = {
                      ...newEnemy.debuffs,
                      igniteDmg: refIgnite,
                      igniteTurns: 3,
                      igniteEternal: false,
                      igniteJustApplied: true,
                    };
                    newLog.push({ type: 'passive', text: `🔥 [화염장막] 반사 — 화염 각인 ${refIgnite} 3T 부여` });
                    // 1.45.0~ 화염장막 반사 FX
                    setFxFlameReflect(v => v + 1);
                  }
                }
              }
            }
          }
        }
      }
      
      // === 적 의도가 frostbite (동상 부여)면 플레이어에 동상 디버프 적용 ===
      // 데미지 처리 후, 회피해도 디버프는 적용됨 (북부 원정 컨셉 — 한기 환경 효과)
      if (intent.frostbite && intent.frostbite > 0) {
        let frostDmg = intent.frostbite;
        // 한기의 결정 유물: 동상 데미지 -%
        const frostResist = relicStat.frostbiteResist || 0;
        if (frostResist > 0) {
          frostDmg = Math.max(1, Math.floor(frostDmg * (1 - frostResist / 100)));
        }
        // 갱신: 턴수 리셋, 데미지는 더 큰 값으로 (덮어쓰기)
        const prevDmg = newPlayer.debuffs?.frostbiteDmg || 0;
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          frostbiteDmg: Math.max(prevDmg, frostDmg),
          frostbiteTurns: 3,
        };
        const resistText = frostResist > 0 ? ` (저항 ${frostResist}%)` : '';
        newLog.push({ type: 'debuff', text: `❄️ [동상] ${frostDmg} 데미지 3T${resistText}` });
      }
      
      // === 적 의도가 seal (패시브 봉인)면 플레이어 패시브 임시 봉인 ===
      // 봉인된 신전 컨셉 — 회피 시 봉인 무효
      // 봉인의 인장 유물: sealResist% 만큼 봉인 확률 감소
      if (intent.seal && intent.seal > 0 && !dodged) {
        const sealResist = relicStat.sealResist || 0;
        // 저항 체크 — 50% 보유 시 50% 확률로 봉인 무효
        const sealAvoided = sealResist > 0 && Math.random() < (sealResist / 100);
        if (!sealAvoided) {
          const sealCount = intent.seal;
          // 보유 패시브 중 봉인 가능한 것 (시작 패시브, 이미 봉인된 것 제외)
          const ownedSkills = Object.entries(skills)
            .filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n])
            .map(([n]) => n);
          const alreadySealed = newPlayer.debuffs?.sealedSkills || [];
          const sealable = ownedSkills.filter(s => !alreadySealed.includes(s));
          // 랜덤 N개 선택
          const shuffled = [...sealable].sort(() => Math.random() - 0.5);
          const newSealed = shuffled.slice(0, sealCount);
          if (newSealed.length > 0) {
            newPlayer.debuffs = {
              ...newPlayer.debuffs,
              sealedSkills: [...alreadySealed, ...newSealed],
              sealedTurns: 2,  // 2턴 봉인 (이번 턴 + 다음 턴)
            };
            newLog.push({ type: 'debuff', text: `🔒 [봉인] ${newSealed.join(', ')} 2T` });
          }
        } else {
          newLog.push({ type: 'debuff', text: `🔒 [봉인] 저항됨 (${sealResist}%)` });
        }
      }
      
      // === 적 의도가 shock (충격 부여)면 플레이어 충격 게이지 누적 ===
      // 마계의 균열 컨셉 — 100 도달 시 1턴 기절. 회피 시 충격 무효
      // 균열의 핵 유물: shockResist% 만큼 충격 누적량 감소
      if (intent.shock && intent.shock > 0 && !dodged) {
        let shockAmt = intent.shock;
        const shockResist = relicStat.shockResist || 0;
        if (shockResist > 0) {
          shockAmt = Math.max(1, Math.floor(shockAmt * (1 - shockResist / 100)));
        }
        const prevShock = newPlayer.debuffs?.shockGauge || 0;
        const newShock = prevShock + shockAmt;
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          shockGauge: newShock,
        };
        const resistText = shockResist > 0 ? ` (저항 ${shockResist}%)` : '';
        newLog.push({ type: 'debuff', text: `⚡ [충격] +${shockAmt} (총 ${newShock}/100)${resistText}` });
        // 100 도달 시 다음 턴 기절
        if (newShock >= 100) {
          newPlayer.debuffs = {
            ...newPlayer.debuffs,
            shockGauge: 0,
            stunnedTurns: 1,  // 다음 1턴 기절
          };
          newLog.push({ type: 'debuff', text: `💫 [기절] 충격 100 도달 — 다음 턴 행동 불가` });
        }
      }
      
      // ============ 심안류 반격 시스템 ============
      // 회피와 독립 — 회피 성공/실패와 무관하게 반격 확률 체크
      // 적의 attack 1턴 = 1회 반격 판정
      const simanLv = skills['심안류'] || 0;
      const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
      const hasShock = hasUltimate(ultimates, 'ult_counterShock');
      const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
      const hasAnyCounterUlt = hasMirror || hasShock || hasShadow;
      // 방랑검사 궁극 [무영의 일격] 발동 후 3턴간 반격 100% 버프
      const shadowStrikeBuff = (newPlayer.buffs?.shadowCounterTurns || 0) > 0;

      // 1.27.0~ 각인: counterRatePct가 양수면 심안류 없어도 반격 가능
      const hasEngravingCounter = (engravingFx.counterRatePct || 0) > 0;
      if (simanLv > 0 || hasAnyCounterUlt || shadowStrikeBuff || hasEngravingCounter) {
        // 반격 확률 계산 — minor: 5%/Lv, Lv.3: +20%, 궁극: +60%, 무영의 잔영: 100%
        let counterRate = simanLv * 5;
        if (simanLv >= 3) counterRate += 20;
        if (hasAnyCounterUlt) counterRate += 60;
        if (shadowStrikeBuff) counterRate = 100;
        // 1.27.0~ 각인: 반격율 +/- N% (음수 결함은 감소)
        if (engravingFx.counterRatePct) counterRate += engravingFx.counterRatePct;
        if (counterRate > 100) counterRate = 100;
        if (counterRate < 0) counterRate = 0;
        
        // 회피했고 명경지수면: 같은 턴 반격에 즉시 +100% 적용 (Pending에 직접 설정)
        if (dodged && hasMirror) {
          newPlayer.buffs = { ...newPlayer.buffs, mirrorCounterDmgPending: true };
          newLog.push({ type: 'passive', text: `★ [명경지수] 회피! 다음 반격 데미지 +100%` });
        }

        // 반격 판정 — 사전에 굴려진 결과가 있으면 사용 (Lv.5 차단 효과와 일치)
        const rolledValue = newPlayer._pendingCounterRoll !== undefined ? newPlayer._pendingCounterRoll : Math.random() * 100;
        delete newPlayer._pendingCounterRoll;
        if (rolledValue < counterRate) {
          // 반격 데미지 산출식 빌드 — 일반 공격 로그와 동일 패턴
          const baseCounterDmg = Math.floor(newPlayer.근력 * 1.5);
          let counterDmg = baseCounterDmg;
          const counterBreakdown = [`기본 ${baseCounterDmg}`];

          // minor: 반격 데미지 +5%/Lv
          if (simanLv > 0) {
            const mult = 1 + simanLv * 0.05;
            counterDmg = Math.floor(counterDmg * mult);
            counterBreakdown.push(`심안류 ×${mult.toFixed(2)}`);
          }
          // Lv.5: 반격 데미지 +20%
          if (simanLv >= 5) {
            counterDmg = Math.floor(counterDmg * 1.20);
            counterBreakdown.push(`Lv.5 ×1.20`);
          }
          // Lv.7: 반격 데미지 +20%
          if (simanLv >= 7) {
            counterDmg = Math.floor(counterDmg * 1.20);
            counterBreakdown.push(`Lv.7 ×1.20`);
          }
          // 궁극별 반격 데미지 보너스
          if (hasMirror) {
            counterDmg = Math.floor(counterDmg * 2.0);
            counterBreakdown.push(`명경지수 ×2.0`);
          }
          if (hasShock) {
            counterDmg = Math.floor(counterDmg * 2.5);
            counterBreakdown.push(`검로일여 ×2.5`);
          }
          if (hasShadow) {
            counterDmg = Math.floor(counterDmg * 2.0);
            counterBreakdown.push(`무영검 ×2.0`);
          }
          // 명경지수: 회피→반격 데미지 +100% 버프 소비 (같은 턴 회피로 설정된 Pending도 즉시 소비)
          if (newPlayer.buffs?.mirrorCounterDmgPending) {
            counterDmg = Math.floor(counterDmg * 2.0);
            counterBreakdown.push(`회피→반격 ×2.0`);
            newPlayer.buffs = { ...newPlayer.buffs, mirrorCounterDmgPending: false };
            newLog.push({ type: 'passive', text: `★ [명경지수] 회피→반격 데미지 +100% 적용!` });
          }
          // 무영검: 누적된 미스 보너스 적용
          if (hasShadow && newPlayer.buffs?.shadowCounterStack > 0) {
            const stack = newPlayer.buffs.shadowCounterStack;
            const mult = 1 + stack * 0.5;
            counterDmg = Math.floor(counterDmg * mult);
            counterBreakdown.push(`누적 ×${mult.toFixed(1)}`);
            newLog.push({ type: 'passive', text: `★ [무영검] 누적 ×${stack} 데미지 폭발!` });
            newPlayer.buffs = { ...newPlayer.buffs, shadowCounterStack: 0 };
          }
          // 1.27.0~ 각인: 반격 데미지 +/- N% (counterDmgPct, 결함은 음수)
          if (engravingFx.counterDmgPct) {
            const change = Math.floor(counterDmg * engravingFx.counterDmgPct / 100);
            counterDmg += change;
            if (change !== 0) counterBreakdown.push(`각인 ${change >= 0 ? '+' : ''}${change}`);
          }
          // 1.27.0~ 각인: 반격에 치명 적용 (counterCanCrit — 천변의 검)
          if (engravingFx.counterCanCrit) {
            const counterCrit = rollCrit(skills, newPlayer, meta, activeSkills, relicStat, ultimates, engravingFx);
            if (counterCrit) {
              counterDmg = Math.floor(counterDmg * 1.5);
              counterBreakdown.push(`★치명 ×1.5`);
            }
          }

          // 적 방어 적용
          let actualDmg = counterDmg;
          if (newEnemy.defense > 0) {
            const absorbed = Math.min(newEnemy.defense, actualDmg);
            newEnemy.defense -= absorbed;
            actualDmg -= absorbed;
            if (absorbed > 0) counterBreakdown.push(`적 방어 -${absorbed}`);
          }
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg);
          const counterLabel = shadowStrikeBuff && simanLv === 0 && !hasAnyCounterUlt ? '무영의 잔영' : '심안류';
          newLog.push({ type: 'damage', text: `◆ [${counterLabel}] 반격! ${actualDmg} 데미지`, breakdown: counterBreakdown.join(' / ') });
          if (actualDmg > 0) {
            pushFxLabel('enemy', 'damage', actualDmg);
            setFxEnemyShake(v => v + 1);
            setFxEnemyFlash(v => v + 1);
            // 1.27.0~ 각인: 반격 명중 시 소울 게이지 +N (영혼의 반향)
            if (classData.ultimateId && engravingFx.counterHitSoul) {
              newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + engravingFx.counterHitSoul);
            }
            // 1.27.0~ 각인: 반격 명중 시 적 충격 게이지 +N (충격파)
            if (engravingFx.counterShock) {
              const resistActive = (newEnemy.debuffs?.shockResist || 0) > 0;
              const shockAdd = resistActive
                ? Math.floor(engravingFx.counterShock * GAME_CONFIG.shockResistReduction)
                : engravingFx.counterShock;
              const cur = newEnemy.debuffs?.shockGauge || 0;
              const nextGauge = cur + shockAdd;
              if (nextGauge >= 100) {
                newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: 0, stunnedTurns: 1 };
                newLog.push({ type: 'debuff', text: `💫 [충격파] 충격 100 — 다음 턴 기절` });
              } else {
                newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: nextGauge };
                newLog.push({ type: 'debuff', text: `⚡ [충격파] 적 충격 +${shockAdd} (${nextGauge}/100)` });
              }
            }
          }

          // Lv.7: 반격 발생 시 다음 턴 반드시 치명타
          if (simanLv >= 7) {
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCritNext: true };
            newLog.push({ type: 'passive', text: `◆ [심안류 Lv.7] 다음 턴 반드시 치명타!` });
          }
          
          // 명경지수: 반격 후 다음 턴 회피율 +30%
          if (hasMirror) {
            newPlayer.buffs = { ...newPlayer.buffs, mirrorDodgeNext: 30 };
            newLog.push({ type: 'passive', text: `★ [명경지수] 다음 턴 회피율 +30%` });
          }
          
          // 검로일여: 반격 시 충격 게이지 +50 (일반 강타와 동일하게 적 shockResist 적용)
          if (hasShock) {
            let gaugeAdd = 50;
            const resistActive = (newEnemy.debuffs?.shockResist || 0) > 0;
            if (resistActive) {
              gaugeAdd = Math.floor(gaugeAdd * GAME_CONFIG.shockResistReduction);
            }
            const currentGauge = newEnemy.debuffs?.shockGauge || 0;
            const newGauge = currentGauge + gaugeAdd;
            if (newGauge >= 100) {
              newEnemy.debuffs = {
                ...newEnemy.debuffs,
                stunned: 1, shockGauge: 0, everStunned: true,
                // 강타와 동일하게 기절 후 충격 저항 부여
                shockResist: GAME_CONFIG.shockResistTurns,
                shockResistTurns: GAME_CONFIG.shockResistTurns,
              };
              newLog.push({ type: 'debuff', text: `★ [검로일여] 충격 100! 기절! (${GAME_CONFIG.shockResistTurns}턴 저항)` });
            } else {
              newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: newGauge };
              const resistText = resistActive ? ` (저항 차감)` : '';
              newLog.push({ type: 'debuff', text: `★ [검로일여] 충격 +${gaugeAdd}${resistText} (${newGauge}/100)` });
            }
          }
          
          // 무영검: 반격 시 다음 턴 치명타 확정 (Lv.7 효과와 중복되지만 궁극 단독으로도 발동)
          if (hasShadow) {
            newPlayer.buffs = { ...newPlayer.buffs, guaranteedCritNext: true };
            newLog.push({ type: 'passive', text: `★ [무영검] 다음 턴 치명타 확정!` });
          }
          
        } else {
          // 반격 실패 — 무영검: 누적 +50%
          if (hasShadow) {
            const stack = (newPlayer.buffs?.shadowCounterStack || 0) + 1;
            newPlayer.buffs = { ...newPlayer.buffs, shadowCounterStack: stack };
            newLog.push({ type: 'passive', text: `★ [무영검] 반격 실패. 누적 ×${stack} (다음 발동 시 폭발)` });
          }
        }
      }
    } else if (intent.type === 'defend') {
      // 방어는 이미 endTurn에서 적용됨 — 적 턴엔 추가 처리 없음 (중복 방지)
    }

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog);
    
    // 반격으로 적 사망 처리
    if (newEnemy.currentHp <= 0) {
      // 흡혈 (유물)
      if (relicStat.lifesteal > 0) {
        const heal = relicStat.lifesteal;
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        newLog.push({ type: 'passive', text: `◆ [유물] 흡혈 +${heal}` });
        setPlayer(newPlayer);
      }
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'victory', text: `━━ ${enemy.name} 처치 (반격) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
      }, 800);
      return;
    }
    
    if (newPlayer.hp <= 0) {
      setTimeout(() => { 
        setLog(prev => [...prev, { type: 'defeat', text: `━━ 패배 ━━` }]); 
        setPhase('defeat'); 
        actionLockRef.current = false;  // 전투 종료 - 락 해제
      }, 800);
      return;
    }
    setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 400);
  };

  const endTurn = (curPlayer, curEnemy, curLog) => {
    const newLog = [...curLog];
    let newPlayer = { ...curPlayer };
    let newEnemy = { ...curEnemy };
    const newTurn = turn + 1;

    // 새 턴 시작: 단독 버프 스킬 사용 플래그 리셋
    newPlayer.usedBuffThisTurn = false;

    // 소울 게이지 자연 충전 (매 턴 +5)
    if (classData.ultimateId) {
      let turnGain = 5;
      // 1.27.0~ 각인: 영혼 획득 ×(1 + soulGainMult)
      if (engravingFx.soulGainMult) turnGain = Math.floor(turnGain * (1 + engravingFx.soulGainMult));
      newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + turnGain);
    }
    // 1.27.0~ 각인: 매 턴 시작 시 영혼 +N (직업 소울 스킬 보유 직업만, 소울 게이지 자체)
    if (classData.ultimateId && engravingFx.perTurnSoul) {
      newPlayer.soulGauge = Math.min(100, (newPlayer.soulGauge || 0) + engravingFx.perTurnSoul);
    }
    // 1.27.0~ 각인: 매 턴 시작 시 HP -N (영혼 폭주 저주 페널티)
    if (engravingFx.perTurnHpLoss) {
      const loss = Math.min(newPlayer.hp - 1, engravingFx.perTurnHpLoss);  // 죽지 않도록 1 HP 보장
      if (loss > 0) {
        newPlayer.hp = Math.max(1, newPlayer.hp - loss);
      }
    }

    if (newEnemy.debuffs?.bleed > 0 && newEnemy.debuffs?.bleedTurns > 0) {
      // 잔혹 minor: 출혈 1스택당 데미지 +1/Lv
      const bleedBonus = getMinorBonus(skills, 'bleedDmg+', activeSkills);
      const bleedDmg = newEnemy.debuffs.bleed * (GAME_CONFIG.bleedDmgPerStack + bleedBonus);
      newEnemy.currentHp = Math.max(0, newEnemy.currentHp - bleedDmg);
      newEnemy.debuffs = {
        ...newEnemy.debuffs,
        bleedTurns: newEnemy.debuffs.bleedTurns - 1,
        bleed: newEnemy.debuffs.bleedTurns - 1 <= 0 ? 0 : newEnemy.debuffs.bleed,
      };
      newLog.push({ type: 'debuff', text: `◆ 출혈 ${bleedDmg} 데미지` });
      if (newEnemy.currentHp <= 0) {
        setEnemy(newEnemy);
        setLog([...newLog, { type: 'victory', text: `━━ ${enemy.name} 처치 (출혈 사망) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;  // 전투 종료 - 락 해제
        return;
      }
    }
    
    // 충격 저항 디버프 턴 감소
    if (newEnemy.debuffs?.shockResistTurns > 0) {
      newEnemy.debuffs = {
        ...newEnemy.debuffs,
        shockResistTurns: newEnemy.debuffs.shockResistTurns - 1,
        shockResist: newEnemy.debuffs.shockResistTurns - 1 <= 0 ? 0 : newEnemy.debuffs.shockResist,
      };
    }
    
    // === 이프리트 화염 각인 도트 처리 ===
    if (newEnemy.debuffs?.igniteDmg > 0 && newEnemy.debuffs?.igniteTurns > 0) {
      const igniteDmg = newEnemy.debuffs.igniteDmg;
      // 화염 각인은 항상 방어 무시
      newEnemy.currentHp = Math.max(0, newEnemy.currentHp - igniteDmg);
      
      // 영겁이 아니면 턴 감소
      const isEternal = newEnemy.debuffs.igniteEternal;
      if (!isEternal) {
        const newTurns = newEnemy.debuffs.igniteTurns - 1;
        newEnemy.debuffs = {
          ...newEnemy.debuffs,
          igniteTurns: newTurns,
          igniteDmg: newTurns <= 0 ? 0 : newEnemy.debuffs.igniteDmg,
        };
      }
      newLog.push({ type: 'debuff', text: `🔥 화염 각인 ${igniteDmg} 데미지` });
      if (newEnemy.currentHp <= 0) {
        setEnemy(newEnemy);
        setPlayer(newPlayer);
        setLog([...newLog, { type: 'victory', text: `━━ ${enemy.name} 처치 (화염 각인) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
        return;
      }
    }

    // === 1.29.0~ 겁화 도트 처리 (화염 각인과 별도) ===
    // 1.42.0~ 영구 플래그(eternalFireEternal) 시 턴 감소 X — 무한 도트.
    if (newEnemy.debuffs?.eternalFireDmg > 0 && newEnemy.debuffs?.eternalFireTurns > 0) {
      const eternalDmg = newEnemy.debuffs.eternalFireDmg;
      // 겁화도 방어 무시
      newEnemy.currentHp = Math.max(0, newEnemy.currentHp - eternalDmg);

      const isEternal = newEnemy.debuffs.eternalFireEternal;
      if (!isEternal) {
        const newTurns = newEnemy.debuffs.eternalFireTurns - 1;
        newEnemy.debuffs = {
          ...newEnemy.debuffs,
          eternalFireTurns: newTurns,
          eternalFireDmg: newTurns <= 0 ? 0 : newEnemy.debuffs.eternalFireDmg,
        };
      }
      newLog.push({ type: 'debuff', text: `🌋 겁화 ${eternalDmg} 데미지` });
      if (newEnemy.currentHp <= 0) {
        setEnemy(newEnemy);
        setPlayer(newPlayer);
        setLog([...newLog, { type: 'victory', text: `━━ ${enemy.name} 처치 (겁화) ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;
        return;
      }
    }


    // === 챔피언십 — 플레이어 동상 도트 처리 (북부) ===
    if (newPlayer.debuffs?.frostbiteDmg > 0 && newPlayer.debuffs?.frostbiteTurns > 0) {
      const frostDmg = newPlayer.debuffs.frostbiteDmg;
      newPlayer.hp = Math.max(0, newPlayer.hp - frostDmg);
      const newTurns = newPlayer.debuffs.frostbiteTurns - 1;
      newPlayer.debuffs = {
        ...newPlayer.debuffs,
        frostbiteTurns: newTurns,
        frostbiteDmg: newTurns <= 0 ? 0 : newPlayer.debuffs.frostbiteDmg,
      };
      newLog.push({ type: 'debuff', text: `❄️ 동상 ${frostDmg} 데미지` });
      if (newPlayer.hp <= 0) {
        setEnemy(newEnemy);
        setPlayer(newPlayer);
        setLog([...newLog, { type: 'defeat', text: `━━ 동상에 의해 사망 ━━` }]);
        setPhase('defeat');
        actionLockRef.current = false;
        return;
      }
    }
    
    // === 챔피언십 — 플레이어 봉인 턴 감소 (신전) ===
    if (newPlayer.debuffs?.sealedTurns > 0) {
      const newTurns = newPlayer.debuffs.sealedTurns - 1;
      if (newTurns <= 0) {
        // 봉인 해제
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          sealedTurns: 0,
          sealedSkills: [],
        };
        newLog.push({ type: 'debuff', text: `🔓 봉인 해제` });
      } else {
        newPlayer.debuffs = {
          ...newPlayer.debuffs,
          sealedTurns: newTurns,
        };
      }
    }
    
    // === 챔피언십 — 적 자가 회복 (회랑) ===
    // 여명의 성배 유물: antiHeal% 만큼 적 회복량 감소
    if (newEnemy.regen > 0 && newEnemy.currentHp > 0 && newEnemy.currentHp < newEnemy.hp) {
      let regenAmount = newEnemy.regen;
      const antiHeal = relicStat.antiHeal || 0;
      if (antiHeal > 0) {
        regenAmount = Math.max(1, Math.floor(regenAmount * (1 - antiHeal / 100)));
      }
      newEnemy.currentHp = Math.min(newEnemy.hp, newEnemy.currentHp + regenAmount);
      const antiText = antiHeal > 0 ? ` (저항 ${antiHeal}%)` : '';
      newLog.push({ type: 'enemy_action', text: `✨ ${enemy.name} 회복 +${regenAmount}${antiText}` });
    }
    
    // === 챔피언십 — 적 광폭 누적 (숲) ===
    // berserkPerTurn: 매 턴 적 데미지 +N (누적)
    // 광기의 송곳니 유물: berserkResist% 만큼 누적량 감소
    if (newEnemy.berserkPerTurn > 0) {
      let stackAmt = newEnemy.berserkPerTurn;
      const berserkResist = relicStat.berserkResist || 0;
      if (berserkResist > 0) {
        stackAmt = Math.max(1, Math.floor(stackAmt * (1 - berserkResist / 100)));
      }
      newEnemy.berserkStacks = (newEnemy.berserkStacks || 0) + stackAmt;
      const resistText = berserkResist > 0 ? ` (저항 ${berserkResist}%)` : '';
      newLog.push({ type: 'enemy_action', text: `🩸 ${enemy.name} 광폭 +${stackAmt} (총 +${newEnemy.berserkStacks} 데미지)${resistText}` });
    }

    Object.keys(newPlayer.cooldowns).forEach(k => {
      if (newPlayer.cooldowns[k] > 0) newPlayer.cooldowns[k]--;
    });
    // 황혼의 모래시계: 매 턴 20% 확률로 모든 스킬 쿨다운 -1 (이미 -1된 거 추가)
    const hourglassChance = (relicStat.cdReduceChance || 0);
    if (hourglassChance > 0 && Math.random() * 100 < hourglassChance) {
      let reduced = false;
      Object.keys(newPlayer.cooldowns).forEach(k => {
        if (newPlayer.cooldowns[k] > 0) {
          newPlayer.cooldowns[k]--;
          reduced = true;
        }
      });
      if (reduced) newLog.push({ type: 'passive', text: `◇ [황혼의 모래시계] 쿨다운 -1` });
    }
    if (newPlayer.buffs?.rage > 0) {
      newPlayer.buffs.rage--;
      if (newPlayer.buffs.rage === 0) newLog.push({ type: 'system', text: `· 분노 종료` });
    }
    if (newPlayer.buffs?.dodgeBuffTurns > 0) {
      newPlayer.buffs.dodgeBuffTurns--;
      if (newPlayer.buffs.dodgeBuffTurns === 0) newPlayer.buffs.dodgeBuff = 0;
    }
    // 심안류 궁극 1턴 버프 정리
    if (newPlayer.buffs?.mirrorDodgeNext > 0) {
      newPlayer.buffs = { ...newPlayer.buffs, mirrorDodgeNext: 0 };
    }
    // 방랑검사 [무영의 잔영] 반격 100% 버프 — 매 턴 -1
    if (newPlayer.buffs?.shadowCounterTurns > 0) {
      const remaining = newPlayer.buffs.shadowCounterTurns - 1;
      newPlayer.buffs = { ...newPlayer.buffs, shadowCounterTurns: remaining };
      if (remaining === 0) {
        newLog.push({ type: 'system', text: `· 무영의 잔영 종료` });
      }
    }
    // 1.28.0~ 영겁의 화염 후속 버프 (sage): 마법 데미지 +N% 1턴 차감
    if (newPlayer.buffs?.flameBoostTurns > 0) {
      const remaining = newPlayer.buffs.flameBoostTurns - 1;
      newPlayer.buffs = { ...newPlayer.buffs, flameBoostTurns: remaining };
      if (remaining === 0) {
        newPlayer.buffs.flameBoostPct = 0;
        newLog.push({ type: 'system', text: `· 영겁의 정념 종료` });
      }
    }
    // 화신강림 1턴 치명 버프 정리
    if (newPlayer.buffs?.ifritCritNext) {
      newPlayer.buffs = { ...newPlayer.buffs };
      delete newPlayer.buffs.ifritCritNext;
    }
    // 화염 각인 "이번 턴 부여" 플래그 정리 (다음 턴부터는 +20% 적용 가능)
    if (newEnemy.debuffs?.igniteJustApplied) {
      newEnemy.debuffs = { ...newEnemy.debuffs, igniteJustApplied: false };
    }
    // 1.29.0~ 겁화 "이번 턴 부여" 플래그 정리 (연옥지화 보너스용)
    if (newEnemy.debuffs?.eternalFireJustApplied) {
      newEnemy.debuffs = { ...newEnemy.debuffs, eternalFireJustApplied: false };
    }
    // 방어 리셋 — 내 방어 스킬은 사용한 턴만 유지, 다음 턴 시작 시 0으로
    if (newPlayer.defense > 0) {
      newPlayer.defense = 0;
    }
    newPlayer.ether = Math.min(newPlayer.maxEther, newPlayer.ether + 1);

    let extraTurnTriggered = false;
    let bestExtraTurnInterval = Infinity;
    let guaranteedCrit = false;
    getActivePassives(skills, 'onTurnStart', activeSkills).forEach(p => {
      if (p.effect === 'regenPerTurn') {
        const regen = 3;
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + regen);
        newLog.push({ type: 'passive', text: `◆ [재생 Lv.3] HP +${regen}` });
      }
      if (p.effect === 'extraTurn' && p.interval && newTurn % p.interval === 0) {
        if (p.interval < bestExtraTurnInterval) {
          bestExtraTurnInterval = p.interval;
          extraTurnTriggered = true;
        }
      }
      if (p.effect === 'guaranteeCrit' && p.interval && newTurn % p.interval === 0) {
        guaranteedCrit = true;
        newPlayer.buffs = { ...newPlayer.buffs, guaranteedCrit: 1 };
        newLog.push({ type: 'passive', text: `◆ [신앙 Lv.3] 다음 공격 치명타 확정!` });
      }
    });


    const patterns = newEnemy.patterns;
    newEnemy.nextIntent = patterns[Math.floor(Math.random() * patterns.length)];
    // 방어 리셋 — 내 방어와 적 방어 모두 그 턴만 유지 (다음 턴 시작 시 0으로)
    // 내 defense는 위에서 이미 0으로 리셋됨
    newEnemy.defense = 0;
    // 적 의도가 defend면 즉시 방어 적용 (내 공격 받기 전에 막음)
    if (newEnemy.nextIntent?.type === 'defend' && newEnemy.nextIntent.defense) {
      newEnemy.defense = newEnemy.nextIntent.defense;
      // 심안 등급별로 메시지 노출 (심안 없으면 알 수 없음)
      const simanLvForLog = getSkillLevel(skills, '심안');
      if (simanLvForLog >= 7) {
        newLog.push({ type: 'system', text: `· ${newEnemy.name}이(가) ${newEnemy.nextIntent.name} 자세 (+${newEnemy.nextIntent.defense})` });
      } else if (simanLvForLog >= 5) {
        newLog.push({ type: 'system', text: `· ${newEnemy.name}이(가) ${newEnemy.nextIntent.name} 자세를 취했다` });
      } else if (simanLvForLog >= 3) {
        newLog.push({ type: 'system', text: `· ${newEnemy.name}이(가) 방어 자세를 취한 것 같다` });
      }
      // Lv.0~2: 로그 표시 안 함
    }

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog); setTurn(newTurn);

    // === 챔피언십 균열: 플레이어 기절 시 다음 턴 스킵 ===
    if (newPlayer.debuffs?.stunnedTurns > 0) {
      // 기절 턴 감소
      const skipPlayer = {
        ...newPlayer,
        debuffs: {
          ...newPlayer.debuffs,
          stunnedTurns: Math.max(0, (newPlayer.debuffs?.stunnedTurns || 0) - 1),
        }
      };
      const skipLog = [...newLog, { type: 'debuff', text: `💫 기절 — 행동 불가 (턴 스킵)` }];
      
      setPlayer(skipPlayer);
      setLog(skipLog);
      setPhase('enemyTurn');
      
      // 다음 적 턴 실행 — 적이 의도 결정 후 행동
      setTimeout(() => {
        // 새 의도 결정 (적이 다시 행동하므로)
        const newIntent = newEnemy.patterns[Math.floor(Math.random() * newEnemy.patterns.length)];
        const enemyWithIntent = { ...newEnemy, nextIntent: newIntent };
        setEnemy(enemyWithIntent);
        // 적 턴 실행
        setTimeout(() => {
          executeEnemyTurn(skipPlayer, enemyWithIntent, skipLog);
        }, 350);
      }, 500);
      return;
    }

    if (extraTurnTriggered) {
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'passive', text: `◆ [가속] 추가 턴!` }]);
        setPhase('playerTurn');
        actionLockRef.current = false;
      }, 350);
    } else {
      setTimeout(() => {
        setPhase('playerTurn');
        actionLockRef.current = false;
      }, 250);
    }
  };

  // 부유 라벨을 적/플레이어 컨테이너용으로 분리
  const fxEnemyLabels = fxLabels.filter(l => l.side === 'enemy');
  const fxPlayerLabels = fxLabels.filter(l => l.side === 'player');

  return (
    <div
      key={`shake-${fxScreenShake}`}
      className={`absolute inset-0 flex flex-col ${fxScreenShake ? 'fx-shake' : ''}`}
      style={{ background: PALETTE.bgDeep }}
    >
      {/* 화면 가장자리 빨간 비네트 — 플레이어 피격 시 짧게 */}
      <DamageVignette trigger={fxVignette} />
      {/* 소울 스킬 컷인 — 전체 화면을 덮는 0.9초 골든 버스트 */}
      <UltimateCutin info={fxUltimateCutin} />
      {/* 1.45.0 영겁의 화염 풀스크린 화염 컷인 (UltimateCutin 위에 겹쳐 표시) */}
      <EternalFlameCutin trigger={fxEternalFlame} />
      {/* 1.45.2 크리티컬 풀스크린 화면효과 — 노란 비네트 (익스플로젼·각인 폭발과 차별화) */}
      <CritScreenFx trigger={fxCritScreen} />
      {/* 전투 로그 확장 모달 — 풀스크린, 큰 텍스트로 전체 로그 확인 */}
      {logExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: PALETTE.bgDeep }}>
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
            <span className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>━━ 전투 로그 · TURN {turn} ━━</span>
            <button
              onClick={() => setLogExpanded(false)}
              className="p-1.5 rounded"
              style={{ border: `1px solid ${PALETTE.panelBorder}` }}
              aria-label="닫기"
            >
              <X size={16} style={{ color: PALETTE.text }} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)` }}>
            {log.map((l, i) => {
              if (l.type === 'turnDivider') {
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <div className="flex-1 h-px" style={{ background: PALETTE.dawn, opacity: 0.4 }} />
                    <span className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>턴 {l.turn}</span>
                    <div className="flex-1 h-px" style={{ background: PALETTE.dawn, opacity: 0.4 }} />
                  </div>
                );
              }
              return (
                <div key={i}>
                  <div className="text-[13px] leading-relaxed" style={{ color: l.type === 'damage' ? PALETTE.accent : l.type === 'damageTaken' ? PALETTE.bleed : l.type === 'crit' ? PALETTE.legendary : l.type === 'passive' ? PALETTE.dawn : l.type === 'debuff' ? PALETTE.shock : l.type === 'heal' ? PALETTE.green : l.type === 'enemy_action' ? PALETTE.accent : l.type === 'victory' ? PALETTE.legendary : l.type === 'defeat' ? PALETTE.accent : PALETTE.text, opacity: l.type === 'system' ? 0.7 : 1 }}>{l.text}</div>
                  {l.breakdown && (<div className="text-[11px] leading-relaxed pl-3" style={{ color: PALETTE.textDim, opacity: 0.7 }}>({l.breakdown})</div>)}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t shrink-0 flex justify-center" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
            <button
              onClick={() => setLogExpanded(false)}
              className="px-6 py-2 text-[11px] tracking-[0.3em] rounded"
              style={{ border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.text }}
            >
              전투 복귀
            </button>
          </div>
        </div>
      )}
      {/* 최상단 턴 정보 (높이 고정) */}
      <div className="px-4 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.accent }}>━━ 전투 ━━</span>
        <span className="text-[10px] tabular-nums" style={{ color: PALETTE.dawn }}>TURN {turn}</span>
      </div>

      {/* 메인 컨테이너: 3분할 + 스킬 버튼 세로 배치 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* === 1/3: 적 영역 (일러스트 + 정보 BAR 오버레이) === */}
        {/* 외부 컨테이너는 안정적으로 mount 유지 — 자식 FX 컴포넌트가 적 공격 매번 재-마운트되어
            애니메이션 잘못 재발되는 문제 방지. shake는 inner wrapper로 격리 */}
        <div
          className="flex-1 min-h-0 relative overflow-hidden border-b"
          style={{ borderColor: PALETTE.panelBorder }}
        >
          {/* shake 적용용 inner wrapper — 일러만 흔들림, FX 자식들은 외부 */}
          <div
            key={`enemy-shake-${fxEnemyShake}`}
            className={`absolute inset-0 ${fxEnemyShake ? 'fx-hit-shake' : ''}`}
          >
          {/* 적 전투 일러스트 — getEnemyImageSrc()가 chapter 값으로 classic/championship 자동 분기
              일러 없으면 어두운 배경 + 사선 패턴 placeholder로 폴백 */}
          {enemyImgFailed || !enemy.chapter ? (
            <div className="absolute inset-0 bg-[#0a0608] flex items-center justify-center">
              <div className="absolute inset-0 opacity-20" style={{ background: `repeating-linear-gradient(45deg, transparent 0px, transparent 8px, ${enemy.color}15 8px, ${enemy.color}15 9px)` }} />
              <div className="text-[12px] tracking-[0.3em] relative grayscale" style={{ color: PALETTE.textDim }}>[ 적 모습 미구현 ]</div>
            </div>
          ) : (
            <img
              src={getEnemyImageSrc(enemyKey, enemy, 'combat')}
              alt={enemy.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center center' }}
              onError={() => setEnemyImgFailed(true)}
            />
          )}
          </div>
          {/* FX 오버레이 — 흰 플래시 + 부유 라벨 + Phase 2 임팩트 (shake 영향 X, trigger 변화 시에만 재생) */}
          <WhiteFlash trigger={fxEnemyFlash} />
          <StatusOverlay debuffs={enemy.debuffs} />
          {/* 1.45.0 화염 각인 글로우 — debuffs.igniteDmg > 0 지속 표시 */}
          <IgniteGlowAura active={enemy.debuffs?.igniteDmg > 0 && enemy.debuffs?.igniteTurns > 0} />
          <SlashFx trigger={fxSlash} crit={fxSlashCrit} />
          <ThrustFx trigger={fxThrust} crit={fxThrustCrit} />
          <ShadowStrikeFx trigger={fxShadowStrike} />
          <MagicImpactFx trigger={fxMagicImpact} color={classData.color || '#a479d4'} />
          <MagicParticles trigger={fxMagicParticles} color={classData.color || '#c8a8e8'} />
          {/* 1.45.0 술법사 화염 이펙트 — 파이어볼/익스플로젼/각인 폭발 */}
          <FireballFx trigger={fxFireball} />
          <ExplosionFx trigger={fxExplosion} />
          <IgniteExplodeFx trigger={fxIgniteExplode} />
          {fxEnemyLabels.map(l => (
            <FloatingLabel key={l.id} kind={l.kind} value={l.value} label={l.label} />
          ))}
          {/* 정보 BAR 오버레이 (하단 + 그라디언트) */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)`, pointerEvents: 'none' }} />
            <div className="relative px-3 py-2">
              {/* 1줄: 이름 + HP */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold drop-shadow-md" style={{ color: enemy.color }}>{enemy.name}</span>
                <span className="text-[11px] tabular-nums drop-shadow-md" style={{ color: PALETTE.text }}>{animDmg.enemy && <span className="mr-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.enemy}</span>}{enemy.currentHp}/{enemy.hp}</span>
              </div>
              <div className="h-1.5 relative mb-1.5" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="absolute inset-y-0 left-0" style={{ width: `${(enemy.currentHp/enemy.hp)*100}%`, background: `linear-gradient(90deg, ${PALETTE.blood}, ${enemy.color})`, transition: 'width 0.45s cubic-bezier(.4,0,.2,1)' }} /></div>
              {/* 2줄: 디버프 카드 (고정 높이) */}
              <div className="flex items-center gap-1.5 flex-wrap min-h-[18px] mb-1">
                {enemy.defense > 0 && getSkillLevel(skills, '심안') >= 7 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}40`, color: PALETTE.defense, border: `1px solid ${PALETTE.defense}80` }}>◈ 방어 {enemy.defense}</span>)}
                {enemy.debuffs?.bleed > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.bleed}40`, color: PALETTE.bleed, border: `1px solid ${PALETTE.bleed}80` }}>◆ 출혈 {enemy.debuffs.bleed} ({enemy.debuffs.bleedTurns}T)</span>)}
                {enemy.debuffs?.igniteDmg > 0 && enemy.debuffs?.igniteTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#ff6b3540', color: '#ff6b35', border: '1px solid #ff6b3580' }}>🔥 화염 {enemy.debuffs.igniteDmg} ({enemy.debuffs.igniteEternal ? '∞' : enemy.debuffs.igniteTurns + 'T'})</span>)}
                {enemy.debuffs?.eternalFireDmg > 0 && enemy.debuffs?.eternalFireTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#8b1a1a40', color: '#ff8888', border: '1px solid #8b1a1a' }}>🌋 겁화 {enemy.debuffs.eternalFireDmg} ({enemy.debuffs.eternalFireEternal ? '∞' : `${enemy.debuffs.eternalFireTurns}T`})</span>)}
                {enemy.berserkStacks > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#c4453d40', color: '#c4453d', border: '1px solid #c4453d80' }}>🩸 광폭 +{enemy.berserkStacks}</span>)}
                {enemy.regen > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#9ad4a340', color: '#9ad4a3', border: '1px solid #9ad4a380' }}>✨ 회복 +{enemy.regen}/T</span>)}
                {enemy.debuffs?.shockGauge > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.shock}40`, color: PALETTE.shock, border: `1px solid ${PALETTE.shock}80` }}>⚡ 충격 {enemy.debuffs.shockGauge}/100</span>)}
                {enemy.debuffs?.stunned > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}40`, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}` }}>✦ 기절</span>)}
                {enemy.debuffs?.shockResist > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.textDim}40`, color: PALETTE.textDim, border: `1px solid ${PALETTE.textDim}80` }}>◇ 저항 ({enemy.debuffs.shockResistTurns}T)</span>)}
              </div>
              {/* 3줄: 심안 의도 카드 (고정 높이) */}
              <div className="min-h-[22px]">
                {phase === 'playerTurn' && enemy.nextIntent && getSkillLevel(skills, '심안') >= 3 && !engravingFx.disableInsightPredict && (() => {
                  const lv = getSkillLevel(skills, '심안');
                  const isAttack = enemy.nextIntent.type === 'attack';
                  if (lv < 5) {
                    return (
                      <div className="px-2 py-1 flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.7)', border: `1px dashed ${enemy.color}80` }}>
                        <AlertTriangle size={11} style={{ color: enemy.color }} />
                        <span className="text-[10px] italic" style={{ color: PALETTE.text }}>{isAttack ? '공격할 것 같다' : '방어할 거 같다'}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="px-2 py-1 flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.7)', border: `1px dashed ${enemy.color}80` }}>
                      <AlertTriangle size={11} style={{ color: enemy.color }} />
                      <span className="text-[10px] px-1" style={{ background: isAttack ? `${PALETTE.accent}30` : `${PALETTE.defense}30`, color: isAttack ? PALETTE.accent : PALETTE.defense, border: `1px solid ${isAttack ? PALETTE.accent : PALETTE.defense}60` }}>{isAttack ? '공격' : '방어'}</span>
                      <span className="text-[11px] font-bold" style={{ color: PALETTE.text }}>{enemy.nextIntent.name}</span>
                      {lv >= 7 && (
                        <div className="flex ml-auto gap-2">
                          {enemy.nextIntent.dmg && enemy.nextIntent.dmg[1] > 0 && (
                            <span className="text-[10px] tabular-nums" style={{ color: enemy.nextIntent.heavy ? PALETTE.accent : PALETTE.textDim }}>{enemy.nextIntent.dmg[0]}-{enemy.nextIntent.dmg[1]}</span>
                          )}
                          {enemy.nextIntent.type === 'defend' && enemy.nextIntent.defense && (
                            <span className="text-[10px]" style={{ color: PALETTE.defense }}>+{enemy.nextIntent.defense}</span>
                          )}
                          {enemy.nextIntent.frostbite > 0 && (
                            <span className="text-[10px]" style={{ color: '#7ba3c4' }}>❄️{enemy.nextIntent.frostbite}</span>
                          )}
                          {enemy.nextIntent.seal > 0 && (
                            <span className="text-[10px]" style={{ color: '#5c4a8c' }}>🔒{enemy.nextIntent.seal}</span>
                          )}
                          {enemy.nextIntent.shock > 0 && (
                            <span className="text-[10px]" style={{ color: '#8b1f1f' }}>⚡{enemy.nextIntent.shock}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* === 2/3: 전투 로그 (5줄 분량 = 약 110px 고정, 확장 버튼 제공) === */}
        <div className="shrink-0 relative border-b" style={{ borderColor: PALETTE.panelBorder }}>
          <button
            onClick={() => setLogExpanded(true)}
            className="absolute top-1 right-1 z-10 p-1 rounded"
            style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${PALETTE.panelBorder}` }}
            title="전투 로그 확장"
            aria-label="전투 로그 확장"
          >
            <Maximize2 size={11} style={{ color: PALETTE.textDim }} />
          </button>
          <div className="h-[110px] overflow-y-auto px-3 py-2 space-y-1" style={{ background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)` }}>
            {log.map((l, i) => {
              if (l.type === 'turnDivider') {
                return (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="flex-1 h-px" style={{ background: PALETTE.panelBorder }} />
                    <span className="text-[9px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>턴 {l.turn}</span>
                    <div className="flex-1 h-px" style={{ background: PALETTE.panelBorder }} />
                  </div>
                );
              }
              return (
                <div key={i}>
                  <div className="text-[11px] leading-snug" style={{ color: l.type === 'damage' ? PALETTE.accent : l.type === 'damageTaken' ? PALETTE.bleed : l.type === 'crit' ? PALETTE.legendary : l.type === 'passive' ? PALETTE.dawn : l.type === 'debuff' ? PALETTE.shock : l.type === 'heal' ? PALETTE.green : l.type === 'enemy_action' ? PALETTE.accent : l.type === 'victory' ? PALETTE.legendary : l.type === 'defeat' ? PALETTE.accent : PALETTE.text, opacity: l.type === 'system' ? 0.7 : 1 }}>{l.text}</div>
                  {l.breakdown && (<div className="text-[9px] leading-snug pl-3" style={{ color: PALETTE.textDim, opacity: 0.7 }}>({l.breakdown})</div>)}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* === 3/3: 내 영역 (일러스트 + 정보 BAR 오버레이) === */}
        {/* 외부 컨테이너는 안정적으로 mount 유지 — 자식 FX 컴포넌트가 매번 재-마운트되어
            방어 이펙트가 잘못 재발되는 문제 방지. shake는 inner wrapper로 격리 */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* shake 적용용 inner wrapper — 일러만 흔들림 */}
          <div
            key={`player-shake-${fxPlayerShake}`}
            className={`absolute inset-0 ${fxPlayerShake ? 'fx-hit-shake' : ''}`}
          >
            {/* 내 전투 일러스트 — 가로형, 가득 채움 */}
            <img
              src={classData.combatImage || classData.image}
              alt="Player Avatar"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center center' }}
              onError={(e) => {
                // 전투 일러 없으면 기본 일러로 폴백
                if (e.target.src.includes('combat/')) {
                  e.target.src = classData.image;
                } else {
                  e.target.src = './classes/wanderer.jpg';
                }
              }}
            />
          </div>
          {/* FX 오버레이 — 방어 FX (결계/다이아/소진) + 흰 플래시 + 부유 라벨 (shake 영향 X) */}
          <WhiteFlash trigger={fxPlayerFlash} />
          <BarrierRing trigger={fxBarrier} color={PALETTE.ice || '#7ba3c4'} />
          <BladeGuardFx trigger={fxBladeGuard} color="#9bb8d4" />
          <BarrierBreakFx trigger={fxBarrierBreak} color={PALETTE.ice || '#7ba3c4'} />
          {/* 1.45.0 화염장막 결계 + 반사 */}
          <FlameBarrierFx trigger={fxFlameBarrier} />
          <FlameReflectFx trigger={fxFlameReflect} />
          {fxPlayerLabels.map(l => (
            <FloatingLabel key={l.id} kind={l.kind} value={l.value} label={l.label} />
          ))}
          {/* 정보 BAR 오버레이 (하단 + 그라디언트) */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)`, pointerEvents: 'none' }} />
            <div className="relative px-3 py-2">
              {/* 1줄: 이름 + 스테이터스 모달 버튼 + HP */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold drop-shadow-md" style={{ color: classData.color }}>{classData.name}</span>
                  <button onClick={() => setStatusModalOpen(true)} className="text-[10px] px-1.5 py-0.5 leading-none" style={{ background: `${classData.color}30`, border: `1px solid ${classData.color}80`, color: '#fff' }} title="스테이터스 보기">≡</button>
                </div>
                <span className="text-[11px] tabular-nums font-bold drop-shadow-md" style={{ color: PALETTE.text }}>{animDmg.player && <span className="mr-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.player}</span>}{player.hp}/{player.maxHp}</span>
              </div>
              <div className="h-1.5 relative mb-1.5" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="absolute inset-y-0 left-0" style={{ width: `${(player.hp/player.maxHp)*100}%`, background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.green})`, transition: 'width 0.45s cubic-bezier(.4,0,.2,1)' }} /></div>
              {/* 2줄: 버프/상태 카드 (고정 높이) */}
              <div className="flex items-center gap-1.5 flex-wrap min-h-[18px]">
                <span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.twilight}50`, color: '#fff', border: `1px solid ${PALETTE.twilight}` }}>✦ 에테르 {player.ether}/{player.maxEther}</span>
                {player.defense > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}50`, color: '#fff', border: `1px solid ${PALETTE.defense}` }}>◈ 방어 {player.defense}</span>)}
                {player.buffs?.rage > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.accent}50`, color: '#fff', border: `1px solid ${PALETTE.accent}` }}>☩ 분노 ({player.buffs.rage}T)</span>)}
                {player.buffs?.shadowCounterTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#1a0f0a90', color: '#ffd86b', border: '1px solid #ffd86b', boxShadow: '0 0 6px rgba(255,216,107,0.5)' }}>☄ 무영의 잔영 반격 100% ({player.buffs.shadowCounterTurns}T)</span>)}
                {player.buffs?.flameBoostTurns > 0 && player.buffs?.flameBoostPct > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#ff450050', color: '#ffd1a3', border: '1px solid #ff4500', boxShadow: '0 0 6px rgba(255,69,0,0.5)' }}>🔥 영겁의 정념 +{player.buffs.flameBoostPct}% ({player.buffs.flameBoostTurns}T)</span>)}
                {player.buffs?.flameBarrierPending > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#ff6b3550', color: '#fff', border: '1px solid #ff6b35' }}>🔥 화염장막 ({player.buffs.flameBarrierPending}%)</span>)}
                {player.buffs?.guaranteedCrit > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#c4453d50', color: '#fff', border: '1px solid #c4453d' }}>✦ 치명타 확정</span>)}
                {player.buffs?.mirrorCounterDmgPending && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#88aacc50', color: '#fff', border: '1px solid #88aacc' }}>◇ 회피→반격 +100%</span>)}
                {player.firstHitImmune && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}50`, color: '#fff', border: `1px solid ${PALETTE.legendary}` }}>✦ 무적 1회</span>)}
                {player.debuffs?.frostbiteDmg > 0 && player.debuffs?.frostbiteTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#7ba3c450', color: '#fff', border: '1px solid #7ba3c4' }}>❄️ 동상 {player.debuffs.frostbiteDmg} ({player.debuffs.frostbiteTurns}T)</span>)}
                {player.debuffs?.sealedTurns > 0 && player.debuffs?.sealedSkills?.length > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#5c4a8c50', color: '#fff', border: '1px solid #5c4a8c' }}>🔒 봉인 {player.debuffs.sealedSkills.join(',')} ({player.debuffs.sealedTurns}T)</span>)}
                {player.debuffs?.shockGauge > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#8b1f1f50', color: '#fff', border: '1px solid #8b1f1f' }}>⚡ 충격 {player.debuffs.shockGauge}/100</span>)}
                {player.debuffs?.stunnedTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#a52a2a50', color: '#fff', border: '1px solid #a52a2a' }}>💫 기절 ({player.debuffs.stunnedTurns}T)</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* 스킬 버튼 — 고정 높이 (소울 게이지 + 4번째 궁극 슬롯이 있으면 +12px) */}
        <div className="shrink-0 border-t px-2.5 flex flex-col justify-center" style={{
          borderColor: PALETTE.panelBorder,
          background: PALETTE.bgDeep,
          height: classData.ultimateId ? 104 : 88,
        }}>
          {/* 소울 게이지 바 (직업 소울 스킬 보유 시) */}
          {classData.ultimateId && phase === 'playerTurn' && (() => {
            const gauge = player.soulGauge || 0;
            const ready = gauge >= 100;
            return (
              <div className="w-full mb-1.5 flex items-center gap-2">
                <span className="text-[9px] tracking-[0.2em]" style={{ color: ready ? '#ffd86b' : PALETTE.textDim }}>소울</span>
                <div className="flex-1 h-1.5 relative" style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${ready ? '#ffd86b' : PALETTE.panelBorder}` }}>
                  <div className="absolute inset-y-0 left-0 transition-all" style={{
                    width: `${gauge}%`,
                    background: ready
                      ? `linear-gradient(90deg, #ffd86b, #fff4b8, #ffd86b)`
                      : `linear-gradient(90deg, ${PALETTE.legendary}, #ffd86b)`,
                    boxShadow: ready ? '0 0 8px rgba(255,216,107,0.8)' : 'none',
                  }} />
                </div>
                <span className="text-[9px] tabular-nums" style={{ color: ready ? '#ffd86b' : PALETTE.textDim }}>{gauge}/100</span>
              </div>
            );
          })()}
          {phase === 'intro' && <div className="text-center text-[11px] font-bold w-full" style={{ color: PALETTE.textDim }}>전투 준비 중...</div>}
          {phase === 'enemyTurn' && <div className="text-center text-[11px] font-bold w-full" style={{ color: PALETTE.accent }}>◂ 적의 턴 ◂</div>}
          {phase === 'playerTurn' && (
            <div className={`grid gap-1.5 w-full ${classData.ultimateId ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {classData.combatSkills.map(skillKey => {
                const skill = COMBAT_SKILLS[skillKey];
                if (!skill) return null;
                const onCd = (player.cooldowns[skillKey] || 0) > 0;
                // 1.45.3: etherCost-20 효과 폐기 (마력 Lv5 재시전 +10%로 변경됨)
                let cost = skill.cost || 0;
                const noEther = cost > player.ether;
                // 단독 버프 스킬은 같은 턴 1회 제한 (쿨타임 감소 효과로 무한 사용 방지)
                const buffUsedThisTurn = skill.type === 'buff' && player.usedBuffThisTurn;
                const disabled = onCd || noEther || buffUsedThisTurn;
                return (
                  <button key={skillKey} onClick={() => handlePlayerAction(skillKey)} disabled={disabled}
                    className="py-2 transition-all flex flex-col items-center gap-0.5"
                    style={{
                      background: disabled ? 'rgba(0,0,0,0.5)'
                        : skill.type === 'physical' ? `${PALETTE.accent}30`
                        : skill.type === 'magic' ? `${PALETTE.twilight}30`
                        : skill.type === 'defense' ? `${PALETTE.ice}30`
                        : `${PALETTE.dawn}30`,
                      border: `1px solid ${disabled ? PALETTE.panelBorder : skill.type === 'physical' ? PALETTE.accent : skill.type === 'magic' ? PALETTE.twilight : skill.type === 'defense' ? PALETTE.ice : PALETTE.dawn}`,
                      color: disabled ? PALETTE.textDim : '#fff',
                      opacity: disabled ? 0.5 : 1,
                    }}>
                    <span className="text-[11px] font-bold">{skill.name}</span>
                    <span className="text-[9px]" style={{ color: disabled ? PALETTE.textDim : '#ddd' }}>
                      {skill.type === 'defense' ? `+${skill.defense}`
                        : skill.type === 'buff' ? '버프 · 즉시'
                        : (() => {
                            const dmgRange = getDisplayDamage(skill, player, skills, ultimates, meta, curses, activeSkills, relicStat, engravingFx);
                            return dmgRange ? `${dmgRange[0]}-${dmgRange[1]}` : `${skill.baseDmg[0]}-${skill.baseDmg[1]}`;
                          })()
                      }
                      {cost > 0 && ` ✦${cost}`}
                    </span>
                    {onCd && <span className="text-[9px] font-bold" style={{ color: PALETTE.accent }}>CD {player.cooldowns[skillKey]}</span>}
                  </button>
                );
              })}
              {/* 4번째 버튼: 직업 소울 스킬 (소울 게이지 100에서 활성화) */}
              {classData.ultimateId && (() => {
                const ult = CLASS_ULTIMATES[classData.ultimateId];
                if (!ult) return null;
                const ready = (player.soulGauge || 0) >= 100;
                return (
                  <button
                    onClick={() => handleUltimate()}
                    disabled={!ready}
                    title={`${ult.name}\n${ult.desc}`}
                    className={`py-2 transition-all flex flex-col items-center gap-0.5 ${ready ? 'fx-hit-shake' : ''}`}
                    style={{
                      background: ready ? `linear-gradient(180deg, ${ult.color}60, ${ult.color}25)` : 'rgba(0,0,0,0.55)',
                      border: `1px solid ${ready ? '#ffd86b' : PALETTE.panelBorder}`,
                      color: ready ? '#fff' : PALETTE.textDim,
                      opacity: ready ? 1 : 0.55,
                      boxShadow: ready ? '0 0 10px rgba(255,216,107,0.55)' : 'none',
                    }}
                  >
                    <span className="text-[11px] font-bold flex items-center gap-0.5">
                      <span style={{ color: ready ? '#ffd86b' : PALETTE.textDim }}>★</span>
                      {ult.name}
                    </span>
                    <span className="text-[9px]" style={{ color: ready ? '#ffd86b' : PALETTE.textDim }}>
                      {ready ? '발동 가능' : `소울 ${player.soulGauge || 0}/100`}
                    </span>
                  </button>
                );
              })()}
            </div>
          )}
          {phase === 'victory' && (
            <button onClick={() => {
              // 연옥지화: 화염 각인 또는 겁화 보유 적 처치 시 즉시 HP +50
              // 1.33.0~ 회복 유물(heal%)·매력 시그니처·저주 적용 (다른 회복 경로와 동일 처리)
              let finalHp = player.hp;
              const hasIgnite = enemy.debuffs?.igniteDmg > 0 && enemy.debuffs?.igniteTurns > 0;
              const hasEternalFire = enemy.debuffs?.eternalFireDmg > 0 && enemy.debuffs?.eternalFireTurns > 0;
              if (hasUltimate(ultimates, 'ult_purgatoryFire') && (hasIgnite || hasEternalFire)) {
                let heal = 50;
                if (relicStat.heal > 0) heal = Math.floor(heal * (1 + relicStat.heal / 100));
                const charismaBonus = getCharismaHealBonus(player);
                if (charismaBonus > 0) heal = Math.floor(heal * (1 + charismaBonus / 100));
                if (hasCurse(curses, 'curse_heal-50')) heal = Math.floor(heal * 0.5);
                finalHp = Math.min(player.maxHp, player.hp + heal);
              }
              onVictory(finalHp, enemy.drop);
            }}
              className="w-full py-2.5 text-xs tracking-[0.3em] font-bold" style={{
                background: `linear-gradient(180deg, ${PALETTE.legendary}60, ${PALETTE.legendary}30)`,
                border: `1px solid ${PALETTE.legendary}`, color: '#fff',
              }}>▸ 보상 획득</button>
          )}
          {phase === 'defeat' && (
            <button onClick={() => onDefeat()} className="w-full py-2.5 text-xs tracking-[0.3em] font-bold" style={{
              background: `linear-gradient(180deg, ${PALETTE.accent}60, ${PALETTE.accent}30)`,
              border: `1px solid ${PALETTE.accent}`, color: '#fff',
            }}>▸ 메인 메뉴로</button>
          )}
        </div>

      </div>
      
      {/* 스테이터스 전체 모달 (직업명 옆 ≡ 클릭 시) */}
      {statusModalOpen && (
        <div onClick={() => setStatusModalOpen(false)} className="absolute inset-0 flex items-center justify-center z-40 px-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm max-h-[85%] overflow-y-auto px-4 py-4" style={{ background: PALETTE.bgDeep, border: `1px solid ${classData.color}` }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[12px] tracking-[0.3em] font-bold" style={{ color: classData.color }}>━ {classData.name} 스테이터스 ━</span>
              <button onClick={() => setStatusModalOpen(false)} className="text-[14px] px-2" style={{ color: PALETTE.textDim }}>✕</button>
            </div>
            
            {/* HP / 에테르 / 방어 */}
            <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
              <div className="px-2 py-1.5" style={{ background: `${PALETTE.blood}20`, border: `1px solid ${PALETTE.blood}60` }}>
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>체력</div>
                <div className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.hp}/{player.maxHp}</div>
              </div>
              <div className="px-2 py-1.5" style={{ background: `${PALETTE.twilight}20`, border: `1px solid ${PALETTE.twilight}60` }}>
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>에테르</div>
                <div className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.ether}/{player.maxEther}</div>
              </div>
              <div className="px-2 py-1.5" style={{ background: `${PALETTE.defense}20`, border: `1px solid ${PALETTE.defense}60` }}>
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>방어</div>
                <div className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.defense || 0}</div>
              </div>
            </div>

            {/* 활성 상태 — 메인 헤더의 buff/debuff 칩을 모달에서도 확인 가능 */}
            {(() => {
              const hasAnyStatus = (player.buffs?.rage > 0) || (player.buffs?.shadowCounterTurns > 0) || (player.buffs?.flameBoostTurns > 0) || (player.buffs?.flameBarrierPending > 0) || (player.buffs?.guaranteedCrit > 0) || (player.buffs?.mirrorCounterDmgPending) || (player.buffs?.dodgeBuffTurns > 0) || player.firstHitImmune || (player.debuffs?.frostbiteDmg > 0 && player.debuffs?.frostbiteTurns > 0) || (player.debuffs?.sealedTurns > 0 && player.debuffs?.sealedSkills?.length > 0) || (player.debuffs?.shockGauge > 0) || (player.debuffs?.stunnedTurns > 0);
              if (!hasAnyStatus) return null;
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 활성 상태 ━</div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {player.buffs?.rage > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.accent}50`, color: '#fff', border: `1px solid ${PALETTE.accent}` }}>☩ 분노 ({player.buffs.rage}T)</span>)}
                    {player.buffs?.shadowCounterTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#1a0f0a90', color: '#ffd86b', border: '1px solid #ffd86b', boxShadow: '0 0 6px rgba(255,216,107,0.5)' }}>☄ 무영의 잔영 반격 100% ({player.buffs.shadowCounterTurns}T)</span>)}
                    {player.buffs?.flameBoostTurns > 0 && player.buffs?.flameBoostPct > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#ff450050', color: '#ffd1a3', border: '1px solid #ff4500', boxShadow: '0 0 6px rgba(255,69,0,0.5)' }}>🔥 영겁의 정념 +{player.buffs.flameBoostPct}% ({player.buffs.flameBoostTurns}T)</span>)}
                    {player.buffs?.flameBarrierPending > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#ff6b3550', color: '#fff', border: '1px solid #ff6b35' }}>🔥 화염장막 ({player.buffs.flameBarrierPending}%)</span>)}
                    {player.buffs?.guaranteedCrit > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#c4453d50', color: '#fff', border: '1px solid #c4453d' }}>✦ 치명타 확정</span>)}
                    {player.buffs?.mirrorCounterDmgPending && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#88aacc50', color: '#fff', border: '1px solid #88aacc' }}>◇ 회피→반격 +100%</span>)}
                    {player.buffs?.dodgeBuffTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.green}50`, color: '#fff', border: `1px solid ${PALETTE.green}` }}>💨 회피 +{player.buffs.dodgeBuff || 0}% ({player.buffs.dodgeBuffTurns}T)</span>)}
                    {player.firstHitImmune && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}50`, color: '#fff', border: `1px solid ${PALETTE.legendary}` }}>✦ 무적 1회</span>)}
                    {player.debuffs?.frostbiteDmg > 0 && player.debuffs?.frostbiteTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#7ba3c450', color: '#fff', border: '1px solid #7ba3c4' }}>❄️ 동상 {player.debuffs.frostbiteDmg} ({player.debuffs.frostbiteTurns}T)</span>)}
                    {player.debuffs?.sealedTurns > 0 && player.debuffs?.sealedSkills?.length > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#5c4a8c50', color: '#fff', border: '1px solid #5c4a8c' }}>🔒 봉인 {player.debuffs.sealedSkills.join(',')} ({player.debuffs.sealedTurns}T)</span>)}
                    {player.debuffs?.shockGauge > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#8b1f1f50', color: '#fff', border: '1px solid #8b1f1f' }}>⚡ 충격 {player.debuffs.shockGauge}/100</span>)}
                    {player.debuffs?.stunnedTurns > 0 && (<span className="text-[10px] px-1.5 py-0.5" style={{ background: '#a52a2a50', color: '#fff', border: '1px solid #a52a2a' }}>💫 기절 ({player.debuffs.stunnedTurns}T)</span>)}
                  </div>
                </>
              );
            })()}

            {/* 그룹 1: 기본 능력 */}
            <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 기본 능력 ━</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>근력</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.근력 || 0}</span></div>
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>민첩</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.민첩 || 0}</span></div>
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>지능</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.지능 || 0}</span></div>
              <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>매력</span><span className="font-bold tabular-nums" style={{ color: PALETTE.text }}>{player.매력 || 0}</span></div>
            </div>
            
            {/* 그룹 2: 전투 수치 */}
            {(() => {
              const playerDex = player.민첩 || 10;
              let critRate = 5 + Math.max(0, (playerDex - 10) * 0.5);
              critRate += getMinorBonus(skills, 'critRate+', activeSkills);
              critRate += getMetaBonus(meta, 'critRate+2%') * 2;
              critRate += relicStat.critRate || 0;
              if (hasEffect(skills, 'weaknessPoint', activeSkills)) critRate += 10;
              // 무영검: 치명타 +15%
              if (hasUltimate(ultimates, 'ult_counterShadow')) critRate += 15;
              let critDmg = hasEffect(skills, 'critDmg+30', activeSkills) ? 80 : 50;
              critDmg += relicStat.critDmg || 0;
              if (hasEffect(skills, 'weaknessPoint', activeSkills)) critDmg += 50;
              let dodgeRate = Math.max(0, (playerDex - 10) * 0.3);
              dodgeRate += getMinorBonus(skills, 'dodge+', activeSkills);
              dodgeRate += relicStat.dodge || 0;
              if (hasEffect(skills, 'dodge+15', activeSkills)) dodgeRate += 15;
              if (hasEffect(skills, 'detailIntent', activeSkills)) dodgeRate += 10;
              const simanLv = skills['심안류'] || 0;
              const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
              const hasShock = hasUltimate(ultimates, 'ult_counterShock');
              const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
              // 명경지수: 회피율 +10%
              if (hasMirror) dodgeRate += 10;
              // 무영의 잔영 활성 시 100% 강제 (실제 반격 처리 로직과 동일 — line 962-970 참조)
              const shadowStrikeBuff = (player.buffs?.shadowCounterTurns || 0) > 0;
              let counterRate = 0;
              if (simanLv > 0 || hasMirror || hasShock || hasShadow || shadowStrikeBuff) {
                counterRate = simanLv * 5;  // minor: 5%/Lv
                if (simanLv >= 3) counterRate += 20;  // Lv.3
                if (hasMirror || hasShock || hasShadow) counterRate += 60;  // 궁극 +60%
                if (shadowStrikeBuff) counterRate = 100;  // 무영의 잔영: 100% 강제
                if (counterRate > 100) counterRate = 100;  // 상한
              }
              const ignite = getIfritIgniteRate(skills, ultimates, activeSkills);
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 전투 수치 ━</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>치명타 발동율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{Math.round(critRate)}%</span></div>
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>치명타 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{Math.round(critDmg)}%</span></div>
                    <div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회피 발동율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>{Math.round(dodgeRate)}%</span></div>
                    {counterRate > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격 발동율</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{counterRate}%</span></div>)}
                    {ignite.has && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>화염 각인 발동율</span><span className="font-bold tabular-nums" style={{ color: '#d97706' }}>{ignite.rate}%</span></div>)}
                  </div>
                </>
              );
            })()}
            
            {/* 그룹 3: 데미지 보정 */}
            {(() => {
              const physBonus = getMinorBonus(skills, 'physDmg+', activeSkills);
              const magicBonus = getMinorBonus(skills, 'magicDmg+', activeSkills);
              const bleedBonus = getMinorBonus(skills, 'bleedDmg+', activeSkills);
              // 반격 데미지: minor + Lv.5 +15% + 궁극 +50%
              const simanLv = skills['심안류'] || 0;
              const hasMirror = hasUltimate(ultimates, 'ult_counterMirror');
              const hasShock = hasUltimate(ultimates, 'ult_counterShock');
              const hasShadow = hasUltimate(ultimates, 'ult_counterShadow');
              let counterDmgBonus = simanLv * 5;
              if (simanLv >= 5) counterDmgBonus += 15;
              if (hasMirror || hasShock || hasShadow) counterDmgBonus += 50;
              const metaDmgBonus = getMetaBonus(meta, 'dmgDealt+2%') * 2;
              const relicDmgBonus = relicStat.dmgDealt || 0;
              const allDmgBonus = metaDmgBonus + relicDmgBonus;
              const dmgTakenMeta = getMetaBonus(meta, 'dmgTaken-2%') * 2;
              const dmgTakenRelic = relicStat.dmgTaken || 0;
              const dmgTakenLv5 = hasEffect(skills, 'dmgTaken-20', activeSkills) ? 20 : 0;
              const dmgTakenCharisma = getCharismaDmgReduction(player);
              const dmgTakenReduce = dmgTakenMeta + dmgTakenRelic + dmgTakenLv5 + dmgTakenCharisma;
              const dmgDealtCurse = hasCurse(curses, 'curse_dmgDealt-15') ? 15 : 0;
              const dmgTakenCurse = (hasCurse(curses, 'curse_dmgTaken+15') ? 15 : 0)
                + (hasCurse(curses, 'curse_dmgTaken+30') ? 30 : 0);
              const hasAny = physBonus || magicBonus || bleedBonus || counterDmgBonus || allDmgBonus || dmgTakenReduce || dmgDealtCurse || dmgTakenCurse || (player.buffs?.rage > 0);
              if (!hasAny) return null;
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 데미지 보정 ━</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
                    {physBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>물리 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{physBonus}</span></div>)}
                    {magicBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>마법 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{magicBonus}%</span></div>)}
                    {bleedBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>출혈 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.bleed }}>+{bleedBonus}%</span></div>)}
                    {counterDmgBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>반격 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{counterDmgBonus}%</span></div>)}
                    {allDmgBonus > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>모든 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>+{allDmgBonus}%</span></div>)}
                    {player.buffs?.rage > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>분노 버프</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+30%</span></div>)}
                    {dmgTakenReduce > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>받는 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>-{dmgTakenReduce}%</span></div>)}
                    {dmgDealtCurse > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>저주: 가하는 데미지</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{dmgDealtCurse}%</span></div>)}
                    {dmgTakenCurse > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>저주: 받는 피해</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>+{dmgTakenCurse}%</span></div>)}
                  </div>
                </>
              );
            })()}
            
            {/* 그룹 4: 기타 효과 */}
            {(() => {
              const regenLv = skills['재생'] || 0;
              const lifesteal = relicStat.lifesteal || 0;
              const reflect = relicStat.reflect || 0;
              const heal = relicStat.heal || 0;
              const charismaHeal = getCharismaHealBonus(player);
              const cdReduce = getMinorBonus(skills, 'cdReduce+', activeSkills);
              // 1.45.3: etherCost-20 효과 폐기. 마력 재시전 확률을 기타 효과에 추가
              const magicEchoPct = getMagicEchoChance(skills, activeSkills);
              const hasAny = regenLv || lifesteal || reflect || heal || charismaHeal || cdReduce || magicEchoPct;
              if (!hasAny) return null;
              return (
                <>
                  <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 기타 효과 ━</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-3">
                    {regenLv > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>HP 자동 회복</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{regenLv}/턴</span></div>)}
                    {lifesteal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>흡혈</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>+{lifesteal}</span></div>)}
                    {reflect > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>데미지 반사</span><span className="font-bold tabular-nums" style={{ color: PALETTE.accent }}>{reflect}%</span></div>)}
                    {heal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>회복량 보너스</span><span className="font-bold tabular-nums" style={{ color: PALETTE.green }}>+{heal}%</span></div>)}
                    {charismaHeal > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>매력 시그: 회복</span><span className="font-bold tabular-nums" style={{ color: PALETTE.dawn }}>+{charismaHeal}%</span></div>)}
                    {cdReduce > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>쿨다운 감소</span><span className="font-bold tabular-nums" style={{ color: PALETTE.twilight }}>-{cdReduce}턴</span></div>)}
                    {magicEchoPct > 0 && (<div className="flex justify-between" style={{ color: PALETTE.textDim }}><span>마법 재시전 확률</span><span className="font-bold tabular-nums" style={{ color: PALETTE.legendary }}>{magicEchoPct}%</span></div>)}
                  </div>
                </>
              );
            })()}
            
            {/* 패시브 */}
            <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 패시브 ━</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {Object.entries(skills).filter(([n, l]) => l > 0 && (!activeSkills || activeSkills.includes(n))).map(([name, lv]) => {
                const sk = PASSIVE_SKILLS[name];
                if (!sk) return null;
                return (
                  <button key={name} onClick={() => { setStatusModalOpen(false); setTooltip({ type: 'skill', name, lv }); }} className="text-[10px] px-2 py-1" style={{ background: `${sk.color}25`, border: `1px solid ${sk.color}80`, color: '#fff' }}>
                    {name}<span style={{ color: sk.color, marginLeft: '3px' }}>Lv.{lv}</span>
                  </button>
                );
              })}
              {(ultimates || []).map(uid => {
                let ultData = null;
                Object.entries(ULTIMATE_SKILLS).forEach(([sk, ults]) => {
                  ults.forEach(u => { if (u.id === uid || u.effect === uid) ultData = u; });
                });
                if (!ultData) return null;
                return (
                  <button key={uid} onClick={() => { setStatusModalOpen(false); setTooltip({ type: 'ultimate', name: ultData.name, ult: ultData }); }} className="text-[10px] px-2 py-1" style={{ background: `${ultData.color}40`, border: `1px solid ${ultData.color}`, color: '#fff' }}>
                    ★{ultData.name}
                  </button>
                );
              })}
            </div>
            
            {/* 유물 */}
            {initialRelics && initialRelics.length > 0 && (
              <>
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>━ 유물 ━</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {initialRelics.filter(r => !activeRelicNames || activeRelicNames.includes(r.name)).map((rel, i) => (
                    <button key={i} onClick={() => { setStatusModalOpen(false); setTooltip({ type: 'relic', name: rel.name, relic: rel }); }} className="text-[10px] px-2 py-1" style={{ background: `${rel.color || PALETTE.dawn}25`, border: `1px solid ${rel.color || PALETTE.dawn}80`, color: '#fff' }}>
                      {rel.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            <button onClick={() => setStatusModalOpen(false)} className="w-full mt-2 py-2 text-[11px] tracking-[0.2em]" style={{ background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>닫기</button>
          </div>
        </div>
      )}
      
      {/* 패시브/유물/궁극 정보 툴팁 모달 */}
      {tooltip && (
        <div onClick={() => setTooltip(null)}
          className="absolute inset-0 flex items-center justify-center z-50 px-6"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs px-4 py-4" style={{
              background: PALETTE.bgDeep,
              border: `1px solid ${tooltip.type === 'relic' ? (tooltip.relic?.color || PALETTE.dawn) : tooltip.type === 'ultimate' ? (tooltip.ult?.color || PALETTE.legendary) : PALETTE.dawn}`,
              boxShadow: '0 0 30px rgba(0,0,0,0.8)',
            }}>
            {tooltip.type === 'skill' && (() => {
              const sk = PASSIVE_SKILLS[tooltip.name];
              if (!sk) return null;
              return (
                <>
                  <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: sk.color }}>패시브</div>
                  <div className="text-base font-bold mb-1" style={{ color: PALETTE.text }}>
                    {tooltip.name} <span className="text-xs ml-1" style={{ color: sk.color }}>Lv.{tooltip.lv}</span>
                  </div>
                  <p className="text-[11px] mb-3" style={{ color: PALETTE.textDim }}>{sk.desc}</p>
                  {sk.minorEffect && (
                    <div className="text-[10px] mb-2 px-2 py-1" style={{ background: `${sk.color}15`, color: PALETTE.text }}>
                      ◇ {sk.minorEffect.desc}
                    </div>
                  )}
                  {sk.tiers && Object.entries(sk.tiers).map(([tierLv, tier]) => (
                    <div key={tierLv} className="text-[10px] mb-1 px-2 py-1" style={{ 
                      background: tooltip.lv >= Number(tierLv) ? `${sk.color}25` : 'transparent',
                      color: tooltip.lv >= Number(tierLv) ? PALETTE.text : PALETTE.textDim,
                      border: `1px solid ${tooltip.lv >= Number(tierLv) ? sk.color : PALETTE.panelBorder}`,
                      opacity: tooltip.lv >= Number(tierLv) ? 1 : 0.5,
                    }}>
                      <span className="font-bold" style={{ color: sk.color }}>Lv.{tierLv}</span> {tier.text}
                    </div>
                  ))}
                </>
              );
            })()}
            {tooltip.type === 'relic' && tooltip.relic && (
              <>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: tooltip.relic.color || PALETTE.dawn }}>유물</div>
                <div className="text-base font-bold mb-2" style={{ color: PALETTE.text }}>{tooltip.relic.name}</div>
                <p className="text-[11px]" style={{ color: PALETTE.textDim }}>
                  {tooltip.relic.desc || (tooltip.relic.statBonus 
                    ? Object.entries(tooltip.relic.statBonus).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ')
                    : '')}
                </p>
              </>
            )}
            {tooltip.type === 'ultimate' && tooltip.ult && (
              <>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: tooltip.ult.color || PALETTE.legendary }}>★ 각성</div>
                <div className="text-base font-bold mb-2" style={{ color: PALETTE.text }}>{tooltip.ult.name}</div>
                <p className="text-[11px] whitespace-pre-line" style={{ color: PALETTE.textDim }}>{tooltip.ult.desc}</p>
              </>
            )}
            <button onClick={() => setTooltip(null)}
              className="w-full mt-3 py-1.5 text-[10px] tracking-[0.2em]" style={{
                background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
              }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
