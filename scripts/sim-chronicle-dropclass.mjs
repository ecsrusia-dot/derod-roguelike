// 드랍 직업 분배 확인 — node scripts/sim-chronicle-dropclass.mjs [N]
import * as E from '../src/chronicle/engine.js';
const N = +process.argv[2] || 20000;
let s = 7; const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
for (const [label, fn] of [['일반 장비', () => E.rollGear(rng, 'rare', 50, 'sage')], ['유니크', () => E.rollUniqueItem(rng, 50, 'sage')]]) {
  const c = {};
  for (let i = 0; i < N; i++) { const it = fn(); const k = !it ? 'none' : it.cls === 'sage' ? '내 직업' : it.cls === 'common' ? '공용' : '다른 직업'; c[k] = (c[k] || 0) + 1; }
  console.log(label, Object.entries(c).map(([k, v]) => `${k} ${(v / N * 100).toFixed(1)}%`).join(' · '));
}
