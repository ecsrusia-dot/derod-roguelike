// =========== 패시브 스킬 ===========
// effect 필드는 문자열 키. 실제 동작은 메인 코드의 trigger handler에서 처리.
// minorEffect: Lv.1부터 매 Lv마다 누적되는 작은 효과
// tiers: Lv.3, 5, 7에 발현되는 마일스톤 효과
export const PASSIVE_SKILLS = {
  강타: {
    axis: 'attack', maxLv: 7, color: '#c4453d',
    desc: '공격 시 충격 게이지 누적, 100 도달 시 기절',
    minorEffect: { type: 'physDmg+', perLv: 3, desc: '물리 데미지 +3/Lv' },
    tiers: {
      3: { text: '공격 시 충격 게이지 +30 (100 시 기절 1턴)', trigger: 'onAttack', effect: 'applyShockGauge' },
      5: { text: '충격 게이지 누적량 +10, 기절 시 추가 데미지', trigger: 'passive', effect: 'shockBonus' },
      7: { text: '기절한 적에게 +50% 데미지', trigger: 'passive', effect: 'shockExploit' }
    }
  },
  정밀: {
    axis: 'attack', maxLv: 7, color: '#d4a574',
    desc: '치명타·명중 강화',
    minorEffect: { type: 'critRate+', perLv: 3, desc: '치명타율 +3%/Lv' },
    tiers: {
      3: { text: '치명타 시 적 방어 50% 무시', trigger: 'passive', effect: 'critPierce' },
      5: { text: '치명타 데미지 배율 ×1.5 → ×1.8', trigger: 'passive', effect: 'critDmg+30' },
      7: { text: '약점 자동 간파 (방어 무시)', trigger: 'passive', effect: 'pierceArmor' }
    }
  },
  잔혹: {
    axis: 'attack', maxLv: 7, color: '#8b1f1f',
    desc: '출혈·즉사 효과',
    minorEffect: { type: 'bleedDmg+', perLv: 1, desc: '출혈 1스택당 데미지 +1/Lv' },
    tiers: {
      3: { text: '공격 시 출혈 부여 (3턴, 5+α 데미지)', trigger: 'onAttack', effect: 'applyBleed' },
      5: { text: '출혈 중첩 가능 (최대 5스택)', trigger: 'passive', effect: 'bleedStack' },
      7: { text: 'HP 20% 이하 적 즉사 (15%)', trigger: 'onAttack', effect: 'execute' }
    }
  },
  마력: {
    axis: 'attack', maxLv: 7, color: '#5c4a8c',
    desc: '마법 데미지 강화',
    minorEffect: { type: 'magicDmg+', perLv: 5, desc: '마법 데미지 +5%/Lv' },
    tiers: {
      3: { text: '마법 데미지 추가 +30%', trigger: 'passive', effect: 'magicDmg+30' },
      5: { text: '에테르 비용 -1 (최소 0)', trigger: 'passive', effect: 'etherCost-20' },
      7: { text: '마법 공격 시 50% 확률로 재시전', trigger: 'passive', effect: 'magicEcho' }
    }
  },
  회피: {
    axis: 'defense', maxLv: 7, color: '#7a9a5e',
    desc: '회피율 증가',
    minorEffect: { type: 'dodge+', perLv: 4, desc: '회피율 +4%/Lv' },
    tiers: {
      3: { text: '회피 추가 +15%', trigger: 'passive', effect: 'dodge+15' },
      5: { text: '회피 시 70% 확률로 반격', trigger: 'onDodge', effect: 'counterAttack' },
      7: { text: '첫 피격 무효 (전투당 1회)', trigger: 'onCombatStart', effect: 'firstHitImmune' }
    }
  },
  수비: {
    axis: 'defense', maxLv: 7, color: '#7ba3c4',
    desc: '방어 게이지 강화',
    minorEffect: { type: 'startDef+', perLv: 5, desc: '시작 방어 +5/Lv' },
    tiers: {
      3: { text: '시작 방어 추가 +30', trigger: 'onCombatStart', effect: 'startDefense+30' },
      5: { text: '받는 모든 데미지 -20% (마법 포함)', trigger: 'passive', effect: 'dmgTaken-20' },
      7: { text: '방어 50% 이상일 때 받는 데미지 50% 차단', trigger: 'passive', effect: 'fortify' }
    }
  },
  재생: {
    axis: 'defense', maxLv: 7, color: '#9ad4a3',
    desc: '체력 회복',
    minorEffect: { type: 'maxHp+', perLv: 10, desc: '최대 체력 +10/Lv (영구)' },
    tiers: {
      3: { text: '매 턴 종료 시 HP +3', trigger: 'onTurnStart', effect: 'regenPerTurn' },
      5: { text: '전투 시작 시 HP 30% 회복', trigger: 'onCombatStart', effect: 'heal30%' },
      7: { text: 'HP 30% 이하 시 전투당 1회 부활', trigger: 'onLethal', effect: 'revive' }
    }
  },
  가속: {
    axis: 'utility', maxLv: 7, color: '#e8b04a',
    desc: '추가 행동',
    minorEffect: { type: 'cdReduce+', perLv: 1, desc: '쿨다운 -1턴 (Lv.4마다 누적)' },
    tiers: {
      3: { text: '4턴마다 추가 턴 획득', trigger: 'onTurnStart', effect: 'extraTurn', interval: 4 },
      5: { text: '3턴마다 추가 턴', trigger: 'onTurnStart', effect: 'extraTurn', interval: 3 },
      7: { text: '2턴마다 추가 턴', trigger: 'onTurnStart', effect: 'extraTurn', interval: 2 }
    }
  },
  심안: {
  axis: 'utility', maxLv: 7, color: '#7ba3c4',
  desc: '시야와 인지',
  minorEffect: { type: 'dodge+', perLv: 3, desc: '회피율 +3%/Lv' },
  tiers: {
    3: { text: '적의 행동을 어렴풋이 감지한다 (공격/방어 구분)', trigger: 'passive', effect: 'predictIntent' },
    5: { text: '적의 다음 스킬명을 파악한다. 회피율 +10%', trigger: 'passive', effect: 'detailIntent' },
    7: { text: '적의 약점을 파악한다 (수치 확인). 치명타 +10%, 치명타 데미지 +50%', trigger: 'passive', effect: 'weaknessPoint' }
  }
},
  신앙: {
    axis: 'utility', maxLv: 7, color: '#d4a574',
    desc: '신의 가호',
    minorEffect: { type: 'allStats+', perLv: 2, desc: '모든 능력치 +2/Lv' },
    tiers: {
      3: { text: '5턴마다 다음 공격 치명타 확정', trigger: 'onTurnStart', effect: 'guaranteeCrit', interval: 5 },
      5: { text: '치명적 피격 30% 회피', trigger: 'onLethal', effect: 'divineSave' },
      7: { text: '수신사 등극 - 신탁 마법', trigger: 'passive', effect: 'oracleUser' }
    }
  },
  운명: {
    axis: 'utility', maxLv: 7, color: '#5c4a8c',
    desc: '여명/황혼 게이지',
    minorEffect: { type: 'rewardChoice+', perLv: 1, desc: '보상 시 추가 보석 +1/Lv' },
    tiers: {
      3: { text: '보석 리롤 비용 -1', trigger: 'passive', effect: 'rerollDiscount' },
      5: { text: '보상 1회 추가 (3중1 → 4중1)', trigger: 'passive', effect: 'extraReward' },
      7: { text: '운명 카드 1회 재선택', trigger: 'passive', effect: 'fateReroll' }
    }
  },
  
  // === 직업 전용 패시브 ===
  // classOnly: 해당 직업만 시작 시 보유. 보상 풀에서 등장하지 않음.
  심안류: {
    axis: 'utility', maxLv: 7, color: '#c4453d',
    desc: '맹인 검사의 감각 극대화. 공격을 흘리고 반격한다',
    classOnly: 'wanderer',
    minorEffect: { type: 'counterStat+', perLv: 5, desc: '반격율 +5%/Lv, 반격 데미지 +5%/Lv' },
    tiers: {
      3: { text: '반격 확률 +20%', trigger: 'passive', effect: 'counterRate+20' },
      5: { text: '반격 데미지 +20%, 반격 시 받는 데미지 30% 차단', trigger: 'passive', effect: 'counterShield' },
      7: { text: '반격 데미지 +20%, 반격 시 다음 턴 반드시 치명타', trigger: 'passive', effect: 'counterCrit' }
    }
  },
  이프리트: {
    axis: 'utility', maxLv: 7, color: '#ff6b35',
    desc: '불의 정령왕의 힘. 마법으로 화염 각인을 부여하고 치명타로 폭발시킨다',
    classOnly: 'sage',
    minorEffect: { type: 'ifritIgniteRate+', perLv: 2, desc: '화염 각인 발동율 +2%/Lv (패시브만 보유 시 기본 30%·궁극 보유 시 기본 70%에 누적. 치명타 시 폭발, 3턴, 지능×0.3/턴, 방어무시)' },
    tiers: {
      3: { text: '지능 +2, 방어 무시 +5', trigger: 'passive', effect: 'ifritT3' },
      5: { text: '지능 +3 (누적 +5), 방어 무시 +10 (누적 +15)', trigger: 'passive', effect: 'ifritT5' },
      7: { text: '궁극 진화 게이트 (다음 보상부터 영겁지화·화신강림·연옥지화 등장)', trigger: 'passive', effect: 'ifritT7' }
    }
  },
};


// =========== 궁극 스킬 ===========
// Lv.7 도달 후 같은 패시브를 다시 획득하면 "궁극 진화" 가능.
// 한 패시브당 3개 궁극 분기. 진화 시:
//   - 해당 패시브 Lv → 0 리셋 (보상 풀에 다시 등장)
//   - 유물로 올린 경우 유물도 소멸
//   - 3개 궁극 모두 획득 시 보상 풀에서 영구 제외
// 
// 각 궁극은 ID 기준으로 활성화 여부 추적 (player.ultimates 배열)
export const ULTIMATE_SKILLS = {
  강타: [
    {
      id: '강타_광역폭발',
      name: '광역 폭발',
      desc: '공격 시 적 충격 게이지 +60. 기절 발동 시 광역 폭발(주변 데미지 30 추가).',
      effect: 'ult_shockBlast',
      color: '#c4453d',
    },
    {
      id: '강타_즉시처형',
      name: '즉시 처형',
      desc: '충격 게이지 100 도달 시 즉시 적 HP 25% 제거.',
      effect: 'ult_shockExecute',
      color: '#c4453d',
    },
    {
      id: '강타_영구침묵',
      name: '영구 침묵',
      desc: '한 번 기절시킨 적은 매 턴 시작 시 25% 확률로 또 기절.',
      effect: 'ult_perpetualStun',
      color: '#c4453d',
    },
  ],
  잔혹: [
    {
      id: '잔혹_피의축제',
      name: '피의 축제',
      desc: '출혈 데미지 ×2. 출혈 적 처치 시 HP 30 흡수.',
      effect: 'ult_bloodFeast',
      color: '#8b1f1f',
    },
    {
      id: '잔혹_사형선고',
      name: '사형 선고',
      desc: '즉사 조건 HP 35% 이하로 확장, 확률 30%로 증가.',
      effect: 'ult_deathSentence',
      color: '#8b1f1f',
    },
    {
      id: '잔혹_광기각성',
      name: '광기 각성',
      desc: 'HP 50% 이하 시 모든 데미지 +50%. 출혈 자가 부여로도 발동.',
      effect: 'ult_madness',
      color: '#8b1f1f',
    },
  ],
  마력: [
    {
      id: '마력_시간역행',
      name: '시간 역행',
      desc: '마법 공격 쿨다운 제거 + 에테르 +1.',
      effect: 'ult_timeRewind',
      color: '#5c4a8c',
    },
    {
      id: '마력_정념폭주',
      name: '정념 폭주',
      desc: '마법 데미지 ×2.0, 모든 마법 스킬 쿨다운 -1.',
      effect: 'ult_aetherStorm',
      color: '#5c4a8c',
    },
    {
      id: '마력_신탁각성',
      name: '신탁 각성',
      desc: '마법 공격 시 50% 확율로 3회 시전 (마력 Lv.7 대체).',
      effect: 'ult_oracleAwaken',
      color: '#5c4a8c',
    },
  ],
  신앙: [
    {
      id: '신앙_여명의축복',
      name: '여명의 축복',
      desc: '매 턴 HP +5, 모든 회복 효과 +50%.',
      effect: 'ult_derodBlessing',
      color: '#d4a574',
    },
    {
      id: '신앙_황혼의저주',
      name: '황혼의 저주',
      desc: '받는 데미지 -25%. 적 공격 시 30% 확률로 적이 자해.',
      effect: 'ult_deblanCurse',
      color: '#5c4a8c',
    },
    {
      id: '신앙_운명의저울',
      name: '운명의 저울',
      desc: '치명적 피격 시 100% 회피 (전투당 2회). 모든 능력치 +10.',
      effect: 'ult_destinyScale',
      color: '#d4a574',
    },
  ],
  // === 다른 패시브의 궁극은 향후 콘텐츠 확장에서 추가 ===
  // (정밀, 회피, 수비, 재생, 가속, 심안, 운명)
  // 위 4개 패시브는 핵심 빌드 축이라 우선 구현. 나머지는 일반 Lv.7 효과로 충분.
  
  // === 직업 전용 궁극 (방랑검사) ===
  심안류: [
    {
      id: '심안류_명경지수',
      name: '명경지수',
      desc: '반격 확률 +60%, 반격 데미지 +100%, 회피율 +10%.\n반격 발생 시 다음 턴 회피율 +30%.\n적 공격 회피 후 반격 시 반격 데미지 +100%.',
      effect: 'ult_counterMirror',
      color: '#7ba3c4',
    },
    {
      id: '심안류_검로일여',
      name: '검로일여',
      desc: '반격 확률 +60%, 반격 데미지 +150%.\n반격 발생 시 충격 게이지 +50 (100시 기절).\n기절한 적 공격 시 치명타 발생.',
      effect: 'ult_counterShock',
      color: '#e8b04a',
    },
    {
      id: '심안류_무영검',
      name: '무영검',
      desc: '반격 확률 +60%, 반격 데미지 +100%, 치명타 +15%.\n반격 발생 시 다음 턴 반드시 치명타.\n반격 실패 시 데미지 +50% 누적 (제한 없음). 반격 발동 시 누적 초기화.',
      effect: 'ult_counterShadow',
      color: '#5c4a8c',
    },
  ],
  // === 직업 전용 궁극 (술법사) ===
  이프리트: [
    {
      id: '이프리트_영겁지화',
      name: '영겁지화',
      desc: '영원·누적의 화염. 장기전 DoT 빌드.\n지능 +10. 화염 각인 발동 70%.\n화염 각인이 갱신되지 않고 스택 누적 (발동마다 지능×0.5씩 추가).\n화염 각인 영구 지속 (999T).\n화염 각인 미발동 시 다음 발동율 +10% (각인 발동까지 누적, 발동 시 초기화).\n치명타 시 화염 각인·겁화 폭발 비활성.\n* 이프리트 패시브는 보상 풀에서 영구 제외.',
      effect: 'ult_eternalFire',
      color: '#ff4500',
    },
    {
      id: '이프리트_화신강림',
      name: '화신강림',
      desc: '폭발·관통의 화염. 광폭 폭딜 빌드.\n지능 +10. 방어 무시 +25 (절대값).\n화염 각인 발동 70%, 각인 데미지 지능×0.4, 지속 3턴.\n치명타 시 화염 각인 + 겁화 모두 폭발 → 화염 각인 폭발 시 다음 1턴 치명타 확률 +30% (겁화 폭발은 보너스 미적용, 중복 방지).\n* 이프리트 패시브는 보상 풀에서 영구 제외.',
      effect: 'ult_ifritDescent',
      color: '#ff6b35',
    },
    {
      id: '이프리트_연옥지화',
      name: '연옥지화',
      desc: '시너지·지속의 화염. 안정 콤보 빌드.\n지능 +10. 화염 각인 발동 70%, 각인 데미지 지능×0.3, 지속 4턴.\n치명타 시 화염 각인 + 겁화 모두 폭발.\n화염 각인 또는 겁화 보유 적 공격 시 마법 데미지 +20% (부여 턴 미적용).\n화염 각인 또는 겁화 보유 적 처치 시 즉시 HP +50 (회복 유물·매력 시그니처·저주 적용).\n* 이프리트 패시브는 보상 풀에서 영구 제외.',
      effect: 'ult_purgatoryFire',
      color: '#ff8c42',
    },
  ],
};

