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
