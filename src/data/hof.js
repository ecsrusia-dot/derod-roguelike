// ============================================
// data/hof.js — 명예의 전당 (1.98.0, PM 결정)
// ============================================
// Hall of Fame(제로식) 모티브 — "내가 짠 행동 패턴이 곧 전투력"인 프로그래밍 파티전.
// 본편·레이드와 완전 분리된 신규 시스템 (전용 캐릭터·스탯·SP·성장). 이름은 100% 오리지널.
//
// 전투 규칙:
//   - 라운드제. 생존 유닛 전원이 SPD 순으로 1회씩 행동.
//   - 행동 = 자신의 패턴 6슬롯을 위→아래 평가, 조건 충족 + SP 충분한 첫 행 실행. 없으면 기본 공격.
//   - 기본 공격/자세 정비는 SP를 회복. 스킬은 SP 소모.
//   - 근접 공격은 적 전열 우선 (전열 전멸 시 후열). 원거리/관통은 아무나.
//   - 후열은 받는 피해 -25%. 호위 태세 중인 유닛은 후열 대상 공격을 대신 받는다.
//   - 30라운드 초과 시 패배 판정 (교착 방지).

// ===== 전당 캐릭터 5인 =====
// growth: 레벨당 스탯 배율 +6% (hofStatAt)
export const HOF_CLASSES = [
  {
    id: 'blade',   name: '검무사',   icon: '⚔️', color: '#c4453d', row: 'front',
    desc: '전열 근접 딜러. 연격과 처형으로 적을 베어낸다.',
    base: { hp: 320, atk: 42, mag: 0,  spd: 14, def: 10 },
  },
  {
    id: 'bulwark', name: '철벽위병', icon: '🛡️', color: '#7ba3c4', row: 'front',
    desc: '전열 탱커. 호위 태세로 후열을 지키는 방패.',
    base: { hp: 480, atk: 26, mag: 0,  spd: 8,  def: 22 },
  },
  {
    id: 'windshot', name: '바람사수', icon: '🏹', color: '#7a9a5e', row: 'back',
    desc: '후열 원거리 딜러. 전열을 넘겨 급소를 노린다.',
    base: { hp: 260, atk: 38, mag: 0,  spd: 18, def: 6 },
  },
  {
    id: 'occultist', name: '비술사', icon: '🔮', color: '#5c4a8c', row: 'back',
    desc: '후열 마법사. 광역 폭발과 약화 저주를 다룬다.',
    base: { hp: 240, atk: 0,  mag: 44, spd: 12, def: 5 },
  },
  {
    id: 'chanter', name: '여명수사', icon: '✨', color: '#d4a574', row: 'back',
    desc: '후열 치유사. 기도로 아군을 일으켜 세운다.',
    base: { hp: 280, atk: 0,  mag: 30, spd: 10, def: 8 },
  },
];

// ===== 스킬 (kind: attack/aoe/heal/guard/buff/debuff/restore) =====
// power = atk 또는 mag 배율(%). ranged=전열 무시 타겟 가능. pierce=방어 무시.
export const HOF_SKILLS = {
  // 공통
  basic:   { id: 'basic',   name: '기본 공격', sp: 0, gain: 10, kind: 'attack', power: 100, desc: '평범한 일격. SP +10' },
  stance:  { id: 'stance',  name: '자세 정비', sp: 0, gain: 25, kind: 'restore', desc: '행동을 아껴 SP +25' },
  // 검무사
  doubleSlash: { id: 'doubleSlash', name: '연격',   sp: 20, kind: 'attack', power: 80, hits: 2, desc: '2연타 (타격당 80%)' },
  execute:     { id: 'execute',     name: '처형',   sp: 35, kind: 'attack', power: 220, executeBelow: 30, desc: 'HP 30% 이하 적에게 데미지 ×2 (기본 220%)' },
  // 철벽위병
  guardStance: { id: 'guardStance', name: '호위 태세', sp: 15, kind: 'guard', turns: 2, desc: '2라운드간 후열 대상 공격을 대신 받음 + 자신 방어 +50%' },
  shieldBash:  { id: 'shieldBash',  name: '방패 치기', sp: 20, kind: 'attack', power: 120, stun: 30, desc: '120% + 30% 확률 다음 행동 봉쇄' },
  // 바람사수
  snipe:       { id: 'snipe',       name: '저격',   sp: 25, kind: 'attack', power: 170, ranged: true, desc: '후열 포함 아무나 저격 (170%)' },
  pierceShot:  { id: 'pierceShot',  name: '관통 사격', sp: 30, kind: 'attack', power: 140, ranged: true, pierce: true, desc: '방어 무시 140% (전열 무시)' },
  // 비술사
  blast:       { id: 'blast',       name: '폭렬술',  sp: 35, kind: 'aoe', power: 90, ranged: true, desc: '적 전원에게 90%' },
  hexWeaken:   { id: 'hexWeaken',   name: '약화 저주', sp: 25, kind: 'debuff', weakenPct: 25, turns: 3, ranged: true, desc: '적 1명 공격력 -25% (3라운드)' },
  // 여명수사
  prayer:      { id: 'prayer',      name: '치유 기도', sp: 25, kind: 'heal', power: 160, desc: 'HP가 가장 낮은 아군 회복 (마력 160%)' },
  lightRay:    { id: 'lightRay',    name: '빛살',    sp: 15, kind: 'attack', power: 110, ranged: true, magic: true, desc: '마력 110% 원거리 타격' },
};

export const HOF_CLASS_SKILLS = {
  blade:    ['basic', 'stance', 'doubleSlash', 'execute'],
  bulwark:  ['basic', 'stance', 'guardStance', 'shieldBash'],
  windshot: ['basic', 'stance', 'snipe', 'pierceShot'],
  occultist:['basic', 'stance', 'blast', 'hexWeaken'],
  chanter:  ['basic', 'stance', 'prayer', 'lightRay'],
};

// ===== 패턴 조건 8종 (스크린샷 HOF 원작 조건 재해석) =====
// check(ctx) — ctx: { self, allies, enemies, value }
export const HOF_CONDITIONS = [
  { id: 'always',        name: '반드시',                    needsValue: false },
  { id: 'self_hp_below', name: '자신의 HP가 N% 이하',        needsValue: true, def: 50 },
  { id: 'ally_hp_below', name: 'HP N% 이하인 아군이 있을 때', needsValue: true, def: 40 },
  { id: 'enemy_hp_below',name: 'HP N% 이하인 적이 있을 때',   needsValue: true, def: 30 },
  { id: 'front_min',     name: '아군 전열 생존이 N명 이상',   needsValue: true, def: 2 },
  { id: 'self_back',     name: '자신이 후열일 때',           needsValue: false },
  { id: 'every_nth',     name: '자신의 N회째 행동마다',       needsValue: true, def: 3 },
  { id: 'sp_above',      name: 'SP가 N 이상일 때',           needsValue: true, def: 50 },
];

// 기본 패턴 (처음 접속 시 세팅 — 편집의 출발점)
export const HOF_DEFAULT_PATTERNS = {
  blade:    [{ c: 'enemy_hp_below', v: 30, s: 'execute' }, { c: 'sp_above', v: 40, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }],
  bulwark:  [{ c: 'every_nth', v: 2, s: 'guardStance' }, { c: 'sp_above', v: 40, s: 'shieldBash' }, { c: 'always', v: 0, s: 'basic' }],
  windshot: [{ c: 'enemy_hp_below', v: 40, s: 'snipe' }, { c: 'sp_above', v: 60, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }],
  occultist:[{ c: 'every_nth', v: 3, s: 'hexWeaken' }, { c: 'sp_above', v: 50, s: 'blast' }, { c: 'always', v: 0, s: 'basic' }],
  chanter:  [{ c: 'ally_hp_below', v: 50, s: 'prayer' }, { c: 'sp_above', v: 30, s: 'lightRay' }, { c: 'always', v: 0, s: 'stance' }],
};

export const HOF_MAX_PATTERNS = 6;

// ===== 성장 — 전당 훈장 =====
export const HOF_MEDAL = { name: '전당 훈장', icon: '🎖' };
export function hofLevelCost(lv) { return 2 + lv; } // Lv1→2: 3훈장, 선형 증가
export function hofStatAt(base, lv) { return Math.floor(base * (1 + (lv - 1) * 0.10)); } // 레벨당 +10%
export const HOF_REPEAT_MEDALS = 2; // 반복 클리어 훈장

// ===== 전당 리그 10단계 =====
// 적 유닛: HOF_CLASSES 아키타입 재사용 + 배율 + 전용 패턴 (위로 갈수록 교활)
const S = (cls, mult, patterns) => ({ cls, mult, patterns });
export const HOF_STAGES = [
  { id: 1, name: '수습 도전자들', mult: 0.7, firstMedals: 3, souls: 100,
    party: [
      S('blade', 1, [{ c: 'always', v: 0, s: 'basic' }]),
      S('bulwark', 1, [{ c: 'always', v: 0, s: 'basic' }]),
      S('windshot', 1, [{ c: 'always', v: 0, s: 'basic' }]),
    ] },
  { id: 2, name: '떠돌이 용병단', mult: 0.85, firstMedals: 4, souls: 150,
    party: [
      S('blade', 1, [{ c: 'sp_above', v: 40, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('bulwark', 1, [{ c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1, [{ c: 'ally_hp_below', v: 50, s: 'prayer' }, { c: 'always', v: 0, s: 'basic' }]),
    ] },
  { id: 3, name: '황혼 순찰대', mult: 1.0, firstMedals: 5, souls: 200,
    party: [
      S('blade', 1, [{ c: 'enemy_hp_below', v: 30, s: 'execute' }, { c: 'always', v: 0, s: 'basic' }]),
      S('bulwark', 1, [{ c: 'every_nth', v: 2, s: 'guardStance' }, { c: 'always', v: 0, s: 'basic' }]),
      S('windshot', 1, [{ c: 'sp_above', v: 25, s: 'snipe' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1, [{ c: 'ally_hp_below', v: 60, s: 'prayer' }, { c: 'always', v: 0, s: 'stance' }]),
    ] },
  { id: 4, name: '흑요석 검단', mult: 1.1, firstMedals: 6, souls: 250,
    party: [
      S('blade', 1.1, [{ c: 'enemy_hp_below', v: 35, s: 'execute' }, { c: 'sp_above', v: 40, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('blade', 1, [{ c: 'sp_above', v: 40, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('bulwark', 1, [{ c: 'every_nth', v: 2, s: 'guardStance' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1, [{ c: 'ally_hp_below', v: 55, s: 'prayer' }, { c: 'always', v: 0, s: 'lightRay' }]),
    ] },
  { id: 5, name: '봉인 감시자들', mult: 1.2, firstMedals: 8, souls: 300,
    party: [
      S('bulwark', 1.2, [{ c: 'every_nth', v: 2, s: 'guardStance' }, { c: 'sp_above', v: 30, s: 'shieldBash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('occultist', 1, [{ c: 'every_nth', v: 3, s: 'hexWeaken' }, { c: 'sp_above', v: 40, s: 'blast' }, { c: 'always', v: 0, s: 'stance' }]),
      S('windshot', 1, [{ c: 'enemy_hp_below', v: 40, s: 'snipe' }, { c: 'sp_above', v: 50, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1, [{ c: 'ally_hp_below', v: 60, s: 'prayer' }, { c: 'always', v: 0, s: 'stance' }]),
    ] },
  { id: 6, name: '균열의 습격자', mult: 1.3, firstMedals: 10, souls: 400,
    party: [
      S('blade', 1.2, [{ c: 'enemy_hp_below', v: 35, s: 'execute' }, { c: 'sp_above', v: 35, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('bulwark', 1.2, [{ c: 'ally_hp_below', v: 45, s: 'guardStance' }, { c: 'sp_above', v: 35, s: 'shieldBash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('occultist', 1.1, [{ c: 'front_min', v: 2, s: 'blast' }, { c: 'every_nth', v: 3, s: 'hexWeaken' }, { c: 'always', v: 0, s: 'stance' }]),
      S('windshot', 1.1, [{ c: 'sp_above', v: 55, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1, [{ c: 'ally_hp_below', v: 55, s: 'prayer' }, { c: 'always', v: 0, s: 'lightRay' }]),
    ] },
  { id: 7, name: '무너진 성소의 위병들', mult: 1.45, firstMedals: 12, souls: 500,
    party: [
      S('bulwark', 1.3, [{ c: 'every_nth', v: 2, s: 'guardStance' }, { c: 'always', v: 0, s: 'shieldBash' }]),
      S('bulwark', 1.2, [{ c: 'ally_hp_below', v: 50, s: 'guardStance' }, { c: 'always', v: 0, s: 'basic' }]),
      S('occultist', 1.2, [{ c: 'sp_above', v: 45, s: 'blast' }, { c: 'every_nth', v: 4, s: 'hexWeaken' }, { c: 'always', v: 0, s: 'stance' }]),
      S('chanter', 1.2, [{ c: 'ally_hp_below', v: 65, s: 'prayer' }, { c: 'always', v: 0, s: 'stance' }]),
      S('chanter', 1.1, [{ c: 'ally_hp_below', v: 45, s: 'prayer' }, { c: 'always', v: 0, s: 'lightRay' }]),
    ] },
  { id: 8, name: '핏빛 결사대', mult: 1.45, firstMedals: 15, souls: 650,
    party: [
      S('blade', 1.4, [{ c: 'enemy_hp_below', v: 40, s: 'execute' }, { c: 'sp_above', v: 30, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('blade', 1.3, [{ c: 'enemy_hp_below', v: 35, s: 'execute' }, { c: 'always', v: 0, s: 'basic' }]),
      S('windshot', 1.3, [{ c: 'enemy_hp_below', v: 45, s: 'snipe' }, { c: 'sp_above', v: 50, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }]),
      S('windshot', 1.2, [{ c: 'sp_above', v: 45, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1.2, [{ c: 'ally_hp_below', v: 60, s: 'prayer' }, { c: 'always', v: 0, s: 'stance' }]),
    ] },
  { id: 9, name: '황혼 기사단 정예', mult: 1.55, firstMedals: 18, souls: 800,
    party: [
      S('bulwark', 1.5, [{ c: 'every_nth', v: 2, s: 'guardStance' }, { c: 'sp_above', v: 30, s: 'shieldBash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('blade', 1.4, [{ c: 'enemy_hp_below', v: 40, s: 'execute' }, { c: 'sp_above', v: 35, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('occultist', 1.4, [{ c: 'front_min', v: 2, s: 'blast' }, { c: 'every_nth', v: 3, s: 'hexWeaken' }, { c: 'sp_above', v: 45, s: 'blast' }, { c: 'always', v: 0, s: 'stance' }]),
      S('windshot', 1.3, [{ c: 'enemy_hp_below', v: 50, s: 'snipe' }, { c: 'sp_above', v: 55, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1.3, [{ c: 'ally_hp_below', v: 70, s: 'prayer' }, { c: 'always', v: 0, s: 'lightRay' }]),
    ] },
  { id: 10, name: '전당의 챔피언', mult: 1.65, firstMedals: 25, souls: 1200,
    party: [
      S('blade', 1.6, [{ c: 'enemy_hp_below', v: 45, s: 'execute' }, { c: 'sp_above', v: 30, s: 'doubleSlash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('bulwark', 1.6, [{ c: 'ally_hp_below', v: 55, s: 'guardStance' }, { c: 'every_nth', v: 3, s: 'guardStance' }, { c: 'sp_above', v: 30, s: 'shieldBash' }, { c: 'always', v: 0, s: 'basic' }]),
      S('occultist', 1.5, [{ c: 'every_nth', v: 2, s: 'blast' }, { c: 'sp_above', v: 30, s: 'hexWeaken' }, { c: 'always', v: 0, s: 'stance' }]),
      S('windshot', 1.5, [{ c: 'enemy_hp_below', v: 50, s: 'snipe' }, { c: 'sp_above', v: 50, s: 'pierceShot' }, { c: 'always', v: 0, s: 'basic' }]),
      S('chanter', 1.5, [{ c: 'ally_hp_below', v: 65, s: 'prayer' }, { c: 'every_nth', v: 4, s: 'prayer' }, { c: 'always', v: 0, s: 'lightRay' }]),
    ] },
];

// ===== 전투 시뮬레이션 (순수 함수 — UI는 이벤트 로그를 재생만) =====
// 반환: { win, rounds, events: [{ text, kind, hp: {unitKey: [hp,maxHp]} }] }
export function simulateHofBattle(playerUnits, enemyUnits, rng = Math.random) {
  const units = [...playerUnits, ...enemyUnits];
  const events = [];
  const snap = () => {
    const hp = {};
    units.forEach(u => { hp[u.key] = [Math.max(0, u.hp), u.maxHp]; });
    return hp;
  };
  const push = (text, kind = 'act') => events.push({ text, kind, hp: snap() });
  const alive = (side) => units.filter(u => u.side === side && u.hp > 0);
  const frontAlive = (side) => alive(side).filter(u => u.row === 'front');

  const evalCondition = (u, row) => {
    const foes = alive(u.side === 'p' ? 'e' : 'p');
    const friends = alive(u.side);
    switch (row.c) {
      case 'always': return true;
      case 'self_hp_below': return (u.hp / u.maxHp) * 100 <= row.v;
      case 'ally_hp_below': return friends.some(a => (a.hp / a.maxHp) * 100 <= row.v);
      case 'enemy_hp_below': return foes.some(f => (f.hp / f.maxHp) * 100 <= row.v);
      case 'front_min': return frontAlive(u.side).length >= row.v;
      case 'self_back': return u.row === 'back';
      case 'every_nth': return row.v > 0 && u.actCount % row.v === 0;
      case 'sp_above': return u.sp >= row.v;
      default: return false;
    }
  };

  const pickTarget = (u, skill) => {
    const foes = alive(u.side === 'p' ? 'e' : 'p');
    if (foes.length === 0) return null;
    // 호위: 후열 대상이 잡히면 호위 중인 전열이 대신 받음 (근접 전열 우선 규칙 이후 적용)
    let pool = foes;
    if (!skill.ranged) {
      const front = foes.filter(f => f.row === 'front');
      if (front.length > 0) pool = front;
    }
    let target = pool[Math.floor(rng() * pool.length)];
    if (target.row === 'back') {
      const guardian = foes.find(f => f.row === 'front' && f.guardTurns > 0);
      if (guardian) { push(`  🛡 ${guardian.name}(이)가 ${target.name}을(를) 호위!`, 'guard'); target = guardian; }
    }
    return target;
  };

  const dealDamage = (u, target, skill, powerOverride = null) => {
    const stat = (skill.magic || u.atk <= 0) ? u.mag : u.atk;
    let dmg = stat * ((powerOverride ?? skill.power) / 100);
    dmg *= 0.85 + rng() * 0.3; // ±15%
    if (!skill.pierce) dmg -= target.def * 0.5;
    if (target.row === 'back') dmg *= 0.75;           // 후열 피해 감소
    if (target.guardTurns > 0) dmg *= 0.5;             // 호위 태세 방어 +50%
    if (u.weakenTurns > 0) dmg *= 1 - u.weakenPct / 100;
    if (rng() < 0.1) { dmg *= 1.5; push(`  ✦ 치명타!`, 'crit'); }
    dmg = Math.max(1, Math.floor(dmg));
    target.hp = Math.max(0, target.hp - dmg);
    return dmg;
  };

  push('━━ 전투 개시 ━━', 'round');
  for (let round = 1; round <= 30; round++) {
    push(`── ${round}라운드 ──`, 'round');
    const order = units.filter(u => u.hp > 0).sort((a, b) => b.spd - a.spd || (a.side === 'p' ? -1 : 1));
    for (const u of order) {
      if (u.hp <= 0) continue;
      if (alive('p').length === 0 || alive('e').length === 0) break;
      // 라운드 시작 감소류
      if (u.stunned) { u.stunned = false; push(`◦ ${u.name} — 봉쇄되어 행동 불가!`, 'stun'); continue; }
      u.actCount += 1;
      // 패턴 평가
      let chosen = null;
      for (const row of (u.patterns || [])) {
        const skill = HOF_SKILLS[row.s];
        if (!skill) continue;
        if ((skill.sp || 0) > u.sp) continue;
        if (evalCondition(u, row)) { chosen = { row, skill }; break; }
      }
      const skill = chosen ? chosen.skill : HOF_SKILLS.basic;
      u.sp = Math.max(0, u.sp - (skill.sp || 0)) + (skill.gain || 0);
      u.sp = Math.min(100, u.sp);

      if (skill.kind === 'restore') {
        push(`◦ ${u.name} — ${skill.name} (SP ${u.sp})`, 'restore');
      } else if (skill.kind === 'guard') {
        u.guardTurns = skill.turns;
        push(`◦ ${u.name} — ${skill.name} 돌입 (${skill.turns}라운드)`, 'guard');
      } else if (skill.kind === 'heal') {
        const friends = alive(u.side).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const t = friends[0];
        const heal = Math.floor(u.mag * (skill.power / 100) * (0.9 + rng() * 0.2));
        t.hp = Math.min(t.maxHp, t.hp + heal);
        push(`◦ ${u.name} — ${skill.name} → ${t.name} HP +${heal}`, 'heal');
      } else if (skill.kind === 'debuff') {
        const foes = alive(u.side === 'p' ? 'e' : 'p');
        if (foes.length > 0) {
          const t = foes.reduce((m, f) => (f.atk + f.mag > m.atk + m.mag ? f : m), foes[0]);
          t.weakenTurns = skill.turns;
          t.weakenPct = skill.weakenPct;
          push(`◦ ${u.name} — ${skill.name} → ${t.name} 공격력 -${skill.weakenPct}% (${skill.turns}라운드)`, 'debuff');
        }
      } else if (skill.kind === 'aoe') {
        const foes = alive(u.side === 'p' ? 'e' : 'p');
        let total = 0;
        foes.forEach(f => { total += dealDamage(u, f, skill); });
        push(`◦ ${u.name} — ${skill.name}! 적 전원에게 총 ${total} 데미지`, 'attack');
      } else {
        // attack
        const target = pickTarget(u, skill);
        if (!target) continue;
        let power = skill.power;
        if (skill.executeBelow && (target.hp / target.maxHp) * 100 <= skill.executeBelow) power *= 2;
        let total = 0;
        for (let h = 0; h < (skill.hits || 1); h++) {
          if (target.hp <= 0) break;
          total += dealDamage(u, target, skill, power);
        }
        push(`◦ ${u.name} — ${skill.name} → ${target.name}에게 ${total} 데미지${target.hp <= 0 ? ' 💀' : ''}`, 'attack');
        if (skill.stun && target.hp > 0 && rng() * 100 < skill.stun) {
          target.stunned = true;
          push(`  ⚡ ${target.name} 다음 행동 봉쇄!`, 'stun');
        }
      }
    }
    // 라운드 종료 — 지속 효과 감소
    units.forEach(u => {
      if (u.guardTurns > 0) u.guardTurns -= 1;
      if (u.weakenTurns > 0) { u.weakenTurns -= 1; if (u.weakenTurns === 0) u.weakenPct = 0; }
    });
    if (alive('e').length === 0) { push('━━ 승리! 전당에 이름이 새겨진다 ━━', 'end'); return { win: true, rounds: round, events }; }
    if (alive('p').length === 0) { push('━━ 전멸... 패턴을 다듬어 재도전하라 ━━', 'end'); return { win: false, rounds: round, events }; }
  }
  push('━━ 30라운드 경과 — 판정 패배 ━━', 'end');
  return { win: false, rounds: 30, events };
}

// 유닛 빌더 — 플레이어 (레벨 반영) / 적 (스테이지 배율)
export function buildHofPlayerUnit(cls, lv, patterns, idx) {
  return {
    key: `p_${cls.id}_${idx}`, side: 'p', id: cls.id, name: cls.name, icon: cls.icon, color: cls.color,
    row: cls.row, lv,
    hp: hofStatAt(cls.base.hp, lv), maxHp: hofStatAt(cls.base.hp, lv),
    atk: hofStatAt(cls.base.atk, lv), mag: hofStatAt(cls.base.mag, lv),
    spd: cls.base.spd, def: hofStatAt(cls.base.def, lv),
    sp: 30, actCount: 0, guardTurns: 0, weakenTurns: 0, weakenPct: 0, stunned: false,
    patterns,
  };
}

export function buildHofEnemyUnit(entry, stageMult, idx) {
  const cls = HOF_CLASSES.find(c => c.id === entry.cls);
  const m = stageMult * (entry.mult || 1);
  return {
    key: `e_${cls.id}_${idx}`, side: 'e', id: cls.id, name: `적 ${cls.name}`, icon: cls.icon, color: cls.color,
    row: cls.row,
    hp: Math.floor(cls.base.hp * m), maxHp: Math.floor(cls.base.hp * m),
    atk: Math.floor(cls.base.atk * m), mag: Math.floor(cls.base.mag * m),
    spd: cls.base.spd, def: Math.floor(cls.base.def * m),
    sp: 30, actCount: 0, guardTurns: 0, weakenTurns: 0, weakenPct: 0, stunned: false,
    patterns: entry.patterns,
  };
}
