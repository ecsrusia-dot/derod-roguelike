// ============================================
// firebase/sync.js — Firestore 메타 데이터 동기화
// ============================================
// 사용자별 Firestore document: users/{uid}
// 동기화 전략:
// - 로드: 우선 클라우드 → 없으면 로컬 → 둘 다 없으면 기본값
// - 저장: 클라우드 + 로컬 (이중 저장, 오프라인 대비)
// - 충돌: lastSavedAt 비교, 더 최신 우선 (단순 strategy)
// ============================================

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config.js';

// === 1.53.0~ activeRun.mapData.edges Firestore 호환 직렬화 ===
// Firestore는 배열 안의 배열을 거부. mapGen이 생성한 edges는 [[a,b], [b,c], ...] 형태.
// 클라우드 저장 시 [{a,b}, ...]로 변환, 로드 시 다시 [[a,b], ...]로 복원.
// 이 변환을 안 하면 saveCloudMeta가 throw → catch에서 silent fail → 런 진행 중
// 클라우드 백업 0% + 다음 부팅 시 데이터 손실.
function serializeForCloud(meta) {
  const edges = meta?.activeRun?.mapData?.edges;
  if (!Array.isArray(edges) || edges.length === 0) return meta;
  if (!Array.isArray(edges[0])) return meta; // 이미 직렬화된 형태
  return {
    ...meta,
    activeRun: {
      ...meta.activeRun,
      mapData: {
        ...meta.activeRun.mapData,
        edges: edges.map(([a, b]) => ({ a, b })),
      },
    },
  };
}

// 1.56.1~ 일반화된 nested-array 가드.
// serializeForCloud로 알려진 케이스(edges) 변환 후, 남은 nested array를 deep-walk 검출.
// 발견 시 자동으로 객체 형태(`{0: a, 1: b, ...}`)로 변환 + console.warn으로 진단 로그.
// 향후 새 자료 구조에 nested array가 들어가도 silent fail이 아닌 자동 호환 + 경고.
// 또한 JSON.parse(JSON.stringify(...))로 undefined·function·Symbol 자동 제거 (Firestore는 undefined 거부).
function safeSerializeForCloud(meta) {
  // 1) 알려진 케이스 변환
  let prepared = serializeForCloud(meta);
  // 2) JSON 라운드트립으로 undefined·function·Symbol 제거
  //    (단, Date·Map·Set은 plain object 또는 빈 값으로 손실 → 현재 meta에는 미사용이라 안전)
  try {
    prepared = JSON.parse(JSON.stringify(prepared));
  } catch (err) {
    console.warn('[Sync] JSON roundtrip failed — circular reference?:', err);
    return prepared;
  }
  // 3) 남은 nested array deep-walk + 변환 + 경고
  let nestedFound = 0;
  const walk = (obj, path) => {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        if (Array.isArray(item)) {
          nestedFound++;
          console.warn(`[Sync] Unhandled nested array at ${path}[${i}] — auto-converting to object`);
          obj[i] = item.reduce((acc, v, idx) => { acc[idx] = v; return acc; }, {});
          // 변환 결과 자체에도 재귀 walk (안전)
          walk(obj[i], `${path}[${i}]`);
        } else if (item && typeof item === 'object') {
          walk(item, `${path}[${i}]`);
        }
      }
    } else if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        walk(obj[k], path ? `${path}.${k}` : k);
      }
    }
  };
  walk(prepared, '');
  if (nestedFound > 0) {
    console.warn(`[Sync] safeSerializeForCloud: ${nestedFound} unhandled nested array(s) auto-converted. Consider adding explicit serializer for these paths.`);
  }
  return prepared;
}

function deserializeFromCloud(meta) {
  const edges = meta?.activeRun?.mapData?.edges;
  if (!Array.isArray(edges) || edges.length === 0) return meta;
  if (Array.isArray(edges[0])) return meta; // 이미 배열 형태 (구버전 호환)
  return {
    ...meta,
    activeRun: {
      ...meta.activeRun,
      mapData: {
        ...meta.activeRun.mapData,
        edges: edges.map(e => [e.a, e.b]),
      },
    },
  };
}

// 1.56.1~ 클라우드 save 실패 가시성 — 연속 실패 카운트 + 임계치 초과 시 1회 경고.
// 호출자가 결과(true/false)를 받아 UI 처리 가능. 기존 자동저장 (App.jsx:429)이 결과를 무시하면
// 모듈 레벨 카운터가 silent 실패 누적을 잡아 사용자에게 console.warn으로 가시화.
const CLOUD_FAIL_THRESHOLD = 3;
let cloudConsecutiveFails = 0;
let cloudWarnedOnce = false;
let cloudLastError = null; // 1.237.3~ 마지막 저장 실패 코드 (UI 표시용, 성공 시 null)
export function getCloudSaveError() { return cloudLastError; }

export function getCloudSaveFailCount() {
  return cloudConsecutiveFails;
}

// 클라우드에 메타 저장
export async function saveCloudMeta(uid, meta) {
  if (!uid) throw new Error('No UID');
  try {
    const userRef = doc(db, 'users', uid);
    const prepared = safeSerializeForCloud(meta);
    // 1.237.3~ Firestore 문서 1MB 한도 — 넘으면 저장이 계속 실패하므로 명시적으로 경고
    const size = JSON.stringify(prepared).length;
    if (size > CLOUD_META_MAX_BYTES) {
      throw Object.assign(new Error(`meta too large (${Math.round(size / 1024)}KB)`), { code: 'too-large' });
    }
    // lastSavedAt 추가 — 충돌 비교용. 1.56.1~ safeSerializeForCloud 사용 (일반화된 가드).
    const dataWithTimestamp = {
      ...prepared,
      lastSavedAt: Date.now(),
      lastSavedServer: serverTimestamp(),
    };
    await setDoc(userRef, dataWithTimestamp);
    // 성공 — 카운터 리셋
    if (cloudConsecutiveFails > 0) {
      console.info(`[Sync] Cloud save recovered after ${cloudConsecutiveFails} failure(s)`);
    }
    cloudConsecutiveFails = 0;
    cloudWarnedOnce = false;
    cloudLastError = null;
    return true;
  } catch (err) {
    cloudConsecutiveFails++;
    cloudLastError = err?.code || 'unknown';
    console.error(`[Sync] Cloud save failed (consecutive ${cloudConsecutiveFails}):`, err);
    if (cloudConsecutiveFails >= CLOUD_FAIL_THRESHOLD && !cloudWarnedOnce) {
      cloudWarnedOnce = true;
      console.warn(`[Sync] ⚠ Cloud save has failed ${cloudConsecutiveFails} times in a row. Local progress is safe but cloud backup is stale. Possible causes: token expired, network down, Firestore quota.`);
    }
    return false;
  }
}

// 클라우드에서 메타 로드
export async function loadCloudMeta(uid) {
  if (!uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return deserializeFromCloud(snap.data());
    }
    return null;
  } catch (err) {
    console.error('[Sync] Cloud load failed:', err);
    return null;
  }
}

// 클라우드 + 로컬 중 더 최신 데이터 선택
// localMeta, cloudMeta: 둘 다 raw 객체 (lastSavedAt 포함)
export function pickLatest(localMeta, cloudMeta) {
  if (!cloudMeta && !localMeta) return null;
  if (!cloudMeta) return localMeta;
  if (!localMeta) return cloudMeta;
  // 둘 다 있으면 lastSavedAt 비교
  const localTs = localMeta.lastSavedAt || 0;
  const cloudTs = cloudMeta.lastSavedAt || 0;
  return cloudTs > localTs ? cloudMeta : localMeta;
}

// ============================================
// 1.237.3~ 초기화 사고 방지 (PM 실사고 보고 — 「구글 로그인 후 초기화되는 경우가 많다」)
// ============================================
// 원인: loadCloudMeta가 실패(모바일 첫 접속 'client is offline' 등)해도 null → 「새 계정」으로 판단 →
//       빈 데이터로 시작 + 2초 뒤 빈 데이터로 클라우드 덮어쓰기
// 대책: ① fetchCloudMeta = 실패와 「데이터 없음」을 구분 + 재시도
//       ② App이 클라우드를 한 번 확인(cloudChecked)하기 전엔 자동 업로드 금지
//       ③ 진행도 급락 저장 차단 + 덮어쓰기 전 클라우드 백업본(users/{uid}/backup/main)
//       ④ 문서 크기 한도 경고
export const CLOUD_META_MAX_BYTES = 950 * 1024;
export const CLOUD_GUARD = {
  tries: 3,              // 불러오기 재시도 횟수
  retryMs: 900,          // 재시도 간격 (×시도 횟수)
  blockBelow: 0.3,       // 클라우드 진행도의 30% 미만으로 덮어쓰기 = 초기화로 보고 차단
  backupBelow: 0.85,     // 85% 미만으로 줄면 덮어쓰기 전 백업본 저장
  backupEveryMs: 6 * 60 * 60 * 1000, // 정기 백업 (세션 첫 확인 시, 6시간 간격)
};

// 진행도 점수 — 처치·원정·영혼·각성도 (App 복구 선택 화면과 같은 공식)
export function progressScore(m) {
  if (!m) return 0;
  const awakenSum = Object.values(m.engravings || {}).reduce((s, e) => s + (e?.lv || 0), 0);
  return (m.totalKills || 0) + (m.totalRuns || 0) * 10 + (m.souls || 0) / 10 + awakenSum * 50;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 불러오기 → { ok: true, exists, meta } | { ok: false, error }
export async function fetchCloudMeta(uid, tries = CLOUD_GUARD.tries) {
  if (!uid) return { ok: false, error: 'no-uid' };
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return { ok: true, exists: false, meta: null };
      return { ok: true, exists: true, meta: deserializeFromCloud(snap.data()) };
    } catch (err) {
      lastErr = err;
      console.warn(`[Sync] Cloud fetch failed (try ${i + 1}/${tries}):`, err?.code || err);
      if (err?.code === 'permission-denied') break;
      if (i < tries - 1) await sleep(CLOUD_GUARD.retryMs * (i + 1));
    }
  }
  return { ok: false, error: lastErr?.code || String(lastErr || 'unknown') };
}

// 클라우드 백업본 (덮어쓰기 직전 사본 1개) — 데이터는 JSON 문자열 (배열 속 배열 회피)
const backupRef = (uid) => doc(db, 'users', uid, 'backup', 'main');
export async function saveCloudBackup(uid, meta, reason = 'auto') {
  if (!uid || !meta) return false;
  try {
    const data = JSON.stringify(meta);
    if (data.length > CLOUD_META_MAX_BYTES) return false;
    await setDoc(backupRef(uid), { data, savedAt: Date.now(), score: Math.round(progressScore(meta)), reason });
    try { localStorage.setItem(`derod_cloudBackupAt_${uid}`, String(Date.now())); } catch { /* 무시 */ }
    return true;
  } catch (err) {
    console.warn('[Sync] Cloud backup failed:', err?.code || err);
    return false;
  }
}
export async function loadCloudBackup(uid) {
  if (!uid) return { ok: false, error: 'no-uid' };
  try {
    const snap = await getDoc(backupRef(uid));
    if (!snap.exists()) return { ok: true, exists: false };
    const d = snap.data();
    const meta = JSON.parse(d.data);
    return { ok: true, exists: true, meta, savedAt: d.savedAt || null, reason: d.reason || null };
  } catch (err) {
    return { ok: false, error: err?.code || String(err) };
  }
}
export function cloudBackupDue(uid, now = Date.now()) {
  try { return now - (Number(localStorage.getItem(`derod_cloudBackupAt_${uid}`)) || 0) >= CLOUD_GUARD.backupEveryMs; } catch { return true; }
}

// 저장 크기 (바이트 근사)
export function cloudMetaSize(meta) {
  try { return JSON.stringify(safeSerializeForCloud(meta)).length; } catch { return 0; }
}
