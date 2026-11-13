// ============================================
// chronicle/screens/town.jsx — 황혼 연대기 · 마을 · 원정대 · 레이드
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { HiNum } from '../../components/ui/InfoBlocks.jsx';
import { CHRONICLE_TITLE, CHRONICLE_CLASSES, CHRONICLE_FIELDS, CHRONICLE_DUNGEONS, dungeonDef, DUNGEON_KEYS, FIELD_STAGES, chronicleClass, chronicleEnemyArt, expNeedFor, REBIRTH } from '../data.js';
import * as E from '../engine.js';
import * as R from '../roster.js';
import * as RD from '../raid.js';
import * as Q from '../quest.js';
import * as A from '../account.js';
import * as F from '../familiar.js';
import * as D from '../daily.js';
import { CENEMIES as ENEMIES } from '../enemies.js';
import { Header, Wallet, Bar, XP_HERO, expSnap, xpPct, MainKvRows, MS, CLASS_PATH, MainSecHead, MainModal } from './common.jsx';

// ===== 원정대 레이드 「다섯 봉인」 (1.231.0) =====
export function RaidView({ save, onBack, onFight }) {
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
          <span className="chr-head">다섯 봉인</span>
          <button onClick={() => setRules(true)} className="ui-press" style={{ fontSize: 12, padding: '4px 9px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, color: PALETTE.text }}>ⓘ 규칙</button>
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
            <div key={t.id} style={{ padding: 10, border: `1px solid ${unlocked ? MS.red : MS.line}`, background: MS.box, borderRadius: MS.r, opacity: prevOk ? 1 : 0.5 }}>
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
                          <img src={c.image} alt="" className="w-full object-cover" style={{ height: 30, objectPosition: '50% 20%', border: `1px solid ${ok ? '#8fd08a' : MS.line}`, filter: ok ? 'none' : 'grayscale(1) brightness(.45)' }} />
                          <div className="truncate" style={{ fontSize: 11, color: ok ? '#8fd08a' : '#e07a6a' }}>{r ? `${r.rebirth ? '✦' : ''}${r.lv}` : '없음'}</div>
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
export function RosterView({ save, setSave, flash, onBack, onSwitchChar, onRaid }) {
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
          <span className="chr-head">레벨 상한</span>
          <b style={{ fontSize: 17, color: MS.gold }}>Lv.{cap}</b>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[60, 70, 80, 90, 100].map(c => <div key={c} className="text-center" style={{ padding: '6px 0', fontSize: 12, fontWeight: cap === c ? 800 : 500, border: `1px solid ${cap >= c ? MS.gold : MS.line}`, background: MS.box, borderRadius: MS.r, color: cap >= c ? MS.gold : PALETTE.textDim }}>{c}</div>)}
        </div>
        <div className="mt-1.5" style={{ fontSize: 11.5, color: PALETTE.textDim }}>
          {hint ? <>다음: 캐릭터 <b style={{ color: MS.gold }}>{hint.need}명</b>이 Lv.{R.ROSTER.unlockLv} → 상한 Lv.{hint.next}</> : <b style={{ color: MS.gold }}>모든 상한 해제 완료</b>} · 지금 Lv.{R.ROSTER.unlockLv} 달성 {n60}명{!hint && <> · 전승자는 <b style={{ color: MS.gold }}>Lv.{REBIRTH.levelCap}</b>까지</>}
        </div>

        <MainSecHead title="원 정 대" right={<span style={{ fontSize: 11, color: PALETTE.textDim }}>누르면 주는 버프</span>} />
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {CHRONICLE_CLASSES.map(c => {
            const r = roster[c.id]; const me = c.id === save.hero;
            return (
              <button key={c.id} onClick={() => setDetail(c.id)} className="ui-press text-center" style={{ background: 'transparent', border: 'none', padding: 0, minWidth: 0 }}>
                <img src={c.image} alt="" className="w-full object-cover" style={{ height: 42, objectPosition: '50% 20%', border: `1.5px solid ${me ? MS.gold : r ? MS.strong : MS.line}`, filter: r ? 'none' : 'grayscale(1) brightness(.45)' }} />
                <div className="truncate" style={{ fontSize: 11, color: me ? MS.gold : r ? PALETTE.text : PALETTE.textDim }}>{r ? `${r.rebirth ? '✦' : ''}Lv.${r.lv}` : '없음'}</div>
              </button>
            );
          })}
        </div>

        <button onClick={onRaid} className="ui-press w-full text-left mt-3" style={{ padding: '9px 10px', border: `1px solid ${raidOk ? MS.red : MS.line}`, background: MS.box, borderRadius: MS.r }}>
          <div className="font-bold" style={{ fontSize: 13.5, color: raidOk ? '#ff8a7e' : PALETTE.textDim }}>⚔ 원정대 레이드 「다섯 봉인」 ›</div>
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{raidOk ? '다섯 캐릭터가 함께 싸운다 — 각자 자기 봉인을 깨야 보스에 닿는다' : '다섯 캐릭터 모두 Lv.60이 되면 입장'}</div>
        </button>

        <MainSecHead title={`${chronicleClass(save.hero).name.split('').join(' ')} 가 받 는 전 역 버 프`} />
        {buffSrc.length ? <>
          <MainKvRows rows={buffSrc.map(x => ({ l: `${x.name} Lv.${x.lv}`, v: R.rosterFxText(x.fx), c: '#8fd08a' }))} />
          <div className="mt-1" style={{ padding: '7px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12.5 }}><b style={{ color: MS.red }}>◇ 합계</b> <span style={{ color: '#8fd08a' }}>{R.rosterFxText(got)}</span></div>
        </> : <div style={{ padding: '8px 10px', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r, fontSize: 12, color: PALETTE.textDim }}>아직 없음 — 다른 캐릭터를 Lv.20 이상 키우면 생긴다</div>}

        <div className="flex items-center justify-between" style={{ margin: '14px 0 7px' }}>
          <span className="chr-head">원정대 의뢰</span>
          {qs.some(x => x.st.status === 'done') && <button onClick={() => { const r = R.claimAllRosterQuests(save); if (r.n) { setSave(r.save); flash(`원정대 의뢰 보상 ${r.n}건 수령`); } }} className="ui-press" style={{ fontSize: 12, padding: '3px 11px', fontWeight: 800, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.22)', color: '#ff8a7e' }}>모두 받기 {qs.filter(x => x.st.status === 'done').length}</button>}
          <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>받기 {qs.filter(x => x.st.status === 'done').length} · 진행 {qs.filter(x => x.st.status === 'progress').length} · 완료 {qs.filter(x => x.st.status === 'claimed').length}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {qs.map(({ q, st }) => {
            const done = st.status === 'done', claimed = st.status === 'claimed';
            return (
              <div key={q.id} style={{ padding: '7px 9px', border: `1px solid ${done ? MS.gold : MS.line}`, background: MS.box, borderRadius: MS.r, opacity: claimed ? 0.45 : 1, minWidth: 0 }}>
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
          <MainModal img={c.image} kicker="원 정 대" title={c.name} color={c.color} badge={r ? `Lv.${r.lv}` : '없음'} sub={r ? `${r.peak > r.lv ? `최고 Lv.${r.peak} · ` : ''}${r.rebirth ? `✦전승 ${r.rebirth}회 · ` : ''}「${buff.title}」` : '아직 만들지 않음'} onClose={() => setDetail(null)}
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
export function TownView({ save, acc, go, onExit, onSwitchChar, onClaimAll }) {
  const pend = A.pendingRewards(acc);
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
    const dB = D.dailyBadge(acc) + D.weeklyBadge(acc); if (dB) L.push({ id: 'daily', icon: '📅', t: `일일·주간 임무 보상 ${dB}건` });
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
    { id: 'daily', icon: '📅', label: '일일 · 주간 임무', sub: (() => { const n = D.DAILY_MISSIONS.filter(m => D.missionState(acc, m).status !== 'progress').length; const w = D.WEEKLY_MISSIONS.filter(m => D.weeklyMissionState(acc, m).status !== 'progress').length; return `오늘 ${n}/${D.DAILY_MISSIONS.length} · 주간 ${w}/${D.WEEKLY_MISSIONS.length}`; })(), badge: D.dailyBadge(acc) + D.weeklyBadge(acc) > 0 },
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
          <div className="chr-port flex-none" style={{ width: 78, height: 78, '--edge': cls.color, '--glow': `${cls.color}55` }}><img src={cls.image} alt="" className="w-full h-full object-cover" style={{ borderRadius: 22, objectPosition: '50% 25%' }} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div style={{ fontSize: 11, letterSpacing: 4, color: cls.color }}>{CLASS_PATH[save.hero] || 'PATH'}</div>
              <button onClick={onSwitchChar} className="ui-press flex-none" style={{ fontSize: 11.5, padding: '3px 8px', border: `1px solid ${MS.line}`, color: PALETTE.text, background: MS.box, borderRadius: MS.r }}>⇄ 변경</button>
            </div>
            <div className="font-bold" style={{ fontSize: 20, color: PALETTE.text, lineHeight: 1.2 }}><span className="chr-gtxt" style={{ '--tone': MS.gold, '--tone2': cls.color }}>{cls.name}</span> <span style={{ fontSize: 14, color: MS.gold }}>Lv.{hero.lv}</span> <span style={{ fontSize: 11, fontWeight: 400, color: PALETTE.textDim }}>/ {E.levelCapOf(save)} · {cls.role}</span></div>
            <div style={{ fontSize: 12.5, color: PALETTE.text }}>♡ {E.deriveUnit(save, save.hero).maxHp.toLocaleString()} · ⚔ 전투력 {E.unitPower(save, save.hero).toLocaleString()}</div>
            <div className="mt-1"><Bar v={hero.exp} max={expNeedFor(hero)} color={XP_HERO} h={5} /></div>
            <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>경험치 {Math.floor(hero.exp / Math.max(1, expNeedFor(hero)) * 100)}% · ▶ {goal}</div>
            <button onClick={() => go('fam')} className="ui-press w-full text-left mt-0.5 truncate" style={{ fontSize: 11, background: 'transparent', border: 'none', padding: 0, color: PALETTE.textDim }}>
              {fx ? <>🐾 <span style={{ color: MS.violet }}>{F.famName(fx.key)} Lv.{fx.lv}</span> · {F.famGrade(ff.grade).label}{ff.plus ? ` +${ff.plus}` : ''} · {fx.cap ? '주인공 레벨 도달' : `경험치 ${Math.floor(xpPct(fx))}%`}</> : '🐾 동행 사역마 없음 — 눌러서 편성'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ margin: '14px 0 7px' }}>
          <span className="chr-head">지금 할 일</span>
          {pend.total > 0
            ? <button onClick={onClaimAll} className="ui-press" style={{ fontSize: 12, padding: '4px 11px', fontWeight: 800, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.22)', color: '#ff8a7e' }}>🎁 보상 한 번에 받기 {pend.total}</button>
            : <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{todos.length}</span>}
        </div>
        {todos.length ? todos.map((d, i) => (
          <button key={i} onClick={() => go(d.id)} className="ui-press w-full flex items-center gap-2 text-left" style={{ minHeight: 40, padding: '8px 10px', marginTop: i ? 5 : 0, background: MS.box, borderRadius: MS.r, border: `1px solid ${MS.line}` }}>
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
                  <div style={{ fontSize: 11, color: PALETTE.textDim, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.sub}</div>
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
