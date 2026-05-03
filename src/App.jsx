import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sword, Shield, Heart, Zap, Skull, Sparkles, Eye, Flame, Crown, BookOpen, Compass, ChevronRight, X, RefreshCw, Lock, Check, AlertTriangle } from 'lucide-react';

// ============================================
// 데로드앤데블랑 로그라이크 v0.4 - INTEGRATED
// 전체 게임 루프: 챕터 → 맵 → 노드 → 전투/사건 → 보상 → 다음 노드 → 보스 → 다음 챕터
// ============================================

const PALETTE = {
  bg: '#0a0608', bgDeep: '#050304',
  panel: '#1a0e12', panelLight: '#241419', panelBorder: '#3d1f28',
  accent: '#c4453d', accentDim: '#7a2820',
  derod: '#d4a574', deblan: '#5c4a8c',
  text: '#e8d9c4', textDim: '#9b8975',
  ice: '#7ba3c4', blood: '#8b1f1f',
  green: '#7a9a5e', legendary: '#e8b04a',
  shock: '#e8b04a', bleed: '#8b1f1f', defense: '#7ba3c4',
};

// =========== 데이터 모듈 import ===========
// 모든 게임 콘텐츠 (적, 사건, 유물, 직업, 챕터, 패시브 등)는 derod_data.js에 있습니다.
// 콘텐츠를 추가/수정하려면 그 파일만 편집하세요.
import {
  PASSIVE_SKILLS,
  CLASSES,
  COMBAT_SKILLS,
  ENEMIES,
  CHAPTERS,
  EVENTS,
  RELICS,
  buildRewardPool,
  SHOP_PRICES,
  GAME_CONFIG,
} from './data.js';

// 보상 풀은 PASSIVE_SKILLS와 RELICS를 합쳐 동적으로 빌드
const REWARD_POOL = buildRewardPool();

function rollRewards(count = 3, eliteBonus = false) {
  const totalWeight = REWARD_POOL.reduce((s, r) => s + r.weight, 0);
  const picked = [];
  const usedKeys = new Set();
  while (picked.length < count) {
    let r = Math.random() * totalWeight;
    for (const reward of REWARD_POOL) {
      r -= reward.weight;
      if (r <= 0) {
        const key = `${reward.type}-${reward.name || reward.value}`;
        if (!usedKeys.has(key)) {
          let final = { ...reward };
          if (eliteBonus && (final.type === 'gold' || final.type === 'gem')) {
            final.value = Math.floor(final.value * 1.5);
          }
          picked.push(final);
          usedKeys.add(key);
        }
        break;
      }
    }
  }
  return picked;
}

// =========== 노드 그래프 생성 ===========
// 보장 사항:
// 1. 시작 노드(layer 0)에서 모든 중간 노드까지 도달 가능
// 2. 모든 노드는 보스로 가는 경로가 존재
// 3. 모든 중간 레이어 노드는 최소 1개의 들어오는 엣지를 가짐
function generateChapterMap(chapter) {
  const layers = Math.max(GAME_CONFIG.minLayers, Math.ceil(chapter.nodeCount / 2.5));
  const nodes = [];
  let id = 0;

  // Layer 0: 시작 노드 (야영지) - 1개
  nodes.push({ id: id++, type: 'rest', layer: 0, x: 50, y: 95, completed: false, current: true, locked: false });

  const types = ['battle', 'event', 'shop', 'unknown', 'elite', 'rest'];
  const weights = [42, 22, 8, 13, 8, 7];

  // 중간 레이어 (1 ~ layers-2)
  for (let l = 1; l < layers - 1; l++) {
    const yPos = 95 - (l / (layers - 1)) * 85;
    const nodeCount = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < nodeCount; i++) {
      const xPos = (i + 1) * (100 / (nodeCount + 1)) + (Math.random() - 0.5) * 6;
      let r = Math.random() * 100;
      let type = 'battle';
      for (let t = 0; t < types.length; t++) {
        r -= weights[t];
        if (r <= 0) { type = types[t]; break; }
      }
      nodes.push({ id: id++, type, layer: l, x: xPos, y: yPos, completed: false, current: false, locked: false });
    }
  }

  // 마지막 레이어: 보스 - 1개
  nodes.push({ id: id++, type: 'boss', layer: layers - 1, x: 50, y: 8, completed: false, current: false, locked: false });

  // 엣지 생성 (개선된 알고리즘)
  const edges = [];
  const edgeSet = new Set(); // 중복 방지
  const addEdge = (a, b) => {
    const key = `${a}-${b}`;
    if (!edgeSet.has(key)) {
      edges.push([a, b]);
      edgeSet.add(key);
    }
  };

  for (let l = 0; l < layers - 1; l++) {
    const cur = nodes.filter(n => n.layer === l);
    const next = nodes.filter(n => n.layer === l + 1);
    if (cur.length === 0 || next.length === 0) continue;

    // Phase 1: 각 cur 노드는 가장 가까운 next 노드와 연결 보장
    cur.forEach(c => {
      const sorted = [...next].sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x));
      addEdge(c.id, sorted[0].id);
      // 분기 가능성 (40%): 두 번째로 가까운 노드도 연결
      if (Math.random() < GAME_CONFIG.branchProbability && sorted.length > 1) {
        addEdge(c.id, sorted[1].id);
      }
    });

    // Phase 2: 모든 next 노드가 최소 1개의 들어오는 엣지를 갖도록 보장
    next.forEach(n => {
      const hasIncoming = edges.some(([_, b]) => b === n.id);
      if (!hasIncoming) {
        // 가장 가까운 cur 노드와 연결
        const sorted = [...cur].sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
        addEdge(sorted[0].id, n.id);
      }
    });
  }

  return { nodes, edges };
}

// =========== 패시브 트리거 헬퍼 ===========
function getActivePassives(skills, triggerType) {
  const active = [];
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv === 0 || !PASSIVE_SKILLS[name]) return;
    Object.entries(PASSIVE_SKILLS[name].tiers).forEach(([tierLv, tierData]) => {
      if (lv >= Number(tierLv) && tierData.trigger === triggerType) {
        active.push({ skillName: name, tierLv: Number(tierLv), ...tierData });
      }
    });
  });
  return active;
}

function hasEffect(skills, effectName) {
  for (const trigger of ['passive', 'onCombatStart', 'onAttack', 'onTurnStart', 'onDodge', 'onLethal']) {
    if (getActivePassives(skills, trigger).some(p => p.effect === effectName)) return true;
  }
  return false;
}

// minorEffect 누적치 계산 (Lv.1부터 효과)
function getMinorBonus(skills, effectType) {
  let total = 0;
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv === 0 || !PASSIVE_SKILLS[name]?.minorEffect) return;
    if (PASSIVE_SKILLS[name].minorEffect.type === effectType) {
      total += PASSIVE_SKILLS[name].minorEffect.perLv * lv;
    }
  });
  return total;
}

function calculateDamage(skill, attacker, defender, skills, isCrit) {
  if (skill.type === 'defense' || skill.type === 'buff') return { finalDmg: 0, defenseMitigated: 0, breakdown: [], isCrit: false };
  let base = Math.floor(skill.baseDmg[0] + Math.random() * (skill.baseDmg[1] - skill.baseDmg[0]));
  let dmg = base;
  let breakdown = [`기본 ${base}`];
  if (skill.type === 'physical') {
    const strBonus = Math.floor((attacker.근력 - 10) * 0.5);
    dmg += strBonus;
    if (strBonus > 0) breakdown.push(`근력 +${strBonus}`);
    // 강타 minor: 물리 데미지 +2/Lv
    const physBonus = getMinorBonus(skills, 'physDmg+');
    if (physBonus > 0) {
      dmg += physBonus;
      breakdown.push(`강타 +${physBonus}`);
    }
  } else if (skill.type === 'magic') {
    const intBonus = Math.floor((attacker.지능 - 10) * 0.7);
    dmg += intBonus;
    if (intBonus > 0) breakdown.push(`지능 +${intBonus}`);
    // 마력 minor: 마법 데미지 +4%/Lv
    const magicMinorPct = getMinorBonus(skills, 'magicDmg+');
    if (magicMinorPct > 0) {
      const magicMinorBonus = Math.floor(dmg * (magicMinorPct / 100));
      dmg += magicMinorBonus;
      if (magicMinorBonus > 0) breakdown.push(`마력 +${magicMinorBonus}`);
    }
  }
  if (skill.berserker) {
    const hpRatio = attacker.hp / attacker.maxHp;
    const berserkBonus = Math.floor(dmg * (1 - hpRatio) * 0.5);
    dmg += berserkBonus;
    if (berserkBonus > 0) breakdown.push(`광폭 +${berserkBonus}`);
  }
  if (attacker.buffs?.rage > 0) {
    const rageBonus = Math.floor(dmg * 0.3);
    dmg += rageBonus;
    breakdown.push(`분노 +${rageBonus}`);
  }
  if (skill.type === 'magic' && hasEffect(skills, 'magicDmg+25')) {
    const magicBonus = Math.floor(dmg * 0.25);
    dmg += magicBonus;
    breakdown.push(`마력 Lv.3 +${magicBonus}`);
  }
  // 강타 Lv.7: 기절(stunned)한 적에게 +50% 데미지
  if (defender.debuffs?.stunned > 0 && hasEffect(skills, 'shockExploit')) {
    const stunBonus = Math.floor(dmg * 0.5);
    dmg += stunBonus;
    breakdown.push(`강타 Lv.7 +${stunBonus}`);
  }
  if (isCrit) {
    let critMult = hasEffect(skills, 'critDmg+30') ? 1.8 : 1.5;
    dmg = Math.floor(dmg * critMult);
    breakdown.push(`치명타 ×${critMult}`);
  }
  let defenseMitigated = 0;
  // 정밀 Lv.3: 치명타 시 적 방어 50% 무시
  const critPierces = isCrit && hasEffect(skills, 'critPierce');
  const piercesArmor = skill.pierce || hasEffect(skills, 'pierceArmor');
  if (defender.defense > 0 && !piercesArmor && skill.type !== 'magic') {
    let effectiveDefense = defender.defense;
    if (critPierces) {
      effectiveDefense = Math.floor(effectiveDefense * 0.5);
      breakdown.push(`정밀 Lv.3 방어 50% 무시`);
    }
    defenseMitigated = Math.min(effectiveDefense, dmg);
    dmg -= defenseMitigated;
  }
  return { finalDmg: Math.max(0, dmg), defenseMitigated, breakdown, isCrit };
}

function rollCrit(skills, attacker) {
  let critRate = 5 + Math.max(0, (attacker.민첩 - 10) * 0.5);
  // 정밀 minor: 치명타율 +3%/Lv (Lv.1부터 적용)
  critRate += getMinorBonus(skills, 'critRate+');
  return Math.random() * 100 < critRate;
}

function rollDodge(skills, defender) {
  let dodgeRate = Math.max(0, (defender.민첩 - 10) * 0.3);
  // 회피 minor: 회피율 +3%/Lv
  dodgeRate += getMinorBonus(skills, 'dodge+');
  if (hasEffect(skills, 'dodge+15')) dodgeRate += 15;
  if (defender.buffs?.dodgeBuff > 0) dodgeRate += defender.buffs.dodgeBuff;
  return Math.random() * 100 < dodgeRate;
}

// =========== UI ===========
const NODE_TYPES = {
  battle: { icon: Skull, color: '#c4453d', label: '전투' },
  elite: { icon: Crown, color: '#e8b04a', label: '강적' },
  event: { icon: BookOpen, color: '#7ba3c4', label: '사건' },
  shop: { icon: Sparkles, color: '#5c4a8c', label: '상점' },
  rest: { icon: Flame, color: '#d4a574', label: '야영' },
  unknown: { icon: Compass, color: '#9b8975', label: '미지' },
  boss: { icon: Crown, color: '#8b1f1f', label: '보스' },
};

function PhoneFrame({ children }) {
  // 모바일에서는 풀스크린, 데스크톱에서는 폰 프레임
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    // 모바일: 풀스크린 (폰 자체가 폰 프레임 역할)
    return (
      <div className="fixed inset-0 overflow-hidden" style={{
        background: PALETTE.bg,
        fontFamily: '"Noto Serif KR", serif',
      }}>
        <div className="absolute inset-0 pointer-events-none opacity-25" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }} />
        {children}
      </div>
    );
  }

  // 데스크톱: 폰 프레임으로 미리보기
  return (
    <div className="relative mx-auto" style={{
      width: '375px', height: '780px',
      background: PALETTE.bg,
      borderRadius: '36px',
      border: `8px solid ${PALETTE.bgDeep}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      fontFamily: '"Noto Serif KR", serif',
    }}>
      <div className="absolute inset-0 pointer-events-none opacity-25" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }} />
      {children}
    </div>
  );
}

// =========== 화면들 ===========

function TitleScreen({ onStart }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-16 px-8" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mt-12">
        <div className="text-xs tracking-[0.4em] mb-4" style={{ color: PALETTE.derod, opacity: 0.7 }}>
          DEROD &amp; DEBLAN
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-3" style={{
          color: PALETTE.text,
          fontFamily: '"Cinzel", serif',
          letterSpacing: '0.05em',
          textShadow: `0 0 30px ${PALETTE.accent}40`,
        }}>
          행복과<br/>불행 사이
        </h1>
        <div className="text-xs tracking-widest mt-6" style={{ color: PALETTE.textDim }}>
          ━━━ 텍스트 로그라이크 ━━━
        </div>
      </div>
      <div className="text-center px-4">
        <p className="text-sm leading-relaxed italic" style={{ color: PALETTE.textDim }}>
          "행복과 불행의 차이는 그리 크지 않아.<br/>
          어느 시각으로 보느냐에 따라서 달라질 뿐이지..."
        </p>
      </div>
      <button onClick={onStart} className="px-12 py-3 transition-all hover:scale-105" style={{
        background: `linear-gradient(180deg, ${PALETTE.accent}, ${PALETTE.accentDim})`,
        color: PALETTE.text,
        border: `1px solid ${PALETTE.derod}40`,
        fontFamily: '"Cinzel", serif',
        letterSpacing: '0.3em',
        fontSize: '14px',
        boxShadow: `0 0 20px ${PALETTE.accent}40`,
      }}>여정 시작</button>
    </div>
  );
}

function ClassSelect({ selected, onSelect, onNext, onBack }) {
  const cls = CLASSES[selected];
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3">
        <p className="text-center text-[11px] tracking-[0.4em] mb-3" style={{ color: PALETTE.textDim }}>
          ◆ 직업을 선택하세요 ◆
        </p>
        <div className="flex gap-1.5">
          {CLASSES.map((c, i) => (
            <button key={c.id} onClick={() => onSelect(i)}
              className="flex-1 aspect-square flex items-center justify-center transition-all"
              style={{
                background: selected === i ? `linear-gradient(135deg, ${c.color}30, ${c.color}10)` : 'rgba(255,255,255,0.02)',
                border: selected === i ? `1.5px solid ${c.color}` : `1px solid ${PALETTE.panelBorder}`,
              }}>
              <span className="text-xl" style={{ color: selected === i ? c.color : PALETTE.textDim }}>
                {selected === i ? '◆' : '+'}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-6 py-3 overflow-hidden">
        <div className="h-full relative overflow-hidden" style={{
          background: `linear-gradient(180deg, ${PALETTE.bgDeep}, ${cls.color}20 60%, ${cls.color}40)`,
          border: `1px solid ${cls.color}60`,
        }}>
          <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.12 }}>
            <div style={{ fontSize: '180px', color: cls.color, fontFamily: 'serif', textShadow: `0 0 40px ${cls.color}` }}>
              {cls.name[0]}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 text-center" style={{
            background: `linear-gradient(180deg, transparent, ${PALETTE.bgDeep}cc 40%, ${PALETTE.bgDeep})`,
          }}>
            <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: cls.color }}>{cls.sub}</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: cls.color, textShadow: `0 0 20px ${cls.color}80` }}>
              {cls.name}
            </h2>
            <p className="text-xs leading-relaxed mb-3" style={{ color: PALETTE.text }}>{cls.desc}</p>
            <div className="text-[11px] mb-2 flex flex-wrap justify-center gap-1.5">
              {Object.entries(cls.startSkills).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5" style={{
                  background: `${PASSIVE_SKILLS[k].color}30`,
                  color: PASSIVE_SKILLS[k].color,
                  border: `1px solid ${PASSIVE_SKILLS[k].color}60`,
                }}>{k} Lv.{v}</span>
              ))}
            </div>
            <div className="flex justify-around pt-2 border-t" style={{ borderColor: `${cls.color}30` }}>
              {Object.entries(cls.stats).map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                  <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`,
          color: PALETTE.textDim, letterSpacing: '0.2em', fontSize: '13px',
        }}>◂ 이전</button>
        <button onClick={onNext} className="py-3" style={{
          background: `linear-gradient(180deg, ${cls.color}40, ${cls.color}20)`,
          border: `1px solid ${cls.color}`, color: PALETTE.text,
          letterSpacing: '0.2em', fontSize: '13px',
        }}>확정 ▸</button>
      </div>
    </div>
  );
}

function ChapterSelect({ unlockedChapter, onSelect, onBack }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 pt-6 pb-3 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: PALETTE.textDim }}>
          ◆ 던전을 선택하세요 ◆
        </p>
        <p className="text-center text-xs mt-1" style={{ color: PALETTE.derod }}>여정의 목적지</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {CHAPTERS.map((ch, i) => {
          const locked = i >= unlockedChapter;
          return (
            <button key={ch.id} onClick={() => !locked && onSelect(ch)} disabled={locked}
              className="w-full text-left relative overflow-hidden transition-all"
              style={{
                background: locked
                  ? `linear-gradient(135deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`
                  : `linear-gradient(135deg, ${ch.color}25, ${PALETTE.bgDeep})`,
                border: `1px solid ${locked ? PALETTE.panelBorder : ch.color}`,
                opacity: locked ? 0.5 : 1,
              }}>
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] tracking-[0.2em] mb-0.5" style={{ color: ch.color, opacity: 0.7 }}>
                      CHAPTER {ch.id} · {ch.sub}
                    </div>
                    <div className="text-base font-bold" style={{ color: PALETTE.text }}>{ch.name}</div>
                  </div>
                  {locked ? <Lock size={14} style={{ color: PALETTE.textDim }} />
                    : i === 3 ? <Crown size={16} style={{ color: PALETTE.legendary }} />
                    : <ChevronRight size={16} style={{ color: ch.color }} />}
                </div>
                <p className="text-[11px] mb-3 leading-relaxed" style={{ color: PALETTE.textDim }}>{ch.desc}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <div style={{ color: PALETTE.textDim }}>노드 <span style={{ color: PALETTE.text }}>{ch.nodeCount}</span></div>
                  <div className="flex items-center gap-1.5">
                    <Skull size={10} style={{ color: PALETTE.accent }} />
                    <span style={{ color: PALETTE.text }}>{ENEMIES[ch.enemies.boss].name}</span>
                    {i === 3 && <span style={{ color: PALETTE.legendary, fontWeight: 'bold' }}>· 최종</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="w-full py-2 text-[11px] tracking-[0.3em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>◂ 이전</button>
      </div>
    </div>
  );
}

function MapView({ chapter, classData, mapData, hp, maxHp, gold, gem, onEnterNode, onOpenStatus, onBack }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{
        background: `linear-gradient(180deg, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 100%)`,
        borderBottom: `1px solid ${PALETTE.panelBorder}`,
      }}>
        <button onClick={onOpenStatus} className="w-9 h-9 flex items-center justify-center text-base font-bold" style={{
          background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.derod}`,
        }}>{classData.name[0]}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>HP</span>
            <div className="flex-1 h-1.5 relative" style={{ background: PALETTE.bgDeep, border: `1px solid ${PALETTE.panelBorder}` }}>
              <div className="absolute inset-y-0 left-0 transition-all" style={{
                width: `${(hp/maxHp)*100}%`,
                background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.accent})`,
              }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: PALETTE.text }}>{hp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: chapter.color }}>CH.{chapter.id}</span>
            <span className="text-[10px] flex-1" style={{ color: PALETTE.text }}>{chapter.name}</span>
          </div>
        </div>
        <div className="flex flex-col items-end text-[10px] gap-0.5">
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.ice }}>◆</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gem}</span></div>
          <div className="flex items-center gap-1"><span style={{ color: PALETTE.derod }}>◉</span><span className="tabular-nums" style={{ color: PALETTE.text }}>{gold}</span></div>
        </div>
      </div>
      <div className="text-center py-2 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="text-[9px] tracking-[0.4em]" style={{ color: chapter.color }}>{chapter.sub}</div>
        <div className="text-sm font-bold tracking-[0.2em]" style={{
          color: PALETTE.text, textShadow: `0 0 10px ${chapter.color}50`,
        }}>{chapter.name}</div>
      </div>
      <div className="flex-1 relative overflow-hidden" style={{
        background: `radial-gradient(ellipse at center top, ${chapter.color}15 0%, ${PALETTE.bgDeep} 70%)`,
      }}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {mapData.edges.map(([a, b], i) => {
            const na = mapData.nodes.find(n => n.id === a);
            const nb = mapData.nodes.find(n => n.id === b);
            if (!na || !nb) return null;
            const reachable = na.completed || na.current;
            const eitherLocked = na.locked || nb.locked;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={
                  eitherLocked ? '#2a1515'
                  : na.completed && nb.completed ? PALETTE.derod 
                  : reachable ? chapter.color 
                  : PALETTE.panelBorder
                }
                strokeWidth="0.3"
                strokeDasharray={na.completed && nb.completed ? "0" : "1.5 1"}
                opacity={eitherLocked ? 0.2 : reachable ? 0.6 : 0.3} />
            );
          })}
        </svg>
        {mapData.nodes.map(n => {
          const cfg = NODE_TYPES[n.type];
          const Icon = cfg.icon;
          const isCurrent = n.current;
          const isCompleted = n.completed;
          const isLocked = n.locked;  // 선택 안 한 형제 노드
          const isBoss = n.type === 'boss';
          const size = isBoss ? 48 : isCurrent ? 38 : 30;
          return (
            <button key={n.id} onClick={() => isCurrent && onEnterNode(n)} disabled={!isCurrent}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${size}px`, height: `${size}px` }}>
              {isCurrent && (
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: cfg.color, opacity: 0.4 }} />
              )}
              <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{
                background: isCompleted
                  ? `radial-gradient(circle, ${PALETTE.derod}30, ${PALETTE.bgDeep})`
                  : isCurrent
                    ? `radial-gradient(circle, ${cfg.color}40, ${PALETTE.bgDeep})`
                    : isLocked
                      ? `radial-gradient(circle, ${PALETTE.bgDeep}, #1a0a0a)`
                      : `radial-gradient(circle, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
                border: `${isBoss ? 2 : 1.5}px solid ${
                  isCompleted ? PALETTE.derod 
                  : isCurrent ? cfg.color 
                  : isLocked ? '#3a1f1f' 
                  : PALETTE.panelBorder
                }`,
                boxShadow: isCurrent ? `0 0 24px ${cfg.color}80` : isBoss ? `0 0 16px ${PALETTE.accent}60` : 'none',
                opacity: isLocked ? 0.4 : 1,
              }}>
                {isLocked
                  ? <X size={isBoss ? 18 : 14} style={{ color: '#5a3030' }} />
                  : !isCurrent && !isCompleted && !isBoss
                    ? <span className="text-base" style={{ color: PALETTE.textDim }}>?</span>
                    : <Icon size={isBoss ? 22 : isCurrent ? 18 : 14} style={{ color: isCompleted ? PALETTE.derod : cfg.color }} />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 border-t" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        <button onClick={onBack} className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>나가기</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>기록</button>
        <button onClick={onOpenStatus} className="py-2.5 text-[10px]" style={{ color: PALETTE.derod }}>스킬</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>도감</button>
        <button className="py-2.5 text-[10px]" style={{ color: PALETTE.textDim }}>설정</button>
      </div>
    </div>
  );
}

// =========== 전투 화면 ===========
function CombatScreen({ classData, initialPlayer, initialSkills, enemyKey, isBoss, onVictory, onDefeat }) {
  const [player, setPlayer] = useState(() => ({
    ...initialPlayer, defense: 0, buffs: {}, debuffs: {}, cooldowns: {},
    ether: 3, maxEther: 3, firstHitImmune: false, revivedThisCombat: false,
  }));
  const [enemy, setEnemy] = useState(() => {
    const e = ENEMIES[enemyKey];
    return { ...e, key: enemyKey, currentHp: e.hp, maxHp: e.hp, defense: 0, debuffs: {}, nextIntent: null };
  });
  const [skills] = useState(initialSkills);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState('intro');
  const [log, setLog] = useState([]);
  const [animDmg, setAnimDmg] = useState({ player: null, enemy: null });
  const logEndRef = useRef(null);
  // 동기적 액션 락: setPhase는 비동기라 빠른 연타 시 race condition 발생.
  // 이 ref로 클릭 즉시 잠그고, 적 턴 종료 후 해제한다.
  const actionLockRef = useRef(false);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  useEffect(() => {
    const initialLog = [{ type: 'narrative', text: `━━ ${enemy.name}이(가) 나타났다 ━━` },
      { type: 'narrative', text: `「${enemy.desc}」` }];
    let newPlayer = { ...player };
    
    // 신앙 minor: 모든 능력치 +1/Lv (전투 동안만)
    const allStatsBonus = getMinorBonus(skills, 'allStats+');
    if (allStatsBonus > 0) {
      newPlayer.근력 = (newPlayer.근력 || 10) + allStatsBonus;
      newPlayer.민첩 = (newPlayer.민첩 || 10) + allStatsBonus;
      newPlayer.지능 = (newPlayer.지능 || 10) + allStatsBonus;
      newPlayer.매력 = (newPlayer.매력 || 10) + allStatsBonus;
      initialLog.push({ type: 'passive', text: `◆ [신앙 누적] 모든 능력치 +${allStatsBonus}` });
    }
    
    // 수비 minor: 시작 방어 +5/Lv
    const minorDef = getMinorBonus(skills, 'startDef+');
    if (minorDef > 0) {
      newPlayer.defense += minorDef;
      initialLog.push({ type: 'passive', text: `◆ [수비 누적] 시작 방어 +${minorDef}` });
    }
    if (hasEffect(skills, 'startDefense+20')) {
      newPlayer.defense += 20;
      initialLog.push({ type: 'passive', text: `◆ [수비 Lv.3] 시작 방어 +20` });
    }
    if (hasEffect(skills, 'heal20%')) {
      const heal = Math.floor(newPlayer.maxHp * 0.2);
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
      initialLog.push({ type: 'passive', text: `◆ [재생 Lv.5] HP ${heal} 회복` });
    }
    if (hasEffect(skills, 'firstHitImmune')) {
      newPlayer.firstHitImmune = true;
      initialLog.push({ type: 'passive', text: `◆ [회피 Lv.7] 첫 피격 무효 활성` });
    }
    setPlayer(newPlayer);
    setLog(initialLog);
    setTimeout(() => {
      const patterns = enemy.patterns;
      setEnemy(e => ({ ...e, nextIntent: patterns[Math.floor(Math.random() * patterns.length)] }));
      setPhase('playerTurn');
    }, 1500);
  }, []);

  const handlePlayerAction = (skillKey) => {
    if (phase !== 'playerTurn') return;
    if (actionLockRef.current) return;  // 동기 락 체크 - 처리 중이면 무시
    const skill = COMBAT_SKILLS[skillKey];
    if (!skill) return;
    if (player.cooldowns[skillKey] > 0) return;
    let etherCost = skill.cost || 0;
    if (etherCost > 0 && hasEffect(skills, 'etherCost-20')) etherCost = Math.max(0, etherCost - 1);
    if (etherCost > player.ether) return;

    // 모든 검증 통과 → 락 획득
    actionLockRef.current = true;

    const newLog = [...log, { type: 'player', text: `▸ ${skill.name}` }];
    let newPlayer = { ...player, ether: player.ether - etherCost };
    let newEnemy = { ...enemy };

    if (skill.selfDmg) {
      newPlayer.hp = Math.max(1, newPlayer.hp - skill.selfDmg);
      newLog.push({ type: 'system', text: `· 자신 HP -${skill.selfDmg}` });
    }

    if (skill.type === 'physical' || skill.type === 'magic') {
      const hitCount = skill.hitCount || 1;
      let totalDmg = 0;
      let usedGuaranteedCrit = false;
      for (let i = 0; i < hitCount; i++) {
        let isCrit = rollCrit(skills, newPlayer);
        // 신앙 Lv.3: 다음 공격 치명타 확정 (한 번 사용)
        if (!usedGuaranteedCrit && newPlayer.buffs?.guaranteedCrit > 0) {
          isCrit = true;
          usedGuaranteedCrit = true;
          newPlayer.buffs = { ...newPlayer.buffs, guaranteedCrit: 0 };
          newLog.push({ type: 'passive', text: `◆ [신앙 Lv.3] 치명타 확정 발동` });
        }
        const dmgResult = calculateDamage(skill, newPlayer, newEnemy, skills, isCrit);
        let actualDmg = dmgResult.finalDmg;
        if (newEnemy.defense > 0 && !skill.pierce && skill.type !== 'magic') {
          newEnemy.defense = Math.max(0, newEnemy.defense - dmgResult.defenseMitigated);
        }
        newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg);
        totalDmg += actualDmg;
        newLog.push({
          type: 'damage',
          text: `· ${enemy.name}에게 ${actualDmg} 데미지${isCrit ? ' [치명타!]' : ''}${hitCount > 1 ? ` (${i+1}/${hitCount})` : ''}`,
          breakdown: dmgResult.breakdown.join(' / '),
        });
        if (newEnemy.currentHp <= 0) break;
      }
      setAnimDmg({ player: null, enemy: totalDmg });
      setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);

      const attackPassives = getActivePassives(skills, 'onAttack');
      attackPassives.forEach(p => {
        if (p.effect === 'applyShockGauge') {
          // 충격 게이지 시스템: Lv.3 = 30, Lv.5 이상 = 40
          let gaugeAdd = GAME_CONFIG.shockGaugeBase;
          if (hasEffect(skills, 'shockBonus')) gaugeAdd = GAME_CONFIG.shockGaugeBase + GAME_CONFIG.shockGaugeBonus;
          
          // 충격 저항 디버프가 있으면 누적량 감소
          if (newEnemy.debuffs?.shockResist > 0) {
            gaugeAdd = Math.floor(gaugeAdd * GAME_CONFIG.shockResistReduction);
          }
          
          const currentGauge = newEnemy.debuffs?.shockGauge || 0;
          let newGauge = currentGauge + gaugeAdd;
          
          if (newGauge >= 100) {
            // 기절 발동
            const stunMsg = `◆ [${p.skillName} Lv.${p.tierLv}] 충격 게이지 ${currentGauge}+${gaugeAdd}=100! 기절!`;
            newLog.push({ type: 'debuff', text: stunMsg });
            newEnemy.debuffs = { 
              ...newEnemy.debuffs, 
              stunned: 1,
              shockGauge: 0,
              shockResist: GAME_CONFIG.shockResistTurns,
              shockResistTurns: GAME_CONFIG.shockResistTurns,
            };
            
            // 강타 Lv.5: 기절 시 추가 데미지
            if (hasEffect(skills, 'shockBonus')) {
              const bonusDmg = 15;
              newEnemy.currentHp = Math.max(0, newEnemy.currentHp - bonusDmg);
              newLog.push({ type: 'damage', text: `· [강타 Lv.5] 기절 추가 데미지 ${bonusDmg}` });
            }
          } else {
            newEnemy.debuffs = { ...newEnemy.debuffs, shockGauge: newGauge };
            newLog.push({ type: 'debuff', text: `◆ [${p.skillName} Lv.${p.tierLv}] 충격 ${currentGauge}→${newGauge}` });
          }
        }
        if (p.effect === 'applyBleed') {
          const stacks = (newEnemy.debuffs?.bleed || 0);
          const newStacks = hasEffect(skills, 'bleedStack') ? Math.min(stacks + 1, 5) : 1;
          newEnemy.debuffs = { ...newEnemy.debuffs, bleed: newStacks, bleedTurns: 3 };
          newLog.push({ type: 'debuff', text: `◆ [${p.skillName} Lv.${p.tierLv}] 출혈 ${newStacks}중첩` });
        }
        if (p.effect === 'execute') {
          if (newEnemy.currentHp > 0 && newEnemy.currentHp <= newEnemy.maxHp * 0.2 && Math.random() < 0.15) {
            newLog.push({ type: 'system', text: `◆ [잔혹 Lv.7] 즉사 발동!` });
            newEnemy.currentHp = 0;
          }
        }
      });
      if (skill.forceBleed) {
        newEnemy.debuffs = { ...newEnemy.debuffs, bleed: (newEnemy.debuffs?.bleed || 0) + 1, bleedTurns: 3 };
        newLog.push({ type: 'debuff', text: `· 출혈 부여` });
      }
    }

    if (skill.type === 'defense') {
      newPlayer.defense += skill.defense;
      newLog.push({ type: 'system', text: `· 방어 +${skill.defense}` });
      if (skill.dodgeBuff) {
        newPlayer.buffs = { ...newPlayer.buffs, dodgeBuff: skill.dodgeBuff, dodgeBuffTurns: 1 };
      }
    }
    if (skill.type === 'buff' && skill.buff === 'rage') {
      newPlayer.buffs = { ...newPlayer.buffs, rage: 3 };
      newLog.push({ type: 'system', text: `· 분노 발동! 3턴간 데미지 +30%` });
    }
    if (skill.cd > 0) {
      // 가속 minor: 쿨다운 -1턴 (Lv.4마다 누적)
      const cdReduce = Math.floor(getMinorBonus(skills, 'cdReduce+') / 4);
      const finalCd = Math.max(0, skill.cd - cdReduce);
      if (finalCd > 0) newPlayer.cooldowns = { ...newPlayer.cooldowns, [skillKey]: finalCd };
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setLog(newLog);

    if (newEnemy.currentHp <= 0) {
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'victory', text: `━━ ${enemy.name} 처치 ━━` }]);
        setPhase('victory');
        actionLockRef.current = false;  // 전투 종료 - 락 해제 (정리 차원)
      }, 800);
      return;
    }
    // 즉시 phase 전환으로 버튼 그룹 숨김 (시각적 즉각 피드백)
    setPhase('enemyTurn');
    setTimeout(() => { executeEnemyTurn(newPlayer, newEnemy, newLog); }, 1000);
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
      setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 1200);
      return;
    }

    const intent = curEnemy.nextIntent;
    if (!intent) { setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 800); return; }
    newLog.push({ type: 'enemy', text: `◂ ${enemy.name}: ${intent.name}` });

    if (intent.type === 'attack') {
      const dodged = rollDodge(skills, newPlayer);
      if (dodged) {
        newLog.push({ type: 'system', text: `· 회피 성공!` });
        if (hasEffect(skills, 'counterAttack') && Math.random() < 0.5) {
          const counterDmg = Math.floor(15 + Math.random() * 10);
          newEnemy.currentHp = Math.max(0, newEnemy.currentHp - counterDmg);
          newLog.push({ type: 'damage', text: `◆ [회피 Lv.5] 반격 ${counterDmg} 데미지` });
        }
      } else {
        if (newPlayer.firstHitImmune) {
          newLog.push({ type: 'passive', text: `◆ [회피 Lv.7] 첫 피격 무효!` });
          newPlayer.firstHitImmune = false;
        } else {
          let dmg = Math.floor(intent.dmg[0] + Math.random() * (intent.dmg[1] - intent.dmg[0]));
          // 수비 Lv.7: 방어 게이지가 최대 HP의 50% 이상이면 받는 데미지 50% 차단
          if (hasEffect(skills, 'fortify') && newPlayer.defense >= newPlayer.maxHp * 0.5) {
            const blocked = Math.floor(dmg * 0.5);
            dmg -= blocked;
            if (blocked > 0) newLog.push({ type: 'passive', text: `◆ [수비 Lv.7] 요새화! 데미지 -${blocked}` });
          }
          if (newPlayer.defense > 0) {
            const absorbed = Math.min(newPlayer.defense, dmg);
            newPlayer.defense -= absorbed;
            dmg -= absorbed;
            if (absorbed > 0) newLog.push({ type: 'system', text: `· 방어 ${absorbed} 흡수` });
          }
          if (hasEffect(skills, 'dmgTaken-15') && dmg > 0) {
            const reduced = Math.floor(dmg * 0.15);
            dmg -= reduced;
            if (reduced > 0) newLog.push({ type: 'passive', text: `◆ [수비 Lv.5] 데미지 -${reduced}` });
          }
          if (dmg > 0) {
            if (newPlayer.hp - dmg <= 0) {
              if (hasEffect(skills, 'divineSave') && Math.random() < 0.3) {
                newLog.push({ type: 'passive', text: `◆ [신앙 Lv.5] 신의 가호!` });
                dmg = newPlayer.hp - 1;
              } else if (hasEffect(skills, 'revive') && !newPlayer.revivedThisCombat) {
                newPlayer.hp = Math.floor(newPlayer.maxHp * 0.5);
                newPlayer.revivedThisCombat = true;
                newLog.push({ type: 'passive', text: `◆ [재생 Lv.7] 부활!` });
                dmg = 0;
              }
            }
            if (dmg > 0) {
              newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
              newLog.push({ type: 'damageTaken', text: `· ${dmg} 데미지` });
              setAnimDmg({ player: dmg, enemy: null });
              setTimeout(() => setAnimDmg({ player: null, enemy: null }), 800);
            }
          }
        }
      }
    } else if (intent.type === 'defend') {
      newEnemy.defense += intent.defense;
      newLog.push({ type: 'system', text: `· 방어 자세 (+${intent.defense})` });
    }

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog);
    if (newPlayer.hp <= 0) {
      setTimeout(() => { 
        setLog(prev => [...prev, { type: 'defeat', text: `━━ 패배 ━━` }]); 
        setPhase('defeat'); 
        actionLockRef.current = false;  // 전투 종료 - 락 해제
      }, 800);
      return;
    }
    setTimeout(() => endTurn(newPlayer, newEnemy, newLog), 1200);
  };

  const endTurn = (curPlayer, curEnemy, curLog) => {
    const newLog = [...curLog];
    let newPlayer = { ...curPlayer };
    let newEnemy = { ...curEnemy };
    const newTurn = turn + 1;

    if (newEnemy.debuffs?.bleed > 0 && newEnemy.debuffs?.bleedTurns > 0) {
      // 잔혹 minor: 출혈 1스택당 데미지 +1/Lv
      const bleedBonus = getMinorBonus(skills, 'bleedDmg+');
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

    Object.keys(newPlayer.cooldowns).forEach(k => {
      if (newPlayer.cooldowns[k] > 0) newPlayer.cooldowns[k]--;
    });
    if (newPlayer.buffs?.rage > 0) {
      newPlayer.buffs.rage--;
      if (newPlayer.buffs.rage === 0) newLog.push({ type: 'system', text: `· 분노 종료` });
    }
    if (newPlayer.buffs?.dodgeBuffTurns > 0) {
      newPlayer.buffs.dodgeBuffTurns--;
      if (newPlayer.buffs.dodgeBuffTurns === 0) newPlayer.buffs.dodgeBuff = 0;
    }
    newPlayer.ether = Math.min(newPlayer.maxEther, newPlayer.ether + 1);

    let extraTurnTriggered = false;
    let bestExtraTurnInterval = Infinity;
    let guaranteedCrit = false;
    getActivePassives(skills, 'onTurnStart').forEach(p => {
      if (p.effect === 'regenPerTurn') {
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + 3);
        newLog.push({ type: 'passive', text: `◆ [재생 Lv.3] HP +3` });
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
    newPlayer.defense = Math.floor(newPlayer.defense * 0.5);
    newEnemy.defense = Math.floor(newEnemy.defense * 0.5);

    setPlayer(newPlayer); setEnemy(newEnemy); setLog(newLog); setTurn(newTurn);

    if (extraTurnTriggered) {
      setTimeout(() => {
        setLog(prev => [...prev, { type: 'passive', text: `◆ [가속] 추가 턴!` }]);
        setPhase('playerTurn');
        actionLockRef.current = false;  // 플레이어 턴 시작 → 락 해제
      }, 1000);
    } else {
      setTimeout(() => {
        setPhase('playerTurn');
        actionLockRef.current = false;  // 플레이어 턴 시작 → 락 해제
      }, 800);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.accent }}>━━ 전투 ━━</span>
        <span className="text-[10px] tabular-nums" style={{ color: PALETTE.derod }}>TURN {turn}</span>
      </div>
      <div className="px-3 py-2.5" style={{
        background: `linear-gradient(180deg, ${enemy.color}25, transparent)`,
        borderBottom: `1px solid ${enemy.color}40`,
      }}>
        <div className="flex justify-between items-center mb-1">
          <div>
            <span className="text-xs font-bold" style={{ color: enemy.color }}>{enemy.name}</span>
            {enemy.isBoss && <span className="ml-1 text-[9px] px-1" style={{ background: PALETTE.legendary, color: PALETTE.bgDeep }}>BOSS</span>}
          </div>
          <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>
            {enemy.currentHp}/{enemy.maxHp}
            {animDmg.enemy && <span className="ml-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.enemy}</span>}
          </span>
        </div>
        <div className="h-1.5 relative mb-1.5" style={{ background: PALETTE.bgDeep }}>
          <div className="absolute inset-y-0 left-0 transition-all" style={{
            width: `${(enemy.currentHp/enemy.maxHp)*100}%`,
            background: `linear-gradient(90deg, ${PALETTE.blood}, ${enemy.color})`,
          }} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {enemy.defense > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}30`, color: PALETTE.defense, border: `1px solid ${PALETTE.defense}60` }}>
              ◈ 방어 {enemy.defense}
            </span>
          )}
          {enemy.debuffs?.bleed > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.bleed}30`, color: PALETTE.bleed, border: `1px solid ${PALETTE.bleed}60` }}>
              ◆ 출혈 {enemy.debuffs.bleed} ({enemy.debuffs.bleedTurns}T)
            </span>
          )}
          {enemy.debuffs?.shockGauge > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.shock}30`, color: PALETTE.shock, border: `1px solid ${PALETTE.shock}60` }}>
              ⚡ 충격 {enemy.debuffs.shockGauge}/100
            </span>
          )}
          {enemy.debuffs?.stunned > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}40`, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}` }}>
              ✦ 기절 1T
            </span>
          )}
          {enemy.debuffs?.shockResist > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.textDim}30`, color: PALETTE.textDim, border: `1px solid ${PALETTE.textDim}60` }}>
              ◇ 충격 저항 ({enemy.debuffs.shockResistTurns}T)
            </span>
          )}
        </div>
        {phase === 'playerTurn' && enemy.nextIntent && (
          <div className="mt-1.5 px-2 py-1 flex items-center gap-2" style={{
            background: PALETTE.bgDeep, border: `1px dashed ${enemy.color}80`,
          }}>
            <AlertTriangle size={10} style={{ color: enemy.color }} />
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>다음 행동:</span>
            <span className="text-[10px] font-bold" style={{ color: PALETTE.text }}>{enemy.nextIntent.name}</span>
            {enemy.nextIntent.dmg[1] > 0 && (
              <span className="text-[10px] tabular-nums ml-auto" style={{ color: enemy.nextIntent.heavy ? PALETTE.accent : PALETTE.textDim }}>
                {enemy.nextIntent.dmg[0]}-{enemy.nextIntent.dmg[1]}
              </span>
            )}
            {enemy.nextIntent.type === 'defend' && (
              <span className="text-[10px] ml-auto" style={{ color: PALETTE.defense }}>방어</span>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{
        background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)`,
      }}>
        {log.map((entry, i) => (
          <div key={i} className="text-[11px] leading-relaxed" style={{
            color: entry.type === 'narrative' ? PALETTE.text
              : entry.type === 'player' ? PALETTE.green
              : entry.type === 'enemy' ? PALETTE.accent
              : entry.type === 'damageTaken' ? PALETTE.accent
              : entry.type === 'system' ? PALETTE.textDim
              : entry.type === 'passive' ? PALETTE.derod
              : entry.type === 'debuff' ? PALETTE.bleed
              : entry.type === 'victory' ? PALETTE.legendary
              : entry.type === 'defeat' ? PALETTE.accent
              : PALETTE.text,
            fontStyle: entry.type === 'narrative' ? 'italic' : 'normal',
            paddingLeft: ['damage', 'damageTaken', 'system', 'passive', 'debuff'].includes(entry.type) ? '12px' : '0',
          }}>
            {entry.text}
            {entry.breakdown && (
              <span className="block text-[9px] opacity-60" style={{ paddingLeft: '12px' }}>({entry.breakdown})</span>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <div className="px-3 py-2 border-t" style={{ borderColor: PALETTE.panelBorder, background: `${classData.color}10` }}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold" style={{ color: classData.color }}>{classData.name}</span>
          <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>
            {animDmg.player && <span className="mr-1 animate-pulse" style={{ color: PALETTE.accent }}>-{animDmg.player}</span>}
            {player.hp}/{player.maxHp}
          </span>
        </div>
        <div className="h-1.5 relative mb-1.5" style={{ background: PALETTE.bgDeep }}>
          <div className="absolute inset-y-0 left-0 transition-all" style={{
            width: `${(player.hp/player.maxHp)*100}%`,
            background: `linear-gradient(90deg, ${PALETTE.blood}, ${PALETTE.green})`,
          }} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.deblan}30`, color: PALETTE.deblan, border: `1px solid ${PALETTE.deblan}60` }}>
            ✦ 에테르 {player.ether}/{player.maxEther}
          </span>
          {player.defense > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.defense}30`, color: PALETTE.defense, border: `1px solid ${PALETTE.defense}60` }}>
              ◈ 방어 {player.defense}
            </span>
          )}
          {player.buffs?.rage > 0 && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.accent}30`, color: PALETTE.accent, border: `1px solid ${PALETTE.accent}60` }}>
              ☩ 분노 ({player.buffs.rage}T)
            </span>
          )}
          {player.firstHitImmune && (
            <span className="text-[9px] px-1.5 py-0.5" style={{ background: `${PALETTE.legendary}30`, color: PALETTE.legendary, border: `1px solid ${PALETTE.legendary}60` }}>
              ✦ 무적 1회
            </span>
          )}
        </div>
      </div>
      <div className="border-t p-2.5" style={{
        borderColor: PALETTE.panelBorder, background: `linear-gradient(180deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
      }}>
        {phase === 'intro' && <div className="text-center text-[11px] py-2" style={{ color: PALETTE.textDim }}>전투 준비 중...</div>}
        {phase === 'enemyTurn' && <div className="text-center text-[11px] py-2" style={{ color: PALETTE.accent }}>◂ 적의 턴 ◂</div>}
        {phase === 'playerTurn' && (
          <div className="grid grid-cols-3 gap-1.5">
            {classData.combatSkills.map(skillKey => {
              const skill = COMBAT_SKILLS[skillKey];
              if (!skill) return null;
              const onCd = (player.cooldowns[skillKey] || 0) > 0;
              let cost = skill.cost || 0;
              if (cost > 0 && hasEffect(skills, 'etherCost-20')) cost = Math.max(0, cost - 1);
              const noEther = cost > player.ether;
              const disabled = onCd || noEther;
              return (
                <button key={skillKey} onClick={() => handlePlayerAction(skillKey)} disabled={disabled}
                  className="py-2 transition-all flex flex-col items-center gap-0.5"
                  style={{
                    background: disabled ? PALETTE.bgDeep
                      : skill.type === 'physical' ? `${PALETTE.accent}20`
                      : skill.type === 'magic' ? `${PALETTE.deblan}20`
                      : skill.type === 'defense' ? `${PALETTE.ice}20`
                      : `${PALETTE.derod}20`,
                    border: `1px solid ${disabled ? PALETTE.panelBorder : skill.type === 'physical' ? PALETTE.accent : skill.type === 'magic' ? PALETTE.deblan : skill.type === 'defense' ? PALETTE.ice : PALETTE.derod}`,
                    color: disabled ? PALETTE.textDim : PALETTE.text,
                    opacity: disabled ? 0.5 : 1,
                  }}>
                  <span className="text-[11px] font-bold">{skill.name}</span>
                  <span className="text-[9px]" style={{ color: PALETTE.textDim }}>
                    {skill.type === 'defense' ? `+${skill.defense}` : skill.type === 'buff' ? '버프' : `${skill.baseDmg[0]}-${skill.baseDmg[1]}`}
                    {cost > 0 && ` ✦${cost}`}
                  </span>
                  {onCd && <span className="text-[9px]" style={{ color: PALETTE.accent }}>CD {player.cooldowns[skillKey]}</span>}
                </button>
              );
            })}
          </div>
        )}
        {phase === 'victory' && (
          <button onClick={() => onVictory(player.hp, enemy.drop)}
            className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
              background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
              border: `1px solid ${PALETTE.legendary}`, color: PALETTE.text,
            }}>▸ 보상 획득</button>
        )}
        {phase === 'defeat' && (
          <button onClick={() => onDefeat()} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
            background: `linear-gradient(180deg, ${PALETTE.accent}40, ${PALETTE.accent}20)`,
            border: `1px solid ${PALETTE.accent}`, color: PALETTE.text,
          }}>▸ 메인 메뉴로</button>
        )}
      </div>
    </div>
  );
}

// =========== 보상 선택 ===========
function RewardSelect({ rewards: initialRewards, gem, skills, onPick, onReroll, hasRerolled, isElite }) {
  const [rewards, setRewards] = useState(initialRewards);
  // 운명 Lv.3: 리롤 비용 -1
  const rerollCost = hasEffect(skills, 'rerollDiscount') ? GAME_CONFIG.rerollDiscountCost : GAME_CONFIG.rerollCost;

  const handleReroll = () => {
    if (hasRerolled || gem < rerollCost) return;
    // 운명 Lv.5: 보상 4중1
    const count = hasEffect(skills, 'extraReward') ? 4 : 3;
    const newRewards = rollRewards(count, isElite);
    setRewards(newRewards);
    onReroll(newRewards, rerollCost);
  };

  const renderReward = (r, idx) => {
    let title, desc, color, icon, currentLv, nextLv;
    if (r.type === 'skill') {
      const sk = PASSIVE_SKILLS[r.name];
      currentLv = skills[r.name] || 0;
      nextLv = currentLv + 1;
      title = r.name;
      const tierKeys = Object.keys(sk.tiers).map(Number).sort();
      const nextTier = tierKeys.find(t => t > currentLv);
      // 다음 Lv이 마일스톤이면 마일스톤 효과를, 아니면 minor 효과를 보여줌
      if (nextTier && nextTier === nextLv) {
        desc = `★ ${sk.tiers[nextTier].text}`;
      } else if (sk.minorEffect) {
        desc = `${sk.minorEffect.desc}` + (nextTier ? ` (Lv.${nextTier}: ${sk.tiers[nextTier].text.substring(0, 20)}...)` : '');
      } else {
        desc = sk.desc;
      }
      color = sk.color; icon = '◈';
    } else if (r.type === 'stat') {
      title = `${r.name} +${r.value}`; desc = '영구 능력치 상승'; color = PALETTE.derod; icon = '↑';
    } else if (r.type === 'heal') {
      title = `회복 ${r.value}`; desc = '즉시 체력 회복'; color = PALETTE.green; icon = '+';
    } else if (r.type === 'heal_full') {
      title = '완전 회복'; desc = '최대 체력까지 회복'; color = PALETTE.legendary; icon = '+';
    } else if (r.type === 'relic') {
      title = r.name;
      desc = `유물 · ${Object.entries(r.skillBonus).map(([k, v]) => `${k} +${v}Lv`).join(', ')}`;
      color = r.color; icon = '◆';
    } else if (r.type === 'gold') {
      title = `은화 +${r.value}`; desc = '상점에서 사용'; color = PALETTE.derod; icon = '◉';
    } else if (r.type === 'gem') {
      title = `보석 +${r.value}`; desc = '리롤·부활에 사용'; color = PALETTE.ice; icon = '◆';
    }

    return (
      <button key={idx} onClick={() => onPick(r)}
        className="w-full text-left relative overflow-hidden transition-all hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${color}30, ${PALETTE.bgDeep})`,
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 20px ${color}30`,
        }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{
            background: `${color}20`, border: `1px solid ${color}80`,
            color, fontSize: '24px', fontWeight: 'bold',
          }}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: PALETTE.text }}>{title}</span>
              {r.type === 'skill' && (
                <span className="text-[10px] px-1.5 py-0.5" style={{
                  background: `${color}30`, color, border: `1px solid ${color}80`,
                }}>Lv.{currentLv} → Lv.{nextLv}</span>
              )}
            </div>
            <p className="text-[11px] leading-snug" style={{ color: PALETTE.textDim }}>{desc}</p>
          </div>
          <ChevronRight size={14} style={{ color, flexShrink: 0 }} />
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{
      background: `radial-gradient(ellipse at center, ${PALETTE.panel}, ${PALETTE.bgDeep} 80%)`,
    }}>
      <div className="px-4 py-4 border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <p className="text-center text-[10px] tracking-[0.4em] mb-1" style={{ color: PALETTE.derod }}>◆ 운명의 갈림길 ◆</p>
        <p className="text-center text-base font-bold" style={{ color: PALETTE.text }}>하나의 길을 선택하라</p>
        <p className="text-center text-[11px] mt-1" style={{ color: PALETTE.textDim }}>
          {isElite ? '◆ 강적 보상 ◆' : '세 갈래 중 단 하나만 가질 수 있다'}
        </p>
      </div>
      <div className="flex-1 px-4 py-4 space-y-2.5 overflow-y-auto">
        {rewards.map((r, i) => renderReward(r, i))}
      </div>
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        {hasRerolled ? (
          <div className="text-center text-[11px] py-2" style={{ color: PALETTE.textDim }}>
            ◇ 운명은 한 번만 다시 짜여질 수 있다 ◇
          </div>
        ) : (
          <button onClick={handleReroll} disabled={gem < rerollCost}
            className="w-full py-2.5 flex items-center justify-center gap-2 transition-all"
            style={{
              background: gem >= rerollCost ? `${PALETTE.ice}20` : 'transparent',
              border: `1px solid ${gem >= rerollCost ? PALETTE.ice : PALETTE.panelBorder}`,
              color: gem >= rerollCost ? PALETTE.text : PALETTE.textDim,
              opacity: gem >= rerollCost ? 1 : 0.5,
            }}>
            <RefreshCw size={14} />
            <span className="text-xs tracking-[0.2em]">선택지 재배치</span>
            <span className="text-[10px]" style={{ color: PALETTE.ice }}>◆ {rerollCost}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// =========== 사건 화면 ===========
function EventScreen({ event, classData, stats, onResolve }) {
  const [stage, setStage] = useState('intro'); // intro | result
  const [resultData, setResultData] = useState(null);

  const handleChoice = (choice) => {
    let result = { text: '', reward: null, penalty: null };
    if (choice.cost) {
      result.text = `${choice.text} 선택...`;
      result.reward = choice.reward;
    } else if (choice.stat) {
      const statValue = stats[choice.stat] || 10;
      const diceMin = GAME_CONFIG.diceRoll.min;
      const diceMax = GAME_CONFIG.diceRoll.max;
      const dice = diceMin + Math.floor(Math.random() * (diceMax - diceMin + 1));
      const total = statValue + dice;
      const success = total >= choice.dc;
      const rollText = `[${choice.stat} 검정] ${statValue} + ${dice}(주사위) = ${total} vs DC ${choice.dc}`;
      if (success) {
        result.text = `${rollText} ... 성공!\n${choice.success.text}`;
        result.reward = choice.success.reward;
      } else {
        result.text = `${rollText} ... 실패\n${choice.fail.text}`;
        result.penalty = choice.fail.penalty;
        result.combat = choice.fail.combat;
      }
    } else {
      result.text = choice.result || choice.text;
      result.reward = choice.reward;
    }
    setResultData(result);
    setStage('result');
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{
        borderColor: PALETTE.panelBorder, background: PALETTE.panel,
      }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.ice }}>◆ 사건 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>{event.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{
        background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)`,
      }}>
        {stage === 'intro' && (
          <div>
            <p className="text-sm leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
              {event.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </p>
          </div>
        )}
        {stage === 'result' && resultData && (
          <div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: PALETTE.text }}>
              {resultData.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </p>
            {resultData.reward && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.derod}60`, background: `${PALETTE.derod}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.derod }}>◆ 보상</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {resultData.reward.type === 'gold' && `은화 +${resultData.reward.value}`}
                  {resultData.reward.type === 'heal' && `체력 ${resultData.reward.value} 회복`}
                  {resultData.reward.type === 'random_relic' && '랜덤 유물 1개'}
                  {resultData.reward.type === 'skill_random_lv' && '랜덤 패시브 +1Lv'}
                </div>
              </div>
            )}
            {resultData.penalty && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}60`, background: `${PALETTE.accent}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 페널티</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {resultData.penalty.hp && `체력 ${resultData.penalty.hp}`}
                </div>
              </div>
            )}
            {resultData.combat && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}`, background: `${PALETTE.accent}20` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 전투 발생</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>{ENEMIES[resultData.combat].name}이(가) 나타난다!</div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t p-3" style={{
        borderColor: PALETTE.panelBorder, background: `linear-gradient(180deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
      }}>
        {stage === 'intro' && (
          <div className="space-y-1.5">
            {event.choices.map((c, i) => (
              <button key={i} onClick={() => handleChoice(c)}
                className="w-full text-left px-3 py-2 text-xs transition-all hover:translate-x-1"
                style={{
                  background: c.stat ? `${PALETTE.ice}10` : c.cost ? `${PALETTE.derod}10` : 'transparent',
                  border: `1px solid ${c.stat ? PALETTE.ice : c.cost ? PALETTE.derod : PALETTE.panelBorder}40`,
                  color: PALETTE.text,
                }}>
                <div className="flex items-center justify-between">
                  <span>▸ {c.text}</span>
                  {c.stat && <span className="text-[10px]" style={{ color: PALETTE.ice }}>[{c.stat} DC{c.dc}]</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        {stage === 'result' && (
          <button onClick={() => onResolve(resultData)} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
            background: `linear-gradient(180deg, ${PALETTE.derod}40, ${PALETTE.derod}20)`,
            border: `1px solid ${PALETTE.derod}`, color: PALETTE.text,
          }}>▸ 여정을 계속한다</button>
        )}
      </div>
    </div>
  );
}

// =========== 야영 화면 ===========
function RestScreen({ classData, hp, maxHp, skills, onChoice, onClose }) {
  const skillsToUpgrade = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.derod }}>◆ 야영 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>모닥불 앞에서</span>
      </div>
      <div className="flex-1 px-5 py-5 space-y-3 overflow-y-auto" style={{
        background: `radial-gradient(ellipse at center top, ${PALETTE.derod}15, ${PALETTE.bgDeep} 70%)`,
      }}>
        <p className="text-xs leading-relaxed italic mb-4" style={{ color: PALETTE.textDim }}>
          모닥불이 어둠을 밀어낸다. 잠시 휴식을 취하거나 무기를 점검할 시간.<br/>
          단 한 가지만 선택할 수 있다.
        </p>

        <button onClick={() => onChoice({ type: 'heal', value: Math.floor(maxHp * GAME_CONFIG.rest.healRatio) })}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{ background: `${PALETTE.green}20`, border: `1px solid ${PALETTE.green}` }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.green }}>◇ 휴식</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            최대 체력의 {Math.round(GAME_CONFIG.rest.healRatio * 100)}% 회복 (+{Math.floor(maxHp * GAME_CONFIG.rest.healRatio)})
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'upgrade_random' })}
          disabled={skillsToUpgrade.length === 0}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{
            background: skillsToUpgrade.length > 0 ? `${PALETTE.derod}20` : 'transparent',
            border: `1px solid ${skillsToUpgrade.length > 0 ? PALETTE.derod : PALETTE.panelBorder}`,
            opacity: skillsToUpgrade.length > 0 ? 1 : 0.5,
          }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.derod }}>◇ 수련</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {skillsToUpgrade.length > 0 ? `보유 패시브 中 1종 +1Lv` : '강화 가능한 패시브가 없다'}
          </div>
        </button>

        <button onClick={() => onChoice({ type: 'gem', value: GAME_CONFIG.rest.gemAmount })}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{ background: `${PALETTE.ice}20`, border: `1px solid ${PALETTE.ice}` }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.ice }}>◇ 명상</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>보석 +{GAME_CONFIG.rest.gemAmount} (리롤·부활용)</div>
        </button>

        <button onClick={() => onChoice({ type: 'maxhp', value: GAME_CONFIG.rest.maxhpAmount })}
          className="w-full text-left px-4 py-3 transition-all hover:translate-x-1"
          style={{ background: `${PALETTE.accent}20`, border: `1px solid ${PALETTE.accent}` }}>
          <div className="text-sm font-bold mb-0.5" style={{ color: PALETTE.accent }}>◇ 단련</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>최대 체력 +{GAME_CONFIG.rest.maxhpAmount} (영구)</div>
        </button>
      </div>
    </div>
  );
}

// =========== 상점 ===========
function ShopScreen({ gold, onBuy, onLeave }) {
  const [stock] = useState(() => rollRewards(4));
  const [bought, setBought] = useState(new Set());

  const getPrice = (r) => {
    if (r.type === 'skill') return SHOP_PRICES.skill;
    if (r.type === 'relic') return SHOP_PRICES.relic;
    if (r.type === 'stat') return SHOP_PRICES.stat;
    if (r.type === 'heal_full') return SHOP_PRICES.heal_full;
    if (r.type === 'heal') return r.value === 50 ? SHOP_PRICES.heal_50 : SHOP_PRICES.heal_100;
    return SHOP_PRICES.default;
  };

  const renderItem = (r, idx) => {
    const price = getPrice(r);
    const canAfford = gold >= price;
    const isBought = bought.has(idx);
    let title, color;
    if (r.type === 'skill') { title = `${r.name} +1Lv`; color = PASSIVE_SKILLS[r.name].color; }
    else if (r.type === 'stat') { title = `${r.name} +${r.value}`; color = PALETTE.derod; }
    else if (r.type === 'heal') { title = `회복 ${r.value}`; color = PALETTE.green; }
    else if (r.type === 'heal_full') { title = '완전 회복'; color = PALETTE.legendary; }
    else if (r.type === 'relic') { title = r.name; color = r.color; }
    else { title = `${r.type} +${r.value}`; color = PALETTE.derod; }

    return (
      <button key={idx} disabled={!canAfford || isBought}
        onClick={() => { onBuy(r, price); setBought(prev => new Set([...prev, idx])); }}
        className="w-full text-left px-3 py-2.5 transition-all"
        style={{
          background: isBought ? PALETTE.bgDeep : `${color}15`,
          border: `1px solid ${isBought ? PALETTE.panelBorder : color}`,
          opacity: isBought ? 0.4 : (canAfford ? 1 : 0.6),
        }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold" style={{ color: PALETTE.text }}>{title}</div>
            <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
              {isBought ? '구매 완료' : r.type === 'skill' ? PASSIVE_SKILLS[r.name].desc : ''}
            </div>
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: canAfford ? PALETTE.derod : PALETTE.accent }}>
            {isBought ? '✓' : `◉ ${price}`}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.deblan }}>◆ 상점 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>떠돌이 행상</span>
      </div>
      <div className="px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder, background: `${PALETTE.deblan}10` }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] italic" style={{ color: PALETTE.textDim }}>"운 좋은 날이군. 좋은 물건들이 있다네."</p>
          <span className="text-xs tabular-nums" style={{ color: PALETTE.derod }}>◉ {gold}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {stock.map((r, i) => renderItem(r, i))}
      </div>
      <div className="border-t p-3" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.bgDeep }}>
        <button onClick={onLeave} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
          background: 'transparent', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim,
        }}>▸ 떠난다</button>
      </div>
    </div>
  );
}

// =========== 챕터 클리어 ===========
function ChapterClearScreen({ chapter, isLastChapter, onContinue }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{
      background: `radial-gradient(ellipse at center, ${chapter.color}25, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: chapter.color }}>━━ CHAPTER CLEAR ━━</div>
        <h2 className="text-3xl font-bold mb-2" style={{
          color: PALETTE.text, fontFamily: '"Cinzel", serif',
          textShadow: `0 0 20px ${chapter.color}80`,
        }}>{chapter.name}</h2>
        <p className="text-xs italic mt-3" style={{ color: PALETTE.textDim }}>{chapter.sub}</p>
      </div>
      {isLastChapter ? (
        <>
          <p className="text-sm text-center leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
            "마왕 나크젤리온의 머리가 굴러떨어진다.<br/>
            긴 어둠이 끝났다.<br/>
            데로드와 데블랑이 비로소 균형을 되찾는다."
          </p>
          <div className="text-base font-bold tracking-[0.3em] mb-8" style={{ color: PALETTE.legendary }}>
            ━━ 진정한 엔딩 ━━
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-center leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
            "한 챕터의 어둠이 걷힌다.<br/>
            여정은 아직 끝나지 않았다."
          </p>
          <div className="text-[11px] mb-8" style={{ color: PALETTE.derod }}>◇ 체력 70% 회복 ◇</div>
        </>
      )}
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${chapter.color}40, ${chapter.color}20)`,
        border: `1px solid ${chapter.color}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>{isLastChapter ? '▸ 메인 메뉴' : '▸ 다음 챕터'}</button>
    </div>
  );
}

// =========== 상태창 ===========
function StatusPanel({ classData, hp, maxHp, skills, stats, relics, onClose }) {
  const skillsByAxis = { attack: [], defense: [], utility: [] };
  Object.entries(skills).forEach(([name, lv]) => {
    if (lv > 0 && PASSIVE_SKILLS[name]) {
      skillsByAxis[PASSIVE_SKILLS[name].axis].push({ name, lv, ...PASSIVE_SKILLS[name] });
    }
  });
  const axisNames = { attack: '공격', defense: '방어', utility: '유틸' };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        <span className="text-[11px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>◆ 캐릭터 정보 ◆</span>
        <button onClick={onClose}><X size={16} style={{ color: PALETTE.textDim }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b" style={{
          background: `linear-gradient(180deg, ${classData.color}20, transparent)`,
          borderColor: PALETTE.panelBorder,
        }}>
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 flex items-center justify-center text-2xl font-bold" style={{
              background: classData.color, color: PALETTE.bgDeep, border: `1px solid ${PALETTE.derod}`,
            }}>{classData.name[0]}</div>
            <div className="flex-1">
              <div className="text-[10px] tracking-[0.2em]" style={{ color: classData.color }}>{classData.sub}</div>
              <div className="text-base font-bold mb-1" style={{ color: PALETTE.text }}>{classData.name}</div>
              <div className="flex items-center gap-1">
                <Heart size={11} style={{ color: PALETTE.accent }} />
                <span className="text-[11px] tabular-nums" style={{ color: PALETTE.text }}>{hp}/{maxHp}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t" style={{ borderColor: `${classData.color}30` }}>
            {Object.entries(stats).filter(([k]) => ['근력', '민첩', '지능', '매력'].includes(k)).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="text-[9px]" style={{ color: PALETTE.textDim }}>{k}</div>
                <div className="text-sm font-bold" style={{ color: PALETTE.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.derod }}>◆ 패시브 스킬</div>
          {Object.entries(skillsByAxis).map(([axis, list]) => (
            list.length > 0 && (
              <div key={axis} className="mb-3">
                <div className="text-[10px] mb-1.5" style={{ color: PALETTE.textDim }}>{axisNames[axis]} 축</div>
                <div className="space-y-1.5">
                  {list.map(sk => {
                    const tierKeys = Object.keys(sk.tiers).map(Number).sort();
                    const activeTiers = tierKeys.filter(t => t <= sk.lv);
                    const nextTier = tierKeys.find(t => t > sk.lv);
                    return (
                      <div key={sk.name} className="px-3 py-2" style={{
                        background: `${sk.color}10`, border: `1px solid ${sk.color}40`,
                      }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: sk.color }}>{sk.name}</span>
                            <span className="text-[10px] px-1.5" style={{
                              background: `${sk.color}30`, color: sk.color,
                            }}>Lv.{sk.lv} / {sk.maxLv}</span>
                          </div>
                        </div>
                        <div className="h-1 mb-2" style={{ background: PALETTE.bgDeep }}>
                          <div className="h-full transition-all" style={{
                            width: `${(sk.lv / sk.maxLv) * 100}%`, background: sk.color,
                          }} />
                        </div>
                        {/* minorEffect 누적 표시 */}
                        {sk.minorEffect && (
                          <div className="text-[10px] flex items-start gap-1.5 mb-1" style={{ color: sk.color, opacity: 0.85 }}>
                            <span style={{ flexShrink: 0, marginTop: '0px' }}>◇</span>
                            <span>
                              {sk.minorEffect.desc} 
                              <span style={{ color: PALETTE.text, marginLeft: '4px', fontWeight: 'bold' }}>
                                (현재 +{sk.minorEffect.perLv * sk.lv})
                              </span>
                            </span>
                          </div>
                        )}
                        {activeTiers.length > 0 && (
                          <div className="space-y-0.5">
                            {activeTiers.map(t => (
                              <div key={t} className="text-[10px] flex items-start gap-1.5" style={{ color: PALETTE.text }}>
                                <Check size={9} style={{ color: sk.color, flexShrink: 0, marginTop: '2px' }} />
                                <span>Lv.{t}: {sk.tiers[t].text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {nextTier && (
                          <div className="text-[10px] flex items-start gap-1.5 mt-1" style={{ color: PALETTE.textDim }}>
                            <Lock size={9} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>Lv.{nextTier}: {sk.tiers[nextTier].text}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
        {relics.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
            <div className="text-[11px] tracking-[0.3em] mb-3" style={{ color: PALETTE.derod }}>◆ 보유 유물</div>
            <div className="space-y-1.5">
              {relics.map((r, i) => (
                <div key={i} className="px-3 py-2 flex items-center gap-2" style={{
                  background: `${r.color}10`, border: `1px solid ${r.color}40`,
                }}>
                  <span className="text-base" style={{ color: r.color }}>◆</span>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold" style={{ color: PALETTE.text }}>{r.name}</div>
                    <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
                      {Object.entries(r.skillBonus).map(([k, v]) => `${k} +${v}Lv`).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========== Main App - 통합 게임 루프 ===========
export default function App() {
  const [screen, setScreen] = useState('title');
  const [selectedClass, setSelectedClass] = useState(0);
  const [chapter, setChapter] = useState(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [mapData, setMapData] = useState(null);
  const [hp, setHp] = useState(GAME_CONFIG.startHp);
  const [maxHp, setMaxHp] = useState(GAME_CONFIG.startHp);
  const [gold, setGold] = useState(GAME_CONFIG.startGold);
  const [gem, setGem] = useState(GAME_CONFIG.startGem);
  const [unlockedChapter] = useState(4);

  const classData = CLASSES[selectedClass];
  const [skills, setSkills] = useState({});
  const [stats, setStats] = useState({});
  const [relics, setRelics] = useState([]);

  // 보상 시스템
  const [currentRewards, setCurrentRewards] = useState([]);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeNodeType, setActiveNodeType] = useState(null);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isEliteReward, setIsEliteReward] = useState(false);
  const [isBossReward, setIsBossReward] = useState(false);

  // 새로운 런 시작
  const initializeRun = (chapterData, idx = 0) => {
    if (idx === 0) {
      // 완전 새 런
      const baseSkills = { ...classData.startSkills };
      setSkills(baseSkills);
      setStats({ ...classData.stats });
      
      // 재생 minor: 최대 HP +8/Lv (시작 시 적용)
      const hpBonus = getMinorBonus(baseSkills, 'maxHp+');
      const startHp = GAME_CONFIG.startHp + hpBonus;
      setHp(startHp);
      setMaxHp(startHp);
      setRelics([]);
    } else {
      // 다음 챕터 (HP 70% 회복)
      setHp(prev => Math.min(maxHp, Math.floor(maxHp * GAME_CONFIG.chapterHealRatio)));
    }
    setHasRerolled(false);
    const map = generateChapterMap(chapterData);
    setMapData(map);
    setChapter(chapterData);
    setChapterIdx(idx);
    setScreen('map');
  };

  // 노드 진입 분기
  const handleEnterNode = (node) => {
    setActiveNodeId(node.id);
    let nodeType = node.type;
    
    // 미지 노드는 진입 시 랜덤 결정
    if (nodeType === 'unknown') {
      const types = ['battle', 'event', 'rest', 'shop'];
      nodeType = types[Math.floor(Math.random() * types.length)];
    }
    setActiveNodeType(nodeType);

    if (nodeType === 'battle') {
      const pool = chapter.enemies.normal;
      const enemyKey = pool[Math.floor(Math.random() * pool.length)];
      setCurrentEnemy(enemyKey);
      setIsEliteReward(false);
      setIsBossReward(false);
      setScreen('combat');
    } else if (nodeType === 'elite') {
      const pool = chapter.enemies.elite;
      const enemyKey = pool[Math.floor(Math.random() * pool.length)];
      setCurrentEnemy(enemyKey);
      setIsEliteReward(true);
      setIsBossReward(false);
      setScreen('combat');
    } else if (nodeType === 'boss') {
      setCurrentEnemy(chapter.enemies.boss);
      setIsBossReward(true);
      setIsEliteReward(false);
      setScreen('combat');
    } else if (nodeType === 'event') {
      // 현재 챕터에 적용 가능한 사건만 필터링
      const chapterId = chapter.id;
      const validEvents = EVENTS.filter(e => !e.chapter || e.chapter.includes(chapterId));
      const ev = validEvents.length > 0
        ? validEvents[Math.floor(Math.random() * validEvents.length)]
        : EVENTS[Math.floor(Math.random() * EVENTS.length)]; // 폴백
      setCurrentEvent(ev);
      setScreen('event');
    } else if (nodeType === 'shop') {
      setScreen('shop');
    } else if (nodeType === 'rest') {
      setScreen('rest');
    }
  };

  // 노드 완료 처리 (같은 레이어의 다른 노드 잠금 + 다음 레이어 활성화)
  const completeCurrentNode = () => {
    if (!mapData || activeNodeId === null) return;
    
    const currentNode = mapData.nodes.find(n => n.id === activeNodeId);
    if (!currentNode) return;
    const currentLayer = currentNode.layer;
    
    // 1. 현재 노드 = completed, 같은 레이어의 다른 current 노드들 = locked (선택 못 함)
    const newNodes = mapData.nodes.map(n => {
      if (n.id === activeNodeId) return { ...n, completed: true, current: false };
      if (n.layer === currentLayer && n.current) {
        // 같은 레이어의 형제 노드 → 비활성화
        return { ...n, current: false, locked: true };
      }
      return n;
    });
    
    // 2. 다음 레이어에서, 완료한 노드와 연결된 노드만 활성화
    const nextNodeIds = mapData.edges
      .filter(([a]) => a === activeNodeId)
      .map(([_, b]) => b);
    nextNodeIds.forEach(nid => {
      const idx = newNodes.findIndex(n => n.id === nid);
      if (idx !== -1) newNodes[idx] = { ...newNodes[idx], current: true, locked: false };
    });
    
    setMapData({ ...mapData, nodes: newNodes });
  };

  // 전투 승리
  const handleVictory = (remainingHp, drop) => {
    setHp(remainingHp);
    
    // 드랍 적용
    if (drop?.gold) {
      const g = Math.floor(drop.gold[0] + Math.random() * (drop.gold[1] - drop.gold[0]));
      setGold(prev => prev + g);
    }
    if (drop?.gem) {
      const gm = Math.floor(drop.gem[0] + Math.random() * (drop.gem[1] - drop.gem[0]));
      setGem(prev => prev + gm);
    }

    // 보스라면 챕터 클리어로
    if (isBossReward) {
      completeCurrentNode();
      setScreen('chapterClear');
      return;
    }

    // 일반 전투/엘리트는 보상 화면으로
    // 운명 Lv.5: 보상 4중1
    const count = hasEffect(skills, 'extraReward') ? 4 : 3;
    const rewards = rollRewards(count, isEliteReward);
    setCurrentRewards(rewards);
    setHasRerolled(false);
    setScreen('reward');
  };

  // 전투 패배
  const handleDefeat = () => {
    setScreen('title');
  };

  // 보상 획득
  const handlePickReward = (reward) => {
    applyReward(reward);
    // 운명 minor: 보상 받을 때 추가 보석 +1/Lv
    const extraGem = getMinorBonus(skills, 'rewardChoice+');
    if (extraGem > 0) {
      setGem(prev => prev + extraGem);
    }
    completeCurrentNode();
    setScreen('map');
  };

  const applyReward = (reward) => {
    if (reward.type === 'skill') {
      // 재생 minor: 최대 HP +8/Lv (보상 획득 시도)
      if (reward.name === '재생' && (skills['재생'] || 0) < PASSIVE_SKILLS['재생'].maxLv) {
        const hpAdd = PASSIVE_SKILLS['재생'].minorEffect.perLv;
        setMaxHp(prev => prev + hpAdd);
        setHp(prev => prev + hpAdd);
      }
      setSkills(prev => ({
        ...prev,
        [reward.name]: Math.min((prev[reward.name] || 0) + 1, PASSIVE_SKILLS[reward.name].maxLv)
      }));
    } else if (reward.type === 'stat') {
      setStats(prev => ({ ...prev, [reward.name]: (prev[reward.name] || 10) + reward.value }));
      if (reward.name === '최대 체력') {
        setMaxHp(prev => prev + reward.value);
        setHp(prev => prev + reward.value);
      }
    } else if (reward.type === 'heal') {
      setHp(prev => Math.min(maxHp, prev + reward.value));
    } else if (reward.type === 'heal_full') {
      setHp(maxHp);
    } else if (reward.type === 'relic') {
      setRelics(prev => [...prev, reward]);
      Object.entries(reward.skillBonus).forEach(([k, v]) => {
        // 재생 minor: 최대 HP 증가
        if (k === '재생') {
          const currentLv = skills['재생'] || 0;
          const targetLv = Math.min(currentLv + v, PASSIVE_SKILLS['재생'].maxLv);
          const actualGain = targetLv - currentLv;
          const hpAdd = PASSIVE_SKILLS['재생'].minorEffect.perLv * actualGain;
          if (hpAdd > 0) {
            setMaxHp(prev => prev + hpAdd);
            setHp(prev => prev + hpAdd);
          }
        }
        setSkills(prev => ({
          ...prev,
          [k]: Math.min((prev[k] || 0) + v, PASSIVE_SKILLS[k].maxLv)
        }));
      });
    } else if (reward.type === 'gold') {
      setGold(prev => prev + reward.value);
    } else if (reward.type === 'gem') {
      setGem(prev => prev + reward.value);
    }
  };

  const handleReroll = (newRewards, cost) => {
    setGem(prev => prev - (cost || GAME_CONFIG.rerollCost));
    setHasRerolled(true);
    setCurrentRewards(newRewards);
  };

  // 사건 결과 처리
  const handleEventResolve = (resultData) => {
    if (resultData.reward) {
      if (resultData.reward.type === 'gold') setGold(prev => prev + resultData.reward.value);
      else if (resultData.reward.type === 'heal') setHp(prev => Math.min(maxHp, prev + resultData.reward.value));
      else if (resultData.reward.type === 'random_relic') {
        const relicRewards = REWARD_POOL.filter(r => r.type === 'relic');
        const r = relicRewards[Math.floor(Math.random() * relicRewards.length)];
        applyReward(r);
      } else if (resultData.reward.type === 'skill_random_lv') {
        const ownedSkills = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
        if (ownedSkills.length > 0) {
          const [name] = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
          setSkills(prev => ({ ...prev, [name]: Math.min(prev[name] + 1, 7) }));
        }
      }
    }
    if (resultData.penalty?.hp) {
      setHp(prev => Math.max(1, prev + resultData.penalty.hp));
    }
    if (resultData.combat) {
      setCurrentEnemy(resultData.combat);
      setIsEliteReward(false); setIsBossReward(false);
      setScreen('combat');
      return;
    }
    completeCurrentNode();
    setScreen('map');
  };

  // 야영 선택
  const handleRestChoice = (choice) => {
    if (choice.type === 'heal') {
      setHp(prev => Math.min(maxHp, prev + choice.value));
    } else if (choice.type === 'gem') {
      setGem(prev => prev + choice.value);
    } else if (choice.type === 'maxhp') {
      setMaxHp(prev => prev + choice.value);
      setHp(prev => prev + choice.value);
    } else if (choice.type === 'upgrade_random') {
      const upgradable = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
      if (upgradable.length > 0) {
        const [name] = upgradable[Math.floor(Math.random() * upgradable.length)];
        setSkills(prev => ({ ...prev, [name]: prev[name] + 1 }));
      }
    }
    completeCurrentNode();
    setScreen('map');
  };

  // 상점 구매
  const handleShopBuy = (item, price) => {
    setGold(prev => prev - price);
    applyReward(item);
  };

  const handleShopLeave = () => {
    completeCurrentNode();
    setScreen('map');
  };

  // 챕터 클리어 → 다음 챕터
  const handleChapterContinue = () => {
    const isLast = chapterIdx === CHAPTERS.length - 1;
    if (isLast) {
      setScreen('title');
    } else {
      const nextCh = CHAPTERS[chapterIdx + 1];
      initializeRun(nextCh, chapterIdx + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: `radial-gradient(ellipse at top, #1a0e12 0%, #050304 100%)`,
      fontFamily: '"Noto Serif KR", serif',
    }}>
      <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start max-w-7xl">
        {/* 좌측 안내 */}
        <div className="hidden lg:block max-w-sm" style={{ color: PALETTE.text }}>
          <p className="text-xs tracking-[0.4em] mb-2" style={{ color: PALETTE.derod }}>DATA REFACTOR · v0.8</p>
          <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: '"Cinzel", serif' }}>
            데로드앤데블랑<br/>
            <span style={{ color: PALETTE.accent }}>로그라이크</span>
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: PALETTE.textDim }}>
            v0.8 — 데이터 외부화. 콘텐츠가 derod_data.js로 분리되어 코드 수정 없이 추가/변경 가능.
          </p>
          
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.derod }}>◆ 데이터 분리</div>
              <p style={{ color: PALETTE.textDim }}>
                패시브, 직업, 적, 챕터, 사건, 유물, 보상, 가격, 밸런스 모두 derod_data.js에 분리. 
                향후 .json 파일로도 그대로 변환 가능.
              </p>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.derod }}>◆ 콘텐츠 추가 용이</div>
              <p style={{ color: PALETTE.textDim }}>
                새 적/사건/유물은 데이터 파일 객체에 추가만 하면 자동 등장. 
                EVENTS의 chapter 필드로 챕터별 등장 제어.
              </p>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: PALETTE.derod }}>◆ 밸런스 튜닝</div>
              <p style={{ color: PALETTE.textDim }}>
                GAME_CONFIG에 시작 자원·회복률·충격게이지 등 모든 수치 모음. 
                한 곳만 고치면 전체 밸런스 조정 가능.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-[11px] leading-relaxed" style={{ color: PALETTE.textDim, borderColor: PALETTE.panelBorder }}>
            ◇ 노드 빛나는 곳 탭 → 자동으로 해당 화면 진입<br/>
            ◇ 전투 승리 시 보상 3중1 (강적은 가중 보상)<br/>
            ◇ 사건은 능력검정으로 분기 (성공/실패)
          </div>
        </div>

        {/* 폰 (게임 화면) */}
        <PhoneFrame>
          {screen === 'title' && <TitleScreen onStart={() => setScreen('classSelect')} />}
          {screen === 'classSelect' && (
            <ClassSelect selected={selectedClass} onSelect={setSelectedClass}
              onNext={() => setScreen('chapterSelect')}
              onBack={() => setScreen('title')} />
          )}
          {screen === 'chapterSelect' && (
            <ChapterSelect unlockedChapter={unlockedChapter}
              onSelect={(ch) => initializeRun(ch, CHAPTERS.indexOf(ch))}
              onBack={() => setScreen('classSelect')} />
          )}
          {screen === 'map' && chapter && mapData && (
            <MapView chapter={chapter} classData={classData} mapData={mapData}
              hp={hp} maxHp={maxHp} gold={gold} gem={gem}
              onEnterNode={handleEnterNode}
              onOpenStatus={() => setScreen('status')}
              onBack={() => setScreen('chapterSelect')} />
          )}
          {screen === 'combat' && currentEnemy && (
            <CombatScreen
              key={`${activeNodeId}-${currentEnemy}`}
              classData={classData}
              initialPlayer={{ hp, maxHp, ...stats, ...classData.stats }}
              initialSkills={skills}
              enemyKey={currentEnemy}
              isBoss={isBossReward}
              onVictory={handleVictory}
              onDefeat={handleDefeat}
            />
          )}
          {screen === 'reward' && (
            <RewardSelect rewards={currentRewards} gem={gem} skills={skills}
              onPick={handlePickReward}
              onReroll={handleReroll}
              hasRerolled={hasRerolled}
              isElite={isEliteReward} />
          )}
          {screen === 'event' && currentEvent && (
            <EventScreen event={currentEvent} classData={classData} stats={{ ...classData.stats, ...stats }}
              onResolve={handleEventResolve} />
          )}
          {screen === 'rest' && (
            <RestScreen classData={classData} hp={hp} maxHp={maxHp} skills={skills}
              onChoice={handleRestChoice} />
          )}
          {screen === 'shop' && (
            <ShopScreen gold={gold} onBuy={handleShopBuy} onLeave={handleShopLeave} />
          )}
          {screen === 'chapterClear' && chapter && (
            <ChapterClearScreen chapter={chapter}
              isLastChapter={chapterIdx === CHAPTERS.length - 1}
              onContinue={handleChapterContinue} />
          )}
          {screen === 'status' && (
            <StatusPanel classData={classData} hp={hp} maxHp={maxHp}
              skills={skills} stats={{ ...classData.stats, ...stats }} relics={relics}
              onClose={() => setScreen('map')} />
          )}
        </PhoneFrame>

        {/* 우측 디버그 */}
        <div className="hidden lg:block max-w-sm">
          <p className="text-xs tracking-[0.4em] mb-3" style={{ color: PALETTE.derod }}>현재 상태</p>
          
          <div className="px-3 py-2.5 mb-3" style={{ background: `${PALETTE.accent}10`, border: `1px solid ${PALETTE.panelBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: PALETTE.textDim }}>현재 화면</div>
            <div className="text-xs font-bold" style={{ color: PALETTE.text }}>{screen}</div>
          </div>

          <div className="space-y-1 text-[11px] mb-4">
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>HP</span><span style={{ color: PALETTE.text }}>{hp}/{maxHp}</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>은화</span><span style={{ color: PALETTE.text }}>{gold}</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>보석</span><span style={{ color: PALETTE.text }}>{gem}</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>유물</span><span style={{ color: PALETTE.text }}>{relics.length}개</span></div>
            {chapter && <div className="flex justify-between"><span style={{ color: PALETTE.textDim }}>챕터</span><span style={{ color: PALETTE.text }}>{chapter.name}</span></div>}
          </div>

          {Object.keys(skills).length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] mb-1" style={{ color: PALETTE.derod }}>패시브 스킬</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(skills).filter(([_, lv]) => lv > 0).map(([k, lv]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5" style={{
                    background: `${PASSIVE_SKILLS[k].color}30`,
                    color: PASSIVE_SKILLS[k].color,
                    border: `1px solid ${PASSIVE_SKILLS[k].color}60`,
                  }}>{k} {lv}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-[10px] leading-relaxed" style={{ color: PALETTE.textDim, borderColor: PALETTE.panelBorder }}>
            <p className="mb-2">◇ <strong style={{ color: PALETTE.text }}>플레이 순서:</strong></p>
            <p>1. 직업 선택 → 챕터 선택</p>
            <p>2. 발광 노드 탭 → 해당 컨텐츠 진행</p>
            <p>3. 전투 승리 → 보상 3중1 선택</p>
            <p>4. 보스 처치 → 다음 챕터로 자동 이동</p>
            <p className="mt-2">◇ 보석 3개로 보상 1회 리롤</p>
            <p>◇ 우측 상단 캐릭터 아이콘으로 상태창</p>
          </div>
        </div>
      </div>
    </div>
  );
}
