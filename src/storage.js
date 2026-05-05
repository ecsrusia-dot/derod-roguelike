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

// 메타 데이터 로드
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

// 메타 데이터 저장
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

// 메타 데이터 초기화 (디버그용)
export async function resetMeta() {
  await saveMeta({ ...DEFAULT_META });
  return { ...DEFAULT_META };
}

// 영혼 추가
export function addSouls(meta, amount) {
  return { ...meta, souls: meta.souls + amount };
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
