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

export function getCloudSaveFailCount() {
  return cloudConsecutiveFails;
}

// 클라우드에 메타 저장
export async function saveCloudMeta(uid, meta) {
  if (!uid) throw new Error('No UID');
  try {
    const userRef = doc(db, 'users', uid);
    // lastSavedAt 추가 — 충돌 비교용. 1.56.1~ safeSerializeForCloud 사용 (일반화된 가드).
    const dataWithTimestamp = {
      ...safeSerializeForCloud(meta),
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
    return true;
  } catch (err) {
    cloudConsecutiveFails++;
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
