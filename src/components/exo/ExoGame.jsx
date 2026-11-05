// ============================================
// components/exo/ExoGame.jsx — ⚱ 제령사(除靈師) 컨테이너 (1.169.0)
// ============================================
// 로비(유파·승급 선택) → 던전(5막+종막, 방 선택) → 전투 → 엔딩.
// 모든 상태는 meta.exo 하나로 영속 (onSave 패치). 전투 중 새로고침 = 같은 방 재전투 (도주 불가).

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Package } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  EXO_ACTS, getExoAct, EXO_ASCENSIONS, EXO_SCHOOLS, getExoSchool,
  EXO_SKILLS, EXO_AUTO, EXO_TIERS, EXO_SLOT_IDS, EXO_SLOTS, EXO_ROOMS,
  EXO_FLOOR_MODS, EXO_SPIRIT_CAP, EXO_ENEMIES,
  createExoChar, exoDerived, rollExoOffers, rollExoFloorMod, buildExoEnemy,
  exoVictoryRewards, buildExoShop, rollExoItem, exoSalvageValue,
  rollExoOmen, resolveExoOmen, EXO_OMENS, exoSpiritDesc,
} from '../../data.js';
import ExoBattleScreen from './ExoBattleScreen.jsx';

const R = { panel: 'var(--r-panel, 18px)', btn: 'var(--r-btn, 13px)', chip: 'var(--r-chip, 8px)' };
const BATTLE_ROOMS = ['battle', 'elite', 'boss'];

// ===== 공용 소부품 =====
function ItemCard({ item, right = null, dim = false, onClick = null }) {
  if (!item) return null;
  const tier = EXO_TIERS[item.tier];
  const sk = EXO_SKILLS[item.skillId] || EXO_AUTO[item.skillId];
  const manual = !!EXO_SKILLS[item.skillId];
  const statLine = Object.entries(item.stats).map(([k, v]) => {
    const lbl = { atk: '완력', mag: '영력', hp: 'HP', def: '방어', crit: '치명', dodge: '회피', sp: 'SP', spRegen: 'SP회복', breakPct: '브레이크' }[k] || k;
    return `${lbl}+${v}${['crit', 'dodge', 'breakPct'].includes(k) ? '%' : ''}`;
  }).join(' ');
  return (
    <div onClick={onClick} className={`px-2.5 py-2 ${onClick ? 'ui-press cursor-pointer' : ''}`}
      style={{ borderRadius: R.chip, background: PALETTE.panelLight, border: `1px solid ${tier?.color || PALETTE.panelBorder}66`, opacity: dim ? 0.45 : 1 }}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold truncate" style={{ color: tier?.color || PALETTE.text }}>
            {item.name} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>Lv.{item.level}</span>
          </div>
          <div className="text-[10px]" style={{ color: PALETTE.textDim }}>{statLine}</div>
          {sk && (
            <div className="text-[10px]" style={{ color: manual ? PALETTE.dawn : PALETTE.ice }}>
              {manual ? `✋ ${sk.name} — ${sk.desc}` : `⚙ 자동 — ${sk.desc}`}
            </div>
          )}
          {item.spirit && <div className="text-[10px]" style={{ color: PALETTE.legendary }}>🕯 «{item.spirit.name}» 빙의 — {exoSpiritDesc(item.spirit)}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}
const Btn = ({ onClick, disabled, children, color = null, bold = false }) => (
  <button onClick={onClick} disabled={disabled} className={`ui-press w-full py-2.5 text-[12px]${bold ? ' font-bold' : ''}`}
    style={{
      borderRadius: R.btn, background: color || PALETTE.panelLight,
      color: color ? '#0a0608' : disabled ? PALETTE.textDim : PALETTE.text,
      border: `1px solid ${PALETTE.panelBorder}`, opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
);

export default function ExoGame({ exo, onSave, onBack }) {
  const char = exo.char || null;
  const [notice, setNotice] = useState(null);
  const [manage, setManage] = useState(false);
  const [manageTab, setManageTab] = useState('gear');
  const [pickSchool, setPickSchool] = useState('blade');
  const [pickAsc, setPickAsc] = useState(0);
  const [enemy, setEnemy] = useState(null);
  const [ending, setEnding] = useState(null); // { kills, captures } 클리어 연출

  const d = char ? exoDerived(char) : null;
  const act = char ? getExoAct(char.actIdx) : null;
  const inBattle = char && BATTLE_ROOMS.includes(char.room);

  // 첫 층 방 제안 생성 (새로고침 복원 포함)
  useEffect(() => {
    if (char && !char.offers && !inBattle) {
      const offers = rollExoOffers(char);
      onSave({ char: { ...char, offers } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char?.offers, inBattle]);

  // 전투 방 복원 — 적이 없으면 생성 (도주 불가)
  useEffect(() => {
    if (inBattle && !enemy) setEnemy(buildExoEnemy(char, char.room));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inBattle]);

  // ===== 층 진행 =====
  const nextFloorPatch = (c) => {
    const nc = { ...c, floor: c.floor + 1, room: null, roomData: null, floorMod: rollExoFloorMod() };
    nc.offers = rollExoOffers(nc);
    return nc;
  };
  const actTransitionPatch = (c) => {
    const nc = { ...c, actIdx: c.actIdx + 1, floor: 1, room: null, roomData: null, floorMod: null, talismans: (c.talismans || 0) + 1 };
    nc.hp = exoDerived(nc).maxHp;
    nc.offers = rollExoOffers(nc);
    return nc;
  };

  const enterRoom = (type) => {
    if (BATTLE_ROOMS.includes(type)) {
      const nc = { ...char, room: type, offers: null };
      setEnemy(buildExoEnemy(nc, type));
      onSave({ char: nc });
      return;
    }
    let roomData = null;
    if (type === 'shop') roomData = buildExoShop(char);
    if (type === 'treasure') roomData = { taken: false };
    if (type === 'rest') roomData = { rested: false };
    if (type === 'omen') roomData = { omenId: rollExoOmen().id, done: false, text: null, tone: null };
    onSave({ char: { ...char, room: type, roomData, offers: null } });
  };

  const advance = () => {
    setNotice(null);
    onSave({ char: nextFloorPatch(char) });
  };

  // ===== 전투 종료 =====
  const handleBattleFinish = (res) => {
    const foe = enemy;
    setEnemy(null);
    let c = { ...char };
    if (res.talismansUsed) c.talismans = Math.max(0, (c.talismans || 0) - res.talismansUsed);
    if (res.potionUsed) c.potions = Math.max(0, (c.potions || 0) - 1);
    if (!res.win) {
      // 사망 — 런 종료, 기록만 남는다
      onSave({
        char: null,
        deaths: (exo.deaths || 0) + 1,
        bestAct: Math.max(exo.bestAct || 0, c.actIdx + 1),
      });
      setNotice(`⚰ ${act.name} ${c.floor}층에서 쓰러졌다. 무덤은 기억한다 — 처치 ${c.kills} · 제령 ${c.captures}.`);
      return;
    }
    c.hp = res.hp;
    c.kills = (c.kills || 0) + 1;
    let msg = [];
    if (res.captured) {
      // 제령 성공 — 보상 대신 사령 (명전 절반)
      c.spirits = [...(c.spirits || []), res.captured].slice(0, EXO_SPIRIT_CAP);
      c.captures = (c.captures || 0) + 1;
      const gold = Math.round(exoVictoryRewards(c, foe).gold * 0.5);
      c.gold = (c.gold || 0) + gold;
      msg.push(`🕯 «${res.captured.name}» 포획 — 사령부에서 빙의하라. 명전 +${gold}`);
      onSave({ codex: { ...(exo.codex || {}), [res.captured.key]: ((exo.codex || {})[res.captured.key] || 0) + 1 } });
    } else {
      const rw = exoVictoryRewards(c, foe);
      c.gold = (c.gold || 0) + rw.gold;
      if (rw.talismanGain) { c.talismans = (c.talismans || 0) + rw.talismanGain; msg.push(`🧿 제령부 +${rw.talismanGain}`); }
      if (rw.drops.length > 0) { c.pendingLoot = [...(c.pendingLoot || []), ...rw.drops]; msg.push(`전리품 ${rw.drops.length}개 — [장착/분해] 판단`); }
      msg.unshift(`명전 +${rw.gold}`);
    }
    // 보스 — 종막 최종보스면 엔딩, 아니면 다음 막
    if (char.room === 'boss') {
      if (foe.final) {
        setEnding({ kills: c.kills, captures: c.captures, school: c.schoolId, ascension: c.ascension });
        onSave({
          char: null,
          clears: (exo.clears || 0) + 1,
          bestAct: EXO_ACTS.length,
          bestAsc: Math.max(exo.bestAsc || 0, (c.ascension || 0) + 1),
        });
        return;
      }
      const nc = actTransitionPatch(c);
      onSave({ char: nc });
      setNotice(`👑 ${act.name} 돌파! 「${getExoAct(nc.actIdx).name}」 — 지역 레벨 ${getExoAct(nc.actIdx).level}. HP 전부 회복 + 🧿 제령부 +1. ${msg.join(' · ')}`);
      return;
    }
    onSave({ char: nextFloorPatch(c) });
    setNotice(msg.join(' · ') || null);
  };

  // ===== 전리품 판단 =====
  const judgeLoot = (equipSlot /* null = 분해 */) => {
    const item = char.pendingLoot?.[0];
    if (!item) return;
    let c = { ...char, pendingLoot: char.pendingLoot.slice(1) };
    if (!equipSlot) {
      const v = exoSalvageValue(item);
      c.gold = (c.gold || 0) + v;
      setNotice(`${item.name} 분해 — 명전 +${v}`);
    } else {
      const old = c.equipped[equipSlot];
      c.equipped = { ...c.equipped, [equipSlot]: item };
      if (old) {
        const v = exoSalvageValue(old);
        c.gold = (c.gold || 0) + v;
        setNotice(`${item.name} 장착 — ${old.name} 분해 (+${v}명전)${old.spirit ? ` · 깃든 «${old.spirit.name}»은 소멸했다` : ''}`);
      } else setNotice(`${item.name} 장착.`);
    }
    onSave({ char: c });
  };

  // ===== 사령 빙의 =====
  const imbue = (spiritIdx, slotId) => {
    const sp = char.spirits?.[spiritIdx];
    const it = char.equipped?.[slotId];
    if (!sp || !it) return;
    const c = {
      ...char,
      spirits: char.spirits.filter((_, i) => i !== spiritIdx),
      equipped: { ...char.equipped, [slotId]: { ...it, spirit: sp } },
    };
    onSave({ char: c });
    setNotice(`🕯 «${sp.name}» → ${it.name} 빙의${it.spirit ? ` (기존 «${it.spirit.name}» 소멸)` : ''} — ${exoSpiritDesc(sp)}`);
  };
  const releaseSpirit = (spiritIdx) => {
    const sp = char.spirits?.[spiritIdx];
    if (!sp) return;
    const gold = 15 + sp.lv * 3;
    onSave({ char: { ...char, spirits: char.spirits.filter((_, i) => i !== spiritIdx), gold: (char.gold || 0) + gold } });
    setNotice(`«${sp.name}» 방생 — 명전 +${gold}`);
  };

  // ===== 방 행동 =====
  const buyShopItem = (i) => {
    const rd = char.roomData;
    const entry = rd?.items?.[i];
    if (!entry || rd.bought.includes(i) || char.gold < entry.price) return;
    onSave({ char: { ...char, gold: char.gold - entry.price, pendingLoot: [...(char.pendingLoot || []), entry.item], roomData: { ...rd, bought: [...rd.bought, i] } } });
  };
  const doRest = () => {
    if (char.roomData?.rested) return;
    const heal = Math.round(d.maxHp * 0.45);
    onSave({ char: { ...char, hp: Math.min(d.maxHp, char.hp + heal), roomData: { rested: true } } });
    setNotice(`위령소 — 혼을 달래고 HP ${heal}을 회복했다.`);
  };
  const takeTreasure = () => {
    if (char.roomData?.taken) return;
    const luck = 1 + (EXO_ASCENSIONS[char.ascension || 0]?.luckBonus || 0);
    const item = rollExoItem({ slot: EXO_SLOT_IDS[Math.floor(Math.random() * EXO_SLOT_IDS.length)], level: act.level, luck });
    onSave({ char: { ...char, pendingLoot: [...(char.pendingLoot || []), item], roomData: { taken: true } } });
  };
  const doOmen = (accept) => {
    const rd = char.roomData;
    if (!rd || rd.done) return;
    if (!accept) { onSave({ char: { ...char, roomData: { ...rd, done: true, text: '운명을 지나쳤다. 그것이 현명했는지는 아무도 모른다.', tone: 'neutral' } } }); return; }
    const r = resolveExoOmen(rd.omenId, char);
    let c = { ...r.char, roomData: { ...rd, done: true, text: r.text, tone: r.tone } };
    if (r.item) c.pendingLoot = [...(c.pendingLoot || []), r.item];
    onSave({ char: c });
  };

  const startRun = () => {
    const c = createExoChar(pickSchool, pickAsc);
    if (!c) return;
    setEnding(null); setNotice(null);
    onSave({ char: c, runs: (exo.runs || 0) + 1 });
  };

  // =========================================================
  // 렌더
  // =========================================================
  if (inBattle && enemy && char) {
    return <ExoBattleScreen key={`${char.actIdx}-${char.floor}-${enemy.key}`} char={char} enemy={enemy} onFinish={handleBattleFinish} />;
  }

  // ===== 엔딩 =====
  if (ending) {
    const school = getExoSchool(ending.school);
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 space-y-4 ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
        <div className="text-[40px]">👑</div>
        <div className="text-[18px] font-bold" style={{ color: PALETTE.legendary }}>무덤의 왕이 잠들다</div>
        <div className="text-[12px] text-center leading-relaxed" style={{ color: PALETTE.textDim }}>
          옥좌는 비었고, 원혼들은 흩어졌다.<br />
          {school.name}의 제령 수행이 하나의 장(章)을 닫는다.<br />
          — 그러나 무덤은 다시 차오른다. 다음 승급이 기다린다.
        </div>
        <div className="px-4 py-3 text-[12px] space-y-1" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.legendary}44`, color: PALETTE.text }}>
          <div>⚔ 처치 <b>{ending.kills}</b> · 🕯 제령 <b>{ending.captures}</b></div>
          <div>난이도 <b style={{ color: PALETTE.legendary }}>{EXO_ASCENSIONS[ending.ascension || 0]?.name}</b> 클리어 — 총 {(exo.clears || 0)}회</div>
          {(ending.ascension || 0) + 1 < EXO_ASCENSIONS.length && <div style={{ color: PALETTE.dawn }}>🔓 「{EXO_ASCENSIONS[(ending.ascension || 0) + 1].name}」 해금!</div>}
        </div>
        <button onClick={() => setEnding(null)} className="ui-press px-8 py-3 text-[13px] font-bold" style={{ borderRadius: R.btn, background: PALETTE.legendary, color: '#0a0608' }}>
          무덤을 나선다
        </button>
      </div>
    );
  }

  // ===== 로비 =====
  if (!char) {
    const maxAsc = Math.min(exo.clears || 0, EXO_ASCENSIONS.length - 1);
    return (
      <div className="h-full flex flex-col" style={{ background: PALETTE.bgDeep }}>
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
          <button onClick={onBack} className="ui-press p-1"><ChevronLeft size={18} color={PALETTE.textDim} /></button>
          <div className="text-[14px] font-bold" style={{ color: PALETTE.text }}>⚱ 제령사(除靈師)</div>
          <div className="text-[10px]" style={{ color: PALETTE.textDim }}>무덤의 유산 — 새 장</div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 ui-screen-enter">
          {notice && <div className="px-3 py-2 text-[11px]" style={{ borderRadius: R.chip, background: `${PALETTE.accent}15`, border: `1px solid ${PALETTE.accent}44`, color: PALETTE.text }}>{notice}</div>}
          <div className="px-3 py-2.5 text-[11px] leading-relaxed" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
            봉인이 풀린 왕릉 — <b style={{ color: PALETTE.text }}>5막 + 종막</b>의 시나리오를 한 번의 런으로 돌파하라.
            막마다 지역 레벨이 크게 뛴다: <b style={{ color: PALETTE.dawn }}>파밍은 막 단위로 다시 시작</b>된다.
            원혼의 HP가 30% 아래로 떨어지면 <b style={{ color: PALETTE.legendary }}>🧿 제령부</b>로 사령을 잡아 장비에 <b style={{ color: PALETTE.legendary }}>빙의</b>시켜라.
          </div>
          <div className="text-[11px] font-bold" style={{ color: PALETTE.textDim }}>유파 선택</div>
          {EXO_SCHOOLS.map(s => (
            <button key={s.id} onClick={() => setPickSchool(s.id)} className="ui-press w-full px-3 py-2.5 text-left"
              style={{ borderRadius: R.btn, background: PALETTE.panel, border: `1px solid ${pickSchool === s.id ? s.color : PALETTE.panelBorder}`, opacity: pickSchool === s.id ? 1 : 0.7 }}>
              <div className="text-[12px] font-bold" style={{ color: s.color }}>{s.icon} {s.name}{pickSchool === s.id ? ' ✓' : ''}</div>
              <div className="text-[10px]" style={{ color: PALETTE.textDim }}>{s.desc}</div>
              <div className="text-[10px]" style={{ color: PALETTE.textDim }}>완력 {s.stats.str} · 영력 {s.stats.spi} · 체력 {s.stats.vit} · 기민 {s.stats.dex}</div>
            </button>
          ))}
          {maxAsc > 0 && (
            <>
              <div className="text-[11px] font-bold" style={{ color: PALETTE.textDim }}>승급 난이도 (클리어 {exo.clears}회 — {EXO_ASCENSIONS[maxAsc].name}까지 해금)</div>
              <div className="flex gap-1.5">
                {EXO_ASCENSIONS.slice(0, maxAsc + 1).map(a => (
                  <button key={a.lv} onClick={() => setPickAsc(a.lv)} className="ui-press flex-1 py-2 text-[11px]"
                    style={{ borderRadius: R.btn, background: pickAsc === a.lv ? PALETTE.panelLight : PALETTE.panel, border: `1px solid ${pickAsc === a.lv ? PALETTE.legendary : PALETTE.panelBorder}`, color: pickAsc === a.lv ? PALETTE.legendary : PALETTE.textDim }}>
                    {a.name}
                  </button>
                ))}
              </div>
              <div className="text-[10px]" style={{ color: PALETTE.textDim }}>{EXO_ASCENSIONS[pickAsc]?.desc}</div>
            </>
          )}
          <button onClick={startRun} className="ui-press ui-sheen w-full py-3 text-[13px] font-bold" style={{ borderRadius: R.btn, background: PALETTE.accent, color: '#fff' }}>
            ⚱ 왕릉에 들어선다
          </button>
          <div className="px-3 py-2.5 text-[11px] space-y-0.5" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
            <div className="font-bold" style={{ color: PALETTE.text }}>📊 기록</div>
            <div>출정 {exo.runs || 0} · 클리어 <b style={{ color: PALETTE.legendary }}>{exo.clears || 0}</b> · 사망 {exo.deaths || 0} · 최고 도달 {exo.bestAct > 0 ? `${getExoAct(exo.bestAct - 1).name}` : '—'}</div>
            <div>🕯 사령 도감 {Object.keys(exo.codex || {}).length} / {EXO_ENEMIES.length}종</div>
          </div>
        </div>
      </div>
    );
  }

  // ===== 던전 =====
  const room = char.room;
  const rd = char.roomData || {};
  const mod = char.floorMod ? EXO_FLOOR_MODS[char.floorMod] : null;
  const pendingItem = (char.pendingLoot || [])[0] || null;
  const omen = room === 'omen' ? EXO_OMENS.find(o => o.id === rd.omenId) : null;

  return (
    <div className="h-full flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 py-2 space-y-1" style={{ background: PALETTE.panel, borderBottom: `1px solid ${act.color}44` }}>
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold" style={{ color: act.color }}>
            {act.finale ? '🏛' : '⚱'} {act.name} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>{char.floor}/{act.floors}층 · 지역 Lv.{act.level}</span>
          </div>
          <button onClick={() => { setManage(true); setManageTab('gear'); }} className="ui-press p-1"><Package size={16} color={PALETTE.dawn} /></button>
        </div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: PALETTE.textDim }}>
          <span style={{ color: PALETTE.text }}>HP {char.hp}/{d.maxHp}</span>
          <span style={{ color: PALETTE.legendary }}>🪙{char.gold}</span>
          <span style={{ color: PALETTE.green }}>🧪{char.potions || 0}</span>
          <span style={{ color: PALETTE.legendary }}>🧿{char.talismans || 0}</span>
          <span style={{ color: PALETTE.ice }}>🕯{(char.spirits || []).length}/{EXO_SPIRIT_CAP}</span>
          {(char.ascension || 0) > 0 && <span style={{ color: PALETTE.accent }}>{EXO_ASCENSIONS[char.ascension].name}</span>}
        </div>
        <div className="w-full overflow-hidden" style={{ height: 6, borderRadius: 4, background: '#00000055' }}>
          <div style={{ width: `${char.hp / d.maxHp * 100}%`, height: '100%', background: PALETTE.green, transition: 'width .25s' }} />
        </div>
        {mod && <div className="text-[10px]" style={{ color: PALETTE.dawn }}>{mod.icon} 변이 층 「{mod.name}」 — {mod.desc}</div>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 ui-screen-enter">
        {notice && <div className="px-3 py-2 text-[11px] leading-relaxed" style={{ borderRadius: R.chip, background: `${PALETTE.dawn}12`, border: `1px solid ${PALETTE.dawn}44`, color: PALETTE.text }}>{notice}</div>}

        {/* 전리품 판단 */}
        {pendingItem && (
          <div className="space-y-1.5 px-2.5 py-2.5" style={{ borderRadius: R.panel, background: PALETTE.panel, border: `1px solid ${PALETTE.legendary}55` }}>
            <div className="text-[11px] font-bold" style={{ color: PALETTE.legendary }}>📦 전리품 판단 {char.pendingLoot.length > 1 ? `(+${char.pendingLoot.length - 1} 대기)` : ''}</div>
            <ItemCard item={pendingItem} />
            {(() => {
              const slots = pendingItem.slot === 'acc' ? ['acc1', 'acc2'] : [pendingItem.slot];
              return slots.map(s => {
                const cur = char.equipped?.[s];
                return (
                  <div key={s} className="space-y-1">
                    {cur && <div className="text-[10px]" style={{ color: PALETTE.textDim }}>현재 {EXO_SLOTS[s].name}:</div>}
                    {cur && <ItemCard item={cur} dim />}
                    <Btn onClick={() => judgeLoot(s)} color={PALETTE.accent} bold>
                      {EXO_SLOTS[s].name}에 장착{cur ? ' (기존 분해)' : ''}
                    </Btn>
                  </div>
                );
              });
            })()}
            <Btn onClick={() => judgeLoot(null)}>분해한다 — 명전 +{exoSalvageValue(pendingItem)}</Btn>
          </div>
        )}

        {/* 방 선택 */}
        {!room && !pendingItem && (char.offers || []).map((o, i) => {
          const rm = EXO_ROOMS[o.type];
          return (
            <button key={i} onClick={() => enterRoom(o.type)} className="ui-press w-full px-3 py-3 text-left"
              style={{ borderRadius: R.btn, background: PALETTE.panel, border: `1px solid ${rm.color}66` }}>
              <div className="text-[12px] font-bold" style={{ color: rm.color }}>{rm.icon} {rm.name}</div>
              <div className="text-[10px]" style={{ color: PALETTE.textDim }}>{rm.desc}</div>
            </button>
          );
        })}
        {!room && !pendingItem && (
          <div className="px-3 py-2 text-[10px]" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
            한 층에서는 하나의 방만 고를 수 있다.{act.finale ? ' 종막 — 되돌아갈 길은 없다.' : char.floor === act.floors ? ' 이 층의 끝에 지배자가 있다.' : ''}
          </div>
        )}

        {/* 상점 */}
        {room === 'shop' && (
          <div className="space-y-1.5">
            <div className="text-[12px] font-bold" style={{ color: EXO_ROOMS.shop.color }}>🏮 저승 상인 — 보유 🪙{char.gold}</div>
            {(rd.items || []).map((e, i) => (
              <ItemCard key={i} item={e.item} dim={rd.bought.includes(i)}
                right={
                  <button onClick={() => buyShopItem(i)} disabled={rd.bought.includes(i) || char.gold < e.price}
                    className="ui-press px-2.5 py-1.5 text-[11px] font-bold shrink-0"
                    style={{ borderRadius: R.chip, background: PALETTE.panel, color: rd.bought.includes(i) ? PALETTE.textDim : char.gold >= e.price ? PALETTE.legendary : PALETTE.textDim, border: `1px solid ${PALETTE.panelBorder}` }}>
                    {rd.bought.includes(i) ? '판매됨' : `🪙${e.price}`}
                  </button>
                } />
            ))}
            <Btn onClick={() => { if (char.gold >= rd.potionPrice) { onSave({ char: { ...char, gold: char.gold - rd.potionPrice, potions: (char.potions || 0) + 1 } }); } }} disabled={char.gold < rd.potionPrice}>
              🧪 성수 구매 — 🪙{rd.potionPrice}
            </Btn>
            <Btn onClick={() => { if (char.gold >= rd.talismanPrice) { onSave({ char: { ...char, gold: char.gold - rd.talismanPrice, talismans: (char.talismans || 0) + 1 } }); } }} disabled={char.gold < rd.talismanPrice}>
              🧿 제령부 구매 — 🪙{rd.talismanPrice}
            </Btn>
            <Btn onClick={advance}>다음 층으로</Btn>
          </div>
        )}

        {/* 위령소 */}
        {room === 'rest' && (
          <div className="space-y-1.5">
            <div className="text-[12px] font-bold" style={{ color: EXO_ROOMS.rest.color }}>🕯 위령소</div>
            <Btn onClick={doRest} disabled={rd.rested} color={rd.rested ? null : PALETTE.panelLight}>
              {rd.rested ? '이미 혼을 달랬다' : '혼을 달랜다 — HP 45% 회복 (1회)'}
            </Btn>
            <Btn onClick={advance}>다음 층으로</Btn>
          </div>
        )}

        {/* 부장품 */}
        {room === 'treasure' && (
          <div className="space-y-1.5">
            <div className="text-[12px] font-bold" style={{ color: EXO_ROOMS.treasure.color }}>📦 부장품</div>
            <Btn onClick={takeTreasure} disabled={rd.taken} color={rd.taken ? null : PALETTE.accent} bold={!rd.taken}>
              {rd.taken ? '관은 비었다' : '관을 연다'}
            </Btn>
            <Btn onClick={advance}>다음 층으로</Btn>
          </div>
        )}

        {/* 운명 (기연) */}
        {room === 'omen' && omen && (
          <div className="space-y-1.5">
            <div className="text-[12px] font-bold" style={{ color: EXO_ROOMS.omen.color }}>🌠 운명 — {omen.icon} {omen.name}</div>
            <div className="text-[11px] leading-relaxed px-3 py-2.5" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px solid ${EXO_ROOMS.omen.color}44`, color: PALETTE.textDim }}>
              {omen.text}
            </div>
            {rd.text && (
              <div className="px-3 py-2 text-[11px] leading-relaxed" style={{ borderRadius: R.chip, background: rd.tone === 'bad' ? `${PALETTE.accent}15` : rd.tone === 'good' ? `${PALETTE.green}12` : PALETTE.panel, border: `1px solid ${rd.tone === 'bad' ? PALETTE.accent : rd.tone === 'good' ? PALETTE.green : PALETTE.panelBorder}55`, color: PALETTE.text }}>
                {rd.text}
              </div>
            )}
            {!rd.done && <Btn onClick={() => doOmen(true)} color={PALETTE.accent} bold>{omen.accept}</Btn>}
            {!rd.done && <Btn onClick={() => doOmen(false)}>{omen.refuse}</Btn>}
            {rd.done && <Btn onClick={advance}>다음 층으로</Btn>}
          </div>
        )}
      </div>

      {/* ===== 관리 시트 — 장비 / 사령부 ===== */}
      {manage && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setManage(false)}>
          <div className="w-full px-3 pb-4 pt-3 max-h-[80%] overflow-y-auto space-y-1.5" onClick={e => e.stopPropagation()}
            style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${PALETTE.dawn}66`, borderRadius: '18px 18px 0 0' }}>
            <div className="flex gap-1.5">
              {[['gear', '🎒 장비'], ['spirits', `🕯 사령부 ${(char.spirits || []).length}/${EXO_SPIRIT_CAP}`]].map(([t, lbl]) => (
                <button key={t} onClick={() => setManageTab(t)} className="ui-press flex-1 py-2 text-[12px] font-bold"
                  style={{ borderRadius: R.btn, background: manageTab === t ? PALETTE.panelLight : PALETTE.panel, color: manageTab === t ? PALETTE.text : PALETTE.textDim, border: `1px solid ${PALETTE.panelBorder}` }}>
                  {lbl}
                </button>
              ))}
            </div>
            {manageTab === 'gear' && (
              <>
                <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
                  완력 {d.phys} · 영력 {d.spirit} · 방어 {d.def} · 치명 {d.crit}% · 회피 {d.dodge}% · 브레이크 +{d.breakPct}%
                </div>
                {EXO_SLOT_IDS.map(s => {
                  const it = char.equipped?.[s];
                  return it
                    ? <ItemCard key={s} item={it} />
                    : <div key={s} className="px-2.5 py-2 text-[11px]" style={{ borderRadius: R.chip, background: PALETTE.panel, border: `1px dashed ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>{EXO_SLOTS[s].icon} {EXO_SLOTS[s].name} — 비어 있음</div>;
                })}
              </>
            )}
            {manageTab === 'spirits' && (
              <>
                <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
                  🧿 제령부 {char.talismans || 0}장 보유. 잡은 사령은 장비에 <b style={{ color: PALETTE.legendary }}>빙의</b>시켜야 힘이 된다 (장비당 1체 · 장비를 버리면 소멸).
                </div>
                {(char.spirits || []).length === 0 && <div className="px-3 py-3 text-[11px] text-center" style={{ color: PALETTE.textDim }}>아직 잡은 사령이 없다 — 적 HP 30% 이하에서 🧿 제령을 시도하라.</div>}
                {(char.spirits || []).map((sp, i) => (
                  <div key={i} className="px-2.5 py-2 space-y-1" style={{ borderRadius: R.chip, background: PALETTE.panelLight, border: `1px solid ${sp.rank === 'boss' ? PALETTE.legendary : sp.rank === 'elite' ? PALETTE.accent : PALETTE.panelBorder}66` }}>
                    <div className="text-[11px] font-bold" style={{ color: sp.rank === 'boss' ? PALETTE.legendary : PALETTE.text }}>
                      {sp.icon} {sp.name} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>Lv.{sp.lv}{sp.amplified ? ' · 공명 강화' : ''}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: PALETTE.dawn }}>{exoSpiritDesc(sp)}</div>
                    <div className="flex flex-wrap gap-1">
                      {EXO_SLOT_IDS.filter(s => char.equipped?.[s]).map(s => (
                        <button key={s} onClick={() => imbue(i, s)} className="ui-press px-2 py-1 text-[10px]"
                          style={{ borderRadius: R.chip, background: PALETTE.panel, color: char.equipped[s].spirit ? PALETTE.accent : PALETTE.ice, border: `1px solid ${PALETTE.panelBorder}` }}>
                          → {EXO_SLOTS[s].icon}{char.equipped[s].spirit ? '교체' : '빙의'}
                        </button>
                      ))}
                      <button onClick={() => releaseSpirit(i)} className="ui-press px-2 py-1 text-[10px]"
                        style={{ borderRadius: R.chip, background: PALETTE.panel, color: PALETTE.textDim, border: `1px solid ${PALETTE.panelBorder}` }}>
                        방생 +🪙{15 + sp.lv * 3}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            <Btn onClick={() => setManage(false)}>닫기</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
