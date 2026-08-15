// ============================================
// derod_storage.js — 영구 저장 시스템 (IndexedDB)
// ============================================
// 메타 진행 데이터를 IndexedDB에 영구 저장합니다.
// 저장되는 것: 영혼, 강화 단계, 해금 항목, 클리어 기록
// ============================================

import { ENGRAVINGS, ENGRAVING_TIERS, ENEMIES, EVENTS, RELICS, PASSIVE_SKILLS, CODEX_DISCOVERY_REWARD, CODEX_COMPLETE_REWARD, backfillRaidSeries, FEATURE_FLAGS, BURIED_LEGACY_MAX, addBuriedItemToChar, buriedDustValue as buriedDustValueOf, checkBuriedEncounterUnlock } from './data.js';

const DB_NAME = 'derod_meta';
const DB_VERSION = 1;
const STORE_NAME = 'meta';
const META_KEY = 'meta_data';

// 기본 메타 데이터 구조
const DEFAULT_META = {
  // 1.99.3~ 로컬 데이터 소유 계정 (Firebase uid) — 계정 전환 시 이전 계정 로컬이
  // pickLatest에서 승리해 현재 계정 클라우드를 덮어쓰던 오염 사고 방지용. local 모드는 null 유지.
  ownerUid: null,
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
  // 1.73.0~ 무한던전 스킵 — { date: 'YYYYMMDD', used: N } (KST 자정 리셋, 하루 5회)
  endlessSkip: null,
  // 1.84.0~ 자동 사냥 전적 로그 — 런 종료(클리어/전멸)마다 조합·결과 기록 (최근 300건)
  // entry: { t, cls, exp, diff, res: 'clear'|'defeat', bt, dmg, sk: [패시브], rl: [유물], ul: [각성 id] }
  autoRunLog: [],
  // 1.85.0~ 황혼의 도박장 — 전용 재화 + 일일 입장 기록
  twilightCoins: 0,   // 황혼 주화 (도박장 전용 재화)
  fateShards: 0,      // 운명의 조각 (잭팟 천장 — 100개 = 주화 500)
  gambleDaily: null,  // { date: 'YYYYMMDD', used: N } — KST 자정 리셋
  // 1.89.0~ 마스터즈 칭호 — 직업별 별도 획득 + 직업당 1개 장착
  titles: { wanderer: [], sage: [], demonblood: [], elf: [], priest: [] },
  equippedTitle: { wanderer: null, sage: null, demonblood: null, elf: null, priest: null },
  // 1.74.0~ 레이드 (본편과 분리된 성장 축)
  // inventory: 미장착 장비 배열 / equipped[classId][slot] = item / clears[dungeonId] = 클리어 횟수
  raid: {
    inventory: [],
    equipped: { wanderer: {}, sage: {}, demonblood: {}, elf: {}, priest: {} },
    clears: {},
    // 1.75.0~ 심연석 (분해로 획득, 강화에 소모) + 주간 첫 클리어 기록
    stones: 0,
    weekly: null, // { week: 'YYYYMMDD'(월요일 키), claimed: [dungeonId] }
    // 1.76.0~ 군주의 정수 — 상위 막보 전용 희귀 재료 (에픽·레전더리 제작)
    essence: 0,
    // 1.78.0~ 기연 비전 재설계 — 활성 비전 1슬롯 + 조우 이력 (재발생 방지, 던전당 평생 1회)
    secretSkill: null,   // 활성 비전 ID | null
    secretHistory: [],   // 만난 적 있는 비전 ID 목록 (유지/변경과 무관하게 기록)
    // 1.79.0~ 전후방 배치 — { classId: 'front' | 'back' }
    formation: { wanderer: 'front', demonblood: 'front', elf: 'back', sage: 'back', priest: 'back' },
  },
  // 1.98.0~ 명예의 전당 (HOF 제로식 모티브 — 패턴 프로그래밍 파티전, 본편·레이드와 분리)
  // levels[charId] = 레벨(1~) / patterns[charId] = [{c, v, s}] (null이면 기본 패턴) / clears[stageId] = true / medals = 전당 훈장
  hof: {
    levels: {},
    patterns: null,
    clears: {},
    medals: 0,
  },
  // 1.103.0~ 무덤의 유산 (BuriedBornes 모티브 별도 모드 — 본편과 완전 분리)
  // char: 진행 중 캐릭터 스냅샷(사망 시 null) / legacy: 계승 대기 장비 / legacyGold: 계승 골드
  // deepest: 도달 최고 층 / clears: 던전 클리어 횟수 / deaths: 사망 횟수 / dust: 무덤 먼지
  buried: {
    char: null,
    legacy: [],
    legacyGold: 0,
    dust: 0,
    deepest: 0,
    clears: {},        // 1.104.0~ { dungeonId: 클리어 횟수 }
    deaths: 0,
    runs: 0,
    unlockedDungeons: ['labyrinth'],  // 1.104.0~ 해금된 던전 (미궁은 항상 열림)
    unlockedClasses: [],              // 1.104.0~ 해금된 상위(전직) 직업 id
    legacySlots: 6,                   // 1.105.0~ 유산 보관함 크기 (먼지로 최대 12칸 확장)
  },
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
  // 1.100.0~ 던전별 베스트 런타임 (×1 배속 기준 ms) — bestRunTimes[key] = { ms, cls, t }
  //   key: 클래식 exp.id / 챔피언십 `${champId}@${diff}` / 마스터즈 fusion id. 도박장·무한 제외.
  bestRunTimes: {},
  // 1.99.2~ 마스터즈 직업별 클리어 추적 — mastersClearsByClass[classId][fusionId] = true (소급 불가)
  mastersClearsByClass: {
    wanderer: {}, sage: {}, demonblood: {}, elf: {}, priest: {},
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
        // 1.89.0 칭호 중첩 객체 보강
        safe.titles = { ...DEFAULT_META.titles, ...(data.titles || {}) };
        safe.equippedTitle = { ...DEFAULT_META.equippedTitle, ...(data.equippedTitle || {}) };
        // 1.74.0 레이드 중첩 객체 보강
        safe.raid = {
          ...DEFAULT_META.raid,
          ...(data.raid || {}),
          equipped: { ...DEFAULT_META.raid.equipped, ...(data.raid?.equipped || {}) },
        };
        // 1.98.0 명예의 전당 중첩 객체 보강
        safe.hof = { ...DEFAULT_META.hof, ...(data.hof || {}) };
        // 1.103.0 무덤의 유산 중첩 객체 보강
        safe.buried = { ...DEFAULT_META.buried, ...(data.buried || {}) };
        // 1.26.0 직업별 추적 데이터 보강
        safe.ultimatesPickedByClass = { ...DEFAULT_META.ultimatesPickedByClass, ...(data.ultimatesPickedByClass || {}) };
        safe.championshipClearsByClass = { ...DEFAULT_META.championshipClearsByClass, ...(data.championshipClearsByClass || {}) };
        // 1.99.2 마스터즈 직업별 추적 보강
        safe.mastersClearsByClass = { ...DEFAULT_META.mastersClearsByClass, ...(data.mastersClearsByClass || {}) };
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
        // 1.97.0 벨트 제단 강화(meta_beltSlot) 폐기 환불 — 1.96.0 하루 존재. 직업별 조건 확장으로 대체
        const beltStack = safe.upgrades?.meta_beltSlot || 0;
        if (beltStack > 0) {
          let beltRefund = 0;
          if (beltStack >= 1) beltRefund += 400;   // cost(0)
          if (beltStack >= 2) beltRefund += 1000;  // cost(1)
          safe.souls = (safe.souls || 0) + beltRefund;
          const nu = { ...safe.upgrades };
          delete nu.meta_beltSlot;
          safe.upgrades = nu;
          needsImmediateSave = true;
        }
        // 1.79.1 레이드 레거시 장비 series 백필 — 1.75.0 이전 드랍 장비의 세트 판정 누락 픽스
        const raidBackfill = backfillRaidSeries(safe.raid);
        if (raidBackfill.changed) {
          safe.raid = raidBackfill.raid;
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
        // 1.101.0 에테르 시스템 삭제 — 제단 「에테르의 그릇」(meta_maxEther) 폐기 전액 환불
        // ※ 1.44.2 레거시 환불 블록 뒤에 두어야 함 — 구가격(200/400) 구매분은 위에서 정산되고,
        //   여기는 1.44.2 이후 재구매분(1500/3000)만 남음. 키 삭제로 멱등
        const etherStack = safe.upgrades?.meta_maxEther || 0;
        if (etherStack > 0) {
          let etherRefund = 0;
          if (etherStack >= 1) etherRefund += 1500;  // cost(0)
          if (etherStack >= 2) etherRefund += 3000;  // cost(1)
          safe.souls = (safe.souls || 0) + etherRefund;
          const nu2 = { ...safe.upgrades };
          delete nu2.meta_maxEther;
          safe.upgrades = nu2;
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

// 1.73.0~ 무한던전 스킵 — 오늘 사용 횟수 (날짜 다르면 0)
export function getEndlessSkipUsed(meta, dateKey) {
  const es = meta?.endlessSkip;
  return es && es.date === dateKey ? es.used || 0 : 0;
}

// 1.73.0~ 무한던전 스킵 1회 소모 + 시뮬 보상 영혼 지급 (횟수 검증은 호출부)
export function useEndlessSkip(meta, dateKey, souls) {
  const used = getEndlessSkipUsed(meta, dateKey);
  return {
    ...meta,
    endlessSkip: { date: dateKey, used: used + 1 },
    souls: (meta.souls || 0) + Math.max(0, souls || 0),
  };
}

// ============================================
// 1.74.0~ 레이드 장비/클리어 헬퍼
// ============================================
// =============================================
// 1.89.0~ 마스터즈 칭호 (직업별 획득 + 1개 장착)
// =============================================

export function addClassTitle(meta, classId, titleId) {
  const owned = meta?.titles?.[classId] || [];
  if (owned.includes(titleId)) return meta;
  return { ...meta, titles: { ...(meta.titles || {}), [classId]: [...owned, titleId] } };
}

// titleId=null이면 해제. 미보유 칭호는 장착 불가
export function equipClassTitle(meta, classId, titleId) {
  if (titleId && !(meta?.titles?.[classId] || []).includes(titleId)) return meta;
  return { ...meta, equippedTitle: { ...(meta.equippedTitle || {}), [classId]: titleId } };
}

// =============================================
// 1.85.0~ 황혼의 도박장 (재화·일일 제한)
// =============================================

export function getGambleUsed(meta, dateKey) {
  const g = meta?.gambleDaily;
  return g && g.date === dateKey ? (g.used || 0) : 0;
}

export function useGambleEntry(meta, dateKey) {
  const used = getGambleUsed(meta, dateKey);
  return { ...meta, gambleDaily: { date: dateKey, used: used + 1 } };
}

export function addTwilightCoins(meta, n) {
  if (!n) return meta;
  let m = { ...meta, twilightCoins: Math.max(0, (meta.twilightCoins || 0) + n) };
  // 1.90.0~ 획득분만 평생 누적 (상점 차감은 제외) → 주화 부자 업적
  if (n > 0) {
    m.twilightCoinsEarned = (m.twilightCoinsEarned || 0) + n;
    m = setAchievementProgress(m, 'gamble_coins_2000', m.twilightCoinsEarned, 2000);
  }
  return m;
}

export function addFateShards(meta, n) {
  if (!n) return meta;
  return { ...meta, fateShards: Math.max(0, (meta.fateShards || 0) + n) };
}

// 천장 교환 — 조각 shardCost개 → 주화 coins. 부족하면 원본 반환
export function redeemFateShards(meta, shardCost, coins) {
  if ((meta?.fateShards || 0) < shardCost) return meta;
  return { ...meta, fateShards: meta.fateShards - shardCost, twilightCoins: (meta.twilightCoins || 0) + coins };
}

// 전용 상점 구매 — 주화 부족 시 null (호출부에서 무시)
// legendaryEngraving은 직업·슬롯 선택이 필요해 여기서 처리 안 함 (GambleScreen 피커 → App 핸들러)
export function buyGambleShopItem(meta, item) {
  if (!item || (meta?.twilightCoins || 0) < item.cost) return null;
  if (item.grant?.legendaryEngraving) return null;
  let m = { ...meta, twilightCoins: meta.twilightCoins - item.cost };
  if (item.grant?.souls) m = addSouls(m, item.grant.souls);
  if (item.grant?.stones || item.grant?.essence) {
    m = addRaidResources(m, { stones: item.grant.stones || 0, essence: item.grant.essence || 0 });
  }
  // 1.86.0~ 기연 재조우권 — 조우 이력 초기화 (활성 비전만 이력에 유지해 중복 조우 방지)
  if (item.grant?.secretReset) {
    const raid = m.raid || {};
    m = { ...m, raid: { ...raid, secretHistory: raid.secretSkill ? [raid.secretSkill] : [] } };
  }
  return m;
}

// =============================================
// 1.84.0~ 자동 사냥 전적 로그 (최적 조합 분석용)
// =============================================
const AUTO_RUN_LOG_CAP = 300;

export function appendAutoRunLog(meta, entry) {
  if (!entry) return meta;
  const log = [...(meta.autoRunLog || []), entry].slice(-AUTO_RUN_LOG_CAP);
  return { ...meta, autoRunLog: log };
}

const EMPTY_RAID = { inventory: [], equipped: { wanderer: {}, sage: {}, demonblood: {}, elf: {}, priest: {} }, clears: {}, stones: 0, weekly: null, essence: 0, secretSkill: null, secretHistory: [], formation: { wanderer: 'front', demonblood: 'front', elf: 'back', sage: 'back', priest: 'back' } };

function getRaid(meta) {
  const raid = meta?.raid || EMPTY_RAID;
  return {
    ...EMPTY_RAID,
    ...raid,
    equipped: { ...EMPTY_RAID.equipped, ...(raid.equipped || {}) },
    formation: { ...EMPTY_RAID.formation, ...(raid.formation || {}) },
  };
}

// 드랍 장비를 인벤토리에 추가
export function addRaidDrops(meta, items) {
  if (!items || items.length === 0) return meta;
  const raid = getRaid(meta);
  let m = { ...meta, raid: { ...raid, inventory: [...raid.inventory, ...items] } };
  // 1.90.0~ 에픽 획득 업적 — 드랍·제작·가챠 모든 경로가 이 함수를 지나감
  if (items.some(i => i?.rarity === 'EP')) {
    m = completeAchievement(m, 'raid_epic_drop', 1);
  }
  return m;
}

// 장비 1개 장착 — 기존 장착품은 인벤토리로 복귀
export function equipRaidItem(meta, itemId) {
  const raid = getRaid(meta);
  const item = raid.inventory.find(i => i.id === itemId);
  if (!item) return meta;
  const prev = raid.equipped?.[item.classId]?.[item.slot] || null;
  const newInventory = raid.inventory.filter(i => i.id !== itemId).concat(prev ? [prev] : []);
  return {
    ...meta,
    raid: {
      ...raid,
      inventory: newInventory,
      equipped: {
        ...raid.equipped,
        [item.classId]: { ...(raid.equipped?.[item.classId] || {}), [item.slot]: item },
      },
    },
  };
}

// 일괄 장착 — 직업×슬롯마다 (장착품 + 인벤토리) 중 power 최고 장비 자동 장착
export function autoEquipRaidBest(meta) {
  const raid = getRaid(meta);
  const pool = [...raid.inventory];
  const equipped = {};
  Object.keys(EMPTY_RAID.equipped).forEach(classId => {
    equipped[classId] = { ...(raid.equipped?.[classId] || {}) };
  });
  Object.keys(equipped).forEach(classId => {
    ['weapon', 'armor', 'accessory'].forEach(slot => {
      const current = equipped[classId][slot] || null;
      const candidates = pool.filter(i => i.classId === classId && i.slot === slot);
      if (candidates.length === 0) return;
      const best = candidates.reduce((a, b) => ((b.power || 0) > (a.power || 0) ? b : a));
      if (!current || (best.power || 0) > (current.power || 0)) {
        const idx = pool.findIndex(i => i.id === best.id);
        pool.splice(idx, 1);
        if (current) pool.push(current);
        equipped[classId][slot] = best;
      }
    });
  });
  return { ...meta, raid: { ...raid, inventory: pool, equipped } };
}

// 던전 클리어 횟수 기록
export function recordRaidClear(meta, dungeonId) {
  const raid = getRaid(meta);
  const clears = { ...(raid.clears || {}) };
  clears[dungeonId] = (clears[dungeonId] || 0) + 1;
  return { ...meta, raid: { ...raid, clears } };
}

// ============================================
// 1.75.0~ 레이드 2차: 분해·강화·주간 보상
// ============================================

// 장비 1개 분해 → 심연석 (인벤토리 전용 — 장착 장비는 해제 후 분해)
export function dismantleRaidItem(meta, itemId, stoneValue) {
  const raid = getRaid(meta);
  const item = raid.inventory.find(i => i.id === itemId);
  if (!item) return meta;
  return {
    ...meta,
    raid: {
      ...raid,
      inventory: raid.inventory.filter(i => i.id !== itemId),
      stones: (raid.stones || 0) + (stoneValue || 0),
    },
  };
}

// 하위 장비 일괄 분해 — 같은 직업·슬롯의 장착 장비보다 power가 낮은 인벤토리 장비 전부.
// valueOf(item) → 심연석 값. 반환: { meta, count, stones }
export function dismantleRaidJunk(meta, valueOf) {
  const raid = getRaid(meta);
  let gained = 0;
  const keep = [];
  const junk = [];
  raid.inventory.forEach(item => {
    const equippedItem = raid.equipped?.[item.classId]?.[item.slot] || null;
    if (equippedItem && (item.power || 0) < (equippedItem.power || 0)) junk.push(item);
    else keep.push(item);
  });
  junk.forEach(item => { gained += valueOf(item) || 0; });
  if (junk.length === 0) return { meta, count: 0, stones: 0 };
  return {
    meta: { ...meta, raid: { ...raid, inventory: keep, stones: (raid.stones || 0) + gained } },
    count: junk.length,
    stones: gained,
  };
}

// 장착 장비 강화 +1 — 비용 심연석 (검증은 여기서, 비용·최대치는 호출부가 전달)
// 1.87.0~ cost는 숫자(심연석 — 하위 호환) 또는 { stones, essence } (초월은 정수 소모)
export function enhanceRaidItem(meta, classId, slot, cost, maxLevel) {
  const { stones = 0, essence = 0 } = typeof cost === 'number' ? { stones: cost } : (cost || {});
  const raid = getRaid(meta);
  const item = raid.equipped?.[classId]?.[slot];
  if (!item) return meta;
  if ((item.enh || 0) >= maxLevel) return meta;
  if ((raid.stones || 0) < stones || (raid.essence || 0) < essence) return meta;
  const upgraded = { ...item, enh: (item.enh || 0) + 1 };
  return {
    ...meta,
    raid: {
      ...raid,
      stones: (raid.stones || 0) - stones,
      essence: (raid.essence || 0) - essence,
      equipped: {
        ...raid.equipped,
        [classId]: { ...(raid.equipped?.[classId] || {}), [slot]: upgraded },
      },
    },
  };
}

// 1.79.0~ 전후방 배치 토글 (전열 ↔ 후열)
export function toggleRaidFormation(meta, classId) {
  if (!classId) return meta;
  const raid = getRaid(meta);
  const cur = raid.formation?.[classId] || 'back';
  return {
    ...meta,
    raid: { ...raid, formation: { ...raid.formation, [classId]: cur === 'front' ? 'back' : 'front' } },
  };
}

// 1.78.0~ 기연 조우 처리 — 이력 기록(재발생 방지) + 활성 결정
// swap: 활성 비전이 없으면 무조건 활성화, 있으면 swap=true일 때만 교체 (기존 비전은 소멸)
export function resolveRaidSecret(meta, secretId, swap) {
  if (!secretId) return meta;
  const raid = getRaid(meta);
  const history = raid.secretHistory || [];
  const newHistory = history.includes(secretId) ? history : [...history, secretId];
  const active = raid.secretSkill || null;
  const newActive = !active ? secretId : (swap ? secretId : active);
  return { ...meta, raid: { ...raid, secretHistory: newHistory, secretSkill: newActive } };
}

// 1.76.0~ 레이드 자원 획득 (전투 전리품 — 심연석·정수)
export function addRaidResources(meta, { stones = 0, essence = 0 } = {}) {
  if (!stones && !essence) return meta;
  const raid = getRaid(meta);
  return {
    ...meta,
    raid: {
      ...raid,
      stones: (raid.stones || 0) + Math.max(0, stones),
      essence: (raid.essence || 0) + Math.max(0, essence),
    },
  };
}

// 1.76.0~ 제작·가챠 결제 — 자원 차감 + 결과 장비 인벤토리 추가. 부족하면 meta 그대로 반환
export function spendRaidResourcesForItem(meta, { stones = 0, essence = 0 } = {}, item) {
  const raid = getRaid(meta);
  if ((raid.stones || 0) < stones || (raid.essence || 0) < essence || !item) return meta;
  let m = {
    ...meta,
    raid: {
      ...raid,
      stones: (raid.stones || 0) - stones,
      essence: (raid.essence || 0) - essence,
      inventory: [...raid.inventory, item],
    },
  };
  // 1.90.0~ 제작·가챠로 얻은 에픽도 업적 인정
  if (item.rarity === 'EP') m = completeAchievement(m, 'raid_epic_drop', 1);
  return m;
}

// 주간 첫 클리어 보상 — 이번 주 미수령 던전이면 심연석 지급 + 기록. 반환: { meta, granted }
export function claimRaidWeekly(meta, dungeonId, weekKey, stones) {
  const raid = getRaid(meta);
  let weekly = raid.weekly;
  if (!weekly || weekly.week !== weekKey) weekly = { week: weekKey, claimed: [] };
  if ((weekly.claimed || []).includes(dungeonId)) {
    return { meta: weekly === raid.weekly ? meta : { ...meta, raid: { ...raid, weekly } }, granted: false };
  }
  weekly = { ...weekly, claimed: [...(weekly.claimed || []), dungeonId] };
  return {
    meta: { ...meta, raid: { ...raid, weekly, stones: (raid.stones || 0) + (stones || 0) } },
    granted: true,
  };
}

// 이번 주 수령 여부 조회
export function hasRaidWeeklyClaimed(meta, dungeonId, weekKey) {
  const weekly = meta?.raid?.weekly;
  return !!(weekly && weekly.week === weekKey && (weekly.claimed || []).includes(dungeonId));
}

// 1.72.0~ 일일 임무 진행 트래킹
// mission: DAILY_MISSIONS 항목 객체 (data/meta.js) — 순환 import 방지 위해 호출부에서 전달
// dateKey: getKstDateKey() (utils/dailyChallenge.js). 날짜가 바뀌면 자동 리셋.
// 완료 즉시 영혼 자동 지급 + claimed 기록 (중복 지급 없음)
export function trackDailyMission(meta, mission, amount, dateKey) {
  // 1.99.1~ 기능 플래그 비활성 시 추적·보상 지급 전면 중단 (PM 지시)
  if (!FEATURE_FLAGS.dailyMissions) return meta;
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

// 1.100.0~ 베스트 런타임 갱신 — 더 빠르면 기록 (×1 기준 ms)
export function updateBestRunTime(meta, key, ms, classId) {
  if (!key || !ms || ms <= 0) return { meta, isBest: false };
  const cur = meta.bestRunTimes?.[key];
  if (cur && cur.ms <= ms) return { meta, isBest: false };
  return {
    meta: {
      ...meta,
      bestRunTimes: { ...(meta.bestRunTimes || {}), [key]: { ms, cls: classId || null, t: Date.now() } },
    },
    isBest: true,
  };
}

// 1.99.2~ 마스터즈 직업별 클리어 기록 (PM 지시: 클리어 이력 직업별 분리)
export function recordMastersClearByClass(meta, classId, fusionId) {
  if (!classId || !fusionId) return meta;
  const byClass = meta.mastersClearsByClass || {};
  const classClears = byClass[classId] || {};
  if (classClears[fusionId]) return meta;
  return {
    ...meta,
    mastersClearsByClass: {
      ...byClass,
      [classId]: { ...classClears, [fusionId]: true },
    },
  };
}

// ============================================
// 1.98.0~ 명예의 전당 (HOF)
// ============================================

// 패턴 저장 — patterns[charId] = [{c, v, s}] (전체 교체)
export function saveHofPatterns(meta, patterns) {
  return { ...meta, hof: { ...(meta.hof || {}), patterns } };
}

// 캐릭터 레벨업 — 훈장 소모 (부족하면 원본 반환)
export function hofLevelUpChar(meta, charId, cost) {
  const hof = meta.hof || {};
  if ((hof.medals || 0) < cost) return meta;
  const levels = { ...(hof.levels || {}) };
  levels[charId] = (levels[charId] || 1) + 1;
  return { ...meta, hof: { ...hof, medals: (hof.medals || 0) - cost, levels } };
}

// 스테이지 클리어 기록 — 첫 클리어 훈장 + 반복 훈장 1
export function recordHofClear(meta, stageId, firstMedals) {
  const hof = meta.hof || {};
  const first = !hof.clears?.[stageId];
  const gained = first ? firstMedals : 1;
  return {
    meta: {
      ...meta,
      hof: {
        ...hof,
        clears: { ...(hof.clears || {}), [stageId]: true },
        medals: (hof.medals || 0) + gained,
      },
    },
    first,
    medals: gained,
  };
}

// ============================================
// 무덤의 유산 (1.103.0) — BuriedBornes 모티브 별도 모드
// ============================================
// 본편 메타(영혼·각인·유물)와 완전 분리. 이 모드의 모든 영속 상태는 meta.buried 하나에만 쌓인다.

const EMPTY_BURIED = {
  char: null, legacy: [], legacyGold: 0, dust: 0, deepest: 0,
  clears: {}, deaths: 0, runs: 0, unlockedDungeons: ['labyrinth'], unlockedClasses: [],
  legacySlots: 6,
  killsByEnemy: {}, // 1.109.0~ 조우 해금 진행 (적 키 → 누적 처치 수)
  contracts: [],    // 1.111.0~ 보유한 마의 계약 id 목록 (영구)
  shards: 0,        // 1.112.0~ ☠ 죽음의 조각 (보스·재앙 처치 획득, 연구실 재화)
  parts: [],        // 1.112.0~ 연구실 부품 id 목록 (영구, 최대 5칸)
};
export function getBuried(meta) {
  const b = meta?.buried || EMPTY_BURIED;
  return {
    ...EMPTY_BURIED, ...b,
    legacy: Array.isArray(b.legacy) ? b.legacy : [],
    // 1.103.0 세이브는 clears가 숫자(총 클리어 횟수)였다 — 미궁 클리어로 환산
    clears: typeof b.clears === 'number' ? (b.clears > 0 ? { labyrinth: b.clears } : {}) : (b.clears || {}),
    unlockedDungeons: Array.isArray(b.unlockedDungeons) && b.unlockedDungeons.length > 0
      ? b.unlockedDungeons : ['labyrinth'],
    unlockedClasses: Array.isArray(b.unlockedClasses) ? b.unlockedClasses : [],
    legacySlots: Math.max(6, b.legacySlots || 6),
    killsByEnemy: b.killsByEnemy || {},
    contracts: Array.isArray(b.contracts) ? b.contracts : [],
    shards: Math.max(0, b.shards || 0),
    parts: Array.isArray(b.parts) ? b.parts : [],
  };
}

// 진행 중 캐릭터 스냅샷 저장 (층 이동·장비 변경·전투 종료마다 호출)
export function saveBuriedChar(meta, char) {
  const b = getBuried(meta);
  const deepest = Math.max(b.deepest || 0, char?.floor || 0);
  return { ...meta, buried: { ...b, char, deepest } };
}

// 새 캐릭터 시작 — 유산 보관함을 비우고 캐릭터에 넘긴다
export function startBuriedChar(meta, char, usedLegacyCount) {
  const b = getBuried(meta);
  return {
    ...meta,
    buried: {
      ...b,
      char,
      legacy: b.legacy.slice(usedLegacyCount || b.legacy.length),
      legacyGold: 0,
      runs: (b.runs || 0) + 1,
      deepest: Math.max(b.deepest || 0, char?.floor || 1),
    },
  };
}

// 사망 — 캐릭터 소멸 + 유산 계승 (보관함 초과분은 무덤 먼지로 환산)
export function recordBuriedDeath(meta, legacy, dustOverflow = 0) {
  const b = getBuried(meta);
  const merged = [...(legacy?.items || []), ...b.legacy].slice(0, b.legacySlots || BURIED_LEGACY_MAX);
  return {
    ...meta,
    buried: {
      ...b,
      char: null,
      legacy: merged,
      legacyGold: (b.legacyGold || 0) + (legacy?.gold || 0),
      dust: (b.dust || 0) + dustOverflow,
      deaths: (b.deaths || 0) + 1,
    },
  };
}
// 던전 클리어 — 캐릭터는 살아서 로비로 귀환 (장비·레벨 유지).
// 클리어 시 ①다음 던전 해금 ②해당 직업의 전직(상위 직업) 해금.
// nextDungeonId / advanceClassId는 호출부(App)가 data/buried.js를 보고 넘긴다.
export function recordBuriedClear(meta, char, { dungeonId, nextDungeonId = null, advanceClassId = null } = {}) {
  const b = getBuried(meta);
  const id = dungeonId || char?.dungeonId || 'labyrinth';
  const unlockedDungeons = [...b.unlockedDungeons];
  if (nextDungeonId && !unlockedDungeons.includes(nextDungeonId)) unlockedDungeons.push(nextDungeonId);
  const unlockedClasses = [...b.unlockedClasses];
  if (advanceClassId && !unlockedClasses.includes(advanceClassId)) unlockedClasses.push(advanceClassId);
  return {
    ...meta,
    buried: {
      ...b,
      char,
      clears: { ...b.clears, [id]: (b.clears[id] || 0) + 1 },
      deepest: Math.max(b.deepest || 0, char?.floor || 0),
      unlockedDungeons,
      unlockedClasses,
    },
  };
}

// 무덤 먼지 증감 (분해 획득 / 강화 소모). 부족하면 원본 반환
export function addBuriedDust(meta, amount) {
  const b = getBuried(meta);
  if (amount < 0 && (b.dust || 0) + amount < 0) return meta;
  return { ...meta, buried: { ...b, dust: (b.dust || 0) + amount } };
}

// 캐릭터 포기 (로비에서 명시적 은퇴) — 유산은 사망과 동일 규칙으로 남긴다
export function retireBuriedChar(meta, legacy) {
  return recordBuriedDeath(meta, legacy, 0);
}

// ============================================
// 무덤의 유산 1.105.0 — 재련소 + 보관함 확장 (무덤 먼지 소비처)
// ============================================

// 재련소 제작 — 먼지를 소모하고 장비를 받는다.
// 캐릭터가 있으면 캐릭터(스킬 레벨 동반 상승), 없으면 유산 보관함으로 (가득 차면 실패).
export function craftBuriedForgeItem(meta, item, cost) {
  const b = getBuried(meta);
  if (!item || (b.dust || 0) < cost) return { meta, ok: false, reason: 'dust' };
  if (b.char) {
    const { char, raised, lv } = addBuriedItemToChar(b.char, item);
    return {
      meta: { ...meta, buried: { ...b, char, dust: b.dust - cost } },
      ok: true, toChar: true, raised, lv,
    };
  }
  if (b.legacy.length >= (b.legacySlots || 6)) return { meta, ok: false, reason: 'full' };
  return {
    meta: { ...meta, buried: { ...b, legacy: [...b.legacy, item], dust: b.dust - cost } },
    ok: true, toChar: false,
  };
}

// 유산 보관함 +1칸 (최대 12)
export function expandBuriedLegacy(meta, cost) {
  const b = getBuried(meta);
  const cur = b.legacySlots || 6;
  if (cur >= 12 || (b.dust || 0) < cost) return meta;
  return { ...meta, buried: { ...b, legacySlots: cur + 1, dust: b.dust - cost } };
}


// 1.109.0 — 적 처치 추적 + 조우 해금 판정 (마검사·흡혈귀·페어리)
// 반환: { meta, unlocked: classId | null }
export function trackBuriedKill(meta, enemyKey) {
  const b = getBuried(meta);
  const killsByEnemy = { ...b.killsByEnemy, [enemyKey]: (b.killsByEnemy[enemyKey] || 0) + 1 };
  const unlocked = checkBuriedEncounterUnlock(killsByEnemy, b.unlockedClasses);
  return {
    meta: {
      ...meta,
      buried: {
        ...b,
        killsByEnemy,
        unlockedClasses: unlocked ? [...b.unlockedClasses, unlocked] : b.unlockedClasses,
      },
    },
    unlocked,
  };
}

// 1.111.0 — 마의 계약 랜덤 구입 (먼지 소모, 미보유 풀에서)
export function buyBuriedContract(meta, contractId, cost) {
  const b = getBuried(meta);
  if (!contractId || (b.dust || 0) < cost || b.contracts.includes(contractId)) return meta;
  return { ...meta, buried: { ...b, dust: b.dust - cost, contracts: [...b.contracts, contractId] } };
}

// ============================================
// 무덤의 유산 1.112.0 — 연구실 부품 (☠ 죽음의 조각 경제)
// ============================================

// ☠ 죽음의 조각 획득 (보스·재앙 처치)
export function addBuriedShards(meta, amount) {
  const b = getBuried(meta);
  if (amount < 0 && (b.shards || 0) + amount < 0) return meta;
  return { ...meta, buried: { ...b, shards: (b.shards || 0) + amount } };
}

// 연구실 부품 구입 — 슬롯 순서 비용 (BURIED_PART_SLOT_COSTS), 최대 5칸, 중복 불가.
// 부품 효과는 다음 캐릭터 생성부터 적용 (진행 중 캐릭터에는 소급 X — 로비 UI에 고지)
export function buyBuriedPart(meta, partId, slotCosts) {
  const b = getBuried(meta);
  if (!partId || b.parts.includes(partId) || b.parts.length >= 5) return meta;
  const cost = slotCosts[b.parts.length];
  if (cost == null || (b.shards || 0) < cost) return meta;
  return { ...meta, buried: { ...b, shards: b.shards - cost, parts: [...b.parts, partId] } };
}

// 연구실 부품 일괄 탈착 (원작 룰: 개별 해제 없음) — 🕯 먼지 소모, 부품은 소멸
export function detachBuriedParts(meta, dustCost) {
  const b = getBuried(meta);
  if (b.parts.length === 0 || (b.dust || 0) < dustCost) return meta;
  return { ...meta, buried: { ...b, dust: b.dust - dustCost, parts: [] } };
}
