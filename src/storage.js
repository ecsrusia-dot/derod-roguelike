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
  // 도감 — 한 번이라도 만난/획득한 항목 영구 기록
  // 각 카테고리: 문자열 ID 배열
  codex: {
    enemies: [],   // ENEMIES key
    events: [],    // EVENT.id
    relics: [],    // RELIC.name
    passives: [],  // PASSIVE_SKILLS key
  },
  // 일일 챌린지 첫 클리어 기록 (KST 날짜 키 → true)
  dailyClears: {},
  // 진행 중인 런 스냅샷 (맵 화면 진입 시 자동 저장 — 앱 종료/새로고침 후 이어하기 용)
  // null = 진행 중 런 없음. 객체 = 재개 가능한 런 상태.
  activeRun: null,
  // 직업 각인 시스템 (1.25.0~)
  // engravings[classId] = { lv: 1~10, slots: [cardId|null, cardId|null, cardId|null] }
  engravings: {
    lanthert:   { lv: 1, slots: [null, null, null] },
    sage:       { lv: 1, slots: [null, null, null] },
    demonblood: { lv: 1, slots: [null, null, null] },
    elf:        { lv: 1, slots: [null, null, null] },
    priest:     { lv: 1, slots: [null, null, null] },
  },
  // meta_startSkillLv → 각인 시스템 이관 안내 (1.25.0 첫 부팅 시 1회 표시)
  // null = 안내 안 보여줌 / 객체 = { refundedSouls: N, refundedStack: N }
  engravingMigrationNotice: null,
  // ULTIMATE_SKILLS 직업별 픽 기록 (1.26.0~)
  // ultimatesPickedByClass[classId] = ['ult_id1', 'ult_id2', ...] (중복 없음)
  ultimatesPickedByClass: {
    lanthert: [],
    sage: [],
    demonblood: [],
    elf: [],
    priest: [],
  },
  // 챔피언십 클리어 직업별 추적 (1.26.0~) — 기존 championshipClears와 별개 (소급 적용 안 됨)
  // championshipClearsByClass[classId][expId][difficulty] = true
  championshipClearsByClass: {
    lanthert:   {},
    sage:       {},
    demonblood: {},
    elf:        {},
    priest:     {},
  },
  // 1.26.0 조건 시스템 추가 안내 모달 트리거 (1회만 표시)
  // null = 안내 안 보여줌 / true = 표시 필요
  awakeningConditionNotice: null,
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
        // codex는 중첩 객체라 누락 필드 보강
        safe.codex = { ...DEFAULT_META.codex, ...(data.codex || {}) };
        // engravings는 직업별 중첩이라 누락 직업 보강 (신규 직업 추가 대비)
        safe.engravings = { ...DEFAULT_META.engravings, ...(data.engravings || {}) };
        // 1.26.0 직업별 추적 데이터 보강
        safe.ultimatesPickedByClass = { ...DEFAULT_META.ultimatesPickedByClass, ...(data.ultimatesPickedByClass || {}) };
        safe.championshipClearsByClass = { ...DEFAULT_META.championshipClearsByClass, ...(data.championshipClearsByClass || {}) };
        // 1.26.0 조건 시스템 신설 안내 — ultimatesPickedByClass 키가 데이터에 없었다면 첫 마이그레이션
        if (!data.ultimatesPickedByClass && !data.awakeningConditionNotice) {
          safe.awakeningConditionNotice = true;
        }
        // 1.25.0 마이그레이션: meta_startSkillLv → 각인 시스템 이관 + 영혼 100% 환불
        // 이미 마이그레이션 했으면 (upgrades에 키 없으면) 스킵
        const oldStack = safe.upgrades?.meta_startSkillLv;
        let needsImmediateSave = false;
        if (oldStack && oldStack > 0) {
          // 환불 계산 (cost: stack 0 → 500, stack 1 → 2000)
          let refund = 0;
          if (oldStack >= 1) refund += 500;
          if (oldStack >= 2) refund += 2000;
          safe.souls = (safe.souls || 0) + refund;
          // 키 삭제
          const newUpgrades = { ...safe.upgrades };
          delete newUpgrades.meta_startSkillLv;
          safe.upgrades = newUpgrades;
          // 안내 모달 트리거 데이터 저장
          safe.engravingMigrationNotice = { refundedSouls: refund, refundedStack: oldStack };
          needsImmediateSave = true;
        }
        // 1.26.0 조건 시스템 첫 마이그레이션이면 보강 후 저장 (안내 모달 재트리거 방지)
        if (!data.ultimatesPickedByClass) {
          needsImmediateSave = true;
        }
        if (needsImmediateSave) {
          // 즉시 저장해 재실행 방지
          saveMeta(safe).then(() => resolve(safe)).catch(() => resolve(safe));
          return;
        }
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
// 진행 중인 런 스냅샷 저장 (맵 화면 진입 시 호출)
export function saveActiveRun(meta, snapshot) {
  if (!snapshot) return meta;
  return { ...meta, activeRun: snapshot };
}

// 진행 중인 런 삭제 (사망/원정 클리어/새 런 시작 시)
export function clearActiveRun(meta) {
  if (!meta || meta.activeRun == null) return meta;
  return { ...meta, activeRun: null };
}

// 일일 챌린지 클리어 기록 (KST 날짜 키)
export function recordDailyClear(meta, dateKey) {
  if (!dateKey) return meta;
  const clears = meta.dailyClears || {};
  if (clears[dateKey]) return meta;
  return { ...meta, dailyClears: { ...clears, [dateKey]: true } };
}

export function hasDailyCleared(meta, dateKey) {
  return !!(meta && meta.dailyClears && meta.dailyClears[dateKey]);
}

// 도감 항목 추가 (이미 있으면 그대로)
// category: 'enemies' | 'events' | 'relics' | 'passives'
export function recordCodex(meta, category, id) {
  if (!id) return meta;
  const codex = meta.codex || { enemies: [], events: [], relics: [], passives: [] };
  const list = codex[category] || [];
  if (list.includes(id)) return meta;
  return {
    ...meta,
    codex: { ...codex, [category]: [...list, id] },
  };
}

export function recordExpeditionClear(meta, expeditionId) {
  if (meta.clearedExpeditions.includes(expeditionId)) return meta;
  return {
    ...meta,
    clearedExpeditions: [...meta.clearedExpeditions, expeditionId],
  };
}

// 챔피언십에서 사용 가능한 직업인지 확인
// (해당 직업의 수련의 길 클리어 시 해금)
export function isChampionshipClassUnlocked(meta, classId) {
  if (!meta || !meta.clearedExpeditions) return false;
  // training_{classId} 패턴의 expedition을 클리어했는지
  const classKeys = ['lanthert', 'sage', 'demonblood', 'elf', 'priest'];
  const key = classKeys[classId];
  if (!key) return false;
  return meta.clearedExpeditions.includes(`training_${key}`);
}

// 챔피언십에서 사용 가능한 직업 ID 배열 반환
export function getUnlockedChampionshipClasses(meta) {
  const result = [];
  for (let i = 0; i < 5; i++) {
    if (isChampionshipClassUnlocked(meta, i)) {
      result.push(i);
    }
  }
  return result;
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

// =========== 직업 각인 시스템 헬퍼 (1.25.0~) ===========

// 현재 각성도 Lv 조회 (없으면 1)
export function getAwakeningLv(meta, classId) {
  return meta?.engravings?.[classId]?.lv ?? 1;
}

// 슬롯 배열 조회 (없으면 [null, null, null])
export function getEngravingSlots(meta, classId) {
  return meta?.engravings?.[classId]?.slots ?? [null, null, null];
}

// 각성도 Lv에 따라 개방된 슬롯 개수 (Lv.2/5/9 기준)
export function getUnlockedSlotCount(awakeningLv) {
  if (awakeningLv >= 9) return 3;
  if (awakeningLv >= 5) return 2;
  if (awakeningLv >= 2) return 1;
  return 0;
}

// 각성도 강화 적용 (영혼 차감 + Lv +1)
// cost는 호출 측에서 검증. 슬롯 개방 시점이면 slotCard에 새 각인 ID 전달.
export function applyAwakening(meta, classId, cost, slotIdx = null, slotCard = null) {
  const cur = meta.engravings?.[classId] ?? { lv: 1, slots: [null, null, null] };
  const newSlots = [...cur.slots];
  if (slotIdx !== null && slotCard !== null) {
    newSlots[slotIdx] = slotCard;
  }
  return {
    ...meta,
    souls: (meta.souls || 0) - cost,
    engravings: {
      ...(meta.engravings || {}),
      [classId]: {
        lv: cur.lv + 1,
        slots: newSlots,
      },
    },
  };
}

// 각인 슬롯 카드 변경 (가챠 결과 덮어쓰기). cost는 호출 측에서 차감 처리.
export function applyEngravingSlot(meta, classId, slotIdx, cardId, costPaid = 0) {
  const cur = meta.engravings?.[classId] ?? { lv: 1, slots: [null, null, null] };
  const newSlots = [...cur.slots];
  newSlots[slotIdx] = cardId;
  return {
    ...meta,
    souls: (meta.souls || 0) - costPaid,
    engravings: {
      ...(meta.engravings || {}),
      [classId]: {
        ...cur,
        slots: newSlots,
      },
    },
  };
}

// 마이그레이션 안내 acknowledge — 모달 닫을 때 호출
export function clearEngravingMigrationNotice(meta) {
  if (!meta.engravingMigrationNotice) return meta;
  return { ...meta, engravingMigrationNotice: null };
}

// =========== 각성도 조건 추적 (1.26.0~) ===========

// 챔피언십 클리어를 직업별로 추가 기록 (기존 recordChampionshipClear와 별개로 호출)
export function recordChampionshipClearByClass(meta, classId, expId, difficulty) {
  if (!classId || !expId || !difficulty) return meta;
  const byClass = meta.championshipClearsByClass || {};
  const classClears = byClass[classId] || {};
  const expClears = classClears[expId] || {};
  if (expClears[difficulty]) return meta;
  return {
    ...meta,
    championshipClearsByClass: {
      ...byClass,
      [classId]: {
        ...classClears,
        [expId]: { ...expClears, [difficulty]: true },
      },
    },
  };
}

// ULTIMATE_SKILLS 픽을 직업별로 기록 (직업 런에서 궁극 보상 픽 시 호출)
// 중복 픽은 무시 (Set 의미)
export function recordUltimatePickByClass(meta, classId, ultId) {
  if (!classId || !ultId) return meta;
  const byClass = meta.ultimatesPickedByClass || {};
  const picked = byClass[classId] || [];
  if (picked.includes(ultId)) return meta;
  return {
    ...meta,
    ultimatesPickedByClass: {
      ...byClass,
      [classId]: [...picked, ultId],
    },
  };
}

// 1.26.0 조건 시스템 안내 모달 acknowledge
export function clearAwakeningConditionNotice(meta) {
  if (!meta.awakeningConditionNotice) return meta;
  return { ...meta, awakeningConditionNotice: null };
}
