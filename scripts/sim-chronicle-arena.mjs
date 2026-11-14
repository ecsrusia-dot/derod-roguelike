// 사용: SAVE=<백업 JSON> [CID=직업] node scripts/sim-chronicle-arena.mjs [판 수=30]
// 투기장 점검 — 내 캐릭터별 점수·순위 · 상대 3명 예상 승률 · 순위표 구간별(위 10 · 주변 · 아래 10) 승률
import fs from 'fs';
import * as AR from '../src/chronicle/arena.js';
import * as E from '../src/chronicle/engine.js';
import * as A from '../src/chronicle/account.js';
import { RIVALS } from '../src/chronicle/rival.js';
import { chronicleClass, unitTitle } from '../src/chronicle/data.js';
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = +process.argv[2] || 30;
const acc0 = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8')).acc;
const board = AR.arenaBoard(acc0);
for (const cid of Object.keys(acc0.chars)) {
  if (process.env.CID && process.env.CID !== cid) continue;
  const acc = { ...acc0, active: cid };
  const me = board.find(x => x.id === `me_${cid}`);
  const u = acc.chars[cid].unit;
  console.log(`\n== ${unitTitle(u, cid)} Lv.${u.lv} 전승 ${u.rebirth?.count || 0} — 투기장 ${me.rating}점 · ${me.rank}위/${board.length}`);
  for (const o of AR.arenaOpponents(acc, cid)) {
    const st = AR.arenaStake(acc, o, cid);
    console.log(`  상대 ${o.name.padEnd(8)} ${chronicleClass(o.cls).name} Lv.${o.lv} 전승${o.rebirth} ${o.rating}점 · 예상 승률 ${Math.round(AR.arenaOdds(acc, o, cid) * 100)}% · 승 +${st.win} / 패 ${st.lose}`);
  }
  const view = A.toView(acc); const party = E.duelSide(view, false);
  const rivals = board.filter(x => !x.me);
  let idx = rivals.findIndex(x => x.rating <= me.rating); if (idx < 0) idx = rivals.length;
  const bands = { '위 20~11': rivals.slice(Math.max(0, idx - 20), Math.max(0, idx - 10)), '위 10': rivals.slice(Math.max(0, idx - 10), idx), '아래 10': rivals.slice(idx, idx + 10), '아래 11~20': rivals.slice(idx + 10, idx + 20) };
  for (const [name, list] of Object.entries(bands)) {
    if (!list.length) continue; let w = 0, n = 0, rd = 0, to = 0;
    for (const o of list) { const r = RIVALS.find(x => x.id === o.id); const en = AR.rivalSide(r, o); const rng = mulberry(77 + n);
      for (let i = 0; i < Math.max(2, Math.round(N / 10)); i++) { const sim = E.simulateChronicleBattle(party, en, rng); n++; rd += sim.rounds; if (sim.result === 'draw') to++; if (sim.result === 'win') w++; } }
    console.log(`  ${name.padEnd(10)} (${list[list.length - 1].rating}~${list[0].rating}점) 승률 ${Math.round(w / n * 100)}% · ${(rd / n).toFixed(1)}R · 시간 초과 ${Math.round(to / n * 100)}%`);
  }
}
