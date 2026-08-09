// ============================================
// components/RaidBattleScreen.jsx — 레이드 풀오토 전투 (1.74.0~, 방 진행형)
// ============================================
// PM 확정: 풀오토 + 관전 — 편성한 장비가 승패를 결정.
// 던파식 방 진행: rooms 배열을 순서대로 돌파, 파티 HP는 방 사이 10%만 회복 (소모전).
// 방 클리어 시 그 방의 장비 드랍 즉시 획득 — 중도 전멸·후퇴해도 전리품 보존.
//
// 라운드 자동 진행 (900ms/라운드, ×2 배속):
//   1. 사제: 전멸기 예고 라운드면 방벽(피해 -70%), 아니면 최저 HP 아군 치유
//   2. 탱커 도발: 적 단일 공격 전담 (받는 데미지 -30%)
//   3. 딜러: 마족 잃은HP×40% / 정령사 치명 25% / 술법사 3라운드 메테오 ×1.5
//   4. 적: 전멸기(atk×2 전체) > 광역(atk×0.7 전체) > 단일(탱커). HP 50% 격노 ×1.3
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { RAID_CLASSES, RAID_RARITIES, RAID_TUNING, RAID_STONE, RAID_ESSENCE, getRaidMemberStats, rollRaidDrop, CLASSES } from '../data.js';

const ROLE_COLORS = { tank: '#7ba3c4', dealer: '#c4453d', healer: '#9ad4a3' };
const ROOM_KIND_LABELS = { mobs: '쫄', named: '네임드', boss: '보스' };

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

// 1.76.0~ 전역 난이도 배율(RAID_TUNING) 적용 — 실기기 체감 후 상수만 조정
function buildRoomEnemy(room) {
  const hp = Math.round(room.hp * RAID_TUNING.enemyHpMult);
  return { ...room, hp, maxHp: hp, atk: Math.round(room.atk * RAID_TUNING.enemyAtkMult), enraged: false };
}

export default function RaidBattleScreen({ meta, dungeon, onVictory, onDefeat, onRetreat }) {
  const rooms = dungeon.rooms || [];
  const [party, setParty] = useState(() => buildParty(meta?.raid));
  const [roomIdx, setRoomIdx] = useState(0);
  const [enemy, setEnemy] = useState(() => buildRoomEnemy(rooms[0]));
  const [round, setRound] = useState(0); // 방마다 리셋 (패턴 주기 기준)
  // 1.76.0~ 전리품 = { items, stones, essence } — 방 클리어마다 누적, 전멸해도 보존.
  // 장비(items)·정수(essence)는 막보 전용, 중간 네임드는 심연석(stones)만.
  const [loot, setLoot] = useState({ items: [], stones: 0, essence: 0 });
  const [log, setLog] = useState([{ t: 'sys', text: `━━ ${dungeon.name} 입장 — 방 1/${rooms.length} · ${rooms[0].name} ━━` }]);
  const [phase, setPhase] = useState('running'); // running | victory | defeat
  const [speed, setSpeed] = useState(1);
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
      const e = { ...enemy };
      const lines = [{ t: 'round', text: `── ROUND ${r} ──` }];
      const alive = () => p.filter(m => m.alive);

      // 전멸기 예고 라운드인가 (최종 보스 전용)
      const wipeRound = !!(e.wipeEvery && r % e.wipeEvery === 0);
      let shield = false;

      // 1. 사제 — 침묵의 저주(healCut) 중엔 치유 -50%
      const priest = p.find(m => m.classId === 'priest');
      if (priest?.alive) {
        if (wipeRound) {
          shield = true;
          lines.push({ t: 'heal', text: `✚ 사제 — 여명의 방벽! 전멸기 피해 -70%` });
        } else {
          const hurt = alive().reduce((a, m) => (m.hp / m.maxHp < a.hp / a.maxHp ? m : a));
          if (hurt && hurt.hp < hurt.maxHp) {
            const healCut = (e.healCutLeft || 0) > 0;
            const healAmount = healCut ? Math.floor(priest.heal * 0.5) : priest.heal;
            const healed = Math.min(hurt.maxHp - hurt.hp, healAmount);
            hurt.hp += healed;
            lines.push({ t: 'heal', text: `✚ 사제 → ${hurt.name} +${healed}${healCut ? ' [침묵의 저주 -50%]' : ''}` });
          }
        }
      }

      // 2~3. 파티 공격
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
        e.hp = Math.max(0, e.hp - dmg);
        lines.push({ t: m.role === 'healer' ? 'sys' : 'atk', text: `▸ ${m.name} ${dmg}${label}` });
      });
      lines.push({ t: 'sys', text: `· 파티 합계 ${totalDmg} — ${e.name} HP ${e.hp}/${e.maxHp}` });

      // 격노 체크
      if (!e.enraged && e.enrageAt && e.hp > 0 && e.hp / e.maxHp <= e.enrageAt) {
        e.enraged = true;
        lines.push({ t: 'boss', text: `⚠ ${e.name} 격노! 데미지 +30%` });
      }

      // ===== 방 클리어 =====
      if (e.hp <= 0) {
        lines.push({ t: 'win', text: `━━ ${e.name} 격파! ━━` });
        const isLastRoom = roomIdx >= rooms.length - 1;
        // 장비·정수는 막보 전용 / 중간 네임드는 심연석 (1관문 반복 파밍 익스플로잇 차단)
        const roomItems = isLastRoom ? Array.from({ length: e.drops || 0 }, () => rollRaidDrop(dungeon)) : [];
        const roomStones = e.stones || 0;
        const roomEssence = isLastRoom ? (dungeon.essenceDrop || 0) : 0;
        const newLoot = {
          items: [...loot.items, ...roomItems],
          stones: loot.stones + roomStones,
          essence: loot.essence + roomEssence,
        };
        roomItems.forEach(item => {
          const rar = RAID_RARITIES[item.rarity];
          lines.push({ t: 'win', text: `◈ 전리품 — [${rar.name}] ${item.name}` });
        });
        if (roomStones > 0) lines.push({ t: 'win', text: `${RAID_STONE.icon} 심연석 +${roomStones}` });
        if (roomEssence > 0) lines.push({ t: 'win', text: `${RAID_ESSENCE.icon} 군주의 정수 +${roomEssence}` });
        if (isLastRoom) {
          setParty(p); setEnemy(e); setRound(r);
          setLog(prev => [...prev, ...lines]);
          setLoot(newLoot);
          setPhase('victory');
          return;
        }
        // 다음 방으로 — 파티 HP 10% 회복 (숨 고르기, 소모전 유지)
        const nextRoom = rooms[roomIdx + 1];
        alive().forEach(m => { m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * 0.1)); });
        lines.push({ t: 'sys', text: `· 숨 고르기 — 생존자 HP +10%` });
        lines.push({ t: 'sys', text: `━━ 방 ${roomIdx + 2}/${rooms.length} · ${nextRoom.name} [${ROOM_KIND_LABELS[nextRoom.kind]}] ━━` });
        setParty(p);
        setEnemy(buildRoomEnemy(nextRoom));
        setRoomIdx(roomIdx + 1);
        setRound(0);
        setLoot(newLoot);
        setLog(prev => [...prev, ...lines].slice(-100));
        return;
      }

      // 3.5. 소환된 쫄 공격 (지난 라운드 소환분 — 1회 타격 후 소멸)
      if ((e.pendingAdds || 0) > 0) {
        const addDmg = Math.round(e.atk * 0.25);
        for (let i = 0; i < e.pendingAdds; i++) {
          const targets = alive();
          if (targets.length === 0) break;
          const victim = targets[Math.floor(Math.random() * targets.length)];
          victim.hp = Math.max(0, victim.hp - addDmg);
          lines.push({ t: 'boss', text: `◂ 소환수 → ${victim.name} ${addDmg}` });
          if (victim.hp <= 0) { victim.alive = false; lines.push({ t: 'boss', text: `✖ ${victim.name} 전투 불능` }); }
        }
        lines.push({ t: 'sys', text: `· 소환수 소멸` });
        e.pendingAdds = 0;
      }

      // 4. 적 행동
      const enemyAtk = e.atk * (e.enraged ? 1.3 : 1) * (0.9 + Math.random() * 0.2);
      // 기믹: 쫄 소환 (summonEvery) — 다음 라운드에 소환수 2기가 일제 타격
      if (e.summonEvery && r % e.summonEvery === 0) {
        e.pendingAdds = 2;
        lines.push({ t: 'boss', text: `☍ ${e.name} — 소환수 2기 소환! (다음 라운드 일제 공격)` });
      }
      // 기믹: 침묵의 저주 (healCutEvery) — 2라운드간 사제 치유 -50%
      if (e.healCutEvery && r % e.healCutEvery === 0) {
        e.healCutLeft = 3; // 이번 라운드 말 차감 포함 실효 2라운드
        lines.push({ t: 'boss', text: `⌀ ${e.name} — 침묵의 저주! 2라운드간 치유 -50%` });
      }
      if (wipeRound) {
        const mult = shield ? 0.3 : 1;
        lines.push({ t: 'boss', text: `☠ ${e.name} — 전멸기 발동!${shield ? ' (방벽으로 감쇄)' : ''}` });
        alive().forEach(m => {
          let taken = enemyAtk * 2 * mult;
          if (m.classId === 'wanderer') taken *= 0.7;
          taken = Math.round(taken);
          m.hp = Math.max(0, m.hp - taken);
          if (m.hp <= 0) { m.alive = false; lines.push({ t: 'boss', text: `✖ ${m.name} 전투 불능` }); }
        });
      } else if (e.aoeEvery && r % e.aoeEvery === 0) {
        lines.push({ t: 'boss', text: `◂ ${e.name} — 광역 공격` });
        alive().forEach(m => {
          let taken = enemyAtk * 0.7;
          if (m.classId === 'wanderer') taken *= 0.7;
          taken = Math.round(taken);
          m.hp = Math.max(0, m.hp - taken);
          if (m.hp <= 0) { m.alive = false; lines.push({ t: 'boss', text: `✖ ${m.name} 전투 불능` }); }
        });
      } else {
        const tank = p.find(m => m.classId === 'wanderer' && m.alive);
        // 기믹: 도발 무시 (pierceTankChance) — 일정 확률로 탱커가 아닌 아군을 노림
        const nonTanks = alive().filter(m => m.classId !== 'wanderer');
        const pierce = !!(e.pierceTankChance && tank && nonTanks.length > 0 && Math.random() < e.pierceTankChance);
        const target = pierce
          ? nonTanks[Math.floor(Math.random() * nonTanks.length)]
          : (tank || alive()[Math.floor(Math.random() * alive().length)]);
        if (target) {
          let taken = enemyAtk;
          if (target.classId === 'wanderer') taken *= 0.7;
          taken = Math.round(taken);
          target.hp = Math.max(0, target.hp - taken);
          lines.push({ t: 'boss', text: `◂ ${e.name} → ${target.name} ${taken}${pierce ? ' [도발 무시!]' : tank && !pierce ? ' [도발]' : ''}` });
          if (target.hp <= 0) { target.alive = false; lines.push({ t: 'boss', text: `✖ ${target.name} 전투 불능` }); }
        }
      }

      // 침묵의 저주 지속 차감
      if ((e.healCutLeft || 0) > 0) e.healCutLeft -= 1;

      setParty(p); setEnemy(e); setRound(r);
      setLog(prev => [...prev, ...lines].slice(-100));

      if (p.every(m => !m.alive)) {
        setLog(prev => [...prev, { t: 'boss', text: `━━ 파티 전멸... (방 ${roomIdx + 1}/${rooms.length}에서 패배) ━━` }]);
        setPhase('defeat');
      }
    }, 900 / speed);
    return () => clearTimeout(t);
  }, [phase, round, roomIdx, speed]);

  const logColor = (t) => t === 'boss' ? PALETTE.accent : t === 'heal' ? PALETTE.green : t === 'win' ? PALETTE.legendary : t === 'round' ? PALETTE.dawn : t === 'atk' ? PALETTE.text : PALETTE.textDim;

  // 전리품 개수 (장비 + 자원)
  const lootCount = loot.items.length + (loot.stones > 0 ? 1 : 0) + (loot.essence > 0 ? 1 : 0);

  // 전리품 목록 (승리/패배/후퇴 공용) — 장비 + 심연석·정수
  const renderLoot = () => (
    lootCount > 0 && (
      <div className="flex flex-col gap-1.5 mb-2.5">
        {(loot.stones > 0 || loot.essence > 0) && (
          <div className="flex items-center gap-2 px-3 py-2" style={{
            borderRadius: 10, background: 'rgba(123,163,196,0.12)', border: `1px solid ${PALETTE.ice}66`,
          }}>
            {loot.stones > 0 && <span className="tabular-nums" style={{ fontSize: 11, color: PALETTE.ice }}>{RAID_STONE.icon} 심연석 +{loot.stones}</span>}
            {loot.essence > 0 && <span className="tabular-nums" style={{ fontSize: 11, color: PALETTE.legendary }}>{RAID_ESSENCE.icon} 군주의 정수 +{loot.essence}</span>}
          </div>
        )}
        {loot.items.map(item => {
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
    )
  );

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: `radial-gradient(120% 42% at 50% -10%, ${dungeon.color}2a, transparent), ${PALETTE.bgDeep}` }}>
      {/* 헤더 — 방 진행도 + 현재 적 HP */}
      <div className="px-4 pt-4 pb-2 flex-none">
        <div className="flex items-center gap-1.5 mb-1.5">
          {rooms.map((room, i) => (
            <span key={i} className="flex-1" style={{
              height: 4, borderRadius: 999,
              background: i < roomIdx ? PALETTE.green : i === roomIdx ? dungeon.color : 'rgba(255,255,255,0.1)',
              boxShadow: i === roomIdx ? `0 0 8px ${dungeon.color}80` : 'none',
            }} />
          ))}
        </div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold" style={{ fontSize: 13, color: enemy.enraged ? PALETTE.accent : PALETTE.text }}>
            {enemy.enraged ? '⚠ ' : ''}{enemy.name}
            <span className="ml-1.5" style={{ fontSize: 9, color: PALETTE.textDim }}>
              방 {roomIdx + 1}/{rooms.length} [{ROOM_KIND_LABELS[enemy.kind]}]
            </span>
          </span>
          <span className="tabular-nums" style={{ fontSize: 11, color: PALETTE.textDim }}>{enemy.hp}/{enemy.maxHp}</span>
        </div>
        <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div className="transition-all" style={{
            height: '100%', width: `${(enemy.hp / enemy.maxHp) * 100}%`, borderRadius: 999,
            background: enemy.enraged ? 'linear-gradient(90deg, #8f2c24, #e05248)' : `linear-gradient(90deg, ${dungeon.color}, ${dungeon.color}cc)`,
            boxShadow: `0 0 12px ${dungeon.color}80`,
          }} />
        </div>
        {enemy.wipeEvery && phase === 'running' && (
          <div className="mt-1 tabular-nums" style={{ fontSize: 9.5, color: (enemy.wipeEvery - (round % enemy.wipeEvery)) <= 2 ? PALETTE.accent : PALETTE.textDim }}>
            ☠ 전멸기까지 {enemy.wipeEvery - (round % enemy.wipeEvery)}라운드
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
            <button onClick={() => onRetreat(loot)} className="ui-press flex-1" style={{
              height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.textDim,
            }}>후퇴{loot.stones > 0 ? ` (${RAID_STONE.icon}${loot.stones} 보존)` : ''}</button>
          </div>
        )}
        {phase === 'victory' && (
          <div>
            <div className="text-center tracking-[0.3em] font-bold mb-2" style={{ fontSize: 11, color: PALETTE.legendary }}>━ 던전 클리어 — 전리품 ━</div>
            {renderLoot()}
            <button onClick={() => onVictory(dungeon, loot)} className="ui-press w-full" style={{
              height: 44, borderRadius: 'var(--r-btn)', fontSize: 12, fontWeight: 700, letterSpacing: '0.25em',
              background: 'linear-gradient(160deg, rgba(232,176,74,0.4), rgba(232,176,74,0.16))',
              border: '1px solid rgba(232,176,74,0.6)', color: '#ffe9d2',
            }}>▸ 전리품 획득</button>
          </div>
        )}
        {phase === 'defeat' && (
          <div>
            {lootCount > 0 && (
              <div className="text-center tracking-[0.2em] font-bold mb-2" style={{ fontSize: 10.5, color: PALETTE.textDim }}>
                전멸 — 하지만 돌파한 방의 전리품은 보존됩니다
              </div>
            )}
            {renderLoot()}
            <button onClick={() => onDefeat(loot)} className="ui-press w-full" style={{
              height: 44, borderRadius: 'var(--r-btn)', fontSize: 12, letterSpacing: '0.25em',
              background: `linear-gradient(160deg, ${PALETTE.accent}55, ${PALETTE.accent}22)`,
              border: `1px solid ${PALETTE.accent}`, color: '#ffe9d2',
            }}>▸ 로비로 — 장비를 더 파밍하자</button>
          </div>
        )}
      </div>
    </div>
  );
}
