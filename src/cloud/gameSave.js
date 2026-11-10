// ============================================
// cloud/gameSave.js — 미니 게임 클라우드 저장 공용 (1.237.2)
// ============================================
// 본편 계정(users/{uid})은 그대로 두고, 게임마다 하위 문서 하나를 쓴다:
//   황혼 연대기 users/{uid}/chronicle/save · 트와일라잇 아르카나 users/{uid}/arcana/save
// 문서 = { data: 저장 JSON 문자열, savedAt, version, summary }
//   JSON 문자열 — Firestore의 배열 속 배열 금지·undefined 거부를 피하고 원본 그대로 왕복
// ============================================
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config.js';
import { GAME_VERSION } from '../data/version.js';

export const GAME_SAVE_MAX_BYTES = 900 * 1024; // Firestore 문서 1MB 한도 여유

const ref = (uid, slot) => doc(db, 'users', uid, slot, 'save');
export const cloudErrText = (e) => (e?.code === 'permission-denied'
  ? '클라우드 저장 권한이 없습니다 (Firebase 보안 규칙에 저장 위치 허용이 필요)'
  : e?.code === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine) ? '인터넷 연결을 확인해 주세요' : `클라우드 오류 (${e?.code || e?.message || '알 수 없음'})`);

// 올리기 → { ok, savedAt } | { ok: false, error }
export async function uploadGameSave(uid, slot, obj, summary, now = Date.now()) {
  if (!uid) return { ok: false, error: '로그인이 필요합니다' };
  const data = JSON.stringify(obj);
  if (data.length > GAME_SAVE_MAX_BYTES) return { ok: false, error: `저장 크기가 너무 큽니다 (${Math.round(data.length / 1024)}KB)` };
  try {
    await setDoc(ref(uid, slot), { data, savedAt: now, version: GAME_VERSION, summary: summary || null });
    return { ok: true, savedAt: now };
  } catch (e) {
    console.error(`[Cloud ${slot}] upload failed:`, e);
    return { ok: false, error: cloudErrText(e) };
  }
}

// 내려받기 → { ok, exists, obj, savedAt, summary } | { ok: false, error }
export async function downloadGameSave(uid, slot, validate = () => true) {
  if (!uid) return { ok: false, error: '로그인이 필요합니다' };
  try {
    const snap = await getDoc(ref(uid, slot));
    if (!snap.exists()) return { ok: true, exists: false };
    const d = snap.data();
    let obj = null;
    try { obj = JSON.parse(d.data); } catch { /* 손상 */ }
    if (!obj || !validate(obj)) return { ok: false, error: '클라우드 저장이 손상되었습니다' };
    return { ok: true, exists: true, obj, savedAt: d.savedAt || null, summary: d.summary || null };
  } catch (e) {
    console.error(`[Cloud ${slot}] download failed:`, e);
    return { ok: false, error: cloudErrText(e) };
  }
}
