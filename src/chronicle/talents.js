// ============================================
// chronicle/talents.js — 황혼 연대기 특성 트리 (1.224.0)
// ============================================
// PM 결정 (1.224.0):
//   마스터리(남는 포인트 = 공격·HP +1%) 폐지 → 와우식 특성 트리
//   직업마다 갈래 3개 × 5단. 그 갈래에 찍은 포인트가 5·10·15·20이 되면 다음 단 개방
//   초기화: Lv.60 이하 골드만 · Lv.61부터 골드 + 특성 초기화 주문서(10레벨마다 1장씩 추가)
//   주문서 = 보스 드랍, 확률은 유니크와 같음 · 기존 마스터리는 스킬 포인트로 환급 · 전승 시 특성 초기화
// 노드 fx = 1포인트당 값 (engine deriveUnit이 장비 합산 키와 같은 곳에 더한다)
//   sb_<스킬id> = 그 스킬 위력 +% (engine act에서 적용)
// 데이터 + 순수 함수만 — engine.js가 이 파일을 쓴다 (반대 방향 import 금지)
// ============================================

export const TALENT_TUNING = {
  tierStep: 5,                                   // 단 개방 = 그 갈래 투자 포인트 (단-1)×5
  resetGold: (lv) => 300 + lv * 60,              // 초기화 골드
  scrollFreeUntil: 60,                           // 이 레벨까지는 주문서 불필요
  scrollsFor: (lv) => (lv <= 60 ? 0 : Math.ceil((lv - 60) / 10)), // 61~70 1장 · 71~80 2장 · 81~90 3장 · 91~100 4장
};

const N = (id, name, max, fx) => ({ id, name, max, fx });
const T = (id, name, color, desc, tiers) => ({ id, name, color, desc, tiers });

export const TALENT_TREES = {
  wanderer: [
    T('w_t_counter', '반격술', '#9cc4e4', '피격을 기회로 — 반격 확률·횟수·피해', [
      [N('wt_c1', '날카로운 눈', 5, { counterPct: 0.02 }), N('wt_c2', '되받아치기', 5, { counterDmg: 0.06 })],
      [N('wt_c3', '흘려 넘기기', 5, { dodge: 0.006 }), N('wt_c4', '숨 고르기', 5, { dodgeHeal: 0.004 })],
      [N('wt_c5', '발도 숙련', 5, { sb_w_slash: 0.06 }), N('wt_c6', '이중 응수', 5, { counterDouble: 0.05 })],
      [N('wt_c7', '역습의 일격', 3, { critDmg: 0.05 }), N('wt_c8', '틈새 읽기', 1, { critAfterCounter: 1 })],
      [N('wt_c9', '무영의 응수', 1, { counterDouble: 0.25, counterPct: 0.05 })],
    ]),
    T('w_t_guard', '수호', '#d8c48a', '버티는 검 — HP·방어·피해 감소·재생', [
      [N('wt_g1', '단련된 몸', 5, { hpPct: 0.02 }), N('wt_g2', '강철 피부', 5, { defPct: 0.03 })],
      [N('wt_g3', '굳건함', 5, { dmgReduce: 0.006 }), N('wt_g4', '도발 숙련', 5, { tauntReduce: 0.05 })],
      [N('wt_g5', '전장의 숨결', 5, { regenPct: 0.002 }), N('wt_g6', '방패막이', 5, { shieldPct: 0.01 })],
      [N('wt_g7', '최후의 의지', 1, { guts: 1 }), N('wt_g8', '위기 대처', 3, { emergencyHeal: 0.1 })],
      [N('wt_g9', '불굴의 성채', 1, { thornsPct: 0.15, dmgReduce: 0.05 })],
    ]),
    T('w_t_blade', '검술', '#e8826a', '베어 넘기는 검 — 공격·치명·관통·연격', [
      [N('wt_b1', '검의 길', 5, { atkPct: 0.02 }), N('wt_b2', '급소 찌르기', 5, { crit: 0.01 })],
      [N('wt_b3', '일섬 숙련', 5, { sb_w_flash: 0.06 }), N('wt_b4', '검기 숙련', 5, { sb_w_storm: 0.06 })],
      [N('wt_b5', '갑옷 가르기', 5, { armorPen: 0.03 }), N('wt_b6', '연격', 5, { chain: 0.02 })],
      [N('wt_b7', '마무리', 3, { execute: 0.08 }), N('wt_b8', '빠른 칼집', 1, { cdr: 1 })],
      [N('wt_b9', '일섬 연격', 1, { sb_w_flash: 0.5, chain: 0.1 })],
    ]),
  ],
  sage: [
    T('s_t_flame', '겁화', '#e8826a', '타오르는 불 — 지속 피해·전투 시작 겁화', [
      [N('st_f1', '불씨', 5, { dotDmg: 0.05 }), N('st_f2', '겁화 숙련', 5, { sb_s_inferno: 0.05 })],
      [N('st_f3', '열기', 5, { skillDmg: 0.02 }), N('st_f4', '선제 화염', 5, { openInferno: 0.04 })],
      [N('st_f5', '화염구 숙련', 5, { sb_s_fireball: 0.06 }), N('st_f6', '작열', 5, { critDmg: 0.04 })],
      [N('st_f7', '빠른 영창', 1, { cdr: 1 }), N('st_f8', '화염 폭풍 숙련', 3, { sb_s_meteor: 0.1 })],
      [N('st_f9', '영겁의 불길', 1, { dotTurnsMult: 2 })],
    ]),
    T('s_t_arcane', '마력', '#9cc4e4', '순수한 마력 — 공격·스킬 피해·치명', [
      [N('st_a1', '마력 집중', 5, { atkPct: 0.02 }), N('st_a2', '주문 강화', 5, { skillDmg: 0.015 })],
      [N('st_a3', '예리한 마력', 5, { crit: 0.01 }), N('st_a4', '파괴의 마력', 5, { critDmg: 0.05 })],
      [N('st_a5', '운석 숙련', 5, { sb_s_starfall: 0.06 }), N('st_a6', '폭풍 숙련', 5, { sb_s_meteor: 0.05 })],
      [N('st_a7', '선제 주문', 1, { firstCrit: 1 }), N('st_a8', '방벽 꿰뚫기', 3, { armorPen: 0.05 })],
      [N('st_a9', '마력 폭주', 1, { skillDmg: 0.2, sb_s_surge: 0.5 })],
    ]),
    T('s_t_ward', '결계', '#c08ae8', '몸이 약한 술사의 방패 — HP·보호막·생존', [
      [N('st_w1', '단단한 정신', 5, { hpPct: 0.02 }), N('st_w2', '마력 방벽', 5, { shieldPct: 0.01 })],
      [N('st_w3', '결계 갑옷', 5, { defPct: 0.03 }), N('st_w4', '피해 흘리기', 5, { dmgReduce: 0.006 })],
      [N('st_w5', '주문 보호막', 5, { skillShield: 0.04 }), N('st_w6', '마력 순환', 5, { regenPct: 0.002 })],
      [N('st_w7', '긴급 결계', 3, { emergencyHeal: 0.1 }), N('st_w8', '마지막 주문', 1, { guts: 1 })],
      [N('st_w9', '재의 장막', 1, { shieldReduce: 0.2, overhealShield: 1 })],
    ]),
  ],
  demonblood: [
    T('d_t_blood', '혈광', '#e0574c', '피를 흘릴수록 강해진다 — 저체력 피해·처형', [
      [N('dt_b1', '끓는 피', 5, { lowHpDmg: 0.04 }), N('dt_b2', '상처의 분노', 5, { missingHpAtk: 0.01 })],
      [N('dt_b3', '피의 일격 숙련', 5, { sb_d_blood: 0.06 }), N('dt_b4', '혈월참 숙련', 5, { sb_d_moon: 0.05 })],
      [N('dt_b5', '찢어발기기', 5, { critDmg: 0.05 }), N('dt_b6', '피 냄새', 5, { execute: 0.04 })],
      [N('dt_b7', '죽지 않는 분노', 1, { guts: 1 }), N('dt_b8', '광폭 숙련', 3, { sb_d_rage: 0.1 })],
      [N('dt_b9', '피의 광란', 1, { rageDouble: 1, sb_d_rage: 0.3 })],
    ]),
    T('d_t_undying', '불사', '#9fd18a', '쓰러지지 않는 몸 — HP·재생·반사·부활', [
      [N('dt_u1', '마족의 육체', 5, { hpPct: 0.025 }), N('dt_u2', '두꺼운 가죽', 5, { defPct: 0.02 })],
      [N('dt_u3', '재생', 5, { regenPct: 0.002 }), N('dt_u4', '가시 피부', 5, { thornsPct: 0.02 })],
      [N('dt_u5', '버티기', 5, { dmgReduce: 0.006 }), N('dt_u6', '위기의 피', 5, { emergencyHeal: 0.06 })],
      [N('dt_u7', '되살아나는 피', 3, { revive: 0.1 }), N('dt_u8', '굳은살', 3, { hpPct: 0.03 })],
      [N('dt_u9', '불멸', 1, { revive: 0.2, hpPct: 0.1 })],
    ]),
    T('d_t_carnage', '학살', '#e8b04a', '무리를 쓸어버린다 — 공격·광역·연격', [
      [N('dt_c1', '살육 본능', 5, { atkPct: 0.02 }), N('dt_c2', '급소', 5, { crit: 0.008 })],
      [N('dt_c3', '학살 숙련', 5, { sb_d_slaughter: 0.06 }), N('dt_c4', '갑옷 부수기', 5, { armorPen: 0.02 })],
      [N('dt_c5', '연쇄 살육', 5, { chain: 0.02 }), N('dt_c6', '광기의 속도', 5, { spdPct: 0.02 })],
      [N('dt_c7', '끝없는 분노', 1, { cdr: 1 }), N('dt_c8', '혈월 연마', 3, { sb_d_moon: 0.08 })],
      [N('dt_c9', '대학살', 1, { sb_d_slaughter: 0.5, atkPct: 0.1 })],
    ]),
  ],
  elf: [
    T('e_t_wind', '바람', '#7fd1c8', '바람처럼 — 치명·회피·정령 화살', [
      [N('et_w1', '매의 눈', 5, { crit: 0.01 }), N('et_w2', '급소 사격', 5, { critDmg: 0.05 })],
      [N('et_w3', '바람 걸음', 5, { dodge: 0.006 }), N('et_w4', '바람의 숨', 5, { dodgeHeal: 0.004 })],
      [N('et_w5', '연속 화살 숙련', 5, { sb_e_volley: 0.06 }), N('et_w6', '정령 화살', 5, { spiritArrow: 0.02 })],
      [N('et_w7', '추가 화살', 2, { multiHitsAdd: 1 }), N('et_w8', '관통 화살', 3, { armorPen: 0.05 })],
      [N('et_w9', '질풍', 1, { multiHitsAdd: 2, spiritArrow: 0.15 })],
    ]),
    T('e_t_spirit', '정령', '#9fd18a', '숲의 정령 — 지속 피해·사역마 강화', [
      [N('et_s1', '독의 정령', 5, { dotDmg: 0.05 }), N('et_s2', '독화살 숙련', 5, { sb_e_venom: 0.06 })],
      [N('et_s3', '정령 소환 숙련', 5, { sb_e_spirits: 0.06 }), N('et_s4', '정령의 축복', 5, { skillDmg: 0.015 })],
      [N('et_s5', '숲의 숨결', 5, { regenPct: 0.002 }), N('et_s6', '정령 교감', 5, { famPct: 0.02 })],
      [N('et_s7', '화살비 숙련', 3, { sb_e_rain: 0.1 }), N('et_s8', '정령 가속', 1, { cdr: 1 })],
      [N('et_s9', '정령왕의 가호', 1, { dotTurnsMult: 2 })],
    ]),
    T('e_t_marks', '신궁', '#d8e89a', '한 발 한 발이 치명적 — 공격·속도·처형', [
      [N('et_m1', '활시위', 5, { atkPct: 0.02 }), N('et_m2', '빠른 손', 5, { spdPct: 0.02 })],
      [N('et_m3', '신궁 숙련', 5, { sb_e_divine: 0.06 }), N('et_m4', '연사', 5, { chain: 0.02 })],
      [N('et_m5', '마무리 사격', 5, { execute: 0.04 }), N('et_m6', '갑옷 틈새', 5, { armorPen: 0.02 })],
      [N('et_m7', '사냥꾼의 체력', 3, { hpPct: 0.04 }), N('et_m8', '몸 낮추기', 3, { dmgReduce: 0.02 })],
      [N('et_m9', '백발백중', 1, { firstCrit: 1, sb_e_divine: 0.4 })],
    ]),
  ],
  priest: [
    T('p_t_heal', '치유', '#8fe08a', '회복의 대가 — 회복량·재생·부활', [
      [N('pt_h1', '자비', 5, { healPct: 0.04 }), N('pt_h2', '생명의 빛', 5, { regenPct: 0.002 })],
      [N('pt_h3', '치유의 빛 숙련', 5, { sb_p_heal: 0.06 }), N('pt_h4', '기도 숙련', 5, { sb_p_dawn: 0.06 })],
      [N('pt_h5', '넘치는 은총', 1, { overhealShield: 1 }), N('pt_h6', '수호의 기도', 5, { emergencyHeal: 0.06 })],
      [N('pt_h7', '소생', 3, { revive: 0.1 }), N('pt_h8', '빠른 기도', 1, { cdr: 1 })],
      [N('pt_h9', '여명의 기적', 1, { sb_p_heal: 0.4, revive: 0.2 })],
    ]),
    T('p_t_bless', '축복', '#ffe9a8', '아군을 지키고 북돋운다 — 축복·보호막·방어', [
      [N('pt_b1', '축복 숙련', 5, { sb_p_bless: 0.06 }), N('pt_b2', '빛의 힘', 5, { atkPct: 0.02 })],
      [N('pt_b3', '가호 숙련', 5, { sb_p_shield: 0.06 }), N('pt_b4', '빛의 장막', 5, { shieldPct: 0.01 })],
      [N('pt_b5', '성스러운 갑주', 5, { defPct: 0.03 }), N('pt_b6', '굳센 믿음', 5, { hpPct: 0.02 })],
      [N('pt_b7', '오래가는 축복', 2, { blessTurns: 1 }), N('pt_b8', '평온', 3, { dmgReduce: 0.02 })],
      [N('pt_b9', '성역', 1, { blessTurns: 2, shieldReduce: 0.2 })],
    ]),
    T('p_t_judge', '심판', '#c9a0ff', '빛으로 벌한다 — 공격·신성 피해·처형', [
      [N('pt_j1', '징벌', 5, { atkPct: 0.025 }), N('pt_j2', '신성한 불', 5, { holyDmg: 0.01 })],
      [N('pt_j3', '신성 광선 숙련', 5, { sb_p_light: 0.06 }), N('pt_j4', '심판 숙련', 5, { sb_p_judge: 0.06 })],
      [N('pt_j5', '날카로운 빛', 5, { crit: 0.01 }), N('pt_j6', '타오르는 빛', 5, { critDmg: 0.05 })],
      [N('pt_j7', '단죄', 3, { execute: 0.08 }), N('pt_j8', '빠른 판결', 1, { cdr: 1 })],
      [N('pt_j9', '최후의 심판', 1, { sb_p_judge: 0.5, armorPen: 0.15 })],
    ]),
  ],
};

// ===== 조회 =====
export const talentTrees = (classId) => TALENT_TREES[classId] || [];
// 갈래 → 짝 동행 역할 (1.236.0 PM: 특성 테크에 따라 최적 동행이 바뀌도록)
//   딜 갈래 = 수호(내가 때리는 동안 막아 줌) · 생존 갈래 = 맹공(내가 버티는 동안 정리) · 지속·반격 갈래 = 치유(긴 전투)
export const TREE_FAM = {
  w_t_counter: 'healer', w_t_guard: 'dps', w_t_blade: 'tank',
  s_t_flame: 'healer', s_t_arcane: 'tank', s_t_ward: 'dps',
  d_t_blood: 'healer', d_t_undying: 'dps', d_t_carnage: 'tank',
  e_t_wind: 'dps', e_t_spirit: 'healer', e_t_marks: 'tank',
  p_t_heal: 'dps', p_t_bless: 'tank', p_t_judge: 'healer',
};
const NODE_INDEX = {};
for (const [cid, trees] of Object.entries(TALENT_TREES)) {
  trees.forEach(tree => tree.tiers.forEach((row, ti) => row.forEach(n => { NODE_INDEX[n.id] = { ...n, cls: cid, tree: tree.id, tier: ti }; })));
}
export const talentNode = (id) => NODE_INDEX[id] || null;
export function treePoints(u, treeId) {
  let n = 0;
  for (const [id, r] of Object.entries(u.talents || {})) if (NODE_INDEX[id]?.tree === treeId) n += r;
  return n;
}
export const talentSpent = (u) => Object.values(u.talents || {}).reduce((a, b) => a + b, 0);
export const tierUnlocked = (u, treeId, tier) => treePoints(u, treeId) >= tier * TALENT_TUNING.tierStep;
export function canLearnTalent(u, nodeId) {
  const n = NODE_INDEX[nodeId];
  if (!n || n.cls !== u.classId || u.sp <= 0) return false;
  if ((u.talents?.[nodeId] || 0) >= n.max) return false;
  return tierUnlocked(u, n.tree, n.tier);
}
// 찍은 특성 → 합산 fx (1포인트당 값 × 랭크)
export function talentFx(u) {
  const fx = {};
  for (const [id, r] of Object.entries(u.talents || {})) {
    const n = NODE_INDEX[id];
    if (!n || !r) continue;
    for (const [k, v] of Object.entries(n.fx)) fx[k] = (fx[k] || 0) + v * r;
    const role = TREE_FAM[n.tree];
    if (role) fx[`fam_${role}`] = (fx[`fam_${role}`] || 0) + r; // 짝 역할 시너지 포인트 수 (효과는 engine famSynergyFx)
  }
  return fx;
}
// 초기화 비용
export function talentResetCost(u) {
  return { gold: TALENT_TUNING.resetGold(u.lv), scrolls: TALENT_TUNING.scrollsFor(u.lv) };
}

// ===== 효과 문구 (fx에서 자동 생성) =====
const LBL = {
  atkPct: ['공격력', '%'], hpPct: ['최대 HP', '%'], defPct: ['방어', '%'], crit: ['치명타 확률', '%'], critDmg: ['치명타 피해', '%'],
  dodge: ['회피', '%'], dodgeHeal: ['회피 시 HP 회복', '%'], counterPct: ['반격 확률', '%'], counterDmg: ['반격 피해', '%'], counterDouble: ['반격 2회 확률', '%'],
  critAfterCounter: ['반격·회피 직후 다음 공격 치명 확정', 'flag'], dmgReduce: ['받는 피해 감소', '%'], tauntReduce: ['도발 중 받는 피해 감소', '%'],
  regenPct: ['매 턴 HP 재생', '%'], shieldPct: ['전투 시작 보호막(최대 HP)', '%'], guts: ['전투당 1회 HP 1로 버팀', 'flag'], emergencyHeal: ['HP 30% 미만 시 1회 회복', '%'],
  thornsPct: ['받은 피해 반사', '%'], armorPen: ['방어 관통', '%'], chain: ['단일 공격 뒤 추가 타격 확률', '%'], execute: ['HP 30% 미만 적에게 피해', '%'],
  cdr: ['모든 스킬 재사용 대기', 'turn'], dotDmg: ['지속 피해', '%'], skillDmg: ['스킬 피해', '%'], openInferno: ['이프리트의 낙인(공격력)', '%'],
  dotTurnsMult: ['지속 피해 지속 시간 ×', 'x'], firstCrit: ['전투 첫 공격 치명 확정', 'flag'], skillShield: ['스킬 사용 시 보호막(공격력)', '%'],
  shieldReduce: ['보호막이 있는 동안 받는 피해 감소', '%'], overhealShield: ['최대 HP를 넘는 회복은 보호막으로', 'flag'], lowHpDmg: ['HP 50% 이하일 때 피해', '%'],
  missingHpAtk: ['잃은 HP 10%마다 공격력', '%'], revive: ['전투당 1회 쓰러지면 부활(최대 HP)', '%'], rageDouble: ['광폭화 중 모든 공격 2회', 'flag'],
  spdPct: ['속도', '%'], multiHitsAdd: ['연속 화살 타수', 'n'], spiritArrow: ['공격 뒤 정령 화살 확률', '%'], famPct: ['사역마 능력치', '%'],
  healPct: ['회복량', '%'], holyDmg: ['회복의 일부를 신성 피해로', '%'], blessTurns: ['축복 지속', 'turnAdd'],
};
export function talentFxText(fx, skillName = (id) => id) {
  return Object.entries(fx).map(([k, v]) => {
    if (k.startsWith('sb_')) return `「${skillName(k.slice(3))}」 위력 +${Math.round(v * 100)}%`;
    const [label, unit] = LBL[k] || [k, ''];
    if (unit === 'flag') return label;
    if (unit === '%') return `${label} +${Math.round(v * 1000) / 10}%`;
    if (unit === 'turn') return `${label} -${v}턴`;
    if (unit === 'turnAdd') return `${label} +${v}턴`;
    if (unit === 'x') return `${label}${v}`;
    return `${label} +${v}`;
  }).join(' · ');
}
