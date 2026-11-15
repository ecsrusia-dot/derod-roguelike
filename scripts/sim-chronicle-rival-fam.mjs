// 경쟁자 사역마 분포 — 실제 소환·강화·진화 결과 (1.299.0)
//   [TICKS=12000] node scripts/sim-chronicle-rival-fam.mjs
import { RIVALS, rivalState } from '../src/chronicle/rival.js';
import * as AR from '../src/chronicle/arena.js';
import * as F from '../src/chronicle/familiar.js';
const list = (process.env.TICKS || '3000,12000,40000,120000').split(',').map(Number);
for (const ticks of list) {
  const t0 = Date.now();
  const main = {}, sub = {}, tr = [0, 0, 0, 0, 0, 0]; let sumPlus = 0, n = 0, summons = 0, evoTry = 0, evoOk = 0, none = 0, owned = 0, subN = 0;
  for (const r of RIVALS) {
    const st = rivalState(r, ticks);
    const fm = AR.rivalFams(r, st);
    if (!fm.team.main) { none++; continue; }
    const f = fm.fams[fm.team.main];
    main[f.grade] = (main[f.grade] || 0) + 1; tr[F.famTrans(f)]++; sumPlus += f.plus || 0; n++;
    for (const k of [fm.team.sub1, fm.team.sub2]) if (k) { sub[fm.fams[k].grade] = (sub[fm.fams[k].grade] || 0) + 1; subN++; }
    summons += fm.log.summons; evoTry += fm.log.evoTry; evoOk += fm.log.evoOk; owned += Object.keys(fm.fams).length;
  }
  const fmt = (o) => F.FAM_GRADES.map(g => `${g.label} ${o[g.id] || 0}`).join(' · ');
  console.log(`\n[내 전투 ${ticks}] 사역마 없음 ${none}명 · 평균 소환 ${Math.round(summons / 100)}회 · 평균 보유 ${Math.round(owned / Math.max(1, n))}종 · ${Date.now() - t0}ms`);
  console.log(`  동행: ${fmt(main)} · 평균 +${(sumPlus / Math.max(1, n)).toFixed(1)}`);
  console.log(`  보조(${subN}칸): ${fmt(sub)}`);
  console.log(`  동행 초월: ${tr.map((n, i) => `◈${i} ${n}`).join(' · ')}`);
  console.log(`  진화 시도 ${evoTry} · 성공 ${evoOk}`);
}
