// ============================================
// data/exorcist.js — ⚱ 제령사(除靈師) : 무덤의 유산 포맷 기반 신규 게임 (1.169.0)
// ============================================
// PM 설계 확정 (AskUserQuestion 4건):
//   ① 같은 앱 새 모드 병행 (무덤의 유산 유지)
//   ② 스킬 구조 = 수동 2(무기·보조) + 자동 4(갑주·투구·장신구 ×2) — "안 쓰는 슬롯" 제거
//   ③ 유한 시나리오: 5막 + 종막 (막마다 지역 레벨 고정 = 레벨별 파밍, 내구도·무한층 없음)
//   ④ 사령 활용 = 빙의 특화 (제령부로 잡은 사령을 장비에 깃들여 성장의 핵심으로)
// PM 피드백 반영:
//   1. 무기 스킬만 씀 → 비무기 4슬롯은 조건 자동 발동 (매 전투 6슬롯 전부 일함)
//   2. 한방킬 메타 → 브레이크 게이지(자세 붕괴) + 약점 5속성 — 셋업→브레이크→버스트 3박자
//   3. 내구도 제거 → 막 전환마다 지역 레벨이 크게 뛰어 파밍이 자연 강제됨
//   5. 의외성·기연 → 운명의 방(저확률 고임팩트) + 변이 층 + 제령 도박(실패 시 광포화)
// ⚠️ 밸런스 조정은 이 파일 한 곳 — EXO_TUNING / EXO_ACTS / 적 hpM·atkM
// =========================================================

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (min, max) => min + Math.random() * (max - min);

function weightedPick(list, wf) {
  const total = list.reduce((s, x) => s + wf(x), 0);
  let r = Math.random() * total;
  for (const x of list) { r -= wf(x); if (r <= 0) return x; }
  return list[list.length - 1];
}

// =========================================================
// 1. 튜닝 상수 — 밸런스는 전부 여기서
// =========================================================
export const EXO_TUNING = {
  enemyHpBase: 80,  enemyHpPerLv: 30,
  enemyAtkBase: 9,  enemyAtkPerLv: 2.5,
  enemyDefPerLv: 1.1,
  eliteHpM: 1.7, eliteAtkM: 1.3,
  bossHpM: 3.0,  bossAtkM: 1.5,
  poiseNormal: 60, poiseElite: 140, poiseBoss: 260,
  breakVulnPct: 80,       // 브레이크 중 받는 피해 증가 %
  breakTurns: 2,          // 브레이크 지속 (내 턴 수)
  weaknessBreakMult: 2,   // 약점 속성 적중 시 브레이크 위력 배율
  weaknessDmgPct: 15,     // 약점 속성 적중 시 피해 보너스 %
  basicSpGain: 14,        // 기본 공격 SP 회수
  basicPow: 55,           // 기본 공격 위력 %
  potionHealPct: 35,      // 성수 회복 % (전투당 1회, 행동 소모 없음)
  captureHpPct: 30,       // 제령 가능 적 HP 임계 %
  dropChanceNormal: 45, dropChanceElite: 100, dropChanceBoss: 100,
  talismanElitePct: 35,   // 강적 처치 시 제령부 드랍 %
  goldBase: 22, goldPerLv: 6,
};

// =========================================================
// 2. 시나리오 — 5막 + 종막 (지역 레벨 고정 = 레벨별 파밍)
// =========================================================
export const EXO_ACTS = [
  { id: 1, name: '지하 묘지',     level: 4,  floors: 10, color: '#8b8378', desc: '봉인이 풀린 공동묘지의 아래층. 제령 수행이 시작되는 곳.' },
  { id: 2, name: '침수 성소',     level: 12, floors: 10, color: '#7ba3c4', desc: '검은 물에 잠긴 옛 성소. 익사한 원혼들이 배회한다.' },
  { id: 3, name: '나락 협곡',     level: 21, floors: 10, color: '#b08a5a', desc: '바닥이 보이지 않는 균열. 떨어진 것은 돌아오지 못했다.' },
  { id: 4, name: '심연의 문턱',   level: 31, floors: 10, color: '#9a7ab8', desc: '산 자의 법칙이 끝나는 곳. 어둠이 형체를 갖춘다.' },
  { id: 5, name: '왕의 관',       level: 42, floors: 10, color: '#e8b04a', desc: '묻힌 왕조의 심장부. 왕관은 아직 주인을 기다린다.' },
  { id: 6, name: '종막 — 옥좌',   level: 50, floors: 3,  color: '#d44a4a', desc: '무덤의 왕이 눈을 뜬다. 이 문 너머에 끝이 있다.', finale: true },
];
export const getExoAct = (idx) => EXO_ACTS[Math.max(0, Math.min(EXO_ACTS.length - 1, idx))];

// 승급 난이도 — 클리어 횟수로 해금 (재도전 가치·의외성 보상)
export const EXO_ASCENSIONS = [
  { lv: 0, name: '표준',    enemyM: 1,    omenBonus: 0,   luckBonus: 0, desc: '기본 난이도.' },
  { lv: 1, name: '승급 Ⅰ', enemyM: 1.18, omenBonus: 0.5, luckBonus: 1, desc: '적 +18%. 운명의 방·상급 장비가 더 자주 나온다.' },
  { lv: 2, name: '승급 Ⅱ', enemyM: 1.38, omenBonus: 1,   luckBonus: 2, desc: '적 +38%. 기연이 짙어진다.' },
  { lv: 3, name: '승급 Ⅲ', enemyM: 1.6,  omenBonus: 1.5, luckBonus: 3, desc: '적 +60%. 왕의 무덤이 전력으로 저항한다.' },
];

// =========================================================
// 3. 공격 속성 5종 + 브레이크 — 전투 전략 축 (피드백 2)
// =========================================================
export const EXO_ATTACK_TYPES = {
  slash:  { id: 'slash',  name: '베기', icon: '🗡' },
  pierce: { id: 'pierce', name: '관통', icon: '🏹' },
  blunt:  { id: 'blunt',  name: '타격', icon: '🔨' },
  hex:    { id: 'hex',    name: '주술', icon: '🕯' },
  holy:   { id: 'holy',   name: '성',   icon: '✨' },
};

// =========================================================
// 4. 상태이상 8종 (% 기반 — 어느 막에서든 유효)
// =========================================================
export const EXO_STATUS = {
  poison: { id: 'poison', name: '중독', icon: '☠', color: '#8fbc5a', pct: 3,  decay: 0, desc: '턴 종료마다 스택당 최대 HP의 3% 피해. 스택이 줄지 않는다.' },
  burn:   { id: 'burn',   name: '화상', icon: '🔥', color: '#ff8a5a', pct: 4,  decay: 1, desc: '턴 종료마다 스택당 최대 HP의 4% 피해. 매 턴 1스택 감소.' },
  bleed:  { id: 'bleed',  name: '출혈', icon: '🩸', color: '#e05a5a', pct: 3,  decay: 1, desc: '턴 종료마다 스택당 최대 HP의 3% 피해. 매 턴 1스택 감소.' },
  stun:   { id: 'stun',   name: '기절', icon: '💫', color: '#e8c84a', desc: '행동할 수 없다. 매 턴 1스택 감소.' },
  vuln:   { id: 'vuln',   name: '취약', icon: '🎯', color: '#d47ab8', perPct: 12, decay: 1, desc: '스택당 받는 피해 +12%. 매 턴 1스택 감소.' },
  weak:   { id: 'weak',   name: '약화', icon: '🥀', color: '#9a8ab8', perPct: 10, decay: 1, desc: '스택당 주는 피해 -10%. 매 턴 1스택 감소.' },
  regen:  { id: 'regen',  name: '재생', icon: '🌿', color: '#7ac48a', pct: 4,  decay: 1, desc: '턴 종료마다 스택당 최대 HP의 4% 회복. 매 턴 1스택 감소.' },
  focus:  { id: 'focus',  name: '집중', icon: '👁', color: '#8ab4e8', perPct: 8, decay: 0, desc: '스택당 치명 확률 +8%. 이 전투 동안 유지.' },
};
export const EXO_STATUS_CAP = 5;

// =========================================================
// 5. 유파 3종 — 시작 스탯 + 시작 무기 계열
// =========================================================
export const EXO_SCHOOLS = [
  { id: 'blade',    name: '검귀(劍鬼)',   icon: '🗡', color: '#c47a7a', stats: { str: 14, spi: 6,  vit: 10, dex: 10 }, weaponSkill: 'wSlash1',
    desc: '베기에 귀신이 들렸다. 완력 중심 — 출혈과 연참으로 몰아친다.' },
  { id: 'talisman', name: '부주술사(符呪)', icon: '🪬', color: '#9a7ab8', stats: { str: 6,  spi: 14, vit: 9,  dex: 11 }, weaponSkill: 'wHex1',
    desc: '부적 한 장이 칼보다 깊이 벤다. 영력 중심 — 주술과 도트의 설계자.' },
  { id: 'monk',     name: '파계승(破戒)', icon: '🔨', color: '#b0985a', stats: { str: 11, spi: 9,  vit: 13, dex: 7 },  weaponSkill: 'wBlunt1',
    desc: '계율을 버리고 철퇴를 들었다. 체력 중심 — 자세를 부수는 일격.' },
];
export const getExoSchool = (id) => EXO_SCHOOLS.find(s => s.id === id) || EXO_SCHOOLS[0];

// =========================================================
// 6. 수동 스킬 — 무기(공격기) + 보조(기술) (피드백 1: 수동은 2슬롯만)
// =========================================================
// stat: 'phys'(완력) | 'spirit'(영력) / pow: 위력% / bp: 브레이크 위력 / st: 적 상태이상 / self: 자기 효과
export const EXO_SKILLS = {
  // ----- 무기 스킬 10종 (속성 5 × 2) -----
  wSlash1:  { id: 'wSlash1',  name: '참마검(斬魔劍)', gear: '참마도',   type: 'slash',  stat: 'phys',   pow: 150, sp: 18, cd: 1, bp: 25, desc: '귀신을 베는 일섬.' },
  wSlash2:  { id: 'wSlash2',  name: '월아연참',       gear: '월아도',   type: 'slash',  stat: 'phys',   pow: 115, sp: 16, cd: 1, bp: 18, st: { s: 'bleed', n: 2 }, desc: '달빛 궤적 — [출혈] 2.' },
  wPierce1: { id: 'wPierce1', name: '천공창(穿孔槍)', gear: '천공창',   type: 'pierce', stat: 'phys',   pow: 160, sp: 20, cd: 2, bp: 30, pierce: 35, desc: '방어 35%를 꿰뚫는다.' },
  wPierce2: { id: 'wPierce2', name: '연환십자',       gear: '쌍자창',   type: 'pierce', stat: 'phys',   pow: 75,  sp: 17, cd: 1, bp: 14, hits: 2, desc: '2연격 — 브레이크 축적에 능하다.' },
  wBlunt1:  { id: 'wBlunt1',  name: '파쇄곤(破碎棍)', gear: '파쇄곤',   type: 'blunt',  stat: 'phys',   pow: 135, sp: 18, cd: 1, bp: 45, desc: '자세를 부수는 데 특화된 일격.' },
  wBlunt2:  { id: 'wBlunt2',  name: '진각뇌성',       gear: '뇌성퇴',   type: 'blunt',  stat: 'phys',   pow: 105, sp: 20, cd: 2, bp: 35, st: { s: 'stun', n: 1, p: 30 }, desc: '30% 확률 [기절] 1.' },
  wHex1:    { id: 'wHex1',    name: '귀화부(鬼火符)', gear: '귀화부',   type: 'hex',    stat: 'spirit', pow: 145, sp: 18, cd: 1, bp: 20, st: { s: 'burn', n: 2 }, desc: '귀신불 — [화상] 2.' },
  wHex2:    { id: 'wHex2',    name: '주박진(呪縛陣)', gear: '주박첩',   type: 'hex',    stat: 'spirit', pow: 95,  sp: 17, cd: 1, bp: 30, st: { s: 'vuln', n: 2 }, desc: '결박의 진 — [취약] 2.' },
  wHoly1:   { id: 'wHoly1',   name: '정화광(淨化光)', gear: '정화장',   type: 'holy',   stat: 'spirit', pow: 140, sp: 18, cd: 1, bp: 22, selfHealPct: 10, desc: '벤 자리를 빛이 어루만진다 — HP 10% 회복.' },
  wHoly2:   { id: 'wHoly2',   name: '심판의 종',     gear: '심판종',   type: 'holy',   stat: 'spirit', pow: 185, sp: 24, cd: 3, bp: 28, desc: '느리지만 무거운 종소리.' },
  // ----- 보조 스킬 6종 (기술 — 약점 커버·생존·브레이크) -----
  oScout:   { id: 'oScout',   name: '정찰부(偵察符)', gear: '정찰부',   type: 'hex',    stat: 'spirit', pow: 0,   sp: 10, cd: 2, bp: 0,  reveal: true, st: { s: 'vuln', n: 1 }, desc: '약점을 폭로하고 [취약] 1.' },
  oGuard:   { id: 'oGuard',   name: '호신결계',       gear: '호신부',   type: 'holy',   stat: 'spirit', pow: 0,   sp: 14, cd: 3, bp: 0,  selfShieldPct: 25, desc: '최대 HP 25% 보호막.' },
  oHeal:    { id: 'oHeal',    name: '감로성수',       gear: '성수병',   type: 'holy',   stat: 'spirit', pow: 0,   sp: 16, cd: 3, bp: 0,  selfHealPct: 30, desc: 'HP 30% 회복.' },
  oCrush:   { id: 'oCrush',   name: '쇄혼타(碎魂打)', gear: '쇄혼추',   type: 'blunt',  stat: 'phys',   pow: 60,  sp: 12, cd: 1, bp: 55, desc: '피해는 작지만 자세를 크게 흔든다.' },
  oDrain:   { id: 'oDrain',   name: '흡령장(吸靈掌)', gear: '흡령구',   type: 'hex',    stat: 'spirit', pow: 85,  sp: 0,  cd: 2, bp: 12, spGain: 22, desc: '영기를 빨아 SP 22 회복.' },
  oBanish:  { id: 'oBanish',  name: '멸귀인(滅鬼印)', gear: '멸귀인',   type: 'holy',   stat: 'spirit', pow: 120, sp: 18, cd: 2, bp: 20, st: { s: 'weak', n: 2 }, desc: '귀기를 꺾는다 — [약화] 2.' },
};
export const EXO_WEAPON_SKILLS = ['wSlash1', 'wSlash2', 'wPierce1', 'wPierce2', 'wBlunt1', 'wBlunt2', 'wHex1', 'wHex2', 'wHoly1', 'wHoly2'];
export const EXO_OFFHAND_SKILLS = ['oScout', 'oGuard', 'oHeal', 'oCrush', 'oDrain', 'oBanish'];

// =========================================================
// 7. 자동 스킬 — 갑주·투구·장신구 (피드백 1 직격: 전 슬롯이 매 전투 일한다)
// =========================================================
// trigger: battleStart / turnStart / struck(피격) / onCrit / onBreak / onStatusApply
export const EXO_AUTO = {
  // 갑주 — 반응형 (피격 트리거)
  aThorn:  { id: 'aThorn',  slot: 'armor', gear: '가시 갑주',   trigger: 'struck',     chance: 30,  fx: { counterPct: 70 },   desc: '피격 시 30% — 완력 70% 반격' },
  aWard:   { id: 'aWard',   slot: 'armor', gear: '수호 문양갑', trigger: 'struck',     chance: 25,  fx: { shieldPct: 8 },     desc: '피격 시 25% — 최대 HP 8% 보호막' },
  aMend:   { id: 'aMend',   slot: 'armor', gear: '재생 피갑',   trigger: 'struck',     chance: 25,  fx: { healPct: 4 },       desc: '피격 시 25% — HP 4% 회복' },
  aEcho:   { id: 'aEcho',   slot: 'armor', gear: '반향 갑주',   trigger: 'struck',     chance: 30,  fx: { poiseDmg: 12 },     desc: '피격 시 30% — 적 자세 -12' },
  aIron:   { id: 'aIron',   slot: 'armor', gear: '철벽 흉갑',   trigger: 'lowHpOnce',  chance: 100, fx: { shieldPct: 20 },    desc: 'HP 35% 이하 첫 피격 시 — 최대 HP 20% 보호막 (전투당 1회)' },
  // 투구 — 오라형 (턴 시작 트리거)
  hFocus:  { id: 'hFocus',  slot: 'helm', gear: '집중의 투구', trigger: 'turnStart',   chance: 100, fx: { status: { s: 'focus', n: 1 } }, desc: '매 턴 [집중] 1 (치명 +8%씩 누적)' },
  hMeditate:{ id: 'hMeditate', slot: 'helm', gear: '명상의 관', trigger: 'turnStart',  chance: 100, fx: { sp: 6 },            desc: '매 턴 SP +6' },
  hBloom:  { id: 'hBloom',  slot: 'helm', gear: '치유 화관',   trigger: 'turnStart',   chance: 100, fx: { healPct: 3 },       desc: '매 턴 HP 3% 회복' },
  hRage:   { id: 'hRage',   slot: 'helm', gear: '투지 면갑',   trigger: 'turnStart',   chance: 100, fx: { atkStackPct: 3 },   desc: '매 턴 주는 피해 +3% 누적' },
  hInsight:{ id: 'hInsight', slot: 'helm', gear: '통찰 안대',  trigger: 'battleStart', chance: 100, fx: { reveal: true, status: { s: 'focus', n: 2 } }, desc: '개전 시 약점 즉시 공개 + [집중] 2' },
  // 장신구 — 트리거형
  cBlood:  { id: 'cBlood',  slot: 'acc', gear: '혈석 반지',   trigger: 'onCrit',        chance: 100, fx: { enemyStatus: { s: 'bleed', n: 2 } }, desc: '치명타마다 적 [출혈] 2' },
  cSoul:   { id: 'cSoul',   slot: 'acc', gear: '영혼 목걸이', trigger: 'onCrit',        chance: 100, fx: { sp: 8 },            desc: '치명타마다 SP +8' },
  cShatter:{ id: 'cShatter', slot: 'acc', gear: '분쇄 고리',  trigger: 'onBreak',       chance: 100, fx: { bonusHitPct: 90 },  desc: '브레이크 시 완력 90% 추가타' },
  cReap:   { id: 'cReap',   slot: 'acc', gear: '수혼 구슬',   trigger: 'onBreak',       chance: 100, fx: { healPct: 14, sp: 10 }, desc: '브레이크 시 HP 14% 회복 + SP 10' },
  cOpen:   { id: 'cOpen',   slot: 'acc', gear: '개전 부적',   trigger: 'battleStart',   chance: 100, fx: { shieldPct: 12 },    desc: '개전 시 최대 HP 12% 보호막' },
  cAmp:    { id: 'cAmp',    slot: 'acc', gear: '원귀 팔찌',   trigger: 'onStatusApply', chance: 30,  fx: { ampStack: 1 },      desc: '상태이상 부여 시 30% — 스택 +1' },
};
export const EXO_AUTO_BY_SLOT = {
  armor: Object.values(EXO_AUTO).filter(a => a.slot === 'armor').map(a => a.id),
  helm:  Object.values(EXO_AUTO).filter(a => a.slot === 'helm').map(a => a.id),
  acc:   Object.values(EXO_AUTO).filter(a => a.slot === 'acc').map(a => a.id),
};

// =========================================================
// 8. 장비 — 지역 레벨 기반 파밍 (피드백 2·3: 막이 바뀌면 장비도 바뀐다)
// =========================================================
export const EXO_SLOT_IDS = ['weapon', 'offhand', 'armor', 'helm', 'acc1', 'acc2'];
export const EXO_SLOTS = {
  weapon:  { name: '무기',   icon: '🗡' },
  offhand: { name: '보조',   icon: '🪬' },
  armor:   { name: '갑주',   icon: '🛡' },
  helm:    { name: '투구',   icon: '⛑' },
  acc1:    { name: '장신구', icon: '💍' },
  acc2:    { name: '장신구', icon: '📿' },
};
export const EXO_TIERS = {
  common: { id: 'common', name: '낡은',   mult: 0.85, color: '#9a9a8e', w: 44 },
  fine:   { id: 'fine',   name: '단련된', mult: 1.0,  color: '#b8c4a0', w: 30 },
  rare:   { id: 'rare',   name: '정련된', mult: 1.18, color: '#7ba3c4', w: 17 },
  epic:   { id: 'epic',   name: '명장의', mult: 1.42, color: '#b07ad4', w: 7 },
  legend: { id: 'legend', name: '왕가의', mult: 1.72, color: '#e8b04a', w: 2 },
};
export function rollExoTier(luck = 0) {
  // luck 1당 상위 등급 가중 +35% (기연·승급·보물방이 올린다)
  const tiers = Object.values(EXO_TIERS);
  return weightedPick(tiers, t => {
    const rank = ['common', 'fine', 'rare', 'epic', 'legend'].indexOf(t.id);
    return t.w * (1 + Math.max(0, luck) * 0.35 * rank / 4 * 4) ** (rank >= 2 ? 1 : 0) + (rank >= 2 ? t.w * luck * 0.35 : 0);
  }).id;
}

let _exoItemSeq = 1;
export function rollExoItem({ slot, level, tier = null, luck = 0, skillId = null }) {
  const t = EXO_TIERS[tier || rollExoTier(luck)];
  const L = Math.max(1, level);
  const jit = () => rnd(0.88, 1.12);
  let sid = skillId;
  const stats = {};
  if (slot === 'weapon') {
    sid = sid || pick(EXO_WEAPON_SKILLS);
    const sk = EXO_SKILLS[sid];
    stats[sk.stat === 'spirit' ? 'mag' : 'atk'] = Math.round((8 + L * 2.7) * t.mult * jit());
    if (Math.random() < 0.4) stats.crit = Math.round(rnd(2, 4) * t.mult);
  } else if (slot === 'offhand') {
    sid = sid || pick(EXO_OFFHAND_SKILLS);
    const sk = EXO_SKILLS[sid];
    stats[sk.stat === 'spirit' ? 'mag' : 'atk'] = Math.round((4 + L * 1.1) * t.mult * jit());
    if (Math.random() < 0.5) stats.spRegen = Math.round(rnd(1, 3));
    else stats.sp = Math.round((4 + L * 0.5) * t.mult);
  } else if (slot === 'armor') {
    sid = sid || pick(EXO_AUTO_BY_SLOT.armor);
    stats.hp = Math.round((28 + L * 11) * t.mult * jit());
    stats.def = Math.round((2 + L * 1.0) * t.mult * jit());
  } else if (slot === 'helm') {
    sid = sid || pick(EXO_AUTO_BY_SLOT.helm);
    stats.hp = Math.round((16 + L * 5.5) * t.mult * jit());
    stats.def = Math.round((1 + L * 0.5) * t.mult * jit());
  } else { // acc1 / acc2
    sid = sid || pick(EXO_AUTO_BY_SLOT.acc);
    const lines = ['crit', 'dodge', 'breakPct', 'spRegen', 'hp'];
    const picked = [pick(lines), pick(lines)];
    for (const k of new Set(picked)) {
      if (k === 'hp') stats.hp = Math.round((12 + L * 4) * t.mult);
      else if (k === 'crit') stats.crit = Math.round(rnd(3, 6) * t.mult);
      else if (k === 'dodge') stats.dodge = Math.round(rnd(2, 5) * t.mult);
      else if (k === 'breakPct') stats.breakPct = Math.round(rnd(8, 16) * t.mult);
      else if (k === 'spRegen') stats.spRegen = Math.round(rnd(1, 3));
    }
  }
  const def = EXO_SKILLS[sid] || EXO_AUTO[sid];
  return {
    id: `xi${_exoItemSeq++}_${Date.now() % 100000}`,
    slot: slot === 'acc1' || slot === 'acc2' ? 'acc' : slot,
    name: `${t.name} ${def.gear}`,
    level: L, tier: t.id, skillId: sid, stats, spirit: null,
  };
}
// 분해 → 명전 (상점 경제 환류)
export const exoSalvageValue = (item) =>
  Math.round((10 + item.level * 2.5) * (EXO_TIERS[item.tier]?.mult || 1));

// =========================================================
// 9. 적 — 막당 4일반 + 1강적 + 1보스 (약점·자세·사령 fx 내장)
// =========================================================
// sfx = 사령(빙의) 효과 템플릿. 포획 시 레벨·등급으로 스케일되어 구워진다.
const EN = (o) => o;
export const EXO_ENEMIES = [
  // ===== 1막 지하 묘지 =====
  EN({ key: 'rotWalker',  act: 1, name: '썩은 배회자',   icon: '🧟', hpM: 1.0,  atkM: 1.0,  weak: 'slash',  spc: { name: '물어뜯기', mult: 1.6, st: { s: 'bleed', n: 2 }, every: 3 }, sfx: { atkPct: 6 }, sname: '배회자의 사령' }),
  EN({ key: 'graveRat',   act: 1, name: '묘지 쥐떼',     icon: '🐀', hpM: 0.8,  atkM: 1.1,  weak: 'blunt',  spc: { name: '떼지어 갉기', mult: 1.4, st: { s: 'poison', n: 1 }, every: 3 }, sfx: { dodge: 3 }, sname: '쥐떼의 사령' }),
  EN({ key: 'boneSoldier',act: 1, name: '백골 병사',     icon: '💀', hpM: 1.1,  atkM: 0.95, weak: 'blunt',  spc: { name: '창격', mult: 1.7, every: 3 }, sfx: { def: 4 }, sname: '백골병의 사령' }),
  EN({ key: 'willow',     act: 1, name: '곡성 도깨비불', icon: '🕯', hpM: 0.75, atkM: 1.15, weak: 'holy',   spc: { name: '귀곡성', mult: 1.3, st: { s: 'weak', n: 2 }, every: 3 }, sfx: { magPct: 6 }, sname: '도깨비불의 사령' }),
  EN({ key: 'graveWarden',act: 1, name: '묘지기의 원혼', icon: '⚰', hpM: 1.0,  atkM: 1.0,  weak: 'holy',   elite: true, spc: { name: '관 뚜껑 내리치기', mult: 1.9, st: { s: 'stun', n: 1 }, every: 3, heavy: true }, sfx: { hp: 30, def: 3 }, sname: '묘지기의 사령' }),
  EN({ key: 'cryptLord',  act: 1, name: '납골당의 주인', icon: '👑', hpM: 1.0,  atkM: 1.0,  weak: 'holy',   boss: true, spc: { name: '망자 소집', mult: 2.1, st: { s: 'vuln', n: 2 }, every: 3, heavy: true }, sfx: { atkPct: 8, hp: 40 }, sname: '납골당 주인의 사령' }),
  // ===== 2막 침수 성소 =====
  EN({ key: 'drowned',    act: 2, name: '익사한 순례자', icon: '🌊', hpM: 1.05, atkM: 1.0,  weak: 'hex',    spc: { name: '물귀신 손아귀', mult: 1.6, st: { s: 'weak', n: 2 }, every: 3 }, sfx: { hp: 45 }, sname: '순례자의 사령' }),
  EN({ key: 'mireShade',  act: 2, name: '수렁 그림자',   icon: '🫥', hpM: 0.85, atkM: 1.2,  weak: 'holy',   spc: { name: '침잠', mult: 1.5, st: { s: 'vuln', n: 2 }, every: 3 }, sfx: { dodge: 4 }, sname: '그림자의 사령' }),
  EN({ key: 'coralGolem', act: 2, name: '산호 석상',     icon: '🗿', hpM: 1.3,  atkM: 0.85, weak: 'blunt',  spc: { name: '석권', mult: 1.8, every: 3 }, sfx: { def: 6 }, sname: '석상의 사령' }),
  EN({ key: 'eelWitch',   act: 2, name: '뱀장어 무녀',   icon: '🐍', hpM: 0.9,  atkM: 1.1,  weak: 'slash',  spc: { name: '감전 저주', mult: 1.5, st: { s: 'burn', n: 2 }, every: 3 }, sfx: { statusChance: 10 }, sname: '무녀의 사령' }),
  EN({ key: 'tideKeeper', act: 2, name: '해일지기',      icon: '🌀', hpM: 1.0,  atkM: 1.0,  weak: 'pierce', elite: true, spc: { name: '해일 소환', mult: 2.0, st: { s: 'weak', n: 2 }, every: 3, heavy: true }, sfx: { shieldStartPct: 8 }, sname: '해일지기의 사령' }),
  EN({ key: 'abbess',     act: 2, name: '가라앉은 수녀원장', icon: '🔔', hpM: 1.0, atkM: 1.0, weak: 'hex',   boss: true, spc: { name: '침묵의 종', mult: 2.2, st: { s: 'stun', n: 1 }, every: 3, heavy: true }, sfx: { magPct: 10, spRegen: 2 }, sname: '수녀원장의 사령' }),
  // ===== 3막 나락 협곡 =====
  EN({ key: 'cliffGhoul', act: 3, name: '절벽 구울',     icon: '🧗', hpM: 1.0,  atkM: 1.1,  weak: 'pierce', spc: { name: '낙하 기습', mult: 1.7, every: 3 }, sfx: { crit: 4 }, sname: '구울의 사령' }),
  EN({ key: 'echoWraith', act: 3, name: '메아리 망령',   icon: '🌫', hpM: 0.85, atkM: 1.2,  weak: 'holy',   spc: { name: '비명 공명', mult: 1.5, st: { s: 'vuln', n: 2 }, every: 3 }, sfx: { magPct: 8 }, sname: '메아리의 사령' }),
  EN({ key: 'chainOgre',  act: 3, name: '사슬 오우거',   icon: '⛓', hpM: 1.35, atkM: 0.95, weak: 'hex',    spc: { name: '사슬 후리기', mult: 1.8, st: { s: 'stun', n: 1, p: 40 }, every: 3 }, sfx: { hp: 70, atkPct: 5 }, sname: '오우거의 사령' }),
  EN({ key: 'gorgeHarpy', act: 3, name: '협곡 하피',     icon: '🦅', hpM: 0.9,  atkM: 1.15, weak: 'pierce', spc: { name: '활강 발톱', mult: 1.6, st: { s: 'bleed', n: 2 }, every: 3 }, sfx: { dodge: 5, crit: 3 }, sname: '하피의 사령' }),
  EN({ key: 'bridgeTroll',act: 3, name: '다리 밑 트롤', icon: '🌉', hpM: 1.2,  atkM: 1.1,  weak: 'slash',  elite: true, spc: { name: '통행료 징수', mult: 2.0, every: 3, heavy: true }, sfx: { regenStart: 2 }, sname: '트롤의 사령' }),
  EN({ key: 'abyssWyrm',  act: 3, name: '나락 지렁룡',   icon: '🐉', hpM: 1.0,  atkM: 1.0,  weak: 'slash',  boss: true, spc: { name: '산성 숨결', mult: 2.1, st: { s: 'poison', n: 2 }, every: 3, heavy: true }, sfx: { atkPct: 10, breakPct: 10 }, sname: '지렁룡의 사령' }),
  // ===== 4막 심연의 문턱 =====
  EN({ key: 'voidAcolyte',act: 4, name: '공허 시종',     icon: '🌑', hpM: 1.0,  atkM: 1.1,  weak: 'holy',   spc: { name: '허무 주입', mult: 1.6, st: { s: 'weak', n: 2 }, every: 3 }, sfx: { magPct: 9 }, sname: '시종의 사령' }),
  EN({ key: 'fleshAmalgam',act: 4, name: '육편 덩어리', icon: '🫀', hpM: 1.45, atkM: 0.9,  weak: 'slash',  spc: { name: '포식', mult: 1.7, every: 3, drainPct: 50 }, sfx: { hp: 100 }, sname: '덩어리의 사령' }),
  EN({ key: 'mirrorFiend',act: 4, name: '거울 악령',     icon: '🪞', hpM: 0.9,  atkM: 1.2,  weak: 'blunt',  spc: { name: '반전 복제', mult: 1.8, every: 3 }, sfx: { counterPct: 25 }, sname: '거울의 사령' }),
  EN({ key: 'nightChoir', act: 4, name: '밤의 성가대',   icon: '🎭', hpM: 1.0,  atkM: 1.05, weak: 'pierce', spc: { name: '불협화음', mult: 1.5, st: { s: 'vuln', n: 2 }, every: 3 }, sfx: { statusChance: 12 }, sname: '성가대의 사령' }),
  EN({ key: 'gatekeeper', act: 4, name: '문지기 — 이중 아가리', icon: '👹', hpM: 1.25, atkM: 1.1, weak: 'hex', elite: true, spc: { name: '겹물기', mult: 1.3, hits: 2, every: 3, heavy: true }, sfx: { atkPct: 8, crit: 4 }, sname: '문지기의 사령' }),
  EN({ key: 'abyssEye',   act: 4, name: '심연을 보는 눈', icon: '👁', hpM: 1.0,  atkM: 1.0,  weak: 'pierce', boss: true, spc: { name: '응시 — 존재 부정', mult: 2.3, st: { s: 'weak', n: 3 }, every: 3, heavy: true }, sfx: { magPct: 12, statusChance: 10 }, sname: '눈의 사령' }),
  // ===== 5막 왕의 관 =====
  EN({ key: 'royalGuard', act: 5, name: '근위 망령기사', icon: '🛡', hpM: 1.15, atkM: 1.05, weak: 'hex',   spc: { name: '충성의 창', mult: 1.8, every: 3 }, sfx: { def: 8, shieldStartPct: 6 }, sname: '근위기사의 사령' }),
  EN({ key: 'courtMage',  act: 5, name: '궁정 주술사의 혼', icon: '🔮', hpM: 0.9, atkM: 1.2, weak: 'pierce', spc: { name: '왕실 비전', mult: 1.7, st: { s: 'burn', n: 3 }, every: 3 }, sfx: { magPct: 11 }, sname: '주술사의 사령' }),
  EN({ key: 'headsman',   act: 5, name: '왕실 처형인',   icon: '🪓', hpM: 1.1,  atkM: 1.25, weak: 'slash',  spc: { name: '참수 자세', mult: 2.2, every: 3, heavy: true }, sfx: { crit: 6, atkPct: 6 }, sname: '처형인의 사령' }),
  EN({ key: 'relicThief', act: 5, name: '부장품 도굴혼', icon: '🗝', hpM: 0.85, atkM: 1.1,  weak: 'blunt',  spc: { name: '날붙이 세례', mult: 1.2, hits: 2, every: 3 }, sfx: { dodge: 6, breakPct: 8 }, sname: '도굴혼의 사령' }),
  EN({ key: 'twinPrinces',act: 5, name: '쌍둥이 왕자들', icon: '👥', hpM: 1.3,  atkM: 1.1,  weak: 'holy',   elite: true, spc: { name: '좌우 협공', mult: 1.4, hits: 2, every: 3, heavy: true }, sfx: { atkPct: 9, hp: 80 }, sname: '왕자들의 사령' }),
  EN({ key: 'paleQueen',  act: 5, name: '창백한 왕비',   icon: '👸', hpM: 1.0,  atkM: 1.0,  weak: 'slash',  boss: true, spc: { name: '애도 — 영원한 겨울', mult: 2.2, st: { s: 'weak', n: 2 }, every: 3, heavy: true }, sfx: { magPct: 10, hp: 90, regenStart: 1 }, sname: '왕비의 사령' }),
  // ===== 종막 옥좌 =====
  EN({ key: 'crownBearer',act: 6, name: '왕관 운반자',   icon: '🫅', hpM: 1.2,  atkM: 1.15, weak: 'blunt',  elite: true, spc: { name: '왕관의 무게', mult: 2.0, st: { s: 'vuln', n: 2 }, every: 3, heavy: true }, sfx: { atkPct: 10, def: 6 }, sname: '운반자의 사령' }),
  EN({ key: 'tombKing',   act: 6, name: '무덤의 왕',     icon: '👑', hpM: 1.35, atkM: 1.15, weak: 'holy',   boss: true, final: true, spc: { name: '왕명 — 무릎 꿇어라', mult: 2.4, st: { s: 'stun', n: 1, p: 50 }, every: 3, heavy: true }, sfx: { atkPct: 12, magPct: 12, hp: 120 }, sname: '무덤의 왕의 사령' }),
];
export const getExoEnemy = (key) => EXO_ENEMIES.find(e => e.key === key) || null;

// 전투용 적 인스턴스 생성 — 지역 레벨 + 역할 배율 + 승급 배율
export function buildExoEnemy(char, roomType) {
  const act = getExoAct(char.actIdx);
  const T = EXO_TUNING;
  const asc = EXO_ASCENSIONS[char.ascension || 0]?.enemyM || 1;
  const pool = EXO_ENEMIES.filter(e => e.act === act.id && (
    roomType === 'boss' ? e.boss : roomType === 'elite' ? e.elite : (!e.elite && !e.boss)
  ));
  const def = pool.length > 0 ? pick(pool) : EXO_ENEMIES[0];
  const L = act.level;
  const role = def.boss ? { hp: T.bossHpM, atk: T.bossAtkM, poise: T.poiseBoss } :
    def.elite ? { hp: T.eliteHpM, atk: T.eliteAtkM, poise: T.poiseElite } :
    { hp: 1, atk: 1, poise: T.poiseNormal };
  // 변이 층 — 원귀 창궐 (적 +15%)
  const modM = char.floorMod === 'surge' ? 1.15 : 1;
  const hp = Math.round((T.enemyHpBase + L * T.enemyHpPerLv) * def.hpM * role.hp * asc * modM);
  return {
    key: def.key, name: def.name, icon: def.icon, level: L,
    hp, maxHp: hp,
    atk: Math.round((T.enemyAtkBase + L * T.enemyAtkPerLv) * def.atkM * role.atk * asc * modM),
    def: Math.round(L * T.enemyDefPerLv * (def.defM || 1)),
    weak: def.weak, poise: role.poise, poiseMax: role.poise,
    spc: def.spc, elite: !!def.elite, boss: !!def.boss, final: !!def.final,
    rank: def.boss ? 'boss' : def.elite ? 'elite' : 'normal',
  };
}

// =========================================================
// 10. 제령부·사령·빙의 — 게임의 정체성 (피드백 4)
// =========================================================
// 조건: 적 HP 30% 이하 + 제령부 1장. 성공 = 즉시 종전 + 사령 획득 / 실패 = 턴 소모 + 적 광포화.
export function exoCaptureChance(enemy) {
  const base = enemy.rank === 'boss' ? 25 : enemy.rank === 'elite' ? 45 : 70;
  const hpPct = enemy.hp / enemy.maxHp * 100;
  return Math.min(95, Math.round(base + (EXO_TUNING.captureHpPct - hpPct) * 1.2));
}
const EXO_RANK_M = { normal: 1, elite: 1.6, boss: 2.5 };
const EXO_SFX_FLAT = ['hp', 'def', 'crit', 'dodge', 'spRegen', 'regenStart'];
// 사령 생성 — fx를 레벨·등급으로 스케일해 굽는다 (빙의 시 그대로 합산)
export function makeExoSpirit(enemyKey, level, rank) {
  const def = getExoEnemy(enemyKey);
  if (!def) return null;
  const rm = EXO_RANK_M[rank] || 1;
  const fx = {};
  for (const [k, v] of Object.entries(def.sfx || {})) {
    fx[k] = EXO_SFX_FLAT.includes(k)
      ? Math.round(v * rm * (1 + Math.max(0, level - 4) * 0.06))
      : Math.round(v * rm * 10) / 10;
  }
  return { key: enemyKey, name: def.sname || `${def.name}의 사령`, icon: def.icon, lv: level, rank, fx };
}
export const EXO_SPIRIT_CAP = 8; // 미빙의 보유 한도 (사령부 재고)
export const EXO_SPIRIT_FX_LABEL = {
  atkPct: '완력 피해 +{v}%', magPct: '영력 피해 +{v}%', hp: '최대 HP +{v}', def: '방어 +{v}',
  crit: '치명 +{v}%', dodge: '회피 +{v}%', spRegen: 'SP 회복 +{v}', breakPct: '브레이크 위력 +{v}%',
  statusChance: '상태이상 확률 +{v}%', counterPct: '피격 반격 {v}%', shieldStartPct: '개전 보호막 {v}%',
  regenStart: '개전 [재생] {v}',
};
export function exoSpiritDesc(spirit) {
  return Object.entries(spirit.fx)
    .map(([k, v]) => (EXO_SPIRIT_FX_LABEL[k] || `${k} +{v}`).replace('{v}', v))
    .join(' · ');
}

// =========================================================
// 11. 파생 스탯 — 장비 + 빙의 사령 합산
// =========================================================
export function exoGearBag(char) {
  const bag = {};
  const add = (obj, m = 1) => { for (const [k, v] of Object.entries(obj || {})) bag[k] = (bag[k] || 0) + v * m; };
  // 변이 층 「사령 공명」 — 빙의 fx +30%
  const spiritM = char.floorMod === 'resonance' ? 1.3 : 1;
  for (const s of EXO_SLOT_IDS) {
    const it = char.equipped?.[s];
    if (!it) continue;
    add(it.stats);
    if (it.spirit) add(it.spirit.fx, spiritM);
  }
  return bag;
}
export function exoDerived(char) {
  if (!char) return { maxHp: 1, maxSp: 1, phys: 1, spirit: 1, def: 0, crit: 0, dodge: 0, spRegen: 4, breakPct: 0, bag: {} };
  const st = getExoSchool(char.schoolId).stats;
  const g = exoGearBag(char);
  return {
    maxHp:   Math.max(1, Math.round(120 + st.vit * 10 + (g.hp || 0))),
    maxSp:   Math.round(40 + (g.sp || 0)),
    phys:    Math.round((8 + st.str * 1.5 + (g.atk || 0)) * (1 + (g.atkPct || 0) / 100)),
    spirit:  Math.round((8 + st.spi * 1.5 + (g.mag || 0)) * (1 + (g.magPct || 0) / 100)),
    def:     Math.round(3 + st.vit * 0.8 + (g.def || 0)),
    crit:    Math.round(5 + st.dex * 0.5 + (g.crit || 0)),
    dodge:   Math.min(40, Math.round(3 + st.dex * 0.4 + (g.dodge || 0))),
    spRegen: Math.round(4 + (g.spRegen || 0)),
    breakPct: Math.round((g.breakPct || 0) + st.dex * 0.5),
    bag: g,
  };
}

// =========================================================
// 12. 캐릭터 생성 / 층 진행
// =========================================================
export function createExoChar(schoolId, ascension = 0) {
  const school = getExoSchool(schoolId);
  if (!school) return null;
  const L = EXO_ACTS[0].level;
  const char = {
    schoolId, ascension,
    actIdx: 0, floor: 1,
    hp: 1, gold: 80, potions: 2, talismans: 2,
    equipped: {
      weapon:  rollExoItem({ slot: 'weapon', level: L, tier: 'fine', skillId: school.weaponSkill }),
      offhand: rollExoItem({ slot: 'offhand', level: L, tier: 'common', skillId: 'oScout' }),
      armor:   rollExoItem({ slot: 'armor', level: L, tier: 'common' }),
      helm: null, acc1: null, acc2: null,
    },
    spirits: [], pendingLoot: [],
    offers: null, room: null, roomData: null, floorMod: null,
    kills: 0, captures: 0,
  };
  char.hp = exoDerived(char).maxHp;
  return char;
}

// 변이 층 (의외성 축) — 12% 확률
export const EXO_FLOOR_MODS = {
  surge:     { id: 'surge',     name: '원귀 창궐', icon: '🌋', desc: '적 공격·HP +15%, 전투 명전 ×1.5.' },
  leyline:   { id: 'leyline',   name: '영맥(靈脈)', icon: '💠', desc: '이 층에서 SP 회복 +5.' },
  resonance: { id: 'resonance', name: '사령 공명', icon: '🔮', desc: '이 층에서 빙의 사령 효과 +30%.' },
};
export const rollExoFloorMod = () => (Math.random() < 0.12 ? pick(Object.keys(EXO_FLOOR_MODS)) : null);

// 방 제안 — 막 마지막 층은 보스 고정. 종막은 강적→운명→최종보스 고정 시퀀스
export function rollExoOffers(char) {
  const act = getExoAct(char.actIdx);
  if (act.finale) {
    const seq = ['elite', 'omen', 'boss'];
    return [{ type: seq[Math.min(char.floor, 3) - 1] }];
  }
  if (char.floor >= act.floors) return [{ type: 'boss' }];
  const omenW = 1.1 + (EXO_ASCENSIONS[char.ascension || 0]?.omenBonus || 0);
  const pool = [
    { type: 'battle', w: 10 },
    { type: 'elite', w: char.floor >= 4 ? 3 : 0 },
    { type: 'treasure', w: 2 },
    { type: 'shop', w: 2.2 },
    { type: 'rest', w: 2.2 },
    { type: 'omen', w: omenW },
  ].filter(p => p.w > 0);
  const n = Math.random() < 0.55 ? 3 : 2;
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 30) {
    const p = weightedPick(pool, x => x.w);
    // 비전투 방 중복 제거 (전투·강적은 중복 허용)
    if (p.type !== 'battle' && p.type !== 'elite' && out.some(o => o.type === p.type)) continue;
    out.push({ type: p.type });
  }
  if (!out.some(o => o.type === 'battle' || o.type === 'elite')) out[0] = { type: 'battle' };
  return out;
}

export const EXO_ROOMS = {
  battle:   { name: '원혼',     icon: '⚔', color: '#c47a7a', desc: '떠도는 원혼과 싸운다.' },
  elite:    { name: '강령(強靈)', icon: '👹', color: '#d4574a', desc: '강력한 원혼. 제령부를 떨어뜨리기도 한다.' },
  treasure: { name: '부장품',   icon: '📦', color: '#e8b04a', desc: '묻힌 자의 유품. 장비 하나를 얻는다.' },
  shop:     { name: '저승 상인', icon: '🏮', color: '#b0985a', desc: '명전을 받고 물건을 판다.' },
  rest:     { name: '위령소',   icon: '🕯', color: '#7a9a5e', desc: '혼을 달래고 상처를 치료한다.' },
  omen:     { name: '운명',     icon: '🌠', color: '#9a7ab8', desc: '무슨 일이 일어날지 아무도 모른다.' },
  boss:     { name: '지배자',   icon: '👑', color: '#d44a4a', desc: '이 구역의 지배자. 쓰러뜨리면 다음 막이 열린다.' },
};

// =========================================================
// 13. 운명의 방 (기연 — 피드백 5) : 선택지형, 고임팩트
// =========================================================
export const EXO_OMENS = [
  { id: 'forgeGhost', name: '명장의 망령', icon: '🔥',
    text: '생전에 왕가의 무구를 벼렸다는 대장장이의 혼이 화로 앞에 앉아 있다. "쇠붙이 하나 내놓아 보거라."',
    accept: '장비 하나를 바친다 (무작위 장착 장비 등급 +1)', refuse: '지나친다' },
  { id: 'merchantKing', name: '떠도는 상인왕', icon: '👘',
    text: '화려한 수의를 입은 거상의 혼이 보따리를 펼친다. "산 자의 명전은 오랜만이군. 왕가의 물건, 반값에 주지."',
    accept: '왕가의 장비를 산다 (명전 소모 — 전설 등급 확정)', refuse: '지나친다' },
  { id: 'bloodAltar', name: '피의 제단', icon: '🩸',
    text: '제단이 속삭인다. "피를 바쳐라. 상응하는 힘을 주마." 바닥의 핏자국은 셀 수 없이 많다.',
    accept: 'HP 30%를 바친다 (상급 장비 — 간혹 저주받은 꽝)', refuse: '지나친다' },
  { id: 'spiritEcho', name: '사령 공명진', icon: '🔮',
    text: '오래된 공명진이 아직 작동한다. 사령 하나를 올리면 그 힘이 증폭될 것 같다.',
    accept: '보유 사령 하나를 강화한다 (효과 ×1.5)', refuse: '지나친다' },
  { id: 'rift', name: '시공의 균열', icon: '🌀',
    text: '벽의 균열 너머로 더 깊은 층의 공기가 샌다. 손을 뻗으면 닿을 것 같다.',
    accept: '균열에 손을 넣는다 (다음 막 레벨의 장비 — 대신 원혼이 눈치챈다)', refuse: '지나친다' },
];
// 운명의 방 실행 — 순수 함수. ctx로 추가 효과 전달 { item, enemyAfter, spiritIdx }
export function resolveExoOmen(omenId, char) {
  const act = getExoAct(char.actIdx);
  const luck = EXO_ASCENSIONS[char.ascension || 0]?.luckBonus || 0;
  if (omenId === 'forgeGhost') {
    const slots = EXO_SLOT_IDS.filter(s => char.equipped?.[s]);
    if (slots.length === 0) return { char, text: '바칠 장비가 없다.', tone: 'neutral' };
    const slot = pick(slots);
    const it = char.equipped[slot];
    const order = ['common', 'fine', 'rare', 'epic', 'legend'];
    const ni = Math.min(order.length - 1, order.indexOf(it.tier) + 1);
    const up = rollExoItem({ slot: slot === 'acc1' || slot === 'acc2' ? slot : it.slot, level: it.level, tier: order[ni], skillId: it.skillId });
    const next = { ...it, name: up.name, tier: up.tier, stats: up.stats };
    return { char: { ...char, equipped: { ...char.equipped, [slot]: next } }, text: `망령이 망치를 내리쳤다 — ${it.name} → ${next.name}!`, tone: 'good' };
  }
  if (omenId === 'merchantKing') {
    const cost = Math.round((60 + act.level * 10));
    if (char.gold < cost) return { char, text: `명전이 부족하다 (필요 ${cost}).`, tone: 'neutral' };
    const item = rollExoItem({ slot: pick(EXO_SLOT_IDS), level: act.level, tier: 'legend' });
    return { char: { ...char, gold: char.gold - cost }, item, text: `명전 ${cost}을 치렀다. 상인왕이 왕가의 물건을 내놓는다.`, tone: 'good' };
  }
  if (omenId === 'bloodAltar') {
    const d = exoDerived(char);
    const cost = Math.round(d.maxHp * 0.3);
    if (char.hp <= cost) return { char, text: '피가 모자라다 — 제단이 외면한다.', tone: 'neutral' };
    const cursed = Math.random() < 0.2;
    const item = rollExoItem({ slot: pick(EXO_SLOT_IDS), level: act.level, tier: cursed ? 'common' : (Math.random() < 0.4 ? 'legend' : 'epic'), luck });
    return { char: { ...char, hp: char.hp - cost }, item, text: cursed ? '제단이 비웃는다 — 고철 덩어리가 떨어졌다.' : '피가 스며들자 제단이 보답했다!', tone: cursed ? 'bad' : 'good' };
  }
  if (omenId === 'spiritEcho') {
    if ((char.spirits || []).length === 0) return { char, text: '올릴 사령이 없다.', tone: 'neutral' };
    const idx = Math.floor(Math.random() * char.spirits.length);
    const sp = char.spirits[idx];
    const fx = {};
    for (const [k, v] of Object.entries(sp.fx)) fx[k] = Math.round(v * 1.5 * 10) / 10;
    const spirits = char.spirits.map((s, i) => i === idx ? { ...s, fx, amplified: true } : s);
    return { char: { ...char, spirits }, text: `공명진이 울린다 — «${sp.name}»의 힘이 증폭됐다 (×1.5)!`, tone: 'good' };
  }
  if (omenId === 'rift') {
    const nextAct = EXO_ACTS[Math.min(EXO_ACTS.length - 1, char.actIdx + 1)];
    const item = rollExoItem({ slot: pick(EXO_SLOT_IDS), level: nextAct.level, luck: luck + 1 });
    return { char, item, text: `균열 너머에서 ${nextAct.name}의 공기가 묻은 장비를 끌어냈다!`, tone: 'good', alert: true };
  }
  return { char, text: '아무 일도 일어나지 않았다.', tone: 'neutral' };
}
export const rollExoOmen = () => pick(EXO_OMENS);

// =========================================================
// 14. 보상·상점
// =========================================================
export function exoVictoryRewards(char, enemy) {
  const T = EXO_TUNING;
  const act = getExoAct(char.actIdx);
  const luck = EXO_ASCENSIONS[char.ascension || 0]?.luckBonus || 0;
  const roleM = enemy.rank === 'boss' ? 5 : enemy.rank === 'elite' ? 2.2 : 1;
  const modM = char.floorMod === 'surge' ? 1.5 : 1;
  const gold = Math.round((T.goldBase + act.level * T.goldPerLv) * roleM * modM * rnd(0.85, 1.15));
  const drops = [];
  const dropPct = enemy.rank === 'boss' ? T.dropChanceBoss : enemy.rank === 'elite' ? T.dropChanceElite : T.dropChanceNormal;
  if (Math.random() * 100 < dropPct) drops.push(rollExoItem({ slot: pick(EXO_SLOT_IDS), level: act.level, luck: luck + (enemy.rank === 'boss' ? 2 : enemy.rank === 'elite' ? 1 : 0) }));
  if (enemy.rank === 'boss' && Math.random() < 0.5) drops.push(rollExoItem({ slot: pick(EXO_SLOT_IDS), level: act.level, luck: luck + 1 }));
  const talismanGain = enemy.rank === 'boss' ? 1 : enemy.rank === 'elite' && Math.random() * 100 < T.talismanElitePct ? 1 : 0;
  return { gold, drops, talismanGain };
}
export function buildExoShop(char) {
  const act = getExoAct(char.actIdx);
  const luck = EXO_ASCENSIONS[char.ascension || 0]?.luckBonus || 0;
  const items = [0, 1, 2].map(() => {
    const item = rollExoItem({ slot: pick(EXO_SLOT_IDS), level: act.level, luck });
    return { item, price: Math.round(exoSalvageValue(item) * 3.2 * rnd(0.9, 1.1)) };
  });
  return {
    items, bought: [],
    potionPrice: Math.round(30 + act.level * 4),
    talismanPrice: Math.round(70 + act.level * 9),
  };
}
