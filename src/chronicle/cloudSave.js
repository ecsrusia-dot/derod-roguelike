// ============================================
// chronicle/cloudSave.js — 황혼 연대기 클라우드 저장 (1.237.1)
// ============================================
// 본편과 같은 Firebase 계정(구글·게스트)을 쓰고, 저장 위치만 분리한다:
//   본편   users/{uid}
//   연대기 users/{uid}/chronicle/save   ← 본편 저장(setDoc 전체 교체)과 서로 덮어쓰지 않음
// 문서 = { data: 계정 JSON 문자열, savedAt, version, summary }
//   JSON 문자열로 넣는 이유: Firestore의 배열 속 배열 금지·undefined 거부를 피하고 원본 그대로 왕복
// 안전 규칙 (자동 업로드가 남의 진행을 덮지 않게):
//   이 기기에서 클라우드를 한 번 확인(checkedUid)하기 전에는 자동 업로드하지 않는다 — UI가 담당
// ============================================
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../cloud/config.js';
import { isValidAccount, accountSummary } from './backup.js';
import { GAME_VERSION } from '../data/version.js';

export const CLOUD = {
  autoEveryMs: 3 * 60 * 1000,      // 자동 업로드 간격 3분 (바뀐 게 있을 때만)
  maxBytes: 900 * 1024,            // Firestore 문서 1MB 한도 여유
};

const ref = (uid) => doc(db, 'users', uid, 'chronicle', 'save');
const errText = (e) => (e?.code === 'permission-denied'
  ? '클라우드 저장 권한이 없습니다 (Firebase 보안 규칙에 연대기 저장 위치 허용이 필요)'
  : e?.code === 'unavailable' || !navigator.onLine ? '인터넷 연결을 확인해 주세요' : `클라우드 오류 (${e?.code || e?.message || '알 수 없음'})`);

// 올리기 → { ok, savedAt } | { ok: false, error }
export async function uploadChronicle(uid, acc, now = Date.now()) {
  if (!uid) return { ok: false, error: '로그인이 필요합니다' };
  if (!isValidAccount(acc)) return { ok: false, error: '저장 내용이 올바르지 않습니다' };
  const data = JSON.stringify(acc);
  if (data.length > CLOUD.maxBytes) return { ok: false, error: `저장 크기가 너무 큽니다 (${Math.round(data.length / 1024)}KB) — 가방·창고를 정리해 주세요` };
  try {
    await setDoc(ref(uid), { data, savedAt: now, version: GAME_VERSION, summary: accountSummary(acc) });
    return { ok: true, savedAt: now };
  } catch (e) {
    console.error('[Chronicle cloud] upload failed:', e);
    return { ok: false, error: errText(e) };
  }
}

// 내려받기 → { ok, exists, acc, savedAt, summary } | { ok: false, error }
export async function downloadChronicle(uid) {
  if (!uid) return { ok: false, error: '로그인이 필요합니다' };
  try {
    const snap = await getDoc(ref(uid));
    if (!snap.exists()) return { ok: true, exists: false };
    const d = snap.data();
    let acc = null;
    try { acc = JSON.parse(d.data); } catch { /* 손상 */ }
    if (!isValidAccount(acc)) return { ok: false, error: '클라우드 저장이 손상되었습니다' };
    return { ok: true, exists: true, acc, savedAt: d.savedAt || null, summary: d.summary || accountSummary(acc) };
  } catch (e) {
    console.error('[Chronicle cloud] download failed:', e);
    return { ok: false, error: errText(e) };
  }
}

// 비교 — 클라우드와 이 기기 중 무엇을 쓸지 묻기 위한 판단
//   same = 요약이 같다 (그냥 동기화) · cloudAhead = 클라우드 쪽 진행이 더 많아 보인다
export function compareSummaries(local, cloud) {
  const keys = ['chars', 'maxLv', 'gold', 'fams', 'stash'];
  const same = keys.every(k => (local?.[k] || 0) === (cloud?.[k] || 0));
  const score = (s) => (s?.chars || 0) * 1000 + (s?.maxLv || 0) * 10 + (s?.fams || 0);
  return { same, cloudAhead: score(cloud) > score(local) };
}
