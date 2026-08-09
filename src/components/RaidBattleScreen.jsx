// ============================================
// components/RaidBattleScreen.jsx — 레이드 풀오토 전투 (1.74.0~)
// ============================================
// 전투 로직 (1.76.0):
//   - RAID_TUNING 전역 난이도 배율 / 방 진행 소모전 (방 사이 HP 10% 회복)
//   - 전리품 { items, stones, essence } — 장비·정수는 막보 전용, 네임드는 심연석
//   - 사제 힐·방벽 / 탱커 도발 / 혈폭·메테오·치명 / 격노·광역·전멸기·소환·힐컷·도발무시
//
// 1.76.1 프론트엔드 강화 — 텍스트 로그 중심 → 비주얼 스테이지 중심:
//   - 적 스테이지: 던전 색 그라디언트 + 고동치는 엠블럼 + 피격 흔들림 + 격노 아우라
//   - 부유 데미지 숫자 (CombatEffects.FloatingLabel 재사용, 공격자별 스태거)
//   - 파티 = 직업 일러 초상 칩 + HP 바 (전투불능 시 그레이스케일)
//   - ROUND 배너 팝 / 전멸기 임박 경고 점멸 / 피격 비네트
//   - 로그는 최근 4줄 축약 + 탭 시 전체 펼침
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { RAID_CLASSES, RAID_RARITIES, RAID_TUNING, RAID_STONE, RAID_ESSENCE, getRaidMemberStats, rollRaidDrop, CLASSES } from '../data.js';
import { FloatingLabel, DamageVignette } from './CombatEffects.jsx';

const ROLE_COLORS = { tank: '#7ba3c4', dealer: '#c4453d', healer: '#9ad4a3' };
const ROOM_KIND_LABELS = { mobs: '쫄', named: '네임드', boss: '보스' };
const ROOM_KIND_GLYPHS = { mobs: '☠', named: '♜', boss: '♛' };

function buildParty(raidMeta) {
  return Object.keys(RAID_CLASSES).map(classId => {
    const stats = getRaidMemberStats(classId, raidMeta?.equipped?.[classId]);
    const cls = CLASSES.find(c => c.id === classId);
    // 1.77.0~ 에픽 고유 옵션 — 해당 직업 에픽 장비 1개 이상 장착 시 발동
    const equipped = raidMeta?.equipped?.[classId] || {};
    const epic = Object.values(equipped).some(it => it && it.rarity === 'EP');
    return {
      classId, name: cls?.name || classId, role: stats.role, image: cls?.image || null,
      hp: stats.hp, maxHp: stats.hp, atk: stats.atk, heal: stats.heal || 0,
      alive: true, epic,
    };
  });
}

// 1.76.0~ 전역 난이도 배율(RAID_TUNING) 적용 — 실기기 체감 후 상수만 조정
function buildRoomEnemy(room) {
  const hp = Math.round(room.hp * RAID_TUNING.enemyHpMult);
  return { ...room, hp, maxHp: hp, atk: Math.round(room.atk * RAID_TUNING.enemyAtkMult), enraged: false };
}

// 파티 초상 칩 — 직업 일러 + HP 바
function PartyChip({ member, flash }) {
  const [imgFailed, setImgFailed] = useState(false);
  const roleColor = ROLE_COLORS[member.role];
  return (
    <div className="text-center" style={{ opacity: member.alive ? 1 : 0.4, transition: 'opacity 0.3s' }}>
      <div className={`relative mx-auto ${flash ? 'fx-hit-shake' : ''}`} style={{
        width: 44, height: 44, borderRadius: 14, overflow: 'hidden',
        border: `2px solid ${member.alive ? roleColor : '#5a3030'}`,
        boxShadow: member.alive ? `0 0 10px ${roleColor}55` : 'none',
        filter: member.alive ? 'none' : 'grayscale(1) brightness(0.6)',
        background: `linear-gradient(160deg, ${roleColor}33, ${PALETTE.bgDeep})`,
      }}>
        {member.image && !imgFailed ? (
          <img src={member.image} alt={member.name} onError={() => setImgFailed(true)}
            className="w-full h-full object-cover" style={{ objectPosition: 'center 20%' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold" style={{ fontSize: 16, color: roleColor }}>
            {member.name[0]}
          </div>
        )}
        {!member.alive && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', fontSize: 18, color: '#e05248' }}>✖</div>
        )}
      </div>
      <div className="mt-1 mx-auto" style={{ width: 44, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.09)', overflow: 'hidden' }}>
        <div className="transition-all" style={{
          height: '100%', width: `${(member.hp / member.maxHp) * 100}%`, borderRadius: 999,
          background: member.hp / member.maxHp > 0.35
            ? 'linear-gradient(90deg, #6a8a4e, #9ad4a3)'
            : 'linear-gradient(90deg, #8f2c24, #e05248)',
        }} />
      </div>
      <div className="tabular-nums" style={{ fontSize: 8, color: PALETTE.textDim }}>{member.alive ? member.hp : '—'}</div>
    </div>
  );
}

export default function RaidBattleScreen({ meta, dungeon, onVictory, onDefeat, onRetreat }) {
  const rooms = dungeon.rooms || [];
  const [party, setParty] = useState(() => buildParty(meta?.raid));
  const [roomIdx, setRoomIdx] = useState(0);
  const [enemy, setEnemy] = useState(() => buildRoomEnemy(rooms[0]));
  const [round, setRound] = useState(0); // 방마다 리셋 (패턴 주기 기준)
  const [loot, setLoot] = useState({ items: [], stones: 0, essence: 0 });
  const [log, setLog] = useState([{ t: 'sys', text: `━━ ${dungeon.name} 입장 — 방 1/${rooms.length} · ${rooms[0].name} ━━` }]);
  const [logExpanded, setLogExpanded] = useState(false);
  const [phase, setPhase] = useState('running'); // running | victory | defeat
  const [speed, setSpeed] = useState(1);
  // === 1.76.1 비주얼 스테이지 상태 ===
  const [fxLabels, setFxLabels] = useState([]);       // 적 위 부유 데미지 [{id, kind, value}]
  const [partyFxLabels, setPartyFxLabels] = useState([]); // 파티 위 회복/피해
  const [enemyShake, setEnemyShake] = useState(0);
  const [partyFlash, setPartyFlash] = useState(0);    // 파티 전체 피격 흔들림 트리거
  const [vignette, setVignette] = useState(0);
  const [roundBanner, setRoundBanner] = useState(0);
  const fxIdRef = useRef(0);
  const timersRef = useRef([]);
  const logEndRef = useRef(null);
  // 1.77.0~ 사제 [소생] — 던전당 1회
  const reviveUsedRef = useRef(false);

  useEffect(() => {
    if (logExpanded) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, logExpanded]);

  // 언마운트 시 스태거 타이머 정리
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  const pushEnemyLabel = (kind, value, delay = 0) => {
    const t = setTimeout(() => {
      const id = ++fxIdRef.current;
      setFxLabels(prev => [...prev, { id, kind, value }]);
      setEnemyShake(v => v + 1);
      const t2 = setTimeout(() => setFxLabels(prev => prev.filter(l => l.id !== id)), 1200);
      timersRef.current.push(t2);
    }, delay);
    timersRef.current.push(t);
  };

  const pushPartyLabel = (kind, value, delay = 0) => {
    const t = setTimeout(() => {
      const id = ++fxIdRef.current;
      setPartyFxLabels(prev => [...prev, { id, kind, value }]);
      const t2 = setTimeout(() => setPartyFxLabels(prev => prev.filter(l => l.id !== id)), 1200);
      timersRef.current.push(t2);
    }, delay);
    timersRef.current.push(t);
  };

  // ===== 라운드 자동 진행 (로직 1.76.0 동일 — FX 이벤트 수집만 추가) =====
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setTimeout(() => {
      const r = round + 1;
      const p = party.map(m => ({ ...m }));
      const e = { ...enemy };
      const lines = [{ t: 'round', text: `── ROUND ${r} ──` }];
      const alive = () => p.filter(m => m.alive);
      const atkEvents = [];   // 적에게 들어간 타격 (스태거 부유 라벨용)
      let healEvent = null;
      let partyHit = false;

      setRoundBanner(v => v + 1);

      const wipeRound = !!(e.wipeEvery && r % e.wipeEvery === 0);
      let shield = false;

      // 1. 사제 — 소생(던전당 1회) > 방벽 > 치유. 침묵의 저주 중엔 치유 -50%
      const priest = p.find(m => m.classId === 'priest');
      if (priest?.alive) {
        const dead = p.find(m => !m.alive);
        if (wipeRound) {
          shield = true;
          lines.push({ t: 'heal', text: `✚ 사제 — 여명의 방벽! 전멸기 피해 -70%` });
        } else if (dead && !reviveUsedRef.current) {
          // 1.77.0 [소생] — 전투불능 아군 부활 (에픽 고유 '여명의 인도': 40% → 70%)
          reviveUsedRef.current = true;
          const revivePct = priest.epic ? 0.7 : 0.4;
          dead.alive = true;
          dead.hp = Math.round(dead.maxHp * revivePct);
          healEvent = dead.hp;
          lines.push({ t: 'heal', text: `✚ 사제 — [소생]! ${dead.name} 부활 (HP ${Math.round(revivePct * 100)}%)${priest.epic ? ' [여명의 인도]' : ''}` });
        } else {
          const hurt = alive().reduce((a, m) => (m.hp / m.maxHp < a.hp / a.maxHp ? m : a));
          if (hurt && hurt.hp < hurt.maxHp) {
            const healCut = (e.healCutLeft || 0) > 0;
            const healAmount = healCut ? Math.floor(priest.heal * 0.5) : priest.heal;
            const healed = Math.min(hurt.maxHp - hurt.hp, healAmount);
            hurt.hp += healed;
            healEvent = healed;
            lines.push({ t: 'heal', text: `✚ 사제 → ${hurt.name} +${healed}${healCut ? ' [침묵의 저주 -50%]' : ''}` });
          }
        }
      }

      // 1.5. 술법사 [잔염] 화상 도트 — 메테오 이후 2(에픽 3)라운드
      if ((e.burnLeft || 0) > 0 && e.hp > 0) {
        const burnDmg = e.burnDmg || 0;
        if (burnDmg > 0) {
          e.hp = Math.max(0, e.hp - burnDmg);
          atkEvents.push({ dmg: burnDmg, crit: false });
          lines.push({ t: 'atk', text: `🔥 잔염 ${burnDmg}` });
        }
        e.burnLeft -= 1;
      }

      // 2~3. 파티 공격
      let totalDmg = 0;
      alive().forEach(m => {
        let dmg = m.atk * (0.85 + Math.random() * 0.3);
        let label = '';
        let crit = false;
        if (m.classId === 'demonblood') {
          const lost = m.maxHp - m.hp;
          dmg += lost * 0.4;
          if (lost > 0) label = ' [혈폭]';
          // 1.77.0 [광란] — HP 40% 이하 시 공격 +30%
          if (m.hp / m.maxHp <= 0.4) { dmg *= 1.3; label += ' [광란]'; }
        }
        const isMeteor = m.classId === 'sage' && r % 3 === 0;
        if (isMeteor) { dmg *= 1.5; label = ' [메테오]'; crit = true; }
        // 1.77.0 [과부하] — 격노한 적에게 +15%
        if (m.classId === 'sage' && e.enraged) { dmg *= 1.15; label += ' [과부하]'; }
        if (m.classId === 'elf' && Math.random() < 0.25) { dmg *= 1.5; label = ' [치명]'; crit = true; }
        dmg = Math.round(dmg);
        totalDmg += dmg;
        e.hp = Math.max(0, e.hp - dmg);
        atkEvents.push({ dmg, crit });
        lines.push({ t: m.role === 'healer' ? 'sys' : 'atk', text: `▸ ${m.name} ${dmg}${label}` });
        // 1.77.0 [흡혈] — 혈폭 발동 중 가한 피해의 20% (에픽 '갈증의 낙인': 35%) 자가 회복
        if (m.classId === 'demonblood' && m.hp < m.maxHp) {
          const lifesteal = Math.round(dmg * (m.epic ? 0.35 : 0.2));
          if (lifesteal > 0) {
            m.hp = Math.min(m.maxHp, m.hp + lifesteal);
            lines.push({ t: 'heal', text: `· 흡혈 +${lifesteal}` });
          }
        }
        // 1.77.0 [잔염] 부여 — 메테오 명중 시 (에픽 '꺼지지 않는 불': 지속 3라운드)
        if (isMeteor && e.hp > 0) {
          e.burnLeft = m.epic ? 3 : 2;
          e.burnDmg = Math.round(m.atk * 0.3);
          lines.push({ t: 'atk', text: `· 잔염 부여 — ${e.burnLeft}라운드간 ${e.burnDmg}/라운드` });
        }
        // 1.77.0 [관통 화살] — 치명타 시 40%(에픽 '폭풍의 눈' 60%) 추가 사격 (50%)
        if (m.classId === 'elf' && crit && e.hp > 0 && Math.random() < (m.epic ? 0.6 : 0.4)) {
          const extra = Math.round(m.atk * 0.5);
          totalDmg += extra;
          e.hp = Math.max(0, e.hp - extra);
          atkEvents.push({ dmg: extra, crit: false });
          lines.push({ t: 'atk', text: `· 관통 화살 ${extra}` });
        }
      });
      lines.push({ t: 'sys', text: `· 파티 합계 ${totalDmg} — ${e.name} HP ${e.hp}/${e.maxHp}` });

      // 격노 체크
      if (!e.enraged && e.enrageAt && e.hp > 0 && e.hp / e.maxHp <= e.enrageAt) {
        e.enraged = true;
        lines.push({ t: 'boss', text: `⚠ ${e.name} 격노! 데미지 +30%` });
      }

      // FX — 공격자별 스태거 부유 데미지
      atkEvents.forEach((ev, i) => pushEnemyLabel(ev.crit ? 'crit' : 'damage', ev.dmg, i * (140 / speed)));
      if (healEvent) pushPartyLabel('heal', healEvent, 200 / speed);

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
          partyHit = true;
          lines.push({ t: 'boss', text: `◂ 소환수 → ${victim.name} ${addDmg}` });
          if (victim.hp <= 0) { victim.alive = false; lines.push({ t: 'boss', text: `✖ ${victim.name} 전투 불능` }); }
        }
        lines.push({ t: 'sys', text: `· 소환수 소멸` });
        e.pendingAdds = 0;
      }

      // 4. 적 행동
      const enemyAtk = e.atk * (e.enraged ? 1.3 : 1) * (0.9 + Math.random() * 0.2);
      if (e.summonEvery && r % e.summonEvery === 0) {
        e.pendingAdds = 2;
        lines.push({ t: 'boss', text: `☍ ${e.name} — 소환수 2기 소환! (다음 라운드 일제 공격)` });
      }
      if (e.healCutEvery && r % e.healCutEvery === 0) {
        // 1.77.0 [정화] — 사제 생존 시 지속 1라운드 단축 (실효 2 → 1라운드)
        const cleanse = !!priest?.alive;
        e.healCutLeft = cleanse ? 2 : 3; // 이번 라운드 말 차감 포함
        lines.push({ t: 'boss', text: `⌀ ${e.name} — 침묵의 저주! ${cleanse ? '1' : '2'}라운드간 치유 -50%${cleanse ? ' (사제 [정화]로 단축)' : ''}` });
      }
      // 1.77.0 [철벽 방세] — 4라운드마다 탱커 받는 피해 -60% (도발 -30%와 중첩)
      const tankAlive = p.find(m => m.classId === 'wanderer' && m.alive);
      const ironWall = !!(tankAlive && r % 4 === 0);
      if (ironWall) lines.push({ t: 'heal', text: `🛡 방랑검사 — [철벽 방세] 이번 라운드 받는 피해 -60%` });
      const takenMultOf = (m) => {
        let mult = 1;
        if (m.classId === 'wanderer') {
          mult *= 0.7;
          if (ironWall) mult *= 0.4;
        }
        return mult;
      };
      if (wipeRound) {
        const mult = shield ? 0.3 : 1;
        lines.push({ t: 'boss', text: `☠ ${e.name} — 전멸기 발동!${shield ? ' (방벽으로 감쇄)' : ''}` });
        let totalTaken = 0;
        alive().forEach(m => {
          // 1.77.0 [바람의 가호] — 정령사 광역·전멸기 20% 완전 회피
          if (m.classId === 'elf' && Math.random() < 0.2) {
            lines.push({ t: 'heal', text: `· 정령사 — [바람의 가호] 회피!` });
            return;
          }
          const taken = Math.round(enemyAtk * 2 * mult * takenMultOf(m));
          totalTaken += taken;
          m.hp = Math.max(0, m.hp - taken);
          if (m.hp <= 0) { m.alive = false; lines.push({ t: 'boss', text: `✖ ${m.name} 전투 불능` }); }
        });
        partyHit = true;
        pushPartyLabel('damage', totalTaken, 350 / speed);
      } else if (e.aoeEvery && r % e.aoeEvery === 0) {
        lines.push({ t: 'boss', text: `◂ ${e.name} — 광역 공격` });
        let totalTaken = 0;
        alive().forEach(m => {
          if (m.classId === 'elf' && Math.random() < 0.2) {
            lines.push({ t: 'heal', text: `· 정령사 — [바람의 가호] 회피!` });
            return;
          }
          const taken = Math.round(enemyAtk * 0.7 * takenMultOf(m));
          totalTaken += taken;
          m.hp = Math.max(0, m.hp - taken);
          if (m.hp <= 0) { m.alive = false; lines.push({ t: 'boss', text: `✖ ${m.name} 전투 불능` }); }
        });
        partyHit = true;
        pushPartyLabel('damage', totalTaken, 350 / speed);
      } else {
        const tank = tankAlive;
        const nonTanks = alive().filter(m => m.classId !== 'wanderer');
        const pierce = !!(e.pierceTankChance && tank && nonTanks.length > 0 && Math.random() < e.pierceTankChance);
        const target = pierce
          ? nonTanks[Math.floor(Math.random() * nonTanks.length)]
          : (tank || alive()[Math.floor(Math.random() * alive().length)]);
        if (target) {
          const taken = Math.round(enemyAtk * takenMultOf(target));
          target.hp = Math.max(0, target.hp - taken);
          partyHit = true;
          pushPartyLabel('damage', taken, 350 / speed);
          lines.push({ t: 'boss', text: `◂ ${e.name} → ${target.name} ${taken}${pierce ? ' [도발 무시!]' : tank && !pierce ? ' [도발]' : ''}` });
          if (target.hp <= 0) { target.alive = false; lines.push({ t: 'boss', text: `✖ ${target.name} 전투 불능` }); }
          // 1.77.0 [응수] — 도발 피격 시 35%(에픽 '수호자의 맹세' 50%) 반격 (공격력 80%)
          if (target.classId === 'wanderer' && target.alive && !pierce && Math.random() < (target.epic ? 0.5 : 0.35)) {
            const counter = Math.round(target.atk * 0.8);
            e.hp = Math.max(1, e.hp - counter); // 마무리는 파티의 손으로 (최소 1 보장)
            atkEvents.push({ dmg: counter, crit: false });
            lines.push({ t: 'atk', text: `⚔ 방랑검사 — [응수] 반격 ${counter}` });
          }
        }
      }

      if ((e.healCutLeft || 0) > 0) e.healCutLeft -= 1;

      if (partyHit) {
        setPartyFlash(v => v + 1);
        setVignette(v => v + 1);
      }

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

  const lootCount = loot.items.length + (loot.stones > 0 ? 1 : 0) + (loot.essence > 0 ? 1 : 0);
  const wipeIn = enemy.wipeEvery ? enemy.wipeEvery - (round % enemy.wipeEvery) : null;
  const wipeImminent = wipeIn !== null && wipeIn <= 1 && phase === 'running';

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

  const recentLog = log.slice(-4);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: PALETTE.bgDeep }}>
      {/* 피격 비네트 */}
      <DamageVignette trigger={vignette} />

      {/* ===== 적 스테이지 ===== */}
      <div className={`relative flex-none px-4 pt-3 pb-2 ${enemy.enraged ? 'raid-enrage' : ''} ${wipeImminent ? 'raid-wipe-warn' : ''}`} style={{
        background: `radial-gradient(120% 100% at 50% -20%, ${dungeon.color}45, transparent 70%), linear-gradient(180deg, rgba(0,0,0,0.2), transparent)`,
        borderBottom: `1.5px solid ${wipeImminent ? 'rgba(224,82,72,0.8)' : 'var(--ui-line)'}`,
        minHeight: 168,
      }}>
        {/* 방 진행 바 */}
        <div className="flex items-center gap-1.5 mb-2">
          {rooms.map((room, i) => (
            <span key={i} className="flex-1 relative" style={{
              height: 4, borderRadius: 999,
              background: i < roomIdx ? PALETTE.green : i === roomIdx ? dungeon.color : 'rgba(255,255,255,0.1)',
              boxShadow: i === roomIdx ? `0 0 8px ${dungeon.color}80` : 'none',
            }} />
          ))}
          <span className="flex-none tabular-nums ml-1" style={{ fontSize: 9, color: PALETTE.textDim }}>{roomIdx + 1}/{rooms.length}</span>
        </div>

        {/* 엠블럼 + 부유 데미지 */}
        <div className="relative flex flex-col items-center" style={{ minHeight: 86 }}>
          <div key={enemyShake} className={enemyShake > 0 ? 'fx-hit-shake' : ''}>
            <div className={phase === 'running' ? 'raid-emblem-pulse' : ''} style={{
              '--raid-glow': `${enemy.enraged ? 'rgba(224,82,72,0.7)' : dungeon.color + 'aa'}`,
              width: enemy.kind === 'boss' ? 64 : 54, height: enemy.kind === 'boss' ? 64 : 54,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: enemy.kind === 'boss' ? 32 : 26,
              color: enemy.enraged ? '#e05248' : dungeon.color,
              background: `radial-gradient(circle, ${dungeon.color}30, ${PALETTE.bgDeep})`,
              border: `2px solid ${enemy.enraged ? '#e05248' : dungeon.color}`,
              opacity: phase === 'victory' ? 0.25 : 1,
              transition: 'opacity 0.6s',
            }}>
              {ROOM_KIND_GLYPHS[enemy.kind] || '☠'}
            </div>
          </div>
          {/* 부유 데미지 라벨 */}
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 80 }}>
            {fxLabels.map((l, i) => (
              <div key={l.id} className="absolute" style={{ left: `${38 + ((l.id % 5) * 6)}%`, top: 14 + (i % 3) * 8 }}>
                <FloatingLabel kind={l.kind} value={l.value} />
              </div>
            ))}
          </div>
          {/* ROUND 배너 */}
          {roundBanner > 0 && phase === 'running' && (
            <div key={roundBanner} className="raid-round-pop absolute pointer-events-none" style={{
              left: '50%', top: '46%',
              fontSize: 13, fontWeight: 800, letterSpacing: '0.35em',
              color: PALETTE.dawn, textShadow: '0 0 14px rgba(212,165,116,0.7)',
              fontFamily: '"Cinzel", serif',
            }}>ROUND {round + 1}</div>
          )}
        </div>

        {/* 적 이름 + HP */}
        <div className="flex justify-between items-baseline mb-1 mt-1">
          <span className="font-bold" style={{ fontSize: 13, color: enemy.enraged ? '#e05248' : PALETTE.text }}>
            {enemy.enraged ? '⚠ ' : ''}{enemy.name}
            <span className="ml-1.5" style={{ fontSize: 9, color: PALETTE.textDim }}>[{ROOM_KIND_LABELS[enemy.kind]}]</span>
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
        {wipeIn !== null && phase === 'running' && (
          <div className="mt-1 tabular-nums flex items-center gap-1" style={{ fontSize: 9.5, color: wipeImminent ? '#e05248' : PALETTE.textDim, fontWeight: wipeImminent ? 700 : 400 }}>
            ☠ 전멸기까지 {wipeIn}라운드 {wipeImminent && '— 사제 방벽 대기!'}
          </div>
        )}
      </div>

      {/* ===== 파티 초상 5인 + 회복/피해 라벨 ===== */}
      <div className="relative px-4 py-2.5 flex-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25), transparent)' }}>
        <div key={partyFlash} className={`grid grid-cols-5 gap-1.5 ${partyFlash > 0 ? 'fx-hit-shake' : ''}`}>
          {party.map(m => <PartyChip key={m.classId} member={m} flash={false} />)}
        </div>
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 60 }}>
          {partyFxLabels.map(l => (
            <div key={l.id} className="absolute" style={{ left: '50%', top: 8 }}>
              <FloatingLabel kind={l.kind} value={l.value} />
            </div>
          ))}
        </div>
      </div>

      {/* ===== 전투 로그 — 축약 4줄, 탭 시 펼침 ===== */}
      <button onClick={() => setLogExpanded(v => !v)} className="flex-1 overflow-y-auto px-4 py-2 text-left w-full" style={{
        background: 'rgba(0,0,0,0.28)', border: 'none', minHeight: 0,
      }}>
        {(logExpanded ? log : recentLog).map((l, i) => (
          <div key={i} style={{ fontSize: 10.5, lineHeight: 1.6, color: logColor(l.t), textAlign: l.t === 'round' ? 'center' : 'left' }}>{l.text}</div>
        ))}
        <div ref={logEndRef} />
        <div className="text-center mt-1" style={{ fontSize: 8.5, color: PALETTE.textDim, opacity: 0.6, letterSpacing: '0.15em' }}>
          {logExpanded ? '▴ 탭하여 접기' : '▾ 탭하여 전체 로그'}
        </div>
      </button>

      {/* ===== 하단 컨트롤 ===== */}
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
            <div className="text-center tracking-[0.3em] font-bold mb-2" style={{
              fontSize: 12, color: PALETTE.legendary, textShadow: '0 0 16px rgba(232,176,74,0.8)',
            }}>━ 던전 클리어 — 전리품 ━</div>
            {renderLoot()}
            <button onClick={() => onVictory(dungeon, loot)} className="ui-press ui-sheen w-full" style={{
              height: 44, borderRadius: 'var(--r-btn)', fontSize: 12, fontWeight: 700, letterSpacing: '0.25em',
              background: 'linear-gradient(160deg, rgba(232,176,74,0.4), rgba(232,176,74,0.16))',
              border: '1px solid rgba(232,176,74,0.6)', color: '#ffe9d2',
              boxShadow: '0 4px 20px -6px rgba(232,176,74,0.6)',
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
