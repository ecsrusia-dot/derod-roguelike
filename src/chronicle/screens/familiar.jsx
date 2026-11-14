// ============================================
// chronicle/screens/familiar.jsx — 황혼 연대기 · 사역마
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../../components/ui/CommonUI.jsx';
import { HiNum } from '../../components/ui/InfoBlocks.jsx';
import { chronicleClass, chronicleEnemyArt, REBIRTH_BRANCHES } from '../data.js';
import * as E from '../engine.js';
import * as F from '../familiar.js';
import { Header, Bar, MainKvRows, MainTabs, MS, MainSecHead, MainModal, MainCell } from './common.jsx';
import { PreviewSheet } from './report.jsx';

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
// 보조 효과 칩 줄 — cur(지금 칸 값)를 주면 ▲▼ 비교
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
                        <span className="truncate w-full text-center" style={{ fontSize: 11, color: g ? g.color : PALETTE.textDim }}>{g ? `${ok2(f) ? '✓ ' : ''}${g.label}${f.plus ? `+${f.plus}` : ''}` : '미보유'}</span>
                        <span className="truncate w-full text-center" style={{ fontSize: 11, color: PALETTE.textDim }}>{F.famName(k)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1" style={{ fontSize: 11.5 }}>
                  <span style={{ color: t >= 1 ? '#c79bff' : PALETTE.textDim }}>1단계 {F.famFxText(b.fx)}</span>
                  <span style={{ color: PALETTE.textDim }}> · </span>
                  <span style={{ color: t === 2 ? PALETTE.legendary : PALETTE.textDim }}>2단계 {F.famFxText(Object.fromEntries(Object.entries(b.fx).map(([k, v]) => [k, v * 2])))} <span style={{ fontSize: 11 }}>(전원 {g2.label} 이상·+{F.BOND_TIER2_PLUS} — {done2}/{b.members.length})</span></span>
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
const FAM_SLOT_TAG = { main: '★ 동행', sub1: '보조 1', sub2: '보조 2', sub3: '보조 3' };
const famSlots = (save) => (E.famSlotOpen(save, 'sub3') ? ['main', 'sub1', 'sub2', 'sub3'] : ['main', 'sub1', 'sub2']); // 1.288.0 전승 특전

function MainFamTeam({ save, onOpen, onPick }) {
  const team = save.famTeam || {}; const fams = save.fams || {};
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: famSlots(save).length > 3 ? '1.3fr 1fr 1fr 1fr' : '1.3fr 1fr 1fr' }}>
      {famSlots(save).map(sl => {
        const open = E.famSlotOpen(save, sl); const k = team[sl]; const f = k && fams[k]; const g = f ? F.famGrade(f.grade) : null;
        const role = f ? F.FAM_ROLES[F.famRole(k)] : null;
        return (
          <button key={sl} onClick={() => (f ? onOpen(k) : open ? onPick(sl) : null)} className="ui-press relative text-left overflow-hidden" style={{ borderRadius: 12, border: `1.5px solid ${f ? g.color : MS.line}`, background: MS.box, padding: 0, minWidth: 0, opacity: open ? 1 : 0.55 }}>
            <span className="absolute" style={{ top: 4, left: 4, fontSize: 11, fontWeight: 800, padding: '1px 6px', background: 'rgba(0,0,0,0.7)', border: `1px solid ${f ? g.color : MS.line}`, color: f ? g.color : PALETTE.textDim, zIndex: 1 }}>{FAM_SLOT_TAG[sl]}</span>
            {f ? <img src={chronicleEnemyArt(k)} alt="" className="w-full object-cover" style={{ height: 72, display: 'block' }} />
              : <div className="flex items-center justify-center" style={{ height: 72, fontSize: 22, color: PALETTE.textDim }}>{open ? '＋' : '🔒'}</div>}
            <div style={{ padding: '4px 6px' }}>
              <div className="truncate font-bold" style={{ fontSize: 11.5, color: f ? g.color : PALETTE.textDim }}>{f ? `${F.famName(k)}${F.famPlusText(f)}` : open ? '비어 있음' : `Lv.${F.FAM_TUNING.slotLv[sl]} 개방`}</div>
              <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{f ? `${g.label} · ${role.icon}${role.label} · Lv.${F.famLv(f)}` : open ? '눌러서 편성' : '주인공 레벨'}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// 사역마 카드 — 장비 카드와 같은 형식 (1.254.0, 시안 ㉛)
// 공명 (1.292.0) — 자령마다 짝 갈래가 있고, 그 갈래가 동행으로 데려갈 때만 켜진다.
// 지금 주인공의 갈래 (FamiliarView가 그릴 때마다 맞춘다)
let heroBranch = null;
function ResoLine({ k, f, box = false }) {
  const r = F.famReso(k, f, heroBranch);
  if (!r) return null;
  const bn = REBIRTH_BRANCHES[r.branch]?.name || r.branch;
  const col = r.on ? '#7fe0c0' : PALETTE.textDim;
  if (box) return (
    <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${r.on ? '#7fe0c0aa' : MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, lineHeight: 1.55 }}>
      <div className="flex justify-between gap-2"><b style={{ color: col }}>✦ 공명 「{r.name}」</b><span style={{ fontSize: 11, color: col }}>{r.on ? '켜짐' : `${bn} 전용`}</span></div>
      <div style={{ color: r.on ? PALETTE.text : PALETTE.textDim }}><HiNum text={r.desc} /></div>
      <div style={{ fontSize: 11, color: PALETTE.textDim }}>{bn} 갈래가 이 자령을 동행 칸에 둘 때만 적용</div>
    </div>
  );
  return <div className="mt-0.5" style={{ fontSize: 11.5, lineHeight: 1.4, color: col }}>✦ 공명 [{bn}]{r.on ? ' 켜짐' : ''} — <span style={{ color: r.on ? PALETTE.text : PALETTE.textDim }}>{r.desc}</span></div>;
}

const FAM_STAT_ROWS = [['HP', 'maxHp'], ['공격력', 'atk'], ['방어', 'def'], ['회복력', 'healPower']];

function MainFamCard({ k, f, heroLv, famPct = 0, slot, onClick, dim = false, hideSub = false, cmp = null, curSub = undefined, mark = false }) {
  const g = F.famGrade(f.grade); const role = F.FAM_ROLES[F.famRole(k)];
  const st = F.famStats(k, f, heroLv, famPct);
  const subs = F.famSubItems(k, f, heroLv);
  const vals = Object.fromEntries(subs.map(it => [it.k, it.v]));
  const gone = curSub ? Object.keys(curSub).filter(kk => !vals[kk]) : [];
  const sig = F.famHasSignature(k, f) ? F.famSignature(k, f.grade) : null;
  const pv = F.famPassive(k, f);
  const lvLow = heroLv && F.famLv(f) < heroLv;
  const dcol = { up: '#8fd08a', down: '#e07a6a', new: '#8fd08a', gone: '#e07a6a' };
  return (
    <button onClick={onClick} className="ui-press w-full text-left" style={{ opacity: dim ? 0.7 : 1, padding: '8px 10px 8px 12px', background: MS.box, borderRadius: MS.r, border: `1px solid ${mark ? MS.violet : MS.line}`, borderLeft: `3px solid ${g.color}` }}>
      <div className="flex gap-2.5">
        <img src={chronicleEnemyArt(k)} alt="" className="flex-none object-cover" style={{ width: 52, height: 52, borderRadius: 8, border: `1px solid ${g.color}` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-bold" style={{ fontSize: 13.5, color: g.color }}>{F.famName(k)}{F.famPlusText(f)}{slot && <span style={{ marginLeft: 5, fontSize: 11, padding: '0 5px', border: `1px solid ${slot === 'main' ? MS.gold : MS.violet}`, color: slot === 'main' ? MS.gold : MS.violet }}>{FAM_SLOT_TAG[slot]}</span>}</span>
            <b className="flex-none" style={{ fontSize: 12.5, color: MS.gold }}>Lv.{F.famLv(f)}</b>
          </div>
          <div style={{ fontSize: 11, color: PALETTE.textDim }}>{g.label} · <span style={{ color: role.color }}>{role.icon} {role.label}</span>{slot ? '' : ' · 대기'}{lvLow ? ` · 보조 효과 ${F.famSubPctOf(f, heroLv)}%` : ''}</div>
          {lvLow ? <div className="mt-1"><Bar v={f.exp || 0} max={F.FAM_LEVEL.expNeed(F.famLv(f))} color={MS.gold} h={3} /></div> : null}
        </div>
      </div>
      <div className="grid mt-1.5" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
        {FAM_STAT_ROWS.map(([l, key]) => {
          const d = cmp ? st[key] - cmp[key] : 0;
          return (
            <div key={key} className="flex items-baseline justify-between gap-1" style={{ padding: '1px 0' }}>
              <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: PALETTE.text }}>{st[key].toLocaleString()}{d ? <span style={{ fontSize: 11, marginLeft: 3, color: d > 0 ? '#8fd08a' : '#e07a6a' }}>{d > 0 ? '▲' : '▼'}{Math.abs(d).toLocaleString()}</span> : null}</span>
            </div>
          );
        })}
        {F.famGuard(k, f) > 0 && <div className="flex items-baseline justify-between gap-1" style={{ padding: '1px 0' }}><span style={{ fontSize: 11.5, color: PALETTE.textDim }}>수호 태세</span><span style={{ fontSize: 12, fontWeight: 800, color: MS.gold }}>{Math.round(F.famGuard(k, f) * 100)}%</span></div>}
      </div>
      {!hideSub && (subs.length || gone.length) ? (
        <div className="mt-1" style={{ fontSize: 11.5, lineHeight: 1.5, color: PALETTE.text }}>
          <span style={{ color: PALETTE.textDim }}>보조 효과 </span>
          {subs.map((it, i) => { const dl = curSub !== undefined ? F.famSubDelta(it.k, vals, curSub) : null; return <span key={it.k}>{i ? ' · ' : ''}{it.icon ? `${it.icon} ` : ''}{it.label} <b style={{ color: MS.red }}>{it.text}</b>{dl ? <span style={{ fontSize: 11, color: dcol[dl.kind] }}> {dl.text}</span> : null}</span>; })}
          {gone.map(kk => <span key={kk} style={{ color: '#e07a6a' }}> · {F.famSubLabel(kk)} 사라짐</span>)}
        </div>
      ) : null}
      {sig && <div className="mt-0.5 truncate" style={{ fontSize: 11.5, color: '#c79bff' }}>★ {sig.name} <span style={{ color: PALETTE.textDim }}>({sig.type})</span></div>}
      {pv && <div className="mt-0.5" style={{ fontSize: 11.5, color: '#e8b04a', lineHeight: 1.4 }}>◆ {pv.name} — <span style={{ color: PALETTE.text }}>{pv.desc}</span></div>}
      <ResoLine k={k} f={f} />
    </button>
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
        ...(role.guard ? [{ l: '수호 태세', v: `${Math.round(F.famGuard(k, f) * 100)}%`, c: MS.blue }] : []),
        { l: '역할', v: `${role.icon} ${role.label}`, c: role.color },
        { l: '★ 고유 스킬', v: sig ? sig.name : '없음', c: sig ? '#d07ae8' : PALETTE.textDim },
        { l: '◆ 고유 패시브', v: pv ? pv.name : '없음', c: pv ? '#c79bff' : PALETTE.textDim },
        { l: '베이스 등급', v: base.label, c: base.color },
        ...(F.famKit(k, f) ? [{ l: '특화', v: F.famKit(k, f).tag, c: MS.gold }] : []),
      ]} />
      <ResoLine k={k} f={f} box />
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
      {pv && <div className="mt-2" style={{ padding: '8px 10px', border: '1px solid #c79bff88', background: MS.box, borderRadius: MS.r, fontSize: 12.5, lineHeight: 1.55 }}><b style={{ color: '#c79bff' }}>◇ 자령 고유 패시브 「{pv.name}」</b> <HiNum text={pv.desc} /></div>}
      {skills.map(sk => (
        <div key={sk.id} className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${sk.sig ? '#d07ae888' : MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, lineHeight: 1.55 }}>
          <div className="flex justify-between gap-2"><b style={{ color: sk.sig ? '#d07ae8' : MS.red }}>◇ {sk.trans ? '초월 스킬 ' : sk.sig ? '고유 스킬 ' : ''}「{sk.name}」</b><span style={{ fontSize: 11, color: PALETTE.textDim }}>⏱ {sk.cd}턴 · {sk.sig ? sk.sigType : FAM_KIND_LABEL[sk.kind] || sk.kind}</span></div>
          <div style={{ color: PALETTE.text }}><HiNum text={sk.effect} /></div>
          {sk.when && <div style={{ fontSize: 11, color: PALETTE.textDim }}>발동: {sk.when}</div>}
        </div>
      ))}
    </>
  );
}

export function FamiliarView({ save, setSave, onBack, flash, onTrack = () => {} }) {
  const [tab, setTab] = useState('summon');
  const [results, setResults] = useState(null);
  const [sel, setSel] = useState(null);
  const [pickSlot, setPickSlot] = useState(null);
  const [selTab, setSelTab] = useState('fx'); // 설명창 탭 (1.244.0)
  const [preview, setPreview] = useState(null); // 효율 미리보기 (1.232.0)
  const fams = save.fams || {};
  heroBranch = save.units[save.hero]?.rebirth?.branch || null;
  const shards = save.mats.famShard || 0;
  const souls = save.mats.famSoul || 0;
  const heroLv = save.units[save.hero]?.lv || 1;
  const famPct = E.deriveUnit(save, save.hero).famPct || 0;
  const per = F.FAM_TUNING.shardsPerSummon;
  const pool = F.famPool(save.progress);
  const pity = save.famPity || { total: 0, sinceViolet: 0 };
  const team = save.famTeam || {};
  const list = Object.entries(fams).sort((a, b) => F.famGradeIdx(b[1].grade) - F.famGradeIdx(a[1].grade) || b[1].plus - a[1].plus);
  const [rollId, setRollId] = useState(0);
  const doSummon = (n) => {
    const r = E.summonFam(save, n);
    if (!r.results) { flash('계약서 조각이 부족합니다'); return; }
    setSave(r.save); setResults(r.results); setRollId(x => x + 1); onTrack({ summon: r.results.length });
  };
  const slots = [
    { id: 'main', label: '동행', desc: '전투에 함께 싸운다' },
    { id: 'sub1', label: '보조 1', desc: '패시브 효과만' },
    { id: 'sub2', label: '보조 2', desc: '패시브 효과만' },
    ...(E.famSlotOpen(save, 'sub3') ? [{ id: 'sub3', label: '보조 3', desc: '패시브 효과만 (전승 특전)' }] : []),
  ];
  const selF = sel && fams[sel];
  const slotOf = (k) => ['main', 'sub1', 'sub2', 'sub3'].find(sl => team[sl] === k) || null;
  const inTeam = list.filter(([k]) => slotOf(k));
  const waiting = list.filter(([k]) => !slotOf(k));
  const grpHead = (left, right) => <div className="flex justify-between" style={{ fontSize: 11.5, fontWeight: 700, color: PALETTE.textDim, marginTop: 2 }}><span>{left}</span>{right && <span style={{ fontWeight: 400 }}>{right}</span>}</div>;
  return (
    <div className="absolute inset-0 flex flex-col">
      <Header title="사역마" onBack={onBack} right={<div className="flex items-center gap-2" style={{ fontSize: 12 }}><span style={{ color: '#d07ae8' }}>📜{shards}</span><span style={{ color: '#9cc4e4' }}>🔮{souls}</span></div>} />
      <div className="flex-none px-4 pt-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span className="chr-head">편성</span>
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
                    <div style={{ fontSize: 11, color: PALETTE.textDim }}>{pool[g.id].length}종</div>
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
            <div className="flex flex-col gap-1.5">
              {[...inTeam, ...waiting].map(([k, f]) => <MainFamCard key={k} k={k} f={f} slot={slotOf(k)} heroLv={heroLv} famPct={famPct} onClick={() => setSel(k)} />)}
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
                : f ? <MainFamCard k={k} f={f} heroLv={heroLv} famPct={famPct} slot={sl.id} hideSub={sl.id === 'main'} onClick={() => setPickSlot(sl.id)} />
                  : <button onClick={() => setPickSlot(sl.id)} className="ui-press w-full text-left" style={{ padding: 12, borderRadius: 12, border: '1px dashed var(--ui-line-strong)', background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>＋ 비어 있음 (눌러서 편성)</button>}
            </div>
          );
        })}
        {tab === 'team' && <FamRoleGuide heroCls={save.hero} />}
        {tab === 'team' && <div style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.6 }}>동행 사역마의 능력치는 사역마 자신의 레벨·등급·강화·역할로 정해진다 (주인공 직업과 무관). 새 사역마는 Lv.1 — 동행 칸에서 이길 때만 경험치를 받고, 주인공 레벨이 상한. 보조 칸은 사역마마다 경험치·골드·아이템 획득 중 하나를 더 준다. 주인공이 쓰러지면 패배. 사역마는 모든 캐릭터가 함께 쓴다.</div>}
      </div>

      {results && (() => {
        // 1.256.0 — 본편 카드 창 (시안 ㊴) + 다시 소환
        const nNew = results.filter(r => r.isNew).length;
        const nUp = results.filter(r => r.upgraded).length;
        const soul = results.reduce((t, r) => t + (r.soul || 0), 0);
        const sq = (on, hot) => ({ height: 42, fontSize: 13, fontWeight: 800, border: `1px solid ${hot && on ? MS.red : MS.line}`, background: hot && on ? 'rgba(224,87,76,0.2)' : MS.box, color: !on ? PALETTE.textDim : hot ? '#ff8a7e' : PALETTE.text, opacity: on ? 1 : 0.55 });
        return (
          <MainModal kicker="SUMMON" title="소환 결과" badge={`📜 −${results.length * per}`} sub={`${results.length}회 소환${results.length >= 10 ? ' · 청령 이상 1마리 확정' : ''} · 남은 조각 📜 ${shards}`} onClose={() => setResults(null)}
            footer={<div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button disabled={shards < per} onClick={() => doSummon(1)} className="ui-press" style={sq(shards >= per, false)}>🎲 1회 더 (📜{per})</button>
              <button disabled={shards < per * 10} onClick={() => doSummon(10)} className="ui-press" style={sq(shards >= per * 10, true)}>🎲 10회 더 (📜{per * 10})</button>
            </div>}>
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[['신규', nNew, '#8fd08a'], ['등급 상승', nUp, MS.gold], ['사역혼', `🔮 +${soul}`, MS.violet]].map(([l, v, c]) => (
                <div key={l} className="text-center" style={{ padding: '5px 0', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r }}><div style={{ fontSize: 11, color: PALETTE.textDim }}>{l}</div><b style={{ fontSize: 13.5, color: c }}>{v}</b></div>
              ))}
            </div>
            <div key={rollId} className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {results.map((r, i) => {
                const g = F.famGrade(r.grade);
                return (
                  <div key={i} className={`flex items-center gap-2 ${F.famGradeIdx(r.grade) >= 2 ? 'chr-flip-hi' : 'chr-flip'}`} style={{ padding: 6, border: `1px solid ${g.color}`, background: MS.box, borderRadius: MS.r, animationDelay: `${i * 90}ms`, '--g': g.color, minWidth: 0 }}>
                    <img src={chronicleEnemyArt(r.key)} alt="" className="object-cover flex-none" style={{ width: 40, height: 40 }} />
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontSize: 12, color: g.color, fontWeight: 800 }}>{g.label} {F.famName(r.key)}</div>
                      <div style={{ fontSize: 11, color: r.isNew ? '#8fd08a' : r.upgraded ? MS.gold : PALETTE.textDim }}>{r.isNew ? 'NEW!' : r.upgraded ? '등급 상승!' : `중복 → 🔮+${r.soul}`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </MainModal>
        );
      })()}
      {selF && (() => {
        const g = F.famGrade(selF.grade);
        const gi = F.famGradeIdx(selF.grade);
        const maxed = selF.plus >= F.FAM_TUNING.maxPlus;
        const ec = F.FAM_TUNING.enhanceCost(selF.plus, selF.grade);
        const vc = F.FAM_TUNING.evolveCost(selF.grade);
        const last = gi >= F.FAM_GRADES.length - 1;
        return (
          <MainModal img={chronicleEnemyArt(sel)} kicker={`${g.label} · ${F.FAM_ROLES[F.famRole(sel)].label}`.split('').join(' ').replace(/ {3}/g, '  ')} title={`${F.famName(sel)}${F.famPlusText(selF)}`} color={g.color} badge={`Lv.${F.famLv(selF)}`}
            sub={`Lv.${F.famLv(selF)} / ${heroLv}${slotOf(sel) ? ` · ${FAM_SLOT_TAG[slotOf(sel)]} 중` : ' · 대기'}`} onClose={() => setSel(null)}
            footer={<div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {slotOf(sel) ? <button onClick={() => { setSave(E.setFamTeam(save, slotOf(sel), null)); flash('편성 해제'); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 13, gridColumn: 'span 2' }}>편성 해제</button> : <>
                <button disabled={!E.famSlotOpen(save, 'main')} onClick={() => { setSave(E.setFamTeam(save, 'main', sel)); flash('동행으로 편성'); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 13, fontWeight: 800 }}>★ 동행으로</button>
                {(() => { const sl = ['sub1', 'sub2', 'sub3'].find(x => E.famSlotOpen(save, x) && !team[x]) || (E.famSlotOpen(save, 'sub1') ? 'sub1' : null); return <button disabled={!sl} onClick={() => { setSave(E.setFamTeam(save, sl, sel)); flash(`${FAM_SLOT_TAG[sl]}에 편성`); }} className="ui-press" style={{ height: 42, border: `1px solid ${MS.line}`, color: sl ? MS.violet : PALETTE.textDim, background: 'transparent', fontSize: 13 }}>{sl ? `${FAM_SLOT_TAG[sl]}에 편성` : '보조 칸 잠김'}</button>; })()}
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
              {selF.grade === 'violet' && (() => {
                const t = F.famTrans(selF); const full = t >= F.FAM_TRANS.max; const can = F.famCanTranscend(selF); const tc = F.famTransCost(selF); const ok = can && souls >= tc;
                return (
                  <div className="mt-2" style={{ padding: 10, borderRadius: MS.r, border: `1px solid ${MS.violet}`, background: 'rgba(208,122,232,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <b style={{ fontSize: 13, color: MS.violet }}>◈ 초월 {t} / {F.FAM_TRANS.max}</b>
                      <span className="flex gap-1">{Array.from({ length: F.FAM_TRANS.max }, (_, i) => <span key={i} style={{ width: 16, height: 6, borderRadius: 3, background: i < t ? MS.violet : '#ffffff1a' }} />)}</span>
                    </div>
                    <div className="mt-1" style={{ fontSize: 11.5, color: PALETTE.text, lineHeight: 1.5 }}>
                      단계마다 능력치·보조 효과 <b style={{ color: MS.gold }}>+{Math.round(F.FAM_TRANS.statPct * 100)}%</b> (지금 +{Math.round(F.FAM_TRANS.statPct * t * 100)}%) · 초월 {F.FAM_TRANS.skillAt}에서 초월 스킬 <b style={{ color: MS.violet }}>「{F.famTransSkill(sel).name}」</b> {F.famHasTransSkill(selF) ? '개방됨' : '개방'}
                    </div>
                    <button disabled={!ok} onClick={() => {
                      const r = E.transcendFam(save, sel); if (!r.result) return; setSave(r.save);
                      const nf = r.save.fams[sel];
                      flash(r.result === 'success' ? `초월 성공! ◈${F.famTrans(nf)}${F.famHasTransSkill(nf) && F.famTrans(nf) === F.FAM_TRANS.skillAt ? ` — 초월 스킬 「${F.famTransSkill(sel).name}」 개방` : ''}` : `초월 실패 — 잃은 것은 사역혼뿐 · 다음 성공률 ${Math.round(F.famTransRate(nf) * 100)}%`);
                    }} className="ui-press w-full mt-2" style={{ height: 40, fontSize: 12.5, fontWeight: 800, border: `1px solid ${ok ? MS.violet : MS.line}`, background: ok ? 'rgba(208,122,232,0.18)' : 'transparent', color: ok ? MS.violet : PALETTE.textDim }}>
                      {full ? '초월 완료' : !can ? `강화 +${F.FAM_TUNING.maxPlus}에서 초월 도전` : `◈ 초월 ${t}→${t + 1} · 🔮 ${tc} · 성공률 ${Math.round(F.famTransRate(selF) * 100)}%`}
                    </button>
                    {!full && <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>실패해도 강화·초월 단계는 그대로 · 실패할 때마다 다음 성공률 +{Math.round(F.FAM_TRANS.pityAdd * 100)}%p</div>}
                  </div>
                );
              })()}
              <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12, color: PALETTE.text, lineHeight: 1.55 }}>
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
              <MainFamCard k={k} f={f} heroLv={heroLv} famPct={famPct} slot={slotOf(k)} curSub={isMain ? undefined : curVals} cmp={isMain && curF ? F.famStats(curK, curF, heroLv, famPct) : null} dim={others} hideSub={isMain} onClick={() => { setSave(E.setFamTeam(save, pickSlot, k)); setPickSlot(null); }} />
            </div>
            <button onClick={() => setPreview({ after: E.setFamTeam(save, pickSlot, k), title: `🐾 ${slotLabel}: ${F.famName(k)}(으)로 바꾸면` })} className="ui-press flex-none" aria-label="효율 미리보기" style={{ width: 44, borderRadius: 12, border: `1px dashed ${PALETTE.legendary}88`, color: PALETTE.legendary, background: 'transparent', fontSize: 16 }}>📊</button>
          </div>
        );
        const others = list.filter(([k]) => k !== curK && slotOf(k));
        const rest = list.filter(([k]) => !slotOf(k));
        return (
          <BottomSheet title={`${slotLabel} 편성`} onClose={() => setPickSlot(null)} maxHeight="80%">
            <div className="flex flex-col gap-1.5">
              <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{isMain ? '동행 칸 = 함께 싸운다 · ▲▼ = 지금 동행과 비교한 능력치' : '보조 칸 = 효과만 준다 · ▲▼ = 지금 이 칸의 사역마와 비교'} · 📊 = 사냥 효율 미리보기</div>
              {grpHead(`지금 ${slotLabel} 칸`)}
              {curF ? <MainFamCard k={curK} f={curF} heroLv={heroLv} famPct={famPct} slot={pickSlot} mark hideSub={isMain} onClick={() => setPickSlot(null)} />
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
