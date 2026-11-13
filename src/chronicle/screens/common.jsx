// ============================================
// chronicle/screens/common.jsx — 황혼 연대기 · 공용 부품 (본편 스타일 상자·창·탭·막대·초상)
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Coins } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import { UIButton, BottomSheet } from '../../components/ui/CommonUI.jsx';
import { BOSS_MECHS, GRADES, gradeIdx, chronicleClass, chronicleEnemyArt, expNeedFor } from '../data.js';
import * as E from '../engine.js';
import * as TL from '../talents.js';
import * as F from '../familiar.js';

export const FONT_TITLE = '"Cinzel", "Noto Serif KR", serif';

// ===== 작은 부품 =====
export const gradeOf = (id) => GRADES[gradeIdx(id)] || GRADES[0];

// 받침 여부로 이/가 고르기
export const iga = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? `${w}이` : `${w}가`; };

export function statLine(st) {
  return Object.entries(st).filter(([, v]) => v).map(([k, v]) => E.statLabel(k, v)).join(' · ');
}

// 장비 소속 표시 — 직업 전용 / 공용
export const clsTag = (item) => (item.cls === 'common' ? '공용' : `${chronicleClass(item.cls).name} 전용`);

// 특수 효과 한 줄 (유니크 고유 효과 · 에픽 장신구 옵션)
export function Header({ title, onBack, right }) {
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
export function CountUp({ v, ms = 700 }) {
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

export function ForgePop({ pop, onDone }) {
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

export function Wallet({ save }) {
  return (
    <div className="flex items-center gap-1 flex-none" style={{ fontSize: 11.5 }}>
      <span className="chr-pill" style={{ color: PALETTE.legendary, padding: '2px 8px' }}><Coins size={12} />{(save.gold || 0).toLocaleString()}</span>
      <span className="chr-pill" style={{ color: '#9fd18a', padding: '2px 8px' }}>✦{(save.mats.essence || 0).toLocaleString()}</span>
      <span className="chr-pill" style={{ color: '#c08ae8', padding: '2px 8px' }}>◆{(save.mats.shard || 0).toLocaleString()}</span>
    </div>
  );
}

export function Bar({ v, max, color, h = 8, shield = 0 }) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  const sp = Math.max(0, Math.min(100 - pct, (shield / Math.max(1, max)) * 100));
  return (
    <div className="flex overflow-hidden" style={{ height: h, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
      <div className="chr-bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
      {sp > 0 && <div style={{ width: `${sp}%`, background: '#9cc4e4aa' }} />}
    </div>
  );
}

// ===== 경험치 바 (1.239.0) — 주인공 금색 · 사역마 보라 =====
export const XP_HERO = 'linear-gradient(90deg,#a8781e,#f0c25a)';

export const XP_FAM = 'linear-gradient(90deg,#7a3a9a,#d07ae8)';

// 주인공·동행 사역마 경험치 스냅샷 — 전투 전/후를 비교해 이번 획득 구간을 그린다
export function expSnap(save) {
  const h = save?.units?.[save?.hero];
  const hero = h ? { lv: h.lv, exp: h.exp || 0, need: expNeedFor(h), cap: h.lv >= E.levelCapOf(save) } : null;
  const fk = save?.famTeam?.main;
  const f = fk ? save.fams?.[fk] : null;
  const fam = f ? { key: fk, lv: F.famLv(f), exp: f.exp || 0, need: F.FAM_LEVEL.expNeed(F.famLv(f)), cap: h ? F.famLv(f) >= h.lv : false } : null;
  return { hero, fam };
}

export const xpPct = (x) => (x ? Math.max(0, Math.min(100, (x.exp / Math.max(1, x.need)) * 100)) : 0);

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

export function XpResultRow({ art, name, before, after, fam = false }) {
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
// 장비 상세 본문 (1.245.0) — 기본 능력치 / 추가 옵션 / 특수 효과 / 강화 구획 + 착용 비교
export const BASE_STATS = ['atk', 'def', 'hp', 'spd'];

export const BASE_LABEL = { atk: '공격', def: '방어', hp: 'HP', spd: '속도' };

// 전투·던전 유닛 아이콘 — 사역마는 원본 적 그림
export function UnitIcon({ u, size = 38, dim = false }) {
  if (!u.fam) return <Portrait cid={u.classId} size={size} dim={dim} />;
  return <img src={chronicleEnemyArt(u.famKey)} alt={u.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: '1.5px solid #d07ae8', filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}

export function Portrait({ cid, size = 44, dim = false }) {
  const c = chronicleClass(cid);
  return <img src={c.image} alt={c.name} className="object-cover flex-none" style={{ width: size, height: size, borderRadius: 12, border: `1.5px solid ${c.color}`, filter: dim ? 'grayscale(1) brightness(.5)' : 'none' }} draggable={false} />;
}

// ===== 사냥터 (1.213.0 — 지역당 6스테이지 · 처치 목표 + 관문 강적 → 보스) =====
// 보스 공략 힌트 (1.237.0) — 기믹 이름·설명·추천 조합
export function BossMechNote({ mech, compact = false }) {
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

export function FamSynergyNote({ tree, pts }) {
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
export function IntimNote({ heroLv, lv, what }) {
  const n = E.intimidateLevel(heroLv, lv);
  if (!n) return null;
  const st = E.intimidateStep(n);
  return <div style={{ fontSize: 11.5, color: n >= 4 ? '#ff6a5a' : '#ff9a7a' }}>{n >= 4 ? '☠' : '☗'} {what} Lv.{lv} — {st.label} (적 HP ×{st.hp} · 공격 ×{st.atk}){n >= 4 ? ' · 극복 불가 수준' : ''}</div>;
}

export function MainKvRows({ rows }) {
  return (
    <div className="chr-list">
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-2" style={{ padding: '7px 11px', minWidth: 0 }}>
          <span className="truncate" style={{ fontSize: 12, color: PALETTE.textDim }}>{r.l}</span>
          <span className="flex-none text-right" style={{ fontSize: 12.5, fontWeight: 800, color: r.c || PALETTE.text }}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

// ===== 본편 스타일 공용 (1.250.0) — 밑줄 탭 · 착용 4칸 상자 =====
export function MainTabs({ items, value, onChange, size = 13 }) {
  const n = items.length; const idx = Math.max(0, items.findIndex(x => x[0] === value));
  return (
    <div className="chr-seg" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      <span className="chr-seg-thumb" style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${idx * 100}%)` }} />
      {items.map(([id, label, dot, locked]) => (
        <button key={id} disabled={locked} onClick={() => onChange(id)} className="ui-press relative truncate" style={{ height: 34, background: 'transparent', border: 'none', color: value === id ? '#fff3d6' : PALETTE.textDim, fontSize: n > 5 ? Math.min(size, 12) : size, fontWeight: value === id ? 800 : 500, opacity: locked ? 0.4 : 1, padding: '0 2px' }}>
          {label}{dot && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: MS.gold, boxShadow: `0 0 8px ${MS.gold}`, marginLeft: 3, verticalAlign: 6 }} />}
        </button>
      ))}
    </div>
  );
}

// ===== 본편 정보창 스타일 (1.247.0 — PM 「트와일라잇 UI가 더 깔끔, 본편 참고」 시안 ⑪⑫ 승인) =====
// 1.277.0 유리 스타일 — 테두리·상자를 반투명 흰색으로 (와인색 선 → 유리 칸)
export const MS = { line: 'rgba(255,255,255,0.11)', strong: 'rgba(232,176,74,0.55)', red: '#e0574c', box: 'rgba(255,255,255,0.045)', r: 14, gold: '#e8b04a', blue: '#7fa8d8', green: '#8fd08a', violet: '#b48cf0' };

export const CLASS_PATH = { wanderer: 'SWORD PATH', sage: 'ARCANE PATH', demonblood: 'BLOOD PATH', elf: 'SPIRIT PATH', priest: 'DAWN PATH' };

export function MainSecHead({ title, right }) {
  return (
    <div className={`chr-sec${right ? ' has-right' : ''}`} style={{ marginTop: 12, marginBottom: 7 }}>
      <span style={{ fontSize: 11.5, letterSpacing: 4, color: PALETTE.textDim }}>{title}</span>
      {right && <><span className="flex-1" style={{ height: 1, background: 'linear-gradient(90deg, rgba(232,176,74,.45), transparent)' }} />{right}</>}
    </div>
  );
}

// cells = 3열 칸 (전투 수치) / 기본 = 한 줄씩 목록 (누르면 설명)
export function MainKvGrid({ rows, onPick, cells = false }) {
  if (cells) return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {rows.map(r => (
        <button key={r.key} onClick={() => onPick(r)} className="ui-press chr-cell text-left" style={{ padding: '8px 10px', minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{r.label}</div>
          <div className="truncate" style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25, color: r.color || PALETTE.text }}>{r.value}</div>
        </button>
      ))}
    </div>
  );
  return (
    <div className="chr-list">
      {rows.map(r => (
        <button key={r.key} onClick={() => onPick(r)} className="ui-press w-full flex items-baseline justify-between gap-2 text-left" style={{ background: 'transparent', border: 'none', padding: '8px 11px', minWidth: 0 }}>
          <span className="truncate" style={{ fontSize: 12.5, color: PALETTE.textDim }}>{r.label}</span>
          <span className="flex-none" style={{ fontSize: 13.5, fontWeight: 800, color: r.color || PALETTE.text }}>{r.value} <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim, opacity: 0.6 }}>›</span></span>
        </button>
      ))}
    </div>
  );
}

// 정보 창 (1.277.0 유리 스타일) — 유리 판 · 그라데이션 테두리(등급·직업색 → 금) · 알약 배지 · 튀어 오르며 열림
export function MainModal({ kicker, title, badge, color = MS.red, onClose, children, footer, img, sub, full = false }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center chr-dim" style={{ zIndex: 45, padding: full ? 8 : 16 }} onClick={onClose}>
      <div className="chr-glass chr-pop-in w-full flex flex-col" style={{ maxWidth: 420, maxHeight: full ? '100%' : '88%', height: full ? '100%' : undefined, '--edge': color, '--glow': `${color}33` }} onClick={e => e.stopPropagation()}>
        <div className="chr-glass-sheen" />
        <div className="relative flex items-start justify-between gap-2" style={{ padding: '15px 16px 11px' }}>
          <div className="flex gap-3 min-w-0">
            {img && <div className="chr-port flex-none" style={{ '--edge': color, '--glow': `${color}44`, borderRadius: 18, width: 64, height: 64 }}><img src={img} alt="" className="w-full h-full object-cover" style={{ borderRadius: 16 }} /></div>}
            <div className="min-w-0">
              <div style={{ fontSize: 11, letterSpacing: 4, color: PALETTE.textDim }}>{kicker}</div>
              <div className="font-bold chr-gtxt" style={{ fontSize: 21, lineHeight: 1.3, '--tone': color }}>{title}</div>
              {sub && <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginTop: 2 }}>{sub}</div>}
            </div>
          </div>
          {badge && <span className="flex-none chr-pill" style={{ fontSize: 12.5, padding: '4px 11px', borderColor: `${color}88`, color }}>{badge}</span>}
        </div>
        <div className="relative overflow-y-auto flex-1 min-h-0" style={{ padding: '2px 16px 12px' }}>{children}</div>
        <div className="relative flex flex-col gap-1.5" style={{ padding: '0 16px 14px' }}>
          {footer}
          <button onClick={onClose} className="ui-press" style={{ height: 38, border: 'none', background: 'transparent', color: PALETTE.textDim, letterSpacing: 6, fontSize: 13 }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

export function MainCell({ label, value, color, hot = false }) {
  return (
    <div className={`chr-cell${hot ? ' chr-cell-hot' : ''}`} style={{ padding: '8px 11px', minWidth: 0 }}>
      <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{label}</div>
      <div className="truncate" style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25, color: color || PALETTE.text }}>{value}</div>
    </div>
  );
}

// ===== 확인 창 (1.232.1) — 되돌릴 수 없는 동작 앞에 =====
export function ConfirmSheet({ title, lines = [], confirmLabel = '진행', danger = false, onConfirm, onCancel, skipLabel, onSkipChange, skip }) {
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
