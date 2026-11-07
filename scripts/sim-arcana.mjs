// 트와일라잇 아르카나 밸런스 시뮬 — node scripts/sim-arcana.mjs [N]
// 단순 탐욕 봇: 파워 → (받을 피해가 방어보다 크면 방어) → 피해 큰 카드 순
import * as E from '../src/arcana/engine.js';
import { ARCANA_CLASSES, ARCANA_CARDS, cardDef } from '../src/arcana/data.js';

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 300;

function cardScore(run, card) {
  const c = run.combat;
  const incoming = E.intentDamage(run);
  const need = Math.max(0, incoming - c.p.block);
  let s = 0;
  for (const op of card.fx) {
    if (op.dmg != null) s += (op.dmg + c.p.str) * (op.hits || 1) + (run.maxHp - run.hp) * (op.missingPct || 0);
    if (op.dmgBlock) s += c.p.block * op.dmgBlock;
    if (op.dmgPoison) s += c.enemy.poison * op.dmgPoison;
    if (op.block != null) s += Math.min(op.block + c.p.dex, need) * 1.3 + 1;
    if (op.poison) s += op.poison * 1.6;
    if (op.vuln || op.weak) s += 4;
    if (op.draw) s += op.draw * 3;
    if (op.energy) s += op.energy * 5;
    if (op.str) s += op.str * 5;
    if (op.dex) s += op.dex * 4;
    if (op.heal) s += Math.min(op.heal, run.maxHp - run.hp);
    if (op.selfDmg) s -= run.hp < 20 ? 99 : op.selfDmg * 0.5;
    if (op.counter) s += incoming > 0 ? op.counter : 0;
    if (op.doublePoison) s += c.enemy.poison;
  }
  if (card.type === 'power') s += 25;
  return s / Math.max(0.5, card.cost);
}

function botCombat(run, rng) {
  let guard = 0;
  while (run.phase === 'combat' && guard++ < 400) {
    const playable = run.combat.hand.filter(u => E.canPlay(run, u)).map(u => E.deckCard(run, u));
    playable.sort((a, b) => cardScore(run, b) - cardScore(run, a));
    if (playable.length && cardScore(run, playable[0]) > 0) run = E.playCard(run, playable[0].uid, rng);
    else run = E.endTurn(run, rng);
  }
  return run;
}

function simRun(classId, seed) {
  const rng = mulberry(seed);
  let run = E.newArcanaRun(classId, rng);
  let guard = 0;
  while (!['victory', 'defeat'].includes(run.phase) && guard++ < 2000) {
    switch (run.phase) {
      case 'map': {
        const opts = run.map[run.floor];
        const pref = run.hp / run.maxHp < 0.45 ? ['rest', 'shop', 'treasure', 'event', 'battle', 'elite'] : ['elite', 'treasure', 'battle', 'shop', 'event', 'rest'];
        const idx = Math.max(0, opts.indexOf(pref.find(p => opts.includes(p))));
        run = E.chooseNode(run, idx, rng); break;
      }
      case 'combat': run = botCombat(run, rng); break;
      case 'reward': {
        if (run.reward.relic) run = E.takeRewardRelic(run);
        const cs = run.reward.cards.filter(id => id !== process.env.BAN && process.env.BAN !== 'all');
        if (cs.length && run.deck.length < 22) {
          const best = cs.slice().sort((a, b) => ({ rare: 3, uncommon: 2, common: 1 }[ARCANA_CARDS[b].rarity] - { rare: 3, uncommon: 2, common: 1 }[ARCANA_CARDS[a].rarity]))[0];
          run = E.takeRewardCard(run, best);
        }
        run = E.finishReward(run, rng); break;
      }
      case 'bossRelic': run = E.takeBossRelic(run, run.bossRelics[0], rng); break;
      case 'rest': {
        const up = run.deck.find(c => E.canUpgrade(c) && c.id !== 'strike' && c.id !== 'defend') || run.deck.find(E.canUpgrade);
        if (run.hp / run.maxHp < 0.6 || !up || E.runFx(run).noRestHeal === undefined && false) run = E.restHeal(run, rng);
        if (run.phase === 'rest') { run = E.upgradeCard(run, up?.uid); run = E.advance(run, rng); }
        break;
      }
      case 'shop': {
        const strike = run.deck.find(c => c.id === 'strike');
        if (strike && run.gold >= E.shopRemovePrice(run)) run = E.shopRemove(run, strike.uid);
        run.shop.relics.forEach((r, i) => { if (run.gold >= r.price) run = E.shopBuyRelic(run, i); });
        run = E.leaveShop(run, rng); break;
      }
      case 'event': run = E.chooseEvent(run, 1, rng); break;
      case 'pick': {
        const t = run.deck.find(c => run.pick.mode === 'upgrade' ? E.canUpgrade(c) : c.id === 'strike');
        run = E.resolvePick(run, t?.uid, rng); break;
      }
      default: throw new Error('phase ' + run.phase);
    }
  }
  return run;
}

if (process.env.TRACE) { for (let i=0;i<3;i++){ const r = simRun(process.env.TRACE, i*7919+13); console.log(r.phase, r.act, r.floor, r.hp, r.maxHp, r.relics.join(","), r.deck.map(c=>c.id+(c.up?"+":"")).join(" ")); } process.exit(0); }
for (const cls of ARCANA_CLASSES.filter(c => !process.env.CLS || c.id === process.env.CLS)) {
  const acts = [0, 0, 0, 0, 0];
  let wins = 0; const deathFloors = {};
  for (let i = 0; i < N; i++) {
    const r = simRun(cls.id, i * 7919 + 13);
    if (r.phase === 'victory') wins++;
    else { const k = `${r.act}-${r.floor}`; deathFloors[k] = (deathFloors[k] || 0) + 1; }
    acts[r.phase === 'victory' ? 4 : r.act - 1]++;
  }
  const reach = (a) => (acts.slice(a).reduce((s, x) => s + x, 0) / N * 100).toFixed(0) + '%';
  console.log(`${cls.name.padEnd(8)} 2막 도달 ${reach(1)} · 3막 ${reach(2)} · 4막 ${reach(3)} · 클리어 ${(wins / N * 100).toFixed(1)}%`);
}
