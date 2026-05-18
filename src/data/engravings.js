// =========== 직업 각인 시스템 (1.25.0~) ===========
// 각성도(Lv.1~10) + 각인 슬롯 3칸 + 등급별 가챠
// PR 2: 데이터 + UI + 마이그레이션. 전투 적용은 PR 3에서.

// 등급별 가중치 (총 100%). 각인 가챠 결과의 분포 결정.
export const ENGRAVING_TIERS = {
  C:         { weight: 40, color: '#cccccc', label: 'Common',    glow: false },
  R:         { weight: 30, color: '#7ba3c4', label: 'Rare',      glow: false },
  E:         { weight: 20, color: '#9b5fc4', label: 'Epic',      glow: true  },
  L:         { weight: 5,  color: '#e8b04a', label: 'Legendary', glow: true  },
  NEG_FLAW:  { weight: 3,  color: '#777777', label: '결함',       glow: false },
  NEG_CURSE: { weight: 2,  color: '#444444', label: '저주',       glow: true  },
};

// 가챠 비용 (칸별 1회 변경)
export const ENGRAVING_GACHA_COST = 500;

// 각성도 단계별 보상 (lv 2~10). lv 1은 시작 상태.
// reward 종류:
//   - slotUnlock: { slot } (각인 슬롯 개방 + 즉시 랜덤 각인 1장 부여)
//   - statBonus: { stat: 근력|민첩|지능|매력|statTotal, value } (영구 능력치)
//   - passiveBonus: { skill, delta } (시작 패시브 +Lv)
//   - statPctBonus: { key, pct } (반격율·치명타율 등 % 보너스)
//   - composite: { parts: [reward, reward, ...] } (1.44.0~ 복합 보상)
// PR 2에서는 데이터만 표시. PR 3에서 전투 적용.
// 9단계 활성화 조건 (1.26.0~). 모든 직업 동일 패턴:
//   Lv.2 = 수련의 길 클리어 / Lv.3 = 직업 전용 패시브의 각성 스킬 1개 픽 /
//   Lv.4·6·8 = 챔피언십 normal/hard/hell 5컨셉 올 클리어 /
//   Lv.5 = 직업 전용 패시브의 3 각성 스킬 모두 픽 /
//   Lv.7 = 3개 직업이 Lv.5 이상 / Lv.9 = 5직업 Lv.6 이상 / Lv.10 = 5직업 Lv.8 이상
//
// 1.43.0~ 각성 스킬은 직업 전용 패시브(심안류/이프리트)만 보유.
// demonblood/elf/priest는 직업 전용 패시브 추가 시 Lv.3·Lv.5 활성화.
//
// 1.44.0~ 보상 매트릭스 재설계:
//   슬롯 해금 Lv: 2 → 5 → 8 (이전 2/5/9)
//   Lv.4: 직업 핵심 패시브 +1Lv (심안류·이프리트·잔혹·회피·신앙)
//   Lv.6: 직업 보조 패시브 +1Lv (심안·마력·강타·정밀·재생)
//   Lv.7: 직업별 statPctBonus 5% (반격율·화염각인·물리·회피·전투회복)
//   Lv.9: 능력치 +3 + statPctBonus +5%/10% 복합 (composite)
//   Lv.10: 직업 2 패시브 모두 +1Lv 복합 (composite)
//   ※ demonblood/elf/priest는 전용 패시브 신규 구현 후 변동 예정.
//
// condition.type 종류:
//   - trainingClear: 해당 직업의 수련의 길 클리어
//   - ultimatePickedCount: 해당 직업 런에서 직업 전용 패시브의 각성 스킬 N개 이상 픽
//   - ultimateAllOfOnePassive: 해당 직업 런에서 직업 전용 패시브의 3 각성 스킬 모두 픽
//   - championshipAllClear: 해당 직업 챔피언십 5컨셉 + 지정 난이도 모두 클리어
//   - engravingsLvReached: 임의 직업 N개가 각성도 minLv 이상
const COMMON_AWAKENING_CONDITIONS = [
  { lv: 2,  condition: { type: 'trainingClear' } },
  { lv: 3,  condition: { type: 'ultimatePickedCount', count: 1 } },
  { lv: 4,  condition: { type: 'championshipAllClear', difficulty: 'normal' } },
  { lv: 5,  condition: { type: 'ultimateAllOfOnePassive' } },
  { lv: 6,  condition: { type: 'championshipAllClear', difficulty: 'hard' } },
  { lv: 7,  condition: { type: 'engravingsLvReached', minLv: 5, classCount: 3 } },
  { lv: 8,  condition: { type: 'championshipAllClear', difficulty: 'hell' } },
  { lv: 9,  condition: { type: 'engravingsLvReached', minLv: 6, classCount: 5 } },
  { lv: 10, condition: { type: 'engravingsLvReached', minLv: 8, classCount: 5 } },
];

// 직업별 보상은 직업마다 다름 — 보상만 정의하고 condition은 위 공통 표에서 lv 매칭으로 머지
// 1.44.0 매트릭스: 모든 직업 비용·해금조건 동일. 보상만 직업별 색깔.
const _WANDERER_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '근력', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '심안류', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '심안', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'counterRate', pct: 5 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '근력', value: 3 },
    { type: 'statPctBonus', key: 'counterRate', pct: 5 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '심안류', delta: 1 },
    { type: 'passiveBonus', skill: '심안', delta: 1 },
  ]}},
];
const _SAGE_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '지능', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '이프리트', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '마력', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'igniteRate', pct: 5 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '지능', value: 3 },
    { type: 'statPctBonus', key: 'igniteRate', pct: 5 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '이프리트', delta: 1 },
    { type: 'passiveBonus', skill: '마력', delta: 1 },
  ]}},
];
// ※ demonblood/elf/priest는 전용 패시브 신규 구현 후 변동 예정 (1.44.0 임시).
const _DEMONBLOOD_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '근력', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '잔혹', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '강타', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'physDmg', pct: 5 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '근력', value: 3 },
    { type: 'statPctBonus', key: 'physDmg', pct: 5 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '잔혹', delta: 1 },
    { type: 'passiveBonus', skill: '강타', delta: 1 },
  ]}},
];
const _ELF_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '민첩', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '회피', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '정밀', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'dodge', pct: 5 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '민첩', value: 3 },
    { type: 'statPctBonus', key: 'dodge', pct: 5 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '회피', delta: 1 },
    { type: 'passiveBonus', skill: '정밀', delta: 1 },
  ]}},
];
const _PRIEST_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '매력', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '신앙', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '재생', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'combatHeal', pct: 10 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '매력', value: 3 },
    { type: 'statPctBonus', key: 'combatHeal', pct: 10 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '신앙', delta: 1 },
    { type: 'passiveBonus', skill: '재생', delta: 1 },
  ]}},
];

function _mergeConditions(rewards) {
  return rewards.map(r => {
    const c = COMMON_AWAKENING_CONDITIONS.find(cc => cc.lv === r.lv);
    return c ? { ...r, condition: c.condition } : r;
  });
}

export const ENGRAVING_AWAKENING_TABLE = {
  wanderer:   _mergeConditions(_WANDERER_REWARDS),
  sage:       _mergeConditions(_SAGE_REWARDS),
  demonblood: _mergeConditions(_DEMONBLOOD_REWARDS),
  elf:        _mergeConditions(_ELF_REWARDS),
  priest:     _mergeConditions(_PRIEST_REWARDS),
};

// 만렙 누적 영혼: 500+1000+2000+4000+8000+12000+16000+22000+30000 = 95,500

// 직업별 각인 풀 (PR 2: 방랑검사 24장만 작성. 나머지 4직업은 풀 빈 배열 — UI에 "준비 중" 표시).
// effect 필드 키:
//   - 능력치:        str / dex / int / cha / startHp
//   - 회피·반격:     dodgeRate / counterRatePct / counterDmgPct / counterHitSoul / counterShock / counterCanCrit
//   - 데미지·치명:   physDmgPct / critRate / dmgTakenPct / afterDodgeDmg
//   - 영혼·턴:       perTurnSoul / dodgeSoul / startSoul / soulGainMult / perTurnHpLoss
//   - 시스템:        disableInsightPredict
// PR 2에서는 표시만. PR 3에서 전투 적용.
export const ENGRAVINGS = {
  wanderer: [
    // === Common (5) ===
    { id: 'eng_wan_wrist',     tier: 'C', name: '단련된 손목', desc: '근력 +2',                       effect: { str: 2 } },
    { id: 'eng_wan_reaction',  tier: 'C', name: '빠른 반응',   desc: '민첩 +2',                       effect: { dex: 2 } },
    { id: 'eng_wan_grit',      tier: 'C', name: '검사의 끈기', desc: '시작 HP +30',                   effect: { startHp: 30 } },
    { id: 'eng_wan_light',     tier: 'C', name: '가벼운 옷',   desc: '회피율 +2%',                    effect: { dodgeRate: 2 } },
    { id: 'eng_wan_breath',    tier: 'C', name: '검사의 호흡', desc: '매 턴 시작 시 소울 게이지 +1',  effect: { perTurnSoul: 1 } },
    // === Rare (5) ===
    { id: 'eng_wan_afterimage',   tier: 'R', name: '잔영',         desc: '회피율 +5%',                  effect: { dodgeRate: 5 } },
    { id: 'eng_wan_counter_dmg',  tier: 'R', name: '반격의 손맛',  desc: '반격 데미지 +15%',           effect: { counterDmgPct: 15 } },
    { id: 'eng_wan_flow',         tier: 'R', name: '검의 흐름',    desc: '물리 데미지 +10%',           effect: { physDmgPct: 10 } },
    { id: 'eng_wan_insight_flow', tier: 'R', name: '심안의 흐름',  desc: '회피 시 소울 게이지 +3',     effect: { dodgeSoul: 3 } },
    { id: 'eng_wan_counter_rate', tier: 'R', name: '반격의 회로',  desc: '반격율 +5%',                  effect: { counterRatePct: 5 } },
    // === Epic (5) ===
    { id: 'eng_wan_dodge_counter', tier: 'E', name: '흘림과 베기', desc: '회피율 +5% / 반격율 +5%',                          effect: { dodgeRate: 5, counterRatePct: 5 } },
    { id: 'eng_wan_blind_sense',   tier: 'E', name: '맹인의 감각', desc: '회피율 +9%',                                       effect: { dodgeRate: 9 } },
    { id: 'eng_wan_echo',          tier: 'E', name: '영혼의 반향', desc: '반격 명중 시 소울 게이지 +5',                       effect: { counterHitSoul: 5 } },
    { id: 'eng_wan_shockwave',     tier: 'E', name: '충격파',      desc: '반격 명중 시 적 충격 게이지 +15 (누적 100 시 기절)', effect: { counterShock: 15 } },
    { id: 'eng_wan_battle_start',  tier: 'E', name: '검사의 심득', desc: '전투 시작 시 소울 게이지 +15',                      effect: { startSoul: 15 } },
    // === Legendary (2) ===
    { id: 'eng_wan_shadow_step',   tier: 'L', name: '무영(無影)의 잔영', desc: '회피 후 다음 공격 데미지 +30%',           effect: { afterDodgeDmg: 30 } },
    { id: 'eng_wan_thousand_blade', tier: 'L', name: '천변(千變)의 검',  desc: '반격에 기본 치명률 적용 (반격 치명타 가능)', effect: { counterCanCrit: true } },
    // === Flaw (결함, 4) ===
    { id: 'eng_wan_flaw_feet',   tier: 'NEG_FLAW', name: '둔한 발',   desc: '회피 확률 -5%',                  effect: { dodgeRate: -5 } },
    { id: 'eng_wan_flaw_blade',  tier: 'NEG_FLAW', name: '무딘 검',   desc: '반격 데미지 -15%',               effect: { counterDmgPct: -15 } },
    { id: 'eng_wan_flaw_sense',  tier: 'NEG_FLAW', name: '깨진 감각', desc: '적 다음 행동 감지 불가 - 심안 무효화', effect: { disableInsightPredict: true } },
    { id: 'eng_wan_flaw_tremor', tier: 'NEG_FLAW', name: '떨리는 손', desc: '치명타 확률 -10%',               effect: { critRate: -10 } },
    // === Curse (저주, 3) ===
    { id: 'eng_wan_curse_shadow',  tier: 'NEG_CURSE', name: '묶여버린 그림자', desc: '회피율 -20% / 반격율 +10%',          effect: { dodgeRate: -20, counterRatePct: 10 } },
    { id: 'eng_wan_curse_madness', tier: 'NEG_CURSE', name: '광기의 검',       desc: '반격 데미지 +50% / 받는 데미지 +20%', effect: { counterDmgPct: 50, dmgTakenPct: 20 } },
    { id: 'eng_wan_curse_burn',    tier: 'NEG_CURSE', name: '영혼 폭주',       desc: '소울 게이지 획득량 ×1.5 / 매 턴 시작 시 자동 -5 HP', effect: { soulGainMult: 0.5, perTurnHpLoss: 5 } },
  ],
  // 다른 4직업은 PR 후속에서 풀 작성. 현재는 UI "준비 중" 표시 대응.
  sage: [],
  demonblood: [],
  elf: [],
  priest: [],
};
