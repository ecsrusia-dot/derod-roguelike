// 사용: [TICKS=전투 수] node scripts/sim-chronicle-rival-forge.mjs
// 경쟁자 100명의 부위별 강화 분포 (대장간과 같은 확률로 굴린 결과)
import * as AR from '../src/chronicle/arena.js';
import { RIVALS, rivalState } from '../src/chronicle/rival.js';
for (const ticks of (process.env.TICKS ? [+process.env.TICKS] : [3000, 12000, 30000, 60000, 120000])) {
  const dist = Array(11).fill(0); let breaks = 0, n = 0, sum = 0; const top = [];
  for (const r of RIVALS) { const st = rivalState(r, ticks);
    const ps = ['weapon', 'offhand', 'armor', 'accessory'].map(sl => { const e = AR.rivalEnhance(r, sl, st); breaks += e.breaks; dist[e.plus]++; n++; sum += e.plus; return e.plus; });
    top.push([st.rebirth * 1000 + st.lv, r.name, ps.join('/')]); }
  top.sort((a, b) => b[0] - a[0]);
  console.log(`\n== 내 전투 ${ticks} — 평균 +${(sum / n).toFixed(1)} · 파괴 ${breaks}회`);
  console.log('  ' + dist.map((c, i) => `+${i}:${Math.round(c / n * 100)}%`).join(' '));
  console.log('  상위 5명: ' + top.slice(0, 5).map(x => `${x[1]} ${x[2]}`).join(' · '));
}
