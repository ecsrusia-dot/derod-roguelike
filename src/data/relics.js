import { PASSIVE_SKILLS } from './passives.js';

// =========== 유물 ===========
// statBonus: 스탯형 효과
//   - dmgDealt: 주는 데미지 % 증가
//   - dmgTaken: 받는 데미지 % 감소 (음수)
//   - critRate: 치명타율 % 증가
//   - critDmg: 치명타 데미지 % 증가
//   - dodge: 회피율 % 증가
//   - maxHp: 최대 HP % 증가
//   - startGold: 시작 은화 +
//   - startGem: 시작 보석 +
//   - heal: 회복 효과 % 증가
//   - reflect: 받은 데미지 % 반사
//   - lifesteal: 적 처치 시 HP 회복 +
//   - shieldOnStart: 전투 시작 시 방어 +
export const RELICS = [
  // === 공격 계열 ===
  { name: '레카르도의 검편', statBonus: { dmgDealt: 10 }, weight: 5, color: '#c4c4d4',
    desc: '주는 데미지 +10%' },
  { name: '마족의 발톱', statBonus: { critRate: 15 }, weight: 5, color: '#8b1f1f',
    desc: '치명타율 +15%' },
  { name: '명검 로비아의 파편', statBonus: { critDmg: 30 }, weight: 4, color: '#e8b04a',
    desc: '치명타 데미지 +30%' },
  { name: '마왕의 송곳니', statBonus: { lifesteal: 8 }, weight: 3, color: '#5c1a1a',
    desc: '적 처치 시 HP +8' },
  { name: '광기의 가면', statBonus: { dmgDealt: 20, dmgTaken: 10 }, weight: 3, color: '#c4453d',
    desc: '주는 데미지 +20%, 받는 데미지 +10%' },
  
  // === 방어 계열 ===
  { name: '네잎 클로버', statBonus: { dodge: 10 }, weight: 5, color: '#7a9a5e',
    desc: '회피율 +10%' },
  { name: '수신사의 가면', statBonus: { dmgTaken: -10 }, weight: 5, color: '#d4a574',
    desc: '받는 데미지 -10%' },
  { name: '에테르의 결정', statBonus: { maxHp: 20 }, weight: 4, color: '#5c4a8c',
    desc: '최대 HP +20%' },
  { name: '수호의 방패', statBonus: { shieldOnStart: 25 }, weight: 4, color: '#7ba3c4',
    desc: '전투 시작 시 방어 +25' },
  { name: '가시 갑옷', statBonus: { reflect: 20 }, weight: 3, color: '#8b8378',
    desc: '받은 데미지의 20% 반사' },
  
  // === 회복 / 자원 계열 ===
  { name: '대지의 심장', statBonus: { heal: 50 }, weight: 4, color: '#9ad4a3',
    desc: '모든 회복 효과 +50%' },
  { name: '왕의 보고', statBonus: { startGold: 80, startGem: 5 }, weight: 4, color: '#e8b04a',
    desc: '시작 은화 +80, 시작 보석 +5' },
  { name: '현자의 서', statBonus: { magicDmg: 10 }, weight: 4, color: '#5c4a8c',
    desc: '마법 데미지 +10%' },
  { name: '황혼의 모래시계', statBonus: { cdReduceChance: 20 }, weight: 4, color: '#d4a574',
    desc: '매 턴 20% 확률로 모든 스킬 쿨다운 -1턴' },
  { name: '천리안', statBonus: { mapReveal: 1 }, weight: 4, color: '#7ba3c4',
    desc: '맵의 모든 노드 공개 (사전 루트 파악)' },

  // === 신규 일반 유물 ===
  // 공격축
  { name: '사냥꾼의 활시위', statBonus: { critRate: 8, dmgDealt: 5 }, weight: 4, color: '#7a9a5e',
    desc: '치명타율 +8%, 주는 데미지 +5%' },
  { name: '뱀파이어의 인장', statBonus: { lifesteal: 12 }, weight: 3, color: '#5c1a1a',
    desc: '적 처치 시 HP +12' },
  { name: '폭풍의 인장', statBonus: { critDmg: 20, dmgDealt: 5 }, weight: 3, color: '#5c4a8c',
    desc: '치명타 데미지 +20%, 주는 데미지 +5%' },
  // 방어축
  { name: '강철의 맹세', statBonus: { dmgTaken: -8, maxHp: 10 }, weight: 4, color: '#8b8378',
    desc: '받는 데미지 -8%, 최대 HP +10%' },
  { name: '거룩한 부적', statBonus: { dodge: 8, shieldOnStart: 15 }, weight: 4, color: '#d4d4a0',
    desc: '회피율 +8%, 전투 시작 시 방어 +15' },
  // 유틸·회복·자원축
  { name: '여명의 깃털', statBonus: { heal: 30, startGem: 3 }, weight: 4, color: '#d4a574',
    desc: '회복 효과 +30%, 시작 보석 +3' },
  { name: '상인의 저울', statBonus: { startGold: 120 }, weight: 4, color: '#e8b04a',
    desc: '시작 은화 +120' },
  { name: '시간의 모래', statBonus: { cdReduceChance: 15, mapReveal: 1 }, weight: 3, color: '#7ba3c4',
    desc: '매 턴 15% 확률 쿨다운 -1, 맵 노드 공개' },

  // === 챔피언십 전용 유물 (해당 원정 클리어 시 해금) ===
  // championshipUnlock: 어느 챔피언십에서 해금되는지
  // 일반 풀 weight = 0 (랜덤 미등장), 해금 후 프렙 단계에서 선택 가능
  { name: '한기의 결정', statBonus: { frostbiteResist: 50, magicDmg: 5 }, weight: 0, color: '#9bc4e0',
    desc: '동상 데미지 -50%, 마법 데미지 +5% (북부 극지대 클리어 시 해금)',
    championshipUnlock: 'frost' },
  { name: '광기의 송곳니', statBonus: { berserkResist: 50, dmg: 8 }, weight: 0, color: '#7a9a5e',
    desc: '적 광폭 누적 -50%, 데미지 +8% (죽은자의 숲 클리어 시 해금)',
    championshipUnlock: 'forest' },
  { name: '봉인의 인장', statBonus: { sealResist: 50, cdReduceChance: 15 }, weight: 0, color: '#5c4a8c',
    desc: '봉인 저항 +50%, 매 턴 15% 확률 쿨다운 -1 (봉인된 신전 클리어 시 해금)',
    championshipUnlock: 'sanctum' },
  { name: '균열의 핵', statBonus: { shockResist: 50, critRate: 10 }, weight: 0, color: '#8b1f1f',
    desc: '받는 충격 -50%, 치명타율 +10% (마계의 균열 클리어 시 해금)',
    championshipUnlock: 'rift' },
  { name: '여명의 성배', statBonus: { antiHeal: 50, dmgDealt: 8 }, weight: 0, color: '#d4a574',
    desc: '적 회복 효과 -50%, 주는 데미지 +8% (여명의 회랑 클리어 시 해금)',
    championshipUnlock: 'dawn' },
];

// =========== 황혼의 대장간 조합식 ===========
// 유물 2개 → 패시브 +1레벨
// 직업 전용 패시브 (심안류, 이프리트) 제외
// 정의되지 않은 조합 또는 이미 Lv.7인 패시브 시도 시 → 영혼 +50 보상만
export const FORGE_RECIPES = [
  { ingredients: ['레카르도의 검편', '광기의 가면'], result: '강타' },
  { ingredients: ['마왕의 송곳니', '가시 갑옷'], result: '잔혹' },
  { ingredients: ['현자의 서', '에테르의 결정'], result: '마력' },
  { ingredients: ['대지의 심장', '수신사의 가면'], result: '신앙' },
  { ingredients: ['마족의 발톱', '명검 로비아의 파편'], result: '정밀' },
  { ingredients: ['수호의 방패', '가시 갑옷'], result: '수비' },
  { ingredients: ['네잎 클로버', '수신사의 가면'], result: '회피' },
  { ingredients: ['에테르의 결정', '대지의 심장'], result: '재생' },
  { ingredients: ['황혼의 모래시계', '왕의 보고'], result: '가속' },
  { ingredients: ['왕의 보고', '네잎 클로버'], result: '운명' },
  { ingredients: ['광기의 가면', '마왕의 송곳니'], result: '광폭' },
  { ingredients: ['천리안', '마족의 발톱'], result: '심안' },
  // === 신규 레시피 (새 유물 ↔ 기존 유물 조합) ===
  // 공격축
  { ingredients: ['사냥꾼의 활시위', '명검 로비아의 파편'], result: '정밀' },
  { ingredients: ['뱀파이어의 인장', '레카르도의 검편'], result: '잔혹' },
  { ingredients: ['폭풍의 인장', '광기의 가면'], result: '강타' },
  { ingredients: ['뱀파이어의 인장', '마왕의 송곳니'], result: '광폭' },
  // 방어축
  { ingredients: ['강철의 맹세', '수호의 방패'], result: '수비' },
  { ingredients: ['거룩한 부적', '네잎 클로버'], result: '회피' },
  { ingredients: ['강철의 맹세', '에테르의 결정'], result: '재생' },
  // 유틸·회복·자원
  { ingredients: ['여명의 깃털', '대지의 심장'], result: '신앙' },
  { ingredients: ['상인의 저울', '왕의 보고'], result: '운명' },
  { ingredients: ['시간의 모래', '황혼의 모래시계'], result: '가속' },
  { ingredients: ['시간의 모래', '현자의 서'], result: '마력' },
  // 신규 ↔ 신규 (희귀 조합)
  { ingredients: ['사냥꾼의 활시위', '거룩한 부적'], result: '심안' },
  { ingredients: ['폭풍의 인장', '강철의 맹세'], result: '광폭' },
];

// 조합 도우미: 두 유물 이름으로 조합식 검색 (순서 무관)
export function findRecipe(relicName1, relicName2) {
  const set = new Set([relicName1, relicName2]);
  return FORGE_RECIPES.find(r => 
    r.ingredients.length === 2 && 
    r.ingredients.every(i => set.has(i))
  );
}
// 가중치 기반 랜덤 추출. 가중치가 클수록 더 자주 등장.
// 이 함수는 PASSIVE_SKILLS와 RELICS를 합쳐 동적으로 풀을 생성합니다.
export function buildRewardPool(currentClassId = null) {
  return [
    // 패시브 스킬 (직업 전용은 자기 직업일 때만 등장, weight ×1.2 부스트)
    ...Object.entries(PASSIVE_SKILLS)
      .filter(([_, sk]) => !sk.classOnly || sk.classOnly === currentClassId)
      .map(([name, sk]) => ({ 
        type: 'skill', 
        name, 
        weight: sk.classOnly ? Math.floor(28 * 1.2) : 28  // 직업 전용 ×1.2 = 33
      })),
    // 능력치
    { type: 'stat', name: '근력', value: 2, weight: 10 },
    { type: 'stat', name: '민첩', value: 2, weight: 10 },
    { type: 'stat', name: '지능', value: 2, weight: 10 },
    { type: 'stat', name: '매력', value: 2, weight: 10 },
    { type: 'stat', name: '최대 체력', value: 25, weight: 14 },
    // 회복
    { type: 'heal', value: 50, weight: 16 },
    { type: 'heal', value: 100, weight: 6 },
    { type: 'heal_full', weight: 3 },
    // 유물 (RELICS에서 자동 추가, weight 0인 챔피언십 전용 유물 제외)
    ...RELICS.filter(r => (r.weight || 0) > 0).map(r => ({ type: 'relic', ...r })),
    // 재화
    { type: 'gold', value: 80, weight: 10 },
    { type: 'gem', value: 3, weight: 5 },
  ];
}

// =========== 상점 가격표 ===========
// 보상 타입별 상점 가격 (은화)
// 일반 전투 드롭이 30~50, 강적 60~90이므로
// 가격은 노드 1~2개 클리어 비용 수준으로 책정
export const SHOP_PRICES = {
  skill: 250,         // 패시브 +1Lv (가장 가치 있음)
  // relic 제거 - 유물은 상점 판매 금지 (보상으로만 획득)
  stat: 180,          // 능력치 +2 (영구 효과)
  heal_full: 200,     // 완전 회복 (전투 직후 매우 가치)
  heal_100: 130,      // 회복 100
  heal_50: 70,        // 회복 50
  default: 100,
};

