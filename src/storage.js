// ============================================
// derod_storage.js — 영구 저장 시스템 (IndexedDB)
// ============================================
// 메타 진행 데이터를 IndexedDB에 영구 저장합니다.
// 저장되는 것: 영혼, 강화 단계, 해금 항목, 클리어 기록
// ============================================

import { ENGRAVINGS, ENGRAVING_TIERS, ENEMIES, EVENTS, RELICS, PASSIVE_SKILLS, CODEX_DISCOVERY_REWARD, CODEX_COMPLETE_REWARD } from './data.js';

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
  // 1.72.0~ 일일 임무 — { date: 'YYYYMMDD', progress: { [missionId]: N }, claimed: [missionId] }
  // date가 오늘(KST)과 다르면 트래킹 시점에 자동 리셋. 완료 즉시 영혼 자동 지급.
  dailyMissions: null,
  // 1.72.0~ 도감 카테고리 완성 보너스 지급 기록 (카테고리당 1회)
  codexCompletionClaimed: [],
  // 진행 중인 런 스냅샷 (맵 화면 진입 시 자동 저장 — 앱 종료/새로고침 후 이어하기 용)
  // null = 진행 중 런 없음. 객체 = 재개 가능한 런 상태.
  activeRun: null,
  // 직업 각인 시스템 (1.25.0~)
  // engravings[classId] = { lv: 1~10, slots: [cardId|null, cardId|null, cardId|null] }
  engravings: {
    wanderer:   { lv: 1, slots: [null, null, null] },
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
    wanderer: [],
    sage: [],
    demonblood: [],
    elf: [],
    priest: [],
  },
  // 챔피언십 클리어 직업별 추적 (1.26.0~) — 기존 championshipClears와 별개 (소급 적용 안 됨)
  // championshipClearsByClass[classId][expId][difficulty] = true
  championshipClearsByClass: {
    wanderer:   {},
    sage:       {},
    demonblood: {},
    elf:        {},
    priest:     {},
  },
  // 1.26.0 조건 시스템 추가 안내 모달 트리거 (1회만 표시)
  // null = 안내 안 보여줌 / true = 표시 필요
  awakeningConditionNotice: null,
  // 1.35.0 lanthert → wanderer 내부 코드명 변경 안내 (1회만 표시)
  // null = 안내 안 보여줌 / 객체 = { migratedKeys: [...] }
  wandererRenameNotice: null,
  // 1.44.2 영혼의 제단 재설계 — 변경/삭제 항목 전액 환불 (1회만 표시)
  // null = 안내 안 보여줌 / 객체 = { totalRefund: N, details: { [id]: { stack, refund } } }
  altarRedesignNotice: null,
  // 1.44.2 마이그레이션 완료 플래그 (멱등성)
  altarRedesignDone: false,
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
        // 1.35.0 lanthert → wanderer 내부 코드명 변경 마이그레이션
        // 기존 사용자의 lanthert 키 데이터를 wanderer로 자동 이전. 멱등성 보장 (이미 이전했으면 스킵)
        const lanthertEng = data.engravings?.lanthert;
        const lanthertUlt = data.ultimatesPickedByClass?.lanthert;
        const lanthertChamp = data.championshipClearsByClass?.lanthert;
        const migratedKeys = [];
        if (lanthertEng && !data.engravings?.wanderer) {
          safe.engravings = { ...safe.engravings, wanderer: lanthertEng };
          delete safe.engravings.lanthert;
          migratedKeys.push('engravings');
        } else if (data.engravings?.lanthert) {
          // wanderer가 이미 있으면 lanthert 키만 정리
          const cleaned = { ...safe.engravings };
          delete cleaned.lanthert;
          safe.engravings = cleaned;
        }
        if (lanthertUlt && (!data.ultimatesPickedByClass?.wanderer || data.ultimatesPickedByClass.wanderer.length === 0)) {
          safe.ultimatesPickedByClass = { ...safe.ultimatesPickedByClass, wanderer: lanthertUlt };
          delete safe.ultimatesPickedByClass.lanthert;
          migratedKeys.push('ultimatesPickedByClass');
        } else if (data.ultimatesPickedByClass?.lanthert) {
          const cleaned = { ...safe.ultimatesPickedByClass };
          delete cleaned.lanthert;
          safe.ultimatesPickedByClass = cleaned;
        }
        if (lanthertChamp && Object.keys(lanthertChamp).length > 0 && (!data.championshipClearsByClass?.wanderer || Object.keys(data.championshipClearsByClass.wanderer).length === 0)) {
          safe.championshipClearsByClass = { ...safe.championshipClearsByClass, wanderer: lanthertChamp };
          delete safe.championshipClearsByClass.lanthert;
          migratedKeys.push('championshipClearsByClass');
        } else if (data.championshipClearsByClass?.lanthert) {
          const cleaned = { ...safe.championshipClearsByClass };
          delete cleaned.lanthert;
          safe.championshipClearsByClass = cleaned;
        }
        // 업적 ID 변경 (5건): clear_training_lanthert / master10_training_lanthert / expert_lanthert / master_lanthert / special_lanthert_3ult
        const achRenames = [
          ['clear_training_lanthert', 'clear_training_wanderer'],
          ['master10_training_lanthert', 'master10_training_wanderer'],
          ['expert_lanthert', 'expert_wanderer'],
          ['master_lanthert', 'master_wanderer'],
          ['special_lanthert_3ult', 'special_wanderer_3ult'],
        ];
        if (data.achievements) {
          const newAch = { ...safe.achievements };
          let achRenamed = false;
          for (const [oldId, newId] of achRenames) {
            if (newAch[oldId] && !newAch[newId]) {
              newAch[newId] = newAch[oldId];
              delete newAch[oldId];
              achRenamed = true;
            } else if (newAch[oldId]) {
              delete newAch[oldId];
              achRenamed = true;
            }
          }
          if (achRenamed) {
            safe.achievements = newAch;
            if (!migratedKeys.includes('achievements')) migratedKeys.push('achievements');
          }
        }
        // clearedExpeditions 배열에 'training_lanthert' 포함 시 'training_wanderer'로 치환
        if (Array.isArray(data.clearedExpeditions) && data.clearedExpeditions.some(id => id === 'training_lanthert' || (typeof id === 'string' && id.includes('lanthert')))) {
          safe.clearedExpeditions = data.clearedExpeditions
            .map(id => (typeof id === 'string' && id.includes('lanthert')) ? id.replace(/lanthert/g, 'wanderer') : id)
            .filter((id, idx, arr) => arr.indexOf(id) === idx);  // 중복 제거
          if (!migratedKeys.includes('clearedExpeditions')) migratedKeys.push('clearedExpeditions');
        }
        // unlocks 배열에 lanthert 포함 항목 치환 (예: 'unlock_lanthert')
        if (Array.isArray(data.unlocks) && data.unlocks.some(id => typeof id === 'string' && id.includes('lanthert'))) {
          safe.unlocks = data.unlocks
            .map(id => (typeof id === 'string' && id.includes('lanthert')) ? id.replace(/lanthert/g, 'wanderer') : id)
            .filter((id, idx, arr) => arr.indexOf(id) === idx);
          if (!migratedKeys.includes('unlocks')) migratedKeys.push('unlocks');
        }
        // 마이그레이션 항목 있으면 안내 모달 트리거 + 즉시 저장
        if (migratedKeys.length > 0 && !data.wandererRenameNotice) {
          safe.wandererRenameNotice = { migratedKeys };
          needsImmediateSave = true;
        }
        // 1.43.0 마이그레이션: 보조 패시브 4종(강타·잔혹·마력·신앙)의 각성 스킬 12개 폐기.
        // meta.ultimatesPickedByClass에서 폐기 ID 제거 + activeRun 안의 player.ultimates도 정리.
        const DISCONTINUED_ULTS = new Set([
          '강타_광역폭발', '강타_즉시처형', '강타_영구침묵',
          '잔혹_피의축제', '잔혹_사형선고', '잔혹_광기각성',
          '마력_시간역행', '마력_정념폭주', '마력_신탁각성',
          '신앙_여명의축복', '신앙_황혼의저주', '신앙_운명의저울',
        ]);
        let ultDiscontinuedCount = 0;
        if (safe.ultimatesPickedByClass) {
          const cleanedByClass = {};
          for (const [classId, ultList] of Object.entries(safe.ultimatesPickedByClass)) {
            if (Array.isArray(ultList)) {
              const filtered = ultList.filter(id => {
                if (DISCONTINUED_ULTS.has(id)) {
                  ultDiscontinuedCount++;
                  return false;
                }
                return true;
              });
              cleanedByClass[classId] = filtered;
            } else {
              cleanedByClass[classId] = ultList;
            }
          }
          safe.ultimatesPickedByClass = cleanedByClass;
        }
        // activeRun이 있고 player.ultimates에 폐기 ID가 있으면 제거
        if (safe.activeRun?.player?.ultimates && Array.isArray(safe.activeRun.player.ultimates)) {
          const filtered = safe.activeRun.player.ultimates.filter(id => {
            if (DISCONTINUED_ULTS.has(id)) {
              ultDiscontinuedCount++;
              return false;
            }
            return true;
          });
          if (filtered.length !== safe.activeRun.player.ultimates.length) {
            safe.activeRun = {
              ...safe.activeRun,
              player: { ...safe.activeRun.player, ultimates: filtered },
            };
          }
        }
        if (ultDiscontinuedCount > 0) {
          needsImmediateSave = true;
        }
        // 1.44.0 마이그레이션: 슬롯 3 해금 Lv.9 → Lv.8 변경.
        // Lv.8 이상이지만 slots[2]가 null인 직업은 자동으로 랜덤 각인 1장 부여.
        let slot3MigratedCount = 0;
        if (safe.engravings) {
          const migratedEng = { ...safe.engravings };
          for (const [classId, engData] of Object.entries(safe.engravings)) {
            const lv = engData?.lv || 1;
            const slots = engData?.slots || [null, null, null];
            if (lv >= 8 && !slots[2]) {
              // ENGRAVINGS 풀이 빈 직업(sage/demonblood/elf/priest)은 건너뜀
              const pool = ENGRAVINGS[classId] || [];
              if (pool.length === 0) continue;
              // 가중치 기반 랜덤 픽 (rollEngravingCard 로직 미니 버전)
              const weights = pool.map(c => ENGRAVING_TIERS[c.tier]?.weight || 0);
              const total = weights.reduce((s, w) => s + w, 0);
              if (total === 0) continue;
              let r = Math.random() * total;
              let picked = pool[0];
              for (let i = 0; i < pool.length; i++) {
                r -= weights[i];
                if (r <= 0) { picked = pool[i]; break; }
              }
              migratedEng[classId] = {
                ...engData,
                slots: [slots[0], slots[1], picked.id],
              };
              slot3MigratedCount++;
            }
          }
          if (slot3MigratedCount > 0) {
            safe.engravings = migratedEng;
            needsImmediateSave = true;
          }
        }
        // 1.44.2 마이그레이션: 영혼의 제단 재설계 — 변경/삭제 항목 전액 환불.
        // 멱등성: altarRedesignDone 플래그로 1회만 실행.
        if (!safe.altarRedesignDone) {
          const LEGACY_COSTS_1442 = {
            meta_startGold: (s) => 50 + s * 50,        // 기존 50→500 (max 10)
            meta_startGem: (s) => 50 + s * 50,         // 기존 50→250 (max 5)
            meta_startRelic: (s) => s === 0 ? 500 : 2000, // 기존 500, 2000
            meta_maxEther: (s) => 200 + s * 200,       // 기존 200, 400
            meta_dmgDealt: (s) => 500 + s * 500,       // 기존 500→2500 (max 5)
            meta_dmgTaken: (s) => 300 + s * 300,       // 기존 300→1500 (max 5)
            meta_critRate: (s) => 500 + s * 500,       // 기존 500→2500 (max 5)
            meta_rerollDiscount: () => 600,            // 폐기
            meta_champion_normal: () => 3000,
            meta_champion_madness: () => 10000,
          };
          let refund1442 = 0;
          const refundDetails = {};
          const newUpgrades = { ...safe.upgrades };
          for (const [id, costFn] of Object.entries(LEGACY_COSTS_1442)) {
            const stack = safe.upgrades?.[id] || 0;
            if (stack > 0) {
              let itemRefund = 0;
              for (let i = 0; i < stack; i++) itemRefund += costFn(i);
              refund1442 += itemRefund;
              refundDetails[id] = { stack, refund: itemRefund };
              delete newUpgrades[id];
            }
          }
          if (refund1442 > 0) {
            safe.upgrades = newUpgrades;
            safe.souls = (safe.souls || 0) + refund1442;
            safe.altarRedesignNotice = { totalRefund: refund1442, details: refundDetails };
          }
          safe.altarRedesignDone = true;
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
// 1.53.0~ lastSavedAt 갱신 — pickLatest 비교 시 로컬도 공정한 기준점을 갖도록.
// 이전엔 saveCloudMeta만 lastSavedAt를 부여 → 부팅 시 항상 클라우드 승리 →
// 클라우드 저장 실패 구간(오프라인·디바운스 윈도우 내 종료)의 로컬 진행이 silent rollback.
export async function saveMeta(meta) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const toStore = { ...meta, lastSavedAt: Date.now() };
      const request = store.put(toStore, META_KEY);
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

// 카테고리별 도감 전체 항목 수 (완성 보너스 판정용)
function getCodexTotal(category) {
  switch (category) {
    case 'enemies': return Object.keys(ENEMIES).length;
    case 'events': return EVENTS.length;
    case 'relics': return RELICS.length;
    case 'passives': return Object.keys(PASSIVE_SKILLS).length;
    default: return 0;
  }
}

// 도감 항목 추가 (이미 있으면 그대로)
// category: 'enemies' | 'events' | 'relics' | 'passives'
// 1.72.0~ 도감 발견 보너스: 신규 발견 +5 영혼, 카테고리 완성 시 +100 영혼 (1회)
export function recordCodex(meta, category, id) {
  if (!id) return meta;
  const codex = meta.codex || { enemies: [], events: [], relics: [], passives: [] };
  const list = codex[category] || [];
  if (list.includes(id)) return meta;
  const newList = [...list, id];
  let next = {
    ...meta,
    codex: { ...codex, [category]: newList },
    souls: (meta.souls || 0) + CODEX_DISCOVERY_REWARD,
  };
  const total = getCodexTotal(category);
  const claimed = next.codexCompletionClaimed || [];
  if (total > 0 && newList.length >= total && !claimed.includes(category)) {
    next = {
      ...next,
      souls: next.souls + CODEX_COMPLETE_REWARD,
      codexCompletionClaimed: [...claimed, category],
    };
  }
  return next;
}

// 1.72.0~ 일일 임무 진행 트래킹
// mission: DAILY_MISSIONS 항목 객체 (data/meta.js) — 순환 import 방지 위해 호출부에서 전달
// dateKey: getKstDateKey() (utils/dailyChallenge.js). 날짜가 바뀌면 자동 리셋.
// 완료 즉시 영혼 자동 지급 + claimed 기록 (중복 지급 없음)
export function trackDailyMission(meta, mission, amount, dateKey) {
  if (!mission || !dateKey) return meta;
  let dm = meta.dailyMissions;
  if (!dm || dm.date !== dateKey) dm = { date: dateKey, progress: {}, claimed: [] };
  if ((dm.claimed || []).includes(mission.id)) {
    return dm === meta.dailyMissions ? meta : { ...meta, dailyMissions: dm };
  }
  const cur = Math.min(mission.target, (dm.progress?.[mission.id] || 0) + amount);
  dm = { ...dm, progress: { ...dm.progress, [mission.id]: cur } };
  if (cur >= mission.target) {
    dm = { ...dm, claimed: [...(dm.claimed || []), mission.id] };
    return { ...meta, dailyMissions: dm, souls: (meta.souls || 0) + mission.reward };
  }
  return { ...meta, dailyMissions: dm };
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
  const classKeys = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
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

// 각성도 Lv에 따라 개방된 슬롯 개수 (1.44.0~ Lv.2/5/8 기준, 이전 Lv.2/5/9)
export function getUnlockedSlotCount(awakeningLv) {
  if (awakeningLv >= 8) return 3;
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

// 1.35.0 lanthert → wanderer 코드명 변경 안내 모달 acknowledge
export function clearWandererRenameNotice(meta) {
  if (!meta.wandererRenameNotice) return meta;
  return { ...meta, wandererRenameNotice: null };
}

// 1.44.2 영혼의 제단 재설계 안내 모달 acknowledge
export function clearAltarRedesignNotice(meta) {
  if (!meta.altarRedesignNotice) return meta;
  return { ...meta, altarRedesignNotice: null };
}
