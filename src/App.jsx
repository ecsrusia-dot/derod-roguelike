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
  getClassBeltSlots,
  getBeltExpansionCount,
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
import AutoHuntOverlay, { AutoHuntSummaryModal } from './components/AutoHuntOverlay.jsx';
import AutoStatsScreen from './components/AutoStatsScreen.jsx';
import GambleLobbyScreen, { GambleChoiceScreen } from './components/GambleScreen.jsx';
import HofScreen from './components/HofScreen.jsx';
import HofBattleScreen from './components/HofBattleScreen.jsx';
import BuriedScreen from './components/buried/BuriedScreen.jsx';
import BuriedDungeonScreen from './components/buried/BuriedDungeonScreen.jsx';
import BuriedBattleScreen from './components/buried/BuriedBattleScreen.jsx';
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
  GAMBLE_CONFIG,
  buildGambleExpedition,
  buildMastersChapter,
  buildMastersExpedition,
  MASTERS_DUALS,
  MASTERS_TRIPLES,
  CLASS_TITLES,
  rollTitleDrop,
  RAID_DIFFICULTIES,
  getRaidClearKey,
  applyRaidDifficulty,
  ENGRAVINGS,
  POTIONS,
  FEATURE_FLAGS,
  AUTO_SPEED_SKIP,
  createBuriedChar,
  grantBuriedExp,
  advanceBuriedFloor,
  buriedDeathSettlement,
  addBuriedItemToChar,
  stepBuriedChar,
  getBuriedDungeon,
  getBuriedClass,
  BURIED_DUNGEONS,
  BURIED_FORGE,
  craftBuriedItem,
  hasBuriedUnique,
  maybeBuriedFloorSkillUp,
  rollBuriedContract,
  getBuriedContract,
  BURIED_CONTRACT_COST,
  raiseBuriedSkill,
  buriedEquippedSkills,
  BURIED_SKILL_MAX_LV,
  aggregateBuriedParts,
  BURIED_PART_SLOT_COSTS,
  BURIED_SHARD_DROP,
  BURIED_CALAMITY_REWARD,
  getBuriedPart,
  buriedEarnedDepthTraits,
  checkBuriedDepthClassUnlock,
} from './data.js';
import { getKstDateKey } from './utils/dailyChallenge.js';
import { simulateBestEndlessRun } from './utils/endlessSkipSim.js';
import { loadMeta, saveMeta, addSouls, applyUpgrade, applyUnlock, recordExpeditionClear, needsAltarRefresh, getNextRefreshTime, checkAndResetDaily, claimAchievement, getAchievementState, incrementAchievement, setAchievementProgress, completeAchievement, recordChampionshipClear, hasChampionshipClear, isChampionshipDifficultyUnlocked, unlockChampionshipRelic, setLastSeenVersion, getAuthMode, setAuthMode, getDefaultMeta, clearLocalMeta, recordCodex, recordDailyClear, hasDailyCleared, saveActiveRun, clearActiveRun, clearEngravingMigrationNotice, recordChampionshipClearByClass, recordUltimatePickByClass, clearAwakeningConditionNotice, clearWandererRenameNotice, clearAltarRedesignNotice, applyEngravingSlot, trackDailyMission, getEndlessSkipUsed, useEndlessSkip, addRaidDrops, equipRaidItem, autoEquipRaidBest, recordRaidClear, dismantleRaidItem, dismantleRaidJunk, enhanceRaidItem, claimRaidWeekly, addRaidResources, spendRaidResourcesForItem, resolveRaidSecret, toggleRaidFormation, appendAutoRunLog, getGambleUsed, useGambleEntry, addTwilightCoins, addFateShards, redeemFateShards, buyGambleShopItem, addClassTitle, equipClassTitle, saveHofPatterns, hofLevelUpChar, recordHofClear, recordMastersClearByClass, updateBestRunTime, getBuried, saveBuriedChar, startBuriedChar, recordBuriedDeath, recordBuriedClear, addBuriedDust, craftBuriedForgeItem, trackBuriedKill, buyBuriedContract, addBuriedShards, buyBuriedPart, detachBuriedParts } from './storage.js';






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
// 1.91.0~ PM 지정 직업별 패시브 우선순위 (🔒 룰 동결 — PM 지시로만 변경)
//   1.91.2: 방랑검사 정밀 5순위 / 1.92.0: 술법사 추가
//   1.100.0~ 보상 픽 + 준비 화면 자동 재선택 양쪽에서 공용 사용
const CLASS_SKILL_PRIO = {
  wanderer: ['심안류', '심안', '회피', '재생', '정밀', '잔혹', '강타', '신앙', '가속'],
  sage: ['이프리트', '마력', '신앙', '정밀', '재생', '잔혹', '강타', '회피'],
};

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
  // 1.93.0~ 중간 보스 보상: 픽 후 챕터 클리어로 진행 / 무한 포기: 정산 화면 라벨 분기
  const [bossRewardPending, setBossRewardPending] = useState(false);
  const [runRetreat, setRunRetreat] = useState(false);
  // 1.98.0~ 명예의 전당 — 진행 중 스테이지
  const [hofStage, setHofStage] = useState(null);
  // 무덤의 유산 (1.103.0) — 진행 상태는 meta.buried.char가 단일 출처. 아래 둘은 전투 중에만 쓰는 임시값.
  const [buriedEnemy, setBuriedEnemy] = useState(null);
  const [buriedRoom, setBuriedRoom] = useState(null);
  const [buriedRoomFx, setBuriedRoomFx] = useState(null);
  const [buriedForgeNotice, setBuriedForgeNotice] = useState(null);
  const handleHofSavePatterns = (patterns) => {
    setMeta(prev => {
      const next = saveHofPatterns(prev, patterns);
      saveMeta(next);
      return next;
    });
  };
  const handleHofLevelUp = (charId, cost) => {
    setMeta(prev => {
      const next = hofLevelUpChar(prev, charId, cost);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
  };
  // ============================================
  // 무덤의 유산 (1.103.0) — BuriedBornes 모티브 별도 모드
  // ============================================
  // 캐릭터 스냅샷은 매 변경마다 meta.buried.char에 저장된다 (앱을 꺼도 그대로 이어진다).
  const updateBuriedChar = (char, dustGain = 0) => {
    setMeta(prev => {
      let next = saveBuriedChar(prev, char);
      if (dustGain) next = addBuriedDust(next, dustGain);
      saveMeta(next);
      return next;
    });
  };

  // 새 캐릭터 — 1.113.0: 유산은 빈 슬롯에 장착된 것만 소비, 나머지는 보관함에 남는다.
  // 1.114.0: startFloor — 100층 단위 체크포인트 재출발 (그 층 마물 레벨의 낡은 장비 6종 지급)
  const handleBuriedStart = (classId, dungeonId = 'labyrinth', contracts = [], startFloor = 1, raceId = null, keystones = [], originId = null) => {
    setBuriedForgeNotice(null); // 이전 캐릭터의 정산·해금 알림 제거 (1.117.0)
    setMeta(prev => {
      const b = getBuried(prev);
      const char = createBuriedChar(classId, { items: [], gold: b.legacyGold }, dungeonId, contracts, aggregateBuriedParts(b.parts), startFloor, buriedEarnedDepthTraits(b.deepestByDungeon), raceId, keystones, originId);
      if (!char) return prev;
      const next = startBuriedChar(prev, char);
      saveMeta(next);
      return next;
    });
    setScreen('buriedDungeon');
  };

  // 재련소 (1.105.0) — 먼지로 장비 제작. 캐릭터가 있으면 가방, 없으면 유산 보관함으로.
  // 1.117.0 — 랜덤 롤·알림은 updater 밖에서 (StrictMode 이중 실행 시 아이템이 두 번 굴려지는 버그 픽스)
  const handleBuriedForge = (slot, epic, classId) => {
    const b0 = getBuried(meta);
    const cost = epic ? BURIED_FORGE.epicCost : BURIED_FORGE.randomCost;
    if ((b0.dust || 0) < cost) { setBuriedForgeNotice('먼지가 부족하다.'); return; }
    if (!b0.char) { setBuriedForgeNotice('탐험 중인 캐릭터가 있어야 벼릴 수 있다.'); return; }
    const item = craftBuriedItem({ slot, classId, deepest: b0.deepest, epic, char: b0.char });
    if (!item) return;
    let notice = null;
    setMeta(prev => {
      const r = craftBuriedForgeItem(prev, item, cost);
      if (!r.ok) { notice = '먼지가 부족하다.'; return prev; }
      notice = r.raised ? `${item.name} 완성 — 같은 스킬이라 Lv.${r.lv}이 되었다.` : `${item.name} 완성 — [교체/버리기]를 판단하라.`;
      saveMeta(r.meta);
      return r.meta;
    });
    setTimeout(() => notice && setBuriedForgeNotice(notice), 0);
  };

  // 마의 계약 랜덤 구입 (1.111.0)
  const handleBuriedBuyContract = () => {
    const id = rollBuriedContract(getBuried(meta).contracts); // 롤은 updater 밖 (이중 실행 방지)
    if (!id) return;
    setMeta(prev => {
      const next = buyBuriedContract(prev, id, BURIED_CONTRACT_COST);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
    setBuriedForgeNotice(`📜 「${getBuriedContract(id)?.name}」 체결 — ${getBuriedContract(id)?.desc}`);
  };

  // 연구실 부품 (1.112.0) — ☠ 죽음의 조각으로 구입, 다음 캐릭터부터 적용.
  // 1.115.0 — 던전 전용 부품은 해당 던전 100층 도달 시에만 구매 가능
  const handleBuriedBuyPart = (partId) => {
    setMeta(prev => {
      const b = getBuried(prev);
      const def = getBuriedPart(partId);
      if (def?.dungeon && (b.deepestByDungeon?.[def.dungeon] || 0) < (def.needDeep || 100)) return prev;
      const next = buyBuriedPart(prev, partId, BURIED_PART_SLOT_COSTS);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
  };
  const handleBuriedDetachParts = () => {
    setMeta(prev => {
      const next = detachBuriedParts(prev, 50);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
  };

  const handleBuriedEnterBattle = (enemy, roomType, roomEffectId = null) => {
    setBuriedEnemy(enemy);
    setBuriedRoom(roomType);
    setBuriedRoomFx(roomEffectId);
    setScreen('buriedBattle');
  };

  // 정복 (1.113.0) — 층 무한화로 "클리어 귀환" 폐지. 정복 층(구 최종층) 보스를 잡으면
  // ①다음 던전 ②전직(미궁 한정) 해금 + 정복 횟수 기록만 하고 **런은 계속된다**.
  const recordBuriedConquest = (char) => {
    const dungeonId = char?.dungeonId || 'labyrinth';
    const idx = BURIED_DUNGEONS.findIndex(dg => dg.id === dungeonId);
    const nextDungeonId = idx >= 0 && idx + 1 < BURIED_DUNGEONS.length ? BURIED_DUNGEONS[idx + 1].id : null;
    const cls = getBuriedClass(char?.classId);
    const advanceClassId = dungeonId === 'labyrinth' ? (cls?.advance || null) : null;
    setMeta(prev => {
      const next = recordBuriedClear(prev, char, { dungeonId, nextDungeonId, advanceClassId });
      saveMeta(next);
      return next;
    });
    const dg = getBuriedDungeon(dungeonId);
    setBuriedForgeNotice(`👑 ${dg?.name} 정복!${nextDungeonId ? ` 다음 던전이 열렸다.` : ''}${advanceClassId ? ` 전직 「${getBuriedClass(advanceClassId)?.name}」 해금.` : ''} 무덤은 더 깊이 이어진다…`);
  };

  // 사망 — 1.117.0: 장비 계승 폐지. 장착 장비 전부 자동 분해 → 먼지 정산 + 골드 30% 계승
  const handleBuriedDeath = (char) => {
    const settle = buriedDeathSettlement(char);
    setMeta(prev => {
      const next = recordBuriedDeath(prev, settle);
      saveMeta(next);
      return next;
    });
    setBuriedForgeNotice(`⚰ 정산 — 장비 ${settle.itemCount}개 분해 🕯 +${settle.dust} · 골드는 무덤에 흩어졌다`);
    setBuriedEnemy(null); setBuriedRoom(null); setBuriedRoomFx(null);
    setScreen('buried');
  };

  const handleBuriedBattleFinish = (res) => {
    const char = meta?.buried?.char;
    if (!char) { setBuriedEnemy(null); setScreen('buried'); return; }
    // 1.109.0 — 조우 해금 추적 (마검사·흡혈귀·페어리). 승패 무관하게 처치 시점은 승리뿐이라 win일 때만
    if (res?.win && buriedEnemy?.key) {
      const peek = trackBuriedKill(meta, buriedEnemy.key); // 알림용 판정 (결정론 함수)
      if (peek.unlocked) setBuriedForgeNotice(`🔓 새 직업 해금 — ${getBuriedClass(peek.unlocked)?.name}! 로비에서 선택할 수 있다.`);
      setMeta(prev => {
        const r = trackBuriedKill(prev, buriedEnemy.key);
        saveMeta(r.meta);
        return r.meta;
      });
    }
    if (!res?.win) {
      if (res?.dustGain) setMeta(prev => { const next = addBuriedDust(prev, res.dustGain); saveMeta(next); return next; });
      handleBuriedDeath(char);
      return;
    }

    // 전리품 — addBuriedItemToChar가 스킬 레벨 상승·자동 장착을 함께 처리한다
    let c = {
      ...char,
      hp: res.hp,
      gold: (char.gold || 0) + (res.gold || 0),
      potions: res.potions ?? char.potions,
      kills: (char.kills || 0) + 1,
      pendingStatuses: null, // 1.107.0 — 이벤트 함정의 지연 상태이상은 1회 적용 후 소거
      carryBarrier: res.carryBarrier || 0, // [u6] 달인 — 남은 보호막을 다음 전투로
    };
    // [u36] 비전 — 처치마다 모든 공격력 +2 (런 영구)
    if (res.research) c = { ...c, researchPower: (c.researchPower || 0) + res.research };
    // 저주 「레라지에」 — 처치마다 최대 HP -1% (런 한정, 최대 -50%)
    if ((c.curses || []).includes('leraje')) c = { ...c, curseHpLossPct: Math.min(50, (c.curseHpLossPct || 0) + 1) };
    for (const it of (res.drops || [])) c = addBuriedItemToChar(c, it).char;
    // ᚱ 룬 획득 (1.123.0) — 주머니에 쌓고, 각인은 장비 화면에서
    if (res.rune) c = { ...c, runes: [...(c.runes || []), res.rune] };
    // [u100] 수확자의 서 — 처치 시 75% 확률 무작위 스킬 레벨 +1 (전투 화면이 판정, 여기서 적용)
    if (res.skillLvUp) {
      const ids = buriedEquippedSkills(c).map(x => x.skill.id)
        .filter(id => (c.skillLevels?.[id] || 1) < BURIED_SKILL_MAX_LV);
      if (ids.length > 0) c = raiseBuriedSkill(c, ids[Math.floor(Math.random() * ids.length)]).char;
    }
    const { char: leveled, levels } = grantBuriedExp(c, res.exp || 0);
    let grown = leveled;
    // [u85] 성장의 씨앗 — 레벨업마다 무작위 능력치 +2 추가
    if (levels.length > 0 && hasBuriedUnique(grown, 'u85')) {
      const keys = ['str', 'dex', 'int', 'vit'];
      for (let i = 0; i < levels.length; i++) {
        const k = keys[Math.floor(Math.random() * keys.length)];
        grown = { ...grown, stats: { ...grown.stats, [k]: (grown.stats[k] || 0) + 2 } };
      }
    }
    // 재앙 (1.112.0) — 층 이동 없이 같은 층으로 복귀. 조각·먼지 대량 보상, 게이지는 소환 수락 때 이미 0
    if (buriedRoom === 'calamity') {
      const dId = grown.dungeonId || 'labyrinth';
      const shardGain = BURIED_CALAMITY_REWARD.shards[dId] || 15;
      setBuriedEnemy(null); setBuriedRoom(null); setBuriedRoomFx(null);
      setMeta(prev => {
        let next = addBuriedShards(prev, shardGain);
        next = addBuriedDust(next, BURIED_CALAMITY_REWARD.dust + (res.dustGain || 0));
        saveMeta(next);
        return next;
      });
      setBuriedForgeNotice(`🌑 재앙 격퇴 — ☠ 죽음의 조각 +${shardGain} · 🕯 먼지 +${BURIED_CALAMITY_REWARD.dust}`);
      updateBuriedChar(grown, 0);
      setScreen('buriedDungeon');
      return;
    }
    // ☠ 죽음의 조각 (1.112.0) — 보스 처치 시 던전별 획득. 정복 층(구 최종층) 이상 보스는 2배
    const dgNow = getBuriedDungeon(char.dungeonId);
    const isDeepBoss = buriedRoom === 'boss' && (char.floor || 1) >= (dgNow?.floors || 10);
    // 1.120.0 — 층계 수문장(100층 단위): 조각 8배 + 격파 알림
    const isGuardian = buriedRoom === 'boss' && (char.floor || 1) % 100 === 0;
    const shardBase = buriedRoom === 'boss' ? (BURIED_SHARD_DROP[grown.dungeonId || 'labyrinth'] || 1) : 0;
    const shardGain = shardBase * (isGuardian ? 8 : isDeepBoss ? 2 : 1);
    if (isGuardian) setBuriedForgeNotice(`🚪 ${char.floor}층 수문장 격파 — 관문이 열렸다! ${char.floor}층 돌파 체크포인트에서 재출발할 수 있다.`);
    // 정복 판정 (1.113.0) — 정복 층 보스를 잡는 순간 해금·기록, 런은 계속
    const conquest = buriedRoom === 'boss' && (char.floor || 1) === (dgNow?.floors || 10);
    // 방을 하나 지났으므로 걸음수 +1 + [u102] 층 이동 스킬 레벨 판정
    const { char: blessed } = maybeBuriedFloorSkillUp(stepBuriedChar(grown));
    const { char: advanced } = advanceBuriedFloor(blessed);
    setBuriedEnemy(null); setBuriedRoom(null); setBuriedRoomFx(null);
    if (shardGain) setMeta(prev => { const next = addBuriedShards(prev, shardGain); saveMeta(next); return next; });
    if (conquest) recordBuriedConquest(advanced);
    // 심층 직업 해금 (1.116.0) — 100층 이상 보스 처치
    if (buriedRoom === 'boss' && (char.floor || 1) >= 100) {
      const peekCid = checkBuriedDepthClassUnlock(char.dungeonId || 'labyrinth', char.floor || 1, getBuried(meta).unlockedClasses);
      if (peekCid) setBuriedForgeNotice(`🔓 심층 직업 해금 — ${getBuriedClass(peekCid)?.name}! 로비에서 선택할 수 있다.`);
      setMeta(prev => {
        const b = getBuried(prev);
        const cid = checkBuriedDepthClassUnlock(char.dungeonId || 'labyrinth', char.floor || 1, b.unlockedClasses);
        if (!cid) return prev;
        const next = { ...prev, buried: { ...b, unlockedClasses: [...b.unlockedClasses, cid] } };
        saveMeta(next);
        return next;
      });
    }
    // [u109] 저주 포식자 — 전투 중 얻은 먼지 정산
    const dustGain = res.dustGain || 0;
    updateBuriedChar(advanced, dustGain);
    setScreen('buriedDungeon');
  };

  const handleHofFinish = (result) => {
    const stage = hofStage;
    setHofStage(null);
    if (result?.win && stage) {
      setMeta(prev => {
        const { meta: recorded, first } = recordHofClear(prev, stage.id, stage.firstMedals);
        let next = recorded;
        if (first) next = addSouls(next, stage.souls);
        saveMeta(next);
        return next;
      });
    }
    setScreen('hof');
  };

  // 1.96.0~ 황혼의 벨트 — 런 한정 포션. 1.97.0~ 직업별 슬롯 (기본/최대 = 검사 2/4 · 술법사 1/3 · 마족 0/1 · 정령사 1/3 · 사제 1/2)
  const [belt, setBelt] = useState([]);
  const beltSlots = getClassBeltSlots(meta, classData?.id);
  const handleConsumePotion = (idx) => setBelt(prev => prev.filter((_, i) => i !== idx));
  // 승리 화면에 표시할 획득 재화 (gold/gem/souls)
  const [victoryGains, setVictoryGains] = useState({ gold: 0, gem: 0, souls: 0 });
  // 1.81.0~ 정산 — 직전 전투 (출처별 데미지) + 이번 런 누적 (전투 수·총 데미지·획득 자원)
  const [victoryStats, setVictoryStats] = useState(null);
  const [runStats, setRunStats] = useState(null);
  // 1.81.0~ 일반 던전 반복 — 클리어 시 같은 원정 자동 재출정 (재출정 함수는 ref로 보존)
  const [runRepeat, setRunRepeat] = useState(false);
  const runRestartRef = useRef(null);
  // 1.100.1~ 자동 사냥 대기화면 전투 스테이터스 — CombatScreen이 발행하는 실시간 스냅샷
  const [combatLive, setCombatLive] = useState(null);
  // 1.100.0~ 런타임 집계 (×1 배속 기준 ms) — null이면 기록 무효 (이어하기 복귀 런)
  const runTimeRef = useRef(0);
  const [runClearTime, setRunClearTime] = useState(null); // { ms, best } — 클리어 화면 표시용
  // 1.90.0~ 런 조건 특수 업적용 카운터 (ref — 고배속 자동에서도 롤백 없음)
  const runKillsRef = useRef(0);                       // 몰살자: 한 런 처치 수
  const runEventsRef = useRef({ ok: 0, fail: 0 });     // 운명의 심판자: 사건 판정 성공/실패
  const initialSkillTotalRef = useRef(null);           // 공허한 승리: 시작 패시브 레벨 합 (null=판정 불가)
  // 업적 화면에서 뒤로갈 때 어디로 갈지 기억 (title 또는 map)
  const [prevAchievementsBack, setPrevAchievementsBack] = useState('title');
  // 업데이트 로그 모달 (firstSeen=true: 자동 표시 / false: 수동 클릭)
  const [showChangelog, setShowChangelog] = useState(null);  // null | { firstSeen: bool }
  // 노드 진입 설명 모달 (튜토리얼 챕터에서만 표시)
  const [pendingNode, setPendingNode] = useState(null);  // null | { node, resolvedType }
  // 1.72.0~ 자동 사냥 모드 — 노드 선택·스킬 선택·보상 선택 모두 자동
  // 허용 범위: 수련의 길(training) + 무한모드(endless)만. 사망/원정 클리어 시 자동 해제.
  const [autoHunt, setAutoHunt] = useState(false);
  // 1.80.0~ 자동 사냥 배속 (×1 / ×5 / ×10 / ×20)
  const [autoSpeed, setAutoSpeed] = useState(1);
  const cycleAutoSpeed = () => setAutoSpeed(s => (s === 1 ? 5 : s === 5 ? 10 : s === 10 ? 20 : 1));
  // 1.102.1~ ⏩ 던전 스킵 (PM 정정: 배속 단계가 아니라 별도 버튼) — 누르면 이번 런 전 과정을
  // 딜레이 0으로 즉시 진행하고 커버 화면으로 가린 뒤, 던전 결과(클리어/전멸)만 노출.
  // 동일 로직·동일 AI 룰을 빨리 감기만 함 — 결과 미리 계산·조작 없음. 런 결과가 나오면 이전 배속 복원.
  const [runSkip, setRunSkip] = useState(false);
  const preSkipSpeedRef = useRef(1);
  const startRunSkip = () => {
    if (!autoHunt || runSkip) return;
    preSkipSpeedRef.current = autoSpeed < AUTO_SPEED_SKIP ? autoSpeed : 1;
    setAutoSpeed(AUTO_SPEED_SKIP);
    setRunSkip(true);
    runTimeRef.current = null; // ×1 환산 불가 — 이번 런 베스트 기록 무효
  };
  const cancelRunSkip = () => {
    setRunSkip(false);
    setAutoSpeed(preSkipSpeedRef.current || 1);
  };
  // 런 결과 도달(클리어/전멸) 또는 자동 해제 시 스킵 종료 → 결과 화면이 그대로 보임
  useEffect(() => {
    if (!runSkip) return;
    if (screen === 'expeditionClear' || screen === 'defeat' || !autoHunt) cancelRunSkip();
  }, [runSkip, screen, autoHunt]); // eslint-disable-line react-hooks/exhaustive-deps
  // 1.100.0~ 런타임 누적 — 1초마다 (자동 사냥 배속이면 ×배속으로 환산해 ×1 기준 시간 유지)
  // 1.102.0~ ⏩스킵 모드는 ×1 환산 불가 → 런타임 기록 무효 (이어하기와 동일 취급, 베스트 오염 방지)
  // ⚠ 이 effect는 autoHunt·autoSpeed 선언 뒤에 있어야 함 (앞에 두면 deps 평가 시 TDZ 부팅 크래시 — 1.89.1 동일 유형)
  useEffect(() => {
    if (!metaLoaded || !currentExpedition) return;
    const iv = setInterval(() => {
      if (autoHunt && autoSpeed === AUTO_SPEED_SKIP) { runTimeRef.current = null; return; }
      if (runTimeRef.current != null) runTimeRef.current += 1000 * (autoHunt ? autoSpeed : 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [metaLoaded, currentExpedition, autoHunt, autoSpeed]);
  // 1.81.0~ 자동 사냥 대기화면 — 자동 켤 때마다 표시, [관전]으로 숨김 가능
  const [autoOverlayHidden, setAutoOverlayHidden] = useState(false);
  // 1.83.0~ 자동 사냥 세션 — 자동 ON~OFF 동안 런 수·클리어·전멸·합산 획득 추적
  const [autoSession, setAutoSession] = useState(null);
  // 자동 종료 시 세션 요약 모달 데이터 (null = 비표시)
  const [autoSummary, setAutoSummary] = useState(null);
  const toggleAutoHunt = () => setAutoHunt(v => {
    const next = !v;
    if (next) {
      setAutoOverlayHidden(false);
      setAutoSummary(null);
      setAutoSession({ runCount: 1, clears: 0, defeats: 0, battles: 0, totalDmg: 0, bySource: {}, gold: 0, gem: 0, souls: 0 });
    }
    return next;
  });
  // 자동 사냥 종료 감지 → 세션 요약 모달 (전투 1회 이상 했을 때만)
  useEffect(() => {
    if (autoHunt || !autoSession) return;
    if (autoSession.battles > 0 || autoSession.clears > 0) setAutoSummary(autoSession);
    setAutoSession(null);
  }, [autoHunt]);

  // 1.74.0~ 레이드 — 입장 중인 던전 (raidBattle 화면용)
  const [raidDungeon, setRaidDungeon] = useState(null);
  // 1.86.0~ 레이드 난이도 (RAID_DIFFICULTIES 객체 — null이면 일반)
  const [raidDifficulty, setRaidDifficulty] = useState(null);

  // ============================================
  // 1.88.0~ Wake Lock — 자동 진행 중 화면 자동 꺼짐 방지 (PM 요청)
  // ============================================
  // ⚠️ 1.89.1 픽스: 이 블록이 raidDungeon 선언보다 위에 있어 TDZ 크래시(부팅 화이트스크린) —
  //    반드시 autoHunt·raidDungeon 선언 아래에 위치해야 함
  // 자동 사냥 또는 레이드 전투가 살아있는 동안 navigator.wakeLock으로 화면 유지.
  // 웹앱(PWA) 한계: 홈 키로 다른 앱에 가면 OS가 JS 실행을 동결하므로
  // 백그라운드 "실시간" 진행은 원천 불가 — 화면 꺼짐 방지가 웹에서 가능한 최선.
  const wakeLockRef = useRef(null);
  useEffect(() => {
    const active = autoHunt || !!raidDungeon;
    if (!active || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) { lock.release(); return; }
        wakeLockRef.current = lock;
      } catch (e) {
        // 저전력 모드·브라우저 정책으로 거부될 수 있음 — 조용히 무시
      }
    };
    // 다른 앱에 다녀오면 wake lock이 자동 해제됨 → 복귀 시 재획득
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { wakeLockRef.current?.release?.(); } catch (e) { /* already released */ }
      wakeLockRef.current = null;
    };
  }, [autoHunt, raidDungeon]);
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
        // 1.99.4~ 진행도 급락 감지 시 선택 화면 (복구 안전망 — 구글 로그인과 동일)
        const localExisting = await loadMeta();
        const localMine = localExisting && (!localExisting.ownerUid || localExisting.ownerUid === user.uid) ? localExisting : null;
        if (shouldOfferRecovery(localMine, cloud)) {
          setAuthMode('guest');
          setAuthModeState('guest');
          setRecoveryChoice({ local: localMine, cloud, uid: user.uid });
          return;
        }
        // 같은 UID로 재로그인 — 클라우드 데이터 사용 (1.99.3~ 이전 계정 로컬 잔재도 즉시 폐기)
        safe = { ...getDefaultMeta(), ...cloud, ownerUid: user.uid };
        await clearLocalMeta();
      } else {
        // 새 게스트 — 로컬 데이터 무시하고 기본값 시작
        // (이전 모드의 데이터가 들어가는 것 방지)
        safe = { ...getDefaultMeta(), ownerUid: user.uid };
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
        // 1.99.4~ 로컬이 같은 계정(또는 표식 없음)이고 진행도가 크게 어긋나면 선택 화면 (복구 안전망)
        const localExisting = await loadMeta();
        const localMine = localExisting && (!localExisting.ownerUid || localExisting.ownerUid === user.uid) ? localExisting : null;
        if (shouldOfferRecovery(localMine, cloud)) {
          setAuthMode('google');
          setAuthModeState('google');
          setRecoveryChoice({ local: localMine, cloud, uid: user.uid });
          return;
        }
        // 기존 구글 계정 재로그인 — 클라우드 데이터 사용 (1.99.3~ 이전 계정 로컬 잔재도 즉시 폐기)
        safe = { ...getDefaultMeta(), ...cloud, ownerUid: user.uid };
        await clearLocalMeta();
      } else {
        // 새 구글 계정 — 로컬 데이터 무시하고 기본값 시작
        safe = { ...getDefaultMeta(), ownerUid: user.uid };
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
  // 1.99.3 픽스: signOut이 실패해도 로컬 클리어·모드 리셋은 반드시 수행 (finally)
  //   — 이전엔 signOut 오류 시 로컬에 이전 계정 데이터가 남아 다음 계정을 오염시킬 수 있었음
  const handleLogout = async () => {
    try {
      if (authMode !== 'local' && firebaseUser) {
        await signOut();
      }
    } catch (err) {
      console.error('[Logout] signOut failed (로컬 클리어는 계속 진행):', err);
    } finally {
      // 로컬 IndexedDB 클리어 — 다음 모드 선택 시 옛 데이터 안 보이도록
      await clearLocalMeta();
      // 모드 리셋
      setAuthMode(null);
      setAuthModeState(null);
      setFirebaseUser(null);
      setMetaLoaded(false);
      setMeta({ souls: 0, upgrades: {}, unlocks: [], clearedExpeditions: [] });
      setScreen('title');  // LoginScreen이 표시될 것
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

  // ============================================
  // 1.99.4~ 데이터 선택 복구 (PM 실사고 대응)
  // 로컬·클라우드 진행도가 크게 어긋나면 자동 병합(pickLatest) 대신 사용자에게 선택을 맡긴다.
  // 정상 플레이에선 로컬·클라우드가 거의 같아 절대 뜨지 않음 — 오염·복구 상황 전용 안전망.
  // ============================================
  const [recoveryChoice, setRecoveryChoice] = useState(null); // { local, cloud, uid }

  const progressScore = (m) => {
    if (!m) return 0;
    const awakenSum = Object.values(m.engravings || {}).reduce((s, e) => s + (e?.lv || 0), 0);
    return (m.totalKills || 0) + (m.totalRuns || 0) * 10 + (m.souls || 0) / 10 + awakenSum * 50;
  };

  // pickLatest가 고르려는 쪽의 진행도가 반대쪽의 70% 미만이면 → 오염 의심, 선택 화면
  const shouldOfferRecovery = (local, cloud) => {
    if (!local || !cloud) return false;
    const winner = pickLatest(local, cloud);
    const loser = winner === local ? cloud : local;
    const w = progressScore(winner);
    const l = progressScore(loser);
    return l > 100 && w < l * 0.7;
  };

  const resolveRecovery = async (pick) => {
    if (!recoveryChoice) return;
    const src = pick === 'local' ? recoveryChoice.local : recoveryChoice.cloud;
    const safe = { ...getDefaultMeta(), ...src, ownerUid: recoveryChoice.uid };
    const raidBackfill = backfillRaidSeries(safe.raid);
    if (raidBackfill.changed) safe.raid = raidBackfill.raid;
    setMeta(safe);
    setMetaLoaded(true);
    setRecoveryChoice(null);
    // 선택한 데이터를 양쪽(로컬+클라우드) 정본으로 즉시 확정
    saveMeta(safe);
    try { await saveCloudMeta(recoveryChoice.uid, safe); } catch (e) { console.warn('[Recovery] cloud save 지연:', e); }
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
            let local = await loadMeta();
            // 1.99.3 픽스: 로컬 데이터가 다른 계정 소유면 병합에서 제외 + 즉시 폐기
            //   (계정 전환 시 이전 계정의 로컬이 최신이라는 이유로 승리 → 현재 계정 클라우드를
            //    덮어쓰던 데이터 오염 사고 방지 — PM 실사고 보고)
            if (local?.ownerUid && local.ownerUid !== firebaseUser.uid) {
              local = null;
              await clearLocalMeta();
            }
            // 1.99.4~ 진행도가 크게 어긋나면 자동 병합 대신 사용자 선택 (복구 안전망)
            if (shouldOfferRecovery(local, cloud)) {
              setRecoveryChoice({ local, cloud, uid: firebaseUser.uid });
              return; // metaLoaded 유지 X — 선택 후 resolveRecovery가 마무리
            }
            const merged = pickLatest(local, cloud) || local || getDefaultMeta();
            const safe = { ...getDefaultMeta(), ...merged, ownerUid: firebaseUser.uid };
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
    // 1.85.0~ 도박장 런은 이어하기 스냅샷 제외 (판돈·잭팟 상태가 스냅샷에 없어 복원 불가)
    // 1.89.0~ 마스터즈도 제외 (합성 챕터·보스 체인이 스냅샷에 없어 복원 불가)
    if (currentExpedition.isGamble || currentExpedition.isMasters) return;
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
      belt,
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
    // 1.90.0~ 이어하기: 스냅샷 이전 기록을 모르므로 런 조건 업적 카운터는 보수적으로 리셋
    // (몰살자·심판자는 언더카운트만 발생, 공허한 승리는 null로 판정 자체 스킵 — 오지급 방지)
    runKillsRef.current = 0;
    runEventsRef.current = { ok: 0, fail: 0 };
    initialSkillTotalRef.current = null;
    // 1.100.0~ 이어하기 런은 런타임 기록 무효 (스냅샷 이전 시간 미상 — 베스트 오염 방지)
    runTimeRef.current = null;
    setRunClearTime(null);
    // 1.96.0~ 벨트 복원 (1.101.0~ 구 스냅샷의 에테르 물약 → 소울 물약 치환)
    setBelt((s.belt || []).map(pid => pid === 'ether' ? 'soul' : pid));
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
    // 1.81.0~ 런 정산 초기화 + 반복 재출정 정보 보존
    setRunStats(null);
    setVictoryStats(null);
    // 1.84.0 픽스: 함수 클로저 대신 인자만 저장 — 이전엔 오래된 startExpedition 클로저가
    // 재출정 시 그 시점 메타 스냅샷으로 setMeta 해 직전 런의 업적·영혼·처치 기록을 롤백시켰음
    runRestartRef.current = { kind: 'expedition', expedition };
    // 1.85.0~ 도박장: 입장권 소비 + 판돈·잭팟 초기화
    if (expedition.isGamble) {
      const gdk = getKstDateKey();
      setMeta(prev => completeAchievement(useGambleEntry(prev, gdk), 'gamble_first', 1));
      setGamblePot(0);
      setGambleJackpot(false);
    }

    // === 업적 트래킹: 원정 시도 === (1.84.0~ 함수형 — 오래된 클로저 메타 롤백 방지)
    setMeta(prev => {
      let m = { ...prev, totalRuns: (prev.totalRuns || 0) + 1 };
      m = setAchievementProgress(m, 'meta_runs_10', m.totalRuns, 10);
      m = setAchievementProgress(m, 'meta_runs_100', m.totalRuns, 100);
      return m;
    });
    
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
    // 1.81.0~ 런 정산 초기화 + 반복 재출정 정보 보존 (1.84.0 픽스 — 인자만 저장)
    setRunStats(null);
    setVictoryStats(null);
    runRestartRef.current = { kind: 'championship', championship, difficulty };

    // 업적 트래킹 (1.84.0~ 함수형 — 오래된 클로저 메타 롤백 방지)
    setMeta(prev => {
      let m = { ...prev, totalRuns: (prev.totalRuns || 0) + 1 };
      m = setAchievementProgress(m, 'meta_runs_10', m.totalRuns, 10);
      m = setAchievementProgress(m, 'meta_runs_100', m.totalRuns, 100);
      return m;
    });
    
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

    // 1.97.0~ 황혼의 벨트 — 맵(챕터) 시작 시 확장 1칸당 랜덤 포션 +1 (PM 룰, 슬롯 상한).
    //   새 런(idx 0)은 빈 벨트에서 시작 + 확장 보너스만큼 지급
    {
      const beltExp = getBeltExpansionCount(meta, classData.id);
      const beltCap = getClassBeltSlots(meta, classData.id);
      setBelt(prev => {
        const start = idx === 0 ? [] : prev;
        if (beltExp <= 0) return start;
        const ids = Object.keys(POTIONS);
        const next = [...start];
        for (let i = 0; i < beltExp && next.length < beltCap; i++) {
          next.push(ids[Math.floor(Math.random() * ids.length)]);
        }
        return next;
      });
    }
    
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
      // 1.90.0~ 런 조건 업적 카운터 초기화 (새 런 시작 시점)
      runKillsRef.current = 0;
      runEventsRef.current = { ok: 0, fail: 0 };
      initialSkillTotalRef.current = Object.values(baseSkills).reduce((s, v) => s + (v || 0), 0);
      // 1.93.0~ 보스 보상·포기 플래그 초기화
      setBossRewardPending(false);
      setRunRetreat(false);
      // 1.100.0~ 런타임 리셋 (새 런)
      runTimeRef.current = 0;
      setRunClearTime(null);
      setCombatLive(null);
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
      // 1.85.0~ 도박장: boss가 배열이면 랜덤 픽
      const bossPool = chapter.enemies.boss;
      const enemyKey = Array.isArray(bossPool) ? bossPool[Math.floor(Math.random() * bossPool.length)] : bossPool;
      // 1.89.0~ 마스터즈: 보스 페이즈 체인 — 첫 보스 진입, 나머지는 연속 처치 큐
      if (Array.isArray(chapter.bossChain) && chapter.bossChain.length > 1) {
        setBossChain(chapter.bossChain.slice(1));
      }
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
    
    // === 업적 트래킹: 적 처치 === (1.84.0~ 함수형 — 고배속 자동 사냥에서도 롤백 없음)
    runKillsRef.current += 1;
    setMeta(prev => {
      let m = { ...prev, totalKills: (prev.totalKills || 0) + 1 };
      m = completeAchievement(m, 'special_first_kill', 1);
      m = setAchievementProgress(m, 'meta_kill_100', m.totalKills, 100);
      m = setAchievementProgress(m, 'meta_kill_1000', m.totalKills, 1000);
      // 1.90.0~ 전투 단위 특수 업적 (전부 리뉴얼 후 첫 배선)
      if (runKillsRef.current >= 25) m = completeAchievement(m, 'special_kill_50', 1);
      if (remainingHp <= Math.max(1, Math.floor(maxHp * 0.1))) m = completeAchievement(m, 'special_low_hp_kill', 1);
      if ((combatStats?.dodges || 0) >= 5) m = completeAchievement(m, 'special_dodge_only', 1);
      const dmKey = getKstDateKey();
      m = trackDailyMission(m, DAILY_MISSIONS.find(x => x.id === 'dm_kill10'), 1, dmKey);
      if (isEliteReward) {
        m = trackDailyMission(m, DAILY_MISSIONS.find(x => x.id === 'dm_elite3'), 1, dmKey);
      }
      return m;
    });
    
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

    // 1.85.0~ 도박장: 승리마다 판돈 배가 (10 → 20 → 40) + 0.5% 잭팟 즉시 지급
    if (currentExpedition?.isGamble) {
      setGamblePot(prev => (prev <= 0 ? GAMBLE_CONFIG.potBase : prev * 2));
      if (Math.random() < GAMBLE_CONFIG.jackpotChance) {
        setGambleJackpot(true);
        setMeta(prev => completeAchievement(addTwilightCoins(prev, GAMBLE_CONFIG.jackpotCoins), 'gamble_jackpot', 1));
      }
    }

    // 1.83.0~ 자동 사냥 세션 합산 (자동 중에만 — 종료 요약 모달용)
    if (autoHunt) {
      setAutoSession(prev => {
        if (!prev) return prev;
        const bySource = { ...prev.bySource };
        if (combatStats?.bySource) {
          Object.entries(combatStats.bySource).forEach(([k, v]) => { bySource[k] = (bySource[k] || 0) + v; });
        }
        return {
          ...prev,
          battles: prev.battles + 1,
          totalDmg: prev.totalDmg + (combatStats?.total || 0),
          bySource,
          gold: prev.gold + goldGained,
          gem: prev.gem + gemGained,
          souls: prev.souls + soulGain + chapterBonusSouls,
        };
      });
    }

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
      // 1.89.0~ 마스터즈 보스 페이즈 체인 — 다음 페이즈 즉시 진입 (회복·보상 화면 없음, HP 이월)
      if (currentExpedition?.isMasters && bossChain.length > 0) {
        const [nextBoss, ...restChain] = bossChain;
        setBossChain(restChain);
        setCurrentEnemy(nextBoss);
        setMeta(prev => recordCodex(prev, 'enemies', nextBoss));
        setScreen('bossIntro');
        return;
      }
      // 마지막 챕터 보스 처치 → 원정 클리어 화면, 그 외 → 챕터 클리어
      const isLastChapter = currentExpedition && chapterIdx >= currentExpedition.chapters.length - 1;
      const isFinalBoss = isLastChapter && !currentExpedition?.endless;
      if (isFinalBoss) {
        setVictoryNextScreen('expeditionClear');
      } else {
        // 1.93.0~ 중간 보스 보상 (PM 지시: 최종보스 제외 전 보스) — 엘리트급 풀에서 픽 후 챕터 클리어
        let count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
        if (isUnlocked(meta, 'meta_extraReward')) count = Math.max(count, 4);
        setCurrentRewards(rollRewards(count, true, skills, relics, ultimates, classData?.id, meta, currentExpedition));
        setHasRerolled(false);
        setBossRewardPending(true);
        setVictoryNextScreen('reward');
      }
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
      // 1.85.0~ 도박장: 일반/강적 승리 후 [챙기기 vs 더블 업] 선택 화면 (계속 시 보상 픽으로)
      setScreen(currentExpedition?.isGamble ? 'gambleChoice' : 'reward');
    }
    setVictoryNextScreen(null);
  };

  // 1.93.0~ 무한모드 중간 포기 (PM 지시) — 누적 영혼 + 깊이 보너스 전액 정산 후 종료
  const handleEndlessRetreat = () => {
    if (!currentExpedition?.endless) return;
    const charismaSoulPct = getCharismaSoulGainBonus(stats);
    let depthBonus = endlessDepth * 15;
    if (charismaSoulPct > 0) depthBonus = Math.floor(depthBonus * (1 + charismaSoulPct / 100));
    const total = runSouls + depthBonus;
    setMeta(prev => {
      let m = total > 0 ? addSouls(prev, total) : prev;
      m = clearActiveRun(m);
      if (autoHunt) m = appendAutoRunLog(m, buildAutoRunEntry('retreat'));
      saveMeta(m);
      return m;
    });
    setRunRepeat(false);
    setRunSouls(total);
    setRunFirstChampClear(null);
    setRunRetreat(true);
    setScreen('expeditionClear');
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
    // 1.84.0~ 자동 사냥 전적 기록 (전멸)
    if (autoHunt) newMeta = appendAutoRunLog(newMeta, buildAutoRunEntry('defeat'));
    // 1.85.0~ 도박장 전멸 — 판돈 소멸, 잭팟 없던 런은 천장 조각 +1
    if (currentExpedition?.isGamble) {
      if (!gambleJackpot) newMeta = addFateShards(newMeta, 1);
      setGambleResult({ kind: 'defeat', coins: 0, jackpot: gambleJackpot, shard: !gambleJackpot });
      setGamblePot(0);
    }
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
    // 1.93.0~ 중간 보스 보상 픽 후에는 맵이 아니라 챕터 클리어로
    if (bossRewardPending) {
      setBossRewardPending(false);
      setScreen('chapterClear');
      return;
    }
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
    // 1.90.0~ 사건 판정 집계 (운명의 심판자 — 판정 없는 일반 선택지는 카운트 제외)
    if (resultData.check === 'ok') runEventsRef.current.ok += 1;
    else if (resultData.check === 'fail') runEventsRef.current.fail += 1;
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
      else if (reward.type === 'potion_random') {
        // 1.97.0~ 황혼의 연금술사 — 랜덤 포션 +1 (벨트 가득·슬롯 0이면 은화 +60 대체)
        const beltCap = getClassBeltSlots(meta, classData?.id);
        if (belt.length < beltCap) {
          const pids = Object.keys(POTIONS);
          setBelt(prev => prev.length < beltCap ? [...prev, pids[Math.floor(Math.random() * pids.length)]] : prev);
        } else {
          setGold(prev => prev + 60);
        }
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
    // 1.96.0~ 포션 구매 — 벨트에 추가 (슬롯 초과 시 무시 — ShopScreen에서 사전 차단됨)
    if (item.type === 'potion') {
      setBelt(prev => prev.length < beltSlots ? [...prev, item.potionId] : prev);
      return;
    }
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
  // ============================================
  // 1.85.0~ 황혼의 도박장
  // ============================================
  // 판돈 (승리마다 ×2: 10 → 20 → 40. 챙기거나 클리어해야 지급, 전멸 시 소멸)
  const [gamblePot, setGamblePot] = useState(0);
  // 이번 런 잭팟 발생 여부 (발생 시 조각 천장 미지급)
  const [gambleJackpot, setGambleJackpot] = useState(false);
  // 로비 결과 배너 { kind: 'bank'|'clear'|'defeat', coins, jackpot, shard }
  const [gambleResult, setGambleResult] = useState(null);

  // ============================================
  // 1.89.0~ 마스터즈 퓨전 던전
  // ============================================
  const [selectedMasters, setSelectedMasters] = useState(null); // fusion 객체 | null
  // 보스 페이즈 체인 — 남은 보스 키 (2/3페이즈 연속 처치)
  const [bossChain, setBossChain] = useState([]);
  // 클리어 시 칭호 드랍 결과 { title, tier, dup?, souls? } | null
  const [mastersDrop, setMastersDrop] = useState(null);

  const startMasters = (fusion) => {
    setMeta(prev => clearActiveRun(prev));
    const exp = buildMastersExpedition(fusion);
    const chapterData = buildMastersChapter(fusion);
    setCurrentExpedition(exp);
    setCurrentCurses([]);
    setPendingChainEvents([]);
    setRunSouls(0);
    setRunStats(null);
    setVictoryStats(null);
    setBossChain([]);
    setMastersDrop(null);
    runRestartRef.current = { kind: 'masters', fusion };
    // 업적 트래킹 (함수형 — 롤백 방지)
    setMeta(prev => {
      let m = { ...prev, totalRuns: (prev.totalRuns || 0) + 1 };
      m = setAchievementProgress(m, 'meta_runs_10', m.totalRuns, 10);
      m = setAchievementProgress(m, 'meta_runs_100', m.totalRuns, 100);
      return m;
    });
    setActiveSkills(null);
    setActiveRelicNames(null);
    initializeRun(chapterData, 0, exp, []);
  };

  const handleEquipTitle = (classId, titleId) => {
    setMeta(prev => {
      const next = equipClassTitle(prev, classId, titleId);
      if (next === prev) return prev;
      saveMeta(next);
      return next;
    });
  };

  const handleGambleEnter = () => {
    const dk = getKstDateKey();
    if (getGambleUsed(meta, dk) >= GAMBLE_CONFIG.dailyLimit) return;
    setGambleResult(null);
    setSelectedExpedition(buildGambleExpedition());
    setScreen('classSelect');
  };

  const handleGambleBuy = (item) => {
    setMeta(prev => {
      const next = buyGambleShopItem(prev, item);
      if (!next) return prev;
      saveMeta(next);
      return next;
    });
  };

  // 1.86.0~ 레전더리 각인 확정권 — 피커에서 굴린 카드(cardId)를 슬롯에 장착 + 주화 차감
  const handleGambleLegendary = (item, classId, slotIdx, cardId) => {
    setMeta(prev => {
      if ((prev.twilightCoins || 0) < item.cost) return prev;
      let m = { ...prev, twilightCoins: prev.twilightCoins - item.cost };
      m = applyEngravingSlot(m, classId, slotIdx, cardId, 0);
      saveMeta(m);
      return m;
    });
  };

  const handleGambleRedeem = () => {
    setMeta(prev => {
      let next = redeemFateShards(prev, GAMBLE_CONFIG.shardPity, GAMBLE_CONFIG.shardPityCoins);
      if (next === prev) return prev;
      next = completeAchievement(next, 'gamble_pity', 1);
      saveMeta(next);
      return next;
    });
  };

  // [챙기기] — 현재 판돈 확정 지급 후 런 종료 → 로비 복귀
  const handleGambleBank = () => {
    const pot = gamblePot;
    const jackpot = gambleJackpot;
    setMeta(prev => {
      let m = addTwilightCoins(prev, pot);
      if (!jackpot) m = addFateShards(m, 1); // 천장 — 잭팟 없던 런만 조각 +1
      m = clearActiveRun(m);
      saveMeta(m);
      return m;
    });
    setGambleResult({ kind: 'bank', coins: pot, jackpot, shard: !jackpot });
    setGamblePot(0);
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setPendingChainEvents([]);
    setRunSouls(0);
    setScreen('gamble');
  };

  // 1.84.0~ 자동 사냥 전적 엔트리 — 런 종료 시점의 조합(패시브·유물·각성) + 결과 스냅샷
  const buildAutoRunEntry = (result) => ({
    t: Date.now(),
    cls: classData?.id || null,
    exp: currentExpedition?.isChampionship ? currentExpedition.championshipId : (currentExpedition?.id || null),
    diff: currentExpedition?.difficultyId || null,
    res: result,
    bt: runStats?.battles || 0,
    dmg: runStats?.totalDmg || 0,
    sk: (activeSkills && activeSkills.length > 0 ? activeSkills : Object.keys(skills || {}).filter(n => (skills[n] || 0) > 0)).slice(0, 8),
    rl: (activeRelicNames || relics.map(r => r.name)).slice(0, 8),
    ul: (ultimates || []).slice(0, 6),
  });

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
      
      // 1.89.0~ 마스터즈 클리어 — 칭호 드랍 롤 (직업별 별도, 중복 시 영혼 보상)
      let mastersBonusSouls = 0;
      if (currentExpedition.isMasters && classData?.id) {
        const dropTier = rollTitleDrop(currentExpedition.mastersKind);
        if (dropTier) {
          const dropTitle = (CLASS_TITLES[classData.id] || []).find(t => t.tier === dropTier);
          if (dropTitle) {
            const owned = (newMeta.titles?.[classData.id] || []).includes(dropTitle.id);
            if (!owned) {
              newMeta = addClassTitle(newMeta, classData.id, dropTitle.id);
              // 1.90.0~ 칭호 업적 (첫 획득 / 태초 / 수집 누적)
              newMeta = completeAchievement(newMeta, 'title_first', 1);
              if (dropTier === 'M') newMeta = completeAchievement(newMeta, 'title_myth', 1);
              const titleCount = Object.values(newMeta.titles || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
              newMeta = setAchievementProgress(newMeta, 'title_collect_5', titleCount, 5);
              newMeta = setAchievementProgress(newMeta, 'title_collect_all', titleCount, 20);
              setMastersDrop({ title: dropTitle, tier: dropTier });
            } else {
              mastersBonusSouls = { R: 200, E: 500, L: 1500, M: 5000 }[dropTier] || 0;
              newMeta = addSouls(newMeta, mastersBonusSouls);
              setMastersDrop({ title: dropTitle, tier: dropTier, dup: true, souls: mastersBonusSouls });
            }
          }
        } else {
          setMastersDrop(null);
        }
      }

      // 챔피언십 vs 클래식 분기
      if (currentExpedition.isGamble) {
        // 1.85.0~ 도박장 3연전 완주 — 최종 판돈 자동 지급 + 천장 조각
        newMeta = addTwilightCoins(newMeta, gamblePot);
        if (!gambleJackpot) newMeta = addFateShards(newMeta, 1);
        newMeta = completeAchievement(newMeta, 'gamble_sweep', 1); // 1.90.0~ 3연전 완주
        setGambleResult({ kind: 'clear', coins: gamblePot, jackpot: gambleJackpot, shard: !gambleJackpot });
        setGamblePot(0);
      } else if (currentExpedition.isChampionship) {
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
      
      // 1.84.1~ 전문가/마스터/미답의 도전자 재매핑 (PM 결정) — 직업별 원정 클리어 횟수
      //   기존 "망각의 원정"(미구현 expedition 4)은 카운트 코드가 없어 영구 달성 불가였음
      //   모든 모드(튜토리얼·수련·일일·챔피언십) 클리어 시 +1. 무한모드는 클리어 개념이 없어 자연 제외
      // 도박장 3연전은 미니 콘텐츠라 전문가/마스터 카운트에서 제외
      if (classData?.id && !currentExpedition.isGamble) {
        newMeta = incrementAchievement(newMeta, `expert_${classData.id}`, 1, 50);
        newMeta = incrementAchievement(newMeta, `master_${classData.id}`, 1, 100);
        const clsKeys = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
        const clearedClassCount = clsKeys.filter(c => (newMeta.achievements?.[`expert_${c}`]?.progress || 0) > 0).length;
        newMeta = setAchievementProgress(newMeta, 'special_all_class_e4', clearedClassCount, 5);
      }

      // 1.90.0~ 마스터즈 업적 (첫 듀얼·트리플 / 전체 정복 — clearedExpeditions에 fusion id 기록 후)
      if (currentExpedition.isMasters) {
        // 1.99.2~ 직업별 클리어 이력 (PM 지시 — 챔피언십 byClass와 동일 패턴)
        if (classData?.id) newMeta = recordMastersClearByClass(newMeta, classData.id, currentExpedition.id);
        const mk = currentExpedition.mastersKind;
        newMeta = completeAchievement(newMeta, mk === 'triple' ? 'masters_first_triple' : 'masters_first_dual', 1);
        const clearedDuals = MASTERS_DUALS.filter(d => (newMeta.clearedExpeditions || []).includes(d.id)).length;
        const clearedTriples = MASTERS_TRIPLES.filter(d => (newMeta.clearedExpeditions || []).includes(d.id)).length;
        newMeta = setAchievementProgress(newMeta, 'masters_all_dual', clearedDuals, 10);
        newMeta = setAchievementProgress(newMeta, 'masters_all_triple', clearedTriples, 10);
      }

      // 1.90.0~ 런 조건 특수 업적 (리뉴얼 후 첫 배선 — 도박장 3연전은 미니 콘텐츠라 제외)
      if (!currentExpedition.isGamble) {
        const isTut = !!currentExpedition.isTutorial;
        if (!isTut && relics.length === 0) newMeta = completeAchievement(newMeta, 'special_no_relic', 1);
        if (!isTut && initialSkillTotalRef.current != null) {
          const curSkillTotal = Object.values(skills).reduce((s, v) => s + (v || 0), 0);
          if (curSkillTotal <= initialSkillTotalRef.current) newMeta = completeAchievement(newMeta, 'special_no_passive', 1);
        }
        if (hp <= Math.max(1, Math.floor(maxHp * 0.25))) newMeta = completeAchievement(newMeta, 'special_no_death', 1);
        if (Object.values(skills).some(lv => lv >= 7)) newMeta = completeAchievement(newMeta, 'special_all_lv7', 1);
        if (currentCurses.length >= 3) newMeta = completeAchievement(newMeta, 'special_three_curses', 1);
        const ev = runEventsRef.current || { ok: 0, fail: 0 };
        if (ev.ok >= 3 && ev.fail === 0) newMeta = completeAchievement(newMeta, 'special_event_perfect', 1);
        if (classData?.id === 'wanderer') {
          const simIds = (ULTIMATE_SKILLS['심안류'] || []).map(u => u.id);
          if (simIds.length > 0 && simIds.every(id => ultimates.includes(id))) {
            newMeta = completeAchievement(newMeta, 'special_wanderer_3ult', 1);
          }
        }
      }

      // 1.100.0~ 던전별 베스트 런타임 (×1 기준, 도박장 제외 — 무한은 클리어 개념 없어 자연 제외)
      if (!currentExpedition.isGamble && runTimeRef.current != null && runTimeRef.current > 0) {
        const rtKey = currentExpedition.isChampionship
          ? `${currentExpedition.championshipId}@${currentExpedition.difficultyId}`
          : currentExpedition.id;
        const rtRes = updateBestRunTime(newMeta, rtKey, runTimeRef.current, classData?.id || null);
        newMeta = rtRes.meta;
        setRunClearTime({ ms: runTimeRef.current, best: rtRes.isBest });
      } else {
        setRunClearTime(null);
      }

      // 영혼 부자 (5000 누적 보유) — 영혼 추가 후 체크
      newMeta = setAchievementProgress(newMeta, 'special_souls_5000', newMeta.souls, 5000);

      // 1.84.0~ 자동 사냥 전적 기록 (클리어)
      if (autoHunt) newMeta = appendAutoRunLog(newMeta, buildAutoRunEntry('clear'));

      setMeta(newMeta);

      setRunSouls(totalSouls + mastersBonusSouls);  // 화면에 표시용 (칭호 중복 보상 포함)
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
        // 1.90.0~ 무한모드 깊이 업적 (황혼의 심연 5 / 끝없는 황혼 10)
        if (newDepth >= 5) {
          setMeta(prev => {
            let m = completeAchievement(prev, 'special_speed_clear', 1);
            if (newDepth >= 10) m = completeAchievement(m, 'endless_depth_10', 1);
            return m;
          });
        }
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
    // 1.85.0~ 도박장 런이었으면 로비로 복귀 (결과 배너 표시)
    const wasGamble = !!currentExpedition?.isGamble;
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setPendingChainEvents([]);
    setRunSouls(0);
    setRunRetreat(false);
    setSelectedChampionship(null);
    setSelectedDifficulty(null);
    setSelectedMasters(null);
    setBossChain([]);
    setMeta(prev => clearActiveRun(prev));
    setScreen(wasGamble ? 'gamble' : 'title');
  };
  
  // 사망 화면 → 메인 메뉴
  const handleDefeatContinue = () => {
    // 1.85.0~ 도박장 런이었으면 로비로 복귀 (결과 배너 표시)
    const wasGamble = !!currentExpedition?.isGamble;
    setCurrentExpedition(null);
    setCurrentCurses([]);
    setPendingChainEvents([]);
    setRunSouls(0);
    setRunRetreat(false);
    setSelectedChampionship(null);
    setSelectedDifficulty(null);
    setSelectedMasters(null);
    setBossChain([]);
    setScreen(wasGamble ? 'gamble' : 'title');
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
      // 1.86.0~ 난이도별 클리어 기록 (일반=기존 키, 영웅/종막=@접미 — 상위 난이도 해금 판정용)
      next = recordRaidClear(next, getRaidClearKey(dungeon.id, raidDifficulty?.id));
      // 1.90.0~ 레이드 업적 (첫 클리어 / 난이도 / 누적 100회)
      next = completeAchievement(next, 'raid_first_clear', 1);
      if (raidDifficulty?.id === 'heroic') next = completeAchievement(next, 'raid_heroic_clear', 1);
      if (raidDifficulty?.id === 'doom') next = completeAchievement(next, 'raid_doom_clear', 1);
      const totalRaidClears = Object.values(next.raid?.clears || {}).reduce((s, v) => s + (v || 0), 0);
      next = setAchievementProgress(next, 'raid_clear_100', totalRaidClears, 100);
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
    setRaidDifficulty(null);
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
      // 1.87.0~ 초월(+11~): 심연석 대신 군주의 정수 소모
      const enh = item.enh || 0;
      const cost = RAID_ENHANCE.isTranscend(enh)
        ? { essence: RAID_ENHANCE.essenceCostFor(enh) }
        : { stones: RAID_ENHANCE.costFor(enh) };
      let next = enhanceRaidItem(prev, classId, slot, cost, RAID_ENHANCE.max);
      if (next === prev) return prev;
      // 1.90.0~ 초월의 끝 업적 — 강화 결과가 최대치(+20) 도달 시
      const after = next?.raid?.equipped?.[classId]?.[slot];
      if ((after?.enh || 0) >= RAID_ENHANCE.max) next = completeAchievement(next, 'raid_transcend_20', 1);
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
    setRaidDifficulty(null);
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
      // 1.83.0~ 세션: 전멸 기록 후 자동 해제 → 요약 모달
      if (screen === 'defeat') {
        setAutoSession(prev => prev ? { ...prev, defeats: prev.defeats + 1 } : prev);
        setRunRepeat(false);
      }
      setAutoHunt(false);
      return;
    }
    let t = null;
    // 1.80.0~ 배속 반영 (최소 60ms — 상태 반영 여유)
    const later = (fn, ms) => { t = setTimeout(fn, autoSpeed >= AUTO_SPEED_SKIP ? 0 : Math.max(60, Math.round(ms / autoSpeed))); };
    if (screen === 'map' && mapData) {
      const candidates = mapData.nodes.filter(n => n.current && !n.locked);
      if (candidates.length > 0) {
        const hpRatio = maxHp > 0 ? hp / maxHp : 1;
        // 노드 우선순위: 저체력이면 정비 최우선. 평시엔 강적(영혼 3) > 전투 > 보스 순
        const prio = (n) => {
          // 1.94.0~ 생존 보강 (PM 옵션 A): 정비 최우선 임계 45% → 60%
          if (n.type === 'rest') return hpRatio < 0.6 ? 100 : 30;
          // 1.84.1~ PM 결정: 은화 250 이상이면 상점 노드 최우선 경유 (긴급 정비 100만 예외 — 생존 우선)
          if (n.type === 'shop') return gold >= 250 ? 95 : 20;
          if (n.type === 'elite') return 80;
          if (n.type === 'battle') return 70;
          if (n.type === 'boss') return 60;
          if (n.type === 'unknown') return 50;
          if (n.type === 'event') return 40;
          if (n.type === 'prep') return 35;
          if (n.type === 'forge') return 10;
          return 0;
        };
        const target = [...candidates].sort((a, b) => prio(b) - prio(a))[0];
        later(() => handleEnterNode(target), 700);
      }
    } else if (screen === 'victory') {
      later(handleVictoryContinue, 900);
    } else if (screen === 'gambleChoice') {
      // 1.85.0~ 자동 사냥은 도박사 정신 — 항상 더블 업 (끝까지 간다)
      later(() => setScreen('reward'), 1000);
    } else if (screen === 'reward' && currentRewards && currentRewards.length > 0) {
      const hpRatio = maxHp > 0 ? hp / maxHp : 1;
      const classId = classData?.id;
      const prioList = CLASS_SKILL_PRIO[classId] || null;
      // 1.84.2 완화 (PM 결정): 잔혹은 Lv.3부터 자체 출혈 부여라 물리 직업군이면 자동 픽 허용
      //   — 마법 전용 직업(술법사·사제)만 제외 (수동 픽은 항상 가능)
      // 1.92.0~ 예외: PM 지정 우선순위가 있는 직업은 그 리스트가 우선 (술법사도 잔혹 6순위 명시)
      const physCapable = !!classData?.combatSkills?.some(k => COMBAT_SKILLS[k]?.type === 'physical');
      const pool = currentRewards.filter(r => !(r.type === 'skill' && r.name === '잔혹' && !physCapable && !prioList));
      const cand = pool.length > 0 ? pool : currentRewards;
      // PM 룰: 상위 5순위 패시브가 하나도 없으면 보석 리롤 1회
      let autoRerolled = false;
      if (prioList) {
        const top5 = prioList.slice(0, 5);
        const hasTop5 = cand.some(r => r.type === 'skill' && top5.includes(r.name));
        // 회복(저체력)·궁극 진화가 있으면 그게 더 상위 픽이라 리롤하지 않음
        const mustPick = (hpRatio < 0.5 && cand.some(r => r.type === 'heal' || r.type === 'heal_full'))
          || cand.some(r => r.type === 'ultimate');
        if (!hasTop5 && !mustPick && !hasRerolled) {
          const free = hasEffect(skills, 'fateReroll', activeSkills);
          const cost = free ? 0 : (hasEffect(skills, 'rerollDiscount', activeSkills) ? GAME_CONFIG.rerollDiscountCost : GAME_CONFIG.rerollCost);
          if (gem >= cost) {
            const count = hasEffect(skills, 'extraReward', activeSkills) ? 4 : 3;
            later(() => handleReroll(rollRewards(count, isEliteReward, skills, relics, ultimates, classId, meta, currentExpedition), cost), 700);
            autoRerolled = true; // 새 보상으로 currentRewards가 갱신되면 이 효과가 다시 돌아 픽 진행
          }
        }
      }
      if (!autoRerolled) {
        // 1.72.1~ 직업 맞춤 보상 우선순위:
        // 저체력 회복 > 궁극 진화 > [PM 지정 직업: 고정 우선순위] / [그 외: 직업 전용 패시브(classOnly) >
        // 보유 패시브 강화(Lv 높은 순 — 7Lv 궁극 진화 가속)] > 직업 주력 스탯 >
        // 새 패시브 > 유물 > 첫 번째
        const skillPick = prioList
          ? prioList.map(name => cand.find(r => r.type === 'skill' && r.name === name)).find(Boolean)
          : (cand.find(r => r.type === 'skill' && PASSIVE_SKILLS[r.name]?.classOnly === classId) ||
             cand
               .filter(r => r.type === 'skill' && (skills[r.name] || 0) > 0)
               .sort((a, b) => (skills[b.name] || 0) - (skills[a.name] || 0))[0]);
        const pick =
          (hpRatio < 0.5 && cand.find(r => r.type === 'heal' || r.type === 'heal_full')) ||
          cand.find(r => r.type === 'ultimate') ||
          skillPick ||
          cand.find(r => r.type === 'stat' && r.name === AUTO_STAT_PREF[classId]) ||
          cand.find(r => r.type === 'skill') ||
          // 1.73.0~ 유물도 직업 선호 점수순 (물공 직업=물리 유물 / 마공 직업=마공 유물)
          cand
            .filter(r => r.type === 'relic')
            .sort((a, b) => scoreRelicForClass(b, classId) - scoreRelicForClass(a, classId))[0] ||
          cand[0];
        later(() => handlePickReward(pick), 900);
      }
    } else if (screen === 'expeditionClear') {
      // 1.81.0~ 던전 반복 — 클리어 정산 후 같은 원정 자동 재출정. 반복 OFF면 자동 해제
      // 1.85.0~ 도박장은 반복 제외 (일일 입장권 소모 콘텐츠)
      if (runRepeat && runRestartRef.current && !currentExpedition?.isGamble) {
        later(() => {
          // 1.84.0 픽스: ref에는 인자만 있고, 함수는 이 렌더의 최신 것을 사용
          //   (오래된 클로저의 startExpedition이 이전 메타 스냅샷으로 롤백하던 버그 방지)
          const r = runRestartRef.current;
          // 1.83.0~ 세션: 클리어 +1, 런 카운터 +1 (재출정)
          setAutoSession(prev => prev ? { ...prev, clears: prev.clears + 1, runCount: prev.runCount + 1 } : prev);
          handleExpeditionClearContinue();
          if (r?.kind === 'championship') startChampionship(r.championship, r.difficulty);
          else if (r?.kind === 'masters') startMasters(r.fusion);
          else if (r?.kind === 'expedition') startExpedition(r.expedition);
        }, 1800);
      } else {
        // 1.83.0~ 세션: 마지막 런 클리어 기록 후 자동 해제 → 요약 모달
        setAutoSession(prev => prev ? { ...prev, clears: prev.clears + 1 } : prev);
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
      // 1.100.0~ PM 룰: 제한 초과 시 이전 선택 유지가 아니라 직업 우선순위로 재선택
      const owned = Object.entries(skills).filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n]).map(([n]) => n);
      const maxSk = PREP_CONFIG.maxSkillSelect;
      let selSkills;
      if (owned.length <= maxSk) {
        selSkills = owned;
      } else {
        const prio = CLASS_SKILL_PRIO[classData?.id] || null;
        if (prio) {
          // PM 지정 우선순위 순서 → 목록 밖 패시브는 레벨 높은 순으로 뒤에
          const inPrio = prio.filter(n => owned.includes(n));
          const restSk = owned.filter(n => !inPrio.includes(n)).sort((a, b) => (skills[b] || 0) - (skills[a] || 0));
          selSkills = [...inPrio, ...restSk].slice(0, maxSk);
        } else {
          // 우선순위 미지정 직업(마족·정령사·사제): 직업 전용 패시브 → 레벨 높은 순
          const classOnly = owned.filter(n => PASSIVE_SKILLS[n]?.classOnly === classData?.id);
          const restSk = owned.filter(n => !classOnly.includes(n)).sort((a, b) => (skills[b] || 0) - (skills[a] || 0));
          selSkills = [...classOnly, ...restSk].slice(0, maxSk);
        }
      }
      // 1.100.0~ PM 룰: 유물 초과 시 직업 선호 점수순 재선택 — 천리안(mapReveal)·시작 은화(startGold) 계열 무조건 배제
      const maxRel = currentExpedition?.maxRelicSelect || 1;
      const relNames = relics.map(r => r.name);
      let selRelics;
      if (relNames.length <= maxRel) {
        selRelics = relNames;
      } else {
        const usableRelics = relics.filter(r => !((r.statBonus?.mapReveal || 0) > 0 || (r.statBonus?.startGold || 0) > 0));
        selRelics = [...usableRelics]
          .sort((a, b) => scoreRelicForClass(b, classData?.id) - scoreRelicForClass(a, classData?.id))
          .slice(0, maxRel)
          .map(r => r.name);
        // 배제 유물뿐이라 한 칸도 못 채우는 극단 케이스만 폴백 (빈 활성은 순손실)
        if (selRelics.length === 0) selRelics = relNames.slice(0, maxRel);
      }
      if (screen === 'prep') later(() => handlePrepConfirm(selSkills, selRelics), 800);
      else later(() => handleReselectConfirm(selSkills, selRelics), 800);
    }
    return () => { if (t) clearTimeout(t); };
  }, [screen, autoHunt, autoHuntAllowed, mapData, currentRewards, hp, maxHp, runRepeat, gold, gem, hasRerolled]);

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
          {FEATURE_FLAGS.raid && raidDungeon && (
            <div style={{ display: screen === 'raidBattle' ? 'contents' : 'none' }}>
              {/* 1.86.0~ 난이도 적용된 실효 던전을 전달 — 전투 코드는 난이도 무지 (applyRaidDifficulty가 전부 처리) */}
              <RaidBattleScreen key={raidDungeon.id + '-' + (raidDifficulty?.id || 'normal') + '-' + (meta?.raid?.clears?.[getRaidClearKey(raidDungeon.id, raidDifficulty?.id)] || 0)} meta={meta} dungeon={applyRaidDifficulty(raidDungeon, raidDifficulty)} repeat={raidRepeat} background={screen !== 'raidBattle'} onToggleRepeat={() => setRaidRepeat(v => !v)} onMinimize={() => setScreen('raid')} onStatus={setRaidBgStatus} onVictory={handleRaidVictory} onDefeat={handleRaidPartial} onRetreat={handleRaidPartial} />
            </div>
          )}
          {/* 1.80.0~ 레이드 백그라운드 플로팅 필 — 탭 시 전투 화면 복귀 */}
          {FEATURE_FLAGS.raid && raidDungeon && screen !== 'raidBattle' && (
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
              expedition={currentExpedition} chapter={chapter} screen={screen} runStats={runStats} autoRunCount={autoSession?.runCount || 0} runTimeMs={runTimeRef.current} combatLive={combatLive}
              autoSpeed={autoSpeed} onCycleSpeed={cycleAutoSpeed}
              runRepeat={runRepeat} onToggleRepeat={currentExpedition?.endless ? null : () => setRunRepeat(v => !v)}
              onWatch={() => setAutoOverlayHidden(true)} onStop={() => setAutoHunt(false)}
              onSkipRun={runSkip ? null : startRunSkip}
            />
          )}
          {/* 1.102.1~ ⏩ 던전 스킵 커버 — 전 과정을 가리고 결과(클리어/전멸)만 노출. 진행은 밑에서 최고 속도로 계속 */}
          {runSkip && screen !== 'expeditionClear' && screen !== 'defeat' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ zIndex: 88, background: 'rgba(10,7,9,0.97)' }}>
              <div style={{ fontSize: 12, letterSpacing: '0.3em', color: PALETTE.legendary, fontWeight: 700 }}>⏩ 던전 스킵 진행 중</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.text }}>{currentExpedition?.name || ''}</div>
              <div className="tabular-nums" style={{ fontSize: 11, color: PALETTE.textDim }}>
                전투 {(runStats?.battles || 0)}회 진행 · 결과 산출 중…
              </div>
              <div style={{ width: 120, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div className="fx-skip-sweep" style={{ height: '100%', width: '40%', borderRadius: 999, background: `linear-gradient(90deg, transparent, ${PALETTE.legendary})` }} />
              </div>
              <button onClick={cancelRunSkip} className="ui-press" style={{
                marginTop: 10, padding: '6px 16px', borderRadius: 999, fontSize: 10.5,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--ui-line)', color: PALETTE.textDim,
              }}>✕ 스킵 취소 (계속 관전)</button>
            </div>
          )}
          {/* 1.83.0~ 자동 사냥 종료 요약 모달 — 세션 전체 런 합산 획득 정보 */}
          {autoSummary && <AutoHuntSummaryModal summary={autoSummary} onClose={() => setAutoSummary(null)} />}
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
            {screen === 'title' && authMode && <TitleScreen meta={meta} onStart={() => setScreen('expeditionSelect')} onResume={resumeActiveRun} onAltar={enterAltar} onEngravings={() => setScreen('engraving')} onRaid={FEATURE_FLAGS.raid && raidUnlocked ? () => setScreen('raid') : null} onAchievements={() => { setPrevAchievementsBack('title'); setScreen('achievements'); }} onAutoStats={() => setScreen('autoStats')} onGamble={raidUnlocked ? () => { setGambleResult(null); setScreen('gamble'); } : null} onHof={FEATURE_FLAGS.hof && raidUnlocked ? () => setScreen('hof') : null} onBuried={FEATURE_FLAGS.buried ? () => setScreen('buried') : null} onChangelog={() => setShowChangelog({ firstSeen: false })} onAccount={() => setScreen('account')} />}
            {FEATURE_FLAGS.hof && screen === 'hof' && <HofScreen meta={meta} onEnterStage={(stage) => { setHofStage(stage); setScreen('hofBattle'); }} onLevelUp={handleHofLevelUp} onSavePatterns={handleHofSavePatterns} onBack={() => setScreen('title')} />}
            {FEATURE_FLAGS.hof && screen === 'hofBattle' && hofStage && <HofBattleScreen meta={meta} stage={hofStage} onFinish={handleHofFinish} onRetreat={() => { setHofStage(null); setScreen('hof'); }} />}
            {FEATURE_FLAGS.buried && screen === 'buried' && <BuriedScreen meta={meta}
              onStartChar={handleBuriedStart}
              onContinue={() => setScreen('buriedDungeon')}
              onUpdateChar={updateBuriedChar}
              onRetire={(char) => {
                const settle = buriedDeathSettlement(char);
                setMeta(prev => { const next = recordBuriedDeath(prev, settle); saveMeta(next); return next; });
                setBuriedForgeNotice(`⚰ 정산 — 장비 ${settle.itemCount}개 분해 🕯 +${settle.dust} · 골드는 무덤에 흩어졌다`);
              }}
              onForge={handleBuriedForge}
              onBuyContract={handleBuriedBuyContract}
              onBuyPart={handleBuriedBuyPart}
              onDetachParts={handleBuriedDetachParts}
              forgeNotice={buriedForgeNotice}
              onBack={() => { setBuriedForgeNotice(null); setScreen('title'); }} />}
            {FEATURE_FLAGS.buried && screen === 'buriedDungeon' && meta?.buried?.char && <BuriedDungeonScreen meta={meta}
              onUpdateChar={updateBuriedChar}
              onEnterBattle={handleBuriedEnterBattle}
              notice={buriedForgeNotice}
              onClearNotice={() => setBuriedForgeNotice(null)}
              onLeave={() => setScreen('buried')} />}
            {FEATURE_FLAGS.buried && screen === 'buriedBattle' && meta?.buried?.char && buriedEnemy && <BuriedBattleScreen
              key={`${meta.buried.char.floor}-${buriedEnemy.key}`}
              char={meta.buried.char} enemy={buriedEnemy} roomType={buriedRoom} roomEffectId={buriedRoomFx}
              onFinish={handleBuriedBattleFinish} />}
            {screen === 'autoStats' && <AutoStatsScreen meta={meta} onClose={() => setScreen('title')} />}
            {screen === 'gamble' && <GambleLobbyScreen meta={meta} result={gambleResult} onEnter={handleGambleEnter} onBuy={handleGambleBuy} onBuyLegendary={handleGambleLegendary} onRedeem={handleGambleRedeem} onBack={() => { setGambleResult(null); setScreen('title'); }} />}
            {screen === 'gambleChoice' && currentExpedition?.isGamble && <GambleChoiceScreen pot={gamblePot} jackpot={gambleJackpot} onContinue={() => setScreen('reward')} onBank={handleGambleBank} />}
            {FEATURE_FLAGS.raid && screen === 'raid' && <RaidScreen meta={meta} onEnterDungeon={(d, diff) => { if (raidDungeon) { setScreen('raidBattle'); return; } setRaidDungeon(d); setRaidDifficulty(diff || null); setScreen('raidBattle'); }} onEquipItem={handleRaidEquip} onAutoEquip={handleRaidAutoEquip} onDismantle={handleRaidDismantle} onDismantleJunk={handleRaidDismantleJunk} onEnhance={handleRaidEnhance} onCraft={handleRaidCraft} onGacha={handleRaidGacha} onToggleFormation={handleRaidFormation} onBack={() => setScreen('title')} />}
            {screen === 'account' && <AccountScreen 
              authMode={authMode} 
              firebaseUser={firebaseUser} 
              meta={meta} 
              onLogout={handleLogout} 
              onLinkGoogle={handleLinkGoogle} 
              onClose={() => setScreen('title')} 
            />}
            {screen === 'classSelect' && <ClassSelect meta={meta} selected={selectedClass} onSelect={setSelectedClass} onNext={() => setScreen('start')} onBack={() => {
              // 마스터즈/챔피언십 흐름 분기, 일반은 expedition으로
              if (selectedMasters) { setSelectedMasters(null); setScreen('expeditionSelect'); }
              else if (selectedChampionship) setScreen('championshipDifficulty');
              else setScreen('expeditionSelect');
            }} isChampionship={!!selectedChampionship} />}
            {screen === 'expeditionSelect' && <ExpeditionSelect meta={meta}
              onSelect={(exp) => {
                setSelectedExpedition(exp);
                setSelectedMasters(null);
                // 튜토리얼/수련: 직업 강제. 직업 선택 화면 건너뛰고 바로 시작
                if (typeof exp.forcedClassId === 'number') {
                  setSelectedClass(exp.forcedClassId);
                  setScreen('start');
                } else {
                  // 일반 원정: 직업 선택 (현재는 없음, 미래 대비)
                  setScreen('classSelect');
                }
              }}
              onSelectChampionship={(champ) => { setSelectedChampionship(champ); setSelectedMasters(null); setScreen('championshipDifficulty'); }}
              onSelectMasters={(fusion) => { setSelectedMasters(fusion); setSelectedChampionship(null); setSelectedDifficulty(null); setSelectedExpedition(null); setScreen('classSelect'); }}
              onEquipTitle={handleEquipTitle}
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
              if (selectedMasters) startMasters(selectedMasters);
              else if (selectedChampionship && selectedDifficulty) startChampionship(selectedChampionship, selectedDifficulty);
              else if (selectedExpedition) startExpedition(selectedExpedition);
            }} />}
            {screen === 'altar' && <SoulAltar meta={meta} slots={altarSlots} onPurchase={purchaseUpgrade} onReroll={rerollAltar} onBack={() => setScreen('title')} />}
            {screen === 'engraving' && <EngravingScreen meta={meta} onMetaUpdate={setMeta} onBack={() => setScreen('title')} />}
            {screen === 'achievements' && <AchievementScreen meta={meta} onClaim={handleClaimAchievement} onClose={() => setScreen(prevAchievementsBack)} />}
            {screen === 'map' && chapter && mapData && <MapView chapter={chapter} classData={classData} mapData={mapData} hp={hp} maxHp={maxHp} gold={gold} gem={gem} relics={relics} activeRelicNames={activeRelicNames} expedition={currentExpedition} curses={currentCurses} chapterIdx={chapterIdx} autoHunt={autoHunt} autoHuntAllowed={autoHuntAllowed} onToggleAutoHunt={toggleAutoHunt} autoSpeed={autoSpeed} onCycleAutoSpeed={cycleAutoSpeed} onSkipRun={autoHunt && !runSkip ? startRunSkip : null} autoRunCount={autoSession?.runCount || 0} onEnterNode={handleEnterNode} onOpenStatus={() => setScreen('status')} onOpenAchievements={() => { setPrevAchievementsBack('map'); setScreen('achievements'); }} onOpenCodex={() => setScreen('codex')} onBack={() => setScreen('title')} onRetreat={currentExpedition?.endless ? handleEndlessRetreat : null} />}
            {screen === 'codex' && <CodexScreen meta={meta} onBack={() => setScreen('map')} />}
            {screen === 'bossIntro' && currentEnemy && <BossIntroScreen enemyKey={currentEnemy} fastSkip={autoHunt && autoSpeed >= AUTO_SPEED_SKIP} onComplete={() => setScreen('combat')} />}
            {screen === 'combat' && currentEnemy && <CombatScreen key={`${activeNodeId}-${currentEnemy}`} classData={classData} initialPlayer={{ hp, maxHp, ...classData.stats, ...stats }} initialSkills={skills} initialUltimates={ultimates} initialRelics={relics} activeSkills={activeSkills} activeRelicNames={activeRelicNames} enemyKey={currentEnemy} isBoss={isBossReward} expedition={currentExpedition} curses={currentCurses} meta={meta} engravingFx={getCombinedClassFx(meta, classData?.id)} chapterGimmick={chapter?.gimmick || null} autoPlay={autoHunt} autoSpeed={autoSpeed} onCycleAutoSpeed={cycleAutoSpeed} onSkipRun={autoHunt && !runSkip ? startRunSkip : null} autoRunCount={autoSession?.runCount || 0} onToggleAuto={toggleAutoHunt} belt={belt} onConsumePotion={handleConsumePotion} onLiveStatus={autoHunt ? setCombatLive : null} onVictory={handleVictory} onDefeat={handleDefeat} />}
            {screen === 'reward' && <RewardSelect rewards={currentRewards} gem={gem} skills={skills} relics={relics} ultimates={ultimates} onPick={handlePickReward} onReroll={handleReroll} hasRerolled={hasRerolled} isElite={isEliteReward} classId={classData?.id} meta={meta} expedition={currentExpedition} />}
            {screen === 'victory' && <VictoryScreen classData={classData} enemy={currentEnemy ? ENEMIES[currentEnemy] : null} gains={victoryGains} stats={victoryStats} onContinue={handleVictoryContinue} />}
            {screen === 'event' && currentEvent && <EventScreen event={currentEvent} classData={classData} stats={{ ...classData.stats, ...stats }} skills={skills} gold={gold} gem={gem} autoPlay={autoHunt} autoSpeed={autoSpeed} onResolve={handleEventResolve} />}
            {screen === 'rest' && <RestScreen classData={classData} hp={hp} maxHp={maxHp} skills={skills} stats={{ ...classData?.stats, ...stats }} activeSkills={activeSkills} activeRelicNames={activeRelicNames} relics={relics} ultimates={ultimates} engravingFx={getCombinedClassFx(meta, classData?.id)} meta={meta} expedition={currentExpedition} onChoice={handleRestChoice} />}
            {screen === 'prep' && <PrepScreen classData={classData} skills={skills} stats={{ ...classData?.stats, ...stats }} relics={relics} ultimates={ultimates} engravingFx={getCombinedClassFx(meta, classData?.id)} meta={meta} expedition={currentExpedition} mode="full" onConfirm={handlePrepConfirm} />}
            {screen === 'reselect' && <PrepScreen classData={classData} skills={skills} stats={{ ...classData?.stats, ...stats }} relics={relics} ultimates={ultimates} engravingFx={getCombinedClassFx(meta, classData?.id)} meta={meta} expedition={currentExpedition} mode={reselectMode} currentActiveSkills={activeSkills} currentActiveRelicNames={activeRelicNames} onConfirm={handleReselectConfirm} />}
            {screen === 'shop' && <ShopScreen gold={gold} skills={skills} relics={relics} ultimates={ultimates} curses={currentCurses} autoPlay={autoHunt} autoSpeed={autoSpeed} onBuy={handleShopBuy} onLeave={handleShopLeave} classId={classData?.id} hp={hp} maxHp={maxHp} beltCount={belt.length} beltSlots={beltSlots} />}
            {screen === 'forge' && <ForgeScreen relics={relics} skills={skills} activeRelicNames={activeRelicNames} meta={meta} onCombine={handleForgeCombine} onLeave={handleForgeLeave} />}
            {screen === 'chapterClear' && chapter && <ChapterClearScreen chapter={chapter} isLastChapter={false} hp={hp} maxHp={maxHp} meta={meta} curses={currentCurses} onContinue={handleChapterContinue} />}
            {screen === 'expeditionClear' && currentExpedition && <ExpeditionClearScreen expedition={currentExpedition} soulsGained={runSouls} firstClear={runFirstChampClear} runStats={runStats} titleDrop={currentExpedition.isMasters ? mastersDrop : null} retreat={runRetreat} runTime={runClearTime} onContinue={handleExpeditionClearContinue} />}
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
            {/* 1.99.4~ 데이터 선택 복구 — 로컬·클라우드 진행도 급락 감지 시에만 표시 */}
            {recoveryChoice && (() => {
              const fmt = (m) => {
                const awaken = Object.values(m?.engravings || {}).reduce((s, e) => s + (e?.lv || 0), 0);
                return {
                  saved: m?.lastSavedAt ? new Date(m.lastSavedAt).toLocaleString('ko-KR') : '기록 없음',
                  souls: m?.souls || 0, kills: m?.totalKills || 0, runs: m?.totalRuns || 0, awaken,
                };
              };
              const L = fmt(recoveryChoice.local);
              const C = fmt(recoveryChoice.cloud);
              const Card = ({ title, d, pick, color }) => (
                <div className="flex-1 p-3" style={{ borderRadius: 12, background: `${color}12`, border: `1.5px solid ${color}` }}>
                  <div className="text-[11px] font-bold mb-1.5" style={{ color }}>{title}</div>
                  <div className="space-y-0.5 text-[10.5px] tabular-nums" style={{ color: PALETTE.text }}>
                    <div>마지막 저장: <b>{d.saved}</b></div>
                    <div>영혼 ✦<b>{d.souls}</b> · 각성도 합 <b>{d.awaken}</b></div>
                    <div>누적 처치 <b>{d.kills}</b> · 원정 <b>{d.runs}</b>회</div>
                  </div>
                  <button onClick={() => resolveRecovery(pick)} className="ui-press w-full mt-2 py-2 text-[11px] font-bold"
                    style={{ borderRadius: 10, background: `${color}30`, border: `1px solid ${color}`, color: PALETTE.text }}>
                    이 데이터 사용
                  </button>
                </div>
              );
              return (
                <div className="absolute inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.92)' }}>
                  <div className="w-full max-w-md p-4" style={{ background: PALETTE.bgDeep, border: `1.5px solid ${PALETTE.legendary}`, borderRadius: 16 }}>
                    <div className="text-center text-[13px] font-bold mb-1" style={{ color: PALETTE.legendary }}>⚠ 데이터 선택 필요</div>
                    <div className="text-[10.5px] text-center mb-3" style={{ color: PALETTE.textDim, lineHeight: 1.5 }}>
                      이 기기의 데이터와 클라우드 데이터의 진행도가 크게 다릅니다.<br />
                      <b style={{ color: PALETTE.accent }}>어느 쪽을 유지할지 직접 선택하세요 — 선택하지 않은 쪽은 덮어써집니다.</b>
                    </div>
                    <div className="flex gap-2.5">
                      <Card title="📱 이 기기 데이터" d={L} pick="local" color={PALETTE.green} />
                      <Card title="☁️ 클라우드 데이터" d={C} pick="cloud" color={PALETTE.ice} />
                    </div>
                    <div className="text-[9px] text-center mt-2.5" style={{ color: PALETTE.textDim }}>
                      보통 진행도(영혼·처치·각성도)가 큰 쪽이 본래 데이터입니다. 저장 시각이 최신이라도 진행도가 낮다면 오염된 데이터일 수 있습니다.
                    </div>
                  </div>
                </div>
              );
            })()}
          </PhoneFrame>
    </ResponsiveLayout>
  );
}
