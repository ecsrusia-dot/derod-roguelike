// ============================================
// chronicle/tower.js — 황혼 연대기 무한 탑 「황혼의 첨탑」 (1.215.0)
// ============================================
// 설계서 7.3절: 1층 = 1전투 · 10층마다 보스 · 층마다 적 레벨 +1 · 10층 단위 체크포인트 ·
//   ✪ 첨탑 주화(층 비례) → 첨탑 상점 · 캐릭터별 최고 층 + 주간 기록(월요일 초기화)
// 데이터 + 순수 함수만 (engine.js가 import). 밸런스는 TOWER 한 곳.
// ============================================
import { CHRONICLE_FIELDS, CHRONICLE_DUNGEONS } from './data.js';
const TOWER_FIELDS = CHRONICLE_FIELDS.filter(f => !f.depth); // 심층 지역(1.294.0)은 테마 순환에서 제외

export const TOWER = {
  unlockField: 4,               // 마계의 균열 보스 처치 후 개방
  baseLv: 48,                   // 1층 적 레벨 = 49
  lvPerFloor: 1,
  multPerFloor: 0.02,           // 레벨 상승 외 층당 HP·공격 +2%
  bossEvery: 10,
  eliteEvery: 5,                // 5·15·25층… 강적 층
  // 층 사이 회복은 던전과 같은 CHRONICLE_TUNING.dungeonFloorHeal (25%)
  solo: { hp: 0.7, atk: 0.8 },  // 던전 솔로 보정과 같은 결 (층당 1~2마리)
  coins: (floor) => 2 + Math.floor(floor / 5),          // 일반 층 주화
  bossCoinMult: 5,                                       // 보스 층 = 일반 층 ×5
  uniqueChance: (floor) => Math.min(0.2, 0.05 + 0.015 * (Math.floor(floor / 10) - 1)), // 10층 5% → 110층 20%
  weeklyBonus: (floor) => floor * 3,                     // 이번 주 처음 도달한 10층 단위마다 보너스 주화
};

// 첨탑 상점 — 주화로 구매 (모든 캐릭터 공유)
export const TOWER_SHOP = [
  { id: 'shards', name: '📜 계약서 조각 ×10', desc: '사역마 소환 1회분', cost: 50 },
  { id: 'key', name: '🗝 던전 열쇠', desc: '던전 입장권 1개 (최대 보유량까지)', cost: 40 },
  { id: 'ancient', name: '◆ 고대 파편 ×5', desc: '에픽 승급 재료', cost: 50 },
  { id: 'essence', name: '✦ 정수 ×40', desc: '강화·승급 재료', cost: 30 },
  { id: 'unique', name: '🎁 유니크 선택 상자', desc: '지금 직업(또는 공용) 유니크 중 하나를 골라 얻는다 · 아이템 레벨 = 내 레벨', cost: 600 },
];

export const towerUnlocked = (progress) => !!progress?.bossCleared?.[TOWER.unlockField];
export const isTowerBoss = (floor) => floor % TOWER.bossEvery === 0;
export const towerEnemyLv = (floor) => TOWER.baseLv + floor * TOWER.lvPerFloor;
export const towerArea = (floor) => {
  const m = 1 + TOWER.multPerFloor * floor;
  return { hpMult: m * TOWER.solo.hp, atkMult: m * TOWER.solo.atk };
};

// 적 풀 — 층 10개 단위로 사냥터 테마가 바뀐다 (1~10층 = 북부 극지대 … 순환)
const FIELD_BOSSES = TOWER_FIELDS.map(f => f.boss);
const DUNGEON_BOSSES = CHRONICLE_DUNGEONS.map(d => d.floors[d.floors.length - 1].enemies[0]);
export function towerTheme(floor) {
  const i = Math.floor((floor - 1) / TOWER.bossEvery) % TOWER_FIELDS.length;
  return TOWER_FIELDS[i];
}
// 보스 순환: 사냥터 보스 → 던전 보스 번갈아
export function towerBossKey(floor) {
  const n = floor / TOWER.bossEvery - 1;
  const list = n % 2 === 0 ? FIELD_BOSSES : DUNGEON_BOSSES;
  return list[Math.floor(n / 2) % list.length];
}
// → { type, picks: [key…] } (레벨·배율은 engine이 붙인다)
export function towerFloorPicks(floor, rng) {
  if (isTowerBoss(floor)) return { type: 'towerBoss', picks: [towerBossKey(floor)] };
  const th = towerTheme(floor);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  if (floor % TOWER.eliteEvery === 0) return { type: 'towerElite', picks: [pick(th.elites), pick(th.normals)] };
  const n = rng() < 0.5 ? 1 : 2;
  return { type: 'towerFloor', picks: Array.from({ length: n }, () => pick(th.normals)) };
}

// 주간 키 — 한국 시간 월요일 0시 기준
export function kstWeekKey(now = Date.now()) {
  const d = new Date(now + 9 * 3600 * 1000);
  const day = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
