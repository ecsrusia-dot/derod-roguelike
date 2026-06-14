// =========== 직업 각인 시스템 (1.25.0~) ===========
// 각성도(Lv.1~10) + 각인 슬롯 3칸 + 등급별 가챠
// PR 2: 데이터 + UI + 마이그레이션. 전투 적용은 PR 3에서.

// 등급별 가중치 (총 100%). 각인 가챠 결과의 분포 결정.
// 1.46.0~ 가중치 조정 (PM 결정): 부정(결함+저주) 비중 5%→15%로 증가 — 빌드 다양성·리스크 강화
export const ENGRAVING_TIERS = {
  C:         { weight: 40, color: '#cccccc', label: 'Common',    glow: false },
  R:         { weight: 25, color: '#7ba3c4', label: 'Rare',      glow: false },
  E:         { weight: 15, color: '#9b5fc4', label: 'Epic',      glow: true  },
  L:         { weight: 5,  color: '#e8b04a', label: 'Legendary', glow: true  },
  NEG_FLAW:  { weight: 8,  color: '#777777', label: '결함',       glow: false },
  NEG_CURSE: { weight: 7,  color: '#444444', label: '저주',       glow: true  },
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
// 1.61.0~ demonblood 전용 패시브 혈광 신설 → Lv.4·Lv.10 보상에서 잔혹 → 혈광으로 교체.
const _DEMONBLOOD_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '근력', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '혈광', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '강타', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'physDmg', pct: 5 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '근력', value: 3 },
    { type: 'statPctBonus', key: 'physDmg', pct: 5 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '혈광', delta: 1 },
    { type: 'passiveBonus', skill: '강타', delta: 1 },
  ]}},
];
// 1.59.0~ elf 전용 패시브 풍령 신설 → Lv.4·Lv.10 보상에서 회피 → 풍령으로 교체.
const _ELF_REWARDS = [
  { lv: 2,  cost: 500,   reward: { type: 'slotUnlock', slot: 1 } },
  { lv: 3,  cost: 1000,  reward: { type: 'statBonus', stat: '민첩', value: 2 } },
  { lv: 4,  cost: 2000,  reward: { type: 'passiveBonus', skill: '풍령', delta: 1 } },
  { lv: 5,  cost: 4000,  reward: { type: 'slotUnlock', slot: 2 } },
  { lv: 6,  cost: 8000,  reward: { type: 'passiveBonus', skill: '정밀', delta: 1 } },
  { lv: 7,  cost: 12000, reward: { type: 'statPctBonus', key: 'dodge', pct: 5 } },
  { lv: 8,  cost: 16000, reward: { type: 'slotUnlock', slot: 3 } },
  { lv: 9,  cost: 22000, reward: { type: 'composite', parts: [
    { type: 'statBonus', stat: '민첩', value: 3 },
    { type: 'statPctBonus', key: 'dodge', pct: 5 },
  ]}},
  { lv: 10, cost: 30000, reward: { type: 'composite', parts: [
    { type: 'passiveBonus', skill: '풍령', delta: 1 },
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
  // 1.46.0~ 술법사 풀 24장 (균형 컨셉 — 이프리트 화염 + 마력 마법 + 영겁 소울)
  // effect 키: int·startHp·cha / magicDmgPct·critRate·dodgeRate / igniteDmgPct·magicSoulBonus /
  //            igniteApplyPct·soulOnIgniteApply·igniteSuppress (신규, 술법사 전용) /
  //            startSoul·perTurnSoul·soulGainMult / -dmgTakenPct·-dodgeRate·perTurnHpLoss
  sage: [
    // === Common (5) ===
    { id: 'eng_sage_focus',      tier: 'C', name: '집중된 사고',  desc: '지능 +2',                        effect: { int: 2 } },
    { id: 'eng_sage_robe',       tier: 'C', name: '술사의 로브',  desc: '시작 HP +30',                    effect: { startHp: 30 } },
    { id: 'eng_sage_breath',     tier: 'C', name: '주문의 호흡',  desc: '매 턴 시작 시 소울 게이지 +1',   effect: { perTurnSoul: 1 } },
    { id: 'eng_sage_ember',      tier: 'C', name: '작은 불씨',    desc: '마법 데미지 +3%',                effect: { magicDmgPct: 3 } },
    { id: 'eng_sage_charm',      tier: 'C', name: '매혹의 미소',  desc: '매력 +2',                        effect: { cha: 2 } },

    // === Rare (5) ===
    { id: 'eng_sage_arcane',     tier: 'R', name: '비전(秘傳)의 흐름', desc: '마법 데미지 +5%',                              effect: { magicDmgPct: 5 } },
    { id: 'eng_sage_flame_seed', tier: 'R', name: '불의 씨앗',         desc: '화염 각인 데미지 +20%',                        effect: { igniteDmgPct: 20 } },
    { id: 'eng_sage_chant',      tier: 'R', name: '영창의 가락',       desc: '화염 각인 부여 시 소울 게이지 +3',             effect: { soulOnIgniteApply: 3 } },
    { id: 'eng_sage_ignite_rate',tier: 'R', name: '예리한 정신',       desc: '화염 각인 부여 확률 +10%',                     effect: { igniteApplyPct: 10 } },
    { id: 'eng_sage_wisdom',     tier: 'R', name: '현자의 통찰',       desc: '지능 +4',                                      effect: { int: 4 } },

    // === Epic (5) ===
    { id: 'eng_sage_pyro',       tier: 'E', name: '파이로카인의 권능', desc: '마법 데미지 +7% / 치명타 발동율 +3%',         effect: { magicDmgPct: 7, critRate: 3 } },
    { id: 'eng_sage_inferno',    tier: 'E', name: '이프리트의 화신',  desc: '화염 각인 데미지 +40%',                       effect: { igniteDmgPct: 40 } },
    { id: 'eng_sage_chant_loud', tier: 'E', name: '강령의 영창',      desc: '마법 시전 시 소울 게이지 +3',                 effect: { magicSoulBonus: 3 } },
    { id: 'eng_sage_meditation', tier: 'E', name: '명상의 결실',      desc: '전투 시작 시 소울 게이지 +15',                effect: { startSoul: 15 } },
    { id: 'eng_sage_soul_speed', tier: 'E', name: '영혼 가속',        desc: '소울 게이지 획득 +20%',                       effect: { soulGainMult: 0.20 } },

    // === Legendary (2) ===
    { id: 'eng_sage_inferno_seal', tier: 'L', name: '화신(火神)의 인장', desc: '마법 데미지 +10% / 화염 각인 데미지 +50%',                     effect: { magicDmgPct: 10, igniteDmgPct: 50 } },
    { id: 'eng_sage_arch_mage',    tier: 'L', name: '대마법사의 권위',    desc: '마법 시전 시 소울 게이지 +3 / 매 턴 소울 +2',                effect: { magicSoulBonus: 3, perTurnSoul: 2 } },

    // === Flaw (결함, 4) ===
    { id: 'eng_sage_flaw_fatigue',  tier: 'NEG_FLAW', name: '주문의 피로',  desc: '매 턴 HP -3 (자가 피해)',         effect: { perTurnHpLoss: 3 } },
    { id: 'eng_sage_flaw_brittle',  tier: 'NEG_FLAW', name: '약한 육체',     desc: '받는 데미지 +10%',                effect: { dmgTakenPct: 10 } },
    { id: 'eng_sage_flaw_slow',     tier: 'NEG_FLAW', name: '느린 발걸음',   desc: '회피 발동율 -8%',                 effect: { dodgeRate: -8 } },
    { id: 'eng_sage_flaw_unfocus',  tier: 'NEG_FLAW', name: '흐트러진 정신', desc: '치명타 발동율 -8%',               effect: { critRate: -8 } },

    // === Curse (저주, 3) ===
    { id: 'eng_sage_curse_pyro',     tier: 'NEG_CURSE', name: '파이로마니아의 광기', desc: '화염 각인 데미지 +50% / 소울 게이지 획득 -25%',          effect: { igniteDmgPct: 50, soulGainMult: -0.25 } },
    { id: 'eng_sage_curse_arcane',   tier: 'NEG_CURSE', name: '금단의 마법진',       desc: '화염 각인 부여 확률 +100% / 매 턴 HP -5',                effect: { igniteApplyPct: 100, perTurnHpLoss: 5 } },
    { id: 'eng_sage_curse_oblivion', tier: 'NEG_CURSE', name: '망각의 인장',         desc: '마법 시전 시 소울 게이지 +4 / 화염 각인 부여 0%로 고정', effect: { magicSoulBonus: 4, igniteSuppress: true } },
  ],
  // 1.57.0~ 혼혈 마족 풀 24장 (물리·분노·자해·소울 컨셉 — wanderer 반격/sage 화염과 차별화)
  // effect 키: str·startHp / physDmgPct·critRate / startSoul·perTurnSoul·dodgeSoul·soulGainMult /
  //            perTurnHpLoss (자해·마이너 키) / counter 계열은 sub (wanderer가 메인이라 1~2장만)
  //            -dmgTakenPct·-dodgeRate·-critRate·-startHp (결함·저주)
  demonblood: [
    // === Common (5) ===
    { id: 'eng_dem_strength',    tier: 'C', name: '마족의 완력',  desc: '근력 +2',                       effect: { str: 2 } },
    { id: 'eng_dem_skin',        tier: 'C', name: '마족의 가죽',  desc: '시작 HP +30',                   effect: { startHp: 30 } },
    { id: 'eng_dem_anger',       tier: 'C', name: '작은 분노',    desc: '물리 데미지 +3%',               effect: { physDmgPct: 3 } },
    { id: 'eng_dem_pulse',       tier: 'C', name: '분노의 맥박',  desc: '매 턴 시작 시 소울 게이지 +1',  effect: { perTurnSoul: 1 } },
    { id: 'eng_dem_fang',        tier: 'C', name: '날카로운 송곳니', desc: '치명타율 +3%',               effect: { critRate: 3 } },

    // === Rare (5) ===
    { id: 'eng_dem_rage',        tier: 'R', name: '폭주의 시동',   desc: '물리 데미지 +8%',              effect: { physDmgPct: 8 } },
    { id: 'eng_dem_bloodlust',   tier: 'R', name: '피의 갈망',     desc: '전투 시작 시 소울 게이지 +10', effect: { startSoul: 10 } },
    { id: 'eng_dem_savage',      tier: 'R', name: '잔혹한 일격',   desc: '치명타율 +5%',                 effect: { critRate: 5 } },
    { id: 'eng_dem_demon_blood', tier: 'R', name: '마왕의 핏줄',   desc: '근력 +4',                      effect: { str: 4 } },
    { id: 'eng_dem_legacy',      tier: 'R', name: '마왕의 유산',   desc: '시작 HP +50',                  effect: { startHp: 50 } },

    // === Epic (5) ===
    { id: 'eng_dem_berserker',   tier: 'E', name: '광폭의 입문',   desc: '물리 데미지 +12% / 매 턴 HP -3 (자해)',  effect: { physDmgPct: 12, perTurnHpLoss: 3 } },
    { id: 'eng_dem_fury',        tier: 'E', name: '분노의 폭발',   desc: '치명타율 +10%',                          effect: { critRate: 10 } },
    { id: 'eng_dem_ramp',        tier: 'E', name: '분노의 가속',   desc: '매 턴 시작 시 소울 게이지 +3',           effect: { perTurnSoul: 3 } },
    { id: 'eng_dem_ignition',    tier: 'E', name: '광기의 점화',   desc: '전투 시작 시 소울 게이지 +15',           effect: { startSoul: 15 } },
    { id: 'eng_dem_shadow_rage', tier: 'E', name: '잔영의 분노',   desc: '회피 시 소울 게이지 +5',                 effect: { dodgeSoul: 5 } },

    // === Legendary (2) ===
    { id: 'eng_dem_demon_king',  tier: 'L', name: '마왕(魔王)의 권위', desc: '물리 데미지 +20% / 매 턴 HP -5 (자해)',  effect: { physDmgPct: 20, perTurnHpLoss: 5 } },
    { id: 'eng_dem_blood_fury',  tier: 'L', name: '핏빛 분노',          desc: '치명타율 +15% / 전투 시작 시 소울 +20',  effect: { critRate: 15, startSoul: 20 } },

    // === Flaw (결함, 4) ===
    { id: 'eng_dem_flaw_brittle', tier: 'NEG_FLAW', name: '드러난 살갗',  desc: '받는 데미지 +10%',  effect: { dmgTakenPct: 10 } },
    { id: 'eng_dem_flaw_slow',    tier: 'NEG_FLAW', name: '둔한 육체',    desc: '회피율 -8%',        effect: { dodgeRate: -8 } },
    { id: 'eng_dem_flaw_tremor',  tier: 'NEG_FLAW', name: '떨리는 분노',  desc: '치명타율 -10%',     effect: { critRate: -10 } },
    { id: 'eng_dem_flaw_heart',   tier: 'NEG_FLAW', name: '불안정한 심장', desc: '시작 HP -30',      effect: { startHp: -30 } },

    // === Curse (저주, 3) ===
    { id: 'eng_dem_curse_demon',     tier: 'NEG_CURSE', name: '마왕의 가호',   desc: '물리 데미지 +30% / 받는 데미지 +25%',        effect: { physDmgPct: 30, dmgTakenPct: 25 } },
    { id: 'eng_dem_curse_bloodrage', tier: 'NEG_CURSE', name: '피의 분노',     desc: '전투 시작 시 소울 +30 / 매 턴 HP -8 (자해)', effect: { startSoul: 30, perTurnHpLoss: 8 } },
    { id: 'eng_dem_curse_madness',   tier: 'NEG_CURSE', name: '광기의 송곳니', desc: '치명타율 +25% / 소울 게이지 획득 -25%',      effect: { critRate: 25, soulGainMult: -0.25 } },
  ],
  // 1.59.0~ 숲의 정령사 풀 24장 (회피·치명타·민첩·바람·정령 컨셉 — wanderer 반격 / sage 화염 / demonblood 자해와 차별화)
  // effect 키: dex·cha·startHp / dodgeRate·critRate·physDmgPct·afterDodgeDmg /
  //            startSoul·perTurnSoul·dodgeSoul·soulGainMult /
  //            -dmgTakenPct·-dodgeRate·-critRate·-startHp·perTurnHpLoss (결함·저주)
  elf: [
    // === Common (5) ===
    { id: 'eng_elf_sight',     tier: 'C', name: '정밀한 시야',  desc: '민첩 +2',                       effect: { dex: 2 } },
    { id: 'eng_elf_breath',    tier: 'C', name: '정령의 호흡',  desc: '매 턴 시작 시 소울 게이지 +1',  effect: { perTurnSoul: 1 } },
    { id: 'eng_elf_string',    tier: 'C', name: '가벼운 활시위', desc: '회피율 +2%',                   effect: { dodgeRate: 2 } },
    { id: 'eng_elf_grace',     tier: 'C', name: '매혹의 기품',  desc: '매력 +2',                       effect: { cha: 2 } },
    { id: 'eng_elf_forest',    tier: 'C', name: '숲의 가호',    desc: '시작 HP +30',                   effect: { startHp: 30 } },

    // === Rare (5) ===
    { id: 'eng_elf_wind_step', tier: 'R', name: '바람의 발걸음', desc: '회피율 +5%',                   effect: { dodgeRate: 5 } },
    { id: 'eng_elf_arrow_flow',tier: 'R', name: '화살의 흐름',   desc: '물리 데미지 +8%',              effect: { physDmgPct: 8 } },
    { id: 'eng_elf_whisper',   tier: 'R', name: '정령의 속삭임', desc: '치명타율 +5%',                 effect: { critRate: 5 } },
    { id: 'eng_elf_kinship',   tier: 'R', name: '풍령의 친화',   desc: '회피 시 소울 게이지 +3',       effect: { dodgeSoul: 3 } },
    { id: 'eng_elf_instinct',  tier: 'R', name: '사수의 직감',   desc: '민첩 +4',                      effect: { dex: 4 } },

    // === Epic (5) ===
    { id: 'eng_elf_gale_strike', tier: 'E', name: '풍속의 일격', desc: '회피율 +5% / 치명타율 +5%',                        effect: { dodgeRate: 5, critRate: 5 } },
    { id: 'eng_elf_spirit_seal', tier: 'E', name: '정령각인',    desc: '물리 데미지 +12% / 치명타율 +5%',                  effect: { physDmgPct: 12, critRate: 5 } },
    { id: 'eng_elf_accel',       tier: 'E', name: '정령가속',    desc: '매 턴 시작 시 소울 게이지 +3',                    effect: { perTurnSoul: 3 } },
    { id: 'eng_elf_sky_seal',    tier: 'E', name: '천공의 인장', desc: '전투 시작 시 소울 게이지 +15',                    effect: { startSoul: 15 } },
    { id: 'eng_elf_arrow_charm', tier: 'E', name: '화살 부적',   desc: '회피 후 다음 공격 데미지 +30%',                   effect: { afterDodgeDmg: 30 } },

    // === Legendary (2) ===
    { id: 'eng_elf_wind_god',     tier: 'L', name: '풍신(風神)의 가호', desc: '회피율 +12% / 회피 시 소울 게이지 +5',             effect: { dodgeRate: 12, dodgeSoul: 5 } },
    { id: 'eng_elf_sky_authority',tier: 'L', name: '천공(天空)의 권위', desc: '치명타율 +15% / 물리 데미지 +15%',                effect: { critRate: 15, physDmgPct: 15 } },

    // === Flaw (결함, 4) ===
    { id: 'eng_elf_flaw_blunt',   tier: 'NEG_FLAW', name: '무딘 화살촉', desc: '물리 데미지 -10%',  effect: { physDmgPct: -10 } },
    { id: 'eng_elf_flaw_bow',     tier: 'NEG_FLAW', name: '약한 활시위', desc: '시작 HP -30',       effect: { startHp: -30 } },
    { id: 'eng_elf_flaw_tremor',  tier: 'NEG_FLAW', name: '떨리는 손끝', desc: '치명타율 -10%',     effect: { critRate: -10 } },
    { id: 'eng_elf_flaw_dull',    tier: 'NEG_FLAW', name: '둔한 발걸음', desc: '회피율 -8%',        effect: { dodgeRate: -8 } },

    // === Curse (저주, 3) ===
    { id: 'eng_elf_curse_wind_madness', tier: 'NEG_CURSE', name: '풍령의 광기', desc: '회피율 +15% / 받는 데미지 +25%',          effect: { dodgeRate: 15, dmgTakenPct: 25 } },
    { id: 'eng_elf_curse_sky',          tier: 'NEG_CURSE', name: '천공의 저주', desc: '치명타율 +25% / 회피율 -15%',             effect: { critRate: 25, dodgeRate: -15 } },
    { id: 'eng_elf_curse_spirit_burn',  tier: 'NEG_CURSE', name: '정령의 폭주', desc: '소울 게이지 획득 +50% / 매 턴 HP -5',     effect: { soulGainMult: 0.5, perTurnHpLoss: 5 } },
  ],
  priest: [],
};
