// 가상 경쟁자 순위 점검 — node scripts/sim-chronicle-rival.mjs  (SAVE=<백업 JSON>이면 내 순위도 표시)
// 전투 수가 늘 때 경쟁자 분포가 어떻게 움직이는지 본다. 밸런스는 src/chronicle/rival.js RIVAL_TUNING.
import fs from 'fs';
import * as R from '../src/chronicle/rival.js';
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
console.log('전투 수 | 점수 최저/중앙/상위10%/최고 | 전승 분포(0~5회)');
for (const t of [500, 2000, 5000, 12000, 25000, 50000, 100000]) {
  const st = R.RIVALS.map(r => R.rivalState(r, t)).sort((a, b) => a.score - b.score);
  const rb = [0, 1, 2, 3, 4, 5].map(n => st.filter(s => s.rebirth === n).length).join('/');
  console.log(String(t).padStart(7), '|', [st[0].score, q(st, 0.5).score, q(st, 0.9).score, st[st.length - 1].score].join(' / ').padEnd(24), '|', rb);
}
const names = new Set(R.RIVALS.map(r => r.name));
const by = {}; for (const r of R.RIVALS) by[r.branch] = (by[r.branch] || 0) + 1;
console.log('이름 중복 없음:', names.size === R.RIVALS.length, '· 갈래 분포:', Object.values(by).join(','));
if (process.env.SAVE) {
  const raw = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8')); const acc = raw.acc || raw;
  const rows = R.rivalBoard(acc);
  console.log('\n내 계정 전투 수', R.rivalTicks(acc), '· 전체', rows.length, '명');
  for (const x of rows.filter(r => r.me)) console.log(`  ${x.rank}위 ${x.name} Lv.${x.lv} 전승${x.rebirth} 첨탑${x.tower} 점수 ${x.score}`);
  console.log('상위 5:', rows.slice(0, 5).map(x => `${x.name}(${x.score})`).join(' · '));
  const b = R.myBestRank(acc); console.log('최고 순위', b.rank, '· 위와 차이', b.gap, '· 보상', R.rivalRewardFor(b.rank).label);
}
