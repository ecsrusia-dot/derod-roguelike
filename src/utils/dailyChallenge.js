// ============================================
// utils/dailyChallenge.js — 일일 챌린지 시드/빌더
// ============================================
// KST 자정마다 시드가 바뀜. 모든 플레이어가 같은 날엔 동일 조건으로 도전.
// 챕터 1~4 중 하나 + 직업 0~4 중 하나 + 저주 2개를 시드 기반으로 결정.
// ============================================

// === 시드 유틸 ===
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// KST(UTC+9) 기준 오늘 날짜 키 (YYYYMMDD)
export function getKstDateKey(now = new Date()) {
  // UTC+9로 변환
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// 다음 KST 자정까지의 시간 (밀리초)
export function msUntilNextKstMidnight(now = new Date()) {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const next = new Date(Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() + 1, 0, 0, 0,
  ));
  return next.getTime() - kstMs;
}

// 일일 챌린지 expedition 객체 빌드
// curses 인자: CURSES 배열을 외부에서 주입 (순환참조 회피)
export function buildDailyExpedition(curses = []) {
  const dateKey = getKstDateKey();
  const seed = hashString('derod_daily_' + dateKey);
  const rng = mulberry32(seed);

  // 직업: 0~4 중 시드 픽
  const forcedClassId = Math.floor(rng() * 5);

  // 챕터: 1~4 중 시드 픽 (number ID — 클래식 챕터)
  const chosenChapter = 1 + Math.floor(rng() * 4);

  // 저주 2개: CURSES 배열에서 시드 픽 (중복 제거)
  const fixedCurses = [];
  if (Array.isArray(curses) && curses.length >= 2) {
    const pool = [...curses];
    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(rng() * pool.length);
      fixedCurses.push(pool[idx]);
      pool.splice(idx, 1);
    }
  }

  return {
    id: `daily_${dateKey}`,
    name: '오늘의 시련',
    sub: `Daily Trial · ${dateKey.slice(0,4)}-${dateKey.slice(4,6)}-${dateKey.slice(6,8)}`,
    desc: '매일 자정(KST) 갱신되는 일일 도전. 직업·챕터·저주가 시드로 고정.',
    color: '#d4d4a0',
    chapters: [chosenChapter],
    enemyHpMult: 1.1,
    enemyDmgMult: 1.1,
    curseCount: 0,            // 시드 픽이라 rollCurses 사용 안 함
    fixedCurses,              // App.jsx startExpedition이 이를 우선 사용
    maxRelicSelect: 2,
    soulReward: 80,
    unlockId: null,
    forcedClassId,
    category: 'daily',
    dailyDateKey: dateKey,
  };
}
