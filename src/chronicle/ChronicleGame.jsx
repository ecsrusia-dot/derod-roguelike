// ============================================
// chronicle/ChronicleGame.jsx — 황혼 연대기 (전통 RPG) 화면
// ============================================
// 로직은 engine.js 순수 함수. 전투는 시작 순간 끝까지 계산·저장하고 화면은 재생만 한다
// (재생 중 새로고침해도 보상 중복·유실 없음).
// 저장: localStorage CHRONICLE_SAVE_KEY — 본편·아르카나와 완전 분리.
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../components/ui/CommonUI.jsx';
import { CHRONICLE_SAVE_KEY_V1, CHRONICLE_FIELDS, DUNGEON_TIERS, dungeonDef, FIELD_STAGES, BOOST } from './data.js';
import * as E from './engine.js';
import * as RD from './raid.js';
import * as AR from './arena.js';
import * as Q from './quest.js';
import * as A from './account.js';
import * as P from './preview.js';
import * as O from './offline.js';
import * as D from './daily.js';
import * as BK from './backup.js';
import * as CS from './cloudSave.js';
import { watchAuthState, signInGoogle, getUserInfo } from '../cloud/auth.js';
import { expSnap } from './screens/common.jsx';
import { BattleView } from './screens/battle.jsx';
import { DepartView, fmtWhen, SummaryLine, TitleView, GiftNotice, SceneView, OfflineSheet } from './screens/title.jsx';
import { RaidView, RosterView, TownView } from './screens/town.jsx';
import { RivalView } from './screens/rival.jsx';
import * as F from './familiar.js';
import { FieldView, DungeonView, TowerView } from './screens/field.jsx';
import { PartyView } from './screens/growth.jsx';
import { BagView, StashView } from './screens/bag.jsx';
import { FamiliarView } from './screens/familiar.jsx';
import { ForgeView } from './screens/forge.jsx';
import { QuestView, DailyView } from './screens/quest.jsx';
import { LAST_HUNT_KEY, readLastHunt, readSpeedPref, huntRecord, newHuntStats, addHuntRecord, HuntReport, logEfficiency, BoostSheet } from './screens/report.jsx';
import { LOSS_STOP, IdleScreen } from './screens/idle.jsx';

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

export default function ChronicleGame({ onExit }) {
  const [acc, setAcc] = useState(loadAccount);
  const [loadNotice, setLoadNotice] = useState(() => (loadStatus.status === 'restored' || loadStatus.status === 'lost' ? loadStatus : null)); // 1.236.1 깨진 저장 안내
  const save = useMemo(() => A.toView(acc), [acc]);
  const [view, setView] = useState('title');
  const [rivalTab, setRivalTab] = useState('rank'); // 경쟁자 화면 탭 (성장 순위 / 투기장)
  const [battle, setBattle] = useState(null);
  const [repeat, setRepeat] = useState(false);
  const [toast, setToast] = useState(null);
  const [scene, setScene] = useState(null); // { scene, replay, after }
  const lastFieldRef = useRef(null);
  // 반복 사냥 자동 상향 (1.272.0) — 기본 켬, 연속 「쉬운 승리」 수는 easyRef
  const [autoClimb, setAutoClimb] = useState(() => { try { return localStorage.getItem('chronicleAutoClimb') !== '0'; } catch { return true; } });
  const toggleClimb = () => { const v = !autoClimb; setAutoClimb(v); try { localStorage.setItem('chronicleAutoClimb', v ? '1' : '0'); } catch { /* */ } };
  const easyRef = useRef(0);
  // 패배 시 직전 성공 맵으로 반복 사냥 (1.273.0) — 마지막으로 이긴 사냥 자리 · 패배한 자리(자동 상향이 다시 올라가지 않게)
  const lastWinHuntRef = useRef(null);
  const climbBlockRef = useRef(null);
  const lossStreakRef = useRef(0); // 연속 패배 수 (1.273.1)
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
    if (!repeat) { setAutoProg(false); lossStreakRef.current = 0; repStatsRef.current = newHuntStats(); if (lastRecRef.current) addHuntRecord(repStatsRef.current, lastRecRef.current); }
    setRepeat(r => !r);
  };
  // 자동 진행 (1.234.0) — 사냥 → 관문 → 다음 스테이지 → … → 보스 → 다음 지역. 보스 앞 이야기는 건너뜀, 패배하면 멈춤
  const [autoProg, setAutoProg] = useState(false);
  const autoFieldRef = useRef(null);
  const startAuto = (field) => {
    setRepeat(false);
    repStatsRef.current = newHuntStats();
    lastWinHuntRef.current = null; climbBlockRef.current = null; lossStreakRef.current = 0;
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

  // ===== 대기화면·화면 꺼짐 방지 (1.271.0) =====
  // 자동 진행 중 = 반복 사냥 · 자동 진행 · (첨탑 전투 + 자동 등반) · (던전 전투 + 연속 도전)
  const autoKind = view !== 'battle' || !battle ? null
    : autoProg ? 'prog' : repeat ? 'repeat'
      : battle.ctx.kind === 'tower' && towerAuto ? 'tower'
        : battle.ctx.kind === 'dungeon' && dungeonAuto ? 'dungeon' : null;
  const autoRunning = !!autoKind;
  const [idle, setIdle] = useState(false);
  // 1.279.1 — 「끄기」가 실수로 저장된 기기 복구: 이 버전에서 한 번만 1분으로 되돌린다 (이후 끄기는 그대로 존중)
  const [idleDelay, setIdleDelayState] = useState(() => { try {
    const v = localStorage.getItem('chronicleIdleDelay');
    if (v === '0' && !localStorage.getItem('chronicleIdleOffAck')) { localStorage.setItem('chronicleIdleOffAck', '1'); localStorage.setItem('chronicleIdleDelay', '60'); return 60; }
    localStorage.setItem('chronicleIdleOffAck', '1');
    const n = v == null ? 60 : +v; return Number.isFinite(n) && n >= 0 ? n : 60;
  } catch { return 60; } });
  const setIdleDelay = (v) => {
    setIdleDelayState(v); try { localStorage.setItem('chronicleIdleDelay', String(v)); } catch { /* */ }
    flash(v ? `대기화면 자동 전환 — ${v >= 60 ? `${v / 60}분` : `${v}초`} 뒤` : '대기화면 자동 전환 끔 — 전투 화면의 🌙 버튼으로만 전환');
  };
  const autoStartRef = useRef(null);
  useEffect(() => {
    if (autoRunning) { if (!autoStartRef.current) autoStartRef.current = Date.now(); return undefined; }
    // 자동이 끝나면(패배·정지) 대기화면을 닫아 결과를 보여 준다 — 전투가 바뀌는 사이 잠깐 끊긴 것은 무시 (1.279.1)
    const t = setTimeout(() => { autoStartRef.current = null; setIdle(false); }, 1500);
    return () => clearTimeout(t);
  }, [autoRunning]);
  // 손대지 않으면 idleDelay초 뒤 자동 전환 — 화면을 누르거나 키를 누르면 다시 센다
  // 1.279.1 — 「마지막 조작 시각」을 기록하고 1초마다 확인한다. 예전 방식(setTimeout 1개)은 자동 상태가 잠깐이라도 끊기면 처음부터 다시 세었다
  const lastActRef = useRef(Date.now());
  useEffect(() => {
    const poke = () => { lastActRef.current = Date.now(); };
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    evs.forEach(e => window.addEventListener(e, poke, { capture: true, passive: true }));
    return () => evs.forEach(e => window.removeEventListener(e, poke, { capture: true }));
  }, []);
  useEffect(() => { if (!idle) lastActRef.current = Date.now(); }, [idle]); // 대기화면을 닫은 순간부터 다시 센다
  useEffect(() => {
    if (!autoRunning || idle || !idleDelay) return undefined;
    const t = setInterval(() => { if (Date.now() - lastActRef.current >= idleDelay * 1000) setIdle(true); }, 1000);
    return () => clearInterval(t);
  }, [autoRunning, idle, idleDelay]);
  // 화면 꺼짐 방지 — 자동 진행 중에만 (본편 1.88.0과 같은 방식). 다른 앱으로 나가면 OS가 풀어 버리므로 돌아오면 다시 요청
  const [wakeOn, setWakeOn] = useState(false);
  useEffect(() => {
    if (!autoRunning || typeof navigator === 'undefined' || !('wakeLock' in navigator)) { setWakeOn(false); return undefined; }
    let lock = null; let dead = false;
    const acquire = async () => {
      try { const l = await navigator.wakeLock.request('screen'); if (dead) { l.release(); return; } lock = l; setWakeOn(true); l.addEventListener?.('release', () => { if (!dead) setWakeOn(false); }); } catch { setWakeOn(false); }
    };
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => { dead = true; document.removeEventListener('visibilitychange', onVis); try { lock?.release?.(); } catch { /* */ } setWakeOn(false); };
  }, [autoRunning]);

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
  // 의뢰 자동 수락 (1.275.0) — 받을 수 있는 의뢰가 생기면 바로 수락 (계정 설정 autoAccept, 기본 켬)
  useEffect(() => {
    if (!acc?.active || !A.autoAcceptOn(acc)) return;
    const r = A.autoAcceptQuests(acc);
    if (!r.n) return;
    setAcc(a => A.autoAcceptQuests(a).acc);
    if (view === 'town' || view === 'quests') flash(`새 의뢰 ${r.n}건 자동 수락`);
  }, [acc]); // eslint-disable-line react-hooks/exhaustive-deps
  // 보상 한 번에 받기 (1.275.0) — 의뢰 + 일일·주간 임무 + 원정대 의뢰
  const claimEverything = () => {
    const r = A.claimEverything(acc, Math.random);
    if (!r.total) return;
    setAcc(r.acc);
    const parts = [r.quests && `의뢰 ${r.quests}`, r.missions && `임무 ${r.missions}`, r.roster && `원정대 ${r.roster}`].filter(Boolean).join(' · ');
    flash(`보상 ${r.total}건 수령 (${parts})${r.items.length ? ` — 장비 ${r.items.length}개` : ''}`);
  };

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
    if (mode === 'hunt' && (lastFieldRef.current?.field.id !== field.id || lastFieldRef.current?.stage !== stage)) easyRef.current = 0;
    if (mode === 'hunt') { lastFieldRef.current = { field, stage }; try { localStorage.setItem(LAST_HUNT_KEY, JSON.stringify({ hero: save.hero, fieldId: field.id, stage })); } catch { /* */ } }
    const enc = mode === 'gate' ? E.rollGateEncounter(field, stage, rng) : E.rollFieldEncounter(field, rng, boss, null, boss ? null : stage);
    enc.enemies = E.scaleEnemiesForRebirth(save, enc.enemies);
    const party = E.partyCombatants(save);
    const sim = E.simulateChronicleBattle(party, enc.enemies, rng);
    const ctx = { kind: 'field', fieldId: field.id, type: enc.type, enemies: enc.enemies, stage: boss ? null : stage, label: boss ? `${field.name} 보스` : mode === 'gate' ? `${field.name} ${stage + 1} 관문` : `${field.name} ${stage + 1}` };
    const r = E.applyBattle(save, ctx, sim, rng);
    r.summary.questsDone = Q.newlyDoneQuests(save, r.save);
    if (mode === 'hunt' && !E.gateReady(save, field.id, stage) && E.gateReady(r.save, field.id, stage)) r.summary.gateOpen = true;
    // 반복 사냥 자동 상향 — 쉬우면 다음 「한 번 더」부터 한 단계 위에서
    if (mode === 'hunt' && repeat && autoClimb && !opts.auto && sim.result === 'win') {
      easyRef.current = E.isEasyWin(sim, party) ? easyRef.current + 1 : 0;
      const up = E.autoClimbCheck(r.save, field, stage, easyRef.current);
      const blocked = up && climbBlockRef.current && (up.field.id > climbBlockRef.current.fieldId || (up.field.id === climbBlockRef.current.fieldId && up.stage >= climbBlockRef.current.stage));
      if (up && !blocked) {
        lastFieldRef.current = { field: up.field, stage: up.stage };
        easyRef.current = 0;
        try { localStorage.setItem(LAST_HUNT_KEY, JSON.stringify({ hero: save.hero, fieldId: up.field.id, stage: up.stage })); } catch { /* */ }
        r.summary.climb = { label: `${up.field.name} ${up.stage + 1}`, lv: up.lv, why: up.why };
      }
    }
    setSave(r.save);
    trackDaily(winDeltas(sim, enc.enemies));
    const rec = huntRecord(sim, party, enc, r.summary, readSpeedPref(E.boostLeftMs(save)), ctx.label);
    lastRecRef.current = rec;
    if (repStatsRef.current) addHuntRecord(repStatsRef.current, rec);
    // 반복 사냥은 사냥에서만 · 패배하면 반복·자동 진행 모두 멈춤 (1.234.0: 의뢰 완료로는 멈추지 않음)
    if (mode !== 'hunt' || sim.result !== 'win') setRepeat(false);
    // 1.273.0 PM 「자동 진행·반복 사냥이 지면 멈추지 말고 직전 성공 맵에서 반복 사냥」
    const prevWin = lastWinHuntRef.current;
    if (mode === 'hunt' && sim.result === 'win') lastWinHuntRef.current = { field, stage };
    let fb = null;
    // 1.273.1 같은 맵에서 져도 멈추지 않고 한 단계 아래로 — 연속 LOSS_STOP번 지면 그때 멈춤 (골드가 계속 새는 것 방지)
    if (sim.result === 'win') lossStreakRef.current = 0;
    else if (opts.auto || (mode === 'hunt' && repeat)) {
      lossStreakRef.current += 1;
      const lower = () => {
        if (stage > 0) return { field, stage: stage - 1 };
        const pf = CHRONICLE_FIELDS[field.id - 2];
        return pf ? { field: pf, stage: FIELD_STAGES - 1 } : null;
      };
      if (lossStreakRef.current < LOSS_STOP) {
        fb = prevWin && !(prevWin.field.id === field.id && prevWin.stage === stage) ? prevWin
          : mode === 'gate' ? { field, stage }
            : boss ? { field, stage: FIELD_STAGES - 1 }
              : lower();
      }
    }
    if (fb) {
      if (mode === 'hunt') climbBlockRef.current = { fieldId: field.id, stage };
      lastFieldRef.current = fb; easyRef.current = 0;
      try { localStorage.setItem(LAST_HUNT_KEY, JSON.stringify({ hero: save.hero, fieldId: fb.field.id, stage: fb.stage })); } catch { /* */ }
      if (opts.auto) setAutoProg(false);
      setRepeat(true);
      r.summary.fallback = `${fb.field.name} ${fb.stage + 1}`;
    } else if (sim.result !== 'win' && lossStreakRef.current >= LOSS_STOP) {
      lossStreakRef.current = 0;
      setAutoProg(false); setRepeat(false);
      r.summary.lossStop = LOSS_STOP;
      flash(`${LOSS_STOP}연속 패배 — 자동 사냥을 멈췄습니다`);
    } else if (opts.auto && sim.result !== 'win') stopAuto(`자동 진행 중단 — ${ctx.label}에서 패배`);
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
  // 투기장 (경쟁 시리즈 3단계) — 경쟁자와 결투. 결과는 계산 즉시 계정에 반영한다
  const fightArena = (rid) => {
    const r = AR.arenaFight(acc, rid, rng);
    if (!r) { flash('오늘 도전 횟수를 다 썼습니다'); return; }
    setAcc(r.acc);
    setBattle({ sim: r.sim, enemies: r.enemies, party: r.party, summary: r.summary, ctx: { kind: 'arena', type: 'arena', enemies: r.enemies, label: `투기장 · ${r.opp.name}` }, key: Date.now() });
    setView('battle');
  };
  const afterBattle = () => {
    const ctx = battle?.ctx;
    if (autoProg) stopAuto(); // 「계속」을 누르면 자동 진행도 멈춘다
    setBattle(null);
    // 1.247.0 — 끝난 콘텐츠의 화면으로 돌아간다 (던전 클리어·패배도 마을이 아니라 던전 목록, 사냥 패배도 사냥터)
    if (ctx?.kind === 'raid') setView('raid');
    else if (ctx?.kind === 'arena') { setRivalTab('arena'); setView('rival'); }
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
        onSelect={(cid) => { setRepeat(false); setAcc(a => A.selectCharacter(a, cid)); setView('depart'); }}
        onCreate={(cid) => { setRepeat(false); setAcc(a => A.createCharacter(a, cid)); setView('depart'); }} />
    );
  } else if (view === 'depart') {
    content = <DepartView save={save} onDone={() => setView('town')} />;
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
        onIdle={autoRunning ? () => setIdle(true) : null} idleDelay={idleDelay}
        autoClimb={autoClimb} onToggleClimb={toggleClimb}
        boostLeft={E.boostLeftMs(save)} onAskBoost={() => setBoostSheet(true)} />
    );
  } else if (view === 'field') {
    content = <FieldView save={save} onBack={() => { setRepeat(false); setView('town'); }} onFight={fightField} onAuto={startAuto} playScene={playScene} sceneOpen={!!scene} />;
  } else if (view === 'quests') {
    content = <QuestView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onReplay={(sc) => setScene({ scene: sc, replay: true })} autoAccept={A.autoAcceptOn(acc)} onAutoAccept={(on) => setAcc(a => ({ ...a, autoAccept: on }))} />;
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
    content = <DailyView acc={acc} onBack={() => setView('town')} onSwitch={(cid) => { setRepeat(false); setAcc(a => A.selectCharacter(a, cid)); }} onAct={(fn) => { const r = fn(acc); if (!r.n) return; setAcc(r.acc); flash(`임무 보상 ${r.n}건 수령 — ${D.dailyRewardText(r.reward)}`); }} />;
  } else if (view === 'rival') {
    content = <RivalView acc={acc} top={rivalTab} onTop={setRivalTab} onFight={fightArena} onArena={(fn) => { const r = fn(acc); if (!r.n) return; setAcc(r.acc); if (r.item) flash(`${r.item.name} 구매`); }} onBack={() => setView('town')} onAct={(fn) => { const r = fn(acc); if (!r.n) return; setAcc(r.acc); flash(r.month ? `월간 1위 — 자령 「${F.famName(r.fam.key)}」${r.fam.soul ? ' (보유 중 → 사역혼 100)' : ''}` : r.fam ? `${r.rank}위 보상 — ${F.famGrade(r.fam.grade).label} 「${F.famName(r.fam.key)}」${r.fam.soul ? ` (보유 중 → 사역혼 ${r.fam.soul})` : ''}` : `${r.rank}위 · 주간 순위 보상을 받았습니다`); }} />;
  } else if (view === 'forge') {
    content = <ForgeView save={save} setSave={setSave} onBack={() => setView('town')} flash={flash} onTrack={trackDaily} />;
  } else {
    content = <TownView save={save} acc={acc} go={(v) => setView(v === 'dungeon' && save.dungeon ? 'dungeon' : v)} onExit={onExit} onSwitchChar={() => setView('title')} onClaimAll={claimEverything} />;
  }

  return (
    <div className="absolute inset-0 chr-root" style={{ background: `radial-gradient(120% 60% at 50% 0%, #2a1318 0%, #120a0d 45%, ${PALETTE.bg} 100%)`, fontFamily: '"Noto Serif KR", serif', color: PALETTE.text }}>
      <div key={view} className="ui-screen-enter absolute inset-0">{content}</div>
      {idle && save && autoStartRef.current && (
        <IdleScreen save={save} kind={autoKind || 'repeat'} label={battle?.ctx?.label} startedAt={autoStartRef.current} wakeOn={wakeOn}
          delay={idleDelay} onDelay={setIdleDelay} onExit={() => setIdle(false)} />
      )}
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
