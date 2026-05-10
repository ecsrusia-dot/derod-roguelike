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

// 클라우드에 메타 저장
export async function saveCloudMeta(uid, meta) {
  if (!uid) throw new Error('No UID');
  try {
    const userRef = doc(db, 'users', uid);
    // lastSavedAt 추가 — 충돌 비교용
    const dataWithTimestamp = {
      ...meta,
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
      return snap.data();
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
