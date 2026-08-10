import React, { useState, useEffect, useMemo, useRef } from 'react';

// ============================================
// 여명앤황혼 로그라이크 v0.4 - INTEGRATED
// 전체 게임 루프: 챕터 → 맵 → 노드 → 전투/사건 → 보상 → 다음 노드 → 보스 → 다음 챕터
// ============================================

// =========== 헬퍼 함수 (utils/helpers.js로 분리됨) ===========
import {
  PALETTE,
  AUTO_STAT_PREF,
  scoreRelicForClass,
  getSkillLevel,
  getActivePassives,
  hasEffect,
  hasUltimate,
  getMinorBonus,
  getActiveRelicStat,
  getEffectiveSkills,
  getMetaBonus,
  hasChampionMeta,
  getChampionshipMetaHp,
  getChampionshipMetaGold,
  getChampionshipMetaSkillBonus,
  getChampionshipMetaRelicBonus,
  isUnlocked,
  getUpgradeCost,
  canPurchaseUpgrade,
  rollAltarSlots,
  rollCurses,
  hasCurse,
  getCharismaHealBonus,
  getCharismaSoulGainBonus,
  getStrengthHpBonus,
  aggregateEngravingEffects,
  aggregateAwakeningRewards,
  getCombinedClassFx,
  computeDisplayPlayerStats,
  computeDerivedStats,
} from './utils/helpers.js';

// 데미지/회피/치명 함수 (combat/damage.js로 분리됨)
import { calculateDamage, getDisplayDamage, rollCrit, rollDodge } from './combat/damage.js';
import { getRewardPool, rollRewards } from './utils/rewards.js';
import { generateChapterMap } from './utils/mapGen.js';
import TitleScreen from './components/TitleScreen.jsx';
import ChangelogModal from './components/ChangelogModal.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import AccountScreen from './components/AccountScreen.jsx';
import ClassSelect from './components/ClassSelect.jsx';
import ChampionshipDifficultySelect from './components/ChampionshipDifficultySelect.jsx';
import ExpeditionSelect from './components/ExpeditionSelect.jsx';
import AchievementScreen from './components/AchievementScreen.jsx';
import CodexScreen from './components/CodexScreen.jsx';
import PrepScreen from './components/PrepScreen.jsx';
import EventScreen from './components/EventScreen.jsx';
import RestScreen from './components/RestScreen.jsx';
import ShopScreen from './components/ShopScreen.jsx';
import ForgeScreen from './components/ForgeScreen.jsx';
import RewardSelect from './components/RewardSelect.jsx';
import StatusPanel from './components/StatusPanel.jsx';
import SoulAltar from './components/SoulAltar.jsx';
import EngravingScreen, { EngravingMigrationModal, AwakeningConditionNoticeModal, WandererRenameNoticeModal, SoulAltarRedesignModal } from './components/EngravingScreen.jsx';
import MapView from './components/MapView.jsx';
import CombatScreen from './components/CombatScreen.jsx';
import RaidScreen from './components/RaidScreen.jsx';
import RaidBattleScreen from './components/RaidBattleScreen.jsx';
import AutoHuntOverlay from './components/AutoHuntOverlay.jsx';
import NodeInfoModal from './components/NodeInfoModal.jsx';
import BossIntroScreen from './components/BossIntroScreen.jsx';
import PCSidebar from './components/PCSidebar.jsx';
import { LATEST_VERSION } from './data/changelog.js';
import { signInGuest, signInGoogle, signOut, watchAuthState, getUserInfo, linkGuestToGoogle } from './cloud/auth.js';
import { saveCloudMeta, loadCloudMeta, pickLatest } from './cloud/sync.js';
import StartScreen from './components/StartScreen.jsx';
import VictoryScreen from './components/VictoryScreen.jsx';
import ChapterClearScreen from './components/ChapterClearScreen.jsx';
import ExpeditionClearScreen from './components/ExpeditionClearScreen.jsx';
import DefeatScreen from './components/DefeatScreen.jsx';

// =========== 데이터 모듈 import ===========
// 모든 게임 콘텐츠 (적, 사건, 유물, 직업, 챕터, 패시브 등)는 derod_data.js에 있습니다.
// 콘텐츠를 추가/수정하려면 그 파일만 편집하세요.
import {
  PASSIVE_SKILLS,
  CLASSES,
  COMBAT_SKILLS,
  ENEMIES,
  CHAPTERS,
  EVENTS,
  RELICS,
  ULTIMATE_SKILLS,
  EXPEDITIONS,
  CURSES,
  META_UPGRADES,
  SOUL_REWARDS,
  PREP_CONFIG,
  buildRewardPool,
  SHOP_PRICES,
  GAME_CONFIG,
  ACHIEVEMENTS,
  FORGE_RECIPES,
  findRecipe,
  CHAMPIONSHIPS,
  CHAMPIONSHIP_DIFFICULTIES,
  CHAMPIONSHIP_CHAPTERS,
  GAME_VERSION,
  VERSION_DATE,
  VERSION_LABEL,
  DAILY_MISSIONS,
  ENDLESS_SKIP_LIMIT,
  RAID_DISMANTLE_VALUES,
  RAID_ENHANCE,
  RAID_CRAFT_RECIPES,
  RAID_GACHA,
  getKstWeekKey,
  rollRaidDropHighTier,
  rollCraftedRaidItem,
  rollGachaRaidItem,
  backfillRaidSeries,
} from './data.js';
import { getKstDateKey } from './utils/dailyChallenge.js';
import { simulateBestEndlessRun } from './utils/endlessSkipSim.js';
import { loadMeta, saveMeta, addSouls, applyUpgrade, applyUnlock, recordExpeditionClear, needsAltarRefresh, getNextRefreshTime, checkAndResetDaily, claimAchievement, getAchievementState, incrementAchievement, setAchievementProgress, completeAchievement, recordChampionshipClear, hasChampionshipClear, isChampionshipDifficultyUnlocked, unlockChampionshipRelic, setLastSeenVersion, getAuthMode, setAuthMode, getDefaultMeta, clearLocalMeta, recordCodex, recordDailyClear, hasDailyCleared, saveActiveRun, clearActiveRun, clearEngravingMigrationNotice, recordChampionshipClearByClass, recordUltimatePickByClass, clearAwakeningConditionNotice, clearWandererRenameNotice, clearAltarRedesignNotice, trackDailyMission, getEndlessSkipUsed, useEndlessSkip, addRaidDrops, equipRaidItem, autoEquipRaidBest, recordRaidClear, dismantleRaidItem, dismantleRaidJunk, enhanceRaidItem, claimRaidWeekly, addRaidResources, spendRaidResourcesForItem, resolveRaidSecret, toggleRaidFormation } from './storage.js';






function PhoneFrame({ children, screenKey, persistent = null }) {
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
      {/* screen 키 리마운트로 화면 진입 페이드+슬라이드 (1.64.0). reduced-motion 시 CSS에서 자동 무효 */}
      <div key={screenKey} className="ui-screen-enter absolute inset-0">
        {children}
      </div>
      {/* 1.80.0~ 영속 레이어 — 화면 전환 리마운트에서 제외 (백그라운드 레이드 전투가 여기 산다) */}
      {persistent}
    </div>
  );
}

// PhoneFrame을 감싸는 컨테이너 — 모바일/PC 분기
function ResponsiveLayout({ children, sidebar }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 overflow-hidden" style={{
        background: PALETTE.bg,
        fontFamily: '"Noto Serif KR", serif',
      }}>
        <div className="absolute inset-0 pointer-events-none opacity-25" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }} />
        <div className="absolute inset-0">{children}</div>
      </div>
    );
  }

  // PC: 중앙 폰 프레임 + 우측 사이드바
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${PALETTE.bg} 0%, ${PALETTE.bgDeep} 100%)`,
        fontFamily: '"Noto Serif KR", serif',
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-15" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }} />
      
      {/* 좌측 — 게임 타이틀 (간단) */}
      <div className="absolute top-8 left-10 pointer-events-none" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
        <div className="text-[10px] tracking-[0.4em]" style={{ color: PALETTE.dawn }}>
          DAWN & TWILIGHT
        </div>
        <div className="text-xs tracking-[0.3em] mt-1" style={{ fontFamily: '"Cinzel", serif' }}>
          던앤 트와일라잇
        </div>
      </div>
      
      {/* 중앙 — 폰 프레임 */}
      <div 
        className="relative"
        style={{
          width: '420px',
          height: 'min(92vh, 920px)',
          background: PALETTE.bg,
          borderRadius: '40px',
          border: `8px solid ${PALETTE.bgDeep}`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 60px ${PALETTE.dawn}15`,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-25" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }} />
        {children}
      </div>
      
      {/* 우측 사이드바 */}
      {sidebar}
    </div>
  );
}

// =========== 화면들 ===========



// =========== 보상 선택 ===========

// =========== 사건 화면 ===========

// =========== Main App - 통합 게임 루프 ===========
export default function App() {
  const [screen, setScreen] = useState('title');
  const [selectedClass, setSelectedClass] = useState(0);
  // 원정 선택 후 출정 화면에서 사용 — start 화면 탭 시 실제 startExpedition 호출
  const [selectedExpedition, setSelectedExpedition] = useState(null);
  const [selectedChampionship, setSelectedChampionship] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [mapData, setMapData] = useState(null);
  const [hp, setHp] = useState(GAME_CONFIG.startHp);
  const [maxHp, setMaxHp] = useState(GAME_CONFIG.startHp);
  const [gold, setGold] = useState(GAME_CONFIG.startGold);
  const [gem, setGem] = useState(GAME_CONFIG.startGem);

  const classData = CLASSES[selectedClass];
  const [skills, setSkills] = useState({});
  const [stats, setStats] = useState({});
  const [relics, setRelics] = useState([]);
  const [ultimates, setUltimates] = useState([]);  // 획득한 궁극 ID 배열

  // 메타 진행 시스템
  const [meta, setMeta] = useState({ souls: 0, upgrades: {}, unlocks: [], clearedExpeditions: [] });
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [altarSlots, setAltarSlots] = useState([]);
  const [currentExpedition, setCurrentExpedition] = useState(null);
  const [currentCurses, setCurrentCurses] = useState([]);
  const [runSouls, setRunSouls] = useState(0);  // 이번 런에서 획득한 영혼 (사망 시 70%만 적용)
  // 무한모드(endless): 현재 깊이(0-indexed). 챕터 클리어할 때마다 +1.
  const [endlessDepth, setEndlessDepth] = useState(0);
  // 챔피언십 첫 클리어 정보 (ExpeditionClearScreen에서 사용)
  const [runFirstChampClear, setRunFirstChampClear] = useState(null);
  
  // 전투 준비: 활성화된 패시브/유물 이름 배열 (null이면 모두 활성)
  // 첫 노드 (prep)에서 결정. 한 원정 내내 유지.
  const [activeSkills, setActiveSkills] = useState(null);
  const [activeRelicNames, setActiveRelicNames] = useState(null);
  // 재선택 모드: 'skills' | 'relics' | null
  const [reselectMode, setReselectMode] = useState(null);
  // 승리 화면 후 이동할 다음 화면
  const [victoryNextScreen, setVictoryNextScreen] = useState(null);
  // 승리 화면에 표시할 획득 재화 (gold/gem/souls)
  const [victoryGains, setVictoryGains] = useState({ gold: 0, gem: 0, souls: 0 });
  // 1.81.0~ 정산 — 직전 전투 (출처별 데미지) + 이번 런 누적 (전투 수·총 데미지·획득 자원)
  const [victoryStats, setVictoryStats] = useState(null);
  const [runStats, setRunStats] = useState(null);
  // 1.81.0~ 일반 던전 반복 — 클리어 시 같은 원정 자동 재출정 (재출정 함수는 ref로 보존)
  const [runRepeat, setRunRepeat] = useState(false);
  const runRestartRef = useRef(null);
  // 업적 화면에서 뒤로갈 때 어디로 갈지 기억 (title 또는 map)
  const [prevAchievementsBack, setPrevAchievementsBack] = useState('title');
  // 업데이트 로그 모달 (firstSeen=true: 자동 표시 / false: 수동 클릭)
  const [showChangelog, setShowChangelog] = useState(null);  // null | { firstSeen: bool }
  // 노드 진입 설명 모달 (튜토리얼 챕터에서만 표시)
  const [pendingNode, setPendingNode] = useState(null);  // null | { node, resolvedType }
  // 1.72.0~ 자동 사냥 모드 — 노드 선택·스킬 선택·보상 선택 모두 자동
  // 허용 범위: 수련의 길(training) + 무한모드(endless)만. 사망/원정 클리어 시 자동 해제.
  const [autoHunt, setAutoHunt] = useState(false);
  // 1.80.0~ 자동 사냥 배속 (×1 / ×5 / ×10) — 자동 사냥 중에만 연출·진행 딜레이 압축
  const [autoSpeed, setAutoSpeed] = useState(1);
  const cycleAutoSpeed = () => setAutoSpeed(s => (s === 1 ? 5 : s === 5 ? 10 : 1));
  // 1.81.0~ 자동 사냥 대기화면 — 자동 켤 때마다 표시, [관전]으로 숨김 가능
  const [autoOverlayHidden, setAutoOverlayHidden] = useState(false);
  const toggleAutoHunt = () => setAutoHunt(v => {
    const next = !v;
    if (next) setAutoOverlayHidden(false);
    return next;
  });
  // 1.74.0~ 레이드 — 입장 중인 던전 (raidBattle 화면용)
  const [raidDungeon, setRaidDungeon] = useState(null);
  // 1.80.0~ 레이드 백그라운드 진행 상태 (플로팅 필 표시용): running | victory | choice | defeat
  const [raidBgStatus, setRaidBgStatus] = useState('running');
  // 1.78.0~ 던전 반복 모드 — 승리 시 자동 재입장, 전멸·후퇴·로비 복귀 시 해제
  const [raidRepeat, setRaidRepeat] = useState(false);
  
  // === 인증/저장 모드 (Phase 1) ===
  // null = 미선택 (LoginScreen 표시), 'local' | 'guest' | 'google'
  const [authMode, setAuthModeState] = useState(getAuthMode());
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  
  // Firebase auth state 감시 (모드가 cloud인 경우만 의미)
  useEffect(() => {
    const unsub = watchAuthState((user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return unsub;
  }, []);
  
  // 모드 선택 핸들러
  const handleSelectLocal = async () => {
    setAuthMode('local');
    setAuthModeState('local');
    // 기존 로컬 데이터 로드 (또는 기본값)
    const data = await loadMeta();
    setMeta(data);
    setMetaLoaded(true);
    if (data.lastSeenVersion !== LATEST_VERSION) {
      setShowChangelog({ firstSeen: true });
    }
  };
  
  const handleSelectGuest = async () => {
    const user = await signInGuest();
    if (user) {
      setAuthMode('guest');
      setAuthModeState('guest');
      // 클라우드에 기존 데이터가 있는지 확인 (재로그인 케이스)
      const cloud = await loadCloudMeta(user.uid);
      let safe;
      if (cloud) {
        // 같은 UID로 재로그인 — 클라우드 데이터 사용
        safe = { ...getDefaultMeta(), ...cloud };
      } else {
        // 새 게스트 — 로컬 데이터 무시하고 기본값 시작
        // (이전 모드의 데이터가 들어가는 것 방지)
        safe = getDefaultMeta();
        // 로컬도 초기화
        await clearLocalMeta();
      }
      setMeta(safe);
      setMetaLoaded(true);
      if (!cloud) {
        await saveCloudMeta(user.uid, safe);
      }
      if (safe.lastSeenVersion !== LATEST_VERSION) {
        setShowChangelog({ firstSeen: true });
      }
    }
  };
  
  const handleSelectGoogle = async () => {
    const user = await signInGoogle();
    if (user) {
      setAuthMode('google');
      setAuthModeState('google');
      // 클라우드에 기존 데이터가 있는지 확인
      const cloud = await loadCloudMeta(user.uid);
      let safe;
      if (cloud) {
        // 기존 구글 계정 재로그인 — 클라우드 데이터 사용
        safe = { ...getDefaultMeta(), ...cloud };
      } else {
        // 새 구글 계정 — 로컬 데이터 무시하고 기본값 시작
        safe = getDefaultMeta();
        await clearLocalMeta();
      }
      setMeta(safe);
      setMetaLoaded(true);
      if (!cloud) {
        await saveCloudMeta(user.uid, safe);
      }
      if (safe.lastSeenVersion !== LATEST_VERSION) {
        setShowChangelog({ firstSeen: true });
      }
    }
  };
  
  // 로그아웃 — Firebase signOut + 로컬 클리어 + 모드 리셋
  const handleLogout = async () => {
    try {
      if (authMode !== 'local' && firebaseUser) {
        await signOut();
      }
      // 로컬 IndexedDB 클리어 — 다음 모드 선택 시 옛 데이터 안 보이도록
      await clearLocalMeta();
      // 모드 리셋
      setAuthMode(null);
      setAuthModeState(null);
      setFirebaseUser(null);
      setMetaLoaded(false);
      setMeta({ souls: 0, upgrades: {}, unlocks: [], clearedExpeditions: [] });
      setScreen('title');  // LoginScreen이 표시될 것
    } catch (err) {
      console.error('[Logout] Failed:', err);
      throw err;
    }
  };
  
  // 게스트 → 구글 연동 (데이터 유지)
  const handleLinkGoogle = async () => {
    try {
      const user = await linkGuestToGoogle();
      if (user) {
        setAuthMode('google');
        setAuthModeState('google');
        // user는 같음, UID 유지 — 클라우드 데이터 그대로
        setFirebaseUser(user);
      }
    } catch (err) {
      console.error('[Link] Failed:', err);
      throw err;
    }
  };

  // 메타 데이터 로드 (앱 시작 시 한 번, authMode가 이미 결정된 경우만)
  useEffect(() => {
    if (!authReady) return;  // Firebase 초기화 대기
    if (metaLoaded) return;  // 이미 로드됨
    if (!authMode) return;   // 모드 미선택 — LoginScreen이 표시됨
    
    (async () => {
      try {
        if (authMode === 'local') {
          const data = await loadMeta();
          setMeta(data);
        } else if (authMode === 'guest' || authMode === 'google') {
          // Firebase 사용자가 있어야 함
          if (firebaseUser) {
            const cloud = await loadCloudMeta(firebaseUser.uid);
            const local = await loadMeta();
            const merged = pickLatest(local, cloud) || local;
            const safe = { ...getDefaultMeta(), ...merged };
            // 1.79.1 클라우드 메타도 레이드 레거시 장비 series 백필 (loadMeta와 동일 픽스)
            const raidBackfill = backfillRaidSeries(safe.raid);
            if (raidBackfill.changed) safe.raid = raidBackfill.raid;
            setMeta(safe);
          } else {
            // 모드는 cloud인데 user 없음 → 다시 로그인 화면
            console.warn('[Auth] Mode is', authMode, 'but no user');
            return;  // metaLoaded는 false 유지
          }
        }
        setMetaLoaded(true);
        // changelog
        const currentMeta = await loadMeta();
        if (currentMeta.lastSeenVersion !== LATEST_VERSION) {
          setShowChangelog({ firstSeen: true });
        }
      } catch (err) {
        console.error('[Init] Failed:', err);
        // 폴백 — 로컬 모드
        const data = await loadMeta();
        setMeta(data);
        setMetaLoaded(true);
      }
    })();
  }, [authReady, authMode, firebaseUser, metaLoaded]);

  // 메타 변경 시 자동 저장 (모드에 따라 로컬 / 로컬+클라우드)
  useEffect(() => {
    if (!metaLoaded) return;
    // 로컬 저장은 항상
    saveMeta(meta);
    // 클라우드 모드면 클라우드도 (디바운스 — 짧은 시간 내 여러 번 변경 시 마지막만)
    if ((authMode === 'guest' || authMode === 'google') && firebaseUser) {
      const timer = setTimeout(() => {
        saveCloudMeta(firebaseUser.uid, meta);
      }, 2000); // 2초 디바운스
      return () => clearTimeout(timer);
    }
  }, [meta, metaLoaded, authMode, firebaseUser]);

  // 진행 중인 런 스냅샷 자동 저장 — 맵 화면 진입/갱신 시점에 실행
  // 앱이 어떤 식으로든 종료되어도 다음 접속에서 이어하기 가능.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!metaLoaded) return;
    if (screen !== 'map') return;
    if (!chapter || !mapData || !currentExpedition) return;
    const snapshot = {
      v: 1,
      selectedClass,
      expedition: currentExpedition,
      curses: currentCurses,
      chapterId: chapter.id,
      chapterIdx,
      endlessDepth,
      mapData,
      activeNodeId,
      hp, maxHp, gold, gem, runSouls,
      skills, stats, relics, ultimates,
      activeSkills, activeRelicNames,
      isEliteReward, isBossReward, hasRerolled,
      pendingChainEvents,
    };
    setMeta(prev => saveActiveRun(prev, snapshot));
    // 의도적으로 좁은 deps — 맵 진입·노드 완료 트리거에서만 스냅샷 갱신
  }, [screen, chapter, chapterIdx, mapData]);

  // 보상 시스템
  const [currentRewards, setCurrentRewards] = useState([]);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  // 1.70.0~ 연쇄 이벤트 — 이전 선택이 예약한 후속 사건 id 큐 (런 단위, 스냅샷 포함)
  const [pendingChainEvents, setPendingChainEvents] = useState([]);
  const [activeNodeType, setActiveNodeType] = useState(null);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isEliteReward, setIsEliteReward] = useState(false);
  const [isBossReward, setIsBossReward] = useState(false);

  // 영혼의 제단 진입
  // 자동 갱신 체크: KST 0시/12시 갱신 시각이 지났으면 새로 굴림
  // 일일 리롤 카운트도 자정 리셋 체크
  const enterAltar = () => {
    let newMeta = checkAndResetDaily(meta);
    if (needsAltarRefresh(newMeta)) {
      const newSlotIds = rollAltarSlots(newMeta, SOUL_REWARDS.altarSlots).map(s => s.id);
      newMeta = {
        ...newMeta,
        altarSlots: newSlotIds,
        altarRefreshedAt: Date.now(),
      };
      saveMeta(newMeta);
    }
    setMeta(newMeta);
    // 저장된 슬롯 ID로 실제 슬롯 객체 복원
    const slots = (newMeta.altarSlots || []).map(id => META_UPGRADES.find(u => u.id === id)).filter(Boolean);
    setAltarSlots(slots);
    setScreen('altar');
  };

  // 강화 구매
  const purchaseUpgrade = (upgrade) => {
    const stack = meta.upgrades[upgrade.id] || 0;
    const cost = getUpgradeCost(upgrade, stack);
    if (meta.souls < cost) return;
    
    let newMeta = { ...meta, souls: meta.souls - cost };
    if (upgrade.stackable) {
      newMeta = applyUpgrade(newMeta, upgrade.id);
    } else {
      newMeta = applyUnlock(newMeta, upgrade.id);
      newMeta = applyUpgrade(newMeta, upgrade.id);  // 1회성도 카운트로 추적
    }
    // 구매한 항목 제거 (자동 갱신 X — 시간이 안 지났으면 같은 슬롯 유지)
    const updatedSlotIds = (newMeta.altarSlots || []).filter(id => id !== upgrade.id);
    newMeta = { ...newMeta, altarSlots: updatedSlotIds };
    
    // === 업적 트래킹: 영혼 수호자 (모든 강화 최대 단계) ===
    // 모든 stackable 강화가 maxStacks 도달 + 모든 unlock이 unlocks에 포함
    const allMaxed = META_UPGRADES.every(u => {
      if (u.stackable) {
        return (newMeta.upgrades[u.id] || 0) >= (u.maxStacks || 999);
      } else {
        return newMeta.unlocks.includes(u.id);
      }
    });
    if (allMaxed) {
      newMeta = completeAchievement(newMeta, 'special_max_meta', 1);
    }
    
    setMeta(newMeta);
    const slots = updatedSlotIds.map(id => META_UPGRADES.find(u => u.id === id)).filter(Boolean);
    setAltarSlots(slots);
  };

  // 제단 새로고침 (유료) — 일일 10회 제한
  const rerollAltar = () => {
    if (meta.souls < SOUL_REWARDS.rerollCost) return;
    if ((meta.dailyRerollCount || 0) >= SOUL_REWARDS.dailyRerollLimit) return;
    const newSlotIds = rollAltarSlots(meta, SOUL_REWARDS.altarSlots).map(s => s.id);
    const newMeta = { 
      ...meta, 
      souls: meta.souls - SOUL_REWARDS.rerollCost,
      altarSlots: newSlotIds,
      dailyRerollCount: (meta.dailyRerollCount || 0) + 1,
    };
    setMeta(newMeta);
    const slots = newSlotIds.map(id => META_UPGRADES.find(u => u.id === id)).filter(Boolean);
    setAltarSlots(slots);
  };
  
  // 업적 보상 수령
  const handleClaimAchievement = (achievement) => {
    const newMeta = claimAchievement(meta, achievement);
    setMeta(newMeta);
  };

  // 새로운 런 시작 (원정 선택 시)
  // 진행 중이던 런 복원 — 메타에 저장된 스냅샷이 있을 때만 호출
  const resumeActiveRun = () => {
    const s = meta?.activeRun;
    if (!s || s.v !== 1) return false;
    // 챕터 데이터 조회 — 챔피언십이면 별도 풀에서
    const ch = s.expedition?.isChampionship
      ? CHAMPIONSHIP_CHAPTERS[s.chapterId]
      : CHAPTERS.find(c => c.id === s.chapterId);
    if (!ch) {
      console.error('이어하기 실패: 챕터 데이터를 찾을 수 없음', s.chapterId);
      // 손상된 스냅샷은 정리
      setMeta(prev => clearActiveRun(prev));
      return false;
    }
    setSelectedClass(s.selectedClass);
    setCurrentExpedition(s.expedition);
    setCurrentCurses(s.curses || []);
    setPendingChainEvents(s.pendingChainEvents || []);
    setChapter(ch);
    setChapterIdx(s.chapterIdx || 0);
    setEndlessDepth(s.endlessDepth || 0);
    setMapData(s.mapData);
    setActiveNodeId(s.activeNodeId);
    setHp(s.hp);
    setMaxHp(s.maxHp);
    setGold(s.gold);
    setGem(s.gem);
    setRunSouls(s.runSouls || 0);
    setSkills(s.skills || {});
    setStats(s.stats || {});
    setRelics(s.relics || []);
    setUltimates(s.ultimates || []);
    setActiveSkills(s.activeSkills);
    setActiveRelicNames(s.activeRelicNames);
    setIsEliteReward(!!s.isEliteReward);
    setIsBossReward(!!s.isBossReward);
    setHasRerolled(!!s.hasRerolled);
    setScreen('map');
    return true;
  };

  const startExpedition = (expedition) => {
    // 새 런 시작 시 이전 진행 스냅샷은 폐기 (맵 진입 시 자동으로 새 스냅샷 기록됨)
    setMeta(prev => clearActiveRun(prev));
    setCurrentExpedition(expedition);
    setEndlessDepth(0);  // 무한모드 깊이 초기화
    // 저주 부여 — fixedCurses(일일 챌린지)는 시드 픽 그대로 사용
    const curses = Array.isArray(expedition.fixedCurses) && expedition.fixedCurses.length > 0
      ? [...expedition.fixedCurses]
      : rollCurses(expedition.curseCount);
    setCurrentCurses(curses);
    setPendingChainEvents([]);
    setRunSouls(0);
    // 1.81.0~ 런 정산 초기화 + 반복 재출정 함수 보존
    setRunStats(null);
    setVictoryStats(null);
    runRestartRef.current = () => startExpedition(expedition);

    // === 업적 트래킹: 원정 시도 ===
    let trackedMeta = { ...meta, totalRuns: (meta.totalRuns || 0) + 1 };
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_10', trackedMeta.totalRuns, 10);
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_100', trackedMeta.totalRuns, 100);
    setMeta(trackedMeta);
    
    // 활성 패시브/유물 초기화 (prep 노드에서 결정될 때까지 null = 모두 비활성)
    setActiveSkills(null);
    setActiveRelicNames(null);
    
    // 첫 챕터 시작 (ID로 검색 — 튜토리얼은 string ID, 수련/일반은 number ID)
    const firstChapterId = expedition.chapters[0];
    const firstChapter = CHAPTERS.find(c => c.id === firstChapterId);
    if (!firstChapter) {
      console.error('챕터 데이터 없음:', firstChapterId);
      return;
    }
    initializeRun(firstChapter, 0, expedition, curses);
  };
  
  // 챔피언십 원정 시작 (5원정 × 4난이도)
  const startChampionship = (championship, difficulty) => {
    // 새 런 시작 — 이전 진행 스냅샷 폐기
    setMeta(prev => clearActiveRun(prev));
    // 챔피언십을 expedition 형식으로 변환 (initializeRun과 호환)
    const champExpedition = {
      // 챔피언십 식별자
      isChampionship: true,
      championshipId: championship.id,
      difficultyId: difficulty.id,
      // 표시용
      id: `champ_${championship.id}`,
      name: championship.name,
      sub: `${championship.sub} · ${difficulty.name}`,
      desc: championship.desc,
      color: championship.color,
      concept: championship.concept,
      // 챕터 (챔피언십 챕터 ID 배열)
      chapters: championship.chapters,  // ['frost_1', 'frost_2', ...]
      // 능력치 (난이도에서)
      enemyHpMult: difficulty.enemyHpMult,
      enemyDmgMult: difficulty.enemyDmgMult,
      curseCount: difficulty.curseCount,
      maxRelicSelect: difficulty.maxRelicSelect,
      soulReward: difficulty.soulReward,
    };
    
    setCurrentExpedition(champExpedition);
    const curses = rollCurses(difficulty.curseCount);
    setCurrentCurses(curses);
    setPendingChainEvents([]);
    setRunSouls(0);
    // 1.81.0~ 런 정산 초기화 + 반복 재출정 함수 보존
    setRunStats(null);
    setVictoryStats(null);
    runRestartRef.current = () => startChampionship(championship, difficulty);

    // 업적 트래킹
    let trackedMeta = { ...meta, totalRuns: (meta.totalRuns || 0) + 1 };
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_10', trackedMeta.totalRuns, 10);
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_runs_100', trackedMeta.totalRuns, 100);
    setMeta(trackedMeta);
    
    setActiveSkills(null);
    setActiveRelicNames(null);
    
    // 챕터 ID로 CHAMPIONSHIP_CHAPTERS에서 데이터 조회
    const firstChapterId = championship.chapters[0];
    const firstChapterData = CHAMPIONSHIP_CHAPTERS[firstChapterId];
    if (!firstChapterData) {
      console.error('챔피언십 챕터 데이터 없음:', firstChapterId);
      return;
    }
    initializeRun(firstChapterData, 0, champExpedition, curses);
  };

  // 새로운 런 시작
  const initializeRun = (chapterData, idx = 0, expeditionOverride = null, cursesOverride = null) => {
    const exp = expeditionOverride || currentExpedition;
    const curses = cursesOverride || currentCurses;
    
    if (idx === 0) {
      // 완전 새 런
      const baseSkills = { ...classData.startSkills };
      
      // 메타 강화: 시작 패시브 +1Lv (기존)
      const startSkillBonus = getMetaBonus(meta, 'startSkill+1');
      // 챔피언십 메타: 시작 패시브 +N (도전자 +1, 정복자 +2 = 총 +3)
      const champSkillBonus = getChampionshipMetaSkillBonus(meta);
      const totalSkillBonus = startSkillBonus + champSkillBonus;
      if (totalSkillBonus > 0) {
        Object.keys(baseSkills).forEach(k => {
          baseSkills[k] = Math.min(baseSkills[k] + totalSkillBonus, PASSIVE_SKILLS[k].maxLv);
        });
      }
      // 1.54.0~ 각성도 보상 적용: passiveBonus(시작 패시브 +Lv) 가산
      const _awak = aggregateAwakeningRewards(meta, classData.id);
      for (const [skill, delta] of Object.entries(_awak.skillDeltas)) {
        if (!PASSIVE_SKILLS[skill]) continue;
        const cur = baseSkills[skill] || 0;
        baseSkills[skill] = Math.min(cur + delta, PASSIVE_SKILLS[skill].maxLv);
      }
      setSkills(baseSkills);
      // 1.27.0~ 각인 effect 통합: 직업 능력치 + HP 가산
      const _engSlots = meta?.engravings?.[classData.id]?.slots || [];
      const _engFx = aggregateEngravingEffects(classData.id, _engSlots);
      const adjustedStats = { ...classData.stats };
      if (_engFx.str) adjustedStats.근력 = (adjustedStats.근력 || 0) + _engFx.str;
      if (_engFx.dex) adjustedStats.민첩 = (adjustedStats.민첩 || 0) + _engFx.dex;
      if (_engFx.int) adjustedStats.지능 = (adjustedStats.지능 || 0) + _engFx.int;
      if (_engFx.cha) adjustedStats.매력 = (adjustedStats.매력 || 0) + _engFx.cha;
      // 1.54.0~ 각성도 statBonus 가산
      for (const [stat, val] of Object.entries(_awak.statDeltas)) {
        adjustedStats[stat] = (adjustedStats[stat] || 0) + val;
      }
      setStats(adjustedStats);

      // 시작 HP 계산
      const hpBonus = getMinorBonus(baseSkills, 'maxHp+');
      const metaHpBonus = getMetaBonus(meta, 'startHp+10') * 10;
      // 챔피언십 메타 HP (도전자 +50, 정복자 +100, 합계 +150)
      const champHpBonus = getChampionshipMetaHp(meta);
      // 1.37.0~ 근력 시그니처 1단계: 최대 HP +5/포인트 (근력 11+)
      const strHpBonus = getStrengthHpBonus(adjustedStats);
      let startHp = GAME_CONFIG.startHp + hpBonus + metaHpBonus + champHpBonus + (_engFx.startHp || 0) + strHpBonus;
      // 저주: 최대 HP -20%
      if (hasCurse(curses, 'curse_maxHp-20')) {
        startHp = Math.floor(startHp * 0.8);
      }
      setHp(startHp);
      setMaxHp(startHp);
      
      // 시작 자원 (메타 강화 — 1.44.2~ startGold+10, startGem+2 + 챔피언십 은화)
      let startGold = GAME_CONFIG.startGold + getMetaBonus(meta, 'startGold+10') * 10 + getChampionshipMetaGold(meta);
      let startGem = GAME_CONFIG.startGem + getMetaBonus(meta, 'startGem+2') * 2;
      // 저주: 시작 시 보석 없음
      if (hasCurse(curses, 'curse_noGem')) startGem = 0;
      setGold(startGold);
      setGem(startGem);
      
      // 시작 유물 (메타 강화 + 챔피언십 메타)
      const startRelicCount = getMetaBonus(meta, 'startRelic+1') + getChampionshipMetaRelicBonus(meta);
      const startRelics = [];
      
      if (startRelicCount > 0) {
        // 일반 유물 풀 (weight > 0) + 해금된 챔피언십 유물 (낮은 가중치)
        const normalPool = RELICS.filter(r => (r.weight || 0) > 0);
        // 해금된 챔피언십 유물은 weight 1로 풀에 추가
        // 단, 현재 챔피언십 원정에서만 (다른 원정 유물 X, 클래식에선 X)
        const currentChampId = exp?.isChampionship ? exp.championshipId : null;
        const unlockedChampRelics = currentChampId
          ? (meta.championshipRelicUnlocks || [])
              .map(name => RELICS.find(r => r.name === name))
              .filter(r => r && r.championshipUnlock === currentChampId)
              .map(r => ({ ...r, weight: 1 }))
          : [];
        const fullPool = [...normalPool, ...unlockedChampRelics];
        // 가중치 기반 추첨
        const used = new Set();
        for (let i = 0; i < startRelicCount; i++) {
          const available = fullPool.filter(r => !used.has(r.name));
          if (available.length === 0) break;
          const totalWeight = available.reduce((s, r) => s + r.weight, 0);
          let roll = Math.random() * totalWeight;
          let picked = available[0];
          for (const r of available) {
            roll -= r.weight;
            if (roll <= 0) { picked = r; break; }
          }
          used.add(picked.name);
          const relicReward = { type: 'relic', ...picked };
          startRelics.push(relicReward);
        }
      }
      setRelics(startRelics);
      setUltimates([]);
      
      // 유물 startGold/startGem 적용
      const relicStartGold = startRelics.reduce((sum, r) => sum + (r.statBonus?.startGold || 0), 0);
      const relicStartGem = startRelics.reduce((sum, r) => sum + (r.statBonus?.startGem || 0), 0);
      if (relicStartGold > 0) setGold(prev => prev + relicStartGold);
      if (relicStartGem > 0) setGem(prev => prev + relicStartGem);
      
      // 유물 maxHp% 보너스 적용
      const relicMaxHpPct = startRelics.reduce((sum, r) => sum + (r.statBonus?.maxHp || 0), 0);
      if (relicMaxHpPct > 0) {
        const bonus = Math.floor(startHp * relicMaxHpPct / 100);
        setMaxHp(prev => prev + bonus);
        setHp(prev => prev + bonus);
      }
    } else {
      // 다음 챕터 - HP 회복 (70%까지 회복 보장, 이미 더 높으면 유지)
      const baseRatio = GAME_CONFIG.chapterHealRatio;  // 0.7
      const metaBonus = getMetaBonus(meta, 'chapterHeal+10%') * 0.1;
      let healRatio = baseRatio + metaBonus;
      const curseReduction = hasCurse(curses, 'curse_heal-50');
      if (curseReduction) healRatio *= 0.5;
      const targetHp = Math.floor(maxHp * healRatio);
      // 디버깅 로그
      const breakdownArr = [`기본 ${Math.floor(baseRatio * 100)}%`];
      if (metaBonus > 0) breakdownArr.push(`메타 +${Math.floor(metaBonus * 100)}%`);
      if (curseReduction) breakdownArr.push(`부패의 저주 ×0.5`);
      console.log(`[챕터 회복] ${breakdownArr.join(' / ')} = ${Math.floor(healRatio * 100)}% → ${targetHp}/${maxHp}`);
      setHp(prev => Math.min(maxHp, Math.max(prev, targetHp)));
    }
    setHasRerolled(false);
    const map = generateChapterMap(chapterData, idx);
    setMapData(map);
    setChapter(chapterData);
    setChapterIdx(idx);
    setScreen('map');
  };

  // linearSequence에서 해당 노드의 메타(객체 형태)를 가져옴 — 문자열 항목이면 null
  const getNodeMeta = (node) => {
    if (!node || !chapter) return null;
    if (Array.isArray(chapter.linearSequence)) {
      const item = chapter.linearSequence[node.layer];
      return item && typeof item === 'object' ? item : null;
    }
    if (Array.isArray(chapter.branchSequence)) {
      const layer = chapter.branchSequence[node.layer];
      if (!layer) return null;
      if (Array.isArray(layer)) {
        const col = typeof node.columnIndex === 'number' ? node.columnIndex : 0;
        const item = layer[col];
        return item && typeof item === 'object' ? item : null;
      }
      return typeof layer === 'object' ? layer : null;
    }
    return null;
  };

  // 노드 진입 분기
  const handleEnterNode = (node) => {
    let nodeType = node.type;

    // 미지 노드는 진입 시 랜덤 결정
    // 사건 50% / 회복의 샘 15% / 전투 30% / 강적 5%
    if (nodeType === 'unknown') {
      const r = Math.random() * 100;
      if (r < 50) nodeType = 'event';
      else if (r < 65) nodeType = 'fountain';
      else if (r < 95) nodeType = 'battle';
      else nodeType = 'elite';
    }

    // 튜토리얼 챕터: 진입 전 설명 모달 표시 (모달 확인 후 proceedEnterNode 호출)
    // 미지 노드는 맵에 표시되는 '미지' 그대로 안내 (랜덤 해석 결과는 모달 닫은 뒤 적용)
    if (chapter && chapter.isTutorial) {
      const modalType = node.type === 'unknown' ? 'unknown' : nodeType;
      const meta = getNodeMeta(node);
      setPendingNode({ node, resolvedType: nodeType, modalType, modalOverride: meta?.modalOverride || null });
      return;
    }

    proceedEnterNode(node, nodeType);
  };

  // 모달 확인 후(혹은 튜토리얼이 아닐 때 바로) 실제 노드 진입 처리
  const proceedEnterNode = (node, nodeType) => {
    setActiveNodeId(node.id);
    setActiveNodeType(nodeType);

    // 튜토리얼: 노드에 addCurseId가 지정되어 있으면 저주 누적
    // (전투/강적/보스 노드에서 적용 — 같은 화면 사이클 내 setState라 다음 렌더에 반영됨)
    const nodeMeta = getNodeMeta(node);
    if (nodeMeta?.addCurseId) {
      const curseId = nodeMeta.addCurseId;
      const curseObj = CURSES.find(c => c.id === curseId);
      if (curseObj && !currentCurses.some(c => c.id === curseId)) {
        setCurrentCurses(prev => [...prev, curseObj]);
      }
    }

    if (nodeType === 'battle') {
      const pool = chapter.enemies.normal;
      const enemyKey = pool[Math.floor(Math.random() * pool.length)];
      setCurrentEnemy(enemyKey);
      setMeta(prev => recordCodex(prev, 'enemies', enemyKey));
      setIsEliteReward(false);
      setIsBossReward(false);
      setScreen('combat');
    } else if (nodeType === 'elite') {
      const pool = chapter.enemies.elite;
      const enemyKey = pool[Math.floor(Math.random() * pool.length)];
      setCurrentEnemy(enemyKey);
      setMeta(prev => recordCodex(prev, 'enemies', enemyKey));
      setIsEliteReward(true);
      setIsBossReward(false);
      setScreen('combat');
    } else if (nodeType === 'boss') {
      const enemyKey = chapter.enemies.boss;
      setCurrentEnemy(enemyKey);
      setMeta(prev => recordCodex(prev, 'enemies', enemyKey));
      setIsBossReward(true);
      setIsEliteReward(false);
      setScreen('bossIntro');
    } else if (nodeType === 'event') {
      // linearSequence에서 forceEventId가 지정되어 있으면 그 이벤트 사용
      const meta = getNodeMeta(node);
      let ev = null;
      if (meta?.forceEventId) {
        ev = EVENTS.find(e => e.id === meta.forceEventId);
      }
      // 1.70.0~ 연쇄 이벤트 — 예약된 후속 사건이 있으면 랜덤보다 최우선 발동
      if (!ev && pendingChainEvents.length > 0) {
        const chainEv = EVENTS.find(e => e.id === pendingChainEvents[0]);
        if (chainEv) {
          ev = chainEv;
          setPendingChainEvents(prev => prev.slice(1));
        }
      }
      if (!ev) {
        // tutorialGift는 강제 트리거 전용 (랜덤 풀 제외)
        // chainOnly는 연쇄 예약으로만 등장 (랜덤 풀 제외)
        // classOnly가 지정된 사건은 현재 직업 ID가 포함된 경우만 풀에 남김
        const myClassId = classData?.id;
        const pool = EVENTS.filter(e => {
          if (e.tutorialGift) return false;
          if (e.chainOnly) return false;
          if (Array.isArray(e.classOnly) && e.classOnly.length > 0) {
            if (!myClassId || !e.classOnly.includes(myClassId)) return false;
          }
          return true;
        });
        const chapterId = chapter.id;
        const validEvents = pool.filter(e => !e.chapter || e.chapter.includes(chapterId));
        ev = validEvents.length > 0
          ? validEvents[Math.floor(Math.random() * validEvents.length)]
          : pool[Math.floor(Math.random() * pool.length)]; // 챕터 매치 없을 시 전체 풀
      }
      setCurrentEvent(ev);
      if (ev?.id) setMeta(prev => recordCodex(prev, 'events', ev.id));
      setScreen('event');
    } else if (nodeType === 'fountain') {
      // 회복의 샘 — 사건 화면처럼 표시 후 체력 15% 회복
      const healAmount = Math.floor(maxHp * 0.15);
      // 임시 사건 객체 생성 (회복의 샘 전용)
      const fountainEvent = {
        id: 'fountain',
        title: '회복의 샘',
        text: '맑은 샘이 빛을 발한다.\n흐르는 물에 손을 담그자, 상처가 아물고 영혼이 정화된다.',
        choices: [
          { 
            text: '샘에서 휴식한다', 
            result: `편안한 휴식을 통해 체력이 회복된다.`,
            reward: { type: 'heal', value: healAmount },
          },
        ],
      };
      setCurrentEvent(fountainEvent);
      setScreen('event');
    } else if (nodeType === 'shop') {
      setScreen('shop');
    } else if (nodeType === 'forge') {
      // tutorialForge: 진입 시 보유 유물 외에 랜덤 유물 1개 추가 지급
      // (튜토리얼에서 조합에 사용할 두 번째 유물 확보)
      const meta = getNodeMeta(node);
      if (meta?.tutorialForge) {
        const ownedNames = relics.map(r => r.name);
        const pool = getRewardPool(classData?.id)
          .filter(r => r.type === 'relic' && !ownedNames.includes(r.name));
        if (pool.length > 0) {
          const totalWeight = pool.reduce((s, r) => s + (r.weight || 1), 0);
          let roll = Math.random() * totalWeight;
          let picked = pool[0];
          for (const r of pool) {
            roll -= (r.weight || 1);
            if (roll <= 0) { picked = r; break; }
          }
          // 유물 추가 (statBonus 키 정규화는 다른 곳과 동일하게 처리되어 있음)
          setRelics(prev => [...prev, picked]);
          // 활성 유물 목록에도 자동 포함
          if (activeRelicNames) {
            setActiveRelicNames(prev => prev ? [...prev, picked.name] : null);
          }
        }
      }
      setScreen('forge');
    } else if (nodeType === 'rest') {
      setScreen('rest');
    } else if (nodeType === 'prep') {
      setScreen('prep');
    }
  };
  
  // 전투 준비 완료 처리
  const handlePrepConfirm = (selSkills, selRelicNames) => {
    setActiveSkills(selSkills);
    setActiveRelicNames(selRelicNames);
    completeCurrentNode();
    setScreen('map');
  };

  // 노드 완료 처리 (같은 레이어의 다른 노드 잠금 + 다음 레이어 활성화)
  const completeCurrentNode = () => {
    if (!mapData || activeNodeId === null) return;
    
    const currentNode = mapData.nodes.find(n => n.id === activeNodeId);
    if (!currentNode) return;
    const currentLayer = currentNode.layer;
    
    // 1. 현재 노드 = completed, 같은 레이어의 다른 current 노드들 = locked (선택 못 함)
    const newNodes = mapData.nodes.map(n => {
      if (n.id === activeNodeId) return { ...n, completed: true, current: false };
      if (n.layer === currentLayer && n.current) {
        // 같은 레이어의 형제 노드 → 비활성화
        return { ...n, current: false, locked: true };
      }
      return n;
    });
    
    // 2. 다음 레이어에서, 완료한 노드와 연결된 노드만 활성화
    const nextNodeIds = mapData.edges
      .filter(([a]) => a === activeNodeId)
      .map(([_, b]) => b);
    nextNodeIds.forEach(nid => {
      const idx = newNodes.findIndex(n => n.id === nid);
      if (idx !== -1) newNodes[idx] = { ...newNodes[idx], current: true, locked: false };
    });
    
    setMapData({ ...mapData, nodes: newNodes });
  };

  // 전투 승리
  const handleVictory = (remainingHp, drop, combatStats = null) => {
    setHp(remainingHp);
    // 1.81.0~ 전투 정산 (VictoryScreen 표시용)
    setVictoryStats(combatStats);
    
    // === 업적 트래킹: 적 처치 ===
    let trackedMeta = { ...meta, totalKills: (meta.totalKills || 0) + 1 };
    // 첫걸음 (첫 처치)
    trackedMeta = completeAchievement(trackedMeta, 'special_first_kill', 1);
    // 누적 처치 카운터
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_kill_100', trackedMeta.totalKills, 100);
    trackedMeta = setAchievementProgress(trackedMeta, 'meta_kill_1000', trackedMeta.totalKills, 1000);
    // 1.72.0~ 일일 임무: 처치 / 강적 처치
    const dmKey = getKstDateKey();
    trackedMeta = trackDailyMission(trackedMeta, DAILY_MISSIONS.find(m => m.id === 'dm_kill10'), 1, dmKey);
    if (isEliteReward) {
      trackedMeta = trackDailyMission(trackedMeta, DAILY_MISSIONS.find(m => m.id === 'dm_elite3'), 1, dmKey);
    }
    setMeta(trackedMeta);
    
    // 드랍 적용 (저주: 획득 은화 -50%) + 획득량 추적
    let goldGained = 0;
    let gemGained = 0;
    if (drop?.gold) {
      let g = Math.floor(drop.gold[0] + Math.random() * (drop.gold[1] - drop.gold[0]));
      if (hasCurse(currentCurses, 'curse_gold-50')) g = Math.floor(g * 0.5);
      else if (hasCurse(currentCurses, 'curse_gold-25')) g = Math.floor(g * 0.75);
      goldGained = g;
      setGold(prev => prev + g);
    }
    if (drop?.gem) {
      let gm = Math.floor(drop.gem[0] + Math.random() * (drop.gem[1] - drop.gem[0]));
      if (hasCurse(currentCurses, 'curse_rewardGem-1')) gm = Math.max(0, gm - 1);
      gemGained = gm;
      setGem(prev => prev + gm);
    }
    
    // 영혼 획득: 일반=1, 엘리트=3, 보스=챕터별 5/8/12/20
    let soulGain = SOUL_REWARDS.normalKill;
    if (isBossReward) {
      const ci = currentExpedition ? chapterIdx : 0;
      soulGain = SOUL_REWARDS.bossKill[ci] || SOUL_REWARDS.bossKill[0];
    } else if (isEliteReward) {
      soulGain = SOUL_REWARDS.eliteKill;
    }
    // 1.37.0~ 매력 자동 가산: 영혼 획득 +0.5%/포인트
    const charismaSoulPct = getCharismaSoulGainBonus(stats);
    if (charismaSoulPct > 0) {
      soulGain = Math.floor(soulGain * (1 + charismaSoulPct / 100));
    }
    setRunSouls(prev => prev + soulGain);

    // 보스라면 챕터 보너스도 추가
    let chapterBonusSouls = 0;
    if (isBossReward) {
      chapterBonusSouls = SOUL_REWARDS.chapterClear[chapterIdx] || 5;
      if (charismaSoulPct > 0) {
        chapterBonusSouls = Math.floor(chapterBonusSouls * (1 + charismaSoulPct / 100));
      }
      setRunSouls(prev => prev + chapterBonusSouls);
    }
    
    // 승리 화면용 획득량 저장
    setVictoryGains({
      gold: goldGained,
      gem: gemGained,
      souls: soulGain + chapterBonusSouls
    });

    // 1.81.0~ 런 누적 정산 (원정 클리어 화면 + 자동 사냥 대기화면 표시용)
    setRunStats(prev => {
      const base = prev || { battles: 0, totalDmg: 0, bySource: {}, gold: 0, gem: 0, souls: 0 };
      const bySource = { ...base.bySource };
      if (combatStats?.bySource) {
        Object.entries(combatStats.bySource).forEach(([k, v]) => { bySource[k] = (bySource[k] || 0) + v; });
      }
      return {
        battles: base.battles + 1,
        totalDmg: base.totalDmg + (combatStats?.total || 0),
        bySource,
        gold: base.gold + goldGained,
        gem: base.gem + gemGained,
        souls: base.souls + soulGain + chapterBonusSouls,
      };
    });

    if (isBossReward) {
      // 마지막 챕터 보스 처치 → 원정 클리어 화면, 그 외 → 챕터 클리어
      const isLastChapter = currentExpedition && chapterIdx >= currentExpedition.chapters.length - 1;
      setVictoryNextScreen(isLastChapter ? 'expeditionClear' : 'chapterClear');
      setScreen('victory');
      return;
    }

    // 일반/엘리트: 보상 데이터 준비 → victory 화면 → 탭 → reward
    let count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
    if (isUnlocked(meta, 'meta_extraReward')) count = Math.max(count, 4);
    const rewards = rollRewards(count, isEliteReward, skills, relics, ultimates, classData?.id, meta, currentExpedition);
    setCurrentRewards(rewards);
    setHasRerolled(false);
    setVictoryNextScreen('reward');
    setScreen('victory');
  };
  
  // 승리 화면 → 다음 화면 (보상 / 챕터 클리어 / 원정 클리어)
  const handleVictoryContinue = () => {
    if (victoryNextScreen === 'chapterClear') {
      completeCurrentNode();
      setScreen('chapterClear');
    } else if (victoryNextScreen === 'expeditionClear') {
      completeCurrentNode();
      // 원정 클리어 처리 (영혼 보너스 합산 등은 handleChapterContinue에서 처리)
      handleChapterContinue();
    } else {
      setScreen('reward');
    }
    setVictoryNextScreen(null);
  };

  // 전투 패배
  const handleDefeat = () => {
    // 무한모드: 깊이 기반 보너스 (페널티 없음 — 죽음 = 도전의 끝)
    // 일반: 누적 영혼의 70%만 획득
    let recoveredSouls;
    // 1.37.0~ 매력 자동 가산: 무한 깊이 보너스에 +0.5%/포인트 적용 (처치 영혼은 누적 시점에 이미 가산됨)
    const charismaSoulPct = getCharismaSoulGainBonus(stats);
    if (currentExpedition?.endless) {
      let depthBonus = endlessDepth * 15;
      if (charismaSoulPct > 0) {
        depthBonus = Math.floor(depthBonus * (1 + charismaSoulPct / 100));
      }
      recoveredSouls = runSouls + depthBonus;
    } else {
      recoveredSouls = Math.floor(runSouls * SOUL_REWARDS.deathPenalty);
    }
    // 런 종료 — 영혼 보상 적용 + 진행 중 스냅샷 정리
    let newMeta = recoveredSouls > 0 ? addSouls(meta, recoveredSouls) : meta;
    newMeta = clearActiveRun(newMeta);
    setMeta(newMeta);
    setRunSouls(recoveredSouls);  // 화면 표시용
    setScreen('defeat');
  };

  // 보상 획득
  const handlePickReward = (reward) => {
    applyReward(reward);
    // 운명 minor: 보상 받을 때 추가 보석 +1/Lv
    const extraGem = getMinorBonus(skills, 'rewardChoice+', activeSkills);
    if (extraGem > 0) {
      setGem(prev => prev + extraGem);
    }
    completeCurrentNode();
    setScreen('map');
  };

  const applyReward = (reward) => {
    if (reward.type === 'ultimate') {
      // 궁극 진화: 패시브 Lv → 0 리셋, 궁극 ID 추가
      const skillName = reward.skillName;

      // 패시브 Lv을 0으로 리셋
      setSkills(prev => ({ ...prev, [skillName]: 0 }));

      // 궁극 ID 추가
      setUltimates(prev => [...prev, reward.ultimate.id]);
      // 1.26.0~ 각성도 조건 추적: 직업별 ULTIMATE_SKILLS 픽 기록
      if (classData?.id && reward.ultimate?.id) {
        setMeta(prev => {
          const next = recordUltimatePickByClass(prev, classData.id, reward.ultimate.id);
          saveMeta(next);
          return next;
        });
      }
      
      // 재생이었다면 minor 보너스 HP는 잃음
      if (skillName === '재생') {
        const lostHp = PASSIVE_SKILLS['재생'].minorEffect.perLv * 7;
        setMaxHp(prev => Math.max(GAME_CONFIG.startHp, prev - lostHp));
        setHp(prev => Math.min(maxHp - lostHp, prev));
      }
    } else if (reward.type === 'skill') {
      // 재생 minor: 최대 HP +8/Lv (보상 획득 시도)
      if (reward.name === '재생' && (skills['재생'] || 0) < PASSIVE_SKILLS['재생'].maxLv) {
        const hpAdd = PASSIVE_SKILLS['재생'].minorEffect.perLv;
        setMaxHp(prev => prev + hpAdd);
        setHp(prev => prev + hpAdd);
      }
      setSkills(prev => ({
        ...prev,
        [reward.name]: Math.min((prev[reward.name] || 0) + 1, PASSIVE_SKILLS[reward.name].maxLv)
      }));
      // 도감 기록 — 한 번이라도 배운 패시브
      setMeta(prev => recordCodex(prev, 'passives', reward.name));
      // ★ 추가: 활성화 슬롯이 남았다면(5개 미만) 획득 즉시 활성화 목록에 추가
      setActiveSkills(prev => {
        const currentActive = prev || [];
        if (currentActive.length < PREP_CONFIG.maxSkillSelect && !currentActive.includes(reward.name)) {
          return [...currentActive, reward.name];
        }
        return currentActive;
      });
    } else if (reward.type === 'relic') {
      // 1. 유물 보유 목록 추가
      setRelics(prev => [...prev, reward]);
      setMeta(prev => recordCodex(prev, 'relics', reward.name));
      
      // 2. 유물 즉시 효과(HP/골드/보석) 적용
      const stat = reward.statBonus || {};
      if (stat.maxHp) {
        const bonus = Math.floor(maxHp * stat.maxHp / 100);
        setMaxHp(prev => prev + bonus);
        setHp(prev => prev + bonus);
      }
      if (stat.startGold) setGold(prev => prev + stat.startGold);
      if (stat.startGem) setGem(prev => prev + stat.startGem);
  
      // ★ 추가: 유물 슬롯이 남았다면 즉시 활성화 목록에 추가
      setActiveRelicNames(prev => {
        const currentActive = prev || [];
        const maxRelicSelect = currentExpedition?.maxRelicSelect || 1;
        if (currentActive.length < maxRelicSelect && !currentActive.includes(reward.name)) {
          return [...currentActive, reward.name];
        }
        return currentActive;
      });
      
    } else if (reward.type === 'stat') {
      setStats(prev => ({ ...prev, [reward.name]: (prev[reward.name] || 10) + reward.value }));
      if (reward.name === '최대 체력') {
        setMaxHp(prev => prev + reward.value);
        setHp(prev => prev + reward.value);
      }
    } else if (reward.type === 'heal') {
      let healValue = reward.value;
      // 유물 heal % 보너스
      const relicHealPct = getActiveRelicStat(relics, activeRelicNames, 'heal');
      if (relicHealPct > 0) healValue = Math.floor(healValue * (1 + relicHealPct / 100));
      // 매력 시그니처: 회복 효율 +%
      const charismaBonus = getCharismaHealBonus({ ...classData?.stats, ...stats });
      if (charismaBonus > 0) healValue = Math.floor(healValue * (1 + charismaBonus / 100));
      if (hasCurse(currentCurses, 'curse_heal-50')) healValue = Math.floor(healValue * 0.5);
      setHp(prev => Math.min(maxHp, prev + healValue));
    } else if (reward.type === 'heal_full') {
      if (hasCurse(currentCurses, 'curse_heal-50')) {
        setHp(prev => Math.min(maxHp, prev + Math.floor(maxHp * 0.5)));
      } else {
        setHp(maxHp);
      }
    } else if (reward.type === 'relic') {
      setRelics(prev => [...prev, reward]);
      if (reward.name) setMeta(prev => recordCodex(prev, 'relics', reward.name));
      // 유물의 maxHp% / startGold / startGem 즉시 적용
      const stat = reward.statBonus || {};
      if (stat.maxHp) {
        const bonus = Math.floor(maxHp * stat.maxHp / 100);
        setMaxHp(prev => prev + bonus);
        setHp(prev => prev + bonus);
      }
      if (stat.startGold) setGold(prev => prev + stat.startGold);
      if (stat.startGem) setGem(prev => prev + stat.startGem);
    } else if (reward.type === 'gold') {
      setGold(prev => prev + reward.value);
    } else if (reward.type === 'gem') {
      setGem(prev => prev + reward.value);
    }
  };

  const handleReroll = (newRewards, cost) => {
    setGem(prev => prev - (cost || GAME_CONFIG.rerollCost));
    setHasRerolled(true);
    setCurrentRewards(newRewards);
  };

  // 사건 결과 처리
  const handleEventResolve = (resultData) => {
    if (resultData.reward) {
      const reward = resultData.reward;
      if (reward.type === 'gold') setGold(prev => prev + reward.value);
      else if (reward.type === 'gem') setGem(prev => prev + reward.value);
      else if (reward.type === 'heal') {
        let healValue = reward.value;
        const charismaBonus = getCharismaHealBonus({ ...classData?.stats, ...stats });
        if (charismaBonus > 0) healValue = Math.floor(healValue * (1 + charismaBonus / 100));
        if (hasCurse(currentCurses, 'curse_heal-50')) healValue = Math.floor(healValue * 0.5);
        setHp(prev => Math.min(maxHp, prev + healValue));
      }
      else if (reward.type === 'heal_full') {
        if (hasCurse(currentCurses, 'curse_heal-50')) {
          setHp(prev => Math.min(maxHp, prev + Math.floor(maxHp * 0.5)));
        } else {
          setHp(maxHp);
        }
      }
      else if (reward.type === 'maxhp') {
        setMaxHp(prev => prev + reward.value);
        setHp(prev => prev + reward.value);
      }
      else if (reward.type === 'stat') {
        // 능력치 영구 상승
        setStats(prev => ({ ...prev, [reward.name]: (prev[reward.name] || 0) + reward.value }));
      }
      else if (reward.type === 'specific_relic') {
        // 지정된 이름의 유물을 확정 지급 (튜토리얼용)
        const target = RELICS.find(r => r.name === reward.relicName);
        if (target) {
          const ownedNames = relics.map(r => r.name);
          if (!ownedNames.includes(target.name)) {
            applyReward({ type: 'relic', ...target });
          }
        }
      }
      else if (reward.type === 'random_relic') {
        // 보유한 유물은 제외 (중복 불가)
        const ownedNames = relics.map(r => r.name);
        const normalRelics = getRewardPool(classData?.id)
          .filter(r => r.type === 'relic' && !ownedNames.includes(r.name));
        // 해금된 챔피언십 유물 — 현재 챔피언십 원정 유물만 (다른 원정 X, 클래식 X)
        const currentChampId = currentExpedition?.isChampionship ? currentExpedition.championshipId : null;
        const unlockedChampRelics = currentChampId
          ? (meta?.championshipRelicUnlocks || [])
              .map(name => RELICS.find(r => r.name === name))
              .filter(r => r && r.championshipUnlock === currentChampId && !ownedNames.includes(r.name))
              .map(r => ({ type: 'relic', ...r, weight: 1 }))
          : [];
        const fullPool = [...normalRelics, ...unlockedChampRelics];
        if (fullPool.length > 0) {
          // 가중치 추첨
          const totalWeight = fullPool.reduce((s, r) => s + (r.weight || 1), 0);
          let roll = Math.random() * totalWeight;
          let picked = fullPool[0];
          for (const r of fullPool) {
            roll -= (r.weight || 1);
            if (roll <= 0) { picked = r; break; }
          }
          applyReward(picked);
        } else {
          // 모든 유물을 이미 보유 → 영혼 보상으로 대체
          setGold(prev => prev + 80);
        }
      } else if (reward.type === 'skill_random_lv') {
        // EventScreen에서 미리 결정된 스킬 사용 (없으면 다시 굴림)
        const targetName = reward._resolvedSkill;
        if (targetName && skills[targetName] != null && skills[targetName] < 7) {
          setSkills(prev => ({ ...prev, [targetName]: Math.min(prev[targetName] + 1, 7) }));
        } else {
          // 폴백 (혹시 미리 결정 안 됐을 때)
          const ownedSkills = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
          if (ownedSkills.length > 0) {
            const [name] = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
            setSkills(prev => ({ ...prev, [name]: Math.min(prev[name] + 1, 7) }));
          }
        }
      }
    }
    if (resultData.penalty?.hp) {
      setHp(prev => Math.max(1, prev + resultData.penalty.hp));
    }
    if (resultData.penalty?.gold) {
      setGold(prev => Math.max(0, prev + resultData.penalty.gold));
    }
    if (resultData.penalty?.gem) {
      setGem(prev => Math.max(0, prev + resultData.penalty.gem));
    }
    // 1.70.0~ 연쇄 이벤트 예약 — 다음 event 노드에서 후속 사건 발동
    if (resultData.chain) {
      setPendingChainEvents(prev => [...prev, resultData.chain]);
    }
    if (resultData.combat) {
      setCurrentEnemy(resultData.combat);
      setIsEliteReward(false); setIsBossReward(false);
      setScreen('combat');
      return;
    }
    completeCurrentNode();
    setScreen('map');
  };

  // 야영 선택
  const handleRestChoice = (choice) => {
    if (choice.type === 'heal') {
      let healValue = choice.value;
      const relicHealPct = getActiveRelicStat(relics, activeRelicNames, 'heal');
      if (relicHealPct > 0) healValue = Math.floor(healValue * (1 + relicHealPct / 100));
      const charismaBonus = getCharismaHealBonus({ ...classData?.stats, ...stats });
      if (charismaBonus > 0) healValue = Math.floor(healValue * (1 + charismaBonus / 100));
      if (hasCurse(currentCurses, 'curse_heal-50')) healValue = Math.floor(healValue * 0.5);
      setHp(prev => Math.min(maxHp, prev + healValue));
      completeCurrentNode();
      setScreen('map');
    } else if (choice.type === 'reselect_skills') {
      // 패시브 재선택 화면으로 (PrepScreen 재사용, mode='skills_only')
      setReselectMode('skills');
      setScreen('reselect');
    } else if (choice.type === 'reselect_relics') {
      setReselectMode('relics');
      setScreen('reselect');
    }
  };
  
  // 재선택 완료 처리 (정비 노드에서 → 보스로 이동)
  const handleReselectConfirm = (selSkills, selRelicNames) => {
    if (reselectMode === 'skills') {
      setActiveSkills(selSkills);
    } else if (reselectMode === 'relics') {
      setActiveRelicNames(selRelicNames);
    }
    setReselectMode(null);
    completeCurrentNode();
    setScreen('map');
  };

  // 상점 구매
  const handleShopBuy = (item, price) => {
    setGold(prev => prev - price);
    applyReward(item);
  };

  const handleShopLeave = () => {
    completeCurrentNode();
    setScreen('map');
  };
  
  // 황혼의 대장간: 유물 2개 희생 → 패시브 +1 또는 영혼 +50
  const handleForgeCombine = (selectedIndices, result) => {
    // 선택된 유물 2개 제거
    const removeIndices = new Set(selectedIndices);
    setRelics(prev => prev.filter((_, i) => !removeIndices.has(i)));
    // 활성 유물 목록에서도 제거 (해당 이름)
    if (activeRelicNames) {
      const removed = selectedIndices.map(i => relics[i]?.name).filter(Boolean);
      setActiveRelicNames(prev => prev ? prev.filter(n => !removed.includes(n)) : null);
    }
    
    if (result.type === 'skill') {
      // 패시브 +1
      setSkills(prev => ({ ...prev, [result.skillName]: (prev[result.skillName] || 0) + 1 }));
    } else if (result.type === 'souls') {
      // 영혼 +50 (해당 런 누적, 원정 클리어/사망 시 메타에 반영)
      // 1.37.0~ 매력 자동 가산: 영혼 보상 +0.5%/포인트
      const charismaSoulPct = getCharismaSoulGainBonus(stats);
      const forgeSouls = charismaSoulPct > 0
        ? Math.floor(result.value * (1 + charismaSoulPct / 100))
        : result.value;
      setRunSouls(prev => prev + forgeSouls);
    }
    
    // === 업적 트래킹 ===
    let trackedMeta = { 
      ...meta, 
      forgeCount: (meta.forgeCount || 0) + 1,
      discoveredRecipes: meta.discoveredRecipes || [],
    };
    
    // 첫 단련
    trackedMeta = completeAchievement(trackedMeta, 'forge_first', 1);
    
    // 누적 조합 횟수
    const newCount = trackedMeta.forgeCount;
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_10', newCount, 10);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_50', newCount, 50);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_100', newCount, 100);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_200', newCount, 200);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_300', newCount, 300);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_400', newCount, 400);
    trackedMeta = setAchievementProgress(trackedMeta, 'forge_count_500', newCount, 500);
    
    // 레시피 발견 (skill 결과 + 처음 발견 시만)
    if (result.type === 'skill' && result.skillName) {
      const discovered = trackedMeta.discoveredRecipes || [];
      if (!discovered.includes(result.skillName)) {
        trackedMeta.discoveredRecipes = [...discovered, result.skillName];
        const count = trackedMeta.discoveredRecipes.length;
        trackedMeta = setAchievementProgress(trackedMeta, 'forge_recipe_3', count, 3);
        trackedMeta = setAchievementProgress(trackedMeta, 'forge_recipe_6', count, 6);
        trackedMeta = setAchievementProgress(trackedMeta, 'forge_recipe_all', count, 12);
      }
    }
    
    setMeta(trackedMeta);
  };
  
  const handleForgeLeave = () => {
    completeCurrentNode();
    setScreen('map');
  };

  // 챕터 클리어 → 다음 챕터 / 원정 클리어
  const handleChapterContinue = () => {
    if (!currentExpedition) {
      setScreen('title');
      return;
    }

    // 무한모드는 마지막 챕터 개념이 없음 — 항상 다음 사이클로
    const isLastChapter = !currentExpedition.endless && chapterIdx >= currentExpedition.chapters.length - 1;

    if (isLastChapter) {
      // 원정 클리어
      const expSoulReward = currentExpedition.soulReward;
      const totalSouls = runSouls + expSoulReward;
      
      // 메타 저장
      let newMeta = { ...meta };
      newMeta = addSouls(newMeta, totalSouls);
      // 1.72.0~ 일일 임무: 원정 1회 클리어
      newMeta = trackDailyMission(newMeta, DAILY_MISSIONS.find(m => m.id === 'dm_clear1'), 1, getKstDateKey());
      
      // 챔피언십 vs 클래식 분기
      if (currentExpedition.isChampionship) {
        const champId = currentExpedition.championshipId;
        const diffId = currentExpedition.difficultyId;
        const wasFirstClear = !hasChampionshipClear(newMeta, champId, diffId);
        
        // 챔피언십 클리어 기록 (기존 직업 무관 + 1.26.0~ 직업별 추적)
        newMeta = recordChampionshipClear(newMeta, champId, diffId);
        if (classData?.id) {
          newMeta = recordChampionshipClearByClass(newMeta, classData.id, champId, diffId);
        }
        
        // 첫 클리어 시 신규 유물 해금 (원정별 대표 1종)
        let newlyUnlockedRelic = null;
        if (wasFirstClear) {
          const relicMap = {
            frost: '한기의 결정',
            forest: '광기의 송곳니',
            sanctum: '봉인의 인장',
            rift: '균열의 핵',
            dawn: '여명의 성배',
          };
          const relicName = relicMap[champId];
          if (relicName) {
            const exists = RELICS.some(r => r.name === relicName);
            const alreadyUnlocked = (newMeta.championshipRelicUnlocks || []).includes(relicName);
            if (exists && !alreadyUnlocked) {
              newMeta = unlockChampionshipRelic(newMeta, relicName);
              newlyUnlockedRelic = relicName;
            }
          }
        }
        // 첫 클리어 + 신규 유물 해금 정보를 ExpeditionClearScreen에 전달
        setRunFirstChampClear({ isFirstClear: wasFirstClear, newRelic: newlyUnlockedRelic });
        
        // 업적: 챔피언십 클리어 (각 원정 × 난이도)
        newMeta = completeAchievement(newMeta, `champ_clear_${champId}_${diffId}`, 1);
        // 업적: 마스터 (해당 원정 4난이도 모두 클리어 시)
        const champClears = newMeta.championshipClears?.[champId] || {};
        if (champClears.normal && champClears.hard && champClears.hell && champClears.madness) {
          newMeta = completeAchievement(newMeta, `champ_master_${champId}`, 1);
        }
        // 업적: 모든 원정 일반/하드/지옥/광기 클리어
        const allChamps = ['frost', 'forest', 'sanctum', 'rift', 'dawn'];
        const normalCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.normal).length;
        const hardCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.hard).length;
        const hellCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.hell).length;
        const madnessCleared = allChamps.filter(c => 
          newMeta.championshipClears?.[c]?.madness).length;
        newMeta = setAchievementProgress(newMeta, 'champ_all_normal',  normalCleared,  5);
        newMeta = setAchievementProgress(newMeta, 'champ_all_hard',    hardCleared,    5);
        newMeta = setAchievementProgress(newMeta, 'champ_all_hell',    hellCleared,    5);
        newMeta = setAchievementProgress(newMeta, 'champ_all_madness', madnessCleared, 5);
      } else if (currentExpedition.category === 'daily') {
        // 일일 챌린지 클리어 — 같은 날 첫 클리어에만 보너스 영혼
        const dateKey = currentExpedition.dailyDateKey;
        if (dateKey && !hasDailyCleared(newMeta, dateKey)) {
          newMeta = recordDailyClear(newMeta, dateKey);
          const dailyBonus = 100;
          newMeta = addSouls(newMeta, dailyBonus);
          setRunSouls(prev => prev + dailyBonus);
        }
      } else {
        // 클래식 원정 (튜토리얼 또는 수련의 길)
        newMeta = recordExpeditionClear(newMeta, currentExpedition.id);

        const expId = currentExpedition.id;

        // 1. 튜토리얼 클리어 업적
        if (expId === 'tutorial_basic' || expId === 'tutorial_market' || expId === 'tutorial_branching' || expId === 'tutorial_curse') {
          newMeta = completeAchievement(newMeta, `clear_${expId}`, 1);
        }
        
        // 2. 수련의 길 클리어 처리
        if (currentExpedition.category === 'training') {
          // 첫 클리어 업적
          newMeta = completeAchievement(newMeta, `clear_${expId}`, 1);
          // 10회 숙달
          newMeta = incrementAchievement(newMeta, `master10_${expId}`, 1, 10);
          
          // 다음 직업 자동 해금 (unlocksClass)
          if (typeof currentExpedition.unlocksClass === 'number') {
            const classKeys = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
            const unlockClassId = classKeys[currentExpedition.unlocksClass];
            if (unlockClassId && !newMeta.unlocks.includes(`unlock_${unlockClassId}`)) {
              newMeta = applyUnlock(newMeta, `unlock_${unlockClassId}`);
            }
          }
          // 챔피언십 직업 사용 가능 (자동으로 isChampionshipClassUnlocked가 처리)
        }
      }
      
      // 영혼 부자 (5000 누적 보유) — 영혼 추가 후 체크
      newMeta = setAchievementProgress(newMeta, 'special_souls_5000', newMeta.souls, 5000);
      
      setMeta(newMeta);
      
      setRunSouls(totalSouls);  // 화면에 표시용
      setScreen('expeditionClear');
    } else {
      // 다음 챕터
      const nextChapterIdx = chapterIdx + 1;
      // 무한모드: 챕터 사이클 + 깊이 기반 스케일링
      if (currentExpedition.endless) {
        const baseChapters = currentExpedition.chapters;
        const nextChapterId = baseChapters[nextChapterIdx % baseChapters.length];
        const nextChapter = CHAPTERS.find(c => c.id === nextChapterId);
        if (!nextChapter) {
          console.error('무한모드 챕터 데이터 없음:', nextChapterId);
          return;
        }
        // 원본 multipliers 보존 + 깊이 기반 스케일
        const baseExp = currentExpedition._baseExp || currentExpedition;
        const newDepth = nextChapterIdx;
        const hpScale = 1 + newDepth * 0.15;
        const dmgScale = 1 + newDepth * 0.12;
        const scaledExp = {
          ...baseExp,
          enemyHpMult: (baseExp.enemyHpMult || 1.0) * hpScale,
          enemyDmgMult: (baseExp.enemyDmgMult || 1.0) * dmgScale,
          _baseExp: baseExp,
        };
        setCurrentExpedition(scaledExp);
        setEndlessDepth(newDepth);
        initializeRun(nextChapter, nextChapterIdx, scaledExp);
      } else if (currentExpedition.isChampionship) {
        // 챔피언십이면 ID로
        const nextChapterId = currentExpedition.chapters[nextChapterIdx];
        const nextChapterData = CHAMPIONSHIP_CHAPTERS[nextChapterId];
        initializeRun(nextChapterData, nextChapterIdx);
      } else {
        // 클래식
        const nextChapterId = currentExpedition.chapters[nextChapterIdx];
        const nextChapter = CHAPTERS.find(c => c.id === nextChapterId);
        if (!nextChapter) {
          console.error('다음 챕터 데이터 없음:', nextChapterId);
          return;
        }
        initializeRun(nextChapter, nextChapterIdx);
      }
    }
  };
  
  // 원정 클리어 화면 → 메인 메뉴
  const handleExpeditionClearContinue = () => {
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setPendingChainEvents([]);
    setRunSouls(0);
    setSelectedChampionship(null);
    setSelectedDifficulty(null);
    setMeta(prev => clearActiveRun(prev));
    setScreen('title');
  };
  
  // 사망 화면 → 메인 메뉴
  const handleDefeatContinue = () => {
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setPendingChainEvents([]);
    setRunSouls(0);
    setSelectedChampionship(null);
    setSelectedDifficulty(null);
    setScreen('title');
  };

  // 1.73.0~ 무한던전 스킵 — 하루 5회, 실전투 시뮬로 보상 계산 후 즉시 지급
  // 5직업 전부 시뮬 → 최고 결과 채택. 기록·도감·업적·일일 임무 미반영 (보상 전용)
  const handleEndlessSkip = () => {
    const dateKey = getKstDateKey();
    if (getEndlessSkipUsed(meta, dateKey) >= ENDLESS_SKIP_LIMIT) return null;
    const result = simulateBestEndlessRun(meta);
    if (!result) return null;
    setMeta(prev => {
      const next = useEndlessSkip(prev, dateKey, result.souls);
      saveMeta(next);
      return next;
    });
    return result;
  };

  // ============================================
  // 1.74.0~ 레이드 핸들러 (본편과 분리된 성장 축)
  // ============================================
  // 해금: 튜토리얼 4 클리어 (수련의 길과 동일 시점)
  const raidUnlocked = isUnlocked(meta, 'tutorial_curse_clear');

  // 1.76.0~ 전리품 = { items, stones, essence }
  const handleRaidVictory = (dungeon, loot) => {
    setMeta(prev => {
      let next = addRaidDrops(prev, loot?.items || []);
      next = addRaidResources(next, { stones: loot?.stones || 0, essence: loot?.essence || 0 });
      if (loot?.secret) next = resolveRaidSecret(next, loot.secret, !!loot.secretSwap); // 1.78.0 기연 (이력+유지/변경)
      next = recordRaidClear(next, dungeon.id);
      // 1.75.0~ 주간 첫 클리어 보상: 심연석 + (심연 레이드는 유니크 이상 확정 장비 1개)
      const weekly = claimRaidWeekly(next, dungeon.id, getKstWeekKey(), dungeon.weeklyStones || 0);
      next = weekly.meta;
      if (weekly.granted && dungeon.kind === 'raid') {
        next = addRaidDrops(next, [rollRaidDropHighTier(dungeon)]);
      }
      saveMeta(next);
      return next;
    });
    // 1.78.0 반복 모드 — 같은 던전 자동 재입장 (clears 증가로 battle key가 바뀌어 리마운트)
    if (raidRepeat) return;
    setRaidDungeon(null);
    // 1.80.0~ 백그라운드 진행 중이면 현재 화면 유지 (싱글모드 방해 금지)
    if (screen === 'raidBattle') setScreen('raid');
  };

  // 1.76.0~ 제작 (정수+심연석 → 에픽·레전더리 확정, 부위·직업 랜덤 — PM 제안) — 결과 반환
  const handleRaidCraft = (recipeId) => {
    const recipe = RAID_CRAFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return null;
    const raidNow = meta?.raid || {};
    if ((raidNow.stones || 0) < recipe.stones || (raidNow.essence || 0) < recipe.essence) return null;
    const item = rollCraftedRaidItem(recipe.rarity);
    setMeta(prev => {
      const next = spendRaidResourcesForItem(prev, { stones: recipe.stones, essence: recipe.essence }, item);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
    return item;
  };

  // 1.76.0~ 심연석 가챠 (등급 급감 커브, 시리즈 랜덤) — 결과 반환
  const handleRaidGacha = () => {
    const raidNow = meta?.raid || {};
    if ((raidNow.stones || 0) < RAID_GACHA.cost) return null;
    const item = rollGachaRaidItem();
    setMeta(prev => {
      const next = spendRaidResourcesForItem(prev, { stones: RAID_GACHA.cost }, item);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
    return item;
  };

  // 1.75.0~ 분해 (개별 / 하위 일괄) + 강화
  const handleRaidDismantle = (itemId, rarity) => {
    setMeta(prev => {
      const next = dismantleRaidItem(prev, itemId, RAID_DISMANTLE_VALUES[rarity] || 0);
      saveMeta(next);
      return next;
    });
  };

  const handleRaidDismantleJunk = () => {
    setMeta(prev => {
      const { meta: next } = dismantleRaidJunk(prev, (item) => RAID_DISMANTLE_VALUES[item.rarity] || 0);
      saveMeta(next);
      return next;
    });
  };

  const handleRaidEnhance = (classId, slot) => {
    setMeta(prev => {
      const item = prev?.raid?.equipped?.[classId]?.[slot];
      if (!item) return prev;
      const cost = RAID_ENHANCE.costFor(item.enh || 0);
      const next = enhanceRaidItem(prev, classId, slot, cost, RAID_ENHANCE.max);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
  };

  // 중도 전멸·후퇴 — 클리어 기록 없이 돌파한 방의 전리품(심연석 등)만 보존
  const handleRaidPartial = (loot) => {
    setMeta(prev => {
      let next = addRaidDrops(prev, loot?.items || []);
      next = addRaidResources(next, { stones: loot?.stones || 0, essence: loot?.essence || 0 });
      if (loot?.secret) next = resolveRaidSecret(next, loot.secret, !!loot.secretSwap); // 1.78.0 기연
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
    setRaidRepeat(false);
    setRaidDungeon(null);
    // 1.80.0~ 백그라운드 진행 중이면 현재 화면 유지 (싱글모드 방해 금지)
    if (screen === 'raidBattle') setScreen('raid');
  };

  const handleRaidEquip = (itemId) => {
    setMeta(prev => {
      const next = equipRaidItem(prev, itemId);
      saveMeta(next);
      return next;
    });
  };

  const handleRaidAutoEquip = () => {
    setMeta(prev => {
      const next = autoEquipRaidBest(prev);
      saveMeta(next);
      return next;
    });
  };

  // 1.79.0~ 전후방 배치 토글
  const handleRaidFormation = (classId) => {
    setMeta(prev => {
      const next = toggleRaidFormation(prev, classId);
      saveMeta(next);
      return next;
    });
  };

  // ============================================
  // 1.72.0~ 자동 사냥 드라이버 (App 레벨 화면 자동 진행)
  // ============================================
  // 전투(CombatScreen)·사건(EventScreen)·상점(ShopScreen 자동 구매)은
  // 각 컴포넌트 내부 autoPlay가 처리. 여기서는 맵 노드 선택 / 승리·보상 /
  // 챕터 클리어 / 대장간 스킵 / 정비 자동 휴식 / 준비 자동 확정을 담당.
  // 1.80.0~ 전 원정 허용 (PM 결정: 미클리어 던전 포함 — 튜토리얼·클래식·챌린지·챔피언십·무한 전부)
  const autoHuntAllowed = !!currentExpedition;
  useEffect(() => {
    if (!autoHunt) return;
    // 원정 종료·이탈·비허용 모드 → 자동 해제 (전멸 시 반복도 해제 — 레이드와 동일 규칙)
    if (!autoHuntAllowed || screen === 'defeat' || screen === 'title') {
      setAutoHunt(false);
      if (screen === 'defeat') setRunRepeat(false);
      return;
    }
    let t = null;
    // 1.80.0~ 배속 반영 (최소 60ms — 상태 반영 여유)
    const later = (fn, ms) => { t = setTimeout(fn, Math.max(60, Math.round(ms / autoSpeed))); };
    if (screen === 'map' && mapData) {
      const candidates = mapData.nodes.filter(n => n.current && !n.locked);
      if (candidates.length > 0) {
        const hpRatio = maxHp > 0 ? hp / maxHp : 1;
        // 노드 우선순위: 저체력이면 정비 최우선. 평시엔 강적(영혼 3) > 전투 > 보스 순
        const prio = (n) => {
          if (n.type === 'rest') return hpRatio < 0.45 ? 100 : 30;
          if (n.type === 'elite') return 80;
          if (n.type === 'battle') return 70;
          if (n.type === 'boss') return 60;
          if (n.type === 'unknown') return 50;
          if (n.type === 'event') return 40;
          if (n.type === 'prep') return 35;
          if (n.type === 'shop') return 20;
          if (n.type === 'forge') return 10;
          return 0;
        };
        const target = [...candidates].sort((a, b) => prio(b) - prio(a))[0];
        later(() => handleEnterNode(target), 700);
      }
    } else if (screen === 'victory') {
      later(handleVictoryContinue, 900);
    } else if (screen === 'reward' && currentRewards && currentRewards.length > 0) {
      const hpRatio = maxHp > 0 ? hp / maxHp : 1;
      const classId = classData?.id;
      // 1.72.1~ 직업 맞춤 보상 우선순위:
      // 저체력 회복 > 궁극 진화 > 직업 전용 패시브(classOnly) >
      // 보유 패시브 강화(Lv 높은 순 — 7Lv 궁극 진화 가속) > 직업 주력 스탯 >
      // 새 패시브 > 유물 > 첫 번째
      const pick =
        (hpRatio < 0.5 && currentRewards.find(r => r.type === 'heal' || r.type === 'heal_full')) ||
        currentRewards.find(r => r.type === 'ultimate') ||
        currentRewards.find(r => r.type === 'skill' && PASSIVE_SKILLS[r.name]?.classOnly === classId) ||
        currentRewards
          .filter(r => r.type === 'skill' && (skills[r.name] || 0) > 0)
          .sort((a, b) => (skills[b.name] || 0) - (skills[a.name] || 0))[0] ||
        currentRewards.find(r => r.type === 'stat' && r.name === AUTO_STAT_PREF[classId]) ||
        currentRewards.find(r => r.type === 'skill') ||
        // 1.73.0~ 유물도 직업 선호 점수순 (물공 직업=물리 유물 / 마공 직업=마공 유물)
        currentRewards
          .filter(r => r.type === 'relic')
          .sort((a, b) => scoreRelicForClass(b, classId) - scoreRelicForClass(a, classId))[0] ||
        currentRewards[0];
      later(() => handlePickReward(pick), 900);
    } else if (screen === 'expeditionClear') {
      // 1.81.0~ 던전 반복 — 클리어 정산 후 같은 원정 자동 재출정. 반복 OFF면 자동 해제
      if (runRepeat && runRestartRef.current) {
        later(() => { const restart = runRestartRef.current; handleExpeditionClearContinue(); restart(); }, 1800);
      } else {
        setAutoHunt(false);
      }
    } else if (screen === 'chapterClear') {
      later(handleChapterContinue, 1200);
    } else if (screen === 'forge') {
      later(handleForgeLeave, 700);
    } else if (screen === 'rest') {
      // RestScreen 휴식 선택지와 동일 (최대 HP 20% 회복)
      later(() => handleRestChoice({ type: 'heal', value: Math.floor(maxHp * 0.2) }), 800);
    } else if (screen === 'prep' || screen === 'reselect') {
      // PrepScreen과 동일 규칙으로 자동 선택 (제한 개수 우회 금지):
      // 기존 활성 선택 유지 → 부족분은 레벨 높은 패시브 순으로 채움
      const owned = Object.entries(skills).filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n]).map(([n]) => n);
      const maxSk = PREP_CONFIG.maxSkillSelect;
      let selSkills;
      if (owned.length <= maxSk) {
        selSkills = owned;
      } else {
        const prevSk = (activeSkills || []).filter(n => owned.includes(n));
        const restSk = owned.filter(n => !prevSk.includes(n)).sort((a, b) => (skills[b] || 0) - (skills[a] || 0));
        selSkills = [...prevSk, ...restSk].slice(0, maxSk);
      }
      const maxRel = currentExpedition?.maxRelicSelect || 1;
      const relNames = relics.map(r => r.name);
      let selRelics;
      if (relNames.length <= maxRel) {
        selRelics = relNames;
      } else {
        const prevRel = (activeRelicNames || []).filter(n => relNames.includes(n));
        const restRel = relNames.filter(n => !prevRel.includes(n));
        selRelics = [...prevRel, ...restRel].slice(0, maxRel);
      }
      if (screen === 'prep') later(() => handlePrepConfirm(selSkills, selRelics), 800);
      else later(() => handleReselectConfirm(selSkills, selRelics), 800);
    }
    return () => { if (t) clearTimeout(t); };
  }, [screen, autoHunt, autoHuntAllowed, mapData, currentRewards, hp, maxHp, runRepeat]);

  return (
    <ResponsiveLayout sidebar={
      <PCSidebar 
        screen={screen}
        meta={meta}
        hp={hp}
        maxHp={maxHp}
        gold={gold}
        gem={gem}
        relics={relics}
        skills={skills}
        ultimates={ultimates}
        chapter={chapter}
        chapterIdx={chapterIdx}
        expedition={currentExpedition}
        classData={classData}
        curses={currentCurses}
      />
    }>
      <PhoneFrame screenKey={screen} persistent={
        <>
          {/* 1.80.0~ 레이드 백그라운드 진행 — raidDungeon이 있으면 화면을 떠나도 마운트 유지 (전투·반복 파밍 계속) */}
          {raidDungeon && (
            <div style={{ display: screen === 'raidBattle' ? 'contents' : 'none' }}>
              <RaidBattleScreen key={raidDungeon.id + '-' + (meta?.raid?.clears?.[raidDungeon.id] || 0)} meta={meta} dungeon={raidDungeon} repeat={raidRepeat} background={screen !== 'raidBattle'} onToggleRepeat={() => setRaidRepeat(v => !v)} onMinimize={() => setScreen('raid')} onStatus={setRaidBgStatus} onVictory={handleRaidVictory} onDefeat={handleRaidPartial} onRetreat={handleRaidPartial} />
            </div>
          )}
          {/* 1.80.0~ 레이드 백그라운드 플로팅 필 — 탭 시 전투 화면 복귀 */}
          {raidDungeon && screen !== 'raidBattle' && (
            <button onClick={() => setScreen('raidBattle')} className="ui-press" style={{
              position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 80,
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999,
              background: 'rgba(15,10,12,0.92)', border: `1px solid ${PALETTE.legendary}88`,
              color: PALETTE.legendary, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
            }}>
              ⚔ {raidDungeon.name} — {raidBgStatus === 'defeat' ? '전멸 · 탭하여 전리품 확인' : raidBgStatus === 'choice' ? '✦ 기연 선택 대기' : raidBgStatus === 'victory' ? '클리어 · 탭하여 확인' : raidRepeat ? '⟳ 반복 파밍 중' : '자동 진행 중'}
            </button>
          )}
          {/* 1.81.0~ 자동 사냥 대기화면 — 진행은 밑에서 계속, 위에는 차분한 상태창만 */}
          {autoHunt && autoHuntAllowed && !autoOverlayHidden && screen !== 'raidBattle' && (
            <AutoHuntOverlay
              classData={classData} hp={hp} maxHp={maxHp} stats={{ ...classData?.stats, ...stats }}
              skills={skills} activeSkills={activeSkills} relics={relics} activeRelicNames={activeRelicNames} ultimates={ultimates}
              gold={gold} gem={gem} runSouls={runSouls}
              expedition={currentExpedition} chapter={chapter} screen={screen} runStats={runStats}
              autoSpeed={autoSpeed} onCycleSpeed={cycleAutoSpeed}
              runRepeat={runRepeat} onToggleRepeat={currentExpedition?.endless ? null : () => setRunRepeat(v => !v)}
              onWatch={() => setAutoOverlayHidden(true)} onStop={() => setAutoHunt(false)}
            />
          )}
          {/* 관전 중 대기화면 복귀 필 */}
          {autoHunt && autoHuntAllowed && autoOverlayHidden && screen !== 'raidBattle' && (
            <button onClick={() => setAutoOverlayHidden(false)} className="ui-press" style={{
              position: 'absolute', top: 6, right: 8, zIndex: 75,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(15,10,12,0.92)', border: `1px solid ${PALETTE.ice}88`,
              color: PALETTE.ice, fontSize: 10, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
            }}>▣ 대기화면</button>
          )}
        </>
      }>
            {screen === 'title' && !authMode && <LoginScreen
              onSelectLocal={handleSelectLocal} 
              onSelectGuest={handleSelectGuest} 
              onSelectGoogle={handleSelectGoogle} 
            />}
            {screen === 'title' && authMode && <TitleScreen meta={meta} onStart={() => setScreen('expeditionSelect')} onResume={resumeActiveRun} onAltar={enterAltar} onEngravings={() => setScreen('engraving')} onRaid={raidUnlocked ? () => setScreen('raid') : null} onAchievements={() => { setPrevAchievementsBack('title'); setScreen('achievements'); }} onChangelog={() => setShowChangelog({ firstSeen: false })} onAccount={() => setScreen('account')} />}
            {screen === 'raid' && <RaidScreen meta={meta} onEnterDungeon={(d) => { if (raidDungeon) { setScreen('raidBattle'); return; } setRaidDungeon(d); setScreen('raidBattle'); }} onEquipItem={handleRaidEquip} onAutoEquip={handleRaidAutoEquip} onDismantle={handleRaidDismantle} onDismantleJunk={handleRaidDismantleJunk} onEnhance={handleRaidEnhance} onCraft={handleRaidCraft} onGacha={handleRaidGacha} onToggleFormation={handleRaidFormation} onBack={() => setScreen('title')} />}
            {screen === 'account' && <AccountScreen 
              authMode={authMode} 
              firebaseUser={firebaseUser} 
              meta={meta} 
              onLogout={handleLogout} 
              onLinkGoogle={handleLinkGoogle} 
              onClose={() => setScreen('title')} 
            />}
            {screen === 'classSelect' && <ClassSelect meta={meta} selected={selectedClass} onSelect={setSelectedClass} onNext={() => setScreen('start')} onBack={() => { 
              // 챔피언십 흐름이면 difficulty로, 일반은 expedition으로
              if (selectedChampionship) setScreen('championshipDifficulty');
              else setScreen('expeditionSelect'); 
            }} isChampionship={!!selectedChampionship} />}
            {screen === 'expeditionSelect' && <ExpeditionSelect meta={meta} 
              onSelect={(exp) => { 
                setSelectedExpedition(exp); 
                // 튜토리얼/수련: 직업 강제. 직업 선택 화면 건너뛰고 바로 시작
                if (typeof exp.forcedClassId === 'number') {
                  setSelectedClass(exp.forcedClassId);
                  setScreen('start');
                } else {
                  // 일반 원정: 직업 선택 (현재는 없음, 미래 대비)
                  setScreen('classSelect');
                }
              }} 
              onSelectChampionship={(champ) => { setSelectedChampionship(champ); setScreen('championshipDifficulty'); }}
              onEndlessSkip={handleEndlessSkip}
              onBack={() => setScreen('title')} />}
            {screen === 'championshipDifficulty' && selectedChampionship && <ChampionshipDifficultySelect 
              championship={selectedChampionship} meta={meta}
              onSelect={(diff) => { 
                setSelectedDifficulty(diff); 
                // 챔피언십은 직업 선택 필요 (해금된 직업만)
                setScreen('classSelect');
              }}
              onBack={() => { setSelectedChampionship(null); setScreen('expeditionSelect'); }} />}
            {screen === 'start' && <StartScreen classData={classData} onContinue={() => { 
              if (selectedChampionship && selectedDifficulty) startChampionship(selectedChampionship, selectedDifficulty);
              else if (selectedExpedition) startExpedition(selectedExpedition);
            }} />}
            {screen === 'altar' && <SoulAltar meta={meta} slots={altarSlots} onPurchase={purchaseUpgrade} onReroll={rerollAltar} onBack={() => setScreen('title')} />}
            {screen === 'engraving' && <EngravingScreen meta={meta} onMetaUpdate={setMeta} onBack={() => setScreen('title')} />}
            {screen === 'achievements' && <AchievementScreen meta={meta} onClaim={handleClaimAchievement} onClose={() => setScreen(prevAchievementsBack)} />}
            {screen === 'map' && chapter && mapData && <MapView chapter={chapter} classData={classData} mapData={mapData} hp={hp} maxHp={maxHp} gold={gold} gem={gem} relics={relics} activeRelicNames={activeRelicNames} expedition={currentExpedition} curses={currentCurses} chapterIdx={chapterIdx} autoHunt={autoHunt} autoHuntAllowed={autoHuntAllowed} onToggleAutoHunt={toggleAutoHunt} autoSpeed={autoSpeed} onCycleAutoSpeed={cycleAutoSpeed} onEnterNode={handleEnterNode} onOpenStatus={() => setScreen('status')} onOpenAchievements={() => { setPrevAchievementsBack('map'); setScreen('achievements'); }} onOpenCodex={() => setScreen('codex')} onBack={() => setScreen('title')} />}
            {screen === 'codex' && <CodexScreen meta={meta} onBack={() => setScreen('map')} />}
            {screen === 'bossIntro' && currentEnemy && <BossIntroScreen enemyKey={currentEnemy} onComplete={() => setScreen('combat')} />}
            {screen === 'combat' && currentEnemy && <CombatScreen key={`${activeNodeId}-${currentEnemy}`} classData={classData} initialPlayer={{ hp, maxHp, ...classData.stats, ...stats }} initialSkills={skills} initialUltimates={ultimates} initialRelics={relics} activeSkills={activeSkills} activeRelicNames={activeRelicNames} enemyKey={currentEnemy} isBoss={isBossReward} expedition={currentExpedition} curses={currentCurses} meta={meta} engravingFx={getCombinedClassFx(meta, classData?.id)} chapterGimmick={chapter?.gimmick || null} autoPlay={autoHunt} autoSpeed={autoSpeed} onCycleAutoSpeed={cycleAutoSpeed} onToggleAuto={toggleAutoHunt} onVictory={handleVictory} onDefeat={handleDefeat} />}
            {screen === 'reward' && <RewardSelect rewards={currentRewards} gem={gem} skills={skills} relics={relics} ultimates={ultimates} onPick={handlePickReward} onReroll={handleReroll} hasRerolled={hasRerolled} isElite={isEliteReward} classId={classData?.id} meta={meta} expedition={currentExpedition} />}
            {screen === 'victory' && <VictoryScreen classData={classData} enemy={currentEnemy ? ENEMIES[currentEnemy] : null} gains={victoryGains} stats={victoryStats} onContinue={handleVictoryContinue} />}
            {screen === 'event' && currentEvent && <EventScreen event={currentEvent} classData={classData} stats={{ ...classData.stats, ...stats }} skills={skills} gold={gold} gem={gem} autoPlay={autoHunt} autoSpeed={autoSpeed} onResolve={handleEventResolve} />}
            {screen === 'rest' && <RestScreen classData={classData} hp={hp} maxHp={maxHp} skills={skills} stats={{ ...classData?.stats, ...stats }} activeSkills={activeSkills} activeRelicNames={activeRelicNames} relics={relics} ultimates={ultimates} engravingFx={getCombinedClassFx(meta, classData?.id)} meta={meta} expedition={currentExpedition} onChoice={handleRestChoice} />}
            {screen === 'prep' && <PrepScreen classData={classData} skills={skills} stats={{ ...classData?.stats, ...stats }} relics={relics} ultimates={ultimates} engravingFx={getCombinedClassFx(meta, classData?.id)} meta={meta} expedition={currentExpedition} mode="full" onConfirm={handlePrepConfirm} />}
            {screen === 'reselect' && <PrepScreen classData={classData} skills={skills} stats={{ ...classData?.stats, ...stats }} relics={relics} ultimates={ultimates} engravingFx={getCombinedClassFx(meta, classData?.id)} meta={meta} expedition={currentExpedition} mode={reselectMode} currentActiveSkills={activeSkills} currentActiveRelicNames={activeRelicNames} onConfirm={handleReselectConfirm} />}
            {screen === 'shop' && <ShopScreen gold={gold} skills={skills} relics={relics} ultimates={ultimates} curses={currentCurses} autoPlay={autoHunt} autoSpeed={autoSpeed} onBuy={handleShopBuy} onLeave={handleShopLeave} classId={classData?.id} />}
            {screen === 'forge' && <ForgeScreen relics={relics} skills={skills} activeRelicNames={activeRelicNames} meta={meta} onCombine={handleForgeCombine} onLeave={handleForgeLeave} />}
            {screen === 'chapterClear' && chapter && <ChapterClearScreen chapter={chapter} isLastChapter={false} hp={hp} maxHp={maxHp} meta={meta} curses={currentCurses} onContinue={handleChapterContinue} />}
            {screen === 'expeditionClear' && currentExpedition && <ExpeditionClearScreen expedition={currentExpedition} soulsGained={runSouls} firstClear={runFirstChampClear} runStats={runStats} onContinue={handleExpeditionClearContinue} />}
            {screen === 'defeat' && <DefeatScreen classData={classData} chapter={chapter} soulsGained={runSouls} onContinue={handleDefeatContinue} />}
            {screen === 'status' && (() => {
              const _baseStats = { ...classData.stats, ...stats };
              const _displayStats = computeDisplayPlayerStats(classData, skills, _baseStats, ultimates, activeSkills);
              const _relicStat = {
                dodge: getActiveRelicStat(relics, activeRelicNames, 'dodge'),
                critRate: getActiveRelicStat(relics, activeRelicNames, 'critRate'),
                critDmg: getActiveRelicStat(relics, activeRelicNames, 'critDmg'),
                magicDmg: getActiveRelicStat(relics, activeRelicNames, 'magicDmg'),
                lifesteal: getActiveRelicStat(relics, activeRelicNames, 'lifesteal'),
                reflect: getActiveRelicStat(relics, activeRelicNames, 'reflect'),
                heal: getActiveRelicStat(relics, activeRelicNames, 'heal'),
                dmgDealt: getActiveRelicStat(relics, activeRelicNames, 'dmgDealt'),
                dmgTaken: getActiveRelicStat(relics, activeRelicNames, 'dmgTaken'),
              };
              const _engFx = getCombinedClassFx(meta, classData?.id);
              const _derivedStats = computeDerivedStats(skills, ultimates, activeSkills, _relicStat, _engFx);
              return (
                <StatusPanel classData={classData} hp={hp} maxHp={maxHp} skills={skills}
                  stats={_displayStats} derivedStats={_derivedStats}
                  relics={relics} ultimates={ultimates} activeSkills={activeSkills}
                  activeRelicNames={activeRelicNames}
                  relicStat={_relicStat} meta={meta} curses={currentCurses} engravingFx={_engFx}
                  onClose={() => setScreen('map')} />
              );
            })()}
            {/* 노드 진입 설명 모달 (튜토리얼 챕터에서만) */}
            {pendingNode && (
              <NodeInfoModal
                nodeType={pendingNode.modalType}
                override={pendingNode.modalOverride}
                onConfirm={() => {
                  const { node, resolvedType } = pendingNode;
                  setPendingNode(null);
                  proceedEnterNode(node, resolvedType);
                }}
              />
            )}
            {/* 업데이트 로그 모달 (전역) */}
            {showChangelog && <ChangelogModal firstSeen={showChangelog.firstSeen} onClose={() => {
              // 첫 표시 시 마지막 본 버전 기록
              if (showChangelog.firstSeen) {
                setMeta(prev => setLastSeenVersion(prev, LATEST_VERSION));
              }
              setShowChangelog(null);
            }} />}
            {/* 1.25.0 마이그레이션 안내 모달 — meta_startSkillLv → 각인 시스템 이관 (영혼 100% 환불) */}
            {!showChangelog && meta?.engravingMigrationNotice && (
              <EngravingMigrationModal
                notice={meta.engravingMigrationNotice}
                onClose={() => {
                  setMeta(prev => {
                    const next = clearEngravingMigrationNotice(prev);
                    saveMeta(next);
                    return next;
                  });
                }}
              />
            )}
            {/* 1.26.0 각성도 조건 신설 안내 모달 (engraving 모달이 닫힌 다음 표시) */}
            {!showChangelog && !meta?.engravingMigrationNotice && meta?.awakeningConditionNotice && (
              <AwakeningConditionNoticeModal
                onClose={() => {
                  setMeta(prev => {
                    const next = clearAwakeningConditionNotice(prev);
                    saveMeta(next);
                    return next;
                  });
                }}
              />
            )}
            {/* 1.35.0 wanderer 코드명 변경 안내 모달 (앞선 두 모달 닫힌 다음 표시) */}
            {!showChangelog && !meta?.engravingMigrationNotice && !meta?.awakeningConditionNotice && meta?.wandererRenameNotice && (
              <WandererRenameNoticeModal
                notice={meta.wandererRenameNotice}
                onClose={() => {
                  setMeta(prev => {
                    const next = clearWandererRenameNotice(prev);
                    saveMeta(next);
                    return next;
                  });
                }}
              />
            )}
            {/* 1.44.2 영혼의 제단 재설계 안내 모달 (앞선 모달 모두 닫힌 다음 표시) */}
            {!showChangelog && !meta?.engravingMigrationNotice && !meta?.awakeningConditionNotice && !meta?.wandererRenameNotice && meta?.altarRedesignNotice && (
              <SoulAltarRedesignModal
                notice={meta.altarRedesignNotice}
                onClose={() => {
                  setMeta(prev => {
                    const next = clearAltarRedesignNotice(prev);
                    saveMeta(next);
                    return next;
                  });
                }}
              />
            )}
          </PhoneFrame>
    </ResponsiveLayout>
  );
}
