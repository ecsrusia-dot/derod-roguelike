// =========== 저주 (원정 2+ 적용) ===========
// 원정 시작 시 curseCount만큼 무작위로 부여
export const CURSES = [
  {
    id: 'curse_fragility',
    name: '깨지기 쉬운 영혼',
    desc: '받는 모든 데미지 +15%',
    effect: 'curse_dmgTaken+15',
    color: '#c4453d',
  },
  {
    id: 'curse_weakness',
    name: '약화의 저주',
    desc: '주는 모든 데미지 -15%',
    effect: 'curse_dmgDealt-15',
    color: '#8b1f1f',
  },
  {
    id: 'curse_drain',
    name: '활력의 고갈',
    desc: '최대 체력 -20%',
    effect: 'curse_maxHp-20',
    color: '#5c4a8c',
  },
  {
    id: 'curse_poverty',
    name: '빈곤의 저주',
    desc: '획득 은화 -50%',
    effect: 'curse_gold-50',
    color: '#d4a574',
  },
  {
    id: 'curse_silence',
    name: '물약 봉인',
    desc: '벨트 물약 사용 불가',
    effect: 'curse_potionSeal',
    color: '#7ba3c4',
  },
  {
    id: 'curse_isolation',
    name: '고립의 저주',
    desc: '시작 시 보석 없음',
    effect: 'curse_noGem',
    color: '#7a9a5e',
  },
  {
    id: 'curse_decay',
    name: '부패의 저주',
    desc: '회복 효과 -50%',
    effect: 'curse_heal-50',
    color: '#9ad4a3',
  },
  {
    id: 'curse_brittleness',
    name: '취약함',
    desc: '시작 방어 0',
    effect: 'curse_noDefense',
    color: '#7ba3c4',
  },
  // === 신규 저주 (1.5.0) ===
  {
    id: 'curse_doom',
    name: '심연의 저주',
    desc: '받는 모든 데미지 +30%',
    effect: 'curse_dmgTaken+30',
    color: '#3a0f1f',
  },
  {
    id: 'curse_drought',
    name: '가뭄의 저주',
    desc: '획득 은화 -25%',
    effect: 'curse_gold-25',
    color: '#a0522d',
  },
  {
    id: 'curse_greed',
    name: '탐욕의 저주',
    desc: '상점 가격 +50%',
    effect: 'curse_shopPrice+50',
    color: '#c46535',
  },
  {
    id: 'curse_envy',
    name: '시기의 저주',
    desc: '전투 보석 보상 -1 (최소 0)',
    effect: 'curse_rewardGem-1',
    color: '#5c4a8c',
  },
];

