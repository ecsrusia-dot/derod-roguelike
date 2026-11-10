// ============================================
// chronicle/ChronicleGame.jsx — 황혼 연대기 (전통 RPG) 화면
// ============================================
// 로직은 engine.js 순수 함수. 전투는 시작 순간 끝까지 계산·저장하고 화면은 재생만 한다
// (재생 중 새로고침해도 보상 중복·유실 없음).
// 저장: localStorage CHRONICLE_SAVE_KEY — 본편·아르카나와 완전 분리.
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Coins } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../components/ui/CommonUI.jsx';
import { InfoSection, InfoRow, StatTiles, ValueChip, HiNum } from '../components/ui/InfoBlocks.jsx';
import UpdateButton from '../components/ui/UpdateButton.jsx';
import { GAME_VERSION } from '../data/version.js';
import {
  CHRONICLE_TITLE, CHRONICLE_SUB, CHRONICLE_PARTS, CHRONICLE_SAVE_KEY, CHRONICLE_SAVE_KEY_V1, CHRONICLE_TUNING, CHRONICLE_CLASSES, CHRONICLE_FIELDS,
  CHRONICLE_SKILLS, CHRONICLE_DUNGEON, CHRONICLE_DUNGEONS, DUNGEON_TIERS, dungeonDef, STAT_META, STAT_KEYS, SKILL_MAX_LV, MASTERY_PCT, BOSS_DAILY_LIMIT, BOSS_MECHS, DUNGEON_KEYS, GRADES, gradeIdx, SLOTS, FORGE, UNIQUE_CHANCE, UNIQUE_ITEMS, fieldStages, FIELD_STAGES, BOOST, BAG_EXPAND,
  chronicleClass, classSkills, describeSkill, chronicleEnemyArt, expNeedFor, rebirthExpMult, REBIRTH, REBIRTH_BRANCHES, rebirthBranches,
} from './data.js';
import * as E from './engine.js';
import * as TL from './talents.js';
import * as R from './roster.js';
import * as RD from './raid.js';
import * as Q from './quest.js';
import * as A from './account.js';
import * as F from './familiar.js';
import * as P from './preview.js';
import * as O from './offline.js';
import * as D from './daily.js';
import * as BK from './backup.js';
import * as CS from './cloudSave.js';
import { watchAuthState, signInGoogle, getUserInfo } from '../cloud/auth.js';
import { NPCS } from './story.js';
import { CENEMIES as ENEMIES } from './enemies.js';

const FONT_TITLE = '"Cinzel", "Noto Serif KR", serif';

// 2.0 저장 = 계정(캐릭터 슬롯 + 공유 창고·재화). 1.x 저장(v1 키)은 읽기만 — 있었으면 시작 보상.
// 1.236.1 저장 안전: 깨진 저장은 자동 백업으로 복구 · 백업도 없으면 원본을 따로 보관하고 새 계정 (backup.js)
let loadStatus = { status: 'ok' };
function loadAccount() {
  const r = BK.loadAccountSafe();
  loadStatus = r;
  if (r.acc) return r.acc;
  let hadV1 = false;
  try { hadV1 = !!localStorage.getItem(CHRONICLE_SAVE_KEY_V1); } catch { /* */ }
  return A.newAccount(r.status === 'empty' && hadV1);
}
function writeAccount(acc) { BK.writeAccountSafe(acc); }

// ===== 작은 부품 =====
const gradeOf = (id) => GRADES[gradeIdx(id)] || GRADES[0];
// 받침 여부로 이/가 고르기
const iga = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? `${w}이` : `${w}가`; };
function statLine(st) {
  return Object.entries(st).filter(([, v]) => v).map(([k, v]) => E.statLabel(k, v)).join(' · ');
}
// 장비 소속 표시 — 직업 전용 / 공용
const clsTag = (item) => (item.cls === 'common' ? '공용' : `${chronicleClass(item.cls).name} 전용`);
// 특수 효과 한 줄 (유니크 고유 효과 · 에픽 장신구 옵션)
function ItemSpecial({ item, center = false }) {
  const ud = E.uniqueDef(item);
  const eo = E.epicOptOf(item);
  if (!ud && !eo) return null;
  return (
    <div className={center ? 'text-center mt-1' : 'truncate'} style={{ fontSize: center ? 12.5 : 11, color: ud ? '#f0a86a' : '#d7a8ff' }}>
      ✦ {ud ? `고유 효과 — ${ud.desc}` : `「${eo.name}」 ${eo.desc}`}
    </div>
  );
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
// 숫자가 차오르는 연출 (1.232.2) — 0 → v, 약 0.7초
function CountUp({ v, ms = 700 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* */ }
    if (reduce || !v) { setN(v || 0); return undefined; }
    let raf; const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); setN(Math.round(v * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v, ms]);
  return <>{n.toLocaleString()}</>;
}
// 대장간 결과 팝업 (1.232.2) — 성공 금색 · 실패 회색 · 하락 주황 · 파괴 붉은 흔들림
const FORGE_POP = {
  success: { icon: '✨', color: '#ffd27a', glow: 'rgba(232,176,74,.55)' },
  fail: { icon: '…', color: '#c9c2b8', glow: 'rgba(255,255,255,.15)' },
  down: { icon: '▼', color: '#e8b04a', glow: 'rgba(232,140,74,.4)' },
  destroy: { icon: '💥', color: '#ff6b5e', glow: 'rgba(224,80,70,.6)' },
};
function ForgePop({ pop, onDone }) {
  const doneRef = useRef(onDone); doneRef.current = onDone;
  useEffect(() => { const t = setTimeout(() => doneRef.current(), pop.kind === 'destroy' ? 1900 : 1600); return () => clearTimeout(t); }, [pop]);
  const st = FORGE_POP[pop.kind] || FORGE_POP.fail;
  return (
    <div className="absolute inset-0 pointer-events-auto" style={{ zIndex: 60, background: 'rgba(0,0,0,.35)' }} onClick={onDone}>
      <div key={pop.key} className={`${pop.kind === 'destroy' ? 'chr-pop-destroy' : 'chr-pop'} absolute text-center`} style={{ left: '50%', top: '45%', minWidth: 220, padding: '18px 22px', borderRadius: 18, background: 'rgba(20,14,12,.92)', border: `1.5px solid ${st.color}`, boxShadow: `0 0 34px 4px ${st.glow}` }}>
        <div style={{ fontSize: 34 }}>{st.icon}</div>
        <div className="font-bold mt-1" style={{ fontSize: 18, color: st.color, fontFamily: FONT_TITLE }}>{pop.title}</div>
        {pop.sub && <div className="mt-1" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{pop.sub}</div>}
      </div>
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
// ===== 경험치 바 (1.239.0) — 주인공 금색 · 사역마 보라 =====
const XP_HERO = 'linear-gradient(90deg,#a8781e,#f0c25a)';
const XP_FAM = 'linear-gradient(90deg,#7a3a9a,#d07ae8)';
// 주인공·동행 사역마 경험치 스냅샷 — 전투 전/후를 비교해 이번 획득 구간을 그린다
function expSnap(save) {
  const h = save?.units?.[save?.hero];
  const hero = h ? { lv: h.lv, exp: h.exp || 0, need: expNeedFor(h), cap: h.lv >= E.levelCapOf(save) } : null;
  const fk = save?.famTeam?.main;
  const f = fk ? save.fams?.[fk] : null;
  const fam = f ? { key: fk, lv: F.famLv(f), exp: f.exp || 0, need: F.FAM_LEVEL.expNeed(F.famLv(f)), cap: h ? F.famLv(f) >= h.lv : false } : null;
  return { hero, fam };
}
const xpPct = (x) => (x ? Math.max(0, Math.min(100, (x.exp / Math.max(1, x.need)) * 100)) : 0);
// 승리 결과창 굵은 바 — 어두운 구간 = 원래 있던 경험치 · 밝은 구간 = 이번 획득 (레벨 업이면 0부터)
function XpGainBar({ before, after, fam = false, h = 8 }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 120); return () => clearTimeout(t); }, []);
  if (!after) return null;
  const up = before && after.lv > before.lv;
  const base = up || !before || after.key !== before.key ? 0 : xpPct(before);
  const gain = Math.max(0, xpPct(after) - base);
  return (
    <div className="flex overflow-hidden" style={{ height: h, borderRadius: 999, background: '#0008', border: '1px solid #ffffff14' }}>
      <div style={{ width: `${base}%`, background: fam ? XP_FAM : XP_HERO }} />
      <div style={{ width: shown ? `${gain}%` : '0%', background: fam ? '#f0d0ff' : '#fff3c4', boxShadow: `0 0 8px ${fam ? '#d07ae8' : '#ffe08a'}`, transition: 'width .9s ease-out' }} />
    </div>
  );
}
function XpResultRow({ art, name, before, after, fam = false }) {
  if (!after) return null;
  const up = before && after.lv > before.lv;
  const color = fam ? '#d07ae8' : PALETTE.legendary;
  return (
    <div className="flex items-center gap-2">
      <img src={art} alt="" className="object-cover flex-none" style={{ width: 32, height: 32, borderRadius: 9, objectPosition: '50% 20%', border: `1px solid ${color}88` }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2" style={{ fontSize: 11.5 }}>
          <span className="truncate" style={{ color: PALETTE.text }}>{fam ? '🐾 ' : ''}{name} <b style={{ color }}>Lv.{up ? `${before.lv} → ${after.lv}` : after.lv}</b>{up ? <b className="chr-levelup" style={{ color: '#ffe08a', marginLeft: 4 }}>▲ LEVEL UP</b> : null}</span>
          <span className="flex-none" style={{ color: PALETTE.textDim }}>{after.cap && after.exp === 0 && !up ? (fam ? '주인공 레벨 도달' : '레벨 상한') : `${after.exp.toLocaleString()} / ${after.need.toLocaleString()}`}</span>
        </div>
        <XpGainBar before={before} after={after} fam={fam} />
      </div>
    </div>
  );
}

// 장비 비교 (1.213.1) — 새 장비 vs 지금 착용 중인 같은 부위 장비
const STAT_ORDER = ['atk', 'def', 'hp', 'spd'];
function itemDiff(item, cur) {
  const a = E.itemStats(item); const b = cur ? E.itemStats(cur) : {};
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .sort((x, y) => (STAT_ORDER.indexOf(x) + 1 || 99) - (STAT_ORDER.indexOf(y) + 1 || 99));
  return keys.map(k => ({ k, d: +((a[k] || 0) - (b[k] || 0)).toFixed(3) })).filter(x => x.d !== 0);
}
const powerDiff = (item, cur) => E.itemPower(item) - (cur ? E.itemPower(cur) : 0);
function DiffLine({ item, cur, compact = false }) {
  const pd = powerDiff(item, cur);
  const lines = itemDiff(item, cur);
  const col = (d) => (d > 0 ? '#8fe08a' : '#e06a5f');
  const fmt = (k, d) => { const t = E.statLabel(k, Math.abs(d)); return `${d > 0 ? '▲' : '▼'} ${t.replace(/[+-](?=\d)/, '')}`; };
  if (compact) {
    return (
      <div className="truncate" style={{ fontSize: 11 }}>
        <b style={{ color: pd > 0 ? '#8fe08a' : pd < 0 ? '#e06a5f' : PALETTE.textDim }}>{pd > 0 ? `▲${pd}` : pd < 0 ? `▼${-pd}` : '='}</b>
        {lines.slice(0, 3).map(x => <span key={x.k} style={{ color: col(x.d), marginLeft: 6 }}>{fmt(x.k, x.d)}</span>)}
      </div>
    );
  }
  return (
    <div className="mt-2" style={{ padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ui-line)' }}>
      <div className="flex justify-between" style={{ fontSize: 12, color: PALETTE.textDim }}>
        <span>{cur ? `착용 중: ${E.itemName(cur)}${cur.plus ? ` +${cur.plus}` : ''}` : '이 부위 비어 있음'}</span>
        <b style={{ color: pd > 0 ? '#8fe08a' : pd < 0 ? '#e06a5f' : PALETTE.textDim }}>전투력 {pd > 0 ? `▲ ${pd}` : pd < 0 ? `▼ ${-pd}` : '변화 없음'}</b>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1" style={{ fontSize: 12 }}>
        {lines.map(x => <span key={x.k} style={{ color: col(x.d) }}>{fmt(x.k, x.d)}</span>)}
        {!lines.length && <span style={{ color: PALETTE.textDim }}>능력치 차이 없음</span>}
      </div>
      {(E.uniqueDef(cur) || E.epicOptOf(cur)) && <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>※ 교체하면 착용 중 장비의 특수 효과를 잃습니다</div>}
    </div>
  );
}
// 장비 상세 본문 (1.245.0) — 기본 능력치 / 추가 옵션 / 특수 효과 / 강화 구획 + 착용 비교
const BASE_STATS = ['atk', 'def', 'hp', 'spd'];
const BASE_LABEL = { atk: '공격', def: '방어', hp: 'HP', spd: '속도' };
function ItemRow({ save, item, onClick, right }) {
  const g = gradeOf(item.grade);
  const by = save.inventory.some(i => i.uid === item.uid) ? E.equippedBy(save, item.uid) : null;
  const usable = E.itemUsable(item, save.hero);
  const slot = SLOTS.find(s => s.id === item.slot);
  return (
    <button onClick={onClick} className="ui-press w-full flex items-center gap-2.5 text-left" style={{ padding: '8px 10px', borderRadius: 12, background: `${g.color}10`, border: `1px solid ${g.color}55` }}>
      <div className="flex-none flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: '#000', fontSize: 17, border: `1px solid ${g.color}88` }}>{slot?.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold" style={{ fontSize: 13, color: g.color }}>
          {E.itemName(item)}{item.plus ? ` +${item.plus}` : ''} <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>{g.label} · Lv.{item.ilv}</span>
        </div>
        <div className="truncate" style={{ fontSize: 11, color: usable ? PALETTE.textDim : '#e06a5f' }}>{usable ? clsTag(item) : `🔒 ${clsTag(item)} — 창고에 보관해 두세요`}</div>
        {usable && !E.canWear(item, save.units[save.hero]) && <div className="truncate" style={{ fontSize: 11, color: '#e06a5f' }}>🔒 착용 레벨 부족 — 내 레벨 {item.ilv} 이상 필요{by ? ' (착용 중이지만 효과 없음)' : ''}</div>}
        <div className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{statLine(E.itemStats(item))}</div>
        <ItemSpecial item={item} />
      </div>
      {right ?? (by && <span className="flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>착용 중</span>)}
    </button>
  );
}
// 전투·던전 유닛 아이콘 — 사역마는 원본 적 그림
function UnitIcon({ u, size = 38, dim = false }) {
  if (!u.fam) return <Portrait cid={u.classId} size={size} dim={dim} />;
  return <img src={chronicleEnemyArt(u.famKey)} alt={u.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: '1.5px solid #d07ae8', filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}
function Portrait({ cid, size = 44, dim = false }) {
  const c = chronicleClass(cid);
  return <img src={c.image} alt={c.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: `1.5px solid ${c.color}`, filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}

// ===== 전투 카드 · 로그 (1.227.0) =====
function BattleCard({ u, art, hp, sh, acting, fx, h, enemy = false, border, children, xp = null }) {
  const dead = hp <= 0;
  const accent = enemy ? '#ff8a80' : u.fam ? '#d07ae8' : chronicleClass(u.classId).color;
  return (
    <div className={`relative flex-1 min-w-0 ${fx}`} style={{ opacity: dead ? 0.35 : 1, transition: 'opacity .3s' }}>
      <div className="relative overflow-hidden" style={{ height: h, borderRadius: 12, border: `1.5px solid ${acting ? accent : border}`, boxShadow: acting ? `0 0 12px ${accent}66` : 'none', transition: 'box-shadow .2s, border-color .2s' }}>
        <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: enemy ? '50% 40%' : '50% 22%', filter: dead ? 'grayscale(1)' : 'none' }} draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, #000d)' }} />
        {enemy && u.erole ? <div className="absolute top-1 right-1 px-1.5" style={{ fontSize: 10.5, borderRadius: 6, background: '#000a', color: u.erole === 'tank' ? '#9cc4e4' : '#8fe08a', border: `1px solid ${u.erole === 'tank' ? '#9cc4e4' : '#8fe08a'}66` }}>{u.warden ? '🛡 결계 호위' : u.acolyte ? '✚ 의식 사제' : u.erole === 'tank' ? '🛡 수호' : '✚ 치유'}</div> : null}
        {enemy && u.intim ? <div className="absolute top-1 left-1 px-1.5" style={{ fontSize: 10.5, borderRadius: 6, background: u.intim >= 4 ? '#7a0d0dee' : '#3a1a1acc', color: u.intim >= 4 ? '#ffd0d0' : '#ff9a8a', border: '1px solid #ff6a5a88' }}>{u.intim >= 4 ? '☠ 절대 위압' : `☗ 위압 ${u.intim}`}</div> : null}
        <div className="absolute bottom-1 left-1.5 right-1.5">
          {h < 150 ? (
            // 좁은 카드 (레이드 등 인원이 많을 때) — 짧은 이름 + 바 아래 HP
            <>
              <div className="truncate" style={{ fontSize: 11, color: '#fff', textShadow: '0 1px 2px #000' }}>{u.short || u.name}</div>
              <Bar v={hp} max={u.maxHp} shield={sh} color={enemy ? 'linear-gradient(90deg,#8b1f1f,#e0574c)' : 'linear-gradient(90deg,#3d7a3a,#7fcf6a)'} h={6} />
              <div className="truncate" style={{ fontSize: 10.5, color: '#ddd', textShadow: '0 1px 2px #000' }}>{Math.max(0, hp).toLocaleString()}{sh > 0 ? <span style={{ color: '#9cc4e4' }}> ◈{sh.toLocaleString()}</span> : null}</div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate" style={{ fontSize: 11.5, color: '#fff', textShadow: '0 1px 2px #000' }}>{u.fam ? '🐾 ' : ''}Lv.{u.lv} {u.name}</span>
                <span className="flex-none" style={{ fontSize: 10.5, color: '#ddd', textShadow: '0 1px 2px #000' }}>{Math.max(0, hp).toLocaleString()}{sh > 0 ? <span style={{ color: '#9cc4e4' }}> ◈{sh.toLocaleString()}</span> : null}</span>
              </div>
              <Bar v={hp} max={u.maxHp} shield={sh} color={enemy ? 'linear-gradient(90deg,#8b1f1f,#e0574c)' : 'linear-gradient(90deg,#3d7a3a,#7fcf6a)'} h={7} />
              {xp && <>
                <div className="mt-0.5"><Bar v={xp.pct} max={100} color={u.fam ? XP_FAM : XP_HERO} h={4} /></div>
                <div className="flex justify-between" style={{ fontSize: 10, color: '#e8d3a0', textShadow: '0 1px 2px #000' }}>
                  <span>EXP {Math.floor(xp.pct)}%</span>
                  {xp.gain > 0 ? <b style={{ color: u.fam ? '#e8b8ff' : '#ffe08a' }}>+{xp.gain.toLocaleString()}</b> : null}
                </div>
              </>}
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
const LOG_C = { dmg: '#ff8a80', crit: '#ffb347', heal: '#8fe08a', shield: '#9cc4e4', buff: '#e8c48a', debuff: '#c08ae8', miss: '#9a9a9a', holy: '#ffe9a8', skill: '#e8b04a' };
function BattleLogLine({ e, latest, unitOf }) {
  if (e.round) {
    return <div className="flex items-center gap-2 my-0.5" style={{ fontSize: 10.5, color: PALETTE.textDim }}><span className="flex-1" style={{ height: 1, background: 'var(--ui-line)' }} />{e.round}라운드<span className="flex-1" style={{ height: 1, background: 'var(--ui-line)' }} /></div>;
  }
  const actor = unitOf(e.a);
  const nameColor = (u) => (!u ? PALETTE.text : u.side === 'enemy' ? '#ff7a5c' : u.fam ? '#c79bff' : chronicleClass(u.classId).color);
  const N = ({ id }) => { const u = unitOf(id); return <b style={{ color: nameColor(u), fontWeight: 600 }}>{u?.fam ? '🐾' : ''}{u?.name || ''}</b>; };
  const icon = e.k === 'open' ? '🔥' : e.k === 'dotTick' ? '☠' : e.k === 'hot' ? '✚' : e.skill ? '✦' : e.k === 'heavy' ? '💢' : e.k === 'aoe' ? '💥' : '⚔';
  const actColor = e.k === 'open' ? LOG_C.crit : e.k === 'dotTick' ? LOG_C.debuff : e.k === 'hot' ? LOG_C.heal : e.skill ? LOG_C.skill : e.k === 'heavy' ? LOG_C.crit : PALETTE.text;
  const chip = (h, i) => {
    const sp = { marginLeft: 6, whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }; // inline-block = 칩 사이에서 줄바꿈 (1.232.1)
    if (h.m) return <span key={i} style={{ ...sp, color: LOG_C.miss }}><N id={h.t} /> 빗나감</span>;
    if (e.k === 'dotTick' && h.d > 0) return <span key={i} style={{ ...sp, color: LOG_C.debuff, fontWeight: 600 }}>-{h.d.toLocaleString()}</span>;
    if (h.d > 0) {
      const c = h.c ? LOG_C.crit : h.holy ? LOG_C.holy : h.cover ? LOG_C.shield : LOG_C.dmg;
      const pre = h.counter ? '↺ 반격 ' : h.cover ? '🛡 대신 ' : h.chain ? '⚡ 추가타 ' : h.holy ? '☀ ' : h.c ? '💥 ' : '';
      return <span key={i} style={{ ...sp, color: c, fontWeight: h.c ? 800 : 600, fontSize: h.c ? 13 : undefined }}>{pre}<N id={h.t} /> -{h.d.toLocaleString()}{h.c ? ' 치명!' : ''}{h.ab > 0 ? <span style={{ color: LOG_C.shield, fontWeight: 400 }}> (◈흡수 {h.ab.toLocaleString()})</span> : null}</span>;
    }
    if (h.d === 0 && h.ab > 0) return <span key={i} style={{ ...sp, color: LOG_C.shield, fontWeight: 600 }}>◈ <N id={h.t} /> 보호막 흡수 {h.ab.toLocaleString()}{h.c ? ' (치명)' : ''}</span>;
    if (h.d === 0 && !h.m && h.h == null && h.s == null) return <span key={i} style={{ ...sp, color: LOG_C.miss }}><N id={h.t} /> 피해 없음</span>;
    if (h.h) return <span key={i} style={{ ...sp, color: LOG_C.heal, fontWeight: 600 }}>✚ <N id={h.t} /> +{(h.eh ?? h.h).toLocaleString()}</span>;
    if (h.s) return <span key={i} style={{ ...sp, color: LOG_C.shield, fontWeight: 600 }}>◈ <N id={h.t} /> +{(h.es ?? h.s).toLocaleString()}</span>;
    if (h.buff) return <span key={i} style={{ ...sp, color: LOG_C.buff }}>▲ <N id={h.t} /> 강화</span>;
    if (h.debuff) return <span key={i} style={{ ...sp, color: LOG_C.debuff }}>▼ <N id={h.t} /> 약화</span>;
    if (h.burn) return <span key={i} style={{ ...sp, color: LOG_C.crit }}>🔥 <N id={h.t} /></span>;
    if (h.dot) return <span key={i} style={{ ...sp, color: LOG_C.debuff }}>☠ <N id={h.t} /> 「{e.n}」 부여</span>;
    return null;
  };
  return (
    <div className={latest ? 'chr-log-in' : ''} style={{ fontSize: 12, lineHeight: 1.5, padding: latest ? '3px 6px' : '0 6px', borderRadius: 8, background: latest ? 'rgba(232,176,74,0.10)' : 'transparent', borderLeft: `2px solid ${latest ? actColor : 'transparent'}`, color: PALETTE.textDim, opacity: latest ? 1 : 0.85 }}>
      <span style={{ color: actColor }}>{icon} </span>
      {e.k === 'dotTick' ? <><N id={e.a} /> <span style={{ color: LOG_C.debuff }}>지속 피해{e.dotSrc && Object.keys(e.dotSrc).length ? ` (${[...new Set(Object.keys(e.dotSrc).map(k => k.split('|')[1]))].join('·')})` : ''}</span></> : <><N id={e.a} /> <span style={{ color: actColor, fontWeight: e.skill ? 700 : 400 }}>{e.n}</span></>}
      {(e.hits || []).map(chip)}
    </div>
  );
}

// ===== 전투 재생 =====
const SPEEDS = [1, 2, 4];
function BattleView({ battle, save, onDone, repeat, onToggleRepeat, onAgain, boostLeft = 0, onAskBoost, dungeonAuto = false, onToggleDungeonAuto, autoProg = false, onStopAuto, onReplayDone, sessionReport = null, holdAuto = false, towerAuto = false, onToggleTowerAuto }) {
  const { sim, enemies, party, summary, ctx, xp } = battle;
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState(null); // 전투 집계 (1.215.1)
  const openStats = () => { const r = newHuntStats(); addHuntRecord(r, huntRecord(sim, party, { type: ctx.type, enemies }, summary, speed, ctx.label)); setStats(r); };
  const dungeonNext = ctx.kind === 'dungeon' && sim.result === 'win' && !summary.dungeonClear;
  const towerNext = ctx.kind === 'tower' && sim.result === 'win'; // 첨탑은 지면 도전이 끝난다 — 이기는 동안 계속
  const [speedPref, setSpeed] = useState(() => { try { return +localStorage.getItem('chronicleSpeed') || 2; } catch { return 2; } });
  // ×4는 이용권이 있을 때만 (1.213.0) — 만료되면 ×2로
  const speed = speedPref === 4 && boostLeft <= 0 ? 2 : speedPref;
  const done = idx >= sim.events.length;
  useEffect(() => { if (done) onReplayDone?.(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (done) return undefined;
    const ev = sim.events[idx];
    const base = ev.round ? 160 : ev.k === 'dotTick' ? 380 : 620;
    const t = setTimeout(() => setIdx(i => i + 1), base / speed);
    return () => clearTimeout(t);
  }, [idx, speed, done, sim.events]);
  // 자동 진행 (1.234.0): 승리하면 다음 단계(사냥·관문·보스)로
  useEffect(() => {
    if (!done || !autoProg || stats || holdAuto || sim.result !== 'win' || ctx.kind !== 'field') return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, autoProg, stats, sim.result, ctx, onAgain]);
  // 반복 사냥: 승리 후 자동 다음 전투
  useEffect(() => {
    if (!done || !repeat || stats || holdAuto || sim.result !== 'win' || ctx.kind !== 'field' || ctx.type === 'boss') return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, repeat, stats, sim.result, ctx, onAgain]);
  // 던전 연속 도전 (1.215.1): 승리하면 다음 층 → 보스까지 자동 진행
  useEffect(() => {
    if (!done || !dungeonAuto || !dungeonNext || stats || holdAuto) return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, dungeonAuto, dungeonNext, stats, onAgain]);
  // 첨탑 자동 등반 (1.240.0): 승리하면 다음 층 → 패배할 때까지
  useEffect(() => {
    if (!done || !towerAuto || !towerNext || stats || holdAuto) return undefined;
    const t = setTimeout(onAgain, 1800);
    return () => clearTimeout(t);
  }, [done, towerAuto, towerNext, stats, holdAuto, onAgain]);
  const setSp = (s) => { setSpeed(s); try { localStorage.setItem('chronicleSpeed', String(s)); } catch { /* */ } };

  const cur = sim.events[Math.min(idx, sim.events.length - 1)];
  // 최신 상태 스냅샷 (st가 있는 마지막 사건)
  let st = null;
  for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) { if (sim.events[i].st) { st = sim.events[i].st; break; } }
  const hpOf = (u) => (st && st[u.id] ? st[u.id][0] : u.hp);
  const shOf = (u) => (st && st[u.id] ? st[u.id][1] : 0);
  const unitOf = (id) => [...party, ...enemies].find(u => u.id === id);
  const curHits = cur && cur.a ? cur.hits || [] : [];
  const hitFor = (id) => curHits.filter(h => h.t === id);
  const round = (() => { for (let i = Math.min(idx, sim.events.length - 1); i >= 0; i--) if (sim.events[i].round) return sim.events[i].round; return 1; })();
  const isBoss = ctx.type === 'boss' || ctx.type === 'dungeonBoss';
  const bg = isBoss ? chronicleEnemyArt(enemies[0].key, 'intro') : null;
  // 로그 (1.227.0) — 지금까지의 사건 전부, 최신이 아래. 자동 스크롤
  const logEvents = sim.events.slice(Math.max(0, idx + 1 - 80), idx + 1).filter(e => e.a || e.round);
  const logRef = useRef(null);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [idx]);

  const Float = ({ id }) => hitFor(id).map((h, i) => {
    const txt = h.m ? '빗나감' : h.d === 0 && h.ab > 0 ? `◈흡수 ${h.ab}` : h.h ? `+${h.eh ?? h.h}` : h.s ? `◈${h.es ?? h.s}` : h.buff ? '▲강화' : h.debuff ? '▼약화' : h.dot && h.d == null ? '☠중독' : h.d != null ? `${h.counter ? '반격 ' : h.cover ? '대신 ' : ''}-${h.d}${h.c ? '!' : ''}` : '';
    const color = h.m ? '#bbb' : h.d === 0 && h.ab > 0 ? '#9cc4e4' : h.h ? '#8fe08a' : h.s ? '#9cc4e4' : h.buff ? '#e8c48a' : h.debuff || h.dot ? '#c08ae8' : h.cover ? '#9cc4e4' : h.c ? '#ffd27a' : '#ff8a80';
    if (!txt) return null;
    return <div key={`${idx}-${i}`} className="arc-float absolute font-bold pointer-events-none" style={{ left: '50%', top: '35%', fontSize: h.c ? 22 : 17, color, textShadow: '0 2px 6px #000', animationDelay: `${i * 80}ms`, zIndex: 3 }}>{txt}</div>;
  });
  // 카드 이펙트 — 치명타 섬광 · 회복 초록빛 · 보호막 하늘빛 · 피격 흔들림
  const fxClass = (id) => {
    const hs = hitFor(id);
    if (hs.some(h => h.c && h.d > 0)) return 'chr-fx-crit';
    if (hs.some(h => h.d > 0)) return 'arc-shake';
    if (hs.some(h => h.h)) return 'chr-fx-heal';
    if (hs.some(h => h.s)) return 'chr-fx-shield';
    return '';
  };
  const cardH = enemies.length > 3 || party.length > 3 ? 118 : 150;
  const maxIntim = Math.max(0, ...enemies.map(e => e.intim || 0));

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bg }}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.18 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div className="relative flex items-center gap-2 px-3 pt-2 flex-none" style={{ minHeight: 44 }}>
        <span style={{ fontSize: 12, color: PALETTE.textDim }}>{ctx.label} · {round}라운드{enemies[0]?.rebirthTier ? <span style={{ color: '#ff6ad5' }}> · ✦전승 {enemies[0].rebirthTier}단계</span> : null}{enemies[0]?.mech && BOSS_MECHS[enemies[0].mech] ? <span style={{ color: PALETTE.legendary }}> · {BOSS_MECHS[enemies[0].mech].icon}{BOSS_MECHS[enemies[0].mech].name}</span> : null}{maxIntim ? <span style={{ color: '#ff7a6a' }}> · {maxIntim >= 4 ? '☠절대 위압' : `☗위압 ${maxIntim}단계`}</span> : null}</span>
        <div className="flex-1" />
        {SPEEDS.map(s => {
          const locked = s === 4 && boostLeft <= 0;
          return (
            <button key={s} onClick={() => (locked ? onAskBoost?.() : setSp(s))} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: `1px solid ${speed === s ? PALETTE.legendary : 'var(--ui-line)'}`, color: speed === s ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', opacity: locked ? 0.6 : 1 }}>
              {locked ? '×4 🔒' : s === 4 ? `×4 ${Math.ceil(boostLeft / 60000)}분` : `×${s}`}
            </button>
          );
        })}
        {!done && <button onClick={() => setIdx(sim.events.length)} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: '1px solid var(--ui-line)', color: PALETTE.dawn, background: 'transparent' }}>⏩</button>}
      </div>

      {/* 적 */}
      <div className="relative flex gap-2 px-3 pt-1 flex-none">
        {enemies.map(e => (
          <BattleCard key={e.id} u={e} art={chronicleEnemyArt(e.key)} hp={hpOf(e)} sh={shOf(e)} acting={cur?.a === e.id} fx={fxClass(e.id)} h={cardH} enemy
            border={e.tier === 'boss' ? '#c4453d88' : e.tier === 'elite' ? '#e8b04a88' : 'var(--ui-line)'}>
            <Float id={e.id} />
          </BattleCard>
        ))}
      </div>

      {/* 전투 로그 — 적과 아군 사이 전체 */}
      <div className="relative flex-1 min-h-0 mx-3 my-2 flex flex-col" style={{ borderRadius: 12, background: 'rgba(0,0,0,0.38)', border: '1px solid var(--ui-line)' }}>
        {cur?.skill && !done && (
          <div key={`call-${idx}`} className="chr-skill-call absolute font-bold pointer-events-none text-center" style={{ left: '50%', top: '50%', zIndex: 4, fontSize: 22, color: PALETTE.legendary, fontFamily: FONT_TITLE, textShadow: '0 0 14px #e8b04acc, 0 2px 6px #000', whiteSpace: 'nowrap' }}>
            ✦ {cur.n}
            <div style={{ fontSize: 12, color: PALETTE.text, fontWeight: 400, textShadow: '0 1px 4px #000' }}>{unitOf(cur.a)?.name}</div>
          </div>
        )}
        <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-1">
          {logEvents.map((e, i) => <BattleLogLine key={`${idx - (logEvents.length - 1 - i)}-${i}`} e={e} latest={i === logEvents.length - 1 && !done} unitOf={unitOf} />)}
        </div>
      </div>

      {/* 아군 — 적과 같은 카드 형식 */}
      <div className="relative flex gap-2 px-3 pb-2 flex-none">
        {party.map(p => (
          <BattleCard key={p.id} u={p} art={p.fam ? chronicleEnemyArt(p.famKey) : chronicleClass(p.classId).combatImage} hp={hpOf(p)} sh={shOf(p)} acting={cur?.a === p.id} fx={fxClass(p.id)} h={cardH}
            border={p.fam ? '#d07ae888' : `${chronicleClass(p.classId).color}88`}
            xp={xp && cardH >= 150 ? (() => {
              const b = p.fam ? xp.before.fam : xp.before.hero; const a = p.fam ? xp.after.fam : xp.after.hero;
              if (!b) return null;
              const win = done && sim.result === 'win' && a;
              return { pct: xpPct(win ? a : b), gain: win ? (p.fam ? summary.famExp?.gained || 0 : summary.exp || 0) : 0 };
            })() : null}>
            <Float id={p.id} />
          </BattleCard>
        ))}
      </div>

      {/* 결과 */}
      {done && (
        <div className="relative flex-none px-3 pb-3">
          <GlassPanel strong className="p-3">
            <div className={`font-bold text-center ${sim.result === 'win' ? 'chr-win' : ''}`} style={{ fontSize: 17, color: sim.result === 'win' ? PALETTE.legendary : '#e06a5f', fontFamily: FONT_TITLE }}>
              {sim.result === 'win' ? '승리' : '전멸'}
            </div>
            {sim.result === 'win' ? (
              <div className="mt-1.5 flex flex-col gap-1" style={{ fontSize: 12.5, color: PALETTE.text }}>
                {ctx.kind !== 'raid' && <div className="text-center">경험치 +<CountUp v={summary.exp} /> · 🪙 +<CountUp v={summary.gold} /> · ✦ +{summary.essence}{summary.shard ? ` · ◆ +${summary.shard}` : ''}</div>}
                {xp && (xp.after.hero || xp.after.fam) && <div className="flex flex-col gap-1.5 mt-1 mb-0.5">
                  <XpResultRow art={chronicleClass(save.hero).combatImage} name={chronicleClass(save.hero).name} before={xp.before.hero} after={xp.after.hero} />
                  {xp.after.fam && summary.famExp ? <XpResultRow fam art={chronicleEnemyArt(xp.after.fam.key)} name={F.famName(xp.after.fam.key)} before={xp.before.fam} after={xp.after.fam} /> : null}
                </div>}
                {Object.entries(summary.levelUps).map(([cid, lv]) => (
                  <div key={cid} className="text-center font-semibold chr-levelup" style={{ color: PALETTE.legendary }}>▲ 레벨 업! {chronicleClass(cid).name} Lv.{lv}</div>
                ))}
                {summary.items.map(it => (
                  <div key={it.uid} className="text-center" style={{ color: gradeOf(it.grade).color, fontWeight: it.grade === 'unique' || it.grade === 'mythic' ? 700 : 400 }}><span className={gradeIdx(it.grade) >= gradeIdx('rare') ? 'chr-drop' : ''} style={{ '--g': gradeOf(it.grade).color }}>{it.grade === 'mythic' ? '✦ 전승 장비 획득: ' : it.grade === 'unique' ? '★ 유니크 획득: ' : '획득: '}{E.itemName(it)} ({gradeOf(it.grade).label}{E.itemUsable(it, save.hero) ? '' : ` · ${clsTag(it)}`})</span></div>
                ))}
                {summary.autoSalvaged ? <div className="text-center" style={{ color: PALETTE.textDim }}>♻ 자동 분해 {summary.autoSalvaged}개 → {E.salvageText(summary.autoSalvage || {})}</div> : null}
                {summary.autoDismantled ? <div className="text-center" style={{ color: PALETTE.textDim }}>가방이 가득 차 {summary.autoDismantled}개 자동 분해</div> : null}
                {summary.unlocks.map(u => <div key={u} className="text-center" style={{ color: '#9cc4e4' }}>🔓 {u} 개방</div>)}
                {summary.dungeonClear && <div className="text-center font-semibold" style={{ color: '#c08ae8' }}>던전 정복!</div>}
                {summary.towerCoins ? <div className="text-center" style={{ color: '#e8b04a' }}>✪ 첨탑 주화 +{summary.towerCoins}{summary.towerWeekly ? ` (주간 ${summary.towerFloor}층 첫 도달 +${summary.towerWeekly} 포함)` : ''}</div> : null}
                {summary.towerCheckpoint ? <div className="text-center font-semibold" style={{ color: '#9cc4e4' }}>🚩 {summary.towerCheckpoint}층 체크포인트 저장 — 다음 도전은 {summary.towerCheckpoint + 1}층부터</div> : null}
                {summary.gateOpen ? <div className="text-center font-semibold" style={{ color: PALETTE.legendary }}>⚔ 처치 목표 달성 — 관문 도전 가능!</div> : null}
                {summary.stageClear ? <div className="text-center font-semibold" style={{ color: '#9cc4e4' }}>🔓 스테이지 {summary.stageClear} 관문 통과!</div> : null}
                {summary.famShards || summary.famSouls ? <div className="text-center" style={{ color: '#d07ae8' }}>{summary.famShards ? `📜 계약서 조각 +${summary.famShards}` : ''}{summary.famShards && summary.famSouls ? ' · ' : ''}{summary.famSouls ? `🔮 사역혼 +${summary.famSouls}` : ''}</div> : null}
                {summary.famExp?.ups ? <div className="text-center font-semibold" style={{ color: '#e8b04a' }}>🐾 {F.famName(summary.famExp.key)} Lv.{summary.famExp.lv} 달성!</div> : null}
                {summary.keys ? <div className="text-center font-semibold" style={{ color: PALETTE.legendary }}>🗝 던전 열쇠 +{summary.keys}</div> : null}
                {summary.talentScroll ? <div className="text-center font-semibold" style={{ color: '#7fd1c8' }}>📖 특성 초기화 주문서 +{summary.talentScroll}</div> : null}
                {summary.raid?.reward ? <div className="text-center font-semibold" style={{ color: '#ff8a80' }}>⚔ 원정대 레이드 보상{summary.raid.first ? ' (첫 클리어!)' : ''} — {R.rosterRewardText(summary.raid.reward)}</div> : null}
                {summary.raid?.noReward ? <div className="text-center" style={{ color: PALETTE.textDim }}>오늘 이 단계 보상은 이미 받았다 (KST 0시 초기화)</div> : null}
                {(summary.questsDone || []).map(t => <div key={t} className="text-center font-semibold" style={{ color: PALETTE.dawn }}>📜 의뢰 완료: {t} — 게시판에서 보상</div>)}
              </div>
            ) : (
              <div className="mt-1 text-center" style={{ fontSize: 12.5, color: PALETTE.textDim }}>
                {ctx.kind === 'raid' ? '원정대가 무너졌다 — 봉인의 주인이 쓰러지면 그 봉인은 깰 수 없다. 약한 캐릭터를 더 키워 다시 도전하자.' : ctx.kind === 'tower' ? `첨탑 ${summary.towerFell}층에서 쓰러졌다. 다음 도전은 체크포인트부터.` : ctx.kind === 'dungeon' ? '던전에서 쫓겨났다.' : `쓰러졌다 — 사냥터로 돌아간다.${summary.goldLost ? ` (골드 -${summary.goldLost})` : ''}`}
              </div>
            )}
            <div className="flex gap-2 mt-2.5">
              <button onClick={openStats} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 12, border: '1px solid var(--ui-line-strong)', color: PALETTE.text, background: 'transparent' }}>📊 전투 집계</button>
              {sessionReport && <button onClick={() => setStats(sessionReport)} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 12, border: '1px solid #e8b04a88', color: PALETTE.legendary, background: 'transparent' }}>📋 사냥 보고서</button>}
              {battle.runReport && <button onClick={() => setStats(battle.runReport)} className="ui-press flex-1" style={{ height: 34, borderRadius: 10, fontSize: 12, border: '1px solid #c08ae888', color: '#c08ae8', background: 'transparent' }}>{battle.runReport.kind === 'tower' ? '🗼 첨탑 도전 집계' : '🏰 던전 전체 집계'}</button>}
            </div>
            <div className="flex gap-2 mt-2">
              {towerNext && (
                <UIButton variant={towerAuto ? 'gold' : 'ghost'} style={{ height: 42 }} onClick={onToggleTowerAuto}>{towerAuto ? '자동 등반 중… (끄기)' : '자동 등반'}</UIButton>
              )}
              {dungeonNext && (
                <UIButton variant={dungeonAuto ? 'gold' : 'ghost'} style={{ height: 42 }} onClick={onToggleDungeonAuto}>{dungeonAuto ? '연속 도전 중… (끄기)' : '연속 도전'}</UIButton>
              )}
              {autoProg && ctx.kind === 'field' && (
                <UIButton variant="gold" style={{ height: 42 }} onClick={onStopAuto}>자동 진행 중… (끄기)</UIButton>
              )}
              {!autoProg && ctx.kind === 'field' && ctx.type !== 'boss' && sim.result === 'win' && (
                <UIButton variant={repeat ? 'gold' : 'ghost'} style={{ height: 42 }} onClick={onToggleRepeat}>{repeat ? '반복 중… (끄기)' : '반복 사냥'}</UIButton>
              )}
              {(dungeonNext || towerNext)
                ? <UIButton style={{ height: 42 }} onClick={onAgain}>다음 층으로 ▸</UIButton>
                : <UIButton style={{ height: 42 }} onClick={onDone}>{ctx.kind === 'dungeon' ? '던전 목록으로' : ctx.kind === 'tower' ? '첨탑으로' : ctx.kind === 'raid' ? '레이드로' : '사냥터로'}</UIButton>}
            </div>
            {(dungeonNext || towerNext) && (
              <button onClick={onDone} className="ui-press w-full mt-2" style={{ fontSize: 12.5, color: PALETTE.dawn, background: 'transparent', border: 'none', padding: 6 }}>잠시 멈추기 ({ctx.kind === 'dungeon' ? '던전 화면' : '첨탑 화면'}으로)</button>
            )}
            {ctx.kind === 'field' && sim.result === 'win' && ctx.type !== 'boss' && (
              <button onClick={onAgain} className="ui-press w-full mt-2" style={{ fontSize: 12.5, color: PALETTE.dawn, background: 'transparent', border: 'none', padding: 6 }}>한 번 더 사냥</button>
            )}
          </GlassPanel>
        </div>
      )}
      {stats && <HuntReport report={stats} title={stats === battle.runReport ? (battle.runReport.kind === 'tower' ? '🗼 첨탑 도전 집계' : '🏰 던전 전체 집계') : stats === sessionReport ? '📋 사냥 보고서' : '📊 전투 집계'} onClose={() => setStats(null)} />}
    </div>
  );
}

// ===== 원정대 레이드 「다섯 봉인」 (1.231.0) =====
function RaidView({ save, onBack, onFight }) {
  const roster = save.roster || {};
  const raid = save.raid || {};
  const today = E.kstDateKey();
  const doneToday = raid.daily?.date === today ? raid.daily.done || {} : {};
  // 1.251.0 — 본편 스타일 (시안 ㉒)
  const [rules, setRules] = useState(false);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="원정대 레이드" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 다섯 봉인</span>
          <button onClick={() => setRules(true)} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text }}>ⓘ 규칙</button>
        </div>
        {RD.RAID_TIERS.map((t, i) => {
          const eligible = RD.raidEligible(roster, t);
          const unlocked = RD.raidUnlocked(roster, raid, i);
          const clears = raid.clears?.[t.id] || 0;
          const first = clears === 0;
          const rw = RD.raidReward(i, first);
          const prevOk = i === 0 || (raid.clears?.[RD.RAID_TIERS[i - 1].id] || 0) > 0;
          const miss = CHRONICLE_CLASSES.filter(c => !RD.raidMemberOk(roster[c.id], t)).length;
          return (
            <div key={t.id} style={{ padding: 10, border: `1px solid ${unlocked ? MS.red : MS.line}`, background: MS.box, opacity: prevOk ? 1 : 0.5 }}>
              <div className="flex gap-2.5">
                <img src={chronicleEnemyArt(Object.keys(ENEMIES).find(k => ENEMIES[k].name === t.boss))} alt="" className="object-cover flex-none" style={{ width: 64, height: 64, border: `1px solid ${MS.red}`, filter: unlocked ? 'none' : 'grayscale(.8) brightness(.6)' }} draggable={false} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-bold" style={{ fontSize: 14, color: unlocked ? PALETTE.text : PALETTE.textDim }}>{i + 1}. {t.name} <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}>{clears ? `클리어 ${clears}회${doneToday[t.id] ? ' · 오늘 받음' : ''}` : '미클리어'}</span></div>
                  <div className="truncate" style={{ fontSize: 11.5, color: MS.gold }}>입장: 전원 {t.req.rebirth ? `전승 ${t.req.rebirth}회 · ` : ''}Lv.{t.req.lv}{i ? ' · 앞 단계 클리어' : ''}</div>
                  {prevOk && <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    {CHRONICLE_CLASSES.map(c => {
                      const r = roster[c.id]; const ok = RD.raidMemberOk(r, t);
                      return (
                        <div key={c.id} className="text-center" style={{ minWidth: 0 }}>
                          <img src={c.combatImage} alt="" className="w-full object-cover" style={{ height: 30, objectPosition: '50% 20%', border: `1px solid ${ok ? '#8fd08a' : MS.line}`, filter: ok ? 'none' : 'grayscale(1) brightness(.45)' }} />
                          <div className="truncate" style={{ fontSize: 10.5, color: ok ? '#8fd08a' : '#e07a6a' }}>{r ? `${r.rebirth ? '✦' : ''}${r.lv}` : '없음'}</div>
                        </div>
                      );
                    })}
                  </div>}
                </div>
              </div>
              {prevOk && <>
                <div className="flex justify-between gap-2 mt-2" style={{ fontSize: 12 }}>
                  <span className="flex-none" style={{ color: PALETTE.textDim }}>{first ? '첫 클리어' : doneToday[t.id] ? '오늘은 받음' : '오늘 보상'}</span>
                  <b className="text-right" style={{ color: MS.gold }}>{R.rosterRewardText(rw)}</b>
                </div>
                <button disabled={!unlocked} onClick={() => onFight(t.id)} className="ui-press w-full mt-2 font-bold" style={{ height: 42, border: `1px solid ${unlocked ? MS.red : MS.line}`, background: unlocked ? 'rgba(224,87,76,0.2)' : 'transparent', color: unlocked ? '#ff8a7e' : PALETTE.textDim, fontSize: 13.5 }}>
                  {unlocked ? '⚔ 원정대 출격' : !eligible ? `조건 미달 — ${miss}명 부족` : '잠김'}
                </button>
              </>}
            </div>
          );
        })}
      </div>
      {rules && (
        <MainModal kicker="원 정 대 레 이 드" title="다섯 봉인 규칙" onClose={() => setRules(false)}>
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.75 }}>
            <div>◇ 보스는 <b style={{ color: MS.gold }}>직업별 봉인 5개</b>가 지킨다 — 하나라도 남으면 보스는 무적</div>
            <div>◇ 봉인은 <b style={{ color: MS.gold }}>그 직업만</b> 깰 수 있고, 자기 주인만 계속 공격한다 (봉인의 반향)</div>
            <div style={{ color: '#e07a6a' }}>◇ 봉인의 주인이 쓰러지면 그 봉인은 못 깬다 → 즉시 실패</div>
            <div>◇ 입장 = 다섯 캐릭터 <b>전원</b>이 조건 충족 · 앞 단계를 깨야 다음 단계</div>
            <div style={{ color: PALETTE.textDim }}>◇ 보상은 단계마다 하루 1회 + 첫 클리어 보너스 (모든 캐릭터 공유) · 동행 사역마는 참가하지 않고 패시브만 적용</div>
          </div>
        </MainModal>
      )}
    </div>
  );
}

// ===== 원정대 (1.229.0) — 레벨 상한 · 전역 버프 =====
function RosterView({ save, setSave, flash, onBack, onSwitchChar, onRaid }) {
  const roster = save.roster || {};
  const cap = E.levelCapOf(save);
  const hint = R.nextCapHint(roster);
  const got = R.globalBuffFx(roster, save.hero);
  const n60 = R.reachedCount(roster, R.ROSTER.unlockLv);
  // 1.246.0 — 의뢰 정렬(받기 → 진행 → 받음) · 받는 버프 출처
  const qOrder = { done: 0, progress: 1, claimed: 2 };
  const qs = R.ROSTER_QUESTS.map(q => ({ q, st: R.rosterQuestState(save, q) })).sort((a, b) => (qOrder[a.st.status] ?? 1) - (qOrder[b.st.status] ?? 1));
  const buffSrc = CHRONICLE_CLASSES.filter(c => c.id !== save.hero && roster[c.id]).flatMap(c => R.ROSTER_MILESTONES.map((lv, i) => ({ lv, i })).filter(({ lv }) => roster[c.id].peak >= lv).map(({ lv, i }) => ({ key: `${c.id}${lv}`, name: c.name, lv, fx: R.GLOBAL_BUFFS[c.id].fx[i] })));
  // 1.251.0 — 본편 스타일 (시안 ㉑)
  const [detail, setDetail] = useState(null); // 직업별 버프 상세
  const raidOk = RD.raidEligible(roster, RD.RAID_TIERS[0]);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="원정대" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
        <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 레벨 상한</span>
          <b style={{ fontSize: 17, color: MS.gold }}>Lv.{cap}</b>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[60, 70, 80, 90, 100].map(c => <div key={c} className="text-center" style={{ padding: '6px 0', fontSize: 12, fontWeight: cap === c ? 800 : 500, border: `1px solid ${cap >= c ? MS.gold : MS.line}`, background: MS.box, color: cap >= c ? MS.gold : PALETTE.textDim }}>{c}</div>)}
        </div>
        <div className="mt-1.5" style={{ fontSize: 11.5, color: PALETTE.textDim }}>
          {hint ? <>다음: 캐릭터 <b style={{ color: MS.gold }}>{hint.need}명</b>이 Lv.{R.ROSTER.unlockLv} → 상한 Lv.{hint.next}</> : <b style={{ color: MS.gold }}>모든 상한 해제 완료</b>} · 지금 Lv.{R.ROSTER.unlockLv} 달성 {n60}명
        </div>

        <MainSecHead title="원 정 대" right={<span style={{ fontSize: 11, color: PALETTE.textDim }}>누르면 주는 버프</span>} />
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {CHRONICLE_CLASSES.map(c => {
            const r = roster[c.id]; const me = c.id === save.hero;
            return (
              <button key={c.id} onClick={() => setDetail(c.id)} className="ui-press text-center" style={{ background: 'transparent', border: 'none', padding: 0, minWidth: 0 }}>
                <img src={c.combatImage} alt="" className="w-full object-cover" style={{ height: 42, objectPosition: '50% 20%', border: `1.5px solid ${me ? MS.gold : r ? MS.strong : MS.line}`, filter: r ? 'none' : 'grayscale(1) brightness(.45)' }} />
                <div className="truncate" style={{ fontSize: 10.5, color: me ? MS.gold : r ? PALETTE.text : PALETTE.textDim }}>{r ? `${r.rebirth ? '✦' : ''}Lv.${r.lv}` : '없음'}</div>
              </button>
            );
          })}
        </div>

        <button onClick={onRaid} className="ui-press w-full text-left mt-3" style={{ padding: '9px 10px', border: `1px solid ${raidOk ? MS.red : MS.line}`, background: MS.box }}>
          <div className="font-bold" style={{ fontSize: 13.5, color: raidOk ? '#ff8a7e' : PALETTE.textDim }}>⚔ 원정대 레이드 「다섯 봉인」 ›</div>
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{raidOk ? '다섯 캐릭터가 함께 싸운다 — 각자 자기 봉인을 깨야 보스에 닿는다' : '다섯 캐릭터 모두 Lv.60이 되면 입장'}</div>
        </button>

        <MainSecHead title={`${chronicleClass(save.hero).name.split('').join(' ')} 가 받 는 전 역 버 프`} />
        {buffSrc.length ? <>
          <MainKvRows rows={buffSrc.map(x => ({ l: `${x.name} Lv.${x.lv}`, v: R.rosterFxText(x.fx), c: '#8fd08a' }))} />
          <div className="mt-1" style={{ padding: '7px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5 }}><b style={{ color: MS.red }}>◇ 합계</b> <span style={{ color: '#8fd08a' }}>{R.rosterFxText(got)}</span></div>
        </> : <div style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12, color: PALETTE.textDim }}>아직 없음 — 다른 캐릭터를 Lv.20 이상 키우면 생긴다</div>}

        <div className="flex items-center justify-between" style={{ margin: '14px 0 7px' }}>
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 원정대 의뢰</span>
          <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>받기 {qs.filter(x => x.st.status === 'done').length} · 진행 {qs.filter(x => x.st.status === 'progress').length} · 완료 {qs.filter(x => x.st.status === 'claimed').length}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {qs.map(({ q, st }) => {
            const done = st.status === 'done', claimed = st.status === 'claimed';
            return (
              <div key={q.id} style={{ padding: '7px 9px', border: `1px solid ${done ? MS.gold : MS.line}`, background: MS.box, opacity: claimed ? 0.45 : 1, minWidth: 0 }}>
                <div className="truncate font-bold" style={{ fontSize: 12.5, color: done ? MS.gold : PALETTE.text }}>{q.title}</div>
                <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{q.desc}</div>
                <div className="my-1"><Bar v={claimed ? q.need : st.cur} max={q.need} color={MS.gold} h={4} /></div>
                <div className="flex items-center justify-between gap-1" style={{ fontSize: 11 }}>
                  <span style={{ color: PALETTE.textDim }}>{claimed ? '✓ 받음' : `${st.cur}/${q.need}`}</span>
                  <span className="truncate" style={{ color: MS.gold }}>{R.rosterRewardText(q.reward).replace(/골드 |계약서 조각 /g, '')}</span>
                </div>
                {done && <button onClick={() => { setSave(R.claimRosterQuest(save, q.id)); flash(`원정대 의뢰 「${q.title}」 보상 — ${R.rosterRewardText(q.reward)}`); }} className="ui-press w-full mt-1 font-bold" style={{ height: 28, border: `1px solid ${MS.gold}`, color: '#1a1206', background: MS.gold, fontSize: 12 }}>받기</button>}
              </div>
            );
          })}
        </div>
        <div className="mt-3" style={{ fontSize: 11, color: PALETTE.textDim }}>각 캐릭터가 Lv.20 · 40 · 60 · 80 · 100에 도달할 때마다 「다른」 캐릭터 전원에게 영구 버프 (전승해도 최고 레벨 기준 유지)</div>
      </div>
      {detail && (() => {
        const c = chronicleClass(detail); const r = roster[detail]; const buff = R.GLOBAL_BUFFS[detail]; const me = detail === save.hero;
        return (
          <MainModal img={c.combatImage} kicker="원 정 대" title={c.name} color={c.color} badge={r ? `Lv.${r.lv}` : '없음'} sub={r ? `${r.peak > r.lv ? `최고 Lv.${r.peak} · ` : ''}${r.rebirth ? `✦전승 ${r.rebirth}회 · ` : ''}「${buff.title}」` : '아직 만들지 않음'} onClose={() => setDetail(null)}
            footer={!me && <button onClick={() => { setDetail(null); onSwitchChar(); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 13 }}>{r ? '이 캐릭터로 전환' : '캐릭터 만들기'}</button>}>
            <MainSecHead title="다 른 캐 릭 터 에 게 주 는 버 프" />
            {R.ROSTER_MILESTONES.map((lv, i) => {
              const on = r && r.peak >= lv;
              return (
                <div key={lv} className="flex items-baseline justify-between gap-2" style={{ padding: '4px 0', borderBottom: '1px dashed rgba(196,69,61,0.18)' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: on ? MS.gold : PALETTE.textDim }}>{on ? '✓ ' : ''}Lv.{lv}</span>
                  <span className="text-right" style={{ fontSize: 12.5, color: on ? '#8fd08a' : PALETTE.textDim }}>{R.rosterFxText(buff.fx[i])}</span>
                </div>
              );
            })}
          </MainModal>
        );
      })()}
    </div>
  );
}

// ===== 마을 =====
function TownView({ save, acc, go, onExit, onSwitchChar }) {
  const hero = save.units[save.hero];
  const alertParty = hero.points > 0 || hero.sp > 0;
  const cls = chronicleClass(save.hero);
  const nextField = CHRONICLE_FIELDS.find(f => !save.progress.bossCleared[f.id]);
  const main = Q.currentMainQuest(save);
  const goal = nextField
    ? `${main ? `[${main.title}] ` : ''}${nextField.name} — ${E.bossReady(save, nextField.id) ? '보스 도전 가능' : `스테이지 ${E.stageState(save, nextField.id).cleared + 1}/${FIELD_STAGES}`}`
    : main ? `[${main.title}] 보상을 받으러 게시판으로` : '2부 완결! 던전·보스 재도전으로 유니크를 노리자';
  const qBadge = Q.questBadgeCount(save);
  // 「지금 할 일」 (1.232.2) — 우선순위 순 최대 3개
  const todos = (() => {
    const L = [];
    if (hero.points > 0 || hero.sp > 0) L.push({ id: 'party', icon: '🧭', t: `성장 포인트 사용${hero.points ? ` · 능력치 ${hero.points}` : ''}${hero.sp ? ` · 스킬 ${hero.sp}` : ''}` });
    if (qBadge > 0) L.push({ id: 'quests', icon: '📜', t: `의뢰 게시판 새 소식 ${qBadge}건` });
    const dB = D.dailyBadge(acc); if (dB) L.push({ id: 'daily', icon: '📅', t: `일일 임무 보상 ${dB}건` });
    if (nextField && E.fieldUnlocked(save, nextField.id)) {
      const st = E.stageState(save, nextField.id);
      if (E.bossReady(save, nextField.id)) L.push({ id: 'field', icon: '👑', t: `${nextField.name} 보스 도전 가능` });
      else if (st.cleared < FIELD_STAGES && E.gateReady(save, nextField.id, st.cleared)) L.push({ id: 'field', icon: '⚔', t: `${nextField.name} ${st.cleared + 1} 관문 도전 가능` });
    }
    const rq = R.rosterQuestBadge(save); if (rq) L.push({ id: 'roster', icon: '🏳', t: `원정대 의뢰 보상 ${rq}건` });
    const rd = RD.RAID_TIERS.filter((t, i) => RD.raidUnlocked(save.roster, save.raid, i) && !(save.raid?.daily?.date === E.kstDateKey() && save.raid.daily.done?.[t.id])).length;
    if (rd) L.push({ id: 'raid', icon: '⚔', t: `원정대 레이드 오늘 보상 ${rd}단계 남음` });
    if (E.famSlotOpen(save, 'main') && (save.mats.famShard || 0) >= F.FAM_TUNING.shardsPerSummon) L.push({ id: 'fam', icon: '🐾', t: '사역마 소환 가능' });
    if (E.dungeonUnlocked(save) && !save.dungeon && E.keyCount(save) >= DUNGEON_KEYS.max) L.push({ id: 'dungeon', icon: '🗝', t: `열쇠가 가득 참 (${E.keyCount(save)}개) — 던전으로` });
    if (save.inventory.length >= E.bagMax(save) * 0.9) L.push({ id: 'bag', icon: '🎒', t: `가방이 거의 가득 참 (${save.inventory.length}/${E.bagMax(save)})` });
    return L.slice(0, 3);
  })();
  const tiles = [
    { id: 'quests', icon: '📜', label: '의뢰 게시판', sub: qBadge ? `새 소식 ${qBadge}건` : '메인 · 의뢰 · 이야기', badge: qBadge > 0 },
    { id: 'field', icon: '⚔', label: '사냥터', sub: '몹 사냥 · 보스' },
    { id: 'tower', icon: '🗼', label: '황혼의 첨탑', sub: E.towerUnlocked(save.progress) ? (save.tower?.run ? `${save.tower.run.floor}층 도전 중` : `최고 ${save.tower?.best || 0}층 · ✪${save.mats.towerCoin || 0}`) : '마계의 균열 보스 후 개방', locked: !E.towerUnlocked(save.progress) },
    { id: 'dungeon', icon: '🕳', label: '던전', sub: save.dungeon ? `${dungeonDef(save.dungeon.id).name} 진행 중` : E.dungeonUnlocked(save) ? `🗝 열쇠 ${E.keyCount(save)}개 · ${CHRONICLE_DUNGEONS.filter(d => E.dungeonUnlocked(save, d.id)).length}곳` : '죽은 자의 숲 보스 후 개방', locked: !E.dungeonUnlocked(save) },
    { id: 'party', icon: '🧭', label: '성장', sub: '능력치 · 스킬 · 장비', badge: alertParty },
    { id: 'raid', icon: '⚔', label: '원정대 레이드', sub: (() => { const n = RD.RAID_TIERS.filter((t, i) => RD.raidUnlocked(save.roster, save.raid, i)).length; return n ? `「다섯 봉인」 ${n}단계 도전 가능` : '다섯 캐릭터 모두 Lv.60이면 입장'; })(), badge: RD.RAID_TIERS.some((t, i) => RD.raidUnlocked(save.roster, save.raid, i) && !(save.raid?.daily?.date === E.kstDateKey() && save.raid.daily.done?.[t.id])) },
    { id: 'roster', icon: '🏳', label: '원정대', sub: R.rosterQuestBadge(save) ? `의뢰 보상 ${R.rosterQuestBadge(save)}건` : `레벨 상한 ${E.levelCapOf(save)} · 전역 버프 · 의뢰`, badge: R.rosterQuestBadge(save) > 0 },
    { id: 'bag', icon: '🎒', label: '가방', sub: `${save.inventory.length}/${E.bagMax(save)}${save.inventory.some(i => !E.itemUsable(i, save.hero)) ? ' · 다른 직업 장비 있음' : ''}` },
    { id: 'fam', icon: '🐾', label: '사역마', sub: E.famSlotOpen(save, 'main') ? `📜 ${save.mats.famShard || 0} · 보유 ${Object.keys(save.fams || {}).length}` : `Lv.${F.FAM_TUNING.slotLv.main}부터 동행`, badge: (save.mats.famShard || 0) >= F.FAM_TUNING.shardsPerSummon },
    { id: 'stash', icon: '🏛', label: '공용 창고', sub: `${(save.stash || []).length}/${A.STASH_MAX} · 모든 캐릭터 공유` },
    { id: 'forge', icon: '⚒', label: '대장간', sub: '강화 · 등급 승급' },
    { id: 'daily', icon: '📅', label: '일일 임무', sub: (() => { const n = D.DAILY_MISSIONS.filter(m => D.missionState(acc, m).status !== 'progress').length; return `오늘 ${n}/${D.DAILY_MISSIONS.length} 달성`; })(), badge: D.dailyBadge(acc) > 0 },
    { id: 'exit', icon: '⇄', label: '게임 선택', sub: '진행은 자동 저장' },
  ];
  const byId = Object.fromEntries(tiles.map(t => [t.id, t]));
  const GROUPS = [
    { label: '전 투', ids: ['field', 'dungeon', 'tower'] },
    { label: '성 장', ids: ['party', 'fam', 'forge'] },
    { label: '의 뢰 · 원 정 대', ids: ['quests', 'daily', 'roster'] },
    { label: '레 이 드 · 보 관', ids: ['raid', 'bag', 'stash'] },
  ];
  const fx = expSnap(save).fam;
  const ff = fx && save.fams[fx.key];
  // 1.251.0 — 본편 스타일 (시안 ⑲)
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_2/twilightChild_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.1 }} />
      <div className="relative flex items-center gap-2 px-3 flex-none" style={{ minHeight: 54, borderBottom: `1px solid ${MS.line}` }}>
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: 15, color: PALETTE.text }}>여명의 마을</div>
          <div style={{ fontSize: 11, color: PALETTE.textDim }}>{CHRONICLE_TITLE}</div>
        </div>
        <Wallet save={save} />
      </div>
      <div className="relative flex-1 overflow-y-auto px-4 py-3 flex flex-col">
        <div className="flex gap-3 pb-3" style={{ borderBottom: `1px solid ${MS.line}` }}>
          <img src={cls.combatImage} alt="" className="object-cover flex-none" style={{ width: 76, height: 76, borderRadius: 14, border: `1.5px solid ${MS.gold}`, objectPosition: '50% 25%' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div style={{ fontSize: 10.5, letterSpacing: 4, color: MS.red }}>{CLASS_PATH[save.hero] || 'PATH'}</div>
              <button onClick={onSwitchChar} className="ui-press flex-none" style={{ fontSize: 11.5, padding: '3px 8px', border: `1px solid ${MS.line}`, color: PALETTE.text, background: MS.box }}>⇄ 변경</button>
            </div>
            <div className="font-bold" style={{ fontSize: 19, color: PALETTE.text, lineHeight: 1.2 }}>{cls.name} <span style={{ fontSize: 14, color: MS.gold }}>Lv.{hero.lv}</span> <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}>/ {E.levelCapOf(save)} · {cls.role}</span></div>
            <div style={{ fontSize: 12.5, color: PALETTE.text }}>♡ {E.deriveUnit(save, save.hero).maxHp.toLocaleString()} · ⚔ 전투력 {E.unitPower(save, save.hero).toLocaleString()}</div>
            <div className="mt-1"><Bar v={hero.exp} max={expNeedFor(hero)} color={XP_HERO} h={5} /></div>
            <div className="truncate" style={{ fontSize: 10.5, color: PALETTE.textDim }}>경험치 {Math.floor(hero.exp / Math.max(1, expNeedFor(hero)) * 100)}% · ▶ {goal}</div>
            <button onClick={() => go('fam')} className="ui-press w-full text-left mt-0.5 truncate" style={{ fontSize: 11, background: 'transparent', border: 'none', padding: 0, color: PALETTE.textDim }}>
              {fx ? <>🐾 <span style={{ color: MS.violet }}>{F.famName(fx.key)} Lv.{fx.lv}</span> · {F.famGrade(ff.grade).label}{ff.plus ? ` +${ff.plus}` : ''} · {fx.cap ? '주인공 레벨 도달' : `경험치 ${Math.floor(xpPct(fx))}%`}</> : '🐾 동행 사역마 없음 — 눌러서 편성'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ margin: '14px 0 7px' }}>
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 지금 할 일</span>
          <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{todos.length}</span>
        </div>
        {todos.length ? todos.map((d, i) => (
          <button key={i} onClick={() => go(d.id)} className="ui-press w-full flex items-center gap-2 text-left" style={{ minHeight: 40, padding: '8px 10px', marginTop: i ? 5 : 0, background: MS.box, border: `1px solid ${MS.line}` }}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{d.icon}</span>
            <span className="flex-1" style={{ fontSize: 12.5, color: PALETTE.text }}><HiNum text={d.t} color={MS.gold} /></span>
            <span style={{ fontSize: 13, color: PALETTE.textDim }}>›</span>
          </button>
        )) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>당장 할 일은 모두 마쳤다 — 사냥으로 성장하자</div>}
        {GROUPS.map(gp => (
          <div key={gp.label}>
            <MainSecHead title={gp.label} />
            <div className="grid grid-cols-3 gap-1.5 ui-stagger">
              {gp.ids.map(id => byId[id]).map(t => (
                <button key={t.id} disabled={t.locked} onClick={() => (t.id === 'exit' ? onExit() : go(t.id))} aria-label={t.label} className="ui-press relative text-left" style={{ padding: '9px 8px', borderRadius: 12, background: MS.box, border: `1px solid ${MS.line}`, opacity: t.locked ? 0.45 : 1, minHeight: 78 }}>
                  <div style={{ fontSize: 18 }}>{t.icon}</div>
                  <div className="font-bold mt-0.5" style={{ fontSize: 13, color: PALETTE.text }}>{t.label}</div>
                  <div style={{ fontSize: 10.5, color: PALETTE.textDim, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.sub}</div>
                  {t.badge && <span className="absolute" style={{ top: 7, right: 8, width: 7, height: 7, borderRadius: 999, background: MS.gold }} />}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={onExit} className="ui-press w-full mt-4" style={{ height: 42, background: 'transparent', border: `1px dashed ${MS.line}`, fontSize: 12.5, color: PALETTE.dawn }}>⇄ 게임 선택으로 <span style={{ color: PALETTE.textDim, fontSize: 11 }}>(진행은 자동 저장)</span></button>
      </div>
    </div>
  );
}

// ===== 사냥터 (1.213.0 — 지역당 6스테이지 · 처치 목표 + 관문 강적 → 보스) =====
// 보스 공략 힌트 (1.237.0) — 기믹 이름·설명·추천 조합
function BossMechNote({ mech, compact = false }) {
  const m = BOSS_MECHS[mech];
  if (!m) return null;
  return (
    <div className="px-2.5 py-2" style={{ fontSize: 12, borderRadius: 10, background: '#e8b04a12', border: '1px solid #e8b04a55', color: PALETTE.text, lineHeight: 1.55 }}>
      <b style={{ color: PALETTE.legendary }}>{m.icon} 보스 기믹 · {m.name}</b>{compact ? null : <div style={{ color: PALETTE.textDim }}>{m.desc}</div>}
      <div style={{ color: PALETTE.dawn }}>💡 공략: {m.tip}</div>
    </div>
  );
}
// 특성 갈래 ↔ 동행 사역마 시너지 안내 (1.236.0)
const SYN_ROLE = { tank: ['🛡', '수호'], healer: ['✚', '치유'], dps: ['🗡', '맹공'] };
function FamSynergyNote({ tree, pts }) {
  const role = TL.TREE_FAM[tree.id];
  if (!role) return null;
  const fx = E.famSynergyFx(role, Math.max(pts, 0));
  const full = E.famSynergyFx(role, 35);
  const pct = (v) => `${Math.round(v * 1000) / 10}%`;
  const line = (f) => role === 'tank' ? `대신 맞기 확률 +${pct(f.guard || 0)}p`
    : role === 'healer' ? `회복력 +${pct(f.healPower || 0)} · 회복 시작 HP +${pct(f.healBelow || 0)}p · 회복량의 ${pct(f.healShield || 0)} 보호막`
    : `연격 확률 +${pct(f.chain || 0)}p · 공격력 +${pct(f.atk || 0)}`;
  const [ic, nm] = SYN_ROLE[role];
  return (
    <div className="mt-1.5 px-2 py-1.5" style={{ fontSize: 11.5, borderRadius: 8, background: `${tree.color}14`, border: `1px solid ${tree.color}44`, color: PALETTE.text }}>
      <b style={{ color: tree.color }}>{ic} 짝 동행: {nm} 사역마</b> — 이 갈래에 찍은 포인트만큼 {nm} 사역마가 강해짐
      <div style={{ color: PALETTE.textDim }}>현재 {pts}점: {pts > 0 ? line(fx) : '효과 없음'} · 갈래 완성(35점): {line(full)}</div>
    </div>
  );
}
// 위압 안내 (1.235.0) — 적이 나보다 레벨이 높아 강화될 때만 표시
function IntimNote({ heroLv, lv, what }) {
  const n = E.intimidateLevel(heroLv, lv);
  if (!n) return null;
  const st = E.intimidateStep(n);
  return <div style={{ fontSize: 11.5, color: n >= 4 ? '#ff6a5a' : '#ff9a7a' }}>{n >= 4 ? '☠' : '☗'} {what} Lv.{lv} — {st.label} (적 HP ×{st.hp} · 공격 ×{st.atk}){n >= 4 ? ' · 극복 불가 수준' : ''}</div>;
}
function FieldView({ save, onBack, onFight, onAuto, playScene, sceneOpen }) {
  const [sel, setSel] = useState(() => [...CHRONICLE_FIELDS].reverse().find(f => E.fieldUnlocked(save, f.id))?.id || 1);
  useEffect(() => { if (!sceneOpen) playScene({ at: 'field', fieldId: sel }); }, [sel, sceneOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = CHRONICLE_FIELDS[sel - 1];
  const part = CHRONICLE_PARTS.find(p => p.fields.includes(sel)) || CHRONICLE_PARTS[0];
  const st = E.stageState(save, f.id);
  const stages = fieldStages(f);
  const [stage, setStage] = useState(() => Math.min(st.cleared, FIELD_STAGES - 1));
  useEffect(() => { setStage(Math.min(E.stageState(save, sel).cleared, FIELD_STAGES - 1)); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const cleared = !!save.progress.bossCleared[f.id];
  const bossOpen = E.bossReady(save, f.id);
  const S = stages[stage];
  const sKills = Math.min(st.kills[stage] || 0, S.kills);
  const gateDone = st.cleared > stage;
  const gateOk = E.gateReady(save, f.id, stage);
  const gateEnemy = f.elites[stage % f.elites.length];
  const heroLv = save.units[save.hero].lv;
  const lvColor = (lv) => (lv > heroLv + 2 ? '#e06a5f' : lv > heroLv ? '#e8b04a' : '#8fe08a');
  // 1.251.0 — 본편 스타일 (시안 ⑳)
  const left = E.bossAttemptsLeft(save, f.id);
  const bossName = ENEMIES[f.boss]?.name;
  const sq = (extra = {}) => ({ padding: '11px 0', fontSize: 13, fontWeight: 800, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.textDim, ...extra });
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사냥터" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-none px-4 pt-1">
        <MainTabs size={12.5} value={part.id} onChange={(id) => { const p = CHRONICLE_PARTS.find(x => x.id === id); const last = [...p.fields].reverse().find(fid => E.fieldUnlocked(save, fid)) || p.fields[0]; setSel(last); }}
          items={CHRONICLE_PARTS.map(p => { const open = E.fieldUnlocked(save, p.fields[0]); return [p.id, open ? (p.id === part.id ? p.name : p.name.split(' · ')[0]) : `🔒 ${p.name.split(' · ')[0]}`, false, !open]; })} />
        <MainTabs size={12.5} value={sel} onChange={setSel}
          items={CHRONICLE_FIELDS.filter(x => part.fields.includes(x.id)).map(x => { const open = E.fieldUnlocked(save, x.id); return [x.id, open ? `${x.id} ${x.name.split(' ').pop()}` : `🔒 ${x.id}`, false, !open]; })} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 7', border: `1px solid ${MS.strong}` }}>
          <img src={chronicleEnemyArt(f.normals[Math.min(stage, f.normals.length - 1)])} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 38%, #0b0708)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 18, color: PALETTE.text }}>{f.name} <span style={{ fontSize: 13, color: MS.gold }}>스테이지 {stage + 1}</span></div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>몹 <b style={{ color: lvColor(S.lv) }}>Lv.{S.lv}</b> · 강적 Lv.{S.lv + 1} · 보스 Lv.{f.bossLv}{BOSS_MECHS[E.bossMechOf('field', f.id)] ? ` · ◇ ${BOSS_MECHS[E.bossMechOf('field', f.id)].name}` : ''}</div>
            <IntimNote heroLv={heroLv} lv={S.lv} what="몹" />
          </div>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${stages.length + 1}, 1fr)` }}>
          {stages.map((x, i) => {
            const open = E.stageUnlocked(save, f.id, i); const done = st.cleared > i; const on = stage === i;
            return (
              <button key={i} disabled={!open} onClick={() => setStage(i)} className="ui-press text-center" style={{ padding: '5px 0', border: `1px solid ${on ? MS.gold : done ? '#8fd08a88' : MS.line}`, background: MS.box, opacity: open ? 1 : 0.4 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: on ? MS.gold : done ? '#8fd08a' : PALETTE.text }}>{open ? (done ? '✓' : i + 1) : '🔒'}</div>
                <div style={{ fontSize: 10.5, color: open ? lvColor(x.lv) : PALETTE.textDim }}>Lv.{x.lv}</div>
              </button>
            );
          })}
          <div className="text-center" style={{ padding: '5px 0', border: `1px solid ${bossOpen ? MS.red : MS.line}`, background: MS.box, opacity: bossOpen ? 1 : 0.4 }}>
            <div style={{ fontSize: 13 }}>👑</div><div style={{ fontSize: 10.5, color: PALETTE.textDim }}>Lv.{f.bossLv}</div>
          </div>
        </div>
        <MainSecHead title="처 치 목 표" />
        <div className="flex justify-between" style={{ fontSize: 12.5, color: PALETTE.text }}><span>스테이지 {stage + 1}</span><b>{sKills} / {S.kills}</b></div>
        <Bar v={sKills} max={S.kills} color={MS.gold} h={5} />
        <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>
          {gateDone ? '관문 통과 — 이 스테이지는 자유롭게 사냥할 수 있다'
            : gateOk ? `처치 목표 달성! 관문 강적 「${ENEMIES[gateEnemy]?.name}」(Lv.${S.lv + 1})을 쓰러뜨리면 ${stage + 1 < FIELD_STAGES ? `스테이지 ${stage + 2}` : '보스'} 개방`
              : `채우면 관문 강적 등장 · 강적 ${Math.round(CHRONICLE_TUNING.eliteChance * 100)}% 확률로 출몰`}
          {cleared && <> · 보스 재도전은 하루 {BOSS_DAILY_LIMIT}회</>}
        </div>
        <button onClick={() => onFight(f, 'hunt', stage)} className="ui-press mt-1" style={sq({ padding: '13px 0', fontSize: 14, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.18)', color: '#ff8a7e' })}>⚔ 스테이지 {stage + 1} 사냥 (Lv.{S.lv})</button>
        <button onClick={() => onAuto(f)} className="ui-press" style={sq({ border: `1px solid ${MS.gold}`, color: MS.gold })}>▶ 자동 진행 <span style={{ fontWeight: 400, fontSize: 11.5 }}>사냥 → 관문 → 다음 스테이지 → 보스</span></button>
        {bossOpen && <BossMechNote mech={E.bossMechOf('field', f.id)} compact />}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {gateDone ? <div className="text-center" style={sq({ color: '#8fd08a', fontSize: 12.5 })}>✓ 관문 통과</div>
            : <button disabled={!gateOk} onClick={() => onFight(f, 'gate', stage)} className="ui-press" style={sq(gateOk ? { border: `1px solid ${MS.gold}`, color: MS.gold, fontSize: 12.5 } : { fontSize: 12.5 })}>{gateOk ? `⚔ 관문 — ${ENEMIES[gateEnemy]?.name}` : `🔒 관문 (처치 ${S.kills - sKills} 남음)`}</button>}
          {!bossOpen ? <div className="text-center" style={sq({ fontSize: 12.5 })}>👑 보스 ({FIELD_STAGES} 관문 뒤)</div>
            : cleared && left <= 0 ? <div className="text-center" style={sq({ fontSize: 12 })}>👑 오늘 횟수 소진</div>
              : <button onClick={() => onFight(f, 'boss', null)} className="ui-press" style={sq({ border: `1px solid ${MS.red}`, color: '#ff8a7e', fontSize: 12.5 })}>{cleared ? `👑 재도전 (${left}/${BOSS_DAILY_LIMIT})` : `👑 ${bossName}`}</button>}
        </div>
      </div>
    </div>
  );
}

// ===== 던전 =====
function DungeonView({ save, onBack, onEnter, onFight, onLeave, onBuyKey, dungeonAuto, onToggleDungeonAuto }) {
  const d = save.dungeon;
  const opened = CHRONICLE_DUNGEONS.filter(x => E.dungeonUnlocked(save, x.id));
  const [selId, setSelId] = useState(d?.id || opened[opened.length - 1]?.id || 'frostTomb');
  const [tier, setTier] = useState(d?.tier || 0);
  const D = dungeonDef(d ? d.id : selId);
  const T = DUNGEON_TIERS[d ? d.tier || 0 : tier];
  const party = E.partyCombatants(save, d?.hp);
  const best = save.progress.dungeonTier?.[D.id];
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={d ? `${D.name} · ${T.label}` : '던전'} onBack={d ? null : onBack} right={<div className="flex items-center gap-2"><span style={{ fontSize: 12, color: PALETTE.legendary }}>🗝{E.keyCount(save)}</span><Wallet save={save} /></div>} />
      {!d && (
        <div className="grid grid-cols-3 gap-1.5 px-3 pt-2 flex-none">
          {CHRONICLE_DUNGEONS.map(x => {
            const open = E.dungeonUnlocked(save, x.id);
            return (
              <button key={x.id} disabled={!open} onClick={() => { setSelId(x.id); setTier(0); }} className="ui-press" style={{ minHeight: 44, padding: '4px 6px', borderRadius: 10, fontSize: 11.5, lineHeight: 1.3, border: `1px solid ${selId === x.id ? x.color : 'var(--ui-line)'}`, color: open ? (selId === x.id ? x.color : PALETTE.text) : PALETTE.textDim, background: selId === x.id ? `${x.color}1c` : 'transparent', opacity: open ? 1 : 0.4 }}>
                {open ? <>{x.name}<br /><span style={{ fontSize: 10.5, color: PALETTE.textDim }}>{x.part ? `${x.part}부` : '1부'} · Lv.{x.recLv}</span></> : <>🔒 {CHRONICLE_FIELDS[x.unlockField - 1].name}<br /><span style={{ fontSize: 10.5 }}>보스 후</span></>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 9', border: `1px solid ${D.color}88` }}>
          <img src={chronicleEnemyArt(D.art)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3" style={{ fontSize: 12, color: PALETTE.textDim }}>{D.desc}</div>
        </div>
        {!d && (
          <div>
            <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginBottom: 6 }}>난이도 — 이전 단계 보스를 쓰러뜨리면 다음 단계가 열린다</div>
            <div className="flex gap-1.5">
              {DUNGEON_TIERS.map((t, i) => {
                const open = E.dungeonTierUnlocked(save, D.id, i);
                const cleared = best != null && best >= i;
                return (
                  <button key={t.id} disabled={!open} onClick={() => setTier(i)} className="ui-press flex-1" style={{ padding: '8px 0', borderRadius: 10, fontSize: 12.5, border: `1px solid ${tier === i ? t.color : 'var(--ui-line)'}`, color: open ? t.color : PALETTE.textDim, background: tier === i ? `${t.color}1c` : 'transparent', opacity: open ? 1 : 0.4 }}>
                    {open ? t.label : `🔒 ${t.label}`}{cleared ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-1.5">
          {D.floors.map((f, i) => {
            const curF = d && d.floor === i;
            const past = d && d.floor > i;
            return (
              <div key={i} className="flex-1 text-center" style={{ padding: '8px 0', borderRadius: 10, fontSize: 11.5, border: `1px solid ${curF ? D.color : 'var(--ui-line)'}`, color: past ? PALETTE.textDim : curF ? D.color : PALETTE.text, background: curF ? `${D.color}1c` : 'transparent' }}>
                {f.boss ? '👑' : `${i + 1}층`}<br /><span style={{ fontSize: 10.5, color: E.intimidateLevel(save.units[save.hero].lv, f.lv + T.lv) ? '#ff7a6a' : undefined }}>Lv.{f.lv + T.lv}</span>
              </div>
            );
          })}
        </div>
        <GlassPanel className="p-3 flex flex-col gap-2">
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>
            {d ? '내 상태 — 층 사이 최대 HP의 25%만 회복' : `권장 Lv.${D.recLv + T.lv} · 적 HP ×${T.hp} · 공격 ×${T.atk} · 에픽 확률 ×${T.epicMult} · ◆ ×${T.shardMult} · 보스 유니크 ${Math.round(UNIQUE_CHANCE.dungeonBoss[d ? d.tier || 0 : tier] * 100)}%`}
          </div>
          <IntimNote heroLv={save.units[save.hero].lv} lv={Math.max(...D.floors.map(x => x.lv)) + T.lv} what="던전 최고층" />
          <BossMechNote mech={E.bossMechOf('dungeon', D.id)} compact={!!d && d.floor < D.floors.length - 1} />
          {party.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <UnitIcon u={p} size={30} dim={p.hp <= 0} />
              <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} /></div>
              <span style={{ fontSize: 11, color: PALETTE.textDim, width: 70, textAlign: 'right' }}>{p.hp}/{p.maxHp}</span>
            </div>
          ))}
        </GlassPanel>
        {!d ? (
          <>
            <UIButton disabled={E.keyCount(save) < T.keyCost} onClick={() => onEnter(D.id, tier)}>
              {E.keyCount(save) < T.keyCost ? `열쇠 부족 (🗝 ${T.keyCost}개 필요)` : `${D.name} · ${T.label} 입장 — 🗝 ${T.keyCost}개`}
            </UIButton>
            <GlassPanel className="p-3">
              <div className="flex items-center justify-between" style={{ fontSize: 12.5, color: PALETTE.text }}>
                <span>🗝 던전 열쇠 <b style={{ color: PALETTE.legendary }}>{E.keyCount(save)}</b> / {DUNGEON_KEYS.max}</span>
                <button disabled={!E.canBuyKey(save)} onClick={onBuyKey} className="ui-press" style={{ fontSize: 12, padding: '6px 10px', borderRadius: 9, border: `1px solid ${E.canBuyKey(save) ? PALETTE.legendary : 'var(--ui-line)'}`, color: E.canBuyKey(save) ? PALETTE.legendary : PALETTE.textDim, background: 'transparent', opacity: E.canBuyKey(save) ? 1 : 0.5 }}>
                  구매 🪙{DUNGEON_KEYS.shopPrice} (오늘 {E.keysBoughtToday(save)}/{DUNGEON_KEYS.shopDailyLimit})
                </button>
              </div>
              <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.55 }}>
                매일 0시 3개까지 충전 · 사냥터 강적 처치 시 {Math.round(DUNGEON_KEYS.eliteDrop * 100)}% · 일부 의뢰 보상 · 입장 시 소모(후퇴·전멸해도 돌려받지 못함) — 일반 1 · 영웅 2 · 전설 3
              </div>
            </GlassPanel>
          </>
        ) : (
          <>
            <UIButton onClick={onFight}>{D.floors[d.floor].boss ? '보스와 싸운다' : `${d.floor + 1}층 전투`}{dungeonAuto && !D.floors[d.floor].boss ? ' → 보스까지 연속' : ''}</UIButton>
            <button onClick={onToggleDungeonAuto} className="ui-press flex items-center gap-1.5 self-start" style={{ background: 'transparent', border: 'none', color: dungeonAuto ? PALETTE.legendary : PALETTE.textDim, padding: '4px 0', fontSize: 12.5 }}>
              <span className="flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${dungeonAuto ? PALETTE.legendary : 'var(--ui-line-strong)'}`, background: dungeonAuto ? `${PALETTE.legendary}33` : 'transparent', fontSize: 12 }}>{dungeonAuto ? '✓' : ''}</span>
              연속 도전 — 승리하면 다음 층으로 자동 진행 (보스까지)
            </button>
            <UIButton variant="ghost" onClick={onLeave}>후퇴 (마을로)</UIButton>
          </>
        )}
      </div>
    </div>
  );
}

// ===== 전승 (1.220.0) =====
function RebirthSheet({ save, cid, onClose, onRebirth }) {
  const u = save.units[cid];
  const fixed = u.rebirth?.branch;
  const [pick, setPick] = useState(fixed || null);
  const [confirm, setConfirm] = useState(false);
  const EXTRA = { healFromAtk: (v) => `공격력의 ${Math.round(v * 100)}%를 회복력으로`, armorPen: (v) => `방어 관통 +${Math.round(v * 100)}%`, spdPct: (v) => `속도 +${Math.round(v * 100)}%` };
  const fxText = (fx) => Object.entries(fx).map(([k, v]) => (EXTRA[k] ? EXTRA[k](v) : statLine({ [k]: v }))).join(' · ');
  const next = (u.rebirth?.count || 0) + 1;
  return (
    <BottomSheet title={`✦ ${next}차 전승`} onClose={onClose} maxHeight="88%">
      <div style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>
        레벨·능력치·스킬·특성이 <b style={{ color: '#e06a5f' }}>Lv.1로 초기화</b>되고, 필요 경험치가 <b style={{ color: PALETTE.text }}>×{rebirthExpMult(next)}</b>가 되고, 모든 적이 <b style={{ color: '#ff6ad5' }}>전승 {next}단계</b>(HP +{Math.round(REBIRTH.enemyHp * next * 100)}% · 공격 +{Math.round(REBIRTH.enemyAtk * next * 100)}%)로 강해진다. 대신 전승 장비·갈래 유니크가 떨어진다.
        장비·사역마·재화는 그대로지만 <b style={{ color: PALETTE.text }}>장비 레벨 ≤ 내 레벨</b>만 착용 효과가 있다.
        전승마다 공격력·최대 HP <b style={{ color: PALETTE.legendary }}>+{Math.round(REBIRTH.bonusPct * 100)}%</b> 영구. {fixed ? '갈래는 첫 전승 때 고정되어 바꿀 수 없다.' : '갈래는 한 번 고르면 바꿀 수 없다.'}
      </div>
      <div className="flex flex-col gap-2 mt-3">
        {rebirthBranches(cid).map(b => {
          const on = pick === b.id;
          const locked = fixed && fixed !== b.id;
          return (
            <button key={b.id} disabled={!!locked} onClick={() => setPick(b.id)} className="ui-press text-left" style={{ padding: 12, borderRadius: 14, border: `1.5px solid ${on ? b.color : 'var(--ui-line)'}`, background: on ? `${b.color}1a` : 'transparent', opacity: locked ? 0.35 : 1 }}>
              <div className="font-bold" style={{ fontSize: 15, color: b.color }}>{b.name} <span style={{ fontSize: 12, color: PALETTE.textDim, fontWeight: 400 }}>{b.type}</span></div>
              <div style={{ fontSize: 12, color: PALETTE.text }}>{b.desc}</div>
              <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.legendary }}>기본 효과: {fxText(b.fx)}</div>
              {classSkills(cid, b.id).filter(s => s.branch === b.id).map(s => (
                <div key={s.id} style={{ fontSize: 11.5, color: PALETTE.textDim }}>✦ {s.name} (Lv.{s.reqLv}) — {describeSkill(s, 1)}</div>
              ))}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 mt-3">
        {!confirm ? <UIButton variant="gold" disabled={!pick} onClick={() => setConfirm(true)}>{pick ? `${REBIRTH_BRANCHES[pick].name}(으)로 전승` : '갈래를 고르세요'}</UIButton>
          : <UIButton onClick={() => onRebirth(pick)}>정말 전승한다 — Lv.1로 돌아간다</UIButton>}
        <UIButton variant="ghost" style={{ height: 40 }} onClick={onClose}>닫기</UIButton>
      </div>
    </BottomSheet>
  );
}

// ===== 특성 트리 (1.224.0 — 갈래 3개 × 5단) =====
function TalentPanel({ save, setSave, cid }) {
  const u = save.units[cid];
  const trees = TL.talentTrees(cid);
  const [tab, setTab] = useState(() => {
    let best = 0; trees.forEach((t, i) => { if (TL.treePoints(u, t.id) > TL.treePoints(u, trees[best].id)) best = i; });
    return best;
  });
  const [confirmReset, setConfirmReset] = useState(false);
  if (!trees.length) return null;
  const tree = trees[tab];
  const pts = TL.treePoints(u, tree.id);
  const step = TL.TALENT_TUNING.tierStep;
  const cost = TL.talentResetCost(u);
  const scrolls = save.mats.talentScroll || 0;
  const spent = TL.talentSpent(u);
  const canReset = E.canResetTalents(save, cid);
  const skillName = (id) => CHRONICLE_SKILLS[id]?.name || id;
  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>특성 <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>— 투자 {spent}</span></span>
        <span style={{ fontSize: 12, color: u.sp ? PALETTE.legendary : PALETTE.textDim }}>스킬 포인트 {u.sp}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        {trees.map((t, i) => {
          const on = i === tab;
          return (
            <button key={t.id} onClick={() => setTab(i)} className="ui-press" style={{ padding: '7px 4px', borderRadius: 10, border: `1.5px solid ${on ? t.color : 'var(--ui-line)'}`, background: on ? `${t.color}22` : 'transparent', color: on ? t.color : PALETTE.textDim }}>
              <div className="font-semibold" style={{ fontSize: 13 }}>{t.name}</div>
              <div style={{ fontSize: 11 }}>{TL.treePoints(u, t.id)}점</div>
            </button>
          );
        })}
      </div>
      <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{tree.desc}</div>
      <FamSynergyNote tree={tree} pts={pts} />
      {tree.tiers.map((row, ti) => {
        const open = TL.tierUnlocked(u, tree.id, ti);
        return (
          <div key={ti} className="mt-2" style={{ opacity: open ? 1 : 0.5 }}>
            <div style={{ fontSize: 11, color: open ? tree.color : PALETTE.textDim }}>{ti + 1}단{ti === tree.tiers.length - 1 ? ' · 궁극' : ''}{open ? '' : ` — ${tree.name}에 ${ti * step}점 필요 (현재 ${pts})`}</div>
            <div className={`grid gap-1.5 mt-1 ${row.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {row.map(n => {
                const r = u.talents?.[n.id] || 0;
                const can = TL.canLearnTalent(u, n.id);
                const full = r >= n.max;
                return (
                  <button key={n.id} disabled={!can} onClick={() => setSave(E.learnTalent(save, cid, n.id))} className="ui-press text-left" style={{ padding: '8px 9px', borderRadius: 11, border: `1px solid ${r ? tree.color : 'var(--ui-line)'}`, background: r ? `${tree.color}14` : 'transparent', minHeight: 58 }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold truncate" style={{ fontSize: 12.5, color: r ? PALETTE.text : PALETTE.textDim }}>{n.name}</span>
                      <span className="flex-none" style={{ fontSize: 11, color: full ? PALETTE.legendary : can ? tree.color : PALETTE.textDim }}>{r}/{n.max}</span>
                    </div>
                    <div style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.35 }}>
                      {n.max > 1 ? '1점당 ' : ''}{TL.talentFxText(n.fx, skillName)}
                    </div>
                    {n.max > 1 && r > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: tree.color, lineHeight: 1.35 }}>지금 {TL.talentFxText(Object.fromEntries(Object.entries(n.fx).map(([k, v]) => [k, +(v * r).toFixed(4)])), skillName)}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {u.sp > 0 && <button onClick={() => setSave(E.autoAllocateTalents(save, cid))} className="ui-press w-full mt-3" style={{ height: 36, borderRadius: 10, border: '1px dashed var(--ui-line-strong)', color: PALETTE.dawn, background: 'transparent', fontSize: 12.5 }}>남은 포인트 자동 배분</button>}
      {spent > 0 && (
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--ui-line)' }}>
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>
            초기화 비용: <b style={{ color: PALETTE.legendary }}>🪙 {cost.gold.toLocaleString()}</b>
            {cost.scrolls > 0 ? <> + <b style={{ color: scrolls >= cost.scrolls ? '#7fd1c8' : '#e06a5f' }}>📖 주문서 {cost.scrolls}장</b> (보유 {scrolls})</> : <span> · Lv.{TL.TALENT_TUNING.scrollFreeUntil}까지는 주문서 불필요</span>}
          </div>
          {cost.scrolls > 0 && <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>주문서는 보스·던전 보스·탑 보스에서 유니크와 같은 확률로 떨어진다. Lv.61부터 10레벨마다 1장씩 더 필요.</div>}
          {!confirmReset ? (
            <button disabled={!canReset} onClick={() => setConfirmReset(true)} className="ui-press w-full mt-2" style={{ height: 36, borderRadius: 10, border: `1px solid ${canReset ? '#e06a5f' : 'var(--ui-line)'}`, color: canReset ? '#e06a5f' : PALETTE.textDim, background: 'transparent', fontSize: 12.5, opacity: canReset ? 1 : 0.5 }}>특성 초기화 (포인트 {spent} 환급)</button>
          ) : (
            <div className="flex gap-2 mt-2">
              <button onClick={() => setConfirmReset(false)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, border: '1px solid var(--ui-line-strong)', color: PALETTE.textDim, background: 'transparent', fontSize: 12.5 }}>취소</button>
              <button onClick={() => { setSave(E.resetTalents(save, cid)); setConfirmReset(false); }} className="ui-press flex-1 font-semibold" style={{ height: 36, borderRadius: 10, border: '1px solid #e06a5f', color: '#fff', background: '#e06a5f', fontSize: 12.5 }}>정말 초기화</button>
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

// ===== 파티 · 성장 =====
function PartyView({ save, setSave, onBack, onForge }) {
  const cid = save.hero;
  const [slotPick, setSlotPick] = useState(null);
  const [eqInfo, setEqInfo] = useState(null); // 장비 정보 (1.252.0)
  const [skillInfo, setSkillInfo] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false); // 자동 사용 규칙 펼치기 (1.245.0)
  const [statPick, setStatPick] = useState(null); // 능력치 설명·배분 (1.247.0)
  const [gtab, setGtab] = useState(() => { try { return localStorage.getItem('chronicleGrowthTab') || 'info'; } catch { return 'info'; } });
  const pickGtab = (t) => { setGtab(t); try { localStorage.setItem('chronicleGrowthTab', t); } catch { /* */ } };
  const [rowInfo, setRowInfo] = useState(null);   // 수치 줄 설명 (1.247.0)
  const [rebirthOpen, setRebirthOpen] = useState(false);
  const u = save.units[cid];
  const cls = chronicleClass(cid);
  const d = E.deriveUnit(save, cid);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="성장" onBack={onBack} right={<Wallet save={save} />} />
      {/* 1.248.0 PM 「육성 창을 정보·스킬·특성 3탭으로」 */}
      <div className="flex-none px-4 pt-3">
        <div className="flex items-center gap-3 pb-3">
          <img src={cls.combatImage} alt="" className="object-cover flex-none" style={{ width: 84, height: 84, borderRadius: 14, border: `1.5px solid ${MS.gold}`, objectPosition: '50% 25%' }} />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 10.5, letterSpacing: 4, color: MS.red }}>{CLASS_PATH[cid] || 'PATH'}</div>
            <div className="font-bold" style={{ fontSize: 21, color: PALETTE.text, lineHeight: 1.2 }}>{cls.name} <span style={{ fontSize: 14, color: MS.gold }}>Lv.{u.lv}</span> <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}>/ {E.levelCapOf(save)} · {cls.role}</span></div>
            <div style={{ fontSize: 13, color: PALETTE.text }}>♡ {d.maxHp.toLocaleString()} · ⚔ 전투력 {E.unitPower(save, cid).toLocaleString()}</div>
            {u.rebirth?.count > 0 && <div style={{ fontSize: 11.5, color: REBIRTH_BRANCHES[u.rebirth.branch].color, fontWeight: 700 }}>✦ 전승 {u.rebirth.count}회 · {REBIRTH_BRANCHES[u.rebirth.branch].name} <span style={{ fontWeight: 400, color: PALETTE.textDim }}>({REBIRTH_BRANCHES[u.rebirth.branch].type} · 경험치 ×{rebirthExpMult(u.rebirth.count)})</span></div>}
            {u.lv >= E.levelCapOf(save) && u.lv < CHRONICLE_TUNING.maxLevel && <div style={{ fontSize: 11, color: '#e8b04a' }}>🔒 원정대 레벨 상한 — 다른 캐릭터를 Lv.{R.ROSTER.unlockLv}까지 키우면 +{R.ROSTER.perChar} (경험치 정지 중)</div>}
            <div className="mt-1"><Bar v={u.exp} max={expNeedFor(u)} color={PALETTE.legendary} h={4} /></div>
            <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>경험치 {u.exp.toLocaleString()} / {expNeedFor(u).toLocaleString()}</div>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1px solid ${MS.line}` }}>
          {[['info', '정보', u.points > 0], ['skill', '스킬', classSkills(cid, u.rebirth?.branch).some(x => E.canLearn(u, x))], ['talent', '특성', u.sp > 0]].map(([id, label, dot]) => (
            <button key={id} onClick={() => pickGtab(id)} className="ui-press relative" style={{ height: 40, background: 'transparent', border: 'none', borderBottom: `2px solid ${gtab === id ? MS.red : 'transparent'}`, color: gtab === id ? MS.red : PALETTE.textDim, fontSize: 14, fontWeight: gtab === id ? 800 : 500, letterSpacing: 3 }}>
              {label}{dot && <span style={{ position: 'absolute', top: 9, marginLeft: 3, width: 6, height: 6, borderRadius: 3, background: MS.gold, display: 'inline-block' }} />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

        {gtab === 'info' && <>
        {E.canRebirth(save, cid) && (
          <button onClick={() => setRebirthOpen(true)} className="ui-press ui-sheen w-full text-left" style={{ padding: 12, borderRadius: 14, border: `1.5px solid ${PALETTE.legendary}`, background: `${PALETTE.legendary}18` }}>
            <div className="font-bold" style={{ fontSize: 14, color: PALETTE.legendary }}>✦ 전승 가능 — Lv.{REBIRTH.reqLevel} 달성</div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>{u.rebirth?.branch ? `${REBIRTH_BRANCHES[u.rebirth.branch].name} ${u.rebirth.count + 1}차 전승` : '두 갈래 중 하나를 골라 새로 태어난다'} · 레벨 1부터 다시</div>
          </button>
        )}

        {/* 능력치 — 본편 정보창 스타일 (1.247.0) */}
        <div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {STAT_KEYS.map(k => (
              <button key={k} onClick={() => setStatPick(k)} className="ui-press text-center" style={{ padding: '7px 0', borderRadius: 12, border: `1.5px solid ${k === cls.main ? MS.gold : MS.line}`, background: MS.box }}>
                <div style={{ fontSize: 12, color: PALETTE.textDim }}>{STAT_META[k].label}</div>
                <div className="font-bold" style={{ fontSize: 20, color: k === cls.main ? MS.gold : PALETTE.text, lineHeight: 1.2 }}>{u.stats[k]}</div>
              </button>
            ))}
          </div>
          <div className="text-center mt-1.5" style={{ fontSize: 11.5, color: PALETTE.textDim }}>능력치를 누르면 효과와 포인트 배분 · 남은 포인트 <b style={{ color: u.points ? MS.gold : PALETTE.textDim }}>{u.points}</b></div>
          {u.points > 0 && <button onClick={() => setSave(E.autoAllocate(save, cid))} className="ui-press w-full mt-2" style={{ height: 36, borderRadius: 10, border: `1px dashed ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 12.5 }}>추천 배분 ({cls.role} 기준) — {u.points}포인트</button>}

          <MainSecHead title="전 투 수 치" />
          <MainKvGrid onPick={setRowInfo} rows={[
            { key: 'hp', label: 'HP', value: d.maxHp.toLocaleString(), desc: COMBAT_DESC.hp },
            { key: 'atk', label: '공격력', value: d.atk.toLocaleString(), color: MS.gold, desc: COMBAT_DESC.atk },
            { key: 'def', label: '방어', value: d.def.toLocaleString(), color: MS.blue, desc: COMBAT_DESC.def },
            { key: 'spd', label: '속도', value: d.spd, desc: COMBAT_DESC.spd },
            { key: 'crit', label: '치명', value: `${Math.round(d.crit * 100)}%`, color: MS.gold, desc: COMBAT_DESC.crit },
            { key: 'dodge', label: '회피', value: `${Math.round(d.dodge * 100)}%`, color: MS.green, desc: COMBAT_DESC.dodge },
            ...(cid === 'priest' ? [{ key: 'heal', label: '치유력', value: d.healPower.toLocaleString(), color: MS.green, desc: COMBAT_DESC.heal }] : []),
          ]} />
          <DetailStats d={d} cid={cid} onPick={setRowInfo} />
        </div>

        {/* 장비 — 1.252.0 PM 「장비 성능을 한눈에 · 누르면 정보부터」 */}
        <div>
          <MainSecHead title="장 비" right={<span style={{ fontSize: 11.5, color: PALETTE.textDim }}>⚔ 전투력 {SLOTS.reduce((t, sl) => { const it = save.inventory.find(i => i.uid === u.equip[sl.id]); return t + (it ? E.itemPower(it) : 0); }, 0).toLocaleString()} · 누르면 정보</span>} />
          <div className="flex flex-col gap-1.5 mt-1">
            {SLOTS.map(sl => {
              const it = save.inventory.find(i => i.uid === u.equip[sl.id]);
              if (!it) return (
                <button key={sl.id} onClick={() => setSlotPick(sl.id)} className="ui-press w-full text-left" style={{ padding: '10px 12px', border: `1px dashed ${MS.line}`, background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>{sl.icon} {sl.label} — 비어 있음 (눌러서 장착)</button>
              );
              const g = gradeOf(it.grade); const st = E.itemStats(it); const ud = E.uniqueDef(it); const eo = E.epicOptOf(it);
              const rows = Object.keys(st).filter(k => st[k]).sort((x, y) => (BASE_STATS.indexOf(x) + 1 || 99) - (BASE_STATS.indexOf(y) + 1 || 99)).map(k => {
                if (BASE_STATS.includes(k)) return { k, l: BASE_LABEL[k] === '공격' ? '공격력' : BASE_LABEL[k], v: Math.round(st[k]).toLocaleString(), base: true };
                const t = E.statLabel(k, st[k]); const m = t.match(/^(.*?)\s*([+-]?[\d.]+.*)$/); return { k, l: m ? m[1] : t, v: m ? m[2] : '' };
              });
              return (
                <button key={sl.id} onClick={() => setEqInfo(it.uid)} className="ui-press w-full text-left" style={{ padding: '8px 10px 8px 12px', background: MS.box, border: `1px solid ${MS.line}`, borderLeft: `3px solid ${g.color}` }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-bold" style={{ fontSize: 13.5, color: g.color }}>{sl.icon} {E.itemName(it)}{it.plus ? ` +${it.plus}` : ''}</span>
                    <b className="flex-none" style={{ fontSize: 12.5, color: MS.gold }}>⚔ {E.itemPower(it).toLocaleString()}</b>
                  </div>
                  <div style={{ fontSize: 11, color: PALETTE.textDim }}>{g.label} · Lv.{it.ilv} · {sl.label}</div>
                  <div className="grid mt-1" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
                    {rows.map(r => (
                      <div key={r.k} className="flex items-baseline justify-between gap-1" style={{ padding: '1px 0', minWidth: 0 }}>
                        <span className="truncate" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{r.l}</span>
                        <span className="flex-none" style={{ fontSize: 12, fontWeight: 800, color: r.base ? PALETTE.text : MS.red }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  {(ud || eo) && <div className="mt-1" style={{ fontSize: 11.5, color: '#c79bff', lineHeight: 1.45 }}>★ {(ud || eo).name} — <span style={{ color: PALETTE.text }}>{(ud || eo).desc}</span></div>}
                </button>
              );
            })}
          </div>
        </div>
        </>}

        {gtab === 'skill' && <>
        {/* 스킬 — 본편 스킬 카드 스타일 (1.247.0) */}
        <div>
          {(() => {
            const list = classSkills(cid, u.rebirth?.branch);
            const act = list.filter(s => s.kind !== 'passive');
            const pas = list.filter(s => s.kind === 'passive');
            return (
              <>
                <div className="flex items-center justify-between" style={{ marginTop: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 액티브 스킬</span>
                  <span style={{ fontSize: 12, color: u.sp ? MS.gold : PALETTE.textDim }}>스킬 포인트 {u.sp}</span>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {act.map(s => <MainSkillCard key={s.id} s={s} lv={u.skills[s.id] || 0} u={u} d={d} can={E.canLearn(u, s)} onClick={() => setSkillInfo(s)} />)}
                </div>
                {pas.length > 0 && <div style={{ fontSize: 13, letterSpacing: 4, color: MS.red, fontWeight: 700, margin: '12px 0 6px' }}>◆ 패시브</div>}
                <div className="flex flex-col gap-2">
                  {pas.map(s => <MainPassiveCard key={s.id} s={s} lv={u.skills[s.id] || 0} u={u} can={E.canLearn(u, s)} onClick={() => setSkillInfo(s)} />)}
                </div>
                <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>스킬을 누르면 효과·발동 조건과 <b style={{ color: MS.gold }}>배우기·강화</b> — ＋ 표시 = 지금 올릴 수 있음</div>
              </>
            );
          })()}
          <button onClick={() => setRulesOpen(!rulesOpen)} className="ui-press w-full text-left mt-2" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <InfoSection icon="ⓘ" title="자동 사용 규칙" color={PALETTE.dawn} right={rulesOpen ? '접기 ▴' : '펼치기 ▾'}>
              {rulesOpen && (
                <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
                  ⏱ = 재사용 대기 (쓴 뒤 내 차례 N번은 못 씀){d.cdr || d.skillCdr ? <> · <b style={{ color: '#7fd1c8' }}>재사용 단축 반영됨</b> (모든 스킬 = 유니크·특성 / 스킬 하나 = 일반 장비 옵션)</> : null}<br />
                  쓸 수 있는 스킬이 여럿이면 쿨타임이 아니라 <b style={{ color: PALETTE.text }}>상황 순서</b>로 고른다: 회복(위급) → 보호막 → 강화 → 도발(위급) → 광역(적 2명+) → 단일 중 가장 센 스킬 → 없으면 기본 공격<br />
                  스킬을 다 올리고 남은 포인트는 <b style={{ color: PALETTE.legendary }}>특성</b> 탭에서 찍는다.
                </div>
              )}
            </InfoSection>
          </button>
        </div>

        </>}

        {gtab === 'talent' && (
          <>
        {/* 특성 트리 (1.224.0) */}
        <TalentPanel save={save} setSave={setSave} cid={cid} />

          </>
        )}
      </div>
      {rebirthOpen && <RebirthSheet save={save} cid={cid} onClose={() => setRebirthOpen(false)} onRebirth={(b) => { setSave(E.rebirth(save, b, cid)); setRebirthOpen(false); }} />}
      {eqInfo != null && (() => {
        const it = save.inventory.find(i => i.uid === eqInfo); if (!it) return null;
        const fb = (extra = {}) => ({ height: 42, fontSize: 13, background: 'transparent', border: `1px solid ${MS.line}`, color: PALETTE.text, ...extra });
        return (
          <MainItemModal save={save} item={it} cur={it} by={cid} usable onClose={() => setEqInfo(null)}
            footer={<div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button onClick={() => { setEqInfo(null); setSlotPick(it.slot); }} className="ui-press" style={fb({ color: MS.gold, borderColor: MS.gold, fontWeight: 800 })}>⇄ 교체</button>
              <button onClick={() => { setSave(E.unequipItem(save, cid, it.slot)); setEqInfo(null); }} className="ui-press" style={fb()}>착용 해제</button>
              <button onClick={() => { setEqInfo(null); onForge?.(); }} className="ui-press" style={fb()}>⚒ 대장간</button>
            </div>} />
        );
      })()}
      {slotPick && (
        <BottomSheet title={`${SLOTS.find(s => s.id === slotPick).label} 장착`} onClose={() => setSlotPick(null)}>
          <div className="flex flex-col gap-2">
            {u.equip[slotPick] != null && (
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => { setSave(E.unequipItem(save, cid, slotPick)); setSlotPick(null); }}>장착 해제</UIButton>
            )}
            {save.inventory.filter(i => i.slot === slotPick && i.uid !== u.equip[slotPick] && E.itemUsable(i, cid) && E.canWear(i, u))
              .sort((a, b) => E.itemPower(b) - E.itemPower(a))
              .map(it => {
                const cur = save.inventory.find(i => i.uid === u.equip[slotPick]);
                return (
                  <div key={it.uid}>
                    <ItemRow save={save} item={it} onClick={() => { setSave(E.equipItem(save, cid, it.uid)); setSlotPick(null); }} />
                    <div className="px-2 pt-0.5"><DiffLine item={it} cur={cur} compact /></div>
                  </div>
                );
              })}
            {!save.inventory.some(i => i.slot === slotPick && i.uid !== u.equip[slotPick] && E.itemUsable(i, cid)) && <div className="text-center py-4" style={{ fontSize: 12.5, color: PALETTE.textDim }}>가방에 착용할 수 있는 장비가 없습니다{slotPick === 'accessory' ? '' : ` (${cls.name} 전용)`}</div>}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSlotPick(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
      {skillInfo && (
        <MainSkillModal s={skillInfo} lv={u.skills[skillInfo.id] || 0} u={u} d={d} sp={u.sp} can={E.canLearn(u, skillInfo)}
          onLearn={() => setSave(E.learnSkill(save, cid, skillInfo.id))} onClose={() => setSkillInfo(null)} />
      )}
      {statPick && (
        <MainModal kicker="능 력 치" title={STAT_META[statPick].label} color={statPick === cls.main ? MS.gold : MS.red} badge={statPick === cls.main ? '주 능력치' : null} onClose={() => setStatPick(null)}
          footer={<div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button disabled={!u.points} onClick={() => setSave(E.addStat(save, cid, statPick, 1))} className="ui-press" style={{ height: 42, border: `1px solid ${u.points ? MS.gold : MS.line}`, color: u.points ? MS.gold : PALETTE.textDim, background: 'transparent', fontWeight: 800, opacity: u.points ? 1 : 0.5 }}>+1</button>
            <button disabled={!u.points} onClick={() => setSave(E.addStat(save, cid, statPick, u.points))} className="ui-press" style={{ height: 42, border: `1px solid ${u.points ? MS.gold : MS.line}`, color: u.points ? MS.gold : PALETTE.textDim, background: 'transparent', fontWeight: 800, opacity: u.points ? 1 : 0.5 }}>전부 (+{u.points})</button>
          </div>}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <MainCell label="현재" value={u.stats[statPick]} color={MS.gold} />
            <MainCell label="남은 포인트" value={u.points} />
          </div>
          <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5, color: PALETTE.text }}>
            <b style={{ color: MS.red }}>◇ 효과</b> {STAT_META[statPick].desc}
          </div>
          <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>레벨업마다 포인트를 받는다. {cls.name}의 주 능력치는 <b style={{ color: MS.gold }}>{STAT_META[cls.main].label}</b>.</div>
        </MainModal>
      )}
      {rowInfo && (
        <MainModal kicker="능 력 치 설 명" title={rowInfo.label} color={rowInfo.color || MS.red} badge={String(rowInfo.value)} onClose={() => setRowInfo(null)}>
          <div style={{ fontSize: 13, color: PALETTE.text, lineHeight: 1.6 }}>{rowInfo.desc || `${rowInfo.label} — 장비·특성·사역마·원정대 버프·전승을 모두 합산한 값.`}</div>
          <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>◇ 출처: 장비 옵션 · 유니크 · 특성 · 사역마(보조·보유·인연) · 원정대 버프 · 전승 갈래 합산</div>
        </MainModal>
      )}
    </div>
  );
}

// ===== 가방 (캐릭터 전용) =====
function BagView({ save, setSave, onBack, flash, onForge }) {
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null); // 효율 미리보기 (1.232.0)
  const [sel, setSel] = useState(null);
  // 정렬 (1.213.1): 착용 장비가 맨 위 → 그 아래 전투력(주 능력치) 높은 순
  const [sortBy, pickSort] = useItemSort();
  const [incOther, setIncOther] = useState(() => { try { return localStorage.getItem('chronicleBulkOther') === '1'; } catch { return false; } });
  // 타직업 포함 — 일괄 분해·자동 분해 공용 (1.231.2: 자동 분해 설정은 계정에 저장)
  const toggleOther = () => { const v = !incOther; setIncOther(v); try { localStorage.setItem('chronicleBulkOther', v ? '1' : '0'); } catch { /* */ } setSave({ ...save, autoSalvage: { ...(save.autoSalvage || { grade: -1 }), other: v } }); };
  const autoG = save.autoSalvage?.grade ?? -1;
  const setAutoG = (g) => setSave({ ...save, autoSalvage: { grade: g, other: incOther } });
  // 선택 분해 모드 (1.231.2)
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const togglePick = (uid) => setPicked(p => { const n = new Set(p); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const endPick = () => { setPicking(false); setPicked(new Set()); };
  const pickedSalvage = (() => { const tot = {}; for (const it of save.inventory) if (picked.has(it.uid)) for (const [k, v] of Object.entries(E.salvageOf(it))) tot[k] = (tot[k] || 0) + v; return tot; })();
  const hero = save.hero;
  const list = sortItems(save, filterItems(save.inventory, filter, hero), sortBy);
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const others = save.inventory.filter(i => !E.itemUsable(i, hero));
  const [confirm, setConfirm] = useState(null); // 분해 확인 창 (1.232.1)
  const salvageOfUids = (uids) => { const tot = {}; for (const it of save.inventory) if (uids.includes(it.uid)) for (const [k, v] of Object.entries(E.salvageOf(it))) tot[k] = (tot[k] || 0) + v; return tot; };
  const gradeCount = (uids) => GRADES.map(g => ({ g, n: save.inventory.filter(i => uids.includes(i.uid) && i.grade === g.id).length })).filter(x => x.n);
  const askDismantle = (uids, after) => {
    if (!uids.length) { flash('분해할 장비가 없습니다'); return; }
    const plused = save.inventory.filter(i => uids.includes(i.uid) && i.plus > 0).length;
    setConfirm({
      title: `장비 ${uids.length}개 분해`,
      lines: [
        { t: gradeCount(uids).map(x => `${x.g.label} ${x.n}`).join(' · ') },
        { t: `얻는 재화: ${E.salvageText(salvageOfUids(uids))}` },
        ...(plused ? [{ t: `⚠ 강화된 장비 ${plused}개 포함`, color: '#e8b04a' }] : []),
        { t: '분해한 장비는 되돌릴 수 없습니다', color: PALETTE.textDim },
      ],
      confirmLabel: `${uids.length}개 분해`,
      onConfirm: () => { const r = E.dismantleItems(save, uids); setSave(r.save); flash(`${uids.length}개 분해 → ${E.salvageText(r.salvage)}`); setConfirm(null); if (after) after(); },
    });
  };
  const bulk = (maxGrade) => {
    const uids = save.inventory.filter(i => gradeIdx(i.grade) <= maxGrade && !E.equippedBy(save, i.uid) && (incOther || E.itemUsable(i, hero))).map(i => i.uid);
    askDismantle(uids);
  };
  const toStash = (uids) => {
    const r = E.moveToStash(save, uids);
    setSave(r.save);
    flash(r.moved ? `창고로 ${r.moved}개 보관` : '창고가 가득 찼습니다');
  };
  // 1.249.0 — 본편 스타일 가방 (PM 승인 시안 ⑬): 착용 4칸 상자 · 밑줄 탭 · 2열 카드 · 관리 창
  const [manage, setManage] = useState(false);
  const eqUids = Object.values(save.units[hero].equip).filter(v => v != null);
  const eqPower = eqUids.reduce((s, uid) => { const it = save.inventory.find(i => i.uid === uid); return s + (it ? E.itemPower(it) : 0); }, 0);
  const bagList = list.filter(it => !E.equippedBy(save, it.uid));
  const mBtn = { height: 40, fontSize: 12.5, background: MS.box, border: `1px solid ${MS.line}`, color: PALETTE.text };
  const ec = E.bagExpandCost(save);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={`가방 ${save.inventory.length}/${E.bagMax(save)}`} onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-none px-4 pt-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 착용 장비</span>
          <span style={{ fontSize: 12, color: PALETTE.textDim }}>⚔ 전투력 {eqPower.toLocaleString()}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {SLOTS.map(sl => {
            const it = save.inventory.find(i => i.uid === save.units[hero].equip[sl.id]);
            const g = it ? gradeOf(it.grade) : null;
            return (
              <button key={sl.id} onClick={() => (it ? setSel(it.uid) : setFilter(sl.id))} className="ui-press text-center" style={{ padding: '6px 3px', borderRadius: 12, border: `1.5px solid ${it ? `${g.color}99` : MS.line}`, background: MS.box, minWidth: 0 }}>
                <div style={{ fontSize: 18, lineHeight: 1.2 }}>{sl.icon}</div>
                <div className="truncate font-bold" style={{ fontSize: 11, color: it ? g.color : PALETTE.textDim }}>{it ? E.itemName(it) : `${sl.label} 비어 있음`}</div>
                <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>{it ? `${it.plus ? `+${it.plus} · ` : ''}⚔${E.itemPower(it)}` : '눌러서 찾기'}</div>
              </button>
            );
          })}
        </div>
        <div className="grid mt-2" style={{ gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: `1px solid ${MS.line}` }}>
          {[{ id: 'all', label: '전체' }, ...SLOTS, { id: 'other', label: '타직업' }].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)} className="ui-press" style={{ height: 36, background: 'transparent', border: 'none', borderBottom: `2px solid ${filter === s.id ? MS.red : 'transparent'}`, color: filter === s.id ? MS.red : PALETTE.textDim, fontSize: 12.5, fontWeight: filter === s.id ? 800 : 500 }}>{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 py-2" style={{ fontSize: 12 }}>
          <span style={{ color: PALETTE.textDim }}>보관 <b style={{ color: PALETTE.text }}>{bagList.length}</b> · 정렬 <b style={{ color: MS.gold }}>{sortBy === 'grade' ? '등급' : '전투력'}</b></span>
          <div className="flex-1" />
          <button onClick={() => setManage(true)} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text }}>⚙ 관리</button>
          <button onClick={() => (picking ? endPick() : setPicking(true))} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${picking ? MS.gold : MS.line}`, background: picking ? 'rgba(232,176,74,0.12)' : MS.box, color: picking ? MS.gold : PALETTE.text }}>{picking ? '선택 끝' : '☑ 선택'}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {bagList.map(it => {
            const g = gradeOf(it.grade);
            const usable = E.itemUsable(it, hero);
            const cur = usable ? save.inventory.find(x => x.uid === save.units[hero].equip[it.slot]) : null;
            const pd = usable ? E.itemPower(it) - (cur ? E.itemPower(cur) : 0) : 0;
            const slot = SLOTS.find(s => s.id === it.slot);
            const on = picked.has(it.uid);
            return (
              <button key={it.uid} onClick={() => (picking ? togglePick(it.uid) : setSel(it.uid))} className="ui-press relative text-left" style={{ padding: '7px 9px 7px 11px', borderRadius: 10, background: on ? 'rgba(224,106,95,0.16)' : MS.box, border: `1px solid ${on ? '#e06a5f' : MS.line}`, borderLeft: `3px solid ${g.color}`, minWidth: 0, opacity: usable ? 1 : 0.7 }}>
                {picking ? <span className="absolute flex items-center justify-center" style={{ top: 6, right: 7, width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? '#e06a5f' : MS.line}`, color: '#e06a5f', fontSize: 12 }}>{on ? '✓' : ''}</span>
                  : pd > 0 ? <span className="absolute" style={{ top: 6, right: 8, fontSize: 11, fontWeight: 800, color: '#8fd08a' }}>▲ {pd}</span> : null}
                <div className="truncate font-bold" style={{ fontSize: 13, color: g.color, paddingRight: 36 }}>{E.itemName(it)}{it.plus ? ` +${it.plus}` : ''}</div>
                <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{g.label} · Lv.{it.ilv} · {usable ? slot?.label : clsTag(it)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: MS.gold }}>⚔ {E.itemPower(it)}{(E.uniqueDef(it) || E.epicOptOf(it)) && <span style={{ fontSize: 10.5, marginLeft: 5, color: '#c79bff' }}>★특수</span>}</div>
              </button>
            );
          })}
        </div>
        {!bagList.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{list.length ? '보관 중인 장비가 없습니다 — 착용 장비만 있어요' : '비어 있습니다 — 사냥터에서 장비를 모아 보세요'}</div>}
      </div>
      {picking && (
        <div className="flex-none px-3 py-2 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${MS.line}`, background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
            <span style={{ color: PALETTE.text }}>선택 <b style={{ color: '#e06a5f' }}>{picked.size}</b>개{picked.size ? ` → ${E.salvageText(pickedSalvage)}` : ''}</span>
            <div className="flex-1" />
            <button onClick={() => setPicked(new Set(bagList.map(i => i.uid)))} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', border: `1px solid ${MS.line}`, color: PALETTE.dawn, background: 'transparent' }}>보이는 것 전체</button>
            <button onClick={() => setPicked(new Set())} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', border: `1px solid ${MS.line}`, color: PALETTE.textDim, background: 'transparent' }}>해제</button>
          </div>
          <div className="flex gap-2">
            <UIButton variant="ghost" style={{ height: 40 }} disabled={!picked.size} onClick={() => { toStash([...picked]); endPick(); }}>{picked.size ? `${picked.size}개 창고로` : '창고로'}</UIButton>
            <UIButton style={{ height: 40, background: picked.size ? '#b8443a' : undefined }} disabled={!picked.size} onClick={() => askDismantle([...picked], endPick)}>{picked.size ? `${picked.size}개 분해` : '분해할 장비를 고르세요'}</UIButton>
          </div>
        </div>
      )}
      {manage && (
        <MainModal kicker="가 방 관 리" title="⚙ 관리" onClose={() => setManage(false)}>
          <MainSecHead title="정 리" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button onClick={() => { setSave(E.autoEquip(save)); flash('더 강한 장비로 교체'); }} className="ui-press" style={{ ...mBtn, color: MS.gold, borderColor: `${MS.gold}88` }}>자동 장착</button>
            <button disabled={!others.length} onClick={() => toStash(others.map(i => i.uid))} className="ui-press" style={{ ...mBtn, color: '#9cc4e4', opacity: others.length ? 1 : 0.45 }}>타직업 → 창고 ({others.length})</button>
            <button disabled={ec == null || save.gold < ec} onClick={() => { setSave(E.expandBag(save)); flash(`가방 +${BAG_EXPAND.step}칸`); }} className="ui-press" style={{ ...mBtn, gridColumn: 'span 2', opacity: ec == null || save.gold < ec ? 0.45 : 1 }}>{ec == null ? `가방 최대 확장 (${BAG_EXPAND.max}칸)` : `가방 +${BAG_EXPAND.step}칸 · 🪙 ${ec.toLocaleString()}`}</button>
          </div>
          <MainSecHead title="일 괄 분 해" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[[0, '일반'], [1, '고급 이하'], [2, '희귀 이하']].map(([g, l]) => <button key={g} onClick={() => bulk(g)} className="ui-press" style={{ ...mBtn, color: g === 2 ? '#6aa6e0' : PALETTE.text }}>{l}</button>)}
          </div>
          <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>착용 장비는 항상 제외 · 분해 재화 — 일반 🪙 · 고급 ✦ · 희귀 ✦📜 · 에픽 ✦◆ · 유니크 ◆🔮</div>
          <MainSecHead title="획 득 즉 시 자 동 분 해" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[[-1, '끔'], [0, '일반'], [1, '고급↓'], [2, '희귀↓']].map(([g, l]) => (
              <button key={g} onClick={() => setAutoG(g)} className="ui-press" style={{ height: 36, fontSize: 12, border: `1px solid ${autoG === g ? MS.gold : MS.line}`, color: autoG === g ? MS.gold : PALETTE.textDim, background: autoG === g ? 'rgba(232,176,74,0.12)' : MS.box }}>{l}</button>
            ))}
          </div>
          <button onClick={toggleOther} className="ui-press flex items-center gap-1.5 mt-2" style={{ background: 'transparent', border: 'none', color: incOther ? MS.gold : PALETTE.textDim, padding: '4px 0', fontSize: 12 }}>
            <span className="flex items-center justify-center" style={{ width: 18, height: 18, border: `1.5px solid ${incOther ? MS.gold : MS.line}`, fontSize: 12 }}>{incOther ? '✓' : ''}</span>
            분해·자동 분해에 타직업 장비 포함
          </button>
          <MainSecHead title="정 렬" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['power', '전투력 높은 순'], ['grade', '등급 높은 순']].map(([v, l]) => <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ height: 36, fontSize: 12, border: `1px solid ${sortBy === v ? MS.gold : MS.line}`, color: sortBy === v ? MS.gold : PALETTE.textDim, background: sortBy === v ? 'rgba(232,176,74,0.12)' : MS.box }}>{l}</button>)}
          </div>
        </MainModal>
      )}
      {item && (() => {
        const usable = E.itemUsable(item, hero);
        const by = E.equippedBy(save, item.uid);
        const cur = save.inventory.find(i => i.uid === save.units[hero].equip[item.slot]);
        const canPrev = usable && !by && E.canWear(item, save.units[hero]);
        const fb = (extra = {}) => ({ height: 42, fontSize: 13, background: 'transparent', border: `1px solid ${MS.line}`, color: PALETTE.text, ...extra });
        return (
          <MainItemModal save={save} item={item} cur={cur} by={by} usable={usable} onClose={() => setSel(null)}
            footer={<>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {by ? <button onClick={() => { setSave(E.unequipItem(save, by, item.slot)); setSel(null); flash('착용 해제'); }} className="ui-press" style={fb({ color: MS.gold, borderColor: MS.gold })}>착용 해제</button>
                  : usable && E.canWear(item, save.units[hero]) ? <button onClick={() => { setSave(E.equipItem(save, hero, item.uid)); setSel(null); flash('장착'); }} className="ui-press" style={fb({ color: MS.gold, borderColor: MS.gold, fontWeight: 800 })}>착용</button>
                    : <button disabled className="ui-press" style={fb({ color: PALETTE.textDim, opacity: 0.6 })}>{usable ? `Lv.${item.ilv}부터 착용` : '착용 불가'}</button>}
                {canPrev ? <button onClick={() => setPreview({ after: E.equipItem(save, hero, item.uid), title: `⚔ ${E.itemName(item)}${item.plus ? ` +${item.plus}` : ''} 장착 시` })} className="ui-press" style={fb()}>📊 효율 미리보기</button>
                  : <button onClick={() => { setSel(null); onForge?.(); }} className="ui-press" style={fb()}>⚒ 대장간</button>}
                {canPrev && <button onClick={() => { setSel(null); onForge?.(); }} className="ui-press" style={fb()}>⚒ 대장간</button>}
                {!by && <button onClick={() => { toStash([item.uid]); setSel(null); }} className="ui-press" style={fb({ color: '#9cc4e4' })}>창고로</button>}
                {!by && <button onClick={() => { const r = E.dismantleItems(save, [item.uid]); setSave(r.save); setSel(null); flash(`분해 → ${E.salvageText(r.salvage)}`); }} className="ui-press" style={fb({ color: '#e07a6a', gridColumn: canPrev ? 'span 2' : 'auto' })}>분해 {E.salvageText(E.salvageOf(item))}</button>}
              </div>
            </>} />
        );
      })()}
      {confirm && <ConfirmSheet {...confirm} danger onCancel={() => setConfirm(null)} />}
      {preview && <PreviewSheet save={save} after={preview.after} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}

// 장비 정보창 — 본편 카드 모달 (1.249.0, PM 승인 시안 ⑭)
function MainItemModal({ save, item, cur, by, usable, onClose, footer }) {
  const g = gradeOf(item.grade);
  const slot = SLOTS.find(sl => sl.id === item.slot);
  const st = E.itemStats(item);
  const showCmp = usable && !by;
  const b = showCmp && cur ? E.itemStats(cur) : {};
  const opts = Object.keys(st).filter(k => !BASE_STATS.includes(k) && st[k]);
  const gone = showCmp && cur ? Object.keys(b).filter(k => !BASE_STATS.includes(k) && b[k] && !st[k]) : [];
  const optCap = Math.max(g.opts || 0, opts.length);
  const ud = E.uniqueDef(item); const eo = E.epicOptOf(item);
  const risk = (item.plus || 0) < FORGE.maxEnhance ? E.enhanceRisk(item) : null;
  const pd = showCmp ? E.itemPower(item) - (cur ? E.itemPower(cur) : 0) : 0;
  const split = (k, v) => { const t = E.statLabel(k, v); const m = t.match(/^(.*?)\s*([+-]?[\d.]+.*)$/); return m ? [m[1], m[2]] : [t, '']; };
  const dTag = (k) => {
    if (!showCmp || !cur) return null;
    const a = st[k] || 0, c = b[k] || 0, d = +(a - c).toFixed(3);
    if (a && !c) return <span style={{ fontSize: 10.5, color: '#8fd08a', marginLeft: 3 }}>신규</span>;
    if (!d) return null;
    const txt = BASE_STATS.includes(k) ? Math.abs(Math.round(d)).toLocaleString() : split(k, Math.abs(d))[1].replace(/^\+/, '');
    return <span style={{ fontSize: 10.5, color: d > 0 ? '#8fd08a' : '#e07a6a', marginLeft: 3 }}>{d > 0 ? '▲' : '▼'}{txt}</span>;
  };
  const optColor = (k) => (/crit/i.test(k) ? MS.gold : /^scdr_|cdr/.test(k) ? MS.violet : /hp|def|reduce|regen|shield|heal|steal/i.test(k) ? MS.blue : MS.red);
  return (
    <MainModal kicker={`${g.label} · ${slot?.label || ''}`.split('').join(' ').replace(/ {3}/g, '  ')} title={`${E.itemName(item)}${item.plus ? ` +${item.plus}` : ''}`} color={g.color} badge={`⚔ ${E.itemPower(item)}`} onClose={onClose} footer={footer}>
      <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: -6, marginBottom: 8 }}>Lv.{item.ilv} · {clsTag(item)} · {by ? '착용 중' : '가방'}</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {BASE_STATS.map(k => <MainCell key={k} label={BASE_LABEL[k] === '공격' ? '공격력' : BASE_LABEL[k]} value={st[k] ? <>{Math.round(st[k]).toLocaleString()}{dTag(k)}</> : (b[k] ? <span style={{ color: '#e07a6a', fontSize: 12 }}>▼{Math.round(b[k]).toLocaleString()}</span> : '—')} />)}
      </div>
      <MainSecHead title={`추 가 옵 션 (${opts.length}/${optCap})`} />
      {opts.length || gone.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 14 }}>
          {opts.map(k => { const [l, v] = split(k, st[k]); return (
            <div key={k} className="flex items-baseline justify-between gap-1" style={{ padding: '4px 0', minWidth: 0 }}>
              <span className="truncate" style={{ fontSize: 12, color: PALETTE.textDim }}>{l}</span>
              <span className="flex-none" style={{ fontSize: 12.5, fontWeight: 800, color: optColor(k) }}>{v}{dTag(k)}</span>
            </div>); })}
          {gone.map(k => <div key={k} className="flex items-baseline justify-between gap-1" style={{ padding: '4px 0', minWidth: 0 }}><span className="truncate" style={{ fontSize: 12, color: PALETTE.textDim }}>{split(k, b[k])[0]}</span><span className="flex-none" style={{ fontSize: 12, fontWeight: 800, color: '#e07a6a' }}>사라짐 ▼</span></div>)}
        </div>
      ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>{g.opts ? '옵션 없음' : '추가 옵션은 고급 등급부터 붙는다'}</div>}
      <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
        <b style={{ color: ud || eo ? '#c79bff' : MS.red }}>◇ 특수 효과</b> {ud ? <><b style={{ color: '#f0a86a' }}>{ud.name}</b> — {ud.desc}</> : eo ? <><b style={{ color: '#d7a8ff' }}>{eo.name}</b> — {eo.desc}</> : <span style={{ color: PALETTE.textDim }}>없음 (에픽 장신구 · 유니크 장비에만 붙는다)</span>}
      </div>
      {showCmp && (
        <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
          <b style={{ color: MS.red }}>◇ 비교 기준</b> {cur ? <>지금 착용 「{E.itemName(cur)}{cur.plus ? ` +${cur.plus}` : ''}」 · 전투력 <b style={{ color: pd > 0 ? '#8fd08a' : pd < 0 ? '#e07a6a' : PALETTE.textDim }}>{pd > 0 ? `▲ ${pd}` : pd < 0 ? `▼ ${-pd}` : '같음'}</b></> : '이 부위 비어 있음 — 끼면 전부 추가'}
          {(E.uniqueDef(cur) || E.epicOptOf(cur)) && <div style={{ fontSize: 11.5, color: '#e07a6a' }}>※ 교체하면 착용 중 장비의 특수 효과를 잃는다</div>}
        </div>
      )}
      <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
        <b style={{ color: MS.red }}>◇ 강화</b> {risk ? <>+{item.plus || 0} → +{(item.plus || 0) + 1} 성공 <b>{Math.round(risk.rate * 100)}%</b> · {risk.breakChance ? <span style={{ color: '#e07a6a' }}>실패 시 파괴 {Math.round(risk.breakChance * 100)}%</span> : risk.drop ? '실패 시 단계 하락' : '실패해도 단계 유지'} (대장간)</> : <span style={{ color: PALETTE.textDim }}>최대 강화 +{FORGE.maxEnhance}</span>}
      </div>
      {!usable && <div className="mt-2" style={{ fontSize: 12, color: '#e06a5f' }}>{chronicleClass(save.hero).name}는 착용할 수 없다 — 공용 창고에 넣으면 {chronicleClass(item.cls).name} 캐릭터가 쓸 수 있다</div>}
    </MainModal>
  );
}

// ===== 사역마 (1.212.0) — 조각 소환(가챠) · 강화 · 진화 · 편성 =====
const famColor = (g) => F.famGrade(g).color;
// 사역마 역할 안내 + 직업별 추천 (1.216.0)
function FamRoleGuide({ heroCls }) {
  const tip = F.FAM_CLASS_TIP[heroCls];
  return (
    <GlassPanel className="p-3" style={{ fontSize: 12, lineHeight: 1.6 }}>
      <div className="font-semibold mb-1" style={{ fontSize: 13, color: PALETTE.text }}>역할 3종</div>
      {Object.entries(F.FAM_ROLES).map(([id, r]) => (
        <div key={id} style={{ color: PALETTE.textDim }}>
          <b style={{ color: r.color }}>{r.icon} {r.label}</b>{tip?.best === id ? <span style={{ color: PALETTE.legendary }}> ★ 추천</span> : ''} — {r.desc}
        </div>
      ))}
      {tip && <div className="mt-1.5" style={{ color: PALETTE.text }}>{chronicleClass(heroCls).name} 추천 동행: <b style={{ color: F.FAM_ROLES[tip.best].color }}>{F.FAM_ROLES[tip.best].icon} {F.FAM_ROLES[tip.best].label}</b> <span style={{ color: PALETTE.textDim }}>— {tip.why}</span></div>}
    </GlassPanel>
  );
}
// 동행 스킬 · 능력치 상세 (1.217.0)
// 사역마 설명창 「효과」 탭 (1.244.0) — 어디서 적용되나 기준 4구획
const FAM_KIND_LABEL = { taunt: '도발', strike: '단일 공격', multi: '연속 공격', aoe: '광역 공격', heal: '회복', shield: '보호막' };
// 「능력치·스킬」 탭 (1.244.0) — 능력치 타일 + 스킬 카드
// 보조 효과 등급표 — 청령부터 효과가 하나 더 붙는다
function FamSubTable({ k, gi }) {
  const rows = F.famSubPreview(k);
  const keys = F.famSubKeys(k);
  return (
    <div className="mt-2" style={{ fontSize: 11.5 }}>
      <div style={{ color: PALETTE.textDim, marginBottom: 3 }}>등급별 보조 효과 (강화 전 · 사역마 레벨이 주인공과 같을 때 · 청령부터 효과 추가)</div>
      <div className="grid gap-x-2" style={{ gridTemplateColumns: `auto repeat(${keys.length}, 1fr)` }}>
        <span />
        {keys.map(kk => <span key={kk} className="text-right" style={{ color: PALETTE.textDim }}>{F.famSubLabel(kk)}</span>)}
        {rows.map((r, i) => (
          <React.Fragment key={r.grade.id}>
            <span style={{ color: r.grade.color, fontWeight: i === gi ? 700 : 400 }}>{i === gi ? '▶ ' : ''}{r.grade.label}</span>
            {keys.map(kk => <span key={kk} className="text-right" style={{ color: i === gi ? PALETTE.text : PALETTE.textDim, fontWeight: i === gi ? 700 : 400 }}>{r.vals[kk] ? `${Math.round(r.vals[kk] * 1000) / 10}%` : '—'}</span>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
// 동행 칸 후보 — 지금 동행 대비 능력치 증감 (1.244.0)
function FamMainDelta({ k, f, curK, curF, save }) {
  const heroLv = save.units[save.hero]?.lv || 1;
  const famPct = E.deriveUnit(save, save.hero).famPct || 0;
  const a = F.famStats(k, f, heroLv, famPct);
  const b = curF ? F.famStats(curK, curF, heroLv, famPct) : null;
  const items = [['HP', 'maxHp'], ['공격', 'atk'], ['방어', 'def'], ['회복력', 'healPower']];
  return (
    <div className="flex flex-wrap gap-1 mt-1" style={{ paddingLeft: 4 }}>
      {items.map(([l, key]) => {
        const d = b ? a[key] - b[key] : 0;
        return <ValueChip key={key} label={l} value={a[key].toLocaleString()} delta={b && d ? { kind: d > 0 ? 'up' : 'down', text: `${d > 0 ? '▲' : '▼'}${Math.abs(d).toLocaleString()}` } : null} />;
      })}
      {F.famGuard(k, f) > 0 && <ValueChip label="수호 태세" value={`${Math.round(F.famGuard(k, f) * 100)}%`} tone="#e8b04a" />}
    </div>
  );
}
// 편성 칸 배지 (1.244.0) — ★ 동행 / 보조 1·2 / 대기
const FAM_SLOT_BADGE = {
  main: { text: '★ 동행', color: '#e8b04a' },
  sub1: { text: '보조 1', color: '#c79bff' },
  sub2: { text: '보조 2', color: '#c79bff' },
  wait: { text: '대기', color: null },
};
function FamSlotBadge({ slot, mark }) {
  const b = FAM_SLOT_BADGE[slot || 'wait'];
  return (
    <span className="flex-none" style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', color: b.color || PALETTE.textDim, background: b.color ? `${b.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${b.color ? `${b.color}77` : 'var(--ui-line)'}` }}>{b.text}{mark ? ' ◀' : ''}</span>
  );
}
// 보조 효과 칩 줄 — cur(지금 칸 값)를 주면 ▲▼ 비교
function FamSubChips({ k, f, heroLv, cur }) {
  const items = F.famSubItems(k, f, heroLv);
  const vals = Object.fromEntries(items.map(it => [it.k, it.v]));
  const gone = cur ? Object.keys(cur).filter(kk => !vals[kk]) : [];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map(it => <ValueChip key={it.k} label={`${it.icon ? `${it.icon} ` : ''}${it.label}`} value={it.text} delta={F.famSubDelta(it.k, vals, cur)} />)}
      {gone.map(kk => <ValueChip key={kk} label={F.famSubLabel(kk)} delta={F.famSubDelta(kk, vals, cur)} />)}
    </div>
  );
}
function FamCard({ k, f, onClick, right, size = 46, heroLv = 0, slot, mark, cur, dim = false, hideSub = false }) {
  const g = F.famGrade(f.grade);
  const role = F.FAM_ROLES[F.famRole(k)];
  return (
    <button onClick={onClick} className="ui-press w-full flex items-center gap-2.5 text-left" style={{ padding: '7px 10px', borderRadius: 12, background: `${g.color}12`, border: `1px solid ${mark ? '#c79bff' : `${g.color}66`}`, opacity: dim ? 0.72 : 1 }}>
      <img src={chronicleEnemyArt(k)} alt="" className="object-cover flex-none self-start" style={{ width: size, height: size, borderRadius: 10, border: `1.5px solid ${g.color}` }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="truncate font-semibold flex-1 min-w-0" style={{ fontSize: 13, color: g.color }}><span style={{ color: heroLv && F.famLv(f) < heroLv ? '#e8b04a' : PALETTE.legendary }}>Lv.{F.famLv(f)}</span> {F.famName(k)}{f.plus ? ` +${f.plus}` : ''}</div>
          {slot !== undefined && <FamSlotBadge slot={slot} mark={mark} />}
        </div>
        <div style={{ fontSize: 11, color: PALETTE.textDim }}>{g.label} · <span style={{ color: role.color }}>{role.icon} {role.label}</span>{heroLv > 0 && F.famLv(f) < heroLv ? ` · 보조 효과 ${F.famSubPctOf(f, heroLv)}%` : ''}</div>
        {!hideSub && <FamSubChips k={k} f={f} heroLv={heroLv} cur={cur} />}
        {heroLv > 0 && F.famLv(f) < heroLv && <div className="mt-1"><Bar v={f.exp || 0} max={F.FAM_LEVEL.expNeed(F.famLv(f))} color="#e8b04a" h={3} /></div>}
      </div>
      {right}
    </button>
  );
}
// ===== 사역마 인연 (1.228.0) =====
function FamBondView({ fams, onPick }) {
  const own = F.famOwnFx(fams);
  const ownN = Object.values(fams).filter(f => F.famGradeIdx(f.grade) >= F.FAM_OWN_MIN_GRADE).length;
  const bondFx = F.famBondFx(fams);
  const groups = ['region', 'pack', 'special'];
  return (
    <>
      <GlassPanel className="p-3" style={{ fontSize: 12, lineHeight: 1.6 }}>
        <div className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>컬렉션 효과 <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>— 가지고만 있으면 적용 (편성 무관)</span></div>
        <div><b style={{ color: '#c79bff' }}>보유 효과</b> <span style={{ color: PALETTE.textDim }}>(남령 이상 {ownN}마리)</span> — <span style={{ color: PALETTE.text }}>{F.famFxText(own) || '없음'}</span></div>
        <div><b style={{ color: PALETTE.legendary }}>인연</b> <span style={{ color: PALETTE.textDim }}>({F.FAM_BONDS.filter(b => F.bondTier(fams, b) > 0).length}/{F.FAM_BONDS.length})</span> — <span style={{ color: PALETTE.text }}>{F.famFxText(bondFx) || '없음'}</span></div>
        <div style={{ fontSize: 11, color: PALETTE.textDim }}>보유 효과 합계 상한: 공격·HP·방어 +30% · 치명타 피해 +60% · 받는 피해 감소 8% · 재생 1%</div>
        <div style={{ fontSize: 11, color: PALETTE.textDim }}>인연 <b style={{ color: '#c79bff' }}>1단계</b> = 구성원을 모두 보유 · <b style={{ color: PALETTE.legendary }}>2단계</b> = 구성원 <b>전원</b>을 지정 등급 이상으로 진화 + 강화 <b>+{F.BOND_TIER2_PLUS}</b> 이상 (효과 2배)</div>
        <div style={{ fontSize: 11, color: PALETTE.textDim }}>지정 등급: 지역 인연 = <b style={{ color: F.famGrade('indigo').color }}>남령</b> · 사냥 무리 = <b style={{ color: F.famGrade('blue').color }}>청령</b> · 특별 인연 = <b style={{ color: F.famGrade('violet').color }}>자령</b> — 등급은 「진화」, 강화는 「강화」(사역마 상세에서). 아이콘 아래 ✓ = 2단계 조건을 채운 구성원</div>
      </GlassPanel>
      {groups.map(kind => (
        <div key={kind} className="flex flex-col gap-2">
          <div className="font-semibold" style={{ fontSize: 13, color: PALETTE.text }}>{F.FAM_BOND_KIND[kind]}</div>
          {F.FAM_BONDS.filter(b => b.kind === kind).map(b => {
            const t = F.bondTier(fams, b);
            const have = b.members.filter(k => fams[k]).length;
            const g2 = F.famGrade(b.tier2Grade);
            const ok2 = (f) => !!f && F.famGradeIdx(f.grade) >= F.famGradeIdx(b.tier2Grade) && (f.plus || 0) >= F.BOND_TIER2_PLUS;
            const done2 = b.members.filter(k => ok2(fams[k])).length;
            return (
              <GlassPanel key={b.id} className="p-2.5" style={{ border: `1px solid ${t === 2 ? PALETTE.legendary : t === 1 ? '#c79bff88' : 'var(--ui-line)'}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate" style={{ fontSize: 13, color: t ? PALETTE.text : PALETTE.textDim }}>{b.name}</span>
                  <span className="flex-none" style={{ fontSize: 11.5, fontWeight: 700, color: t === 2 ? PALETTE.legendary : t === 1 ? '#c79bff' : PALETTE.textDim }}>{t ? `${t}단계 발동` : `${have}/${b.members.length}`}</span>
                </div>
                <div style={{ fontSize: 11, color: PALETTE.textDim }}>{b.desc}</div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {b.members.map(k => {
                    const f = fams[k];
                    const g = f ? F.famGrade(f.grade) : null;
                    return (
                      <button key={k} onClick={() => onPick(k)} className="ui-press flex flex-col items-center" style={{ width: 52, background: 'transparent', border: 'none', padding: 0 }}>
                        <img src={chronicleEnemyArt(k)} alt="" className="object-cover" style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${g ? g.color : 'var(--ui-line)'}`, filter: f ? 'none' : 'grayscale(1) brightness(.45)' }} draggable={false} />
                        <span className="truncate w-full text-center" style={{ fontSize: 10, color: g ? g.color : PALETTE.textDim }}>{g ? `${ok2(f) ? '✓ ' : ''}${g.label}${f.plus ? `+${f.plus}` : ''}` : '미보유'}</span>
                        <span className="truncate w-full text-center" style={{ fontSize: 10, color: PALETTE.textDim }}>{F.famName(k)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1" style={{ fontSize: 11.5 }}>
                  <span style={{ color: t >= 1 ? '#c79bff' : PALETTE.textDim }}>1단계 {F.famFxText(b.fx)}</span>
                  <span style={{ color: PALETTE.textDim }}> · </span>
                  <span style={{ color: t === 2 ? PALETTE.legendary : PALETTE.textDim }}>2단계 {F.famFxText(Object.fromEntries(Object.entries(b.fx).map(([k, v]) => [k, v * 2])))} <span style={{ fontSize: 10.5 }}>(전원 {g2.label} 이상·+{F.BOND_TIER2_PLUS} — {done2}/{b.members.length})</span></span>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      ))}
    </>
  );
}

// ===== 사역마 본편 스타일 (1.250.0, 시안 ⑮ ⑯-B) =====
const FAM_SLOT_TAG = { main: '★ 동행', sub1: '보조 1', sub2: '보조 2' };
function MainFamTeam({ save, onOpen, onPick }) {
  const team = save.famTeam || {}; const fams = save.fams || {};
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: '1.3fr 1fr 1fr' }}>
      {['main', 'sub1', 'sub2'].map(sl => {
        const open = E.famSlotOpen(save, sl); const k = team[sl]; const f = k && fams[k]; const g = f ? F.famGrade(f.grade) : null;
        const role = f ? F.FAM_ROLES[F.famRole(k)] : null;
        return (
          <button key={sl} onClick={() => (f ? onOpen(k) : open ? onPick(sl) : null)} className="ui-press relative text-left overflow-hidden" style={{ borderRadius: 12, border: `1.5px solid ${f ? g.color : MS.line}`, background: MS.box, padding: 0, minWidth: 0, opacity: open ? 1 : 0.55 }}>
            <span className="absolute" style={{ top: 4, left: 4, fontSize: 10.5, fontWeight: 800, padding: '1px 6px', background: 'rgba(0,0,0,0.7)', border: `1px solid ${f ? g.color : MS.line}`, color: f ? g.color : PALETTE.textDim, zIndex: 1 }}>{FAM_SLOT_TAG[sl]}</span>
            {f ? <img src={chronicleEnemyArt(k)} alt="" className="w-full object-cover" style={{ height: 72, display: 'block' }} />
              : <div className="flex items-center justify-center" style={{ height: 72, fontSize: 22, color: PALETTE.textDim }}>{open ? '＋' : '🔒'}</div>}
            <div style={{ padding: '4px 6px' }}>
              <div className="truncate font-bold" style={{ fontSize: 11.5, color: f ? g.color : PALETTE.textDim }}>{f ? `${F.famName(k)}${f.plus ? ` +${f.plus}` : ''}` : open ? '비어 있음' : `Lv.${F.FAM_TUNING.slotLv[sl]} 개방`}</div>
              <div className="truncate" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{f ? `${g.label} · ${role.icon}${role.label} · Lv.${F.famLv(f)}` : open ? '눌러서 편성' : '주인공 레벨'}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
function MainFamTile({ k, f, slot, heroLv, onClick }) {
  const g = F.famGrade(f.grade); const role = F.FAM_ROLES[F.famRole(k)];
  return (
    <button onClick={onClick} className="ui-press relative flex items-center gap-2 text-left" style={{ padding: 6, borderRadius: 10, background: MS.box, border: `1px solid ${MS.line}`, borderLeft: `3px solid ${g.color}`, minWidth: 0 }}>
      {slot && <span className="absolute" style={{ top: 4, right: 6, fontSize: 10.5, fontWeight: 800, color: slot === 'main' ? MS.gold : MS.violet }}>{FAM_SLOT_TAG[slot].replace(' ', '')}</span>}
      <img src={chronicleEnemyArt(k)} alt="" className="flex-none object-cover" style={{ width: 44, height: 44, borderRadius: 8, border: `1px solid ${g.color}` }} />
      <div className="min-w-0">
        <div className="truncate font-bold" style={{ fontSize: 12.5, color: g.color, paddingRight: slot ? 30 : 0 }}>{F.famName(k)}{f.plus ? ` +${f.plus}` : ''}</div>
        <div className="truncate" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{g.label} · <span style={{ color: role.color }}>{role.icon}{role.label}</span></div>
        <div style={{ fontSize: 11, color: heroLv && F.famLv(f) < heroLv ? MS.gold : PALETTE.text }}>Lv.{F.famLv(f)}</div>
      </div>
    </button>
  );
}
function MainKvRows({ rows }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 14 }}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-1" style={{ padding: '4px 0', minWidth: 0, gridColumn: r.wide ? 'span 2' : 'auto' }}>
          <span className="truncate" style={{ fontSize: 12, color: PALETTE.textDim }}>{r.l}</span>
          <span className="flex-none text-right" style={{ fontSize: 12.5, fontWeight: 800, color: r.c || PALETTE.text }}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}
function MainFamFx({ k, f, fams, heroLv, slot }) {
  const gi = F.famGradeIdx(f.grade); const role = F.FAM_ROLES[F.famRole(k)];
  const base = F.famGrade(F.famBaseGrade(k, f));
  const sig = F.famHasSignature(k, f) ? F.famSignature(k, f.grade) : null;
  const pv = F.famPassive(k, f);
  const subs = F.famSubItems(k, f, heroLv);
  const own = gi >= F.FAM_OWN_MIN_GRADE ? Object.entries(F.famOwnValues(k, f)).filter(([, v]) => v) : [];
  const bonds = F.FAM_BONDS.filter(b => b.members.includes(k));
  const pct = (v) => `+${Math.round(v * 1000) / 10}%`;
  return (
    <>
      <MainSecHead title={`동 행 효 과${slot === 'main' ? ' (사 용 중)' : ''}`} />
      <MainKvRows rows={[
        ...(role.guard ? [{ l: '수호 태세', v: `${Math.round(role.guard[gi] * 100)}%`, c: MS.blue }] : []),
        { l: '역할', v: `${role.icon} ${role.label}`, c: role.color },
        { l: '★ 고유 스킬', v: sig ? sig.name : '없음', c: sig ? '#d07ae8' : PALETTE.textDim },
        { l: '◆ 고유 패시브', v: pv ? pv.name : '없음', c: pv ? '#c79bff' : PALETTE.textDim },
        { l: '베이스 등급', v: base.label, c: base.color },
      ]} />
      <MainSecHead title={`보 조 칸 에 두 면 (${F.famSubPctOf(f, heroLv)}%)`} />
      <MainKvRows rows={subs.map(it => ({ l: `${it.icon ? `${it.icon} ` : ''}${it.label}`, v: it.k === 'shieldPct' ? `HP ${it.text}` : it.text, c: it.econ ? MS.gold : MS.blue }))} />
      <MainSecHead title="보 유 효 과 (편 성 무 관)" />
      {own.length ? <MainKvRows rows={own.map(([kk, v]) => ({ l: F.famFxText({ [kk]: 1 }).split(' +')[0], v: pct(v), c: '#8fd08a' }))} /> : <div style={{ fontSize: 12, color: PALETTE.textDim }}>남령부터 생긴다</div>}
      {bonds.length > 0 && <>
        <MainSecHead title="인 연" />
        <MainKvRows rows={bonds.map(b => { const t = F.bondTier(fams, b); const have = b.members.filter(m => fams[m]).length; return { l: b.name, v: t ? `${t}단계` : `${have}/${b.members.length}`, c: t ? '#9cc4e4' : PALETTE.textDim }; })} />
      </>}
      {(!sig || !pv) && <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>고유 스킬 = 남령 이상 · 고유 패시브 = 자령으로 <b>소환</b>된 사역마만 (진화로는 생기지 않음)</div>}
    </>
  );
}
function MainFamSkill({ k, f, save }) {
  const skills = F.famSkillInfo(k, f);
  const heroLv = save.units[save.hero]?.lv || 1;
  const famPct = E.deriveUnit(save, save.hero).famPct || 0;
  const r = F.famStats(k, f, heroLv, famPct);
  const guard = F.famGuard(k, f); const pv = F.famPassive(k, f);
  return (
    <>
      <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MainCell label="HP" value={r.maxHp.toLocaleString()} />
        <MainCell label="공격력" value={r.atk.toLocaleString()} color={MS.gold} />
        <MainCell label="방어" value={r.def.toLocaleString()} color={MS.blue} />
        <MainCell label="회복력" value={r.healPower.toLocaleString()} color="#8fd08a" />
        <MainCell label="속도" value={r.spd} />
        <MainCell label={guard ? '수호 태세' : '역할'} value={guard ? `${Math.round(guard * 100)}%` : F.FAM_ROLES[F.famRole(k)].label} color={guard ? MS.blue : null} />
      </div>
      <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>Lv.{r.lv} 기준 · 주인공 직업 무관{famPct > 0 ? ` · 주인공 장비 사역마 능력치 +${Math.round(famPct * 100)}% 포함` : ''}</div>
      {pv && <div className="mt-2" style={{ padding: '8px 10px', border: '1px solid #c79bff88', background: MS.box, fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: '#c79bff' }}>◇ 자령 고유 패시브 「{pv.name}」</b> <HiNum text={pv.desc} /></div>}
      {skills.map(sk => (
        <div key={sk.id} className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${sk.sig ? '#d07ae888' : MS.line}`, background: MS.box, fontSize: 12.5, lineHeight: 1.55 }}>
          <div className="flex justify-between gap-2"><b style={{ color: sk.sig ? '#d07ae8' : MS.red }}>◇ {sk.sig ? '고유 스킬 ' : ''}「{sk.name}」</b><span style={{ fontSize: 11, color: PALETTE.textDim }}>⏱ {sk.cd}턴 · {sk.sig ? sk.sigType : FAM_KIND_LABEL[sk.kind] || sk.kind}</span></div>
          <div style={{ color: PALETTE.text }}><HiNum text={sk.effect} /></div>
          {sk.when && <div style={{ fontSize: 11, color: PALETTE.textDim }}>발동: {sk.when}</div>}
        </div>
      ))}
    </>
  );
}

function FamiliarView({ save, setSave, onBack, flash, onTrack = () => {} }) {
  const [tab, setTab] = useState('summon');
  const [results, setResults] = useState(null);
  const [sel, setSel] = useState(null);
  const [pickSlot, setPickSlot] = useState(null);
  const [selTab, setSelTab] = useState('fx'); // 설명창 탭 (1.244.0)
  const [preview, setPreview] = useState(null); // 효율 미리보기 (1.232.0)
  const fams = save.fams || {};
  const shards = save.mats.famShard || 0;
  const souls = save.mats.famSoul || 0;
  const heroLv = save.units[save.hero]?.lv || 1;
  const per = F.FAM_TUNING.shardsPerSummon;
  const pool = F.famPool(save.progress);
  const pity = save.famPity || { total: 0, sinceViolet: 0 };
  const team = save.famTeam || {};
  const list = Object.entries(fams).sort((a, b) => F.famGradeIdx(b[1].grade) - F.famGradeIdx(a[1].grade) || b[1].plus - a[1].plus);
  const doSummon = (n) => {
    const r = E.summonFam(save, n);
    if (!r.results) { flash('계약서 조각이 부족합니다'); return; }
    setSave(r.save); setResults(r.results); onTrack({ summon: r.results.length });
  };
  const slots = [
    { id: 'main', label: '동행', desc: '전투에 함께 싸운다' },
    { id: 'sub1', label: '보조 1', desc: '패시브 효과만' },
    { id: 'sub2', label: '보조 2', desc: '패시브 효과만' },
  ];
  const selF = sel && fams[sel];
  const slotOf = (k) => ['main', 'sub1', 'sub2'].find(sl => team[sl] === k) || null;
  const inTeam = list.filter(([k]) => slotOf(k));
  const waiting = list.filter(([k]) => !slotOf(k));
  const grpHead = (left, right) => <div className="flex justify-between" style={{ fontSize: 11.5, fontWeight: 700, color: PALETTE.textDim, marginTop: 2 }}><span>{left}</span>{right && <span style={{ fontWeight: 400 }}>{right}</span>}</div>;
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사역마" onBack={onBack} right={<div className="flex items-center gap-2" style={{ fontSize: 12 }}><span style={{ color: '#d07ae8' }}>📜{shards}</span><span style={{ color: '#9cc4e4' }}>🔮{souls}</span></div>} />
      <div className="flex-none px-4 pt-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 편성</span>
          <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>누르면 정보 · 빈 칸은 편성</span>
        </div>
        <MainFamTeam save={save} onOpen={(k) => setSel(k)} onPick={(sl) => setPickSlot(sl)} />
        <div className="mt-2"><MainTabs items={[['summon', '소환'], ['list', `보관함 ${list.length}`], ['team', '편성'], ['bond', `인연 ${F.FAM_BONDS.filter(b => F.bondTier(fams, b) > 0).length}`]]} value={tab} onChange={setTab} /></div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {tab === 'summon' && (
          <>
            <GlassPanel className="p-3">
              <div className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>계약의 제단</div>
              <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
                📜 계약서 조각 {per}개로 1회 소환 · 사냥터·던전에서 떨어진다 (보스 확정)<br />
                10연 소환은 청령 이상 1마리 확정 · 누적 {F.FAM_TUNING.violetPity}회 안에 자령 확정{pool.violet.length ? ` (지금 ${pity.sinceViolet}/${F.FAM_TUNING.violetPity})` : ' — 던전 보스나 2부 보스를 쓰러뜨리면 자령이 소환 목록에 들어온다'}
              </div>
              <div className="grid grid-cols-5 gap-1 mt-2">
                {F.FAM_GRADES.map(g => (
                  <div key={g.id} className="text-center" style={{ padding: '5px 0', borderRadius: 8, border: `1px solid ${g.color}55`, opacity: pool[g.id].length ? 1 : 0.35 }}>
                    <div style={{ fontSize: 12, color: g.color, fontWeight: 600 }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: PALETTE.textDim }}>{Math.round(g.rate * 1000) / 10}%</div>
                    <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>{pool[g.id].length}종</div>
                  </div>
                ))}
              </div>
              <div className="mt-1.5" style={{ fontSize: 11, color: PALETTE.textDim }}>소환 목록은 진행한 지역의 적만 — 보스를 잡을수록 늘어난다. 아직 없는 등급이 뽑히면 한 단계 아래로.</div>
            </GlassPanel>
            <div className="grid grid-cols-2 gap-2">
              <UIButton variant="ghost" disabled={shards < per} onClick={() => doSummon(1, false)}>1회 소환 📜{per}</UIButton>
              <UIButton disabled={shards < per * 10} onClick={() => doSummon(10, false)}>10연 소환 📜{per * 10}</UIButton>
            </div>
            <GlassPanel className="p-3" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
              <b style={{ color: PALETTE.text }}>중복</b> → 🔮 사역혼 (적 1 · 녹 3 · 청 10 · 남 30 · 자 100). 더 높은 등급으로 중복이 나오면 그 등급으로 올라간다.<br />
              <b style={{ color: PALETTE.text }}>사역혼 얻기</b> — 중복 소환 · <b style={{ color: PALETTE.text }}>전투 승리</b>(강적 40% · 보스·던전·첨탑 보스 확정) · 일일 임무.<br />
              <b style={{ color: PALETTE.text }}>강화</b> +1~+{F.FAM_TUNING.maxPlus} (단계당 능력치 +{Math.round(F.FAM_TUNING.plusStatPct * 100)}%) → <b style={{ color: PALETTE.text }}>+{F.FAM_TUNING.maxPlus}에서 진화</b> 도전 — 실패하면 강화 -{F.FAM_TUNING.evolveFailDrop}단계(남령→자령은 -{F.famEvolveFailDrop('indigo')}) · <b style={{ color: PALETTE.text }}>천장</b>: 실패할 때마다 다음 성공률이 오른다.
            </GlassPanel>
          </>
        )}
        {tab === 'list' && (
          <>
            <div className="flex justify-between" style={{ fontSize: 12, color: PALETTE.textDim }}><span>보관 <b style={{ color: PALETTE.text }}>{list.length}</b> · 정렬 <b style={{ color: MS.gold }}>등급</b></span><span>📜 {shards} · 🔮 {souls}</span></div>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {[...inTeam, ...waiting].map(([k, f]) => <MainFamTile key={k} k={k} f={f} slot={slotOf(k)} heroLv={heroLv} onClick={() => setSel(k)} />)}
            </div>
            {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 사역마가 없습니다 — 계약서 조각을 모아 소환하세요</div>}
          </>
        )}
        {tab === 'bond' && <FamBondView fams={fams} onPick={(k) => fams[k] && setSel(k)} />}
        {tab === 'team' && slots.map(sl => {
          const open = E.famSlotOpen(save, sl.id);
          const k = team[sl.id];
          const f = k && fams[k];
          return (
            <div key={sl.id}>
              <div style={{ fontSize: 12, color: PALETTE.text, marginBottom: 4 }}><b>{sl.label}</b> <span style={{ color: PALETTE.textDim }}>— {sl.desc}</span></div>
              {!open ? <div style={{ padding: 12, borderRadius: 12, border: '1px dashed var(--ui-line)', color: PALETTE.textDim, fontSize: 12.5 }}>🔒 주인공 Lv.{F.FAM_TUNING.slotLv[sl.id]}에 개방</div>
                : f ? <FamCard k={k} f={f} heroLv={heroLv} slot={sl.id} onClick={() => setPickSlot(sl.id)} right={<span className="flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>교체</span>} />
                  : <button onClick={() => setPickSlot(sl.id)} className="ui-press w-full text-left" style={{ padding: 12, borderRadius: 12, border: '1px dashed var(--ui-line-strong)', background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>＋ 비어 있음 (눌러서 편성)</button>}
            </div>
          );
        })}
        {tab === 'team' && <FamRoleGuide heroCls={save.hero} />}
        {tab === 'team' && <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>동행 사역마의 능력치는 사역마 자신의 레벨·등급·강화·역할로 정해진다 (주인공 직업과 무관). 새 사역마는 Lv.1 — 동행 칸에서 이길 때만 경험치를 받고, 주인공 레벨이 상한. 보조 칸은 사역마마다 경험치·골드·아이템 획득 중 하나를 더 준다. 주인공이 쓰러지면 패배. 사역마는 모든 캐릭터가 함께 쓴다.</div>}
      </div>

      {results && (
        <BottomSheet title="소환 결과" onClose={() => setResults(null)} maxHeight="80%">
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((r, i) => {
              const g = F.famGrade(r.grade);
              return (
                <div key={i} className={`flex items-center gap-2 ${F.famGradeIdx(r.grade) >= 2 ? 'chr-flip-hi' : 'chr-flip'}`} style={{ padding: 6, borderRadius: 10, border: `1px solid ${g.color}`, background: `${g.color}1a`, animationDelay: `${i * 90}ms`, '--g': g.color }}>
                  <img src={chronicleEnemyArt(r.key)} alt="" className="object-cover flex-none" style={{ width: 36, height: 36, borderRadius: 8 }} />
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: 12, color: g.color, fontWeight: 600 }}>{g.label} {F.famName(r.key)}</div>
                    <div style={{ fontSize: 10.5, color: r.isNew ? '#8fe08a' : r.upgraded ? PALETTE.legendary : PALETTE.textDim }}>{r.isNew ? 'NEW!' : r.upgraded ? '등급 상승!' : `중복 → 🔮+${r.soul}`}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4"><UIButton onClick={() => setResults(null)}>확인</UIButton></div>
        </BottomSheet>
      )}
      {selF && (() => {
        const g = F.famGrade(selF.grade);
        const gi = F.famGradeIdx(selF.grade);
        const maxed = selF.plus >= F.FAM_TUNING.maxPlus;
        const ec = F.FAM_TUNING.enhanceCost(selF.plus, selF.grade);
        const vc = F.FAM_TUNING.evolveCost(selF.grade);
        const last = gi >= F.FAM_GRADES.length - 1;
        return (
          <MainModal img={chronicleEnemyArt(sel)} kicker={`${g.label} · ${F.FAM_ROLES[F.famRole(sel)].label}`.split('').join(' ').replace(/ {3}/g, '  ')} title={`${F.famName(sel)}${selF.plus ? ` +${selF.plus}` : ''}`} color={g.color} badge={`Lv.${F.famLv(selF)}`}
            sub={`Lv.${F.famLv(selF)} / ${heroLv}${slotOf(sel) ? ` · ${FAM_SLOT_TAG[slotOf(sel)]} 중` : ' · 대기'}`} onClose={() => setSel(null)}
            footer={<div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {slotOf(sel) ? <button onClick={() => { setSave(E.setFamTeam(save, slotOf(sel), null)); flash('편성 해제'); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 13, gridColumn: 'span 2' }}>편성 해제</button> : <>
                <button disabled={!E.famSlotOpen(save, 'main')} onClick={() => { setSave(E.setFamTeam(save, 'main', sel)); flash('동행으로 편성'); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 13, fontWeight: 800 }}>★ 동행으로</button>
                {(() => { const sl = ['sub1', 'sub2'].find(x => E.famSlotOpen(save, x) && !team[x]) || (E.famSlotOpen(save, 'sub1') ? 'sub1' : null); return <button disabled={!sl} onClick={() => { setSave(E.setFamTeam(save, sl, sel)); flash(`${FAM_SLOT_TAG[sl]}에 편성`); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.line}`, color: sl ? MS.violet : PALETTE.textDim, background: 'transparent', fontSize: 13 }}>{sl ? `${FAM_SLOT_TAG[sl]}에 편성` : '보조 칸 잠김'}</button>; })()}
              </>}
            </div>}>
            <MainTabs items={[['fx', '효과'], ['skill', '능력치·스킬'], ['grow', '성장', !maxed ? souls >= ec : !last && souls >= vc]]} value={selTab} onChange={setSelTab} />
            {selTab === 'fx' && <MainFamFx k={sel} f={selF} fams={fams} heroLv={heroLv} slot={slotOf(sel)} />}
            {selTab === 'skill' && <MainFamSkill k={sel} f={selF} save={save} />}
            {selTab === 'grow' && <>
              <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <MainCell label="레벨" value={`${F.famLv(selF)} / ${heroLv}`} />
                <MainCell label="강화" value={`+${selF.plus} / +${F.FAM_TUNING.maxPlus}`} color={MS.gold} />
                <MainCell label="등급" value={g.label} color={g.color} />
                <MainCell label="베이스" value={F.famGrade(F.famBaseGrade(sel, selF)).label} color={F.famGrade(F.famBaseGrade(sel, selF)).color} />
              </div>
              <MainSecHead title="경 험 치" />
              {F.famLv(selF) < heroLv ? <>
                <Bar v={selF.exp || 0} max={F.FAM_LEVEL.expNeed(F.famLv(selF))} color={MS.violet} h={6} />
                <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{(selF.exp || 0).toLocaleString()} / {F.FAM_LEVEL.expNeed(F.famLv(selF)).toLocaleString()} · <b style={{ color: MS.gold }}>동행 칸</b>에서 이길 때만 오른다 · 보조 효과 {F.famSubPctOf(selF, heroLv)}%</div>
              </> : <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>주인공 레벨 도달 — 주인공이 레벨업하면 다시 경험치를 받는다</div>}
              <div className="flex gap-1 mt-3 justify-center">{Array.from({ length: F.FAM_TUNING.maxPlus }, (_, i) => <span key={i} style={{ width: 18, height: 6, background: i < selF.plus ? g.color : '#ffffff1a' }} />)}</div>
              <div className="grid gap-1.5 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button disabled={maxed || souls < ec} onClick={() => setSave(E.enhanceFam(save, sel))} className="ui-press" style={{ padding: '8px 0', border: `1px solid ${!maxed && souls >= ec ? MS.gold : MS.line}`, background: 'transparent', color: !maxed && souls >= ec ? MS.gold : PALETTE.textDim, fontSize: 12.5, lineHeight: 1.35 }}>
                  {maxed ? '최대 강화' : <>⬆ 강화 +{selF.plus}→+{selF.plus + 1}<br /><span style={{ fontSize: 11 }}>🔮 {ec} / 보유 {souls}</span></>}
                </button>
                <button disabled={!maxed || last || souls < vc} onClick={() => {
                  const r = E.evolveFam(save, sel); if (!r.result) return; setSave(r.save);
                  flash(r.result === 'success' ? `진화 성공! ${F.FAM_GRADES[gi + 1].label}(으)로` : `진화 실패… 강화 -${F.famEvolveFailDrop(selF.grade)}단계 · 다음 성공률 ${Math.round(F.famEvolveRate(r.save.fams[sel]) * 100)}%`);
                }} className="ui-press" style={{ padding: '8px 0', border: `1px solid ${maxed && !last && souls >= vc ? MS.violet : MS.line}`, background: 'transparent', color: maxed && !last && souls >= vc ? MS.violet : PALETTE.textDim, fontSize: 12.5, lineHeight: 1.35 }}>
                  {last ? '최고 등급' : <>✦ 진화 → {F.FAM_GRADES[gi + 1].label}<br /><span style={{ fontSize: 11 }}>{maxed ? `🔮 ${vc} · ${Math.round(F.famEvolveRate(selF) * 100)}% (최대 ${F.famEvolveMaxTries(selF.grade)}회)` : `+${F.FAM_TUNING.maxPlus}에서 도전`}</span></>}
                </button>
              </div>
              <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12, color: PALETTE.text, lineHeight: 1.55 }}>
                <b style={{ color: MS.red }}>◇ 진화</b> 같은 사역마의 등급이 오른다 · 성공하면 강화 +0으로 · 실패하면 강화 -{F.famEvolveFailDrop(selF.grade)} · 실패할수록 다음 성공률 +{Math.round((F.FAM_TUNING.evolvePityAdd[selF.grade] || 0) * 100)}%p
              </div>
              <FamSubTable k={sel} gi={gi} />
            </>}
          </MainModal>
        );
      })()}
      {pickSlot && (() => {
        const slotLabel = slots.find(x => x.id === pickSlot).label;
        const curK = team[pickSlot];
        const curF = curK && fams[curK];
        const isMain = pickSlot === 'main';
        const curVals = isMain ? null : (curF ? F.famSubValues(curK, curF, heroLv) : {});
        const row = ([k, f], others) => (
          <div key={k} className="flex items-stretch gap-1.5">
            <div className="flex-1 min-w-0">
              <FamCard k={k} f={f} heroLv={heroLv} slot={slotOf(k)} cur={curVals} dim={others} hideSub={isMain} onClick={() => { setSave(E.setFamTeam(save, pickSlot, k)); setPickSlot(null); }} />
              {isMain && <FamMainDelta k={k} f={f} curK={curK} curF={curF} save={save} />}
            </div>
            <button onClick={() => setPreview({ after: E.setFamTeam(save, pickSlot, k), title: `🐾 ${slotLabel}: ${F.famName(k)}(으)로 바꾸면` })} className="ui-press flex-none" aria-label="효율 미리보기" style={{ width: 44, borderRadius: 12, border: `1px dashed ${PALETTE.legendary}88`, color: PALETTE.legendary, background: 'transparent', fontSize: 16 }}>📊</button>
          </div>
        );
        const others = list.filter(([k]) => k !== curK && slotOf(k));
        const rest = list.filter(([k]) => !slotOf(k));
        return (
          <BottomSheet title={`${slotLabel} 편성`} onClose={() => setPickSlot(null)} maxHeight="80%">
            <div className="flex flex-col gap-1.5">
              <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{isMain ? '동행 칸 = 함께 싸운다 · 아래 숫자는 지금 동행과 비교한 능력치' : '보조 칸 = 효과만 준다 · ▲▼ = 지금 이 칸의 사역마와 비교'} · 📊 = 사냥 효율 미리보기</div>
              {grpHead(`지금 ${slotLabel} 칸`)}
              {curF ? <><FamCard k={curK} f={curF} heroLv={heroLv} slot={pickSlot} mark hideSub={isMain} onClick={() => setPickSlot(null)} />{isMain && <FamMainDelta k={curK} f={curF} curK={null} curF={null} save={save} />}</>
                : <div style={{ padding: 10, borderRadius: 12, border: '1px dashed var(--ui-line-strong)', fontSize: 12, color: PALETTE.textDim }}>비어 있음</div>}
              {curF && <UIButton variant="ghost" style={{ height: 38 }} onClick={() => { setSave(E.setFamTeam(save, pickSlot, null)); setPickSlot(null); }}>편성 해제</UIButton>}
              {others.length > 0 && grpHead(`다른 칸에 편성 중 ${others.length}`, '고르면 그 칸은 비게 됨')}
              {others.map(e => row(e, true))}
              {rest.length > 0 && grpHead(`대기 ${rest.length}`, '등급 순')}
              {rest.map(e => row(e, false))}
              {!list.length && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>보유한 사역마가 없습니다</div>}
              <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setPickSlot(null)}>닫기</UIButton>
            </div>
          </BottomSheet>
        );
      })()}
      {preview && <PreviewSheet save={save} after={preview.after} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ===== 무한 탑 「황혼의 첨탑」 (1.215.0) =====
function TowerAutoToggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} className="ui-press flex items-center gap-1.5 self-start" style={{ background: 'transparent', border: 'none', color: on ? PALETTE.legendary : PALETTE.textDim, padding: '4px 0', fontSize: 12.5 }}>
      <span className="flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? PALETTE.legendary : 'var(--ui-line-strong)'}`, background: on ? `${PALETTE.legendary}33` : 'transparent', fontSize: 12 }}>{on ? '✓' : ''}</span>
      자동 등반 — 승리하면 다음 층으로, 패배하면 멈춤
    </button>
  );
}
function TowerView({ save, setSave, onBack, onFight, flash, towerAuto = false, onToggleTowerAuto, onStartAuto }) {
  const [shop, setShop] = useState(false);
  const [pickUnique, setPickUnique] = useState(false);
  const t = save.tower || { best: 0, checkpoint: 0, run: null };
  const run = t.run;
  const coins = save.mats.towerCoin || 0;
  const wk = save.towerWeek;
  const nextFloor = run ? run.floor : (t.checkpoint || 0) + 1;
  const boss = E.isTowerBoss(nextFloor);
  const party = E.partyCombatants(save, run?.hp);
  const nextCp = Math.ceil(nextFloor / E.TOWER.bossEvery) * E.TOWER.bossEvery;
  const myUniques = Object.values(UNIQUE_ITEMS).filter(u => !u.disabled && !u.branch && (u.cls === save.hero || u.cls === 'common'));
  const buy = (id, uid) => { const n = E.buyTowerItem(save, id, uid); if (n === save) { flash('구매할 수 없습니다'); return false; } setSave(n); flash('구매 완료'); return true; };
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={run ? `황혼의 첨탑 · ${run.floor}층` : '황혼의 첨탑'} onBack={run ? null : onBack} right={<span style={{ fontSize: 12.5, color: '#e8b04a' }}>✪ {coins}</span>} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 8', border: '1px solid #e8b04a88' }}>
          <img src={chronicleEnemyArt('champ_dawn_boss4', 'combat')} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.85 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0608)' }} />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="font-bold" style={{ fontSize: 18, color: PALETTE.text }}>{nextFloor}층 {boss ? '👑 보스' : nextFloor % 5 === 0 ? '⚔ 강적' : ''}</div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>적 Lv.{E.towerEnemyLv(nextFloor)} · 다음 체크포인트 {nextCp}층{boss ? ` · 유니크 ${Math.round(E.TOWER.uniqueChance(nextFloor) * 100)}%` : ''}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['최고 층', `${t.best || 0}`], ['체크포인트', `${t.checkpoint || 0}`], ['이번 주', `${wk?.key && wk.key === E.towerWeekKeyNow() ? wk.best : 0}`]].map(([l, v]) => (
            <GlassPanel key={l} className="p-2 text-center"><div style={{ fontSize: 11, color: PALETTE.textDim }}>{l}</div><div className="font-bold" style={{ fontSize: 17, color: PALETTE.legendary }}>{v}층</div></GlassPanel>
          ))}
        </div>
        {run && (
          <GlassPanel className="p-3 flex flex-col gap-2">
            <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>내 상태 — 층 사이 최대 HP의 25%만 회복</div>
            {party.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <UnitIcon u={p} size={30} dim={p.hp <= 0} />
                <div className="flex-1"><Bar v={p.hp} max={p.maxHp} color="linear-gradient(90deg,#3d7a3a,#7fcf6a)" h={7} /></div>
                <span style={{ fontSize: 11, color: PALETTE.textDim, width: 70, textAlign: 'right' }}>{p.hp}/{p.maxHp}</span>
              </div>
            ))}
          </GlassPanel>
        )}
        {run ? (
          <>
            <UIButton onClick={onFight}>{boss ? `👑 ${run.floor}층 보스와 싸운다` : `${run.floor}층 전투`}{towerAuto ? ' → 실패할 때까지 자동' : ''}</UIButton>
            <TowerAutoToggle on={towerAuto} onToggle={onToggleTowerAuto} />
            <UIButton variant="ghost" onClick={() => setSave(E.leaveTower(save))}>도전 종료 (체크포인트 {t.checkpoint || 0}층 유지)</UIButton>
          </>
        ) : (
          <>
            <UIButton onClick={() => setSave(E.startTower(save))}>🗼 {nextFloor}층부터 도전 (무료)</UIButton>
            <UIButton variant="gold" onClick={onStartAuto}>⏫ {nextFloor}층부터 자동 등반 (실패할 때까지)</UIButton>
          </>
        )}
        <UIButton variant="gold" onClick={() => setShop(true)}>✪ 첨탑 상점</UIButton>
        <InfoSection icon="🗼" title="첨탑 규칙" color="#c79bff">
          <InfoRow first label="층마다" value="적 레벨 +1" />
          <InfoRow label="10층마다" value="보스 — 쓰러뜨리면 체크포인트" note="사냥터·던전 보스가 번갈아 나온다" />
          <InfoRow label="쓰러지면" value="도전 종료 · 다음은 체크포인트 다음 층부터" />
          <InfoRow label="층 사이 회복" value="최대 HP의 25%" />
          <InfoRow label="입장" value="무료" color="#8fe08a" />
        </InfoSection>
        <InfoSection icon="✪" title="첨탑 주화" color="#e8b04a">
          <InfoRow first label="일반 층" value={`층마다 ${E.TOWER.coins(1)}~`} />
          <InfoRow label="보스 층" value={`×${E.TOWER.bossCoinMult}`} />
          <InfoRow label="주간 보너스" value="처음 도달한 10층 단위마다 층×3" note="월요일 0시 초기화" />
        </InfoSection>
      </div>
      {shop && (
        <BottomSheet title={`✪ 첨탑 상점 — 보유 ✪ ${coins}`} onClose={() => setShop(false)} maxHeight="80%">
          <div className="flex flex-col gap-2">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {E.TOWER_SHOP.map(it => {
                const ok = E.towerShopCanBuy(save, it.id);
                const lack = Math.max(0, it.cost - coins);
                const wide = it.id === 'unique';
                return (
                  <button key={it.id} disabled={!ok} onClick={() => (it.id === 'unique' ? setPickUnique(true) : buy(it.id))} className="ui-press text-left flex flex-col" style={{ gridColumn: wide ? 'span 2' : undefined, padding: 9, borderRadius: 12, border: `1px solid ${wide ? '#f0883e88' : ok ? '#e8b04a66' : 'var(--ui-line)'}`, background: 'rgba(255,255,255,0.02)', opacity: ok ? 1 : 0.65 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: wide ? '#f0a86a' : PALETTE.text }}>{it.name}</div>
                    <div className="flex-1" style={{ fontSize: 11, color: PALETTE.textDim }}>{it.desc}</div>
                    <div className="flex items-center justify-between mt-1.5" style={{ fontSize: 12 }}>
                      <span style={{ padding: '1px 7px', borderRadius: 7, border: '1px solid #e8b04a66', color: '#e8b04a', fontWeight: 700 }}>✪ {it.cost}</span>
                      <b style={{ color: ok ? '#8fe08a' : '#e07a6a' }}>{ok ? '구매' : lack ? `${lack} 부족` : '구매 불가'}</b>
                    </div>
                  </button>
                );
              })}
            </div>
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setShop(false)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
      {pickUnique && (
        <BottomSheet title="🎁 유니크 선택 — 하나를 고르세요" onClose={() => setPickUnique(false)} maxHeight="85%">
          <div className="flex flex-col gap-1.5">
            {myUniques.map(u => (
              <button key={u.id} onClick={() => { if (buy('unique', u.id)) { setPickUnique(false); setShop(false); } }} className="ui-press text-left" style={{ padding: '9px 11px', borderRadius: 12, border: '1px solid #f0883e66', background: '#f0883e10' }}>
                <div style={{ fontSize: 13, color: '#f0883e', fontWeight: 600 }}>{u.name} <span style={{ fontSize: 11, color: PALETTE.textDim, fontWeight: 400 }}>{SLOTS.find(s => s.id === u.slot)?.label} · {u.cls === 'common' ? '공용' : chronicleClass(u.cls).name}</span></div>
                <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{Object.entries(u.opts).map(([k, v]) => E.statLabel(k, v)).join(' · ')}</div>
                <div style={{ fontSize: 11.5, color: '#f0a86a' }}>✦ {u.desc}</div>
              </button>
            ))}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setPickUnique(false)}>취소</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 공용 창고 (계정 공유) =====
function StashView({ save, setSave, onBack, flash }) {
  const [filter, setFilter] = useState('mine');
  const [sel, setSel] = useState(null);
  const stash = save.stash || [];
  const hero = save.hero;
  const list = stash.filter(i => filter === 'all' || (filter === 'mine' ? E.itemUsable(i, hero) : filter === 'unique' ? i.grade === 'unique' : i.cls === filter))
    .sort((a, b) => gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a));
  const item = sel != null ? stash.find(i => i.uid === sel) : null;
  const bagFull = save.inventory.length >= E.bagMax(save);
  const tabs = [{ id: 'mine', label: '착용 가능' }, { id: 'unique', label: '유니크' }, { id: 'all', label: '전체' }];
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title={`공용 창고 ${stash.length}/${A.STASH_MAX}`} onBack={onBack} right={<Wallet save={save} />} />
      <div className="px-4 pt-2 flex-none" style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5 }}>
        모든 캐릭터가 함께 쓰는 창고 — 다른 직업 장비를 넣어 두면 그 직업 캐릭터가 꺼내 쓸 수 있습니다. (가방 {save.inventory.length}/{E.bagMax(save)})
      </div>
      <div className="flex gap-1.5 px-3 pt-2 flex-none">
        {tabs.map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 12, border: `1px solid ${filter === s.id ? PALETTE.legendary : 'var(--ui-line)'}`, color: filter === s.id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{s.label}</button>
        ))}
      </div>
      <div className="flex gap-1.5 px-3 pt-1.5 flex-none overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CHRONICLE_CLASSES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className="ui-press flex-none" style={{ height: 32, padding: '0 10px', borderRadius: 9, fontSize: 11.5, border: `1px solid ${filter === c.id ? c.color : 'var(--ui-line)'}`, color: filter === c.id ? c.color : PALETTE.textDim, background: 'transparent' }}>
            {c.name} {stash.filter(i => i.cls === c.id).length}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {list.map(it => <ItemRow key={it.uid} save={save} item={it} onClick={() => setSel(it.uid)} />)}
        {!list.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>보관된 장비가 없습니다 — 가방에서 「창고로」를 눌러 보관하세요</div>}
      </div>
      {item && (
        <BottomSheet title={E.itemName(item) + (item.plus ? ` +${item.plus}` : '')} onClose={() => setSel(null)} maxHeight="70%">
          <div style={{ fontSize: 12.5, color: gradeOf(item.grade).color }} className="text-center">{gradeOf(item.grade).label} · Lv.{item.ilv} · {SLOTS.find(s => s.id === item.slot).label} · {clsTag(item)}</div>
          <div className="text-center mt-1" style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.6 }}>{statLine(E.itemStats(item))}</div>
          <ItemSpecial item={item} center />
          <div className="mt-3 flex flex-col gap-2">
            <UIButton style={{ height: 42 }} disabled={bagFull} onClick={() => { setSave(E.takeFromStash(save, item.uid)); setSel(null); flash('가방으로 꺼냄'); }}>
              {bagFull ? '가방이 가득 찼습니다' : `가방으로 꺼내기${E.itemUsable(item, hero) ? '' : ' (지금 캐릭터는 착용 불가)'}`}
            </UIButton>
            <UIButton variant="ghost" style={{ height: 42 }} onClick={() => { const r = E.dismantleStash(save, [item.uid]); setSave(r.save); setSel(null); flash(`분해 → ${E.salvageText(r.salvage)}`); }}>
              분해 {E.salvageText(E.salvageOf(item))}
            </UIButton>
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setSel(null)}>닫기</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ===== 대장간 =====
// 가방·대장간 공용 정렬 (1.215.1): 착용 장비가 맨 위(부위 순) → 전투력 또는 등급 순
function useItemSort() {
  const [sortBy, setSortBy] = useState(() => { try { return localStorage.getItem('chronicleBagSort') || 'power'; } catch { return 'power'; } });
  const pickSort = (v) => { setSortBy(v); try { localStorage.setItem('chronicleBagSort', v); } catch { /* */ } };
  return [sortBy, pickSort];
}
function sortItems(save, items, sortBy) {
  const slotIdx = (i) => SLOTS.findIndex(x => x.id === i.slot);
  const eqd = (i) => (E.equippedBy(save, i.uid) ? 1 : 0);
  return items.slice().sort((a, b) => eqd(b) - eqd(a) || (eqd(a) && eqd(b) ? slotIdx(a) - slotIdx(b) : 0)
    || (sortBy === 'grade' ? gradeIdx(b.grade) - gradeIdx(a.grade) || E.itemPower(b) - E.itemPower(a) : E.itemPower(b) - E.itemPower(a) || gradeIdx(b.grade) - gradeIdx(a.grade)));
}
function filterItems(items, filter, hero) {
  return items.filter(i => filter === 'all' || (filter === 'other' ? !E.itemUsable(i, hero) : i.slot === filter));
}
function ItemFilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-1.5 px-3 pt-2 flex-none">
      {[{ id: 'all', label: '전체' }, ...SLOTS, { id: 'other', label: '타직업' }].map(s => (
        <button key={s.id} onClick={() => setFilter(s.id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 11.5, border: `1px solid ${filter === s.id ? PALETTE.legendary : 'var(--ui-line)'}`, color: filter === s.id ? PALETTE.legendary : PALETTE.text, background: 'transparent' }}>{s.label}</button>
      ))}
    </div>
  );
}
function SortButtons({ sortBy, pickSort }) {
  return (
    <>
      <span style={{ color: PALETTE.textDim }}>정렬</span>
      {[['power', '전투력'], ['grade', '등급']].map(([v, l]) => (
        <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ fontSize: 11.5, padding: '4px 8px', borderRadius: 8, border: `1px solid ${sortBy === v ? PALETTE.legendary : 'var(--ui-line)'}`, color: sortBy === v ? PALETTE.legendary : PALETTE.textDim, background: 'transparent' }}>{l}</button>
      ))}
    </>
  );
}

function RiskLine({ rate, fail, danger }) {
  return (
    <div style={{ fontSize: 12, marginTop: 2 }}>
      <span style={{ color: rate >= 1 ? '#8fe08a' : rate >= 0.5 ? PALETTE.legendary : '#e06a5f', fontWeight: 700 }}>성공률 {Math.round(rate * 100)}%</span>
      {fail ? <span style={{ color: danger ? '#e06a5f' : PALETTE.textDim, fontWeight: danger ? 700 : 400 }}> · {danger ? '⚠ ' : ''}{fail}</span> : null}
    </div>
  );
}
// 대장간 부품 (1.246.0)
const FORGE_COST_ROWS = [['gold', '🪙 골드', (s) => s.gold], ['essence', '✦ 정수', (s) => s.mats.essence || 0], ['shard', '◆ 고대 파편', (s) => s.mats.shard || 0]];
function forgeShort(save, cost) {
  const miss = FORGE_COST_ROWS.filter(([k, , have]) => cost[k] && have(save) < cost[k]).map(([k, l, have]) => `${l.replace(/^\S+\s/, '')} ${(cost[k] - have(save)).toLocaleString()}`);
  return miss.length ? `${miss.join(' · ')} 부족합니다` : '진행할 수 없습니다';
}
// ===== 본편 스타일 공용 (1.250.0) — 밑줄 탭 · 착용 4칸 상자 =====
function MainTabs({ items, value, onChange, size = 13 }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, borderBottom: `1px solid ${MS.line}` }}>
      {items.map(([id, label, dot, locked]) => (
        <button key={id} disabled={locked} onClick={() => onChange(id)} className="ui-press relative truncate" style={{ height: 38, background: 'transparent', border: 'none', borderBottom: `2px solid ${value === id ? MS.red : 'transparent'}`, color: value === id ? MS.red : PALETTE.textDim, fontSize: size, fontWeight: value === id ? 800 : 500, opacity: locked ? 0.45 : 1, padding: '0 2px' }}>
          {label}{dot && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: MS.gold, marginLeft: 3, verticalAlign: 6 }} />}
        </button>
      ))}
    </div>
  );
}
function EquipBoxes({ save, hero, onPick, sub }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {SLOTS.map(sl => {
        const it = save.inventory.find(i => i.uid === save.units[hero].equip[sl.id]);
        const g = it ? gradeOf(it.grade) : null;
        return (
          <button key={sl.id} onClick={() => onPick(sl, it)} className="ui-press text-center" style={{ padding: '6px 3px', borderRadius: 12, border: `1.5px solid ${it ? `${g.color}99` : MS.line}`, background: MS.box, minWidth: 0 }}>
            <div style={{ fontSize: 18, lineHeight: 1.2 }}>{sl.icon}</div>
            <div className="truncate font-bold" style={{ fontSize: 11, color: it ? g.color : PALETTE.textDim }}>{it ? E.itemName(it) : `${sl.label} 비어 있음`}</div>
            <div className="truncate" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{it ? sub(it) : '—'}</div>
          </button>
        );
      })}
    </div>
  );
}
// ===== 대장간 본편 스타일 (1.250.0, 시안 ⑰⑱) =====
const forgeNextRate = (it) => ((it.plus || 0) >= FORGE.maxEnhance ? null : E.enhanceRisk(it).rate);
function MainForgeCompare({ before, after }) {
  const a = E.itemStats(before), b = E.itemStats(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => a[k] || b[k]);
  const val = (k, v) => (v ? (BASE_STATS.includes(k) ? Math.round(v).toLocaleString() : E.statLabel(k, v).replace(/^[^\d+-]*(?=[+-]?\d)/, '')) : '—');
  const name = (k) => (BASE_LABEL[k] === '공격' ? '공격력' : BASE_LABEL[k]) || E.statLabel(k, 1).replace(/\s*[+-]?[\d.]+.*$/, '');
  const pa = E.itemPower(before), pb = E.itemPower(after);
  const rows = [...keys.map(k => ({ k, l: name(k), from: val(k, a[k]), to: val(k, b[k]), d: +((b[k] || 0) - (a[k] || 0)).toFixed(3) })), { k: '_pw', l: '전투력', from: pa, to: pb, d: pb - pa }];
  return (
    <>
      <MainSecHead title="지 금 → 이 후" />
      <div className="grid" style={{ gridTemplateColumns: '1fr', rowGap: 0 }}>
        {rows.map(r => (
          <div key={r.k} className="flex items-baseline justify-between gap-2" style={{ padding: '4px 0', borderBottom: '1px dashed rgba(196,69,61,0.18)' }}>
            <span style={{ fontSize: 12, color: PALETTE.textDim }}>{r.l}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: r.k === '_pw' ? MS.gold : PALETTE.text }}>{r.from} → {r.to}{r.d ? <span style={{ fontSize: 11, marginLeft: 4, color: r.d > 0 ? '#8fd08a' : '#e07a6a' }}>{r.d > 0 ? '▲' : '▼'}{r.k === '_pw' || BASE_STATS.includes(r.k) ? Math.abs(Math.round(r.d)).toLocaleString() : E.statLabel(r.k, Math.abs(r.d)).replace(/^[^\d]*/, '')}</span> : null}</span>
          </div>
        ))}
      </div>
    </>
  );
}
function MainForgeCost({ save, cost }) {
  const rows = FORGE_COST_ROWS.filter(([k]) => cost[k]);
  return (
    <>
      <MainSecHead title="비 용" />
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {rows.map(([k, l, have]) => { const h = have(save); const ok = h >= cost[k]; return <MainCell key={k} label={l} value={<>{cost[k].toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}> / {h.toLocaleString()}</span></>} color={ok ? '#8fd08a' : '#e07a6a'} />; })}
      </div>
    </>
  );
}
function MainForgeOdds({ outcomes }) {
  const list = outcomes.filter(([, p]) => p > 0.0005);
  return (
    <>
      <MainSecHead title="결 과 확 률" />
      <div className="flex" style={{ height: 10 }}>{list.map(([l, p, c]) => <div key={l} style={{ width: `${p * 100}%`, background: c }} />)}</div>
      <div className="mt-1" style={{ fontSize: 12 }}>{list.map(([l, p, c], i) => <React.Fragment key={l}>{i ? <span style={{ color: PALETTE.textDim }}> · </span> : null}<b style={{ color: c }}>{l} {Math.round(p * 100)}%</b></React.Fragment>)}</div>
    </>
  );
}

function ForgeView({ save, setSave, onBack, flash, onTrack = () => {} }) {
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, pickSort] = useItemSort();
  const list = sortItems(save, filterItems(save.inventory, filter, save.hero), sortBy);
  const item = sel != null ? save.inventory.find(i => i.uid === sel) : null;
  const ec = item && E.enhanceCost(item);
  const pc = item && E.promoteCost(item);
  const ng = item && E.nextGrade(item);
  const er = item && E.enhanceRisk(item);
  const pr = item && ng && E.promoteRisk(item);
  const [confirm, setConfirm] = useState(null); // 하락·파괴 위험 확인 (1.232.1)
  const [pop, setPop] = useState(null); // 결과 팝업 (1.232.2)
  const showPop = (kind, title, sub) => setPop({ kind, title, sub, key: Date.now() });
  const [skipAsk, setSkipAsk] = useState(forgeConfirmSkip);
  const [ftab, setFtab] = useState('enhance'); // 강화/승급 탭 (1.246.0)
  const [rulesOpen, setRulesOpen] = useState(false);
  const guard = (risky, info, run) => {
    if (!risky || forgeConfirmSkip) { run(); return; }
    setConfirm({ ...info, onConfirm: () => { forgeConfirmSkip = skipAsk; setConfirm(null); run(); } });
  };
  const hero = save.hero;
  const bagList = list.filter(it => !E.equippedBy(save, it.uid));
  const by = item ? E.equippedBy(save, item.uid) : null;
  const maxed = item && (item.plus || 0) >= FORGE.maxEnhance;
  const doEnhance = () => guard(er.drop || er.breakChance > 0, {
    title: `강화 +${item.plus || 0} → +${(item.plus || 0) + 1}`,
    lines: [
      { t: `성공 확률 ${Math.round(er.rate * 100)}%` },
      { t: er.breakChance ? `실패하면 1단계 하락, 그중 ${Math.round(er.breakChance * 100)}%는 장비가 파괴됩니다` : '실패하면 1단계 하락합니다', color: er.breakChance ? '#e06a5f' : '#e8b04a' },
      ...(by ? [{ t: '⚠ 착용 중인 장비입니다', color: '#e8b04a' }] : []),
    ],
    confirmLabel: '강화한다', danger: er.breakChance > 0,
  }, () => {
    const r = E.forgeEnhance(save, item.uid); if (!r.result) return; setSave(r.save); onTrack({ forge: 1 });
    if (r.result === 'destroy') { setSel(null); showPop('destroy', '장비 파괴', `${E.itemName(item)} +${item.plus || 0}`); }
    else if (r.result === 'success') showPop('success', `강화 성공! +${(item.plus || 0) + 1}`, E.itemName(item));
    else if (r.result === 'down') showPop('down', `강화 실패 — +${Math.max(0, (item.plus || 0) - 1)}로 하락`, E.itemName(item));
    else showPop('fail', '강화 실패', '재료만 잃었습니다');
  });
  const doPromote = () => guard(pr.breaks, {
    title: `${gradeOf(ng).label} 승급`,
    lines: [
      { t: `성공 확률 ${Math.round(pr.rate * 100)}%` },
      { t: '실패하면 장비가 파괴됩니다', color: '#e06a5f' },
      ...(by ? [{ t: '⚠ 착용 중인 장비입니다', color: '#e8b04a' }] : []),
    ],
    confirmLabel: '승급한다', danger: true,
  }, () => {
    const r = E.forgePromote(save, item.uid); if (!r.result) return; setSave(r.save); onTrack({ forge: 1 });
    if (r.result === 'destroy') { setSel(null); showPop('destroy', '장비 파괴', `${gradeOf(ng).label} 승급 실패`); return; }
    if (r.result === 'fail') { showPop('fail', '승급 실패', '재료만 잃었습니다'); return; }
    const it2 = r.save.inventory.find(i => i.uid === item.uid); showPop('success', `${gradeOf(ng).label} 등급으로 승급!`, E.epicOptOf(it2) ? `에픽 효과 「${E.epicOptOf(it2).name}」` : E.itemName(it2));
  });
  const bigBtn = (on, label, onClick, gold) => (
    <button disabled={!on} onClick={onClick} className="ui-press" style={{ height: 46, fontSize: 14, fontWeight: 800, border: `1px solid ${on ? (gold ? MS.gold : MS.red) : MS.line}`, background: on ? (gold ? 'rgba(232,176,74,0.14)' : 'rgba(224,87,76,0.16)') : 'transparent', color: on ? (gold ? MS.gold : '#ff8a7e') : PALETTE.textDim }}>{label}</button>
  );
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="대장간" onBack={onBack} right={<Wallet save={save} />} />
      <div className="flex-none px-4 pt-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, letterSpacing: 4, color: MS.red, fontWeight: 700 }}>◆ 착용 장비</span>
          <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>누르면 강화 창</span>
        </div>
        <EquipBoxes save={save} hero={hero} onPick={(sl, it) => (it ? setSel(it.uid) : setFilter(sl.id))} sub={(it) => { const r = forgeNextRate(it); return `+${it.plus || 0} · ${r == null ? '최대' : `다음 ${Math.round(r * 100)}%`}`; }} />
        <div className="mt-2"><MainTabs items={[['all', '전체'], ...SLOTS.map(s => [s.id, s.label]), ['other', '타직업']]} value={filter} onChange={setFilter} size={12.5} /></div>
        <div className="flex items-center gap-1.5 py-2" style={{ fontSize: 12 }}>
          <span style={{ color: PALETTE.textDim }}>보관 <b style={{ color: PALETTE.text }}>{bagList.length}</b> · 정렬 <b style={{ color: MS.gold }}>{sortBy === 'grade' ? '등급' : '전투력'}</b></span>
          <div className="flex-1" />
          <button onClick={() => setRulesOpen(true)} className="ui-press" style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text }}>ⓘ 규칙 · 정렬</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {bagList.map(it => {
            const g = gradeOf(it.grade); const r = forgeNextRate(it); const ngi = E.nextGrade(it); const prr = ngi && E.promoteRisk(it);
            return (
              <button key={it.uid} onClick={() => setSel(it.uid)} className="ui-press text-left" style={{ padding: '7px 9px 7px 11px', borderRadius: 10, background: MS.box, border: `1px solid ${MS.line}`, borderLeft: `3px solid ${g.color}`, minWidth: 0 }}>
                <div className="truncate font-bold" style={{ fontSize: 13, color: g.color }}>{E.itemName(it)}{it.plus ? ` +${it.plus}` : ''}</div>
                <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{g.label} · Lv.{it.ilv} · +{it.plus || 0}</div>
                <div className="truncate" style={{ fontSize: 11 }}>
                  <span style={{ color: PALETTE.textDim }}>⚒ </span><b style={{ color: r == null ? PALETTE.textDim : r >= 1 ? '#8fd08a' : r >= 0.5 ? MS.gold : '#e07a6a' }}>{r == null ? '최대' : `${Math.round(r * 100)}%`}</b>
                  <span style={{ color: PALETTE.textDim }}> · ⬆ {ngi ? `${gradeOf(ngi).label} ${Math.round(prr.rate * 100)}%` : '불가'}</span>
                </div>
              </button>
            );
          })}
        </div>
        {!bagList.length && <div className="text-center py-10" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{list.length ? '보관 중인 장비가 없습니다 — 착용 장비는 위 상자를 누르세요' : save.inventory.length ? '이 분류에 장비가 없습니다' : '가방에 장비가 없습니다'}</div>}
      </div>
      {rulesOpen && (
        <MainModal kicker="대 장 간" title="ⓘ 규칙 · 정렬" onClose={() => setRulesOpen(false)}>
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
            <div>◇ 강화 +1당 능력치 <b style={{ color: MS.gold }}>+{Math.round(FORGE.enhancePct * 100)}%</b> · 최대 <b>+{FORGE.maxEnhance}</b></div>
            <div style={{ color: '#e07a6a' }}>◇ +3부터 실패 · +6부터 실패 시 하락 · +8부터 파괴 위험</div>
            <div>◇ 승급 = 다음 등급 + 옵션 1개 · 에픽 승급은 던전의 ◆ 고대 파편 필요</div>
            <div style={{ color: PALETTE.textDim }}>◇ 유니크·전승 장비는 승급 불가 (강화만)</div>
          </div>
          <MainSecHead title="정 렬" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['power', '전투력 높은 순'], ['grade', '등급 높은 순']].map(([v, l]) => <button key={v} onClick={() => pickSort(v)} className="ui-press" style={{ height: 36, fontSize: 12, border: `1px solid ${sortBy === v ? MS.gold : MS.line}`, color: sortBy === v ? MS.gold : PALETTE.textDim, background: sortBy === v ? 'rgba(232,176,74,0.12)' : MS.box }}>{l}</button>)}
          </div>
        </MainModal>
      )}
      {item && (() => {
        const g = gradeOf(item.grade); const slot = SLOTS.find(sl => sl.id === item.slot);
        const enhOk = !maxed && E.canEnhance(save, item);
        const proOk = ng && E.canPromote(save, item);
        return (
          <MainModal kicker={`${g.label} · ${slot?.label || ''}${by ? ' · 착용 중' : ''}`.split('').join(' ').replace(/ {3}/g, '  ')} title={`${E.itemName(item)}${item.plus ? ` +${item.plus}` : ''}`} color={g.color} badge={`⚔ ${E.itemPower(item)}`} sub={`Lv.${item.ilv} · ${clsTag(item)} · 최대 +${FORGE.maxEnhance}`} onClose={() => setSel(null)}
            footer={ftab === 'enhance'
              ? (maxed ? null : enhOk ? bigBtn(true, `⚒ 강화 +${item.plus || 0} → +${(item.plus || 0) + 1}`, doEnhance) : bigBtn(false, forgeShort(save, ec)))
              : (!ng ? null : proOk ? bigBtn(true, `⬆ ${gradeOf(ng).label} 승급`, doPromote, true) : bigBtn(false, forgeShort(save, pc)))}>
            <MainTabs items={[['enhance', maxed ? '⚒ 최대 강화' : `⚒ 강화 +${item.plus || 0} → +${(item.plus || 0) + 1}`], ['promote', ng ? `⬆ 승급 → ${gradeOf(ng).label}` : '⬆ 승급']]} value={ftab} onChange={setFtab} size={12.5} />
            {ftab === 'enhance' && (maxed
              ? <div className="mt-3" style={{ fontSize: 12.5, color: PALETTE.textDim }}>최대 강화 +{FORGE.maxEnhance}에 도달했습니다</div>
              : <>
                <MainForgeCompare before={item} after={{ ...item, plus: (item.plus || 0) + 1 }} />
                <MainForgeCost save={save} cost={ec} />
                <MainForgeOdds outcomes={(() => { const f = 1 - er.rate; return er.drop ? [['성공', er.rate, '#8fd08a'], [`+${Math.max(0, (item.plus || 0) - 1)}로 하락`, f * (1 - er.breakChance), '#e8b04a'], ['파괴', f * er.breakChance, '#e07a6a']] : [['성공', er.rate, '#8fd08a'], ['실패 (재료만 잃음)', f, '#9b8975']]; })()} />
                <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12, color: PALETTE.text, lineHeight: 1.55 }}>
                  <b style={{ color: MS.red }}>◇ 규칙</b> +6부터 실패 시 하락 · +8부터 실패 시 파괴 위험 · 파괴되면 착용 칸이 빈다
                </div>
              </>)}
            {ftab === 'promote' && (ng
              ? <>
                <MainForgeCompare before={item} after={{ ...item, grade: ng }} />
                <div className="mt-1" style={{ fontSize: 12, color: '#c79bff' }}>◇ 무작위 옵션 1개 추가{ng === 'epic' && item.slot === 'accessory' ? ' + 에픽 장신구 효과' : ''}</div>
                <MainForgeCost save={save} cost={pc} />
                <MainForgeOdds outcomes={[['성공', pr.rate, '#8fd08a'], [pr.breaks ? '파괴' : '실패 (재료만 잃음)', 1 - pr.rate, pr.breaks ? '#e07a6a' : '#9b8975']]} />
              </>
              : <div className="mt-3" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{item.grade === 'unique' || item.grade === 'mythic' ? '유니크·전승 장비는 승급할 수 없다 — 강화만' : '최고 등급입니다'}</div>)}
          </MainModal>
        );
      })()}
      {confirm && <ConfirmSheet {...confirm} onCancel={() => setConfirm(null)} skipLabel="이번 접속 동안 다시 묻지 않기" skip={skipAsk} onSkipChange={setSkipAsk} />}
      {pop && <ForgePop pop={pop} onDone={() => setPop(null)} />}
    </div>
  );
}

// ===== 시작 · 캐릭터 슬롯 =====
// 직업당 캐릭터 1명 (최대 5). 재화·열쇠·공용 창고는 모든 캐릭터가 공유한다.
// ===== 저장 백업 (1.236.1) — 내보내기·가져오기·자동 백업 복원 =====
function fmtWhen(ms) {
  if (!ms) return '알 수 없음';
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function SummaryLine({ sm }) {
  return <span>캐릭터 {sm.chars}명 · 최고 Lv.{sm.maxLv} · 🪙{sm.gold.toLocaleString()} · 사역마 {sm.fams} · 창고 {sm.stash}</span>;
}
function CloudPanel({ api, onPick, setMsg }) {
  const { user, state } = api;
  return (
    <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.text }}>
      <div className="font-semibold mb-1">☁ 클라우드 저장</div>
      {!user ? (
        <>
          <div style={{ color: PALETTE.textDim, marginBottom: 6 }}>구글 계정으로 로그인하면 다른 기기에서도 이어서 할 수 있습니다. 본편과 같은 계정을 씁니다.</div>
          <UIButton onClick={api.login}>구글 로그인</UIButton>
        </>
      ) : (
        <>
          <div style={{ color: PALETTE.textDim, marginBottom: 6, lineHeight: 1.6 }}>
            {user.isAnonymous ? '게스트 계정 (이 기기 전용 — 기기를 바꾸려면 본편에서 구글 계정 연동)' : `${user.displayName}${user.email ? ` · ${user.email}` : ''}`}<br />
            {state.busy ? '동기화 중…' : state.lastUp ? `마지막 저장 ${fmtWhen(state.lastUp)} · 30초마다 자동 저장` : state.checkedUid ? '자동 저장 켜짐' : '클라우드 확인 전 — 자동 저장 대기'}
          </div>
          <div className="flex gap-2">
            <UIButton onClick={async () => { const r = await api.upload(); if (r) setMsg(r.ok ? '클라우드에 저장했습니다' : r.error); }}>⬆ 지금 올리기</UIButton>
            <UIButton variant="ghost" onClick={async () => { const r = await api.download(); if (!r) return; if (!r.ok) setMsg(r.error); else if (!r.exists) setMsg('클라우드에 저장된 진행이 없습니다'); else onPick(r); }}>⬇ 불러오기</UIButton>
          </div>
        </>
      )}
      {state.error ? <div className="mt-1.5" style={{ color: '#e06a5f' }}>⚠ {state.error}</div> : null}
    </GlassPanel>
  );
}
function BackupSheet({ acc, onClose, onImport, cloudApi }) {
  const [msg, setMsg] = useState(null);
  const [paste, setPaste] = useState('');
  const [pending, setPending] = useState(null); // 가져올 계정 (확인 대기)
  const fileRef = useRef(null);
  const auto = useMemo(() => BK.backupInfo(), []);
  const download = () => {
    try {
      const blob = new Blob([BK.exportText(acc)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = BK.exportFileName(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMsg('백업 파일을 저장했습니다 (다운로드 폴더 확인)');
    } catch { setMsg('파일 저장에 실패했습니다 — 「텍스트 복사」를 써 주세요'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(BK.exportText(acc)); setMsg('백업 텍스트를 복사했습니다 — 메모장 등에 붙여 넣어 보관하세요'); }
    catch { setMsg('복사에 실패했습니다 — 「파일로 저장」을 써 주세요'); }
  };
  const tryImport = (text) => {
    const r = BK.parseImport(text);
    if (r.error) { setMsg(r.error); return; }
    setPending(r);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => tryImport(rd.result); rd.readAsText(f);
    e.target.value = '';
  };
  const cur = BK.accountSummary(acc);
  if (pending) {
    const sm = BK.accountSummary(pending.acc);
    return (
      <BottomSheet title="가져오기 확인" onClose={() => setPending(null)} maxHeight="70%">
        <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>지금 진행이 <b style={{ color: '#e06a5f' }}>백업 내용으로 바뀝니다</b>. 되돌릴 수 없으니 필요하면 먼저 지금 진행을 내보내 두세요.</div>
        <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.7 }}>
          지금: <SummaryLine sm={cur} /><br />백업{pending.at ? ` (${fmtWhen(pending.at)})` : ''}: <b style={{ color: PALETTE.text }}><SummaryLine sm={sm} /></b>
        </GlassPanel>
        <div className="flex gap-2 mt-3">
          <UIButton variant="ghost" onClick={() => setPending(null)}>취소</UIButton>
          <UIButton onClick={() => onImport(pending.acc)}>백업으로 바꾸기</UIButton>
        </div>
      </BottomSheet>
    );
  }
  return (
    <BottomSheet title="💾 저장 백업" onClose={onClose} maxHeight="85%">
      <div style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>기본 저장은 이 기기의 브라우저입니다. 구글 로그인으로 클라우드 저장을 켜거나, 기기를 바꾸기 전에 파일로 백업해 두세요.</div>
      {cloudApi && <CloudPanel api={cloudApi} onPick={(r) => setPending({ acc: r.acc, at: r.savedAt })} setMsg={setMsg} />}
      <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.text }}>
        <div className="font-semibold mb-1">내보내기</div>
        <div style={{ color: PALETTE.textDim, marginBottom: 6 }}>지금: <SummaryLine sm={cur} /></div>
        <div className="flex gap-2">
          <UIButton onClick={download}>📥 파일로 저장</UIButton>
          <UIButton variant="ghost" onClick={copy}>📋 텍스트 복사</UIButton>
        </div>
      </GlassPanel>
      <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.text }}>
        <div className="font-semibold mb-1">가져오기</div>
        <input ref={fileRef} type="file" accept=".json,application/json,text/plain" onChange={onFile} style={{ display: 'none' }} />
        <UIButton variant="ghost" onClick={() => fileRef.current?.click()}>📂 백업 파일 선택</UIButton>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="또는 백업 텍스트를 여기에 붙여 넣기" rows={3} className="w-full mt-2" style={{ fontSize: 11.5, padding: 8, borderRadius: 10, background: '#0006', color: PALETTE.text, border: '1px solid var(--ui-line)', resize: 'vertical' }} />
        {paste.trim() ? <div className="mt-1"><UIButton variant="ghost" onClick={() => tryImport(paste)}>붙여 넣은 텍스트로 가져오기</UIButton></div> : null}
      </GlassPanel>
      <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.text }}>
        <div className="font-semibold mb-1">자동 백업 (10분마다)</div>
        {auto ? (
          <>
            <div style={{ color: PALETTE.textDim, marginBottom: 6 }}>{fmtWhen(auto.at)} 저장본: <SummaryLine sm={auto.summary} /></div>
            <UIButton variant="ghost" onClick={() => setPending({ acc: auto.acc, at: auto.at })}>↺ 자동 백업으로 되돌리기</UIButton>
          </>
        ) : <div style={{ color: PALETTE.textDim }}>아직 자동 백업이 없습니다 (10분 이상 플레이하면 생깁니다)</div>}
      </GlassPanel>
      {msg ? <div className="mt-2" style={{ fontSize: 12, color: PALETTE.dawn }}>{msg}</div> : null}
    </BottomSheet>
  );
}

function TitleView({ acc, onSelect, onCreate, onExit, onReset, onImport, cloudApi }) {
  const [picking, setPicking] = useState(null); // 새로 만들 직업 id
  const [backupOpen, setBackupOpen] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0 닫힘 · 1 안내 · 2 최종 확인
  const chars = acc.chars || {};
  const owned = CHRONICLE_CLASSES.filter(c => chars[c.id]);
  const last = acc.active && chars[acc.active] ? acc.active : null;
  if (picking) {
    const cls = chronicleClass(picking);
    return (
      <div className="absolute inset-0 flex flex-col">
        <Header title="새 캐릭터" onBack={() => setPicking(null)} />
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex gap-2">
            {CHRONICLE_CLASSES.map(c => (
              <button key={c.id} disabled={!!chars[c.id]} onClick={() => setPicking(c.id)} className="ui-press flex-1" style={{ borderRadius: 14, padding: 2, border: `2px solid ${picking === c.id ? c.color : 'transparent'}`, opacity: chars[c.id] ? 0.25 : picking === c.id ? 1 : 0.55, background: 'transparent' }}>
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
            {classSkills(picking).map(s => <div key={s.id} style={{ color: PALETTE.textDim, lineHeight: 1.55 }}><b style={{ color: PALETTE.text }}>{s.name}</b> (Lv.{s.reqLv}) — {describeSkill(s, 1)}</div>)}
          </GlassPanel>
          <GlassPanel className="p-3" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>
            <div className="font-semibold mb-1" style={{ color: PALETTE.text }}>전용 장비</div>
            무기 · 보조({SLOTS[1].label}) · 갑옷은 {cls.name} 전용, 장신구는 공용. 유니크 {Object.values(UNIQUE_ITEMS).filter(u => u.cls === picking && !u.disabled && !u.branch).length}종 (+ 전승 갈래 유니크).
          </GlassPanel>
        </div>
        <div className="p-4 flex-none"><UIButton onClick={() => onCreate(picking)}>{cls.name}{'(으)로 시작'}</UIButton></div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_1/iceMage_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0608cc 0%, #0a060844 30%, #0a0608 70%)' }} />
      <div className="relative flex-1 flex flex-col px-5 pt-12 pb-5 min-h-0">
        <div className="text-center flex-none">
          <div style={{ fontSize: 11, letterSpacing: '0.45em', color: '#9cc4e4' }}>{CHRONICLE_SUB.toUpperCase()}</div>
          <div className="font-bold mt-1" style={{ fontSize: 32, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: '0 4px 20px #000' }}>{CHRONICLE_TITLE}</div>
          <div className="mt-2" style={{ fontSize: 12.5, color: PALETTE.textDim }}>홀로 걷는 정통 RPG — 레벨 {CHRONICLE_TUNING.maxLevel} · 직업 장비 · 유니크 · 공용 창고</div>
        </div>
        <div className="mt-auto flex flex-col gap-2 ui-stagger overflow-y-auto">
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>캐릭터 ({owned.length}/{CHRONICLE_CLASSES.length}) · 🪙{acc.gold} · 🗝{acc.keys?.count || 0} · 창고 {(acc.stash || []).length}</div>
          {CHRONICLE_CLASSES.map(c => {
            const ch = chars[c.id];
            return (
              <button key={c.id} onClick={() => (ch ? onSelect(c.id) : setPicking(c.id))} className="ui-press flex items-center gap-3 text-left" style={{ padding: 8, borderRadius: 14, background: last === c.id ? `${c.color}22` : 'rgba(10,6,8,0.7)', border: `1px solid ${ch ? c.color + '88' : 'var(--ui-line)'}` }}>
                <Portrait cid={c.id} size={42} dim={!ch} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: 14, color: ch ? PALETTE.text : PALETTE.textDim }}>{c.name} <span style={{ fontSize: 11, color: c.color }}>{c.role}</span></div>
                  <div style={{ fontSize: 11.5, color: ch ? PALETTE.legendary : PALETTE.textDim }}>
                    {ch ? `Lv.${ch.unit.lv} · 보스 ${Object.keys(ch.progress.bossCleared || {}).length}/${CHRONICLE_FIELDS.length} 처치` : '비어 있음 — 눌러서 만들기'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: ch ? PALETTE.dawn : PALETTE.textDim }}>{ch ? (last === c.id ? '이어하기 ▸' : '선택 ▸') : '＋'}</span>
              </button>
            );
          })}
          <button onClick={onExit} className="ui-press" style={{ background: 'transparent', border: 'none', color: PALETTE.dawn, padding: 10, fontSize: 12.5 }}>⇄ 게임 선택</button>
          <div className="flex items-center justify-center gap-2 flex-wrap pb-1">
            <span style={{ fontSize: 11, color: PALETTE.textDim }}>v{GAME_VERSION}</span>
            <UpdateButton />
            <button onClick={() => setBackupOpen(true)} className="ui-press" style={{ minHeight: 32, padding: '0 12px', borderRadius: 999, fontSize: 11, background: 'transparent', border: '1px solid #9cc4e466', color: '#9cc4e4' }}>💾 백업</button>
            <button onClick={() => setResetStep(1)} className="ui-press" style={{ minHeight: 32, padding: '0 12px', borderRadius: 999, fontSize: 11, background: 'transparent', border: '1px solid #e06a5f66', color: '#e06a5f' }}>↺ 처음부터 다시</button>
          </div>
        </div>
      </div>
      {backupOpen && <BackupSheet acc={acc} cloudApi={cloudApi} onClose={() => setBackupOpen(false)} onImport={(a) => { setBackupOpen(false); onImport(a); }} />}
      {resetStep > 0 && (
        <BottomSheet title="↺ 황혼 연대기 초기화" onClose={() => setResetStep(0)} maxHeight="70%">
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
            황혼 연대기의 <b style={{ color: '#e06a5f' }}>모든 진행이 삭제</b>되고 서장부터 다시 시작합니다.
          </div>
          <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.7 }}>
            삭제: 캐릭터 {owned.length}명(레벨·전승·장비·스킬) · 골드 {acc.gold.toLocaleString()} · 재료 · 열쇠 · 공용 창고 {(acc.stash || []).length}개 · 사역마 {Object.keys(acc.fams || {}).length}마리 · 이야기·의뢰·첨탑 기록<br />
            유지: 던앤트와일라잇 본편 · 트와일라잇 아르카나 · 무덤의 유산 등 <b style={{ color: PALETTE.text }}>다른 게임은 그대로</b>
          </GlassPanel>
          <div className="flex flex-col gap-2 mt-3">
            {resetStep === 1
              ? <UIButton variant="ghost" style={{ height: 42, color: '#e06a5f', borderColor: '#e06a5f88' }} onClick={() => setResetStep(2)}>초기화 진행</UIButton>
              : <UIButton style={{ height: 42, background: '#8b1f1f' }} onClick={() => { setResetStep(0); onReset(); }}>정말 전부 지우고 처음부터 시작</UIButton>}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setResetStep(0)}>취소</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// 2.0 첫 진입 안내 (1.x 플레이어 — 초기화 + 시작 보상)
function GiftNotice({ acc, onClose }) {
  const g = A.V1_GIFT;
  return (
    <BottomSheet title="황혼 연대기 2.0" onClose={onClose} maxHeight="70%">
      <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
        파티제 → <b style={{ color: PALETTE.legendary }}>솔로 RPG</b>로 다시 태어났습니다. 직업 전용 장비 · 유니크 등급 · 공용 창고 · 레벨 {CHRONICLE_TUNING.maxLevel}.
        <div className="mt-2" style={{ color: PALETTE.textDim }}>이전 버전(1.x) 진행은 새 구조와 맞지 않아 초기화되었습니다. 미안한 마음을 담아 시작 보상을 드립니다.</div>
        <GlassPanel className="p-3 mt-3">
          <div>🪙 골드 {g.gold.toLocaleString()}</div>
          <div>🗝 던전 열쇠 +{g.keys}</div>
          <div>📜 계약서 조각 {g.famShard ?? (g.sealPlus || 0) * 10}개 (사역마 소환 {Math.floor((g.famShard ?? (g.sealPlus || 0) * 10) / F.FAM_TUNING.shardsPerSummon)}회분)</div>
          <div>🎁 첫 캐릭터 직업 희귀 장비 {g.rareBoxes}개</div>
        </GlassPanel>
        <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{Object.keys(acc.chars || {}).length ? '보상은 지급되었습니다.' : '첫 캐릭터를 만들면 지급됩니다.'}</div>
      </div>
      <div className="mt-4"><UIButton onClick={onClose}>확인</UIButton></div>
    </BottomSheet>
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
              flash(r.gained?.item ? `보상 수령 — ${E.itemName(r.gained.item)} 획득` : r.gained?.keysGot ? `보상 수령 — 🗝 열쇠 +${r.gained.keysGot}` : '보상 수령!');
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

// ===== 스킬 카드·정보 창 (1.245.0) =====
const SKILL_KIND_LABEL = {
  strike: '단일 공격', multi: '연속 공격', aoe: '광역 공격', dot: '지속 피해', lifesteal: '흡혈 공격', heal: '회복', healAll: '전체 회복', shield: '보호막',
  buffAtk: '아군 강화', rage: '자기 강화', taunt: '도발', executeStrike: '처형', breakStrike: '방어 파괴', weakStrike: '공격 약화', markStrike: '취약 표식',
  healShield: '회복 + 보호막', healBuff: '회복 + 강화', hot: '지속 회복', passive: '패시브 (상시)',
};
const SKILL_WHEN_TEXT = {
  heal: 'HP가 낮은 아군이 위급할 때 (회복 우선)', healAll: '부상당한 아군이 2명 이상일 때', healShield: 'HP가 낮은 아군이 있을 때', healBuff: 'HP가 낮은 아군이 있을 때', hot: 'HP가 낮은 아군이 있을 때',
  shield: '보호막이 없을 때', buffAtk: '강화 효과가 꺼져 있을 때', rage: '강화 효과가 꺼져 있을 때', taunt: '위급할 때 적의 공격을 끌어온다',
  aoe: '살아 있는 적이 2명 이상일 때 (광역 우선)', passive: '항상 적용',
};
const skillTarget = (s) => (/heal|shield|buff|hot/i.test(s.kind) ? (s.kind === 'heal' || s.kind === 'hot' || s.kind === 'healShield' || s.kind === 'healBuff' ? '아군 1명' : '아군 전체') : s.kind === 'rage' || s.kind === 'taunt' ? '자신' : s.kind === 'passive' ? '자신' : s.kind === 'aoe' || (s.kind === 'dot' && s.all) ? '적 전체' : '적 1명');
const skillParts = (t) => String(t).split(/, | — | \+ (?=\d+턴간|보호막|그 적|방어|받는)/).filter(Boolean);
const skillPower = (s, lv) => (s.kind === 'passive' ? null : Math.round((s.base + s.perLv * (Math.max(1, lv) - 1)) * 100));

// ===== 스킬 쿨타임 표시 (1.240.1) — 엔진 규칙: 쓴 뒤 대기 = max(0, 재사용 - 단축), 단축은 장비·특성 합산 최대 2 =====
// 1.241.0: cdr 인자 = deriveUnit 결과(d) — 모든 스킬 단축 + 스킬별 단축을 합쳐 계산
const cdOf = (s, d) => (d ? E.skillCdrOf(d, s.id) : 0);
const cdWait = (s, d) => Math.max(0, (s.cd || 0) - cdOf(s, d));
function CdChip({ s, cdr: d }) {
  if (s.kind === 'passive') return <span style={{ fontSize: 10.5, color: PALETTE.textDim }}>· 패시브</span>;
  if (!s.cd) return null;
  const cdr = cdOf(s, d);
  const w = cdWait(s, d);
  return (
    <span style={{ fontSize: 10.5, color: cdr ? '#7fd1c8' : PALETTE.textDim, whiteSpace: 'nowrap' }}>
      ⏱ {cdr ? <><s style={{ opacity: 0.6 }}>{s.cd}</s>→{w ? `${w}턴` : '매 턴'}</> : `${s.cd}턴`}
    </span>
  );
}
function CdDetail({ s, cdr: d }) {
  if (s.kind === 'passive') return <div style={{ color: PALETTE.textDim }}>패시브 — 쿨타임 없이 항상 적용</div>;
  if (!s.cd) return null;
  const cdr = cdOf(s, d);
  const all = d?.cdr || 0; const own = d?.skillCdr?.[s.id] || 0;
  const w = cdWait(s, d);
  return (
    <div style={{ color: PALETTE.textDim, lineHeight: 1.55 }}>
      ⏱ 재사용 대기 <b style={{ color: PALETTE.text }}>{s.cd}턴</b>
      {cdr ? <> − 재사용 단축 <b style={{ color: '#7fd1c8' }}>{cdr}턴</b> = <b style={{ color: '#7fd1c8' }}>{w ? `${w}턴` : '매 턴 사용 가능'}</b>
        <br />단축 출처: {[all ? `모든 스킬 -${all} (유니크·특성)` : null, own ? `이 스킬 전용 -${own} (장비 옵션·시간의 모래)` : null].filter(Boolean).join(' · ')} — 합계 최대 {E.CDR_CAP}턴</> : null}
      <br />쓴 뒤 내 차례 {w}번은 이 스킬을 쓸 수 없고, 그 다음 차례부터 다시 쓸 수 있다
    </div>
  );
}

// ===== 세부 능력치 (1.231.4) — deriveUnit이 계산하는 전투 수치를 전부 보여 준다 =====
// [키, 라벨, 형식] — 형식: pct(%) · pctMult(배율 → %) · turn(턴) · x(배) · flag(보유) · num
const DETAIL_STATS = [
  ['critMult', '치명 피해', 'pctMult'], ['counterPct', '반격 확률', 'pct'], ['counterDmg', '반격 피해', 'pct'], ['counterDouble', '반격 2회 확률', 'pct'],
  ['critAfterCounter', '반격·회피 후 확정 치명', 'flag'], ['firstCrit', '첫 공격 확정 치명', 'flag'],
  ['dmgReduce', '받는 피해 감소', 'pct'], ['tauntReduce', '도발 중 피해 감소', 'pct'], ['shieldReduce', '보호막 중 피해 감소', 'pct'],
  ['lifesteal', '흡혈', 'pct'], ['thornsPct', '피해 반사', 'pct'], ['armorPen', '방어 관통', 'pct'], ['lowHpDmg', 'HP 50% 이하일 때 피해', 'pct'],
  ['missingHpAtk', '잃은 HP 10%당 피해', 'pct'], ['execute', '빈사(HP 30%↓) 적 피해', 'pct'], ['chain', '추가 타격 확률', 'pct'],
  ['skillDmg', '스킬 피해', 'pct'], ['dotDmg', '지속 피해', 'pct'], ['dotTurnsMult', '지속 피해 시간', 'x'], ['holyDmg', '치유→신성 피해', 'pct'],
  ['startShieldPct', '시작 보호막', 'pct'], ['skillShield', '스킬 사용 시 보호막(공격력 대비)', 'pct'], ['overhealShield', '넘친 회복 → 보호막', 'flag'],
  ['regenPct', '매 턴 HP 재생', 'pct'], ['dodgeHeal', '회피 시 회복', 'pct'], ['emergencyHeal', '위기 회복(HP 30%↓, 1회)', 'pct'],
  ['revive', '부활(1회) HP', 'pct'], ['guts', '불굴(1회 HP 1로 버팀)', 'flag'], ['cdr', '모든 스킬 재사용 단축', 'turn'], ['resetEvery', '재사용 초기화 주기', 'turn'],
  ['openInferno', '개전 겁화 (매 턴 공격력의)', 'pct'], ['rageDouble', '광폭화 중 모든 공격 2회', 'flag'], ['rageTurnsAdd', '광폭화 지속', 'turn'], ['rageLifesteal', '광폭화 중 흡혈 2배', 'flag'], ['multiHitsAdd', '연속 화살 타수', 'num'], ['spiritArrow', '정령 화살 확률', 'pct'],
  ['blessMult', '축복 효과', 'x'], ['blessTurns', '축복 지속', 'turn'],
  ['famPct', '사역마 능력치', 'pct'], ['expPct', '경험치 획득', 'pct'], ['goldPct', '골드 획득', 'pct'], ['dropPct', '장비 획득률', 'pct'],
];
const fmtDetail = (v, f) => (f === 'pct' ? `${Math.round(v * 1000) / 10}%` : f === 'pctMult' ? `${Math.round(v * 100)}%` : f === 'turn' ? `${v}턴` : f === 'x' ? `×${v}` : f === 'flag' ? '보유' : `+${v}`);
// 1.245.0 — 성격별 4구획 (PM 승인 시안)
const DETAIL_GROUPS = [
  { id: 'atk', icon: '⚔', title: '공격', color: '#e07a6a', keys: ['critMult', 'counterPct', 'counterDmg', 'counterDouble', 'critAfterCounter', 'firstCrit', 'armorPen', 'lowHpDmg', 'missingHpAtk', 'execute', 'chain', 'skillDmg', 'dotDmg', 'dotTurnsMult', 'holyDmg', 'openInferno', 'rageDouble', 'rageTurnsAdd', 'multiHitsAdd', 'spiritArrow'] },
  { id: 'surv', icon: '🛡', title: '생존', color: '#6aa6e0', keys: ['dmgReduce', 'tauntReduce', 'shieldReduce', 'lifesteal', 'rageLifesteal', 'thornsPct', 'startShieldPct', 'skillShield', 'overhealShield', 'regenPct', 'dodgeHeal', 'emergencyHeal', 'revive', 'guts', 'blessMult', 'blessTurns'] },
  { id: 'skill', icon: '⏱', title: '스킬', color: '#9cc4e4', keys: ['cdr', 'resetEvery'] },
  { id: 'gain', icon: '💰', title: '획득', color: '#8fe08a', keys: ['famPct', 'expPct', 'goldPct', 'dropPct'] },
];
function DetailStats({ d, cid, onPick }) {
  const show = (k) => d[k] || (k === 'counterPct' && cid === 'wanderer') || k === 'critMult';
  const byKey = Object.fromEntries(DETAIL_STATS.map(r => [r[0], r]));
  const groups = DETAIL_GROUPS.map(g => ({ ...g, rows: g.keys.filter(k => byKey[k] && show(k)).map(k => byKey[k]) })).filter(g => g.rows.length);
  // 1.247.0 — 본편 스타일: 스킬·획득은 한 구획으로
  const merged = [];
  for (const g of groups) {
    const last = merged[merged.length - 1];
    if ((g.id === 'gain' || g.id === 'skill') && last && (last.id === 'skill' || last.id === 'gain')) last.rows.push(...g.rows.map(r => [...r, g.id]));
    else merged.push({ ...g, title: g.id === 'skill' || g.id === 'gain' ? '스킬 · 획득' : g.title, rows: g.rows.map(r => [...r, g.id]) });
  }
  return (
    <>
      {merged.map(g => (
        <div key={g.id} style={{ borderTop: `1px solid ${MS.line}`, marginTop: 6, paddingTop: 2 }}>
          <MainSecHead title={g.title.split('').join(' ')} />
          <MainKvGrid onPick={onPick} rows={g.rows.map(([k, label, f, gid]) => ({ key: k, label, value: detailValue(d[k] || 0, f, k, gid), color: detailColor(k, gid), desc: DETAIL_DESC[k] }))} />
        </div>
      ))}
    </>
  );
}

// ===== 본편 정보창 스타일 (1.247.0 — PM 「트와일라잇 UI가 더 깔끔, 본편 참고」 시안 ⑪⑫ 승인) =====
const MS = { line: 'rgba(196,69,61,0.38)', strong: 'rgba(196,69,61,0.7)', red: '#e0574c', box: '#231014', gold: '#e8b04a', blue: '#7fa8d8', green: '#8fd08a', violet: '#b48cf0' };
const CLASS_PATH = { wanderer: 'SWORD PATH', sage: 'ARCANE PATH', demonblood: 'BLOOD PATH', elf: 'SPIRIT PATH', priest: 'DAWN PATH' };
function MainSecHead({ title, right }) {
  return (
    <div className="flex items-center justify-between" style={{ marginTop: 6, marginBottom: 2 }}>
      <span style={{ fontSize: 12, letterSpacing: 4, color: PALETTE.textDim }}>— {title} —</span>
      {right}
    </div>
  );
}
function MainKvGrid({ rows, onPick }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 14 }}>
      {rows.map(r => (
        <button key={r.key} onClick={() => onPick(r)} className="ui-press flex items-baseline justify-between gap-1 text-left" style={{ background: 'transparent', border: 'none', padding: '5px 0', minWidth: 0 }}>
          <span className="truncate" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{r.label} <span style={{ fontSize: 10, opacity: 0.7 }}>◇</span></span>
          <span className="flex-none" style={{ fontSize: 13.5, fontWeight: 800, color: r.color || PALETTE.text }}>{r.value}</span>
        </button>
      ))}
    </div>
  );
}
// 본편 카드 정보 모달 — 붉은 테두리 · 작은 머리말 + 큰 이름 · 닫기
function MainModal({ kicker, title, badge, color = MS.red, onClose, children, footer, img, sub }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 45, background: 'rgba(0,0,0,0.72)', padding: 16 }} onClick={onClose}>
      <div className="ui-screen-enter w-full flex flex-col" style={{ maxWidth: 420, maxHeight: '86%', borderRadius: 4, border: `2px solid ${color}`, background: '#150a0d', boxShadow: `0 0 28px ${color}55` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2" style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${MS.line}` }}>
          <div className="flex gap-2.5 min-w-0">
            {img && <img src={img} alt="" className="flex-none object-cover" style={{ width: 62, height: 62, border: `1.5px solid ${color}` }} />}
            <div className="min-w-0">
              <div style={{ fontSize: 11, letterSpacing: 4, color: PALETTE.textDim }}>◆ {kicker}</div>
              <div className="font-bold" style={{ fontSize: 21, color, lineHeight: 1.25 }}>{title}</div>
              {sub && <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{sub}</div>}
            </div>
          </div>
          {badge && <span className="flex-none" style={{ fontSize: 12, padding: '3px 9px', border: `1px solid ${color}`, color }}>{badge}</span>}
        </div>
        <div className="overflow-y-auto" style={{ padding: '12px 14px' }}>{children}</div>
        <div className="flex flex-col gap-2" style={{ padding: '0 14px 14px' }}>
          {footer}
          <button onClick={onClose} className="ui-press" style={{ height: 40, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.textDim, letterSpacing: 6, fontSize: 13 }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
function MainCell({ label, value, color }) {
  return (
    <div className="flex items-baseline justify-between gap-1" style={{ padding: '7px 9px', border: `1px solid ${MS.line}`, background: MS.box }}>
      <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{label}</span>
      <span className="text-right" style={{ fontSize: 13, fontWeight: 800, color: color || PALETTE.text }}>{value}</span>
    </div>
  );
}
const COMBAT_DESC = {
  hp: '최대 체력. 체력 능력치·장비·특성·사역마 보유 효과·원정대 버프를 합산한다.',
  atk: '모든 공격·스킬 피해의 기준. 주 능력치(힘·지능·민첩)와 무기가 가장 크게 올린다.',
  def: '받는 피해를 줄인다. 체력 능력치와 방어구가 올린다.',
  spd: '행동 순서. 높을수록 라운드에서 먼저 행동한다.',
  crit: '치명타 확률. 치명타는 「치명 피해」 배율만큼 세게 들어간다.',
  dodge: '적 공격을 완전히 피할 확률.',
  heal: '회복·보호막 스킬의 기준 수치 (사제).',
};
const DETAIL_DESC = {
  critMult: '치명타가 들어갈 때 평소 피해의 몇 %로 들어가는지.', counterPct: '공격을 받거나 피했을 때 바로 되받아칠 확률 (방랑검사).',
  dmgReduce: '적에게 받는 피해를 이 비율만큼 줄인다.', lifesteal: '준 피해의 이 비율만큼 HP를 회복한다.', armorPen: '적 방어의 이 비율을 무시한다.',
  skillDmg: '스킬로 주는 피해가 이만큼 늘어난다.', dotDmg: '화상·출혈 같은 지속 피해가 이만큼 늘어난다.', regenPct: '매 턴 최대 HP의 이 비율만큼 회복한다.',
  cdr: '모든 스킬의 재사용 대기를 줄인다. 스킬별 단축과 합쳐 최대 2턴.', rageDouble: '광폭화가 켜진 동안 모든 공격이 2번 들어간다.',
  rageTurnsAdd: '광폭화가 이 턴만큼 더 오래 유지된다 (광기의 낙인).', rageLifesteal: '광폭화가 켜진 동안 흡혈량이 2배가 된다 (광기의 낙인).',
  openInferno: '전투 시작 순간 적 전체에 거는 화상. 스킬 「겁화」와 별개로, 턴을 쓰지 않고 쿨타임과도 무관하다. 피해 = 매 턴 공격력 × 이 비율 × (1 + 지속 피해 %) · 3턴(지속 시간 배율 적용). 출처: 이프리트의 계약서 60% + 특성 「선제 화염」 1점당 4%.',
  expPct: '전투 경험치가 이만큼 늘어난다.', goldPct: '전투 골드가 이만큼 늘어난다.', dropPct: '장비가 떨어질 확률이 이만큼 늘어난다.',
};
const DETAIL_GREEN = ['regenPct', 'dodgeHeal', 'emergencyHeal', 'revive', 'guts', 'lifesteal', 'rageLifesteal', 'overhealShield', 'blessMult', 'blessTurns'];
const DETAIL_GOLD = ['critMult', 'counterPct', 'counterDmg', 'counterDouble', 'critAfterCounter', 'firstCrit', 'chain', 'multiHitsAdd', 'spiritArrow'];
const detailColor = (k, gid) => (gid === 'gain' ? MS.gold : gid === 'skill' ? MS.violet : DETAIL_GREEN.includes(k) ? MS.green : gid === 'surv' ? MS.blue : DETAIL_GOLD.includes(k) ? MS.gold : MS.red);
const detailValue = (v, f, k, gid) => {
  const t = fmtDetail(v, f);
  if (k === 'cdr') return `-${v}턴`;
  return f === 'pct' && (gid === 'atk' || gid === 'gain') && v > 0 ? `+${t}` : t;
};
const SKILL_KIND_SHORT = { strike: '단일', multi: '연속', aoe: '광역', dot: '지속', lifesteal: '흡혈', heal: '회복', healAll: '전체 회복', shield: '보호막', buffAtk: '강화', rage: '강화', taunt: '도발', executeStrike: '처형', breakStrike: '방어 파괴', weakStrike: '약화', markStrike: '표식', healShield: '회복', healBuff: '회복', hot: '지속 회복' };
function MainSkillCard({ s, lv, u, d, can, onClick }) {
  const locked = s.reqLv > u.lv;
  const w = cdWait(s, d); const cdr = cdOf(s, d);
  return (
    <button onClick={onClick} className="ui-press relative text-left" style={{ padding: '8px 9px', borderRadius: 12, border: `1px solid ${lv ? MS.strong : MS.line}`, background: MS.box, opacity: locked ? 0.45 : 1, minWidth: 0 }}>
      {can && <span className="absolute" style={{ top: 5, right: 7, fontSize: 11, fontWeight: 800, color: MS.gold }}>＋</span>}
      <div className="truncate font-bold" style={{ fontSize: 13.5, color: lv ? PALETTE.text : PALETTE.textDim }}>{s.branch ? <span style={{ color: REBIRTH_BRANCHES[s.branch].color }}>✦</span> : null}{s.name}</div>
      <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>
        {locked ? `Lv.${s.reqLv}부터` : <>{SKILL_KIND_SHORT[s.kind] || '스킬'} · <span style={{ color: cdr ? '#7fd1c8' : PALETTE.textDim }}>⏱{s.cd ? (w ? `${w}턴` : '매 턴') : '매 턴'}</span></>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: lv ? MS.gold : PALETTE.textDim }}>{lv ? <>Lv.{lv}{lv >= SKILL_MAX_LV ? <span style={{ fontSize: 10.5, marginLeft: 4, color: MS.red }}>MAX</span> : <span style={{ fontSize: 10.5, fontWeight: 400, color: PALETTE.textDim }}> / {SKILL_MAX_LV}</span>}</> : '미습득'}</div>
    </button>
  );
}
function MainPassiveCard({ s, lv, u, can, onClick }) {
  const locked = s.reqLv > u.lv;
  return (
    <button onClick={onClick} className="ui-press w-full text-left" style={{ padding: '9px 12px', borderRadius: 12, border: `1px solid ${lv ? MS.strong : MS.line}`, background: MS.box, opacity: locked ? 0.45 : 1 }}>
      <div className="flex items-center gap-2">
        <span className="font-bold truncate" style={{ fontSize: 14, color: lv ? MS.red : PALETTE.textDim }}>{s.branch ? <span style={{ color: REBIRTH_BRANCHES[s.branch].color }}>✦ </span> : null}{s.name}</span>
        <span className="flex-none" style={{ fontSize: 11, padding: '1px 7px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', color: PALETTE.textDim }}>{locked ? `Lv.${s.reqLv}부터` : `Lv.${lv} / ${SKILL_MAX_LV}`}</span>
        {can && <span className="ml-auto" style={{ fontSize: 12, fontWeight: 800, color: MS.gold }}>＋</span>}
      </div>
      <div className="mt-1.5" style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ width: `${(lv / SKILL_MAX_LV) * 100}%`, height: '100%', background: MS.red }} />
      </div>
    </button>
  );
}
function MainSkillModal({ s, lv, u, d, sp, can, onLearn, onClose }) {
  const cur = Math.max(1, lv);
  const pw = skillPower(s, cur);
  const w = cdWait(s, d); const cdr = cdOf(s, d);
  const all = d?.cdr || 0; const own = d?.skillCdr?.[s.id] || 0;
  const passive = s.kind === 'passive';
  const locked = s.reqLv > u.lv;
  const color = s.branch ? REBIRTH_BRANCHES[s.branch].color : MS.red;
  return (
    <MainModal kicker={passive ? '패 시 브' : s.branch ? '전 승 스 킬' : '액 티 브 스 킬'} title={s.name} color={color} badge={lv ? `Lv.${lv}` : locked ? `Lv.${s.reqLv}부터` : '미습득'} onClose={onClose}
      footer={!locked && lv < SKILL_MAX_LV && (
        <button disabled={!can} onClick={onLearn} className="ui-press" style={{ height: 42, border: `1px solid ${can ? MS.gold : MS.line}`, background: can ? 'rgba(232,176,74,0.12)' : 'transparent', color: can ? MS.gold : PALETTE.textDim, fontSize: 13.5, fontWeight: 800, opacity: can ? 1 : 0.6 }}>
          {lv ? `강화 → Lv.${lv + 1}` : '배우기'} <span style={{ fontSize: 11.5, fontWeight: 400 }}>(스킬 포인트 1 · 보유 {sp})</span>
        </button>
      )}>
      <div style={{ fontSize: 13, color: PALETTE.text, lineHeight: 1.55 }}><HiNum text={describeSkill(s, cur)} /></div>
      <div className="grid gap-1.5 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MainCell label="위력" value={pw != null ? `${pw}%` : '상시'} />
        <MainCell label="대상" value={skillTarget(s)} />
        <MainCell label="재사용" value={passive ? '—' : !s.cd ? '매 턴' : cdr ? `${s.cd} → ${w ? `${w}턴` : '매 턴'}` : `${s.cd}턴`} color={cdr ? '#7fd1c8' : null} />
        <MainCell label="종류" value={SKILL_KIND_LABEL[s.kind] || '스킬'} />
      </div>
      <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5, color: PALETTE.text }}>
        <b style={{ color }}>◇ 발동</b> {SKILL_WHEN_TEXT[s.kind] || '다른 조건이 맞지 않을 때 — 준비된 단일 공격 중 위력이 가장 높은 것'}
      </div>
      {pw != null && (
        <div className="mt-2" style={{ fontSize: 12.5, color: PALETTE.textDim, lineHeight: 1.7 }}>
          {[1, 2, 3, 4, 5].map(l => (
            <div key={l} style={{ color: lv === l ? PALETTE.text : PALETTE.textDim, fontWeight: lv === l ? 700 : 400 }}>
              ◇ <b style={{ color }}>Lv.{l}</b> {skillPower(s, l)}%{lv === l ? ' ◀ 지금' : ''}
            </div>
          ))}
        </div>
      )}
      {passive && lv > 0 && <div className="mt-2" style={{ fontSize: 12, color: PALETTE.textDim }}>◇ 다음 레벨: {lv < SKILL_MAX_LV ? describeSkill(s, lv + 1) : '최대 레벨'}</div>}
      {!passive && s.cd > 0 && (
        <div className="mt-1" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>
          ◇ 재사용 {s.cd}턴{all ? ` · 모든 스킬 -${all} (유니크·특성)` : ''}{own ? ` · 이 스킬 전용 -${own} (장비 옵션)` : ''}{cdr && cdr < all + own ? ` · 합계 상한 ${E.CDR_CAP}턴` : ''} → 쓴 뒤 내 차례 {w}번은 못 쓴다
        </div>
      )}
    </MainModal>
  );
}

// ===== 오프라인 보상 (1.233.0) =====
function OfflineSheet({ pd, onClaim }) {
  return (
    <BottomSheet title="🌙 자리를 비운 사이" onClose={onClaim} maxHeight="60%">
      <div className="text-center" style={{ fontSize: 12.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
        <b style={{ color: PALETTE.text }}>{iga(chronicleClass(pd.hero).name)}</b> <b style={{ color: PALETTE.text }}>{pd.place}</b>에서 {O.fmtAway(pd.ms)} 동안 사냥했다
        <div style={{ fontSize: 11 }}>최대 {O.OFFLINE.maxMs / 3600000}시간 · 접속 중 ×1 효율의 {Math.round(O.OFFLINE.eff * 100)}% · 승률 {Math.round(pd.winRate * 100)}% 반영</div>
      </div>
      <div className="mt-3 flex flex-col gap-1 text-center" style={{ fontSize: 14, color: PALETTE.text }}>
        <div>🪙 <b style={{ color: PALETTE.legendary }}>+<CountUp v={pd.gold} /></b> · ✦ <b>+{pd.essence}</b></div>
      </div>
      <UIButton style={{ height: 44, marginTop: 14 }} onClick={onClaim}>받기</UIButton>
    </BottomSheet>
  );
}

// ===== 일일 임무 (1.233.0) =====
function DailyView({ acc, onBack, onClaim, onBonus }) {
  const st = D.dailyState(acc);
  const allClaimed = D.bonusReady(acc);
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="📅 일일 임무" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <div style={{ fontSize: 12, color: PALETTE.textDim }}>매일 KST 0시 초기화 · 어느 캐릭터로 해도 진행된다</div>
        {D.DAILY_MISSIONS.map(m => {
          const ms = D.missionState(acc, m);
          return (
            <GlassPanel key={m.id} className="p-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: 13, color: ms.status === 'claimed' ? PALETTE.textDim : PALETTE.text }}>{m.title}</div>
                  <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{D.dailyRewardText(m.reward)}</div>
                  <div className="mt-1"><Bar v={ms.cur} max={m.need} color={ms.status === 'progress' ? '#9cc4e4' : PALETTE.legendary} h={4} /></div>
                </div>
                {ms.status === 'done' ? <button onClick={() => onClaim(m.id)} className="ui-press flex-none font-semibold" style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${PALETTE.legendary}`, color: '#1a1206', background: PALETTE.legendary, fontSize: 12.5 }}>받기</button>
                  : <span className="flex-none" style={{ fontSize: 12, color: ms.status === 'claimed' ? '#8fe08a' : PALETTE.textDim }}>{ms.status === 'claimed' ? '✔ 완료' : `${ms.cur}/${m.need}`}</span>}
              </div>
            </GlassPanel>
          );
        })}
        <GlassPanel className="p-3" style={{ border: `1px solid ${allClaimed && !st.bonus ? PALETTE.legendary : 'var(--ui-line)'}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>🎁</span>
            <div className="flex-1">
              <div className="font-semibold" style={{ fontSize: 13, color: PALETTE.text }}>오늘의 임무 모두 완료</div>
              <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{D.dailyRewardText(D.DAILY_BONUS.reward)}</div>
            </div>
            {st.bonus ? <span style={{ fontSize: 12, color: '#8fe08a' }}>✔ 완료</span>
              : <button disabled={!allClaimed} onClick={onBonus} className="ui-press flex-none font-semibold" style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${PALETTE.legendary}`, color: allClaimed ? '#1a1206' : PALETTE.textDim, background: allClaimed ? PALETTE.legendary : 'transparent', fontSize: 12.5, opacity: allClaimed ? 1 : 0.5 }}>받기</button>}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

// ===== 확인 창 (1.232.1) — 되돌릴 수 없는 동작 앞에 =====
function ConfirmSheet({ title, lines = [], confirmLabel = '진행', danger = false, onConfirm, onCancel, skipLabel, onSkipChange, skip }) {
  return (
    <BottomSheet title={title} onClose={onCancel} maxHeight="60%">
      <div className="flex flex-col gap-1.5" style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.55 }}>
        {lines.map((l, i) => <div key={i} style={{ color: l.color || PALETTE.text }}>{l.t ?? l}</div>)}
      </div>
      {skipLabel && (
        <label className="flex items-center gap-2 mt-3" style={{ fontSize: 12, color: PALETTE.textDim }}>
          <input type="checkbox" checked={!!skip} onChange={(e) => onSkipChange(e.target.checked)} /> {skipLabel}
        </label>
      )}
      <div className="flex gap-2 mt-4">
        <UIButton variant="ghost" style={{ height: 42 }} onClick={onCancel}>취소</UIButton>
        <UIButton style={{ height: 42, background: danger ? '#b8443a' : undefined }} onClick={onConfirm}>{confirmLabel}</UIButton>
      </div>
    </BottomSheet>
  );
}
// 대장간 위험 경고 「이번 접속 동안 묻지 않기」 — 새로고침하면 다시 묻는다
let forgeConfirmSkip = false;

// ===== 효율 미리보기 (1.232.0) — 바꾸기 전에 같은 적 200전씩 계산해 비교 (저장은 안 바뀜) =====
const LAST_HUNT_KEY = 'chronicleLastHunt';
function readLastHunt() { try { return JSON.parse(localStorage.getItem(LAST_HUNT_KEY) || 'null'); } catch { return null; } }
const PREVIEW_ROWS = [
  { k: 'winRate', label: '승률', fmt: (v) => `${Math.round(v * 100)}%`, better: 1 },
  { k: 'hpLeft', label: '남는 HP (승리 시)', fmt: (v) => `${Math.round(v * 100)}%`, better: 1 },
  { k: 'secPerBattle', label: '전투 1회 시간', fmt: (v) => `${v.toFixed(1)}초`, better: -1 },
  { k: 'expPerMin', label: '⭐ 경험치/분', fmt: (v) => Math.round(v).toLocaleString(), better: 1, pct: true },
  { k: 'goldPerMin', label: '🪙 골드/분', fmt: (v) => Math.round(v).toLocaleString(), better: 1, pct: true },
];
function PreviewSheet({ save, after, title, onClose }) {
  const target = useMemo(() => P.previewTarget(save, readLastHunt()), [save]);
  const speed = readSpeedPref(E.boostLeftMs(save));
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!target) return undefined;
    setRes(null);
    const t = setTimeout(() => setRes(P.previewCompare(save, after, target, { speed })), 30);
    return () => clearTimeout(t);
  }, [save, after, target, speed]);
  const same = after === save;
  const delta = (row) => {
    const a = res.before[row.k], b = res.after[row.k];
    const d = b - a;
    const noise = row.pct ? Math.abs(a) * 0.03 : row.k === 'secPerBattle' ? 0.05 : 0.01;
    if (Math.abs(d) <= noise) return { mark: '=', color: PALETTE.textDim, txt: '' };
    const good = d * row.better > 0;
    return { mark: good ? '▲' : '▼', color: good ? '#8fe08a' : '#e06a5f', txt: row.pct && a ? ` ${d > 0 ? '+' : ''}${Math.round(d / a * 100)}%` : '' };
  };
  const verdict = res && (() => {
    const e = res.after.expPerMin - res.before.expPerMin;
    const w = res.after.winRate - res.before.winRate;
    if (res.after.winRate < 0.9 && w < -0.005) return { t: '⚠ 패배가 늘어납니다 — 반복 사냥이 끊길 수 있어요', c: '#e06a5f' };
    if (Math.abs(e) <= Math.abs(res.before.expPerMin) * 0.03 && Math.abs(w) <= 0.005) return { t: '효율 차이가 거의 없습니다', c: PALETTE.textDim };
    return e > 0 ? { t: `✔ 바꾸면 사냥 효율이 오릅니다 (경험치/분 +${Math.round(e / Math.max(1, res.before.expPerMin) * 100)}%)`, c: '#8fe08a' } : { t: `✖ 지금이 더 효율적입니다 (경험치/분 ${Math.round(e / Math.max(1, res.before.expPerMin) * 100)}%)`, c: '#e06a5f' };
  })();
  return (
    <BottomSheet title="📊 효율 미리보기" onClose={onClose} maxHeight="80%">
      <div className="text-center font-semibold" style={{ fontSize: 13, color: PALETTE.text }}>{title}</div>
      {target && <div className="text-center" style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: 2 }}>📍 {target.field.name} {target.stage + 1} {target.fromLast ? '(마지막 사냥)' : '(열린 최고 스테이지)'} · 같은 적 {P.PREVIEW.battles}전씩 · ×{speed} 재생 기준</div>}
      {!target && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>비교할 사냥터가 없습니다</div>}
      {target && same && <div className="text-center py-6" style={{ fontSize: 12.5, color: PALETTE.textDim }}>지금과 같은 상태라 비교할 것이 없습니다</div>}
      {target && !same && !res && <div className="text-center py-8" style={{ fontSize: 12.5, color: PALETTE.textDim }}>계산 중…</div>}
      {target && !same && res && (
        <>
          <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', columnGap: 10, rowGap: 5, fontSize: 12.5, color: PALETTE.text, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: PALETTE.textDim }}>항목</span>
            <span style={{ fontSize: 11, color: PALETTE.textDim, textAlign: 'right' }}>지금</span>
            <span style={{ fontSize: 11, color: PALETTE.legendary, textAlign: 'right' }}>바꾸면</span>
            <span />
            {PREVIEW_ROWS.map(row => {
              const d = delta(row);
              return (
                <React.Fragment key={row.k}>
                  <span>{row.label}</span>
                  <span style={{ textAlign: 'right', color: PALETTE.textDim }}>{row.fmt(res.before[row.k])}</span>
                  <b style={{ textAlign: 'right' }}>{row.fmt(res.after[row.k])}</b>
                  <span style={{ color: d.color, fontSize: 12, whiteSpace: 'nowrap' }}>{d.mark}{d.txt}</span>
                </React.Fragment>
              );
            })}
          </div>
          {verdict && <div className="text-center mt-3 font-semibold" style={{ fontSize: 13, color: verdict.c }}>{verdict.t}</div>}
          <div className="mt-2" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.5 }}>※ 저장은 바뀌지 않습니다 · 보상은 운이라 ±3% 정도 흔들림(이 범위는 「=」로 표시) · 사냥터 일반 전투 기준 (던전·탑·보스 제외)</div>
        </>
      )}
      <UIButton variant="ghost" style={{ height: 40, marginTop: 12 }} onClick={onClose}>닫기</UIButton>
    </BottomSheet>
  );
}

// ===== 반복 사냥 보고서 (1.213.0) =====
// 전투 1회 재생 시간은 preview.js battlePlayMs (효율 미리보기와 같은 공식)
const battlePlayMs = P.battlePlayMs;
function readSpeedPref(boostLeft) {
  let s = 2;
  try { s = +localStorage.getItem('chronicleSpeed') || 2; } catch { /* */ }
  return s === 4 && boostLeft <= 0 ? 2 : s;
}
function huntRecord(sim, party, enc, summary, speed = 2, label = '') {
  const dmg = E.battleDamageStats(sim, party);
  const salv = {};
  for (const src of [summary.autoSalvage, summary.dismantleLoot]) for (const [k, v] of Object.entries(src || {})) salv[k] = (salv[k] || 0) + v;
  const hero = party.find(p => !p.fam);
  const fam = party.find(p => p.fam);
  const units = {};
  for (const p of party) units[p.id] = { id: p.id, name: p.name, fam: !!p.fam, famKey: p.famKey, classId: p.classId, dmg: dmg.byUnit[p.id] || 0, heal: dmg.healBy[p.id] || 0, shield: dmg.shieldBy[p.id] || 0, taken: dmg.takenBy[p.id] || 0 };
  return {
    win: sim.result === 'win', type: enc.type, rounds: dmg.rounds,
    kills: sim.result === 'win' ? enc.enemies.reduce((m, e) => ({ ...m, [e.tier]: (m[e.tier] || 0) + 1 }), {}) : {},
    units, skills: dmg.bySkill, detail: E.battleDetailStats(sim, party),
    exp: summary.exp || 0, gold: summary.gold || 0, essence: summary.essence || 0, famShards: summary.famShards || 0, famSouls: summary.famSouls || 0, talentScroll: summary.talentScroll || 0,
    shard: summary.shard || 0, keys: summary.keys || 0, famExp: summary.famExp?.gained || 0, salv,
    salvaged: (summary.autoSalvaged || 0) + (summary.autoDismantled || 0),
    items: (summary.items || []).map(i => i.grade), levelUps: Object.keys(summary.levelUps || {}).length,
    ms: battlePlayMs(sim, speed), speed, label,
    setup: { classId: hero?.classId, lv: hero?.lv, famKey: fam?.famKey || null, famName: fam?.name || null },
  };
}
function newHuntStats() {
  return { battles: 0, wins: 0, losses: 0, rounds: 0, types: {}, kills: {}, units: {}, skills: {}, detail: { units: {}, skills: {} }, exp: 0, gold: 0, essence: 0, famShards: 0, talentScroll: 0, shard: 0, keys: 0, famExp: 0, salv: {}, salvaged: 0, items: {}, levelUps: 0, ms: 0, speeds: {}, places: {}, setup: null, startedAt: Date.now() };
}
function addHuntRecord(st, r) {
  st.battles += 1; if (r.win) st.wins += 1; else st.losses += 1;
  st.rounds += r.rounds;
  st.types[r.type] = (st.types[r.type] || 0) + 1;
  for (const [k, v] of Object.entries(r.kills)) st.kills[k] = (st.kills[k] || 0) + v;
  for (const u of Object.values(r.units)) {
    const key = u.fam ? `fam:${u.famKey}` : u.id;
    const cur = st.units[key] || { ...u, dmg: 0, heal: 0, shield: 0, taken: 0, rounds: 0 };
    cur.dmg += u.dmg; cur.heal = (cur.heal || 0) + (u.heal || 0); cur.shield = (cur.shield || 0) + (u.shield || 0); cur.taken = (cur.taken || 0) + (u.taken || 0); cur.rounds += r.rounds;
    st.units[key] = cur;
  }
  // 상세 통계 (1.238.0) — 유닛 키를 사역마 종류 기준(fam:키)으로 바꿔 합친다
  if (r.detail) {
    const ukey = (id) => { const u = r.units[id]; return u?.fam ? `fam:${u.famKey}` : id; };
    const d = {
      units: Object.fromEntries(Object.entries(r.detail.units).map(([id, v]) => [ukey(id), v])),
      skills: Object.fromEntries(Object.entries(r.detail.skills).map(([k, v]) => { const [id, sn] = k.split('|'); return [`${ukey(id)}|${sn}`, v]; })),
    };
    st.detail = E.mergeDetailStats(st.detail, d);
  }
  for (const [k, v] of Object.entries(r.skills)) {
    const [id, sn] = k.split('|');
    const u = r.units[id];
    const key = `${u?.fam ? `fam:${u.famKey}` : id}|${sn}`;
    st.skills[key] = (st.skills[key] || 0) + v;
  }
  st.exp += r.exp; st.gold += r.gold; st.essence += r.essence; st.famShards += r.famShards; st.famSouls = (st.famSouls || 0) + (r.famSouls || 0); st.talentScroll = (st.talentScroll || 0) + (r.talentScroll || 0); st.levelUps += r.levelUps;
  st.shard = (st.shard || 0) + (r.shard || 0); st.keys = (st.keys || 0) + (r.keys || 0); st.famExp = (st.famExp || 0) + (r.famExp || 0); st.salvaged = (st.salvaged || 0) + (r.salvaged || 0);
  st.salv = st.salv || {}; for (const [k, v] of Object.entries(r.salv || {})) st.salv[k] = (st.salv[k] || 0) + v;
  st.ms = (st.ms || 0) + (r.ms || 0);
  st.speeds = st.speeds || {}; if (r.speed) st.speeds[r.speed] = (st.speeds[r.speed] || 0) + 1;
  st.places = st.places || {}; if (r.label) st.places[r.label] = (st.places[r.label] || 0) + 1;
  if (r.setup) st.setup = r.setup;
  for (const g of r.items) st.items[g] = (st.items[g] || 0) + 1;
}
const TIER_LABEL = { normal: '일반 몹', elite: '강적', boss: '보스' };
function HuntReport({ report: r, onClose, title = '📊 사냥 보고서' }) {
  const units = Object.entries(r.units).map(([key, u]) => ({ key, ...u })).sort((a, b) => b.dmg - a.dmg);
  const total = units.reduce((t, u) => t + u.dmg, 0) || 1;
  // 적 공격 분담 (1.239.2) — 상세 통계의 「공격받은 횟수」 비율
  const dUnits = r.detail?.units || {};
  const tAll = Object.values(dUnits).reduce((t, x) => t + (x.targeted || 0), 0);
  const atkShare = (k) => (Object.keys(dUnits).length > 1 && tAll && dUnits[k]?.targeted ? pctTxt(dUnits[k].targeted, tAll) : null);
  const skills = Object.entries(r.skills).map(([k, v]) => { const [uk, sn] = k.split('|'); return { uk, sn, v }; }).sort((a, b) => b.v - a.v).slice(0, 6);
  const ms = r.ms || Math.max(60000, (r.endedAt || Date.now()) - r.startedAt);
  const [effOpen, setEffOpen] = useState(false);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('chronicleReportTab') || 'sum'; } catch { return 'sum'; } });
  const pickTab = (t) => { setTab(t); try { localStorage.setItem('chronicleReportTab', t); } catch { /* */ } };
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: PALETTE.text, padding: '3px 0' };
  const hasDetail = !!r.detail && Object.keys(r.detail.units || {}).length > 0;
  return (
    <BottomSheet title={title} onClose={onClose} maxHeight="85%">
      {hasDetail && <div className="flex gap-1.5 mb-3">
        {[['sum', '📊 요약'], ['detail', '📈 상세 통계']].map(([id, label]) => (
          <button key={id} onClick={() => pickTab(id)} className="ui-press flex-1" style={{ height: 36, borderRadius: 10, fontSize: 13, fontWeight: 600, border: `1px solid ${tab === id ? PALETTE.legendary : 'var(--ui-line)'}`, color: tab === id ? PALETTE.legendary : PALETTE.textDim, background: tab === id ? 'rgba(232,176,74,0.1)' : 'transparent' }}>{label}</button>
        ))}
      </div>}
      {hasDetail && tab === 'detail' ? <DetailReport r={r} onClose={onClose} /> : <div className="flex flex-col gap-3">
        <GlassPanel className="p-3">
          <div className="font-semibold mb-1" style={{ fontSize: 13, color: PALETTE.legendary }}>
            {r.battles === 1 ? <>{r.wins ? '승리' : '패배'} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>· {r.rounds}라운드 · {fmtDur(ms)}</span></> : <>전투 {r.battles}회 · 승리 {r.wins} · 패배 {r.losses} <span style={{ color: PALETTE.textDim, fontWeight: 400 }}>· {r.rounds}라운드 · {fmtDur(ms)}</span></>}
          </div>
          {['normal', 'elite', 'boss'].filter(t => r.kills[t]).map(t => <div key={t} style={row}><span>{TIER_LABEL[t]} 처치</span><b>{r.kills[t]}마리</b></div>)}
          {r.types.gate ? <div style={row}><span>관문 전투</span><b>{r.types.gate}회</b></div> : null}
          <SetupLine r={r} />
        </GlassPanel>
        <GlassPanel className="p-3">
          <div className="font-semibold mb-2" style={{ fontSize: 13, color: PALETTE.text }}>기여도 · 피해(DPS) 순위 + 회복 · 보호막 · 받아낸 피해</div>
          {units.map((u, i) => {
            const pct = Math.round(u.dmg / total * 100);
            const dps = Math.round(u.dmg / Math.max(1, u.rounds));
            return (
              <div key={u.key} className="flex items-center gap-2 mb-2">
                <span style={{ width: 18, fontSize: 13, fontWeight: 700, color: i === 0 ? PALETTE.legendary : PALETTE.textDim }}>{i + 1}</span>
                <UnitIcon u={u} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between" style={{ fontSize: 12, color: PALETTE.text }}><span className="truncate">{u.fam ? `🐾 ${u.name}` : u.name}</span><span>{pct}%</span></div>
                  <Bar v={u.dmg} max={total} color={u.fam ? '#d07ae8' : PALETTE.legendary} h={6} />
                  <div style={{ fontSize: 11, color: PALETTE.textDim }}>총 {u.dmg.toLocaleString()} · 라운드당 {dps.toLocaleString()}</div>
                  {(u.heal > 0 || u.shield > 0 || u.taken > 0 || atkShare(u.key)) && <div style={{ fontSize: 11, color: PALETTE.textDim }}>
                    {u.heal > 0 && <span style={{ color: '#8fe08a' }}>✚ 회복 {Math.round(u.heal).toLocaleString()} </span>}
                    {u.shield > 0 && <span style={{ color: '#9cc4e4' }}>◈ 보호막 {Math.round(u.shield).toLocaleString()} </span>}
                    {u.taken > 0 && <span style={{ color: '#e8b04a' }}>🛡 받아낸 피해 {Math.round(u.taken).toLocaleString()}</span>}
                    {atkShare(u.key) ? <span style={{ color: '#e8b04a' }}> · 적 공격의 {atkShare(u.key)} 받음</span> : null}
                  </div>}
                </div>
              </div>
            );
          })}
          {skills.length > 0 && <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.textDim }}>스킬별 피해 상위</div>}
          {skills.map((x, i) => (
            <div key={i} style={{ ...row, fontSize: 12 }}><span>{i + 1}. {x.sn} <span style={{ color: PALETTE.textDim }}>({r.units[x.uk]?.fam ? '사역마' : '주인공'})</span></span><span>{x.v.toLocaleString()} ({Math.round(x.v / total * 100)}%)</span></div>
          ))}
        </GlassPanel>
        {(r.wins > 0 || r.battles > 1) && <GlassPanel className="p-3">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-semibold" style={{ fontSize: 13, color: PALETTE.text }}>획득 · 분당 효율</span>
            <span style={{ fontSize: 11, color: PALETTE.textDim }}>{speedText(r)} 재생 기준</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', columnGap: 10, rowGap: 3, fontSize: 12.5, color: PALETTE.text, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: PALETTE.textDim }}>항목</span>
            <span style={{ fontSize: 11, color: PALETTE.textDim, textAlign: 'right' }}>총량</span>
            <span style={{ fontSize: 11, color: PALETTE.legendary, textAlign: 'right' }}>분당</span>
            <span style={{ fontSize: 11, color: PALETTE.textDim, textAlign: 'right' }}>전투당</span>
            {gainRows(r).map(g => (
              <React.Fragment key={g.k}>
                <span>{g.icon} {g.label}{g.sub ? <span style={{ fontSize: 10.5, color: PALETTE.textDim }}> {g.sub}</span> : null}</span>
                <b style={{ textAlign: 'right' }}>{fmtNum(g.v)}</b>
                <b style={{ textAlign: 'right', color: PALETTE.legendary }}>{fmtNum(g.v * 60000 / ms)}</b>
                <span style={{ textAlign: 'right', color: PALETTE.textDim }}>{fmtNum(g.v / Math.max(1, r.battles))}</span>
              </React.Fragment>
            ))}
          </div>
          {r.levelUps ? <div style={{ ...row, marginTop: 4 }}><span>레벨 업</span><b>▲ {r.levelUps}</b></div> : null}
          <div style={row}><span>장비 (보관)</span><b>{GRADES.filter(g => r.items[g.id]).map(g => <span key={g.id} style={{ color: g.color, marginLeft: 6 }}>{g.label} {r.items[g.id]}</span>)}{!Object.keys(r.items).length && '없음'}</b></div>
          {r.salvaged ? <div style={{ fontSize: 11, color: PALETTE.textDim }}>자동 분해 {r.salvaged}개 — 분해로 얻은 재화는 위 골드·정수·파편에 포함</div> : null}
          <div style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 4, lineHeight: 1.5 }}>분당 = 전투 재생 시간(다음 전투 대기 1.8초 포함) 기준 · 배속이 다르면 분당 값도 달라지므로 비교는 같은 배속끼리 · 전투당 값은 배속과 무관</div>
        </GlassPanel>}
        <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setEffOpen(true)}>📈 효율 기록 비교</UIButton>
        <UIButton onClick={onClose}>확인</UIButton>
      </div>}
      {effOpen && <EfficiencyLog onClose={() => setEffOpen(false)} />}
    </BottomSheet>
  );
}

// ===== 상세 통계 탭 (1.238.0) — engine battleDetailStats 집계를 유닛별·스킬별로 =====
const pctTxt = (a, b) => (b > 0 ? `${Math.round(a / b * 1000) / 10}%` : '-');
function detailSections(d, rounds, share = null) {
  const hitTry = d.landed + d.misses;
  const defTry = d.timesHit + d.dodged;
  return [
    { title: '⚔ 공격', color: PALETTE.legendary, rows: [
      ['총 피해', d.dmg, true], ['라운드당 피해', d.dmg / Math.max(1, rounds), true, 'r'], ['최대 일격', d.maxHit, true, 'x'],
      ['적중', d.landed], ['치명타', d.crits, true, '', `치명률 ${pctTxt(d.crits, d.landed)}`], ['치명타 피해', d.critDmg, false, '', `전체의 ${pctTxt(d.critDmg, d.dmg)}`],
      ['빗나감', d.misses, true, '', `명중률 ${pctTxt(d.landed, hitTry)}`],
      ['반격', d.counters, false, '', d.counterDmg ? `피해 ${fmtNum(d.counterDmg)}` : ''], ['추가타', d.chains, false, '', d.chainDmg ? `피해 ${fmtNum(d.chainDmg)}` : ''],
      ['지속 피해', d.dotDmg], ['신성 피해', d.holyDmg], ['반사 피해', d.reflectDmg], ['처치', d.kills, true],
    ] },
    { title: '🎯 행동', color: '#d0c8b8', rows: [
      ['행동', d.acts, true], ['스킬 사용', d.skillUses, true, '', `스킬 비중 ${pctTxt(d.skillUses, d.acts)}`], ['기본 공격', d.basicUses, true],
      ['강화 부여', d.buffs], ['약화 부여', d.debuffs],
    ] },
    { title: '✚ 지원', color: '#8fe08a', rows: [
      ['회복', d.heal, false, '', d.overheal ? `초과 회복 ${fmtNum(d.overheal)} (낭비 ${pctTxt(d.overheal, d.heal + d.overheal)})` : ''],
      ['지속 회복', d.hotHeal], ['최대 1회 회복', d.maxHeal, false, 'x'], ['보호막 부여', d.shield],
    ] },
    { title: '🛡 방어', color: '#e8b04a', rows: [
      ['공격받은 횟수', d.targeted || 0, true, '', share ? `적 공격의 ${share.atk} · 들어온 피해의 ${share.dmg}` : ''],
      ['들어온 피해', d.incoming ?? d.taken + d.absorbed, true, '', '보호막에 막힌 양 포함'],
      ['HP로 받은 피해', d.taken, true], ['피격', d.timesHit, true, '', '보호막에 전부 막힌 타격 포함'], ['회피', d.dodged, true, '', `회피율 ${pctTxt(d.dodged, defTry)}`],
      ['최대 피격', d.maxTaken, false, 'x'], ['보호막 흡수', d.absorbed, false, '', d.absorbed ? `들어온 피해의 ${pctTxt(d.absorbed, d.absorbed + d.taken)} 막음` : ''],
      ['대신 맞기', d.coverHits, false, '', d.coverDmg ? `피해 ${fmtNum(d.coverDmg)}` : ''], ['지속 피해 받음', d.dotTaken],
      ['받은 회복', d.healRecv], ['받은 보호막', d.shieldRecv], ['쓰러짐', d.deaths, true],
    ] },
  ];
}
function DetailReport({ r, onClose }) {
  const units = Object.entries(r.units).map(([key, u]) => ({ key, ...u })).sort((a, b) => (a.fam ? 1 : 0) - (b.fam ? 1 : 0));
  const [sel, setSel] = useState(units[0]?.key);
  const u = units.find(x => x.key === sel) || units[0];
  const d = r.detail.units[u?.key];
  const n = Math.max(1, r.battles);
  const rounds = u?.rounds || r.rounds || 1;
  const skills = Object.entries(r.detail.skills)
    .filter(([k]) => k.split('|')[0] === u?.key)
    .map(([k, v]) => ({ sn: k.split('|').slice(1).join('|'), ...v }))
    .sort((a, b) => (b.dmg + b.heal + b.shield) - (a.dmg + a.heal + a.shield) || b.uses - a.uses);
  const cell = { fontSize: 12, color: PALETTE.text, textAlign: 'right' };
  const head = { fontSize: 10.5, color: PALETTE.textDim, textAlign: 'right' };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        {units.map(x => (
          <button key={x.key} onClick={() => setSel(x.key)} className="ui-press flex items-center gap-1.5" style={{ height: 40, padding: '0 10px', borderRadius: 10, fontSize: 12.5, border: `1px solid ${x.key === u?.key ? (x.fam ? '#d07ae8' : PALETTE.legendary) : 'var(--ui-line)'}`, color: x.key === u?.key ? PALETTE.text : PALETTE.textDim, background: 'transparent' }}>
            <UnitIcon u={x} size={26} />{x.fam ? `🐾 ${x.name}` : x.name}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: PALETTE.textDim }}>전투 {r.battles}회 · {rounds}라운드 집계{n > 1 ? ' · 오른쪽 칸 = 전투당 평균' : ''}</div>
      {d ? detailSections(d, rounds, (() => {
        // 파티 안 분담 — 탱커 사역마가 실제로 얼마나 맞아 주는지
        const all = Object.values(r.detail.units);
        const tAll = all.reduce((t, x) => t + (x.targeted || 0), 0);
        const iAll = all.reduce((t, x) => t + (x.incoming ?? x.taken + x.absorbed), 0);
        return all.length > 1 && tAll ? { atk: pctTxt(d.targeted || 0, tAll), dmg: pctTxt(d.incoming ?? d.taken + d.absorbed, iAll) } : null;
      })()).map(sec => {
        const rows = sec.rows.filter(([, v, always]) => always || v > 0);
        if (!rows.length) return null;
        return (
          <GlassPanel key={sec.title} className="p-3">
            <div className="font-semibold mb-1.5" style={{ fontSize: 13, color: sec.color }}>{sec.title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 12, rowGap: 3, alignItems: 'baseline' }}>
              {n > 1 && <><span /><span style={head}>합계</span><span style={head}>전투당</span></>}
              {rows.map(([label, v, , kind, note]) => (
                <React.Fragment key={label}>
                  <span style={{ fontSize: 12.5, color: PALETTE.text }}>{label}{note ? <span style={{ fontSize: 10.5, color: PALETTE.textDim }}> · {note}</span> : null}</span>
                  <b style={cell}>{fmtNum(v)}</b>
                  <span style={{ ...cell, color: PALETTE.textDim }}>{kind || n === 1 ? '' : fmtNum(v / n)}</span>
                </React.Fragment>
              ))}
            </div>
          </GlassPanel>
        );
      }) : <GlassPanel className="p-3"><div style={{ fontSize: 12, color: PALETTE.textDim }}>기록 없음</div></GlassPanel>}
      {skills.length > 0 && <GlassPanel className="p-3">
        <div className="font-semibold mb-1.5" style={{ fontSize: 13, color: PALETTE.text }}>✦ 스킬별</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', columnGap: 9, rowGap: 4, alignItems: 'baseline' }}>
          <span style={{ ...head, textAlign: 'left' }}>스킬</span><span style={head}>사용</span><span style={head}>피해</span><span style={head}>1회 평균</span><span style={head}>치명률</span>
          {skills.map(x => {
            const main = x.dmg || x.heal || x.shield;
            const tag = x.dmg ? '' : x.heal ? '✚' : x.shield ? '◈' : '';
            return (
              <React.Fragment key={x.sn}>
                <span style={{ fontSize: 12, color: PALETTE.text }} className="truncate">{x.sn}{(x.dmg && (x.heal || x.shield)) ? <span style={{ fontSize: 10.5, color: '#8fe08a' }}> ✚{fmtNum(x.heal + x.shield)}</span> : null}</span>
                <span style={cell}>{x.uses || '-'}</span>
                <b style={cell}>{main ? `${tag}${fmtNum(main)}` : '-'}</b>
                <span style={{ ...cell, color: PALETTE.textDim }}>{main && x.uses ? fmtNum(main / x.uses) : '-'}</span>
                <span style={{ ...cell, color: PALETTE.textDim }}>{x.hits ? pctTxt(x.crits, x.hits) : '-'}</span>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ fontSize: 10.5, color: PALETTE.textDim, marginTop: 6, lineHeight: 1.5 }}>피해 칸의 ✚ = 회복량 · ◈ = 보호막 (피해 없는 스킬) · 추가타·지속 피해는 스킬 이름 옆에 따로 표시 · 사용 횟수가 없는 줄 = 지속 피해·추가타처럼 다른 행동에서 따라 나온 피해</div>
      </GlassPanel>}
      <UIButton onClick={onClose}>확인</UIButton>
    </div>
  );
}

// ===== 분당 효율 (1.231.3) =====
const fmtNum = (v) => (v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? (Math.round(v * 10) / 10).toLocaleString() : (Math.round(v * 100) / 100).toLocaleString());
function fmtDur(ms) {
  const sec = Math.max(1, Math.round(ms / 1000));
  return sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}
function speedText(r) {
  const sp = Object.entries(r.speeds || {}).sort((a, b) => b[1] - a[1]).map(([k]) => `×${k}`);
  return sp.length ? sp.join('·') : '×2';
}
// 획득 항목 — 골드·정수·파편·조각·사역혼은 자동 분해 재화 포함
function gainRows(r) {
  const sv = r.salv || {};
  const rows = [
    { k: 'exp', icon: '⭐', label: '경험치', v: r.exp || 0 },
    { k: 'gold', icon: '🪙', label: '골드', v: (r.gold || 0) + (sv.gold || 0), sub: sv.gold ? `(분해 ${fmtNum(sv.gold)})` : '' },
    { k: 'essence', icon: '✦', label: '정수', v: (r.essence || 0) + (sv.essence || 0) },
    { k: 'shard', icon: '◆', label: '파편', v: (r.shard || 0) + (sv.shard || 0) },
    { k: 'famShards', icon: '📜', label: '계약서 조각', v: (r.famShards || 0) + (sv.famShard || 0) },
    { k: 'famSoul', icon: '🔮', label: '사역혼', v: (r.famSouls || 0) + (sv.famSoul || 0) },
    { k: 'famExp', icon: '🐾', label: '사역마 경험치', v: r.famExp || 0 },
    { k: 'talentScroll', icon: '📖', label: '특성 주문서', v: r.talentScroll || 0 },
    { k: 'keys', icon: '🗝', label: '던전 열쇠', v: r.keys || 0 },
    { k: 'drops', icon: '⚔', label: '장비 드랍', v: Object.values(r.items || {}).reduce((t, n) => t + n, 0) + (r.salvaged || 0) },
  ];
  return rows.filter(g => g.v > 0 || g.k === 'exp' || g.k === 'gold');
}
function SetupLine({ r }) {
  const su = r.setup;
  if (!su) return null;
  const place = Object.entries(r.places || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: 4, lineHeight: 1.5 }}>
      {su.classId ? <span style={{ color: chronicleClass(su.classId).color }}>{chronicleClass(su.classId).name} Lv.{su.lv}</span> : null}
      {' · '}{su.famName ? `🐾 ${su.famName}` : '사역마 없음'}
      {place ? <> · 📍 {r.kind === 'dungeon' ? placeBase(place) : r.kind === 'tower' ? '황혼의 첨탑' : place}</> : null}
    </div>
  );
}
// 던전 라벨 「금고(전설) 3층」 → 「금고(전설)」
const placeBase = (label) => (label || '').replace(/ (보스|\d+층)$/, '');

// 효율 기록 — 반복 사냥·던전 한 판이 끝날 때마다 기기에 최근 40건 저장 (기기 전용, 계정 저장과 무관)
const EFF_KEY = 'chronicleEffLog';
const EFF_MAX = 40;
function readEffLog() { try { return JSON.parse(localStorage.getItem(EFF_KEY) || '[]'); } catch { return []; } }
function logEfficiency(r) {
  if (!r || r.battles < 2 || !r.ms) return;
  const g = Object.fromEntries(gainRows(r).map(x => [x.k, x.v]));
  const place = Object.entries(r.places || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const entry = {
    at: Date.now(), kind: r.kind, place: r.kind === 'dungeon' ? placeBase(place) : r.kind === 'tower' ? '황혼의 첨탑' : place,
    classId: r.setup?.classId, lv: r.setup?.lv, fam: r.setup?.famName || null,
    battles: r.battles, wins: r.wins, ms: r.ms, speed: speedText(r),
    exp: g.exp || 0, gold: g.gold || 0, essence: g.essence || 0, shard: g.shard || 0, famShards: g.famShards || 0, drops: g.drops || 0,
  };
  try { localStorage.setItem(EFF_KEY, JSON.stringify([entry, ...readEffLog()].slice(0, EFF_MAX))); } catch { /* */ }
}
const EFF_SORTS = [
  { id: 'exp', label: '경험치/분' }, { id: 'gold', label: '골드/분' }, { id: 'essence', label: '정수/분' }, { id: 'drops', label: '장비/분' }, { id: 'at', label: '최근 순' },
];
function EfficiencyLog({ onClose }) {
  const [log, setLog] = useState(readEffLog);
  const [sort, setSort] = useState(() => { try { return localStorage.getItem('chronicleEffSort') || 'exp'; } catch { return 'exp'; } });
  const pickSort = (id) => { setSort(id); try { localStorage.setItem('chronicleEffSort', id); } catch { /* */ } };
  const pm = (e, k) => (e[k] || 0) * 60000 / Math.max(1, e.ms);
  const list = [...log].sort((a, b) => (sort === 'at' ? b.at - a.at : pm(b, sort) - pm(a, sort)));
  const best = sort === 'at' ? null : list[0];
  const clear = () => { try { localStorage.removeItem(EFF_KEY); } catch { /* */ } setLog([]); };
  return (
    <BottomSheet title="📈 효율 기록 비교" onClose={onClose} maxHeight="88%">
      <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.5, marginBottom: 8 }}>
        반복 사냥·던전 한 판·첨탑 도전(2전투 이상)이 끝날 때마다 자동 기록 · 최근 {EFF_MAX}건 · 이 기기에만 저장<br />
        같은 배속끼리 비교하세요 (배속이 2배면 분당 값도 2배)
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {EFF_SORTS.map(o => (
          <button key={o.id} onClick={() => pickSort(o.id)} className="ui-press" style={{ height: 30, padding: '0 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${sort === o.id ? PALETTE.legendary : 'var(--ui-line)'}`, color: sort === o.id ? PALETTE.legendary : PALETTE.textDim, background: 'transparent' }}>{o.label}</button>
        ))}
      </div>
      {!list.length && <div className="text-center py-8" style={{ fontSize: 12.5, color: PALETTE.textDim }}>아직 기록이 없습니다 — 반복 사냥이나 던전을 한 판 돌려 보세요</div>}
      <div className="flex flex-col gap-2">
        {list.map((e, i) => (
          <div key={e.at} style={{ padding: 10, borderRadius: 12, border: `1px solid ${e === best ? PALETTE.legendary + '99' : 'var(--ui-line)'}`, background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex justify-between items-baseline" style={{ fontSize: 12.5, color: PALETTE.text }}>
              <span className="font-semibold truncate">{sort !== 'at' ? `${i + 1}. ` : ''}{e.kind === 'dungeon' ? '🏰 ' : e.kind === 'tower' ? '🗼 ' : '🌾 '}{e.place || '—'}</span>
              <span style={{ fontSize: 11, color: PALETTE.textDim, whiteSpace: 'nowrap', marginLeft: 6 }}>{e.speed} · {fmtDur(e.ms)}</span>
            </div>
            <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>
              {e.classId ? <span style={{ color: chronicleClass(e.classId).color }}>{chronicleClass(e.classId).name} Lv.{e.lv}</span> : null}
              {' · '}{e.fam ? `🐾 ${e.fam}` : '사역마 없음'} · 전투 {e.battles}회 (승 {e.wins})
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1" style={{ fontSize: 11.5 }}>
              {[['exp', '⭐'], ['gold', '🪙'], ['essence', '✦'], ['drops', '⚔']].map(([k, ic]) => (
                <div key={k} style={{ textAlign: 'center', padding: '3px 0', borderRadius: 6, background: sort === k ? 'rgba(232,176,74,0.12)' : 'transparent', color: sort === k ? PALETTE.legendary : PALETTE.text }}>
                  {ic} {fmtNum(pm(e, k))}<div style={{ fontSize: 10, color: PALETTE.textDim }}>/분</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        {log.length > 0 && <UIButton variant="ghost" style={{ height: 40 }} onClick={clear}>기록 지우기</UIButton>}
        <UIButton style={{ height: 40 }} onClick={onClose}>닫기</UIButton>
      </div>
    </BottomSheet>
  );
}
// ×4 배속 이용권 구매 창
function BoostSheet({ save, onClose, onBuy }) {
  const left = E.boostLeftMs(save);
  const c = E.boostCost(save);
  return (
    <BottomSheet title="⏩ ×4 배속 이용권" onClose={onClose} maxHeight="55%">
      <div className="text-center" style={{ fontSize: 12.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
        기본 배속은 ×1 · ×2. 이용권이 있는 동안 전투를 ×4로 볼 수 있다.<br />
        {BOOST.minutes}분 = 🪙 {c.toLocaleString()} (레벨에 따라 가격 상승) · 최대 {BOOST.maxStackMin / 60}시간까지 쌓인다 · 모든 캐릭터 공유
      </div>
      <div className="text-center mt-3 font-semibold" style={{ fontSize: 15, color: left ? PALETTE.legendary : PALETTE.textDim }}>
        {left ? `남은 시간 ${Math.ceil(left / 60000)}분` : '이용권 없음'}
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <UIButton variant="gold" disabled={save.gold < c} onClick={onBuy}>{BOOST.minutes}분 구매 — 🪙 {c.toLocaleString()} (보유 {save.gold.toLocaleString()})</UIButton>
        <UIButton variant="ghost" style={{ height: 40 }} onClick={onClose}>닫기</UIButton>
      </div>
    </BottomSheet>
  );
}

// ===== 메인 =====
export default function ChronicleGame({ onExit }) {
  const [acc, setAcc] = useState(loadAccount);
  const [loadNotice, setLoadNotice] = useState(() => (loadStatus.status === 'restored' || loadStatus.status === 'lost' ? loadStatus : null)); // 1.236.1 깨진 저장 안내
  const save = useMemo(() => A.toView(acc), [acc]);
  const [view, setView] = useState('title');
  const [battle, setBattle] = useState(null);
  const [repeat, setRepeat] = useState(false);
  const [toast, setToast] = useState(null);
  const [scene, setScene] = useState(null); // { scene, replay, after }
  const lastFieldRef = useRef(null);
  const rng = Math.random;
  // 반복 사냥 보고서 (1.213.0)
  const repStatsRef = useRef(null);
  const lastRecRef = useRef(null);
  const [report, setReport] = useState(null);
  // 집계 창 여는 규칙 (1.239.1) — 반복 사냥·자동 진행·던전 한 판·첨탑 도전이 끝나면 집계를 「대기」에 올리고,
  // 전투 재생이 끝나 결과(승리/전멸)가 보인 뒤에 연다. 이전엔 계산 시점(재생 시작 전)에 바로 열려 패배 화면을 가렸다
  const [pendingReport, setPendingReport] = useState(null);   // { rep, battleKey }
  const [replayDoneKey, setReplayDoneKey] = useState(null);   // 재생이 끝난 전투의 key
  const [sessionReport, setSessionReport] = useState(null);   // 마지막 집계 — 결과창 버튼으로 다시 열기
  // 1.247.0 PM 「전투 종료 시 집계가 자동으로 열리지 않게」 — 결과창의 📋 버튼으로만 연다
  const queueReport = (rep, battleKey) => { setSessionReport({ rep, battleKey }); };
  const [boostSheet, setBoostSheet] = useState(false);
  // 던전 연속 도전 (1.215.1) — 설정은 기억, 던전 한 판의 전투 기록은 dungRunRef에 누적
  const [dungeonAuto, setDungeonAuto] = useState(() => { try { return localStorage.getItem('chronicleDungeonAuto') === '1'; } catch { return false; } });
  const toggleDungeonAuto = () => { const v = !dungeonAuto; setDungeonAuto(v); try { localStorage.setItem('chronicleDungeonAuto', v ? '1' : '0'); } catch { /* */ } };
  const dungRunRef = useRef(null);
  // 첨탑 자동 등반 (1.240.0) — 켜 두면 승리할 때마다 다음 층으로, 패배(도전 종료)하면 멈춤
  const [towerAuto, setTowerAuto] = useState(() => { try { return localStorage.getItem('chronicleTowerAuto') === '1'; } catch { return false; } });
  const toggleTowerAuto = () => { const v = !towerAuto; setTowerAuto(v); try { localStorage.setItem('chronicleTowerAuto', v ? '1' : '0'); } catch { /* */ } };
  const startTowerAuto = () => { const s0 = E.startTower(save); if (s0 === save) return; setSave(s0); if (!towerAuto) toggleTowerAuto(); fightTower(s0); };
  const towerRunRef = useRef(null); // 첨탑 한 번 도전 집계 (1.232.1)
  const toggleRepeat = () => {
    if (!repeat) { setAutoProg(false); repStatsRef.current = newHuntStats(); if (lastRecRef.current) addHuntRecord(repStatsRef.current, lastRecRef.current); }
    setRepeat(r => !r);
  };
  // 자동 진행 (1.234.0) — 사냥 → 관문 → 다음 스테이지 → … → 보스 → 다음 지역. 보스 앞 이야기는 건너뜀, 패배하면 멈춤
  const [autoProg, setAutoProg] = useState(false);
  const autoFieldRef = useRef(null);
  const startAuto = (field) => {
    setRepeat(false);
    repStatsRef.current = newHuntStats();
    autoFieldRef.current = field;
    setAutoProg(true);
    autoStep(field, true);
  };
  const stopAuto = (msg) => { setAutoProg(false); if (msg) flash(msg); };
  const autoStep = (fieldArg, first = false) => {
    const step = E.autoProgressStep(save, fieldArg || autoFieldRef.current);
    if (!step.field) { stopAuto(`자동 진행 종료 — ${step.reason}`); if (first) setView('field'); return; }
    autoFieldRef.current = step.field;
    fightField(step.field, step.mode, step.stage, { auto: true });
  };
  useEffect(() => {
    if (repeat || autoProg || !repStatsRef.current) return;
    const st = repStatsRef.current;
    repStatsRef.current = null;
    if (st.battles > 1) { const rep = { ...st, endedAt: Date.now(), kind: 'hunt' }; logEfficiency(rep); queueReport(rep, battle?.key); }
  }, [repeat, autoProg]); // eslint-disable-line react-hooks/exhaustive-deps
  // 대기 중인 집계 열기 — 전투 화면이면 재생이 끝난 뒤 0.9초(결과를 먼저 보이게), 다른 화면이면 바로
  useEffect(() => {
    if (!pendingReport) return undefined;
    const inBattle = view === 'battle' && battle;
    if (inBattle && replayDoneKey !== battle.key) return undefined;
    const t = setTimeout(() => { setReport(pendingReport.rep); setPendingReport(null); }, inBattle ? 900 : 0);
    return () => clearTimeout(t);
  }, [pendingReport, view, battle, replayDoneKey]);

  useEffect(() => { writeAccount(acc); }, [acc]);
  // ===== 클라우드 저장 (1.237.1) — 본편과 같은 Firebase 계정, 위치는 users/{uid}/chronicle/save =====
  // checkedUid: 이 기기에서 클라우드를 한 번 확인한 계정 — 확인 전에는 자동 업로드하지 않는다 (빈 새 기기가 클라우드를 덮지 않게)
  const [cloudUser, setCloudUser] = useState(null);
  const [cloud, setCloud] = useState({ checkedUid: null, lastUp: null, busy: false, error: null, conflict: null });
  const accRef = useRef(acc); accRef.current = acc;
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = true; }, [acc]);
  useEffect(() => {
    let unsub = () => {};
    try { unsub = watchAuthState((u) => setCloudUser(u ? getUserInfo(u) : null)); } catch { /* firebase 미초기화 */ }
    return unsub;
  }, []);
  const cloudUpload = async (uid, a) => {
    setCloud(c => ({ ...c, busy: true }));
    const r = await CS.uploadChronicle(uid, a);
    if (r.ok) dirtyRef.current = false;
    setCloud(c => ({ ...c, busy: false, lastUp: r.ok ? r.savedAt : c.lastUp, error: r.ok ? null : r.error, checkedUid: r.ok ? uid : c.checkedUid }));
    return r;
  };
  // 로그인 확인되면 클라우드와 비교 — 같으면 그대로, 없으면 올리기, 다르면 사용자에게 묻기
  useEffect(() => {
    const uid = cloudUser?.uid;
    if (!uid || cloud.checkedUid === uid) return;
    let alive = true;
    (async () => {
      setCloud(c => ({ ...c, busy: true, error: null }));
      const r = await CS.downloadChronicle(uid);
      if (!alive) return;
      if (!r.ok) { setCloud(c => ({ ...c, busy: false, error: r.error })); return; }
      if (!r.exists) { setCloud(c => ({ ...c, busy: false })); await cloudUpload(uid, accRef.current); return; }
      const local = BK.accountSummary(accRef.current);
      const cmp = CS.compareSummaries(local, r.summary);
      if (cmp.same) { setCloud(c => ({ ...c, busy: false, checkedUid: uid, lastUp: r.savedAt })); return; }
      setCloud(c => ({ ...c, busy: false, conflict: { uid, acc: r.acc, savedAt: r.savedAt, summary: r.summary, local, cloudAhead: cmp.cloudAhead } }));
    })();
    return () => { alive = false; };
  }, [cloudUser?.uid, cloud.checkedUid]); // eslint-disable-line react-hooks/exhaustive-deps
  // 자동 업로드 — 확인된 계정만, 바뀐 게 있을 때 3분마다 + 화면을 떠날 때
  useEffect(() => {
    const uid = cloudUser?.uid;
    if (!uid || cloud.checkedUid !== uid) return;
    const tick = () => { if (dirtyRef.current && !cloud.busy) cloudUpload(uid, accRef.current); };
    const id = setInterval(tick, CS.CLOUD.autoEveryMs);
    const onHide = () => { if (document.visibilityState === 'hidden') tick(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); };
  }, [cloudUser?.uid, cloud.checkedUid]); // eslint-disable-line react-hooks/exhaustive-deps
  const cloudApi = {
    user: cloudUser, state: cloud,
    login: async () => { try { await signInGoogle(); } catch { setCloud(c => ({ ...c, error: '구글 로그인에 실패했습니다' })); } },
    upload: async () => { if (!cloudUser) return; const r = await cloudUpload(cloudUser.uid, accRef.current); return r; },
    download: async () => { if (!cloudUser) return null; setCloud(c => ({ ...c, busy: true })); const r = await CS.downloadChronicle(cloudUser.uid); setCloud(c => ({ ...c, busy: false, error: r.ok ? null : r.error })); return r; },
  };
  // 🗝 날짜가 바뀌면 열쇠 충전 (화면 이동 때마다 확인)
  useEffect(() => {
    if (!save) return;
    const next = E.refreshDungeonKeys(save);
    if (next !== save) setAcc(a => A.fromView(a, next));
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const setSave = (next) => setAcc(a => A.fromView(a, next));
  // 일일 임무 진행 (1.233.0) — 계정 단위
  const trackDaily = (d) => setAcc(a => D.trackDaily(a, d));
  const winDeltas = (sim, enemies, extra = {}) => (sim.result === 'win' ? { win: 1, elite: enemies.filter(e => e.tier === 'elite' || e.tier === 'boss').length, ...extra } : null);
  // 오프라인 보상 (1.233.0) — 접속 시각은 별도 키에, 계산된 보상은 계정 offline.pending에
  const LAST_SEEN_KEY = 'chronicleLastSeen';
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    const stamp = () => { try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())); } catch { /* */ } };
    const check = () => {
      let last = 0;
      try { last = +localStorage.getItem(LAST_SEEN_KEY) || 0; } catch { /* */ }
      stamp();
      const sv = saveRef.current;
      if (!last || !sv) return;
      const rw = O.offlineReward(sv, P.previewTarget(sv, readLastHunt()), Date.now() - last);
      if (rw && (rw.gold || rw.essence)) setAcc(a => ({ ...a, offline: { pending: O.mergeOffline(a.offline?.pending, rw) } }));
    };
    check();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') stamp(); }, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); else stamp(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', stamp);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', stamp); stamp(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const claimOffline = () => {
    const pd = acc.offline?.pending;
    setAcc(a => O.claimOffline(a).acc);
    if (pd) flash(`오프라인 보상 — 🪙 +${pd.gold.toLocaleString()} · ✦ +${pd.essence}`);
  };
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

  const saveNow = save;
  // 전투 시작: 끝까지 계산 → 저장 반영 → 재생
  // mode: 'hunt' | 'gate' | 'boss' · stage: 스테이지 번호
  const fightField = (field, mode = 'hunt', stage = 0, opts = {}) => {
    const boss = mode === 'boss';
    let save = saveNow; // 자동 진행이 이야기를 건너뛰면 그 기록이 반영된 저장으로 싸운다
    if (boss && E.bossAttemptsLeft(save, field.id) <= 0) { flash('오늘 보스 재도전 횟수를 모두 썼습니다'); if (opts.auto) stopAuto(); return; }
    if (boss && opts.auto) {
      // 자동 진행: 보스 앞 이야기는 본 것으로 처리하고 바로 싸운다 (게시판 「이야기」에서 다시 볼 수 있음)
      for (let sc = Q.nextScene(save, { at: 'bossPre', fieldId: field.id }); sc; sc = Q.nextScene(save, { at: 'bossPre', fieldId: field.id })) save = Q.markSceneSeen(save, sc);
    } else if (boss && playScene({ at: 'bossPre', fieldId: field.id }, () => flash('준비되면 「보스 도전」을 누르세요'))) return; // 보스 앞 장면 먼저 (저장 반영 후 다시 도전)
    if (mode === 'hunt') { lastFieldRef.current = { field, stage }; try { localStorage.setItem(LAST_HUNT_KEY, JSON.stringify({ hero: save.hero, fieldId: field.id, stage })); } catch { /* */ } }
    const enc = mode === 'gate' ? E.rollGateEncounter(field, stage, rng) : E.rollFieldEncounter(field, rng, boss, null, boss ? null : stage);
    enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const party = E.partyCombatants(save);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'field', fieldId: field.id, type: enc.type, enemies: enc.enemies, stage: boss ? null : stage, label: boss ? `${field.name} 보스` : mode === 'gate' ? `${field.name} ${stage + 1} 관문` : `${field.name} ${stage + 1}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    if (mode === 'hunt' && !E.gateReady(save, field.id, stage) && E.gateReady(r.save, field.id, stage)) r.summary.gateOpen = true;
    setSave(r.save);
    trackDaily(winDeltas(sim, enc.enemies));
    const rec = huntRecord(sim, party, enc, r.summary, readSpeedPref(E.boostLeftMs(save)), ctx.label);
    lastRecRef.current = rec;
    if (repStatsRef.current) addHuntRecord(repStatsRef.current, rec);
    // 반복 사냥은 사냥에서만 · 패배하면 반복·자동 진행 모두 멈춤 (1.234.0: 의뢰 완료로는 멈추지 않음)
    if (mode !== 'hunt' || sim.result !== 'win') setRepeat(false);
    if (opts.auto && sim.result !== 'win') stopAuto(`자동 진행 중단 — ${ctx.label}에서 패배`);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, xp: { before: expSnap(save), after: expSnap(r.save) }, key: Date.now() });
    setView('battle');
  };
  const fightDungeon = () => {
    const d = save.dungeon;
    if (!d) return;
    const enc = E.dungeonEncounter(d, rng);
    enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const party = E.partyCombatants(save, d.hp);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'dungeon', type: enc.type, enemies: enc.enemies, label: `${dungeonDef(d.id).name}(${DUNGEON_TIERS[d.tier || 0].label}) ${dungeonDef(d.id).floors[d.floor].boss ? '보스' : `${d.floor + 1}층`}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    setSave(r.save);
    trackDaily(winDeltas(sim, enc.enemies, { dungeonWin: 1 }));
    if (!dungRunRef.current) dungRunRef.current = newHuntStats();
    addHuntRecord(dungRunRef.current, huntRecord(sim, party, enc, r.summary, readSpeedPref(E.boostLeftMs(save)), ctx.label));
    let runReport = null;
    if (sim.result !== 'win' || r.summary.dungeonClear) {
      if (dungRunRef.current.battles > 1) { runReport = { ...dungRunRef.current, endedAt: Date.now(), kind: 'dungeon' }; logEfficiency(runReport); }
      dungRunRef.current = null;
    }
    const key = Date.now();
    if (runReport) queueReport(runReport, key);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, runReport, xp: { before: expSnap(save), after: expSnap(r.save) }, key });
    setView('battle');
  };

  const fightTower = (sArg) => {
    const sv = sArg || save; // 자동 등반 시작 직후엔 막 만든 도전 저장으로 싸운다
    if (!sv.tower?.run) return;
    const enc = E.towerEncounter(sv, rng);
    enc.enemies = E.scaleEnemiesForRebirth(sv, enc.enemies);
    const party = E.partyCombatants(sv, sv.tower.run.hp);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'tower', type: enc.type, enemies: enc.enemies, label: `황혼의 첨탑 ${enc.floor}층${E.isTowerBoss(enc.floor) ? ' 보스' : ''}` };
    const r = E.applyBattle(sv, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(sv, r.save);
    setSave(r.save);
    trackDaily(winDeltas(sim, enc.enemies));
    // 첨탑 한 번 도전 집계 (1.232.1) — 층이 이어지지 않으면 새 도전
    if (!towerRunRef.current || towerRunRef.current.lastFloor + 1 !== enc.floor) towerRunRef.current = { st: newHuntStats(), lastFloor: enc.floor - 1 };
    addHuntRecord(towerRunRef.current.st, huntRecord(sim, party, enc, r.summary, readSpeedPref(E.boostLeftMs(sv)), ctx.label));
    towerRunRef.current.lastFloor = enc.floor;
    let runReport = null;
    if (sim.result !== 'win') {
      if (towerRunRef.current.st.battles > 1) { runReport = { ...towerRunRef.current.st, endedAt: Date.now(), kind: 'tower' }; logEfficiency(runReport); }
      towerRunRef.current = null;
    }
    const key = Date.now();
    if (runReport) queueReport(runReport, key);
    setBattle({ sim, enemies: enc.enemies, party, summary: r.summary, ctx, runReport, xp: { before: expSnap(sv), after: expSnap(r.save) }, key });
    setView('battle');
  };
  // 원정대 레이드 (1.231.0) — 계정 단위: 5캐릭 파티 · 결과·보상은 계정에 직접
  const fightRaid = (tierId) => {
    const tier = RD.raidTier(tierId);
    if (!tier) return;
    const enemies = RD.buildRaidEnemies(tier);
    const party = A.raidParty(acc);
    const sim = E.simulateChronicleBattle(party, enemies, rng);
    const r = RD.applyRaidResult(acc, tierId, sim.result === 'win', E.kstDateKey());
    setAcc(r.acc);
    setBattle({ sim, enemies, party, summary: r.summary, ctx: { kind: 'raid', type: 'raid', enemies, label: `원정대 레이드 · ${tier.name}`, tierId }, key: Date.now() });
    setView('battle');
  };
  const afterBattle = () => {
    const ctx = battle?.ctx;
    if (autoProg) stopAuto(); // 「계속」을 누르면 자동 진행도 멈춘다
    setBattle(null);
    // 1.247.0 — 끝난 콘텐츠의 화면으로 돌아간다 (던전 클리어·패배도 마을이 아니라 던전 목록, 사냥 패배도 사냥터)
    if (ctx?.kind === 'raid') setView('raid');
    else if (ctx?.kind === 'dungeon') setView('dungeon');
    else if (ctx?.kind === 'tower') setView('tower');
    else setView('field');
  };

  let content;
  if (!save || view === 'title') {
    content = (
      <TitleView acc={acc} onExit={onExit} cloudApi={cloudApi}
        onImport={(a) => { setRepeat(false); setBattle(null); setScene(null); setAcc(a); flash('백업을 불러왔습니다'); }}
        onReset={() => { setRepeat(false); setBattle(null); setScene(null); setAcc(A.newAccount(false)); flash('황혼 연대기를 처음부터 시작합니다'); }}
        onSelect={(cid) => { setRepeat(false); setAcc(a => A.selectCharacter(a, cid)); setView('town'); }}
        onCreate={(cid) => { setRepeat(false); setAcc(a => A.createCharacter(a, cid)); setView('town'); }} />
    );
  } else if (view === 'battle' && battle) {
    content = (
      <BattleView key={battle.key} battle={battle} save={save} onDone={afterBattle}
        onReplayDone={() => setReplayDoneKey(battle.key)}
        sessionReport={sessionReport && sessionReport.battleKey === battle.key && sessionReport.rep.kind === 'hunt' ? sessionReport.rep : null}
        holdAuto={!!pendingReport || !!report}
        repeat={repeat} onToggleRepeat={toggleRepeat}
        autoProg={autoProg} onStopAuto={() => stopAuto('자동 진행을 멈췄습니다')}
        onAgain={() => (battle.ctx.kind === 'dungeon' ? fightDungeon() : battle.ctx.kind === 'tower' ? fightTower() : autoProg ? autoStep() : lastFieldRef.current && fightField(lastFieldRef.current.field, 'hunt', lastFieldRef.current.stage))}
        dungeonAuto={dungeonAuto} onToggleDungeonAuto={toggleDungeonAuto}
        towerAuto={towerAuto} onToggleTowerAuto={toggleTowerAuto}
        boostLeft={E.boostLeftMs(save)} onAskBoost={() => setBoostSheet(true)} />
    );
  } else if (view === 'field') {
    content = <FieldView save={save} onBack={() => { setRepeat(false); setView('town'); }} onFight={fightField} onAuto={startAuto} playScene={playScene} sceneOpen={!!scene} />;
  } else if (view === 'quests') {
    content = <QuestView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onReplay={(sc) => setScene({ scene: sc, replay: true })} />;
  } else if (view === 'dungeon') {
    content = (
      <DungeonView save={save} onBack={() => setView('town')}
        onEnter={(id, tier) => { dungRunRef.current = null; setSave(E.startDungeon(save, id, tier)); }}
        dungeonAuto={dungeonAuto} onToggleDungeonAuto={toggleDungeonAuto}
        onBuyKey={() => { setSave(E.buyDungeonKey(save)); flash('🗝 던전 열쇠 +1'); }}
        onFight={fightDungeon}
        onLeave={() => { dungRunRef.current = null; setSave(E.leaveDungeon(save)); setView('town'); }} />
    );
  } else if (view === 'party') {
    content = <PartyView save={save} setSave={setSave} onBack={() => setView('town')} onForge={() => setView('forge')} />;
  } else if (view === 'raid') {
    content = <RaidView save={save} onBack={() => setView('town')} onFight={fightRaid} />;
  } else if (view === 'roster') {
    content = <RosterView save={save} setSave={setSave} flash={flash} onBack={() => setView('town')} onSwitchChar={() => setView('title')} onRaid={() => setView('raid')} />;
  } else if (view === 'bag') {
    content = <BagView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onForge={() => setView('forge')} />;
  } else if (view === 'tower') {
    content = <TowerView save={save} setSave={setSave} onBack={() => setView('town')} onFight={() => fightTower()} flash={flash} towerAuto={towerAuto} onToggleTowerAuto={toggleTowerAuto} onStartAuto={startTowerAuto} />;
  } else if (view === 'fam') {
    content = <FamiliarView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onTrack={trackDaily} />;
  } else if (view === 'stash') {
    content = <StashView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} />;
  } else if (view === 'daily') {
    content = <DailyView acc={acc} onBack={() => setView('town')} onClaim={(id) => { setAcc(a => D.claimDaily(a, id)); flash('일일 임무 보상 수령'); }} onBonus={() => { setAcc(a => D.claimDailyBonus(a)); flash(`오늘의 임무 완주 — ${D.dailyRewardText(D.DAILY_BONUS.reward)}`); }} />;
  } else if (view === 'forge') {
    content = <ForgeView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onTrack={trackDaily} />;
  } else {
    content = <TownView save={save} acc={acc} go={(v) => setView(v === 'dungeon' && save.dungeon ? 'dungeon' : v)} onExit={onExit} onSwitchChar={() => setView('title')} />;
  }

  return (
    <div className="absolute inset-0" style={{ background: PALETTE.bg, fontFamily: '"Noto Serif KR", serif', color: PALETTE.text }}>
      <div key={view} className="ui-screen-enter absolute inset-0">{content}</div>
      {report && <HuntReport report={report} save={save} title={report.kind === 'tower' ? '🗼 첨탑 도전 집계' : report.kind === 'dungeon' ? '🏰 던전 전체 집계' : '📋 사냥 보고서'} onClose={() => setReport(null)} />}
      {boostSheet && save && <BoostSheet save={save} onClose={() => setBoostSheet(false)} onBuy={() => { const n = E.buyBoost(save); if (n === save) { flash(save.gold < E.boostCost(save) ? '골드가 부족합니다' : `최대 ${BOOST.maxStackMin / 60}시간까지 쌓을 수 있습니다`); return; } setSave(n); flash(`⏩ ×4 배속 +${BOOST.minutes}분`); }} />}
      {acc.giftNotice && view === 'title' && <GiftNotice acc={acc} onClose={() => setAcc(a => ({ ...a, giftNotice: false }))} />}
      {view === 'town' && !scene && acc.offline?.pending && acc.chars?.[acc.offline.pending.hero] && <OfflineSheet pd={acc.offline.pending} onClaim={claimOffline} />}
      {cloud.conflict && (
        <BottomSheet title="☁ 클라우드 저장 확인" onClose={() => {}} maxHeight="70%">
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>이 기기의 진행과 클라우드 저장이 다릅니다. 어느 쪽으로 이어갈까요? <b style={{ color: '#e06a5f' }}>고르지 않은 쪽은 덮어씌워집니다.</b></div>
          <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.7 }}>
            ☁ 클라우드{cloud.conflict.savedAt ? ` (${fmtWhen(cloud.conflict.savedAt)})` : ''}: <b style={{ color: PALETTE.text }}><SummaryLine sm={cloud.conflict.summary} /></b><br />
            📱 이 기기: <SummaryLine sm={cloud.conflict.local} />
          </GlassPanel>
          <div className="flex flex-col gap-2 mt-3">
            <UIButton variant={cloud.conflict.cloudAhead ? 'primary' : 'ghost'} onClick={() => { const cf = cloud.conflict; setRepeat(false); setBattle(null); setScene(null); setAcc(cf.acc); dirtyRef.current = false; setCloud(c => ({ ...c, conflict: null, checkedUid: cf.uid, lastUp: cf.savedAt })); setView('title'); flash('클라우드 저장을 불러왔습니다'); }}>☁ 클라우드 저장으로 이어하기{cloud.conflict.cloudAhead ? ' (진행이 더 많음)' : ''}</UIButton>
            <UIButton variant={cloud.conflict.cloudAhead ? 'ghost' : 'primary'} onClick={async () => { const cf = cloud.conflict; setCloud(c => ({ ...c, conflict: null })); const r = await cloudUpload(cf.uid, accRef.current); flash(r.ok ? '이 기기 진행을 클라우드에 올렸습니다' : r.error); }}>📱 이 기기 진행 유지 (클라우드에 올리기)</UIButton>
          </div>
        </BottomSheet>
      )}
      {loadNotice && (
        <BottomSheet title={loadNotice.status === 'restored' ? '⚠ 저장 복구' : '⚠ 저장을 읽지 못했습니다'} onClose={() => setLoadNotice(null)} maxHeight="60%">
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
            {loadNotice.status === 'restored'
              ? <>저장 파일이 손상되어 <b style={{ color: PALETTE.legendary }}>자동 백업({fmtWhen(loadNotice.at)})으로 복구</b>했습니다. 그 이후 진행 일부가 빠졌을 수 있습니다.</>
              : <>저장 파일이 손상되어 새로 시작합니다. <b style={{ color: PALETTE.legendary }}>손상된 원본은 지우지 않고 따로 보관</b>했습니다. 백업 파일이 있다면 타이틀의 「💾 백업 → 가져오기」로 되돌릴 수 있습니다.</>}
          </div>
          <div className="mt-3"><UIButton onClick={() => setLoadNotice(null)}>확인</UIButton></div>
        </BottomSheet>
      )}
      {scene && <SceneView key={scene.scene.id} save={save} scene={scene.scene} onEnd={endScene} />}
      {toast && (
        <div className="absolute left-1/2 z-50 pointer-events-none" style={{ bottom: 90, transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 999, background: '#000d', border: '1px solid var(--ui-line-strong)', color: PALETTE.legendary, fontSize: 12.5, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  );
}
