// =========== 전투 스킬 ===========
// type: physical / magic / defense / buff
// baseDmg: [최소, 최대]
// cost: 에테르 소모량
// cd: 쿨다운 턴 수
// pierce: 방어 무시
// hitCount: 다중 히트 횟수
// berserker: HP 낮을수록 데미지 증가
// selfDmg: 자해 데미지
// forceBleed: 출혈 강제 부여
// dodgeBuff: 회피율 보너스
// buff: 'rage' 등 버프 키
export const COMBAT_SKILLS = {
  // 방랑검사
  참격: { name: '참격', cost: 0, cd: 0, type: 'physical', baseDmg: [20, 26], desc: '기본 검 공격' },
  관통: { name: '관통', cost: 2, cd: 2, type: 'physical', baseDmg: [32, 40], desc: '방어 무시', pierce: true },
  방검: { name: '방검', cost: 1, cd: 2, type: 'defense', defense: 30, desc: '방어 +30' },
  // 술법사
  마법탄: { name: '마법탄', cost: 0, cd: 0, type: 'magic', baseDmg: [18, 24], desc: '기본 마법' },
  정념폭발: { name: '정념폭발', cost: 2, cd: 3, type: 'magic', baseDmg: [42, 52], desc: '강력한 마법' },
  결계: { name: '결계', cost: 1, cd: 1, type: 'defense', defense: 50, desc: '방어 +50' },
  화염장막: { name: '화염장막', cost: 1, cd: 1, type: 'defense', defense: 40, desc: '방어 +40. 공격한 적에게 화염 각인 50% 반사 (1회).', reflectIgnite: 50 },
  // 혼혈 마족
  광폭참격: { name: '광폭참격', cost: 0, cd: 0, type: 'physical', baseDmg: [22, 30], desc: 'HP 낮을수록 ↑', berserker: true },
  '피의 일격': { name: '피의 일격', cost: 1, cd: 2, type: 'physical', baseDmg: [27, 35], desc: '자해+출혈', selfDmg: 10, forceBleed: true },
  광기: { name: '광기', cost: 2, cd: 3, type: 'buff', buff: 'rage', desc: '2턴 데미지+30% (광기의 분노)' },
  // 정령사
  정밀사격: { name: '정밀사격', cost: 0, cd: 0, type: 'physical', baseDmg: [18, 24], desc: '기본 활 공격' },
  연속화살: { name: '연속화살', cost: 2, cd: 3, type: 'physical', baseDmg: [15, 19], hitCount: 3, desc: '3연발' },
  바람결계: { name: '바람결계', cost: 1, cd: 1, type: 'defense', defense: 30, desc: '방어+회피', dodgeBuff: 30 },
  // 여명의 사제
  신성광선: { name: '신성광선', cost: 0, cd: 0, type: 'magic', baseDmg: [17, 25], desc: '신성 데미지+자가 회복 10', selfHeal: 10 },
  축복: { name: '축복', cost: 1, cd: 3, type: 'buff', buff: 'rage', desc: '2턴 데미지+30% (여명의 축복)' },
  가호: { name: '가호', cost: 2, cd: 2, type: 'defense', defense: 50, desc: '방어 +50, HP 회복 +15', selfHeal: 15 },
};

