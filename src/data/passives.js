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
  // 1.55.0~ 광폭 — forge 결과 패시브 (마왕의 송곳니 계열 3레시피).
  // 1.55.1 픽스:
  //   (a) classOnly: '__forge_only__' 센티넬 추가 → buildRewardPool에서 자동 제외 (실제 직업 ID와 매칭 불가)
  //   (b) tiers를 자해·반격 컨셉으로 재설계 — 잔혹·정밀과 effect 키 충돌(applyBleed/critPierce/execute) 제거
  //   마이너 효과(physDmg+4/Lv)는 강타(+3/Lv) 대비 강화 — 대장간 결과물 차별화.
  광폭: {
    axis: 'attack', classOnly: '__forge_only__', maxLv: 7, color: '#7a1818',
    desc: '마족의 광기 — 자해와 분노로 폭주',
    minorEffect: { type: 'physDmg+', perLv: 4, desc: '물리 데미지 +4/Lv' },
    tiers: {
      3: { text: '매 턴 시작 시 자해 -5 HP (분노 점화)', trigger: 'onTurnStart', effect: 'berserkSelfHit' },
      5: { text: '치명타율 +15%', trigger: 'passive', effect: 'berserkCrit' },
      7: { text: '가하는 물리 데미지 +15%', trigger: 'passive', effect: 'berserkRage' }
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
    desc: '마법 데미지 강화 + 재시전',
    // 1.45.3 너프: minor +5%→+3%/Lv. Lv3/5/7 효과 모두 재시전 확률 추가(+5/+10/+15)로 변경 — 누적 합산 (Lv7 만렙 총 30%)
    minorEffect: { type: 'magicDmg+', perLv: 3, desc: '마법 데미지 +3%/Lv' },
    tiers: {
      3: { text: '마법 공격 시 재시전 확률 +5% (누적)', trigger: 'passive', effect: 'magicEcho+5' },
      5: { text: '마법 공격 시 재시전 확률 +10% (누적, Lv3 포함 +15%)', trigger: 'passive', effect: 'magicEcho+10' },
      7: { text: '마법 공격 시 재시전 확률 +15% (누적, 만렙 총 +30%)', trigger: 'passive', effect: 'magicEcho+15' }
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
      5: { text: '전투 시작 시 HP 5% 회복', trigger: 'onCombatStart', effect: 'heal5%' },
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
  혈광: {
    axis: 'attack', maxLv: 7, color: '#7a1818',
    desc: '마왕의 피. 잃은 HP만큼 강해지고, 위기에서 폭발한다',
    classOnly: 'demonblood',
    minorEffect: { type: 'bloodLostHpPhysDmg+', perLv: 0.5, desc: '잃은 HP 1%당 물리 데미지 +0.5%/Lv (만렙 잃은 100% 기준 +3.5%/% = HP 0이면 +350%)' },
    tiers: {
      3: { text: '매 턴 시작 시 자해 -3 HP, 다음 공격 데미지 +15%', trigger: 'onTurnStart', effect: 'bloodRageTurn' },
      5: { text: 'HP 50% 이하 시 치명타율 +30%', trigger: 'passive', effect: 'bloodLow50Crit' },
      7: { text: 'HP 25% 이하 시 받는 데미지 -50%, 공격 시 30% 흡혈', trigger: 'passive', effect: 'bloodLow25Survive' }
    }
  },
  풍령: {
    axis: 'utility', maxLv: 7, color: '#7a9a5e',
    desc: '바람 정령과의 교감. 회피와 화살이 정령의 흐름을 따라 강해진다',
    classOnly: 'elf',
    minorEffect: { type: 'windDodgeCrit+', perLv: 3, desc: '회피율 +3%/Lv, 치명타율 +2%/Lv' },
    tiers: {
      3: { text: '회피 시 다음 공격 데미지 +50%', trigger: 'onDodge', effect: 'windBoostNext' },
      5: { text: '회피 시 다음 공격 방어 무시 (windBoostNext와 누적)', trigger: 'onDodge', effect: 'windPierceNext' },
      7: { text: '매 턴 시작 시 50% 확률로 정령 화살 1발 즉발 (민첩×1.5 데미지, 방어 무시)', trigger: 'onTurnStart', effect: 'windSpiritArrow' }
    }
  },
  수신: {
    axis: 'utility', maxLv: 7, color: '#d4a574',
    desc: '여명의 가호. 회복과 신성으로 동료를 살리고 죽음을 거부한다',
    classOnly: 'priest',
    minorEffect: { type: 'combatHealPct+', perLv: 5, desc: '회복량 +5%/Lv (만렙 +35%)' },
    tiers: {
      3: { text: '전투 시작 시 가호 1회 (첫 피격 30% 차단)', trigger: 'onCombatStart', effect: 'divineShield30' },
      5: { text: '매 턴 시작 시 HP +5 (회복량 보너스 적용), 회복량 +25% (누적 +60%)', trigger: 'onTurnStart', effect: 'dawnRegen' },
      7: { text: 'HP 0 도달 시 전투당 1회 30% HP로 부활', trigger: 'onLethal', effect: 'dawnRevive' }
    }
  },
};


// =========== 각성 스킬 (Lv.7 궁극 진화) ===========
// 1.43.0~ 직업 전용 패시브만 각성 가능.
//   - wanderer 심안류 (3종) / sage 이프리트 (3종)
//   - 1.82.0~ demonblood 혈광 (3종) / elf 풍령 (3종) / priest 수신 (3종) — 5직업 전원 각성 가능.
//
// 보조 패시브(강타·잔혹·마력·신앙) 4종의 각성스킬 12개는 1.42.0까지 존재했으나 1.43.0에서 폐기.
//   - Lv.7 도달 후엔 추가 픽 시 영혼 보상 등으로 처리 (다른 패시브 픽으로 자연 분산).
//   - 기존 픽 사용자는 자동 마이그레이션으로 meta.ultimates에서 제거.
//
// Lv.7 도달 후 같은 직업 전용 패시브를 다시 획득하면 "궁극 진화" 가능.
// 한 패시브당 3개 궁극 분기. 진화 시:
//   - 해당 패시브 Lv → 0 리셋 (보상 풀에 다시 등장)
//   - 유물로 올린 경우 유물도 소멸
//   - 3개 궁극 모두 획득 시 보상 풀에서 영구 제외
//
// 각 궁극은 ID 기준으로 활성화 여부 추적 (player.ultimates 배열)
export const ULTIMATE_SKILLS = {
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
      desc: '영원·누적의 화염. 장기전 DoT 빌드.\n지능 +10. 화염 각인 발동 70%.\n화염 각인이 갱신되지 않고 스택 누적 (발동마다 지능×0.5씩 추가).\n화염 각인 영구 지속 (999T).\n화염 각인 미발동 시 다음 발동율 +10% (각인 발동까지 누적, 발동 시 초기화).\n치명타 시 화염 각인 폭발 비활성. (1.42.0~ 겁화는 각인폭발에서 영구 제외)\n* 이프리트 패시브는 보상 풀에서 영구 제외.',
      effect: 'ult_eternalFire',
      color: '#ff4500',
    },
    {
      id: '이프리트_화신강림',
      name: '화신강림',
      desc: '폭발·관통의 화염. 광폭 폭딜 빌드.\n지능 +10. 방어 무시 +25 (절대값).\n화염 각인 발동 70%, 각인 데미지 지능×0.4, 지속 3턴.\n치명타 시 화염 각인 폭발 → 다음 1턴 치명타 확률 +30%. (1.42.0~ 겁화는 각인폭발에서 영구 제외 — 화염 각인만 폭발)\n* 이프리트 패시브는 보상 풀에서 영구 제외.',
      effect: 'ult_ifritDescent',
      color: '#ff6b35',
    },
    {
      id: '이프리트_연옥지화',
      name: '연옥지화',
      desc: '시너지·지속의 화염. 안정 콤보 빌드.\n지능 +10. 화염 각인 발동 70%, 각인 데미지 지능×0.3, 지속 4턴.\n치명타 시 화염 각인 폭발. (1.42.0~ 겁화는 각인폭발에서 영구 제외)\n화염 각인 또는 겁화 보유 적 공격 시 마법 데미지 +20% (부여 턴 미적용).\n화염 각인 또는 겁화 보유 적 처치 시 즉시 HP +50 (회복 유물·매력 시그니처·저주 적용).\n* 이프리트 패시브는 보상 풀에서 영구 제외.',
      effect: 'ult_purgatoryFire',
      color: '#ff8c42',
    },
  ],
  // === 직업 전용 궁극 (혼혈 마족) — 1.82.0 ===
  혈광: [
    {
      id: '혈광_혈신강림',
      name: '혈신강림',
      desc: '잃은 HP로 폭발하는 하이리스크 딜 빌드.\n잃은 HP 1%당 물리 데미지 +4% (혈광 패시브의 잃은 HP 보너스와 별도 가산).\nHP 50% 이하 시 치명타율 +30%.',
      effect: 'ult_bloodAvatar',
      color: '#a02020',
    },
    {
      id: '혈광_불사혈맥',
      name: '불사혈맥',
      desc: '흡혈·생존의 지속전 빌드.\n모든 공격에 흡혈 30% (HP 조건 없음 — 상시).\nHP 0 도달 시 전투당 1회 HP 40%로 부활.',
      effect: 'ult_bloodImmortal',
      color: '#c44536',
    },
    {
      id: '혈광_광혈폭주',
      name: '광혈폭주',
      desc: '자해 가속 엔진 빌드.\n매 턴 시작 시 자해 -5% HP (HP 1 미만으로는 안 떨어짐).\n자해 후 다음 공격 데미지 +40%.\n잃은 HP 데미지 빌드와 시너지.',
      effect: 'ult_bloodFrenzy',
      color: '#7a1818',
    },
  ],
  // === 직업 전용 궁극 (숲의 정령사) — 1.82.0 ===
  풍령: [
    {
      id: '풍령_질풍노도',
      name: '질풍노도',
      desc: '회피·반전의 유틸 빌드.\n회피율 +15%, 치명타율 +10%.\n회피 시 다음 공격 데미지 +50% + 방어 무시 (풍령 패시브 없이도 발동).',
      effect: 'ult_windTempest',
      color: '#7a9a5e',
    },
    {
      id: '풍령_정령왕의숨결',
      name: '정령왕의 숨결',
      desc: '자동 포격 빌드.\n매 턴 시작 시 정령왕의 화살 확정 발동 — 민첩×2.5 데미지 (방어 무시).\n풍령 Lv.7의 정령 화살과 별도 1발 (중첩 가능).',
      effect: 'ult_windSpiritKing',
      color: '#9ad4a3',
    },
    {
      id: '풍령_폭풍연격',
      name: '폭풍연격',
      desc: '치명타 연쇄 폭딜 빌드.\n치명타율 +15%.\n치명타 시 40% 확률로 폭풍 일격 추가 (해당 타격의 50% 데미지, 방어 무시).',
      effect: 'ult_windStorm',
      color: '#5e8c5a',
    },
  ],
  // === 직업 전용 궁극 (여명의 사제) — 1.82.0 ===
  수신: [
    {
      id: '수신_성수의흐름',
      name: '성수의 흐름',
      desc: '지속 회복 탱킹 빌드.\n매 턴 시작 시 HP +12 (회복량 보너스 적용).\n모든 회복량 +30% (수신 minor·각인과 누적).',
      effect: 'ult_waterFlow',
      color: '#7ba3c4',
    },
    {
      id: '수신_심판의빛',
      name: '심판의 빛',
      desc: '공격형 사제 빌드.\n매 턴 시작 시 심판의 빛 자동 발동 — 매력×1.5 신성 데미지 (방어 무시).',
      effect: 'ult_waterJudgment',
      color: '#e8d5a3',
    },
    {
      id: '수신_영생의가호',
      name: '영생의 가호',
      desc: '불사 수호 빌드.\n전투 시작 시 여명의 가호 강화 — 피격 3회까지 40% 차단.\nHP 0 도달 시 전투당 1회 HP 50%로 부활.',
      effect: 'ult_waterEternal',
      color: '#d4a574',
    },
  ],
};

