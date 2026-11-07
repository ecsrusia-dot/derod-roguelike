// ============================================
// arcana/engine.js — 트와일라잇 아르카나 순수 로직
// ============================================
// 모든 함수는 (run, ..., rng) → 새 run. 입력을 바꾸지 않는다 (clone 후 수정).
// UI는 결과를 그대로 state에 넣고 그리기만 한다 → node 시뮬로 밸런스 검증 가능
// (scripts/sim-arcana.mjs).
// ============================================
import {
  ARCANA_TUNING as T, ARCANA_CARDS, ARCANA_RELICS, ARCANA_EVENTS,
  arcanaClass, cardDef, relicFx, actEnemyKeys, buildArcanaEnemy,
} from './data.js';

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weighted(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

// ===== 런 =====
export function newArcanaRun(classId, rng = Math.random) {
  const cls = arcanaClass(classId);
  let uid = 1;
  const deck = [];
  for (let i = 0; i < 5; i++) deck.push({ uid: uid++, id: 'strike', up: false });
  for (let i = 0; i < 4; i++) deck.push({ uid: uid++, id: 'defend', up: false });
  deck.push({ uid: uid++, id: cls.sig, up: false });
  const run = {
    v: 1, classId: cls.id, hp: cls.hp, maxHp: cls.hp, gold: 60,
    deck, nextUid: uid, relics: [], act: 1, floor: 0, map: null,
    phase: 'map', combat: null, reward: null, shop: null, event: null, pick: null, bossRelics: null,
    removeCost: T.shopPrice.remove, log: [],
    stats: { kills: 0, elites: 0, bosses: 0, cardsPlayed: 0, maxHit: 0 },
  };
  run.map = genActMap(rng);
  return run;
}

export function genActMap(rng = Math.random) {
  const floors = [];
  for (let f = 0; f < T.floorsPerAct; f++) {
    if (f === 0) floors.push(['battle']);
    else if (f === T.floorsPerAct - 2) floors.push(['rest']);
    else if (f === T.floorsPerAct - 1) floors.push(['boss']);
    else {
      const n = rng() < 0.35 ? 2 : 3;
      const opts = [];
      let guard = 0;
      while (opts.length < n && guard++ < 50) {
        const w = { ...T.nodeWeights };
        if (f < 2) w.elite = 0;
        if (f === T.floorsPerAct - 3) w.rest = 0; // 야영 직전 야영 중복 방지
        const k = weighted(rng, w);
        if (!opts.includes(k) || (k === 'battle' && opts.filter(x => x === 'battle').length < 1)) opts.push(k);
      }
      if (!opts.includes('battle') && !opts.includes('elite')) opts[0] = 'battle';
      floors.push(opts);
    }
  }
  return floors;
}

export function runFx(run) { return relicFx(run.relics); }

function addCardToDeck(run, id, up = false) {
  run.deck.push({ uid: run.nextUid++, id, up });
}
function gainGold(run, n) {
  const fx = runFx(run);
  const g = n > 0 ? Math.round(n * (1 + (fx.goldPct || 0) / 100)) : n;
  run.gold = Math.max(0, run.gold + g);
  return g;
}
function addRelic(run, id) {
  if (!id || run.relics.includes(id)) return;
  run.relics.push(id);
  const r = ARCANA_RELICS[id];
  if (r?.fx?.maxHp) { run.maxHp += r.fx.maxHp; run.hp += r.fx.maxHp; }
}
export function rollRelic(run, rng, boss = false) {
  const pool = Object.keys(ARCANA_RELICS).filter(id => !!ARCANA_RELICS[id].boss === boss && !run.relics.includes(id));
  return pool.length ? pick(rng, pool) : null;
}

// 카드 보상 롤 — 직업 카드 + 일부 공용
export function rollCardChoices(run, rng, { elite = false, count = 3, rarity = null } = {}) {
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const r = rarity || weighted(rng, elite ? T.eliteRarityWeights : T.rarityWeights);
    const neutral = rng() < T.neutralChance;
    const pool = Object.values(ARCANA_CARDS).filter(c => c.rarity === r && (neutral ? c.cls === 'neutral' : c.cls === run.classId));
    if (!pool.length) continue;
    const c = pick(rng, pool);
    if (!out.includes(c.id)) out.push(c.id);
  }
  return out;
}

// ===== 노드 선택 =====
export function chooseNode(run0, idx, rng = Math.random) {
  const run = clone(run0);
  const node = run.map[run.floor]?.[idx];
  if (!node || run.phase !== 'map') return run0;
  run.nodeType = node;
  if (node === 'battle' || node === 'elite' || node === 'boss') return startCombat(run, node, rng);
  if (node === 'rest') { run.phase = 'rest'; return run; }
  if (node === 'treasure') {
    run.phase = 'reward';
    run.reward = { gold: 0, goldGained: gainGold(run, ri(rng, 20, 35)), cards: [], relic: rollRelic(run, rng), title: '보물 상자' };
    return run;
  }
  if (node === 'shop') { run.phase = 'shop'; run.shop = buildShop(run, rng); return run; }
  if (node === 'event') { run.phase = 'event'; run.event = pick(rng, ARCANA_EVENTS).id; return run; }
  return run;
}

// ===== 전투 =====
function rollIntent(enemy, rng) {
  let options = enemy.patterns;
  if (enemy.lastHeavy) options = options.filter(p => !p.heavy);
  if (enemy.lastDefend) options = options.filter(p => p.type !== 'defend');
  if (!options.length) options = enemy.patterns;
  const p = pick(rng, options);
  enemy.lastHeavy = !!p.heavy;
  enemy.lastDefend = p.type === 'defend';
  if (p.type === 'defend') return { type: 'defend', name: p.name, block: p.block };
  return { type: 'attack', name: p.name, heavy: p.heavy, value: ri(rng, p.dmg[0], p.dmg[1]) };
}

export function startCombat(run0, type, rng = Math.random) {
  const run = clone(run0);
  const tier = type === 'battle' ? 'normal' : type;
  const keys = actEnemyKeys(run.act, tier);
  // 일반 전투는 막의 앞쪽 층일수록 약한 적 우선 (HP 오름차순 앞 절반)
  let key;
  if (tier === 'normal') {
    const sorted = keys.slice().sort((a, b) => buildArcanaEnemy(a).hp - buildArcanaEnemy(b).hp);
    const early = run.floor < 3 ? sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))) : sorted;
    key = pick(rng, early);
  } else key = pick(rng, keys);
  const enemy = { ...buildArcanaEnemy(key), block: 0, vuln: 0, weak: 0, poison: 0, str: 0, turn: 1, raged: false };
  const fx = runFx(run);
  const combat = {
    type, enemy,
    p: { block: 0, str: fx.startStr || 0, dex: 0, energy: 0, counter: 0, thorns: 0, blockKeep: 0, undying: 0,
      turnBlock: 0, turnPoison: 0, turnStr: 0, turnDraw: 0, turnEnergy: 0, turnDmg: 0, turnSelfDmg: 0 },
    draw: shuffle(rng, run.deck.map(c => c.uid)), hand: [], discard: [], exhaust: [], powers: [],
    turn: 0, events: [],
  };
  if (fx.startBlock) combat.p.block += fx.startBlock;
  if (fx.startVuln) enemy.vuln += fx.startVuln;
  if (fx.startPoison) enemy.poison += fx.startPoison;
  enemy.intent = rollIntent(enemy, rng);
  run.combat = combat;
  run.phase = 'combat';
  startPlayerTurn(run, rng, true);
  return run;
}

function drawCards(run, n, rng) {
  const c = run.combat;
  for (let i = 0; i < n; i++) {
    if (c.hand.length >= 10) break;
    if (!c.draw.length) {
      if (!c.discard.length) break;
      c.draw = shuffle(rng, c.discard);
      c.discard = [];
    }
    c.hand.push(c.draw.shift());
  }
}

export function deckCard(run, uid) {
  const inst = run.deck.find(c => c.uid === uid);
  return inst ? { ...cardDef(inst.id, inst.up), uid } : null;
}

// 공격 피해 계산 (힘·약화·취약)
export function calcAttack(base, att, def) {
  let d = base + (att.str || 0);
  if (att.weak > 0) d *= 0.75;
  if (def.vuln > 0) d *= 1.5;
  return Math.max(0, Math.floor(d));
}

function hitEnemy(run, raw, { ignoreBlock = false } = {}) {
  const e = run.combat.enemy;
  let dmg = raw;
  if (!ignoreBlock && e.block > 0) {
    const absorbed = Math.min(e.block, dmg);
    e.block -= absorbed;
    dmg -= absorbed;
  }
  e.hp = Math.max(0, e.hp - dmg);
  if (raw > run.stats.maxHit) run.stats.maxHit = raw;
  run.combat.events.push({ t: 'enemyHit', n: dmg, raw });
  checkBossRage(run);
  return dmg;
}
function checkBossRage(run) {
  const e = run.combat.enemy;
  if (e.tier === 'boss' && !e.raged && e.hp > 0 && e.hp <= e.maxHp / 2) {
    e.raged = true;
    e.str += T.bossRageStr;
    run.combat.events.push({ t: 'rage' });
  }
}
function hurtPlayer(run, raw, { ignoreBlock = false } = {}) {
  const p = run.combat.p;
  let dmg = raw;
  if (!ignoreBlock && p.block > 0) {
    const absorbed = Math.min(p.block, dmg);
    p.block -= absorbed;
    dmg -= absorbed;
  }
  run.hp = Math.max(0, run.hp - dmg);
  run.combat.events.push({ t: 'playerHit', n: dmg, raw });
  if (run.hp <= 0 && p.undying > 0) {
    p.undying -= 1;
    run.hp = 1;
    run.combat.events.push({ t: 'undying' });
  }
  return dmg;
}

export function canPlay(run, uid) {
  const c = run.combat;
  if (!c || run.phase !== 'combat' || !c.hand.includes(uid)) return false;
  const card = deckCard(run, uid);
  return !!card && card.cost <= c.p.energy;
}

function applyOps(run, card, rng) {
  const c = run.combat;
  const p = c.p;
  const e = c.enemy;
  const missing = run.maxHp - run.hp;
  for (const op of card.fx) {
    if (e.hp <= 0 || run.hp <= 0) break;
    if (op.dmg != null) {
      const hits = op.hits || 1;
      for (let h = 0; h < hits && e.hp > 0; h++) {
        const base = op.dmg + Math.floor(missing * (op.missingPct || 0));
        hitEnemy(run, calcAttack(base, p, e));
      }
    } else if (op.dmgBlock != null) hitEnemy(run, calcAttack(p.block * op.dmgBlock, p, e));
    else if (op.dmgPoison != null) hitEnemy(run, calcAttack(e.poison * op.dmgPoison, p, e));
    else if (op.block != null) p.block += Math.max(0, op.block + p.dex);
    else if (op.draw != null) drawCards(run, op.draw, rng);
    else if (op.energy != null) p.energy += op.energy;
    else if (op.heal != null) run.hp = Math.min(run.maxHp, run.hp + op.heal);
    else if (op.selfDmg != null) hurtPlayer(run, op.selfDmg, { ignoreBlock: true });
    else if (op.str != null) p.str += op.str;
    else if (op.dex != null) p.dex += op.dex;
    else if (op.counter != null) p.counter += op.counter;
    else if (op.vuln != null) e.vuln += op.vuln;
    else if (op.weak != null) e.weak += op.weak;
    else if (op.poison != null) e.poison += op.poison;
    else if (op.doublePoison) e.poison *= 2;
    else if (op.blockKeep) p.blockKeep = 1;
    else if (op.undying) p.undying += op.undying;
    else {
      for (const k of ['turnBlock', 'turnPoison', 'turnStr', 'turnDraw', 'turnEnergy', 'turnDmg', 'turnSelfDmg', 'thorns']) {
        if (op[k] != null) p[k] += op[k];
      }
    }
  }
}

export function playCard(run0, uid, rng = Math.random) {
  if (!canPlay(run0, uid)) return run0;
  const run = clone(run0);
  const c = run.combat;
  c.events = [];
  const card = deckCard(run, uid);
  c.p.energy -= card.cost;
  c.hand = c.hand.filter(x => x !== uid);
  run.stats.cardsPlayed += 1;
  c.events.push({ t: 'play', id: card.id, name: card.name, type: card.type });
  applyOps(run, card, rng);
  if (card.type === 'power') c.powers.push(card.id);
  else if (card.exhaust) c.exhaust.push(uid);
  else c.discard.push(uid);
  if (run.hp <= 0) return defeat(run);
  if (c.enemy.hp <= 0) return winCombat(run, rng);
  return run;
}

function startPlayerTurn(run, rng, first = false) {
  const c = run.combat;
  const p = c.p;
  const fx = runFx(run);
  c.turn += 1;
  if (!p.blockKeep && !first) p.block = 0;
  p.counter = 0;
  p.energy = T.energyPerTurn + p.turnEnergy + (fx.turnEnergy || 0) + (first ? (fx.firstEnergy || 0) : 0);
  p.block += p.turnBlock + (fx.turnBlock || 0);
  p.str += p.turnStr;
  if (p.turnSelfDmg) hurtPlayer(run, p.turnSelfDmg, { ignoreBlock: true });
  if (run.hp <= 0) return;
  if (p.turnPoison) c.enemy.poison += p.turnPoison;
  if (p.turnDmg) hitEnemy(run, p.turnDmg);
  drawCards(run, T.handSize + p.turnDraw + (fx.turnDraw || 0) + (first ? (fx.firstDraw || 0) : 0), rng);
}

// 적 의도 피해 미리보기
export function intentDamage(run) {
  const c = run.combat;
  if (!c || c.enemy.intent?.type !== 'attack') return 0;
  return calcAttack(c.enemy.intent.value, c.enemy, { vuln: 0 });
}

export function endTurn(run0, rng = Math.random) {
  if (run0.phase !== 'combat') return run0;
  const run = clone(run0);
  const c = run.combat;
  const p = c.p;
  const e = c.enemy;
  c.events = [];
  c.discard.push(...c.hand);
  c.hand = [];
  // 1) 적 중독
  if (e.poison > 0) {
    e.hp = Math.max(0, e.hp - e.poison);
    c.events.push({ t: 'poison', n: e.poison });
    e.poison -= 1;
    checkBossRage(run);
    if (e.hp <= 0) return winCombat(run, rng);
  }
  // 2) 적 방어 초기화 → 의도 실행
  e.block = 0;
  const it = e.intent;
  if (it.type === 'attack') {
    const dmg = calcAttack(it.value, e, { vuln: 0 });
    c.events.push({ t: 'enemyAct', name: it.name, heavy: it.heavy });
    hurtPlayer(run, dmg);
    const back = p.counter + p.thorns;
    if (back > 0) {
      hitEnemy(run, back, { ignoreBlock: true });
      c.events.push({ t: 'counter', n: back });
    }
  } else {
    e.block += it.block;
    c.events.push({ t: 'enemyAct', name: it.name, block: it.block });
  }
  if (run.hp <= 0) return defeat(run);
  if (e.hp <= 0) return winCombat(run, rng);
  // 3) 디버프 감소 · 턴 진행
  if (e.vuln > 0) e.vuln -= 1;
  if (e.weak > 0) e.weak -= 1;
  e.turn += 1;
  const every = T.strEvery[e.tier];
  if (every && e.turn % every === 0) { e.str += 1; c.events.push({ t: 'enemyStr' }); }
  e.intent = rollIntent(e, rng);
  startPlayerTurn(run, rng);
  if (run.hp <= 0) return defeat(run);
  if (e.hp <= 0) return winCombat(run, rng);
  return run;
}

function defeat(run) {
  run.phase = 'defeat';
  return run;
}

function winCombat(run, rng) {
  const c = run.combat;
  const type = c.type;
  const fx = runFx(run);
  run.stats.kills += 1;
  if (type === 'elite') run.stats.elites += 1;
  if (type === 'boss') run.stats.bosses += 1;
  if (fx.victoryHeal) run.hp = Math.min(run.maxHp, run.hp + fx.victoryHeal);
  const g = T.gold[type] || T.gold.battle;
  const goldGained = gainGold(run, ri(rng, g[0], g[1]));
  const count = Math.max(1, 3 + (fx.rewardPlus || 0));
  run.reward = {
    title: type === 'boss' ? '막 보스 격파' : type === 'elite' ? '강적 격파' : '전투 승리',
    goldGained,
    cards: rollCardChoices(run, rng, { elite: type !== 'battle', count, rarity: type === 'boss' ? 'rare' : null }),
    relic: type === 'elite' ? rollRelic(run, rng) : null,
    enemyKey: c.enemy.key,
  };
  run.lastCombat = { enemyKey: c.enemy.key, turns: c.turn };
  run.combat = null;
  run.phase = 'reward';
  return run;
}

// ===== 보상 =====
export function takeRewardCard(run0, cardId) {
  const run = clone(run0);
  if (cardId) addCardToDeck(run, cardId);
  run.reward.cards = [];
  run.reward.cardTaken = cardId || 'skip';
  return run;
}
export function takeRewardRelic(run0) {
  const run = clone(run0);
  if (run.reward?.relic) { addRelic(run, run.reward.relic); run.reward.relicTaken = run.reward.relic; run.reward.relic = null; }
  return run;
}
// 보상 화면 종료 → 다음 층 (보스면 보스 유물 선택)
export function finishReward(run0, rng = Math.random) {
  let run = clone(run0);
  if (run.reward?.relic) addRelic(run, run.reward.relic); // 받지 않고 넘어가도 유물은 자동 획득
  const wasBoss = run.nodeType === 'boss';
  run.reward = null;
  if (wasBoss) {
    const opts = [];
    for (let i = 0; i < 3; i++) {
      const id = rollRelic({ ...run, relics: [...run.relics, ...opts] }, rng, true);
      if (id) opts.push(id);
    }
    if (opts.length && run.act < 4) { run.phase = 'bossRelic'; run.bossRelics = opts; return run; }
    return advance(run, rng);
  }
  return advance(run, rng);
}
export function takeBossRelic(run0, id, rng = Math.random) {
  const run = clone(run0);
  if (id) addRelic(run, id);
  run.bossRelics = null;
  return advance(run, rng);
}

export function advance(run0, rng = Math.random) {
  const run = clone(run0);
  run.nodeType = null;
  run.floor += 1;
  if (run.floor >= T.floorsPerAct) {
    if (run.act >= 4) { run.phase = 'victory'; return run; }
    run.act += 1;
    run.floor = 0;
    run.map = genActMap(rng);
    run.hp = Math.min(run.maxHp, run.hp + Math.ceil((run.maxHp - run.hp) * T.actHeal));
  }
  run.phase = 'map';
  return run;
}

// ===== 야영 =====
export function restHeal(run0, rng = Math.random) {
  const run = clone(run0);
  if (runFx(run).noRestHeal) return run0;
  run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * T.restHealPct));
  return advance(run, rng);
}
export function upgradeCard(run0, uid) {
  const run = clone(run0);
  const inst = run.deck.find(c => c.uid === uid);
  if (inst && ARCANA_CARDS[inst.id]?.up && !inst.up) inst.up = true;
  return run;
}
export function removeCard(run0, uid) {
  const run = clone(run0);
  run.deck = run.deck.filter(c => c.uid !== uid);
  return run;
}
export const canUpgrade = (inst) => !!ARCANA_CARDS[inst.id]?.up && !inst.up;

// ===== 상점 =====
function price(run, base) {
  const d = runFx(run).shopDiscount || 0;
  return Math.round(base * (1 - d / 100));
}
export function buildShop(run, rng) {
  const P = T.shopPrice;
  const cards = rollCardChoices(run, rng, { count: 4 }).map(id => ({ id, price: price(run, P[ARCANA_CARDS[id].rarity] || P.common) + ri(rng, -5, 8), sold: false }));
  const neutralPool = Object.values(ARCANA_CARDS).filter(c => c.cls === 'neutral' && c.rarity !== 'starter');
  const n = pick(rng, neutralPool);
  cards.push({ id: n.id, price: price(run, P[n.rarity]), sold: false });
  const relics = [];
  for (let i = 0; i < 2; i++) {
    const id = rollRelic({ ...run, relics: [...run.relics, ...relics.map(r => r.id)] }, rng);
    if (id) relics.push({ id, price: price(run, P.relic) + ri(rng, -10, 15), sold: false });
  }
  return { cards, relics, removed: false };
}
export function shopBuyCard(run0, idx) {
  const run = clone(run0);
  const item = run.shop.cards[idx];
  if (!item || item.sold || run.gold < item.price) return run0;
  run.gold -= item.price;
  item.sold = true;
  addCardToDeck(run, item.id);
  return run;
}
export function shopBuyRelic(run0, idx) {
  const run = clone(run0);
  const item = run.shop.relics[idx];
  if (!item || item.sold || run.gold < item.price) return run0;
  run.gold -= item.price;
  item.sold = true;
  addRelic(run, item.id);
  return run;
}
export function shopRemovePrice(run) { return price(run, run.removeCost); }
export function shopRemove(run0, uid) {
  const cost = shopRemovePrice(run0);
  if (run0.shop?.removed || run0.gold < cost) return run0;
  const run = removeCard(run0, uid);
  run.gold -= cost;
  run.shop.removed = true;
  run.removeCost += T.shopPrice.removeStep;
  return run;
}
export function leaveShop(run0, rng = Math.random) {
  const run = clone(run0);
  run.shop = null;
  return advance(run, rng);
}

// ===== 사건 =====
export function eventDef(id) { return ARCANA_EVENTS.find(e => e.id === id); }
export function chooseEvent(run0, idx, rng = Math.random) {
  const ev = eventDef(run0.event);
  const ch = ev?.choices[idx];
  if (!ch || (ch.needGold && run0.gold < ch.needGold)) return run0;
  let run = clone(run0);
  run.event = null;
  let pickMode = null;
  let cardRarity = null;
  let relic = null;
  for (const op of ch.ops) {
    if (op.hp != null) run.hp = Math.max(1, Math.min(run.maxHp, run.hp + op.hp));
    if (op.maxHp != null) { run.maxHp += op.maxHp; run.hp += op.maxHp; }
    if (op.gold != null) run.gold = Math.max(0, run.gold + op.gold);
    if (op.relic) relic = rollRelic(run, rng);
    if (op.card) cardRarity = op.card;
    if (op.upgrade) pickMode = 'upgrade';
    if (op.remove) pickMode = 'remove';
  }
  if (cardRarity || relic) {
    run.phase = 'reward';
    run.reward = { title: ev.title, goldGained: 0, cards: cardRarity ? rollCardChoices(run, rng, { rarity: cardRarity }) : [], relic };
    return run;
  }
  if (pickMode) {
    const eligible = run.deck.filter(c => (pickMode === 'upgrade' ? canUpgrade(c) : true));
    if (eligible.length) { run.phase = 'pick'; run.pick = { mode: pickMode, title: ev.title }; return run; }
  }
  return advance(run, rng);
}
export function resolvePick(run0, uid, rng = Math.random) {
  const mode = run0.pick?.mode;
  let run = run0;
  if (uid != null) run = mode === 'upgrade' ? upgradeCard(run0, uid) : removeCard(run0, uid);
  run = clone(run);
  run.pick = null;
  return advance(run, rng);
}

// ===== 진행도 표시 =====
export const NODE_META = {
  battle: { label: '전투', icon: '⚔', color: '#c4453d', desc: '일반 적. 카드 보상.' },
  elite: { label: '강적', icon: '☠', color: '#e8b04a', desc: '강한 적. 카드 보상 + 유물.' },
  rest: { label: '야영', icon: '🔥', color: '#7a9a5e', desc: '체력 회복 또는 카드 강화.' },
  shop: { label: '상점', icon: '⚖', color: '#d4a574', desc: '카드·유물 구매, 카드 제거.' },
  treasure: { label: '보물', icon: '◆', color: '#e8b04a', desc: '유물과 골드.' },
  event: { label: '사건', icon: '?', color: '#b48ce0', desc: '선택에 따라 보상과 대가.' },
  boss: { label: '막 보스', icon: '♛', color: '#c4453d', desc: '이 막의 지배자. 처치하면 다음 막으로.' },
};
