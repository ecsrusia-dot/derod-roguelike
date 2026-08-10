// ============================================
// data/gamble.js — 황혼의 도박장 (1.85.0~, PM 확정 신규 콘텐츠)
// ============================================
// PM 확정 설계:
//   - 기존 적 풀 재사용 (챕터 1·2 일반/강적/보스 — 신규 일러·적 데이터 0)
//   - 일일 3회 입장 (KST 자정 리셋)
//   - 3연전 (일반 → 강적 → 보스). 매 승리 후 [챙기기 vs 더블 업] — 패배 시 판돈 전부 소멸
//   - 극악 확률 잭팟: 승리마다 0.5% "황혼의 균열" — 황혼 주화 +500 즉시 확정
//   - 천장: 잭팟 없이 런 종료 시 운명의 조각 +1, 100개 = 주화 500 확정 교환
//   - 신규 재화 황혼 주화(❂): 전용 상점 — 영혼·심연석·군주의 정수 (레이드 연결)
// ============================================

export const TWILIGHT_COIN = { name: '황혼 주화', icon: '❂' };
export const FATE_SHARD = { name: '운명의 조각', icon: '✧' };

export const GAMBLE_CONFIG = {
  dailyLimit: 3,        // 일일 입장 횟수
  potBase: 10,          // 1승 판돈 (이후 승리마다 ×2: 10 → 20 → 40)
  jackpotChance: 0.005, // 승리마다 0.5% 잭팟
  jackpotCoins: 500,    // 잭팟 즉시 지급 주화
  shardPity: 100,       // 조각 천장 — 100개 모으면
  shardPityCoins: 500,  // 주화 500 확정 교환
};

// 전용 상점 — 황혼 주화로만 구매
// 1.86.0 개편 (PM 결정): 레이드 엔드게임에서 포화된 심연석·정수 제거 →
// 다른 수단으로 못 얻는 엔드게임 품목(기연 재조우권·레전더리 각인 확정권)으로 교체
export const GAMBLE_SHOP = [
  { id: 'gshop_souls_s',   name: '영혼 뭉치',            desc: '영혼 +300',  cost: 100, grant: { souls: 300 } },
  { id: 'gshop_souls_l',   name: '대영혼 금고',          desc: '영혼 +1000', cost: 300, grant: { souls: 1000 } },
  { id: 'gshop_secret',    name: '기연 재조우권',        desc: '레이드 기연 조우 이력 초기화 — 놓쳐서 영영 소멸된 비전을 다시 만날 수 있다 (활성 비전은 유지)', cost: 500, grant: { secretReset: true } },
  { id: 'gshop_legendary', name: '레전더리 각인 확정권', desc: '직업·슬롯을 골라 전설(L) 등급 각인 랜덤 1장 확정 장착',                                        cost: 800, grant: { legendaryEngraving: true } },
];

// 도박장 원정 객체 — startExpedition과 호환 (chapters.js의 gamble_arena 챕터 사용)
export function buildGambleExpedition() {
  return {
    id: 'twilight_gamble',
    isGamble: true,
    name: '황혼의 도박장',
    sub: 'Twilight Gamble',
    desc: '판돈을 걸고 세 판 승부. 물러날 타이밍은 스스로 정한다.',
    color: '#e8b04a',
    chapters: ['gamble_arena'],
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    curseCount: 0,
    maxRelicSelect: 1,
    soulReward: 0,          // 원정 클리어 보너스 영혼 없음 — 보상은 주화
    unlockId: null,
    category: 'gamble',
  };
}
