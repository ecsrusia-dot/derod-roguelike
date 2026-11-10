// ============================================
// chronicle/backup.js — 저장 안전 (1.236.1)
// ============================================
// PM 결정 (점검 보고 1번): 깨진 저장 보호 + 자동 백업 + 내보내기·가져오기 먼저 (클라우드는 다음 PR)
//   ① 저장이 깨지면 → 자동 백업으로 복구, 백업도 없으면 깨진 원본을 따로 보관한 뒤 새 계정 (원본을 덮어쓰지 않음)
//   ② 자동 백업 — 저장할 때 마지막 백업이 BACKUP.everyMs보다 오래됐으면 직전 저장본을 백업 칸에 복사
//   ③ 내보내기 = 파일 다운로드 · 텍스트 복사 / 가져오기 = 파일 · 붙여넣기 (형식 검사 후 교체)
// localStorage만 다룬다 — 화면은 ChronicleGame.jsx
// ============================================
import { CHRONICLE_SAVE_KEY } from './data.js';

export const BACKUP = {
  everyMs: 10 * 60 * 1000,                 // 자동 백업 간격 10분
  bakKey: `${CHRONICLE_SAVE_KEY}_bak`,     // 마지막 정상 저장 복사본
  bakAtKey: `${CHRONICLE_SAVE_KEY}_bak_at`,
  corruptKey: `${CHRONICLE_SAVE_KEY}_corrupt`, // 읽지 못한 원본 (사라지지 않게 보관)
  fileTag: 'dnt-chronicle',
};

const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };

// 계정 형식 검사 — 연대기 계정으로 쓸 수 있는가
export function isValidAccount(o) {
  return !!o && typeof o === 'object' && o.v === 2 && o.chars && typeof o.chars === 'object' && typeof o.gold === 'number';
}
function parseAccount(raw) {
  if (!raw) return null;
  try { const o = JSON.parse(raw); return isValidAccount(o) ? o : null; } catch { return null; }
}

// 불러오기 — { acc | null, status: 'ok' | 'empty' | 'restored' | 'lost', at }
//   restored = 본 저장이 깨져서 자동 백업으로 복구 · lost = 둘 다 깨짐(원본은 corruptKey에 보관)
export function loadAccountSafe() {
  const s = ls();
  if (!s) return { acc: null, status: 'empty' };
  const raw = s.getItem(CHRONICLE_SAVE_KEY);
  if (!raw) return { acc: null, status: 'empty' };
  const acc = parseAccount(raw);
  if (acc) return { acc, status: 'ok' };
  try { s.setItem(BACKUP.corruptKey, raw); } catch { /* 공간 부족 */ }
  const bak = parseAccount(s.getItem(BACKUP.bakKey));
  if (bak) return { acc: bak, status: 'restored', at: Number(s.getItem(BACKUP.bakAtKey)) || null };
  return { acc: null, status: 'lost' };
}

// 저장 — 쓰기 전에, 지금 저장돼 있는 정상본을 일정 간격으로 백업 칸에 복사
export function writeAccountSafe(acc, now = Date.now()) {
  const s = ls();
  if (!s || !isValidAccount(acc)) return;
  try {
    const last = Number(s.getItem(BACKUP.bakAtKey)) || 0;
    if (now - last >= BACKUP.everyMs) {
      const cur = s.getItem(CHRONICLE_SAVE_KEY);
      if (parseAccount(cur)) { s.setItem(BACKUP.bakKey, cur); s.setItem(BACKUP.bakAtKey, String(now)); }
    }
    s.setItem(CHRONICLE_SAVE_KEY, JSON.stringify(acc));
  } catch { /* 저장 불가 */ }
}

// 자동 백업 정보 / 복원
export function backupInfo() {
  const s = ls(); if (!s) return null;
  const acc = parseAccount(s.getItem(BACKUP.bakKey));
  if (!acc) return null;
  return { acc, at: Number(s.getItem(BACKUP.bakAtKey)) || null, summary: accountSummary(acc) };
}

// 요약 — 확인 창 표시용
export function accountSummary(acc) {
  const chars = Object.values(acc.chars || {});
  return {
    chars: chars.length,
    maxLv: chars.reduce((m, c) => Math.max(m, c?.unit?.lv || 0), 0),
    gold: acc.gold || 0,
    fams: Object.keys(acc.fams || {}).length,
    stash: (acc.stash || []).length,
  };
}

// 내보내기 — 파일 내용(텍스트)
export function exportText(acc, now = Date.now()) {
  return JSON.stringify({ tag: BACKUP.fileTag, v: 2, at: now, acc });
}
export function exportFileName(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `황혼연대기_백업_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.json`;
}
// 가져오기 — 텍스트 → { acc, at } 또는 { error }
export function parseImport(text) {
  let o;
  try { o = JSON.parse(String(text || '').trim()); } catch { return { error: '파일 내용을 읽을 수 없습니다 (JSON 형식이 아님)' }; }
  const acc = o && o.tag === BACKUP.fileTag ? o.acc : o; // 감싼 형식 · 계정 원본 둘 다 허용
  if (!isValidAccount(acc)) return { error: '황혼 연대기 백업 파일이 아닙니다' };
  return { acc, at: o.at || null };
}
