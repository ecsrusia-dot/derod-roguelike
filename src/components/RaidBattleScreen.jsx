// ============================================
// components/RaidBattleScreen.jsx — 레이드 풀오토 전투 (1.74.0~)
// ============================================
// PM 확정: 풀오토 + 관전 — 편성한 장비가 승패를 결정.
// 라운드 단위 자동 진행 (900ms/라운드, ×2 배속 지원):
//   1. 사제: 전멸기 예고 라운드면 방벽(피해 -70%), 아니면 최저 HP 아군 치유
//   2. 탱커 도발: 보스 단일 공격을 전부 탱커가 받음 (받는 데미지 -30%)
//   3. 딜러 공격: 마족 잃은HP×40% 가산 / 정령사 치명 25% / 술법사 3라운드마다 메테오 ×1.5
//   4. 보스: 전멸기(atk×2 전체) > 광역(atk×0.7 전체) > 단일(탱커). HP 50% 격노 시 데미지 ×1.3
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { RAID_CLASSES, RAID_RARITIES, getRaidMemberStats, rollRaidDrop, CLASSES } from '../data.js';

const ROLE_COLORS = { tank: '#7ba3c4', dealer: '#c4453d', healer: '#9ad4a3' };

function buildParty(raidMeta) {
  return Object.keys(RAID_CLASSES).map(classId => {
    const stats = getRaidMemberStats(classId, raidMeta?.equipped?.[classId]);
    const cls = CLASSES.find(c => c.id === classId);
    return {
      classId, name: cls?.name || classId, role: stats.role,
      hp: stats.hp, maxHp: stats.hp, atk: stats.atk, heal: stats.heal || 0,
      alive: true,
    };
  });
}

export default function RaidBattleScreen({ meta, dungeon, onVictory, onDefeat, onRetreat }) {
  const [party, setParty] = useState(() => buildParty(meta?.raid));
  const [boss, setBoss] = useState(() => ({ ...dungeon.boss, maxHp: dungeon.boss.hp, enraged: false }));
  const [round, setRound] = useState(0);
  const [log, setLog] = useState([{ t: 'sys', text: `━━ ${dungeon.name} — ${dungeon.boss.name} 등장 ━━` }]);
  const [phase, setPhase] = useState('running'); // running | victory | defeat
  const [speed, setSpeed] = useState(1);
  const [drops, setDrops] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // ===== 라운드 자동 진행 =====
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setTimeout(() => {
      const r = round + 1;
      const p = party.map(m => ({ ...m }));
      const b = { ...boss };
      const lines = [{ t: 'round', text: `── ROUND ${r} ──` }];
      const alive = () => p.filter(m => m.alive);

      // 전멸기 예고 라운드인가
      const wipeRound = !!(b.wipeEvery && r % b.wipeEvery === 0);
      let shield = false;

      // 1. 사제
      const priest = p.find(m => m.classId === 'priest');
      if (priest?.alive) {
        if (wipeRound) {
          shield = true;
          lines.push({ t: 'heal', text: `✚ 사제 — 여명의 방벽! 전멸기 피해 -70%` });
        } else {
          const hurt = alive().reduce((a, m) => (m.hp / m.maxHp < a.hp / a.maxHp ? m : a));
          if (hurt && hurt.hp < hurt.maxHp) {
            const healed = Math.min(hurt.maxHp - hurt.hp, priest.heal);
            hurt.hp += healed;
            lines.push({ t: 'heal', text: `✚ 사제 → ${hurt.name} +${healed}` });
          }
        }
      }

      // 2~3. 파티 공격 (탱커 포함)
      let totalDmg = 0;
      alive().forEach(m => {
        let dmg = m.atk * (0.85 + Math.random() * 0.3);
        let label = '';
        if (m.classId === 'demonblood') {
          const lost = m.maxHp - m.hp;
          dmg += lost * 0.4;
          if (lost > 0) label = ' [혈폭]';
        }
        if (m.classId === 'sage' && r % 3 === 0) { dmg *= 1.5; label = ' [메테오]'; }
        if (m.classId === 'elf' && Math.random() < 0.25) { dmg *= 1.5; label = ' [치명]'; }
        dmg = Math.round(dmg);
        totalDmg += dmg;
        b.hp = Math.max(0, b.hp - dmg);
        lines.push({ t: m.role === 'healer' ? 'sys' : 'atk', text: `▸ ${m.name} ${dmg}${label}` });
      });
      lines.push({ t: 'sys', text: `· 파티 합계 ${totalDmg} — 보스 HP ${b.hp}/${b.maxHp}` });

      // 격노 체크
      if (!b.enraged && b.enrageAt && b.hp > 0 && b.hp / b.maxHp <= b.enrageAt) {
        b.enraged = true;
        lines.push({ t: 'boss', text: `⚠ ${b.name} 격노! 데미지 +30%` });
      }

      if (b.hp <= 0) {
        lines.push({ t: 'win', text: `━━ ${b.name} 격파! ━━` });
        const rolled = Array.from({ length: dungeon.drops }, () => rollRaidDrop(dungeon));
        setParty(p); setBoss(b); setRound(r);
        setLog(prev => [...prev, ...lines]);
        setDrops(rolled);
        setPhase('victory');
        return;
      }

      // 4. 보스 행동
      const bossAtk = b.atk * (b.enraged ? 1.3 : 1) * (0.9 + Math.random() * 0.2);
      if (wipeRound) {
        const mult = shield ? 0.3 : 1;
        lines.push({ t: 'boss', text: `☠ ${b.name} — 전멸기 발동!${shield ? ' (방벽으로 감쇄)' : ''}` });
        alive().forEach(m => {
          let taken = bossAtk * 2 * mult;
          if (m.classId === 'wanderer') taken *= 0.7;
          taken = Math.round(taken);
          m.hp = Math.max(0, m.hp - taken);
          if (m.hp <= 0) { m.alive = false; lines.push({ t: 'boss', text: `✖ ${m.name} 전투 불능` }); }
        });
      } else if (b.aoeEvery && r % b.aoeEvery === 0) {
        lines.push({ t: 'boss', text: `◂ ${b.name} — 광역 공격` });
        alive().forEach(m => {
          let taken = bossAtk * 0.7;
          if (m.classId === 'wanderer') taken *= 0.7;
          taken = Math.round(taken);
          m.hp = Math.max(0, m.hp - taken);
          if (m.hp <= 0) { m.alive = false; lines.push({ t: 'boss', text: `✖ ${m.name} 전투 불능` }); }
        });
      } else {
        // 단일기 — 탱커 도발 (탱커 사망 시 무작위)
        const tank = p.find(m => m.classId === 'wanderer' && m.alive);
        const target = tank || alive()[Math.floor(Math.random() * alive().length)];
        if (target) {
          let taken = bossAtk;
          if (target.classId === 'wanderer') taken *= 0.7;
          taken = Math.round(taken);
          target.hp = Math.max(0, target.hp - taken);
          lines.push({ t: 'boss', text: `◂ ${b.name} → ${target.name} ${taken}${tank ? ' [도발]' : ''}` });
          if (target.hp <= 0) { target.alive = false; lines.push({ t: 'boss', text: `✖ ${target.name} 전투 불능` }); }
        }
      }

      setParty(p); setBoss(b); setRound(r);
      setLog(prev => [...prev, ...lines].slice(-80));

      if (p.every(m => !m.alive)) {
        setLog(prev => [...prev, { t: 'boss', text: '━━ 파티 전멸... ━━' }]);
        setPhase('defeat');
      }
    }, 900 / speed);
    return () => clearTimeout(t);
  }, [phase, round, speed]);

  const logColor = (t) => t === 'boss' ? PALETTE.accent : t === 'heal' ? PALETTE.green : t === 'win' ? PALETTE.legendary : t === 'round' ? PALETTE.dawn : t === 'atk' ? PALETTE.text : PALETTE.textDim;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: `radial-gradient(120% 42% at 50% -10%, ${dungeon.color}2a, transparent), ${PALETTE.bgDeep}` }}>
      {/* 헤더 — 보스 HP */}
      <div className="px-4 pt-4 pb-2 flex-none">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold" style={{ fontSize: 13, color: boss.enraged ? PALETTE.accent : PALETTE.text }}>
            {boss.enraged ? '⚠ ' : ''}{boss.name}
          </span>
          <span className="tabular-nums" style={{ fontSize: 11, color: PALETTE.textDim }}>{boss.hp}/{boss.maxHp}</span>
        </div>
        <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div className="transition-all" style={{
            height: '100%', width: `${(boss.hp / boss.maxHp) * 100}%`, borderRadius: 999,
            background: boss.enraged ? 'linear-gradient(90deg, #8f2c24, #e05248)' : `linear-gradient(90deg, ${dungeon.color}, ${dungeon.color}cc)`,
            boxShadow: `0 0 12px ${dungeon.color}80`,
          }} />
        </div>
        {boss.wipeEvery && phase === 'running' && (
          <div className="mt-1 tabular-nums" style={{ fontSize: 9.5, color: (boss.wipeEvery - (round % boss.wipeEvery)) <= 2 ? PALETTE.accent : PALETTE.textDim }}>
            ☠ 전멸기까지 {boss.wipeEvery - (round % boss.wipeEvery)}라운드
          </div>
        )}
      </div>

      {/* 파티 HP 5줄 */}
      <div className="px-4 py-2 flex-none grid grid-cols-5 gap-1.5">
        {party.map(m => (
          <div key={m.classId} className="text-center" style={{ opacity: m.alive ? 1 : 0.35 }}>
            <div className="truncate" style={{ fontSize: 9, color: ROLE_COLORS[m.role] }}>{m.name}</div>
            <div className="mt-1" style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div className="transition-all" style={{
                height: '100%', width: `${(m.hp / m.maxHp) * 100}%`, borderRadius: 999,
                background: m.alive ? 'linear-gradient(90deg, #6a8a4e, #9ad4a3)' : '#5a3030',
              }} />
            </div>
            <div className="tabular-nums" style={{ fontSize: 8, color: PALETTE.textDim }}>{m.alive ? m.hp : '✖'}</div>
          </div>
        ))}
      </div>

      {/* 전투 로그 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5" style={{ background: 'rgba(0,0,0,0.25)' }}>
        {log.map((l, i) => (
          <div key={i} style={{ fontSize: 10.5, color: logColor(l.t), textAlign: l.t === 'round' ? 'center' : 'left' }}>{l.text}</div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* 하단 컨트롤 */}
      <div className="p-3 flex-none" style={{ borderTop: '1px solid var(--ui-line)', background: PALETTE.bgDeep }}>
        {phase === 'running' && (
          <div className="flex gap-2">
            <button onClick={() => setSpeed(s => (s === 1 ? 2 : 1))} className="ui-press flex-1" style={{
              height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5, fontWeight: 700,
              background: 'rgba(232,176,74,0.1)', border: '1px solid rgba(232,176,74,0.4)', color: PALETTE.legendary,
            }}>배속 ×{speed} {speed === 1 ? '→ ×2' : '→ ×1'}</button>
            <button onClick={onRetreat} className="ui-press flex-1" style={{
              height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.textDim,
            }}>후퇴</button>
          </div>
        )}
        {phase === 'victory' && drops && (
          <div>
            <div className="text-center tracking-[0.3em] font-bold mb-2" style={{ fontSize: 11, color: PALETTE.legendary }}>━ 전리품 ━</div>
            <div className="flex flex-col gap-1.5 mb-2.5">
              {drops.map(item => {
                const rar = RAID_RARITIES[item.rarity];
                const cls = CLASSES.find(c => c.id === item.classId);
                return (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2" style={{
                    borderRadius: 10, background: `${rar.color}14`, border: `1px solid ${rar.color}77`,
                  }}>
                    <span style={{ fontSize: 11 }}>
                      <span style={{ color: rar.color, fontWeight: 700 }}>[{rar.name}]</span>{' '}
                      <span style={{ color: PALETTE.text }}>{item.name}</span>{' '}
                      <span style={{ fontSize: 9.5, color: PALETTE.textDim }}>({cls?.name})</span>
                    </span>
                    <span className="tabular-nums" style={{ fontSize: 10, color: PALETTE.textDim }}>
                      {item.atk > 0 && `공+${item.atk} `}{item.hp > 0 && `HP+${item.hp}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => onVictory(dungeon, drops)} className="ui-press w-full" style={{
              height: 44, borderRadius: 'var(--r-btn)', fontSize: 12, fontWeight: 700, letterSpacing: '0.25em',
              background: 'linear-gradient(160deg, rgba(232,176,74,0.4), rgba(232,176,74,0.16))',
              border: '1px solid rgba(232,176,74,0.6)', color: '#ffe9d2',
            }}>▸ 전리품 획득</button>
          </div>
        )}
        {phase === 'defeat' && (
          <button onClick={onDefeat} className="ui-press w-full" style={{
            height: 44, borderRadius: 'var(--r-btn)', fontSize: 12, letterSpacing: '0.25em',
            background: `linear-gradient(160deg, ${PALETTE.accent}55, ${PALETTE.accent}22)`,
            border: `1px solid ${PALETTE.accent}`, color: '#ffe9d2',
          }}>▸ 로비로 — 장비를 더 파밍하자</button>
        )}
      </div>
    </div>
  );
}
