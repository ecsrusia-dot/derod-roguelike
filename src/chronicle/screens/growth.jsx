// ============================================
// chronicle/screens/growth.jsx — 황혼 연대기 · 성장 (정보·스킬·특성·전승·능력치 배분)
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { GlassPanel } from '../../components/ui/CommonUI.jsx';
import { InfoSection, HiNum } from '../../components/ui/InfoBlocks.jsx';
import { CHRONICLE_TUNING, CHRONICLE_SKILLS, STAT_META, STAT_KEYS, SKILL_MAX_LV, SLOTS, chronicleClass, classSkills, describeSkill, expNeedFor, rebirthExpMult, REBIRTH, REBIRTH_BRANCHES, rebirthBranches , unitTitle } from '../data.js';
import * as E from '../engine.js';
import * as TL from '../talents.js';
import * as R from '../roster.js';
import * as GE from '../gearEval.js';
import { statLine, Header, Wallet, Bar, XP_HERO, FamSynergyNote, MainKvRows, MainTabs, MS, CLASS_PATH, MainSecHead, MainKvGrid, MainModal, MainCell } from './common.jsx';
import { useGearEval, effSort, EvalFooter, MainGearCard, CMP_UP, MainItemModal } from './gear.jsx';

// ===== 전승 (1.220.0) =====
function RebirthSheet({ save, cid, onClose, onRebirth }) {
  // 1.256.0 — 본편 카드 창 (시안 ㊳)
  const u = save.units[cid];
  const fixed = u.rebirth?.branch;
  const [pick, setPick] = useState(fixed || null);
  const [confirm, setConfirm] = useState(false);
  const EXTRA = { healFromAtk: (v) => `공격력의 ${Math.round(v * 100)}%를 회복력으로`, armorPen: (v) => `방어 관통 +${Math.round(v * 100)}%`, spdPct: (v) => `속도 +${Math.round(v * 100)}%` };
  const fxText = (fx) => Object.entries(fx).map(([k, v]) => (EXTRA[k] ? EXTRA[k](v) : statLine({ [k]: v }))).join(' · ');
  const next = (u.rebirth?.count || 0) + 1;
  const pb = pick && REBIRTH_BRANCHES[pick];
  return (
    <MainModal kicker="REBIRTH" title={`${next}차 전승`} color={MS.gold} badge={`Lv.${u.lv}`} sub={fixed ? '갈래는 첫 전승 때 고정되어 바꿀 수 없다' : '갈래는 한 번 고르면 바꿀 수 없다'} onClose={onClose}
      footer={!confirm
        ? <button disabled={!pick} onClick={() => setConfirm(true)} className="ui-press" style={{ height: 44, fontSize: 14, fontWeight: 800, border: `1px solid ${pick ? MS.gold : MS.line}`, background: 'transparent', color: pick ? MS.gold : PALETTE.textDim }}>{pb ? `${pb.name}(으)로 전승` : '갈래를 고르세요'}</button>
        : <button onClick={() => onRebirth(pick)} className="ui-press" style={{ height: 44, fontSize: 14, fontWeight: 800, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.22)', color: '#ff8a7e' }}>정말 전승한다 — Lv.1로 돌아간다</button>}>
      <MainSecHead title="바 뀌 는 것" />
      <MainKvRows rows={[
        { l: '레벨·스킬·특성', v: 'Lv.1 초기화', c: '#e06a5f' }, { l: '경험치 (Lv.100 미만)', v: `×${REBIRTH.regrowExp}`, c: '#8fd08a' },
        { l: '적 HP', v: `+${Math.round(REBIRTH.enemyHp * next * 100)}%`, c: '#ff6ad5' }, { l: '적 공격', v: `+${Math.round(REBIRTH.enemyAtk * next * 100)}%`, c: '#ff6ad5' },
        { l: '공격·HP·방어 영구', v: `+${Math.round(REBIRTH.bonusPct * next * 100)}%`, c: MS.gold }, { l: '장비', v: '레벨 맞춤 착용', c: '#8fd08a' },
        { l: '갈래 첫 스킬', v: '즉시 습득', c: '#8fd08a' }, { l: '사역마', v: '내 레벨까지 힘을 냄' },
        { l: '레벨 상한', v: `Lv.${CHRONICLE_TUNING.maxLevel} → ${REBIRTH.levelCap}`, c: MS.gold },
      ]} />
      <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.5 }}>장비는 <b style={{ color: PALETTE.text }}>장비 레벨 ≤ 내 레벨</b>일 때만 착용 효과 · 전승 장비·갈래 유니크가 떨어지기 시작한다</div>
      <MainSecHead title="갈 래 선 택" />
      <div className="flex flex-col gap-1.5 mt-1">
        {rebirthBranches(cid).map(b => {
          const on = pick === b.id;
          const locked = fixed && fixed !== b.id;
          const skills = classSkills(cid, b.id).filter(s => s.branch === b.id);
          return (
            <button key={b.id} disabled={!!locked} onClick={() => { setPick(b.id); setConfirm(false); }} className="ui-press text-left" style={{ padding: 10, border: `1.5px solid ${on ? b.color : MS.line}`, background: on ? `${b.color}18` : MS.box, opacity: locked ? 0.35 : 1 }}>
              <div className="flex items-baseline justify-between gap-2"><b style={{ fontSize: 15, color: b.color }}>{b.name}</b><span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{b.type}{on ? ' · ✓ 선택' : ''}</span></div>
              <div style={{ fontSize: 12, color: PALETTE.text }}>{b.desc}</div>
              <div className="mt-0.5" style={{ fontSize: 11.5, color: MS.gold }}>기본 효과 {fxText(b.fx)}</div>
              {on && <div className="mt-1 flex flex-col gap-0.5">{skills.map(s => (
                <div key={s.id} className="flex items-baseline justify-between gap-2" style={{ fontSize: 11.5 }}>
                  <span className="flex-none" style={{ color: PALETTE.text }}>✦ {s.name} <span style={{ color: PALETTE.textDim }}>Lv.{s.reqLv}</span></span>
                  <span className="text-right" style={{ color: PALETTE.textDim }}>{describeSkill(s, 1)}</span>
                </div>
              ))}</div>}
            </button>
          );
        })}
      </div>
    </MainModal>
  );
}

// ===== 특성 트리 (1.224.0 — 갈래 3개 × 5단) =====
function TalentPanel({ save, setSave, cid }) {
  const u = save.units[cid];
  const trees = TL.talentTrees(cid, u.rebirth?.branch);
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
      <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: `repeat(${trees.length}, minmax(0, 1fr))` }}>
        {trees.map((t, i) => {
          const on = i === tab;
          return (
            <button key={t.id} onClick={() => setTab(i)} className="ui-press" style={{ padding: '7px 4px', borderRadius: 10, border: `1.5px solid ${on ? t.color : 'var(--ui-line)'}`, background: on ? `${t.color}22` : 'transparent', color: on ? t.color : PALETTE.textDim }}>
              <div className="font-semibold truncate" style={{ fontSize: trees.length > 3 ? 12 : 13 }}>{t.branch ? '✦ ' : ''}{t.name}</div>
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
          {cost.scrolls > 0 && <div style={{ fontSize: 11, color: PALETTE.textDim }}>주문서는 보스·던전 보스·탑 보스에서 유니크와 같은 확률로 떨어진다. Lv.61부터 10레벨마다 1장씩 더 필요.</div>}
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
export function PartyView({ save, setSave, onBack, onForge }) {
  const cid = save.hero;
  const [slotPick, setSlotPick] = useState(null);
  const [eqInfo, setEqInfo] = useState(null); // 장비 정보 (1.252.0)
  // 1.277.1 — 성장 화면에서도 가방 장비의 실전 효율 (장비 탭 안내 · 교체 창)
  const uEq = save.units[cid]?.equip || {};
  const gearCands = save.inventory.filter(i => !Object.values(uEq).includes(i.uid) && E.itemUsable(i, cid));
  const gearEv = useGearEval(save, gearCands);
  const slotHint = (slotId) => {
    const list = gearCands.filter(i => i.slot === slotId);
    if (!list.length) return { n: 0, t: '가방에 이 부위 장비 없음', c: PALETTE.textDim };
    const infos = list.map(i => gearEv.info(i));
    if (infos.some(x => x.state === 'pending')) return { n: list.length, t: `가방 후보 ${list.length}개 · 효율 계산 중…`, c: PALETTE.textDim };
    const best = Math.max(0, ...infos.filter(x => x.state === 'ok' && !x.atLv).map(x => (x.full ? x.full.delta : x.delta)));
    return best >= 0.005
      ? { n: list.length, better: true, t: `가방에 더 좋은 장비 · 최고 효율 ▲${Math.round(best * 1000) / 10}%`, c: CMP_UP }
      : { n: list.length, t: `가방 후보 ${list.length}개 · 더 좋은 장비 없음`, c: PALETTE.textDim };
  };
  const gearBetter = SLOTS.filter(sl => slotHint(sl.id).better).length;
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
          <div className="chr-port flex-none" style={{ width: 84, height: 84, '--edge': cls.color, '--glow': `${cls.color}55` }}><img src={cls.image} alt="" className="w-full h-full object-cover" style={{ borderRadius: 22, objectPosition: '50% 25%' }} /></div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, letterSpacing: 4, color: cls.color }}>{CLASS_PATH[cid] || 'PATH'}</div>
            <div className="font-bold" style={{ fontSize: 22, color: PALETTE.text, lineHeight: 1.2 }}><span className="chr-gtxt" style={{ '--tone': MS.gold, '--tone2': cls.color }}>{unitTitle(u, cid)}</span> <span style={{ fontSize: 14, color: MS.gold }}>Lv.{u.lv}</span> <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}>/ {E.levelCapOf(save)}</span></div>
            <div className="flex flex-wrap gap-1" style={{ margin: '4px 0 5px', fontSize: 11.5 }}>
              <span className="chr-pill">♡ {d.maxHp.toLocaleString()}</span>
              <span className="chr-pill" style={{ color: MS.gold, borderColor: 'rgba(232,176,74,.45)' }}>⚔ {E.unitPower(save, cid).toLocaleString()}</span>
              <span className="chr-pill" style={{ color: PALETTE.textDim }}>{cls.role}</span>
            </div>
            {u.rebirth?.count > 0 && <div style={{ fontSize: 11.5, color: REBIRTH_BRANCHES[u.rebirth.branch].color, fontWeight: 700 }}>✦ 전승 {u.rebirth.count}회 · {REBIRTH_BRANCHES[u.rebirth.branch].name} <span style={{ fontWeight: 400, color: PALETTE.textDim }}>({REBIRTH_BRANCHES[u.rebirth.branch].type} · 능력치 +{Math.round(REBIRTH.bonusPct * u.rebirth.count * 100)}%{E.regrowExpMult(u) > 1 ? ` · 경험치 ×${E.regrowExpMult(u)}` : ''})</span></div>}
            <Bar v={u.exp} max={expNeedFor(u)} color={XP_HERO} h={6} />
            <div className="flex justify-between" style={{ fontSize: 11, color: PALETTE.textDim, marginTop: 2 }}><span>{u.lv >= E.levelCapOf(save) && u.lv < CHRONICLE_TUNING.maxLevel ? <span style={{ color: '#e8b04a' }}>🔒 레벨 상한 — 다른 캐릭터 Lv.{R.ROSTER.unlockLv}에 +{R.ROSTER.perChar}</span> : '경험치'}</span><span>{u.exp.toLocaleString()} / {expNeedFor(u).toLocaleString()}</span></div>
          </div>
        </div>
        <MainTabs value={gtab} onChange={pickGtab} size={13.5} items={[['info', '정보', u.points > 0], ['gear', '장비', gearBetter > 0], ['skill', '스킬', classSkills(cid, u.rebirth?.branch).some(x => E.canLearn(u, x))], ['talent', '특성', u.sp > 0]]} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

        {gtab === 'info' && <>
        {E.canRebirth(save, cid) && (
          <button onClick={() => setRebirthOpen(true)} className="ui-press ui-sheen w-full text-left flex-none" style={{ padding: 12, borderRadius: 14, border: `1.5px solid ${PALETTE.legendary}`, background: `${PALETTE.legendary}18` }}>
            <div className="font-bold" style={{ fontSize: 14, color: PALETTE.legendary }}>{u.rebirth?.count ? `✦ ${u.rebirth.count + 1}차 전승 가능 (선택)` : `✦ 전승 가능 — Lv.${REBIRTH.reqLevel} 달성`}</div>
            <div style={{ fontSize: 12, color: PALETTE.textDim }}>{u.rebirth?.branch ? `능력치 +${Math.round(REBIRTH.bonusPct * 100)}% 추가 · 적도 더 강해짐 · 레벨 1부터 다시 — 3부를 계속하려면 누르지 않아도 된다` : '두 갈래 중 하나를 골라 새로 태어난다 · 레벨 1부터 다시'}</div>
          </button>
        )}

        {/* 능력치 — 본편 정보창 스타일 (1.247.0) */}
        <div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {STAT_KEYS.map(k => (
              <button key={k} onClick={() => setStatPick(k)} className={`ui-press text-center chr-cell${k === cls.main ? ' chr-cell-hot' : ''}`} style={{ padding: '7px 0' }}>
                <div style={{ fontSize: 12, color: PALETTE.textDim }}>{STAT_META[k].label}</div>
                <div className="font-bold" style={{ fontSize: 20, color: k === cls.main ? MS.gold : PALETTE.text, lineHeight: 1.2 }}>{u.stats[k]}</div>
                {u.stats[k] > E.statSoftCap(u) && <div style={{ fontSize: 11, color: '#e07a6a' }}>효율 감소</div>}
              </button>
            ))}
          </div>
          <div className="text-center mt-1.5" style={{ fontSize: 11.5, color: PALETTE.textDim }}>능력치를 누르면 네 능력치를 한 번에 배분 · 남은 포인트 <b style={{ color: u.points ? MS.gold : PALETTE.textDim }}>{u.points}</b></div>
          <div className="text-center" style={{ fontSize: 11, color: PALETTE.textDim }}>한 능력치가 <b style={{ color: PALETTE.text }}>{E.statSoftCap(u)}</b>(레벨 × 1.5)을 넘으면 넘친 몫은 효과 30% — 여러 능력치에 나눠 찍는 게 유리</div>
          {E.canResetStats(save, cid) && <button onClick={() => setSave(E.resetStats(save, cid))} className="ui-press w-full mt-2" style={{ height: 34, borderRadius: 10, border: `1px solid ${MS.line}`, color: PALETTE.text, background: 'transparent', fontSize: 12.5 }}>↺ 능력치 재분배 — {E.statResetCost(u) ? `🪙${E.statResetCost(u).toLocaleString()}` : '첫 1회 무료'}</button>}
          {u.points > 0 && <button onClick={() => setStatPick(cls.main)} className="ui-press ui-sheen w-full mt-2" style={{ height: 40, borderRadius: 10, border: `1px solid ${MS.gold}`, color: MS.gold, background: 'rgba(232,176,74,0.10)', fontSize: 13, fontWeight: 800 }}>능력치 배분하기 — {u.points}포인트</button>}

          <MainSecHead title="전 투 수 치" />
          <MainKvGrid cells onPick={setRowInfo} rows={[
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

        </>}

        {/* 장비 탭 (1.277.1 PM 「장비가 너무 밑에 있다 → 정보 다음 탭으로」) — 착용 4부위 + 가방 후보 효율 */}
        {gtab === 'gear' && <>
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
            <span className="chr-head">착용 장비</span>
            <span className="chr-pill" style={{ fontSize: 12, color: MS.gold, borderColor: 'rgba(232,176,74,.45)' }}>⚔ {SLOTS.reduce((t, sl) => { const it = save.inventory.find(i => i.uid === u.equip[sl.id]); return t + (it ? E.itemPower(it) : 0); }, 0).toLocaleString()}</span>
          </div>
          {gearEv.target && <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginBottom: 7 }}>⚔ 효율 기준 <b style={{ color: PALETTE.text }}>{GE.evalTargetLabel(gearEv.target)}</b></div>}
          <div className="flex flex-col gap-2">
            {SLOTS.map(sl => {
              const it = save.inventory.find(i => i.uid === u.equip[sl.id]);
              const hint = slotHint(sl.id);
              const swap = (
                <div className="flex items-center gap-2 w-full">
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 11.5, color: hint.c }}>{hint.t}</span>
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setSlotPick(sl.id); }} className={`ui-press flex-none${hint.better ? ' chr-btn-pri' : ''}`} style={{ padding: '4px 13px', fontWeight: 800, fontSize: 12.5, border: `1px solid ${MS.gold}`, color: MS.gold }}>⇄ 교체</span>
                </div>
              );
              if (!it) return (
                <button key={sl.id} onClick={() => setSlotPick(sl.id)} className="ui-press w-full text-left" style={{ padding: '11px 12px', border: `1px dashed ${MS.line}`, background: 'transparent', color: PALETTE.textDim, fontSize: 12.5 }}>
                  <div>{sl.icon} {sl.label} — 비어 있음 (눌러서 장착)</div>
                  {hint.n > 0 && <div style={{ fontSize: 11.5, color: MS.gold, marginTop: 2 }}>가방에 낄 수 있는 장비 {hint.n}개</div>}
                </button>
              );
              return <MainGearCard key={sl.id} it={it} syncLv={E.wearSyncLv(it, u)} onClick={() => setEqInfo(it.uid)} footer={swap} />;
            })}
          </div>
          <div className="mt-2" style={{ fontSize: 11, color: PALETTE.textDim }}>장비를 누르면 정보 · 「교체」는 가방의 같은 부위 장비를 효율 순으로 보여 준다</div>
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
                  <span className="chr-head">액티브 스킬</span>
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
                  쓸 수 있는 스킬이 여럿이면 쿨타임이 아니라 <b style={{ color: PALETTE.text }}>상황 순서</b>로 고른다: 회복(위급) → 보호막 → 강화 → 도발(위급) → 지속 피해(안 걸린 적이 있을 때) → 광역(적 2명+) → 단일 중 가장 센 스킬 → 없으면 기본 공격<br />
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
              <button onClick={() => { setEqInfo(null); setSlotPick(it.slot); }} className="ui-press chr-btn-pri" style={fb({ color: MS.gold, borderColor: MS.gold, fontWeight: 800 })}>⇄ 교체</button>
              <button onClick={() => { setSave(E.unequipItem(save, cid, it.slot)); setEqInfo(null); }} className="ui-press" style={fb()}>착용 해제</button>
              <button onClick={() => { setEqInfo(null); onForge?.(); }} className="ui-press" style={fb()}>⚒ 대장간</button>
            </div>} />
        );
      })()}
      {slotPick && (() => {
        // 1.254.0 장비 카드 + 비교 (시안 ㉜) · 1.277.1 실전 효율 표시·효율 순 정렬
        const cur = save.inventory.find(i => i.uid === u.equip[slotPick]);
        const sl = SLOTS.find(x => x.id === slotPick);
        const all = effSort(gearCands.filter(i => i.slot === slotPick), gearEv);
        const cands = [...all.filter(i => E.canWear(i, u)), ...all.filter(i => !E.canWear(i, u))];
        return (
          <MainModal kicker={`${sl.label} 장 착`} title={cur ? `지금: ${E.itemName(cur)}${cur.plus ? ` +${cur.plus}` : ''}` : `${sl.label} 비어 있음`} badge={cur ? `⚔ ${E.itemPower(cur).toLocaleString()}` : null} sub={gearEv.target ? `효율 기준 · ${GE.evalTargetLabel(gearEv.target)}` : null} onClose={() => setSlotPick(null)}
            footer={cur ? <button onClick={() => { setSave(E.unequipItem(save, cid, slotPick)); setSlotPick(null); }} className="ui-press" style={{ height: 40, fontSize: 13, border: `1px solid ${MS.line}`, background: 'transparent', color: PALETTE.text }}>착용 해제</button> : null}>
            <div className="flex flex-col gap-2">
              {cands.map(it => { const wear = E.canWear(it, u); const equip = () => { setSave(E.equipItem(save, cid, it.uid)); setSlotPick(null); };
                return <MainGearCard key={it.uid} it={it} dim={!wear} cmp={cur || null} evalInfo={gearEv.info(it)} onClick={() => { if (wear) equip(); }}
                  footer={<EvalFooter it={it} cur={cur} info={gearEv.info(it)} canWear={wear} needLv={it.ilv} onEquip={equip} />} />; })}
              {!cands.length && <div className="text-center py-4" style={{ fontSize: 12.5, color: PALETTE.textDim }}>가방에 착용할 수 있는 장비가 없습니다{slotPick === 'accessory' ? '' : ` (${cls.name} 전용)`}</div>}
              <div style={{ fontSize: 11, color: PALETTE.textDim }}>효율 높은 순 · 카드를 누르면 바로 장착 · 창고에 있는 장비는 먼저 가방으로 꺼내야 한다</div>
            </div>
          </MainModal>
        );
      })()}
      {skillInfo && (
        <MainSkillModal s={skillInfo} lv={u.skills[skillInfo.id] || 0} u={u} d={d} sp={u.sp} can={E.canLearn(u, skillInfo)}
          onLearn={() => setSave(E.learnSkill(save, cid, skillInfo.id))} onClose={() => setSkillInfo(null)} />
      )}
      {statPick && <StatAllocModal save={save} cid={cid} focus={statPick} onClose={() => setStatPick(null)} onApply={(plan) => { setSave(E.addStats(save, cid, plan)); setStatPick(null); }} />}
      {rowInfo && (
        <MainModal kicker="능 력 치 설 명" title={rowInfo.label} color={rowInfo.color || MS.red} badge={String(rowInfo.value)} onClose={() => setRowInfo(null)}>
          <div style={{ fontSize: 13, color: PALETTE.text, lineHeight: 1.6 }}>{rowInfo.desc || `${rowInfo.label} — 장비·특성·사역마·원정대 버프·전승을 모두 합산한 값.`}</div>
          <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>◇ 출처: 장비 옵션 · 유니크 · 특성 · 사역마(보조·보유·인연) · 원정대 버프 · 전승 갈래 합산</div>
        </MainModal>
      )}
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
  dot: '이 스킬의 지속 피해가 아직 안 걸린 적이 있을 때 (단일·광역 공격보다 먼저)',
};

const skillTarget = (s) => (/heal|shield|buff|hot/i.test(s.kind) ? (s.kind === 'heal' || s.kind === 'hot' || s.kind === 'healShield' || s.kind === 'healBuff' ? '아군 1명' : '아군 전체') : s.kind === 'rage' || s.kind === 'taunt' ? '자신' : s.kind === 'passive' ? '자신' : s.kind === 'aoe' || (s.kind === 'dot' && s.all) ? '적 전체' : '적 1명');

const skillParts = (t) => String(t).split(/, | — | \+ (?=\d+턴간|보호막|그 적|방어|받는)/).filter(Boolean);

const skillPower = (s, lv) => (s.kind === 'passive' ? null : Math.round((s.base + s.perLv * (Math.max(1, lv) - 1)) * 100));

// ===== 스킬 쿨타임 표시 (1.240.1) — 엔진 규칙: 쓴 뒤 대기 = max(0, 재사용 - 단축), 단축은 장비·특성 합산 최대 2 =====
// 1.241.0: cdr 인자 = deriveUnit 결과(d) — 모든 스킬 단축 + 스킬별 단축을 합쳐 계산
const cdOf = (s, d) => (d ? E.skillCdrOf(d, s.id) : 0);

const cdWait = (s, d) => Math.max(0, (s.cd || 0) - cdOf(s, d));

function CdChip({ s, cdr: d }) {
  if (s.kind === 'passive') return <span style={{ fontSize: 11, color: PALETTE.textDim }}>· 패시브</span>;
  if (!s.cd) return null;
  const cdr = cdOf(s, d);
  const w = cdWait(s, d);
  return (
    <span style={{ fontSize: 11, color: cdr ? '#7fd1c8' : PALETTE.textDim, whiteSpace: 'nowrap' }}>
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
  ['openInferno', '이프리트의 낙인 (매 턴 공격력의)', 'pct'], ['rageDouble', '광폭화 중 모든 공격 2회', 'flag'], ['rageTurnsAdd', '광폭화 지속', 'turn'], ['rageLifesteal', '광폭화 중 흡혈 2배', 'flag'], ['multiHitsAdd', '연속 화살 타수', 'num'], ['spiritArrow', '정령 화살 확률', 'pct'],
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
  rageTurnsAdd: '광폭화가 이 턴만큼 더 오래 유지된다.', rageLifesteal: '광폭화가 켜진 동안 흡혈량이 2배가 된다.',
  openInferno: '전투 시작 순간 적 전체에 거는 화상. 스킬 「겁화」와 별개로, 턴을 쓰지 않고 쿨타임과도 무관하다. 피해 = 매 턴 공격력 × 이 비율 × (1 + 지속 피해 %) · 3턴(지속 시간 배율 적용). 출처: 이프리트의 계약서 60% + 특성 「낙인의 불씨」 1점당 4%.',
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
      <div style={{ fontSize: 12, fontWeight: 800, color: lv ? MS.gold : PALETTE.textDim }}>{lv ? <>Lv.{lv}{lv >= SKILL_MAX_LV ? <span style={{ fontSize: 11, marginLeft: 4, color: MS.red }}>MAX</span> : <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}> / {SKILL_MAX_LV}</span>}</> : '미습득'}</div>
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
      <div className="mt-2" style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5, color: PALETTE.text }}>
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

// ===== 능력치 한 번에 배분 (1.277.0) — 네 능력치를 모두 보여 주고 슬라이더·±버튼으로 계획한 뒤 한 번에 적용 =====
const ALLOC_PREVIEW = [
  ['maxHp', 'HP', 'n'], ['atk', '공격력', 'n'], ['def', '방어', 'n'], ['healPower', '치유력', 'n'], ['spd', '속도', 'n'],
  ['crit', '치명', 'p'], ['critMult', '치명 피해', 'p'], ['dodge', '회피', 'p'], ['skillDmg', '스킬 피해', 'p'], ['armorPen', '방어 관통', 'p'], ['dmgReduce', '받는 피해 감소', 'p'], ['chain', '추가 타격', 'p'],
];

function StatAllocModal({ save, cid, focus, onClose, onApply }) {
  const u = save.units[cid]; const cls = chronicleClass(cid);
  const [plan, setPlan] = useState({});
  const [open, setOpen] = useState(null); // 설명을 펼친 능력치 (누르면 전체 문구)
  const used = STAT_KEYS.reduce((t, k) => t + (plan[k] || 0), 0);
  const left = (u.points || 0) - used;
  const cap = E.statSoftCap(u);
  const set = (k, n) => setPlan(p => {
    const others = STAT_KEYS.reduce((t, x) => t + (x === k ? 0 : (p[x] || 0)), 0);
    return { ...p, [k]: Math.max(0, Math.min((u.points || 0) - others, Math.round(n))) };
  });
  const before = E.deriveUnit(save, cid);
  const after = used ? E.deriveUnit(E.addStats(save, cid, plan), cid) : before;
  const fmt = (v, t) => (t === 'p' ? `${Math.round((v || 0) * 1000) / 10}%` : Math.round(v || 0).toLocaleString());
  const diffs = ALLOC_PREVIEW.filter(([k, , t]) => fmt(before[k], t) !== fmt(after[k], t));
  const step = (k, d, label) => {
    const on = d < 0 ? (plan[k] || 0) > 0 : left > 0;
    return <button key={label} disabled={!on} onClick={() => set(k, (plan[k] || 0) + d)} className="ui-press" style={{ height: 30, fontSize: 12.5, fontWeight: 700, border: `1px solid ${on ? (d > 0 ? MS.gold : MS.line) : MS.line}`, color: on ? (d > 0 ? MS.gold : PALETTE.text) : PALETTE.textDim, background: MS.box, borderRadius: MS.r, opacity: on ? 1 : 0.45 }}>{label}</button>;
  };
  // 1.280.1 — 「상한」: 효율 감소가 시작되기 직전(레벨 × 1.5)까지 한 번에 맞춘다 (+50 버튼 대체). 포인트가 모자라면 있는 만큼
  const capBtn = (k) => {
    const want = Math.max(0, cap - u.stats[k]); const cur = plan[k] || 0;
    const on = want !== cur && (want < cur || left > 0);
    return <button key="cap" disabled={!on} onClick={() => set(k, want)} aria-label={`${STAT_META[k].label} 상한 ${cap}까지`} className="ui-press" style={{ height: 30, fontSize: 12.5, fontWeight: 700, border: `1px solid ${on ? '#e8b04a' : MS.line}`, color: on ? '#e8b04a' : PALETTE.textDim, background: on ? 'rgba(232,176,74,0.10)' : MS.box, borderRadius: MS.r, opacity: on ? 1 : 0.45, whiteSpace: 'nowrap' }}>상한</button>;
  };
  const autoPlan = () => setPlan(E.autoAllocatePlan(save, cid));
  return (
    <MainModal kicker="능 력 치 배 분" title={`남은 포인트 ${left}`} color={MS.gold} badge={used ? `배분 ${used}` : `보유 ${u.points || 0}`} sub={`${cls.name} Lv.${u.lv} · 한 능력치가 ${cap}을 넘으면 넘친 몫은 효과 30% · 「상한」 = ${cap}까지 한 번에`} onClose={onClose}
      footer={<div className="grid gap-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <button disabled={!used} onClick={() => setPlan({})} className="ui-press" style={{ height: 44, fontSize: 13, border: `1px solid ${MS.line}`, color: used ? PALETTE.text : PALETTE.textDim, background: 'transparent', opacity: used ? 1 : 0.5 }}>되돌리기</button>
        <button disabled={!used} onClick={() => onApply(plan)} className={`ui-press${used ? ' chr-btn-pri' : ''}`} style={{ height: 44, fontSize: 14, fontWeight: 800, border: `1px solid ${used ? MS.red : MS.line}`, color: used ? '#ff8a7e' : PALETTE.textDim, background: used ? 'rgba(224,87,76,0.18)' : 'transparent', opacity: used ? 1 : 0.5 }}>{used ? `${used}포인트 적용` : '배분할 능력치를 고르세요'}</button>
      </div>}>
      <div className="flex flex-col gap-1.5">
        {STAT_KEYS.map(k => {
          const add = plan[k] || 0; const now = u.stats[k]; const next = now + add; const main = k === cls.main;
          return (
            <div key={k} style={{ padding: '7px 10px 8px', border: `1px solid ${k === focus || add ? MS.gold : MS.line}`, background: MS.box, borderRadius: MS.r }}>
              <div className="flex items-baseline gap-2">
                <b style={{ fontSize: 14, color: main ? MS.gold : PALETTE.text }}>{STAT_META[k].label}</b>
                {main && <span style={{ fontSize: 11, padding: '0 5px', color: MS.gold, border: `1px solid ${MS.gold}88` }}>주 능력치</span>}
                <div className="flex-1" />
                <span style={{ fontSize: 13, color: PALETTE.textDim }}>{now}</span>
                {add > 0 && <><span style={{ fontSize: 12, color: PALETTE.textDim }}>→</span><b style={{ fontSize: 17, color: MS.gold }}>{next}</b><span style={{ fontSize: 12, color: '#8fd08a' }}>+{add}</span></>}
              </div>
              <div className={open === k ? '' : 'truncate'} onClick={() => setOpen(o => (o === k ? null : k))} style={{ fontSize: 11.5, color: PALETTE.textDim, lineHeight: 1.4, marginTop: 1 }}>{STAT_META[k].desc}</div>
              {next > cap && <div style={{ fontSize: 11, color: '#e07a6a', marginTop: 2 }}>⚠ {cap} 초과 {next - cap}점은 효과 30%만 적용</div>}
              <input type="range" aria-label={`${STAT_META[k].label} 배분`} min={0} max={Math.max(1, add + left)} step={1} value={add} disabled={!(add + left)} onChange={e => set(k, +e.target.value)} className="w-full" style={{ accentColor: MS.gold, height: 24, marginTop: 2, touchAction: 'pan-y' }} />
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                {step(k, -10, '−10')}{step(k, -1, '−1')}{step(k, 1, '+1')}{step(k, 10, '+10')}{capBtn(k)}{step(k, left, '전부')}
              </div>
            </div>
          );
        })}
      </div>
      {u.points > 0 && <button onClick={autoPlan} className="ui-press w-full mt-2" style={{ height: 36, border: `1px dashed ${MS.gold}`, color: MS.gold, background: 'transparent', fontSize: 12.5 }}>추천 비율로 채우기 ({Object.entries(cls.auto || {}).map(([k, v]) => `${STAT_META[k].label} ${v}`).join(' : ')})</button>}
      <MainSecHead title="적 용 하 면" />
      {diffs.length
        ? <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: '1fr 1fr', fontSize: 12.5 }}>
          {diffs.map(([k, l, t]) => <div key={k} className="flex justify-between gap-2"><span style={{ color: PALETTE.textDim }}>{l}</span><span><span style={{ color: PALETTE.textDim }}>{fmt(before[k], t)} → </span><b style={{ color: '#8fd08a' }}>{fmt(after[k], t)}</b></span></div>)}
        </div>
        : <div style={{ fontSize: 12, color: PALETTE.textDim }}>슬라이더를 밀거나 버튼을 누르면 바뀌는 전투 수치가 여기에 나온다</div>}
    </MainModal>
  );
}
