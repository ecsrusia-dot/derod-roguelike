// ===== 훈련장 (1.306.0) — 체력이 무한인 허수아비에게 피해를 재 본다 (보상·기록 없음, 저장 불변) =====
// 순수 함수 · engine만 사용. 설정은 화면이 localStorage에 보관한다
import * as E from './engine.js';
import { CHRONICLE_FIELDS, buildChronicleEnemy, BOSS_MECHS } from './data.js';
import { CENEMIES as ENEMIES } from './enemies.js';

export const TRAINING = {
  inf: 1e12,                 // 「무한」 체력 (표시는 ∞)
  rounds: [5, 10, 20, 30],
  lvMin: 1, lvMax: 170,
};
export const TRAIN_FORMS = [
  { id: 'single', label: '허수아비 1', desc: '적 1명 — 단일 대상 피해' },
  { id: 'pack', label: '무리 3', desc: '적 3명 — 광역·연속기 피해' },
  { id: 'boss', label: '보스', desc: '지역 보스 — 기믹·수행원 포함' },
];
export const TRAIN_ROLES = [
  { id: 'dps', label: '맹공', desc: '기본 몸 · 공격 100%' },
  { id: 'tank', label: '수호', desc: '방어 ×1.5 · 3턴마다 도발' },
  { id: 'healer', label: '치유', desc: '아군 회복 · 공격 50%' },
  { id: 'mix', label: '혼합', desc: '수호 + 치유 + 맹공 (무리 전용)' },
];
// 보스 선택지 — 심층 복제 지역은 제외
export const trainBossFields = () => CHRONICLE_FIELDS.filter(f => !f.depth && f.boss);
export const defaultTraining = (heroLv = 1) => ({ form: 'single', role: 'dps', lv: heroLv, fieldId: 1, attack: false, rounds: 10 });
export function normTraining(cfg, heroLv = 1) {
  const d = defaultTraining(heroLv); const c = { ...d, ...(cfg || {}) };
  if (!TRAIN_FORMS.some(f => f.id === c.form)) c.form = d.form;
  if (!TRAIN_ROLES.some(r => r.id === c.role)) c.role = d.role;
  if (c.role === 'mix' && c.form !== 'pack') c.role = 'dps';
  c.lv = Math.max(TRAINING.lvMin, Math.min(TRAINING.lvMax, Math.round(+c.lv || heroLv)));
  if (!trainBossFields().some(f => f.id === c.fieldId)) c.fieldId = 1;
  if (!TRAINING.rounds.includes(c.rounds)) c.rounds = d.rounds;
  c.attack = !!c.attack;
  return c;
}
// 레벨에 맞는 지역 (그림·공격 배율용) — 범위 안이면 그 지역, 아니면 가장 가까운 지역
function fieldForLv(lv) {
  const fs = trainBossFields();
  return fs.find(f => lv >= f.lv[0] && lv <= f.lv[1]) || fs.slice().sort((a, b) => Math.abs((a.lv[0] + a.lv[1]) / 2 - lv) - Math.abs((b.lv[0] + b.lv[1]) / 2 - lv))[0];
}
const asDummy = (e, name) => ({ ...e, hp: TRAINING.inf, maxHp: TRAINING.inf, dummy: true, name: name || e.name, rewardMult: 0, goldMult: 0 });

export function buildTrainingEnemies(save, cfg0, rng = Math.random) {
  const cfg = normTraining(cfg0, save.units[save.hero]?.lv || 1);
  let enemies; let mech = null;
  if (cfg.form === 'boss') {
    const f = CHRONICLE_FIELDS[cfg.fieldId - 1];
    const enc = E.rollFieldEncounter({ ...f, bossLv: cfg.lv }, rng, true);
    mech = enc.mech || null;
    enemies = enc.enemies.map(e => (e.tier === 'boss' ? asDummy(e) : e)); // 수행원(결계 호위·의식 사제)은 원래 체력
  } else {
    const f = fieldForLv(cfg.lv);
    const n = cfg.form === 'pack' ? 3 : 1;
    const roles = cfg.role === 'mix' ? ['tank', 'healer', 'dps'] : Array(n).fill(cfg.role);
    const ROLE_NAME = { tank: '수호', healer: '치유', dps: '맹공' };
    enemies = roles.map((role, i) => {
      const base = buildChronicleEnemy(f.normals[i % f.normals.length], cfg.lv, `e${i}`, f.area);
      return asDummy(E.roleEnemy(base, role), `허수아비 (${ROLE_NAME[role]})`);
    });
  }
  enemies = E.scaleEnemiesForRebirth(save, enemies);
  if (!cfg.attack) enemies = enemies.map(e => ({ ...e, passive: true }));
  return { cfg, enemies, mech };
}

// 피해 미터 — 유닛별·스킬별 피해, 라운드당 피해
export function trainingMeter(sim, party) {
  const st = E.battleDamageStats(sim, party);
  const rounds = Math.max(1, sim.rounds || 1);
  const total = Object.values(st.byUnit).reduce((a, b) => a + b, 0);
  const units = party.map(p => ({ id: p.id, name: p.name, fam: !!p.fam, dmg: st.byUnit[p.id] || 0 })).sort((a, b) => b.dmg - a.dmg);
  const skills = Object.entries(st.bySkill).map(([k, d]) => { const [id, n] = k.split('|'); return { id, name: n, dmg: d, fam: !!party.find(p => p.id === id)?.fam }; }).sort((a, b) => b.dmg - a.dmg);
  const taken = Object.values(st.takenBy).reduce((a, b) => a + b, 0);
  return { total, rounds, perRound: Math.round(total / rounds), units, skills, taken };
}

export function runTraining(save, cfg0, rng = Math.random) {
  const { cfg, enemies, mech } = buildTrainingEnemies(save, cfg0, rng);
  const party = E.partyCombatants(save);
  const sim = E.simulateChronicleBattle(party, enemies, rng, { maxRounds: cfg.rounds, training: true });
  const meter = trainingMeter(sim, party);
  const summary = { result: sim.result, exp: 0, gold: 0, items: [], essence: 0, shard: 0, levelUps: {}, unlocks: [], training: { ...meter, cfg, mech, died: sim.result !== 'win' } };
  return { cfg, enemies, party, sim, summary, mech };
}
export function trainingLabel(cfg) {
  const f = TRAIN_FORMS.find(x => x.id === cfg.form);
  const who = cfg.form === 'boss' ? `${ENEMIES[CHRONICLE_FIELDS[cfg.fieldId - 1].boss]?.name || '보스'}` : `${f.label} · ${TRAIN_ROLES.find(r => r.id === cfg.role).label}`;
  return `훈련장 · ${who} Lv.${cfg.lv} · ${cfg.attack ? '공격 켬' : '공격 끔'}`;
}
export { BOSS_MECHS };
