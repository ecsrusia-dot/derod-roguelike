// ============================================
// derod-roguelike — 게임 콘텐츠 데이터 진입점
// ============================================
// 실제 콘텐츠는 src/data/ 하위 파일들에 분리되어 있습니다.
// 모든 호출부의 `from '../data.js'` import는 기존 그대로 유지됩니다 (re-export).
//
// 분리 구조 (1.41.0 → 1.42.0 인프라):
//   - version.js     : GAME_VERSION / VERSION_DATE / VERSION_LABEL
//   - passives.js    : PASSIVE_SKILLS + ULTIMATE_SKILLS (각성 스킬)
//   - classes.js     : CLASSES + CLASS_ULTIMATES (소울 스킬)
//   - skills.js      : COMBAT_SKILLS (액티브 스킬)
//   - enemies.js     : ENEMIES
//   - chapters.js    : CHAPTERS
//   - events.js      : EVENTS (텍스트 사건)
//   - relics.js      : RELICS + FORGE_RECIPES + findRecipe + buildRewardPool + SHOP_PRICES
//   - config.js      : GAME_CONFIG + PREP_CONFIG
//   - expeditions.js : EXPEDITIONS + CHAMPIONSHIPS + CHAMPIONSHIP_* + CHAMPIONSHIP_EXP_IDS
//   - curses.js      : CURSES
//   - meta.js        : META_UPGRADES + SOUL_REWARDS + ACHIEVEMENTS
//   - engravings.js  : ENGRAVING_TIERS + ENGRAVING_GACHA_COST + ENGRAVING_AWAKENING_TABLE + ENGRAVINGS
//   - changelog.js   : CHANGELOG + CHANGE_TYPES (기존)
// ============================================

export * from './data/version.js';
export * from './data/passives.js';
export * from './data/classes.js';
export * from './data/skills.js';
export * from './data/enemies.js';
export * from './data/chapters.js';
export * from './data/events.js';
export * from './data/relics.js';
export * from './data/config.js';
export * from './data/expeditions.js';
export * from './data/curses.js';
export * from './data/meta.js';
export * from './data/engravings.js';
export * from './data/raid.js';
export * from './data/gamble.js';
export * from './data/masters.js';
export * from './data/titles.js';
export * from './data/potions.js';
export * from './data/hof.js';
export * from './data/buried.js';
