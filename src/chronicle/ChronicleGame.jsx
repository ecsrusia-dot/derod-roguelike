// ============================================
// chronicle/ChronicleGame.jsx — 황혼 연대기 (전통 RPG) 화면
// ============================================
// 로직은 engine.js 순수 함수. 전투는 시작 순간 끝까지 계산·저장하고 화면은 재생만 한다
// (재생 중 새로고침해도 보상 중복·유실 없음).
// 저장: localStorage CHRONICLE_SAVE_KEY — 본편·아르카나와 완전 분리.
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Coins } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../components/ui/CommonUI.jsx';
import {
  CHRONICLE_TITLE, CHRONICLE_SUB, CHRONICLE_SAVE_KEY, CHRONICLE_TUNING, CHRONICLE_CLASSES, CHRONICLE_FIELDS,
  CHRONICLE_DUNGEON, STAT_META, STAT_KEYS, SKILL_MAX_LV, MASTERY_PCT, BOSS_DAILY_LIMIT, GRADES, gradeIdx, SLOTS, FORGE,
  chronicleClass, classSkills, describeSkill, chronicleEnemyArt,
} from './data.js';
import * as E from './engine.js';
import * as Q from './quest.js';
import { NPCS } from './story.js';
import { ENEMIES } from '../data/enemies.js';

const FONT_TITLE = '"Cinzel", "Noto Serif KR", serif';

function loadSave() {
  try { const raw = localStorage.getItem(CHRONICLE_SAVE_KEY); return raw ? Q.ensureQuestFields(JSON.parse(raw)) : null; } catch { return null; }
}
function writeSave(s) {
  try { if (s) localStorage.setItem(CHRONICLE_SAVE_KEY, JSON.stringify(s)); else localStorage.removeItem(CHRONICLE_SAVE_KEY); } catch { /* 저장 불가 */ }
}

// ===== 작은 부품 =====
const gradeOf = (id) => GRADES[gradeIdx(id)] || GRADES[0];
// 받침 여부로 이/가 고르기
const iga = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? `${w}이` : `${w}가`; };
function statLine(st) {
  const p = [];
  if (st.atk) p.push(`공격 ${st.atk}`);
  if (st.def) p.push(`방어 ${st.def}`);
  if (st.hp) p.push(`HP ${st.hp}`);
  if (st.crit) p.push(`치명 ${Math.round(st.crit * 1000) / 10}%`);
  if (st.spd) p.push(`속도 ${st.spd}`);
  if (st.critDmg) p.push(`치명 피해 +${Math.round(st.critDmg * 100)}%`);
  if (st.hpPct) p.push(`HP +${Math.round(st.hpPct * 100)}%`);
  if (st.atkPct) p.push(`공격 +${Math.round(st.atkPct * 100)}%`);
  return p.join(' · ');
}
function Header({ title, onBack, right }) {
  return (
    <div className="flex items-center gap-2 px-3 flex-none" style={{ minHeight: 54, borderBottom: '1px solid var(--ui-line)' }}>
      {onBack && (
        <button onClick={onBack} aria-label="뒤로" className="ui-press flex items-center justify-center flex-none" style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.dawn }}>
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex-1 font-semibold truncate" style={{ fontSize: 16, color: PALETTE.text }}>{title}</div>
      {right}
    </div>
  );
}
function Wallet({ save }) {
  return (
    <div className="flex items-center gap-2 flex-none" style={{ fontSize: 12 }}>
      <span className="flex items-center gap-0.5" style={{ color: PALETTE.legendary }}><Coins size={13} />{save.gold}</span>
      <span style={{ color: '#9fd18a' }}>✦{save.mats.essence}</span>
      <span style={{ color: '#c08ae8' }}>◆{save.mats.shard}</span>
    </div>
  );
}
function Bar({ v, max, color, h = 8, shield = 0 }) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  const sp = Math.max(0, Math.min(100 - pct, (shield / Math.max(1, max)) * 100));
  return (
    <div className="flex overflow-hidden" style={{ height: h, borderRadius: 999, background: '#0008', border: '1px solid #ffffff14' }}>
      <div style={{ width: `${pct}%`, background: color, transition: 'width .25s ease' }} />
      {sp > 0 && <div style={{ width: `${sp}%`, background: '#9cc4e4aa' }} />}
    </div>
  );
}
function ItemRow({ save, item, onClick, right }) {
  const g = gradeOf(item.grade);
  const by = E.equippedBy(save, item.uid);
  const slot = SLOTS.find(s => s.id === item.slot);
  return (
    <button onClick={onClick} className="ui-press w-full flex items-center gap-2.5 text-left" style={{ padding: '8px 10px', borderRadius: 12, background: `${g.color}10`, border: `1px solid ${g.color}55` }}>
      <div className="flex-none flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: '#000', fontSize: 17, border: `1px solid ${g.color}88` }}>{slot?.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold" style={{ fontSize: 13, color: g.color }}>
          {E.itemName(item)}{item.plus ? ` +${item.plus}` : ''} <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>{g.label} · Lv.{item.ilv}</span>
        </div>
        <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{statLine(E.itemStats(item))}</div>
      </div>
      {right ?? (by && <span className="flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>{chronicleClass(by).name} 착용</span>)}
    </button>
  );
}
function Portrait({ cid, size = 44, dim = false }) {
  const c = chronicleClass(cid);
  return <img src={c.image} alt={c.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: `1.5px solid ${c.color}`, filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}

// ===== 전투 재생 =====
const SPEEDS = [1, 2, 4];
function BattleView({ battle, save, onDone, repeat, onToggleRepeat, onAgain }) {
  const { sim, enemies, party, summary, ctx } = battle;
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(() => { try { return +localStorage.getItem('chronicleSpeed') || 2; } catch { return 2; } });
  const done = idx >= sim.events.length;
  useEffect(() => {
    if (done) return undefined;
    const ev = sim.events[idx];
    const base = ev.round ? 160 : ev.k === 'dotTick' ? 380 : 620;
    const t = setTimeout(() => setIdx(i => i + 1), base / speed);
    return () => clearTimeout(t);
  }, [idx, speed, done, sim.events]);
  // 반복 사냥: 승리 후 자동 다음 전투
  useEffect(() => {
    if (!done || !repeat || sim.result !== 'win' || ctx.kind !== 'field' || ctx.type === 'boss') return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, repeat, sim.result, ctx, onAgain]);
  const setSp = (s) => { setSpeed(s); try { localStorage.setItem('chronicleSpeed', String(s)); } catch { /* */ } };

  const cur = sim.events[Math.min(idx, sim.events.length - 1)];
  // 최신 상태 스냅샷 (st가 있는 마지막 사건)
  let st = null;
  for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) { if (sim.events[i].st) { st = sim.events[i].st; break; } }
  const hpOf = (u) => (st && st[u.id] ? st[u.id][0] : u.hp);
  const shOf = (u) => (st && st[u.id] ? st[u.id][1] : 0);
  const nameOf = (id) => [...party, ...enemies].find(u => u.id === id)?.name || '';
  const recent = sim.events.slice(0, idx + 1).filter(e => e.a).slice(-4).reverse();
  const curHits = cur && cur.a ? cur.hits || [] : [];
  const hitFor = (id) => curHits.filter(h => h.t === id);
  const round = (() => { for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) if (sim.events[i].round) return sim.events[i].round; return 1; })();
  const isBoss = ctx.type === 'boss' || ctx.type === 'dungeonBoss';
  const bg = isBoss ? chronicleEnemyArt(enemies[0].key, 'intro') : null;

  const Float = ({ id }) => hitFor(id).map((h, i) => {
    const txt = h.m ? '빗나감' : h.h ? `+${h.h}` : h.s ? `🛡${h.s}` : h.buff ? '강화' : h.dot && h.d == null ? '중독' : h.d != null ? `${h.counter ? '반격 ' : ''}-${h.d}${h.c ? '!' : ''}` : '';
    const color = h.m ? '#bbb' : h.h ? '#8fe08a' : h.s ? '#9cc4e4' : h.buff ? '#e8c48a' : h.c ? '#ffd27a' : '#ff8a80';
    if (!txt) return null;
    return <div key={`${idx}-${i}`} className="arc-float absolute font-bold pointer-events-none" style={{ left: '50%', top: '30%', fontSize: h.c ? 18 : 15, color, textShadow: '0 2px 5px #000', animationDelay: `${i * 80}ms` }}>{txt}</div>;
  });

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bg }}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.18 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div className="relative flex items-center gap-2 px-3 pt-2 flex-none" style={{ minHeight: 44 }}>
        <span style={{ fontSize: 12, color: PALETTE.textDim }}>{ctx.label} · {round}라운드</span>
        <div className="flex-1" />
        {SPEEDS.map(s => (
          <button key={s} onClick={() => setSp(s)} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: `1px solid ${speed === s ? PALETTE.legendary : 'var(--ui-line)'}`, color: speed === s ? PALETTE.legendary : PALETTE.textDim, background: 'transparent' }}>×{s}</button>
        ))}
        {!done && <button onClick={() => setIdx(sim.events.length)} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: '1px solid var(--ui-line)', color: PALETTE.dawn, background: 'transparent' }}>⏩</button>}
      </div>

      {/* 적 */}
      <div className="relative flex gap-2 px-3 pt-1 flex-none">
        {enemies.map(e => {
          const hp = hpOf(e);
          const dead = hp <= 0;
          const acting = cur?.a === e.id;
          return (
            <div key={e.id} className={`relative flex-1 min-w-0 ${hitFor(e.id).some(h => h.d > 0) ? 'arc-shake' : ''}`} style={{ opacity: dead ? 0.3 : 1, transition: 'opacity .3s' }}>
              <div className="relative overflow-hidden" style={{ borderRadius: 12, aspectRatio: enemies.length === 1 ? '16 / 10' : '3 / 4', border: `1.5px solid ${acting ? '#ff8a80' : e.tier === 'boss' ? '#c4453d88' : e.tier === 'elite' ? '#e8b04a88' : 'var(--ui-line)'}` }}>
                <img src={chronicleEnemyArt(e.key)} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: dead ? 'grayscale(1)' : 'none' }} draggable={false} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, #000c)' }} />
                <div className="absolute bottom-1 left-1.5 right-1.5">
                  <div className="truncate" style={{ fontSize: 11, color: '#fff', textShadow: '0 1px 2px #000' }}>Lv.{e.lv} {e.name}</div>
                  <Bar v={hp} max={e.maxHp} color="linear-gradient(90deg,#8b1f1f,#e0574c)" h={6} />
                </div>
              </div>
              <Float id={e.id} />
            </div>
          );
        })}
      </div>

      {/* 행동 */}
      <div className="relative flex-1 min-h-0 px-4 pt-3 flex flex-col justify-center">
        {cur?.a && (
          <div className="text-center" style={{ fontSize: 15, color: cur.skill ? PALETTE.legendary : PALETTE.text, fontWeight: 600 }}>
            {nameOf(cur.a)} — {cur.n}
          </div>
        )}
        <div className="mt-2 flex flex-col gap-0.5 overflow-hidden">
          {recent.map((e, i) => (
            <div key={i} className="truncate" style={{ fontSize: 11.5, color: i === 0 ? PALETTE.text : PALETTE.textDim, opacity: 1 - i * 0.2 }}>
              {nameOf(e.a)} · {e.n}{(e.hits || []).filter(h => h.d > 0).length ? ` → ${(e.hits || []).filter(h => h.d > 0).map(h => `${nameOf(h.t)} ${h.d}`).join(', ')}` : ''}
            </div>
          ))}
        </div>
      </div>

      {/* 파티 */}
      <div className="relative grid grid-cols-2 gap-2 px-3 pb-2 flex-none">
        {party.map(p => {
          const hp = hpOf(p);
          const acting = cur?.a === p.id;
          return (
            <div key={p.id} className={`relative flex items-center gap-2 ${hitFor(p.id).some(h => h.d > 0) ? 'arc-shake' : ''}`} style={{ padding: 7, borderRadius: 12, background: acting ? `${chronicleClass(p.classId).color}26` : 'rgba(255,255,255,0.03)', border: `1px solid ${acting ? chronicleClass(p.classId).color : 'var(--ui-line)'}` }}>
              <Portrait cid={p.classId} size={38} dim={hp <= 0} />
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.text }}>Lv.{p.lv} {p.name}</div>
                <Bar v={hp} max={p.maxHp} shield={shOf(p)} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} />
                <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>{hp}/{p.maxHp}</div>
              </div>
              <Float id={p.id} />
            </div>
          );
        })}
      </div>

      {/* 결과 */}
      {done && (
        <div className="relative flex-none px-3 pb-3">
          <GlassPanel strong className="p-3">
            <div className="font-bold text-center" style={{ fontSize: 17, color: sim.result === 'win' ? PALETTE.legendary : '#e06a5f', fontFamily: FONT_TITLE }}>
              {sim.result === 'win' ? '승리' : '전멸'}
            </div>
            {sim.result === 'win' ? (
              <div className="mt-1.5 flex flex-col gap-1" style={{ fontSize: 12.5, color: PALETTE.text }}>
                <div className="text-center">경험치 +{summary.exp} · 🪙 +{summary.gold} · ✦ +{summary.essence}{summary.shard ? ` · ◆ +${summary.shard}` : ''}</div>
                {Object.entries(summary.levelUps).map(([cid, lv]) => (
                  <div key={cid} className="text-center" style={{ color: PALETTE.legendary }}>▲ {chronicleClass(cid).name} Lv.{lv} 달성!</div>
                ))}
                {summary.items.map(it => (
                  <div key={it.uid} className="text-center" style={{ color: gradeOf(it.grade).color }}>획득: {E.itemName(it)} ({gradeOf(it.grade).label})</div>
                ))}
                {summary.autoDismantled ? <div className="text-center" style={{ color: PALETTE.textDim }}>가방이 가득 차 {summary.autoDismantled}개 자동 분해</div> : null}
                {summary.recruit && <div className="text-center font-semibold" style={{ color: '#9fd18a' }}>✚ {iga(chronicleClass(summary.recruit).name)} 동료가 되었다!</div>}
                {summary.unlocks.map(u => <div key={u} className="text-center" style={{ color: '#9cc4e4' }}>🔓 {u} 개방</div>)}
                {summary.dungeonClear && <div className="text-center font-semibold" style={{ color: '#c08ae8' }}>던전 정복!</div>}
                {(summary.questsDone || []).map(t => <div key={t} className="text-center font-semibold" style={{ color: PALETTE.dawn }}>📜 의뢰 완료: {t} — 게시판에서 보상</div>)}
              </div>
            ) : (
              <div className="mt-1 text-center" style={{ fontSize: 12.5, color: PALETTE.textDim }}>
                {ctx.kind === 'dungeon' ? '던전에서 쫓겨났다.' : `마을로 돌아간다.${summary.goldLost ? ` (골드 -${summary.goldLost})` : ''}`}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              {ctx.kind === 'field' && ctx.type !== 'boss' && sim.result === 'win' && (
                <UIButton variant={repeat ? 'gold' : 'ghost'} style={{ height: 42 }} onClick={onToggleRepeat}>{repeat ? '반복 중… (끄기)' : '반복 사냥'}</UIButton>
              )}
              <UIButton style={{ height: 42 }} onClick={onDone}>{ctx.kind === 'dungeon' && sim.result === 'win' && !summary.dungeonClear ? '다음 층으로' : '계속'}</UIButton>
            </div>
            {ctx.kind === 'field' && sim.result === 'win' && ctx.type !== 'boss' && (
              <button onClick={onAgain} className="ui-press w-full mt-2" style={{ fontSize: 12.5, color: PALETTE.dawn, background: 'transparent', border: 'none', padding: 6 }}>한 번 더 사냥</button>
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

// ===== 마을 =====
function TownView({ save, go, onExit }) {
  const hero = save.units[save.hero];
  const alertParty = Object.values(save.units).some(u => u.points > 0 || u.sp > 0);
  const nextField = CHRONICLE_FIELDS.find(f => !save.progress.bossCleared[f.id]);
  const main = Q.currentMainQuest(save);
  const goal = nextField
    ? `${main ? `[${main.title}] ` : ''}${nextField.name} — 처치 ${Math.min(save.progress.fieldKills[nextField.id] || 0, nextField.bossKills)}/${nextField.bossKills} 후 보스`
    : main ? `[${main.title}] 보상을 받으러 게시판으로` : '1부 완결! 던전에서 에픽 장비를 노리자';
  const qBadge = Q.questBadgeCount(save);
  const tiles = [
    { id: 'quests', icon: '📜', label: '의뢰 게시판', sub: qBadge ? `새 소식 ${qBadge}건` : '메인 · 의뢰 · 이야기', badge: qBadge > 0 },
    { id: 'field', icon: '⚔', label: '사냥터', sub: '몹 사냥 · 보스' },
    { id: 'dungeon', icon: '🕳', label: '던전', sub: E.dungeonUnlocked(save) ? CHRONICLE_DUNGEON.name : '죽은 자의 숲 보스 후 개방', locked: !E.dungeonUnlocked(save) },
    { id: 'party', icon: '👥', label: '파티 · 성장', sub: '능력치 · 스킬 · 장비', badge: alertParty },
    { id: 'bag', icon: '🎒', label: '가방', sub: `${save.inventory.length}/${CHRONICLE_TUNING.inventoryMax}` },
    { id: 'forge', icon: '⚒', label: '대장간', sub: '강화 · 등급 승급' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_2/twilightChild_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.16 }} />
      <div className="relative flex items-center gap-2 px-3 flex-none" style={{ minHeight: 54, borderBottom: '1px solid var(--ui-line)' }}>
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: 15, color: PALETTE.text }}>여명의 마을</div>
          <div style={{ fontSize: 11, color: PALETTE.textDim }}>{CHRONICLE_TITLE}</div>
        </div>
        <Wallet save={save} />
      </div>
      <div className="relative flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <GlassPanel className="p-3">
          <div style={{ fontSize: 11, color: PALETTE.textDim }}>파티 ({save.party.length}/4)</div>
          <div className="flex gap-2 mt-1.5">
            {save.party.map(cid => (
              <div key={cid} className="flex flex-col items-center" style={{ width: 60 }}>
                <Portrait cid={cid} size={50} />
                <div style={{ fontSize: 11, color: PALETTE.text }}>Lv.{save.units[cid].lv}</div>
                <div className="truncate w-full text-center" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{chronicleClass(cid).role}</div>
              </div>
            ))}
          </div>
          <div className="mt-2" style={{ fontSize: 12, color: PALETTE.dawn }}>▶ {goal}</div>
          <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>경험치 {hero.exp}/{CHRONICLE_TUNING.expNeed(hero.lv)}</div>
          <Bar v={hero.exp} max={CHRONICLE_TUNING.expNeed(hero.lv)} color={PALETTE.legendary} h={5} />
        </GlassPanel>
        <div className="grid grid-cols-2 gap-2.5 ui-stagger">
          {tiles.map(t => (
            <button key={t.id} disabled={t.locked} onClick={() => go(t.id)} className="ui-press relative text-left" style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--ui-line-strong)', opacity: t.locked ? 0.45 : 1, minHeight: 92 }}>
              <div style={{ fontSize: 24 }}>{t.icon}</div>
              <div className="font-semibold mt-1" style={{ fontSize: 14, color: PALETTE.text }}>{t.label}</div>
              <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{t.sub}</div>
              {t.badge && <span className="absolute" style={{ top: 10, right: 10, width: 9, height: 9, borderRadius: 999, background: '#e06a5f' }} />}
            </button>
          ))}
          <button onClick={onExit} className="ui-press text-left" style={{ padding: 14, borderRadius: 16, background: 'transparent', border: '1px dashed var(--ui-line-strong)', minHeight: 92 }}>
            <div style={{ fontSize: 24 }}>⇄</div>
            <div className="font-semibold mt-1" style={{ fontSize: 14, color: PALETTE.dawn }}>게임 선택</div>
            <div style={{ fontSize: 11, color: PALETTE.textDim }}>진행은 자동 저장</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 사냥터 =====
function FieldView({ save, onBack, onFight, playScene, sceneOpen }) {
  const [sel, setSel] = useState(() => [...CHRONICLE_FIELDS].reverse().find(f => E.fieldUnlocked(save, f.id))?.id || 1);
  useEffect(() => { if (!sceneOpen) playScene({ at: 'field', fieldId: sel }); }, [sel, sceneOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = CHRONICLE_FIELDS[sel - 1];
  const kills = save.progress.fieldKills[f.id] || 0;
  const bossReady = kills >= f.bossKills;
  const cleared = !!save.progress.bossCleared[f.id];
  const nextComp = E.companionOrder(save.hero)[f.id - 1];
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사냥터" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {CHRONICLE_FIELDS.map(x => {
          const open = E.fieldUnlocked(save, x.id);
          return (
            <button key={x.id} disabled={!open} onClick={() => setSel(x.id)} className="ui-press flex-1" style={{ height: 40, borderRadius: 10, fontSize: 12, border: `1px solid ${sel === x.id ? x.color : 'var(--ui-line)'}`, color: open ? (sel === x.id ? x.color : PALETTE.text) : PALETTE.textDim, background: sel === x.id ? `${x.color}1c` : 'transparent', opacity: open ? 1 : 0.4 }}>
              {open ? `${x.id}. ${x.name.split(' ').pop()}` : '🔒'}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 9', border: `1px solid ${f.color}88` }}>
          <img src={chronicleEnemyArt(f.normals[0])} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 18, color: PALETTE.text }}>{f.name}</div>
            <div style={{ fontSize: 12, color: f.color }}>몹 Lv.{f.lv[0]}~{f.lv[1]} · 보스 Lv.{f.bossLv}</div>
          </div>
        </div>
        <GlassPanel className="p-3">
          <div className="flex justify-between" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <span>보스 도전까지 처치</span><span className="font-semibold">{Math.min(kills, f.bossKills)}/{f.bossKills}</span>
          </div>
          <div className="mt-1"><Bar v={Math.min(kills, f.bossKills)} max={f.bossKills} color={f.color} h={6} /></div>
          <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>
            출몰: 일반 {f.normals.length}종 · 강적 {Math.round(CHRONICLE_TUNING.eliteChance * 100)}% 확률<br />
            {cleared ? `보스 처치 완료 — 재도전은 하루 ${BOSS_DAILY_LIMIT}회 (희귀 장비 확정)` : nextComp && !save.units[nextComp] ? `보스를 쓰러뜨리면 ${iga(chronicleClass(nextComp).name)} 동료가 된다` : '보스를 쓰러뜨리면 다음 지역이 열린다'}
          </div>
        </GlassPanel>
        <UIButton onClick={() => onFight(f, false)}>사냥 시작</UIButton>
        {(() => {
          const left = E.bossAttemptsLeft(save, f.id);
          const bossName = E.rollFieldEncounter(f, () => 0, true).enemies[0].name;
          if (!bossReady && !cleared) return <UIButton variant="gold" disabled>{`보스 잠김 (처치 ${f.bossKills - kills} 남음)`}</UIButton>;
          if (cleared && left <= 0) return <UIButton variant="gold" disabled>보스 재도전 — 오늘 횟수 소진 (0시 초기화)</UIButton>;
          return (
            <UIButton variant="gold" onClick={() => onFight(f, true)}>
              {cleared ? `보스 재도전 — ${bossName} (오늘 ${left}/${BOSS_DAILY_LIMIT})` : `보스 도전 — ${bossName}`}
            </UIButton>
          );
        })()}
      </div>
    </div>
  );
}

// ===== 던전 =====
function DungeonView({ save, onBack, onEnter, onFight, onLeave }) {
  const d = save.dungeon;
  const D = CHRONICLE_DUNGEON;
  const party = E.partyCombatants(save, d?.hp);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={D.name} onBack={d ? null : onBack} right={<Wallet save={save} />} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 9', border: `1px solid ${D.color}88` }}>
          <img src={chronicleEnemyArt('champ_frost_boss4')} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3" style={{ fontSize: 12, color: PALETTE.textDim }}>{D.desc}</div>
        </div>
        <div className="flex gap-1.5">
          {D.floors.map((f, i) => {
            const curF = d && d.floor === i;
            const past = d && d.floor > i;
            return (
              <div key={i} className="flex-1 text-center" style={{ padding: '8px 0', borderRadius: 10, fontSize: 11.5, border: `1px solid ${curF ? D.color : 'var(--ui-line)'}`, color: past ? PALETTE.textDim : curF ? D.color : PALETTE.text, background: curF ? `${D.color}1c` : 'transparent' }}>
                {f.boss ? '👑' : `${i + 1}층`}<br /><span style={{ fontSize: 10.5 }}>Lv.{f.lv}</span>
              </div>
            );
          })}
        </div>
        <GlassPanel className="p-3 flex flex-col gap-2">
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{d ? '파티 상태 — 층 사이 회복 없음' : `권장 Lv.${D.recLv} · 보스: 에픽 장비 2개 중 45% · ◆ 고대 파편`}</div>
          {party.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <Portrait cid={p.classId} size={30} dim={p.hp <= 0} />
              <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} /></div>
              <span style={{ fontSize: 11, color: PALETTE.textDim, width: 70, textAlign: 'right' }}>{p.hp}/{p.maxHp}</span>
            </div>
          ))}
        </GlassPanel>
        {!d ? (
          <UIButton onClick={onEnter}>던전 입장</UIButton>
        ) : (
          <>
            <UIButton onClick={onFight}>{D.floors[d.floor].boss ? '보스와 싸운다' : `${d.floor + 1}층 전투`}</UIButton>
            <UIButton variant="ghost" onClick={onLeave}>후퇴 (마을로)</UIButton>
          </>
        )}
      </div>
    </div>
  );
}

// ===== 파티 · 성장 =====
function PartyView({ save, setSave, onBack }) {
  const owned = Object.keys(save.units);
  const [cid, setCid] = useState(save.hero);
  const [slotPick, setSlotPick] = useState(null);
  const [skillInfo, setSkillInfo] = useState(null);
  const u = save.units[cid];
  const cls = chronicleClass(cid);
  const d = E.deriveUnit(save, cid);
  const inParty = save.party.includes(cid);
  const toggleParty = () => {
    if (cid === save.hero) return;
    const next = inParty ? save.party.filter(x => x !== cid) : [...save.party, cid];
    if (next.length > 4) return;
    setSave(E.setParty(save, next.filter(x => x !== save.hero)));
  };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="파티 · 성장" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex gap-2 px-3 pt-2 flex-none overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CHRONICLE_CLASSES.map(c => {
          const have = owned.includes(c.id);
          const pu = save.units[c.id];
          return (
            <button key={c.id} disabled={!have} onClick={() => setCid(c.id)} className="ui-press relative flex-none flex flex-col items-center" style={{ width: 62, opacity: have ? 1 : 0.35 }}>
              <div style={{ borderRadius: 14, padding: 2, border: `2px solid ${cid === c.id ? c.color : 'transparent'}` }}><Portrait cid={c.id} size={48} dim={!have} /></div>
              <div style={{ fontSize: 10.5, color: save.party.includes(c.id) ? PALETTE.legendary : PALETTE.textDim }}>{have ? (save.party.includes(c.id) ? `출전 Lv.${pu.lv}` : `대기 Lv.${pu.lv}`) : '미영입'}</div>
              {have && (pu.points > 0 || pu.sp > 0) && <span className="absolute" style={{ top: 2, right: 6, width: 9, height: 9, borderRadius: 999, background: '#e06a5f' }} />}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={cls.combatImage} alt="" className="object-cover flex-none" style={{ width: 92, height: 92, borderRadius: 16, border: `1px solid ${cls.color}`, objectPosition: '50% 25%' }} />
          <div className="flex-1 min-w-0">
            <div className="font-bold" style={{ fontSize: 17, color: PALETTE.text }}>{cls.name} <span style={{ fontSize: 12, color: cls.color }}>{cls.role}</span></div>
            <div style={{ fontSize: 12.5, color: PALETTE.legendary }}>Lv.{u.lv} · 전투력 {E.unitPower(save, cid)}</div>
            <div className="mt-1"><Bar v={u.exp} max={CHRONICLE_TUNING.expNeed(u.lv)} color={PALETTE.legendary} h={5} /></div>
            <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>경험치 {u.exp}/{CHRONICLE_TUNING.expNeed(u.lv)}</div>
            {cid !== save.hero && (
              <button onClick={toggleParty} className="ui-press mt-1" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: `1px solid ${inParty ? '#e06a5f88' : PALETTE.legendary}`, color: inParty ? '#e06a5f' : PALETTE.legendary, background: 'transparent', opacity: !inParty && save.party.length >= 4 ? 0.4 : 1 }}>
                {inParty ? '파티에서 빼기' : save.party.length >= 4 ? '파티 가득 (4/4)' : '파티에 넣기'}
              </button>
            )}
          </div>
        </div>

        {/* 능력치 */}
        <GlassPanel className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>능력치</span>
            <span style={{ fontSize: 12, color: u.points ? PALETTE.legendary : PALETTE.textDim }}>남은 포인트 {u.points}</span>
          </div>
          {STAT_KEYS.map(k => (
            <div key={k} className="flex items-center gap-2 mt-1.5">
              <span style={{ width: 34, fontSize: 13, color: k === cls.main ? PALETTE.legendary : PALETTE.text }}>{STAT_META[k].label}</span>
              <span className="font-semibold" style={{ width: 30, fontSize: 13.5, color: PALETTE.text }}>{u.stats[k]}</span>
              <span className="flex-1 truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{STAT_META[k].desc}</span>
              <button disabled={!u.points} onClick={() => setSave(E.addStat(save, cid, k, 1))} className="ui-press flex-none" style={{ width: 40, height: 34, borderRadius: 9, border: '1px solid var(--ui-line-strong)', color: PALETTE.legendary, background: 'transparent', opacity: u.points ? 1 : 0.3, fontSize: 16 }}>+</button>
            </div>
          ))}
          {u.points > 0 && <button onClick={() => setSave(E.autoAllocate(save, cid))} className="ui-press w-full mt-2" style={{ height: 36, borderRadius: 10, border: '1px dashed var(--ui-line-strong)', color: PALETTE.dawn, background: 'transparent', fontSize: 12.5 }}>추천 배분 ({cls.role} 기준)</button>}
          <table className="w-full mt-2" style={{ fontSize: 12, color: PALETTE.text }}>
            <tbody>
              <tr><td style={{ color: PALETTE.textDim }}>HP</td><td className="text-right">{d.maxHp}</td><td style={{ color: PALETTE.textDim, paddingLeft: 12 }}>공격력</td><td className="text-right">{d.atk}</td></tr>
              <tr><td style={{ color: PALETTE.textDim }}>방어</td><td className="text-right">{d.def}</td><td style={{ color: PALETTE.textDim, paddingLeft: 12 }}>속도</td><td className="text-right">{d.spd}</td></tr>
              <tr><td style={{ color: PALETTE.textDim }}>치명</td><td className="text-right">{Math.round(d.crit * 100)}%</td><td style={{ color: PALETTE.textDim, paddingLeft: 12 }}>회피</td><td className="text-right">{Math.round(d.dodge * 100)}%</td></tr>
              {cid === 'priest' && <tr><td style={{ color: PALETTE.textDim }}>치유력</td><td className="text-right">{d.healPower}</td><td /><td /></tr>}
            </tbody>
          </table>
        </GlassPanel>

        {/* 스킬 */}
        <GlassPanel className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>스킬 <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>— 전투에서 자동 사용</span></span>
            <span style={{ fontSize: 12, color: u.sp ? PALETTE.legendary : PALETTE.textDim }}>스킬 포인트 {u.sp}</span>
          </div>
          {classSkills(cid).map(s => {
            const lv = u.skills[s.id] || 0;
            const locked = s.reqLv > u.lv;
            const can = E.canLearn(u, s);
            return (
              <div key={s.id} className="flex items-center gap-2 mt-2">
                <button onClick={() => setSkillInfo(s)} className="flex-1 min-w-0 text-left ui-press" style={{ background: 'transparent', border: 'none', padding: 0, opacity: locked ? 0.45 : 1 }}>
                  <div style={{ fontSize: 13, color: lv ? PALETTE.text : PALETTE.textDim }}>{s.name} <span style={{ fontSize: 11, color: lv ? PALETTE.legendary : PALETTE.textDim }}>{lv ? `Lv.${lv}/${SKILL_MAX_LV}` : locked ? `Lv.${s.reqLv}부터` : '미습득'}</span></div>
                  <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{describeSkill(s, Math.max(1, lv))}</div>
                </button>
                <button disabled={!can} onClick={() => setSave(E.learnSkill(save, cid, s.id))} className="ui-press flex-none" style={{ height: 34, padding: '0 10px', borderRadius: 9, border: `1px solid ${can ? PALETTE.legendary : 'var(--ui-line)'}`, color: can ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', fontSize: 12, opacity: can ? 1 : 0.4 }}>
                  {lv ? '강화' : '배우기'}
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-2 mt-3 pt-2" style={{ borderTop: '1px solid var(--ui-line)' }}>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, color: u.mastery ? PALETTE.text : PALETTE.textDim }}>마스터리 <span style={{ fontSize: 11, color: PALETTE.legendary }}>Lv.{u.mastery || 0}</span></div>
              <div style={{ fontSize: 11, color: PALETTE.textDim }}>포인트 1개당 공격력·최대 HP +{Math.round(MASTERY_PCT * 100)}% · 상한 없음 (현재 +{Math.round((u.mastery || 0) * MASTERY_PCT * 100)}%)</div>
            </div>
            <button disabled={!u.sp} onClick={() => setSave(E.addMastery(save, cid, 1))} className="ui-press flex-none" style={{ height: 34, padding: '0 10px', borderRadius: 9, border: `1px solid ${u.sp ? PALETTE.legendary : 'var(--ui-line)'}`, color: u.sp ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', fontSize: 12, opacity: u.sp ? 1 : 0.4 }}>+1</button>
            {u.sp > 1 && <button onClick={() => setSave(E.addMastery(save, cid, u.sp))} className="ui-press flex-none" style={{ height: 34, padding: '0 10px', borderRadius: 9, border: `1px solid ${PALETTE.legendary}`, color: PALETTE.legendary, background: 'transparent', fontSize: 12 }}>전부</button>}
          </div>
        </GlassPanel>

        {/* 장비 */}
        <GlassPanel className="p-3 flex flex-col gap-2">
          <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>장비</span>
          {SLOTS.map(sl => {
            const it = save.inventory.find(i => i.uid === u.equip[sl.id]);
            return it ? (
              <ItemRow key={sl.id} save={save} item={it} onClick={() => setSlotPick(sl.id)} right={<span style={{ fontSize: 11, color: PALETTE.dawn }}>교체</span>} />
            ) : (
              <button key={sl.id} onClick={() => setSlotPick(sl.id)} className="ui-press w-full text-left" style={{ padding: '12px', borderRadius: 12, border: '1px dashed var(--ui-line-strong)', background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>
                {sl.icon} {sl.label} — 비어 있음 (눌러서 장착)
              </button>
            );
          })}
        </GlassPanel>
      </div>
      {slotPick && (
        <BottomSheet title={`${SLOTS.find(s => s.id === slotPick).label} 장착`} onClose={() => setSlotPick(null)}>
          <div className="flex flex-col gap-2">
            {u.equip[slotPick] != null && (
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => { setSave(E.unequipItem(save, cid, slotPick)); setSlotPick(null); }}>장착 해제</UIButton>
            )}
            {save.inventory.filter(i => i.slot === slotPick && i.uid !== u.equip[slotPick])
              .sort((a, b) => E.itemPower(b) - E.itemPower(a))
              .map(it => <ItemRow key={it.uid} save={save} item={it} onClick={() => { setSave(E.equipItem(save, cid, it.uid)); setSlotPick(null); }} />)}
            {!save.inventory.some(i => i.slot === slotPick && i.uid !== u.equip[slotPick]) && <div className="text-center py-4" style={{ fontSize: 12.5, color: PALETTE.textDim }}>가방에 해당 장비가 없습니다</div>}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSlotPick(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
      {skillInfo && (
        <BottomSheet title={skillInfo.name} onClose={() => setSkillInfo(null)} maxHeight="60%">
          <div className="flex flex-col gap-1.5" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <div style={{ color: PALETTE.textDim }}>배울 수 있는 레벨 Lv.{skillInfo.reqLv}{skillInfo.cd ? ` · 재사용 ${skillInfo.cd}턴` : ''}</div>
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} style={{ color: (u.skills[skillInfo.id] || 0) === l ? PALETTE.legendary : PALETTE.text }}>Lv.{l} — {describeSkill(skillInfo, l)}</div>
            ))}
          </div>
          <div className="mt-4"><UIButton variant="ghost" onClick={() => setSkillInfo(null)}>닫기</UIButton></div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 가방 =====
function BagView({ save, setSave, onBack, flash }) {
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const list = save.inventory.filter(i => filter === 'all' || i.slot === filter)
    .sort((a, b) => gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a));
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const bulk = (maxGrade) => {
    const uids = save.inventory.filter(i => gradeIdx(i.grade) <= maxGrade && !E.equippedBy(save, i.uid)).map(i => i.uid);
    if (!uids.length) return;
    const r = E.dismantleItems(save, uids);
    setSave(r.save);
    flash(`${uids.length}개 분해 → ✦ +${r.essence}`);
  };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={`가방 ${save.inventory.length}/${CHRONICLE_TUNING.inventoryMax}`} onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {[{ id: 'all', label: '전체' }, ...SLOTS].map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 12, border: `1px solid ${filter === s.id ? PALETTE.legendary : 'var(--ui-line)'}`, color: filter === s.id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{s.label}</button>
        ))}
      </div>
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        <button onClick={() => { setSave(E.autoEquip(save)); flash('파티 전원 더 강한 장비로 교체'); }} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 11.5, border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary, background: 'transparent' }}>자동 장착</button>
        <button onClick={() => bulk(0)} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 11.5, border: '1px dashed var(--ui-line-strong)', color: PALETTE.textDim, background: 'transparent' }}>일반 분해</button>
        <button onClick={() => bulk(1)} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 11.5, border: '1px dashed var(--ui-line-strong)', color: PALETTE.textDim, background: 'transparent' }}>고급 이하 분해</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map(it => <ItemRow key={it.uid} save={save} item={it} onClick={() => setSel(it.uid)} />)}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>비어 있습니다 — 사냥터에서 장비를 모아 보세요</div>}
      </div>
      {item && (
        <BottomSheet title={E.itemName(item) + (item.plus ? ` +${item.plus}` : '')} onClose={() => setSel(null)} maxHeight="70%">
          <div style={{ fontSize: 12.5, color: gradeOf(item.grade).color }} className="text-center">{gradeOf(item.grade).label} · Lv.{item.ilv} · {SLOTS.find(s => s.id === item.slot).label}</div>
          <div className="text-center mt-1" style={{ fontSize: 12.5, color: PALETTE.text }}>{statLine(E.itemStats(item))}</div>
          <div className="mt-3" style={{ fontSize: 12, color: PALETTE.textDim }}>누구에게 장착할까?</div>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {Object.keys(save.units).map(cid => {
              const cur = save.inventory.find(i => i.uid === save.units[cid].equip[item.slot]);
              const diff = E.itemPower(item) - (cur ? E.itemPower(cur) : 0);
              return (
                <button key={cid} onClick={() => { setSave(E.equipItem(save, cid, item.uid)); setSel(null); flash(`${chronicleClass(cid).name}에게 장착`); }} className="ui-press flex items-center gap-2" style={{ padding: 8, borderRadius: 12, border: '1px solid var(--ui-line-strong)', background: 'transparent' }}>
                  <Portrait cid={cid} size={30} />
                  <div className="text-left">
                    <div style={{ fontSize: 12, color: PALETTE.text }}>{chronicleClass(cid).name}</div>
                    <div style={{ fontSize: 11, color: diff > 0 ? '#8fe08a' : diff < 0 ? '#e06a5f' : PALETTE.textDim }}>{diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : '='}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <UIButton variant="ghost" style={{ height: 42 }} disabled={!!E.equippedBy(save, item.uid)} onClick={() => { const r = E.dismantleItems(save, [item.uid]); setSave(r.save); setSel(null); flash(`분해 → ✦ +${r.essence}${r.shard ? ` ◆ +${r.shard}` : ''}`); }}>
              {E.equippedBy(save, item.uid) ? '착용 중 (분해 불가)' : `분해 ✦${gradeOf(item.grade).dismantle + (item.plus || 0)}`}
            </UIButton>
            <UIButton variant="ghost" style={{ height: 42 }} onClick={() => setSel(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 대장간 =====
function ForgeView({ save, setSave, onBack, flash }) {
  const [sel, setSel] = useState(null);
  const list = save.inventory.slice().sort((a, b) => (E.equippedBy(save, b.uid) ? 1 : 0) - (E.equippedBy(save, a.uid) ? 1 : 0) || gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a));
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const ec = item && E.enhanceCost(item);
  const pc = item && E.promoteCost(item);
  const ng = item && E.nextGrade(item);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="대장간" onBack={onBack} right={<Wallet save={save} />} />
      <div className="px-4 pt-3 flex-none" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.55 }}>
        <b style={{ color: PALETTE.text }}>강화</b> +1당 능력치 +{Math.round(FORGE.enhancePct * 100)}% (최대 +{FORGE.maxEnhance}) · <b style={{ color: PALETTE.text }}>승급</b> 다음 등급으로 — 에픽 승급은 던전의 ◆ 고대 파편 필요
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map(it => <ItemRow key={it.uid} save={save} item={it} onClick={() => setSel(it.uid)} />)}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>가방에 장비가 없습니다</div>}
      </div>
      {item && (
        <BottomSheet title={E.itemName(item) + (item.plus ? ` +${item.plus}` : '')} onClose={() => setSel(null)} maxHeight="70%">
          <div className="text-center" style={{ fontSize: 12.5, color: gradeOf(item.grade).color }}>{gradeOf(item.grade).label} · Lv.{item.ilv}</div>
          <div className="text-center mt-1" style={{ fontSize: 12.5, color: PALETTE.text }}>{statLine(E.itemStats(item))}</div>
          <div className="mt-3 flex flex-col gap-2">
            <GlassPanel className="p-3">
              <div style={{ fontSize: 13, color: PALETTE.text }} className="font-semibold">강화 +{item.plus || 0} → +{(item.plus || 0) + 1}</div>
              {(item.plus || 0) < FORGE.maxEnhance ? (
                <>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>결과: {statLine(E.itemStats({ ...item, plus: (item.plus || 0) + 1 }))}</div>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>비용: 🪙 {ec.gold} · ✦ {ec.essence}</div>
                  <UIButton style={{ height: 40, marginTop: 8 }} disabled={!E.canEnhance(save, item)} onClick={() => { setSave(E.enhanceItem(save, item.uid)); flash('강화 성공!'); }}>강화</UIButton>
                </>
              ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>최대 강화</div>}
            </GlassPanel>
            <GlassPanel className="p-3">
              <div style={{ fontSize: 13, color: PALETTE.text }} className="font-semibold">등급 승급 {ng ? `→ ${gradeOf(ng).label}` : ''}</div>
              {ng ? (
                <>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>결과: {statLine(E.itemStats({ ...item, grade: ng }))}</div>
                  <div style={{ fontSize: 12, color: PALETTE.textDim }}>비용: 🪙 {pc.gold} · ✦ {pc.essence}{pc.shard ? ` · ◆ ${pc.shard}` : ''}</div>
                  <UIButton variant="gold" style={{ height: 40, marginTop: 8 }} disabled={!E.canPromote(save, item)} onClick={() => { setSave(E.promoteItem(save, item.uid)); flash(`${gradeOf(ng).label} 등급으로 승급!`); }}>승급</UIButton>
                </>
              ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>최고 등급</div>}
            </GlassPanel>
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 시작 =====
function TitleView({ save, onStart, onContinue, onExit }) {
  const [picking, setPicking] = useState(false);
  const [sel, setSel] = useState('wanderer');
  const [confirm, setConfirm] = useState(false);
  const cls = chronicleClass(sel);
  if (picking) {
    return (
      <div className="absolute inset-0 flex flex-col">
        <Header title="주인공 선택" onBack={() => setPicking(false)} />
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <div style={{ fontSize: 12, color: PALETTE.textDim }}>나머지 네 직업은 지역 보스를 쓰러뜨릴 때마다 동료로 합류한다.</div>
          <div className="flex gap-2">
            {CHRONICLE_CLASSES.map(c => (
              <button key={c.id} onClick={() => setSel(c.id)} className="ui-press flex-1" style={{ borderRadius: 14, padding: 2, border: `2px solid ${sel === c.id ? c.color : 'transparent'}`, opacity: sel === c.id ? 1 : 0.55, background: 'transparent' }}>
                <img src={c.image} alt={c.name} className="w-full object-cover" style={{ aspectRatio: '1', borderRadius: 11 }} />
              </button>
            ))}
          </div>
          <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 10', border: `1px solid ${cls.color}88` }}>
            <img src={cls.combatImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, #0a0608)' }} />
            <div className="absolute bottom-2 left-3">
              <div className="font-bold" style={{ fontSize: 19, color: PALETTE.text }}>{cls.name} <span style={{ fontSize: 12.5, color: cls.color }}>{cls.role}</span></div>
              <div style={{ fontSize: 12, color: PALETTE.textDim }}>「{cls.quote}」</div>
            </div>
          </div>
          <GlassPanel className="p-3" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <div className="font-semibold mb-1">스킬</div>
            {classSkills(sel).map(s => <div key={s.id} style={{ color: PALETTE.textDim, lineHeight: 1.55 }}><b style={{ color: PALETTE.text }}>{s.name}</b> (Lv.{s.reqLv}) — {describeSkill(s, 1)}</div>)}
          </GlassPanel>
        </div>
        <div className="p-4 flex-none"><UIButton onClick={() => onStart(sel)}>이 주인공으로 시작</UIButton></div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_1/iceMage_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0608cc 0%, #0a060844 35%, #0a0608 80%)' }} />
      <div className="relative flex-1 flex flex-col px-6 pt-16 pb-6">
        <div className="text-center">
          <div style={{ fontSize: 11, letterSpacing: '0.45em', color: '#9cc4e4' }}>{CHRONICLE_SUB.toUpperCase()}</div>
          <div className="font-bold mt-1" style={{ fontSize: 32, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: '0 4px 20px #000' }}>{CHRONICLE_TITLE}</div>
          <div className="mt-2" style={{ fontSize: 12.5, color: PALETTE.textDim }}>레벨업 · 동료 · 파밍 · 던전 · 장비 승급 — 정통 RPG</div>
        </div>
        <div className="mt-auto flex flex-col gap-2.5 ui-stagger">
          {save && <UIButton onClick={onContinue}>이어하기 — {chronicleClass(save.hero).name} Lv.{save.units[save.hero].lv}</UIButton>}
          <UIButton variant={save ? 'ghost' : 'primary'} onClick={() => (save ? setConfirm(true) : setPicking(true))}>새 모험</UIButton>
          <button onClick={onExit} className="ui-press" style={{ background: 'transparent', border: 'none', color: PALETTE.dawn, padding: 10, fontSize: 12.5 }}>⇄ 게임 선택</button>
        </div>
      </div>
      {confirm && (
        <BottomSheet title="새 모험을 시작할까요?" onClose={() => setConfirm(false)} maxHeight="45%">
          <div className="text-center" style={{ fontSize: 12.5, color: PALETTE.textDim }}>지금 모험(레벨·동료·장비)은 사라집니다.</div>
          <div className="flex gap-2 mt-4">
            <UIButton variant="ghost" onClick={() => setConfirm(false)}>취소</UIButton>
            <UIButton onClick={() => { setConfirm(false); setPicking(true); }}>새로 시작</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 이야기 장면 =====
function speakerOf(save, sp) {
  if (sp === 'narr') return { name: '', img: null, color: PALETTE.textDim };
  if (sp === 'hero') { const c = chronicleClass(save.hero); return { name: c.name, img: c.image, color: c.color }; }
  if (NPCS[sp]) return { name: NPCS[sp].name, icon: NPCS[sp].icon, color: NPCS[sp].color };
  if (CHRONICLE_CLASSES.some(c => c.id === sp)) { const c = chronicleClass(sp); return { name: c.name, img: c.image, color: c.color }; }
  if (ENEMIES[sp]) return { name: ENEMIES[sp].name, img: chronicleEnemyArt(sp), color: '#e06a5f' };
  return { name: sp, color: PALETTE.text };
}
function SceneView({ save, scene, onEnd }) {
  const [i, setI] = useState(0);
  const line = scene.lines[i];
  const who = speakerOf(save, line.sp);
  const bg = scene.id === 'ending' && save.hero !== 'priest' ? `./classes/${save.hero}win.jpg` : scene.bg;
  const next = () => (i + 1 < scene.lines.length ? setI(i + 1) : onEnd());
  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: '#050304' }} onClick={next}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55 }} draggable={false} />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #050304aa 0%, transparent 30%, #050304ee 72%)' }} />
      <div className="relative flex items-center px-4 pt-4">
        <div className="flex-1" style={{ fontSize: 11, letterSpacing: '0.3em', color: PALETTE.dawn }}>{scene.title}</div>
        <button onClick={(e) => { e.stopPropagation(); onEnd(); }} className="ui-press" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--ui-line-strong)', color: PALETTE.textDim, background: '#0008' }}>건너뛰기 ⏭</button>
      </div>
      <div className="flex-1" />
      <div className="relative px-4 pb-6">
        <div key={i} className="ui-screen-enter" style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(12,7,9,0.88)', border: `1px solid ${line.sp === 'narr' ? 'var(--ui-line)' : who.color + '88'}`, minHeight: 130 }}>
          {line.sp !== 'narr' && (
            <div className="flex items-center gap-2 mb-2">
              {who.img ? <img src={who.img} alt="" className="object-cover" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${who.color}` }} /> : <span style={{ fontSize: 26 }}>{who.icon}</span>}
              <span className="font-semibold" style={{ fontSize: 14, color: who.color }}>{who.name}</span>
            </div>
          )}
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: line.sp === 'narr' ? '#cbbba6' : PALETTE.text, fontStyle: line.sp === 'narr' ? 'italic' : 'normal' }}>{line.t}</div>
          <div className="text-right mt-2" style={{ fontSize: 11, color: PALETTE.textDim }}>{i + 1}/{scene.lines.length} · 눌러서 계속 ▸</div>
        </div>
      </div>
    </div>
  );
}

// ===== 의뢰 게시판 =====
const Q_KIND = { main: { label: '메인', color: '#e8b04a' }, side: { label: '의뢰', color: '#9cc4e4' }, companion: { label: '동료', color: '#9fd18a' } };
function QuestCard({ save, item, onAccept, onClaim, onAbandon }) {
  const { q, status, prog } = item;
  const k = Q_KIND[q.kind];
  return (
    <div style={{ padding: 12, borderRadius: 14, background: status === 'done' ? 'rgba(232,176,74,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${status === 'done' ? PALETTE.legendary : 'var(--ui-line)'}` }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, color: k.color, border: `1px solid ${k.color}66` }}>{k.label}</span>
        <span className="flex-1 font-semibold truncate" style={{ fontSize: 13.5, color: status === 'claimed' ? PALETTE.textDim : PALETTE.text }}>{q.title}</span>
        {q.kind === 'companion' && <Portrait cid={q.req.companion} size={26} />}
      </div>
      <div className="mt-1" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.5 }}>{q.desc}</div>
      {(status === 'active' || status === 'done') && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1"><Bar v={prog.cur} max={prog.max} color={status === 'done' ? PALETTE.legendary : '#9cc4e4'} h={6} /></div>
          <span style={{ fontSize: 11.5, color: PALETTE.text }}>{Math.max(0, prog.cur)}/{prog.max}</span>
        </div>
      )}
      <div className="mt-1.5" style={{ fontSize: 11.5, color: PALETTE.legendary }}>보상: {Q.rewardText(q.reward)}</div>
      {status === 'available' && <UIButton variant="ghost" style={{ height: 38, marginTop: 8 }} onClick={onAccept}>수락</UIButton>}
      {status === 'done' && <UIButton style={{ height: 38, marginTop: 8 }} onClick={onClaim}>보상 받기</UIButton>}
      {status === 'active' && q.kind !== 'main' && (
        <button onClick={onAbandon} className="ui-press mt-1" style={{ fontSize: 11, color: PALETTE.textDim, background: 'transparent', border: 'none', padding: '4px 0' }}>포기하기</button>
      )}
    </div>
  );
}
function QuestView({ save, setSave, onBack, flash, onReplay }) {
  const [tab, setTab] = useState('board');
  const list = Q.questList(save);
  const order = { done: 0, active: 1, available: 2 };
  const shown = list.filter(x => order[x.status] != null).sort((a, b) => order[a.status] - order[b.status] || (a.q.kind === 'main' ? -1 : 0));
  const claimed = list.filter(x => x.status === 'claimed');
  const seen = Q.seenScenes(save);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="의뢰 게시판" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {[['board', `게시판 ${shown.length}`], ['done', `완료 ${claimed.length}`], ['story', '지난 이야기']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 12, border: `1px solid ${tab === id ? PALETTE.legendary : 'var(--ui-line)'}`, color: tab === id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {tab === 'board' && shown.map(item => (
          <QuestCard key={item.q.id} save={save} item={item}
            onAccept={() => { setSave(Q.acceptQuest(save, item.q.id)); flash(`「${item.q.title}」 수락`); }}
            onAbandon={() => setSave(Q.abandonQuest(save, item.q.id))}
            onClaim={() => {
              const r = Q.claimQuest(save, item.q.id, Math.random);
              setSave(r.save);
              flash(r.gained?.item ? `보상 수령 — ${E.itemName(r.gained.item)} 획득` : '보상 수령!');
            }} />
        ))}
        {tab === 'board' && !shown.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>지금 받을 수 있는 의뢰가 없습니다 — 새 지역을 열면 의뢰가 붙습니다</div>}
        {tab === 'done' && claimed.map(item => <QuestCard key={item.q.id} save={save} item={item} />)}
        {tab === 'story' && seen.map(sc => (
          <button key={sc.id} onClick={() => onReplay(sc)} className="ui-press text-left" style={{ padding: 12, borderRadius: 14, border: '1px solid var(--ui-line)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>{sc.title}</div>
            <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{sc.lines[0].t}</div>
          </button>
        ))}
        {tab === 'story' && !seen.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 본 이야기가 없습니다</div>}
      </div>
    </div>
  );
}

// ===== 메인 =====
export default function ChronicleGame({ onExit }) {
  const [save, setSaveState] = useState(loadSave);
  const [view, setView] = useState('title');
  const [battle, setBattle] = useState(null);
  const [repeat, setRepeat] = useState(false);
  const [toast, setToast] = useState(null);
  const [scene, setScene] = useState(null); // { scene, replay, after }
  const lastFieldRef = useRef(null);
  const rng = Math.random;

  useEffect(() => { writeSave(save); }, [save]);
  const setSave = (next) => setSaveState(next);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(t => (t === msg ? null : t)), 1600); };

  // 이야기 — 조건에 맞는 장면이 있으면 띄우고 true
  const playScene = (ctx, after = null) => {
    if (!save || scene) return false;
    const sc = Q.nextScene(save, ctx);
    if (!sc) return false;
    setScene({ scene: sc, after });
    return true;
  };
  const endScene = () => {
    const cur = scene;
    setScene(null);
    if (!cur) return;
    if (!cur.replay) setSave(Q.markSceneSeen(save, cur.scene));
    if (cur.after) cur.after();
  };
  // 마을에 있을 때 밀린 장면 (서장 · 보스 처치 후 · 동료 합류 · 던전 개방 · 종장)
  useEffect(() => {
    if (view === 'town' && save && !scene && !battle) playScene({ at: 'town' });
  }, [view, save, scene, battle]); // eslint-disable-line react-hooks/exhaustive-deps

  // 전투 시작: 끝까지 계산 → 저장 반영 → 재생
  const fightField = (field, boss) => {
    if (boss && E.bossAttemptsLeft(save, field.id) <= 0) { flash('오늘 보스 재도전 횟수를 모두 썼습니다'); return; }
    if (boss && playScene({ at: 'bossPre', fieldId: field.id }, () => flash('준비되면 「보스 도전」을 누르세요'))) return; // 보스 앞 장면 먼저 (저장 반영 후 다시 도전)
    lastFieldRef.current = field;
    const enc = E.rollFieldEncounter(field, rng, boss, E.partyLevel(save));
    const party = E.partyCombatants(save);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'field', fieldId: field.id, type: enc.type, enemies: enc.enemies, label: boss ? `${field.name} 보스` : field.name };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    setSave(r.save);
    if (boss || sim.result !== 'win' || r.summary.questsDone.length) setRepeat(false);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, key: Date.now() });
    setView('battle');
  };
  const fightDungeon = () => {
    const d = save.dungeon;
    if (!d) return;
    const enc = E.dungeonEncounter(d.floor, rng);
    const party = E.partyCombatants(save, d.hp);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'dungeon', type: enc.type, enemies: enc.enemies, label: `${CHRONICLE_DUNGEON.name} ${CHRONICLE_DUNGEON.floors[d.floor].boss ? '보스' : `${d.floor + 1}층`}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    setSave(r.save);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, key: Date.now() });
    setView('battle');
  };

  const afterBattle = () => {
    const ctx = battle?.ctx;
    setBattle(null);
    if (ctx?.kind === 'dungeon') setView(save.dungeon ? 'dungeon' : 'town');
    else setView(battle?.sim.result === 'win' ? 'field' : 'town');
  };

  let content;
  if (!save || view === 'title') {
    content = (
      <TitleView save={save} onExit={onExit}
        onContinue={() => setView('town')}
        onStart={(cid) => { setSave(Q.ensureQuestFields(E.newChronicleSave(cid))); setView('town'); }} />
    );
  } else if (view === 'battle' && battle) {
    content = (
      <BattleView key={battle.key} battle={battle} save={save} onDone={afterBattle}
        repeat={repeat} onToggleRepeat={() => setRepeat(r => !r)}
        onAgain={() => lastFieldRef.current && fightField(lastFieldRef.current, false)} />
    );
  } else if (view === 'field') {
    content = <FieldView save={save} onBack={() => { setRepeat(false); setView('town'); }} onFight={fightField} playScene={playScene} sceneOpen={!!scene} />;
  } else if (view === 'quests') {
    content = <QuestView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onReplay={(sc) => setScene({ scene: sc, replay: true })} />;
  } else if (view === 'dungeon') {
    content = (
      <DungeonView save={save} onBack={() => setView('town')}
        onEnter={() => setSave(E.startDungeon(save))}
        onFight={fightDungeon}
        onLeave={() => { setSave(E.leaveDungeon(save)); setView('town'); }} />
    );
  } else if (view === 'party') {
    content = <PartyView save={save} setSave={setSave} onBack={() => setView('town')} />;
  } else if (view === 'bag') {
    content = <BagView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else if (view === 'forge') {
    content = <ForgeView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else {
    content = <TownView save={save} go={(v) => setView(v === 'dungeon' && save.dungeon ? 'dungeon' : v)} onExit={onExit} />;
  }

  return (
    <div className="absolute inset-0" style={{ background: PALETTE.bg, fontFamily: '"Noto Serif KR", serif', color: PALETTE.text }}>
      <div key={view} className="ui-screen-enter absolute inset-0">{content}</div>
      {scene && <SceneView key={scene.scene.id} save={save} scene={scene.scene} onEnd={endScene} />}
      {toast && (
        <div className="absolute left-1/2 z-50 pointer-events-none" style={{ bottom: 90, transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 999, background: '#000d', border: '1px solid var(--ui-line-strong)', color: PALETTE.legendary, fontSize: 12.5, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  );
}
