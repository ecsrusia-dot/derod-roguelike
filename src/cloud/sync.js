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

// 클라우드에 메타 저장
export async function saveCloudMeta(uid, meta) {
  if (!uid) throw new Error('No UID');
  try {
    const userRef = doc(db, 'users', uid);
    // lastSavedAt 추가 — 충돌 비교용
    const dataWithTimestamp = {
      ...serializeForCloud(meta),
      lastSavedAt: Date.now(),
      lastSavedServer: serverTimestamp(),
    };
    await setDoc(userRef, dataWithTimestamp);
    return true;
  } catch (err) {
    console.error('[Sync] Cloud save failed:', err);
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
