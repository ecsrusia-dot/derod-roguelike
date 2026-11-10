// ============================================
// chronicle/cloudSave.js — 황혼 연대기 클라우드 저장 (1.237.1 · 1.237.2 공용 모듈로 정리)
// ============================================
// 위치 users/{uid}/chronicle/save — 본편 저장(users/{uid}, setDoc 전체 교체)과 서로 덮어쓰지 않음
// 실제 읽기·쓰기는 src/cloud/gameSave.js 공용 함수
// 안전 규칙: 이 기기에서 클라우드를 한 번 확인(checkedUid)하기 전에는 자동 업로드하지 않는다 — UI가 담당
// ============================================
import { uploadGameSave, downloadGameSave, GAME_SAVE_MAX_BYTES } from '../cloud/gameSave.js';
import { isValidAccount, accountSummary } from './backup.js';

export const CLOUD = {
  autoEveryMs: 30 * 1000,          // 1.237.2 PM 결정: 3분 → 30초 (바뀐 게 있을 때만 올림)
  maxBytes: GAME_SAVE_MAX_BYTES,
};
const SLOT = 'chronicle';

export async function uploadChronicle(uid, acc, now = Date.now()) {
  if (!isValidAccount(acc)) return { ok: false, error: '저장 내용이 올바르지 않습니다' };
  return uploadGameSave(uid, SLOT, acc, accountSummary(acc), now);
}
export async function downloadChronicle(uid) {
  const r = await downloadGameSave(uid, SLOT, isValidAccount);
  if (!r.ok || !r.exists) return r;
  return { ok: true, exists: true, acc: r.obj, savedAt: r.savedAt, summary: r.summary || accountSummary(r.obj) };
}

// 비교 — same = 요약이 같다 · cloudAhead = 클라우드 쪽 진행이 더 많아 보인다
export function compareSummaries(local, cloud) {
  const keys = ['chars', 'maxLv', 'gold', 'fams', 'stash'];
  const same = keys.every(k => (local?.[k] || 0) === (cloud?.[k] || 0));
  const score = (s) => (s?.chars || 0) * 1000 + (s?.maxLv || 0) * 10 + (s?.fams || 0);
  return { same, cloudAhead: score(cloud) > score(local) };
}
