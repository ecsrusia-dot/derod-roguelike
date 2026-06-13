// =========== 직업 ===========
// 5직업 모두 처음부터 사용 가능 (1.24.0~). 챔피언십에서는 해당 직업의
// 수련의 길 클리어 시 사용 가능 (isChampionshipClassUnlocked로 판단).
export const CLASSES = [
  {
    id: 'wanderer', name: '방랑검사', sub: 'Wanderer Path',
    quote: '다녀오겠습니다...',
    desc: '시력을 잃었던 검사. 어둠 속에서도 검을 뻗는다.',
    startSkills: { 심안류: 3, 심안: 2 },
    stats: { 근력: 18, 민첩: 15, 지능: 14, 매력: 11 },
    combatSkills: ['참격', '관통', '방검'],
    ultimateId: 'wanderer_shadowStrike',  // 직업 소울 스킬 (소울 게이지 100 발동)
    color: '#c4453d',
    locked: false,        // 항상 사용 가능 (시작 직업)
    image: './classes/wanderer.jpg',
    winImage: './classes/wandererwin.jpg',
    lossImage: './classes/wandererloss.jpg',
    startImage: './classes/wandererstart.jpg',
    combatImage: './classes/combat/wanderer_combat.jpg',
  },
  {
    id: 'sage', name: '술법사', sub: 'Sorcerer of Tour',
    quote: '다녀올께~ 보고싶어도 참아?',
    desc: '정념계 마법을 익힌 자. 신과 정령의 힘을 빌린다.',
    startSkills: { 이프리트: 3, 마력: 2 },
    stats: { 근력: 8, 민첩: 11, 지능: 20, 매력: 14 },
    combatSkills: ['마법탄', '정념폭발', '화염장막'],
    ultimateId: 'sage_eternalFlame',  // 직업 소울 스킬 (소울 게이지 100 발동)
    color: '#5c4a8c',
    locked: false,
    image: './classes/sage.jpg',
    winImage: './classes/sagewin.jpg',
    lossImage: './classes/sageloss.jpg',
    startImage: './classes/sagestart.jpg',
    combatImage: './classes/combat/sage_combat.jpg',
  },
  {
    id: 'demonblood', name: '혼혈 마족', sub: 'Demon Heritage',
    quote: '걱정마, 밤이되기전에 돌아올께!',
    desc: '마왕의 피가 흐르는 자. 분노가 곧 힘이 된다.',
    startSkills: { 혈광: 3, 강타: 1 },
    stats: { 근력: 19, 민첩: 13, 지능: 13, 매력: 9 },
    combatSkills: ['광폭참격', '피의 일격', '광기'],
    ultimateId: 'demonblood_bloodFury',  // 직업 소울 스킬 (소울 게이지 100 발동)
    color: '#8b1f1f',
    locked: false,
    image: './classes/demonblood.jpg',
    winImage: './classes/demonbloodwin.jpg',
    lossImage: './classes/demonbloodloss.jpg',
    startImage: './classes/demonbloodstart.jpg',
    combatImage: './classes/combat/demonblood_combat.jpg',
  },
  {
    id: 'elf', name: '숲의 정령사', sub: 'Elf of Twilight',
    quote: '바람이 부르는 길로... 다녀올게요',
    desc: '엘프 종족. 숲의 정령과 교감하며 활을 다룬다.',
    startSkills: { 회피: 3, 정밀: 2 },
    stats: { 근력: 11, 민첩: 20, 지능: 14, 매력: 15 },
    combatSkills: ['정밀사격', '연속화살', '바람결계'],
    color: '#7a9a5e',
    locked: false,
    image: './classes/elf.jpg',
    winImage: './classes/elfwin.jpg',
    lossImage: './classes/elfloss.jpg',
    startImage: './classes/elfstart.jpg',
    combatImage: './classes/combat/elf_combat.jpg',
  },
  {
    id: 'priest', name: '여명의 사제', sub: 'Priest of Dawn',
    quote: '여명의 가호 아래... 반드시 돌아오겠습니다.',
    desc: '여명의 가호를 받은 자. 회복과 가호로 동료를 살린다.',
    startSkills: { 신앙: 3, 재생: 2 },
    stats: { 근력: 9, 민첩: 11, 지능: 15, 매력: 19 },
    combatSkills: ['신성광선', '축복', '가호'],
    color: '#d4a574',
    locked: false,
    image: './classes/priest.jpg',
    winImage: './classes/priestwin.jpg',
    lossImage: './classes/priestloss.jpg',
    startImage: './classes/prieststart.jpg',
    combatImage: './classes/combat/priest_combat.jpg',
  },
];

// =========== 직업별 소울 스킬 (소울 게이지 100 발동) ===========
// 전투 중 "소울 게이지(soulGauge, 0~100)"가 100에 도달하면 발동 가능.
// 게이지 충전:
//   - 적에게 데미지 입힐 때: +floor(dmg / 5)
//   - 피격 (실제 피해 > 0): +floor(damage / 3)
//   - 매 턴 시작: +5 자연 충전
//   - 치명타 발동: +10 보너스
// 발동 시 게이지는 0으로 리셋.
//
// 1직업당 1개의 시그니처 궁극 — 클래스 정체성 강화.
// 프로토타입: 방랑검사 1.12.0~, 술법사 1.28.0~. 나머지 3직업(demonblood/elf/priest)은 다음 업데이트.
export const CLASS_ULTIMATES = {
  wanderer_shadowStrike: {
    id: 'wanderer_shadowStrike',
    classId: 'wanderer',
    name: '무영(無影)의 일격',
    quote: '검은 그림자보다 빠르다.',
    desc: '적에게 45 데미지 (방어 무시). 다음 3턴간 반격 확률 100%, 다음 공격 치명타 확정.',
    color: '#c4453d',
    icon: '☄',
    effect: 'classult_shadowStrike',
  },
  sage_eternalFlame: {
    id: 'sage_eternalFlame',
    classId: 'sage',
    name: '영겁(永劫)의 화염',
    quote: '꺼지지 않는다. 영원히.',
    desc: '적에게 50 화염 데미지 (방어 무시). 겁화 100% 부여 (영구 지속, 지능×0.4/턴). 다음 2턴 마법 데미지 +50%. ※ 겁화는 각인폭발 대상에서 제외 — 무한 도트.',
    color: '#ff4500',
    icon: '🔥',
    effect: 'classult_eternalFlame',
  },
  demonblood_bloodFury: {
    id: 'demonblood_bloodFury',
    classId: 'demonblood',
    name: '혈마(血魔)의 격노',
    quote: '내 피의 무게를 가져가라.',
    desc: '적에게 (잃은 HP × 1.5, 최소 50) 데미지 (방어 무시). 다음 3턴 공격 시 50% 흡혈. ※ HP가 낮을수록 강력. HP 0이면 ~max HP × 1.5 데미지 폭발.',
    color: '#7a1818',
    icon: '✸',
    effect: 'classult_bloodFury',
  },
};

