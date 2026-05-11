// ============================================
// derod_storage.js — 영구 저장 시스템 (IndexedDB)
// ============================================
// 메타 진행 데이터를 IndexedDB에 영구 저장합니다.
// 저장되는 것: 영혼, 강화 단계, 해금 항목, 클리어 기록
// ============================================

const DB_NAME = 'derod_meta';
const DB_VERSION = 1;
const STORE_NAME = 'meta';
const META_KEY = 'meta_data';

// 기본 메타 데이터 구조
const DEFAULT_META = {
  souls: 0,                 // 보유 영혼
  upgrades: {},             // { meta_startHp: 3, meta_startGold: 2, ... } 단계
  unlocks: [],              // ['unlock_priest', 'unlock_expedition_2'] 해금된 ID
  clearedExpeditions: [],   // [1, 2] 클리어한 원정 ID
  totalRuns: 0,             // 총 시도 횟수
  totalKills: 0,            // 총 처치 수
  // 영혼 제단 자동 갱신 (KST 0시/12시 갱신)
  altarSlots: null,         // 현재 표시 중인 제단 강화 ID 배열 (null이면 갱신 필요)
  altarRefreshedAt: 0,      // 마지막 자동 갱신 시각 (timestamp)
  // 일일 유료 리롤 카운트 (KST 0시 리셋)
  dailyRerollCount: 0,      // 오늘 사용한 리롤 횟수
  dailyRerollResetAt: 0,    // 마지막 카운트 리셋 시각 (timestamp)
  // 업적 진행 상태 (UI 전용 — 추적 시스템은 다음 작업)
  // achievements[id] = { progress: N, completed: bool, claimed: bool }
  achievements: {},
  // 황혼의 대장간 추적
  forgeCount: 0,
  discoveredRecipes: [],
  // 챔피언십 원정 (신규 5원정 × 4난이도)
  // championshipClears[expId][difficulty] = true
  // expId: 'frost' | 'forest' | 'sanctum' | 'rift' | 'dawn'
  // difficulty: 'normal' | 'hard' | 'hell' | 'madness'
  championshipClears: {},
  // 챔피언십에서 해금된 신규 유물 (옵션 B 보상)
  championshipRelicUnlocks: [],
  // 마지막 확인한 업데이트 로그 버전 (이 값과 LATEST_VERSION 다르면 첫 화면에 모달 표시)
  lastSeenVersion: null,
};

// IndexedDB 열기
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// 메타 데이터 로드 (로컬만 — 기본 동작)
export async function loadMeta() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(META_KEY);
      request.onsuccess = () => {
        const data = request.result || { ...DEFAULT_META };
        // 누락된 필드 복구
        const safe = { ...DEFAULT_META, ...data };
        resolve(safe);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Meta load failed, returning default:', e);
    return { ...DEFAULT_META };
  }
}

// 메타 데이터 저장 (로컬만 — 기본 동작)
export async function saveMeta(meta) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(meta, META_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Meta save failed:', e);
  }
}

// === 모드 추적 (로컬 / 클라우드) ===
// 모드는 localStorage에 별도 저장 — IndexedDB 비동기 회피
export function getAuthMode() {
  try {
    return localStorage.getItem('derod_authMode') || null; // 'local' | 'guest' | 'google' | null
  } catch (e) {
    return null;
  }
}

export function setAuthMode(mode) {
  try {
    if (mode === null) {
      localStorage.removeItem('derod_authMode');
    } else {
      localStorage.setItem('derod_authMode', mode);
    }
  } catch (e) {
    console.error('Auth mode save failed:', e);
  }
}

// 로컬 기본값 가져오기 (default meta 노출)
export function getDefaultMeta() {
  return { ...DEFAULT_META };
}

// 로컬 IndexedDB 메타 데이터 초기화 (로그아웃 시 호출)
export async function clearLocalMeta() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(META_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Meta clear failed:', e);
  }
}

// 메타 데이터 초기화 (디버그용)
export async function resetMeta() {
  await saveMeta({ ...DEFAULT_META });
  return { ...DEFAULT_META };
}

// 영혼 추가
export function addSouls(meta, amount) {
  return { ...meta, souls: meta.souls + amount };
}

// 마지막 본 업데이트 로그 버전 기록
export function setLastSeenVersion(meta, version) {
  return { ...meta, lastSeenVersion: version };
}

// 강화 적용
export function applyUpgrade(meta, upgradeId) {
  const newMeta = { ...meta };
  newMeta.upgrades = { ...meta.upgrades };
  newMeta.upgrades[upgradeId] = (meta.upgrades[upgradeId] || 0) + 1;
  return newMeta;
}

// 해금 적용
export function applyUnlock(meta, unlockId) {
  if (meta.unlocks.includes(unlockId)) return meta;
  return { ...meta, unlocks: [...meta.unlocks, unlockId] };
}

// 원정 클리어 기록
export function recordExpeditionClear(meta, expeditionId) {
  if (meta.clearedExpeditions.includes(expeditionId)) return meta;
  return {
    ...meta,
    clearedExpeditions: [...meta.clearedExpeditions, expeditionId],
  };
}

// =============================================
// 영혼 제단 갱신 시스템 (KST 0시 / 12시)
// =============================================

// KST(한국 시간) 기준 가장 최근 0시 또는 12시 timestamp 반환
export function getLastRefreshTime() {
  const now = new Date();
  // KST = UTC+9
  const kstOffset = 9 * 60 * 60 * 1000;
  const utcMs = now.getTime();
  const kstMs = utcMs + kstOffset;
  const kstDate = new Date(kstMs);
  
  const hour = kstDate.getUTCHours();
  const lastRefreshHour = hour >= 12 ? 12 : 0;
  
  // 가장 최근 갱신 시각 (KST 기준)
  const refreshKst = new Date(Date.UTC(
    kstDate.getUTCFullYear(),
    kstDate.getUTCMonth(),
    kstDate.getUTCDate(),
    lastRefreshHour, 0, 0, 0
  ));
  // KST → UTC 변환 (timestamp는 UTC 기준)
  return refreshKst.getTime() - kstOffset;
}

// KST 기준 다음 갱신 시각 (timestamp)
export function getNextRefreshTime() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const utcMs = now.getTime();
  const kstMs = utcMs + kstOffset;
  const kstDate = new Date(kstMs);
  
  const hour = kstDate.getUTCHours();
  let nextHour, nextDay = 0;
  if (hour < 12) { nextHour = 12; }
  else { nextHour = 0; nextDay = 1; }
  
  const nextKst = new Date(Date.UTC(
    kstDate.getUTCFullYear(),
    kstDate.getUTCMonth(),
    kstDate.getUTCDate() + nextDay,
    nextHour, 0, 0, 0
  ));
  return nextKst.getTime() - kstOffset;
}

// KST 자정 timestamp (오늘 0시)
export function getTodayMidnight() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstMs = now.getTime() + kstOffset;
  const kstDate = new Date(kstMs);
  
  const midKst = new Date(Date.UTC(
    kstDate.getUTCFullYear(),
    kstDate.getUTCMonth(),
    kstDate.getUTCDate(),
    0, 0, 0, 0
  ));
  return midKst.getTime() - kstOffset;
}

// 제단 갱신이 필요한지 확인
export function needsAltarRefresh(meta) {
  if (!meta.altarSlots) return true;  // 한 번도 갱신 안 됨
  const lastRefresh = getLastRefreshTime();
  return meta.altarRefreshedAt < lastRefresh;
}

// 일일 리롤 카운트 리셋이 필요한지
export function needsDailyResetCheck(meta) {
  const todayMid = getTodayMidnight();
  return meta.dailyRerollResetAt < todayMid;
}

// 일일 리롤 카운트 자동 리셋
export function checkAndResetDaily(meta) {
  if (needsDailyResetCheck(meta)) {
    return {
      ...meta,
      dailyRerollCount: 0,
      dailyRerollResetAt: Date.now(),
    };
  }
  return meta;
}

// =============================================
// 업적 시스템 헬퍼
// =============================================

// 업적 보상 수령 (영혼 지급 + claimed 마킹)
export function claimAchievement(meta, achievement) {
  const ach = meta.achievements?.[achievement.id] || { progress: 0, completed: false, claimed: false };
  if (!ach.completed || ach.claimed) return meta;
  return {
    ...meta,
    souls: meta.souls + achievement.reward,
    achievements: {
      ...(meta.achievements || {}),
      [achievement.id]: { ...ach, claimed: true },
    },
  };
}

// 업적 상태 가져오기 (없으면 기본값)
export function getAchievementState(meta, id) {
  return meta.achievements?.[id] || { progress: 0, completed: false, claimed: false };
}

// =============================================
// 업적 추적 (런 종료 / 메타 변동 시 호출)
// =============================================

// 진행도 증가 (target 도달 시 자동 completed 처리)
// 이미 completed면 progress만 그대로 유지
export function incrementAchievement(meta, achievementId, amount = 1, target = null) {
  const cur = meta.achievements?.[achievementId] || { progress: 0, completed: false, claimed: false };
  // 이미 완료되었으면 진행도만 그대로 유지
  if (cur.completed) {
    return {
      ...meta,
      achievements: {
        ...(meta.achievements || {}),
        [achievementId]: { ...cur, progress: Math.max(cur.progress, amount + cur.progress) },
      },
    };
  }
  const newProgress = cur.progress + amount;
  const completed = target !== null && newProgress >= target;
  return {
    ...meta,
    achievements: {
      ...(meta.achievements || {}),
      [achievementId]: {
        progress: completed ? target : newProgress,
        completed,
        claimed: false,
      },
    },
  };
}

// 진행도 직접 설정 (예: 영혼 보유량 같은 절대값)
export function setAchievementProgress(meta, achievementId, value, target) {
  const cur = meta.achievements?.[achievementId] || { progress: 0, completed: false, claimed: false };
  const completed = value >= target;
  // 이미 completed인 업적의 claimed는 유지
  if (cur.completed) {
    return {
      ...meta,
      achievements: {
        ...(meta.achievements || {}),
        [achievementId]: { ...cur, progress: Math.max(cur.progress, value) },
      },
    };
  }
  return {
    ...meta,
    achievements: {
      ...(meta.achievements || {}),
      [achievementId]: {
        progress: completed ? target : value,
        completed,
        claimed: false,
      },
    },
  };
}

// 업적 완료 마킹 (one-shot 업적용 — 첫걸음 등)
export function completeAchievement(meta, achievementId, target = 1) {
  const cur = meta.achievements?.[achievementId] || { progress: 0, completed: false, claimed: false };
  if (cur.completed) return meta;
  return {
    ...meta,
    achievements: {
      ...(meta.achievements || {}),
      [achievementId]: { progress: target, completed: true, claimed: false },
    },
  };
}

// =========== 챔피언십 원정 헬퍼 ===========
// 신규 5원정 × 4난이도 시스템

// 챔피언십 클리어 기록
export function recordChampionshipClear(meta, expId, difficulty) {
  const clears = meta.championshipClears || {};
  const expClears = clears[expId] || {};
  return {
    ...meta,
    championshipClears: {
      ...clears,
      [expId]: { ...expClears, [difficulty]: true },
    },
  };
}

// 챔피언십 클리어 여부 조회
export function hasChampionshipClear(meta, expId, difficulty) {
  return !!(meta.championshipClears?.[expId]?.[difficulty]);
}

// 다음 난이도 해금 여부 (이전 난이도 클리어 시)
export function isChampionshipDifficultyUnlocked(meta, expId, difficulty) {
  if (difficulty === 'normal') return true;
  const order = ['normal', 'hard', 'hell', 'madness'];
  const idx = order.indexOf(difficulty);
  if (idx <= 0) return true;
  const prev = order[idx - 1];
  return hasChampionshipClear(meta, expId, prev);
}

// 챔피언십 신규 유물 해금
export function unlockChampionshipRelic(meta, relicName) {
  const cur = meta.championshipRelicUnlocks || [];
  if (cur.includes(relicName)) return meta;
  return {
    ...meta,
    championshipRelicUnlocks: [...cur, relicName],
  };
}
